import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BUG_REPORT_V2_SCHEMA,
  parseBugReportV2Json,
  promoteConfirmedBugsToV2,
  reviewConfirmedBugInputs,
  type BugReportV2,
} from "../src/index.js";

const map = {
  name: "Beach Bedwars",
  mapVersion: "1.0.4",
      drive: "https://drive.google.com/file/d/map/view",
  baseVersion: "1.26.20",
  testedVersion: "1.26.32",
};

/** Minimal valid canonical report for parser rejection tests. */
function report(): BugReportV2 {
  return {
    schema: BUG_REPORT_V2_SCHEMA,
    map,
    repairBy: "developer",
    bugs: [],
  };
}

describe("confirmed bug promotion", () => {
  it("promotes only confirmed defects into canonical V2", () => {
    const result = promoteConfirmedBugsToV2({
      map,
      repairBy: "developer",
      bugs: [{
        status: "confirmed-defect",
        confirmation: {
          basis: "authored-contract-violation",
          evidence: "The implementation contradicts the authored behavior contract.",
        },
        id: "BUG-BBW-001",
        severity: "major",
        category: "multiplayer-session",
        foundBy: "ai",
        title: "Reconnect loses arena state",
        problem: "The player returns to the lobby after reconnecting.",
        expected: "The player remains assigned to the same arena.",
        observed: "The previous arena membership remains bound to the old session.",
        reproduction: [
          "Join an arena and start a match.",
          "Disconnect and reconnect.",
          "Confirm the player is not cleanly rebound to the same arena session.",
        ],
        aiAnalysis: "Reconnect creates a new session without fully rebinding arena membership.",
        relevantCode: [{
          file: "scripts/session.ts",
          reason: "Owns reconnect session membership.",
        }],
        suggestedFix: "Rebind arena membership to the new session.",
        mustPreserve: [
          "Same-arena reconnect behavior.",
          "Cross-arena isolation.",
        ],
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs).toHaveLength(1);
    expect(result.report.bugs[0]?.fixed).toBe(false);
    expect("status" in result.report.bugs[0]!).toBe(false);
    expect("confirmation" in result.report.bugs[0]!).toBe(false);
  });

  it("requires gameplay reproduction for tester-found confirmed defects", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
        confirmation: {
          basis: "authored-contract-violation",
          evidence: "The implementation contradicts the authored behavior contract.",
        },
      id: "BUG-BBW-002",
      severity: "major",
      category: "game-flow",
      foundBy: "tester",
      title: "Match cannot restart",
      problem: "A second match cannot start.",
      expected: "The arena can start another match.",
      observed: "The start interaction no longer works.",
    }]);

    expect(issues.map((issue) => issue.code)).toContain(
      "missing-reproduction",
    );
  });

  it("requires technical basis for AI-found confirmed defects", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
        confirmation: {
          basis: "authored-contract-violation",
          evidence: "The implementation contradicts the authored behavior contract.",
        },
      id: "BUG-BBW-003",
      severity: "minor",
      category: "ui-feedback",
      foundBy: "ai",
      title: "Feedback remains visible",
      problem: "Feedback persists after leaving.",
      expected: "Feedback clears.",
      observed: "The UI state is not cleared.",
      reproduction: [
        "Enter the join area until feedback appears.",
        "Leave the join area.",
        "Confirm the feedback remains visible.",
      ],
    }]);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ai-missing-analysis",
        "ai-missing-relevant-code",
      ]),
    );
  });

  it("keeps tester as Found By when AI adds technical analysis", () => {
    const result = promoteConfirmedBugsToV2({
      map,
      repairBy: "developer",
      bugs: [{
        status: "confirmed-defect",
        confirmation: {
          basis: "tester-reproduction",
          evidence: "The waterlogging behavior is reproducible outside the active plot.",
        },
        id: "BUG-BBW-005",
        severity: "major",
        category: "world-interaction",
        foundBy: "tester",
        title: "Water mutates blocks outside the plot",
        problem: "Water changes world state outside the active plot.",
        expected: "Outside-plot interaction is rejected.",
        observed: "Iron bars outside the plot become waterlogged.",
        reproduction: [
          "Start the building phase.",
          "Use a water bucket on iron bars outside the active plot.",
          "Confirm the outside-plot iron bars become waterlogged.",
        ],
        aiAnalysis: "Bucket handling bypasses the normal plot containment gate.",
        relevantCode: [{
          file: "scripts/building.ts",
          reason: "Handles bucket interaction during the building phase.",
        }],
        suggestedFix: "Route bucket interaction through plot containment.",
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs[0]?.foundBy).toBe("tester");
    expect(result.report.bugs[0]?.aiAnalysis).toContain(
      "bypasses",
    );
  });

  it("rejects AI discovery supported only by tester reproduction", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
      confirmation: {
        basis: "tester-reproduction",
        evidence: "A tester can reproduce the behavior.",
      },
      id: "BUG-BBW-006",
      severity: "major",
      category: "game-flow",
      foundBy: "ai",
      title: "AI-only claim without AI proof",
      problem: "The behavior is wrong.",
      expected: "Expected behavior.",
      observed: "Observed behavior.",
      reproduction: [
        "Trigger the affected game flow.",
        "Repeat the action that reaches the affected state.",
        "Confirm the reported behavior occurs.",
      ],
      aiAnalysis: "A possible path exists.",
      relevantCode: [{
        file: "scripts/game.ts",
        reason: "Potentially related.",
      }],
    }]);

    expect(issues.map((issue) => issue.code)).toContain(
      "ai-unproven-defect",
    );
  });

  it("keeps Relevant Code focused on primary locations", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
        confirmation: {
          basis: "authored-contract-violation",
          evidence: "The implementation contradicts the authored behavior contract.",
        },
      id: "BUG-BBW-004",
      severity: "major",
      category: "player-state",
      foundBy: "ai",
      title: "Inventory persists",
      problem: "Match items remain in the lobby.",
      expected: "Match-owned items are cleared.",
      observed: "Cleanup does not clear match items.",
      reproduction: [
        "Start a match and obtain match-owned items.",
        "Finish the match and return to the lobby.",
        "Confirm the match items remain in inventory.",
      ],
      aiAnalysis: "Inventory cleanup is missing from the match-end path.",
      relevantCode: [1, 2, 3, 4].map((index) => ({
        file: "scripts/file-" + index + ".ts",
        reason: "Candidate location " + index,
      })),
    }]);

    expect(issues.map((issue) => issue.code)).toContain(
      "too-many-relevant-code-locations",
    );
  });

  it("requires the canonical map Drive URL", () => {
    const missing = JSON.parse(
      JSON.stringify(report()),
    ) as {
      map: Record<string, unknown>;
    };
    delete missing.map.drive;

    const missingResult =
      parseBugReportV2Json(
        JSON.stringify(missing),
      );
    expect(missingResult.ok).toBe(false);

    const invalid = JSON.parse(
      JSON.stringify(report()),
    ) as {
      map: Record<string, unknown>;
    };
    invalid.map.drive =
      "https://example.com/map";

    const invalidResult =
      parseBugReportV2Json(
        JSON.stringify(invalid),
      );
    expect(invalidResult.ok).toBe(false);
  });

});
