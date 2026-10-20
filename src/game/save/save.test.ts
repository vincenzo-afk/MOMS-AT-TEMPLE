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

  it("drops unknown items instead of failing", () => {
    const s = new GameSession(defs);
    const raw = JSON.parse(JSON.stringify(s.state));
    raw.inventory[0] = { itemId: "removed_item", quantity: 3 };
    const r = validateSave(raw, defs);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.length).toBe(1);
  });
});
