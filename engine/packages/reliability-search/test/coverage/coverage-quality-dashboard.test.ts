import { describe, expect, it } from "vitest";
import { buildCoverageQualityDashboard, generateKnownLimits } from "../../src/index.js";

describe("coverage quality dashboard", () => {
  it("distinguishes runtime-only and weak capability states", () => {
    const dashboard = buildCoverageQualityDashboard({ capabilityTruth: { taskCapabilities: [
      { id: "runtime.entity-ai", owner: "packages/runtime-lab", status: "owner-has-tests", runtimeOnly: true },
      { id: "demo", owner: "packages/demo", status: "implementation-present", runtimeOnly: false },
    ] } });
    expect(dashboard.summary["runtime-only"]).toBe(1);
    expect(dashboard.summary.weak).toBe(1);
    expect(generateKnownLimits(dashboard)).toHaveLength(2);
  });
});
