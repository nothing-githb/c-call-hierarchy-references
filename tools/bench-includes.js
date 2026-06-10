/*
 * Standalone benchmark of the Header-Includes scan (the extension's heaviest
 * pure-logic path), replicating IncludeIndex.build over a generated example.
 * Usage: OUT=example-xl node tools/bench-includes.js
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const OUT = process.env.OUT || 'example-large';
const ROOT = path.resolve(__dirname, '..', OUT);
const WIN = process.platform === 'win32';
const normKey = (p) => {
  const n = path.normalize(p).replace(/\\/g, '/');
  return WIN ? n.toLowerCase() : n;
};

const INCLUDE_RE = /^[ \t]*#[ \t]*include[ \t]*(?:<([^>\r\n]+)>|"([^"\r\n]+)")/gm;
function stripComments(text) {
  let out = ''; let state = 'code';
  for (let i = 0; i < text.length; i++) {
    const c = text[i], d = text[i + 1];
    switch (state) {
      case 'code':
        if (c === '/' && d === '/') { state = 'line'; i++; }
        else if (c === '/' && d === '*') { state = 'block'; out += '  '; i++; }
        else if (c === '"') { state = 'str'; out += c; }
        else if (c === "'") { state = 'char'; out += c; }
        else out += c;
        break;
      case 'line': if (c === '\n') { state = 'code'; out += c; } break;
      case 'block': if (c === '*' && d === '/') { state = 'code'; out += '  '; i++; } else out += c === '\n' ? '\n' : ' '; break;
      case 'str': case 'char':
        out += c;
        if (c === '\\') { out += d ?? ''; i++; }
        else if ((state === 'str' && c === '"') || (state === 'char' && c === "'")) state = 'code';
        break;
    }
  }
  return out;
}
function parseIncludes(text) {
  const out = []; const src = stripComments(text); INCLUDE_RE.lastIndex = 0; let m;
  while ((m = INCLUDE_RE.exec(src)) !== null) { const angle = m[1] !== undefined; out.push({ spelling: (angle ? m[1] : m[2]).trim(), angle }); }
  return out;
}

function listFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.vscode') out.push(...listFiles(p)); }
    else if (/\.(h|hh|hpp|hxx|h\+\+|inc|ipp|tcc|c|cc|cpp|cxx|c\+\+)$/.test(e.name)) out.push(p);
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  const files = listFiles(ROOT);
  const tList = Date.now() - t0;

  const includeDirs = [ROOT, path.join(ROOT, 'include')];
  const byPath = new Map();
  for (const f of files) byPath.set(normKey(f), f);
  const resolve = (includer, spelling, angle) => {
    const cands = [];
    if (!angle) cands.push(path.join(path.dirname(includer), spelling));
    for (const d of includeDirs) cands.push(path.join(d, spelling));
    for (const c of cands) { const hit = byPath.get(normKey(c)); if (hit) return hit; }
    return undefined;
  };

  const forward = new Map();
  const reverse = new Map();
  let totalIncludes = 0, resolved = 0;

  const t1 = Date.now();
  let i = 0;
  const decoder = new TextDecoder('utf-8');
  const worker = async () => {
    while (i < files.length) {
      const f = files[i++];
      let text;
      try { text = decoder.decode(await fsp.readFile(f)); } catch { continue; }
      const refs = parseIncludes(text).map((inc) => ({ ...inc, target: resolve(f, inc.spelling, inc.angle) }));
      totalIncludes += refs.length;
      forward.set(normKey(f), refs);
      for (const r of refs) {
        if (r.target) {
          resolved++;
          const k = normKey(r.target);
          let set = reverse.get(k); if (!set) { set = new Set(); reverse.set(k, set); }
          set.add(f);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(24, files.length) }, worker));
  const tScan = Date.now() - t1;

  // Hub: how many files include bus.h (reverse index size)?
  const busKey = normKey(path.join(ROOT, 'include', 'bus.h'));
  const busIncluders = reverse.get(busKey)?.size ?? 0;

  console.log(`OUT=${OUT}`);
  console.log(`files scanned       : ${files.length}`);
  console.log(`findFiles (listdir) : ${tList} ms`);
  console.log(`read+parse+resolve  : ${tScan} ms  (24-way concurrent)`);
  console.log(`total #include dirs : ${totalIncludes}  (resolved ${resolved})`);
  console.log(`bus.h included-by   : ${busIncluders} files`);

  // Filter cost: matchesQuery over 30k synthetic names.
  const names = Array.from({ length: 30000 }, (_, n) => `hal${n % 400}_f${n % 30}`);
  const t2 = Date.now();
  let hits = 0;
  for (const nm of names) if (nm.toLowerCase().includes('hal37_f1')) hits++;
  console.log(`filter 30k names    : ${Date.now() - t2} ms  (${hits} hits, contains)`);
}
main();
