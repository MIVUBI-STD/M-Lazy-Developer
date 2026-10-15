import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_V2_SCHEMA,
  reviewBugReportCopy,
  type BugReportV2,
} from "../src/index.js";

function report(): BugReportV2 {
  return {
    schema: BUG_REPORT_V2_SCHEMA,
    map: {
      name: "Map",
      mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.0",
      testedVersion: "1.26.0",
    },
    repairBy: "developer",
    bugs: [{
      id: "BUG-001",
      fixed: false,
      severity: "major",
      category: "game-flow",
      foundBy: "tester",
      title: "Gate remains closed after objective",
      problem: "The closed gate blocks progression to the next area.",
      expected: "The gate opens after the objective completes.",
      observed: "The gate remains closed after completion.",
      reproduction: [
        "Complete the objective.",
        "Walk to the gate.",
        "Confirm the gate remains closed and blocks progression.",
      ],
    }],
  };
}

describe("bug report copy quality", () => {
  it("accepts concise player-facing copy", () => {
    expect(reviewBugReportCopy(report().bugs)).toEqual([]);
  });

  it("rejects implementation language in Issue", () => {
    const source = report();
    const issues = reviewBugReportCopy([{
      ...source.bugs[0]!,
      problem:
        "A race condition in the event handler can prevent the gate transition.",
    }]);

    expect(
      issues.some(
        (issue) => issue.code === "technical-issue-copy",
      ),
    ).toBe(true);
  });

  it("rejects duplicated core copy", () => {
    const source = report();
    const bug = source.bugs[0]!;
    const issues = reviewBugReportCopy([{
      ...bug,
      observed: bug.expected,
    }]);

    expect(
      issues.some((issue) => issue.code === "duplicate-core-copy"),
    ).toBe(true);
  });

  it("rejects trigger paths without an observable final result", () => {
    const source = report();
    const issues = reviewBugReportCopy([{
      ...source.bugs[0]!,
      reproduction: [
        "Complete the objective.",
        "Walk to the gate.",
      ],
    }]);

    expect(
      issues.some(
        (issue) =>
          issue.code === "missing-observable-result",
      ),
    ).toBe(true);
  });

  it("uses one tester-step rule for empty, technical and vague instructions", () => {
    const initial = report().bugs[0]!;
    for (const step of [
      "",
      "Inspect the session script.",
      "Verify the logic.",
      "Confirm the bug is visible.",
    ]) {
      const issues = reviewBugReportCopy([{
        ...initial,
        reproduction: ["Join the arena with 2 players.", step],
      }]);
      expect(issues.some(issue => [
        "empty-reproduction-step", "code-centric-reproduction",
        "vague-reproduction",
      ].includes(issue.code)), step).toBe(true);
    }
  });

  it("rejects multiline titles", () => {
    const source = report();
    const issues = reviewBugReportCopy([{
      ...source.bugs[0]!,
      title: "Gate remains closed\nafter objective",
    }]);

    expect(
      issues.some((issue) => issue.code === "title-multiline"),
    ).toBe(true);
  });
});
