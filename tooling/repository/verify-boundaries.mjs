import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, normalize, relative, resolve, sep } from "node:path";
import { importSpecifiers } from "./source-import-specifiers.mjs";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "engine/packages", "engine/analyzers", "engine/adapters"];
const EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);

function walk(dir) {
  const output = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
      output.push(...walk(full));
    } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
      output.push(full);
    }
  }
  return output;
}

function logicalParts(path) {
  const rel = relative(ROOT, path).split(sep);
  return rel[0] === "engine" ? rel.slice(1) : rel;
}

function topArea(path) {
  return logicalParts(path)[0] ?? "";
}

function packageName(path) {
  const rel = relative(resolve(ROOT, "engine/packages"), path).split(sep);
  return rel[0] ?? "";
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  return normalize(resolve(dirname(fromFile), specifier));
}

function externalSpecifierViolation(fromFile, specifier) {
  const fromArea = topArea(fromFile);
  if (fromArea !== "packages") return undefined;

  const fromPackage = packageName(fromFile);
  if (
    fromPackage === "telemetry" &&
    (
      specifier === "@minecraft/server" ||
      specifier.startsWith("@minecraft/server/")
    )
  ) {
    return "packages/telemetry must remain runtime-independent and must not import @minecraft/server";
  }

  if (
    fromPackage === "telemetry" &&
    specifier.startsWith("node:")
  ) {
    return "packages/telemetry must remain Bedrock-runtime portable and must not import Node.js built-ins";
  }

  return undefined;
}

function violation(fromFile, targetPath) {
  const fromArea = topArea(fromFile);
  const targetArea = topArea(targetPath);

  if (fromArea === "apps" && targetArea === "analyzers") {
    return "apps must consume analyzers through orchestrator/core APIs, not direct analyzer imports";
  }

  if (fromArea === "packages") {
    const fromPackage = packageName(fromFile);
    if (
      fromPackage === "telemetry" &&
      targetArea === "packages" &&
      !["telemetry", "project-model"].includes(packageName(targetPath))
    ) {
      return "packages/telemetry may depend only on project-model and itself";
    }
    if (
      fromPackage === "telemetry" &&
      (targetArea === "analyzers" || targetArea === "adapters")
    ) {
      return "packages/telemetry must not depend on analyzers or adapters";
    }
    if (targetArea === "apps") {
      return "packages must never import presentation apps";
    }
    if (targetArea === "analyzers" && fromPackage !== "orchestrator") {
      return "only packages/orchestrator may compose analyzers; reusable packages must remain analyzer-independent";
    }
  }

  if (fromArea === "analyzers") {
    if (targetArea === "apps") return "analyzers must never import presentation apps";
    if (targetArea === "packages") {
      const targetPackage = packageName(targetPath);
      if (targetPackage === "orchestrator" || targetPackage === "repair") {
        return "analyzers must not depend on orchestration or mutation packages";
      }
    }
  }

  if (fromArea === "adapters") {
    if (targetArea === "apps") return "adapters must never import presentation apps";
    if (targetArea === "packages") {
      const targetPackage = packageName(targetPath);
      if (targetPackage === "orchestrator" || targetPackage === "repair") {
        return "format adapters must not depend on orchestration or repair policy";
      }
    }
  }

  return undefined;
}

const failures = [];

for (const rootName of SOURCE_ROOTS) {
  const root = resolve(ROOT, rootName);
  if (!statSync(root).isDirectory()) continue;

  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    // Use the same real import/export/dynamic-import AST evidence as the
    // dependency graph. Strings and comments are never module edges.
    for (const { specifier } of importSpecifiers(file, text)) {
      const externalReason = externalSpecifierViolation(file, specifier);
      if (externalReason) {
        failures.push({
          file: relative(ROOT, file).replaceAll("\\", "/"),
          import: specifier,
          reason: externalReason,
        });
        continue;
      }

      const target = resolveImport(file, specifier);
      if (!target) continue;
      const reason = violation(file, target);
      if (reason) {
        failures.push({
          file: relative(ROOT, file).replaceAll("\\", "/"),
          import: specifier,
          reason,
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Source boundary violations:");
  for (const failure of failures) {
    console.error(`- ${failure.file} -> ${failure.import}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log("Source boundary verification passed.");
