import type { Definitions } from "../game/core/defs";
import type { Condition, Effect } from "../game/core/types";
import { RECORD_TEXT, LOCATIONS, NOTICE_HINTS } from "./text";
import { ANCHORS, PLACEMENTS, INTERACTABLES } from "./level";
import { SHELTER_ANCHORS } from "./world";

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
    if (c.type === "relationship") need(d.npcs.has(c.npcId), `${ctx}: unknown npc ${c.npcId}`);
    if (c.type === "plot") need(d.plots.has(c.id), `${ctx}: unknown plot ${c.id}`);
    if (c.type === "picked") need(d.pickups.has(c.id), `${ctx}: unknown pickup ${c.id}`);
  };
  const effect = (e: Effect, ctx: string) => {
    if (e.type === "startQuest") need(d.quests.has(e.questId), `${ctx}: unknown quest ${e.questId}`);
    if (e.type === "advance" || e.type === "deliver")
      need(!!d.quests.get(e.questId)?.objectives.some((o) => o.id === e.objectiveId), `${ctx}: unknown objective ${e.questId}/${e.objectiveId}`);
    if (e.type === "relationship") need(d.npcs.has(e.npcId), `${ctx}: unknown npc ${e.npcId}`);
    if (e.type === "openShop") need(d.shops.has(e.shopId), `${ctx}: unknown shop ${e.shopId}`);
    if (e.type === "giveItem" || e.type === "takeItem") item(e.itemId, ctx);
  };
  const groups = new Set([...d.npcs.values()].map((n) => n.group).filter(Boolean).map((g) => `group:${g}`));

  for (const i of d.items.values()) need(i.maxStack > 0, `item ${i.id}: maxStack must be > 0`);
  for (const r of d.recipes.values()) {
    [...r.inputs, ...r.outputs].forEach((s) => {
      item(s.itemId, `recipe ${r.id}`);
      need(s.quantity > 0, `recipe ${r.id}: quantity must be > 0`);
    });
  }
  for (const q of d.quests.values()) {
    q.prerequisites.forEach((p) => need(d.quests.has(p), `quest ${q.id}: unknown prerequisite ${p}`));
    need(q.id in NOTICE_HINTS, `quest ${q.id}: missing notice board hint`);
    for (const r of q.rewards) {
      if (r.type === "item") item(r.itemId, `quest ${q.id} reward`);
      if (r.type === "relationship") need(d.npcs.has(r.npcId), `quest ${q.id}: reward for unknown npc ${r.npcId}`);
    }
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
    need(d.npcs.has(n.npcId) || groups.has(n.npcId), `dialogue ${n.id}: unknown npc ${n.npcId}`);
    n.conditions.forEach((c) => cond(c, `dialogue ${n.id}`));
    n.effects.forEach((e) => effect(e, `dialogue ${n.id}`));
    for (const o of n.options) {
      o.effects.forEach((e) => effect(e, `dialogue ${n.id}`));
      if (o.next) need(d.dialogue.has(o.next), `dialogue ${n.id}: unknown next node ${o.next}`);
    }
  }
  for (const npc of d.npcs.values()) {
    need(
      [...d.dialogue.values()].some((n) => (n.npcId === npc.id || n.npcId === `group:${npc.group}`) && n.root && n.conditions.length === 0),
      `npc ${npc.id}: needs an unconditional fallback dialogue node`,
    );
    for (const e of npc.schedule) {
      need(e.anchorId in ANCHORS, `npc ${npc.id}: unknown anchor ${e.anchorId}`);
      (e.when ?? []).forEach((c) => cond(c, `npc ${npc.id} schedule`));
    }
    (npc.appearsWhen ?? []).forEach((c) => cond(c, `npc ${npc.id} appearsWhen`));
  }
  for (const r of d.recipes.values()) need(["st_workshop_bench", "st_festival_station"].includes(r.stationId), `recipe ${r.id}: unknown station ${r.stationId}`);
  for (const slot of d.decorSlots.values()) slot.accepts.forEach((i) => item(i, `decor slot ${slot.id}`));
  for (const w of d.waterSources.values()) w.conditions.forEach((c) => cond(c, `water source ${w.id}`));
  for (const s of d.shops.values()) {
    need(d.npcs.has(s.npcId), `shop ${s.id}: unknown npc`);
    [...s.sells, ...s.buys].forEach((o) => item(o.itemId, `shop ${s.id}`));
  }
  const placementIds = new Set(PLACEMENTS.map((p) => p.id).filter(Boolean));
  const who = (w: string, ctx: string) => need(w === "any" || w === "default" || d.npcs.has(w) || groups.has(w), `${ctx}: unknown speaker ${w}`);
  for (const door of d.doors.values()) {
    need(placementIds.has(door.placementId), `door ${door.id}: unknown placement ${door.placementId}`);
    (door.lockedWhen ?? []).forEach((c) => cond(c, `door ${door.id}`));
  }
  for (const c of d.containers.values()) {
    need(placementIds.has(c.placementId), `container ${c.id}: unknown placement ${c.placementId}`);
    if (c.ownerNpcId) need(d.npcs.has(c.ownerNpcId), `container ${c.id}: unknown owner`);
    c.initial.forEach((st) => item(st.itemId, `container ${c.id}`));
    need(c.initial.length <= c.slots, `container ${c.id}: more stacks than slots`);
    need(INTERACTABLES.some((i) => i.kind === "container" && i.refId === c.id), `container ${c.id}: no interactable`);
    loc(c.locationId, `container ${c.id}`);
  }
  for (const pk of d.pickups.values()) {
    need(placementIds.has(pk.placementId), `pickup ${pk.id}: unknown placement ${pk.placementId}`);
    item(pk.itemId, `pickup ${pk.id}`);
    pk.conditions.forEach((c) => cond(c, `pickup ${pk.id}`));
    need(INTERACTABLES.some((i) => i.kind === "pickup" && i.refId === pk.id), `pickup ${pk.id}: no interactable`);
  }
  for (const t of d.topics.values()) {
    t.conditions.forEach((c) => cond(c, `topic ${t.id}`));
    need(t.answers.some((a) => a.who === "default"), `topic ${t.id}: needs a default answer (knowledge boundary)`);
    for (const a of t.answers) {
      who(a.who, `topic ${t.id}`);
      (a.when ?? []).forEach((c) => cond(c, `topic ${t.id}`));
      (a.effects ?? []).forEach((e) => effect(e, `topic ${t.id}`));
    }
  }
  for (const b of d.barks) {
    who(b.who, `bark ${b.id}`);
    b.conditions.forEach((c) => cond(c, `bark ${b.id}`));
    need(b.lines.length > 0, `bark ${b.id}: no lines`);
  }
  for (const a of SHELTER_ANCHORS) need(a in ANCHORS, `shelter anchor ${a} missing`);
  for (const i of d.items.values()) if (i.use) need(!!i.use.coins || !!i.use.flag, `item ${i.id}: use has no effect`);
  for (const disc of d.discoveries.values()) {
    text(disc.descriptionKey, `discovery ${disc.id}`);
    loc(disc.locationId, `discovery ${disc.id}`);
    disc.conditions.forEach((c) => cond(c, `discovery ${disc.id}`));
    if (disc.givesItem) item(disc.givesItem, `discovery ${disc.id}`);
  }
  return errors;
}
