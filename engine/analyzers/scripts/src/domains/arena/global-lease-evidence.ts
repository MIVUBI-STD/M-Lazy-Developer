import ts from "typescript";
import type {
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";

export type ScriptGlobalLeaseOperation =
  | "acquire"
  | "release"
  | "restore"
  | "audit";

export interface ScriptGlobalLeaseEvidence {
  operation: ScriptGlobalLeaseOperation;
  resource?: string;
  executionRegion: string;
  source: SourceRef;
}

const ACQUIRE = new Set([
  "acquireGlobalLease",
  "acquireWorldLease",
  "requestGlobalLease",
  "requestWorldSettingLease",
]);
const RELEASE = new Set([
  "releaseGlobalLease",
  "releaseWorldLease",
  "releaseWorldSettingLease",
]);
const RESTORE = new Set([
  "restoreGlobalLease",
  "restoreWorldLease",
  "restoreWorldSettingLease",
  "compareAndSwapGlobalLease",
  "compareAndSwapWorldLease",
]);
const AUDIT = new Set([
  "auditGlobalMutation",
  "auditGlobalLease",
  "recordGlobalMutation",
  "recordGlobalLeaseMutation",
]);

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
  const start =
    file.getLineAndCharacterOfPosition(
      node.getStart(file),
    );
  const end =
    file.getLineAndCharacterOfPosition(
      node.getEnd(),
    );
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

function executionRegion(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) &&
      current.name
    ) {
      return "function:" + current.name.text;
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

function literalResource(
  expression: ts.Expression | undefined,
): string | undefined {
  if (
    expression &&
    (
      ts.isStringLiteralLike(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression)
    )
  ) {
    return expression.text.trim();
  }
  return undefined;
}

function operationFor(
  method: string,
): ScriptGlobalLeaseOperation | undefined {
  if (ACQUIRE.has(method)) return "acquire";
  if (RELEASE.has(method)) return "release";
  if (RESTORE.has(method)) return "restore";
  if (AUDIT.has(method)) return "audit";
  return undefined;
}

export function deriveScriptGlobalLeaseEvidence(
  text: string,
  source: SourceRef,
): ScriptGlobalLeaseEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output: ScriptGlobalLeaseEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const method =
        ts.isIdentifier(node.expression)
          ? node.expression.text
          : ts.isPropertyAccessExpression(
              node.expression,
            )
            ? node.expression.name.text
            : undefined;
      if (method) {
        const operation =
          operationFor(method);
        if (operation) {
          const resource = literalResource(node.arguments[0]);
          output.push({
            operation,
            ...(resource === undefined ? {} : { resource }),
            executionRegion:
              executionRegion(node, file),
            source:
              nodeSource(file, node, source),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(file);
  return output.sort((a, b) =>
    a.executionRegion.localeCompare(
      b.executionRegion,
    ) ||
    a.operation.localeCompare(
      b.operation,
    ) ||
    (a.resource ?? "").localeCompare(
      b.resource ?? "",
    )
  );
}
