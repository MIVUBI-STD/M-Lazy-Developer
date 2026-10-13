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

## Primary outcome — understand the map and report deviations

The product succeeds when a reviewer can explain **what the selected map is designed to do**, identify **where its implementation conflicts with that design**, and give the developer **actionable, source-grounded findings**. The number of checkers, passed validation gates, graph edges, diagnostic candidates, or tests is not a measure of that success.

The useful operator-facing result, whether from a bounded ChatGPT source review or a genuinely executed programmatic audit, has three parts drawn from the same selected-artifact evidence:

1. **Map design / gameplay blueprint:** player objective; entry → setup → main mechanics → progression → victory/failure → cleanup/replay; arena/player ownership; and only material systems actually present in the map. For each claimed mechanic, distinguish authored facts from inferred purpose and unknown runtime behavior.
2. **Deviations / actionable findings:** expected behavior justified by the selected source or an explicitly approved design; the contradictory implementation or observed behavior; causal consequence; exact source/area; counter-evidence considered; `BUG` versus `DESIGN_MISMATCH`; `PROVEN` versus `NEED_VALIDATION`. Never turn a missing file, generic diagnostic, old QA item, or heuristic alone into a gameplay bug.
3. **Precise remaining questions:** only material unknowns affecting game understanding or a candidate finding, with the smallest deciding source/runtime observation. An unresolved question is not a defect and is not a reason to hide independently supported findings.

A partial source review may already give this useful **scoped** design-and-deviation assessment; it must name incomplete surfaces and must not be presented as a closed production Map Audit Report. The canonical final REPORT still obeys the existing evidence/admission rules. Do not defer all practical map understanding until every unrelated checker or possible test is finished.

Technical domains (entity, scoreboard, Script API, ticking, NBT, structures, inventory, permissions, concurrency) serve the reconstructed player journey. They are not independent feature quotas. An unfamiliar mechanic remains valid even if no pre-existing category covers it.

## One source-declared programmatic audit flow (optional; only if executed)

```text
Selected .mcworld
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ FORMALIZE
→ EVALUATE
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
| FORMALIZE | Are the evidenced actors, states, ownership, boundaries and gameplay contracts made explicit without inventing intended behavior? |
| EVALUATE | Have applicable normal behavior, boundaries, recovery, concurrency and cross-system conditions been evaluated for contradictions? |
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
→ block UNDERSTAND/FORMALIZE

cross-system scenario missing
→ block EVALUATE

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