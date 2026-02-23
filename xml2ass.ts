// adapted from https://github.com/m13253/danmaku2ass

import { JSDOM } from 'jsdom';

// Comment tuple: [timeline, timestamp, no, comment, pos, color, size, height, width]
// pos: 0=marquee(right-to-left), 1=bottom, 2=top, 3=marquee(left-to-right), 'bilipos'=positioned
type Comment = [number, number, number, string, number | 'bilipos', number, number, number, number];

function calculateLength(s: string): number {
    return Math.max(...s.split('\n').map(l => l.length));
}

function readCommentsBilibili(xmlContent: string, fontsize: number): Comment[] {
    const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
    const doc = dom.window.document;
    const comments: Comment[] = [];
    const elements = doc.getElementsByTagName('d');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        try {
            const p = (el.getAttribute('p') || '').split(',');
            if (p.length < 5) continue;
            if (!['1', '4', '5', '6', '7', '8'].includes(p[1])) continue;
            if (!el.childNodes.length) continue;
            if (['1', '4', '5', '6'].includes(p[1])) {
                const c = (el.childNodes[0].textContent || '').replace(/\/n/g, '\n');
                const size = parseInt(p[2]) * fontsize / 25.0;
                const posMap: Record<string, number> = { '1': 0, '4': 2, '5': 1, '6': 3 };
                comments.push([
                    parseFloat(p[0]), parseInt(p[4]), i, c,
                    posMap[p[1]], parseInt(p[3]), size,
                    (c.split('\n').length) * size,
                    calculateLength(c) * size,
                ]);
            } else if (p[1] === '7') {
                const c = el.childNodes[0].textContent || '';
                comments.push([
                    parseFloat(p[0]), parseInt(p[4]), i, c,
                    'bilipos', parseInt(p[3]), parseInt(p[2]), 0, 0,
                ]);
            }
            // p[1] === '8': scripted comment, ignore
        } catch {
            continue;
        }
    }
    return comments;
}

function assEscape(s: string): string {
    function replaceLeadingSpace(s: string): string {
        if (s.length === 0) return s;
        if (s[0] === ' ' || s[0] === '\t') s = '\u200b' + s;
        if (s[s.length - 1] === ' ' || s[s.length - 1] === '\t') s = s + '\u200b';
        return s;
    }
    return s
        .replace(/\\/g, '\\\u200b')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .split('\n')
        .map(i => replaceLeadingSpace(i) || ' ')
        .join('\\N');
}

function convertTimestamp(timestamp: number): string {
    let ts = Math.round(timestamp * 100.0);
    const hour = Math.floor(ts / 360000);
    ts %= 360000;
    const minute = Math.floor(ts / 6000);
    ts %= 6000;
    const second = Math.floor(ts / 100);
    const centsecond = ts % 100;
    return `${hour}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(centsecond).padStart(2, '0')}`;
}

function convertColor(RGB: number): string {
    if (RGB === 0x000000) return '000000';
    if (RGB === 0xffffff) return 'FFFFFF';
    const R = (RGB >> 16) & 0xff;
    const G = (RGB >> 8) & 0xff;
    const B = RGB & 0xff;
    // BT.601 -> BT.709 conversion for >= 1280x576
    const clip = (x: number) => x > 255 ? 255 : x < 0 ? 0 : Math.round(x);
    return [
        clip(R * 0.00956384088080656 + G * 0.03217254540203729 + B * 0.95826361371715607),
        clip(R * -0.10493933142075390 + G * 1.17231478191855154 + B * -0.06737545049779757),
        clip(R * 0.91348912373987645 + G * 0.07858536372532510 + B * 0.00792551253479842),
    ].map(v => v.toString(16).toUpperCase().padStart(2, '0')).join('');
}

function convertType2(row: number, height: number, bottomReserved: number): number {
    return height - bottomReserved - row;
}

