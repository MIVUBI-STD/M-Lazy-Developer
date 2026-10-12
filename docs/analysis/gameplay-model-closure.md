---
id: document.analysis.gameplay-model-closure
class: DOCUMENT
domain: analysis
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Gameplay Model Closure Contract

> **Supporting contract only.** This document defines UNDERSTAND/MODEL closure semantics inside the Mandatory Gameplay Audit Procedure. It does not own audit order, continuation, PASS, or report publication.

## Purpose

Gameplay Model Closure is the **understanding gate** after Gameplay Discovery Closure.

```text
Gameplay Discovery Closure
→ are relevant selected-artifact sources indexed and the surface inventory stable?

Gameplay Model Closure
→ are the discovered material surfaces understood enough to reason about?
```

Do not claim whole-map completeness while Discovery Closure is OPEN or PARTIAL. Scoped, evidence-backed contradiction analysis may continue once TARGET integrity is verified and Discovery is at least PARTIAL; unresolved sources and relationships remain explicit obligations.

The goal is not to prove every runtime outcome before auditing. The goal is to ensure every discovered gameplay-relevant surface is understood enough to reason about, or explicitly marked blocked/unknown.

## Discovery V1 product acceptance boundary

This is a **development STOP criterion**, not an alternative Map Audit publication
gate or a claim of Minecraft runtime success. Use the existing
`runSelectedMapAudit()` output and canonical Scenario Graph / Map Audit V2
navigation; do not introduce another state machine, dashboard, or graph owner.

- **A2 source accounted:** file coverage, parser failures, inactive/unlisted
  packs, and unresolved executable references are reported separately. A2
  COMPLETE does not assert gameplay comprehension.
- **A7 gameplay interpreted:** for each material *discovered* feature, present
  its exact source evidence, inferred or authored meaning, applicable
  source-behavior paths, and specific missing dimensions. A matched call edge
  identifies a *candidate* path to a downstream effect, never direct effect
  ownership, player activation, chronology, or execution success.
- **Coverage without fabrication:** unclassified material source operations,
  unresolved branches/targets, unplaced mechanics, truncated routes and
  unknown outcomes remain visible. No zero-gap or 100%-understanding claim
  can be inferred from a finite parser inventory.
- **One bounded acceptance batch:** reuse the existing selected-map
  production-entrypoint positive dialogue/function, animation/function,
  and ambiguous-function cases; then compare at least one Defense-like map
  and two contrasting real authored maps against independently known
  mechanics and intentional unknowns. Do not add a new runner, fixtures for
  each commit, or unbounded per-feature tests.
- **Stop and classify:** for each actual acceptance difference, assign the
  first incorrect canonical owner, or mark the claim `RUNTIME_REQUIRED`,
  `SOURCE_UNAVAILABLE`, or `UNRESOLVED_DESIGN` with the exact blocked
  behavior. Runtime-only uncertainty is not a mandate to extend static
  discovery indefinitely. Source-level work may be completed with executable
  or real-map acceptance explicitly `NOT EXECUTED`.

V1 development acceptance is achieved only once the bounded executable
production checks and the independently reviewed contrasting-map comparison
have evidence. It is not achieved by authoring tests, adding more analyzers,
or setting A2 COMPLETE. Map Audit report publication retains its existing
mandatory procedure and independent proof requirements.

## Core principle

Do not infer game design from implementation details alone.

Use this direction:

```text
Player-visible surface
→ gameplay purpose
→ expected contract
→ state / ownership / boundary rules
→ implementation
→ actual behavior
```

Not:

```text
implementation detail
→ assumed design
```

## Bounded production acceptance

The existing synthetic selected-map acceptance must exercise
`runSelectedMapAudit()` end to end for a resolved NPC command, a uniquely
resolved behavior-animation command and an ambiguous cross-pack function.
Each case must reconcile full physical inventory, relevant source records,
the strict `gameplayStructure` report projection, and the non-observed
runtime ceiling. A resolved reference may add `CALL_PATH_CONTEXT` to a
mechanic, but cannot prove its purpose or actual effect. An ambiguous
reference must stay unresolved without inheriting either target's effects.
The production acceptance is not a real-world multi-genre or Minecraft
runtime PASS; no new runner or sample-world asset is introduced.

