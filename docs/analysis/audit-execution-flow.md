---
id: document.analysis.audit-execution-flow
class: DOCUMENT
domain: analysis
role: WORKFLOW
authority: CANONICAL
lifecycle: ACTIVE
---

# Audit Execution Flow

> Start from `master-selected-map-audit-workflow.md`. This document only projects the canonical audit onto player-flow order.

> **Player-flow projection only.** Ordered audit authority remains TARGET → DISCOVERY → UNDERSTAND → FORMALIZE → EVALUATE → PROVE → REPORT in the Mandatory Gameplay Audit Procedure. This document explains how checks are arranged around the player's journey; it does not own stage transitions.

## Core rule

Audit follows the player's game flow first. Technical domains are evidence providers inside that flow, not parallel checklists.

```text
Selected World
→ ENTRY / JOIN
→ READY / START
→ SETUP
→ ACTIVE GAMEPLAY
→ PROGRESSION
→ TERMINAL
→ CLEANUP / REPLAY
→ RECOVERY
→ PROVE
→ REPORT
```

A map may omit or merge stages, but every material stage that exists must be grounded from the selected artifact. Do not force a generic phase onto a game that does not contain it.

## 1. Target and discovery

Before entering the gameplay flow:

- pin one selected artifact/version;
- inventory gameplay-relevant sources;
- close unsupported/parse/reference residue;
- discover material gameplay surfaces;
- reconstruct the player journey.

Discovery must be COMPLETE before production continuation.

## 2. Flow-first audit

### ENTRY / JOIN

Establish how a player enters a playable session.

Check only applicable systems:

- spawn/lobby entry;
- join pads/triggers/forms;
- party membership;
- arena assignment;
- player-local versus shared membership state;
- queue/admission;
- player capacity;
- reconnect entering a valid session.

Typical contradictions:

- player joins wrong arena;
- offline/stale member remains counted;
- join path bypasses required state;
- visible capacity differs from actual admission;
- cross-arena assignment occurs.

### READY / START

Establish how a valid joined session becomes active.

Check:

- ready state;
- countdown;
- final membership revalidation;
- owner/leader authority;
- parallel arena starts;
- cutscene/cinematic ownership;
- input lock;
- start capacity and capacity+1;
- stale delayed start callbacks.

Typical contradictions:

- countdown continues after requirements disappear;
- one arena's start serializes another arena;
- old callback starts a reused arena;
- queue/fallback reduces player-visible concurrency below the arena capacity presented by the map; this remains a design/capacity issue even when the technical constraint is valid.

### SETUP

Establish everything that must be correct before gameplay begins.

Check:

- loadout/inventory/equipment;
- structures/world reset;
- teleports;
- player mode/state;
- objectives/score initialization;
- entity preparation;
- chunk/ticking-area acquisition;
- readiness before remote work;
- setup cleanup from previous run.

Typical contradictions:

- required item missing or duplicated;
- structure residue blocks a route;
- spawn logic starts before chunk readiness;
- stale score/tag survives into a new run.

### ACTIVE GAMEPLAY

Follow what the player and actors actually do.

Check applicable mechanics:

- combat;
- entity spawn/AI/target/navigation;
- spatial restrictions;
- interactions;
- build/break/use-item permissions;
- chunk/simulation residency;
- projectiles/effects;
- multiplayer authority/isolation;
- arena-local versus world-global mutation.

Typical contradictions:

- actor cannot reach objective;
- knocked player remains targetable;
- player can act outside intended region;
- remote entity stops simulating;
- Arena A mutates Arena B.

### PROGRESSION

Trace every required transition forward.

Use:

```text
Trigger
→ Condition
→ Tracker
→ Mutation
→ Completion
→ Transition
```

Check:

- wave/level/objective counters;
- kills/collections/checkpoints;
- rewards/score/currency;
- shop/upgrade effects;
- structure transitions;
- spawn success versus progression accounting;
- meaningful first/final/max boundaries.

Typical contradictions:

- failed spawn still advances wave;
- objective reaches zero but transition does not fire;
- purchase consumes currency without applying result;
- transition occurs before requirements are complete.

### TERMINAL

Resolve all ways a run can finish or be interrupted.

Check:

- victory;
- defeat;
- all-dead;
- timeout;
- objective completion;
- abort/admin stop;
- death/respawn interaction;
- one-time reward/result commit;
- simultaneous terminal conditions.

Required question:

```text
If two terminal conditions become true together,
which owner wins and how are losing callbacks invalidated?
```

Typical contradictions:

- victory and defeat both commit;
- reward happens twice;
- respawn occurs after terminal victory;
- cleanup begins before result ownership is settled.

### CLEANUP / REPLAY

Prove the run really returns to a reusable baseline.

Check:

- entities/projectiles/effects;
- inventory/loadout;
- score/tags/properties;
- ticking areas/leases;
- world/structure mutation;
- timers/callbacks;
- arena ownership/generation;
- reward/drop residue;
- second-run equivalence.

Required sequence:

```text
Run 1
→ Terminal
→ Cleanup
→ Baseline
→ Run 2
```

Typical contradictions:

- old entity survives;
- old callback mutates Run 2;
- arena is reused before old ownership expires;
- structure/state residue changes the second run.

### RECOVERY

Overlay recovery onto every stage where it can happen.

Check only applicable transitions:

- disconnect;
- reconnect;
- reload;
- player leave;
- owner disappearance;
- failed spawn;
- failed transition;
- retry.

Recovery is not a separate game. It returns to one of the normal flow stages or intentionally restarts the run.

Typical contradictions:

- reconnect restores only part of loadout/state;
- reload preserves state but loses required timer/actor;
- stale owner remains after disconnect;
- retry duplicates reward/progression state.

## 2.5 Full-map replica normalization

For maps with repeated arenas/regions, FORMALIZE inserts a replica-normalization step before deep per-scenario proof:

```text
World DB / topology
→ repeated-region detection
→ relative-coordinate normalization
→ canonical baseline
→ semantic delta extraction
→ world ↔ source/config reconciliation
```

The audit then follows player flow only for:

- the baseline behavior;
- material replica deltas;
- unresolved replica proof;
- cross-arena ownership/capacity behavior.

This prevents duplicated work while preserving arena-specific defects. A baseline PASS never suppresses a diverged or unproven replica.

## 3. Cross-system checks

Cross-system reasoning is attached to the flow stage where the systems meet.

Examples:

| Flow stage | Important intersections |
| --- | --- |
| ENTRY / JOIN | membership × arena assignment, queue × capacity |
| READY / START | countdown × party change, cutscene × multi-arena |
| SETUP | structure × teleport, loadout × reconnect, chunk × spawn |
| ACTIVE GAMEPLAY | entity × chunk, combat × inventory, arena × global state |
| PROGRESSION | spawn × wave counter, retry × reward, shop × inventory |
| TERMINAL | death × objective, timeout × victory, reward × cleanup |
| CLEANUP / REPLAY | cleanup × world mutation, callback × arena reuse |
| RECOVERY | reconnect × death, reload × timer, reconnect × inventory |

Do not brute-force every possible system pair.

## 3.5 Capability delivery crosscheck

For every player-facing feature/capacity, compare:

```text
what the game presents
vs
what implementation provides
vs
what is actually playable
```

Design failures and design–implementation mismatches must enter the same causal PROVE path as implementation bugs. They are not informational warnings.

## 4. Static-first proof

For every material flow stage:

```text
Gameplay purpose
→ Required components
→ Required knowledge/RIG
→ Causal links
→ Actual evidence
→ Contradiction / Proven / Detection Gap / Runtime Blocked
```

If a leaf scenario has selected-artifact components but no causal proof links, Scenario Closure remains OPEN because audit depth is suspiciously shallow.

## 5. Runtime residue

Runtime testing is allowed only when static/source proof is irreducible.

Output exactly one narrow question per blocked causal link.

Example:

```text
Stage: ACTIVE_GAMEPLAY
Scenario: remote wave
Question:
Does the spawned enemy remain simulated until it reaches the objective?
```

Do not emit a generic tester checklist.

## 6. Final proof

Only after the flow is fully accounted:

- resolve contradiction;
- search counter-proof;
- translate player-visible consequence;
- consolidate root cause;
- admit confirmed defects;
- generate report.

## Closure rules

- Discovery Closure must be COMPLETE.
- Gameplay Model Closure must be CLOSED.
- Scenario Closure OPEN blocks publication.
- Scenario Closure PARTIAL is allowed only for irreducible runtime proof.
- No flow stage may disappear merely because its technical implementation looks healthy.
- No technical domain becomes a bug without a player-flow consequence.

## Reporting order

Report issues in player-flow order:

1. Entry / Join
2. Ready / Start
3. Setup
4. Active Gameplay
5. Progression
6. Terminal
7. Cleanup / Replay
8. Recovery

This order is used for chat, HTML, DOCX, and tester reproduction presentation. Presentation never becomes audit authority.