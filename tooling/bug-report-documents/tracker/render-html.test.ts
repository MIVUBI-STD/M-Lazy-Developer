import { describe, expect, it } from "vitest";
import { Script, runInNewContext } from "node:vm";
import type { BugTrackerDocument } from "./model.js";
import { renderBugTrackerHtml } from "./render-html.js";
import { validateBugTrackerDocument } from "./validate.js";

const fixture: BugTrackerDocument = {
  schema: "m-bedrock-bug-tracker/v1",
  title: "Bug Tracker Report",
  games: [{
    name: "Golden Fixture",
    levels: [{
      level: 1,
      version: "1.0.0",
      source: {
        projectId: "golden-fixture",
        artifactId: "drive:file",
        artifactFingerprint: "sha256:fixture",
        version: "1.0.0",
        driveFolder: "https://drive.google.com/drive/folders/folder",
        worldFile: "https://drive.google.com/file/d/file/view",
        worldFilename: "Golden Fixture v1.0.0.mcworld",
      },
      devNotes: [{
        id: "DEV-GOLDEN-001",
        type: "DEV_NOTE",
        title: "Fixture developer note",
        problem: "The fixture preserves the Developer Notes lane.",
        action: "Keep the Developer Notes lane after gameplay findings.",
        evidence: { source: "fixture" },
        severity: null,
      }],
      issues: [{
        id: "BUG-GOLDEN-001",
        type: "BUG",
        severity: "MAJOR",
        verification: "NEEDS_VERIFY",
        title: "Fixture issue",
        issue: "The fixture demonstrates the locked issue-card hierarchy.",
        whyThisIsBug: "The fixture intentionally violates its expected visible-result contract.",
        impact: "A reader can see how the defect changes the fixture result.",
        reproduction: ["Enter the fixture.", "Observe the wrong visible result."],
        observed: "The wrong result remains visible.",
        expected: "The expected result should be visible.",
        resolution: "Restore the expected fixture result.",
      }],
    }],
  }],
};