## Understand → Model output contract

The existing Map Audit V2 `gameplayStructure` is one **derived** navigation
view over the canonical Intent, Semantic IR, Behavior Model and Scenario
Graph. Its strict output schema must preserve recognized mechanics, source
flows, authored relations, guarded transitions, journey candidates and
uninterpreted evidence without inventing a new graph or gameplay authority.

A feature label and parser evidence alone do not establish intended
player-facing purpose. If purpose is not independently grounded, report
`UNKNOWN` rather than manufacturing a generic game design statement.
`DIRECT_EFFECT_EVIDENCE` and `CALL_PATH_CONTEXT` remain distinct, and
authored paths remain `NOT_OBSERVED` until runtime evidence exists.

## Adaptive game-design hierarchy (one existing model, three views)

The operator needs a **source-backed navigable design**, not a flat list of recognized words or another checker. Render three coordinated perspectives over the **existing** Gameplay Intent / Semantic IR / Scenario Graph and selected-artifact evidence:

- **State and lifecycle view:** lobby/waiting, admission, loading, in-game, terminal, cleanup and recovery **only where represented in the selected artifact**. A state *edge* needs an authored guard, event, state transition or independent observation. Proximity, numbering or file naming is not a transition.
- **Content hierarchy view:** discovered mode/challenge → level/stage/round → wave/task/quest/room → entity/command/reward/interaction. Do not require any particular level; a puzzle, build challenge or multi-mode map may use different branches. Content nesting denotes source ownership/context, never automatic chronological causality.
- **Shared system and dependency view:** party/arena, inventory/shop/economy, combat/AI, scoring, permissions, structures, ticking/chunks and persistence are referenced where evidence connects them. Do not duplicate a global system beneath every level or invent a cross-system link because two assets share a name.

Each material node should carry its actual source identity; observed vs inferred vs unknown meaning; owner/scope; entry trigger; dependencies; authored operations/effects; completion/exit; feedback; and any unresolved dimension. Show only fields that have evidence, rather than filling a template with generic guesses. Multiple map styles are valid: `InGame → Stage → Wave + Quest`, `InGame → Challenge → Trial/Station → Task`, or `InGame → Round → Plot → Build/Score`.

The read-only `Map Audit --brief` may group **selected-artifact localization keys** such as `stage_2.guide`, `stage_2.task.1` and `stage_2.success` into a labelled content tree, preserving namespace, resource-pack path and line evidence. This proves only player-facing source labels; it cannot establish activation, ordering, quest completion, a wave, spawn count or live behavior. A generic HUD `level`/`wave` label or emoji does not create a numbered stage. **Wave/entity/coordinate and conditional data require direct script, entity, structure or world evidence** and must remain UNKNOWN where not extracted. The existing TypeScript script parser now has a narrowly scoped, source-only wave recipe producer for explicitly nested literal `stages/levels/rounds → mobs/waves → spawn` object arrays. It records the stage's original ID, wave number, configured threshold/delay, one source recipe per literal spawn object, static coordinates, expression-only unresolved identifiers and authored end commands; unsupported/spread entries stay incomplete. `InspectDirectoryResult.authoredWaveStages` carries these exact records through the sole inspection path to the existing `--brief` projection, without adding a new gameplay graph, audit lane, detector, or Map Audit V2 field. The script hierarchy must not be joined to locale-sourced stages or arena offsets by similar names alone. Spawns per recipe do not prove spawned entity counts, actual waves, navigation, wave completion or Minecraft runtime success. Shared states and transitions remain separate evidence-backed graph relations.

**Map-first content discrimination.** A real selected artifact may expose independent gameplay modes rather than an authored wave tree. The existing script parser therefore preserves direct, literal `gameplayId/gameplayName`, `modeId/modeName`, and `challengeId/challengeName` catalog declarations as source-local content candidates, with optional positive ordinal, exact pack/file location and selected-artifact identity. A minified bundle may repeat a canonical numbered declaration in a UI list; identical same-source id/name entries can be reduced to the numbered declaration without equating differently named or differently numbered modes. These are **not** gameplay execution, selectable mode availability or genre classification. `InspectDirectoryResult.authoredGameplayCatalog` follows the same canonical inspection path into the existing read-only brief. The wave recipe producer remains applicable only where a real nested wave configuration exists. If an inspected map has a gameplay catalog but no recognized wave tree, report **wave extraction unavailable/unknown**, never `NO WAVES` or `MAP UNDERSTANDING FAILED`.

