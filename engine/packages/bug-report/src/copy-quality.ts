import type { BugReportV2Bug } from "./v2.js";

export type BugReportCopyIssueCode =
  | "title-multiline"
  | "field-too-long"
  | "duplicate-core-copy"
  | "vague-issue"
  | "technical-issue-copy"
  | "vague-solution"
  | "missing-reproduction"
  | "invalid-reproduction-length"
  | "code-centric-reproduction"
  | "vague-reproduction"
  | "empty-reproduction-step"
  | "missing-observable-result";

export interface BugReportCopyIssue {
  readonly code: BugReportCopyIssueCode;
  readonly path: string;
  readonly message: string;
}

const limits = {
  title: 90,
  problem: 220,
  expected: 180,
  observed: 180,
  reproduction: 160,
  aiAnalysis: 1800,
  suggestedFix: 220,
  relevantCodeReason: 180,
  mustPreserve: 160,
} as const;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const vagueIssuePatterns = [
  /\bthere (?:may|might|could) be\b/i,
  /\bappears? to\b/i,
  /\bseems? to\b/i,
  /\bpossible issue\b/i,
  /\bpotential issue\b/i,
  /\bneeds? checking\b/i,
] as const;

const technicalIssuePatterns = [
  /\brace condition\b/i,
  /\bcallback\b/i,
  /\bsubscriber\b/i,
  /\bevent handler\b/i,
  /\bdynamic propert(?:y|ies)\b/i,
  /\bsource code\b/i,
  /\bcode path\b/i,
  /\bimplementation\b/i,
  /\barchitecture\b/i,
  /\bfunction\b/i,
  /\bscript\b/i,
] as const;

const codeCentricReproductionPatterns = [
  /\bscript\b/i,
  /\bfunction\b/i,
  /\bmethod\b/i,
  /\bclass\b/i,
  /\bvariable\b/i,
  /\bsource code\b/i,
  /\bcode path\b/i,
  /\bimplementation\b/i,
  /\barchitecture\b/i,
  /\.tsx?\b/i,
  /\.jsx?\b/i,
] as const;

const vagueReproductionPatterns = [
  /\btest it\b/i,
  /\bcheck the bug\b/i,
  /\bverify the logic\b/i,
  /\bsee if it happens\b/i,
  /\b(?:the|this) bug is visible\b/i,
  /\bsomething (?:is|goes) wrong\b/i,
] as const;

const observableResultPattern =
  /\b(confirm|observe|notice|verify)\b/i;

const vagueSolutionPatterns = [
  /\bcheck (?:the|this)\b/i,
  /\binvestigate\b/i,
  /\breview (?:the|this)\b/i,
  /\blook into\b/i,
  /\bfix (?:the|this) issue\b/i,
  /\badjust as needed\b/i,
] as const;

function tooLong(
  issues: BugReportCopyIssue[],
  path: string,
  value: string,
  max: number,
): void {
  if (compact(value).length > max) {
    issues.push({
      code: "field-too-long",
      path,
      message: `Keep this field at or below ${max} characters for scan readability.`,
    });
  }
}

/**
 * One tester-language admission rule for both authored BugTrigger drafts and
 * final Bug Report V2. This checks obvious copy defects, not source evidence
 * ownership, gameplay reachability, or Minecraft runtime execution.
 */
