import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeArenaStateIsolation } from "../../src/arena/arena-state-isolation-analysis.js";

describe("arena state isolation analysis", () => {
  it("marks world dynamic properties as requiring partition proof inside arena flow", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) => item.surface === "dynamic-property",
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });

  it("proves arena-keyed dynamic properties and scoreboard participants automatically", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player, objective: ScoreboardObjective) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arena:' + arena.id, 1);",
        "  objective.setScore(arena.id, 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaStateIsolation(
        [script],
      );

    expect(
      result.observations.filter(
        (item) =>
          item.surface === "dynamic-property" ||
          item.surface === "scoreboard",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "dynamic-property",
          scope: "arena-local",
          status: "isolated",
        }),
        expect.objectContaining({
          surface: "scoreboard",
          scope: "arena-local",
          status: "isolated",
        }),
      ]),
    );
  });

  it("does not treat an arena-like literal key as authority partitioning", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaStateIsolation(
        [script],
      );

    expect(
      result.observations.find(
        (item) =>
          item.surface ===
          "dynamic-property",
      ),
    ).toMatchObject({
      scope: "world-global",
      status:
        "partition-proof-required",
    });
  });

  it("uses authored state authority contracts to prove arena partitioning", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation(
      [script],
      [{
        id: "arena-state",
        sourceRefs: [{ artifactId: "fixture", relativePath: "scripts/main.ts" }],
        authority: {
          kind: "dynamic-property",
          key: "arenaState",
        },
        mirrors: [],
        scope: "arena",
      }],
    );

    expect(
      result.observations.find(
        (item) =>
          item.surface === "dynamic-property",
      ),
    ).toMatchObject({
      scope: "arena-local",
      status: "isolated",
      authorityContractIds: ["arena-state"],
    });
  });

  it("keeps arena-owned state isolated", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  arena.state = 'waiting';",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) => item.surface === "module-state",
      )?.status,
    ).toBe("isolated");
  });

  it("requires partition proof for generic player tags mutated from arena flow", () => {
    const script = {
      identifier: "arena-gameplay",
      arenaAuthorityPaths: [{
        executionRegion: "function:runArena",
        arenaExpression: "arenaId",
      }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      methodCalls: [{
        executionRegion: "function:runArena",
        receiverType: "Player",
        receiver: "player",
        method: "removeTag",
        symbol: "player.removeTag",
        argumentTexts: ['"flag_carrier"'],
      }],
    } as any;

    const result =
      analyzeArenaStateIsolation([script]);

    expect(
      result.observations.some(
        (item) =>
          item.surface === "entity-tag" &&
          item.status === "partition-proof-required",
      ),
    ).toBe(true);
  });

  it("accepts arena-keyed player tags as isolated", () => {
    const script = {
      identifier: "arena-gameplay",
      arenaAuthorityPaths: [{
        executionRegion: "function:runArena",
        arenaExpression: "arenaId",
      }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      methodCalls: [{
        executionRegion: "function:runArena",
        receiverType: "Player",
        receiver: "player",
        method: "addTag",
        symbol: "player.addTag",
        argumentTexts: ['"flag_carrier:" + arenaId'],
      }],
    } as any;

    const result =
      analyzeArenaStateIsolation([script]);

    expect(
      result.observations.some(
        (item) =>
          item.surface === "entity-tag" &&
          item.status === "isolated",
      ),
    ).toBe(true);
  });

  it("does not borrow arena authority from another execution region", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.members.add(player);",
        "  world.setDynamicProperty('arena:' + arena.id, 1);",
        "}",
        "function other(otherArena, arena, player) {",
        "  otherArena.members.add(player);",
        "  world.setDynamicProperty('arena:' + arena.id, 1);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const observations = analyzeArenaStateIsolation([script]).observations
      .filter((item) => item.surface === "dynamic-property");
    expect(observations.find((item) => item.region === "function:join"))
      .toMatchObject({ status: "isolated", scope: "arena-local" });
    expect(observations.find((item) => item.region === "function:other"))
      .toMatchObject({ status: "partition-proof-required", scope: "world-global" });
  });

  it("does not infer module-state isolation from arena-like variable names", () => {
    const script = {
      identifier: "main",
      arenaAuthorityPaths: [{ arenaExpression: "arena", executionRegion: "function:join" }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      methodCalls: [],
      stateMutations: [
        { executionRegion: "function:join", target: "arenaCounter" },
        { executionRegion: "function:join", target: "playerSessions" },
        { executionRegion: "function:join", target: "arena.state" },
      ],
    } as any;
    const observations = analyzeArenaStateIsolation([script]).observations
      .filter((item) => item.surface === "module-state");
    expect(observations.find((item) => item.key === "arenaCounter")?.status)
      .toBe("partition-proof-required");
    expect(observations.find((item) => item.key === "playerSessions")?.status)
      .toBe("partition-proof-required");
    expect(observations.find((item) => item.key === "arena.state")?.status)
      .toBe("isolated");
  });

  it("does not claim player isolation from lexical identifiers", () => {
    const script = {
      identifier: "main",
      arenaAuthorityPaths: [{ arenaExpression: "arena", executionRegion: "function:join" }],
      localFunctionCalls: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      dynamicProperties: [{
        operation: "set",
        executionRegion: "function:join",
        receiverHint: "world",
        propertyExpression: "'playerShared'",
      }],
      methodCalls: [{
        executionRegion: "function:join",
        receiverType: "ScoreboardObjective",
        method: "setScore",
        symbol: "objective.setScore",
        argumentTexts: ["memberCounter", "1"],
      }],
    } as any;

    const observations = analyzeArenaStateIsolation([script]).observations;
    expect(observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({ status: "partition-proof-required", scope: "world-global" });
    expect(observations.find((item) => item.surface === "scoreboard"))
      .toMatchObject({ status: "partition-proof-required", scope: "world-global" });
  });

  it("does not apply scoreboard authority contracts via substring collisions", () => {
    const script = {
      identifier: "main",
      arenaAuthorityPaths: [{ arenaExpression: "arena", executionRegion: "function:join" }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      methodCalls: [{
        executionRegion: "function:join",
        receiverType: "ScoreboardObjective",
        method: "setScore",
        symbol: "objective.setScore",
        argumentTexts: ["teamKills", "1"],
      }],
    } as any;
    const contracts = [{
      id: "short-scoreboard-key",
      authority: { kind: "scoreboard", key: "Kills" },
      mirrors: [],
      scope: "arena",
    }] as any;
    const result = analyzeArenaStateIsolation([script], contracts);
    expect(result.observations.find((item) => item.surface === "scoreboard"))
      .toMatchObject({
        status: "partition-proof-required",
        scope: "world-global",
      });
  });


  it("does not claim isolation when matching authority contracts disagree on scope", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeArenaStateIsolation([script], [
      { id: "contract-arena", authority: { kind: "dynamic-property", key: "arenaState" }, mirrors: [], scope: "arena" },
      { id: "contract-player", authority: { kind: "dynamic-property", key: "arenaState" }, mirrors: [], scope: "player" },
    ]);
    expect(result.observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({
        scope: "unknown",
        status: "partition-proof-required",
        authorityContractIds: ["contract-arena", "contract-player"],
      });
  });

  it("does not promote provenance-free state contracts to isolated", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeArenaStateIsolation([script], [{
      id: "unproven-arena-contract",
      authority: { kind: "dynamic-property", key: "arenaState" },
      mirrors: [],
      scope: "arena",
    }]);
    expect(result.observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({
        status: "partition-proof-required",
        scope: "unknown",
        authorityContractIds: ["unproven-arena-contract"],
      });
  });


  it("rejects authority contracts referencing a different artifact", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      { artifactId: "selected-map", relativePath: "scripts/main.ts" },
    );
    const result = analyzeArenaStateIsolation([script], [{
      id: "foreign-state",
      authority: { kind: "dynamic-property", key: "arenaState" },
      mirrors: [],
      scope: "arena",
      sourceRefs: [{ artifactId: "other-map", relativePath: "scripts/main.ts" }],
    }]);
    expect(result.observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({
        status: "partition-proof-required",
        scope: "unknown",
        authorityContractIds: ["foreign-state"],
      });
  });

  it("rejects same-artifact contracts referencing a different script file", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.members.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      { artifactId: "selected-map", relativePath: "scripts/main.ts" },
    );
    const result = analyzeArenaStateIsolation([script], [{
      id: "unrelated-file",
      authority: { kind: "dynamic-property", key: "arenaState" },
      mirrors: [],
      scope: "arena",
      sourceRefs: [{ artifactId: "selected-map", relativePath: "scripts/other.ts" }],
    }]);
    expect(result.observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({
        status: "partition-proof-required",
        scope: "unknown",
        authorityContractIds: ["unrelated-file"],
      });
  });

});


  it("requires arena partition proof for global-selector mutations in arena flow", () => {
    const script = parseScriptFile(
      "main",
      [
        "function maintain(arena) {",
        "  arena.players.size;",
        "  world.getDimension('overworld').runCommandAsync('execute as @a at @s run fill ~1 ~0 ~1 ~-1 ~0 ~-1 grass_path replace dirt');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface === "world-command" &&
          item.key.includes("execute as @a"),
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });

  it("requires partition proof for literal ticking-area names used by arena flow", () => {
    const script = parseScriptFile(
      "main",
      [
        "function startArena(arena) {",
        "  arena.players.size;",
        "  world.getDimension('overworld').runCommandAsync('tickingarea add circle ~ ~ ~ 4 shared_cinematic true');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface === "world-command" &&
          item.key.includes("tickingarea add"),
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });


  it("flags world-wide player enumeration inside arena flow until partitioning is proven", () => {
    const script = parseScriptFile(
      "main",
      [
        "function cleanup(arena) {",
        "  arena.players.size;",
        "  for (const player of world.getAllPlayers()) {",
        "    player.removeTag('shared_carrier');",
        "  }",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface ===
          "world-player-enumeration",
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });

  it("accepts arena-keyed world player queries as isolated", () => {
    const script = parseScriptFile(
      "main",
      [
        "function cleanup(arena) {",
        "  arena.players.size;",
        "  const players = world.getPlayers({ tags: ['arena_' + arena.id] });",
        "  for (const player of players) player.removeTag('carrier');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface ===
          "world-player-enumeration",
      ),
    ).toMatchObject({
      scope: "arena-local",
      status: "isolated",
    });
  });


describe("source-owned arena state isolation evidence", () => {
  const arenaScript = (artifactId: string, relativePath: string) =>
    parseScriptFile("main", [
      "function join(arena, player) {",
      "  arena.players.add(player);",
      "  world.setDynamicProperty('arenaState', 1);",
      "}",
    ].join("\n"), { artifactId, relativePath });

  it("never treats player, entity, session or arena receiver NAMES as live instance proof", () => {
    const parsed = arenaScript("art:one", "scripts/round.js");
    const expressions = ["player", "group.player", "entity",
      "mob", "session", "arena", "round", "serverWorld"];
    const script = {
      ...parsed,
      dynamicProperties: expressions.map(receiverHint => ({
        operation: "set" as const,
        executionRegion: "function:join",
        receiverHint,
        propertyId: "status",
        source: parsed.source,
      })),
    };
    const observations = analyzeArenaStateIsolation([script]).observations
      .filter(obs => obs.surface === "dynamic-property");
    expect(observations).toHaveLength(expressions.length);
    for (const item of observations) {
      expect(item.scope).toBe("unknown");
      expect(item.status).toBe("partition-proof-required");
      expect(item.reason).toContain("independent type/alias/authority proof");
      expect(item.source?.artifactId).toBe("art:one");
      expect(item.source?.relativePath).toBe("scripts/round.js");
    }
    expect(analyzeArenaStateIsolation([script]).isolated).toBe(0);
  });

  it("requires exact authored authority tokens for qualified arena ownership", () => {
    const parsed = arenaScript("art:scope", "scripts/game.js");
    const region = "function:join";
    const scripted = {
      ...parsed,
      arenaAuthorityPaths: [{ executionRegion: region,
        arenaExpression: "arena.id",
        capacityAuthorityProven: false,
        startAuthorityProven: false,
        startGuardProven: false }],
      dynamicProperties: [
        { operation: "set" as const, executionRegion: region,
          receiverHint: "world",
          propertyExpression: "'arena:' + arena.id",
          source: parsed.source },
        { operation: "set" as const, executionRegion: region,
          receiverHint: "world",
          propertyExpression: "'arena:' + otherarena.id",
          source: parsed.source },
      ],
    };
    const observed = analyzeArenaStateIsolation([scripted]).observations
      .filter(item => item.surface === "dynamic-property");
    expect(observed).toHaveLength(2);
    expect(observed[0]).toMatchObject({
      scope: "arena-local", status: "isolated",
    });
    expect(observed[1]).toMatchObject({
      scope: "world-global", status: "partition-proof-required",
    });
    expect(observed[0]?.reason).toContain("runtime isolation remain unverified");
    expect(observed[1]?.source?.artifactId).toBe("art:scope");
  });

  it("does not borrow another package's contract when both use the same script identifier", () => {
    const selected = arenaScript("art:selected", "scripts/a.js");
    const foreign = arenaScript("art:foreign", "scripts/b.js");
    const contracts = [{
      id: "selected-state",
      authority: { kind: "dynamic-property" as const, key: "arenaState" },
      mirrors: [],
      scope: "arena" as const,
      sourceRefs: [selected.source],
    }];
    for (const ordered of [[selected, foreign], [foreign, selected]]) {
      const result = analyzeArenaStateIsolation(ordered, contracts);
      const selectedObs = result.observations.find(item =>
        item.surface === "dynamic-property" &&
        item.source?.artifactId === "art:selected");
      const foreignObs = result.observations.find(item =>
        item.surface === "dynamic-property" &&
        item.source?.artifactId === "art:foreign");
      expect(selectedObs).toMatchObject({
        scriptId: "main", scope: "arena-local",
        status: "isolated", authorityContractIds: ["selected-state"],
      });
      expect(foreignObs).toMatchObject({
        scriptId: "main", scope: "unknown",
        status: "partition-proof-required",
        authorityContractIds: ["selected-state"],
      });
      expect(foreignObs?.reason).toContain("matching source file");
      expect(result.isolated).toBe(1);
      expect(result.partitionProofRequired).toBe(1);
    }
  });
});
