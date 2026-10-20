# Gameplay Systems

## Controls

| Key | Action |
|---|---|
| W A S D / arrows | move (camera-relative) |
| Shift | jog; keep holding to build into a sprint |
| Space | jump; near a waist-high obstacle: vault; at a ledge up to 2.1 m: climb |
| C | crouch (toggle) |
| Right mouse (hold) | focus: face where the camera looks, strafe and backpedal |
| Mouse | rotate camera (click the scene to capture the mouse, or hold the right button and drag) |
| Wheel | camera distance 2.2–9 m |
| E | primary interaction / advance dialogue |
| R | secondary interaction (e.g. inspect when repair is available) |
| I / J / L | inventory / journal / Living Record |
| M / K | map / community and skills |
| Esc | close panel, or pause |
| 1–4, Space, Enter | dialogue options / continue |
| Movement key while seated | stand up |
| Gamepad (standard mapping) | left stick move (analog speed) · right stick look · A interact/accept · B back · X secondary · LT or L3 run · LB inventory · RB map · Y journal · View record · Start pause · d-pad up/down in menus |

Every keyboard action except pause can be rebound in Settings → Controls. A key can drive only one action; giving it to another action leaves the old one "(unbound)" until it is rebound or the defaults are restored. The HUD key hints follow the bindings.

## The map

300 × 300 m. The walled core (92 m square, four gates) holds the temple, west street, workshop, garden and old grounds. Outside it:

| Area | Contents | Gate |
|---|---|---|
| South approach | palm-lined road, notice board, seating mandapam, water point, large stepped temple tank with a central pavilion, hibiscus | south (gopuram) |
| East bazaar | eight bamboo stalls with goods, the well square (well, trough, bench), houses | east |
| East lane | houses, laundry line, **the weaver's house** (neglected → restored) | via the well square |
| North fields | the field hut and your four plots, 20 paddy plots fed by a 56 m channel spine, dry grass, the boundary stone, **the reservoir and its sluice gate** | north |
| Western ruins | broken brick gate, **brick wall and fallen pillar**, **overgrown path** into a walled enclosure, the old pavilion with the **manuscript case** | west |
| Woodland | neem trees and **log piles** (timber) | via the ruins |

## Story (12-quest arc, then the casting corner and Karthigai Deepam)

| Quest | Giver | What happens | Changes the world |
|---|---|---|---|
| A Welcome of Jasmine | Valli | gather jasmine | record: arrival |
| A Place of Your Own | Valli | store an item in your chest, place a decoration, show Valli | record: home; reward kolam flour |
| The Silent Channel | Amudha | inspect, learn mortar from Velan, salvage stone, dig clay, craft mortar, repair | channel flows → **garden recovers** (consequence) |
| Garland for the Gate | Amudha | marigolds + jasmine + twine (Selvam) → garland → Valli | garland hangs on the gopuram |
| Words in Old Stone | Ponnan | read the inscribed stone | discovery |
| Water for the Bazaar | Selvam | learn carpentry, timber from the woods, rope, craft a bucket, fix the well | well draws water (new water source) |
| The Field Sluice | Amudha | timber, rope, craft a sluice board, mortar, open the sluice | **fields irrigate** (consequence); plots auto-water |
| First Harvest | Amudha | buy seeds, plant, water, harvest, share | reward tulsi pot (decoration) |
| Stones of the Old Wall | Velan | stone + mortar, rebuild the brick wall, raise the pillar with rope | the pillar reveals a **carved frieze** discovery |
| Leaves in the Old Pavilion | Ponnan | buy a sickle, clear the overgrown path, find the manuscript, deliver | the **channel rota** is posted on the notice board; villagers talk about their month |
| The Empty Loom | Valli | inspect, learn thatching, make thatch bundles, timber, mortar, restore the house | **Meena the weaver returns**; her shop opens |
| The Lamp Festival | Ponnan (needs garland, fields and weaver done) | plan with Valli, harvest vegetables, cloth from Meena, a fresh garland, prepare the bundle at the festival table, deliver | **festival**: kolams, bunting, banana arches and lit lamps; everyone gathers in the courtyard each evening 17:00–23:00; record links back to five earlier events |

