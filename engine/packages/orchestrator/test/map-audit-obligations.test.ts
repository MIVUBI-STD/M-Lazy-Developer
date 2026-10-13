import { describe, expect, it } from "vitest";
import {
  deriveAuditObligations,
} from "../src/map-audit-obligations.js";
import {
  projectNeedValidationAuditIssues,
} from "../src/map-audit-validation-projection.js";

function baseGraph(status: string) {
  return {
    schemaVersion: 1,
    policy: "scenario-driven-causal-audit",
    scenarios: [{
      id: "scenario:wave",
      label: "wave",
      gameplayStage: "PROGRESSION",
      purpose: "Complete the wave.",
      sourceSubjectIds: ["objective:wave"],
      componentIds: ["runtime:entities"],
      causalLinkIds: ["link:wave"],
      playerCounts: [1],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    }],
    components: [{
      id: "runtime:entities",
      label: "Entities",
      kind: "runtime-domain",
      technicalRole: "entity runtime",
      gameplayPurpose: "Drive wave progression.",
      evidenceIds: ["e:entity"],
      usedByScenarioIds: ["scenario:wave"],
      orphan: false,
    }],
    causalLinks: [{
      id: "link:wave",
      scenarioId: "scenario:wave",
      fromComponentId: "runtime:entities",
      toComponentId: "objective:wave",
      purpose: "Enemy remains accounted until completion.",
      evidenceIds: ["e:entity"],
      subjectIds: ["objective:wave"],
      componentIds: ["runtime:entities"],
      status,
      reason:
        status === "CONTRADICTED"
          ? "Wave accounting can complete while required enemy work remains."
          : "Runtime residency is unresolved.",
    }],
    knowledgeRequirements: [],
    knowledgeReceipts: [],
    requiredInspectionGraph: {
      policy: "required-inspection-graph",
      nodes: [],
      receipts: [],
    },
  } as any;
}

const closed = {
  status: "CLOSED",
  surfaces: [],
  unaccountedSurfaceIds: [],
  blockingSurfaceIds: [],
  unknownSurfaceIds: [],
  stateModelComplete: true,
  boundariesExtracted: true,
  reasons: [],
} as any;

describe("audit obligations versus gameplay findings", () => {
  it("keeps runtime-blocked evidence as a non-finding obligation", () => {
    const graph = baseGraph("RUNTIME_BLOCKED");
    const gate = {
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
    } as any;

    const findings =
      projectNeedValidationAuditIssues(
        graph,
        gate,
      );
    const obligations =
      deriveAuditObligations({
        graph,
        defectResolution: gate,
        gameplayWorld: {
          surfaceDiscovery: {
            surfaceIds: ["runtime:entities"],
          },
          arenas: {
            detected: false,
          },
          platformKnowledge: {
            claims: [],
          },
        } as any,
        gameplayClosure: closed,
        capabilityDelivery: [],
        negativeSpace: [],
        temporalRisks: [],
        discoveryChallenges: [],
        sharedResourceSignals: [],
        compoundBoundaries: [],
        accumulationGrowth: [],
      });

    expect(findings).toEqual([]);
    expect(
      obligations.some(
        (item) =>
          item.id === "link:wave" &&
          item.source === "runtime-proof",
      ),
    ).toBe(true);
  });

  it("allows NEED_VALIDATION only after defect confirmation readiness", () => {
    const graph = baseGraph("CONTRADICTED");
    const gate = {
      status: "READY_FOR_PROPOSED_BUG_SET",
      contradictedCausalLinkIds: ["link:wave"],
      resolutions: [{
        causalLinkId: "link:wave",
        scenarioId: "scenario:wave",
        disposition: "CONFIRMED_DEFECT_READY",
        gameplayTrigger: "Complete the wave.",
        gameplayConsequence:
          "Wave progression can complete incorrectly.",
        expectedOutcome:
          "Enemy remains accounted until completion.",
        actualOutcome:
          "Wave accounting can complete while required enemy work remains.",
        affectedScope: "objective:wave",
        evidenceIds: ["e:entity"],
        counterProofSearch: {
          schemaVersion: 1,
          policy: "bounded-counterproof-search",
          searchedDimensions: [
            "guard",
            "scope",
            "exclusion",
          ],
          dimensionReceipts: [{
            dimension: "guard",
            scopeIds: ["objective:wave"],
            evidenceIds: ["e:entity"],
          }, {
            dimension: "scope",
            scopeIds: ["objective:wave"],
            evidenceIds: ["e:entity"],
          }, {
            dimension: "exclusion",
            scopeIds: ["objective:wave"],
            evidenceIds: ["e:entity"],
          }],
          scopeIds: ["objective:wave"],
          evidenceIds: ["e:entity"],
          exhaustiveWithinScope: true,
          conclusion: "NO_BLOCKING_PROOF",
        },
      }],
      confirmedDefectReadyIds: ["link:wave"],
      blockingCounterProofIds: [],
      runtimeProofRequiredIds: [],
      detectionGapIds: [],
      gameplayTranslationRequiredIds: [],
      counterProofSearchRequiredIds: [],
      issues: [],
    } as any;

    const findings =
      projectNeedValidationAuditIssues(
        graph,
        gate,
      );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.status)
      .toBe("NEED_VALIDATION");
    expect(findings[0]?.issueType)
      .toBe("BUG");
  });
});


