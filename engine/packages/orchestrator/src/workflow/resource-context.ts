import type {
  RetrievalResult,
  SectionRetrievalResult,
} from "../../../analysis-planner/src/index.js";
import type {
  KnowledgeApplicability,
  KnowledgeClassification,
  KnowledgeRelationKind,
  KnowledgeSource,
} from "../../../knowledge/src/index.js";

// A retrieval result is evidence for investigation, never a claim of runtime
// behavior or target-version applicability.
export interface RetrievedKnowledgeContext {
  readonly kind: "fact" | "relation";
  readonly subject: string;
  readonly summary: string;
  readonly classification: KnowledgeClassification | "unspecified";
  readonly applicability: KnowledgeApplicability;
  readonly applicabilityStatus: "NOT_EVALUATED";
  readonly sourceIds: readonly string[];
  readonly sources: readonly KnowledgeSource[];
  readonly capabilityTags?: readonly string[];
  readonly riskSurfaces?: readonly string[];
  readonly diagnosticHints?: readonly string[];
  readonly relation?: {
    readonly kind: KnowledgeRelationKind;
    readonly object: string;
    readonly diagnosticHint?: string;
    readonly causalConsequences?: readonly string[];
  };
}

export interface CompiledResourceContextItem {
  readonly id: string;
  readonly class: string;
  readonly domain: string;
  readonly role?: string;
  readonly authority: string;
  readonly path: string;
  readonly locator?: string;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly knowledge?: RetrievedKnowledgeContext;
}

export interface CompiledResourceContext {
  readonly items: readonly CompiledResourceContextItem[];
  readonly omitted: number;
  readonly knowledgeContent?: {
    readonly status: "COMPLETE" | "PARTIAL";
    readonly missingResourceIds: readonly string[];
  };
}

function positiveMaximum(value: number | undefined): number {
  if (value === undefined) return 12;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Resource Context maximum must be a positive integer.");
  }
  return Math.min(value, 50);
}

export function compileResourceContext(
  selection: readonly RetrievalResult[] | undefined,
  maximum?: number,
  knowledgeByResourceId?: Readonly<Record<string, RetrievedKnowledgeContext>>,
): CompiledResourceContext | undefined {
  if (selection === undefined) return undefined;

  const limit = positiveMaximum(maximum);
  const selected = selection.slice(0, limit);
  const items = selected.map((result) => ({
    id: result.resource.id,
    class: result.resource.class,
    domain: result.resource.domain,
    ...(result.resource.role === undefined
      ? {}
      : { role: result.resource.role }),
    authority: result.resource.authority,
    path: result.resource.path,
    ...(result.resource.locator === undefined
      ? {}
      : { locator: result.resource.locator }),
    score: result.score.total,
    reasons: [...result.reasons],
    ...(result.resource.class === "KNOWLEDGE" &&
        knowledgeByResourceId?.[result.resource.id] !== undefined
      ? { knowledge: knowledgeByResourceId[result.resource.id] }
      : {}),
  }));
  const missingKnowledgeIds = knowledgeByResourceId === undefined
    ? []
    : selected
        .filter((result) =>
          result.resource.class === "KNOWLEDGE" &&
          knowledgeByResourceId[result.resource.id] === undefined
        )
        .map((result) => result.resource.id);

  return {
    items,
    omitted: Math.max(0, selection.length - items.length),
    ...(knowledgeByResourceId === undefined
      ? {}
      : {
          knowledgeContent: {
            status: missingKnowledgeIds.length === 0 ? "COMPLETE" as const : "PARTIAL" as const,
            missingResourceIds: missingKnowledgeIds,
          },
        }),
  };
}

export interface CompiledSectionContextItem {
  readonly id: string;
  readonly documentId: string;
  readonly path: string;
  readonly heading: string;
  readonly anchor: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface CompiledSectionContext {
  readonly items: readonly CompiledSectionContextItem[];
  readonly omitted: number;
}

export function compileSectionContext(
  selection: readonly SectionRetrievalResult[] | undefined,
  maximum?: number,
): CompiledSectionContext | undefined {
  if (selection === undefined) return undefined;

  const limit = positiveMaximum(maximum);
  const items = selection.slice(0, limit).map((result) => ({
    id: result.section.id,
    documentId: result.section.documentId,
    path: result.section.path,
    heading: result.section.heading,
    anchor: result.section.anchor,
    startLine: result.section.startLine,
    endLine: result.section.endLine,
    score: result.score.total,
    reasons: [...result.reasons],
  }));

  return {
    items,
    omitted: Math.max(0, selection.length - items.length),
  };
}