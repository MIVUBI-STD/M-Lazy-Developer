import { describe, expect, it } from "vitest";
import { analyzeBlockAutomation, parseBlockDefinition } from "../src/index.js";

const source = { artifactId: "fixture-blocks", relativePath: "blocks/example.json" };

describe("block automation analysis", () => {
  it("preserves minecraft:tick scheduling semantics", () => {
    const block = parseBlockDefinition({
      format_version: "1.21.0",
      "minecraft:block": {
        description: { identifier: "example:clock" },
        components: {
          "minecraft:tick": {
            interval_range: [20, 40],
            looping: true,
          },
        },
      },
    }, source);

    expect(analyzeBlockAutomation(block)).toEqual([{
      component: "minecraft:tick",
      intervalRange: [20, 40],
      looping: true,
      deprecated: false,
      timingStatus: "explicit",
      source,
    }]);
  });

  it("keeps partial tick contracts unresolved instead of inventing defaults", () => {
    const block = parseBlockDefinition({
      "minecraft:block": {
        components: { "minecraft:tick": { interval_range: [5, "dynamic"] } },
      },
    }, source);

    expect(analyzeBlockAutomation(block)).toEqual([{
      component: "minecraft:tick",
      deprecated: false,
      timingStatus: "partial",
      source,
    }]);
  });

  it("separates deprecated queued ticking from current tick scheduling", () => {
    const block = parseBlockDefinition({
      "minecraft:block": {
        components: {
          "minecraft:queued_ticking": {
            interval_range: [1, 1],
            looping: false,
          },
        },
      },
    }, source);

    expect(analyzeBlockAutomation(block)[0]).toMatchObject({
      component: "minecraft:queued_ticking",
      deprecated: true,
      intervalRange: [1, 1],
      looping: false,
      timingStatus: "explicit",
    });
  });
});

import { analyzeBlockCustomComponentContracts } from "../src/automation.js";

describe("block custom component contracts", () => {
  it("correlates tick and redstone prerequisites with registered callbacks", () => {
    const block = parseBlockDefinition({
      "minecraft:block": {
        components: {
          "demo:clock": {},
          "minecraft:tick": { interval_range: [20, 20], looping: true },
          "minecraft:redstone_consumer": {},
        },
      },
    }, source);

    expect(analyzeBlockCustomComponentContracts(block, [{
      componentId: "demo:clock",
      callbacks: ["onTick", "onRedstoneUpdate"],
      source,
    }])).toEqual([
      expect.objectContaining({
        componentId: "demo:clock",
        tickTrigger: "configured",
        redstoneConsumer: "configured",
        status: "resolved",
      }),
    ]);
  });

  it("keeps missing callback prerequisites explicit", () => {
    const block = parseBlockDefinition({
      "minecraft:block": {
        components: { "demo:clock": {} },
      },
    }, source);

    expect(analyzeBlockCustomComponentContracts(block, [{
      componentId: "demo:clock",
      callbacks: ["onTick", "onRedstoneUpdate"],
      source,
    }])[0]).toMatchObject({
      tickTrigger: "missing",
      redstoneConsumer: "missing",
      status: "incomplete",
    });
  });
});
