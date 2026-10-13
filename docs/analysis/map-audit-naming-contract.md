---
id: document.analysis.map-audit-naming-contract
class: DOCUMENT
domain: analysis
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Map Audit Naming Contract

## Purpose

One concept must have one public name across source, schema, docs, report, and tester output.

## Canonical public terms

| Concept | Canonical name | Do not introduce as alternate public status/name |
| --- | --- | --- |
| Proven issue | `PROVEN` | confirmed, ready, source-grounded |
| Material unresolved issue | `NEED_VALIDATION` | ambiguous, runtime-blocked, detection-gap |
| Issue class | `BUG` / `DESIGN_MISMATCH` | defect-type variants |
| Primary taxonomy | `failureDomain` | category |
| Cross-system taxonomy | `contributingDomains[]` | secondary categories |
| Missing deciding evidence | `missingProof` | missingEvidence, unresolvedProof |
| Why unresolved | `validationReason` | ambiguityReason |
| Exact tester action | `validationTest` | testerObligation, runtimeChecklist |
| Validation consolidation | `validationGroupKey` | testBucket |
| Proof route | `proofNavigation` | resolutionPlan |
| No-hidden gate | `honesty` | completenessCheck |
| Consolidated runtime/manual tests | `validationTests` | testerTasks |
| Historical search influence | `historyPressure` | historicalRiskScore |
| Family-specific proof guidance | `familyProofCriteria` | proofChecklist |
| Unresolved audit/model/proof work that is not yet a gameplay finding | `Audit Obligation` / `auditObligations[]` | bug, issue, third issue type |

Internal resolver states such as RUNTIME_PROOF_REQUIRED, DETECTION_GAP, COUNTERPROOF_SEARCH_REQUIRED, and GAMEPLAY_TRANSLATION_REQUIRED are not gameplay findings by themselves. They project to `Audit Obligation` until causal/player-visible defect proof is sufficient. A `NEED_VALIDATION` finding is reserved for a confirmation-ready defect whose gameplay translation and counter-proof are already established but whose minimum proof saturation is still incomplete.

`Audit Obligation` is not a third issue type and has no severity. It exists outside `BUG | DESIGN_MISMATCH` until causal classification is justified.

## Report naming

Use these names consistently:

- `Map Audit Report` — human-facing complete finding set; includes PROVEN and NEED_VALIDATION across BUG and DESIGN_MISMATCH.
- `Approved Bug Report V2` — downstream approved PROVEN BUG ledger only.
- `evidenceRoute` — conceptual name for static/runtime/tester evidence origin. It is not an audit workflow lane.

Never call static/runtime/tester separate audit routes.

## Canonical flow names

Use these stage names exactly:

```text
TARGET
DISCOVERY
UNDERSTAND
FORMALIZE
EVALUATE
PROVE
REPORT
```

- `FORMALIZE` means make evidence-backed gameplay state, actor, ownership, spatial constraints and expected/actual contracts explicit. It does not create a parallel model owner or new game-design specification.
- `EVALUATE` means investigate the applicable contracts across ordinary and adverse conditions to find possible contradictions. Stress testing is a method inside EVALUATE, never a separate canonical stage.
- `PROVE` decides whether a candidate survives reachability, consequence and counter-proof checks before entering the published issue lanes.

Source identifier `MODEL` or `STRESS` may appear in historical commits or in genuinely unrelated domain data, but must not remain as an active `SelectedMapAuditStage` value or alternate name. No silent stage alias or stage-value fallback is authorized.

Player-flow names:

```text
ENTRY_JOIN
READY_START
SETUP
ACTIVE_GAMEPLAY
PROGRESSION
TERMINAL
CLEANUP_REPLAY
RECOVERY
```

## Canonical role names

Use these names when the role distinction is material:

| Canonical role | Meaning |
| --- | --- |
| `Player` | ordinary gameplay participant |
| `Builder` | gameplay role intentionally granted build capability |
| `Roommaster / Operator` | operational role that can control a live session but is not automatically unrestricted world-maintenance authority |
| `Developer / Maintenance` | explicitly authorized engineering/maintenance role for destructive or diagnostic operations |

Do not silently use `admin`, `host`, `master`, `room master`, `operator-admin`, or similar labels as interchangeable public concepts. Source-native identifiers such as `admin` may remain in technical evidence, but the audit must map them to one canonical role concept.

## Canonical spatial-bound names

Keep these concepts distinct:

| Canonical term | Meaning |
| --- | --- |
| `Loading Bounds` | area used by loading/preload logic |
| `Simulation Bounds` | area whose simulation/residency is required |
| `Gameplay Bounds` | authored intended play region |
| `Physical Collision Bounds` | actual collision enclosure such as barrier/wall/floor/ceiling |
| `Session Ownership Bounds` | area/state ownership belonging to one arena/session |

Never infer one bound from another. In particular, crossing `Loading Bounds` or `Gameplay Bounds` is not proof of crossing `Physical Collision Bounds`.

## Canonical protection/proof names

Use:

- `Blocking Proof` — evidence that prevents the exact suspected causal path.
- `Counter-Proof Search` — bounded search for applicable Blocking Proof.
- `Runtime Verification` — final narrow runtime check for an irreducible native-behavior question.
- `Guard Activation` — proof that protection is defined, registered/instantiated, and reachable in production.
- `Physical Containment Proof` — collision/geometry proof for escape or cross-arena reachability.

Do not introduce alternate public names such as `safety proof`, `anti-proof`, `runtime check list`, `possible bug`, or `bug candidate`.

## Full-map naming

Use:

- `replicaBaseline` — canonical arena/region baseline.
- `replicaResults[]` — per-replica comparison result.
- `replicaId` — stable identifier for one compared replica.
- `replicaStatus` — `EQUIVALENT | BOUNDED_EQUIVALENCE | DIVERGENCE_REQUIRES_CLASSIFICATION | INCOMPLETE_PROOF`.
- `replicaDivergenceIds[]` — only deltas that must continue to EVALUATE/PROVE.
- `baselineReusableForAllReplicas` — true only when every replica has complete proof and is `EQUIVALENT`; bounded equivalence never authorizes global baseline reuse.

Do not use `copy`, `clone`, `same arena`, or `different arena` as canonical machine terms.

## Reporting hierarchy

Use:

```text
completeAuditFindings
→ all material PROVEN + NEED_VALIDATION findings

approvedBugReportV2
→ approved PROVEN BUG items only
```

Use `Map Audit Report` for the complete audit output. Reserve `Bug Report V2` for the approved PROVEN BUG ledger. Do not introduce `Complete Bug Report` as a second name.

## Evidence-route boundary

Internal report candidate values `static`, `runtime`, and `tester` describe evidence origin only.

Canonical interpretation:

```text
one audit flow
→ PROVE
→ evidence origin: static | runtime | tester
→ one finding projection
```

They must never be presented as alternate audit lanes or alternate production entrypoints. Existing internal `route` fields are compatibility names; their semantic meaning is `evidenceRoute`.

## Rule

A new name requires replacing an existing canonical term, not coexisting with it.