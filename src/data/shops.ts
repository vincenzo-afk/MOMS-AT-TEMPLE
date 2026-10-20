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
    ],
    buys: [
      { itemId: "jasmine_flower", price: 1 },
      { itemId: "marigold_flower", price: 1 },
      { itemId: "hibiscus_flower", price: 1 },
      { itemId: "produce", price: 3 },
      { itemId: "timber", price: 1 },
    ],
  },
  {
    id: "shop_meena",
    npcId: "npc_meena",
    sells: [{ itemId: "handwoven_cloth", price: 6 }],
    buys: [{ itemId: "banana_twine", price: 1 }],
  },
];
