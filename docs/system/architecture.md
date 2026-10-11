---
id: document.system.architecture
class: DOCUMENT
domain: system
role: ARCHITECTURE
authority: CANONICAL
lifecycle: ACTIVE
---

# Architecture

Lazy-Developer uses semantic ownership and one-way dependency direction.

## Semantic reasoning path

```text
artifact + archive
        ↓
project-model
        ↓
current map Game Design
        ↓
scoped Gameplay Contract / design readiness
        ↓
analyzers
        ↓
semantic graph + Semantic IR
        ↓
Gameplay Intent Model
        ↓
Behavioral World Model
        ↓
Diagnostic Reasoning
        ↓
Reliability Search / Runtime Lab
        ↓
causal reasoning
        ↓
repair + preservation verification
        ↓
orchestrator
```

## Game-centric Discovery production spine

The production route is an integrated **source-to-understanding** contract, not a sequence of independent gates that each demand new tests:

```text
selected Minecraft artifact
→ physical/source inventory (adapters + analyzers/discovery)
→ parsed authored behavior and exact provenance (domain analyzers)
→ normalized execution/state/temporal evidence (semantic-ir)
→ authored gameplay purpose/mechanics (gameplay-intent)
→ transitions, dependencies, outcomes (behavior-model + graph)
→ scenario composition / gameplay-world understanding (existing orchestrator)
→ navigable Game → Systems → Mechanics → Flows/States → Scenarios
→ evidence-backed audit/report projection
```

Ownership constraints:
- Physical file accounting is not game-understanding completeness. `OPEN` structural gaps and `PARTIAL` recorded uncertainty must never be silently rewritten as confirmed semantics.
- `semantic-ir` describes source execution/state; `gameplay-intent` assigns player-facing purpose. Neither alone proves the complete game or runtime behavior.
- Scenario presets guide inspection; they must not invent undiscovered mechanics or replace source-grounded relationships. The scenario graph and architecture navigation are derived views, not competing canonical model stores.
- Discovery Challenger compares raw material source facts against modeled, evidence-backed behaviors, and retains unowned facts as visible gaps. It does not require endless per-edge patching to publish independent, scoped evidence.
- Existing report/admission owners control final publication. An incomplete model may expose scoped evidence, but never claim whole-map closure.
- During construction, prioritize wiring and consolidating this full spine before adding detectors, another graph layer, micro-fixtures or test harnesses. End-to-end acceptance is a later integration boundary; runtime claims still require runtime evidence.

### Game-centric operator projection

The canonical `deriveGameplayArchitectureNavigation()` projection exposes `gameplayStructure` from the existing scenario graph and exact selected-artifact evidence. The production `runSelectedMapAudit()` composes this once, retaining it on `SelectedMapAuditRun.gameplayArchitecture` and passing the same derived structure to the optional, backward-compatible `MapAuditOutputV2.gameplayStructure` field.

- **Game:** existing `game` subject IDs, or an empty list when none were grounded. The same projection includes a compact `subjects` and `scenarios` lookup so every relationship endpoint/scenario ID remains navigable in the standalone report without reconstructing another graph.
- **Systems:** existing runtime-domain components. `provenFeatureIds` require an exact PROVEN causal link; `coPlacedFeatureIds` are only navigational scenario co-placement.
- **Features:** existing mechanic, objective, phase, lifecycle and outcome subjects. Each exposes source evidence, scenario membership, typed dependency/effect/transition/outcome links with their original status, and IR traces matched by exact evidence.
- **Unmodeled:** unplaced features and unmatched technical Semantic IR evidence remain visible. Empty association is not positive proof of feature absence.
- **Authority:** this is a rebuildable view. It does not infer missing player design, promote unresolved relationships to PROVEN, change the mandatory audit gates or claim runtime truth.

During BUILD, complete missing authored semantics at existing source/intent/behavior owners before inventing deeper feature taxonomies, test fixtures, or alternate graph stores. Integration acceptance remains deferred until the full path is ready.

### Classified function and guarded-return provenance

The existing `Gameplay Intent` producer now retains parser-observed named function regions on already classified subjects and links them to unique Semantic IR region identities using artifact, source module, region and owner. This supplies navigable execution traces without claiming that functions actually ran or that lexical labels prove game design.

The source-grounded guarded return path reconciles `ScriptGuardedOutcome.outcomeSource` with a unique `ScriptReturnOutcome.source` at the exact authored range, execution region, property and value. The existing Intent outcome/state nodes and guarded `requires` relationships inherit that precise return witness. Ambiguous or missing sites remain unresolved; no mechanic or second graph is invented.

### mcfunction-to-gameplay evidence continuity

The canonical `inspect.ts` passes its existing indexed `.mcfunction` sources into `buildGameplayIntentModel()` alongside the same Semantic IR. A classified function is linked only when its source identity matches a unique `mcfunction` execution region and the corresponding surface candidate already exists. Direct `function` invocations require an exact parsed command location and a uniquely resolved IR target. Scoreboard and tag operations use the existing normalized state-surface IDs and are represented as technical `resource` facts, not assumed scoring rules or player effects.