describe("Golden Bug Tracker renderer", () => {
  it("renders the locked hierarchy and mandatory source controls", () => {
    validateBugTrackerDocument(fixture);
    const html = renderBugTrackerHtml(fixture);
    expect(html).toContain("Bug Tracker Report");
    expect(html).toContain("MAP REPORT");
    expect(html).not.toContain(">Maps<");
    expect(html).not.toContain("Expand Map ↓");
    expect(html).toContain("Needs Validation");
    expect(html).toContain("DEVELOPER NOTES");
    expect(html).toContain("LEVEL 1");
    expect(html).toContain("Drive Folder ↗");
    expect(html).toContain("World File ↗");
    expect(html).toContain("Test / Details ↓");
    expect(html).toContain("Collapse ↑");
    expect(html).toContain("NEEDS VALIDATION");
    expect(html).toContain("WHY THIS IS A BUG");
    expect(html).toContain("IMPACT");
    expect(html).toContain("The fixture intentionally violates its expected visible-result contract.");
    expect(html).toContain("A reader can see how the defect changes the fixture result.");
    expect(html).toContain("TEST IN-GAME");
    expect(html).toContain("EXPECTED");
    expect(html).toContain("Technical Details ↓");
    expect(html).toContain("Technical Analysis");
    expect(html).not.toContain("Why It Happens / Technical Analysis");
    expect(html).toContain("Observed / Evidence");
    expect(html).toContain("Finding evidence still needs validation");
    expect(html).toContain("<dt>Source</dt>");
    expect(html).toContain("<dd>fixture</dd>");
    expect(html).toContain("Action Required");
    expect(html).toContain("Recommended Fix");
    expect(html).toContain("TEST RESULT");
    expect(html).toContain("Needs Validation: 1 · Retest Ready: 0 · No Guided Procedure: 0");
    expect(html).toContain("VALIDATE EVIDENCE FIRST");
    expect(html).toContain('data-test-ready="false"');
    expect(html).toContain("Passed means Expected behavior is restored");
    expect(html).toContain('data-result="SUCCESS" disabled aria-disabled="true"');
    expect(html).toContain("✓ PASSED");
    expect(html).toContain("✕ FAILED");
    expect(html).toContain("Tester Notes");
    expect(html).toContain("Save as HTML");
    expect(html).toContain("Save JSON");
    expect(html).not.toContain("Export");
    expect(html).toContain("Evidence <span>· Optional</span>");
    expect(html).toContain("Optional notes");
    expect(html.indexOf("TEST RESULT")).toBeLessThan(html.indexOf("Technical Details ↓"));
    expect(html).not.toContain("Mark fixed");
    expect(html).toContain('data-issue-id="BUG-GOLDEN-001"');
    expect(html).not.toContain("<details class=\"map\"");
    expect(html.indexOf("BUGS")).toBeLessThan(html.indexOf("DEVELOPER NOTES"));
  });

  it("emits JavaScript that browsers can parse for tester controls and Load JSON", () => {
    const html = renderBugTrackerHtml(fixture);
    const interactiveScript = html.split("<script>").at(-1)?.split("</script>")[0];
    expect(interactiveScript).toBeDefined();
    expect(() => new Script(interactiveScript!)).not.toThrow();
    expect(interactiveScript).toContain('const r=new FileReader()');
  });

  it("normalizes legacy tester attachment state and escapes portable HTML snapshots", () => {
    const html = renderBugTrackerHtml(fixture);
    const script = html.split("<script>").at(-1)?.split("</script>")[0];
    expect(script).toBeDefined();

    const stateExpression = script?.split(",state=")[1]?.split(";const toast=m=>")[0];
    expect(stateExpression).toBeDefined();
    const existing = { "BUG-GOLDEN-001": { notes: "legacy", result: null } };
    const getState = runInNewContext(
      "(" + stateExpression + ")",
      { WS: existing },
    ) as (id: string) => { attachments: unknown[] };
    expect(getState("BUG-GOLDEN-001").attachments).toEqual([]);

    const snapshotExpression = script?.split("snap.textContent=")[1]?.split(";dl(")[0];
    expect(snapshotExpression).toBeDefined();
    const notes = "</script><script>unsafe()</script>";
    const portable = runInNewContext(
      snapshotExpression!,
      { WS: { "BUG-GOLDEN-001": { notes } } },
    ) as string;
    expect(portable).not.toContain("</script>");
    expect(JSON.parse(portable)["BUG-GOLDEN-001"].notes).toBe(notes);
  });

  it("renders a combined briefing with column-major map navigation", () => {
    const second = {
      ...fixture.games[0]!,
      name: "Second Fixture",
      levels: fixture.games[0]!.levels.map((level) => ({
        ...level,
        source: { ...level.source, projectId: "second-fixture", artifactId: "drive:second" },
        issues: level.issues.map((issue) => ({ ...issue, id: "BUG-SECOND-001" })),
        devNotes: level.devNotes.map((note) => ({ ...note, id: "DEV-SECOND-001" })),
      })),
    };
    const combined: BugTrackerDocument = { ...fixture, games: [fixture.games[0]!, second] };
    const html = renderBugTrackerHtml(combined);
    expect(html).toContain(">Maps<");
    expect(html).toContain("Expand Map ↓");
    expect(html).toContain("grid-auto-flow:column");
    expect(html).toContain("data-map-link=\"1\"");
    expect(html).toContain("data-map-link=\"2\"");
  });

  it("uses the authored level ID, not display position, for sparse levels", () => {
    const level = fixture.games[0]!.levels[0]!;
    const sparse: BugTrackerDocument = {
      ...fixture,
      games: [{
        ...fixture.games[0]!,
        levels: [{ ...level, level: 3 }],
      }],
    };
    const html = renderBugTrackerHtml(sparse);
    expect(html).toContain("LEVEL 3");
    expect(html).not.toContain("LEVEL 1");
  });

  it("preserves unknown information as absent UI instead of inventing content", () => {
    const level = fixture.games[0]!.levels[0]!;
    const sparseIssue = {
      ...level.issues[0]!,
      reproduction: [],
      observed: "",
      expected: "",
    };
    delete sparseIssue.resolution;
    const sparse: BugTrackerDocument = {
      ...fixture,
      games: [{
        ...fixture.games[0]!,
        levels: [{
          ...level,
          issues: [sparseIssue],
        }],
      }],
    };
    const html = renderBugTrackerHtml(sparse);
    expect(html).not.toContain("TEST IN-GAME");
    expect(html).not.toContain("EXPECTED");
    expect(html).not.toContain("Recommended Fix");
    expect(html).toContain('data-test-ready="false"');
    expect(html).toContain("VALIDATE EVIDENCE FIRST");
    expect(html).toContain("Guided retest unavailable");
    expect(html).toContain('data-result="SUCCESS" disabled aria-disabled="true"');
    expect(html).toContain('data-result="FAILED" disabled aria-disabled="true"');
  });

  it("separates mismatch rationale, unavailable retest, and browser-save failure", () => {
    const level = fixture.games[0]!.levels[0]!;
    const mismatch = {
      ...level.issues[0]!,
      id: "DM-GOLDEN-NO-TEST",
      type: "DESIGN_MISMATCH" as const,
      verification: "VERIFIED" as const,
      reproduction: [],
      expected: "",
    };
    const modified: BugTrackerDocument = {
      ...fixture,
      games: [{ ...fixture.games[0]!, levels: [{ ...level, issues: [mismatch] }] }],
    };
    const html = renderBugTrackerHtml(modified);
    expect(html).toContain("WHY THIS IS A MISMATCH");
    expect(html).toContain("RETEST PROCEDURE NOT READY");
    expect(html).toContain('data-test-ready="false"');
    expect(html).toContain('data-result="SUCCESS" disabled aria-disabled="true"');
    expect(html).toContain("This tester result never marks a canonical bug Fixed");
    expect(html).toContain("Not yet saved locally");
    const script = html.split("<script>").at(-1)?.split("</script>")[0];
    expect(script).toBeDefined();
    expect(script).toContain("try{localStorage.setItem(KEY,JSON.stringify(WS))");
    expect(script).toContain("markSaveFailed()");
    expect(script).toContain("Invalid or different-map Bug Tracker JSON");
    expect(script).toContain("Screenshot held in memory");
  });

  it("uses shared copy-quality rules for legacy HTML guided retest readiness", () => {
    const level = fixture.games[0]!.levels[0]!;
    const correct = { ...level.issues[0]!, verification: "VERIFIED" as const };
    const rejected = [
      { ...correct, id: "BUG-GOLDEN-CODE",
        reproduction: ["Inspect the session function.", "Confirm the gate remains closed."] },
      { ...correct, id: "BUG-GOLDEN-VAGUE",
        reproduction: ["Join the arena with 2 players.", "Confirm the bug is visible."] },
      { ...correct, id: "BUG-GOLDEN-BLANK",
        reproduction: ["", "Confirm the gate remains closed."] },
    ];
    const changed: BugTrackerDocument = {
      ...fixture,
      games: [{ ...fixture.games[0]!, levels: [{ ...level, issues: [correct, ...rejected] }] }],
    };
    const html = renderBugTrackerHtml(changed);
    expect(html).toContain("Needs Validation: 0 · Retest Ready: 1 · No Guided Procedure: 3");
    for (const item of rejected) {
      const start = html.indexOf('data-issue-id="' + item.id + '"');
      const finish = html.indexOf("</article>", start);
      expect(start, item.id).toBeGreaterThanOrEqual(0);
      const card = html.slice(start, finish);
      expect(card).toContain('data-test-ready="false"');
      expect(card).toContain("RETEST PROCEDURE NOT READY");
      expect(card).toContain("Guided retest unavailable");
      expect(card).toContain('data-result="SUCCESS" disabled aria-disabled="true"');
      expect(card).toContain('data-result="FAILED" disabled aria-disabled="true"');
    }
    const goodStart = html.indexOf('data-issue-id="' + correct.id + '"');
    const goodEnd = html.indexOf("</article>", goodStart);
    expect(html.slice(goodStart, goodEnd)).toContain('data-test-ready="true"');
    expect(html).toContain("Test In-Game must describe player actions");
    expect(html).toContain("Test In-Game must describe a concrete action");
  });

  it("keeps validation, after-fix retest, and missing instructions separate", () => {
    const level = fixture.games[0]!.levels[0]!;
    const pending = level.issues[0]!;
    const verified = { ...pending, verification: "VERIFIED" as const, id: "BUG-VALID-01" };
    const noSteps = { ...verified, id: "BUG-VALID-02", reproduction: [] };
    const noObservation = { ...verified, id: "BUG-VALID-03", observed: "" };
    const report: BugTrackerDocument = {
      ...fixture,
      games: [{ ...fixture.games[0]!, levels: [
        { ...level, issues: [pending, verified, noSteps, noObservation] },
      ] }],
    };
    const html = renderBugTrackerHtml(report);
    expect(html).toContain("Needs Validation: 1 · Retest Ready: 1 · No Guided Procedure: 2");
    const card = (id: string) => {
      const i = html.indexOf('data-issue-id="' + id + '"');
      expect(i).toBeGreaterThanOrEqual(0);
      return html.slice(i, html.indexOf("</article>", i));
    };
    expect(card(pending.id)).toContain("VALIDATE EVIDENCE FIRST");
    expect(card(pending.id)).toContain('data-result="SUCCESS" disabled');
    expect(card(pending.id)).toContain("Record observations in Tester Notes");
    expect(card(verified.id)).toContain('data-test-ready="true"');
    expect(card(verified.id)).not.toContain('data-result="SUCCESS" disabled');
    expect(card(noSteps.id)).toContain("RETEST PROCEDURE NOT READY");
    expect(card(noSteps.id)).toContain("Test In-Game requires a concrete tester-visible route");
    expect(card(noObservation.id)).toContain("Observed failure evidence has not been provided.");
    expect(html).not.toContain("SOURCE-ONLY");
    expect(html).toContain('data-issue-id="DEV-GOLDEN-001"');
  });

  it("renders precise developer evidence without implying a proven fix", () => {
    const level = fixture.games[0]!.levels[0]!;
    const issue = {
      ...level.issues[0]!,
      id: "BUG-DEV-CONTEXT",
      verification: "VERIFIED" as const,
      technicalAnalysis: "Source suggests a possible cause; runtime settlement is unobserved.",
      relevantCode: [{ file: "BP/<entities>/mob.json", reason: "Inspect terminal behavior." }],
      mustPreserve: ["Arena identity"],
    };
    const note = { ...level.devNotes[0]!,
      evidence: {
        artifactVersion: "1.0.0",
        source: "BP/scripts/<loader>.js",
        finding: "Only the selected source contains this hook.",
        nestedState: { enabled: false, count: 2 },
      },
    };
    const report: BugTrackerDocument = { ...fixture,
      games: [{ ...fixture.games[0]!, levels: [{ ...level, issues: [issue], devNotes: [note] }] }],
    };
    const html = renderBugTrackerHtml(report);
    const beginning = html.indexOf('data-issue-id="BUG-DEV-CONTEXT"');
    const card = html.slice(beginning, html.indexOf("</article>", beginning));
    expect(card).toContain("Technical Analysis");
    expect(card).toContain("Recommended Fix");
    expect(card).toContain("Must Preserve");
    expect(card).toContain("Technical Analysis explains the recorded evidence");
    expect(card).not.toContain("Why It Happens / Technical Analysis");
    expect(card).toContain('<ul class="source-list">');
    expect(card).toContain("&lt;entities&gt;");
    expect(card).not.toContain("<entities>");
    const devStart = html.indexOf('data-issue-id="DEV-GOLDEN-001"');
    const dev = html.slice(devStart, html.indexOf("</article>", devStart));
    expect(dev).toContain("<dt>Artifact Version</dt>");
    expect(dev).toContain("<dt>Source</dt>");
    expect(dev).toContain("<dt>Finding</dt>");
    expect(dev).toContain("<dt>Nested State</dt>");
    expect(dev).toContain("&lt;loader&gt;");
    expect(dev).toContain("Action Required");
    expect(dev).not.toContain('data-result="SUCCESS"');
  });

  it("isolates tester workspace per exact map artifact and version", () => {
    const html = renderBugTrackerHtml(fixture);
    expect(html).toContain("SCOPE=scopeOf(REPORT)");
    expect(html).toContain('KEY="m-bedrock-bug-tracker-workspace-v1:"+SCOPE');
    expect(html).toContain("scopeOf(x.canonical)!==SCOPE");
    expect(html).toContain("level.source.artifactFingerprint");
    expect(html).toContain("level.source.version");
  });

  it("rejects duplicate issue IDs before rendering", () => {
    const duplicate: BugTrackerDocument = {
      ...fixture,
      games: [...fixture.games, fixture.games[0]!],
    };
    expect(() => validateBugTrackerDocument(duplicate)).toThrow(/Duplicate issue ID/);
  });

  it("rejects missing Drive bindings", () => {
    const level = fixture.games[0]!.levels[0]!;
    const broken: BugTrackerDocument = {
      ...fixture,
      games: [{
        ...fixture.games[0]!,
        levels: [{
          ...level,
          source: { ...level.source, driveFolder: "" },
        }],
      }],
    };
    expect(() => validateBugTrackerDocument(broken)).toThrow(/Drive Folder is required/);
  });
});
