import type {
  GameplayIntentModel,
} from "./types.js";

export type GameplayDesignReadiness =
  | "ready"
  | "partial"
  | "blocked";

export interface GameplayDesignReadinessInput {
  readonly scopeSubjectIds: readonly string[];
  readonly authoritativeDesignAvailable?: boolean;
  readonly materialUnknownIds?: readonly string[];
  readonly nonMaterialUnknownIds?: readonly string[];
}

export interface GameplayDesignReadinessResult {
  readonly disposition: GameplayDesignReadiness;
  readonly scopeSubjectIds: readonly string[];
  readonly blockingUnknownIds: readonly string[];
  readonly toleratedUnknownIds: readonly string[];
  readonly reasons: readonly string[];
}

export function assessGameplayDesignReadiness(
  model: GameplayIntentModel,
  input: GameplayDesignReadinessInput,
): GameplayDesignReadinessResult {
  if (input.authoritativeDesignAvailable !== true) {
    return {
      disposition: "blocked",
      scopeSubjectIds: [...input.scopeSubjectIds],
      blockingUnknownIds: [],
      toleratedUnknownIds: [],
      reasons: [
        "The selected map artifact does not contain enough grounded gameplay-contract evidence for this scoped decision.",
      ],
    };
  }

  const scoped = new Set(input.scopeSubjectIds);
  const knownSubjects = new Set(model.nodes.map(node => node.id));
  const knownUnknowns = new Set(model.unknowns.map(unknown => unknown.id));
  const requestedBlocking = new Set(input.materialUnknownIds ?? []);
  const requestedTolerated = new Set(input.nonMaterialUnknownIds ?? []);
  const invalidScopeIds = [...scoped].filter(id => !knownSubjects.has(id)).sort();
  const staleUnknownIds = [...new Set([
    ...requestedBlocking, ...requestedTolerated,
  ])].filter(id => !knownUnknowns.has(id)).sort();

  // Unbound source questions cannot silently disappear from a scoped decision.
  // A partial material list is search priority, never an exhaustive allowlist.
  const relevantUnknowns = model.unknowns.filter(unknown =>
    requestedBlocking.has(unknown.id) ||
    unknown.blockedSubjectIds.length === 0 ||
    unknown.blockedSubjectIds.some(id => scoped.has(id) || !knownSubjects.has(id)));
  const blockingUnknownIds = [...new Set(relevantUnknowns
    .filter(unknown => requestedBlocking.has(unknown.id) ||
      !requestedTolerated.has(unknown.id))
    .map(unknown => unknown.id))].sort();
  const toleratedUnknownIds = [...new Set(relevantUnknowns
    .filter(unknown => requestedTolerated.has(unknown.id) &&
      !requestedBlocking.has(unknown.id))
    .map(unknown => unknown.id))].sort();

  if (scoped.size === 0 || invalidScopeIds.length > 0 || staleUnknownIds.length > 0) {
    return {
      disposition: "blocked",
      scopeSubjectIds: [...scoped].sort(),
      blockingUnknownIds,
      toleratedUnknownIds,
      reasons: [
        ...(scoped.size === 0 ? ["A scoped design decision requires selected-model subjects."] : []),
        ...(invalidScopeIds.length > 0 ? [
          "Unknown selected-model subjects: " + invalidScopeIds.join(", "),
        ] : []),
        ...(staleUnknownIds.length > 0 ? [
          "Unknown question IDs in the current model: " + staleUnknownIds.join(", "),
        ] : []),
      ],
    };
  }

  if (blockingUnknownIds.length > 0) {
    return {
      disposition: "blocked",
      scopeSubjectIds: [...input.scopeSubjectIds],
      blockingUnknownIds,
      toleratedUnknownIds,
      reasons: [
        "Material gameplay-contract unknowns inside the selected map can change bug-vs-feature classification for this scope.",
      ],
    };
  }

  if (toleratedUnknownIds.length > 0) {
    return {
      disposition: "partial",
      scopeSubjectIds: [...input.scopeSubjectIds],
      blockingUnknownIds: [],
      toleratedUnknownIds,
      reasons: [
        "Unresolved design questions exist, but they are explicitly non-material for this scoped decision.",
      ],
    };
  }

  return {
    disposition: "ready",
    scopeSubjectIds: [...input.scopeSubjectIds],
    blockingUnknownIds: [],
    toleratedUnknownIds: [],
    reasons: [
      "No material Game Design unknown blocks this scoped decision.",
    ],
  };
}
