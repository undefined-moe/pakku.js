import { do_combine, prepare_combine } from "./pakkujs/core/combine_worker";
import fs from 'fs';
import { Egress, Ingress, perform_egress, perform_ingress } from "./pakkujs/protocol/interface";
import {
    AjaxResponse, DanmuChunk, DanmuCluster, DanmuClusterOutput,
    DanmuObject, DanmuObjectRepresentative, int, LocalizedConfig,
    MessageStats, MissingData, Stats
} from "./pakkujs/core/types";
import { post_combine } from "./pakkujs/core/post_combine";
import {
    protoapi_get_prefetch,
    ProtobufIngressSeg,
    ProtobufPrefetchObj
} from "./pakkujs/protocol/interface_protobuf";

function toArrayBuffer(buffer: Buffer) {
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return arrayBuffer;
}

const BADGE_ERR_NET = 'NET!';
export const BADGE_ERR_JS = 'JS!';

function _filter_aslongas<T>(x: Array<T>, fn: (x: T) => boolean): Array<T> {
    let i = 0;
    while (i < x.length && fn(x[i]))
        i++;
    return x.slice(0, i);
}

let _throttle_timer: null | ReturnType<typeof setTimeout> = null;
let _throttle_fn: null | (() => void) = null;
function perform_throttle(fn: () => void) {
    if (_throttle_timer)
        _throttle_fn = fn;
    else {
        fn();
        _throttle_timer = setTimeout(() => {
            _throttle_timer = null;
            if (_throttle_fn) {
                _throttle_fn();
                _throttle_fn = null;
            }
        }, 100);
    }
}

class Scheduler {
    ingress: Ingress;
    egresses: Array<[Egress, (resp: AjaxResponse) => void]>;
    config: LocalizedConfig;

    stats: Stats | MessageStats;
    ongoing_stats: Stats;
    start_ts: number;

    chunks_in: Map<int, DanmuChunk<DanmuObject>>;
    clusters: Map<int, DanmuCluster[]>;
    chunks_out: Map<int, DanmuChunk<DanmuObjectRepresentative>>;
    chunks_deleted: Map<int, DanmuChunk<DanmuObject>>;

    num_chunks: int;
    combine_started: Set<int>;
    failed: boolean;

    prefetch_data: ProtobufPrefetchObj | null;

    constructor(ingress: Ingress, config: LocalizedConfig) {
        this.ingress = ingress;
        this.egresses = [];
        this.config = config;
        this.stats = new MessageStats('message', '', '');
        this.ongoing_stats = new Stats();
        this.start_ts = 0;
        this.chunks_in = new Map();
        this.clusters = new Map();
        this.chunks_out = new Map();
        this.chunks_deleted = new Map();
        this.num_chunks = 0;
        this.combine_started = new Set();
        this.failed = false;
        this.prefetch_data = null;
    }

    write_failing_stats(prompt: string, e: Error, badge: string) {
        console.error('pakku scheduler: GOT EXCEPTION', e, prompt);
        this.failed = true;
        this.try_serve_egress();
    }

    write_cur_message_stats() {
        const throttled = () => {
        };
        perform_throttle(throttled);
    }

    add_egress(egress: Egress, callback: (resp: AjaxResponse) => void) {
        console.log('pakku scheduler: route ingress =', this.ingress, 'egress =', egress);
        this.egresses.push([egress, callback]);
        this.try_serve_egress();
    }

