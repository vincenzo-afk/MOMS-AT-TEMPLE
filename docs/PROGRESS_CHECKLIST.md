# Progress Checklist (session 3)

## Audit of the baseline (commit 82c0e92)

**Engine:** browser game. TypeScript + Vite + Three.js 0.186 + React UI; Blender 5.2 Python scripts produce every GLB; IndexedDB saves; Vitest + Playwright (Edge). No migration needed.

**Baseline build:** `npm run dev` launches; 17 unit tests, 15 browser tests, 113 GLB validations, typecheck and build all pass.

**Working and preserved:** third-person controller with box collision and step-up, collision-aware camera, data-driven interactions, 12-quest arc, 9 restorations with consequences, farming, chest, home decor, skills, relationships, Living Record, map, notice board, save v2 with migration, day/night lighting, festival.

**Gaps found (by inspection and the known-issues list):**

| # | Gap | Severity |
|---|---|---|
| G1 | NPCs have no obstacle or character avoidance and no stuck recovery; they walk through props and each other | high |
| G2 | NPCs do not notice the player: no head-tracking, greetings, barks or bump reactions | high |
| G3 | Interaction has no line-of-sight check, no target highlight and no debounce, so an E can fire through walls | high |
| G4 | No enterable interiors; no doors or world containers; nothing to pick up in the world | high |
| G5 | No systemic rules or consequences (nothing is owned, nobody witnesses anything, no watchman) | medium |
| G6 | No weather, particles or wind; the world is static apart from NPCs | medium |
| G7 | Silent world: no audio files exist, so only UI blips play | medium |
| G8 | Dialogue has no "ask about" topics, no goodbye and no conversation history | medium |
| G9 | No gamepad, no key remapping, no subtitle settings | medium |
| G10 | Palms and neems are drawn at full detail at every distance (~1M triangles per frame) | medium |
| G11 | Every NPC is fully updated each frame regardless of distance | low |

## Implementation checklist

Ticked = implemented **and** covered by an automated test (unit or browser). Notes mark what is only partly verified.

- [x] P0 baseline verified (above)
- [x] G1 NPC steering: collision-aware movement, separation, stuck detection and repath. *Steering and separation run in every browser test; stuck recovery itself is not forced by any test (0 repaths in the samples).*
- [x] G11 distance-tiered NPC updates (tier counts asserted in the weather test; NPC logic costs 0.28 ms per frame for 17 NPCs)
- [x] G2 NPC awareness: head look-at, contextual barks with cooldowns, bump reaction, greet-on-approach. *A browser test asserts the greeting bubble appears on screen; head look-at is visible in screenshots but not asserted.*
- [x] G3 interaction framework: line of sight (waist and shoulder height), target ring, 0.35 s cooldown, failure toast and cue
- [x] G4 Blender: enterable player house with a hinged door, granary with a door, LOD1 palm and neem, pickup props (bangle, chisel, pouch), crate, rain shelter, watchman character. All 123 GLBs validate.
- [x] G4 runtime: doors (saved state, collider), world containers with saved contents and owners, world pickups removed for good
- [x] G5 ownership, witnesses, watchman: theft is seen, opinions drop, the watchman runs over and confronts, it always resolves, consequences persist
- [x] G6 weather (clear, cloudy, rain) with rain streaks, wet ground, overcast lighting, nearer fog, wind sway; NPCs shelter in the rain; dust motes and night fireflies. *Drifting leaves were not done.*
- [x] G7 procedural Web Audio soundscape, labelled as a placeholder. *Tests check that cues fire with audio muted; no person has listened to the mix.*
- [x] G8 dialogue topics with knowledge boundaries, Goodbye, conversation history in the journal, gradual text reveal and dialogue box opacity
- [x] G9 gamepad (analog movement, buttons, menu navigation), key remapping with one key per action, right-drag look. *Gamepad tested with a scripted pad only.*
- [x] G10 chunk LOD switching for trees (767k vs 1.04M triangles in the courtyard view)
- [x] Small quests that use the new systems: *The Lost Bangle*, *Velan's Chisel* (unlocked by a dialogue topic), the found pouch (keep or return)
- [x] Tests for every new system, full regression (29 unit, 23 browser, 123 asset validations), performance measurement with a same-day A/B, docs

## Found and fixed while testing (session 3)

- Line of sight aimed only at waist height, so traders behind their counters could not be talked to. Now waist **or** shoulder height.
- Rebinding a key that belonged to another action silently restored that action's default. Now the old action is shown as "(unbound)".
- The settings card was taller than a 760 px window and did not scroll; Back was unreachable.
- Arrow keys were labelled "L"/"R", the same as the Living Record and Secondary keys; they now show arrows.
- HUD key hints were hard-coded and ignored remapping.
- Rain kept hard midday shadows; cloud cover now diffuses the sun into sky light, greys the horizon and pulls in the fog.

## Remaining work (not started)

Hand-modelled characters and dedicated door and container animations; trespass rules for interiors; a forced stuck-recovery test; physical-gamepad, Firefox and Safari checks; Lyria audio and a mix pass; merging static props to cut draw calls; post-festival content.
