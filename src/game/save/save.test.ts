import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { SaveSystem } from "./SaveSystem";
import { validateSave } from "./validateSave";
import { GameSession } from "../core/GameSession";
import { loadDefinitions } from "../core/defs";

const defs = loadDefinitions();

describe("save system", () => {
  it("round-trips a restored world through IndexedDB", async () => {
    const saves = new SaveSystem(defs, new IDBFactory());
    const s = new GameSession(defs);
    s.state.flags.channel_inspected = true;
    s.state.inventory[0] = { itemId: "channel_stone", quantity: 4 };
    s.state.inventory[1] = { itemId: "lime_mortar", quantity: 1 };
    expect(s.repair("rest_channel_east").ok).toBe(true);
    await saves.save(s.state);

    const loaded = await saves.load();
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;
    const s2 = new GameSession(defs, loaded.state);
    expect(s2.state.restorations.rest_channel_east).toBe("flowing");
    expect(s2.state.restorations.rest_garden_main).toBe("recovering");
    expect(s2.state.record).toHaveLength(2);
    expect(s2.repair("rest_channel_east").ok).toBe(false);
  });

  it("falls back to the backup when the main save is corrupt", async () => {
    const saves = new SaveSystem(defs, new IDBFactory());
    const s = new GameSession(defs);
    s.state.coins = 42;
    await saves.save(s.state);
    s.state.coins = 50;
    await saves.save(s.state); // previous save becomes the backup
    await saves.writeRawForTesting({ schemaVersion: 1, player: "broken" });
    const loaded = await saves.load();
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.fromBackup).toBe(true);
      expect(loaded.state.coins).toBe(42); // backup is the save before the latest one
    }
  });

  it("rejects saves from a newer schema", () => {
    const s = new GameSession(defs);
    const r = validateSave({ ...s.state, schemaVersion: 99 }, defs);
    expect(r.ok).toBe(false);
  });

  it("migrates a version 1 save through v2 to v3 (renamed NPCs, shortened garland quest, new state blocks)", () => {
    const s = new GameSession(defs);
    const v1 = JSON.parse(JSON.stringify(s.state));
    v1.schemaVersion = 1;
    delete v1.storage;
    delete v1.plots;
    delete v1.decor;
    delete v1.skills;
    delete v1.lastTalkDay;
    v1.relationships = { npc_murugan: 25, npc_kamala: 10 };
    v1.quests = { q_garland: { status: "active", objectiveIndex: 3, counts: {}, startedDay: 1, completedDay: null } };
    v1.record = [{ id: "arrival:q_arrival", type: "arrival", worldDay: 1, worldMinute: 0, locationId: "loc_courtyard", actionId: "a", affectedEntityIds: ["npc_murugan"], previousState: null, resultingState: "completed", causeEventIds: [], descriptionKey: "rec_arrival" }];
    const r = validateSave(v1, defs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.schemaVersion).toBe(4);
    expect(r.state.stolen).toEqual([]);
    expect(r.state.relationships).toEqual({ npc_amudha: 25, npc_velan: 10 });
    expect(r.state.quests.q_garland?.objectiveIndex).toBe(2);
    expect(r.state.flags.learned_garland).toBe(true);
    expect(r.state.record[0]?.affectedEntityIds).toEqual(["npc_amudha"]);
    expect(r.state.storage).toHaveLength(24);
    expect(r.state.skills).toEqual({ gardening: 0, masonry: 0, crafting: 0 });
  });

  it("drops unknown items instead of failing", () => {
    const s = new GameSession(defs);
    const raw = JSON.parse(JSON.stringify(s.state));
    raw.inventory[0] = { itemId: "removed_item", quantity: 3 };
    const r = validateSave(raw, defs);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.length).toBe(1);
  });
});
