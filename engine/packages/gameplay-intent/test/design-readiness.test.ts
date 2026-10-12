import { describe, expect, it } from "vitest";
import {
  assessGameplayDesignReadiness,
  type GameplayIntentModel,
} from "../src/index.js";

const model: GameplayIntentModel = {
  schemaVersion: 1,
  id: "design-readiness",
  evidence: [],
  nodes: [{
    id: "objective:flag",
    kind: "objective",
    label: "Flag",
    status: "authored",
    evidenceIds: [],
  }, {
    id: "objective:other",
    kind: "objective",
    label: "Other independently scoped objective",
    status: "authored",
    evidenceIds: [],
  }],
  edges: [],
  invariants: [],
  unknowns: [{
    id: "unknown:retry",
    question: "Should objective state reset on retry?",
    blockedSubjectIds: ["objective:flag"],
  }],
};

describe("gameplay design readiness", () => {
  it("blocks when selected-artifact contract evidence is missing", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:flag"],
      },
    );

    expect(result.disposition).toBe("blocked");
    expect(result.reasons.join(" ")).toMatch(/selected map artifact/i);
  });


  it("blocks when a material unknown affects the audit scope", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:flag"],
        authoritativeDesignAvailable: true,
        materialUnknownIds: ["unknown:retry"],
      },
    );

    expect(result.disposition).toBe("blocked");
  });

  it("allows partial readiness only for explicitly non-material unknowns", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:flag"],
        authoritativeDesignAvailable: true,
        nonMaterialUnknownIds: ["unknown:retry"],
      },
    );

    expect(result.disposition).toBe("partial");
  });

  it("is ready when no scoped material unknown remains", () => {
    const result = assessGameplayDesignReadiness(
      model,
      {
        scopeSubjectIds: ["objective:other"],
        authoritativeDesignAvailable: true,
      },
    );

    expect(result.disposition).toBe("ready");
  });

  const scoped = {
    scopeSubjectIds: ["objective:flag"],
    authoritativeDesignAvailable: true,
  };

  it("does not erase unlisted unknowns when a partial material list is supplied", () => {
    const result = assessGameplayDesignReadiness({
      ...model,
      unknowns: [...model.unknowns, {
        id: "unknown:reward", question: "Which reward applies?",
        blockedSubjectIds: ["objective:flag"],
      }],
    }, { ...scoped, materialUnknownIds: ["unknown:retry"] });
    expect(result.blockingUnknownIds).toEqual(["unknown:retry", "unknown:reward"]);
  });

  it("retains questions with no subject or a missing subject", () => {
    for (const blockedSubjectIds of [[], ["objective:missing"]]) {
      const result = assessGameplayDesignReadiness({
        ...model,
        unknowns: [{ id: "unknown:unbound", question: "Owner?", blockedSubjectIds }],
      }, scoped);
      expect(result.blockingUnknownIds).toEqual(["unknown:unbound"]);
    }
  });

  it("gives material classification precedence over an overlapping tolerance", () => {
    const result = assessGameplayDesignReadiness(model, {
      ...scoped,
      materialUnknownIds: ["unknown:retry"],
      nonMaterialUnknownIds: ["unknown:retry"],
    });
    expect(result.blockingUnknownIds).toEqual(["unknown:retry"]);
    expect(result.toleratedUnknownIds).toEqual([]);
  });

  it("rejects stale question selections rather than manufacturing readiness", () => {
    const result = assessGameplayDesignReadiness(model, {
      ...scoped, materialUnknownIds: ["unknown:stale"],
    });
    expect(result.disposition).toBe("blocked");
    expect(result.blockingUnknownIds).toEqual(["unknown:retry"]);
    expect(result.reasons.join(" ")).toContain("unknown:stale");
  });

  it("requires a nonempty scope with real selected-model subjects", () => {
    for (const scopeSubjectIds of [[], ["objective:missing"]]) {
      expect(assessGameplayDesignReadiness(model, {
        ...scoped, scopeSubjectIds,
      }).disposition).toBe("blocked");
    }
  });
});
