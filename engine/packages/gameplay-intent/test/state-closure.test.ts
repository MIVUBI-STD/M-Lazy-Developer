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

  it("preserves two independent authored entry routes without inventing a single mode", () => {
    const multi = model(
      [state("phase:a-start"), state("phase:a-play"), state("phase:b-start"),
       state("phase:b-play"), {
         id: "outcome:a", kind: "outcome", label: "A", status: "authored", evidenceIds: [proof.id],
       }, {
         id: "outcome:b", kind: "outcome", label: "B", status: "authored", evidenceIds: [proof.id],
       }],
      [link("a-start", "phase:a-start", "phase:a-play"),
       link("a-win", "phase:a-play", "outcome:a", "wins-by"),
       link("b-start", "phase:b-start", "phase:b-play"),
       link("b-win", "phase:b-play", "outcome:b", "wins-by")],
    );
    const result = assessGameplayStateClosure(multi);
    expect(result.structuralEntryStateId).toBeUndefined();
    expect(result.structuralEntryStateIds).toEqual(["phase:a-start", "phase:b-start"]);
    expect(result.sourceRouteCoverageComplete).toBe(true);
    expect(result.complete).toBe(true);
  });

  it("does not mark an unrooted cycle complete next to valid independent routes", () => {
    const multi = model(
      [state("phase:start"), state("phase:play"),
       state("phase:orphan-a"), state("phase:orphan-b"), {
         id: "outcome:win", kind: "outcome", label: "Win",
         status: "authored", evidenceIds: [proof.id],
       }],
      [link("start", "phase:start", "phase:play"),
       link("win", "phase:play", "outcome:win", "wins-by"),
       link("orphan-a", "phase:orphan-a", "phase:orphan-b"),
       link("orphan-b", "phase:orphan-b", "phase:orphan-a")],
    );
    const result = assessGameplayStateClosure(multi);
    expect(result.sourceRouteCoverageComplete).toBe(false);
    expect(result.complete).toBe(false);
    expect(result.partialSubjectIds).toContain("phase:orphan-a");
  });

  it("does not lose unowned or stale gameplay questions in structural source closure", () => {
    const base = model([state("phase:start"), state("phase:play"), {
      id: "outcome:win", kind: "outcome", label: "Win",
      status: "authored", evidenceIds: [proof.id],
    }], [
      link("start", "phase:start", "phase:play"),
      link("win", "phase:play", "outcome:win", "wins-by"),
    ]);
    for (const blockedSubjectIds of [[], ["state:missing"]]) {
      const result = assessGameplayStateClosure({
        ...base,
        unknowns: [{
          id: "unknown:unowned", question: "Who controls this effect?",
          blockedSubjectIds,
        }],
      });
      expect(result.sourceRouteCoverageComplete).toBe(false);
      expect(result.complete).toBe(false);
    }
  });

  it("keeps topology distinct from an unresolved authored win condition", () => {
    const base = model([state("phase:start"), state("phase:play"), {
      id: "outcome:win", kind: "outcome", label: "Win",
      status: "authored", evidenceIds: [proof.id],
    }], [
      link("start", "phase:start", "phase:play"),
      link("win", "phase:play", "outcome:win", "wins-by"),
    ]);
    const result = assessGameplayStateClosure({
      ...base,
      unknowns: [{
        id: "unknown:outcome", question: "Who is awarded the win?",
        blockedSubjectIds: ["outcome:win"],
      }],
    });
    expect(result.sourceRouteCoverageComplete).toBe(true);
    expect(result.terminalOutcomeGrounded).toBe(false);
    expect(result.complete).toBe(false);
  });
});
