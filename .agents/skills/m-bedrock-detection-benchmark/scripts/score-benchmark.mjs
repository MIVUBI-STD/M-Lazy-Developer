import { readFileSync } from "node:fs";
import { resolve } from "node:path";


/** Optional full-map claim scoring in the existing benchmark owner.
 * A metrics-only result cannot become full-map semantic accuracy evidence.
 * The score is source-review evidence, not a fresh detector run or runtime proof.
 */
function adjudicateFullMapClaims(result) {
  const review = result.fullMapReview;
  if (!review || typeof review !== "object" ||
      typeof review.frozenObservationFile !== "string" ||
      typeof review.frozenExpectationFile !== "string" ||
      typeof review.reviewedBy !== "string" || !review.reviewedBy.trim() ||
      !Array.isArray(review.decisions)) {
    throw new Error("Full-map scoring requires frozen observation, frozen expectation, reviewer, and per-claim decisions.");
  }
  const expectation = JSON.parse(readFileSync(resolve(review.frozenExpectationFile), "utf8"));
  const frozen = JSON.parse(readFileSync(resolve(review.frozenObservationFile), "utf8"));
  const observed = frozen.observed;
  const sha = expectation.artifact?.sha256?.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha ?? "") ||
      frozen.kind !== "selected-map-audit-observed-output" ||
      frozen.schemaVersion !== 1 ||
      !/^[a-f0-9]{64}$/.test(frozen.artifact?.sha256 ?? "") ||
      sha !== frozen.artifact.sha256 ||
      observed?.schemaVersion !== 2 ||
      observed?.artifactFingerprint !== sha ||
      observed?.evidenceScope?.mode !== "selected-map-version-only" ||
      observed?.evidenceScope?.archiveSourcesUsed !== false ||
      observed?.gameplayFlowBasis !== "AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY" ||
      !observed?.control ||
      !Array.isArray(observed.bugs) ||
      !Array.isArray(observed.designMismatches) ||
      !/^[a-f0-9]{40}$/.test(frozen.execution?.gitCommit ?? "") ||
      frozen.execution?.artifactBinding !== "EXACT_SELECTED_ARTIFACT_SHA256_MATCH" ||
      frozen.execution?.gitCommitRole !==
        "FREEZE_ENVIRONMENT_ONLY_NOT_AUDIT_EXECUTION_PROOF") {
    throw new Error("Full-map benchmark observation has no matching canonical frozen artifact SHA-256 receipt.");
  }
  if (result.expectationId !== expectation.id ||
      result.schemaVersion !== 1 ||
      !["calibration", "acceptance", "regression"].includes(expectation.lane) ||
      expectation.provenance?.frozenBeforeRun !== true) {
    throw new Error("Full-map expectation ID, lane or independent freeze provenance is invalid.");
  }
  // These are configured inspection-target requirements, not live client proof.
  if (!["bedrock", "education"].includes(expectation.target?.edition) ||
      typeof expectation.target?.minecraftVersion !== "string" ||
      observed.auditTarget?.edition !== expectation.target.edition ||
      observed.auditTarget?.minecraftVersion !== expectation.target.minecraftVersion ||
      observed.auditTarget?.source !== "selected-audit-runtime-target-not-live-observation") {
    throw new Error("Full-map benchmark target edition/version is missing, unknown or differs from the frozen expectation.");
  }
  const approvedTime = Date.parse(expectation.provenance.approvedAt ?? "");
  const frozenTime = Date.parse(frozen.execution?.frozenAt ?? "");
  const reviewedTime = Date.parse(review.reviewedAt ?? "");
  if (![approvedTime, frozenTime, reviewedTime].every(Number.isFinite) ||
      !(approvedTime < frozenTime && frozenTime <= reviewedTime)) {
    throw new Error("Full-map expectation approval, observation freeze and review timestamps must have verifiable chronological order.");
  }
  if (expectation.lane === "acceptance" &&
      (review.blindDeclared !== true || review.outputFrozenBeforeReveal !== true)) {
    throw new Error("Blind full-map acceptance requires explicit sealed-observation and reviewer blind declarations.");
  }
  const claims = expectation.expected?.claims;
  if (!Array.isArray(claims) || !claims.length ||
      claims.some(item => typeof item?.id !== "string" || !item.id.trim() ||
        !["supported", "rejected", "unknown"].includes(item.expectedClass) ||
        typeof item.subject !== "string" || !item.subject.trim() ||
        !Array.isArray(item.sourceRefs) || item.sourceRefs.length === 0 ||
        item.sourceRefs.some(ref => typeof ref !== "string" || !ref.trim()) ||
        typeof item.proofCeiling !== "string" || !item.proofCeiling.trim())) {
    throw new Error("Full-map scoring requires independently frozen, source-grounded positive, negative and/or unknown claim records.");
  }
  const byClaim = new Map(claims.map(claim => [claim.id, claim]));
  if (byClaim.size !== claims.length || review.decisions.length !== claims.length) {
    throw new Error("Full-map claim denominator is incomplete or frozen claim IDs are duplicated.");
  }
  // Ground affirmative observations in evidence IDs actually exported by
  // the canonical V2 report, rather than free-text reviewer assertions.
  const exposedIds = new Set();
  const collect = (value, key = "", depth = 0) => {
    if (depth > 64 || value == null) return;
    if (Array.isArray(value)) {
      if (/^(?:evidenceIds|sourceEvidenceIds|supportingEvidenceIds|stateOperationIds|worldEffectIds|executionEdgeIds|sourceStepIds)$/.test(key)) {
        for (const id of value) if (typeof id === "string") exposedIds.add(id);
      }
      for (const item of value) collect(item, "", depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const [child, item] of Object.entries(value)) collect(item, child, depth + 1);
    }
  };
  collect(observed);
  const counts = { tp: 0, tn: 0, fp: 0, fn: 0, unknown: 0 };
  let correctUnknown = 0;
  let insufficient = 0;
  const reviewed = new Set();
  for (const decision of review.decisions) {
    const claim = byClaim.get(decision?.claimId);
    if (!claim || reviewed.has(decision.claimId) ||
        !["supported", "rejected", "unknown"].includes(decision.observedClass) ||
        typeof decision.reason !== "string" || decision.reason.trim().length < 10 ||
        !Array.isArray(decision.observedEvidenceIds)) {
      throw new Error("Full-map adjudication lacks one unique frozen claim, observed class, reason or evidence array.");
    }
    reviewed.add(decision.claimId);
    if (decision.observedClass === "supported" &&
        (decision.observedEvidenceIds.length === 0 ||
         decision.observedEvidenceIds.some(id =>
           typeof id !== "string" || !exposedIds.has(id)))) {
      throw new Error("A supported full-map observation must cite evidence IDs present in the frozen canonical report.");
    }
    if (claim.expectedClass === "supported") {
      if (decision.observedClass === "supported") counts.tp += 1;
      else {
        counts.fn += 1;
        if (decision.observedClass === "unknown") counts.unknown += 1;
      }
    } else if (claim.expectedClass === "rejected") {
      if (decision.observedClass === "rejected") counts.tn += 1;
      else if (decision.observedClass === "supported") counts.fp += 1;
      else { counts.unknown += 1; insufficient += 1; }
    } else if (decision.observedClass === "unknown") {
      counts.unknown += 1;
      correctUnknown += 1;
    } else counts.fp += 1; // Overconfidently deciding an unproven claim.
  }
  for (const key of ["tp", "tn", "fp", "fn", "unknown"]) {
    if (result.metrics?.[key] !== counts[key]) {
      throw new Error("Submitted full-map aggregate " + key +
        " disagrees with independently identified per-claim adjudications.");
    }
  }
  // Count correct UNKNOWN separately: abstention is not a true negative.
  // Unknown from a missed positive is also a false negative for recall;
  // metrics.unknown is an orthogonal abstention count, not a disjoint bucket.
  const expectedClass = counts.fp > 0 ? "false-positive" :
    counts.fn > 0 ? "false-negative" :
    insufficient > 0 ? "evidence-insufficient" : "pass";
  if (result.resultClass !== expectedClass) {
    throw new Error("Full-map resultClass must agree with per-claim evidence: " + expectedClass);
  }
  return {
    counts,
    receipt: {
      scope: "FULL_MAP_SOURCE_REVIEW_NOT_RUNTIME_PROOF",
      artifactSha256: sha,
      expectationId: expectation.id,
      reviewedClaims: claims.length,
      correctUnknown,
      insufficient,
      reviewer: review.reviewedBy,
      chronology: "DECLARED_METADATA_CHECKED_NOT_INDEPENDENTLY_ATTESTED",
      blindIndependence: expectation.lane === "acceptance"
        ? "REVIEWER_DECLARED_NOT_INDEPENDENTLY_ATTESTED"
        : "NOT_BLIND_CALIBRATION_OR_REGRESSION",
      auditCommit: "NOT_INDEPENDENTLY_ATTESTED_BY_FREEZE_GIT_COMMIT",
    },
  };
}

