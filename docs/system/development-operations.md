---
id: document.system.development-operations
class: DOCUMENT
domain: system
role: GUIDE
authority: CANONICAL
lifecycle: ACTIVE
---

# Development Operations

## Remote GitHub operating mode

The primary ChatGPT development mode is **REMOTE_GITHUB**. **This is a ChatGPT-native checker, not an installed, built, or running application.** ChatGPT itself inspects available selected Minecraft artifact files; GitHub is code/knowledge and continuity storage, not an execution environment by default.

For M-Lazy-Developer, **`Local` is the GitHub branch**, not a user-PC directory. **ChatGPT does not route its unfinished verification to a user-local PC**: this workflow uses **ChatGPT + GitHub only**, with **no external cloud services and no local-PC path**. Current ChatGPT tools perform work, and GitHub `Local` owns source/commits/continuity. Do not require a cloud runner, hosted service, external compute, deployment, or optional GitHub Actions run. If executable or Minecraft runtime evidence is unavailable, record only the exact `UNKNOWN / NOT EXECUTED` proof ceiling and finish independently source-verifiable work under `GITHUB_RULES.md#41-chatgpt-no-local-pc-invariant`.

```text
GitHub ref / exact source
→ identify canonical owner
→ minimum source reads
→ diagnose first wrong owner
→ bounded repository mutation
→ exact-head source/static verification
→ explicit higher-context residue only when inherently required
→ STOP
```

A local checkout, Node installation, npm install, `npm run check`, Vitest, TypeScript execution, or `DEV.cmd` is **not required** for direct ChatGPT Minecraft checking or to complete normal remote repository work. Do not frame missing optional Node/npm dependencies as a blocker for archive, scripts, functions, NBT, LevelDB, structures, and source-reasoning checks accessible through actual ChatGPT tools.

Remote completion must state its proof ceiling honestly. Source/static claims may close remotely. Claims about compiler execution, tests actually passing, archive execution, Minecraft import, or gameplay remain unclaimed unless matching execution evidence exists.

## Optional local developer commands

`DEV.cmd` is retained only as a convenience for developers who intentionally use a local Windows checkout:

```text
DEV.cmd setup
DEV.cmd doctor
DEV.cmd audit
DEV.cmd check
DEV.cmd test
DEV.cmd inspect <artifact>
DEV.cmd finalize-local
```

These commands are not ChatGPT workflow authority and never gate remote GitHub completion.

## Toolchain authority

`toolchain.json` describes optional developer/build compatibility. It pins Node `22.16.0` and npm `10.9.2` as the **ChatGPT-container-compatible baseline**, not for ChatGPT's built-in checking capabilities; no running application is presently established. `package.json#engines` supports Node 22.12+ and Node 24, while the source minimum for TypeScript is 5.8.3. The exact lockfile still installs TypeScript 5.9.3 and Node 24 typings; version compatibility does not imply that package installation, TypeScript compilation, native addons or Minecraft gameplay has executed. If source-declared build tasks are genuinely executed, use the installed dependency versions and disclose the actual Node/toolchain proof.

Do not require global TypeScript/Vitest/build tools when package-managed versions are sufficient.

### ChatGPT execution compatibility

The lowest verified *toolchain baseline* in the current ChatGPT container is Node 22.16.0, npm 10.9.2 and globally available TypeScript 5.8.3. The optional dependency graph permits this Node major for common JavaScript tooling (Vite 7.3.6 requires Node >=22.12), but a locked optional native binary `@napi-rs/lzma-linux-x64-gnu@1.5.1` declares Node ^22.20 or ^24.12. `@8crafter/leveldb-zlib` also has a native install script. A full `npm ci`/native world-DB run on 22.16 therefore remains **UNVERIFIED**, not PASS.

Execution levels must remain distinct: (1) exact GitHub source and selected `.mcworld` archive inspection, available with native ChatGPT tools; (2) isolated AST/JavaScript probes using installed TypeScript, executable where source bytes are accessible; (3) exact repository `tsc`, Vitest or `runSelectedMapAudit()` only when the *complete exact-ref* source and matching locked dependencies are actually available; (4) Minecraft gameplay only with real game execution evidence. No lower version requirement can solve missing repository mounting or missing `node_modules`. Never replace an unexecuted tier with a source-only PASS.

## Verification lanes

Use the strongest evidence available for the exact claim without turning a higher execution context into a mandatory dependency.

```text
policy/docs change      → REMOTE_GITHUB structural/source review
source contract         → REMOTE_GITHUB exact-head source + affected tests/contracts review
executed typecheck/test → only if directly callable in current ChatGPT tools, or evidenced by an existing exact-head GitHub run; otherwise NOT EXECUTED
artifact execution      → only if directly supported by current ChatGPT tools; otherwise UNKNOWN
Minecraft import/open   → only if directly supported by current ChatGPT tools; otherwise UNKNOWN
gameplay/runtime        → actual live execution evidence, otherwise UNKNOWN
```

Remote source completion and executable validation are different proof levels. Evidence-context labels such as `LOCAL_ARTIFACT`, `LOCAL_MINECRAFT`, and `LIVE_MINECRAFT` describe required proof capabilities, **not** instructions to use the user's PC. Missing executable evidence must remain an explicit proof ceiling, never a requirement for local-PC access, npm installation, local data, or user-operated testing.

## Distribution boundary

Build/package commands may produce artifacts only in ignored/generated output locations. They must not overwrite original user artifacts.

Release/promotion to `main` is separate from ordinary development.

## CI principles

- read-only permissions by default;
- bounded timeout;
- pinned major/trusted actions;
- exact-head evidence;
- no commit-back;
- no secrets for ordinary verification;
- no full expensive workflow on every trivial Local edit unless a specific invariant requires it.

Focused workflows are evidence tools, not parallel readiness authorities.

## Source hygiene audit

`DEV.cmd audit` reports possible unreferenced production source files and production external-package usage.

The audit is intentionally non-blocking. A zero-inbound file or apparently unused dependency is a review candidate, not deletion permission. Dynamic loading, generated entrypoints, runtime adapters, or test-only support can make a candidate legitimate.

Promote a hygiene rule into `verify:repository` only after the repository baseline proves that the rule has low false-positive risk.

## Optional local readiness

For developers who choose a local checkout, `DEV.cmd finalize-local` may run `npm run verify:local-ready` as the repository's optional local executable verification suite.

This is an optional stronger-proof path. It does not define whether ChatGPT remote GitHub work is complete, and remote work must never be left artificially pending solely because this local command was not executed.

## Dependency execution policy

Production source may import external packages only when they are declared in `dependencies`; test/build-only packages belong in `devDependencies`.

Install scripts are deny-by-default under npm's script policy and approved explicitly by exact locked version in `package.json#allowScripts`. The current approved native/build hooks are `@8crafter/leveldb-zlib@1.6.0` and `esbuild@0.28.2`.

## Public API surface audit

`DEV.cmd audit` also reports cross-owner imports that bypass another module's `src/index.ts` entrypoint.

The audit is non-blocking while legacy deep imports remain. Migrate one semantic owner at a time, then promote only that proven owner boundary into a blocking rule. This preserves internal refactor freedom without forcing a repository-wide import rewrite.

## Public API debt ratchet

`tooling/repository/public-api-baseline.json` records the current count of cross-owner deep imports per target owner.

The public API audit fails only when an owner exceeds its recorded baseline. Existing debt may remain temporarily, but it cannot increase. After a migration reduces an owner's count, lower that owner's baseline in the same logical change.

Never raise a baseline merely to make CI green; a baseline increase requires an intentional architecture decision.