import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, normalize, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "engine/packages", "engine/analyzers", "engine/adapters"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", "test", "tests", "fixtures", "__tests__"]);
const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir, skipTests = true) {
  const output = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipTests && SKIP_DIRS.has(entry.name)) continue;
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") continue;
      output.push(...walk(full, skipTests));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.includes(extname(entry.name))) {
      output.push(full);
    }
  }
  return output;
}

function candidateTargets(base) {
  const ext = extname(base);
  if (SOURCE_EXTENSIONS.includes(ext)) return [base];

  const values = [base];
  for (const candidateExt of SOURCE_EXTENSIONS) values.push(base + candidateExt);
  for (const candidateExt of SOURCE_EXTENSIONS) values.push(resolve(base, "index" + candidateExt));
  return values;
}

function resolveRelativeImport(fromFile, specifier) {
  const raw = normalize(resolve(dirname(fromFile), specifier));
  for (const candidate of candidateTargets(raw)) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }

  if (/\.js$/.test(raw)) {
    const withoutJs = raw.slice(0, -3);
    for (const candidateExt of [".ts", ".tsx", ".mts", ".cts"]) {
      const candidate = withoutJs + candidateExt;
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
  }
  return undefined;
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

const aliasesJsonOnly = process.argv.includes("--aliases-json");
const productionFiles = aliasesJsonOnly ? [] : SOURCE_ROOTS.flatMap((rootName) => {
  const root = resolve(ROOT, rootName);
  return existsSync(root) ? walk(root, true) : [];
});

const inbound = new Map(productionFiles.map((file) => [file, 0]));
const externalUsage = new Map();
const externalUsageFiles = new Map();

for (const file of productionFiles) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;

    if (specifier.startsWith(".")) {
      const target = resolveRelativeImport(file, specifier);
      if (target && inbound.has(target)) inbound.set(target, (inbound.get(target) ?? 0) + 1);
      continue;
    }

    if (specifier.startsWith("node:")) continue;
    const pkg = packageName(specifier);
    externalUsage.set(pkg, (externalUsage.get(pkg) ?? 0) + 1);
    if (!externalUsageFiles.has(pkg)) externalUsageFiles.set(pkg, new Set());
    externalUsageFiles.get(pkg).add(relative(ROOT, file).replaceAll("\\", "/"));
  }
}

function isEntrypoint(file) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  return /\/src\/index\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(rel) ||
    /^apps\/[^/]+\/src\/main\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(rel);
}

const orphanCandidates = [...inbound.entries()]
  .filter(([file, count]) => count === 0 && !isEntrypoint(file))
  .map(([file]) => relative(ROOT, file).replaceAll("\\", "/"))
  .sort();

// Legacy Orchestrator export aliases are not independent implementations.
// Include in-repository tests when identifying direct consumers; this remains
// informational because third-party deep imports cannot be enumerated here.
const orchestratorSource = resolve(ROOT, "engine/packages/orchestrator/src");
const PURE_ALIAS_RE = /^\s*(?:\/\*[\s\S]*?\*\/\s*)?export \* from ["']\.\/(arena|core|inspection|diagnosis|repair|reliability|reporting|workflow|release)\/[^"']+["'];?\s*$/;
const flatAliasFiles = existsSync(orchestratorSource)
  ? readdirSync(orchestratorSource, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => resolve(orchestratorSource, entry.name))
    .filter((file) => PURE_ALIAS_RE.test(readFileSync(file, "utf8")))
  : [];
const aliasSet = new Set(flatAliasFiles);
const aliasConsumers = new Map(flatAliasFiles.map((file) => [file, new Set()]));
const inspectRoots = ["apps", "engine", "tooling", ".agents", "experiments"];
let scannedConsumerSourceFiles = 0;
for (const root of inspectRoots) {
  const full = resolve(ROOT, root);
  if (!existsSync(full)) continue;
  for (const file of walk(full, false)) {
    if (aliasSet.has(file)) continue;
    scannedConsumerSourceFiles += 1;
    const sourceText = readFileSync(file, "utf8");
    for (const match of sourceText.matchAll(IMPORT_RE)) {
      const specifier = match[1] ?? match[2];
      if (!specifier?.startsWith(".")) continue;
      const target = resolveRelativeImport(file, specifier);
      if (target && aliasSet.has(target)) {
        aliasConsumers.get(target).add(relative(ROOT, file).replaceAll("\\", "/"));
      }
    }
    // Include literal CommonJS requires in consumer analysis.
    for (const match of sourceText.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      if (!match[1].startsWith(".")) continue;
      const target = resolveRelativeImport(file, match[1]);
      if (target && aliasSet.has(target)) {
        aliasConsumers.get(target).add(relative(ROOT, file).replaceAll("\\", "/"));
      }
    }
  }
}
const noInRepoConsumer = flatAliasFiles.filter(
  (file) => aliasConsumers.get(file).size === 0,
);

