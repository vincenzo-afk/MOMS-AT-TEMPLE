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

Ticked = implemented and verified by an automated test (named in brackets). Notes say what is only partly verified.

### Fixes
- [x] 3a sitting from measured seat height and depth, pelvis on the seat, feet planted by IK, backrest, sit-down/stand-up transitions, 360° orbit (movement.spec "bench")
- [x] 3b faces rebuilt: structured head, eyes with iris, pupil and lids, brows, mouth, skin scatter and rim (movement.spec "close-ups"; Blender close-up renders). *Appeal is a judgement: the screenshots are in test-results/screens/44-46.*
- [x] 3c hands rebuilt: jointed fingers, thumb, no wrist gap; grip, point, relaxed and pinch poses in clips (review_closeup.py renders, in-engine close-up)
- [x] 3d proportions about 1:7.5; leg IK plants the feet; hand IK for vault and climb (movement.spec)

### Movement and camera
- [x] walk / jog / sprint with momentum, no foot sliding (movement.spec "sprint": planted-foot drift 3.9% of the distance run, speed 6.2 m/s)
- [x] jump: anticipation, arc, soft/hard/injury landings, recovery, coyote time, buffering (movement.spec "plinth": fall time matches gravity within 1%)
- [x] vault and climb with hand IK (movement.spec "vault ... climb")
- [x] crouch toggle (movement.spec). *Cover snap deliberately deferred: no combat or stealth in the design.*
- [x] strafe and backpedal in focus mode (movement.spec)
- [x] contextual prompts that fade (every e2e test reads them; fade is CSS, verified visually)
- [x] camera: shoulder offset, look-ahead, five-ray collision, never inside geometry (movement.spec "camera never ...": 0 of 64 sampled frames inside, 0 clipped frames)

### Animation
- [x] state machine with smoothed, renormalised weights: the clip-weight sum stays at or above 0.98 through every transition (all movement.spec samplers)
- [x] idle fidgets, lean into turns (measured: 0.29 rad), head tracking

### Polish
- [x] post-processing: bloom, grade and vignette, SMAA; GTAO opt-in
- [x] juice: landing shake, dust puffs, footsteps, sprint FOV kick, vehicle camera
- [x] no per-frame allocations in the hot loops changed this session (collision raycast, camera, controller, interaction)
- [x] robustness: no interaction mid-air, input spam, walls, camera (movement.spec "camera never ... spam")

### GAME_DESIGN.md (Temple Visit mode)
- [x] §2 run loop (visit.spec "full visit")
- [x] §3 Punya, Blessings table, Stress end, combos (rules.test, visit.spec "stress at 100")
- [x] §4 Stage 1 home + bag mini-game (visit.spec "home stage")
- [x] §4 Stage 2 arrival: drive, park, chappals, gate rule (visit.spec "full visit")
- [x] §4 Stage 3 queue runner with its events (visit.spec "full visit")
- [x] §4 Stage 4 rituals (coconut, lamps, pradakshina, sloka, archana, vibhuti) (visit.spec "full visit"; vibhuti covered by code only)
- [x] §4 Stage 5 darshan, prayers, priest (visit.spec "full visit")
- [x] §4 Stage 6 exit (chappals, prasadam, photo, score) (visit.spec "full visit"; gossip and annadanam covered by code only)
- [x] §5 five moms (rules.test)
- [x] §6 three temples + hill steps + festival (visit.spec "hill temple"; rules.test)
- [x] §7 Kumkum, unlocks, missions, badges, personal best (rules.test; profile saved in visit.spec)
- [x] §8 sounds (procedural placeholders; the cues are counted, not listened to by a person)
- [x] §9 local save (visit.spec reads the stored profile back)
