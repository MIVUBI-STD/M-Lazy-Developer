import ts from "typescript";
import { directStatementSequence } from "../../core/statement-sequence.js";
import type { ScriptSequentialPathEvidence } from "../../core/statement-sequence.js";
import type {
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";

/** Exact authored reset-like write to one literal dynamic-property key.
 * Neither a successful reset nor a round/match lifetime guarantee. */
export interface PersistentPropertyResetSite {
  propertyKey: string;
  receiverHint: string;
  executionRegion: string;
  kind: "undefined-removal" | "empty-value-write";
  source: SourceRef;
  /** Only standalone calls directly enclosed by a lexical statement block. */
  sequentialBlockSource?: SourceRef;
  sequentialPathEvidence?: ScriptSequentialPathEvidence;
}

export interface PersistentDataLifecycleEvidence {
  propertyKey: string;
  variable: string;
  reads: number;
  appends: number;
  writes: number;
  clears: number;
  growth: "append-without-clear" | "append-with-clear" | "no-append" | "unknown";
  /** Source sites only, not proof of execution or resource lifetime. */
  resetSites?: readonly PersistentPropertyResetSite[];
  source: SourceRef;
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function nodeSource(
  file: ts.SourceFile,
  node: ts.Node,
  source: SourceRef,
): SourceRef {
  const start = file.getLineAndCharacterOfPosition(node.getStart(file));
  const end = file.getLineAndCharacterOfPosition(node.getEnd());
  return {
    ...source,
    range: {
      lineStart: start.line + 1,
      lineEnd: end.line + 1,
      columnStart: start.character + 1,
      columnEnd: end.character + 1,
    },
  };
}

function dynamicPropertyKey(
  node: ts.Node,
  method: "getDynamicProperty" | "setDynamicProperty",
): string | undefined {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== method
  ) {
    return undefined;
  }
  const key = node.arguments[0];
  return key && ts.isStringLiteralLike(key) ? key.text : undefined;
}

function containsDynamicPropertyRead(
  node: ts.Node,
): string | undefined {
  let found: string | undefined;
  const visit = (current: ts.Node): void => {
    found ??= dynamicPropertyKey(current, "getDynamicProperty");
    if (!found) ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function isClearValue(
  expression: ts.Expression | undefined,
): boolean {
  if (!expression) return true;
  if (
    expression.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(expression) && expression.text === "undefined")
  ) return true;
  if (ts.isStringLiteralLike(expression)) {
    const text = expression.text.trim();
    return text === "" || text === "[]" || text === "{}";
  }
  return false;
}

export function derivePersistentDataLifecycleEvidence(
  text: string,
  source: SourceRef,
): PersistentDataLifecycleEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const variableToKey = new Map<string, string>();
  const firstSource = new Map<string, SourceRef>();
  const stats = new Map<
    string,
    { variable: string; reads: number; appends: number; writes: number;
      clears: number; resetSites: PersistentPropertyResetSite[] }
  >();

  const ensure = (key: string, variable: string, node: ts.Node) => {
    const current = stats.get(key);
    if (current) return current;
    const created = { variable, reads: 0, appends: 0, writes: 0,
      clears: 0, resetSites: [] as PersistentPropertyResetSite[] };
    stats.set(key, created);
    firstSource.set(key, nodeSource(file, node, source));
    return created;
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const key = containsDynamicPropertyRead(node.initializer);
      if (key) {
        variableToKey.set(node.name.text, key);
        ensure(key, node.name.text, node).reads += 1;
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "push" &&
      ts.isIdentifier(node.expression.expression)
    ) {
      const variable = node.expression.expression.text;
      const key = variableToKey.get(variable);
      if (key) ensure(key, variable, node).appends += 1;
    }

    const writtenKey = dynamicPropertyKey(node, "setDynamicProperty");
    if (writtenKey && ts.isCallExpression(node)) {
      const value = node.arguments[1];
      const matchedVariable = [...variableToKey.entries()].find(
        ([variable, key]) =>
          key === writtenKey &&
          value?.getText(file).includes(variable),
      )?.[0] ?? "$unknown";
      const current = ensure(writtenKey, matchedVariable, node);
      if (isClearValue(value)) {
        current.clears += 1;
        // A broad clearDynamicProperties() has no literal key and must NOT
        // be silently attributed to an individual property.
        const sequence = directStatementSequence(
          node, ts.isPropertyAccessExpression(node.expression)
            ? node.expression.expression.getText(file) : "$unknown", file, source,
        );
        current.resetSites.push({
          propertyKey: writtenKey,
          receiverHint: ts.isPropertyAccessExpression(node.expression)
            ? node.expression.expression.getText(file) : "$unknown",
          executionRegion: persistenceExecutionRegion(node, file),
          kind: value === undefined ||
              (ts.isIdentifier(value) && value.text === "undefined")
            ? "undefined-removal"
            : "empty-value-write",
          source: nodeSource(file, node, source),
          ...(sequence ? {
            sequentialBlockSource: sequence.blockSource,
            sequentialPathEvidence: sequence,
          } : {}),
        });
      } else {
        current.writes += 1;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return [...stats.entries()]
    .map(([propertyKey, item]) => ({
      propertyKey,
      variable: item.variable,
      reads: item.reads,
      appends: item.appends,
      writes: item.writes,
      clears: item.clears,
      growth: (
        item.appends === 0
          ? "no-append"
          : item.writes === 0
            ? "unknown"
            : item.clears > 0
              ? "append-with-clear"
              : "append-without-clear") as PersistentDataLifecycleEvidence["growth"],
      source: firstSource.get(propertyKey)!,
      ...(item.resetSites.length > 0 ? {
        resetSites: item.resetSites.sort((a, b) =>
          (a.source.range?.lineStart ?? 0) - (b.source.range?.lineStart ?? 0) ||
          (a.source.range?.columnStart ?? 0) - (b.source.range?.columnStart ?? 0)),
      } : {}),
    }))
    .sort((a, b) => a.propertyKey.localeCompare(b.propertyKey));
}


export type ResultAuditRecordSemanticField =
  | "arena-generation"
  | "result-id"
  | "terminal-reason"
  | "participant-snapshot-or-revision"
  | "objective-evidence"
  | "commit-tick"
  | "reward-operation-id"
  | "side";

export interface ScriptResultAuditRecordEvidence {
  readonly propertyKey: string;
  readonly executionRegion: string;
  readonly fields: readonly string[];
  readonly semanticFields:
    readonly ResultAuditRecordSemanticField[];
  readonly missingRequiredFields:
    readonly ResultAuditRecordSemanticField[];
  readonly status: "complete" | "partial";
  readonly source: SourceRef;
}

const RESULT_RECORD_KEY =
  /(?:result|audit|journal)/i;

const RESULT_FIELD_ALIASES: Readonly<
  Record<
    Exclude<
      ResultAuditRecordSemanticField,
      "side"
    >,
    readonly RegExp[]
  >
> = {
  "arena-generation": [
    /^(?:arena)?generation(?:id)?$/i,
  ],
  "result-id": [
    /^result(?:id|token|operationid)?$/i,
  ],
  "terminal-reason": [
    /^(?:terminal|result|outcome)?reason$/i,
  ],
  "participant-snapshot-or-revision": [
    /^(?:participants?|participantids?|participantrevision|roster|members?)$/i,
  ],
  "objective-evidence": [
    /^(?:objective|objectiveevidence|score|resultevidence)$/i,
  ],
  "commit-tick": [
    /^(?:committick|committedattick|tick)$/i,
  ],
  "reward-operation-id": [
    /^(?:rewardoperationid|rewardop|rewardid)$/i,
  ],
};

function persistenceExecutionRegion(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  let current: ts.Node | undefined =
    node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) &&
      current.name
    ) {
      return "function:" +
        current.name.text;
    }
    if (ts.isMethodDeclaration(current)) {
      const name = current.name;
      if (
        ts.isIdentifier(name) ||
        ts.isStringLiteralLike(name)
      ) {
        return "function:" + name.text;
      }
    }
    if (
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current)
    ) {
      const start =
        file.getLineAndCharacterOfPosition(
          current.getStart(file),
        );
      return (
        "callback@" +
        (start.line + 1) +
        ":" +
        (start.character + 1)
      );
    }
    current = current.parent;
  }
  return "module";
}

