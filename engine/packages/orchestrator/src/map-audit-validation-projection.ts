import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  GameplayCapabilityDeliveryAssessment,
} from "../../diagnostic-reasoning/src/index.js";
import {
  assessReadyResolutionSaturation,
} from "./map-audit-proof-saturation.js";
import {
  projectionContext,
  projectReadyAuditIssues,
  sortIssues,
  type AuditIssueProjection,
  type NeedValidationAuditIssueProjection,
} from "./map-audit-issue-projection.js";

export function projectNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  const confirmed = new Set(
    gate.confirmedDefectReadyIds,
  );

  return sortIssues(
    gate.resolutions.flatMap((resolution) => {
      if (!confirmed.has(resolution.causalLinkId)) {
        return [];
      }

      const saturation =
        assessReadyResolutionSaturation(
          graph,
          resolution,
        );
      if (saturation.saturated) {
        return [];
      }

      const context = projectionContext(
        graph,
        resolution.causalLinkId,
        capabilityDelivery,
      );
      if (context === undefined) {
        throw new Error(
          "Confirmation-ready unresolved defect lost its causal-link/scenario owner: " +
            resolution.causalLinkId +
            ".",
        );
      }

      const {
        link,
        scenario,
        subjectIds,
        componentIds,
        playerFacingEvidenceIds,
        informationMismatch,
        classification,
        issueType,
      } = context;

      const gameplayTrigger =
        resolution.gameplayTrigger?.trim();
      const gameplayConsequence =
        resolution.gameplayConsequence?.trim();
      const expectedOutcome =
        resolution.expectedOutcome?.trim();
      const actualOutcome =
        resolution.actualOutcome?.trim();
      const affectedScope =
        resolution.affectedScope?.trim();

      if (
        !gameplayTrigger ||
        !gameplayConsequence ||
        !expectedOutcome ||
        !actualOutcome ||
        !affectedScope
      ) {
        throw new Error(
          "CONFIRMED_DEFECT_READY resolution lacks the gameplay translation required for a NEED_VALIDATION finding: " +
            resolution.causalLinkId +
            ".",
        );
      }

      const missingCriteria = [
        ...saturation.missingUniversalCriteriaIds,
        ...saturation.missingFamilyCriteriaIds,
      ];

      return [{
        status: "NEED_VALIDATION" as const,
        issueType,
        failureDomain:
          classification.failureDomain,
        contributingDomains:
          classification.contributingDomains,
        gameplayFlow:
          classification.gameplayFlow,
        informationMismatch,
        playerFacingEvidenceIds,
        causalLinkId: resolution.causalLinkId,
        scenarioId: scenario.id,
        gameplayStage: scenario.gameplayStage,
        scenarioLabel: scenario.label,
        gameplayTrigger,
        gameplayConsequence,
        expectedOutcome,
        actualOutcome,
        affectedScope,
        subjectIds: [
          ...new Set([
            ...subjectIds,
            ...(resolution.subjectIds ?? []),
          ]),
        ].sort(),
        componentIds: [
          ...new Set([
            ...componentIds,
            ...(resolution.componentIds ?? []),
          ]),
        ].sort(),
        evidenceIds: [
          ...new Set([
            ...link.evidenceIds,
            ...(resolution.evidenceIds ?? []),
            ...(resolution.counterProofSearch?.evidenceIds ?? []),
          ]),
        ].sort(),
        ...(resolution.knowledgeRequirementIds?.length
          ? { knowledgeRequirementIds: [...new Set(resolution.knowledgeRequirementIds)].sort() }
          : {}),
        validationReason:
          "The gameplay defect is causally translated and blocking counter-proof is cleared, but minimum sufficient proof is not yet saturated.",
        missingProof:
          missingCriteria.length > 0
            ? "Unsatisfied proof criteria: " +
              missingCriteria.join(", ") +
              "."
            : "Minimum sufficient proof remains incomplete.",
        validationTest:
          "Resolve only the unsatisfied proof criteria for '" +
          scenario.label +
          "'. Do not broaden testing or request runtime evidence for already-satisfied dimensions.",
        validationGroupKey:
          scenario.id +
          ":" +
          (
            (resolution.knowledgeRequirementIds?.length
              ? [...new Set(resolution.knowledgeRequirementIds)].sort().join("+")
              : classification.failureDomain)
          ),
      }];
    }),
  );
}
/**
 * Compatibility alias for callers that previously requested "all" unresolved
 * issues. Audit/model/coverage gaps are no longer coerced into BUG findings;
 * they are owned by deriveAuditObligations().
 */
export function projectAllNeedValidationAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly NeedValidationAuditIssueProjection[] {
  return projectNeedValidationAuditIssues(
    graph,
    gate,
    capabilityDelivery,
  );
}

export function projectAllAuditIssues(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  capabilityDelivery:
    readonly GameplayCapabilityDeliveryAssessment[] = [],
): readonly AuditIssueProjection[] {
  return sortIssues([
    ...projectReadyAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
    ...projectAllNeedValidationAuditIssues(
      graph,
      gate,
      capabilityDelivery,
    ),
  ]);
}
