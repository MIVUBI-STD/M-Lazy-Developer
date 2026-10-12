import {
  extractGameplayIntentSignals,
  extractGameplayIntentSurfaceSignal,
  type GameplayIntentRelationSignal,
  type GameplayIntentSignal,
} from "../../../../analyzers/gameplay-intent/src/index.js";
import {
  resolveScriptImports,
  type ParsedScriptFile,
  type CrossFileCallEdge,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  ParsedFunction,
} from "../../../../analyzers/functions/src/index.js";
import type { SourceRef } from "../../../project-model/src/index.js";
import { semanticIrExecutionTraces, type SemanticIr } from "../../../semantic-ir/src/index.js";
import { eventRegionId, scriptRegionId } from "../diagnosis/semantic-ir-stage.js";
import {
  validateGameplayIntentModel,
  type GameplayIntentEdge,
  type GameplayIntentEvidence,
  type GameplayIntentInvariant,
  type GameplayIntentModel,
  type GameplayIntentNode,
  type GameplayIntentStatus,
} from "../../../gameplay-intent/src/index.js";

export interface GameplayIntentStageInput {
  id: string;
  artifactId?: string;
  parsedScripts: readonly {
    parsed: ParsedScriptFile;
  }[];
  /** Existing mcfunction source index from the same inspected artifact. */
  parsedFunctions?: readonly {
    parsed: ParsedFunction;
  }[];
  contractScripts?: readonly {
    parsed: ParsedScriptFile;
  }[];
  supplementalSignals?: readonly GameplayIntentSignal[];
  /** Source-resolved imported calls from the same selected artifact as Semantic IR. */
  crossFileCallEdges?: readonly CrossFileCallEdge[];
  /** Built from these same parsed sources; absent in lightweight consumers. */
  semanticIr?: SemanticIr;
}

const STATUS_RANK: Readonly<Record<GameplayIntentStatus, number>> = {
  hypothesis: 0,
  inferred: 1,
  authored: 2,
};

function evidenceId(
  signal: GameplayIntentSignal | GameplayIntentRelationSignal,
): string {
  return "intent-evidence:" + signal.id;
}

function sameExactCallSource(left: SourceRef, right: SourceRef): boolean {
  // Both endpoints require a complete source span. Two missing end
  // coordinates are not evidence that an invocation has exact provenance.
  const a = left.range;
  const b = right.range;
  return left.artifactId === right.artifactId &&
    left.relativePath === right.relativePath &&
    left.jsonPointer === right.jsonPointer &&
    a?.lineStart !== undefined && b?.lineStart !== undefined &&
    a.lineEnd !== undefined && b.lineEnd !== undefined &&
    a.columnStart !== undefined && b.columnStart !== undefined &&
    a.columnEnd !== undefined && b.columnEnd !== undefined &&
    a.lineStart === b.lineStart &&
    a.lineEnd === b.lineEnd &&
    a.columnStart === b.columnStart &&
    a.columnEnd === b.columnEnd;
}

