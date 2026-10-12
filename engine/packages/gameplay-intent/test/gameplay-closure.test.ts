import { describe, expect, it } from "vitest";
import {
  assessGameplayModelClosure,
  buildIntentClosureSurfaces,
  type GameplayIntentModel,
} from "../src/index.js";

const intent: GameplayIntentModel = {
  schemaVersion: 1,
  id: "closure:test",
  artifactId: "map:test",
  evidence: [],
  nodes: [
    {
      id: "phase:lobby",
      kind: "phase",
      label: "Lobby",
      status: "authored",
      evidenceIds: [],
    },
    {
      id: "phase:combat",
      kind: "phase",
      label: "Combat",
      status: "authored",
      evidenceIds: [],
    },
  ],
  edges: [],
  invariants: [],
  unknowns: [],
};

describe("gameplay model closure", () => {
  it("stays OPEN after complete source recognition when no gameplay has been reconstructed", () => {
    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: [],
      surfaces: [],
      stateModelComplete: true,
      boundariesExtracted: true,
    });
    expect(result.status).toBe("OPEN");
    expect(result.reasons.join(" ")).toContain("source recognition alone");
  });

  it("does not confuse a generic game/root with reconstructed mechanics", () => {
    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: ["game:root", "runtime:state"],
      surfaces: [
        { id: "game:root", label: "Map", kind: "game", material: true, status: "understood" },
        { id: "runtime:state", label: "State present", kind: "runtime-domain", material: true, status: "understood" },
      ],
      stateModelComplete: true,
      boundariesExtracted: true,
    });
    expect(result.status).toBe("OPEN");
  });

  it("is OPEN when the state model is incomplete", () => {
    const surfaces = buildIntentClosureSurfaces(intent);
    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: surfaces.map((surface) => surface.id),
      surfaces,
      stateModelComplete: false,
      boundariesExtracted: true,
    });

    expect(result.status).toBe("OPEN");
  });

  it("is PARTIAL when material boundaries remain unresolved", () => {
    const surfaces = buildIntentClosureSurfaces(intent);
    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: surfaces.map((surface) => surface.id),
      surfaces,
      stateModelComplete: true,
      boundariesExtracted: false,
    });

    expect(result.status).toBe("PARTIAL");
  });

  it("is PARTIAL when a material surface remains unknown", () => {
    const surfaces = [
      ...buildIntentClosureSurfaces(intent),
      {
        id: "runtime:arena-capacity",
        label: "Arena capacity",
        kind: "runtime-domain" as const,
        status: "unknown" as const,
        material: true,
        reason: "Concurrent capacity is unresolved.",
      },
    ];

    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: surfaces.map((surface) => surface.id),
      surfaces,
      stateModelComplete: true,
      boundariesExtracted: true,
    });

    expect(result.status).toBe("PARTIAL");
    expect(result.unknownSurfaceIds).toContain(
      "runtime:arena-capacity",
    );
  });

  it("keeps inferred material surfaces unresolved until grounded", () => {
    const inferredModel: GameplayIntentModel = {
      ...intent,
      nodes: [
        {
          id: "resource:max-concurrent-arenas",
          kind: "resource",
          label: "Max Concurrent Arenas",
          status: "inferred",
          evidenceIds: [],
        },
      ],
    };
    const surfaces =
      buildIntentClosureSurfaces(inferredModel);

    expect(surfaces[0]?.status).toBe("unknown");
    expect(surfaces[0]?.material).toBe(true);
  });

  it("retains unowned source gaps in whole-game closure without inventing mechanics", () => {
    const model: GameplayIntentModel = {
      ...intent,
      unknowns: [
        {
          id: "unknown:script-tag-dynamic-key:region-1",
          question: "Selected-artifact tag key unresolved.",
          blockedSubjectIds: [],
          evidenceIds: ["state-op:dynamic-tag"],
        },
        {
          id: "unknown:unplaced",
          question: "An observed dependency has an unresolved owner.",
          blockedSubjectIds: ["phase:combat", "state:missing"],
          evidenceIds: ["state-op:unplaced"],
        },
      ],
    };
    const surfaces = buildIntentClosureSurfaces(model);
    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: intent.nodes.map(node => node.id),
      surfaces,
      stateModelComplete: true,
      boundariesExtracted: true,
    });
    expect(result.status).toBe("PARTIAL");
    expect(result.unknownSurfaceIds).toEqual([
      "intent-unknown:unknown:script-tag-dynamic-key:region-1",
      "intent-unknown:unknown:unplaced",
      "phase:combat",
    ]);
    expect(surfaces.find(item =>
      item.id === "intent-unknown:unknown:script-tag-dynamic-key:region-1"
    )?.evidenceIds).toEqual(["state-op:dynamic-tag"]);
    expect(result.unaccountedSurfaceIds).toEqual([]);
  });

  it("is CLOSED only when all discovered material surfaces are accounted", () => {
    const surfaces = buildIntentClosureSurfaces(intent);
    const result = assessGameplayModelClosure({
      discoveredSurfaceIds: surfaces.map((surface) => surface.id),
      surfaces,
      stateModelComplete: true,
      boundariesExtracted: true,
    });

    expect(result.status).toBe("CLOSED");
    expect(result.unaccountedSurfaceIds).toEqual([]);
  });
});
