# Test Plan

## Commands

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit`, strict mode with `noUncheckedIndexedAccess` |
| `npm test` | Vitest unit/integration tests (`src/**/*.test.ts`) |
| `npm run build` | typecheck + Vite production build to `dist/` |
| `npm run test:e2e` | Playwright browser tests (`tests/e2e/`), which start the Vite dev server automatically |
| `npm run assets` | Blender build of all assets → manifest → GLB validation (non-zero exit on any failure) |
| `npm run validate:assets` | GLB validation only |

Browser tests use the installed **Microsoft Edge** (`channel: "msedge"`) because Playwright's own Chromium download did not complete in this environment. Set `PW_CHANNEL=` (empty) to use the bundled Chromium after `npx playwright install chromium`.

## Automated coverage (state at the end of session 4)

### Unit / integration (Vitest, 40 tests, all passing)
- Definitions cross-reference cleanly (`validateDefinitions`).
- Inventory: never partially adds when full; never partially removes.
- Full rules-engine loop: arrival → channel (inspect gate, recipe-knowledge gate, insufficient materials) → craft → repair → consequence restoration → report → garland via trade and craft → Living Record order and causes → rewards not re-granted when dialogue is replayed.
- Discovery recorded once.
- Gathering with a full bag fails and does not consume the node.
- Gather nodes regrow with world time.
- Save round trip through IndexedDB (fake-indexeddb): restored world + record + no repeat repair.
- Corrupt main save → backup restored.
- Newer schema rejected; unknown items dropped with a warning.
- v1 -> v2 -> v3 save migration (renamed NPCs, shortened garland quest, new state blocks).
- Farming: no seeds / empty pot / dry well refusals, filling at the tank, watering, growth over world time, harvest, auto-watering after irrigation.
- Storage and home: bag/chest transfers, home quest objectives, wrong-slot and missing-item refusals, kolam consumed versus lamp returned, item reward.
- Well, sluice, fields and weaver: carpentry recipes, the repaired well becoming a water source, sluice -> fields consequence with its cause link, the absent NPC appearing after restoration, villager group dialogue reacting to flags.
- Dialogue item gifts given only once; the festival offered only after the garland, fields and weaver.
- *Session 3 (`src/game/core/world.test.ts`):* doors open and close, and the granary locks at night unless the key flag is set; unowned crates can be emptied and refilled without duplication; witnessed theft sets the pending crime and the opinion drops, blocks further taking, and the watchman's confrontation outranks other dialogue; returning restores the crate and paying the fine keeps the goods; with no goods and no coins it still resolves; unwitnessed theft is remembered; Selvam's key permits taking; pickups are taken once and the bangle only appears with its quest active; *The Lost Bangle* completes end to end; keeping (using) or returning the pouch has consequences in Raman's dialogue; topic answers follow knowledge boundaries and world state; asking Velan about the ruins unlocks his request and is logged; weather is deterministic, clear on the first morning and on festival evenings, and rain occurs; v3 save round trip including doors, containers, pickups, crime and talk log; v2 -> v3 migration refills crates from data.

### Browser (Playwright + Edge, 34 tests, all passing)
| Test | Verifies |
|---|---|
| boots to title | all manifest GLBs load, >100 colliders built, **no console errors** |
| movement | W walks, Shift runs farther, camera-relative movement after rotating camera, collision with the gopuram pier, camera boom distance |
| complete loop | the README Milestone E loop end to end with real key presses and UI clicks: talk → objective → gather (×3) → inventory UI → deliver → new quest → inspect → learn → gather stones and clay → craft UI → repair → channel and garden visuals switch → follow-up quest → Living Record UI with causal links → manual save → **page reload** → Continue → state and visuals restored → repair no longer offered, coins unchanged |
| missing optional model | a 404 on one GLB: game still boots, problem listed on the title screen, fallback object used |
| corrupted save | corrupt main save → backup loaded → player told |
| settings | volume sliders change the effective effects-bus gain; settings persist across reload |
| animation state machine | idle → walk (walk weight > 0.6, run < 0.2) → run (> 0.6) → idle; pickup/reach plays exclusively and locks movement; NPC activity loops (Kamala crafts, Murugan works) |
| NPC schedule transition | at 12:00 Murugan leaves the garden and walks the nav route to his rest anchor |
| garland follow-up | learn → gather marigolds (only after restoration) → jasmine → **shop UI buy** → **craft UI** → deliver → garland appears on the gate, record entry caused by the garden recovery |
| opening sequence | plays, can be skipped |
| review shots + performance | screenshots of key locations, frame statistics |
| notice board, chest, decoration, map, community | real key presses and clicks through each new panel; the placed lamp appears in the world |
| farming through the world | plant -> fill the pot at the tank -> water -> the plot visual changes stage -> harvest |
| state-dependent collision | the overgrown path blocks; clearing it with a sickle disables the blocker and the player walks through |
| tour | screenshots of every area before and after restoration, the festival evening, the map and the community panel |
| home door (session 3) | E on the door -> state saved as open -> walk through the doorway -> HUD shows "indoors" -> close it from inside -> walking out is blocked by the door collider |
| granary lock | at 22:00 the door refuses with a toast naming Kannan; with Selvam's key it opens |
| theft and watchman | Raman is a computed witness at his crate -> container panel warns of ownership -> taking produces the crime banner -> Kannan **walks over 10 m from his post** and starts the confrontation -> "put it back" returns the produce and clears the crime |
| pickups and topics | the chisel is picked up once (prompt gone, saved); second conversation with Valli shows "Ask about" -> a topic answer -> Goodbye -> the line is in the journal's conversation history |
| key remapping | rebinding forward to I through the settings UI moves the player with I, removes I from inventory (one key per action), persists in IndexedDB, and resets |
| weather | a deterministic rain block: HUD shows Rain, 8 villagers head for shelter anchors and leave when it clears; NPC tier counts |
| gamepad, audio, LOD | a scripted `navigator.getGamepads()` pad: full stick tilt walks farther than half tilt; A starts a conversation; footstep cues fire from the walk cycle; the soundscape exists; tree LOD renders fewer triangles than forced full detail (767k vs 1.04M in the courtyard view) |

Screenshots are written to `test-results/screens/` (ignored by git).

### Session 4 additions
- `src/game/visit/rules.test.ts` (11): scoring, passives, combos, the Blessings table, the Stress end, festival doubling, settlement, unlocks, missions, festival days.
- `tests/e2e/movement.spec.ts` (6): bench sitting with numeric checks and a 360° orbit; jump and ledge fall timing against gravity; sprint-circle foot slide (4%) and lean; vault, climb, crouch and focus; the camera never inside geometry plus mid-air interaction and input spam; face and hand close-ups. Each tracks the clip-weight sum (T-pose detector).
- `tests/e2e/visit.spec.ts` (4): home stage; the full visit from the auto to the score screen and saved profile; the hill steps and the neighbourhood shrine; the Stress end and Esc-out of a mini-game.
- `tests/e2e/touch.spec.ts` (1): the on-screen stick and the Jump button.

### Session 5 additions
- `src/game/audio/musicCues.test.ts` (3): the cue for each hour, the workshop cue by day only, festival evenings and silence during a Temple Visit.
- `tests/e2e/anim.spec.ts` (2): blinking, a talking jaw that closes after the conversation, and a face close-up; the chest lid opening and closing with its panel; carrying a full pot at walking pace with the carry clip (front and back screenshots); the door push.
- `tests/e2e/audio.spec.ts` (2): the music cue follows the hour, the placeholder score schedules drone plucks, phrases and festival drums, the restoration sting plays; the workshop cue in the yard, Velan's chisel heard by day and not at night, the listener rides with the camera.
- `tests/e2e/visit-extras.spec.ts` (3): the chappal-bush memory test; vibhuti for the family, gossip and annadanam; drive guidance (beacon, arrow, distance, gone once parked).
- `tests/e2e/npc-stuck.spec.ts` (1): an NPC caged on her route re-plans, skips and steps past (repaths ≥ 2, unstuck ≥ 1, out of the cage, still bound for her anchor).
- `tests/e2e/perf.spec.ts` (1): budgets for startup (title < 45 s, new game < 20 s), frame time (p95 < 50 ms, at most 3 hitches over 100 ms), retained heap growth after GC (< 8 MB over 16 s of play), draw calls (< 1400) and triangles (< 2 M). Playwright launches Chromium with `--js-flags=--expose-gc` for the heap sample. Measured: 4.3 s, 0.3 s, p95 20 ms, 0 hitches, +0.2 MB, 564 draw calls, 0.9 M triangles.
- `tests/e2e/casting.spec.ts` (2): *The Forgotten Craft* end to end (the neglected corner, the ledger discovery, the repair and its visual swap, real brass pickups in the ruins and old grounds, casting at the furnace, the Living Record); *Karthigai Deepam* end to end, with the wall lamps appearing and a dusk screenshot.

## Asset tests (`scripts/validate-glb.mjs`)
For every manifest entry: file exists; expected collider nodes exist; every visible primitive has non-placeholder vertex colours (this check caught 6 assets exported white); skinned characters have a skin and all 11 named clips; triangle and byte budgets. Results: `blender/export_reports/glb_validation.json`.

## Performance sample (measured, not a target)
Headless Edge, AMD Radeon integrated GPU (ANGLE/D3D11), 1280x760, high quality, courtyard view. **Session 4 (post-processing on, all passes counted):** 92.7 fps, 9.2 ms frame, 761 draw calls, 1.02M triangles (heavier characters with jointed hands and sculpted heads). **Session 3:** 67-101 fps across runs (frame 9-15 ms; the low end was measured while a second dev server shared the GPU), 709-744 draw calls, 0.82-0.86M triangles; per-frame game logic about 0.5 ms (NPCs 0.28 ms, player 0.12 ms, environment 0.10 ms, atmosphere 0.03 ms, interaction 0.01 ms) and `renderer.render` about 12 ms including the GPU wait. A same-day A/B against commit 82c0e92 on the same machine and view measured 11.45 ms (642 calls) before versus 12.0-12.6 ms (709 calls) after, roughly +5-10% for the new assets, LOD sets and shaders. Rendering is neither fill-rate bound (a quarter of the pixels saves only about 1 ms) nor shadow bound (skipping the shadow pass saves about 2 ms); it is bound by draw calls and vertices. The session 2 figures below were measured on a different day and are not directly comparable. Session 1 (small map): ~100 fps (headless rAF cap), CPU frame 1.9 ms, 206 draw calls, 550k triangles. Session 2 (300 m map, 113 models, detail textures): ~100 fps, CPU frame 6.3 ms, 664 draw calls, 970k triangles (shadow pass included), 303 geometries, 89 textures. **Budgets are not set yet.** Profiling on representative lower-end hardware is a next-milestone task.

## Manual checks still required (not automatable here)
- Pointer-lock mouse look in a headed browser (headless runs set the camera angle directly).
- Audio audibility and mix: no Lyria files exist yet; the procedural soundscape has never been listened to by a person (headless runs are muted, and tests only check that cues fire).
- A physical gamepad (only a scripted pad was tested).
- Long-session memory growth (60+ min).
- Firefox and Safari (only Chromium-based Edge tested).
- Feel: camera smoothing, run speed, animation snapping at high frame rates.

## README §17.2 gameplay cases

| Case | Covered by |
|---|---|
| Gathering without inventory capacity | unit |
| Crafting without materials | unit + craft button disabled in UI |
| Repeating an interaction | unit (depleted node), e2e (repair not offered after restore) |
| Completing an objective | unit + e2e |
| Saving during a quest / loading an incomplete quest | e2e (save while q_garland active, reload) |
| Completing a restoration / reloading a restored world | e2e |
| Repeating a completed quest action | unit (rewards) + e2e |
| Missing optional assets | e2e |
| NPC schedule transitions | e2e |
