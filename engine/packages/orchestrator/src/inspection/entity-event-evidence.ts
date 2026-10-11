import { analyzeCommand } from "../../../../analyzers/commands/src/index.js";
import { flattenCommandEffects } from "../../../../analyzers/commands/src/index.js";
import type { ParsedFunction } from "../../../../analyzers/functions/src/index.js";
import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";
import {
  parseBehaviorAnimationControllers,
  parseBehaviorAnimations,
  type ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import type { AuthoredBehaviorRelation } from "../../../semantic-ir/src/index.js";

export interface EntityEventExternalEvidence {
  event: string;
  kind: "summon-spawn-event" | "event-command" | "script-trigger-event";
  entityIdentifier?: string;
  executionRegion?: string;
  source: SourceRef;
}

function selectorEntityType(target: string | undefined): string | undefined {
  if (!target?.startsWith("@")) return undefined;
  const match = target.match(/(?:^|[,[])type=([^!,\]]+)/);
  return match?.[1];
}

function fromEffects(
  effects: ReturnType<typeof flattenCommandEffects>,
  executionRegion?: string,
): EntityEventExternalEvidence[] {
  const output: EntityEventExternalEvidence[] = [];
  for (const effect of effects) {
    if (effect.kind !== "entity-event-trigger") continue;
    const entityIdentifier =
      effect.entityIdentifier ??
      (effect.mechanism === "event-command"
        ? selectorEntityType(effect.target)
        : undefined);
    output.push({
      event: effect.event,
      kind: effect.mechanism === "summon"
        ? "summon-spawn-event"
        : "event-command",
      ...(entityIdentifier ? { entityIdentifier } : {}),
      ...(executionRegion === undefined
        ? {}
        : { executionRegion }),
      source: effect.source,
    });
  }
  return output;
}

export function deriveEntityEventExternalEvidence(
  functions: readonly ParsedFunction[],
  scripts: readonly ParsedScriptFile[],
): EntityEventExternalEvidence[] {
  const output: EntityEventExternalEvidence[] = [];

  for (const fn of functions) {
    for (const command of fn.commands) {
      output.push(...fromEffects(flattenCommandEffects(command.analysis)));
    }
  }

  for (const script of scripts) {
    for (const trigger of script.entityEventTriggers) {
      output.push({
        event: trigger.event,
        kind: "script-trigger-event",
        ...(trigger.executionRegion === undefined
          ? {}
          : { executionRegion: trigger.executionRegion }),
        source: trigger.source,
      });
    }

    for (const literal of script.commandLiterals) {
      output.push(...fromEffects(
        flattenCommandEffects(
          analyzeCommand(
            literal.command,
            literal.source,
          ),
        ),
        literal.executionRegion,
      ));
    }
  }

  const seen = new Set<string>();
  return output.filter((item) => {
    const key = [
      item.kind,
      item.entityIdentifier ?? "*",
      item.event,
      item.executionRegion ?? "",
      item.source.relativePath,
      item.source.range?.lineStart ?? 0,
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function externalEventRootsForEntity(
  entity: ParsedEntityDefinition,
  evidence: readonly EntityEventExternalEvidence[],
): string[] {
  const defined = new Set(Object.keys(entity.events));
  return [...new Set(
    evidence
      .filter((item) =>
        defined.has(item.event) &&
        (
          item.entityIdentifier === undefined ||
          item.entityIdentifier === entity.identifier
        )
      )
      .map((item) => item.event),
  )].sort();
}


// Exact-source relation projection for already parsed entity events, controller
// aliases and script/command event invocations. It is not a second graph.
export function deriveAuthoredEntityBehaviorRelations(input: {
  readonly entities: readonly ParsedEntityDefinition[];
  readonly controllerSources: readonly { raw: unknown; source: SourceRef }[];
  readonly animationSources?: readonly { raw: unknown; source: SourceRef }[];
  readonly scripts: readonly ParsedScriptFile[];
  readonly functions: readonly ParsedFunction[];
}): readonly AuthoredBehaviorRelation[] {
  const relations: AuthoredBehaviorRelation[] = [];
  const scope = (path: string): string => {
    const parts = path.replaceAll("\\", "/").split("/");
    const index = parts.findIndex(item =>
      item === "behavior_packs" || item === "behavior_pack");
    return index < 0 ? path : parts.slice(0,
      Math.min(index + 2, parts.length)).join("/");
  };
  const idFor = (ownerId: string, label: string): string =>
    "authored:" + encodeURIComponent(ownerId) + ":" +
      encodeURIComponent(label);
  const at = (source: SourceRef, pointer: string): SourceRef =>
    ({ ...source, jsonPointer: pointer });
  const add = (record: Omit<AuthoredBehaviorRelation, "id">): void => {
    const id = [
      record.kind, record.ownerId, record.from, record.to,
      record.source.relativePath, record.source.jsonPointer ?? "",
      record.source.range?.lineStart ?? 0,
      record.source.range?.columnStart ?? 0,
    ].map(encodeURIComponent).join(":");
    relations.push({ ...record, id: "authored-relation:" + id });
  };
  const controllers = input.controllerSources.flatMap(item =>
    parseBehaviorAnimationControllers(item.raw, item.source));
  const animations = (input.animationSources ?? []).flatMap(item =>
    parseBehaviorAnimations(item.raw, item.source));
  const animationsByScope = new Map<string, typeof animations>();
  for (const animation of animations) {
    const key = scope(animation.source.relativePath) + ":" + animation.identifier;
    const list = animationsByScope.get(key) ?? [];
    list.push(animation);
    animationsByScope.set(key, list);
  }
  // Timeline commands are independently authored, even when no entity
  // activation can be established. Their existence is not proof of playback.
  for (const animation of animations) {
    const animationId = idFor(animation.source.relativePath, animation.identifier);
    for (const command of animation.timelineCommands) {
      add({
        kind: "animation-timeline-command",
        ownerId: animationId, from: animationId,
        to: command.command, source: command.source,
        timingSeconds: command.seconds,
        resolution: "POSSIBLE_TARGET",
        reason: "Behavior-pack animation timeline authored at " +
          command.seconds + " seconds. Activation, loop timing, " +
          "command permissions and runtime effect are unproven.",
      });
    }
    for (const limitation of animation.limitations) {
      add({
        kind: "animation-timeline-uncertainty",
        ownerId: animationId, from: animationId,
        to: limitation, source: animation.source,
        resolution: "UNRESOLVED",
        reason: limitation,
      });
    }
  }
  const byScope = new Map<string, typeof controllers>();
  for (const controller of controllers) {
    const key = scope(controller.source.relativePath) + ":" + controller.identifier;
    const list = byScope.get(key) ?? [];
    list.push(controller);
    byScope.set(key, list);
  }
  for (const entity of input.entities) {
    if (!entity.identifier) continue;
    const entityOwner = idFor(entity.source.relativePath, entity.identifier);
    for (const [name, mutation] of Object.entries(entity.events)) {
      const eventId = entityOwner + ":event:" + encodeURIComponent(name);
      const walk = (node: NonNullable<typeof mutation.program>) => {
        for (const target of node.triggerEvents ?? []) {
          const source = at(entity.source, node.path + "/trigger");
          const exists = entity.events[target] !== undefined;
          add({
            kind: "entity-event-trigger", ownerId: entityOwner,
            from: eventId,
            to: entityOwner + ":event:" + encodeURIComponent(target),
            source, ...(exists ? { targetSource:
              at(entity.source, "/minecraft:entity/events/" +
                target.replaceAll("~", "~0").replaceAll("/", "~1")) } : {}),
            resolution: exists ? "EXACT_REFERENCE" : "UNRESOLVED",
            reason: exists
              ? "Self-target event reference exists; path filters and runtime invocation remain unknown."
              : "Referenced entity event is absent from this entity definition.",
          });
        }
        for (const child of node.steps ?? []) walk(child);
      };
      if (mutation.program) walk(mutation.program);
    }
    for (const activation of entity.activeAnimations ?? []) {
      const target = entity.animationAliases?.[activation.alias];
      const from = entityOwner + ":animation-activation:" +
        encodeURIComponent(activation.alias);
      const direct = target?.startsWith("controller.animation.") === true;
      const found = direct
        ? byScope.get(scope(entity.source.relativePath) + ":" + target) ?? []
        : [];
      const resolved = found.length === 1;
      const animationMatches = target && !direct
        ? animationsByScope.get(scope(entity.source.relativePath) + ":" + target) ?? []
        : [];
      const animationResolved = animationMatches.length === 1;
      add({
        kind: direct ? "entity-controller-activation" : "entity-animation-activation",
        ownerId: entityOwner,
        from, to: target ?? activation.alias,
        resolution: resolved || animationResolved ? "EXACT_REFERENCE" : "UNRESOLVED",
        source: activation.source,
        ...(resolved ? { targetSource: found[0]!.source } : {}),
        ...(animationResolved ? { targetSource: animationMatches[0]!.source } : {}),
        ...(activation.condition ? { condition: activation.condition } : {}),
        reason: resolved
          ? "Entity scripts.animate references one same-pack controller through an explicit alias; condition is unevaluated."
          : animationResolved
            ? "Entity scripts.animate references one same-pack behavior animation; timeline execution remains unverified."
            : "Animation alias has no unique same-pack behavior animation/controller target.",
      });
      if (!resolved) continue;
      const controller = found[0]!;
      const stateNames = new Set(controller.states.map(state => state.name));
      for (const state of controller.states) {
        const stateId = idFor(controller.source.relativePath,
          controller.identifier + ":state:" + state.name);
        for (const transition of state.transitions) {
          const destination = controller.states.find(item =>
            item.name === transition.target);
          add({
            kind: "controller-state-transition", ownerId: entityOwner,
            from: stateId,
            to: idFor(controller.source.relativePath,
              controller.identifier + ":state:" + transition.target),
            resolution: destination ? "EXACT_REFERENCE" : "UNRESOLVED",
            source: transition.source,
            ...(destination ? { targetSource: destination.source } : {}),
            condition: transition.condition,
            reason: destination
              ? "Ordered authored Molang transition; condition and runtime state remain unevaluated."
              : "Controller transition refers to a missing state.",
          });
        }
        for (const animation of state.animations) {
          const aliasValue = entity.animationAliases?.[animation.alias];
          const sourceTarget = aliasValue === undefined
            ? undefined : at(entity.source,
              "/minecraft:entity/description/animations/" +
              animation.alias.replaceAll("~", "~0").replaceAll("/", "~1"));
          add({
            kind: "controller-animation-reference", ownerId: entityOwner,
            from: stateId, to: aliasValue ?? animation.alias,
            resolution: sourceTarget ? "EXACT_REFERENCE" : "UNRESOLVED",
            source: animation.source,
            ...(sourceTarget ? { targetSource: sourceTarget } : {}),
            ...(animation.condition ? { condition: animation.condition } : {}),
            reason: sourceTarget
              ? "Controller references an entity animation alias; underlying animation timeline and playback remain unverified."
              : "Controller animation alias is not declared by the entity.",
          });
          const timeline = aliasValue
            ? animationsByScope.get(scope(entity.source.relativePath) + ":" + aliasValue) ?? []
            : [];
          if (timeline.length === 1) {
            add({
              kind: "controller-animation-timeline",
              ownerId: entityOwner,
              from: stateId, to: idFor(timeline[0]!.source.relativePath,
                timeline[0]!.identifier),
              resolution: "EXACT_REFERENCE",
              source: animation.source,
              targetSource: timeline[0]!.source,
              ...(animation.condition ? { condition: animation.condition } : {}),
              reason: "Controller state animation alias resolves to a unique same-pack behavior animation; playback and its effects remain conditional.",
            });
          }
        }
        for (const [phase, commands] of [
          ["on_entry", state.onEntryCommands],
          ["on_exit", state.onExitCommands],
        ] as const) {
          for (const command of commands) {
            add({
              kind: "controller-state-command", ownerId: entityOwner,
              from: stateId, to: command.command,
              resolution: "POSSIBLE_TARGET",
              source: command.source,
              reason: "Source-authored controller " + phase +
                " command; command effects and success are not proven.",
            });
          }
        }
      }
      if (!stateNames.has(controller.initialState)) {
        add({
          kind: "controller-state-transition", ownerId: entityOwner,
          from: idFor(controller.source.relativePath, controller.identifier),
          to: idFor(controller.source.relativePath,
            controller.identifier + ":state:" + controller.initialState),
          resolution: "UNRESOLVED", source: controller.source,
          reason: "Declared initial controller state does not exist.",
        });
      }
    }
  }
  // Unscoped triggerEvent calls cannot prove the target entity. Bind only
  // an explicitly typed target; otherwise keep the possible target distinct.
  const externals = deriveEntityEventExternalEvidence(
    input.functions, input.scripts);
  for (const event of externals) {
    const candidates = input.entities.filter(entity =>
      entity.identifier !== undefined &&
      entity.events[event.event] !== undefined &&
      (event.entityIdentifier === undefined ||
        entity.identifier === event.entityIdentifier));
    for (const entity of candidates) {
      const ownerId = idFor(entity.source.relativePath, entity.identifier!);
      const exact = event.entityIdentifier === entity.identifier &&
        candidates.length === 1;
      add({
        kind: "external-event-trigger", ownerId,
        from: event.executionRegion
          ? idFor(event.source.relativePath, event.executionRegion)
          : idFor(event.source.relativePath, "authored-command"),
        to: ownerId + ":event:" + encodeURIComponent(event.event),
        resolution: exact ? "EXACT_REFERENCE" : "POSSIBLE_TARGET",
        source: event.source,
        ...(exact ? { targetSource: at(entity.source,
          "/minecraft:entity/events/" +
          event.event.replaceAll("~", "~0").replaceAll("/", "~1")) } : {}),
        reason: exact
          ? "Exact event and entity identifier matched; runtime target identity and command success remain unproven."
          : "The authored event label matches, but actual target entity identity is unresolved.",
      });
    }
  }
  return [...new Map(relations.map(item => [item.id, item])).values()]
    .sort((a, b) => a.id.localeCompare(b.id));
}