A source-derived **content shape is not the game design itself**: correlate each source-authored label with events, state, Script API effects, structures, entity behavior and player-facing text before claiming the stage's purpose, chronology, actors or terminal conditions. A third, contrasting selected-artifact source style shows the boundary: a building/guessing game can keep a round prompt pool as literal sibling `{text, difficulty}` entries, with separate role, timer, plot and scoring code, and no wave tree at all. The existing script AST producer may preserve generic arrays of at least two explicit `prompt|word|text|label` fields paired with `difficulty|tier|category` literals as **source-authored content choices**; retain the exact array owner/file/source, each authored entry and category, and mark mixed dynamic/spread rows incomplete rather than erasing known choices. This is a structural source fact **only**. It does not assert that a choice is presented to the player, that the game uses a particular genre, that a round is playable, or that the difficulty/scoring code consumes that exact pool. Project these choices in the existing read-only `--brief` view, never as spawned wave/level nodes or a second model owner. The generalization target is to connect such choices through selected-script calls and state transitions to player roles, round selection, timer and score, using proof of the actual relationship rather than filename or variable name similarity.

The source graph now admits one **narrow exact dependency**, using the existing `GameplayIntentModel` nodes and `requires` edge: a directly exported immutable literal content collection (resource node) may be referenced by an actual named ESM import's `.filter/.find/.map/.some/.every/.forEach` call inside a uniquely resolved script in the same artifact and behavior pack (consumer-mechanic node). Each endpoint and edge carries precise selected-source location evidence; duplicate providers, shadowed symbols, unexported collections, historical artifacts, foreign packs and unresolved import targets cannot generate an edge. A call in a method is an **authored candidate source dependency**, not proof it executes or yields a level, phase, player role or score.

**Contextual state graph fidelity:** after a uniquely located imported content read, the existing source parser can retain direct property assignments authored later within the **same AST method**, including the exact left-hand target, source expression, branch conditions, and line/column. These are source-local observations only; a later assignment in text is not proof it will run, belongs to the same runtime player/arena, or depends on the selected content. Add these selected-source facts to the existing content-consumer Gameplay Intent node instead of creating a second state store. When an assignment's **exact source range** matches an already-owned Gameplay Intent state mutation, the same consumer may carry an inferred `participates-in` association to that canonical state subject—not an authored `transitions-to` relationship, not a successful state change, and not a second runtime implementation. Missing symbolic aliases, dynamic writes, scoring callbacks and cross-method control flow remain explicitly unresolved. Do not infer that a source assignment to `builderId` establishes a valid role or that a score update in another method was reached. The read-only Game Understanding brief presents this existing Intent edge; it does not create a second graph or alter BUG/REPORT decisions. For example, if an authored `GuessText` collection is imported and read inside a round-selection method, the graph may safely state that the source method requires that collection, while the subsequent difficulty filtering, role assignment, phase mutations, and scoring remain separate causal relationships to trace.

**Exact source-method call graph (no invented chronology).** The existing script parser and Semantic IR already record local `this.method()` calls with executable caller/target, branch guards, and exact locations. When a selected script has a positively resolved source-content consumer **or an exact literal state mutation within a unique method**, the **same** Gameplay Intent Graph may expose its uniquely declared source-method calls using the single matching resolved `synchronous-call` IR edge. Select the bounded two-hop source navigation neighborhood around those evidence-backed anchors, rather than assuming every source helper is part of the player journey. Both endpoints must have unique actual method declarations in the same script; ambiguous class names, duplicate methods, missing IR identity, foreign source/pack ownership, and unsupported calls do not authorize the relationship. This is an inferred `requires` source dependency, **not** confirmation of execution order, source-method intent or a game state transition. If a uniquely identified method contains a literal state write at an exact matching canonical Gameplay Intent state mutation site, reuse the existing state node with a separate inferred `participates-in` relationship, never fabricate a new authored transition. The read-only brief displays the method call graph, the guards at each callsite and the separate method-to-state assignment evidence. These records make a path such as `tick → activateRound` and `guess → addContribution` navigable where source explicitly declares the calls, while keeping `round countdown → playing → score settled` UNKNOWN until guards, dispatch, authoritative score writes and player/session scope are independently traced. Source-method navigation now also covers state-driven lifecycle modules that have no content reader. Exact callsite/source matching and unique declared method owners remain mandatory; when the source neighborhood exceeds the bounded projection, report an explicit UNDERSTAND unknown rather than silently asserting closure. Other map styles still require independent closure, not transfer from the current sample.

