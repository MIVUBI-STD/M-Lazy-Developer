import { describe, expect, it } from "vitest";
import { analyzeReleaseIdentity } from "../../src/release/release-identity-analysis.js";

describe("release identity analysis", () => {
  it("keeps pack engine and script API versions separate from release identity", () => {
    const result = analyzeReleaseIdentity(
      [{
        root: "behavior_packs/game",
        type: "behavior_pack",
        uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        packVersion: "1.2.3",
        minEngineVersion: "1.21.0",
        educationMetadata: false,
        scriptModules: [{
          moduleName: "@minecraft/server",
          version: "2.6.0",
          track: "stable",
        }],
      }],
      {
        compiledBindings: 1,
        crossFileResolvedBindings: 0,
        rejectedBindings: 0,
        resolvedBindings: [{
          scriptId: "config",
          name: "RELEASE_VERSION",
          value: "2026.09.29",
          source: {
            artifactId: "fixture",
            relativePath: "scripts/config.ts",
          },
        }],
        failedBindings: [],
        arenaCountCandidates: [],
        arenaConcurrencyCandidates: [],
        arenaLayoutCandidates: [],
        arenaCountConflict: false,
        arenaConcurrencyConflict: false,
        arenaLayoutConflict: false,
      },
      {},
    );

    expect(result.status).toBe("consistent");
    expect(result.explicitReleaseObservations[0]?.releaseVersion)
      .toBe("2026.09.29");
    expect(result.packVersions[0]?.packVersion).toBe("1.2.3");
    expect(result.engineVersions[0]?.engineVersion).toBe("1.21.0");
    expect(result.scriptApiVersions[0]?.scriptApiVersion).toBe("2.6.0");
  });

  it("reports conflict only between explicit release identities", () => {
    const result = analyzeReleaseIdentity(
      [],
      {
        compiledBindings: 1,
        crossFileResolvedBindings: 0,
        rejectedBindings: 0,
        resolvedBindings: [{
          scriptId: "config",
          name: "RELEASE_VERSION",
          value: "1.0.0",
          source: {
            artifactId: "fixture",
            relativePath: "scripts/config.ts",
          },
        }],
        failedBindings: [],
        arenaCountCandidates: [],
        arenaConcurrencyCandidates: [],
        arenaLayoutCandidates: [],
        arenaCountConflict: false,
        arenaConcurrencyConflict: false,
        arenaLayoutConflict: false,
      },
      { releaseVersion: "2.0.0" },
    );

    expect(result.status).toBe("conflict");
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
