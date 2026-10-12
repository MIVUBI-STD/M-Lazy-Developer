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
| LevelDB | **11** native `db/` files inventoried | **Native LevelDB chunk/world contents NOT DECODED** in this review; native arena parity, chunk palette, command blocks and actual spatial population are UNKNOWN. |
| Manifest | World binds BP/RP; BP `manifest.json` version `[1,1,5]`, script entry `scripts/main.js`, minimum engine `[1,21,130]` and declared Minecraft SDK module dependencies | Minimum engine version is a declared compatibility floor, not the observed client/runtime version. |

**Scope status:** TARGET identity = VERIFIED. DISCOVERY = **PARTIAL** (all archive entries inventoried; native DB and complete gameplay semantics not decoded). UNDERSTAND/MODEL = **PARTIAL**, supported by the following named source relations. No whole-map completeness, first-pass precision/recall, or 30-player runtime PASS.

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
| “Arena 6 is mostly void/missing.” | Six arenas are configured; all 77 external mcstructure containers parse and have positive dimensions. No native LevelDB terrain/chunk comparison was performed. | **UNKNOWN**; do not claim arena is complete either |
| “Multiplayer hosting is broken because `MultiplayerGame=0`.” | This is a snapshot field from `level.dat`, not evidence of tested host/session behavior. | **REJECT runtime conclusion** |
| “Six configured arenas prove 30 concurrent clients work.” | Party config allows 5 members × 6 arenas, but native residency is conditional and runtime absent. | **REJECT delivered-capacity conclusion** |
| “Historical Defense bugs are all still present in v1.1.5.” | An older report is not version-identity proof. Only selected SHA evidence is admissible. | **REJECT automatic inheritance** |
| “Developer reset failure proves ordinary level retry/reset broken.” | `StructureLoader.resetArena()` and `GameManager.performResetGame()` are different source paths. | **REJECT overgeneralization** |

## 5. Open obligations (specific, not blanket failure)

1. **Native arena/world parity — NATIVE_DB_NOT_DECODED.** Examine native LevelDB chunks to compare all six physical arenas, including Arena 6; compare baseline, placed structures and region extents. Do not infer incompleteness from missing visible chunks in this review.
2. **End-to-end gameplay activation — SOURCE_RELATION_PARTIAL.** Direct `main.js` requests modules and named methods form a plausible design, but all conditions/callbacks, wave spawn reachability, control permissions and terminal paths have not been exhaustively proven from the entire 8-module implementation.
3. **Shop transactional failure — TRIGGER_UNPROVEN.** Determine current-version reachability of `giveCommand` failure with actual debit; inspect platform error/permissions and player inventory transaction semantics before any BUG promotion.
4. **Per-arena chunk residency / concurrency — RUNTIME_REQUIRED.** A six-arena, 30-client delivery PASS is not inferable from declared slots or logical leases.
5. **Reconnect/recovery — RUNTIME_REQUIRED.** Source has membership recovery and session resume branches; actual reconnect correctness, inventory lifecycle and second-run cleanup are not observed.
6. **Per-entity and presentation semantics — PARTIAL.** Strict JSON parse succeeded for 171 files, but detailed per-entity AI path/animation/UI associations and block palettes have not all been inspected.

## 6. Generalizable lessons for the ChatGPT checker (without changing engine code)

- Start with byte-bound **artifact identity and full file inventory**, then independently close semantic understanding. Successful parsing does not mean game meaning or runtime is understood.
- Trace **authored entrypoints → imported modules → source callbacks → guards → state writes → outcomes** with real source ownership; do not mistake a dynamic import request for execution.
- Preserve **function-path scope**: a dead developer reset is not evidence that all player/session resets are dead.
- Distinguish **declared arena capacity** from native residency and actual simultaneous sessions.
- Model **debit → delivery → success feedback/refund** as a transaction candidate, but do not assert an observed failure based on a catch branch alone.
- Treat old bug reports and frozen independent expectations as **negative/positive search controls**, not authority for the current selected artifact. Do not hardcode this map's prices, arena offsets, coordinates, or names into reusable checker rules.

## 7. Scope declaration / handoff

This is the **first directly observed, source-backed gameplay design and bounded concern review** for the exact v1.1.5 world, not a whole-map audit PASS. There is **one confirmed developer-only source contradiction**, **one conditional shop transaction concern**, and **specific bounded unknowns**. No general player-facing BUG or DESIGN_MISMATCH has been approved, and no existing `bug-report.json`, `developer-notes.json` or project version binding was modified.

**Next concrete source step:** complete native LevelDB/arena parity and exhaustive branch coverage for gameplay entry/retry, then contrast this review against a *different source style* before modifying general-purpose GitHub checker code. Use ChatGPT's actually available tools; no app, Node24, localtest, VM or Minecraft runtime is a prerequisite for further static inspection.
