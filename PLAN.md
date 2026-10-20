# PLAN: polish and feature pass (session 4)

## 0. A conflict between the brief and the repo, and the choice made

`GAME_DESIGN.md` (added 2026-10-20, untracked) describes **Moms at Temples**: a 2D top-down Phaser 3 pixel game, built from 3–6 minute score runs through six temple stages. Its §10 says an MVP already exists in `src/`. **It does not.** `src/` is the Three.js third-person game *Temple of Monks* (a life sim in a temple settlement, about 10k lines, 51 automated tests, 123 Blender assets).

The polish brief asks for GTA V-style **3D** movement and camera, and to preserve the architecture. Rewriting in Phaser 2D would throw away the engine the rest of the brief polishes. **Decision:** implement the design document's game rules (moms, temples, the six stages, Punya/Blessings/Stress, combos, mini-games, score screen, personal best, Kumkum, unlocks, missions, badges, festival mode) as a **Temple Visit** mode inside the existing 3D world, next to the existing story mode. The engine, platform and pixel-art notes in §1 and §8 are superseded by the existing Three.js renderer. This is recorded in `docs/DECISIONS_AND_KNOWN_ISSUES.md`.

## 1. Current state (inspected)

| Area | State | Problem |
|---|---|---|
| Sitting | `Game.sitAt` snaps the root to the interaction point at ground height and plays `sit_idle`, whose hip drop (0.46 m) is hard-coded in the clip | floats or sinks depending on the seat; the point is 0.3 m in front of the bench centre; no sit-down or stand-up transition (pops) |
| Faces | ico-sphere blobs (cheek balls, a box nose) added onto an ellipsoid; eyes are two flat ellipsoids; no lids | blobby, unstructured (see `blender/export_reports/previews/CHR_Player_Base_face34.png`) |
| Hands | an ellipsoid palm with 4 thin tubes and a thumb; the forearm tube ends before the palm | gap at the wrist, fingers detached from the palm, no finger bones, so no grip or point |
| Rig | 21 deform bones, no fingers, no IK | feet float on steps; hands cannot reach targets |
| Proportions | height 1.75 m, head about 0.25 m (1:7) | close; tune to 1:7.5 |
| Movement | walk 2.2 m/s / run 5 m/s with acceleration; no jump, crouch, sprint, vault, climb, strafe | gaps against the brief |
| Animation | idle/walk/run phase-synced blend, 0.22 s fades, 28 clips | no lean, no idle fidgets for the player, no jump/land/sit transitions |
| Camera | orbit + boom raycast + zoom | no shoulder offset, look-ahead, FOV kick or shake; a single ray can clip through edges |
| Rendering | ACES, PCF shadows, fog, triplanar detail | no AA beyond MSAA default, no bloom, vignette, grade or AO |
| HUD prompt | appears and disappears instantly | should fade |
| Hot loops | `PlayerController`, `ThirdPersonCamera` and `InteractionSystem` allocate `Vector3`s every frame | GC churn |
| GAME_DESIGN.md | nothing implemented | whole design missing |

## 2. Files to change

- `blender/scripts/tom/character.py`: finger bones (thumb/index/middle/ring/pinky, 2 segments each), new clips (sit_down, stand_up, jump_start, jump_air, fall, land_soft, land_hard, crouch_idle, crouch_walk, sprint, strafe_left/right, walk_back, vault, climb, idle fidget, coconut_smash, pray_hold, light_lamp, photo_pose, drive_seated), proportion tuning.
- `blender/scripts/assets_characters.py`: rebuilt head (one deformed mesh with brow ridge, nose bridge, cheekbones, jaw, chin; eyes with sclera, iris, pupil and lids; brows; a mouth), rebuilt hands (palm continuous with the forearm, jointed fingers and thumb, knuckles), **CHR_Player_Mom** (the playable mom) and **CHR_Child_A** (family kids, child proportions).
- New Blender assets for the visit: auto-rickshaw (drivable vehicle with an enter socket), chappal stand, queue rails with three lanes, coconut-breaking stone, lamp stand, prasadam counter, hill steps with a small hill shrine, bench with a backrest, a bush hiding spot.
- `src/game/player/PlayerController.ts`: rewrite. Walk/jog/sprint, momentum, jump with coyote time and buffering, fall arc, landing by fall height, fall consequences, crouch, vault, climb, strafe and backpedal in focus mode, no per-frame allocation. It is a rewrite because jump, vault and climb change the integration order.
- `src/game/player/CharacterAnimator.ts`: state machine with 150–250 ms crossfades, strafe/back/crouch blends, lean, fidgets.
- `src/game/player/IK.ts` (new): analytic two-bone IK (legs, arms), foot planting, hand targets, finger poses, head look-at.
- `src/game/player/Seat.ts` (new): seat measurement from colliders and raycasts, sit-down/stand-up choreography.
- `src/game/camera/ThirdPersonCamera.ts`: shoulder offset, look-ahead, multi-ray (sphere-ish) collision, FOV kick, shake.
- `src/game/render/PostFX.ts` (new): EffectComposer with SMAA, bloom, vignette and grade, and GTAO on high quality.
- `src/game/vehicle/Vehicle.ts` (new): arcade auto-rickshaw controller, enter and exit.
- `src/game/visit/` (new): `VisitRules.ts` (pure scoring, meters, combos, archetypes, temples, festival, missions, badges), `VisitSession.ts`, `stages.ts` (six stages), `family.ts` (followers, the wandering child), mini-games.
- `src/ui/components/Visit*.tsx` (new): meters HUD, mini-game overlays, score screen, mom/temple picker, Kumkum store, missions, badges.
- `src/ui/components/Hud.tsx` / CSS: fading prompts.
- Tests: unit tests for the visit rules and the controller maths; browser tests for each acceptance item.

