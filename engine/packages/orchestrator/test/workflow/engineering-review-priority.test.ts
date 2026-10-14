import { describe, expect, it } from "vitest";
import {
  buildEngineeringReviewPriority,
} from "../../src/workflow/engineering-review-priority.js";

const emptyRuntime = {
  "confirmed-defect": 0,
  "design-review": 0,
  "designed-behavior": 0,
  "engine-constraint": 0,
  "compatibility-difference": 0,
  "insufficient-evidence": 0,
  "ambiguous-intent": 0,
  "runtime-proof-required": 0,
} as const;

describe("engineering review priority", () => {
  it("puts stale blocking proof above defects and diagnostics", () => {
    const priority = buildEngineeringReviewPriority({
      runtimeClassifications: {
        ...emptyRuntime,
        "confirmed-defect": 1,
        "design-review": 2,
      },
      diagnostics: [{
        id: "diag:1",
        code: "CROSS_SCOPE_STATE_RISK",
        severity: "critical",
        message: "critical",
      }],
      evidenceRecovery: {
        required: false,
        actions: [],
        blocksCurrentStateClaims: false,
        blocksTemporalClaims: false,
        blocksFullRepairAuthorization: false,
      },
      invalidation: {
        items: [{
          id: "validation:run:1:0",
          source: "validation",
          category: "validation-artifact-changed",
          summary: "Artifact changed.",
          reason: "artifact fingerprint changed since this validation run",
          nextAction: "rerun-validation",
          blocking: true,
          validationRunId: "run:1",
        }],
        invalidatedDecisionCount: 0,
        supersededDecisionCount: 0,
        staleValidationRunCount: 1,
        blockingCount: 1,
      },
      repairCandidates: [],
    });

    expect(priority.items.map((item) => item.lane)).toEqual([
      "blocking-proof",
      "confirmed-defect",
      "critical-diagnostic",
      "design-review",
    ]);
    expect(priority.hasBlockingProofGap).toBe(true);
  });

  it("does not treat critical diagnostics as confirmed defects", () => {
    const priority = buildEngineeringReviewPriority({
      runtimeClassifications: emptyRuntime,
      diagnostics: [{
        id: "diag:1",
        code: "CROSS_SCOPE_STATE_RISK",
        severity: "critical",
        message: "critical",
      }],
      evidenceRecovery: {
        required: false,
        actions: [],
        blocksCurrentStateClaims: false,
        blocksTemporalClaims: false,
        blocksFullRepairAuthorization: false,
      },
      invalidation: {
        items: [],
        invalidatedDecisionCount: 0,
        supersededDecisionCount: 0,
        staleValidationRunCount: 0,
        blockingCount: 0,
      },
      repairCandidates: [],
    });

    expect(priority.hasCriticalDiagnostic).toBe(true);
    expect(priority.hasConfirmedDefect).toBe(false);
    expect(priority.items.map((item) => item.kind)).toEqual([
      "critical-diagnostic",
    ]);
  });

  it("orders evidence recovery before probable defects and planned repairs", () => {
    const priority = buildEngineeringReviewPriority({
      runtimeClassifications: {
        ...emptyRuntime,
        "design-review": 1,
        "runtime-proof-required": 1,
      },
      diagnostics: [],
      evidenceRecovery: {
        required: true,
        actions: [{
          id: "recover:1",
          channel: "runtime-probe",
          kind: "rerun-runtime-probe-bundle",
          priority: "high",
          requiredContext: "LIVE_MINECRAFT",
          blocks: ["full-repair-authorization"],
          reason: "missing proof",
        }],
        blocksCurrentStateClaims: false,
        blocksTemporalClaims: true,
        blocksFullRepairAuthorization: true,
      },
      invalidation: {
        items: [],
        invalidatedDecisionCount: 0,
        supersededDecisionCount: 0,
        staleValidationRunCount: 0,
        blockingCount: 0,
      },
      repairCandidates: [{
        kind: "linear-topology-outlier",
        diagnosticCode: "TOPOLOGY_TRANSLATION_OUTLIER",
        sourcePath: "functions/test.mcfunction",
        status: "proposal",
      }],
    });

    expect(priority.items.map((item) => item.kind)).toEqual([
      "evidence-recovery",
      "runtime-proof-required",
      "design-review",
      "proposed-repair",
    ]);
  });
});
