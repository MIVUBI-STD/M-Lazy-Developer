# M-Bedrock Architecture Learning Synthesis

Status: research reference only  
Date: 2026-09-28  
Target: `MIVUBI-STD/M-Bedrock-Dev` branch `Local`

This document consolidates lessons from M-Bedrock-Dev itself, M-LazyBuilder-Plugin, M-PRD-Creator, the supplied `bug-report-master` prototype, and selected mature external systems. It is not a production authority. Durable rules must be promoted into the existing canonical owner rather than copied from this file.

## Purpose

The goal is not to turn M-Bedrock into a generic bug tracker or QA SaaS. The target is a repository-first Bedrock engineering intelligence system that can recover authored intent, understand artifact behavior, distinguish designed behavior from defects, identify causal failures, authorize minimal repairs, prove preservation, and present the result to humans without creating a second semantic authority.

```text
source / intent
→ artifact understanding
→ expected-vs-observed reasoning
→ finding
→ causal incident
→ defect decision
→ repair admission
→ preservation-aware mutation
→ validation / runtime proof
→ acceptance / release evidence
→ human review projection
```

## Source corpus

### Internal repositories and supplied artifact

1. `M-Bedrock-Dev/Local`
   - Canonical source for current Bedrock artifact, intent, diagnostic, repair, preservation, runtime-lab, and reliability architecture.
2. `M-LazyBuilder-Plugin/Local`
   - Reference for documentation routing, first-wrong-owner discipline, Svelte presentation boundaries, UI state/error handling, proof ceilings, and repository verification.
3. `M-PRD-Creator/develop`
   - Reference for source authority, requirement provenance, exact revision binding, bounded invalidation, semantic/material conservation, deterministic derived output, and handoff acceptance.
4. Supplied `bug-report-master.zip`
   - Reference for human QA workflow: test-session metadata, issue/evidence presentation, URL-backed filters, report grouping, inline triage, and handoff/export ergonomics.

### External references

5. Linear
   - Interaction-density and shareable filter/reference patterns.
   - https://linear.app/docs/filters
6. Qase
   - Test-case/run/result/defect separation, point-in-time run snapshots, and failed-result-to-defect traceability.
   - https://docs.qase.io/en/articles/5563702-test-runs
   - https://docs.qase.io/en/articles/5563710-defects
7. Allure TestOps
   - Reusable defect grouping across multiple failures and unresolved-failure triage.
   - https://docs.qameta.io/use-testops/results-and-analytics/defects/
8. Jama Connect
   - Direct requirements-to-test-case-to-test-run traceability.
   - https://help.jamasoftware.com/ah/en/test/test-cases.html
9. SARIF / GitHub code scanning
   - Stable RuleDefinition vs per-run Result separation and portable machine-readable findings.
   - https://docs.github.com/en/code-security/concepts/code-scanning/sarif-files
   - https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support
10. Sentry
   - Event-to-issue grouping/fingerprinting, rich event provenance, and issue-level aggregation without deleting event identity.
   - https://docs.sentry.io/product/issues/issue-details/
11. SonarQube
   - Rule catalog vs issue instance, rule maturity, project/profile applicability, and recognition that analyzer updates may surface findings independently of source changes.
   - https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-rules/rules

## Decision vocabulary

Every learned pattern is classified as:

```text
ALREADY OWNED   current Local already has the semantic capability; do not duplicate it
ADOPT           add the principle with minimal translation
ADAPT           useful pattern, but M-Bedrock requires a domain-specific form
REFERENCE       use only as quality/interaction comparison
REJECT          conflicts with repository direction or adds unjustified complexity
```

## Consolidated matrix

