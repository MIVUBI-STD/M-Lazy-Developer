import { describe, expect, it } from "vitest";
import {
  assessGameplayDiscoveryClosure,
} from "../../src/inspection/gameplay-discovery-closure.js";

describe("gameplay discovery closure", () => {
  it("recognizes physical inventory even before a mechanic can be interpreted", () => {
    const result = assessGameplayDiscoveryClosure({
      inventoriedFileCount: 3,
      sourceFileAccountingComplete: true,
      discoveredSurfaceIds: [],
      sourceRelevantFiles: 1, sourceIndexedFiles: 1,
      sourceCoverageComplete: true, sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [], semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
    });
    expect(result.status).toBe("COMPLETE");
    expect(result.inventoriedFileCount).toBe(3);
    expect(result.discoveredSurfaceIds).toEqual([]);
    expect(result.reasons.join(" ")).toContain("A7 UNDERSTAND");
  });

  it("cannot use interpreted mechanics to conceal missing physical sources", () => {
    const result = assessGameplayDiscoveryClosure({
      inventoriedFileCount: 2,
      sourceFileAccountingComplete: false,
      discoveredSurfaceIds: ["mechanic:join"],
      sourceRelevantFiles: 1, sourceIndexedFiles: 1,
      sourceCoverageComplete: true, sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [], semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
    });
    expect(result.status).toBe("OPEN");
    expect(result.sourceFileAccountingComplete).toBe(false);
  });

  it("retains unlisted source-bearing packs as Discovery uncertainty", () => {
    const result = assessGameplayDiscoveryClosure({
      discoveredSurfaceIds: ["runtime:state"], sourceRelevantFiles: 1,
      sourceIndexedFiles: 1, sourceCoverageComplete: true,
      sourceParseFailures: 0, unsupportedRelevantSourcePaths: [],
      semanticUnderstandingGapPaths: [], unresolvedReferences: 0,
      unlistedPackRoots: ["behavior_packs/b", "behavior_packs/b"],
    });
    expect(result.status).toBe("PARTIAL");
    expect(result.unlistedPackRoots).toEqual(["behavior_packs/b"]);
  });

  it("keeps native world truncation visible even if indexed sources are complete", () => {
    const result = assessGameplayDiscoveryClosure({
      discoveredSurfaceIds: ["runtime:state"],
      sourceRelevantFiles: 1,
      sourceIndexedFiles: 1,
      sourceCoverageComplete: true,
      sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [],
      semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
      nativeWorldScanIncomplete: true,
    });
    expect(result.status).toBe("PARTIAL");
    expect(result.nativeWorldScanIncomplete).toBe(true);
    expect(result.reasons.some(reason => reason.includes("native world scan"))).toBe(true);
  });

  it("opens when relevant source coverage is incomplete", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "phase:lobby",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 0,
        sourceCoverageComplete: false,
        sourceParseFailures: 1,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
  });

  it("keeps unresolved references partial without losing discovered surfaces", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "phase:lobby",
          "runtime:state",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 1,
      });

    expect(result.status).toBe("PARTIAL");
    expect(
      result.discoveredSurfaceIds,
    ).toEqual([
      "phase:lobby",
      "runtime:state",
    ]);
  });

  it("opens when raw relevant source inventory is not balanced", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 3,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("OPEN");
    expect(
      result.sourceInventoryBalanced,
    ).toBe(false);
  });

  it("keeps accounted unsupported sources PARTIAL without claiming semantic coverage", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 2,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: false,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [
          "feature_rules/ore.json",
        ],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("PARTIAL");
    expect(result.sourceInventoryBalanced).toBe(true);
    expect(result.sourceCoverageComplete).toBe(false);
    expect(result.unsupportedRelevantSources).toBe(1);
  });

  it("does not mask truly missing inventory behind an unsupported-file entry", () => {
    const result = assessGameplayDiscoveryClosure({
      discoveredSurfaceIds: ["runtime:state"],
      sourceRelevantFiles: 3,
      sourceIndexedFiles: 1,
      sourceCoverageComplete: false,
      sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: ["feature_rules/ore.json"],
      semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
    });

    expect(result.status).toBe("OPEN");
    expect(result.sourceInventoryBalanced).toBe(false);
    expect(result.unsupportedRelevantSourcePaths).toEqual(["feature_rules/ore.json"]);
  });

  it("opens when gameplay sources are indexed but not semantically understood", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [
          "loot_tables/reward.json",
        ],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("PARTIAL");
    expect(
      result.semanticUnderstandingGaps,
    ).toBe(1);
  });

  it("keeps A2 source completeness independent from A7 gameplay-intent unknowns", () => {
    const result = assessGameplayDiscoveryClosure({
      discoveredSurfaceIds: ["runtime:state"],
      sourceRelevantFiles: 1, sourceIndexedFiles: 1,
      sourceCoverageComplete: true, sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [], semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0, gameplayIntentUnknownIds: ["unknown:outcome-guard"],
    });
    expect(result.status).toBe("COMPLETE");
    expect(result.gameplayIntentUnknownIds).toEqual(["unknown:outcome-guard"]);
  });

  it("closes discovery when relevant sources are indexed and references resolve", () => {
    const result =
      assessGameplayDiscoveryClosure({
        discoveredSurfaceIds: [
          "runtime:state",
        ],
        sourceRelevantFiles: 1,
        sourceIndexedFiles: 1,
        sourceCoverageComplete: true,
        sourceParseFailures: 0,
        unsupportedRelevantSourcePaths: [],
        semanticUnderstandingGapPaths: [],
        unresolvedReferences: 0,
      });

    expect(result.status).toBe("COMPLETE");
  });

  it("applies the combined Discovery acceptance contract without overstating runtime proof", () => {
    const complete = {
      discoveredSurfaceIds: ["phase:lobby", "state:round"],
      sourceRelevantFiles: 2, sourceIndexedFiles: 2,
      sourceCoverageComplete: true, sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [], semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
    };
    const accepted = assessGameplayDiscoveryClosure(complete);
    expect(accepted.status).toBe("COMPLETE");
    expect(accepted.reasons.join(" ")).toContain("not gameplay/runtime proof");
    const partiallyResolved = assessGameplayDiscoveryClosure({
      ...complete, unresolvedReferences: 1,
    });
    expect(partiallyResolved.status).toBe("PARTIAL");
    expect(partiallyResolved.reasons.join(" ")).toContain("remain unresolved");
    const blocked = assessGameplayDiscoveryClosure({
      ...complete, unresolvedReferences: 1,
      semanticUnderstandingGapPaths: ["behavior_packs/a/loot_tables/reward.json"],
      gameplayIntentUnknownIds: ["unknown:outcome"],
      discoveryChallengeIds: ["discovery-challenge:region:one"],
      nativeWorldScanIncomplete: true,
    });
    expect(blocked.status).toBe("PARTIAL");
    expect(blocked.semanticUnderstandingGaps).toBe(1);
    expect(blocked.gameplayIntentUnknownIds).toHaveLength(1);
    expect(blocked.discoveryChallengeIds).toHaveLength(1);
    expect(blocked.nativeWorldScanIncomplete).toBe(true);
  });

  it("retains unowned raw operations as A7 challenges without corrupting A2", () => {
    const input = {
      discoveredSurfaceIds: ["runtime:state"],
      sourceRelevantFiles: 1,
      sourceIndexedFiles: 1,
      sourceCoverageComplete: true,
      sourceParseFailures: 0,
      unsupportedRelevantSourcePaths: [],
      semanticUnderstandingGapPaths: [],
      unresolvedReferences: 0,
    };
    expect(assessGameplayDiscoveryClosure(input).status).toBe("COMPLETE");
    const challenged = assessGameplayDiscoveryClosure({
      ...input,
      discoveryChallengeIds: ["discovery-challenge:state:unknown-mutation"],
    });
    expect(challenged.status).toBe("COMPLETE");
    expect(challenged.discoveryChallengeIds).toEqual([
      "discovery-challenge:state:unknown-mutation",
    ]);
  });
});
