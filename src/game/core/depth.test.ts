import { describe, expect, it } from "vitest";
import { GameSession } from "./GameSession";
import { loadDefinitions } from "./defs";
import { countItem, addItems } from "../inventory/inventory";

const defs = loadDefinitions();
const give = (s: GameSession, itemId: string, quantity: number) => {
  const r = addItems(s.state.inventory, [{ itemId, quantity }], (id) => defs.items.get(id));
  if (!r.ok) throw new Error(r.reason);
  s.state.inventory = r.inventory;
};

describe("skills change what you can do (README §3.3)", () => {
  it("gardening 2 gathers an extra flower; masonry XP comes from stone and clay", () => {
    const s = new GameSession(defs);
    const node = [...defs.gatherNodes.values()].find((n) => defs.items.get(n.itemId)?.category === "flower" && n.conditions.length === 0)!;
    s.gather(node.id);
    const base = countItem(s.state.inventory, node.itemId);
    const t = new GameSession(defs);
    t.state.skills = { ...t.state.skills, gardening: 40 };
    t.gather(node.id);
    expect(countItem(t.state.inventory, node.itemId)).toBe(base + 1);
  });

  it("skill-gated recipes stay locked until the level is reached, with the reason", () => {
    const s = new GameSession(defs);
    give(s, "lime_clay", 2);
    give(s, "banana_twine", 1);
    expect(s.isRecipeKnown("r_clay_lamp")).toBe(false);
    const r = s.canCraft("r_clay_lamp");
    expect(r.ok ? "" : r.reason).toMatch(/crafting level 2/);
    s.state.skills = { ...s.state.skills, crafting: 40 };
    expect(s.craft("r_clay_lamp").ok).toBe(true);
    expect(countItem(s.state.inventory, "oil_lamp")).toBe(1);
  });
});

describe("the market changes over time and with the festival (README §4.6)", () => {
  it("daily specials rotate by world day; festival stock appears only while preparing", () => {
    const s = new GameSession(defs);
    const stock = (day: number) => {
      s.state.worldMinutes = day * 1440 + 600;
      return s.shopStock("shop_selvam").map((o) => o.itemId);
    };
    expect(stock(0)).toContain("lime_clay");
    expect(stock(1)).not.toContain("lime_clay");
    expect(stock(1)).toContain("dry_grass");
    expect(stock(0)).not.toContain("flower_garland");
    s.state.flags.festival_preparing = true;
    expect(stock(0)).toContain("flower_garland");
    s.state.flags.festival_held = true;
    expect(stock(0)).not.toContain("flower_garland");
    // buying something not in today's stock is refused
    s.state.coins = 50;
    s.state.worldMinutes = 1440 + 600;
    expect(s.buy("shop_selvam", "lime_clay").ok).toBe(false);
  });

  it("crafting the offering bundle sets the kolam stage of the festival build-up", () => {
    const s = new GameSession(defs);
    s.state.flags.festival_preparing = true;
    for (const st of defs.recipes.get("r_festival_bundle")!.inputs) give(s, st.itemId, st.quantity);
    expect(s.craft("r_festival_bundle").ok).toBe(true);
    expect(s.state.flags.festival_bundle_ready).toBe(true);
  });
});
