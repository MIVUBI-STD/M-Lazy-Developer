import {
  exploreInterleavings,
  type ScheduledOperation,
} from "./interleaving.js";
import type { ConcurrencySemantics } from "./happens-before.js";

export type MultiplayerInterleavingEventKind =
  | "join-request"
  | "membership-commit"
  | "leave"
  | "start-request"
  | "start-commit"
  | "disconnect"
  | "reconnect"
  | "death"
  | "respawn"
  | "cleanup-begin"
  | "cleanup-complete"
  | "deferred-callback"
  | "arena-reuse";

export interface MultiplayerInterleavingEvent {
  id: string;
  kind: MultiplayerInterleavingEventKind;
  arenaId?: string;
  playerId?: string;
  arenaGeneration?: number;
  connectionGeneration?: number;
  lifeGeneration?: number;
  participationGeneration?: number;
  parentEventIds?: readonly string[];
}

export interface MultiplayerInterleavingSchedule {
  eventIds: readonly string[];
  riskScore: number;
  riskReasons: readonly string[];
}

export interface MultiplayerInterleavingAnalysis {
  events: number;
  generatedSchedules: number;
  exploredNodes: number;
  reducedEquivalentBranches: number;
  blockedByHappensBefore: number;
  generationDependencyPairs: number;
  truncated: boolean;
  schedules: readonly MultiplayerInterleavingSchedule[];
}

export interface MultiplayerInterleavingOptions {
  maxSchedules?: number;
  maxExploredNodes?: number;
  concurrency?: ConcurrencySemantics;
}

function resource(
  prefix: string,
  value: string | undefined,
): string | undefined {
  return value === undefined
    ? undefined
    : prefix + ":" + value;
}

function eventFootprint(
  event: MultiplayerInterleavingEvent,
): ScheduledOperation<MultiplayerInterleavingEvent>["footprint"] {
  const arena = resource("arena", event.arenaId);
  const player = resource("player", event.playerId);
  const reads: string[] = [];
  const writes: string[] = [];
  const semanticSurfaces = new Set<string>();

  const read = (...values: (string | undefined)[]) => {
    reads.push(...values.filter((value): value is string => value !== undefined));
  };
  const write = (...values: (string | undefined)[]) => {
    writes.push(...values.filter((value): value is string => value !== undefined));
  };

  switch (event.kind) {
    case "join-request":
      read(arena, player);
      write(player && player + ":reservation");
      semanticSurfaces.add("network-input-order");
      break;
    case "membership-commit":
      read(arena, player);
      write(
        arena && arena + ":membership",
        player && player + ":assignment",
      );
      semanticSurfaces.add("event-ordering");
      break;
    case "leave":
      read(arena, player);
      write(
        arena && arena + ":membership",
        player && player + ":assignment",
      );
      semanticSurfaces.add("network-input-order");
      break;
    case "start-request":
      read(
        arena && arena + ":membership",
        arena && arena + ":phase",
      );
      write(arena && arena + ":start-owner");
      semanticSurfaces.add("event-ordering");
      break;
    case "start-commit":
      read(arena && arena + ":start-owner");
      write(arena && arena + ":phase");
      semanticSurfaces.add("tick-scheduling");
      break;
    case "disconnect":
    case "reconnect":
      read(player);
      write(
        player,
        player && player + ":connected",
        player && player + ":connection-generation",
        player && player + ":progress",
      );
      semanticSurfaces.add("network-input-order");
      break;
    case "death":
    case "respawn":
      read(player);
      write(
        player,
        player && player + ":life-generation",
        player && player + ":life-state",
      );
      semanticSurfaces.add("death-respawn-order");
      break;
    case "cleanup-begin":
      read(arena);
      write(
        arena,
        arena && arena + ":phase",
        arena && arena + ":cleanup",
      );
      semanticSurfaces.add("event-ordering");
      break;
    case "cleanup-complete":
      read(arena && arena + ":cleanup");
      write(
        arena,
        arena && arena + ":cleanup",
        arena && arena + ":membership",
        arena && arena + ":generation",
      );
      semanticSurfaces.add("deferred-callback-order");
      break;
    case "deferred-callback":
      read(arena, player);
      write(
        arena && arena + ":deferred-state",
        player && player + ":deferred-state",
      );
      semanticSurfaces.add("deferred-callback-order");
      break;
    case "arena-reuse":
      read(
        arena && arena + ":cleanup",
        arena && arena + ":generation",
      );
      write(arena && arena + ":phase");
      semanticSurfaces.add("event-ordering");
      break;
  }

  return {
    reads: [...new Set(reads)].sort(),
    writes: [...new Set(writes)].sort(),
    semanticSurfaces: [...semanticSurfaces].sort(),
  };
}

