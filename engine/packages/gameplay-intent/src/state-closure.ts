import type {
  GameplayIntentModel,
} from "./types.js";

export interface GameplayStateClosureRecord {
  readonly subjectId: string;
  readonly kind: "phase" | "state" | "lifecycle";
  readonly hasEntry: boolean;
  readonly hasExit: boolean;
  readonly unknown: boolean;
  readonly status: "closed" | "partial" | "open";
  readonly reasons: readonly string[];
}

export interface GameplayStateClosureResult {
  readonly complete: boolean;
  readonly records: readonly GameplayStateClosureRecord[];
  readonly openSubjectIds: readonly string[];
  readonly partialSubjectIds: readonly string[];
}

/**
 * Structural source closure, not live gameplay reachability.
 *
 * Association, ownership and resource production are not state transitions.
 * A name such as "finish" is not a terminal proof. Only direct authored
 * transition and win/loss relations backed by selected-artifact evidence
 * participate in closure. Inferred links remain visible in Intent but cannot
 * establish a complete route.
 */
export function assessGameplayStateClosure(
  model: GameplayIntentModel,
): GameplayStateClosureResult {
  const states = model.nodes.filter(
    (node): node is typeof node & {
      kind: "phase" | "state" | "lifecycle";
    } =>
      node.kind === "phase" ||
      node.kind === "state" ||
      node.kind === "lifecycle",
  );
  const byId = new Map(model.nodes.map(node => [node.id, node]));
  const stateIds = new Set(states.map(node => node.id));
  const selectedEvidenceIds = new Set(model.evidence
    .filter(evidence => evidence.scope === "selected-artifact")
    .map(evidence => evidence.id));
  const grounded = (edge: GameplayIntentModel["edges"][number]): boolean =>
    edge.status === "authored" &&
    edge.evidenceIds.some(id => selectedEvidenceIds.has(id));

  const transitions = model.edges.filter(edge =>
    grounded(edge) &&
    (edge.kind === "transitions-to" ||
      edge.kind === "recovers-to" ||
      edge.kind === "resets") &&
    stateIds.has(edge.from) &&
    stateIds.has(edge.to));
  const terminalEdges = model.edges.filter(edge =>
    grounded(edge) &&
    (edge.kind === "wins-by" || edge.kind === "loses-by") &&
    stateIds.has(edge.from) &&
    byId.get(edge.to)?.kind === "outcome" &&
    byId.get(edge.to)?.status === "authored");

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const edge of transitions) {
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge.from]);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }

  const terminalIds = new Set(terminalEdges.map(edge => edge.from));
  // This is only an unambiguous structural start candidate. It does not
  // establish that a player can enter the game or satisfy an event guard.
  const entryCandidates = states.filter(node =>
    (incoming.get(node.id)?.length ?? 0) === 0 &&
    (outgoing.get(node.id)?.length ?? 0) > 0 &&
    node.status === "authored" &&
    node.evidenceIds.some(id => selectedEvidenceIds.has(id)));
  const entryId = entryCandidates.length === 1
    ? entryCandidates[0]!.id
    : undefined;

  const walk = (
    starts: readonly string[],
    adjacency: ReadonlyMap<string, readonly string[]>,
  ): ReadonlySet<string> => {
    const visited = new Set(starts);
    const queue = [...starts];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const next of adjacency.get(queue[cursor]!) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    return visited;
  };
  const fromEntry = walk(entryId === undefined ? [] : [entryId], outgoing);
  const toTerminal = walk([...terminalIds], incoming);
  const unknownSubjects = new Set(model.unknowns
    .flatMap(unknown => unknown.blockedSubjectIds));

  const records = states.map(node => {
    const hasEntry = (incoming.get(node.id)?.length ?? 0) > 0 ||
      node.id === entryId;
    const hasExit = (outgoing.get(node.id)?.length ?? 0) > 0 ||
      terminalIds.has(node.id);
    const unknown = unknownSubjects.has(node.id) ||
      node.status !== "authored";
    const reachableFromEntry = fromEntry.has(node.id);
    const reachesTerminal = toTerminal.has(node.id);
    const reasons: string[] = [];

    if (entryId === undefined) {
      reasons.push(
        "No unique source-grounded structural entry candidate exists; a cycle or multiple entry roots cannot establish the initial state.",
      );
    } else if (!reachableFromEntry) {
      reasons.push(
        "No authored state transition path connects the structural entry candidate to this state.",
      );
    }
    if (!hasEntry) {
      reasons.push("No source-grounded state transition enters this state.");
    }
    if (!hasExit) {
      reasons.push("No source-grounded state transition or win/loss exit leaves this state.");
    }
    if (!reachesTerminal) {
      reasons.push(
        "No authored transition path reaches an explicit win/loss outcome; a cycle or terminal-looking name is insufficient.",
      );
    }
    if (unknown) {
      reasons.push("State intent is inferred, hypothetical or explicitly unresolved.");
    }

    const status: GameplayStateClosureRecord["status"] =
      hasEntry && hasExit && reachableFromEntry && reachesTerminal && !unknown
        ? "closed"
        : !hasEntry && !hasExit
          ? "open"
          : "partial";
    return {
      subjectId: node.id,
      kind: node.kind,
      hasEntry,
      hasExit,
      unknown,
      status,
      reasons,
    };
  });

  return {
    complete: records.length > 0 &&
      entryId !== undefined &&
      terminalIds.size > 0 &&
      records.every(record => record.status === "closed"),
    records,
    openSubjectIds: records
      .filter(record => record.status === "open")
      .map(record => record.subjectId)
      .sort(),
    partialSubjectIds: records
      .filter(record => record.status === "partial")
      .map(record => record.subjectId)
      .sort(),
  };
}
