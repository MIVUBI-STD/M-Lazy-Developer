import type {
  ArenaGlobalStateAnalysis,
} from "./arena-global-state-analysis.js";
import {
  createGlobalStateLeaseRaceExperiment,
  type RuntimeExperimentDefinition,
} from "../../../runtime-lab/src/index.js";

export interface ArenaGlobalStateRuntimeCompilerInput {
  analysis: ArenaGlobalStateAnalysis;
  arenaIds: readonly string[];
  arenaGenerations:
    Readonly<Record<string, number>>;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  baselineValues?:
    Readonly<Record<string, string>>;
  firstValues?:
    Readonly<Record<string, string>>;
  secondValues?:
    Readonly<Record<string, string>>;
  minimumRunsPerArm?: number;
}

export interface ArenaGlobalStateRuntimeItem {
  resource: string;
  disposition:
    | "runtime-ready"
    | "manual-required"
    | "static-defect";
  experiment?:
    RuntimeExperimentDefinition;
  reasons: readonly string[];
}

export interface ArenaGlobalStateRuntimeCompilation {
  schemaVersion: 1;
  runtimeReady:
    readonly ArenaGlobalStateRuntimeItem[];
  manualRequired:
    readonly ArenaGlobalStateRuntimeItem[];
  staticDefects:
    readonly ArenaGlobalStateRuntimeItem[];
  experiments:
    readonly RuntimeExperimentDefinition[];
}

function generation(
  input:
    ArenaGlobalStateRuntimeCompilerInput,
  arenaId: string,
): number | undefined {
  const value =
    input.arenaGenerations[arenaId];
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  )
    ? value
    : undefined;
}

export function compileArenaGlobalStateRuntime(
  input:
    ArenaGlobalStateRuntimeCompilerInput,
): ArenaGlobalStateRuntimeCompilation {
  const resources = [
    ...new Set(
      input.analysis.assessments.map(
        (item) => item.resource,
      ),
    ),
  ].sort();

  const firstArena =
    input.arenaIds[0];
  const secondArena =
    input.arenaIds[1];

  const items =
    resources.map(
      (resource):
        ArenaGlobalStateRuntimeItem => {
        const assessments =
          input.analysis.assessments.filter(
            (item) =>
              item.resource === resource,
          );
        const paired =
          assessments.some(
            (item) =>
              item.status ===
              "paired-lease-evidence",
          );
        const unleased =
          assessments.some(
            (item) =>
              item.status === "unleased",
          );

        if (unleased) {
          return {
            resource,
            disposition: "static-defect",
            reasons: [
              "Arena-scoped mutation is already missing paired static lease evidence; runtime lease race is not used to excuse the static ownership defect.",
            ],
          };
        }

        if (!paired) {
          return {
            resource,
            disposition: "manual-required",
            reasons: [
              "No complete static acquire plus release/restore lease pair is available for this resource.",
            ],
          };
        }

        if (
          !firstArena ||
          !secondArena ||
          firstArena === secondArena
        ) {
          return {
            resource,
            disposition: "manual-required",
            reasons: [
              "Lease race execution requires two distinct arena identities.",
            ],
          };
        }

        const firstGeneration =
          generation(input, firstArena);
        const secondGeneration =
          generation(input, secondArena);
        if (
          firstGeneration === undefined ||
          secondGeneration === undefined
        ) {
          return {
            resource,
            disposition: "manual-required",
            reasons: [
              "Lease race execution requires explicit generation identity for both arenas.",
            ],
          };
        }

        const baseline =
          input.baselineValues?.[resource];
        const firstValue =
          input.firstValues?.[resource];
        const secondValue =
          input.secondValues?.[resource];

        if (
          baseline === undefined ||
          firstValue === undefined ||
          secondValue === undefined
        ) {
          return {
            resource,
            disposition: "manual-required",
            reasons: [
              "Lease race execution requires explicit baseline, first-owner, and second-owner values for the global resource.",
            ],
          };
        }

        return {
          resource,
          disposition: "runtime-ready",
          experiment:
            createGlobalStateLeaseRaceExperiment({
              id:
                "worldstate-lease-race:" +
                resource,
              title:
                "World-state lease race: " +
                resource,
              targetProfileFingerprint:
                input.targetProfileFingerprint,
              fixtureFingerprint:
                input.fixtureFingerprint,
              objectiveId:
                input.objectiveId,
              participant:
                input.participant,
              resource,
              firstOwner: {
                arenaId: firstArena,
                arenaGeneration:
                  firstGeneration,
              },
              secondOwner: {
                arenaId: secondArena,
                arenaGeneration:
                  secondGeneration,
              },
              firstValue,
              secondValue,
              baselineValue: baseline,
              ...(input.minimumRunsPerArm === undefined
                ? {}
                : { minimumRunsPerArm: input.minimumRunsPerArm }),
            }),
          reasons: [
            "Paired static lease evidence exists and both owner generations plus concrete resource values are explicit.",
          ],
        };
      },
    );

  const runtimeReady =
    items.filter(
      (item) =>
        item.disposition ===
        "runtime-ready",
    );
  const manualRequired =
    items.filter(
      (item) =>
        item.disposition ===
        "manual-required",
    );
  const staticDefects =
    items.filter(
      (item) =>
        item.disposition ===
        "static-defect",
    );

  return {
    schemaVersion: 1,
    runtimeReady,
    manualRequired,
    staticDefects,
    experiments:
      runtimeReady.flatMap(
        (item) =>
          item.experiment
            ? [item.experiment]
            : [],
      ),
  };
}
