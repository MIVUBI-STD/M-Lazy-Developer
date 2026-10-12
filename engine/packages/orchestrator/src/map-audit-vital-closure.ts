import type { AuditObligation } from "./map-audit-obligations.js";

export const VITAL_GAMEPLAY_DOMAINS = [
  "ENTRY_ADMISSION",
  "GAME_STATE_PROGRESSION",
  "MULTI_ARENA_ISOLATION",
  "CONNECTION_RECOVERY",
  "INVENTORY_PLAYER_CAPABILITY",
  "WORLD_RESET_INTEGRITY",
  "SCORE_RESULT_INTEGRITY",
  "PLAYER_FACING_INFORMATION",
] as const;

export type VitalGameplayDomain =
  typeof VITAL_GAMEPLAY_DOMAINS[number];

export const VITAL_SCENARIO_DIMENSIONS = [
  "HAPPY_PATH",
  "FAILURE_PATH",
  "DISCONNECT_RECOVERY",
  "REUSE_SECOND_RUN",
  "CONCURRENT_INTERLEAVING",
  "BOUNDARY_CAPACITY",
] as const;

export type VitalScenarioDimension =
  typeof VITAL_SCENARIO_DIMENSIONS[number];

export type VitalGameplayDomainStatus =
  | "UNDERSTOOD_PROVEN_SAFE"
  | "UNDERSTOOD_WITH_FINDING"
  | "RUNTIME_REQUIRED"
  | "DETECTION_GAP"
  | "NOT_APPLICABLE";

export type VitalCriticality =
  | "TIER_0_GAME_KILLING"
  | "TIER_1_GAME_INTEGRITY"
  | "TIER_2_PLAYER_EXPERIENCE";

export interface VitalGameplayFindingInput {
  readonly id: string;
  readonly status: "PROVEN" | "NEED_VALIDATION";
  readonly failureDomain: string;
  readonly contributingDomains: readonly string[];
  readonly gameplayFlow: string;
  readonly informationMismatch: boolean;
}

