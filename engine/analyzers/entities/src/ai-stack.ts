import {
  extractAttackSemantics,
  type AttackSemantics,
} from "./attack.js";
import {
  extractNavigationCapabilities,
} from "./navigation.js";
import type { NavigationCapabilities } from "./types.js";
import {
  extractTargetingSemantics,
  type TargetingSemantics,
} from "./targeting.js";
import type {
  EntityStateCandidate,
} from "./types.js";

export interface EntityBehaviorGoalSemantics {
  component: string;
  priority?: number;
  movementCandidate: boolean;
}

export interface EntityAiStackSemantics {
  stateId: string;
  movementComponents: readonly string[];
  navigation: NavigationCapabilities;
  targeting: readonly TargetingSemantics[];
  attacks: readonly AttackSemantics[];
  goals: readonly EntityBehaviorGoalSemantics[];
  movementGoalCandidates: readonly string[];
  staticSignals: {
    movementPresent: boolean;
    navigationPresent: boolean;
    targetingProviderPresent: boolean;
    attackBehaviorPresent: boolean;
    movementGoalCandidatePresent: boolean;
  };
}

function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : undefined;
}

function priority(
  value: unknown,
): number | undefined {
  const record = asRecord(value);
  const candidate = record?.priority;
  return (
    typeof candidate === "number" &&
    Number.isFinite(candidate)
  )
    ? candidate
    : undefined;
}

const MOVEMENT_GOAL_HINTS = [
  "move",
  "stroll",
  "follow",
  "avoid",
  "panic",
  "tempt",
  "attack",
  "swim",
  "float",
  "wander",
  "charge",
  "leap",
];

function movementGoalCandidate(
  component: string,
): boolean {
  if (!component.startsWith("minecraft:behavior.")) {
    return false;
  }
  const name = component
    .slice("minecraft:behavior.".length)
    .toLowerCase();
  return MOVEMENT_GOAL_HINTS.some(
    (hint) => name.includes(hint),
  );
}

export function extractEntityAiStackSemantics(
  state: EntityStateCandidate,
): EntityAiStackSemantics {
  const movementComponents =
    state.activeComponents
      .filter(
        (component) =>
          component === "minecraft:movement" ||
          component.startsWith(
            "minecraft:movement.",
          ),
      )
      .sort();

  const navigation =
    extractNavigationCapabilities(state);
  const targeting =
    extractTargetingSemantics(state);
  const attacks =
    extractAttackSemantics(state);

  const goals = state.activeComponents
    .filter((component) =>
      component.startsWith(
        "minecraft:behavior.",
      )
    )
    .map(
      (component): EntityBehaviorGoalSemantics => {
        const goalPriority = priority(
          state.activeComponentData[component],
        );
        return {
          component,
          ...(goalPriority === undefined
            ? {}
            : { priority: goalPriority }),
          movementCandidate:
            movementGoalCandidate(component),
        };
      },
    )
    .sort((a, b) =>
      (
        a.priority ?? Number.MAX_SAFE_INTEGER
      ) -
        (
          b.priority ??
          Number.MAX_SAFE_INTEGER
        ) ||
      a.component.localeCompare(b.component)
    );

  const movementGoalCandidates =
    goals
      .filter(
        (goal) =>
          goal.movementCandidate,
      )
      .map((goal) => goal.component);

  return {
    stateId: state.id,
    movementComponents,
    navigation,
    targeting,
    attacks,
    goals,
    movementGoalCandidates,
    staticSignals: {
      movementPresent:
        movementComponents.length > 0,
      navigationPresent:
        navigation.navigationComponent !==
        undefined,
      targetingProviderPresent:
        targeting.some(
          (item) =>
            item.configuredTargetTypes > 0,
        ),
      attackBehaviorPresent:
        attacks.length > 0,
      movementGoalCandidatePresent:
        movementGoalCandidates.length > 0,
    },
  };
}
