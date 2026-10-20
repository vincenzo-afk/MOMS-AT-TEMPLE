# Technical Architecture

Temple of Monks is a TypeScript + Vite + Three.js browser game with a React/HTML UI layer. All 3D assets are produced by Blender Python scripts in `blender/scripts/` and delivered as GLB.

## Layers

```
src/data/                  authored game data (items, recipes, quests, NPCs, dialogue, level layout, audio manifest)
src/game/core/             types, definitions registry, GameSession (rules + authoritative state), Game (engine host), Input, AssetLibrary, Store
src/game/inventory/        pure inventory transactions (never partially apply)
src/game/world/            conditions, CollisionWorld, Level builder, WorldView (state -> visuals), Water shader
src/game/player/           PlayerController (kinematic), CharacterAnimator (AnimationMixer state machine)
src/game/camera/           ThirdPersonCamera (orbit + collision boom)
src/game/interaction/      InteractionSystem (nearest valid interactable, verbs from GameSession)
src/game/npc/              NpcSystem (schedules, nav-graph routing, activity animations)
src/game/audio/            AudioManager (Web Audio buses, missing-file tolerant)
src/game/save/             SaveSystem (IndexedDB, rolling backup), validateSave (schema validation + migrations)
src/ui/                    React HUD, panels and screens; reads state with useSyncExternalStore
tests/e2e/                 Playwright browser tests
src/**/*.test.ts           Vitest unit/integration tests (rules engine, inventory, saves)
```

### One authoritative state

`GameSession` owns a single `GameState` object (inventory, quests, flags, restorations, gather-node depletion, relationships, discoveries, Living Record, world time, player transform). Every gameplay mutation (talk, gather, craft, buy/sell, repair, read, rest) is a method on `GameSession` that validates first and then commits. After each commit:

1. `settle()` re-evaluates derived progress: `collect`/`craft`/`restore` objectives and **consequence restorations** (e.g. the garden recovers automatically once `channel_east_flowing` is set).
2. A new snapshot reference is published to subscribers (React UI, `WorldView`).
3. Typed `GameEvent`s (notify, gathered, restored, record, quest...) go to the engine for audio, animation and autosave.

The 3D world never stores gameplay state. `WorldView.apply()` derives visibility of restoration variants, `STATE_*` and `PICK_*` nodes from `GameState`, so a loaded save always looks correct.

### Data-driven content

Quests, objectives, dialogue nodes (with conditions and effects), recipes, restorations, gather nodes, shops and discoveries are plain typed data in `src/data/`. `validateDefinitions()` cross-checks every reference at boot (and in unit tests); the game refuses to start with broken data and shows the problem list.

Dialogue picks the highest-priority root node whose conditions hold. Effects (`startQuest`, `advance`, `deliver`, `setFlag`, `relationship`, `openShop`) are applied through the session, which ignores stale or repeated effects (an objective only advances if it is current; rewards are claimed once by id; record events are idempotent by id).

### Frame loop (`Game.frame`)

`play` mode: input -> world clock (1 real second = 1 world minute) -> player controller -> camera -> NPCs -> interaction focus -> prompt -> action timers -> autosave (60 s and on major events) -> lighting -> render. `title`, `intro` and `paused` modes drive the camera differently and do not advance world time (except NPC animation for the backdrop).

### Collision

Blender exports box proxies named `COL_*` (obstacles) and `WALK_*` (surfaces you can stand on). `CollisionWorld` stores them as yaw-oriented boxes in a spatial hash (8 m cells):

- `resolve()` pushes the player circle (r = 0.3 m) out of blocking boxes. Walk boxes only block when their top is more than the step height (0.36 m) above the feet.
- `groundHeight()` returns the highest reachable walk surface (steps, plinths, verandas).
- `raycast()` serves the camera boom (shortens on hit, eases back out).

Instanced placements register one proxy per instance using the template's proxy matrix times the instance matrix.

### Rendering

- `WebGLRenderer` with ACES tone mapping, sRGB output, PCF soft shadows from one directional sun that follows the player (80 m shadow box); hemisphere fill; gradient sky shader; distance fog tinted by time of day.
- Repeated assets (walls, posts, paving, palms, grass, shrubs) are `InstancedMesh` per sub-mesh. Unique or stateful assets are cloned per placement (`SkeletonUtils.clone` for characters).
- Materials come from the GLBs (vertex colour base colour + roughness/metalness). Water meshes (`WATER_*`) are replaced with a shared animated shader.
- Graphics quality: low (no shadows, pixel ratio 1), medium (1024 shadow map), high (2048, pixel ratio up to 2).

### Asset pipeline

`npm run assets` → runs `blender -b --factory-startup -P blender/scripts/build_assets.py` → saves a `.blend` per asset in `blender/source/`, exports GLB to `public/assets/models/<type>/`, writes `blender/export_reports/<id>.json` and a Workbench preview PNG → `scripts/build-manifest.mjs` writes `public/assets/models/manifest.json` → `scripts/validate-glb.mjs` re-reads every GLB with glTF-Transform and checks nodes, vertex colours, skins, clip names, triangle and byte budgets. Any failure exits non-zero.

### Diagnostics

- `window.__tom` exposes `{ game, session, saves }` for debugging and the Playwright tests.
- `game.stats` tracks smoothed fps, frame CPU ms, draw calls and triangles.
- Asset load failures are listed on the title screen and replaced by magenta wireframe boxes.
