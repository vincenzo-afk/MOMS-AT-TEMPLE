import type { GameState, ItemStack, LivingRecordEvent, PlotState, QuestProgress, SkillId } from "../core/types";
import { INVENTORY_SLOTS, SCHEMA_VERSION, STORAGE_SLOTS, type Definitions } from "../core/defs";

export type SaveCheck = { ok: true; state: GameState; warnings: string[] } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";

/** Migrations keyed by the version they upgrade FROM. */
const RENAMED_NPCS: Record<string, string> = { npc_murugan: "npc_amudha", npc_kamala: "npc_velan" };
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: the gardener and artisan were re-cast to the reference sheet (Murugan -> Amudha, Kamala -> Velan);
  // "Garland for the Gate" lost its separate "learn" step (now taught in dialogue). New state blocks are added empty.
  1: (raw) => {
    const out: Record<string, unknown> = { ...raw, schemaVersion: 2 };
    if (isObj(raw.relationships)) {
      out.relationships = Object.fromEntries(Object.entries(raw.relationships).map(([k, v]) => [RENAMED_NPCS[k] ?? k, v]));
    }
    if (Array.isArray(raw.record)) {
      out.record = raw.record.map((e) => (isObj(e) && Array.isArray(e.affectedEntityIds) ? { ...e, affectedEntityIds: e.affectedEntityIds.map((id) => (typeof id === "string" ? RENAMED_NPCS[id] ?? id : id)) } : e));
    }
    if (isObj(raw.quests) && isObj(raw.quests.q_garland)) {
      const g = raw.quests.q_garland;
      const idx = isNum(g.objectiveIndex) ? g.objectiveIndex : 0;
      out.quests = { ...raw.quests, q_garland: { ...g, objectiveIndex: Math.max(0, idx - 1) } };
      out.flags = { ...(isObj(raw.flags) ? raw.flags : {}), learned_garland: true };
    }
    out.storage = [];
    out.plots = {};
    out.decor = {};
    out.lastTalkDay = {};
    out.skills = { gardening: 0, masonry: 0, crafting: 0 };
    return out;
  },
};

/**
 * Validates untrusted save data (from IndexedDB or an import) into a GameState.
 * Unknown references to removed content are dropped with a warning instead of failing the load.
 */
