import ts from "typescript";
import { directStatementSequence } from "../../core/statement-sequence.js";
import type {
  SourceRef,
} from "../../../../../packages/project-model/src/index.js";
import type {
  ScriptArenaAuthorityEvidence,
  ScriptArenaAuthorityPath,
} from "../../core/types.js";

export interface ScriptTerminalIdempotencyEvidence {
  readonly functionRegion: string;
  readonly guardTarget: string;
  readonly kind:
    | "boolean-latch"
    | "state-latch";
  readonly source: SourceRef;
}

export interface ScriptTerminalPrecedenceEvidence {
  readonly functionRegion: string;
  readonly policyBinding: string;
  readonly policyKind:
    | "ordered-outcomes"
    | "priority-table";
  readonly outcomes: readonly string[];
  readonly source: SourceRef;
}

const MEMBERSHIP_PROPERTY =
  /^(?:members|players|participants|memberships)$/i;
const READY_PROPERTY =
  /^(?:ready|readyPlayers|readyMembers|readyParticipants)$/i;
const CAPACITY_PROPERTY =
  /^(?:maxPlayers|maxParticipants|maxMembers|max_member|max_members|capacity)$/i;
const GENERATION_PROPERTY =
  /^(?:generation|arenaGeneration|generationId)$/i;
const START_OWNER_PROPERTY =
  /^(?:startOwner|startOwnerId|startToken|startGenerationOwner)$/i;
const START_STATE_PROPERTY =
  /^(?:started|active|state|status|phase)$/i;
const START_STATE_VALUE =
  /^(?:true|starting|countdown|active|started|running)$/i;

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
  const start = file.getLineAndCharacterOfPosition(
    node.getStart(file),
  );
  const end = file.getLineAndCharacterOfPosition(
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

function declarationMemberName(
  node: ts.PropertyName | undefined,
): string | undefined {
  if (!node) return undefined;
  return ts.isIdentifier(node) ||
      ts.isStringLiteralLike(node)
    ? node.text
    : undefined;
}

function localExecutionRegionId(
  node: ts.Node,
  file: ts.SourceFile,
): string {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current)) {
      // Source position distinguishes same-named lexical declarations.
      return "function:" + (current.name?.text ?? "anonymous") +
        "@" + current.getStart(file);
    }
    if (ts.isMethodDeclaration(current)) {
      const name = declarationMemberName(current.name);
      if (name) {
        const parent = current.parent;
        const owner =
          ts.isClassDeclaration(parent) || ts.isClassExpression(parent)
            ? parent.name?.text ?? "anonymous-class" : "object";
        return "method:" + owner + "." + name +
          "@" + current.getStart(file);
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

function assignment(
  node: ts.Node,
):
  | {
      left: ts.Expression;
      right: ts.Expression;
      statement: ts.ExpressionStatement;
    }
  | undefined {
  if (!ts.isExpressionStatement(node)) {
    return undefined;
  }
  const expression = node.expression;
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !==
      ts.SyntaxKind.EqualsToken
  ) {
    return undefined;
  }
  return {
    left: expression.left,
    right: expression.right,
    statement: node,
  };
}

function directProperty(
  expression: ts.Expression,
):
  | {
      owner: ts.Expression;
      property: string;
      text: string;
    }
  | undefined {
  if (!ts.isPropertyAccessExpression(expression)) {
    return undefined;
  }
  return {
    owner: expression.expression,
    property: expression.name.text,
    text: expression.getText(),
  };
}

function membershipCollection(
  expression: ts.Expression,
):
  | {
      arenaExpression: string;
      membershipExpression: string;
      collectionKind: "set" | "array" | "map";
    }
  | undefined {
  if (!ts.isPropertyAccessExpression(expression)) {
    return undefined;
  }
  if (!MEMBERSHIP_PROPERTY.test(expression.name.text)) {
    return undefined;
  }

  return {
    arenaExpression: expression.expression.getText(),
    membershipExpression: expression.getText(),
    collectionKind: "set",
  };
}

function membershipCommitEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  if (!ts.isExpressionStatement(node)) {
    return undefined;
  }
  const call = node.expression;
  if (
    !ts.isCallExpression(call) ||
    !ts.isPropertyAccessExpression(call.expression)
  ) {
    return undefined;
  }

  const method = call.expression.name.text;
  if (
    method !== "add" &&
    method !== "push" &&
    method !== "set"
  ) {
    return undefined;
  }

  const membership = membershipCollection(
    call.expression.expression,
  );
  if (!membership) return undefined;

  const subject = call.arguments[0];
  if (!subject) return undefined;

  return {
    kind: "membership-commit",
    arenaExpression: membership.arenaExpression,
    subjectExpression: subject.getText(file),
    membershipExpression:
      membership.membershipExpression,
    executionRegion:
      localExecutionRegionId(node, file),
    source: lineSource(file, node, source),
  };
}

function membershipReleaseEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  if (!ts.isExpressionStatement(node)) return undefined;
  const call = node.expression;
  if (
    !ts.isCallExpression(call) ||
    !ts.isPropertyAccessExpression(call.expression)
  ) {
    return undefined;
  }

  if (call.expression.name.text !== "delete") {
    return undefined;
  }

  const membership = membershipCollection(
    call.expression.expression,
  );
  if (!membership) return undefined;

  const subject = call.arguments[0];
  if (!subject) return undefined;

  return {
    kind: "membership-release",
    arenaExpression: membership.arenaExpression,
    subjectExpression: subject.getText(file),
    membershipExpression:
      membership.membershipExpression,
    executionRegion:
      localExecutionRegionId(node, file),
    source: lineSource(file, node, source),
  };
}

function generationInvalidationEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  let target: ts.Expression | undefined;

  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression) &&
    [
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.PlusEqualsToken,
      ts.SyntaxKind.MinusEqualsToken,
    ].includes(node.expression.operatorToken.kind)
  ) {
    target = node.expression.left;
  } else if (
    ts.isExpressionStatement(node) &&
    (
      ts.isPostfixUnaryExpression(node.expression) ||
      ts.isPrefixUnaryExpression(node.expression)
    ) &&
    (
      node.expression.operator === ts.SyntaxKind.PlusPlusToken ||
      node.expression.operator === ts.SyntaxKind.MinusMinusToken
    )
  ) {
    target = node.expression.operand;
  }

  if (!target) return undefined;
  const property = directProperty(target);
  if (
    !property ||
    !GENERATION_PROPERTY.test(property.property)
  ) {
    return undefined;
  }

  const sequence = directStatementSequence(
    node, property.owner.getText(file), file, source,
  );
  return {
    kind: "generation-invalidate",
    arenaExpression: property.owner.getText(file),
    generationExpression: property.text,
    executionRegion:
      localExecutionRegionId(node, file),
    source: lineSource(file, node, source),
    // This assignment is a direct statement in the parent block. An
    // enclosing if/loop body has its OWN block identity and cannot be
    // silently considered sequential with statements outside that block.
    ...(sequence ? {
      sequentialBlockSource: sequence.blockSource,
      sequentialPathEvidence: sequence,
    } : {}),
  };
}

function variableOperandEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence[] {
  if (!ts.isVariableStatement(node)) return [];

  const output: ScriptArenaAuthorityEvidence[] = [];
  for (const declaration of node.declarationList.declarations) {
    if (
      !ts.isIdentifier(declaration.name) ||
      !declaration.initializer ||
      !ts.isPropertyAccessExpression(
        declaration.initializer,
      )
    ) {
      continue;
    }

    const property =
      declaration.initializer.name.text;
    const arenaExpression =
      declaration.initializer.expression.getText(file);
    const executionRegion =
      localExecutionRegionId(node, file);

    if (CAPACITY_PROPERTY.test(property)) {
      output.push({
        kind: "capacity-operand",
        arenaExpression,
        capacityExpression:
          declaration.name.text,
        executionRegion,
        source: lineSource(
          file,
          declaration,
          source,
        ),
      });
    }

    if (GENERATION_PROPERTY.test(property)) {
      output.push({
        kind: "arena-generation-operand",
        arenaExpression,
        generationExpression:
          declaration.name.text,
        executionRegion,
        source: lineSource(
          file,
          declaration,
          source,
        ),
      });
    }
  }

  return output;
}

function membershipCount(
  expression: ts.Expression,
  file: ts.SourceFile,
):
  | {
      arenaExpression: string;
      membershipExpression: string;
      countExpression: string;
    }
  | undefined {
  if (!ts.isPropertyAccessExpression(expression)) {
    return undefined;
  }
  if (
    expression.name.text !== "length" &&
    expression.name.text !== "size"
  ) {
    return undefined;
  }
  const membership = membershipCollection(
    expression.expression,
  );
  if (!membership) return undefined;

  return {
    arenaExpression: membership.arenaExpression,
    membershipExpression:
      membership.membershipExpression,
    countExpression: expression.getText(file),
  };
}

function capacityExpression(
  expression: ts.Expression,
  file: ts.SourceFile,
):
  | {
      expression: string;
      arenaExpression?: string;
    }
  | undefined {
  if (ts.isIdentifier(expression)) {
    return {
      expression: expression.text,
    };
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    CAPACITY_PROPERTY.test(expression.name.text)
  ) {
    return {
      expression: expression.getText(file),
      arenaExpression:
        expression.expression.getText(file),
    };
  }
  if (ts.isNumericLiteral(expression)) {
    return {
      expression: expression.text,
    };
  }
  return undefined;
}

/**
 * A module-scope const object literal is a numeric capacity source only
 * while the whole source keeps the object identity local and read-only.
 * Any escaping reference, shadow declaration or property mutation abstains.
 * This is selected-source authored capacity, never Minecraft runtime proof.
 */
