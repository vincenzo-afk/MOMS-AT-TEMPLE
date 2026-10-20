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

## Automated coverage (state at the end of session 2)

### Unit / integration (Vitest, 17 tests, all passing)
- Definitions cross-reference cleanly (`validateDefinitions`).
- Inventory: never partially adds when full; never partially removes.
- Full rules-engine loop: arrival → channel (inspect gate, recipe-knowledge gate, insufficient materials) → craft → repair → consequence restoration → report → garland via trade and craft → Living Record order and causes → rewards not re-granted when dialogue is replayed.
- Discovery recorded once.
- Gathering with a full bag fails and does not consume the node.
- Gather nodes regrow with world time.
- Save round trip through IndexedDB (fake-indexeddb): restored world + record + no repeat repair.
- Corrupt main save → backup restored.
- Newer schema rejected; unknown items dropped with a warning.
- v1 -> v2 save migration (renamed NPCs, shortened garland quest, new state blocks).
- Farming: no seeds / empty pot / dry well refusals, filling at the tank, watering, growth over world time, harvest, auto-watering after irrigation.
- Storage and home: bag/chest transfers, home quest objectives, wrong-slot and missing-item refusals, kolam consumed versus lamp returned, item reward.
- Well, sluice, fields and weaver: carpentry recipes, the repaired well becoming a water source, sluice -> fields consequence with its cause link, the absent NPC appearing after restoration, villager group dialogue reacting to flags.
- Dialogue item gifts given only once; the festival offered only after the garland, fields and weaver.

### Browser (Playwright + Edge, 15 tests, all passing)
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

Screenshots are written to `test-results/screens/` (ignored by git).

## Asset tests (`scripts/validate-glb.mjs`)
For every manifest entry: file exists; expected collider nodes exist; every visible primitive has non-placeholder vertex colours (this check caught 6 assets exported white); skinned characters have a skin and all 11 named clips; triangle and byte budgets. Results: `blender/export_reports/glb_validation.json`.

## Performance sample (measured, not a target)
Headless Edge, AMD Radeon integrated GPU (ANGLE/D3D11), 1280x760, high quality, courtyard view. Session 1 (small map): ~100 fps (headless rAF cap), CPU frame 1.9 ms, 206 draw calls, 550k triangles. Session 2 (300 m map, 113 models, detail textures): ~100 fps, CPU frame 6.3 ms, 664 draw calls, 970k triangles (shadow pass included), 303 geometries, 89 textures. **Budgets are not set yet.** Profiling on representative lower-end hardware is a next-milestone task.

## Manual checks still required (not automatable here)
- Pointer-lock mouse look in a headed browser (headless runs set the camera angle directly).
- Audio audibility: no Lyria files exist yet; placeholder blips only.
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
