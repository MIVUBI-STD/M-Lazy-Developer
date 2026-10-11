import { describe, expect, it } from "vitest";
import { parseScriptFile, deriveCrossFileCallEdges, type ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  buildGameplayIntentModel,
} from "../../src/inspection/gameplay-intent-stage.js";
import { buildInspectionSemanticIr } from "../../src/diagnosis/semantic-ir-stage.js";

const source = {
  artifactId: "art_test",
  relativePath:
    "behavior_packs/mtt_bp/src/domain/session-state-machine.ts",
};

function parsed(): ParsedScriptFile {
  return {
    identifier: "session-state-machine",
    source,
    imports: [],
    events: [],
    dynamicProperties: [],
    restrictedMutations: [],
    deferredCallbacks: [],
    localFunctionCalls: [{
      callerRegion: "module",
      targetRegion: "function:resetSession",
      targetName: "resetSession",
      source,
    }],
    blockMatchGuards: [],
    methodCalls: [],
    propertyAccesses: [],
    propertyWrites: [],
    entityEventTriggers: [],
    commandLiterals: [],
    lifecycleMemberExposures: [{
      member: "recoveryPolicy",
      candidateSymbols: ["RecoveryPolicy"],
      evidence: "exact-symbol",
      exactSymbol: "RecoveryPolicy",
      source,
    }],
    moduleMemberAccesses: [],
    importedSymbols: [],
    enumValueComparisons: [{
      module: "./types",
      enumName: "SessionState",
      member: "Active",
      symbol: "SessionState.Active",
      operator: "===",
      literal: "active",
      source,
    }],
    stateMutations: [{
      target: "session.state",
      targetName: "state",
      value: {
        kind: "member",
        owner: "SessionState",
        member: "Active",
        symbol: "SessionState.Active",
      },
      executionRegion: "function:resetSession",
      source,
    }],
    typeProperties: [{
      containerName: "ResourceRecord",
      propertyName: "owner",
      typeText: "SessionToken",
      optional: false,
      source,
    }],
    transitionDeclarations: [{
      tableName: "TRANSITIONS",
      stateType: "SessionPhase",
      from: "active",
      to: ["finishing", "failed"],
      source,
    }],
    returnOutcomes: [
      {
        executionRegion: "function:decideReconnect",
        propertyName: "action",
        value: "cleanup",
        source: { ...source, range: {
          lineStart: 10, lineEnd: 10, columnStart: 4, columnEnd: 28,
        } },
      },
      {
        executionRegion: "function:decideReconnect",
        propertyName: "action",
        value: "lobby",
        source,
      },
    ],
    guardedOutcomes: [{
      executionRegion: "function:decideReconnect",
      conditionText: "state.pendingCleanup",
      conditionIdentifiers: ["state", "state.pendingCleanup"],
      predicate: {
        kind: "truthy",
        operand: {
          kind: "path",
          path: "state.pendingCleanup",
        },
      },
      propertyName: "action",
      value: "cleanup",
      conditionSource: source,
      outcomeSource: { ...source, range: {
        lineStart: 10, lineEnd: 10, columnStart: 4, columnEnd: 28,
      } },
    }],
    capabilities: [],
  };
}

