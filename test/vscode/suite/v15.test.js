/* Tests for the v0.1.15+ changes:
 *  - call-tree symbol icons are coloured with the theme's symbolIcon.* colours
 *  - a ×N (multi call-site) node is contextValue `…Multi`
 *  - re-clicking "Open in editor" walks a ×N node's call sites, per-node, with
 *    no walk-state leaking into another node (the v0.1.18 fix)
 *  - pressing Enter walks a ×N node's call sites in-tree, per-node, no leak (v0.1.19)
 *  - Enter targets the FOCUSED node: each node's command is nextCallSite([node])
 *    and no Enter keybinding overrides it (the v0.1.24 fix for arrow + Enter)
 *  - Enter acts on the SELECTED node; selecting another via the view switches to
 *    it (real selection path, not an explicit-node call) (v0.1.21)
 *  - an active search filter highlights the matched part of a call-tree label (v0.1.20)
 *  - a filter that matches the PATH highlights it in the label too (v0.1.25)
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

  test('×N node is contextValue "…Multi"; walk commands present, quick-pick gone', async function () {
    this.timeout(180000);
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);

    const cmds = await vscode.commands.getCommands(true);
    assert.ok(cmds.includes('cCallHierarchyReferences.openReferenceInEditor'), 'openReferenceInEditor registered');
    // Enter-walk is back in v0.1.19 (keyed per-node, no leak); the v0.1.15
    // quick-pick stays removed.
    assert.ok(cmds.includes('cCallHierarchyReferences.nextCallSite'), 'nextCallSite (Enter walk) registered');
    assert.ok(!cmds.includes('cCallHierarchyReferences.goToCallSite'), 'goToCallSite quick-pick removed');

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

  test('Enter targets the FOCUSED node: each node\'s command is nextCallSite([node]) and NO Enter keybinding overrides it (v0.1.24)', async function () {
    this.timeout(180000);
    // This is the wiring that makes Enter act on the node the arrow keys moved to:
    // VS Code runs the FOCUSED node's own TreeItem.command on Enter. The actual
    // arrow-key press can't be simulated headlessly, but these two invariants are
    // exactly what that behaviour rests on — and what regressed in 0.1.17–0.1.23:
    //   (1) every call-tree node's command is nextCallSite carrying ITS OWN node;
    //   (2) there is NO `enter` keybinding hijacking it to read the (arrow-stale)
    //       selection (the 0.1.17 keybinding that caused the bug).
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);
    assert.ok(callees.length > 0, 'dispatch has callees');

    for (const n of [rootNode, ...callees.slice(0, 6)]) {
      const ti = await tree.getTreeItem(n);
      assert.ok(ti.command, `${n.item.name}: node has a command`);
      assert.strictEqual(
        ti.command.command,
        'cCallHierarchyReferences.nextCallSite',
        `${n.item.name}: node command is nextCallSite (runs for the focused node on Enter)`,
      );
      assert.strictEqual(
        ti.command.arguments && ti.command.arguments[0],
        n,
        `${n.item.name}: the command carries its OWN node (so Enter can't act on a stale one)`,
      );
    }

    // No `enter` keybinding may override the focused-node command (that was the
    // 0.1.17–0.1.23 bug: a keybinding read callView.selection, which arrows don't
    // update). Assert the manifest contributes no Enter binding.
    const pkg = vscode.extensions.getExtension('halistahasahin.c-call-hierarchy-references').packageJSON;
    const enterBindings = (pkg.contributes.keybindings || []).filter((k) => (k.key || '').toLowerCase() === 'enter');
    assert.strictEqual(
      enterBindings.length,
      0,
      `no Enter keybinding may hijack the focused-node command (found: ${JSON.stringify(enterBindings)})`,
    );
    console.log(`  every node command = nextCallSite([node]); no Enter keybinding overrides it ✔`);
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

  test('Enter walks a ×N node\'s call sites — per-node, no leak (v0.1.19)', async function () {
    this.timeout(180000);
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);
    const multi = callees.find((n) => n.fromRanges.length > 1);
    // Drives the SAME command the Enter keybinding fires (nextCallSite), passing
    // the node explicitly (the keybinding passes the selected node).
    const enter = (n) => vscode.commands.executeCommand('cCallHierarchyReferences.nextCallSite', n);

    if (multi) {
      // ×N node: each Enter previews the next merged call site, wrapping. Assert
      // RELATIVE stepping (the enterCursor persists across the session), not an
      // absolute start index.
      const N = multi.fromRanges.length;
      const r0 = await enter(multi);
      assert.strictEqual(r0.total, N, `reports its ${N} call sites`);
      const r1 = await enter(multi);
      assert.strictEqual(r1.index, (r0.index + 1) % N, `Enter walks forward ${r0.index}→${r1.index} of ${N}`);
      const r2 = await enter(multi);
      assert.strictEqual(r2.index, (r1.index + 1) % N, `Enter walks forward ${r1.index}→${r2.index} of ${N}`);

      // THE REPORTED BUG: after walking a ×N node with Enter, pressing Enter on
      // ANOTHER node must act on THAT node and not continue the previous walk —
      // returning to the ×N node restarts at its first site.
      const other = callees.find((n) => n !== multi && n.callUri && n.fromRanges.length > 0);
      if (other) {
        await enter(other); // enterCursor now keyed to `other`
        const back = await enter(multi);
        assert.strictEqual(
          back.index,
          0,
          'after pressing Enter on another node, the ×N node restarts at its first site (no cross-node leak)',
        );
        console.log(
          `  ${multi.item.name} ×${N}: Enter walks ${r0.index + 1}→${r1.index + 1}→${r2.index + 1}, resets after switching nodes ✔`,
        );
      } else {
        console.log(`  ${multi.item.name} ×${N}: Enter walks forward & wraps (sole callee, leak-check skipped) ✔`);
      }
    } else {
      // one node per call site (cpptools): a single-site node stays at its one site.
      const one = callees.find((n) => n.fromRanges.length === 1);
      const a = await enter(one);
      assert.strictEqual(a.index, 0, 'single-site node: Enter stays at its only site');
      assert.strictEqual(a.total, 1, 'single-site total is 1');
      const b = await enter(one);
      assert.strictEqual(b.index, 0, 'single-site node: Enter stays at 1/1');
      console.log('  single-site nodes: Enter stays at 1/1 ✔');
    }
  });

  test('Enter acts on the SELECTED node; selecting another switches to it — real selection path (v0.1.21)', async function () {
    this.timeout(180000);
    // This is the scenario the explicit-node test missed: walk a ×N node, then
    // change the VIEW SELECTION (as the up/down arrows do) and press Enter with NO
    // argument — exactly what the Enter keybinding does — and assert Enter lands on
    // the newly selected node, not the previously walked one.
    assert.ok(api.callView, 'activate() exposes callView');
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    await api.callView.reveal(rootNode, { expand: true });
    const callees = await tree.getChildren(rootNode);
    const A = callees.find((n) => n.fromRanges.length > 1); // a ×N node to walk
    const B = callees.find((n) => n !== A && n.callUri && n.fromRanges.length > 0); // a distinct sibling
    if (!A || !B) {
      console.log('  need a ×N node + a distinct sibling — skipped (provider returned neither)');
      return;
    }

    // NO argument → reads the view selection, exactly like the Enter keybinding.
    const pressEnter = () => vscode.commands.executeCommand('cCallHierarchyReferences.nextCallSite');
    const sitesOf = (n) => n.fromRanges.map((rg) => `${n.callUri.toString()}#${rg.start.line}`);
    const aSites = sitesOf(A);
    const bSites = sitesOf(B);
    const where = (r) => (r ? `${r.uri}#${r.line}` : 'undefined');

    // Select A and press Enter a couple of times → walks A's call sites.
    await api.callView.reveal(A, { select: true, focus: true });
    const a1 = await pressEnter();
    assert.ok(a1 && aSites.includes(where(a1)), `Enter acted on the selected ×N node A (got ${where(a1)})`);
    await pressEnter(); // walk once more

    // Now SELECT B (what arrowing up/down does) and press Enter — it must switch
    // to B and NOT keep walking A. This is the exact bug reported against 0.1.17.
    await api.callView.reveal(B, { select: true, focus: true });
    const rb = await pressEnter();
    assert.ok(rb && bSites.includes(where(rb)), `after selecting B, Enter acted on B (got ${where(rb)})`);
    assert.ok(
      !aSites.includes(where(rb)),
      'Enter did NOT keep walking the previously selected node A (no cross-node leak)',
    );
    console.log(`  select A→Enter walks A; select B→Enter lands on B (${where(rb)}), not A ✔`);
  });

  test('Active filter highlights the matched part of a call-tree node label (v0.1.20)', async function () {
    this.timeout(180000);
    assert.strictEqual(typeof api.setFilter, 'function', 'activate() exposes setFilter for tests');

    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);
    const bus = callees.find((n) => /bus/i.test(n.item.name)); // e.g. bus_write / bus_read
    const noBus = callees.find((n) => !/bus/i.test(n.item.name));

    try {
      api.setFilter('bus');
      if (bus) {
        const ti = await tree.getTreeItem(bus);
        assert.ok(ti.label && typeof ti.label === 'object', 'matching node label is a TreeItemLabel');
        assert.ok(
          Array.isArray(ti.label.highlights) && ti.label.highlights.length > 0,
          'matching node carries highlight ranges',
        );
        const [s, e] = ti.label.highlights[0];
        assert.strictEqual(
          ti.label.label.slice(s, e).toLowerCase(),
          'bus',
          'the highlight range covers the matched "bus"',
        );
        console.log(`  ${ti.label.label}: highlight [${s},${e}] = "${ti.label.label.slice(s, e)}" ✔`);
      }
      if (noBus) {
        const ti2 = await tree.getTreeItem(noBus);
        assert.strictEqual(typeof ti2.label, 'string', 'a node the filter does not match keeps a plain label');
        console.log(`  ${noBus.item.name}: no "bus" in name → plain label ✔`);
      }
    } finally {
      api.setFilter(undefined); // don't leak the filter into later tests
    }
  });

  test('Active filter highlights a PATH match in the label too (v0.1.25)', async function () {
    this.timeout(180000);
    const rootNode = await dispatchRoots(tree);
    if (tree.getDirection() !== 'outgoing') tree.toggleDirection();
    const callees = await tree.getChildren(rootNode);
    // bus_write / bus_read live in src/bus.c. "src/bus" matches the PATH but NOT
    // the function name — so the highlight must surface on the path (in the label,
    // since VS Code can't highlight the description where the path normally sits).
    const bus = callees.find((n) => /bus_write|bus_read/.test(n.item.name));

    try {
      api.setFilter('src/bus');
      if (bus) {
        const ti = await tree.getTreeItem(bus);
        assert.ok(ti.label && typeof ti.label === 'object', 'path-matching node label is a TreeItemLabel');
        const text = ti.label.label;
        assert.ok(/src\/bus/i.test(text), `the path is shown in the label (got "${text}")`);
        const hl = ti.label.highlights || [];
        const hit = hl.find(([s, e]) => text.slice(s, e).toLowerCase() === 'src/bus');
        assert.ok(hit, `a highlight covers the path match "src/bus" (highlights ${JSON.stringify(hl)} over "${text}")`);
        console.log(`  ${text}: path highlight [${hit[0]},${hit[1]}] = "${text.slice(hit[0], hit[1])}" ✔`);
      } else {
        console.log('  no bus_write/bus_read callee — skipped');
      }
    } finally {
      api.setFilter(undefined);
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
