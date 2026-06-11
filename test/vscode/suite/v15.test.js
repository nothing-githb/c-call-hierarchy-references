/* Tests for the v0.1.15+ changes:
 *  - call-tree symbol icons are coloured with the theme's symbolIcon.* colours
 *  - a ×N (multi call-site) node is contextValue `…Multi`
 *  - re-clicking "Open in editor" walks a ×N node's call sites, per-node, with
 *    no walk-state leaking into another node (the v0.1.18 fix)
 *  - References in folder grouping render the top folder levels Expanded
 * Drives the REAL providers exposed by the extension's activate(). */
const assert = require('assert');
const vscode = require('vscode');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROVIDER = (process.env.PROVIDER || 'clangd').toLowerCase();
const PROVIDER_EXT =
  PROVIDER === 'cpptools' ? 'ms-vscode.cpptools' : 'llvm-vs-code-extensions.vscode-clangd';

async function dispatchRoots(tree) {
  const root = vscode.workspace.workspaceFolders[0].uri;
  const appc = vscode.Uri.joinPath(root, 'src', 'app.c');
  const doc = await vscode.workspace.openTextDocument(appc);
  await vscode.window.showTextDocument(doc, { preview: false });
  const lines = doc.getText().split(/\r?\n/);
  const defLine = lines.findIndex((l) => /\bvoid\s+dispatch\s*\(/.test(l) && l.includes('{'));
  const pos = new vscode.Position(defLine, lines[defLine].indexOf('dispatch'));
  let items = [];
  for (let i = 0; i < 60 && items.length === 0; i++) {
    await sleep(2000);
    items = (await vscode.commands.executeCommand('vscode.prepareCallHierarchy', appc, pos)) || [];
  }
  assert.ok(items.length > 0, 'prepareCallHierarchy resolved dispatch');
  tree.setRoots(items);
  return tree.getRoots()[0];
}

suite(`v0.1.15 features [${PROVIDER}]`, () => {
  let api, tree;
  suiteSetup(async function () {
    this.timeout(180000);
    await vscode.extensions.getExtension(PROVIDER_EXT).activate();
    api = await vscode.extensions.getExtension('halistahasahin.c-call-hierarchy-references').activate();
    tree = api.tree;
  });

  test('symbol icons are coloured with theme symbolIcon.* colours', async function () {
    this.timeout(180000);
    const rootNode = await dispatchRoots(tree);
    const ti = await tree.getTreeItem(rootNode);
    assert.ok(ti.iconPath instanceof vscode.ThemeIcon, 'iconPath is a ThemeIcon');
    assert.strictEqual(ti.iconPath.id, 'symbol-function', 'uses the function symbol codicon');
    assert.ok(ti.iconPath.color instanceof vscode.ThemeColor, 'the icon carries a ThemeColor');
    assert.strictEqual(
      ti.iconPath.color.id,
      'symbolIcon.functionForeground',
      'coloured with the theme symbol colour',
    );
    console.log(`  icon ${ti.iconPath.id} / ${ti.iconPath.color.id} ✔`);
  });

  test('×N node is contextValue "…Multi"; the cycling commands are gone', async function () {
    this.timeout(180000);
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);

    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('cCallHierarchyReferences.openReferenceInEditor'), 'openReferenceInEditor registered');
    // The old quick-pick / Enter-cycle commands were removed in v0.1.18.
    assert.ok(!cmds.includes('cCallHierarchyReferences.goToCallSite'), 'goToCallSite removed');
    assert.ok(!cmds.includes('cCallHierarchyReferences.nextCallSite'), 'nextCallSite removed');

    // clangd MERGES several call sites to the same callee into one ×N node;
    // cpptools instead returns each call site as its own ×1 node. The "…Multi"
    // marker only applies to merged (×N) nodes.
    const multi = callees.find((n) => n.fromRanges.length > 1);
    for (const n of callees) {
      const cv = (await tree.getTreeItem(n)).contextValue;
      const expectMulti = n.fromRanges.length > 1;
      assert.strictEqual(
        /Multi$/.test(cv),
        expectMulti,
        `${n.item.name} ×${n.fromRanges.length}: contextValue "${cv}" Multi=${/Multi$/.test(cv)} expected ${expectMulti}`,
      );
    }
    console.log(
      multi
        ? `  ${multi.item.name} ×${multi.fromRanges.length} → contextValue Multi ✔`
        : `  provider returns one node per call site (no ×N merge) — no Multi nodes ✔`,
    );
  });

  test('Open in editor walks a ×N node\'s call sites — per-node, no leak (v0.1.18)', async function () {
    this.timeout(180000);
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);
    const multi = callees.find((n) => n.fromRanges.length > 1);
    const open = (n) => vscode.commands.executeCommand('cCallHierarchyReferences.openReferenceInEditor', n);

    if (multi) {
      // ×N node (clangd): each re-click of "Open in editor" walks to the next
      // merged call site, wrapping around. The absolute start index isn't
      // asserted — openReferenceInEditor keeps a per-session cursor, so an
      // earlier test may already have opened this node; what matters is that each
      // re-click STEPS FORWARD by one (mod N).
      const N = multi.fromRanges.length;
      const r0 = await open(multi);
      assert.strictEqual(r0.total, N, `reports its ${N} call sites`);
      const r1 = await open(multi);
      assert.strictEqual(r1.index, (r0.index + 1) % N, `re-click walks forward ${r0.index}→${r1.index} of ${N}`);
      const r2 = await open(multi);
      assert.strictEqual(r2.index, (r1.index + 1) % N, `re-click walks forward ${r1.index}→${r2.index} of ${N}`);

      // THE REPORTED BUG: after acting on ANOTHER node, returning to the ×N node
      // must restart at its first site — walk state must not leak between nodes.
      const other = callees.find((n) => n !== multi && n.callUri && n.fromRanges.length > 0);
      if (other) {
        await open(other); // cursor is now keyed to `other`
        const back = await open(multi);
        assert.strictEqual(
          back.index,
          0,
          'after opening another node, the ×N node restarts at its first site (no cross-node leak)',
        );
        console.log(
          `  ${multi.item.name} ×${N}: walks ${r0.index + 1}→${r1.index + 1}→${r2.index + 1}, resets to 1 after switching nodes ✔`,
        );
      } else {
        console.log(`  ${multi.item.name} ×${N}: re-click walks forward & wraps (sole callee, leak-check skipped) ✔`);
      }
    } else {
      // one node per call site (cpptools): a single-site node opens its one site.
      const one = callees.find((n) => n.fromRanges.length === 1);
      const a = await open(one);
      assert.deepStrictEqual(a, { index: 0, total: 1 }, 'single-site node opens its only site');
      const b = await open(one);
      assert.deepStrictEqual(b, { index: 0, total: 1 }, 'single-site node stays at 1/1');
      console.log('  single-site nodes: Open in editor stays at 1/1 ✔');
    }
  });

  test('References in folder mode render the top folders Expanded', async function () {
    this.timeout(180000);
    const refs = api.references;
    assert.ok(refs, 'references provider is exposed');
    assert.strictEqual(refs.getGrouping(), 'folder', 'default grouping is folder');

    // bus_write is referenced across many src/*.c files (and its header).
    const root = vscode.workspace.workspaceFolders[0].uri;
    const busc = vscode.Uri.joinPath(root, 'src', 'bus.c');
    const doc = await vscode.workspace.openTextDocument(busc);
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    const lines = doc.getText().split(/\r?\n/);
    const defLine = lines.findIndex((l) => /\bbus_write\s*\(/.test(l) && l.includes('{'));
    const pos = new vscode.Position(defLine, lines[defLine].indexOf('bus_write'));
    editor.selection = new vscode.Selection(pos, pos);

    let ready = [];
    for (let i = 0; i < 50 && ready.length === 0; i++) {
      await sleep(2000);
      ready = (await vscode.commands.executeCommand('vscode.prepareCallHierarchy', busc, pos)) || [];
    }
    await vscode.window.showTextDocument(doc, { preview: false });
    editor.selection = new vscode.Selection(pos, pos);
    try {
      await vscode.commands.executeCommand('cCallHierarchyReferences.findReferences');
    } catch {
      /* the view-focus step may reject headless; references are still set */
    }

    let roots = [];
    for (let i = 0; i < 30 && roots.length === 0; i++) {
      await sleep(500);
      roots = await refs.getChildren();
    }
    assert.ok(roots.length > 0, 'references populated');
    const folder = roots.find((n) => n.kind === 'folder');
    assert.ok(folder, `a folder node exists (roots: ${roots.map((n) => n.kind).join(', ')})`);
    assert.strictEqual(
      refs.getTreeItem(folder).collapsibleState,
      vscode.TreeItemCollapsibleState.Expanded,
      'a top folder renders Expanded (so Find references shows results directly)',
    );
    console.log(`  references folder "${folder.label}" → Expanded ✔`);
  });
});
