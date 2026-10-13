import { describe, expect, it } from "vitest";
import {
  projectReadyAuditIssues,
} from "../src/map-audit-issue-projection.js";
import {
  assessGameplayDefectResolutionGate,
} from "../src/inspection/gameplay-defect-resolution.js";
import {
  projectAllNeedValidationAuditIssues,
} from "../src/map-audit-validation-projection.js";
import {
  projectSignalNeedValidationAuditIssues,
  projectClosureNeedValidationAuditIssues,
} from "../src/map-audit-validation-signals.js";
import {
  groupNeedValidationTests,
} from "../src/map-audit-validation-plan.js";
import type {
  GameplayScenarioGraph,
} from "../src/inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "../src/inspection/gameplay-defect-resolution.js";

const graph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [
    {
      id: "scenario:capacity",
      label: "arena-capacity-plus-one",
      gameplayStage: "READY_START",
      purpose: "Validate playable arena capacity.",
      sourceSubjectIds: ["policy:arena"],
      componentIds: ["runtime:arena"],
      causalLinkIds: ["link:capacity"],
      playerCounts: [2],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    },
    {
      id: "scenario:progression",
      label: "wave-progression",
      gameplayStage: "PROGRESSION",
      purpose: "Validate wave progression.",
      sourceSubjectIds: ["objective:wave"],
      componentIds: ["runtime:entities"],
      causalLinkIds: ["link:progression"],
      playerCounts: [1],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    },
  ],
  components: [],
  causalLinks: [
    {
      id: "link:capacity",
      scenarioId: "scenario:capacity",
      fromComponentId: "runtime:arena",
      toComponentId: "policy:arena",
      purpose: "Visible arena capacity remains playable.",
      evidenceIds: [
        "world:arena-count",
        "capacity:safe-concurrency",
      ],
      subjectIds: ["policy:arena"],
      componentIds: ["runtime:arena"],
      status: "CONTRADICTED",
      reason: "Six arenas are visible but only two can run concurrently.",
    },
    {
      id: "link:progression",
      scenarioId: "scenario:progression",
      fromComponentId: "runtime:entities",
      toComponentId: "objective:wave",
      purpose: "Wave progression requires successful entity spawn.",
      evidenceIds: ["source:wave"],
      subjectIds: ["objective:wave"],
      componentIds: ["runtime:entities"],
      status: "CONTRADICTED",
      reason: "Progression advances without the required spawn.",
    },
  ],
  knowledgeRequirements: [],
  knowledgeReceipts: [],
  requiredInspectionGraph: {
    policy: "required-inspection-graph",
    nodes: [],
    receipts: [],
  },
};

