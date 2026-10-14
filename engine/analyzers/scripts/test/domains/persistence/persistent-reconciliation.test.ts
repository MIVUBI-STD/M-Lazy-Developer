import { describe, expect, it } from "vitest";
import { derivePersistentReconciliationEvidence } from "../../../src/domains/persistence/persistent-reconciliation.js";

const source = { artifactId: "fixture", relativePath: "scripts/main.ts" };

describe("persistent reconciliation", () => {
  it("separates root reads from worldLoad-gated recovery", () => {
    const result = derivePersistentReconciliationEvidence(`
const stale = world.getDynamicProperty("arena:state");
world.afterEvents.worldLoad.subscribe(() => reconcileWorld());
function reconcileWorld() {
  const journal = world.getDynamicProperty("arena:recoveryJournal");
  if (world.getDynamicProperty("arena:migration") === undefined) migrate();
}
`, source);

    expect(result.worldLoadSubscribed).toBe(true);
    expect(result.rootPersistentReads).toContain("arena:state");
    expect(result.reconciliationRegions).toContain("function:reconcileWorld");
    expect(result.journalKeys).toContain("arena:recoveryJournal");
    expect(result.absenceBranches.length).toBeGreaterThan(0);
    expect(result.status).toBe("reconciled");
  });

  it("does not infer reconciliation from persistence reads alone", () => {
    const result = derivePersistentReconciliationEvidence(
      'const state = world.getDynamicProperty("arena:state");',
      source,
    );
    expect(result.status).toBe("unresolved");
    expect(result.rootPersistentReads).toEqual(["arena:state"]);
  });
});
