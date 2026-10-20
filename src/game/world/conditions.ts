import type { Condition, GameState } from "../core/types";
import type { Definitions } from "../core/defs";
import { countItem } from "../inventory/inventory";

export function evaluate(c: Condition, s: GameState, defs: Definitions): boolean {
  switch (c.type) {
    case "quest": {
      const q = s.quests[c.id];
      return c.status === "not_started" ? !q : q?.status === c.status;
    }
    case "objective": {
      const q = s.quests[c.questId];
      const def = defs.quests.get(c.questId);
      if (!q || !def || q.status !== "active") return false;
      return def.objectives[q.objectiveIndex]?.id === c.objectiveId;
    }
    case "flag":
      return (s.flags[c.id] === true) === c.value;
    case "skill":
      return Math.floor(Math.sqrt(Math.max(0, s.skills[c.id] ?? 0) / 10)) >= c.level;
    case "restoration":
      return s.restorations[c.id] === c.state;
    case "hasItem":
      return countItem(s.inventory, c.itemId) >= c.count;
    case "discovered":
      return s.discoveries.includes(c.id) === c.value;
    case "relationship":
      return (s.relationships[c.npcId] ?? 0) >= c.min;
    case "plot":
      return (s.plots[c.id]?.stage ?? "empty") === c.stage;
    case "hour": {
      const h = (s.worldMinutes % 1440) / 60;
      return c.from <= c.to ? h >= c.from && h < c.to : h >= c.from || h < c.to;
    }
    case "crime":
      return (s.pendingCrime !== null) === c.value;
    case "picked":
      return s.pickedUp.includes(c.id) === c.value;
  }
}

export const evaluateAll = (cs: Condition[], s: GameState, defs: Definitions): boolean =>
  cs.every((c) => evaluate(c, s, defs));
