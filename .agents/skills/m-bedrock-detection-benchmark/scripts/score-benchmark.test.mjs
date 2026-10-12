import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scorer = fileURLToPath(new URL("./score-benchmark.mjs", import.meta.url));
const expectationValidator = fileURLToPath(
  new URL("./validate-expectation.mjs", import.meta.url),
);
const SHA = "a".repeat(64);

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "m-bedrock-scored-claims-"));
  const paths = {
    expectation: join(root, "expectation.json"),
    frozen: join(root, "frozen.json"),
    result: join(root, "result.json"),
  };
  const expectation = {
    schemaVersion: 1, id: "claim-oracle", lane: "calibration",
    artifact: { label: "Source-scoped generic map", sha256: SHA },
    target: { edition: "bedrock", minecraftVersion: "1.26.0" },
    expected: { claims: [
      { id: "positive", subject: "Authored state relationship",
        expectedClass: "supported", sourceRefs: ["scripts/main.js:12"],
        proofCeiling: "STATIC VERIFIED" },
      { id: "negative", subject: "Disallowed gameplay identity inference",
        expectedClass: "rejected", sourceRefs: ["scripts/main.js:21"],
        proofCeiling: "STATIC VERIFIED" },
      { id: "unresolved", subject: "Concurrency outcome needs runtime",
        expectedClass: "unknown", sourceRefs: ["scripts/main.js:30"],
        proofCeiling: "LIVE GAME VERIFIED" },
    ] },
    provenance: { frozenBeforeRun: true, source: "independent source review",
      approvedAt: "2026-10-01T10:00:00Z" },
  };
  const frozen = {
    schemaVersion: 1, kind: "selected-map-audit-observed-output",
    artifact: { label: "Source-scoped generic map", sha256: SHA },
    execution: {
      frozenAt: "2026-10-02T10:00:00Z",
      gitCommit: "0".repeat(40),
      gitCommitRole: "FREEZE_ENVIRONMENT_ONLY_NOT_AUDIT_EXECUTION_PROOF",
      artifactBinding: "EXACT_SELECTED_ARTIFACT_SHA256_MATCH",
    },
    observed: {
      schemaVersion: 2, artifactId: "selected:map",
      artifactFingerprint: SHA,
      auditTarget: {
        edition: "bedrock", minecraftVersion: "1.26.0",
        source: "selected-audit-runtime-target-not-live-observation",
      },
      evidenceScope: { mode: "selected-map-version-only",
        selectedArtifact: "Source-scoped map", archiveSourcesUsed: false },
      gameplayFlowBasis: "AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY",
      control: { status: "BLOCKED" },
      gameplayStructure: { features: [{ id: "feature:one",
        sourceEvidenceIds: ["src:verified-state"] }] },
      bugs: [], designMismatches: [],
    },
  };
  const result = {
    schemaVersion: 1, expectationId: "claim-oracle",
    resultClass: "pass", evaluationScope: "full-map-claim-review",
    metrics: { tp: 1, tn: 1, fp: 0, fn: 0, unknown: 1 },
    fullMapReview: {
      frozenObservationFile: paths.frozen,
      frozenExpectationFile: paths.expectation,
      reviewedBy: "Independent reviewer fixture",
      reviewedAt: "2026-10-03T10:00:00Z",
      decisions: [
        { claimId: "positive", observedClass: "supported",
          reason: "Exact authored state link is present in source evidence.",
          observedEvidenceIds: ["src:verified-state"] },
        { claimId: "negative", observedClass: "rejected",
          reason: "Selected source contradicts the claimed false scope relation.",
          observedEvidenceIds: [] },
        { claimId: "unresolved", observedClass: "unknown",
          reason: "Configured source does not establish real client concurrency.",
          observedEvidenceIds: [] },
      ],
    },
  };
  const save = () => {
    writeFileSync(paths.expectation, JSON.stringify(expectation));
    writeFileSync(paths.frozen, JSON.stringify(frozen));
    writeFileSync(paths.result, JSON.stringify(result));
  };
  const run = () => {
    save();
    return spawnSync(process.execPath, [scorer, paths.result],
      { encoding: "utf8" });
  };
  return { expectation, frozen, result, paths, save, run,
    cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("source-grounded full-map review scores all frozen positive/negative/unknown claims", () => {
  const f = fixture();
  try {
    const done = f.run();
    assert.equal(done.status, 0, done.stderr);
    const scored = JSON.parse(done.stdout);
    assert.equal(scored.metrics.tp, 1);
    assert.equal(scored.metrics.tn, 1);
    assert.equal(scored.metrics.fp, 0);
    assert.equal(scored.metrics.fn, 0);
    assert.equal(scored.metrics.unknown, 1);
    assert.equal(scored.fullMapProof.correctUnknown, 1);
    assert.equal(scored.fullMapProof.scope,
      "FULL_MAP_SOURCE_REVIEW_NOT_RUNTIME_PROOF");
    assert.equal(scored.fullMapProof.auditCommit,
      "NOT_INDEPENDENTLY_ATTESTED_BY_FREEZE_GIT_COMMIT");
  } finally { f.cleanup(); }
});

test("multi-claim expectation validator accepts canonical independent source claims", () => {
  const f = fixture();
  try {
    f.save();
    const checked = spawnSync(process.execPath,
      [expectationValidator, f.paths.expectation],
      { encoding: "utf8" });
    assert.equal(checked.status, 0, checked.stderr);
    assert.match(checked.stdout, /expectation-valid/);
  } finally { f.cleanup(); }
});

test("full-map review refuses raw scores, wrong SHA, target, claim count and forged evidence", () => {
  const scenarios = [
    ["missing review", f => { delete f.result.fullMapReview; }],
    ["other archive SHA", f => { f.frozen.artifact.sha256 = "b".repeat(64); }],
    ["unverified freezer role", f => { delete f.frozen.execution.gitCommitRole; }],
    ["missing canonical report control", f => { delete f.frozen.observed.control; }],
    ["different configured Minecraft version", f => {
      f.frozen.observed.auditTarget.minecraftVersion = "1.25.0";
    }],
    ["incorrect historical chronology", f => {
      f.expectation.provenance.approvedAt = "2026-10-05T10:00:00Z";
    }],
    ["unreviewed frozen claim", f => { f.result.fullMapReview.decisions.pop(); }],
    ["unresolved evidence ID", f => {
      f.result.fullMapReview.decisions[0].observedEvidenceIds = ["src:invented"];
    }],
    ["fabricated aggregate counts", f => { f.result.metrics.tp = 2; }],
    ["mismatched pass classification", f => {
      f.result.fullMapReview.decisions[1].observedClass = "supported";
      f.result.fullMapReview.decisions[1].observedEvidenceIds =
        ["src:verified-state"];
    }],
  ];
  for (const [label, sabotage] of scenarios) {
    const f = fixture();
    try {
      sabotage(f);
      const done = f.run();
      assert.notEqual(done.status, 0, label);
    } finally { f.cleanup(); }
  }
});

test("blind acceptance cannot be inferred from source receipt or reviewer presence", () => {
  const f = fixture();
  try {
    f.expectation.lane = "acceptance";
    const denied = f.run();
    assert.notEqual(denied.status, 0);
    f.result.fullMapReview.blindDeclared = true;
    f.result.fullMapReview.outputFrozenBeforeReveal = true;
    const selfDeclared = f.run();
    assert.equal(selfDeclared.status, 0, selfDeclared.stderr);
    const proof = JSON.parse(selfDeclared.stdout).fullMapProof;
    assert.equal(proof.blindIndependence,
      "REVIEWER_DECLARED_NOT_INDEPENDENTLY_ATTESTED");
  } finally { f.cleanup(); }
});

test("legacy reduced-fixture metric normalization is unchanged", () => {
  const root = mkdtempSync(join(tmpdir(), "m-bedrock-old-benchmark-"));
  try {
    const file = join(root, "legacy.json");
    writeFileSync(file, JSON.stringify({
      schemaVersion: 1, expectationId: "legacy-source",
      resultClass: "pass",
      metrics: { tp: 2, tn: 1, fp: 0, fn: 0, unknown: 0 },
    }));
    const done = spawnSync(process.execPath, [scorer, file],
      { encoding: "utf8" });
    assert.equal(done.status, 0, done.stderr);
    const scored = JSON.parse(done.stdout);
    assert.equal(scored.metrics.precision, 1);
    assert.equal(scored.metrics.recall, 1);
    assert.equal(scored.fullMapProof, undefined);
    assert.equal(scored.benchmarkEvidenceBoundary,
      "AGGREGATE_INPUT_ONLY_NOT_CURRENT_FULL_MAP_EVIDENCE");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