describe("gameplay intent stage", () => {


  it("retains both exact return sites for one inferred producer relation", () => {
    const source = {
      artifactId: "world:branches",
      relativePath: "behavior_packs/demo/scripts/main.js",
    };
    const parsed = parseScriptFile("main", [
      'function finishArena(choice) {',
      '  if (choice) return { action: "finish" };',
      '  return { action: "finish" };',
      '}',
    ].join("\n"), source);
    const semanticIr = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const outcomes = (semanticIr.execution.outcomes ?? [])
      .filter(item => item.value === "finish");
    expect(outcomes).toHaveLength(2);
    const model = buildGameplayIntentModel({
      id: "intent:branches", artifactId: source.artifactId,
      parsedScripts: [{ parsed }], semanticIr,
    });
    const producing = model.edges.filter(edge =>
      edge.kind === "produces" &&
      outcomes.some(item => edge.evidenceIds.includes(item.id)));
    expect(producing).toHaveLength(1);
    expect(producing[0]?.status).toBe("inferred");
    expect(outcomes.every(item =>
      producing[0]!.evidenceIds.includes(item.id))).toBe(true);
  });

  it("links exact authored return to inferred gameplay producer without proving completion", () => {
    const origin = {
      artifactId: "world:round",
      relativePath: "behavior_packs/demo/scripts/round.js",
    };
    const parsed = parseScriptFile("round", [
      'function finishArena() { return { action: "finish" }; }',
    ].join("\n"), origin);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const outcome = ir.execution.outcomes?.find(item => item.value === "finish");
    expect(outcome).toBeDefined();
    const build = (semanticIr?: typeof ir) => buildGameplayIntentModel({
      id: "intent:round",
      artifactId: origin.artifactId, parsedScripts: [{ parsed }],
      ...(semanticIr ? { semanticIr } : {}),
    });
    const relations = build(ir).edges.filter(edge =>
      edge.kind === "produces" &&
      edge.evidenceIds.includes(outcome!.id));
    expect(relations.length).toBeGreaterThan(0);
    expect(relations.every(edge => edge.status === "inferred")).toBe(true);
    expect(build().edges.some(edge =>
      edge.kind === "produces" && edge.evidenceIds.includes(outcome!.id)))
      .toBe(false);
    const foreign = { ...ir, execution: { ...ir.execution,
      outcomes: ir.execution.outcomes?.map(item => ({
        ...item, source: { ...item.source, artifactId: "world:foreign" },
      })),
    }};
    expect(build(foreign).edges.some(edge =>
      edge.kind === "produces" && edge.evidenceIds.includes(outcome!.id)))
      .toBe(false);
  });

  it("does not flag an exact state transition already linked to its classified gameplay caller", () => {
    const source = {
      artifactId: "world:classified",
      relativePath: "behavior_packs/demo/scripts/game.js",
    };
    const parsed = parseScriptFile("game", [
      'let phase = "idle";',
      'function resetArena() { phase = "reset"; }',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const intent = buildGameplayIntentModel({
      id: "intent:classified",
      artifactId: source.artifactId,
      parsedScripts: [{ parsed }], semanticIr: ir,
    });
    const linkedWrites = new Set(intent.edges
      .filter(edge => edge.kind === "transitions-to")
      .flatMap(edge => edge.evidenceIds));
    const observedWrite = ir.state.operations.find(op =>
      op.operation === "write" && op.writtenValue?.kind === "literal" &&
      op.writtenValue.value === "reset");
    expect(observedWrite).toBeDefined();
    expect(linkedWrites.has(observedWrite!.id)).toBe(true);
    expect(intent.unknowns.some(item =>
      item.id.startsWith("unknown:uninterpreted-execution:") &&
      item.evidenceIds?.includes(observedWrite!.id))).toBe(false);
  });


  it("accounts for material state writes and returns outside every execution trace", () => {
    const origin = {
      artifactId: "world:isolated",
      relativePath: "behavior_packs/demo/scripts/isolated.js",
    };
    const parsed = parseScriptFile("isolated", [
      'let phase = "idle";',
      'function helper() { phase = "ready"; return { action: "idle" }; }',
    ].join("\n"), origin);
    const semanticIr = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const outside = semanticIr.execution.regions.find(region =>
      region.kind === "script-function" && region.id.includes("helper"));
    const write = semanticIr.state.operations.find(item =>
      item.operation === "write" && item.writtenValue?.kind === "literal" &&
      item.writtenValue.value === "ready");
    const outcome = semanticIr.execution.outcomes?.find(item =>
      item.value === "idle");
    expect(outside).toBeDefined();
    expect(write).toBeDefined();
    expect(outcome).toBeDefined();
    const intent = buildGameplayIntentModel({
      id: "intent:isolated", artifactId: origin.artifactId,
      parsedScripts: [{ parsed }], semanticIr,
    });
    const unknown = intent.unknowns.find(item =>
      item.id === "unknown:uninterpreted-execution:" + outside!.id);
    expect(unknown).toBeDefined();
    expect(unknown?.evidenceIds).toEqual(expect.arrayContaining([
      write!.id, outcome!.id,
    ]));
    expect(intent.evidence.filter(record =>
      unknown?.evidenceIds?.includes(record.id)).every(record =>
        record.locator === origin.relativePath &&
        record.scope === "selected-artifact")).toBe(true);
    expect(intent.nodes.some(node =>
      node.kind === "mechanic" && node.label === "Helper")).toBe(false);
  });

  it("preserves uninterpreted source-backed effects as gameplay unknowns without phantom mechanics", () => {
    const path = "behavior_packs/demo/scripts/opaque.js";
    const source = { artifactId: "world:opaque", relativePath: path };
    const code = [
      'import { world } from "@minecraft/server";',
      'let x = 0;',
      'function doIt() { x = 1; return { action: "done" }; }',
      'world.afterEvents.playerJoin.subscribe(() => doIt());',
    ].join("\n");
    const parsed = parseScriptFile("opaque", code, source);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed }],
    });
    const result = buildGameplayIntentModel({
      id: "intent:opaque", artifactId: source.artifactId,
      parsedScripts: [{ parsed }], semanticIr: ir,
    });
    const unclassified = result.unknowns.filter(item =>
      item.id.startsWith("unknown:uninterpreted-execution:"));
    expect(unclassified.length).toBeGreaterThan(0);
    expect(unclassified.flatMap(item => item.evidenceIds ?? []).length)
      .toBeGreaterThan(0);
    expect(unclassified.every(item => (item.evidenceIds ?? []).every(id =>
      result.evidence.some(item => item.id === id &&
        item.scope === "selected-artifact" && item.locator === path)))).toBe(true);
    expect(result.nodes.some(node => node.kind === "mechanic" &&
      node.label === "Do It")).toBe(false);
    expect(buildGameplayIntentModel({
      id: "intent:no-ir", artifactId: source.artifactId,
      parsedScripts: [{ parsed }],
    }).unknowns.some(item =>
      item.id.startsWith("unknown:uninterpreted-execution:"))).toBe(false);
  });

  it("includes authored source files contained in the selected artifact", () => {
    const authored = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath: "behavior_packs/demo/src/session-state-machine.ts",
      },
    };

    const model = buildGameplayIntentModel({
      id: "selected-authored-source",
      artifactId: "art_test",
      parsedScripts: [{ parsed: parsed() }],
      contractScripts: [{ parsed: authored }],
    });

    expect(
      model.evidence.some(
        (item) =>
          item.locator ===
          "behavior_packs/demo/src/session-state-machine.ts" &&
          item.scope === "selected-artifact",
      ),
    ).toBe(true);
  });


  it("merges selected-artifact surface signals from non-script sources", () => {
    const model = buildGameplayIntentModel({
      id: "multi-source",
      artifactId: "art_test",
      parsedScripts: [],
      supplementalSignals: [{
        id: "signal:spatial-region:arena-six:structure",
        subjectKey: "spatial-region:arena-six",
        nodeKind: "spatial-region",
        label: "Arena Six",
        status: "inferred",
        evidenceOrigin: "structure",
        locator: "structures/arena_six.mcstructure",
        summary: "Physical arena surface.",
      }],
    });

    expect(
      model.nodes.find(
        (node) =>
          node.id ===
          "spatial-region:arena-six",
      ),
    ).toEqual(
      expect.objectContaining({
        kind: "spatial-region",
        status: "inferred",
      }),
    );
    expect(
      model.evidence.find(
        (item) =>
          item.origin === "structure",
      )?.scope,
    ).toBe("selected-artifact");
  });

  it("builds a validated parser-independent model from analyzer signals", () => {
    const model = buildGameplayIntentModel({
      id: "mtt-level-2",
      artifactId: "art_test",
      parsedScripts: [{ parsed: parsed() }],
    });

    expect(
      model.nodes.some(
        (node) =>
          node.id === "state:session-state-active" &&
          node.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.kind === "lifecycle" &&
          node.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.edges.some(
        (edge) =>
          edge.kind === "transitions-to" &&
          edge.to === "state:session-state-active",
      ),
    ).toBe(true);

    expect(
      model.edges.some(
        (edge) =>
          edge.kind === "owns" &&
          edge.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.invariants.some(
        (invariant) =>
          invariant.id ===
            "inv:allowed-transitions:state:session-phase-active" &&
          invariant.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.id === "outcome:decide-reconnect-cleanup" &&
          node.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.edges.some(
        (edge) =>
          edge.from === "outcome:decide-reconnect-cleanup" &&
          edge.kind === "requires" &&
          edge.status === "authored" &&
          edge.to.startsWith("policy:"),
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.kind === "policy" &&
          node.policyPredicate?.kind === "truthy",
      ),
    ).toBe(true);

    expect(
      model.invariants.some(
        (invariant) =>
          invariant.id ===
          "inv:admissible-policy:outcome:decide-reconnect-cleanup" &&
          invariant.status === "authored",
      ),
    ).toBe(true);

    expect(
      model.unknowns.some(
        (unknown) =>
          unknown.id ===
          "unknown:outcome-policy-coverage:outcome:decide-reconnect-lobby" &&
          unknown.blockedSubjectIds.includes(
            "outcome:decide-reconnect-lobby",
          ),
      ),
    ).toBe(true);
  });

  it("prefers typed authored transitions over duplicate untyped runtime transitions", () => {
    const runtimeParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/mtt_bp/scripts/domain/session-state-machine.js",
      },
      typeProperties: [],
      transitionDeclarations: [{
        tableName: "TRANSITIONS",
        from: "active",
        to: ["finishing", "failed"],
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/mtt_bp/scripts/domain/session-state-machine.js",
        },
      }],
    };

    const authoredParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/mtt_bp/src/domain/session-state-machine.ts",
      },
      transitionDeclarations: [{
        tableName: "TRANSITIONS",
        stateType: "SessionPhase",
        from: "active",
        to: ["finishing", "failed"],
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/mtt_bp/src/domain/session-state-machine.ts",
        },
      }],
    };

    const model = buildGameplayIntentModel({
      id: "typed-transition",
      parsedScripts: [{ parsed: runtimeParsed }],
      contractScripts: [{ parsed: authoredParsed }],
    });

    expect(
      model.nodes.some(
        (node) =>
          node.id === "state:session-phase-active",
      ),
    ).toBe(true);

    expect(
      model.nodes.some(
        (node) =>
          node.id === "state:transitions-active",
      ),
    ).toBe(false);
  });

  it("promotes typed authored transition invariants only from authored source input", () => {
    const runtimeParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/session-state-machine.js",
      },
      transitionDeclarations: [{
        tableName: "TRANSITIONS",
        from: "active",
        to: ["finishing", "failed"],
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/scripts/session-state-machine.js",
        },
      }],
    };

    const authoredParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/src/session-state-machine.ts",
      },
      transitionDeclarations: [{
        tableName: "TRANSITIONS",
        stateType: "SessionPhase",
        from: "active",
        to: ["finishing", "failed"],
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/src/session-state-machine.ts",
        },
      }],
    };

    const model = buildGameplayIntentModel({
      id: "authored-transition-invariant",
      parsedScripts: [{ parsed: runtimeParsed }],
      contractScripts: [{ parsed: authoredParsed }],
    });

    expect(
      model.invariants.find(
        (invariant) =>
          invariant.id ===
          "inv:allowed-transitions:state:session-phase-active",
      )?.status,
    ).toBe("authored");
  });

  it("promotes complete authored guard coverage to authored policy invariant", () => {
    const authoredParsed = parsed();

    const model = buildGameplayIntentModel({
      id: "authored-policy-invariant",
      parsedScripts: [],
      contractScripts: [{ parsed: authoredParsed }],
    });

    expect(
      model.invariants.find(
        (invariant) =>
          invariant.id ===
          "inv:admissible-policy:outcome:decide-reconnect-cleanup",
      )?.status,
    ).toBe("authored");
  });

  it("keeps authored policy invariant when runtime duplicate evidence is also present", () => {
    const runtimeParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/session-state-machine.js",
      },
      guardedOutcomes: (parsed().guardedOutcomes ?? []).map((item) => ({
        ...item,
        conditionSource: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/scripts/session-state-machine.js",
        },
        outcomeSource: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/scripts/session-state-machine.js",
        },
      })),
      returnOutcomes: (parsed().returnOutcomes ?? []).map((item) => ({
        ...item,
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/scripts/session-state-machine.js",
        },
      })),
    };

    const authoredParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/src/session-state-machine.ts",
      },
    };

    const model = buildGameplayIntentModel({
      id: "authored-policy-with-runtime-duplicate",
      parsedScripts: [{ parsed: runtimeParsed }],
      contractScripts: [{ parsed: authoredParsed }],
    });

    expect(
      model.invariants.find(
        (invariant) =>
          invariant.id ===
          "inv:admissible-policy:outcome:decide-reconnect-cleanup",
      )?.status,
    ).toBe("authored");
  });

  it("treats explicit policy declarations inside the selected artifact as authored contract evidence", () => {
    const model = buildGameplayIntentModel({
      id: "runtime-policy-invariant",
      parsedScripts: [{ parsed: parsed() }],
    });

    expect(
      model.invariants.find(
        (invariant) =>
          invariant.id ===
          "inv:admissible-policy:outcome:decide-reconnect-cleanup",
      )?.status,
    ).toBe("authored");
  });

  it("merges duplicate semantic relations from runtime and authored sources", () => {
    const runtimeParsed: ParsedScriptFile = {
      ...parsed(),
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/scripts/recovery.js",
      },
      localFunctionCalls: [{
        callerRegion: "function:decideReconnect",
        targetRegion: "function:cleanupSession",
        targetName: "cleanupSession",
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/scripts/recovery.js",
        },
      }],
      typeProperties: [],
      transitionDeclarations: [],
      stateMutations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
    };

    const authoredParsed: ParsedScriptFile = {
      ...runtimeParsed,
      source: {
        artifactId: "art_test",
        relativePath:
          "behavior_packs/demo/src/recovery.ts",
      },
      localFunctionCalls: [{
        callerRegion: "function:decideReconnect",
        targetRegion: "function:cleanupSession",
        targetName: "cleanupSession",
        source: {
          artifactId: "art_test",
          relativePath:
            "behavior_packs/demo/src/recovery.ts",
        },
      }],
    };

    const model = buildGameplayIntentModel({
      id: "relation-merge",
      parsedScripts: [{ parsed: runtimeParsed }],
      contractScripts: [{ parsed: authoredParsed }],
    });

    const matching = model.edges.filter(
      (edge) =>
        edge.kind === "requires" &&
        edge.from === "lifecycle:decide-reconnect" &&
        edge.to === "lifecycle:cleanup-session",
    );

    expect(matching).toHaveLength(1);
    expect(matching[0]?.evidenceIds).toHaveLength(2);
  });

  it("preserves typed authored spatial route profiles", () => {
    const withRoute: ParsedScriptFile = {
      ...parsed(),
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      commandLiterals: [],
      declaredMembers: [],
      spatialRoutePoints: [
        {
          routeId: "bridge",
          location: { x: 0, y: 64, z: 0 },
          index: 600,
          collectionHint: "routePoints",
          source,
        },
        {
          routeId: "bridge",
          location: { x: 10, y: 64, z: 5 },
          index: 601,
          collectionHint: "routePoints",
          source,
        },
      ],
    };

    const model = buildGameplayIntentModel({
      id: "route-model",
      parsedScripts: [{ parsed: withRoute }],
    });

    expect(
      model.nodes.find(
        (node) =>
          node.id === "spatial-region:route-bridge",
      )?.spatialProfile,
    ).toEqual({
      coordinateSpace: "unknown",
      routeId: "bridge",
      collectionHint: "routePoints",
      points: [
        { x: 0, y: 64, z: 0, index: 600 },
        { x: 10, y: 64, z: 5, index: 601 },
      ],
      indexRanges: [{ min: 600, max: 601 }],
    });
  });

  it("preserves proven local route transform metadata", () => {
    const withRoute: ParsedScriptFile = {
      ...parsed(),
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      commandLiterals: [],
      declaredMembers: [],
      spatialRoutePoints: [{
        routeId: "main",
        location: { x: 1, y: 2, z: 3 },
        index: 0,
        source,
      }],
      spatialOffsetTransforms: [{
        functionName: "applyOffset",
        pointParameter: "point",
        contextParameter: "arena",
        offsetPath: "gameplayOffset",
        source,
      }],
      spatialTransformUses: [{
        functionName: "applyOffset",
        pointExpression: "definition.location",
        contextExpression: "arena",
        source,
      }],
    };

    const model = buildGameplayIntentModel({
      id: "local-route-model",
      parsedScripts: [{ parsed: withRoute }],
    });

    expect(
      model.nodes.find(
        (node) =>
          node.id === "spatial-region:route-main",
      )?.spatialProfile,
    ).toEqual({
      coordinateSpace: "local",
      routeId: "main",
      points: [
        { x: 1, y: 2, z: 3, index: 0 },
      ],
      indexRanges: [{ min: 0, max: 0 }],
      transform: {
        kind: "offset",
        offsetPath: "gameplayOffset",
        functionName: "applyOffset",
      },
    });
  });

  it("does not invent intent when no grounded signal exists", () => {
    const empty: ParsedScriptFile = {
      ...parsed(),
      identifier: "main",
      source: { artifactId: "art_test", relativePath: "behavior_packs/demo/scripts/main.js" },
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
    };

    const model = buildGameplayIntentModel({
      id: "unknown-map",
      parsedScripts: [{ parsed: empty }],
    });

    expect(model.nodes).toEqual([]);
    expect(model.unknowns[0]?.id).toBe(
      "unknown:no-intent-signals",
    );
  });
});