function objectFieldNames(
  expression: ts.Expression | undefined,
  objects: ReadonlyMap<
    string,
    ts.ObjectLiteralExpression
  >,
): string[] | undefined {
  if (!expression) return undefined;

  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(
      expression.expression,
    ) &&
    expression.expression.expression.getText() ===
      "JSON" &&
    expression.expression.name.text ===
      "stringify"
  ) {
    return objectFieldNames(
      expression.arguments[0],
      objects,
    );
  }

  if (ts.isIdentifier(expression)) {
    const resolved =
      objects.get(expression.text);
    return resolved
      ? objectFieldNames(
          resolved,
          objects,
        )
      : undefined;
  }

  if (!ts.isObjectLiteralExpression(expression)) {
    return undefined;
  }

  return expression.properties
    .flatMap((property) => {
      if (
        !ts.isPropertyAssignment(property) &&
        !ts.isShorthandPropertyAssignment(
          property,
        )
      ) {
        return [];
      }
      const name =
        ts.isShorthandPropertyAssignment(
          property,
        )
          ? property.name.text
          : property.name &&
              (
                ts.isIdentifier(
                  property.name,
                ) ||
                ts.isStringLiteralLike(
                  property.name,
                )
              )
            ? property.name.text
            : undefined;
      return name ? [name] : [];
    })
    .sort();
}

