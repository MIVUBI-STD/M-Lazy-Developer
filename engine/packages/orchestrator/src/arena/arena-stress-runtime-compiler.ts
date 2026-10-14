import type {
  MultiplayerStressMatrix,
  MultiplayerStressScenario,
} from "../../../reliability/src/index.js";
import {
  createArenaCapacityGuardExperiment,
  createDeathDuringJoinExperiment,
  createFullCapacitySessionExperiment,
  createReconnectGenerationResetExperiment,
  createAllArenaStartStressExperiment,
  createAllArenaFinishStressExperiment,
  createCleanupStartOverlapExperiment,
  createStaggeredFullJoinStressExperiment,
  createDisconnectDuringSetupStressExperiment,
  createDisconnectDuringActiveStressExperiment,
  type RuntimeExperimentDefinition,
} from "../../../runtime-lab/src/index.js";

export interface ArenaStressRuntimeSubject {
  playerKey: string;
  arenaId: string;
  arenaGeneration: number;
  connectionGeneration: number;
  participationGeneration: number;
  lifeGeneration: number;
}

export interface ArenaStressRuntimeCompilerInput {
  matrix: MultiplayerStressMatrix;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  objectiveId: string;
  participant: string;
  arenaGenerations: Readonly<Record<string, number>>;
  subjects?: Readonly<Record<string, ArenaStressRuntimeSubject>>;
  minimumRunsPerArm?: number;
}

export interface ArenaStressRuntimeCompilationItem {
  scenarioId: string;
  kind: MultiplayerStressScenario["kind"];
  disposition: "runtime-ready" | "manual-required";
  experiments: readonly RuntimeExperimentDefinition[];
  reasons: readonly string[];
}

export interface ArenaStressRuntimeCompilation {
  schemaVersion: 1;
  runtimeReady: readonly ArenaStressRuntimeCompilationItem[];
  manualRequired: readonly ArenaStressRuntimeCompilationItem[];
  experiments: readonly RuntimeExperimentDefinition[];
}

function arenaGeneration(
  input: ArenaStressRuntimeCompilerInput,
  arenaId: string,
): number | undefined {
  const value = input.arenaGenerations[arenaId];
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  )
    ? value
    : undefined;
}

