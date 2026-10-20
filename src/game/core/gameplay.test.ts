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

    // Arrival
    expect(converse(s, "npc_valli")).toEqual(["v_intro", "v_accept"]);
    expect(s.state.quests.q_arrival?.status).toBe("active");
    for (const n of [1, 2, 3]) expect(s.perform(gatherIt(`gn_jasmine_${n}`), "gather").ok).toBe(true);
    expect(s.perform(gatherIt("gn_jasmine_1"), "gather").ok).toBe(false); // depleted
    expect(countItem(s.state.inventory, "jasmine_flower")).toBe(3);
    expect(s.currentObjective("q_arrival")?.id).toBe("return");
    converse(s, "npc_valli");
    expect(s.state.quests.q_arrival?.status).toBe("completed");
    expect(countItem(s.state.inventory, "jasmine_flower")).toBe(0);
    expect(s.state.coins).toBe(5);

    // Channel quest
    converse(s, "npc_murugan");
    expect(s.state.quests.q_channel?.status).toBe("active");
    expect(s.repair("rest_channel_east").ok).toBe(false); // must inspect first
    s.inspectRestoration("rest_channel_east");
    expect(s.currentObjective("q_channel")?.id).toBe("ask_kamala");
    expect(s.craft("r_lime_mortar").ok).toBe(false); // not learned yet
    converse(s, "npc_kamala");
    expect(s.state.flags.learned_mortar).toBe(true);
    for (const n of [1, 2, 3]) s.gather(`gn_stone_${n}`);
    expect(s.repair("rest_channel_east").ok).toBe(false);
    s.gather("gn_stone_4");
    s.gather("gn_clay_1");
    expect(s.craft("r_lime_mortar").ok).toBe(false); // only one clay
    s.gather("gn_clay_2");
    expect(s.currentObjective("q_channel")?.id).toBe("mortar");
    expect(s.craft("r_lime_mortar").ok).toBe(true);
    expect(s.currentObjective("q_channel")?.id).toBe("repair");

    // Marigolds are unavailable while the garden is withered
    expect(s.isNodeAvailable("gn_marigold_1")).toBe(false);
    expect(s.repair("rest_channel_east").ok).toBe(true);
    expect(s.repair("rest_channel_east").ok).toBe(false); // cannot repeat
    expect(s.state.restorations.rest_channel_east).toBe("flowing");
    expect(s.state.restorations.rest_garden_main).toBe("recovering"); // consequence
    expect(s.isNodeAvailable("gn_marigold_1")).toBe(true);
    expect(countItem(s.state.inventory, "channel_stone")).toBe(0);

    const garden = s.state.record.find((e) => e.id === "consequence:rest_garden_main");
    expect(garden?.causeEventIds).toEqual(["restoration:rest_channel_east"]);

    // Report & follow-up quest
    expect(converse(s, "npc_murugan")).toEqual(["m_report", "m_garland_offer"]);
    expect(s.state.quests.q_channel?.status).toBe("completed");
    expect(s.state.quests.q_garland?.status).toBe("active");
    expect(s.state.coins).toBe(13);

    converse(s, "npc_kamala");
    for (const n of [1, 2]) s.gather(`gn_marigold_${n}`);
    for (const n of [4, 5]) s.gather(`gn_jasmine_${n}`);
    expect(s.currentObjective("q_garland")?.id).toBe("twine");
    expect(s.buy("shop_selvam", "banana_twine").ok).toBe(true);
    expect(s.state.coins).toBe(11);
    expect(s.craft("r_flower_garland").ok).toBe(true);
    expect(s.sell("shop_selvam", "flower_garland").ok).toBe(false); // protected
    converse(s, "npc_valli");
    expect(s.state.quests.q_garland?.status).toBe("completed");
    expect(s.state.flags.gate_garland_hung).toBe(true);
    expect(s.state.record.map((e) => e.id)).toEqual([
      "arrival:q_arrival",
      "restoration:rest_channel_east",
      "consequence:rest_garden_main",
      "community:q_garland",
    ]);

    // Rewards are not granted twice even if dialogue is replayed
    const coins = s.state.coins;
    converse(s, "npc_valli");
    converse(s, "npc_murugan");
    expect(s.state.coins).toBe(coins);
  });

  it("records the inscription discovery once", () => {
    const s = new GameSession(defs);
    converse(s, "npc_ponnan");
    s.readDiscovery("disc_channel_inscription");
    s.readDiscovery("disc_channel_inscription");
    expect(s.state.record.filter((e) => e.type === "discovery")).toHaveLength(1);
    converse(s, "npc_ponnan");
    expect(s.state.quests.q_inscription?.status).toBe("completed");
  });

  it("fails gathering cleanly when the bag is full", () => {
    const s = new GameSession(defs);
    s.state.inventory = s.state.inventory.map(() => ({ itemId: "lime_mortar", quantity: 5 }));
    expect(s.gather("gn_jasmine_1").ok).toBe(false);
    expect(s.isNodeAvailable("gn_jasmine_1")).toBe(true); // node not consumed
  });

  it("regrows gather nodes over world time", () => {
    const s = new GameSession(defs);
    s.gather("gn_jasmine_1");
    expect(s.isNodeAvailable("gn_jasmine_1")).toBe(false);
    s.advanceTime(241);
    expect(s.isNodeAvailable("gn_jasmine_1")).toBe(true);
  });
});
