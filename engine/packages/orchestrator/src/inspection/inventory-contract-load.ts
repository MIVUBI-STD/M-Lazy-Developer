import { readFile } from "node:fs/promises";
import {
  validateInventoryItemBehaviorContract,
  type InventoryItemBehaviorContract,
  type InventoryItemPolicyRule,
  type InventoryLifecycleTransition,
  type InventoryOwnershipScope,
} from "../../../behavior-model/src/index.js";

const SCOPES = new Set<InventoryOwnershipScope>([
  "player-durable",
  "session",
  "arena",
  "round",
  "life",
]);

const TRANSITIONS = new Set<InventoryLifecycleTransition>([
  "kit-switch",
  "round-end",
  "arena-end",
  "death",
  "respawn",
  "disconnect",
  "reconnect",
  "lobby-return",
]);

function nonEmptyString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      "Inventory Item Behavior Contract " +
        field +
        " must be a non-empty string.",
    );
  }
  return value;
}

function transitions(
  value: unknown,
  field: string,
  ruleId: string,
  required: boolean,
): InventoryLifecycleTransition[] | undefined {
  if (value === undefined && !required) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(
      "Inventory Item Behavior Contract rule " +
        ruleId +
        " " +
        field +
        " must be an array.",
    );
  }

  const parsed: InventoryLifecycleTransition[] = [];
  for (const item of value) {
    if (
      typeof item !== "string" ||
      !TRANSITIONS.has(
        item as InventoryLifecycleTransition,
      )
    ) {
      throw new Error(
        "Inventory Item Behavior Contract rule " +
          ruleId +
          " contains invalid " +
          field +
          " transition.",
      );
    }
    parsed.push(
      item as InventoryLifecycleTransition,
    );
  }
  return parsed;
}

function parseRule(
  value: unknown,
  index: number,
): InventoryItemPolicyRule {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Inventory Item Behavior Contract rule at index " +
        index +
        " must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;
  const id = nonEmptyString(
    item.id,
    "rule id",
  );
  const scope = item.ownershipScope;
  if (
    typeof scope !== "string" ||
    !SCOPES.has(
      scope as InventoryOwnershipScope,
    )
  ) {
    throw new Error(
      "Inventory Item Behavior Contract rule " +
        id +
        " has an invalid ownershipScope.",
    );
  }
  if (typeof item.dropAllowed !== "boolean") {
    throw new Error(
      "Inventory Item Behavior Contract rule " +
        id +
        " requires boolean dropAllowed.",
    );
  }

  const resetOn =
    transitions(
      item.resetOn,
      "resetOn",
      id,
      true,
    )!;
  const restoreOn =
    transitions(
      item.restoreOn,
      "restoreOn",
      id,
      false,
    );

  return {
    id,
    itemClass: nonEmptyString(
      item.itemClass,
      "rule itemClass",
    ),
    ownershipScope:
      scope as InventoryOwnershipScope,
    dropAllowed: item.dropAllowed,
    resetOn,
    ...(restoreOn === undefined
      ? {}
      : { restoreOn }),
    ...(typeof item.rationale === "string" &&
    item.rationale.trim().length > 0
      ? { rationale: item.rationale }
      : {}),
  };
}

export function parseInventoryItemBehaviorContract(
  value: unknown,
): InventoryItemBehaviorContract {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Inventory Item Behavior Contract must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;
  if (item.schemaVersion !== 1) {
    throw new Error(
      "Inventory Item Behavior Contract schemaVersion must be 1.",
    );
  }
  if (!Array.isArray(item.rules)) {
    throw new Error(
      "Inventory Item Behavior Contract requires a rules array.",
    );
  }

  const contract: InventoryItemBehaviorContract = {
    schemaVersion: 1,
    id: nonEmptyString(
      item.id,
      "policy id",
    ),
    rules: item.rules.map(parseRule),
  };

  const errors =
    validateInventoryItemBehaviorContract(contract);
  if (errors.length > 0) {
    throw new Error(
      "Invalid inventory item behavior contract: " +
        errors.join(" "),
    );
  }

  return contract;
}

export async function loadInventoryItemBehaviorContractFile(
  path: string,
): Promise<InventoryItemBehaviorContract> {
  const value = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;
  return parseInventoryItemBehaviorContract(value);
}
