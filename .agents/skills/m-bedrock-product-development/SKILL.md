---
name: m-bedrock-product-development
description: >
  Develop Lazy-Developer product features, architecture, UI, or tooling using existing canonical owners; not map bug audit or detector-specific development.
---

# M-Bedrock Product Development

**Lane:** DEVELOPMENT / PRODUCT SYSTEM

## Purpose

Implement bounded **GitHub source/knowledge/contract** changes to Lazy-Developer itself. **This is a ChatGPT-native checker; no application has been built or operated.** The canonical development process belongs to `docs/system/development-discipline.md`, not this skill. An `apps/` source path or optional Node CLI does not create an app or justify a localtest/Node24 prerequisite for ChatGPT analysis.

## Entry criteria

Use for product, architecture, application, tooling, or general engine work. For improvements specifically to reusable detection, use `m-bedrock-detection-development`.

## Allowed actions

- inspect the pinned `Local` implementation and applicable owners;
- implement a complete, justified integration slice across existing owners rather than patching one test-sized symptom at a time;
- during an unfinished architecture BUILD, preserve existing tests and defer routine test authoring/execution until the production path is integrated;
- review source/consumer consistency at the available evidence ceiling and publish a coherent bounded commit.

## Forbidden actions

- run a selected-map bug audit or modify an original/working target map;
- treat an unsupported hypothesis as confirmed defect;
- create parallel owners, registries, or state stores without evidence;
- claim that a user-facing app exists, a localtest is needed, a programmatic audit ran, or Minecraft runtime proof was obtained without actual corresponding execution.

## Mandatory operating style

Apply `docs/system/development-discipline.md#development-operating-standard` at task intake, before material edits, and at completion. Normalize unclear prompts without inventing requirements; preserve minimal context loading and existing ownership. 

## Procedure

Use DEFINE → INVESTIGATE → DESIGN → IMPLEMENT → VERIFY → COMMIT & STOP from the canonical development discipline. When requested to finish architecture first, treat VERIFY as source-level integration review until the acceptance boundary; do not create a separate testing lane or initiate CI. Open SPEC.md, SOURCES.md, or EVAL.md only for the relevant decision, not as automatic startup context.

## Output contract

Report changed canonical owner(s), achieved outcome, evidence and limitations, verified commit SHA, and bounded unresolved issue if any. No separate development status database or skill-specific persisted report.

## Handoff

Detector-specific improvement → Detection Development, only by explicit scope decision. Map bug audit or target repair → their dedicated lane, never automatically.

## STOP

Stop once the agreed change is committed with matching proof. Do not extend into adjacent cleanup or workflow changes.
