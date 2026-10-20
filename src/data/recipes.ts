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
  {
    id: "r_wooden_bucket",
    name: "Wooden bucket",
    stationId: "st_workshop_bench",
    inputs: [
      { itemId: "timber", quantity: 2 },
      { itemId: "rope", quantity: 1 },
    ],
    outputs: [{ itemId: "wooden_bucket", quantity: 1 }],
    prerequisites: ["learned_carpentry"],
    craftSeconds: 3,
  },
  {
    id: "r_sluice_board",
    name: "Sluice board",
    stationId: "st_workshop_bench",
    inputs: [
      { itemId: "timber", quantity: 3 },
      { itemId: "rope", quantity: 1 },
    ],
    outputs: [{ itemId: "sluice_board", quantity: 1 }],
    prerequisites: ["learned_carpentry"],
    craftSeconds: 3.5,
  },
  {
    id: "r_thatch_bundle",
    name: "Thatch bundle",
    stationId: "st_workshop_bench",
    inputs: [
      { itemId: "dry_grass", quantity: 3 },
      { itemId: "banana_twine", quantity: 1 },
    ],
    outputs: [{ itemId: "thatch_bundle", quantity: 2 }],
    prerequisites: ["learned_thatching"],
    craftSeconds: 2.5,
  },
  {
    id: "r_festival_bundle",
    name: "Festival offering bundle",
    stationId: "st_festival_station",
    inputs: [
      { itemId: "flower_garland", quantity: 1 },
      { itemId: "produce", quantity: 2 },
      { itemId: "handwoven_cloth", quantity: 1 },
    ],
    outputs: [{ itemId: "festival_bundle", quantity: 1 }],
    prerequisites: ["festival_preparing"],
    craftSeconds: 3,
  },
];
