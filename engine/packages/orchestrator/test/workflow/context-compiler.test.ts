import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SemanticGraph,
} from "../../../graph/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import {
  compileContextPack,
} from "../../src/workflow/context-compiler.js";

function fixtureGraph() {
  const graph =
    new SemanticGraph();
  for (const id of [
    "arena",
    "shop",
    "unrelated",
  ]) {
    graph.addNode({
      id: "function:pack:" + id,
      identity: {
        kind: "function",
        scope: "pack",
        identifier: id,
      },
      kind: "function",
      identifier: id,
      source: {
        artifactId: "map",
        relativePath:
          "functions/" +
          id +
          ".mcfunction",
      },
    });
  }
  graph.addEdge({
    from: "function:pack:arena",
    type: "CALLS",
    targetIdentifier: "shop",
    status: "resolved",
    to: "function:pack:shop",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/arena.mcfunction",
      },
    },
  });
  return graph;
}

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "intent:map",
  evidence: [{
    id: "e:arena",
    origin: "source-code",
    locator:
      "functions/arena.mcfunction",
    summary: "arena state",
  }, {
    id: "e:shop",
    origin: "source-code",
    locator:
      "functions/shop.mcfunction",
    summary: "shop state",
  }],
  nodes: [{
    id: "intent:arena",
    kind: "mechanic",
    label: "Arena",
    status: "authored",
    evidenceIds: ["e:arena"],
  }, {
    id: "intent:shop",
    kind: "mechanic",
    label: "Shop",
    status: "authored",
    evidenceIds: ["e:shop"],
  }],
  edges: [],
  invariants: [{
    id: "inv:arena",
    statement:
      "Player belongs to one arena",
    strength: "must",
    status: "authored",
    subjectIds: ["intent:arena"],
    evidenceIds: ["e:arena"],
  }],
  unknowns: [{
    id: "unknown:arena",
    question: "Arena cleanup?",
    blockedSubjectIds: [
      "intent:arena",
    ],
    evidenceIds: ["e:arena"],
  }],
};

