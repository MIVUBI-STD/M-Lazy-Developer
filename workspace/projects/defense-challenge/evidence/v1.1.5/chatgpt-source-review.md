# Defense Challenge v1.1.5 — ChatGPT selected-artifact source review

**Evidence class:** `CHATGPT_DIRECT_ARCHIVE_SOURCE_INSPECTION` (read-only, partial gameplay reconstruction). **NOT** a `runSelectedMapAudit()` result, `MapAuditOutputV2`, approved Bug Report V2, Minecraft session, or proof of app execution.

| Identity / binding | Value |
|---|---|
| Selected artifact | `Defense Challenge v1.1.5.mcworld` |
| SHA-256 verified from file bytes | `eb554476d26b7b9de949628d8efe00f12beb95669f6c424a2eb754b52d39f45c` |
| ZIP size | 24,032,943 bytes |
| Inspected on | 2026-10-12 (ChatGPT container, Python read-only ZIP/JSON/NBT/source examination) |
| GitHub knowledge baseline | `MIVUBI-STD/M-Lazy-Developer` / `Local` @ `083af036a8e623f86ee1a83f8c66e7fe8a29e1f2` |
| Distinct workspace current version | `workspace/projects/defense-challenge/project.json` still binds **v1.1.3** / a DIFFERENT SHA; this v1.1.5 review **is NOT the current project bug report**. No project binding, source archive, report status or approved finding was modified. |

## 1. Source inventory and actual inspection scope

The selected archive contains **529 ZIP entries** and approximately 127.8 million uncompressed bytes. Inventory and scoped direct decoding:

| Surface | Selected-archive source observation | Ceiling |
|---|---|---|
| JavaScript | **8** packaged `.js` files; entry `behavior_packs/BP/scripts/main.js`, 7 chunks | Major authored sections and named methods read. Not every expression/path has been semantically closed. No JS module executed. |
| Minecraft functions | **3** `.mcfunction` files in `functions/teleport/` | Source presence and commands inspectable; no in-world execution demonstrated. |
| JSON | **171/171** `.json` entries parsed successfully by strict JSON decoder. Includes **63 behavior-pack**, **106 resource-pack**, and **2 world pack-binding** JSON files | JSON parseability is not proof of valid gameplay semantics or complete per-entity analysis. |
| Structures | **77/77** `.mcstructure` entries traversed successfully as little-endian NBT containers; all report positive `size` dimensions | NBT framing and dimensions verified, **not** every block palette/state, placement in the native world or arena playability. 60 castle segments (4 for each level 1–15), 15 level pits, `kit` and `admin` structures. |
| World `level.dat` | Entire little-endian NBT root parsed: **126** properties. `LevelName=Daigon Defense v1.1.5`, `GameType=2`, `Difficulty=2`, `MultiplayerGame=0`, `educationFeaturesEnabled=1`, `commandblocksenabled=1`, `doimmediaterespawn=1`. | Exported snapshot configuration, **not** proof of real multiplayer hosting, in-game player permissions, or runtime behavior. |
| LevelDB | **10** native DB files plus the `db/` directory entry: 8 live `.ldb` tables, `MANIFEST-000152` and `CURRENT`. The read-only decoder traced **309,146** raw SSTable records, checked the live tables against MANIFEST, reconstructed the latest key records, parsed **9,120** overworld subchunks with **0 decode failures** and compared the selected six physical arena boxes at exact block-coordinate/BlockState resolution. | This establishes stored geometry/palette and block-entity snapshot parity only; entity AI, placement/ticking during gameplay, unexamined native key families and real simultaneous sessions remain unproven. See Section 5. |
| Manifest | World binds BP/RP; BP `manifest.json` version `[1,1,5]`, script entry `scripts/main.js`, minimum engine `[1,21,130]` and declared Minecraft SDK module dependencies | Minimum engine version is a declared compatibility floor, not the observed client/runtime version. |

**Scope status:** TARGET identity = VERIFIED. DISCOVERY = **PARTIAL** (all archive entries inventoried; the selected six arena native terrain/subchunks and block entities decoded, but other native/world/AI semantics are not exhaustively closed). UNDERSTAND/MODEL = **PARTIAL**, supported by the named source relations and direct native comparisons below. Static **scoped geometry parity** is established; no whole-map understanding, first-pass precision/recall, six-arena session readiness, or Minecraft runtime PASS.

