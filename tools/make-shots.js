/*
 * Generates Marketplace screenshots as PNGs by rendering hand-authored SVG
 * mockups of the VS Code panels with sharp. Output: assets/*.png
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.resolve(__dirname, '..', 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

const C = {
  bg: '#1e1e1e', side: '#252526', fg: '#cccccc', dim: '#858585', sect: '#bdbdbd',
  sel: '#04395e', selb: '#0a6ebd', inp: '#3c3c3c', focus: '#007fd4',
  func: '#c191e6', varc: '#75beff', green: '#8FC79F', red: '#E69595',
  yellow: '#D7BA1D', gray: '#9DA5B4', code: '#d4d4d4', kw: '#569cd6', cm: '#6a9955',
  gv: '#9cdcfe', findbg: 'rgba(234,163,77,0.28)', findbd: '#e9a34d',
};
const UI = 'Segoe UI, Helvetica Neue, Arial, sans-serif';
const MONO = 'Consolas, Menlo, monospace';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- icon glyphs (return SVG centered around x, vertical center cy) ----------
function icoFunc(x, cy) {
  return `<text x="${x}" y="${cy + 4}" font-family="${MONO}" font-size="13" font-weight="700" fill="${C.func}">ƒ</text>`;
}
function icoVar(x, cy) {
  return `<rect x="${x}" y="${cy - 5}" width="10" height="10" rx="2" fill="${C.varc}"/>`;
}
function icoFile(x, cy) {
  return `<g transform="translate(${x},${cy - 8})"><path d="M1 0h7l4 4v12H1z" fill="#8a9099"/><path d="M8 0v4h4z" fill="#6b7178"/></g>`;
}
function icoFolder(x, cy) {
  return `<path d="M${x} ${cy - 5}h5l1.6 1.6H${x + 15}V${cy + 6}H${x}z" fill="#c09553"/>`;
}
function chevron(x, cy, color, dir) {
  // dir 'in' = left arrow, 'out' = right arrow
  const d = dir === 'in'
    ? `M${x + 11} ${cy - 4} L${x + 5} ${cy} L${x + 11} ${cy + 4} M${x + 5} ${cy} H${x + 13}`
    : `M${x + 5} ${cy - 4} L${x + 11} ${cy} L${x + 5} ${cy + 4} M${x + 3} ${cy} H${x + 11}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function letter(x, cy, ch, color) {
  return `<text x="${x}" y="${cy + 4}" font-family="${UI}" font-size="13" fill="${color}">${ch}</text>`;
}
function tw(x, cy, open) {
  return `<text x="${x}" y="${cy + 4}" font-family="${UI}" font-size="9" fill="${C.dim}">${open ? '⌄' : '›'}</text>`;
}

function txt(x, cy, s, { fill = C.fg, size = 13, font = UI, weight = 400 } = {}) {
  return `<text x="${x}" y="${cy + 4}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(s)}</text>`;
}
function sectHead(x, y, s) {
  return `<text x="${x}" y="${y}" font-family="${UI}" font-size="11" font-weight="600" letter-spacing="0.5" fill="${C.sect}">${esc(s.toUpperCase())}</text>`;
}

async function render(name, w, h, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  await sharp(Buffer.from(svg), { density: 144 }).png().toFile(path.join(ASSETS, name));
  console.log('wrote assets/' + name);
}

// =================== HERO ===================
async function hero() {
  const w = 940, h = 422, ax = 46, sw = 340, sx = ax, ex = ax + sw;
  let s = '';
  s += `<rect width="${w}" height="${h}" fill="${C.bg}"/>`;
  // activity bar
  s += `<rect width="${ax}" height="${h}" fill="#333333"/>`;
  s += `<image x="9" y="10" width="28" height="28" href="data:image/png;base64,${ICON_B64}"/>`;
  s += `<rect x="0" y="9" width="2" height="30" fill="#ffffff"/>`;
  for (let i = 1; i < 4; i++) s += `<rect x="13" y="${52 + i * 30}" width="20" height="20" rx="3" fill="#525252"/>`;
  // sidebar
  s += `<rect x="${sx}" y="0" width="${sw}" height="${h}" fill="${C.side}"/>`;
  // filter pane
  s += sectHead(sx + 16, 24, 'Filter');
  s += `<rect x="${sx + 8}" y="32" width="${sw - 70}" height="24" rx="2" fill="${C.inp}" stroke="${C.focus}"/>`;
  s += txt(sx + 15, 44, 'bus', { size: 12 });
  s += `<rect x="${sx + sw - 56}" y="32" width="48" height="24" rx="2" fill="#313131" stroke="#444"/>`;
  s += txt(sx + sw - 48, 44, 'Clear', { size: 12, fill: C.fg });
  // chips
  const chy = 72;
  s += txt(sx + 12, chy, 'refs:', { size: 11, fill: C.dim });
  const chips = [['w', C.red], ['r', C.green], ['d', C.yellow], ['·', C.gray]];
  chips.forEach(([ch, col], i) => {
    const cx = sx + 48 + i * 24;
    s += `<rect x="${cx}" y="${chy - 11}" width="18" height="18" rx="3" fill="none" stroke="${col}"/>`;
    s += `<text x="${cx + 9}" y="${chy + 4}" text-anchor="middle" font-family="${UI}" font-size="12" fill="${col}">${ch}</text>`;
  });
  s += `<line x1="${sx}" y1="92" x2="${ex}" y2="92" stroke="#1b1b1b"/>`;
  // call hierarchy (single direction, toggled)
  s += sectHead(sx + 16, 114, 'Call Hierarchy · bus_write');
  // direction toggle glyph + subtitle
  s += chevron(ex - 30, 110, C.dim, 'in');
  s += chevron(ex - 22, 110, C.dim, 'out');
  s += txt(sx + 16, 130, 'callers (incoming)', { fill: C.dim, size: 11 });
  const rows = [
    { ind: 8, tw: 1, ic: icoFunc, nm: 'bus_write', col: C.func, desc: '(int reg, int val) · src/bus.c', sel: 1 },
    { ind: 30, tw: 1, ic: icoFunc, nm: 'hal0_f0', col: C.func, desc: '(int x) · src/hal_0.c' },
    { ind: 30, tw: 1, ic: icoFunc, nm: 'drv3_f5', col: C.func, desc: '(int x) · src/drv_3.c' },
    { ind: 30, tw: 0, ic: icoFunc, nm: 'dispatch', col: C.func, desc: '×3 · (int ev) · src/app.c' },
    { ind: 30, tw: 1, ic: icoFunc, nm: 'init_all', col: C.func, desc: '(void) · src/app.c' },
    { ind: 30, tw: 1, ic: icoFunc, nm: 'svc2_f7', col: C.func, desc: '(int x) · src/svc_2.c' },
  ];
  let y = 142;
  const lh = 24;
  rows.forEach((r) => {
    const cy = y + lh / 2;
    if (r.sel) {
      s += `<rect x="${sx}" y="${y}" width="${sw}" height="${lh}" fill="${C.sel}"/>`;
      s += `<rect x="${sx}" y="${y}" width="${sw}" height="${lh}" fill="none" stroke="${C.selb}"/>`;
    }
    let ix = sx + r.ind;
    if (r.tw === 1 || r.tw === 0) { s += tw(ix, cy, r.tw === 1); }
    ix += 16;
    if (r.ic) s += r.ic(ix, cy);
    else if (r.ch) s += chevron(ix - 2, cy, C.green, r.ch);
    ix += 20;
    s += txt(ix, cy, r.nm, { fill: r.col || C.fg });
    if (r.desc) s += txt(ix + r.nm.length * 7.2 + 10, cy, r.desc, { fill: C.dim, size: 11 });
    y += lh;
  });
  // editor
  s += `<rect x="${ex}" y="0" width="${w - ex}" height="${h}" fill="${C.bg}"/>`;
  s += txt(ex + 18, 26, 'bus.c — src', { fill: C.dim, size: 12 });
  const code = [
    [['void ', C.kw], ['bus_write', '#dcdcaa'], ['(int reg, int val) {', C.code]],
    [['    g_bus', C.gv], ['[reg & (BUS_REGS - 1)] = val;   ', C.code], ['/* write */', C.cm]],
    [['    g_writes', C.gv, 'flash'], ['++;                          ', C.code], ['/* write */', C.cm]],
    [['}', C.code]],
  ];
  let ey = 60;
  code.forEach((line, li) => {
    const cy = ey + 9;
    s += `<text x="${ex + 18}" y="${cy}" font-family="${MONO}" font-size="13" fill="#6a6a6a">${10 + li}</text>`;
    let cx = ex + 48;
    line.forEach((seg) => {
      const [t, col, fx] = seg;
      const wpx = t.length * 7.5;
      if (fx === 'flash') {
        s += `<rect x="${cx - 1}" y="${cy - 12}" width="${('g_writes').length * 7.5 + 2}" height="17" rx="2" fill="${C.findbg}" stroke="${C.findbd}"/>`;
      }
      s += `<text x="${cx}" y="${cy}" font-family="${MONO}" font-size="13" fill="${col}" xml:space="preserve">${esc(t)}</text>`;
      cx += wpx;
    });
    ey += 22;
  });
  s += txt(ex + 18, ey + 24, 'Click a node → the call site is selected, centered and flashed.', { fill: C.dim, size: 12 });
  await render('hero.png', w, h, s);
}