function getZoomFactor(sourceSize: [number, number], targetSize: [number, number]): [number, number, number] {
    try {
        const sourceAspect = sourceSize[0] / sourceSize[1];
        const targetAspect = targetSize[0] / targetSize[1];
        if (targetAspect < sourceAspect) {
            const scale = targetSize[0] / sourceSize[0];
            return [scale, 0, (targetSize[1] - targetSize[0] / sourceAspect) / 2];
        } else if (targetAspect > sourceAspect) {
            const scale = targetSize[1] / sourceSize[1];
            return [scale, (targetSize[0] - targetSize[1] * sourceAspect) / 2, 0];
        } else {
            return [targetSize[0] / sourceSize[0], 0, 0];
        }
    } catch {
        return [1, 0, 0];
    }
}

function convertFlashRotation(rotY: number, rotZ: number, X: number, Y: number, width: number, height: number): [number, number, number, number, number, number, number] {
    const wrapAngle = (deg: number) => 180 - ((180 - deg) % 360 + 360) % 360;
    rotY = wrapAngle(rotY);
    rotZ = wrapAngle(rotZ);
    if (rotY === 90 || rotY === -90) rotY -= 1;
    let outX: number, outY: number, outZ: number;
    if (rotY === 0 || rotZ === 0) {
        outX = 0;
        outY = -rotY;
        outZ = -rotZ;
        rotY *= Math.PI / 180.0;
        rotZ *= Math.PI / 180.0;
    } else {
        rotY *= Math.PI / 180.0;
        rotZ *= Math.PI / 180.0;
        outY = Math.atan2(-Math.sin(rotY) * Math.cos(rotZ), Math.cos(rotY)) * 180 / Math.PI;
        outZ = Math.atan2(-Math.cos(rotY) * Math.sin(rotZ), Math.cos(rotZ)) * 180 / Math.PI;
        outX = Math.asin(Math.sin(rotY) * Math.sin(rotZ)) * 180 / Math.PI;
    }
    let trX = (X * Math.cos(rotZ) + Y * Math.sin(rotZ)) / Math.cos(rotY) + (1 - Math.cos(rotZ) / Math.cos(rotY)) * width / 2 - Math.sin(rotZ) / Math.cos(rotY) * height / 2;
    let trY = Y * Math.cos(rotZ) - X * Math.sin(rotZ) + Math.sin(rotZ) * width / 2 + (1 - Math.cos(rotZ)) * height / 2;
    const trZ = (trX - width / 2) * Math.sin(rotY);
    const FOV = width * Math.tan(2 * Math.PI / 9.0) / 2;
    let scaleXY: number;
    if (FOV + trZ === 0) {
        scaleXY = 1;
    } else {
        scaleXY = FOV / (FOV + trZ);
    }
    trX = (trX - width / 2) * scaleXY + width / 2;
    trY = (trY - height / 2) * scaleXY + height / 2;
    if (scaleXY < 0) {
        scaleXY = -scaleXY;
        outX += 180;
        outY += 180;
    }
    return [trX, trY, wrapAngle(outX), wrapAngle(outY), wrapAngle(outZ), scaleXY * 100, scaleXY * 100];
}

class SafeList<T> extends Array<T> {
    get(index: number, defaultVal?: T): T | undefined {
        return index < this.length ? this[index] : defaultVal;
    }
    static from_array<T>(arr: T[]): SafeList<T> {
        const l = new SafeList<T>();
        l.push(...arr);
        return l;
    }
}