describe("context compiler", () => {
  it("restricts semantic context to affected nodes and explicit intent subjects", () => {
    const pack =
      compileContextPack({
        goal: "diagnose arena",
        graph: fixtureGraph(),
        intent,
        affected: {
          status: "planned",
          changedNodeIds: [
            "function:pack:arena",
          ],
          affectedNodeIds: [
            "function:pack:arena",
          ],
          skippedNodeIds: [
            "function:pack:shop",
            "function:pack:unrelated",
          ],
          affectedPaths: [
            "functions/arena.mcfunction",
          ],
          knownPaths: [
            "functions/arena.mcfunction",
            "functions/shop.mcfunction",
            "functions/unrelated.mcfunction",
          ],
          totalNodeCount: 3,
          changedNodeCount: 1,
          affectedNodeCount: 1,
          skippedNodeCount: 2,
          skipRatio: 2 / 3,
          reasons: [],
        },
        relevantIntentSubjectIds: [
          "intent:arena",
        ],
      });

    expect(
      pack.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "function:pack:arena",
    ]);
    expect(
      pack.intent.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "intent:arena",
    ]);
    expect(
      pack.intent.evidence.map(
        (item) => item.id,
      ),
    ).toEqual(["e:arena"]);
    expect(pack.semantic.edges)
      .toHaveLength(1);
    expect(
      pack.semantic.edges[0]?.type,
    ).toBe("CALLS");
  });

  it("uses explicit invariant and evidence relationships to avoid unrelated intent nodes", () => {
    const byInvariant =
      compileContextPack({
        goal: "invariant-only",
        graph: fixtureGraph(),
        intent,
        relevantInvariantIds: [
          "inv:arena",
        ],
      });

    expect(
      byInvariant.intent.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "intent:arena",
    ]);

    const byEvidence =
      compileContextPack({
        goal: "evidence-only",
        graph: fixtureGraph(),
        intent,
        relevantEvidenceIds: [
          "e:shop",
        ],
      });

    expect(
      byEvidence.intent.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "intent:shop",
    ]);
  });

  it("does not widen to every intent node when explicit evidence has no subject binding", () => {
    const pack =
      compileContextPack({
        goal: "evidence-no-subject",
        graph: fixtureGraph(),
        intent: {
          ...intent,
          evidence: [
            ...intent.evidence,
            {
              id: "e:global",
              origin: "source-code",
              locator:
                "global/source",
              summary:
                "global evidence",
            },
          ],
        },
        relevantEvidenceIds: [
          "e:global",
        ],
      });

    expect(pack.intent.nodes)
      .toEqual([]);
    expect(
      pack.intent.evidence.map(
        (item) => item.id,
      ),
    ).toEqual(["e:global"]);
  });

  it("reports truncation instead of silently overloading context", () => {
    const pack =
      compileContextPack({
        goal: "bounded",
        graph: fixtureGraph(),
        intent,
        budget: {
          maxSemanticNodes: 1,
          maxSemanticEdges: 1,
          maxIntentNodes: 1,
        },
      });

    expect(
      pack.semantic.nodes,
    ).toHaveLength(1);
    expect(
      pack.truncation
        .semanticNodes,
    ).toBe(2);
    expect(
      pack.truncation.intentNodes,
    ).toBe(1);
    expect(pack.complete)
      .toBe(false);
  });

  it("allows optional truncation when explicit required scope is fully retained", () => {
    const pack =
      compileContextPack({
        goal: "scoped-bounded",
        graph: fixtureGraph(),
        intent,
        relevantSemanticNodeIds: [
          "function:pack:arena",
        ],
        relevantIntentSubjectIds: [
          "intent:arena",
        ],
        budget: {
          maxSemanticNodes: 1,
          maxSemanticEdges: 1,
          maxIntentNodes: 1,
        },
      });

    expect(pack.complete)
      .toBe(true);
    expect(
      pack.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toEqual([
      "function:pack:arena",
    ]);
    expect(
      pack.truncation.semanticNodes,
    ).toBeGreaterThan(0);
  });

  it("includes explicitly required semantic nodes even when they are outside the affected closure", () => {
    const pack =
      compileContextPack({
        goal: "explicit-outside-affected",
        graph: fixtureGraph(),
        intent,
        affected: {
          status: "planned",
          changedNodeIds: [
            "function:pack:arena",
          ],
          affectedNodeIds: [
            "function:pack:arena",
          ],
          skippedNodeIds: [
            "function:pack:shop",
            "function:pack:unrelated",
          ],
          affectedPaths: [
            "functions/arena.mcfunction",
          ],
          knownPaths: [
            "functions/arena.mcfunction",
            "functions/shop.mcfunction",
            "functions/unrelated.mcfunction",
          ],
          totalNodeCount: 3,
          changedNodeCount: 1,
          affectedNodeCount: 1,
          skippedNodeCount: 2,
          skipRatio: 2 / 3,
          reasons: [],
        },
        relevantSemanticNodeIds: [
          "function:pack:shop",
        ],
      });

    expect(
      pack.semantic.nodes.map(
        (node) => node.id,
      ),
    ).toContain(
      "function:pack:shop",
    );
  });

  it("rejects a budget smaller than explicitly required relationships", () => {
    expect(() =>
      compileContextPack({
        goal: "too-small-edge-budget",
        graph: fixtureGraph(),
        intent,
        relevantSemanticNodeIds: [
          "function:pack:arena",
        ],
        budget: {
          maxSemanticEdges: 1,
        },
      })
    ).not.toThrow();

    expect(() =>
      compileContextPack({
        goal: "too-small-node-budget",
        graph: fixtureGraph(),
        intent,
        relevantSemanticNodeIds: [
          "function:pack:arena",
          "function:pack:shop",
        ],
        budget: {
          maxSemanticNodes: 1,
        },
      })
    ).toThrow(
      /maxSemanticNodes/,
    );
  });

  it("marks the pack incomplete when a requested invariant points to a missing subject", () => {
    const pack =
      compileContextPack({
        goal:
          "dangling-invariant-subject",
        graph: fixtureGraph(),
        intent: {
          ...intent,
          invariants: [{
            id: "inv:dangling",
            statement:
              "Missing subject must hold",
            strength: "must",
            status: "authored",
            subjectIds: [
              "intent:missing-subject",
            ],
            evidenceIds: [
              "e:arena",
            ],
          }],
        },
        relevantInvariantIds: [
          "inv:dangling",
        ],
      });

    expect(pack.complete)
      .toBe(false);
    expect(
      pack.missingRequested
        .intentSubjectIds,
    ).toEqual([
      "intent:missing-subject",
    ]);
  });

  it("marks the pack incomplete when explicitly requested ids are missing", () => {
    const pack =
      compileContextPack({
        goal: "missing",
        graph: fixtureGraph(),
        intent,
        relevantIntentSubjectIds: [
          "intent:missing",
        ],
        relevantEvidenceIds: [
          "e:missing",
        ],
      });

    expect(pack.complete)
      .toBe(false);
    expect(
      pack.missingRequested
        .semanticNodeIds,
    ).toEqual([]);
    expect(
      pack.missingRequested
        .intentSubjectIds,
    ).toEqual([
      "intent:missing",
    ]);
    expect(
      pack.missingRequested
        .evidenceIds,
    ).toEqual([
      "e:missing",
    ]);
  });

  it("passes target applicability to the model-facing context for selected Knowledge", () => {
    const resourceId = "knowledge.persistence.dynamic-properties-survive-restart";
    const result = compileContextPack({
      goal: "examine persistent state",
      graph: fixtureGraph(),
      intent,
      resourceSelection: [{
        resource: {
          id: resourceId, class: "KNOWLEDGE", domain: "persistence",
          authority: "REFERENCE",
          path: "engine/knowledge/world-engine/persistence-bedrock.json",
          locator: "persistence.dynamic-properties-survive-restart",
          lifecycle: "ACTIVE",
        },
        score: { routing: 30, graph: 0, structural: 8, lexical: 30, semantic: 0, authority: 10, total: 78 },
        reasons: ["lexical-rank"],
      }],
      resourceKnowledge: {
        [resourceId]: {
          kind: "fact",
          subject: "dynamic properties",
          summary: "World dynamic properties survive restart.",
          classification: "engine-fact",
          applicability: { editions: ["education"] },
          applicabilityStatus: "NOT_EVALUATED",
          sourceIds: ["official"],
          sources: [{
            id: "official", title: "Official reference",
            url: "https://learn.microsoft.com/en-us/minecraft/creator/",
            authority: "official", confidence: "documented", retrievedDate: "2026-09-23",
          }],
        },
      },
      targetRuntimeProfile: {
        schemaVersion: 2,
        product: { family: "bedrock-engine", edition: "bedrock-retail", version: "1.21.30" },
        host: "client", scriptModules: {}, experiments: [],
        inventory: {
          scriptModules: "unknown", experiments: "unknown",
          worldSettings: "unknown", packs: "unknown",
        },
      },
    });
    expect(result.resources?.items[0]?.targetApplicability?.state)
      .toBe("does-not-apply");
  });

  it("rejects invalid context budgets", () => {
    expect(() =>
      compileContextPack({
        goal: "bad",
        graph: fixtureGraph(),
        intent,
        budget: {
          maxSemanticNodes: 0,
        },
      })
    ).toThrow(/positive integers/);
  });
  it("carries repository execution scope without widening semantic context", () => {
    const pack = compileContextPack({
      goal: "scoped-execution",
      graph: fixtureGraph(),
      intent,
      repositoryTaskPlan: {
        schemaVersion: 1,
        status: "planned",
        affected: {
          changedPaths: [
            "analyzers/scripts/src/inventory-lifecycle-evidence.ts",
          ],
          directCapabilityIds: [
            "source.scripts.inventory",
          ],
          affectedCapabilityIds: [
            "source.scripts.inventory",
            "domain.inventory",
            "domain.economy",
            "projection.world-model",
            "context.compile",
          ],
          unmatchedPaths: [],
        },
        execution: {
          status: "ready",
          selectedCapabilityIds: [
            "source.scripts.inventory",
            "domain.inventory",
            "domain.economy",
            "projection.world-model",
            "context.compile",
          ],
          skippedCapabilityIds: [],
          blockedCapabilityIds: [],
          reasons: [],
        },
        reasons: [],
      },
    });

    expect(pack.executionScope)
      .toEqual({
        status: "planned",
        affectedCapabilityIds: [
          "source.scripts.inventory",
          "domain.inventory",
          "domain.economy",
          "projection.world-model",
          "context.compile",
        ],
        selectedCapabilityIds: [
          "source.scripts.inventory",
          "domain.inventory",
          "domain.economy",
          "projection.world-model",
          "context.compile",
        ],
        unmatchedPaths: [],
      });
  });

  it("compresses domain attention into compact world signals", () => {
    const pack = compileContextPack({
      goal: "domain-risk",
      graph: fixtureGraph(),
      intent,
      worldModel: {
        subjects: [],
        arenas: {
          lifecycle: {
            terminalCandidates: 1,
            proven: 0,
            partial: 1,
            unresolved: 0,
          },
          cleanup: {
            acquiredSurfaces: 1,
            exactProven: 0,
            partial: 0,
            unresolved: 0,
            resourceLedger: {
              resources: 1,
              complete: 0,
              partial: 0,
              missing: 1,
              coverageRatio: 0,
            },
          },
          isolation: {
            isolated: 0,
            partitionProofRequired: 0,
            sharedGlobal: 0,
            unknown: 0,
          },
          globalState: {
            arenaScopedMutations: 0,
            pairedLeaseEvidence: 0,
            unleasedArenaMutations: 0,
            unauditedArenaMutations: 0,
          },
          stress: {
            status: "unavailable",
          },
        },
        spatial: {
          unresolvedScriptMutations: 0,
          rejectedScriptMutations: 0,
          authority: {
            configured: true,
            policyValid: true,
            resolved: 0,
            uncovered: 1,
            conflicts: 0,
            unknownRegions: 0,
          },
        },
        inventory: {
          partialResets: 1,
          copyMutationRisks: 1,
          unresolvedEquipmentSlotEvidence: 0,
          restoreOwnership: {
            multipleRestoreOwners: 0,
          },
          policy: {
            deniedDrops: 0,
            uncoveredDrops: 0,
            unknownDrops: 0,
          },
        },
        entities: {
          aiStack: {
            targetedStackIncomplete: 1,
          },
          navigationEnvironment: {
            incompatible: 0,
            stateDependent: 0,
            unresolved: 0,
          },
        },
        combat: {
          hurtOnlyTerminalRisk: 0,
          policy: {
            revivePolicyContradictions: 1,
            projectileCleanupPolicyGap: 0,
          },
          runtime: {
            scopedLifeGenerationMissing: 0,
            scopedArenaGenerationMissing: 0,
          },
        },
        chunks: {
          acquireWithoutRelease: 0,
          releaseUnreachable: 0,
          cleanupOrderUnproven: 1,
          dynamicLeaseKeys: 0,
          capacityUncheckedLeases: 0,
          readinessUnverifiedLeases: 1,
          shutdownOnlyCleanupRisk: 0,
          unguardedDeferredChunkWork: 0,
        },
        economy: {
          policy: {
            deathRewardOverlapPolicyConflicts: 0,
            deathRewardOverlapUnresolved: 1,
            pickupCurrencyConsumeCoverageGaps: 0,
            pickupCurrencyPolicyMismatch: 0,
            idempotencyCoverageGaps: 0,
            staleDropCleanupCoverageGaps: 0,
            inventoryFullPolicyGaps: 0,
            pickupScopeValidationUnproven: 0,
            terminalRewardResultCommitUnproven: 0,
          },
        },
        state: {
          broadWrites: 0,
        },
        intent: {
          unknowns: [],
        },
      } as any,
    });

    expect(pack.world?.domainSignals)
      .toEqual({
        arenaLifecycle: 2,
        spatialAuthority: 1,
        inventory: 2,
        entityAiNavigation: 1,
        combat: 1,
        chunks: 2,
        economy: 1,
      });
  });

  it("passes selected knowledge contents to the model-facing context and blocks incomplete hydration", () => {
    const selectedResource = {
      resource: {
        id: "knowledge.persistence.relation-worldload-gates-reconcile",
        class: "KNOWLEDGE" as const,
        domain: "persistence",
        authority: "REFERENCE" as const,
        path: "engine/knowledge/world-engine/persistence-bedrock.json",
        locator: "persistence.relation-worldload-gates-reconcile",
        lifecycle: "ACTIVE" as const,
      },
      score: {
        routing: 30, graph: 0, structural: 16,
        lexical: 25, semantic: 0, authority: 10, total: 81,
      },
      reasons: ["domain-route", "lexical-rank"],
    };
    const knowledge = {
      kind: "relation" as const,
      subject: "worldLoad",
      summary: "worldLoad gates durable-state-reconciliation",
      classification: "derived-rule" as const,
      applicability: { editions: ["bedrock" as const] },
      applicabilityStatus: "NOT_EVALUATED" as const,
      sourceIds: ["ms-persist-v2"],
      sources: [{
        id: "ms-persist-v2",
        title: "Official reference",
        url: "https://learn.microsoft.com/en-us/minecraft/creator/",
        authority: "official" as const,
        confidence: "documented" as const,
        retrievedDate: "2026-09-23",
      }],
      relation: { kind: "gates" as const, object: "durable-state-reconciliation" },
    };
    const core = {
      goal: "why is reconnect state stale?",
      graph: fixtureGraph(),
      intent,
      resourceSelection: [selectedResource],
    };
    const filled = compileContextPack({
      ...core,
      resourceKnowledge: { [selectedResource.resource.id]: knowledge },
    });
    expect(filled.resources?.items[0]?.knowledge?.summary)
      .toBe("worldLoad gates durable-state-reconciliation");
    expect(filled.resources?.knowledgeContent?.status).toBe("COMPLETE");

    const missing = compileContextPack({
      ...core,
      resourceKnowledge: {},
    });
    expect(missing.resources?.knowledgeContent?.status).toBe("PARTIAL");
    expect(missing.complete).toBe(false);
    expect(missing.reasons.some((reason) => reason.includes("not hydrated")))
      .toBe(true);
  });

});
