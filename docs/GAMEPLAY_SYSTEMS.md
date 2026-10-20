# Gameplay Systems

## Controls

| Key | Action |
|---|---|
| W A S D / arrows | move (camera-relative) |
| Shift | run |
| Mouse | rotate camera (click the scene to capture the mouse) |
| Wheel | camera distance 2.2–9 m |
| E | primary interaction / advance dialogue |
| R | secondary interaction (e.g. inspect when repair is available) |
| I / J / L | inventory / journal / Living Record |
| M / C | map / community and skills |
| Esc | close panel, or pause |
| 1–4, Space, Enter | dialogue options / continue |
| Movement key while seated | stand up |

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

## Story (12 quests)

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

## Not implemented yet

Item use from the inventory, cabinets/shelves as extra storage, carrying animations, NPC collision avoidance, a second festival or post-festival events, market stock changing over time.