const path = process.argv[2];
if (!path) {
  throw new Error("Usage: node score-benchmark.mjs <result.json>");
}

const data = JSON.parse(readFileSync(path, "utf8"));
const fullMap = data.evaluationScope === "full-map-claim-review"
  ? adjudicateFullMapClaims(data)
  : undefined;
if (data.evaluationScope !== undefined &&
    !["full-map-claim-review", "reduced-fixture"].includes(data.evaluationScope)) {
  throw new Error("Unsupported benchmark evaluationScope.");
}
const metrics = fullMap?.counts ?? data.metrics ?? {};

for (const key of ["tp", "tn", "fp", "fn", "unknown"]) {
  if (!Number.isInteger(metrics[key]) || metrics[key] < 0) {
    throw new Error(`metrics.${key} must be a non-negative integer`);
  }
}

const precision =
  metrics.tp + metrics.fp === 0
    ? null
    : metrics.tp / (metrics.tp + metrics.fp);

const recall =
  metrics.tp + metrics.fn === 0
    ? null
    : metrics.tp / (metrics.tp + metrics.fn);

const specificity =
  metrics.tn + metrics.fp === 0
    ? null
    : metrics.tn / (metrics.tn + metrics.fp);

const falsePositiveRate =
  metrics.fp + metrics.tn === 0
    ? null
    : metrics.fp / (metrics.fp + metrics.tn);

