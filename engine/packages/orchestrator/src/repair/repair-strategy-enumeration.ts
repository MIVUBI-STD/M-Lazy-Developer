import type {
  DiagnosticFinding,
} from "../../../diagnostics/src/index.js";
import type {
  SourceRef,
} from "../../../project-model/src/index.js";
import type {
  PatchTransaction,
} from "../../../repair/src/index.js";
import type {
  RepairOpportunityEnvelope,
} from "./repair-opportunity-envelope.js";
import type {
  RepairStrategyClass,
} from "./repair-strategy-selection.js";
import type {
  RepairRealizerSourceKind,
} from "./repair-realizer-registry.js";
import {
  validateRepairStrategySourceRegistry,
  type RepairStrategySourceRegistry,
} from "./repair-strategy-source-registry.js";
import {
  repairStrategyProvider,
  validateRepairStrategyProviderRegistry,
  type RepairStrategyProviderDefinition,
  type RepairStrategyProviderProposal,
  type RepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";

export interface EnumeratedRepairStrategySource {
  sourceKind: RepairRealizerSourceKind;
  sourceId: string;
  sourceVersion: string;
  selectionMode:
    RepairStrategyProviderDefinition["selectionMode"];
  deterministic: boolean;
  applicableDiagnosticIds: readonly string[];
  applicableDiagnosticCodes: readonly string[];
  automaticRealizationEligible: boolean;
  reasons: readonly string[];
}

export interface RepairStrategyEnumeration {
  envelope: RepairOpportunityEnvelope;
  applicableSources: readonly EnumeratedRepairStrategySource[];
  inapplicableSources: readonly EnumeratedRepairStrategySource[];
  coverageMissing: boolean;
  reasons: readonly string[];
}

function sameSourceLocation(
  left: SourceRef,
  right: SourceRef,
): boolean {
  return (
    left.artifactId === right.artifactId &&
    left.relativePath === right.relativePath &&
    left.range?.lineStart === right.range?.lineStart &&
    left.range?.lineEnd === right.range?.lineEnd &&
    left.range?.columnStart === right.range?.columnStart &&
    left.range?.columnEnd === right.range?.columnEnd &&
    left.jsonPointer === right.jsonPointer
  );
}

export function enumerateRepairStrategySources(
  envelope: RepairOpportunityEnvelope,
  diagnostics: readonly DiagnosticFinding[],
  registry: RepairStrategyProviderRegistry,
  sourceRegistry?: RepairStrategySourceRegistry,
): RepairStrategyEnumeration {
  const registryErrors =
    validateRepairStrategyProviderRegistry(registry);
  if (registryErrors.length > 0) {
    throw new Error(
      "Invalid repair strategy provider registry: " +
        registryErrors.join("; "),
    );
  }

  const diagnosticsById = new Map(
    diagnostics.map((finding) => [
      finding.id,
      finding,
    ]),
  );

  const enumerated = registry.providers
    .map((provider): EnumeratedRepairStrategySource => {
      const applicableDiagnosticIds =
        envelope.diagnosticIds.filter((id) => {
          const finding = diagnosticsById.get(id);
          return (
            finding !== undefined &&
            provider.supportedDiagnosticCodes.includes(
              finding.code,
            )
          );
        });
      const applicableDiagnosticCodes = [
        ...new Set(
          applicableDiagnosticIds
            .map((id) => diagnosticsById.get(id)?.code)
            .filter(
              (value): value is DiagnosticFinding["code"] =>
                value !== undefined,
            ),
        ),
      ].sort();

      const reasons: string[] = [];
      if (applicableDiagnosticIds.length === 0) {
        reasons.push(
          "Provider does not support any diagnostic code attributable to the selected causal candidate.",
        );
      }
      if (
        provider.requiresExactSourceEvidence &&
        envelope.exactSourceRefs.length === 0
      ) {
        reasons.push(
          "Provider requires exact source evidence but the repair opportunity has no exact source location.",
        );
      }
      if (!envelope.automaticRealizationAllowed) {
        reasons.push(
          "Repair opportunity is not eligible for automatic realization.",
        );
      }
      if (
        provider.selectionMode === "causal-auto" &&
        !provider.deterministic
      ) {
        reasons.push(
          "Causal-auto provider is not deterministic.",
        );
      }

      return {
        sourceKind: "provider",
        sourceId: provider.id,
        sourceVersion: provider.version,
        selectionMode: provider.selectionMode,
        deterministic: provider.deterministic,
        applicableDiagnosticIds,
        applicableDiagnosticCodes,
        automaticRealizationEligible:
          applicableDiagnosticIds.length > 0 &&
          (
            !provider.requiresExactSourceEvidence ||
            envelope.exactSourceRefs.length > 0
          ) &&
          envelope.automaticRealizationAllowed &&
          provider.selectionMode === "causal-auto" &&
          provider.deterministic,
        reasons,
      };
    })
    .sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId) ||
      a.sourceVersion.localeCompare(b.sourceVersion)
    );

  const nativeRegistryErrors =
    sourceRegistry === undefined
      ? []
      : validateRepairStrategySourceRegistry(
          sourceRegistry,
        );
  if (nativeRegistryErrors.length > 0) {
    throw new Error(
      "Invalid repair strategy source registry: " +
        nativeRegistryErrors.join("; "),
    );
  }

  const nativeEnumerated =
    (sourceRegistry?.sources ?? []).map(
      (source): EnumeratedRepairStrategySource => {
        const diagnosticMatch =
          (source.supportedDiagnosticCodes?.length ?? 0) === 0 ||
          source.supportedDiagnosticCodes!.some(
            (code) =>
              envelope.diagnosticCodes.includes(code),
          );
        const predicateMatch =
          (source.supportedPredicateIds?.length ?? 0) === 0 ||
          source.supportedPredicateIds!.some(
            (id) =>
              envelope.causalBinding.predicateIds?.includes(
                id,
              ) === true,
          );
        const factorMatch =
          (source.supportedFactorIds?.length ?? 0) === 0 ||
          source.supportedFactorIds!.some(
            (id) =>
              envelope.causalBinding.factorIds?.includes(
                id,
              ) === true,
          );
        const exactSourceSatisfied =
          !source.requiresExactSourceEvidence ||
          envelope.exactSourceRefs.length > 0;
        const applicable =
          diagnosticMatch &&
          predicateMatch &&
          factorMatch;

        const reasons: string[] = [];
        if (!diagnosticMatch) {
          reasons.push(
            "Source diagnostic applicability does not match the selected causal opportunity.",
          );
        }
        if (!predicateMatch) {
          reasons.push(
            "Source predicate applicability does not match the selected causal opportunity.",
          );
        }
        if (!factorMatch) {
          reasons.push(
            "Source factor applicability does not match the selected causal opportunity.",
          );
        }
        if (!exactSourceSatisfied) {
          reasons.push(
            "Source requires exact source evidence but the opportunity has none.",
          );
        }

        return {
          sourceKind: source.kind,
          sourceId: source.id,
          sourceVersion: source.version,
          selectionMode: source.selectionMode,
          deterministic: source.deterministic,
          applicableDiagnosticIds:
            applicable
              ? envelope.diagnosticIds
              : [],
          applicableDiagnosticCodes:
            applicable
              ? envelope.diagnosticCodes
              : [],
          automaticRealizationEligible:
            applicable &&
            exactSourceSatisfied &&
            envelope.automaticRealizationAllowed &&
            source.selectionMode === "causal-auto" &&
            source.deterministic,
          reasons,
        };
      },
    );

  const allEnumerated = [
    ...enumerated,
    ...nativeEnumerated,
  ].sort((a, b) =>
    a.sourceKind.localeCompare(b.sourceKind) ||
    a.sourceId.localeCompare(b.sourceId) ||
    a.sourceVersion.localeCompare(b.sourceVersion)
  );

  const applicableSources = allEnumerated.filter(
    (item) =>
      item.applicableDiagnosticIds.length > 0 &&
      (
        item.selectionMode === "proposal-only" ||
        item.automaticRealizationEligible
      ),
  );
  const inapplicableSources = allEnumerated.filter(
    (item) => !applicableSources.includes(item),
  );

  return {
    envelope,
    applicableSources,
    inapplicableSources,
    coverageMissing: applicableSources.length === 0,
    reasons:
      applicableSources.length > 0
        ? [
            "Applicable repair strategy sources were enumerated without granting them selection authority.",
          ]
        : [
            "No registered repair strategy source covers the selected causal opportunity.",
          ],
  };
}

