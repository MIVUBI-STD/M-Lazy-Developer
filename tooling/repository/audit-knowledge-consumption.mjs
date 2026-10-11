import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildResourceCatalog } from "./resource-catalog.mjs";

const roots = [
  "engine/knowledge",
  "engine/contracts/engineering/catalogs",
];
const bindingPath = "engine/reliability/catalogs/knowledge-detector-bindings.json";
const debtPath = "engine/reliability/catalogs/knowledge-consumption-debt.json";

function filesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name).replaceAll("\\", "/");
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function isActionable(item) {
  return (
    item.classification === "engineering-contract" ||
    item.classification === "derived-rule" ||
    (Array.isArray(item.riskSurfaces) && item.riskSurfaces.length > 0) ||
    (Array.isArray(item.diagnosticHints) && item.diagnosticHints.length > 0) ||
    typeof item.diagnosticSeverity === "string" ||
    (Array.isArray(item.causalConsequences) && item.causalConsequences.length > 0) ||
    (item.causalCorroborators && Object.keys(item.causalCorroborators).length > 0) ||
    (item.causalOutcomePredicates && Object.keys(item.causalOutcomePredicates).length > 0)
  );
}

const bindings = existsSync(bindingPath)
  ? JSON.parse(readFileSync(bindingPath, "utf8")).bindings ?? []
  : [];
const bound = new Set(bindings.map((item) => item.knowledgeId));

