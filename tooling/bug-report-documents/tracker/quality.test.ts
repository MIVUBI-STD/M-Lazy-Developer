import { describe, expect, it } from "vitest";
import type { BugTrackerDocument, TrackerIssue } from "./model.js";
import { auditBugTrackerInformation } from "./quality.js";

const baseIssue: TrackerIssue = {
  id: "BUG-QUALITY-001",
  type: "BUG",
  severity: "MAJOR",
  verification: "VERIFIED",
  title: "Quality fixture",
  issue: "A player-visible problem exists.",
  reproduction: ["Perform the in-game action.", "Observe the resulting state."],
  observed: "The resulting state is wrong because the owned runtime path does not reconcile it.",
  expected: "The resulting state is correct.",
  resolution: "Reconcile the state in the existing owner.",
  technicalAnalysis: "The existing owner omits the required reconciliation.",
};

function document(issue: TrackerIssue): BugTrackerDocument {
  return {
    schema: "m-bedrock-bug-tracker/v1",
    title: "Bug Tracker Report",
    games: [{
      name: "Quality Fixture",
      levels: [{
        level: null,
        version: "1.0.0",
        source: {
          projectId: "quality-fixture",
          artifactId: "drive:fixture",
          artifactFingerprint: "sha256:fixture",
          version: "1.0.0",
          driveFolder: "https://drive.google.com/drive/folders/folder",
          worldFile: "https://drive.google.com/file/d/file/view",
          worldFilename: "Quality Fixture v1.0.0.mcworld",
        },
        issues: [issue],
        devNotes: [],
      }],
    }],
  };
}

describe("Bug Tracker information quality", () => {
  it("accepts a concise actionable issue without requiring extra ceremony", () => {
    expect(auditBugTrackerInformation(document(baseIssue))).toEqual([]);
  });

  it("reports missing information without inventing replacements", () => {
    const sparse: TrackerIssue = {
      id: baseIssue.id,
      type: baseIssue.type,
      severity: baseIssue.severity,
      verification: baseIssue.verification,
      title: baseIssue.title,
      issue: baseIssue.issue,
      reproduction: [],
      observed: "",
      expected: "",
    };
    expect(auditBugTrackerInformation(document(sparse)).map((x) => x.code)).toEqual([
      "NO_TEST_STEPS",
      "NO_EXPECTED",
      "NO_TECHNICAL_EXPLANATION",
      "NO_RECOMMENDED_FIX",
    ]);
  });

  it("flags self-confirming reproduction wording", () => {
    const issue = {
      ...baseIssue,
      reproduction: ["Start the match.", "Confirm the bug still happens."],
    };
    expect(auditBugTrackerInformation(document(issue)).map((x) => x.code))
      .toContain("SELF_CONFIRMING_TEST_STEP");
  });
});
