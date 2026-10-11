# Minecraft Bedrock / Education Platform Knowledge

This directory contains **descriptive, evidence-backed Minecraft platform knowledge**.

Knowledge answers: **What does this Minecraft runtime support, expose, or do for the declared version/profile?**

It does not define map design and it does not own MIVUBI engineering requirements.

## Authority boundary

- Game Design → `engine/design/` + `engine/packages/game-design-spec/`
- Engineering/validation contracts → `engine/contracts/engineering/`
- Runtime observations → runtime evidence layers
- Repair decisions → repair/orchestrator

Global `*-policy.json` catalogs were migrated out of this directory. Repository verification forbids `project-policy` authority/classification here.

Platform knowledge keeps provenance, applicability, confidence, and contradictions explicit. UNKNOWN is preferable to invented behavior.


## Domain routing

Resolve the knowledge concept through `ownership.json` first, then read its owning JSON catalog. Each domain directory owns a group of platform facts, not a separate execution workflow. Stable fact IDs, source provenance, applicability and consumer bindings matter more than a catalog filename.

Production Knowledge loading/validation is owned by `engine/packages/knowledge/`; analysis decisions remain with the existing analyzer/diagnostic owners. `engine/reliability/catalogs/knowledge-detector-bindings.json` **declares** fact-to-analyzer/proof references. Its `analyzerPaths` and `proofPaths` are NOT execution traces, per-fact usage proof, or a requirement that each fact must have a dedicated detector. Declaration-only pointers are **excluded from the active Resource Graph**, because their module-level collapse artificially linked unrelated facts during retrieval. Exact knowledge ID lookup can still display these references separately. Genuine consumption must be established at the real knowledge-loading/evaluation and selected-map outcome boundary.

The current CLI audit wiring is an actual source-level connection: `apps/cli/src/main.ts` loads `engine/knowledge/` through `loadKnowledgeDirectory()` and passes the merged catalog as `knowledgeCatalog` to `runSelectedMapAudit()`. The inspection path passes the same input into `analyzeInspectionEntityKnowledge()` and `analyzeKnowledgeRuntime()`, where profile-sensitive Knowledge analysis occurs. This proves the catalog-to-inspection call path **in source**; it does not prove that every declared binding is consumed by its named analyzer, or that runtime/gameplay results have been executed. Evidence gaps remain explicit rather than being filled from another catalog.

Do not duplicate a fact into a second domain for convenience. When cross-domain behavior is involved, preserve the owning fact and relate it through canonical Graph/consumer mechanisms. Do not create subfolders for every mechanic until existing ownership cannot represent a demonstrated responsibility.

When two catalogs describe related mechanics, compare the **claim** and applicability before moving or deleting anything: a shared platform prerequisite and a domain-specific implication may be legitimately distinct. Preserve stable fact IDs and existing analyzer/proof bindings until their consumers are reconciled. Record unresolved overlaps in the canonical development plan rather than creating a second cross-domain catalog.

## Physical hierarchy

```text
knowledge/
├─ platform/
├─ world-engine/
├─ player-runtime/
├─ entity-runtime/
└─ gameplay-runtime/
```

The folder name is the semantic domain. `ownership.json` must match the physical placement exactly.


## Naming rule

Knowledge folders describe Minecraft runtime domains, never map-design domains.
