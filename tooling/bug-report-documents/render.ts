import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import {
  join,
  resolve,
} from "node:path";
import {
  parseBugReportV2Json,
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
} from "../../engine/packages/bug-report/src/index.js";
import {
  projectClientDocumentToTracker,
  type ProjectRegistry,
  type DeveloperNoteRegistry,
} from "./tracker/project.js";
import { renderBugTrackerHtml } from "./tracker/render-html.js";
import { exportBugTracker } from "./tracker/export.js";

interface Args {
  readonly input: string;
  readonly outDir: string;
  readonly includeFixed: boolean;
  readonly includeMinor: boolean;
}

type MapAuditHtmlInput = import(
  "../../engine/packages/orchestrator/src/map-audit-output-v2.js"
).MapAuditOutputV2;

type MapAuditHtmlFinding =
  MapAuditHtmlInput["bugs"][number];

function safeSegment(value: string): string {
  const normalized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return normalized || "Map Audit";
}

function isMapAuditHtmlInput(
  value: unknown,
): value is MapAuditHtmlInput {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }
  const record =
    value as Record<string, unknown>;
  return (
    record.schemaVersion === 2 &&
    typeof record.artifactId === "string" &&
    typeof record.mapVersion === "string" &&
    Array.isArray(record.bugs) &&
    Array.isArray(record.designMismatches)
  );
}

function mapAuditHtmlInputIssues(
  audit: MapAuditHtmlInput,
): readonly string[] {
  const issues: string[] = [];
  const findings = [
    ...audit.bugs,
    ...audit.designMismatches,
  ];

  for (const finding of findings) {
    if (
      !finding.id?.trim() ||
      !finding.issue?.trim() ||
      !finding.expected?.trim() ||
      !finding.actual?.trim() ||
      !finding.failureDomain?.trim() ||
      !finding.gameplayFlow?.trim()
    ) {
      issues.push(
        "Map Audit finding is missing required reader-facing fields: " +
          (finding.id || "<missing-id>") +
          ".",
      );
    }
    if (
      finding.status === "NEED_VALIDATION" &&
      (
        !finding.validationReason?.trim() ||
        !finding.missingProof?.trim() ||
        !finding.validationTest?.trim()
      )
    ) {
      issues.push(
        "NEED_VALIDATION finding requires validationReason, missingProof, and validationTest: " +
          finding.id +
          ".",
      );
    }
  }

  return issues;
}

