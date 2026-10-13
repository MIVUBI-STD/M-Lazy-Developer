import { describe, expect, it } from "vitest";
import {
  assessGameplayDefectResolutionGate,
} from "../../src/inspection/gameplay-defect-resolution.js";
import type {
  GameplayScenarioGraph,
} from "../../src/inspection/gameplay-scenario-model.js";

const graph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [{
    id: "preset:arena-capacity",
    label: "arena-capacity-plus-one",
    gameplayStage: "READY_START",
    purpose: "Validate playable multi-arena capacity.",
    sourceSubjectIds: ["policy:arena-capacity"],
    componentIds: [
      "policy:arena-capacity",
      "runtime:arena",
    ],
    causalLinkIds: ["link:arena-capacity"],
    playerCounts: [2],
    requiredKnowledgeIds: [],
    composedScenarioIds: [],
  }],
  components: [],
  causalLinks: [{
    id: "link:arena-capacity",
    scenarioId: "preset:arena-capacity",
    fromComponentId: "runtime:arena",
    toComponentId: "policy:arena-capacity",
    purpose: "Visible arena capacity remains concurrently playable.",
    evidenceIds: [
      "world:arena-count",
      "capacity:safe-concurrency",
    ],
    subjectIds: ["policy:arena-capacity"],
    componentIds: [
      "policy:arena-capacity",
      "runtime:arena",
    ],
    status: "CONTRADICTED",
    reason: "Six arenas are visible but only two are concurrently playable.",
  }],
  knowledgeRequirements: [],
  knowledgeReceipts: [],
  requiredInspectionGraph: {
    policy: "required-inspection-graph",
    nodes: [],
    receipts: [],
  },
};

function resolution(
  searchedDimensions: readonly (
    | "owner"
    | "guard"
    | "generation"
    | "scope"
    | "cleanup"
    | "exclusion"
    | "geometry"
    | "capability"
    | "world-rule"
    | "activation"
    | "representation"
  )[],
) {
  return {
    causalLinkId: "link:arena-capacity",
    disposition: "CONFIRMED_DEFECT_READY" as const,
    gameplayTrigger: "Start independent parties in visible arenas.",
    gameplayConsequence: "Visible arena capacity is not actually available concurrently.",
    expectedOutcome: "All visible arena capacity is playable or design exposes the real limit.",
    actualOutcome: "Only two of six arenas can run concurrently.",
    affectedScope: "multi-arena admission",
    counterProofSearch: {
      schemaVersion: 1 as const,
      policy: "bounded-counterproof-search" as const,
      searchedDimensions,
      dimensionReceipts: searchedDimensions.map((dimension) => ({
        dimension,
        scopeIds: ["runtime:arena", "policy:arena-capacity"],
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
      })),
      scopeIds: ["runtime:arena", "policy:arena-capacity"],
      evidenceIds: [
        "world:arena-count",
        "capacity:safe-concurrency",
      ],
      exhaustiveWithinScope: true,
      conclusion: "NO_BLOCKING_PROOF" as const,
    },
  };
}

