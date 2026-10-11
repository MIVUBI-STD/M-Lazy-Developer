import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayAuditScenarioPreset,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";
import {
  buildGameplayKnowledgeReceipts,
  buildGameplayKnowledgeRequirements,
  expandGameplayKnowledgeRequirementIds,
  gameplayScenarioNeighborhoodNodeIds,
  requiredKnowledgeDomainsForIntentScenario,
  requiredKnowledgeDomainsForPreset,
} from "./gameplay-scenario-knowledge.js";
import type {
  GameplayScenarioComponent,
  GameplayCausalLink,
  GameplayScenarioGraph,
  GameplayScenario,
  GameplaySourceFlowCandidate,
  GameplayMechanicReconstruction,
  GameplayJourneyCandidate,
} from "./gameplay-scenario-model.js";
import {
  semanticIrExecutionTraces, type SemanticIr,
} from "../../../semantic-ir/src/index.js";

const SCENARIO_NODE_KINDS = new Set([
  "mechanic",
  "objective",
  "phase",
  "lifecycle",
  "outcome",
]);

function purposeForNode(
  node: GameplayIntentNode,
): string {
  if (node.description?.trim()) {
    return node.description.trim();
  }
  switch (node.kind) {
    case "objective":
      return "Provide or resolve a player-facing objective.";
    case "phase":
      return "Control a material stage of the player journey.";
    case "lifecycle":
      return "Maintain valid gameplay state across entry, active play, exit, cleanup, or recovery.";
    case "mechanic":
      return "Provide gameplay behavior required by one or more player scenarios.";
    case "outcome":
      return "Produce a player-visible gameplay result.";
    case "resource":
      return "Provide a gameplay resource required by another mechanic or state.";
    case "state":
      return "Represent gameplay state consumed by transitions or mechanics.";
    case "actor":
    case "role":
      return "Participate in player-facing gameplay behavior.";
    case "spatial-region":
      return "Provide the world-space context required by gameplay.";
    case "policy":
      return "Constrain gameplay availability, ownership, capacity, or transition rules.";
    case "game":
      return "Represent the selected game's overall gameplay contract.";
    default:
      return "Support selected-artifact gameplay.";
  }
}

function technicalRoleForNode(
  node: GameplayIntentNode,
): string {
  return node.kind + ": " + node.label;
}

function edgeStatus(
  edge: GameplayIntentEdge,
  sourceEvidenceIds: ReadonlySet<string>,
): GameplayCausalLink["status"] {
  // Inferred dependencies or dangling evidence IDs are never causal proof.
  return edge.status === "authored" &&
    edge.evidenceIds.some(id => sourceEvidenceIds.has(id))
      ? "PROVEN"
      : "DETECTION_GAP";
}

function impactPathFrom(
  startId: string,
  scenarioComponentIds: ReadonlySet<string>,
  intent: GameplayIntentModel,
): readonly string[] {
  const terminalKinds = new Set<GameplayIntentNode["kind"]>([
    "objective",
    "outcome",
  ]);
  const byId = new Map(
    intent.nodes.map((node) => [node.id, node]),
  );
  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const path = queue[queueIndex]!;
    const currentId = path[path.length - 1]!;
    const current = byId.get(currentId);
    if (
      path.length > 1 &&
      current !== undefined &&
      terminalKinds.has(current.kind)
    ) {
      return path;
    }

    const nextIds = intent.edges
      .filter(
        (edge) =>
          edge.status !== "hypothesis" &&
          edge.evidenceIds.length > 0 &&
          edge.from === currentId &&
          scenarioComponentIds.has(edge.to) &&
          (
            edge.kind === "produces" ||
            edge.kind === "transitions-to" ||
            edge.kind === "recovers-to" ||
            edge.kind === "wins-by" ||
            edge.kind === "loses-by" ||
            edge.kind === "requires"
          ),
      )
      .map((edge) => edge.to)
      .sort();

    for (const nextId of nextIds) {
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      queue.push([...path, nextId]);
    }
  }
  return [];
}

function dimensionEvidenceForRuntimeComponent(
  componentId: string,
  world: GameplayWorldModel,
): GameplayCausalLink["dimensionEvidence"] {
  const fallback = (id: string): readonly string[] => [id];
  const ids = (values: readonly string[], id: string) =>
    values.length > 0 ? [...new Set(values)].sort() : fallback(id);

  switch (componentId) {
    case "runtime:arena": {
      const ownerIds = world.arenas.globalState.assessments.map(
        (item) =>
          "arena-global:" +
          item.mutationId +
          ":" +
          item.status,
      );
      return {
        owner: ids(ownerIds, "runtime:arena"),
        generation: fallback("runtime:arena"),
      };
    }
    case "runtime:arena-cleanup": {
      const cleanupIds = world.arenas.cleanup.lifecycle.assessments.map(
        (item) =>
          "arena-cleanup:" +
          item.scriptId +
          ":" +
          item.tableName +
          ":" +
          item.status,
      );
      return {
        cleanup: ids(cleanupIds, "runtime:arena-cleanup"),
        owner: ids(cleanupIds, "runtime:arena-cleanup"),
      };
    }
    case "runtime:persistence": {
      const propertyIds = (world.persistence?.propertiesDetail ?? []).map(
        (item) =>
          "persistence:" +
          item.scriptId +
          ":" +
          item.propertyId +
          ":" +
          item.scope +
          ":" +
          item.lifetime,
      );
      return {
        owner: ids(propertyIds, "runtime:persistence"),
        generation: ids(propertyIds, "runtime:persistence"),
        cleanup: ids(propertyIds, "runtime:persistence"),
      };
    }
    case "runtime:inventory": {
      const inventoryIds = world.inventory.assessments.map(
        (item) =>
          "inventory:" +
          item.scriptId +
          ":" +
          item.executionRegion +
          ":" +
          item.status,
      );
      return {
        owner: ids(inventoryIds, "runtime:inventory"),
        cleanup: ids(inventoryIds, "runtime:inventory"),
      };
    }
    case "runtime:structures":
      return {
        cleanup: fallback("runtime:structures"),
        geometry: fallback("runtime:structures"),
      };
    case "runtime:spatial":
      return {
        geometry: fallback("runtime:spatial"),
      };
    case "runtime:arena-replica-integrity": {
      const replicaIds = world.arenas.replicaProof.flatMap(
        (item) =>
          item.evidenceIds.length > 0
            ? item.evidenceIds
            : [
                "arena-replica:" +
                item.arenaId +
                ":" +
                item.status,
              ],
      );
      return {
        geometry: ids(
          replicaIds,
          "runtime:arena-replica-integrity",
        ),
      };
    }
    case "runtime:player-capability": {
      const capabilityIds = world.capabilityExposure.exposures.flatMap(
        (item) =>
          item.evidenceIds.length > 0
            ? item.evidenceIds
            : [
                "capability:" +
                item.capabilityId +
                ":" +
                item.status,
              ],
      );
      return {
        capability: ids(
          capabilityIds,
          "runtime:player-capability",
        ),
        activation: ids(
          capabilityIds,
          "runtime:player-capability",
        ),
      };
    }
    case "runtime:world-rules":
      return {
        "world-rule": fallback("runtime:environment"),
      };
    case "runtime:client-reconciliation":
      return world.clientReconciliation.predictedMutationCancellations > 0
        ? {}
        : {
            representation:
              fallback("runtime:client-reconciliation"),
          };
    default:
      return {};
  }
}

function impactPathEvidenceIds(
  path: readonly string[],
  intent: GameplayIntentModel,
): readonly string[] {
  if (path.length < 2) return [];
  const evidence: string[] = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index]!;
    const to = path[index + 1]!;
    const edge = intent.edges.find(
      (item) =>
        item.from === from &&
        item.to === to &&
        item.status !== "hypothesis" &&
        item.evidenceIds.length > 0,
    );
    if (edge === undefined) return [];
    evidence.push(...edge.evidenceIds);
  }
  return [...new Set(evidence)].sort();
}

function stageForNode(
  node: GameplayIntentNode,
): string {
  if (node.kind === "phase") return node.label;
  if (node.kind === "objective") return "Objective";
  if (node.kind === "outcome") return "Result / Terminal";
  if (node.kind === "lifecycle") return "Lifecycle / Recovery";
  return "Gameplay";
}

function presetAnchorIds(
  kind: GameplayAuditScenarioPreset["scenarios"][number]["kind"],
  intent: GameplayIntentModel,
): readonly string[] {
  const preferredKinds: readonly GameplayIntentNode["kind"][] =
    kind === "map-type-coverage"
      ? [
          "game",
          "mechanic",
          "objective",
          "phase",
          "lifecycle",
          "state",
          "resource",
          "policy",
          "outcome",
        ]
      : kind === "multi-arena-parallel" ||
    kind === "arena-replica-integrity" ||
    kind === "arena-capacity-plus-one" ||
    kind === "player-capability-integrity" ||
    kind === "world-rule-authority"
      ? ["policy", "lifecycle", "state"]
      : kind === "client-server-reconciliation" ||
        kind === "spatial-containment"
        ? ["spatial-region", "policy", "state"]
      : kind === "disconnect-reconnect" ||
        kind === "reload-recovery" ||
        kind === "repeated-run"
        ? ["lifecycle", "state", "outcome"]
        : kind === "terminal-collision"
          ? ["outcome", "lifecycle", "state"]
          : kind === "deferred-ownership"
            ? ["lifecycle", "state", "phase"]
            : kind === "full-journey"
              ? ["phase", "objective", "outcome"]
              : ["state", "lifecycle", "policy"];

  const authored = intent.nodes.filter(
    (node) =>
      preferredKinds.includes(node.kind) &&
      node.status !== "hypothesis",
  );

  const ranked = authored.sort((a, b) => {
    const kindRank = (node: GameplayIntentNode) =>
      preferredKinds.indexOf(node.kind);
    return (
      kindRank(a) - kindRank(b) ||
      a.id.localeCompare(b.id)
    );
  });

  return ranked.slice(0, 3).map((node) => node.id);
}

function presetPlayerCounts(
  preset: GameplayAuditScenarioPreset,
): readonly number[] {
  return [...new Set(
    preset.scenarios
      .map((scenario) => scenario.playerCount)
      .filter((value): value is number => value !== undefined),
  )].sort((a, b) => a - b);
}

