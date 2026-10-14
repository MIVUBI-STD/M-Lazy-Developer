import type {
  GameplayIntentEdgeKind,
  GameplayIntentEvidenceOrigin,
  GameplayIntentNodeKind,
  GameplayIntentStatus,
} from "../../../gameplay-intent/src/index.js";
import type {
  InspectArtifactResult,
} from "./inspect-artifact.js";

const NODE_KINDS: readonly GameplayIntentNodeKind[] = [
  "game",
  "mechanic",
  "actor",
  "role",
  "objective",
  "phase",
  "state",
  "resource",
  "lifecycle",
  "spatial-region",
  "policy",
  "outcome",
];

const STATUSES: readonly GameplayIntentStatus[] = [
  "authored",
  "inferred",
  "hypothesis",
];

const EDGE_KINDS: readonly GameplayIntentEdgeKind[] = [
  "owns",
  "participates-in",
  "produces",
  "consumes",
  "transitions-to",
  "valid-during",
  "scoped-to",
  "located-in",
  "resets",
  "persists",
  "requires",
  "excludes",
  "recovers-to",
  "wins-by",
  "loses-by",
];

export interface GameplayUnderstandingFingerprint {
  schemaVersion: 1;
  sourceShape: {
    files: number;
    scripts: number;
    authoredSourceFiles: number;
    entities: number;
    functions: number;
  };
  totals: {
    nodes: number;
    edges: number;
    invariants: number;
    unknowns: number;
  };
  nodeKinds: Readonly<Record<GameplayIntentNodeKind, number>>;
  nodeStatuses: Readonly<Record<GameplayIntentStatus, number>>;
  authoredNodeKinds: Readonly<Record<GameplayIntentNodeKind, number>>;
  edgeKinds: Readonly<Record<GameplayIntentEdgeKind, number>>;
  evidenceOrigins: Readonly<Record<string, number>>;
  spatial: {
    profiledRegions: number;
    routeProfiles: number;
    routePoints: number;
    derivedRouteContracts: number;
    effectiveRouteContracts: number;
    localProfiles: number;
    worldProfiles: number;
    unknownProfiles: number;
    contextSeries: number;
  };
  policy: {
    policies: number;
    outcomes: number;
    unknownPredicates: number;
    authoredPolicyEdges: number;
    admissibilityInvariants: number;
    coverageUnknowns: number;
  };
  epistemic: {
    authoredRatio: number;
    inferredRatio: number;
    hypothesisRatio: number;
    unknownsPerNode: number;
  };
}

function zeroRecord<T extends string>(
  keys: readonly T[],
): Record<T, number> {
  return Object.fromEntries(
    keys.map((key) => [key, 0]),
  ) as Record<T, number>;
}

function ratio(
  numerator: number,
  denominator: number,
): number {
  if (denominator === 0) return 0;
  return Number(
    (numerator / denominator).toFixed(6),
  );
}

export function deriveGameplayUnderstandingFingerprint(
  result: InspectArtifactResult,
): GameplayUnderstandingFingerprint {
  const model = result.gameplayIntent.model;
  const nodeKinds = zeroRecord(NODE_KINDS);
  const nodeStatuses = zeroRecord(STATUSES);
  const authoredNodeKinds = zeroRecord(NODE_KINDS);
  const edgeKinds = zeroRecord(EDGE_KINDS);
  const evidenceOrigins: Record<string, number> = {};

  for (const node of model.nodes) {
    nodeKinds[node.kind] += 1;
    nodeStatuses[node.status] += 1;
    if (node.status === "authored") {
      authoredNodeKinds[node.kind] += 1;
    }
  }

  for (const edge of model.edges) {
    edgeKinds[edge.kind] += 1;
  }

  for (const evidence of model.evidence) {
    evidenceOrigins[evidence.origin] =
      (evidenceOrigins[evidence.origin] ?? 0) + 1;
  }

  const spatialNodes = model.nodes.filter(
    (node) =>
      node.kind === "spatial-region" &&
      node.spatialProfile !== undefined,
  );
  const routeProfiles = spatialNodes.filter(
    (node) =>
      node.spatialProfile?.routeId !== undefined,
  );

  const policies = model.nodes.filter(
    (node) => node.kind === "policy",
  );
  const outcomes = model.nodes.filter(
    (node) => node.kind === "outcome",
  );
  const authoredPolicyEdges = model.edges.filter(
    (edge) =>
      edge.status === "authored" &&
      edge.kind === "requires" &&
      model.nodes.find(
        (node) => node.id === edge.to,
      )?.kind === "policy",
  );

  const nodes = model.nodes.length;
  const authored =
    nodeStatuses.authored;
  const inferred =
    nodeStatuses.inferred;
  const hypothesis =
    nodeStatuses.hypothesis;

  return {
    schemaVersion: 1,
    sourceShape: {
      files: result.files,
      scripts: result.scripts,
      authoredSourceFiles:
        result.gameplayIntent.contractSourceFiles,
      entities: result.entities,
      functions: result.functions,
    },
    totals: {
      nodes,
      edges: model.edges.length,
      invariants: model.invariants.length,
      unknowns: model.unknowns.length,
    },
    nodeKinds,
    nodeStatuses,
    authoredNodeKinds,
    edgeKinds,
    evidenceOrigins:
      Object.fromEntries(
        Object.entries(evidenceOrigins).sort(
          ([a], [b]) => a.localeCompare(b),
        ),
      ),
    spatial: {
      profiledRegions: spatialNodes.length,
      routeProfiles: routeProfiles.length,
      routePoints: routeProfiles.reduce(
        (sum, node) =>
          sum +
          (node.spatialProfile?.points.length ?? 0),
        0,
      ),
      derivedRouteContracts:
        result.routeAnalysis.derivedContracts,
      effectiveRouteContracts:
        result.routeAnalysis.effectiveContracts,
      localProfiles: spatialNodes.filter(
        (node) =>
          node.spatialProfile?.coordinateSpace ===
          "local",
      ).length,
      worldProfiles: spatialNodes.filter(
        (node) =>
          node.spatialProfile?.coordinateSpace ===
          "world",
      ).length,
      unknownProfiles: spatialNodes.filter(
        (node) =>
          node.spatialProfile?.coordinateSpace ===
          "unknown",
      ).length,
      contextSeries: spatialNodes.filter(
        (node) =>
          node.spatialProfile?.contextSeries !==
          undefined,
      ).length,
    },
    policy: {
      policies: policies.length,
      outcomes: outcomes.length,
      unknownPredicates: policies.filter(
        (node) =>
          node.policyPredicate?.kind === "unknown",
      ).length,
      authoredPolicyEdges:
        authoredPolicyEdges.length,
      admissibilityInvariants:
        model.invariants.filter((item) =>
          item.id.startsWith(
            "inv:admissible-policy:",
          ),
        ).length,
      coverageUnknowns: model.unknowns.filter(
        (item) =>
          item.id.startsWith(
            "unknown:outcome-policy-coverage:",
          ),
      ).length,
    },
    epistemic: {
      authoredRatio: ratio(authored, nodes),
      inferredRatio: ratio(inferred, nodes),
      hypothesisRatio: ratio(hypothesis, nodes),
      unknownsPerNode: ratio(
        model.unknowns.length,
        nodes,
      ),
    },
  };
}

