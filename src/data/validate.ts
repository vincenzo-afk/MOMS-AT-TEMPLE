import type { Definitions } from "../game/core/defs";
import type { Condition, Effect } from "../game/core/types";
import { RECORD_TEXT, LOCATIONS } from "./text";

/** Cross-reference check for all authored data. Returns a list of human-readable problems. */
export function validateDefinitions(d: Definitions): string[] {
  const errors: string[] = [];
  const need = (ok: boolean, msg: string) => {
    if (!ok) errors.push(msg);
  };
  const item = (id: string, ctx: string) => need(d.items.has(id), `${ctx}: unknown item "${id}"`);
  const loc = (id: string, ctx: string) => need(id in LOCATIONS, `${ctx}: unknown location "${id}"`);
  const text = (id: string, ctx: string) => need(id in RECORD_TEXT, `${ctx}: missing record text "${id}"`);

  const cond = (c: Condition, ctx: string) => {
    if (c.type === "quest") need(d.quests.has(c.id), `${ctx}: unknown quest ${c.id}`);
    if (c.type === "objective")
      need(!!d.quests.get(c.questId)?.objectives.some((o) => o.id === c.objectiveId), `${ctx}: unknown objective ${c.questId}/${c.objectiveId}`);
    if (c.type === "restoration") need(!!d.restorations.get(c.id)?.states.includes(c.state), `${ctx}: bad restoration state ${c.id}=${c.state}`);
    if (c.type === "hasItem") item(c.itemId, ctx);
    if (c.type === "discovered") need(d.discoveries.has(c.id), `${ctx}: unknown discovery ${c.id}`);
  };
  const effect = (e: Effect, ctx: string) => {
    if (e.type === "startQuest") need(d.quests.has(e.questId), `${ctx}: unknown quest ${e.questId}`);
    if (e.type === "advance" || e.type === "deliver")
      need(!!d.quests.get(e.questId)?.objectives.some((o) => o.id === e.objectiveId), `${ctx}: unknown objective ${e.questId}/${e.objectiveId}`);
    if (e.type === "relationship") need(d.npcs.has(e.npcId), `${ctx}: unknown npc ${e.npcId}`);
    if (e.type === "openShop") need(d.shops.has(e.shopId), `${ctx}: unknown shop ${e.shopId}`);
  };

  for (const i of d.items.values()) need(i.maxStack > 0, `item ${i.id}: maxStack must be > 0`);
  for (const r of d.recipes.values()) {
    [...r.inputs, ...r.outputs].forEach((s) => {
      item(s.itemId, `recipe ${r.id}`);
      need(s.quantity > 0, `recipe ${r.id}: quantity must be > 0`);
    });
  }
  for (const q of d.quests.values()) {
    q.prerequisites.forEach((p) => need(d.quests.has(p), `quest ${q.id}: unknown prerequisite ${p}`));
    need(d.npcs.has(q.giverNpcId), `quest ${q.id}: unknown giver ${q.giverNpcId}`);
    const ids = new Set<string>();
    for (const o of q.objectives) {
      need(!ids.has(o.id), `quest ${q.id}: duplicate objective ${o.id}`);
      ids.add(o.id);
      loc(o.locationId, `quest ${q.id}/${o.id}`);
      if (o.type === "collect" || o.type === "deliver" || o.type === "craft") item(o.targetId, `quest ${q.id}/${o.id}`);
      if (o.type === "talk") need(d.npcs.has(o.targetId), `quest ${q.id}/${o.id}: unknown npc`);
      if (o.type === "restore") need(!!d.restorations.get(o.targetId)?.states.includes(o.targetState ?? ""), `quest ${q.id}/${o.id}: bad restore target`);
    }
    if (q.record) {
      text(q.record.descriptionKey, `quest ${q.id}`);
      loc(q.record.locationId, `quest ${q.id}`);
    }
  }
  for (const r of d.restorations.values()) {
    need(r.states.includes(r.initialState) && r.states.includes(r.restoredState), `restoration ${r.id}: states`);
    r.requiredMaterials.forEach((s) => item(s.itemId, `restoration ${r.id}`));
    r.prerequisites.forEach((c) => cond(c, `restoration ${r.id}`));
    text(r.descriptionKey, `restoration ${r.id}`);
    loc(r.locationId, `restoration ${r.id}`);
  }
  for (const n of d.gatherNodes.values()) {
    item(n.itemId, `gather node ${n.id}`);
    n.conditions.forEach((c) => cond(c, `gather node ${n.id}`));
  }
  for (const n of d.dialogue.values()) {
    need(d.npcs.has(n.npcId), `dialogue ${n.id}: unknown npc`);
    n.conditions.forEach((c) => cond(c, `dialogue ${n.id}`));
    n.effects.forEach((e) => effect(e, `dialogue ${n.id}`));
    for (const o of n.options) {
      o.effects.forEach((e) => effect(e, `dialogue ${n.id}`));
      if (o.next) need(d.dialogue.has(o.next), `dialogue ${n.id}: unknown next node ${o.next}`);
    }
  }
  for (const npc of d.npcs.values()) {
    need([...d.dialogue.values()].some((n) => n.npcId === npc.id && n.root && n.conditions.length === 0), `npc ${npc.id}: needs an unconditional fallback dialogue node`);
  }
  for (const s of d.shops.values()) {
    need(d.npcs.has(s.npcId), `shop ${s.id}: unknown npc`);
    [...s.sells, ...s.buys].forEach((o) => item(o.itemId, `shop ${s.id}`));
  }
  for (const disc of d.discoveries.values()) {
    text(disc.descriptionKey, `discovery ${disc.id}`);
    loc(disc.locationId, `discovery ${disc.id}`);
  }
  return errors;
}