describe("exact Semantic IR provenance in Gameplay Intent", () => {
  it("reconciles repeated return sites and resource releases without inventing gameplay proof", () => {
    const source = { artifactId: "map-a",
      relativePath: "behavior_packs/demo/scripts/cleanup.js" };
    const parsed = parseScriptFile("cleanup", [
      'function cleanupArena(mode, player) {',
      '  if (mode === 1) return { action: "release" };',
      '  if (mode === 2) return { action: "release" };',
      '  player.removeTag("playing");',
      '  return { action: "wait" };',
      '}',
      'cleanupArena(1, player);',
    ].join("\n"), source);
    const ir = buildInspectionSemanticIr({
      parsedScripts: [{ parsed }], parsedFunctions: [],
    });
    const model = buildGameplayIntentModel({
      id: "intent:cleanup", artifactId: source.artifactId,
      parsedScripts: [{ parsed }], semanticIr: ir,
    });
    const returns = (ir.execution.outcomes ?? []).filter(
      item => item.propertyName === "action" && item.value === "release");
    expect(returns).toHaveLength(2);
    const outcome = model.nodes.find(node =>
      node.kind === "outcome" && node.label.toLowerCase().includes("release"));
    expect(outcome).toBeDefined();
    expect(returns.every(item => outcome?.evidenceIds.includes(item.id))).toBe(true);
    expect(outcome?.status).toBe("authored");

    const release = (ir.state.resourceActions ?? []).find(item =>
      item.surface === "tag" && item.action === "release");
    expect(release).toBeDefined();
    const cleanup = model.nodes.find(node =>
      node.kind === "lifecycle" && node.label === "Cleanup Arena");
    expect(cleanup?.status).toBe("inferred");
    expect(cleanup?.evidenceIds).toContain(release!.id);
    for (const item of [...returns, release!]) {
      expect(model.evidence.find(e => e.id === item.id)).toEqual(
        expect.objectContaining({
          origin: "source-code", scope: "selected-artifact",
          locator: source.relativePath,
        }));
    }
    expect(model.edges.filter(edge => edge.evidenceIds.some(id =>
      [...returns.map(item => item.id), release!.id].includes(id))))
      .toHaveLength(0);

    const mismatched = buildGameplayIntentModel({
      id: "intent:wrong-ir", parsedScripts: [{ parsed }],
      semanticIr: {
        ...ir,
        execution: { ...ir.execution,
          outcomes: (ir.execution.outcomes ?? []).map(item => ({
            ...item, source: { ...item.source, artifactId: "another-map" },
          })),
        },
        state: { ...ir.state,
          resourceActions: (ir.state.resourceActions ?? []).map(item => ({
            ...item, source: { ...item.source, range: {
              ...item.source.range, columnStart: 100,
            } },
          })),
        },
      },
    });
    expect(mismatched.nodes.some(node => node.evidenceIds.some(id =>
      [...returns.map(item => item.id), release!.id].includes(id)))).toBe(false);
    const withoutIr = buildGameplayIntentModel({
      id: "intent:no-ir", parsedScripts: [{ parsed }],
    });
    expect(withoutIr.nodes.some(node => node.evidenceIds.some(id =>
      [...returns.map(item => item.id), release!.id].includes(id)))).toBe(false);
  });


  it("carries exact named event and scheduler provenance without promoting inferred gameplay", () => {
    const scriptSource = { artifactId: "map-a",
      relativePath: "behavior_packs/a/scripts/events.js" };
    const location = (line: number) => ({ ...scriptSource,
      range: { lineStart: line, columnStart: 1,
        lineEnd: line, columnEnd: 32 } });
    const script = { ...parsed(), identifier: "events",
      source: scriptSource, localFunctionCalls: [],
      events: [{ root: "world", phase: "afterEvents", event: "playerJoin",
        callbackRegion: "function:cleanupSession",
        source: location(12), callbackSource: location(20) },
        { root: "world", phase: "afterEvents", event: "playerJoin",
          source: location(13) }],
      deferredCallbacks: [
        { scheduler: "runInterval", source: location(30),
          callerRegion: "function:waveTick",
          callbackRegion: "function:spawnEnemy",
          guardEvidence: "unresolved", guardIdentifiers: [] },
        { scheduler: "runInterval", source: location(31),
          callerRegion: "function:waveTick",
          callbackRegion: "function:spawnEnemy",
          guardEvidence: "unresolved", guardIdentifiers: [] },
        { scheduler: "runTimeout", source: location(32),
          callerRegion: "function:waveTick",
          guardEvidence: "unresolved", guardIdentifiers: [] },
      ],
    } as ParsedScriptFile;
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed: script }],
    });
    const model = buildGameplayIntentModel({
      id: "intent:events", parsedScripts: [{ parsed: script }],
      semanticIr: ir,
    });
    const coveredEdges = ir.execution.edges.filter(edge =>
      edge.resolution === "resolved" &&
      (edge.kind === "event-dispatch" || edge.kind === "periodic"));
    expect(coveredEdges).toHaveLength(3);
    expect(model.edges.filter(edge =>
      coveredEdges.some(irEdge => edge.evidenceIds.includes(irEdge.id))
    ).every(edge => edge.status === "inferred")).toBe(true);
    for (const edge of coveredEdges) {
      const owner = model.edges.find(item => item.evidenceIds.includes(edge.id));
      expect(owner).toBeDefined();
      expect(owner?.evidenceIds).toContain("time:" + edge.id);
      expect(model.evidence.find(item => item.id === edge.id)?.scope)
        .toBe("selected-artifact");
    }
    const unresolved = ir.execution.edges.filter(edge => edge.resolution === "unresolved");
    expect(unresolved).toHaveLength(2);
    expect(unresolved.every(edge =>
      !model.edges.some(intentEdge => intentEdge.evidenceIds.includes(edge.id))
    )).toBe(true);

    const mismatched = buildGameplayIntentModel({
      id: "intent:wrong-artifact", parsedScripts: [{ parsed: script }],
      semanticIr: { ...ir, execution: { ...ir.execution,
        edges: ir.execution.edges.map(edge => ({ ...edge,
          source: { ...edge.source, artifactId: "another-map" } })) } },
    });
    expect(mismatched.edges.some(edge => edge.evidenceIds.some(id =>
      id.startsWith("exec-edge:")))).toBe(false);
  });


  it("connects repeated imported-function call sites to exact IR and inferred Intent without claiming a mechanic", () => {
    const mainPath = "behavior_packs/a/scripts/main.js";
    const arenaPath = "behavior_packs/a/scripts/arena.js";
    const origin = (relativePath: string) => ({
      artifactId: "map:multi-script", relativePath,
    });
    const mainText = [
      'import { world } from "@minecraft/server";',
      'import { createArenaState as restoreArena } from "./arena.js";',
      'function resetArena() { restoreArena(); restoreArena(); }',
      'world.afterEvents.playerLeave.subscribe(() => resetArena());',
    ].join("\n");
    const arenaText = [
      'export function createArenaState() {',
      '  return { action: "finish" };',
      '}',
    ].join("\n");
    const main = parseScriptFile("main", mainText, origin(mainPath));
    const arena = parseScriptFile("arena", arenaText, origin(arenaPath));
    const sources = [{ parsed: main }, { parsed: arena }];
    const crossFileCallEdges = deriveCrossFileCallEdges([
      { path: mainPath, text: mainText, source: origin(mainPath) },
      { path: arenaPath, text: arenaText, source: origin(arenaPath) },
    ]);
    expect(crossFileCallEdges).toHaveLength(2);
    expect(crossFileCallEdges.every(item =>
      item.status === "resolved" &&
      item.targetExport === "createArenaState" &&
      item.targetRegion === "function:createArenaState")).toBe(true);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: sources, crossFileCallEdges,
    });
    const sourceEdges = ir.execution.edges.filter(item =>
      item.kind === "synchronous-call" &&
      item.targetLabel === "restoreArena");
    expect(sourceEdges).toHaveLength(2);
    const build = (semanticIr = ir) => buildGameplayIntentModel({
      id: "intent:cross-file",
      artifactId: "map:multi-script",
      parsedScripts: sources,
      crossFileCallEdges,
      semanticIr,
    });
    const intent = build();
    const crossLink = intent.edges.find(edge =>
      sourceEdges.every(call => edge.evidenceIds.includes(call.id)));
    expect(crossLink).toBeDefined();
    expect(crossLink?.kind).toBe("requires");
    expect(crossLink?.status).toBe("inferred");
    expect(intent.nodes.some(node => node.id === crossLink?.from)).toBe(true);
    expect(intent.nodes.some(node => node.id === crossLink?.to)).toBe(true);
    expect(sourceEdges.every(call =>
      intent.evidence.some(evidence =>
        evidence.id === call.id &&
        evidence.scope === "selected-artifact" &&
        evidence.locator === mainPath))).toBe(true);
    expect(ir.execution.outcomes?.some(outcome =>
      outcome.source.relativePath === arenaPath &&
      outcome.value === "finish")).toBe(true);

    const matchesIR = (model: ReturnType<typeof build>) => model.edges
      .some(edge => sourceEdges.some(call => edge.evidenceIds.includes(call.id)));
    // No inference becomes PROVEN just because imported source exists.
    expect(buildGameplayIntentModel({
      id: "intent:no-ir",
      artifactId: "map:multi-script",
      parsedScripts: sources, crossFileCallEdges,
    }).edges.some(edge => edge.status === "authored" &&
      edge.kind === "requires")).toBe(false);
    expect(matchesIR(buildGameplayIntentModel({
      id: "intent:ir-absent",
      artifactId: "map:multi-script",
      parsedScripts: sources, crossFileCallEdges,
    }))).toBe(false);
    const wrongPosition = {
      ...ir,
      execution: { ...ir.execution, edges: ir.execution.edges.map(edge =>
        edge.targetLabel === "restoreArena" ? {
          ...edge, source: { ...edge.source, range: {
            ...edge.source.range!, columnStart: 999,
          } },
        } : edge),
      },
    };
    expect(matchesIR(build(wrongPosition))).toBe(false);
    const partialSourceSpan = crossFileCallEdges.map(call => ({
      ...call,
      source: { ...call.source, range: {
        lineStart: call.source.range!.lineStart,
        columnStart: call.source.range!.columnStart,
      } },
    }));
    expect(matchesIR(buildGameplayIntentModel({
      id: "intent:partial-span",
      artifactId: "map:multi-script",
      parsedScripts: sources,
      crossFileCallEdges: partialSourceSpan,
      semanticIr: ir,
    }))).toBe(false);
    const wrongTarget = {
      ...ir,
      execution: { ...ir.execution, edges: ir.execution.edges.map(edge =>
        edge.targetLabel === "restoreArena"
          ? { ...edge, to: "exec:script:another-module" }
          : edge),
      },
    };
    expect(matchesIR(build(wrongTarget))).toBe(false);
    const wrongArtifact = {
      ...ir,
      execution: { ...ir.execution, edges: ir.execution.edges.map(edge =>
        edge.targetLabel === "restoreArena"
          ? { ...edge, source: { ...edge.source, artifactId: "another-map" } }
          : edge),
      },
    };
    expect(matchesIR(build(wrongArtifact))).toBe(false);
    expect(matchesIR(buildGameplayIntentModel({
      id: "intent:other-artifact",
      artifactId: "different-map",
      parsedScripts: sources, crossFileCallEdges,
      semanticIr: ir,
    }))).toBe(false);
    expect(matchesIR(buildGameplayIntentModel({
      id: "intent:no-cross-file-calls",
      artifactId: "map:multi-script",
      parsedScripts: sources, semanticIr: ir,
    }))).toBe(false);
  });

  it("does not classify cross-file utilities, anonymous callers or ambiguous source ownership as gameplay", () => {
    const root = "behavior_packs/b/scripts/";
    const origin = (relativePath: string) => ({
      artifactId: "world:b", relativePath: root + relativePath,
    });
    const mainText = [
      'import { formatToken, cleanupSession } from "./helpers.js";',
      'function resetArena() { formatToken(); cleanupSession(); }',
      'export function resetCallback() { (() => cleanupSession())(); }',
    ].join("\n");
    const helperText = [
      'export function formatToken() {}',
      'export function cleanupSession() {}',
    ].join("\n");
    const main = parseScriptFile("main", mainText, origin("main.js"));
    const helper = parseScriptFile("helpers", helperText, origin("helpers.js"));
    const cross = deriveCrossFileCallEdges([
      { path: origin("main.js").relativePath, text: mainText,
        source: origin("main.js") },
      { path: origin("helpers.js").relativePath, text: helperText,
        source: origin("helpers.js") },
    ]);
    expect(cross).toHaveLength(3);
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed: main }, { parsed: helper }],
      crossFileCallEdges: cross,
    });
    const build = (calls: typeof cross, scripts = [{ parsed: main }, { parsed: helper }]) =>
      buildGameplayIntentModel({
        id: "intent:classified-only", artifactId: "world:b",
        parsedScripts: scripts, crossFileCallEdges: calls, semanticIr: ir,
      });
    const model = build(cross);
    const matched = ir.execution.edges.filter(edge =>
      edge.kind === "synchronous-call" &&
      edge.targetLabel === "cleanupSession" &&
      model.edges.some(relation => relation.evidenceIds.includes(edge.id)));
    // Only the named resetArena -> cleanupSession call is classified;
    // a formatter utility and an anonymous callback do not become mechanics.
    expect(matched).toHaveLength(1);
    expect(matched[0]?.from).toContain("function%3AresetArena");
    expect(model.edges.every(edge => edge.status !== "authored" ||
      !matched.some(call => edge.evidenceIds.includes(call.id)))).toBe(true);
    expect(build(cross.map(call => ({ ...call, status: "unresolved" as const })))
      .edges.some(edge => edge.evidenceIds.includes(matched[0]!.id))).toBe(false);
    const duplicateOwnership = build(cross, [
      { parsed: main }, { parsed: helper }, { parsed: helper },
    ]);
    expect(duplicateOwnership.edges.some(edge =>
      edge.evidenceIds.includes(matched[0]!.id))).toBe(false);
  });

  it("links only the same call site/regions and keeps game-purpose inference unproven", () => {
    const scriptSource = { artifactId: "map-a",
      relativePath: "behavior_packs/a/scripts/wave.js" };
    const callSite = { ...scriptSource, range: {
      lineStart: 8, columnStart: 5, lineEnd: 8, columnEnd: 28,
    }};
    const script = { ...parsed(), identifier: "wave",
      source: scriptSource,
      localFunctionCalls: [
        { callerRegion: "function:waveTick", targetRegion: "function:spawnEnemy",
          targetName: "spawnEnemy", source: callSite },
        { callerRegion: "function:waveTick", targetRegion: "function:spawnEnemy",
          targetName: "spawnEnemy", source: { ...callSite,
            range: { ...callSite.range, lineStart: 9, lineEnd: 9 } } },
      ],
    } as ParsedScriptFile;
    const ir = buildInspectionSemanticIr({
      parsedFunctions: [], parsedScripts: [{ parsed: script }],
    });
    const model = buildGameplayIntentModel({
      id: "intent:wave", parsedScripts: [{ parsed: script }], semanticIr: ir,
    });
    const callEdges = ir.execution.edges.filter(edge =>
      edge.kind === "synchronous-call");
    expect(callEdges).toHaveLength(2);
    // waveTick is lexically classified as a resource because "tick" is a
    // resource term; provenance must not depend on guessed mechanic labels.
    const inferred = model.edges.find(edge =>
      callEdges.every(call => edge.evidenceIds.includes(call.id)));
    expect(inferred).toBeDefined();
    expect(inferred?.status).toBe("inferred");
    for (const edge of callEdges) {
      expect(inferred?.evidenceIds).toContain(edge.id);
      expect(model.evidence.some(item => item.id === edge.id &&
        item.scope === "selected-artifact" &&
        item.locator === scriptSource.relativePath)).toBe(true);
    }
    const differentMap = { ...ir,
      execution: { ...ir.execution, edges: ir.execution.edges.map(edge => ({
        ...edge, source: { ...edge.source, artifactId: "map-b" },
      })) },
    };
    const mismatched = buildGameplayIntentModel({
      id: "intent:mismatch", parsedScripts: [{ parsed: script }],
      semanticIr: differentMap,
    });
    expect(mismatched.edges.some(edge =>
      edge.evidenceIds.some(id => id.startsWith("exec-edge:")))).toBe(false);

    const wrongLocation = { ...ir,
      execution: { ...ir.execution, edges: ir.execution.edges.map(edge => ({
        ...edge, source: { ...edge.source,
          range: { ...edge.source.range, columnStart: 99 } },
      })) },
    };
    const unaligned = buildGameplayIntentModel({
      id: "intent:wrong-call-position",
      parsedScripts: [{ parsed: script }], semanticIr: wrongLocation,
    });
    expect(unaligned.edges.some(edge =>
      edge.evidenceIds.some(id => id.startsWith("exec-edge:")))).toBe(false);

    const withoutIr = buildGameplayIntentModel({
      id: "intent:without-ir", parsedScripts: [{ parsed: script }],
    });
    expect(withoutIr.edges.some(edge =>
      edge.evidenceIds.some(id => id.startsWith("exec-edge:")))).toBe(false);
  });
});