function semanticResultFields(
  fields: readonly string[],
): ResultAuditRecordSemanticField[] {
  const output =
    new Set<ResultAuditRecordSemanticField>();
  for (const field of fields) {
    const normalized =
      field.replace(/[^A-Za-z0-9]/g, "");
    for (
      const [semantic, patterns] of
        Object.entries(
          RESULT_FIELD_ALIASES,
        ) as [
          Exclude<
            ResultAuditRecordSemanticField,
            "side"
          >,
          readonly RegExp[],
        ][]
    ) {
      if (
        patterns.some((pattern) =>
          pattern.test(normalized)
        )
      ) {
        output.add(semantic);
      }
    }
    if (
      /^(?:winner|winningSide|winnerId|loser|losingSide|teamId)$/i.test(
        normalized,
      )
    ) {
      output.add("side");
    }
  }
  return [...output].sort();
}

const REQUIRED_RESULT_FIELDS:
  readonly Exclude<
    ResultAuditRecordSemanticField,
    "side"
  >[] = [
    "arena-generation",
    "result-id",
    "terminal-reason",
    "participant-snapshot-or-revision",
    "objective-evidence",
    "commit-tick",
    "reward-operation-id",
  ];

export function deriveResultAuditRecordEvidence(
  text: string,
  source: SourceRef,
): ScriptResultAuditRecordEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const objects =
    new Map<
      string,
      ts.ObjectLiteralExpression
    >();

  const collect = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isObjectLiteralExpression(
        node.initializer,
      )
    ) {
      objects.set(
        node.name.text,
        node.initializer,
      );
    }
    ts.forEachChild(node, collect);
  };
  collect(file);

  const output:
    ScriptResultAuditRecordEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      ) &&
      node.expression.name.text ===
        "setDynamicProperty"
    ) {
      const key = node.arguments[0];
      const propertyKey =
        key &&
        ts.isStringLiteralLike(key)
          ? key.text
          : undefined;
      if (
        propertyKey &&
        RESULT_RECORD_KEY.test(
          propertyKey,
        )
      ) {
        const fields =
          objectFieldNames(
            node.arguments[1],
            objects,
          );
        if (fields) {
          const semanticFields =
            semanticResultFields(fields);
          const missingRequiredFields =
            REQUIRED_RESULT_FIELDS
              .filter(
                (field) =>
                  !semanticFields.includes(
                    field,
                  ),
              );
          output.push({
            propertyKey,
            executionRegion:
              persistenceExecutionRegion(
                node,
                file,
              ),
            fields,
            semanticFields,
            missingRequiredFields,
            status:
              missingRequiredFields.length === 0
                ? "complete"
                : "partial",
            source:
              nodeSource(
                file,
                node,
                source,
              ),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  return output.sort((a, b) =>
    a.propertyKey.localeCompare(
      b.propertyKey,
    ) ||
    a.executionRegion.localeCompare(
      b.executionRegion,
    )
  );
}