| The Forgotten Craft | Velan (after *Velan's Chisel*) | inspect Kamala's old lamp-casting corner behind the workshop, read her palm-leaf ledger (discovery), timber + mortar + rope to reopen it, broken brass from the ruins and the old grounds (pickups; Selvam's cart also brings some), beeswax from Selvam, cast a brass lamp at the furnace, show Velan | the corner changes from **neglected** (dust sheet, fallen shelf, cracked cold furnace) to **reopened** (glowing furnace, wax models, lamps on the shelf); the **casting furnace** station appears; Selvam buys cast lamps |
| Karthigai Deepam | Sundaram (needs the lamp festival and the casting corner) | ask Velan, cast a brass lamp, three clay lamps, bring both to Sundaram, help Valli line the walls | **lamps along the temple walls** and a brass lamp stand at the sanctum door, lit from dusk; record links back to the casting corner and the lamp festival |

The notice board by the south gate lists every quest whose prerequisites are met but which has not been started, with who to ask.

## Systems

- **Inventory:** 20 slots, per-item stack limits. All adds/removes are whole-transaction (never partial).
- **Storage chest:** 24 slots at your house; click a stack to move it between bag and chest. Quest item rewards that do not fit in the bag go to the chest instead of being lost.
- **Crafting:** two stations (Velan's workbench, festival table), six recipes, unlocked by flags learned in dialogue. Inputs are validated before anything is consumed.
- **Trading:** Selvam (twine, rope, seeds, water pot, sickle, lamp, mat, kolam flour; buys flowers, vegetables, timber) and Meena (cloth). Quest-protected items cannot be sold.
- **Farming:** four plots. Plant (seeds) → water (a full water pot; fill it at the garden tank, the water point, or the well once repaired) → grows for 3 world hours (3 real minutes) → harvest 2 vegetables. After the sluice opens, newly planted plots are watered by the channels automatically.
- **Home:** five decoration slots (doorway garland, doorstep kolam, veranda lamp, veranda mat, tulsi). Placed items can be taken back, except kolam flour (drawn and used up). Sleep at your doorway until 06:00.
- **Skills:** gardening (gathering flowers, planting, watering, harvesting), masonry (restorations), crafting (every craft). Level n at 10·n² XP. Shown in the Community panel and the journal.
- **Relationships:** −100..100 per NPC; +2 for the first conversation each day, plus quest rewards. Dialogue has relationship-gated lines (Valli at 30, Amudha at 40, Velan at 30).
- **NPCs:** schedules map hours to anchors and activities, with conditional entries (Amudha works the field hut once the channel is restored; everyone goes to the festival in the evening after it is held). NPCs route over a 37-node navigation graph and play role animations (gardening, carving, trading, reading, weaving, sitting, resting). Villagers share group dialogue that reacts to world flags. Meena is absent until her house is restored.
- **Restorations:** prerequisites (inspected / quest active / tool held) + materials → state change → flags → Living Record entry; each has its own work animation. Consequence restorations fire automatically.
- **Living Record:** significant events with causes and effects; "Show on map" highlights the location.
- **Map (M):** regions, roads, buildings, live story-NPC positions, restoration markers (amber = needs work, green = restored), your position and heading, the current objective.
- **World time:** 1 real second = 1 world minute. Day/dusk/night lighting; warm point lights follow the nearest lit lamps at night; evening ambience after 18:00.

## Movement (session 4)

Walk 1.75 m/s, jog 3.9, sprint 6.2. Each gait's animation stride matches its speed (measured foot drift is under 4% of the distance run). Jump height is 0.6 m with a 0.08 s anticipation dip, 0.12 s coyote time and 0.15 s input buffering; falling is 1.35× gravity. Landing from 1.7 m or more is hard (a short lock, camera shake, dust). From 3.6 m or more it hurts: a stagger, a 6 s limp, and Stress during a temple visit. Sitting on any bench measures the seat and plants the feet; a movement key stands up.

## Temple Visit (GAME_DESIGN.md)

Start it from the title screen. One visit is a run through six stages placed in the world:

1. **Home** (your house): wake at the cot before 5:00, pack the temple bag (12 s mini-game; forget the coconut and it's a penalty), check today's tithi on the calendar, and get the family into matching pattu.
2. **Arrival:** drive the auto-rickshaw (W/S, A/D, Space brake, H horn, E out) and park within 100 m of the gate. Then deal with the chappals: the stand, a secret bush (remember the spot), the auto, or the side-gate guard. The gate attendant turns you back with chappals on.
3. **Queue:** join the FREE, Rs 20 or Rs 100 lane (the fastest lane today scores). Shuffle with W, switch lanes with A/D, chat with an aunty (E), hold R to pray, send a kid ahead (T), merge with relatives (E), handle the line cutter (calm or scold), take the prasadam shortcut, and watch for the child who wanders off.
4. **Rituals:** the coconut timing bar, lamps (one per wish, limited matchsticks), clockwise pradakshina laps around the sanctum (combos at 9, and at 108 on festival days), the sloka quiz, vibhuti for the family (10 s), and the archana (nakshatra and gotra, no pausing).
5. **Darshan:** hold Space for 5 s while A/D resists the crowd. Then pray for everyone, including the one abroad, and ask the priest for prasadam and tulsi.
6. **Exit:** collect the chappals (theft risk depends on the temple; a missing pair may turn into a better one), prasadam for the neighbours, gossip with Lakshmi-aunty, annadanam for the kids, the gopuram photo (nobody blinking), then head home in the auto.

**Scoring.** Each action's points are multiplied by the mom's passive, ×2 on festival days, and ×2 on the fourth action after three of one category in a row. Blessings (devotion only) set the final multiplier (1×–3×). Stress caps the final score, and at 100 the run ends early. The final score earns Kumkum (a tenth of it) plus daily-mission rewards, spent on moms, temples and sarees.

## Session 3 systems

- **Interaction framework:** every interactable has a range, a facing score and a **line-of-sight** check (a ray from the chest to the target at waist and shoulder height, so a trader behind a counter is reachable but nothing works through a wall). A 0.35 s cooldown stops double-fires. The current target gets a ground ring (toggle in Settings). Failures play an error cue and a toast.
- **Doors:** the player house and the granary have hinged doors. Open/closed state is saved; a closed door is solid. Doors can be locked by conditions: the granary is barred 19:00–06:00 until Selvam gives you his key (after the well is restored). The HUD shows "indoors" when there is a ceiling overhead.
- **Interiors:** the player house is now enterable (cot where you rest, hearth, shelves, water urn, mat, lamp niche). The granary is a walk-in store room with sacks and bins.
- **World containers:** four crates with saved contents (Selvam's in the granary, Raman's in the bazaar, and two unowned ones at the ruins and fields). Click a stack to move it either way; nothing is duplicated or lost.
- **Ownership and the watchman:** taking from an owned container is theft if anyone sees it (14 m with a clear line of sight, 22 m for the watchman). The owner's opinion drops by 15 and other witnesses' by 5, a banner appears, and **Kannan the kaavalkaaran** runs to you and confronts you. You can put it back (the item returns to the crate) or pay a 6-coin fine; if you can do neither he takes what coins you have. It always resolves, so there is no dead end. Unseen theft is remembered as a flag (the owner mentions things going missing). Selvam's key also permits taking from his crate.
- **Pickups:** three items lie in the world. The brass bangle appears only once Valli has asked you to find it; Velan's chisel is at the ruins; a coin pouch lies in the bazaar. Each can be taken once (saved).
- **Item use:** some items have a Use button in the inventory. Opening the found pouch keeps its coins, and Raman remembers that. Returning it to him unopened earns his gratitude and a small reward.
- **New quests:** *The Lost Bangle* (Valli) and *Velan's Chisel*, which is unlocked by **asking Velan about the ruins**.
- **Dialogue topics:** after a conversation's last line, "Ask about" topics appear. Each answer is chosen by who you ask and the state of the world. Every topic has a default "I don't know much about that" answer, so villagers only say what they would plausibly know. Asking can set flags (that is how you learn of the chisel). Goodbye ends the talk. The last 60 lines are kept in the journal under *Recent conversations*.
- **Dialogue text settings:** gradual text reveal (Space finishes the line), dialogue box opacity and text size.
- **NPC behaviour:** NPCs steer with collision (they slide along props and walls), keep apart from each other and from you, and recover when stuck (re-plan, skip a waypoint, then step past). Near you they turn their heads to look, greet you, react if you walk into them, and comment on the weather, the festival, a restored place or missing goods (speech bubbles, with per-NPC cooldowns). Talking pauses their errand, which resumes afterwards. They go indoors at night (21:00–05:00) and **head for cover when it rains** (bazaar, field and roadside shelters, the workshop and the courtyard cloister). Distant NPCs animate at a reduced rate.
- **Weather:** clear, cloudy or rain, decided deterministically from the world time in 3-hour blocks (so it survives a reload without being saved). It eases in and out over 20 minutes. The first morning and the festival evening are always clear. Rain brings falling streaks, wet darker ground, a grey sky, diffused light and nearer fog. Wind sways foliage and cloth, and dust motes and fireflies (at night) drift.
- **Soundscape (procedural placeholder):** wind, rain, water near the tank and channels, a market murmur near the bazaar, birds by day, crickets by night, footsteps that match the walk cycle and surface (stone, soil, wood), door creaks and an alarm when you are seen stealing. All of it is synthesized with Web Audio until the Lyria recordings exist; each layer goes quiet automatically once its recording is supplied.

## Session 5

- **Faces:** blinking, eyes that follow the look target, and a jaw that moves while a character speaks (player and nearby villagers).
- **Everyday clips:** door push, closing a lid, picking up from table height, carrying a full water pot (walking pace only; the pot is held in the hands), sweeping, kneeling at a garden bed, explaining with open palms. Chest and crate lids swing open with their panels.
- **Music:** cue by hour and place (morning, day, workshop, evening, festival evenings; silence late at night and during a Temple Visit). A synthesized placeholder score plays each cue until its Lyria file exists. Restorations and discoveries play short stings.
- **Spatial audio:** positional loops through an HRTF panner; the listener follows the camera. Velan's chisel is heard from his bench while he works.

## Not implemented yet

Since session 4 or 5, all of these exist:
- the shelf in your house as a second store
- carrying a full water pot
- a second festival, Karthigai Deepam
- daily rotating stock from Selvam's cart
- remarks when you sprint past villagers or walk into their houses

Still missing:
- **Stolen goods:** nobody recognises stolen goods you carry later. Only theft that someone sees happen is a crime.
- **Festival calendar:** festivals do not recur on a seasonal calendar. Festival evenings follow once the festival has been held.
- **Locked containers and lock-picking:** deliberately not planned.
