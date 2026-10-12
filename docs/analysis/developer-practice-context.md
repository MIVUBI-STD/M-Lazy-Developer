---
id: document.analysis.developer-practice-context
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: REFERENCE
lifecycle: ACTIVE
---

# Developer-Practice Knowledge for Gameplay Interpretation

**Reference, not map authority.** This is the one routed interpretation surface
for evolving map-developer experience from the user-supplied
`minecraft-bedrock-agent-skills-main.zip`. It supplements **investigation**
during UNDERSTAND without creating a gameplay contract, runtime fact, defect
finding, installed agent skill, or new analyzer.

**Machine-readable candidate data:** [Developer practice signals](./developer-practice-signals.json)
(`docs/analysis/developer-practice-signals.json`).
**Original source inventory/provenance:** [ZIP reference](../examples/bedrock-developer-agent-skills-reference.md).
Stable document identity is this frontmatter `id`; update in place.

## Why this is separate from the other knowledge owners

- **Source ZIP**: developer statements, example code, prior project surveys,
  historical variants, pending research and feedback. It can change.
- **This REFERENCE**: normalized, narrowly scoped interpretation
  *questions*, expected source cues and counterexamples. Each record keeps
  the ZIP source path, stable record ID and status.
- **Platform Knowledge** `engine/knowledge/`: verified, edition/version-
  applicable Minecraft facts, NOT developer preferences. No automatic
  promotion of these records.
- **Game Design** `engine/design/`, `game-design-spec/`: map-/mode-scoped
  authored or approved intent, NOT generated from a general developer skill.
- **Selected artifact evidence**: the only authority for the game currently
  audited. Gameplay Intent and Scenario Graph must follow actual source
  and player-facing cues, and preserve UNKNOWN where purpose is unresolved.

The machine JSON is an explicitly linked **data companion** to this routed
reference document, not a second knowledge system, independent Source Catalog,
new Resource Catalog class, or a source of platform truth. The existing
repository Resource Catalog indexes this Markdown document; its H2/H3 sections
are navigable with the existing section-level retrieval.

## Intake on every new developer ZIP (review before publication)

1. **Acquire safely.** Treat archive entries as untrusted data. Inventory
   relative filenames, reject unsafe/absolute/traversal paths, cap pathological
   size/entry expansion, do not run `SKILL.md`, installers, checkers, or
   code samples. Record archive SHA-256 and exact file counts.
2. **Compare snapshots.** The JSON `sourceSnapshot.archiveSha256` decides
   whether the archive changed; compare `sourceFiles[].sha256` to locate
   changed active skill material. A file added, removed or changed outside
   the indexed subset is *not presumed irrelevant*: inspect changed/pending/
   reference paths before claiming no semantic change. Existing data covers
   **8 curated patterns from 8 active skills**, not the entire 149-file ZIP.
3. **Normalize into existing IDs.** Update `patterns[].id` in place when
   the meaning is the same; preserve original source path, source-file SHA,
   exact heading, question, candidate relations, applicability and negative
   control. New meaning gets a new stable ID. Never fork `v2`/`final`
   registries or merge similar phrases across different claims blindly.
4. **Adjudicate provenance.** Distinguish active developer-authored skills
   from `research/`, `pending/`, feedback and old agent-authored surveys.
   Historic project surveys support hypothesis generation only, not
   developer-approved specifications. Conflicting facts remain separate
   until scope and edition/version are resolved.
5. **Invalidate conservatively.** Source changed + no review = return that
   pattern to PROVISIONAL / REVIEW REQUIRED. A source file disappearing does
   not automatically erase history or produce a negative gameplay assertion.
   Publish an updated ZIP source fingerprint and reviewed records together.
6. **Do not copy the raw archive** into the GitHub source without origin,
   permission, license and security checks. Git history preserves prior
   normalized records and their update decisions; keep the original ZIP with
   the user for future source-level comparison.

## Usage in the existing selected-map audit flow

