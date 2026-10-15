import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BugTrackerDocument } from "./model.js";
import { exportBugTracker, verifyPublishedBugTracker } from "./export.js";
import { renderBugTrackerHtml } from "./render-html.js";

const fixture: BugTrackerDocument = {
  schema: "m-bedrock-bug-tracker/v1",
  title: "Bug Tracker Report",
  games: [{
    name: "Export Fixture",
    levels: [{
      level: null,
      version: "1.0.0",
      source: {
        projectId: "export-fixture",
        artifactId: "drive:fixture",
        artifactFingerprint: "sha256:fixture",
        version: "1.0.0",
        driveFolder: "https://drive.google.com/drive/folders/folder",
        worldFile: "https://drive.google.com/file/d/fixture/view",
        worldFilename: "Export Fixture v1.0.0.mcworld",
      },
      issues: [{
        id: "BUG-EXPORT-001",
        type: "BUG",
        severity: "MAJOR",
        verification: "VERIFIED",
        title: "Export issue",
        issue: "The export fixture has one gameplay issue.",
        reproduction: ["Trigger the export fixture."],
        observed: "The wrong result appears.",
        expected: "The expected result appears.",
      }],
      devNotes: [{
        id: "DEV-EXPORT-001",
        type: "DEV_NOTE",
        title: "Export developer note",
        problem: "A concrete release condition needs attention.",
        action: "Correct the existing release owner.",
        evidence: { source: "fixture" },
        severity: null,
      }],
    }],
  }],
};

describe("Bug Tracker export boundary", () => {
  it("writes JSON and HTML with exactly the same canonical IDs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await exportBugTracker(fixture, dir, renderBugTrackerHtml);
      const [json, html] = await Promise.all([
        readFile(join(dir, "bug-tracker.json"), "utf8"),
        readFile(join(dir, "bug-tracker.html"), "utf8"),
      ]);
      expect(json).toContain('"BUG-EXPORT-001"');
      expect(json).toContain('"DEV-EXPORT-001"');
      expect(html).toContain('data-issue-id="BUG-EXPORT-001"');
      expect(html).toContain('data-issue-id="DEV-EXPORT-001"');
      expect(html).toContain('id="saveHtml"');
      expect(html).toContain('id="saveJson"');
      expect(html).toContain('id="importJson"');
      expect(html).toContain('id="resetData"');
      expect(html).toContain('id="workspace-snapshot"');
      expect(html).toContain('class="files"');
      expect(html).toContain('class="pics"');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("checks the entire embedded canonical report instead of accepting matching IDs alone", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-parity-"));
    try {
      await expect(exportBugTracker(
        fixture, dir,
        (document) => renderBugTrackerHtml(document)
          .replace('"title":"Export issue"', '"title":"Outdated issue title"'),
      )).rejects.toThrow(/HTML\/JSON document parity/);
      await expect(readFile(join(dir, "bug-tracker.json"), "utf8"))
        .rejects.toThrow();
      await expect(readFile(join(dir, "bug-tracker.html"), "utf8"))
        .rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects inconsistent report and source artifact versions before writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-version-"));
    try {
      const source = fixture.games[0]!.levels[0]!;
      const mismatched: BugTrackerDocument = {
        ...fixture,
        games: [{
          ...fixture.games[0]!,
          levels: [{
            ...source,
            source: { ...source.source, version: "9.9.9" },
          }],
        }],
      };
      await expect(
        exportBugTracker(mismatched, dir, renderBugTrackerHtml),
      ).rejects.toThrow(/does not match source artifact version/);
      await expect(readFile(join(dir, "bug-tracker.json"), "utf8"))
        .rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("checks saved HTML and JSON against the current canonical renderer without writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-current-"));
    try {
      await exportBugTracker(fixture, dir, renderBugTrackerHtml);
      const htmlPath = join(dir, "bug-tracker.html");
      const jsonPath = join(dir, "bug-tracker.json");
      const html = await readFile(htmlPath, "utf8");
      const json = await readFile(jsonPath, "utf8");
      await expect(
        verifyPublishedBugTracker(fixture, dir, renderBugTrackerHtml),
      ).resolves.toBeUndefined();

      // Old HTML still has the same canonical issue IDs and map version.
      await writeFile(htmlPath, html.replace('class="lane-nav"', 'class="old-lane-nav"'), "utf8");
      await expect(
        verifyPublishedBugTracker(fixture, dir, renderBugTrackerHtml),
      ).rejects.toThrow(/bug-tracker\.html/);
      expect(await readFile(htmlPath, "utf8")).toContain("old-lane-nav");
      expect(await readFile(jsonPath, "utf8")).toBe(json);

      await writeFile(htmlPath, html, "utf8");
      await writeFile(jsonPath, json.replace('"Export issue"', '"Old Export issue"'), "utf8");
      await expect(
        verifyPublishedBugTracker(fixture, dir, renderBugTrackerHtml),
      ).rejects.toThrow(/bug-tracker\.json/);
      expect(await readFile(jsonPath, "utf8")).toContain("Old Export issue");

      // A changed canonical source also invalidates previously published bytes.
      await writeFile(jsonPath, json, "utf8");
      const changed: BugTrackerDocument = {
        ...fixture,
        games: [{
          ...fixture.games[0]!,
          levels: [{
            ...fixture.games[0]!.levels[0]!,
            issues: fixture.games[0]!.levels[0]!.issues.map(
              issue => ({ ...issue, issue: "Updated expected provenance statement." }),
            ),
          }],
        }],
      };
      await expect(
        verifyPublishedBugTracker(changed, dir, renderBugTrackerHtml),
      ).rejects.toThrow(/stale or inconsistent/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports missing publication outputs without creating any files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-incomplete-"));
    try {
      await expect(
        verifyPublishedBugTracker(fixture, dir, renderBugTrackerHtml),
      ).rejects.toThrow(/publication is incomplete/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a renderer that drops a canonical UI capability", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await expect(
        exportBugTracker(
          fixture,
          dir,
          (document) => renderBugTrackerHtml(document).replace('id="saveHtml"', 'id="missingSaveHtml"'),
        ),
      ).rejects.toThrow(/functional contract/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a renderer that drops a canonical ID", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await expect(
        exportBugTracker(
          fixture,
          dir,
          (document) => renderBugTrackerHtml(document).replace(
            'data-issue-id="DEV-EXPORT-001"',
            'data-dropped-id="DEV-EXPORT-001"',
          ),
        ),
      ).rejects.toThrow(/issue-ID parity/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a renderer that invents an extra ID", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bug-tracker-export-"));
    try {
      await expect(
        exportBugTracker(
          fixture,
          dir,
          (document) => renderBugTrackerHtml(document) + '<div data-issue-id="INVENTED"></div>',
        ),
      ).rejects.toThrow(/issue-ID parity/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
