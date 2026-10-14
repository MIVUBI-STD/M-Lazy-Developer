import ts from "typescript";
import type {
  SafeConfigExpression,
} from "../../../../../packages/behavior-model/src/index.js";
import type {
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";
import {
  compileSafeConfigExpression,
} from "../../config/safe-config-compiler.js";

export type ScriptSpatialMutationKind =
  | "teleport"
  | "try-teleport"
  | "entity-spawn"
  | "structure-place";

export interface ScriptSpatialMutationEvidence {
  kind: ScriptSpatialMutationKind;
  executionRegion: string;
  receiverText: string;
  source: SourceRef;
  position: SafeConfigExpression;
  identifier?: string;
  resultBinding?: string;
}

export interface ScriptSpatialMutationRejection {
  method: string;
  executionRegion: string;
  reason: string;
  source: SourceRef;
}

export interface ScriptSpatialMutationExtraction {
  mutations: readonly ScriptSpatialMutationEvidence[];
  rejected: readonly ScriptSpatialMutationRejection[];
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

function literalString(
  expression: ts.Expression | undefined,
): string | undefined {
  if (
    expression &&
    (
      ts.isStringLiteralLike(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression)
    )
  ) {
    return expression.text;
  }
  return undefined;
}

function expressionAt(
  call: ts.CallExpression,
  index: number,
): SafeConfigExpression | undefined {
  const value = call.arguments[index];
  if (!value) return undefined;
  // Calls can invoke arbitrary runtime logic. A compiled call-shaped
  // expression does not prove that its coordinates are deterministic.
  let runtimeCall = false;
  const inspect = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) runtimeCall = true;
    ts.forEachChild(node, inspect);
  };
  inspect(value);
  return runtimeCall ? undefined : compileSafeConfigExpression(value);
}


function assignedIdentifier(
  call: ts.CallExpression,
): string | undefined {
  const parent = call.parent;
  if (
    ts.isVariableDeclaration(parent) &&
    ts.isIdentifier(parent.name)
  ) {
    return parent.name.text;
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind ===
      ts.SyntaxKind.EqualsToken &&
    ts.isIdentifier(parent.left)
  ) {
    return parent.left.text;
  }
  return undefined;
}

export function deriveScriptSpatialMutations(
  text: string,
  source: SourceRef,
): ScriptSpatialMutationExtraction {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const mutations: ScriptSpatialMutationEvidence[] = [];
  const rejected: ScriptSpatialMutationRejection[] = [];

  const reject = (
    call: ts.CallExpression,
    method: string,
    reason: string,
  ) => {
    rejected.push({
      method,
      executionRegion: executionRegion(call, file),
      reason,
      source: nodeSource(file, call, source),
    });
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      const receiverText =
        node.expression.expression.getText(file);
      const region = executionRegion(node, file);
      const sourceRef = nodeSource(file, node, source);

      if (method === "teleport" || method === "tryTeleport") {
        const position = expressionAt(node, 0);
        if (!position) {
          reject(
            node,
            method,
            "Teleport destination is outside the deterministic safe-config subset.",
          );
        } else {
          mutations.push({
            kind: method === "tryTeleport" ? "try-teleport" : "teleport",
            executionRegion: region,
            receiverText,
            source: sourceRef,
            position,
            ...(node.arguments[1]?.getText(file).match(/dimension\s*:\s*([^,}]+)/)?.[1] === undefined
              ? {}
              : { dimensionExpression: node.arguments[1]!.getText(file).match(/dimension\s*:\s*([^,}]+)/)![1]!.trim() }),
            ...(node.arguments[1]?.getText(file).match(/checkForBlocks\s*:\s*(true|false)/)?.[1] === undefined
              ? {}
              : { checkForBlocks: node.arguments[1]!.getText(file).match(/checkForBlocks\s*:\s*(true|false)/)![1] === "true" }),
            ...(method !== "tryTeleport" || assignedIdentifier(node) === undefined
              ? {}
              : { resultBinding: assignedIdentifier(node)! }),
          });
        }
      }

      if (method === "spawnEntity") {
        const position = expressionAt(node, 1);
        const identifier = literalString(
          node.arguments[0],
        );
        if (!position) {
          reject(
            node,
            method,
            "spawnEntity position is outside the deterministic safe-config subset.",
          );
        } else {
          mutations.push({
            kind: "entity-spawn",
            executionRegion: region,
            receiverText,
            source: sourceRef,
            position,
            ...(identifier === undefined
              ? {}
              : { identifier }),
            ...(assignedIdentifier(node) === undefined
              ? {}
              : { resultBinding: assignedIdentifier(node)! }),
          });
        }
      }

      if (
        method === "place" &&
        /structureManager/i.test(receiverText)
      ) {
        const position = expressionAt(node, 2);
        const identifier = literalString(
          node.arguments[0],
        );
        if (!position) {
          reject(
            node,
            method,
            "Structure placement destination is outside the deterministic safe-config subset.",
          );
        } else {
          mutations.push({
            kind: "structure-place",
            executionRegion: region,
            receiverText,
            source: sourceRef,
            position,
            ...(identifier === undefined
              ? {}
              : { identifier }),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);
  return {
    mutations,
    rejected,
  };
}
