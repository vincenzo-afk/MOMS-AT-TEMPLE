import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession";
import { loadDefinitions } from "./defs";
import { validateDefinitions } from "../../data/validate";
import { countItem, addItems, removeItems } from "../inventory/inventory";
import type { InteractableDef } from "./interactables";

const defs = loadDefinitions();
const gatherIt = (nodeId: string): InteractableDef => ({ id: `int_${nodeId}`, kind: "gather", refId: nodeId, label: "", locationId: "loc_street", radius: 2 });

/** Talk to an NPC and pick the first option until the conversation ends. */
function converse(s: GameSession, npcId: string, pick = 0): string[] {
  const seen: string[] = [];
  let c = s.talk(npcId);
  while (c) {
    seen.push(c.node.id);
    c = s.choose(c.node.options.length ? pick : 0);
  }
  return seen;
}

/** Test helper: put items straight into the bag (shortcut for gathering already covered elsewhere). */
function grant(s: GameSession, itemId: string, quantity: number) {
  const r = addItems(s.state.inventory, [{ itemId, quantity }], (id) => defs.items.get(id));
  if (!r.ok) throw new Error(r.reason);
  s.state.inventory = r.inventory;
  s.advanceTime(1); // commit, as every real inventory change does
}

function playArrivalAndChannel(s: GameSession) {
  converse(s, "npc_valli");
  for (const n of [1, 2, 3]) s.gather(`gn_jasmine_${n}`);
  converse(s, "npc_valli");
  converse(s, "npc_amudha");
  s.inspectRestoration("rest_channel_east");
  converse(s, "npc_velan");
  for (const n of [1, 2, 3, 4]) s.gather(`gn_stone_${n}`);
  s.gather("gn_clay_1");
  s.gather("gn_clay_2");
  s.craft("r_lime_mortar");
  s.repair("rest_channel_east");
}

describe("definitions", () => {
  it("cross-reference cleanly", () => {
    expect(validateDefinitions(defs)).toEqual([]);
  });
});

describe("inventory", () => {
  const look = (id: string) => defs.items.get(id);
  it("never partially adds when full", () => {
    let inv: Array<{ itemId: string; quantity: number } | null> = [null, null];
    const r = addItems(inv, [{ itemId: "lime_mortar", quantity: 11 }], look);
    expect(r.ok).toBe(false);
    inv = (addItems(inv, [{ itemId: "lime_mortar", quantity: 7 }], look) as { ok: true; inventory: typeof inv }).inventory;
    expect(countItem(inv, "lime_mortar")).toBe(7);
  });
  it("never partially removes", () => {
    const inv = [{ itemId: "lime_clay", quantity: 1 }, null];
    const r = removeItems(inv, [{ itemId: "lime_clay", quantity: 2 }]);
    expect(r.ok).toBe(false);
    expect(inv[0]?.quantity).toBe(1);
  });
});

