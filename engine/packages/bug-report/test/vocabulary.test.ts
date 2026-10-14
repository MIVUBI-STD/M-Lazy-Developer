import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BUG_REPORT_V2_LABELS,
} from "../src/index.js";

describe("bug report v2 vocabulary", () => {
  it("keeps canonical frontend labels explicit and stable", () => {
    expect(BUG_REPORT_V2_LABELS).toMatchObject({
      mapVersion: "Map Version",
      drive: "Map Drive",
      baseVersion: "Base Version",
      testedVersion: "Tested Version",
      repairBy: "Repair By",
      bugs: "Bugs",
      fixed: "Fixed",
      severity: "Severity",
      foundBy: "Found By",
      aiAnalysis: "AI Analysis",
      suggestedFix: "Suggested Fix",
      mustPreserve: "Must Preserve",
    });
  });
});
