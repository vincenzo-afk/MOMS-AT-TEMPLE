import { ITEMS } from "../../data/items";
import { RECIPES } from "../../data/recipes";
import { QUESTS } from "../../data/quests";
import { RESTORATIONS } from "../../data/restorations";
import { GATHER_NODES } from "../../data/gatherNodes";
import { NPCS } from "../../data/npcs";
import { DIALOGUE } from "../../data/dialogue";
import { SHOPS } from "../../data/shops";
import { DISCOVERIES, type DiscoveryDefinition } from "../../data/discoveries";
import { CROPS, DECOR_SLOTS, PLOTS, WATER_SOURCES } from "../../data/farming";
import type {
  DialogueNode,
  GatherNodeDefinition,
  ItemDefinition,
  NpcDefinition,
  QuestDefinition,
  RecipeDefinition,
  RestorationDefinition,
  ShopDefinition,
  PlotDefinition,
  CropDefinition,
  WaterSourceDefinition,
  DecorSlotDefinition,
} from "./types";

export interface Definitions {
  items: Map<string, ItemDefinition>;
  recipes: Map<string, RecipeDefinition>;
  quests: Map<string, QuestDefinition>;
  restorations: Map<string, RestorationDefinition>;
  gatherNodes: Map<string, GatherNodeDefinition>;
  npcs: Map<string, NpcDefinition>;
  dialogue: Map<string, DialogueNode>;
  shops: Map<string, ShopDefinition>;
  discoveries: Map<string, DiscoveryDefinition>;
  plots: Map<string, PlotDefinition>;
  crops: Map<string, CropDefinition>;
  waterSources: Map<string, WaterSourceDefinition>;
  decorSlots: Map<string, DecorSlotDefinition>;
}

const byId = <T extends { id: string }>(list: T[]): Map<string, T> => new Map(list.map((x) => [x.id, x]));

export function loadDefinitions(): Definitions {
  return {
    items: byId(ITEMS),
    recipes: byId(RECIPES),
    quests: byId(QUESTS),
    restorations: byId(RESTORATIONS),
    gatherNodes: byId(GATHER_NODES),
    npcs: byId(NPCS),
    dialogue: byId(DIALOGUE),
    shops: byId(SHOPS),
    discoveries: byId(DISCOVERIES),
    plots: byId(PLOTS),
    crops: new Map(CROPS.map((c) => [c.seedItemId, c])),
    waterSources: byId(WATER_SOURCES),
    decorSlots: byId(DECOR_SLOTS),
  };
}

export const INVENTORY_SLOTS = 20;
export const STORAGE_SLOTS = 24;
export const SCHEMA_VERSION = 2;
export const START_MINUTES = 7 * 60; // day 1, 07:00
