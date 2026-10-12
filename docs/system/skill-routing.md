---
id: document.system.skill-routing
class: DOCUMENT
domain: system
role: WORKFLOW
authority: CANONICAL
lifecycle: ACTIVE
---

# Skill Routing

Skills are routed on **two dimensions**:

1. **Work lane** — what kind of job is being performed.
2. **Domain specialist** — what semantic owner is needed for one decision.

Do not use a domain skill to infer the work lane.

## User-facing modes

Two clear ChatGPT operator modes select the appropriate **source and evidence route**, not application execution. M-Lazy-Developer has no built/operated app; the names `engine`, `pipeline`, `production`, `UI` and `CLI` elsewhere describe repository code contracts until verified otherwise:

| Mode | Purpose | Internal route | Not allowed |
|---|---|---|---|
| `SYSTEM DEVELOPMENT` | Design/build/improve Lazy-Developer | `m-bedrock-product-development` with `product-development` permission profile, or `m-bedrock-detection-development` for reusable bug detection improvements | Treating a map-specific finding as proof that an engine change is correct |
| `MAP BUG AUDIT` | Find/classify bugs in a selected map using current capabilities | `m-bedrock-map-bug-audit` | Editing engine, detectors, or platform knowledge while auditing |

**ChatGPT-native checker boundary:** In MAP BUG AUDIT, ChatGPT directly examines the selected artifact and checks canonical GitHub knowledge/contract sources. It may construct an evidence-grounded audit response but must not claim a programmatic `runSelectedMapAudit()`, canonical `SelectedMapAuditRun` or generated `MapAuditOutputV2` without actual execution. In SYSTEM DEVELOPMENT, changes to source contracts/TypeScript modules are implementation work saved to GitHub, never proof a user-facing app is built, tested or ready for localtest. No Node version, local app, CI or emulator is a prerequisite for ChatGPT source analysis.

The operator mode is not an additional machine skill/lane or artifact authority. Detection Benchmark and Target Repair remain separate specialized routes when requested. Domain specialists never change the selected mode. An audit detection gap is a handoff, not automatic development permission; a development improvement never automatically resumes or reclassifies a map audit.

**Default from user intent:** "develop/improve the system" selects SYSTEM DEVELOPMENT; "audit/find map bugs" selects MAP BUG AUDIT. For ambiguous requests with materially different outcomes, ask which outcome is intended. An unqualified "continue" retains the active mode. Switch modes only on explicit user request, and finish/record the current lane's handoff before switching.

## Work lanes

### Product Development

`m-bedrock-product-development`

Use for general Lazy-Developer product, architecture, UI, engine, and tooling development. It uses `docs/system/development-discipline.md` and the existing `product-development` permission profile. No skill-specific output schema or script is required for a source change whose proof is owned by existing repository verifiers.

### 1. Operational Map Audit

`m-bedrock-map-bug-audit`

Use to find/classify bugs in a map with current capabilities.

Allowed:
- pin one Selected Map Version;
- derive gameplay surfaces and Gameplay Contract from that artifact only;
- inspect Actual Behavior from that same artifact;
- account for every in-scope gameplay surface;
- classify contradictions/findings;
- identify detection gaps.

Forbidden:
- improving analyzers/rules/knowledge during the audit;
- turning unsupported capability into a defect.

### 2. Detection Development

`m-bedrock-detection-development`

Use to improve Lazy-Developer bug-finding capability.

Allowed:
- parser/analyzer/knowledge/rule/model/diagnostic/proof improvements;
- reduced fixtures;
- reusable capability changes.

Forbidden:
- treating a production Bug Report as development completion;
- map-specific hardcoded logic.

### 3. Detection Benchmark

`m-bedrock-detection-benchmark`

Use to measure current capability against frozen expectations.

Allowed:
- regression/golden evaluation;
- false-positive/negative classification;
- proof/coverage/cost measurement.

Forbidden:
- changing production implementation;
- changing expectations to fit current output.

### 4. Target Repair

`m-bedrock-target-repair`

Use only for an Approved Bug or an explicit intentional modification that requires target source/artifact mutation.

## Domain specialists

Artifact/container/workspace/package:
→ `m-bedrock-artifact-engineering`

Manifest/function/command/reference/semantic analysis:
→ `m-bedrock-content-analysis`

Version/edition/API/capability:
→ `m-bedrock-compatibility`

Cross-owner ambiguity:
→ `m-bedrock-cross-owner-routing`

## Routing algorithm

```text
user goal
→ choose one work lane
→ identify current semantic decision
→ consult at most one domain specialist
→ return typed result to lane
→ continue lane
```

A lane remains active across domain handoffs. Do not replace Map Audit with Detection Development automatically when a detection gap appears.

## Handoff contracts

### Map Audit → Detection Development

Emit:

```text
Detection Gap
- unsupported claim/evidence
- seed artifact/reference
- current proof ceiling
- likely canonical owner
- smallest reproduction
- audit impact
```

Then STOP that claim in the audit.

### Detection Development → Benchmark

Emit:

```text
Detection Capability Delta
- gap class
- owner changed
- generalized behavior added
- fixture/expectation
- expected before/after difference
- remaining proof residue
```

### Benchmark → Map Audit

Benchmark does not automatically reopen a map audit. A new operational run must consume the verified capability.

## Separation rule

```text
USE detection capability != DEVELOP detection capability != BENCHMARK detection capability
```

Never combine all three in one implicit skill flow.


## Development naming

`DEVELOP` alone means generic Product Development unless the goal is explicitly to improve bug-detection correctness/coverage.

```text
add/change product feature
→ Product Development execution contract

make bug finding smarter/more accurate
→ Detection Development
```

The mandatory work-lane structure is defined in this document.


## Permission preflight

Work-lane routing and mutation authority are separate decisions.

Before write/network/live execution:

```text
active lane
→ planned action + resource/path
→ lane permission preflight
→ allow / ask / deny
```

- `allow`: continue within the active lane.
- `ask`: obtain the required explicit approval or execution-context escalation.
- `deny`: stop that action; do not switch lanes implicitly.

A domain specialist cannot override a denied lane permission.

## Work-lane contract

Every work-lane skill must expose the same control structure:

1. Purpose
2. Entry criteria
3. Allowed actions
4. Forbidden actions
5. lane-specific procedure
6. Output contract
7. Handoff
8. STOP

Canonical work-lane names:

```text
Product Development
Map Bug Audit
Detection Development
Detection Benchmark
Target Repair
```

Product Development is not Detection Development. Generic repository/product feature work uses the normal development execution contract and canonical semantic owner.

General Product Development uses the permission profile `product-development` in `.agents/permissions/lane-permissions.json`. The permission profile is the existing authorization contract for the registered Product Development work lane. It permits bounded repository/source changes but never grants target-artifact mutation. The closest canonical owner and existing development contract still govern scope.

### Domain specialist contract

Domain specialists may use a smaller procedure, but must declare:
- role = domain specialist;
- lane boundary;
- owned decision/result;
- no implicit expansion of mutation or execution authority.

### No implicit lane switching

```text
Map Bug Audit
  detection gap
    → handoff record
    → stop that claim

Detection Development
  capability complete
    → benchmark handoff
    → stop development

Detection Benchmark
  pass/fail
    → report/handoff
    → stop benchmark
```

A handoff is data. It is not permission to continue automatically into another lane.