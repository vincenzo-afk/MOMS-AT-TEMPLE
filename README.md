# TEMPLE OF MONKS
## Complete Game Design, 3D Production, Animation, Audio, and Browser Implementation Specification

**Document type:** Master Project README  
**Project:** Temple of Monks  
**Target:** Browser-playable 3D indie game  
**3D production:** Blender  
**Game implementation:** Claude Code  
**Audio production:** Gemini Lyria  
**Visual concept production:** AI-generated images, followed by Blender modeling and material creation  
**Initial platform:** Desktop browsers  
**Initial release mode:** Single-player, locally saved, no account required

---

# 0. Current Implementation Status

> This section tracks what is actually built. Everything from §1 onward is the unchanged design specification.

**Milestone reached:** systemic vertical slice (session 3) plus, in session 4, GTA V-style movement and camera, rebuilt faces and hands, IK sitting, post-processing, and the **Temple Visit** mode from `GAME_DESIGN.md` (see `CHANGELOG.md`). A full beginning-to-festival story arc is playable in a world with enterable interiors, doors, owned containers, a watchman, weather and a reactive population. It is still a prototype with first-pass procedural art and placeholder audio, not a finished game.

## Quick start

```bash
npm install          # if your global npm cache is unavailable: npm install --cache <some temp dir>
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:e2e     # browser tests (Playwright, uses installed Microsoft Edge)
npm run lint         # oxlint
npm run build        # typecheck + lint + production build in dist/
npm run assets       # rebuild all 3D assets in Blender (headless), manifest + GLB validation
```

Controls: WASD move · Shift jog (keep holding to sprint) · Space jump / vault / climb · C crouch · hold right mouse to focus (strafe) · mouse look (click the scene) · E interact · R secondary · I inventory · J journal · L Living Record · M map · K community and skills · Esc pause/close. Gamepad and on-screen touch controls are supported; keys can be remapped. In the auto-rickshaw: W/S drive, A/D steer, Space brake, H horn, E get out. Keys can be remapped in Settings; a standard gamepad works (see `docs/GAMEPLAY_SYSTEMS.md`).

## What works (verified in the browser)