function staticModuleCapacity(
  expression: ts.Expression,
  file: ts.SourceFile,
  source: SourceRef,
): { value: number; source: SourceRef } | undefined {
  if (!ts.isPropertyAccessExpression(expression) ||
      !ts.isIdentifier(expression.expression) ||
      !CAPACITY_PROPERTY.test(expression.name.text)) return undefined;
  const bindingName = expression.expression.text;
  const declarations = file.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) &&
    // An exported const object can be mutated by an external importer.
    !statement.modifiers?.some((item) =>
      item.kind === ts.SyntaxKind.ExportKeyword ||
      item.kind === ts.SyntaxKind.DefaultKeyword
    ) &&
    (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
      ? statement.declarationList.declarations.filter((declaration) =>
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === bindingName
        )
      : [],
  );
  if (declarations.length !== 1) return undefined;
  const declaration = declarations[0]!;
  const initializer = declaration.initializer;
  if (!initializer || !ts.isObjectLiteralExpression(initializer) ||
      !initializer.properties.every((property) =>
        ts.isPropertyAssignment(property) &&
        (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
      )) return undefined;
  const candidates = initializer.properties.filter((property) =>
    ts.isPropertyAssignment(property) &&
    (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) &&
    property.name.text === expression.name.text
  );
  if (candidates.length !== 1) return undefined;
  const property = candidates[0] as ts.PropertyAssignment;
  if (!ts.isNumericLiteral(property.initializer)) return undefined;
  const value = Number(property.initializer.text);
  if (!Number.isSafeInteger(value) || value < 1) return undefined;

  let stable = true;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === bindingName) {
      if (node === declaration.name) {
        // This is the unique declaration of the object.
      } else if (ts.isPropertyAccessExpression(node.parent) &&
                 node.parent.expression === node) {
        const access = node.parent;
        const parent = access.parent;
        // Follow nested assignment targets, including destructuring.
        // Reading the scalar is fine; writing through any enclosing LHS,
        // deleting it, or dispatching a method against the object is not.
        let target: ts.Node = access;
        while (target.parent && !ts.isExpressionStatement(target.parent)) {
          const enclosing = target.parent;
          if ((ts.isBinaryExpression(enclosing) &&
               enclosing.left === target &&
               enclosing.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
               enclosing.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
              (ts.isPrefixUnaryExpression(enclosing) &&
               (enclosing.operator === ts.SyntaxKind.PlusPlusToken ||
                enclosing.operator === ts.SyntaxKind.MinusMinusToken)) ||
              (ts.isPostfixUnaryExpression(enclosing) &&
               (enclosing.operator === ts.SyntaxKind.PlusPlusToken ||
                enclosing.operator === ts.SyntaxKind.MinusMinusToken)) ||
              (ts.isDeleteExpression(enclosing) &&
               enclosing.expression === target) ||
              (ts.isForOfStatement(enclosing) &&
               enclosing.initializer === target) ||
              (ts.isForInStatement(enclosing) &&
               enclosing.initializer === target) ||
              (ts.isCallExpression(enclosing) &&
               enclosing.expression === access)) {
            stable = false;
            break;
          }
          if (ts.isFunctionLike(enclosing) || ts.isSourceFile(enclosing)) break;
          target = enclosing;
        }
      } else {
        stable = false;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return stable ? { value, source: lineSource(file, property, source) } : undefined;
}

function capacityComparisonEvidence(
  condition: ts.Expression,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  if (!ts.isBinaryExpression(condition)) {
    return undefined;
  }

  const supportedOperators = new Set([
    ts.SyntaxKind.GreaterThanToken,
    ts.SyntaxKind.GreaterThanEqualsToken,
    ts.SyntaxKind.LessThanToken,
    ts.SyntaxKind.LessThanEqualsToken,
  ]);
  if (
    !supportedOperators.has(
      condition.operatorToken.kind,
    )
  ) {
    return undefined;
  }

  const leftMembership = membershipCount(
    condition.left,
    file,
  );
  const rightMembership = membershipCount(
    condition.right,
    file,
  );

  const membership =
    leftMembership ?? rightMembership;
  if (!membership) return undefined;

  const other = leftMembership
    ? condition.right
    : condition.left;
  const capacity = capacityExpression(
    other,
    file,
  );
  if (!capacity) return undefined;
  const staticCapacity = staticModuleCapacity(other, file, source);

  if (
    capacity.arenaExpression !== undefined &&
    capacity.arenaExpression !== membership.arenaExpression &&
    // this.definition.maxPlayers is an object-owned configuration path;
    // a different receiver remains unrelated until separately proven.
    capacity.arenaExpression !==
      membership.arenaExpression + ".definition" &&
    staticCapacity === undefined
  ) {
    return undefined;
  }

  return {
    kind: "capacity-check",
    arenaExpression:
      membership.arenaExpression,
    membershipExpression:
      membership.membershipExpression,
    capacityExpression:
      capacity.expression,
    ...(staticCapacity ? {
      resolvedCapacityValue: staticCapacity.value,
      resolvedCapacitySource: staticCapacity.source,
    } : {}),
    executionRegion:
      localExecutionRegionId(condition, file),
    source: lineSource(
      file,
      condition,
      source,
    ),
  };
}

function capacityCheckEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  if (!ts.isIfStatement(node) || !ts.isBlock(node.parent)) return undefined;
  const condition = node.expression;
  // A capacity check only establishes admission protection when a full
  // party definitely exits and the next statement commits the SAME roster.
  // If a guard merely logs or compares an inverted limit, recording it as
  // capacityAuthorityProven would incorrectly close FORMALIZE.
  if (
    !ts.isBinaryExpression(condition) ||
    condition.operatorToken.kind !== ts.SyntaxKind.GreaterThanEqualsToken ||
    membershipCount(condition.left, file) === undefined
  ) return undefined;
  const thenBranch = node.thenStatement;
  const terminal = ts.isBlock(thenBranch)
    ? thenBranch.statements[thenBranch.statements.length - 1]
    : thenBranch;
  if (
    terminal === undefined ||
    (!ts.isReturnStatement(terminal) && !ts.isThrowStatement(terminal))
  ) return undefined;
  const block = node.parent;
  const next = block.statements[block.statements.indexOf(node) + 1];
  if (next === undefined) return undefined;
  const commit = membershipCommitEvidence(next, file, source);
  const check = capacityComparisonEvidence(condition, file, source);
  if (
    commit === undefined ||
    check === undefined ||
    commit.arenaExpression !== check.arenaExpression ||
    commit.membershipExpression !== check.membershipExpression
  ) return undefined;
  return { ...check, guardedCommitSource: commit.source };
}

/**
 * Conservative return-ternary join contract:
 * return (otherRejections || members.length >= cap) ? false
 *   : (members.push(player), true)
 *
 * A comparison in an arbitrary expression is not enough. Membership
 * must be committed directly on the successful (false) branch of the
 * same returned conditional, not a nested/independent call or opposite
 * branch. Only OR-chains can establish that all rejection guards are
 * false before the successful branch is selected.
 */
function returnTernaryCapacityEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): readonly ScriptArenaAuthorityEvidence[] {
  if (!ts.isConditionalExpression(node)) return [];
  let expression: ts.Node = node;
  while (
    expression.parent !== undefined &&
    ts.isParenthesizedExpression(expression.parent)
  ) expression = expression.parent;
  if (!ts.isReturnStatement(expression.parent)) return [];

  const unwrap = (value: ts.Expression): ts.Expression =>
    ts.isParenthesizedExpression(value)
      ? unwrap(value.expression)
      : value;
  const rejection = unwrap(node.whenTrue);
  const definitelyFalse =
    rejection.kind === ts.SyntaxKind.FalseKeyword ||
    (
      ts.isPrefixUnaryExpression(rejection) &&
      rejection.operator === ts.SyntaxKind.ExclamationToken &&
      ts.isNumericLiteral(rejection.operand) &&
      rejection.operand.text === "1"
    );
  if (!definitelyFalse) return [];

  const conditionChecks = (value: ts.Expression):
    ScriptArenaAuthorityEvidence[] => {
    const expr = unwrap(value);
    if (
      ts.isBinaryExpression(expr) &&
      expr.operatorToken.kind === ts.SyntaxKind.BarBarToken
    ) {
      return [
        ...conditionChecks(expr.left),
        ...conditionChecks(expr.right),
      ];
    }
    // In a reject-on-true ternary, only a count >= cap (or count > cap)
    // comparison can prevent over-capacity admission on the false arm.
    // The generic IfStatement collector supports other directions, but
    // importing them here would invert the meaning of the rejection gate.
    if (
      !ts.isBinaryExpression(expr) ||
      ![
        ts.SyntaxKind.GreaterThanEqualsToken,
      ].includes(expr.operatorToken.kind) ||
      membershipCount(expr.left, file) === undefined
    ) return [];
    const check = capacityComparisonEvidence(expr, file, source);
    return check === undefined ? [] : [check];
  };
  const checks = conditionChecks(node.condition);
  if (checks.length === 0) return [];

  const committed = (value: ts.Expression):
    ScriptArenaAuthorityEvidence[] => {
    const expr = unwrap(value);
    if (
      ts.isBinaryExpression(expr) &&
      expr.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) {
      return [
        ...committed(expr.left),
        ...committed(expr.right),
      ];
    }
    if (
      !ts.isCallExpression(expr) ||
      !ts.isPropertyAccessExpression(expr.expression) ||
      !["push", "add", "set"].includes(expr.expression.name.text)
    ) return [];
    const membership = membershipCollection(expr.expression.expression);
    const subject = expr.arguments[0];
    if (membership === undefined || subject === undefined) return [];
    return [{
      kind: "membership-commit",
      arenaExpression: membership.arenaExpression,
      membershipExpression: membership.membershipExpression,
      subjectExpression: subject.getText(file),
      executionRegion: localExecutionRegionId(node, file),
      source: lineSource(file, expr, source),
    }];
  };
  const commits = committed(node.whenFalse);
  // Multiple successful writes may exceed the guarded capacity.
  if (commits.length !== 1) return [];
  // Emit only a matched comparison and commit for exactly the same arena
  // membership collection. Never merge two different session owners.
  const supported = checks.flatMap((check) =>
    commits.filter((commit) =>
      commit.arenaExpression === check.arenaExpression &&
      commit.membershipExpression === check.membershipExpression
    ).flatMap((commit) => [
      { ...check, guardedCommitSource: commit.source }, commit,
    ])
  );
  return supported;
}

function startOwnerEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  const value = assignment(node);
  if (!value) return undefined;

  const target = directProperty(value.left);
  if (
    !target ||
    !START_OWNER_PROPERTY.test(target.property)
  ) {
    return undefined;
  }

  const ownerExpression =
    value.right.getText(file);
  return {
    kind: "start-owner-acquire",
    arenaExpression:
      target.owner.getText(file),
    subjectExpression: target.text,
    ownerExpression,
    ...(GENERATION_PROPERTY.test(
      ownerExpression,
    )
      ? {
          generationExpression:
            ownerExpression,
        }
      : {}),
    executionRegion:
      localExecutionRegionId(node, file),
    source: lineSource(
      file,
      value.statement,
      source,
    ),
  };
}

function isNullOrUndefined(
  expression: ts.Expression,
): boolean {
  return (
    expression.kind === ts.SyntaxKind.NullKeyword ||
    (
      ts.isIdentifier(expression) &&
      expression.text === "undefined"
    )
  );
}

function startOwnerGuardEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  if (!ts.isIfStatement(node)) return undefined;
  const condition = node.expression;
  if (
    !ts.isBinaryExpression(condition) ||
    ![
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ].includes(condition.operatorToken.kind)
  ) {
    return undefined;
  }

  const left = directProperty(condition.left);
  const right = directProperty(condition.right);

  const ownerTarget =
    left &&
    START_OWNER_PROPERTY.test(left.property) &&
    isNullOrUndefined(condition.right)
      ? left
      : right &&
          START_OWNER_PROPERTY.test(right.property) &&
          isNullOrUndefined(condition.left)
        ? right
        : undefined;

  if (!ownerTarget) return undefined;

  const thenStatement = node.thenStatement;
  const directReturn =
    ts.isReturnStatement(thenStatement) ||
    (
      ts.isBlock(thenStatement) &&
      thenStatement.statements.length === 1 &&
      ts.isReturnStatement(
        thenStatement.statements[0]!,
      )
    );
  if (!directReturn) return undefined;

  return {
    kind: "start-owner-guard",
    arenaExpression:
      ownerTarget.owner.getText(file),
    subjectExpression: ownerTarget.text,
    executionRegion:
      localExecutionRegionId(node, file),
    source: lineSource(
      file,
      condition,
      source,
    ),
  };
}