All new function-to-function and function-to-resource Intent relations remain `inferred`. Missing, ambiguous, or unclassified content remains evidence debt in the existing IR/Discovery Challenger. No second parser, scenario compiler, graph, or report authority is introduced.

### Effect-directed source reconstruction

`behavior-model/source-evidence.ts` now derives bounded, backward `SourceEffectSlice` records from existing Semantic IR state mutations, resource actions and authored returns. This follows CodeQL/Joern-style **principles** without installing an engine, adding a graph database or claiming CodeQL-level def-use precision.

For each authored effect/return the owner traverses *only uniquely identified resolved IR execution edges* backward toward event sources, script modules or uncalled mcfunctions; it retains a representative entry-to-effect edge chain, lexical/precedence guards, deferred/periodic boundaries, same-surface preceding read candidates and existing same-region source-ordered return associations. Hard per-effect limits cap depth, visited regions and entry candidates; truncation is surfaced as `TRUNCATED`. Missing ingress stays `NO_KNOWN_INGRESS`, **not** unreachable code or evidence of gameplay absence.

The existing `deriveGameplayArchitectureNavigation()` consumes these behavior-model slices once, connects effects to graph components only by exact evidence ID and separately labels feature associations encountered on a source-call path. It publishes them through the already-established `MapAuditOutputV2.gameplayStructure` view. Static path association is not player-facing gameplay meaning or PROVEN causality; unowned effect IDs remain explicit. Testing/CI are deferred until the integrated BUILD acceptance boundary.

### Authored command state and guarded source transitions

The canonical Semantic IR now processes scoreboard and tag reads/writes from
NPC dialogue button/open/close commands and BP animation/controller commands
with the same command analyzer and state operation authority already used by
mcfunction and script sources. Exact JSON-pointer command source identity
links each state operation to the authored dialogue/animation relation; both
the state operation and any world effect IDs are carried to Gameplay Intent
before inferred NPC interaction nodes are reconciled. State writes are authored
attempts, not actual score, progression or phase outcomes.

The existing Behavior Model owns direct literal dynamic-property
guarded-transition reconstruction. The Scenario Compiler now reuses its exact
read/write candidate records in the existing Scenario Graph and links them
to classified mechanic profiles *only* by the write operation's IR ID. The
operator-facing gameplayStructure exposes those same guarded source
candidates and their unresolved continuations. World-only graph refreshes
retain the original read/write evidence without fabricating new observations.
No source-local comparison or raw scoreboard operation is automatically
promoted into a proven game-rule, terminal condition or runtime state.

### Authored NPC dialogue interaction → exact command → IR source effects

The canonical dialogue parser retains JSON-pointer identities for scene
indices, displayed NPC/button text and each open/close/button command, even
when two scenes share a scene_tag. Its command analyzer receives the exact
command source location. The existing gameplay surface owner derives
dialogue-button-command / dialogue-scene-command relations from exact
button indices rather than semantic similarity between displayed words and
source symbols.

The existing Semantic IR normalizes these commands through its canonical
command analyzer and associates source-observed world effect IDs with the
dialogue relations. The Gameplay Intent owner admits an INFERRED NPC
interaction mechanic candidate only for a button with literal visible text
and an exact authored command site. It retains the matching world effects
and explicit unknown for objective, activation and runtime success. Unlabelled
buttons, scene open/close commands, and non-world-effect commands remain
technical evidence, not manufactured player objectives.

The existing Gameplay Scenario Compiler automatically consumes these
classified interaction candidates and exact IR IDs through existing feature
reconstruction; Map Audit V2 receives the original derived gameplayStructure.
The translation .lang parser now splits real CR/LF lines instead of literal
backslash sequences, preserving authored line locators. No second graph,
intent store, classifier or runtime evaluator is introduced.

### Evidence-linked mechanic profiles and authored journey candidates

The existing Scenario Compiler now reconciles classified Gameplay Intent
mechanic/objective/phase/lifecycle/outcome subjects with exact source-flow
step, IR edge and authored behavior-relation IDs. Only current selected-artifact
evidence can ground a profile; a source filename, matching label or scenario
co-placement does not establish ownership. Each observed mechanic profile
preserves original directional Intent relationship IDs, authored/inferred
status, and explicit gaps for activation, state/effect and outcome.

The same Scenario Graph also provides *bounded candidate chains* following
selected-artifact evidence on authored/inferred directed transitions,
recoveries, effects and terminal relations. Chain order is **authored relation
order**, not runtime chronology. Cycles, sink nodes and depth/path truncation
are explicit, and an outcome label is not proof of successful gameplay
completion. Disconnected authored relation cycles remain represented separately from rooted
chains. Missing activation/state/outcome dimensions apply only to appropriate
feature roles; a declared outcome does not require a separate win relation
to itself. Path/depth caps remain explicit and do not imply closure.

These profiles and candidate routes appear in the existing
Gameplay Architecture Navigation / Map Audit V2 gameplayStructure only.
They do not create new mechanic/phase nodes, playable scenarios, causal
PROVEN edges, audit closure or a replacement map-agnostic game-flow checklist.

