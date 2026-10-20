# Changelog

## Session 4: polish and feature pass (2026-10-20)

### Fixed
- **Sitting floated above the bench.** The seat height, depth, floor and any backrest are now measured from the bench's collision proxies when you sit. The pelvis is placed on the measured seat every frame and the feet are planted on the floor by two-bone IK. New `sit_down` and `stand_up` clips blend in and out, so nothing pops. Measured in a browser test: pelvis error under 1 mm, feet exactly at ankle height on the floor, no bone inside the backrest, a 360° camera orbit captured.
- **Faces.** Rebuilt as one sculpted surface with a brow ridge, eye sockets, nose bridge and tip, nostrils, cheekbones, muzzle, lips and chin, instead of separate blobs. Eyeballs have an iris, pupil and catch-light, with upper and lower lids and a lash line. Brows lie on the ridge. A hairline shell replaces the helmet. Skin gets a warm scattered fill and a rim in the shader.
- **Hands.** The palm is continuous with the forearm (no wrist gap), fingers have three phalanges, and there is a separate thumb with a thenar pad, plus nails. The shared rig gains two bones per finger and thumb. Every clip carries a hand pose (relaxed, loose, grip, fist, point, pinch, open).
- **Proportions.** The head is now about 1:7.5 of body height. Children get child proportions (about 5.6 heads tall) through a girth factor and head scale.
- **The camera could clip into walls when squeezed.** It now uses five-ray collision, rises over the shoulder when the boom shortens, fades the player out when pressed against them, and cuts on teleports. A browser test sweeps 64 angles along walls and asserts the camera is never inside geometry.
- **Interaction.** Line of sight now tests raised targets correctly (wall calendar, shelves), and traders behind counters are reachable. The interaction cooldown is kept, and nothing can be interacted with mid-air or mid-vault.
- **Keys.** Held keys survived losing pointer lock only by auto-repeat. They are no longer cleared on lock change (window blur still clears them).
- **Rendering.** The sky and lighting are now drawn through post-processing with a proper tone-map and output pass.
- **Allocations.** Per-frame allocations were removed from collision raycasts, the camera, the controller and interaction line of sight.

### Added: movement and animation (GTA V-style feel)
- Walk, jog and sprint. Holding Shift builds a jog into a sprint after 0.85 s, and sprints turn in arcs because the body leads the velocity.
- Jumping: a 0.08 s anticipation dip, coyote time (0.12 s), input buffering (0.15 s) and a weighty arc (falling is 1.35× gravity). Landings are soft, hard (from 1.7 m or more; shake and dust) or injurious (from 3.6 m or more; a stagger and a 6 s limp, and Stress in a temple visit).
- Contextual Space: vault waist-high obstacles (one-hand plant, hand IK on the top) and climb walkable ledges up to 2.1 m (both hands on the edge).
- Crouch toggle (C), and focus (hold right mouse): face the camera's direction and strafe or backpedal.
- An animation state machine that blends direction (walk, jog, sprint, back, strafe left and right, crouch), with phase-synchronised strides. Weights are smoothed with about 0.2 s fades and always renormalised to 1, so a crossfade can never blend in the T-pose.
- Idle fidgets, a lean into turns, foot planting on uneven ground, and head tracking toward the current interaction target.
- 25 new clips, and an animation library optimiser that dropped the library from 1.68 MB to 0.7 MB.
- Camera polish: shoulder offset, look-ahead, sprint FOV kick, landing shake, and a vehicle camera that follows behind.
- Post-processing: subtle bloom (stronger at night), a warm-highlights grade and vignette, and SMAA. GTAO ambient occlusion is an opt-in setting.
- Interaction prompts fade in and out, and their key labels follow remapped bindings.

