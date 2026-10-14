import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  EconomyBehaviorContractAnalysis,
} from "./economy-contract-analysis.js";

export function economyContractDiagnostics(
  analysis: EconomyBehaviorContractAnalysis,
): DiagnosticFinding[] {
  if (!analysis.configured) return [];

  const conflicts =
    analysis.deathRewardOverlapContractConflicts +
    analysis.pickupCurrencyContractMismatch;

  const coverageGaps =
    analysis.deathRewardOverlapUnresolved +
    analysis.pickupCurrencyConsumeCoverageGaps +
    analysis.idempotencyCoverageGaps +
    analysis.staleDropCleanupCoverageGaps +
    analysis.inventoryFullContractGaps +
    analysis.pickupScopeValidationUnproven +
    analysis.terminalRewardResultCommitUnproven;

  const findings: DiagnosticFinding[] = [];

  if (conflicts > 0) {
    findings.push(
      createDiagnostic({
        code: "ECONOMY_POLICY_CONFLICT",
        severity: "medium",
        message:
          "Authored economy behavior contract conflicts with one or more correlated reward/currency source paths.",
        data: {
          contractId: analysis.contractId,
          deathRewardOverlapContractConflicts:
            analysis.deathRewardOverlapContractConflicts,
          pickupCurrencyContractMismatch:
            analysis.pickupCurrencyContractMismatch,
        },
      }),
    );
  }

  if (coverageGaps > 0) {
    findings.push(
      createDiagnostic({
        code: "ECONOMY_POLICY_COVERAGE_GAP",
        severity: "minor",
        message:
          "Economy policy obligations remain unproven or only partially covered by current static/runtime evidence.",
        data: {
          contractId: analysis.contractId,
          deathRewardOverlapUnresolved:
            analysis.deathRewardOverlapUnresolved,
          pickupCurrencyConsumeCoverageGaps:
            analysis.pickupCurrencyConsumeCoverageGaps,
          idempotencyCoverageGaps:
            analysis.idempotencyCoverageGaps,
          staleDropCleanupCoverageGaps:
            analysis.staleDropCleanupCoverageGaps,
          inventoryFullContractGaps:
            analysis.inventoryFullContractGaps,
          pickupScopeValidationUnproven:
            analysis.pickupScopeValidationUnproven,
          terminalRewardResultCommitUnproven:
            analysis.terminalRewardResultCommitUnproven,
        },
      }),
    );
  }

  return findings;
}
