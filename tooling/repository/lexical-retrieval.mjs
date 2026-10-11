import { scoreTextDocuments } from "../../engine/packages/analysis-planner/src/retrieval.ts";
import { existsSync, readFileSync, statSync } from "node:fs";

const TEXT_CLASSES = new Set([
  "DOCUMENT",
  "KNOWLEDGE",
  "RELIABILITY",
  "SCHEMA",
  "EXAMPLE",
]);

function readableFile(path) {
  if (!existsSync(path)) return false;
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function catalogForResource(resource, jsonCache) {
  let data = jsonCache.get(resource.path);
  if (data === undefined) {
    data = JSON.parse(readFileSync(resource.path, "utf8"));
    jsonCache.set(resource.path, data);
  }
  return data;
}

function knowledgeRecord(resource, jsonCache) {
  const data = catalogForResource(resource, jsonCache);
  const fact = (data.facts ?? []).find(
    (item) => item?.id === resource.locator,
  );
  const relation = (data.relations ?? []).find(
    (item) => item?.id === resource.locator,
  );
  if (fact !== undefined && relation !== undefined) {
    throw new Error("Ambiguous Knowledge locator: " + resource.locator);
  }
  return {
    data,
    entry: fact ?? relation,
    kind: fact !== undefined ? "fact" : "relation",
  };
}

function resourceText(resource, jsonCache) {
  if (!readableFile(resource.path)) return undefined;

  if (
    resource.class === "KNOWLEDGE" &&
    resource.locator !== undefined &&
    resource.path.endsWith(".json")
  ) {
    const { entry } = knowledgeRecord(resource, jsonCache);
    if (entry === undefined) return undefined;

    return [
      entry.id,
      entry.domain,
      entry.subject,
      ...(typeof entry.statement === "string"
        ? [entry.statement]
        : [entry.kind, entry.object, entry.diagnosticHint]),
      ...(entry.capabilityTags ?? []),
      ...(entry.riskSurfaces ?? []),
      ...(entry.diagnosticHints ?? []),
      ...(entry.causalConsequences ?? []),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return readFileSync(resource.path, "utf8");
}

// Read a selected Knowledge record only after retrieval has ranked resource IDs.
// The original catalog remains authoritative; no second knowledge store is made.
export function readKnowledgeResourceContext(resource, jsonCache = new Map()) {
  if (
    resource.class !== "KNOWLEDGE" ||
    typeof resource.locator !== "string" ||
    !resource.path.endsWith(".json")
  ) return undefined;
  if (!readableFile(resource.path)) {
    throw new Error("Selected Knowledge catalog is unavailable: " + resource.path);
  }

  const { data, entry, kind } = knowledgeRecord(resource, jsonCache);
  if (entry === undefined) {
    throw new Error("Selected Knowledge locator is missing: " + resource.id);
  }
  if (!Array.isArray(entry.sourceIds) || entry.sourceIds.length === 0) {
    throw new Error("Selected Knowledge has no provenance: " + resource.id);
  }
  const sourcesById = new Map(
    (data.sources ?? []).map((source) => [source.id, source]),
  );
  const sources = entry.sourceIds.map((id) => {
    const source = sourcesById.get(id);
    if (source === undefined) {
      throw new Error("Knowledge provenance is unresolved: " + resource.id + " -> " + id);
    }
    return { ...source };
  });

  return {
    kind,
    subject: entry.subject,
    summary: kind === "fact"
      ? entry.statement
      : entry.subject + " " + entry.kind + " " + entry.object,
    classification: entry.classification ?? "unspecified",
    applicability: entry.applicability,
    // Only the current map/profile may decide whether a fact applies.
    applicabilityStatus: "NOT_EVALUATED",
    sourceIds: [...entry.sourceIds],
    sources,
    ...(kind === "fact"
      ? {
          capabilityTags: [...(entry.capabilityTags ?? [])],
          riskSurfaces: [...(entry.riskSurfaces ?? [])],
          diagnosticHints: [...(entry.diagnosticHints ?? [])],
        }
      : {
          relation: {
            kind: entry.kind,
            object: entry.object,
            ...(entry.diagnosticHint === undefined
              ? {}
              : { diagnosticHint: entry.diagnosticHint }),
            ...(entry.causalConsequences === undefined
              ? {}
              : { causalConsequences: [...entry.causalConsequences] }),
          },
        }),
  };
}

export function scoreResourcesLexically(resources, query) {
  const jsonCache = new Map();
  const documents = resources
    .filter((resource) => TEXT_CLASSES.has(resource.class))
    .filter((resource) => resource.lifecycle === "ACTIVE")
    .flatMap((resource) => {
      const text = resourceText(resource, jsonCache);
      return text === undefined
        ? []
        : [{ id: resource.id, text }];
    });

  return scoreTextDocuments(documents, query);
}

export function scoreSectionsLexically(sections, query) {
  const byPath = new Map();

  for (const section of sections) {
    if (!readableFile(section.path)) continue;

    let lines = byPath.get(section.path);
    if (lines === undefined) {
      lines = readFileSync(section.path, "utf8")
        .replaceAll("\r\n", "\n")
        .split("\n");
      byPath.set(section.path, lines);
    }
  }

  const documents = sections.flatMap((section) => {
    const lines = byPath.get(section.path);
    if (lines === undefined) return [];

    const start = Math.max(0, section.startLine - 1);
    const end = Math.min(lines.length, section.endLine);
    return [{
      id: section.id,
      text: [
        section.heading,
        ...lines.slice(start, end),
      ].join("\n"),
    }];
  });

  return scoreTextDocuments(documents, query);
}