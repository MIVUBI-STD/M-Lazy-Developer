import { describe, expect, it } from "vitest";
import {
  arenaLifecycleDiagnostics,
} from "../../src/arena/arena-lifecycle-diagnostics.js";

describe("arena lifecycle diagnostics", () => {
  it("uses medium severity when terminal convergence or cleanup is unresolved", () => {
    const findings =
      arenaLifecycleDiagnostics(
        {
          multiIngressTerminalTargets: 0,
          terminalIngresses: [],
          terminalRaces: [],
          protectedTerminalRaces: 0,
          provenTerminalRaces: 0,
          unresolvedTerminalRaces: 0,
          terminalPrecedenceProven: 0,
          terminalPrecedenceUnresolved: 0,
          protectedDeferredMutations: 0,
          unresolvedDeferredMutations: 0,
          staleReadySnapshotRisks: 0,
          readySetSnapshotRisks: [],
          deferredMutations: [],
          terminalCandidates: 2,
          proven: 1,
          partial: 0,
          unresolved: 1,
          assessments: [],
        },
        {
          acquiredSurfaces: 2,
          terminalAssessments: [],
          lifecycle: { declared: false, complete: 0, unresolved: 0, assessments: [] },
          exactProven: 1,
          partial: 0,
          unresolved: 1,
          ledger: {
            resources: 2,
            complete: 1,
            partial: 0,
            missing: 1,
            coverageRatio: 0.5,
            obligations: [],
          },
        },
      );

    expect(findings[0]).toMatchObject({
      code: "ARENA_LIFECYCLE_COVERAGE_GAP",
      severity: "medium",
    });
  });

  it("uses minor severity for partial-only coverage", () => {
    const findings =
      arenaLifecycleDiagnostics(
        {
          multiIngressTerminalTargets: 0,
          terminalIngresses: [],
          terminalRaces: [],
          protectedTerminalRaces: 0,
          provenTerminalRaces: 0,
          unresolvedTerminalRaces: 0,
          terminalPrecedenceProven: 0,
          terminalPrecedenceUnresolved: 0,
          protectedDeferredMutations: 0,
          unresolvedDeferredMutations: 0,
          staleReadySnapshotRisks: 0,
          readySetSnapshotRisks: [],
          deferredMutations: [],
          terminalCandidates: 1,
          proven: 0,
          partial: 1,
          unresolved: 0,
          assessments: [],
        },
        {
          acquiredSurfaces: 1,
          terminalAssessments: [],
          lifecycle: { declared: false, complete: 0, unresolved: 0, assessments: [] },
          exactProven: 0,
          partial: 1,
          unresolved: 0,
          ledger: {
            resources: 1,
            complete: 0,
            partial: 1,
            missing: 0,
            coverageRatio: 0,
            obligations: [],
          },
        },
      );

    expect(findings[0]?.severity)
      .toBe("minor");
  });
});
