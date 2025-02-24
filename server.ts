import { createServer } from 'http';
import { Danmaku2ASS } from './xml2ass';
import Schema from 'schemastery';
import { init, task } from './entry';

const Options = Schema.object({
    // Damnaku2ASS
    font: Schema.string(),
    fontSize: Schema.number(),
    alpha: Schema.number(),
    durationMarquee: Schema.number(),
    durationStill: Schema.number(),

    // Pakku
    blacklist: Schema.array(Schema.string()).default([]),
    threshold: Schema.number().default(30).step(1).min(1),
    maxDist: Schema.number().default(5).step(1).min(1),
    maxCosine: Schema.number().default(45).step(1).min(1),
    trim: Schema.object({
        pinyin: Schema.boolean().default(true),
        ending: Schema.boolean().default(true),
        space: Schema.boolean().default(true),
        width: Schema.boolean().default(true),
    }),

    forcelist: Schema.array(Schema.tuple([String, String])).default([["^23{2,}$", "23333"], ["^6{3,}$", "66666"]]),
    whitelist: Schema.array(Schema.tuple([String, String])).default([]),
    crossMode: Schema.boolean().default(true),
    proc: Schema.object({
        type7: Schema.boolean().default(true),
        type4: Schema.boolean().default(true),
        pool1: Schema.boolean().default(false),
    }),

    danmuMark: Schema.union(['prefix', 'suffix', 'off']).default('off'),
    markThreshold: Schema.number().default(1).step(1).min(1),
    danmuSubscript: Schema.boolean().default(true),
    enlarge: Schema.boolean().default(true),
    shrinkThreshold: Schema.number().default(0).step(1).min(0),
    dropThreshold: Schema.number().default(0).step(1).min(0),
    modeElevation: Schema.boolean().default(true),
    representativePercent: Schema.number().default(20).step(1).min(20),
});

const server = createServer(async (req, res) => {
    try {
        console.log(req.url);
        if (req.url?.includes('subtitle?url=')) {
            const q = await fetch('https://subtitle.lm379.gq' + req.url);
            const text = await q.text();
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.writeHead(200);
            res.write(text);
            res.end();
            return;
        }
        const params = new URLSearchParams(req.url?.split('?')[1]);
        let cid = '';
        const options = Options(JSON.parse(Buffer.from(params.get('options') || '', 'base64').toString('utf-8') || '{}'));
        if (params.has('cid')) {
            cid = params.get('cid')!;
        } else {
            if (params.has('id')) {
                const r = await fetch(`https://api.bilibili.com/x/web-interface/view?aid=${params.get('id')}`);
                const data = await r.json();
                cid = data.data.cid;
            }
        }
        console.log(cid);
        if (!cid) throw new Error();
        const f = await fetch(`https://comment.bilibili.com/${cid}.xml`);
        const text = await f.text();
        const t = await task({ type: 'xml_content', content: text }, {
            BLACKLIST: [],

            // 弹幕合并
            THRESHOLD: options.threshold,
            MAX_DIST: options.maxDist,
            MAX_COSINE: options.maxCosine,
            TRIM_PINYIN: options.trim.pinyin,
            TRIM_ENDING: options.trim.ending,
            TRIM_SPACE: options.trim.space,
            TRIM_WIDTH: options.trim.width,

            // 例外设置
            FORCELIST: options.forcelist,
            WHITELIST: options.whitelist as [string, string][],
            CROSS_MODE: options.crossMode,
            PROC_TYPE7: options.proc.type7,
            PROC_TYPE4: options.proc.type4,
            PROC_POOL1: options.proc.pool1,

            // 显示设置
            DANMU_MARK: options.danmuMark,
            MARK_THRESHOLD: options.markThreshold,
            DANMU_SUBSCRIPT: options.danmuSubscript,
            ENLARGE: options.enlarge,
            SHRINK_THRESHOLD: options.shrinkThreshold,
            DROP_THRESHOLD: options.dropThreshold,
            MODE_ELEVATION: options.modeElevation,
            REPRESENTATIVE_PERCENT: options.representativePercent,
        });
        const parsed = Danmaku2ASS(
            t,
            'Bilibili', 1280, 720, 5,
            options.font || params.get('font') || 'sans-serif',
            options.fontSize || (+(params.get('font_size') || '')) || 25.0,
            options.alpha || (+(params.get('alpha') || '')) || 1.0,
            options.durationMarquee || (+(params.get('duration_marquee') || '')) || 5.0,
            options.durationStill || (+(params.get('duration_still') || '')) || 5.0,
            true,
        );
        const final = parsed.join('');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.writeHead(200);
        res.write(final);
        res.end();
    } catch (e) {
        console.log(e);
        res.writeHead(500);
        res.write('fail');
        res.end();
    }
});

init();

server.listen(3100);