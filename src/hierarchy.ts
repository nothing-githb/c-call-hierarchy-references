import * as vscode from 'vscode';
import { RefKind, isAddressOf, heuristicKind } from './textutil';

export { RefKind } from './textutil';

/**
 * Thin wrappers around VS Code's built-in call-hierarchy / reference commands.
 *
 * These commands delegate to whatever language provider is active for the file
 * (clangd, in our case), so we get clangd's full semantic accuracy without
 * managing a LanguageClient ourselves — we only consume and re-present the data.
 */

export type Direction = 'incoming' | 'outgoing';

const HEADER_RX = /\.(h|hh|hpp|hxx|h\+\+|inl)$/i;

/** Resolve the call-hierarchy item(s) for a position (the symbol under the cursor). */
export async function prepare(
  uri: vscode.Uri,
  position: vscode.Position,
): Promise<vscode.CallHierarchyItem[]> {
  const items =
    (await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
      'vscode.prepareCallHierarchy',
      uri,
      position,
    )) ?? [];
  // prepareCallHierarchy anchors on the symbol occurrence under the cursor. If
  // that is a DECLARATION in a header, clangd strips the call-site ranges of the
  // root's outgoing calls (they live in the .c, not the header), so callee→call
  // -site navigation breaks. Re-anchor such roots to the DEFINITION.
  return Promise.all(items.map(reanchorToDefinition));
}

/** If `item` is anchored in a header, move it to the symbol's definition. */
async function reanchorToDefinition(
  item: vscode.CallHierarchyItem,
): Promise<vscode.CallHierarchyItem> {
  if (!HEADER_RX.test(item.uri.path)) {
    return item;
  }
  try {
    const defs = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
      'vscode.executeDefinitionProvider',
      item.uri,
      item.selectionRange.start,
    );
    const d = defs?.[0];
    if (!d) {
      return item;
    }
    const defUri = 'targetUri' in d ? d.targetUri : d.uri;
    const defRange = 'targetUri' in d ? d.targetSelectionRange ?? d.targetRange : d.range;
    if (defUri.toString() === item.uri.toString()) {
      return item; // already the definition (e.g. a header-defined/inline function)
    }
    const re = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
      'vscode.prepareCallHierarchy',
      defUri,
      defRange.start,
    );
    return re?.[0] ?? item;
  } catch {
    return item;
  }
}

/** Callers of `item` (who calls it). */
export async function incoming(
  item: vscode.CallHierarchyItem,
): Promise<vscode.CallHierarchyIncomingCall[]> {
  const calls = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
    'vscode.provideIncomingCalls',
    item,
  );
  return calls ?? [];
}

/** Callees of `item` (what it calls). */
export async function outgoing(
  item: vscode.CallHierarchyItem,
): Promise<vscode.CallHierarchyOutgoingCall[]> {
  const calls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
    'vscode.provideOutgoingCalls',
    item,
  );
  return calls ?? [];
}

/** All references to the symbol under the cursor. */
export async function references(
  uri: vscode.Uri,
  position: vscode.Position,
): Promise<vscode.Location[]> {
  const locs = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    uri,
    position,
  );
  return locs ?? [];
}

/**
 * Step one level in `direction`, normalising both call kinds to the same shape:
 * the next item plus the call-site ranges that connect it to the parent.
 */
export async function step(
  item: vscode.CallHierarchyItem,
  direction: Direction,
): Promise<{ item: vscode.CallHierarchyItem; fromRanges: vscode.Range[] }[]> {
  if (direction === 'incoming') {
    const calls = await incoming(item);
    return calls.map((c) => ({ item: c.from, fromRanges: c.fromRanges }));
  }
  const calls = await outgoing(item);
  return calls.map((c) => ({ item: c.to, fromRanges: c.fromRanges }));
}

/** Stable identity for an item, used for cycle detection and graph node keys. */
export function itemKey(item: vscode.CallHierarchyItem): string {
  const r = item.selectionRange.start;
  return `${item.uri.toString()}#${item.name}@${r.line}:${r.character}`;
}

// ---------------------------------------------------------------------------
// Reference classification (read / write / declaration / definition)
//
// Standard LSP `references` returns plain Location[] with no read/write role.
// clangd DOES expose the role through `documentHighlight` (it maps clang's
// SymbolRole::Write/Read to DocumentHighlightKind.Write/.Read, else Text), so we
// recover the kind with one highlight call per file and override decl/def sites
// (which highlight as Text) using the definition/declaration providers.
// ---------------------------------------------------------------------------

export interface ClassifiedRef {
  location: vscode.Location;
  kind: RefKind;
}

