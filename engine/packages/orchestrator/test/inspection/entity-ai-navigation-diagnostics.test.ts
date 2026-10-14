import { describe, expect, it } from "vitest";
import {
  entityAiNavigationDiagnostics,
} from "../../src/inspection/entity-ai-navigation-diagnostics.js";

describe("entity AI navigation diagnostics", () => {
  it("uses medium severity for missing targeted navigation", () => {
    const findings =
      entityAiNavigationDiagnostics(
        {
          entities: 1,
          states: 1,
          targetedStates: 1,
          targetedStackComplete: 0,
          targetedStackIncomplete: 1,
          navigationWithoutMovement: 0,
          targetedWithoutNavigation: 1,
          movementGoalWithoutNavigation: 0,
          goalPriorityConflictStates: 0,
          assessments: [],
        },
        {
          contracts: 0,
          assessments: [],
          compatible: 0,
          incompatible: 0,
          stateDependent: 0,
          unresolved: 0,
        },
      );

    expect(findings[0]).toMatchObject({
      code:
        "ENTITY_AI_NAVIGATION_COVERAGE_GAP",
      severity: "medium",
    });
  });

  it("uses minor severity when route compatibility is only state-dependent", () => {
    const findings =
      entityAiNavigationDiagnostics(
        {
          entities: 1,
          states: 2,
          targetedStates: 2,
          targetedStackComplete: 2,
          targetedStackIncomplete: 0,
          navigationWithoutMovement: 0,
          targetedWithoutNavigation: 0,
          movementGoalWithoutNavigation: 0,
          goalPriorityConflictStates: 0,
          assessments: [],
        },
        {
          contracts: 1,
          assessments: [],
          compatible: 0,
          incompatible: 0,
          stateDependent: 1,
          unresolved: 0,
        },
      );

    expect(findings[0]).toMatchObject({
      severity: "minor",
    });
  });
});