**Bounded source receiver identity chain.** The existing Script AST analyzer retains direct imported-class constructions passing `this` at an exact constructor position, uniquely declared `constructor(parameter) { this.field = parameter }` bindings without later field reassignment, and direct `this.field.method(this)` forwarding sites. The existing import resolver must uniquely resolve the constructed class in the **same behavior pack and selected artifact**, with one class method signature and stable receiving formal parameter. Only when those facts join may the existing Intent Graph carry an **inferred source-instance candidate**. The candidate may be forwarded through direct same-class `this.method(parameter)` arguments only when the exact call has one canonical resolved Semantic IR edge, the actual argument is the stable formal parameter, and the callee parameter is stable; cap propagation depth. For each final `game.method()` where `game` is that exact formal and the destination class has one declared target method, reuse the existing method subjects and add an inferred `requires` candidate edge with all selected-source witnesses. This is not a dynamic runtime binding, exclusive receiver ownership, actual command execution, successful result delivery or cause/effect relation. If the constructor field can be reassigned, class/import names are ambiguous, the receiver argument is dynamic, the source belongs to another pack/version, or a method is duplicated, **do not emit a target**. Do not infer that `game.say(game.matchSummary())` actually displayed the result; a candidate call target and delivered player-visible result are separate proof requirements. No map name is a feature switch.  

**Keyed session collection ownership.** The existing TypeScript parser also inspects direct class fields initialized exactly once with `this.field = new Map()` (only when the built-in `Map` is not shadowed and the field has no supported reassignment). It preserves exact selected-source `this.field.set(key, value)` and `this.field.get(key)` sites with their *original authored key expressions* and line/column evidence. A preceding same-block `const session = new ImportedClass(...)` used directly as the stored value may supply an additional source constructor candidate, not an independently proven gameplay instance. Method readers and writers reference one existing Gameplay Intent resource node for that exact map owner/field; the read-only `--brief` groups the authoring operations under it. **No edge may equate two different key expressions** (for example `a.id` and `this.membership(player.id)`), or assume a stored session, arena, player or post-reload instance has been retrieved. The existing Intent UNKNOWN channel must preserve the exact unresolved key/owner question with sources. This enhances the Design Graph's ownership story without creating another state store or checking whether a particular map works.

**Source graph trust and navigation.** Imported construction witnesses must not survive a shadowed import name (including a method formal or local binding), a nested ordinary function's unrelated `this`, a rewritten constructor formal, or a later computed `this["field"]`/dynamic field assignment. These source conditions can silently connect an unrelated object if ignored; deny the candidate rather than making a speculative edge. Conservative refusal only affects a candidate source identity, not the selected map's gameplay meaning.

The existing `--brief` can derive a **bounded source dependency tree** from already-owned `source-method-call:` and `source-instance-candidate:` Intent edges. Prefer source branches that include exact state write/property mutation evidence, show the authored state labels and source calls beneath their owner method, and distinguish candidate receiver edges in the tree. This view is a **navigation projection**, never another graph, player chronology, causal proof or confirmed match presentation. Rootless cycles and oversized views must be bounded; underlying canonical Semantic IR/Intent relations remain accessible independently.



