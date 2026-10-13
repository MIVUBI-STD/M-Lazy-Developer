import { describe, expect, it } from "vitest";
import { extractArenaConcurrencyCapacity } from "../../src/arena/arena-capacity-extraction.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

const absolute = (x: number, y: number, z: number) => ({
  x: { mode: "absolute" as const, value: x },
  y: { mode: "absolute" as const, value: y },
  z: { mode: "absolute" as const, value: z },
});

describe("arena concurrency capacity extraction", () => {
  it("derives command ticking-area per-arena cost from complete translated families", () => {
    const result = extractArenaConcurrencyCapacity({
      discovery: {
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
          items: [],
        },
        replicas: [{
          arenaId: "arena-2",
          anchor: { x: 100, y: 0, z: 0 },
          items: [],
        }],
        offsets: [{ x: 100, y: 0, z: 0 }],
        supportByOffset: { "100,0,0": 3 },
        confidence: "medium",
        evidenceCandidates: 3,
      },
      tickingAreas: [
        {
          functionId: "arena/setup",
          semantics: {
            action: "add-circle",
            center: absolute(0, 0, 0),
            radius: 2,
          },
        },
        {
          functionId: "arena/setup",
          semantics: {
            action: "add-circle",
            center: absolute(100, 0, 0),
            radius: 2,
          },
        },
      ],
    });

    expect(result.evidence).toMatchObject({
      requestedConcurrentArenas: 2,
      completeCommandTickingAreaFamilies: 1,
      unmatchedCommandTickingAreaAdds: 0,
      commandTickingAreaResourceResolved: true,
    });
    expect(result.resources).toEqual([{
      id: "command-tickingarea-slots",
      backend: "fixed-pool",
      perArena: 1,
      total: 10,
    }]);
    expect(result.report?.ok).toBe(true);
  });

  it("refuses to infer capacity from incomplete translated families", () => {
    const result = extractArenaConcurrencyCapacity({
      discovery: {
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
          items: [],
        },
        replicas: [{
          arenaId: "arena-2",
          anchor: { x: 100, y: 0, z: 0 },
          items: [],
        }],
        offsets: [{ x: 100, y: 0, z: 0 }],
        supportByOffset: { "100,0,0": 3 },
        confidence: "medium",
        evidenceCandidates: 3,
      },
      tickingAreas: [{
        functionId: "arena/setup",
        semantics: {
          action: "add-circle",
          center: absolute(0, 0, 0),
          radius: 2,
        },
      }],
    });

    expect(result.resources).toEqual([]);
    expect(
      result.evidence.commandTickingAreaResourceResolved,
    ).toBe(false);
    expect(result.report?.safeConcurrentArenas).toBeNull();
  });

  it("reports player capacity as evidence without treating it as an arena limiter", () => {
    const script = {
      arenaAuthorityPaths: [{
        arenaExpression: "arena",
        executionRegion: "function:join",
        capacityAuthorityProven: true,
        startAuthorityProven: false,
        startGuardProven: false,
        capacityCheck: {
          kind: "capacity-check",
          arenaExpression: "arena",
          membershipExpression: "arena.players",
          capacityExpression: "5",
          executionRegion: "function:join",
          source: {
            artifactId: "fixture",
            relativePath: "scripts/main.ts",
          },
        },
      }],
      propertyAccesses: [],
      methodCalls: [],
      moduleMemberAccesses: [],
    } as unknown as ParsedScriptFile;

    const result = extractArenaConcurrencyCapacity({
      discovery: {
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
          items: [],
        },
        replicas: [{
          arenaId: "arena-2",
          anchor: { x: 100, y: 0, z: 0 },
          items: [],
        }],
        offsets: [{ x: 100, y: 0, z: 0 }],
        supportByOffset: {},
        confidence: "medium",
        evidenceCandidates: 2,
      },
      tickingAreas: [],
      scripts: [script],
    });

    expect(result.evidence).toMatchObject({
      perArenaPlayerCapacity: 5,
      perArenaPlayerCapacitySources: [{
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      }],
      declaredMaxConcurrentPlayers: 10,
      conflictingPlayerCapacityValues: [],
    });
    expect(result.resources).toEqual([]);
    expect(result.report?.safeConcurrentArenas).toBeNull();
  });

  it("retains both guard and immutable declaration provenance for source-owned capacity", () => {
    const script = parseScriptFile(
      "module-capacity",
      [
        "const settings = { max_member: 5 };",
        "function join(arena, player) {",
        "  if (arena.members.length >= settings.max_member) return;",
        "  arena.members.push(player);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.js" },
    );
    const result = extractArenaConcurrencyCapacity({
      tickingAreas: [], scripts: [script],
    });
    expect(result.evidence.perArenaPlayerCapacity).toBe(5);
    expect(result.evidence.perArenaPlayerCapacitySources).toEqual([
      expect.objectContaining({ range: expect.objectContaining({ lineStart: 3 }) }),
      expect.objectContaining({ range: expect.objectContaining({ lineStart: 1 }) }),
    ]);
  });

  it("carries constructor-source proof through to the B3/B5 capacity evidence", () => {
    const script = parseScriptFile("construct",[
      "class Party {",
      "  constructor(definition) { this.definition = definition; this.members = []; }",
      "  join(player) { return this.members.length >= this.definition.maxPlayers",
      "    ? false : (this.members.push(player), true); }",
      "}",
      "const party = new Party({maxPlayers:5});",
      "party.join('one');",
    ].join("\n"),{artifactId:"fixture",relativePath:"scripts/main.js"});
    const result=extractArenaConcurrencyCapacity({tickingAreas:[],scripts:[script]});
    expect(result.evidence.perArenaPlayerCapacity).toBe(5);
    expect(result.evidence.perArenaPlayerCapacitySources?.length).toBe(4);
    expect(result.evidence.perArenaPlayerCapacitySources?.every((item)=>
      item.relativePath==="scripts/main.js")).toBe(true);
  });

  it("does not convert a guarded but unresolved config property into numeric capacity", () => {
    const script = {
      arenaAuthorityPaths: [{
        arenaExpression: "this",
        executionRegion: "method:join",
        capacityAuthorityProven: true,
        startAuthorityProven: false,
        startGuardProven: false,
        capacityCheck: {
          kind: "capacity-check",
          arenaExpression: "this",
          membershipExpression: "this.members",
          capacityExpression: "this.definition.maxPlayers",
          executionRegion: "method:join",
          source: {
            artifactId: "fixture",
            relativePath: "scripts/compiled.js",
          },
        },
      }],
      propertyAccesses: [],
      methodCalls: [],
      moduleMemberAccesses: [],
    } as unknown as ParsedScriptFile;

    const result = extractArenaConcurrencyCapacity({
      tickingAreas: [],
      scripts: [script],
    });
    expect(result.evidence.perArenaPlayerCapacity).toBeUndefined();
    expect(result.evidence.perArenaPlayerCapacitySources).toBeUndefined();
  });

  it("reports a shortfall when runtime admission caps six arenas at two", () => {
    const offsets = Array.from(
      { length: 5 },
      (_, index) => ({
        x: (index + 1) * 100,
        y: 0,
        z: 0,
      }),
    );

    const result =
      extractArenaConcurrencyCapacity({
        discovery: {
          canonical: {
            arenaId: "arena-1",
            anchor: { x: 0, y: 0, z: 0 },
            items: [],
          },
          replicas: offsets.map(
            (offset, index) => ({
              arenaId:
                "arena-" + String(index + 2),
              anchor: offset,
              items: [],
            }),
          ),
          offsets,
          supportByOffset: {},
          confidence: "high",
          evidenceCandidates: 6,
        },
        tickingAreas: [],
        declaredConcurrentArenaLimit: 2,
      });

    expect(result.evidence).toMatchObject({
      requestedConcurrentArenas: 6,
      declaredConcurrentArenaLimit: 2,
    });
    expect(result.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "runtime-arena-admission-cap",
          perArena: 1,
          total: 2,
        }),
      ]),
    );
    expect(result.report).toMatchObject({
      requestedConcurrentArenas: 6,
      safeConcurrentArenas: 2,
      ok: false,
    });
  });

  it("reports a shortfall when proven command families exceed the 10-slot backend", () => {
    const offsets = Array.from({ length: 5 }, (_, index) => ({
      x: (index + 1) * 100,
      y: 0,
      z: 0,
    }));
    const arenaOffsets = [{ x: 0, y: 0, z: 0 }, ...offsets];
    const tickingAreas = arenaOffsets.flatMap((offset) =>
      [0, 20].map((localX) => ({
        functionId: "arena/setup",
        semantics: {
          action: "add-circle" as const,
          center: absolute(offset.x + localX, 0, 0),
          radius: 2,
        },
      }))
    );

    const result = extractArenaConcurrencyCapacity({
      discovery: {
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
          items: [],
        },
        replicas: offsets.map((offset, index) => ({
          arenaId: `arena-${index + 2}`,
          anchor: offset,
          items: [],
        })),
        offsets,
        supportByOffset: {},
        confidence: "high",
        evidenceCandidates: 6,
      },
      tickingAreas,
    });

    expect(result.resources[0]).toMatchObject({
      perArena: 2,
      total: 10,
    });
    expect(result.report).toMatchObject({
      requestedConcurrentArenas: 6,
      safeConcurrentArenas: 5,
      ok: false,
    });
  });
});
