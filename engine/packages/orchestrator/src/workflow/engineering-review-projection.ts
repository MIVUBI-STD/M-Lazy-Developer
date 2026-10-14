import type { IntentDiagnosticDisposition } from "../../../diagnostic-reasoning/src/index.js";
import { diagnosticDefinitions, type DiagnosticDefinition, type DiagnosticFinding } from "../../../diagnostics/src/index.js";
import type { CausalIncident, DecisionLedgerSnapshot } from "../../../project-model/src/index.js";
import type { InspectArtifactResult } from "../inspection/inspect-artifact.js";
import type { EvidenceRecoveryPlan } from "../diagnosis/evidence-recovery.js";
import type { InspectionRepairCandidate } from "../repair/repair-planning.js";
import type { GameplayIntentRuntimeAssessment } from "../inspection/gameplay-intent-runtime-stage.js";
import type { ValidationTraceReport } from "../../../validation/src/index.js";
import { buildEngineeringReviewInvalidationProjection, type EngineeringReviewInvalidationProjection } from "./engineering-review-invalidation.js";
import { buildEngineeringReviewPriority, type EngineeringReviewPriorityProjection } from "./engineering-review-priority.js";

export type EngineeringReviewSource = Pick<
  InspectArtifactResult,
  | "artifactId"
  | "fingerprint"
  | "archiveEntries"
  | "targetCompatibility"
  | "gameplayIntent"
  | "gameplayIntentRuntime"
  | "causalAnalysis"
  | "evidenceRecovery"
  | "repairCandidates"
  | "diagnostics"
  | "decisionBasis"
>;

export interface EngineeringReviewAttention {
  kind:
    | "critical-diagnostic"
    | "confirmed-defect"
    | "design-review"
    | "ambiguous-intent"
    | "insufficient-evidence"
    | "runtime-proof-required"
    | "evidence-recovery"
    | "proposed-repair";
  count: number;
  reason: string;
}

export interface EngineeringReviewRuntimeAssessment {
  id: string;
  outcomeId: string;
  disposition: IntentDiagnosticDisposition;
  subjectIds: readonly string[];
  basisInvariantIds: readonly string[];
  evidenceIds: readonly string[];
  nextEvidenceNeed: GameplayIntentRuntimeAssessment["result"]["nextEvidenceNeed"];
  reasons: readonly string[];
}

export interface EngineeringReviewDiagnostic {
  id: string;
  code: DiagnosticFinding["code"];
  severity: DiagnosticFinding["severity"];
  message: string;
  source?: DiagnosticFinding["source"];
  relatedNodeIds: readonly string[];
}

export interface EngineeringReviewIncident {
  id: string;
  scopeKey: string;
  severity: CausalIncident["severity"];
  confidence: CausalIncident["confidence"];
  chainIds: readonly string[];
  relatedDiagnosticIds: readonly string[];
  rootCauseCandidates: Array<{
    id: string;
    label: string;
    evidenceLevel: CausalIncident["rootCauseCandidates"][number]["evidenceLevel"];
    severity: CausalIncident["rootCauseCandidates"][number]["severity"];
    confidence: CausalIncident["rootCauseCandidates"][number]["confidence"];
  }>;
}

export interface EngineeringReviewRepairCandidate {
  kind: InspectionRepairCandidate["kind"];
  diagnosticCode: InspectionRepairCandidate["diagnosticCode"];
  sourcePath: string;
  line?: number;
  status: InspectionRepairCandidate["status"];
  reason?: string;
}

export interface EngineeringReviewProjection {
  schemaVersion: 1;
  artifact: {
    id: string;
    fingerprint: string;
    archiveEntries: number;
    target: EngineeringReviewSource["targetCompatibility"];
  };
  understanding: {
    nodes: number;
    authoredNodes: number;
    inferredNodes: number;
    hypothesisNodes: number;
    invariants: number;
    unknowns: Array<{
      id: string;
      question: string;
      blockedSubjectIds: readonly string[];
      evidenceIds: readonly string[];
    }>;
  };
  runtimeClassifications: Record<IntentDiagnosticDisposition, number>;
  runtimeAssessments: EngineeringReviewRuntimeAssessment[];
  attention: EngineeringReviewAttention[];
  diagnosticDefinitions: DiagnosticDefinition[];
  diagnostics: EngineeringReviewDiagnostic[];
  incidents: EngineeringReviewIncident[];
  repairCandidates: EngineeringReviewRepairCandidate[];
  evidenceRecovery: EvidenceRecoveryPlan;
  decisionBasis: EngineeringReviewSource["decisionBasis"];
  validationTrace?: ValidationTraceReport;
  invalidation: EngineeringReviewInvalidationProjection;
  priority: EngineeringReviewPriorityProjection;
}

const runtimeDispositions: readonly IntentDiagnosticDisposition[] = [
  "confirmed-defect",
  "design-review",
  "designed-behavior",
  "engine-constraint",
  "compatibility-difference",
  "insufficient-evidence",
  "ambiguous-intent",
  "runtime-proof-required",
];

function countRuntimeClassifications(
  assessments: readonly GameplayIntentRuntimeAssessment[],
): Record<IntentDiagnosticDisposition, number> {
  const counts = Object.fromEntries(
    runtimeDispositions.map((disposition) => [disposition, 0]),
  ) as Record<IntentDiagnosticDisposition, number>;

  for (const assessment of assessments) {
    counts[assessment.result.disposition] += 1;
  }

  return counts;
}

