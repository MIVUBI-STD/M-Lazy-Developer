import type { BugTrackerDocument, TrackerIssue } from "./model.js";
import { reviewTesterReproductionSteps } from "../../../engine/packages/bug-report/src/copy-quality.js";

const FORBIDDEN_VISIBLE_TERMS = [
  "system prompt",
  "chain of thought",
  "proof yield",
  "canonical projection",
  "candidate generated",
  "ai thinks",
] as const;

/**
 * Legacy and current reports share the Bug Report V2 tester-language gate.
 * This is presentation readiness, not proof of actual Minecraft execution.
 */
export function trackerGuidedRetestReadiness(issue: TrackerIssue): {
  readonly ready: boolean;
  readonly reason?: string;
} {
  const problems = reviewTesterReproductionSteps(issue.reproduction, "reproduction");
  if (problems.length > 0) {
    return { ready: false, reason: problems[0]!.message };
  }
  if (!issue.expected.trim()) {
    return { ready: false, reason: "Expected behavior has not been provided." };
  }
  return { ready: true };
}

export function trackerIssueIds(document: BugTrackerDocument): string[] {
  return document.games.flatMap((game) =>
    game.levels.flatMap((level) => [
      ...level.issues.map((issue) => issue.id),
      ...level.devNotes.map((note) => note.id),
    ]),
  );
}

export function validateBugTrackerDocument(document: BugTrackerDocument): void {
  const errors: string[] = [];
  const ids = trackerIssueIds(document);
  if (new Set(ids).size !== ids.length) errors.push("Duplicate issue ID.");
  if (document.schema !== "m-bedrock-bug-tracker/v1") errors.push("Invalid Bug Tracker schema.");
  if (document.title !== "Bug Tracker Report") errors.push("Invalid Bug Tracker title.");

  for (const game of document.games) {
    if (!game.name.trim()) errors.push("Game name is required.");
    for (const level of game.levels) {
      const source = level.source;
      if (!source.driveFolder.trim()) errors.push(game.name + ": Drive Folder is required.");
      if (!source.worldFile.trim()) errors.push(game.name + ": World File is required.");
      if (!source.worldFilename.trim()) errors.push(game.name + ": world filename is required.");
      if (!source.artifactFingerprint.trim()) errors.push(game.name + ": artifact fingerprint is required.");
      if (!["http://", "https://"].some((prefix) => source.driveFolder.startsWith(prefix))) errors.push(game.name + ": invalid Drive Folder URL.");
      if (!["http://", "https://"].some((prefix) => source.worldFile.startsWith(prefix))) errors.push(game.name + ": invalid World File URL.");
      for (const note of level.devNotes) {
        if (note.type !== "DEV_NOTE") errors.push(note.id + ": invalid Developer Note type.");
        if (note.severity !== null) errors.push(note.id + ": Developer Note severity must be null.");
        if (!note.id.trim() || !note.title.trim() || !note.problem.trim() || !note.action.trim()) {
          errors.push(game.name + ": incomplete Developer Note.");
        }
        const visible = [note.title, note.problem, note.action].join(" ").toLowerCase();
        for (const term of FORBIDDEN_VISIBLE_TERMS) {
          if (visible.includes(term)) errors.push(note.id + ": forbidden internal UI term: " + term);
        }
      }
      for (const issue of level.issues) {
        if (!["BUG", "DESIGN_MISMATCH"].includes(issue.type)) errors.push(issue.id + ": invalid issue type.");
        if (!["BLOCKER", "MAJOR", "MINOR"].includes(issue.severity)) errors.push(issue.id + ": invalid severity.");
        if (!["VERIFIED", "NEEDS_VERIFY"].includes(issue.verification)) errors.push(issue.id + ": invalid verification state.");
        if (!issue.id.trim() || !issue.title.trim() || !issue.issue.trim()) {
          errors.push(game.name + ": incomplete issue identity.");
        }
        const visible = [issue.title, issue.issue, issue.whyThisIsBug ?? "", issue.impact ?? "", ...issue.reproduction, issue.observed, issue.expected, issue.resolution ?? ""].join(" ").toLowerCase();
        for (const term of FORBIDDEN_VISIBLE_TERMS) {
          if (visible.includes(term)) errors.push(issue.id + ": forbidden internal UI term: " + term);
        }
      }
    }
  }

  if (errors.length > 0) throw new Error("Bug Tracker validation failed:\n- " + errors.join("\n- "));
}
