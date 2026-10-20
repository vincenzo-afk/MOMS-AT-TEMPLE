import type { RecipeDefinition } from "../game/core/types";

export const RECIPES: RecipeDefinition[] = [
  {
    id: "r_lime_mortar",
    name: "Lime mortar",
    stationId: "st_workshop_bench",
    inputs: [{ itemId: "lime_clay", quantity: 2 }],
    outputs: [{ itemId: "lime_mortar", quantity: 1 }],
    prerequisites: ["learned_mortar"],
    craftSeconds: 2.4,
  },
  {
    id: "r_flower_garland",
    name: "Flower garland",
    stationId: "st_workshop_bench",
    inputs: [
      { itemId: "marigold_flower", quantity: 4 },
      { itemId: "jasmine_flower", quantity: 2 },
      { itemId: "banana_twine", quantity: 1 },
    ],
    outputs: [{ itemId: "flower_garland", quantity: 1 }],
    prerequisites: ["learned_garland"],
    craftSeconds: 3,
  },
];