This is a structural link toward mechanic identification, not general
automatic understanding of unknown game purpose, successful runtime
transitions, multiplayer correctness or full-stage lifecycle.

### Source-backed flow candidates in the canonical scenario graph

The scenario compiler now consumes the SAME selected-artifact Semantic IR as
Gameplay Intent and derives source-flow candidates from its exact entry-region
traces, state operations, resource actions, object return sites and world-effect
attempts. Intraregion source order, branch arms, unresolved execution edges,
temporal boundaries and exact behavior-animation effect IDs remain distinct;
no cross-region order or player outcome is inferred. Isolated authored animation
regions with material source effects remain visible without inventing runnable
event-dispatch edges.

These observations belong to the existing GameplayScenarioGraph as
sourceFlowCandidates, deliberately NOT to its playable scenarios, knowledge
receipts, causal proof or closure statuses. The existing Gameplay Architecture
Navigation reconciles their exact source evidence with classified feature IDs,
unclassified effects and only contextual matching scenarios. Unknown intent
evidence remains visible; a named mechanic is never manufactured by a
technical effect. World-only graph recomposition preserves these source facts.

Map Audit V2 continues to expose its longstanding generic audit-stage checklist
as gameplayFlow but now explicitly labels its basis as
AUDIT_CHECKLIST_NOT_OBSERVED_GAMEPLAY. The actual source candidates are under
gameplayStructure.sourceFlowCandidates. This prevents interpreting the generic
audit checklist as a discovered player journey while keeping its existing
consumer contract. Full mechanic meaning and game lifecycle are still
unverified until evidence supports them.

### Behavior animation timelines and normalized source effects

The canonical entity analyzer also parses behavior-pack animations by exact
animation identifier, numeric nonnegative authored timepoint and literal
command source JSON pointer. Unsupported command entries and large/invalid
timelines remain explicit IR uncertainty evidence; repeated commands are
not deduplicated by command text. The existing cross-source resolver now binds
scripts.animate aliases and controller animation aliases to a UNIQUE same-pack
behavior animation, never to a matching filename or a resource-pack animation.

Both animation timeline commands and already-extracted controller on_entry/
on_exit commands are passed to the SAME canonical command analyzer used by
mcfunctions and scripts. The existing Semantic IR stores source-observed world
effect attempts in isolated behavior-animation regions, retaining authored
timeline seconds and source location. Corresponding authored behavior relations
carry exact world-effect IDs so Gameplay Intent and the existing derived Game
Architecture projection can navigate command-to-effect evidence without
inventing a confirmed execution path.

An authored command can be present even when activation, Molang predicates,
scheduler/tick timing, entity binding, permissions, world effects, or the
player-facing mechanic remain unknown. No second parser/graph, flow controller,
runtime evaluator, or deployment dependency is introduced.

### Authored cross-source entity/controller behavior references

Entity descriptions now preserve exact animation alias targets and explicitly
activated scripts.animate entries. The existing entity analyzer reads
behavior-pack controller state names, ordered Molang transitions, referenced
animation aliases, and on-entry/on-exit commands without evaluating Molang.

The existing entity-event evidence owner reconciles these definitions through
same-pack controller identifiers, exact entity-local event names, and typed
script/mcfunction command triggers. Unscoped command targets are only possible
matches, never a confirmed entity binding. It records their source and target
provenance as authored behavior relations in the canonical Semantic IR.

Gameplay Intent keeps these facts as grouped unresolved behavioral meaning,
while the existing Game Architecture Navigation exposes the same IR relations
through its derived gameplayStructure projection. No branch activation,
animation playback, world mutation, complete mechanics or player-facing
outcome is inferred. The previous source semantic gaps for behavior animations
and controllers remain open until their downstream effects and cross-format
references are fully interpreted. No second parser/graph or runtime engine was
introduced.

### Structured Bedrock entity event semantics

The canonical entity parser preserves source-authored sequence, randomize,
filters, direct component-group add/remove and local event triggers as an
operator tree. Existing addGroups/removeGroups/triggerEvents arrays remain
MAY-reference inventories, never proof of simultaneous effects. Each operator
retains the selected entity JSON pointer.

The existing entity state-graph owner enumerates bounded group configurations:
sequences apply operations in order, randomized branches remain alternatives,
and filters yield possible apply/skip arms with explicit conditional context.
Unsupported operators, ambiguous mixed effects or truncated alternatives
become explicit static-analysis limits rather than fabricated composite states.
The entity knowledge and runtime-evidence consumers now expose source-path
limitations and identify event configurations as authored candidates rather
than observed gameplay. Triggered event IDs remain possible reference links,
not proof that a nested event actually executed.

Cross-event sequencing, property mutations, animation controller/Molang event
triggers, runtime weights, and Minecraft Education version-specific behavior
remain unresolved; this is not proof of complete entity gameplay.
No duplicate parser, semantic graph or reporting store is introduced.

### Minecraft authored world-effect sinks

The existing Semantic IR execution owner now normalizes **source-observed attempts** from canonical command, script method, spatial mutation and entity-event parsers into optional `worldEffects` records (spawn, teleport, block change, structure load, dialogue and entity event). Records carry exact source and execution-region IDs, kind, mechanism and evidence precision—not runtime success or game-design meaning. No second detector/parser is introduced.

