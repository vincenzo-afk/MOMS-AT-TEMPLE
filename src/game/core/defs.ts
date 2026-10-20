import { ITEMS } from "../../data/items";
import { RECIPES } from "../../data/recipes";
import { QUESTS } from "../../data/quests";
import { RESTORATIONS } from "../../data/restorations";
import { GATHER_NODES } from "../../data/gatherNodes";
import { NPCS } from "../../data/npcs";
import { DIALOGUE } from "../../data/dialogue";
import { SHOPS } from "../../data/shops";
import { DISCOVERIES, type DiscoveryDefinition } from "../../data/discoveries";
import type {
  DialogueNode,
  GatherNodeDefinition,
  ItemDefinition,
  NpcDefinition,
  QuestDefinition,
  RecipeDefinition,
  RestorationDefinition,
  ShopDefinition,
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
  };
}

export const INVENTORY_SLOTS = 16;
export const SCHEMA_VERSION = 1;
export const START_MINUTES = 7 * 60; // day 1, 07:00
