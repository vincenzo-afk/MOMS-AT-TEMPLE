import type { CropDefinition, DecorSlotDefinition, PlotDefinition, WaterSourceDefinition } from "../game/core/types";

/** The player's vegetable plots beside the field hut. Watered by hand until the field sluice is open. */
export const PLOTS: PlotDefinition[] = [1, 2, 3, 4].map((n) => ({
  id: `plot_${n}`,
  locationId: "loc_fields",
  growMinutes: 180, // three world hours = three real minutes
  autoWaterFlag: "fields_irrigated",
}));

export const CROPS: CropDefinition[] = [{ seedItemId: "seed_packet", produceItemId: "produce", yield: 2 }];

export const WATER_SOURCES: WaterSourceDefinition[] = [
  { id: "ws_tank", label: "the garden tank", conditions: [], locationId: "loc_garden" },
  { id: "ws_water_point", label: "the water point", conditions: [], locationId: "loc_approach" },
  { id: "ws_well", label: "the well", conditions: [{ type: "restoration", id: "rest_well", state: "working" }], locationId: "loc_well" },
];

/** Decoration slots at the player's house (positions are in src/data/level.ts). */
export const DECOR_SLOTS: DecorSlotDefinition[] = [
  { id: "decor_doorway", label: "Doorway", accepts: ["flower_garland"] },
  { id: "decor_doorstep", label: "Doorstep kolam", accepts: ["kolam_powder"], consumes: true },
  { id: "decor_lamp", label: "Veranda lamp", accepts: ["oil_lamp"] },
  { id: "decor_mat", label: "Veranda mat", accepts: ["woven_mat"] },
  { id: "decor_plant", label: "Courtyard plant", accepts: ["tulsi_pot"] },
];

/** Skill levels from experience: level n needs 10 * n^2 XP. */
export const skillLevel = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 10));
export const SKILL_NAMES = { gardening: "Gardening", masonry: "Masonry", crafting: "Crafting" } as const;