function parseArgs(argv: readonly string[]): Args {
  let input = "";
  let outDir = "";
  let includeFixed = false;
  let includeMinor = true;

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--input") {
      input = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (value === "--out") {
      outDir = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (value === "--include-fixed") {
      includeFixed = true;
      continue;
    }
    if (value === "--include-minor") {
      includeMinor = true;
      continue;
    }
    throw new Error("Unknown argument: " + value);
  }

  if (!input) {
    throw new Error(
      "Missing --input <Map Audit Output V2 or Approved Bug Report V2 JSON>.",
    );
  }
  const resolvedInput = resolve(input);
  const normalizedInput = resolvedInput.replaceAll("\\", "/");
  const inferredOutDir =
    normalizedInput.endsWith("/report/bug-report.json")
      ? resolve(resolvedInput, "..", "..", "output")
      : "";

  if (!outDir && !inferredOutDir) {
    throw new Error(
      "Missing --out <output directory>; automatic output is available for project/level report/bug-report.json input.",
    );
  }

  return {
    input: resolvedInput,
    outDir: resolve(outDir || inferredOutDir),
    includeFixed,
    includeMinor,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Render authored steps as plain, escaped HTML; never infer unstated steps. */
function orderedSteps(steps: readonly string[]): string {
  if (steps.length === 0) return "<p>No reproduction steps documented.</p>";
  return "<ol>" + steps.map(step => "<li>" + escapeHtml(step) + "</li>").join("") + "</ol>";
}

function checklist(items: readonly string[]): string {
  if (items.length === 0) return "";
  return "<ul>" + items.map(item => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function auditStatusLabel(
  finding: MapAuditHtmlFinding,
): string {
  return finding.status === "PROVEN"
    ? "PROVEN"
    : "NEED VALIDATION";
}

function auditFindingCard(
  finding: MapAuditHtmlFinding,
  index: number,
): string {
  // Map Audit V2 has no severity authority; show proof status instead.
  const severity = finding.status === "PROVEN" ? "PROVEN" : "UNPROVEN";
  const validationRows =
    finding.status === "NEED_VALIDATION"
      ? [
          '<div class="row"><b>Why Unproven</b><div>' +
            escapeHtml(
              finding.validationReason ??
                "Deciding proof remains unresolved.",
            ) +
            "</div></div>",
          '<div class="row"><b>Missing Proof</b><div>' +
            escapeHtml(
              finding.missingProof ??
                "Exact deciding proof is not yet available.",
            ) +
            "</div></div>",
          ...(finding.validationTest
            ? [
                '<div class="row"><b>Validation Test</b><div>' +
                  escapeHtml(finding.validationTest) +
                  "</div></div>",
              ]
            : []),
        ]
      : [];

  return [
    '<article class="issue">',
    '<div class="ih">',
    '<div class="tags"><span>' +
      String(index).padStart(2, "0") +
      '</span><span class="sev">' +
      escapeHtml(severity) +
      '</span><span class="kind">' +
      escapeHtml(finding.issueType) +
      '</span><span class="status">' +
      escapeHtml(auditStatusLabel(finding)) +
      '</span></div>',
    '<h3>' + escapeHtml(finding.issue) + '</h3>',
    '<code>' + escapeHtml(finding.id) + '</code>',
    '</div>',
    '<details><summary>View Details</summary>',
    ...(finding.playerImpact
      ? [
          '<div class="row"><b>Issue</b><div>' +
            escapeHtml(finding.playerImpact) +
            '</div></div>',
        ]
      : []),
    '<div class="row"><b>How to Reproduce</b><div>' +
      orderedSteps(finding.reproduceSteps) +
      '</div></div>',
    '<div class="row"><b>Observed</b><div>' +
      escapeHtml(finding.actual) +
      '</div></div>',
    '<div class="row"><b>Expected</b><div>' +
      escapeHtml(finding.expected) +
      '</div></div>',
    ...validationRows,
    '<div class="row"><b>Technical Analysis</b><div class="tech">' +
      escapeHtml(
        "Gameplay Flow: " +
          finding.gameplayFlow +
          "\nFailure Domain: " +
          finding.failureDomain,
      ) +
      '</div></div>',
    '</details></article>',
  ].join("\n");
}

function auditValidationPlan(
  audit: MapAuditHtmlInput,
): string {
  const groups = audit.validationTests ?? [];
  if (groups.length === 0) return "";

  return [
    '<section class="section">',
    '<h2>Validation Plan</h2>',
    '<div class="note">Run only the unresolved proof groups below. Shared setup may be reused, but every exact assertion remains independent.</div>',
    ...groups.map((group) => {
      const assertions =
        group.assertions?.length
          ? checklist(
              group.assertions.map(
                (item) =>
                  item.findingId + " — " + item.test,
              ),
            )
          : checklist([group.test]);
      return [
        '<article class="issue-card">',
        '<div class="row"><div class="label">Group</div><div class="value"><strong>' +
          escapeHtml(group.key) +
          '</strong><br>' +
          escapeHtml(group.test) +
          '</div></div>',
        ...(group.missingProof?.length
          ? [
              '<div class="row"><div class="label">Missing Proof</div><div class="value">' +
                checklist(group.missingProof) +
                '</div></div>',
            ]
          : []),
        '<div class="row"><div class="label">Exact Assertions</div><div class="value">' +
          assertions +
          '</div></div>',
        '</article>',
      ].join("");
    }),
    '</section>',
  ].join("\n");
}

function auditObligationsSection(
  audit: MapAuditHtmlInput,
): string {
  const obligations = audit.auditObligations ?? [];
  if (obligations.length === 0) return "";

  return [
    '<section class="section obligations">',
    '<h2>Audit Obligations — Not Bugs</h2>',
    '<div class="note"><strong>Important:</strong> These are unresolved audit/model/proof obligations. They are not BUG or DESIGN_MISMATCH findings unless later causal analysis proves a player-visible contradiction.</div>',
    ...obligations.map((item) =>
      '<article class="obligation-card"><details><summary><strong>' +
      escapeHtml(item.title) +
      '</strong><span>' +
      escapeHtml(item.stage) +
      ' · ' +
      escapeHtml(item.source) +
      '</span></summary><div class="obligation-body">' +
      '<div class="row"><div class="label">Why It Exists</div><div class="value">' +
      escapeHtml(item.reason) +
      '</div></div>' +
      '<div class="row"><div class="label">Missing Proof</div><div class="value">' +
      escapeHtml(item.missingProof) +
      '</div></div>' +
      '<div class="row"><div class="label">Resolve With</div><div class="value">' +
      escapeHtml(item.validationTest) +
      '</div></div>' +
      '</div></details></article>'
    ),
    '</section>',
  ].join("\n");
}

function auditControlSummary(
  audit: MapAuditHtmlInput,
): string {
  const control = audit.control;
  if (!control) return "";

  const blockers =
    control.blockingCheckpointIds.length > 0
      ? control.blockingCheckpointIds.join(", ")
      : "None";

  const reasons =
    control.reasons.length > 0
      ? '<ul>' +
        control.reasons.map(
          (item) =>
            '<li>' + escapeHtml(item) + '</li>',
        ).join("") +
        '</ul>'
      : '<span>None</span>';

  return [
    '<section class="section control-summary">',
    '<h2>Current Audit Action</h2>',
    '<div class="control-grid">',
    '<div><span>Status</span><strong>' +
      escapeHtml(control.status) +
      '</strong></div>',
    '<div><span>Stage</span><strong>' +
      escapeHtml(control.currentStage) +
      '</strong></div>',
    '<div><span>Next Action</span><strong>' +
      escapeHtml(control.allowedNextAction) +
      '</strong></div>',
    '<div><span>Owner</span><strong>' +
      escapeHtml(control.continuationOwner) +
      '</strong></div>',
    '</div>',
    '<div class="row"><div class="label">Blocking Checkpoints</div><div class="value">' +
      escapeHtml(blockers) +
      '</div></div>',
    ...(control.reasons.length > 0
      ? [
          '<div class="row"><div class="label">Why</div><div class="value">' +
            reasons +
            '</div></div>',
        ]
      : []),
    '</section>',
  ].join("\n");
}

function userIntentSummary(
  audit: MapAuditHtmlInput,
): string {
  const intent = audit.userIntent;
  if (!intent) return "";

  const symptoms = intent.items.filter(
    (item) => item.kind === "SYMPTOM_REPORT",
  );
  const suspicions = intent.items.filter(
    (item) => item.kind === "SUSPICION",
  );
  const constraints = intent.items.filter(
    (item) => item.kind === "TEST_CONSTRAINT",
  );
  const expectations = intent.items.filter(
    (item) => item.kind === "EXPECTATION_CLAIM",
  );
  const designClaims = intent.items.filter(
    (item) => item.kind === "DESIGN_CLAIM",
  );
  const historical = intent.items.filter(
    (item) => item.kind === "HISTORICAL_REFERENCE",
  );
  const scope = intent.items.filter(
    (item) =>
      item.kind === "SCOPE_REQUEST" ||
      item.kind === "EXCLUSION_REQUEST",
  );
  const fragmentById = new Map(
    intent.fragments.map(
      (fragment) => [fragment.id, fragment],
    ),
  );
  const unmapped = intent.unmappedFragmentIds
    .map((id) => fragmentById.get(id))
    .filter(
      (
        item,
      ): item is {
        readonly id: string;
        readonly raw: string;
      } => item !== undefined,
    );

  const list = (
    items: readonly { readonly normalized: string }[],
  ): string =>
    items.length === 0
      ? "—"
      : items.map(
          (item) =>
            "<li>" +
            escapeHtml(item.normalized) +
            "</li>",
        ).join("");

  return [
    '<section class="section user-intent">',
    '<details>',
    '<summary>User Input Interpretation — Guidance Only</summary>',
    '<div class="note"><strong>Authority:</strong> User wording only raises search priority. It does not prove Expected/Actual behavior, BUG/DESIGN_MISMATCH, severity, safety, or absence.</div>',
    '<div class="row"><div class="label">Symptoms</div><div class="value"><ul>' +
      list(symptoms) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Suspicions</div><div class="value"><ul>' +
      list(suspicions) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Priority Domains</div><div class="value">' +
      escapeHtml(
        intent.priorityDomains.join(", ") || "—",
      ) +
      '</div></div>',
    '<div class="row"><div class="label">Priority Player Flow</div><div class="value">' +
      escapeHtml(
        intent.priorityPlayerFlows.join(", ") || "—",
      ) +
      '</div></div>',
    '<div class="row"><div class="label">Expectation Claims</div><div class="value"><ul>' +
      list(expectations) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Design Claims</div><div class="value"><ul>' +
      list(designClaims) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Historical Hints</div><div class="value"><ul>' +
      list(historical) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Scope Guidance</div><div class="value"><ul>' +
      list(scope) +
      '</ul></div></div>',
    '<div class="row"><div class="label">Test Constraints</div><div class="value"><ul>' +
      list(constraints) +
      '</ul></div></div>',
    ...(unmapped.length === 0
      ? []
      : [
          '<div class="row"><div class="label">Unmapped Input</div><div class="value"><ul>' +
          unmapped.map(
            (item) =>
              '<li>' +
              escapeHtml(item.raw) +
              '</li>',
          ).join("") +
          '</ul><div class="proof-note">Preserved as Audit Obligation; not ignored and not treated as a bug.</div></div></div>',
        ]),
    ...(intent.ambiguities.length === 0
      ? []
      : [
          '<div class="row"><div class="label">Ambiguities</div><div class="value"><ul>' +
          intent.ambiguities.map(
            (item) =>
              '<li>' +
              escapeHtml(item) +
              '</li>',
          ).join("") +
          '</ul></div></div>',
        ]),
    '</details>',
    '</section>',
  ].join("\n");
}

function auditContextSummary(
  audit: MapAuditHtmlInput,
): string {
  const hasContext =
    audit.gameDesign !== undefined ||
    audit.multiArena !== undefined ||
    audit.gameplayClosure !== undefined ||
    audit.honesty !== undefined ||
    audit.fullMapReplica !== undefined;

  if (!hasContext) return "";

  const design = audit.gameDesign;
  const arenas = audit.multiArena;
  const closure = audit.gameplayClosure;
  const honesty = audit.honesty;
  const replica = audit.fullMapReplica;

  const rows: string[] = [];

  if (design) {
    rows.push(
      '<div class="row"><div class="label">Game Design</div><div class="value">' +
        '<strong>Objective:</strong> ' +
        escapeHtml(design.objective) +
        ' <span class="grounding">[' +
        escapeHtml(design.objectiveGrounding) +
        ']</span>' +
        '<br><strong>Win:</strong> ' +
        escapeHtml(design.winCondition) +
        ' <span class="grounding">[' +
        escapeHtml(design.winConditionGrounding) +
        ']</span>' +
        '<br><strong>Lose:</strong> ' +
        escapeHtml(design.loseCondition) +
        ' <span class="grounding">[' +
        escapeHtml(design.loseConditionGrounding) +
        ']</span>' +
        '</div></div>',
    );
  }

  if (arenas) {
    rows.push(
      '<div class="row"><div class="label">Multi-Arena</div><div class="value">' +
        '<strong>Detected:</strong> ' +
        escapeHtml(String(arenas.detected)) +
        '<br><strong>Visible Arenas:</strong> ' +
        escapeHtml(
          arenas.visibleArenaCount === null
            ? "Unresolved"
            : String(arenas.visibleArenaCount),
        ) +
        '<br><strong>Declared Concurrent:</strong> ' +
        escapeHtml(
          arenas.declaredConcurrentArenaLimit === null
            ? "Unresolved"
            : String(arenas.declaredConcurrentArenaLimit),
        ) +
        '<br><strong>Proven Safe Concurrent:</strong> ' +
        escapeHtml(
          arenas.safeConcurrentArenaLimit === null
            ? "Not proven"
            : String(arenas.safeConcurrentArenaLimit),
        ) +
        '</div></div>',
    );
  }

  if (closure) {
    rows.push(
      '<div class="row"><div class="label">Gameplay Closure</div><div class="value">' +
        '<strong>Status:</strong> ' +
        escapeHtml(closure.status) +
        '<br><strong>State Model:</strong> ' +
        escapeHtml(
          closure.stateModelComplete
            ? "Complete"
            : "Incomplete",
        ) +
        '<br><strong>Boundaries:</strong> ' +
        escapeHtml(
          closure.boundariesExtracted
            ? "Extracted"
            : "Incomplete",
        ) +
        '<br><strong>Unaccounted Surfaces:</strong> ' +
        escapeHtml(
          String(closure.unaccountedSurfaceIds.length),
        ) +
        '</div></div>',
    );
  }

  if (honesty) {
    rows.push(
      '<div class="row"><div class="label">Finding Visibility Gate</div><div class="value">' +
        '<strong>Status:</strong> ' +
        escapeHtml(honesty.status) +
        '<br><span class="proof-pref">PASS means all tracked material residue is visibly represented; it does not claim the audit is infallible.</span>' +
        '<br><strong>Missing Residue:</strong> ' +
        escapeHtml(
          String(honesty.missingVisibleResidueIds.length),
        ) +
        '<br><strong>Missing Proven Projection:</strong> ' +
        escapeHtml(
          String(honesty.missingProvenProjectionIds.length),
        ) +
        '</div></div>',
    );
  }

  if (replica) {
    rows.push(
      '<div class="row"><div class="label">Replica Proof</div><div class="value">' +
        '<strong>Baseline:</strong> ' +
        escapeHtml(replica.replicaBaseline) +
        '<br><strong>Reusable for All:</strong> ' +
        escapeHtml(
          String(replica.baselineReusableForAllReplicas),
        ) +
        '<br><strong>Divergence:</strong> ' +
        escapeHtml(
          String(replica.replicaDivergenceIds.length),
        ) +
        '<br><strong>Incomplete:</strong> ' +
        escapeHtml(
          String(replica.incompleteReplicaIds.length),
        ) +
        '</div></div>',
    );
  }

  return [
    '<section class="section audit-context">',
    '<details>',
    '<summary>Audit Context</summary>',
    '<div class="audit-context-body">',
    ...rows,
    '</div>',
    '</details>',
    '</section>',
  ].join("\n");
}

function renderCompleteMapAuditHtml(
  audit: MapAuditHtmlInput,
): string {
  const bugs = [...audit.bugs];
  const designMismatches =
    [...audit.designMismatches];
  const findings = [
    ...bugs,
    ...designMismatches,
  ];
  const proven = findings.filter(
    (item) => item.status === "PROVEN",
  ).length;
  const needValidation =
    findings.length - proven;
  const artifactLabel =
    audit.evidenceScope?.selectedArtifact ||
    audit.artifactId;
  const severityCounts = findings
    .filter((item) => item.status === "PROVEN")
    .reduce(
      (counts, item) => {
        const severity = item.issueType;
        counts.set(
          severity,
          (counts.get(severity) ?? 0) + 1,
        );
        return counts;
      },
      new Map<string, number>(),
    );
  const severitySummary =
    [...severityCounts.entries()]
      .map(([severity, count]) =>
        String(count) + " " + severity,
      )
      .join(" · ") || "No proven findings";
  const css = `
*{box-sizing:border-box}body{margin:0;background:#eef1f5;font:14px Arial;color:#172033}.r{max-width:980px;margin:auto;background:#fff;min-height:100vh}.hero{padding:24px;background:#172b4d;color:#fff}.hero h1{margin:0}.hero p{margin:6px 0 0;font-size:11px;opacity:.8}.summary{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:10px solid #eef1f5}.summary div{padding:16px 18px;border-right:1px solid #d9dee8}.summary small{display:block;color:#667085;font-size:9px;font-weight:800}.summary strong{font-size:20px}.source{margin:14px;padding:12px 14px;background:#f8fafc;border:1px solid #d9dee8;border-radius:8px}.section{padding:0 14px 24px}.section h2{font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px}.issue{border:1px solid #d7dde7;border-radius:8px;margin:9px 0;overflow:hidden;background:#fff}.ih{padding:10px}.tags{display:flex;gap:6px;align-items:center}.tags span{font-size:9px;font-weight:800}.sev{background:#fff2dc;color:#8a5700;padding:2px 6px;border-radius:99px}.kind{background:#eef4ff;color:#3157a4;padding:2px 6px;border-radius:99px}.status{margin-left:auto;background:#f3f4f6;color:#475467;padding:2px 6px;border-radius:99px}.issue h3{margin:7px 0 3px;font-size:14px}.issue code{font-size:10px;color:#667085}.issue summary{cursor:pointer;padding:9px 10px;background:#f8fafc;color:#3157a4;font-weight:800}.row{display:grid;grid-template-columns:145px 1fr;border-top:1px solid #e5e7eb}.row>b{padding:10px;background:#f8fafc;color:#3157a4;font-size:10px}.row>div{padding:10px;font-size:12px}.row ol,.row ul{margin:0;padding-left:18px}.tech{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px}.empty{padding:14px;color:#667085;background:#f8fafc;border-radius:8px}@media(max-width:650px){.summary{grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr}.r{width:100%}}
`;

  let issueNumber = 1;
  const bugHtml = bugs.length > 0
    ? bugs.map((item) =>
        auditFindingCard(item, issueNumber++),
      ).join("\n")
    : '<div class="empty">No reportable bug findings.</div>';
  const mismatchHtml =
    designMismatches.length > 0
      ? designMismatches.map((item) =>
          auditFindingCard(item, issueNumber++),
        ).join("\n")
      : '<div class="empty">No reportable design mismatches.</div>';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(artifactLabel)} — Map Audit Report</title><style>${css}</style></head>
<body><main class="r">
<section class="hero"><h1>${escapeHtml(artifactLabel)} — Map Audit Report</h1><p>Selected-artifact audit findings projection</p></section>
<section class="summary">
<div><small>FINDINGS</small><strong>${findings.length}</strong></div>
<div><small>BUGS</small><strong>${bugs.length}</strong></div>
<div><small>DESIGN MISMATCH</small><strong>${designMismatches.length}</strong></div>
<div><small>STATUS</small><strong>${proven} Proven · ${needValidation} Need Validation</strong></div>
</section>
<div class="source"><b>v${escapeHtml(audit.mapVersion)}</b><br>${escapeHtml(artifactLabel)}<br><small>${escapeHtml(severitySummary)}</small></div>
<section class="section"><h2>BUGS</h2>${bugHtml}<h2>DESIGN MISMATCH</h2>${mismatchHtml}</section>
</main></body></html>`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const source = await readFile(args.input, "utf8");
  const raw = JSON.parse(source) as unknown;

  if (isMapAuditHtmlInput(raw)) {
    const auditIssues =
      mapAuditHtmlInputIssues(raw);
    if (auditIssues.length > 0) {
      throw new Error(
        "Map Audit Output V2 is not render-ready: " +
          auditIssues.join("; "),
      );
    }
    const label =
      raw.evidenceScope?.selectedArtifact ||
      raw.artifactId;
    const stem =
      safeSegment(label) +
      " v" +
      safeSegment(raw.mapVersion) +
      " - Map Audit Report";
    await mkdir(args.outDir, { recursive: true });
    const output = join(args.outDir, stem + ".html");
    await writeFile(
      output,
      renderCompleteMapAuditHtml(raw),
      "utf8",
    );
    process.stdout.write(output + "\n");
    return;
  }

  const parsed = parseBugReportV2Json(source);
  if (!parsed.ok) {
    throw new Error(
      "Input is neither Map Audit Output V2 nor valid Approved Bug Report V2: " +
        parsed.issues
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const document =
    projectBugReportClientDocument(
      parsed.report,
      {
        includeFixed: args.includeFixed,
        includeMinor: args.includeMinor,
      },
    );
  const quality =
    reviewBugReportClientDocument(document);
  if (quality.length > 0) {
    throw new Error(
      "Client document is not render-ready: " +
        quality
          .map((issue) =>
            issue.path + ": " + issue.message
          )
          .join("; "),
    );
  }

  const projectsRoot = resolve(
    process.cwd(),
    "workspace/projects",
  );
  const projectIds = await readdir(projectsRoot);
  const projects: ProjectRegistry["projects"][number][] = [];
  const reportScopes: {
    readonly projectId: string;
    readonly sourceProjectId: string;
    readonly projectName: string;
    readonly version: string;
    readonly reportRoot: string;
  }[] = [];

  for (const projectId of projectIds) {
    try {
      const projectSource = await readFile(
        resolve(projectsRoot, projectId, "project.json"),
        "utf8",
      );
      const project = JSON.parse(projectSource) as {
        readonly projectId: string;
        readonly projectName: string;
        readonly artifact?: ProjectRegistry["projects"][number]["artifact"];
        readonly publication?: ProjectRegistry["projects"][number]["publication"];
        readonly levels?: readonly {
          readonly level: number;
          readonly levelName: string;
          readonly artifact: ProjectRegistry["projects"][number]["artifact"];
          readonly drive: NonNullable<ProjectRegistry["projects"][number]["publication"]>["drive"];
        }[];
      };

      if (project.levels?.length) {
        for (const level of project.levels) {
          const sourceProjectId =
            project.projectId + "-level-" + String(level.level);
          projects.push({
            projectId: sourceProjectId,
            projectName: level.levelName,
            artifact: level.artifact,
            ...(level.drive === undefined ? {} : { publication: { drive: level.drive } }),
          });
          reportScopes.push({
            projectId: project.projectId,
            sourceProjectId,
            projectName: level.levelName,
            version: level.artifact.version,
            reportRoot: resolve(
              projectsRoot,
              project.projectId,
              "levels",
              "level-" + String(level.level),
              "report",
            ),
          });
        }
      } else if (project.artifact) {
        projects.push(project as ProjectRegistry["projects"][number]);
        reportScopes.push({
          projectId: project.projectId,
          sourceProjectId: project.projectId,
          projectName: project.projectName,
          version: project.artifact.version,
          reportRoot: resolve(
            projectsRoot,
            project.projectId,
            "report",
          ),
        });
      }
    } catch {
      // A workspace directory without valid project.json is not project authority.
    }
  }

  const registry: ProjectRegistry = { projects };
  const scopes = reportScopes.filter(
    (scope) =>
      scope.projectName === document.map.name &&
      scope.version === document.map.mapVersion,
  );
  if (scopes.length !== 1) {
    throw new Error(
      "Expected exactly one project/level workspace for " +
        document.map.name +
        " v" +
        document.map.mapVersion +
        ".",
    );
  }
  const scope = scopes[0]!;
  let developerNotes: DeveloperNoteRegistry = {
    schema: "m-bedrock-dev-notes/v1",
    notes: [],
  };
  try {
    const developerNotesSource = await readFile(
      resolve(scope.reportRoot, "developer-notes.json"),
      "utf8",
    );
    const localNotes = JSON.parse(developerNotesSource) as {
      readonly schema: "m-bedrock-dev-notes/v1";
      readonly notes: readonly Omit<DeveloperNoteRegistry["notes"][number], "projectId">[];
    };
    developerNotes = {
      schema: localNotes.schema,
      notes: localNotes.notes.map((note) => ({
        ...note,
        projectId: scope.sourceProjectId,
      })),
    };
  } catch (error) {
    const code =
      error !== null &&
      typeof error === "object" &&
      "code" in error
        ? String(error.code)
        : "";
    if (code !== "ENOENT") throw error;
  }
  const tracker = projectClientDocumentToTracker(
    document,
    registry,
    developerNotes,
  );
  await mkdir(args.outDir, { recursive: true });
  await exportBugTracker(
    tracker,
    args.outDir,
    renderBugTrackerHtml,
  );
  process.stdout.write(
    join(args.outDir, "bug-tracker.html") + "\n" +
    join(args.outDir, "bug-tracker.json") + "\n",
  );
}

await main();
