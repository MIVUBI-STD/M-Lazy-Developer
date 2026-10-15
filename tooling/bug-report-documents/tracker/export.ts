import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BugTrackerDocument } from "./model.js";
import { trackerIssueIds, validateBugTrackerDocument } from "./validate.js";

export interface TrackerRenderer {
  (document: BugTrackerDocument): string;
}


function assertHtmlFunctionalContract(html: string): void {
  const required = [
    'id="saveButton"',
    'id="saveHtml"',
    'id="saveJson"',
    'id="importJson"',
    'id="resetData"',
    'id="workspace-snapshot"',
    'class="files"',
    'class="pics"',
    'data-result="SUCCESS"',
    'data-result="FAILED"',
    'Save as HTML',
    'Save JSON',
    'Load JSON',
    'Reset Tester Data',
  ];
  const missing = required.filter((token) => !html.includes(token));
  if (missing.length > 0) {
    throw new Error(
      "HTML functional contract failed; missing canonical renderer capabilities: " +
        missing.join(", "),
    );
  }
  const forbidden = [
    "Mark fixed",
    "Export HTML Snapshot",
    "Export JSON",
  ];
  const stale = forbidden.filter((token) => html.includes(token));
  if (stale.length > 0) {
    throw new Error(
      "HTML functional contract failed; stale presentation returned: " +
        stale.join(", "),
    );
  }
}

function prepareBugTrackerPublication(
  document: BugTrackerDocument,
  renderHtml: TrackerRenderer,
): { readonly json: string; readonly html: string } {
  validateBugTrackerDocument(document);
  const json = JSON.stringify(document, null, 2) + "\n";
  const html = renderHtml(document);
  assertHtmlFunctionalContract(html);

  // Exact IDs alone cannot protect a reader from stale titles, incorrect
  // source versions or rewritten evidence in the HTML's embedded JSON.
  const embedded = [...html.matchAll(
    /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/g,
  )];
  if (embedded.length !== 1) {
    throw new Error("HTML/JSON document parity failed: expected one embedded report-data document.");
  }
  let htmlDocument: unknown;
  try {
    htmlDocument = JSON.parse(embedded[0]![1]!);
  } catch {
    throw new Error("HTML/JSON document parity failed: embedded report-data JSON is invalid.");
  }
  if (JSON.stringify(htmlDocument) !== JSON.stringify(document)) {
    throw new Error("HTML/JSON document parity failed: embedded report differs from the canonical document.");
  }
  const ids = trackerIssueIds(document);
  const renderedIds = [...html.matchAll(/data-issue-id="([^"]+)"/g)].map((match) =>
    match[1]!
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&"),
  );
  const canonicalIds = new Set(ids);
  const renderedIdSet = new Set(renderedIds);
  if (
    renderedIds.length !== ids.length ||
    renderedIdSet.size !== renderedIds.length ||
    canonicalIds.size !== renderedIdSet.size ||
    ids.some((id) => !renderedIdSet.has(id))
  ) {
    throw new Error("HTML/JSON issue-ID parity failed.");
  }
  return { json, html };
}

export async function exportBugTracker(
  document: BugTrackerDocument,
  outDir: string,
  renderHtml: TrackerRenderer,
): Promise<void> {
  const { json, html } = prepareBugTrackerPublication(document, renderHtml);
  await writeFile(join(outDir, "bug-tracker.json"), json, "utf8");
  await writeFile(join(outDir, "bug-tracker.html"), html, "utf8");
}

/**
 * Read-only publication inspection against the current canonical inputs and
 * current renderer. Detects old output snapshots even when canonical issue
 * IDs and map version have not changed. Never writes or upgrades files.
 */
export async function verifyPublishedBugTracker(
  document: BugTrackerDocument,
  outDir: string,
  renderHtml: TrackerRenderer,
): Promise<void> {
  const expected = prepareBugTrackerPublication(document, renderHtml);
  let actualJson: string;
  let actualHtml: string;
  try {
    [actualJson, actualHtml] = await Promise.all([
      readFile(join(outDir, "bug-tracker.json"), "utf8"),
      readFile(join(outDir, "bug-tracker.html"), "utf8"),
    ]);
  } catch {
    throw new Error("Bug Tracker publication is incomplete: both HTML and JSON must exist and be readable.");
  }
  const stale = [
    ...(actualJson === expected.json ? [] : ["bug-tracker.json"]),
    ...(actualHtml === expected.html ? [] : ["bug-tracker.html"]),
  ];
  if (stale.length > 0) {
    throw new Error(
      "Bug Tracker publication is stale or inconsistent with the current source/renderer: " +
        stale.join(", ") + ". Regenerate using the canonical publisher.",
    );
  }
}
