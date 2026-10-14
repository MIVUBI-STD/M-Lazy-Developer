import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    return "{" +
      Object.keys(value)
        .sort()
        .map((key) =>
          JSON.stringify(key) + ":" + canonicalJson(value[key])
        )
        .join(",") +
      "}";
  }
  return JSON.stringify(value);
}

const path = "engine/contracts/contract-registry.json";
if (!existsSync(path)) {
  console.error("Missing canonical contract registry: " + path);
  process.exit(1);
}

const registry = JSON.parse(readFileSync(path, "utf8"));
const canonicalRevision = createHash("sha256")
  .update(canonicalJson({
    schemaVersion: registry.schemaVersion,
    contracts: registry.contracts,
  }))
  .digest("hex");

const revisionOwner =
  "engine/packages/project-model/src/contracts/contract-registry-revision.ts";
if (!existsSync(revisionOwner)) {
  console.error(
    "Missing generated contract registry revision owner: " +
      revisionOwner,
  );
  process.exit(1);
}
const revisionText = readFileSync(revisionOwner, "utf8");
const revisionMatch = revisionText.match(
  /CONTRACT_REGISTRY_REVISION\s*=\s*["']([a-f0-9]{64})["']/,
);
if (!revisionMatch) {
  console.error(
    "Generated contract registry revision constant is missing or invalid.",
  );
  process.exit(1);
}
if (revisionMatch[1] !== canonicalRevision) {
  console.error(
    "Contract registry revision is stale. Expected " +
      canonicalRevision +
      " but found " +
      revisionMatch[1] +
      ".",
  );
  process.exit(1);
}
if (registry.schemaVersion !== 1 || !Array.isArray(registry.contracts)) {
  console.error("Invalid contract registry root.");
  process.exit(1);
}

// Registry stores logical package paths, while source physically lives under engine/.
// Resolve consistently without rewriting canonical contract identities.
function physicalPath(path) {
  return path.startsWith("packages/") || path.startsWith("analyzers/") ||
    path.startsWith("adapters/") ? "engine/" + path : path;
}

const ids = new Set();
const canonicalSymbols = new Map();
const allowedStatuses = new Set(["canonical", "deprecated"]);
const requiredArrayFields = ["producers", "consumers"];
const EXPORT_FROM_RE =
  /export\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g;

function sourceCandidates(base) {
  if (extname(base)) return [base];
  return [
    base + ".ts",
    base + ".tsx",
    base + ".mts",
    base + ".cts",
    resolve(base, "index.ts"),
  ];
}

function resolveExportTarget(fromFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  let raw = resolve(dirname(fromFile), specifier);
  if (/\.js$/.test(raw)) raw = raw.slice(0, -3);
  for (const candidate of sourceCandidates(raw)) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function publicEntrypointForOwner(ownerPath) {
  const marker = "/src/";
  const normalized = ownerPath.replaceAll("\\", "/");
  const index = normalized.indexOf(marker);
  if (index < 0) return undefined;
  return normalized.slice(0, index + marker.length) + "index.ts";
}

function isReachableFromEntrypoint(entrypoint, ownerPath, seen = new Set()) {
  const entry = resolve(entrypoint).replaceAll("\\", "/");
  const owner = resolve(ownerPath).replaceAll("\\", "/");
  if (entry === owner) return true;
  if (seen.has(entry) || !existsSync(entry)) return false;
  seen.add(entry);

  const text = readFileSync(entry, "utf8");
  for (const match of text.matchAll(EXPORT_FROM_RE)) {
    const target = resolveExportTarget(entry, match[1]);
    if (!target) continue;
    const normalized = target.replaceAll("\\", "/");
    if (normalized === owner) return true;
    if (isReachableFromEntrypoint(normalized, owner, seen)) return true;
  }
  return false;
}

function duplicateValue(values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

for (const contract of registry.contracts) {
  for (const field of ["id", "symbol", "owner", "verificationLevel", "status"]) {
    if (typeof contract[field] !== "string" || !contract[field].trim()) {
      console.error("Contract registry entry has invalid " + field + ".");
      process.exit(1);
    }
  }

  if (contract.schemaVersion !== 1) {
    console.error("Contract " + contract.id + " has unsupported schemaVersion.");
    process.exit(1);
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(contract[field]) || contract[field].some((value) => typeof value !== "string" || !value.trim())) {
      console.error("Contract " + contract.id + " has invalid " + field + ".");
      process.exit(1);
    }

    const repeated = duplicateValue(contract[field]);
    if (repeated) {
      console.error(
        "Contract " + contract.id + " has duplicate " +
          field + " entry: " + repeated,
      );
      process.exit(1);
    }

    for (const root of contract[field]) {
      if (!existsSync(physicalPath(root))) {
        console.error(
          "Contract " + contract.id + " " + field +
            " root does not exist: " + root,
        );
        process.exit(1);
      }
    }
  }

  if (!allowedStatuses.has(contract.status)) {
    console.error("Contract " + contract.id + " has invalid status " + contract.status + ".");
    process.exit(1);
  }

  if (ids.has(contract.id)) {
    console.error("Duplicate contract registry id: " + contract.id);
    process.exit(1);
  }
  ids.add(contract.id);

  if (!existsSync(physicalPath(contract.owner))) {
    console.error("Contract " + contract.id + " owner file does not exist: " + contract.owner);
    process.exit(1);
  }

  const ownerText = readFileSync(physicalPath(contract.owner), "utf8");
  const escaped = contract.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exportPattern = new RegExp("export\\s+(?:type|interface|class|const|function)\\s+" + escaped + "\\b");
  if (!exportPattern.test(ownerText)) {
    console.error("Contract " + contract.id + " symbol " + contract.symbol + " is not exported by owner " + contract.owner + ".");
    process.exit(1);
  }

  if (contract.status === "canonical") {
    const entrypoint = publicEntrypointForOwner(physicalPath(contract.owner));
    if (!entrypoint || !existsSync(entrypoint)) {
      console.error(
        "Canonical contract " + contract.id +
          " has no canonical package entrypoint for owner " + contract.owner + ".",
      );
      process.exit(1);
    }
    if (!isReachableFromEntrypoint(entrypoint, physicalPath(contract.owner))) {
      console.error(
        "Canonical contract " + contract.id + " owner " + contract.owner +
          " is not reachable from " + entrypoint + ".",
      );
      process.exit(1);
    }

    const current = canonicalSymbols.get(contract.symbol);
    if (current && current !== contract.owner) {
      console.error("Canonical contract symbol has multiple owners: " + contract.symbol + " -> " + current + " and " + contract.owner);
      process.exit(1);
    }
    canonicalSymbols.set(contract.symbol, contract.owner);
  }

  if (contract.status === "deprecated") {
    if (typeof contract.replacedBy !== "string" || !contract.replacedBy.trim()) {
      console.error("Deprecated contract " + contract.id + " must declare replacedBy.");
      process.exit(1);
    }
    if (contract.replacedBy === contract.id) {
      console.error(
        "Deprecated contract " + contract.id + " cannot replace itself.",
      );
      process.exit(1);
    }
  }
}

for (const contract of registry.contracts) {
  if (contract.status === "deprecated" && !ids.has(contract.replacedBy)) {
    console.error("Deprecated contract " + contract.id + " references unknown replacement " + contract.replacedBy);
    process.exit(1);
  }
}

console.log("Contract registry verification passed (" + registry.contracts.length + " contracts).");