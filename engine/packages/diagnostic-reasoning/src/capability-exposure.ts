import type {
  GameplayReachabilityPath,
} from "./reachability-graph.js";

export type CapabilityExposureStatus =
  | "blocked"
  | "guarded"
  | "exposed"
  | "potentially-exposed"
  | "unknown";

export interface CapabilityExposureInput {
  readonly capabilityId: string;
  readonly capabilityLabel: string;
  readonly releaseEnabled:
    | "enabled"
    | "disabled"
    | "unknown";
  readonly authorization:
    | "required-and-enforced"
    | "required-but-missing"
    | "not-required"
    | "unknown";
  readonly triggerPresent: boolean;
  /**
   * Whether the protection that is being credited as authorization is actually
   * active in the selected production artifact. A declared guard that is never
   * imported, instantiated or subscribed must not be treated as enforced.
   */
  readonly guardActivation?:
    | "active"
    | "inactive"
    | "unknown"
    | "not-required";
  readonly prerequisitePaths?: readonly GameplayReachabilityPath[];
  readonly playerImpact:
    | "progression"
    | "state"
    | "fairness"
    | "interaction"
    | "debug-information"
    | "cosmetic"
    | "unknown";
  readonly evidenceIds?: readonly string[];
}

export interface CapabilityExposureAssessment {
  readonly capabilityId: string;
  readonly capabilityLabel: string;
  readonly status: CapabilityExposureStatus;
  readonly prerequisiteReachability:
    | "reachable"
    | "unreachable"
    | "unknown"
    | "not-required";
  readonly impact: CapabilityExposureInput["playerImpact"];
  readonly reasons: readonly string[];
  readonly evidenceIds: readonly string[];
}

export function assessCapabilityExposure(
  input: CapabilityExposureInput,
): CapabilityExposureAssessment {
  const paths = input.prerequisitePaths ?? [];
  const prerequisiteReachability =
    paths.length === 0
      ? "not-required" as const
      : paths.some(
          (path) =>
            path.resolution === "reachable",
        )
        ? "reachable" as const
        : paths.every(
            (path) =>
              path.resolution === "unreachable",
          )
          ? "unreachable" as const
          : "unknown" as const;

  const evidenceIds = [
    ...new Set([
      ...(input.evidenceIds ?? []),
      ...paths.flatMap((path) => path.evidenceIds),
    ]),
  ].sort();

  const reasons: string[] = [];

  if (input.releaseEnabled === "disabled") {
    reasons.push("Capability is disabled in the audited release artifact.");
    return {
      capabilityId: input.capabilityId,
      capabilityLabel: input.capabilityLabel,
      status: "blocked",
      prerequisiteReachability,
      impact: input.playerImpact,
      reasons,
      evidenceIds,
    };
  }

  if (!input.triggerPresent) {
    reasons.push("No player trigger path is present.");
    return {
      capabilityId: input.capabilityId,
      capabilityLabel: input.capabilityLabel,
      status: "blocked",
      prerequisiteReachability,
      impact: input.playerImpact,
      reasons,
      evidenceIds,
    };
  }

  if (
    input.authorization ===
    "required-and-enforced"
  ) {
    const activation = input.guardActivation ?? "unknown";
    if (activation === "active" || activation === "not-required") {
      reasons.push("Required authorization is enforced by an active production guard.");
      return {
        capabilityId: input.capabilityId,
        capabilityLabel: input.capabilityLabel,
        status: "guarded",
        prerequisiteReachability,
        impact: input.playerImpact,
        reasons,
        evidenceIds,
      };
    }

    if (activation === "inactive") {
      reasons.push("Authorization logic exists but its production guard is inactive, so it cannot be credited as protection.");
      return {
        capabilityId: input.capabilityId,
        capabilityLabel: input.capabilityLabel,
        status:
          prerequisiteReachability === "reachable" ||
          prerequisiteReachability === "not-required"
            ? "exposed"
            : "potentially-exposed",
        prerequisiteReachability,
        impact: input.playerImpact,
        reasons,
        evidenceIds,
      };
    }

    reasons.push("Authorization logic exists, but production guard activation is unproven.");
    return {
      capabilityId: input.capabilityId,
      capabilityLabel: input.capabilityLabel,
      status: "potentially-exposed",
      prerequisiteReachability,
      impact: input.playerImpact,
      reasons,
      evidenceIds,
    };
  }

  if (
    input.authorization ===
      "required-but-missing" &&
    (
      prerequisiteReachability === "reachable" ||
      prerequisiteReachability === "not-required"
    ) &&
    input.releaseEnabled === "enabled"
  ) {
    reasons.push("A player-triggerable capability is enabled without its required authorization gate.");
    return {
      capabilityId: input.capabilityId,
      capabilityLabel: input.capabilityLabel,
      status: "exposed",
      prerequisiteReachability,
      impact: input.playerImpact,
      reasons,
      evidenceIds,
    };
  }

  if (
    input.authorization ===
      "required-but-missing" &&
    // Disabled releases already returned a blocked assessment above.
    (input.releaseEnabled === "enabled" || input.releaseEnabled === "unknown")
  ) {
    reasons.push("Authorization is missing, but prerequisite reachability is not yet proven.");
    return {
      capabilityId: input.capabilityId,
      capabilityLabel: input.capabilityLabel,
      status: "potentially-exposed",
      prerequisiteReachability,
      impact: input.playerImpact,
      reasons,
      evidenceIds,
    };
  }

  reasons.push("Capability exposure cannot be fully resolved from current evidence.");
  return {
    capabilityId: input.capabilityId,
    capabilityLabel: input.capabilityLabel,
    status: "unknown",
    prerequisiteReachability,
    impact: input.playerImpact,
    reasons,
    evidenceIds,
  };
}
