import ts from "typescript";
import type { SourceRef } from "../../../../packages/project-model/src/index.js";

/** Authored source configuration, NOT evidence of a spawned or completed wave. */
export interface ScriptWaveSpawnRecipe {
  readonly source: SourceRef;
  readonly typeId?: string;
  readonly typeExpression?: string;
  readonly coordinates?: { readonly x: number; readonly y: number; readonly z: number };
  readonly coordinateExpression?: string;
  readonly event?: string;
  readonly eventExpression?: string;
  readonly tag?: string;
}

export interface ScriptAuthoredWave {
  readonly source: SourceRef;
  readonly number: number;
  readonly delaySpawn?: number;
  readonly nextWaveMinMob?: number;
  readonly recipes: readonly ScriptWaveSpawnRecipe[];
  /** True if entries use spreads/expressions we cannot count as recipes. */
  readonly recipeListIncomplete: boolean;
  readonly endCommands: readonly { readonly command: string; readonly delay?: number; readonly source: SourceRef }[];
  readonly endCommandsIncomplete: boolean;
}

export interface ScriptWaveStage {
  readonly source: SourceRef;
  /** Literal authored stage ID, not a presumed globally unique mode. */
  readonly id: string;
  readonly name?: string;
  readonly sourceCollection: "stages" | "levels" | "rounds";
  readonly waves: readonly ScriptAuthoredWave[];
}

/**
 * Inspect direct nested literal stage/wave/spawn CONFIG shape without eval,
 * calling helper functions, inferring entity IDs, or resolving module aliases.
 * A stage must have an authored ID, and at least one wave with literal number
 * and direct spawn array. Labels alone never create a stage or a wave.
 */
