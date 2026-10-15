# Report System Next — Locked Design Entry

**Work mode:** NEW SYSTEM DESIGN ONLY. This directory is a proposed, isolated reporting product contract, **not** an implementation of the older Bug Tracker and not a claim that a new report application runs.

**Design version:** `1.0.0` — **layout and report structure frozen for implementation**. The immutable Git commit that first adds this pack, plus the verified blob identity below, is the baseline. New chats must not freely redesign it.

## Start a new chat here

Use this exact directory as the source of design continuity:

`https://github.com/MIVUBI-STD/M-Lazy-Developer/tree/Local/planning/report-system-next`

Suggested instruction: **"Lanjutkan pengembangan Report System Next menggunakan LOCKED-DESIGN.md dan layout.lock.json versi 1.0.0. Dilarang mengubah sistem report lama, urutan UI, label, schema, atau palet tanpa persetujuan eksplisit saya. Pin GitHub Local HEAD sebelum bekerja."**

## Read order

1. [LOCKED-DESIGN.md](./LOCKED-DESIGN.md) — human product and acceptance rules.
2. [layout.lock.json](./layout.lock.json) — machine-readable identity, layout, labels, colors, ordering, workflow, and acceptance.
3. [report.schema.json](./report.schema.json) — **new** canonical report contract (JSON Schema Draft 2020-12).
4. [tester-workspace.schema.json](./tester-workspace.schema.json) — user-entered tester observations, separate from source facts.
5. [example.report.json](./example.report.json) — deliberately **synthetic** example, not a real Minecraft audit.
6. [reference.html](./reference.html) — static **design reference**, not a working test form, HTML publisher, or generated production report.

### Pinned baseline identities

The initial `layout.lock.json` content is Git blob `c958b33054722c2884e791e5b4e811a7987d394d`. The new report JSON Schema is `cbc64bba748da661f2ec8f32a4af01a3c43e6230`. The tester workspace JSON Schema is `78cf4ae0abc9e5d3f468a47c34c4e031e21783ce`. The static design reference HTML is Git blob `2cce615368348cae8d77137867442f3f793fa584`. These immutable blob identities allow a future session to compare the design against the original, even if `Local` moves. Any intended design revision must be approved and assigned a new design version, not silently edited.

## What the design lock means

- **Locked now:** source-controlled layout, vocabulary, color/spacing tokens, report/workspace data contracts, ordering, meaning of statuses, and acceptance requirements. A new chat must read these files instead of inventing another style.
- **Not yet guaranteed:** exact rendered HTML, in-browser save, cross-browser pixels, or live integration. Those require the new deterministic renderer plus executable golden/visual/behavior tests. Merely saving documents to GitHub does **not** prove production enforcement.
- **Data can differ:** map identity, approved findings, cited evidence, observations, tester results and screenshots. The template may not change based on chat or model preference.
- **Old system remains untouched:** no changes to existing `tooling/bug-report-documents/`, `engine/packages/bug-report/`, old `docs/system/bug-tracker-ui.md`, `workspace/projects/*/output/`, or legacy schemas. No regeneration/migration unless separately authorized.
- **No source facts invented:** unknown data stays unknown; evidence authority, tester actions and repair closure remain separate.

## Next independent construction milestone

Implement **a new renderer in its own module/namespace** consuming only `report.schema.json`-valid inputs, producing identical canonical JSON and generated HTML for identical inputs under the same lock, then test against a golden output and `reference.html`. Do not point it at existing report files or rewrite old components during the design phase.

**State:** DESIGN LOCKED / SOURCE CONTRACTS COMMITTED; IMPLEMENTATION AND BROWSER ACCEPTANCE NOT EXECUTED.
