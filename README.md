# Lazy-Developer

Lazy-Developer is a modular Minecraft Bedrock and Minecraft Education content-engineering system for inspection, gameplay understanding, bug diagnosis, authorized repair/modification, validation, deterministic packaging, and report generation.

## Branch authority

```text
Local → active development / working authority
main  → stable / release authority
```

## Start here

Primary repository workflow is remote GitHub work through the repository policies:

```text
AGENTS.md
→ GITHUB_RULES.md
→ canonical source/docs owner
→ bounded GitHub read/write
→ remote source verification
→ STOP
```

A local checkout is **not required** for normal ChatGPT/GitHub repository work.

`DEV.cmd` and npm scripts are optional local-developer conveniences only. They may provide stronger executable proof when a developer intentionally uses a local checkout, but they are not a completion prerequisite for remote repository work.

Documentation starts at [docs/README.md](docs/README.md).

## Choose one operator flow

These are two entry routes into the **same engine**, not separate copies of the codebase.

| User request | Mode | Route | Result |
|---|---|---|---|
| Improve architecture, detectors, knowledge, UI or repository | **SYSTEM DEVELOPMENT** | `AGENTS.md` → `docs/system/skill-routing.md` → owning development skill → exact canonical source | One bounded, verified source change and logical commit |
| Find or classify defects in one supplied map | **MAP BUG AUDIT** | `AGENTS.md` → `.agents/skills/m-bedrock-map-bug-audit/SKILL.md` → `runSelectedMapAudit()` | One Map Audit Report with complete supported findings and explicit proof gaps |

The audit path does not change engine source. A detected engine gap requires a separate, explicitly authorized development request. Repair and benchmark have dedicated work lanes; they are **not** hidden steps of either mode.

**For ChatGPT:** supply the `Local` repository URL and describe the intended outcome. Repository inspection alone is read-only. Normal repository development uses GitHub directly without `DEV.cmd`, a local checkout, or automatic CI.

## Root file ownership and navigation

The root is a small entry and tooling-contract boundary, **not** another location for engine behavior, working state, or duplicated documentation. Keep files here only when their existing repository-wide consumers require the location.

| Path | Exactly one responsibility | Where to go for detail |
|---|---|---|
| `README.md` | Human starting point and routes into established owners | Domain README, not duplicate implementation guides |
| `AGENTS.md` | Agent mode selection, task routing and repository invariants | Selected skill and domain owner |
| `GITHUB_RULES.md` | GitHub change, verification, commit and handoff policy | Exact GitHub/source owner |
| `CONTEXT.md` | Stable product facts only | No work status or planning |
| `CONTRIBUTING.md` | Contribution conventions | `docs/system/development-discipline.md` for engineering decisions |
| `SECURITY.md` | Repository-wide trust and sensitive-input boundaries | Concrete engine security owner |
| `package.json` | Node package metadata and script entrypoints | `tooling/` for executable tooling |
| `package-lock.json` | Locked npm dependency graph | `package.json` |
| `tsconfig.json` | TypeScript project configuration | Owning source modules |
| `toolchain.json` | Canonical pinned developer/runtime tool versions | `tooling/windows-toolchain/` |
| `.node-version` | Node version selector for supporting tooling | `toolchain.json` |
| `VERSION` | Product version string | `package.json` is package metadata; versions must remain coherent |
| `DEV.cmd` | Optional Windows-local launcher only | `tooling/windows-toolchain/dev.ps1` |
| `.editorconfig` | Editor whitespace/format behavior | No engine semantics |
| `.gitattributes` | Git path/attribute behavior | No engine semantics |
| `.gitignore` | Untracked-file exclusion rules | No artifact source authority |

The root folders have distinct responsibilities: `apps/` owns interfaces; `engine/` executable Minecraft semantics; `docs/` durable descriptions; `planning/` future intent; `workspace/` active project artifacts; `tooling/` developer operations; `experiments/` bounded research; `.agents/` agent procedures; and `.github/` GitHub service configuration.

### Find work by flow, edit only its owner