export function extractScriptWaveStages(
  file: ts.SourceFile,
  owner: SourceRef,
): ScriptWaveStage[] {
  const source = (node: ts.Node): SourceRef => {
    const first = file.getLineAndCharacterOfPosition(node.getStart(file));
    const last = file.getLineAndCharacterOfPosition(node.getEnd());
    return {
      ...owner,
      range: {
        lineStart: first.line + 1,
        columnStart: first.character + 1,
        lineEnd: last.line + 1,
        columnEnd: last.character + 1,
      },
    };
  };
  const unwrapped = (value: ts.Expression): ts.Expression =>
    ts.isParenthesizedExpression(value) ? unwrapped(value.expression) : value;
  const name = (key: ts.PropertyName): string | undefined =>
    ts.isIdentifier(key) || ts.isStringLiteralLike(key) || ts.isNumericLiteral(key)
      ? key.text : undefined;
  const prop = (object: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined => {
    const matches = object.properties.filter((item): item is ts.PropertyAssignment =>
      ts.isPropertyAssignment(item) && name(item.name) === key);
    return matches.length === 1 ? unwrapped(matches[0]!.initializer) : undefined;
  };
  const scalar = (value: ts.Expression | undefined): string | undefined =>
    value && ts.isStringLiteralLike(value) ? value.text : undefined;
  const number = (value: ts.Expression | undefined): number | undefined => {
    if (!value) return undefined;
    const sign = ts.isPrefixUnaryExpression(value) &&
      (value.operator === ts.SyntaxKind.MinusToken ||
       value.operator === ts.SyntaxKind.PlusToken)
      ? value.operator === ts.SyntaxKind.MinusToken ? -1 : 1 : undefined;
    const literal = sign === undefined ? value : (value as ts.PrefixUnaryExpression).operand;
    if (!ts.isNumericLiteral(literal)) return undefined;
    const result = Number(literal.text) * (sign ?? 1);
    return Number.isFinite(result) ? result : undefined;
  };
  const coordinate = (value: ts.Expression | undefined):
      { x: number; y: number; z: number } | undefined => {
    if (!value) return undefined;
    if (ts.isStringLiteralLike(value)) {
      const parts = value.text.trim().split(/\s+/);
      if (parts.length !== 3) return undefined;
      const n = parts.map(Number);
      return n.every(Number.isFinite) ? { x: n[0]!, y: n[1]!, z: n[2]! } : undefined;
    }
    if (ts.isObjectLiteralExpression(value)) {
      const x = number(prop(value, "x"));
      const y = number(prop(value, "y"));
      const z = number(prop(value, "z"));
      return x === undefined || y === undefined || z === undefined
        ? undefined : { x, y, z };
    }
    return undefined;
  };
  const text = (value: ts.Expression): string =>
    value.getText(file).slice(0, 160);
  const recipes = (arr: ts.ArrayLiteralExpression): {
    entries: ScriptWaveSpawnRecipe[]; incomplete: boolean
  } => {
    const entries: ScriptWaveSpawnRecipe[] = [];
    let incomplete = false;
    for (const item of arr.elements) {
      if (!ts.isObjectLiteralExpression(item)) {
        incomplete = true;
        continue;
      }
      const type = prop(item, "type") ?? prop(item, "typeId");
      const pos = prop(item, "coordinates") ?? prop(item, "position");
      const event = prop(item, "event");
      const tag = prop(item, "tag");
      if (!type || !pos) { incomplete = true; continue; }
      const coords = coordinate(pos);
      entries.push({
        source: source(item),
        ...(scalar(type) ? { typeId: scalar(type)! } :
          { typeExpression: text(type) }),
        ...(coords ? { coordinates: coords } :
          { coordinateExpression: text(pos) }),
        ...(scalar(event) ? { event: scalar(event)! } :
          event ? { eventExpression: text(event) } : {}),
        ...(scalar(tag) ? { tag: scalar(tag)! } : {}),
      });
    }
    return { entries, incomplete };
  };
  const commands = (value: ts.Expression | undefined): {
    entries: { command: string; delay?: number; source: SourceRef }[];
    incomplete: boolean;
  } => {
    if (!value) return { entries: [], incomplete: false };
    if (!ts.isArrayLiteralExpression(value)) return { entries: [], incomplete: true };
    const entries: { command: string; delay?: number; source: SourceRef }[] = [];
    let incomplete = false;
    for (const item of value.elements) {
      if (!ts.isObjectLiteralExpression(item)) { incomplete = true; continue; }
      const command = scalar(prop(item, "command"));
      if (command === undefined) { incomplete = true; continue; }
      const delay = number(prop(item, "delay"));
      entries.push({ command, source: source(item),
        ...(delay === undefined ? {} : { delay }) });
    }
    return { entries, incomplete };
  };
  const output: ScriptWaveStage[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const container of ["stages", "levels", "rounds"] as const) {
        const list = prop(node, container);
        if (!list || !ts.isArrayLiteralExpression(list)) continue;
        for (const item of list.elements) {
          if (!ts.isObjectLiteralExpression(item)) continue;
          const id = scalar(prop(item, "id"));
          if (!id) continue;
          // These are *literal wave recipes*. "mobs" and "waves" are known
          // alternative data-shape names, not a map-specific identifier.
          const wavesExpression = prop(item, "mobs") ?? prop(item, "waves");
          if (!wavesExpression || !ts.isArrayLiteralExpression(wavesExpression)) continue;
          const waves: ScriptAuthoredWave[] = [];
          for (const entry of wavesExpression.elements) {
            if (!ts.isObjectLiteralExpression(entry)) continue;
            const wave = number(prop(entry, "wave"));
            const spawn = prop(entry, "spawn");
            if (wave === undefined || !Number.isSafeInteger(wave) ||
                wave < 1 || !spawn || !ts.isArrayLiteralExpression(spawn)) continue;
            const spawnRecipes = recipes(spawn);
            const end = commands(prop(entry, "end_command"));
            const delay = number(prop(entry, "delay_spawn"));
            const threshold = number(prop(entry, "next_wave_min_mob"));
            waves.push({
              source: source(entry),
              number: wave,
              recipes: spawnRecipes.entries,
              recipeListIncomplete: spawnRecipes.incomplete,
              endCommands: end.entries,
              endCommandsIncomplete: end.incomplete,
              ...(delay === undefined ? {} : { delaySpawn: delay }),
              ...(threshold === undefined ? {} : { nextWaveMinMob: threshold }),
            });
          }
          if (waves.length === 0) continue;
          output.push({
            source: source(item),
            id,
            ...(scalar(prop(item, "name")) ?
              { name: scalar(prop(item, "name"))! } : {}),
            sourceCollection: container,
            waves,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return output.sort((a, b) =>
    a.source.relativePath.localeCompare(b.source.relativePath) ||
    (a.source.range?.lineStart ?? 0) - (b.source.range?.lineStart ?? 0) ||
    (a.source.range?.columnStart ?? 0) - (b.source.range?.columnStart ?? 0));
}