## 3. Order of work

1. Commit the finished session 3 work (regression green first).
2. **Fixes:** characters (faces, hands, finger bones, proportions) → IK → sitting with transitions.
3. **Movement:** controller rewrite, jump/land, crouch, vault/climb, strafe, sprint; camera.
4. **Animation:** state machine, lean, fidgets, head tracking.
5. **Polish:** post-processing, prompt fades, juice (shake, dust, FOV), allocation cleanup, robustness cases.
6. **GAME_DESIGN.md:** the Temple Visit mode, stage by stage, then progression.
7. CHANGELOG, docs, full regression, push.

## 4. Verification per item

- `npm run typecheck`, `npm test`, `npm run build`, `npm run assets` (GLB validation) after every chunk. **There is no lint script in `package.json`**; one is added (ESLint) and run with the checks.
- Playwright (Edge, real input) for each acceptance item, with screenshots: a 360° orbit of the seated player (8 views, plus a numeric check that the pelvis is on the seat ±2 cm and the feet are on the ground), a ledge jump with the sampled height curve and landing state, a sprinting circle with foot-slide measured (planted foot world drift per contact phase), face and hand close-ups, the T-pose/pop detector (bone-rotation deltas per frame stay under a threshold through transitions), a camera clipping sweep (the camera never inside a collider), and each visit stage played through.

## 5. Checklist

### Fixes
- [ ] 3a sitting from measured seat height and depth, pelvis on the seat, feet planted by IK, backrest lean, sit-down/stand-up transitions, 360° orbit verified
- [ ] 3b faces rebuilt (structured head, eyes with iris, pupil and lids, brows, mouth, skin shading with wrap and rim)
- [ ] 3c hands rebuilt (jointed fingers and thumb, knuckles, no wrist gap), finger poses: grip, point, rest, prop/armrest grip
- [ ] 3d proportions 1:7.5, foot and hand IK, feet planted on steps

### Movement and camera
- [ ] walk / jog / sprint with momentum, no foot sliding (measured)
- [ ] jump: anticipation, launch, air pose, soft or hard landing, recovery, coyote time, buffering, fall consequence
- [ ] vault low obstacles, climb ledges with hand IK on the surface
- [ ] crouch toggle; cover snap (see the deferral note if not done)
- [ ] strafe and backpedal
- [ ] contextual prompts with fade
- [ ] camera: shoulder offset, smooth follow, orbit, zoom, look-ahead, never inside geometry

### Animation
- [ ] state machine with 150–250 ms crossfades, no T-pose flashes (detector test)
- [ ] idle fidgets, lean into turns, head tracking

### Polish
- [ ] post-processing: SMAA, bloom, vignette, grade, AO (high)
- [ ] juice: landing shake, dust puffs, footstep hooks, sprint FOV kick
- [ ] no per-frame allocations in hot loops
- [ ] robustness: sit while airborne, interact mid-air, input spam, walls, camera

### GAME_DESIGN.md (Temple Visit mode)
- [ ] §2 run loop: pick a mom and a temple → stages → exit → score → Kumkum
- [ ] §3 Punya, Blessings (multiplier table), Stress (ends the run at 100, drains when calm), combos
- [ ] §4 Stage 1 home + bag-packing mini-game
- [ ] §4 Stage 2 arrival (auto-rickshaw drive, parking, chappals: car/bush/stand, side-gate guard) + hiding-spot mini-game
- [ ] §4 Stage 3 queue corridor (three tiers, aunty chat, kid holds the place, relative merge, line cutter calm/scold, prasadam shortcut, child wanders) + lane-switching runner
- [ ] §4 Stage 4 rituals (coconut timing bar, lamps with matchsticks, pradakshina laps with 9/108 combos, sloka quiz, vibhuti timer, archana)
- [ ] §4 Stage 5 darshan hold-to-view, priest prasadam, tulsi, prayers
- [ ] §4 Stage 6 exit (chappal memory test, missing/better pair, prasadam for neighbours, gopuram photo timing, gossip, annadanam)
- [ ] §5 five mom archetypes with passives
- [ ] §6 three temples (neighbourhood, big city, hill with a steps stage) + festival mode
- [ ] §7 Kumkum, unlocks (moms, temples, sarees), daily missions, badges, personal best per temple
- [ ] §8 sounds: bells, nadaswaram sting, "aiyyo" (procedural placeholders, labelled)
- [ ] §9 local save
