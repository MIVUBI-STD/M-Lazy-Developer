import ts from "typescript";
import type { SourceRef } from "../../../../../packages/project-model/src/index.js";

export type BlockCustomComponentCallback =
  | "onTick"
  | "onRandomTick"
  | "onRedstoneUpdate"
  | "onStepOn"
  | "onStepOff";

export interface BlockCustomComponentRegistrationEvidence {
  componentId: string;
  callbacks: readonly BlockCustomComponentCallback[];
  source: SourceRef;
}

const CALLBACKS = new Set<BlockCustomComponentCallback>([
  "onTick",
  "onRandomTick",
  "onRedstoneUpdate",
  "onStepOn",
  "onStepOff",
]);

function lineSource(
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

function memberName(node: ts.PropertyName): string | undefined {
  return ts.isIdentifier(node) || ts.isStringLiteralLike(node)
    ? node.text
    : undefined;
}

function registeredCallbacks(
  expression: ts.Expression,
): readonly BlockCustomComponentCallback[] {
  if (!ts.isObjectLiteralExpression(expression)) return [];
  const callbacks = new Set<BlockCustomComponentCallback>();

  for (const property of expression.properties) {
    if (
      !ts.isMethodDeclaration(property) &&
      !ts.isPropertyAssignment(property)
    ) {
      continue;
    }
    const name = memberName(property.name);
    if (name && CALLBACKS.has(name as BlockCustomComponentCallback)) {
      callbacks.add(name as BlockCustomComponentCallback);
    }
  }

  return [...callbacks].sort();
}

export function deriveBlockCustomComponentRegistrations(
  text: string,
  source: SourceRef,
): BlockCustomComponentRegistrationEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    source.relativePath.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const output: BlockCustomComponentRegistrationEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "registerCustomComponent"
    ) {
      const id = node.arguments[0];
      const implementation = node.arguments[1];
      if (
        id &&
        ts.isStringLiteralLike(id) &&
        implementation
      ) {
        output.push({
          componentId: id.text,
          callbacks: registeredCallbacks(implementation),
          source: lineSource(file, node, source),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(file);
  return output.sort((a, b) => a.componentId.localeCompare(b.componentId));
}
