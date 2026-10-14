export type ChunkRuntimeValidationFamily =
  | "player-loader-readiness"
  | "ticking-area-recovery"
  | "chunk-geometry-probe"
  | "ticking-area-policy-probe"
  | "entity-lifecycle-probe"
  | "simulation-distance-probe"
  | "area-loaded-scheduler-probe"
  | "teleport-spawn-probe"
  | "dimension-lifecycle-probe";

export interface ChunkKnowledgeValidationPlan {
  knowledgeId: string;
  family: ChunkRuntimeValidationFamily;
  existingExperiment:
    | "player-loader-chunk-readiness"
    | "ticking-area-chunk-recovery"
    | null;
  requiredPredicates: readonly string[];
  requiredHostActions: readonly string[];
  status: "experiment-ready" | "probe-required";
}

const PLANS: readonly ChunkKnowledgeValidationPlan[] = [
  {
    "knowledgeId": "chunks.chunk-size-horizontal",
    "family": "chunk-geometry-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "chunk-coordinate-mapping-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.command-tickingarea-global-world-limit",
    "family": "ticking-area-policy-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "ticking-area-limit-observed"
    ],
    "requiredHostActions": [
      "chunk.set-temporary-ticking-area",
      "chunk.clear-temporary-ticking-area"
    ],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.command-tickingarea-requires-cheats",
    "family": "ticking-area-policy-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "ticking-area-command-permission-observed"
    ],
    "requiredHostActions": [
      "chunk.set-temporary-ticking-area"
    ],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.custom-dimensions-after-startup",
    "family": "dimension-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "custom-dimension-availability-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.dimension-height-range",
    "family": "chunk-geometry-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "dimension-height-range-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.dimension-is-chunk-loaded",
    "family": "player-loader-readiness",
    "existingExperiment": "player-loader-chunk-readiness",
    "requiredPredicates": [
      "target-chunk-ready"
    ],
    "requiredHostActions": [
      "chunk.position-loader-relative-to-target"
    ],
    "status": "experiment-ready"
  },
  {
    "knowledgeId": "chunks.entity-despawn-rules-independent-lifecycle",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "entity-despawn-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.entity-id-world-instance-scope",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "entity-id-scope-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.entity-persistent-component",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "persistent-entity-reload-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.entity-query-unloaded-coverage-unspecified",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "unloaded-query-coverage-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.entity-tick-world-loader",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "entity-tick-world-loading-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.entity-transient-never-persists",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "transient-entity-reload-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.loaded-not-semantic-quiescence",
    "family": "player-loader-readiness",
    "existingExperiment": "player-loader-chunk-readiness",
    "requiredPredicates": [
      "target-chunk-ready",
      "target-semantic-activity-observed"
    ],
    "requiredHostActions": [
      "chunk.position-loader-relative-to-target"
    ],
    "status": "experiment-ready"
  },
  {
    "knowledgeId": "chunks.player-simulation-distance-configurable",
    "family": "simulation-distance-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "simulation-distance-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.relation.player-proximity-activates-simulation",
    "family": "player-loader-readiness",
    "existingExperiment": "player-loader-chunk-readiness",
    "requiredPredicates": [
      "target-chunk-ready"
    ],
    "requiredHostActions": [
      "chunk.position-loader-relative-to-target"
    ],
    "status": "experiment-ready"
  },
  {
    "knowledgeId": "chunks.schedule-on-area-loaded",
    "family": "area-loaded-scheduler-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "area-loaded-callback-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.schedule-on-area-loaded-not-loader",
    "family": "area-loaded-scheduler-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "area-loaded-callback-observed",
      "target-chunk-ready"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.script-tickingarea-manager-added",
    "family": "ticking-area-policy-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "script-ticking-area-created"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.script-tickingarea-manager-pack-scoped",
    "family": "ticking-area-policy-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "script-ticking-area-scope-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.simulation-distance-ticks",
    "family": "simulation-distance-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "simulation-tick-boundary-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.spectator-simulation-loading-unproven",
    "family": "simulation-distance-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "spectator-loading-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.tickingarea-does-not-create-player-spawn-context",
    "family": "ticking-area-recovery",
    "existingExperiment": "ticking-area-chunk-recovery",
    "requiredPredicates": [
      "target-chunk-ready",
      "player-spawn-context-observed"
    ],
    "requiredHostActions": [
      "chunk.isolate-target-from-loaders",
      "chunk.set-temporary-ticking-area",
      "chunk.clear-temporary-ticking-area"
    ],
    "status": "experiment-ready"
  },
  {
    "knowledgeId": "chunks.tickingarea-does-not-prevent-all-despawn",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "entity-despawn-observed",
      "target-chunk-ready"
    ],
    "requiredHostActions": [
      "chunk.set-temporary-ticking-area"
    ],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.tickingarea-exception",
    "family": "ticking-area-policy-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "ticking-area-exception-observed"
    ],
    "requiredHostActions": [
      "chunk.set-temporary-ticking-area"
    ],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.tickingarea-limits",
    "family": "ticking-area-policy-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "ticking-area-limit-observed"
    ],
    "requiredHostActions": [
      "chunk.set-temporary-ticking-area",
      "chunk.clear-temporary-ticking-area"
    ],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.tickingarea-moving-entity-exits-active-region",
    "family": "entity-lifecycle-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "moving-loader-region-exit-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "chunks.try-teleport-unloaded-destination",
    "family": "teleport-spawn-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "teleport-unloaded-destination-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  },
  {
    "knowledgeId": "teleport.spawn-entity-unloaded-chunk-error",
    "family": "teleport-spawn-probe",
    "existingExperiment": null,
    "requiredPredicates": [
      "spawn-unloaded-location-observed"
    ],
    "requiredHostActions": [],
    "status": "probe-required"
  }
] as const;

export function chunkKnowledgeValidationPlans(): readonly ChunkKnowledgeValidationPlan[] {
  return PLANS;
}

export function chunkKnowledgeValidationCoverage(
  knowledgeIds: readonly string[],
) {
  const byId = new Map(PLANS.map((plan) => [plan.knowledgeId, plan] as const));
  const covered = knowledgeIds.filter((id) => byId.has(id)).sort();
  const missing = knowledgeIds.filter((id) => !byId.has(id)).sort();
  return {
    total: knowledgeIds.length,
    planned: covered.length,
    experimentReady: covered.filter((id) => byId.get(id)?.status === "experiment-ready").length,
    probeRequired: covered.filter((id) => byId.get(id)?.status === "probe-required").length,
    missing,
  };
}
