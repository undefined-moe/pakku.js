// Based on https://github.com/m13253/danmaku2ass

const gDefaultSizeWidth = 320
const gDefaultSizeHeight = 240

function ProbeCommentFormat(f: string) {
    const tmp = f[0];
    if (tmp === '[') {
        const tmp2 = f.slice(1, 9);
        if (tmp2 === '{"ping":') {
            return 'NiconicoYtdlpJson';
        }
        if (tmp2 === '{"id": "') {
            return 'NiconicoYtdlpJson2';
        }
        return 'Acfun';
    }
    if (tmp === '{') {
        const tmp2 = f.slice(1, 15);
        if (tmp2 === '"status_code":') {
            return 'Tudou';
        }
        if (tmp2.trim().startsWith('"count":')) {
            return 'DanDanPlay';
        }
    }
    if (tmp === '<') {
        const tmp2 = f[1];
        if (tmp2 === '?') {
            const tmp3 = f.slice(2, 40);
            console.log(tmp3);
            if (tmp3 === 'xml version="1.0" encoding="UTF-8"?><p') {
                return 'Niconico';
            }
            if (tmp3 === 'xml version="1.0" encoding="UTF-8"?><i') {
                return 'Bilibili';
            }
            if (tmp3 === 'xml version="2.0" encoding="UTF-8"?><i') {
                return 'Bilibili2';
            }
            if (tmp3 === 'xml version="1.0" encoding="utf-8"?><i') {
                return 'Bilibili';
            }
            if (tmp3 === 'xml version="1.0" encoding="Utf-8"?>\n<') {
                return 'Bilibili';
            }
            if (tmp3 === 'xml version="1.0" encoding="UTF-8"?>\n<') {
                const tmp4 = f.slice(38, 20);
                if (tmp4 === '!-- BoonSutazioData=') {
                    return 'Niconico';
                }
                return 'MioMio';
            }
        }
        if (tmp2 === 'p') {
            return 'Niconico';
        }
    }
}
// @SeekZero
// @EOFAsNone
// def ProbeCommentFormat(f):
//     tmp = f.read(1)
//     if tmp == '[':
//         tmp = f.read(8)
//         if tmp == '{"ping":':
//             return 'NiconicoYtdlpJson'
//         if tmp == '{"id": "':
//             return 'NiconicoYtdlpJson2'
//         return 'Acfun'
//         # It is unwise to wrap a JSON object in an array!
//         # See this: http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx/
//         # Do never follow what Acfun developers did!
//         # Note2, this is no longer relevant, unless someone uses a browser from 2010.
//     elif tmp == '{':
//         tmp = f.read(14)
//         if tmp == '"status_code":':
//             return 'Tudou'
//         elif tmp.strip().startswith('"count":'):
//             return 'DanDanPlay'
//         elif tmp.strip().startswith('"result'):
//             return 'Tudou2'
//     elif tmp == '<':
//         tmp = f.read(1)
//         if tmp == '?':
//             tmp = f.read(38)
//             if tmp == 'xml version="1.0" encoding="UTF-8"?><p':
//                 return 'Niconico'
//             elif tmp == 'xml version="1.0" encoding="UTF-8"?><i':
//                 return 'Bilibili'
//             elif tmp == 'xml version="2.0" encoding="UTF-8"?><i':
//                 return 'Bilibili2'
//             elif tmp == 'xml version="1.0" encoding="utf-8"?><i':
//                 return 'Bilibili'  # tucao.cc, with the same file format as Bilibili
//             elif tmp == 'xml version="1.0" encoding="Utf-8"?>\n<':
//                 return 'Bilibili'  # Komica, with the same file format as Bilibili
//             elif tmp == 'xml version="1.0" encoding="UTF-8"?>\n<':
//                 tmp = f.read(20)
//                 if tmp == '!-- BoonSutazioData=':
//                     return 'Niconico'  # Niconico videos downloaded with NicoFox
//                 else:
//                     return 'MioMio'
//         elif tmp == 'p':
//             return 'Niconico'  # Himawari Douga, with the same file format as Niconico Douga


// #
// # ReadComments**** protocol
// #
// # Input:
// #     f:         Input file
// #     fontsize:  Default font size
// #
// # Output:
// #     yield a tuple:
// #         (timeline, timestamp, no, comment, pos, color, size, height, width)
// #     timeline:  The position when the comment is replayed
// #     timestamp: The UNIX timestamp when the comment is submitted
// #     no:        A sequence of 1, 2, 3, ..., used for sorting
// #     comment:   The content of the comment
// #     pos:       0 for regular moving comment,
// #                1 for bottom centered comment,
// #                2 for top centered comment,
// #                3 for reversed moving comment
// #     color:     Font color represented in 0xRRGGBB,
// #                e.g. 0xffffff for white
// #     size:      Font size
// #     height:    The estimated height in pixels
// #                i.e. (comment.count('\n')+1)*size
// #     width:     The estimated width in pixels
// #                i.e. CalculateLength(comment)*size
// #
// # After implementing ReadComments****, make sure to update ProbeCommentFormat
// # and CommentFormatMap.
// #


// def ReadCommentsNiconicoYtdlpJson(f, fontsize):
//     NiconicoColorMap = {'red': 0xff0000, 'pink': 0xff8080, 'orange': 0xffcc00, 'yellow': 0xffff00, 'green': 0x00ff00, 'cyan': 0x00ffff, 'blue': 0x0000ff, 'purple': 0xc000ff, 'black': 0x000000, 'niconicowhite': 0xcccc99, 'white2': 0xcccc99, 'truered': 0xcc0033, 'red2': 0xcc0033, 'passionorange': 0xff6600, 'orange2': 0xff6600, 'madyellow': 0x999900, 'yellow2': 0x999900, 'elementalgreen': 0x00cc66, 'green2': 0x00cc66, 'marineblue': 0x33ffcc, 'blue2': 0x33ffcc, 'nobleviolet': 0x6633cc, 'purple2': 0x6633cc}
//     json_list = json.load(f)
//     for json_dict in json_list:
//         if len(json_dict) != 1:
//             logging.warning(_('Rare json: %s') % str(json_dict))
//             continue
//         (key, value), = json_dict.items()
//         if key != 'chat':
//             continue
//         del key
//         comment = value['content']
//         if comment.startswith('/'):
//             logging.warning(_('Advanced comment: %s') % comment)
//         pos = 0
//         color = 0xffffff
//         size = fontsize
//         mail = ""
//         try:
//             mail = value['mail']
//         except KeyError:
//             pass
//         for mailstyle in mail.split():
//             if mailstyle == 'ue':
//                 pos = 1
//             elif mailstyle == 'shita':
//                 pos = 2
//             elif mailstyle == 'big':
//                 size = fontsize * 1.44
//             elif mailstyle == 'small':
//                 size = fontsize * 0.64
//             elif mailstyle in NiconicoColorMap:
//                 color = NiconicoColorMap[mailstyle]
//         timeline = max(value['vpos'], 0) * 0.01
//         timestamp = value['date']
//         no = value['no']
//         height = (comment.count('\n') + 1) * size
//         width = CalculateLength(comment) * size
//         yield (timeline, timestamp, no, comment, pos, color, size, height, width)

