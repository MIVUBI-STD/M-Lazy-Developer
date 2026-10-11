import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const [artifactPath, auditOutputPath, frozenOutputPath] = process.argv.slice(2);
if (!artifactPath || !auditOutputPath || !frozenOutputPath) {
  throw new Error(
    "Usage: node freeze-observed-map-audit.mjs <artifact.mcworld> <audit-output.json> <frozen-output.json>",
  );
}

const artifact = resolve(artifactPath);
const auditPath = resolve(auditOutputPath);
const outputPath = resolve(frozenOutputPath);
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
if (
  audit.schemaVersion !== 2 ||
  audit.evidenceScope?.mode !== "selected-map-version-only" ||
  audit.gameplayFlowBasis !== "AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY" ||
  !audit.control ||
  !Array.isArray(audit.bugs) ||
  !Array.isArray(audit.designMismatches)
) {
  throw new Error(
    "Observed output must have canonical MapAuditOutputV2 structure; " +
    "a static oracle, dev inspection or partial projection is not an audit result. " +
    "Matching structure alone does not verify execution provenance.",
  );
}
const sha256 = createHash("sha256")
  .update(readFileSync(artifact))
  .digest("hex");
const gitCommit = execFileSync(
  "git",
  ["rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();

const frozen = {
  schemaVersion: 1,
  kind: "selected-map-audit-observed-output",
  artifact: {
    label: basename(artifact),
    sha256,
  },
  execution: {
    gitCommit,
    frozenAt: new Date().toISOString(),
    command: "npm run audit -- <artifact>",
  },
  observed: audit,
};

writeFileSync(
  outputPath,
  JSON.stringify(frozen, null, 2) + "\n",
  "utf8",
);
process.stdout.write(
  JSON.stringify({
    artifact: frozen.artifact,
    gitCommit,
    outputPath,
  }, null, 2) + "\n",
);
