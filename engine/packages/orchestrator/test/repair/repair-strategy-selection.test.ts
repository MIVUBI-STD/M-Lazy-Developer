import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../../graph/src/index.js";
import { createPatchTransaction } from "../../../repair/src/index.js";
import {
  selectRepairStrategy,
} from "../../src/repair/repair-strategy-selection.js";
import {
  createDecisionLedger,
} from "../../src/workflow/decision-ledger.js";
import {
  recordRepairStrategySelection,
} from "../../src/workflow/decision-ledger-recording.js";
import { fixtureRepairAuthorization } from "../../../repair/test/fixture-authorization.js";

function source(relativePath: string) {
  return { artifactId: "art-1", relativePath };
}

function transaction(
  title: string,
  relativePath: string,
) {
  return createPatchTransaction({
    title,
    sourceFingerprint: "source",
    authorization: fixtureRepairAuthorization("source"),
    operations: [{
      kind: "replace-text",
      source: source(relativePath),
      expected: "old",
      replacement: "new",
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected: "source",
    }],
    validation: [{
      kind: "rebuild-graph",
    }],
  });
}

function invariantRegistry(
  minimumRepairClaim:
    | "proven-static"
    | "proven-runtime" = "proven-runtime",
) {
  return {
    schemaVersion: 1 as const,
    revision: "inv-r1",
    profileKey: "bedrock:1.26.40",
    entries: [{
      id: "invariant:ready",
      source: {
        kind: "manual-policy" as const,
        id: "ready-policy",
        revision: "r1",
      },
      enforcement: "runtime-state" as const,
      minimumRepairClaim,
      stateRequirements: [{
        id: "invariant:ready",
        predicate: "ready",
        expectedState: "present" as const,
      }],
      temporalRequirements: [],
      revalidationLayers: [
        "static" as const,
        "transitive" as const,
        "runtime" as const,
        "package" as const,
      ],
    }],
  };
}

function graphFixture() {
  const graph = new SemanticGraph();

  graph.addNode({
    id: "function:p:target",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "target",
    },
    kind: "function",
    identifier: "target",
    source: source("functions/target.mcfunction"),
  });
  graph.addNode({
    id: "function:p:caller",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "caller",
    },
    kind: "function",
    identifier: "caller",
    source: source("functions/caller.mcfunction"),
  });
  graph.addNode({
    id: "function:p:independent-a",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "independent-a",
    },
    kind: "function",
    identifier: "independent-a",
    source: source("functions/independent-a.mcfunction"),
  });
  graph.addNode({
    id: "function:p:independent-b",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "independent-b",
    },
    kind: "function",
    identifier: "independent-b",
    source: source("functions/independent-b.mcfunction"),
  });

  graph.addEdge({
    from: "function:p:caller",
    type: "CALLS",
    targetIdentifier: "target",
    status: "resolved",
    to: "function:p:target",
    evidence: {
      source: source("functions/caller.mcfunction"),
    },
  });

  return graph;
}

const diagnostic = {
  incidentId: "incident-1",
  activeCandidateIds: ["cause-1"],
  disposition: "repair-eligible" as const,
  selectedCandidateId: "cause-1",
  effectiveEvidenceLevel:
    "proven-with-observed-outcome" as const,
  proofState: "causal" as const,
  claimStrength: "proven-runtime" as const,
  reasons: ["runtime proof"],
};