// def ReadCommentsNiconicoYtdlpJson2(f, fontsize):
//     NiconicoColorMap = {'red': 0xff0000, 'pink': 0xff8080, 'orange': 0xffcc00, 'yellow': 0xffff00, 'green': 0x00ff00, 'cyan': 0x00ffff, 'blue': 0x0000ff, 'purple': 0xc000ff, 'black': 0x000000, 'niconicowhite': 0xcccc99, 'white2': 0xcccc99, 'truered': 0xcc0033, 'red2': 0xcc0033, 'passionorange': 0xff6600, 'orange2': 0xff6600, 'madyellow': 0x999900, 'yellow2': 0x999900, 'elementalgreen': 0x00cc66, 'green2': 0x00cc66, 'marineblue': 0x33ffcc, 'blue2': 0x33ffcc, 'nobleviolet': 0x6633cc, 'purple2': 0x6633cc}
//     json_list = json.load(f)
//     for value in json_list:
//         comment = value['body']
//         pos = 0
//         color = 0xffffff
//         size = fontsize
//         for cmd in value['commands']:
//             if cmd == 'ue':
//                 pos = 1
//             elif cmd == 'shita':
//                 pos = 2
//             elif cmd == 'big':
//                 size = fontsize * 1.44
//             elif cmd == 'small':
//                 size = fontsize * 0.64
//             elif cmd in NiconicoColorMap:
//                 color = NiconicoColorMap[cmd]
//             # One command I'm seeing is 184, no idea what it's for
//         timeline = max(value['vposMs'], 0) * 0.001
//         timestamp = value['postedAt'] # RFC3339 format
//         no = value['no']
//         height = (comment.count('\n') + 1) * size
//         width = CalculateLength(comment) * size
//         yield (timeline, timestamp, no, comment, pos, color, size, height, width)


// def ReadCommentsNiconico(f, fontsize):
//     NiconicoColorMap = {'red': 0xff0000, 'pink': 0xff8080, 'orange': 0xffcc00, 'yellow': 0xffff00, 'green': 0x00ff00, 'cyan': 0x00ffff, 'blue': 0x0000ff, 'purple': 0xc000ff, 'black': 0x000000, 'niconicowhite': 0xcccc99, 'white2': 0xcccc99, 'truered': 0xcc0033, 'red2': 0xcc0033, 'passionorange': 0xff6600, 'orange2': 0xff6600, 'madyellow': 0x999900, 'yellow2': 0x999900, 'elementalgreen': 0x00cc66, 'green2': 0x00cc66, 'marineblue': 0x33ffcc, 'blue2': 0x33ffcc, 'nobleviolet': 0x6633cc, 'purple2': 0x6633cc}
//     dom = xml.dom.minidom.parse(f)
//     comment_element = dom.getElementsByTagName('chat')
//     for comment in comment_element:
//         try:
//             c = str(comment.childNodes[0].wholeText)
//             if c.startswith('/'):
//                 continue  # ignore advanced comments
//             pos = 0
//             color = 0xffffff
//             size = fontsize
//             for mailstyle in str(comment.getAttribute('mail')).split():
//                 if mailstyle == 'ue':
//                     pos = 1
//                 elif mailstyle == 'shita':
//                     pos = 2
//                 elif mailstyle == 'big':
//                     size = fontsize * 1.44
//                 elif mailstyle == 'small':
//                     size = fontsize * 0.64
//                 elif mailstyle in NiconicoColorMap:
//                     color = NiconicoColorMap[mailstyle]
//             timeline = max(int(comment.getAttribute('vpos')), 0) * 0.01
//             timestamp = int(comment.getAttribute('date'))
//             no = int(comment.getAttribute('no'))
//             height = (c.count('\n') + 1) * size
//             width = CalculateLength(c) * size
//             yield (timeline, timestamp, no, c, pos, color, size, height, width)
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %s') % comment.toxml())
//             continue


// def ReadCommentsAcfun(f, fontsize):
//     #comment_element = json.load(f)
//     # after load acfun comment json file as python list, flatten the list
//     #comment_element = [c for sublist in comment_element for c in sublist]
//     comment_elements = json.load(f)
//     comment_element = comment_elements[2]
//     for i, comment in enumerate(comment_element):
//         try:
//             p = str(comment['c']).split(',')
//             assert len(p) >= 6
//             assert p[2] in ('1', '2', '4', '5', '7')
//             size = int(p[3]) * fontsize / 25.0
//             if p[2] != '7':
//                 c = str(comment['m']).replace('\\r', '\n').replace('\r', '\n')
//                 yield (float(p[0]), int(p[5]), i, c, {'1': 0, '2': 0, '4': 2, '5': 1}[p[2]], int(p[1]), size, (c.count('\n') + 1) * size, CalculateLength(c) * size)
//             else:
//                 c = dict(json.loads(comment['m']))
//                 yield (float(p[0]), int(p[5]), i, c, 'acfunpos', int(p[1]), size, 0, 0)
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %r') % comment)
//             continue


// def ReadCommentsBilibili(f, fontsize):
//     dom = xml.dom.minidom.parse(f)
//     comment_element = dom.getElementsByTagName('d')
//     for i, comment in enumerate(comment_element):
//         try:
//             p = str(comment.getAttribute('p')).split(',')
//             assert len(p) >= 5
//             assert p[1] in ('1', '4', '5', '6', '7', '8')
//             if comment.childNodes.length > 0:
//                 if p[1] in ('1', '4', '5', '6'):
//                     c = str(comment.childNodes[0].wholeText).replace('/n', '\n')
//                     size = int(p[2]) * fontsize / 25.0
//                     yield (float(p[0]), int(p[4]), i, c, {'1': 0, '4': 2, '5': 1, '6': 3}[p[1]], int(p[3]), size, (c.count('\n') + 1) * size, CalculateLength(c) * size)
//                 elif p[1] == '7':  # positioned comment
//                     c = str(comment.childNodes[0].wholeText)
//                     yield (float(p[0]), int(p[4]), i, c, 'bilipos', int(p[3]), int(p[2]), 0, 0)
//                 elif p[1] == '8':
//                     pass  # ignore scripted comment
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %s') % comment.toxml())
//             continue
const Parser = new (require('jsdom').JSDOM)().window.DOMParser;

function ReadCommentsBilibili(f: string, fontsize: number) {
    const dom = new Parser().parseFromString(f, 'text/xml');
    const comment_element = dom.getElementsByTagName('d');
    const res: any[][] = [];
    for (let i = 0; i < comment_element.length; i++) {
        const comment = comment_element[i];
        try {
            const p = comment.getAttribute('p')?.toString().split(',');
            if (!p || p.length < 5) continue;
            if (!['1', '4', '5', '6', '7', '8'].includes(p[1])) continue;
            if (comment.childNodes.length > 0) {
                if (['1', '4', '5', '6'].includes(p[1])) {
                    const c = comment.childNodes[0].textContent?.replace('/n', '\n');
                    const size = parseInt(p[2]) * fontsize / 25.0;
                    res.push([
                        parseFloat(p[0]),
                        parseInt(p[4]),
                        i, c,
                        { '1': 0, '4': 2, '5': 1, '6': 3 }[p[1]],
                        parseInt(p[3]),
                        size,
                        (c?.split('\n').length || 1) * size,
                        CalculateLength(c) * size
                    ]);
                } else if (p[1] === '7') {
                    const c = comment.childNodes[0].textContent;
                    res.push([
                        parseFloat(p[0]),
                        parseInt(p[4]),
                        i,
                        c,
                        'bilipos',
                        parseInt(p[3]),
                        parseInt(p[2]),
                        0,
                        0
                    ]);
                } else if (p[1] === '8') {
                    continue;
                }
            }
        } catch (e) {
            console.error(e);
            continue;
        }
    }
    return res;
}

// def ReadCommentsBilibili2(f, fontsize):
//     dom = xml.dom.minidom.parse(f)
//     comment_element = dom.getElementsByTagName('d')
//     for i, comment in enumerate(comment_element):
//         try:
//             p = str(comment.getAttribute('p')).split(',')
//             assert len(p) >= 7
//             assert p[3] in ('1', '4', '5', '6', '7', '8')
//             if comment.childNodes.length > 0:
//                 time = float(p[2]) / 1000.0
//                 if p[3] in ('1', '4', '5', '6'):
//                     c = str(comment.childNodes[0].wholeText).replace('/n', '\n')
//                     size = int(p[4]) * fontsize / 25.0
//                     yield (time, int(p[6]), i, c, {'1': 0, '4': 2, '5': 1, '6': 3}[p[3]], int(p[5]), size, (c.count('\n') + 1) * size, CalculateLength(c) * size)
//                 elif p[3] == '7':  # positioned comment
//                     c = str(comment.childNodes[0].wholeText)
//                     yield (time, int(p[6]), i, c, 'bilipos', int(p[5]), int(p[4]), 0, 0)
//                 elif p[3] == '8':
//                     pass  # ignore scripted comment
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %s') % comment.toxml())
//             continue

