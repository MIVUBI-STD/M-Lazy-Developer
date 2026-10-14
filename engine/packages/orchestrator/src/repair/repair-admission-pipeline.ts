import type { SemanticGraph } from "../../../graph/src/index.js";
import type { DiagnosticRepairDecision } from "../../../project-model/src/index.js";
import {
  CONTRACT_REGISTRY_REVISION,
  runtimeVerificationExperimentContractsFromProvenance,
  runtimeVerificationExperimentEnvelopeRevision,
} from "../../../project-model/src/index.js";
import type { DecisionBasisRevision } from "../../../project-model/src/index.js";
import {
  patchTransactionSemanticFingerprint,
  type PatchTransaction,
} from "../../../repair/src/index.js";
import {
  validateRepairPreservationContract,
  type PreservationReadinessResult,
  type RepairPreservationContract,
} from "../../../preservation/src/index.js";
import {
  validateApprovedBugSet,
  type ApprovedBugSet,
} from "../../../bug-report/src/index.js";
import {
  analyzeRepairCounterfactual,
} from "./repair-counterfactual.js";
import {
  decideRepairBlastRadius,
} from "./repair-blast-radius.js";
import {
  decideRepairAdmission,
} from "./repair-admission.js";
import {
  createRepairProofBundle,
  type RepairProofBundle,
} from "./repair-proof-bundle.js";
import type {
  RepairBlastRadiusDecision,
  RepairBlastRadiusPolicy,
  RepairCounterfactualImpact,
} from "./repair-counterfactual-types.js";
import type {
  RepairAdmissionDecision,
} from "./repair-admission.js";
import { semanticGraphFingerprint } from "../workflow/semantic-graph-fingerprint.js";

export type RepairWorkflowAuthority =
  | {
      readonly kind: "approved-bug";
      readonly approved: ApprovedBugSet;
      readonly bugSemanticKey: string;
      readonly preservationContract: RepairPreservationContract;
    }
  | {
      readonly kind: "intentional-modification";
      readonly designChangeApproved: true;
      readonly preservationContract: RepairPreservationContract;
    };

function repairWorkflowAuthorityIssues(
  transaction: PatchTransaction,
  authority: RepairWorkflowAuthority | undefined,
  preservationReadiness: PreservationReadinessResult | undefined,
): readonly string[] {
  if (authority === undefined) {
    return [
      "Mutation-authorizing repair requires explicit workflow authority: Approved Bug for bug repair or approved design change for intentional modification.",
    ];
  }

  const errors = [
    ...validateRepairPreservationContract(
      authority.preservationContract,
    ),
  ];

  if (
    authority.preservationContract.transactionId !==
    transaction.id
  ) {
    errors.push(
      "Repair preservation contract belongs to another patch transaction.",
    );
  }

  if (
    authority.preservationContract.mustChangeInvariantIds.length === 0
  ) {
    errors.push(
      "Repair Contract requires at least one Must Change invariant.",
    );
  }

  if (
    authority.preservationContract.mustPreserveInvariantIds.length === 0
  ) {
    errors.push(
      "Repair Contract requires at least one Must Preserve invariant.",
    );
  }

  if (authority.kind === "approved-bug") {
    const approvalIssues =
      validateApprovedBugSet(authority.approved);
    if (approvalIssues.length > 0) {
      errors.push(
        "Approved Bug Set is internally inconsistent: " +
          approvalIssues.join(" "),
      );
    }

    if (!authority.bugSemanticKey.trim()) {
      errors.push(
        "Bug repair requires an approved bug semantic key.",
      );
    } else if (
      !authority.approved.approvedSemanticKeys.includes(
        authority.bugSemanticKey,
      )
    ) {
      errors.push(
        "Bug repair semantic key is not present in the Approved Bug Set.",
      );
    }
  }

  if (
    preservationReadiness !== undefined &&
    preservationReadiness.contractId !==
      authority.preservationContract.id
  ) {
    errors.push(
      "Preservation readiness does not match the Repair Contract.",
    );
  }

  return [...new Set(errors)];
}

export interface RepairAdmissionPipelineInput {
  graph: SemanticGraph;
  transaction: PatchTransaction;
  diagnostic: DiagnosticRepairDecision;
  changedNodeIds: readonly string[];
  supportingInvariantIds?: readonly string[];
  decisionBasis?: Omit<
    DecisionBasisRevision,
    "sourceFingerprint" | "graphFingerprint"
  >;
  blastRadiusPolicy?: RepairBlastRadiusPolicy;
  preservationReadiness?: PreservationReadinessResult;
  repairAuthority?: RepairWorkflowAuthority;
  postTransformProofBinding?: {
    transactionId: string;
    transactionFingerprint: string;
  };
}

