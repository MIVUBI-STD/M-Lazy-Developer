import {
  deriveEntityStateGraph,
  entityRuntimeKey,
  extractEntityAiStackSemantics,
  type ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";

export interface EntityAiStackStateAssessment {
  entityKey: string;
  stateId: string;
  targeted: boolean;
  movementPresent: boolean;
  navigationPresent: boolean;
  movementGoalCandidatePresent: boolean;
  attackBehaviorPresent: boolean;
  navigationCapabilities: readonly string[];
  movementGoalPriorities: readonly {
    component: string;
    priority: number;
  }[];
  duplicateMovementGoalPriorities:
    readonly number[];
  missingSurfaces: readonly (
    | "movement"
    | "navigation"
    | "movement-goal"
  )[];
  status:
    | "targeted-stack-complete"
    | "targeted-stack-incomplete"
    | "untargeted-navigation"
    | "non-navigation";
}

export interface EntityAiStackAnalysis {
  entities: number;
  states: number;
  targetedStates: number;
  targetedStackComplete: number;
  targetedStackIncomplete: number;
  navigationWithoutMovement: number;
  targetedWithoutNavigation: number;
  movementGoalWithoutNavigation: number;
  goalPriorityConflictStates: number;
  assessments: readonly EntityAiStackStateAssessment[];
}

function assessEntity(
  entity: ParsedEntityDefinition,
): EntityAiStackStateAssessment[] {
  const entityKey = entityRuntimeKey(entity);

  return deriveEntityStateGraph(entity)
    .candidates
    .map((state): EntityAiStackStateAssessment => {
      const stack =
        extractEntityAiStackSemantics(state);
      const targeted =
        stack.staticSignals
          .targetingProviderPresent;
      const missingSurfaces: (
        | "movement"
        | "navigation"
        | "movement-goal"
      )[] = [];

      if (
        targeted &&
        !stack.staticSignals.movementPresent
      ) {
        missingSurfaces.push("movement");
      }
      if (
        targeted &&
        !stack.staticSignals.navigationPresent
      ) {
        missingSurfaces.push("navigation");
      }
      if (
        targeted &&
        !stack.staticSignals
          .movementGoalCandidatePresent
      ) {
        missingSurfaces.push(
          "movement-goal",
        );
      }

      const movementGoalPriorities =
        Object.entries(
          state.activeComponentData,
        )
          .filter(([component]) =>
            /^minecraft:behavior\./.test(
              component,
            ) &&
            /(?:move|melee_attack|ranged_attack|avoid|tempt|follow|stroll|random|charge|leap|float|swim|door|break)/i.test(
              component,
            )
          )
          .flatMap(
            ([component, value]) => {
              if (
                !value ||
                typeof value !== "object" ||
                Array.isArray(value)
              ) {
                return [];
              }
              const priority =
                (value as {
                  priority?: unknown;
                }).priority;
              return typeof priority ===
                "number"
                ? [{
                    component,
                    priority,
                  }]
                : [];
            },
          )
          .sort(
            (a, b) =>
              a.priority - b.priority ||
              a.component.localeCompare(
                b.component,
              ),
          );
      const priorityCounts =
        new Map<number, number>();
      for (
        const goal of
          movementGoalPriorities
      ) {
        priorityCounts.set(
          goal.priority,
          (
            priorityCounts.get(
              goal.priority,
            ) ?? 0
          ) + 1,
        );
      }
      const duplicateMovementGoalPriorities =
        [...priorityCounts.entries()]
          .filter(
            ([, count]) =>
              count > 1,
          )
          .map(([priority]) =>
            priority
          )
          .sort((a, b) => a - b);

      const status:
        EntityAiStackStateAssessment["status"] =
          targeted
            ? missingSurfaces.length === 0
              ? "targeted-stack-complete"
              : "targeted-stack-incomplete"
            : stack.staticSignals
                  .navigationPresent
              ? "untargeted-navigation"
              : "non-navigation";

      return {
        entityKey,
        stateId: state.id,
        targeted,
        movementPresent:
          stack.staticSignals.movementPresent,
        navigationPresent:
          stack.staticSignals.navigationPresent,
        movementGoalCandidatePresent:
          stack.staticSignals
            .movementGoalCandidatePresent,
        attackBehaviorPresent:
          stack.staticSignals
            .attackBehaviorPresent,
        navigationCapabilities:
          stack.navigation.capabilities,
        movementGoalPriorities,
        duplicateMovementGoalPriorities,
        missingSurfaces,
        status,
      };
    });
}

export function analyzeEntityAiStacks(
  entities: readonly ParsedEntityDefinition[],
): EntityAiStackAnalysis {
  const assessments = entities
    .flatMap(assessEntity)
    .sort((a, b) =>
      a.entityKey.localeCompare(b.entityKey) ||
      a.stateId.localeCompare(b.stateId)
    );

  return {
    entities: entities.length,
    states: assessments.length,
    targetedStates: assessments.filter(
      (item) => item.targeted,
    ).length,
    targetedStackComplete:
      assessments.filter(
        (item) =>
          item.status ===
          "targeted-stack-complete",
      ).length,
    targetedStackIncomplete:
      assessments.filter(
        (item) =>
          item.status ===
          "targeted-stack-incomplete",
      ).length,
    navigationWithoutMovement:
      assessments.filter(
        (item) =>
          item.navigationPresent &&
          !item.movementPresent,
      ).length,
    targetedWithoutNavigation:
      assessments.filter(
        (item) =>
          item.targeted &&
          !item.navigationPresent,
      ).length,
    movementGoalWithoutNavigation:
      assessments.filter(
        (item) =>
          item.movementGoalCandidatePresent &&
          !item.navigationPresent,
      ).length,
    goalPriorityConflictStates:
      assessments.filter(
        (item) =>
          item.duplicateMovementGoalPriorities
            .length > 0,
      ).length,
    assessments,
  };
}
