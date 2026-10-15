---
id: document.system.bug-tracker-ui
class: DOCUMENT
domain: system
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

# Bug Tracker UI Contract

This document is the canonical presentation contract for Approved Bug Report V2 tracker output.

It governs human-facing HTML only. Canonical BUG, DESIGN_MISMATCH, DEV_NOTE, source binding, version, evidence, and technical facts remain owned by their existing repository authorities.

## Goal

The report must make the normal workflow obvious without explanation:

```text
open report
→ identify map / level / version
→ find a finding
→ understand the problem
→ run Test In-Game
→ compare with Expected
→ mark Passed or Failed
→ optionally add notes/evidence
→ Save as HTML
```

Developer flow uses the same finding:

```text
problem
→ Technical Details
→ evidence
→ technical explanation
→ relevant code
→ recommended fix
→ must-preserve boundary
```

Every visible element must help navigation, understanding, testing, debugging, or saving. Otherwise it does not belong in HTML.

## Language

All generated report UI vocabulary is English.

Use one presentation term per concept:

| Concept | UI term |
| --- | --- |
| gameplay test | Test In-Game |
| correct observable behavior | Expected |
| tester outcome | Passed / Failed |
| unresolved proof | Needs Validation |
| developer detail disclosure | Technical Details |
| fix direction | Recommended Fix |
| tester free text | Tester Notes |
| historical retained version | archive/vX.Y.Z |

Do not reintroduce presentation synonyms such as How to Reproduce, Mark Fixed, Needs Verify, Resolution, Success, or Done.

Storage field names are not renamed merely to match presentation labels.

## Two presentation scopes

### Map Report — default

A document containing one game renders as a Map Report.

It does not render Maps navigation or a game accordion.

Hierarchy:

```text
Bug Tracker Report
Map
Version / Levels
Summary
Level / Source
Bugs
Design Mismatches
Developer Notes
```

A single-map report uses compact jump links for **nonempty** Bugs, Design Mismatches, and Developer Notes at the corresponding source/level. Links target stable, document-unique section anchors. No Maps navigation, game accordion, or empty-lane link appears in a one-game document. When level number is absent, display **Map**, never `Level null`.

For multi-level games, add a compact level jump list only when there are at least two levels; retain authored level numbers even when they are sparse:

```text
Game
├── Level 1
│   ├── Source
│   ├── Bugs
│   ├── Design Mismatches
│   └── Developer Notes
└── Level 2
    └── same lane order
```

### Combined Report — briefing

A document containing multiple games renders as a Combined Report.

It adds global Summary, Maps navigation, and collapsible game sections.

Maps use column-major numbering: numbers read downward in the first column before continuing at the top of the second column.

Combined mode is a briefing/navigation presentation, not a second canonical report authority. Retain global Maps navigation and its column-major desktop ordering, plus source-local links to nonempty lanes and optional level jumps. Use unique anchors per game and level so equal issue-lane names never navigate into another map. At narrow widths, global Maps navigation stacks in document order without horizontal overflow.

## Lane order

Within every level, lane order is fixed:

1. Bugs
2. Design Mismatches
3. Developer Notes

Empty lanes are omitted from HTML.

Each lane has independent visual numbering starting at 01. Canonical IDs remain the real identity.

DEV_NOTE is reference information. It has no gameplay severity and no Passed/Failed control. Its expanded details follow Problem → Evidence → Action Required. Evidence fields are rendered as readable, escaped label/value rows from the existing canonical object, including nested values, rather than requiring recipients to interpret raw JSON. Missing evidence remains absent.

## Finding hierarchy

Collapsed gameplay finding:

```text
number · severity · verification · optional tester result
title
problem
canonical ID
Test / Details
```

Expanded gameplay finding:

```text
Why This Is a Bug   only when canonical rationale exists
Impact              only when canonical impact exists
Test In-Game       only when canonical reproduction exists
Expected           only when canonical expected behavior exists
Test Result
Tester Notes       optional workspace state
Evidence           optional workspace state
Technical Details  only when technical content exists
```

Technical Details order:

1. Observed / Evidence — the recorded state or source observation, without implying a live Minecraft test.
2. Technical Analysis — the documented interpretation or proposed cause, not an automatically proven root cause.
3. Relevant Code — original file paths with the source-authored reason for inspecting each location, readable on separate lines.
4. Recommended Fix — a proposed repair direction, not an executed repair or confirmed outcome.
5. Must Preserve — recorded invariants that must survive repair.

For Needs Validation, mark the technical assessment and repair direction provisional. A Verified Issue does not imply runtime proof or a completed retest. Do not generate missing technical facts, line numbers or root causes.

