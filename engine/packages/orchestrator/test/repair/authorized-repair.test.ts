import { describe, expect, it } from "vitest";
import {
  createPatchTransaction,
  patchTransactionSemanticFingerprint,
} from "../../../repair/src/index.js";
import {
  authorizeRepairMutation,
} from "../../src/repair/authorized-repair.js";
import type { RepairProofBundle } from "../../src/repair/repair-proof-bundle.js";
import {
  CONTRACT_REGISTRY_REVISION,
} from "../../../project-model/src/index.js";
import { fixtureRepairAuthorization } from "../../../repair/test/fixture-authorization.js";

function transaction(validation = true) {
  return createPatchTransaction({
    title: "demo",
    sourceFingerprint: "abc",
    authorization: fixtureRepairAuthorization("abc"),
    operations: [{
      kind: "replace-text",
      source: {
        artifactId: "art-1",
        relativePath: "functions/demo.mcfunction",
      },
      expected: "a",
      replacement: "b",
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected: "abc",
    }],
    validation: validation
      ? [{
          kind: "rebuild-graph" as const,
        }]
      : [],
  });
}

function repairAuthority(txId: string) {
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
      id: "preserve:" + txId,
      transactionId: txId,
      mustChangeInvariantIds: ["invariant::change"],
      mustPreserveInvariantIds: ["invariant::preserve"],
    },
  };
}

function proof(
  txId: string,
  disposition: RepairProofBundle["admissionDisposition"],
): RepairProofBundle {
  return {
    transactionId: txId,
    sourceFingerprint: "abc",
    graphFingerprint: "graph-current",
    decisionBasis: {
      contractRegistryRevision: CONTRACT_REGISTRY_REVISION,
      sourceFingerprint: "abc",
      graphFingerprint: "graph-current",
      semanticIrRevision: "semantic-ir-current",
      preservationContractRevision: "preservation-contract-current",
      preservationBaselineRevision: "preservation-baseline-current",
      runtimeEvidenceRevision: "evidence-current",
    },
    incidentId: "incident-1",
    selectedCandidateId: "candidate",
    diagnosticDisposition:
      disposition === "guarded"
        ? "guarded-repair-eligible"
        : "repair-eligible",
    claimStrength: "proven-runtime",
    effectiveEvidenceLevel: "proven-with-observed-outcome",
    proofState:
      disposition === "guarded"
        ? "intervention-supported"
        : "causal",
    blastRadiusDisposition: "minimal",
    admissionDisposition: disposition,
    preservationContractId: "preserve:" + txId,
    preservationReadinessDisposition: "ready",
    preservationBaselineEvidenceIds: [
      "baseline:broken",
      "baseline:healthy",
    ],
    workflowAuthorityKind: "approved-bug",
    approvedBugSemanticKey: "bug:approved",
    mustChangeInvariantIds: ["invariant::change"],
    mustPreserveInvariantIds: ["invariant::preserve"],
    supportingInvariantIds: [],
    changedNodeIds: ["function:p:demo"],
    affectedNodeIds: ["function:p:demo"],
    requiredRevalidationNodeIds: [],
    requiredRevalidationPaths: [],
    impactTraces: [],
    reasons: [],
  };
}

