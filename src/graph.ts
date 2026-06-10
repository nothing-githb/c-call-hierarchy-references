/**
 * Shared graph model rendered by the SVG webview (see graphView.ts). The call
 * graph was removed; this model is now produced by the include-graph builder
 * (see buildIncludeGraph in includes.ts).
 */
export interface GraphNode {
  id: string;
  label: string;
  file: string;
  line: number;
  uri: string;
  depth: number;
  isRoot: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphModel {
  /** A human-readable direction label (e.g. an include-graph direction). */
  direction: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
