import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayWorldModel,
} from "./inspection/gameplay-world-model.js";
import type {
  MandatoryAuditProcedureReceipt,
} from "./inspection/mandatory-audit-procedure.js";
import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  SelectedMapAuditAdmission,
  SelectedMapAuditStage,
} from "./map-audit-admission.js";
import type {
  AuditObligation,
} from "./map-audit-obligations.js";
import {
  auditUserIntentAuthorityNote,
  deriveAuditUserIntentSearchPressure,
  type AuditUserIntentEnvelope,
} from "./map-audit-user-intent.js";

export type AuditModelTaskKind =
  | "CHECKPOINT_REASONING"
  | "GAMEPLAY_TRANSLATION"
  | "COUNTERPROOF_SEARCH"
  | "PROOF_NAVIGATION"
  | "AUDIT_OBLIGATION";

export interface AuditModelTaskEvidenceContext {
  readonly id: string;
  readonly kind: "selected-artifact-evidence" | "analysis-receipt";
  readonly origin?: string;
  readonly locator?: string;
  readonly summary?: string;
}

export interface AuditModelTaskKnowledgeContext {
  readonly requirementId: string;
  readonly domain: string;
  readonly status: string;
  readonly capabilityIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly platformClaims?: GameplayWorldModel["platformKnowledge"]["claims"];
}

export interface AuditModelTaskKnowledgeLookup {
  readonly query: string;
  readonly matchedSubjectIds: readonly string[];
  readonly sourceEvidenceIds: readonly string[];
  readonly sourceLocators: readonly string[];
  readonly unresolvedSubjectIds: readonly string[];
  readonly omittedSupportedSubjectIds: readonly string[];
  readonly grounding: "SELECTED_ARTIFACT" | "GOAL_ONLY";
  readonly authority: "SEARCH_HINT_NOT_GAMEPLAY_PROOF";
}

export interface AuditModelTaskPacket {
  readonly schemaVersion: 1;
  readonly policy: "bounded-audit-model-task";
  readonly id: string;
  readonly auditRevision: string;
  readonly kind: AuditModelTaskKind;
  readonly stage: SelectedMapAuditStage;
  readonly goal: string;
  readonly decisionNeeded: string;
  readonly scenarioId?: string;
  readonly causalLinkId?: string;
  readonly checkpointId?: string;
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly requiredKnowledgeIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly evidenceContext: readonly AuditModelTaskEvidenceContext[];
  readonly unresolvedEvidenceIds: readonly string[];
  readonly knowledgeContext: readonly AuditModelTaskKnowledgeContext[];
  /** Route ChatGPT/source lookup from the current map, not from a generic bug taxonomy. */
  readonly knowledgeLookup?: AuditModelTaskKnowledgeLookup;
  readonly unresolvedObligationIds: readonly string[];
  readonly userSearchContext?: {
    readonly authorityNote: string;
    readonly priorityDomains:
      readonly string[];
    readonly priorityPlayerFlows:
      readonly string[];
    readonly symptomHints:
      readonly string[];
    readonly suspicionHints:
      readonly string[];
    readonly expectationHints:
      readonly string[];
    readonly designHints:
      readonly string[];
    readonly historicalHints:
      readonly string[];
    readonly scopeHints:
      readonly string[];
    readonly exclusionHints:
      readonly string[];
    readonly testConstraints:
      readonly string[];
  };
  readonly proofGoal?: string;
  readonly provenClaims?: readonly string[];
  readonly missingClaims?: readonly string[];
  readonly navigationRoute?: readonly {
    readonly order: number;
    readonly knowledgeDomain: string;
    readonly question: string;
    readonly purpose: string;
    readonly evidencePreference: string;
  }[];
  readonly evidenceSubstitutions?: readonly {
    readonly id: string;
    readonly replaces: string;
    readonly requiredEvidence: readonly string[];
    readonly applicableBecause: readonly string[];
    readonly decisionRule: string;
  }[];
  readonly historicalSearchHints?: readonly {
    readonly id: string;
    readonly family: string;
    readonly priority: "high" | "medium";
    readonly knowledgeDomains: readonly string[];
    readonly searchQuestions: readonly string[];
    readonly matchedBecause: readonly string[];
  }[];
  readonly historyPressure?: number;
  readonly familyProofCriteria?: readonly string[];
  readonly proofStopRule?: string;
  /**
   * False means the model must keep resolving source/cross-domain/formal proof
   * and must not hand the task to a local Minecraft/player test.
   */
  readonly runtimeRequired?: boolean;
  readonly allowedOutputs: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly stopCondition: string;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values.filter((value) => value.trim().length > 0),
  )].sort();
}