### Added: Temple Visit mode (GAME_DESIGN.md, "Moms at Temples")
- A **Temple Visit** entry on the title screen: pick a mom and a temple, unlock with Kumkum, choose a saree.
- **Six stages as places in the 3D world:**
  - **Home:** wake before five, pack the temple bag (timed mini-game), the tithi memory test on the calendar, and matching pattu for the family.
  - **Arrival:** a drivable auto-rickshaw, parking within 100 m, and chappals left at the stand, in the auto, in a secret bush (remember the spot), or with the side-gate guard. An attendant turns you back at the gate with chappals on.
  - **The queue:** a three-lane in-world runner. The crowd flows at different speeds; switch lanes, shuffle, chat with an aunty to move up two spots, send a kid ahead, merge with relatives, deal with the line cutter (calm or scold), take the prasadam-counter shortcut, and watch out for the child who wanders off.
  - **Rituals:** the coconut timing bar, lamps (one per wish, limited matchsticks), clockwise pradakshina laps counted in the world (combos at 9, and at 108 in festival mode), the sloka quiz, vibhuti for the family against a 10 s timer, and the archana.
  - **Darshan:** hold to view while the crowd nudges you; the priest's extra prasadam and tulsi; and praying for every family member, including the one abroad.
  - **Exit:** the chappal memory test (theft risk depends on the temple), prasadam for the neighbours, a gossip exchange, the annadanam meal, and the gopuram photo (no blinking).
- **Scoring:** Punya Points; a Blessings meter (filled only by devotion) with the multiplier table; Stress (ends the run at 100, drains with calm actions, rises with bad falls); combos (the fourth action after three of one category is doubled).
- **Moms:** five archetypes with their passives.
- **Temples:** three (the big city temple, the new neighbourhood shrine, and the new hill temple with a 30-step climb stage), plus festival mode on festival days.
- **Progression:** Kumkum, unlocks for moms, temples and sarees, three daily missions per day, five badges, and a personal best per temple, all saved locally in IndexedDB.
- **Family and crowd:** the husband and two children follow the mom (new child characters). The queue has its crowd, and a priest and a gossip aunty appear.
- **Sound cues** (procedural placeholders): temple bell, chime, a nadaswaram sting on big scores, "aiyyo" on penalties, the auto horn and engine.

### Added: assets (Blender, original procedural)
- `CHR_Player_Mom` (tintable saree), `CHR_Family_Husband`, `CHR_Child_Boy`, `CHR_Child_Girl` and `CHR_NPC_Priest`.
- Props: `PRP_Auto_Rickshaw_A` (spinning wheels), `PRP_Chappal_Stand_A`, `PRP_Queue_Rails_A`, `PRP_Coconut_Stone_A`, `PRP_Lamp_Stand_A` (nine lightable flames), `PRP_Prasadam_Counter_A`, `PRP_Annadanam_Mats_A`, `PRP_Bush_Hide_A`, `PRP_Calendar_A`, `PRP_Temple_Bag_A` and `PRP_Bench_Back_A`.
- Buildings: `ENV_Shrine_Small_A` and `ENV_Hill_Temple_A`.
- Every existing character was rebuilt with the new heads and hands.

### Tooling
- `npm run lint` (oxlint; typescript-eslint does not support TypeScript 7). The build now runs typecheck, lint and Vite.
- `scripts/optimize-animations.mjs` runs as part of `npm run assets`.
- `blender/scripts/review_closeup.py` renders face and hand close-ups.

### Deliberately deferred (with reasons)
- **Cover snap.** Neither this game nor GAME_DESIGN.md has combat or stealth, so cover would be a mechanic with nothing to use it for.
- **Vending machines.** These are in the polish brief's generic list but not in GAME_DESIGN.md or this setting. The equivalent purchase interactions are the chappal stand and the prasadam counter.
- **Recorded voice and music.** "Aiyyo", the bells and the nadaswaram are synthesized placeholders, labelled as such. No audio recordings exist yet.
- **Native mobile wrap (Capacitor).** GAME_DESIGN.md itself says "later".
- **Engine and art style.** GAME_DESIGN.md names Phaser 3 and 320×240 pixel art. The design's rules were built into the existing Three.js 3D game instead (see PLAN.md §0). This is recorded, not hidden.
