import { artifactIdFromFingerprint } from "../../../artifact/src/index.js";
import type { SemanticIr } from "../../../semantic-ir/src/index.js";
import type { GameplayIntentModel } from "../../../gameplay-intent/src/index.js";
import type { GameplayWorldModel } from "./gameplay-world-model.js";
import type { GameplayDiscoveryClosure } from "./gameplay-discovery-closure.js";
import type { GameplayBoundaryRegistry } from "./gameplay-boundary-registry.js";
import type { MultiplayerStateValidationPlan } from "./multiplayer-state-validation.js";
import type { HiddenGameplayDefectAnalysis } from "./hidden-gameplay-defect-analysis.js";
import { capabilityDeliveryMatchesScope } from "./gameplay-defect-resolution.js";
import {
  deriveMandatoryOwnershipRegistry,
  deriveMandatoryProgressionContracts,
  deriveMandatoryStateRegistry,
  mandatoryAuditBlockClosure as blockClosure,
  mandatoryAuditObligation as obligation,
  mandatoryAuditReceipt as receipt,
  positiveNotApplicable,
} from "./mandatory-audit-support.js";
export type {
  MandatoryAuditBlock,
  MandatoryAuditBlockClosure,
  MandatoryAuditCheckpointReasonCode,
  MandatoryAuditCheckpointReceipt,
  MandatoryAuditCheckpointStatus,
  MandatoryAuditObligation,
  MandatoryAuditOwnershipRecord,
  MandatoryAuditProcedureReceipt,
  MandatoryAuditProgressionRecord,
  MandatoryAuditStateRecord,
} from "./mandatory-audit-support.js";
import type {
  MandatoryAuditCheckpointReceipt,
  MandatoryAuditProcedureReceipt,
} from "./mandatory-audit-support.js";