const gate: GameplayDefectResolutionGate = {
  status: "READY_FOR_PROPOSED_BUG_SET",
  contradictedCausalLinkIds: [
    "link:capacity",
    "link:progression",
  ],
  resolutions: [
    {
      causalLinkId: "link:capacity",
      scenarioId: "scenario:capacity",
      disposition: "CONFIRMED_DEFECT_READY",
      gameplayTrigger: "Start a third independent arena.",
      gameplayConsequence: "Visible capacity is unavailable.",
      expectedOutcome: "All visible arena capacity is playable.",
      actualOutcome: "Only two arenas can run concurrently.",
      affectedScope: "multi-arena capacity",
      familyProof: {
        schemaVersion: 1,
        policy: "family-proof-receipt",
        failureDomain: "arena-multi-arena",
        criteria: [
          {
            id: "arena-contract-grounded",
            satisfied: true,
            evidenceIds: ["world:arena-count"],
          },
          {
            id: "concurrent-violation-reachable",
            satisfied: true,
            evidenceIds: ["capacity:safe-concurrency"],
          },
          {
            id: "arena-counterproof-exhausted",
            satisfied: true,
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          },
        ],
      },
      counterProofSearch: {
        schemaVersion: 1,
        policy: "bounded-counterproof-search",
        searchedDimensions: [
          "guard",
          "scope",
          "exclusion",
          "owner",
        ],
        dimensionReceipts: [
          {
            dimension: "guard",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          },
          {
            dimension: "scope",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          },
          {
            dimension: "exclusion",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          },
          {
            dimension: "owner",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          }
        ],
        scopeIds: [
          "runtime:arena",
          "policy:arena",
        ],
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
        exhaustiveWithinScope: true,
        conclusion: "NO_BLOCKING_PROOF",
      },
    },
    {
      causalLinkId: "link:progression",
      scenarioId: "scenario:progression",
      disposition: "CONFIRMED_DEFECT_READY",
      gameplayTrigger: "Fail a required wave spawn.",
      gameplayConsequence: "Wave progression becomes incorrect.",
      expectedOutcome: "Progress only after required spawn lifecycle completes.",
      actualOutcome: "Progression advances without required spawn.",
      affectedScope: "wave progression",
      familyProof: {
        schemaVersion: 1,
        policy: "family-proof-receipt",
        failureDomain: "progression-wave-objective",
        criteria: [
          {
            id: "completion-dependency-grounded",
            satisfied: true,
            evidenceIds: ["source:wave"],
          },
          {
            id: "failing-path-reachable",
            satisfied: true,
            evidenceIds: ["source:wave"],
          },
          {
            id: "reconciliation-exhausted",
            satisfied: true,
            evidenceIds: ["source:wave"],
          },
        ],
      },
      counterProofSearch: {
        schemaVersion: 1,
        policy: "bounded-counterproof-search",
        searchedDimensions: [
          "guard",
          "scope",
          "exclusion",
        ],
        dimensionReceipts: [
          {
            dimension: "guard",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          },
          {
            dimension: "scope",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          },
          {
            dimension: "exclusion",
            scopeIds: ["runtime:arena", "policy:arena"],
            evidenceIds: [
              "world:arena-count",
              "capacity:safe-concurrency",
            ],
          }
        ],
        scopeIds: [
          "runtime:entities",
          "objective:wave",
        ],
        evidenceIds: [
          "source:wave",
        ],
        exhaustiveWithinScope: true,
        conclusion: "NO_BLOCKING_PROOF",
      },
    },
  ],
  confirmedDefectReadyIds: [
    "link:capacity",
    "link:progression",
  ],
  blockingCounterProofIds: [],
  runtimeProofRequiredIds: [],
  detectionGapIds: [],
  gameplayTranslationRequiredIds: [],
  counterProofSearchRequiredIds: [],
  issues: [],
};