### Packaged script source labels

All file:line evidence below is relative to the exact selected SHA (compiled JavaScript, **not** an asserted original TypeScript checkout):

- `MAIN` = `behavior_packs/BP/scripts/main.js`
- `CONFIG` = `behavior_packs/BP/scripts/chunks/chunk-MUQMYEYB.js`
- `PARTY` = `behavior_packs/BP/scripts/chunks/chunk-IFGB4PJB.js`
- `GAME` = `behavior_packs/BP/scripts/chunks/ctf-defense-BUITMASJ.js`
- `SHOP` = `behavior_packs/BP/scripts/chunks/chunk-4WCCPWWB.js`
- `LOBBY` = `behavior_packs/BP/scripts/chunks/lobby-DUSIDA5V.js`

## 2. Actual authored gameplay design — scoped reconstruction

**Game description supported by source:** a per-arena, party-based, cooperative **Defense Challenge** across a 15-level escalating wave defense. Players enter a join zone, form/ready an arena party, build and buy equipment, defend a flag against hostile waves, accumulate scores/coins, retry failed levels and progress to a final victory/defeat. This describes **authored behavior and source intent**, NOT observed gameplay.

| Player flow / responsibility | Source-grounded design | Packaged source evidence |
|---|---|---|
| Entry / source loading | `TickScheduler` is initialized; `main.js` statically imports a shared chunk and authors 4 sequential literal `import()` requests for bootstrap, hologram, defense and lobby entry modules. All four referenced targets are present in the archive. Imports are **requests**, not runtime success. | `MAIN:2-17`; `LOBBY:702-708`; `GAME:16062-16119` |
| Arena and party assignment | Six configured IDs `arena_1..arena_6` with X offsets `0,596,1192,1788,2384,2980`. One mapped party per arena, minimum one / maximum five members. Joining includes party lock/full and current-membership handling; join-area checks occur periodically. | `CONFIG:7-21`; `PARTY:97-104`, `411-455`, `755-779` |
| Readiness / countdown | Start validates nonempty, minimum members and every required party member ready. Countdown creates per-arena session and start request. | `PARTY:399-406`; `GAME:12112-12178`, `12180-12295` |
| Session activation | Authored sequence: `countdown` → `preloading` → `buy_phase` → `active`. Party is locked, an initial level is assigned and a per-arena fresh-session token/inventory-clear context recorded. | `GAME:12296-12324`, `13177-13244`, `13340-13385` |
| Build/buy/loadout | Levels use build preparation (normal 25 seconds; level 1/4/8/12 special reset preparations). Starter chest/kit preparation, loadout preservation and fresh-inventory helpers are authored. Shop purchases use item currency `daigon:coin`, blocks, tools, support items and enchantments. | `PARTY:1283-1317`; `GAME:13177-13244`; `SHOP:19-87`, `1560-1605`, `1750-1800` |
| Combat and objective | Fifteen authored level configurations, beginning with “Tutorial” and finishing with “The Last Stand”. Wave scheduler and combat tracker coordinate hostile launch/kills; FlagService detects hostile capture; team wipe and flag capture invoke defeat handling. | `PARTY:1319-1815`; `GAME:4099-4258`, `2207-2278`, `10682-10720` |
| Level clear / reward / shop | Current-level score is persisted/accumulated, completion coins awarded, next-level configuration selected, and a shop/transition phase follows when another level exists. The final completed level calls game victory. | `CONFIG:1065-1114`; `GAME:13648-13749` |
| Failure / retry | Flag, team wipe and timeout are represented as failure causes. `MAX_RETRIES=5` is configured, with retry transition and level preparation; source uses `full_level_restart` as retry mode. Whether every retry succeeds is untested. | `CONFIG:1005-1011`, `1090-1108`; `GAME:14297-14344` |
| Reconnect / persisted session | Locked party membership is used to locate a non-idle arena, restore appropriate player mode/loadout/spawn for `active`, `buy_phase` or `preloading`. Sessions have source-defined resume branches. **Do not infer that reconnect restarts the entire party session.** | `GAME:10937-11042`, `11620-11646` |
| Termination / cleanup | Victories, defeats, forced ends, exit votes and abandonment have authored branches. Cleanup targets combat/flag/contraption, chest state, arena placed blocks, party locks, teleport and ticking-area release. Proof of actual complete cleanup needs native/running-world evidence. | `GAME:13825-13915`, `14735-14797` |
| Residency / concurrency | One logical lease per arena and budgeted native ticking areas plus a shared operation worker/queue; residency acquisition failure is caught as **optional**, permitting continued play on player-loaded chunks. Six arena IDs and 5 members each imply **30 declared slots only**, NOT an observed simultaneous 30-player capacity. | `SHOP:1842-1849`, `2020-2071`, `2244-2310` |