function writeCommentBilibiliPositioned(lines: string[], c: Comment, width: number, height: number, styleid: string) {
    const BiliPlayerSize: [number, number] = [672, 438];
    const zf = getZoomFactor(BiliPlayerSize, [width, height]);

    function getPosition(inputPos: number | string, isHeight: boolean): number {
        const idx = isHeight ? 1 : 0;
        let pos: number;
        if (typeof inputPos === 'string') {
            pos = inputPos.includes('.') ? parseFloat(inputPos) : parseInt(inputPos);
        } else {
            pos = inputPos;
        }
        if (Number.isInteger(pos)) {
            return zf[0] * pos + zf[idx + 1];
        } else {
            if (pos > 1) {
                return zf[0] * pos + zf[idx + 1];
            } else {
                return BiliPlayerSize[idx] * zf[0] * pos + zf[idx + 1];
            }
        }
    }

    try {
        const commentArgs = SafeList.from_array(JSON.parse(c[3] as string));
        const text = assEscape(String(commentArgs.get(4, '') as string).replace(/\/n/g, '\n'));
        let fromX = commentArgs.get(0, 0) as number;
        let fromY = commentArgs.get(1, 0) as number;
        let toX = commentArgs.get(7, fromX) as number;
        let toY = commentArgs.get(8, fromY) as number;
        fromX = getPosition(fromX, false);
        fromY = getPosition(fromY, true);
        toX = getPosition(toX, false);
        toY = getPosition(toY, true);
        const alphaStr = SafeList.from_array(String(commentArgs.get(2, '1')).split('-'));
        let fromAlpha = parseFloat(alphaStr.get(0, '1') as string);
        let toAlpha = parseFloat(alphaStr.get(1, String(fromAlpha)) as string);
        fromAlpha = 255 - Math.round(fromAlpha * 255);
        toAlpha = 255 - Math.round(toAlpha * 255);
        const rotateZ = parseInt(String(commentArgs.get(5, 0)));
        const rotateY = parseInt(String(commentArgs.get(6, 0)));
        const lifetime = parseFloat(String(commentArgs.get(3, 4500)));
        const duration = parseInt(String(commentArgs.get(9, lifetime * 1000)));
        const delay = parseInt(String(commentArgs.get(10, 0)));
        const fontface = commentArgs.get(12) as string | undefined;
        const isborder = commentArgs.get(11, 'true');
        const fromRotarg = convertFlashRotation(rotateY, rotateZ, fromX, fromY, width, height);
        const toRotarg = convertFlashRotation(rotateY, rotateZ, toX, toY, width, height);
        const styles: string[] = [`\\org(${Math.floor(width / 2)}, ${Math.floor(height / 2)})`];
        if (fromRotarg[0] === toRotarg[0] && fromRotarg[1] === toRotarg[1]) {
            styles.push(`\\pos(${Math.round(fromRotarg[0])}, ${Math.round(fromRotarg[1])})`);
        } else {
            styles.push(`\\move(${Math.round(fromRotarg[0])}, ${Math.round(fromRotarg[1])}, ${Math.round(toRotarg[0])}, ${Math.round(toRotarg[1])}, ${Math.round(delay)}, ${Math.round(delay + duration)})`);
        }
        styles.push(`\\frx${Math.round(fromRotarg[2])}\\fry${Math.round(fromRotarg[3])}\\frz${Math.round(fromRotarg[4])}\\fscx${Math.round(fromRotarg[5])}\\fscy${Math.round(fromRotarg[6])}`);
        if (fromX !== toX || fromY !== toY) {
            styles.push(`\\t(${Math.round(delay)}, ${Math.round(delay + duration)}, `);
            styles.push(`\\frx${Math.round(toRotarg[2])}\\fry${Math.round(toRotarg[3])}\\frz${Math.round(toRotarg[4])}\\fscx${Math.round(toRotarg[5])}\\fscy${Math.round(toRotarg[6])}`);
            styles.push(')');
        }
        if (fontface) {
            styles.push(`\\fn${assEscape(fontface)}`);
        }
        styles.push(`\\fs${Math.round(c[6] * zf[0])}`);
        if (c[5] !== 0xffffff) {
            styles.push(`\\c&H${convertColor(c[5])}&`);
            if (c[5] === 0x000000) {
                styles.push('\\3c&HFFFFFF&');
            }
        }
        if (fromAlpha === toAlpha) {
            styles.push(`\\alpha&H${fromAlpha.toString(16).toUpperCase().padStart(2, '0')}`);
        } else if (fromAlpha === 255 && toAlpha === 0) {
            styles.push(`\\fad(${Math.round(lifetime * 1000)},0)`);
        } else if (fromAlpha === 0 && toAlpha === 255) {
            styles.push(`\\fad(0, ${Math.round(lifetime * 1000)})`);
        } else {
            const endTime = Math.round(lifetime * 1000);
            styles.push(`\\fade(${fromAlpha}, ${toAlpha}, ${toAlpha}, 0, ${endTime}, ${endTime}, ${endTime})`);
        }
        if (isborder === 'false') {
            styles.push('\\bord0');
        }
        lines.push(`Dialogue: -1,${convertTimestamp(c[0])},${convertTimestamp(c[0] + lifetime)},${styleid},,0,0,0,,{${styles.join('')}}${text}`);
    } catch {
        // Invalid positioned comment, skip
    }
}

