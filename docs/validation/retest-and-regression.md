---
id: document.validation.retest-and-regression
class: DOCUMENT
domain: validation
role: GUIDE
authority: CANONICAL
lifecycle: ACTIVE
---

# Retest and Regression

## Purpose

Canonical guidance for converting confirmed historical defects, Minecraft/update changes, artifact fingerprints, and coverage gaps into bounded retest priorities.

Historical evidence informs what to revisit; it never proves a defect in a current artifact.

## Regression assets

Use distinct owners:

```text
historical defect knowledge → engine/reliability/catalogs/
benchmark expectations      → engine/reliability/corpus/
minimal reproducer          → engine/fixtures/regressions/
execution history           → engine/reliability/history/
current issue truth         → workspace/projects/<project>/report/
```

Do not create another regression/history owner in docs.

## Minimal regression fixture

A regression fixture should reduce a real defect to the smallest reproducible evidence needed to exercise the detector or invariant. A full world is not required when a smaller deterministic fixture proves the target behavior.

## Map retest planning

Build retest priority from:

```text
current artifact fingerprint
+ Minecraft/update delta
+ relevant historical regressions
+ known coverage gaps
+ runtime-sensitive surfaces
→ bounded Retest Plan
```

A retest plan is selection/prioritization, not PASS/FAIL proof.

## Portfolio retest

For multiple maps, reuse exact artifact fingerprints when valid and group maps by affected domains and priority. Reopen artifacts only when their fingerprint or required evidence is stale.

High priority means high retest value, not proof the map is broken. Low priority is not a safety guarantee.

## History-driven search

Historical incidents may:
- raise search pressure;
- activate likely failure families;
- prioritize affected domains;
- suggest proof/counter-proof questions.

They must never inject Expected/Actual behavior into the current selected artifact.

## Campaign history and minimization

Campaign history records what was executed and what coverage/failures were observed. Promote only durable reusable lessons into reliability catalogs; leave chronological run detail in reliability history.

## STOP

Retest planning is complete when affected artifacts/domains have explicit bounded priorities and evidence lanes. Current defect classification remains owned by the current selected-artifact audit.

## Independent regression audit

When validating detector recall against historical defects, keep the current selected artifact independent from the historical answer.

Use:

```text
selected artifact
→ canonical audit flow
→ independent finding set
→ only then compare with historical regression expectations
```

Historical bug IDs, titles, reproduction steps, and root-cause conclusions must not seed the independent pass.

When a historical regression is missed, classify the earliest failing mechanism:

```text
DISCOVERY_MISS
ROUTING_MISS
CROSSCHECK_MISS
MODEL_MISS
SCENARIO_MISS
ADVERSARIAL_MISS
PROOF_MISS
DEDUP_MISS
REPORT_MISS
```

Fix the earliest owner that failed instead of adding another taxonomy layer.

Useful quality metrics include:
- material surface routing;
- mutable-resource ownership;
- applicable-check routing;
- required-crosscheck generation;
- scenario accounting;
- player-controlled-surface accounting;
- regression detected/expected;
- PROVEN vs NEED_VALIDATION;
- generic NEED_VALIDATION count;
- false positives;
- duplicate root causes;
- unaccounted material residue.

Regression acceptance must remain honest. Never force recall to 100% by copying historical answers.

## Reliability planning model

Retest priority combines bounded evidence inputs rather than subjective confidence:

```text
invariants
+ regression knowledge
+ map compatibility fingerprint
+ Minecraft update delta
+ explicit coverage/blindspot state
→ bounded retest priority
```

Unknown/partial coverage remains visible.

### Map compatibility fingerprint

A map fingerprint describes semantic dependency/risk surfaces such as:
- commands and Script API modules;
- structures and native world usage;
- state mutation surfaces;
- topology/concurrency-sensitive features;
- target edition/experiments.

Fingerprint identity is deterministic and remains separate from artifact SHA.

### Update intelligence

Update evidence retains provenance, target version, affected domain/capability, change kind, and confidence.

Normalize evidence into a bounded update delta for retest planning. Prefer official platform sources; observed/inferred evidence must keep its evidence class.

### Native/script update correlation

Before/after artifact comparison may combine:
- update delta;
- compatibility fingerprint;
- historical regressions;
- native world differential;
- Script API usage.

Module overlap, exact symbol overlap, and native changes are correlation evidence only. They narrow investigation; they do not prove causation.

### Reliability owners

```text
engine/reliability/catalogs/ → durable reliability knowledge
engine/reliability/corpus/   → frozen evaluation expectations
engine/fixtures/regressions/ → minimized executable evidence
engine/reliability/history/  → chronological execution evidence
```

Do not create another reliability owner in docs.

### Blindspot portfolio

Survived detector mutations may be aggregated across maps/campaigns by domain/operator to identify repeated detector weakness and adjust bounded search budget.

Search-budget recommendations are allocation signals, not quality scores.

### Benchmark quality

Benchmarking must distinguish:
- false negative;
- false positive;
- semantic mismatch;
- evidence insufficient;
- runtime proof required;
- invalid fixture.

A NEED_VALIDATION production result is not automatically a false negative. Compare against the frozen evidence ceiling and expected public status.

Benchmark quality must reward recall/precision/proof quality without gaming PROVEN rate by weakening evidence requirements.

## Invariant revalidation

Invariant evidence must distinguish:
- raw observation count;
- semantic-state diversity;
- semantic coverage diversity;
- map diversity;
- Minecraft version applicability.

Repeated traces from one state/map are not equivalent to independent supporting evidence.

Update deltas that overlap an invariant's domains/capabilities create bounded revalidation work. Removed behavior, tightened validation, and material behavior changes receive the highest revalidation priority.

Promotion/trust remains conservative: no known-good counterexample, sufficient support/diversity, appropriate cross-map evidence, current-version applicability, and no unresolved mutation-survivor challenge.

## Forward ground-truth intake

Future tester/client-confirmed defects may be used to evaluate and improve a frozen engine only through a preserved frozen comparison.

For every prospective snapshot retain:
- exact artifact fingerprint;
- engine/audit revision;
- independent finding set;
- coverage/proof state.

When later ground truth arrives, never rewrite the frozen result.

Classify each confirmed issue against the frozen snapshot as:

```text
DETECTED
PARTIALLY_DETECTED
MISSED
NOT_COMPARABLE
```

Only independently confirmed defects participate in recall scoring. Unconfirmed reports remain validation candidates.

For misses/partial detection, record the earliest failing owner/stage and apply the smallest general mechanism repair. Then rerun affected regression cases plus at least one unrelated control to detect false-positive expansion.

Historical/future user reports remain evidence for detector evaluation; they never become current-artifact proof automatically.