export function validateSave(raw: unknown, defs: Definitions): SaveCheck {
  if (!isObj(raw)) return { ok: false, error: "Save data is not an object." };
  let data = raw;
  if (!isNum(data.schemaVersion)) return { ok: false, error: "Save has no schema version." };
  let version: number = data.schemaVersion;
  if (version > SCHEMA_VERSION) return { ok: false, error: `Save was made by a newer version (schema ${version}).` };
  while (version < SCHEMA_VERSION) {
    const m = MIGRATIONS[version];
    if (!m) return { ok: false, error: `No migration from schema ${version}.` };
    data = m(data);
    version = data.schemaVersion as number;
  }

  const warnings: string[] = [];
  const p = data.player;
  if (!isObj(p) || !Array.isArray(p.position) || p.position.length !== 3 || !p.position.every(isNum) || !isNum(p.yaw))
    return { ok: false, error: "Invalid player data." };

  if (!Array.isArray(data.inventory)) return { ok: false, error: "Invalid inventory." };
  const inventory: GameState["inventory"] = Array.from({ length: INVENTORY_SLOTS }, () => null);
  data.inventory.slice(0, INVENTORY_SLOTS).forEach((s, i) => {
    if (s === null) return;
    if (!isObj(s) || !isStr(s.itemId) || !isNum(s.quantity) || s.quantity <= 0) {
      warnings.push(`Dropped invalid inventory slot ${i}.`);
      return;
    }
    const def = defs.items.get(s.itemId);
    if (!def) {
      warnings.push(`Dropped unknown item ${s.itemId}.`);
      return;
    }
    inventory[i] = { itemId: s.itemId, quantity: Math.min(Math.floor(s.quantity), def.maxStack) };
  });

  if (!isNum(data.coins) || data.coins < 0) return { ok: false, error: "Invalid coins." };
  if (!isNum(data.worldMinutes) || data.worldMinutes < 0) return { ok: false, error: "Invalid world time." };

  const quests: Record<string, QuestProgress> = {};
  if (!isObj(data.quests)) return { ok: false, error: "Invalid quests." };
  for (const [id, q] of Object.entries(data.quests)) {
    const def = defs.quests.get(id);
    if (!def) {
      warnings.push(`Dropped unknown quest ${id}.`);
      continue;
    }
    if (!isObj(q) || (q.status !== "active" && q.status !== "completed") || !isNum(q.objectiveIndex) || !isNum(q.startedDay))
      return { ok: false, error: `Invalid quest progress for ${id}.` };
    quests[id] = {
      status: q.status,
      objectiveIndex: Math.max(0, Math.min(def.objectives.length, Math.floor(q.objectiveIndex))),
      counts: isObj(q.counts) ? (Object.fromEntries(Object.entries(q.counts).filter(([, v]) => isNum(v))) as Record<string, number>) : {},
      startedDay: q.startedDay,
      completedDay: isNum(q.completedDay) ? q.completedDay : null,
    };
  }

  const boolRecord = (v: unknown): Record<string, boolean> =>
    isObj(v) ? (Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "boolean")) as Record<string, boolean>) : {};
  const numRecord = (v: unknown): Record<string, number> =>
    isObj(v) ? (Object.fromEntries(Object.entries(v).filter(([, x]) => isNum(x))) as Record<string, number>) : {};

  const restorations: Record<string, string> = {};
  if (isObj(data.restorations)) {
    for (const [id, st] of Object.entries(data.restorations)) {
      const def = defs.restorations.get(id);
      if (def && isStr(st) && def.states.includes(st)) restorations[id] = st;
      else warnings.push(`Dropped invalid restoration ${id}.`);
    }
  }

  const gatherNodes: GameState["gatherNodes"] = {};
  if (isObj(data.gatherNodes)) {
    for (const [id, g] of Object.entries(data.gatherNodes)) {
      if (defs.gatherNodes.has(id) && isObj(g) && isNum(g.depletedAtMinute)) gatherNodes[id] = { depletedAtMinute: g.depletedAtMinute };
    }
  }

  const record: LivingRecordEvent[] = [];
  if (!Array.isArray(data.record)) return { ok: false, error: "Invalid Living Record." };
  for (const e of data.record) {
    if (!isObj(e) || !isStr(e.id) || !isStr(e.type) || !isNum(e.worldDay) || !isStr(e.descriptionKey)) {
      warnings.push("Dropped an invalid record entry.");
      continue;
    }
    if (record.some((r) => r.id === e.id)) continue;
    record.push({
      id: e.id,
      type: e.type as LivingRecordEvent["type"],
      worldDay: e.worldDay,
      worldMinute: isNum(e.worldMinute) ? e.worldMinute : 0,
      locationId: isStr(e.locationId) ? e.locationId : "loc_courtyard",
      actionId: isStr(e.actionId) ? e.actionId : "",
      affectedEntityIds: Array.isArray(e.affectedEntityIds) ? e.affectedEntityIds.filter(isStr) : [],
      previousState: isStr(e.previousState) ? e.previousState : null,
      resultingState: isStr(e.resultingState) ? e.resultingState : null,
      causeEventIds: Array.isArray(e.causeEventIds) ? e.causeEventIds.filter(isStr) : [],
      descriptionKey: e.descriptionKey,
    });
  }

  const strList = (v: unknown) => (Array.isArray(v) ? v.filter(isStr) : []);

  const readStacks = (v: unknown, size: number, label: string): Array<ItemStack | null> => {
    const out: Array<ItemStack | null> = Array.from({ length: size }, () => null);
    if (!Array.isArray(v)) return out;
    v.slice(0, size).forEach((st, i) => {
      if (st === null) return;
      if (!isObj(st) || !isStr(st.itemId) || !isNum(st.quantity) || st.quantity <= 0) return warnings.push(`Dropped invalid ${label} slot ${i}.`);
      const def = defs.items.get(st.itemId);
      if (!def) return warnings.push(`Dropped unknown item ${st.itemId}.`);
      out[i] = { itemId: st.itemId, quantity: Math.min(Math.floor(st.quantity), def.maxStack) };
    });
    return out;
  };

  const plots: Record<string, PlotState> = {};
  if (isObj(data.plots)) {
    for (const [id, pl] of Object.entries(data.plots)) {
      if (!defs.plots.has(id) || !isObj(pl)) continue;
      const stage = pl.stage;
      if (stage !== "empty" && stage !== "planted" && stage !== "growing" && stage !== "ripe") continue;
      plots[id] = {
        stage,
        seedItemId: isStr(pl.seedItemId) && defs.items.has(pl.seedItemId) ? pl.seedItemId : null,
        plantedAt: isNum(pl.plantedAt) ? pl.plantedAt : 0,
        wateredAt: isNum(pl.wateredAt) ? pl.wateredAt : null,
      };
    }
  }
  const decor: Record<string, string | null> = {};
  if (isObj(data.decor)) {
    for (const [slot, item] of Object.entries(data.decor)) {
      const def = defs.decorSlots.get(slot);
      if (def) decor[slot] = isStr(item) && def.accepts.includes(item) ? item : null;
    }
  }
  const skillsRaw = isObj(data.skills) ? data.skills : {};
  const skills = Object.fromEntries((["gardening", "masonry", "crafting"] as SkillId[]).map((k) => [k, isNum(skillsRaw[k]) ? Math.max(0, skillsRaw[k] as number) : 0])) as Record<SkillId, number>;
  return {
    ok: true,
    warnings,
    state: {
      schemaVersion: SCHEMA_VERSION,
      createdAt: isStr(data.createdAt) ? data.createdAt : new Date().toISOString(),
      updatedAt: isStr(data.updatedAt) ? data.updatedAt : new Date().toISOString(),
      player: { position: [p.position[0], p.position[1], p.position[2]] as [number, number, number], yaw: p.yaw },
      inventory,
      coins: Math.floor(data.coins),
      quests,
      flags: boolRecord(data.flags),
      restorations,
      gatherNodes,
      relationships: numRecord(data.relationships),
      discoveries: strList(data.discoveries).filter((d) => defs.discoveries.has(d)),
      record,
      claimedRewards: strList(data.claimedRewards),
      craftedCounts: numRecord(data.craftedCounts),
      worldMinutes: data.worldMinutes,
      storage: readStacks(data.storage, STORAGE_SLOTS, "storage"),
      plots,
      decor,
      lastTalkDay: numRecord(data.lastTalkDay),
      skills,
    },
  };
}