describe("EVALUATE to PROVE to issue projection", () => {
  const baseGraph: GameplayScenarioGraph = {
    ...graph,
    scenarios: [graph.scenarios[0]!],
    causalLinks: [graph.causalLinks[0]!],
  };
  const submitted = {
    ...gate.resolutions[0]!,
    counterProofSearch: {
      ...gate.resolutions[0]!.counterProofSearch!,
      searchedDimensions: [
        "owner", "guard", "generation", "scope", "cleanup", "exclusion",
      ] as const,
      dimensionReceipts: [
        "owner", "guard", "generation", "scope", "cleanup", "exclusion",
      ].map((dimension) => ({
        dimension: dimension as
          "owner" | "guard" | "generation" | "scope" | "cleanup" | "exclusion",
        scopeIds: ["runtime:arena", "policy:arena"],
        evidenceIds: ["world:arena-count", "capacity:safe-concurrency"],
        exhaustiveWithinScope: true,
      })),
    },
  };

  it("preserves a grounded source contradiction through the actual PROVE gate into PROVEN output", () => {
    const proof = assessGameplayDefectResolutionGate(baseGraph, [submitted]);
    expect(proof.status).toBe("READY_FOR_PROPOSED_BUG_SET");
    expect(proof.confirmedDefectReadyIds).toEqual(["link:capacity"]);
    const output = projectReadyAuditIssues(baseGraph, proof);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      status: "PROVEN",
      causalLinkId: "link:capacity",
      scenarioId: "scenario:capacity",
      expectedOutcome: "All visible arena capacity is playable.",
      actualOutcome: "Only two arenas can run concurrently.",
    });
  });

  it("rejects a false positive when a graph-owned exact-target guard blocks the contradiction", () => {
    const excluded: GameplayScenarioGraph = {
      ...baseGraph,
      causalLinks: [
        ...baseGraph.causalLinks,
        {
          ...baseGraph.causalLinks[0]!,
          id: "link:capacity-exclusion",
          intentEdgeKind: "excludes",
          status: "PROVEN",
          evidenceIds: ["source:exact-admission-guard"],
        },
      ],
    };
    const proof = assessGameplayDefectResolutionGate(excluded, [submitted]);
    expect(proof.status).toBe("BLOCKED");
    expect(proof.confirmedDefectReadyIds).toEqual([]);
    expect(proof.blockingCounterProofIds).toEqual(["link:capacity"]);
    expect(projectReadyAuditIssues(excluded, proof)).toEqual([]);
  });

  it("does not let a stale confirmation bypass a new exact-target guard at issue projection", () => {
    const proof = assessGameplayDefectResolutionGate(baseGraph, [submitted]);
    expect(projectReadyAuditIssues(baseGraph, proof)).toHaveLength(1);
    const updatedGraph: GameplayScenarioGraph = {
      ...baseGraph,
      causalLinks: [
        ...baseGraph.causalLinks,
        {
          ...baseGraph.causalLinks[0]!,
          id: "link:late-exclusion",
          intentEdgeKind: "excludes",
          status: "PROVEN",
          evidenceIds: ["source:late-exact-guard"],
        },
      ],
    };
    expect(projectReadyAuditIssues(updatedGraph, proof)).toEqual([]);
  });

  it("does not borrow a guard from an unrelated commit target", () => {
    const unrelated: GameplayScenarioGraph = {
      ...baseGraph,
      causalLinks: [
        ...baseGraph.causalLinks,
        {
          ...baseGraph.causalLinks[0]!,
          id: "link:unrelated-exclusion",
          intentEdgeKind: "excludes",
          status: "PROVEN",
          toComponentId: "policy:other",
          evidenceIds: ["source:unrelated-guard"],
        },
      ],
    };
    const proof = assessGameplayDefectResolutionGate(unrelated, [submitted]);
    expect(proof.blockingCounterProofIds).toEqual([]);
    expect(projectReadyAuditIssues(unrelated, proof)
      .map((item) => item.causalLinkId)).toEqual(["link:capacity"]);
  });
});

