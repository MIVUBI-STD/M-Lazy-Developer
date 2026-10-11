import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { packageDirectoryDeterministically } from "../../archive/src/index.js";
import { runSelectedMapAudit } from "../src/map-audit-pipeline.js";

/**
 * Synthetic authoring styles, not production game maps or runtime evidence.
 * Exercise the real .mcworld -> single selected-map audit -> operator output,
 * without a second extractor, a private map, or genre-specific expectations.
 */
type Case = "dialogue" | "animation" | "ambiguous-target";

async function syntheticMcworld(kind: Case): Promise<{
  archive: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), "m-bedrock-gameplay-acceptance-"));
  const world = join(root, "world");
  const first = join(world, "behavior_packs", "demo");
  const second = join(world, "behavior_packs", "other");
  const manifest = (uuid: string, moduleUuid: string) => ({
    format_version: 2,
    header: {
      name: "Synthetic source-flow acceptance",
      description: "Synthetic test world; no private assets",
      uuid,
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0],
    },
    modules: [{ type: "data", uuid: moduleUuid, version: [1, 0, 0] }],
  });
  try {
    await mkdir(join(first, "functions", "arena"), { recursive: true });
    await writeFile(join(world, "levelname.txt"), "Synthetic source-flow acceptance\n");
    await writeFile(join(first, "manifest.json"), JSON.stringify(manifest(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab",
    )));
    await writeFile(join(first, "functions", "arena", "start.mcfunction"),
      kind === "animation"
        ? "setblock 1 64 1 stone\n"
        : "scoreboard players set @p session 1\ntp @p 5 70 5\n",
    );
    const packs = [{
      pack_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      version: [1, 0, 0],
    }];
    if (kind === "ambiguous-target") {
      await mkdir(join(second, "functions", "arena"), { recursive: true });
      await writeFile(join(second, "manifest.json"), JSON.stringify(manifest(
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc",
      )));
      await writeFile(join(second, "functions", "arena", "start.mcfunction"),
        "summon zombie 3 70 3\n",
      );
      packs.push({
        pack_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        version: [1, 0, 0],
      });
    }
    if (kind !== "animation") {
      await mkdir(join(first, "dialogue"), { recursive: true });
      await writeFile(join(first, "dialogue", "npc.json"), JSON.stringify({
        format_version: "1.17.0",
        "minecraft:npc_dialogue": {
          scenes: [{
            scene_tag: "synthetic:entry",
            npc_name: "Guide",
            text: "Choose an action.",
            buttons: [{
              name: "Start Challenge",
              commands: ["function arena/start"],
            }],
          }],
        },
      }));
    } else {
      await mkdir(join(first, "animations"), { recursive: true });
      await mkdir(join(first, "entities"), { recursive: true });
      await writeFile(join(first, "animations", "start.json"), JSON.stringify({
        format_version: "1.10.0",
        animations: {
          "animation.synthetic.start": {
            loop: false,
            timeline: { "0.2": ["/function arena/start"] },
          },
        },
      }));
      await writeFile(join(first, "entities", "trigger.json"), JSON.stringify({
        format_version: "1.16.0",
        "minecraft:entity": {
          description: {
            identifier: "synthetic:trigger",
            animations: { begin: "animation.synthetic.start" },
            scripts: { animate: ["begin"] },
          },
          components: {},
          events: {},
        },
      }));
    }
    await writeFile(join(world, "world_behavior_packs.json"), JSON.stringify(packs));
    const archive = join(root, kind + ".mcworld");
    await packageDirectoryDeterministically(world, archive);
    return { archive, cleanup: () => rm(root, { recursive: true, force: true }) };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

describe("Game-Centric Discovery selected-map acceptance (synthetic)", () => {
  it("follows NPC button -> unique function -> sourced score and teleport effects", async () => {
    const fixture = await syntheticMcworld("dialogue");
    try {
      const result = await runSelectedMapAudit({ artifactPath: fixture.archive });
      const ir = result.inspection.semanticIrModel;
      const relation = ir.execution.authoredBehaviorRelations?.find(item =>
        item.kind === "dialogue-button-command");
      expect(relation?.interactionLabel).toBe("Start Challenge");
      expect(relation?.executionEdgeIds).toHaveLength(1);
      const edge = ir.execution.edges.find(item =>
        item.id === relation!.executionEdgeIds![0]);
      expect(edge?.resolution).toBe("resolved");
      expect(edge?.to).toBeDefined();
      const teleport = ir.execution.worldEffects?.find(effect =>
        effect.kind === "teleport" &&
        effect.executionRegionId === edge!.to);
      expect(teleport).toBeDefined();
      const sourceFlow = result.mapAuditReport.gameplayStructure
        ?.sourceFlowCandidates.find(flow =>
          flow.entryKind === "dialogue-command" &&
          flow.executionEdgeIds.includes(edge!.id));
      expect(sourceFlow?.sourceSteps.some(step => step.id === teleport!.id)).toBe(true);
      expect(sourceFlow?.sourceSteps.some(step =>
        step.kind === "state" && step.executionRegionId === edge!.to)).toBe(true);
      expect(result.inspection.gameplayIntent.model.nodes.some(node =>
        node.kind === "mechanic" &&
        node.label === "NPC interaction: Start Challenge" &&
        node.status === "inferred")).toBe(true);
      expect(result.mapAuditReport.gameplayFlowBasis)
        .toBe("AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY");
      expect(result.mapAuditReport.gameplayStructure
        ?.mechanicReconstructions.some(item =>
          item.name === "NPC interaction: Start Challenge" &&
          item.exactSourceFlowIds.includes(sourceFlow!.id))).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it("links entity animation alias -> timeline command -> unique function effect", async () => {
    const fixture = await syntheticMcworld("animation");
    try {
      const result = await runSelectedMapAudit({ artifactPath: fixture.archive });
      const ir = result.inspection.semanticIrModel;
      expect(ir.execution.authoredBehaviorRelations?.some(item =>
        item.kind === "entity-animation-activation" &&
        item.resolution === "EXACT_REFERENCE")).toBe(true);
      const timeline = ir.execution.authoredBehaviorRelations?.find(item =>
        item.kind === "animation-timeline-command");
      expect(timeline?.timingSeconds).toBe(0.2);
      expect(timeline?.executionEdgeIds).toHaveLength(1);
      const edge = ir.execution.edges.find(item =>
        item.id === timeline!.executionEdgeIds![0]);
      expect(edge?.resolution).toBe("resolved");
      const effect = ir.execution.worldEffects?.find(item =>
        item.kind === "block-mutation" &&
        item.executionRegionId === edge!.to);
      expect(effect).toBeDefined();
      const flow = result.mapAuditReport.gameplayStructure?.sourceFlowCandidates
        .find(item => item.entryKind === "behavior-animation" &&
          item.executionEdgeIds.includes(edge!.id));
      expect(flow?.sourceSteps.some(item => item.id === effect!.id)).toBe(true);
      expect(result.mapAuditReport.gameplayStructure?.authoredBehaviorRelationships
        .some(item => item.id === timeline!.id)).toBe(true);
      expect(result.mapAuditReport.gameDesign.winConditionGrounding)
        .not.toBe("authored");
    } finally {
      await fixture.cleanup();
    }
  });

  it("does not traverse either target when a command resolves to duplicate pack functions", async () => {
    const fixture = await syntheticMcworld("ambiguous-target");
    try {
      const result = await runSelectedMapAudit({ artifactPath: fixture.archive });
      const ir = result.inspection.semanticIrModel;
      const relation = ir.execution.authoredBehaviorRelations?.find(item =>
        item.kind === "dialogue-button-command");
      const edge = ir.execution.edges.find(item =>
        item.id === relation?.executionEdgeIds?.[0]);
      expect(edge?.resolution).toBe("unresolved");
      expect(edge?.to).toBeUndefined();
      const flow = result.mapAuditReport.gameplayStructure?.sourceFlowCandidates
        .find(item => item.entryKind === "dialogue-command" &&
          item.executionEdgeIds.includes(edge!.id));
      expect(flow?.unresolvedExecutionEdgeIds).toContain(edge?.id);
      expect(flow?.regionIds).toHaveLength(1);
      expect(flow?.sourceSteps.some(step =>
        step.executionRegionId !== flow.entryRegionId)).toBe(false);
      expect(result.mapAuditReport.gameplayFlowBasis)
        .toBe("AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY");
    } finally {
      await fixture.cleanup();
    }
  });
});
