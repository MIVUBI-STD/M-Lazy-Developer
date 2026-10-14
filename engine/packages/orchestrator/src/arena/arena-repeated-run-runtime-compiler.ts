import type {
  ArenaRepeatedRunValidationPlan,
  ArenaRepeatedRunValidationStage,
} from "./arena-repeated-run-validation.js";
import {
  createRepeatedArenaCycleExperiment,
  type RuntimeExperimentDefinition,
} from "../../../runtime-lab/src/index.js";

export interface ArenaRepeatedRunRuntimeCompilerInput {
  plan: ArenaRepeatedRunValidationPlan;
  arenaIds: readonly string[];
  arenaGenerations:
    Readonly<Record<string, number>>;
  playersPerArena?: number;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  minimumRunsPerArm?: number;
}

export interface ArenaRepeatedRunRuntimeItem {
  stage: ArenaRepeatedRunValidationStage;
  disposition:
    | "runtime-ready"
    | "manual-required";
  experiment?:
    RuntimeExperimentDefinition;
  reasons: readonly string[];
}

export interface ArenaRepeatedRunRuntimeCompilation {
  schemaVersion: 1;
  runtimeReady:
    readonly ArenaRepeatedRunRuntimeItem[];
  manualRequired:
    readonly ArenaRepeatedRunRuntimeItem[];
  experiments:
    readonly RuntimeExperimentDefinition[];
}

function explicitArenaTargets(
  input:
    ArenaRepeatedRunRuntimeCompilerInput,
) {
  return input.arenaIds.flatMap(
    (arenaId) => {
      const generation =
        input.arenaGenerations[arenaId];
      return (
        typeof generation === "number" &&
        Number.isInteger(generation) &&
        generation >= 0
      )
        ? [{
            arenaId,
            arenaGeneration:
              generation,
          }]
        : [];
    },
  );
}

function compileStage(
  stage: ArenaRepeatedRunValidationStage,
  input:
    ArenaRepeatedRunRuntimeCompilerInput,
): ArenaRepeatedRunRuntimeItem {
  if (
    input.playersPerArena === undefined ||
    !Number.isInteger(
      input.playersPerArena,
    ) ||
    input.playersPerArena < 1
  ) {
    return {
      stage,
      disposition: "manual-required",
      reasons: [
        "Repeated-cycle runtime execution requires explicit per-arena player capacity.",
      ],
    };
  }

  const allTargets =
    explicitArenaTargets(input);
  if (
    allTargets.length !==
    input.arenaIds.length
  ) {
    return {
      stage,
      disposition: "manual-required",
      reasons: [
        "Repeated-cycle runtime execution requires explicit generation identity for every referenced arena.",
      ],
    };
  }

  const targets =
    stage.scope === "single-arena"
      ? allTargets.slice(0, 1)
      : allTargets;

  if (targets.length === 0) {
    return {
      stage,
      disposition: "manual-required",
      reasons: [
        "Repeated-cycle runtime execution resolved no arena targets.",
      ],
    };
  }

  return {
    stage,
    disposition: "runtime-ready",
    experiment:
      createRepeatedArenaCycleExperiment({
        id:
          "arena-repeat:" +
          stage.scope +
          ":" +
          stage.runs,
        title: stage.purpose,
        targetProfileFingerprint:
          input.targetProfileFingerprint,
        fixtureFingerprint:
          input.fixtureFingerprint,
        objectiveId:
          input.objectiveId,
        participant:
          input.participant,
        arenas: targets,
        playersPerArena:
          input.playersPerArena,
        cycles: stage.runs,
        scope: stage.scope,
        compareSurfaces:
          stage.compareSurfaces,
        preservationInvariantIds:
          stage.invariants,
        ...(input.minimumRunsPerArm === undefined
          ? {}
          : { minimumRunsPerArm: input.minimumRunsPerArm }),
      }),
    reasons: [
      "Repeated-cycle stage has explicit arena generations and player capacity.",
    ],
  };
}

export function compileArenaRepeatedRunRuntime(
  input:
    ArenaRepeatedRunRuntimeCompilerInput,
): ArenaRepeatedRunRuntimeCompilation {
  const items =
    input.plan.stages.map(
      (stage) =>
        compileStage(stage, input),
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

  return {
    schemaVersion: 1,
    runtimeReady,
    manualRequired,
    experiments:
      runtimeReady.flatMap(
        (item) =>
          item.experiment
            ? [item.experiment]
            : [],
      ),
  };
}
