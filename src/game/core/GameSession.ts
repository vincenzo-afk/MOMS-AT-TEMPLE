import type {
  ActionResult,
  DialogueNode,
  Effect,
  GameState,
  LivingRecordEvent,
  LivingRecordEventType,
  QuestDefinition,
} from "./types";
import { INVENTORY_SLOTS, SCHEMA_VERSION, START_MINUTES, type Definitions } from "./defs";
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
  | { type: "inspect"; text: string[] };

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
  };
}

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
    for (const r of defs.restorations.values()) {
      if (!this.state.restorations[r.id]) this.state.restorations[r.id] = r.initialState;
    }
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

  // ---------------------------------------------------------------- record
  private record(
    type: LivingRecordEventType,
    subjectId: string,
    fields: Omit<LivingRecordEvent, "id" | "type" | "worldDay" | "worldMinute">,
  ): void {
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

  startQuest(questId: string): ActionResult {
    const def = this.questDef(questId);
    if (this.state.quests[questId]) return { ok: false, reason: "Quest already started." };
    const missing = def.prerequisites.filter((p) => this.state.quests[p]?.status !== "completed");
    if (missing.length) return { ok: false, reason: "Prerequisites not met." };
    this.state.quests = {
      ...this.state.quests,
      [questId]: { status: "active", objectiveIndex: 0, counts: {}, startedDay: this.worldDay, completedDay: null },
    };
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

  /** Re-evaluates state-derived progress: collect objectives and consequence restorations. */
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
    if (!evaluateAll(r.prerequisites, this.state, this.defs)) return { ok: false, reason: "You should inspect it first." };
    const removed = removeItems(this.state.inventory, r.requiredMaterials);
    if (!removed.ok) return { ok: false, reason: `Needs ${this.describeStacks(r.requiredMaterials)}.` };
    this.state.inventory = removed.inventory;
    this.applyRestoration(restorationId);
    this.notify(`${r.name} restored`, "good");
    this.commit();
    return { ok: true };
  }

  describeStacks(stacks: Array<{ itemId: string; quantity: number }>): string {
    return stacks
      .map((s) => `${s.quantity} ${this.defs.items.get(s.itemId)?.name ?? s.itemId} (${countItem(this.state.inventory, s.itemId)}/${s.quantity})`)
      .join(", ");
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
    const added = addItems(this.state.inventory, [{ itemId: n.itemId, quantity: n.quantity }], (id) => this.defs.items.get(id));
    if (!added.ok) {
      this.notify(added.reason, "bad");
      return added;
    }
    this.state.inventory = added.inventory;
    this.state.gatherNodes = { ...this.state.gatherNodes, [nodeId]: { depletedAtMinute: this.state.worldMinutes } };
    this.emit({ type: "gathered", nodeId, itemId: n.itemId });
    this.notify(`+${n.quantity} ${this.defs.items.get(n.itemId)?.name}`, "good");
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
    const added = addItems(this.state.inventory, [{ itemId, quantity: 1 }], (id) => this.defs.items.get(id));
    if (!added.ok) return added;
    this.state.inventory = added.inventory;
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
    for (const questId of Object.keys(this.state.quests)) {
      const obj = this.currentObjective(questId);
      if (obj?.type === "inspect" && obj.targetId === r.interactableId) this.advance(questId, obj.id);
    }
    this.commit();
    return { ok: true };
  }

  readDiscovery(discoveryId: string): ActionResult {
    const d = this.defs.discoveries.get(discoveryId);
    if (!d) return { ok: false, reason: "Nothing to read." };
    if (!this.state.discoveries.includes(discoveryId)) {
      this.state.discoveries = [...this.state.discoveries, discoveryId];
      this.record("discovery", discoveryId, {
        locationId: d.locationId,
        actionId: `read_${discoveryId}`,
        affectedEntityIds: [d.interactableId],
        previousState: "unread",
        resultingState: "read",
        causeEventIds: [],
        descriptionKey: d.descriptionKey,
      });
      this.notify("Discovery added to the Living Record", "good");
    }
    for (const questId of Object.keys(this.state.quests)) {
      const obj = this.currentObjective(questId);
      if (obj?.type === "inspect" && obj.targetId === d.interactableId) this.advance(questId, obj.id);
    }
    this.emit({ type: "reading", discoveryId });
    this.commit();
    return { ok: true };
  }

  // ---------------------------------------------------------------- dialogue
  private pickRoot(npcId: string): DialogueNode | undefined {
    let best: DialogueNode | undefined;
    for (const n of this.defs.dialogue.values()) {
      if (n.npcId !== npcId || !n.root) continue;
      if (!evaluateAll(n.conditions, this.state, this.defs)) continue;
      if (!best || n.priority > best.priority) best = n;
    }
    return best;
  }

  talk(npcId: string): Conversation | null {
    const node = this.pickRoot(npcId);
    if (!node) return null;
    this.showNode(npcId, node);
    return this.conversation;
  }

  private showNode(npcId: string, node: DialogueNode): void {
    this.conversation = { npcId, node };
    this.applyEffects(node.effects);
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
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- interaction
  actionsFor(it: InteractableDef): InteractionAction[] {
    switch (it.kind) {
      case "npc":
        return [{ verb: "talk", label: `Talk to ${this.defs.npcs.get(it.refId)?.name ?? it.label}`, enabled: true }];
      case "gather": {
        const node = this.defs.gatherNodes.get(it.refId);
        const avail = this.isNodeAvailable(it.refId);
        const blocked = node && !evaluateAll(node.conditions, this.state, this.defs);
        return [
          {
            verb: "gather",
            label: `Gather from ${it.label}`,
            enabled: avail,
            reason: avail ? undefined : blocked ? "Withered. Nothing to pick." : "Picked clean. It will regrow.",
          },
        ];
      }
      case "station":
        return [{ verb: "craft", label: `Work at ${it.label}`, enabled: true }];
      case "restoration": {
        const r = this.defs.restorations.get(it.refId);
        const restored = r && this.state.restorations[it.refId] === r.restoredState;
        const acts: InteractionAction[] = [{ verb: "inspect", label: `Inspect ${it.label}`, enabled: true }];
        if (!restored && r && evaluateAll(r.prerequisites, this.state, this.defs)) {
          const have = hasItems(this.state.inventory, r.requiredMaterials);
          acts.unshift({ verb: "repair", label: `Repair ${it.label}`, enabled: have, reason: have ? undefined : `Needs ${this.describeStacks(r.requiredMaterials)}` });
        }
        return acts;
      }
      case "discovery":
        return [{ verb: "read", label: `Read ${it.label}`, enabled: true }];
      case "rest":
        return [{ verb: "rest", label: "Rest until morning", enabled: true }];
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
      case "craft":
        return { ok: true }; // the UI opens the station panel
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
    for (const r of this.defs.restorations.values()) {
      if (!this.state.restorations[r.id]) this.state.restorations[r.id] = r.initialState;
    }
    this.commit();
  }

  /** Exposed for tests/devtools only. */
  evaluate = (c: Parameters<typeof evaluate>[0]) => evaluate(c, this.state, this.defs);
}
