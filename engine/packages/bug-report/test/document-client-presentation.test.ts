import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_V2_SCHEMA,
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
  type BugReportV2,
} from "../src/index.js";

describe("bug report client presentation", () => {
  it("projects canonical metadata and presentation-only checklists", () => {
    const report: BugReportV2 = {
      schema: BUG_REPORT_V2_SCHEMA,
      map: {
        name: "Audit Map",
        mapVersion: "1.0.0",
        drive: "https://drive.google.com/file/d/map/view",
        baseVersion: "1.0.0",
        testedVersion: "1.26.30",
      },
      repairBy: "developer",
      bugs: [{
        id: "BUG-AUD-1",
        fixed: false,
        severity: "major",
        category: "game-flow",
        foundBy: "ai",
        title: "Restricted action remains exposed",
        problem: "Ordinary players can trigger a restricted action.",
        expected: "Only authorized players can trigger the action.",
        observed: "The action can be triggered without authorization.",
        reproduction: [
          "Enter the affected gameplay area.",
          "Trigger the interaction as a normal player.",
        ],
        suggestedFix: "Require the existing authorization gate.",
        aiAnalysis: "Root Cause\nAuthorization is not enforced.",
        relevantCode: [{
          file: "scripts/action.ts",
          reason: "Owns the interaction path.",
        }],
        mustPreserve: [
          "Authorized developer workflow remains available.",
        ],
      }],
    };

    const document =
      projectBugReportClientDocument(report, {
        includeMinor: true,
      });

    expect(document.issues[0]).toMatchObject({
      id: "BUG-AUD-1",
      category: "game-flow",
      foundBy: "ai",
      workChecklist: [
        "Reproduce issue",
        "Apply or confirm fix",
        "Retest expected behavior",
        "Confirm no regression",
      ],
    });
    expect(
      document.issues[0]?.technicalAnalysis,
    ).toContain("Root Cause");
    expect(
      reviewBugReportClientDocument(document),
    ).toEqual([]);
  });
});