// =================== REFERENCES ===================
async function references() {
  const w = 430, h = 392, sw = 430;
  let s = `<rect width="${w}" height="${h}" fill="${C.side}"/>`;
  s += sectHead(16, 22, 'Filter');
  s += `<rect x="8" y="30" width="${sw - 70}" height="24" rx="2" fill="${C.inp}" stroke="${C.focus}"/>`;
  s += txt(15, 42, 'g_state', { size: 12 });
  s += `<rect x="${sw - 56}" y="30" width="48" height="24" rx="2" fill="#313131" stroke="#444"/>`;
  s += txt(sw - 48, 42, 'Clear', { size: 12 });
  const chy = 70; s += txt(12, chy, 'refs:', { size: 11, fill: C.dim });
  const chips = [['w', C.red, 1], ['r', C.green, 1], ['d', C.yellow, 1], ['·', C.gray, 0]];
  chips.forEach(([ch, col, on], i) => {
    const cx = 48 + i * 24;
    s += `<rect x="${cx}" y="${chy - 11}" width="18" height="18" rx="3" fill="none" stroke="${col}" opacity="${on ? 1 : 0.3}"/>`;
    s += `<text x="${cx + 9}" y="${chy + 4}" text-anchor="middle" font-family="${UI}" font-size="12" fill="${col}" opacity="${on ? 1 : 0.3}">${ch}</text>`;
  });
  s += `<line x1="0" y1="90" x2="${w}" y2="90" stroke="#1b1b1b"/>`;
  s += sectHead(16, 112, 'References');
  s += txt(18, 128, 'g_state · 9 refs in 3 files · 4w 4r 1d', { fill: C.dim, size: 11 });
  const rows = [
    { ind: 8, tw: 1, ic: icoFolder, nm: 'src', desc: '9 refs' },
    { ind: 30, tw: 1, ic: icoFile, nm: 'bus.c', desc: '2 refs' },
    { ind: 54, let: ['d', C.yellow], code: 'int g_state;', desc: ':5:5' },
    { ind: 30, tw: 1, ic: icoFile, nm: 'state.c', desc: '7 refs' },
    { ind: 54, let: ['w', C.red], code: 'g_events[ev & 31] = ', hl: 'g_state', tail: ';' },
    { ind: 54, let: ['r', C.green], code: 'if (', hl: 'g_state', tail: ' > 100) {' },
    { ind: 54, let: ['w', C.red], code: '', hl: 'g_state', tail: ' = 0;', sel: 1 },
    { ind: 54, let: ['r', C.green], code: '', hl: 'g_state', tail: ' += cfg_get_mode();' },
  ];
  let y = 138; const lh = 24;
  rows.forEach((r) => {
    const cy = y + lh / 2;
    if (r.sel) { s += `<rect x="0" y="${y}" width="${w}" height="${lh}" fill="${C.sel}"/><rect x="0" y="${y}" width="${w}" height="${lh}" fill="none" stroke="${C.selb}"/>`; }
    let ix = r.ind;
    if (r.tw) { s += tw(ix, cy, true); } ix += 16;
    if (r.ic) { s += r.ic(ix, cy); ix += 20; s += txt(ix, cy, r.nm, { fill: C.fg }); s += txt(ix + r.nm.length * 7.2 + 10, cy, r.desc, { fill: C.dim, size: 11 }); }
    else if (r.let) {
      s += letter(ix, cy, r.let[0], r.let[1]); ix += 18;
      let cx = ix;
      if (r.code) { s += `<text x="${cx}" y="${cy + 4}" font-family="${MONO}" font-size="12" fill="#cfcfcf" xml:space="preserve">${esc(r.code)}</text>`; cx += r.code.length * 6.6; }
      if (r.hl) {
        s += `<rect x="${cx - 1}" y="${cy - 8}" width="${r.hl.length * 6.6 + 2}" height="16" rx="2" fill="rgba(120,160,255,0.20)"/>`;
        s += `<text x="${cx}" y="${cy + 4}" font-family="${MONO}" font-size="12" fill="#ffffff" xml:space="preserve">${esc(r.hl)}</text>`; cx += r.hl.length * 6.6;
      }
      if (r.tail) s += `<text x="${cx}" y="${cy + 4}" font-family="${MONO}" font-size="12" fill="#cfcfcf" xml:space="preserve">${esc(r.tail)}</text>`;
      if (r.desc) s += txt(ix + 120, cy, r.desc, { fill: C.dim, size: 11 });
    }
    y += lh;
  });
  await render('references.png', w, h, s);
}