### 2.1 Source-level state/ownership boundaries

- **Arena:** session keys, party locks, level/wave state and lease reservations use `arenaId`-based lookup. An authored name or map key is not proof of distinct live instances. `CONFIG:1013-1050`, `GAME:11228-11315`, `SHOP:2020-2047`.
- **Player:** party `playerId`/ready membership, kit and inventory slots, respawn ownership and persistent coins are player-scoped inputs; the direct source does not yet prove that every call/side effect preserves player identity across multiple simultaneous arenas. `PARTY:399-455`; `GAME:10937-11042`; `SHOP:1560-1605`.
- **Global/native:** world gamerules, ticking-area command budget and entity/world structure operations are shared world/native resources; a per-arena wrapper cannot on its own establish exclusive world execution. `LOBBY:206-239`; `SHOP:1842-1849`, `2169-2193`.

## 3. Contradictions and conditional source concerns

### DC115-SOURCE-01 — Developer `reset_arena` source path is nonfunctional

**Classification:** CONFIRMED **source-path contradiction**, recommended **DEV_NOTE / limited developer-control issue**. Not promoted to a player-facing approved BUG, and not generalized to GameManager's normal reset/retry flow.

- **Authored intent:** `ctf_defense:reset_arena <arenaId>` is registered and calls `StructureLoader.resetArena()`. `GAME:6123-6164`.
- **Source cause:** `getBaseLevelConfig(_arenaId)` returns `null` unconditionally. `PARTY:1837-1839`.
- **Source consequence:** `resetArena()` checks this result, sends “no base level configured” and returns before `setupLevel()` can run. `GAME:6439-6451`.
- **Counter-evidence / scope:** the normal `GameManager.resetGame()` / `performResetGame()` is a different path with actual cleanup calls; the finding **does not** demonstrate those normal mechanics are broken. `GAME:14735-14797`.
- **Action:** clarify whether the developer command should remain offered; if it is intended to function, configure a valid base level or remove the dead route. No direct map mutation authorized here.

### DC115-SOURCE-02 — Shop debit precedes successful item delivery

**Classification:** SOURCE-GROUNDED CONDITIONAL RISK / **needs exact failure proof**. Do not publish as a confirmed gameplay BUG.

- **Evidence:** `consumeCoins(player, itemDef.price)` runs before item issuance and `_notifyPurchase`. `SHOP:1750-1771`.
- **Specific failure branch:** for an item using `giveCommand`, `player.runCommandAsync(...)` is caught on failure; there is no coin refund in that branch and execution continues to a generic “Purchased ...” message. `SHOP:1772-1799`.
- **Relevant real source option:** `minecraft:potion` is offered via a `giveCommand`. `SHOP:68-76`.
- **Counter-evidence:** ordinary `ItemStack` delivery has a distinct inventory-full path that spawns overflow items on the ground. That does **not** eliminate the command-give failure path. `SHOP:1779-1793`.
- **Deciding proof:** show that the current selected artifact can reach the item-grant failure branch under an applicable platform condition. No such runtime failure was observed in this review. Therefore the possible coin loss and contradictory success message are conditional effects, not verified player impact.

### DC115-BOUNDARY-03 — Native ticking readiness / concurrency cannot be certified from configuration

**Classification:** STRICT UNKNOWN / source risk boundary, **not** a proven failure.