function compileScenario(
  scenario: MultiplayerStressScenario,
  input: ArenaStressRuntimeCompilerInput,
): ArenaStressRuntimeCompilationItem {
  const base = {
    scenarioId: scenario.id,
    kind: scenario.kind,
  } as const;
  // Do not pass an explicit undefined when the runtime-lab contract
  // deliberately models omitted repetition limits as optional.
  const optionalRuns = input.minimumRunsPerArm === undefined
    ? {} : { minimumRunsPerArm: input.minimumRunsPerArm };
  const primaryArena = scenario.arenaIds[0];
  const generation =
    primaryArena === undefined
      ? undefined
      : arenaGeneration(input, primaryArena);

  if (
    scenario.kind === "full-capacity-session" &&
    primaryArena !== undefined &&
    generation !== undefined
  ) {
    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        createFullCapacitySessionExperiment({
          id: scenario.id,
          title: scenario.purpose,
          targetProfileFingerprint:
            input.targetProfileFingerprint,
          fixtureFingerprint:
            input.fixtureFingerprint,
          objectiveId: input.objectiveId,
          participant: input.participant,
          arena: {
            arenaId: primaryArena,
            arenaGeneration: generation,
          },
          maxPlayers:
            input.matrix.playersPerArena,
          ...optionalRuns,
        }),
      ],
      reasons: [
        "Existing full-capacity multiplayer runtime capability covers this scenario.",
      ],
    };
  }

  if (
    scenario.kind === "capacity-overflow" &&
    primaryArena !== undefined &&
    generation !== undefined
  ) {
    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        createArenaCapacityGuardExperiment({
          id: scenario.id,
          title: scenario.purpose,
          targetProfileFingerprint:
            input.targetProfileFingerprint,
          fixtureFingerprint:
            input.fixtureFingerprint,
          objectiveId: input.objectiveId,
          participant: input.participant,
          arena: {
            arenaId: primaryArena,
            arenaGeneration: generation,
          },
          maxPlayers:
            input.matrix.playersPerArena,
          ...(scenario.attemptedPlayers === undefined
            ? {} : { attemptedPlayers: scenario.attemptedPlayers }),
          ...optionalRuns,
        }),
      ],
      reasons: [
        "Existing arena capacity runtime capability covers this scenario.",
      ],
    };
  }


  if (
    (
      scenario.kind === "simultaneous-all-arena-start" ||
      scenario.kind === "simultaneous-all-arena-finish"
    ) &&
    scenario.arenaIds.length > 1
  ) {
    const arenas = scenario.arenaIds.flatMap((arenaId) => {
      const generation = arenaGeneration(input, arenaId);
      return generation === undefined
        ? []
        : [{ arenaId, arenaGeneration: generation }];
    });

    if (arenas.length !== scenario.arenaIds.length) {
      return {
        ...base,
        disposition: "manual-required",
        experiments: [],
        reasons: [
          "All-arena runtime execution requires explicit generation identity for every participating arena.",
        ],
      };
    }

    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        scenario.kind === "simultaneous-all-arena-start"
          ? createAllArenaStartStressExperiment({
              id: scenario.id,
              title: scenario.purpose,
              targetProfileFingerprint:
                input.targetProfileFingerprint,
              fixtureFingerprint:
                input.fixtureFingerprint,
              objectiveId: input.objectiveId,
              participant: input.participant,
              arenas,
              playerCountPerArena:
                input.matrix.playersPerArena,
              ...optionalRuns,
            })
          : createAllArenaFinishStressExperiment({
              id: scenario.id,
              title: scenario.purpose,
              targetProfileFingerprint:
                input.targetProfileFingerprint,
              fixtureFingerprint:
                input.fixtureFingerprint,
              objectiveId: input.objectiveId,
              participant: input.participant,
              arenas,
              playerCountPerArena:
                input.matrix.playersPerArena,
              ...optionalRuns,
            }),
      ],
      reasons: [
        "Dedicated all-arena runtime capability covers this scenario with explicit arena generation identity.",
      ],
    };
  }

  if (
    scenario.kind === "cleanup-start-overlap" &&
    scenario.arenaIds.length === 2
  ) {
    const endingId = scenario.arenaIds[0]!;
    const startingId = scenario.arenaIds[1]!;
    const endingGeneration =
      arenaGeneration(input, endingId);
    const startingGeneration =
      arenaGeneration(input, startingId);

    if (
      endingGeneration === undefined ||
      startingGeneration === undefined
    ) {
      return {
        ...base,
        disposition: "manual-required",
        experiments: [],
        reasons: [
          "Cleanup/start overlap requires explicit generation identity for both arenas.",
        ],
      };
    }

    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        createCleanupStartOverlapExperiment({
          id: scenario.id,
          title: scenario.purpose,
          targetProfileFingerprint:
            input.targetProfileFingerprint,
          fixtureFingerprint:
            input.fixtureFingerprint,
          objectiveId: input.objectiveId,
          participant: input.participant,
          endingArena: {
            arenaId: endingId,
            arenaGeneration: endingGeneration,
          },
          startingArena: {
            arenaId: startingId,
            arenaGeneration: startingGeneration,
          },
          playerCountStartingArena:
            input.matrix.playersPerArena,
          ...optionalRuns,
        }),
      ],
      reasons: [
        "Dedicated cleanup/start overlap capability covers this pair with explicit generation identity.",
      ],
    };
  }


  if (
    scenario.kind === "staggered-full-join" &&
    scenario.arenaIds.length > 0
  ) {
    const arenas = scenario.arenaIds.flatMap((arenaId) => {
      const generation = arenaGeneration(input, arenaId);
      return generation === undefined
        ? []
        : [{ arenaId, arenaGeneration: generation }];
    });

    if (arenas.length !== scenario.arenaIds.length) {
      return {
        ...base,
        disposition: "manual-required",
        experiments: [],
        reasons: [
          "Staggered full-join execution requires explicit generation identity for every participating arena.",
        ],
      };
    }

    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        createStaggeredFullJoinStressExperiment({
          id: scenario.id,
          title: scenario.purpose,
          targetProfileFingerprint:
            input.targetProfileFingerprint,
          fixtureFingerprint:
            input.fixtureFingerprint,
          objectiveId: input.objectiveId,
          participant: input.participant,
          arenas,
          playerCountPerArena:
            input.matrix.playersPerArena,
          ...optionalRuns,
        }),
      ],
      reasons: [
        "Dedicated staggered full-join runtime capability covers this scenario with explicit arena generation identity.",
      ],
    };
  }

  if (
    (
      scenario.kind === "disconnect-during-setup" ||
      scenario.kind === "disconnect-during-active"
    ) &&
    scenario.playerIds.length > 0
  ) {
    const subject =
      input.subjects?.[scenario.playerIds[0]!];

    if (!subject) {
      return {
        ...base,
        disposition: "manual-required",
        experiments: [],
        reasons: [
          "Disconnect stress execution requires explicit player/session generation identity.",
        ],
      };
    }

    const experimentInput = {
      id: scenario.id,
      title: scenario.purpose,
      targetProfileFingerprint:
        input.targetProfileFingerprint,
      fixtureFingerprint:
        input.fixtureFingerprint,
      objectiveId: input.objectiveId,
      participant: input.participant,
      subject,
      ...optionalRuns,
    };

    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        scenario.kind === "disconnect-during-setup"
          ? createDisconnectDuringSetupStressExperiment(
              experimentInput,
            )
          : createDisconnectDuringActiveStressExperiment(
              experimentInput,
            ),
      ],
      reasons: [
        "Dedicated disconnect stress capability covers this scenario with explicit player/session generation identity.",
      ],
    };
  }

  if (
    (
      scenario.kind === "death-during-join" ||
      scenario.kind === "reconnect-after-disconnect"
    ) &&
    scenario.playerIds.length > 0
  ) {
    const subject =
      input.subjects?.[scenario.playerIds[0]!];
    if (!subject) {
      return {
        ...base,
        disposition: "manual-required",
        experiments: [],
        reasons: [
          "Scenario requires explicit player/session generation identity before runtime execution.",
        ],
      };
    }

    const experimentInput = {
      id: scenario.id,
      title: scenario.purpose,
      targetProfileFingerprint:
        input.targetProfileFingerprint,
      fixtureFingerprint:
        input.fixtureFingerprint,
      objectiveId: input.objectiveId,
      participant: input.participant,
      subject,
      ...optionalRuns,
    };

    return {
      ...base,
      disposition: "runtime-ready",
      experiments: [
        scenario.kind === "death-during-join"
          ? createDeathDuringJoinExperiment(
              experimentInput,
            )
          : createReconnectGenerationResetExperiment(
              experimentInput,
            ),
      ],
      reasons: [
        "Existing player-session generation runtime capability covers this scenario with explicit subject identity.",
      ],
    };
  }

  return {
    ...base,
    disposition: "manual-required",
    experiments: [],
    reasons: [
      generation === undefined &&
      primaryArena !== undefined
        ? "Arena generation identity is unresolved for runtime execution."
        : "No deterministic runtime experiment adapter is registered for this stress scenario kind yet.",
    ],
  };
}

export function compileArenaStressRuntime(
  input: ArenaStressRuntimeCompilerInput,
): ArenaStressRuntimeCompilation {
  const items = input.matrix.scenarios.map(
    (scenario) =>
      compileScenario(scenario, input),
  );
  const runtimeReady = items.filter(
    (item) => item.disposition === "runtime-ready",
  );
  const manualRequired = items.filter(
    (item) => item.disposition === "manual-required",
  );

  return {
    schemaVersion: 1,
    runtimeReady,
    manualRequired,
    experiments: runtimeReady.flatMap(
      (item) => item.experiments,
    ),
  };
}