describe("map audit issue projection", () => {
  it("projects unresolved material dependencies as NEED_VALIDATION instead of hiding them", async () => {
    const module = await import(
      "../src/map-audit-validation-projection.js"
    );
    const unresolvedGraph: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [{
        id: "link:runtime-gap",
        scenarioId: "scenario:progression",
        fromComponentId: "runtime:entities",
        toComponentId: "objective:wave",
        purpose: "Remote enemy remains simulated until wave completion.",
        evidenceIds: ["source:wave"],
        subjectIds: ["objective:wave"],
        componentIds: ["runtime:entities"],
        status: "RUNTIME_BLOCKED",
        reason: "Static evidence cannot prove Minecraft runtime residency.",
      }],
    };
    const unresolvedGate: GameplayDefectResolutionGate = {
      status: "READY_FOR_PROPOSED_BUG_SET",
      contradictedCausalLinkIds: [],
      resolutions: [],
      confirmedDefectReadyIds: [],
      blockingCounterProofIds: [],
      runtimeProofRequiredIds: [],
      detectionGapIds: [],
      gameplayTranslationRequiredIds: [],
      counterProofSearchRequiredIds: [],
      issues: [],
    };

    const result =
      module.projectNeedValidationAuditIssues(
        unresolvedGraph,
        unresolvedGate,
      );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: "NEED_VALIDATION",
      failureDomain:
        "progression-wave-objective",
      gameplayFlow: "PROGRESSION",
    });
    expect(result[0]?.validationReason).toMatch(
      /runtime observation/i,
    );
    expect(result[0]?.validationTest).toContain(
      "Remote enemy remains simulated",
    );
  });

  it("surfaces missing required knowledge as NEED_VALIDATION instead of hiding it in closure", () => {
    const knowledgeGraph: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [],
      knowledgeRequirements: [{
        id: "knowledge:scenario:progression:chunk-simulation",
        scenarioId: "scenario:progression",
        domain: "chunk-simulation",
        reason:
          "Wave progression requires chunk-simulation evidence.",
        capabilityIds: ["chunk-lifecycle-integrity"],
        dependsOnRequirementIds: [],
        subjectIds: ["objective:wave"],
        componentIds: ["runtime:entities"],
      }],
      knowledgeReceipts: [{
        requirementId:
          "knowledge:scenario:progression:chunk-simulation",
        scenarioId: "scenario:progression",
        domain: "chunk-simulation",
        status: "MISSING_REQUIRED_KNOWLEDGE",
        evidenceIds: [],
        capabilityIdsUsed: [
          "chunk-lifecycle-integrity",
        ],
        subjectIds: ["objective:wave"],
        componentIds: ["runtime:entities"],
        reason:
          "Chunk analysis executed but returned no decisive scenario-scoped evidence.",
      }],
      requiredInspectionGraph: {
        policy: "required-inspection-graph",
        nodes: [],
        receipts: [],
      },
    };
    const emptyGate: GameplayDefectResolutionGate = {
      status: "READY_FOR_PROPOSED_BUG_SET",
      contradictedCausalLinkIds: [],
      resolutions: [],
      confirmedDefectReadyIds: [],
      blockingCounterProofIds: [],
      runtimeProofRequiredIds: [],
      detectionGapIds: [],
      gameplayTranslationRequiredIds: [],
      counterProofSearchRequiredIds: [],
      issues: [],
    };

    const result =
      projectAllNeedValidationAuditIssues(
        knowledgeGraph,
        emptyGate,
      );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: "NEED_VALIDATION",
      knowledgeRequirementId:
        "knowledge:scenario:progression:chunk-simulation",
      validationGroupKey:
        "scenario:progression:chunk-simulation",
    });
    expect(result[0]?.missingProof).toMatch(
      /chunk-simulation/i,
    );
  });

  it("surfaces negative-space and high temporal signals instead of leaving them as hidden attention counts", () => {
    const result =
      projectSignalNeedValidationAuditIssues(
        [{
          id: "negative-space:entry-without-exit:state:round",
          kind: "entry-without-exit",
          subjectId: "state:round",
          evidenceIds: ["state:enter"],
          reason:
            "Gameplay state is reachable but has no grounded exit.",
        }],
        [{
          leftSystem: "callback:reward",
          rightSystem: "arena:cleanup",
          factors: [
            "async",
            "cleanup",
          ],
          priority: "high",
          windows: [
            "before",
            "overlap",
            "after",
          ],
        }],
      );

    expect(result).toHaveLength(2);
    expect(result.every(
      (item) => item.status === "NEED_VALIDATION",
    )).toBe(true);
    expect(result.map(
      (item) => item.failureDomain,
    )).toContain("state-ownership");
    expect(result.map(
      (item) => item.failureDomain,
    )).toContain("temporal-async");
  });

  it("consolidates multiple unresolved findings into one validation test group", () => {
    const findings =
      projectSignalNeedValidationAuditIssues(
        [{
          id: "negative-space:producer-without-consumer:state:round",
          kind: "producer-without-consumer",
          subjectId: "state:round",
          evidenceIds: ["state:write"],
          reason:
            "State/event is produced but no consuming gameplay path is present.",
        }, {
          id: "negative-space:entry-without-exit:state:round",
          kind: "entry-without-exit",
          subjectId: "state:round",
          evidenceIds: ["state:enter"],
          reason:
            "Gameplay state is reachable but has no grounded exit.",
        }],
        [],
      );

    const groups = groupNeedValidationTests(
      findings,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.findingIds).toHaveLength(2);
    expect(groups[0]?.key).toBe(
      "negative-space:state:round",
    );
  });

  it("surfaces gameplay closure gaps as NEED_VALIDATION findings", () => {
    const result =
      projectClosureNeedValidationAuditIssues({
        status: "OPEN",
        surfaces: [{
          id: "runtime:arena-capacity",
          label: "Arena capacity",
          kind: "runtime-domain",
          status: "unknown",
          material: true,
          reason:
            "Concurrent capacity is unresolved.",
          evidenceIds: ["capacity:source"],
          boundaries: [],
        }],
        unaccountedSurfaceIds: [
          "mechanic:teleport",
        ],
        blockingSurfaceIds: [],
        unknownSurfaceIds: [
          "runtime:arena-capacity",
        ],
        stateModelComplete: false,
        boundariesExtracted: false,
        reasons: [
          "Gameplay model remains incomplete.",
        ],
      });

    expect(result.map(
      (item) => item.causalLinkId,
    )).toEqual(expect.arrayContaining([
      "closure-surface:runtime:arena-capacity",
      "unaccounted-surface:mechanic:teleport",
      "closure-gap:state-model",
      "closure-gap:boundaries",
    ]));
    expect(result.every(
      (item) => item.status === "NEED_VALIDATION",
    )).toBe(true);
  });

  it("keeps confirmation NEED_VALIDATION until family proof receipt is complete", () => {
    const withoutFamilyProof: GameplayDefectResolutionGate = {
      ...gate,
      resolutions: [{
        ...gate.resolutions[1]!,
        familyProof: undefined,
      }],
      confirmedDefectReadyIds: [
        "link:progression",
      ],
    };

    const proven = projectReadyAuditIssues(
      graph,
      withoutFamilyProof,
    );
    const unresolved =
      projectAllNeedValidationAuditIssues(
        graph,
        withoutFamilyProof,
      );

    expect(proven).toEqual([]);
    expect(
      unresolved.find(
        (item) =>
          item.causalLinkId ===
          "link:progression",
      ),
    ).toMatchObject({
      status: "NEED_VALIDATION",
    });
    expect(
      unresolved.find(
        (item) =>
          item.causalLinkId ===
          "link:progression",
      )?.missingProof,
    ).toMatch(/completion-dependency-grounded/i);
  });

  it("refuses PROVEN projection when minimum proof saturation is incomplete", () => {
    const unsaturatedGate: GameplayDefectResolutionGate = {
      ...gate,
      resolutions: [{
        causalLinkId: "link:progression",
        scenarioId: "scenario:progression",
        disposition: "CONFIRMED_DEFECT_READY",
        gameplayTrigger: "Fail a required wave spawn.",
        gameplayConsequence: "Wave progression becomes incorrect.",
        expectedOutcome:
          "Progress only after required spawn lifecycle completes.",
        actualOutcome:
          "Progression advances without required spawn.",
        affectedScope: "wave progression",
      }],
      confirmedDefectReadyIds: [
        "link:progression",
      ],
    };

    const result = projectReadyAuditIssues(
      graph,
      unsaturatedGate,
    );

    expect(result).toEqual([]);
  });

  it("separates design mismatch from implementation bug in one projection", () => {
    const result = projectReadyAuditIssues(
      graph,
      gate,
      [{
        subjectId: "runtime:arena-capacity",
        label: "Playable concurrent arena capacity",
        status: "DEGRADED",
        failureClass: "DESIGN_FAILURE",
        issueType: "DESIGN_MISMATCH",
        expectedCapacity: 6,
        playableCapacity: 2,
        technicalConstraintReasons: [],
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
        playerFacingEvidenceIds: [
          "world:arena-count",
        ],
        informationMismatch: true,
        reason: "Presented arena capacity is not fully playable.",
      }],
    );

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:capacity",
      ),
    ).toMatchObject({
      status: "PROVEN",
      issueType: "DESIGN_MISMATCH",
    });
    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:capacity",
      ),
    ).toMatchObject({
      failureDomain: "arena-multi-arena",
      gameplayFlow: "READY_START",
      informationMismatch: true,
    });

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:capacity",
      ),
    ).toMatchObject({
      failureDomain: "arena-multi-arena",
      contributingDomains: [
        "arena-multi-arena",
      ],
      gameplayFlow: "READY_START",
    });

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:progression",
      ),
    ).toMatchObject({
      status: "PROVEN",
      issueType: "BUG",
    });
    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:progression",
      ),
    ).toMatchObject({
      failureDomain: "progression-wave-objective",
      gameplayFlow: "PROGRESSION",
      informationMismatch: false,
    });

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:progression",
      ),
    ).toMatchObject({
      failureDomain:
        "progression-wave-objective",
      contributingDomains: [
        "entity-ai-combat",
        "progression-wave-objective",
      ],
      gameplayFlow: "PROGRESSION",
    });
  });
});