Canonical forward source traces and behavior-model backward effect slices include these IDs. Gameplay Intent only links effect evidence when the same execution-region ID is owned by exactly one recognized, non-hypothetical source candidate. Unowned and ambiguous effects remain visible in the existing Game-Centric navigation and Map Audit V2 source-effect contract. Report publication and proof gates are unchanged.

### Per-mechanic source behavior paths

Source slicing now preserves alternative caller paths rather than using one global visited-region set that can suppress a second ingress. The traversal remains bounded by path states, depth and collected entry candidates; cycles and excess paths explicitly mark `TRUNCATED`. Every admitted path carries the exact call-site lexical/precedence guards, while resource action slices distinguish authored acquire from release (without claiming cleanup succeeded).

The existing game-centric `features[].sourceBehaviorPaths` is a **derived view over the existing effect slices**. Each effect candidate presents source entry, call edges, guard evidence, preceding same-surface reads, authored resource acquire/release, and guarded source-ordered return IDs where available. `DIRECT_EFFECT_EVIDENCE` is reserved for exact effect IDs on the recognized feature; `CALL_PATH_CONTEXT` identifies a feature encountered on a possible call path and is not proof of gameplay ownership. This projection does not merge incompatible branch outcomes or invent a terminal/recovery flow when source evidence is absent. Neither status constitutes real Minecraft execution.

### World effects and authored returns

The existing Behavior Model source-evidence owner now reconciles normalized Minecraft world-effect attempts and literal return sites only in the exact same execution region and source document, with complete and ordered source positions. An unguarded return permits only a `SOURCE_ORDER_CANDIDATE` claim, not effect success, gameplay causality or terminal proof. Guarded returns remain `UNRESOLVED` when world-effect records lack compatible exact branch ancestry.

The canonical backward `SourceEffectSlice.sourceOrderedOutcomeIds`, Scenario `observedSourceRelationships` and Discovery Challenger all consume this same reconciliation. There is no new parser, graph, report field or proof gate. Ambiguous source relationships remain explicit rather than being upgraded to PROVEN.

### Authored guard provenance for Minecraft world effects

The existing Script AST parser preserves lexical and preceding-exit guards for selected typed API calls, explicit `runCommand` sites, spatial mutations and entity-event triggers through exact call-source identity. The existing spatial world-mutation analyzer's output is now returned by `parseScriptFile` and reaches Semantic IR. Plain embedded command strings remain source content, not executed command evidence.

Semantic IR world effects retain the exact authored branch ancestry. Existing source execution traces place world effects on matching branch arms; backward effect slices expose their guards. The Behavior Model correlates each world-effect/return pair only when its source order, lexical branch arms and early-exit conditions are compatible. `precedingWorldEffectIds` preserves nearby evidence while `guardCompatibleWorldEffectIds` gives the bounded source-order subset. Scenario relationships classify each ID independently instead of borrowing proof from another effect. Even a compatible source path does not prove execution, causality, or gameplay design.

### Bounded intraregion source CFG and reaching definitions

The canonical Script AST parser now emits source-local CFG statement nodes for
sequential blocks, if/else branches, returns and throws, and opaque boundaries
for unsupported syntax or unknown side effects. The existing inspection
Semantic IR owns the normalized CFG and validates graph endpoint/region identity.
CFG projection is attached only to already identified execution regions; it
must not invent extra executable functions from declarations. Lexical block
identity is compared by canonical source coordinates, not object key order.
The Dataflow package owns a parser-independent forward union/kill worklist.
The Behavior Model alone translates imported world receiver identities,
source site matching and typed dynamic-property mutations into its transfers.
An opaque path,
alias ambiguity, wildcard write, incomplete statement identity or work cap
returns UNKNOWN rather than a reaching definition. The Behavior Model
consumes these results when relating exact guard reads to earlier writes;
conditional writes after branch joins can remain alternate reaching candidates
without inventing gameplay purpose or runtime outcomes. No second parser,
graph store or audit entrypoint is introduced.

This representation does NOT yet cover full switch/loop/try/async control
flow, indirect mutations, per-player aliases, callback/session lifetime,
runtime effect success or interprocedural fixpoint. Such cases retain the
source-order candidate ceiling and need further source/semantic reconciliation.

### Same-block source candidate supersession

The canonical Script AST parser now retains a statement-block identity and
ordinal for exact dynamic-property and resolved local-call sites. Only an
unshadowed named ESM import of Minecraft's `world` is treated as a stable
receiver candidate; player, arena, entity, property aliases, conditional calls,
and unknown ownership do not inherit singleton semantics.

The existing Dataflow owner performs bounded same-block source-order
supersession: a later **direct** world dynamic-property write in the same
lexical block can replace an earlier source candidate when the guard read
(or a resolved synchronous caller site) occurs afterward. The canonical
Behavior Model applies this to its existing guard-write/value handoffs and
per-ingress caller-write evidence. Caller-side candidates are grouped by
exact state surface and receiver, so different keys cannot shadow each other.
Existing Semantic IR validation also rejects malformed or cross-source
statement-block identities. No extra graph, storage, detector, report field
or new parsing pass is introduced.