describe("same-named source-owned operations (universal semantic isolation)", () => {
  it("does not invent a source-state alias question when one exact script-memory target has multiple writers", () => {
    const owner = {
      artifactId: "selected:one-source",
      relativePath: "behavior_packs/p/scripts/round.js",
    };
    const one = parsed();
    const stateWrite = one.stateMutations![0]!;
    const script = {
      ...one,
      source: owner,
      identifier: owner.relativePath,
      localFunctionCalls: [],
      lifecycleMemberExposures: [],
      typeProperties: [],
      enumValueComparisons: [],
      transitionDeclarations: [],
      returnOutcomes: [],
      guardedOutcomes: [],
      stateMutations: [
        {
          ...stateWrite,
          executionRegion: "function:resetArena",
          source: owner,
        },
        {
          ...stateWrite,
          executionRegion: "function:decideReconnect",
          source: owner,
        },
      ],
    } satisfies ParsedScriptFile;
    const result = buildGameplayIntentModel({
      id: "intent:one-memory-source",
      artifactId: owner.artifactId,
      parsedScripts: [{ parsed: script }],
    });
    expect(result.nodes.filter(node =>
      node.id === "state:session-state-active")).toHaveLength(1);
    expect(result.unknowns.some(item =>
      item.id.startsWith("unknown:source-state-alias:"))).toBe(false);
  });

  it("keeps actor/effect candidate links inside the module that actually authored them", () => {
    const artifactId = "selected:two-modes";
    const paths = [
      "behavior_packs/p/scripts/a.js",
      "behavior_packs/p/scripts/b.js",
    ];
    const scripts = paths.map(relativePath => {
      const owner = { artifactId, relativePath };
      return {
        ...parsed(),
        identifier: relativePath,
        source: owner,
        localFunctionCalls: [{
          callerRegion: "function:startWave",
          targetRegion: "function:resetArena",
          targetName: "resetArena",
          source: owner,
        }],
        stateMutations: [{
          target: "session.state",
          targetName: "state",
          value: {
            kind: "member" as const,
            owner: "SessionState",
            member: "Active",
            symbol: "SessionState.Active",
          },
          executionRegion: "function:resetArena",
          source: owner,
        }],
        returnOutcomes: [{
          executionRegion: "function:resetArena",
          propertyName: "action",
          value: "finish",
          source: owner,
        }],
        guardedOutcomes: [],
        enumValueComparisons: [],
        transitionDeclarations: [],
        typeProperties: [],
        lifecycleMemberExposures: [],
      } satisfies ParsedScriptFile;
    });
    const model = buildGameplayIntentModel({
      id: "intent:separate-source-modes",
      artifactId,
      parsedScripts: scripts.map(parsed => ({ parsed })),
    });
    const pathSuffixes = paths.map(path =>
      ":site:" + encodeURIComponent(path) + ":");
    for (const path of paths) {
      const ownerBase = ":site:" + encodeURIComponent(path) + ":";
      const start = "mechanic:start-wave" + ownerBase +
        encodeURIComponent("function:startWave");
      const resetSite = ownerBase +
        encodeURIComponent("function:resetArena");
      const reset = "lifecycle:reset-arena" + resetSite;
      const state = "state:session-state-active:memory:" +
        encodeURIComponent(path) + ":" + encodeURIComponent("session.state");
      const result = "outcome:reset-arena-finish" + resetSite;
      expect(model.nodes.some(node => node.id === start)).toBe(true);
      expect(model.nodes.some(node => node.id === reset)).toBe(true);
      expect(model.nodes.some(node => node.id === state)).toBe(true);
      expect(model.nodes.some(node => node.id === result)).toBe(true);
      expect(model.edges.some(edge =>
        edge.from === start && edge.to === reset &&
        edge.kind === "requires")).toBe(true);
      expect(model.edges.some(edge =>
        edge.from === reset && edge.to === state &&
        edge.kind === "transitions-to")).toBe(true);
      expect(model.edges.some(edge =>
        edge.from === reset && edge.to === result &&
        edge.kind === "produces")).toBe(true);
    }
    expect(model.edges.every(edge => {
      const from = pathSuffixes.find(suffix => edge.from.includes(suffix));
      const to = pathSuffixes.find(suffix => edge.to.includes(suffix));
      return from === undefined || to === undefined || from === to;
    })).toBe(true);
    expect(model.nodes.filter(node =>
      node.id.startsWith("lifecycle:reset-arena:site:"))).toHaveLength(2);
    const aliasQuestions = model.unknowns.filter(item =>
      item.id === "unknown:source-state-alias:" +
        encodeURIComponent("state:session-state-active"));
    expect(aliasQuestions).toHaveLength(1);
    expect(aliasQuestions[0]?.blockedSubjectIds).toEqual(paths.map(path =>
      "state:session-state-active:memory:" + encodeURIComponent(path) +
      ":" + encodeURIComponent("session.state")).sort());
    expect(aliasQuestions[0]?.evidenceIds).toHaveLength(2);
    expect(aliasQuestions[0]?.question).toContain(
      "player/session/arena/mode scope are NOT established");
    const sourceBindings = model.evidence.filter(item =>
      item.scope === "selected-artifact" &&
      paths.includes(item.locator));
    expect(sourceBindings.length).toBeGreaterThan(0);
    // Source-specific identity isn't evidence that any call actually ran.
    expect(model.edges.some(edge => edge.status === "authored" &&
      edge.kind === "produces")).toBe(false);
  });
});