function testFreeRows(rows: (Comment | null)[][], c: Comment, row: number, width: number, height: number, bottomReserved: number, durationMarquee: number, durationStill: number): number {
    let res = 0;
    const rowmax = height - bottomReserved;
    let targetRow: Comment | null = null;
    const pos = c[4] as number;
    if (pos === 1 || pos === 2) {
        while (row < rowmax && res < c[7]) {
            if (targetRow !== rows[pos][row]) {
                targetRow = rows[pos][row];
                if (targetRow && targetRow[0] + durationStill > c[0]) break;
            }
            row++;
            res++;
        }
    } else {
        let thresholdTime: number;
        try {
            thresholdTime = c[0] - durationMarquee * (1 - width / (c[8] + width));
        } catch {
            thresholdTime = c[0] - durationMarquee;
        }
        while (row < rowmax && res < c[7]) {
            if (targetRow !== rows[pos][row]) {
                targetRow = rows[pos][row];
                if (targetRow) {
                    const tw = targetRow[8] + width;
                    if (tw !== 0 && (targetRow[0] > thresholdTime || targetRow[0] + targetRow[8] * durationMarquee / tw > c[0])) {
                        break;
                    }
                }
            }
            row++;
            res++;
        }
    }
    return res;
}

function findAlternativeRow(rows: (Comment | null)[][], c: Comment, height: number, bottomReserved: number): number {
    let res = 0;
    const pos = c[4] as number;
    for (let row = 0; row < height - bottomReserved - Math.ceil(c[7]); row++) {
        if (!rows[pos][row]) return row;
        if (rows[pos][row]![0] < rows[pos][res]![0]) res = row;
    }
    return res;
}

function markCommentRow(rows: (Comment | null)[][], c: Comment, row: number) {
    const pos = c[4] as number;
    for (let i = row; i < row + Math.ceil(c[7]); i++) {
        if (i < rows[pos].length) rows[pos][i] = c;
    }
}

function writeComment(lines: string[], c: Comment, row: number, width: number, height: number, bottomReserved: number, fontsize: number, durationMarquee: number, durationStill: number, styleid: string) {
    const text = assEscape(c[3] as string);
    const styles: string[] = [];
    let duration: number;
    if (c[4] === 1) {
        styles.push(`\\an8\\pos(${Math.floor(width / 2)}, ${row})`);
        duration = durationStill;
    } else if (c[4] === 2) {
        styles.push(`\\an2\\pos(${Math.floor(width / 2)}, ${convertType2(row, height, bottomReserved)})`);
        duration = durationStill;
    } else if (c[4] === 3) {
        styles.push(`\\move(${-Math.ceil(c[8])}, ${row}, ${width}, ${row})`);
        duration = durationMarquee;
    } else {
        styles.push(`\\move(${width}, ${row}, ${-Math.ceil(c[8])}, ${row})`);
        duration = durationMarquee;
    }
    if (!(c[6] - fontsize > -1 && c[6] - fontsize < 1)) {
        styles.push(`\\fs${Math.round(c[6])}`);
    }
    if (c[5] !== 0xffffff) {
        styles.push(`\\c&H${convertColor(c[5])}&`);
        if (c[5] === 0x000000) {
            styles.push('\\3c&HFFFFFF&');
        }
    }
    lines.push(`Dialogue: 2,${convertTimestamp(c[0])},${convertTimestamp(c[0] + duration)},${styleid},,0000,0000,0000,,{${styles.join('')}}${text}`);
}