**Receiver ownership and result presentation.** Calls such as `game.say(game.matchSummary())`, `game.standings()`, `game.resultFields()`, or `this.results.commit(record)` may appear inside a source-verified lifecycle method, but their receiver implementation is not the current class's uniquely identified local method. The canonical script parser therefore retains those exact non-`this.method()` source call sites and their lexical guards on the corresponding source method node. The operator brief must label their target unresolved; it cannot manufacture a cross-module source edge or assert the GUI/chat presentation was delivered or the result record committed. An exact source-owned local call `finish() → settleResult() → commitResult()` proves only source-side control-flow structure. Distinguish: terminal state assignment → final result construction → durable record commit → player-visible message → cleanup/recovery. Cross-object steps remain unanswered until receiver binding or runtime proof is available. Ranking state-bearing methods first in the brief is a navigation heuristic, not new inference authority.

**Direct property mutations on existing method graph nodes.** Ordinary JavaScript score changes (for example, `player.score += points`, `teamScores[key] += amount`, or `scores_by_difficulty[key] += points`) are not Minecraft scoreboard API calls and cannot be inferred from `addScore`/scoreboard methods. The existing script AST parser retains method-local property/element assignments `=`, `+=`, and `-=` with exact source ranges, operators, original RHS expressions and source guards. The canonical Gameplay Intent method-call navigation includes a bounded set of those selected-source facts **on the already-owned method node**, not in another scoring engine or new state graph. The operator brief displays the assignments as **SOURCE ONLY / NOT SETTLED RESULTS**. This distinguishes three independent claims: (1) a source assignment exists, (2) a guarded execution path actually changes the correctly scoped player/team resource, and (3) the authoritative settlement is displayed accurately to all relevant participants. Claim (1) never grants (2) or (3). For example, an authored `guess() → addContribution()` call, an assignment to `player.score`, and a separate `matchSummary() → standings()` call do NOT establish a complete `guesser → score → terminal presentation` player journey without the missing call, state, and ownership proofs. Negative evidence must keep these missing graph edges explicit, not connect them by nearby names or common source module.

Other map styles (building rounds, minigame stations, puzzles, exploration or no JavaScript) may still require further source-led interpretation. An unsupported configuration is a scoped UNDERSTAND gap, not a missing feature, a bug or permission to add a map-name-specific extractor.

Do not treat the tree as a new schema, source of truth, publication authority or justification for another validation layer. The acceptance question is whether a developer can navigate the actual game's phase/content tree down to source-grounded mechanics and distinguish a material missing relationship. Only after game-design closure may the same source model support bug classification.

---

## Contrasting selected-source content graph comparison (2026-10-12)

The Game Design Graph needs to preserve a source-owned content tree in the **canonical Gameplay Intent model**, not merely print separate source inventories in the read-only audit brief. A nested `stages → mobs/waves → spawn` configuration proves stage owns wave and wave owns source spawn recipes. A `gameplayId/gameplayName` record proves a selected-source gameplay catalogue entry, **not** that it owns an unrelated wave list. A source `GuessText` array proves pool → category → literal choice and **not** that any one choice is assigned to a player. The canonical `owns` edge is `inferred` in gameplay meaning and only attests to literal source nesting. It does **not** mean player phase activation, temporal sequencing, real mob spawning, puzzle completion or outcome.

**Content identity is not gameplay-state identity.** A design catalogue, configured stage, configured wave, recipe or wave-end command is a *source resource*, not evidence of an activated gameplay `game` or `phase`. Keep all such authored configuration subjects within the **existing canonical Intent model**, but give them the `resource` kind rather than promoting configuration identifiers into active `game`/`phase` subjects. This avoids creating unsupported scenario feature/activation questions from an authored catalogue or static wave definition. Genuine state nodes still require independently grounded mutations, guards or observations; source-only `owns` edges remain non-traversable as player chronology. Within a configured wave, preserve the original literal command entries under the wave, including authored delays, as *potential wave-end operations* — not a successful completion, command execution, state transition or reward. The main operator content graph should show the key configuration and source locator together at each material node; it must not require reconciling disjoint wave and mechanics lists to understand the authored hierarchy. Unsupported or excess end-command entries remain explicit `UNKNOWN` and cannot be silently omitted.

