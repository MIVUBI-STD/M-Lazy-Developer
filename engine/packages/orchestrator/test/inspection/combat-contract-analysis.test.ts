import { describe, expect, it } from "vitest";
import {
  analyzeCombatBehaviorContract,
} from "../../src/inspection/combat-contract-analysis.js";

const lifecycle = {
  hurtHandlers: 1,
  deathHandlers: 1,
  damageApplications: 0,
  secondaryEffects: 2,
  projectileSpawns: 1,
  projectileRemovals: 0,
  projectileCleanupGap: 1,
  hurtOnlyTerminalRisk: 0,
  paths: [],
};

const runtime = {
  reviveAnomalies: 4,
  byKind: {
    "self-revive": 1,
    "multiple-revivers": 1,
    "stale-revive": 1,
    "revive-after-death": 1,
    "invalid-reviver": 0,
  },
  scopedLifeGenerationMissing: 0,
  scopedArenaGenerationMissing: 0,
  affectedPlayers: ["p1"],
};

describe("combat contract analysis", () => {
  it("counts only anomalies that contradict authored revive contract", () => {
    const result = analyzeCombatBehaviorContract(
      lifecycle,
      runtime,
      {
        schemaVersion: 1,
        id: "mode",
        friendlyFireAllowed: false,
        crossArenaDamageAllowed: false,
        secondaryEffectsRequireDamageEligibility: true,
        projectileGenerationBound: true,
        projectileCleanupOnGenerationEnd: true,
        environmentalDamageAllowed: true,
        reviveGenerationBound: true,
        selfReviveAllowed: true,
        multipleReviversAllowed: false,
        reviveAfterDeathAllowed: false,
      },
    );

    expect(result).toMatchObject({
      reviveContractContradictions: 3,
      selfReviveContradictions: 0,
      multipleReviverContradictions: 1,
      staleReviveContradictions: 1,
      reviveAfterDeathContradictions: 1,
      projectileCleanupContractGap: 1,
      secondaryEffectEligibilitySurfaces: 2,
    });
  });

  it("does not invent mode-specific contradictions without a combat contract", () => {
    const result =
      analyzeCombatBehaviorContract(
        lifecycle,
        runtime,
      );

    expect(result.configured).toBe(false);
    expect(
      result.reviveContractContradictions,
    ).toBe(0);
  });
});
