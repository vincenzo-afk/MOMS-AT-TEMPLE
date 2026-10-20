import type { GatherNodeDefinition } from "../game/core/types";

const node = (id: string, itemId: string, quantity: number, regrowMinutes: number, label: string, conditions: GatherNodeDefinition["conditions"] = []): GatherNodeDefinition => ({
  id,
  itemId,
  quantity,
  regrowMinutes,
  conditions,
  label,
});

const SALVAGE = 100000; // effectively not renewable

export const GATHER_NODES: GatherNodeDefinition[] = [
  ...[1, 2, 3, 4, 5, 6].map((n) => node(`gn_jasmine_${n}`, "jasmine_flower", 1, 240, "Jasmine bush")),
  ...[1, 2, 3, 4].map((n) => node(`gn_marigold_${n}`, "marigold_flower", 2, 360, "Marigold bed", [{ type: "restoration", id: "rest_garden_main", state: "recovering" }])),
  ...[1, 2, 3].map((n) => node(`gn_hibiscus_${n}`, "hibiscus_flower", 1, 300, "Hibiscus")),
  // dressed stone: the old grounds inside the walls and the western ruins
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => node(`gn_stone_${n}`, "channel_stone", 1, SALVAGE, "Fallen masonry")),
  node("gn_clay_1", "lime_clay", 1, 60, "Clay bank"),
  node("gn_clay_2", "lime_clay", 1, 60, "Clay bank"),
  ...[1, 2, 3, 4].map((n) => node(`gn_timber_${n}`, "timber", 1, 720, "Log pile")),
  ...[1, 2, 3, 4, 5].map((n) => node(`gn_grass_${n}`, "dry_grass", 2, 480, "Dry grass")),
];