// Static binding inspection describes declared references, not runtime use.
// Literal ID mentions can corroborate traceability; their absence never proves
// that a generic evaluator does not consume the record.
const sourceTextCache = new Map();
function sourceText(path) {
  if (!sourceTextCache.has(path)) {
    sourceTextCache.set(
      path,
      existsSync(path) ? readFileSync(path, "utf8") : null,
    );
  }
  return sourceTextCache.get(path);
}
function moduleSourceOwner(path) {
  const match = path.match(/^engine\/(packages|analyzers|adapters)\/([^/]+)\//);
  if (!match) return undefined;
  const kind = match[1] === "packages"
    ? "package"
    : match[1] === "analyzers"
      ? "analyzer"
      : "adapter";
  return "source." + kind + "." + match[2];
}
const literalKnowledgeSignals = bindings.map((binding) => {
  const analyzerPaths = binding.analyzerPaths ?? [];
  const proofPaths = binding.proofPaths ?? [];
  const literalAnalyzerPaths = analyzerPaths.filter((path) =>
    sourceText(path)?.includes(binding.knowledgeId)
  );
  const literalProofPaths = proofPaths.filter((path) =>
    sourceText(path)?.includes(binding.knowledgeId)
  );
  const genericCatalogPathCandidates = analyzerPaths.filter((path) =>
    /\b(?:KnowledgeCatalog|knowledgeCatalog|assessKnowledgeRelations|assessEntityKnowledge|effectiveKnowledge|knowledgeFactApplies)\b/.test(
      sourceText(path) ?? "",
    )
  );
  return {
    id: binding.knowledgeId,
    literalAnalyzerPaths,
    literalProofPaths,
    genericCatalogPathCandidates,
  };
});
const sourceOwnerCounts = new Map();
for (const binding of bindings) {
  const owners = new Set((binding.analyzerPaths ?? [])
    .map(moduleSourceOwner).filter(Boolean));
  for (const owner of owners) {
    sourceOwnerCounts.set(owner, (sourceOwnerCounts.get(owner) ?? 0) + 1);
  }
}
const bindingInspection = {
  declarationOnly: true,
  declarationCount: bindings.length,
  uniqueAnalyzerPaths: new Set(bindings.flatMap((binding) => binding.analyzerPaths ?? [])).size,
  uniqueProofPaths: new Set(bindings.flatMap((binding) => binding.proofPaths ?? [])).size,
  analyzerLiteralKnowledgeIdCount: literalKnowledgeSignals.filter(
    (item) => item.literalAnalyzerPaths.length > 0,
  ).length,
  proofLiteralKnowledgeIdCount: literalKnowledgeSignals.filter(
    (item) => item.literalProofPaths.length > 0,
  ).length,
  genericCatalogPathCandidateCount: literalKnowledgeSignals.filter(
    (item) => item.genericCatalogPathCandidates.length > 0,
  ).length,
  sourceOwnerConcentration: [...sourceOwnerCounts.entries()]
    .map(([owner, bindingCount]) => ({ owner, bindingCount }))
    .sort((a, b) => b.bindingCount - a.bindingCount || a.owner.localeCompare(b.owner)),
  interpretation:
    "Static literal references and catalog API mentions are navigation signals, not proof a specific knowledge ID changed analysis output. Unbound actionable knowledge may remain searchable reference material.",
};
const debt = existsSync(debtPath)
  ? JSON.parse(readFileSync(debtPath, "utf8")).classifications ?? []
  : [];
const classifiedDebt = new Map(debt.map((item) => [item.knowledgeId, item]));
const catalog = buildResourceCatalog();
const resourceByLocation = new Map(
  catalog.resources
    .filter(
      (resource) =>
        typeof resource.locator === "string" &&
        resource.locator.length > 0,
    )
    .map((resource) => [
      resource.path.replaceAll("\\", "/") +
        "#" +
        resource.locator,
      resource,
    ]),
);

const actionable = [];
const passive = [];

for (const root of roots) {
  for (const path of filesUnder(root).filter((item) => item.endsWith(".json"))) {
    if (path.endsWith("/ownership.json")) continue;
    const catalog = JSON.parse(readFileSync(path, "utf8"));
    for (const kind of ["facts", "relations"]) {
      for (const item of catalog[kind] ?? []) {
        if (typeof item.id !== "string" || !item.id.trim()) continue;
        const normalizedPath =
          path.replaceAll("\\", "/");
        const resource =
          kind === "facts"
            ? resourceByLocation.get(
                normalizedPath + "#" + item.id,
              )
            : undefined;
        const record = {
          id: item.id,
          path: normalizedPath,
          ...(resource === undefined
            ? {}
            : { resourceId: resource.id }),
          kind: kind === "facts" ? "fact" : "relation",
          classification: item.classification ?? "unspecified",
        };
        (isActionable(item) ? actionable : passive).push(record);
      }
    }
  }
}

const unbound = actionable.filter((item) => !bound.has(item.id));
const intentionalDebt = unbound.filter((item) => classifiedDebt.has(item.id));
const missing = unbound.filter((item) => !classifiedDebt.has(item.id));
const staleDebt = [...classifiedDebt.keys()].filter(
  (id) => !actionable.some((item) => item.id === id),
);
const stale = [...bound].filter(
  (id) => !actionable.some((item) => item.id === id) && !passive.some((item) => item.id === id),
);

const missingByOwner = Object.values(
  missing.reduce((groups, item) => {
    const current = groups[item.path] ?? {
      path: item.path,
      resourceIds: [],
      knowledgeIds: [],
    };
    if (item.resourceId !== undefined) {
      current.resourceIds.push(item.resourceId);
    }
    current.knowledgeIds.push(item.id);
    groups[item.path] = current;
    return groups;
  }, {}),
)
  .map((item) => ({
    ...item,
    resourceIds: [...new Set(item.resourceIds)].sort(),
    knowledgeIds: [...item.knowledgeIds].sort(),
    count: item.knowledgeIds.length,
  }))
  .sort((left, right) =>
    right.count - left.count ||
    left.path.localeCompare(right.path)
  );

const boundActionableKnowledge =
  actionable.length - missing.length;
const dedicatedBindingCoverage =
  actionable.length === 0
    ? 1
    : boundActionableKnowledge / actionable.length;

const result = {
  schemaVersion: 1,
  actionableKnowledge: actionable.length,
  passiveKnowledge: passive.length,
  dedicatedBindings: bound.size,
  boundActionableKnowledge,
  actionableWithoutDedicatedBinding: unbound.length,
  intentionalClassifiedDebt: intentionalDebt.length,
  unclassifiedActionableDebt: missing.length,
  dedicatedBindingCoverage,
  bindingCoverageMeaning: "Declared binding/debt accounting only; NOT actual knowledge consumption or detector recall.",
  bindingInspection,
  ...(process.argv.includes("--binding-details") ? {
    bindingInspectionDetails: literalKnowledgeSignals,
  } : {}),
  staleBindings: stale.length,
  staleDebtClassifications: staleDebt.length,
  debtByStatus: Object.fromEntries(
    [...new Set(intentionalDebt.map((item) => classifiedDebt.get(item.id)?.status).filter(Boolean))]
      .sort()
      .map((status) => [status, intentionalDebt.filter((item) => classifiedDebt.get(item.id)?.status === status).length]),
  ),
  missingByOwner,
  missing,
  stale,
};

console.log(JSON.stringify(result, null, 2));

// An actionable Knowledge record is allowed to be a searchable reference
// without a permanent detector binding or a fabricated runtime-debt entry.
// Strict mode protects genuine dangling IDs and stale debt, not 100% linkage.
if (process.argv.includes("--strict") && (stale.length > 0 || staleDebt.length > 0)) {
  process.exit(1);
}