const auditQuality = data.auditQuality ?? undefined;
const totalVisibleFindings =
  auditQuality === undefined
    ? undefined
    : (
        auditQuality.totalVisibleFindings ??
        auditQuality.proven +
          auditQuality.needValidation
      );
const provenRate =
  auditQuality === undefined ||
  totalVisibleFindings === 0
    ? null
    : auditQuality.proven /
      totalVisibleFindings;
const needValidationRate =
  auditQuality === undefined ||
  totalVisibleFindings === 0
    ? null
    : auditQuality.needValidation /
      totalVisibleFindings;
const runtimeResidueRate =
  auditQuality === undefined ||
  totalVisibleFindings === 0
    ? null
    : auditQuality.runtimeResidue /
      totalVisibleFindings;

const output = {
  ...data,
  metrics: {
    ...metrics,
    precision,
    recall,
    specificity,
    falsePositiveRate,
  },
  ...(auditQuality === undefined
    ? {}
    : {
        auditQuality: {
          ...auditQuality,
          totalVisibleFindings,
          provenRate,
          needValidationRate,
          runtimeResidueRate,
        },
      }),
  ...(fullMap
    ? { fullMapProof: fullMap.receipt }
    : { benchmarkEvidenceBoundary:
        "AGGREGATE_INPUT_ONLY_NOT_CURRENT_FULL_MAP_EVIDENCE" }),
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
