import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession";
import { loadDefinitions } from "./defs";
import { countItem } from "../inventory/inventory";
import { kindAt, weatherAt } from "../world/weather";
import { validateSave } from "../save/validateSave";

const defs = loadDefinitions();
const at = (s: GameSession, hour: number) => {
  s.state.worldMinutes = Math.floor(s.state.worldMinutes / 1440) * 1440 + hour * 60;
};

describe("doors", () => {
  it("open and close persistently; the granary is barred at night unless you hold Selvam's key", () => {
    const s = new GameSession(defs);
    expect(s.isDoorOpen("door_home")).toBe(false);
    expect(s.toggleDoor("door_home").ok).toBe(true);
    expect(s.isDoorOpen("door_home")).toBe(true);
    expect(s.toggleDoor("door_home").ok).toBe(true);
    expect(s.isDoorOpen("door_home")).toBe(false);
    at(s, 21);
    expect(s.isDoorLocked("door_granary")).toBe(true);
    expect(s.toggleDoor("door_granary").ok).toBe(false);
    at(s, 10);
    expect(s.toggleDoor("door_granary").ok).toBe(true);
    s.toggleDoor("door_granary");
    at(s, 23);
    s.state.flags.granary_key = true;
    expect(s.toggleDoor("door_granary").ok).toBe(true);
  });
});

describe("containers, ownership and theft", () => {
  it("unowned containers can be emptied freely and refilled", () => {
    const s = new GameSession(defs);
    const slot = s.containerSlots("ct_ruins_crate").findIndex((x) => x?.itemId === "timber");
    expect(s.takeFromContainer("ct_ruins_crate", slot, ["npc_valli"]).ok).toBe(true);
    expect(countItem(s.state.inventory, "timber")).toBe(2);
    expect(s.state.pendingCrime).toBeNull();
    expect(s.takeFromContainer("ct_ruins_crate", slot).ok).toBe(false); // already taken - no duplication
    const inv = s.state.inventory.findIndex((x) => x?.itemId === "timber");
    expect(s.putIntoContainer("ct_ruins_crate", inv).ok).toBe(true);
    expect(countItem(s.containerSlots("ct_ruins_crate"), "timber")).toBe(2);
  });

  it("taking someone's goods in view of a witness is theft; the watchman offers return or fine", () => {
    const s = new GameSession(defs);
    s.state.relationships.npc_selvam = 20;
    const slot = s.containerSlots("ct_granary_crate").findIndex((x) => x?.itemId === "rope");
    expect(s.takeFromContainer("ct_granary_crate", slot, ["npc_selvam", "npc_kaaval"]).ok).toBe(true);
    expect(s.state.pendingCrime?.witnessId).toBe("npc_selvam");
    expect(s.state.relationships.npc_selvam).toBe(5);
    expect(s.state.relationships.npc_kaaval).toBe(-5);
    // while the crime is pending, no further taking
    expect(s.takeFromContainer("ct_granary_crate", 1, []).ok).toBe(false);
    // the watchman's confrontation outranks every other line
    const c = s.talk("npc_kaaval");
    expect(c?.node.id).toBe("k_confront");
    s.choose(0); // put it back
    expect(s.state.pendingCrime).toBeNull();
    expect(countItem(s.state.inventory, "rope")).toBe(0);
    expect(countItem(s.containerSlots("ct_granary_crate"), "rope")).toBe(2);
    expect(s.talk("npc_kaaval")?.node.id).not.toBe("k_confront");
  });

  it("paying the fine keeps the goods; with no goods and no coins the watchman takes what there is (no dead end)", () => {
    const s = new GameSession(defs);
    s.state.coins = 10;
    s.takeFromContainer("ct_raman_crate", 0, ["npc_villager_raman"]);
    s.talk("npc_kaaval");
    s.choose(1);
    expect(s.state.coins).toBe(4);
    expect(countItem(s.state.inventory, "produce")).toBe(3);
    // second offence, item sold, broke
    s.state.coins = 0;
    s.takeFromContainer("ct_raman_crate", 1, ["npc_villager_raman"]);
    s.state.inventory = s.state.inventory.map(() => null);
    s.talk("npc_kaaval");
    s.choose(0);
    expect(s.state.pendingCrime).toBeNull();
  });

  it("unwitnessed theft is remembered without a confrontation", () => {
    const s = new GameSession(defs);
    s.takeFromContainer("ct_raman_crate", 0, []);
    expect(s.state.pendingCrime).toBeNull();
    expect(s.state.flags.missing_from_npc_villager_raman).toBe(true);
  });

  it("Selvam's key permits taking from his granary crate", () => {
    const s = new GameSession(defs);
    s.state.flags.granary_key = true;
    s.takeFromContainer("ct_granary_crate", 0, ["npc_selvam"]);
    expect(s.state.pendingCrime).toBeNull();
  });
});