function posKey(uri: vscode.Uri, r: vscode.Range): string {
  return `${uri.toString()}:${r.start.line}:${r.start.character}`;
}

/**
 * Position key identifying a decl/def site by its identifier token. Returns
 * undefined for a LocationLink without a selection range — its targetRange spans
 * the whole declaration, whose start would never match an identifier-scoped
 * reference, so we deliberately drop it rather than mis-key it.
 */
function declSiteKey(d: vscode.Location | vscode.LocationLink): string | undefined {
  if ('targetUri' in d) {
    return d.targetSelectionRange ? posKey(d.targetUri, d.targetSelectionRange) : undefined;
  }
  return posKey(d.uri, d.range);
}

function keySet(raw: (vscode.Location | vscode.LocationLink)[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const d of raw ?? []) {
    const k = declSiteKey(d);
    if (k) {
      out.add(k);
    }
  }
  return out;
}

/**
 * All references to the symbol at (uri, position), each tagged read/write/decl/def.
 * Degrades to RefKind.Unknown rather than throwing when clangd can't classify.
 */
export async function classifyReferences(
  uri: vscode.Uri,
  position: vscode.Position,
): Promise<ClassifiedRef[]> {
  // All provider calls degrade to empty rather than throwing: clangd may still
  // be indexing, or a request may be cancelled mid-flight.
  let refs: vscode.Location[];
  try {
    refs = await references(uri, position);
  } catch {
    return [];
  }
  if (refs.length === 0) {
    return [];
  }

  // Decl/def sites (one call each); a definition is also a declaration in clangd,
  // so resolve these first — their highlight kind would otherwise be Text.
  let defSet = new Set<string>();
  let declSet = new Set<string>();
  try {
    const [defsRaw, declsRaw] = await Promise.all([
      vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
        'vscode.executeDefinitionProvider',
        uri,
        position,
      ),
      vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
        'vscode.executeDeclarationProvider',
        uri,
        position,
      ),
    ]);
    defSet = keySet(defsRaw);
    declSet = keySet(declsRaw);
  } catch {
    /* leave decl/def sets empty → those sites fall back to highlight kind */
  }

  // Group references by file so we issue exactly one highlight call per file.
  const byFile = new Map<string, vscode.Location[]>();
  for (const r of refs) {
    const k = r.uri.toString();
    let bucket = byFile.get(k);
    if (!bucket) {
      bucket = [];
      byFile.set(k, bucket);
    }
    bucket.push(r);
  }

  const out: ClassifiedRef[] = [];
  // Bounded concurrency: each highlight call may force clangd to parse a TU.
  await mapWithConcurrency([...byFile.entries()], 8, async ([uriStr, locs]) => {
    const fileUri = vscode.Uri.parse(uriStr);
    // Highlights (read/write roles) and the document (for address-of detection
    // and the syntactic fallback) are fetched concurrently. The highlight call
    // already backs the document in clangd, so openTextDocument is near-free.
    const [highlights, doc] = await Promise.all([
      vscode.commands
        .executeCommand<vscode.DocumentHighlight[]>(
          'vscode.executeDocumentHighlights',
          fileUri,
          locs[0].range.start,
        )
        .then((h) => h ?? [], () => [] as vscode.DocumentHighlight[]),
      vscode.workspace.openTextDocument(fileUri).then((d) => d, () => undefined),
    ]);

    for (const loc of locs) {
      const key = posKey(loc.uri, loc.range);
      const line = doc ? doc.lineAt(loc.range.start.line).text : undefined;
      let kind: RefKind;
      if (defSet.has(key)) {
        kind = RefKind.Definition;
      } else if (declSet.has(key)) {
        kind = RefKind.Declaration;
      } else if (
        line !== undefined &&
        isAddressOf(line, loc.range.start.character, loc.range.end.character)
      ) {
        // &x — address taken; a potential write through the resulting pointer.
        kind = RefKind.Address;
      } else {
        const hl =
          highlights.find((x) => x.range.start.isEqual(loc.range.start)) ??
          highlights.find((x) => x.range.contains(loc.range.start));
        if (hl?.kind === vscode.DocumentHighlightKind.Write) {
          kind = RefKind.Write;
        } else if (hl?.kind === vscode.DocumentHighlightKind.Read) {
          kind = RefKind.Read;
        } else {
          kind = heuristicKind(line, loc.range.start.character, loc.range.end.character);
        }
      }
      out.push({ location: loc, kind });
    }
  });

  return out;
}

// ---------------------------------------------------------------------------
// Function signatures (parameter types) for call-hierarchy items
//
// CallHierarchyItem.detail is the enclosing scope (often empty for free C
// functions), never the parameter list. We recover the signature via hover
// (gives parameter names) and fall back to DocumentSymbol.detail (types only).
// ---------------------------------------------------------------------------

