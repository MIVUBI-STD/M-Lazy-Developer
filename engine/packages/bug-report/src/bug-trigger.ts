import { reviewTesterReproductionSteps } from "./copy-quality.js";

export type BugTriggerGameplayBasis =
  | "authored-gameplay"
  | "runtime-gameplay"
  | "tester-gameplay";

export interface BugTriggerStepEvidence {
  /** Source evidence of the player-visible starting setup. */
  readonly startingCondition: readonly string[];
  /** One source-witness group per player action, in authored order. */
  readonly actions: readonly (readonly string[])[];
  /** Evidence of the wrong observable outcome, not just expected behavior. */
  readonly observableFailure: readonly string[];
}

export interface BugTriggerDraft {
  readonly gameplayBasis: BugTriggerGameplayBasis;
  readonly startingCondition: string;
  readonly actions?: readonly string[];
  readonly observableFailure: string;
  readonly evidenceIds: readonly string[];
  /**
   * Trace step claims separately. Optional while reading earlier draft shapes,
   * but required by the compiler before a new AI trigger can be published.
   * These references must be part of evidenceIds and the same selected defect.
   */
  readonly stepEvidence?: BugTriggerStepEvidence;
}

export type BugTriggerCompileIssueCode =
  | "missing-starting-condition"
  | "missing-observable-failure"
  | "missing-evidence"
  | "too-many-steps"
  | "empty-action"
  | "unusable-tester-step"
  | "missing-step-evidence"
  | "step-evidence-count-mismatch"
  | "unbound-step-evidence";

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
      readonly stepEvidence: BugTriggerStepEvidence;
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

  const stepEvidence = draft.stepEvidence;
  if (stepEvidence === undefined) {
    return {
      ok: false,
      issues: [{
        code: "missing-step-evidence",
        message: "AI Bug Trigger needs evidence for its starting condition, each player action, and the observed failure.",
      }],
    };
  }
  if (stepEvidence.actions.length !== actions.length) {
    return {
      ok: false,
      issues: [{
        code: "step-evidence-count-mismatch",
        message: "Bug Trigger action evidence must correspond one-to-one with the authored player actions.",
      }],
    };
  }
  const normalize = (ids: readonly string[]) =>
    [...new Set(ids.map(clean).filter(Boolean))].sort();
  const trace: BugTriggerStepEvidence = {
    startingCondition: normalize(stepEvidence.startingCondition),
    actions: stepEvidence.actions.map(normalize),
    observableFailure: normalize(stepEvidence.observableFailure),
  };
  const segments = [
    trace.startingCondition,
    ...trace.actions,
    trace.observableFailure,
  ];
  if (segments.some(ids => ids.length === 0)) {
    return {
      ok: false,
      issues: [{
        code: "missing-step-evidence",
        message: "Each Bug Trigger setup, player action, and observed failure requires at least one concrete evidence ID.",
      }],
    };
  }
  const declaredIds = new Set(evidenceIds);
  const unbound = [...new Set(segments.flat()
    .filter(id => !declaredIds.has(id)))].sort();
  if (unbound.length > 0) {
    return {
      ok: false,
      issues: [{
        code: "unbound-step-evidence",
        message: "Bug Trigger step references are absent from its declared evidence: " +
          unbound.join(", ") + ".",
      }],
    };
  }

  return {
    ok: true,
    steps,
    evidenceIds,
    gameplayBasis: draft.gameplayBasis,
    stepEvidence: trace,
    issues: [],
  };
}
