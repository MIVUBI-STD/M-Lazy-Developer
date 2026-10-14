import { describe, expect, it } from "vitest";
import {
  analyzeGameplayRouteCauseCandidates,
  type GameplayRouteCauseAnalysisInput,
} from "../../src/inspection/gameplay-route-candidate-analysis.js";

function baseAssessment(): GameplayRouteCauseAnalysisInput {
  return {
    stallObservation: {
      entityKey: "demo:zombie",
      routeId: "bridge",
      stalledTicks: 80,
      distanceDelta: 0.1,
      scope: {
        arenaId: "arena_6",
        arenaGeneration: 3,
        entityKey: "demo:zombie",
      },
      observedAt: { tick: 225 },
      evidenceId: "e:stall",
    },
    disposition: "target-nearest-match",
    routeAssessment: {
      routeObservation: {
        entityKey: "demo:zombie",
        routeId: "bridge",
        routeIndex: 606,
        worldLocation: {
          x: 1778,
          y: -30,
          z: 0,
        },
        scope: {
          arenaId: "arena_6",
          arenaGeneration: 3,
          entityKey: "demo:zombie",
        },
        observedAt: { tick: 220 },
        evidenceId: "e:route",
      },
      assessment: {
        disposition: "resolved",
        routeId: "bridge",
        routeIndex: 606,
        target: {
          routeNodeId: "spatial-region:route-bridge",
          routeId: "bridge",
          routeIndex: 606,
          localPoint: {
            x: 23,
            y: -28.5,
            z: 0.5,
          },
          worldPoint: {
            x: 1778,
            y: -28.5,
            z: 0.5,
          },
        },
        targetCandidates: [{
          routeNodeId: "spatial-region:route-bridge",
          routeId: "bridge",
          routeIndex: 606,
          localPoint: {
            x: 23,
            y: -28.5,
            z: 0.5,
          },
          worldPoint: {
            x: 1778,
            y: -28.5,
            z: 0.5,
          },
        }],
        nearest: {
          routeNodeId: "spatial-region:route-bridge",
          routeId: "bridge",
          routeIndex: 606,
          worldPoint: {
            x: 1778,
            y: -28.5,
            z: 0.5,
          },
          distance: 1.58,
        },
        distanceToTarget: 1.58,
        reasons: [],
      },
    },
    motionSeries: {
      sampleCount: 2,
      evidenceIds: ["e:route-a", "e:route-b"],
      firstTick: 210,
      lastTick: 220,
      displacement: 0.5,
    },
    navigationTargetObservation: {
      entityKey: "demo:zombie",
      targetLocation: {
        x: 1778,
        y: -28.5,
        z: 0.5,
      },
      routeId: "bridge",
      routeIndex: 606,
      mechanism: "moveToLocation",
      scope: {
        arenaId: "arena_6",
        arenaGeneration: 3,
        entityKey: "demo:zombie",
      },
      observedAt: { tick: 222 },
      evidenceId: "e:navigation",
    },
    reachabilityObservation: {
      entityKey: "demo:zombie",
      reachable: true,
      routeId: "bridge",
      routeIndex: 606,
      mechanism: "gametest-path-check",
      scope: {
        arenaId: "arena_6",
        arenaGeneration: 3,
        entityKey: "demo:zombie",
      },
      observedAt: { tick: 223 },
      evidenceId: "e:reachability",
    },
    chunkAvailabilityObservation: {
      requestId:
        "route-stall::e:stall::chunk-route-availability",
      state: "loaded",
      scope: {
        arenaId: "arena_6",
        arenaGeneration: 3,
        entityKey: "demo:zombie",
      },
      observedAt: { tick: 226 },
      evidenceId: "e:chunk",
    },
    navigationTargetDistanceToAuthoredTarget: 0,
    navigationTargetRouteMatchesAuthoredTarget: true,
    reasons: [],
  };
}


const completeAiStack = [{
  entityKey: "demo:zombie",
  stateId: "base",
  targeted: true,
  movementPresent: true,
  navigationPresent: true,
  movementGoalCandidatePresent: true,
  attackBehaviorPresent: true,
  movementGoalPriorities: [],
  duplicateMovementGoalPriorities: [],
  navigationCapabilities: [
    "navigation:walk",
  ],
  missingSurfaces: [],
  status: "targeted-stack-complete" as const,
}];