describe("authorized repair mutation", () => {
  it("authorizes an eligible proof with concrete validation", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
      {
        repairAuthority: repairAuthority(tx.id),
      },
    )).toMatchObject({
      authorized: true,
      mode: "eligible",
    });
  });

  it("requires post-transform proof when the patch transaction declares that proof requirement", () => {
    const tx = createPatchTransaction({
      title: "transform-bound",
      sourceFingerprint: "abc",
      authorization: fixtureRepairAuthorization("abc"),
      requiredProofs: ["post-transform"],
      operations: [{
        kind: "replace-text",
        source: {
          artifactId: "art-1",
          relativePath: "scripts/demo.ts",
        },
        expected: "old",
        replacement: "new",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "abc",
      }],
      validation: [{
        kind: "rebuild-graph",
      }],
    });

    const missing = proof(tx.id, "eligible");
    expect(
      authorizeRepairMutation(
        tx,
        missing,
        {
          currentSourceFingerprint: "abc",
          currentGraphFingerprint: "graph-current",
          semanticIrRevision: "semantic-ir-current",
          preservationContractRevision:
            "preservation-contract-current",
          preservationBaselineRevision:
            "preservation-baseline-current",
          runtimeEvidenceRevision: "evidence-current",
        },
      ),
    ).toMatchObject({
      authorized: false,
      reasons: expect.arrayContaining([
        expect.stringMatching(/post-transform|transaction fingerprint/i),
      ]),
    });

    const fingerprint =
      patchTransactionSemanticFingerprint(tx);
    const bound: RepairProofBundle = {
      ...missing,
      transactionFingerprint: fingerprint,
      postTransformProofBinding: {
        transactionId: tx.id,
        transactionFingerprint: fingerprint,
      },
      decisionBasis: {
        ...missing.decisionBasis,
        postTransformProofRevision:
          "guard-proof:impact-proof",
      },
    };

    expect(
      authorizeRepairMutation(
        tx,
        bound,
        {
          currentSourceFingerprint: "abc",
          currentGraphFingerprint: "graph-current",
          semanticIrRevision: "semantic-ir-current",
          preservationContractRevision:
            "preservation-contract-current",
          preservationBaselineRevision:
            "preservation-baseline-current",
          runtimeEvidenceRevision: "evidence-current",
          postTransformProofRevision:
            "guard-proof:impact-proof",
        },
        {
          repairAuthority: repairAuthority(tx.id),
        },
      ),
    ).toMatchObject({
      authorized: true,
      mode: "eligible",
    });
  });

  it("rejects post-transform proof binding copied from another transaction", () => {
    const txA = createPatchTransaction({
      title: "transform-a",
      sourceFingerprint: "abc",
      authorization: fixtureRepairAuthorization("abc"),
      requiredProofs: ["post-transform"],
      operations: [{
        kind: "replace-text",
        source: {
          artifactId: "art-1",
          relativePath: "scripts/demo.ts",
        },
        expected: "old",
        replacement: "new-a",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "abc",
      }],
      validation: [{
        kind: "rebuild-graph",
      }],
    });
    const txB = createPatchTransaction({
      title: "transform-b",
      sourceFingerprint: "abc",
      authorization: fixtureRepairAuthorization("abc"),
      requiredProofs: ["post-transform"],
      operations: [{
        kind: "replace-text",
        source: {
          artifactId: "art-1",
          relativePath: "scripts/demo.ts",
        },
        expected: "old",
        replacement: "new-b",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "abc",
      }],
      validation: [{
        kind: "rebuild-graph",
      }],
    });

    const fingerprintA =
      patchTransactionSemanticFingerprint(txA);
    const copied: RepairProofBundle = {
      ...proof(txB.id, "eligible"),
      transactionFingerprint: fingerprintA,
      postTransformProofBinding: {
        transactionId: txA.id,
        transactionFingerprint: fingerprintA,
      },
      decisionBasis: {
        ...proof(txB.id, "eligible").decisionBasis,
        postTransformProofRevision:
          "proof-a:impact-a",
      },
    };

    const authorization =
      authorizeRepairMutation(
        txB,
        copied,
        {
          currentSourceFingerprint: "abc",
          currentGraphFingerprint:
            "graph-current",
          semanticIrRevision:
            "semantic-ir-current",
          preservationContractRevision:
            "preservation-contract-current",
          preservationBaselineRevision:
            "preservation-baseline-current",
          runtimeEvidenceRevision:
            "evidence-current",
          postTransformProofRevision:
            "proof-a:impact-a",
        },
      );

    expect(authorization).toMatchObject({
      authorized: false,
      reasons: expect.arrayContaining([
        expect.stringMatching(
          /transaction fingerprint|another patch transaction/i,
        ),
      ]),
    });
  });

  it("blocks proof for another transaction", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof("other", "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    ).authorized).toBe(false);
  });

  it("blocks review-required and blocked admission", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "review-required"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    ).authorized).toBe(false);
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "blocked"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    ).authorized).toBe(false);
  });

  it("requires explicit authorization for guarded repair", () => {
    const tx = transaction();
    const guarded = proof(tx.id, "guarded");

    expect(authorizeRepairMutation(
      tx,
      guarded,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    ).authorized).toBe(false);

    expect(authorizeRepairMutation(
      tx,
      guarded,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
      {
        allowGuarded: true,
        repairAuthority: repairAuthority(tx.id),
      },
    )).toMatchObject({
      authorized: true,
      mode: "guarded",
    });
  });

  it("blocks causal mutation when preservation readiness is missing", () => {
    const tx = transaction();
    const original = proof(tx.id, "eligible");
    const {
      preservationContractId: _contractId,
      preservationReadinessDisposition: _readiness,
      preservationBaselineEvidenceIds: _baselineEvidence,
      ...withoutPreservation
    } = original;

    expect(authorizeRepairMutation(
      tx,
      withoutPreservation,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("refuses repair without concrete validation steps", () => {
    const tx = transaction(false);
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    ).authorized).toBe(false);
  });

  it("rejects stale semantic graph proof", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-new",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale source fingerprint proof", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "new-source",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale semantic IR proof", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-new",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale preservation baseline proof", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-new",
        runtimeEvidenceRevision: "evidence-current",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale runtime evidence proof", () => {
    const tx = transaction();
    const boundProof: RepairProofBundle = {
      ...proof(tx.id, "eligible"),
      decisionBasis: {
        ...proof(tx.id, "eligible").decisionBasis,
        runtimeEvidenceRevision: "evidence-a",
      },
    };

    expect(authorizeRepairMutation(
      tx,
      boundProof,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-b",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale repair source, realizer, experiment-contract, or post-transform proof basis", () => {
    const tx = transaction();
    const boundProof: RepairProofBundle = {
      ...proof(tx.id, "eligible"),
      decisionBasis: {
        ...proof(tx.id, "eligible").decisionBasis,
        repairStrategySourceRegistryRevision:
          "source-registry-a",
        repairRealizerRegistryRevision:
          "realizer-registry-a",
        runtimeExperimentContractRevision:
          "experiment-contract-a",
        postTransformProofRevision:
          "post-transform-a",
      },
    };

    const base = {
      currentSourceFingerprint: "abc",
      currentGraphFingerprint: "graph-current",
      semanticIrRevision: "semantic-ir-current",
      preservationContractRevision:
        "preservation-contract-current",
      preservationBaselineRevision:
        "preservation-baseline-current",
      runtimeEvidenceRevision: "evidence-current",
      repairStrategySourceRegistryRevision:
        "source-registry-a",
      repairRealizerRegistryRevision:
        "realizer-registry-a",
      runtimeExperimentContractRevision:
        "experiment-contract-a",
      postTransformProofRevision:
        "post-transform-a",
    };

    for (const stale of [{
      ...base,
      repairStrategySourceRegistryRevision:
        "source-registry-b",
    }, {
      ...base,
      repairRealizerRegistryRevision:
        "realizer-registry-b",
    }, {
      ...base,
      runtimeExperimentContractRevision:
        "experiment-contract-b",
    }, {
      ...base,
      postTransformProofRevision:
        "post-transform-b",
    }]) {
      expect(
        authorizeRepairMutation(
          tx,
          boundProof,
          stale,
        ),
      ).toMatchObject({
        authorized: false,
      });
    }

    expect(
      authorizeRepairMutation(
        tx,
        boundProof,
        base,
        {
          repairAuthority: repairAuthority(tx.id),
        },
      ),
    ).toMatchObject({
      authorized: true,
      mode: "eligible",
    });
  });

  it("accepts repair proof when runtime evidence revision still matches", () => {
    const tx = transaction();
    const boundProof: RepairProofBundle = {
      ...proof(tx.id, "eligible"),
      decisionBasis: {
        ...proof(tx.id, "eligible").decisionBasis,
        runtimeEvidenceRevision: "evidence-a",
      },
    };

    expect(authorizeRepairMutation(
      tx,
      boundProof,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        semanticIrRevision: "semantic-ir-current",
        preservationContractRevision: "preservation-contract-current",
        preservationBaselineRevision: "preservation-baseline-current",
        runtimeEvidenceRevision: "evidence-a",
      },
      {
        repairAuthority: repairAuthority(tx.id),
      },
    )).toMatchObject({
      authorized: true,
      mode: "eligible",
    });
  });
});