function ReadCommentsBilibili2(f: string, fontsize: number) {
    const dom = new DOMParser().parseFromString(f, 'text/xml');
    const comment_element = dom.getElementsByTagName('d');
    const res: any[][] = [];
    for (let i = 0; i < comment_element.length; i++) {
        const comment = comment_element[i];
        try {
            const p = comment.getAttribute('p')?.toString().split(',');
            if (!p || p.length < 7) continue;
            if (!['1', '4', '5', '6', '7', '8'].includes(p[3])) continue;
            if (comment.childNodes.length > 0) {
                const time = parseFloat(p[2]) / 1000;
                if (['1', '4', '5', '6'].includes(p[3])) {
                    const c = comment.childNodes[0].textContent?.replace('/n', '\n')!;
                    const size = parseInt(p[4]) * fontsize / 25.0;
                    res.push([time, parseInt(p[6]), i, c, { '1': 0, '4': 2, '5': 1, '6': 3 }[p[3]], parseInt(p[5]), size, (c?.split('\n').length || 1) * size, CalculateLength(c) * size]);
                }
                if (p[3] === '7') {
                    const c = comment.childNodes[0].textContent;
                    res.push([time, parseInt(p[6]), i, c, 'bilipos', parseInt(p[5]), parseInt(p[4]), 0, 0]);
                }
                if (p[3] === '8') {
                    continue;
                }
            }
        } catch (e) {
            console.error(e);
            continue;
        }
    }
    return res;
}


// def ReadCommentsTudou(f, fontsize):
//     comment_element = json.load(f)
//     for i, comment in enumerate(comment_element['comment_list']):
//         try:
//             assert comment['pos'] in (3, 4, 6)
//             c = str(comment['data'])
//             assert comment['size'] in (0, 1, 2)
//             size = {0: 0.64, 1: 1, 2: 1.44}[comment['size']] * fontsize
//             yield (int(comment['replay_time'] * 0.001), int(comment['commit_time']), i, c, {3: 0, 4: 2, 6: 1}[comment['pos']], int(comment['color']), size, (c.count('\n') + 1) * size, CalculateLength(c) * size)
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %r') % comment)
//             continue


// def ReadCommentsTudou2(f, fontsize):
//     comment_element = json.load(f)
//     for i, comment in enumerate(comment_element['result']):
//         try:
//             c = str(comment['content'])
//             prop = json.loads(str(comment['propertis']) or '{}')
//             size = int(prop.get('size', 1))
//             assert size in (0, 1, 2)
//             size = {0: 0.64, 1: 1, 2: 1.44}[size] * fontsize
//             pos = int(prop.get('pos', 3))
//             assert pos in (0, 3, 4, 6)
//             yield (
//                 int(comment['playat'] * 0.001), int(comment['createtime'] * 0.001), i, c,
//                 {0: 0, 3: 0, 4: 2, 6: 1}[pos],
//                 int(prop.get('color', 0xffffff)), size, (c.count('\n') + 1) * size, CalculateLength(c) * size)
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %r') % comment)
//             continue


// def ReadCommentsMioMio(f, fontsize):
//     NiconicoColorMap = {'red': 0xff0000, 'pink': 0xff8080, 'orange': 0xffc000, 'yellow': 0xffff00, 'green': 0x00ff00, 'cyan': 0x00ffff, 'blue': 0x0000ff, 'purple': 0xc000ff, 'black': 0x000000}
//     dom = xml.dom.minidom.parse(f)
//     comment_element = dom.getElementsByTagName('data')
//     for i, comment in enumerate(comment_element):
//         try:
//             message = comment.getElementsByTagName('message')[0]
//             c = str(message.childNodes[0].wholeText)
//             pos = 0
//             size = int(message.getAttribute('fontsize')) * fontsize / 25.0
//             yield (float(comment.getElementsByTagName('playTime')[0].childNodes[0].wholeText), int(calendar.timegm(time.strptime(comment.getElementsByTagName('times')[0].childNodes[0].wholeText, '%Y-%m-%d %H:%M:%S'))) - 28800, i, c, {'1': 0, '4': 2, '5': 1}[message.getAttribute('mode')], int(message.getAttribute('color')), size, (c.count('\n') + 1) * size, CalculateLength(c) * size)
//         except (AssertionError, AttributeError, IndexError, TypeError, ValueError):
//             logging.warning(_('Invalid comment: %s') % comment.toxml())
//             continue


// def ReadCommentDanDanPlay(f, fontsize):
//     comment_element = json.load(f)
//     for i, comment_item in enumerate(comment_element['comments']):
//         try:
//             timeline, pos, color, _user_id = comment_item['p'].split(',')
//             timeline = float(timeline)
//             timestamp = comment_item['cid']
//             no = i
//             comment = comment_item['m']
//             pos = int(pos)
//             pos = {1: 0, 4: 1, 5: 2}[pos]
//             color = int(color)
//             size = fontsize
//             height = (comment.count('\n') + 1) * size
//             width = CalculateLength(comment) * size
//             yield (timeline, timestamp, no, comment, pos, color, size, height, width)
//         except:
//             logging.warning(_('Invalid comment: %r') % comment_item)
//             continue


// CommentFormatMap = {
//     'Niconico': ReadCommentsNiconico,
//     'NiconicoYtdlpJson': ReadCommentsNiconicoYtdlpJson,
//     'NiconicoYtdlpJson2': ReadCommentsNiconicoYtdlpJson2,
//     'Acfun': ReadCommentsAcfun,
//     'Bilibili': ReadCommentsBilibili,
//     'Bilibili2': ReadCommentsBilibili2,
//     'Tudou': ReadCommentsTudou,
//     'Tudou2': ReadCommentsTudou2,
//     'MioMio': ReadCommentsMioMio,
//     'DanDanPlay': ReadCommentDanDanPlay
// }

const CommentFormatMap = {
    'Bilibili': ReadCommentsBilibili,
    'Bilibili2': ReadCommentsBilibili2,
}


// def WriteCommentBilibiliPositioned(f, c, width, height, styleid):
//     # BiliPlayerSize = (512, 384)  # Bilibili player version 2010
//     # BiliPlayerSize = (540, 384)  # Bilibili player version 2012
//     BiliPlayerSize = (672, 438)  # Bilibili player version 2014
//     ZoomFactor = GetZoomFactor(BiliPlayerSize, (width, height))

//     def GetPosition(InputPos, isHeight):
//         isHeight = int(isHeight)  # True -> 1
//         if isinstance(InputPos, int):
//             return ZoomFactor[0] * InputPos + ZoomFactor[isHeight + 1]
//         elif isinstance(InputPos, float):
//             if InputPos > 1:
//                 return ZoomFactor[0] * InputPos + ZoomFactor[isHeight + 1]
//             else:
//                 return BiliPlayerSize[isHeight] * ZoomFactor[0] * InputPos + ZoomFactor[isHeight + 1]
//         else:
//             try:
//                 InputPos = int(InputPos)
//             except ValueError:
//                 InputPos = float(InputPos)
//             return GetPosition(InputPos, isHeight)