    async try_start_combine(segidx: int) {
        if (this.failed)
            return;
        if (this.combine_started.has(segidx))
            return; // working or finished

        let chunk = this.chunks_in.get(segidx);
        let next_chunk = segidx === this.num_chunks ? { objs: [], extra: {} } : this.chunks_in.get(segidx + 1);
        if (!chunk || !next_chunk)
            return; // not ready

        this.combine_started.add(segidx);

        let max_next_time = chunk.objs.length ? chunk.objs[chunk.objs.length - 1].time_ms + 1000 * this.config.THRESHOLD : 0;
        let next_chunk_filtered = {
            objs: _filter_aslongas(next_chunk.objs, obj => obj.time_ms < max_next_time),
            extra: next_chunk.extra,
        };

        let res: DanmuClusterOutput;
        try {
            if (chunk.objs.length) {
                res = await do_combine(chunk, next_chunk_filtered, this.config);
                console.log('pakku scheduler: got combine result', segidx, res.clusters.length);
            } else {
                res = {
                    clusters: [],
                    stats: new Stats(),
                };
                console.log('pakku scheduler: got combine result', segidx, '(skipped)');
            }
        } catch (e) {
            this.write_failing_stats(`合并分片 ${segidx} 时出错`, e as Error, BADGE_ERR_JS);
            return;
        }

        this.clusters.set(segidx, res.clusters.map(c => ({
            peers: c.peers_ptr.map(([idx, reason]) => ({
                ...chunk.objs[idx],
                pakku: {
                    sim_reason: reason,
                },
            })),
            desc: c.desc,
            chosen_str: c.chosen_str,
        })));
        this.ongoing_stats.update_from(res.stats);

        this.try_start_postproc(segidx);
        this.try_start_postproc(segidx + 1);
    }

    async try_start_postproc(segidx: int) {
        if (this.failed)
            return;
        if (this.chunks_out.has(segidx))
            return; // finished

        let chunk = this.chunks_in.get(segidx);
        let clusters = this.clusters.get(segidx);
        let prev_clusters = this.clusters.get(segidx - 1);
        if (!clusters || !prev_clusters)
            return; // not ready

        let chunk_out;
        try {
            chunk_out = post_combine(clusters, prev_clusters, chunk!, this.config, this.ongoing_stats);
        } catch (e) {
            this.write_failing_stats(`后处理分片 ${segidx} 时出错`, e as Error, BADGE_ERR_JS);
            return;
        }

        this.chunks_out.set(segidx, chunk_out);

        console.log('pakku scheduler: got chunks out', segidx, chunk_out.objs.length);
        this.write_cur_message_stats();

        this.try_serve_egress();
    }

    try_serve_egress() {
        if (this.failed) {
            for (let [_egress, callback] of this.egresses) {
                callback(null);
            }
            this.egresses = [];
            return;
        }

        if (this.num_chunks && this.num_chunks === this.chunks_out.size)
            this.do_cleanup();

        this.egresses = this.egresses.filter(([egress, callback]) => {
            let res = perform_egress(egress, this.num_chunks, this.config.GLOBAL_SWITCH ? this.chunks_out : this.chunks_in);

            if (res === MissingData)
                return true; // keep in queue
            else {
                console.log('pakku scheduler: served egress', egress);
                callback({ data: res });
                return false; // remove from queue
            }
        });
    }

    finish() {
        console.log('pakku scheduler: all finished');

        this.ongoing_stats.parse_time_ms = +new Date() - this.start_ts - this.ongoing_stats.download_time_ms;
        this.stats = this.ongoing_stats;
    }

    calc_chunk_deleted() {
        let out_danmu_ids = new Set();
        for (let chunk of this.chunks_out.values()) {
            for (let dr of chunk.objs) {
                out_danmu_ids.add(dr.id);
                for (let dp of dr.pakku.peers)
                    out_danmu_ids.add(dp.id);
            }
        }

        this.chunks_deleted.clear();

        for (let [idx, chunk_in] of this.chunks_in) {
            let chunk_del = {
                objs: [] as DanmuObject[],
                extra: chunk_in.extra,
            };

            for (let d of chunk_in.objs) {
                if (!out_danmu_ids.has(d.id))
                    chunk_del.objs.push(d);
            }

            this.chunks_deleted.set(idx, chunk_del);
        }
    }

    do_cleanup() {
        if (this.stats.type === 'message') this.finish();
    }

    async start() {
        this.write_cur_message_stats();

        this.start_ts = +new Date();
        try {
            await perform_ingress(this.ingress, async (idx, chunk) => {
                console.log('pakku scheduler: got ingress chunk', idx, chunk.objs.length);

                chunk.objs.sort((a, b) => a.time_ms - b.time_ms);
                this.chunks_in.set(idx, chunk);

                this.ongoing_stats.num_total_danmu += chunk.objs.length;
                this.write_cur_message_stats();

                void this.try_start_combine(idx - 1);
                void this.try_start_combine(idx);
            }, this.prefetch_data);
        } catch (e) {
            this.write_failing_stats('下载弹幕时出错', e as Error, BADGE_ERR_NET);
            return;
        }

        this.num_chunks = this.chunks_in.size;

        this.ongoing_stats.download_time_ms = +new Date() - this.start_ts;
        console.log('pakku scheduler: download finished, total chunks =', this.num_chunks);
        this.write_cur_message_stats();

        void this.try_start_combine(this.num_chunks);

        this.clusters.set(0, []); // pad a pseudo cluster before the first one for the `prev_clusters` arg
        void this.try_start_postproc(1);
    }
}
export let scheduler: null | Scheduler = null;

