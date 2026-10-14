import {
  createDiagnostic,
  type DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  InventoryLifecycleAnalysis,
} from "./inventory-lifecycle-analysis.js";
import type {
  InventoryContractAnalysis,
} from "./inventory-contract-analysis.js";
import type {
  InventoryRestoreOwnershipAnalysis,
} from "./inventory-restore-ownership-analysis.js";

export function inventoryLifecycleDiagnostics(
  lifecycle: InventoryLifecycleAnalysis,
  policy: InventoryContractAnalysis,
  restore: InventoryRestoreOwnershipAnalysis,
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  if (
    policy.configured &&
    policy.deniedDrops > 0
  ) {
    findings.push(
      createDiagnostic({
        code: "INVENTORY_POLICY_CONFLICT",
        severity: "medium",
        message:
          "One or more statically resolved item-drop paths contradict authored inventory item policy.",
        data: {
          policyId: policy.contractId ?? "unconfigured",
          deniedDrops: policy.deniedDrops,
        },
      }),
    );
  }

  const coverageGap =
    lifecycle.partialResets +
    lifecycle.copyMutationRisks +
    lifecycle.unresolvedEquipmentSlotEvidence +
    restore.multipleRestoreOwners +
    policy.uncoveredDrops +
    policy.unknownDrops;

  if (coverageGap > 0) {
    findings.push(
      createDiagnostic({
        code:
          "INVENTORY_LIFECYCLE_COVERAGE_GAP",
        severity:
          lifecycle.copyMutationRisks > 0 ||
          restore.multipleRestoreOwners > 0
            ? "medium"
            : "minor",
        message:
          "Inventory/equipment lifecycle ownership or policy coverage remains incomplete; static evidence requires review before reset, restore, or drop behavior is treated as reliable.",
        data: {
          partialResets:
            lifecycle.partialResets,
          copyMutationRisks:
            lifecycle.copyMutationRisks,
          unresolvedEquipmentSlotEvidence:
            lifecycle
              .unresolvedEquipmentSlotEvidence,
          multipleRestoreOwners:
            restore.multipleRestoreOwners,
          uncoveredDrops:
            policy.uncoveredDrops,
          unknownDrops:
            policy.unknownDrops,
        },
      }),
    );
  }

  return findings;
}
