import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession";
import { loadDefinitions, STOLEN_MEMORY_DAYS } from "./defs";
import { countItem } from "../inventory/inventory";

const defs = loadDefinitions();
const MIN_PER_DAY = 24 * 60;

describe("stolen goods recognised later", () => {
  it("an unseen theft is remembered; the owner recognises it in your bag and the watchman settles it", () => {
    const s = new GameSession(defs);
    s.state.relationships.npc_selvam = 20;
    const slot = s.containerSlots("ct_granary_crate").findIndex((x) => x?.itemId === "rope");
    expect(s.takeFromContainer("ct_granary_crate", slot, []).ok).toBe(true);
    expect(s.state.pendingCrime).toBeNull();
    expect(s.state.stolen).toEqual([{ itemId: "rope", quantity: 2, ownerNpcId: "npc_selvam", containerId: "ct_granary_crate", day: 1 }]);
    expect(s.stolenOwnersCarried()).toEqual(["npc_selvam"]);
    // someone else seeing it means nothing; the owner does
    expect(s.recogniseStolen("npc_valli")).toBeNull();
    expect(s.recogniseStolen("npc_selvam")).toBe("rope");
    expect(s.state.pendingCrime).toMatchObject({ containerId: "ct_granary_crate", itemId: "rope", witnessId: "npc_selvam" });
    expect(s.state.relationships.npc_selvam).toBe(10);
    expect(s.state.stolen).toEqual([]);
    // the watchman's usual choice: put it back
    expect(s.talk("npc_kaaval")?.node.id).toBe("k_confront");
    s.choose(0);
    expect(s.state.pendingCrime).toBeNull();
    expect(countItem(s.containerSlots("ct_granary_crate"), "rope")).toBe(2);
  });

  it("nothing to recognise if the goods are no longer in the bag, were put back quietly, or are long forgotten", () => {
    const s = new GameSession(defs);
    const slot = s.containerSlots("ct_raman_crate").findIndex((x) => x !== null);
    const itemId = s.containerSlots("ct_raman_crate")[slot]!.itemId;
    s.takeFromContainer("ct_raman_crate", slot, []);
    // put back where it came from: forgotten at once
    const inv = s.state.inventory.findIndex((x) => x?.itemId === itemId);
    expect(s.putIntoContainer("ct_raman_crate", inv).ok).toBe(true);
    expect(s.state.stolen).toEqual([]);
    // taken again, then a week and a bit passes
    s.takeFromContainer("ct_raman_crate", s.containerSlots("ct_raman_crate").findIndex((x) => x?.itemId === itemId), []);
    s.state.worldMinutes += (STOLEN_MEMORY_DAYS + 1) * MIN_PER_DAY;
    expect(s.recogniseStolen("npc_villager_raman")).toBeNull();
    expect(s.state.stolen).toEqual([]);
    expect(s.state.pendingCrime).toBeNull();
  });
});