describe("gameplay defect resolution crosscheck depth", () => {
  it("keeps ownership-sensitive contradiction in targeted counterproof continuation after safe automatic search", () => {
    const result = assessGameplayDefectResolutionGate(graph);

    expect(result.status).toBe("BLOCKED");
    expect(result.confirmedDefectReadyIds).toEqual([]);
    expect(
      result.counterProofSearchRequiredIds,
    ).toEqual(["link:arena-capacity"]);
    expect(
      result.resolutions[0]?.counterProofSearch?.searchedDimensions,
    ).toEqual([
      "exclusion",
      "guard",
      "scope",
    ]);
  });

  it("rejects shallow one-dimension counter-proof search for ownership-sensitive defects", () => {
    const result = assessGameplayDefectResolutionGate(
      graph,
      [resolution(["guard"])],
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.issues.join(" ")).toMatch(
      /missing relevant dimensions/i,
    );
  });

  it("does not treat an overlapping exclusion on a different commit target as blocking counter-proof", () => {
    const withUnrelatedGuard: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [
        ...graph.causalLinks,
        {
          id: "link:unrelated-guard",
          scenarioId: "preset:arena-capacity",
          fromComponentId: "runtime:arena",
          toComponentId: "policy:other",
          purpose: "Guard unrelated policy state.",
          evidenceIds: ["source:other-guard"],
          subjectIds: ["policy:arena-capacity"],
          componentIds: ["runtime:arena"],
          intentEdgeKind: "excludes",
          status: "PROVEN",
          reason: "An unrelated guard exists.",
        },
      ],
    };

    const result =
      assessGameplayDefectResolutionGate(
        withUnrelatedGuard,
      );

    expect(result.blockingCounterProofIds).toEqual([]);
    expect(result.counterProofSearchRequiredIds).toEqual([
      "link:arena-capacity",
    ]);
  });

  it("accepts blocking counter-proof only when exclusion applies at the contradicted commit target", () => {
    const withExactGuard: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [
        ...graph.causalLinks,
        {
          id: "link:exact-guard",
          scenarioId: "preset:arena-capacity",
          fromComponentId: "runtime:arena",
          toComponentId: "policy:arena-capacity",
          purpose: "Exclude unavailable arena admission.",
          evidenceIds: ["source:exact-guard"],
          subjectIds: ["policy:arena-capacity"],
          componentIds: ["runtime:arena"],
          intentEdgeKind: "excludes",
          status: "PROVEN",
          reason:
            "Exact admission guard blocks the contradicted target.",
        },
      ],
    };

    const result =
      assessGameplayDefectResolutionGate(
        withExactGuard,
      );

    expect(result.blockingCounterProofIds).toEqual([
      "link:arena-capacity",
    ]);
    expect(result.confirmedDefectReadyIds).toEqual([]);
  });

  it("accepts confirmation only after all context-relevant dimensions were searched", () => {
    const result = assessGameplayDefectResolutionGate(
      graph,
      [resolution([
        "owner",
        "guard",
        "generation",
        "scope",
        "cleanup",
        "exclusion",
      ])],
    );

    expect(result.status).toBe(
      "READY_FOR_PROPOSED_BUG_SET",
    );
    expect(result.confirmedDefectReadyIds).toEqual([
      "link:arena-capacity",
    ]);
  });
  it("requires geometry counter-proof for physical escape claims", () => {
    const spatialGraph: GameplayScenarioGraph = {
      ...graph,
      scenarios: [{
        ...graph.scenarios[0]!,
        id: "preset:physical-escape",
        label: "arena-physical-escape",
        purpose: "Validate whether a flying player can cross the arena barrier boundary.",
        causalLinkIds: ["link:physical-escape"],
      }],
      causalLinks: [{
        ...graph.causalLinks[0]!,
        id: "link:physical-escape",
        scenarioId: "preset:physical-escape",
        purpose: "Player remains physically contained by arena collision geometry.",
        reason: "mayfly is enabled and no script position clamp was found.",
      }],
    };

    const result = assessGameplayDefectResolutionGate(spatialGraph);

    expect(result.status).toBe("BLOCKED");
    expect(result.counterProofSearchRequiredIds).toEqual([
      "link:physical-escape",
    ]);
    expect(
      result.resolutions[0]?.counterProofSearch?.searchedDimensions,
    ).not.toContain("geometry");
  });

  it("requires capability, activation and world-rule counter-proof for privileged spawn claims", () => {
    const capabilityGraph: GameplayScenarioGraph = {
      ...graph,
      scenarios: [{
        ...graph.scenarios[0]!,
        id: "preset:roommaster-spawn",
        label: "roommaster-manual-spawn",
        purpose: "Validate Roommaster/admin manual entity spawning under world gamerules.",
        causalLinkIds: ["link:roommaster-spawn"],
      }],
      causalLinks: [{
        ...graph.causalLinks[0]!,
        id: "link:roommaster-spawn",
        scenarioId: "preset:roommaster-spawn",
        purpose: "Protected live arena rejects unauthorized entity spawning.",
        reason: "Admin permission bypass may allow manual spawn while doMobSpawning is false.",
      }],
    };

    const result = assessGameplayDefectResolutionGate(capabilityGraph);

    expect(result.status).toBe("BLOCKED");
    expect(result.counterProofSearchRequiredIds).toEqual([
      "link:roommaster-spawn",
    ]);
  });

  it("requires representation counter-proof for client-only visual mutation claims", () => {
    const representationGraph: GameplayScenarioGraph = {
      ...graph,
      scenarios: [{
        ...graph.scenarios[0]!,
        id: "preset:waterlog-desync",
        label: "client-waterlog-desync",
        purpose: "Validate client/server reconciliation after cancelled water placement.",
        causalLinkIds: ["link:waterlog-desync"],
      }],
      causalLinks: [{
        ...graph.causalLinks[0]!,
        id: "link:waterlog-desync",
        scenarioId: "preset:waterlog-desync",
        purpose: "Cancelled world mutation reconciles to the authoritative server state.",
        reason: "Acting client may retain a waterlogged ghost visual.",
      }],
    };

    const result = assessGameplayDefectResolutionGate(representationGraph);

    expect(result.status).toBe("BLOCKED");
    expect(result.counterProofSearchRequiredIds).toEqual([
      "link:waterlog-desync",
    ]);
  });
});

