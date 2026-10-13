# Lazy-Developer Stable Context

Last verified stable design facts: 2026-10-12

This file contains only stable repository/product facts. It does not own current work, current proof state, implementation-path detail, or project execution state.

## Product

**Lazy-Developer is a ChatGPT-native checker, not an existing executable application.** ChatGPT currently performs Minecraft Bedrock/Education source checking with genuinely available tools. GitHub `Local` is the authority for reusable code/knowledge/contracts, not proof those TypeScript modules have executed. No application build, installation, deployment or localtest has been established.

Primary lifecycle:

```text
Inspect
→ Understand
→ Diagnose
→ Repair / Modify
→ Validate
→ Package
→ Report
```

The repository specifies a proposed shared deterministic core for optional programmatic CLI/CI/future integration; these are source-design targets, not established runtime products.

## Branch authority

```text
Local → active development / source authority
main  → stable / release authority
```

## Repository domains

```text
apps/          optional interface source, no built/running UI proven
engine/        semantic/analysis source and intended executable contracts
docs/          durable human-facing documentation
planning/      development / operations / project work intent
workspace/     working artifacts, project continuity, and current report handoff
experiments/   bounded non-authoritative research
tooling/       repository/build/developer verification tooling
.agents/       bounded agent procedures, permissions, routing, and evals
```

Historical execution evidence belongs in `engine/reliability/history/`.
Reusable evaluation material belongs in `engine/reliability/corpus/`.

## Stable architecture

```text
Artifact
→ safe ingest / archive boundary
→ normalized project model
→ semantic / gameplay understanding
→ diagnosis
→ authorized transactional mutation
→ validation
→ deterministic output
→ report / evidence projection
```

Repository task planning is a separate control-plane concern. It may select affected work and reuse valid results, but it never upgrades semantic/runtime proof or owns Minecraft behavior.

## Execution model

**ChatGPT is the checker. GitHub is the source/knowledge authority.** ChatGPT repository work is remote-GitHub-first; selected-world inspection can happen directly in ChatGPT. No user PC, local app, Node 24, checkout, npm, CI or VM is required as a prerequisite. Historical developer toolchain metadata does not establish application execution.

```text
REMOTE_GITHUB
→ canonical owner/source
→ bounded mutation
→ exact-head source/static verification
→ STOP

higher execution context
→ only for claims inherently requiring artifact/Minecraft/runtime execution
```

A genuinely executed script can strengthen a specific source claim if that capability is actually available in ChatGPT. Otherwise label TypeScript/test/runtime claims NOT EXECUTED without blocking independently supportable Minecraft source analysis.

## Engineering invariants

- one semantic owner per responsibility;
- one primary execution path per behavior;
- one persisted fact has one authority;
- original source artifacts are immutable;
- mutations are explicit, transactional, and preconditioned;
- analyzers are read-only;
- unknown content is preserved;
- compatibility/version applicability is explicit;
- Bedrock and Education share one core with edition-specific rules;
- artifact graph, repository task graph, and Minecraft semantic graph remain separate;
- source/static/package/runtime proof levels remain separate;
- historical reliability evidence is search pressure, not current-artifact truth;
- derived projections do not become second state authorities;
- deletion/reuse of an existing owner precedes adding a new abstraction;
- no persistent registry, manager, cache, or state store without a concrete repeated need.

## Selected-map audit invariant

Production audit has one selected artifact and one ordered flow:

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

The selected current map artifact is the sole current gameplay authority.

Historical reports, older versions, reliability data, user symptoms, and external references may raise search pressure but cannot independently define current Expected/Actual behavior or prove a current defect.

Unresolved work remains explicit as Audit Obligations or bounded runtime proof requirements. Vital Gameplay Knowledge Closure is a read-only projection and never a second workflow or finding owner.

## Toolchain metadata (not the ChatGPT checker)

Optional developer/build configuration lives in `toolchain.json` and `DEV.cmd`. These source files are not an installed application, not a verification gate for ChatGPT, and not evidence of a user-facing product.

## Canonical routing

```text
documentation router        → docs/README.md
repository/domain naming    → docs/system/canonical-naming.md
architecture                → docs/system/architecture.md
semantic authority          → docs/system/authority-model.md
implementation ownership    → docs/system/implementation-map.md
development discipline      → docs/system/development-discipline.md
developer operations        → docs/system/development-operations.md
skill routing               → docs/system/skill-routing.md
minimum-sufficient execution→ docs/system/zero-waste-execution.md
current work intent         → planning/
working/project state       → workspace/
historical evidence         → engine/reliability/history/
research                    → experiments/
```

If a detail is owned elsewhere, link to that owner rather than duplicating it here.