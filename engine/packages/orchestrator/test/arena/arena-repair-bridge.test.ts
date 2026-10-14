import { describe, expect, it } from "vitest";
import { bridgeArenaRepairLocalization } from "../../src/arena/arena-repair-bridge.js";

describe("arena repair bridge", () => {
  it("keeps an exactly matching authored repair proposal non-executable", () => {
    const bridge =
      bridgeArenaRepairLocalization(
        {
          localized: 1,
          unresolved: 0,
          items: [{
            kind: "voxel",
            arenaId: "arena-2",
            unresolved: false,
            reasons: [],
            candidates: [{
              sourceId: "source",
              source: {
                artifactId: "fixture",
                relativePath:
                  "functions/setup.mcfunction",
                range: {
                  lineStart: 4,
                  lineEnd: 4,
                },
              },
              sourceKind: "command",
              authoredKind: "setblock",
              strength: "exact-overlap",
              reason: "exact",
            }],
          }],
        },
        [{
          kind: "linear-topology-outlier",
          diagnosticCode:
            "TOPOLOGY_TRANSLATION_OUTLIER",
          sourcePath:
            "functions/setup.mcfunction",
          line: 4,
          status: "proposal",
          proposal: {
            title: "candidate only",
            sourceFingerprint: "fingerprint",
            operation: {
              kind: "replace-command",
              source: {
                artifactId: "fixture",
                relativePath: "functions/setup.mcfunction",
                range: { lineStart: 4, lineEnd: 4 },
              },
              expected: "setblock 1 2 3 stone",
              replacement: "setblock 2 2 3 stone",
            },
            validation: [],
          },
        }],
      );

    expect(bridge).toMatchObject({
      deterministicRepairs: 0,
      proposalOnly: 1,
      unresolved: 0,
    });
    expect(
      bridge.items[0]?.status,
    ).toBe(
      "proposal-only",
    );
    expect(bridge.items[0]?.transactionId).toBeUndefined();
  });

  it("keeps region-only localization proposal-only", () => {
    const bridge =
      bridgeArenaRepairLocalization(
        {
          localized: 1,
          unresolved: 0,
          items: [{
            kind: "voxel",
            arenaId: "arena-2",
            unresolved: false,
            reasons: [],
            candidates: [{
              sourceId: "source",
              source: {
                artifactId: "fixture",
                relativePath:
                  "functions/setup.mcfunction",
              },
              sourceKind: "command",
              authoredKind: "fill",
              strength: "arena-overlap",
              reason: "regional",
            }],
          }],
        },
        [],
      );

    expect(
      bridge.items[0]?.status,
    ).toBe("proposal-only");
  });
});
