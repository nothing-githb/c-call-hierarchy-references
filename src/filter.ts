import * as vscode from 'vscode';
import { matchesQuery } from './textutil';

const SECTION = 'cCallHierarchyReferences';
const RUNTIME_KEY = 'cCallHierarchyReferences.runtimePathFilter';

export function maxDepth(): number {
  return vscode.workspace.getConfiguration(SECTION).get<number>('maxDepth', 32);
}

// ---- Runtime (interactive) search filter -----------------------------------

let runtimeFilter: string | undefined;
let stateStore: vscode.Memento | undefined;

/** Wire up persisted runtime-filter state. Call once from activate(). */
export function initFilterState(context: vscode.ExtensionContext): void {
  stateStore = context.workspaceState;
  runtimeFilter = stateStore.get<string>(RUNTIME_KEY) || undefined;
}

export function setRuntimeFilter(value: string | undefined): void {
  runtimeFilter = value && value.trim() ? value.trim() : undefined;
  void stateStore?.update(RUNTIME_KEY, runtimeFilter);
}

export function getRuntimeFilter(): string | undefined {
  return runtimeFilter;
}

/**
 * The interactive **Filter** box — the single source of filtering. Matches the
 * query against the symbol NAME and the relative PATH (either may match):
 *   - `/regex/flags` → regular expression,
 *   - contains `*` or `?` → glob,
 *   - otherwise → case-insensitive "contains".
 * An empty filter matches everything.
 */
export function matchesRuntimeFilter(name: string, uri: vscode.Uri): boolean {
  if (!runtimeFilter) {
    return true;
  }
  const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
  return matchesQuery(runtimeFilter, [name, rel]);
}

/** A node is shown when it matches the Filter box (name or path). */
export function passesFilter(name: string, uri: vscode.Uri): boolean {
  return matchesRuntimeFilter(name, uri);
}