**Do not promote authored configuration into scenario proof workloads.** The Gameplay Intent Graph owns source-content resources (IDs containing `:authored-source:` or starting `resource:authored-content:`), with `owns` edges representing nested literal source. These are **not** the same as runtime resources (score, inventory, shop, state), and must not be counted as gameplay scenario components, generic preset resources, causal-neighborhood bridges, orphan-component defects or required knowledge tests. The existing gameplay-scenario owner must filter only these exact source-content identities while retaining genuine resource nodes and the complete content tree in canonical Intent and operator `--brief`. Otherwise a large authored configuration (e.g., 68 spawn recipes or 24 guess choices) can inflate scenario closure work without improving expected-behavior understanding, and spuriously label a static recipe a missing active mechanic. This boundary also prevents `owns` from becoming player chronology. No new graph or persistent content registry is justified.

**Operator coverage before detail.** The canonical Intent Graph already contains source-owned stage/wave/recipe trees; the operator `--brief` must not apply one global depth-first item budget that allows an early, spawn-heavy stage to hide later stage/level/mode roots. The current read-only projection first lists up to 64 independently sourced content roots in numeric source line order (never lexicographic `:100` before `:20`), with their direct child labels. It then allocates bounded detail separately across those roots and their children, showing exact omissions per branch and limiting nested recipe/choice samples without changing underlying graph ownership. Limits constrain the **text view**, not the source graph or authored inventory. Stage/Level 1–15 must remain discoverable whenever they are among these selected, supported roots, regardless of Stage 1 recipe density. This does not prove player progress, runtime wave count, or any mode/stage link. When authoring roots exceed the view's explicit cap, state the number omitted and retain the full graph as the authority. Acceptance still requires output from the selected artifact on the canonical production path; a static source review is not an end-to-end run.

Three independently inspected, read-only real artifact controls (ChatGPT local ZIP inspection, **not** an executed `runSelectedMapAudit()`):

| Selected Minecraft archive | SHA-256 | Concrete source content | Source-only navigation expectation |
|---|---|---|---|
| Fall of the Pillager L1 v1.1.0 | `6df1be2f50404a0b89c2fb08f4d90a4c02eb4d51123ff9c5e03e9860b99938b1` | `behavior_packs/offense-level-1_bp/scripts/main.js` has 4 authored stage configurations, 9 numbered wave configurations and 68 spawn-recipe objects. `resource_packs/offense-level-1_rp/texts/en_US.lang` separately has 17 stage guide/task/success entries | Four script stage roots, each with its actual numbered waves and nested authored recipes; locale cues remain separate until an exact dependency proves their ownership |
| The Circuit v1.0.2 | `19e2eb038b0b01fe756715c725df7e39d74e8cf2de8c45705d1897ea3ffb6151` | `behavior_packs/BP/scripts/chunks/chunk-Q3G2HLCJ.js` defines five named `gameplayId/gameplayName/gameplayNumber` challenge descriptors | Five distinct authored gameplay catalogue nodes; do not invent levels or waves from HUD terms, and do not turn a named catalogue into proven playable order |
| Build & Decode v1.1.3 | `6ccbaa4889749982131f4dc641598bc3ad0a1026e2c583a2e5994a1b60eaa7d0` | `behavior_packs/Build_Decode_BP/scripts/modules/guessthebuild/GuessTheBuildData.js` has 24 authored `GuessText` choices split into 8 Easy, 8 Medium and 8 Hard; other modules author role/session/state/scoring/finish methods | Source pool → category → individual choices, with separate evidence-backed method/state/score graph. No fabricated `Wave` path and no automatic pool→score causation |

**Product limit:** these are source comparison controls, not proof that the TypeScript repo parser, Intent graph, CLI, or Minecraft gameplay executed. Keep actual full selected-map design closure `PARTIAL` until the user-facing production output is observed, missing mode/round/state relations are resolved or explicitly bounded, and the contrasting source relationships remain correct. This comparison is evidence for the **same existing graph owner**, not a benchmark service, duplicate registry or second design model.

---

## Discovery independence rule

Game Reconstruction is one operator process with the ordered internal responsibilities
**RECOGNIZE → UNDERSTAND → MODEL**. First record the entire physical selected-map
inventory and one outcome for every gameplay-relevant source, before admitting
any gameplay-purpose claim. Non-source or unfamiliar assets remain in the full
physical inventory; parser failures and unsupported source types remain visible.

