# Golden Bug Tracker

This directory freezes the approved Bug Tracker presentation so future reports reproduce the same UI instead of redesigning it.

## Files

- `GOLDEN-UI.md` — normative visual, hierarchy, state, source-card, level, export, and prompt-leak contract.
- `golden-ui-contract.json` — machine-readable locked UI tokens/behavior.
- `empty-workspace.json` — zero-data starting state. It intentionally contains no map issues, tester notes, fixed state, or attachments.
- `legacy-source-locked.html` — recovered historical visual reference only; contains legacy report data and is never used as the next report's filled-data template.
- `legacy-source-recovery.md` — provenance and usage boundary for the recovered legacy source.

## Required generation flow

```text
Approved/current report data
→ validate unique IDs + source bindings
→ merge into empty workspace model
→ render with GOLDEN-UI contract
→ validate HTML/JSON parity
→ deliver standalone HTML + complete JSON
```

Never use a previously filled report as the next report's template.

The template authority is the empty workspace plus the golden UI contract. Report-specific data is injected only at generation time.

## Hard invariants

1. No redesign during report generation.
2. Maps default collapsed.
3. Issues default collapsed.
4. Multi-level maps remain one map with separated level subsections.
5. Every map/level requires both Drive Folder and World File.
6. Expanded issue remains one continuous card.
7. State colors are fixed: white idle, blue active, amber Needs Verify, green Fixed.
8. Tester state is separate from canonical issue facts.
9. Export HTML and Export JSON contain the same report and tester state.
10. Visible UI contains no prompts, reasoning traces, or internal orchestration copy.

## Data reset rule

Golden/template files are always zero-data. Never commit:
- project-specific issues;
- tester notes;
- tester fixed checkboxes;
- evidence screenshots;
- exported browser state.

Those belong only to generated report artifacts or explicit approved report data.

## Repository context

The renderer/report must remain compatible with:
- `workspace/README.md`
- `engine/packages/bug-report/PREVIEW.md`
- `engine/packages/bug-report/COPY.md`
- `docs/analysis/master-selected-map-audit-workflow.md`
- `docs/analysis/mandatory-audit-procedure.md`

Bug Report V2 remains the approved persisted issue authority. Golden UI owns presentation only.