//     try:
//         comment_args = safe_list(json.loads(c[3]))
//         text = ASSEscape(str(comment_args[4]).replace('/n', '\n'))
//         from_x = comment_args.get(0, 0)
//         from_y = comment_args.get(1, 0)
//         to_x = comment_args.get(7, from_x)
//         to_y = comment_args.get(8, from_y)
//         from_x = GetPosition(from_x, False)
//         from_y = GetPosition(from_y, True)
//         to_x = GetPosition(to_x, False)
//         to_y = GetPosition(to_y, True)
//         alpha = safe_list(str(comment_args.get(2, '1')).split('-'))
//         from_alpha = float(alpha.get(0, 1))
//         to_alpha = float(alpha.get(1, from_alpha))
//         from_alpha = 255 - round(from_alpha * 255)
//         to_alpha = 255 - round(to_alpha * 255)
//         rotate_z = int(comment_args.get(5, 0))
//         rotate_y = int(comment_args.get(6, 0))
//         lifetime = float(comment_args.get(3, 4500))
//         duration = int(comment_args.get(9, lifetime * 1000))
//         delay = int(comment_args.get(10, 0))
//         fontface = comment_args.get(12)
//         isborder = comment_args.get(11, 'true')
//         from_rotarg = ConvertFlashRotation(rotate_y, rotate_z, from_x, from_y, width, height)
//         to_rotarg = ConvertFlashRotation(rotate_y, rotate_z, to_x, to_y, width, height)
//         styles = ['\\org(%d, %d)' % (width / 2, height / 2)]
//         if from_rotarg[0:2] == to_rotarg[0:2]:
//             styles.append('\\pos(%.0f, %.0f)' % (from_rotarg[0:2]))
//         else:
//             styles.append('\\move(%.0f, %.0f, %.0f, %.0f, %.0f, %.0f)' % (from_rotarg[0:2] + to_rotarg[0:2] + (delay, delay + duration)))
//         styles.append('\\frx%.0f\\fry%.0f\\frz%.0f\\fscx%.0f\\fscy%.0f' % (from_rotarg[2:7]))
//         if (from_x, from_y) != (to_x, to_y):
//             styles.append('\\t(%d, %d, ' % (delay, delay + duration))
//             styles.append('\\frx%.0f\\fry%.0f\\frz%.0f\\fscx%.0f\\fscy%.0f' % (to_rotarg[2:7]))
//             styles.append(')')
//         if fontface:
//             styles.append('\\fn%s' % ASSEscape(fontface))
//         styles.append('\\fs%.0f' % (c[6] * ZoomFactor[0]))
//         if c[5] != 0xffffff:
//             styles.append('\\c&H%s&' % ConvertColor(c[5]))
//             if c[5] == 0x000000:
//                 styles.append('\\3c&HFFFFFF&')
//         if from_alpha == to_alpha:
//             styles.append('\\alpha&H%02X' % from_alpha)
//         elif (from_alpha, to_alpha) == (255, 0):
//             styles.append('\\fad(%.0f,0)' % (lifetime * 1000))
//         elif (from_alpha, to_alpha) == (0, 255):
//             styles.append('\\fad(0, %.0f)' % (lifetime * 1000))
//         else:
//             styles.append('\\fade(%(from_alpha)d, %(to_alpha)d, %(to_alpha)d, 0, %(end_time).0f, %(end_time).0f, %(end_time).0f)' % {'from_alpha': from_alpha, 'to_alpha': to_alpha, 'end_time': lifetime * 1000})
//         if isborder == 'false':
//             styles.append('\\bord0')
//         f.write('Dialogue: -1,%(start)s,%(end)s,%(styleid)s,,0,0,0,,{%(styles)s}%(text)s\n' % {'start': ConvertTimestamp(c[0]), 'end': ConvertTimestamp(c[0] + lifetime), 'styles': ''.join(styles), 'text': text, 'styleid': styleid})
//     except (IndexError, ValueError) as e:
//         try:
//             logging.warning(_('Invalid comment: %r') % c[3])
//         except IndexError:
//             logging.warning(_('Invalid comment: %r') % c)

function WriteCommentBilibiliPositioned(c: any, width: number, height: number, styleid: string) {
    const BiliPlayerSize = [672, 438];
    const ZoomFactor = GetZoomFactor(BiliPlayerSize, [width, height]);

    function GetPosition(InputPos: number, isHeight: boolean | 0 | 1) {
        isHeight = isHeight ? 1 : 0;
        if (typeof InputPos === 'number') {
            return ZoomFactor[0] * InputPos + ZoomFactor[isHeight + 1];
        } else if (typeof InputPos === 'number') {
            if (InputPos > 1) {
                return ZoomFactor[0] * InputPos + ZoomFactor[isHeight + 1];
            } else {
                return BiliPlayerSize[isHeight] * ZoomFactor[0] * InputPos * 0.001 + ZoomFactor[isHeight + 1];
            }
        } else {
            try {
                InputPos = Math.floor(+InputPos);
            } catch (e) {
                InputPos = InputPos;
            }
            return GetPosition(InputPos, isHeight);
        }
    }

    try {
        const comment_args = JSON.parse(c[3]);
        const text = ASSEscape(String(comment_args[4]).replace('/n', '\n'));
        let from_x = comment_args.get(0, 0);
        let from_y = comment_args.get(1, 0);
        let to_x = comment_args.get(7, from_x);
        let to_y = comment_args.get(8, from_y);
        from_x = GetPosition(from_x, false);
        from_y = GetPosition(from_y, true);
        to_x = GetPosition(to_x, false);
        to_y = GetPosition(to_y, true);
        const alpha = comment_args.get(2, '1').toString().split('-');
        let from_alpha = parseFloat(alpha.get(0, '1'));
        let to_alpha = parseFloat(alpha.get(1, from_alpha));
        from_alpha = 255 - Math.round(from_alpha * 255);
        to_alpha = 255 - Math.round(to_alpha * 255);
        const rotate_z = parseInt(comment_args.get(5, 0));
        const rotate_y = parseInt(comment_args.get(6, 0));
        const lifetime = parseFloat(comment_args.get(3, 4500));
        const duration = parseInt(comment_args.get(9, lifetime * 1000));
        const delay = parseInt(comment_args.get(10, 0));
        const fontface = comment_args.get(12);
        const isborder = comment_args.get(11, 'true');
        const from_rotarg = ConvertFlashRotation(rotate_y, rotate_z, from_x, from_y, width, height);
        const to_rotarg = ConvertFlashRotation(rotate_y, rotate_z, to_x, to_y, width, height);
        const styles = ['\\org(%d, %d)'];
        if (from_rotarg[0] === to_rotarg[0] && from_rotarg[1] === to_rotarg[1] && from_rotarg[2] === to_rotarg[2]) {
            styles.push(`\\pos(${from_rotarg[0]}, ${from_rotarg[1]})`);
        } else {
            styles.push(`\\move(${from_rotarg[0]}, ${from_rotarg[1]}, ${to_rotarg[0]}, ${to_rotarg[1]}, ${from_rotarg[2]}, ${from_rotarg[3]})`);
        }
        styles.push(`\\frx${from_rotarg[2]}\\fry${from_rotarg[3]}\\frz${from_rotarg[4]}\\fscx${from_rotarg[5]}\\fscy${from_rotarg[6]}`);
        if (from_x !== to_x && from_y !== to_y) {
            styles.push(`\\t(${delay}, ${delay + duration}, `);
            styles.push(`\\frx${to_rotarg[2]}\\fry${to_rotarg[3]}\\frz${to_rotarg[4]}\\fscx${to_rotarg[5]}\\fscy${to_rotarg[6]}`);
            styles.push(')');
        }
        if (fontface) {
            styles.push(`\\fn${ASSEscape(fontface)}`);
        }
        styles.push(`\\fs${c[6] * ZoomFactor[0]}`);
        if (c[5] !== 0xffffff) {
            styles.push(`\\c&H${c[5].toString(16).padStart(6, '0')}&`);
            if (c[5] === 0x000000) {
                styles.push('\\3c&HFFFFFF&');
            }
        }
        if (from_alpha === to_alpha) {
            styles.push(`\\alpha&H${from_alpha.toString(16).padStart(2, '0')}`);
        } else if (from_alpha === 255 && to_alpha === 0) {
            styles.push(`\\fad(${Math.round(lifetime * 1000)},0)`);
        } else if (from_alpha === 0 && to_alpha === 255) {
            styles.push(`\\fad(0, ${Math.round(lifetime * 1000)})`);
        }
        if (isborder === 'false') {
            styles.push('\\bord0');
        }
        return `Dialogue: -1,${ConvertTimestamp(c[0])},${ConvertTimestamp(c[0] + lifetime)},${styleid},,,0,0,0,,${styles.join('')}${text}\n`;
    } catch (e) {
        console.error(e);
    }
}

// def WriteCommentAcfunPositioned(f, c, width, height, styleid):
//     AcfunPlayerSize = (560, 400)
//     ZoomFactor = GetZoomFactor(AcfunPlayerSize, (width, height))

