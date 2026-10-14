---
name: m-bedrock-target-repair
description: >
  Repair an approved gameplay bug or apply an explicit design change to a target working copy. No detector development.
---

# Lazy-Developer Target Repair

**Lane:** OPERATIONAL / TARGET REPAIR

## Purpose

Apply only an explicitly approved repair to a working copy, preserving all unrelated gameplay behavior and the original artifact.

## Entry criteria

Bug repair requires:

```text
Approved Bug
+ violated Gameplay Contract
+ Repair Contract
  - Must Change
  - Must Preserve
```

Intentional modification requires an explicit user-approved behavior change; it is separate from bug repair.

## Workflow

```text
Approved authority
→ smallest target owner
→ authorized PatchTransaction
→ preconditions
→ working-copy mutation
→ defect verification
→ preservation verification
→ runtime/package residue
```

## Rules

- Confirmed Defect alone is not repair authority.
- Internal `repair-eligible` means causal repair readiness only, not user approval.
- PatchTransaction describes a mutation; it does not define intended gameplay.
- Must Change proves what the fix must remove.
- Must Preserve protects approved gameplay semantics.
- Original artifacts remain immutable.
- Symptom removal without preservation proof is not completion.

## Allowed actions

Inspect the approved target and its repair/preservation contract, apply the smallest transactional patch to a working copy, verify the requested change, and package the result with proof limits.

## Forbidden actions

- repair an unapproved bug;
- invent expected behavior outside the selected-version Gameplay Contract;
- mutate without Must Change + Must Preserve;
- silently change intended gameplay;
- widen into unrelated cleanup;
- change detector capability in this lane.

## Output contract

Validate against `../../schemas/target-repair-output.schema.json`.

## Handoff

Detection weakness → separate `m-bedrock-detection-development` handoff.

## Canonical references

- `../../../docs/product/flow.md`
- `../../../docs/repair/README.md`

## STOP

Stop on stale fingerprint, ambiguous target, workspace escape, missing approval/preservation authority, or after requested repair + matching verification.