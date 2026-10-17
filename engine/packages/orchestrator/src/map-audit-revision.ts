import { createHash } from "node:crypto";
import type {
  SelectedMapAuditAdmission,
} from "./map-audit-admission.js";
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
  SelectedMapAuditIdentity,
} from "./map-audit-identity.js";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

export function deriveSelectedMapAuditRevision(input: {
  readonly identity: SelectedMapAuditIdentity;
  readonly admission: SelectedMapAuditAdmission;
  readonly procedure: MandatoryAuditProcedureReceipt;
  readonly graph: GameplayScenarioGraph;
  readonly defectResolution: GameplayDefectResolutionGate;
}): string {
  const basis = {
    schemaVersion: 1,
    identity: input.identity,
    admission: {
      status: input.admission.status,
      firstBlockingStage:
        input.admission.firstBlockingStage ?? null,
      issues: input.admission.issues,
    },
    procedure: {
      status: input.procedure.status,
      blockingCheckpointIds:
        input.procedure.blockingCheckpointIds,
      checkpoints: input.procedure.checkpoints.map((item) => ({
        id: item.id,
        status: item.status,
        reasonCode: item.reasonCode,
        blocksPublication: item.blocksPublication,
        obligations: item.obligations.map((obligation) => ({
          id: obligation.id,
          required: obligation.required,
          satisfied: obligation.satisfied,
          evidenceIds: obligation.evidenceIds,
        })),
      })),
    },
    // Model responses are authorized against this revision. Bind the entire
    // canonical causal/proof core, not a lossy pick of its fields: scenario
    // ownership, link-to-scenario scope, impact-path evidence, required
    // knowledge and receipt provenance can all change without an ID change.
    // Exclude only derived navigation/rendering fields; they cannot create
    // source authority or independently authorize a proof resolution.
    scenario: {
      scenarios: input.graph.scenarios,
      components: input.graph.components,
      causalLinks: input.graph.causalLinks,
      knowledgeRequirements: input.graph.knowledgeRequirements,
      knowledgeReceipts: input.graph.knowledgeReceipts,
    },
    defectResolution: input.defectResolution.resolutions,
  };

  return createHash("sha256")
    .update(JSON.stringify(canonical(basis)))
    .digest("hex");
}