export function reviewTesterReproductionSteps(
  steps: readonly string[] | undefined,
  path: string,
): readonly BugReportCopyIssue[] {
  const issues: BugReportCopyIssue[] = [];
  if (!steps || steps.length === 0) {
    issues.push({
      code: "missing-reproduction",
      path,
      message: "Test In-Game requires a concrete tester-visible route.",
    });
    return issues;
  }

  if (steps.length < 2 || steps.length > 5) {
    issues.push({
      code: "invalid-reproduction-length",
      path,
      message: "Use 2 to 5 concise in-game steps.",
    });
  }

  steps.forEach((step, index) => {
    const stepPath = path + "[" + index + "]";
    tooLong(issues, stepPath, step, limits.reproduction);
    if (!compact(step)) {
      issues.push({
        code: "empty-reproduction-step",
        path: stepPath,
        message: "Every Test In-Game step must describe an action or visible result.",
      });
    }
    if (codeCentricReproductionPatterns.some(pattern => pattern.test(step))) {
      issues.push({
        code: "code-centric-reproduction",
        path: stepPath,
        message: "Test In-Game must describe player actions and visible outcomes, not code inspection.",
      });
    }
    if (vagueReproductionPatterns.some(pattern => pattern.test(step))) {
      issues.push({
        code: "vague-reproduction",
        path: stepPath,
        message: "Test In-Game must describe a concrete action or observable failure.",
      });
    }
  });

  const last = steps[steps.length - 1]!;
  if (!observableResultPattern.test(last)) {
    issues.push({
      code: "missing-observable-result",
      path: path + "[" + (steps.length - 1) + "]",
      message: "Final Test In-Game step must tell the tester what wrong visible result to confirm.",
    });
  }
  return issues;
}

export function reviewBugReportCopy(
  bugs: readonly BugReportV2Bug[],
): readonly BugReportCopyIssue[] {
  const issues: BugReportCopyIssue[] = [];

  bugs.forEach((bug, index) => {
    const base = `bugs[${index}]`;

    if (/\r|\n/.test(bug.title)) {
      issues.push({
        code: "title-multiline",
        path: base + ".title",
        message: "Title must stay on one line.",
      });
    }

    tooLong(issues, base + ".title", bug.title, limits.title);
    tooLong(issues, base + ".problem", bug.problem, limits.problem);

    if (vagueIssuePatterns.some((pattern) => pattern.test(bug.problem))) {
      issues.push({
        code: "vague-issue",
        path: base + ".problem",
        message:
          "Issue must state the player-visible failure and gameplay impact without tentative investigation wording.",
      });
    }

    if (
      technicalIssuePatterns.some((pattern) =>
        pattern.test(bug.problem)
      )
    ) {
      issues.push({
        code: "technical-issue-copy",
        path: base + ".problem",
        message:
          "Issue must describe what the player experiences in-game. Keep implementation causes in Technical Analysis.",
      });
    }

    tooLong(issues, base + ".expected", bug.expected, limits.expected);
    tooLong(issues, base + ".observed", bug.observed, limits.observed);

    issues.push(...reviewTesterReproductionSteps(
      bug.reproduction, base + ".reproduction",
    ));

    if (bug.aiAnalysis) {
      tooLong(
        issues,
        base + ".aiAnalysis",
        bug.aiAnalysis,
        limits.aiAnalysis,
      );
    }

    if (bug.suggestedFix) {
      tooLong(
        issues,
        base + ".suggestedFix",
        bug.suggestedFix,
        limits.suggestedFix,
      );

      if (
        vagueSolutionPatterns.some((pattern) =>
          pattern.test(bug.suggestedFix!)
        )
      ) {
        issues.push({
          code: "vague-solution",
          path: base + ".suggestedFix",
          message:
            "Solution must state a direct repair step and target instead of asking the reader to investigate or generally fix the issue.",
        });
      }
    }

    bug.relevantCode?.forEach((item, itemIndex) => {
      tooLong(
        issues,
        `${base}.relevantCode[${itemIndex}].reason`,
        item.reason,
        limits.relevantCodeReason,
      );
    });

    bug.mustPreserve?.forEach((item, itemIndex) => {
      tooLong(
        issues,
        `${base}.mustPreserve[${itemIndex}]`,
        item,
        limits.mustPreserve,
      );
    });

    const core = [
      ["problem", compact(bug.problem)],
      ["expected", compact(bug.expected)],
      ["observed", compact(bug.observed)],
    ] as const;

    for (let left = 0; left < core.length; left += 1) {
      for (let right = left + 1; right < core.length; right += 1) {
        if (
          core[left]![1].toLowerCase() ===
          core[right]![1].toLowerCase()
        ) {
          issues.push({
            code: "duplicate-core-copy",
            path:
              base +
              "." +
              core[left]![0] +
              " / " +
              core[right]![0],
            message:
              "Problem, Expected, and Observed must perform distinct roles instead of repeating the same sentence.",
          });
        }
      }
    }
  });

  return issues;
}
