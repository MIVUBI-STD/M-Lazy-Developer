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
  // Evidence verification is independent from the existence of test steps.
  // A NEEDS_VERIFY issue can collect observations, but cannot claim that a
  // repaired issue has passed a post-fix retest.
  if (issue.verification === "NEEDS_VERIFY") {
    return {
      ready: false,
      reason: problems.length > 0
        ? "Issue evidence needs validation. " + problems[0]!.message
        : "Issue evidence needs validation. Record observations in Tester Notes; Passed/Failed are for verified issues after repair.",
    };
  }
  if (problems.length > 0) {
    return { ready: false, reason: problems[0]!.message };
  }
  if (!issue.expected.trim()) {
    return { ready: false, reason: "Expected behavior has not been provided." };
  }
  if (!issue.observed.trim()) {
    return { ready: false, reason: "Observed failure evidence has not been provided." };
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

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function filled(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function optionalText(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

/**
 * Runtime validation is required at the publication boundary. TypeScript
 * interfaces cannot validate untrusted JSON or an older stored document.
 * Preserve genuinely unknown issue facts (empty Expected/Observed) without
 * manufacturing guidance or changing the persisted tracker v1 schema.
 */
export function validateBugTrackerDocument(document: BugTrackerDocument): void {
  const errors: string[] = [];
  const invalid = (): never => {
    throw new Error("Bug Tracker validation failed:\n- " + errors.join("\n- "));
  };
  if (!record(document)) {
    errors.push("Document must be an object.");
    return invalid();
  }
  if (document.schema !== "m-bedrock-bug-tracker/v1") errors.push("Invalid Bug Tracker schema.");
  if (document.title !== "Bug Tracker Report") errors.push("Invalid Bug Tracker title.");
  if (!Array.isArray(document.games) || document.games.length === 0) {
    errors.push("At least one game is required.");
    return invalid();
  }

  const ids: string[] = [];
  for (const [gameIndex, game] of document.games.entries()) {
    const where = "games[" + gameIndex + "]";
    if (!record(game)) {
      errors.push(where + ": game must be an object.");
      continue;
    }
    if (!filled(game.name)) errors.push(where + ": game name is required.");
    if (!Array.isArray(game.levels) || game.levels.length === 0) {
      errors.push(where + ": at least one level/source is required.");
      continue;
    }
    for (const [levelIndex, level] of game.levels.entries()) {
      const at = where + ".levels[" + levelIndex + "]";
      if (!record(level)) {
        errors.push(at + ": level must be an object.");
        continue;
      }
      if (level.level !== null && (!Number.isInteger(level.level) || typeof level.level !== "number")) {
        errors.push(at + ": level must be an integer or null.");
      }
      if (!filled(level.version)) errors.push(at + ": version is required.");
      const source = level.source;
      if (!record(source)) {
        errors.push(at + ": source binding must be an object.");
        continue;
      }
      for (const field of ["projectId", "artifactId", "artifactFingerprint", "version", "driveFolder", "worldFile", "worldFilename"] as const) {
        if (!filled(source[field])) errors.push(at + ": source." + field + " is required.");
      }
      if (filled(level.version) && filled(source.version) && level.version !== source.version) {
        errors.push(at + ": report level version " + level.version +
          " does not match source artifact version " + source.version + ".");
      }
      for (const field of ["driveFolder", "worldFile"] as const) {
        if (filled(source[field]) && !/^https?:\/\//.test(source[field])) {
          errors.push(at + ": source." + field + " must be an HTTP(S) URL.");
        }
      }
      if (!optionalText(source.bugReportPath)) errors.push(at + ": invalid source.bugReportPath.");
      if (!Array.isArray(level.issues) || !Array.isArray(level.devNotes)) {
        errors.push(at + ": issues and devNotes must be arrays.");
        continue;
      }
      for (const [noteIndex, note] of level.devNotes.entries()) {
        const n = at + ".devNotes[" + noteIndex + "]";
        if (!record(note)) {
          errors.push(n + ": Developer Note must be an object.");
          continue;
        }
        if (filled(note.id)) ids.push(note.id);
        else errors.push(n + ": Developer Note ID is required.");
        if (note.type !== "DEV_NOTE") errors.push(n + ": invalid Developer Note type.");
        if (note.severity !== null) errors.push(n + ": Developer Note severity must be null.");
        for (const field of ["title", "problem", "action"] as const) {
          if (!filled(note[field])) errors.push(n + ": " + field + " is required.");
        }
        if (!record(note.evidence)) errors.push(n + ": evidence must be an object.");
        const visible = [note.title, note.problem, note.action]
          .filter((v): v is string => typeof v === "string").join(" ").toLowerCase();
        for (const term of FORBIDDEN_VISIBLE_TERMS) {
          if (visible.includes(term)) errors.push(n + ": forbidden internal UI term: " + term);
        }
      }
      for (const [issueIndex, issue] of level.issues.entries()) {
        const atIssue = at + ".issues[" + issueIndex + "]";
        if (!record(issue)) {
          errors.push(atIssue + ": issue must be an object.");
          continue;
        }
        if (filled(issue.id)) ids.push(issue.id);
        else errors.push(atIssue + ": issue ID is required.");
        if (issue.type !== "BUG" && issue.type !== "DESIGN_MISMATCH") {
          errors.push(atIssue + ": invalid issue type.");
        }
        if (!["BLOCKER", "MAJOR", "MINOR"].includes(issue.severity as string)) {
          errors.push(atIssue + ": invalid severity.");
        }
        if (!["VERIFIED", "NEEDS_VERIFY"].includes(issue.verification as string)) {
          errors.push(atIssue + ": invalid verification state.");
        }
        if (!filled(issue.title) || !filled(issue.issue)) {
          errors.push(atIssue + ": incomplete issue identity.");
        }
        if (!stringList(issue.reproduction)) errors.push(atIssue + ": reproduction must be a list of text steps.");
        if (typeof issue.expected !== "string" || typeof issue.observed !== "string") {
          errors.push(atIssue + ": Expected/Observed must be text (empty is permitted for incomplete evidence).");
        }
        for (const field of ["whyThisIsBug", "impact", "resolution", "technicalAnalysis"] as const) {
          if (!optionalText(issue[field])) errors.push(atIssue + ": invalid " + field + ".");
        }
        if (issue.relevantCode !== undefined) {
          if (!Array.isArray(issue.relevantCode) ||
            !issue.relevantCode.every(item => record(item) && filled(item.file) && filled(item.reason))) {
            errors.push(atIssue + ": relevantCode must contain file/reason pairs.");
          }
        }
        if (issue.mustPreserve !== undefined &&
          (!stringList(issue.mustPreserve) || issue.mustPreserve.some(item => !item.trim()))) {
          errors.push(atIssue + ": mustPreserve must be a list of nonempty text.");
        }
        const visible = [
          issue.title, issue.issue, issue.whyThisIsBug, issue.impact,
          ...(stringList(issue.reproduction) ? issue.reproduction : []),
          issue.observed, issue.expected, issue.resolution,
        ].filter((v): v is string => typeof v === "string").join(" ").toLowerCase();
        for (const term of FORBIDDEN_VISIBLE_TERMS) {
          if (visible.includes(term)) errors.push(atIssue + ": forbidden internal UI term: " + term);
        }
      }
    }
  }
  if (new Set(ids).size !== ids.length) errors.push("Duplicate issue ID.");
  if (errors.length > 0) invalid();
}
