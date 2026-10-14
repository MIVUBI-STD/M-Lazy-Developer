import type { GraphEdge } from "../../engine/packages/analysis-planner/src/retrieval.js";

/** Declarative type view over the existing JavaScript graph builder. */
export function buildGraph(): {
  schemaVersion: 1;
  edges: GraphEdge[];
};
export function documentGraphRootId(): string;
