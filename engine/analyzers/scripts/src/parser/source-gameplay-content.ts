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


/**
 * Content catalogs are a different authored shape than nested wave recipes.
 * Recognize bounded id/name pairs with one matching semantic namespace.
 * A catalog entry is NOT evidence that a player can select or complete it.
 */
export interface ScriptAuthoredGameplayEntry {
  readonly source: SourceRef;
  readonly kind: "gameplay" | "mode" | "challenge";
  readonly id: string;
  readonly name: string;
  readonly number?: number;
}

export function extractScriptGameplayCatalog(
  file: ts.SourceFile,
  owner: SourceRef,
): ScriptAuthoredGameplayEntry[] {
  const fields = [
    { kind: "gameplay", id: "gameplayId", name: "gameplayName", number: "gameplayNumber" },
    { kind: "mode", id: "modeId", name: "modeName", number: "modeNumber" },
    { kind: "challenge", id: "challengeId", name: "challengeName", number: "challengeNumber" },
  ] as const;
  const keyName = (key: ts.PropertyName): string | undefined =>
    ts.isIdentifier(key) || ts.isStringLiteralLike(key)
      ? key.text : undefined;
  const uniqueProperty = (node: ts.ObjectLiteralExpression, key: string):
    ts.Expression | undefined => {
    const found = node.properties.filter((property):
      property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && keyName(property.name) === key);
    return found.length === 1 ? found[0]!.initializer : undefined;
  };
  const literal = (value?: ts.Expression): string | undefined =>
    value && ts.isStringLiteralLike(value) ? value.text.trim() || undefined
      : undefined;
  const numberLiteral = (value?: ts.Expression): number | undefined =>
    value && ts.isNumericLiteral(value) && Number.isSafeInteger(Number(value.text)) &&
      Number(value.text) > 0 ? Number(value.text) : undefined;
  const source = (node: ts.Node): SourceRef => {
    const start = file.getLineAndCharacterOfPosition(node.getStart(file));
    const end = file.getLineAndCharacterOfPosition(node.getEnd());
    return { ...owner, range: {
      lineStart: start.line + 1, columnStart: start.character + 1,
      lineEnd: end.line + 1, columnEnd: end.character + 1,
    } };
  };
  const found: ScriptAuthoredGameplayEntry[] = [];
  const walk = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const fieldsForKind of fields) {
        const id = literal(uniqueProperty(node, fieldsForKind.id));
        const displayName = literal(uniqueProperty(node, fieldsForKind.name));
        if (!id || !displayName) continue;
        const ordinal = numberLiteral(uniqueProperty(node, fieldsForKind.number));
        found.push({
          source: source(node), kind: fieldsForKind.kind,
          id, name: displayName,
          ...(ordinal === undefined ? {} : { number: ordinal }),
        });
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(file);

  // Compiled bundles may repeat one named mode in both catalog and UI
  // projection. Prefer an exact numbered definition over an unnumbered
  // duplicate *within one selected source*. Do not join different packs,
  // different IDs, or contradictory numbered declarations by guesswork.
  const groups = new Map<string, ScriptAuthoredGameplayEntry[]>();
  for (const item of found) {
    const key = [item.source.artifactId, item.source.relativePath,
      item.kind, item.id, item.name].join("\u0000");
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const result: ScriptAuthoredGameplayEntry[] = [];
  for (const entries of groups.values()) {
    const numbered = entries.filter(entry => entry.number !== undefined);
    if (numbered.length) {
      const uniqueOrdinals = new Set(numbered.map(entry => entry.number));
      for (const ordinal of uniqueOrdinals) {
        result.push(numbered.find(entry => entry.number === ordinal)!);
      }
    } else {
      result.push(entries[0]!);
    }
  }
  return result.sort((a, b) =>
    a.source.relativePath.localeCompare(b.source.relativePath) ||
    (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) ||
    a.id.localeCompare(b.id) ||
    (a.source.range?.lineStart ?? 0) - (b.source.range?.lineStart ?? 0));
}


/**
 * Direct authored content choices for build/guess, quiz, puzzle or similar
 * mechanics. Classify the *shape*, not a map title or assumed game genre.
 *
 * Both a visible string and an independently authored category/difficulty
 * string must occur on at least two sibling records in the same literal
 * array. UI strings alone, a dynamic expression and a bare word list cannot
 * establish a gameplay content collection.
 */
export interface ScriptAuthoredContentChoice {
  readonly source: SourceRef;
  readonly text: string;
  readonly classification: string;
}

export interface ScriptAuthoredContentCollection {
  readonly source: SourceRef;
  readonly name: string;
  readonly textField: "prompt" | "word" | "text" | "label";
  readonly classificationField: "difficulty" | "tier" | "category";
  readonly entries: readonly ScriptAuthoredContentChoice[];
  readonly incomplete: boolean;
  /** Only a directly exported const can be referenced by an exact named import. */
  readonly exported: boolean;
}

export function extractScriptContentCollections(
  file: ts.SourceFile,
  owner: SourceRef,
): ScriptAuthoredContentCollection[] {
  const textFields = ["prompt", "word", "text", "label"] as const;
  const classificationFields = ["difficulty", "tier", "category"] as const;

  const source = (node: ts.Node): SourceRef => {
    const start = file.getLineAndCharacterOfPosition(node.getStart(file));
    const end = file.getLineAndCharacterOfPosition(node.getEnd());
    return {
      ...owner,
      range: {
        lineStart: start.line + 1,
        columnStart: start.character + 1,
        lineEnd: end.line + 1,
        columnEnd: end.character + 1,
      },
    };
  };
  const keyName = (node: ts.PropertyName): string | undefined =>
    ts.isIdentifier(node) || ts.isStringLiteralLike(node)
      ? node.text : undefined;
  const property = (node: ts.ObjectLiteralExpression, key: string):
    ts.Expression | undefined => {
    const matches = node.properties.filter((p):
      p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && keyName(p.name) === key);
    return matches.length === 1 ? matches[0]!.initializer : undefined;
  };
  const literal = (expr: ts.Expression | undefined): string | undefined =>
    expr && ts.isStringLiteralLike(expr) && expr.text.trim()
      ? expr.text.trim() : undefined;
  const output: ScriptAuthoredContentCollection[] = [];
  const scan = (node: ts.Node): void => {
    if (ts.isArrayLiteralExpression(node)) {
      const parent = node.parent;
      const name = ts.isVariableDeclaration(parent) &&
        ts.isIdentifier(parent.name) && parent.initializer === node
        ? parent.name.text
        : ts.isPropertyAssignment(parent) && parent.initializer === node
          ? keyName(parent.name) : undefined;
      const objects = node.elements.filter(ts.isObjectLiteralExpression);
      if (name && objects.length >= 2) {
        // Choose one common explicit field pair. Do not infer intent from
        // collection name (GuessText, quiz, levels, etc.) or one item alone.
        const pair = textFields.flatMap(textField =>
          classificationFields.map(classificationField =>
            ({ textField, classificationField }))).find(pair =>
          objects.filter(item =>
            literal(property(item, pair.textField)) !== undefined &&
            literal(property(item, pair.classificationField)) !== undefined)
            .length >= 2);
        if (pair !== undefined) {
          const supported = objects.filter(item =>
            literal(property(item, pair.textField)) !== undefined &&
            literal(property(item, pair.classificationField)) !== undefined);
          const statement = ts.isVariableDeclaration(parent) &&
            ts.isVariableDeclarationList(parent.parent) &&
            ts.isVariableStatement(parent.parent.parent)
              ? parent.parent.parent : undefined;
          const exported = statement?.modifiers?.some(modifier =>
            modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
          const immutable = statement !== undefined &&
            !!(statement.declarationList.flags & ts.NodeFlags.Const);
          output.push({
            name,
            source: source(node),
            exported: exported && immutable,
            textField: pair.textField,
            classificationField: pair.classificationField,
            entries: supported.map(item => ({
              source: source(item),
              text: literal(property(item, pair.textField))!,
              classification: literal(
                property(item, pair.classificationField))!,
            })),
            incomplete: supported.length !== node.elements.length ||
              objects.some(item => item.properties.some(prop =>
                ts.isSpreadAssignment(prop))),
          });
        }
      }
    }
    ts.forEachChild(node, scan);
  };
  scan(file);
  return output.sort((a,b) =>
    a.source.relativePath.localeCompare(b.source.relativePath) ||
    (a.source.range?.lineStart ?? 0) -
      (b.source.range?.lineStart ?? 0) ||
    (a.source.range?.columnStart ?? 0) -
      (b.source.range?.columnStart ?? 0));
}


/**
 * Literal, statically-bound reads of named ESM collection imports. These
 * source sites can later be joined to an actual exported collection through
 * the existing unique same-artifact/same-pack import resolver.
 *
 * A method call proves source reference, NOT that a round selected the pool
 * or that Minecraft executed the call.
 */
export interface ScriptContentUseSite {
  readonly source: SourceRef;
  readonly module: string;
  readonly importedName: string;
  readonly localName: string;
  readonly method: "filter" | "find" | "map" | "some" | "every" | "forEach";
  readonly executionRegion: string;
}

export function extractScriptContentUseSites(
  file: ts.SourceFile,
  owner: SourceRef,
): ScriptContentUseSite[] {
  const source = (node: ts.Node): SourceRef => {
    const start = file.getLineAndCharacterOfPosition(node.getStart(file));
    const end = file.getLineAndCharacterOfPosition(node.getEnd());
    return { ...owner, range: {
      lineStart: start.line + 1, columnStart: start.character + 1,
      lineEnd: end.line + 1, columnEnd: end.character + 1,
    }};
  };
  const bindings = new Map<string, {module: string; importedName: string}[]>();
  for (const declaration of file.statements) {
    if (!ts.isImportDeclaration(declaration) ||
        !ts.isStringLiteralLike(declaration.moduleSpecifier) ||
        !declaration.moduleSpecifier.text.startsWith(".")) continue;
    const symbols = declaration.importClause?.namedBindings;
    if (!symbols || !ts.isNamedImports(symbols) ||
        declaration.importClause?.isTypeOnly) continue;
    for (const specifier of symbols.elements) {
      if (specifier.isTypeOnly) continue;
      const local = specifier.name.text;
      const records = bindings.get(local) ?? [];
      records.push({module: declaration.moduleSpecifier.text,
        importedName: specifier.propertyName?.text ?? local});
      bindings.set(local, records);
    }
  }
  if (bindings.size === 0) return [];

  const nameBound = (binding: ts.BindingName, name: string): boolean =>
    ts.isIdentifier(binding) ? binding.text === name
      : binding.elements.some(item =>
        ts.isBindingElement(item) && nameBound(item.name, name));

  const shadowed = (at: ts.Node, name: string): boolean => {
    for (let parent = at.parent; parent && parent !== file;
      parent = parent.parent) {
      if (ts.isFunctionLike(parent) &&
          parent.parameters.some(param => nameBound(param.name, name))) {
        return true;
      }
      if (ts.isCatchClause(parent) &&
          parent.variableDeclaration &&
          nameBound(parent.variableDeclaration.name, name)) return true;
      if (ts.isBlock(parent)) {
        for (const statement of parent.statements) {
          if (ts.isVariableStatement(statement) &&
              statement.declarationList.declarations.some(
                decl => nameBound(decl.name, name))) return true;
        }
      }
    }
    // Another top-level declaration of the same name makes ownership
    // ambiguous even if invalid/accepted by a permissive parser.
    return file.statements.some(statement =>
      (ts.isFunctionDeclaration(statement) && statement.name?.text === name) ||
      (ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          decl => nameBound(decl.name, name))));
  };

  const region = (at: ts.Node): string => {
    for (let parent = at.parent; parent; parent = parent.parent) {
      if (ts.isMethodDeclaration(parent)) {
        const methodName = parent.name.getText(file);
        const classOwner = ts.isClassDeclaration(parent.parent)
          ? parent.parent.name?.text : undefined;
        return "method:" + (classOwner ? classOwner + "." : "") + methodName;
      }
      if (ts.isFunctionDeclaration(parent) && parent.name) {
        return "function:" + parent.name.text;
      }
    }
    return "module";
  };
  const allowed = new Set(["filter", "find", "map", "some", "every", "forEach"]);
  const output: ScriptContentUseSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        allowed.has(node.expression.name.text)) {
      const local = node.expression.expression.text;
      const records = bindings.get(local);
      if (records?.length === 1 && !shadowed(node, local)) {
        output.push({
          source: source(node.expression),
          module: records[0]!.module,
          importedName: records[0]!.importedName,
          localName: local,
          method: node.expression.name.text as ScriptContentUseSite["method"],
          executionRegion: region(node),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return output.sort((a,b) =>
    a.source.relativePath.localeCompare(b.source.relativePath) ||
    (a.source.range?.lineStart ?? 0) - (b.source.range?.lineStart ?? 0) ||
    (a.source.range?.columnStart ?? 0) - (b.source.range?.columnStart ?? 0));
}
