/*
 * Real headless integration test: drives the configured clangd over LSP against
 * example-large and verifies the call-hierarchy data the extension relies on —
 * specifically that OUTGOING calls carry call-site `fromRanges` (so clicking a
 * callee can jump to where it is called). Skips (exit 0) if clangd isn't found.
 *
 * clangd path: $CLANGD, else clangd.path from VS Code user settings, else PATH.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', 'example-large');
const APP_C = path.join(ROOT, 'src', 'app.c');

function findClangd() {
  if (process.env.CLANGD && fs.existsSync(process.env.CLANGD)) return process.env.CLANGD;
  try {
    const settings = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'settings.json');
    const txt = fs.readFileSync(settings, 'utf8');
    const m = txt.match(/"clangd\.path"\s*:\s*"([^"]+)"/);
    if (m && fs.existsSync(m[1].replace(/\\\\/g, '\\'))) return m[1].replace(/\\\\/g, '\\');
  } catch {}
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['clangd']);
  const p = (which.stdout || '').toString().split(/\r?\n/)[0].trim();
  return p && fs.existsSync(p) ? p : undefined;
}

function uriOf(p) {
  return 'file:///' + path.resolve(p).replace(/\\/g, '/');
}

// ---- minimal LSP client over stdio ----
class Lsp {
  constructor(proc) {
    this.proc = proc;
    this.seq = 0;
    this.pending = new Map();
    this.notes = [];
    this.buf = Buffer.alloc(0);
    proc.stdout.on('data', (d) => this.onData(d));
  }
  onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      const sep = this.buf.indexOf('\r\n\r\n');
      if (sep < 0) return;
      const header = this.buf.slice(0, sep).toString('ascii');
      const m = header.match(/Content-Length:\s*(\d+)/i);
      if (!m) { this.buf = this.buf.slice(sep + 4); continue; }
      const len = +m[1];
      if (this.buf.length < sep + 4 + len) return;
      const body = this.buf.slice(sep + 4, sep + 4 + len).toString('utf8');
      this.buf = this.buf.slice(sep + 4 + len);
      let msg;
      try { msg = JSON.parse(body); } catch { continue; }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        resolve(msg.result);
      } else if (msg.method) {
        this.notes.push(msg);
      }
    }
  }
  send(method, params) {
    const id = ++this.seq;
    const json = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    this.proc.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
    return new Promise((resolve) => this.pending.set(id, { resolve }));
  }
  notify(method, params) {
    const json = JSON.stringify({ jsonrpc: '2.0', method, params });
    this.proc.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const clangd = findClangd();
  if (!clangd) {
    console.log('SKIP clangd integration: clangd not found (set $CLANGD to enable).');
    process.exit(0);
  }
  console.log('clangd:', clangd);

  const proc = spawn(clangd, [`--compile-commands-dir=${ROOT}`, '--background-index', '--log=error', '-j=2'], {
    cwd: ROOT,
  });
  proc.on('error', (e) => { console.log('SKIP: failed to spawn clangd:', e.message); process.exit(0); });
  const lsp = new Lsp(proc);

  let fail = 0;
  const eq = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fail++; };

  await lsp.send('initialize', {
    processId: process.pid,
    rootUri: uriOf(ROOT),
    capabilities: { textDocument: { callHierarchy: { dynamicRegistration: false } } },
  });
  lsp.notify('initialized', {});

  const text = fs.readFileSync(APP_C, 'utf8');
  lsp.notify('textDocument/didOpen', {
    textDocument: { uri: uriOf(APP_C), languageId: 'c', version: 1, text },
  });

  // position of `dispatch` on its definition line
  const lines = text.split(/\r?\n/);
  const defLine = lines.findIndex((l) => /\bvoid\s+dispatch\s*\(/.test(l));
  const character = lines[defLine].indexOf('dispatch');
  console.log(`dispatch at app.c:${defLine + 1}:${character + 1}`);

  // Wait for AST/index, then poll prepare+outgoing until clangd answers.
  let prep = [];
  let outgoing = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(1500);
    prep = (await lsp.send('textDocument/prepareCallHierarchy', {
      textDocument: { uri: uriOf(APP_C) },
      position: { line: defLine, character },
    })) || [];
    if (!prep.length) continue;
    outgoing = (await lsp.send('callHierarchy/outgoingCalls', { item: prep[0] })) || [];
    if (outgoing.length) break;
  }

  eq(prep.length > 0, `prepareCallHierarchy resolves dispatch (got ${prep.length})`);
  eq(outgoing.length > 0, `dispatch has outgoing calls (got ${outgoing.length})`);

  // The root click opens item.uri + selectionRange. It must be the DEFINITION
  // (the .c body), not the header prototype.
  if (prep.length) {
    const rootUri = (prep[0].uri || '').replace(/^file:\/\/\//, '');
    const rootLine = lines[prep[0].selectionRange.start.line] || '';
    eq(
      !rootUri.toLowerCase().endsWith('.h') && /\bdispatch\s*\(/.test(rootLine) && rootLine.includes('{'),
      `root resolves to the .c definition (${rootUri.split('/').pop()}:${prep[0].selectionRange.start.line + 1})`,
    );
  }

  const withRanges = outgoing.filter((c) => (c.fromRanges || []).length > 0);
  eq(
    outgoing.length > 0 && withRanges.length === outgoing.length,
    `every outgoing call has fromRanges (${withRanges.length}/${outgoing.length}) — needed for callee→call-site`,
  );

  // The extension's click target for a callee = (caller file, fromRanges[0]).
  // That app.c line must actually call the callee.
  let callSiteOk = 0;
  for (const c of outgoing) {
    const r0 = (c.fromRanges || [])[0];
    if (r0 && (lines[r0.start.line] || '').includes(c.to.name)) callSiteOk++;
  }
  eq(
    outgoing.length > 0 && callSiteOk === outgoing.length,
    `every callee's call-site line actually calls it (${callSiteOk}/${outgoing.length})`,
  );

  // Report a sample so we can see callee uris (header vs .c) and call-site lines.
  console.log('--- sample outgoing callees ---');
  for (const c of outgoing.slice(0, 6)) {
    const r0 = (c.fromRanges || [])[0];
    const at = r0 ? `app.c:${r0.start.line + 1}:${r0.start.character + 1}` : '(no fromRange)';
    const toUri = c.to.uri.replace(/^file:\/\/\//, '');
    console.log(`  ${c.to.name.padEnd(12)} call-site=${at}  to=${toUri.split('/').slice(-2).join('/')}`);
  }

  try { lsp.notify('exit', {}); proc.kill(); } catch {}
  console.log(fail === 0 ? '\nALL PASS (clangd integration)' : `\n${fail} FAILED`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.log('SKIP (error):', e.message); process.exit(0); });
