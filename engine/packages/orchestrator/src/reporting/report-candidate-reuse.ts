import type {
  AuditReportCandidate,
  RejectedReportCandidate,
  ReportCandidateNextEvidenceNeed,
} from "./report-defect-collector.js";
import {
  describeAuditReportCandidate,
} from "./report-defect-collector.js";

const REUSABLE_WITH_UNCHANGED_EVIDENCE = new Set<
  ReportCandidateNextEvidenceNeed
>([
  "intent-grounding",
  "contradiction-proof",
  "runtime-proof",
  "runtime-evidence-integrity",
  "expected-behavior-evidence",
]);

function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

export interface ReportCandidateReusePlan {
  readonly reevaluate: readonly AuditReportCandidate[];
  readonly reusedRejected:
    readonly RejectedReportCandidate[];
}

export function planReportCandidateReuse(
  candidates: readonly AuditReportCandidate[],
  previousRejected:
    readonly RejectedReportCandidate[],
): ReportCandidateReusePlan {
  const previous = new Map(
    previousRejected.map((item) => [
      item.route + "|" + item.semanticKey,
      item,
    ]),
  );

  const reevaluate: AuditReportCandidate[] = [];
  const reusedRejected: RejectedReportCandidate[] = [];

  for (const candidate of candidates) {
    const descriptor =
      describeAuditReportCandidate(candidate);
    const prior = previous.get(
      descriptor.route +
        "|" +
        descriptor.semanticKey,
    );

    if (
      prior !== undefined &&
      REUSABLE_WITH_UNCHANGED_EVIDENCE.has(
        prior.nextEvidenceNeed,
      ) &&
      sameSet(
        prior.evidenceIds,
        descriptor.evidenceIds,
      )
    ) {
      reusedRejected.push(prior);
      continue;
    }

    reevaluate.push(candidate);
  }

  return {
    reevaluate,
    reusedRejected,
  };
}


export interface AuditBoundRejectedCandidate {
  readonly auditRevision: string;
  readonly rejected: RejectedReportCandidate;
}

export interface AuditBoundReportCandidateReusePlan {
  readonly auditRevision: string;
  readonly reevaluate: readonly AuditReportCandidate[];
  readonly reusedRejected:
    readonly AuditBoundRejectedCandidate[];
}

export function planAuditBoundReportCandidateReuse(
  input: {
    readonly auditRevision: string;
    readonly candidates: readonly AuditReportCandidate[];
    readonly previousRejected:
      readonly AuditBoundRejectedCandidate[];
  },
): AuditBoundReportCandidateReusePlan {
  if (!input.auditRevision.trim()) {
    throw new Error(
      "Audit-bound candidate reuse requires a non-empty auditRevision.",
    );
  }

  const sameRevision = input.previousRejected
    .filter(
      (item) =>
        item.auditRevision === input.auditRevision,
    );
  const plan = planReportCandidateReuse(
    input.candidates,
    sameRevision.map((item) => item.rejected),
  );
  const reusableKeys = new Set(
    plan.reusedRejected.map(
      (item) =>
        item.route + "|" + item.semanticKey,
    ),
  );

  return {
    auditRevision: input.auditRevision,
    reevaluate: plan.reevaluate,
    reusedRejected: sameRevision
      .filter((item) =>
        reusableKeys.has(
          item.rejected.route +
            "|" +
            item.rejected.semanticKey,
        )
      ),
  };
}

export function bindRejectedCandidatesToAuditRevision(
  auditRevision: string,
  rejected: readonly RejectedReportCandidate[],
): readonly AuditBoundRejectedCandidate[] {
  if (!auditRevision.trim()) {
    throw new Error(
      "Rejected candidate binding requires a non-empty auditRevision.",
    );
  }
  return rejected.map((item) => ({
    auditRevision,
    rejected: item,
  }));
}
