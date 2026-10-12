# Fall of the Pillager Level 1 v1.1.0 — ChatGPT cross-style gameplay source review

**Evidence class:** `CHATGPT_DIRECT_SELECTED_ARTIFACT_SOURCE_INSPECTION`. This is a read-only source/intent comparison, **NOT** an application execution, `runSelectedMapAudit()` result, approved Bug Report V2, full-map precision/recall score, or observed Minecraft gameplay. No user PC, Node 24, external runner, or simulated engine output was used.

| Selected artifact evidence | Exact source |
|---|---|
| Name | `Fall of the Pillager v1.1.0.mcworld` |
| SHA-256 of original ZIP bytes | `6df1be2f50404a0b89c2fb08f4d90a4c02eb4d51123ff9c5e03e9860b99938b1` |
| File size | 7,653,334 bytes |
| Authenticated file source | Google Drive ID `1K6ZDxz-gwGOmRU92dBZTkZNOkFZL3Y8d` (read-only download) |
| GitHub source/knowledge baseline | `MIVUBI-STD/M-Lazy-Developer`, branch `Local`, commit `6140955fc267014c9518892d5a4f201ed0208773` |
| Project binding | `workspace/projects/fall-of-the-pillager/project.json`, Level 1 is **already bound to this exact v1.1.0 SHA**. Level 2 has another ID/version and was not audited. |
| Evaluation purpose | Contrast a one-bundle, 45-line minified/compiled script against the separately examined modular Defense Challenge v1.1.5. No seed-map hardcoding or benchmark leakage. |

## 1. Direct selected-artifact source inventory

The ZIP contains **346 entries, including 287 actual files** and 8,709,341 total uncompressed bytes. The full selected source inventory was obtained read-only.

| Source family | Direct observation and disposition |
|---|---|
| Script | **1** `.js` bundle: `behavior_packs/offense-level-1_bp/scripts/main.js` (**165,244 UTF-8 characters / 45 physical lines**). Source contains ES module imports of `@minecraft/server` and `@minecraft/server-ui`, many minified local identifiers, retained methods/source strings and authored stage configuration. Exact **line:column** (or character offset) is required: line 45 alone spans approximately 49,676 characters. |
| JSON | **137/137** JSON files parse successfully. Includes authored BP entities, dialogue, items, loot tables, resource-pack render/animation/UI definitions, and world pack bindings. **Parseability is NOT semantic correctness.** |
| Minecraft `.mcfunction` | **0** entries. Authored gameplay commands are predominantly embedded in the compiled JS recipe/stage data and events. No function files must be invented because the map is named “Level 1”. |
| Structures | **5/5** `.mcstructure` files decoded in full as little-endian NBT containers: four `daigon/offense_npc_{0,1,2,3}` 1×1×1 structures and `castle_door` 3×8×5. This verifies exported NBT framing/dimensions, not that any structure loaded at runtime. |
| World `level.dat` | Whole little-endian NBT root parsed (**126 properties**, complete 3,206-byte payload). Snapshot values: `LevelName=Fall of the Pillager v1.1.0`, `GameType=2`, `Difficulty=2`, `MultiplayerGame=0`, `educationFeaturesEnabled=1`, `doimmediaterespawn=0`, `commandblocksenabled=1`. These are saved export settings, **not** evidence of actual multiplayer hosting, gameplay or SDK compatibility. |
| Native DB | `db/` contains `.ldb` tables, `CURRENT` and MANIFEST files, but this review **did not decode all LevelDB world/chunk/entity key families**. Six physical arena geometry/parity is UNKNOWN for this artifact and must not inherit Defense's native parity result. |
| Manifest | BP `manifest.json` version `[1,1,0]`, script entry `scripts/main.js`, declared `@minecraft/server=2.3.0`, `@minecraft/server-ui=2.0.0`, minimum engine `[1,21,130]`. The bundle's authored project target is `education`. These are declared source/config facts, not proof of an installed Minecraft runtime. |

### Minified source locator convention

`JS` below means the exact exported `behavior_packs/offense-level-1_bp/scripts/main.js`. A reference `JS:L45:C17408` points to the **physical file line 45, 1-based column 17408**, not the original TypeScript (which is not in this artifact). For JSON documents, quote the selected file plus a JSON Pointer. For localized text, quote actual `.lang` line numbers. Never score a minified source claim from a whole-line ID when multiple distinct effects share the line.

## 2. Source-grounded gameplay blueprint (authored semantics, NOT live play)

