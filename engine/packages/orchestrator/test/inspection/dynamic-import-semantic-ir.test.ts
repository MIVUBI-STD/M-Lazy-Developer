import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/parser/parse.js";
import { semanticIrExecutionTraces } from "../../../semantic-ir/src/query.js";
import { buildInspectionSemanticIr, scriptRegionId } from "../../src/diagnosis/semantic-ir-stage.js";

const parsed = (path: string, text: string, artifactId = "selected-map") => {
  const source = { artifactId, relativePath: path };
  return { parsed: parseScriptFile(path, text, source) };
};
const build = (...scripts: ReturnType<typeof parsed>[]) =>
  buildInspectionSemanticIr({ parsedFunctions: [], parsedScripts: scripts });

describe("selected-map dynamic import source handoffs", () => {
  it("joins a literal import() to the exact same-pack module as a deferred candidate", () => {
    const main = parsed("behavior_packs/BP/scripts/main.js", [
      "async function start() {",
      "  await import('./chunks/bootstrap.js');",
      "}",
      "start();",
    ].join("\n"));
    const chunk = parsed("behavior_packs/BP/scripts/chunks/bootstrap.js",
      "export const loaded = true;");
    const ir = build(main, chunk);
    const imports = ir.execution.edges.filter(edge =>
      edge.targetLabel.startsWith("import("));
    expect(imports).toHaveLength(1);
    expect(imports[0]).toMatchObject({
      kind: "deferred",
      controlFlow: "deferred",
      resolution: "resolved",
      from: scriptRegionId(main.parsed.source, "function:start"),
      to: scriptRegionId(chunk.parsed.source, "module"),
      source: expect.objectContaining({
        relativePath: main.parsed.source.relativePath,
        range: expect.objectContaining({ lineStart: 2 }),
      }),
    });
    expect(ir.temporal.relations.find(rel =>
      rel.id === "time:" + imports[0]!.id)).toMatchObject({
      kind: "deferred", resolution: "resolved",
    });
    expect(semanticIrExecutionTraces(ir).traces.some(trace =>
      trace.entryRegionId === scriptRegionId(main.parsed.source, "module") &&
      trace.regionIds.includes(scriptRegionId(chunk.parsed.source, "module"))
    )).toBe(true);
  });

  it("preserves nonliteral and absent module targets as unresolved evidence", () => {
    const main = parsed("behavior_packs/BP/scripts/main.js",
      "async function start(name) { await import(name); await import('./not-in-map.js'); }");
    const ir = build(main);
    const links = ir.execution.edges.filter(edge =>
      edge.targetLabel.startsWith("import("));
    expect(links).toHaveLength(2);
    expect(links.every(edge =>
      edge.kind === "deferred" && edge.resolution === "unresolved" &&
      edge.to === undefined)).toBe(true);
  });

  it("rejects foreign-pack and duplicate-path targets without selecting a winner", () => {
    const main = parsed("behavior_packs/BP/scripts/main.js",
      "async function start() { await import('./target.js'); await import('../../Other/scripts/target.js'); }");
    const first = parsed("behavior_packs/BP/scripts/target.js",
      "export const one = 1;");
    const duplicate = parsed("behavior_packs/BP/scripts/target.js",
      "export const two = 2;");
    const other = parsed("behavior_packs/Other/scripts/target.js",
      "export const outside = 3;");
    const ir = build(main, first, duplicate, other);
    const links = ir.execution.edges.filter(edge =>
      edge.targetLabel.startsWith("import("));
    expect(links).toHaveLength(2);
    expect(links.every(edge =>
      edge.resolution === "unresolved" && edge.to === undefined)).toBe(true);
  });
});
