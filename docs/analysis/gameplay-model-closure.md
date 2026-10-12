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

A source-derived **content shape is not the game design itself**: correlate each source-authored label with events, state, Script API effects, structures, entity behavior and player-facing text before claiming the stage's purpose, chronology, actors or terminal conditions. Other map styles (building rounds, minigame stations, puzzles, exploration or no JavaScript) may still require further source-led interpretation. An unsupported configuration is a scoped UNDERSTAND gap, not a missing feature, a bug or permission to add a map-name-specific extractor.

Do not treat the tree as a new schema, source of truth, publication authority or justification for another validation layer. The acceptance question is whether a developer can navigate the actual game's phase/content tree down to source-grounded mechanics and distinguish a material missing relationship. Only after game-design closure may the same source model support bug classification.

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