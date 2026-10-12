# Game Design Contract

Used before gameplay bug discovery.

## Purpose

Reconstruct the selected world version as a player experience before classifying defects.

## Required Model

```text
Selected World
→ Objective
→ Win Condition
→ Lose Condition
→ Gameplay Flow
→ State Transitions
→ Reset Rules
→ Preserve Rules
→ Progression Rules
→ Multiplayer Rules
→ Bug Discovery
```

## Minimum Questions

- What is the player trying to achieve?
- What makes the player win?
- What makes the player fail?
- Which progress resets?
- Which progress persists?
- How does the player move from one state to another?

Do not classify implementation anomalies as bugs before this contract exists.

## REA-derived investigation

Apply these questions inside the existing UNDERSTAND/MODEL work, not as a second
map audit, graph, proof ledger, or report. REA is an external investigation
reference/provider; Minecraft semantics remain owned by our existing analyzers,
Semantic IR, Gameplay Intent, Scenario Graph and proof gate.

### Route by the evidence actually needed

For a complete source repository, inspect the pinned source directly. REA's own
skill explicitly excludes ordinary source-repository architecture analysis.
For an exact shipped package, extracted JavaScript bundle, binary or runtime
question not answered by source, use an actually available REA capability with
its advertised schema. A skill file is not a connected MCP server. Do not run
setup/readiness repeatedly or require a user PC, runner, deployment or new
production dependency. Lack of a callable provider limits that operation only.
Bedrock NBT, LevelDB, command blocks, pack activation and Minecraft scheduling
still require our format/domain owners; a generic REA graph does not replace them.

### Trace a mechanic rather than collecting matching names

Start from one player-visible objective or a precisely located source operation.
Trace forward through trigger, guard, receiver/owner, state/resource mutation,
consumer, terminal/recovery path and player feedback. Trace backwards from the
claimed result to its prerequisites as a counter-check. Use exact existing node,
edge and source identities. Follow cross-file imports, parameters and actual
call sites; a similar name, source co-location, connected graph or function
return does not prove causality, guard feasibility, execution or game victory.

Read the relevant configuration, dialogue, locale, entity or structure beside
the code when it changes the question. Distinguish expected design, implemented
source behavior and observed behavior. A developer-reference pattern supplies a
question, not a map rule. Separate independent gameplay modes only when actual
ownership/entry evidence establishes their boundaries; do not merge roots merely
to satisfy a single-entry closure check.

### Retain evidence once and preserve every material question

Reuse the matching artifact SHA, source location, analysis revision and existing
evidence record. Read a summary, then the exact unanswered source/graph region.
For real REA output preserve its `evidence_id`, provider/profile, authority,
coverage, limitations and residual unknowns; never invent these fields for a
manual review. Page a retained result instead of rerunning its producer.
A fully delivered page is not complete source coverage.

Represent unanswered questions using existing `GameplayIntentUnknown` and
`AuditObligation` fields: the exact question/reason, affected subject/component,
source evidence, missing proof and smallest discriminating validation action.
Keep supporting and contradicting sources visible in the same evidence context.
Unbound questions, missing node identities and stale selections remain unresolved.
A partial priority list of material unknowns cannot erase the other unknowns;
explicit non-material tolerance is scope-specific, and material evidence wins
when classifications conflict. An unmapped finding remains visible as residue.

### Challenge the explanation before closure

Try one relevant counterexample: another owner with the same label, a missing
call target, a guard rejecting the action, retry/reuse, an intentional alternative,
or a failure between resource debit and effect delivery. Preserve valid source
paths even when an unrelated frontier is incomplete, but do not claim absence
from an incomplete search. REA's traversal assumes upstream admission: its raw
function is not a validator for arbitrary seeds/graphs. Reuse the reasoning
principle, not every helper's unstated trust assumptions.

Use independent frozen mechanic expectations for real-map evaluation, including
negative controls and intentional unknowns. Renaming/reordering that preserves
meaning should not change the chosen explanation; removal of a real evidence
source must lower confidence rather than create an invented replacement.
Node counts, zero findings, regression replay and a finite passing test set do
not establish whole-map comprehension.

### Operator result and stop

Present game design, evidence-backed deviations, and the exact remaining
questions. Explain which source establishes each material claim and what could
refute it. Keep source reachability separate from runtime behavior. A blocked
canonical audit, unrouted residue or contradictory arena finding cannot justify
`NOT_APPLICABLE` from non-detection. A derived terminal status still relies on
the canonical audit's evidence; it is not independent absence or safety proof.
Stop the scoped question when it is answered or its precise remaining authority
is established. Whole-map closure still requires the existing mandatory audit
contract; unresolved roots, semantic scope or live behavior remain explicit.

### Pinned external references (reference, not gameplay authority)

Reviewed REA revision: `f611d8ce722cd36345e9ff83b9669ef2e7fe57a9`.

- [Target routing and staged investigation](https://github.com/morluto/rea/blob/f611d8ce722cd36345e9ff83b9669ef2e7fe57a9/.agents/skills/reverse-engineer-anything/SKILL.md)
- [Evidence, comparison and unknown lifecycle](https://github.com/morluto/rea/blob/f611d8ce722cd36345e9ff83b9669ef2e7fe57a9/.agents/skills/reverse-engineer-anything/references/evidence-workflows.md)
- [Source feature traversal](https://github.com/morluto/rea/blob/f611d8ce722cd36345e9ff83b9669ef2e7fe57a9/src/domain/javascript/javascriptFeatureTraversal.ts)
