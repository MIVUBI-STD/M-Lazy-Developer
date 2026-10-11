import type { SourceRef } from "../../../packages/project-model/src/index.js";

export const DIALOGUE_PARSER_REVISION =
  "m-bedrock-dialogue-parser:2";
import { analyzeCommand } from "../../commands/src/index.js";
import type {
  DialogueCommandTrigger,
  DialogueSceneCommand,
  DialogueDisplayText,
  ParsedDialogueDocument,
  ParsedDialogueScene,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function displayText(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizedCommand(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

function parseCommands(
  values: unknown,
  trigger: DialogueCommandTrigger,
  source: SourceRef,
  pointer: string,
  buttonIndex?: number,
): DialogueSceneCommand[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value, index) => {
    const command = normalizedCommand(value);
    if (!command) return [];
    const commandSource: SourceRef = {
      ...source, jsonPointer: pointer + "/" + index,
    };
    return [{
      raw: command,
      trigger,
      ...(buttonIndex !== undefined ? { buttonIndex } : {}),
      source: commandSource,
      analysis: analyzeCommand(command, commandSource),
    }];
  });
}

function parseScene(
  value: unknown,
  source: SourceRef,
  sceneIndex: number,
): ParsedDialogueScene | undefined {
  const record = asRecord(value);
  if (!record || typeof record.scene_tag !== "string" || !record.scene_tag.trim()) {
    return undefined;
  }
  const scenePath = "/minecraft:npc_dialogue/scenes/" + sceneIndex;
  const at = (pointer: string): SourceRef => ({
    ...source, jsonPointer: scenePath + pointer,
  });
  const commands: DialogueSceneCommand[] = [
    ...parseCommands(record.on_open_commands, "open", source,
      scenePath + "/on_open_commands"),
    ...parseCommands(record.on_close_commands, "close", source,
      scenePath + "/on_close_commands"),
  ];
  const text: DialogueDisplayText[] = [];
  const npcName = displayText(record.npc_name);
  const body = displayText(record.text);
  if (npcName) {
    text.push({
      kind: "npc-name",
      text: npcName,
      source: at("/npc_name"),
    });
  }
  if (body) {
    text.push({
      kind: "body",
      text: body,
      source: at("/text"),
    });
  }

  if (Array.isArray(record.buttons)) {
    record.buttons.forEach((buttonValue, buttonIndex) => {
      const button = asRecord(buttonValue);
      if (!button) return;
      const buttonText =
        displayText(button.name) ??
        displayText(button.text);
      if (buttonText) {
        text.push({
          kind: "button",
          text: buttonText,
          buttonIndex,
          source: at("/buttons/" + buttonIndex +
            (displayText(button.name) ? "/name" : "/text")),
        });
      }
      commands.push(...parseCommands(
        button.commands,
        "button",
        source,
        scenePath + "/buttons/" + buttonIndex + "/commands",
        buttonIndex,
      ));
    });
  }

  return {
    sceneTag: record.scene_tag.trim(),
    source: at(""),
    commands,
    displayText: text,
  };
}

export function parseDialogueDocument(
  raw: unknown,
  source: SourceRef,
): ParsedDialogueDocument | undefined {
  const root = asRecord(raw);
  const dialogue = asRecord(root?.["minecraft:npc_dialogue"]);
  if (!root || !dialogue || !Array.isArray(dialogue.scenes)) return undefined;

  const scenes = dialogue.scenes
    .map((value, index) => parseScene(value, source, index))
    .filter((scene): scene is ParsedDialogueScene => scene !== undefined);

  const counts = new Map<string, number>();
  for (const scene of scenes) {
    counts.set(scene.sceneTag, (counts.get(scene.sceneTag) ?? 0) + 1);
  }

  const duplicateSceneTags = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sceneTag]) => sceneTag)
    .sort();

  const formatVersion =
    typeof root.format_version === "string" ||
    typeof root.format_version === "number"
      ? String(root.format_version)
      : undefined;

  return {
    source,
    ...(formatVersion ? { formatVersion } : {}),
    scenes,
    duplicateSceneTags,
  };
}
