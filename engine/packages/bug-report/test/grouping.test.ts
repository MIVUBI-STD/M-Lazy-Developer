import { describe, expect, it } from "vitest";
import {
  assessConfirmedDefectGrouping,
  decideBugGrouping,
  deriveConfirmedDefectSemanticKey,
  groupConfirmedDefects,
  type ConfirmedDefect,
} from "../src/index.js";

describe("bug report split and merge policy", () => {
  it("merges multiple symptoms of the same causal defect", () => {
    expect(
      decideBugGrouping({
        relatedCausalLineage: true,
        sameBrokenInvariant: true,
        sameRepairUnit: true,
        samePrimaryFailure: true,
      }),
    ).toBe("merge");
  });

  it("keeps one invariant and repair unit together despite different lineage", () => {
    expect(
      decideBugGrouping({
        relatedCausalLineage: false,
        sameBrokenInvariant: true,
        sameRepairUnit: true,
        samePrimaryFailure: true,
      }),
    ).toBe("merge");
  });

  it("splits findings that violate different gameplay invariants", () => {
    expect(
      decideBugGrouping({
        relatedCausalLineage: true,
        sameBrokenInvariant: false,
        sameRepairUnit: true,
        samePrimaryFailure: true,
      }),
    ).toBe("split");
  });

  it("splits findings that require independent repair units", () => {
    expect(
      decideBugGrouping({
        relatedCausalLineage: true,
        sameBrokenInvariant: true,
        sameRepairUnit: false,
        samePrimaryFailure: true,
      }),
    ).toBe("split");
  });

  it("keeps incomplete arena cleanup symptoms together when one cleanup defect owns them", () => {
    expect(
      decideBugGrouping({
        relatedCausalLineage: true,
        sameBrokenInvariant: true,
        sameRepairUnit: true,
        samePrimaryFailure: true,
      }),
    ).toBe("merge");
  });

  it("separates inventory reset, friendly fire, and UI feedback defects", () => {
    expect(
      decideBugGrouping({
        relatedCausalLineage: false,
        sameBrokenInvariant: false,
        sameRepairUnit: false,
        samePrimaryFailure: false,
      }),
    ).toBe("split");
  });
});


function defect(
  subject: string,
  options: {
    incident?: string;
    invariant?: string;
    repairUnit?: string;
  } = {},
): ConfirmedDefect {
  const base: Omit<
    ConfirmedDefect,
    "semanticKey"
  > = {
    subjectIds: ["subject:" + subject],
    foundBy: "tester",
    confirmation: {
      basis: "tester-reproduction",
      evidence: "Reproduced gameplay mismatch.",
    },
    impact: {
      progression: "degraded",
      recovery: "normal",
      stability: "stable",
      coreMechanic: "materially-wrong",
      importantState: "correct",
      fairness: "unaffected",
    },
    primaryFailure: "game-progression",
    title: "Gameplay failure",
    problem: "Gameplay does not follow the contract.",
    expected: {
      authority: "explicit-requirement",
      statement: "Gameplay follows the contract.",
      evidenceIds: ["requirement:gameplay"],
    },
    observed: {
      statement: "Gameplay diverges from the contract.",
      evidenceIds: ["tester:observation"],
    },
    reproduction: [
      "Enter the affected gameplay state.",
      "Perform the action that reaches the failure.",
      "Confirm the gameplay result diverges from the expected contract.",
    ],
    brokenInvariantIds: [
      options.invariant ?? "inv:gameplay",
    ],
    repairUnitIds: [
      options.repairUnit ?? "unit:gameplay",
    ],
    ...(options.incident === undefined
      ? {}
      : { causalIncidentId: options.incident }),
  };

  return {
    ...base,
    semanticKey:
      deriveConfirmedDefectSemanticKey(base),
  };
}

describe("confirmed defect semantic grouping", () => {
  it("merges only when causal incident invariant and repair unit all match", () => {
    const left = defect("symptom-a", {
      incident: "incident:cleanup",
    });
    const right = defect("symptom-b", {
      incident: "incident:cleanup",
    });

    expect(
      decideBugGrouping(
        assessConfirmedDefectGrouping(left, right),
      ),
    ).toBe("merge");
  });

  it("merges matching invariant and repair unit even without causal incident identity", () => {
    const groups = groupConfirmedDefects([
      defect("symptom-a"),
      defect("symptom-b"),
    ]);

    expect(groups).toHaveLength(1);
  });

  it("splits the same incident when repair units differ", () => {
    const left = defect("symptom-a", {
      incident: "incident:cleanup",
      repairUnit: "unit:inventory",
    });
    const right = defect("symptom-b", {
      incident: "incident:cleanup",
      repairUnit: "unit:session",
    });

    expect(
      decideBugGrouping(
        assessConfirmedDefectGrouping(left, right),
      ),
    ).toBe("split");
  });

  it("creates deterministic semantic groups independent of input order", () => {
    const a = defect("a", {
      incident: "incident:cleanup",
    });
    const b = defect("b", {
      incident: "incident:cleanup",
    });
    const first = groupConfirmedDefects([a, b]);
    const second = groupConfirmedDefects([b, a]);

    expect(first).toEqual(second);
    expect(first[0]?.defects.map((item) => item.semanticKey))
      .toEqual([
        a.semanticKey,
        b.semanticKey,
      ].sort());
  });
});