- **Evidence:** arena native residency uses a budget of 6 core areas and a total of 7, plus a shared operation worker. `SHOP:1842-1849`, `2244-2263`.
- On lease-grant failure, source warns that the arena **continues with player-loaded chunks** and marks native coverage unavailable. `SHOP:2048-2070`.
- **Consequence:** the configured six arenas and 30 member slots are insufficient to claim that all simultaneous hostile navigation, remote waves and cleanup remain fully simulated. Also insufficient to prove they fail. Required proof would be direct chunk-residency and concurrent-session evidence; none is present.

## 4. Negative controls — reject unsupported historical or overconfident claims

| Claim to avoid | Current selected-source counter-evidence | Disposition |
|---|---|---|
| “Golden apple costs 16; price is a bug.” | `SHOP:61-67` explicitly prices `minecraft:golden_apple` at **6 coins**. No current approved specification requiring 16 was established. | **REJECT unsupported bug** |
| “Arena 6 is mostly void/missing.” | **Native counterproof:** Arena 6 has 165/165 world chunk coordinates in its configured arena sample, 412,318 non-air blocks in those complete sampled chunk stacks, and 326,791 non-air blocks within the exact declared arena bounding volume. Across that volume its block names, full block states, and 498 block-entity positions/types match Arena 2, 3 and 5 after X-offset normalization. | **REJECT “mostly void/missing” for the selected stored arena geometry**, not a claim of successful runtime playability |
| “Multiplayer hosting is broken because `MultiplayerGame=0`.” | This is a snapshot field from `level.dat`, not evidence of tested host/session behavior. | **REJECT runtime conclusion** |
| “Six configured arenas prove 30 concurrent clients work.” | Party config allows 5 members × 6 arenas, but native residency is conditional and runtime absent. | **REJECT delivered-capacity conclusion** |
| “Historical Defense bugs are all still present in v1.1.5.” | An older report is not version-identity proof. Only selected SHA evidence is admissible. | **REJECT automatic inheritance** |
| “Developer reset failure proves ordinary level retry/reset broken.” | `StructureLoader.resetArena()` and `GameManager.performResetGame()` are different source paths. | **REJECT overgeneralization** |

## 5. Native LevelDB arena parity — directly decoded 2026-10-12

**Evidence class:** `CHATGPT_DIRECT_NATIVE_LEVELDB_NBT` for the **same v1.1.5 SHA-256**, using the actual ZIP's database files read-only. This is **not** a generated `runSelectedMapAudit()` result and **not** live Minecraft. The analysis used LevelDB SSTable index/data blocks and raw-DEFLATE type-4 decompression, selected latest-version values by internal key, and checked all 8 `.ldb` filenames/sizes as active in the exported `MANIFEST-000152` (levels 0/2). It then decoded Bedrock v9 subchunk palettes (Y-fastest/XZY storage), little-endian block-state NBT, and `0x31` block-entity NBT. The original map was never modified; the decoder was an ephemeral ChatGPT inspection tool, **not** an additional GitHub engine.

**Sample definition, authored in `CONFIG:7-21, 57-80`:** each arena is an X-shifted copy of base X `[-70,90]`, Y `[-60,-20]`, Z `[-210,10]` (inclusive), with offsets `0,596,1192,1788,2384,2980`. Each source-mapped native chunk sample covers 11 × 15 = 165 X/Z chunks. The complete-chunk non-air count includes whole stored subchunks at those chunk X/Z positions, including neighboring blocks outside the exact arena border. Separately, **exact-volume** results decode and compare **1,458,821 voxel locations per arena** inside the inclusive source-configured bounds. Those two denominators must never be conflated.

| Arena | Offset X | Stored X/Z chunk coordinates | Complete-chunk non-air blocks | Non-air blocks inside exact arena volume | Parsed native block entities within exact volume |
|---|---:|---:|---:|---:|---:|
| 1 | 0 | 165 | 415,783 | 326,791 | 498 |
| 2 | 596 | 165 | 412,318 | 326,791 | 498 |
| 3 | 1,192 | 165 | 428,178 | 326,791 | 498 |
| 4 | 1,788 | 165 | 420,296 | 326,791 | 498 |
| 5 | 2,384 | 165 | 414,991 | 326,791 | 498 |
| 6 | 2,980 | 165 | 412,318 | 326,791 | 498 |

