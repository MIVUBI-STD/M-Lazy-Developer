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

## Discovery independence rule

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