//     def GetPosition(InputPos, isHeight):
//         isHeight = int(isHeight)  # True -> 1
//         return AcfunPlayerSize[isHeight] * ZoomFactor[0] * InputPos * 0.001 + ZoomFactor[isHeight + 1]

//     def GetTransformStyles(x=None, y=None, scale_x=None, scale_y=None, rotate_z=None, rotate_y=None, color=None, alpha=None):
//         styles = []
//         out_x, out_y = x, y
//         if rotate_z is not None and rotate_y is not None:
//             assert x is not None
//             assert y is not None
//             rotarg = ConvertFlashRotation(rotate_y, rotate_z, x, y, width, height)
//             out_x, out_y = rotarg[0:2]
//             if scale_x is None:
//                 scale_x = 1
//             if scale_y is None:
//                 scale_y = 1
//             styles.append('\\frx%.0f\\fry%.0f\\frz%.0f\\fscx%.0f\\fscy%.0f' % (rotarg[2:5] + (rotarg[5] * scale_x, rotarg[6] * scale_y)))
//         else:
//             if scale_x is not None:
//                 styles.append('\\fscx%.0f' % (scale_x * 100))
//             if scale_y is not None:
//                 styles.append('\\fscy%.0f' % (scale_y * 100))
//         if color is not None:
//             styles.append('\\c&H%s&' % ConvertColor(color))
//             if color == 0x000000:
//                 styles.append('\\3c&HFFFFFF&')
//         if alpha is not None:
//             alpha = 255 - round(alpha * 255)
//             styles.append('\\alpha&H%02X' % alpha)
//         return out_x, out_y, styles

//     def FlushCommentLine(f, text, styles, start_time, end_time, styleid):
//         if end_time > start_time:
//             f.write('Dialogue: -1,%(start)s,%(end)s,%(styleid)s,,0,0,0,,{%(styles)s}%(text)s\n' % {'start': ConvertTimestamp(start_time), 'end': ConvertTimestamp(end_time), 'styles': ''.join(styles), 'text': text, 'styleid': styleid})

//     try:
//         comment_args = c[3]
//         text = ASSEscape(str(comment_args['n']).replace('\r', '\n'))
//         common_styles = ['\\org(%d, %d)' % (width / 2, height / 2)]
//         anchor = {0: 7, 1: 8, 2: 9, 3: 4, 4: 5, 5: 6, 6: 1, 7: 2, 8: 3}.get(comment_args.get('c', 0), 7)
//         if anchor != 7:
//             common_styles.append('\\an%s' % anchor)
//         font = comment_args.get('w')
//         if font:
//             font = dict(font)
//             fontface = font.get('f')
//             if fontface:
//                 common_styles.append('\\fn%s' % ASSEscape(str(fontface)))
//             fontbold = bool(font.get('b'))
//             if fontbold:
//                 common_styles.append('\\b1')
//         common_styles.append('\\fs%.0f' % (c[6] * ZoomFactor[0]))
//         isborder = bool(comment_args.get('b', True))
//         if not isborder:
//             common_styles.append('\\bord0')
//         to_pos = dict(comment_args.get('p', {'x': 0, 'y': 0}))
//         to_x = round(GetPosition(int(to_pos.get('x', 0)), False))
//         to_y = round(GetPosition(int(to_pos.get('y', 0)), True))
//         to_scale_x = float(comment_args.get('e', 1.0))
//         to_scale_y = float(comment_args.get('f', 1.0))
//         to_rotate_z = float(comment_args.get('r', 0.0))
//         to_rotate_y = float(comment_args.get('k', 0.0))
//         to_color = c[5]
//         to_alpha = float(comment_args.get('a', 1.0))
//         from_time = float(comment_args.get('t', 0.0))
//         action_time = float(comment_args.get('l', 3.0))
//         actions = list(comment_args.get('z', []))
//         to_out_x, to_out_y, transform_styles = GetTransformStyles(to_x, to_y, to_scale_x, to_scale_y, to_rotate_z, to_rotate_y, to_color, to_alpha)
//         FlushCommentLine(f, text, common_styles + ['\\pos(%.0f, %.0f)' % (to_out_x, to_out_y)] + transform_styles, c[0] + from_time, c[0] + from_time + action_time, styleid)
//         action_styles = transform_styles
//         for action in actions:
//             action = dict(action)
//             from_x, from_y = to_x, to_y
//             from_out_x, from_out_y = to_out_x, to_out_y
//             from_scale_x, from_scale_y = to_scale_x, to_scale_y
//             from_rotate_z, from_rotate_y = to_rotate_z, to_rotate_y
//             from_color, from_alpha = to_color, to_alpha
//             transform_styles, action_styles = action_styles, []
//             from_time += action_time
//             action_time = float(action.get('l', 0.0))
//             if 'x' in action:
//                 to_x = round(GetPosition(int(action['x']), False))
//             if 'y' in action:
//                 to_y = round(GetPosition(int(action['y']), True))
//             if 'f' in action:
//                 to_scale_x = float(action['f'])
//             if 'g' in action:
//                 to_scale_y = float(action['g'])
//             if 'c' in action:
//                 to_color = int(action['c'])
//             if 't' in action:
//                 to_alpha = float(action['t'])
//             if 'd' in action:
//                 to_rotate_z = float(action['d'])
//             if 'e' in action:
//                 to_rotate_y = float(action['e'])
//             to_out_x, to_out_y, action_styles = GetTransformStyles(to_x, to_y, from_scale_x, from_scale_y, to_rotate_z, to_rotate_y, from_color, from_alpha)
//             if (from_out_x, from_out_y) == (to_out_x, to_out_y):
//                 pos_style = '\\pos(%.0f, %.0f)' % (to_out_x, to_out_y)
//             else:
//                 pos_style = '\\move(%.0f, %.0f, %.0f, %.0f)' % (from_out_x, from_out_y, to_out_x, to_out_y)
//             styles = common_styles + transform_styles
//             styles.append(pos_style)
//             if action_styles:
//                 styles.append('\\t(%s)' % (''.join(action_styles)))
//             FlushCommentLine(f, text, styles, c[0] + from_time, c[0] + from_time + action_time, styleid)
//     except (IndexError, ValueError) as e:
//         logging.warning(_('Invalid comment: %r') % c[3])


// # Result: (f, dx, dy)
// # To convert: NewX = f*x+dx, NewY = f*y+dy
// def GetZoomFactor(SourceSize, TargetSize):
//     try:
//         if (SourceSize, TargetSize) == GetZoomFactor.Cached_Size:
//             return GetZoomFactor.Cached_Result
//     except AttributeError:
//         pass
//     GetZoomFactor.Cached_Size = (SourceSize, TargetSize)
//     try:
//         SourceAspect = SourceSize[0] / SourceSize[1]
//         TargetAspect = TargetSize[0] / TargetSize[1]
//         if TargetAspect < SourceAspect:  # narrower
//             ScaleFactor = TargetSize[0] / SourceSize[0]
//             GetZoomFactor.Cached_Result = (ScaleFactor, 0, (TargetSize[1] - TargetSize[0] / SourceAspect) / 2)
//         elif TargetAspect > SourceAspect:  # wider
//             ScaleFactor = TargetSize[1] / SourceSize[1]
//             GetZoomFactor.Cached_Result = (ScaleFactor, (TargetSize[0] - TargetSize[1] * SourceAspect) / 2, 0)
//         else:
//             GetZoomFactor.Cached_Result = (TargetSize[0] / SourceSize[0], 0, 0)
//         return GetZoomFactor.Cached_Result
//     except ZeroDivisionError:
//         GetZoomFactor.Cached_Result = (1, 0, 0)
//         return GetZoomFactor.Cached_Result

