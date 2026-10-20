import type { ShopDefinition } from "../game/core/types";

export const SHOPS: ShopDefinition[] = [
  {
    id: "shop_selvam",
    npcId: "npc_selvam",
    sells: [
      { itemId: "banana_twine", price: 2 },
      { itemId: "rope", price: 3 },
      { itemId: "seed_packet", price: 2 },
      { itemId: "water_vessel", price: 3 },
      { itemId: "sickle", price: 6 },
      { itemId: "oil_lamp", price: 5 },
      { itemId: "woven_mat", price: 4 },
      { itemId: "kolam_powder", price: 2 },
      { itemId: "beeswax", price: 2 },
      // daily specials from the cart that comes in from the next village (rotate by day)
      { itemId: "lime_clay", price: 2, days: { every: 2, offset: 0 } },
      { itemId: "dry_grass", price: 1, days: { every: 2, offset: 1 } },
      { itemId: "tulsi_pot", price: 9, days: { every: 3, offset: 2 } },
      { itemId: "brass_scrap", price: 3, days: { every: 2, offset: 1 } },
      // festival season: flowers and garlands for the decorations
      { itemId: "marigold_flower", price: 2, when: [{ type: "flag", id: "festival_preparing", value: true }, { type: "flag", id: "festival_held", value: false }] },
      { itemId: "flower_garland", price: 7, when: [{ type: "flag", id: "festival_preparing", value: true }, { type: "flag", id: "festival_held", value: false }] },
    ],
    buys: [
      { itemId: "jasmine_flower", price: 1 },
      { itemId: "marigold_flower", price: 1 },
      { itemId: "hibiscus_flower", price: 1 },
      { itemId: "produce", price: 3 },
      { itemId: "timber", price: 1 },
      { itemId: "brass_lamp", price: 8 },
    ],
  },
  {
    id: "shop_meena",
    npcId: "npc_meena",
    sells: [{ itemId: "handwoven_cloth", price: 6 }],
    buys: [{ itemId: "banana_twine", price: 1 }],
  },
];
