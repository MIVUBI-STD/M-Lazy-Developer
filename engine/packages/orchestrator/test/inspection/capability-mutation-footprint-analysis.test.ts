import { describe, expect, it } from "vitest";
import { analyzeCapabilityMutationFootprint } from "../../src/inspection/capability-mutation-footprint-analysis.js";

describe("capability mutation footprint analysis", () => {
  it("keeps Creative cleanup unresolved when inventory reset omits equipment", () => {
    const result = analyzeCapabilityMutationFootprint({
      playerCapabilities: {
        gamemodeWrites: 1,
        creativeModeGrants: 1,
        spectatorModeGrants: 0,
        abilityWrites: 0,
        mayflyGrants: 0,
        commandPermissionWrites: 0,
        privilegedGuardReferences: 0,
        privilegedBypassReturns: 0,
        protectionDefinitions: [],
        inactiveProtectionDefinitions: 0,
        implicitDeveloperAuthorityRisks: 0,
        explicitDeveloperGuardEvidence: 0,
      },
      inventory: {
        regions: 1,
        resetCandidates: 1,
        completeResets: 0,
        partialResets: 1,
        copyMutationRisks: 0,
        grantVerificationGaps: 0,
        loadoutTransactions: [],
        completeLoadoutTransactions: 0,
        unresolvedLoadoutTransactions: 0,
        grantRegions: 0,
        dropRegions: 0,
        knownEquipmentSlots: ["Head","Chest","Legs","Feet","Offhand"],
        unresolvedEquipmentSlotEvidence: 0,
        assessments: [],
      },
    });

    expect(result.broadCapabilityDetected).toBe(true);
    expect(
      result.surfaces.find(
        (item) => item.surface === "equipment",
      )?.status,
    ).toBe("partial");
  });

  it("requires explicit spatial authority for privileged world-mutation bypass", () => {
    const result = analyzeCapabilityMutationFootprint({
      playerCapabilities: {
        gamemodeWrites: 0,
        creativeModeGrants: 0,
        spectatorModeGrants: 0,
        abilityWrites: 0,
        mayflyGrants: 0,
        commandPermissionWrites: 0,
        privilegedGuardReferences: 1,
        privilegedBypassReturns: 2,
        protectionDefinitions: [],
        inactiveProtectionDefinitions: 0,
        implicitDeveloperAuthorityRisks: 0,
        explicitDeveloperGuardEvidence: 0,
      },
    });

    expect(
      result.surfaces.find(
        (item) => item.surface === "world-mutation",
      )?.status,
    ).toBe("unresolved");
  });

  it("closes mayfly only when terminal capability release is complete", () => {
    const result = analyzeCapabilityMutationFootprint({
      playerCapabilities: {
        gamemodeWrites: 0,
        creativeModeGrants: 0,
        spectatorModeGrants: 0,
        abilityWrites: 1,
        mayflyGrants: 1,
        commandPermissionWrites: 0,
        privilegedGuardReferences: 0,
        privilegedBypassReturns: 0,
        protectionDefinitions: [],
        inactiveProtectionDefinitions: 0,
        implicitDeveloperAuthorityRisks: 0,
        explicitDeveloperGuardEvidence: 0,
      },
      arenaCleanup: {
        acquiredSurfaces: 1,
        exactProven: 1,
        partial: 0,
        unresolved: 0,
        terminalAssessments: [],
        lifecycle: { declared: false, complete: 0, unresolved: 0, assessments: [] },
        ledger: {
          resources: 1,
          complete: 1,
          partial: 0,
          missing: 0,
          coverageRatio: 1,
          obligations: [{
            scriptId: "main",
            surface: "player-capability",
            key: "@s:mayfly",
            acquisitionRegions: ["function:start"],
            requiredTerminals: 1,
            provenTerminals: 1,
            partialTerminals: 0,
            missingTerminals: 0,
            status: "complete",
          }],
        },
      },
    });

    expect(
      result.surfaces.find(
        (item) => item.surface === "player-capability",
      )?.status,
    ).toBe("covered");
  });
});
