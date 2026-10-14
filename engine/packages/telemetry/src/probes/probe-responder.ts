import {
  parseRuntimeProbeRequest,
  parseRuntimeProbeResponse,
} from "../../../project-model/src/index.js";
import type {
  RuntimeProbeQuery,
  RuntimeProbeRequest,
  RuntimeProbeResponse,
  RuntimeProbeState,
} from "../../../project-model/src/index.js";
import type { RuntimeEvidenceRecord } from "../../../project-model/src/index.js";

export interface RuntimeProbeHostResolvers {
  currentTick(): number;
  chunkLoaded?(
    query: Extract<RuntimeProbeQuery, { kind: "chunk-loaded" }>,
  ): boolean | undefined;
  entityResolvable?(
    query: Extract<RuntimeProbeQuery, { kind: "entity-resolvable" }>,
  ): boolean | undefined;
  tagPresent?(
    query: Extract<RuntimeProbeQuery, { kind: "tag-present" }>,
  ): boolean | undefined;
  scoreboardValue?(
    query: Extract<RuntimeProbeQuery, { kind: "scoreboard-value" }>,
  ): number | undefined;
}

export interface RuntimeProbeResponder {
  respond(request: RuntimeProbeRequest): RuntimeProbeResponse;
}

interface ProbeResult {
  state: RuntimeProbeState;
  value?: string | number | boolean;
}

function booleanResult(value: boolean | undefined): ProbeResult {
  if (value === undefined) return { state: "unknown" };
  if (typeof value !== "boolean") {
    throw new Error(
      "Runtime probe boolean resolver returned a non-boolean value.",
    );
  }
  return {
    state: value ? "present" : "absent",
    value,
  };
}

function resolveQuery(
  request: RuntimeProbeRequest,
  resolvers: RuntimeProbeHostResolvers,
): ProbeResult {
  switch (request.query.kind) {
    case "chunk-loaded":
      return booleanResult(
        resolvers.chunkLoaded?.(request.query),
      );
    case "entity-resolvable":
      return booleanResult(
        resolvers.entityResolvable?.(request.query),
      );
    case "tag-present":
      return booleanResult(
        resolvers.tagPresent?.(request.query),
      );
    case "scoreboard-value": {
      const value = resolvers.scoreboardValue?.(request.query);
      if (value === undefined) return { state: "unknown" };
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          "Runtime probe scoreboard resolver returned a non-finite value.",
        );
      }
      if (
        request.query.expected !== undefined &&
        value !== request.query.expected
      ) {
        return { state: "absent", value };
      }
      return { state: "present", value };
    }
    default:
      return { state: "unknown" };
  }
}

function outcomeId(
  request: RuntimeProbeRequest,
  state: RuntimeProbeState,
): string | undefined {
  if (state === "present") return request.outcomeByState.present;
  if (state === "absent") return request.outcomeByState.absent;
  return request.outcomeByState.unknown;
}

function evidenceFor(
  request: RuntimeProbeRequest,
  runtimeTick: number,
  result: ProbeResult,
  ok: boolean,
  error?: string,
): RuntimeEvidenceRecord {
  return {
    predicate: request.predicate,
    state: result.state,
    confidence: ok ? "observed" : "unknown",
    ...(request.scope === undefined
      ? {}
      : { scope: request.scope }),
    relatedNodeIds: [
      "runtime-probe:" + request.requestId,
      "runtime-probe-definition:" + request.probeId,
    ],
    observedAt: { tick: runtimeTick },
    ...(error === undefined ? {} : { note: error }),
  };
}

export function createRuntimeProbeResponder(
  resolvers: RuntimeProbeHostResolvers,
): RuntimeProbeResponder {
  return {
    respond(rawRequest) {
      const request = parseRuntimeProbeRequest(rawRequest);

      let runtimeTick: number;
      try {
        runtimeTick = resolvers.currentTick();
      } catch (error) {
        runtimeTick = request.runtimeTick ?? 0;
        const message =
          error instanceof Error ? error.message : String(error);
        return parseRuntimeProbeResponse({
          schemaVersion: 1,
          requestId: request.requestId,
          probeId: request.probeId,
          runtimeTick,
          ok: false,
          state: "unknown",
          evidence: evidenceFor(
            request,
            runtimeTick,
            { state: "unknown" },
            false,
            message,
          ),
          error: message,
        });
      }

      if (
        !Number.isInteger(runtimeTick) ||
        runtimeTick < 0
      ) {
        const message =
          "Runtime probe currentTick resolver returned an invalid tick.";
        const fallbackTick = request.runtimeTick ?? 0;
        return parseRuntimeProbeResponse({
          schemaVersion: 1,
          requestId: request.requestId,
          probeId: request.probeId,
          runtimeTick: fallbackTick,
          ok: false,
          state: "unknown",
          evidence: evidenceFor(
            request,
            fallbackTick,
            { state: "unknown" },
            false,
            message,
          ),
          error: message,
        });
      }

      try {
        const result = resolveQuery(request, resolvers);
        const outcome = outcomeId(request, result.state);
        return parseRuntimeProbeResponse({
          schemaVersion: 1,
          requestId: request.requestId,
          probeId: request.probeId,
          runtimeTick,
          ok: true,
          state: result.state,
          ...(outcome === undefined
            ? {}
            : { outcomeId: outcome }),
          evidence: evidenceFor(
            request,
            runtimeTick,
            result,
            true,
          ),
          ...(result.value === undefined
            ? {}
            : { value: result.value }),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return parseRuntimeProbeResponse({
          schemaVersion: 1,
          requestId: request.requestId,
          probeId: request.probeId,
          runtimeTick,
          ok: false,
          state: "unknown",
          evidence: evidenceFor(
            request,
            runtimeTick,
            { state: "unknown" },
            false,
            message,
          ),
          error: message,
        });
      }
    },
  };
}