| Area | State |
|---|---|
| World | 300 × 300 m map: the walled temple core (temple, gopuram, prakara, west street, workshop, garden, old grounds) plus a south approach with a large stepped temple tank, an east bazaar with eight stalls and a well square, an east lane of houses, north paddy fields with a channel network and a reservoir sluice, western ruins in a walled enclosure, and a woodland. Four gates through the core wall. |
| Assets | **123** Blender-generated GLB models (session 3 added the enterable player house, the granary, a crate, three pickup props, a rain shelter, LOD1 palm and neem, and the watchman) validated and placed, rebuilt to the reference sheets in `asserts_img/` (see `docs/REFERENCE_COVERAGE.md`). Tileable detail textures (stone, plaster, wood, terracotta, thatch, soil, foliage, cloth, brass, skin, brick, ground) are applied by a triplanar shader. |
| Characters | Player, 6 story NPCs (Valli, Amudha the gardener, Velan the stone carver, Selvam the trader, Elder Ponnan, Meena the weaver), Kannan the watchman and 10 everyday villagers on one shared skeleton; **28 animation clips** shared to every NPC by retargeting. Still procedural first-pass characters, not final art. |
| Story | **16 quests**: the 12-quest arc from arrival to the lamp festival (welcome, garden channel, gate garland, inscription, your house, bazaar well, field sluice, first harvest, old wall and pillar, palm-leaf manuscript, weaver's house, lamp festival) plus *The Lost Bangle* and *Velan's Chisel* (unlocked by asking Velan about the ruins), then *The Forgotten Craft* (reopen Kamala's lamp-casting corner; neglected and restored states) and the second festival, *Karthigai Deepam*. A found coin pouch can be kept or returned, with consequences. |
| Systems | Gathering (flowers, stone, clay, timber, thatching grass), crafting at two stations (6 recipes), trading with two shops, **farming** (plant, water from tank/water point/well, grow over world time, harvest; plots auto-watered once the fields are irrigated), **storage chest**, **home decoration** (5 slots), **skills** (gardening, masonry, crafting), relationships with daily-greeting growth and relationship-gated dialogue, NPC schedules with conditional entries, an absent-until-restored NPC, villagers reacting to world changes, notice board, map with live NPC positions and restoration markers, Living Record with "show on map". |
| Restorations | 9 restorations, 2 automatic consequences (garden from the channel, fields from the sluice), with state-dependent visuals and collision (the overgrown path physically blocks until cleared). The festival turns on kolams, bunting, banana arches and lit lamps across the settlement. |
| World systems (session 3) | Hinged doors with saved state and night locks; enterable interiors with an "indoors" check; world crates with saved contents and owners; **theft seen by witnesses** (distance plus line of sight) → opinion loss → the watchman runs to you and confronts you → put it back or pay a fine (never a dead end); one-time world pickups; usable items; "Ask about" dialogue topics with knowledge boundaries, Goodbye, and a conversation history in the journal. |
| NPCs (session 3) | Collision-aware steering, separation from people, stuck recovery; head look-at, greetings, bump reactions and contextual speech bubbles with cooldowns; errands pause while talking; indoors at night; **shelter from rain**; distance-tiered updates. |
| Atmosphere (session 3) | Deterministic weather (clear, cloudy, rain) with rain streaks, wet ground, overcast lighting, nearer fog, wind sway on foliage and cloth, dust motes and fireflies. |
| Controls (session 3) | Analog gamepad support, key remapping, right-drag look, interaction line of sight, cooldown and a target ring, gradual dialogue text and dialogue box opacity. |
| Saves | IndexedDB schema **v3** with tested migrations v1 → v2 → v3, rolling backup, corrupt-save recovery. |
| Audio | Web Audio buses and 20 Lyria slots, each with a licence field. **No audio files supplied yet.** A **procedural placeholder soundscape** (wind, rain, water, market murmur, birds, crickets, surface footsteps, doors, alarm, Velan's chisel) and a **placeholder score** (a drone and flute-like phrases per cue: morning, day, workshop, evening, festival) are synthesized in code; each mutes once its recording exists. Positional loops use an HRTF panner that follows the camera. |

Tests: 47 unit tests, 49 browser tests (including performance budgets) and 145 GLB validations pass; typecheck and lint are clean; the production build succeeds. CI runs the static checks, unit tests, build and asset validation on every push (`.github/workflows/ci.yml`). Details are in `docs/TEST_PLAN.md`; the session 3 audit and checklist are in `docs/PROGRESS_CHECKLIST.md`.

## Temple Visit (Moms at Temples)

Title screen → **Temple Visit**: pick one of five moms and one of three temples, then play one visit across six stages in the 3D world. Home → auto-rickshaw → chappals → the darshan queue → rituals → darshan → exit. You score Punya Points, Blessings (a multiplier) and Stress (ends the run at 100), with combos, mini-games, Kumkum unlocks, daily missions, badges and personal bests. The rules are in `GAME_DESIGN.md`, and its §10 says how they map to this game.

## Documentation

`docs/TECHNICAL_ARCHITECTURE.md` · `docs/WORLD_DESIGN.md` · `docs/GAMEPLAY_SYSTEMS.md` · `docs/SAVE_FORMAT.md` · `docs/ART_BIBLE.md` · `docs/CHARACTER_BIBLE.md` · `docs/ANIMATION_SPEC.md` · `docs/REFERENCE_COVERAGE.md` · `docs/ASSET_MANIFEST.md` (generated) · `docs/ASSET_GENERATION_QUEUE.md` · `docs/AUDIO_BIBLE.md` · `docs/TEST_PLAN.md` · `docs/DECISIONS_AND_KNOWN_ISSUES.md`

## Not done yet

Cultural and historical reference brief. Hand-modelled production characters (fingers, faces, textures). Lyria audio (the procedural soundscape is a placeholder). Painted item icons. Performance budgets on lower-end hardware (about 710 draw calls and 0.8M triangles per frame in the courtyard). Testing with a physical gamepad (only a scripted one was used), in Firefox and in Safari.

---

# 1. Project Mission

Temple of Monks is a stylized 3D historical life-simulation game set in a carefully designed temple-centered settlement inspired by South Indian history and architecture.

The player arrives in a settlement with a functioning community, workshops, gardens, homes, a market, water infrastructure, historical locations, and traditions that have developed over generations.

The settlement is not in a perfect state. Some areas are neglected, important infrastructure needs restoration, local knowledge has been forgotten, and residents have different responsibilities.

The player gradually becomes part of this world by learning professions, gathering materials, crafting useful objects, helping residents, restoring the environment, discovering history, and participating in community events.

The game's defining mechanic is **The Living Record**: significant player contributions permanently affect the world and are recorded as part of the settlement's history.

The finished experience should feel like entering a small, beautiful, explorable world that continues to reflect the player's work.

## 1.1 Core promise

Every major activity should have a purpose, and important actions should leave visible evidence.

If the player restores a water channel, the channel should visibly work afterward. If that restoration enables a garden to recover, the garden should change. If the additional flowers enable a craft order, that order should become available. If the community prepares a festival using those materials, the environment should reflect the preparation.

The player should be able to explore the resulting changes and understand how they came about.

## 1.2 Design pillars

1. **A world worth exploring:** distinctive architecture, beautiful environments, carefully composed spaces, and discoverable details.
2. **A life worth developing:** practical skills, professions, personal customization, and meaningful progression.
3. **A community worth helping:** residents with routines, needs, relationships, and reactions to change.
4. **A world that changes:** restoration, resource availability, reopened areas, and evolving community spaces.
5. **A history that remembers:** a persistent Living Record connecting important actions and outcomes.
6. **A professional presentation:** coherent 3D models, character rigs, animation, sound, UI, lighting, and performance.
7. **A browser-native experience:** quick startup, responsive controls, local saving, and no mandatory installation.

---

# 2. Important Technical Decisions

## 2.1 This is a browser game

The game must run in a desktop web browser. Do not build a Godot or Unreal game and assume it automatically becomes a browser game.

Use the following default stack unless repository inspection reveals a compelling reason to change it:

| Area | Technology |
|---|---|
| Language | TypeScript |
| Development server and build | Vite |
| 3D rendering | Three.js |
| UI | React with HTML/CSS, or a similarly lightweight UI layer |
| Character animation | Three.js AnimationMixer |
| 3D asset format | glTF 2.0 / GLB |
| 3D asset creation | Blender |
| Procedural asset generation | Blender Python API where appropriate |
| Image textures | PNG, WebP, and appropriate compressed formats |
| Audio playback | Web Audio API or a suitable Three.js audio layer |
| Local save | IndexedDB |
| Automated browser testing | Playwright |
| Code and version control | Git |
| Deployment | Static hosting with HTTPS |

Claude Code must inspect the actual environment and current dependencies before implementation. Use maintained, compatible versions rather than blindly copying old package versions from examples.

## 2.2 Rendering architecture

Three.js owns the real-time 3D scene:

- Scene graph.
- Camera.
- Renderer.
- Lights.
- Materials.
- Meshes.
- Collision and interaction representations.
- Animation.
- Particles and environmental effects.
- Spatial audio, where appropriate.

The UI layer owns:

- Menus.
- Dialogue.
- Inventory.
- Quest journal.
- Crafting interface.
- Living Record.
- Settings.
- Notifications.
- Loading and error states.

Do not render every interface panel as a 3D object. Use normal HTML/CSS for interfaces that need text, forms, accessibility, and responsive layouts.

## 2.3 Asset delivery

All major 3D assets should be imported as GLB files where practical.

GLB is preferred because it can contain:

- Meshes.
- Materials.
- Texture references or embedded textures.
- Skeletons.
- Skin weights.
- Animation clips.
- Scene hierarchy.

Use separate GLB files for reusable props and modular environment pieces. A character may have its own GLB containing the mesh, skeleton, and supported animation clips.

Do not combine the entire world into one unmanageable model.

## 2.4 Local-first game

The first playable version must not require:

- A server account.
- A cloud database.
- An external AI service during gameplay.
- An always-online connection.
- A multiplayer server.

The player should be able to load the game, play, save locally, and return later.

External asset-generation services are development tools, not mandatory runtime dependencies.

---

# 3. Complete Game Experience

## 3.1 Opening sequence

The game opens with a short, atmospheric introduction to the settlement.

The player sees the surrounding landscape, the approach to the central temple complex, nearby homes, and the movement of residents beginning their daily activities.

The opening should establish scale, atmosphere, and curiosity without forcing the player to watch a long cinematic.

The player then enters the playable world.

The first minutes teach:

- Camera movement.
- Walking and running.
- Interaction.
- Talking to a resident.
- Collecting a useful object.
- Opening the inventory.
- Inspecting a community problem.
- Viewing the Living Record.

The opening sequence should be skippable after it has been experienced once.

## 3.2 First objective

The player meets a resident who introduces the settlement and explains a practical problem.

The player receives a modest task, such as gathering flowers, carrying materials, or helping prepare a work area.

Completing the task demonstrates the game's interaction and inventory systems.

The player then encounters a larger problem involving a neglected garden or damaged water channel.

This introduces the relationship between personal actions and environmental change.

## 3.3 Long-term progression

The player develops practical skills, builds relationships, gains access to new activities, and gradually undertakes larger community projects.

The world should not force the player to become a warrior or follow a combat progression system.

Combat is not part of the initial design.

## 3.4 Endgame

The main story culminates in a major community achievement, such as restoring a significant public space and helping the settlement complete an important festival.

Afterward, the player can continue exploring, crafting, building relationships, completing optional restoration projects, and expanding the Living Record.

The game should remain playable after the main story concludes.

---

# 4. World and Level Design

## 4.1 Setting

The working setting is a fictional settlement inspired by South Indian temple-centered communities.

Before final production, establish a specific historical and cultural reference brief covering:

- Approximate historical period.
- Geographic and climatic setting.
- Architectural traditions.
- Materials and construction techniques.
- Clothing.
- Local crafts.
- Agricultural practices.
- Water management.
- Languages and naming conventions.
- Relevant religious and community practices.
- Historical objects and inscriptions.

The game may use fictional characters and locations, but real historical claims must be researched.

The title Temple of Monks may remain as the project name. If the setting represents a historical Tamil Hindu temple, terminology and religious personnel must reflect the selected tradition rather than treating all religious figures as monks.

## 4.2 Initial map

Build one dense, interconnected playable settlement.

The first map should contain:

1. Main entrance and approach.
2. Central courtyard.
3. Temple exterior and appropriate surrounding spaces.
4. Residential street.
5. Market.
6. Artisan workshop.
7. Flower garden.
8. Irrigation channel.
9. Pond or water feature, if appropriate.
10. Forgotten grounds.
11. Player's living space.
12. One historical discovery location.

The player must be able to move between important locations without excessive walking.

## 4.3 Map layout

Use a clear spatial structure.

The temple is a recognizable landmark. The residential area and market connect to the central approach. The artisan area is close enough to receive materials and orders. Gardens and water infrastructure are connected to agricultural or craft activities. The forgotten grounds are accessible but provide a reason to explore.

The map should use paths, walls, courtyards, planting, height changes, gates, and landmarks to communicate navigation naturally.

Avoid creating a large flat terrain with isolated buildings placed randomly.

## 4.4 World scale

Use consistent units. One Blender unit should represent one meter unless a documented project decision says otherwise.

Recommended starting dimensions are guidelines, not immutable requirements:

- Player character height: approximately 1.7–1.8 m.
- Ordinary doorway height: approximately 2.0–2.3 m.
- Main walkable paths: approximately 2–4 m wide.
- Small courtyard: approximately 12–25 m across.
- Small house: approximately 5–10 m across.
- Important courtyard or landmark: larger as needed for composition.

Claude must create a scale reference scene and test the player against doors, stairs, furniture, and buildings before mass production.

## 4.5 Level-design requirements

Each important location must support at least one clear purpose:

- Exploration.
- Crafting.
- Gathering.
- Trading.
- Social interaction.
- Restoration.
- Historical discovery.
- Community events.
- Personalization.

Decorative areas may exist, but should not overwhelm the areas that support gameplay.

## 4.6 Environmental storytelling

Use architecture and object placement to communicate the settlement's history.

Examples:

- A damaged channel reveals a neglected infrastructure system.
- A disused workshop contains tools from a forgotten craft.
- An inscription provides a clue to the settlement's development.
- A restored courtyard shows the result of community effort.
- A familiar market changes as a festival approaches.

The environment should tell stories even when no NPC is speaking.

---

# 5. Main Gameplay Systems

## 5.1 Player movement

Implement:

- Third-person movement.
- Camera-relative movement.
- Mouse-controlled camera.
- Sensitivity settings.
- Walking and running.
- Acceleration and deceleration.
- Collision.
- Ground detection.
- Slope handling.
- Step handling where appropriate.
- Interaction distance.
- Context-sensitive prompts.
- Basic animation blending.

Use a reliable collision system. Visual meshes and collision meshes do not need to be identical.

Do not implement every decorative object as a full physics body.

## 5.2 Camera

The camera should:

- Follow the player smoothly.
- Avoid clipping through walls.
- Allow the player to inspect surroundings.
- Support a practical vertical rotation range.
- Avoid excessive motion.
- Preserve visibility in courtyards and narrow streets.
- Use a sensible default field of view.
- Allow sensitivity adjustment.

A collision-aware camera should shorten or reposition its offset when obstacles block the view.

## 5.3 Interaction system

The interaction system identifies nearby usable objects and displays an appropriate prompt.

Examples:

- Talk.
- Inspect.
- Gather.
- Craft.
- Repair.
- Open.
- Buy.
- Sell.
- Read.
- Rest.

Each interactable must define its supported interaction types, interaction range, prerequisites, and associated gameplay action.

Do not hardcode each individual object into the player controller.

## 5.4 Inventory

The inventory must support:

- Item IDs.
- Quantities.
- Stack rules.
- Descriptions.
- Categories.
- Icons.
- Item use.
- Item transfers.
- Storage containers.
- Material checks.
- Quest-item protection where appropriate.

## 5.5 Crafting

Crafting recipes are data-driven.

Each recipe specifies inputs, quantities, station requirements, output, and unlock conditions.

A craft operation must validate inputs before consuming them. The game must not lose materials if the operation fails.

## 5.6 Quest system

Each quest has a stable ID, prerequisites, objectives, completion conditions, rewards, and resulting world changes.

The quest system must support saving and restoring progress.

Do not implement quests as unrelated one-off scripts with incompatible state representations.

## 5.7 NPC system

NPCs need:

- Identity.
- Appearance.
- Home or resting location.
- Work location.
- Schedule.
- Current activity.
- Dialogue references.
- Relevant memory flags.
- Relationship state.
- Requests.
- Responses to world events.

Use authored dialogue and explicit state conditions first.

## 5.8 World-state system

The world-state manager owns important persistent changes.

Examples:

- Channel repaired.
- Garden restored.
- Workshop reopened.
- Historical location unlocked.
- Festival preparation advanced.
- Storage or housing changed.

The environment, NPC reactions, quests, and Living Record must read the same authoritative state.

## 5.9 The Living Record

The Living Record records significant contributions and their consequences.

A major event may include:

- Stable event ID.
- Event type.
- World day or timestamp.
- Location.
- Action.
- Affected entities.
- Previous state.
- Resulting state.
- Related events.
- Player-facing description.

The timeline must persist across saves.

Avoid recording every trivial pickup as a major achievement.

## 5.10 Save system

Use IndexedDB for structured local save data.

Save:

- Player state.
- Inventory.
- Quest progress.
- Relevant NPC state.
- Relationships.
- World-state changes.
- Restorations.
- Discoveries.
- Housing.
- Living Record.
- World time.
- Settings.

Include a save schema version and safe recovery behavior.

The game must not rely on a page's in-memory state as permanent storage.

---

# 6. Character and NPC Production Specification

The player and important NPCs require custom-designed models with coherent proportions, materials, rigs, and animation.

## 6.1 Character visual style

Use a consistent stylized 3D art direction.

The characters should be readable at normal gameplay distance. Faces and clothing should have enough detail to communicate personality without requiring photorealistic rendering.

Avoid a mixture of realistic human models, cartoon props, low-poly terrain, and unrelated art styles.

## 6.2 Character modeling requirements

Every important character model should include:

- Head.
- Torso.
- Pelvis.
- Upper and lower arms.
- Hands.
- Upper and lower legs.
- Feet.
- Neck.
- Hair or appropriate head covering.
- Clothing layers where needed.
- Required accessories.
- UV mapping.
- Materials.
- Skeleton.
- Skin weights.
- Named animation actions.
- Appropriate collision representation in the game.

The final design should be checked from front, side, and back views.

## 6.3 Character proportions

Establish a character proportion guide.

The guide should define:

- Total height.
- Head-to-body ratio.
- Shoulder width.
- Torso length.
- Arm length.
- Leg length.
- Hand size.
- Foot size.
- Facial proportions.

All characters should share a consistent world scale and compatible animation conventions.

## 6.4 Player model

The player needs one complete production-ready base character.

Required components:

- Body mesh.
- Face.
- Hair.
- Starter clothing.
- Footwear, if appropriate.
- Skeleton.
- Skin weights.
- Material assignments.
- Animation rig.
- Idle, walk, run, interaction, pickup, and craft animations.

Additional clothing variations can be introduced through interchangeable mesh or material components after the base character works.

## 6.5 NPC models

The prototype should have three to five functional NPCs.

Recommended roles:

1. A resident who introduces the player to the settlement.
2. A gardener responsible for plants and water.
3. An artisan who teaches a craft.
4. A trader who handles orders and materials.
5. A historian, elder, or knowledgeable resident who helps interpret a discovery.

These are functional roles, not final names or historically verified positions.

NPCs may share a base rig and selected reusable animations. They should still have distinguishable silhouettes, clothing, colors, and personalities.

## 6.6 Rigging

Use a humanoid armature with a documented bone hierarchy.

The rig must support:

- Root motion or in-place animation, chosen consistently.
- Spine movement.
- Head and neck rotation.
- Arm and hand movement.
- Leg movement.
- Foot placement.
- Clothing deformation.
- Animation blending.

Use consistent bone names across compatible characters.

If root motion is not used, movement should be controlled by the game engine, with animation speed matched to actual velocity.

## 6.7 Skin weights

Check deformation at:

- Shoulders.
- Elbows.
- Wrists.
- Hips.
- Knees.
- Ankles.
- Neck.
- Waist.

Inspect bending and twisting. Fix visible mesh collapse and clothing penetration before exporting.

## 6.8 Clothing

Clothing should fit the selected cultural and historical reference.

Create separate clothing meshes only when the design requires independent movement or customization. Otherwise, clothing can be integrated into the character mesh.

Avoid excessively thin or floating surfaces that produce flicker.

Clothing colors should use a controlled palette.

## 6.9 Facial animation

The initial game does not need a complex facial capture pipeline.

Start with:

- Neutral face.
- Blinking, if supported.
- Basic mouth or facial movement for close dialogue scenes, if useful.
- Head turns.
- Gaze direction.

Prioritize readable body language and well-timed dialogue.

## 6.10 Character LOD

Use simpler character geometry or reduced render complexity for distant NPCs when necessary.

Do not sacrifice close-up quality for characters that frequently appear in dialogue.

## 6.11 Character acceptance tests

A character is complete only when:

- The model is correctly scaled.
- Materials load in the browser.
- The rig deforms correctly.
- Idle, walk, and run animations play.
- Animation transitions do not cause severe snapping.
- Hands and feet do not visibly slide excessively.
- The model faces the correct direction.
- The character can navigate the test scene.
- The model remains within performance budgets.
- The exported GLB has been tested in the actual game.

---

# 7. Complete Animation Specification

Animation is a production deliverable, not an optional final polish stage.

## 7.1 Player animation library

### Locomotion

- `idle_relaxed`
- `idle_look_around`
- `walk_forward`
- `run_forward`
- `walk_start`
- `walk_stop`
- `turn_left`
- `turn_right`
- `walk_backward`, if supported
- `strafe_left`, if supported
- `strafe_right`, if supported

### Interaction

- `interact_reach`
- `pickup_ground`
- `pickup_table`
- `place_object`
- `carry_idle`, if carrying is implemented
- `carry_walk`, if carrying is implemented
- `inspect_object`
- `open_container`
- `close_container`

### Social

- `talk_idle`
- `talk_explain`
- `talk_listen`
- `talk_gesture`
- `greet`, if appropriate
- `receive_item`
- `give_item`

### Profession and environment

- `gather_flower`
- `water_plant`
- `plant_seed`, if planting is implemented
- `harvest_plant`, if harvesting is implemented
- `craft_garland`
- `craft_at_station`
- `repair_channel`
- `sweep_designated_area`, if included
- `read_record`
- `sit_idle`
- `rest_idle`

### Animation design

Each animation must have a clearly defined start and end state.

Use appropriate transitions to and from the idle pose.

Interaction animations should have a clear action moment. The actual inventory or world-state change must occur through the gameplay system, not simply because an animation finished.

## 7.2 NPC animation library

Reuse compatible locomotion animations where possible.

Additional NPC clips may include:

- `npc_work_idle`
- `npc_trade`
- `npc_garden`
- `npc_craft`
- `npc_talk`
- `npc_listen`
- `npc_walk_to_work`
- `npc_rest`
- `npc_inspect_object`

Each NPC should use only animations that match its role.

## 7.3 Environmental animation

Potential animated objects include:

- Gates.
- Doors.
- Containers.
- Water channels.
- Water surfaces.
- Flags or fabric, if appropriate.
- Plants moving subtly in the wind.
- Workshop props.
- Festival decorations.

Water flow and vegetation movement can be implemented through shaders or lightweight procedural animation rather than separate Blender clips.

## 7.4 Animation conventions

Every animation must have:

- A stable action name.
- Defined duration.
- A documented loop setting.
- A consistent rig.
- A known playback speed.
- A tested export.
- A clear gameplay purpose.

Use looping animations for idle, walk, run, and other repeated activities where appropriate. Use non-looping clips for pickups, repairs, greetings, and other discrete actions.

## 7.5 Animation blending

Implement transitions between locomotion states.

Do not instantly switch between unrelated poses when a character starts or stops moving.

Use the Three.js AnimationMixer and appropriate blending logic.

The game must prevent incompatible actions from playing simultaneously unless layering is explicitly supported.

For example, a repair animation should not accidentally blend with a full-speed running animation.

---

# 8. Blender Modeling and Export Pipeline

## 8.1 Blender's role

Blender is the main environment for producing and validating custom 3D assets.

Claude Code can generate Blender Python scripts, invoke Blender in background mode where available, create procedural geometry, organize scenes, apply materials, generate simple rigs, and export assets.

However, automatically generated geometry is not automatically production-quality. Each asset still requires visual inspection and in-engine testing.

## 8.2 Asset naming

Use stable, descriptive names.

Examples:

- `CHR_Player_Base`
- `CHR_NPC_Gardener`
- `ENV_Temple_Pillar_A`
- `ENV_House_Small_A`
- `PRP_Flower_Basket_A`
- `PRP_Watering_Vessel_A`
- `PROP_Channel_Restored_A`
- `MAT_Stone_Warm_A`
- `TEX_Stone_BaseColor_A`
- `ANIM_Player_Walk`
- `ANIM_Player_Pickup`

The naming convention should be documented and applied consistently.

## 8.3 Blender scene organization

Each Blender project should organize objects into named collections.

Examples:

- `Geometry`
- `Materials`
- `Rig`
- `Animation`
- `Reference`
- `Collision`
- `Export`

The exact collection layout may vary by asset type.

Do not export cameras, reference images, lights, or hidden modeling helpers unless they are intentionally required.

## 8.4 Modeling standards

For every model:

- Apply or document transforms.
- Set the origin deliberately.
- Use consistent scale.
- Fix face orientation.
- Check normals.
- Avoid accidental duplicate geometry.
- Remove unnecessary hidden objects.
- Use clean UV maps when textures require them.
- Keep material slots organized.
- Use efficient geometry for repeated objects.
- Create appropriate collision proxies for important interactables.
- Inspect the model in a neutral lighting environment.

## 8.5 Modular architecture

The environment should use reusable modules.

Potential modules:

- Wall sections.
- Pillars.
- Pillar bases.
- Pillar capitals.
- Steps.
- Door frames.
- Window frames.
- Roof sections.
- Roof tiles.
- Floor pieces.
- Fence segments.
- Workshop counters.
- Market stall pieces.

Modular construction allows the environment to grow without requiring a separate unique mesh for every building.

Modules must align at consistent dimensions and pivots.

## 8.6 Blender procedural generation

Use procedural generation where it creates reliable value.

Good candidates include:

- Repeated stone blocks.
- Repeated roof tiles.
- Pillar variations.
- Fence sections.
- Flower clusters.
- Small baskets and pots.
- Modular walls.
- Repeated architectural ornaments.

Procedural generation should not be used as an excuse to make every model look like a primitive placeholder.

Major landmarks, characters, and recognizable props require deliberate art direction and visual review.

## 8.7 Export settings

Use GLB or glTF 2.0.

Validate:

- Coordinate orientation.
- Scale.
- Materials.
- Texture references.
- Skeleton.
- Skin weights.
- Animation clips.
- Loop behavior.
- Mesh hierarchy.
- File size.
- Browser rendering.

Do not assume that an asset working inside Blender guarantees that it works in Three.js.

## 8.8 Automated export

Where appropriate, write Blender Python scripts that can:

1. Open a source `.blend` file.
2. Validate required objects and actions.
3. Apply export-safe settings.
4. Export the selected asset.
5. Write an export report.
6. Return an error if required content is missing.

Never silently report success when the exported file is absent or invalid.

---

# 9. Detailed Environment Model Requirements

## 9.1 Temple exterior

The central temple exterior is one of the most important visual assets.

Create a deliberate design with:

- A recognizable silhouette.
- A coherent entrance.
- Appropriate stone or plaster surfaces.
- Steps and thresholds.
- Pillars and structural details.
- Carefully designed trim.
- Repeated but varied architectural modules.
- Material variation.
- Clear navigation.
- A consistent relationship between exterior and interior spaces.

The model should have near, middle, and distant visual detail appropriate to the camera.

Avoid simply combining generic fantasy castle pieces.

The precise architecture must be based on the chosen historical and cultural references.

## 9.2 Pillars

Each pillar should have:

- Base.
- Shaft.
- Capital.
- Appropriate ornamentation.
- UVs and materials.
- A consistent vertical scale.
- Correct origin.
- Optional variations.

Create a small family of related pillar models rather than dozens of unrelated designs.

## 9.3 Houses

Each house should include:

- Walls.
- Roof.
- Door and windows.
- Appropriate structural details.
- Material assignments.
- Interior or exterior-only classification.
- Collision representation.
- Optional damaged or restored variants where required.

For inaccessible buildings, use a visually convincing exterior rather than building a full interior with no gameplay purpose.

## 9.4 Market stalls

Create modular stalls with:

- Supports.
- Canopy or covering where appropriate.
- Counter.
- Storage.
- Product display positions.
- Optional cloth variants.
- Collision.
- Interaction location.

Goods should be separate reusable objects so stock can change without rebuilding the stall.

## 9.5 Workshop

The workshop needs:

- Exterior.
- Entrance.
- Workbench.
- Storage.
- Material display.
- Crafting interaction point.
- Appropriate tools.
- Lighting.
- Optional restored or neglected states.

## 9.6 Garden

The garden should use reusable components:

- Ground and soil.
- Planting areas.
- Flowers.
- Herbs.
- Trees.
- Paths.
- Water access.
- Decorative boundaries.
- Gathering points.

Plants should be instanced or reused efficiently where appropriate.

## 9.7 Irrigation channel

The channel must be both a model and a gameplay object.

Create visual states for:

- Damaged or blocked.
- Repaired but not yet active, if the design needs that state.
- Repaired and flowing.

The state must be driven by game data.

Do not manually swap the model in a way that becomes inconsistent with the save system.

## 9.8 Forgotten grounds

Create a coherent set of environment pieces:

- Broken masonry.
- Weathered surfaces.
- Overgrown vegetation.
- Damaged paths.
- Historical objects.
- Reusable debris.
- Restorable structural elements.

The location should remain readable and navigable.

## 9.9 Small props

Props should have appropriate dimensions, pivots, materials, and interaction definitions.

Examples:

- Basket.
- Pot.
- Bowl.
- Vessel.
- Tool.
- Flower bundle.
- Sack.
- Box.
- Storage chest.
- Book or record.
- Market goods.

Not every decorative prop requires a unique texture or complex geometry.

---

# 10. Visual Asset Generation Workflow

Image generation is used to create visual references and, where suitable, texture inputs. It does not automatically create a production-ready animated 3D model.

## 10.1 Generate reference sheets

Before modeling a major asset, generate reference images showing:

- Front view.
- Side view.
- Rear view where necessary.
- Three-quarter view.
- Close-up details.
- Material and color references.
- Scale reference.

For buildings, also generate layout or architectural reference views.

For characters, create consistent turnaround references and a clothing detail sheet.

## 10.2 Reference consistency

Use the same design description for all views of a particular asset.

Keep the same:

- Silhouette.
- Proportions.
- Materials.
- Ornamentation.
- Clothing.
- Color palette.
- Structural details.

Do not generate unrelated front and side views and assume they depict the same object.

## 10.3 Concept images versus final assets

Use generated images as visual references for Blender modeling.

A single image generally does not provide:

- Reliable hidden geometry.
- Correct topology.
- A rig.
- Skin weights.
- Collision.
- Animation.
- A UV layout.
- A complete, consistent 3D model.

If a generated image is used as a texture, check whether the subject is suitable for projection or mapping. A picture of an entire building is not automatically a usable building texture.

## 10.4 Texture production

Potential texture maps include:

- Base color.
- Normal map.
- Roughness.
- Ambient occlusion, where appropriate.
- Metallic, where appropriate.
- Alpha, when required.

Do not generate every map independently without checking consistency.

For example, a stone base-color texture should not have strong baked shadows if the game will render real-time lighting.

Use physically sensible material values and keep texture sizes within performance budgets.

## 10.5 Asset acceptance

Every generated image should be reviewed before becoming a production reference.

Reject references that contain:

- Inconsistent geometry.
- Contradictory architectural details.
- Unwanted text or watermarks.
- Unusable perspective.
- Inconsistent character clothing.
- Unclear silhouettes.
- Cultural details that conflict with the selected reference brief.

---

# 11. Lighting, Materials, and Rendering

## 11.1 Visual goal

The world should feel detailed, atmospheric, and cohesive while remaining performant in a browser.

Prioritize composition, silhouette, lighting, and material quality before adding expensive effects.

## 11.2 Lighting

Use a controlled lighting setup:

- Main daylight source.
- Ambient or environment lighting.
- Shadows for important structures.
- Local lights where justified.
- Interior or covered-area lighting when required.
- Time-of-day changes if supported.

Avoid using many real-time shadow-casting lights without performance testing.

## 11.3 Materials

Use coherent roughness, metalness, and color values.

Stone should not look like polished plastic. Wood should not look like metal. Water needs a different treatment from opaque surfaces.

Use material variation to make the world believable without adding unnecessary geometry.

## 11.4 Atmosphere

Potential effects:

- Gentle environmental motion.
- Subtle dust.
- Water movement.
- Rain.
- Soft shadows.
- Carefully controlled fog, if useful.
- Distant ambient activity.

Atmosphere must not obscure interaction targets or make the world difficult to navigate.

## 11.5 Browser performance

Use:

- Shared materials.
- Instancing for repeated objects.
- Efficient geometry.
- Texture compression where supported.
- Level of detail for distant assets.
- Frustum culling.
- Lazy loading of nonessential areas.
- Appropriate shadow settings.
- Bounded particle counts.

Do not optimize solely by reducing all models to low-detail primitives. Optimize repeated geometry, material switching, texture sizes, and unnecessary scene complexity.

---

# 12. Audio Production with Gemini Lyria

## 12.1 Audio direction

The audio should support a calm, lived-in settlement.

Use distinct layers for:

- Ambient music.
- Settlement ambience.
- Natural environment.
- Player movement.
- Interactions.
- Crafting.
- Restoration.
- Discovery.
- UI.
- Festivals or special events.

## 12.2 Music tracks

The initial project may require:

1. Main theme.
2. Morning ambience.
3. Daytime settlement ambience.
4. Evening ambience.
5. Exploration theme.
6. Workshop or crafting ambience.
7. Restoration theme.
8. Historical discovery theme.
9. Festival theme.
10. Main menu theme, which may reuse the main theme.

Some tracks can be reused with controlled volume and transition rules. Do not create ten separate long compositions if a smaller, coherent set provides the same experience.

## 12.3 Environmental sounds

Generate or record appropriate sound effects for:

- Birds.
- Wind through foliage.
- Water flow.
- Footsteps on stone.
- Footsteps on soil.
- Cloth movement.
- Object pickup and placement.
- Crafting materials.
- Tools.
- Doors and containers.
- Market activity.
- Workshop ambience.
- Rain.
- UI interactions.

Religious or ceremonial audio must be based on researched references and used appropriately.

## 12.4 Lyria prompt guidelines

For each track, specify:

- Intended use.
- Emotional tone.
- Instrumentation.
- Tempo or rhythmic character.
- Duration target.
- Dynamic range.
- Whether the track should loop.
- Whether it should contain vocals.
- Whether it must avoid lyrics or recognizable melodies.
- Intended start and ending behavior.

Example music prompt:

> Create an original instrumental ambient exploration cue for a stylized historical South Indian settlement in a 3D life-simulation game. The mood is contemplative, curious, and quietly hopeful. Use a restrained combination of culturally appropriate acoustic timbres, gentle natural ambience, and subtle melodic development. Avoid blockbuster orchestration, horror tension, aggressive percussion, and modern pop drums. No vocals or lyrics. Leave space for environmental sound effects. Create a smooth beginning and ending suitable for editing into a seamless loop. Do not imitate a named artist or existing composition.

This is a starting brief. Refine instrumentation after the cultural research is complete.

## 12.5 Sound-effect prompts

Example water-channel prompt:

> Create a clean environmental sound effect of a small stone irrigation channel carrying a gentle flow of water in a quiet outdoor settlement. The water should sound natural and continuous, with subtle variations but no dramatic splashes. No voices, music, or artificial effects. Provide a clean loop suitable for background playback.

Example workshop prompt:

> Create an environmental sound layer for a small traditional craft workshop. Include subtle material handling, light tool contact, and a quiet lived-in atmosphere. Keep the sounds natural and restrained, without speech or music. Avoid exaggerated cinematic impacts. The recording should be suitable for a low-volume looping ambience layer.

Example restoration feedback prompt:

> Create a short, restrained positive game sound for the completion of a meaningful environmental restoration. It should feel tactile, warm, and quietly satisfying rather than magical or explosive. No voices or music. Avoid copying any existing game sound. The effect should be clear and brief enough to play over the environment.

## 12.6 Audio implementation

Claude must implement:

- Audio asset loading.
- Music playback.
- Crossfades where appropriate.
- Loop handling.
- Spatial sound where useful.
- Ambient sound layers.
- UI sound triggers.
- Volume controls.
- Audio activation after a user gesture where required by browser autoplay restrictions.
- Error handling for missing audio.

Do not assume browsers allow autoplay with sound before user interaction.

## 12.7 Audio file management

Maintain an audio manifest containing:

- Asset ID.
- Filename.
- Type.
- Duration.
- Loop status.
- Intended use.
- Volume target.
- Source.
- License or generation record.
- Integration status.

Do not claim that an audio file has been generated until the actual file is available and checked.

---

# 13. UI and Interaction Design

## 13.1 Visual identity

The UI should be premium, readable, and unobtrusive.

Use a coherent typography system, spacing scale, icon style, and restrained color palette.

The historical world and modern interface should complement each other rather than compete visually.

## 13.2 Main menu

Include:

- New Game.
- Continue.
- Load Game, if supported separately.
- Settings.
- Credits.
- Quit or a browser-appropriate equivalent.

The main menu should show a real game scene or a dedicated composition, not an unrelated placeholder image.

## 13.3 HUD

Include only essential information:

- Interaction prompt.
- Current objective.
- Selected tool or item, if relevant.
- Temporary notifications.
- Essential resource information.

Do not permanently fill the screen with every system.

## 13.4 Inventory

Show item icon, name, quantity, category, and description.

Support clear feedback when an item cannot be used or moved.

## 13.5 Quest journal

Show active objectives, completed objectives, relevant locations, and rewards where appropriate.

## 13.6 Dialogue

Provide a readable speaker name, dialogue text, and response options.

Support keyboard interaction and clear focus behavior.

## 13.7 Living Record

Use a timeline or journal that shows important events, locations, outcomes, and related discoveries.

Where practical, let the player locate an affected area on the map or return to the relevant location.

## 13.8 Settings

Implement functional settings for:

- Master volume.
- Music volume.
- Effects volume.
- Mouse sensitivity.
- Graphics quality.
- Display options where supported.
- Text readability.
- Camera sensitivity.

Do not display controls that have no effect.

---

# 14. Project File Structure

Use a structure similar to the following.

    temple-of-monks/
    ├── README.md
    ├── package.json
    ├── package-lock.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── public/
    │   ├── assets/
    │   │   ├── models/
    │   │   │   ├── characters/
    │   │   │   ├── buildings/
    │   │   │   ├── environment/
    │   │   │   ├── props/
    │   │   │   └── landmarks/
    │   │   ├── textures/
    │   │   │   ├── characters/
    │   │   │   ├── architecture/
    │   │   │   ├── props/
    │   │   │   └── environment/
    │   │   ├── audio/
    │   │   │   ├── music/
    │   │   │   ├── ambience/
    │   │   │   ├── footsteps/
    │   │   │   ├── interactions/
    │   │   │   └── ui/
    │   │   ├── images/
    │   │   │   ├── concepts/
    │   │   │   ├── icons/
    │   │   │   └── ui/
    │   │   └── fonts/
    │   └── favicon.svg
    ├── blender/
    │   ├── source/
    │   ├── characters/
    │   ├── environment/
    │   ├── props/
    │   ├── scripts/
    │   ├── references/
    │   └── export_reports/
    ├── src/
    │   ├── main.tsx
    │   ├── app/
    │   ├── game/
    │   │   ├── core/
    │   │   ├── player/
    │   │   ├── camera/
    │   │   ├── interaction/
    │   │   ├── inventory/
    │   │   ├── crafting/
    │   │   ├── quests/
    │   │   ├── npc/
    │   │   ├── dialogue/
    │   │   ├── relationships/
    │   │   ├── world/
    │   │   ├── restoration/
    │   │   ├── living-record/
    │   │   ├── economy/
    │   │   ├── progression/
    │   │   ├── time/
    │   │   ├── audio/
    │   │   └── save/
    │   ├── data/
    │   │   ├── items/
    │   │   ├── recipes/
    │   │   ├── quests/
    │   │   ├── npcs/
    │   │   ├── dialogue/
    │   │   ├── restorations/
    │   │   └── events/
    │   ├── ui/
    │   │   ├── components/
    │   │   ├── screens/
    │   │   └── styles/
    │   └── tests/
    ├── docs/
    │   ├── GAME_DESIGN.md
    │   ├── WORLD_DESIGN.md
    │   ├── CULTURAL_RESEARCH.md
    │   ├── ART_BIBLE.md
    │   ├── CHARACTER_BIBLE.md
    │   ├── ANIMATION_SPEC.md
    │   ├── ASSET_MANIFEST.md
    │   ├── AUDIO_BIBLE.md
    │   ├── TECHNICAL_ARCHITECTURE.md
    │   ├── SAVE_FORMAT.md
    │   ├── TEST_PLAN.md
    │   └── KNOWN_ISSUES.md
    └── playwright.config.ts

This is a target structure, not a reason to create dozens of empty files. Claude should create files when implementing the corresponding system.

---

# 15. Data Contracts

## 15.1 Item definition

Every item must have a stable ID and data defining its identity, stack behavior, description, and category.

Illustrative TypeScript:

    interface ItemDefinition {
      id: string;
      name: string;
      description: string;
      category: string;
      icon: string;
      maxStack: number;
      tags: string[];
    }

## 15.2 Recipe definition

    interface RecipeDefinition {
      id: string;
      name: string;
      stationId?: string;
      inputs: Array<{
        itemId: string;
        quantity: number;
      }>;
      outputs: Array<{
        itemId: string;
        quantity: number;
      }>;
      prerequisites: string[];
    }

## 15.3 Quest definition

    interface QuestDefinition {
      id: string;
      title: string;
      description: string;
      prerequisites: string[];
      objectives: Array<{
        id: string;
        type: string;
        targetId?: string;
        requiredCount?: number;
      }>;
      rewards: Array<{
        type: string;
        targetId?: string;
        amount?: number;
      }>;
    }

## 15.4 Restoration definition

    interface RestorationDefinition {
      id: string;
      name: string;
      initialState: string;
      states: string[];
      requiredMaterials: Array<{
        itemId: string;
        quantity: number;
      }>;
      prerequisites: string[];
      resultingWorldFlags: string[];
      recordEventType: string;
    }

## 15.5 Living Record event

    interface LivingRecordEvent {
      id: string;
      type: string;
      worldDay: number;
      locationId: string;
      actionId: string;
      affectedEntityIds: string[];
      previousState?: unknown;
      resultingState?: unknown;
      causeEventIds: string[];
      descriptionKey: string;
    }

These contracts are starting points. Claude must refine them into type-safe, validated structures consistent with the chosen architecture.

Do not use `unknown` or unvalidated arbitrary objects in authoritative gameplay logic without a deliberate reason.

---

# 16. Development Roadmap

Development must be staged. Do not attempt to build the entire game in a single generation pass.

## Phase 1 — Project foundation

Deliver:

- Working Vite application.
- Three.js scene.
- Camera.
- Lighting.
- Basic ground.
- Player movement.
- Collision.
- Interaction framework.
- Build and error checks.

**Exit criterion:** a player can enter the browser game, move through a small test environment, and interact with a test object.

## Phase 2 — Art and asset pipeline

Deliver:

- Blender scale reference.
- First production-ready prop.
- First modular building pieces.
- Player model.
- Character rig.
- GLB export process.
- Asset manifest.
- Browser model-loading system.

**Exit criterion:** real custom models render in the browser with correct scale, materials, and origins.

## Phase 3 — Character animation

Deliver:

- Idle.
- Walk.
- Run.
- Interaction.
- Pickup.
- Crafting action.
- Animation state machine.
- NPC reuse of compatible animations.

**Exit criterion:** animation transitions work in the running browser game without severe snapping or rig errors.

## Phase 4 — First playable area

Deliver:

- Central courtyard.
- Residential street.
- Workshop.
- Garden.
- Irrigation channel.
- Forgotten area.
- Player starting location.
- Basic navigation and landmarks.

**Exit criterion:** the map is navigable and supports the initial quest without invisible walls or inaccessible objectives.

## Phase 5 — Gameplay loop

Deliver:

- Gathering.
- Inventory.
- Crafting.
- First profession.
- NPC dialogue.
- Quest progression.
- Restoration.
- Basic trading.

**Exit criterion:** the player can complete a useful activity, obtain a result, and continue to another activity.

## Phase 6 — Living Record and persistence

Deliver:

- World-state manager.
- Restoration state transitions.
- Event recording.
- Living Record UI.
- Save and load.
- Schema validation.

**Exit criterion:** a restoration changes the world, creates a meaningful record entry, survives reload, and does not duplicate rewards.

## Phase 7 — Audio and atmosphere

Deliver:

- Music.
- Environmental ambience.
- Interaction sounds.
- Volume settings.
- Time-of-day presentation.
- Appropriate environmental effects.

**Exit criterion:** audio starts correctly, can be controlled, and does not prevent the game from running if an optional file is missing.

## Phase 8 — Story and community content

Deliver:

- Three to five functional NPCs.
- Eight to twelve meaningful quests or activities.
- Ten to twenty useful item definitions.
- Five to ten working recipes.
- One major restoration project.
- One historical discovery.
- One festival milestone.
- One personal living space.

These are initial content targets, not a requirement to fill the world with repetitive tasks.

**Exit criterion:** a player can experience a coherent beginning, meaningful progression, and a satisfying community outcome.

## Phase 9 — Polish and release candidate

Deliver:

- Main menu.
- Settings.
- Improved UI.
- Consistent materials and lighting.
- Audio mix.
- Performance tuning.
- Browser testing.
- Save recovery.
- Accessibility improvements.
- Asset and license audit.
- Deployment build.

**Exit criterion:** the game can be opened in a supported browser, played through the core loop, saved, reloaded, and completed without critical blockers.

---

# 17. Testing Requirements

## 17.1 Browser tests

Verify:

- Application starts.
- Scene loads.
- Assets resolve.
- Controls work.
- UI responds.
- Errors are surfaced.
- Save/load works.
- Browser refresh does not silently destroy saved progress.
- Audio settings affect playback.

## 17.2 Gameplay tests

Test:

- Gathering without sufficient inventory capacity.
- Crafting without required materials.
- Repeating an interaction.
- Completing an objective.
- Saving during a quest.
- Loading an incomplete quest.
- Completing a restoration.
- Reloading a restored world.
- Repeating a completed quest action.
- Missing optional assets.
- NPC schedule transitions.

## 17.3 Asset tests

Check:

- GLB files load.
- Materials are present.
- Textures are found.
- Models use correct scale.
- Origins and pivots are correct.
- Animations are available.
- Animation names match the code.
- No critical console errors occur.
- Model file sizes are reasonable.

## 17.4 Performance tests

Measure performance on a realistic desktop browser, not just on a development machine with an unusually powerful GPU.

Track:

- Frame rate.
- Frame-time spikes.
- Draw calls.
- Visible triangles.
- Texture memory.
- Loaded asset size.
- Startup time.
- Scene transition time.
- Long-session memory growth.

Set explicit budgets after the first representative scene is running. Avoid claiming a universal frame rate before measuring on target hardware.

---

# 18. Scope Boundaries

## Required for the first complete prototype

- One compact settlement.
- One player character.
- Three to five functional NPCs.
- Basic movement and camera.
- Core interaction.
- Inventory.
- Gathering.
- One or two professions.
- Crafting.
- Quest system.
- Restoration.
- Living Record.
- Save/load.
- Basic dialogue and relationships.
- One meaningful historical discovery.
- One community event or festival milestone.
- Functional UI.
- Audio and settings.
- A coherent art direction.

## Not required for the first prototype

- Multiplayer.
- Massive open world.
- Hundreds of NPCs.
- Fully simulated historical economy.
- Free-form building.
- Unrestricted AI dialogue.
- Advanced combat.
- Multiple historical eras.
- Cloud accounts.
- Dedicated servers.
- Online trading.
- VR.
- Full voice acting for every character.
- Real-time global weather.
- Complex procedural civilization simulation.

These are potential future features only if the core game proves enjoyable.

---

# 19. Definition of Done

A feature is not complete because code was generated.

A feature is complete when:

1. Its behavior is implemented.
2. Its dependencies are connected.
3. Its visual presentation works.
4. Its data is validated.
5. Its important state persists where required.
6. Its errors are handled.
7. It has been tested in the browser.
8. It has no known critical integration failures.
9. The relevant documentation is updated.
10. The implementation report describes what actually works.

An asset is not complete because a reference image exists.

A 3D asset is complete when its model, materials, scale, origin, and required rig or animation are ready, it has been exported, and it has been tested in the game.

An animation is not complete because an action name exists.

It is complete when the clip is present, the rig is compatible, the transition works, and the result has been checked in the browser.

An audio track is not complete because a prompt has been written.

It is complete when the audio file exists, its quality and licensing or generation provenance have been checked, and playback has been tested in the game.

---

# 20. Final Product Standard

Temple of Monks should feel like a deliberately designed indie game, not a generic browser demo.

The player should see:

- A recognizable settlement.
- Distinctive architecture.
- Characters with consistent proportions and expressive animation.
- Environments with coherent materials.
- Interactions with tactile feedback.
- Meaningful progression.
- Residents who react to important events.
- Restored spaces that remain restored.
- Audio that supports the environment.
- A Living Record that explains the player's legacy.

The project should favor a smaller number of finished, connected systems over a large number of incomplete features.

**The goal is not to create the most assets possible. The goal is to make every important asset and system contribute to a coherent, persistent world.**