describe("reusable blind-spot obligations", () => {
  const gate = {
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
  } as any;

  const graph = {
    schemaVersion: 1,
    policy: "scenario-driven-causal-audit",
    scenarios: [],
    components: [],
    causalLinks: [],
    knowledgeRequirements: [],
    knowledgeReceipts: [],
    requiredInspectionGraph: {
      policy: "required-inspection-graph",
      nodes: [],
      receipts: [],
    },
  } as any;

  const baseWorld = {
    surfaceDiscovery: { surfaceIds: [] },
    arenas: {
      detected: true,
      isolation: {
        isolated: 0,
        partitionProofRequired: 0,
        sharedGlobal: 0,
        unknown: 0,
        observations: [],
      },
      replicaProof: [],
    },
    platformKnowledge: { claims: [] },
  } as any;

  const derive = (extra: any) =>
    deriveAuditObligations({
      graph,
      defectResolution: gate,
      gameplayWorld: {
        ...baseWorld,
        ...(extra.gameplayWorld ?? {}),
      },
      gameplayClosure: closed,
      capabilityDelivery: [],
      negativeSpace: [],
      temporalRisks: [],
      discoveryChallenges: [],
      sharedResourceSignals: [],
      compoundBoundaries: [],
      accumulationGrowth: [],
      capabilityExposure:
        extra.capabilityExposure,
    });

  it("surfaces incomplete replica proof instead of inheriting baseline safety", () => {
    const obligations = derive({
      gameplayWorld: {
        ...baseWorld,
        arenas: {
          ...baseWorld.arenas,
          replicaProof: [{
            arenaId: "arena:6",
            status: "no-proof",
            mismatchCount: 0,
            unresolvedBlocks: 1,
            evidenceIds: ["world:a6"],
          }],
        },
      },
    });

    expect(
      obligations.some(
        (item) =>
          item.id ===
          "replica-proof-incomplete:arena:6" &&
          item.source === "detection-gap",
      ),
    ).toBe(true);
  });

  it("forces proof for non-isolated arena resources", () => {
    const obligations = derive({
      gameplayWorld: {
        ...baseWorld,
        arenas: {
          ...baseWorld.arenas,
          isolation: {
            isolated: 0,
            partitionProofRequired: 1,
            sharedGlobal: 0,
            unknown: 0,
            observations: [{
              scriptId: "game",
              region: "arena:start",
              key: "shared_cinematic",
              status:
                "partition-proof-required",
            }],
          },
        },
      },
    });

    expect(
      obligations.some(
        (item) =>
          item.source === "shared-resource" &&
          item.id.includes("shared_cinematic"),
      ),
    ).toBe(true);
  });

  it("keeps unauthorized developer capability open until player reachability is proven", () => {
    const obligations = derive({
      capabilityExposure: {
        exposures: [{
          capabilityId:
            "developer-tool:skip",
          capabilityLabel:
            "Developer level skip",
          status: "potentially-exposed",
          prerequisiteReachability: "unknown",
          impact: "progression",
          reasons: [
            "Authorization is missing.",
          ],
          evidenceIds: ["scripts/dev.ts"],
        }],
        exposed: 0,
        potentiallyExposed: 1,
        releaseBlocking: 1,
        unresolved: 0,
      },
    });

    expect(
      obligations.some(
        (item) =>
          item.id ===
          "capability-reachability:developer-tool:skip" &&
          item.source === "detection-gap",
      ),
    ).toBe(true);
  });
});
