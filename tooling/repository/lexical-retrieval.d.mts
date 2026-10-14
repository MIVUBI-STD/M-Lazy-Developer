import type { CatalogResource } from "../../engine/packages/analysis-planner/src/retrieval.js";
import type { DocumentSection } from "../../engine/packages/analysis-planner/src/section-retrieval.js";
import type { RetrievedKnowledgeContext } from "../../engine/packages/orchestrator/src/workflow/resource-context.js";

/** JavaScript source implementation remains the only retrieval authority. */
export function readKnowledgeResourceContext(
  resource: CatalogResource,
  jsonCache?: Map<string, unknown>,
): RetrievedKnowledgeContext | undefined;
export function scoreResourcesLexically(
  resources: readonly CatalogResource[],
  query: string,
): Readonly<Record<string, number>>;
export function scoreSectionsLexically(
  sections: readonly DocumentSection[],
  query: string,
): Readonly<Record<string, number>>;