function writeASSHead(width: number, height: number, fontface: string, fontsize: number, alpha: number, styleid: string): string {
    const a = 255 - Math.round(alpha * 255);
    const outline = Math.max(fontsize / 25.0, 1);
    const aHex = a.toString(16).toUpperCase().padStart(2, '0');
    return `\ufeff[Script Info]
; Script generated by Danmaku2ASS (with pakku.js)
; https://github.com/undefined-moe/pakku.js
Script Updated By: Danmaku2ASS-with-pakku (https://github.com/undefined-moe/pakku.js)
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
Style: ${styleid}, ${fontface}, ${Math.round(fontsize)}, &H${aHex}FFFFFF, &H${aHex}FFFFFF, &H${aHex}000000, &H${aHex}000000, 0, 0, 0, 0, 100, 100, 0.00, 0.00, 1, ${Math.round(outline)}, 0, 7, 0, 0, 0, 0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

function processComments(comments: Comment[], width: number, height: number, bottomReserved: number, fontface: string, fontsize: number, alpha: number, durationMarquee: number, durationStill: number, reduced: boolean): string {
    const styleid = `Danmaku2ASS_${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}`;
    const head = writeASSHead(width, height, fontface, fontsize, alpha, styleid);
    const lines: string[] = [];
    const rows: (Comment | null)[][] = Array.from({ length: 4 }, () => new Array(height - bottomReserved + 1).fill(null));

    for (const c of comments) {
        if (typeof c[4] === 'number') {
            let row = 0;
            const rowmax = height - bottomReserved - c[7];
            let placed = false;
            while (row <= rowmax) {
                const freerows = testFreeRows(rows, c, row, width, height, bottomReserved, durationMarquee, durationStill);
                if (freerows >= c[7]) {
                    markCommentRow(rows, c, row);
                    writeComment(lines, c, row, width, height, bottomReserved, fontsize, durationMarquee, durationStill, styleid);
                    placed = true;
                    break;
                } else {
                    row += freerows || 1;
                }
            }
            if (!placed && !reduced) {
                row = findAlternativeRow(rows, c, height, bottomReserved);
                markCommentRow(rows, c, row);
                writeComment(lines, c, row, width, height, bottomReserved, fontsize, durationMarquee, durationStill, styleid);
            }
        } else if (c[4] === 'bilipos') {
            writeCommentBilibiliPositioned(lines, c, width, height, styleid);
        }
    }
    return head + lines.join('\r\n') + '\r\n';
}

export interface Danmaku2ASSOptions {
    width: number;
    height: number;
    fontFace?: string;
    fontSize?: number;
    alpha?: number;
    durationMarquee?: number;
    durationStill?: number;
    bottomReserved?: number;
    reduced?: boolean;
}

export function danmaku2ass(xmlContent: string, options: Danmaku2ASSOptions): string {
    const {
        width, height,
        fontFace = 'sans-serif',
        fontSize = 25.0,
        alpha = 1.0,
        durationMarquee = 5.0,
        durationStill = 5.0,
        bottomReserved = 0,
        reduced = false,
    } = options;

    const comments = readCommentsBilibili(xmlContent, fontSize);
    comments.sort((a, b) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        return 0;
    });
    return processComments(comments, width, height, bottomReserved, fontFace, fontSize, alpha, durationMarquee, durationStill, reduced);
}