let Cached_Size: number[][] = [];
let Cached_Result: number[] = [];
function GetZoomFactor(SourceSize: number[], TargetSize: number[]) {
    try {
        if (JSON.stringify(SourceSize) === JSON.stringify(Cached_Size)) {
            return Cached_Result;
        }
    } catch (e) {

    }
    Cached_Size = [SourceSize, TargetSize];
    try {
        const SourceAspect = SourceSize[0] / SourceSize[1];
        const TargetAspect = TargetSize[0] / TargetSize[1];
        if (TargetAspect < SourceAspect) {
            let ScaleFactor = TargetSize[0] / SourceSize[0];
            Cached_Result = [ScaleFactor, 0, (TargetSize[1] - TargetSize[0] / SourceAspect) / 2];
        } else if (TargetAspect > SourceAspect) {
            let ScaleFactor = TargetSize[1] / SourceSize[1];
            Cached_Result = [ScaleFactor, (TargetSize[0] - TargetSize[1] * SourceAspect) / 2, 0];
        } else {
            Cached_Result = [TargetSize[0] / SourceSize[0], 0, 0];
        }
        return Cached_Result;
    } catch (e) {
        Cached_Result = [1, 0, 0];
        return Cached_Result;
    }
}


// # Calculation is based on https://github.com/jabbany/CommentCoreLibrary/issues/5#issuecomment-40087282
// #                     and https://github.com/m13253/danmaku2ass/issues/7#issuecomment-41489422
// # ASS FOV = width*4/3.0
// # But Flash FOV = width/math.tan(100*math.pi/360.0)/2 will be used instead
// # Result: (transX, transY, rotX, rotY, rotZ, scaleX, scaleY)
// def ConvertFlashRotation(rotY, rotZ, X, Y, width, height):
//     def WrapAngle(deg):
//         return 180 - ((180 - deg) % 360)
//     rotY = WrapAngle(rotY)
//     rotZ = WrapAngle(rotZ)
//     if rotY in (90, -90):
//         rotY -= 1
//     if rotY == 0 or rotZ == 0:
//         outX = 0
//         outY = -rotY  # Positive value means clockwise in Flash
//         outZ = -rotZ
//         rotY *= math.pi / 180.0
//         rotZ *= math.pi / 180.0
//     else:
//         rotY *= math.pi / 180.0
//         rotZ *= math.pi / 180.0
//         outY = math.atan2(-math.sin(rotY) * math.cos(rotZ), math.cos(rotY)) * 180 / math.pi
//         outZ = math.atan2(-math.cos(rotY) * math.sin(rotZ), math.cos(rotZ)) * 180 / math.pi
//         outX = math.asin(math.sin(rotY) * math.sin(rotZ)) * 180 / math.pi
//     trX = (X * math.cos(rotZ) + Y * math.sin(rotZ)) / math.cos(rotY) + (1 - math.cos(rotZ) / math.cos(rotY)) * width / 2 - math.sin(rotZ) / math.cos(rotY) * height / 2
//     trY = Y * math.cos(rotZ) - X * math.sin(rotZ) + math.sin(rotZ) * width / 2 + (1 - math.cos(rotZ)) * height / 2
//     trZ = (trX - width / 2) * math.sin(rotY)
//     FOV = width * math.tan(2 * math.pi / 9.0) / 2
//     try:
//         scaleXY = FOV / (FOV + trZ)
//     except ZeroDivisionError:
//         logging.error('Rotation makes object behind the camera: trZ == %.0f' % trZ)
//         scaleXY = 1
//     trX = (trX - width / 2) * scaleXY + width / 2
//     trY = (trY - height / 2) * scaleXY + height / 2
//     if scaleXY < 0:
//         scaleXY = -scaleXY
//         outX += 180
//         outY += 180
//         logging.error('Rotation makes object behind the camera: trZ == %.0f < %.0f' % (trZ, FOV))
//     return (trX, trY, WrapAngle(outX), WrapAngle(outY), WrapAngle(outZ), scaleXY * 100, scaleXY * 100)
function ConvertFlashRotation(rotY: number, rotZ: number, X: number, Y: number, width: number, height: number) {
    const WrapAngle = (deg: number) => {
        return 180 - ((180 - deg) % 360);
    }
    rotY = WrapAngle(rotY);
    rotZ = WrapAngle(rotZ);
    if (rotY === 90 || rotY === -90) {
        rotY -= 1;
    }
    let outX = 0;
    let outY = 0;
    let outZ = 0;
    if (rotY === 0 || rotZ === 0) {
        outX = 0;
        outY = -rotY;
        outZ = -rotZ;
        rotY *= Math.PI / 180;
        rotZ *= Math.PI / 180;
    }
    else {
        rotY *= Math.PI / 180;
        rotZ *= Math.PI / 180;
        outY = Math.atan2(-Math.sin(rotY) * Math.cos(rotZ), Math.cos(rotY)) * 180 / Math.PI;
        outZ = Math.atan2(-Math.cos(rotY) * Math.sin(rotZ), Math.cos(rotZ)) * 180 / Math.PI;
        outX = Math.asin(Math.sin(rotY) * Math.sin(rotZ)) * 180 / Math.PI;
    }
    let trX = (X * Math.cos(rotZ) + Y * Math.sin(rotZ)) / Math.cos(rotY) + (1 - Math.cos(rotZ) / Math.cos(rotY)) * width / 2 - Math.sin(rotZ) / Math.cos(rotY) * height / 2;
    let trY = Y * Math.cos(rotZ) - X * Math.sin(rotZ) + Math.sin(rotZ) * width / 2 + (1 - Math.cos(rotZ)) * height / 2;
    const trZ = (trX - width / 2) * Math.sin(rotY);
    const FOV = width * Math.tan(2 * Math.PI / 9.0) / 2;
    let scaleXY = (FOV + trZ) == 0 ? 1 : FOV / (FOV + trZ);
    trX = (trX - width / 2) * scaleXY + width / 2;
    trY = (trY - height / 2) * scaleXY + height / 2;
    if (scaleXY < 0) {
        scaleXY = -scaleXY;
        outX += 180;
        outY += 180;
    }
    return [trX, trY, WrapAngle(outX), WrapAngle(outY), WrapAngle(outZ), scaleXY * 100, scaleXY * 100];
}




// def ProcessComments(comments, f, width, height, bottomReserved, fontface, fontsize, alpha, duration_marquee, duration_still, filters_regex, reduced, progress_callback):
//     styleid = 'Danmaku2ASS_%04x' % random.randint(0, 0xffff)
//     WriteASSHead(f, width, height, fontface, fontsize, alpha, styleid)
//     rows = [[None] * (height - bottomReserved + 1) for i in range(4)]
//     for idx, i in enumerate(comments):
//         if progress_callback and idx % 1000 == 0:
//             progress_callback(idx, len(comments))
//         if isinstance(i[4], int):
//             skip = False
//             for filter_regex in filters_regex:
//                 if filter_regex and filter_regex.search(i[3]):
//                     skip = True
//                     break
//             if skip:
//                 continue
//             row = 0
//             rowmax = height - bottomReserved - i[7]
//             while row <= rowmax:
//                 freerows = TestFreeRows(rows, i, row, width, height, bottomReserved, duration_marquee, duration_still)
//                 if freerows >= i[7]:
//                     MarkCommentRow(rows, i, row)
//                     WriteComment(f, i, row, width, height, bottomReserved, fontsize, duration_marquee, duration_still, styleid)
//                     break
//                 else:
//                     row += freerows or 1
//             else:
//                 if not reduced:
//                     row = FindAlternativeRow(rows, i, height, bottomReserved)
//                     MarkCommentRow(rows, i, row)
//                     WriteComment(f, i, row, width, height, bottomReserved, fontsize, duration_marquee, duration_still, styleid)
//         elif i[4] == 'bilipos':
//             WriteCommentBilibiliPositioned(f, i, width, height, styleid)
//         elif i[4] == 'acfunpos':
//             WriteCommentAcfunPositioned(f, i, width, height, styleid)
//         else:
//             logging.warning(_('Invalid comment: %r') % i[3])
//     if progress_callback:
//         progress_callback(len(comments), len(comments))
function ProcessComments(comments: any[], width: number, height: number, bottomReserved: number, fontface: string, fontsize: number, alpha: number, duration_marquee: number, duration_still: number, reduced: boolean) {
    const styleid = `Danmaku2ASS_${Math.floor(Math.random() * 0xffff)}x`;
    const res = [
        WriteASSHead(width, height, fontface, fontsize, alpha, styleid),
    ]
    const line: any[] = [];
    const rows: any[] = [];
    for (let i = 0; i < height - bottomReserved + 1; i++) {
        line.push(null);
    }
    for (let i = 0; i < 4; i++) {
        rows.push([...line]);
    }
    for (let i = 0; i < comments.length; i++) {
        const comment = comments[i];
        if (typeof comment[4] === 'number') {
            let row = 0;
            let rowmax = height - bottomReserved - comment[7];
            while (row <= rowmax) {
                const freerows = TestFreeRows(rows, comment, row, width, height, bottomReserved, duration_marquee, duration_still);
                if (freerows >= comment[7]) {
                    MarkCommentRow(rows, comment, row);
                    res.push(WriteComment(comment, row, width, height, bottomReserved, fontsize, duration_marquee, duration_still, styleid));
                    break;
                } else {
                    row += freerows || 1;
                }
            }
            if (row > rowmax) {
                if (!reduced) {
                    row = FindAlternativeRow(rows, comment, height, bottomReserved);
                    MarkCommentRow(rows, comment, row);
                    res.push(WriteComment(comment, row, width, height, bottomReserved, fontsize, duration_marquee, duration_still, styleid));
                }
            }
        } else if (comment[4] === 'bilipos') {
            const t = WriteCommentBilibiliPositioned(comment, width, height, styleid);
            if (t) res.push(t);
        } else if (comment[4] === 'acfunpos') {
            WriteCommentAcfunPositioned(rows, comment, width, height, styleid);
        } else {
            console.log(`Invalid comment: ${comment}`);
        }
    }
    return res;
}


