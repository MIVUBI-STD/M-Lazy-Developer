import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  CombatBehaviorContractAnalysis,
} from "./combat-contract-analysis.js";

export function combatContractDiagnostics(
  analysis: CombatBehaviorContractAnalysis,
): DiagnosticFinding[] {
  if (
    !analysis.configured ||
    analysis.reviveContractContradictions === 0
  ) {
    return [];
  }

  return [
    createDiagnostic({
      code:
        "COMBAT_REVIVE_POLICY_VIOLATION",
      severity: "medium",
      message:
        String(
          analysis.reviveContractContradictions,
        ) +
        " observed revive anomaly event(s) contradict the authored combat behavior contract.",
      data: {
        selfRevive:
          analysis
            .selfReviveContradictions,
        multipleRevivers:
          analysis
            .multipleReviverContradictions,
        staleRevive:
          analysis
            .staleReviveContradictions,
        reviveAfterDeath:
          analysis
            .reviveAfterDeathContradictions,
        invalidReviverObservations:
          analysis
            .invalidReviverObservations,
      },
    }),
  ];
}