| Intended task | First route | Authoritative destination |
|---|---|---|
| Improve the system | `AGENTS.md` → development skill | `docs/system/implementation-map.md` → owning source |
| Audit a selected map | `AGENTS.md` → map audit skill | `runSelectedMapAudit()`; TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT |
| Repair an approved defect | Target Repair skill | Authorized repair owner and preservation contract |
| Change a report or presentation | Report contract and projection owner | One current report authority; HTML/JSON are derived |
| Learn a Minecraft behavior | Knowledge router and `engine/knowledge/ownership.json` | One canonical catalog claim or executable domain owner |
| Resume an unfinished task | Relevant work commits and `planning/` | Current source plus explicitly verified unresolved work |

**One source → one meaning → one authoritative output** means a workflow stage is a navigation address, not a new implementation folder. Existing API barrels do not own semantics; compatibility re-exports must not be used for new internal imports. Keep a required root file in place rather than moving it merely to make the tree look smaller.

## Repository map

```text
apps/          user-facing executable/UI surfaces
engine/        Bedrock analysis, reasoning, validation, repair, and machine knowledge
docs/          durable human-facing documentation
planning/      development, operations, and project work intent
workspace/     working artifacts, project continuity, current reports, and derived publication
experiments/   bounded non-authoritative research
tooling/       repository/developer/build/verification tooling
.agents/       bounded agent procedures, permissions, schemas, and evals
```

The repository root is intentionally sparse. New top-level domains require a durable repository-wide responsibility.

## Product flow

```text
Artifact
→ safe ingest
→ normalized project model
→ semantic/gameplay understanding
→ diagnosis
→ authorized repair / modification
→ validation
→ deterministic package/output
→ report / evidence projection
```

Architecture and ownership:
- [Architecture](docs/system/architecture.md)
- [Authority Model](docs/system/authority-model.md)
- [Implementation Map](docs/system/implementation-map.md)
- [Canonical Naming](docs/system/canonical-naming.md)

## Selected-map gameplay audit

Production map audit has one operator flow:

```text
npm run audit -- <selected.mcworld> [--brief]
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

Canonical owners:
- [Master Selected-Map Audit Workflow](docs/analysis/master-selected-map-audit-workflow.md)
- [Mandatory Gameplay Audit Procedure](docs/analysis/mandatory-audit-procedure.md)
- [Bug-Finding Coverage System](docs/analysis/bug-finding-coverage.md)

The default `npm run audit -- <selected.mcworld>` emits the existing authoritative Map Audit V2 JSON. The optional `--brief` view renders **Game Understanding → Findings → Next Investigations** from the exact same audit output and model task packets. When a knowledge catalog is supplied (the production CLI already loads it), source-grounded investigation packets can include a few matched Minecraft facts/relations with original source URLs and declared edition scope. These are **retrieved references**, not evidence that a detector consumed a fact or that Minecraft gameplay was observed. An unmatched mechanic remains a valid map mechanic, not a forced database category. It is a bounded human-facing projection, not a second audit run/report contract. Source-derived journey candidates are **not observed gameplay**, and a blocked/zero-finding audit never proves the absence of bugs. The engineering CLI `npm run cli --` is a separate development utility and does not implement an `audit` command.

The exact selected map artifact is current gameplay authority. Historical evidence and user/client symptoms may guide search but never replace current-artifact proof.

## Project state and planning

```text
planning/                    what should be worked on
workspace/projects/          map-centric project continuity
  <project>/report/          canonical current Bug Report V2 / Developer Notes
  <project>/output/          derived current HTML + JSON tracker output
  <project>/archive/vX.Y.Z/  intentionally retained historical report/output
  <project>/levels/          level-scoped report/output/archive for multi-level games
engine/reliability/history/  historical execution evidence
engine/reliability/corpus/   reusable/frozen evaluation material
```

See [workspace/README.md](workspace/README.md) and [planning/README.md](planning/README.md).

## Core invariants

- one responsibility → one canonical owner;
- original artifacts remain immutable;
- mutations occur through authorized working-copy transactions;
- derived output never becomes a second source of truth;
- static/package/runtime proof remain distinct;
- historical reliability evidence is search pressure, not current gameplay truth;
- interfaces stay thin; Bedrock semantics belong to `engine/`;
- reuse/delete an existing owner before creating a new abstraction.

## Toolchain

Canonical toolchain policy is [toolchain.json](toolchain.json).

Optional local developer/build routing is owned by `tooling/windows-toolchain/`. Remote GitHub work does not depend on this toolchain.

Historical audit/run evidence belongs in `engine/reliability/history/`; reusable evaluation material belongs in `engine/reliability/corpus/`; superseded implementation detail remains in Git history.