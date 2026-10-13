---
id: document.analysis.vital-gameplay-knowledge-closure
class: DOCUMENT
domain: analysis
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Vital Gameplay Knowledge Closure

## Purpose

Vital Gameplay Knowledge Closure is a **projection of the canonical selected-map audit**, not a second audit workflow.

Its purpose is to answer one production question:

> Does every gameplay mechanism capable of making the game unplayable, corrupting state/results, crossing arena/session ownership, or misleading the player have an explicit terminal disposition?

It consumes the same selected-artifact evidence, gameplay model, causal findings, Audit Obligations, and runtime residues already owned by:

```text
runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ FORMALIZE
→ EVALUATE
→ PROVE
→ REPORT
```

It must never create a parallel entrypoint, issue lane, state machine, or proof authority.

## Vital domains

Exactly eight domains are projected:

1. `ENTRY_ADMISSION`
2. `GAME_STATE_PROGRESSION`
3. `MULTI_ARENA_ISOLATION`
4. `CONNECTION_RECOVERY`
5. `INVENTORY_PLAYER_CAPABILITY`
6. `WORLD_RESET_INTEGRITY`
7. `SCORE_RESULT_INTEGRITY`
8. `PLAYER_FACING_INFORMATION`

`MULTI_ARENA_ISOLATION` may be `NOT_APPLICABLE` only when the selected artifact does not expose a multi-arena gameplay surface. The other domains are treated as vital production questions and cannot be dismissed merely because no detector fired.

## Five ownership questions

For every vital domain, the canonical audit must be able to answer:

```text
1. What is the source of truth?
2. Who owns mutation?
3. When can ownership change?
4. What happens on interruption?
5. What must be restored, cleared, persisted, or explicitly preserved afterward?
```

An unanswered material ownership question remains an Audit Obligation or Detection Gap. Absence of a finding is not an answer.

## Scenario dimensions

Every applicable vital domain is pressured across the same six dimensions:

```text
HAPPY_PATH
FAILURE_PATH
DISCONNECT_RECOVERY
REUSE_SECOND_RUN
CONCURRENT_INTERLEAVING
BOUNDARY_CAPACITY
```

These are coverage dimensions, not six independent test suites. Existing scenario reduction, pairwise coverage, formal proof, counter-proof, and proof substitution rules still apply.

## Invariants

### ENTRY_ADMISSION

- one player has at most one authoritative active admission/session owner;
- capacity, team/role assignment, and start eligibility are revalidated at the commit boundary.

### GAME_STATE_PROGRESSION

- every material phase/objective has a reachable success, failure, retry/recovery, and terminal disposition;
- stale transitions cannot advance a newer gameplay generation.

### MULTI_ARENA_ISOLATION

- one arena/session/generation cannot mutate another arena/session/generation;
- declared concurrency must be deliverable by the selected artifact and platform resource limits.

### CONNECTION_RECOVERY

- disconnect/reconnect resolves to exactly one authoritative session disposition;
- expiry, reconnect, reload, and arena migration cannot create duplicate or stale ownership.

### INVENTORY_PLAYER_CAPABILITY

- every player-acquirable capability with gameplay effect has authorization and lifecycle ownership;
- managed inventory, equipment, role, and temporary capability state is restored or cleared exactly once.

### WORLD_RESET_INTEGRITY

- every gameplay-significant mutation has reset, persistence, or explicit preservation ownership;
- run N+1 cannot inherit unintended mutable world/entity state from run N.

### SCORE_RESULT_INTEGRITY

- displayed and persisted score/result describe the same terminal outcome;
- winner/reward/result commits are eligible, conserved, and exactly once.

### PLAYER_FACING_INFORMATION

- instructions, limits, capacity, state, timer, score, and result match actual playable/deliverable behavior.

## Domain statuses

Only these statuses are allowed:

| Status | Meaning |
|---|---|
| `UNDERSTOOD_PROVEN_SAFE` | Canonical audit is closed and no contradiction or unresolved residue remains in the domain. |
| `UNDERSTOOD_WITH_FINDING` | The domain is understood and one or more canonical BUG/DESIGN_MISMATCH findings remain visible. |
| `RUNTIME_REQUIRED` | Static/package proof is exhausted and one bounded runtime-owned deciding fact remains. |
| `DETECTION_GAP` | Material evidence, semantics, capability, or canonical closure is insufficient. |
| `NOT_APPLICABLE` | Positive selected-artifact evidence proves the domain is not applicable. |

Do not add confidence percentages, generic `CHECKED`, `PASS?`, or `probably safe` states.

## Criticality

Vital domains are prioritized by impact:

### Tier 0 — game-killing

- entry/admission;
- core progression;
- multi-arena isolation;
- connection/recovery.

A contradiction here is the first place to search for Blocker impact: cannot start, cannot finish, cross-arena corruption, duplicated ownership, unusable multiplayer/session flow, or unrecoverable state.

### Tier 1 — game integrity

- inventory/player capability;
- world/reset integrity;
- score/result integrity.

Typical impact is Major, but these can become Blocker when they prevent completion or corrupt all sessions/arenas.

### Tier 2 — player experience/information

- player-facing information.

Severity remains impact-derived. Tier does not automatically assign Blocker/Major/Minor.

## Fail-closed rule

Vital Closure may say `UNDERSTOOD_PROVEN_SAFE` only after the canonical selected-map audit is `READY_FOR_REVIEW`.

If the canonical audit is blocked, absence of a domain finding becomes `DETECTION_GAP`, not SAFE.

If material residue cannot be routed to a vital domain, the overall Vital Gameplay Closure remains `OPEN` through `unroutedResidueIds`.

## Findings and runtime residue

Vital Closure does not create findings.

```text
canonical causal finding
→ BUG | DESIGN_MISMATCH
→ projected into one or more vital domains
```

Likewise, runtime residue stays a canonical Audit Obligation:

```text
RUNTIME_BLOCKED causal dependency
→ Audit Obligation
→ mapped to vital domain
→ RUNTIME_REQUIRED
```

A domain may contain existing findings and still remain `RUNTIME_REQUIRED` or `DETECTION_GAP` when additional material uncertainty remains.

## Production closure

Vital Gameplay Closure is `CLOSED` only when every applicable vital domain has a terminal disposition:

```text
UNDERSTOOD_PROVEN_SAFE
UNDERSTOOD_WITH_FINDING
NOT_APPLICABLE
```

It is `OPEN` when any domain is:

```text
RUNTIME_REQUIRED
DETECTION_GAP
```

or when material residue cannot be routed safely.

`CLOSED` does **not** mean bug-free. It means there is no vital mechanic whose knowledge state is hidden or ambiguous.

## Architecture rule

Do not add another analyzer, manager, state machine, or report lane merely to improve Vital Closure.

A new implementation mechanism is justified only by:

1. a concrete selected-artifact Detection Gap; or
2. a repeated production bottleneck that cannot be represented by the existing audit graph.

Otherwise improve the earliest existing owner that failed.

## Stop rule

The target is not “know every theoretically possible Minecraft event.”

The target is:

> **No vital gameplay mechanic has an unknown status.**

Once every vital domain is terminal and all remaining findings are explicit, stop architecture expansion and move to issue repair, bounded runtime confirmation where required, and Fix Verification Readiness.