import { describe, expect, it } from "vitest";
import {
  analyzeRouteNavigationEnvironments,
} from "../../src/inspection/route-navigation-environment-analysis.js";

describe("route navigation environment analysis", () => {
  it("marks route incompatible when all navigation states miss authored capability", () => {
    const result =
      analyzeRouteNavigationEnvironments(
        [{
          id: "water-route",
          routeId: "bridge",
          entityKeys: ["demo:zombie"],
          medium: "water",
          requiresSwimming: true,
        }],
        {
          entities: 1,
          states: 1,
          targetedStates: 1,
          targetedStackComplete: 1,
          targetedStackIncomplete: 0,
          navigationWithoutMovement: 0,
          targetedWithoutNavigation: 0,
          movementGoalWithoutNavigation: 0,
          goalPriorityConflictStates: 0,
          goalPriorityConflictStates: 0,
          assessments: [{
            entityKey: "demo:zombie",
            stateId: "base",
            targeted: true,
            movementPresent: true,
            navigationPresent: true,
            movementGoalCandidatePresent: true,
            attackBehaviorPresent: true,
            movementGoalPriorities: [],
            duplicateMovementGoalPriorities: [],
            navigationCapabilities: [
              "navigation:walk",
            ],
            missingSurfaces: [],
            status:
              "targeted-stack-complete",
          }],
        },
      );

    expect(result.incompatible).toBe(1);
    expect(result.assessments[0]).toMatchObject({
      status: "incompatible",
      entityKey: "demo:zombie",
      routeId: "bridge",
    });
    expect(
      result.assessments[0]?.states[0]
        ?.missingCapabilities,
    ).toContain("navigation:swim");
  });

  it("keeps mixed state compatibility state-dependent", () => {
    const base = {
      entityKey: "demo:zombie",
      targeted: true,
      movementPresent: true,
      navigationPresent: true,
      movementGoalCandidatePresent: true,
      attackBehaviorPresent: true,
      missingSurfaces: [] as const,
      movementGoalPriorities: [],
      duplicateMovementGoalPriorities: [],
      status:
        "targeted-stack-complete" as const,
    };

    const result =
      analyzeRouteNavigationEnvironments(
        [{
          id: "door-route",
          routeId: "gate",
          entityKeys: ["demo:zombie"],
          doorRequirement: "open",
        }],
        {
          entities: 1,
          states: 2,
          targetedStates: 2,
          targetedStackComplete: 2,
          targetedStackIncomplete: 0,
          navigationWithoutMovement: 0,
          targetedWithoutNavigation: 0,
          movementGoalWithoutNavigation: 0,
          assessments: [
            {
              ...base,
              stateId: "open-capable",
              navigationCapabilities: [
                "navigation:walk",
                "navigation:can-open-doors",
              ],
            },
            {
              ...base,
              stateId: "closed-only",
              navigationCapabilities: [
                "navigation:walk",
              ],
            },
          ],
        },
      );

    expect(result.stateDependent).toBe(1);
    expect(result.incompatible).toBe(0);
  });
});
