import { describe, expect, it } from "vitest";
import {
  createAreaLoadedSchedulerExperiment,
  createDimensionGeometryExperiment,
  createEntityPersistenceLifecycleExperiment,
  createSimulationBoundaryExperiment,
} from "../../../src/domains/chunk/chunk-lifecycle-experiments.js";
import { validateRuntimeExperimentDefinition } from "../../../src/index.js";

const base = {
  id: "fixture",
  title: "fixture",
  targetProfileFingerprint: "profile",
  fixtureFingerprint: "world",
  dimension: "overworld",
  x: 0, y: 64, z: 0,
};

describe("chunk lifecycle experiments", () => {
  it("builds valid geometry, simulation, scheduler and persistence definitions", () => {
    const definitions = [
      createDimensionGeometryExperiment(base),
      createSimulationBoundaryExperiment({
        ...base, controlDistanceChunks: 12, treatmentDistanceChunks: 1,
      }),
      createAreaLoadedSchedulerExperiment(base),
      createEntityPersistenceLifecycleExperiment({
        ...base, entityKey: "fixture:entity",
      }),
    ];
    for (const definition of definitions) {
      expect(validateRuntimeExperimentDefinition(definition)).toEqual([]);
    }
  });
});