export interface VitalGameplayDomainAssessment {
  readonly domain: VitalGameplayDomain;
  readonly criticality: VitalCriticality;
  readonly status: VitalGameplayDomainStatus;
  readonly invariants: readonly string[];
  readonly scenarioDimensions: readonly VitalScenarioDimension[];
  readonly findingIds: readonly string[];
  readonly runtimeResidueIds: readonly string[];
  readonly detectionGapIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface VitalGameplayClosure {
  readonly policy: "vital-gameplay-knowledge-closure";
  readonly status: "CLOSED" | "OPEN";
  readonly domains: readonly VitalGameplayDomainAssessment[];
  readonly unroutedResidueIds: readonly string[];
  readonly reasons: readonly string[];
}

const DOMAIN_CRITICALITY: Readonly<Record<
  VitalGameplayDomain,
  VitalCriticality
>> = {
  ENTRY_ADMISSION: "TIER_0_GAME_KILLING",
  GAME_STATE_PROGRESSION: "TIER_0_GAME_KILLING",
  MULTI_ARENA_ISOLATION: "TIER_0_GAME_KILLING",
  CONNECTION_RECOVERY: "TIER_0_GAME_KILLING",
  INVENTORY_PLAYER_CAPABILITY: "TIER_1_GAME_INTEGRITY",
  WORLD_RESET_INTEGRITY: "TIER_1_GAME_INTEGRITY",
  SCORE_RESULT_INTEGRITY: "TIER_1_GAME_INTEGRITY",
  PLAYER_FACING_INFORMATION: "TIER_2_PLAYER_EXPERIENCE",
};

const DOMAIN_INVARIANTS: Readonly<Record<
  VitalGameplayDomain,
  readonly string[]
>> = {
  ENTRY_ADMISSION: [
    "One player has at most one authoritative active admission/session owner.",
    "Capacity, team/role assignment, and start eligibility are revalidated at the commit boundary.",
  ],
  GAME_STATE_PROGRESSION: [
    "Every material phase/objective has a reachable success, failure, retry/recovery, and terminal disposition.",
    "No stale transition may advance a newer gameplay generation.",
  ],
  MULTI_ARENA_ISOLATION: [
    "One arena/session/generation cannot mutate another arena/session/generation.",
    "Declared concurrency must be deliverable by the selected artifact and platform resource limits.",
  ],
  CONNECTION_RECOVERY: [
    "Disconnect/reconnect resolves to exactly one authoritative session disposition.",
    "Expiry, reconnect, reload, and arena migration cannot create duplicate or stale ownership.",
  ],
  INVENTORY_PLAYER_CAPABILITY: [
    "Every player-acquirable capability with gameplay effect has an authorization and lifecycle owner.",
    "Managed inventory, equipment, role, and temporary capability state is restored or cleared exactly once.",
  ],
  WORLD_RESET_INTEGRITY: [
    "Every gameplay-significant player/system mutation has a reset, persistence, or explicit preservation owner.",
    "Run N+1 cannot inherit unintended mutable world/entity state from Run N.",
  ],
  SCORE_RESULT_INTEGRITY: [
    "Displayed score/result and persisted score/result describe the same terminal outcome.",
    "Winner/reward/result commits are eligible, conserved, and exactly once.",
  ],
  PLAYER_FACING_INFORMATION: [
    "Player-facing instructions, limits, capacity, state, score, timer, and result match playable/deliverable behavior.",
  ],
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function findingDomains(
  finding: VitalGameplayFindingInput,
): VitalGameplayDomain[] {
  const failureDomains = new Set([
    finding.failureDomain,
    ...finding.contributingDomains,
  ]);
  const out = new Set<VitalGameplayDomain>();

  if (
    finding.gameplayFlow === "ENTRY_JOIN" ||
    finding.gameplayFlow === "READY_START" ||
    failureDomains.has("boundary-capacity")
  ) {
    out.add("ENTRY_ADMISSION");
  }
  if (
    ["SETUP", "ACTIVE_GAMEPLAY", "PROGRESSION"].includes(
      finding.gameplayFlow,
    ) ||
    failureDomains.has("progression-wave-objective") ||
    failureDomains.has("state-ownership") ||
    failureDomains.has("temporal-async")
  ) {
    out.add("GAME_STATE_PROGRESSION");
  }
  if (
    failureDomains.has("arena-multi-arena") ||
    (
      failureDomains.has("boundary-capacity") &&
      finding.gameplayFlow !== "ENTRY_JOIN"
    )
  ) {
    out.add("MULTI_ARENA_ISOLATION");
  }
  if (
    finding.gameplayFlow === "RECOVERY" ||
    failureDomains.has("player-lifecycle") ||
    failureDomains.has("persistence-recovery")
  ) {
    out.add("CONNECTION_RECOVERY");
  }
  if (
    failureDomains.has("inventory-economy") ||
    (
      failureDomains.has("state-ownership") &&
      finding.gameplayFlow === "SETUP"
    )
  ) {
    out.add("INVENTORY_PLAYER_CAPABILITY");
  }
  if (
    finding.gameplayFlow === "CLEANUP_REPLAY" ||
    failureDomains.has("world-structure-mutation") ||
    failureDomains.has("chunk-simulation")
  ) {
    out.add("WORLD_RESET_INTEGRITY");
  }
  if (
    finding.gameplayFlow === "TERMINAL" ||
    (
      failureDomains.has("progression-wave-objective") &&
      finding.gameplayFlow === "PROGRESSION"
    )
  ) {
    out.add("SCORE_RESULT_INTEGRITY");
  }
  if (
    finding.informationMismatch ||
    failureDomains.has("ui-feedback-information")
  ) {
    out.add("PLAYER_FACING_INFORMATION");
  }

  return [...out];
}

const DOMAIN_TERMS: Readonly<Record<
  VitalGameplayDomain,
  readonly RegExp[]
>> = {
  ENTRY_ADMISSION: [
    /entry|join|admission|ready|start|team|party|capacity|queue/i,
  ],
  GAME_STATE_PROGRESSION: [
    /progress|objective|wave|round|phase|state|transition|terminal|softlock|timer/i,
  ],
  MULTI_ARENA_ISOLATION: [
    /arena|replica|concurr|cross[- ]arena|lease|ticking|capacity/i,
  ],
  CONNECTION_RECOVERY: [
    /disconnect|reconnect|recovery|reload|offline|expiry|leave|resume/i,
  ],
  INVENTORY_PLAYER_CAPABILITY: [
    /inventory|equipment|item|kit|economy|capability|permission|developer|creative/i,
  ],
  WORLD_RESET_INTEGRITY: [
    /world|structure|mutation|reset|cleanup|replay|baseline|entity|spatial|chunk/i,
  ],
  SCORE_RESULT_INTEGRITY: [
    /score|reward|result|winner|draw|leaderboard|terminal|commit/i,
  ],
  PLAYER_FACING_INFORMATION: [
    /ui|form|message|display|feedback|information|instruction|scoreboard|hud|dialogue/i,
  ],
};

function obligationDomains(
  obligation: AuditObligation,
): VitalGameplayDomain[] {
  const text = [
    obligation.id,
    obligation.title,
    obligation.reason,
    obligation.missingProof,
    obligation.validationTest,
    obligation.validationGroupKey,
    ...obligation.subjectIds,
    ...obligation.componentIds,
  ].join(" ");

  return VITAL_GAMEPLAY_DOMAINS.filter((domain) =>
    DOMAIN_TERMS[domain].some((pattern) =>
      pattern.test(text)
    )
  );
}

export function deriveVitalGameplayClosure(input: {
  readonly controlStatus: "READY_FOR_REVIEW" | "BLOCKED";
  readonly multiArenaDetected: boolean;
  readonly findings: readonly VitalGameplayFindingInput[];
  readonly auditObligations: readonly AuditObligation[];
}): VitalGameplayClosure {
  const findingsByDomain = new Map<
    VitalGameplayDomain,
    string[]
  >();
  const unresolvedFindingsByDomain = new Map<
    VitalGameplayDomain,
    string[]
  >();
  const runtimeByDomain = new Map<
    VitalGameplayDomain,
    string[]
  >();
  const detectionByDomain = new Map<
    VitalGameplayDomain,
    string[]
  >();
  const unroutedResidueIds: string[] = [];

  for (const finding of input.findings) {
    const domains = findingDomains(finding);
    if (domains.length === 0) {
      unroutedResidueIds.push(finding.id);
      continue;
    }
    for (const domain of domains) {
      const target =
        finding.status === "PROVEN"
          ? findingsByDomain
          : unresolvedFindingsByDomain;
      const current = target.get(domain) ?? [];
      current.push(finding.id);
      target.set(domain, current);
    }
  }

  for (const obligation of input.auditObligations) {
    const domains = obligationDomains(obligation);
    if (domains.length === 0) {
      unroutedResidueIds.push(obligation.id);
      continue;
    }
    for (const domain of domains) {
      const target =
        obligation.source === "runtime-proof"
          ? runtimeByDomain
          : detectionByDomain;
      const current = target.get(domain) ?? [];
      current.push(obligation.id);
      target.set(domain, current);
    }
  }

  for (const domain of VITAL_GAMEPLAY_DOMAINS) {
    const unresolved =
      unique(unresolvedFindingsByDomain.get(domain) ?? []);
    if (unresolved.length === 0) continue;
    const runtimeIds = new Set(runtimeByDomain.get(domain) ?? []);
    const detectionIds =
      detectionByDomain.get(domain) ?? [];
    const uncovered = unresolved.filter(
      (id) => !runtimeIds.has(id),
    );
    if (uncovered.length > 0) {
      detectionByDomain.set(
        domain,
        unique([...detectionIds, ...uncovered]),
      );
    }
  }

  const domains = VITAL_GAMEPLAY_DOMAINS.map(
    (domain): VitalGameplayDomainAssessment => {
      const notApplicable =
        domain === "MULTI_ARENA_ISOLATION" &&
        !input.multiArenaDetected;
      const findingIds =
        unique(findingsByDomain.get(domain) ?? []);
      const runtimeResidueIds =
        unique(runtimeByDomain.get(domain) ?? []);
      const detectionGapIds =
        unique(detectionByDomain.get(domain) ?? []);

      let status: VitalGameplayDomainStatus;
      const reasons: string[] = [];

      // Residue and contradictory findings outrank a negative detection flag.
      // This is a projection of canonical closure, not independent absence proof.
      if (detectionGapIds.length > 0) {
        status = "DETECTION_GAP";
        reasons.push(
          "Material vital-domain evidence remains unresolved by deterministic analysis.",
        );
      } else if (runtimeResidueIds.length > 0) {
        status = "RUNTIME_REQUIRED";
        reasons.push(
          "Only a bounded runtime-owned deciding fact remains for this vital domain.",
        );
      } else if (input.controlStatus !== "READY_FOR_REVIEW" ||
                 unroutedResidueIds.length > 0) {
        status = "DETECTION_GAP";
        reasons.push(
          "Canonical audit closure or residue routing is incomplete; neither a finding nor non-detection proves this domain understood or not applicable.",
        );
      } else if (findingIds.length > 0) {
        status = "UNDERSTOOD_WITH_FINDING";
        reasons.push(
          "The vital domain is understood and contains one or more canonical findings.",
        );
      } else if (notApplicable) {
        status = "NOT_APPLICABLE";
        reasons.push(
          "The closed canonical audit reports no multi-arena surface and no conflicting finding or residue; this projection adds no independent absence proof.",
        );
      } else {
        status = "UNDERSTOOD_PROVEN_SAFE";
        reasons.push(
          "Canonical audit closure is complete and no contradiction or unresolved residue remains in this vital domain.",
        );
      }

      return {
        domain,
        criticality: DOMAIN_CRITICALITY[domain],
        status,
        invariants: [...DOMAIN_INVARIANTS[domain]],
        scenarioDimensions: [...VITAL_SCENARIO_DIMENSIONS],
        findingIds,
        runtimeResidueIds,
        detectionGapIds,
        reasons,
      };
    },
  );

  const openDomains = domains.filter(
    (item) =>
      item.status === "RUNTIME_REQUIRED" ||
      item.status === "DETECTION_GAP",
  );
  const status =
    openDomains.length === 0 &&
    unroutedResidueIds.length === 0
      ? "CLOSED" as const
      : "OPEN" as const;

  return {
    policy: "vital-gameplay-knowledge-closure",
    status,
    domains,
    unroutedResidueIds: unique(unroutedResidueIds),
    reasons:
      status === "CLOSED"
        ? [
            "Every vital gameplay domain has a terminal safe, finding, or not-applicable disposition.",
          ]
        : [
            "One or more vital gameplay domains still require runtime or detection closure, or unresolved residue could not be routed safely.",
          ],
  };
}
