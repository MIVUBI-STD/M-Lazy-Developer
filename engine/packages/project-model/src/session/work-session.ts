export type WorkSessionStage =
  | "new"
  | "understood"
  | "evidence-ready"
  | "diagnosed"
  | "repair-planned"
  | "patched"
  | "validated"
  | "deliverable";

export interface WorkSessionArtifactRef {
  artifactId: string;
  artifactFingerprint: string;
  label?: string;
  version?: string;
}

export interface WorkSessionReferences {
  completedCapabilityIds: readonly string[];
  evidenceIds: readonly string[];
  semanticNodeIds: readonly string[];
  proofClaimIds: readonly string[];
  validationScenarioIds: readonly string[];
}

export interface WorkSessionAuditBinding {
  readonly authority: "selected-map-audit";
  readonly auditRevision: string;
  readonly currentStage:
    | "TARGET"
    | "DISCOVERY"
    | "UNDERSTAND"
    | "FORMALIZE"
    | "EVALUATE"
    | "MODEL" // historical checkpoint compatibility only
    | "STRESS" // historical checkpoint compatibility only
    | "PROVE"
    | "REPORT"
    | "COMPLETE";
  readonly allowedNextAction:
    | "RESOLVE_BLOCKING_STAGE"
    | "RESOLVE_DEFECTS"
    | "PREPARE_REVIEW";
}

export interface WorkSessionCheckpoint {
  schemaVersion: 1;
  sessionId: string;
  goal: string;
  artifact: WorkSessionArtifactRef;
  stage: WorkSessionStage;
  /**
   * When present, selected-map audit is the stage authority. WorkSession.stage
   * is only a coarse UI/storage projection and must not drive audit progression.
   */
  audit?: WorkSessionAuditBinding;
  revision: number;
  references: WorkSessionReferences;
  nextActions: readonly string[];
  blockers: readonly string[];
}

const ALLOWED_STAGE_TRANSITIONS:
  Readonly<Record<WorkSessionStage, readonly WorkSessionStage[]>> = {
  new: ["understood"],
  understood: ["evidence-ready"],
  "evidence-ready": ["diagnosed"],
  diagnosed: ["repair-planned", "validated"],
  "repair-planned": ["patched"],
  patched: ["validated"],
  validated: ["deliverable", "repair-planned"],
  deliverable: [],
};

function normalizedSet(
  values: readonly string[] = [],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value) => value.trim().length > 0,
      ),
    ),
  ].sort();
}

function normalizedSequence(
  values: readonly string[] = [],
): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (
      !value.trim() ||
      seen.has(value)
    ) {
      continue;
    }

    seen.add(value);
    output.push(value);
  }

  return output;
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        value === right[index],
    )
  );
}

export function createWorkSessionCheckpoint(
  input: {
    sessionId: string;
    goal: string;
    artifact: WorkSessionArtifactRef;
    references?: Partial<WorkSessionReferences>;
    nextActions?: readonly string[];
    blockers?: readonly string[];
    audit?: WorkSessionAuditBinding;
  },
): WorkSessionCheckpoint {
  if (!input.sessionId.trim()) {
    throw new Error(
      "Work session id must be non-empty.",
    );
  }
  if (!input.goal.trim()) {
    throw new Error(
      "Work session goal must be non-empty.",
    );
  }
  if (
    !input.artifact.artifactId.trim() ||
    !input.artifact.artifactFingerprint.trim()
  ) {
    throw new Error(
      "Work session artifact identity and fingerprint must be non-empty.",
    );
  }

  return {
    schemaVersion: 1,
    sessionId: input.sessionId,
    goal: input.goal,
    artifact: {
      ...input.artifact,
    },
    stage: "new",
    ...(input.audit === undefined
      ? {}
      : { audit: input.audit }),
    revision: 1,
    references: {
      completedCapabilityIds:
        normalizedSet(
          input.references
            ?.completedCapabilityIds,
        ),
      evidenceIds:
        normalizedSet(
          input.references?.evidenceIds,
        ),
      semanticNodeIds:
        normalizedSet(
          input.references
            ?.semanticNodeIds,
        ),
      proofClaimIds:
        normalizedSet(
          input.references
            ?.proofClaimIds,
        ),
      validationScenarioIds:
        normalizedSet(
          input.references
            ?.validationScenarioIds,
        ),
    },
    nextActions:
      normalizedSequence(
        input.nextActions,
      ),
    blockers:
      normalizedSet(input.blockers),
  };
}