A2 Discovery Closure is decided by the physical inventory and Source Index
accounting plus unresolved executable/native references. Gameplay surfaces
created by Intent or Scenario Graph are supporting context only, never a
substitute for source records. A2 may be COMPLETE before any gameplay purpose
has been established: that uncertainty belongs to A7, not an assertion that
the map is empty. Likewise, an inferred game model cannot close A2 when
source files are unaccounted.

UNDERSTAND assigns evidence-grounded meaning or a specific unknown. MODEL
composes state and causal/scenario relationships without promoting source
execution candidates into observed player actions. The inventory remains
the source of truth for *what was present* throughout the process.

Surface discovery and gameplay understanding must be independent operations.

A source/surface is discovered from the selected artifact. A2 accounts its source disposition; A7 separately determines whether the gameplay model understands it or is blocked/unknown/not-applicable. A2 COMPLETE is not proof of indexed domain semantics. Every indexed semantic gap, unowned execution relationship and gameplay intent unknown remains an explicit A7 UNDERSTAND obligation.

Never construct the discovered-surface list from the already-accounted surface list. That would hide missing analysis by definition.

## Precondition — Gameplay Discovery Closure

Before Phase A is treated as complete for the whole selected map:

- relevant selected-artifact sources must be indexed;
- parser/index failures must be explicit;
- unresolved references must remain visible;
- Discovery Closure must be COMPLETE;
- relevant-source inventory must balance indexed files plus explicit parse failures;
- unresolved selected-artifact references must be zero.

Discovery Closure OPEN or PARTIAL still blocks whole-map closure and final publication. Explicitly inventoried but unsupported source files may be PARTIAL even though the source index's stricter `coverage.complete` flag is false; the balanced file-accounting contract is decisive, and parse failures or unaccounted files remain OPEN. A PARTIAL Discovery with a verified TARGET permits independent finding and obligation projections; it does not prove unknown mechanics, authorize a NOT_APPLICABLE classification by absence, or permit Bug Report promotion. OPEN still prevents these projections because source accounting is structurally incomplete. The mandatory audit procedure remains the sole publication authority.

## Phase A — Surface inventory

Before bug discovery, inventory all gameplay-relevant surfaces visible or consequential to the player.

Typical surfaces include:

- lobby / entry;
- join/ready/start mechanisms;
- arenas / regions / fronts / routes;
- objectives / flags / targets;
- levels / waves / checkpoints;
- enemies / NPC roles / abilities;
- items / kits / upgrades / shops;
- score / currency / rewards;
- death / downed / revive / respawn;
- retry / defeat / victory;
- queue / capacity / concurrency;
- UI / forms / indicators / feedback;
- cinematics / teleport / input locks;
- persistence / reconnect / reload;
- structures / world mutation / cleanup;
- reusable arena/session state.

A surface may be discovered from scripts, behavior/resource packs, structures, world data, scoreboards, tags, commands, UI, entities, or player-facing world elements.

## Phase B — Surface contract

For each discovered surface, record:

- what it is;
- why it exists;
- who can use or own it;
- when it is available;
- entry condition;
- active state;
- success/exit condition;
- failure/abort condition;
- reset rule;
- preserve/persistence rule;
- player-visible feedback;
- dependencies;
- relevant boundaries/limits;
- concurrent/coexisting systems.

If one of these cannot be grounded, record it as unknown rather than silently assuming normal behavior.

## Complete player-flow reconstruction

For every selected map, reconstruct the normal player experience as one continuous causal flow, not as disconnected subsystems.

Minimum flow:

```text
ENTRY / LOBBY
→ ADMISSION / READY
→ SESSION SETUP
→ ACTIVE ROUND / GAMEPLAY
→ ROUND COMPLETION
→ BETWEEN-ROUND TRANSITION
→ NEXT-ROUND ELIGIBILITY
→ TERMINAL DECISION
→ RESULT SETTLEMENT
→ RESULT PRESENTATION
→ CLEANUP / RETURN
→ REPLAY / RECOVERY
```

For every transition, distinguish:

```text
state decision
≠ state mutation
≠ player-facing message
≠ result settlement
≠ result presentation
≠ cleanup
```

A transition is not fully modeled merely because its state mutation succeeds. The model must also account for what the player is told before and after the decision.

