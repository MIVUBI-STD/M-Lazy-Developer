import { resolve } from "node:path";
import {
  runSelectedMapAudit,
  type SelectedMapAuditRuntimeTarget,
} from "../../../engine/packages/orchestrator/src/map-audit-pipeline.js";
import type {
  InspectTargetProfile,
} from "../../../engine/packages/orchestrator/src/core/types.js";
import { loadKnowledgeDirectory } from "../../../engine/packages/knowledge/src/index.js";
import { formatSelectedMapAuditBrief } from "../../../engine/packages/orchestrator/src/map-audit-output-v2.js";
import { parseCliTargetOptions } from "./target-options.js";

function runtimeTarget(
  target: InspectTargetProfile,
): SelectedMapAuditRuntimeTarget {
  return {
    ...(target.edition === undefined ? {} : { edition: target.edition }),
    ...(target.version === undefined ? {} : { version: target.version }),
    ...(target.educationFeatures === undefined ? {} : { educationFeatures: target.educationFeatures }),
    ...(target.eduLevel === undefined ? {} : { eduLevel: target.eduLevel }),
    ...(target.experiments === undefined ? {} : { experiments: target.experiments }),
    ...(target.arenaProofMode === undefined ? {} : { arenaProofMode: target.arenaProofMode }),
    ...(target.staticExecutionDimension === undefined ? {} : { staticExecutionDimension: target.staticExecutionDimension }),
  };
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const briefCount = rawArgs.filter((arg) => arg === "--brief").length;
  if (briefCount > 1) {
    throw new Error("--brief may only be supplied once");
  }
  const brief = briefCount === 1;
  const args = rawArgs.filter((arg) => arg !== "--brief");
  const fingerprintFlags = args.flatMap((arg, index) =>
    arg === "--expected-sha256" ? [index] : []
  );
  if (fingerprintFlags.length > 1) {
    throw new Error("--expected-sha256 may only be supplied once");
  }
  const flagIndex = fingerprintFlags[0];
  const expectedArtifactFingerprint =
    flagIndex === undefined ? undefined : args[flagIndex + 1];
  if (flagIndex !== undefined &&
      (expectedArtifactFingerprint === undefined ||
       expectedArtifactFingerprint.startsWith("--"))) {
    throw new Error("--expected-sha256 requires a SHA-256 fingerprint");
  }
  const auditArgs = flagIndex === undefined
    ? args
    : args.filter((_, index) =>
        index !== flagIndex && index !== flagIndex + 1
      );
  const { positionals, target, telemetryPath, arenaRegionContractsPath } =
    parseCliTargetOptions(auditArgs);
  const [input] = positionals;
  if (!input) {
    throw new Error("Usage: npm run audit -- <selected.mcworld> [--brief] [target options]");
  }
  if (telemetryPath !== undefined || arenaRegionContractsPath !== undefined) {
    throw new Error(
      "Production audit CLI accepts only the selected artifact and runtime/platform target options.",
    );
  }
  if ((target.contractSourceRoots?.length ?? 0) > 0) {
    throw new Error(
      "Production audit cannot accept external contract source roots.",
    );
  }

  const knowledge = await loadKnowledgeDirectory(resolve("engine/knowledge"));
  const audit = await runSelectedMapAudit({
    artifactPath: resolve(input),
    ...(expectedArtifactFingerprint === undefined
      ? {}
      : { expectedArtifactFingerprint }),
    target: runtimeTarget(target),
    knowledgeCatalog: knowledge,
    telemetry: [],
  });
  process.stdout.write(
    brief
      ? formatSelectedMapAuditBrief({
          report: audit.mapAuditReport,
          intent: audit.inspection.gameplayIntent.model,
          modelTaskPackets: audit.modelTaskPackets,
        })
      : JSON.stringify(audit.mapAuditReport, null, 2) + "\n",
  );
  if (audit.mapAuditReport.control.status === "BLOCKED") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
