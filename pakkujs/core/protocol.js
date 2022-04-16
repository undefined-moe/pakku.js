// 2017-2020 @xmcp. THIS PROJECT IS LICENSED UNDER GPL VERSION 3. SEE `LICENSE.txt`.

var proto_seg=protobuf.roots.default.bilibili.community.service.dm.v1.DmSegMobileReply;
var proto_view=protobuf.roots.default.bilibili.community.service.dm.v1.DmWebViewReply;

function xml_to_ir(xmlstr) {
    var dom=parse_xml_magic(xmlstr);
    var res=[];
    var conf={};
    [].slice.call(dom.childNodes[0].children).forEach(function(elem) {
        if(elem.tagName==='d') { // danmu
            var attr=elem.attributes['p'].value.split(',');
            var str=elem.childNodes[0] ? elem.childNodes[0].data : '';
            res.push({
                "time_ms": Math.floor(parseFloat(attr[0])*1000),
                "mode": parseInt(attr[1]),
                "fontsize": parseFloat(attr[2]),
                "color": parseInt(attr[3]),
                "sender_hash": attr[6],
                "content": str,
                "sendtime": parseInt(attr[4]),
                "weight": 10, // not present in xml so fake max weight
                "id": attr[7],
                "pool": parseInt(attr[5]),
                "extra": {},
            });
        } else { // conf
            conf[elem.tagName]=elem.childNodes[0].data;
        }
    });
    return {
        danmakus: res,
        cid: conf.chatid,
        maxlimit: conf.maxlimit,
    };
}

function protobuf_to_ir(chunks,cid) {
    var res=[];
    chunks.forEach(function(chunk) {
        var segidx = chunk[0];
        chunk[1].forEach(function(item) {
            res.push({
                "time_ms": item.progress,
                "mode": item.mode,
                "fontsize": item.fontsize,
                "color": item.color,
                "sender_hash": item.midHash,
                "content": item.content,
                "sendtime": item.ctime,
                "weight": item.weight,
                "id": item.dmid,
                "pool": item.pool,
                "extra": {
                    "proto_segidx": segidx,
                    "proto_attr": item.attr,
                    "proto_action": item.action,
                    "proto_animation": item.animation,
                },
            });
        });
    });
    return {
        danmakus: res,
        cid: cid,
        maxlimit: res.length+1, // fake something here as we don't know
    };
}

function ir_to_xml(ir) {
    var parser=new DOMParser();
    var dom_str='<i><chatserver>chat.bilibili.com</chatserver><chatid>{{CID}}</chatid><mission>0</mission><maxlimit>{{MAXLIMIT}}</maxlimit><state>0</state><real_name>0</real_name></i>';
    dom_str=dom_str.replace('{{CID}}',ir.cid).replace('{{MAXLIMIT}}',ir.maxlimit);
    var dom=parser.parseFromString(dom_str,'text/xml');
    var i_elem=dom.childNodes[0];

    ir.danmakus.forEach(function(d) {
        var elem=dom.createElement('d');
        var tn=dom.createTextNode(d.content);
        var attr=[
            d.time_ms/1000, // 0
            d.mode, // 1
            d.fontsize, // 2
            d.color, // 3
            d.sendtime, // 4
            d.pool, // 5
            d.sender_hash, // 6
            d.id, // 7
        ];
        elem.appendChild(tn);
        elem.setAttribute('p',attr.join(','));
        i_elem.appendChild(elem);
    });
    console.log('ir to xml: len', ir.danmakus.length);
    
    var serializer=new XMLSerializer();
    return serializer.serializeToString(dom);
}

function ir_to_protobuf(ir, segidx_filtering) {
    var res=[];
    ir.danmakus.forEach(function(item) {
        if(segidx_filtering===undefined || item.extra.proto_segidx===segidx_filtering)
            res.push({
                "progress": item.time_ms,
                "mode": item.mode,
                "fontsize": item.fontsize,
                "color": item.color,
                "midHash": item.sender_hash,
                "content": item.content,
                "ctime": item.sendtime,
                "weight": item.weight,
                "dmid": item.id,
                "attr": item.extra.proto_attr,
                "action": item.extra.proto_action,
                "animation": item.extra.proto_animation,
            });
    });
    console.log('ir to protobuf: segidx_filtering', segidx_filtering, ir, 'with len', res.length);
    var res_uint8arr=proto_seg.encode(proto_seg.create({elems: res})).finish();
    return res_uint8arr;
}

