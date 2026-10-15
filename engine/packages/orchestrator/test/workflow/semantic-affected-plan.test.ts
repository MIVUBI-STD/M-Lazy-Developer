import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SemanticGraph,
} from "../../../graph/src/index.js";
import {
  authorizeRepair,
  type PatchTransaction,
} from "../../../repair/src/index.js";
import {
  planPatchSemanticAffectedSet,
  planSemanticAffectedSet,
} from "../../src/workflow/semantic-affected-plan.js";

function authorizedFixture() {
  const decision = authorizeRepair({
    confirmedDefect: true,
    diagnosisEvidenceIds: ["test:changed-source"],
    invariantIds: ["fixture:changed-function"],
    sourceFingerprint: "source",
    sourceFingerprintMatches: true,
    evidenceFreshness: "fresh",
  });
  if (!decision.receipt) throw new Error("Fixture repair authorization rejected.");
  return decision.receipt;
}

function graphFixture(): SemanticGraph {
  const graph = new SemanticGraph();

  for (const identifier of [
    "caller",
    "changed",
    "callee",
    "unrelated",
  ]) {
    graph.addNode({
      id: "function:pack:" + identifier,
      identity: {
        kind: "function",
        scope: "pack",
        identifier,
      },
      kind: "function",
      identifier,
      source: {
        artifactId: "map",
        relativePath:
          "functions/" +
          identifier +
          ".mcfunction",
      },
    });
  }

  graph.addNode({
    id: "structure:pack:arena-structure",
    identity: {
      kind: "structure",
      scope: "pack",
      identifier: "arena-structure",
    },
    kind: "structure",
    identifier: "arena-structure",
    source: {
      artifactId: "map",
      relativePath:
        "structures/arena.mcstructure",
    },
  });

  graph.addNode({
    id: "scoreboard:pack:round",
    identity: {
      kind: "scoreboard_objective",
      scope: "pack",
      identifier: "round",
    },
    kind: "scoreboard_objective",
    identifier: "round",
    source: {
      artifactId: "map",
      relativePath: "<derived>",
    },
  });

  graph.addEdge({
    from: "function:pack:caller",
    type: "CALLS",
    targetIdentifier: "changed",
    status: "resolved",
    to: "function:pack:changed",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/caller.mcfunction",
      },
    },
  });

  graph.addEdge({
    from: "function:pack:changed",
    type: "CALLS",
    targetIdentifier: "callee",
    status: "resolved",
    to: "function:pack:callee",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/changed.mcfunction",
      },
    },
  });

  graph.addEdge({
    from: "function:pack:changed",
    type: "LOADS_STRUCTURE",
    targetIdentifier:
      "arena-structure",
    status: "resolved",
    to:
      "structure:pack:arena-structure",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/changed.mcfunction",
      },
    },
  });

  graph.addEdge({
    from: "function:pack:changed",
    type: "WRITES_SCOREBOARD",
    targetIdentifier: "round",
    status: "resolved",
    to: "scoreboard:pack:round",
    evidence: {
      source: {
        artifactId: "map",
        relativePath:
          "functions/changed.mcfunction",
      },
    },
  });

  return graph;
}

describe("semantic affected planning", () => {
  it("includes changed nodes, mutation targets, and reverse dependents without pulling ordinary callees", () => {
    const result =
      planSemanticAffectedSet(
        graphFixture(),
        ["function:pack:changed"],
      );

    expect(result.status).toBe(
      "planned",
    );
    expect(result.affectedNodeIds)
      .toEqual([
        "function:pack:caller",
        "function:pack:changed",
        "scoreboard:pack:round",
        "structure:pack:arena-structure",
      ]);
    expect(result.skippedNodeIds)
      .toEqual([
        "function:pack:callee",
        "function:pack:unrelated",
      ]);
    expect(result.skippedNodeCount)
      .toBe(2);
    expect(result.skipRatio)
      .toBeCloseTo(2 / 6);
  });

  it("derives the affected closure directly from patch source references", () => {
    const transaction:
      PatchTransaction = {
      id: "patch:1",
      title: "change function",
      sourceFingerprint: "source",
      authorization: authorizedFixture(),
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "map",
          relativePath:
            "functions/changed.mcfunction",
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [],
      validation: [],
      affectedPaths: [
        "functions/changed.mcfunction",
      ],
    };

    const result =
      planPatchSemanticAffectedSet(
        graphFixture(),
        transaction,
      );

    expect(result.status).toBe(
      "planned",
    );
    expect(result.changedNodeIds)
      .toEqual([
        "function:pack:changed",
      ]);
    expect(result.affectedNodeIds)
      .toContain(
        "function:pack:caller",
      );
    expect(result.affectedNodeIds)
      .toContain(
        "scoreboard:pack:round",
      );
    expect(result.affectedNodeIds)
      .toContain(
        "structure:pack:arena-structure",
      );
    expect(result.skippedNodeIds)
      .toEqual([
        "function:pack:callee",
        "function:pack:unrelated",
      ]);
  });

  it("blocks selective validation when a patch operation cannot bind to the graph", () => {
    const transaction:
      PatchTransaction = {
      id: "patch:missing",
      title: "unknown source",
      sourceFingerprint: "source",
      authorization: authorizedFixture(),
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "map",
          relativePath:
            "functions/missing.mcfunction",
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [],
      validation: [],
      affectedPaths: [
        "functions/missing.mcfunction",
      ],
    };

    const result =
      planPatchSemanticAffectedSet(
        graphFixture(),
        transaction,
      );

    expect(result.status).toBe(
      "blocked",
    );
    expect(
      result.unmatchedOperationPaths,
    ).toEqual([
      "functions/missing.mcfunction",
    ]);
  });
});
