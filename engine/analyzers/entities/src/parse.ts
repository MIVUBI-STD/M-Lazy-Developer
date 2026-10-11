import type { SourceRef } from "../../../packages/project-model/src/index.js";
import type { EntityEventMutation, EntityEventProgram, ParsedEntityDefinition } from "./types.js";

export const ENTITY_PARSER_REVISION = "m-bedrock-entity-parser:2";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function componentData(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}

function componentKeys(value: unknown): string[] {
  return Object.keys(componentData(value)).sort();
}

function collectGroups(value: unknown): string[] {
  const groups = asRecord(value)?.component_groups;
  return Array.isArray(groups)
    ? groups.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/** MAY source references. Recursive alternatives are never one group state. */
function scanEventNode(value: unknown, output: EntityEventMutation): void {
  if (Array.isArray(value)) {
    for (const item of value) scanEventNode(item, output);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  output.addGroups.push(...collectGroups(record.add));
  output.removeGroups.push(...collectGroups(record.remove));
  if (typeof record.trigger === "string") output.triggerEvents.push(record.trigger);
  const trigger = asRecord(record.trigger);
  if (typeof trigger?.event === "string" &&
      (trigger.target === undefined || trigger.target === "self")) {
    output.triggerEvents.push(trigger.event);
  }
  for (const key of ["sequence", "randomize"]) {
    if (record[key] !== undefined) scanEventNode(record[key], output);
  }
}

const EVENT_KEYS = new Set([
  "add", "remove", "trigger", "sequence", "randomize", "filters", "weight",
]);
const MAX_PROGRAM_DEPTH = 24;

function parseEventProgram(
  value: unknown,
  path: string,
  depth = 0,
): EntityEventProgram {
  const unknown = (reason: string): EntityEventProgram =>
    ({ kind: "unsupported", path, reason });
  if (depth >= MAX_PROGRAM_DEPTH) return unknown("Nested event exceeds bounded source depth.");
  const record = asRecord(value);
  if (!record) return unknown("Event node is not an object.");
  const other = Object.keys(record).filter(key => !EVENT_KEYS.has(key));
  if (other.length > 0) return unknown("Unsupported entity event operators: " + other.sort().join(", "));
  const hasSequence = record.sequence !== undefined;
  const hasRandomize = record.randomize !== undefined;
  const hasDirect = record.add !== undefined ||
    record.remove !== undefined || record.trigger !== undefined;
  if ([hasSequence, hasRandomize, hasDirect].filter(Boolean).length > 1) {
    return unknown("Combined direct/sequence/randomize execution order is unresolved.");
  }
  if (record.weight !== undefined &&
      (typeof record.weight !== "number" ||
       !Number.isFinite(record.weight) || record.weight < 0)) {
    return unknown("Randomize weight is invalid.");
  }
  const guard = record.filters === undefined ? {} : { filters: record.filters };
  const weight = typeof record.weight === "number" ? { weight: record.weight } : {};
  if (hasSequence || hasRandomize) {
    const kind = hasSequence ? "sequence" as const : "randomize" as const;
    const rawSteps = hasSequence ? record.sequence : record.randomize;
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
      return unknown(kind + " must contain a nonempty array.");
    }
    return {
      kind, path, ...guard, ...weight,
      steps: rawSteps.map((step, index) =>
        parseEventProgram(step, path + "/" + kind + "/" + index, depth + 1)),
    };
  }
  if ((record.add !== undefined && !Array.isArray(asRecord(record.add)?.component_groups)) ||
      (record.remove !== undefined && !Array.isArray(asRecord(record.remove)?.component_groups))) {
    return unknown("Add/remove component_groups must be arrays.");
  }
  const triggerObj = asRecord(record.trigger);
  const trigger = typeof record.trigger === "string" ? record.trigger : triggerObj?.event;
  if (record.trigger !== undefined &&
      (typeof trigger !== "string" ||
       (triggerObj !== undefined && triggerObj.target !== undefined &&
        triggerObj.target !== "self"))) {
    return unknown("Event trigger target or name is not a statically local event.");
  }
  if (triggerObj && Object.keys(triggerObj).some(key => key !== "event" && key !== "target")) {
    return unknown("Event trigger has unsupported options.");
  }
  return {
    kind: "mutation", path, ...guard, ...weight,
    addGroups: collectGroups(record.add),
    removeGroups: collectGroups(record.remove),
    triggerEvents: typeof trigger === "string" ? [trigger] : [],
  };
}

function normalizeEvent(value: unknown, path: string): EntityEventMutation {
  const output: EntityEventMutation = {
    addGroups: [], removeGroups: [], triggerEvents: [],
    program: parseEventProgram(value, path),
  };
  scanEventNode(value, output);
  output.addGroups = [...new Set(output.addGroups)].sort();
  output.removeGroups = [...new Set(output.removeGroups)].sort();
  output.triggerEvents = [...new Set(output.triggerEvents)].sort();
  return output;
}

function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function parseEntityDefinition(
  raw: unknown,
  source: SourceRef,
): ParsedEntityDefinition {
  const root = asRecord(raw) ?? {};
  const entity = asRecord(root["minecraft:entity"]) ?? {};
  const description = asRecord(entity.description) ?? {};
  const groups = asRecord(entity.component_groups) ?? {};
  const events = asRecord(entity.events) ?? {};
  const componentGroups: Record<string, string[]> = {};
  const componentGroupData: Record<string, Record<string, unknown>> = {};
  for (const [groupId, groupValue] of Object.entries(groups)) {
    const data = componentData(groupValue);
    componentGroups[groupId] = Object.keys(data).sort();
    componentGroupData[groupId] = data;
  }
  const animationAliases: Record<string, string> = {};
  const rawAliases = asRecord(description.animations) ?? {};
  for (const [alias, reference] of Object.entries(rawAliases)) {
    if (typeof reference === "string" && reference.trim()) {
      animationAliases[alias] = reference;
    }
  }
  const activeAnimations: NonNullable<ParsedEntityDefinition["activeAnimations"]>[number][] = [];
  const scripts = asRecord(description.scripts);
  const active = scripts?.animate;
  if (Array.isArray(active)) {
    for (let index = 0; index < active.length; index++) {
      const item = active[index];
      const alias = typeof item === "string"
        ? item : Object.keys(asRecord(item) ?? {})[0];
      const condition = alias && asRecord(item)?.[alias];
      // Dynamic expressions and unknown shapes are not treated as activation.
      if (!alias || (typeof item !== "string" &&
          (Object.keys(asRecord(item) ?? {}).length !== 1 ||
           typeof condition !== "string"))) continue;
      activeAnimations.push({
        alias,
        ...(typeof condition === "string" ? { condition } : {}),
        source: { ...source, jsonPointer:
          "/minecraft:entity/description/scripts/animate/" + index },
      });
    }
  }
  const normalizedEvents: Record<string, EntityEventMutation> = {};
  for (const [eventId, eventValue] of Object.entries(events)) {
    normalizedEvents[eventId] = normalizeEvent(
      eventValue, "/minecraft:entity/events/" + pointerToken(eventId));
  }
  return {
    ...(typeof description.identifier === "string" ? { identifier: description.identifier } : {}),
    ...(typeof description.runtime_identifier === "string" ? { runtimeIdentifier: description.runtime_identifier } : {}),
    ...(
      typeof root.format_version === "string" ||
      typeof root.format_version === "number"
        ? { formatVersion: String(root.format_version) } : {}
    ),
    source,
    baseComponents: componentKeys(entity.components),
    baseComponentData: componentData(entity.components),
    componentGroups,
    componentGroupData,
    events: normalizedEvents,
    animationAliases,
    activeAnimations,
  };
}

/** Parse only stable BP controller state references; no Molang evaluation. */
export function parseBehaviorAnimationControllers(
  raw: unknown,
  source: SourceRef,
): readonly import("./types.js").ParsedBehaviorAnimationController[] {
  const root = asRecord(raw) ?? {};
  const controllers = asRecord(root.animation_controllers) ?? {};
  const output: import("./types.js").ParsedBehaviorAnimationController[] = [];
  for (const [identifier, controllerValue] of Object.entries(controllers)) {
    const controller = asRecord(controllerValue) ?? {};
    const states = asRecord(controller.states) ?? {};
    const limits: string[] = [];
    const controllerPath = "/animation_controllers/" + pointerToken(identifier);
    const records: import("./types.js").ParsedBehaviorAnimationController["states"][number][] = [];
    for (const [name, rawState] of Object.entries(states)) {
      const state = asRecord(rawState) ?? {};
      const path = controllerPath + "/states/" + pointerToken(name);
      const location = { ...source, jsonPointer: path };
      const animations: typeof records[number]["animations"][number][] = [];
      if (state.animations !== undefined && !Array.isArray(state.animations)) {
        limits.push(path + "/animations: unsupported shape");
      }
      for (const [index, item] of (Array.isArray(state.animations) ? state.animations : []).entries()) {
        const alias = typeof item === "string" ? item
          : Object.keys(asRecord(item) ?? {})[0];
        const condition = alias ? asRecord(item)?.[alias] : undefined;
        if (!alias || (typeof item !== "string" &&
            (Object.keys(asRecord(item) ?? {}).length !== 1 ||
            typeof condition !== "string"))) {
          limits.push(path + "/animations/" + index + ": dynamic animation reference");
          continue;
        }
        animations.push({
          alias,
          ...(typeof condition === "string" ? { condition } : {}),
          source: { ...source, jsonPointer: path + "/animations/" + index },
        });
      }
      const transitions: typeof records[number]["transitions"][number][] = [];
      if (state.transitions !== undefined && !Array.isArray(state.transitions)) {
        limits.push(path + "/transitions: unsupported shape");
      }
      for (const [index, item] of (Array.isArray(state.transitions) ? state.transitions : []).entries()) {
        const record = asRecord(item);
        const keys = Object.keys(record ?? {});
        if (keys.length !== 1 || typeof record?.[keys[0]!] !== "string") {
          limits.push(path + "/transitions/" + index + ": dynamic transition");
          continue;
        }
        transitions.push({
          target: keys[0]!, condition: record![keys[0]!] as string,
          source: { ...source, jsonPointer: path + "/transitions/" + index },
        });
      }
      const commands = (value: unknown, suffix: string) => {
        if (value === undefined) return [];
        const entries = typeof value === "string" ? [value] : value;
        if (!Array.isArray(entries) ||
            entries.some(entry => typeof entry !== "string")) {
          limits.push(path + suffix + ": unsupported command list");
          return [];
        }
        return entries.map((command: string, index: number) => ({
          command,
          source: { ...source, jsonPointer: path + suffix + "/" + index },
        }));
      };
      records.push({
        name, source: location, animations, transitions,
        onEntryCommands: commands(state.on_entry, "/on_entry"),
        onExitCommands: commands(state.on_exit, "/on_exit"),
      });
    }
    output.push({
      identifier,
      source: { ...source, jsonPointer: controllerPath },
      initialState: typeof controller.initial_state === "string"
        ? controller.initial_state : "default",
      states: records,
      limitations: limits.sort(),
    });
  }
  return output;
}


/**
 * Extract exact time/command provenance from behavior-pack animation JSON.
 * Only literal command strings are executable-source candidates. Unrecognized
 * key shapes remain limitations; no Molang, loop or activation is evaluated.
 */
export function parseBehaviorAnimations(
  raw: unknown,
  source: SourceRef,
): readonly import("./types.js").ParsedBehaviorAnimation[] {
  const root = asRecord(raw) ?? {};
  const definitions = asRecord(root.animations) ?? {};
  const output: import("./types.js").ParsedBehaviorAnimation[] = [];
  const MAX_TIMELINE_ENTRIES = 512;
  for (const [identifier, entry] of Object.entries(definitions)) {
    const record = asRecord(entry);
    const path = "/animations/" + pointerToken(identifier);
    const limitations: string[] = [];
    const timelineCommands: {
      seconds: number; command: string; source: SourceRef;
    }[] = [];
    if (!record) {
      limitations.push(path + ": animation entry is not an object");
    }
    const rawTimeline = record?.timeline;
    const timeline = asRecord(rawTimeline);
    if (rawTimeline !== undefined && !timeline) {
      limitations.push(path + "/timeline: unsupported timeline shape");
    }
    if (timeline && Object.keys(timeline).length > MAX_TIMELINE_ENTRIES) {
      limitations.push(path + "/timeline: exceeded bounded authored timepoints");
    } else {
      for (const [time, event] of Object.entries(timeline ?? {})) {
        const seconds = Number(time);
        const point = path + "/timeline/" + pointerToken(time);
        if (!time.trim() || !Number.isFinite(seconds) || seconds < 0) {
          limitations.push(point + ": invalid timepoint");
          continue;
        }
        const entries = typeof event === "string" ? [event] : event;
        if (!Array.isArray(entries) ||
            entries.some(value => typeof value !== "string")) {
          limitations.push(point + ": dynamic or non-command timeline entry");
          continue;
        }
        entries.forEach((command: string, index: number) => {
          if (!command.trim()) {
            limitations.push(point + "/" + index + ": empty command");
            return;
          }
          timelineCommands.push({
            seconds,
            command,
            source: {
              ...source,
              jsonPointer: typeof event === "string" ? point
                : point + "/" + index,
            },
          });
        });
      }
    }
    timelineCommands.sort((a, b) =>
      a.seconds - b.seconds ||
      (a.source.jsonPointer ?? "").localeCompare(b.source.jsonPointer ?? ""));
    const loop = record?.loop;
    output.push({
      identifier,
      source: { ...source, jsonPointer: path },
      ...(typeof loop === "boolean" || typeof loop === "string"
        ? { loop } : {}),
      timelineCommands,
      limitations: limitations.sort(),
    });
  }
  return output.sort((a, b) => a.identifier.localeCompare(b.identifier));
}