const compatibleRouteEnvironment = {
  contracts: 1,
  compatible: 1,
  incompatible: 0,
  stateDependent: 0,
  unresolved: 0,
  assessments: [{
    contractId: "bridge-ground",
    routeId: "bridge",
    entityKey: "demo:zombie",
    status: "compatible" as const,
    states: [{
      stateId: "base",
      compatible: true,
      missingCapabilities: [],
    }],
    reasons: ["compatible"],
  }],
};

describe("gameplay route candidate analysis", () => {
  it("isolates engine navigation only after all upstream candidates are rejected", () => {
    const result = analyzeGameplayRouteCauseCandidates(
      baseAssessment(),
      completeAiStack,
      compatibleRouteEnvironment,
    );

    expect(result.supportedCandidateIds).toEqual([
      "engine-navigation-runtime",
    ]);
    expect(result.rejectedCandidateIds).toEqual([
      "route-context",
      "target-assignment",
      "entity-ai-stack",
      "navigation-environment",
      "chunk-availability",
      "route-reachability",
      "navigation-target",
    ]);
    expect(result.unresolvedCandidateIds).toEqual([]);
    expect(result.leadingCandidateId)
      .toBe("engine-navigation-runtime");
    expect(result.stopCondition)
      .toBe("navigation-runtime-candidate-isolated");

    const engine = result.candidates.find(
      (item) =>
        item.id === "engine-navigation-runtime",
    );
    expect(engine).toEqual(expect.objectContaining({
      status: "supported",
      claimStrength: "corroborated",
    }));
  });

  it("keeps static AI stack ahead of engine navigation when every targeted state is incomplete", () => {
    const result =
      analyzeGameplayRouteCauseCandidates(
        baseAssessment(),
        [{
          entityKey: "demo:zombie",
          stateId: "base",
          targeted: true,
          movementPresent: true,
          navigationPresent: false,
          movementGoalCandidatePresent: true,
          attackBehaviorPresent: true,
          movementGoalPriorities: [],
          duplicateMovementGoalPriorities: [],
          navigationCapabilities: [],
          missingSurfaces: ["navigation"],
          status:
            "targeted-stack-incomplete",
        }],
        compatibleRouteEnvironment,
      );

    expect(result.leadingCandidateId)
      .toBe("entity-ai-stack");
    expect(result.stopCondition)
      .toBe("route-cause-supported");
    expect(
      result.candidates.find(
        (item) =>
          item.id === "entity-ai-stack",
      )?.status,
    ).toBe("supported");
    expect(
      result.candidates.find(
        (item) =>
          item.id ===
          "engine-navigation-runtime",
      )?.status,
    ).toBe("rejected");
  });

  it("selects chunk availability as the first supported upstream owner", () => {
    const input = baseAssessment();
    input.chunkAvailabilityObservation = {
      ...input.chunkAvailabilityObservation!,
      state: "not-loaded",
    };

    const result =
      analyzeGameplayRouteCauseCandidates(input);

    expect(result.leadingCandidateId)
      .toBe("chunk-availability");
    expect(result.stopCondition)
      .toBe("route-cause-supported");
    expect(
      result.candidates.find(
        (item) =>
          item.id === "chunk-availability",
      )?.status,
    ).toBe("supported");
    expect(
      result.candidates.find(
        (item) =>
          item.id === "engine-navigation-runtime",
      )?.status,
    ).toBe("rejected");
  });

  it("stops at unresolved route context before downstream engine claims", () => {
    const base = baseAssessment();
    const {
      navigationTargetObservation: _navigation,
      reachabilityObservation: _reachability,
      chunkAvailabilityObservation: _chunk,
      navigationTargetDistanceToAuthoredTarget: _distance,
      navigationTargetRouteMatchesAuthoredTarget: _routeMatches,
      ...rest
    } = base;

    const input: GameplayRouteCauseAnalysisInput = {
      ...rest,
      disposition: "ambiguous-route-context",
      routeAssessment: {
        ...base.routeAssessment!,
        assessment: {
          disposition: "ambiguous",
          routeIndex: 9,
          targetCandidates: [
            base.routeAssessment!.assessment.target!,
          ],
          reasons: [
            "Multiple authored routes contain this path index.",
          ],
        },
      },
    };

    const result =
      analyzeGameplayRouteCauseCandidates(input);

    expect(result.leadingCandidateId)
      .toBe("route-context");
    expect(result.stopCondition)
      .toBe("route-cause-supported");
    expect(
      result.candidates.find(
        (item) => item.id === "route-context",
      )?.status,
    ).toBe("supported");
    expect(
      result.candidates.find(
        (item) =>
          item.id === "engine-navigation-runtime",
      )?.status,
    ).toBe("rejected");
  });
});