describe("pickups, item use and lost-and-found", () => {
  it("pickups are taken once; the bangle appears only once Valli has asked", () => {
    const s = new GameSession(defs);
    expect(s.isPickupAvailable("pk_bangle")).toBe(false);
    expect(s.pickUp("pk_chisel").ok).toBe(true);
    expect(s.pickUp("pk_chisel").ok).toBe(false);
    expect(countItem(s.state.inventory, "velan_chisel")).toBe(1);
    s.state.quests.q_arrival = { status: "completed", objectiveIndex: 2, counts: {}, startedDay: 1, completedDay: 1 };
    s.startQuest("q_bangle");
    expect(s.isPickupAvailable("pk_bangle")).toBe(true);
    s.pickUp("pk_bangle");
    expect(s.currentObjective("q_bangle")?.id).toBe("return");
    const c = s.talk("npc_valli");
    expect(c?.node.id).toBe("v_bangle_deliver");
    s.choose(0);
    expect(s.state.quests.q_bangle?.status).toBe("completed");
  });

  it("the found pouch: keep it (use) or return it to Raman, with consequences", () => {
    const keep = new GameSession(defs);
    keep.pickUp("pk_pouch");
    const slot = keep.state.inventory.findIndex((x) => x?.itemId === "coin_pouch");
    expect(keep.applyItem(slot).ok).toBe(true);
    expect(keep.state.coins).toBe(8);
    expect(keep.state.flags.kept_pouch).toBe(true);
    expect(keep.talk("npc_villager_raman")?.node.id).toBe("r_pouch_kept");

    const give = new GameSession(defs);
    give.pickUp("pk_pouch");
    expect(give.talk("npc_villager_raman")?.node.id).toBe("r_pouch");
    give.choose(0);
    expect(countItem(give.state.inventory, "coin_pouch")).toBe(0);
    expect(give.state.coins).toBe(2);
    expect(give.state.relationships.npc_villager_raman).toBeGreaterThanOrEqual(20);
  });
});

describe("dialogue topics and history", () => {
  it("answers respect knowledge boundaries and world state", () => {
    const s = new GameSession(defs);
    expect(s.topicAnswer("npc_ponnan", "t_ruins")?.who).toBe("npc_ponnan");
    expect(s.topicAnswer("npc_valli", "t_ruins")?.who).toBe("default");
    expect(s.topicAnswer("npc_villager_raman", "t_work")?.who).toBe("group:villager");
    expect(s.topicAnswer("npc_amudha", "t_channel")?.lines[0]).toMatch(/Blocked/);
    s.state.flags.channel_east_flowing = true;
    expect(s.topicAnswer("npc_amudha", "t_channel")?.lines[0]).toMatch(/Flowing/);
    expect(s.topicsFor("npc_valli").some((t) => t.id === "t_rota")).toBe(false);
  });

  it("asking Velan about the ruins reveals the lost chisel and unlocks his request", () => {
    const s = new GameSession(defs);
    s.state.quests.q_arrival = { status: "completed", objectiveIndex: 2, counts: {}, startedDay: 1, completedDay: 1 };
    s.state.quests.q_channel = { status: "completed", objectiveIndex: 7, counts: {}, startedDay: 1, completedDay: 1 };
    s.state.quests.q_wall = { status: "completed", objectiveIndex: 5, counts: {}, startedDay: 1, completedDay: 1 };
    s.talk("npc_velan");
    s.askTopic("npc_velan", "t_ruins");
    expect(s.state.flags.heard_chisel).toBe(true);
    s.endConversation();
    expect(s.talk("npc_velan")?.node.id).toBe("ve_chisel_offer");
    expect(s.state.talkLog.some((t) => t.text.includes("chisel"))).toBe(true);
  });
});

describe("weather", () => {
  it("is deterministic, clear on the first morning, clear on festival evenings, and sometimes rains", () => {
    expect(kindAt(7 * 60)).toBe("clear");
    expect(kindAt(5000)).toBe(kindAt(5000));
    const kinds = new Set(Array.from({ length: 200 }, (_, i) => kindAt(1440 + i * 180)));
    expect(kinds.has("rain")).toBe(true);
    expect(kinds.has("clear")).toBe(true);
    for (let d = 1; d < 30; d++) expect(kindAt(d * 1440 + 19 * 60, true)).toBe("clear");
    const w = weatherAt(1440 * 3 + 10);
    expect(w.rain).toBeGreaterThanOrEqual(0);
    expect(w.rain).toBeLessThanOrEqual(1);
  });
});

describe("save v3 and v4", () => {
  it("round-trips doors, containers, pickups, crime and talk log; migrates v2", () => {
    const s = new GameSession(defs);
    s.toggleDoor("door_home");
    s.pickUp("pk_chisel");
    s.takeFromContainer("ct_raman_crate", 0, ["npc_villager_raman"]);
    s.talk("npc_valli");
    const raw = JSON.parse(JSON.stringify(s.state));
    const r = validateSave(raw, defs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.doors.door_home).toBe(true);
    expect(r.state.pickedUp).toEqual(["pk_chisel"]);
    expect(r.state.pendingCrime?.containerId).toBe("ct_raman_crate");
    expect(r.state.containers.ct_raman_crate?.[0]).toBeNull();
    expect(r.state.talkLog.length).toBeGreaterThan(0);

    const v2 = { ...raw, schemaVersion: 2 };
    delete v2.doors;
    delete v2.containers;
    delete v2.pickedUp;
    delete v2.pendingCrime;
    delete v2.talkLog;
    const m = validateSave(v2, defs);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.state.schemaVersion).toBe(4); // v2 -> v3 -> v4
    expect(m.state.stolen).toEqual([]);
    const fresh = new GameSession(defs, m.state);
    expect(countItem(fresh.containerSlots("ct_ruins_crate"), "timber")).toBe(2); // containers filled from data
  });
});