export interface ProviderRepairRealizationInput {
  sourceId: string;
  sourceVersion: string;
  transaction: PatchTransaction;
  changedNodeIds: readonly string[];
  repairClass: RepairStrategyClass;
  reversible: boolean;
  idempotent: boolean;
}

export type ProviderRepairRealization =
  | {
      status: "realized";
      proposal: RepairStrategyProviderProposal;
      reasons: readonly string[];
    }
  | {
      status: "blocked";
      sourceKind: "provider";
      sourceId: string;
      sourceVersion: string;
      reasons: readonly string[];
    };

export function realizeProviderRepairStrategy(
  enumeration: RepairStrategyEnumeration,
  registry: RepairStrategyProviderRegistry,
  input: ProviderRepairRealizationInput,
): ProviderRepairRealization {
  const source = enumeration.applicableSources.find(
    (item) =>
      item.sourceKind === "provider" &&
      item.sourceId === input.sourceId &&
      item.sourceVersion === input.sourceVersion,
  );
  if (!source) {
    return {
      status: "blocked",
      sourceKind: "provider",
      sourceId: input.sourceId,
      sourceVersion: input.sourceVersion,
      reasons: [
        "Repair strategy source was not enumerated as applicable to this opportunity.",
      ],
    };
  }

  const provider = repairStrategyProvider(
    registry,
    input.sourceId,
  );
  if (!provider) {
    return {
      status: "blocked",
      sourceKind: "provider",
      sourceId: input.sourceId,
      sourceVersion: input.sourceVersion,
      reasons: [
        "Enumerated repair provider is no longer present in the active registry.",
      ],
    };
  }

  const envelope = enumeration.envelope;
  const reasons: string[] = [];

  if (
    input.sourceVersion !== provider.version
  ) {
    reasons.push(
      "Repair provider version changed after enumeration.",
    );
  }
  if (
    input.transaction.sourceFingerprint !==
      envelope.sourceFingerprint
  ) {
    reasons.push(
      "Realized patch transaction source fingerprint does not match the repair opportunity source fingerprint.",
    );
  }
  if (
    input.transaction.operations.length === 0
  ) {
    reasons.push(
      "Realized repair candidate contains no patch operations.",
    );
  }
  if (
    input.transaction.operations.some(
      (operation) =>
        !provider.mutationKinds.includes(operation.kind),
    )
  ) {
    reasons.push(
      "Realized repair candidate uses a mutation kind outside the provider declaration.",
    );
  }

  const evidenceRefs =
    provider.requiresExactSourceEvidence
      ? envelope.exactSourceRefs
      : envelope.sourceRefs;
  for (const operation of input.transaction.operations) {
    if (
      !evidenceRefs.some((sourceRef) =>
        sameSourceLocation(
          sourceRef,
          operation.source,
        )
      )
    ) {
      reasons.push(
        "Patch operation source is not bound to repair opportunity source evidence: " +
          operation.source.relativePath +
          ".",
      );
    }
  }

  if (reasons.length > 0) {
    return {
      status: "blocked",
      sourceKind: "provider",
      sourceId: input.sourceId,
      sourceVersion: input.sourceVersion,
      reasons: [...new Set(reasons)].sort(),
    };
  }

  return {
    status: "realized",
    proposal: {
      providerId: provider.id,
      providerVersion: provider.version,
      relatedDiagnosticIds:
        source.applicableDiagnosticIds,
      strategy: {
        strategyId:
          provider.id +
          ":" +
          input.transaction.id,
        transaction: input.transaction,
        changedNodeIds:
          [...new Set(input.changedNodeIds)].sort(),
        supportingInvariantIds:
          envelope.invariantIds,
        addressesCandidateIds: [
          envelope.candidateId,
        ],
        repairClass: input.repairClass,
        causalBinding: envelope.causalBinding,
        validationObligations: {
          invariantIds: envelope.invariantIds,
          runtimeExperimentIds:
            envelope.causalBinding.interventionIds ?? [],
          validationKinds: [
            ...new Set(
              input.transaction.validation.map(
                (step) => step.kind,
              ),
            ),
          ].sort(),
        },
        reversible: input.reversible,
        idempotent: input.idempotent,
      },
    },
    reasons: [
      "Repair candidate was deterministically realized from an enumerated source and bound to the current causal/source opportunity.",
    ],
  };
}