All **9,120** selected-arena overworld subchunks decoded at palette/packed-index level with **zero failures**; the exact Y-bounded comparison intersected **2,613** native subchunks, again without decode errors. The complete-chunk non-air totals match the independently frozen Defense v1.1.5 source oracle exactly; this provides independent cross-method consistency. The native block entities per arena are **474 FlowerPot, 17 Barrel and 7 Chest**, with identical relative coordinates and types across all six arenas. This is **position/type parity**, NOT a statement that every item payload or NBT metadata field is identical.

### 5.1 Full block state differences after arena-relative coordinate normalization

Across the exact arena volume, **Arena 2, 3, 5, and 6 are identical for all 326,791 stored non-air block locations, names and decoded block-state properties**. Two localized differences remain relative to Arena 2:

- **Arena 1: one same-block state difference.** At relative `(6,-40,-137)` (`minecraft:jungle_trapdoor`), `open_bit=1` in Arena 1 versus `open_bit=0` in Arenas 2/3/5/6; `direction=2` and `upside_down_bit=0` match. This is an observed native snapshot state difference in the playable area, **not proof of an intended or unintended gameplay effect**. It needs relevant level/path design context before issue classification.
- **Arena 4: nine block-name substitutions**, each `minecraft:grass_path` in Arena 4 versus `minecraft:dirt` in Arena 2/3/5/6 at the **same non-air coordinates**. Their arena-relative X/Y/Z positions are `(-33,-56,-203)`, `(-17,-51,-157)`, `(4,-51,-159)`, `(4,-51,-153)`, `(5,-51,-159)`, `(6,-51,-159)`, `(7,-51,-159)`, `(8,-51,-159)`, `(44,-58,-200)`. No missing air/solid voxels were detected inside the scoped arena volume; physical gameplay significance of path/dirt difference is not established.

**Disposition:** Five of six arenas match at block-name level (including Arena 6); Arena 1's one state difference and Arena 4's nine substitutions explain all full-block-state discrepancies found in the declared geometry bounds. **Reject the historical claim “Arena 6 is mostly empty” for v1.1.5's saved physical terrain**. Do **not** upgrade to whole-map parity, loaded structure behavior, per-client activation, or six-arena concurrency PASS.

### 5.2 Block-entity inventory discrepancy and its source counter-evidence

The native `Chest` at relative `(1,-48,-135)` is the arena starter-resource destination chest defined by `CONFIG:1174-1226`.

- **Arena 4 world `(1789,-48,-135)`:** 3 item stacks in snapshot: `minecraft:blue_wool ×64` twice, plus `minecraft:oak_planks ×32`.
- **The same relative chest in Arenas 1/2/3/5/6:** empty in the saved snapshot.
- **Authored design counter-evidence:** `MARATHON_STARTING_BLOCK_RESOURCE` defines **exactly** those three stacks (`CONFIG:1137-1143`). Level 1 is a reset-preparation level (`PARTY:1283-1317, 1319-1336`), and `KitManager.prepareLevelChests()` builds this starter-resource snapshot and attempts to restore both configured source/destination chest (`GAME:2468-2504`). GameManager calls it for level preparation with `restoreStarterChest: levelConfig.reset === true` (`GAME:13213-13231`).
- **Disposition:** **STORED SNAPSHOT INVENTORY DIFFERENCE, runtime outcome UNKNOWN.** This exact item set is authored starter content, not evidence of foreign loot. The source describes a recovery/refill mechanism for all arenas, which may eliminate the saved-state difference at initialization. Do not label a confirmed unfair-start bug without proving level initialization failed to equalize chest contents. Other **17 barrels and 6 remaining chests per arena are empty** in this saved bounded snapshot.

### 5.3 Native proof boundaries

The inspected `.ldb` files and block-entity `0x31` sources are actual saved-world records. Their equality does **not** prove the maps were imported, all spawn/wave positions have valid navigation, NPCs or dynamic entities exist and behave correctly, placed structures load as expected, world-block events are enforced, player interaction permissions work, or ticking areas support concurrency. Entity/actor record families, command-block execution and detailed AI behaviors remain separate, source-conditional work. Some non-gameplay block-entity metadata differs due to stored NBT versions and absolute `pairx` coordinates; do not interpret those fields as mismatched container positions.

