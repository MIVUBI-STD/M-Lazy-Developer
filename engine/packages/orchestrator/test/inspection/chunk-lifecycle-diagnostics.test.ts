import { describe, expect, it } from "vitest";
import {
  chunkLifecycleDiagnostics,
} from "../../src/inspection/chunk-lifecycle-diagnostics.js";

const base = {
  worldLoadObservers: 0,
  entityLoadObservers: 0,
  entityRemoveObservers: 0,
  entityDieObservers: 0,
  entitySpawnObservers: 0,
  shutdownObservers: 0,
  readinessProbes: 0,
  tickingAreaReadinessStates: 0,
  tickingAreaAcquires: 0,
  tickingAreaReleases: 0,
  capacityChecks: 0,
  pairedLeases: 0,
  acquireWithoutRelease: 0,
  releaseWithoutAcquire: 0,
  releaseUnreachable: 0,
  cleanupOrderUnproven: 0,
  dynamicLeaseKeys: 0,
  capacityUncheckedLeases: 0,
  readinessUnverifiedLeases: 0,
  shutdownOnlyCleanupRisk: 0,
  worldLoadReconciliationPaths: 0,
  unguardedDeferredChunkWork: 0,
  zeroTickDeferredChunkWork: 0,
  boundedDeferredChunkRetries: 0,
  unboundedDeferredChunkRetries: 0,
  deduplicatedSpawnRetryPaths: 0,
  spawnRetryDedupGaps: 0,
  serializedTickingAreaAllocations: 0,
  unserializedTickingAreaAllocations: 0,
  tickingAreaErrorHandlers: 0,
  completeTickingAreaErrorRouters: 0,
  incompleteTickingAreaErrorRouters: 0,
  capacityQueuePaths: 0,
  leaseJournalWriters: 0,
  leaseJournalRecoveryPaths: 0,
  spawnRecoveryRoutes: 0,
  unloadedSpecificSpawnRecoveryRoutes: 0,
  broadSpawnRecoveryRisks: 0,
  otherSpecificSpawnRecoveryRoutes: 0,
  entityRemoveTerminalizationRisks: 0,

  entityResidencyObservability:
    "absent" as const,
  residencyStateMachines: [],
  completeResidencyStateMachines: 0,
  unresolvedResidencyStateMachines: 0,
  leases: [],
};

describe("chunk lifecycle diagnostics", () => {
  it("does not emit a source-risk finding for observability absence alone", () => {
    expect(
      chunkLifecycleDiagnostics(base),
    ).toEqual([]);
  });

  it("emits medium source risk for an acquired lease without release", () => {
    const result =
      chunkLifecycleDiagnostics({
        ...base,
        tickingAreaAcquires: 1,
        acquireWithoutRelease: 1,
      });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      code: "CHUNK_LIFECYCLE_SOURCE_RISK",
      severity: "medium",
      data: {
        acquireWithoutRelease: 1,
        worldLoadReconciliationMissing:
          true,
      },
    });
  });

  it("emits minor source risk for unguarded deferred chunk work without claiming a runtime failure", () => {
    const result =
      chunkLifecycleDiagnostics({
        ...base,
        unguardedDeferredChunkWork: 1,
      });

    expect(result[0]).toMatchObject({
      code: "CHUNK_LIFECYCLE_SOURCE_RISK",
      severity: "minor",
      data: {
        unguardedDeferredChunkWork: 1,
      },
    });
  });
});