// def TestFreeRows(rows, c, row, width, height, bottomReserved, duration_marquee, duration_still):
//     res = 0
//     rowmax = height - bottomReserved
//     targetRow = None
//     if c[4] in (1, 2):
//         while row < rowmax and res < c[7]:
//             if targetRow != rows[c[4]][row]:
//                 targetRow = rows[c[4]][row]
//                 if targetRow and targetRow[0] + duration_still > c[0]:
//                     break
//             row += 1
//             res += 1
//     else:
//         try:
//             thresholdTime = c[0] - duration_marquee * (1 - width / (c[8] + width))
//         except ZeroDivisionError:
//             thresholdTime = c[0] - duration_marquee
//         while row < rowmax and res < c[7]:
//             if targetRow != rows[c[4]][row]:
//                 targetRow = rows[c[4]][row]
//                 try:
//                     if targetRow and (targetRow[0] > thresholdTime or targetRow[0] + targetRow[8] * duration_marquee / (targetRow[8] + width) > c[0]):
//                         break
//                 except ZeroDivisionError:
//                     pass
//             row += 1
//             res += 1
//     return res
function TestFreeRows(rows: any[], c: any[], row: number, width: number, height: number, bottomReserved: number, duration_marquee: number, duration_still: number) {
    let res = 0;
    let rowmax = height - bottomReserved;
    let thresholdTime = c[0] - duration_marquee;
    let targetRow = null;
    if ([1, 2].includes(c[4])) {
        while (row < rowmax && res < c[7]) {
            if (targetRow !== rows[c[4]][row]) {
                targetRow = rows[c[4]][row];
                if (targetRow && targetRow[0] + duration_still > c[0]) {
                    break;
                }
            }
            row += 1;
            res += 1;
        }
    } else {
        try {
            thresholdTime = c[0] - duration_marquee * (1 - width / (c[8] + width));
        } catch (e) {
            thresholdTime = c[0] - duration_marquee;
        }
        while (row < rowmax && res < c[7]) {
            if (targetRow !== rows[c[4]][row]) {
                targetRow = rows[c[4]][row];
                try {
                    if (targetRow && (targetRow[0] > thresholdTime || targetRow[0] + targetRow[8] * duration_marquee / (targetRow[8] + width) > c[0])) {
                        break;
                    }
                } catch (e) {

                }
            }
            row += 1;
            res += 1;
        }
    }
    return res;
}


// def FindAlternativeRow(rows, c, height, bottomReserved):
//     res = 0
//     for row in range(height - bottomReserved - math.ceil(c[7])):
//         if not rows[c[4]][row]:
//             return row
//         elif rows[c[4]][row][0] < rows[c[4]][res][0]:
//             res = row
//     return res
function FindAlternativeRow(rows: any[], c: any[], height: number, bottomReserved: number) {
    let res = 0;
    for (let row = 0; row < height - bottomReserved - Math.ceil(c[7]); row++) {
        if (!rows[c[4]][row]) {
            return row;
        }
        if (rows[c[4]][row][0] < rows[c[4]][res][0]) {
            res = row;
        }
    }
    return res;
}


// def MarkCommentRow(rows, c, row):
//     try:
//         for i in range(row, row + math.ceil(c[7])):
//             rows[c[4]][i] = c
//     except IndexError:
//         pass
function MarkCommentRow(rows: any[], c: any[], row: number) {
    try {
        for (let i = row; i < row + Math.ceil(c[7]); i++) {
            rows[c[4]][i] = c;
        }
    } catch (e) {

    }
}
// def WriteASSHead(f, width, height, fontface, fontsize, alpha, styleid):
//     f.write(
//         '''[Script Info]
// ; Script generated by Danmaku2ASS
// ; https://github.com/m13253/danmaku2ass
// Script Updated By: Danmaku2ASS (https://github.com/m13253/danmaku2ass)
// ScriptType: v4.00+
// PlayResX: %(width)d
// PlayResY: %(height)d
// Aspect Ratio: %(width)d:%(height)d
// Collisions: Normal
// WrapStyle: 2
// ScaledBorderAndShadow: yes
// YCbCr Matrix: TV.601

// [V4+ Styles]
// Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
// Style: %(styleid)s, %(fontface)s, %(fontsize).0f, &H%(alpha)02XFFFFFF, &H%(alpha)02XFFFFFF, &H%(alpha)02X000000, &H%(alpha)02X000000, 0, 0, 0, 0, 100, 100, 0.00, 0.00, 1, %(outline).0f, 0, 7, 0, 0, 0, 0

// [Events]
// Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
// ''' % {'width': width, 'height': height, 'fontface': fontface, 'fontsize': fontsize, 'alpha': 255 - round(alpha * 255), 'outline': max(fontsize / 25.0, 1), 'styleid': styleid}
//     )