export function workSessionIsBlocked(
  checkpoint: WorkSessionCheckpoint,
): boolean {
  return checkpoint.blockers.length > 0;
}

export function advanceWorkSessionCheckpoint(
  current: WorkSessionCheckpoint,
  update: {
    stage: WorkSessionStage;
    artifactFingerprint?:
      string;
    audit?: WorkSessionAuditBinding;
    completedCapabilityIds?:
      readonly string[];
    evidenceIds?:
      readonly string[];
    semanticNodeIds?:
      readonly string[];
    proofClaimIds?:
      readonly string[];
    validationScenarioIds?:
      readonly string[];
    nextActions?: readonly string[];
    blockers?: readonly string[];
  },
): WorkSessionCheckpoint {
  const allowed =
    ALLOWED_STAGE_TRANSITIONS[
      current.stage
    ];

  if (
    current.audit?.authority === "selected-map-audit" &&
    update.audit === undefined
  ) {
    throw new Error(
      "Selected-map audit-bound work sessions must be advanced through an audit projection; manual stage advancement is not authoritative.",
    );
  }

  if (
    update.stage !== current.stage &&
    !allowed.includes(update.stage)
  ) {
    throw new Error(
      "Invalid work session stage transition: " +
        current.stage +
        " -> " +
        update.stage +
        ".",
    );
  }

  const nextFingerprint =
    update.artifactFingerprint ??
    current.artifact
      .artifactFingerprint;

  if (
    nextFingerprint !==
    current.artifact
      .artifactFingerprint
  ) {
    throw new Error(
      "Work session artifact fingerprint changed. Start a new session or explicitly rebase evidence; stale evidence must not be silently carried forward.",
    );
  }

  const references = {
    completedCapabilityIds:
      normalizedSet([
        ...current.references
          .completedCapabilityIds,
        ...(update
          .completedCapabilityIds ??
          []),
      ]),
    evidenceIds:
      normalizedSet([
        ...current.references
          .evidenceIds,
        ...(update.evidenceIds ??
          []),
      ]),
    semanticNodeIds:
      normalizedSet([
        ...current.references
          .semanticNodeIds,
        ...(update.semanticNodeIds ??
          []),
      ]),
    proofClaimIds:
      normalizedSet([
        ...current.references
          .proofClaimIds,
        ...(update.proofClaimIds ??
          []),
      ]),
    validationScenarioIds:
      normalizedSet([
        ...current.references
          .validationScenarioIds,
        ...(update
          .validationScenarioIds ??
          []),
      ]),
  };

  const nextActions =
    update.nextActions === undefined
      ? [...current.nextActions]
      : normalizedSequence(
          update.nextActions,
        );
  const blockers =
    update.blockers === undefined
      ? [...current.blockers]
      : normalizedSet(
          update.blockers,
        );

  const unchanged =
    update.stage === current.stage &&
    sameStrings(
      references.completedCapabilityIds,
      current.references
        .completedCapabilityIds,
    ) &&
    sameStrings(
      references.evidenceIds,
      current.references.evidenceIds,
    ) &&
    sameStrings(
      references.semanticNodeIds,
      current.references
        .semanticNodeIds,
    ) &&
    sameStrings(
      references.proofClaimIds,
      current.references.proofClaimIds,
    ) &&
    sameStrings(
      references.validationScenarioIds,
      current.references
        .validationScenarioIds,
    ) &&
    sameStrings(
      nextActions,
      current.nextActions,
    ) &&
    sameStrings(
      blockers,
      current.blockers,
    ) &&
    JSON.stringify(update.audit ?? current.audit ?? null) ===
      JSON.stringify(current.audit ?? null);

  if (unchanged) {
    return current;
  }

  return {
    ...current,
    stage: update.stage,
    ...(update.audit === undefined
      ? current.audit === undefined
        ? {}
        : { audit: current.audit }
      : { audit: update.audit }),
    revision:
      current.revision + 1,
    references,
    nextActions,
    blockers,
  };
}
