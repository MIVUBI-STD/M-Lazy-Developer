export type SafeConfigScalar = string | number | boolean | null;
export type SafeConfigValue =
  | SafeConfigScalar
  | readonly SafeConfigValue[]
  | { readonly [key: string]: SafeConfigValue };

export type SafeConfigExpression =
  | { kind: "literal"; value: SafeConfigValue }
  | { kind: "ref"; name: string }
  | { kind: "array"; items: readonly SafeConfigExpression[] }
  | {
      kind: "array-compose";
      parts: readonly {
        expression: SafeConfigExpression;
        spread: boolean;
      }[];
    }
  | {
      kind: "object";
      entries: Readonly<Record<string, SafeConfigExpression>>;
    }
  | {
      kind: "object-merge";
      parts: readonly SafeConfigExpression[];
    }
  | {
      kind: "binary";
      operator: "+" | "-" | "*" | "/";
      left: SafeConfigExpression;
      right: SafeConfigExpression;
    }
  | {
      kind: "compare";
      operator:
        | "=="
        | "==="
        | "!="
        | "!=="
        | "<"
        | "<="
        | ">"
        | ">=";
      left: SafeConfigExpression;
      right: SafeConfigExpression;
    }
  | {
      kind: "logical";
      operator: "&&" | "||" | "??";
      left: SafeConfigExpression;
      right: SafeConfigExpression;
    }
  | {
      kind: "conditional";
      condition: SafeConfigExpression;
      whenTrue: SafeConfigExpression;
      whenFalse: SafeConfigExpression;
    }
  | {
      kind: "get";
      object: SafeConfigExpression;
      key: string;
    }
  | {
      kind: "intrinsic";
      name: "translate3";
      args: readonly SafeConfigExpression[];
    }
  | {
      kind: "map";
      source: SafeConfigExpression;
      itemName: string;
      indexName?: string;
      body: SafeConfigExpression;
    }
  | {
      kind: "array-from";
      length: SafeConfigExpression;
      indexName: string;
      body: SafeConfigExpression;
    }
  | {
      kind: "call";
      name: string;
      args: readonly SafeConfigExpression[];
    };

export interface SafeConfigFunction {
  params: readonly string[];
  body: SafeConfigExpression;
}

export interface SafeConfigEnvironment {
  bindings: Readonly<Record<string, SafeConfigExpression>>;
  functions?: Readonly<Record<string, SafeConfigFunction>>;
}

export interface SafeConfigEvaluationOptions {
  maxDepth?: number;
  maxNodes?: number;
  maxCollectionItems?: number;
}

export class SafeConfigEvaluationError extends Error {
  constructor(
    readonly code:
      | "UNKNOWN_REFERENCE"
      | "REFERENCE_CYCLE"
      | "DEPTH_LIMIT"
      | "NODE_LIMIT"
      | "TYPE_MISMATCH"
      | "INVALID_OPERATION"
      | "UNKNOWN_FUNCTION"
      | "FUNCTION_CYCLE"
      | "COLLECTION_LIMIT",
    message: string,
  ) {
    super(message);
  }
}

function asNumber(value: SafeConfigValue, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SafeConfigEvaluationError(
      "TYPE_MISMATCH",
      `${context} requires a finite number.`,
    );
  }
  return value;
}

function asObject(
  value: SafeConfigValue,
  context: string,
): { readonly [key: string]: SafeConfigValue } {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    throw new SafeConfigEvaluationError(
      "TYPE_MISMATCH",
      `${context} requires an object.`,
    );
  }
  return value as { readonly [key: string]: SafeConfigValue };
}