export interface GameplayUnderstandingFingerprintDrift {
  nodeDelta: number;
  authoredNodeDelta: number;
  inferredNodeDelta: number;
  unknownDelta: number;
  invariantDelta: number;
  routeProfileDelta: number;
  routePointDelta: number;
  derivedRouteContractDelta: number;
  unknownPolicyPredicateDelta: number;
  kindDeltas: Readonly<Record<GameplayIntentNodeKind, number>>;
  lostKinds: readonly GameplayIntentNodeKind[];
  gainedKinds: readonly GameplayIntentNodeKind[];
  regressionSignals: readonly string[];
}

export function compareGameplayUnderstandingFingerprints(
  baseline: GameplayUnderstandingFingerprint,
  current: GameplayUnderstandingFingerprint,
): GameplayUnderstandingFingerprintDrift {
  const kindDeltas = zeroRecord(NODE_KINDS);
  const lostKinds: GameplayIntentNodeKind[] = [];
  const gainedKinds: GameplayIntentNodeKind[] = [];

  for (const kind of NODE_KINDS) {
    kindDeltas[kind] =
      current.nodeKinds[kind] -
      baseline.nodeKinds[kind];
    if (
      baseline.nodeKinds[kind] > 0 &&
      current.nodeKinds[kind] === 0
    ) {
      lostKinds.push(kind);
    }
    if (
      baseline.nodeKinds[kind] === 0 &&
      current.nodeKinds[kind] > 0
    ) {
      gainedKinds.push(kind);
    }
  }

  const regressionSignals: string[] = [];
  if (current.totals.unknowns > baseline.totals.unknowns) {
    regressionSignals.push(
      "unknown-intent-count-increased",
    );
  }
  if (
    current.nodeStatuses.authored <
    baseline.nodeStatuses.authored
  ) {
    regressionSignals.push(
      "authored-intent-count-decreased",
    );
  }
  if (
    current.spatial.routeProfiles <
    baseline.spatial.routeProfiles
  ) {
    regressionSignals.push(
      "authored-route-profile-count-decreased",
    );
  }
  if (
    current.spatial.routePoints <
    baseline.spatial.routePoints
  ) {
    regressionSignals.push(
      "authored-route-point-count-decreased",
    );
  }
  if (
    current.spatial.derivedRouteContracts <
    baseline.spatial.derivedRouteContracts
  ) {
    regressionSignals.push(
      "derived-route-contract-count-decreased",
    );
  }
  if (lostKinds.length > 0) {
    regressionSignals.push(
      "intent-kind-coverage-lost",
    );
  }

  return {
    nodeDelta:
      current.totals.nodes -
      baseline.totals.nodes,
    authoredNodeDelta:
      current.nodeStatuses.authored -
      baseline.nodeStatuses.authored,
    inferredNodeDelta:
      current.nodeStatuses.inferred -
      baseline.nodeStatuses.inferred,
    unknownDelta:
      current.totals.unknowns -
      baseline.totals.unknowns,
    invariantDelta:
      current.totals.invariants -
      baseline.totals.invariants,
    routeProfileDelta:
      current.spatial.routeProfiles -
      baseline.spatial.routeProfiles,
    routePointDelta:
      current.spatial.routePoints -
      baseline.spatial.routePoints,
    derivedRouteContractDelta:
      current.spatial.derivedRouteContracts -
      baseline.spatial.derivedRouteContracts,
    unknownPolicyPredicateDelta:
      current.policy.unknownPredicates -
      baseline.policy.unknownPredicates,
    kindDeltas,
    lostKinds,
    gainedKinds,
    regressionSignals,
  };
}