function generationTokens(
  event: MultiplayerInterleavingEvent,
): Readonly<Record<string, string | number>> | undefined {
  const entries: [string, string | number][] = [];
  if (
    event.arenaId !== undefined &&
    event.arenaGeneration !== undefined
  ) {
    entries.push([
      "arena:" + event.arenaId,
      event.arenaGeneration,
    ]);
  }
  if (
    event.playerId !== undefined &&
    event.connectionGeneration !== undefined
  ) {
    entries.push([
      "connection:" + event.playerId,
      event.connectionGeneration,
    ]);
  }
  if (
    event.playerId !== undefined &&
    event.lifeGeneration !== undefined
  ) {
    entries.push([
      "life:" + event.playerId,
      event.lifeGeneration,
    ]);
  }
  if (
    event.playerId !== undefined &&
    event.participationGeneration !== undefined
  ) {
    entries.push([
      "participation:" + event.playerId,
      event.participationGeneration,
    ]);
  }
  return entries.length === 0
    ? undefined
    : Object.fromEntries(entries);
}

export function multiplayerEventOperation(
  event: MultiplayerInterleavingEvent,
): ScheduledOperation<MultiplayerInterleavingEvent> {
  const tokens = generationTokens(event);
  const hasParents =
    (event.parentEventIds?.length ?? 0) > 0;

  return {
    id: event.id,
    value: event,
    footprint: eventFootprint(event),
    ...(!hasParents && tokens === undefined
      ? {}
      : {
          causal: {
            ...(hasParents
              ? {
                  parentOperationIds:
                    event.parentEventIds!,
                }
              : {}),
            ...(tokens === undefined
              ? {}
              : {
                  generationTokens: tokens,
                }),
          },
        }),
  };
}

function scheduleRisk(
  events: readonly MultiplayerInterleavingEvent[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons = new Set<string>();

  for (let index = 0; index < events.length - 1; index++) {
    const current = events[index]!;
    const next = events[index + 1]!;

    if (
      current.arenaId !== undefined &&
      current.arenaId === next.arenaId
    ) {
      if (
        (current.kind === "cleanup-begin" ||
          current.kind === "cleanup-complete") &&
        (next.kind === "start-request" ||
          next.kind === "start-commit" ||
          next.kind === "arena-reuse")
      ) {
        score += 4;
        reasons.add("cleanup-start-overlap");
      }

      if (
        current.kind === "membership-commit" &&
        next.kind === "start-request"
      ) {
        score += 2;
        reasons.add("membership-start-boundary");
      }
    }

    if (
      current.playerId !== undefined &&
      current.playerId === next.playerId
    ) {
      if (
        current.kind === "disconnect" &&
        (next.kind === "deferred-callback" ||
          next.kind === "reconnect")
      ) {
        score += 4;
        reasons.add("disconnect-stale-work");
      }
      if (
        current.kind === "death" &&
        next.kind === "deferred-callback"
      ) {
        score += 4;
        reasons.add("death-stale-work");
      }
    }

    if (
      current.kind === "deferred-callback" ||
      next.kind === "deferred-callback"
    ) {
      score += 1;
      reasons.add("deferred-ordering");
    }
  }

  const arenas = new Set(
    events.flatMap((event) =>
      event.arenaId === undefined
        ? []
        : [event.arenaId]
    ),
  );
  if (arenas.size > 1) {
    score += 1;
    reasons.add("cross-arena-overlap");
  }

  return {
    score,
    reasons: [...reasons].sort(),
  };
}

export function analyzeMultiplayerInterleavings(
  events: readonly MultiplayerInterleavingEvent[],
  options: MultiplayerInterleavingOptions = {},
): MultiplayerInterleavingAnalysis {
  const result = exploreInterleavings(
    events.map(multiplayerEventOperation),
    {
      maxSchedules: options.maxSchedules ?? 64,
      maxExploredNodes:
        options.maxExploredNodes ?? 10_000,
      ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
    },
  );

  const schedules = result.schedules
    .map((schedule) => {
      const sequence = schedule.map(
        (operation) => operation.value,
      );
      const risk = scheduleRisk(sequence);
      return {
        eventIds: sequence.map(
          (event) => event.id,
        ),
        riskScore: risk.score,
        riskReasons: risk.reasons,
      };
    })
    .sort(
      (left, right) =>
        right.riskScore - left.riskScore ||
        left.eventIds.join("|").localeCompare(
          right.eventIds.join("|"),
        ),
    );

  return {
    events: events.length,
    generatedSchedules: schedules.length,
    exploredNodes: result.exploredNodes,
    reducedEquivalentBranches:
      result.reducedEquivalentBranches,
    blockedByHappensBefore:
      result.blockedByHappensBefore,
    generationDependencyPairs:
      result.generationDependencyPairs,
    truncated: result.truncated,
    schedules,
  };
}
