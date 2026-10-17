import type {
  IntentDiagnosticDisposition,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayDefectResolutionDisposition,
} from "../inspection/gameplay-defect-resolution.js";
import type { AuditIssueProjection } from "../map-audit-issue-projection.js";

export function diagnosticDispositionForDefectResolution(
  disposition: GameplayDefectResolutionDisposition,
  issueType: AuditIssueProjection["issueType"] = "BUG",
): IntentDiagnosticDisposition {
  switch (disposition) {
    case "CONFIRMED_DEFECT_READY":
      // Audit proof status and issue type are separate authorities.
      // DESIGN_MISMATCH must not be presented as a confirmed implementation bug.
      return issueType === "DESIGN_MISMATCH"
        ? "design-review"
        : "confirmed-defect";
    case "BLOCKING_COUNTERPROOF":
      return "designed-behavior";
    case "RUNTIME_PROOF_REQUIRED":
      return "runtime-proof-required";
    case "DETECTION_GAP":
      return "insufficient-evidence";
    case "GAMEPLAY_TRANSLATION_REQUIRED":
      return "ambiguous-intent";
    case "COUNTERPROOF_SEARCH_REQUIRED":
      return "insufficient-evidence";
  }
}
