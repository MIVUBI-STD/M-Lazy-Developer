import type { CatalogResource } from "../../engine/packages/analysis-planner/src/retrieval.js";

/** Type contract for the existing ESM resource catalog; no parallel catalog. */
export function buildResourceCatalog(): {
  schemaVersion: 1;
  resources: CatalogResource[];
};
export function resourceIdForDocumentPath(path: string): string;
