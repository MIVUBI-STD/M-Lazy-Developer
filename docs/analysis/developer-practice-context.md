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
2. **Compare snapshots.** The JSON `sourceSnapshot.archiveSha256` signals
   whether the archive changed. Compare `sourceFiles[].sha256` for all
   **16 active SKILL.md**, and `deferredSources[].sha256` for **15 pending
   notes, 4 research documents and the feedback README**. Added, removed
   or changed files are reviewed separately; change outside these 36 tracked
   files still requires inspecting the new archive's full inventory before
   calling an update complete. Untracked referenced examples/scripts can
   change independently of `SKILL.md` and must NOT be assumed stable.
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
5. **Invalidate conservatively.** Source changed + no review means its
   dependent patterns must move back to `PROVISIONAL`, not continue with
   `SOURCE_REVIEWED` based on an old digest. A source file disappearing
   does not imply a negative gameplay assertion; retain superseded meaning
   in Git history. New pending/research material stays NOT_ELIGIBLE until
   individually reviewed. Publish updated ZIP/source fingerprints together
   with the affected reviewed records; do not silently preserve old claims.
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

A bounded operator decision should select **at most two** relevant patterns
only when the selected-artifact evidence raises a specific question.
`sourceSignals[]` are *search cues*, not exact source observations: symbol
matches, filenames and similar words cannot by themselves establish an
execution path, state owner, mechanic or design contract. Each selected
record must preserve `id`, `sourceId`, `status`, archive SHA,
`question`, `negativeControl`, `versionApplicability` and
`prohibits`. The operator must explicitly compare it against the
selected map's source evidence and possible counterexamples.

The ordinary source audit works as before when this reference is missing,
provisional, workflow-only, unrelated or inapplicable. The JSON never
auto-authors gameplay edges, closures, defect findings or player rules.
A context compiler may pass selected reference text only with
`authority=REFERENCE` and original record/source ID. No silent retrieval
injection or ungrounded positive classification.

## Available semantic cues and intentionally excluded material

The JSON inventories **all 16 active skill documents**. **13**
are individually normalized as **13 source-reviewed, noncanonical hints**:
forms, entity lifecycle, state storage, game time, teleport, coordinates,
version targeting, debug logging, **entity damage policy**, **HUD lifecycle**,
**sound feedback**, **localized text/glyph**, and **performance instrumentation**.
Some are team-preference hints, not platform/genre-neutral best practices.

The other three skills (`bedrock-git-workflow`, `bedrock-testing-policy`,
`bedrock-skill-feedback`) are explicitly
`DEVELOPMENT_WORKFLOW_ONLY`. Their fingerprints are tracked for incremental
updates but they **must not** participate in map-design reference selection.

| Observed selected-map question | One candidate reference | Counter-reading always kept |
|---|---|---|
| Entity JSON damage policy versus team/arena-controlled damage | `developer.hint.entity.damage-owner` | Static JSON behavior may be intentional and complete |
| HUD/action bar during session or phase transition | `developer.hint.hud.message-owner` | Command-driven or multiple scoped HUD owners may be valid |
| Sound on round start, win or reset | `developer.hint.sound.feedback-vs-outcome` | A sound call neither proves success nor audible delivery |
| Translation key or name tag appears to describe a task | `developer.hint.text.localization-vs-design` | Display text is not an independently approved outcome contract |
| Repeated entity queries or tick scheduling | `developer.hint.profiler.source-hotspots` | Static hot spots do not prove measured lag |

Every hint has an original source, `negativeControl`, `prohibits`, and
explicit version uncertainty. The goal is **fewer fabricated conclusions**,
not more graph nodes. `deferredSources` tracks pending/research material
without admitting it as live semantic hints; old source archive surveys,
reference code and untracked ZIP content still require targeted review.
A future ZIP is expected to evolve.

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

This curated snapshot makes **all active skills discoverable and
fingerprinted**, **13 interpretation records selectable** through the
existing ChatGPT-native source evidence workflow, and **20 pending/research/
feedback source documents** traceable for future comparison. The other ZIP
contents (code examples, assets, checkers, archive/history) remain in the
external original source and are not claimed fully ingested.

This is **not automatic ZIP ingest** and does not execute a repository
TypeScript retrieval consumer or any selected-map audit. At the next
updated ZIP, compare digests and affected stable record IDs. Automatic
interpretation-rule injection is intentionally not implemented; a full
selected-world pipeline acceptance remains an independent requirement.
