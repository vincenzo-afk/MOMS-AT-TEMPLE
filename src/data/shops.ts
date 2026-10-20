import type { ShopDefinition } from "../game/core/types";

export const SHOPS: ShopDefinition[] = [
  {
    id: "shop_selvam",
    npcId: "npc_selvam",
    sells: [{ itemId: "banana_twine", price: 2 }],
    buys: [
      { itemId: "jasmine_flower", price: 1 },
      { itemId: "marigold_flower", price: 1 },
    ],
  },
];
