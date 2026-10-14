import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  bugReportV2IssueType,
  parseBugReportV2Json,
  serializeBugReportV2,
  type BugFinderCategory,
  type BugReportV2,
} from "../../../bug-report/src/index.js";
import {
  historicalRegressionId,
  mergeAndSaveHistoricalRegressions,
  type RegressionCase,
  type ReliabilityDomain,
} from "../../../reliability/src/index.js";
import type {
  ProjectRecord,
} from "../../../project-model/src/index.js";

const DOMAIN_BY_CATEGORY:
  Readonly<Record<BugFinderCategory, ReliabilityDomain>> = {
    "game-flow": "gameplay",
    "player-state": "state",
    "multiplayer-session": "multiplayer",
    "world-interaction": "world",
    "entity-behavior": "entities",
    "combat": "combat",
    "score-reward": "economy",
    "ui-feedback": "ui",
    "performance-stability": "stability",
    "compatibility": "compatibility",
  };

const CAPABILITIES_BY_CATEGORY:
  Readonly<Record<BugFinderCategory, readonly string[]>> = {
    "game-flow": [
      "gameplay-state",
      "progression",
    ],
    "player-state": [
      "state",
      "persistence",
    ],
    "multiplayer-session": [
      "multiplayer",
      "arena-lifecycle",
    ],
    "world-interaction": [
      "world-mutation",
      "spatial",
    ],
    "entity-behavior": [
      "entity-ai",
      "navigation",
    ],
    combat: [
      "combat",
      "entity-ai",
    ],
    "score-reward": [
      "economy",
      "reward",
    ],
    "ui-feedback": [
      "ui-state",
      "gameplay-state",
    ],
    "performance-stability": [
      "runtime-stability",
      "chunks",
    ],
    compatibility: [
      "compatibility",
      "platform",
    ],
  };

