import type {
  ActionResult,
  DialogueNode,
  Effect,
  GameState,
  ItemStack,
  LivingRecordEvent,
  LivingRecordEventType,
  PlotState,
  QuestDefinition,
  SkillId,
} from "./types";
import { INVENTORY_SLOTS, SCHEMA_VERSION, START_MINUTES, STORAGE_SLOTS, type Definitions } from "./defs";
import type { InteractableDef, InteractionAction, Verb } from "./interactables";
import { addItems, countItem, exchange, hasItems, removeItems } from "../inventory/inventory";
import { evaluate, evaluateAll } from "../world/conditions";

export type GameEvent =
  | { type: "notify"; text: string; tone: "info" | "good" | "bad" }
  | { type: "gathered"; nodeId: string; itemId: string }
  | { type: "crafted"; recipeId: string }
  | { type: "restored"; restorationId: string; state: string }
  | { type: "record"; event: LivingRecordEvent }
  | { type: "questStarted"; questId: string }
  | { type: "questCompleted"; questId: string }
  | { type: "objective"; questId: string; objectiveId: string }
  | { type: "shop"; shopId: string }
  | { type: "reading"; discoveryId: string }
  | { type: "inspect"; text: string[] }
  | { type: "farm"; plotId: string; action: "plant" | "water" | "harvest" }
  | { type: "skill"; skill: SkillId; level: number };

export interface Conversation {
  npcId: string;
  node: DialogueNode;
}

export function newGameState(now = new Date()): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    player: { position: [0, 0, 55], yaw: Math.PI }, // outside the main gate, facing the settlement
    inventory: Array.from({ length: INVENTORY_SLOTS }, () => null),
    coins: 0,
    quests: {},
    flags: {},
    restorations: {},
    gatherNodes: {},
    relationships: {},
    discoveries: [],
    record: [],
    claimedRewards: [],
    craftedCounts: {},
    worldMinutes: START_MINUTES,
    storage: Array.from({ length: STORAGE_SLOTS }, () => null),
    plots: {},
    decor: {},
    lastTalkDay: {},
    skills: { gardening: 0, masonry: 0, crafting: 0 },
  };
}

const levelOf = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 10));

/**
 * Owns the single authoritative GameState. Every gameplay mutation goes through here, so the
 * 3D world, NPCs, quests, UI and save system all observe the same data.
 */