**Checklist result:** Native overworld terrain/block palette parity for the declared six static arena volumes = **SCOPED VERIFIED**. Developer-only reset contradiction and shop failure risk from Sections 3–4 remain unaffected. Native gameplay behavior = **NOT OBSERVED**.

## 6. Open obligations (specific, not blanket failure)

1. **Native geometry parity — SCOPED VERIFIED; deeper world semantics PARTIAL.** All six exact arena volumes were decoded and compared at block-name/state and block-entity location/type resolution (Section 5). Remaining work concerns uninspected actor/AI/command-block/runtime relations and any native world data outside the bounded arena volumes; do not reopen Arena 6 “missing terrain” based on older versions.
2. **End-to-end gameplay activation — SOURCE_RELATION_PARTIAL.** Direct `main.js` requests modules and named methods form a plausible design, but all conditions/callbacks, wave spawn reachability, control permissions and terminal paths have not been exhaustively proven from the entire 8-module implementation.
3. **Shop transactional failure — TRIGGER_UNPROVEN.** Determine current-version reachability of `giveCommand` failure with actual debit; inspect platform error/permissions and player inventory transaction semantics before any BUG promotion.
4. **Per-arena chunk residency / concurrency — RUNTIME_REQUIRED.** A six-arena, 30-client delivery PASS is not inferable from declared slots or logical leases.
5. **Reconnect/recovery — RUNTIME_REQUIRED.** Source has membership recovery and session resume branches; actual reconnect correctness, inventory lifecycle and second-run cleanup are not observed.
6. **Per-entity and presentation semantics — PARTIAL.** Strict JSON parse succeeded for 171 files, but detailed per-entity AI path/animation/UI associations and block palettes have not all been inspected.

## 7. Generalizable lessons for the ChatGPT checker (without changing engine code)

- Start with byte-bound **artifact identity and full file inventory**, then independently close semantic understanding. Successful parsing does not mean game meaning or runtime is understood.
- Trace **authored entrypoints → imported modules → source callbacks → guards → state writes → outcomes** with real source ownership; do not mistake a dynamic import request for execution.
- Preserve **function-path scope**: a dead developer reset is not evidence that all player/session resets are dead.
- Distinguish **declared arena capacity** from native residency and actual simultaneous sessions.
- A true Bedrock LevelDB comparison must decode **live SSTable keys → chunk/subchunk palettes → block coordinates/states → block-entity NBT**, then normalize translated arena geometry at **block** resolution. Entire-chunk totals alone can mislead when the arena offset is not a multiple of 16.
- Examine **saved chest inventories against authored restoration rules** before treating a cross-arena difference as a playable design mismatch; a template's item list may justify observed contents and a reset path may equalize exported initial snapshots.
- Model **debit → delivery → success feedback/refund** as a transaction candidate, but do not assert an observed failure based on a catch branch alone.
- Treat old bug reports and frozen independent expectations as **negative/positive search controls**, not authority for the current selected artifact. Do not hardcode this map's prices, arena offsets, coordinates, or names into reusable checker rules.

## 8. Scope declaration / handoff

This is the **first directly observed, source-backed gameplay design and bounded concern review** for the exact v1.1.5 world, now including **independently decoded native arena geometry and block-entity snapshots**. It is still not a whole-map audit PASS. There is **one confirmed developer-only source contradiction**, **one conditional shop transaction concern**, **two localized native block-state/name differences and one starter-chest inventory difference with relevant authored restoration counter-evidence**, and specific remaining runtime/semantic UNKNOWNs. No general player-facing BUG or DESIGN_MISMATCH has been approved, and no existing `bug-report.json`, `developer-notes.json` or project version binding was modified.

**Next concrete source step:** finish source-reachable initialization/termination and scenario-specific state proof (especially starter-chest refill and the single trapdoor state), then apply the same read-only evidence method to a *different source style* for generalization. Static native terrain parity is already **SCOPED VERIFIED** in Section 5; do not turn every remaining runtime requirement into a blocker for source findings. No app, Node24, localtest, VM or Minecraft runtime is a prerequisite for further source inspection.
