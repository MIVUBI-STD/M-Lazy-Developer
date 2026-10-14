import {
  authorizeRepair,
  type RepairAuthorizationReceipt,
} from "../src/authorization.js";

/** Test-only authorization from the canonical policy for an isolated fixture. */
export function fixtureRepairAuthorization(
  sourceFingerprint: string,
): RepairAuthorizationReceipt {
  const result = authorizeRepair({
    confirmedDefect: true,
    diagnosisEvidenceIds: ["test:verified-defect"],
    invariantIds: ["test:working-copy-only"],
    sourceFingerprint,
    sourceFingerprintMatches: true,
    evidenceFreshness: "fresh",
  });
  if (!result.authorized || result.receipt === undefined) {
    throw new Error("Test fixture authorization unexpectedly rejected");
  }
  return result.receipt;
}
