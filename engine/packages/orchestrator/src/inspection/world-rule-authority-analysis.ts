import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";

export interface WorldRuleWrite {
  scriptId: string;
  executionRegion: string;
  rule: string;
  value: string;
  source: SourceRef;
}

export interface WorldRuleConflict {
  rule: string;
  values: readonly string[];
  writerRegions: readonly string[];
}

export type WorldRuleScriptInput =
  | ParsedScriptFile
  | {
      parsed: ParsedScriptFile;
      text?: string;
    };

export interface WorldRuleAuthorityAnalysis {
  writes: readonly WorldRuleWrite[];
  conflicts: readonly WorldRuleConflict[];
  naturalMobSpawning:
    | "disabled"
    | "enabled"
    | "conflicted"
    | "unresolved";
  scriptSpawnEntityPaths: number;
  commandSummonPaths: number;
  manualEntitySpawnPaths: number;
  globalRuleWrites: number;
  conflictingGlobalRules: number;
  arenaLocalWorldRuleWriteCandidates: number;
}

function normalized(command: string): string {
  return command.trim().replace(/^\//, "");
}

export function analyzeWorldRuleAuthority(
  scripts: readonly WorldRuleScriptInput[],
): WorldRuleAuthorityAnalysis {
  const writes: WorldRuleWrite[] = [];
  const normalizedScripts = scripts.map((item) =>
    "parsed" in item
      ? item
      : { parsed: item, text: undefined }
  );

  for (const item of normalizedScripts) {
    const script = item.parsed;
    for (const command of script.commandLiterals) {
      const text = normalized(command.command);
      const gamerule = /^gamerule\s+(\S+)\s+(\S+)/i.exec(text);
      const difficulty = /^difficulty\s+(\S+)/i.exec(text);
      const timeSet = /^time\s+set\s+(\S+)/i.exec(text);
      const weather = /^weather\s+(\S+)/i.exec(text);
      const rule = gamerule?.[1] ??
        (difficulty ? "world:difficulty" : undefined) ??
        (timeSet ? "world:time" : undefined) ??
        (weather ? "world:weather" : undefined);
      const value = gamerule?.[2] ?? difficulty?.[1] ??
        timeSet?.[1] ?? weather?.[1];
      if (rule === undefined || value === undefined) continue;
      writes.push({
        scriptId: script.identifier,
        executionRegion: command.executionRegion ?? "module",
        rule,
        value,
        source: command.source,
      });
    }

    const text = item.text ?? "";
    const propertyPattern =
      /\b(doMobSpawning|doDaylightCycle|doWeatherCycle|commandBlocksEnabled|keepInventory|mobGriefing|naturalRegeneration|pvp|sendCommandFeedback|fallDamage|showTags|difficulty|time|weather)\s*(?:=|:)\s*(true|false|-?\d+)\b/gi;
    for (const match of text.matchAll(propertyPattern)) {
      writes.push({
        scriptId: script.identifier,
        executionRegion: "module-or-runtime-property-write",
        rule: match[1]!,
        value: match[2]!,
        source: script.source,
      });
    }
  }

  const byRule = new Map<string, WorldRuleWrite[]>();
  for (const write of writes) {
    const key = write.rule.toLowerCase();
    byRule.set(key, [...(byRule.get(key) ?? []), write]);
  }

  const conflicts: WorldRuleConflict[] = [];
  for (const [rule, ruleWrites] of byRule) {
    const values = [...new Set(
      ruleWrites.map((item) => item.value.toLowerCase()),
    )].sort();
    if (values.length <= 1) continue;
    conflicts.push({
      rule,
      values,
      writerRegions: [...new Set(
        ruleWrites.map(
          (item) => item.scriptId + ":" + item.executionRegion,
        ),
      )].sort(),
    });
  }

  const mobWrites = byRule.get("domobspawning") ?? [];
  const mobValues = [...new Set(
    mobWrites.map((item) => item.value.toLowerCase()),
  )];
  const naturalMobSpawning =
    mobValues.length === 0
      ? "unresolved" as const
      : mobValues.length > 1
        ? "conflicted" as const
        : ["false", "0"].includes(mobValues[0]!)
          ? "disabled" as const
          : ["true", "1"].includes(mobValues[0]!)
            ? "enabled" as const
            : "unresolved" as const;

  const parsedScripts = normalizedScripts.map(
    (item) => item.parsed,
  );
  const scriptSpawnEntityPaths = parsedScripts.reduce((sum, script) => {
    // Direct spatial syntax can be recorded without a typed Dimension
    // receiver. Count each authored call site only once across producers.
    const spawnSites = [
      ...script.methodCalls.filter((call) => call.method === "spawnEntity")
        .map((call) => call.source),
      ...(script.spatialMutations ?? [])
        .filter((mutation) => mutation.kind === "entity-spawn")
        .map((mutation) => mutation.source),
    ];
    const distinctSites = new Set(spawnSites.map((site) => JSON.stringify([
      site.artifactId, site.relativePath, site.range?.lineStart,
      site.range?.columnStart, site.range?.lineEnd, site.range?.columnEnd,
    ])));
    return sum + distinctSites.size;
  }, 0);
  const parsedCommandSummonPaths = parsedScripts.reduce(
    (sum, script) =>
      sum +
      script.commandLiterals.filter((command) =>
        /^\/?summon\b/i.test(command.command.trim())
      ).length,
    0,
  );
  const rawSummonPaths = normalizedScripts.reduce(
    (sum, item) =>
      sum +
      (
        item.text?.match(
          /["'`]\/?summon\s+[^"'\`\r\n]+["'`]/gi,
        )?.length ?? 0
      ),
    0,
  );
  const commandSummonPaths =
    Math.max(
      parsedCommandSummonPaths,
      rawSummonPaths,
    );

  const arenaLocalWorldRuleWriteCandidates =
    writes.filter(
      (item) =>
        /(?:arena|round|match|level|session)/i.test(
          item.executionRegion,
        ),
    ).length;

  return {
    writes: writes.sort((a, b) =>
      a.rule.localeCompare(b.rule) ||
      a.scriptId.localeCompare(b.scriptId) ||
      a.executionRegion.localeCompare(b.executionRegion)
    ),
    conflicts: conflicts.sort((a, b) =>
      a.rule.localeCompare(b.rule)
    ),
    naturalMobSpawning,
    scriptSpawnEntityPaths,
    commandSummonPaths,
    manualEntitySpawnPaths:
      scriptSpawnEntityPaths + commandSummonPaths,
    globalRuleWrites: writes.length,
    conflictingGlobalRules:
      conflicts.length,
    arenaLocalWorldRuleWriteCandidates,
  };
}
