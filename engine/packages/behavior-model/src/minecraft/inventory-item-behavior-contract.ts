import type {
  BehaviorClaimProvenance,
} from "../provenance.js";
import {
  projectPolicyProvenance,
} from "../provenance.js";

export type InventoryOwnershipScope =
  | "player-durable"
  | "session"
  | "arena"
  | "round"
  | "life";

export type InventoryLifecycleTransition =
  | "kit-switch"
  | "round-end"
  | "arena-end"
  | "death"
  | "respawn"
  | "disconnect"
  | "reconnect"
  | "lobby-return";

export interface InventoryItemPolicyRule {
  id: string;
  itemClass: string;
  ownershipScope: InventoryOwnershipScope;
  dropAllowed: boolean;
  resetOn: readonly InventoryLifecycleTransition[];
  restoreOn?: readonly InventoryLifecycleTransition[];
  provenance?: BehaviorClaimProvenance;
  rationale?: string;
}

export interface InventoryItemBehaviorContract {
  schemaVersion: 1;
  id: string;
  rules: readonly InventoryItemPolicyRule[];
}

/** @deprecated Compatibility alias. Use InventoryItemBehaviorContract. */
export type InventoryItemPolicy = InventoryItemBehaviorContract;

export interface InventoryItemPolicyQuery {
  itemClass: string;
}

export interface InventoryItemPolicyResolution {
  query: InventoryItemPolicyQuery;
  status: "resolved" | "uncovered" | "conflict";
  rule?: InventoryItemPolicyRule;
  matchedRuleIds: readonly string[];
  reason: string;
}

const provenance = projectPolicyProvenance(
  "behavior-spec:inventory-item-behavior-contract-v1",
  "Item ownership/drop/reset semantics are project-authored policy and must not be inferred from item typeId alone.",
);

export function inventoryItemBehaviorContractProvenance(): BehaviorClaimProvenance {
  return provenance;
}

export function validateInventoryItemBehaviorContract(
  contract: InventoryItemBehaviorContract,
): string[] {
  const errors: string[] = [];

  if (contract.schemaVersion !== 1) {
    errors.push(
      "Inventory Item Behavior Contract schemaVersion must be 1.",
    );
  }
  if (!contract.id.trim()) {
    errors.push(
      "Inventory Item Behavior Contract id must be non-empty.",
    );
  }

  const ids = new Set<string>();
  for (const rule of contract.rules) {
    if (!rule.id.trim()) {
      errors.push(
        "Inventory Item Behavior Contract rule id must be non-empty.",
      );
    }
    if (ids.has(rule.id)) {
      errors.push(
        "Duplicate inventory item policy rule id: " +
          rule.id +
          ".",
      );
    }
    ids.add(rule.id);

    if (!rule.itemClass.trim()) {
      errors.push(
        "Inventory Item Behavior Contract rule " +
          rule.id +
          " requires a non-empty itemClass.",
      );
    }

    const resetDuplicates =
      rule.resetOn.filter(
        (value, index, array) =>
          array.indexOf(value) !== index,
      );
    if (resetDuplicates.length > 0) {
      errors.push(
        "Inventory Item Behavior Contract rule " +
          rule.id +
          " contains duplicate reset transitions.",
      );
    }

    const restore = rule.restoreOn ?? [];
    const restoreDuplicates =
      restore.filter(
        (value, index, array) =>
          array.indexOf(value) !== index,
      );
    if (restoreDuplicates.length > 0) {
      errors.push(
        "Inventory Item Behavior Contract rule " +
          rule.id +
          " contains duplicate restore transitions.",
      );
    }

    if (
      rule.ownershipScope === "player-durable" &&
      rule.resetOn.length > 0
    ) {
      errors.push(
        "Player-durable item policy rule " +
          rule.id +
          " cannot declare automatic reset transitions.",
      );
    }
  }

  return errors;
}

export function resolveInventoryItemBehaviorContract(
  contract: InventoryItemBehaviorContract,
  query: InventoryItemPolicyQuery,
): InventoryItemPolicyResolution {
  const errors =
    validateInventoryItemBehaviorContract(contract);
  if (errors.length > 0) {
    return {
      query,
      status: "conflict",
      matchedRuleIds: [],
      reason:
        "Inventory Item Behavior Contract is invalid: " +
        errors.join(" "),
    };
  }

  const exact = contract.rules.filter(
    (rule) =>
      rule.itemClass === query.itemClass,
  );
  const fallback = contract.rules.filter(
    (rule) => rule.itemClass === "*",
  );
  const selected =
    exact.length > 0 ? exact : fallback;

  if (selected.length === 0) {
    return {
      query,
      status: "uncovered",
      matchedRuleIds: [],
      reason:
        "No authored inventory item policy covers this item class.",
    };
  }

  if (selected.length > 1) {
    return {
      query,
      status: "conflict",
      matchedRuleIds: selected
        .map((rule) => rule.id)
        .sort(),
      reason:
        "Multiple equally-specific inventory item policy rules cover this item class.",
    };
  }

  const resolvedRule = selected[0]!;

  return {
    query,
    status: "resolved",
    rule: resolvedRule,
    matchedRuleIds: [resolvedRule.id],
    reason:
      exact.length > 0
        ? "Resolved from exact item-class contract."
        : "Resolved from fallback item-class contract.",
  };
}


/** @deprecated Use inventoryItemBehaviorContractProvenance. */
export const inventoryItemPolicyProvenance = inventoryItemBehaviorContractProvenance;
/** @deprecated Use validateInventoryItemBehaviorContract. */
export const validateInventoryItemPolicy = validateInventoryItemBehaviorContract;
/** @deprecated Use resolveInventoryItemBehaviorContract. */
export const resolveInventoryItemPolicy = resolveInventoryItemBehaviorContract;
