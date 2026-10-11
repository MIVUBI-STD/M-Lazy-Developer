import { describe, expect, it } from "vitest";
import {
  projectMapAuditOutputV2,
} from "../src/map-audit-output-v2.js";

describe("Map Audit Output V2 projection", () => {
  it("preserves PROVEN and NEED_VALIDATION from the same audit finding lanes", () => {
    const inspection: any = {
      gameplayIntent: {
        model: {
          evidence: [{
            id: "e:objective", origin: "game-design-spec",
            scope: "selected-artifact", locator: "embedded-design.json",
            summary: "Selected artifact explicitly states the objective.",
          }],
          nodes: [{
            id: "objective:1",
            kind: "objective",
            label: "Complete objective",
            status: "authored",
            evidenceIds: ["e:objective"],
          }],
          edges: [],
          invariants: [],
        },
      },
      gameplayWorld: {
        arenas: {
          detected: false,
          isolation: { observations: [] },
        },
        gameplayClosure: {
          status: "CLOSED",
          surfaces: [{
            id: "objective:1",
            label: "Complete objective",
            kind: "objective",
            status: "understood",
            material: true,
            evidenceIds: ["e:objective"],
            boundaries: [],
          }],
          unaccountedSurfaceIds: [],
          blockingSurfaceIds: [],
          unknownSurfaceIds: [],
          stateModelComplete: true,
          boundariesExtracted: true,
          reasons: ["Closed."],
        },
      },
    };
    const proven: any = {
      status: "PROVEN",
      issueType: "BUG",
      failureDomain: "progression-wave-objective",
      contributingDomains: ["progression-wave-objective"],
      gameplayFlow: "PROGRESSION",
      informationMismatch: false,
      playerFacingEvidenceIds: [],
      causalLinkId: "link:proven",
      scenarioId: "scenario:1",
      gameplayStage: "PROGRESSION",
      scenarioLabel: "objective",
      gameplayTrigger: "Complete the objective.",
      gameplayConsequence: "Progression blocks.",
      expectedOutcome: "Progression completes.",
      actualOutcome: "Progression does not complete.",
      affectedScope: "objective:1",
      subjectIds: ["objective:1"],
      componentIds: ["runtime:state"],
      evidenceIds: ["e:objective"],
    };
    const unresolved: any = {
      ...proven,
      status: "NEED_VALIDATION",
      causalLinkId: "link:unresolved",
      validationReason: "Runtime behavior remains unresolved.",
      missingProof: "One exact runtime observation.",
      validationTest: "Run the objective once and observe completion.",
      validationGroupKey: "scenario:1:runtime",
      proofNavigation: {
        recipeId: "proof:progression-dead-end",
        proofGoal: "Resolve progression.",
        provenClaims: [],
        missingClaims: ["Runtime outcome."],
        route: [],
        evidenceSubstitutions: [],
        historicalSearchHints: [],
        historyPressure: 0,
        familyProofCriteria: [],
        proofStopRule: "Stop when decided.",
        runtimeLastResort: true,
      },
    };

    const report = projectMapAuditOutputV2({
      inspection,
      identity: {
        artifactId: "artifact:1",
        artifactFingerprint: "sha",
        levelName: "Example",
        releaseVersion: "1.0.0",
        releaseIdentityStatus: "consistent",
      },
      issueLanes: {
        BUG: [proven, unresolved],
        DESIGN_MISMATCH: [],
      },
      userIntent: {
        schemaVersion: 1,
        policy:
          "user-input-is-search-guidance-not-gameplay-authority",
        fragments: [{
          id: "f1",
          raw: "wave suka stuck",
        }],
        items: [{
          kind: "SYMPTOM_REPORT",
          raw: "wave suka stuck",
          normalized:
            "possible progression stall",
          sourceFragmentIds: ["f1"],
        }],
        unmappedFragmentIds: [],
        priorityDomains: [
          "progression-wave-objective",
        ],
        priorityPlayerFlows: [
          "PROGRESSION",
        ],
        ambiguities: [],
        blockingAmbiguities: [],
      },
      auditObligations: [],
      validationTests: [{
        key: "scenario:1:runtime",
        findingIds: ["link:unresolved"],
        issueTypes: ["BUG"],
        gameplayFlows: ["PROGRESSION"],
        test: "Run the objective once and observe completion.",
        assertions: [{
          findingId: "link:unresolved",
          test: "Run the objective once and observe completion.",
        }],
        missingProof: ["One exact runtime observation."],
      }],
      control: {
        status: "READY_FOR_REVIEW",
        currentStage: "COMPLETE",
        allowedNextAction: "PREPARE_REVIEW",
        continuationOwner: "REVIEW",
        requiresNewAuditRun: false,
        blockingCheckpointIds: [],
        reasons: [],
      },
      reasoningByCausalLinkId: {
        "link:unresolved": {
          reportClassification: "LIKELY BUG",
          diagnosticDisposition: "confirmed-defect",
          proofConfidence: "high",
          evidenceDomainSources: ["static"],
          evidenceChain: ["e:objective"],
          unresolvedPredicates: ["objective-runtime-outcome"],
          recommendedValidationPredicate: "objective-runtime-outcome",
          recommendedReadOnlyProbeId: "objective-state-probe",
        },
      },
      honesty: {
        policy: "no-hidden-material-finding",
        status: "PASS",
        expectedVisibleResidueIds: ["link:unresolved"],
        visibleNeedValidationIds: ["link:unresolved"],
        visibleObligationIds: [],
        expectedProvenIds: ["link:proven"],
        visibleProvenIds: ["link:proven"],
        missingVisibleResidueIds: [],
        missingProvenProjectionIds: [],
        reasons: ["All findings visible."],
      },
    });

    expect(report.schemaVersion).toBe(2);
    expect(report.bugs.map((item) => item.status))
      .toEqual(["PROVEN", "NEED_VALIDATION"]);
    expect(report.bugs[1]?.missingProof)
      .toBe("One exact runtime observation.");
    expect(report.bugs[0]?.reasoning).toBeUndefined();
    expect(report.bugs[1]?.reasoning).toMatchObject({
      reportClassification: "LIKELY BUG",
      diagnosticDisposition: "confirmed-defect",
      proofConfidence: "high",
      unresolvedPredicates: ["objective-runtime-outcome"],
      recommendedReadOnlyProbeId: "objective-state-probe",
    });
    expect(report.unresolved.status)
      .toBe("HAS_UNRESOLVED");
    expect(report.unresolved.needValidationIds)
      .toEqual(["link:unresolved"]);
    expect(report.unresolved.runtimeRequiredIds)
      .toEqual([]);
    expect(report.unresolved.staticProofPendingIds)
      .toEqual(["link:unresolved"]);
    expect(report.control.allowedNextAction)
      .toBe("PREPARE_REVIEW");
    expect(report.coverage.disposition)
      .toBe("accounted");
    expect(report.gameDesign.objectiveGrounding)
      .toBe("authored");
    expect(report.userIntent?.items[0]?.kind)
      .toBe("SYMPTOM_REPORT");
    expect(report.userIntent?.policy)
      .toBe(
        "user-input-is-search-guidance-not-gameplay-authority",
      );
    expect(report.qualityGates.informationIntegrity.status)
      .toBe("CLOSED_CLEAR");
    expect(report.qualityGates.zeroFinding.status)
      .toBe("NOT_APPLICABLE");
    expect(report.qualityGates.vitalGameplay.status)
      .toBe("OPEN");
    expect(
      report.qualityGates.vitalGameplay.domains.find(
        (item) =>
          item.domain === "SCORE_RESULT_INTEGRITY",
      )?.status,
    ).toBe("DETECTION_GAP");
  });
});
