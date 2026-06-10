/* Real VS Code + clangd integration test for callee → call-site navigation.
 * Exercises the EXACT command layer the extension uses
 * (vscode.prepareCallHierarchy / vscode.provideOutgoingCalls) and verifies, for
 * functions spread across the workspace, that every outgoing call keeps its
 * `fromRanges` and that the extension's click target (callUri + fromRanges[0])
 * lands on a line that actually calls the callee. */
const assert = require('assert');
const vscode = require('vscode');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// (relative source file, function whose Calls we inspect)
const CASES = [
  ['src/app.c', 'dispatch'],
  ['src/app.c', 'app_f0'],
  ['src/hal_0.c', 'hal0_f0'],
  ['src/drv_0.c', 'drv0_f0'],
  ['src/svc_0.c', 'svc0_f0'],
];

async function prepareAndOutgoing(uri, lines, fnName, poll) {
  // The definition line declares the body: `... fnName(...) {`.
  const line = lines.findIndex((l) => new RegExp(`\\b${fnName}\\s*\\(`).test(l) && l.includes('{'));
  assert.ok(line >= 0, `found ${fnName} definition`);
  const ch = lines[line].indexOf(fnName);
  const pos = new vscode.Position(line, ch);

  let items = [];
  let outgoing = [];
  const tries = poll ? 50 : 5;
  for (let i = 0; i < tries && outgoing.length === 0; i++) {
    if (poll || i > 0) await sleep(poll ? 2000 : 500);
    items = (await vscode.commands.executeCommand('vscode.prepareCallHierarchy', uri, pos)) || [];
    if (!items.length) continue;
    outgoing = (await vscode.commands.executeCommand('vscode.provideOutgoingCalls', items[0])) || [];
  }
  return { items, outgoing };
}

const PROVIDER = (process.env.PROVIDER || 'clangd').toLowerCase();
const PROVIDER_EXT =
  PROVIDER === 'cpptools' ? 'ms-vscode.cpptools' : 'llvm-vs-code-extensions.vscode-clangd';

