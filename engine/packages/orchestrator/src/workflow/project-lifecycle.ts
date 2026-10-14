import { createHash } from "node:crypto";
import {
  normalizeDriveProjectBinding,
  normalizeProjectDeliverable,
  projectLifecycleStatus,
  PROJECT_DELIVERABLE_KINDS,
  PROJECT_DRIVE_DESTINATION_ROLES,
} from "../../../project-model/src/index.js";
import type {
  DriveProjectBinding,
  ProjectApprovalSnapshot,
  ProjectDeliverableRef,
  ProjectDrivePublishReceipt,
  ProjectLifecycleStatus,
  ProjectRecord,
} from "../../../project-model/src/index.js";

export interface ProjectApprovalReadiness {
  readonly ready: boolean;
  readonly missing: readonly string[];
}

function hash(value: unknown): string {
  return (
    "sha256:" +
    createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex")
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort();
}

export function createProjectRecord(input: {
  readonly projectId: string;
  readonly projectName: string;
  readonly taskClass: ProjectRecord["taskClass"];
  readonly artifact: ProjectRecord["artifact"];
  readonly work?: ProjectRecord["work"];
  readonly drive?: DriveProjectBinding;
}): ProjectRecord {
  return {
    schemaVersion: 1,
    projectId: input.projectId.trim(),
    projectName: input.projectName.trim(),
    taskClass: input.taskClass,
    revision: 1,
    artifact: {
      ...input.artifact,
    },
    work: {
      ...(input.work ?? {}),
    },
    knowledge: {},
    publication: {
      ...(input.drive === undefined
        ? {}
        : { drive: input.drive }),
    },
  };
}

export function updateProjectRecord(
  current: ProjectRecord,
  update: {
    readonly artifact?: ProjectRecord["artifact"];
    readonly work?: ProjectRecord["work"];
    readonly bugReportPath?: string;
    readonly drive?: DriveProjectBinding;
  },
): ProjectRecord {
  const artifact =
    update.artifact ?? current.artifact;
  const work = {
    ...(update.work ?? current.work),
  };
  const knowledge = {
    ...(update.bugReportPath?.trim()
      ? {
          bugReportPath:
            update.bugReportPath.trim(),
        }
      : current.knowledge.bugReportPath ===
        undefined
        ? {}
        : {
            bugReportPath:
              current.knowledge
                .bugReportPath,
          }),
  };
  const nextDrive =
    update.drive ??
    current.publication.drive;

  const materiallyChanged =
    artifact.artifactFingerprint !==
      current.artifact
        .artifactFingerprint ||
    JSON.stringify(work) !==
      JSON.stringify(current.work) ||
    JSON.stringify(knowledge) !==
      JSON.stringify(current.knowledge) ||
    JSON.stringify(nextDrive ?? null) !==
      JSON.stringify(
        current.publication.drive ?? null,
      );

  const candidate: ProjectRecord = {
    ...current,
    artifact,
    work,
    knowledge,
    publication: {
      ...(nextDrive === undefined
        ? {}
        : { drive: nextDrive }),
      ...(materiallyChanged
        ? {}
        : {
            ...(current.publication
              .approvalSnapshotFingerprint ===
            undefined
              ? {}
              : {
                  approvalSnapshotFingerprint:
                    current.publication
                      .approvalSnapshotFingerprint,
                }),
            ...(current.publication
              .drivePublishReceiptFingerprint ===
            undefined
              ? {}
              : {
                  drivePublishReceiptFingerprint:
                    current.publication
                      .drivePublishReceiptFingerprint,
                }),
          }),
    },
  };

  if (
    JSON.stringify(candidate) ===
    JSON.stringify(current)
  ) {
    return current;
  }

  return {
    ...candidate,
    revision: current.revision + 1,
  };
}

export function assessProjectApprovalReadiness(input: {
  readonly project: ProjectRecord;
  readonly deliverables:
    readonly ProjectDeliverableRef[];
  readonly blockingReasons?:
    readonly string[];
  readonly requireBugReport?: boolean;
}): ProjectApprovalReadiness {
  const missing: string[] = [];
  const project = input.project;

  if (
    projectLifecycleStatus(project) !==
      "working"
  ) {
    missing.push(
      "project must be working before a new approval snapshot",
    );
  }
  if (!project.work.sessionId?.trim()) {
    missing.push("work session");
  }
  if (
    project.work.workSessionRevision ===
      undefined ||
    project.work.workSessionRevision < 1
  ) {
    missing.push("work session revision");
  }
  if (
    input.requireBugReport &&
    !project.knowledge
      .bugReportPath?.trim()
  ) {
    missing.push(
      "canonical Bug Report V2 reference",
    );
  }
  if (
    project.publication.drive === undefined
  ) {
    missing.push(
      "Drive project binding",
    );
  } else {
    try {
      const drive =
        normalizeDriveProjectBinding(
          project.publication.drive,
        );
      if (
        drive.projectId !==
          project.projectId
      ) {
        missing.push(
          "Drive project binding for this projectId",
        );
      }
    } catch {
      missing.push(
        "valid Drive project binding",
      );
    }
  }
  if (input.deliverables.length === 0) {
    missing.push("approved deliverables");
  }
  for (const deliverable of input.deliverables) {
    try {
      normalizeProjectDeliverable(
        deliverable,
      );
    } catch {
      missing.push(
        "valid deliverable: " +
          String(
            (deliverable as {
              kind?: unknown;
            }).kind ?? "unknown",
          ),
      );
    }
  }
  for (
    const reason of
      input.blockingReasons ?? []
  ) {
    if (reason.trim()) {
      missing.push(
        "blocker: " + reason.trim(),
      );
    }
  }

  return {
    ready: missing.length === 0,
    missing: unique(missing),
  };
}

function canonicalDeliverables(
  deliverables:
    readonly ProjectDeliverableRef[],
): ProjectDeliverableRef[] {
  const normalized =
    deliverables.map((item) =>
      normalizeProjectDeliverable(
        item,
      ),
    );

  const seen = new Set<string>();
  for (const item of normalized) {
    const key =
      item.destinationRole +
      "|" +
      item.kind +
      "|" +
      item.fingerprint;
    if (seen.has(key)) {
      throw new Error(
        "Project approval contains duplicate deliverable: " +
          key,
      );
    }
    seen.add(key);
  }

  return normalized.sort(
    (a, b) =>
      a.destinationRole.localeCompare(
        b.destinationRole,
      ) ||
      a.kind.localeCompare(b.kind) ||
      a.path.localeCompare(b.path),
  );
}

function approvalPayload(input: {
  readonly project: ProjectRecord;
  readonly deliverables:
    readonly ProjectDeliverableRef[];
  readonly auditRevision?: string;
}): Omit<
  ProjectApprovalSnapshot,
  "snapshotFingerprint"
> {
  return {
    schemaVersion: 1,
    projectId: input.project.projectId,
    projectRevision:
      input.project.revision,
    artifactFingerprint:
      input.project.artifact
        .artifactFingerprint,
    ...(input.auditRevision?.trim()
      ? {
          auditRevision:
            input.auditRevision.trim(),
        }
      : {}),
    ...(input.project.knowledge
      .bugReportPath?.trim()
      ? {
          bugReportPath:
            input.project.knowledge
              .bugReportPath.trim(),
        }
      : {}),
    deliverables:
      canonicalDeliverables(
        input.deliverables,
      ),
  };
}

export function createProjectApprovalSnapshot(
  input: {
    readonly project: ProjectRecord;
    readonly deliverables:
      readonly ProjectDeliverableRef[];
    readonly blockingReasons?:
      readonly string[];
    readonly requireBugReport?: boolean;
    readonly auditRevision?: string;
  },
): ProjectApprovalSnapshot {
  const readiness =
    assessProjectApprovalReadiness(
      input,
    );
  if (!readiness.ready) {
    throw new Error(
      "Project is not ready for approval: " +
        readiness.missing.join("; "),
    );
  }

  const payload =
    approvalPayload({
      project: input.project,
      deliverables:
        input.deliverables,
      ...(input.auditRevision === undefined ? {} : { auditRevision: input.auditRevision }),
    });
  return {
    ...payload,
    snapshotFingerprint:
      hash(payload),
  };
}

export function validateProjectApprovalSnapshot(
  snapshot: ProjectApprovalSnapshot,
): readonly string[] {
  if (
    snapshot === null ||
    typeof snapshot !== "object" ||
    snapshot.schemaVersion !== 1 ||
    !snapshot.projectId?.trim() ||
    !Number.isInteger(
      snapshot.projectRevision,
    ) ||
    snapshot.projectRevision < 1 ||
    !snapshot.artifactFingerprint
      ?.trim() ||
    !snapshot.snapshotFingerprint
      ?.trim() ||
    !Array.isArray(snapshot.deliverables)
  ) {
    return [
      "Project approval snapshot is structurally invalid.",
    ];
  }

  const snapshotKeys = new Set([
    "schemaVersion",
    "projectId",
    "projectRevision",
    "artifactFingerprint",
    "auditRevision",
    "bugReportPath",
    "deliverables",
    "snapshotFingerprint",
  ]);
  if (
    !Object.keys(
      snapshot as unknown as Record<string, unknown>,
    ).every((key) => snapshotKeys.has(key))
  ) {
    return [
      "Project approval snapshot contains unsupported or legacy fields.",
    ];
  }

  let deliverables:
    ProjectDeliverableRef[];
  try {
    deliverables =
      canonicalDeliverables(
        snapshot.deliverables,
      );
  } catch (error) {
    return [
      error instanceof Error
        ? error.message
        : "Project approval deliverables are invalid.",
    ];
  }

  const payload: Omit<
    ProjectApprovalSnapshot,
    "snapshotFingerprint"
  > = {
    schemaVersion:
      snapshot.schemaVersion,
    projectId:
      snapshot.projectId.trim(),
    projectRevision:
      snapshot.projectRevision,
    artifactFingerprint:
      snapshot.artifactFingerprint.trim(),
    ...(snapshot.auditRevision?.trim()
      ? {
          auditRevision:
            snapshot.auditRevision.trim(),
        }
      : {}),
    ...(snapshot.bugReportPath?.trim()
      ? {
          bugReportPath:
            snapshot.bugReportPath.trim(),
        }
      : {}),
    deliverables,
  };

  return snapshot.snapshotFingerprint ===
    hash(payload)
    ? []
    : [
        "Project approval snapshot fingerprint is invalid.",
      ];
}

export function approveProject(
  current: ProjectRecord,
  snapshot: ProjectApprovalSnapshot,
): ProjectRecord {
  const snapshotIssues =
    validateProjectApprovalSnapshot(
      snapshot,
    );
  if (snapshotIssues.length > 0) {
    throw new Error(
      snapshotIssues.join("; "),
    );
  }
  if (
    projectLifecycleStatus(current) !==
      "working" ||
    snapshot.projectId !==
      current.projectId ||
    snapshot.projectRevision !==
      current.revision ||
    snapshot.artifactFingerprint !==
      current.artifact
        .artifactFingerprint
  ) {
    throw new Error(
      "Approval snapshot is stale or belongs to another working project revision.",
    );
  }

  return {
    ...current,
    revision: current.revision + 1,
    publication: {
      ...current.publication,
      approvalSnapshotFingerprint:
        snapshot.snapshotFingerprint,
    },
  };
}

function canonicalDrivePublishedFiles(
  files:
    readonly ProjectDrivePublishReceipt[
      "files"
    ][number][],
): ProjectDrivePublishReceipt[
  "files"
][number][] {
  const kinds =
    new Set<string>(
      PROJECT_DELIVERABLE_KINDS,
    );
  const roles =
    new Set<string>(
      PROJECT_DRIVE_DESTINATION_ROLES,
    );
  const seen = new Set<string>();

  const normalized =
    files.map((item) => {
      if (
        item === null ||
        typeof item !== "object" ||
        !kinds.has(item.kind) ||
        !roles.has(
          item.destinationRole,
        ) ||
        !item.fileId.trim() ||
        !item.fileName.trim() ||
        !item.fingerprint.trim()
      ) {
        throw new Error(
          "Drive published file is structurally invalid.",
        );
      }

      const value = {
        kind: item.kind,
        destinationRole:
          item.destinationRole,
        fileId: item.fileId.trim(),
        fileName:
          item.fileName.trim(),
        fingerprint:
          item.fingerprint.trim(),
      };
      const key =
        value.destinationRole +
        "|" +
        value.kind +
        "|" +
        value.fingerprint;
      if (seen.has(key)) {
        throw new Error(
          "Drive publication contains duplicate approved file identity: " +
            key,
        );
      }
      seen.add(key);
      return value;
    });

  return normalized.sort(
    (a, b) =>
      a.destinationRole.localeCompare(
        b.destinationRole,
      ) ||
      a.kind.localeCompare(b.kind) ||
      a.fingerprint.localeCompare(
        b.fingerprint,
      ) ||
      a.fileId.localeCompare(b.fileId),
  );
}

export function createDrivePublishReceipt(
  input: {
    readonly project: ProjectRecord;
    readonly snapshot:
      ProjectApprovalSnapshot;
    readonly files:
      readonly ProjectDrivePublishReceipt[
        "files"
      ][number][];
  },
): ProjectDrivePublishReceipt {
  const snapshotIssues =
    validateProjectApprovalSnapshot(
      input.snapshot,
    );
  if (snapshotIssues.length > 0) {
    throw new Error(
      snapshotIssues.join("; "),
    );
  }
  if (
    projectLifecycleStatus(
      input.project,
    ) !== "approved"
  ) {
    throw new Error(
      "Drive publication requires an approved project.",
    );
  }
  if (
    input.project.publication
      .approvalSnapshotFingerprint !==
      input.snapshot
        .snapshotFingerprint
  ) {
    throw new Error(
      "Drive publication snapshot does not match the approved project snapshot.",
    );
  }

  const expected = new Map(
    input.snapshot.deliverables.map(
      (item) => [
        item.kind +
          "|" +
          item.destinationRole +
          "|" +
          item.fingerprint,
        item,
      ],
    ),
  );
  const files =
    canonicalDrivePublishedFiles(
      input.files,
    );
  const publishedKeys = new Set(
    files.map(
      (item) =>
        item.kind +
        "|" +
        item.destinationRole +
        "|" +
        item.fingerprint,
    ),
  );
  const unexpected = [
    ...publishedKeys,
  ].filter(
    (key) => !expected.has(key),
  );
  if (unexpected.length > 0) {
    throw new Error(
      "Drive publication includes file(s) outside the approved snapshot: " +
        unexpected.sort().join(", "),
    );
  }

  const payload = {
    schemaVersion: 1 as const,
    projectId:
      input.project.projectId,
    snapshotFingerprint:
      input.snapshot
        .snapshotFingerprint,
    files,
  };

  return {
    ...payload,
    receiptFingerprint:
      hash(payload),
  };
}

export function validateDrivePublishReceipt(
  receipt: ProjectDrivePublishReceipt,
): readonly string[] {
  if (
    receipt === null ||
    typeof receipt !== "object" ||
    receipt.schemaVersion !== 1 ||
    !receipt.projectId?.trim() ||
    !receipt.snapshotFingerprint
      ?.trim() ||
    !receipt.receiptFingerprint
      ?.trim() ||
    !Array.isArray(receipt.files)
  ) {
    return [
      "Drive publish receipt is structurally invalid.",
    ];
  }

  const receiptKeys = new Set([
    "schemaVersion",
    "projectId",
    "snapshotFingerprint",
    "files",
    "receiptFingerprint",
  ]);
  if (
    !Object.keys(
      receipt as unknown as Record<string, unknown>,
    ).every((key) => receiptKeys.has(key))
  ) {
    return [
      "Drive publish receipt contains unsupported or legacy fields.",
    ];
  }

  let files:
    ProjectDrivePublishReceipt[
      "files"
    ][number][];
  try {
    files =
      canonicalDrivePublishedFiles(
        receipt.files,
      );
  } catch (error) {
    return [
      error instanceof Error
        ? error.message
        : "Drive published files are invalid.",
    ];
  }

  const payload = {
    schemaVersion:
      receipt.schemaVersion,
    projectId:
      receipt.projectId.trim(),
    snapshotFingerprint:
      receipt.snapshotFingerprint.trim(),
    files,
  };

  return receipt.receiptFingerprint ===
    hash(payload)
    ? []
    : [
        "Drive publish receipt fingerprint is invalid.",
      ];
}

export function drivePublicationIsComplete(
  snapshot: ProjectApprovalSnapshot,
  receipt: ProjectDrivePublishReceipt,
): boolean {
  if (
    receipt.projectId !== snapshot.projectId ||
    receipt.snapshotFingerprint !==
      snapshot.snapshotFingerprint
  ) {
    return false;
  }

  const expected = new Set(
    snapshot.deliverables.map(
      (item) =>
        item.kind +
        "|" +
        item.destinationRole +
        "|" +
        item.fingerprint,
    ),
  );
  const published = new Set(
    receipt.files.map(
      (item) =>
        item.kind +
        "|" +
        item.destinationRole +
        "|" +
        item.fingerprint,
    ),
  );
  return (
    expected.size === published.size &&
    [...expected].every(
      (key) => published.has(key),
    )
  );
}

export function applyDrivePublishReceipt(
  current: ProjectRecord,
  snapshot: ProjectApprovalSnapshot,
  receipt: ProjectDrivePublishReceipt,
): ProjectRecord {
  const receiptIssues =
    validateDrivePublishReceipt(
      receipt,
    );
  if (receiptIssues.length > 0) {
    throw new Error(
      receiptIssues.join("; "),
    );
  }
  if (
    projectLifecycleStatus(current) !==
      "approved" ||
    receipt.projectId !==
      current.projectId ||
    receipt.snapshotFingerprint !==
      current.publication
        .approvalSnapshotFingerprint
  ) {
    throw new Error(
      "Drive receipt does not match the current approved project snapshot.",
    );
  }
  if (
    !drivePublicationIsComplete(
      snapshot,
      receipt,
    )
  ) {
    throw new Error(
      "Incomplete Drive publication cannot mark project drive-published.",
    );
  }

  return {
    ...current,
    revision: current.revision + 1,
    publication: {
      ...current.publication,
      drivePublishReceiptFingerprint:
        receipt.receiptFingerprint,
    },
  };
}

export function projectLifecycleCanTransition(
  from: ProjectLifecycleStatus,
  to: ProjectLifecycleStatus,
): boolean {
  return (
    (
      from === "working" &&
      to === "approved"
    ) ||
    (
      from === "approved" &&
      to === "drive-published"
    ) ||
    (
      (
        from === "approved" ||
        from === "drive-published"
      ) &&
      to === "working"
    )
  );
}