The reduction is an authored-source candidate relation, not proof of
Minecraft execution, effective world mutation, generalized reaching definitions,
control-flow dominance across branches, or live session state. When source
identity, block spans or order are missing, preserve the prior candidates.
This is a bounded prerequisite to complete CFG/fixpoint reconstruction.

### Effect-first continuity for unclassified source behavior

The canonical Gameplay Intent producer now reconciles all observed selected-artifact
state, resource, return **and Minecraft world-effect** IDs against already
grounded gameplay subjects. Exact unowned effects remain per-entry
`GameplayIntentUnknown` evidence with a directly recorded IR entry-region
identity; raw world effects are never automatically renamed into gameplay
mechanics or made into scenario seeds.

The existing `deriveGameplayArchitectureNavigation()` uses those *same*
unknowns and the already-derived Behavior Model source-effect slices to expose
`gameplayStructure.uninterpretedSourceFlows` in Map Audit V2. Each record
navigates from its exact entry and missing-meaning evidence to effect kinds,
guarded source sites, potential outcomes, state handoffs, and only those
candidate call paths rooted at that exact entry. Material evidence without a
source-effect slice remains visible. Recognized feature links are context,
not newly proven gameplay ownership. This is a derived view, never a second
model, interpreter, mechanism catalog, or report authority.

No whole-game percentage, confirmed player journey, or Minecraft runtime
effect is inferred from these static technical flows.

### Source-local guard state provenance

The existing Script AST parser preserves exact lexical and preceding-exit guards on `getDynamicProperty` and `setDynamicProperty` calls; `semantic-ir-stage` carries them into the **existing** state operation records. No second symbol model or control-flow graph is created.

The canonical `deriveSourceEffectSlices()` now resolves exact state-read call spans *inside* an authored effect guard expression (`guardStateReadIds`) rather than assuming all nearby reads are preconditions. Where a literal dynamic-property surface, stable source receiver expression, exact function/document, source order and compatible guard ancestry all match, the view also records **candidate** earlier state writes (`candidateGuardStateWriteIds`). A reused expression is not guaranteed to be the same runtime object, so these remain source-level possible definitions—not reaching-def proof or game-causal truth. Wildcard keys, other regions, and inconsistent guards do not qualify. The existing Gameplay Architecture feature paths and optional Map Audit V2 schema consume this source evidence; unknowns and publication gates remain unchanged.

### Bounded interprocedural guard-state candidates

The existing `deriveSourceEffectSlices()` may now identify a preceding dynamic-property write in a **source-recorded caller** when the callee's effect guard contains an exact dynamic-property read. `candidateIngress[].candidateCallerStateWriteIds` is scoped to that ingress path, and `features[].sourceBehaviorPaths` exposes it without a new dataflow or graph owner.

Admission requires unique resolved *synchronous* call steps from the write's call edge to the target effect, identical selected-artifact identity, an earlier write site in the caller document/region, the same statically identified non-wildcard state surface and receiver hint, and compatible exact guard ancestry. Deferred/periodic/event edges after a write do not qualify. Object identity, state lifetime, aliasing, intervening mutations and runtime execution remain **UNPROVEN**: this is a source-order candidate, not reaching-definition proof or verified lifecycle behavior. Source-local candidate writes remain separate from caller-derived candidates.

### Scoped resource acquisition, release and return candidates

The canonical `behavior-model/source-evidence.ts` now derives `reconcileSourceResourceLifetimes()` directly from existing Semantic IR resource actions and returns. Its per-acquire `SourceResourceLifetimeCandidate` requires exact (non-wildcard) matching surface/key and owner region/document, acquire-before-release source order, compatible lexical/early-exit guards, and no intervening same-key acquisition. It exposes source-ordered candidate release IDs, candidate returns *after* those releases, and blocking reacquire evidence.

The existing `SourceEffectSlice` for each acquired resource consumes this reconciliation once, and existing `gameplayStructure.features[].sourceBehaviorPaths` projects the same candidate without new parser, ledger, graph, inference status, or lifecycle manager. Cross-region, deferred, wildcard, ambiguous, or missing action sites remain `UNRESOLVED` and cannot be called cleanup failures. A source-ordered release and return do not prove successful Minecraft side effects, terminal state, or arena reset; full runtime lifecycle remains unverified.

### Authored scalar state and source-grounded lifecycle handoffs

The existing Script parser now retains only **direct scalar literal arguments** to `setDynamicProperty`: quoted strings, numeric literals (including direct negative literals), and boolean literals. It does not evaluate variable references or arbitrary expressions. Semantic IR `StateOperation.writtenValue` holds the value and scalar kind on the same exact write operation identity; existing Script memory writes without a recognized scalar kind remain unchanged.