export class GameSession {
  state: GameState;
  conversation: Conversation | null = null;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: GameEvent) => void>();

  constructor(
    readonly defs: Definitions,
    state?: GameState,
  ) {
    this.state = state ?? newGameState();
    this.fillDefaults();
  }

  /** Fill state entries for content that did not exist when the save was made. */
  private fillDefaults(): void {
    const s = this.state;
    for (const r of this.defs.restorations.values()) if (!s.restorations[r.id]) s.restorations[r.id] = r.initialState;
    for (const p of this.defs.plots.values()) if (!s.plots[p.id]) s.plots[p.id] = { stage: "empty", seedItemId: null, plantedAt: 0, wateredAt: null };
    for (const d of this.defs.decorSlots.values()) if (!(d.id in s.decor)) s.decor[d.id] = null;
  }

  // ---------------------------------------------------------------- subscription
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  onEvent(fn: (e: GameEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }
  getSnapshot = (): GameState => this.state;

  private emit(e: GameEvent): void {
    for (const fn of this.eventListeners) fn(e);
  }
  private notify(text: string, tone: "info" | "good" | "bad" = "info"): void {
    this.emit({ type: "notify", text, tone });
  }
  /** Commit: settle consequences, then publish a new snapshot reference. */
  private commit(): void {
    this.settle();
    this.state = { ...this.state, updatedAt: new Date().toISOString() };
    for (const fn of this.listeners) fn();
  }

  // ---------------------------------------------------------------- time
  get worldDay(): number {
    return Math.floor(this.state.worldMinutes / 1440) + 1;
  }
  get hourOfDay(): number {
    return (this.state.worldMinutes % 1440) / 60;
  }
  advanceTime(minutes: number): void {
    const before = Math.floor(this.state.worldMinutes);
    this.state.worldMinutes += minutes;
    // Publish only on whole-minute boundaries to keep React renders cheap.
    if (Math.floor(this.state.worldMinutes) !== before) this.commit();
  }
  setPlayerTransform(position: [number, number, number], yaw: number): void {
    this.state.player = { position, yaw };
  }

  // ---------------------------------------------------------------- items & skills
  itemName(id: string): string {
    return this.defs.items.get(id)?.name ?? id;
  }
  private give(stacks: ItemStack[]): ActionResult {
    const added = addItems(this.state.inventory, stacks, (id) => this.defs.items.get(id));
    if (!added.ok) return added;
    this.state.inventory = added.inventory;
    return { ok: true };
  }
  private gainSkill(skill: SkillId, xp: number): void {
    const before = levelOf(this.state.skills[skill]);
    this.state.skills = { ...this.state.skills, [skill]: this.state.skills[skill] + xp };
    const after = levelOf(this.state.skills[skill]);
    if (after > before) {
      this.emit({ type: "skill", skill, level: after });
      this.notify(`${skill[0]!.toUpperCase()}${skill.slice(1)} improved to level ${after}`, "good");
    }
  }

  // ---------------------------------------------------------------- record
  private record(type: LivingRecordEventType, subjectId: string, fields: Omit<LivingRecordEvent, "id" | "type" | "worldDay" | "worldMinute">): void {
    const id = `${type}:${subjectId}`;
    if (this.state.record.some((e) => e.id === id)) return; // events are idempotent
    const event: LivingRecordEvent = {
      id,
      type,
      worldDay: this.worldDay,
      worldMinute: Math.floor(this.state.worldMinutes % 1440),
      ...fields,
      causeEventIds: fields.causeEventIds.filter((c) => this.state.record.some((e) => e.id === c)),
    };
    this.state.record = [...this.state.record, event];
    this.emit({ type: "record", event });
  }

  // ---------------------------------------------------------------- quests
  questDef(id: string): QuestDefinition {
    const q = this.defs.quests.get(id);
    if (!q) throw new Error(`Unknown quest ${id}`);
    return q;
  }
  currentObjective(questId: string) {
    const p = this.state.quests[questId];
    if (!p || p.status !== "active") return undefined;
    return this.questDef(questId).objectives[p.objectiveIndex];
  }
  /** Quests whose prerequisites are met but that have not been started (for the notice board). */
  availableQuests(): QuestDefinition[] {
    return [...this.defs.quests.values()].filter((q) => !this.state.quests[q.id] && q.prerequisites.every((p) => this.state.quests[p]?.status === "completed"));
  }

  startQuest(questId: string): ActionResult {
    const def = this.questDef(questId);
    if (this.state.quests[questId]) return { ok: false, reason: "Quest already started." };
    const missing = def.prerequisites.filter((p) => this.state.quests[p]?.status !== "completed");
    if (missing.length) return { ok: false, reason: "Prerequisites not met." };
    this.state.quests = { ...this.state.quests, [questId]: { status: "active", objectiveIndex: 0, counts: {}, startedDay: this.worldDay, completedDay: null } };
    this.emit({ type: "questStarted", questId });
    this.notify(`New task: ${def.title}`, "good");
    return { ok: true };
  }

  /** Advances the quest if `objectiveId` is the current objective. Ignores stale or repeated calls. */
  private advance(questId: string, objectiveId: string): boolean {
    const p = this.state.quests[questId];
    const def = this.defs.quests.get(questId);
    if (!p || !def || p.status !== "active") return false;
    if (def.objectives[p.objectiveIndex]?.id !== objectiveId) return false;
    const next = { ...p, objectiveIndex: p.objectiveIndex + 1 };
    this.state.quests = { ...this.state.quests, [questId]: next };
    this.emit({ type: "objective", questId, objectiveId });
    if (next.objectiveIndex >= def.objectives.length) this.completeQuest(questId);
    return true;
  }

  /** Advance every active quest whose current objective is of `type` (and target, if given). */
  private advanceWhere(type: string, targetId?: string): void {
    for (const questId of Object.keys(this.state.quests)) {
      const obj = this.currentObjective(questId);
      if (obj && obj.type === type && (obj.targetId === "any" || targetId === undefined || obj.targetId === targetId)) this.advance(questId, obj.id);
    }
  }

  private completeQuest(questId: string): void {
    const def = this.questDef(questId);
    const p = this.state.quests[questId];
    if (!p) return;
    this.state.quests = { ...this.state.quests, [questId]: { ...p, status: "completed", completedDay: this.worldDay } };
    for (const [i, r] of def.rewards.entries()) {
      const claimId = `${questId}#${i}`;
      if (this.state.claimedRewards.includes(claimId)) continue;
      this.state.claimedRewards = [...this.state.claimedRewards, claimId];
      if (r.type === "coins") this.state.coins += r.amount;
      else if (r.type === "relationship") this.changeRelationship(r.npcId, r.amount);
      else if (r.type === "flag") this.state.flags = { ...this.state.flags, [r.id]: true };
      else if (r.type === "item") {
        const res = this.give([{ itemId: r.itemId, quantity: r.quantity }]);
        if (!res.ok) {
          // never lose a reward: overflow goes to the storage chest
          const stored = addItems(this.state.storage, [{ itemId: r.itemId, quantity: r.quantity }], (id) => this.defs.items.get(id));
          if (stored.ok) {
            this.state.storage = stored.inventory;
            this.notify(`${this.itemName(r.itemId)} was put in your storage chest (bag full).`, "info");
          }
        } else this.notify(`Received ${this.itemName(r.itemId)}`, "good");
      }
    }
    if (def.record) {
      this.record(def.record.type, questId, {
        locationId: def.record.locationId,
        actionId: `complete_${questId}`,
        affectedEntityIds: [def.giverNpcId],
        previousState: null,
        resultingState: "completed",
        causeEventIds: def.record.causeEventIds,
        descriptionKey: def.record.descriptionKey,
      });
    }
    this.emit({ type: "questCompleted", questId });
    const coins = def.rewards.find((r) => r.type === "coins");
    this.notify(`Completed: ${def.title}${coins && coins.type === "coins" ? ` (+${coins.amount} coins)` : ""}`, "good");
  }

  private changeRelationship(npcId: string, amount: number): void {
    const cur = this.state.relationships[npcId] ?? 0;
    this.state.relationships = { ...this.state.relationships, [npcId]: Math.max(-100, Math.min(100, cur + amount)) };
  }

  /** Re-evaluates state-derived progress: collect/craft/restore objectives, plot growth and consequence restorations. */
  private settle(): void {
    for (let guard = 0; guard < 10; guard++) {
      let changed = false;
      for (const [questId, p] of Object.entries(this.state.quests)) {
        if (p.status !== "active") continue;
        const obj = this.questDef(questId).objectives[p.objectiveIndex];
        if (!obj) continue;
        if (obj.type === "collect" && countItem(this.state.inventory, obj.targetId) >= (obj.requiredCount ?? 1)) {
          changed = this.advance(questId, obj.id) || changed;
        } else if (obj.type === "restore" && this.state.restorations[obj.targetId] === obj.targetState) {
          changed = this.advance(questId, obj.id) || changed;
        } else if (obj.type === "craft" && (this.state.craftedCounts[obj.targetId] ?? 0) >= 1 && countItem(this.state.inventory, obj.targetId) >= (obj.requiredCount ?? 1)) {
          changed = this.advance(questId, obj.id) || changed;
        }
      }
      for (const r of this.defs.restorations.values()) {
        if (!r.triggeredByFlags || this.state.restorations[r.id] === r.restoredState) continue;
        if (r.triggeredByFlags.every((f) => this.state.flags[f])) {
          this.applyRestoration(r.id);
          changed = true;
        }
      }
      if (this.growPlots()) changed = true;
      if (!changed) return;
    }
  }

  // ---------------------------------------------------------------- restoration
  private applyRestoration(id: string): void {
    const r = this.defs.restorations.get(id);
    if (!r) return;
    const previous = this.state.restorations[id] ?? r.initialState;
    this.state.restorations = { ...this.state.restorations, [id]: r.restoredState };
    const flags = { ...this.state.flags };
    for (const f of r.resultingWorldFlags) flags[f] = true;
    this.state.flags = flags;
    this.record(r.recordEventType, id, {
      locationId: r.locationId,
      actionId: `restore_${id}`,
      affectedEntityIds: [id],
      previousState: previous,
      resultingState: r.restoredState,
      causeEventIds: r.causeEventIds,
      descriptionKey: r.descriptionKey,
    });
    this.emit({ type: "restored", restorationId: id, state: r.restoredState });
  }

  repair(restorationId: string): ActionResult {
    const r = this.defs.restorations.get(restorationId);
    if (!r) return { ok: false, reason: "Nothing to repair." };
    if (this.state.restorations[restorationId] === r.restoredState) return { ok: false, reason: "Already restored." };
    if (!evaluateAll(r.prerequisites, this.state, this.defs)) return { ok: false, reason: this.prereqReason(r.prerequisites) };
    const removed = removeItems(this.state.inventory, r.requiredMaterials);
    if (!removed.ok) return { ok: false, reason: `Needs ${this.describeStacks(r.requiredMaterials)}.` };
    this.state.inventory = removed.inventory;
    this.applyRestoration(restorationId);
    this.gainSkill("masonry", 12);
    this.notify(`${r.name} restored`, "good");
    this.commit();
    return { ok: true };
  }

  private prereqReason(cs: RestorationPrereqs): string {
    for (const c of cs) {
      if (evaluate(c, this.state, this.defs)) continue;
      if (c.type === "flag") return "You should inspect it first.";
      if (c.type === "hasItem") return `You need a ${this.itemName(c.itemId).toLowerCase()}.`;
      if (c.type === "quest") return "Someone should show you what to do first.";
    }
    return "Not yet.";
  }

  describeStacks(stacks: Array<{ itemId: string; quantity: number }>): string {
    return stacks.map((s) => `${s.quantity} ${this.itemName(s.itemId)} (${countItem(this.state.inventory, s.itemId)}/${s.quantity})`).join(", ");
  }

  // ---------------------------------------------------------------- gathering
  isNodeAvailable(nodeId: string): boolean {
    const n = this.defs.gatherNodes.get(nodeId);
    if (!n || !evaluateAll(n.conditions, this.state, this.defs)) return false;
    const d = this.state.gatherNodes[nodeId];
    return !d || this.state.worldMinutes - d.depletedAtMinute >= n.regrowMinutes;
  }

  gather(nodeId: string): ActionResult {
    const n = this.defs.gatherNodes.get(nodeId);
    if (!n) return { ok: false, reason: "Nothing here." };
    if (!this.isNodeAvailable(nodeId)) return { ok: false, reason: "Nothing left to gather here yet." };
    const res = this.give([{ itemId: n.itemId, quantity: n.quantity }]);
    if (!res.ok) {
      this.notify(res.reason, "bad");
      return res;
    }
    this.state.gatherNodes = { ...this.state.gatherNodes, [nodeId]: { depletedAtMinute: this.state.worldMinutes } };
    const cat = this.defs.items.get(n.itemId)?.category;
    if (cat === "flower") this.gainSkill("gardening", 1);
    this.emit({ type: "gathered", nodeId, itemId: n.itemId });
    this.notify(`+${n.quantity} ${this.itemName(n.itemId)}`, "good");
    this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- crafting
  recipesForStation(stationId: string) {
    return [...this.defs.recipes.values()].filter((r) => r.stationId === stationId);
  }
  isRecipeKnown(recipeId: string): boolean {
    const r = this.defs.recipes.get(recipeId);
    return !!r && r.prerequisites.every((f) => this.state.flags[f]);
  }
  canCraft(recipeId: string): ActionResult {
    const r = this.defs.recipes.get(recipeId);
    if (!r) return { ok: false, reason: "Unknown recipe." };
    if (!this.isRecipeKnown(recipeId)) return { ok: false, reason: "You haven't learned this yet." };
    if (!hasItems(this.state.inventory, r.inputs)) return { ok: false, reason: `Needs ${this.describeStacks(r.inputs)}.` };
    const sim = exchange(this.state.inventory, r.inputs, r.outputs, (id) => this.defs.items.get(id));
    if (!sim.ok) return sim;
    return { ok: true };
  }
  craft(recipeId: string): ActionResult {
    const check = this.canCraft(recipeId);
    if (!check.ok) return check;
    const r = this.defs.recipes.get(recipeId)!;
    const result = exchange(this.state.inventory, r.inputs, r.outputs, (id) => this.defs.items.get(id));
    if (!result.ok) return result;
    this.state.inventory = result.inventory;
    const counts = { ...this.state.craftedCounts };
    for (const o of r.outputs) counts[o.itemId] = (counts[o.itemId] ?? 0) + o.quantity;
    this.state.craftedCounts = counts;
    this.gainSkill("crafting", 4);
    this.emit({ type: "crafted", recipeId });
    this.notify(`Crafted ${r.name}`, "good");
    this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- trading
  buy(shopId: string, itemId: string): ActionResult {
    const offer = this.defs.shops.get(shopId)?.sells.find((s) => s.itemId === itemId);
    if (!offer) return { ok: false, reason: "Not for sale." };
    if (this.state.coins < offer.price) return { ok: false, reason: "Not enough coins." };
    const res = this.give([{ itemId, quantity: 1 }]);
    if (!res.ok) return res;
    this.state.coins -= offer.price;
    this.commit();
    return { ok: true };
  }
  sell(shopId: string, itemId: string): ActionResult {
    const offer = this.defs.shops.get(shopId)?.buys.find((s) => s.itemId === itemId);
    if (!offer) return { ok: false, reason: "They don't buy that." };
    if (this.defs.items.get(itemId)?.questProtected) return { ok: false, reason: "You need to keep that." };
    const removed = removeItems(this.state.inventory, [{ itemId, quantity: 1 }]);
    if (!removed.ok) return removed;
    this.state.inventory = removed.inventory;
    this.state.coins += offer.price;
    this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- farming
  plotState(plotId: string): PlotState {
    return this.state.plots[plotId] ?? { stage: "empty", seedItemId: null, plantedAt: 0, wateredAt: null };
  }
  private setPlot(plotId: string, p: PlotState): void {
    this.state.plots = { ...this.state.plots, [plotId]: p };
  }
  plant(plotId: string): ActionResult {
    const def = this.defs.plots.get(plotId);
    if (!def) return { ok: false, reason: "Not a plot." };
    if (this.plotState(plotId).stage !== "empty") return { ok: false, reason: "Something is already growing here." };
    const crop = [...this.defs.crops.values()].find((c) => countItem(this.state.inventory, c.seedItemId) > 0);
    if (!crop) return { ok: false, reason: "You have no seeds. Selvam sells them." };
    this.state.inventory = (removeItems(this.state.inventory, [{ itemId: crop.seedItemId, quantity: 1 }]) as { ok: true; inventory: GameState["inventory"] }).inventory;
    const auto = def.autoWaterFlag && this.state.flags[def.autoWaterFlag];
    this.setPlot(plotId, { stage: auto ? "growing" : "planted", seedItemId: crop.seedItemId, plantedAt: this.state.worldMinutes, wateredAt: auto ? this.state.worldMinutes : null });
    this.gainSkill("gardening", 2);
    this.emit({ type: "farm", plotId, action: "plant" });
    this.notify(auto ? "Planted. The field channels will water it." : "Planted. It needs watering.", "good");
    this.commit();
    return { ok: true };
  }
  water(plotId: string): ActionResult {
    const p = this.plotState(plotId);
    if (p.stage !== "planted") return { ok: false, reason: "It doesn't need water right now." };
    const ex = exchange(this.state.inventory, [{ itemId: "water_vessel_full", quantity: 1 }], [{ itemId: "water_vessel", quantity: 1 }], (id) => this.defs.items.get(id));
    if (!ex.ok) return { ok: false, reason: countItem(this.state.inventory, "water_vessel") ? "Your pot is empty. Fill it at the tank, water point or well." : "You need a water pot." };
    this.state.inventory = ex.inventory;
    this.setPlot(plotId, { ...p, stage: "growing", wateredAt: this.state.worldMinutes });
    this.gainSkill("gardening", 1);
    this.emit({ type: "farm", plotId, action: "water" });
    this.notify("Watered.", "good");
    this.commit();
    return { ok: true };
  }
  harvest(plotId: string): ActionResult {
    const p = this.plotState(plotId);
    if (p.stage !== "ripe") return { ok: false, reason: "Nothing to harvest yet." };
    const crop = [...this.defs.crops.values()].find((c) => c.seedItemId === p.seedItemId) ?? [...this.defs.crops.values()][0]!;
    const res = this.give([{ itemId: crop.produceItemId, quantity: crop.yield }]);
    if (!res.ok) {
      this.notify(res.reason, "bad");
      return res;
    }
    this.setPlot(plotId, { stage: "empty", seedItemId: null, plantedAt: 0, wateredAt: null });
    this.gainSkill("gardening", 4);
    this.emit({ type: "farm", plotId, action: "harvest" });
    this.notify(`+${crop.yield} ${this.itemName(crop.produceItemId)}`, "good");
    this.commit();
    return { ok: true };
  }
  /** Advances plot stages from world time; auto-waters plots once their irrigation flag is set. */
  private growPlots(): boolean {
    let changed = false;
    for (const def of this.defs.plots.values()) {
      const p = this.plotState(def.id);
      if (p.stage === "planted" && def.autoWaterFlag && this.state.flags[def.autoWaterFlag]) {
        this.setPlot(def.id, { ...p, stage: "growing", wateredAt: this.state.worldMinutes });
        changed = true;
      } else if (p.stage === "growing" && p.wateredAt !== null && this.state.worldMinutes - p.wateredAt >= def.growMinutes) {
        this.setPlot(def.id, { ...p, stage: "ripe" });
        changed = true;
      }
    }
    return changed;
  }

  fill(sourceId: string): ActionResult {
    const src = this.defs.waterSources.get(sourceId);
    if (!src) return { ok: false, reason: "No water here." };
    if (!evaluateAll(src.conditions, this.state, this.defs)) return { ok: false, reason: "No water can be drawn here yet." };
    const ex = exchange(this.state.inventory, [{ itemId: "water_vessel", quantity: 1 }], [{ itemId: "water_vessel_full", quantity: 1 }], (id) => this.defs.items.get(id));
    if (!ex.ok) return { ok: false, reason: countItem(this.state.inventory, "water_vessel_full") ? "Your pot is already full." : "You need an empty water pot." };
    this.state.inventory = ex.inventory;
    this.notify(`Filled your pot at ${src.label}.`, "good");
    this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- storage & home
  /** Move a whole inventory stack into the storage chest (or back with `fromStorage`). */
  transfer(slot: number, fromStorage: boolean): ActionResult {
    const src = fromStorage ? this.state.storage : this.state.inventory;
    const stack = src[slot];
    if (!stack) return { ok: false, reason: "Empty slot." };
    const lookup = (id: string) => this.defs.items.get(id);
    const dest = addItems(fromStorage ? this.state.inventory : this.state.storage, [stack], lookup);
    if (!dest.ok) return { ok: false, reason: fromStorage ? "Your bag is full." : "The chest is full." };
    const nextSrc = src.map((s, i) => (i === slot ? null : s));
    if (fromStorage) {
      this.state.storage = nextSrc;
      this.state.inventory = dest.inventory;
    } else {
      this.state.inventory = nextSrc;
      this.state.storage = dest.inventory;
      this.advanceWhere("store");
    }
    this.commit();
    return { ok: true };
  }

  placeDecor(slotId: string, itemId: string): ActionResult {
    const slot = this.defs.decorSlots.get(slotId);
    if (!slot || !slot.accepts.includes(itemId)) return { ok: false, reason: "That doesn't belong there." };
    if (this.state.decor[slotId]) {
      const r = this.removeDecor(slotId, false);
      if (!r.ok) return r;
    }
    const removed = removeItems(this.state.inventory, [{ itemId, quantity: 1 }]);
    if (!removed.ok) return { ok: false, reason: `You have no ${this.itemName(itemId).toLowerCase()}.` };
    this.state.inventory = removed.inventory;
    this.state.decor = { ...this.state.decor, [slotId]: itemId };
    this.advanceWhere("decorate");
    this.notify(`Placed: ${this.itemName(itemId)}`, "good");
    this.commit();
    return { ok: true };
  }

  removeDecor(slotId: string, commit = true): ActionResult {
    const slot = this.defs.decorSlots.get(slotId);
    const itemId = this.state.decor[slotId];
    if (!slot || !itemId) return { ok: false, reason: "Nothing placed there." };
    if (!slot.consumes) {
      const res = this.give([{ itemId, quantity: 1 }]);
      if (!res.ok) return res;
    }
    this.state.decor = { ...this.state.decor, [slotId]: null };
    if (commit) this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- discovery & inspection
  inspectRestoration(restorationId: string): ActionResult {
    const r = this.defs.restorations.get(restorationId);
    if (!r) return { ok: false, reason: "Nothing to inspect." };
    const restored = this.state.restorations[restorationId] === r.restoredState;
    if (r.inspectFlag) this.state.flags = { ...this.state.flags, [r.inspectFlag]: true };
    if (r.inspectText) {
      const text = restored ? r.inspectText.after : [...r.inspectText.before];
      if (!restored && r.requiredMaterials.length) text.push(`Required: ${this.describeStacks(r.requiredMaterials)}.`);
      this.emit({ type: "inspect", text });
    }
    if (r.interactableId) this.advanceWhere("inspect", r.interactableId);
    this.commit();
    return { ok: true };
  }

  isDiscoveryAvailable(discoveryId: string): boolean {
    const d = this.defs.discoveries.get(discoveryId);
    return !!d && evaluateAll(d.conditions, this.state, this.defs);
  }

  readDiscovery(discoveryId: string): ActionResult {
    const d = this.defs.discoveries.get(discoveryId);
    if (!d) return { ok: false, reason: "Nothing to read." };
    if (!this.isDiscoveryAvailable(discoveryId)) return { ok: false, reason: "You can't reach it yet." };
    if (!this.state.discoveries.includes(discoveryId)) {
      if (d.givesItem) {
        const res = this.give([{ itemId: d.givesItem, quantity: 1 }]);
        if (!res.ok) return { ok: false, reason: "Your bag is full - make room first." };
      }
      this.state.discoveries = [...this.state.discoveries, discoveryId];
      this.record("discovery", discoveryId, {
        locationId: d.locationId,
        actionId: `read_${discoveryId}`,
        affectedEntityIds: [d.interactableId],
        previousState: "unread",
        resultingState: "read",
        causeEventIds: d.causeEventIds,
        descriptionKey: d.descriptionKey,
      });
      this.notify("Discovery added to the Living Record", "good");
    }
    this.advanceWhere("inspect", d.interactableId);
    this.emit({ type: "reading", discoveryId });
    this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- dialogue
  isNpcPresent(npcId: string): boolean {
    const npc = this.defs.npcs.get(npcId);
    return !!npc && (!npc.appearsWhen || evaluateAll(npc.appearsWhen, this.state, this.defs));
  }

  private pickRoot(npcId: string): DialogueNode | undefined {
    const group = this.defs.npcs.get(npcId)?.group;
    let best: DialogueNode | undefined;
    for (const n of this.defs.dialogue.values()) {
      if (!n.root || (n.npcId !== npcId && n.npcId !== `group:${group}`)) continue;
      if (!evaluateAll(n.conditions, this.state, this.defs)) continue;
      if (!best || n.priority > best.priority) best = n;
    }
    return best;
  }

  talk(npcId: string): Conversation | null {
    if (!this.isNpcPresent(npcId)) return null;
    const node = this.pickRoot(npcId);
    if (!node) return null;
    // daily acquaintance: the first conversation of each day builds a little trust
    if (this.state.lastTalkDay[npcId] !== this.worldDay) {
      this.state.lastTalkDay = { ...this.state.lastTalkDay, [npcId]: this.worldDay };
      this.changeRelationship(npcId, 2);
    }
    this.showNode(npcId, node);
    return this.conversation;
  }

  private showNode(npcId: string, node: DialogueNode): void {
    this.conversation = { npcId, node };
    this.applyEffects(node.effects);
    this.advanceWhere("talk", npcId);
    this.commit();
  }

  /** Choose a dialogue option (or continue when the node has none). */
  choose(optionIndex: number): Conversation | null {
    const conv = this.conversation;
    if (!conv) return null;
    const opt = conv.node.options[optionIndex];
    if (!opt) {
      this.endConversation();
      return null;
    }
    const ok = this.applyEffects(opt.effects);
    const next = opt.next ? this.defs.dialogue.get(opt.next) : undefined;
    if (ok && next) this.showNode(conv.npcId, next);
    else this.endConversation();
    return this.conversation;
  }

  endConversation(): void {
    this.conversation = null;
    this.commit();
  }

  private applyEffects(effects: Effect[]): boolean {
    for (const e of effects) {
      switch (e.type) {
        case "startQuest":
          this.startQuest(e.questId);
          break;
        case "advance":
          this.advance(e.questId, e.objectiveId);
          break;
        case "deliver": {
          const obj = this.currentObjective(e.questId);
          if (!obj || obj.id !== e.objectiveId) return false;
          const removed = removeItems(this.state.inventory, [{ itemId: obj.targetId, quantity: obj.requiredCount ?? 1 }]);
          if (!removed.ok) {
            this.notify(removed.reason, "bad");
            return false;
          }
          this.state.inventory = removed.inventory;
          this.advance(e.questId, e.objectiveId);
          break;
        }
        case "setFlag":
          this.state.flags = { ...this.state.flags, [e.id]: true };
          break;
        case "relationship":
          this.changeRelationship(e.npcId, e.amount);
          break;
        case "openShop":
          this.emit({ type: "shop", shopId: e.shopId });
          break;
        case "giveItem": {
          const claim = `give:${e.once}`;
          if (this.state.claimedRewards.includes(claim)) break;
          const res = this.give([{ itemId: e.itemId, quantity: e.quantity }]);
          if (!res.ok) {
            this.notify("Your bag is full - make room and ask again.", "bad");
            break;
          }
          this.state.claimedRewards = [...this.state.claimedRewards, claim];
          this.notify(`Received ${this.itemName(e.itemId)}`, "good");
          break;
        }
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- interaction
  actionsFor(it: InteractableDef): InteractionAction[] {
    switch (it.kind) {
      case "npc":
        return this.isNpcPresent(it.refId) ? [{ verb: "talk", label: `Talk to ${this.defs.npcs.get(it.refId)?.name ?? it.label}`, enabled: true }] : [];
      case "gather": {
        const node = this.defs.gatherNodes.get(it.refId);
        const avail = this.isNodeAvailable(it.refId);
        const blocked = node && !evaluateAll(node.conditions, this.state, this.defs);
        return [{ verb: "gather", label: `Gather from ${it.label}`, enabled: avail, reason: avail ? undefined : blocked ? "Withered. Nothing to pick." : "Picked clean. It will regrow." }];
      }
      case "station":
        return [{ verb: "craft", label: `Work at ${it.label}`, enabled: true }];
      case "restoration": {
        const r = this.defs.restorations.get(it.refId);
        const restored = r && this.state.restorations[it.refId] === r.restoredState;
        const acts: InteractionAction[] = [{ verb: "inspect", label: `Inspect ${it.label}`, enabled: true }];
        if (!restored && r && evaluateAll(r.prerequisites, this.state, this.defs)) {
          const have = hasItems(this.state.inventory, r.requiredMaterials);
          acts.unshift({ verb: "repair", label: `${r.requiredMaterials.length ? "Repair" : "Clear"} ${it.label}`, enabled: have, reason: have ? undefined : `Needs ${this.describeStacks(r.requiredMaterials)}` });
        }
        return acts;
      }
      case "discovery": {
        const ok = this.isDiscoveryAvailable(it.refId);
        return ok ? [{ verb: "read", label: `Examine ${it.label}`, enabled: true }] : [];
      }
      case "rest":
        return [{ verb: "rest", label: "Rest until morning", enabled: true }];
      case "plot": {
        const p = this.plotState(it.refId);
        if (p.stage === "empty") {
          const seeds = [...this.defs.crops.values()].some((c) => countItem(this.state.inventory, c.seedItemId) > 0);
          return [{ verb: "plant", label: "Plant seeds", enabled: seeds, reason: seeds ? undefined : "You need seeds (Selvam sells them)." }];
        }
        if (p.stage === "planted") {
          const full = countItem(this.state.inventory, "water_vessel_full") > 0;
          return [{ verb: "water", label: "Water the plot", enabled: full, reason: full ? undefined : "Fill a water pot first." }];
        }
        if (p.stage === "ripe") return [{ verb: "harvest", label: "Harvest vegetables", enabled: true }];
        const left = Math.max(0, (this.defs.plots.get(it.refId)?.growMinutes ?? 0) - (this.state.worldMinutes - (p.wateredAt ?? 0)));
        return [{ verb: "harvest", label: "Growing", enabled: false, reason: `Ready in about ${Math.ceil(left / 60)} hour(s).` }];
      }
      case "water": {
        const src = this.defs.waterSources.get(it.refId);
        if (!src) return [];
        const ok = evaluateAll(src.conditions, this.state, this.defs);
        const pot = countItem(this.state.inventory, "water_vessel") > 0;
        if (!ok) return [];
        return [{ verb: "fill", label: `Fill water pot at ${src.label}`, enabled: pot, reason: pot ? undefined : countItem(this.state.inventory, "water_vessel_full") ? "Your pot is already full." : "You need an empty water pot." }];
      }
      case "storage":
        return [{ verb: "store", label: "Open your storage chest", enabled: true }];
      case "decor":
        return [{ verb: "decorate", label: "Decorate your house", enabled: true }];
      case "notice":
        return [{ verb: "notices", label: "Read the notice board", enabled: true }];
      case "sit":
        return [{ verb: "sit", label: "Sit and rest a while", enabled: true }];
    }
  }

  perform(it: InteractableDef, verb: Verb): ActionResult {
    switch (verb) {
      case "talk":
        return this.talk(it.refId) ? { ok: true } : { ok: false, reason: "They have nothing to say." };
      case "gather":
        return this.gather(it.refId);
      case "inspect":
        return this.inspectRestoration(it.refId);
      case "repair":
        return this.repair(it.refId);
      case "read":
        return this.readDiscovery(it.refId);
      case "plant":
        return this.plant(it.refId);
      case "water":
        return this.water(it.refId);
      case "harvest":
        return this.harvest(it.refId);
      case "fill":
        return this.fill(it.refId);
      case "craft":
      case "store":
      case "decorate":
      case "notices":
      case "sit":
        return { ok: true }; // the UI / engine opens a panel or plays a pose
      case "rest":
        return this.rest();
    }
  }

  rest(): ActionResult {
    const minuteOfDay = this.state.worldMinutes % 1440;
    const toMorning = (6 * 60 - minuteOfDay + 1440) % 1440 || 1440;
    this.state.worldMinutes += toMorning;
    this.notify(`You rest. Day ${this.worldDay} begins.`, "info");
    this.commit();
    return { ok: true };
  }

  /** Replace the whole state (load). */
  replaceState(state: GameState): void {
    this.state = state;
    this.conversation = null;
    this.fillDefaults();
    this.commit();
  }

  /** Exposed for tests/devtools only. */
  evaluate = (c: Parameters<typeof evaluate>[0]) => evaluate(c, this.state, this.defs);
}

type RestorationPrereqs = Parameters<typeof evaluateAll>[0];
