import type { GatherNodeDefinition } from "../game/core/types";

const jasmine = (n: number): GatherNodeDefinition => ({
  id: `gn_jasmine_${n}`,
  itemId: "jasmine_flower",
  quantity: 1,
  regrowMinutes: 240,
  conditions: [],
  label: "Jasmine bush",
});

const marigold = (n: number): GatherNodeDefinition => ({
  id: `gn_marigold_${n}`,
  itemId: "marigold_flower",
  quantity: 2,
  regrowMinutes: 360,
  conditions: [{ type: "restoration", id: "rest_garden_main", state: "recovering" }],
  label: "Marigold bed",
});

const stone = (n: number): GatherNodeDefinition => ({
  id: `gn_stone_${n}`,
  itemId: "channel_stone",
  quantity: 1,
  regrowMinutes: 100000, // salvage, effectively not renewable
  conditions: [],
  label: "Fallen masonry",
});

export const GATHER_NODES: GatherNodeDefinition[] = [
  ...[1, 2, 3, 4, 5, 6].map(jasmine),
  ...[1, 2, 3, 4].map(marigold),
  ...[1, 2, 3, 4, 5, 6].map(stone),
  { id: "gn_clay_1", itemId: "lime_clay", quantity: 1, regrowMinutes: 60, conditions: [], label: "Clay bank" },
  { id: "gn_clay_2", itemId: "lime_clay", quantity: 1, regrowMinutes: 60, conditions: [], label: "Clay bank" },
];