export interface RepairAdmissionPipelineResult {
  impact: RepairCounterfactualImpact;
  blastRadius: RepairBlastRadiusDecision;
  admission: RepairAdmissionDecision;
  proof: RepairProofBundle;
}

export function evaluateRepairAdmissionPipeline(
  input: RepairAdmissionPipelineInput,
): RepairAdmissionPipelineResult {
  if (
    input.diagnostic.claimStrength === "proven-runtime" &&
    !input.decisionBasis?.runtimeEvidenceRevision?.trim()
  ) {
    throw new Error(
      "Runtime-proven repair admission requires a decision basis with runtimeEvidenceRevision from the analyzed evidence snapshot.",
    );
  }

  const impact = analyzeRepairCounterfactual(
    input.graph,
    {
      transaction: input.transaction,
      changedNodeIds: input.changedNodeIds,
    },
  );

  const blastRadius = decideRepairBlastRadius(
    impact,
    input.blastRadiusPolicy,
  );

  const rawAdmission = decideRepairAdmission(
    input.transaction,
    input.diagnostic,
    blastRadius,
  );

  const workflowAuthorityIssues =
    repairWorkflowAuthorityIssues(
      input.transaction,
      input.repairAuthority,
      input.preservationReadiness,
    );

  const transactionFingerprint =
    patchTransactionSemanticFingerprint(
      input.transaction,
    );
  const transformProofRequired =
    input.transaction.requiredProofs?.includes(
      "post-transform",
    ) === true;
  const transformProofBindingValid =
    !transformProofRequired ||
    (
      input.postTransformProofBinding?.transactionId ===
        input.transaction.id &&
      input.postTransformProofBinding
        .transactionFingerprint ===
        transactionFingerprint
    );

  const admission: RepairAdmissionDecision =
    (
      (
        rawAdmission.disposition === "eligible" ||
        rawAdmission.disposition === "guarded"
      ) &&
      workflowAuthorityIssues.length > 0
    )
      ? {
          transactionId: input.transaction.id,
          disposition: "blocked",
          reasons: [
            "Repair workflow authority is incomplete.",
            ...workflowAuthorityIssues,
          ],
        }
      : (
      (
        rawAdmission.disposition === "eligible" ||
        rawAdmission.disposition === "guarded"
      ) &&
      (
        input.preservationReadiness === undefined ||
        input.preservationReadiness.disposition !== "ready" ||
        input.preservationReadiness.baselineEvidenceIds.length === 0
      )
    )
      ? {
          transactionId: input.transaction.id,
          disposition: "blocked",
          reasons: [
            "Mutation-authorizing repair admission requires preservation readiness and explicit baseline evidence before mutation can be considered safe.",
            ...(input.preservationReadiness?.reasons ?? []),
          ],
        }
      : (
          (
            rawAdmission.disposition === "eligible" ||
            rawAdmission.disposition === "guarded"
          ) &&
          !transformProofBindingValid
        )
        ? {
            transactionId: input.transaction.id,
            disposition: "blocked",
            reasons: [
              "Mutation-authorizing repair admission requires post-transform proof bound to the exact patch transaction semantics.",
            ],
          }
        : rawAdmission;

  const runtimeExperimentContracts =
    runtimeVerificationExperimentContractsFromProvenance(
      input.diagnostic.causalProof?.interventionProvenance ?? [],
    );

  const decisionBasis: DecisionBasisRevision = {
    ...(input.decisionBasis ?? {}),
    contractRegistryRevision: CONTRACT_REGISTRY_REVISION,
    sourceFingerprint: input.transaction.sourceFingerprint,
    graphFingerprint: semanticGraphFingerprint(input.graph),
    ...(runtimeExperimentContracts.length === 0
      ? {}
      : {
          runtimeExperimentContractRevision:
            runtimeVerificationExperimentEnvelopeRevision(
              runtimeExperimentContracts,
            ),
        }),
  };

  const proof = createRepairProofBundle(
    input.transaction,
    input.diagnostic,
    impact,
    blastRadius,
    admission,
    decisionBasis,
    input.supportingInvariantIds ?? [],
    input.preservationReadiness,
    input.postTransformProofBinding,
    input.repairAuthority === undefined
      ? undefined
      : {
          kind: input.repairAuthority.kind,
          ...(input.repairAuthority.kind === "approved-bug"
            ? {
                approvedBugSemanticKey:
                  input.repairAuthority.bugSemanticKey,
              }
            : {}),
          mustChangeInvariantIds:
            input.repairAuthority.preservationContract
              .mustChangeInvariantIds,
          mustPreserveInvariantIds:
            input.repairAuthority.preservationContract
              .mustPreserveInvariantIds,
        },
  );

  return {
    impact,
    blastRadius,
    admission,
    proof,
  };
}
