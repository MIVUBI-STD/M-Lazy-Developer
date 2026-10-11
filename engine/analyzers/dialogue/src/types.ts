import type { CommandAnalysis } from "../../commands/src/index.js";
import type { SourceRef } from "../../../packages/project-model/src/index.js";

export type DialogueCommandTrigger = "open" | "close" | "button";

export interface DialogueSceneCommand {
  raw: string;
  trigger: DialogueCommandTrigger;
  buttonIndex?: number;
  analysis: CommandAnalysis;
  /** Exact authored dialogue command position. */
  source?: SourceRef;
}

export interface DialogueDisplayText {
  kind: "npc-name" | "body" | "button";
  text: string;
  buttonIndex?: number;
  /** Exact NPC body or button text location. */
  source?: SourceRef;
}

export interface ParsedDialogueScene {
  sceneTag: string;
  /** Exact scene identity, including duplicate-tag scene indices. */
  source?: SourceRef;
  commands: DialogueSceneCommand[];
  displayText?: DialogueDisplayText[];
}

export interface ParsedDialogueDocument {
  source: SourceRef;
  formatVersion?: string;
  scenes: ParsedDialogueScene[];
  duplicateSceneTags: string[];
}