function runtimeComponents(
  world: GameplayWorldModel,
): readonly Omit<GameplayScenarioComponent, "usedByScenarioIds" | "orphan">[] {
  const output: Omit<GameplayScenarioComponent, "usedByScenarioIds" | "orphan">[] = [];
  if (world.arenas.detected) {
    output.push({
      id: "runtime:arena",
      label: "Arena ownership and capacity",
      kind: "runtime-domain",
      technicalRole: "Arena assignment, concurrency, isolation, cleanup, and reuse.",
      gameplayPurpose: "Keep simultaneous player sessions independent and make visible arena capacity actually playable.",
      evidenceIds: ["world:arena-count"],
    });
  }
  if (
    world.arenas.detected &&
    (world.arenas.count ?? 0) > 1
  ) {
    output.push({
      id: "runtime:arena-replica-integrity",
      label: "Arena replica integrity",
      kind: "runtime-domain",
      technicalRole: "World/topology equivalence and material delta classification across configured arena replicas.",
      gameplayPurpose: "Prevent incomplete or materially diverged physical arenas from inheriting the canonical arena's gameplay safety.",
      evidenceIds: ["runtime:arena-replica-integrity"],
    });
  }
  if (
    world.arenas.cleanup.resourceLedger.resources > 0
  ) {
    output.push({
      id: "runtime:arena-cleanup",
      label: "Arena cleanup resource ledger",
      kind: "runtime-domain",
      technicalRole: "Acquired gameplay resources and their terminal release coverage across tags, effects, scoreboards, callbacks, entities, permissions, membership, and dynamic properties.",
      gameplayPurpose: "Return every completed or aborted session to a reusable baseline without leaking Run 1 state into Run 2.",
      evidenceIds: ["runtime:arena-cleanup"],
    });
  }
  if (
    world.chunks.tickingAreaAcquires > 0 ||
    world.chunks.tickingAreaReadinessStates > 0 ||
    world.chunks.capacityUncheckedLeases > 0 ||
    world.entities.definitions > 0
  ) {
    output.push({
      id: "runtime:chunks",
      label: "Chunk and ticking simulation",
      kind: "runtime-domain",
      technicalRole: "Chunk residency, ticking-area acquisition, readiness, and release.",
      gameplayPurpose: "Keep remote gameplay actors and world logic simulated when progression depends on them.",
      evidenceIds: ["runtime:chunks"],
    });
  }
  if (world.entities.definitions > 0) {
    output.push({
      id: "runtime:entities",
      label: "Entity lifecycle and navigation",
      kind: "runtime-domain",
      technicalRole: "Entity spawn, AI, target, navigation, removal, and lifecycle evidence.",
      gameplayPurpose: "Make configured actors actually spawn, act, move, terminate, and contribute to progression.",
      evidenceIds: ["runtime:entities"],
    });
  }
  if (
    world.combat.hurtHandlers > 0 ||
    world.combat.deathHandlers > 0 ||
    world.combat.damageApplications > 0
  ) {
    output.push({
      id: "runtime:combat",
      label: "Combat lifecycle",
      kind: "runtime-domain",
      technicalRole: "Damage, death, projectile, revive, and combat terminal ownership.",
      gameplayPurpose: "Keep combat outcomes, death, revive, and terminal transitions consistent with player state.",
      evidenceIds: ["runtime:combat"],
    });
  }
  if (world.inventory.regions > 0 || world.inventory.grantRegions > 0) {
    output.push({
      id: "runtime:inventory",
      label: "Inventory and equipment lifecycle",
      kind: "runtime-domain",
      technicalRole: "Inventory grant, reset, drop, equipment, and restore ownership.",
      gameplayPurpose: "Keep kits, items, rewards, death state, reconnect state, and retry state correct for each player.",
      evidenceIds: ["runtime:inventory"],
    });
  }
  if ((world.persistence?.properties ?? 0) > 0) {
    output.push({
      id: "runtime:persistence",
      label: "Persistence and recovery",
      kind: "runtime-domain",
      technicalRole: "Persisted state scope, lifetime, reload, and recovery reconstruction.",
      gameplayPurpose: "Preserve or intentionally restart material gameplay state across reload and reconnect.",
      evidenceIds: ["runtime:persistence"],
    });
  }
  if (
    world.structures.loads > 0 ||
    world.structures.runtimeLogicLoads > 0
  ) {
    output.push({
      id: "runtime:structures",
      label: "World and structure setup",
      kind: "runtime-domain",
      technicalRole: "Structure load, placement, world setup, transition residue, and mutation.",
      gameplayPurpose: "Prepare the playable world state before a stage begins and restore it for later runs.",
      evidenceIds: ["runtime:structures"],
    });
  }
  if (world.economy.sourceKinds.length > 0) {
    output.push({
      id: "runtime:economy",
      label: "Economy and rewards",
      kind: "runtime-domain",
      technicalRole: "Reward sources, score/currency mutation, pickup, and idempotency.",
      gameplayPurpose: "Make progression rewards and scoring match what the player actually achieved.",
      evidenceIds: ["runtime:economy"],
    });
  }
  if (
    world.worldRules.writes > 0 ||
    world.worldRules.manualEntitySpawnPaths > 0
  ) {
    output.push({
      id: "runtime:world-rules",
      label: "World-rule and environment authority",
      kind: "runtime-domain",
      technicalRole: "Gamerule writers and manual entity-spawn mechanisms.",
      gameplayPurpose: "Attribute world behavior to the exact governing rule or spawn mechanism instead of conflating natural and privileged/manual paths.",
      evidenceIds: ["runtime:environment"],
    });
  }
  if (
    world.playerCapabilities.gamemodeWrites > 0 ||
    world.playerCapabilities.abilityWrites > 0 ||
    world.playerCapabilities.commandPermissionWrites > 0 ||
    world.playerCapabilities.privilegedGuardReferences > 0 ||
    world.playerCapabilities.protectionDefinitions > 0 ||
    world.capabilityExposure.exposed > 0 ||
    world.capabilityExposure.potentiallyExposed > 0 ||
    world.capabilityExposure.unresolved > 0
  ) {
    output.push({
      id: "runtime:player-capability",
      label: "Player capability and privileged-role authority",
      kind: "runtime-domain",
      technicalRole: "Gamemode, ability, command permission, privileged guards and protection activation.",
      gameplayPurpose: "Keep Builder, Roommaster/operator and developer privileges scoped to their intended gameplay and maintenance responsibilities.",
      evidenceIds: ["runtime:player-capability"],
    });
  }
  if (
    world.clientReconciliation.predictedMutationCancellations > 0
  ) {
    output.push({
      id: "runtime:client-reconciliation",
      label: "Client/server world-mutation reconciliation",
      kind: "runtime-domain",
      technicalRole: "Client-predicted world actions cancelled by server-side before-event protection.",
      gameplayPurpose: "Ensure a rejected world mutation converges to the same authoritative state on the acting client and other clients.",
      evidenceIds: ["runtime:client-reconciliation"],
    });
  }
  if (
    world.spatial.resolvedScriptEffects > 0 ||
    world.spatial.structurePlacements > 0 ||
    world.spatial.authority.configured
  ) {
    output.push({
      id: "runtime:spatial",
      label: "Spatial authority and collision/world interaction",
      kind: "runtime-domain",
      technicalRole: "World-space mutation, interaction ownership and physical/spatial constraints.",
      gameplayPurpose: "Ensure player and world interactions remain inside the intended physical and authority boundaries.",
      evidenceIds: ["runtime:spatial"],
    });
  }
  return output;
}

