import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../../graph/src/index.js";
import { createPatchTransaction } from "../../../repair/src/index.js";
import { evaluateRepairAdmissionPipeline } from "../../src/repair/repair-admission-pipeline.js";
import { fixtureRepairAuthorization } from "../../../repair/test/fixture-authorization.js";

function source(relativePath: string) {
  return { artifactId: "art-1", relativePath };
}

function repairAuthority(transaction: {
  id: string;
}) {
  return {
    kind: "approved-bug" as const,
    approved: {
      map: {
        name: "Repair Test",
        mapVersion: "1.0.0",
        drive: "https://drive.google.com/file/d/map/view",
        baseVersion: "1.26.20",
        testedVersion: "1.26.32",
      },
      approvedSemanticKeys: ["bug:approved"],
      rejectedSemanticKeys: [],
      decisions: [{
        semanticKey: "bug:approved",
        decision: "approve" as const,
      }],
    },
    bugSemanticKey: "bug:approved",
    preservationContract: {
      schemaVersion: 1 as const,
      id: "preserve:" + transaction.id,
      transactionId: transaction.id,
      mustChangeInvariantIds: ["invariant::ready"],
      mustPreserveInvariantIds: ["invariant::preserve"],
    },
  };
}

function fixture() {
  const graph = new SemanticGraph();
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

  return { graph, transaction };
}

describe("repair admission pipeline", () => {
  it("blocks mutation-authorizing repair without Approved Bug authority", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-dependency-violation",
        proofState: "causal",
        claimStrength: "proven-static",
        reasons: ["static causal proof"],
      },
      changedNodeIds: ["function:p:target"],
      decisionBasis: {
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
      },
      preservationReadiness: {
        contractId: "preserve:" + transaction.id,
        transactionId: transaction.id,
        disposition: "ready",
        baselineEvidenceIds: ["baseline:ready"],
        reasons: ["ready"],
      },
    });

    expect(result.admission.disposition).toBe("blocked");
    expect(result.admission.reasons.join(" ")).toMatch(
      /workflow authority|Approved Bug/i,
    );
  });


  it("runs counterfactual, blast radius, admission, and proof in one deterministic path", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        proofState: "causal",
        claimStrength: "proven-runtime",
        reasons: ["causal runtime proof"],
      },
      changedNodeIds: ["function:p:target"],
      repairAuthority: repairAuthority(transaction),
      supportingInvariantIds: ["invariant::ready"],
      decisionBasis: {
        runtimeEvidenceRevision: "evidence-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
      },
      preservationReadiness: {
        contractId: "preserve:" + transaction.id,
        transactionId: transaction.id,
        disposition: "ready",
        baselineEvidenceIds: [
          "baseline:broken",
          "baseline:healthy",
        ],
        reasons: ["ready"],
      },
    });

    expect(result.blastRadius.disposition).toBe("bounded");
    expect(result.admission.disposition).toBe("eligible");
    expect(result.proof.supportingInvariantIds)
      .toEqual(["invariant::ready"]);
    expect(result.proof.preservationReadinessDisposition)
      .toBe("ready");
    expect(result.proof.preservationBaselineEvidenceIds)
      .toEqual(["baseline:broken", "baseline:healthy"]);
    expect(result.proof.requiredRevalidationNodeIds)
      .toEqual(["function:p:caller"]);
  });

  it("binds controlled-experiment repair proof to a deterministic experiment envelope revision", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "guarded-repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        proofState: "intervention-supported",
        causalProof: {
          state: "intervention-supported",
          interventionIds: ["exp:chunk"],
          interventionProvenance: [{
            interventionId: "exp:chunk",
            experimentRevision: "rev-1",
            predicateId: "chunk-ready",
            controlledFactorIds: ["chunk-loaded"],
            controlledFactorContrasts: [{
              factorId: "chunk-loaded",
              controlValue: false,
              treatmentValue: true,
            }],
            controlState: "absent",
            treatmentState: "present",
            expectedContrastDisposition: "matched",
            targetProfileFingerprint: "profile-a",
            fixtureFingerprint: "fixture-a",
            evidenceIds: ["runtime:chunk-ready"],
          }],
        },
        claimStrength: "proven-runtime",
        reasons: ["controlled runtime proof"],
      },
      changedNodeIds: ["function:p:target"],
      repairAuthority: repairAuthority(transaction),
      decisionBasis: {
        runtimeEvidenceRevision: "evidence-current",
        preservationContractRevision:
          "preservation-contract-current",
        preservationBaselineRevision:
          "preservation-baseline-current",
      },
      preservationReadiness: {
        contractId: "preserve:" + transaction.id,
        transactionId: transaction.id,
        disposition: "ready",
        baselineEvidenceIds: [
          "baseline:broken",
          "baseline:healthy",
        ],
        reasons: ["ready"],
      },
    });

    expect(
      result.proof.decisionBasis.runtimeExperimentContractRevision,
    ).toMatch(/^runtime-experiment-envelope:/);
  });

  it("cannot bypass a blocked diagnostic decision", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "proposal-only",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "corroborated-candidate",
        claimStrength: "corroborated",
        reasons: ["insufficient proof"],
      },
      changedNodeIds: ["function:p:target"],
    });

    expect(result.admission.disposition).toBe("blocked");
    expect(result.proof.admissionDisposition).toBe("blocked");
  });
  it("rejects runtime-proven admission without evidence-bound decision basis", () => {
    const { graph, transaction } = fixture();

    expect(() => evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        claimStrength: "proven-runtime",
        reasons: ["runtime proof"],
      },
      changedNodeIds: ["function:p:target"],
    })).toThrow(/runtimeEvidenceRevision/);
  });

  it("blocks guarded intervention proof until preservation baseline is ready", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "guarded-repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        proofState: "intervention-supported",
        claimStrength: "proven-runtime",
        reasons: ["intervention-supported runtime proof"],
      },
      changedNodeIds: ["function:p:target"],
      repairAuthority: repairAuthority(transaction),
      decisionBasis: {
        runtimeEvidenceRevision: "evidence-current",
      },
    });

    expect(result.admission.disposition).toBe("blocked");
    expect(result.admission.reasons.join(" ")).toMatch(
      /preservation readiness/,
    );
  });

  it("admits guarded intervention proof only after preservation baseline is ready", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "guarded-repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        proofState: "intervention-supported",
        claimStrength: "proven-runtime",
        reasons: ["intervention-supported runtime proof"],
      },
      changedNodeIds: ["function:p:target"],
      repairAuthority: repairAuthority(transaction),
      decisionBasis: {
        runtimeEvidenceRevision: "evidence-current",
        preservationContractRevision:
          "preservation-contract-current",
        preservationBaselineRevision:
          "preservation-baseline-current",
      },
      preservationReadiness: {
        contractId: "preserve:" + transaction.id,
        transactionId: transaction.id,
        disposition: "ready",
        baselineEvidenceIds: [
          "baseline:broken",
          "baseline:healthy",
        ],
        reasons: ["ready"],
      },
    });

    expect(result.admission.disposition).toBe("guarded");
  });
});