export function buildGameplayIntentModel(
  input: GameplayIntentStageInput,
): GameplayIntentModel {
  const contractScripts = input.contractScripts ?? [];
  // Filter by artifact ID BEFORE classification. Identical relative paths
  // across map versions are not equivalent source authority and must not
  // contribute nodes, return policies, or alias/intent evidence.
  const currentScript = (entry: { parsed: ParsedScriptFile }): boolean =>
    input.artifactId === undefined ||
    entry.parsed.source.artifactId === input.artifactId;
  const selectedScripts = input.parsedScripts.filter(currentScript);
  const selectedContracts = contractScripts.filter(currentScript);
  const selectedCalls = (input.crossFileCallEdges ?? []).filter(call =>
    input.artifactId === undefined ||
    call.source.artifactId === input.artifactId);
  const extractedBase = extractGameplayIntentSignals([
    ...selectedScripts.map(item => item.parsed),
    ...selectedContracts.map(item => item.parsed),
  ], selectedCalls);
  const supplementalSignals =
    input.supplementalSignals ?? [];
  const extracted = {
    ...extractedBase,
    signals: [
      ...extractedBase.signals,
      ...supplementalSignals,
    ],
  };
  const selectedArtifactSourcePaths = new Set([
    ...selectedScripts.map(item => item.parsed.source.relativePath),
    ...selectedContracts.map(item => item.parsed.source.relativePath),
    ...(input.parsedFunctions ?? []).filter(item =>
      input.artifactId === undefined ||
      item.parsed.source.artifactId === input.artifactId,
    ).map(item => item.parsed.source.relativePath),
    ...supplementalSignals.map(
      (signal) => signal.locator,
    ),
  ]);

  const evidence = new Map<string, GameplayIntentEvidence>();
  const nodes = new Map<string, GameplayIntentNode>();
  const edges = new Map<string, GameplayIntentEdge>();
  const invariants = new Map<string, GameplayIntentInvariant>();
  const intentUnknowns: GameplayIntentModel["unknowns"][number][] = [];


  // Only an exact authored assignment (target, value, region, location and
  // artifact) may inherit its Semantic IR identity. Same-named state labels,
  // source co-location and ambiguous matches are not state-transition proof.
  const exactStateMutationIrEvidenceIds = (
    origins: GameplayIntentSignal["stateMutationOrigins"],
  ): string[] => {
    if (!input.semanticIr) return [];
    const linked = new Set<string>();
    for (const origin of origins ?? []) {
      if (origin.scriptSource.artifactId !== origin.mutation.source.artifactId ||
          origin.scriptSource.relativePath !== origin.mutation.source.relativePath) {
        continue;
      }
      const surfaces = input.semanticIr.state.surfaces.filter(surface =>
        surface.ref.kind === "script-memory" &&
        surface.ref.key === origin.scriptSource.relativePath + "::" + origin.mutation.target);
      if (surfaces.length !== 1) continue;
      const matches = input.semanticIr.state.operations.filter(operation =>
        operation.operation === "write" &&
        operation.surfaceId === surfaces[0]!.id &&
        operation.executionRegionId === scriptRegionId(
          origin.scriptSource, origin.mutation.executionRegion,
        ) &&
        (origin.mutation.value.kind === "literal"
          ? operation.writtenValue?.kind === "literal" &&
            operation.writtenValue.value === origin.mutation.value.literal
          : operation.writtenValue?.kind === "member" &&
            operation.writtenValue.symbol === origin.mutation.value.symbol) &&
        sameExactCallSource(operation.source, origin.mutation.source));
      if (matches.length !== 1) continue;
      const match = matches[0]!;
      linked.add(match.id);
      evidence.set(match.id, {
        id: match.id,
        origin: "source-code",
        locator: match.source.relativePath,
        scope: "selected-artifact",
        summary: "Exact authored state-write identity; effective state, transition and runtime result remain unproven.",
      });
    }
    return [...linked].sort();
  };

  // Register technical evidence on the existing inferred/authored subject
  // only with an exact parsed producer -> IR identity. This does not upgrade
  // intent status or prove runtime completion.
  const signalIrEvidenceIds = (signal: GameplayIntentSignal): string[] => {
    if (!input.semanticIr) return [];
    const linked = new Set<string>(exactStateMutationIrEvidenceIds(
      signal.stateMutationOrigins,
    ));
    // Exact IR region identity for observed classified function symbols.
    // Region membership does not prove invocation or player-visible behavior.
    for (const origin of signal.executionRegionOrigins ?? []) {
      if (input.artifactId !== undefined &&
          input.artifactId !== origin.scriptSource.artifactId) continue;
      const id = scriptRegionId(origin.scriptSource, origin.region);
      const matches = input.semanticIr.execution.regions.filter(item =>
        item.id === id &&
        item.kind === "script-function" &&
        item.ownerId === origin.scriptIdentifier &&
        item.label === origin.region &&
        item.source?.artifactId === origin.scriptSource.artifactId &&
        item.source.relativePath === origin.scriptSource.relativePath);
      if (matches.length !== 1) continue;
      const match = matches[0]!;
      linked.add(match.id);
      evidence.set(match.id, {
        id: match.id,
        origin: "source-code",
        locator: origin.scriptSource.relativePath,
        scope: "selected-artifact",
        summary: "Parser-observed named function region linked to a classified source candidate; execution and gameplay effect remain unproven.",
      });
    }
    for (const origin of signal.returnOutcomeOrigins ?? []) {
      if (origin.scriptSource.artifactId !== origin.outcome.source.artifactId ||
          origin.scriptSource.relativePath !== origin.outcome.source.relativePath) {
        continue;
      }
      const matches = (input.semanticIr.execution.outcomes ?? []).filter(item =>
        item.executionRegionId === scriptRegionId(
          origin.scriptSource, origin.outcome.executionRegion,
        ) &&
        item.propertyName === origin.outcome.propertyName &&
        item.value === origin.outcome.value &&
        sameExactCallSource(item.source, origin.outcome.source));
      if (matches.length !== 1) continue;
      const match = matches[0]!;
      linked.add(match.id);
      evidence.set(match.id, {
        id: match.id,
        origin: "source-code",
        locator: match.source.relativePath,
        scope: "selected-artifact",
        summary: "Exact authored return-site identity; game terminal meaning and activation are not established.",
      });
    }
    for (const origin of signal.resourceActionOrigins ?? []) {
      if (origin.scriptSource.artifactId !== origin.action.source.artifactId ||
          origin.scriptSource.relativePath !== origin.action.source.relativePath) {
        continue;
      }
      const matches = (input.semanticIr.state.resourceActions ?? []).filter(item =>
        item.executionRegionId === scriptRegionId(
          origin.scriptSource, origin.action.executionRegion,
        ) &&
        item.surface === origin.action.surface &&
        item.action === origin.action.action &&
        item.key === origin.action.key &&
        item.precision === origin.action.precision &&
        sameExactCallSource(item.source, origin.action.source));
      if (matches.length !== 1) continue;
      const match = matches[0]!;
      linked.add(match.id);
      evidence.set(match.id, {
        id: match.id,
        origin: "source-code",
        locator: match.source.relativePath,
        scope: "selected-artifact",
        summary: "Exact authored resource action inside a classified function; release does not prove gameplay cleanup.",
      });
    }
    return [...linked].sort();
  };

  // Aggregate one source-alias question per lexical value rather than
  // creating a new unknown for every write site in the same state surface.
  const stateAliasQuestions = new Map<string, {
    readonly subjectIds: Set<string>;
    readonly evidenceIds: Set<string>;
  }>();

  for (const signal of extracted.signals) {
    const id = evidenceId(signal);
    const signalScope =
      selectedArtifactSourcePaths.has(signal.locator)
        ? "selected-artifact" as const
        : undefined;
    evidence.set(id, {
      id,
      origin: signal.evidenceOrigin,
      locator: signal.locator,
      summary: signal.summary,
      ...(signalScope === undefined
        ? {}
        : { scope: signalScope }),
    });

    const exactTechnicalEvidenceIds = signalIrEvidenceIds(signal);
    const signalEvidenceIds = [id, ...exactTechnicalEvidenceIds];
    if (signalScope === "selected-artifact" &&
        signal.sourceStateCollisionBaseKey !== undefined) {
      const key = signal.sourceStateCollisionBaseKey;
      const group = stateAliasQuestions.get(key) ?? {
        subjectIds: new Set<string>(),
        evidenceIds: new Set<string>(),
      };
      group.subjectIds.add(signal.subjectKey);
      group.evidenceIds.add(id);
      stateAliasQuestions.set(key, group);
    }
    const existing = nodes.get(signal.subjectKey);
    if (!existing) {
      nodes.set(signal.subjectKey, {
        id: signal.subjectKey,
        kind: signal.nodeKind,
        label: signal.label,
        status: signal.status,
        evidenceIds: signalEvidenceIds,
        ...(signal.policyPredicate === undefined
          ? {}
          : { policyPredicate: signal.policyPredicate }),
        ...(signal.spatialProfile === undefined
          ? {}
          : { spatialProfile: signal.spatialProfile }),
      });
      continue;
    }

    const mergedEvidence = [
      ...new Set([...existing.evidenceIds, ...signalEvidenceIds]),
    ].sort();

    nodes.set(signal.subjectKey, {
      ...existing,
      status:
        STATUS_RANK[signal.status] > STATUS_RANK[existing.status]
          ? signal.status
          : existing.status,
      evidenceIds: mergedEvidence,
      ...(existing.policyPredicate !== undefined
        ? { policyPredicate: existing.policyPredicate }
        : signal.policyPredicate !== undefined
        ? { policyPredicate: signal.policyPredicate }
        : {}),
      ...(existing.spatialProfile !== undefined
        ? { spatialProfile: existing.spatialProfile }
        : signal.spatialProfile !== undefined
        ? { spatialProfile: signal.spatialProfile }
        : {}),
    });
  }

  for (const [valueKey, group] of [...stateAliasQuestions]
    .sort(([a], [b]) => a.localeCompare(b))) {
    if (group.subjectIds.size < 2) continue;
    intentUnknowns.push({
      id: "unknown:source-state-alias:" + encodeURIComponent(valueKey),
      question: "Multiple independently authored script-memory targets " +
        "produce this same lexical state value. Exact source ownership is " +
        "known, but shared runtime identity, cross-module aliasing, and " +
        "player/session/arena/mode scope are NOT established. Resolve " +
        "the storage/alias path before combining these state subjects.",
      blockedSubjectIds: [...group.subjectIds].sort(),
      evidenceIds: [...group.evidenceIds].sort(),
    });
  }

  for (const relation of extracted.relations) {
    if (
      !nodes.has(relation.fromSubjectKey) ||
      !nodes.has(relation.toSubjectKey)
    ) {
      continue;
    }

    const id = evidenceId(relation);
    const relationScope =
      selectedArtifactSourcePaths.has(relation.locator)
        ? "selected-artifact" as const
        : undefined;
    evidence.set(id, {
      id,
      origin: relation.evidenceOrigin,
      locator: relation.locator,
      summary: relation.summary,
      ...(relationScope === undefined
        ? {}
        : { scope: relationScope }),
    });

    // Carry exact IR identity across the existing intent edge, but do not
    // upgrade the inferred gameplay purpose of a syntactic function call.
    const exactIrEvidenceIds = new Set<string>();
    if (relation.edgeKind === "requires" && input.semanticIr) {
      for (const origin of relation.localCallOrigins ?? []) {
        if (origin.scriptSource.artifactId !== origin.call.source.artifactId ||
            origin.scriptSource.relativePath !== origin.call.source.relativePath) {
          continue;
        }
        const matches = input.semanticIr.execution.edges.filter(edge =>
          edge.kind === "synchronous-call" &&
          edge.resolution === "resolved" &&
          edge.from === scriptRegionId(origin.scriptSource, origin.call.callerRegion) &&
          edge.to === scriptRegionId(origin.scriptSource, origin.call.targetRegion) &&
          edge.targetLabel === origin.call.targetName &&
          sameExactCallSource(edge.source, origin.call.source));
        if (matches.length !== 1) continue;
        const matched = matches[0]!;
        exactIrEvidenceIds.add(matched.id);
        evidence.set(matched.id, {
          id: matched.id,
          origin: "source-code",
          locator: matched.source.relativePath,
          scope: "selected-artifact",
          summary: "Exact Semantic IR call edge from parsed source location; gameplay dependency remains inferred.",
        });
      }
    }
    if (relation.edgeKind === "requires" && input.semanticIr) {
      for (const origin of relation.crossFileCallOrigins ?? []) {
        const call = origin.call;
        if (call.status !== "resolved" ||
            call.targetModule === undefined || call.targetRegion === undefined ||
            origin.scriptSource.artifactId !== call.source.artifactId ||
            origin.targetScriptSource.artifactId !== call.source.artifactId ||
            origin.scriptSource.relativePath !== call.callerModule ||
            origin.targetScriptSource.relativePath !== call.targetModule ||
            (input.artifactId !== undefined &&
              input.artifactId !== call.source.artifactId)) continue;
        const matches = input.semanticIr.execution.edges.filter(edge =>
          edge.kind === "synchronous-call" &&
          edge.resolution === "resolved" &&
          edge.from === scriptRegionId(origin.scriptSource, call.callerRegion) &&
          edge.to === scriptRegionId(origin.targetScriptSource, call.targetRegion!) &&
          edge.targetLabel === call.localName &&
          sameExactCallSource(edge.source, call.source));
        if (matches.length !== 1) continue;
        const matched = matches[0]!;
        exactIrEvidenceIds.add(matched.id);
        evidence.set(matched.id, {
          id: matched.id,
          origin: "source-code",
          locator: matched.source.relativePath,
          scope: "selected-artifact",
          summary: "Exact cross-script Semantic IR call site and executable target. Gameplay purpose and actual execution remain inferred.",
        });
      }
    }
    if (input.semanticIr) {
      for (const origin of relation.callbackOrigins ?? []) {
        const source = origin.kind === "event"
          ? origin.event.source : origin.callback.source;
        if (origin.scriptSource.artifactId !== source.artifactId ||
            origin.scriptSource.relativePath !== source.relativePath) {
          continue;
        }
        const from = origin.kind === "event"
          ? eventRegionId(origin.event.root, origin.event.phase,
              origin.event.event, source)
          : scriptRegionId(origin.scriptSource,
              origin.callback.callerRegion ?? "module");
        const toRegion = origin.kind === "event"
          ? origin.event.callbackRegion : origin.callback.callbackRegion;
        if (!toRegion) continue;
        const target = scriptRegionId(origin.scriptSource, toRegion);
        const expectedKind = origin.kind === "event"
          ? "event-dispatch"
          : origin.callback.scheduler === "runInterval"
            ? "periodic" : "deferred";
        const expectedLabel = origin.kind === "event"
          ? origin.scriptIdentifier + ":" + toRegion : toRegion;
        const matches = input.semanticIr.execution.edges.filter(edge =>
          edge.kind === expectedKind &&
          edge.resolution === "resolved" &&
          edge.from === from && edge.to === target &&
          edge.targetLabel === expectedLabel &&
          (origin.kind !== "scheduler" ||
            edge.scheduler === origin.callback.scheduler) &&
          sameExactCallSource(edge.source, source));
        if (matches.length !== 1) continue;
        const matched = matches[0]!;
        exactIrEvidenceIds.add(matched.id);
        evidence.set(matched.id, {
          id: matched.id,
          origin: "source-code",
          locator: matched.source.relativePath,
          scope: "selected-artifact",
          summary: "Exact Semantic IR event/scheduler execution edge; gameplay purpose remains inferred.",
        });
        const temporalMatches = input.semanticIr.temporal.relations.filter(item =>
          item.id === "time:" + matched.id &&
          item.from === matched.from &&
          item.to === matched.to &&
          item.resolution === "resolved" &&
          sameExactCallSource(item.source, source));
        if (temporalMatches.length !== 1) continue;
        const temporal = temporalMatches[0]!;
        exactIrEvidenceIds.add(temporal.id);
        evidence.set(temporal.id, {
          id: temporal.id,
          origin: "source-code",
          locator: temporal.source.relativePath,
          scope: "selected-artifact",
          summary: "Exact Semantic IR temporal relation; runtime scheduling remains unverified.",
        });
      }
    }
    if (relation.edgeKind === "transitions-to") {
      for (const matchedId of exactStateMutationIrEvidenceIds(
        relation.stateMutationOrigins,
      )) exactIrEvidenceIds.add(matchedId);
    }
    // Exact guard/return witnesses also belong on the authored "requires"
    // relation; they do not upgrade source order into runtime causality.
    if ((relation.edgeKind === "produces" ||
         relation.edgeKind === "requires") && input.semanticIr) {
      for (const origin of relation.returnOutcomeOrigins ?? []) {
        if (origin.scriptSource.artifactId !== origin.outcome.source.artifactId ||
            origin.scriptSource.relativePath !== origin.outcome.source.relativePath ||
            (input.artifactId !== undefined &&
              input.artifactId !== origin.outcome.source.artifactId)) continue;
        const matches = (input.semanticIr.execution.outcomes ?? []).filter(item =>
          item.executionRegionId === scriptRegionId(
            origin.scriptSource, origin.outcome.executionRegion,
          ) &&
          item.propertyName === origin.outcome.propertyName &&
          item.value === origin.outcome.value &&
          sameExactCallSource(item.source, origin.outcome.source));
        if (matches.length !== 1) continue;
        const matched = matches[0]!;
        exactIrEvidenceIds.add(matched.id);
        evidence.set(matched.id, {
          id: matched.id, origin: "source-code",
          locator: matched.source.relativePath, scope: "selected-artifact",
          summary: "Exact authored return for inferred producer relationship; gameplay meaning and execution remain unproven.",
        });
      }
    }
    const relationEvidenceIds = [id, ...exactIrEvidenceIds].sort();

    const semanticKey = [
      relation.edgeKind,
      relation.fromSubjectKey,
      relation.toSubjectKey,
    ].join("::");

    const existing = edges.get(semanticKey);
    if (!existing) {
      edges.set(semanticKey, {
        id:
          "intent-edge:" +
          relation.edgeKind + ":" +
          relation.fromSubjectKey + ":" +
          relation.toSubjectKey,
        from: relation.fromSubjectKey,
        to: relation.toSubjectKey,
        kind: relation.edgeKind,
        status: relation.status,
        evidenceIds: relationEvidenceIds,
      });
      continue;
    }

    edges.set(semanticKey, {
      ...existing,
      status:
        STATUS_RANK[relation.status] >
        STATUS_RANK[existing.status]
          ? relation.status
          : existing.status,
      evidenceIds: [
        ...new Set([...existing.evidenceIds, ...relationEvidenceIds]),
      ].sort(),
    });
  }


  // Reconcile the mcfunction source owner with the Semantic IR already
  // produced by this inspection. Only individually identified, classified
  // functions participate; name similarity alone is never a new mechanic.
  // Graph edges below are source-observed, inferred dependencies, not
  // assertions about command success or Minecraft runtime state.
  if (input.semanticIr && input.parsedFunctions?.length) {
    const sourceFunctions = input.parsedFunctions
      .flatMap(({ parsed }) => {
        if (input.artifactId !== undefined &&
            parsed.source.artifactId !== input.artifactId) return [];
        const candidate = extractGameplayIntentSurfaceSignal({
          label: parsed.identifier,
          locator: parsed.source.relativePath,
          evidenceOrigin: "source-code",
        });
        // A source candidate must be in the current authoritative surface
        // signal inventory; do not invent it during orchestration.
        if (!candidate ||
            !supplementalSignals.some(signal =>
              signal.id === candidate.id &&
              signal.subjectKey === candidate.subjectKey &&
              signal.evidenceOrigin === "source-code" &&
              signal.locator === parsed.source.relativePath) ||
            !nodes.has(candidate.subjectKey)) return [];
        const regions = input.semanticIr!.execution.regions.filter(region =>
          region.kind === "mcfunction" &&
          region.ownerId === parsed.identifier &&
          region.source?.artifactId === parsed.source.artifactId &&
          region.source.relativePath === parsed.source.relativePath);
        if (regions.length !== 1) return [];
        return [{ parsed, subjectId: candidate.subjectKey, region: regions[0]! }];
      });
    const uniqueRegionOwners = new Map<string, typeof sourceFunctions>();
    for (const owner of sourceFunctions) {
      const list = uniqueRegionOwners.get(owner.region.id) ?? [];
      list.push(owner);
      uniqueRegionOwners.set(owner.region.id, list);
    }
    // A lexical subject key may match distinct mcfunctions in different
    // packs. Do not merge those executable owners into one gameplay node;
    // their IR records remain independently visible as Discovery residue.
    const uniqueSubjectOwners = new Map<string, typeof sourceFunctions>();
    for (const owner of sourceFunctions) {
      const list = uniqueSubjectOwners.get(owner.subjectId) ?? [];
      list.push(owner);
      uniqueSubjectOwners.set(owner.subjectId, list);
    }
    const accepted = sourceFunctions.filter(owner =>
      uniqueRegionOwners.get(owner.region.id)?.length === 1 &&
      uniqueSubjectOwners.get(owner.subjectId)?.length === 1);
    const byRegion = new Map(accepted.map(owner =>
      [owner.region.id, owner] as const));
    const addIrEvidence = (
      id: string,
      source: SourceRef,
      summary: string,
    ): void => {
      evidence.set(id, {
        id,
        origin: "source-code",
        locator: source.relativePath,
        scope: "selected-artifact",
        summary,
      });
    };
    const addInferredEdge = (
      from: string,
      to: string,
      kind: GameplayIntentEdge["kind"],
      witnessId: string,
      description: string,
    ): void => {
      const key = [kind, from, to].join("::");
      const existing = edges.get(key);
      const ids = [...new Set([...(existing?.evidenceIds ?? []), witnessId])].sort();
      edges.set(key, existing
        ? { ...existing, evidenceIds: ids }
        : {
            id: "intent-edge:" + kind + ":" + from + ":" + to,
            from, to, kind, status: "inferred",
            evidenceIds: ids, description,
          });
    };
    for (const owner of accepted) {
      addIrEvidence(
        owner.region.id,
        owner.parsed.source,
        "Authored mcfunction source region; activation and completion are not proven.",
      );
      const current = nodes.get(owner.subjectId)!;
      nodes.set(owner.subjectId, {
        ...current,
        evidenceIds: [...new Set([
          ...current.evidenceIds, owner.region.id,
        ])].sort(),
      });

      // Use the already-normalized IR scoreboard/tag surface. These are
      // technical resources; no economy, score, or player effect is inferred.
      for (const operation of input.semanticIr.state.operations) {
        if (operation.executionRegionId !== owner.region.id ||
            operation.source.artifactId !== owner.parsed.source.artifactId ||
            operation.source.relativePath !== owner.parsed.source.relativePath) {
          continue;
        }
        const surface = input.semanticIr.state.surfaces.find(item =>
          item.id === operation.surfaceId);
        if (!surface || (surface.ref.kind !== "scoreboard" &&
                         surface.ref.kind !== "tag")) continue;
        const key = "resource:" + surface.ref.kind + ":" +
          encodeURIComponent(surface.ref.key);
        addIrEvidence(
          operation.id, operation.source,
          "Authored " + surface.ref.kind + " " + operation.operation +
          " operation; live state and player-visible effects remain unverified.",
        );
        const prev = nodes.get(key);
        nodes.set(key, prev
          ? { ...prev,
              evidenceIds: [...new Set([...prev.evidenceIds, operation.id])].sort() }
          : {
              id: key,
              kind: "resource",
              label: (surface.ref.kind === "scoreboard"
                ? "Scoreboard " : "Tag ") + surface.ref.key,
              status: "authored",
              evidenceIds: [operation.id],
              description: "Source-observed technical state surface, not a declared game rule.",
            });
        addInferredEdge(
          owner.subjectId, key, "participates-in", operation.id,
          "This mcfunction references a technical state surface. " +
          "Direction, gameplay meaning and runtime effects are not proven.",
        );
      }

      // Direct calls carry the exact parsed command site and resolved IR
      // target; unresolved, ambiguous and unclassified callees are not linked.
      for (const reference of owner.parsed.references) {
        if (reference.kind !== "function") continue;
        const matches = input.semanticIr.execution.edges.filter(edge =>
          edge.kind === "synchronous-call" &&
          edge.resolution === "resolved" &&
          edge.from === owner.region.id &&
          edge.targetLabel === reference.target &&
          edge.to !== undefined &&
          byRegion.has(edge.to) &&
          sameExactCallSource(edge.source, reference.source));
        if (matches.length !== 1) continue;
        const match = matches[0]!;
        const target = byRegion.get(match.to!);
        if (!target) continue;
        addIrEvidence(
          match.id, match.source,
          "Exact mcfunction call to a uniquely identified source target; " +
          "branch reachability and gameplay purpose remain unproven.",
        );
        addInferredEdge(
          owner.subjectId, target.subjectId, "requires", match.id,
          "Source directly invokes this classified mcfunction. " +
          "Runtime execution and player-facing dependency are inferred.",
        );
      }
    }
  }

  // Link only an exact IR world effect to ONE already classified candidate
  // that owns the same execution region; never manufacture new mechanics.
  for (const effect of input.semanticIr?.execution.worldEffects ?? []) {
    if (input.artifactId !== undefined &&
        effect.source.artifactId !== input.artifactId) continue;
    const owners = [...nodes.values()].filter(node =>
      node.status !== "hypothesis" &&
      node.evidenceIds.includes(effect.executionRegionId));
    if (owners.length !== 1) continue;
    const owner = owners[0]!;
    evidence.set(effect.id, {
      id: effect.id, origin: "source-code",
      locator: effect.source.relativePath,
      scope: "selected-artifact",
      summary: "Authored " + effect.kind + " attempt; source presence " +
        "does not establish gameplay execution or success.",
    });
    nodes.set(owner.id, {
      ...owner,
      evidenceIds: [...new Set([...owner.evidenceIds, effect.id])].sort(),
    });
  }

  const evidenceHasSelectedArtifactSource = (
    evidenceIds: readonly string[],
  ): boolean =>
    evidenceIds.some((id) => {
      const item = evidence.get(id);
      return (
        item !== undefined &&
        item.scope === "selected-artifact"
      );
    });

  const authoredTransitionsByFrom = new Map<
    string,
    GameplayIntentEdge[]
  >();

  for (const edge of edges.values()) {
    if (
      edge.kind !== "transitions-to" ||
      edge.status !== "authored"
    ) {
      continue;
    }
    const list =
      authoredTransitionsByFrom.get(edge.from) ?? [];
    list.push(edge);
    authoredTransitionsByFrom.set(edge.from, list);
  }

  for (const [from, transitions] of authoredTransitionsByFrom) {
    const targetLabels = transitions
      .map((edge) => nodes.get(edge.to)?.label ?? edge.to)
      .sort();
    const evidenceIds = [
      ...new Set(
        transitions.flatMap((edge) => edge.evidenceIds),
      ),
    ].sort();

    invariants.set("inv:allowed-transitions:" + from, {
      id: "inv:allowed-transitions:" + from,
      statement:
        (nodes.get(from)?.label ?? from) +
        " transitions only to declared successors: " +
        targetLabels.join(", "),
      strength: "must",
      status: evidenceHasSelectedArtifactSource(evidenceIds)
        ? "authored"
        : "inferred",
      subjectIds: [from],
      evidenceIds,
    });
  }

  for (const coverage of extracted.outcomePolicyCoverage) {
    const policyEdges = [...edges.values()].filter(
      (edge) =>
        edge.from === coverage.outcomeSubjectKey &&
        edge.kind === "requires" &&
        edge.status === "authored" &&
        nodes.get(edge.to)?.kind === "policy",
    );

    if (
      coverage.completeDirectGuardCoverage &&
      policyEdges.length > 0
    ) {
      const policyLabels = policyEdges
        .map((edge) => nodes.get(edge.to)?.label ?? edge.to)
        .sort();
      const evidenceIds = [
        ...new Set(
          policyEdges.flatMap((edge) => edge.evidenceIds),
        ),
      ].sort();

      invariants.set(
        "inv:admissible-policy:" +
          coverage.outcomeSubjectKey,
        {
          id:
            "inv:admissible-policy:" +
            coverage.outcomeSubjectKey,
          statement:
            (nodes.get(coverage.outcomeSubjectKey)?.label ??
              coverage.outcomeSubjectKey) +
            " is statically observed only under one of these direct guards: " +
            policyLabels.join(" OR "),
          strength: "must",
          status: evidenceHasSelectedArtifactSource(evidenceIds)
            ? "authored"
            : "inferred",
          subjectIds: [coverage.outcomeSubjectKey],
          evidenceIds,
        },
      );
      continue;
    }

    if (coverage.totalLiteralReturnSites > 0) {
      intentUnknowns.push({
        id:
          "unknown:outcome-policy-coverage:" +
          coverage.outcomeSubjectKey,
        question:
          "Not every recognized literal return site for this outcome is controlled by a directly modeled if-guard; switch/default/nested or other control flow may still define admissibility.",
        blockedSubjectIds: [coverage.outcomeSubjectKey],
        evidenceIds: (nodes.get(coverage.outcomeSubjectKey)?.evidenceIds ?? [])
          .filter(id => evidence.get(id)?.scope === "selected-artifact")
          .sort(),
      });
    }
  }

  // Source-grounded authored relations are technical evidence. Only NPC
  // buttons with literal visible text and an exact authored command site
  // admit a bounded UI-interaction candidate; no win/phase purpose inferred.
  const authoredByOwner = new Map<string, string[]>();
  const uiByOwner = new Map<string, {
    label: string; evidenceIds: Set<string>;
  }>();
  for (const relation of input.semanticIr?.execution.authoredBehaviorRelations ?? []) {
    if (input.artifactId !== undefined &&
        relation.source.artifactId !== input.artifactId) continue;
    evidence.set(relation.id, {
      id: relation.id,
      origin: relation.kind.startsWith("dialogue-") ? "dialogue" : "source-code",
      locator: relation.source.relativePath,
      scope: "selected-artifact",
      summary: relation.kind + ": " + relation.reason +
        (relation.condition ? " Authored condition: " + relation.condition : ""),
    });
    const evidenceIds = [relation.id];
    for (const effectId of relation.worldEffectIds ?? []) {
      const effect = input.semanticIr?.execution.worldEffects?.find(item =>
        item.id === effectId &&
        item.source.artifactId === relation.source.artifactId &&
        item.source.relativePath === relation.source.relativePath &&
        item.source.jsonPointer === relation.source.jsonPointer);
      if (!effect) continue;
      evidenceIds.push(effect.id);
      evidence.set(effect.id, {
        id: effect.id, origin: "source-code",
        locator: effect.source.relativePath, scope: "selected-artifact",
        summary: "Parsed authored command world-effect attempt; UI activation and runtime success remain unverified.",
      });
    }
    for (const operationId of relation.stateOperationIds ?? []) {
      const operation = input.semanticIr?.state.operations.find(item =>
        item.id === operationId &&
        item.source.artifactId === relation.source.artifactId &&
        item.source.relativePath === relation.source.relativePath &&
        item.source.jsonPointer === relation.source.jsonPointer);
      if (!operation) continue;
      evidenceIds.push(operation.id);
      evidence.set(operation.id, {
        id: operation.id, origin: "source-code",
        locator: operation.source.relativePath, scope: "selected-artifact",
        summary: "Parsed authored command scoreboard/tag " + operation.operation +
          " operation; gameplay phase, score meaning and runtime value remain unproven.",
      });
    }
    for (const edgeId of relation.executionEdgeIds ?? []) {
      const edge = input.semanticIr?.execution.edges.find(item =>
        item.id === edgeId &&
        item.kind === "synchronous-call" &&
        item.source.artifactId === relation.source.artifactId &&
        item.source.relativePath === relation.source.relativePath &&
        item.source.jsonPointer === relation.source.jsonPointer);
      if (!edge) continue;
      evidenceIds.push(edge.id);
      evidence.set(edge.id, {
        id: edge.id, origin: "source-code",
        locator: edge.source.relativePath, scope: "selected-artifact",
        summary: "Exact authored command-to-function reference (" +
          edge.resolution +
          "); activation, conditions and downstream gameplay outcomes are unproven.",
      });
    }
    const owned = authoredByOwner.get(relation.ownerId) ?? [];
    owned.push(...evidenceIds);
    authoredByOwner.set(relation.ownerId, owned);
    if (relation.kind === "dialogue-button-command" &&
        relation.resolution === "EXACT_REFERENCE" &&
        relation.interactionLabel?.trim()) {
      const existing = uiByOwner.get(relation.ownerId);
      if (existing && existing.label !== relation.interactionLabel.trim()) continue;
      const value = existing ?? {
        label: relation.interactionLabel.trim(), evidenceIds: new Set<string>(),
      };
      evidenceIds.forEach(id => value.evidenceIds.add(id));
      uiByOwner.set(relation.ownerId, value);
    }
  }
  for (const [ownerId, ui] of uiByOwner) {
    const id = "mechanic:dialogue-interaction:" + encodeURIComponent(ownerId);
    nodes.set(id, {
      id, kind: "mechanic",
      label: "NPC interaction: " + ui.label,
      status: "inferred",
      description: "NPC dialogue button with an authored command. This grounds an interaction surface, not its game-design purpose, availability or effect success.",
      evidenceIds: [...ui.evidenceIds].sort(),
    });
  }
  for (const [ownerId, evidenceIds] of authoredByOwner) {
    const uiId = "mechanic:dialogue-interaction:" + encodeURIComponent(ownerId);
    intentUnknowns.push({
      id: "unknown:authored-behavior:" + encodeURIComponent(ownerId),
      question: uiByOwner.has(ownerId)
        ? "NPC interaction is source-grounded, but gameplay objective, activation conditions and actual command outcome remain unverified."
        : "Authored entity/controller/dialogue/script references exist; their activation and gameplay meaning remain unclassified.",
      blockedSubjectIds: uiByOwner.has(ownerId) ? [uiId] : [],
      evidenceIds: [...new Set(evidenceIds)].sort(),
    });
  }

  // Reconcile observed material execution against recognized gameplay subjects.
  // A technical state/return/resource chain is not a named mechanic merely
  // because it exists. Keep unclassified behavior explicit without creating
  // phantom gameplay nodes or scenario seeds.
  if (input.semanticIr) {
    const material = new Map([
      ...input.semanticIr.state.operations.map(item => [item.id, item.source] as const),
      ...(input.semanticIr.state.resourceActions ?? []).map(item => [item.id, item.source] as const),
      ...(input.semanticIr.execution.outcomes ?? []).map(item => [item.id, item.source] as const),
      ...(input.semanticIr.execution.worldEffects ?? []).map(item => [item.id, item.source] as const),
    ]);
    const interpretedEvidenceIds = new Set([...nodes.values()]
      .filter(node => ["mechanic", "phase", "lifecycle", "objective", "outcome"].includes(node.kind))
      .flatMap(node => node.evidenceIds).concat(
        [...edges.values()].flatMap(edge => edge.evidenceIds),
      ));
    const observedExecution = semanticIrExecutionTraces(input.semanticIr);
    const byRegion = new Map<string, string[]>();
    for (const operation of input.semanticIr.state.operations) {
      if (operation.operation !== "write") continue;
      const ids = byRegion.get(operation.executionRegionId) ?? [];
      ids.push(operation.id);
      byRegion.set(operation.executionRegionId, ids);
    }
    for (const action of input.semanticIr.state.resourceActions ?? []) {
      const ids = byRegion.get(action.executionRegionId) ?? [];
      ids.push(action.id);
      byRegion.set(action.executionRegionId, ids);
    }
    for (const outcome of input.semanticIr.execution.outcomes ?? []) {
      const ids = byRegion.get(outcome.executionRegionId) ?? [];
      ids.push(outcome.id);
      byRegion.set(outcome.executionRegionId, ids);
    }
    for (const effect of input.semanticIr.execution.worldEffects ?? []) {
      const ids = byRegion.get(effect.executionRegionId) ?? [];
      ids.push(effect.id);
      byRegion.set(effect.executionRegionId, ids);
    }
    const candidates = [
      ...observedExecution.traces.map(trace => ({
        identity: trace.entryRegionId,
        ids: [
          ...trace.stateOperationIds.filter(id =>
            input.semanticIr!.state.operations.some(operation =>
              operation.id === id && operation.operation === "write")),
          ...trace.resourceActionIds,
          ...trace.returnOutcomeIds,
          ...(trace.worldEffectIds ?? []),
        ],
      })),
      ...observedExecution.regionsOutsideTraces.map(regionId => ({
        identity: regionId,
        ids: byRegion.get(regionId) ?? [],
      })),
    ];
    for (const candidate of candidates) {
      const observedIds = [...new Set(candidate.ids)]
        .filter(id => material.has(id)).sort();
      // Mixed flows must retain their still-uninterpreted effects even
      // when another operation in the same trace has a semantic owner.
      const exactIds = observedIds.filter(id => {
        if (interpretedEvidenceIds.has(id)) return false;
        const source = material.get(id)!;
        return input.artifactId === undefined ||
          source.artifactId === input.artifactId;
      });
      if (exactIds.length === 0) continue;
      for (const id of exactIds) {
        if (evidence.has(id)) continue;
        const source = material.get(id)!;
        evidence.set(id, {
          id, origin: "source-code",
          locator: source.relativePath,
          scope: "selected-artifact",
          summary: "Authored state, resource, return or Minecraft world-effect attempt has no interpreted gameplay owner; its player-facing meaning remains unknown.",
        });
      }
      intentUnknowns.push({
        id: "unknown:uninterpreted-execution:" + candidate.identity,
        question: "An observed source execution entry has material state, resource, return or world-effect evidence without a classified gameplay owner. Reconcile the linked technical effects with the intended mechanic and player-facing outcome; do not infer game rules from names or observed effects alone.",
        blockedSubjectIds: [],
        evidenceIds: exactIds,
        sourceEntryRegionId: candidate.identity,
      });
    }
  }

  // Source-content dependency belongs to the EXISTING Intent Graph. An
  // exact unique same-pack/module import and a source method-use site provide
  // a bounded "uses content" relationship. Neither proves that the method
  // executes, the content is selected, a round progresses, or a player scores.
  const ownedScripts = selectedScripts.map(item => item.parsed);
  const ownerPaths = new Map<string, ParsedScriptFile[]>();
  for (const script of ownedScripts) {
    const path = script.source.relativePath.replaceAll("\\", "/");
    ownerPaths.set(path, [...(ownerPaths.get(path) ?? []), script]);
  }
  const sourceLocator = (source: SourceRef): string =>
    source.relativePath + (source.range === undefined ? "" :
      ":" + source.range.lineStart + ":" +
      (source.range.columnStart ?? 1));
  const resourceNodeId = (script: ParsedScriptFile, name: string) =>
    "resource:authored-content:" +
    encodeURIComponent(script.source.artifactId + ":" +
      script.source.relativePath + "#" + name);
  const contentByOwner = new Map<string, {
    readonly collection: NonNullable<ParsedScriptFile["authoredContentCollections"]>[number];
    readonly script: ParsedScriptFile;
    readonly nodeId: string;
    readonly evidenceId: string;
  }>();
  const ambiguousContentOwners = new Set<string>();
  for (const script of ownedScripts) {
    for (const collection of script.authoredContentCollections ?? []) {
      if (collection.source.artifactId !== script.source.artifactId ||
          collection.source.relativePath !== script.source.relativePath) continue;
      const nodeId = resourceNodeId(script, collection.name);
      const evidenceId = "source-content-definition:" +
        encodeURIComponent(nodeId);
      // Duplicate declared names must never silently pick a single owner.
      if (ambiguousContentOwners.has(nodeId)) continue;
      const prior = contentByOwner.get(nodeId);
      if (prior) {
        ambiguousContentOwners.add(nodeId);
        contentByOwner.delete(nodeId);
        nodes.delete(nodeId);
        evidence.delete(prior.evidenceId);
        continue;
      }
      contentByOwner.set(nodeId, {
        collection,script,nodeId,evidenceId,
      });
      evidence.set(evidenceId, {
        id: evidenceId,scope:"selected-artifact",origin:"source-code",
        locator: sourceLocator(collection.source),
        summary: "Source-authored categorized content collection. " +
          "Selection, intended mechanic and player delivery NOT OBSERVED.",
      });
      nodes.set(nodeId, {
        id: nodeId,kind:"resource",label:collection.name,
        status:"inferred",evidenceIds:[evidenceId],
      });
    }
  }
  const importedModules = resolveScriptImports(ownedScripts);
  for (const script of ownedScripts) {
    for (const use of script.authoredContentUses ?? []) {
      if (use.source.artifactId !== script.source.artifactId ||
          use.source.relativePath !== script.source.relativePath) continue;
      const matches = importedModules.filter(item =>
        item.status === "resolved" &&
        item.fromSourcePath === script.source.relativePath &&
        item.module === use.module &&
        item.targetSourcePath !== undefined);
      if (matches.length !== 1) continue;
      const resolution = matches[0]!;
      const providerPath = resolution.targetSourcePath!;
      if (ownerPaths.get(providerPath)?.length !== 1) continue;
      const provider = ownerPaths.get(providerPath)![0]!;
      if (provider.source.artifactId !== script.source.artifactId) continue;
      const definitionId = resourceNodeId(provider, use.importedName);
      const definition = contentByOwner.get(definitionId);
      if (!definition?.collection.exported ||
          definition.script !== provider ||
          !nodes.has(definitionId)) continue;
      const siteId = "source-content-site:" +
        encodeURIComponent(script.source.artifactId + ":" +
          sourceLocator(use.source) + "#" + use.localName + "." +
          use.method);
      const consumerId = "mechanic:source-content-consumer:" +
        encodeURIComponent(script.source.artifactId + ":" +
          script.source.relativePath + "#" + use.executionRegion);
      evidence.set(siteId, {
        id:siteId,scope:"selected-artifact",origin:"source-code",
        locator:sourceLocator(use.source),
        summary:"Exact static named ESM import and ." + use.method +
          " content access in " + use.executionRegion +
          ". No call reachability, phase or score effect proven.",
      });
      // Retain direct method-local assignments as context on the SAME
      // consumer node, without turning "source-after" into causal order.
      // The parser is responsible for exact AST assignment sites.
      const contextIds: string[] = [];
      for (const write of use.sourceContextWrites ?? []) {
        if (write.source.artifactId !== script.source.artifactId ||
            write.source.relativePath !== script.source.relativePath) continue;
        const writeId = "source-content-context:" +
          encodeURIComponent(consumerId + "#" +
            sourceLocator(write.source) + "#" + write.target);
        contextIds.push(writeId);
        evidence.set(writeId, {
          id:writeId,scope:"selected-artifact",origin:"source-code",
          locator:sourceLocator(write.source),
          summary:"Same-method source assignment (NOT CAUSAL): " +
            write.target + " " + write.operator + " " + write.expression +
            (write.branchConditions.length > 0
              ? "; lexical conditions: " +
                write.branchConditions.join(" AND ") : "") +
            ". Lexical source order does not prove branch reachability " +
            "or downstream runtime state.",
        });
        // Match only an existing Gameplay Intent state, and only through
        // the SAME exact mutation site. No second state model or alias guess.
        const matched = extracted.signals.filter(signal =>
          signal.nodeKind === "state" && nodes.has(signal.subjectKey) &&
          (signal.stateMutationOrigins ?? []).some(origin =>
            origin.scriptSource.artifactId === script.source.artifactId &&
            origin.scriptSource.relativePath === script.source.relativePath &&
            sameExactCallSource(origin.mutation.source, write.source)));
        if (matched.length !== 1) continue;
        const target = matched[0]!.subjectKey;
        const stateId = "source-content-state-context:" +
          encodeURIComponent(consumerId + "->" + target);
        const previous = edges.get(stateId);
        edges.set(stateId, {
          id:stateId,from:consumerId,to:target,
          kind:"participates-in",status:"inferred",
          evidenceIds: [...new Set([
            ...(previous?.evidenceIds ?? []),
            siteId,writeId,evidenceId(matched[0]!),
          ])].sort(),
          description:"Content reader and authored state write occur in the " +
            "same source method, with the assignment after the source read. " +
            "Conditional source-context association ONLY; not proof that " +
            "content selection causes the state write or a gameplay transition.",
        });
      }
      const existing = nodes.get(consumerId);
      nodes.set(consumerId, {
        id:consumerId,kind:"mechanic",
        label:use.executionRegion + " (source content reader)",
        status:"inferred",
        evidenceIds: [...new Set([
          ...(existing?.evidenceIds ?? []),siteId,...contextIds,
        ])].sort(),
      });
      const edgeId = "source-content-requires:" +
        encodeURIComponent(consumerId + "->" + definitionId);
      const prev = edges.get(edgeId);
      edges.set(edgeId, {
        id:edgeId,from:consumerId,to:definitionId,
        kind:"requires",status:"inferred",
        evidenceIds:[...new Set([
          ...(prev?.evidenceIds ?? []),siteId,definition.evidenceId,
        ])].sort(),
        description:"Exact selected-script import " +
          use.importedName + " and authored ." + use.method +
          " call in " + use.executionRegion +
          "; runtime invocation/selection and gameplay purpose unresolved.",
      });
    }
  }


  // The Semantic IR already owns exact local method calls. Preserve their
  // source-side topology in the EXISTING Gameplay Intent Graph when a selected
  // script has a proven content-reader anchor. Do not classify methods from
  // their names or manufacture a player journey from their call direction.
  for (const script of ownedScripts) {
    if (!input.semanticIr) break;
    const path = script.source.relativePath;
    const contentAnchorPrefix = "mechanic:source-content-consumer:" +
      encodeURIComponent(script.source.artifactId + ":" + path + "#");
    const hasContentAnchor = [...nodes.keys()].some(id =>
      id.startsWith(contentAnchorPrefix));
    if (!hasContentAnchor) continue;

    const methodCounts = new Map<string,number>();
    for (const member of script.declaredMembers ?? []) {
      if (member.memberKind !== "method" ||
          member.source.artifactId !== script.source.artifactId ||
          member.source.relativePath !== path) continue;
      methodCounts.set(member.member,
        (methodCounts.get(member.member) ?? 0) + 1);
    }
    const uniqueMethod = (region: string): boolean =>
      region.startsWith("function:") &&
      methodCounts.get(region.slice("function:".length)) === 1;
    const linkedContentRegions = new Map<string,string>();
    for (const use of script.authoredContentUses ?? []) {
      if (!use.executionRegion.startsWith("method:") ||
          use.source.artifactId !== script.source.artifactId ||
          use.source.relativePath !== path) continue;
      const methodName = use.executionRegion.slice("method:".length).split(".").at(-1);
      if (!methodName) continue;
      const region = "function:" + methodName;
      if (!uniqueMethod(region)) continue;
      const id = "mechanic:source-content-consumer:" +
        encodeURIComponent(script.source.artifactId + ":" +
          path + "#" + use.executionRegion);
      if (nodes.has(id)) linkedContentRegions.set(region,id);
    }
    const methodId = (region: string): string =>
      linkedContentRegions.get(region) ??
        "mechanic:source-method:" +
          encodeURIComponent(script.source.artifactId + ":" + path + "#" + region);
    const sourceCalls = (script.localFunctionCalls ?? [])
      .filter(call =>
        call.source.artifactId === script.source.artifactId &&
        call.source.relativePath === path &&
        uniqueMethod(call.callerRegion) &&
        uniqueMethod(call.targetRegion));
    // Retain only individually IR-backed, uniquely owned source sites.
    // Bound this view; the canonical IR still preserves all source calls.
    for (const call of sourceCalls.slice(0, 80)) {
      const matching = input.semanticIr.execution.edges.filter(edge =>
        edge.kind === "synchronous-call" &&
        edge.resolution === "resolved" &&
        edge.from === scriptRegionId(script.source,call.callerRegion) &&
        edge.to === scriptRegionId(script.source,call.targetRegion) &&
        edge.targetLabel === call.targetName &&
        sameExactCallSource(edge.source,call.source));
      if (matching.length !== 1) continue;
      const edge = matching[0]!;
      const from = methodId(call.callerRegion);
      const to = methodId(call.targetRegion);
      const conditions = [
        ...(call.lexicalGuards ?? []).map(g =>
          g.branch + ":" + g.conditionText),
        ...(call.precedenceGuards ?? []).map(g =>
          "preceding:" + g.branch + ":" + g.conditionText),
      ];
      const traceId = "source-method-site:" +
        encodeURIComponent(script.source.artifactId + ":" +
          sourceLocator(call.source) + "#" +
          call.callerRegion + "->" + call.targetRegion);
      evidence.set(traceId,{
        id:traceId,scope:"selected-artifact",origin:"source-code",
        locator:sourceLocator(call.source),
        summary:"Exact local call " + call.callerRegion +
          " -> " + call.targetRegion +
          "; source call control: " + (call.controlFlow ?? "unknown") +
          (conditions.length ? "; lexical guards: " +
            conditions.join(" AND ") : "") +
          ". Runtime execution, return policy, effects and play order UNKNOWN.",
      });
      evidence.set(edge.id,{
        id:edge.id,scope:"selected-artifact",origin:"source-code",
        locator:sourceLocator(edge.source),
        summary:"Canonical Semantic IR resolved synchronous local call. " +
          "Neither call reachability nor its gameplay purpose is established.",
      });
      for (const [id,region] of [[from,call.callerRegion],[to,call.targetRegion]]) {
        const existing = nodes.get(id);
        nodes.set(id,{
          id,kind:"mechanic",
          label:existing?.label ??
            region + " (source method; gameplay purpose UNKNOWN)",
          status:"inferred",
          evidenceIds:[...new Set([
            ...(existing?.evidenceIds ?? []),traceId,edge.id,
          ])].sort(),
        });
      }
      const relationId = "source-method-call:" +
        encodeURIComponent(from + "->" + to);
      const prior = edges.get(relationId);
      edges.set(relationId,{
        id:relationId,from,to,kind:"requires",status:"inferred",
        evidenceIds:[...new Set([
          ...(prior?.evidenceIds ?? []),traceId,edge.id,
        ])].sort(),
        description:"Resolved same-source local method invocation " +
          "from the canonical Semantic IR. Source guard applies only to " +
          "the authored call site; no game-stage transition is asserted.",
      });
    }

    // Reuse the exact canonical state subject for a source method's literal
    // assignment. This is not an edge from a *previous* state, and does not
    // establish reachability, phase duration or runtime player ownership.
    const methodRegions = new Set(sourceCalls.flatMap(call =>
      [call.callerRegion,call.targetRegion]));
    for (const mutation of script.stateMutations ?? []) {
      if (!methodRegions.has(mutation.executionRegion) ||
          mutation.source.artifactId !== script.source.artifactId ||
          mutation.source.relativePath !== path) continue;
      const from = methodId(mutation.executionRegion);
      if (!nodes.has(from)) continue;
      const matches = extracted.signals.filter(signal =>
        signal.nodeKind === "state" &&
        nodes.has(signal.subjectKey) &&
        (signal.stateMutationOrigins ?? []).some(origin =>
          origin.scriptSource.artifactId === script.source.artifactId &&
          origin.scriptSource.relativePath === path &&
          sameExactCallSource(origin.mutation.source,mutation.source)));
      if (matches.length !== 1) continue;
      const subject = matches[0]!;
      const id = "source-method-state:" +
        encodeURIComponent(from + "->" + subject.subjectKey);
      const existing = edges.get(id);
      const sourceId = "source-method-state-site:" +
        encodeURIComponent(from + ":" + sourceLocator(mutation.source));
      evidence.set(sourceId,{
        id:sourceId,origin:"source-code",scope:"selected-artifact",
        locator:sourceLocator(mutation.source),
        summary:"Direct authored state assignment in " +
          mutation.executionRegion + " at " + mutation.target +
          " = " + (mutation.value.kind === "literal"
            ? mutation.value.literal : mutation.value.symbol) +
          ". The resulting player/arena phase and actual execution " +
          "remain unproven.",
      });
      edges.set(id,{
        id,from,to:subject.subjectKey,kind:"participates-in",
        status:"inferred",
        evidenceIds:[...new Set([
          ...(existing?.evidenceIds ?? []),
          sourceId,evidenceId(subject),
        ])].sort(),
        description:"Same unique source method directly assigns this " +
          "canonical state value; not proof of a completed gameplay transition.",
      });
    }
  }

  const model: GameplayIntentModel = {
    schemaVersion: 1,
    id: input.id,
    ...(input.artifactId === undefined
      ? {}
      : { artifactId: input.artifactId }),
    evidence: [...evidence.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    nodes: [...nodes.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    edges: [...edges.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    invariants: [...invariants.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    unknowns: [
      ...(nodes.size === 0
        ? [{
            id: "unknown:no-intent-signals",
            question:
              "No gameplay-intent signal could be grounded from the available selected-artifact evidence.",
            blockedSubjectIds: [] as readonly string[],
          }]
        : []),
      ...intentUnknowns,
    ],
  };

  const errors = validateGameplayIntentModel(model);
  if (errors.length > 0) {
    throw new Error(
      "Gameplay Intent Model failed validation: " +
        errors
          .map((error) => error.path + ": " + error.message)
          .join("; "),
    );
  }

  return model;
}
