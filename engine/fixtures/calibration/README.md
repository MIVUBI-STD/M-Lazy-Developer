# Gameplay Understanding Calibration Corpus

This directory stores metadata and normalized calibration baselines only.

It MUST NOT contain proprietary `.mcworld` binaries.

## Purpose

The corpus is used to measure whether M-Bedrock-Dev can reconstruct gameplay meaning across heterogeneous authored worlds without hardcoding map-specific answers.

A corpus case describes:

- an external artifact filename;
- its source-shape category;
- learning dimensions that the artifact exercises.

It does not declare expected node IDs, bug labels, or root causes.

## Run

Place/materialize the external sample worlds in one local directory, then run:

```text
npm run cli -- corpus-calibrate fixtures/calibration/gameplay-understanding-samples.json <artifact-root>
```

The result is a normalized understanding fingerprint per map plus aggregate corpus coverage.

## How samples may inform engine development

The eight source-style sample entries are **calibration questions**, not authored game rules or a verified complete design for those worlds. Reuse one canonical source→IR→Intent→Scenario path for all of them. A source-shape label (`explicit-source`, `modular-compiled`, `bundled-minified`) may stratify evaluation but must never select prewritten mechanic meaning. New/unknown source authoring styles must be retained as evidence gaps rather than rejected for not matching a listed genre.

For a proposed fix, write down the generic relation that failed, exact source/subject/effect IDs that should prove it, a source-backed negative with no such relation, and a contrasting source style where the change must remain safe. Never optimize directly for the map-specific `assertions` numbers; they are historical regression review signals, not quality targets. Fingerprint drift, node counts and `unknown intent = 0` cannot establish that the model understood the actual game.

Scoring is owned by `engine/reliability/corpus/`; full external maps require an independently frozen, schema-valid expectation and an authentic canonical audit output before any product-quality claim. Do not store proprietary client map binaries here or import benchmark expectations into production source.

## Baselines

`baselines/` contains normalized reports from known engine revisions. They contain metrics only, not world content.

A change in a baseline is an investigation signal, not semantic truth. In particular:

- more nodes is not automatically better;
- fewer nodes is not automatically worse;
- a lost authored concept, new unknown blocker, or lost spatial route profile deserves review;
- intentional semantic corrections may legitimately change the fingerprint.

Calibration must never become map-name hardcoding.


## Reviewed assertions

A case may declare bounded `assertions` for reviewed semantic properties, such as:

- a maximum false phase count after a precision correction;
- a minimum authored route profile/point count;
- a minimum derived route-corridor count;
- retention of a reviewed state/outcome surface;
- fail-closed handling of unresolved/minified policy predicates.

Assertions are **review signals**, not map-specific gameplay truth. They must describe generic semantic properties discovered from evidence, and they should be revised when stronger extraction legitimately improves the model.

A failed assertion requires investigation. It does not by itself prove a product defect or a parser regression.