| Source pattern | Decision | Current / target owner | Rationale |
|---|---|---|---|
| authored vs inferred intent | ALREADY OWNED | `packages/gameplay-intent/` | Current model already caps diagnosis strength by intent evidence strength. |
| explicit unknown intent | ALREADY OWNED | `packages/gameplay-intent/` | Unknowns already block diagnosis rather than being guessed through. |
| first wrong owner | ALREADY OWNED | `AGENTS.md`, `GITHUB_RULES.md`, system docs | Current Local already routes by semantic cause rather than implementation convenience. |
| proof ceilings | ALREADY OWNED | `docs/validation/`, runtime/reliability | STATIC/PACKAGE/LOCAL GAME/LIVE GAME/UNKNOWN already exists. |
| behavior/material conservation after transformation | ALREADY OWNED | `packages/preservation/` | Preservation contracts and semantic trace comparison are stronger than a new duplicated conservation framework. |
| revision/provenance continuity through runtime experiments | ALREADY OWNED | runtime-lab, diagnostic reasoning, repair proof bundles | Current Local already carries experiment revision, profile, fixture, predicates, factors, and successor compatibility. |
| source authority/provenance inventory | ADAPT | gameplay-intent + project-model/knowledge boundary | Intent evidence exists, but human-facing source authority needs a clearer projection when multiple sources conflict. |
| Completion / Proposal / Blocked decision ladder | ADAPT | diagnostic reasoning / review projection | M-Bedrock should expose deterministic resolution, proposal-only state, and blocked/unknown without copying PRD workflow vocabulary wholesale. |
| generated output is never source truth | ALREADY OWNED | architecture + thin apps | UI/report must consume core projections; no UI-owned severity/status semantics. |
| bounded invalidation | ALREADY OWNED, strengthen presentation | graph + preservation + orchestrator | Core has invalidation semantics; review UI should show why a prior proof became stale. |
| exact revision binding for evidence | ALREADY OWNED for runtime proof; ADAPT for human review | reliability/history/review projection | Human-facing issue/retest records should bind artifact/engine/intent/proof revisions without creating a second version system. |
| test run snapshots | ADOPT | validation/reliability projection | A recorded result must retain the scenario/expectation revision actually executed. |
| requirement → validation trace | ADAPT | gameplay-intent ↔ validation | Jama-style traceability should connect authored invariant/expected behavior to validation scenarios/results. |
| failed result → defect link | ADAPT | validation ↔ diagnostic/defect projection | A failure is evidence, not automatically a defect. Link only after diagnostic classification. |
| many failures → one defect | ADOPT | causal incident / review projection | Matches existing causal reasoning: multiple symptoms may share one root defect. |
| stable rule definition vs finding instance | ADAPT | diagnostics + optional SARIF exporter | Reusable diagnostic definition should be distinct from artifact-specific observation/result. |
| analyzer rule maturity/applicability | ADAPT | knowledge/diagnostics | Consider rule status/applicability and analyzer revision when interpreting finding drift. |
| issue/event fingerprint grouping | REFERENCE / ADAPT later | reliability/history | Useful for recurring symptom aggregation, but causal grouping must outrank hash-only grouping. |
| shareable filter state | ADOPT for future review UI | `apps/` presentation only | Useful without becoming persistence authority. |
| list/detail/activity UI density | REFERENCE | future Svelte review UI | Follow interaction quality, not Linear semantics. |
| Svelte as thin projection consumer | ADOPT | future `apps/review-ui/` | Same core engine must serve CLI, UI, and future MCP. |
| PostgreSQL/Neon as canonical state | REJECT now | — | Creates a second authority and hosted-service complexity before concurrency requires it. |
| Cloudflare R2 as evidence owner | REJECT now | — | Evidence metadata can remain local/repository-aware; remote object storage is deployment infrastructure, not core semantics. |
| generic REST SaaS layer | REJECT now | — | No demonstrated need; future adapter can consume core contracts if required. |
| Tauri/Rust desktop runtime | REJECT now | — | M-Bedrock does not currently need a native desktop boundary. |
| generic issue tracker ontology as core | REJECT | — | Findings, causal incidents, repair decisions, and proof states must remain Bedrock-semantic, not flattened into generic tickets. |

## Canonical model after synthesis

M-Bedrock should retain its current core owners and add only missing projections/links.

