/*
 * Offline 256x256 PNG icon generator (no image libs): renders a monochrome,
 * transparent-background mark that fuses the two features —
 *   • a branching call tree (hierarchy), and
 *   • directional arrows + a read/write split (find references).
 * Drawn at 4x and box-downsampled for anti-aliasing, then PNG-encoded by hand
 * with Node's zlib. Output: icons/icon.png
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', 'icons', 'icon.png');
const SIZE = 256;
const SS = 4;
const BIG = SIZE * SS; // 1024
const buf = new Uint8Array(BIG * BIG * 4); // RGBA, transparent

const M = [0xcd, 0xd6, 0xe0]; // single monochrome tone

function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= BIG || y >= BIG || a <= 0) return;
  const i = (y * BIG + x) * 4;
  const sa = a / 255;
  const da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  buf[i] = Math.round((r * sa + buf[i] * da * (1 - sa)) / oa);
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

function disc(cx, cy, rad, col) {
  const r0 = Math.ceil(rad) + 1;
  for (let y = Math.floor(cy - r0); y <= Math.ceil(cy + r0); y++)
    for (let x = Math.floor(cx - r0); x <= Math.ceil(cx + r0); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad) blend(x, y, col[0], col[1], col[2], 255);
      else if (d <= rad + 1) blend(x, y, col[0], col[1], col[2], Math.round(255 * (rad + 1 - d)));
    }
}
function ring(cx, cy, rad, width, col) {
  const r0 = Math.ceil(rad + width) + 1;
  for (let y = Math.floor(cy - r0); y <= Math.ceil(cy + r0); y++)
    for (let x = Math.floor(cx - r0); x <= Math.ceil(cx + r0); x++) {
      const d = Math.abs(Math.hypot(x - cx, y - cy) - rad);
      if (d <= width) blend(x, y, col[0], col[1], col[2], 255);
      else if (d <= width + 1) blend(x, y, col[0], col[1], col[2], Math.round(255 * (width + 1 - d)));
    }
}
function segment(x0, y0, x1, y1, w, col) {
  const minx = Math.floor(Math.min(x0, x1) - w - 1), maxx = Math.ceil(Math.max(x0, x1) + w + 1);
  const miny = Math.floor(Math.min(y0, y1) - w - 1), maxy = Math.ceil(Math.max(y0, y1) + w + 1);
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = miny; y <= maxy; y++)
    for (let x = minx; x <= maxx; x++) {
      let t = ((x - x0) * dx + (y - y0) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x0 + t * dx, py = y0 + t * dy;
      const d = Math.hypot(x - px, y - py);
      if (d <= w) blend(x, y, col[0], col[1], col[2], 255);
      else if (d <= w + 1) blend(x, y, col[0], col[1], col[2], Math.round(255 * (w + 1 - d)));
    }
}
function tri(ax, ay, bx, by, cx, cy, col) {
  const minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
  const miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay) || 1;
  for (let y = miny; y <= maxy; y++)
    for (let x = minx; x <= maxx; x++) {
      const w0 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area;
      const w1 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) / area;
      const w2 = ((ax - cx) * (y - cy) - (ay - cy) * (x - cx)) / area;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) blend(x, y, col[0], col[1], col[2], 255);
    }
}
// arrowhead with its tip at (tx,ty), pointing along `ang`
function arrow(tx, ty, ang, size, col) {
  const back = size * 1.7;
  const bx = tx - Math.cos(ang) * back, by = ty - Math.sin(ang) * back;
  const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
  tri(tx, ty, bx + nx * size, by + ny * size, bx - nx * size, by - ny * size, col);
}
// an edge from p0 to p1 whose tip stops short of the target node, with an arrowhead
function edgeTo(x0, y0, x1, y1, nodeR, w, head, col) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const tipX = x1 - ux * nodeR, tipY = y1 - uy * nodeR;
  segment(x0 + ux * nodeR, y0 + uy * nodeR, tipX - ux * head * 1.2, tipY - uy * head * 1.2, w, col);
  arrow(tipX, tipY, Math.atan2(dy, dx), head, col);
}

// ---- Composition: caller -> root -> two callees (read / write) --------------
const W = BIG * 0.02;          // edge width
const HEAD = BIG * 0.05;       // arrowhead size
const NR = BIG * 0.075;        // node radius
const RW = BIG * 0.018;        // ring thickness

const caller = [BIG * 0.5, BIG * 0.13];
const root = [BIG * 0.5, BIG * 0.42];
const readN = [BIG * 0.235, BIG * 0.74];   // a "read" callee (hollow ring)
const writeN = [BIG * 0.765, BIG * 0.74];  // a "write" callee (filled)

// caller (incoming) flows DOWN into the root; root flows DOWN into the callees.
edgeTo(caller[0], caller[1], root[0], root[1], NR, W, HEAD, M);
edgeTo(root[0], root[1], readN[0], readN[1], NR, W, HEAD, M);
edgeTo(root[0], root[1], writeN[0], writeN[1], NR, W, HEAD, M);

// nodes
disc(caller[0], caller[1], NR * 0.62, M);          // caller (small filled)
ring(root[0], root[1], NR, RW, M);                 // the inspected function (focus ring)
disc(root[0], root[1], NR * 0.32, M);              //   with a centre dot
ring(readN[0], readN[1], NR * 0.82, RW, M);        // read  → hollow
disc(writeN[0], writeN[1], NR * 0.82, M);          // write → filled

// Downsample SSxSS -> SIZE
const out = new Uint8Array(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < SS; dy++)
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * BIG + (x * SS + dx)) * 4;
        r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; a += buf[i + 3];
      }
    const n = SS * SS;
    const o = (y * SIZE + x) * 4;
    out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
    out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n);
  }

// ---- PNG encode -----------------------------------------------------------
function crc32(b2) {
  let c = ~0;
  for (let i = 0; i < b2.length; i++) { c ^= b2[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE * 4; x++) raw[y * (SIZE * 4 + 1) + 1 + x] = out[y * SIZE * 4 + x];
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);
fs.writeFileSync(OUT, png);
console.log(`Wrote ${OUT} (${png.length} bytes, ${SIZE}x${SIZE}, monochrome/transparent)`);