describe("first gameplay loop", () => {
  it("runs arrival → channel restoration → garden → garland with a Living Record", () => {
    const s = new GameSession(defs);

    expect(converse(s, "npc_valli")).toEqual(["v_intro", "v_accept"]);
    expect(s.state.quests.q_arrival?.status).toBe("active");
    for (const n of [1, 2, 3]) expect(s.perform(gatherIt(`gn_jasmine_${n}`), "gather").ok).toBe(true);
    expect(s.perform(gatherIt("gn_jasmine_1"), "gather").ok).toBe(false); // depleted
    expect(converse(s, "npc_valli")).toEqual(["v_arrival_deliver", "v_arrival_done"]);
    expect(s.state.quests.q_arrival?.status).toBe("completed");
    expect(s.state.quests.q_home?.status).toBe("active"); // accepted the house in the same conversation
    expect(s.state.coins).toBe(5);

    converse(s, "npc_amudha");
    expect(s.state.quests.q_channel?.status).toBe("active");
    expect(s.repair("rest_channel_east").ok).toBe(false); // must inspect first
    s.inspectRestoration("rest_channel_east");
    expect(s.currentObjective("q_channel")?.id).toBe("ask_velan");
    expect(s.craft("r_lime_mortar").ok).toBe(false); // not learned yet
    converse(s, "npc_velan");
    expect(s.state.flags.learned_mortar).toBe(true);
    for (const n of [1, 2, 3, 4]) s.gather(`gn_stone_${n}`);
    s.gather("gn_clay_1");
    expect(s.craft("r_lime_mortar").ok).toBe(false); // only one clay
    s.gather("gn_clay_2");
    expect(s.craft("r_lime_mortar").ok).toBe(true);
    expect(s.isNodeAvailable("gn_marigold_1")).toBe(false);
    expect(s.repair("rest_channel_east").ok).toBe(true);
    expect(s.repair("rest_channel_east").ok).toBe(false);
    expect(s.state.restorations.rest_garden_main).toBe("recovering");
    expect(s.isNodeAvailable("gn_marigold_1")).toBe(true);
    expect(s.state.record.find((e) => e.id === "consequence:rest_garden_main")?.causeEventIds).toEqual(["restoration:rest_channel_east"]);
    expect(s.state.skills.masonry).toBeGreaterThan(0);

    expect(converse(s, "npc_amudha")).toEqual(["a_report", "a_garland_offer"]);
    expect(s.state.quests.q_channel?.status).toBe("completed");
    expect(s.state.quests.q_garland?.status).toBe("active");
    expect(s.state.flags.learned_garland).toBe(true);

    for (const n of [1, 2]) s.gather(`gn_marigold_${n}`);
    for (const n of [4, 5]) s.gather(`gn_jasmine_${n}`);
    expect(s.currentObjective("q_garland")?.id).toBe("twine");
    expect(s.buy("shop_selvam", "banana_twine").ok).toBe(true);
    expect(s.craft("r_flower_garland").ok).toBe(true);
    expect(s.sell("shop_selvam", "flower_garland").ok).toBe(false); // protected
    converse(s, "npc_valli");
    expect(s.state.quests.q_garland?.status).toBe("completed");
    expect(s.state.flags.gate_garland_hung).toBe(true);
    expect(s.state.record.map((e) => e.id)).toEqual(["arrival:q_arrival", "restoration:rest_channel_east", "consequence:rest_garden_main", "community:q_garland"]);

    const coins = s.state.coins;
    converse(s, "npc_valli");
    converse(s, "npc_amudha");
    expect(s.state.coins).toBe(coins); // rewards not re-granted
  });

  it("records discoveries once and gates them on conditions", () => {
    const s = new GameSession(defs);
    converse(s, "npc_ponnan");
    s.readDiscovery("disc_channel_inscription");
    s.readDiscovery("disc_channel_inscription");
    expect(s.state.record.filter((e) => e.type === "discovery")).toHaveLength(1);
    converse(s, "npc_ponnan");
    expect(s.state.quests.q_inscription?.status).toBe("completed");
    expect(s.readDiscovery("disc_palm_manuscript").ok).toBe(false); // path not cleared yet
  });

  it("fails gathering cleanly when the bag is full", () => {
    const s = new GameSession(defs);
    s.state.inventory = s.state.inventory.map(() => ({ itemId: "lime_mortar", quantity: 5 }));
    expect(s.gather("gn_jasmine_1").ok).toBe(false);
    expect(s.isNodeAvailable("gn_jasmine_1")).toBe(true);
  });

  it("regrows gather nodes over world time", () => {
    const s = new GameSession(defs);
    s.gather("gn_jasmine_1");
    expect(s.isNodeAvailable("gn_jasmine_1")).toBe(false);
    s.advanceTime(241);
    expect(s.isNodeAvailable("gn_jasmine_1")).toBe(true);
  });
});