```text
AUTHORITATIVE INPUT
current instruction
+ authored artifact evidence
+ versioned Minecraft knowledge
+ optional approved external requirements/reference evidence
        ↓
GAMEPLAY INTENT
nodes / edges / invariants / unknowns
+ provenance + evidence ceiling
        ↓
IMPLEMENTATION UNDERSTANDING
artifact model
semantic graph
Semantic IR
Behavioral World Model
        ↓
DIAGNOSTIC REASONING
observation
→ finding/result
→ competing hypotheses
→ causal incident
→ classification
        ↓
DEFECT DECISION
confirmed-defect
probable-defect
designed-behavior
engine-constraint
compatibility-difference
insufficient-evidence
ambiguous-intent
runtime-proof-required
        ↓
REPAIR ADMISSION
causal provenance
+ preservation contract
+ invalidation scope
        ↓
MUTATION
working-copy transaction only
        ↓
VALIDATION
validation scenario revision
→ validation run snapshot
→ result/evidence
→ runtime experiment when required
        ↓
ACCEPTANCE / RELEASE PROOF
proof level + currentness + complete causal envelope
        ↓
HUMAN REVIEW PROJECTION
CLI / future Svelte / report / optional external adapters
```

## Important distinctions that must remain explicit

### Observation != finding != defect

```text
Observation
raw measured or inspected fact

Finding
interpretation produced by a known analyzer/rule/query

Causal incident
one or more findings explained by a causal hypothesis set

Defect
classification justified by expected behavior + contradiction + required proof
```

A static anomaly must never become a bug merely because it looks unusual.

### Severity != confidence != proof level

```text
severity   = impact if the defect is real
confidence = strength of the current defect classification
proof      = execution context actually demonstrated
```

A Critical / low-confidence hypothesis and a Medium / LIVE GAME VERIFIED defect are not interchangeable states.

### Validation != acceptance

```text
validation = what was tested and what happened
acceptance = whether the available proof is sufficient for the requested claim/release boundary
```

A repair can be implemented while acceptance remains blocked by missing multiplayer/live proof.

### Rule != result

```text
DiagnosticDefinition
stable semantic check / explanation / applicability

DiagnosticResult
one occurrence against one artifact/revision/context
```

This mirrors the useful SARIF/Sonar separation without making either external model the internal authority.

### Test definition != executed result

A validation result must retain the exact scenario/expected-behavior revision executed. Later edits must not rewrite historical meaning.

## Human review projection — real remaining gap

Current Local is strong in machine reasoning and proof. The missing product layer is a human review projection that exposes the existing truth without recomputing it.

Required future projection concepts:

```text
ArtifactReview
├── artifact identity / fingerprint / target runtime
├── authored intent summary
├── unresolved intent / evidence gaps
├── findings
├── causal incidents
├── classified defects
├── repair decisions
├── preservation contracts
├── validation runs/results
├── stale/invalidation reasons
└── acceptance/release readiness
```

The projection must be rebuildable from canonical core data. It must not own defect semantics, severity calculation, causal grouping, proof level, or repair authorization.

## Suggested future review lifecycle

Human-facing labels can be simpler than machine states but must map one-to-one to canonical truth.

```text
Needs review
Confirmed
Repair planned
Repairing
Needs validation
Verified
Accepted risk
Rejected / designed behavior
Stale
```

Do not use this lifecycle as a second diagnostic state machine. For example, `confirmed-defect` remains a diagnostic classification; `Confirmed` is only the review projection of that canonical state.

## Requirement / intent traceability

Adopt the useful part of Jama without adding a traditional requirements database.

```text
IntentInvariant / ExpectedBehavior
        ↓ verifies
ValidationScenario
        ↓ executes as snapshot
ValidationRun
        ↓ produces
ValidationResult
        ↓ supports / contradicts
Diagnostic classification or preservation claim
```

Required trace questions:

- Which authored invariant does this test verify?
- Which validation run last proved it?
- Against which artifact/runtime/intent revision?
- Which defects currently contradict it?
- Did a repair invalidate its prior proof?