function unique(
  values: readonly string[],
): string[] {
  return [...new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort();
}

export function projectApprovedBugReportToHistoricalRegressions(
  input: {
    readonly projectId: string;
    readonly report: BugReportV2;
    readonly reportPath: string;
    readonly artifactFingerprint: string;
  },
): readonly RegressionCase[] {
  return input.report.bugs.map(
    (bug) => {
      const canonicalIssueId =
        historicalRegressionId({
          mapName:
            input.report.map.name,
          mapVersion:
            input.report.map.mapVersion,
          bugId: bug.id,
        });
      return {
        id: canonicalIssueId,
        canonicalIssueId,
        title: bug.title,
      issueType:
        bugReportV2IssueType(bug),
      domain:
        DOMAIN_BY_CATEGORY[
          bug.category
        ],
      discoveredBy:
        bug.foundBy === "tester"
          ? "approved-tester"
          : "approved-ai",
      provenance: {
        source:
          "Canonical Bug Report V2",
        projectId: input.projectId,
        reportPath: input.reportPath,
        map: input.report.map.name,
        mapVersion:
          input.report.map.mapVersion,
        bugId: bug.id,
        canonicalIssueId,
        issueType:
          bugReportV2IssueType(bug),
        artifactFingerprint:
          input.artifactFingerprint,
      },
      triggerTags: unique([
        "gameplay",
        bug.category,
        bug.severity,
        bugReportV2IssueType(bug)
          .toLowerCase()
          .replaceAll("_", "-"),
      ]),
      capabilityTags: [
        ...CAPABILITIES_BY_CATEGORY[
          bug.category
        ],
      ],
      ...(bug.reproduction?.length
        ? {
            reproduction: [
              ...bug.reproduction,
            ],
          }
        : {}),
        expected: bug.expected,
        observed: bug.observed,
      };
    },
  );
}

function canonicalReportPath(
  value: string,
): boolean {
  const normalized =
    value.replaceAll("\\", "/");
  return (
    normalized.startsWith(
      "workspace/reports/",
    ) &&
    normalized.endsWith(".json") &&
    !normalized
      .split("/")
      .includes("..")
  );
}

function reportDriveFileId(
  value: string,
): string | undefined {
  return value.match(
    /\/d\/([^/]+)\//
  )?.[1];
}

async function assertCanonicalReportBinding(
  input: {
    readonly repositoryRoot: string;
    readonly project: ProjectRecord;
    readonly report: BugReportV2;
    readonly reportPath: string;
  },
): Promise<void> {
  if (
    input.project.knowledge
      .bugReportPath !==
    input.reportPath
  ) {
    throw new Error(
      "Project Bug Report reference does not match the canonical report being projected.",
    );
  }

  if (!canonicalReportPath(input.reportPath)) {
    throw new Error(
      "Historical issue sync requires a canonical report path under workspace/reports/.",
    );
  }

  if (
    input.project.artifact.version !== undefined &&
    input.project.artifact.version !==
      input.report.map.mapVersion
  ) {
    throw new Error(
      "Historical issue sync map version does not match the selected project artifact.",
    );
  }

  const currentWorld =
    input.project.publication.drive
      ?.currentWorld;
  if (currentWorld !== undefined) {
    const reportFileId =
      reportDriveFileId(
        input.report.map.drive,
      );
    if (
      reportFileId !==
        currentWorld.fileId
    ) {
      throw new Error(
        "Historical issue sync report Drive file does not match the selected current world.",
      );
    }
    if (
      currentWorld.version !==
        input.report.map.mapVersion
    ) {
      throw new Error(
        "Historical issue sync report version does not match the selected current world.",
      );
    }
  }

  const persistedSource =
    await readFile(
      join(
        input.repositoryRoot,
        input.reportPath,
      ),
      "utf8",
    );
  const persisted =
    parseBugReportV2Json(
      persistedSource,
    );
  if (!persisted.ok) {
    throw new Error(
      "Canonical persisted Bug Report V2 is invalid.",
    );
  }

  const persistedNormalized =
    serializeBugReportV2(
      persisted.report,
    );
  const incomingNormalized =
    serializeBugReportV2(
      input.report,
    );
  if (
    !persistedNormalized.ok ||
    !persistedNormalized.json ||
    !incomingNormalized.ok ||
    !incomingNormalized.json ||
    persistedNormalized.json !==
      incomingNormalized.json
  ) {
    throw new Error(
      "Historical issue sync input does not match the persisted canonical Bug Report V2.",
    );
  }
}

/**
 * Historical issue knowledge is committed only from the persisted canonical
 * approved/current Bug Report V2. Project publication approval snapshots may
 * also exist, but remote-only audit history ingestion does not require a
 * second local approval-state owner. It never mutates ProjectRecord; the
 * reliability catalog itself is the sole owner of historical incident linkage.
 */
export async function syncApprovedProjectIssueHistory(
  input: {
    readonly repositoryRoot: string;
    readonly project: ProjectRecord;
    readonly report: BugReportV2;
    readonly reportPath: string;
  },
): Promise<{
  readonly historicalRegressionIds:
    readonly string[];
}> {
  await assertCanonicalReportBinding(
    input,
  );

  const records =
    projectApprovedBugReportToHistoricalRegressions({
      projectId:
        input.project.projectId,
      report: input.report,
      reportPath: input.reportPath,
      artifactFingerprint:
        input.project.artifact
          .artifactFingerprint,
    });

  const merged =
    await mergeAndSaveHistoricalRegressions(
      input.repositoryRoot,
      records,
    );

  return {
    historicalRegressionIds:
      records
        .map((record) => {
          const canonicalIssueId =
            record.canonicalIssueId ??
            record.id;
          return (
            merged.regressions.find(
              (item) =>
                item.id === record.id ||
                item.canonicalIssueId ===
                  canonicalIssueId,
            )?.id ??
            record.id
          );
        })
        .sort(),
  };
}
