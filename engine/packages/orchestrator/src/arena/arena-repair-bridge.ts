import type {
  InspectionRepairCandidate,
} from "../repair/repair-planning.js";
import type {
  ArenaRepairLocalization,
} from "./arena-repair-localization.js";

export interface ArenaRepairBridgeItem {
  kind: ArenaRepairLocalization["items"][number]["kind"];
  arenaId: string;
  status:
    | "deterministic-repair-available"
    | "proposal-only"
    | "unresolved";
  sourcePath?: string;
  line?: number;
  repairCandidateKind?: InspectionRepairCandidate["kind"];
  transactionId?: string;
  reasons: readonly string[];
}

export interface ArenaRepairBridge {
  items: readonly ArenaRepairBridgeItem[];
  deterministicRepairs: number;
  proposalOnly: number;
  unresolved: number;
}

function sameLocation(
  candidate: InspectionRepairCandidate,
  path: string,
  line: number | undefined,
): boolean {
  if (candidate.sourcePath !== path) {
    return false;
  }
  if (
    line === undefined ||
    candidate.line === undefined
  ) {
    return true;
  }
  return candidate.line === line;
}

export function bridgeArenaRepairLocalization(
  localization:
    ArenaRepairLocalization | undefined,
  repairCandidates:
    readonly InspectionRepairCandidate[],
): ArenaRepairBridge {
  if (!localization) {
    return {
      items: [],
      deterministicRepairs: 0,
      proposalOnly: 0,
      unresolved: 0,
    };
  }

  const items = localization.items.map(
    (item): ArenaRepairBridgeItem => {
      if (item.unresolved) {
        return {
          kind: item.kind,
          arenaId: item.arenaId,
          status: "unresolved",
          reasons: [
            "Arena divergence has no localized authored source candidate.",
          ],
        };
      }

      for (const source of item.candidates) {
        if (
          source.strength !==
          "exact-overlap"
        ) {
          continue;
        }

        const proposal = repairCandidates.find(
          (candidate) =>
            candidate.status === "proposal" &&
            candidate.proposal !== undefined &&
            sameLocation(
              candidate,
              source.source.relativePath,
              source.source.range?.lineStart,
            ),
        );
        if (proposal) {
          return {
            kind: item.kind,
            arenaId: item.arenaId,
            status: "proposal-only",
            sourcePath: source.source.relativePath,
            ...(source.source.range?.lineStart === undefined
              ? {}
              : { line: source.source.range.lineStart }),
            repairCandidateKind: proposal.kind,
            reasons: [
              "A matching source-grounded repair proposal exists, but no authorized patch transaction has been created.",
              "The arena divergence cannot be reported as automatically repairable until repair authorization and validation are established.",
            ],
          };
        }
      }

      const strongest =
        item.candidates[0];

      return {
        kind: item.kind,
        arenaId: item.arenaId,
        status: "proposal-only",
        ...(strongest === undefined
          ? {}
          : {
              sourcePath:
                strongest.source
                  .relativePath,
              ...(strongest.source.range
                  ?.lineStart === undefined
                ? {}
                : {
                    line:
                      strongest.source
                        .range
                        .lineStart,
                  }),
            }),
        reasons: [
          "Authored source localization exists, but no deterministic existing repair candidate binds to the same exact source location.",
          "Keep this divergence proposal-only until a safe repair realizer owns the mutation.",
        ],
      };
    },
  );

  return {
    items,
    deterministicRepairs:
      items.filter(
        (item) =>
          item.status ===
          "deterministic-repair-available",
      ).length,
    proposalOnly:
      items.filter(
        (item) =>
          item.status ===
          "proposal-only",
      ).length,
    unresolved:
      items.filter(
        (item) =>
          item.status ===
          "unresolved",
      ).length,
  };
}
