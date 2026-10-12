import { describe, expect, it } from "vitest";
import {
  assessGameplayStateClosure,
  type GameplayIntentModel,
} from "../src/index.js";

// Two representative topology contracts, not a map-specific answer table.
const proof = {
  id: "evidence:source-transition",
  origin: "source-code" as const,
  locator: "scripts/game.ts",
  summary: "Direct selected-artifact state transition",
  scope: "selected-artifact" as const,
};
const state = (id: string) => ({
  id,
  kind: "phase" as const,
  label: id,
  status: "authored" as const,
  evidenceIds: [proof.id],
});
const link = (
  id: string,
  from: string,
  to: string,
  kind: GameplayIntentModel["edges"][number]["kind"] = "transitions-to",
): GameplayIntentModel["edges"][number] => ({
  id, from, to, kind, status: "authored", evidenceIds: [proof.id],
});
function model(
  nodes: GameplayIntentModel["nodes"],
  edges: GameplayIntentModel["edges"],
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "closure:representative",
    artifactId: "artifact:current",
    evidence: [proof],
    nodes,
    edges,
    invariants: [],
    unknowns: [],
  };
}

describe("gameplay source state closure", () => {
  it("does not accept an internally connected loop with no entry or outcome", () => {
    const result = assessGameplayStateClosure(model(
      [state("phase:lobby"), state("phase:combat")],
      [
        link("a", "phase:lobby", "phase:combat"),
        link("b", "phase:combat", "phase:lobby", "recovers-to"),
      ],
    ));
    expect(result.complete).toBe(false);
    expect(result.records.every(record => record.status !== "closed")).toBe(true);
  });

  it("distinguishes an explicitly linked win/loss route from unrelated states", () => {
    const outcome = {
      id: "outcome:won",
      kind: "outcome" as const,
      label: "Won",
      status: "authored" as const,
      evidenceIds: [proof.id],
    };
    const connected = model(
      [state("phase:setup"), state("phase:active"), outcome],
      [
        link("start", "phase:setup", "phase:active"),
        link("win", "phase:active", "outcome:won", "wins-by"),
      ],
    );
    expect(assessGameplayStateClosure(connected).complete).toBe(true);

    const disconnected = model(
      [...connected.nodes, state("phase:orphan-a"), state("phase:orphan-b")],
      [
        ...connected.edges,
        link("orphan-1", "phase:orphan-a", "phase:orphan-b"),
        link("orphan-2", "phase:orphan-b", "phase:orphan-a"),
      ],
    );
    expect(assessGameplayStateClosure(disconnected).complete).toBe(false);
  });
});