The canonical Behavior Model `deriveSourceEffectSlices()` now exposes `authoredStateValue` for each exact non-wildcard dynamic-property write. It also joins **already established** exact guard-read/prior-write candidates into `sourceLocalStateValueHandoffs` and each ingress's `candidateCallerStateValueHandoffs`. Every handoff carries the read ID, write ID, state surface, receiver hint, authored literal and value type, and whether it is source-local or a recorded synchronous caller. Scenario `features[].sourceBehaviorPaths` and existing Map Audit V2 schema project these values without another lifecycle store or coordinator.

A handoff is not a verified reaching definition, previous-state value, session phase transition, Minecraft runtime state, or successful cleanup. Unknown aliases, dynamic values, impossible branch combinations and runtime recovery remain unproven. No state named `waiting`, `active`, `finished` or `reset` is inferred without a directly authored literal and connected evidence. Integration tests remain deferred during BUILD.

### Directly guarded authored state transitions and declaration value correspondence

The canonical Script parser retains a **direct strict** `getDynamicProperty("key") === "from"` or `!==` scalar comparison as part of that original state-read AST site, with its exact comparison source range. The existing Semantic IR state operations preserve the read comparison and typed literal destination writes; authored transition-table declarations are normalized into the same Semantic IR source fact record set, without replacing the Gameplay Intent owner that already models permitted state edges.

The existing `Behavior Model` owner derives `reconcileSourceGuardedStateTransitions()` only when a write is syntactically controlled by that same exact comparison site and matching branch arm, on the exact same non-wildcard state surface, receiver, region/document and typed string value. The old compared value must differ from the new directly authored value. Prior guard conditions must agree; potential intervening same-surface writes are retained as `UNRESOLVED`. `coLocatedDeclarationIds` identifies only **same-document tables that happen to list this value pair**—it does not claim the table is invoked or bound to the property. No state is inferred from labels/names alone.

`SourceEffectSlice.guardedStateTransitionCandidates` and existing `features[].sourceBehaviorPaths` expose these bounded candidates through Map Audit Output V2, with exact read/write evidence and source-inference ceiling. A guarded write is not proof of actual runtime transition, complete control-flow path, state initialization, termination, cleanup, or recovery. Unsupported compound guards and untyped/dynamic values remain outside this candidate subset. No new graph, coordinator or lifecycle registry is introduced.

### Transition-source continuation to effects, returns and cleanup

The existing `reconcileSourceGuardedStateTransitions()` now follows each **source-grounded** state `from → to` candidate forward, rather than treating the state write itself as game completion. Its nested `continuation` records exact same-function post-write world-effect sites, resource release sites and authored return sites, **only when source order and exact lexical/precedence guard ancestry are compatible with that write**. Later unguarded code is not attributed to a conditional transition merely because it follows in the file.

For downstream functions, only a directly resolved `synchronous-call` edge authored after the state write and on a compatible guard path may contribute candidate callee world effects, resource releases and return sites. These targets are **call-body inventory**, not proven runtime results. Unresolved call targets, event dispatch and deferred/periodic boundaries remain in `unsupportedBoundaryEdgeIds`. Bounded target counts set `truncated` rather than silently asserting comprehensive coverage.

Pairs of source-authored resource release and later return sites come from the existing `reconcileSourceResourceOutcomes()` owner; both `sourceOrderedReleaseReturnPairs` and the target-local `releaseReturnPairs` retain exact action/return IDs. Merely listing release and return in the same callee is not itself promoted to a source-ordered pair.

The existing `SourceEffectSlice.guardedStateTransitionCandidates` and `features[].sourceBehaviorPaths` carry this same evidence through Map Audit Output V2 without another graph, lifecycle owner or report layer. A return is not a game terminal; a release is not successful cleanup; and a transition's authored label is not evidence of an arena session state. Proven runtime lifecycle and interprocedural def-use remain unknown.

### Deferred callback session-guard evidence, per source ingress

The canonical Script parser no longer classifies any generation-named comparison anywhere in a deferred callback as `explicit-generation-check`. The accepted source subset is now a **leading first-statement** `if (generationToken !== capturedToken) return/throw` (also allowing a single-statement block), with at least one token-like identifier and no alternate `else` branch. All other callback forms remain `unresolved`. This eliminates broad false-positive "protected" claims in existing Arena Lifecycle consumers, while a recognized early exit remains only a source-level candidate, not proof that tokens refer to the right session.

The canonical Behavior Model backward effect slicer now preserves each event/deferred/periodic boundary as `candidateIngress[].temporalBoundaryEvidence`: exact edge identity, scheduler, normalized source guard status, guard identifiers, and only exact schedule-source matches to already-observed deferred callback handle acquisitions. A matching release ID is obtained from the existing same-region resource lifetime reconciliation. This is never proof that `clearRun` succeeded, a callback executed, or a session/generation owner remained valid. Event dispatch and unrecognized deferred guards remain explicit unknown boundaries, not invented temporal causality.

The existing Gameplay Architecture `features[].sourceBehaviorPaths` and optional Map Audit V2 schema consume the same per-ingress boundary observations. No second async analyzer, graph owner, lifecycle registry or extra verifier was introduced. Full runtime session isolation, stale callback prevention and terminal/cleanup acceptance remain unexecuted.

### Source-level generation gates on actual asynchronous effect paths

