import { describe, expect, it } from "vitest";
import {
  createArenaLifecycleBehavior,
  createChunkResidencyBehavior,
  createEntityLifecycleBehavior,
  createInventoryLifecycleBehavior,
  resolveSpatialAuthorityContract,
} from "../src/minecraft/index.js";

describe("behavior-model capability contracts", () => {
  it("proves arena lifecycle semantics are materialized", () => {
    const model = createArenaLifecycleBehavior({
      arenaKey: "arena-1",
      capacity: 4,
      resetDeadlineTicks: 200,
    });

    expect(
      (model.transitions ?? []).map((item) => item.id),
    ).toContain(
      "minecraft.arena:arena-1:start",
    );
    expect(
      (model.properties ?? []).map((item) => item.id),
    ).toContain(
      "minecraft.arena:arena-1:capacity-never-exceeded",
    );
  });

  it("proves chunk residency distinguishes loaded and simulation state", () => {
    const model =
      createChunkResidencyBehavior("0,0");

    expect(
      (model.variables ?? []).map((item) => item.id),
    ).toEqual(
      expect.arrayContaining([
        "chunk.loaded-for-script",
        "chunk.simulation-active",
      ]),
    );
    expect(
      (model.transitions ?? []).map((item) => item.id),
    ).toEqual(
      expect.arrayContaining([
        "minecraft.chunk:0,0:activate-simulation",
        "minecraft.chunk:0,0:unload",
      ]),
    );
  });

  it("proves entity lifecycle invalidates navigation on despawn", () => {
    const model =
      createEntityLifecycleBehavior({
        entityKey: "mob-1",
      });
    const despawn = (model.transitions ?? []).find(
      (item) =>
        item.id ===
        "minecraft.entity:mob-1:despawn",
    );

    expect(despawn).toBeDefined();
    expect(despawn?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variableId:
            "entity.navigation-active",
          value: false,
        }),
      ]),
    );
  });

  it("proves inventory commit is verification-gated", () => {
    const model =
      createInventoryLifecycleBehavior({
        playerKey: "player-1",
      });

    expect(
      (model.properties ?? []).map((item) => item.id),
    ).toContain(
      "minecraft.inventory:player-1:commit-requires-verification",
    );
  });

  it("proves spatial authority resolves from authored contract specificity", () => {
    const result =
      resolveSpatialAuthorityContract(
        {
          schemaVersion: 1,
          id: "spatial:test",
          rules: [{
            id: "deny-default",
            regionId: "plot",
            actor: "*",
            action: "*",
            decision: "deny",
          }, {
            id: "allow-player-build",
            regionId: "plot",
            actor: "player",
            action: "place-block",
            decision: "allow",
          }],
        },
        {
          regionId: "plot",
          actor: "player",
          action: "place-block",
        },
      );

    expect(result.status).toBe("resolved");
    expect(result.decision).toBe("allow");
    expect(result.matchedRuleIds).toEqual([
      "allow-player-build",
    ]);
  });
});
