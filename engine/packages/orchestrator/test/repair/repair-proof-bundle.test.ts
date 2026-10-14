import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../../graph/src/index.js";
import { createPatchTransaction } from "../../../repair/src/index.js";
import { analyzeRepairCounterfactual } from "../../src/repair/repair-counterfactual.js";
import { decideRepairBlastRadius } from "../../src/repair/repair-blast-radius.js";
import { decideRepairAdmission } from "../../src/repair/repair-admission.js";
import { createRepairProofBundle, validateRepairProofBundle } from "../../src/repair/repair-proof-bundle.js";
import { semanticGraphFingerprint } from "../../src/workflow/semantic-graph-fingerprint.js";
import { fixtureRepairAuthorization } from "../../../repair/test/fixture-authorization.js";

function decisionBasis(graph: SemanticGraph) {
  return {
    sourceFingerprint: "abc",
    graphFingerprint: semanticGraphFingerprint(graph),
    runtimeEvidenceRevision: "evidence-current",
  };
}

function setup() {
  const graph = new SemanticGraph();
  const source = (relativePath: string) => ({
    artifactId: "art-1",
    relativePath,
  });

  graph.addNode({
    id: "function:p:target",
    identity: { kind: "function", scope: "p", identifier: "target" },
    kind: "function",
    identifier: "target",
    source: source("functions/target.mcfunction"),
  });
  graph.addNode({
    id: "function:p:caller",
    identity: { kind: "function", scope: "p", identifier: "caller" },
    kind: "function",
    identifier: "caller",
    source: source("functions/caller.mcfunction"),
  });
  graph.addEdge({
    from: "function:p:caller",
    type: "CALLS",
    targetIdentifier: "target",
    status: "resolved",
    to: "function:p:target",
    evidence: { source: source("functions/caller.mcfunction") },
  });

  const transaction = createPatchTransaction({
    title: "demo",
    sourceFingerprint: "abc",
    authorization: fixtureRepairAuthorization("abc"),
    operations: [{
      kind: "replace-text",
      source: source("functions/target.mcfunction"),
      expected: "a",
      replacement: "b",
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected: "abc",
    }],
    validation: [],
  });

  const impact = analyzeRepairCounterfactual(graph, {
    transaction,
    changedNodeIds: ["function:p:target"],
  });
  const blast = decideRepairBlastRadius(impact);
  const diagnostic = {
    incidentId: "incident-1",
    activeCandidateIds: ["candidate"],
    disposition: "repair-eligible" as const,
    selectedCandidateId: "candidate",
    effectiveEvidenceLevel: "proven-with-observed-outcome" as const,
    proofState: "causal" as const,
    claimStrength: "proven-runtime" as const,
    reasons: ["runtime proof"],
  };
  const admission = decideRepairAdmission(
    transaction,
    diagnostic,
    blast,
  );

  return { graph, transaction, impact, blast, diagnostic, admission };
}

describe("repair proof bundle", () => {
  it("records transitive revalidation scope and supporting invariants", () => {
    const { graph, transaction, impact, blast, diagnostic, admission } = setup();
    const bundle = createRepairProofBundle(
      transaction,
      diagnostic,
      impact,
      blast,
      admission,
      decisionBasis(graph),
      ["invariant::ready-before-start"],
    );

    expect(bundle.requiredRevalidationNodeIds)
      .toEqual(["function:p:caller"]);
    expect(bundle.requiredRevalidationPaths)
      .toEqual(["functions/caller.mcfunction"]);
    expect(bundle.supportingInvariantIds)
      .toEqual(["invariant::ready-before-start"]);
    expect(bundle.impactTraces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        changedNodeId: "function:p:target",
        affectedNodeId: "function:p:caller",
        depth: 1,
      }),
    ]));
  });

  it("retains causal intervention provenance in the repair proof bundle", () => {
    const { graph, transaction, impact, blast, diagnostic, admission } = setup();
    const withProvenance = {
      ...diagnostic,
      causalProof: {
        state: "causal" as const,
        interventionIds: ["exp:chunk"],
        interventionProvenance: [{
          interventionId: "exp:chunk",
          experimentRevision: "rev-1",
          predicateId: "chunk-not-ready",
          controlledFactorIds: ["chunk-loaded"],
          controlledFactorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          controlState: "absent" as const,
          treatmentState: "present" as const,
          expectedContrastDisposition: "matched" as const,
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          evidenceIds: ["e:1"],
        }],
      },
    };

    const bundle = createRepairProofBundle(
      transaction,
      withProvenance,
      impact,
      blast,
      admission,
      decisionBasis(graph),
    );

    expect(bundle.causalInterventionProvenance).toEqual([
      expect.objectContaining({
        interventionId: "exp:chunk",
        predicateId: "chunk-not-ready",
        controlledFactorIds: ["chunk-loaded"],
        controlledFactorContrasts: [{
          factorId: "chunk-loaded",
          controlValue: false,
          treatmentValue: true,
        }],
      }),
    ]);
  });

  it("fails closed when decisions belong to a different transaction", () => {
    const { graph, transaction, impact, blast, diagnostic, admission } = setup();

    expect(() => createRepairProofBundle(
      transaction,
      diagnostic,
      impact,
      { ...blast, transactionId: "other" },
      admission,
      decisionBasis(graph),
    )).toThrow(/does not belong to transaction/);
  });

  it("rejects internally contradictory proof metadata", () => {
    const { graph, transaction, impact, blast, diagnostic, admission } = setup();
    const bundle = createRepairProofBundle(
      transaction,
      diagnostic,
      impact,
      blast,
      admission,
      decisionBasis(graph),
    );

    const errors = validateRepairProofBundle(
      transaction,
      {
        ...bundle,
        admissionDisposition: "eligible",
        diagnosticDisposition: "proposal-only",
      },
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("Eligible admission requires repair-eligible"),
    ]));
  });

  it("rejects malformed impact traces", () => {
    const { graph, transaction, impact, blast, diagnostic, admission } = setup();
    const bundle = createRepairProofBundle(
      transaction,
      diagnostic,
      impact,
      blast,
      admission,
      decisionBasis(graph),
    );

    const errors = validateRepairProofBundle(
      transaction,
      {
        ...bundle,
        impactTraces: [{
          changedNodeId: "unknown",
          affectedNodeId: "unknown",
          nodePath: ["wrong"],
          edgePath: ["edge"],
          depth: 3,
        }],
      },
    );

    expect(errors.join(" ")).toMatch(/trace/i);
  });

  it("rejects proven-runtime proof without a runtime evidence revision", () => {
    const { graph, transaction, impact, blast, diagnostic, admission } = setup();
    const bundle = createRepairProofBundle(
      transaction,
      diagnostic,
      impact,
      blast,
      admission,
      {
        sourceFingerprint: "abc",
        graphFingerprint: semanticGraphFingerprint(graph),
      },
    );

    const errors = validateRepairProofBundle(
      transaction,
      bundle,
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/runtime evidence revision/i),
    ]));
  });
});