### Transition-message ordering rule

Before publishing a forward-looking message such as:

- Next Round;
- Next Wave;
- Continue;
- Victory;
- Defeat;
- Returning to Lobby;

prove that the corresponding next state has already been selected or remains valid.

Canonical causal check:

```text
current state completes
→ decide actual next state
→ publish matching player-facing transition
→ execute transition
```

Flag this pattern for contradiction analysis:

```text
publish generic next-state message
→ later decide whether that next state exists
```

This pattern can create a player-facing DESIGN_MISMATCH even when gameplay state itself remains correct.

### Settlement/presentation separation

Result correctness and result presentation are separate contracts:

```text
terminal condition
→ settle authoritative result exactly once
→ present that settled result to the player
→ cleanup / return
```

A correct score/result commit does not prove that victory/defeat presentation is complete. Conversely, presentation must never recalculate or become a second result authority.

When the artifact contains an authored result surface (title, form, scoreboard, sound, cinematic, message) that is disconnected from the terminal flow, compare authored capability with actual reachable presentation before classification.

## Phase C — Gameplay state model

Build the complete major-state model, including:

- happy-path transitions;
- failure transitions;
- retry transitions;
- disconnect/reconnect;
- reload/recovery;
- player leave;
- simultaneous events;
- cleanup;
- second-run/reuse.

Every major state must have known or explicitly unresolved exits.

## Phase D — Rule closure

For each declared mechanic, prove the chain far enough to establish whether the mechanic actually exists:

```text
Declared
→ Reachable
→ Triggered
→ Consumed
→ Effect Applied
→ Player-visible result
```

A label, tag, config value, entity variant, item name, or comment is not proof that the mechanic works.

## Phase E — Boundary extraction

Extract material numeric or discrete limits, for example:

- arena count;
- concurrent arena count;
- party size;
- retry count;
- level count;
- wave count;
- timer values;
- front/route count;
- score/reward thresholds.

For applicable limits, reason about:

```text
0
1
max-1
max
max+1
```

Use only meaningful cases; do not generate wasteful tests where a boundary is irrelevant.

## Phase F — Coexistence model

Record systems that can be active at the same time or invalidate one another.

Use the cross-system interaction audit for high-risk pairs.

## Closure states

Each gameplay surface must end as one of:

- understood;
- blocked;
- unknown/detection-gap;
- not-applicable.

No discovered surface may disappear from accounting.

## Closure gate

Gameplay model status is:

- CLOSED — every discovered surface is accounted for and all material core mechanics are understood enough to begin contradiction analysis;
- PARTIAL — all surfaces are accounted for, but one or more material surfaces are blocked/unknown;
- OPEN — discovered surfaces remain unaccounted or the player journey/state model is incomplete.

### Bug-discovery rule

- CLOSED: production contradiction analysis may begin.
- PARTIAL: production continuation is blocked because material gameplay semantics remain blocked, unknown, or incomplete. Resolve the model first.
- OPEN: production continuation is blocked because discovery accounting or the player journey/state model is incomplete.

Runtime-only residue belongs to Gameplay Scenario Closure, not Gameplay Model Closure.

## Anti-false-confidence rules

- No evidence of a bug is not evidence of correctness.
- Existing code is not proof of intended design.
- Existing queue/limit/configuration is not proof that the limitation is intended.
- A successful happy path is not proof that alternate paths are safe.
- A mechanic name is not proof that its effect is implemented.
- Physical availability is not proof of concurrent playability.
- Unknown must never be converted into Designed Behavior without grounding.

## Game-design closure checklist

Before MODEL/STRESS may rely on the reconstructed gameplay contract, the selected artifact must account for:

- gameplay surfaces;
- objective;
- win and lose conditions;
- player-flow stages;
- state transitions;
- failure/retry/recovery transitions;
- reset and preserve rules;
- progression/level rules;
- enemy/content contracts;
- multiplayer rules;
- multi-arena rules where applicable;
- capacity/concurrency/queue semantics where applicable;
- material boundaries;
- player-visible expectations;
- high-risk coexisting systems.

This is a closure condition, not an independent manual checklist. Unknown material items keep Gameplay Model Closure open.