export function evaluateSafeConfig(
  expression: SafeConfigExpression,
  environment: SafeConfigEnvironment = { bindings: {} },
  options: SafeConfigEvaluationOptions = {},
): SafeConfigValue {
  const maxDepth = options.maxDepth ?? 64;
  const maxNodes = options.maxNodes ?? 10_000;
  const maxCollectionItems =
    options.maxCollectionItems ?? 4096;
  let nodes = 0;
  const resolving = new Set<string>();
  const calling = new Set<string>();

  const evaluate = (
    node: SafeConfigExpression,
    depth: number,
    activeEnvironment: SafeConfigEnvironment = environment,
  ): SafeConfigValue => {
    nodes += 1;
    if (nodes > maxNodes) {
      throw new SafeConfigEvaluationError(
        "NODE_LIMIT",
        "Safe config evaluation exceeded the node budget.",
      );
    }
    if (depth > maxDepth) {
      throw new SafeConfigEvaluationError(
        "DEPTH_LIMIT",
        "Safe config evaluation exceeded the depth budget.",
      );
    }

    if (node.kind === "literal") return node.value;

    if (node.kind === "ref") {
      const target = activeEnvironment.bindings[node.name];
      if (!target) {
        throw new SafeConfigEvaluationError(
          "UNKNOWN_REFERENCE",
          `Unknown safe config reference: ${node.name}`,
        );
      }
      if (resolving.has(node.name)) {
        throw new SafeConfigEvaluationError(
          "REFERENCE_CYCLE",
          `Safe config reference cycle includes ${node.name}.`,
        );
      }
      resolving.add(node.name);
      try {
        return evaluate(target, depth + 1, activeEnvironment);
      } finally {
        resolving.delete(node.name);
      }
    }

    if (node.kind === "array") {
      return node.items.map((item) => evaluate(item, depth + 1, activeEnvironment));
    }

    if (node.kind === "array-compose") {
      const output: SafeConfigValue[] = [];
      for (const part of node.parts) {
        const value = evaluate(
          part.expression,
          depth + 1,
          activeEnvironment,
        );
        if (part.spread) {
          if (!Array.isArray(value)) {
            throw new SafeConfigEvaluationError(
              "TYPE_MISMATCH",
              "Array spread requires an array.",
            );
          }
          output.push(...value);
        } else {
          output.push(value);
        }
      }
      return output;
    }

    if (node.kind === "object") {
      return Object.fromEntries(
        Object.entries(node.entries)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, evaluate(value, depth + 1, activeEnvironment)]),
      );
    }

    if (node.kind === "object-merge") {
      const output: Record<string, SafeConfigValue> = {};
      for (const part of node.parts) {
        const object = asObject(
          evaluate(part, depth + 1, activeEnvironment),
          "object spread",
        );
        for (
          const [key, value] of
            Object.entries(object)
        ) {
          output[key] = value;
        }
      }
      return output;
    }

    if (node.kind === "get") {
      const object = asObject(
        evaluate(node.object, depth + 1, activeEnvironment),
        "get",
      );
      if (!(node.key in object)) {
        throw new SafeConfigEvaluationError(
          "UNKNOWN_REFERENCE",
          `Safe config object does not contain key: ${node.key}`,
        );
      }
      return object[node.key]!;
    }

    if (node.kind === "conditional") {
      const condition =
        evaluate(
          node.condition,
          depth + 1,
          activeEnvironment,
        );
      if (typeof condition !== "boolean") {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Conditional expression requires a boolean condition.",
        );
      }
      return evaluate(
        condition
          ? node.whenTrue
          : node.whenFalse,
        depth + 1,
        activeEnvironment,
      );
    }

    if (node.kind === "logical") {
      const left =
        evaluate(
          node.left,
          depth + 1,
          activeEnvironment,
        );
      if (node.operator === "??") {
        return left === null
          ? evaluate(
              node.right,
              depth + 1,
              activeEnvironment,
            )
          : left;
      }
      if (typeof left !== "boolean") {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Logical &&/|| requires boolean operands in safe config.",
        );
      }
      if (node.operator === "&&") {
        if (!left) return false;
        const right =
          evaluate(
            node.right,
            depth + 1,
            activeEnvironment,
          );
        if (typeof right !== "boolean") {
          throw new SafeConfigEvaluationError(
            "TYPE_MISMATCH",
            "Logical && requires boolean operands in safe config.",
          );
        }
        return right;
      }
      if (left) return true;
      const right =
        evaluate(
          node.right,
          depth + 1,
          activeEnvironment,
        );
      if (typeof right !== "boolean") {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Logical || requires boolean operands in safe config.",
        );
      }
      return right;
    }

    if (node.kind === "compare") {
      const left =
        evaluate(
          node.left,
          depth + 1,
          activeEnvironment,
        );
      const right =
        evaluate(
          node.right,
          depth + 1,
          activeEnvironment,
        );

      if (
        node.operator === "==" ||
        node.operator === "==="
      ) {
        return left === right;
      }
      if (
        node.operator === "!=" ||
        node.operator === "!=="
      ) {
        return left !== right;
      }

      if (
        (typeof left !== "number" &&
          typeof left !== "string") ||
        (typeof right !== "number" &&
          typeof right !== "string") ||
        typeof left !== typeof right
      ) {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Ordered comparison requires same-type finite numbers or strings.",
        );
      }

      if (
        typeof left === "number" &&
        (
          !Number.isFinite(left) ||
          !Number.isFinite(right as number)
        )
      ) {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Ordered numeric comparison requires finite numbers.",
        );
      }

      if (typeof left === "number" && typeof right === "number") {
        if (node.operator === "<") return left < right;
        if (node.operator === "<=") return left <= right;
        if (node.operator === ">") return left > right;
        return left >= right;
      }
      // The same-type guard above excludes all values except strings.
      if (typeof left === "string" && typeof right === "string") {
        if (node.operator === "<") return left < right;
        if (node.operator === "<=") return left <= right;
        if (node.operator === ">") return left > right;
        return left >= right;
      }
      throw new SafeConfigEvaluationError("TYPE_MISMATCH", "Ordered comparison has incompatible operands.");
    }

    if (node.kind === "binary") {
      const left = evaluate(node.left, depth + 1, activeEnvironment);
      const right = evaluate(node.right, depth + 1, activeEnvironment);
      if (
        node.operator === "+" &&
        (typeof left === "string" || typeof right === "string")
      ) {
        if (
          (typeof left !== "string" && typeof left !== "number") ||
          (typeof right !== "string" && typeof right !== "number")
        ) {
          throw new SafeConfigEvaluationError(
            "TYPE_MISMATCH",
            "String concatenation accepts only strings and numbers.",
          );
        }
        return String(left) + String(right);
      }

      const a = asNumber(left, "binary operator");
      const b = asNumber(right, "binary operator");
      if (node.operator === "+") return a + b;
      if (node.operator === "-") return a - b;
      if (node.operator === "*") return a * b;
      if (b === 0) {
        throw new SafeConfigEvaluationError(
          "INVALID_OPERATION",
          "Division by zero is not allowed.",
        );
      }
      return a / b;
    }

    if (node.kind === "map") {
      const source = evaluate(
        node.source,
        depth + 1,
        activeEnvironment,
      );
      if (!Array.isArray(source)) {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Safe config map source must resolve to an array.",
        );
      }
      if (source.length > maxCollectionItems) {
        throw new SafeConfigEvaluationError(
          "COLLECTION_LIMIT",
          "Safe config map exceeded the collection item budget.",
        );
      }

      return source.map((item, index) => {
        const bindings: Record<
          string,
          SafeConfigExpression
        > = {
          ...activeEnvironment.bindings,
          [node.itemName]: {
            kind: "literal",
            value: item,
          },
        };
        if (node.indexName) {
          bindings[node.indexName] = {
            kind: "literal",
            value: index,
          };
        }
        return evaluate(
          node.body,
          depth + 1,
          {
            bindings,
            ...(activeEnvironment.functions === undefined ? {} : { functions: activeEnvironment.functions }),
          },
        );
      });
    }

    if (node.kind === "array-from") {
      const lengthValue = evaluate(
        node.length,
        depth + 1,
        activeEnvironment,
      );
      const length = asNumber(
        lengthValue,
        "Array.from length",
      );
      if (
        !Number.isInteger(length) ||
        length < 0
      ) {
        throw new SafeConfigEvaluationError(
          "TYPE_MISMATCH",
          "Array.from length must be a non-negative integer.",
        );
      }
      if (length > maxCollectionItems) {
        throw new SafeConfigEvaluationError(
          "COLLECTION_LIMIT",
          "Array.from exceeded the collection item budget.",
        );
      }

      return Array.from(
        { length },
        (_, index) =>
          evaluate(
            node.body,
            depth + 1,
            {
              bindings: {
                ...activeEnvironment.bindings,
                [node.indexName]: {
                  kind: "literal",
                  value: index,
                },
              },
              functions:
                activeEnvironment.functions,
            },
          ),
      );
    }

    if (node.kind === "call") {
      const fn =
        activeEnvironment.functions?.[
          node.name
        ];
      if (!fn) {
        throw new SafeConfigEvaluationError(
          "UNKNOWN_FUNCTION",
          `Unknown safe config function: ${node.name}`,
        );
      }
      if (calling.has(node.name)) {
        throw new SafeConfigEvaluationError(
          "FUNCTION_CYCLE",
          `Safe config function cycle includes ${node.name}.`,
        );
      }
      if (fn.params.length !== node.args.length) {
        throw new SafeConfigEvaluationError(
          "INVALID_OPERATION",
          `Safe config function ${node.name} expects ${fn.params.length} argument(s), received ${node.args.length}.`,
        );
      }

      const args = node.args.map((item) =>
        evaluate(
          item,
          depth + 1,
          activeEnvironment,
        )
      );
      const bindings: Record<
        string,
        SafeConfigExpression
      > = {
        ...activeEnvironment.bindings,
      };
      fn.params.forEach((param, index) => {
        bindings[param] = {
          kind: "literal",
          value: args[index]!,
        };
      });

      calling.add(node.name);
      try {
        return evaluate(
          fn.body,
          depth + 1,
          {
            bindings,
            ...(activeEnvironment.functions === undefined ? {} : { functions: activeEnvironment.functions }),
          },
        );
      } finally {
        calling.delete(node.name);
      }
    }

    const args = node.args.map((item) => evaluate(item, depth + 1, activeEnvironment));
    if (args.length !== 2) {
      throw new SafeConfigEvaluationError(
        "INVALID_OPERATION",
        "translate3 requires exactly two arguments.",
      );
    }
    const base = asObject(args[0]!, "translate3 base");
    const offset = asObject(args[1]!, "translate3 offset");
    return {
      x:
        asNumber(base.x!, "translate3 base.x") +
        asNumber(offset.x!, "translate3 offset.x"),
      y:
        asNumber(base.y!, "translate3 base.y") +
        asNumber(offset.y!, "translate3 offset.y"),
      z:
        asNumber(base.z!, "translate3 base.z") +
        asNumber(offset.z!, "translate3 offset.z"),
    };
  };

  return evaluate(expression, 0);
}
