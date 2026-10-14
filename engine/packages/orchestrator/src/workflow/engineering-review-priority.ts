import type { IntentDiagnosticDisposition } from "../../../diagnostic-reasoning/src/index.js";
import type { DiagnosticFinding } from "../../../diagnostics/src/index.js";
import type { EvidenceRecoveryPlan } from "../diagnosis/evidence-recovery.js";
import type { EngineeringReviewInvalidationProjection } from "./engineering-review-invalidation.js";
import type { InspectionRepairCandidate } from "../repair/repair-planning.js";

export type EngineeringReviewPriorityLane =
  | "blocking-proof"
  | "confirmed-defect"
  | "critical-diagnostic"
  | "evidence-required"
  | "design-review"
  | "repair-follow-up";

export type EngineeringReviewPriorityAction =
  | "restore-current-proof"
  | "review-confirmed-defect"
  | "review-critical-diagnostic"
  | "collect-required-evidence"
  | "clarify-intent"
  | "investigate-design-review"
  | "review-proposed-repair";

export interface EngineeringReviewPriorityItem {
  lane: EngineeringReviewPriorityLane;
  kind:
    | "blocking-stale-proof"
    | "confirmed-defect"
    | "critical-diagnostic"
    | "evidence-recovery"
    | "runtime-proof-required"
    | "ambiguous-intent"
    | "insufficient-evidence"
    | "design-review"
    | "proposed-repair";
  count: number;
  action: EngineeringReviewPriorityAction;
  reason: string;
}

export interface EngineeringReviewPriorityInput {
  runtimeClassifications: Record<IntentDiagnosticDisposition, number>;
  diagnostics: readonly DiagnosticFinding[];
  evidenceRecovery: EvidenceRecoveryPlan;
  invalidation: EngineeringReviewInvalidationProjection;
  repairCandidates: readonly InspectionRepairCandidate[];
}

export interface EngineeringReviewPriorityProjection {
  order: readonly EngineeringReviewPriorityLane[];
  items: readonly EngineeringReviewPriorityItem[];
  hasBlockingProofGap: boolean;
  hasConfirmedDefect: boolean;
  hasCriticalDiagnostic: boolean;
}

export const ENGINEERING_REVIEW_PRIORITY_ORDER:
  readonly EngineeringReviewPriorityLane[] = [
    "blocking-proof",
    "confirmed-defect",
    "critical-diagnostic",
    "evidence-required",
    "design-review",
    "repair-follow-up",
  ];

export function buildEngineeringReviewPriority(
  input: EngineeringReviewPriorityInput,
): EngineeringReviewPriorityProjection {
  const items: EngineeringReviewPriorityItem[] = [];
  const push = (
    lane: EngineeringReviewPriorityLane,
    kind: EngineeringReviewPriorityItem["kind"],
    count: number,
    action: EngineeringReviewPriorityAction,
    reason: string,
  ) => {
    if (count <= 0) return;
    items.push({ lane, kind, count, action, reason });
  };

  push(
    "blocking-proof",
    "blocking-stale-proof",
    input.invalidation.blockingCount,
    "restore-current-proof",
    "One or more prior decisions or validation runs are no longer current and block reliance on the old proof.",
  );

  push(
    "confirmed-defect",
    "confirmed-defect",
    input.runtimeClassifications["confirmed-defect"],
    "review-confirmed-defect",
    "Evidence currently satisfies the intent-aware confirmed-defect gate.",
  );

  push(
    "critical-diagnostic",
    "critical-diagnostic",
    input.diagnostics.filter((finding) =>
      finding.severity === "critical"
    ).length,
    "review-critical-diagnostic",
    "Critical diagnostics require prompt review but remain distinct from confirmed defects.",
  );

  push(
    "evidence-required",
    "evidence-recovery",
    input.evidenceRecovery.actions.length,
    "collect-required-evidence",
    "Runtime evidence integrity requires explicit recovery actions.",
  );

  push(
    "evidence-required",
    "runtime-proof-required",
    input.runtimeClassifications["runtime-proof-required"],
    "collect-required-evidence",
    "Static evidence cannot settle these observations; runtime proof is required.",
  );

  push(
    "evidence-required",
    "ambiguous-intent",
    input.runtimeClassifications["ambiguous-intent"],
    "clarify-intent",
    "Intent ambiguity blocks stronger defect classification.",
  );

  push(
    "evidence-required",
    "insufficient-evidence",
    input.runtimeClassifications["insufficient-evidence"],
    "collect-required-evidence",
    "Current evidence is insufficient to classify these observations.",
  );

  push(
    "design-review",
    "design-review",
    input.runtimeClassifications["design-review"],
    "investigate-design-review",
    "Design-review observations remain unconfirmed pending authoritative intent or stronger evidence."
  );

  push(
    "repair-follow-up",
    "proposed-repair",
    input.repairCandidates.filter((candidate) =>
      candidate.status === "proposal"
    ).length,
    "review-proposed-repair",
    "Proposed repairs still require explicit authorization, execution, and validation before verified status."
  );

  const laneOrder = new Map(
    ENGINEERING_REVIEW_PRIORITY_ORDER.map((lane, index) => [
      lane,
      index,
    ]),
  );

  items.sort((left, right) =>
    (laneOrder.get(left.lane) ?? Number.MAX_SAFE_INTEGER) -
      (laneOrder.get(right.lane) ?? Number.MAX_SAFE_INTEGER) ||
    left.kind.localeCompare(right.kind)
  );

  return {
    order: ENGINEERING_REVIEW_PRIORITY_ORDER,
    items,
    hasBlockingProofGap: input.invalidation.blockingCount > 0,
    hasConfirmedDefect:
      input.runtimeClassifications["confirmed-defect"] > 0,
    hasCriticalDiagnostic:
      input.diagnostics.some((finding) =>
        finding.severity === "critical"
      ),
  };
}
