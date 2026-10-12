import type { ParsedEntityDefinition } from "../../entities/src/index.js";
import type { SemanticGraph, SemanticNode } from "../../../packages/graph/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/index.js";

/**
 * Match authored minecraft:loot / minecraft:equipment table references to
 * physical JSON definitions in the SAME selected behavior pack.
 *
 * This adds source-dependency evidence only. A reference in a component group
 * does not prove the group or its enabling event ever ran in Minecraft.
 */
export function populateEntityLootTableEdges(
  graph: SemanticGraph,
  entities: readonly { node: SemanticNode; parsed: ParsedEntityDefinition }[],
  nodes: readonly SemanticNode[],
): void {
  const normalized = (value: string): string => value.replaceAll("\\", "/");
  const packRoot = (value: string): string | undefined => {
    const pieces = normalized(value).split("/");
    const index = pieces.findIndex(part =>
      part === "behavior_packs" || part === "behavior_pack");
    return index >= 0 && pieces[index + 1]
      ? pieces.slice(0, index + 2).join("/")
      : undefined;
  };
  const pointer = (value: string): string =>
    value.replaceAll("~", "~0").replaceAll("/", "~1");
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;

  for (const { node, parsed } of entities) {
    const owner = packRoot(parsed.source.relativePath);
    if (!owner || node.source?.artifactId !== parsed.source.artifactId ||
        normalized(node.source.relativePath) !== normalized(parsed.source.relativePath)) {
      continue;
    }

    const componentSources = [
      { prefix: "/minecraft:entity/components", data: parsed.baseComponentData },
      ...Object.entries(parsed.componentGroupData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([groupName, data]) => ({
          prefix: "/minecraft:entity/component_groups/" + pointer(groupName),
          data,
        })),
    ];
    for (const { prefix, data } of componentSources) {
      for (const component of ["minecraft:loot", "minecraft:equipment"]) {
        const table = record(data[component])?.table;
        if (typeof table !== "string") continue;
        const authored = normalized(table.trim());
        const parts = authored.split("/");
        // Only literal local loot_tables relative paths are source-resolvable.
        // Unknown namespace/runtime/vanilla references are not guessed.
        if (parts[0] !== "loot_tables" || parts.length < 2 ||
            parts.some(part => !part || part === "." || part === "..") ||
            !/^[\w./-]+$/.test(authored)) continue;
        const targetPath = owner + "/" +
          (authored.endsWith(".json") ? authored : authored + ".json");
        const matches = nodes.filter(candidate =>
          candidate.kind === "loot_table" &&
          candidate.source?.artifactId === parsed.source.artifactId &&
          packRoot(candidate.source.relativePath) === owner &&
          normalized(candidate.source.relativePath) === targetPath);

        const source: SourceRef = {
          ...parsed.source,
          jsonPointer: prefix + "/" + pointer(component) + "/table",
        };
        graph.addEdge({
          from: node.id,
          type: "REFERENCES",
          targetIdentifier: authored,
          status: matches.length === 1
            ? "resolved"
            : matches.length > 1 ? "ambiguous" : "unresolved",
          ...(matches.length === 1
            ? { to: matches[0]!.id }
            : matches.length > 1
              ? { candidates: matches.map(item => item.id).sort() }
              : {}),
          evidence: { source },
        });
      }
    }
  }
}