This artifact is **not simply generic PvP**. Its authored `E` project description says “Offense Level 1”, the localized player guide says to save villagers and take down pillagers, and the global source setup writes `gameRules.pvp=false` (`JS:L2:C769`, `JS:L45:C29321`; `resource_packs/offense-level-1_rp/texts/en_US.lang:4-5`). The Drive folder name containing “PvP” is not a gameplay contract and does not justify a friendly-fire BUG claim.

| Stage / gameplay scope | Reconstructed authored behavior | Selected-artifact source |
|---|---|---|
| Arena admission and ready | Six arenas `arena_1..arena_6`, Z offsets `0,336,672,1008,1344,1680`, **maxPlayers=5** each. Member `join()` rejects full/already-present/non-waiting membership; `toggle()` maintains ready status; only a non-empty fully ready party enters countdown, authored as `countdownTicks=100`. **30 slots are declared, not observed concurrent player capacity.** | `JS:L2:C4584` (`R`), `JS:L2:C5110` (`K`), `JS:L45:C29883` (ready-item event) |
| Preload / session setup | `Se` uses per-arena `K` sessions, a map of active games and a shared `loading` preparation owner. `prepare(e)` attempts `tickingarea add` and checks chunk readiness before cinematic, aborting that arena on failure/timeout. **Unlike Defense v1.1.5, the loading failure is an authored abort path here, not an optional lease warning; neither says what actually happens under load.** | `JS:L45:C29173`, `JS:L45:C36481`, `JS:L45:C39071` |
| Four-stage player-facing journey | Localized instructions define: **1.** break through outpost barricade; **2.** clear fort, defeat boss, obtain key and rescue/interview villager; **3.** advance to the castle and bridge; **4.** fight pillagers/king and destroy pillager flags. Stage data defines wave groups **2 / 2 / 2 / 3** for stages 1–4, respectively; wave counts and enemy spawn recipes are **authored configuration only**. | `resource_packs/offense-level-1_rp/texts/en_US.lang:15-38`; `JS:L20:C1052` (stage data); `JS:L25:C3495` (setup); `JS:L30:C967` (wave continuation) |
| NPC and quest transitions | Villager `dialogue` contains the rescue scene, asks what happened and advances related stage events. The shop dialogue routes three player choices to item/enchant/upgrade events. An actual compiled-script event listener translates those events into stage/shop handlers. **NPC dialogue wording alone is not a proven reachable player branch; this item is a cross-source authored link.** | `behavior_packs/offense-level-1_bp/dialogue/villager.dialogue.json` `/minecraft:npc_dialogue/scenes/0` and `/scenes/1`; `dialogue/shop.dialogue.json` `/minecraft:npc_dialogue/scenes/0`; `JS:L21:C11841`, `JS:L30:C15858`, `JS:L45:C38711` |
| Equipment, shop and score | `nt` source declares food, golden apples, potions, arrows, enchant and upgrades. At this exact version `minecraft:golden_apple` **costs 6 coins**; `pillager_coin.json` provides 2–4 coins per declared loot roll, boss/king tables offer larger ranges. Scoring has authored stage bases `100,200,300,400` plus kill/death/time contributions. Player purchases check and deduct actual held coins; overflow from `container.addItem` is placed on the ground. | `JS:L20:C14739` (shop), `JS:L20:C23621` (scoring), `JS:L45:C372` (purchase), BP `loot_tables/entities/pillager_coin.json` and other loot tables |
| Knockdown and teammate revive | `dataDrivenEntityTrigger` with `daigon:died` adds `knockdown`. `be` declares **8-second knockdown**, **3-block revive radius**, **3-second held revive**, and `isReviving()` demands a **different, non-knocked, same-dimension, same-session owner who is sneaking and in range**. Player `daigon:recover` removes the knockdown component group. Runtime completion remains unobserved. | `JS:L45:C14030`, `JS:L45:C17408`; `behavior_packs/offense-level-1_bp/entities/player.json` `/minecraft:entity/events/daigon:knockdown` and `/daigon:recover` |
| Stage terminal outcome | Stage 4 completion sets a finish scoreboard, schedules fireworks and calls `this.context.finish("victory")` after bounded delayed work. The global session manager records outcomes and transitions members back to lobby on stop/abort. A authored route to victory is **not** proof players can reach it. | `JS:L25:C7275`, `JS:L25:C7899`, `JS:L45:C43649`, `JS:L45:C45108` |
| Session save / recovery | `checkpoint_` arena dynamic properties store versioned running-session metadata; `recover(e)` validates member list, arena offset, stage setup and saved generation before attempting restoration. `graceExpired()` also handles all-party-offline timeout. This is not identical to a “disconnect always resets everything” contract, and runtime reconnect correctness remains UNKNOWN. | `JS:L2:C5110`, `JS:L45:C29832`, `JS:L45:C46945` |
| Arena state scoping | ScoreboardManager `M.participant("game")` maps a source-global objective participant label to the current arena ID; command rewriting `Ke()` shifts position and selector scope based on arena definition. Thus the presence of the word “game” or world scoreboard **alone does not prove global shared player state**. Full per-instance isolation still needs examination of each effect and runtime. | `JS:L20:C107`, `JS:L2:C7068` |