An exact leading `if (generation !== capturedGeneration) return/throw` inside an inline deferred callback is now recorded with its original condition source range, as well as the previously preserved guard identifiers. Both operands must be authored reference expressions; comparisons to a constant, checks later in the callback, named callback bodies not resolved by the producer, or arbitrary conditional expressions remain `unresolved`. A matching variable name is never evidence of actual session ownership.

The existing Semantic IR scheduler edge carries `generationGuardSource`; `Behavior Model` backward `SourceEffectSlice.candidateIngress[].temporalBoundaryEvidence` reconciles it with the actual effect path. `sourceGateStatus` is `DIRECT_EFFECT_SITE_GATED` only when that exact guard is an authored necessary early-exit prerequisite on the effect site in the callback region, or `SYNCHRONOUS_CALL_SITE_GATED` when the exact guard precedes the **first** resolved synchronous call leaving the callback and there are no later async boundaries along that candidate path. Other paths are `UNRESOLVED`; guard evidence on a scheduling edge is not implicitly copied into downstream effects across temporal boundaries.

The existing arena deferred-mutation consumer also keeps its historical `protected` classification only when an exact leading mismatch guard is present and all discovered mutation regions are confined to that callback's region. Cross-function mutations without site-level guarded-call proof stay `unresolved`. This is deliberately conservative and does not prove generation token freshness, live arena/session owner identity, successful `clearRun`, lifecycle closure, or player-visible behavior. No new async manager, state store, graph, or report owner has been introduced. The existing Gameplay Architecture path and Map Audit Output V2 schema consume the same bounded evidence.

### Explicit generation mutations and deferred callback session references

The existing arena-authority AST analyzer already observes direct generation invalidations (`generation-invalidate`), including the literal authored `generationExpression`, exact statement site, and function region. These records are now normalized as optional `SemanticIr.state.generationInvalidations`; the callback parser also retains the two exact reference operands of a leading mismatch early exit, not just identifiers matching a regular expression.

Within the existing `SourceEffectSlice.candidateIngress[].temporalBoundaryEvidence`, `matchingGenerationInvalidationIds` lists only invalidations whose exact authored expression equals a callback guard operand and whose script path/artifact match the scheduling edge. `postScheduleCallerInvalidationIds` is a narrower subset: same scheduling caller execution region and exact source order schedule → invalidation. The `generationOwnerRelation` status distinguishes `CALLER_POST_SCHEDULE_CANDIDATE`, `EXPRESSION_MATCH_ONLY`, and `UNRESOLVED`. This is a *source-coincidence* measure, not proof of shared runtime object identity, token capture, session ownership or invalidation-before-callback execution. Multiple distinct arena instances may share the same source expression.

The new records reuse the canonical parser, Semantic IR and backward Behavior Model; Gameplay Scenario already projects the containing `temporalBoundaryEvidence` without a second lifecycle output authority. The Map Audit V2 contract is extended in place. Event, unresolved and deferred boundaries retain their existing path gating and unknown semantics. Terminal, cleanup and recovery success remain runtime-unverified; no manager, registry, new execution model, or dependency was introduced.

### Exact branch feasibility and per-ingress feature association

The canonical bounded backwards `deriveSourceEffectSlices()` now excludes a call-path extension when it requires both opposite arms of **the same exact authored guard location** in one synchronous evaluation segment, reusing the existing guard comparison helper. Event dispatch, deferred and periodic boundaries begin a separate evaluation segment; a guard at scheduling time is not treated as a guard in the callback at a later tick. This is a conservative source-path contradiction filter, NOT proof that a path is executable or that a missing path is unreachable. `excludedContradictoryPathCount` makes pruned alternatives visible in the existing effect slice and Map Audit V2 projection without an extra tracking owner. Paths excluded due to a source contradiction are not counted as truncation.

The canonical Gameplay Architecture `features[].sourceBehaviorPaths` now selects `CALL_PATH_CONTEXT` **per candidate ingress**, only where that specific candidate's `regionIds` includes an exact region evidence ID on the feature. The slice-wide `pathAssociatedFeatureIds` remains a union for navigation and does not authorize fabricating other paths for that feature. `DIRECT_EFFECT_EVIDENCE` still projects all admitted paths of an exactly bound effect; paths with no known ingress do not become spurious contextual associations. Neither relationship establishes the gameplay purpose or verified runtime execution.

This is a single owner-to-consumer correction across existing Behavior Model and Gameplay Scenario. It introduces no second CFG, registry, manager, or duplicated knowledge, and intentionally defers executable acceptance while the larger Discovery architecture is still in BUILD.

## Behavioral claim provenance

Behavior variables, transitions, and temporal properties may carry provenance with an explicit evidence ceiling:

```text
designed
inferred
documented
observed
intervention-supported
```

Designed Minecraft overlays are bound to explicit Map Game Design or authored Behavior Contracts. They are specifications to test, not claims that the engine has already been proven to behave that way.

A provenance audit reports unbound claims rather than silently accepting them.

## Concurrency semantics

Reliability search must not infer independence solely from declared reads/writes.

The concurrency layer can additionally consume:

- explicit happens-before edges;
- causal parent ordering;
- generation ordering;
- event-delivery ordering;
- hidden engine dependency surfaces.

Operations sharing a configured hidden engine surface are treated as dependent even when their explicit resources differ.

Examples include:

```text
event-ordering
deferred-callback-order
chunk-residency
network-input-order
```

Happens-before graphs must be acyclic. A cycle is a model error, not an empty valid schedule space.

## Separation of authorities

Game Design owns explicit intended gameplay for the current map/mode.

Gameplay Contract is a scoped derived working projection used by audit/repair. It is never a second persisted Game Design authority.

The semantic graph owns references/dependencies.

Semantic IR owns normalized source execution/state/scheduling structure.

Gameplay Intent owns evidence-backed reconstruction of authored mechanics, actors, objectives, phases, lifecycles, resources, spatial semantics, policies, outcomes, and explicit unknowns. It does not declare root cause.

The Behavioral World Model owns explicit semantic state, transitions, nondeterminism declarations, and temporal properties.

Diagnostic Reasoning owns competing explanations and evidence discrimination.

Reliability Search owns bounded state/schedule exploration.

Runtime Lab owns controlled empirical experiments.

No layer may silently promote its own representation into another proof authority.

## Orchestration boundary

The orchestrator composes semantic owners; it must not duplicate parser, graph, diagnostics, archive, compatibility, or domain-analysis semantics.

Canonical direction:

```text
artifact / source representation
→ adapters + analyzers
→ semantic/project models
→ gameplay understanding / diagnosis
→ repair / validation owners
→ orchestrator composition
→ app / report projection
```

Low-level owners remain authoritative for their domain semantics. Orchestration owns sequencing, composition, continuation, and cross-owner coordination only.

## Integrated analysis rule

Cross-domain analysis is built by composing evidence from existing owners rather than creating another all-purpose analyzer.

Examples include:
- manifest + script dependency compatibility;
- selector/state scope + arena ownership;
- structure/world evidence + gameplay topology;
- entity/navigation + chunk/simulation readiness;
- inventory/economy + lifecycle ownership.

A cross-domain rule may correlate evidence, but it does not take ownership away from the contributing analyzers.

## Conservative inference

Topology, runtime behavior, cross-domain state, and platform capability must remain evidence-bounded. Repeated patterns, parser success, or nearby healthy code do not by themselves prove gameplay correctness.

## Normalized project model

The normalized project model is the boundary between physical files and semantic analysis:

```text
artifact graph
→ file inventory
→ normalized components
→ semantic dependency graph
```

These layers are separate authorities.

Extracted files remain source truth. Normalized components and semantic graphs are derived/rebuildable truth and must remain traceable through source references.

Component identity should be stable across workspace relocation and based on semantic scope + identifier rather than absolute paths.

The project-model package may organize internal contracts, evidence, runtime normalization, and session continuity into subgroups, but those groups do not become separate semantic authorities.
## Knowledge access architecture

Repository information is accessed through one composable path:

```text
Task / Question
→ Router
→ Catalog
→ Graph
→ Retrieval
→ Context
→ Reasoning / Audit / Development
```

Each stage has one responsibility:

- Router — selects the initial domain/canonical owner.
- Catalog — resolves stable resource identity and metadata.
- Graph — expands only typed relationships relevant to the concern.
- Retrieval — ranks the bounded candidate set.
- Context — compiles the minimum evidence package.

This path supplements source ownership; it does not replace it.

### Management flow

New or changed information follows:

```text
Discover
→ Classify
→ Register
→ Relate
→ Validate
→ Consume
→ Update
→ Retire
```

A change is production-complete only when the affected resource remains reachable through its Router/consumer and its relationships remain valid.

### Retrieval order

Use structural evidence before semantic similarity:

```text
Router scope
→ canonical owner
→ Catalog identity
→ Graph neighbors
→ source/ownership structure
→ lexical ranking
→ optional semantic ranking
→ authority filtering
→ Context
```

Lexical ranking is repository-native and requires no external provider. Semantic ranking is optional enrichment after routing, graph, and structural/lexical narrowing.

Pure vector similarity must not search the entire repository as an unbounded first step.

### Document section indexing

H2/H3 headings in canonical documents are exposed as DERIVED Catalog resources. They retain the parent path and use a heading locator.

```text
DOCUMENT parent
→ derived H2/H3 section
→ Retrieval candidate
```

This enables bounded loading of large owners without fragmenting them into many files.

### Generated projections

Generated indexes and graphs are DERIVED.

They must be:

- deterministic when inputs are unchanged;
- rebuildable from canonical sources;
- safe to delete and regenerate;
- excluded from manual semantic editing;
- validated against current source identities.

### No management-layer proliferation

Do not introduce parallel responsibilities named Knowledge Manager, RAG Manager, Memory Manager, Context Manager, Docs Manager, or Graph Manager when the responsibility already belongs to Catalog, Graph, Retrieval, Context, or an existing canonical package.

Prefer extending existing graph, analysis-planner, knowledge, project-model, and orchestrator owners rather than creating a parallel subsystem.