## Failure grouping

Borrow the goal from Sentry and Allure, not their implementation.

```text
many observations/results
→ one causal incident when evidence supports common cause
→ one defect when the causal contradiction is confirmed
```

Do not group merely because messages/text/location look similar. Fingerprints may be supporting evidence; causal reasoning remains authority.

## Analyzer evolution and finding drift

SonarQube's rule model highlights an important M-Bedrock distinction:

```text
artifact changed
vs
analyzer/rule changed
vs
Minecraft knowledge changed
vs
runtime profile changed
```

Human review should show the source of new findings. A newly visible issue after an analyzer upgrade must not be presented as proof that the map newly regressed.

Suggested provenance fields for a result projection:

```text
artifactRevision
analysisEngineRevision
diagnosticDefinitionRevision
knowledgeRevision
targetRuntimeProfile
intentRevision/evidence set
```

Use existing repository revision/provenance machinery where possible. Do not introduce operator-maintained checksum registries.

## Future Svelte boundary

Use Svelte 5 only as a presentation client.

```text
packages/orchestrator + typed projection
            ↓
apps/review-ui
```

The UI may own:

- navigation;
- search/filter/sort;
- URL-backed view state;
- selection/scroll/tab context;
- readable evidence presentation;
- user review actions that call canonical commands.

The UI must not own:

- diagnostic classification;
- severity/confidence derivation;
- causal grouping;
- compatibility decisions;
- repair safety;
- proof promotion;
- artifact mutation logic.

Rust/Tauri is not justified unless a future requirement proves a native desktop boundary is necessary.

## Future UI information architecture candidate

Reference only; not a product contract yet.

```text
Artifacts
Review
Validation
History

Artifact detail
├── Understanding
├── Issues
├── Repairs
├── Validation
└── History
```

Default review emphasis should be action-oriented rather than chart-oriented:

```text
Needs attention
critical confirmed defects
probable defects requiring evidence
repairs awaiting validation
stale validation
runtime proof required
```

Charts are secondary summaries, not readiness authority.

## Rejected architecture directions

Do not introduce these without a demonstrated new requirement:

```text
central database as canonical truth
hosted multi-tenant service architecture
remote object-store evidence dependency
generic ticket model replacing semantic diagnostic states
Rust/Tauri desktop shell
second requirements registry duplicating Gameplay Intent
second preservation/conservation subsystem
second validation state machine
UI-specific severity or defect logic
```

## Promotion criteria from this research

A learned concept may move into production docs/source only when:

1. current Local does not already own the responsibility;
2. a concrete M-Bedrock workflow needs it;
3. the first wrong owner is identified;
4. the smallest existing owner can absorb it;
5. the change has a falsifiable proof;
6. the research concept is translated into M-Bedrock terminology rather than copied as another framework.

## Real gaps identified by this synthesis

The following remain legitimate candidates for future production work:

1. **Human engineering-review projection** over existing core truth.
2. **Validation scenario snapshot/history contract** so historical results cannot silently inherit edited expectations.
3. **Explicit intent/invariant ↔ validation trace links** for coverage and proof navigation.
4. **Human-facing stale-proof/invalidation explanation** derived from existing graph/revision machinery.
5. **Rule-definition/result-instance separation** where current diagnostics still duplicate stable rule metadata per occurrence.
6. **Optional export adapters** such as SARIF only after internal typed projection is stable.
7. **Svelte review UI**, only after the projection contract is stable.

Everything else in the reviewed references is either already owned by Local or should remain reference/rejected until evidence justifies it.

## Recommended next architecture order

```text
1. freeze this research corpus
2. inspect current diagnostic + validation public contracts for the six real gaps
3. design the minimum review projection contract
4. add validation snapshot + intent-trace contracts only where absent
5. add targeted tests
6. integrate CLI projection first
7. verify repository/source
8. only then add Svelte review UI
```

Do not start with dashboard components, database schema, or issue CRUD.