// used for #segment>1 requests
function empty_danmaku_proto_seg() {
    return ir_to_protobuf({
        danmakus: [],
        cid: -1,
        maxlimit: 0,
    });
}

function protoapi_get_view(cid,pid) { // return page count
    return new Promise(function(resolve,reject) {
        var xhr=new XMLHttpRequest();
        xhr.open('get',add_pakku_fingerprint('https://api.bilibili.com/x/v2/dm/web/view?type=1&oid='+encodeURIComponent(cid)+'&pid='+encodeURIComponent(pid)),true);
        xhr.responseType='arraybuffer';
        xhr.addEventListener('load',function() {
            let d=proto_view.decode(new Uint8Array(xhr.response));
            if(d.dmSge.total && d.dmSge.total<100)
                resolve(d.dmSge.total);
            else
                resolve(null);
        });
        xhr.addEventListener('error',reject);
        xhr.send();
    });
}

function protobuf_get_url(url) {
    return new Promise(function(resolve,reject) {
        var xhr=new XMLHttpRequest();
        xhr.open('get',add_pakku_fingerprint(url),true);
        xhr.responseType='arraybuffer';
        xhr.addEventListener('load',function() {
            let d=proto_seg.decode(new Uint8Array(xhr.response));
            resolve(d.elems);
        });
        xhr.addEventListener('error',reject);
        xhr.send();
    });
}

function protoapi_get_seg(cid,pid,segidx) { // return dm list
    return new Promise(function(resolve,reject) {
        protobuf_get_url(
            'https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid='+encodeURIComponent(cid)+'&pid='+encodeURIComponent(pid)+'&segment_index='+encodeURIComponent(segidx)
        )
            .then(function(ret) {
                resolve([segidx, ret]);
            })
            .catch(reject);
    });
}

function protoapi_get_segs(cid,pid,pages,first_chunk_req) { // -> [[1, [...]], [2, [...]], ...]
    if(pages) {
        console.log('protobuf api: total',pages,'pages');
        var req=[first_chunk_req];
        for(var i=2;i<=pages;i++)
            req.push(protoapi_get_seg(cid,pid,i));
        return Promise.all(req);
    } else { // guess page numbers
        console.log('protobuf api: guessing page');
        return new Promise(function(resolve,reject) {
            var req=[first_chunk_req, protoapi_get_seg(cid,pid,2), protoapi_get_seg(cid,pid,3)];
            var res=[];
            function work(idx) {
                req.shift()
                    .then(function(chunk) {
                        if(chunk[1].length) {
                            res.push(chunk);
                            req.push(protoapi_get_seg(cid,pid,idx+3));
                            work(idx+1);
                        } else {
                            req.shift()
                                .then(function(chunk) {
                                    if(chunk[1].length) {
                                        res.push(chunk);
                                        req.push(protoapi_get_seg(cid,pid,idx+3));
                                        req.push(protoapi_get_seg(cid,pid,idx+4));
                                        work(idx+2);
                                    } else { // completed
                                        console.log('protobuf api: ASSUMING total',idx-1,'pages');
                                        resolve(res);
                                    }
                                })
                                .catch(reject);
                        }
                    })
                    .catch(reject);
            }
            work(1);
        });
    }
}

var _PTOTO_REQ_CACHE = {}; // tabid -> {cid_pid -> ir}

function protoapi_get_all_ir_cached(cid,pid,tabid) {
    return new Promise(function(resolve,reject) {
        if(_PTOTO_REQ_CACHE[tabid] && _PTOTO_REQ_CACHE[tabid][cid+'_'+pid]) {
            console.log('protobuf api: cached request', cid, pid, 'in tab', tabid);
            resolve(_PTOTO_REQ_CACHE[tabid][cid+'_'+pid]);
            return;
        }

        // preload first chunk to save time for short videos
        var first_chunk_req=protoapi_get_seg(cid,pid,1);

        protoapi_get_view(cid,pid)
            .then(function(pages) {
                return protoapi_get_segs(cid,pid,pages,first_chunk_req);
            })
            .then(function(dms) {
                var ret = protobuf_to_ir(dms,cid);     

                if(!_PTOTO_REQ_CACHE[tabid])
                    _PTOTO_REQ_CACHE[tabid]={};
                _PTOTO_REQ_CACHE[tabid][cid+'_'+pid]=ret;
                resolve(ret);
            })
            .catch(reject);
    });
}

chrome.tabs.onRemoved.addListener(function(tabId) {
    if(_PTOTO_REQ_CACHE[tabId])
        delete _PTOTO_REQ_CACHE[tabId];
});