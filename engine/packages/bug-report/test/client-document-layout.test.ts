import { describe, expect, it } from "vitest";
import {
  projectBugReportClientDocument,
  type BugReportV2,
} from "../src/index.js";

function report(count: number): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Layout Map",
      mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: Array.from({ length: count }, (_, index) => ({
      id: "BUG-LAYOUT-" + String(index + 1),
      fixed: false,
      severity:
        index === 0
          ? "blocker" as const
          : index % 2 === 0
            ? "minor" as const
            : "major" as const,
      category: "game-flow" as const,
      foundBy: "tester" as const,
      title: "Issue " + String(index + 1),
      problem:
        "Gameplay issue " + String(index + 1) + " affects the current run.",
      expected:
        "The gameplay step completes normally.",
      observed:
        "The gameplay step does not complete normally.",
      reproduction: [
        "Start the affected gameplay.",
        "Perform the affected action.",
        "Confirm the wrong result is visible.",
      ],
    })),
  };
}

describe("client document canonical issue projection", () => {
  it("projects a short report directly, without a duplicate issue index", () => {
    const document = projectBugReportClientDocument(report(3));
    expect(document.issues).toHaveLength(3);
    expect(document.summary.visibleIssues).toBe(3);
    expect(document.issues.map(issue => issue.number)).toEqual([1, 2, 3]);
    expect("issueIndex" in document).toBe(false);
  });

  it("preserves one numbered issue per source defect from four onward", () => {
    const document = projectBugReportClientDocument(report(4));
    expect(document.issues).toHaveLength(4);
    expect(document.issues.map(issue => issue.number)).toEqual([1, 2, 3, 4]);
    expect(new Set(document.issues.map(issue => issue.id)).size).toBe(4);
  });

  it("keeps large reports in one canonical ordered issue collection", () => {
    const document = projectBugReportClientDocument(report(7));
    expect(document.summary.visibleIssues).toBe(7);
    expect(document.issues).toHaveLength(7);
    expect(document.issues.map(issue => issue.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect("issueIndex" in document).toBe(false);
  });
});