function startStateValue(
  expression: ts.Expression,
): string | undefined {
  if (
    expression.kind ===
      ts.SyntaxKind.TrueKeyword
  ) {
    return "true";
  }
  if (
    ts.isStringLiteralLike(expression) ||
    ts.isNoSubstitutionTemplateLiteral(
      expression,
    )
  ) {
    return expression.text;
  }
  return undefined;
}

function startStateCommitEvidence(
  node: ts.Node,
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence | undefined {
  const value = assignment(node);
  if (!value) return undefined;

  const target = directProperty(value.left);
  if (
    !target ||
    !START_STATE_PROPERTY.test(target.property)
  ) {
    return undefined;
  }

  const state = startStateValue(value.right);
  if (
    state === undefined ||
    !START_STATE_VALUE.test(state)
  ) {
    return undefined;
  }

  return {
    kind: "start-state-commit",
    arenaExpression:
      target.owner.getText(file),
    stateExpression:
      target.text + "=" + state,
    executionRegion:
      localExecutionRegionId(node, file),
    source: lineSource(
      file,
      value.statement,
      source,
    ),
  };
}


function arenaCollectionCount(
  expression: ts.Expression,
  file: ts.SourceFile,
): { arena: string; collection: string } | undefined {
  if (
    !ts.isPropertyAccessExpression(expression) ||
    !["size", "length"].includes(expression.name.text) ||
    !ts.isPropertyAccessExpression(expression.expression)
  ) {
    return undefined;
  }
  const collection = expression.expression;
  if (
    !MEMBERSHIP_PROPERTY.test(collection.name.text) &&
    !READY_PROPERTY.test(collection.name.text)
  ) {
    return undefined;
  }
  return {
    arena: collection.expression.getText(file),
    collection: collection.getText(file),
  };
}

function nodeContainsIdentifier(
  node: ts.Node,
  identifier: string,
): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) return;
    if (
      ts.isIdentifier(current) &&
      current.text === identifier
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function delayedReadySnapshotEvidence(
  file: ts.SourceFile,
  source: SourceRef,
): ScriptArenaAuthorityEvidence[] {
  const snapshots = new Map<string, {
    arena: string;
    collection: string;
    region: string;
    start: number;
  }>();

  const collect = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const count =
        arenaCollectionCount(
          node.initializer,
          file,
        );
      if (count) {
        snapshots.set(node.name.text, {
          ...count,
          region:
            localExecutionRegionId(
              node,
              file,
            ),
          start:
            node.getStart(file),
        });
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(file);

  const output:
    ScriptArenaAuthorityEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(
        node.expression,
      ) &&
      node.expression.expression.getText(file) === "system" &&
      /^(?:run|runTimeout|runInterval|runJob)$/.test(
        node.expression.name.text,
      )
    ) {
      const callback = node.arguments[0];
      if (
        callback &&
        (
          ts.isArrowFunction(callback) ||
          ts.isFunctionExpression(callback)
        )
      ) {
        let startCommit = false;
        let liveArenaCount:
          string | undefined;

        const scan = (inner: ts.Node): void => {
          const value =
            assignment(inner);
          if (value) {
            const target =
              directProperty(
                value.left,
              );
            const state =
              startStateValue(
                value.right,
              );
            if (
              target &&
              START_STATE_PROPERTY.test(
                target.property,
              ) &&
              state !== undefined &&
              START_STATE_VALUE.test(
                state,
              )
            ) {
              startCommit = true;
            }
          }

          if (
            ts.isPropertyAccessExpression(
              inner,
            )
          ) {
            const count =
              arenaCollectionCount(
                inner,
                file,
              );
            if (count) {
              liveArenaCount ??=
                count.arena;
            }
          }
          ts.forEachChild(
            inner,
            scan,
          );
        };
        scan(callback.body);

        if (startCommit) {
          const schedulerRegion =
            localExecutionRegionId(
              node,
              file,
            );
          for (
            const [binding, snapshot]
              of snapshots
          ) {
            if (
              snapshot.region !==
                schedulerRegion ||
              snapshot.start >=
                node.getStart(file) ||
              !nodeContainsIdentifier(
                callback.body,
                binding,
              ) ||
              liveArenaCount ===
                snapshot.arena
            ) {
              continue;
            }
            output.push({
              kind:
                "ready-set-snapshot-risk",
              arenaExpression:
                snapshot.arena,
              membershipExpression:
                snapshot.collection,
              subjectExpression:
                binding,
              snapshotExpression:
                binding +
                "=" +
                snapshot.collection,
              executionRegion:
                localExecutionRegionId(
                  callback,
                  file,
                ),
              source:
                lineSource(
                  file,
                  callback,
                  source,
                ),
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  return output;
}

function evidenceKey(
  evidence: ScriptArenaAuthorityEvidence,
): string {
  return [
    evidence.kind,
    evidence.arenaExpression,
    evidence.executionRegion,
    evidence.source.relativePath,
    evidence.source.range?.lineStart ?? 0,
    evidence.source.range?.columnStart ?? 0,
  ].join("|");
}

const TERMINAL_FUNCTION_NAME =
  /^(?:endgame|endmatch|finishgame|finishmatch|cleanup|cleanuparena|reset|resetarena|abort|abortgame|timeout|victory|defeat|stopgame|leavearena|disconnect|playerleave|onplayerleave)$/i;

function terminalLiteralValue(
  expression: ts.Expression,
): string | undefined {
  if (
    expression.kind ===
      ts.SyntaxKind.TrueKeyword
  ) {
    return "true";
  }
  if (
    expression.kind ===
      ts.SyntaxKind.FalseKeyword
  ) {
    return "false";
  }
  if (
    ts.isStringLiteralLike(expression) ||
    ts.isNoSubstitutionTemplateLiteral(
      expression,
    )
  ) {
    return expression.text;
  }
  return undefined;
}

function terminalReturnOnly(
  statement: ts.Statement,
): boolean {
  return (
    ts.isReturnStatement(statement) ||
    (
      ts.isBlock(statement) &&
      statement.statements.length === 1 &&
      ts.isReturnStatement(
        statement.statements[0]!,
      )
    )
  );
}

function terminalGuard(
  expression: ts.Expression,
  file: ts.SourceFile,
): {
  readonly target: string;
  readonly mode:
    | "truthy"
    | "equal"
    | "not-equal";
  readonly value?: string;
} | undefined {
  if (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(
      expression,
    )
  ) {
    return {
      target:
        expression.getText(file),
      mode: "truthy",
    };
  }

  if (
    !ts.isBinaryExpression(expression)
  ) {
    return undefined;
  }

  const operator =
    expression.operatorToken.kind;
  const equal =
    operator ===
      ts.SyntaxKind.EqualsEqualsToken ||
    operator ===
      ts.SyntaxKind.EqualsEqualsEqualsToken;
  const notEqual =
    operator ===
      ts.SyntaxKind.ExclamationEqualsToken ||
    operator ===
      ts.SyntaxKind.ExclamationEqualsEqualsToken;
  if (!equal && !notEqual) {
    return undefined;
  }

  const pairs: readonly [
    ts.Expression,
    ts.Expression,
  ][] = [
    [expression.left, expression.right],
    [expression.right, expression.left],
  ];

  for (const [candidate, literal] of pairs) {
    if (
      !ts.isIdentifier(candidate) &&
      !ts.isPropertyAccessExpression(
        candidate,
      )
    ) {
      continue;
    }
    const value =
      terminalLiteralValue(literal);
    if (value === undefined) continue;
    return {
      target:
        candidate.getText(file),
      mode:
        equal
          ? "equal"
          : "not-equal",
      value,
    };
  }

  return undefined;
}

function terminalLatchAssignment(
  statement: ts.Statement,
  file: ts.SourceFile,
): {
  readonly target: string;
  readonly value: string;
  readonly sourceNode:
    ts.BinaryExpression;
} | undefined {
  if (
    !ts.isExpressionStatement(statement) ||
    !ts.isBinaryExpression(
      statement.expression,
    ) ||
    statement.expression.operatorToken.kind !==
      ts.SyntaxKind.EqualsToken
  ) {
    return undefined;
  }

  const value =
    terminalLiteralValue(
      statement.expression.right,
    );
  if (value === undefined) {
    return undefined;
  }

  return {
    target:
      statement.expression.left.getText(
        file,
      ),
    value,
    sourceNode:
      statement.expression,
  };
}

export function deriveScriptTerminalIdempotencyEvidence(
  text: string,
  source: SourceRef,
): ScriptTerminalIdempotencyEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );
  const output:
    ScriptTerminalIdempotencyEvidence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node)
      ) &&
      node.body
    ) {
      const name =
        declarationMemberName(
          node.name,
        );
      if (
        name &&
        TERMINAL_FUNCTION_NAME.test(
          name.replace(
            /[^A-Za-z0-9]/g,
            "",
          ),
        ) &&
        node.body.statements.length >= 2
      ) {
        const first =
          node.body.statements[0]!;
        const second =
          node.body.statements[1]!;
        if (
          ts.isIfStatement(first) &&
          first.elseStatement ===
            undefined &&
          terminalReturnOnly(
            first.thenStatement,
          )
        ) {
          const guard =
            terminalGuard(
              first.expression,
              file,
            );
          const latch =
            terminalLatchAssignment(
              second,
              file,
            );
          if (
            guard &&
            latch &&
            guard.target ===
              latch.target
          ) {
            const protectedByLatch =
              (
                guard.mode === "truthy" &&
                latch.value === "true"
              ) ||
              (
                guard.mode === "equal" &&
                guard.value ===
                  latch.value
              ) ||
              (
                guard.mode ===
                  "not-equal" &&
                guard.value !== undefined &&
                guard.value !==
                  latch.value
              );
            if (protectedByLatch) {
              output.push({
                functionRegion:
                  "function:" + name,
                guardTarget:
                  guard.target,
                kind:
                  guard.mode ===
                    "truthy"
                    ? "boolean-latch"
                    : "state-latch",
                source:
                  lineSource(
                    file,
                    latch.sourceNode,
                    source,
                  ),
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(file);

  return output.sort((a, b) =>
    a.functionRegion.localeCompare(
      b.functionRegion,
    ) ||
    a.guardTarget.localeCompare(
      b.guardTarget,
    )
  );
}

export function deriveScriptArenaAuthorityEvidence(
  text: string,
  source: SourceRef,
): ScriptArenaAuthorityEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const output: ScriptArenaAuthorityEvidence[] = [
    ...delayedReadySnapshotEvidence(
      file,
      source,
    ),
  ];

  const visit = (node: ts.Node): void => {
    const membership =
      membershipCommitEvidence(
        node,
        file,
        source,
      );
    if (membership) output.push(membership);

    const release = membershipReleaseEvidence(
      node,
      file,
      source,
    );
    if (release) output.push(release);

    const generationInvalidation =
      generationInvalidationEvidence(
        node,
        file,
        source,
      );
    if (generationInvalidation) {
      output.push(generationInvalidation);
    }

    output.push(
      ...variableOperandEvidence(
        node,
        file,
        source,
      ),
    );

    const capacity = capacityCheckEvidence(
      node,
      file,
      source,
    );
    if (capacity) output.push(capacity);
    output.push(...returnTernaryCapacityEvidence(node, file, source));

    const ownerGuard = startOwnerGuardEvidence(
      node,
      file,
      source,
    );
    if (ownerGuard) output.push(ownerGuard);

    const owner = startOwnerEvidence(
      node,
      file,
      source,
    );
    if (owner) output.push(owner);

    const start = startStateCommitEvidence(
      node,
      file,
      source,
    );
    if (start) output.push(start);

    ts.forEachChild(node, visit);
  };

  visit(file);

  return [
    ...new Map(
      output.map((item) => [
        evidenceKey(item),
        item,
      ]),
    ).values(),
  ].sort((a, b) =>
    evidenceKey(a).localeCompare(
      evidenceKey(b),
    )
  );
}

function sameCommitSource(expected: SourceRef | undefined, actual: SourceRef): boolean {
  const a = expected?.range, b = actual.range;
  return a?.lineStart !== undefined && a.columnStart !== undefined &&
    a.lineEnd !== undefined && a.columnEnd !== undefined &&
    b !== undefined && expected?.artifactId === actual.artifactId &&
    expected.relativePath === actual.relativePath &&
    a.lineStart === b.lineStart && a.columnStart === b.columnStart &&
    a.lineEnd === b.lineEnd && a.columnEnd === b.columnEnd;
}

export function correlateScriptArenaAuthorityPaths(
  evidence:
    readonly ScriptArenaAuthorityEvidence[],
): ScriptArenaAuthorityPath[] {
  const grouped = new Map<
    string,
    { arenaExpression: string; executionRegion: string; items: ScriptArenaAuthorityEvidence[] }
  >();
  for (const item of evidence) {
    const key = JSON.stringify([item.arenaExpression, item.executionRegion]);
    const group = grouped.get(key) ?? {
      arenaExpression: item.arenaExpression,
      executionRegion: item.executionRegion,
      items: [],
    };
    group.items.push(item);
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .map(({ arenaExpression, executionRegion, items }) => {
      // An exact guard-to-write witness, not co-location, establishes authority.
      const pairs = items.flatMap((check) =>
        check.kind === "capacity-check" && check.guardedCommitSource
          ? items.filter((commit) =>
              commit.kind === "membership-commit" &&
              check.arenaExpression === commit.arenaExpression &&
              check.membershipExpression === commit.membershipExpression &&
              sameCommitSource(check.guardedCommitSource, commit.source)
            ).map((commit) => ({ check, commit }))
          : [],
      );
      const first = pairs[0];
      const bound = first !== undefined &&
        pairs.every(({ check }) =>
          check.capacityExpression === first.check.capacityExpression &&
          check.membershipExpression === first.check.membershipExpression
        ) &&
        items.filter((item) =>
          item.kind === "membership-commit" &&
          item.membershipExpression === first.commit.membershipExpression
        ).length === pairs.length
          ? first : undefined;
      const membershipCommit = bound?.commit ??
        items.find((item) => item.kind === "membership-commit");
      const membershipRelease = items.find(
        (item) =>
          item.kind ===
            "membership-release",
      );
      const capacityOperand = items.find(
        (item) =>
          item.kind ===
            "capacity-operand",
      );
      const capacityCheck = bound?.check ??
        items.find((item) => item.kind === "capacity-check");
      const generationOperand = items.find(
        (item) =>
          item.kind ===
            "arena-generation-operand",
      );
      const generationInvalidation = items.find(
        (item) =>
          item.kind ===
            "generation-invalidate",
      );
      const startOwnerGuard = items.find(
        (item) =>
          item.kind ===
            "start-owner-guard",
      );
      const startOwnerAcquire = items.find(
        (item) =>
          item.kind ===
            "start-owner-acquire",
      );
      const startStateCommit = items.find(
        (item) =>
          item.kind ===
            "start-state-commit",
      );

      const capacityExpression =
        capacityCheck?.capacityExpression;
      const directCapacityExpression =
        capacityExpression !== undefined &&
        capacityExpression.includes(".");
      // A positive integer literal is already a source-scoped capacity
      // limit when the same lexical path contains the membership commit.
      // Do not require a separate capacity operand for an inline ">= 5"
      // check; the upstream extractor still rejects zero/noninteger caps.
      const numericCapacityLiteral =
        capacityExpression !== undefined &&
        /^(?:0|[1-9]\d*)$/.test(capacityExpression);
      const localCapacityExpression =
        capacityExpression !== undefined &&
        /^[A-Za-z_$][\w$]*$/.test(
          capacityExpression,
        );
      const capacityMatchesOperand =
        numericCapacityLiteral ||
        directCapacityExpression ||
        (
          localCapacityExpression &&
          capacityOperand?.capacityExpression ===
            capacityExpression
        );

      const capacityAuthorityProven =
        bound !== undefined && capacityMatchesOperand;

      const startAuthorityProven =
        startOwnerAcquire !== undefined &&
        startStateCommit !== undefined &&
        (
          startOwnerAcquire.generationExpression !==
            undefined ||
          generationOperand !== undefined
        );
      const startGuardProven =
        startAuthorityProven &&
        startOwnerGuard !== undefined &&
        startOwnerGuard.subjectExpression !== undefined &&
        startOwnerGuard.subjectExpression ===
          startOwnerAcquire?.subjectExpression;

      return {
        arenaExpression:
          arenaExpression ?? "",
        executionRegion:
          executionRegion ?? "",
        ...(membershipCommit
          ? { membershipCommit }
          : {}),
        ...(membershipRelease
          ? { membershipRelease }
          : {}),
        ...(capacityOperand
          ? { capacityOperand }
          : {}),
        ...(capacityCheck
          ? { capacityCheck }
          : {}),
        ...(generationOperand
          ? { generationOperand }
          : {}),
        ...(generationInvalidation
          ? { generationInvalidation }
          : {}),
        ...(startOwnerGuard
          ? { startOwnerGuard }
          : {}),
        ...(startOwnerAcquire
          ? { startOwnerAcquire }
          : {}),
        ...(startStateCommit
          ? { startStateCommit }
          : {}),
        capacityAuthorityProven,
        startAuthorityProven,
        startGuardProven,
      };
    })
    .filter(
      (item) =>
        item.arenaExpression.length > 0 &&
        item.executionRegion.length > 0,
    )
    .sort((a, b) =>
      a.arenaExpression.localeCompare(
        b.arenaExpression,
      ) ||
      a.executionRegion.localeCompare(
        b.executionRegion,
      )
    );
}


const TERMINAL_PRECEDENCE_BINDING =
  /(?:(?:terminal|result|outcome|winner).*(?:precedence|priority|tie)|(?:precedence|priority|tie).*(?:terminal|result|outcome|winner))/i;

function precedenceArrayOutcomes(
  expression: ts.Expression,
): string[] | undefined {
  if (!ts.isArrayLiteralExpression(expression)) {
    return undefined;
  }
  const values = expression.elements
    .map((item) =>
      ts.isStringLiteralLike(item)
        ? item.text.trim()
        : undefined
    )
    .filter(
      (item): item is string =>
        Boolean(item),
    );
  return values.length >= 2
    ? values
    : undefined;
}

function precedenceObjectOutcomes(
  expression: ts.Expression,
): string[] | undefined {
  if (!ts.isObjectLiteralExpression(expression)) {
    return undefined;
  }
  const ranked = expression.properties
    .flatMap((property) => {
      if (!ts.isPropertyAssignment(property)) {
        return [];
      }
      const name =
        declarationMemberName(property.name);
      if (!name) return [];
      const value = property.initializer;
      if (
        !ts.isNumericLiteral(value) &&
        !ts.isStringLiteralLike(value)
      ) {
        return [];
      }
      const rank = Number(value.text);
      return Number.isFinite(rank)
        ? [{ name, rank }]
        : [];
    });
  if (ranked.length < 2) {
    return undefined;
  }
  return ranked
    .sort((a, b) =>
      b.rank - a.rank ||
      a.name.localeCompare(b.name)
    )
    .map((item) => item.name);
}

function functionReferencesBinding(
  node:
    | ts.FunctionDeclaration
    | ts.MethodDeclaration,
  binding: string,
): boolean {
  if (!node.body) return false;
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) return;
    if (
      ts.isIdentifier(current) &&
      current.text === binding
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node.body);
  return found;
}

export function deriveScriptTerminalPrecedenceEvidence(
  text: string,
  source: SourceRef,
): ScriptTerminalPrecedenceEvidence[] {
  const file = ts.createSourceFile(
    source.relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(source.relativePath),
  );

  const policies = new Map<
    string,
    {
      kind:
        | "ordered-outcomes"
        | "priority-table";
      outcomes: readonly string[];
      node: ts.Node;
    }
  >();

  const collect = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      TERMINAL_PRECEDENCE_BINDING.test(
        node.name.text,
      )
    ) {
      const array =
        precedenceArrayOutcomes(
          node.initializer,
        );
      const object =
        array === undefined
          ? precedenceObjectOutcomes(
              node.initializer,
            )
          : undefined;
      if (array) {
        policies.set(node.name.text, {
          kind: "ordered-outcomes",
          outcomes: array,
          node,
        });
      } else if (object) {
        policies.set(node.name.text, {
          kind: "priority-table",
          outcomes: object,
          node,
        });
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(file);

  const output:
    ScriptTerminalPrecedenceEvidence[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node)
      ) &&
      node.body
    ) {
      const name =
        declarationMemberName(node.name);
      if (
        !name ||
        !TERMINAL_FUNCTION_NAME.test(
          name.replace(/[^A-Za-z0-9]/g, ""),
        )
      ) {
        ts.forEachChild(node, visit);
        return;
      }

      for (const [binding, policy] of policies) {
        if (
          !functionReferencesBinding(
            node,
            binding,
          )
        ) {
          continue;
        }
        output.push({
          functionRegion:
            "function:" + name,
          policyBinding: binding,
          policyKind: policy.kind,
          outcomes:
            [...policy.outcomes],
          source:
            lineSource(
              file,
              policy.node,
              source,
            ),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  return output.sort((a, b) =>
    a.functionRegion.localeCompare(
      b.functionRegion,
    ) ||
    a.policyBinding.localeCompare(
      b.policyBinding,
    )
  );
}