// A lookup suggestion uses only source-grounded selected-map mechanics.
// Unknown/hypothetical subjects remain visible and never become a reason to
// invent a mechanic or force an unrelated global knowledge domain.
export function deriveAuditModelKnowledgeLookup(
  intent: GameplayIntentModel,
  question: string,
  subjectIds: readonly string[],
): AuditModelTaskKnowledgeLookup | undefined {
  const wanted = unique(subjectIds);
  if (wanted.length === 0) return undefined;

  const evidenceById = new Map(
    intent.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const sourceOrigins = new Set([
    "game-design-spec", "source-code", "manifest", "command",
    "scoreboard", "tag", "dialogue", "translation", "structure", "world-db",
  ]);
  const bySubject = new Map(
    intent.nodes.map((node) => [node.id, node]),
  );
  const supported = wanted.flatMap((id) => {
    const node = bySubject.get(id);
    if (node === undefined || node.status === "hypothesis") return [];
    const sourceEvidenceIds = node.evidenceIds.filter((evidenceId) => {
      const evidence = evidenceById.get(evidenceId);
      if (evidence === undefined) return false;
      return evidence.scope === "selected-artifact" ||
        (evidence.scope === undefined && sourceOrigins.has(evidence.origin));
    });
    return sourceEvidenceIds.length === 0
      ? []
      : [{ node, sourceEvidenceIds }];
  });
  const matchedIds = new Set(supported.map(({ node }) => node.id));
  const bounded = supported.slice(0, 4);
  const query = [
    question.trim().slice(0, 220),
    ...bounded.map(({ node }) => node.label.trim().slice(0, 90)),
  ].filter(Boolean).join(" ").trim();
  if (!query) return undefined;
  const usedEvidenceIds = unique(
    bounded.flatMap(({ sourceEvidenceIds }) => sourceEvidenceIds),
  );

  return {
    query,
    matchedSubjectIds: bounded.map(({ node }) => node.id),
    sourceEvidenceIds: usedEvidenceIds,
    sourceLocators: unique(usedEvidenceIds.flatMap((id) => {
      const locator = evidenceById.get(id)?.locator;
      return locator === undefined ? [] : [locator];
    })),
    unresolvedSubjectIds: wanted.filter((id) => !matchedIds.has(id)),
    omittedSupportedSubjectIds: supported.slice(4).map(({ node }) => node.id),
    grounding: bounded.length > 0 ? "SELECTED_ARTIFACT" : "GOAL_ONLY",
    authority: "SEARCH_HINT_NOT_GAMEPLAY_PROOF",
  };
}

function evidenceContext(
  evidenceIds: readonly string[],
  intent: GameplayIntentModel,
): {
  readonly context: readonly AuditModelTaskEvidenceContext[];
  readonly unresolved: readonly string[];
} {
  const byId = new Map(
    intent.evidence.map((item) => [item.id, item]),
  );
  const context: AuditModelTaskEvidenceContext[] = [];
  const unresolved: string[] = [];

  for (const id of unique(evidenceIds)) {
    const evidence = byId.get(id);
    if (evidence !== undefined) {
      context.push({
        id,
        kind: "selected-artifact-evidence",
        origin: evidence.origin,
        locator: evidence.locator,
        summary: evidence.summary,
      });
      continue;
    }

    if (id.startsWith("analysis:")) {
      context.push({
        id,
        kind: "analysis-receipt",
        summary:
          "Capability execution receipt; resolve concrete scoped evidence from the matching RIG knowledge receipt before making a factual source claim.",
      });
      continue;
    }

    unresolved.push(id);
  }

  return {
    context,
    unresolved: unresolved.sort(),
  };
}

function knowledgeContextFor(
  requirementIds: readonly string[],
  graph: GameplayScenarioGraph,
  world: GameplayWorldModel,
): readonly AuditModelTaskKnowledgeContext[] {
  return unique(requirementIds).flatMap((requirementId) => {
    const requirement = graph.knowledgeRequirements.find(
      (item) => item.id === requirementId,
    );
    if (requirement === undefined) return [];
    const receipt = graph.knowledgeReceipts.find(
      (item) => item.requirementId === requirementId,
    );
    return [{
      requirementId,
      domain: requirement.domain,
      status: receipt?.status ?? "MISSING_RECEIPT",
      capabilityIds:
        receipt?.capabilityIdsUsed.length
          ? [...receipt.capabilityIdsUsed]
          : [...requirement.capabilityIds],
      evidenceIds: [...(receipt?.evidenceIds ?? [])],
      ...(requirement.domain === "platform-constraints"
        ? { platformClaims: world.platformKnowledge.claims }
        : {}),
    }];
  });
}

function checkpointPackets(
  stage: SelectedMapAuditStage,
  procedure: MandatoryAuditProcedureReceipt,
  auditRevision: string,
  intent: GameplayIntentModel,
): readonly AuditModelTaskPacket[] {
  return procedure.checkpoints
    .filter((checkpoint) =>
      checkpoint.blocksPublication &&
      (
        (stage === "TARGET" && checkpoint.id === "A1") ||
        (stage === "DISCOVERY" && checkpoint.id === "A2") ||
        (stage === "UNDERSTAND" && checkpoint.id.startsWith("A") && checkpoint.id !== "A1" && checkpoint.id !== "A2") ||
        (stage === "MODEL" && checkpoint.id.startsWith("B")) ||
        (stage === "STRESS" && checkpoint.id.startsWith("C")) ||
        (stage === "REPORT" && checkpoint.id.startsWith("E"))
      )
    )
    .map((checkpoint) => {
      const unresolved = checkpoint.obligations
        .filter((item) => item.required && !item.satisfied)
        .map((item) => item.id)
        .sort();
      const ids = unique([
        ...checkpoint.evidenceIds,
        ...checkpoint.obligations.flatMap((item) => item.evidenceIds),
      ]);
      const evidence = evidenceContext(ids, intent);
      return {
        schemaVersion: 1 as const,
        policy: "bounded-audit-model-task" as const,
        id: "task:checkpoint:" + checkpoint.id,
        auditRevision,
        kind: "CHECKPOINT_REASONING" as const,
        stage,
        goal:
          "Resolve only the blocking audit checkpoint " +
          checkpoint.id +
          " (" + checkpoint.label + ").",
        decisionNeeded:
          checkpoint.reason,
        checkpointId: checkpoint.id,
        subjectIds: [],
        componentIds: [],
        requiredKnowledgeIds: [],
        evidenceIds: ids,
        evidenceContext: evidence.context,
        unresolvedEvidenceIds: evidence.unresolved,
        knowledgeContext: [],
        unresolvedObligationIds: unresolved,
        allowedOutputs: [
          "diagnostic explanation of the blocking obligation",
          "missing evidence request",
          "detection gap",
        ],
        forbiddenActions: [
          "create or rank bug report items",
          "inspect unrelated gameplay systems",
          "infer intent from external/stale documents",
          "change audit stage",
          "claim the checkpoint is closed",
          "override deterministic obligation status",
          "infer the contents of unresolvedEvidenceIds",
        ],
        stopCondition:
          "Stop after diagnosing the current blocker and identifying the smallest evidence/engine change required. Do not close the checkpoint from model narrative; closure requires a new canonical audit run over updated evidence/engine state.",
      };
    });
}

function obligationPackets(
  obligations: readonly AuditObligation[],
  auditRevision: string,
  intent: GameplayIntentModel,
): readonly AuditModelTaskPacket[] {
  return obligations.map((obligation) => {
    const evidence =
      evidenceContext(
        obligation.evidenceIds,
        intent,
      );

    return {
      schemaVersion: 1 as const,
      policy: "bounded-audit-model-task" as const,
      id:
        "task:audit-obligation:" +
        obligation.id,
      auditRevision,
      kind: "AUDIT_OBLIGATION" as const,
      stage: obligation.stage,
      goal: obligation.title,
      decisionNeeded: obligation.reason,
      subjectIds: [...obligation.subjectIds],
      componentIds: [...obligation.componentIds],
      requiredKnowledgeIds: [],
      evidenceIds: [...obligation.evidenceIds],
      evidenceContext: evidence.context,
      unresolvedEvidenceIds:
        evidence.unresolved,
      knowledgeContext: [],
      unresolvedObligationIds: [
        obligation.id,
      ],
      missingClaims: [
        obligation.missingProof,
      ],
      allowedOutputs: [
        "selected-artifact evidence that resolves the obligation",
        "evidence-backed not-applicable or normal-behavior disposition",
        "new causal dependency/contradiction evidence for a fresh canonical audit run",
        "exact remaining missing-proof statement",
      ],
      forbiddenActions: [
        "classify BUG or DESIGN_MISMATCH without a player-visible causal contradiction",
        "assign severity",
        "invent expected behavior",
        "treat risk presence as defect proof",
        "use stale or external map behavior as current gameplay authority",
        "claim the obligation is closed from model narrative alone",
      ],
      stopCondition:
        "Stop when the obligation is either evidence-backed normal/not-applicable, causally grounded for a fresh audit run, or reduced to one exact missing-proof requirement. Do not promote it directly to a report issue from model narrative.",
    };
  });
}

function provePackets(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
  auditRevision: string,
  intent: GameplayIntentModel,
  world: GameplayWorldModel,
): readonly AuditModelTaskPacket[] {
  const ids = new Set([
    ...gate.gameplayTranslationRequiredIds,
    ...gate.counterProofSearchRequiredIds,
  ]);

  return graph.causalLinks
    .filter((link) => ids.has(link.id))
    .map((link) => {
      const scenario = graph.scenarios.find(
        (item) => item.id === link.scenarioId,
      );
      const requirement = link.knowledgeRequirementId === undefined
        ? undefined
        : graph.knowledgeRequirements.find(
            (item) => item.id === link.knowledgeRequirementId,
          );
      const needsTranslation =
        gate.gameplayTranslationRequiredIds.includes(link.id);
      const requirementIds =
        requirement === undefined ? [] : [requirement.id];
      const ids = unique([
        ...link.evidenceIds,
        ...(requirement === undefined ? [] : graph.knowledgeReceipts
          .filter((receipt) =>
            receipt.requirementId === requirement.id
          )
          .flatMap((receipt) => receipt.evidenceIds)),
      ]);
      const evidence = evidenceContext(ids, intent);
      return {
        schemaVersion: 1 as const,
        policy: "bounded-audit-model-task" as const,
        id:
          "task:" +
          (needsTranslation ? "translate:" : "counterproof:") +
          link.id,
        auditRevision,
        kind:
          needsTranslation
            ? "GAMEPLAY_TRANSLATION" as const
            : "COUNTERPROOF_SEARCH" as const,
        stage: "PROVE" as const,
        goal:
          needsTranslation
            ? "Translate the contradicted technical dependency into one concrete gameplay failure."
            : "Search only for deterministic blocking counter-proof for this contradicted gameplay dependency.",
        decisionNeeded:
          needsTranslation
            ? "Determine trigger, expected outcome, actual outcome, player-visible consequence, and affected scope."
            : "Determine whether a reachable guard/owner/generation/scope/cleanup/exclusion makes the wrong state unreachable before commit.",
        scenarioId: link.scenarioId,
        causalLinkId: link.id,
        subjectIds: unique(link.subjectIds),
        componentIds: unique(link.componentIds),
        requiredKnowledgeIds: requirementIds,
        evidenceIds: ids,
        evidenceContext: evidence.context,
        unresolvedEvidenceIds: evidence.unresolved,
        knowledgeContext:
          knowledgeContextFor(requirementIds, graph, world),
        unresolvedObligationIds: [],
        allowedOutputs:
          needsTranslation
            ? [
                "gameplay translation",
                "detection gap",
              ]
            : [
                "blocking counter-proof with evidence + CounterProofSearchReceipt",
                "counter-proof search exhausted within supplied scope + CounterProofSearchReceipt",
                "runtime proof required",
                "detection gap",
              ],
        forbiddenActions: [
          "inspect unrelated scenarios",
          "invent expected behavior not grounded in the selected artifact",
          "use nearby healthy code as counter-proof",
          "create final report text",
          "change severity",
          "infer the contents of unresolvedEvidenceIds",
        ],
        stopCondition:
          needsTranslation
            ? "Stop after one complete gameplay-causal translation or one explicit evidence gap."
            : "Stop only after returning a CounterProofSearchReceipt bound to this causal link scope. Exhaustion requires explicit searched dimensions, coverage evidence, exhaustiveWithinScope=true, and NO_BLOCKING_PROOF; a blocker requires BLOCKING_PROOF_FOUND.",
      };
    });
}

export function deriveAuditModelTaskPackets(input: {
  readonly admission: SelectedMapAuditAdmission;
  readonly procedure: MandatoryAuditProcedureReceipt;
  readonly graph: GameplayScenarioGraph;
  readonly defectResolution: GameplayDefectResolutionGate;
  readonly intent: GameplayIntentModel;
  readonly auditRevision: string;
  readonly world: GameplayWorldModel;
  readonly needValidationFindings?: readonly import("./map-audit-issue-projection.js").NeedValidationAuditIssueProjection[];
  readonly auditObligations?: readonly AuditObligation[];
  readonly userIntent?: AuditUserIntentEnvelope;
}): readonly AuditModelTaskPacket[] {
  const userPressure =
    deriveAuditUserIntentSearchPressure(
      input.userIntent,
    );
  const userSearchContext =
    input.userIntent === undefined
      ? undefined
      : {
          authorityNote:
            auditUserIntentAuthorityNote(),
          priorityDomains:
            Object.keys(userPressure.domains)
              .filter(
                (key) =>
                  (userPressure.domains as Record<string, number | undefined>)[key] !==
                  undefined,
              )
              .sort(),
          priorityPlayerFlows:
            Object.keys(userPressure.playerFlows)
              .filter(
                (key) =>
                  (userPressure.playerFlows as Record<string, number | undefined>)[key] !==
                  undefined,
              )
              .sort(),
          symptomHints:
            [...userPressure.symptomHints],
          suspicionHints:
            [...userPressure.suspicionHints],
          expectationHints:
            [...userPressure.expectationHints],
          designHints:
            [...userPressure.designHints],
          historicalHints:
            [...userPressure.historicalHints],
          scopeHints:
            [...userPressure.scopeHints],
          exclusionHints:
            [...userPressure.exclusionHints],
          testConstraints:
            [...userPressure.testConstraints],
        };

  const navigationPackets =
    (input.needValidationFindings ?? [])
      .filter((finding) =>
        finding.proofNavigation !== undefined
      )
      .map((finding) => {
        const navigation =
          finding.proofNavigation!;
        const evidence =
          evidenceContext(
            finding.evidenceIds,
            input.intent,
          );
        return {
          schemaVersion: 1 as const,
          policy: "bounded-audit-model-task" as const,
          id:
            "task:proof-navigation:" +
            finding.causalLinkId,
          auditRevision: input.auditRevision,
          kind: "PROOF_NAVIGATION" as const,
          stage: "PROVE" as const,
          goal:
            "Resolve NEED_VALIDATION finding " +
            finding.causalLinkId +
            " toward PROVEN using the cheapest sufficient proof route before runtime.",
          decisionNeeded:
            finding.validationReason,
          scenarioId: finding.scenarioId,
          causalLinkId: finding.causalLinkId,
          subjectIds: [...finding.subjectIds],
          componentIds: [...finding.componentIds],
          requiredKnowledgeIds:
            finding.knowledgeRequirementId === undefined
              ? []
              : [finding.knowledgeRequirementId],
          evidenceIds: [...finding.evidenceIds],
          evidenceContext: evidence.context,
          unresolvedEvidenceIds:
            evidence.unresolved,
          knowledgeContext:
            finding.knowledgeRequirementId === undefined
              ? []
              : knowledgeContextFor(
                  [finding.knowledgeRequirementId],
                  input.graph,
                  input.world,
                ),
          unresolvedObligationIds: [],
          proofGoal: navigation.proofGoal,
          provenClaims: [
            ...navigation.provenClaims,
          ],
          missingClaims: [
            ...navigation.missingClaims,
          ],
          navigationRoute: [
            ...navigation.route,
          ],
          evidenceSubstitutions: [
            ...navigation.evidenceSubstitutions,
          ],
          historicalSearchHints:
            navigation.historicalSearchHints.map(
              (hint) => ({
                id: hint.id,
                family: hint.family,
                priority: hint.priority,
                knowledgeDomains: [
                  ...hint.knowledgeDomains,
                ],
                searchQuestions: [
                  ...hint.searchQuestions,
                ],
                matchedBecause: [
                  ...hint.matchedBecause,
                ],
              }),
            ),
          historyPressure:
            navigation.historyPressure,
          familyProofCriteria: [
            ...navigation.familyProofCriteria,
          ],
          proofStopRule:
            navigation.proofStopRule,
          runtimeRequired:
            navigation.runtimeRequired === true,
          allowedOutputs: [
            "new selected-artifact proof",
            "cross-domain corroboration",
            "historically informed targeted search",
            "blocking counter-proof",
            "formal contradiction proof",
            "evidence substitution that removes runtime need",
            "PROVEN-ready causal resolution",
            ...(navigation.runtimeRequired === true
              ? [
                  "exactly one narrow runtime proof request after earlier routes are exhausted",
                ]
              : []),
          ],
          forbiddenActions: [
            "skip directly to runtime while an earlier navigation route remains applicable",
            ...(navigation.runtimeRequired === true
              ? []
              : [
                  "request a local Minecraft/player test while runtimeRequired=false",
                ]),
            "invent evidence",
            "infer unresolved evidence contents",
            "change severity",
            "inspect unrelated scenarios",
            "use historical/stale map behavior as current gameplay authority",
          ],
          stopCondition:
            navigation.runtimeRequired === true
              ? "Stop immediately when universal minimum proof and every applicable family saturation criterion are grounded with counter-proof cleared. If non-runtime proof still cannot decide the explicitly runtime-native claim, request exactly one narrow deciding runtime observation."
              : "Keep resolving selected-artifact, cross-domain, or formal proof until the claim is decided or the evidence model itself is shown insufficient. Do not request Minecraft/player testing merely to confirm a source-decidable claim.",
        };
      });

  const auditObligationPackets =
    obligationPackets(
      input.auditObligations ?? [],
      input.auditRevision,
      input.intent,
    );

  const stage = input.admission.firstBlockingStage;
  const packets =
    stage === undefined
      ? [
          ...navigationPackets,
          ...auditObligationPackets,
        ]
      : stage === "PROVE"
        ? (() => {
            const prove = provePackets(
              input.graph,
              input.defectResolution,
              input.auditRevision,
              input.intent,
              input.world,
            );
            return prove.length > 0
              ? [
                  ...prove,
                  ...navigationPackets,
                  ...auditObligationPackets,
                ]
              : [
                  ...checkpointPackets(
                    stage,
                    input.procedure,
                    input.auditRevision,
                    input.intent,
                  ),
                  ...navigationPackets,
                  ...auditObligationPackets,
                ];
          })()
        : [
            ...checkpointPackets(
              stage,
              input.procedure,
              input.auditRevision,
              input.intent,
            ),
            ...navigationPackets,
            ...auditObligationPackets,
          ];

  return packets.map((packet) => {
    const knowledgeLookup = deriveAuditModelKnowledgeLookup(
      input.intent,
      packet.decisionNeeded,
      packet.subjectIds,
    );
    return {
      ...packet,
      ...(userSearchContext === undefined
        ? {}
        : { userSearchContext }),
      ...(knowledgeLookup === undefined ? {} : { knowledgeLookup }),
    };
  });
}
