import { reviewTesterReproductionSteps } from "./copy-quality.js";

export type BugTriggerGameplayBasis =
  | "authored-gameplay"
  | "runtime-gameplay"
  | "tester-gameplay";

export interface BugTriggerDraft {
  readonly gameplayBasis: BugTriggerGameplayBasis;
  readonly startingCondition: string;
  readonly actions?: readonly string[];
  readonly observableFailure: string;
  readonly evidenceIds: readonly string[];
}

export type BugTriggerCompileIssueCode =
  | "missing-starting-condition"
  | "missing-observable-failure"
  | "missing-evidence"
  | "too-many-steps"
  | "empty-action"
  | "unusable-tester-step";

export interface BugTriggerCompileIssue {
  readonly code: BugTriggerCompileIssueCode;
  readonly message: string;
}

export type CompileBugTriggerResult =
  | {
      readonly ok: true;
      readonly steps: readonly string[];
      readonly evidenceIds: readonly string[];
      readonly gameplayBasis: BugTriggerGameplayBasis;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly BugTriggerCompileIssue[];
    };

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function terminal(value: string): string {
  const normalized = clean(value);
  if (!normalized) return normalized;
  return /[.!?]$/.test(normalized)
    ? normalized
    : normalized + ".";
}

export function compileBugTrigger(
  draft: BugTriggerDraft,
): CompileBugTriggerResult {
  const issues: BugTriggerCompileIssue[] = [];
  const startingCondition =
    clean(draft.startingCondition);
  const actions = (draft.actions ?? []).map(clean);
  const observableFailure =
    clean(draft.observableFailure);
  const evidenceIds = [
    ...new Set(
      draft.evidenceIds
        .map(clean)
        .filter(Boolean),
    ),
  ].sort();

  if (!startingCondition) {
    issues.push({
      code: "missing-starting-condition",
      message:
        "Bug Trigger requires a concrete in-game starting condition.",
    });
  }

  if (!observableFailure) {
    issues.push({
      code: "missing-observable-failure",
      message:
        "Bug Trigger requires the visible wrong result that proves the bug.",
    });
  }

  if (evidenceIds.length === 0) {
    issues.push({
      code: "missing-evidence",
      message:
        "AI-authored Bug Trigger requires evidence from the same confirmed defect.",
    });
  }

  if (actions.some((action) => !action)) {
    issues.push({
      code: "empty-action",
      message:
        "Bug Trigger actions must be non-empty in-game steps.",
    });
  }

  const totalSteps =
    1 + actions.length + 1;
  if (totalSteps > 5) {
    issues.push({
      code: "too-many-steps",
      message:
        "Bug Trigger must stay within five tester-facing steps.",
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const steps = [
    terminal(startingCondition),
    ...actions.map(terminal),
    "Confirm: " + terminal(observableFailure),
  ];
  // Reuse the exact final-report copy gate rather than accepting AI steps
  // that cannot subsequently be published or followed by a tester.
  const copyIssues = reviewTesterReproductionSteps(steps, "bugTrigger");
  if (copyIssues.length > 0) {
    return {
      ok: false,
      issues: copyIssues.map(issue => ({
        code: "unusable-tester-step" as const,
        message: issue.path + ": " + issue.message,
      })),
    };
  }

  return {
    ok: true,
    steps,
    evidenceIds,
    gameplayBasis: draft.gameplayBasis,
    issues: [],
  };
}
