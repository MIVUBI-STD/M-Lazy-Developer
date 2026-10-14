import ts from "typescript";
import {
  evaluateSafeConfig,
  type SafeConfigExpression,
  type SafeConfigValue,
} from "../../../../../packages/behavior-model/src/index.js";
import type { SourceRef } from "../../../../../packages/project-model/src/index.js";
import type {
  ScriptMethodCall,
  ScriptSpatialWorldMutation,
} from "../../core/types.js";
import type { ScriptSafeConfigBinding } from "../../config/safe-config-compiler.js";
import {
  compileSafeConfigExpression,
} from "../../config/safe-config-compiler.js";

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".ts")) return ts.ScriptKind.TS;
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

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

function rangeKey(source: SourceRef): string {
  return [
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
    source.range?.lineEnd ?? 0,
    source.range?.columnEnd ?? 0,
  ].join(":");
}

function asVector3(
  value: SafeConfigValue,
): { x: number; y: number; z: number } | undefined {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    return undefined;
  }
  const item = value as Readonly<Record<string, SafeConfigValue>>;
  if (
    typeof item.x !== "number" ||
    !Number.isFinite(item.x) ||
    typeof item.y !== "number" ||
    !Number.isFinite(item.y) ||
    typeof item.z !== "number" ||
    !Number.isFinite(item.z)
  ) {
    return undefined;
  }
  return { x: item.x, y: item.y, z: item.z };
}

function evaluateExpression(
  expression: ts.Expression,
  bindings: Readonly<Record<string, SafeConfigExpression>>,
): SafeConfigValue | undefined {
  const compiled = compileSafeConfigExpression(expression);
  if (!compiled) return undefined;
  try {
    return evaluateSafeConfig(compiled, { bindings });
  } catch {
    return undefined;
  }
}

function blockIdentity(
  expression: ts.Expression | undefined,
): string | undefined {
  if (!expression) return undefined;
  if (
    ts.isStringLiteralLike(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  }
  return undefined;
}

function volumeFromBlockVolumeConstructor(
  expression: ts.Expression,
  bindings: Readonly<Record<string, SafeConfigExpression>>,
):
  | {
      from: { x: number; y: number; z: number };
      to: { x: number; y: number; z: number };
    }
  | undefined {
  if (
    !ts.isNewExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    expression.expression.text !== "BlockVolume" ||
    !expression.arguments ||
    expression.arguments.length !== 2
  ) {
    return undefined;
  }

  const from = asVector3(
    evaluateExpression(expression.arguments[0]!, bindings) ?? null,
  );
  const to = asVector3(
    evaluateExpression(expression.arguments[1]!, bindings) ?? null,
  );
  return from && to ? { from, to } : undefined;
}

function normalizedBounds(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  return {
    min: {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      z: Math.min(a.z, b.z),
    },
    max: {
      x: Math.max(a.x, b.x),
      y: Math.max(a.y, b.y),
      z: Math.max(a.z, b.z),
    },
  };
}

export function deriveScriptSpatialWorldMutations(
  text: string,
  source: SourceRef,
  methodCalls: readonly ScriptMethodCall[],
  safeBindings: readonly ScriptSafeConfigBinding[],
): ScriptSpatialWorldMutation[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const methodsByRange = new Map(
    methodCalls.map((call) => [rangeKey(call.source), call]),
  );
  const bindings = Object.fromEntries(
    safeBindings.map((binding) => [
      binding.name,
      binding.expression,
    ]),
  ) as Readonly<Record<string, SafeConfigExpression>>;

  const output: ScriptSpatialWorldMutation[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const callSource = lineSource(file, node, source);
      const method = methodsByRange.get(rangeKey(callSource));

      if (
        method?.receiverType === "Dimension" &&
        (
          method.method === "setBlockType" ||
          method.method === "setBlockPermutation"
        )
      ) {
        const locationArg = node.arguments[0];
        const point = locationArg
          ? asVector3(
              evaluateExpression(locationArg, bindings) ?? null,
            )
          : undefined;

        output.push({
          method: method.method,
          executionRegion:
            method.executionRegion ?? "module",
          source: callSource,
          ...(point === undefined
            ? {
                status: "unresolved" as const,
                reason:
                  "Block mutation location is outside the deterministic safe-config subset.",
              }
            : {
                status: "resolved" as const,
                volume: normalizedBounds(point, point),
                ...(blockIdentity(node.arguments[1]) === undefined
                  ? {}
                  : {
                      writeIdentity:
                        blockIdentity(node.arguments[1])!,
                    }),
              }),
        });
      }

      if (
        method?.receiverType === "Dimension" &&
        method.method === "fillBlocks"
      ) {
        const volumeArg = node.arguments[0];
        const volume = volumeArg
          ? volumeFromBlockVolumeConstructor(
              volumeArg,
              bindings,
            )
          : undefined;

        output.push({
          method: "fillBlocks",
          executionRegion:
            method.executionRegion ?? "module",
          source: callSource,
          ...(volume === undefined
            ? {
                status: "unresolved" as const,
                reason:
                  "fillBlocks volume is not a deterministic direct BlockVolume(from, to) expression.",
              }
            : {
                status: "resolved" as const,
                volume: normalizedBounds(
                  volume.from,
                  volume.to,
                ),
                ...(blockIdentity(node.arguments[1]) === undefined
                  ? {}
                  : {
                      writeIdentity:
                        blockIdentity(node.arguments[1])!,
                    }),
              }),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output.sort((a, b) =>
    (a.source.range?.lineStart ?? 0) -
      (b.source.range?.lineStart ?? 0) ||
    a.method.localeCompare(b.method)
  );
}
