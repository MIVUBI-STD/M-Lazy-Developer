# Bug Report Copy Contract

This document is the single authority for wording quality in new Bug Report V2 content.

The goal is operational clarity, not prose completeness.

A tester must be able to scan a bug and answer:

1. What failed?
2. What gameplay impact does it cause?
3. How do I trigger and prove it in-game?
4. What supported solution exists?

Expected and Observed remain canonical evidence fields, but they are secondary to the tester-facing scan path.

## Canonical field roles

### Title

Purpose: identify one primary failure.

Rules:

- one line;
- maximum 90 characters;
- name the failure, not the investigation;
- avoid generic titles such as "Bug found", "Issue with map", or "Something is wrong".

Good:

```text
Arena cannot restart after match cleanup
```

### Problem / Issue

Purpose: let the reader understand **what is wrong and why it matters** in one scan.

Required structure:

```text
Affected feature/object + concrete failure + gameplay impact
```

Rules:

- maximum 220 characters;
- start from the affected gameplay feature, object, or state;
- state the failure as an observable fact;
- include the player/game impact when it is not already obvious;
- use one sentence whenever possible;
- do not lead with investigation language such as "there may be", "appears to", "possible issue", "seems", or "needs checking";
- do not describe root-cause speculation here;
- do not repeat Expected or Observed verbatim.

Good:

```text
The arena keeps the previous session ownership after match end, so a new match cannot start.
```

Bad:

```text
There appears to be an issue with arena cleanup that may affect restarting.
```

### Expected

Purpose: state intended behavior.

Rules:

- maximum 180 characters;
- describe the intended result only.

### Observed

Purpose: state the actual result.

Rules:

- maximum 180 characters;
- describe what actually happens;
- must not duplicate Expected.

### Reproduction — displayed as Bug Trigger (In-Game)

Purpose: give a tester who does not read code a short, exact path to **trigger the bug in Minecraft and visibly confirm it**.

For AI-found defects, these steps must come from the evidence-bound `BugTriggerDraft → compileBugTrigger()` path. The draft must declare a gameplay basis supported by matching authored-gameplay or runtime-gameplay evidence. Do not mechanically translate source-code statements into gameplay instructions. The compiler reuses `reviewTesterReproductionSteps()` from `copy-quality.ts`, the same tester-language rule used by final Bug Report V2. This bounded lexical gate cannot prove a location, action, timing window, or outcome actually exists in Minecraft; source evidence and human review remain necessary.

Required structure:

```text
1. Starting condition — where / when / how many players / required item when relevant
2. Player action
3. Player action or state transition
4. Observable failure — exactly what wrong result the tester must see
```

Rules:

- required for every new bug that enters the tester-facing report;
- use 2–5 steps;
- each step maximum 160 characters;
- describe only actions and states available in-game;
- name the relevant place, phase, object, item, UI, player count, or trigger when needed;
- use player-facing verbs such as Enter, Join, Walk, Interact, Press, Buy, Place, Break, Die, Respawn, Finish, Return, Start, Wait, or equivalent;
- step 1 must establish enough starting context to begin without guessing when location, phase, player count, role, item, or prior state matters;
- one action or state transition per step;
- avoid hidden setup: if the tester must first obtain an item, enter a phase, join a team, wait for a timer, or use multiple players, say so explicitly;
- the final step must be an observable failure statement and tell the tester exactly what wrong result should be visible;
- prefer a final form such as `Confirm <wrong visible result>` or `Observe <wrong visible result>`;
- never end the trigger on an action alone; the last step is the proof condition;
- do not reference source files, scripts, functions, methods, classes, variables, internal IDs, or architecture;
- do not ask the tester to inspect code, logs, or implementation state;
- do not use vague steps such as "test it", "check the bug", "verify the logic", or "see if it happens";
- if multiplayer is required, state the required player count;
- if a specific game phase or location is required, state it explicitly;
- if no tester-verifiable in-game path exists yet, keep the finding internal instead of presenting it as a tester-ready bug.

Good:

```text
1. Join the arena with 2 players.
2. Finish the match normally.
3. Return both players to the lobby.
4. Start the same arena again.
5. Confirm the new match does not start.
```

Bad:

```text
1. Check the session cleanup function.
2. Verify the arena variable is still set.
```

Also bad:

```text
1. Complete the objective.
2. Walk to the gate.
```

The second example never tells the tester what failed. A valid final step would state: `Confirm the gate remains closed and progression is blocked.`

### AI Analysis — displayed as Technical Analysis

Purpose: preserve the evidence-backed technical explanation needed by engineering without burdening the tester-facing scan layer.

Rules:

- maximum 1800 normalized characters;
- simple bugs should remain concise;
- complex findings may use short structured sections such as Root Cause, Constraint, Evidence Convergence, Repair Direction, and Verification;
- explain the technical basis, not the entire proof history;
- do not repeat Problem/Issue;
- internal evidence graph IDs and orchestration details are forbidden;
- multiline structure is allowed and should be preserved by full chat/HTML presentation.

### Suggested Fix — displayed as Solution

Purpose: let the reader understand **what should be changed to resolve the issue** without reading the technical analysis first.

Required structure:

```text
Direct action + repair target + intended result
```

Rules:

- maximum 220 characters;
- begin with a direct repair verb when practical: Clear, Reset, Restore, Rebind, Sync, Move, Remove, Add, Guard, Update, Replace, Prevent, or equivalent;
- identify the state, object, function, or behavior being changed;
- state the intended result when the action alone could be ambiguous;
- do not use vague actions such as "check", "investigate", "review", "look into", "fix the issue", or "adjust as needed";
- do not restate the Issue;
- must remain advisory;
- never invent a fix when repair evidence is insufficient.

Good:

```text
Clear arena session ownership at match cleanup so the arena returns to an available state.
```

Bad:

```text
Investigate the cleanup logic and fix the issue.
```

### Relevant Code

Purpose: point to where the developer should inspect first.

Rules:

- maximum three primary locations;
- each reason maximum 180 characters;
- prefer precise authored source locations.

### Must Preserve

Purpose: state proven repair invariants.

Rules:

- each item maximum 160 characters;
- include only supported invariants;
- do not use as a generic checklist.

## Density limits

These limits apply to newly created reports. Compatibility imports remain readable even when older reports exceed them.

| Field | Limit |
|---|---:|
| Title | 90 chars |
| Problem | 220 chars |
| Expected | 180 chars |
| Observed | 180 chars |
| Reproduction step | 160 chars |
| AI Analysis / Technical Analysis | 1800 chars |
| Suggested Fix | 220 chars |
| Relevant Code reason | 180 chars |
| Must Preserve item | 160 chars |

## Duplication rule

After whitespace normalization, these fields must not be exact duplicates of one another:

- Problem
- Expected
- Observed

The same fact may be related across fields, but each field must perform its own role.

## Ownership

- `COPY.md` owns wording quality.
- `copy-quality.ts` owns deterministic enforcement for newly created reports.
- `PREVIEW.md` owns presentation hierarchy.
- Bug Report V2 remains the only persisted report format.

Do not duplicate these rules in UI, agent skills, or workspace documentation. Those surfaces should reference this contract.