## 3. One direct source-reference contradiction

### FOP-L1-SOURCE-01 — Missing ranged pillager equipment loot table

**Proven condition:** the actual selected BP does **not contain** `loot_tables/entities/pillager_gear.json`, even though `daigon:pillager`'s ranged group declares this exact table. The scan visited all **137** JSON files and checked all **9** directly authored BP `minecraft:equipment.table` / `minecraft:loot.table` strings beginning with `loot_tables/`; **8 resolve in the package and 1 does not**.

- Source reference: `behavior_packs/offense-level-1_bp/entities/pillager.json` JSON Pointer `/minecraft:entity/component_groups/minecraft:ranged_attack/minecraft:equipment/table`.
- Source target: `loot_tables/entities/pillager_gear.json` — **absent from this exact selected ZIP**; no similarly named packaged file supplies this exact path.
- Relevant activation candidates: the same entity's `minecraft:ranged_mode` and `daigon:ranged_mode_medium` events add `minecraft:ranged_attack`. Stage spawn data uses `event:"minecraft:ranged_mode"` and `event:i("ranged_mode_medium")` for pillager spawns. The `fe.spawnMob()` source applies authored spawn events through `triggerEvent()`. `JS:L20:C1588` (first ranged stage action), `JS:L21:C6049` (OffenseManager); entity JSON Pointers `/minecraft:entity/events/minecraft:ranged_mode` and `/minecraft:entity/events/daigon:ranged_mode_medium`.
- **Classification:** `STATIC_MISSING_REFERENCED_CONTENT` — selected-source configuration contradiction **proven**. Whether the particular ranged mob fails to equip, uses fallback equipment, fails to shoot, or logs a warning is **NOT OBSERVED**. Do not promote this automatically into a player-facing, severity-assigned BUG or claim every ranged mob fails.
- **Potential correction hypothesis, NOT applied:** supply the intended referenced loot table or point the ranged group at a valid intended table after the authored equipment design is confirmed. Original archive and active Bug Report V2 are unchanged.

This is a **generalizable cross-source reference-integrity test**: resolve entity/component-group content references to actual pack files, then separately require source activation and proof of player impact. It is not a map-name rule.

## 4. Counter-evidence and anti-false-positive checks

| Claim that should NOT be promoted | Counter-evidence in selected v1.1.0 | Safe disposition |
|---|---|---|
| “This is PvP; friendly fire must be enabled.” | The bundle explicitly writes `_.gameRules.pvp=!1` (`JS:L45:C29321`), while text describes cooperative pillager offense. A Google Drive folder title is not an authored game rule. | **REJECT** claim from folder/name |
| “A knocked player can revive themselves by sneaking.” | `isReviving(e,t)` rejects `e.id===t.id` and requires `!e.hasTag("knockdown")` and same-session ownership (`JS:L45:C17408`). | **REJECT** static self-revive assertion; runtime still unobserved |
| “Pillager targeting explicitly includes knocked players.” | `minecraft:behavior.nearest_attackable_target` and `hurt_by_target` include `has_tag != knockdown` conditions for candidate victims in `entities/pillager.json`. This proves authored filtering, **not** that stale runtime targets can never remain. | **REJECT** source-configuration assertion; remain UNKNOWN for actual AI |
| “Six arenas mean six successful simultaneous five-player sessions.” | Six `R` definitions × five max members each are source-declared capacity, while `Se.prepare()` can abort on native ticking area or stage loading failure. | **REJECT** unobserved delivery proof |
| “The saved `MultiplayerGame=0` proves a hosting failure.” | The value is stored `level.dat` export metadata only; host/session behavior was not observed. | **REJECT** runtime conclusion |
| “Full inventory necessarily loses paid shop items.” | `purchaseItem()` puts any `container.addItem()` return overflow in-world and notifies the buyer (`JS:L45:C372`). Exceptional/error branches have not all been proved, so no blanket transaction safety conclusion follows either. | **REJECT** this specific asserted failure; other delivery exceptions UNKNOWN |
| “This map has Defense v1.1.5 mechanics just because both have six arenas.” | This is **four-stage offensive rescue/barricade/king-and-flags** gameplay, Z-translated arena copies, with one compiled bundle; Defense is fifteen-stage flag-defense gameplay with modular scripts and X-translated arenas. | **REJECT** sample-based transfer |

