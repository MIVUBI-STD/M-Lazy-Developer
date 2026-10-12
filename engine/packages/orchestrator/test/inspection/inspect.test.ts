import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectDirectory } from "../../src/inspection/inspect.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/parser/parse.js";
import { SemanticGraph } from "../../../graph/src/index.js";
import type { SemanticNode } from "../../../graph/src/index.js";
import { populateInspectionScriptImportGraph } from "../../src/inspection/inspect-script-import-graph.js";
import { discoverInspectionPacks } from "../../src/inspection/inspect-packs.js";
import { buildFilesystemInventory } from "../../../project-model/src/index.js";

describe("inspectDirectory", () => {
  it("discovers pack, functions, structures and unresolved references", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-inspect-"));
    const pack = join(root, "behavior_packs/demo");

    await mkdir(join(pack, "functions"), { recursive: true });
    await mkdir(join(pack, "structures"), { recursive: true });

    await writeFile(join(pack, "manifest.json"), JSON.stringify({
      format_version: 2,
      header: {
        name: "Demo",
        description: "Demo",
        uuid: "00000000-0000-0000-0000-000000000001",
        version: [1,0,0]
      },
      modules: [{
        type: "data",
        uuid: "00000000-0000-0000-0000-000000000002",
        version: [1,0,0]
      }]
    }));

    await writeFile(join(pack, "functions/start.mcfunction"), [
      "function missing/reset",
      "structure load arena/test 0 0 0",
    ].join("\n"));

    await writeFile(join(pack, "structures/test.mcstructure"), "fixture");

    const result = await inspectDirectory(root);
    expect(result.packs[0]?.type).toBe("behavior_pack");
    expect(result.functions).toBe(1);
    expect(result.structures).toBe(1);
    expect(result.unresolvedReferences).toBeGreaterThan(0);
    expect(result.semanticIr.executionRegions).toBeGreaterThan(0);
    expect(result.semanticIr.executionEdges).toBeGreaterThan(0);
    expect(result.semanticIr.unresolvedExecutionTargets).toBeGreaterThan(0);
    expect(result.decisionBasis.semanticIrRevision).toMatch(/^[a-f0-9]{64}$/);
  });
  it("keeps duplicate function targets unresolved for Discovery Closure", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-ambiguous-"));
    try {
      for (const pack of ["a", "b"]) {
        const dir = join(root, "behavior_packs", pack, "functions");
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "start.mcfunction"), "say ready\\n");
      }
      await writeFile(join(root, "behavior_packs", "a", "functions", "tick.json"),
        JSON.stringify({ values: ["start"] }));
      const result = await inspectDirectory(root);
      expect(result.gameplayDiscoveryClosure.unresolvedReferences).toBeGreaterThan(0);
      expect(result.unresolvedReferences).toBe(result.gameplayDiscoveryClosure.unresolvedReferences);
      expect(result.gameplayDiscoveryClosure.status).not.toBe("COMPLETE");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not treat an icon-only unlisted pack as gameplay source", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-icon-only-"));
    try {
      for (const name of ["a", "b"]) {
        await mkdir(join(root, "behavior_packs", name, "functions"), { recursive: true });
        await writeFile(join(root, "behavior_packs", name, "manifest.json"), JSON.stringify({
          format_version: 2,
          header: { name, uuid: name === "a" ? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", version: [1,0,0] },
          modules: [{ type: "data", uuid: "cccccccc-cccc-cccc-cccc-cccccccccccc", version: [1,0,0] }],
        }));
      }
      await writeFile(join(root, "world_behavior_packs.json"), JSON.stringify([
        { pack_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: [1,0,0] },
      ]));
      await writeFile(join(root, "behavior_packs/b/pack_icon.png"), "icon");
      await writeFile(join(root, "behavior_packs/a/functions/start.mcfunction"), "say ready");
      const withoutSource = await inspectDirectory(root);
      expect(withoutSource.gameplayDiscoveryClosure.unlistedPackRoots).toEqual([]);
      await writeFile(join(root, "behavior_packs/b/functions/start.mcfunction"), "say ready");
      const withSource = await inspectDirectory(root);
      expect(withSource.gameplayDiscoveryClosure.unlistedPackRoots).toEqual(["behavior_packs/b"]);
      expect(withSource.gameplayDiscoveryClosure.sourceRelevantFiles)
        .toBeGreaterThan(withoutSource.gameplayDiscoveryClosure.sourceRelevantFiles);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("recognizes valid dialogue as source in an unlisted pack", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-dialogue-pack-"));
    try {
      const pack = join(root, "behavior_packs", "dialogue");
      await mkdir(join(pack, "dialogue"), { recursive: true });
      await writeFile(join(pack, "manifest.json"), JSON.stringify({
        format_version: 2,
        header: { name: "dialogue", uuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: [1,0,0] },
        modules: [{ type: "data", uuid: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", version: [1,0,0] }],
      }));
      await writeFile(join(root, "world_behavior_packs.json"), "[]");
      await writeFile(join(pack, "dialogue", "npc.json"), JSON.stringify({
        format_version: "1.17",
        minecraft_npc_dialogue: { scenes: [{ scene_tag: "entry", npc_name: "Guide", text: "Start" }] },
      }));
      const result = await inspectDirectory(root);
      expect(result.gameplayDiscoveryClosure.unlistedPackRoots).toEqual(["behavior_packs/dialogue"]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("retains semantic understanding gaps from unlisted gameplay packs", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-gap-pack-"));
    try {
      const pack = join(root, "behavior_packs", "gap");
      await mkdir(join(pack, "loot_tables"), { recursive: true });
      await writeFile(join(pack, "manifest.json"), JSON.stringify({
        format_version: 2,
        header: { name: "gap", uuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: [1,0,0] },
        modules: [{ type: "data", uuid: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", version: [1,0,0] }],
      }));
      await writeFile(join(root, "world_behavior_packs.json"), "[]");
      await writeFile(join(pack, "loot_tables", "reward.json"), JSON.stringify({ pools: [] }));
      const result = await inspectDirectory(root);
      expect(result.gameplayDiscoveryClosure.unlistedPackRoots).toEqual(["behavior_packs/gap"]);
      expect(result.gameplayDiscoveryClosure.semanticUnderstandingGapPaths)
        .toContain("behavior_packs/gap/loot_tables/reward.json");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("distinguishes declared world pack membership from manifest presence", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-pack-list-"));
    try {
      for (const name of ["a", "b"]) {
        await mkdir(join(root, "behavior_packs", name), { recursive: true });
        await writeFile(join(root, "behavior_packs", name, "manifest.json"), JSON.stringify({
          format_version: 2,
          header: { name, uuid: name === "a" ? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" : "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", version: [1, 0, 0] },
          modules: [{ type: "data", uuid: "cccccccc-cccc-cccc-cccc-cccccccccccc", version: [1,0,0] }],
        }));
      }
      await writeFile(join(root, "world_behavior_packs.json"), JSON.stringify([
        { pack_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: [1,0,0] },
      ]));
      const entries = await buildFilesystemInventory(root);
      const result = await discoverInspectionPacks(root, "artifact", entries);
      expect(result.packs.map(pack => [pack.root, pack.worldAttachment])).toEqual([
        ["behavior_packs/a", "listed"], ["behavior_packs/b", "not-listed"],
      ]);
      await writeFile(join(root, "world_behavior_packs.json"), "{invalid");
      const unknown = await discoverInspectionPacks(root, "artifact", entries);
      expect(unknown.packs.every(pack => pack.worldAttachment === "unknown")).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("keeps literal import() as a resolved source dependency, not a proven execution", () => {
    const source = {
      artifactId: "selected",
      relativePath: "behavior_packs/demo/scripts/main.js",
    };
    const targetSource = {
      artifactId: "selected",
      relativePath: "behavior_packs/demo/scripts/chunks/arena.js",
    };
    const entry = parseScriptFile("entry", [
      "import './chunks/arena.js';",
      "async function start(name) {",
      "  await import('./chunks/arena.js');",
      "  await import(name);",
      "}",
    ].join("\n"), source);
    const arena = parseScriptFile("arena", "export const value = 1;", targetSource);
    const graph = new SemanticGraph();
    const node = (id: string, s: typeof source): SemanticNode =>
      ({
        id,
        identifier: id,
        kind: "script",
        identity: { kind: "script", scope: "project", identifier: id },
        source: s,
      }) as SemanticNode;
    const a = node("script:entry", source);
    const b = node("script:arena", targetSource);
    graph.addNode(a);
    graph.addNode(b);
    populateInspectionScriptImportGraph(graph, [
      { node: a, parsed: entry }, { node: b, parsed: arena },
    ]);
    const staticEdge = graph.allEdges().find(edge =>
      edge.type === "IMPORTS_SCRIPT" && edge.importSyntax === undefined);
    const literal = graph.allEdges().find(edge =>
      edge.type === "IMPORTS_SCRIPT" && edge.importSyntax === "dynamic-literal");
    const expression = graph.allEdges().find(edge =>
      edge.type === "IMPORTS_SCRIPT" && edge.importSyntax === "dynamic-expression");
    expect(staticEdge).toMatchObject({
      status: "resolved", from: a.id, to: b.id,
    });
    expect(literal).toMatchObject({
      status: "resolved", from: a.id, to: b.id,
      importSyntax: "dynamic-literal",
      evidence: { source: expect.objectContaining({
        relativePath: source.relativePath,
        range: expect.objectContaining({ lineStart: 3 }),
      }) },
    });
    expect(expression).toMatchObject({
      status: "unresolved", from: a.id,
      importSyntax: "dynamic-expression",
    });
    expect(expression?.to).toBeUndefined();
  });

});
