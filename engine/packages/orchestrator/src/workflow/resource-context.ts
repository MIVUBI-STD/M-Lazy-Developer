import type {
  RetrievalResult,
  SectionRetrievalResult,
} from "../../../analysis-planner/src/index.js";
import {
  evaluateKnowledgeApplicabilityV2,
  runtimeConstraintFromLegacyKnowledgeApplicability,
  type KnowledgeApplicabilityDecision,
} from "../../../knowledge/src/index.js";
import {
  validateMinecraftRuntimeProfile,
  type MinecraftRuntimeProfile,
} from "../../../runtime-profile/src/index.js";
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

export type KnowledgeTargetApplicability =
  | KnowledgeApplicabilityDecision
  | {
      readonly state: "not-evaluated";
      readonly reasons: readonly string[];
      readonly missing: readonly string[];
    };

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
  /** Applicability to a supplied profile; NOT Minecraft runtime proof. */
  readonly targetApplicability?: KnowledgeTargetApplicability;
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
  targetProfile?: MinecraftRuntimeProfile,
): CompiledResourceContext | undefined {
  if (selection === undefined) return undefined;
  if (targetProfile !== undefined) {
    const issues = validateMinecraftRuntimeProfile(targetProfile);
    if (issues.length > 0) {
      throw new Error("Invalid Knowledge target runtime profile: " + issues.join("; "));
    }
  }

  const limit = positiveMaximum(maximum);
  const selected = selection.slice(0, limit);
  const items = selected.map((result) => {
    const knowledge = result.resource.class === "KNOWLEDGE"
      ? knowledgeByResourceId?.[result.resource.id]
      : undefined;
    const targetApplicability: KnowledgeTargetApplicability | undefined =
      knowledge === undefined
        ? undefined
        : targetProfile === undefined
          ? {
              state: "not-evaluated",
              reasons: ["No selected Minecraft runtime profile was supplied."],
              missing: ["runtime-profile"],
            }
          : evaluateKnowledgeApplicabilityV2(
              runtimeConstraintFromLegacyKnowledgeApplicability(
                knowledge.applicability,
              ),
              targetProfile,
            );
    return {
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
      ...(knowledge === undefined ? {} : { knowledge }),
      ...(targetApplicability === undefined ? {} : { targetApplicability }),
    };
  });
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

/**
 * Strict, read-only selection of developer-origin reference hints inside the
 * existing Resource Context owner. The JSON companion is loaded explicitly
 * by the operator/caller; no hidden ZIP scan, new registry, game rule,
 * authored Intent edge, issue classification or runtime assertion is created.
 *
 * A matching sourceSignal is a lookup cue, NOT evidence that a mechanic
 * executed or the suggested gameplay relation is true.
 */
export interface DeveloperPracticeReferenceData {
  readonly authority: "REFERENCE";
  readonly usagePolicy: "CONTEXT_HINT_ONLY_NOT_GAME_DESIGN_OR_DEFECT_PROOF";
  readonly sourceSnapshot: { readonly archiveSha256: string };
  readonly sourceFiles: readonly {
    readonly id: string;
    readonly path: string;
    readonly sha256: string;
    readonly auditUsage?: string;
  }[];
  readonly patterns: readonly {
    readonly id: string;
    readonly sourceId: string;
    readonly kind: string;
    readonly status: string;
    readonly domains: readonly string[];
    readonly sourceSignals: readonly string[];
    readonly question: string;
    readonly candidateRelations: readonly string[];
    readonly negativeControl: string;
    readonly versionApplicability: string;
    readonly prohibits: string;
  }[];
}

export interface SelectedArtifactReferenceSignal {
  /** Exact selected-source observation, not a query string or a ZIP claim. */
  readonly evidenceId: string;
  readonly artifactId: string;
  readonly sourcePath: string;
  /** A recognized symbol/semantic cue. Exact token comparison only. */
  readonly signal: string;
}

export interface CompiledDeveloperPracticeReferenceContext {
  readonly authority: "REFERENCE";
  readonly status: "INVESTIGATION_HINTS_ONLY";
  readonly selectedArtifactId: string;
  readonly archiveSha256: string;
  readonly items: readonly {
    readonly patternId: string;
    readonly sourceId: string;
    readonly sourcePath: string;
    readonly sourceSha256: string;
    readonly status: "SOURCE_REVIEWED" | "CORROBORATED";
    readonly question: string;
    readonly candidateRelations: readonly string[];
    readonly negativeControl: string;
    readonly versionApplicability: string;
    readonly prohibits: string;
    readonly matchingEvidenceIds: readonly string[];
    readonly matchingSourcePaths: readonly string[];
    readonly matchingSignals: readonly string[];
  }[];
  readonly omitted: number;
}

/**
 * No observed source identity or no specific interpretation domain means
 * ABSTAIN, not a broad keyword search that floods a selected-map audit.
 * The default maximum of two is a developer-reference context budget, not
 * a threshold for gameplay understanding or defect detection.
 */
export function compileDeveloperPracticeReferenceContext(input: {
  readonly data: DeveloperPracticeReferenceData;
  readonly selectedArtifactId: string;
  readonly evidence: readonly SelectedArtifactReferenceSignal[];
  readonly domains: readonly string[];
  readonly maximum?: number;
}): CompiledDeveloperPracticeReferenceContext | undefined {
  const { data, selectedArtifactId } = input;
  if (data.authority !== "REFERENCE" ||
      data.usagePolicy !== "CONTEXT_HINT_ONLY_NOT_GAME_DESIGN_OR_DEFECT_PROOF" ||
      !/^[a-f0-9]{64}$/.test(data.sourceSnapshot.archiveSha256) ||
      !selectedArtifactId.trim()) return undefined;
  const queryDomains = new Set(input.domains.filter(Boolean));
  const observed = input.evidence.filter(item =>
    item.artifactId === selectedArtifactId &&
    item.evidenceId.trim() !== "" && item.sourcePath.trim() !== "" &&
    item.signal.trim() !== "");
  if (queryDomains.size === 0 || observed.length === 0) return undefined;
  const sourceById = new Map(data.sourceFiles.map(file => [file.id, file]));
  const sorted = (items: readonly string[]) => [...new Set(items)].sort();
  const candidates = data.patterns.flatMap(pattern => {
    if (pattern.status !== "SOURCE_REVIEWED" &&
        pattern.status !== "CORROBORATED") return [];
    if (!pattern.domains.some(domain => queryDomains.has(domain))) return [];
    const source = sourceById.get(pattern.sourceId);
    if (!source || source.auditUsage !== "INTERPRETATION_CANDIDATE" ||
        !/^[a-f0-9]{64}$/.test(source.sha256) ||
        !pattern.question.trim() || !pattern.negativeControl.trim() ||
        !pattern.prohibits.trim()) return [];
    const cue = new Set(pattern.sourceSignals);
    const matches = observed.filter(item => cue.has(item.signal));
    if (matches.length === 0) return [];
    return [{
      patternId: pattern.id,
      sourceId: source.id,
      sourcePath: source.path,
      sourceSha256: source.sha256,
      status: pattern.status as "SOURCE_REVIEWED" | "CORROBORATED",
      question: pattern.question,
      candidateRelations: [...pattern.candidateRelations],
      negativeControl: pattern.negativeControl,
      versionApplicability: pattern.versionApplicability,
      prohibits: pattern.prohibits,
      matchingEvidenceIds: sorted(matches.map(item => item.evidenceId)),
      matchingSourcePaths: sorted(matches.map(item => item.sourcePath)),
      matchingSignals: sorted(matches.map(item => item.signal)),
    }];
  }).sort((a, b) =>
    b.matchingEvidenceIds.length - a.matchingEvidenceIds.length ||
    a.patternId.localeCompare(b.patternId));
  const limit = input.maximum === undefined ? 2 :
    Math.min(2, Math.max(0, Math.floor(input.maximum)));
  return {
    authority: "REFERENCE",
    status: "INVESTIGATION_HINTS_ONLY",
    selectedArtifactId,
    archiveSha256: data.sourceSnapshot.archiveSha256,
    items: candidates.slice(0, limit),
    omitted: Math.max(0, candidates.length - limit),
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