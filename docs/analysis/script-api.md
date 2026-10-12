---
id: document.analysis.script-api
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

# Script API Static Analysis

Script content is analyzed statically and is never executed.

## Current facts

The analyzer extracts:

- ES module imports;
- @minecraft/* module usage;
- relative script dependencies;
- world and system references;
- beforeEvents / afterEvents subscriptions;
- system.afterEvents.scriptEventReceive subscriptions;
- dynamic property API calls;
- literal dynamic-property IDs when statically visible.

Microsoft documents World event collections and System event collections as first-class Script API surfaces, and system.afterEvents.scriptEventReceive is the event raised by /scriptevent. citeturn771857search0turn771857search1turn771857search4

Microsoft also separates Script API module versions into stable, beta, and internal tracks; beta APIs do not carry stable backwards-compatibility guarantees and require Beta APIs experiment enablement. citeturn771857search2

## Analysis boundary

The analyzer does not execute code or attempt full program evaluation.

```text
source text
→ TypeScript parser AST
→ syntactic semantic facts
→ module graph / capability facts
→ diagnostics
```

Computed property names, runtime-generated imports, reflective behavior, and arbitrary data flow remain unknown unless a dedicated static analysis later proves them.

## Bounded event-to-local-helper receiver identity

The Script API method-call extractor may infer a **source-only Player
receiver** from a direct `@minecraft/server`
`world.afterEvents.playerSpawn.subscribe(event => ...)` site.
The documented `PlayerSpawnAfterEvent.player` property is a `Player`;
`PlayerJoinAfterEvent` is **not** interchangeable. A locally shadowed
`world` alias, unknown imported event, or a callback whose event
parameter is rebound is insufficient source evidence.

A same-file **non-exported** helper parameter may inherit the source
`Player` candidate only when exactly one direct call forwards that
exact event's `event.player`, with no other/indirect uses of the helper,
nested same-name declaration, source event shadow, or reassignment of
the helper parameter. A helper with ambiguous or missing invocation
identity retains UNKNOWN, regardless of function/parameter names.
This is deliberately NOT general interprocedural inference. No call site
becomes an executed event, audio feedback delivery, gameplay outcome,
or runtime actor ownership by virtue of this source proof.

In the separate [developer-practice reference context](./developer-practice-context.md),
a typed `Player.playSound` can create a source `audio-feedback`
**investigation hint**. Matching a method's spelling alone is not
sufficient: a bundled receiver alias, custom method, or unknown
function parameter must abstain. This rule is general across maps
and does not select semantics by map names.

**Evidence ceiling:** owner/consumer source integration is separate
from repository TypeScript tests and Minecraft execution. Real-world
JavaScript source can confirm an authored handoff but cannot prove
`world.afterEvents.playerSpawn` fired, the helper ran, or a player
heard a sound.

## Dynamic properties

Dynamic-property use is tracked by operation and literal property ID when available. Computed IDs remain present as an access with unknown ID.

This supports future correlation with world DB dynamic-property records without making DB semantics part of the script parser.

## Compatibility model

Script API compatibility is evaluated through separate evidence lanes rather than one guessed version flag:

```text
module / track
symbol lifecycle
receiver inference
call signature
return contract
property mutability
enum backing value
execution privilege
observed usage
```

Unknown dynamic/computed behavior remains unknown unless bounded static analysis proves it.

## Module and track

Distinguish:
- stable;
- beta / prerelease;
- internal / experimental;
- unknown.

A recognized symbol is not automatically valid for the module version declared by the pack.

## Symbol lifecycle

Methods, events, receiver properties, enum members, and imported types may be:

```text
active
deprecated
removed
unknown
```

Lifecycle is distinct from call-signature or return-contract changes.

Unknown identifiers are not assumed compatible or incompatible.

## Symbol/version matrix

Availability is evaluated at symbol granularity.

Examples of covered evidence classes include:
- event symbols;
- direct singleton methods;
- bounded receiver-backed methods/properties;
- named-import enum members;
- imported types.

Receiver inference is intentionally bounded to evidence-backed flows such as direct world/dimension results, scoreboard surfaces, supported array element flow, simple local helper returns, and explicit supported receiver annotations.

This is not a general TypeScript type checker.

## Signature migrations

A surviving symbol may change accepted arguments.

The analyzer retains:
- argument count;
- coarse argument kinds;
- spread presence;
- canonical receiver;
- source location.

Deterministic mismatches may produce compatibility diagnostics. Ambiguous spread/dynamic call shapes remain unknown.

## Return contracts

Some APIs remain available while their result becomes optional or otherwise changes safety requirements.

Analyze result use such as:

```text
ignored
assigned
returned
dereferenced
optional-dereferenced
non-null-asserted
guarded-assigned
unguarded-assigned
```

Recognize only bounded local guards that are structurally provable. Reassignment or arbitrary interprocedural flow ends that proof.

## Property and enum compatibility

Treat separately:
- writable → readonly transitions;
- property availability/lifecycle;
- enum member lifecycle;
- enum backing-value changes when explicit literal comparisons make the value semantically relevant.

A changed backing value is different from a removed enum member.

## Execution privilege

Separate:
- early/startup execution;
- restricted before-event execution;
- default after-event execution;
- custom-command/restricted callback contexts when evidence exists.

A syntactically valid mutation can still be illegal in its execution privilege.

Unknown methods are not assumed safe merely because no restricted-execution rule exists.

## Usage inventory

Per-map and portfolio inspection should retain observed Script API usage by symbol kind and evidence quality.

Useful fields include:
- occurrence count;
- source files;
- known vs unclassified state;
- receiver inference quality;
- lifecycle metadata;
- call-shape distribution;
- result-use distribution;
- relevant enum literal-comparison distribution.

Observed-but-unclassified symbols are knowledge backlog, not map defects.

Promotion into compatibility knowledge requires:
1. correct parser classification;
2. authoritative version/lifecycle provenance;
3. the smallest evidence-backed rule;
4. regression coverage.

## Noise control

Do not double-count semantic surfaces already owned elsewhere.

For example, event-container properties such as `world.beforeEvents` and `world.afterEvents` are represented through event subscriptions rather than generic property usage.

Aliases from named imports should resolve to canonical symbols where statically provable. Dynamic namespace/computed access remains unclassified.

## Static coverage boundary

Do not expand static compatibility into domains it cannot prove:

- runtime-generated/reflection-style access;
- arbitrary interprocedural type flow;
- semantic behavior changes with identical syntax;
- engine scheduling;
- chunk/simulation timing;
- entity AI;
- multiplayer interleavings;
- native-world behavior.

Those route to selected-artifact, differential, runtime, or live-game evidence.

## Completion rule

Static Script API coverage is complete only relative to the current evidence-backed rule set and observed usage.

New rules are usage/evidence driven. Do not create speculative API matrices solely for apparent completeness.