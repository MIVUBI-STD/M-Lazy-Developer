import { describe, expect, it } from "vitest";
import {
  deriveCrossFileCallEdges,
} from "../../src/parser/cross-file-call.js";

describe("cross-file call resolution", () => {
  it("resolves named ESM imports across TypeScript .js specifiers", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function releaseArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { releaseArena } from "./cleanup.js";
          export function finishGame() {
            releaseArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges).toEqual([
      expect.objectContaining({
        callerModule: "scripts/main.ts",
        callerRegion: "function:finishGame",
        targetModule: "scripts/cleanup.ts",
        targetExport: "releaseArena",
        controlFlow: "unconditional",
        status: "resolved",
      }),
    ]);
  });

  it("keeps a call unresolved when the module exists but the imported export does not", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { releaseArena } from "./cleanup.js";
          export function finishGame() {
            releaseArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "releaseArena",
        status: "unresolved",
      }),
    );
  });

  it("resolves namespace imports to the implementation module", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/arena.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/arena.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import * as arena from "./arena.js";
          export function finishGame() {
            arena.cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/arena.ts",
        targetExport: "cleanupArena",
        localName: "arena.cleanupArena",
        status: "resolved",
      }),
    );
  });

  it("follows named re-export barrel chains to the implementation module", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/barrel.ts",
        text: 'export { cleanupArena } from "./cleanup.js";',
        source: { artifactId: "map", relativePath: "scripts/barrel.ts" },
      },
      {
        path: "scripts/index.ts",
        text: 'export { cleanupArena } from "./barrel.js";',
        source: { artifactId: "map", relativePath: "scripts/index.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { cleanupArena } from "./index.js";
          export function finishGame() {
            cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanupArena",
        status: "resolved",
      }),
    );
  });

  it("resolves local export aliases to the implementation symbol", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: `
          function cleanup() {}
          export { cleanup as cleanupArena };
        `,
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { cleanupArena } from "./cleanup.js";
          export function finishGame() {
            cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanup",
        status: "resolved",
      }),
    );
  });

  it("resolves named default exports to the implementation symbol", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export default function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import cleanup from "./cleanup.js";
          export function finishGame() {
            cleanup();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        targetModule: "scripts/cleanup.ts",
        targetExport: "cleanupArena",
        status: "resolved",
      }),
    );
  });


  it("treats cross-file calls after early return as conditional", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: `
          import { cleanupArena } from "./cleanup.js";
          export function finishGame(skipCleanup) {
            if (skipCleanup) return;
            cleanupArena();
          }
        `,
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);

    expect(edges[0]).toEqual(
      expect.objectContaining({
        controlFlow: "conditional",
        status: "resolved",
      }),
    );
  });


  it("records exact target regions for exported functions and const callbacks", () => {
    const edges = deriveCrossFileCallEdges([
      { path: "behavior_packs/demo/scripts/round.js", source: {
        artifactId: "world", relativePath: "behavior_packs/demo/scripts/round.js",
      }, text: [
        "function cleanupArena() {}",
        "export { cleanupArena as finishRound };",
        "export const scheduleNext = () => {};",
        "export class ArenaService {}",
      ].join("\n") },
      { path: "behavior_packs/demo/scripts/main.js", source: {
        artifactId: "world", relativePath: "behavior_packs/demo/scripts/main.js",
      }, text: [
        'import { finishRound as settle, scheduleNext, ArenaService } from "./round.js";',
        "function resolveGame() { settle(); scheduleNext(); ArenaService(); }",
      ].join("\n") },
    ]);
    expect(edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        localName: "settle", targetExport: "cleanupArena",
        targetRegion: "function:cleanupArena", status: "resolved",
      }),
      expect.objectContaining({
        localName: "scheduleNext", targetExport: "scheduleNext",
        targetRegion: expect.stringMatching(/^callback@3:/), status: "resolved",
      }),
      expect.objectContaining({
        localName: "ArenaService", status: "unresolved",
      }),
    ]));
    expect(edges.find(item => item.localName === "ArenaService")?.targetRegion)
      .toBeUndefined();
  });

  it("does not resolve imported call names shadowed by function/block locals", () => {
    const edges = deriveCrossFileCallEdges([
      { path: "scripts/cleanup.js", source: {
        artifactId: "world", relativePath: "scripts/cleanup.js",
      }, text: "export function cleanup() {}" },
      { path: "scripts/main.js", source: {
        artifactId: "world", relativePath: "scripts/main.js",
      }, text: [
        'import { cleanup } from "./cleanup.js";',
        "function correct() { cleanup(); }",
        "function shadowedParameter(cleanup) { cleanup(); }",
        "function shadowedBlock() {",
        "  const cleanup = () => {};",
        "  cleanup();",
        "}",
      ].join("\n") },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      callerRegion: "function:correct",
      targetRegion: "function:cleanup",
      status: "resolved",
    });
  });

  it("fails closed for cross-artifact, cross-pack and duplicate-path targets", () => {
    const source = (artifactId: string, relativePath: string) => ({
      artifactId, relativePath,
    });
    const target = "behavior_packs/a/scripts/cleanup.js";
    const main = "behavior_packs/a/scripts/main.js";
    const modules = [{
      path: target, text: "export function cleanup() {}",
      source: source("world", target),
    }, {
      path: main,
      text: 'import { cleanup } from "./cleanup.js"; cleanup();',
      source: source("world", main),
    }];
    const valid = deriveCrossFileCallEdges(modules);
    expect(valid[0]).toMatchObject({
      status: "resolved", targetRegion: "function:cleanup",
    });
    const foreign = deriveCrossFileCallEdges([
      { ...modules[0]!, source: source("another-world", target) },
      modules[1]!,
    ]);
    expect(foreign[0]).toMatchObject({ status: "unresolved" });
    expect(foreign[0]?.targetRegion).toBeUndefined();
    const duplicate = deriveCrossFileCallEdges([
      ...modules, { ...modules[0]!, source: source("duplicate", target) },
    ]);
    expect(duplicate[0]).toMatchObject({ status: "unresolved" });
    const otherPack = "behavior_packs/b/scripts/cleanup.js";
    const crossPack = deriveCrossFileCallEdges([{
      path: otherPack, source: source("world", otherPack),
      text: "export function cleanup() {}",
    }, {
      path: main, source: source("world", main),
      text: 'import { cleanup } from "../../b/scripts/cleanup.js"; cleanup();',
    }]);
    expect(crossPack[0]).toMatchObject({ status: "unresolved" });
    expect(crossPack[0]?.targetRegion).toBeUndefined();
  });

  it("does not treat type-only ESM imports as executable calls", () => {
    const edges = deriveCrossFileCallEdges([
      {
        path: "scripts/cleanup.ts",
        text: "export function cleanupArena() {}",
        source: { artifactId: "map", relativePath: "scripts/cleanup.ts" },
      },
      {
        path: "scripts/main.ts",
        text: [
          'import type { cleanupArena } from "./cleanup.js";',
          "function illegalRuntimeUse() { cleanupArena(); }",
        ].join("\n"),
        source: { artifactId: "map", relativePath: "scripts/main.ts" },
      },
    ]);
    expect(edges).toEqual([]);
  });


});