describe("non-finding PROVE resolution conservation", () => {
  const gapGraph: GameplayScenarioGraph = {
    ...graph,
    causalLinks: graph.causalLinks.map((link) => ({
      ...link,
      status: "DETECTION_GAP" as const,
    })),
  };

  it("keeps source detection gaps as valid non-finding obligations without fabricating a defect", () => {
    const result = assessGameplayDefectResolutionGate(gapGraph);
    expect(result.status).toBe("READY_FOR_PROPOSED_BUG_SET");
    expect(result.detectionGapIds).toEqual(["link:arena-capacity"]);
    expect(result.confirmedDefectReadyIds).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("keeps a typed runtime question as an unresolved non-finding resolution", () => {
    const runtimeGraph: GameplayScenarioGraph = {
      ...graph,
      causalLinks: graph.causalLinks.map((link) => ({
        ...link,
        status: "RUNTIME_BLOCKED" as const,
        runtimeNativeReason: "engine-scheduling" as const,
      })),
    };
    const result = assessGameplayDefectResolutionGate(runtimeGraph);
    expect(result.status).toBe("READY_FOR_PROPOSED_BUG_SET");
    expect(result.runtimeProofRequiredIds).toEqual(["link:arena-capacity"]);
    expect(result.confirmedDefectReadyIds).toEqual([]);
    expect(result.resolutions[0]?.narrowRuntimeQuestion).toBeTruthy();
  });

  it("rejects attempts to turn an unproven causal gap into a gameplay finding", () => {
    const result = assessGameplayDefectResolutionGate(gapGraph, [{
      causalLinkId: "link:arena-capacity",
      scenarioId: "preset:arena-capacity",
      disposition: "CONFIRMED_DEFECT_READY",
    }]);
    expect(result.status).toBe("BLOCKED");
    expect(result.confirmedDefectReadyIds).toEqual([]);
    expect(result.detectionGapIds).toEqual(["link:arena-capacity"]);
    expect(result.issues.join(" ")).toMatch(/DETECTION_GAP cannot be promoted/);
  });

  it("rejects a supplied resolution assigned to another scenario", () => {
    const result = assessGameplayDefectResolutionGate(gapGraph, [{
      causalLinkId: "link:arena-capacity",
      scenarioId: "preset:other",
      disposition: "DETECTION_GAP",
      detectionGapReason: "Unresolved source causality.",
      missingCapability: "Selected-artifact causal evidence.",
    }]);
    expect(result.status).toBe("BLOCKED");
    expect(result.issues.join(" ")).toMatch(/scenarioId does not match/);
  });
});
