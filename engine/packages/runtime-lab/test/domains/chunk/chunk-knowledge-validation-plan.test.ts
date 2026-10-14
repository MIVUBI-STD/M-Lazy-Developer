import { describe, expect, it } from "vitest";
import {
  chunkKnowledgeValidationCoverage,
  chunkKnowledgeValidationPlans,
} from "../../../src/domains/chunk/chunk-knowledge-validation-plan.js";

describe("chunk knowledge validation plan", () => {
  it("keeps experiment-ready and probe-required knowledge distinct", () => {
    const plans = chunkKnowledgeValidationPlans();
    expect(plans.find((p) => p.knowledgeId === "chunks.dimension-is-chunk-loaded"))
      .toMatchObject({ status: "experiment-ready", existingExperiment: "player-loader-chunk-readiness" });
    // Only implemented experiment IDs can be marked immediately runnable.
    expect(plans.find((p) => p.knowledgeId === "chunks.chunk-size-horizontal"))
      .toMatchObject({ status: "probe-required", existingExperiment: null });
    expect(plans.every((p) => p.existingExperiment === null
      ? p.status === "probe-required"
      : p.status === "experiment-ready")).toBe(true);
    expect(plans.find((p) => p.knowledgeId === "chunks.tickingarea-limits"))
      .toMatchObject({ status: "probe-required" });
  });

  it("reports missing knowledge instead of silently routing it", () => {
    const report = chunkKnowledgeValidationCoverage([
      "chunks.dimension-is-chunk-loaded",
      "chunks.unknown",
    ]);
    expect(report).toMatchObject({ total: 2, planned: 1, missing: ["chunks.unknown"] });
  });
});
