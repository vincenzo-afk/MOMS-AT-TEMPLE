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
| Esc | close panel, or pause |
| 1–4, Space, Enter | dialogue options / continue |

## The first playable loop (implemented)

| Step | System(s) |
|---|---|
| Arrive outside the gopuram (optional 11 s opening flight, skippable) | Game intro mode |
| Talk to **Valli** at the gate → "A Welcome of Jasmine" | dialogue → `startQuest` |
| Gather 3 jasmine on the west street (bushes regrow after 4 world hours) | gather nodes, inventory, collect objective |
| Deliver to Valli → 5 coins, relationship, record entry *A newcomer is welcomed* | `deliver` effect, rewards, Living Record |
| **Murugan** in the garden → "The Silent Channel" | dialogue |
| Inspect the collapsed channel (sets `channel_inspected`) | restoration inspect |
| **Kamala** explains mortar (sets `learned_mortar`) | dialogue `advance` + `setFlag` |
| Salvage 4 dressed stones in the old grounds, dig 2 lime clay | gather |
| Make lime mortar at the workbench | crafting (validated transaction) |
| Repair the channel (consumes 4 stone + 1 mortar) | restoration `blocked → flowing`, flag `channel_east_flowing` |
| **Consequence:** garden `withered → recovering`, marigold beds bloom, marigold nodes become gatherable | auto-restoration via `triggeredByFlags`, WorldView |
| Report to Murugan → reward; follow-up "Garland for the Gate" offered | quest completion, dialogue |
| Learn garland-stringing, pick marigolds, gather jasmine, **buy twine from Selvam** | trading |
| Craft and deliver the garland → it appears on the gate; record entry caused by the garden recovery | flag-driven visual, causal record |
| Optional: **Elder Ponnan** → read the inscribed stone (discovery record) → he interprets it | discovery |
| Save, reload: restored channel, blooming garden, record, inventory and quests persist | SaveSystem |

## Rules and guarantees

- **Inventory:** 16 slots, per-item stack limits. `addItems`/`removeItems`/`exchange` compute on a copy and commit only if the whole transaction succeeds. Gathering with a full bag fails without consuming the node.
- **Crafting:** recipe known (flag prerequisites) → inputs present → outputs fit after inputs are removed → commit. Failed crafts never lose materials.
- **Quests:** sequential objectives (`talk`, `collect`, `deliver`, `craft`, `restore`, `inspect`). Effects only advance the *current* objective; repeats are ignored. Rewards are claimed once by `<questId>#<index>`.
- **Restorations:** prerequisites (conditions) + materials → state change → resulting flags → record event. Consequence restorations fire automatically when their trigger flags exist.
- **Living Record:** only significant events (arrival quest, restorations, consequences, discoveries, community quests). Event IDs are deterministic, and cause links are kept only if the cause exists.
- **World time:** 1 real second = 1 world minute. Gather nodes regrow by world time. You can rest at your house door until 06:00.
- **NPC schedules:** hour ranges map to anchors and activities. NPCs walk a small nav graph between anchors at 1.35 m/s and play role loops at work (Kamala crafts, Murugan works the beds, Valli and Selvam talk). A conversation stops them and turns them to face the player.
- **Relationships:** a number per NPC (−100..100), raised by quest rewards. Not yet surfaced in UI or dialogue conditions.
- **Trading:** Selvam sells twine (2 coins) and buys flowers (1 coin). Quest-protected items cannot be sold.

## Not yet implemented

Storage containers, item use, relationship-gated dialogue, more professions, festival milestone, housing customisation, market stock changes, NPC collision avoidance, time-of-day schedules beyond the five NPCs.
