import { describe, expect, it } from "vitest";
import {
  projectConfirmedDefects,
  type ConfirmedDefect,
} from "../src/index.js";

describe("engineering analysis projection", () => {
  it("merges engineering analysis into persisted Technical Analysis without changing V2 schema", () => {
    const defect: ConfirmedDefect = {
      semanticKey: "subjects=arena|invariants=inv:capacity|failure=session-concurrency",
      subjectIds: ["arena"],
      foundBy: "ai",
      confirmation: {
        basis: "authored-contract-violation",
        evidence: "Selected source contradicts the stated design contract.",
      },
      impact: {
        progression: "degraded",
        recovery: "abnormal",
        stability: "stable",
        coreMechanic: "materially-wrong",
        importantState: "materially-wrong",
        fairness: "materially-affected",
      },
      primaryFailure: "session-concurrency",
      title: "Arena concurrency is capped below available capacity",
      problem: "Teams beyond the second active arena are queued.",
      expected: {
        authority: "selected-artifact",
        statement: "Independent arenas should remain available concurrently.",
        evidenceIds: ["design:arena-layout"],
      },
      observed: {
        statement: "Only two sessions are admitted.",
        evidenceIds: ["source:cap"],
      },
      aiAnalysis: "Static contradiction found.",
      engineeringAnalysis: "Root Cause\nGlobal concurrency gate is lower than available arena capacity.",
      sourceEvidence: [{
        source: {
          artifactId: "map:test",
          relativePath: "scripts/arena.ts",
          range: { lineStart: 10, lineEnd: 10 },
        },
        reason: "Declares concurrency cap.",
      }],
      brokenInvariantIds: ["inv:capacity"],
      repairUnitIds: ["source-range:scripts/arena.ts#L10-L10"],
    };

    const [projected] = projectConfirmedDefects({
      name: "Defense",
      mapVersion: "1.1.1",
      drive: "https://drive.google.com/test",
      baseVersion: "1.1.0",
      testedVersion: "1.1.1",
    }, [defect]);

    expect(projected?.aiAnalysis).toContain("Static contradiction found.");
    expect(projected?.aiAnalysis).toContain("Root Cause");
  });
});