No new audit stage or engine authority is introduced.

| Existing stage | Appropriate use | Forbidden shortcut |
|---|---|---|
| TARGET | Identify edition, version, map/mode/arena scope from selected artifact | Adopt versions or preferences from ZIP |
| DISCOVERY | Parse selected source and collect exact call/command/effect IDs | Treat a reference pattern as proof a mechanic exists |
| UNDERSTAND | **Only if source evidence raises a relevant semantic question**, retrieve up to a few matching records and formulate alternative explanations | Fill missing objectives, phase order, win/loss or recovery from the ZIP |
| MODEL | Trace the candidate relation against IR, state owner, lifecycle, actual code and design signals | Turn a matched API name or broad trace into causal ownership |
| STRESS / PROVE | Use negative controls to challenge false assumptions; require the usual selected-map contract and proof for any bug | Promote a team's engineering preference into BUG or DESIGN_MISMATCH |
| REPORT | Attribute the exact ZIP-origin hint if useful for unresolved investigation, and distinguish it from current-map evidence | Count advisory reference citations as verified code or runtime proof |

A short **conditional** retrieval pattern:
```text
selected-map source evidence
  → precise question (e.g. UI callback + phase change)
  → docs/analysis/developer-practice-context.md
  → matched developer-practice-signals.json record ID
  → source origin / confidence / edition version / negative control
  → independent selected-map source/Design check
  → optional investigation hint, or UNKNOWN
```

The ordinary source audit works exactly as before when the reference is
missing, a pattern is provisional, or a record does not apply. The JSON
does not auto-author gameplay edges, closures, defect findings, or player
rules. A context compiler may pass selected reference text only with
`authority=REFERENCE` and original record/source ID. No silent retrieval
injection or ungrounded positive classification.

## How to interpret the initial records

The initial JSON has eight narrowly scoped records:

- **UI form session**: stale response and cancel/close as possible
  session/phase guards.
- **Entity lifecycle**: combat death versus explicit remove/despawn.
- **State storage**: dynamic properties, technical scoreboards and state
  lifetime/ownership.
- **Gameplay time**: tick-based versus wall-clock design hypothesis.
- **Teleport transitions**: possible UI close/camera effects.
- **Coordinates**: entity positions versus block/region coordinates.
- **API version**: selected manifest and target must govern compatibility.
- **Observability**: developer diagnostic logging versus player-facing UI.

Each record has a `negativeControl` and a `prohibits` guard. Those
constraints are as important as its `candidateRelations`: the goal is
**fewer invented conclusions**, not more graph nodes.

**Not yet represented:** the other eight active skill topics, their
`references/` implementation files, fifteen pending notes, and legacy
project surveys require individual review before producing any additional
candidate record. The source ZIP is incomplete and expected to change.

## Maturity and promotion

The JSON records start at `SOURCE_REVIEWED`: the source claim was inspected,
not externally verified and not validated on an arbitrary real map.
`CORROBORATED` means bounded, independently reviewed applicability only;
even such a record remains `REFERENCE`, not an approved map-specific rule.
`SUPERSEDED` applies after a reviewed replacement. These are *reference
review labels*, not A2/A7 proof or issue statuses.

Promote only a truly independent Minecraft platform fact into its existing
canonical domain with edition/Script API provenance and a real consumer.
Promote a map-specific expected behavior only with approved map-/mode-
scoped intent or sufficient authored evidence from the selected version;
never because this ZIP says the pattern is preferred.

## Acceptance / evidence ceiling

This initial change makes records **structured, versioned, routed and
manually retrievable inside the existing ChatGPT-native audit workflow**.
It does not implement or execute automatic ingestion of future ZIPs,
automatic interpretation-rule injection, or a runnable TypeScript pipeline.
At the next updated ZIP, comparing the SHA-256 and stable pattern IDs will
demonstrate incremental source processing. A full selected-world pipeline
acceptance is a separate proof requirement.