function normalizedLocator(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function scriptMatchesScenarioScope(
  scriptId: string,
  sourceLocators: readonly string[],
): boolean {
  const script = normalizedLocator(scriptId);
  return sourceLocators.some((locator) => {
    const normalized = normalizedLocator(locator);
    return (
      normalized === script ||
      normalized.endsWith("/" + script) ||
      normalized.includes("/" + script + ".") ||
      script.endsWith("/" + normalized)
    );
  });
}

function scopedByScript<T extends { scriptId: string }>(
  items: readonly T[],
  sourceLocators: readonly string[],
): readonly T[] {
  if (sourceLocators.length === 0) return [];
  return items.filter((item) =>
    scriptMatchesScenarioScope(
      item.scriptId,
      sourceLocators,
    )
  );
}

function identifierMatchesScenarioScope(
  identifier: string,
  sourceLocators: readonly string[],
): boolean {
  if (sourceLocators.length === 0) return false;
  const raw = normalizedLocator(identifier);
  const tail = raw.split(":").at(-1) ?? raw;
  return sourceLocators.some((locator) => {
    const normalized = normalizedLocator(locator).split("#")[0]!;
    const basename =
      normalized.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? normalized;
    return (
      normalized.includes(raw) ||
      basename === tail ||
      normalized.endsWith("/" + tail) ||
      normalized.includes("/" + tail + ".")
    );
  });
}

function aggregateCannotBeScoped(
  aggregateProblem: boolean,
  sourceLocators: readonly string[],
  scopedCount: number,
  domain: string,
): Pick<GameplayCausalLink, "status" | "reason"> | undefined {
  if (
    aggregateProblem &&
    sourceLocators.length > 0 &&
    scopedCount === 0
  ) {
    return {
      status: "DETECTION_GAP",
      reason:
        domain +
        " problems exist elsewhere in the selected artifact, but none are source-correlated to this scenario. Do not promote a domain-global contradiction into this scenario.",
    };
  }
  return undefined;
}


function runtimeEdgeState(
  componentId: string,
  world: GameplayWorldModel,
  sourceLocators: readonly string[] = [],
  scenarioLabel?: string,
): Pick<GameplayCausalLink, "status" | "reason"> {
  switch (componentId) {
    case "runtime:world-rules": {
      if (
        world.arenas.detected &&
        world.arenas.globalState
          .unleasedArenaMutations > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Arena-owned gameplay mutates world-global state without a matching global ownership/lease path. A world-level gamerule or environment change cannot be treated as arena-local, so concurrent sessions can interfere without any player playtest being required to establish the ownership defect.",
        };
      }
      if (
        world.arenas.detected &&
        (
          world.arenas.globalState
            .unauditedArenaMutations > 0 ||
          world.arenas.globalState.assessments.some(
            (item) =>
              item.status ===
                "partial-lease-evidence",
          )
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Arena-owned world-global mutation has only partial ownership/audit evidence. Keep it explicitly unresolved and complete the source-side lease/arbitration proof before requesting Minecraft runtime validation.",
        };
      }
      if (world.worldRules.conflicts > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "The same gamerule has multiple selected-artifact values; lifecycle/order intent must be resolved before treating either value as the effective world baseline.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "World-rule writers are internally non-conflicting. Natural mob spawning is " +
          world.worldRules.naturalMobSpawning +
          ", while " +
          String(world.worldRules.manualEntitySpawnPaths) +
          " manual/script spawn path(s) are tracked separately.",
      };
    }
    case "runtime:player-capability": {
      if (world.capabilityExposure.exposed > 0) {
        const exposed = world.capabilityExposure.exposures
          .filter((item) => item.status === "exposed")
          .map((item) =>
            item.capabilityId +
            " (" +
            item.impact +
            ", prerequisite=" +
            item.prerequisiteReachability +
            ")"
          )
          .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact reachability proves release-enabled restricted capability exposure without its required authorization gate: " +
            exposed.join(", ") +
            ". Runtime reproduction is not required to establish the exposure; gameplay translation still determines the reportable player consequence.",
        };
      }
      if (world.capabilityExposure.potentiallyExposed > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Restricted capability exposure is source-detected, but ordinary-player prerequisite reachability or active-guard status is not yet fully proven. Resolve the selected-artifact reachability/guard path before any local Minecraft test.",
        };
      }
      if (world.playerCapabilities.inactiveProtectionDefinitions > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Protection code is defined but not instantiated; inactive protection cannot be credited as a blocking guard.",
        };
      }
      if (
        world.capabilityMutationFootprint.partial > 0 ||
        world.capabilityMutationFootprint.unresolved > 0
      ) {
        const residual = world.capabilityMutationFootprint.surfaces
          .filter((item) => item.status !== "covered")
          .map((item) => item.surface + "=" + item.status)
          .join(", ");
        return {
          status: "DETECTION_GAP",
          reason:
            "Broad player capability has unresolved mutation/reset footprint: " +
            residual +
            ". Resolve these exact residuals before treating the role as safely contained.",
        };
      }
      if (world.playerCapabilities.privilegedBypassReturns > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Privileged/admin early-return bypasses exist and require exact scope/impact proof before they can be classified safe or defective.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Detected player capability mutations have complete discovered reset/protection coverage and no inactive protection definition or unresolved privileged bypass signal.",
      };
    }
    case "runtime:client-reconciliation": {
      if (
        world.clientReconciliation.predictedMutationCancellations > 0
      ) {
        return {
          status: "RUNTIME_BLOCKED",
          runtimeNativeReason: "client-reconciliation" as const,
          reason:
            "Server-side cancellation of a client-predicted world mutation is source-proven, but actual client visual reconciliation is native runtime behavior. One narrow multi-client comparison is required; broad manual playthrough is not.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "No client-predicted world-mutation cancellation surface was detected for this scenario.",
      };
    }
    case "runtime:spatial": {
      if (scenarioLabel === "spatial-containment") {
        if (world.arenas.barrierContainment.status === "contained") {
          return {
            status: "PROVEN",
            reason:
              "Barrier-only exterior flood-fill cannot reach any authored arena volume in any replica. Physical barrier containment is established without treating loading bounds as collision bounds.",
          };
        }
        if (
          world.arenas.barrierContainment.status === "incomplete" ||
          world.arenas.barrierContainment.status === "budget-exceeded" ||
          world.arenas.barrierContainment.status === "not-run"
        ) {
          return {
            status: "DETECTION_GAP",
            reason:
              "Physical containment proof is incomplete or unavailable; an arena-escape finding must not be promoted from movement capability or loading-bound evidence alone.",
          };
        }
        return {
          status: "DETECTION_GAP",
          reason:
            "Barrier-only proof does not establish a closed enclosure. Other collision geometry must be checked before deciding whether physical escape is actually reachable.",
        };
      }
      if (world.spatial.authority.conflicts > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Spatial authority rules conflict for one or more selected-artifact interactions.",
        };
      }
      if (
        world.spatial.authority.uncovered > 0 ||
        world.spatial.authority.unknownRegions > 0 ||
        world.spatial.unresolvedScriptMutations > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Spatial authority or world-mutation coverage remains incomplete.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Spatial mutation and authority coverage has no unresolved contradiction for the mapped dependency.",
      };
    }
    case "runtime:arena-replica-integrity": {
      if (world.arenas.replicaIntegrity.diverged > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "One or more configured arena replicas diverge from the canonical arena. Replica divergence must be classified for gameplay materiality before baseline safety can be reused.",
        };
      }
      if (
        world.arenas.replicaIntegrity.incomplete > 0 ||
        world.arenas.replicaIntegrity.noProof > 0 ||
        world.arenas.replicaIntegrity.bounded > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Arena replica proof is incomplete or bounded. A configured/playable replica cannot inherit canonical arena safety until world/topology proof is complete or every material delta is classified.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Configured arena replicas have complete equivalence proof with no unclassified material divergence.",
      };
    }
    case "runtime:arena": {
      if (
        scenarioLabel === "deferred-ownership" &&
        world.arenas.lifecycle
          .unresolvedDeferredMutations > 0
      ) {
        const deferred =
          world.arenas.lifecycle
            .deferredMutations
            .filter((item) =>
              item.status === "unresolved"
            )
            .map((item) =>
              item.scriptId +
              ":" +
              item.callbackRegion +
              " -> " +
              item.mutationRegions.join(" | ")
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Deferred gameplay mutation reaches mutable session/arena state without source-proven generation/session revalidation: " +
            deferred.join("; ") +
            ". Keep ownership unresolved until a generation/session guard or a blocking exclusion is proven.",
        };
      }

      if (
        scenarioLabel === "terminal-collision" &&
        world.arenas.lifecycle
          .terminalPrecedenceUnresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Multiple terminal ingress paths exist without source-proven deterministic outcome precedence or tie policy. A one-shot latch can prevent duplicate commit but does not prove which simultaneous terminal outcome wins.",
        };
      }

      if (
        scenarioLabel === "terminal-collision" &&
        world.arenas.lifecycle
          .provenTerminalRaces > 0
      ) {
        const races =
          world.arenas.lifecycle.terminalRaces
            .filter((item) =>
              item.status ===
                "contradicted"
            )
            .map((item) =>
              item.terminalRegion +
              " <= " +
              item.ingresses
                .map((ingress) =>
                  ingress.kind +
                  ":" +
                  ingress.id
                )
                .join(" | ")
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "A terminal owner is reachable from an unguarded deferred ingress and another distinct terminal ingress while no source-proven one-shot terminal latch blocks re-entry: " +
            races.join("; ") +
            ". This is a static terminal-race/double-ending contradiction and does not require broad runtime reproduction.",
        };
      }
      if (
        scenarioLabel === "terminal-collision" &&
        world.arenas.lifecycle
          .unresolvedTerminalRaces > 0
      ) {
        const races =
          world.arenas.lifecycle.terminalRaces
            .filter((item) =>
              item.status ===
                "unresolved"
            )
            .map((item) =>
              item.terminalRegion +
              " <= " +
              item.ingresses
                .map((ingress) =>
                  ingress.kind +
                  ":" +
                  ingress.id
                )
                .join(" | ")
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Different terminal ingresses converge on the same terminal owner, but source evidence does not yet prove coexistence or a blocking/idempotent exclusion: " +
            races.join("; ") +
            ". Keep this terminal-collision state explicit as unresolved rather than calling it a bug or safe.",
        };
      }
      if (
        scenarioLabel === "terminal-collision" &&
        world.arenas.lifecycle
          .multiIngressTerminalTargets >
        world.arenas.lifecycle
          .terminalRaces.length
      ) {
        const targets =
          world.arenas.lifecycle.terminalIngresses
            .filter((item) =>
              item.status ===
                "multi-ingress"
            )
            .map((item) =>
              item.terminalRegion +
              " <= " +
              item.incomingCallerRegions.join(" | ")
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Multiple independent source paths can enter a terminal owner, but their concrete event/deferred ingress provenance is not fully resolved: " +
            targets.join("; ") +
            ". Preserve this gray-zone until exactly-once ownership can be proven.",
        };
      }
      const reduced =
        world.arenas.count !== undefined &&
        world.arenas.safeConcurrentArenas !== undefined &&
        world.arenas.safeConcurrentArenas !== null &&
        world.arenas.safeConcurrentArenas < world.arenas.count;
      const scopedIsolation = scopedByScript(
        world.arenas.isolation.observations,
        sourceLocators,
      );
      const mutationById = new Map(
        world.arenas.globalState.mutations.map((item) => [
          item.id,
          item,
        ]),
      );
      const scopedGlobalAssessments =
        world.arenas.globalState.assessments.filter((item) => {
          const mutation = mutationById.get(item.mutationId);
          return (
            mutation !== undefined &&
            scriptMatchesScenarioScope(
              mutation.ownerId,
              sourceLocators,
            )
          );
        });
      const isolationGap =
        scopedIsolation.some(
          (item) => item.status === "shared-global",
        ) ||
        scopedGlobalAssessments.some(
          (item) => item.status === "unleased",
        );
      if (reduced || isolationGap) {
        return {
          status: "CONTRADICTED",
          reason:
            reduced
              ? "Selected-artifact arena capacity is player-visible at " +
                String(world.arenas.count) +
                " arena(s), but only " +
                String(world.arenas.safeConcurrentArenas) +
                " can run concurrently. Queue/fallback behavior and platform/resource limits explain or mitigate the implementation constraint but are not counter-proof for the gameplay/design capacity mismatch."
              : "Cross-arena ownership/isolation evidence contradicts the scenario dependency.",
        };
      }
      if (
        scopedIsolation.some(
          (item) =>
            item.status === "unknown" ||
            item.status === "partition-proof-required",
        ) ||
        scopedGlobalAssessments.some(
          (item) =>
            item.status === "partial-lease-evidence" ||
            !item.audited,
        ) ||
        world.arenas.lifecycle.unresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Arena lifecycle/isolation evidence remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason: "Arena ownership/capacity evidence has no unresolved contradiction for this dependency.",
      };
    }
    case "runtime:chunks": {
      if (
        world.chunks.tickingAreaAcquires === 0 &&
        world.chunks.tickingAreaReadinessStates === 0 &&
        world.chunks.readinessProbes === 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "This gameplay scenario requires explicit chunk/simulation ownership, but the selected artifact exposes no ticking-area acquisition/readiness mechanism for the dependency.",
        };
      }

      const badStatuses = new Set([
        "acquire-without-release",
        "release-unreachable",
        "capacity-unchecked",
      ]);
      const unresolvedStatuses = new Set([
        "readiness-unverified",
        "cleanup-order-unproven",
        "dynamic-key",
      ]);
      const scopedLeases =
        sourceLocators.length === 0
          ? []
          : world.chunks.leases.filter((lease) =>
              scriptMatchesScenarioScope(
                lease.scriptId,
                sourceLocators,
              )
            );
      const scopedBad = scopedLeases.filter((lease) =>
        badStatuses.has(lease.status)
      );
      const scopedUnresolved = scopedLeases.filter((lease) =>
        unresolvedStatuses.has(lease.status)
      );

      if (scopedBad.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped chunk/ticking lease evidence for this scenario contains: " +
            scopedBad
              .map((lease) =>
                lease.scriptId +
                ":" +
                (lease.leaseKey ?? "<dynamic>") +
                "=" +
                lease.status
              )
              .join(", ") +
            ".",
        };
      }

      if (scopedUnresolved.length > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scoped chunk/ticking lease evidence for this scenario remains unresolved: " +
            scopedUnresolved
              .map((lease) =>
                lease.scriptId +
                ":" +
                (lease.leaseKey ?? "<dynamic>") +
                "=" +
                lease.status
              )
              .join(", ") +
            ".",
        };
      }

      const aggregateProblem =
        world.chunks.acquireWithoutRelease > 0 ||
        world.chunks.releaseUnreachable > 0 ||
        world.chunks.capacityUncheckedLeases > 0 ||
        world.chunks.unguardedDeferredChunkWork > 0 ||
        world.chunks.readinessUnverifiedLeases > 0 ||
        world.chunks.cleanupOrderUnproven > 0;

      if (
        aggregateProblem &&
        sourceLocators.length > 0 &&
        scopedLeases.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Chunk/ticking problems exist elsewhere in the selected artifact, but none are source-correlated to this scenario. Do not contaminate this scenario with a domain-global contradiction.",
        };
      }

      return {
        status: "PROVEN",
        reason:
          "Chunk/ticking ownership has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:entities": {
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenCrossIngressEffectCalls > 0
      ) {
        const effects =
          world.progression.actorAccounting
            .crossIngressEffectCalls
            .filter((item) =>
              item.status ===
                "contradicted"
            )
            .map((item) =>
              item.ingress +
              " -> " +
              item.target +
              " callbacks=" +
              String(
                item.callbackRegions.length,
              ) +
              " ordinalAdvance=" +
              String(
                item.directOrdinalAmount,
              )
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "A single exact event ingress reaches the same progression effect through multiple unconditional callbacks, and that effect directly advances progression without a source-proven one-shot latch: " +
            effects.join("; ") +
            ". This is a static cross-ingress exactly-once violation and does not require runtime reproduction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenCrossIngressOrdinalAdvances > 0
      ) {
        const ingresses =
          world.progression.actorAccounting
            .crossIngressOrdinalAdvances
            .map((item) =>
              item.ingress +
              " -> " +
              item.target +
              " callbacks=" +
              String(
                item.callbackRegions.length,
              ) +
              " totalAdvance=" +
              String(item.totalAmount)
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "A single exact event ingress fans out to multiple unconditional callbacks that directly advance the same progression ordinal: " +
            ingresses.join("; ") +
            ". One event occurrence therefore advances progression more than once; this is a static cross-ingress exactly-once violation.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .duplicateProgressionAdvances > 0
      ) {
        const advances =
          world.progression.actorAccounting
            .progressionAdvances
            .filter((item) =>
              item.status ===
                "duplicate"
            )
            .map((item) =>
              item.counterId +
              "->" +
              item.effectTarget +
              " calls=" +
              String(item.calls) +
              " region=" +
              item.executionRegion
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "A single source completion gate invokes the same progression effect more than once for the same counter: " +
            advances.join("; ") +
            ". This proves an exactly-once progression ownership violation and a static double-advance risk without runtime reproduction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .deadEndStateMachines > 0
      ) {
        const machines =
          world.progression.actorAccounting
            .stateMachines
            .filter((item) =>
              item.status === "dead-end"
            )
            .map((item) =>
              item.tableName +
              " dead-end=[" +
              item.deadEndStates.join(",") +
              "]" +
              (
                item.sourceEnteredDeadEndStates
                  .length > 0
                  ? " source-entered=[" +
                    item.sourceEnteredDeadEndStates.join(",") +
                    "]"
                  : ""
              )
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Authored progression state-machine contract contains active-reachable state(s) with no legal path to a recognized completion/terminal state: " +
            machines.join("; ") +
            ". This is a static progression dead-end/design mismatch; source-entered dead-end states are called out when present, and runtime reproduction is not required.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .invalidStateTransitions > 0
      ) {
        const transitions =
          world.progression.actorAccounting
            .stateTransitions
            .filter((item) =>
              item.status === "invalid"
            )
            .map((item) =>
              item.target +
              ":" +
              item.from +
              "->" +
              item.to +
              " allowed=[" +
              item.allowedTargets.join(",") +
              "]"
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact source performs guarded gameplay state transition(s) that violate the uniquely correlated authored transition table: " +
            transitions.join("; ") +
            ". This is a static design/state-machine mismatch and does not require runtime reproduction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenActiveInstantDespawnWithoutReconciliation > 0
      ) {
        const actors =
          world.progression.actorAccounting.details
            .flatMap((item) =>
              item.uncoveredActiveInstantDespawnActorIdentifiers
            )
            .filter((id, index, all) =>
              all.indexOf(id) === index
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact source proves counted actor type(s) can activate minecraft:instant_despawn under an active gameplay state guard while no matching entity-remove reconciliation reaches the actor counter: " +
            actors.join(", ") +
            ". Active-state ownership may come from a direct guard, a parser-declared state-machine state reachable from an explicit active anchor, a source-proven active-state transition followed by calls/events in the same sequential block, or propagation through the source call graph; this is an active-wave counter convergence contradiction and does not require runtime reproduction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenImmediateDespawnWithoutReconciliation > 0
      ) {
        const actors =
          world.progression.actorAccounting.details
            .flatMap((item) =>
              item.uncoveredImmediateDespawnActorIdentifiers
            )
            .filter((id, index, all) =>
              all.indexOf(id) === index
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact entity definitions prove counted actor type(s) include base minecraft:instant_despawn while their actor counter has no matching remove reconciliation path: " +
            actors.join(", ") +
            ". The actor population can disappear immediately without converging the progression counter, so runtime reproduction is not required to establish the contradiction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenSpawnQuantityMismatch > 0
      ) {
        const counters =
          world.progression.actorAccounting.details
            .filter((item) =>
              item.status ===
                "spawn-quantity-mismatch"
            )
            .map((item) =>
              item.counterId +
              " quantity-mismatch=" +
              String(
                item.quantityMismatchGrowths,
              )
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact wave accounting proves a deterministic direct spawn quantity does not match the actor-counter growth amount: " +
            counters.join("; ") +
            ". The counter and spawned population diverge in the same source path, so runtime reproduction is not required to establish this progression contradiction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenActorIdentityMismatch > 0
      ) {
        const counters =
          world.progression.actorAccounting.details
            .filter((item) =>
              item.status ===
                "actor-identity-mismatch"
            )
            .map((item) =>
              item.counterId +
              " spawn=[" +
              item.spawnLinkedActorIdentifiers.join(",") +
              "] reconcile=[" +
              item.lifecycleActorIdentifiers.join(",") +
              "]"
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact actor accounting proves counter growth is linked to one actor identity while the lifecycle-linked decrement is guarded for a different actor identity: " +
            counters.join("; ") +
            ". The counted actor has no matching reconciliation path, so runtime reproduction is not required to establish the identity mismatch.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .provenMissingReconciliation > 0
      ) {
        const counters =
          world.progression.actorAccounting.details
            .filter((item) =>
              item.status ===
                "missing-reconciliation"
            )
            .map((item) =>
              item.scriptId +
              ":" +
              item.counterId
            )
            .sort();
        return {
          status: "CONTRADICTED",
          reason:
            "Selected-artifact progression accounting proves a completion counter can grow and is checked for zero/complete, but has no decrement or replacement/recompute path: " +
            counters.join(", ") +
            ". The progression gate cannot converge through that counter lifecycle, so runtime reproduction is not required to establish the accounting contradiction.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .unboundRegistryAuthorities > 0
      ) {
        const registries =
          world.progression.actorAccounting
            .registryAuthorityAssessments
            .filter((item) =>
              item.status ===
                "generation-unbound"
            )
            .map((item) =>
              item.registryExpression
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Actor population lifecycle is owned by registry collection(s) " +
            registries.join(", ") +
            ", but their selected-artifact collection expressions are not explicitly generation/epoch/round/session bound. Do not treat an unversioned live-entity registry as authoritative across arena reuse.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .deferredSpawnAccountingGaps > 0
      ) {
        const counters =
          world.progression.actorAccounting.details
            .filter((item) =>
              item.status ===
                "deferred-spawn-accounting-unproven"
            )
            .map((item) =>
              item.counterId +
              " deferredActors=[" +
              item.deferredSpawnActorIdentifiers.join(",") +
              "] reservation=" +
              item.deferredSpawnReservationStatus +
              " generation=" +
              item.deferredSpawnGenerationStatus
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Selected-artifact progression has zero-gated actor counters with deferred spawn materialization that is not fully covered by pre-defer population reservation and generation revalidation: " +
            counters.join("; ") +
            ". A pending/retry spawn can therefore remain semantically outstanding while the materialized-actor counter reads zero. Resolve this source-side ownership before treating the wave as safe or escalating to player testing.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .unresolvedCrossIngressEffectCalls > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "One exact event ingress reaches the same progression-looking effect through multiple unconditional callbacks, but the target has neither direct progression-mutation proof nor source-proven idempotency. Keep this explicit as unresolved instead of calling it a bug or safe.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .conditionalDespawnUnknowns > 0
      ) {
        const actors =
          world.progression.actorAccounting.details
            .flatMap((item) =>
              item.unresolvedConditionalDespawnActorIdentifiers
            )
            .filter((id, index, all) =>
              all.indexOf(id) === index
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Counted actor type(s) have conditional despawn activation that is source-reachable from an engine/sensor/exact external event path, or remains identity/scope unresolved, without source-proven remove reconciliation: " +
            actors.join(", ") +
            ". Terminal-only and statically inactive conditional despawn paths are excluded from this gray-zone; resolve the remaining event/state ownership before runtime escalation.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .scriptedRemovalCoverageGaps > 0
      ) {
        const actors =
          world.progression.actorAccounting.details
            .flatMap((item) =>
              item.uncoveredScriptedRemovalActorIdentifiers
            )
            .filter((id, index, all) =>
              all.indexOf(id) === index
            )
            .sort();
        return {
          status: "DETECTION_GAP",
          reason:
            "Selected-artifact source proves counted actor type(s) can be removed/killed by a non-death scripted disappearance path without a source-linked remove reconciliation or direct counter decrement: " +
            actors.join(", ") +
            ". Proven terminal-only cleanup paths are excluded from this gap; the remaining removal path is non-terminal or its lifecycle scope is unresolved. Keep it as gray-zone evidence until source-side lifecycle ownership closes it before any runtime test.",
        };
      }
      if (
        scenarioLabel ===
          "progression-wave-integrity" &&
        world.progression.actorAccounting
          .unresolvedCounters > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Progression-like counter evidence is present but its producer/consumer/reconciliation lifecycle is incomplete. Keep it explicit in unresolved reporting and finish source-side counter ownership proof before any player test.",
        };
      }
      if (
        scenarioLabel === "progression-wave-integrity" &&
        world.combat.deathHandlers === 0 &&
        world.chunks.entityRemoveObservers === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity-backed progression is material, but no selected-artifact entity death/removal observer is available to prove actor-count reconciliation. This is an explicit wave/progression gray-zone: it is not a bug by itself, but it cannot be treated as safe until another source-proven completion/accounting path is found.",
        };
      }
      const scopedAi = world.entities.aiStack.assessments.filter(
        (item) =>
          identifierMatchesScenarioScope(
            item.entityKey,
            sourceLocators,
          ),
      );
      const scopedNavigation =
        world.entities.navigationEnvironment.assessments.filter(
          (item) =>
            identifierMatchesScenarioScope(
              item.entityKey,
              sourceLocators,
            ),
        );
      const badAi = scopedAi.filter(
        (item) =>
          item.status === "targeted-stack-incomplete" ||
          (
            item.missingSurfaces.includes("navigation") ||
            item.missingSurfaces.includes("movement")
          ),
      );
      const badNavigation = scopedNavigation.filter(
        (item) => item.status === "incompatible",
      );
      if (badAi.length > 0 || badNavigation.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scenario-scoped entity AI/navigation evidence contains an incomplete or incompatible actor path.",
        };
      }
      if (
        scopedNavigation.some(
          (item) =>
            item.status === "unresolved" ||
            item.status === "state-dependent",
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scenario-scoped entity navigation remains unresolved or state-dependent.",
        };
      }
      const aggregateProblem =
        world.entities.aiStack.targetedStackIncomplete > 0 ||
        world.entities.aiStack.navigationWithoutMovement > 0 ||
        world.entities.aiStack.targetedWithoutNavigation > 0 ||
        world.entities.navigationEnvironment.incompatible > 0;
      if (
        aggregateProblem &&
        sourceLocators.length > 0 &&
        scopedAi.length === 0 &&
        scopedNavigation.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity AI/navigation problems exist in the selected artifact, but none can be correlated to this scenario's actor/source scope.",
        };
      }
      if (
        sourceLocators.length === 0 &&
        aggregateProblem
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity AI/navigation contains aggregate problems, but this scenario has no actor/source locator strong enough for scoped contradiction.",
        };
      }
      if (
        world.entities.staticAnalysisLimits > 0 &&
        scopedAi.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Entity behavior has static-analysis limitations and no scoped actor proof for this scenario.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Entity lifecycle/navigation has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:combat": {
      const scopedPaths = scopedByScript(
        world.combat.paths,
        sourceLocators,
      );
      const scopedProjectileGap = scopedPaths.some(
        (item) =>
          item.projectileSpawns > 0 &&
          item.projectileRemovals === 0,
      );
      const scopedHurtOnly =
        scopedPaths.some((item) => item.event === "hurt") &&
        !scopedPaths.some((item) => item.event === "death");
      if (
        scopedProjectileGap ||
        scopedHurtOnly ||
        world.combat.policy.reviveContractContradictions > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped combat path or authored combat contract contradicts the gameplay dependency.",
        };
      }
      const contamination = aggregateCannotBeScoped(
        world.combat.projectileCleanupGap > 0 ||
        world.combat.hurtOnlyTerminalRisk > 0,
        sourceLocators,
        scopedPaths.length,
        "Combat lifecycle",
      );
      if (contamination) return contamination;
      return {
        status: "PROVEN",
        reason:
          "Combat lifecycle has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:inventory": {
      const scopedAssessments = scopedByScript(
        world.inventory.assessments,
        sourceLocators,
      );
      const bad = scopedAssessments.filter(
        (item) =>
          item.status === "partial-reset" ||
          item.status === "copy-writeback-risk",
      );
      if (
        bad.length > 0 ||
        world.inventory.restoreOwnership.multipleRestoreOwners > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped inventory lifecycle contains partial reset/copy-writeback risk or restore ownership conflict.",
        };
      }
      const contamination = aggregateCannotBeScoped(
        world.inventory.partialResets > 0 ||
        world.inventory.copyMutationRisks > 0,
        sourceLocators,
        scopedAssessments.length,
        "Inventory lifecycle",
      );
      if (contamination) return contamination;

      const scopedGrantGaps =
        scopedAssessments.filter(
          (item) =>
            item.unverifiedItemGrants > 0 ||
            item.propagatedItemGrants > 0,
        );
      if (scopedGrantGaps.length > 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scoped inventory grant path calls Container.addItem without source proof that the returned remainder/result is checked. Grant success remains unresolved until the full quantity commit is verified.",
        };
      }
      const grantContamination =
        aggregateCannotBeScoped(
          world.inventory
            .grantVerificationGaps > 0,
          sourceLocators,
          scopedAssessments.length,
          "Inventory grant verification",
        );
      if (grantContamination) {
        return grantContamination;
      }

      if (
        world.inventory.unresolvedEquipmentSlotEvidence > 0 ||
        world.inventory.restoreOwnership.unknownIdentityGrants > 0 ||
        world.inventory.restoreOwnership
          .initialSessionOverlapUnresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Inventory identity/equipment or initial-session restore ownership remains unresolved. Resolve the source-side initialSpawn guard/ownership before requesting a reconnect playtest.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Inventory lifecycle has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:arena-cleanup": {
      const ledger = world.arenas.cleanup.resourceLedger;
      if (ledger.missing > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Arena cleanup resource ledger has " +
            ledger.missing +
            " acquired resource(s) with no proven terminal release path.",
        };
      }
      if (
        ledger.partial > 0 ||
        world.arenas.cleanup.unresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Arena cleanup resource release is only partially proven; second-run baseline equivalence requires targeted validation.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Arena cleanup resource ledger has complete terminal release coverage for discovered resources.",
      };
    }
    case "runtime:persistence": {
      const scopedProperties = scopedByScript(
        world.persistence?.propertiesDetail ?? [],
        sourceLocators,
      );
      const bad = scopedProperties.filter(
        (item) =>
          item.growth === "append-without-clear" &&
          (
            item.scope === "world" ||
            item.lifetime === "world" ||
            item.lifetime === "unknown"
          ),
      );
      if (bad.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped persistence property can outlive the intended gameplay lifecycle without a clear/reset path: " +
            bad.map((item) =>
              item.scriptId + ":" + item.propertyId
            ).join(", ") +
            ".",
        };
      }
      const contamination = aggregateCannotBeScoped(
        (world.persistence?.appendWithoutClear ?? 0) > 0,
        sourceLocators,
        scopedProperties.length,
        "Persistence",
      );
      if (contamination) return contamination;

      const scopedReconnectRisks =
        (world.persistence
          ?.reconnectTransientRestoreRisks ?? [])
          .filter((item) =>
            scriptMatchesScenarioScope(
              item.scriptId,
              sourceLocators,
            )
          );
      if (
        scopedReconnectRisks.length > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Reconnect/initial-spawn path reads persisted session/arena-scoped state without source proof of reconciliation against current ownership: " +
            scopedReconnectRisks
              .map((item) =>
                item.scriptId +
                ":" +
                item.propertyId +
                " (" +
                item.lifecycleEvent +
                ")"
              )
              .sort()
              .join(", ") +
            ". Persisted state may inform recovery, but stale transient session state must not reactivate silently.",
        };
      }
      const reconnectContamination =
        aggregateCannotBeScoped(
          (world.persistence
            ?.reconnectTransientRestoreRiskCount ?? 0) > 0,
          sourceLocators,
          scopedReconnectRisks.length,
          "Reconnect persistence reconciliation",
        );
      if (reconnectContamination) {
        return reconnectContamination;
      }

      const scopedResultRecords =
        (world.persistence
          ?.resultAuditRecordDetails ?? [])
          .filter((item) =>
            scriptMatchesScenarioScope(
              item.scriptId,
              sourceLocators,
            )
          );
      if (
        scopedResultRecords.some(
          (item) =>
            item.status === "partial",
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Durable result journal exists but does not carry the full recovery identity required for result/reward replay safety.",
        };
      }

      if (
        scopedProperties.some(
          (item) =>
            item.scope === "unknown" ||
            item.lifetime === "unknown",
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scoped persistence scope/lifetime remains unresolved.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Persistence/recovery has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:structures": {
      const scopedLoads =
        world.structures.loadCorrelations.filter(
          (item) =>
            scriptMatchesScenarioScope(
              item.functionId,
              sourceLocators,
            ),
        );
      const scopedTransitions =
        world.structures.transitionResidue.filter(
          (item) =>
            scriptMatchesScenarioScope(
              item.functionId,
              sourceLocators,
            ),
        );
      const missingLoads = scopedLoads.filter(
        (item) =>
          item.status === "missing" ||
          item.status === "ambiguous",
      );
      if (missingLoads.length > 0) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scenario-scoped structure load does not resolve to exactly one selected-artifact structure definition.",
        };
      }
      if (
        scopedTransitions.some(
          (item) =>
            item.status === "incomplete" ||
            item.preservedByVoid > 0,
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Scenario-scoped structure transition has residue/incomplete evidence. This is not promoted to a defect without a grounded reset/replacement contract.",
        };
      }
      const aggregateProblem =
        world.structures.unresolvedLoads > 0 ||
        world.structures.transitionResidueRisks > 0 ||
        world.structures.transitionResidueUnresolved > 0;
      if (
        aggregateProblem &&
        sourceLocators.length > 0 &&
        scopedLoads.length === 0 &&
        scopedTransitions.length === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Structure problems exist elsewhere in the selected artifact, but none are source-correlated to this scenario.",
        };
      }
      if (aggregateProblem && sourceLocators.length === 0) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Structure analysis contains aggregate problems, but this scenario lacks source scope for a safe contradiction.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "World/structure setup has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    case "runtime:economy": {
      const scopedResultMachines = scopedByScript(
        world.progression.actorAccounting.stateMachines.filter(
          (item) =>
            /(?:result|terminal)/i.test(item.tableName) ||
            item.reason.includes("Authored result lifecycle"),
        ),
        sourceLocators,
      );
      if (
        scopedResultMachines.length > 0 &&
        (world.persistence
          ?.completeResultAuditRecords ?? 0) === 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Result/terminal lifecycle is present but no complete durable result audit/recovery record is source-proven.",
        };
      }

      if (
        scopedResultMachines.some(
          (item) => item.status === "unresolved",
        )
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Result lifecycle ordering is unresolved before reward/cleanup commit.",
        };
      }

      const scopedPaths = scopedByScript(
        world.economy.paths,
        sourceLocators,
      );
      const bad = scopedPaths.filter(
        (item) =>
          item.rewardCleanupOrdering ===
            "contradicted-before-journal" ||
          (
            item.trigger === "pickup" &&
            (item.scoreCredits > 0 || item.scoreWrites > 0) &&
            item.itemConsumes === 0
          ) ||
          (
            (item.inventoryGrants > 0 ||
              item.worldDrops > 0 ||
              item.lootCommands > 0 ||
              item.scoreCredits > 0 ||
              item.scoreWrites > 0) &&
            item.idempotencyGuards === 0
          ),
      );
      if (
        bad.length > 0 ||
        world.economy.policy.deathRewardOverlapContractConflicts > 0 ||
        world.economy.policy.pickupCurrencyContractMismatch > 0
      ) {
        return {
          status: "CONTRADICTED",
          reason:
            "Scoped reward path or authored economy contract contains duplicate/non-idempotent/unconsumed reward behavior.",
        };
      }
      const contamination = aggregateCannotBeScoped(
        world.economy.pickupCurrencyWithoutConsumeCandidates > 0 ||
        world.economy.rewardPathsWithoutIdempotency > 0 ||
        world.economy.cleanupRewardJournalOrderingUnresolved > 0,
        sourceLocators,
        scopedPaths.length,
        "Economy/reward",
      );
      if (contamination) return contamination;
      if (
        scopedPaths.some(
          (item) =>
            item.rewardCleanupOrdering ===
              "unresolved",
        ) ||
        world.economy.unresolvedEngineLootTables > 0 ||
        world.economy.deathRewardSourceOverlapUnresolved > 0
      ) {
        return {
          status: "DETECTION_GAP",
          reason:
            "Economy/reward evidence remains unresolved, including reward-to-cleanup journal ordering where source ordering cannot yet be proven.",
        };
      }
      return {
        status: "PROVEN",
        reason:
          "Economy/reward has no scoped contradiction for the mapped gameplay dependency.",
      };
    }
    default:
      return {
        status: "DETECTION_GAP",
        reason: "No runtime-domain resolver is available for this gameplay dependency.",
      };
  }
}

/**
 * Lift observed execution entry candidates into the EXISTING scenario graph.
 * Only exact IR IDs can join across regions. Record all material operations
 * without synthesizing mechanic names or claiming a player-visible journey.
 */
function sourceFlowCandidates(ir: SemanticIr): readonly GameplaySourceFlowCandidate[] {
  const execution = semanticIrExecutionTraces(ir);
  const regions = new Map(ir.execution.regions.map(region => [region.id, region]));
  const stepsByRegion = new Map<string, GameplaySourceFlowCandidate["sourceSteps"][number][]>();
  const append = (regionId: string, step: GameplaySourceFlowCandidate["sourceSteps"][number]) => {
    const list = stepsByRegion.get(regionId) ?? [];
    list.push(step);
    stepsByRegion.set(regionId, list);
  };
  for (const op of ir.state.operations) {
    append(op.executionRegionId, {
      id: op.id, kind: "state", executionRegionId: op.executionRegionId,
      source: op.source, operation: op.operation,
    });
  }
  for (const action of ir.state.resourceActions ?? []) {
    append(action.executionRegionId, {
      id: action.id, kind: "resource-action",
      executionRegionId: action.executionRegionId, source: action.source,
      operation: action.action, targetLabel: action.surface + ":" + action.key,
    });
  }
  for (const outcome of ir.execution.outcomes ?? []) {
    append(outcome.executionRegionId, {
      id: outcome.id, kind: "return",
      executionRegionId: outcome.executionRegionId, source: outcome.source,
      targetLabel: outcome.propertyName + "=" + outcome.value,
    });
  }
  for (const effect of ir.execution.worldEffects ?? []) {
    append(effect.executionRegionId, {
      id: effect.id, kind: "world-effect",
      executionRegionId: effect.executionRegionId, source: effect.source,
      targetLabel: effect.kind + ":" + effect.targetLabel,
      ...(effect.authoredTimingSeconds === undefined ? {} :
        { authoredTimingSeconds: effect.authoredTimingSeconds }),
    });
  }
  // Sort only within an execution region: cross-region source order cannot
  // establish callback timing, world mutation success or terminal sequence.
  const ordered = (ids: readonly string[]) =>
    ids.flatMap(regionId =>
      [...(stepsByRegion.get(regionId) ?? [])].sort((a,b) =>
        a.source.relativePath.localeCompare(b.source.relativePath) ||
        (a.source.range?.lineStart ?? 0) - (b.source.range?.lineStart ?? 0) ||
        (a.source.range?.columnStart ?? 0) - (b.source.range?.columnStart ?? 0) ||
        (a.authoredTimingSeconds ?? 0) - (b.authoredTimingSeconds ?? 0) ||
        (a.source.jsonPointer ?? "").localeCompare(b.source.jsonPointer ?? "") ||
        a.id.localeCompare(b.id)));
  const relations = ir.execution.authoredBehaviorRelations ?? [];
  const build = (input: {
    readonly entryRegionId: string;
    readonly entryKind: GameplaySourceFlowCandidate["entryKind"];
    readonly regionIds: readonly string[];
    readonly executionEdgeIds: readonly string[];
    readonly unresolvedExecutionEdgeIds: readonly string[];
    readonly temporalRelationIds: readonly string[];
    readonly branchPoints: readonly ObservedBranchPoint[];
  }): GameplaySourceFlowCandidate => {
    const steps = ordered(input.regionIds);
    const ids = new Set(steps.map(step => step.id));
    return {
      id: "source-flow:" + encodeURIComponent(input.entryRegionId),
      ...input,
      sourceSteps: steps,
      authoredBehaviorRelationIds: relations
        .filter(relation => relation.worldEffectIds?.some(id => ids.has(id)))
        .map(relation => relation.id).sort(),
      sourceOrderScope: "PER_EXECUTION_REGION_ONLY",
      runtimeStatus: "NOT_OBSERVED",
    };
  };
  const flows: GameplaySourceFlowCandidate[] = execution.traces.map(trace =>
    build({
      entryRegionId: trace.entryRegionId, entryKind: trace.entryKind,
      regionIds: trace.regionIds,
      executionEdgeIds: trace.executionEdgeIds,
      unresolvedExecutionEdgeIds: trace.unresolvedExecutionEdgeIds,
      temporalRelationIds: trace.temporalRelationIds,
      branchPoints: trace.branchPoints,
    }));
  for (const id of execution.regionsOutsideTraces) {
    const region = regions.get(id);
    if (!region || !(stepsByRegion.get(id)?.length)) continue;
    flows.push(build({
      entryRegionId: id, entryKind: region.kind, regionIds: [id],
      executionEdgeIds: [], unresolvedExecutionEdgeIds: [],
      temporalRelationIds: [], branchPoints: [],
    }));
  }
  // Empty source modules are not material gameplay flow evidence.
  return flows.filter(flow => flow.sourceSteps.length > 0 ||
    flow.executionEdgeIds.length > 0 ||
    flow.unresolvedExecutionEdgeIds.length > 0 ||
    flow.branchPoints.length > 0)
    .sort((a,b) => a.id.localeCompare(b.id));
}

/**
 * Strict provenance binding: only exact IR / classified Intent evidence IDs.
 * Source co-location, method names, and scenario neighborhood never prove a
 * mechanic owns a state mutation or an animation-command effect.
 */
function reconstructClassifiedMechanics(
  intent: GameplayIntentModel,
  flows: readonly GameplaySourceFlowCandidate[],
): readonly GameplayMechanicReconstruction[] {
  const featureKinds = new Set(["mechanic", "objective", "phase", "lifecycle", "outcome"]);
  const scopedEvidence = new Set(intent.evidence.filter(evidence =>
    evidence.scope === "selected-artifact").map(evidence => evidence.id));
  return intent.nodes.filter(node =>
    featureKinds.has(node.kind) && node.status !== "hypothesis" &&
    node.evidenceIds.some(id => scopedEvidence.has(id)))
    .map(node => {
      const evidenceIds = new Set(node.evidenceIds.filter(id =>
        scopedEvidence.has(id)));
      const relations = intent.edges.filter(edge =>
        edge.status !== "hypothesis" &&
        (edge.from === node.id || edge.to === node.id) &&
        edge.evidenceIds.some(id => scopedEvidence.has(id)))
        .map(edge => ({
          id: edge.id, from: edge.from, to: edge.to,
          kind: edge.kind,
          evidenceIds: edge.evidenceIds.filter(id => scopedEvidence.has(id)).sort(),
          status: edge.status === "authored"
            ? "AUTHORED_RELATION" as const : "INFERRED_RELATION" as const,
        })).sort((a,b) => a.id.localeCompare(b.id));
      const witnessed = flows.filter(flow =>
        flow.sourceSteps.some(step => evidenceIds.has(step.id)) ||
        flow.executionEdgeIds.some(id => evidenceIds.has(id)) ||
        flow.authoredBehaviorRelationIds.some(id => evidenceIds.has(id)) ||
        (flow.regionIds.some(id => evidenceIds.has(id)) &&
          node.evidenceIds.includes(flow.entryRegionId)));
      const exactSourceFlowIds = [...new Set(witnessed.map(flow => flow.id))].sort();
      const exactSourceStepIds = [...new Set(witnessed.flatMap(flow =>
        flow.sourceSteps.filter(step => evidenceIds.has(step.id))
          .map(step => step.id)))].sort();
      const authoredBehaviorRelationIds = [...new Set(witnessed.flatMap(flow =>
        flow.authoredBehaviorRelationIds.filter(id => evidenceIds.has(id))))].sort();
      const unresolvedDimensions: GameplayMechanicReconstruction["unresolvedDimensions"][number][] = [];
      if (exactSourceFlowIds.length === 0) unresolvedDimensions.push("NO_EXACT_IR_LINK");
      if (!relations.some(edge => ["requires","valid-during","scoped-to"].includes(edge.kind)))
        unresolvedDimensions.push("NO_ACTIVATION_RELATION");
      if (!relations.some(edge => ["transitions-to","produces","consumes",
          "resets","persists","recovers-to"].includes(edge.kind)))
        unresolvedDimensions.push("NO_STATE_OR_EFFECT_RELATION");
      if (!relations.some(edge => ["wins-by","loses-by","produces"].includes(edge.kind) &&
          intent.nodes.some(target => target.id === edge.to &&
          (target.kind === "outcome" || target.kind === "objective"))))
        unresolvedDimensions.push("NO_OUTCOME_RELATION");
      return {
        featureId: node.id,
        kind: node.kind as GameplayMechanicReconstruction["kind"],
        name: node.label,
        meaningStatus: node.status === "authored"
          ? "AUTHORED" as const : "INFERRED" as const,
        declaredEvidenceIds: [...evidenceIds].sort(),
        exactSourceFlowIds,
        exactSourceStepIds,
        authoredBehaviorRelationIds,
        relations,
        unresolvedDimensions,
        runtimeStatus: "NOT_OBSERVED" as const,
      };
    }).sort((a,b) => a.featureId.localeCompare(b.featureId));
}

/**
 * Renders one bounded route PER distinct directed authored/inferred graph path.
 * It does not assert that these relations are chronologically executable.
 * No genre-based start, inferred terminal, or synthetic objective is added.
 */
function reconstructAuthoredJourneyCandidates(
  intent: GameplayIntentModel,
  reconstructions: readonly GameplayMechanicReconstruction[],
  maxPaths = 128,
  maxDepth = 12,
): { candidates: readonly GameplayJourneyCandidate[]; truncated: boolean } {
  const ids = new Set(reconstructions.map(item => item.featureId));
  const sourceIds = new Set(intent.evidence.filter(evidence =>
    evidence.scope === "selected-artifact").map(evidence => evidence.id));
  const map = new Map(reconstructions.map(item => [item.featureId, item]));
  const traversable = new Set(["transitions-to", "recovers-to",
    "produces", "wins-by", "loses-by"]);
  const links = intent.edges.filter(edge =>
    traversable.has(edge.kind) &&
    edge.status !== "hypothesis" &&
    ids.has(edge.from) && ids.has(edge.to) &&
    edge.evidenceIds.some(id => sourceIds.has(id)))
    .sort((a,b) => a.id.localeCompare(b.id));
  const outgoing = new Map<string, typeof links>();
  const incoming = new Set<string>();
  for (const edge of links) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
    incoming.add(edge.to);
  }
  const roots = [...outgoing.keys()].filter(id => !incoming.has(id)).sort();
  // A cycle can lack entry nodes; surface it as a bounded cycle candidate.
  if (roots.length === 0 && links.length > 0) roots.push(...[...outgoing.keys()].sort());
  type Walk = { ids: string[]; edges: typeof links; boundary?: GameplayJourneyCandidate["boundary"] };
  const pending: Walk[] = roots.map(id => ({ ids: [id], edges: [] }));
  const candidates: GameplayJourneyCandidate[] = [];
  let cursor = 0;
  while (cursor < pending.length && candidates.length < maxPaths) {
    const walk = pending[cursor++]!;
    const last = walk.ids[walk.ids.length - 1]!;
    const target = map.get(last);
    const next = outgoing.get(last) ?? [];
    const terminal = target?.kind === "outcome";
    if (terminal || next.length === 0 || walk.ids.length >= maxDepth) {
      if (walk.edges.length === 0) continue;
      const evidenceIds = [...new Set(walk.edges.flatMap(edge =>
        edge.evidenceIds.filter(id => sourceIds.has(id))))].sort();
      const sourceFlowIds = [...new Set(walk.ids.flatMap(id =>
        map.get(id)?.exactSourceFlowIds ?? []))].sort();
      candidates.push({
        id: "authored-journey:" + walk.edges.map(edge =>
          encodeURIComponent(edge.id)).join(":"),
        subjectIds: walk.ids,
        relationIds: walk.edges.map(edge => edge.id),
        evidenceIds,
        exactSourceFlowIds: sourceFlowIds,
        meaningStatus: walk.edges.every(edge => edge.status === "authored")
          ? "SOURCE_AUTHORED" : "SOURCE_INFERRED",
        boundary: terminal ? "OUTCOME_SUBJECT" :
          next.length === 0 ? "SOURCE_SINK" : "DEPTH_LIMIT",
        runtimeStatus: "NOT_OBSERVED",
      });
      continue;
    }
    for (const edge of next) {
      if (walk.ids.includes(edge.to)) {
        candidates.push({
          id: "authored-journey:" + [...walk.edges,edge].map(e =>
            encodeURIComponent(e.id)).join(":"),
          subjectIds: [...walk.ids, edge.to],
          relationIds: [...walk.edges,edge].map(e => e.id),
          evidenceIds: [...new Set([...walk.edges,edge].flatMap(e =>
            e.evidenceIds.filter(id => sourceIds.has(id)))].sort(),
          exactSourceFlowIds: [...new Set([...walk.ids,edge.to].flatMap(id =>
            map.get(id)?.exactSourceFlowIds ?? []))].sort(),
          meaningStatus: [...walk.edges,edge].every(e => e.status === "authored")
            ? "SOURCE_AUTHORED" : "SOURCE_INFERRED",
          boundary: "CYCLE", runtimeStatus: "NOT_OBSERVED",
        });
      } else {
        pending.push({ ids: [...walk.ids, edge.to], edges: [...walk.edges,edge] });
      }
      if (pending.length > 2048 || candidates.length >= maxPaths) break;
    }
    if (pending.length > 2048) break;
  }
  return {
    candidates: candidates.slice(0,maxPaths).sort((a,b) => a.id.localeCompare(b.id)),
    truncated: cursor < pending.length || pending.length > 2048 ||
      candidates.length > maxPaths,
  };
}

export function compileGameplayScenarioGraph(
  input: {
    readonly intent: GameplayIntentModel;
    readonly world: GameplayWorldModel;
    readonly preset: GameplayAuditScenarioPreset;
    /** Same selected-artifact IR already used by Gameplay Intent. */
    readonly semanticIr?: SemanticIr;
    /** Preserve source facts across world-only scenario refreshes. */
    readonly existingSourceFlowCandidates?: readonly GameplaySourceFlowCandidate[];
  },
): GameplayScenarioGraph {
  const observedSourceFlows = input.semanticIr
    ? sourceFlowCandidates(input.semanticIr)
    : input.existingSourceFlowCandidates ?? [];
  const mechanicReconstructions = reconstructClassifiedMechanics(
    input.intent, observedSourceFlows);
  const journey = reconstructAuthoredJourneyCandidates(
    input.intent, mechanicReconstructions);
  const sourceEvidenceIds = new Set(input.intent.evidence
    .filter(record => record.scope === "selected-artifact")
    .map(record => record.id));
  const playerCounts = presetPlayerCounts(input.preset);
  // A classified name-only declaration is not an observed gameplay flow.
  // Do not promote hypothetical source structure into a player-facing
  // scenario until other selected-artifact evidence grounds that subject.
  const scenarioNodes = input.intent.nodes.filter(
    (node) => SCENARIO_NODE_KINDS.has(node.kind) &&
      node.status !== "hypothesis",
  );
  const runtime = runtimeComponents(input.world);
  const runtimeIds = new Set(
    runtime.map((component) => component.id),
  );

  function presetComponentIds(
    kind: GameplayAuditScenarioPreset["scenarios"][number]["kind"],
  ): readonly string[] {
    const selected = new Set<string>();
    const addRuntime = (...ids: string[]) => {
      for (const id of ids) {
        if (runtimeIds.has(id)) selected.add(id);
      }
    };
    const addIntentKinds = (...kinds: GameplayIntentNode["kind"][]) => {
      for (const node of input.intent.nodes) {
        if (kinds.includes(node.kind) && node.status !== "hypothesis") {
          selected.add(node.id);
        }
      }
    };

    switch (kind) {
      case "map-type-coverage":
        addIntentKinds(
          "mechanic",
          "objective",
          "phase",
          "lifecycle",
          "state",
          "resource",
          "policy",
          "outcome",
        );
        break;
      case "full-journey":
        // Composition only: concrete child scenarios own runtime knowledge.
        addIntentKinds(
          "phase",
          "mechanic",
          "objective",
          "lifecycle",
          "outcome",
        );
        break;
      case "solo":
      case "two-player":
      case "max-party":
      case "party-capacity-plus-one":
      case "disconnect-reconnect":
        addIntentKinds("lifecycle", "state", "policy", "outcome");
        addRuntime(
          "runtime:arena",
          "runtime:combat",
          "runtime:inventory",
          "runtime:persistence",
        );
        break;
      case "multi-arena-parallel":
      case "arena-capacity-plus-one":
        addIntentKinds("policy", "lifecycle", "state");
        addRuntime("runtime:arena", "runtime:chunks");
        break;
      case "arena-replica-integrity":
        addIntentKinds("policy", "lifecycle", "state", "spatial-region");
        addRuntime("runtime:arena-replica-integrity", "runtime:structures");
        break;
      case "reload-recovery":
        addIntentKinds("lifecycle", "state", "phase");
        addRuntime(
          "runtime:persistence",
          "runtime:arena",
          "runtime:inventory",
          "runtime:combat",
          "runtime:entities",
        );
        break;
      case "deferred-ownership":
        addIntentKinds("lifecycle", "state", "phase", "outcome");
        addRuntime(
          "runtime:arena",
          "runtime:persistence",
          "runtime:chunks",
        );
        break;
      case "terminal-collision":
        addIntentKinds("outcome", "lifecycle", "state", "phase");
        addRuntime(
          "runtime:combat",
          "runtime:arena",
          "runtime:economy",
        );
        break;
      case "transaction-atomicity":
        addIntentKinds("resource", "mechanic", "state", "outcome");
        addRuntime(
          "runtime:economy",
          "runtime:inventory",
          "runtime:persistence",
        );
        break;
      case "simulation-distance":
        addIntentKinds("mechanic", "objective", "spatial-region", "lifecycle");
        addRuntime(
          "runtime:chunks",
          "runtime:entities",
          "runtime:arena",
        );
        break;
      case "progression-wave-integrity":
        addIntentKinds(
          "objective",
          "mechanic",
          "phase",
          "state",
          "actor",
          "outcome",
        );
        addRuntime(
          "runtime:entities",
          "runtime:chunks",
          "runtime:combat",
          "runtime:arena",
        );
        break;
      case "information-correctness":
        addIntentKinds("objective", "resource", "state", "outcome", "policy");
        addRuntime(
          "runtime:economy",
          "runtime:arena",
          "runtime:persistence",
        );
        break;
      case "player-capability-integrity":
        addIntentKinds("policy", "role", "state", "lifecycle");
        addRuntime(
          "runtime:player-capability",
          "runtime:arena",
          "runtime:inventory",
        );
        break;
      case "world-rule-authority":
        addIntentKinds("policy", "state", "lifecycle");
        addRuntime(
          "runtime:world-rules",
          "runtime:entities",
        );
        break;
      case "client-server-reconciliation":
        addIntentKinds("policy", "state", "spatial-region");
        addRuntime(
          "runtime:client-reconciliation",
          "runtime:spatial",
          "runtime:inventory",
        );
        break;
      case "spatial-containment":
        addIntentKinds("spatial-region", "policy", "state");
        addRuntime(
          "runtime:spatial",
          "runtime:arena",
          "runtime:structures",
        );
        break;
      case "repeated-run":
        addIntentKinds("lifecycle", "phase", "state", "outcome");
        addRuntime(
          "runtime:arena",
          "runtime:arena-cleanup",
          "runtime:structures",
          "runtime:entities",
          "runtime:inventory",
          "runtime:economy",
        );
        break;
    }

    return [...selected].sort();
  }

  const scenarioKnowledgeDomains = new Map<string, readonly import("./gameplay-scenario-model.js").GameplayKnowledgeDomain[]>();

  const scenarios: GameplayScenario[] = scenarioNodes.map((node) => {
    const scenarioId = "scenario:" + node.id;
    const requiredDomains =
      requiredKnowledgeDomainsForIntentScenario(
        node,
        input.intent,
        input.world,
      );
    scenarioKnowledgeDomains.set(
      scenarioId,
      requiredDomains,
    );
    const componentIds =
      gameplayScenarioNeighborhoodNodeIds(
        input.intent,
        node.id,
      );
    const causalLinkIds = input.intent.edges
      .filter(
        (edge) =>
          componentIds.includes(edge.from) &&
          componentIds.includes(edge.to),
      )
      .map((edge) => "edge:scenario:" + node.id + ":" + edge.id);

    return {
      id: scenarioId,
      label: node.label,
      gameplayStage: stageForNode(node),
      purpose: purposeForNode(node),
      sourceSubjectIds: [node.id],
      componentIds,
      causalLinkIds,
      playerCounts,
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    };
  });

  for (const presetScenario of input.preset.scenarios) {
    const scenarioId =
      "preset:" + presetScenario.id;
    const requiredDomains =
      presetScenario.requiredKnowledgeDomains?.length
        ? [...presetScenario.requiredKnowledgeDomains]
        : requiredKnowledgeDomainsForPreset(
            presetScenario.kind,
            input.world,
          );
    scenarioKnowledgeDomains.set(
      scenarioId,
      requiredDomains,
    );
    const componentIds = presetComponentIds(
      presetScenario.kind,
    );
    const sourceSubjectIds =
      presetAnchorIds(
        presetScenario.kind,
        input.intent,
      );
    scenarios.push({
      id: scenarioId,
      label: presetScenario.kind,
      gameplayStage: presetScenario.flowStage,
      purpose: presetScenario.reason,
      sourceSubjectIds,
      componentIds,
      causalLinkIds: [],
      playerCounts:
        presetScenario.playerCount === undefined
          ? playerCounts
          : [presetScenario.playerCount],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    });
  }

  const concreteScenarioIds = scenarios
    .filter((scenario) => scenario.label !== "full-journey")
    .map((scenario) => scenario.id)
    .sort();

  const scenariosWithComposition = scenarios.map(
    (scenario) =>
      scenario.label === "full-journey"
        ? {
            ...scenario,
            causalLinkIds: [],
            composedScenarioIds:
              concreteScenarioIds,
          }
        : scenario,
  );

  const knowledgeRequirements = scenariosWithComposition.flatMap(
    (scenario) =>
      buildGameplayKnowledgeRequirements(
        scenario.id,
        scenario.label === "full-journey"
          ? []
          : scenarioKnowledgeDomains.get(scenario.id) ?? [],
        {
          subjectIds: scenario.sourceSubjectIds,
          componentIds: scenario.componentIds,
        },
      ),
  );
  const requirementsByScenario = new Map<
    string,
    readonly string[]
  >();
  for (const scenario of scenariosWithComposition) {
    requirementsByScenario.set(
      scenario.id,
      knowledgeRequirements
        .filter((item) => item.scenarioId === scenario.id)
        .map((item) => item.id),
    );
  }
  const scenariosWithKnowledge = scenariosWithComposition.map(
    (scenario) => ({
      ...scenario,
      requiredKnowledgeIds:
        requirementsByScenario.get(scenario.id) ?? [],
    }),
  );

  const scenarioIdsBySubject = new Map<string, Set<string>>();
  for (const scenario of scenariosWithKnowledge) {
    for (const subjectId of scenario.componentIds) {
      const set = scenarioIdsBySubject.get(subjectId) ?? new Set<string>();
      set.add(scenario.id);
      scenarioIdsBySubject.set(subjectId, set);
    }
  }

  // Declaration-only hypotheses belong to Intent's unconfirmed candidate
  // inventory, not gameplay component ownership or orphan/closure accounting.
  const components: GameplayScenarioComponent[] = input.intent.nodes
    .filter(node => node.status !== "hypothesis")
    .map((node) => {
    const usedBy = [...(scenarioIdsBySubject.get(node.id) ?? [])].sort();
    return {
      id: node.id,
      label: node.label,
      kind: node.kind,
      technicalRole: technicalRoleForNode(node),
      gameplayPurpose: purposeForNode(node),
      evidenceIds: [...node.evidenceIds],
      usedByScenarioIds: usedBy,
      orphan: usedBy.length === 0 && node.kind !== "game",
    };
  });

  const runtimeDomainKnowledge: Readonly<Record<
    string,
    import("./gameplay-scenario-model.js").GameplayKnowledgeDomain
  >> = {
    "runtime:arena": "arena-lifecycle",
    "runtime:arena-cleanup": "arena-lifecycle",
    "runtime:arena-replica-integrity": "world-structure",
    "runtime:chunks": "chunk-simulation",
    "runtime:entities": "entity-behavior",
    "runtime:combat": "combat-lifecycle",
    "runtime:inventory": "inventory-state",
    "runtime:persistence": "persistence-recovery",
    "runtime:structures": "world-structure",
    "runtime:economy": "economy-reward",
    "runtime:world-rules": "platform-constraints",
    "runtime:player-capability": "platform-constraints",
    "runtime:client-reconciliation": "platform-constraints",
    "runtime:spatial": "spatial-authority",
  };

  for (const component of runtime) {
    const requiredDomain =
      runtimeDomainKnowledge[component.id];
    const usedBy = requiredDomain === undefined
      ? []
      : scenariosWithKnowledge
          .filter((scenario) => {
            const domains =
              scenarioKnowledgeDomains.get(
                scenario.id,
              ) ?? [];
            return domains.includes(requiredDomain);
          })
          .map((scenario) => scenario.id);
    components.push({
      ...component,
      usedByScenarioIds: usedBy,
      orphan: usedBy.length === 0,
    });
  }

  const componentIds = new Set(components.map((component) => component.id));
  const causalLinks: GameplayCausalLink[] = [];
  for (const scenario of scenariosWithKnowledge) {
    if (scenario.label === "full-journey") continue;
    const allowed = new Set(scenario.componentIds);
    for (const edge of input.intent.edges) {
      if (!allowed.has(edge.from) || !allowed.has(edge.to)) continue;
      if (!componentIds.has(edge.from) || !componentIds.has(edge.to)) continue;
      const impactPath = impactPathFrom(edge.to, allowed, input.intent);
      const causalStatus = edgeStatus(edge, sourceEvidenceIds);
      causalLinks.push({
        id: "edge:" + scenario.id + ":" + edge.id,
        scenarioId: scenario.id,
        fromComponentId: edge.from,
        toComponentId: edge.to,
        purpose:
          edge.description?.trim() ||
          "Prove that " + edge.from + " " + edge.kind + " " + edge.to + " in this gameplay scenario.",
        evidenceIds: [...edge.evidenceIds],
        subjectIds: [
          ...new Set([
            ...scenario.sourceSubjectIds,
            edge.from,
            edge.to,
          ]),
        ].sort(),
        componentIds: [
          ...new Set([
            edge.from,
            edge.to,
          ]),
        ].sort(),
        knowledgeRequirementIds: [],
        impactPathComponentIds: impactPath,
        impactPathEvidenceIds: impactPathEvidenceIds(impactPath, input.intent),
        dimensionEvidence: {},
        intentEdgeKind: edge.kind,
        status: causalStatus,
        reason:
          causalStatus === "PROVEN"
            ? "Selected-artifact evidence connects both gameplay components."
            : "This causal link is not grounded strongly enough to close the scenario.",
      });
    }
  }

  const knowledgeReceipts =
    buildGameplayKnowledgeReceipts(
      knowledgeRequirements,
      input.world,
    );

  const scenarioById = new Map(
    scenariosWithKnowledge.map((scenario) => [
      scenario.id,
      scenario,
    ]),
  );
  for (const component of components.filter((item) => item.kind === "runtime-domain")) {
    for (const scenarioId of component.usedByScenarioIds) {
      const scenario = scenarioById.get(scenarioId);
      if (!scenario) continue;
      const anchorId =
        scenario.sourceSubjectIds.find(
          (id) => componentIds.has(id),
        );
      if (!anchorId || !componentIds.has(anchorId)) continue;
      const knowledgeDomain =
        runtimeDomainKnowledge[component.id];
      const requirement =
        knowledgeDomain === undefined
          ? undefined
          : knowledgeRequirements.find(
              (item) =>
                item.scenarioId === scenarioId &&
                item.domain === knowledgeDomain,
            );
      const relevantRequirements =
        knowledgeRequirements.filter(
          (item) =>
            item.scenarioId === scenarioId &&
            (
              item.id === requirement?.id ||
              item.componentIds.includes(component.id) ||
              item.componentIds.includes(anchorId)
            ),
        );
      const receipt =
        requirement === undefined
          ? undefined
          : knowledgeReceipts.find(
              (item) =>
                item.requirementId === requirement.id,
            );
      const sourceEvidenceIds = new Set(
        [
          ...(requirement?.subjectIds ?? []),
          ...(requirement?.componentIds ?? []),
        ].flatMap((id) => {
          const node = input.intent.nodes.find(
            (item) => item.id === id,
          );
          return node?.evidenceIds ?? [];
        }),
      );
      const sourceLocators = input.intent.evidence
        .filter(
          (item) =>
            sourceEvidenceIds.has(item.id) &&
            item.scope === "selected-artifact",
        )
        .map((item) => item.locator)
        .filter(Boolean);

      causalLinks.push({
        id: "edge:" + scenarioId + ":" + component.id,
        scenarioId,
        fromComponentId: component.id,
        toComponentId: anchorId,
        purpose: component.gameplayPurpose,
        evidenceIds:
          receipt?.evidenceIds.length
            ? [...receipt.evidenceIds]
            : [...component.evidenceIds],
        subjectIds:
          requirement === undefined
            ? [...scenario.sourceSubjectIds]
            : [...requirement.subjectIds],
        componentIds:
          requirement === undefined
            ? [component.id, anchorId].sort()
            : [
                ...new Set([
                  ...requirement.componentIds,
                  component.id,
                  anchorId,
                ]),
              ].sort(),
        knowledgeRequirementIds:
          expandGameplayKnowledgeRequirementIds(
            relevantRequirements.map((item) => item.id),
            knowledgeRequirements,
          ),
        impactPathComponentIds: impactPathFrom(
          anchorId,
          new Set(scenario.componentIds),
          input.intent,
        ),
        impactPathEvidenceIds: impactPathEvidenceIds(
          impactPathFrom(
            anchorId,
            new Set(scenario.componentIds),
            input.intent,
          ),
          input.intent,
        ),
        dimensionEvidence:
          dimensionEvidenceForRuntimeComponent(
            component.id,
            input.world,
          ),
        ...runtimeEdgeState(
          component.id,
          input.world,
          sourceLocators,
          scenario.label,
        ),
      });
    }
  }

  const scenariosWithCausalLinks =
    scenariosWithKnowledge.map((scenario) => ({
      ...scenario,
      causalLinkIds: causalLinks
        .filter(
          (link) =>
            link.scenarioId === scenario.id,
        )
        .map((link) => link.id)
        .sort(),
    }));

  return {
    schemaVersion: 1,
    policy: "scenario-driven-causal-audit",
    scenarios: scenariosWithCausalLinks,
    components,
    causalLinks,
    knowledgeRequirements,
    knowledgeReceipts,
    requiredInspectionGraph: {
      policy: "required-inspection-graph",
      nodes: knowledgeRequirements,
      receipts: knowledgeReceipts,
    },
    sourceFlowCandidates: observedSourceFlows,
    mechanicReconstructions,
    gameplayJourneyCandidates: journey.candidates,
    gameplayJourneyTruncated: journey.truncated,
  };
}
