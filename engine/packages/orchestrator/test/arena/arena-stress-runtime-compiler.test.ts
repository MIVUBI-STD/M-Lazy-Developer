import { describe, expect, it } from "vitest";
import { buildMultiplayerStressMatrix } from "../../../../packages/reliability/src/index.js";
import { compileArenaStressRuntime } from "../../src/arena/arena-stress-runtime-compiler.js";

describe("arena stress runtime compiler", () => {
  it("compiles supported scenarios and leaves unsupported scenarios explicit", () => {
    const matrix = buildMultiplayerStressMatrix({
      arenaIds: ["arena-1", "arena-2"],
      playersPerArena: 2,
    });

    const result = compileArenaStressRuntime({
      matrix,
      targetProfileFingerprint: "target",
      fixtureFingerprint: "fixture",
      objectiveId: "qa",
      participant: "result",
      arenaGenerations: {
        "arena-1": 1,
        "arena-2": 1,
      },
      subjects: {
        "arena-1:player-1": {
          playerKey: "arena-1:player-1",
          arenaId: "arena-1",
          arenaGeneration: 1,
          connectionGeneration: 1,
          participationGeneration: 1,
          lifeGeneration: 1,
        },
        "arena-2:player-1": {
          playerKey: "arena-2:player-1",
          arenaId: "arena-2",
          arenaGeneration: 1,
          connectionGeneration: 1,
          participationGeneration: 1,
          lifeGeneration: 1,
        },
      },
    });

    expect(
      result.runtimeReady.some(
        (item) =>
          item.kind === "full-capacity-session",
      ),
    ).toBe(true);
    expect(
      result.runtimeReady.some(
        (item) =>
          item.kind === "death-during-join",
      ),
    ).toBe(true);
    expect(
      // Both referenced arenas have explicit generation identities, so
      // the cleanup/start experiment is source-authorized to compile.
      result.runtimeReady.some(
        (item) =>
          item.kind === "cleanup-start-overlap",
      ),
    ).toBe(true);
  });

  it("compiles every stress scenario when arena and player generations are explicit", () => {
    const arenaIds = [
      "arena-1",
      "arena-2",
      "arena-3",
    ];
    const matrix = buildMultiplayerStressMatrix({
      arenaIds,
      playersPerArena: 2,
    });

    const subjects = Object.fromEntries(
      arenaIds.flatMap((arenaId) =>
        Array.from({ length: 2 }, (_, index) => {
          const playerKey =
            arenaId + ":player-" + (index + 1);
          return [
            playerKey,
            {
              playerKey,
              arenaId,
              arenaGeneration: 1,
              connectionGeneration: 1,
              participationGeneration: 1,
              lifeGeneration: 1,
            },
          ];
        })
      ),
    );

    const result = compileArenaStressRuntime({
      matrix,
      targetProfileFingerprint: "target",
      fixtureFingerprint: "fixture",
      objectiveId: "qa",
      participant: "result",
      arenaGenerations: Object.fromEntries(
        arenaIds.map((arenaId) => [
          arenaId,
          1,
        ]),
      ),
      subjects,
    });

    expect(result.manualRequired).toEqual([]);
    expect(result.runtimeReady).toHaveLength(
      matrix.scenarios.length,
    );
    expect(
      result.runtimeReady.some(
        (item) =>
          item.kind ===
          "simultaneous-all-arena-finish",
      ),
    ).toBe(true);
    expect(
      result.runtimeReady.some(
        (item) =>
          item.kind === "cleanup-start-overlap",
      ),
    ).toBe(true);
  });

  it("does not invent player generation identity", () => {
    const matrix = buildMultiplayerStressMatrix({
      arenaIds: ["arena-1"],
      playersPerArena: 1,
    });

    const result = compileArenaStressRuntime({
      matrix,
      targetProfileFingerprint: "target",
      fixtureFingerprint: "fixture",
      objectiveId: "qa",
      participant: "result",
      arenaGenerations: {
        "arena-1": 1,
      },
    });

    expect(
      result.manualRequired.some(
        (item) =>
          item.kind === "death-during-join",
      ),
    ).toBe(true);
  });
});
