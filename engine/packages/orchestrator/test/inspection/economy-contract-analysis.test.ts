import { describe, expect, it } from "vitest";
import {
  analyzeEconomyBehaviorContract,
} from "../../src/inspection/economy-contract-analysis.js";
import type {
  RewardSourceAnalysis,
} from "../../src/inspection/reward-source-analysis.js";

const rewards: RewardSourceAnalysis = {
  sourceKinds: [
    "ENGINE_LOOT_TABLE",
    "SCRIPT_INVENTORY_GRANT",
    "DROPPED_ITEM_PICKUP",
    "SCOREBOARD_CURRENCY",
  ],
  engineLootEntities: 1,
  engineLootTables: 1,
  unresolvedEngineLootTables: 0,
  scriptInventoryGrants: 1,
  worldDrops: 1,
  pickupObservers: 1,
  scriptLootCommands: 0,
  functionLootCommands: 0,
  scoreboardCredits: 1,
  scoreboardDebits: 0,
  scoreboardAdjustments: 0,
  scoreboardWrites: 0,
  itemConsumes: 0,
  dropCleanupSurfaces: 0,
  worldDropRewardPathsWithoutCleanup: 1,
  rewardPathsWithoutIdempotency: 2,
  cleanupAfterRewardJournalProven: 0,
  cleanupBeforeRewardJournalRisks: 0,
  cleanupRewardJournalOrderingUnresolved: 0,
  deathRewardPaths: 1,
  pickupCurrencyPaths: 1,
  deathRewardSourceOverlapCandidates: 1,
  deathRewardSourceOverlapUnresolved: 0,
  pickupCurrencyWithoutConsumeCandidates: 1,
  paths: [],
};

const baseContract = {
  schemaVersion: 1 as const,
  id: "economy",
  pickupCurrencyItemPolicy: "consume" as const,
  inventoryFullPolicy:
    "compensate" as const,
  rewardIdempotencyRequired: true,
  pickupScopeValidationRequired: true,
  staleDropCleanupRequired: true,
  terminalRewardRequiresResultCommit: true,
};

describe("economy contract analysis", () => {
  it("keeps complementary death reward sources out of contract conflict", () => {
    const result = analyzeEconomyBehaviorContract(
      rewards,
      {
        ...baseContract,
        deathRewardArbitration:
          "complementary",
      },
    );

    expect(
      result.deathRewardOverlapContractConflicts,
    ).toBe(0);
    expect(
      result.pickupCurrencyConsumeCoverageGaps,
    ).toBe(1);
    expect(
      result.idempotencyCoverageGaps,
    ).toBe(2);
    expect(
      result.staleDropCleanupCoverageGaps,
    ).toBe(1);
  });

  it("surfaces mutually-exclusive death reward overlap as contract conflict, not confirmed defect", () => {
    const result = analyzeEconomyBehaviorContract(
      rewards,
      {
        ...baseContract,
        deathRewardArbitration:
          "mutually-exclusive",
      },
    );

    expect(
      result.deathRewardOverlapContractConflicts,
    ).toBe(1);
    expect(result.reasons.join(" "))
      .toMatch(/correlation is still required/);
  });

  it("keeps overlap unresolved when no economy contract is configured", () => {
    const result =
      analyzeEconomyBehaviorContract(rewards);

    expect(result.configured).toBe(false);
    expect(
      result.deathRewardOverlapUnresolved,
    ).toBe(1);
    expect(
      result.deathRewardOverlapContractConflicts,
    ).toBe(0);
  });

  it("keeps terminal reward ordering unresolved until RESULT_COMMITTED binding is proven", () => {
    const result = analyzeEconomyBehaviorContract(
      rewards,
      {
        ...baseContract,
        deathRewardArbitration:
          "complementary",
      },
    );

    expect(
      result.terminalRewardResultCommitUnproven,
    ).toBe(1);
    expect(result.reasons.join(" "))
      .toMatch(/RESULT_COMMITTED binding proof/);
  });
});
