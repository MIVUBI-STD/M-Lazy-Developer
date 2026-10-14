import type { CatalogResource } from "../../engine/packages/analysis-planner/src/retrieval.js";
import type { DocumentSection } from "../../engine/packages/analysis-planner/src/section-retrieval.js";

/** Source metadata consumed by the canonical document-section indexer. */
export function indexDocumentSections(resource: CatalogResource): DocumentSection[];
export function buildDocumentSectionIndex(): {
  schemaVersion: 1;
  sections: DocumentSection[];
};