describe("farming", () => {
  it("plant → water → grow over time → harvest, then irrigation waters new plantings automatically", () => {
    const s = new GameSession(defs);
    expect(s.plant("plot_1").ok).toBe(false); // no seeds
    grant(s, "seed_packet", 2);
    grant(s, "water_vessel", 1);
    expect(s.plant("plot_1").ok).toBe(true);
    expect(s.plotState("plot_1").stage).toBe("planted");
    expect(s.water("plot_1").ok).toBe(false); // empty pot
    expect(s.fill("ws_well").ok).toBe(false); // the well is dry
    expect(s.fill("ws_tank").ok).toBe(true);
    expect(s.water("plot_1").ok).toBe(true);
    expect(countItem(s.state.inventory, "water_vessel")).toBe(1); // emptied again
    s.advanceTime(179);
    expect(s.plotState("plot_1").stage).toBe("growing");
    s.advanceTime(2);
    expect(s.plotState("plot_1").stage).toBe("ripe");
    expect(s.harvest("plot_1").ok).toBe(true);
    expect(countItem(s.state.inventory, "produce")).toBe(2);
    expect(s.plotState("plot_1").stage).toBe("empty");
    s.state.flags.fields_irrigated = true;
    s.plant("plot_2");
    expect(s.plotState("plot_2").stage).toBe("growing");
    expect(s.state.skills.gardening).toBeGreaterThan(0);
  });
});

describe("storage and home", () => {
  it("moves stacks between bag and chest and advances the home quest", () => {
    const s = new GameSession(defs);
    converse(s, "npc_valli");
    for (const n of [1, 2, 3]) s.gather(`gn_jasmine_${n}`);
    converse(s, "npc_valli");
    expect(s.currentObjective("q_home")?.id).toBe("store");
    grant(s, "timber", 3);
    const slot = s.state.inventory.findIndex((x) => x?.itemId === "timber");
    expect(s.transfer(slot, false).ok).toBe(true);
    expect(countItem(s.state.storage, "timber")).toBe(3);
    expect(countItem(s.state.inventory, "timber")).toBe(0);
    expect(s.currentObjective("q_home")?.id).toBe("decorate");
    expect(s.transfer(s.state.storage.findIndex((x) => x?.itemId === "timber"), true).ok).toBe(true);
    expect(countItem(s.state.inventory, "timber")).toBe(3);
    expect(s.placeDecor("decor_lamp", "oil_lamp").ok).toBe(false); // none owned
    grant(s, "oil_lamp", 1);
    expect(s.placeDecor("decor_mat", "oil_lamp").ok).toBe(false); // wrong slot
    expect(s.placeDecor("decor_lamp", "oil_lamp").ok).toBe(true);
    expect(s.state.decor.decor_lamp).toBe("oil_lamp");
    converse(s, "npc_valli");
    expect(s.state.quests.q_home?.status).toBe("completed");
    expect(countItem(s.state.inventory, "kolam_powder")).toBe(2); // item reward
    expect(s.placeDecor("decor_doorstep", "kolam_powder").ok).toBe(true);
    expect(s.removeDecor("decor_doorstep").ok).toBe(true);
    expect(countItem(s.state.inventory, "kolam_powder")).toBe(1); // kolam is used up, not returned
    expect(s.removeDecor("decor_lamp").ok).toBe(true);
    expect(countItem(s.state.inventory, "oil_lamp")).toBe(1); // lamp returned
  });
});

