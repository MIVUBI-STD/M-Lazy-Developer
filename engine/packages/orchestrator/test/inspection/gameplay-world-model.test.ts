import { describe, expect, it } from "vitest";
import { deriveGameplayWorldModel } from "../../src/inspection/gameplay-world-model.js";

describe("gameplay world model", () => {
  it("summarizes gameplay and arena subsystems without copying raw evidence", () => {
    const source: Parameters<typeof deriveGameplayWorldModel>[0] = {
      artifactId: "map:test",
      intent: {
        schemaVersion: 1,
        id: "intent:test",
        evidence: [],
        nodes: [
          {
            id: "objective:flag",
            kind: "objective",
            label: "Flag",
            status: "authored",
            evidenceIds: [],
          },
          {
            id: "phase:active",
            kind: "phase",
            label: "Active",
            status: "inferred",
            evidenceIds: [],
          },
        ],
        edges: [],
        invariants: [{
          id: "inv:start",
          statement: "Start only when ready",
          strength: "must",
          status: "authored",
          subjectIds: ["phase:active"],
          evidenceIds: [],
        }],
        unknowns: [],
      },
      arena: {
        autoDetected: true,
        spatialLayout: {
          basis: "topology",
          replicas: [{}, {}],
        },
        lifecycle: {
          terminalCandidates: 2,
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
          proven: 1,
          partial: 1,
          unresolved: 0,
          assessments: [],
        },
      },
      scriptSpatial: {
        resolvedEffects: [],
        resolvedEffectSources: [],
        structurePlacements: [],
        failures: [],
        extractedMutations: 0,
        rejectedMutations: 0,
      },
      semanticIr: {
        stateSurfaces: 3,
        stateOperations: 8,
      },
      broadWrites: 1,
      structures: {
        definitions: 2,
        loads: 3,
        unresolvedLoads: 0,
        placements: 3,
        runtimeLogicLoads: 1,
      },
      entities: {
        definitions: 4,
        knowledgePrerequisiteGaps: 0,
        staticAnalysisLimits: 1,
      },
      unsupportedSurfaceSignals: {
        teleport: true,
        uiForm: true,
        environment: true,
        asyncCommandTransaction: true,
        dynamicCommand: true,
      },
    };
    const result = deriveGameplayWorldModel(source);

    expect(result.arenas.count).toBe(3);

    const capacityEvidence = {
      requestedConcurrentArenas: 6,
      arenaCountConflict: false,
      commandTickingAreaAdds: 0,
      completeCommandTickingAreaFamilies: 0,
      unmatchedCommandTickingAreaAdds: 0,
      commandTickingAreaResourceResolved: false,
      scriptTickingAreaManagerReferenced: false,
      scriptCapacitySignals: [],
      scriptTickingAreaCapacityResolved: false,
      conflictingPlayerCapacityValues: [],
      reasons: [],
    };
    const requestedOnly = deriveGameplayWorldModel({
      ...source,
      arena: {
        autoDetected: true,
        capacity: { resources: [], evidence: capacityEvidence },
      },
    });
    expect(requestedOnly.arenas.count).toBeUndefined();
    expect(requestedOnly.arenas.requestedConcurrentArenas).toBe(6);
    expect(requestedOnly.gameplayClosure.unknownSurfaceIds).toContain("runtime:arena");
    const unresolvedCapacity = deriveGameplayWorldModel({
      ...source,
      arena: {
        autoDetected: true,
        capacity: {
          resources: [],
          evidence: { ...capacityEvidence, unresolvedRosterCapacityPaths: 2 },
        },
      },
    });
    expect(unresolvedCapacity.arenas.unresolvedRosterCapacityPaths).toBe(2);
    expect(unresolvedCapacity.arenas.perArenaPlayerCapacity).toBeUndefined();
    expect(requestedOnly.gameplayClosure.unknownSurfaceIds).toContain("runtime:arena-capacity");

    const withDiscoveredCount = deriveGameplayWorldModel({
      ...source,
      arena: {
        autoDetected: true,
        capacity: {
          resources: [],
          evidence: { ...capacityEvidence, discoveredArenaCount: 4 },
        },
      },
    });
    expect(withDiscoveredCount.arenas.count).toBe(4);
    expect(withDiscoveredCount.arenas.requestedConcurrentArenas).toBe(6);
    expect(result.subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "objective",
          authored: 1,
        }),
      ]),
    );
    expect(result.state.broadWrites).toBe(1);
    expect(result.gameplayClosure.status).toBe("OPEN");
    expect(
      result.gameplayClosure.surfaces.map(
        (surface) => surface.id,
      ),
    ).toContain("runtime:arena-capacity");
    expect(
      result.gameplayClosure.unknownSurfaceIds,
    ).toEqual(
      expect.arrayContaining([
        "runtime:teleport",
        "runtime:ui-form",
        "runtime:environment",
        "runtime:async-command-transaction",
        "runtime:dynamic-command",
      ]),
    );
  });
});
