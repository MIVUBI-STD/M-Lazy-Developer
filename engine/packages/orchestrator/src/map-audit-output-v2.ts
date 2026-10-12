import { parseLocalizedStageKey } from "./inspection/gameplay-intent-resource-text.js";
import type {
  GameDesignMapClassification,
} from "../../game-design-spec/src/index.js";
import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
} from "../../gameplay-intent/src/index.js";
import type {
  InspectArtifactResult,
} from "./inspection/inspect-artifact.js";
import type {
  SelectedMapAuditIdentity,
} from "./map-audit-identity.js";
import type {
  AuditIssueProjection,
  NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";
import type {
  AuditValidationTestGroup,
} from "./map-audit-validation-plan.js";
import type {
  AuditHonestyAssessment,
} from "./map-audit-honesty.js";
import type {
  FullMapReplicaReceipt,
} from "./arena/full-map-replica-receipt.js";
import type {
  AuditObligation,
} from "./map-audit-obligations.js";
import type {
  GameplayArchitectureNavigation,
} from "./inspection/gameplay-scenario-model.js";
import type {
  AuditUserIntentEnvelope,
} from "./map-audit-user-intent.js";
import type { AuditModelTaskPacket } from "./map-audit-model-task.js";
import {
  deriveMapAuditQualityGates,
  type MapAuditQualityGates,
} from "./map-audit-quality-gates.js";

export interface MapAuditOutputV2FindingReasoning {
  readonly reportClassification:
    | "PROVEN BUG"
    | "LIKELY BUG"
    | "RISK"
    | "DESIGN MISMATCH"
    | "UNKNOWN"
    | "EXPECTED";
  readonly diagnosticDisposition?: string;
  readonly proofConfidence:
    | "unknown"
    | "low"
    | "medium"
    | "high"
    | "proven";
  readonly evidenceDomainSources: readonly string[];
  readonly evidenceChain: readonly string[];
  readonly unresolvedPredicates: readonly string[];
  readonly recommendedValidationPredicate?: string;
  readonly recommendedReadOnlyProbeId?: string;
}

export interface MapAuditOutputV2Finding {
  readonly id: string;
  readonly status: "PROVEN" | "NEED_VALIDATION";
  readonly issueType: "BUG" | "DESIGN_MISMATCH";
  readonly gameplayFlow: string;
  readonly failureDomain: string;
  readonly contributingDomains: readonly string[];
  readonly informationMismatch: boolean;
  readonly playerFacingEvidenceIds: readonly string[];
  readonly issue: string;
  readonly playerImpact: string;
  readonly reproduceSteps: readonly string[];
  readonly expected: string;
  readonly actual: string;
  readonly evidenceIds: readonly string[];
  readonly proofCeiling:
    | "PROVEN"
    | "NEEDS_DECIDING_PROOF";
  readonly counterEvidence:
    | "cleared"
    | "unresolved";
  readonly validationReason?: string;
  readonly missingProof?: string;
  readonly validationTest?: string;
  readonly validationGroupKey?: string;
  readonly proofNavigation?:
    NeedValidationAuditIssueProjection["proofNavigation"];
  readonly reasoning?: MapAuditOutputV2FindingReasoning;
}

export interface MapAuditOutputControl {
  readonly status: "READY_FOR_REVIEW" | "BLOCKED";
  readonly currentStage:
    | "TARGET"
    | "DISCOVERY"
    | "UNDERSTAND"
    | "MODEL"
    | "STRESS"
    | "PROVE"
    | "REPORT"
    | "COMPLETE";
  readonly allowedNextAction:
    | "RESOLVE_BLOCKING_STAGE"
    | "RESOLVE_DEFECTS"
    | "PREPARE_REVIEW";
  readonly continuationOwner:
    | "ENGINE_OR_EVIDENCE"
    | "DEFECT_RESOLUTION"
    | "REVIEW";
  readonly requiresNewAuditRun: boolean;
  readonly blockingCheckpointIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface MapAuditOutputV2 {
  readonly schemaVersion: 2;
  readonly artifactId: string;
  /** SHA-256 of selected archive bytes, always projected by current engine.
   * Optional for legacy V2 data, not an attestation of executable Git commit.
   */
  readonly artifactFingerprint?: string;
  /** Configured audit target, not a verified Minecraft runtime platform. */
  readonly auditTarget?: {
    readonly edition: "bedrock" | "education" | "unknown";
    readonly minecraftVersion?: string;
    readonly source: "selected-audit-runtime-target-not-live-observation";
  };
  readonly mapVersion: string;
  readonly control: MapAuditOutputControl;
  readonly userIntent?: AuditUserIntentEnvelope;
  readonly mapClassification?: {
    readonly use: "audit-routing-only";
    readonly classification:
      GameDesignMapClassification;
  };
  readonly evidenceScope: {
    readonly mode: "selected-map-version-only";
    readonly selectedArtifact: string;
    readonly archiveSourcesUsed: false;
  };
  readonly gameDesign: {
    readonly objective: string;
    readonly objectiveGrounding:
      | "authored"
      | "inferred"
      | "unresolved";
    readonly winCondition: string;
    readonly winConditionGrounding:
      | "authored"
      | "inferred"
      | "unresolved";
    readonly loseCondition: string;
    readonly loseConditionGrounding:
      | "authored"
      | "inferred"
      | "unresolved";
    readonly resetRules: readonly string[];
    readonly preserveRules: readonly string[];
    readonly progressionRules: readonly string[];
  };
  /** Audit checklist stages, NOT a reconstructed or observed player route. */
  readonly gameplayFlow: readonly string[];
  readonly gameplayFlowBasis: "AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY";
  /** Derived game-centric source navigation; not a second Game Design or bug authority. */
  readonly gameplayStructure?: GameplayArchitectureNavigation["gameplayStructure"];
  readonly stateTransitions: readonly {
    readonly from: string;
    readonly event: string;
    readonly to: string;
    readonly notes?: string;
  }[];
  readonly multiArena: {
    readonly detected: boolean;
    readonly visibleArenaCount: number | null;
    readonly declaredConcurrentArenaLimit: number | null;
    readonly safeConcurrentArenaLimit: number | null;
    readonly queueBehavior: string;
    readonly isolationRules: readonly string[];
  };
  readonly coverage: {
    readonly disposition:
      | "accounted"
      | "incomplete";
    readonly records: readonly {
      readonly surface: string;
      readonly status:
        | "understood"
        | "blocked"
        | "not-applicable";
      readonly reason?: string;
      readonly evidenceIds: readonly string[];
    }[];
  };
  readonly gameplayClosure: {
    readonly status: "CLOSED" | "PARTIAL" | "OPEN";
    readonly surfaceInventory: readonly {
      readonly id: string;
      readonly label: string;
      readonly kind: string;
      readonly status:
        | "understood"
        | "blocked"
        | "unknown"
        | "not-applicable";
      readonly reason?: string;
      readonly boundaries: readonly string[];
    }[];
    readonly stateModelComplete: boolean;
    readonly boundariesExtracted: boolean;
    readonly unaccountedSurfaceIds: readonly string[];
    readonly notes: string;
  };
  readonly bugs: readonly MapAuditOutputV2Finding[];
  readonly designMismatches:
    readonly MapAuditOutputV2Finding[];
  readonly auditObligations?:
    readonly AuditObligation[];
  readonly validationTests:
    readonly AuditValidationTestGroup[];
  /**
   * Derived visibility index only. It never changes issue type/proof state and
   * exists so gray-zone evidence cannot disappear from the human report.
   */
  readonly unresolved: {
    readonly status:
      | "CLEAR"
      | "HAS_UNRESOLVED";
    readonly total: number;
    readonly needValidationIds: readonly string[];
    readonly staticProofPendingIds: readonly string[];
    readonly runtimeRequiredIds: readonly string[];
    readonly auditObligationIds: readonly string[];
    readonly unknownSurfaceIds: readonly string[];
  };
  readonly honesty: AuditHonestyAssessment;
  readonly qualityGates: MapAuditQualityGates;
  readonly fullMapReplica?: FullMapReplicaReceipt;
}

const PLAYER_FLOW = [
  "ENTRY_JOIN",
  "READY_START",
  "SETUP",
  "ACTIVE_GAMEPLAY",
  "PROGRESSION",
  "TERMINAL",
  "CLEANUP_REPLAY",
  "RECOVERY",
] as const;

function nodeText(
  node: GameplayIntentNode | undefined,
): string | undefined {
  const value =
    node?.description?.trim() ||
    node?.label.trim();
  return value || undefined;
}

function selectedSourceIds(model: GameplayIntentModel): Set<string> {
  return new Set((model.evidence ?? []).filter(item =>
    item.scope === "selected-artifact").map(item => item.id));
}

function independentlyAuthoredDesign(
  model: GameplayIntentModel,
  ids: readonly string[],
): boolean {
  const byId = new Map((model.evidence ?? []).map(item => [item.id, item]));
  return ids.some(id => {
    const source = byId.get(id);
    return source?.scope === "selected-artifact" &&
      source.origin === "game-design-spec";
  });
}

/**
 * Preserve a bounded view of distinct selected-artifact design candidates.
 * Their source identity is retained in the original GameplayIntentModel;
 * textual alternatives do not establish mutual reachability or mode scope.
 */
function summarizeSourceAlternatives(
  subject: string,
  missingScope: string,
  statements: readonly string[],
): string {
  const shown = statements.slice(0, 3).map(statement =>
    JSON.stringify(statement.replace(/\s+/g, " ").trim().slice(0, 65)),
  );
  const omitted = statements.length - shown.length;
  return "Multiple source-backed " + subject + " (" + statements.length +
    "; " + missingScope + " unresolved): " + shown.join("; ") +
    (omitted > 0 ? "; +" + omitted + " further candidates." : ".");
}

function summarizeSourceObjectives(model: GameplayIntentModel): {
  readonly text: string;
  readonly grounding: "authored" | "inferred" | "unresolved";
} {
  const selected = selectedSourceIds(model);
  const candidates = (model.nodes ?? []).filter(node =>
    node.kind === "objective" && node.status !== "hypothesis" &&
    node.evidenceIds.some(id => selected.has(id)))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (candidates.length === 0) return {
    text: "Unresolved from selected artifact.",
    grounding: "unresolved",
  };
  // Multiple real modes can have different objectives. Do not collapse
  // their selected-source statements to an unhelpful count, and do not imply
  // that any candidate is the one map-wide/player-wide objective.
  if (candidates.length > 1) return {
    text: summarizeSourceAlternatives(
      "objective candidates",
      "player/mode scope",
      candidates.map(node => nodeText(node) ?? node.id),
    ),
    grounding: "unresolved",
  };
  const node = candidates[0]!;
  return {
    text: nodeText(node) ?? "Unresolved from selected artifact.",
    grounding: node.status === "authored" &&
      independentlyAuthoredDesign(model, node.evidenceIds)
      ? "authored" : "inferred",
  };
}

function edgeStatement(
  edge: GameplayIntentEdge,
  nodes: ReadonlyMap<string, GameplayIntentNode>,
): string {
  if (edge.description?.trim()) {
    return edge.description.trim();
  }
  const from =
    nodeText(nodes.get(edge.from)) ?? edge.from;
  const to =
    nodeText(nodes.get(edge.to)) ?? edge.to;
  return from + " " + edge.kind + " " + to;
}

function outcomeFor(
  model: GameplayIntentModel,
  kind: "wins-by" | "loses-by",
): {
  readonly text: string;
  readonly grounding: "authored" | "inferred" | "unresolved";
} | undefined {
  const nodes = new Map((model.nodes ?? []).map(node => [node.id, node]));
  const source = selectedSourceIds(model);
  const current = (ids: readonly string[]) =>
    ids.some(id => source.has(id));
  const candidates = (model.edges ?? []).filter(edge =>
    edge.kind === kind && edge.status !== "hypothesis" &&
    current(edge.evidenceIds) &&
    current(nodes.get(edge.from)?.evidenceIds ?? []) &&
    current(nodes.get(edge.to)?.evidenceIds ?? []))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (candidates.length > 1) return {
    text: summarizeSourceAlternatives(
      kind + " relations",
      "mode/player scope",
      candidates.map(edge => edgeStatement(edge, nodes)),
    ),
    grounding: "unresolved",
  };
  const edge = candidates[0];
  if (edge === undefined) return undefined;
  return {
    text: edgeStatement(edge, nodes),
    grounding: edge.status === "authored" &&
      independentlyAuthoredDesign(model, edge.evidenceIds)
      ? "authored" : "inferred",
  };
}

function projectFinding(
  finding: AuditIssueProjection,
  reasoningByCausalLinkId?: Readonly<Record<string, MapAuditOutputV2FindingReasoning>>,
): MapAuditOutputV2Finding {
  const base = {
    id: finding.causalLinkId,
    status: finding.status,
    issueType: finding.issueType,
    gameplayFlow: finding.gameplayFlow,
    failureDomain: finding.failureDomain,
    contributingDomains:
      [...finding.contributingDomains],
    informationMismatch:
      finding.informationMismatch,
    playerFacingEvidenceIds:
      [...finding.playerFacingEvidenceIds],
    issue: finding.gameplayConsequence,
    playerImpact: finding.gameplayConsequence,
    reproduceSteps: [
      finding.gameplayTrigger,
      "Observe whether: " + finding.actualOutcome,
    ],
    expected: finding.expectedOutcome,
    actual: finding.actualOutcome,
    evidenceIds: [...finding.evidenceIds],
    proofCeiling:
      finding.status === "PROVEN"
        ? "PROVEN" as const
        : "NEEDS_DECIDING_PROOF" as const,
    counterEvidence:
      finding.status === "PROVEN"
        ? "cleared" as const
        : "unresolved" as const,
    ...(reasoningByCausalLinkId?.[finding.causalLinkId] === undefined
      ? {}
      : { reasoning: reasoningByCausalLinkId[finding.causalLinkId] }),
  };

  if (finding.status === "PROVEN") {
    return base;
  }

  if (finding.proofNavigation === undefined) {
    throw new Error(
      "NEED_VALIDATION finding is missing proofNavigation: " +
        finding.causalLinkId +
        ".",
    );
  }

  return {
    ...base,
    validationReason:
      finding.validationReason,
    missingProof:
      finding.missingProof,
    validationTest:
      finding.validationTest,
    validationGroupKey:
      finding.validationGroupKey,
    proofNavigation:
      finding.proofNavigation,
  };
}

export function projectMapAuditOutputV2(input: {
  readonly inspection: InspectArtifactResult;
  readonly identity: SelectedMapAuditIdentity;
  readonly issueLanes: {
    readonly BUG: readonly AuditIssueProjection[];
    readonly DESIGN_MISMATCH:
      readonly AuditIssueProjection[];
  };
  readonly auditObligations:
    readonly AuditObligation[];
  readonly validationTests:
    readonly AuditValidationTestGroup[];
  readonly honesty: AuditHonestyAssessment;
  readonly userIntent?: AuditUserIntentEnvelope;
  readonly control: MapAuditOutputControl;
  readonly fullMapReplica?: FullMapReplicaReceipt;
  readonly gameplayStructure?: GameplayArchitectureNavigation["gameplayStructure"];
  readonly reasoningByCausalLinkId?: Readonly<Record<string, MapAuditOutputV2FindingReasoning>>;
}): MapAuditOutputV2 {
  const model =
    input.inspection.gameplayIntent.model;
  const nodes = new Map(
    model.nodes.map((node) => [node.id, node]),
  );
  const sourceIds = selectedSourceIds(model);
  const isCurrent = (ids: readonly string[]): boolean =>
    ids.some(id => sourceIds.has(id));
  const currentEdge = (edge: GameplayIntentEdge): boolean =>
    isCurrent(edge.evidenceIds) &&
    isCurrent(nodes.get(edge.from)?.evidenceIds ?? []) &&
    isCurrent(nodes.get(edge.to)?.evidenceIds ?? []);
  const objectiveSummary = summarizeSourceObjectives(model);
  const objective = objectiveSummary.text;
  const objectiveGrounding = objectiveSummary.grounding;
  const win = outcomeFor(model, "wins-by");
  const lose = outcomeFor(model, "loses-by");
  const winCondition = win?.text ?? "Unresolved from selected artifact.";
  const loseCondition = lose?.text ?? "Unresolved from selected artifact.";

  const resetRules = model.edges
    .filter((edge) =>
      edge.kind === "resets" &&
      edge.status !== "hypothesis" && currentEdge(edge)
    )
    .map((edge) => edgeStatement(edge, nodes))
    .sort();
  const preserveRules = model.edges
    .filter((edge) =>
      edge.kind === "persists" &&
      edge.status !== "hypothesis" && currentEdge(edge)
    )
    .map((edge) => edgeStatement(edge, nodes))
    .sort();
  const progressionRules = [
    ...model.edges
      .filter((edge) =>
        (
          edge.kind === "transitions-to" ||
          edge.kind === "produces" ||
          edge.kind === "consumes"
        ) &&
        edge.status !== "hypothesis" &&
        currentEdge(edge)
      )
      .map((edge) => edgeStatement(edge, nodes)),
    ...model.invariants
      .filter((item) =>
        item.status !== "hypothesis" &&
        isCurrent(item.evidenceIds) &&
        item.subjectIds.every(id =>
          isCurrent(nodes.get(id)?.evidenceIds ?? []))
      )
      .map((item) => item.statement.trim())
      .filter(Boolean),
  ].filter(
    (value, index, all) =>
      all.indexOf(value) === index,
  ).sort();

  const stateTransitions = model.edges
    .filter((edge) =>
      (
        edge.kind === "transitions-to" ||
        edge.kind === "recovers-to"
      ) &&
      edge.status !== "hypothesis" && currentEdge(edge)
    )
    .map((edge) => ({
      from:
        nodeText(nodes.get(edge.from)) ??
        edge.from,
      event: edge.kind,
      to:
        nodeText(nodes.get(edge.to)) ??
        edge.to,
      ...(edge.description?.trim()
        ? { notes: edge.description.trim() }
        : {}),
    }));

  const world = input.inspection.gameplayWorld;
  const closure = world.gameplayClosure;
  const coverageRecords = closure.surfaces.map(
    (surface) => ({
      surface: surface.id,
      status:
        surface.status === "understood"
          ? "understood" as const
          : surface.status === "not-applicable"
            ? "not-applicable" as const
            : "blocked" as const,
      ...(surface.reason === undefined
        ? {}
        : { reason: surface.reason }),
      evidenceIds:
        [...(surface.evidenceIds ?? [])],
    }),
  );

  const coverageDisposition =
    closure.status === "CLOSED" &&
    closure.unaccountedSurfaceIds.length === 0 &&
    closure.stateModelComplete &&
    closure.boundariesExtracted
      ? "accounted" as const
      : "incomplete" as const;
  const allFindings = [
    ...input.issueLanes.BUG,
    ...input.issueLanes.DESIGN_MISMATCH,
  ];
  const needValidationIds = allFindings
    .filter((finding) =>
      finding.status === "NEED_VALIDATION"
    )
    .map((finding) => finding.causalLinkId)
    .sort();
  const runtimeRequiredIds = input.validationTests
    .filter((group) =>
      group.verificationMode ===
        "NARROW_RUNTIME_VERIFICATION"
    )
    .flatMap((group) => group.findingIds)
    .filter((id, index, values) =>
      values.indexOf(id) === index
    )
    .sort();
  const runtimeRequiredSet =
    new Set(runtimeRequiredIds);
  const staticProofPendingIds =
    needValidationIds
      .filter((id) =>
        !runtimeRequiredSet.has(id)
      )
      .sort();
  const auditObligationIds =
    input.auditObligations
      .map((item) => item.id)
      .sort();
  const unknownSurfaceIds =
    closure.surfaces
      .filter((surface) =>
        surface.status === "unknown"
      )
      .map((surface) => surface.id)
      .sort();
  const unresolvedIds = new Set([
    ...needValidationIds,
    ...auditObligationIds,
    ...unknownSurfaceIds,
  ]);
  const unresolved = {
    status:
      unresolvedIds.size === 0
        ? "CLEAR" as const
        : "HAS_UNRESOLVED" as const,
    total: unresolvedIds.size,
    needValidationIds,
    staticProofPendingIds,
    runtimeRequiredIds,
    auditObligationIds,
    unknownSurfaceIds,
  };

  const qualityGates = deriveMapAuditQualityGates({
    controlStatus: input.control.status,
    coverageDisposition,
    gameplayClosureStatus: closure.status,
    honestyStatus: input.honesty.status,
    findings: allFindings.map((finding) => ({
      id: finding.causalLinkId,
      status: finding.status,
      informationMismatch:
        finding.informationMismatch,
      failureDomain: finding.failureDomain,
      contributingDomains:
        [...finding.contributingDomains],
      gameplayFlow: finding.gameplayFlow,
    })),
    auditObligationCount:
      input.auditObligations.length,
    validationTestCount:
      input.validationTests.length,
    auditObligations:
      input.auditObligations,
    multiArenaDetected:
      world.arenas.detected,
  });

  return {
    schemaVersion: 2,
    artifactId: input.identity.artifactId,
    artifactFingerprint: input.identity.artifactFingerprint,
    auditTarget: {
      edition: input.inspection.targetCompatibility?.edition ?? "unknown",
      ...(input.inspection.targetCompatibility?.version === undefined
        ? {}
        : { minecraftVersion: input.inspection.targetCompatibility.version }),
      source: "selected-audit-runtime-target-not-live-observation",
    },
    control: input.control,
    ...(input.userIntent === undefined
      ? {}
      : { userIntent: input.userIntent }),
    mapVersion:
      input.identity.releaseVersion ??
      "UNRESOLVED",
    ...(input.inspection.hiddenGameplayDefects
      .classification === undefined
      ? {}
      : {
          mapClassification: {
            use: "audit-routing-only" as const,
            classification:
              input.inspection
                .hiddenGameplayDefects
                .classification,
          },
        }),
    evidenceScope: {
      mode: "selected-map-version-only",
      selectedArtifact:
        input.identity.levelName ??
        input.identity.artifactId,
      archiveSourcesUsed: false,
    },
    gameDesign: {
      objective,
      objectiveGrounding,
      winCondition,
      winConditionGrounding:
        win?.grounding ?? "unresolved",
      loseCondition,
      loseConditionGrounding:
        lose?.grounding ?? "unresolved",
      resetRules,
      preserveRules,
      progressionRules,
    },
    gameplayFlow: PLAYER_FLOW,
    gameplayFlowBasis: "AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY",
    ...(input.gameplayStructure === undefined
      ? {}
      : { gameplayStructure: input.gameplayStructure }),
    stateTransitions,
    multiArena: {
      detected: world.arenas.detected,
      visibleArenaCount:
        world.arenas.count ?? null,
      declaredConcurrentArenaLimit:
        world.arenas.declaredConcurrentArenaLimit ??
        null,
      safeConcurrentArenaLimit:
        world.arenas.safeConcurrentArenas ??
        null,
      queueBehavior:
        world.arenas.detected
          ? "Unresolved from selected artifact."
          : "not-applicable",
      isolationRules:
        world.arenas.isolation.observations
          .map(item =>
            item.key + "=" + item.status +
            " [source-scope:" + item.scope + "]" +
            " [source:" + (item.sourcePath ?? "UNRESOLVED") + "]" +
            " " + item.reason
          )
          .sort(),
    },
    coverage: {
      disposition: coverageDisposition,
      records: coverageRecords,
    },
    gameplayClosure: {
      status: closure.status,
      surfaceInventory:
        closure.surfaces.map((surface) => ({
          id: surface.id,
          label: surface.label,
          kind: surface.kind,
          status: surface.status,
          ...(surface.reason === undefined
            ? {}
            : { reason: surface.reason }),
          boundaries:
            [...(surface.boundaries ?? [])],
        })),
      stateModelComplete:
        closure.stateModelComplete,
      boundariesExtracted:
        closure.boundariesExtracted,
      unaccountedSurfaceIds:
        [...closure.unaccountedSurfaceIds],
      notes: closure.reasons.join(" "),
    },
    bugs:
      input.issueLanes.BUG.map((finding) => projectFinding(finding, input.reasoningByCausalLinkId)),
    designMismatches:
      input.issueLanes.DESIGN_MISMATCH.map(
        (finding) => projectFinding(finding, input.reasoningByCausalLinkId),
      ),
    auditObligations:
      [...(input.auditObligations ?? [])],
    validationTests:
      [...input.validationTests],
    unresolved,
    honesty: input.honesty,
    qualityGates,
    ...(input.fullMapReplica === undefined
      ? {}
      : {
          fullMapReplica:
            input.fullMapReplica,
        }),
  };
}


/**
 * Human-facing read-only view of the canonical MapAuditOutputV2.
 * No new report schema, audit authority, or inferred Minecraft runtime proof.
 */
export function formatSelectedMapAuditBrief(input: {
  readonly report: MapAuditOutputV2;
  readonly intent: GameplayIntentModel;
  readonly modelTaskPackets: readonly AuditModelTaskPacket[];
}): string {
  const { report, intent, modelTaskPackets } = input;
  const concise = (value: string): string =>
    value.replace(/\s+/g, " ").trim().slice(0, 300) || "unresolved";
  const evidenceById = new Map(
    intent.evidence.map((item) => [item.id, item]),
  );
  const features = report.gameplayStructure?.features ?? [];
  // A source-localized stage is navigational content, not a player state,
  // proof of a wave, or a causal link. Keep namespace/pack ownership intact.
  const localized = features.flatMap(feature => {
    if (feature.grounding !== "SOURCE_EVIDENCED") return [];
    const marker = feature.id.startsWith("phase:localized:")
      ? "phase:localized:" :
      feature.id.startsWith("mechanic:localized:")
        ? "mechanic:localized:" : undefined;
    if (marker === undefined) return [];
    let authored: string;
    try {
      authored = decodeURIComponent(feature.id.slice(marker.length));
    } catch {
      return [];
    }
    const separator = authored.lastIndexOf("#");
    if (separator < 1) return [];
    const path = authored.slice(0, separator);
    const key = authored.slice(separator + 1);
    const parsed = parseLocalizedStageKey(key);
    if (parsed === undefined) return [];
    const source = feature.sourceEvidenceIds.map(id => evidenceById.get(id))
      .find(item =>
        item?.scope === "selected-artifact" &&
        item.origin === "translation" &&
        item.locator.startsWith(path + "#L"));
    if (!source) return [];
    return [{
      feature,
      source: source.locator,
      group: [path, parsed.scopePrefix, parsed.kind, parsed.number].join("#"),
      path,
      parsed,
    }];
  });
  const localizedIds = new Set(localized.map(item => item.feature.id));
  const visibleFeatures = features.filter(feature =>
    !localizedIds.has(feature.id) &&
    // A feature supported ONLY by an old/external source is not a selected-map
    // mechanic; keep current unclassified features as unknown instead.
    !(feature.sourceEvidenceIds.length > 0 &&
      feature.sourceEvidenceIds.every(id =>
        evidenceById.get(id)?.scope === "external-reference")));
  const localizedGroups = new Map<string, typeof localized>();
  for (const item of localized) {
    const entries = localizedGroups.get(item.group) ?? [];
    entries.push(item);
    localizedGroups.set(item.group, entries);
  }
  const orderedGroups = [...localizedGroups.values()]
    .sort((a, b) =>
      a[0]!.path.localeCompare(b[0]!.path) ||
      a[0]!.parsed.scopePrefix.localeCompare(b[0]!.parsed.scopePrefix) ||
      a[0]!.parsed.kind.localeCompare(b[0]!.parsed.kind) ||
      a[0]!.parsed.number - b[0]!.parsed.number);

  const reconstructionByFeature = new Map(
    (report.gameplayStructure?.mechanicReconstructions ?? [])
      .map((mechanic) => [mechanic.featureId, mechanic] as const),
  );
  const journeys = report.gameplayStructure?.gameplayJourneyCandidates ?? [];
  const sourceStateAliasUnknowns = intent.unknowns
    .filter(item => item.id.startsWith("unknown:source-state-alias:"))
    .sort((a, b) => a.id.localeCompare(b.id));
  const returnPolicyUnknowns = intent.unknowns
    .filter(item => item.id.startsWith("unknown:outcome-policy-coverage:"))
    .sort((a, b) => a.id.localeCompare(b.id));
  const findings = [...report.bugs, ...report.designMismatches];
  const sourceIsolationRules = report.multiArena.isolationRules;
  const unresolvedSourceIsolation = sourceIsolationRules.filter(rule =>
    rule.includes("=partition-proof-required") ||
    rule.includes("=unknown"));
  const unresolvedSurfaces = report.gameplayClosure.surfaceInventory.filter(
    (item) => item.status === "blocked" || item.status === "unknown",
  );
  const out: string[] = [
    "# Selected Map Audit",
    "",
    "**Map:** " + concise(report.evidenceScope.selectedArtifact),
    "**Version:** " + concise(report.mapVersion),
    "**Status:** " + report.control.status + " / " +
      report.control.currentStage,
    "**Next action:** " + report.control.allowedNextAction,
    "",
    "## Game Understanding",
    "**Objective (" + report.gameDesign.objectiveGrounding + "):** " +
      concise(report.gameDesign.objective),
    "**Win (" + report.gameDesign.winConditionGrounding + "):** " +
      concise(report.gameDesign.winCondition),
    "**Lose (" + report.gameDesign.loseConditionGrounding + "):** " +
      concise(report.gameDesign.loseCondition),
    "",
  ];
  if (orderedGroups.length > 0) {
    out.push("", "### Source-labelled level/stage hierarchy (NOT OBSERVED)");
    out.push("Grouping follows exact selected-artifact locale keys; neither " +
      "stage execution nor chronological transitions are proven. Wave counts, " +
      "spawn recipes and coordinates require independent script/world evidence.");
    for (const group of orderedGroups.slice(0, 24)) {
      const first = group[0]!;
      const type = first.parsed.kind.charAt(0).toUpperCase() +
        first.parsed.kind.slice(1);
      out.push("- **" + type + " " + first.parsed.number + "**" +
        " [source-labelled; activation UNKNOWN]" +
        (first.parsed.scopePrefix
          ? " / namespace: " + concise(first.parsed.scopePrefix)
          : ""));
      const entries = [...group].sort((a, b) => {
        const priority = (section: typeof a.parsed.section) =>
          section === "guide" ? 0 : section === "task" ? 1 : 2;
        return priority(a.parsed.section) - priority(b.parsed.section) ||
          (a.parsed.taskNumber ?? 0) - (b.parsed.taskNumber ?? 0);
      });
      for (const item of entries.slice(0, 16)) {
        const category = item.parsed.section === "guide"
          ? "Guide" : item.parsed.section === "task"
            ? "Task " + item.parsed.taskNumber
            : "Success text (not proof of completion)";
        const content = item.feature.label.slice(
          item.feature.label.indexOf(": ") + 2,
        );
        out.push("  - " + category + ": " + concise(content),
          "    Source: " + concise(item.source));
      }
      if (entries.length > 16) {
        out.push("  Additional source-labelled items omitted: " +
          (entries.length - 16));
      }
    }
    if (orderedGroups.length > 24) {
      out.push("Additional source-labelled stages omitted: " +
        (orderedGroups.length - 24));
    }
  }
  if (report.stateTransitions.length > 0) {
    out.push("", "### Source-derived state transitions (NOT OBSERVED)");
    out.push("Relations are from selected source, not evidence a player " +
      "entered these states in Minecraft.");
    for (const transition of report.stateTransitions.slice(0, 12)) {
      out.push("- " + concise(transition.from) + " --(" +
        concise(transition.event) + ")--> " +
        concise(transition.to) +
        (transition.notes ? "; " + concise(transition.notes) : ""));
    }
    if (report.stateTransitions.length > 12) {
      out.push("Additional state relationships omitted: " +
        (report.stateTransitions.length - 12));
    }
  }
  out.push("", "### Other mechanics (source inspection; not gameplay execution)");
  if (features.length === 0) {
    out.push("No recognized gameplay features in this view; the map may still contain unclassified gameplay.");
  }
  if (sourceIsolationRules.length > 0) {
    out.push("", "### State ownership (SOURCE ONLY; NOT RUNTIME)");
    out.push("State isolation is not established by variable names or parser " +
      "receiver hints; even an authored arena-keyed source partition is " +
      "not proof of a distinct live player/arena instance.");
    out.push("Source observations: " + sourceIsolationRules.length +
      "; unresolved partition proof: " + unresolvedSourceIsolation.length + ".");
    for (const item of unresolvedSourceIsolation.slice(0, 5)) {
      out.push("- " + concise(item));
    }
    if (unresolvedSourceIsolation.length > 5) {
      out.push("Additional source isolation gaps omitted: " +
        (unresolvedSourceIsolation.length - 5));
    }
  }
  for (const feature of visibleFeatures.slice(0, 12)) {
    const references = feature.sourceEvidenceIds.flatMap((id) => {
      const e = evidenceById.get(id);
      return e === undefined || e.scope === "external-reference" ||
        e.scope === "runtime" ? [] : [concise(e.locator)];
    });
    const directEffects = new Set(feature.sourceBehaviorPaths
      .filter((path) => path.association === "DIRECT_EFFECT_EVIDENCE")
      .map((path) => path.effectId)).size;
    out.push(
      "- **" + concise(feature.label) + "** [" + feature.grounding +
        "; source effects: " + directEffects + "] — " +
        concise(feature.purpose),
      references.length > 0
        ? "  Source: " + references.slice(0, 3).join("; ")
        : "  Source locator: unresolved",
      "  Source-derived relations: activation " +
        feature.activationRelationIds.length + ", effects " +
        feature.effectRelationIds.length + ", transitions " +
        feature.transitionRelationIds.length + ", outcomes " +
        feature.outcomeRelationIds.length + ".",
      ...((reconstructionByFeature.get(feature.id)?.sourceActivationCandidates ?? [])
        .slice(0, 2).map(candidate =>
          "  Source entry (" + candidate.evidenceBasis + "; NOT EXECUTED): " +
          concise(candidate.entryKind + " " + candidate.entryRegionId) +
          "; linked source IDs " + candidate.supportingEvidenceIds.length +
          "; material steps " + candidate.materialSourceStepIds.length +
          "; branch points " + candidate.branchPointCount +
          "; unresolved call edges " + candidate.unresolvedExecutionEdgeIds.length +
          ". No player reachability or game-design activation proven.")),
      ...((reconstructionByFeature.get(feature.id)?.sourceActivationCandidates.length ?? 0) > 2
        ? ["  Additional entry candidates omitted: " +
          (reconstructionByFeature.get(feature.id)!.sourceActivationCandidates.length - 2)]
        : []),
      ...feature.sourceBehaviorPaths.slice(0, 2).map(path =>
        "  Candidate effect (" + path.association + "; " + path.evidenceStatus +
        "): " + concise(path.effectKind +
          (path.effectTarget === null ? "" : " " + path.effectTarget)) +
        (path.preconditions.length === 0 ? "; guards unresolved."
          : "; authored guard candidates: " +
            path.preconditions.slice(0, 2).map(guard =>
              concise(guard.expression) + "=" + guard.branch).join("; ") +
            ". Not evaluated at runtime.")),
      ...(reconstructionByFeature.get(feature.id)?.unresolvedDimensions.length
        ? ["  Unresolved mechanics: " +
          reconstructionByFeature.get(feature.id)!.unresolvedDimensions.join(", ")]
        : []),
    );
  }
  if (visibleFeatures.length > 12) {
    out.push("Additional features omitted: " + (visibleFeatures.length - 12));
  }
  if (sourceStateAliasUnknowns.length > 0) {
    out.push("", "### State identity questions (SOURCE ONLY; UNRESOLVED)");
    out.push("Identical state labels in distinct source-memory targets do NOT " +
      "prove shared runtime storage or distinct player/arena state.");
    for (const unknown of sourceStateAliasUnknowns.slice(0, 5)) {
      const sourceLocations = [...new Set((unknown.evidenceIds ?? [])
        .flatMap(id => {
          const record = evidenceById.get(id);
          return record?.scope === "selected-artifact"
            ? [record.locator] : [];
        }))].sort();
      out.push(
        "- " + concise(unknown.id) + ": " +
          unknown.blockedSubjectIds.length + " source-owned state subjects; " +
          "runtime alias/scope unresolved.",
        "  Exact subjects: " + unknown.blockedSubjectIds.slice(0, 4)
          .map(concise).join("; "),
        "  Sources: " + (sourceLocations.length
          ? sourceLocations.slice(0, 3).map(concise).join("; ")
          : "unresolved"),
      );
    }
    if (sourceStateAliasUnknowns.length > 5) {
      out.push("Additional state identity questions omitted: " +
        (sourceStateAliasUnknowns.length - 5));
    }
  }
  if (returnPolicyUnknowns.length > 0) {
    out.push("", "### Return policy questions (SOURCE ONLY; UNRESOLVED)");
    out.push("Equal return/guard counts, similar function names and missing " +
      "source spans do NOT establish that an outcome is guarded.");
    for (const unknown of returnPolicyUnknowns.slice(0, 5)) {
      const ids = unknown.evidenceIds ?? [];
      const sourceLocations = [...new Set(ids.flatMap(id => {
        const record = evidenceById.get(id);
        return record?.scope === "selected-artifact"
          ? [record.locator] : [];
      }))].sort();
      out.push(
        "- " + concise(unknown.id) + ": " + concise(unknown.question),
        "  Subjects: " + unknown.blockedSubjectIds
          .slice(0, 3).map(concise).join("; "),
        "  Source: " + (sourceLocations.length > 0
          ? sourceLocations.slice(0, 3).map(concise).join("; ")
          : "unresolved"),
      );
    }
    if (returnPolicyUnknowns.length > 5) {
      out.push("Additional return-policy questions omitted: " +
        (returnPolicyUnknowns.length - 5));
    }
  }
  out.push("", "### Possible player journeys (NOT OBSERVED)");
  out.push("A directed source relation does NOT prove chronological gameplay, player access or engine execution.");
  if (journeys.length === 0) {
    out.push("No connected source-design path could be grounded; game loop remains UNKNOWN.");
  }
  for (const journey of journeys.slice(0, 5)) {
    const reading = journey.interpretation;
    if (reading === undefined) {
      out.push("- " + concise(journey.id) + " [" +
        journey.meaningStatus + "; " + journey.boundary +
        "] subjects: " + concise(journey.subjectIds.join(", ")));
      continue;
    }
    const route = reading.steps.map((step, index) => {
      const name = concise(step.label) + " [" + step.kind + ", " +
        step.meaningBasis + "]";
      return index === 0 ? name
        : " --(" + (reading.relationships[index - 1]?.kind ?? "unknown") +
          ")--> " + name;
    }).join("");
    const evidenceLocations = journey.evidenceIds.flatMap(id => {
      const source = evidenceById.get(id);
      return source?.scope === "selected-artifact"
        ? [source.locator] : [];
    });
    out.push(
      "- **Source-design candidate:** " + route,
      "  Outcome: " + reading.sourceOutcome +
        "; boundary: " + journey.boundary + "; runtime: NOT OBSERVED.",
      "  Exact source-flow links: " + journey.exactSourceFlowIds.length +
        "; selected source relation evidence: " + journey.evidenceIds.length + ".",
      evidenceLocations.length > 0
        ? "  Source: " + [...new Set(evidenceLocations)]
          .slice(0, 3).map(concise).join("; ")
        : "  Source locator: unresolved",
      "  Still unknown: " + reading.missingUnderstanding.join(", "),
      ...(reading.sourceJoinGap === undefined ? [] : [
        "  Unverified source join via " +
          concise(reading.sourceJoinGap.viaSubjectId) + ": " +
          concise(reading.sourceJoinGap.previousRelationId) + " → " +
          concise(reading.sourceJoinGap.nextRelationId) + ".",
        "  Source groups: " +
          reading.sourceJoinGap.previousSourceLocators.slice(0, 2)
            .map(concise).join("; ") + " / " +
          reading.sourceJoinGap.nextSourceLocators.slice(0, 2)
            .map(concise).join("; ") +
          (reading.sourceJoinGap.missingProof === "OPPOSITE_AUTHORED_BRANCH_ARMS"
            ? ". Opposite exact authored true/false branch arms; " +
              "no compatible source route demonstrated."
            : ". Missing shared exact source evidence or compatible " +
              "resolved IR flow; a common filename is insufficient."),
      ]),
    );
  }
  if (journeys.length > 5) {
    out.push("Additional candidates omitted: " + (journeys.length - 5));
  }
  out.push("", "## Findings");
  if (findings.length === 0) {
    out.push("No published finding; **this does not mean the map is free of bugs**.");
  }
  for (const finding of findings.slice(0, 12)) {
    out.push(
      "- [" + finding.status + "] " + finding.issueType + ": " +
        concise(finding.issue),
      "  Impact: " + concise(finding.playerImpact),
      "  Expected / actual: " + concise(finding.expected) + " / " +
        concise(finding.actual),
      ...(finding.evidenceIds.length === 0
        ? ["  Source evidence: UNRESOLVED"]
        : ["  Evidence IDs: " +
          finding.evidenceIds.slice(0, 5).map(concise).join("; ")]),
      ...(finding.missingProof === undefined ? [] :
        ["  Missing proof: " + concise(finding.missingProof)]),
    );
  }
  if (findings.length > 12) {
    out.push("Additional findings omitted: " + (findings.length - 12));
  }
  out.push(
    "",
    "## Next Investigations",
    "Unresolved material: " + report.unresolved.total +
      " / Gameplay closure: " + report.gameplayClosure.status,
  );
  if (modelTaskPackets.length === 0 && unresolvedSurfaces.length === 0) {
    out.push("No specific investigation task in the current audit view.");
  }
  for (const task of modelTaskPackets.slice(0, 8)) {
    const locations = [...new Set([
      ...(task.knowledgeLookup?.sourceLocators ?? []),
      ...task.evidenceContext.flatMap((e) =>
        e.kind === "selected-artifact-evidence" &&
        e.locator !== undefined ? [e.locator] : []),
    ])];
    out.push(
      "- " + task.kind + " [" + concise(task.id) + "]: " +
        concise(task.decisionNeeded),
      ...(task.causalLinkId === undefined ? []
        : ["  Causal link: " + concise(task.causalLinkId)]),
      ...(task.unresolvedEvidenceIds.length === 0 ? []
        : ["  Missing source evidence: " +
          task.unresolvedEvidenceIds.slice(0, 5).map(concise).join("; ")]),
      "  Stop condition: " + concise(task.stopCondition),
      ...(locations.length === 0 ? [] :
        ["  Source: " + locations.slice(0, 4).map(concise).join("; ")]),
      ...(task.knowledgeLookup === undefined ? [] :
        ["  Search hint (not proof): " +
          concise(task.knowledgeLookup.query)]),
      ...(task.retrievedKnowledge?.references ?? []).flatMap((reference) => [
        "  Knowledge reference (NOT bug or detector proof): " +
          concise(reference.knowledgeId) + " — " +
          concise(reference.statement),
        "  Source: " + reference.sources
          .map((source) => concise(source.title) + " (" + concise(source.url) + ")")
          .join("; "),
        "  Applicability: " + reference.editionCheck +
          "; declared editions: " + reference.applicability.editions.join(", ") +
          "; version, experiments and runtime behavior NOT VERIFIED.",
      ]),
      ...((task.retrievedKnowledge?.omitted ?? 0) > 0
        ? ["  Additional scoped references omitted: " +
          task.retrievedKnowledge!.omitted]
        : []),
    );
  }
  if (modelTaskPackets.length > 8) {
    out.push("Additional model tasks omitted: " +
      (modelTaskPackets.length - 8));
  }
  for (const surface of unresolvedSurfaces.slice(0, 6)) {
    out.push("- Unresolved: " + concise(surface.label) +
      (surface.reason === undefined ? "" :
        " — " + concise(surface.reason)));
  }
  if (unresolvedSurfaces.length > 6) {
    out.push("Additional unresolved surfaces omitted: " +
      (unresolvedSurfaces.length - 6));
  }
  out.push(
    "",
    "## Evidence Boundary",
    "Gameplay flow labels are audit checklist stages, not an observed player route.",
    "Source associations and knowledge lookup hints are not Minecraft runtime proof.",
    ...(report.control.status === "BLOCKED"
      ? ["Audit is BLOCKED. Missing findings cannot be read as bug absence."]
      : []),
    ...(report.unresolved.total > 0
      ? ["Unresolved evidence remains; this is not a complete defect inventory."]
      : []),
  );
  return out.join("\n") + "\n";
}