describe("repair strategy selection", () => {
  it("selects the smaller causally valid strategy", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "wide",
        transaction: transaction(
          "wide",
          "functions/target.mcfunction",
        ),
        changedNodeIds: ["function:p:target"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "small",
        transaction: transaction(
          "small",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("selected");
    if (result.status !== "selected") return;
    expect(result.selected.strategyId).toBe("small");
    expect(result.selected.metrics.affectedNodes).toBe(1);
  });

  it("returns ambiguous when strategies are equally minimal", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "a",
        transaction: transaction(
          "a",
          "functions/independent-a.mcfunction",
        ),
        changedNodeIds: ["function:p:independent-a"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "b",
        transaction: transaction(
          "b",
          "functions/independent-b.mcfunction",
        ),
        changedNodeIds: ["function:p:independent-b"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.tied.map((item) => item.strategyId).sort())
      .toEqual(["a", "b"]);
  });

  it("rejects a small strategy that does not address the selected cause", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "unrelated",
        transaction: transaction(
          "unrelated",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["other-cause"],
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("none-eligible");
    expect(result.assessments[0]?.reasons.join(" "))
      .toMatch(/does not address/);
  });

  it("requires explicit policy to select guarded repair strategies", () => {
    const graph = graphFixture();
    const guardedDiagnostic = {
      ...diagnostic,
      disposition: "guarded-repair-eligible" as const,
      effectiveEvidenceLevel:
        "proven-with-observed-outcome" as const,
      proofState: "intervention-supported" as const,
      claimStrength: "proven-runtime" as const,
    };
    const candidate = {
      strategyId: "guarded",
      transaction: transaction(
        "guarded",
        "functions/caller.mcfunction",
      ),
      changedNodeIds: ["function:p:caller"],
      supportingInvariantIds: ["invariant:ready"],
      addressesCandidateIds: ["cause-1"],
    };

    expect(selectRepairStrategy(
      graph,
      guardedDiagnostic,
      [candidate],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    ).status).toBe("none-eligible");

    expect(selectRepairStrategy(
      graph,
      guardedDiagnostic,
      [candidate],
      {
        invariantRegistry: invariantRegistry("proven-static"),
        requiredInvariantIds: ["invariant:ready"],
        allowGuarded: true,
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    ).status).toBe("selected");
  });

  it("rejects duplicate strategy ids", () => {
    const graph = graphFixture();
    const txA = transaction(
      "a",
      "functions/independent-a.mcfunction",
    );
    const txB = transaction(
      "b",
      "functions/independent-b.mcfunction",
    );

    expect(() => selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "same",
        transaction: txA,
        changedNodeIds: ["function:p:independent-a"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "same",
        transaction: txB,
        changedNodeIds: ["function:p:independent-b"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    )).toThrow(/Duplicate repair strategy id/);
  });

  it("keeps trade-off strategies ambiguous on the Pareto frontier", () => {
    const graph = graphFixture();

    const fewNodesMoreOps = createPatchTransaction({
      title: "few-nodes-more-ops",
      sourceFingerprint: "source",
      authorization: fixtureRepairAuthorization("source"),
      operations: [{
        kind: "replace-text",
        source: source("functions/caller.mcfunction"),
        expected: "old-a",
        replacement: "new-a",
      }, {
        kind: "replace-text",
        source: source("functions/caller.mcfunction"),
        expected: "old-b",
        replacement: "new-b",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "source",
      }],
      validation: [{ kind: "rebuild-graph" }],
    });

    const moreNodesFewerOps = transaction(
      "more-nodes-fewer-ops",
      "functions/target.mcfunction",
    );

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "few-nodes-more-ops",
        transaction: fewNodesMoreOps,
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "more-nodes-fewer-ops",
        transaction: moreNodesFewerOps,
        changedNodeIds: ["function:p:target"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.tied.map((item) => item.strategyId).sort())
      .toEqual([
        "few-nodes-more-ops",
        "more-nodes-fewer-ops",
      ]);
  });


  it("rejects empty or unknown required invariant configuration", () => {
    const graph = graphFixture();
    const candidate = {
      strategyId: "candidate",
      transaction: transaction(
        "candidate",
        "functions/caller.mcfunction",
      ),
      changedNodeIds: ["function:p:caller"],
      supportingInvariantIds: ["invariant:ready"],
      addressesCandidateIds: ["cause-1"],
    };

    expect(() => selectRepairStrategy(
      graph,
      diagnostic,
      [candidate],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: [],
      },
    )).toThrow(/at least one required invariant/);

    expect(() => selectRepairStrategy(
      graph,
      diagnostic,
      [candidate],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["missing"],
      },
    )).toThrow(/not present in invariant registry/);
  });

  it("rejects diagnostic-only invariants for automatic strategy selection", () => {
    const graph = graphFixture();
    const registry = invariantRegistry();
    const diagnosticOnly = {
      ...registry,
      revision: "inv-r2",
      entries: [{
        ...registry.entries[0]!,
        id: "invariant:diagnostic-only",
        enforcement: "diagnostic-only" as const,
        minimumRepairClaim: "hypothesis" as const,
        stateRequirements: [],
        revalidationLayers: ["static" as const],
      }],
    };

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "candidate",
        transaction: transaction(
          "candidate",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:diagnostic-only"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        invariantRegistry: diagnosticOnly,
        requiredInvariantIds: ["invariant:diagnostic-only"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("none-eligible");
    expect(result.assessments[0]?.reasons.join(" "))
      .toMatch(/diagnostic-only/);
  });

  it("binds selected repair proof to invariant registry revision", () => {
    const result = selectRepairStrategy(
      graphFixture(),
      diagnostic,
      [{
        strategyId: "candidate",
        transaction: transaction(
          "candidate",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("selected");
    if (result.status !== "selected") return;
    expect(
      result.selected.pipeline.proof.decisionBasis
        .invariantRegistryRevision,
    ).toBe("inv-r1");
  });

  it("rejects runtime-causal strategy without exact causal binding metadata", () => {
    const runtimeDiagnostic = {
      ...diagnostic,
      causalProof: {
        state: "causal" as const,
        interventionIds: ["exp:session"],
        interventionProvenance: [{
          interventionId: "exp:session",
          experimentRevision: "rev-1",
          predicateId: "stale-session-mutation-observed",
          controlledFactorIds: [
            "connection-generation-guard-enabled",
          ],
          controlledFactorContrasts: [{
            factorId:
              "connection-generation-guard-enabled",
            controlValue: true,
            treatmentValue: false,
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

    const result = selectRepairStrategy(
      graphFixture(),
      runtimeDiagnostic,
      [{
        strategyId: "missing-binding",
        transaction: transaction(
          "missing-binding",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "implementation-repair",
        reversible: true,
        idempotent: true,
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("none-eligible");
    expect(result.assessments[0]?.intelligence)
      .toMatchObject({
        causalBindingSatisfied: false,
      });
    expect(result.assessments[0]?.reasons.join(" "))
      .toMatch(/missing exact causalBinding/i);
  });

  it("accepts runtime-causal strategy only when intervention, predicate, and factor binding cover the proof", () => {
    const runtimeDiagnostic = {
      ...diagnostic,
      causalProof: {
        state: "causal" as const,
        interventionIds: ["exp:session"],
        interventionProvenance: [{
          interventionId: "exp:session",
          experimentRevision: "rev-1",
          predicateId: "stale-session-mutation-observed",
          controlledFactorIds: [
            "connection-generation-guard-enabled",
          ],
          controlledFactorContrasts: [{
            factorId:
              "connection-generation-guard-enabled",
            controlValue: true,
            treatmentValue: false,
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

    const result = selectRepairStrategy(
      graphFixture(),
      runtimeDiagnostic,
      [{
        strategyId: "exact-binding",
        transaction: transaction(
          "exact-binding",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "implementation-repair",
        causalBinding: {
          interventionIds: ["exp:session"],
          predicateIds: [
            "stale-session-mutation-observed",
          ],
          factorIds: [
            "connection-generation-guard-enabled",
          ],
        },
        reversible: true,
        idempotent: true,
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("selected");
    if (result.status !== "selected") return;
    expect(result.selected.intelligence)
      .toMatchObject({
        repairClass: "implementation-repair",
        causalBindingSatisfied: true,
        authorizingRuntimeExperiments: [
          "exp:session",
        ],
      });
    expect(result.selected.metrics.runtimeRetestBurden)
      .toBeGreaterThan(0);
  });

  it("prefers reversible and idempotent strategy when causal fit and graph impact are otherwise equal", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "safer",
        transaction: transaction(
          "safer",
          "functions/independent-a.mcfunction",
        ),
        changedNodeIds: [
          "function:p:independent-a",
        ],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "implementation-repair",
        reversible: true,
        idempotent: true,
      }, {
        strategyId: "riskier",
        transaction: transaction(
          "riskier",
          "functions/independent-b.mcfunction",
        ),
        changedNodeIds: [
          "function:p:independent-b",
        ],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "implementation-repair",
        reversible: false,
        idempotent: false,
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("selected");
    if (result.status !== "selected") return;
    expect(result.selected.strategyId).toBe("safer");
    expect(result.selected.metrics.reversibilityRank).toBe(0);
    expect(result.selected.metrics.idempotencyRank).toBe(0);
    expect(result.rejectedAlternatives).toEqual([
      expect.objectContaining({
        strategyId: "riskier",
        disposition: "dominated",
        dominatedBy: ["safer"],
      }),
    ]);

    const ledger = recordRepairStrategySelection(
      createDecisionLedger(),
      result,
      result.selected.transactionId,
      {
        decisionId: "strategy-decision",
        basis: {
          runtimeEvidenceRevision: "evidence-current",
          invariantRegistryRevision: "inv-r1",
        },
      },
    );

    expect(ledger.entries[0]?.outputIds).toEqual(
      expect.arrayContaining([
        "repair-strategy-class:implementation-repair",
        "repair-strategy-causal-binding:matched",
        "repair-strategy-rejected:riskier:dominated",
      ]),
    );
  });

  it("rejects a repair class excluded by policy even when its raw patch is smaller", () => {
    const result = selectRepairStrategy(
      graphFixture(),
      diagnostic,
      [{
        strategyId: "workaround",
        transaction: transaction(
          "workaround",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "compatibility-workaround",
        reversible: true,
        idempotent: true,
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        allowedRepairClasses: [
          "implementation-repair",
          "configuration-repair",
        ],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("none-eligible");
    expect(result.assessments[0]?.reasons.join(" "))
      .toMatch(/repair class is not allowed/i);
  });

  it("explains why a larger valid repair may be selected when a smaller raw patch is causally invalid", () => {
    const runtimeDiagnostic = {
      ...diagnostic,
      causalProof: {
        state: "causal" as const,
        interventionIds: ["exp:session"],
        interventionProvenance: [{
          interventionId: "exp:session",
          experimentRevision: "rev-1",
          predicateId: "stale-session-mutation-observed",
          controlledFactorIds: [
            "connection-generation-guard-enabled",
          ],
          controlledFactorContrasts: [{
            factorId:
              "connection-generation-guard-enabled",
            controlValue: true,
            treatmentValue: false,
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

    const bigger = createPatchTransaction({
      title: "bigger-causal-fix",
      sourceFingerprint: "source",
      authorization: fixtureRepairAuthorization("source"),
      operations: [{
        kind: "replace-text",
        source: source("functions/target.mcfunction"),
        expected: "old-a",
        replacement: "new-a",
      }, {
        kind: "replace-text",
        source: source("functions/target.mcfunction"),
        expected: "old-b",
        replacement: "new-b",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "source",
      }],
      validation: [{ kind: "rebuild-graph" }],
    });

    const result = selectRepairStrategy(
      graphFixture(),
      runtimeDiagnostic,
      [{
        strategyId: "small-but-unbound",
        transaction: transaction(
          "small-but-unbound",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "implementation-repair",
        reversible: true,
        idempotent: true,
      }, {
        strategyId: "bigger-causal",
        transaction: bigger,
        changedNodeIds: ["function:p:target"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
        repairClass: "implementation-repair",
        causalBinding: {
          interventionIds: ["exp:session"],
          predicateIds: [
            "stale-session-mutation-observed",
          ],
          factorIds: [
            "connection-generation-guard-enabled",
          ],
        },
        reversible: true,
        idempotent: true,
      }],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
        decisionBasis: {
          runtimeEvidenceRevision: "evidence-current",
        },
      },
    );

    expect(result.status).toBe("selected");
    if (result.status !== "selected") return;
    expect(result.selected.strategyId).toBe(
      "bigger-causal",
    );
    expect(result.selectionRationale.join(" "))
      .toMatch(/smaller raw mutation existed/i);
    expect(result.rejectedAlternatives).toEqual([
      expect.objectContaining({
        strategyId: "small-but-unbound",
        disposition: "inadmissible",
      }),
    ]);
  });

  it("rejects proven-runtime strategy selection without evidence-bound decision basis", () => {
    const graph = graphFixture();
    const candidate = {
      strategyId: "candidate-no-evidence-basis",
      transaction: transaction(
        "candidate-no-evidence-basis",
        "functions/caller.mcfunction",
      ),
      changedNodeIds: ["function:p:caller"],
      supportingInvariantIds: ["invariant:ready"],
      addressesCandidateIds: ["cause-1"],
    };

    expect(() => selectRepairStrategy(
      graph,
      diagnostic,
      [candidate],
      {
        invariantRegistry: invariantRegistry(),
        requiredInvariantIds: ["invariant:ready"],
      },
    )).toThrow(/runtimeEvidenceRevision/);
  });
});
