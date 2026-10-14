import { describe, expect, it } from "vitest";
import { deriveBlockCustomComponentRegistrations } from "../../../src/domains/automation/block-custom-component-evidence.js";

const source = {
  artifactId: "art_demo",
  relativePath: "behavior_packs/demo/scripts/main.ts",
};

describe("block custom component registration evidence", () => {
  it("extracts literal component identity and implemented callbacks", () => {
    const evidence = deriveBlockCustomComponentRegistrations(`
world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent("demo:clock", {
    onTick() {},
    onRedstoneUpdate() {},
  });
});
`, source);

    expect(evidence).toEqual([
      expect.objectContaining({
        componentId: "demo:clock",
        callbacks: ["onRedstoneUpdate", "onTick"],
      }),
    ]);
  });

  it("does not invent identity for dynamic registration ids", () => {
    expect(deriveBlockCustomComponentRegistrations(`
registry.registerCustomComponent(componentId, { onTick() {} });
`, source)).toEqual([]);
  });
});
