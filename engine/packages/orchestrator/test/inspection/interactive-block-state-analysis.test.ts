import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeInteractiveBlockState } from "../../src/inspection/interactive-block-state-analysis.js";

describe("interactive block state analysis", () => {
  it("does not treat type-only mutation as permutation proof", () => {
    const script = parseScriptFile(
      "main",
      [
        'import { world } from "@minecraft/server";',
        'const dimension = world.getDimension("overworld");',
        "dimension.setBlockType({ x: 1, y: 2, z: 3 }, 'minecraft:oak_door');",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    expect(analyzeInteractiveBlockState([script])).toMatchObject({
      typeOnlyWrites: 1,
      explicitPermutationWrites: 0,
    });
  });

  it("decodes literal BlockPermutation.resolve state maps", () => {
    const script = parseScriptFile(
      "main",
      [
        'import { world } from "@minecraft/server";',
        'const dimension = world.getDimension("overworld");',
        "dimension.setBlockPermutation({ x: 1, y: 2, z: 3 }, BlockPermutation.resolve('minecraft:oak_door', { 'open_bit': true, 'direction': 2 }));",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeInteractiveBlockState([script]);
    expect(result.decodedPermutationWrites).toBe(1);
    expect(result.mutations[0]).toMatchObject({
      typeIdentity: "minecraft:oak_door",
      permutationStates: { open_bit: true, direction: 2 },
      stateEvidence: "decoded-permutation",
    });
  });

  it("preserves authored permutation expression as state evidence", () => {
    const script = parseScriptFile(
      "main",
      [
        'import { world } from "@minecraft/server";',
        'const dimension = world.getDimension("overworld");',
        "dimension.setBlockPermutation({ x: 1, y: 2, z: 3 }, doorPermutation);",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeInteractiveBlockState([script]);
    expect(result.explicitPermutationWrites).toBe(1);
    expect(result.mutations[0]?.permutationExpression).toBe("doorPermutation");
  });
});