function WriteASSHead(width: number, height: number, fontface: string, fontsize: number, alpha: number, styleid: string, bold = true, italic = false, underline = false, strikeout = false) {
    const a = (255 - Math.round(alpha * 255)).toString(16).padStart(6, '0');
    return `[Script Info]
; Script generated by Danmaku2ASS
; https://github.com/m13253/danmaku2ass
Script Updated By: Danmaku2ASS (https://github.com/m13253/danmaku2ass)
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
Aspect Ratio: ${width}:${height}
Collisions: Normal
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${styleid}, ${fontface}, ${fontsize}, &H${a}FFFFFF, &H${a}FFFFFF, &H${a}000000, &H${a}000000, ${bold ? -1 : 0}, ${italic ? -1 : 0}, ${underline ? -1 : 0}, ${strikeout ? -1 : 0}, 100, 100, 0.00, 0.00, 1, ${Math.max(fontsize / 25.0, 1)}, 1, 7, 0, 0, 0, 0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}



// def WriteComment(f, c, row, width, height, bottomReserved, fontsize, duration_marquee, duration_still, styleid):
//     text = ASSEscape(c[3])
//     styles = []
//     if c[4] == 1:
//         styles.append('\\an8\\pos(%(halfwidth)d, %(row)d)' % {'halfwidth': width / 2, 'row': row})
//         duration = duration_still
//     elif c[4] == 2:
//         styles.append('\\an2\\pos(%(halfwidth)d, %(row)d)' % {'halfwidth': width / 2, 'row': ConvertType2(row, height, bottomReserved)})
//         duration = duration_still
//     elif c[4] == 3:
//         styles.append('\\move(%(neglen)d, %(row)d, %(width)d, %(row)d)' % {'width': width, 'row': row, 'neglen': -math.ceil(c[8])})
//         duration = duration_marquee
//     else:
//         styles.append('\\move(%(width)d, %(row)d, %(neglen)d, %(row)d)' % {'width': width, 'row': row, 'neglen': -math.ceil(c[8])})
//         duration = duration_marquee
//     if not (-1 < c[6] - fontsize < 1):
//         styles.append('\\fs%.0f' % c[6])
//     if c[5] != 0xffffff:
//         styles.append('\\c&H%s&' % ConvertColor(c[5]))
//         if c[5] == 0x000000:
//             styles.append('\\3c&HFFFFFF&')
//     f.write('Dialogue: 2,%(start)s,%(end)s,%(styleid)s,,0000,0000,0000,,{%(styles)s}%(text)s\n' % {'start': ConvertTimestamp(c[0]), 'end': ConvertTimestamp(c[0] + duration), 'styles': ''.join(styles), 'text': text, 'styleid': styleid})
function WriteComment(c: any[], row: number, width: number, height: number, bottomReserved: number, fontsize: number, duration_marquee: number, duration_still: number, styleid: string) {
    const text = ASSEscape(c[3]);
    const styles: string[] = [];
    let duration = 0;
    if (c[4] === 1) {
        styles.push(`\\an8\\pos(${width / 2}, ${row})`);
        duration = duration_still;
    } else if (c[4] === 2) {
        styles.push(`\\an2\\pos(${width / 2}, ${ConvertType2(row, height, bottomReserved)})`);
        duration = duration_still;
    } else if (c[4] === 3) {
        styles.push(`\\move(${-Math.ceil(c[8])}, ${row}, ${width}, ${row})`);
        duration = duration_marquee;
    } else {
        styles.push(`\\move(${width}, ${row}, ${-Math.ceil(c[8])}, ${row})`);
        duration = duration_marquee;
    }
    if (!(-1 < c[6] - fontsize && c[6] - fontsize < 1)) {
        styles.push(`\\fs${Math.round(c[6])}`);
    }
    if (c[5] !== 0xffffff) {
        styles.push(`\\c&H${ConvertColor(c[5], width, height)}&`);
        if (c[5] === 0x000000) {
            styles.push('\\3c&HFFFFFF&');
        }
    }
    return `Dialogue: 2,${ConvertTimestamp(c[0])},${ConvertTimestamp(c[0] + duration)},${styleid},,0000,0000,0000,,{${styles.join('')}}${text}\n`;
}

// def ASSEscape(s):
//     def ReplaceLeadingSpace(s):
//         if len(s) == 0:
//             return s
//         if s[0] in (' ', '\t'):
//             s = '\u200b' + s
//         if s[-1] in (' ', '\t'):
//             s = s + '\u200b'
//         return s
//     return '\\N'.join((ReplaceLeadingSpace(i) or ' ' for i in str(s).replace('\\', '\\\u200b').replace('{', '\\{').replace('}', '\\}').split('\n')))
function ASSEscape(s: string) {
    function ReplaceLeadingSpace(s: string) {
        if (s.length === 0) {
            return s;
        }
        if ([' ', '\t'].includes(s[0])) {
            s = '\u200b' + s;
        }
        if ([' ', '\t'].includes(s[s.length - 1])) {
            s = s + '\u200b';
        }
        return s;
    }
    return s.toString().replace(/\\/g, '\\\u200b').replace(/{/g, '\\{').replace(/}/g, '\\}').split('\n').map(i => i.trimLeft()).join('\n');
}


// def CalculateLength(s):
//     return max(map(len, s.split('\n')))  # May not be accurate

function CalculateLength(s: string) {
    return Math.max(...s.split('\n').map(i => i.length));
}


// def ConvertTimestamp(timestamp):
//     timestamp = round(timestamp * 100.0)
//     hour, minute = divmod(timestamp, 360000)
//     minute, second = divmod(minute, 6000)
//     second, centsecond = divmod(second, 100)
//     return '%d:%02d:%02d.%02d' % (int(hour), int(minute), int(second), int(centsecond))

function ConvertTimestamp(timestamp: number) {
    timestamp = Math.round(timestamp * 100.0);
    const hour = Math.floor(timestamp / 360000);
    const minute = Math.floor((timestamp % 360000) / 6000);
    const second = Math.floor((timestamp % 6000) / 100);
    const centsecond = Math.floor(timestamp % 100);
    return `${hour}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}.${centsecond.toString().padStart(2, '0')}`;
}

// def ConvertColor(RGB, width=1280, height=576):
//     if RGB == 0x000000:
//         return '000000'
//     elif RGB == 0xffffff:
//         return 'FFFFFF'
//     R = (RGB >> 16) & 0xff
//     G = (RGB >> 8) & 0xff
//     B = RGB & 0xff
//     if width < 1280 and height < 576:
//         return '%02X%02X%02X' % (B, G, R)
//     else:  # VobSub always uses BT.601 colorspace, convert to BT.709
//         ClipByte = lambda x: 255 if x > 255 else 0 if x < 0 else round(x)
//         return '%02X%02X%02X' % (
//             ClipByte(R * 0.00956384088080656 + G * 0.03217254540203729 + B * 0.95826361371715607),
//             ClipByte(R * -0.10493933142075390 + G * 1.17231478191855154 + B * -0.06737545049779757),
//             ClipByte(R * 0.91348912373987645 + G * 0.07858536372532510 + B * 0.00792551253479842)
//         )
function ConvertColor(RGB: number, width: number, height: number) {
    if (RGB === 0x000000) {
        return '000000';
    }
    if (RGB === 0xffffff) {
        return 'FFFFFF';
    }
    const R = (RGB >> 16) & 0xff;
    const G = (RGB >> 8) & 0xff;
    const B = RGB & 0xff;
    if (width < 1280 && height < 576) {
        return `${B.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${R.toString(16).padStart(2, '0')}`;
    }
    const ClipByte = (x: number) => {
        if (x > 255) {
            return 255;
        }
        if (x < 0) {
            return 0;
        }
        return Math.round(x);
    }
    return `${ClipByte(R * 0.00956384088080656 + G * 0.03217254540203729 + B * 0.95826361371715607).toString(16).padStart(2, '0')}${ClipByte(R * -0.10493933142075390 + G * 1.17231478191855154 + B * -0.06737545049779757).toString(16).padStart(2, '0')}${ClipByte(R * 0.91348912373987645 + G * 0.07858536372532510 + B * 0.00792551253479842).toString(16).padStart(2, '0')}`;

}

function ConvertType2(row: number, height: number, bottomReserved: number) {
    return height - bottomReserved - row;
}

function FilterBadChars(f: any) {
    return f.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '\ufffd');
}

export function Danmaku2ASS(input_content: string, input_format: string, stage_width: number, stage_height: number, reserve_blank: number, font_face: string = 'sans-serif', font_size: number = 25.0, text_opacity: number = 1.0, duration_marquee: number = 5.0, duration_still: number = 5.0, is_reduce_comments: boolean) {
    const comments = ReadComments(input_content, input_format, font_size);
    return ProcessComments(
        comments, stage_width, stage_height, reserve_blank, font_face, font_size,
        text_opacity, duration_marquee, duration_still, is_reduce_comments
    );
}

function ReadComments(input_content: string, input_format: string, font_size: number) {
    const comments = [];
    let CommentProcessor: any;
    if (input_format === 'autodetect') {
        const format = ProbeCommentFormat(input_content);
        console.log('detect format', format);
        if (!format) {
            throw new Error(`Failed to detect comment file format`);
        }
        CommentProcessor = CommentFormatMap[format];
        if (!CommentProcessor) {
            throw new Error(`Failed to detect comment file format`);
        }
    } else {
        CommentProcessor = CommentFormatMap[input_format];
    }
    if (!CommentProcessor) {
        throw new Error(`Unknown comment file format: ${input_format}`);
    }
    const processed = CommentProcessor(FilterBadChars(input_content), font_size);
    comments.push(...processed);
    comments.sort();
    return comments;
}

