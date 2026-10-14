export type GameplayReachabilityNodeKind =
  | "player"
  | "item"
  | "resource"
  | "location"
  | "interaction"
  | "permission"
  | "capability"
  | "state"
  | "recipe"
  | "loot"
  | "container"
  | "entity"
  | "custom";

export interface GameplayReachabilityNode {
  readonly id: string;
  readonly kind: GameplayReachabilityNodeKind;
  readonly label: string;
  readonly playerAccessible?: boolean;
  readonly evidenceIds?: readonly string[];
}

export interface GameplayReachabilityEdge {
  readonly from: string;
  readonly to: string;
  readonly kind:
    | "contains"
    | "grants"
    | "crafts"
    | "drops"
    | "unlocks"
    | "requires"
    | "triggers"
    | "enters"
    | "interacts-with"
    | "authorizes"
    | "produces"
    | "custom";
  readonly evidenceIds?: readonly string[];
}

export interface GameplayReachabilityGraph {
  readonly nodes: readonly GameplayReachabilityNode[];
  readonly edges: readonly GameplayReachabilityEdge[];
  readonly coverage?: {
    readonly complete: boolean;
    readonly sources: readonly string[];
    readonly gaps: readonly string[];
  };
}

export interface GameplayReachabilityPath {
  readonly reachable: boolean;
  readonly resolution:
    | "reachable"
    | "unreachable"
    | "unknown";
  readonly targetId: string;
  readonly originId?: string;
  readonly nodeIds: readonly string[];
  readonly edgeKinds: readonly GameplayReachabilityEdge["kind"][];
  readonly evidenceIds: readonly string[];
}

/**
 * A path in the supplied acquisition graph, not observed Minecraft execution.
 * Missing/ambiguous node identities cannot bridge a path. Incomplete source
 * coverage permits a positive witness, never a negative absence claim.
 */
export function findGameplayReachability(
  graph: GameplayReachabilityGraph,
  targetId: string,
  originIds?: readonly string[],
): GameplayReachabilityPath {
  const nodes = new Map<string, GameplayReachabilityNode>();
  const ambiguousIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodes.has(node.id)) ambiguousIds.add(node.id);
    nodes.set(node.id, node);
  }
  for (const id of ambiguousIds) nodes.delete(id);

  const requestedOrigins = [...new Set(originIds ?? graph.nodes
    .filter(node => node.playerAccessible === true)
    .map(node => node.id))].sort();
  const outgoing = new Map<string, GameplayReachabilityEdge[]>();
  let danglingEdges = false;
  for (const edge of graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
      danglingEdges = true;
      continue;
    }
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }
  // Tuple serialization avoids delimiter collisions; no locale-sensitive order.
  const edgeKey = (edge: GameplayReachabilityEdge): string =>
    JSON.stringify([edge.to, edge.kind, [...new Set(edge.evidenceIds ?? [])].sort()]);
  for (const list of outgoing.values()) {
    list.sort((a, b) => {
      const left = edgeKey(a), right = edgeKey(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  }

  const complete = graph.coverage?.complete === true &&
    graph.coverage.sources.some(source => source.trim().length > 0) &&
    graph.coverage.gaps.length === 0 &&
    ambiguousIds.size === 0 && !danglingEdges &&
    requestedOrigins.length > 0 &&
    requestedOrigins.every(id => nodes.has(id));
  const unresolved = (): GameplayReachabilityPath => ({
    reachable: false,
    resolution: complete ? "unreachable" : "unknown",
    targetId,
    nodeIds: [],
    edgeKinds: [],
    evidenceIds: [...new Set(nodes.get(targetId)?.evidenceIds ?? [])].sort(),
  });
  if (!nodes.has(targetId)) return unresolved();

  const queue = requestedOrigins.filter(id => nodes.has(id));
  const visited = new Set(queue);
  const predecessors = new Map<string, GameplayReachabilityEdge>();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    if (current === targetId) {
      const nodeIds = [targetId];
      const edges: GameplayReachabilityEdge[] = [];
      let id = targetId;
      for (let edge = predecessors.get(id); edge !== undefined;
        edge = predecessors.get(id)) {
        edges.push(edge);
        id = edge.from;
        nodeIds.push(id);
      }
      nodeIds.reverse();
      edges.reverse();
      return {
        reachable: true,
        resolution: "reachable",
        targetId,
        originId: nodeIds[0]!,
        nodeIds,
        edgeKinds: edges.map(edge => edge.kind),
        evidenceIds: [...new Set([
          ...nodeIds.flatMap(nodeId => nodes.get(nodeId)?.evidenceIds ?? []),
          ...edges.flatMap(edge => edge.evidenceIds ?? []),
        ])].sort(),
      };
    }
    for (const edge of outgoing.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      predecessors.set(edge.to, edge);
      queue.push(edge.to);
    }
  }
  return unresolved();
}