Why This Is a Bug explains the grounded contract/design contradiction that makes the finding wrong. Impact explains the concrete gameplay, player, state, fairness, progression, or maintenance consequence. They are canonical facts, not renderer inference.

Missing canonical information stays missing. The renderer must never invent rationale, impact, reproduction, expected behavior, cause, evidence, code ownership, or a fix to make the card look complete.

## Recipient test-readiness and result meaning

The recipient-facing HTML must distinguish **issue evidence**, **guided retest instructions**, and **tester results** without creating a new schema or altering canonical issue approval/completion.

- \`Verified Issue\` is the issue's canonical evidence verification classification; it is **not** a Passed Minecraft retest or \`fixed: true\`.
- \`Needs Validation\` is an unresolved proof classification and must remain visible. It is not the same as missing instructions.
- After-fix Passed / Failed are available only for `VERIFIED` findings with an acceptable Test In-Game procedure under the shared `reviewTesterReproductionSteps()` gate, plus nonempty Expected and Observed evidence text. `NEEDS_VERIFY` findings may still show authored validation steps and accept Tester Notes / Evidence, but cannot claim a successful post-fix retest before their evidence is verified. The existing `trackerGuidedRetestReadiness()` projection derives this without changing tracker JSON. This is **presentation-readiness only**, not proof of Minecraft execution.
- A `NEEDS_VERIFY` finding shows **Validate Evidence First** independently of the procedure's textual quality. A verified finding with absent, blank, technically oriented or vague steps, missing Expected, or missing Observed shows **Retest Procedure Not Ready** and the specific reason in expanded details. Show the mutually exclusive summary counts **Needs Validation**, **Retest Ready**, and **No Guided Procedure**. The latter means a verified issue lacks acceptable retest instructions; it does **not** prove a source-only origin (a tester finding may also lack recorded instructions). Keep all issue/source/developer evidence and notes accessible; disable Passed / Failed while unready. Preserve older tester state without displaying it as a current successful retest. Never invent steps or runtime proof.
- \`Passed\` means **after a repair** the tester observed Expected behavior and the prior issue no longer appears. \`Failed\` means the defect persists or Expected behavior is not met. These are tester workspace observations; neither changes canonical repair closure.
- BUG and DESIGN_MISMATCH use the same after-fix retest semantics. Design Mismatches label their evidence rationale \`Why This Is a Mismatch\`; do not mislabel it \`Why This Is a Bug\`. Developer Notes have no severity or Passed / Failed state.

### Local workspace integrity

- Show \`Saved locally\` only after a successful browser persistence write, never as the default state. When browser storage is unavailable or full, show a visible warning and retain in-memory work so that the recipient can use the existing \`Save as HTML\` or \`Save JSON\` portable workflow before closing the page. Never promise data survived a refresh when the write failed.
- A screenshot must not be labeled saved if the browser storage write failed. Unsupported or oversized screenshot files require an explanation rather than silent omission.
- Distinguish malformed/different-artifact Load JSON from browser storage failure. A failed load must not discard current working data.
- Saved portable HTML/JSON can contain tester notes and screenshots. Advise recipients to review these before sharing. Portable copies do not mutate canonical issue data.
- These measures apply within the existing renderer; do not create a separate status database, report generator, or browser data authority.

## Interaction states

Card color communicates tester interaction state; badges communicate canonical classification.

- default: white;
- open: blue left rail + blue border + subtle blue header;
- Passed: green result treatment;
- Failed: red result treatment.

Verification remains visible after Passed/Failed because verification and tester result answer different questions.

Severity colors:

- Blocker: red;
- Major: amber;
- Minor: neutral gray.

Verification colors:

- Verified Issue: subtle green;
- Needs Validation: amber.

Do not use blue for Minor; blue is reserved for active/interacting UI.

## Readability

Desktop is the current presentation target.

- report width: approximately 1080 px on desktop, adapting to narrower viewports without horizontal scrolling;
- narrative text width: approximately 760–850 px on wide screens;
- body/problem/test text: approximately 14 px with at least 1.5 line height;
- issue title: approximately 16–17 px;
- metadata and canonical IDs: approximately 11–12 px, with IDs in monospace;
- count and severity information remains readable without overpowering the issue titles;
- text is left aligned, with long source paths wrapping rather than cropping;
- textarea background is white;
- keyboard focus remains visibly outlined on links, buttons, and disclosures.

Use a small spacing scale (4 / 8 / 12 / 16 / 24 px) instead of one-off values.

Do not add charts, sidebars, gradients, decorative animation, dashboard widgets, or icon libraries unless a demonstrated workflow problem requires them.

## Tester workspace and Save

Tester workspace state is not canonical issue state.

Persist only useful working data:

- Passed / Failed;
- Tester Notes;
- evidence attachments and captions;
- Developer Notes free text.

Do not persist hover state, disclosure state, scroll position, or other presentation-only state.

Changes auto-save to browser-local workspace state.

Primary portable action is **Save as HTML**. It creates a new self-contained HTML copy containing current tester workspace state. It does not overwrite the generated canonical `output/bug-tracker.html`.

Secondary actions:

- Save JSON;
- Load JSON;
- Reset Tester Data.

Use Save, not Export, in tester-facing UI.

## HTML / JSON parity

HTML and `bug-tracker.json` are projections of the same validated BugTrackerDocument.

Every canonical BUG, DESIGN_MISMATCH, and DEV_NOTE ID must appear exactly once in both projection domains. The renderer must not create, duplicate, or omit canonical findings.

Tester workspace state may be included in a saved portable HTML/JSON copy, but it never mutates canonical issue facts.

## Publication integrity

Current `output/bug-tracker.html` and `output/bug-tracker.json` must be written through `tooling/bug-report-documents/render.ts` → `exportBugTracker()` → the canonical tracker renderer.

Do not hand-author, partially patch, or maintain a second HTML implementation under a project output directory.

Publication must fail if the rendered HTML loses a promised tester capability. The functional contract currently requires:

- Passed / Failed controls;
- Save as HTML;
- Save JSON;
- Load JSON;
- Reset Tester Data;
- embedded saved-workspace snapshot support;
- evidence file input and rendered evidence collection;
- exact canonical finding/Developer Note ID parity with JSON.

A visible control without its canonical behavior is a publication defect, not an acceptable visual placeholder.

### Publication integrity and stale-output detection

Publication is derived from the selected **current** Approved Bug Report V2, its exact project/level source binding, and canonical Developer Notes. The output pair is `bug-tracker.html` and `bug-tracker.json`; neither file independently owns the issue state.

Before writing either file, `exportBugTracker()` validates the document, verifies exact level/source artifact version equality, checks mandatory HTML actions, requires all canonical issue IDs exactly once, and verifies that the entire JSON document embedded inside HTML equals the document serialized to the JSON output. Matching IDs alone cannot validate titles, evidence, source identity or version.

The existing `tooling/bug-report-documents/render.ts` supports `--check` for Approved Bug Report V2 publishing. It rebuilds the expected derived output from the current canonical input and canonical renderer, then compares **both** on-disk output files byte-for-byte. It performs no writes, no auto-repair and no promotion of source-only or unverified map findings. A missing, tampered or outdated HTML/JSON file fails this check with an explicit publication error. The `--check` flag does not apply to Map Audit Output V2 HTML, which has a different publication scope.

A successful static check of these contracts is not proof of executed rendering or browser behavior. A filesystem error between two output writes can still leave a partially updated pair; the read-only check must reject that mismatch. Never claim that the two file writes form one atomic filesystem transaction. Old derived HTML must be regenerated through the canonical publisher, not edited directly or mistaken for current output.

## Regression requirements

Repository tests must protect at least:

- one-game document renders Map Report without Maps navigation;
- multi-game document renders Combined Report with Maps navigation;
- combined Maps navigation is column-major;
- lane order is Bugs → Design Mismatches → Developer Notes;
- empty lanes do not render or produce navigation links;
- Map Report uses lane jumps but never Maps navigation; multi-level documents show level jumps with authored level IDs and map reports without numbered levels show Map, never Level null;
- Combined Report lane/level anchors are unique across games and responsive Maps navigation preserves reading order;
- lane numbering is independent;
- Passed and Failed controls exist;
- Mark Fixed and Export do not return;
- Why This Is a Bug and Impact render only from explicit canonical data;
- Technical Details only render from available canonical data;
- unknown information is omitted rather than synthesized;
- Developer Notes remain a separate reference lane;
- verified, needs-validation, and verified-without-procedure cases remain distinct in issue cards and summary; no source-only claim is inferred merely from missing steps;
- HTML/JSON canonical-ID **and complete embedded-document** parity remains exact;
- source report version must match the source artifact version;
- read-only publication check rejects missing or stale HTML/JSON and never overwrites tester/source data.

## Change rule

Do not add a visible field because it might be useful.

Before adding UI, prove that it helps at least one of:

1. find something;
2. understand a finding;
3. run a test;
4. debug/fix the problem;
5. save/continue tester work.

If it does none of these, keep it out of HTML.
