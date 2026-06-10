import * as vscode from 'vscode';
import { IncludeIndex, IncludeDirection } from './includes';
import { passesFilter, matchesRuntimeName, maxDepth } from './filter';

/** One node in the include tree. A node with no `uri` is an unresolved include. */
export class IncludeNode {
  readonly key: string;
  constructor(
    readonly uri: vscode.Uri | undefined,
    readonly spelling: string,
    readonly angle: boolean,
    readonly depth: number,
    readonly ancestry: ReadonlySet<string>,
    readonly parent?: IncludeNode,
  ) {
    this.key = uri ? uri.toString() : `unresolved:${angle ? '<' : '"'}${spelling}`;
  }
}

export class IncludeTreeProvider implements vscode.TreeDataProvider<IncludeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<IncludeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private root: IncludeNode | undefined;
  private direction: IncludeDirection = 'includes';
  private view: vscode.TreeView<IncludeNode> | undefined;

  constructor(private readonly index: IncludeIndex) {}

  attachView(view: vscode.TreeView<IncludeNode>): void {
    this.view = view;
  }

  getDirection(): IncludeDirection {
    return this.direction;
  }

  getRootUri(): vscode.Uri | undefined {
    return this.root?.uri;
  }

  toggleDirection(): void {
    this.direction = this.direction === 'includes' ? 'includedBy' : 'includes';
    this.refresh();
    this.updateTitle();
  }

  setRoot(uri: vscode.Uri): void {
    this.root = new IncludeNode(uri, vscode.workspace.asRelativePath(uri, false), false, 0, new Set());
    this.refresh();
    this.updateTitle();
  }

  clear(): void {
    this.root = undefined;
    this.refresh();
    this.updateTitle();
  }

  refresh(): void {
    this._onDidChange.fire();
  }

  private updateTitle(): void {
    if (!this.view) {
      return;
    }
    if (!this.root?.uri) {
      this.view.description = undefined;
      this.view.message = 'Run "Show include hierarchy" on a C/C++ file.';
      return;
    }
    this.view.message = undefined;
    const verb = this.direction === 'includes' ? 'includes' : 'included by';
    this.view.description = `${vscode.workspace.asRelativePath(this.root.uri, false)} — ${verb}`;
  }

  getParent(node: IncludeNode): IncludeNode | undefined {
    return node.parent;
  }

  getTreeItem(node: IncludeNode): vscode.TreeItem {
    const resolved = !!node.uri;
    // Only show an expand arrow when there are actually visible children — the
    // include graph is in-memory, so this O(1) check avoids phantom twisties.
    const expandable =
      resolved &&
      node.depth < maxDepth() &&
      !node.ancestry.has(node.key) &&
      this.hasVisibleChildren(node);
    const label = resolved && node.uri ? basename(node.uri) : node.spelling;
    const ti = new vscode.TreeItem(
      label,
      expandable ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    );
    if (resolved && node.uri) {
      ti.resourceUri = node.uri;
      ti.iconPath = vscode.ThemeIcon.File;
      const rel = vscode.workspace.asRelativePath(node.uri, false);
      const slash = rel.lastIndexOf('/');
      ti.description = slash >= 0 ? rel.slice(0, slash) : '';
      ti.tooltip = rel + (node.ancestry.has(node.key) ? '\n(recursive include)' : '');
      ti.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [node.uri],
      };
      ti.contextValue = 'includeFile';
    } else {
      // Unresolved include (system header or outside the workspace).
      ti.iconPath = new vscode.ThemeIcon('question', new vscode.ThemeColor('disabledForeground'));
      ti.description = node.angle ? '<unresolved>' : '"unresolved"';
      ti.tooltip = `Unresolved include: ${node.angle ? '<' : '"'}${node.spelling}${node.angle ? '>' : '"'}\nNot found in the workspace or configured include paths.`;
      ti.contextValue = 'includeUnresolved';
    }
    return ti;
  }

  private hasVisibleChildren(node: IncludeNode): boolean {
    if (!node.uri) {
      return false;
    }
    if (this.direction === 'includes') {
      return this.index
        .includesOf(node.uri)
        .some((r) => (r.target ? passesFilter(basename(r.target), r.target) : matchesRuntimeName(r.spelling)));
    }
    return this.index.includedBy(node.uri).some((u) => passesFilter(basename(u), u));
  }

  getChildren(node?: IncludeNode): IncludeNode[] {
    if (!node) {
      return this.root ? [this.root] : [];
    }
    if (!node.uri || node.depth >= maxDepth() || node.ancestry.has(node.key)) {
      return [];
    }
    const childAncestry = new Set(node.ancestry).add(node.key);
    if (this.direction === 'includes') {
      return this.index
        .includesOf(node.uri)
        .filter((r) => (r.target ? passesFilter(basename(r.target), r.target) : matchesRuntimeName(r.spelling)))
        .map(
          (r) =>
            new IncludeNode(r.target, r.spelling, r.angle, node.depth + 1, childAncestry, node),
        );
    }
    return this.index
      .includedBy(node.uri)
      .filter((u) => passesFilter(basename(u), u))
      .sort((a, b) =>
        vscode.workspace
          .asRelativePath(a, false)
          .localeCompare(vscode.workspace.asRelativePath(b, false)),
      )
      .map(
        (u) =>
          new IncludeNode(
            u,
            vscode.workspace.asRelativePath(u, false),
            false,
            node.depth + 1,
            childAncestry,
            node,
          ),
      );
  }
}

function basename(uri: vscode.Uri): string {
  const rel = vscode.workspace.asRelativePath(uri, false);
  const slash = rel.lastIndexOf('/');
  return slash >= 0 ? rel.slice(slash + 1) : rel;
}