function ingress_equals(a: Ingress, b: Ingress): boolean {
    // @ts-ignore
    return Object.keys(a).filter(k => k !== 'is_magicreload').every(k => a[k] === b[k]);
}

export function handle_task(ingress: Ingress, egress: Egress, callback: (resp: AjaxResponse) => void, config: LocalizedConfig) {
    if (scheduler && ingress_equals(scheduler.ingress, ingress)) {
        scheduler.config = config;
        scheduler.add_egress(egress, callback);
    } else {
        scheduler = new Scheduler(ingress, config);
        scheduler.add_egress(egress, callback);
        void scheduler.start();
    }
}

export function handle_proto_view(ingress: ProtobufIngressSeg, view_url: string, config: LocalizedConfig): Promise<ArrayBuffer> {
    if (scheduler && ingress_equals(scheduler.ingress, ingress)) {
        scheduler.config = config;
        if (!scheduler.prefetch_data)
            scheduler.prefetch_data = protoapi_get_prefetch(ingress, view_url);
    } else {
        scheduler = new Scheduler(ingress, config);
        scheduler.prefetch_data = protoapi_get_prefetch(ingress, view_url);
        void scheduler.start();
    }
}

const BASE_CONFIG = {
    GLOBAL_SWITCH: true,
    SKIP_INJECT: true,
    _LAST_UPDATE_TIME: 0,
    _CONFIG_VER: 4,

    ADVANCED_USER: false,

    TOOLTIP: true,
    TOOLTIP_KEYBINDING: true,
    AUTO_DISABLE_DANMU: false,
    AUTO_DANMU_LIST: false,
    FLUCTLIGHT: false,

    // 其他
    POPUP_BADGE: 'percent' as ('percent' | 'count' | 'dispval' | 'off'),
    COMBINE_THREADS: 3,
    READ_PLAYER_BLACKLIST: true,

    // 实验室
    BREAK_UPDATE: false,
    TAKEOVER_AIJUDGE: false,
    SCROLL_THRESHOLD: 1200, // 0 to disable
    USERSCRIPT: null as (string | null),
};

export async function init() {
    return await prepare_combine(toArrayBuffer(fs.readFileSync('./pakkujs/assets/similarity-gen.wasm')));
}

export async function task(input: Ingress, config: Partial<LocalizedConfig>) {
    return new Promise<string>((resolve, reject) => {
        handle_task(input, { type: 'xml' }, (resp) => {
            if (!resp?.data) reject('no output');
            else resolve(resp.data as string);
        }, {
            ...BASE_CONFIG,
            BLACKLIST: [],

            // 弹幕合并
            THRESHOLD: 30,
            MAX_DIST: 5,
            MAX_COSINE: 45,
            TRIM_PINYIN: true,
            TRIM_ENDING: true,
            TRIM_SPACE: true,
            TRIM_WIDTH: true,

            // 例外设置
            FORCELIST: [["^23{2,}$", "23333"], ["^6{3,}$", "66666"]],
            WHITELIST: [] as ([string, string])[],
            CROSS_MODE: true,
            PROC_TYPE7: true,
            PROC_TYPE4: true,
            PROC_POOL1: false,

            // 显示设置
            DANMU_MARK: 'prefix' as ('prefix' | 'suffix' | 'off'),
            MARK_THRESHOLD: 1,
            DANMU_SUBSCRIPT: true,
            ENLARGE: true,
            SHRINK_THRESHOLD: 0,
            DROP_THRESHOLD: 0,
            MODE_ELEVATION: true,
            REPRESENTATIVE_PERCENT: 20,
            ...config,
        });
    });
}
