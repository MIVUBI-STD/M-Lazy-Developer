import type {
  MandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";

export type SelectedMapAuditStage =
  | "TARGET"
  | "DISCOVERY"
  | "UNDERSTAND"
  | "FORMALIZE"
  | "EVALUATE"
  | "PROVE"
  | "REPORT";

export interface SelectedMapAuditAdmissionInput {
  readonly mandatoryAuditProcedure:
    MandatoryAuditProcedureReceipt | undefined;
}

export interface SelectedMapAuditAdmissionIssue {
  readonly stage: SelectedMapAuditStage;
  readonly code:
    | "MISSING_PROCEDURE"
    | "PROCEDURE_BLOCKED";
  readonly message: string;
}

export interface SelectedMapAuditAdmission {
  readonly policy: "selected-map-audit-ordered-admission";
  readonly status: "READY" | "BLOCKED";
  readonly firstBlockingStage?: SelectedMapAuditStage;
  readonly issues: readonly SelectedMapAuditAdmissionIssue[];
}

export const SELECTED_MAP_AUDIT_STAGE_ORDER:
  readonly SelectedMapAuditStage[] = [
    "TARGET",
    "DISCOVERY",
    "UNDERSTAND",
    "FORMALIZE",
    "EVALUATE",
    "PROVE",
    "REPORT",
  ];

export function selectedMapAuditStageForCheckpoint(
  checkpointId: string,
): SelectedMapAuditStage {
  if (checkpointId === "A1") return "TARGET";
  if (checkpointId === "A2") return "DISCOVERY";
  if (checkpointId.startsWith("A")) return "UNDERSTAND";
  if (checkpointId.startsWith("B")) return "FORMALIZE";
  if (checkpointId.startsWith("C")) return "EVALUATE";
  if (checkpointId.startsWith("D")) return "PROVE";
  return "REPORT";
}

/**
 * Authorizes scoped evidence projections, NOT audit closure or publication.
 * A verified target and structurally accounted Discovery can expose
 * independently supported findings despite unresolved semantic obligations.
 * Admission remains blocked until every publication checkpoint closes.
 */
export function canProjectIndependentAuditEvidence(
  procedure: MandatoryAuditProcedureReceipt | undefined,
): boolean {
  if (procedure === undefined ||
      procedure.blockingCheckpointIds.includes("A1")) return false;
  const target = procedure.checkpoints.filter((item) => item.id === "A1");
  const discovery = procedure.checkpoints.filter((item) => item.id === "A2");
  return target.length === 1 &&
    target[0]?.status === "CLOSED" &&
    discovery.length === 1 &&
    (discovery[0]?.status === "CLOSED" ||
      discovery[0]?.status === "PARTIAL");
}

/**
 * Authorizes candidate/proposed issue-set grouping after stage admission.
 * Independently supported findings may be displayed earlier by the selected
 * audit pipeline using canProjectIndependentAuditEvidence() and the existing
 * per-finding PROVE projection gates. This check never controls partial
 * report visibility or overrides whole-audit publication readiness.
 */
export function canAdmitAuditIssueLanes(
  admission: SelectedMapAuditAdmission,
  procedure: MandatoryAuditProcedureReceipt | undefined,
): boolean {
  if (!canProjectIndependentAuditEvidence(procedure)) return false;
  return admission.status === "READY" ||
    admission.firstBlockingStage === "PROVE" ||
    admission.firstBlockingStage === "REPORT";
}

export function assessSelectedMapAuditAdmission(
  input: SelectedMapAuditAdmissionInput,
): SelectedMapAuditAdmission {
  const issues: SelectedMapAuditAdmissionIssue[] = [];
  const procedure = input.mandatoryAuditProcedure;

  if (procedure === undefined) {
    issues.push({
      stage: "TARGET",
      code: "MISSING_PROCEDURE",
      message:
        "Mandatory Audit Procedure receipt is missing; ordered audit admission cannot be established.",
    });
  } else {
    for (const checkpointId of procedure.blockingCheckpointIds) {
      const checkpoint = procedure.checkpoints.find(
        (item) => item.id === checkpointId,
      );
      issues.push({
        stage:
          checkpoint?.block ??
          selectedMapAuditStageForCheckpoint(checkpointId),
        code: "PROCEDURE_BLOCKED",
        message:
          "Mandatory Audit Procedure checkpoint " +
          checkpointId +
          " blocks continuation.",
      });
    }

    // Guard the derived blocking index against stale or inconsistent
    // checkpoint projections. Publication authority belongs to the actual
    // checkpoint, not merely to the denormalized list of its IDs.
    for (const checkpoint of procedure.checkpoints) {
      if (
        !checkpoint.blocksPublication ||
        procedure.blockingCheckpointIds.includes(checkpoint.id)
      ) continue;
      issues.push({
        stage: checkpoint.block,
        code: "PROCEDURE_BLOCKED",
        message:
          "Mandatory Audit Procedure checkpoint " +
          checkpoint.id +
          " blocks continuation but is missing from the blocking index.",
      });
    }
  }

  const firstBlockingStage = SELECTED_MAP_AUDIT_STAGE_ORDER.find((stage) =>
    issues.some((issue) => issue.stage === stage)
  );

  return {
    policy: "selected-map-audit-ordered-admission",
    status: issues.length === 0 ? "READY" : "BLOCKED",
    ...(firstBlockingStage === undefined
      ? {}
      : { firstBlockingStage }),
    issues,
  };
}
