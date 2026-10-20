# World Design

The settlement as built: its layout, the places and what happens there, how the story moves the player through it, and how the world shows change. Coordinates are world metres from `src/data/level.ts` (x east, z south, y up; the gopuram faces south). The data files are authoritative; this document explains them.

## Layout

The map is 300 × 300 m. At its centre is the **walled core**, a 92 × 92 m stone enclosure (x and z from −46 to 46). Everything else is outside the walls and reached through four gates:

| Gate | Where | Leads to |
|---|---|---|
| Gopuram (main gate) | south wall, x −6 to 6 | the south approach road and the temple tank |
| North gate | north wall, x 18 to 26 | the north fields and the reservoir |
| West gate | west wall, z −30 to −22 | the western ruins and the woodland |
| East gate | east wall, z 6 to 14 | the east bazaar, the well square and the east lane |

Inside the core, the **temple** stands in its own prakara (x −12 to 12, z −32 to 0; the only opening is the front, |x| < 4). In front of it is the paved **central courtyard**, with the lamp pillar, the festival table, benches and a mandapam. The gopuram and the courtyard gate face the main approach.

## Places

| Region (id) | Name in game | Bounds (x, z) | What is there | Who |
|---|---|---|---|---|
| loc_entrance | Main gate | −8..8, 36..50 | the gopuram, the courtyard gate, the gate garland (once hung) | Valli by day |
| loc_courtyard | Central courtyard | −16..16, 0..36 | lamp pillar, festival table, benches, notice board, festival decorations | Ponnan's walks, festival evenings |
| loc_temple | Temple | −12..12, −32..0 | sanctum, steps, the prakara walls (Karthigai lamps after the second festival) | Sundaram the archaka (puja 5–8 and 17–19) |
| loc_street | West street | −32..−16, −6..36 | a row of houses with verandas, jasmine bushes | Ponnan's veranda |
| loc_home | Your house | −30..−20, 24..33 | the player's enterable house: storage chest, shelf, decoration spots | the player |
| loc_market | Selvam's stall | 14..26, 24..36 | Selvam's stall (daily cart specials, festival stock) | Selvam |
| loc_workshop | Velan's workshop | 20..32, 2..16 | the open-fronted workshop, workbench station, stone work surface, Kamala's lamp-casting corner (neglected until reopened) | Velan |
| loc_garden | Settlement garden | 14..40, −32..−14 | four flower beds, the irrigation channel | Amudha |
| loc_claypit | Clay bank | 10..20, −42..−31 | lime clay gathering | |
| loc_forgotten | Old grounds | −46..−16, −46..−22 | salvage stone, the inscribed stone, broken brass | |
| loc_kulam | Temple tank | −70..−14, 56..108 | the large stepped tank (water source), Valli's lost bangle | |
| loc_approach | South approach | −14..40, 46..150 | the approach road, seating under trees, a rain shelter | travellers |
| loc_bazaar | East bazaar | 46..140, −16..30 | eight stalls, the granary (locked at night) | traders, Kannan the watchman |
| loc_well | Well square | 72..92, −2..20 | the bazaar well (restorable) | a queue at the well |
| loc_lane | East lane | 64..96, 22..82 | houses and the weaver's house (restorable) | Meena (once she returns), laundry |
| loc_fields | North fields | 26..140, −150..−46 | paddy plots, the field hut, the channel network | farmers |
| loc_reservoir | Reservoir | 60..104, −150..−114 | the reservoir wall and its sluice (restorable) | |
| loc_ruins | Western ruins | −150..−46, −60..20 | a walled enclosure: the broken brick wall, the fallen pillar, the old pavilion with the manuscript, Velan's chisel, broken brass | |
| loc_woods | Woodland | −150..−46, −150..−60 | neem trees and log piles (timber) | |

Anywhere else is reported as "Outside the walls".

## Movement through the world

- **Paths.** NPCs route over a waypoint graph (`WAYPOINTS` and `EDGES` in `level.ts`): the gate, the courtyard and its east and west sides, the streets, the garden gate, the workshop, the east gate and the bazaar, out to the fields, ruins and road. Stuck recovery re-plans, skips a waypoint, then steps past (tested in `npc-stuck.spec.ts`).
- **Anchors.** Each NPC schedule names anchors (`ANCHORS`), positions with a facing where an activity happens: the workshop bench, the garden beds, the market counter, the temple door, the field hut and others. Shelter anchors (the bazaar shelter, the field shelter, the road shelter, the workshop and courtyard covers) take people out of the rain.
- **Interiors.** The player's house and the granary are enterable. "Indoors" is detected by a roof collider overhead. Entering someone else's house uninvited draws a remark.

## How the story uses the space

The quest arc starts at the gate and widens outward as each restoration opens the next area:

1. **Gate and courtyard** (*A Welcome of Jasmine*, *A Place of Your Own*). The player meets Valli, gathers jasmine on the west street and settles into the house.
2. **Garden and workshop** (*The Silent Channel*, *Garland for the Gate*). Velan teaches mortar at the workshop, with stone from the old grounds and clay from the bank. The repaired channel brings the garden back.
3. **Old grounds** (*Words in Old Stone*). The inscription explains why the channel mattered.
4. **East bazaar and well** (*Water for the Bazaar*). The first trip out of the east gate.
5. **North fields and reservoir** (*The Field Sluice*, *First Harvest*). The sluice irrigates the paddy.
6. **Western ruins and woodland** (*Stones of the Old Wall*, *Leaves in the Old Pavilion*, *Velan's Chisel*). Timber, the frieze and the manuscript.
7. **East lane** (*The Empty Loom*). The weaver comes home.
8. **The courtyard again** (*The Lamp Festival*). The festival draws on everything mended.
9. **The workshop again, then the temple walls** (*The Forgotten Craft*, *Karthigai Deepam*). Kamala's casting corner reopens, and its brass lamps light the temple for the second festival.

## The world shows change

Persistent state (`GameState.restorations` and `flags`) decides what is shown. Nothing is hand-toggled.

- **Restoration variants.** Assets carry `STATE_<state>` children, such as the channel (blocked / flowing), the garden beds (withered / recovering), the brick wall (broken / repaired), the weaver's house (neglected / restored) and the casting corner (neglected / reopened). Restorations can also swap collision, for example a cleared path opens.
- **Staged festival build-up.** Bunting appears when preparations start, kolams and arches when the offering bundle is ready, and lit lamps and stands once the festival is held. Lamp rows along the prakara walls and a brass lamp at the sanctum door are added after Karthigai Deepam.
- **Life by the clock.** Schedules move people through the day. Evening lamps light from dusk, and the bells ring for the 5:00 and 17:00 pujas. Festival evenings gather everyone in the courtyard.
- **Weather.** Deterministic rain blocks send villagers to the shelter anchors, wet the ground and pull in the fog.
- **Sound.** Music follows the hour and the place. The workshop is heard from Velan's bench while he works there.

## Temple Visit layouts

The Temple Visit mode (`GAME_DESIGN.md`) reuses this world. Its stations are placed by `LAYOUTS` in `src/data/visit.ts`:

| Temple | Gate (parking measured to) | Notes |
|---|---|---|
| Big city temple | (0, 50), the gopuram | the queue rails, coconut stone, lamp stand, prasadam counter and annadanam mats in and around the courtyard; three chappal bushes |
| Neighbourhood shrine | (−106, 8) | a small new shrine west of the core, in the ruins region |
| Hill temple | (−112, 50) | a 30-step climb stage |

The family's auto waits outside the player's house at (−20.5, 33). A light column over the gate and a HUD arrow guide the drive until the auto is parked.
