import { describe, expect, it } from "vitest";
import {
  createRuntimeProbeExecutor,
  createRuntimeProbeSession,
} from "../../src/index.js";

const backend = {
  currentTick: 100,
  chunkLoaded: () => ({ status: "value", value: true } as const),
  entityResolvable: () => ({ status: "value", value: true } as const),
  tagPresent: () => ({ status: "value", value: true } as const),
  scoreboardValue: () => ({ status: "value", value: 1 } as const),
  // Queries not supported by this test backend remain UNKNOWN, not observed.
  entityLocation: () => ({ status: "unknown" } as const),
  dimensionHeightRange: () => ({ status: "unknown" } as const),
  commandResult: () => ({ status: "unknown" } as const),
};

function request(id: string) {
  return {
    schemaVersion: 1 as const,
    requestId: id,
    probeId: "chunk",
    predicate: "loaded-target-chunk",
    query: {
      kind: "chunk-loaded" as const,
      dimension: "overworld",
      location: { x: 0, y: 64, z: 0 },
    },
    outcomeByState: {
      present: "ready",
      absent: "not-ready",
    },
  };
}

describe("runtime probe session", () => {
  it("records validated exchanges into a transcript", () => {
    const session = createRuntimeProbeSession({
      executor: createRuntimeProbeExecutor(backend),
      sessionId: "qa-run",
      artifactId: "art-1",
    });

    const response = session.execute(request("req-1"));
    expect(response.state).toBe("present");
    expect(session.size).toBe(1);
    expect(session.snapshot()).toMatchObject({
      schemaVersion: 1,
      sessionId: "qa-run",
      artifactId: "art-1",
      exchanges: [{
        request: expect.objectContaining({ requestId: "req-1" }),
        response: expect.objectContaining({
          requestId: "req-1",
          state: "present",
        }),
      }],
    });
  });

  it("bounds retained exchanges and reports dropped history", () => {
    const session = createRuntimeProbeSession({
      executor: createRuntimeProbeExecutor(backend),
      maxExchanges: 2,
    });

    session.execute(request("req-1"));
    session.execute(request("req-2"));
    session.execute(request("req-3"));

    expect(session.size).toBe(2);
    expect(session.dropped).toBe(1);
    const transcript = session.snapshot();
    expect(transcript.droppedExchanges).toBe(1);
    expect(transcript.exchanges.map((item) => item.request.requestId))
      .toEqual(["req-2", "req-3"]);
  });

  it("keeps request ids unique across drained batches", () => {
    const session = createRuntimeProbeSession({
      executor: createRuntimeProbeExecutor(backend),
    });

    session.execute(request("req-1"));
    const transcript = session.drainTranscript();
    expect(transcript.exchanges).toHaveLength(1);
    expect(session.size).toBe(0);
    expect(session.dropped).toBe(0);

    expect(() => session.execute(request("req-1")))
      .toThrow(/Duplicate runtime probe requestId/);
  });

  it("clear starts a fresh request-id namespace", () => {
    const session = createRuntimeProbeSession({
      executor: createRuntimeProbeExecutor(backend),
    });

    session.execute(request("req-1"));
    session.clear();
    expect(() => session.execute(request("req-1"))).not.toThrow();
  });

  it("rejects invalid buffer sizes", () => {
    expect(() => createRuntimeProbeSession({
      executor: createRuntimeProbeExecutor(backend),
      maxExchanges: 0,
    })).toThrow(/positive integer/);
  });
});
