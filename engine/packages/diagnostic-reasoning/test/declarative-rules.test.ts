import { describe, expect, it } from "vitest";
import { evaluateDeclarativeDiagnosticRule } from "../src/index.js";

describe("declarative diagnostic rules", () => {
  const rule = { id: "demo", code: "CROSS_SCOPE_STATE_RISK" as const, severity: "medium" as const, message: "demo", allOf: ["broad-write","arena-context"], falsePositiveGuards: ["explicit-global-authority"] };
  it("matches complete evidence", () => {
    const result = evaluateDeclarativeDiagnosticRule(rule, [
      { predicate: "broad-write", state: "present", evidenceId: "e1" },
      { predicate: "arena-context", state: "present", evidenceId: "e2" },
    ]);
    expect(result.disposition).toBe("matched");
  });
  it("keeps advisory false-positive guards from suppressing a diagnosis", () => {
    const result = evaluateDeclarativeDiagnosticRule(rule, [
      { predicate: "broad-write", state: "present" },
      { predicate: "arena-context", state: "present" },
      { predicate: "explicit-global-authority", state: "present" },
    ]);
    expect(result.disposition).toBe("matched");
    expect(result.guardPredicates).toEqual([]);
  });
});