// =================== INCLUDES ===================
async function includes() {
  const w = 400, h = 320, sw = 400;
  let s = `<rect width="${w}" height="${h}" fill="${C.side}"/>`;
  s += sectHead(16, 22, 'Header Includes');
  s += txt(18, 40, 'app.h — includes', { fill: C.dim, size: 11 });
  const rows = [
    { ind: 8, tw: 1, nm: 'app.h', sel: 1 },
    { ind: 30, tw: 1, nm: 'svc_0.h', desc: 'include' },
    { ind: 52, tw: 1, nm: 'drv_0.h', desc: 'include' },
    { ind: 74, tw: 1, nm: 'hal_0.h', desc: 'include' },
    { ind: 96, tw: 1, nm: 'bus.h', desc: 'include' },
    { ind: 118, tw: -1, nm: 'common.h', desc: 'include' },
    { ind: 74, tw: -1, nm: 'util.h', desc: 'include' },
    { ind: 30, tw: -1, unres: 1, nm: 'stdint.h', desc: '<unresolved>' },
  ];
  let y = 50; const lh = 24;
  rows.forEach((r) => {
    const cy = y + lh / 2;
    if (r.sel) { s += `<rect x="0" y="${y}" width="${w}" height="${lh}" fill="${C.sel}"/><rect x="0" y="${y}" width="${w}" height="${lh}" fill="none" stroke="${C.selb}"/>`; }
    let ix = r.ind;
    if (r.tw === 1) s += tw(ix, cy, true);
    ix += 16;
    if (r.unres) { s += `<text x="${ix + 4}" y="${cy + 4}" font-family="${UI}" font-size="12" fill="${C.gray}">?</text>`; ix += 18; }
    else { s += icoFile(ix, cy); ix += 20; }
    s += txt(ix, cy, r.nm, { fill: r.unres ? C.dim : C.fg });
    if (r.desc) s += txt(ix + r.nm.length * 7.2 + 10, cy, r.desc, { fill: r.unres ? C.gray : C.dim, size: 11 });
    y += lh;
  });
  await render('includes.png', w, h, s);
}

const ICON_B64 = fs.readFileSync(path.resolve(__dirname, '..', 'icons', 'icon.png')).toString('base64');
(async () => { await hero(); await references(); await includes(); })();