suite(`call hierarchy — outgoing/callee navigation [${PROVIDER}]`, () => {
  let ready = false;

  for (const [rel, fn] of CASES) {
    test(`${fn} (${rel}): outgoing calls keep fromRanges and click → call site`, async function () {
      this.timeout(300000);
      const ext = vscode.extensions.getExtension(PROVIDER_EXT);
      assert.ok(ext, `${PROVIDER_EXT} present`);
      await ext.activate();

      const root = vscode.workspace.workspaceFolders[0].uri;
      const uri = vscode.Uri.joinPath(root, ...rel.split('/'));
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
      const lines = doc.getText().split(/\r?\n/);

      const { items, outgoing } = await prepareAndOutgoing(uri, lines, fn, !ready);
      ready = true;

      assert.ok(items.length > 0, `prepareCallHierarchy resolved ${fn}`);
      assert.ok(outgoing.length > 0, `${fn} has outgoing calls (got ${outgoing.length})`);

      // (1) command layer preserves fromRanges
      const withRanges = outgoing.filter((c) => c.fromRanges && c.fromRanges.length > 0);
      assert.strictEqual(
        withRanges.length,
        outgoing.length,
        `${fn}: all outgoing keep fromRanges (${withRanges.length}/${outgoing.length})`,
      );

      // (2) click target = (callUri = caller file, fromRanges[0]); the line calls the callee
      const callUri = items[0].uri; // == the function's own definition file
      assert.strictEqual(callUri.fsPath, uri.fsPath, `${fn} resolves to ${rel}`);
      for (const c of outgoing) {
        const r0 = c.fromRanges[0];
        const lineText = lines[r0.start.line];
        // clangd returns the bare name ("util_log"); cpptools includes the
        // signature ("util_log(int code)"). Compare on the bare identifier.
        const baseName = c.to.name.replace(/\(.*$/, '').replace(/.*[\s:]/, '').trim();
        assert.ok(
          lineText.includes(baseName),
          `${fn} → ${baseName} call site (${rel}:${r0.start.line + 1}): "${lineText.trim()}"`,
        );
      }
      console.log(`  ${fn}: verified ${outgoing.length} callee call sites in ${rel}`);
    });
  }

  // The root node (the function itself, top of the tree) must open the function's
  // DEFINITION (.c body), not its header declaration. `dispatch` is declared in
  // app.h and defined in app.c.
  test('root click target is the DEFINITION (.c body), not a header declaration', async function () {
    this.timeout(180000);
    const ext = vscode.extensions.getExtension(PROVIDER_EXT);
    await ext.activate();
    const root = vscode.workspace.workspaceFolders[0].uri;
    const appc = vscode.Uri.joinPath(root, 'src', 'app.c');
    const doc = await vscode.workspace.openTextDocument(appc);
    await vscode.window.showTextDocument(doc, { preview: false });
    const lines = doc.getText().split(/\r?\n/);
    const defLine = lines.findIndex((l) => /\bvoid\s+dispatch\s*\(/.test(l) && l.includes('{'));
    const ch = lines[defLine].indexOf('dispatch');
    const pos = new vscode.Position(defLine, ch);

    let items = [];
    for (let i = 0; i < 50 && items.length === 0; i++) {
      await sleep(ready ? 500 : 2000);
      items = (await vscode.commands.executeCommand('vscode.prepareCallHierarchy', appc, pos)) || [];
    }
    ready = true;
    assert.ok(items.length > 0, 'prepareCallHierarchy resolved dispatch');

    // The extension navigates the root to item.uri + item.selectionRange.
    const it = items[0];
    assert.ok(
      !it.uri.fsPath.toLowerCase().endsWith('.h'),
      `root target is a source file, not a header: ${it.uri.fsPath}`,
    );
    const tDoc = await vscode.workspace.openTextDocument(it.uri);
    const tLine = tDoc.lineAt(it.selectionRange.start.line).text;
    assert.ok(
      /\bdispatch\s*\(/.test(tLine) && tLine.includes('{'),
      `root target is the definition body, not a prototype: ` +
        `${it.uri.fsPath}:${it.selectionRange.start.line + 1} "${tLine.trim()}"`,
    );
    console.log(
      `  root → ${it.uri.fsPath.split(/[\\/]/).pop()}:${it.selectionRange.start.line + 1} (definition)`,
    );
  });

  // The example is sized so no function exceeds 100 callers/callees. bus_write is
  // the busiest hub — assert its caller list stays at/under 100.
  test('busiest hub (bus_write) has at most 100 callers', async function () {
    this.timeout(180000);
    await vscode.extensions.getExtension(PROVIDER_EXT).activate();
    const root = vscode.workspace.workspaceFolders[0].uri;
    const busc = vscode.Uri.joinPath(root, 'src', 'bus.c');
    const doc = await vscode.workspace.openTextDocument(busc);
    await vscode.window.showTextDocument(doc, { preview: false });
    const lines = doc.getText().split(/\r?\n/);
    const defLine = lines.findIndex((l) => /\bbus_write\s*\(/.test(l) && l.includes('{'));
    const pos = new vscode.Position(defLine, lines[defLine].indexOf('bus_write'));

    let items = [];
    let incoming = [];
    for (let i = 0; i < 50 && incoming.length === 0; i++) {
      await sleep(ready ? 500 : 2000);
      items = (await vscode.commands.executeCommand('vscode.prepareCallHierarchy', busc, pos)) || [];
      if (items.length) {
        incoming =
          (await vscode.commands.executeCommand('vscode.provideIncomingCalls', items[0])) || [];
      }
    }
    ready = true;
    assert.ok(incoming.length > 0, 'bus_write has callers');
    const distinct = new Set(incoming.map((c) => c.from.name)).size;
    assert.ok(distinct <= 100, `bus_write callers must be ≤ 100, got ${distinct}`);
    console.log(`  bus_write callers: ${distinct} (cap 100)`);
  });
});
