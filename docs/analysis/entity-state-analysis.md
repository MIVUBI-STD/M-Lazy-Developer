---
id: document.analysis.entity-state-analysis
class: DOCUMENT
domain: analysis
role: DOMAIN
authority: CANONICAL
lifecycle: ACTIVE
---

# Entity State Analysis

Entity JSON is now parsed into explicit possible-state candidates before knowledge checks run.

## Parsed model

The entity analyzer extracts:

- description identifier;
- runtime_identifier;
- format_version;
- base components;
- component groups;
- event add/remove mutations;
- nested event triggers.

## State candidates

The initial conservative graph builds:

- base state;
- each individual component-group state;
- each event-added multi-group state.

Unrelated component groups are not merged automatically.

This prevents a common false-negative pattern where one group appears to satisfy the prerequisites of an unrelated group even though both are never active together.

## Knowledge evaluation

`analyzeEntityWithKnowledge()` evaluates each state candidate against the effective Bedrock/Education knowledge profile.

A finding includes the exact state/group/event context where the documented prerequisite is missing.

## Pack-local loot/equipment reference integrity

The existing `ParsedEntityDefinition` captures authored `minecraft:loot.table`
and `minecraft:equipment.table` values in both base components and each
component group. The canonical references analyzer now compares **literal
`loot_tables/...` paths** with source-indexed JSON definitions in the same
selected artifact **and the same behavior pack**, then contributes typed
`REFERENCES` edges to the existing inspection `SemanticGraph`.

Every reference edge retains the **owning entity's JSON Pointer**, including
the actual component-group name. One packaged match resolves the selected
source reference; none is an **unresolved package-local source reference**;
multiple identical candidate source owners remain ambiguous. A file in
another pack, another revision/artifact, or with a similar basename never
satisfies this relation. Unsupported, computed or non-local paths are not
guessed. The ordinary `referenceDiagnostics` consumer records unresolved
source references through the existing diagnostics path.

This resolution verifies **file availability in the selected package only**.
It does not establish component-group activation, a spawn event, equipment
application, a mob's attack behavior, or that a missing package file is
unavailable from built-in Minecraft/host content. In particular, an
unresolved packaged loot-table reference is not automatically a BUG or a
player-facing failure. Source counterproof, applicable platform facts and
event/target reachability are separately required. This generic contract is
independent of any map ID or historical bug.

## Current boundary

This is possible-state analysis, not exact runtime state reconstruction.

Randomize/sequence/filter semantics and event timing are parsed conservatively. Runtime evidence remains necessary to prove which state was active during a real gameplay failure.

## Semantic capability analysis

Entity state analysis also owns static semantic capability reasoning across attack, targeting, navigation, sensors, and internal event reachability.

### Attack and sensor semantics

Recognized attack families include melee, delayed/melee-box, ranged, and fire-at-target behavior. Prerequisite reasoning is state-specific; for example a ranged behavior may require a shooter capability, while melee behavior may require an attack/damage capability.

Sensors are modeled as conditional event emitters:

```text
sensor condition
→ event
→ component-group transition
→ resulting entity state/capabilities
```

Static analysis proves configuration/reachability structure, not that a runtime condition became true.

### Target acquisition

Targeting analysis extracts configured entity target groups, family filters, distance limits, visibility/reachability constraints, reselection behavior, and reevaluation settings.

A movement/navigation goal without a valid target provider must not be mistaken for a pure pathfinding problem.

### Navigation capability

Navigation capabilities are derived from the active candidate state's navigation component, including door/path/water/swim/walk/climb/fly-related capabilities where present.

Variant identity and individual path flags remain separate evidence.

A behavior prerequisite is checked against the actual candidate state, not merely against component names found somewhere in the file.

### Entity event reachability

Internal event graphs validate:

```text
sensor/event root
→ defined entity event
→ nested trigger event
→ component-group add/remove
```

Undefined events or groups are strong structural contradictions. A defined event that is not reachable from known internal roots is informational only because external commands, animation controllers, scripts, spawn logic, or engine behavior may still trigger it.

### Knowledge relations

Entity semantic reasoning may use relations such as:

```text
requires
requires-any
produces
activates
deactivates
gates
supersedes
delayed-until-tick
runtime-built-in
```

These relations constrain known prerequisites/capabilities. They do not turn possible-state analysis into exact runtime reconstruction.

## Boundary

This owner remains static and conservative:

- component groups are not merged unless a reachable state transition supports the combination;
- runtime identifiers may imply engine-owned behavior not visible in JSON;
- randomize/sequence/filter timing remains conservative;
- actual active runtime state still requires runtime evidence when source proof cannot decide it.
## Platform knowledge

Minecraft platform facts referenced by this analysis are owned by:

- [Entity](../../engine/knowledge/entity-runtime/entity-bedrock.json)
- [Entity Runtime](../../engine/knowledge/entity-runtime/entity-runtime-bedrock.json)

This document owns audit/failure-model guidance. The linked knowledge files own platform facts and applicability.