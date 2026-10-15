import { describe, expect, it } from "vitest";
import { writeUncompressed, type NBT } from "prismarine-nbt";
import { decodeBedrockActorRecord } from "../src/actor.js";

describe("bedrock actor decoder", () => {
  it("decodes identifier and Pos without inventing other fields", async () => {
    const nbt: NBT = {
      type: "compound",
      name: "",
      value: {
        identifier: { type: "string", value: "minecraft:zombie" },
        Pos: {
          type: "list",
          value: { type: "float", value: [10.5, 64, -2.25] },
        },
      },
    };
    const bytes = new Uint8Array(
      writeUncompressed(nbt, "little"),
    );

    const decoded =
      await decodeBedrockActorRecord(bytes);

    expect(decoded.identifier)
      .toBe("minecraft:zombie");
    expect(decoded.position)
      .toEqual({
        x: 10.5,
        y: 64,
        z: -2.25,
      });
  });
});
