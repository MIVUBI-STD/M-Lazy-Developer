import { readFile } from "node:fs/promises";
import { validateSpatialAuthorityBehaviorContract } from "../../../behavior-model/src/index.js";
import type {
  SpatialAuthorityAction,
  SpatialAuthorityActor,
  SpatialAuthorityDecision,
  SpatialAuthorityBehaviorContract,
  SpatialAuthorityRule,
} from "../../../behavior-model/src/index.js";

const ACTORS = new Set<SpatialAuthorityActor>([
  "player",
  "entity",
  "system",
]);

const ACTIONS = new Set<SpatialAuthorityAction>([
  "place-block",
  "break-block",
  "interact-block",
  "use-item",
  "use-container",
  "teleport",
  "spawn-entity",
  "place-structure",
]);

const DECISIONS = new Set<SpatialAuthorityDecision>([
  "allow",
  "deny",
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
      "Spatial authority " + field +
        " must be a non-empty string.",
    );
  }
  return value;
}

function parseRule(
  value: unknown,
  index: number,
): SpatialAuthorityRule {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Spatial authority rule at index " +
        index +
        " must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;
  const actor = item.actor;
  const action = item.action;
  const decision = item.decision;

  if (
    actor !== "*" &&
    !ACTORS.has(actor as SpatialAuthorityActor)
  ) {
    throw new Error(
      "Spatial authority rule " +
        String(item.id ?? index) +
        " has an invalid actor.",
    );
  }
  if (
    action !== "*" &&
    !ACTIONS.has(
      action as SpatialAuthorityAction,
    )
  ) {
    throw new Error(
      "Spatial authority rule " +
        String(item.id ?? index) +
        " has an invalid action.",
    );
  }
  if (
    !DECISIONS.has(
      decision as SpatialAuthorityDecision,
    )
  ) {
    throw new Error(
      "Spatial authority rule " +
        String(item.id ?? index) +
        " has an invalid decision.",
    );
  }

  let phases: string[] | undefined;
  if (item.phases !== undefined) {
    if (
      !Array.isArray(item.phases) ||
      item.phases.some(
        (phase) =>
          typeof phase !== "string" ||
          phase.trim().length === 0,
      )
    ) {
      throw new Error(
        "Spatial authority rule " +
          String(item.id ?? index) +
          " phases must be non-empty strings.",
      );
    }
    phases = [
      ...new Set(item.phases as string[]),
    ].sort();
  }

  return {
    id: nonEmptyString(
      item.id,
      "rule id",
    ),
    regionId: nonEmptyString(
      item.regionId,
      "rule regionId",
    ),
    actor:
      actor as SpatialAuthorityRule["actor"],
    action:
      action as SpatialAuthorityRule["action"],
    decision:
      decision as SpatialAuthorityDecision,
    ...(phases === undefined
      ? {}
      : { phases }),
    ...(typeof item.rationale === "string" &&
    item.rationale.trim().length > 0
      ? { rationale: item.rationale }
      : {}),
  };
}

export function parseSpatialAuthorityBehaviorContract(
  value: unknown,
): SpatialAuthorityBehaviorContract {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Spatial Authority Behavior Contract must be an object.",
    );
  }

  const item =
    value as Record<string, unknown>;
  if (item.schemaVersion !== 1) {
    throw new Error(
      "Spatial Authority Behavior Contract schemaVersion must be 1.",
    );
  }
  if (!Array.isArray(item.rules)) {
    throw new Error(
      "Spatial Authority Behavior Contract requires a rules array.",
    );
  }

  const policy: SpatialAuthorityBehaviorContract = {
    schemaVersion: 1,
    id: nonEmptyString(
      item.id,
      "policy id",
    ),
    rules: item.rules.map(parseRule),
  };

  const errors =
    validateSpatialAuthorityBehaviorContract(policy);
  if (errors.length > 0) {
    throw new Error(
      "Invalid spatial authority behavior contract: " +
        errors.join(" "),
    );
  }

  return policy;
}

export async function loadSpatialAuthorityBehaviorContractFile(
  path: string,
): Promise<SpatialAuthorityBehaviorContract> {
  const raw = JSON.parse(
    await readFile(path, "utf8"),
  ) as unknown;
  return parseSpatialAuthorityBehaviorContract(raw);
}
