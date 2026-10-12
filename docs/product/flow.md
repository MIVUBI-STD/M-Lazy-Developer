---
id: document.product.flow
class: DOCUMENT
domain: product
role: WORKFLOW
authority: CANONICAL
lifecycle: ACTIVE
---

# Product Flow

**Current operator: ChatGPT-native checker; no M-Lazy-Developer app has been built or verified.** The workflow below defines a reusable evidence-first analysis contract, not proof that TypeScript, a CLI, a UI, or Minecraft itself was run. ChatGPT can inspect selected artifact sources directly without executing repository software. Reserve `SelectedMapAuditRun` and engine-owned checkpoint/quality receipts for actual programmatic runs.

## Single source of truth

For gameplay audit, one exact selected `.mcworld` is the only current gameplay authority.

Historical QA, old map versions, Development/Source, changelogs, and external documents may support comparison/calibration only. They never silently define current Expected Behavior.

## One source-declared programmatic audit flow (optional; only if executed)

```text
Selected .mcworld
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

There is no parallel **implementation** of this TypeScript pipeline. ChatGPT's direct artifact analysis is the current operator workflow, not a second installed app or counterfeit programmatic audit; it must retain exact source evidence and report its actual proof ceiling.

The engine authority chain is:

```text
map-audit-pipeline
→ Mandatory Audit Procedure
→ ordered admission
→ scenario/RIG evidence
→ contradiction resolution
→ confirmed issue projection
→ BUG | DESIGN_MISMATCH
→ report/review
```

### Stage meaning

| Stage | Must answer before continuing |
|---|---|
| TARGET | Which exact artifact/version is current truth? |
| DISCOVERY | Are all gameplay-sensitive sources accounted and semantically owned? |
| UNDERSTAND | Is the player journey, state, ownership, progression and intent understood? |
| MODEL | Are material actors, spatial rules, multiplayer, boundaries and capability delivery modeled? |
| STRESS | Have recovery, concurrency, terminal, cleanup, second-run and required cross-system scenarios been challenged? |
| PROVE | Does each contradiction survive scoped counter-proof, or become runtime residue/detection gap? |
| REPORT | Is each confirmed root cause classified exactly once as `BUG` or `DESIGN_MISMATCH`? |

A blocked stage stops this same sequence. It does not create another workflow.

## Player-flow execution

Within those stages, checks follow the game:

```text
ENTRY / JOIN
→ READY / START
→ SETUP
→ ACTIVE GAMEPLAY
→ PROGRESSION
→ TERMINAL
→ CLEANUP / REPLAY
→ RECOVERY
```

Domain analyzers are evidence providers attached to the relevant player-flow stage.

## Issue types

### BUG

Use when intended behavior is grounded but implementation/runtime breaks it.

```text
expected gameplay contract
→ implementation/runtime contradiction
→ BUG
```

### DESIGN_MISMATCH

Use when the capability presented/authored by the game is materially different from actual playable/deliverable capability.

```text
presented capability
≠ playable capability
→ DESIGN_MISMATCH
```

A platform constraint, queue, fallback, or performance safeguard may explain root cause but does not erase the mismatch.

One root cause belongs to exactly one report lane.

## Fail-closed rule

The system must never translate uncertainty into PASS.

```text
source accounted but semantics missing
→ Detection Gap

semantic model incomplete
→ block UNDERSTAND/MODEL

cross-system scenario missing
→ block STRESS

counter-proof incomplete
→ block PROVE

irreducible Minecraft behavior
→ one narrow Runtime Proof request
```

“No issue found” is meaningful only when the ordered gates close.

## Audit-only use

```text
Selected .mcworld
→ runSelectedMapAudit()
→ resolve blocking stages / defect resolution
→ issueLanes.BUG + issueLanes.DESIGN_MISMATCH
→ STOP
```

## Audit + report

```text
closed audit
→ review confirmed root causes
→ BUG section
→ DESIGN_MISMATCH section
→ production Map Audit report
```

Bug Report V2 remains the persisted approved `BUG` lane. DESIGN_MISMATCH remains a separate Map Audit output lane.

## Repair

Repairs start from an approved issue, not from raw analyzer findings.

```text
Approved BUG or approved design change
+ Must Change
+ Must Preserve
→ mutation
→ targeted verification
→ preservation verification
→ Fix Verification Readiness
```

Fix Verification Readiness is a projection of the existing post-repair differential and preservation proof. It does not create a second repair workflow. Its terminal statuses are `VERIFIED_FIXED`, `NOT_FIXED`, `REGRESSION_FOUND`, or `CONFIRMATION_REQUIRED`.

## Final quality projections

After canonical REPORT projection, final assessments make result interpretation explicit without adding another audit path:

```text
closed canonical audit
→ Vital Gameplay Knowledge Closure
→ Information Integrity projection
→ Zero-Finding assessment when findings = 0
```

Vital Gameplay Knowledge Closure projects eight production-critical domains across the same canonical evidence: entry/admission, progression, multi-arena isolation, connection/recovery, inventory/player capability, world/reset integrity, score/result integrity, and player-facing information. Its detailed contract is in `../03-analysis/vital-gameplay-knowledge-closure.md`.

It never creates findings or advances audit stages. A domain may only be `UNDERSTOOD_PROVEN_SAFE` after the canonical audit itself is ready for review. Runtime residue remains `RUNTIME_REQUIRED`; semantic/capability uncertainty remains `DETECTION_GAP`.

Information Integrity crosschecks the canonical finding lanes for player-facing information contradictions. It may be `CLOSED_CLEAR`, `CLOSED_WITH_FINDINGS`, or `BLOCKED`; findings remain normal `BUG | DESIGN_MISMATCH` items and are never duplicated into a new issue lane.

Zero-Finding assessment applies only when both issue lanes are empty. `ELIGIBLE` requires closed canonical coverage, CLOSED gameplay closure, PASS honesty, zero Audit Obligations, and zero remaining validation groups. Otherwise the result is `NOT_ELIGIBLE`. This is an absence-confidence statement, never a claim that the map is universally bug-free.

A new map version restarts TARGET and Discovery. Prior findings are regression/calibration evidence only.