describe("well, sluice, fields and weaver", () => {
  it("restores the well (carpentry), opens the sluice (consequence: fields) and brings the weaver home", () => {
    const s = new GameSession(defs);
    playArrivalAndChannel(s);
    converse(s, "npc_amudha"); // report + garland
    converse(s, "npc_selvam");
    expect(s.state.quests.q_well?.status).toBe("active");
    s.inspectRestoration("rest_well");
    converse(s, "npc_velan");
    expect(s.state.flags.learned_carpentry).toBe(true);
    for (const n of [1, 2]) s.gather(`gn_timber_${n}`);
    s.state.coins = 20;
    s.buy("shop_selvam", "rope");
    s.buy("shop_selvam", "rope");
    expect(s.craft("r_wooden_bucket").ok).toBe(true);
    expect(s.repair("rest_well").ok).toBe(true);
    converse(s, "npc_selvam");
    expect(s.state.quests.q_well?.status).toBe("completed");
    grant(s, "water_vessel", 1);
    expect(s.fill("ws_well").ok).toBe(true);

    // sluice
    s.state.quests.q_garland = { status: "completed", objectiveIndex: 5, counts: {}, startedDay: 1, completedDay: 1 };
    converse(s, "npc_amudha");
    expect(s.state.quests.q_fields?.status).toBe("active");
    s.inspectRestoration("rest_sluice");
    converse(s, "npc_velan");
    grant(s, "timber", 3);
    grant(s, "rope", 1);
    expect(s.craft("r_sluice_board").ok).toBe(true);
    grant(s, "lime_mortar", 1);
    expect(s.repair("rest_sluice").ok).toBe(true);
    expect(s.state.restorations.rest_fields).toBe("irrigated");
    expect(s.state.flags.fields_irrigated).toBe(true);
    expect(s.state.record.find((e) => e.id === "consequence:rest_fields")?.causeEventIds).toEqual(["restoration:rest_sluice"]);
    converse(s, "npc_amudha");
    expect(s.state.quests.q_fields?.status).toBe("completed");

    // weaver
    expect(s.isNpcPresent("npc_meena")).toBe(false);
    expect(s.talk("npc_meena")).toBeNull();
    converse(s, "npc_valli");
    expect(s.state.quests.q_weaver?.status).toBe("active");
    s.inspectRestoration("rest_weaver_house");
    converse(s, "npc_velan");
    grant(s, "dry_grass", 6);
    grant(s, "banana_twine", 2);
    expect(s.craft("r_thatch_bundle").ok).toBe(true);
    expect(s.craft("r_thatch_bundle").ok).toBe(true);
    grant(s, "timber", 2);
    grant(s, "lime_mortar", 1);
    expect(s.repair("rest_weaver_house").ok).toBe(true);
    expect(s.isNpcPresent("npc_meena")).toBe(true);
    converse(s, "npc_meena");
    expect(s.state.quests.q_weaver?.status).toBe("completed");

    // villagers react to the changed world (group dialogue)
    expect(converse(s, "npc_villager_raman")[0]).toBe("g_fields");
  });

  it("gives items from dialogue only once", () => {
    const s = new GameSession(defs);
    playArrivalAndChannel(s);
    converse(s, "npc_amudha");
    // the harvest offer (with the water pot) is lower priority than the garland chain; force it
    s.state.quests.q_garland = { status: "completed", objectiveIndex: 5, counts: {}, startedDay: 1, completedDay: 1 };
    s.state.quests.q_fields = { status: "active", objectiveIndex: 0, counts: {}, startedDay: 1, completedDay: null };
    s.state.flags.harvest_offer_test = true;
    const before = countItem(s.state.inventory, "water_vessel");
    converse(s, "npc_amudha");
    expect(s.state.quests.q_harvest?.status).toBe("active");
    expect(countItem(s.state.inventory, "water_vessel")).toBe(before + 1);
    converse(s, "npc_amudha");
    expect(countItem(s.state.inventory, "water_vessel")).toBe(before + 1);
  });

  it("only offers the festival once the garden, fields and loom are restored", () => {
    const s = new GameSession(defs);
    const done = { status: "completed" as const, objectiveIndex: 9, counts: {}, startedDay: 1, completedDay: 1 };
    s.state.quests = { q_arrival: done, q_inscription: done, q_garland: done, q_fields: done };
    expect(s.availableQuests().some((q) => q.id === "q_festival")).toBe(false);
    s.state.quests.q_weaver = done;
    expect(s.availableQuests().some((q) => q.id === "q_festival")).toBe(true);
    expect(converse(s, "npc_ponnan")[0]).toBe("p_festival_offer");
  });
});
