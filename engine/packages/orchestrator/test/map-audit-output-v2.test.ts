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

    const projectionInput: Parameters<typeof projectMapAuditOutputV2>[0] = {
      inspection,
      identity: {
        artifactId: "artifact:1",
        artifactFingerprint: "a".repeat(64),
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
    };
    const report = projectMapAuditOutputV2(projectionInput);

    expect(report.schemaVersion).toBe(2);
    expect(report.artifactFingerprint).toBe("a".repeat(64));
    expect(report.auditTarget).toEqual({
      edition: "unknown",
      source: "selected-audit-runtime-target-not-live-observation",
    });
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

    // Several modes can have genuinely different source-backed objectives
    // and terminal rules. Their names must survive the summary, while
    // unresolved mode/player scope must not become an authored global claim.
    const multiModeInspection: any = {
      ...inspection,
      gameplayIntent: {
        model: {
          ...inspection.gameplayIntent.model,
          evidence: [
            ...inspection.gameplayIntent.model.evidence,
            { id: "e:second", origin: "game-design-spec",
              scope: "selected-artifact", locator: "other-mode.json",
              summary: "Second mode objective." },
            { id: "e:win-1", origin: "source-code",
              scope: "selected-artifact", locator: "modes/defense.js:1",
              summary: "Defense completion event." },
            { id: "e:win-2", origin: "source-code",
              scope: "selected-artifact", locator: "modes/rescue.js:1",
              summary: "Rescue completion event." },
            { id: "e:lose-1", origin: "source-code",
              scope: "selected-artifact", locator: "modes/defense.js:2",
              summary: "Defense failure event." },
            { id: "e:lose-2", origin: "source-code",
              scope: "selected-artifact", locator: "modes/rescue.js:2",
              summary: "Rescue failure event." },
            { id: "e:external", origin: "historical-diff",
              scope: "external-reference", locator: "old-map.json",
              summary: "Not part of selected map." },
          ],
          nodes: [
            ...inspection.gameplayIntent.model.nodes,
            { id: "objective:2", kind: "objective", label: "Rescue villagers",
              status: "authored", evidenceIds: ["e:second"] },
            { id: "objective:historical", kind: "objective",
              label: "Historical objective", status: "authored",
              evidenceIds: ["e:external"] },
            ...[
              ["defense-win", "Flag held", "e:win-1"],
              ["rescue-win", "Villagers rescued", "e:win-2"],
              ["defense-lose", "Flag destroyed", "e:lose-1"],
              ["rescue-lose", "Rescue timed out", "e:lose-2"],
            ].map(([id, label, evidenceId]) => ({
              id: "outcome:" + id, kind: "outcome", label,
              status: "authored", evidenceIds: [evidenceId],
            })),
          ],
          edges: [
            { id: "edge:win-1", kind: "wins-by", status: "authored",
              from: "objective:1", to: "outcome:defense-win",
              description: "Hold the flag to win",
              evidenceIds: ["e:objective", "e:win-1"] },
            { id: "edge:win-2", kind: "wins-by", status: "authored",
              from: "objective:2", to: "outcome:rescue-win",
              description: "Rescue villagers to win",
              evidenceIds: ["e:second", "e:win-2"] },
            { id: "edge:lose-1", kind: "loses-by", status: "authored",
              from: "objective:1", to: "outcome:defense-lose",
              description: "Flag destroyed means defeat",
              evidenceIds: ["e:objective", "e:lose-1"] },
            { id: "edge:lose-2", kind: "loses-by", status: "authored",
              from: "objective:2", to: "outcome:rescue-lose",
              description: "Rescue timeout means defeat",
              evidenceIds: ["e:second", "e:lose-2"] },
          ],
        },
      },
    };
    const multiModeReport = projectMapAuditOutputV2({
      ...projectionInput,
      inspection: multiModeInspection,
    });
    expect(multiModeReport.gameDesign.objective).toContain("Complete objective");
    expect(multiModeReport.gameDesign.objective).toContain("Rescue villagers");
    expect(multiModeReport.gameDesign.objective).not.toContain("Historical objective");
    expect(multiModeReport.gameDesign.objectiveGrounding).toBe("unresolved");
    expect(multiModeReport.gameDesign.winCondition).toContain("Hold the flag to win");
    expect(multiModeReport.gameDesign.winCondition).toContain("Rescue villagers to win");
    expect(multiModeReport.gameDesign.loseCondition).toContain("Flag destroyed means defeat");
    expect(multiModeReport.gameDesign.loseCondition).toContain("Rescue timeout means defeat");
    expect(multiModeReport.gameDesign.winConditionGrounding).toBe("unresolved");
    expect(multiModeReport.gameDesign.loseConditionGrounding).toBe("unresolved");
    expect(multiModeReport.bugs.map(item => item.status))
      .toEqual(["PROVEN", "NEED_VALIDATION"]);
  });
});
