# Save Format

Storage: **IndexedDB** database `temple-of-monks` (version 1), object store `saves`, out-of-line string keys.

| Key | Contents |
|---|---|
| `slot_main` | the current `GameState` (plain JSON object) |
| `slot_main_backup` | the previous valid `slot_main`, rotated in the same transaction as each new save |
| `settings` | `Settings` (volumes, sensitivity, FOV, text scale, quality, invert-Y, intro, key bindings, dialogue opacity, gradual text, target ring) |
| `corrupt_<epoch ms>` | a copy of any main save that failed validation, kept for diagnosis |

## GameState (schemaVersion 4)

```ts
{
  schemaVersion: 3,
  createdAt, updatedAt: ISO strings,
  player: { position: [x, y, z], yaw },
  inventory: Array<{ itemId, quantity } | null>,   // 20 slots
  coins: number,
  quests: { [questId]: { status: "active"|"completed", objectiveIndex, counts, startedDay, completedDay|null } },
  flags: { [flag]: boolean },
  restorations: { [restorationId]: stateName },
  gatherNodes: { [nodeId]: { depletedAtMinute } },
  relationships: { [npcId]: -100..100 },
  discoveries: string[],
  record: LivingRecordEvent[],                     // see below
  claimedRewards: string[],                        // "<questId>#<rewardIndex>" - prevents duplicate rewards
  craftedCounts: { [itemId]: number },
  worldMinutes: number,                            // minutes since day 1 00:00; 1 real second = 1 minute
  storage: Array<{ itemId, quantity } | null>,     // 24-slot chest (v2)
  plots: { [plotId]: { stage, seedItemId | null, plantedAt, wateredAt | null } },  // v2
  decor: { [slotId]: itemId | null },              // v2
  lastTalkDay: { [npcId]: day },                   // v2: daily relationship growth
  skills: { gardening, masonry, crafting },        // v2: experience points
  doors: { [doorId]: boolean },                    // v3: open (true) / closed
  containers: { [containerId]: Array<{ itemId, quantity } | null> },  // v3: world crate contents
  pickedUp: string[],                              // v3: pickup ids already taken (never respawn)
  pendingCrime: { containerId, itemId, quantity, witnessId, day } | null,  // v3: unresolved theft
  talkLog: Array<{ npcId, text, day, minute }>     // v3: last 60 dialogue lines
  stolen: Array<{ itemId, quantity, ownerNpcId, containerId, day }>  // v4: unseen thefts (last 20; forgotten after 7 days)
}

```

## Migrations

| From | To | Changes |
|---|---|---|
| 1 | 2 | NPC ids renamed to the new cast (npc_murugan -> npc_amudha, npc_kamala -> npc_velan) in relationships and record entries; "Garland for the Gate" lost its separate "learn" step, so an in-progress quest's objective index moves back by one and learned_garland is set; empty storage, plots, decor, talk days and skills are added. Covered by a unit test. |
| 3 | 4 | Adds `stolen: []` (unseen thefts an owner can still recognise). Unknown items, containers or NPCs in it are dropped at load. Covered by unit tests (v1 → v4 and v2 → v4 run every step). |
| 2 | 3 | Adds `doors: {}`, `containers: {}`, `pickedUp: []`, `pendingCrime: null` and `talkLog: []`. Containers missing from a save are filled from their data definitions at load, so old saves find the crates stocked. Covered by a unit test (v1 → v3 runs both steps). |

`LivingRecordEvent`: `{ id: "<type>:<subjectId>", type, worldDay, worldMinute, locationId, actionId, affectedEntityIds[], previousState|null, resultingState|null, causeEventIds[], descriptionKey }`. IDs are deterministic, so recording the same event twice is a no-op.

## When saves happen

- On every restoration, quest completion and Living Record entry (autosave).
- Every 60 s of play.
- From the pause menu (Save game; Save and exit to title).

## Loading, validation and recovery

`validateSave()` treats stored data as untrusted:

1. Missing or non-numeric `schemaVersion` → reject. Newer than the game → reject ("made by a newer version"). Older → run `MIGRATIONS[version]` step by step.
2. Structural fields (player, inventory array, coins, world time, quests, record array) must have valid types → otherwise reject.
3. References to content that no longer exists (unknown items, quests, restorations, gather nodes, discoveries, doors, containers, pickups) are **dropped with a warning** rather than failing the load. Quantities are clamped to stack limits, objective indexes to the quest length, and duplicate record IDs are removed.

If the main save is rejected, it is copied to `corrupt_<time>` and the backup is tried. If the backup loads, the game continues and tells the player ("Main save was damaged; loaded the backup."). The backup is one save older than the latest, so up to one autosave interval of progress can be lost. If both fail, the title screen shows the error and New Game remains available.

## Adding a schema version

1. Bump `SCHEMA_VERSION` in `src/game/core/defs.ts`.
2. Add `MIGRATIONS[oldVersion] = (raw) => ({ ...raw, /* changes */, schemaVersion: oldVersion + 1 })` in `validateSave.ts`.
3. Add a unit test that loads an old-version fixture.
