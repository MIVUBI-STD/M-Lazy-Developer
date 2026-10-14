import { describe, expect, it } from "vitest";
import {
  planMinimumSufficientAnalysis,
} from "../../analysis-planner/src/index.js";
import {
  DIAGNOSIS_ANALYSIS_CAPABILITIES,
  DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY,
  diagnosisCapabilityByExecutorId,
} from "../src/index.js";

describe("diagnosis analysis capability profile", () => {
  it("declares one deterministic canonical registry", () => {
    expect(
      DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
        .capabilities.length,
    ).toBe(
      DIAGNOSIS_ANALYSIS_CAPABILITIES.length,
    );
    expect(
      DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
        .capabilities.map((item) => item.id),
    ).toEqual(
      [...DIAGNOSIS_ANALYSIS_CAPABILITIES]
        .map((item) => item.id)
        .sort(),
    );
  });

  it("selects source indexing before semantic intent work", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        capabilities:
          DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
            .capabilities,
      });

    expect(
      plan.steps[0]?.capabilityId,
    ).toBe("diagnosis.source-index");
  });

  it("reuses already-grounded intent without redundant analysis", () => {
    const plan =
      planMinimumSufficientAnalysis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        availableEvidence: [{
          level: "semantic",
          evidenceIds: ["intent:inferred"],
          quality: "usable",
          traits: ["intent-grounded"],
        }],
        completedCapabilityIds: [
          "diagnosis.source-index",
          "diagnosis.intent-grounding",
        ],
        capabilities:
          DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
            .capabilities,
      });

    expect(plan.steps).toEqual([]);
  });

  it("binds executor ids to explicit owners", () => {
    expect(
      diagnosisCapabilityByExecutorId(
        "diagnosis.runtime-observation",
      ),
    ).toMatchObject({
      owner: "packages/runtime-lab/src/index.ts",
      evidenceLevel: "runtime",
    });
  });
});