describe("exact ESM argument-to-parameter reference evidence", () => {
  const file = (name: string, text: string) => ({
    path: "behavior_packs/example/scripts/" + name, text,
    source: { artifactId: "selected-world",
      relativePath: "behavior_packs/example/scripts/" + name },
  });
  it("binds direct immutable parameters by position even with import aliases", () => {
    const main = file("main.js", [
      'import { finish as close } from "./cleanup.js";',
      "function join(arena, player) { close(arena, player); }",
    ].join("\n"));
    const target = file("cleanup.js",
      "export function finish(ctx, member) { return ctx; }");
    const edges = deriveCrossFileCallEdges([main, target]);
    expect(edges[0]).toMatchObject({
      status: "resolved", targetExport: "finish",
      argumentParameterBindings: [
        expect.objectContaining({ index: 0, argumentName: "arena", parameterName: "ctx" }),
        expect.objectContaining({ index: 1, argumentName: "player", parameterName: "member" }),
      ],
    });
    const bindings = edges[0]?.argumentParameterBindings ?? [];
    expect(bindings).toHaveLength(2);
    expect(bindings.every(binding =>
      binding.argumentSource.relativePath === main.path &&
      binding.parameterSource.relativePath === target.path &&
      binding.argumentSource.range !== undefined &&
      binding.parameterSource.range !== undefined)).toBe(true);
  });

  it("does not infer identity through local aliases, mutations or default parameters", () => {
    const target = file("cleanup.js",
      "export function finish(ctx, member = null) { ctx = member; }");
    const main = file("main.js", [
      'import { finish } from "./cleanup.js";',
      "function join(arena, player) { const other = arena; finish(other, player); }",
    ].join("\n"));
    const edge = deriveCrossFileCallEdges([main, target])[0];
    expect(edge).toMatchObject({ status: "resolved" });
    expect(edge?.argumentParameterBindings).toBeUndefined();
  });

  it("rejects a same-named local shadow of a caller parameter", () => {
    const target = file("cleanup.js", "export function finish(ctx) { return ctx; }");
    const main = file("main.js", [
      'import { finish } from "./cleanup.js";',
      "function join(arena) { { const arena = { id: 4 }; finish(arena); } }",
    ].join("\n"));
    const edge = deriveCrossFileCallEdges([main, target])[0];
    expect(edge).toMatchObject({ status: "resolved" });
    expect(edge?.argumentParameterBindings).toBeUndefined();
  });

  it("rejects parameter writes through destructuring or loop assignments", () => {
    const target = file("cleanup.js", "export function finish(ctx) { return ctx; }");
    for (const mutation of ["({ arena } = other);", "for (arena of arenas) {}"]) {
      const main = file("main.js", [
        'import { finish } from "./cleanup.js";',
        "function join(arena, other, arenas) {",
        "  " + mutation,
        "  finish(arena);",
        "}",
      ].join("\n"));
      const edge = deriveCrossFileCallEdges([main, target])[0];
      expect(edge?.argumentParameterBindings).toBeUndefined();
    }
  });
});
