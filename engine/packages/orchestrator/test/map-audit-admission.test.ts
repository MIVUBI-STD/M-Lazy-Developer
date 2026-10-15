import { describe, expect, it } from "vitest";
import {
  assessSelectedMapAuditAdmission,
  canProjectIndependentAuditEvidence,
  canAdmitAuditIssueLanes,
} from "../src/map-audit-admission.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "../src/inspection/mandatory-audit-procedure.js";

function procedure(
  blockingCheckpointIds: readonly string[],
): MandatoryAuditProcedureReceipt {
  const checkpoints = [
    {
      id: "A1",
      block: "TARGET" as const,
      label: "Selected Artifact Integrity",
    },
    {
      id: "A2",
      block: "DISCOVERY" as const,
      label: "Gameplay Surface Discovery",
    },
    {
      id: "A7",
      block: "UNDERSTAND" as const,
      label: "Gameplay Model Closure",
    },
    {
      id: "C1",
      block: "EVALUATE" as const,
      label: "Cross-system gameplay checks",
    },
    {
      id: "D1",
      block: "PROVE" as const,
      label: "Causal contradiction proof",
    },
  ].map((item) => ({
    ...item,
    status:
      blockingCheckpointIds.includes(item.id)
        ? "OPEN" as const
        : "CLOSED" as const,
    reasonCode:
      blockingCheckpointIds.includes(item.id)
        ? "PROCEDURE_BLOCKED" as const
        : "COMPLETE" as const,
    blocksPublication:
      blockingCheckpointIds.includes(item.id),
    obligations: [],
    evidenceIds: [],
    outputIds: [],
    reason: item.label,
  }));

  return {
    schemaVersion: 1,
    policy: "mandatory-gameplay-audit-procedure",
    checkpoints,
    blocks: [],
    status:
      blockingCheckpointIds.length > 0
        ? "OPEN"
        : "CLOSED",
    stateRegistry: [],
    ownershipRegistry: [],
    progressionContracts: [],
    blockingCheckpointIds,
    reasons: [],
  };
}

