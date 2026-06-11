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

// =================== HERO (realistic VS Code window) ===================
async function hero() {
  const W = 1180, H = 720;
  const mx = 30, my = 26;
  const wx = mx, wy = my, ww = W - mx * 2, wh = H - my * 2;
  const R = 12, TB = 40, SB = 26, AX = 52, SW = 372;
  const bodyY = wy + TB, bodyH = wh - TB - SB;
  const sx = wx + AX, ex = sx + SW, eW = wx + ww - ex;
  const CW = 7.7; // mono char width @ 13.5px

  let s = '';
  s += `<defs>`;
  s += `<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>`;
  s += `<clipPath id="win"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${R}"/></clipPath>`;
  s += `</defs>`;

  // floating window: soft drop shadow + body
  s += `<rect x="${wx}" y="${wy + 16}" width="${ww}" height="${wh}" rx="${R}" fill="#000000" opacity="0.5" filter="url(#blur)"/>`;
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${R}" fill="${C.bg}"/>`;
  s += `<g clip-path="url(#win)">`;

  // ---- title bar ----
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${TB}" fill="#323233"/>`;
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([col, i]) => {
    s += `<circle cx="${wx + 22 + i * 20}" cy="${wy + TB / 2}" r="6" fill="${col}"/>`;
  });
  s += `<text x="${wx + ww / 2}" y="${wy + TB / 2 + 4}" text-anchor="middle" font-family="${UI}" font-size="12.5" fill="#cfcfcf" opacity="0.8">bus.c — example-large</text>`;

  // ---- activity bar ----
  s += `<rect x="${wx}" y="${bodyY}" width="${AX}" height="${bodyH}" fill="#2c2c2c"/>`;
  s += `<rect x="${wx}" y="${bodyY + 10}" width="2.5" height="34" fill="#ffffff"/>`;
  s += `<image x="${wx + 11}" y="${bodyY + 11}" width="30" height="30" href="data:image/png;base64,${ICON_B64}"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<rect x="${wx + 16}" y="${bodyY + 62 + i * 34}" width="20" height="20" rx="3" fill="none" stroke="#6e6e6e" stroke-width="1.6"/>`;
  }

  // ---- sidebar ----
  s += `<rect x="${sx}" y="${bodyY}" width="${SW}" height="${bodyH}" fill="${C.side}"/>`;
  s += sectHead(sx + 16, bodyY + 24, 'Filter');
  s += `<rect x="${sx + 10}" y="${bodyY + 34}" width="${SW - 84}" height="26" rx="3" fill="${C.inp}" stroke="${C.focus}"/>`;
  s += txt(sx + 17, bodyY + 47, 'bus', { size: 12.5 });
  s += `<rect x="${sx + SW - 66}" y="${bodyY + 34}" width="54" height="26" rx="3" fill="#313131" stroke="#454545"/>`;
  s += txt(sx + SW - 55, bodyY + 47, 'Clear', { size: 12 });
  const chy = bodyY + 80;
  s += txt(sx + 14, chy, 'refs:', { size: 11, fill: C.dim });
  [['w', C.red], ['r', C.green], ['d', C.yellow], ['·', C.gray]].forEach(([ch, col], i) => {
    const cx = sx + 52 + i * 26;
    s += `<rect x="${cx}" y="${chy - 12}" width="20" height="20" rx="4" fill="none" stroke="${col}"/>`;
    s += `<text x="${cx + 10}" y="${chy + 4}" text-anchor="middle" font-family="${UI}" font-size="12.5" fill="${col}">${ch}</text>`;
  });
  s += `<line x1="${sx}" y1="${chy + 18}" x2="${ex}" y2="${chy + 18}" stroke="${C.border}"/>`;
  const chT = chy + 18;
  s += sectHead(sx + 16, chT + 24, 'Call Hierarchy: bus_write');
  s += chevron(ex - 38, chT + 20, C.dim, 'in');
  s += chevron(ex - 27, chT + 20, C.dim, 'out');
  s += txt(sx + 16, chT + 42, 'callers (incoming)', { fill: C.dim, size: 11 });
  const rows = [
    { ind: 8, tw: 1, nm: 'bus_write', desc: '(int reg, int val) · src/bus.c', sel: 1, hl: [0, 3] },
    { ind: 30, tw: 1, nm: 'hal0_f0', desc: '(int x) · src/hal_0.c' },
    { ind: 30, tw: 1, nm: 'drv3_f5', desc: '(int x) · src/drv_3.c' },
    { ind: 30, tw: 0, nm: 'dispatch', desc: '×3 · (int ev) · src/app.c' },
    { ind: 30, tw: 1, nm: 'init_all', desc: '(void) · src/app.c' },
    { ind: 30, tw: 1, nm: 'svc2_f7', desc: '(int x) · src/svc_2.c' },
  ];
  let y = chT + 54;
  const lh = 27;
  rows.forEach((r) => {
    const cy = y + lh / 2;
    if (r.sel) {
      s += `<rect x="${sx}" y="${y}" width="${SW}" height="${lh}" fill="${C.sel}"/>`;
      s += `<rect x="${sx + 0.5}" y="${y + 0.5}" width="${SW - 1}" height="${lh - 1}" fill="none" stroke="${C.selb}"/>`;
    }
    let ix = sx + r.ind;
    if (r.tw === 1 || r.tw === 0) s += tw(ix, cy, r.tw === 1);
    ix += 16;
    s += icoFunc(ix, cy);
    ix += 20;
    if (r.hl) {
      const midX = ix + r.nm.slice(0, r.hl[0]).length * 7.4;
      const midW = r.nm.slice(r.hl[0], r.hl[1]).length * 7.4;
      s += `<rect x="${midX - 1}" y="${cy - 9}" width="${midW + 2}" height="17" rx="2" fill="rgba(234,163,77,0.25)"/>`;
    }
    s += txt(ix, cy, r.nm, { fill: C.func });
    if (r.desc) s += txt(ix + r.nm.length * 7.4 + 12, cy, r.desc, { fill: C.dim, size: 11 });
    y += lh;
  });

  // ---- editor ----
  s += `<rect x="${ex}" y="${bodyY}" width="${eW}" height="${bodyH}" fill="${C.bg}"/>`;
  // tab strip
  const tabH = 36;
  s += `<rect x="${ex}" y="${bodyY}" width="${eW}" height="${tabH}" fill="#252526"/>`;
  s += `<rect x="${ex}" y="${bodyY}" width="118" height="${tabH}" fill="${C.bg}"/>`;
  s += `<rect x="${ex}" y="${bodyY}" width="118" height="2" fill="${C.focus}"/>`;
  s += icoFile(ex + 16, bodyY + tabH / 2);
  s += txt(ex + 30, bodyY + tabH / 2, 'bus.c', { size: 12.5, fill: C.fg });
  s += `<text x="${ex + 96}" y="${bodyY + tabH / 2 + 4}" font-family="${UI}" font-size="13" fill="${C.dim}">×</text>`;
  s += icoFile(ex + 138, bodyY + tabH / 2);
  s += txt(ex + 152, bodyY + tabH / 2, 'app.c', { size: 12.5, fill: C.dim });
  // breadcrumb
  const bcY = bodyY + tabH + 18;
  s += txt(ex + 18, bcY, 'src  ›  bus.c  ›  ', { size: 11.5, fill: C.dim });
  s += txt(ex + 18 + 96, bcY, 'bus_write', { size: 11.5, fill: C.func });
  // code
  const code = [
    [['void ', C.kw], ['bus_write', '#dcdcaa'], ['(', C.code], ['int', C.kw], [' reg, ', C.code], ['int', C.kw], [' val) {', C.code]],
    [['    g_bus', C.gv], ['[reg & (BUS_REGS - 1)] = val;', C.code], ['        /* write */', C.cm]],
    [['    g_writes', C.gv, 'flash'], ['++;', C.code], ['                            /* write */', C.cm]],
    [['}', C.code]],
    [['', C.code]],
    [['int ', C.kw], ['bus_read', '#dcdcaa'], ['(', C.code], ['int', C.kw], [' reg) {', C.code]],
    [['    g_reads', C.gv], ['++;', C.code], ['                            /* write */', C.cm]],
    [['    ', C.code], ['return', C.kw], [' g_bus', C.gv], ['[reg & (BUS_REGS - 1)];', C.code], ['  /* read  */', C.cm]],
    [['}', C.code]],
  ];
  let ey = bcY + 22;
  code.forEach((line, li) => {
    const ln = 10 + li;
    const cy = ey + 14;
    const flashed = line.some((seg) => seg[2] === 'flash');
    if (flashed) s += `<rect x="${ex + 52}" y="${ey}" width="${eW - 60}" height="26" fill="rgba(38,79,120,0.30)"/>`;
    s += `<text x="${ex + 44}" y="${cy}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${flashed ? '#c6c6c6' : '#6a6a6a'}">${ln}</text>`;
    let cx = ex + 60;
    line.forEach((seg) => {
      const [t, col, fx] = seg;
      if (fx === 'flash') {
        s += `<rect x="${cx - 1}" y="${cy - 14}" width="${t.length * CW + 2}" height="19" rx="2" fill="${C.findbg}" stroke="${C.findbd}"/>`;
      }
      s += `<text x="${cx}" y="${cy}" font-family="${MONO}" font-size="13.5" fill="${col}" xml:space="preserve">${esc(t)}</text>`;
      cx += t.length * CW;
    });
    ey += 26;
  });
  s += txt(ex + 60, ey + 26, 'Selecting a node previews its call site — selected, centred and flashed.', { fill: C.dim, size: 12 });

  // ---- status bar ----
  const stY = wy + wh - SB;
  s += `<rect x="${wx}" y="${stY}" width="${ww}" height="${SB}" fill="${C.focus}"/>`;
  const stc = stY + SB / 2 + 4;
  s += `<text x="${wx + 16}" y="${stc}" font-family="${UI}" font-size="11.5" fill="#ffffff">⎇ main</text>`;
  s += `<text x="${wx + 92}" y="${stc}" font-family="${UI}" font-size="11.5" fill="#ffffff">ⓧ 0   ⚠ 0</text>`;
  s += `<text x="${wx + ww - 210}" y="${stc}" font-family="${UI}" font-size="11.5" fill="#ffffff">Ln 12, Col 5</text>`;
  s += `<text x="${wx + ww - 92}" y="${stc}" font-family="${UI}" font-size="11.5" fill="#ffffff">C  ·  clangd</text>`;

  s += `</g>`;
  s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${R}" fill="none" stroke="#000000" stroke-opacity="0.55"/>`;
  await render('hero.png', W, H, s);
}

// =================== REFERENCES (floating panel) ===================
async function references() {
  const w = 430, h = 392, sw = 430; // panel size
  const mx = 22, my = 18, R = 10;
  let s = '';
  s += `<defs><filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>`;
  s += `<clipPath id="panel"><rect x="${mx}" y="${my}" width="${w}" height="${h}" rx="${R}"/></clipPath></defs>`;
  s += `<rect x="${mx}" y="${my + 10}" width="${w}" height="${h}" rx="${R}" fill="#000000" opacity="0.45" filter="url(#blur2)"/>`;
  s += `<g clip-path="url(#panel)"><g transform="translate(${mx},${my})">`;
  s += `<rect width="${w}" height="${h}" fill="${C.side}"/>`;
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
  s += `</g></g>`;
  s += `<rect x="${mx}" y="${my}" width="${w}" height="${h}" rx="${R}" fill="none" stroke="#000000" stroke-opacity="0.5"/>`;
  await render('references.png', w + mx * 2, h + my * 2, s);
}

const ICON_B64 = fs.readFileSync(path.resolve(__dirname, '..', 'icons', 'icon.png')).toString('base64');
(async () => { await hero(); await references(); })();