// Machine-readable projection of the same alias/consumer evidence; no second registry.
if (aliasesJsonOnly) {
  const aliases = flatAliasFiles.map((file) => {
    const source = readFileSync(file, "utf8");
    const target = source.match(/export \* from ["'](\.\/[^"']+)["']/)?.[1];
    const resolvedTarget = target ? resolveRelativeImport(file, target) : undefined;
    return {
      alias: relative(ROOT, file).replaceAll("\\", "/"),
      canonicalTarget: resolvedTarget
        ? relative(ROOT, resolvedTarget).replaceAll("\\", "/")
        : null,
      canonicalTargetResolved: Boolean(resolvedTarget),
      family: source.match(PURE_ALIAS_RE)?.[1] ?? null,
      internalConsumers: [...aliasConsumers.get(file)].sort(),
      externalConsumersVerified: false,
    };
  }).sort((a, b) => a.alias.localeCompare(b.alias));
  console.log(JSON.stringify({
    scope: "static-in-repository-source-and-test-imports",
    scannedConsumerSourceFiles,
    scannedConsumerRoots: inspectRoots,
    completeExternalCompatibilityProof: false,
    totalAliases: aliases.length,
    aliasesWithInternalConsumers: aliases.filter((item) => item.internalConsumers.length > 0).length,
    aliasesWithoutResolvedInternalConsumers: aliases.filter((item) => item.internalConsumers.length === 0).length,
    aliasesWithMissingCanonicalTargets: aliases.filter((item) => !item.canonicalTargetResolved).length,
    aliases,
  }, null, 2));
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const declaredRuntime = Object.keys({
  ...(pkg.dependencies ?? {}),
  ...(pkg.optionalDependencies ?? {}),
}).sort();
const declaredOptional = Object.keys(pkg.optionalDependencies ?? {}).sort();
const declaredDev = Object.keys(pkg.devDependencies ?? {}).sort();

console.log("Source hygiene audit (report-only)");
console.log("  production source files:", productionFiles.length);
console.log("  orphan candidates:", orphanCandidates.length);
console.log("");
console.log("Orphan production-file candidates:");
if (orphanCandidates.length === 0) {
  console.log("  none");
} else {
  for (const file of orphanCandidates.slice(0, 40)) console.log("  " + file);
  if (orphanCandidates.length > 40) console.log(`  ... and ${orphanCandidates.length - 40} more`);
}

console.log("");
console.log("Legacy Orchestrator alias consumers (source and tests; report-only):");
console.log("  flat re-export aliases:", flatAliasFiles.length);
console.log("  aliases with in-repository consumers:", flatAliasFiles.length - noInRepoConsumer.length);
console.log("  aliases without resolved in-repository consumers:", noInRepoConsumer.length);
console.log("  zero-consumer candidates are NOT safe-delete proof: external deep imports may exist.");
const aliasFamilies = new Map();
for (const alias of flatAliasFiles) {
  const content = readFileSync(alias, "utf8");
  const family = content.match(PURE_ALIAS_RE)?.[1];
  if (!family) continue;
  const current = aliasFamilies.get(family) ?? { aliases: 0, referenced: 0, unreferenced: [] };
  current.aliases += 1;
  if ((aliasConsumers.get(alias)?.size ?? 0) > 0) current.referenced += 1;
  else current.unreferenced.push(relative(ROOT, alias).replaceAll("\\", "/"));
  aliasFamilies.set(family, current);
}
console.log("  Breakdown by canonical family (report-only):");
for (const [family, entry] of [...aliasFamilies].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`    ${family}: ${entry.aliases} aliases, ${entry.referenced} referenced, ${entry.unreferenced.length} with no resolved in-repository consumer`);
}
console.log("  Alias candidates without resolved in-repository consumers (not deletion authorization):");
for (const alias of noInRepoConsumer.sort()) {
  console.log("    " + relative(ROOT, alias).replaceAll("\\", "/"));
}
for (const alias of flatAliasFiles.sort()) {
  const consumers = [...aliasConsumers.get(alias)].sort();
  if (consumers.length === 0) continue;
  console.log("  " + relative(ROOT, alias).replaceAll("\\", "/") + " <- " + consumers.join(", "));
}
console.log("");
console.log("External package imports from production source:");
if (externalUsage.size === 0) {
  console.log("  none");
} else {
  for (const [name, count] of [...externalUsage.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const files = [...(externalUsageFiles.get(name) ?? [])].sort();
    console.log(`  ${name}: ${count}`);
    for (const file of files) console.log(`    - ${file}`);
  }
}

console.log("");
console.log("Declared runtime dependencies with no production import:");
for (const name of declaredRuntime.filter((name) => !externalUsage.has(name))) {
  console.log("  " + name);
}

console.log("");
console.log("Declared optional runtime dependencies:");
for (const name of declaredOptional) console.log("  " + name);

console.log("");
console.log("Declared dev dependencies:");
for (const name of declaredDev) console.log("  " + name);

console.log("");
console.log("This audit is informational. Review candidates before deleting code or dependencies.");
