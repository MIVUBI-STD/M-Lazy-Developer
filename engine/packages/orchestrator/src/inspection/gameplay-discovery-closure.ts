export type GameplayDiscoveryClosureStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "OPEN";

export interface GameplayDiscoveryClosureInput {
  /** Recognition evidence from Source Index, before Gameplay Intent/Model. */
  readonly inventoriedFileCount?: number;
  readonly sourceFileAccountingComplete?: boolean;
  /** Interpretive surfaces are A7 context, not source-inventory proof. */
  readonly discoveredSurfaceIds:
    readonly string[];
  readonly sourceRelevantFiles: number;
  readonly sourceIndexedFiles: number;
  readonly sourceCoverageComplete: boolean;
  readonly sourceParseFailures: number;
  readonly unsupportedRelevantSourcePaths: readonly string[];
  readonly semanticUnderstandingGapPaths: readonly string[];
  readonly unresolvedReferences: number;
  readonly discoveryChallengeIds?: readonly string[];
  /** Unresolved executable/scheduler targets stay within A2 source discovery. */
  readonly unresolvedSourceLinkIds?: readonly string[];
  readonly gameplayIntentUnknownIds?: readonly string[];
  /** Native world evidence is not complete if the scan failed or hit a bound. */
  readonly nativeWorldScanIncomplete?: boolean;
  readonly unlistedPackRoots?: readonly string[];
}

export interface GameplayDiscoveryClosure {
  readonly status:
    GameplayDiscoveryClosureStatus;
  readonly inventoriedFileCount: number;
  readonly sourceFileAccountingComplete: boolean;
  readonly discoveredSurfaceIds:
    readonly string[];
  /**
   * Raw selected-artifact files classified as gameplay-relevant by source
   * discovery. This count is retained so later admission/review can prove that
   * discovery did not silently collapse to only successfully parsed files.
   */
  readonly sourceRelevantFiles: number;
  readonly sourceIndexedFiles: number;
  readonly sourceParseFailures: number;
  readonly unsupportedRelevantSources: number;
  readonly unsupportedRelevantSourcePaths: readonly string[];
  readonly semanticUnderstandingGaps: number;
  readonly semanticUnderstandingGapPaths: readonly string[];
  readonly sourceAccountedFiles: number;
  readonly sourceInventoryBalanced: boolean;
  readonly sourceCoverageComplete: boolean;
  readonly unresolvedReferences: number;
  readonly discoveryChallengeIds: readonly string[];
  readonly unresolvedSourceLinkIds?: readonly string[];
  readonly gameplayIntentUnknownIds: readonly string[];
  readonly nativeWorldScanIncomplete: boolean;
  readonly unlistedPackRoots: readonly string[];
  readonly reasons: readonly string[];
}

