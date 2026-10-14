import { describe, expect, it } from "vitest";
import { createScriptTickingAreaManagerExperiment } from "../../../src/domains/chunk/script-ticking-area-experiment.js";
import { validateRuntimeExperimentDefinition } from "../../../src/index.js";

describe("script ticking-area experiment", () => {
  it("uses dedicated Script API fixture actions and teardown", () => {
    const definition = createScriptTickingAreaManagerExperiment({
      id: "script-area",
      title: "Script area",
      targetProfileFingerprint: "profile",
      fixtureFingerprint: "fixture",
      packId: "pack-a",
      areaName: "m_test",
      dimension: "overworld",
      x: 0, y: 64, z: 0,
    });
    expect(validateRuntimeExperimentDefinition(definition)).toEqual([]);
    expect(definition.protocol[0]?.actionId).toBe("chunk.script-ticking-area-create");
    expect(definition.protocol.at(-1)?.phase).toBe("teardown");
  });
});