export function deriveMandatoryAuditProcedureReceipt(input: {
  readonly artifactId: string;
  readonly artifactFingerprint?: string;
  readonly archiveEntries?: number;
  readonly discovery: GameplayDiscoveryClosure;
  readonly world: GameplayWorldModel;
  readonly intent: GameplayIntentModel;
  readonly semanticIr: SemanticIr;
  readonly boundaries: GameplayBoundaryRegistry;
  readonly multiplayer: MultiplayerStateValidationPlan;
  readonly hidden: HiddenGameplayDefectAnalysis;
}): MandatoryAuditProcedureReceipt {
  const {
    artifactId,
    discovery,
    world,
    intent,
    semanticIr,
    boundaries,
    multiplayer,
    hidden,
  } = input;
  const graph = hidden.scenarioAudit.graph;
  const scenarioClosure = hidden.scenarioAudit.closure;
  // Preset identity is the authority for mandatory scenario activation.
  // A source-authored scenario may legitimately have the same display label,
  // but cannot substitute for a missing generated preset or its flow scope.
  const compiledPresetScenarios =
    hidden.auditScenarioPreset.scenarios.flatMap((preset) =>
      graph.scenarios.filter((scenario) =>
        scenario.id === "preset:" + preset.id &&
        scenario.label === preset.kind &&
        scenario.gameplayStage === preset.flowStage
      )
    );
  // Source accounting alone cannot prove a gameplay system is not applicable.
  const discoverySupportsAbsence = positiveNotApplicable(discovery, false, false);
  const defectResolution = hidden.scenarioAudit.defectResolution;
  const stateRegistry = deriveMandatoryStateRegistry(
    semanticIr,
    world.persistence?.propertiesDetail ?? [],
  );
  const ownershipRegistry = deriveMandatoryOwnershipRegistry(semanticIr);
  const progressionContracts = deriveMandatoryProgressionContracts(intent);
  const demanded = new Set(world.analysisDemand ?? []);
  const deferredRelations = semanticIr.temporal.relations.filter(
    (relation) =>
      relation.kind === "deferred" ||
      relation.kind === "periodic",
  );
  const writableStates = stateRegistry.filter(
    (item) => item.writeRegions.length > 0,
  );
  const unboundedWritableStates = writableStates.filter(
    (item) =>
      item.clearRegions.length === 0 &&
      item.authorityContractIds.length === 0 &&
      item.staleRisk !== "bounded",
  );
  const explicitOwnership = ownershipRegistry.filter(
    (item) =>
      item.authorityStatus === "explicit-contract",
  );
  const unresolvedOwnership = ownershipRegistry.filter(
    (item) =>
      item.authorityStatus ===
      "multi-writer-unresolved",
  );
  const capabilityDeliveryFailures =
    hidden.capabilityDelivery.filter(
      (item) =>
        item.status === "DEGRADED" ||
        item.status === "MISSING",
    );
  const capabilityDeliveryUnproven =
    hidden.capabilityDelivery.filter(
      (item) => item.status === "UNPROVEN",
    );
  const capabilityFailureRoutedIds =
    capabilityDeliveryFailures
      .filter((failure) =>
        graph.causalLinks.some((link) =>
          link.status === "CONTRADICTED" &&
          capabilityDeliveryMatchesScope(
            failure.subjectId,
            graph.scenarios.find((scenario) =>
              scenario.id === link.scenarioId
            )?.label,
            link.subjectIds,
            link.componentIds,
          )
        )
      )
      .map((item) => item.subjectId)
      .sort();
  const progressionIncomplete = progressionContracts.filter(
    (item) =>
      item.kind === "objective"
        ? item.inboundEdgeIds.length === 0 ||
          (
            item.effectEdgeIds.length === 0 &&
            item.transitionEdgeIds.length === 0 &&
            item.terminalEdgeIds.length === 0
          )
        : item.kind === "outcome"
          ? item.inboundEdgeIds.length === 0 &&
            item.terminalEdgeIds.length === 0
          : item.inboundEdgeIds.length === 0 &&
            item.transitionEdgeIds.length === 0 &&
            item.outboundEdgeIds.length === 0,
  );
  const checkpoint: MandatoryAuditCheckpointReceipt[] = [];

  const fingerprint = input.artifactFingerprint;
  const targetVerified =
    fingerprint !== undefined &&
    /^[a-f0-9]{64}$/i.test(fingerprint) &&
    artifactId === artifactIdFromFingerprint(fingerprint) &&
    input.archiveEntries !== undefined &&
    Number.isSafeInteger(input.archiveEntries) &&
    input.archiveEntries > 0;

  checkpoint.push(receipt(
    "A1",
    "TARGET",
    "Selected Artifact Integrity",
    targetVerified ? "CLOSED" : "OPEN",
    targetVerified
      ? "Selected artifact fingerprint, identity, and extracted archive inventory are verified."
      : "Selected artifact integrity is not verified by a matching SHA-256 identity and nonempty archive inventory.",
    targetVerified
      ? ["artifact:" + artifactId, "sha256:" + fingerprint]
      : [],
    ["SelectedArtifactReceipt"],
  ));

  checkpoint.push(receipt(
    "A2",
    "DISCOVERY",
    "Source Recognition and Discovery",
    discovery.status === "OPEN"
      ? "OPEN"
      : discovery.status === "PARTIAL"
        ? "PARTIAL"
        : "CLOSED",
    "Source Recognition (physical inventory and relevant file dispositions) is " + discovery.status +
      "; gameplay interpretation remains an UNDERSTAND responsibility.",
    discovery.discoveredSurfaceIds,
    ["GameplaySurfaceInventory"],
  ));

  const fullJourney = graph.scenarios.find(
    (scenario) => scenario.label === "full-journey",
  );
  checkpoint.push(receipt(
    "A3",
    "UNDERSTAND",
    "Player Journey Reconstruction",
    fullJourney &&
    fullJourney.composedScenarioIds.length > 0 &&
    scenarioClosure.status !== "OPEN" &&
    intent.nodes.some((node) =>
      node.kind === "objective" ||
      node.kind === "phase" ||
      node.kind === "outcome"
    )
      ? "CLOSED"
      : "OPEN",
    fullJourney && fullJourney.composedScenarioIds.length > 0
      ? "Full journey is represented as a composition of concrete gameplay scenarios."
      : "No complete full-journey composition is available.",
    fullJourney?.composedScenarioIds ?? [],
    ["PlayerJourneyGraph"],
    {
      obligations: [
        obligation(
          "journey-composition",
          true,
          (fullJourney?.composedScenarioIds.length ?? 0) > 0,
          "Full journey must compose concrete gameplay scenarios.",
          fullJourney?.composedScenarioIds ?? [],
        ),
        obligation(
          "journey-core-semantics",
          true,
          intent.nodes.some((node) => node.kind === "phase") &&
            intent.nodes.some((node) =>
              node.kind === "objective" ||
              node.kind === "outcome"
            ),
          "Journey must contain grounded phase plus objective/outcome semantics.",
          intent.nodes
            .filter((node) =>
              node.kind === "phase" ||
              node.kind === "objective" ||
              node.kind === "outcome"
            )
            .flatMap((node) => node.evidenceIds),
        ),
        obligation(
          "journey-scenario-closure",
          true,
          scenarioClosure.status !== "OPEN",
          "Journey cannot close while scenario closure is OPEN.",
          graph.causalLinks.flatMap((item) => item.evidenceIds),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "A4",
    "UNDERSTAND",
    "State Registry",
    stateRegistry.length === 0
      ? discoverySupportsAbsence
        ? "NOT_APPLICABLE"
        : "OPEN"
      : unboundedWritableStates.length > 0
        ? "PARTIAL"
        : "CLOSED",
    stateRegistry.length === 0
      ? discoverySupportsAbsence
        ? "No material Semantic IR state surfaces were discovered after complete discovery."
        : "State applicability cannot be closed while discovery is incomplete."
      : unboundedWritableStates.length > 0
        ? "Writable state remains without clear/reset or explicit authority evidence."
        : "Material state surfaces have bounded write/clear or authority evidence.",
    semanticIr.state.operations.map((item) => item.id),
    ["StateRegistry"],
    {
      obligations: [
        obligation(
          "state-writes-bounded",
          writableStates.length > 0,
          unboundedWritableStates.length === 0,
          "Every writable material state must have clear/reset or explicit authority evidence.",
          writableStates.map((item) => item.surfaceId),
        ),
      ],
    },
  ));

  const ownershipApplicable =
    ownershipRegistry.length > 0 ||
    world.arenas.detected ||
    deferredRelations.length > 0;
  checkpoint.push(receipt(
    "A5",
    "UNDERSTAND",
    "Ownership Registry",
    !ownershipApplicable
      ? discoverySupportsAbsence
        ? "NOT_APPLICABLE"
        : "OPEN"
      : unresolvedOwnership.length > 0
        ? "PARTIAL"
        : "CLOSED",
    !ownershipApplicable
      ? discoverySupportsAbsence
        ? "No shared/session/deferred ownership surface remains after complete discovery."
        : "Ownership applicability cannot close while discovery is incomplete."
      : "Ownership obligations are evaluated from authority bindings, arena lifecycle/isolation, and deferred ownership.",
    ownershipRegistry.flatMap((item) => [
      ...(item.authorityContractId === undefined
        ? []
        : [item.authorityContractId]),
      ...item.observedWriterRegionIds,
    ]),
    ["OwnershipRegistry"],
    {
      obligations: [
        obligation(
          "state-authority-accounted",
          explicitOwnership.length > 0,
          explicitOwnership.every(
            (item) =>
              (item.authoritySurfaceId?.trim().length ?? 0) > 0,
          ),
          "Explicit state authority bindings must identify a concrete authority surface.",
          explicitOwnership.flatMap((item) =>
            item.authorityContractId === undefined
              ? []
              : [item.authorityContractId]
          ),
        ),
        obligation(
          "arena-ownership-accounted",
          world.arenas.detected,
          !world.arenas.detected ||
            (
              world.analysisExecution.executedCapabilityIds.includes(
                "arena-lifecycle-integrity",
              ) &&
              world.arenas.lifecycle.unresolved === 0 &&
              world.arenas.isolation.unknown === 0
            ),
          "Detected arenas require lifecycle and isolation ownership to resolve.",
          ["analysis:arena-lifecycle", "analysis:multiplayer-interleaving"],
        ),
        obligation(
          "state-multi-writer-authority-resolved",
          ownershipRegistry.some(
            (item) =>
              item.observedWriterRegionIds.length > 1,
          ),
          unresolvedOwnership.length === 0,
          "State surfaces with multiple writer regions require explicit authority binding or remain unresolved.",
          unresolvedOwnership.flatMap(
            (item) => item.observedWriterRegionIds,
          ),
        ),
        obligation(
          "deferred-ownership-accounted",
          deferredRelations.length > 0,
          deferredRelations.length === 0 ||
            world.analysisExecution.executedCapabilityIds.includes(
              "temporal-ownership-integrity",
            ),
          "Deferred/periodic work requires temporal ownership analysis.",
          deferredRelations.map((item) => item.id),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "A6",
    "UNDERSTAND",
    "Progression Contract",
    progressionContracts.length === 0
      ? discoverySupportsAbsence
        ? "NOT_APPLICABLE"
        : "OPEN"
      : progressionIncomplete.length === 0
        ? "CLOSED"
        : "PARTIAL",
    progressionContracts.length === 0
      ? discoverySupportsAbsence
        ? "No objective/phase/outcome progression surface remains after complete discovery."
        : "Progression applicability cannot close while discovery is incomplete."
      : "Objective/phase/outcome progression edges are projected from gameplay intent.",
    progressionContracts.flatMap((item) => [
      ...item.inboundEdgeIds,
      ...item.outboundEdgeIds,
      ...item.dependencyEdgeIds,
      ...item.stateResourceSubjectIds,
    ]),
    ["ProgressionContracts"],
    {
      obligations: [
        obligation(
          "progression-chain-connected",
          progressionContracts.length > 0,
          progressionIncomplete.length === 0,
          "Objectives require inbound and outbound progression links; outcomes require inbound proof; phases require at least one transition connection.",
          progressionContracts.flatMap((item) => [
            ...item.inboundEdgeIds,
            ...item.outboundEdgeIds,
          ]),
        ),
      ],
    },
  ));

  // Preserve all indexed-source interpretation debt at its A7 owner.
  const discoverySemanticsUnderstood =
    discovery.semanticUnderstandingGaps === 0 &&
    discovery.discoveryChallengeIds.length === 0 &&
    discovery.gameplayIntentUnknownIds.length === 0;
  const gameplayModelStatus =
    world.gameplayClosure.status === "CLOSED" && !discoverySemanticsUnderstood
      ? "PARTIAL" as const
      : world.gameplayClosure.status;
  checkpoint.push(receipt(
    "A7",
    "UNDERSTAND",
    "Gameplay Model Closure",
    gameplayModelStatus,
    gameplayModelStatus === "CLOSED"
      ? "Gameplay model and indexed source semantics are accounted."
      : "Gameplay model remains " + gameplayModelStatus +
        "; indexed semantic gaps, unowned source evidence and unknown gameplay meaning still block closure.",
    [
      ...world.gameplayClosure.surfaces.flatMap((surface) => surface.evidenceIds),
      ...discovery.discoveryChallengeIds,
      ...discovery.gameplayIntentUnknownIds,
    ],
    ["GameplayModelClosure"],
    {
      obligations: [
        obligation(
          "gameplay-source-semantics-reconciled", true,
          discovery.semanticUnderstandingGaps === 0,
          "Indexed gameplay-sensitive source definitions require domain semantics under A7.",
          discovery.semanticUnderstandingGapPaths,
        ),
        obligation(
          "gameplay-source-challenges-reconciled", true,
          discovery.discoveryChallengeIds.length === 0,
          "Raw execution/state records require grounded gameplay/scenario dispositions.",
          discovery.discoveryChallengeIds,
        ),
        obligation(
          "gameplay-intent-unknowns-reconciled", true,
          discovery.gameplayIntentUnknownIds.length === 0,
          "Unclassified gameplay intent must be reconciled before model closure.",
          discovery.gameplayIntentUnknownIds,
        ),
        obligation(
          "gameplay-model-state-complete",
          true,
          world.gameplayClosure.stateModelComplete,
          "Gameplay model closure requires a complete material state model.",
          world.gameplayClosure.surfaces.flatMap(
            (surface) => surface.evidenceIds,
          ),
        ),
        obligation(
          "gameplay-model-boundaries-extracted",
          true,
          world.gameplayClosure.boundariesExtracted,
          "Gameplay model closure requires material boundaries to be extracted.",
          world.gameplayClosure.surfaces.flatMap(
            (surface) => surface.boundaries,
          ),
        ),
        obligation(
          "gameplay-model-surfaces-accounted",
          true,
          world.gameplayClosure.unaccountedSurfaceIds.length === 0,
          "Gameplay model closure requires every discovered material surface to be accounted.",
          world.gameplayClosure.unaccountedSurfaceIds,
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "B1",
    "FORMALIZE",
    "Actor / Entity Contract",
    world.entities.definitions === 0
      ? positiveNotApplicable(
          discovery,
          demanded.has("entity-behavior"),
          world.entities.definitions > 0,
        )
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.entities.staticAnalysisLimits > 0 ||
          world.entities.navigationEnvironment.unresolved > 0
        ? "PARTIAL"
        : "CLOSED",
    world.entities.definitions === 0
      ? discoverySupportsAbsence
        ? "No actor/role intent or entity definition remains after complete discovery."
        : "Entity applicability is unresolved while discovery remains incomplete."
      : "Entity behavior/navigation evidence is accounted.",
    ["analysis:entity-behavior"],
    ["ActorEntityContract"],
  ));

  const spatialApplicable =
    world.spatial.resolvedScriptEffects > 0 ||
    world.spatial.structurePlacements > 0 ||
    world.chunks.leases.length > 0;
  checkpoint.push(receipt(
    "B2",
    "FORMALIZE",
    "Spatial & Simulation Contract",
    !spatialApplicable
      ? discoverySupportsAbsence
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.chunks.cleanupOrderUnproven > 0 ||
          world.chunks.readinessUnverifiedLeases > 0
        ? "PARTIAL"
        : "CLOSED",
    !spatialApplicable
      ? discoverySupportsAbsence
        ? "No material spatial/simulation dependency remains after complete discovery."
        : "Spatial/simulation applicability cannot close while discovery is incomplete."
      : "Spatial and chunk/simulation ownership evidence is accounted.",
    [
      "analysis:spatial-authority",
      "analysis:chunk-simulation",
      "analysis:platform-constraints",
    ],
    ["SpatialSimulationContract"],
    {
      obligations: [
        obligation(
          "platform-knowledge-resolved",
          spatialApplicable,
          world.platformKnowledge.profileResolved,
          "Runtime-sensitive spatial/simulation reasoning requires resolved Minecraft/Education platform knowledge.",
          world.platformKnowledge.profileResolved
            ? ["analysis:platform-constraints"]
            : [],
        ),
        obligation(
          "chunk-knowledge-executed",
          world.chunks.leases.length > 0 ||
            graph.knowledgeRequirements.some(
              (item) => item.domain === "chunk-simulation"
            ),
          world.analysisExecution.executedCapabilityIds.includes(
            "chunk-lifecycle-integrity",
          ),
          "Required chunk/simulation knowledge must execute when the scenario depends on it.",
          ["analysis:chunk-simulation"],
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "B3",
    "FORMALIZE",
    "Multiplayer Contract",
    !multiplayer.applicable
      ? (
          discoverySupportsAbsence &&
          !world.arenas.detected &&
          !graph.scenarios.some((scenario) =>
            scenario.playerCounts.some((count) => count > 1)
          )
        )
        ? "NOT_APPLICABLE"
        : "OPEN"
      : multiplayer.scenarios.length > 0
        ? "CLOSED"
        : "PARTIAL",
    !multiplayer.applicable
      ? discoverySupportsAbsence
        ? "No multiplayer signal remains after complete discovery and no multi-player scenario count is present."
        : "Multiplayer applicability cannot close while discovery is incomplete."
      : "Applicable mixed-player scenarios are compiled.",
    multiplayer.scenarios.map((item) => item.id),
    ["MultiplayerContract"],
    {
      obligations: [
        obligation(
          "multiplayer-scenarios-compiled",
          multiplayer.applicable,
          multiplayer.scenarios.length > 0,
          "Applicable multiplayer requires at least one mixed-player scenario.",
          multiplayer.scenarios.map((item) => item.id),
        ),
        obligation(
          "multiplayer-knowledge-executed",
          multiplayer.applicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "multiplayer-interleaving",
          ) || !world.arenas.detected,
          "Arena/shared multiplayer must execute interleaving/isolation analysis.",
          ["analysis:multiplayer-interleaving"],
        ),
      ],
    },
  ));

  const multiArena =
    world.arenas.detected && (world.arenas.count ?? 0) > 1;
  const replicaProofIncomplete =
    world.arenas.replicaIntegrity.incomplete > 0 ||
    world.arenas.replicaIntegrity.noProof > 0 ||
    world.arenas.replicaIntegrity.bounded > 0;
  checkpoint.push(receipt(
    "B4",
    "FORMALIZE",
    "Multi-Arena Contract",
    !multiArena
      ? (
          discoverySupportsAbsence &&
          (
            !world.arenas.detected ||
            world.arenas.count === 1
          )
        )
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.arenas.safeConcurrentArenas == null ||
          world.arenas.isolation.unknown > 0 ||
          replicaProofIncomplete
        ? "PARTIAL"
        : "CLOSED",
    !multiArena
      ? discoverySupportsAbsence
        ? "Complete discovery supports a single/no-arena model."
        : "Multi-arena applicability cannot close while discovery is incomplete or arena count is unresolved."
      : replicaProofIncomplete
        ? "Multi-arena world/topology replica proof is incomplete or unavailable. FORMALIZE cannot inherit baseline behavior into unproven replicas."
        : world.arenas.count !== undefined &&
            world.arenas.safeConcurrentArenas !== undefined &&
            world.arenas.safeConcurrentArenas !== null &&
            world.arenas.safeConcurrentArenas < world.arenas.count
          ? "Multi-arena model is understood, but player-visible arena capacity exceeds playable concurrent capacity. This mismatch is routed to PROVE as a gameplay/design contradiction; queue/fallback/platform limits do not erase it."
          : "Arena baseline, replica integrity, capacity, lifecycle, and isolation obligations are accounted.",
    ["analysis:arena-lifecycle", "analysis:multiplayer-interleaving"],
    ["MultiArenaContract"],
    {
      obligations: [
        obligation(
          "arena-count-resolved",
          multiArena,
          world.arenas.count !== undefined,
          "Multi-arena requires a resolved visible arena count.",
          ["world:arena-count"],
        ),
        obligation(
          "arena-concurrency-resolved",
          multiArena,
          world.arenas.safeConcurrentArenas !== undefined &&
            world.arenas.safeConcurrentArenas !== null,
          "Multi-arena requires resolved playable concurrent capacity.",
          ["capacity:safe-concurrency"],
        ),
        obligation(
          "arena-isolation-analyzed",
          multiArena,
          world.analysisExecution.executedCapabilityIds.includes(
            "multiplayer-interleaving",
          ) &&
          world.arenas.isolation.unknown === 0,
          "Multi-arena requires scoped isolation analysis with no unknown ownership.",
          ["analysis:multiplayer-interleaving"],
        ),
        obligation(
          "arena-lifecycle-analyzed",
          multiArena,
          world.analysisExecution.executedCapabilityIds.includes(
            "arena-lifecycle-integrity",
          ),
          "Multi-arena requires lifecycle/cleanup analysis.",
          ["analysis:arena-lifecycle"],
        ),
        obligation(
          "arena-world-db-replica-proof",
          multiArena,
          !replicaProofIncomplete &&
            (
              world.arenas.replicaIntegrity.complete > 0 ||
              world.arenas.replicaIntegrity.bounded > 0 ||
              world.arenas.replicaIntegrity.diverged > 0
            ),
          "Multi-arena full-map audit requires normalized world/topology replica proof. Divergence may continue to PROVE, but incomplete/no-proof replicas cannot close FORMALIZE.",
          ["analysis:arena-replica-integrity"],
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "B5",
    "FORMALIZE",
    "Boundary Registry",
    boundaries.records.length === 0 &&
      boundaries.unresolvedNames.length === 0
      ? discoverySupportsAbsence
        ? "NOT_APPLICABLE"
        : "OPEN"
      : boundaries.unresolvedNames.length > 0
        ? "PARTIAL"
        : "CLOSED",
    boundaries.unresolvedNames.length > 0
      ? "Material boundary names remain unresolved: " +
        boundaries.unresolvedNames.join(", ") + "."
      : "Material boundaries are extracted with edge cases.",
    boundaries.records.map((item) => item.id),
    ["BoundaryRegistry"],
  ));

  // This is FORMALIZE's source-backed assessment coverage, not proof
  // Minecraft delivered a capability. Zero assessments cannot satisfy
  // classification vacuously (nor prove that no capability exists).
  const hasCapabilityAssessments =
    hidden.capabilityDelivery.length > 0;
  checkpoint.push(receipt(
    "B6",
    "FORMALIZE",
    "Gameplay Capability Delivery",
    !hasCapabilityAssessments
      ? "OPEN"
      : capabilityDeliveryUnproven.length > 0
        ? "PARTIAL"
        : "CLOSED",
    !hasCapabilityAssessments
      ? "No selected-artifact capability assessments are available. Missing assessments cannot establish capability absence or successful delivery."
      : capabilityDeliveryUnproven.length > 0
        ? "Some player-visible/design capability assessments remain unproven: " +
          capabilityDeliveryUnproven
            .map((item) => item.subjectId)
            .join(", ") +
          "."
        : capabilityDeliveryFailures.length > 0
          ? "Assessed capability degradation or absence must continue to PROVE; this structural checkpoint does not establish runtime behavior."
          : "All currently assessed capabilities have a source/model classification; runtime delivery remains unproven without independent observation.",
    hidden.capabilityDelivery.flatMap(
      (item) => item.evidenceIds,
    ),
    ["GameplayCapabilityDelivery"],
    {
      obligations: [
        obligation(
          "capability-delivery-classified",
          true,
          hasCapabilityAssessments &&
            capabilityDeliveryUnproven.length === 0,
          "At least one selected-artifact capability assessment is required, and every assessed capability must have a classified source/model disposition; no classification proves live runtime delivery.",
          hidden.capabilityDelivery.flatMap(
            (item) => item.evidenceIds,
          ),
        ),
      ],
    },
  ));

  const combatApplicable =
    world.combat.hurtHandlers > 0 ||
    world.combat.deathHandlers > 0 ||
    world.combat.damageApplications > 0;
  checkpoint.push(receipt(
    "C1",
    "EVALUATE",
    "Combat Lifecycle",
    combatApplicable
      ? "CLOSED"
      : positiveNotApplicable(
          discovery,
          demanded.has("combat-lifecycle"),
          combatApplicable,
        )
        ? "NOT_APPLICABLE"
        : "OPEN",
    combatApplicable
      ? "Combat lifecycle obligations are evaluated; contradictions flow into PROVE."
      : discoverySupportsAbsence
        ? "No combat intent or runtime combat surface remains after complete discovery."
        : "Combat applicability is unresolved while discovery is incomplete.",
    ["analysis:combat-lifecycle"],
    ["CombatLifecycleContract"],
    {
      obligations: [
        obligation(
          "combat-capability-executed",
          combatApplicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "combat-lifecycle-contract",
          ),
          "Combat capability must execute when combat is applicable.",
          ["analysis:combat-lifecycle"],
        ),
        obligation(
          "combat-path-accounted",
          combatApplicable,
          world.combat.paths.length > 0 ||
            world.combat.policy.reviveContractContradictions > 0,
          "Applicable combat requires at least one scoped combat path or explicit contract contradiction.",
          world.combat.paths.map((item) =>
            item.scriptId + ":" + item.callbackRegion
          ),
        ),
      ],
    },
  ));

  const inventoryApplicable =
    world.inventory.regions > 0 ||
    world.inventory.grantRegions > 0 ||
    world.inventory.dropRegions > 0;
  checkpoint.push(receipt(
    "C2",
    "EVALUATE",
    "Inventory Lifecycle",
    inventoryApplicable
      ? "CLOSED"
      : positiveNotApplicable(
          discovery,
          demanded.has("inventory-state"),
          inventoryApplicable,
        )
        ? "NOT_APPLICABLE"
        : "OPEN",
    inventoryApplicable
      ? "Inventory lifecycle obligations are evaluated."
      : discoverySupportsAbsence
        ? "No inventory intent or lifecycle surface remains after complete discovery."
        : "Inventory applicability is unresolved while discovery is incomplete.",
    ["analysis:inventory-state"],
    ["InventoryLifecycleContract"],
    {
      obligations: [
        obligation(
          "inventory-capability-executed",
          inventoryApplicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "inventory-lifecycle-integrity",
          ),
          "Inventory capability must execute when inventory is applicable.",
          ["analysis:inventory-state"],
        ),
        obligation(
          "inventory-scoped-assessment",
          inventoryApplicable,
          world.inventory.assessments.length > 0,
          "Applicable inventory must expose scoped lifecycle assessment.",
          world.inventory.assessments.map((item) =>
            item.scriptId + ":" + item.executionRegion
          ),
        ),
      ],
    },
  ));

  const economyApplicable = world.economy.sourceKinds.length > 0;
  checkpoint.push(receipt(
    "C3",
    "EVALUATE",
    "Reward / Economy Contract",
    economyApplicable
      ? "CLOSED"
      : positiveNotApplicable(
          discovery,
          demanded.has("economy-reward"),
          economyApplicable,
        )
        ? "NOT_APPLICABLE"
        : "OPEN",
    economyApplicable
      ? "Reward/economy obligations are evaluated."
      : discoverySupportsAbsence
        ? "No reward/economy intent or source remains after complete discovery."
        : "Reward/economy applicability is unresolved while discovery is incomplete.",
    ["analysis:economy-reward"],
    ["RewardEconomyContract"],
    {
      obligations: [
        obligation(
          "economy-capability-executed",
          economyApplicable,
          world.analysisExecution.executedCapabilityIds.includes(
            "economy-reward-integrity",
          ),
          "Economy capability must execute when reward/economy is applicable.",
          ["analysis:economy-reward"],
        ),
        obligation(
          "economy-path-accounted",
          economyApplicable,
          world.economy.paths.length > 0 ||
            world.economy.engineLootEntities > 0 ||
            world.economy.functionLootCommands > 0,
          "Applicable reward/economy requires a scoped reward path or explicit engine/function reward source.",
          world.economy.paths.map((item) =>
            item.scriptId + ":" + item.callbackRegion
          ),
        ),
      ],
    },
  ));

  const persistenceApplicable = (world.persistence?.properties ?? 0) > 0;
  checkpoint.push(receipt(
    "C4",
    "EVALUATE",
    "Persistence Matrix",
    persistenceApplicable
      ? (world.persistence?.unknownScope ?? 0) > 0 ||
        (world.persistence?.unknownLifetime ?? 0) > 0
        ? "PARTIAL"
        : "CLOSED"
      : discoverySupportsAbsence &&
          !demanded.has("persistence-recovery")
        ? "NOT_APPLICABLE"
        : "OPEN",
    persistenceApplicable
      ? "Persistence scope/lifetime evidence is projected across lifecycle boundaries."
      : discoverySupportsAbsence
        ? "No persistent gameplay state remains after complete discovery."
        : "Persistence applicability cannot close while discovery is incomplete.",
    ["analysis:persistence-recovery"],
    ["PersistenceMatrix"],
  ));

  checkpoint.push(receipt(
    "C5",
    "EVALUATE",
    "Deferred Work Registry",
    deferredRelations.length > 0
      ? "CLOSED"
      : discoverySupportsAbsence &&
          !demanded.has("temporal-ownership")
        ? "NOT_APPLICABLE"
        : "OPEN",
    deferredRelations.length > 0
      ? "Deferred/periodic work is enumerated with guard evidence; unsafe work flows into contradiction analysis."
      : discoverySupportsAbsence
        ? "No deferred/periodic gameplay work remains after complete discovery."
        : "Deferred-work applicability cannot close while discovery is incomplete.",
    deferredRelations.map((item) => item.id),
    ["DeferredWorkRegistry"],
    {
      obligations: [
        obligation(
          "deferred-relations-enumerated",
          deferredRelations.length > 0,
          deferredRelations.length > 0,
          "Deferred/periodic relations must be enumerated.",
          deferredRelations.map((item) => item.id),
        ),
        obligation(
          "deferred-ownership-analysis",
          deferredRelations.length > 0,
          world.analysisExecution.executedCapabilityIds.includes(
            "temporal-ownership-integrity",
          ),
          "Deferred work requires temporal ownership analysis.",
          ["analysis:temporal-ownership"],
        ),
      ],
    },
  ));

  const terminalScenario = compiledPresetScenarios.find(
    (scenario) => scenario.label === "terminal-collision",
  );
  const terminalPresetRequired =
    hidden.auditScenarioPreset.scenarios.some(
      (preset) => preset.kind === "terminal-collision",
    );
  const competingTerminalIntent =
    intent.nodes.filter((node) => node.kind === "outcome").length > 1;
  checkpoint.push(receipt(
    "C6",
    "EVALUATE",
    "Terminal Ownership",
    terminalScenario
      ? "CLOSED"
      : discoverySupportsAbsence &&
          !competingTerminalIntent &&
          !terminalPresetRequired
        ? "NOT_APPLICABLE"
        : "OPEN",
    terminalScenario
      ? "The terminal-collision preset is represented by its compiled identity; causal proof remains separate."
      : terminalPresetRequired
        ? "The required terminal-collision preset is missing or its compiled identity/flow does not match."
        : discoverySupportsAbsence
          ? "No materially competing terminal scenario was activated after complete discovery."
          : "Terminal-collision applicability cannot close while discovery is incomplete.",
    terminalScenario ? [terminalScenario.id] : [],
    ["TerminalCollisionMatrix"],
  ));

  const cleanupApplicable =
    world.arenas.cleanup.acquiredSurfaces > 0 ||
    world.arenas.cleanup.resourceLedger.resources > 0;
  const cleanupDemand =
    cleanupApplicable ||
    world.arenas.detected ||
    deferredRelations.length > 0 ||
    inventoryApplicable ||
    world.entities.definitions > 0 ||
    world.structures.loads > 0 ||
    world.chunks.tickingAreaAcquires > 0;
  checkpoint.push(receipt(
    "C7",
    "EVALUATE",
    "Cleanup Ledger",
    !cleanupApplicable
      ? discoverySupportsAbsence && !cleanupDemand
        ? "NOT_APPLICABLE"
        : "OPEN"
      : world.arenas.cleanup.resourceLedger.missing > 0 ||
          world.arenas.cleanup.unresolved > 0
        ? "PARTIAL"
        : "CLOSED",
    cleanupApplicable
      ? "Cleanup resources and terminal coverage are accounted."
      : discoverySupportsAbsence && !cleanupDemand
        ? "No material mutable resource requiring cleanup remains after complete discovery."
        : "Cleanup obligations are expected from detected mutable gameplay resources but no complete cleanup ledger is available.",
    ["analysis:arena-lifecycle"],
    ["CleanupLedger"],
    {
      obligations: [
        obligation(
          "cleanup-ledger-complete",
          cleanupApplicable,
          world.arenas.cleanup.resourceLedger.missing === 0 &&
            world.arenas.cleanup.unresolved === 0,
          "Every acquired cleanup resource must be accounted on applicable terminal paths.",
          ["analysis:arena-lifecycle"],
        ),
      ],
    },
  ));

  const repeated = compiledPresetScenarios.find(
    (scenario) => scenario.label === "repeated-run",
  );
  const repeatedPresetRequired =
    hidden.auditScenarioPreset.scenarios.some(
      (preset) => preset.kind === "repeated-run",
    );
  const reuseDemand =
    world.arenas.detected ||
    intent.edges.some(
      (edge) =>
        edge.kind === "resets" ||
        edge.kind === "recovers-to",
    );
  checkpoint.push(receipt(
    "C8",
    "EVALUATE",
    "Second-Run Equivalence",
    repeated
      ? "CLOSED"
      : discoverySupportsAbsence &&
          !reuseDemand &&
          !repeatedPresetRequired
        ? "NOT_APPLICABLE"
        : "OPEN",
    repeated
      ? "The repeated-run preset is represented by its compiled identity; lifecycle proof is assessed by the applicable knowledge obligations."
      : repeatedPresetRequired
        ? "The required repeated-run preset is missing or its compiled identity/flow does not match."
        : discoverySupportsAbsence && !reuseDemand
          ? "No replay/reuse/reset/recovery surface is present after complete discovery."
          : "Replay/reuse applicability is unresolved; detected reset/recovery or arena lifecycle requires explicit repeated-run accounting.",
    repeated ? [repeated.id] : [],
    ["SecondRunEquivalenceAssessment"],
    {
      obligations: [
        obligation(
          "repeated-run-scenario",
          repeatedPresetRequired || reuseDemand,
          repeated !== undefined,
          "Replay/reuse requires a repeated-run scenario.",
          repeated ? [repeated.id] : [],
        ),
        obligation(
          "repeated-run-dependencies-resolved",
          repeated !== undefined,
          repeated === undefined ||
            repeated.requiredKnowledgeIds.every((id) =>
              graph.knowledgeReceipts.some(
                (receipt) =>
                  receipt.requirementId === id &&
                  receipt.status === "SATISFIED"
              )
            ),
          "Repeated-run scenario requires all applicable cleanup/state/world dependencies to return satisfied receipts.",
          repeated?.requiredKnowledgeIds ?? [],
        ),
      ],
    },
  ));

  const requiredCrossSystemScenarioLabels =
    new Set<string>();

  const hasArena =
    demanded.has("arena-lifecycle") ||
    world.arenas.detected;
  const hasMultiplayer =
    demanded.has("multiplayer-interleaving") ||
    multiplayer.applicable;
  const hasCombat =
    demanded.has("combat-lifecycle");
  const hasInventory =
    demanded.has("inventory-state");
  const hasPersistence =
    demanded.has("persistence-recovery") ||
    (world.persistence?.properties ?? 0) > 0;
  const hasEconomy =
    demanded.has("economy-reward");
  const hasTemporal =
    demanded.has("temporal-ownership") ||
    deferredRelations.length > 0;
  const hasMutableRunState =
    hasArena ||
    hasInventory ||
    hasPersistence ||
    hasEconomy ||
    world.entities.definitions > 0 ||
    world.structures.loads > 0 ||
    world.chunks.tickingAreaAcquires > 0;

  if (hasArena && hasMultiplayer) {
    requiredCrossSystemScenarioLabels.add(
      "multi-arena-parallel",
    );
  }
  if (multiArena) {
    requiredCrossSystemScenarioLabels.add(
      "arena-replica-integrity",
    );
  }
  if (
    hasPersistence &&
    (
      hasInventory ||
      hasCombat ||
      hasArena
    )
  ) {
    requiredCrossSystemScenarioLabels.add(
      "disconnect-reconnect",
    );
    requiredCrossSystemScenarioLabels.add(
      "reload-recovery",
    );
  }
  if (hasTemporal) {
    requiredCrossSystemScenarioLabels.add(
      "deferred-ownership",
    );
  }
  if (
    hasCombat &&
    (
      hasEconomy ||
      hasArena ||
      hasTemporal
    )
  ) {
    requiredCrossSystemScenarioLabels.add(
      "terminal-collision",
    );
  }
  if (hasMutableRunState) {
    requiredCrossSystemScenarioLabels.add(
      "repeated-run",
    );
  }
  if (
    world.arenas.count !== undefined &&
    world.arenas.safeConcurrentArenas !== undefined &&
    world.arenas.safeConcurrentArenas !== null &&
    world.arenas.safeConcurrentArenas <
      world.arenas.count
  ) {
    requiredCrossSystemScenarioLabels.add(
      "arena-capacity-plus-one",
    );
  }

  for (const kind of [
    "player-capability-integrity",
    "world-rule-authority",
    "client-server-reconciliation",
    "spatial-containment",
  ] as const) {
    if (
      hidden.auditScenarioPreset.scenarios.some(
        (scenario) => scenario.kind === kind,
      )
    ) {
      requiredCrossSystemScenarioLabels.add(kind);
    }
  }

  const requiredCrossSystemPresets =
    hidden.auditScenarioPreset.scenarios.filter((preset) =>
      requiredCrossSystemScenarioLabels.has(preset.kind)
    );
  const crossSystemScenarios = compiledPresetScenarios.filter(
    (scenario) => requiredCrossSystemPresets.some(
      (preset) => scenario.id === "preset:" + preset.id,
    ),
  );
  // A required kind missing from the preset inventory is still a gap;
  // a declared preset missing from the graph is a separate specific gap.
  const missingCrossSystemLabels = [
    ...[...requiredCrossSystemScenarioLabels].filter((kind) =>
      !requiredCrossSystemPresets.some((preset) => preset.kind === kind)
    ),
    ...requiredCrossSystemPresets
      .filter((preset) => !crossSystemScenarios.some(
        (scenario) => scenario.id === "preset:" + preset.id,
      ))
      .map((preset) => preset.kind + " [" + preset.id + "]"),
  ].sort();

  // Compiling a preset is not the same as evaluating a gameplay dependency.
  // Verify scoped source components, a concrete causal path, and every
  // declared knowledge receipt using existing Scenario Graph evidence.
  // Leave missing evidence unresolved rather than accepting an empty
  // scenario or a domain-only/generic placeholder as inspected gameplay.
  // Analysis capability receipts are domain context, not selected-source
  // causal evidence. An evidenced edge must belong to this exact scenario
  // and one of its linked components must have selected-artifact evidence.
  const selectedSourceEvidenceIds = new Set(
    intent.evidence
      .filter((record) => record.scope === "selected-artifact")
      .map((record) => record.id),
  );
  const sourceBoundCrossSystemLinks = crossSystemScenarios.map((scenario) => ({
    scenarioId: scenario.id,
    links: scenario.causalLinkIds.flatMap((id) =>
      graph.causalLinks.filter((link) =>
        link.id === id &&
        link.scenarioId === scenario.id &&
        link.fromComponentId !== link.toComponentId &&
        scenario.componentIds.includes(link.fromComponentId) &&
        scenario.componentIds.includes(link.toComponentId) &&
        link.evidenceIds.some((evidenceId) =>
          selectedSourceEvidenceIds.has(evidenceId)
        ) &&
        [link.fromComponentId, link.toComponentId].some((componentId) =>
          graph.components.some((component) =>
            component.id === componentId &&
            component.evidenceIds.some((evidenceId) =>
              selectedSourceEvidenceIds.has(evidenceId)
            )
          )
        )
      )
    ),
  }));
  const unboundCrossSystemScenarios = sourceBoundCrossSystemLinks
    .filter((item) => item.links.length === 0)
    .map((item) => item.scenarioId)
    .sort();
  const sourceBoundCrossSystemEvidenceIds = [
    ...new Set(sourceBoundCrossSystemLinks.flatMap((item) =>
      item.links.flatMap((link) =>
        link.evidenceIds.filter((id) => selectedSourceEvidenceIds.has(id))
      )
    )),
  ].sort();
  const unaccountedCrossSystemKnowledge = crossSystemScenarios
    .filter((scenario) =>
      scenario.requiredKnowledgeIds.length === 0 ||
      scenario.requiredKnowledgeIds.some((id) =>
        !graph.knowledgeReceipts.some((receipt) =>
          receipt.scenarioId === scenario.id &&
          receipt.requirementId === id &&
          receipt.status === "SATISFIED"
        )
      )
    )
    .map((scenario) => scenario.id)
    .sort();
  const crossSystemCoverageComplete =
    missingCrossSystemLabels.length === 0 &&
    unboundCrossSystemScenarios.length === 0 &&
    unaccountedCrossSystemKnowledge.length === 0;
  const crossSystemCoverageReasons = [
    ...(missingCrossSystemLabels.length === 0 ? [] : [
      "Required cross-system preset identities are missing: " +
        missingCrossSystemLabels.join(", ") + ".",
    ]),
    ...(unboundCrossSystemScenarios.length === 0 ? [] : [
      "Cross-system scenarios lack selected-source component or causal-link evidence: " +
        unboundCrossSystemScenarios.join(", ") + ".",
    ]),
    ...(unaccountedCrossSystemKnowledge.length === 0 ? [] : [
      "Cross-system scenarios lack satisfied scoped knowledge receipts: " +
        unaccountedCrossSystemKnowledge.join(", ") + ".",
    ]),
  ];

  checkpoint.push(receipt(
    "C9",
    "EVALUATE",
    "Cross-System Scenario Coverage",
    requiredCrossSystemScenarioLabels.size === 0
      ? discoverySupportsAbsence
        ? "NOT_APPLICABLE"
        : "OPEN"
      : crossSystemCoverageComplete
        ? "CLOSED"
        : "OPEN",
    crossSystemCoverageReasons.length > 0
      ? crossSystemCoverageReasons.join(" ")
      : requiredCrossSystemScenarioLabels.size > 0
        ? "Every required cross-system preset has scoped component/link evidence and satisfied knowledge receipts; PROVE separately determines gameplay conclusions."
        : discoverySupportsAbsence
          ? "No high-value cross-system intersection is demanded after complete discovery."
          : "Cross-system applicability cannot close while discovery is incomplete.",
    sourceBoundCrossSystemEvidenceIds,
    ["ActivatedCrossSystemScenarioSet"],
    {
      obligations: [
        obligation(
          "required-cross-system-scenarios-activated",
          requiredCrossSystemScenarioLabels.size > 0,
          missingCrossSystemLabels.length === 0,
          "Every materially demanded cross-system intersection must activate its exact preset identity.",
          [],
        ),
        obligation(
          "cross-system-scenarios-source-bound",
          requiredCrossSystemScenarioLabels.size > 0,
          missingCrossSystemLabels.length === 0 &&
            unboundCrossSystemScenarios.length === 0,
          "Every required cross-system scenario must bind selected-source components and a scoped evidenced causal link, not only a preset name.",
          sourceBoundCrossSystemEvidenceIds,
        ),
        obligation(
          "cross-system-scenarios-knowledge-accounted",
          requiredCrossSystemScenarioLabels.size > 0,
          missingCrossSystemLabels.length === 0 &&
            unaccountedCrossSystemKnowledge.length === 0,
          "Each required cross-system scenario must have explicit, satisfied knowledge receipts scoped to its declared requirements.",
          crossSystemScenarios.flatMap((scenario) =>
            graph.knowledgeReceipts
              .filter((receipt) =>
                receipt.scenarioId === scenario.id &&
                scenario.requiredKnowledgeIds.includes(receipt.requirementId) &&
                receipt.status === "SATISFIED"
              )
              .flatMap((receipt) => receipt.evidenceIds)
          ),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "D1",
    "PROVE",
    "Required Inspection Graph",
    scenarioClosure.missingRequiredKnowledgeIds.length > 0 ||
      scenarioClosure.capabilityGapKnowledgeIds.length > 0 ||
      scenarioClosure.prerequisiteBlockedKnowledgeIds.length > 0 ||
      capabilityFailureRoutedIds.length !==
        capabilityDeliveryFailures.length
      ? "OPEN"
      : "CLOSED",
    capabilityFailureRoutedIds.length !==
        capabilityDeliveryFailures.length
      ? "A gameplay capability delivery failure exists without a CONTRADICTED causal link; design/implementation failure has not been routed into proof."
      : "RIG knowledge receipts and gameplay capability delivery failures are evaluated fail-closed.",
    [
      ...graph.knowledgeReceipts.flatMap(
        (item) => item.evidenceIds,
      ),
      ...hidden.capabilityDelivery.flatMap(
        (item) => item.evidenceIds,
      ),
    ],
    ["RequiredInspectionGraph", "GameplayCapabilityDelivery"],
    {
      obligations: [
        obligation(
          "capability-failures-routed-to-proof",
          capabilityDeliveryFailures.length > 0,
          capabilityFailureRoutedIds.length ===
            capabilityDeliveryFailures.length,
          "Every degraded/missing player-visible capability must map to a CONTRADICTED causal link; technical explanation alone cannot close it.",
          capabilityFailureRoutedIds,
        ),
        obligation(
          "runtime-residue-has-targeted-tests",
          scenarioClosure.runtimeBlockedCausalLinkIds.length > 0,
          scenarioClosure.runtimeProofRequests.length ===
            scenarioClosure.runtimeBlockedCausalLinkIds.length,
          "Every runtime-blocked gameplay dependency must emit one narrow runtime proof request; unresolved runtime residue may never remain a status-only note.",
          scenarioClosure.runtimeProofRequests.map(
            (item) => item.causalLinkId,
          ),
        ),
        obligation(
          "detection-gaps-have-targeted-tests",
          scenarioClosure.detectionGapCausalLinkIds.length > 0,
          scenarioClosure.detectionGapTestRequests.length ===
            scenarioClosure.detectionGapCausalLinkIds.length,
          "Every detection gap must emit one targeted tester obligation so unsupported semantics cannot silently remove a required gameplay test.",
          scenarioClosure.detectionGapTestRequests.map(
            (item) => item.causalLinkId,
          ),
        ),
      ],
    },
  ));

  checkpoint.push(receipt(
    "D2",
    "PROVE",
    "Contradiction Admission",
    scenarioClosure.status === "OPEN"
      ? "OPEN"
      : scenarioClosure.status === "PARTIAL"
        ? "PARTIAL"
        : "CLOSED",
    "Gameplay causal links are resolved to scenario-level proof states.",
    graph.causalLinks.flatMap((item) => item.evidenceIds),
    ["GameplayCausalLinks"],
    {
      reasonCode:
        scenarioClosure.status === "PARTIAL"
          ? "RUNTIME_PROOF_REQUIRED"
          : scenarioClosure.status === "OPEN"
            ? "PROCEDURE_BLOCKED"
            : "COMPLETE",
    },
  ));

  checkpoint.push(receipt(
    "D3",
    "PROVE",
    "Counter-Proof Search",
    defectResolution.counterProofSearchRequiredIds.length > 0 ||
      defectResolution.gameplayTranslationRequiredIds.length > 0
      ? "OPEN"
      : defectResolution.runtimeProofRequiredIds.length > 0
        ? "PARTIAL"
        : "CLOSED",
    "Every contradiction is routed through Gameplay Defect Resolution.",
    defectResolution.resolutions.flatMap(
      (item) => item.counterProofEvidenceIds ?? [],
    ),
    ["GameplayDefectResolution"],
    {
      reasonCode:
        defectResolution.runtimeProofRequiredIds.length > 0 &&
        defectResolution.counterProofSearchRequiredIds.length === 0 &&
        defectResolution.gameplayTranslationRequiredIds.length === 0
          ? "RUNTIME_PROOF_REQUIRED"
          : defectResolution.counterProofSearchRequiredIds.length > 0 ||
              defectResolution.gameplayTranslationRequiredIds.length > 0
            ? "PROCEDURE_BLOCKED"
            : "COMPLETE",
    },
  ));

  checkpoint.push(receipt(
    "D4",
    "PROVE",
    "Root-Cause Consolidation",
    scenarioClosure.status === "OPEN" ||
      defectResolution.status === "BLOCKED"
      ? "PARTIAL"
      : "CLOSED",
    scenarioClosure.status === "OPEN"
      ? "Root-cause consolidation cannot close while material scenario residue remains unresolved."
      : "Resolved defects are ready for semantic root-cause consolidation; report coverage enforces one-time causal-link coverage.",
    defectResolution.confirmedDefectReadyIds,
    ["RootCauseConsolidation"],
  ));

  checkpoint.push(receipt(
    "E1",
    "REPORT",
    "Map Audit Report Contract",
    scenarioClosure.status === "OPEN" ||
      defectResolution.status === "BLOCKED"
      ? "OPEN"
      : scenarioClosure.status === "PARTIAL"
        ? "PARTIAL"
        : "CLOSED",
    scenarioClosure.status === "OPEN"
      ? "Material scenario residue remains unresolved; report readiness is blocked until it becomes PROVEN, targeted NEED_VALIDATION, or explicit counter-proof."
      : scenarioClosure.status === "PARTIAL"
        ? "Only irreducible runtime-proof residue remains; every item must stay visible with its targeted validation test."
        : "Map Audit Report may preserve every material PROVEN and NEED_VALIDATION finding; approved Bug Report V2 promotion remains downstream.",
    [
      ...defectResolution.confirmedDefectReadyIds,
      ...defectResolution.runtimeProofRequiredIds,
      ...defectResolution.detectionGapIds,
    ],
    ["MapAuditReport"],
    {
      reasonCode:
        scenarioClosure.status === "PARTIAL"
          ? "RUNTIME_PROOF_REQUIRED"
          : scenarioClosure.status === "OPEN" ||
              defectResolution.status === "BLOCKED"
            ? "PROCEDURE_BLOCKED"
            : "COMPLETE",
    },
  ));

  const blocks = (
    ["TARGET", "DISCOVERY", "UNDERSTAND", "FORMALIZE", "EVALUATE", "PROVE", "REPORT"] as const
  ).map((block) => blockClosure(block, checkpoint));

  const status =
    blocks.some((item) => item.status === "OPEN")
      ? "OPEN"
      : blocks.some((item) => item.status === "PARTIAL")
        ? "PARTIAL"
        : "CLOSED";

  const reasons = blocks.flatMap((block) =>
    block.status === "CLOSED"
      ? []
      : [
          block.block +
            " is " +
            block.status +
            (block.openCheckpointIds.length > 0
              ? "; open: " + block.openCheckpointIds.join(", ")
              : "") +
            (block.partialCheckpointIds.length > 0
              ? "; partial: " + block.partialCheckpointIds.join(", ")
              : "") +
            ".",
        ],
  );

  const blockingCheckpointIds = checkpoint
    .filter((item) => item.blocksPublication)
    .map((item) => item.id)
    .sort();

  return {
    schemaVersion: 1,
    policy: "mandatory-gameplay-audit-procedure",
    checkpoints: checkpoint,
    blocks,
    status,
    stateRegistry,
    ownershipRegistry,
    progressionContracts,
    blockingCheckpointIds,
    reasons,
  };
}