describe("selected-map audit admission", () => {
  it("blocks when the mandatory procedure is missing", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: undefined,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.firstBlockingStage).toBe("TARGET");
    expect(result.issues[0]?.code).toBe(
      "MISSING_PROCEDURE",
    );
  });

  it("rejects absent or invalid foundational receipts despite an empty blocking index", () => {
    const completed = procedure([]);
    const without = (checkpointId: string): MandatoryAuditProcedureReceipt => ({
      ...completed,
      checkpoints: completed.checkpoints.filter((item) => item.id !== checkpointId),
    });
    const empty: MandatoryAuditProcedureReceipt = {
      ...completed,
      checkpoints: [],
      blocks: [],
    };

    for (const [name, candidate, stage] of [
      ["empty", empty, "TARGET"],
      ["missing target", without("A1"), "TARGET"],
      ["missing discovery", without("A2"), "DISCOVERY"],
      ["duplicated target", {
        ...completed,
        checkpoints: [completed.checkpoints[0]!, ...completed.checkpoints],
      }, "TARGET"],
      ["wrong discovery stage", {
        ...completed,
        checkpoints: completed.checkpoints.map((item) =>
          item.id === "A2" ? { ...item, block: "UNDERSTAND" as const } : item),
      }, "DISCOVERY"],
      ["target incorrectly open but not indexed", {
        ...completed,
        checkpoints: completed.checkpoints.map((item) =>
          item.id === "A1" ? { ...item, status: "OPEN" as const } : item),
      }, "TARGET"],
    ] as const) {
      const result = assessSelectedMapAuditAdmission({
        mandatoryAuditProcedure: candidate,
      });
      expect(result.status, name).toBe("BLOCKED");
      expect(result.firstBlockingStage, name).toBe(stage);
    }
    expect(assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: completed,
    }).status).toBe("READY");
  });

  it("uses checkpoint-owned stage as the single blocking truth", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: procedure(["A2"]),
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.firstBlockingStage).toBe("DISCOVERY");
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "PROCEDURE_BLOCKED",
        stage: "DISCOVERY",
      }),
    ]);
  });

  it("admits review only when no mandatory checkpoint blocks", () => {
    const result = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: procedure([]),
    });

    expect(result.status).toBe("READY");
    expect(result.firstBlockingStage).toBeUndefined();
    expect(result.issues).toEqual([]);
  });
  it("allows evidence projection with PARTIAL Discovery but still blocks review", () => {
    const base = procedure(["A2"]);
    const partial: MandatoryAuditProcedureReceipt = {
      ...base,
      checkpoints: base.checkpoints.map((item) => item.id === "A2"
        ? { ...item, status: "PARTIAL", reasonCode: "DISCOVERY_INCOMPLETE" }
        : item),
      status: "PARTIAL",
    };

    expect(canProjectIndependentAuditEvidence(partial)).toBe(true);
    const admission = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: partial,
    });
    expect(admission.status).toBe("BLOCKED");
    expect(admission.firstBlockingStage).toBe("DISCOVERY");
  });

  it("keeps early evidence but withholds issues until causal proof stage", () => {
    const beforeUnderstanding = procedure(["A7"]);
    const earlyAdmission = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: beforeUnderstanding,
    });
    expect(canProjectIndependentAuditEvidence(beforeUnderstanding)).toBe(true);
    expect(earlyAdmission.firstBlockingStage).toBe("UNDERSTAND");
    expect(canAdmitAuditIssueLanes(earlyAdmission, beforeUnderstanding)).toBe(false);

    const beforeStress = procedure(["C1"]);
    const stressAdmission = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: beforeStress,
    });
    expect(stressAdmission.firstBlockingStage).toBe("EVALUATE");
    expect(canAdmitAuditIssueLanes(stressAdmission, beforeStress)).toBe(false);

    const proving = procedure(["D1"]);
    const proofAdmission = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: proving,
    });
    expect(proofAdmission.firstBlockingStage).toBe("PROVE");
    expect(canAdmitAuditIssueLanes(proofAdmission, proving)).toBe(true);

    const completed = procedure([]);
    const completedAdmission = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: completed,
    });
    expect(canAdmitAuditIssueLanes(completedAdmission, completed)).toBe(true);
    expect(canAdmitAuditIssueLanes(completedAdmission, undefined)).toBe(false);
    expect(canAdmitAuditIssueLanes({
      ...completedAdmission,
      status: "BLOCKED",
    }, completed)).toBe(false);
  });

  it("fails closed when a blocking checkpoint is missing from the derived blocking index", () => {
    const base = procedure([]);
    const C9 = {
      ...base.checkpoints[3]!,
      id: "C9",
      block: "EVALUATE" as const,
      label: "Cross-System Scenario Coverage",
      status: "PARTIAL" as const,
      reasonCode: "OBLIGATION_INCOMPLETE" as const,
      blocksPublication: true,
    };
    const inconsistent: MandatoryAuditProcedureReceipt = {
      ...base,
      checkpoints: [...base.checkpoints, C9],
      blockingCheckpointIds: [],
      status: "PARTIAL",
    };
    const rejected = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: inconsistent,
    });
    expect(rejected.status).toBe("BLOCKED");
    expect(rejected.firstBlockingStage).toBe("EVALUATE");
    expect(rejected.issues).toEqual([
      expect.objectContaining({
        stage: "EVALUATE",
        code: "PROCEDURE_BLOCKED",
      }),
    ]);

    // Runtime-only residue may legitimately be visible without blocking
    // report publication; do not conflate PARTIAL with blocksPublication.
    const runtimeOnly: MandatoryAuditProcedureReceipt = {
      ...inconsistent,
      checkpoints: inconsistent.checkpoints.map(item => item.id === "C9"
        ? { ...item, reasonCode: "RUNTIME_PROOF_REQUIRED", blocksPublication: false }
        : item),
    };
    const allowed = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: runtimeOnly,
    });
    expect(allowed.status).toBe("READY");
    expect(allowed.issues).toEqual([]);
  });

  it("keeps EVALUATE publication blocked after source-only arena formalization closes", () => {
    const base = procedure([]);
    const B4 = {
      ...base.checkpoints[2]!,
      id: "B4",
      block: "FORMALIZE" as const,
      label: "Multi-Arena Contract",
      status: "CLOSED" as const,
      blocksPublication: false,
    };
    const C9 = {
      ...base.checkpoints[3]!,
      id: "C9",
      block: "EVALUATE" as const,
      label: "Cross-System Scenario Coverage",
      status: "OPEN" as const,
      blocksPublication: true,
      reasonCode: "OBLIGATION_INCOMPLETE" as const,
    };
    const receipt: MandatoryAuditProcedureReceipt = {
      ...base,
      checkpoints: [...base.checkpoints, B4, C9],
      blockingCheckpointIds: ["C9"],
      status: "OPEN",
    };
    const admission = assessSelectedMapAuditAdmission({
      mandatoryAuditProcedure: receipt,
    });
    expect(admission.status).toBe("BLOCKED");
    expect(admission.firstBlockingStage).toBe("EVALUATE");
    expect(canProjectIndependentAuditEvidence(receipt)).toBe(true);
    expect(canAdmitAuditIssueLanes(admission, receipt)).toBe(false);
    expect(admission.issues).toEqual([
      expect.objectContaining({
        stage: "EVALUATE",
        code: "PROCEDURE_BLOCKED",
      }),
    ]);
  });

  it("never projects evidence without verified TARGET or accounted Discovery", () => {
    expect(canProjectIndependentAuditEvidence(undefined)).toBe(false);
    expect(canProjectIndependentAuditEvidence(procedure(["A1"]))).toBe(false);
    expect(canProjectIndependentAuditEvidence(procedure(["A2"]))).toBe(false);
    expect(canProjectIndependentAuditEvidence(procedure([]))).toBe(true);
    const base = procedure(["A1", "A2"]);
    const partialWithInvalidTarget: MandatoryAuditProcedureReceipt = {
      ...base,
      checkpoints: base.checkpoints.map((item) => item.id === "A2"
        ? { ...item, status: "PARTIAL" }
        : item),
    };
    expect(canProjectIndependentAuditEvidence(partialWithInvalidTarget)).toBe(false);
  });
});
