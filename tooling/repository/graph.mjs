import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { buildResourceCatalog, resourceIdForDocumentPath } from "./resource-catalog.mjs";

const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]+)\)/g;

function cleanTarget(value) {
  return value
    .trim()
    .replace(/^<|>$/g, "")
    .split("#", 1)[0]
    .split("?", 1)[0];
}

function resolveResourceLink(fromPath, rawTarget) {
  const target = cleanTarget(rawTarget);
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;

  const resolved = target.startsWith("/")
    ? target.slice(1)
    : posix.normalize(posix.join(posix.dirname(fromPath), target));

  if (resolved === ".." || resolved.startsWith("../")) {
    return undefined;
  }
  return resolved;
}

function addEdge(edges, seen, edge) {
  if (edge.from === edge.to) return;
  const key = edge.from + "|" + edge.type + "|" + edge.to;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push(edge);
}

export function buildGraph() {
  const catalog = buildResourceCatalog();
  const byPath = new Map();
  for (const resource of catalog.resources) {
    if (resource.lifecycle !== "ACTIVE") continue;
    if (resource.locator !== undefined) continue;

    const previous = byPath.get(resource.path);
    if (
      previous !== undefined &&
      previous.id !== resource.id
    ) {
      throw new Error(
        "Multiple physical Catalog resources share one path: " +
          resource.path,
      );
    }

    byPath.set(resource.path, resource);
  }
  const edges = [];
  const seen = new Set();

  for (const resource of catalog.resources) {
    if (resource.lifecycle !== "ACTIVE") continue;
    if (resource.class !== "DOCUMENT") continue;
    if (resource.locator !== undefined) continue;
    if (!existsSync(resource.path)) continue;

    const text = readFileSync(resource.path, "utf8");
    for (const match of text.matchAll(MARKDOWN_LINK)) {
      const targetPath = resolveResourceLink(resource.path, match[1]);
      if (!targetPath) continue;

      const target = byPath.get(targetPath);
      if (!target) continue;

      addEdge(edges, seen, {
        from: resource.id,
        type:
          resource.role === "ROUTER"
            ? "ROUTES_TO"
            : target.class === "KNOWLEDGE"
              ? "USES"
              : "RELATES_TO",
        to: target.id,
      });
    }
  }

  // Do not materialize declaration-only analyzer/proof bindings as USES or
  // VALIDATES graph edges. Module-level owner collapse made unrelated facts
  // appear connected during Context Retrieval. Exact binding references
  // remain available through the registry, outside the ranking graph.

  edges.sort((a, b) => {
    const left = a.from + "|" + a.type + "|" + a.to;
    const right = b.from + "|" + b.type + "|" + b.to;
    return left.localeCompare(right);
  });

  return { schemaVersion: 1, edges };
}

export function documentGraphRootId() {
  return resourceIdForDocumentPath("docs/README.md");
}