## 5. Contrast with the prior genuine Defense v1.1.5 source review

The comparison is against the **independently examined selected-artefact evidence** saved at `workspace/projects/defense-challenge/evidence/v1.1.5/chatgpt-source-review.md`, **not** old BUG/status metadata and not automated TypeScript benchmark scores.

| Dimension | Defense v1.1.5 | This Fall of the Pillager L1 v1.1.0 | What generalizes |
|---|---|---|---|
| JavaScript authoring style | 8 linked script modules and literal `import()` requests | One 165,244-character / 45-line compiled and compressed/minified bundle | Exact archive identity, source references and authored call/guard tracing; **do not depend on function/module names alone** |
| Arena layout | Six source-mapped X offsets | Six source-mapped Z offsets of 336 blocks | Normalize geometry/coordinates using **the current map's authored offset**; never reuse Defense constants |
| Player-facing goal | Defend a flag through fifteen levels | Advance through outpost/fort/castle, rescue villager and defeat king/flags across four stages | Cross-reference script events, localized UI, dialogue and entity definitions before guessing intent |
| Static source controls | Shop/residency conditional failure distinguished from runtime | Missing equipment table; source-limited no-self-revive/no-PvP; mandatory native preload abort on failure | Compare **specific actual branches**, not a generic “shop”/“arena”/“wave” category |
| Native world proof | Scoped LevelDB six-arena volume decoded and parity compared | Level.dat and five mcstructure NBT files decoded; native LevelDB arena geometry **not** yet decoded | Admit only what was actually decoded; do not transfer physical parity across different archives |
| Runtime evidence | No observed six-arena/multiplayer gameplay | No observed six-arena/multiplayer gameplay | Keep **source truth ≠ runtime truth** in both styles |

### What this cross-style evaluation demonstrates and does NOT

- **DEMONSTRATED NOW:** Direct ChatGPT selected-artifact inspection can reconstruct substantially different authored gameplay flows from both modular and minified JS when it correlates player-facing text/dialogue, entity JSON, stage data, event handlers, score/ownership and native configuration. It can reject several plausible but unsupported claims and find a missing source reference without hardcoded map names. Source evidence must use **column precision** for minified files.
- **NOT DEMONSTRATED:** automatic TypeScript engine execution, exhaustive full-map understanding, first-pass independent precision/recall, entity runtime navigation, 30-player concurrency, all native LevelDB arena geometry, or correctness under Minecraft runtime.

## 6. Open obligations and exact STOP

1. **STATIC_CROSS_REFERENCE_DIVERGENCE:** verify intended `minecraft:ranged_attack` equipment behavior for the one absent table before deciding gameplay priority. Source absence is proven; actual delivered consequences are not.
2. **NATIVE_WORLD_UNINSPECTED:** inspect this archive's LevelDB physical arena copies, block/entity state and any geometry/NBT activation needed for current source claims. The saved world has not been spatially compared with Defense.
3. **SOURCE_FLOW_PARTIAL:** stage event/flag/door/wave ordering, complete inventory/score mutations and all recovery paths are not exhaustively closed. Stage configuration is not proof of successful game progression.
4. **RUNTIME_REQUIRED:** real multiplayer admission, native ticking area allocation, hostile movement/targeting, stage completion, late reconnect, knockdown and item grant under load.
5. **GENERALIZATION_LIMIT:** two genuine worlds with different source styles are a useful qualitative contrast, but they do **not** establish generic checker accuracy or a numeric semantic benchmark. A third independently selected and scored style would strengthen validation if actually available.

**No source engine, map binary, project identity, Level 1 approved `bug-report.json`, or frozen expectation has been modified.** This selected-world evidence can inform subsequent source-only checker improvement, but a separate explicitly authorized SYSTEM DEVELOPMENT decision must choose the canonical owner when a repeated, general technical gap is proved.
