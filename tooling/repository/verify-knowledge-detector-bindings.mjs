import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const registryPath =
  "engine/reliability/catalogs/knowledge-detector-bindings.json";

function filesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name).replaceAll("\\", "/");
    return entry.isDirectory()
      ? filesUnder(path)
      : [path];
  });
}

function catalogIds(root) {
  const ids = new Set();
  for (const path of filesUnder(root).filter((item) => item.endsWith(".json"))) {
    let data;
    try {
      data = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      continue;
    }
    for (const item of data.facts ?? []) {
      if (typeof item.id === "string") ids.add(item.id);
    }
    for (const item of data.relations ?? []) {
      if (typeof item.id === "string") ids.add(item.id);
    }
  }
  return ids;
}

const failures = [];
let knowledgeCoverage = {
  known: 0,
  bound: 0,
  unbound: 0,
};
if (!existsSync(registryPath)) {
  failures.push("Missing knowledge-detector binding registry.");
} else {
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.bindings)) {
    failures.push("Invalid knowledge-detector binding registry.");
  } else {
    const knownIds = new Set([
      ...catalogIds("engine/knowledge"),
      ...catalogIds("engine/contracts/engineering/catalogs"),
    ]);
    const boundIds = new Set();

    for (const binding of registry.bindings) {
      if (
        typeof binding.knowledgeId !== "string" ||
        !binding.knowledgeId.trim()
      ) {
        failures.push("Binding requires knowledgeId.");
        continue;
      }
      if (boundIds.has(binding.knowledgeId)) {
        failures.push(
          "Duplicate knowledge-detector binding: " +
            binding.knowledgeId,
        );
      }
      boundIds.add(binding.knowledgeId);

      if (!knownIds.has(binding.knowledgeId)) {
        failures.push(
          "Knowledge-detector binding references unknown knowledge id: " +
            binding.knowledgeId,
        );
      }
      if (
        typeof binding.consumer !== "string" ||
        !binding.consumer.trim()
      ) {
        failures.push(
          binding.knowledgeId + ": consumer is required.",
        );
      }

      for (const [field, minimum] of [
        ["analyzerPaths", 1],
        ["proofPaths", 1],
      ]) {
        const paths = binding[field];
        if (!Array.isArray(paths) || paths.length < minimum) {
          failures.push(
            binding.knowledgeId +
              ": " +
              field +
              " requires at least one path.",
          );
          continue;
        }
        for (const path of paths) {
          if (typeof path !== "string" || !path.trim()) {
            failures.push(
              binding.knowledgeId +
                ": invalid " +
                field +
                " entry.",
            );
          } else if (!existsSync(path)) {
            failures.push(
              binding.knowledgeId +
                ": missing " +
                field +
                " path: " +
                path,
            );
          }
        }
      }
    }

    const unboundIds = [...knownIds]
      .filter((id) => !boundIds.has(id))
      .sort();
    knowledgeCoverage = {
      known: knownIds.size,
      bound: [...knownIds]
        .filter((id) => boundIds.has(id))
        .length,
      unbound: unboundIds.length,
    };
  }
}

if (failures.length > 0) {
  console.error("Knowledge-detector binding violations:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log(
  "Knowledge-detector binding declaration integrity passed (IDs and referenced paths only; analyzer consumption NOT VERIFIED). " +
    "Declarations: " +
    knowledgeCoverage.bound +
    "/" +
    knowledgeCoverage.known +
    " bound; " +
    knowledgeCoverage.unbound +
    " unbound knowledge id(s) remain for consumption review.",
);