export function assessGameplayDiscoveryClosure(
  input: GameplayDiscoveryClosureInput,
): GameplayDiscoveryClosure {
  const surfaceIds = [
    ...new Set(input.discoveredSurfaceIds),
  ].sort();
  const reasons: string[] = [];
  const unlistedPackRoots = [...new Set(input.unlistedPackRoots ?? [])].sort();
  const gameplayIntentUnknownIds = [...new Set(input.gameplayIntentUnknownIds ?? [])].sort();
  const discoveryChallengeIds = [
    ...new Set(input.discoveryChallengeIds ?? []),
  ].sort();
  const unresolvedSourceLinkIds = [
    ...new Set(input.unresolvedSourceLinkIds ?? []),
  ].sort();
  const unsupportedRelevantSourcePaths = [
    ...new Set(input.unsupportedRelevantSourcePaths),
  ].sort();
  const unsupportedRelevantSources =
    unsupportedRelevantSourcePaths.length;
  const semanticUnderstandingGapPaths = [
    ...new Set(input.semanticUnderstandingGapPaths),
  ].sort();
  const semanticUnderstandingGaps =
    semanticUnderstandingGapPaths.length;
  const sourceAccountedFiles =
    input.sourceIndexedFiles +
    input.sourceParseFailures +
    unsupportedRelevantSources;
  const countsValid = [
    input.sourceRelevantFiles,
    input.sourceIndexedFiles,
    input.sourceParseFailures,
    input.unresolvedReferences,
  ].every((count) => Number.isSafeInteger(count) && count >= 0);
  const sourceInventoryBalanced =
    countsValid &&
    input.sourceRelevantFiles ===
      sourceAccountedFiles &&
    input.sourceIndexedFiles <=
      input.sourceRelevantFiles;
  const inventoryEvidenceProvided =
    input.inventoriedFileCount !== undefined ||
    input.sourceFileAccountingComplete !== undefined;
  const inventoriedFileCount = input.inventoriedFileCount ?? 0;
  const sourceFileAccountingComplete =
    input.sourceFileAccountingComplete === true &&
    Number.isSafeInteger(inventoriedFileCount) &&
    inventoriedFileCount > 0 &&
    inventoriedFileCount >= input.sourceRelevantFiles;

  if (!countsValid) {
    reasons.push(
      "Selected-artifact discovery counts must be non-negative safe integers.",
    );
  }
  if (inventoryEvidenceProvided && !sourceFileAccountingComplete) {
    reasons.push(
      "The complete physical file inventory and per-source dispositions do not reconcile; source recognition is incomplete.",
    );
  }
  if (surfaceIds.length === 0) {
    reasons.push(
      "No interpreted gameplay surface is identified yet; gameplay meaning remains an A7 UNDERSTAND question, not evidence that the map is empty.",
    );
  }
  if (!sourceInventoryBalanced) {
    reasons.push(
      "Relevant selected-artifact source inventory is not fully accounted: " +
        String(input.sourceRelevantFiles) +
        " relevant, " +
        String(input.sourceIndexedFiles) +
        " indexed, " +
        String(input.sourceParseFailures) +
        " parse failure(s).",
    );
  }
  // Source-index coverage.complete also requires zero unsupported files.
  // An explicitly inventoried unsupported file is a semantic gap, not a
  // missing file. Its separate reason below retains the exact path.
  if (!input.sourceCoverageComplete && unsupportedRelevantSources === 0) {
    reasons.push(
      "Relevant selected-artifact source coverage is incomplete.",
    );
  }
  if (input.sourceParseFailures > 0) {
    reasons.push(
      String(input.sourceParseFailures) +
        " relevant source file(s) failed parsing/indexing.",
    );
  }
  if (unsupportedRelevantSources > 0) {
    reasons.push(
      String(unsupportedRelevantSources) +
        " gameplay-sensitive selected-artifact source file(s) have no semantic owner/parser and must remain a Detection Gap.",
    );
  }
  if (semanticUnderstandingGaps > 0) {
    reasons.push(
      String(semanticUnderstandingGaps) +
        " gameplay-sensitive source file(s) are structurally indexed but still lack domain semantics. Source-accounted is not semantically understood; these remain Detection Gaps.",
    );
  }

  if (unresolvedSourceLinkIds.length > 0) {
    reasons.push(String(unresolvedSourceLinkIds.length) +
      " executable/scheduled source target(s) remain unresolved at A2.");
  }

  if (discoveryChallengeIds.length > 0) {
    reasons.push(
      String(discoveryChallengeIds.length) +
      " raw execution/state evidence challenge(s) remain unaccounted.",
    );
  }

  if (gameplayIntentUnknownIds.length > 0) {
    reasons.push(String(gameplayIntentUnknownIds.length) + " gameplay intent unknown(s) remain explicitly unresolved.");
  }

  if (unlistedPackRoots.length > 0) {
    reasons.push(String(unlistedPackRoots.length) + " source-bearing pack(s) are not listed in the world configuration; source evidence is retained without inferring active execution.");
  }

  if (input.nativeWorldScanIncomplete === true) {
    reasons.push("Selected-artifact native world scan is incomplete; missing chunks, actors or command blocks cannot be treated as absent.");
  }

  if (input.unresolvedReferences > 0) {
    reasons.push(
      String(input.unresolvedReferences) +
        " selected-artifact reference(s) remain unresolved.",
    );
  }

  // A2 accounts discovered sources and execution targets; A7 accounts
  // the gameplay meaning of already indexed Semantic IR facts.
  const status: GameplayDiscoveryClosureStatus =
    (inventoryEvidenceProvided ? !sourceFileAccountingComplete : surfaceIds.length === 0) ||
    !sourceInventoryBalanced ||
    input.sourceParseFailures > 0 ||
    (!input.sourceCoverageComplete && unsupportedRelevantSources === 0)
      ? "OPEN"
      : unsupportedRelevantSources > 0 ||
          unresolvedSourceLinkIds.length > 0 ||
          input.nativeWorldScanIncomplete === true ||
          unlistedPackRoots.length > 0 ||
          input.unresolvedReferences > 0
        ? "PARTIAL"
        : "COMPLETE";

  if (status === "COMPLETE") {
    reasons.push(
      "Physical source inventory, executable targets and reference accounting satisfy A2; interpreted surface inventory is independent. Indexed semantic gaps, unowned evidence and gameplay intent unknowns remain A7 UNDERSTAND obligations, not gameplay/runtime proof.",
    );
  }

  return {
    status,
    inventoriedFileCount,
    sourceFileAccountingComplete,
    discoveredSurfaceIds: surfaceIds,
    sourceRelevantFiles:
      input.sourceRelevantFiles,
    sourceIndexedFiles:
      input.sourceIndexedFiles,
    sourceParseFailures:
      input.sourceParseFailures,
    unsupportedRelevantSources,
    unsupportedRelevantSourcePaths,
    semanticUnderstandingGaps,
    semanticUnderstandingGapPaths,
    sourceAccountedFiles,
    sourceInventoryBalanced,
    sourceCoverageComplete:
      input.sourceCoverageComplete,
    unresolvedReferences:
      input.unresolvedReferences,
    discoveryChallengeIds,
    unresolvedSourceLinkIds,
    gameplayIntentUnknownIds,
    nativeWorldScanIncomplete: input.nativeWorldScanIncomplete === true,
    unlistedPackRoots,
    reasons,
  };
}
