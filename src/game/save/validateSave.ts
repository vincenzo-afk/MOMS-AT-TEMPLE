import type { GameState, LivingRecordEvent, QuestProgress } from "../core/types";
import { INVENTORY_SLOTS, SCHEMA_VERSION, type Definitions } from "../core/defs";

export type SaveCheck = { ok: true; state: GameState; warnings: string[] } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";

/** Migrations keyed by the version they upgrade FROM. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

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
    },
  };
}