function attentionFrom(
  source: EngineeringReviewSource,
  runtimeClassifications: Record<IntentDiagnosticDisposition, number>,
): EngineeringReviewAttention[] {
  const attention: EngineeringReviewAttention[] = [];
  const push = (
    kind: EngineeringReviewAttention["kind"],
    count: number,
    reason: string,
  ) => {
    if (count > 0) attention.push({ kind, count, reason });
  };

  push(
    "critical-diagnostic",
    source.diagnostics.filter((item) => item.severity === "critical").length,
    "Critical diagnostics are present in the current inspection result.",
  );
  push(
    "confirmed-defect",
    runtimeClassifications["confirmed-defect"],
    "Runtime/intent evidence currently classifies these observations as confirmed defects.",
  );
  push(
    "design-review",
    runtimeClassifications["design-review"],
    "Design-review candidates require additional authored intent or observation evidence before defect classification.",
  );
  push(
    "ambiguous-intent",
    runtimeClassifications["ambiguous-intent"],
    "Intent ambiguity prevents a stronger defect classification.",
  );
  push(
    "insufficient-evidence",
    runtimeClassifications["insufficient-evidence"],
    "Current evidence is insufficient to classify these observations.",
  );
  push(
    "runtime-proof-required",
    runtimeClassifications["runtime-proof-required"],
    "These observations require stronger runtime proof before classification can advance.",
  );
  push(
    "evidence-recovery",
    source.evidenceRecovery.actions.length,
    "Runtime evidence integrity requires one or more recovery actions.",
  );
  push(
    "proposed-repair",
    source.repairCandidates.filter((item) => item.status === "proposal").length,
    "Repair candidates are proposals, not authorized, applied, or verified repairs.",
  );

  return attention;
}

export function buildEngineeringReviewProjection(
  source: EngineeringReviewSource,
  validationTrace?: ValidationTraceReport,
  decisionLedger?: DecisionLedgerSnapshot,
): EngineeringReviewProjection {
  const runtimeClassifications = countRuntimeClassifications(
    source.gameplayIntentRuntime.assessments,
  );

  const invalidation = buildEngineeringReviewInvalidationProjection(
    source.decisionBasis,
    decisionLedger,
    validationTrace,
  );

  return {
    schemaVersion: 1,
    artifact: {
      id: source.artifactId,
      fingerprint: source.fingerprint,
      archiveEntries: source.archiveEntries,
      target: source.targetCompatibility,
    },
    understanding: {
      nodes: source.gameplayIntent.nodes,
      authoredNodes: source.gameplayIntent.authoredNodes,
      inferredNodes: source.gameplayIntent.inferredNodes,
      hypothesisNodes: source.gameplayIntent.hypothesisNodes,
      invariants: source.gameplayIntent.invariants,
      unknowns: source.gameplayIntent.model.unknowns.map((unknown) => ({
        id: unknown.id,
        question: unknown.question,
        blockedSubjectIds: unknown.blockedSubjectIds,
        evidenceIds: unknown.evidenceIds ?? [],
      })),
    },
    runtimeClassifications,
    runtimeAssessments: source.gameplayIntentRuntime.assessments.map(
      (assessment) => ({
        id:
          "runtime:" +
          assessment.outcomeObservation.outcomeId +
          ":" +
          assessment.outcomeObservation.evidenceId,
        outcomeId: assessment.outcomeObservation.outcomeId,
        disposition: assessment.result.disposition,
        subjectIds: [...assessment.result.subjectIds],
        basisInvariantIds: [...assessment.result.basisInvariantIds],
        evidenceIds: [...assessment.result.evidenceIds],
        nextEvidenceNeed: assessment.result.nextEvidenceNeed,
        reasons: [...assessment.result.reasons],
      }),
    ),
    attention: attentionFrom(source, runtimeClassifications),
    diagnosticDefinitions: diagnosticDefinitions(
      source.diagnostics.map((finding) => finding.code),
    ),
    diagnostics: source.diagnostics.map((finding) => ({
      id: finding.id,
      code: finding.code,
      severity: finding.severity,
      message: finding.message,
      ...(finding.source === undefined ? {} : { source: finding.source }),
      relatedNodeIds: finding.relatedNodeIds ?? [],
    })),
    incidents: source.causalAnalysis.incidents.map((incident) => ({
      id: incident.id,
      scopeKey: incident.scopeKey,
      severity: incident.severity,
      confidence: incident.confidence,
      chainIds: incident.chainIds,
      relatedDiagnosticIds: incident.relatedDiagnosticIds,
      rootCauseCandidates: incident.rootCauseCandidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.label,
        evidenceLevel: candidate.evidenceLevel,
        severity: candidate.severity,
        confidence: candidate.confidence,
      })),
    })),
    repairCandidates: source.repairCandidates.map((candidate) => ({
      kind: candidate.kind,
      diagnosticCode: candidate.diagnosticCode,
      sourcePath: candidate.sourcePath,
      ...(candidate.line === undefined ? {} : { line: candidate.line }),
      status: candidate.status,
      ...(candidate.reason === undefined ? {} : { reason: candidate.reason }),
    })),
    evidenceRecovery: source.evidenceRecovery,
    decisionBasis: source.decisionBasis,
    ...(validationTrace === undefined
      ? {}
      : { validationTrace }),
    invalidation,
    priority: buildEngineeringReviewPriority({
      runtimeClassifications,
      diagnostics: source.diagnostics,
      evidenceRecovery: source.evidenceRecovery,
      invalidation,
      repairCandidates: source.repairCandidates,
    }),
  };
}