const sigCache = new Map<string, string | undefined>();

export interface Signature {
  /** Full declaration, e.g. `void foo(int a, char *b)` (best effort). */
  full: string;
  /** Just the parameter list, e.g. `(int a, char *b)`. */
  params: string;
}

/** Resolve a function's signature; cached by item key. undefined if unavailable. */
export async function signature(item: vscode.CallHierarchyItem): Promise<Signature | undefined> {
  const key = itemKey(item);
  if (sigCache.has(key)) {
    return toSignature(sigCache.get(key));
  }
  const pos = item.selectionRange.start; // the identifier token

  // Tier 1 — hover markdown contains the full declaration WITH parameter names.
  let full: string | undefined;
  try {
    const hovers =
      (await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        item.uri,
        pos,
      )) ?? [];
    const md = hovers
      .flatMap((h) => h.contents)
      .map((c) => (typeof c === 'string' ? c : (c as { value?: string }).value ?? ''))
      .join('\n');
    // Pick the first fenced block that looks like a declaration (has a paren) —
    // robust against a non-declaration fence (e.g. ```text) appearing first.
    const fenceRe = /```[a-zA-Z+#-]*\r?\n([\s\S]*?)```/g;
    let fm: RegExpExecArray | null;
    while ((fm = fenceRe.exec(md)) !== null) {
      const body = fm[1].trim().replace(/\s+/g, ' ');
      if (body.includes('(')) {
        full = body;
        break;
      }
    }
  } catch {
    /* clangd indexing — degrade */
  }

  // Tier 2 — DocumentSymbol.detail gives the type signature (no names).
  if (!full) {
    try {
      const syms =
        (await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
          'vscode.executeDocumentSymbolProvider',
          item.uri,
        )) ?? [];
      const match = findTightest(syms, item.name, pos);
      if (match?.detail) {
        // detail looks like `void (int, char *)`; keep just the balanced param
        // list and prefix the name → `foo(int, char *)`. Avoids mis-splicing when
        // the return type itself contains parens (e.g. `void (*)(int)`).
        const params = extractParams(match.detail.replace(/\s+/g, ' ').trim());
        if (params) {
          full = `${item.name}${params}`;
        }
      }
    } catch {
      /* no symbols — degrade */
    }
  }

  sigCache.set(key, full);
  return toSignature(full);
}

function toSignature(full: string | undefined): Signature | undefined {
  if (!full) {
    return undefined;
  }
  return { full, params: extractParams(full) };
}

/**
 * Slice the balanced parameter list `(...)` from a declaration string. Only
 * parentheses are counted for nesting — `<`/`>` are ambiguous with comparison
 * and shift operators in default arguments, and clangd already balances any
 * template brackets inside the single param `()` group.
 */
function extractParams(decl: string): string {
  const open = decl.indexOf('(');
  if (open < 0) {
    return '';
  }
  let depth = 0;
  for (let i = open; i < decl.length; i++) {
    const c = decl[i];
    if (c === '(') {
      depth++;
    } else if (c === ')') {
      depth--;
      if (depth === 0) {
        return decl.slice(open, i + 1);
      }
    }
  }
  return decl.slice(open);
}

/**
 * Find the DocumentSymbol that best identifies `name` at `pos`: same name, range
 * contains the position, prefer callable kinds, then the tightest range (handles
 * overloads). Recurses into `.children`; tolerates SymbolInformation[] shape.
 */
function findTightest(
  syms: vscode.DocumentSymbol[],
  name: string,
  pos: vscode.Position,
): vscode.DocumentSymbol | undefined {
  let best: vscode.DocumentSymbol | undefined;
  let bestSize = Number.POSITIVE_INFINITY;
  let bestCallable = false;
  const visit = (list: vscode.DocumentSymbol[]) => {
    for (const s of list) {
      if (!('range' in s) || !s.range) {
        continue;
      }
      if (s.name === name && s.range.contains(pos)) {
        const size = s.range.end.line - s.range.start.line;
        const callable =
          s.kind === vscode.SymbolKind.Function ||
          s.kind === vscode.SymbolKind.Method ||
          s.kind === vscode.SymbolKind.Constructor;
        // Callable strictly dominates; within the same callability, tighter wins.
        const better =
          best === undefined ||
          (callable && !bestCallable) ||
          (callable === bestCallable && size < bestSize);
        if (better) {
          best = s;
          bestSize = size;
          bestCallable = callable;
        }
      }
      if (s.children?.length) {
        visit(s.children);
      }
    }
  };
  visit(syms);
  return best;
}

/** Run `fn` over `items` with at most `limit` in flight at once. */
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}
