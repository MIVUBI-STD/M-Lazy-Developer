import { describe, expect, it } from "vitest";
import {
  parseScriptFile,
} from "../../../src/index.js";

const source = {
  artifactId: "art-arena",
  relativePath: "scripts/arena.ts",
};

describe("arena authority evidence", () => {
  it("retains a direct generation mutation's lexical block identity only", () => {
    const parsed = parseScriptFile("arena", [
      "function reset(arena, flag) {",
      "  arena.generation++;",
      "  if (flag) { arena.generation++; }",
      "  if (flag) arena.generation++;",
      "}",
    ].join("\n"), source);
    const generation = parsed.arenaAuthorityEvidence?.filter(
      item => item.kind === "generation-invalidate") ?? [];
    expect(generation).toHaveLength(3);
    expect(generation[0]?.sequentialBlockSource?.range?.lineStart).toBe(1);
    expect(generation[1]?.sequentialBlockSource?.range?.lineStart).toBe(3);
    expect(generation[2]?.sequentialBlockSource).toBeUndefined();
  });

  it("retains receiver rebindings and prior early exits as distinct statement paths", () => {
    const parsed = parseScriptFile("arena", [
      "function reset(arena, otherArena, skip) {",
      "  arena.generation++;",
      "  arena = otherArena;",
      "  arena.generation++;",
      "  if (skip) return;",
      "  arena.generation++;",
      "}",
    ].join("\n"), source);
    const items = parsed.arenaAuthorityEvidence?.filter(
      item => item.kind === "generation-invalidate") ?? [];
    expect(items).toHaveLength(3);
    expect(items[0]?.sequentialPathEvidence?.precedingReceiverRebindingSources)
      .toEqual([]);
    expect(items[1]?.sequentialPathEvidence?.precedingReceiverRebindingSources
      .map(item => item.range?.lineStart)).toEqual([3]);
    expect(items[2]?.sequentialPathEvidence?.precedingReceiverRebindingSources
      .map(item => item.range?.lineStart)).toEqual([3]);
    expect(items[0]?.sequentialPathEvidence?.precedingControlExitSources)
      .toEqual([]);
    expect(items[1]?.sequentialPathEvidence?.precedingControlExitSources)
      .toEqual([]);
    expect(items[2]?.sequentialPathEvidence?.precedingControlExitSources
      .map(item => item.range?.lineStart)).toEqual([5]);
  });

  it("retains calls touching the arena or same-block const alias as source barriers", () => {
    const parsed = parseScriptFile("arena", [
      "function reset(arena) {",
      "  arena.generation++;",
      "  const alias = arena;",
      "  mutate(alias);",
      "  arena.generation++;",
      "  arena.inspect();",
      "  arena.generation++;",
      "}",
    ].join("\n"), source);
    const items = parsed.arenaAuthorityEvidence?.filter(
      item => item.kind === "generation-invalidate") ?? [];
    expect(items).toHaveLength(3);
    expect(items[0]?.sequentialPathEvidence?.precedingReceiverCallSources)
      .toEqual([]);
    expect(items[1]?.sequentialPathEvidence?.precedingReceiverCallSources
      .map(item => item.range?.lineStart)).toEqual([4]);
    expect(items[2]?.sequentialPathEvidence?.precedingReceiverCallSources
      .map(item => item.range?.lineStart)).toEqual([4, 6]);
  });

  it("proves a capacity authority path only when capacity and membership commit share the same arena object and execution region", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function join(arena, player) {",
        "  const maxPlayers = arena.maxPlayers;",
        "  if (arena.members.size >= maxPlayers) return;",
        "  arena.members.add(player);",
        "}",
      ].join("\n"),
      source,
    );

    expect(parsed.arenaAuthorityPaths).toEqual([
      expect.objectContaining({
        arenaExpression: "arena",
        executionRegion: "function:join",
        capacityAuthorityProven: true,
        startAuthorityProven: false,
        membershipCommit: expect.objectContaining({
          kind: "membership-commit",
          membershipExpression: "arena.members",
          subjectExpression: "player",
        }),
        capacityOperand: expect.objectContaining({
          kind: "capacity-operand",
          capacityExpression: "maxPlayers",
        }),
        capacityCheck: expect.objectContaining({
          kind: "capacity-check",
          membershipExpression: "arena.members",
          capacityExpression: "maxPlayers",
        }),
      }),
    ]);
  });


  it("accepts an inline numeric membership cap only with a same-arena commit", () => {
    const accepted = parseScriptFile(
      "literal",
      [
        "function join(arena, player) {",
        "  if (arena.members.length >= 5) return;",
        "  arena.members.push(player);",
        "}",
      ].join("\n"),
      source,
    );
    expect(accepted.arenaAuthorityPaths?.find(
      (item) => item.arenaExpression === "arena",
    )).toMatchObject({
      capacityAuthorityProven: true,
      capacityCheck: expect.objectContaining({
        capacityExpression: "5",
      }),
    });

    const wrongOwner = parseScriptFile(
      "other",
      [
        "function join(arena, otherArena, player) {",
        "  if (arena.members.length >= 5) return;",
        "  otherArena.members.push(player);",
        "}",
      ].join("\n"),
      source,
    );
    expect(wrongOwner.arenaAuthorityPaths?.find(
      (item) => item.arenaExpression === "arena",
    )).toMatchObject({
      capacityAuthorityProven: false,
    });
  });

  it("does not prove capacity ownership when a local limit belongs to a different arena object", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function join(arena, otherArena, player) {",
        "  const maxPlayers = otherArena.maxPlayers;",
        "  if (arena.members.size >= maxPlayers) return;",
        "  arena.members.add(player);",
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityPaths?.find(
        (path) =>
          path.arenaExpression === "arena",
      ),
    ).toMatchObject({
      capacityAuthorityProven: false,
    });
  });


  it("links a return-ternary rejection guard only to its successful membership commit", () => {
    const parsed = parseScriptFile(
      "minified-party",
      [
        "class Party {",
        "  join(player) {",
        "    return !['waiting','countdown'].includes(this.phase) ||",
        "      this.members.length >= this.definition.maxPlayers ||",
        "      this.members.includes(player)",
        "      ? !1 : (this.members.push(player), this.ready.delete(player), !0);",
        "  }",
        "}",
      ].join("\n"),
      source,
    );
    expect(parsed.arenaAuthorityPaths?.find(
      (path) => path.arenaExpression === "this" &&
        path.capacityCheck?.capacityExpression ===
          "this.definition.maxPlayers",
    )).toMatchObject({
      capacityAuthorityProven: true,
      capacityCheck: expect.objectContaining({
        membershipExpression: "this.members",
      }),
      membershipCommit: expect.objectContaining({
        membershipExpression: "this.members",
      }),
    });
  });

  it("does not confuse a wrong-owner or wrong-polarity ternary with enforced membership capacity", () => {
    const wrongOwner = parseScriptFile(
      "other",
      [
        "class Party {",
        "  join(player, other) {",
        "    return this.members.length >= this.definition.maxPlayers",
        "      ? false : (other.members.push(player), true);",
        "  }",
        "}",
      ].join("\n"),
      source,
    );
    expect(wrongOwner.arenaAuthorityPaths?.some(
      (path) => path.capacityAuthorityProven,
    )).toBe(false);

    const wrongPolarity = parseScriptFile(
      "reversed",
      [
        "class Party {",
        "  join(player) {",
        "    return this.members.length >= this.definition.maxPlayers",
        "      ? (this.members.push(player), true) : false;",
        "  }",
        "}",
      ].join("\n"),
      source,
    );
    expect(wrongPolarity.arenaAuthorityPaths?.some(
      (path) => path.capacityAuthorityProven,
    )).toBe(false);

    const wrongConfig = parseScriptFile(
      "different-config",
      [
        "class Party {",
        "  join(player, other) {",
        "    return this.members.length >= other.definition.maxPlayers",
        "      ? false : (this.members.push(player), true);",
        "  }",
        "}",
      ].join("\n"),
      source,
    );
    expect(wrongConfig.arenaAuthorityPaths?.some(
      (path) => path.capacityAuthorityProven,
    )).toBe(false);
  });

  it("rejects an inverted capacity comparison even with the correct membership owner", () => {
    const parsed = parseScriptFile(
      "reversed-limit",
      [
        "class Party {",
        "  join(player) {",
        "    return this.members.length < this.definition.maxPlayers",
        "      ? false : (this.members.push(player), true);",
        "  }",
        "}",
      ].join("\n"),
      source,
    );
    expect(parsed.arenaAuthorityPaths?.some(
      (path) => path.capacityAuthorityProven,
    )).toBe(false);
  });

  it("does not credit AND-guard fallthrough as capacity enforcement", () => {
    const parsed = parseScriptFile(
      "and-fallthrough",
      [
        "class Party {",
        "  join(player, disabled) {",
        "    return this.members.length >= this.definition.maxPlayers && disabled",
        "      ? false : (this.members.push(player), true);",
        "  }",
        "}",
      ].join("\n"),
      source,
    );
    expect(parsed.arenaAuthorityPaths?.some(
      (path) => path.capacityAuthorityProven,
    )).toBe(false);
  });

  it("proves start ownership only when owner acquisition and start-state commit share the same arena path", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function start(arena) {",
        "  const arenaGeneration = arena.generation;",
        "  arena.startOwner = arenaGeneration;",
        '  arena.state = "countdown";',
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityPaths?.find(
        (path) =>
          path.arenaExpression === "arena",
      ),
    ).toMatchObject({
      startAuthorityProven: true,
      generationOperand: expect.objectContaining({
        kind: "arena-generation-operand",
        generationExpression: "arenaGeneration",
      }),
      startOwnerAcquire: expect.objectContaining({
        kind: "start-owner-acquire",
        ownerExpression: "arenaGeneration",
        generationExpression: "arenaGeneration",
      }),
      startStateCommit: expect.objectContaining({
        kind: "start-state-commit",
        stateExpression: "arena.state=countdown",
      }),
    });
  });

  it("does not merge start ownership across different arena objects", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function start(arena, otherArena) {",
        "  const arenaGeneration = arena.generation;",
        "  otherArena.startOwner = arenaGeneration;",
        '  arena.state = "countdown";',
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityPaths?.find(
        (path) =>
          path.arenaExpression === "arena",
      ),
    ).toMatchObject({
      startAuthorityProven: false,
    });
  });

  it("keeps join-pad or queue-like arrays outside arena authority unless the authored property is an explicit membership surface", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function join(arena, player) {",
        "  arena.queue.push(player);",
        "}",
      ].join("\n"),
      source,
    );

    expect(parsed.arenaAuthorityEvidence).toEqual([]);
    expect(parsed.arenaAuthorityPaths).toEqual([]);
  });

  it("flags a ready-set snapshot reused by a delayed start callback", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function beginCountdown(arena) {",
        "  const readyCount = arena.readyPlayers.size;",
        "  system.runTimeout(() => {",
        "    if (readyCount < arena.maxPlayers) return;",
        "    arena.state = 'active';",
        "  }, 20);",
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityEvidence,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind:
            "ready-set-snapshot-risk",
          arenaExpression: "arena",
          subjectExpression:
            "readyCount",
          membershipExpression:
            "arena.readyPlayers",
        }),
      ]),
    );
  });

  it("does not flag a delayed start that re-reads the current ready set", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function beginCountdown(arena) {",
        "  const readyCount = arena.readyPlayers.size;",
        "  system.runTimeout(() => {",
        "    if (arena.readyPlayers.size < arena.maxPlayers) return;",
        "    arena.state = 'active';",
        "  }, 20);",
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityEvidence
        ?.some(
          (item) =>
            item.kind ===
              "ready-set-snapshot-risk",
        ),
    ).toBe(false);
  });

  it("proves explicit ordered terminal outcome precedence only when the terminal owner consumes it", () => {
    const sourceText = [
      "const RESULT_PRECEDENCE = ['objective', 'timeout', 'disconnect'];",
      "function endGame(candidates) {",
      "  return RESULT_PRECEDENCE.find((reason) => candidates.has(reason));",
      "}",
    ].join("\n");

    expect(
      deriveScriptTerminalPrecedenceEvidence(
        sourceText,
        source,
      ),
    ).toEqual([
      expect.objectContaining({
        functionRegion:
          "function:endGame",
        policyBinding:
          "RESULT_PRECEDENCE",
        policyKind:
          "ordered-outcomes",
        outcomes: [
          "objective",
          "timeout",
          "disconnect",
        ],
      }),
    ]);
  });

  it("does not credit an unused precedence declaration as terminal resolution proof", () => {
    const sourceText = [
      "const RESULT_PRECEDENCE = ['objective', 'timeout'];",
      "function endGame(result) {",
      "  return result;",
      "}",
    ].join("\n");

    expect(
      deriveScriptTerminalPrecedenceEvidence(
        sourceText,
        source,
      ),
    ).toEqual([]);
  });
});