describe("exact authored return-policy source admission", () => {
  it("retains unguarded uncertainty when an authored predicate points to a different return source site", () => {
    const base = parsed();
    const wrong = {
      ...base,
      guardedOutcomes: base.guardedOutcomes!.map(guard => ({
        ...guard,
        outcomeSource: {
          ...base.source,
          range: { lineStart: 30, lineEnd: 30,
            columnStart: 1, columnEnd: 24 },
        },
      })),
    } satisfies ParsedScriptFile;
    const intent = buildGameplayIntentModel({
      id: "intent:mismatched-return-guard",
      artifactId: base.source.artifactId,
      parsedScripts: [{ parsed: wrong }],
    });
    expect(intent.nodes.some(node =>
      node.id === "outcome:decide-reconnect-cleanup")).toBe(true);
    expect(intent.edges.some(edge =>
      edge.from === "outcome:decide-reconnect-cleanup" &&
      edge.kind === "requires" &&
      intent.nodes.find(item => item.id === edge.to)?.kind === "policy"))
      .toBe(false);
    expect(intent.invariants.some(item =>
      item.id === "inv:admissible-policy:outcome:decide-reconnect-cleanup"))
      .toBe(false);
    const unresolved = intent.unknowns.find(item =>
      item.id === "unknown:outcome-policy-coverage:outcome:decide-reconnect-cleanup");
    expect(unresolved).toBeDefined();
    expect(unresolved?.blockedSubjectIds).toContain(
      "outcome:decide-reconnect-cleanup");
    expect(unresolved?.evidenceIds?.length).toBeGreaterThan(0);
  });

  it("does not import matching-path returns from a foreign artifact into the selected map", () => {
    const selected = parsed();
    const stale = { ...selected.source, artifactId: "previous-map-release" };
    const foreign = {
      ...selected,
      source: stale,
      identifier: "previous-script",
      returnOutcomes: [{
        executionRegion: "function:decideReconnect",
        propertyName: "action",
        value: "victory",
        source: { ...stale, range: {
          lineStart: 5, lineEnd: 5, columnStart: 1, columnEnd: 24,
        } },
      }],
      guardedOutcomes: [],
      localFunctionCalls: [],
      enumValueComparisons: [],
      stateMutations: [],
      typeProperties: [],
      transitionDeclarations: [],
      lifecycleMemberExposures: [],
    } satisfies ParsedScriptFile;
    const model = buildGameplayIntentModel({
      id: "intent:isolated-map-version",
      artifactId: selected.source.artifactId,
      parsedScripts: [{ parsed: selected }, { parsed: foreign }],
      contractScripts: [{ parsed: foreign }],
    });
    expect(model.nodes.some(node =>
      node.id === "outcome:decide-reconnect-cleanup")).toBe(true);
    expect(model.nodes.some(node =>
      node.id === "outcome:decide-reconnect-victory")).toBe(false);
    expect(model.evidence.some(item =>
      item.summary.includes("victory"))).toBe(false);

    const foreignOnly = buildGameplayIntentModel({
      id: "intent:foreign-only",
      artifactId: selected.source.artifactId,
      parsedScripts: [{ parsed: foreign }],
    });
    expect(foreignOnly.nodes).toEqual([]);
    expect(foreignOnly.unknowns.some(item =>
      item.id === "unknown:no-intent-signals")).toBe(true);
  });
});
