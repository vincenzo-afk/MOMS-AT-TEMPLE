// Shared data contracts for definitions (authored data) and runtime state (saved data).
// Definitions are validated at boot by src/data/validate.ts; state is validated on load by save/validateSave.ts.

export type ItemCategory = "flower" | "material" | "crafted" | "trade" | "quest" | "tool" | "produce" | "decor";

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  icon: string; // short glyph used until painted icons exist (see docs/ASSET_GENERATION_QUEUE.md)
  maxStack: number;
  tags: string[];
  questProtected?: boolean; // cannot be sold
  sellPrice?: number;
  /** "Use" from the inventory: consumes one and applies the effect. */
  use?: { label: string; coins?: number; flag?: string };
}

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  stationId: string;
  inputs: ItemStack[];
  outputs: ItemStack[];
  prerequisites: string[]; // world flags required
  craftSeconds: number;
}

export type Condition =
  | { type: "quest"; id: string; status: QuestStatus | "not_started" }
  | { type: "objective"; questId: string; objectiveId: string }
  | { type: "flag"; id: string; value: boolean }
  | { type: "restoration"; id: string; state: string }
  | { type: "hasItem"; itemId: string; count: number }
  | { type: "discovered"; id: string; value: boolean }
  | { type: "relationship"; npcId: string; min: number }
  | { type: "plot"; id: string; stage: PlotStage }
  | { type: "hour"; from: number; to: number }
  | { type: "crime"; value: boolean }
  | { type: "picked"; id: string; value: boolean };

export type Effect =
  | { type: "startQuest"; questId: string }
  | { type: "advance"; questId: string; objectiveId: string }
  | { type: "deliver"; questId: string; objectiveId: string }
  | { type: "setFlag"; id: string }
  | { type: "relationship"; npcId: string; amount: number }
  | { type: "openShop"; shopId: string }
  | { type: "giveItem"; itemId: string; quantity: number; once: string }
  | { type: "takeItem"; itemId: string; quantity: number }
  | { type: "coins"; amount: number }
  | { type: "resolveCrime"; mode: "return" | "fine" };

export type ObjectiveType = "talk" | "collect" | "deliver" | "craft" | "restore" | "inspect" | "store" | "decorate";

export interface ObjectiveDefinition {
  id: string;
  type: ObjectiveType;
  text: string;
  targetId: string; // npc, item, restoration or interactable id depending on type
  requiredCount?: number; // collect / deliver / craft
  targetState?: string; // restore
  locationId: string; // where the player should go; used by the journal and HUD
}

export type Reward =
  | { type: "coins"; amount: number }
  | { type: "relationship"; npcId: string; amount: number }
  | { type: "flag"; id: string }
  | { type: "item"; itemId: string; quantity: number };

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  giverNpcId: string;
  prerequisites: string[]; // quest ids that must be completed
  objectives: ObjectiveDefinition[];
  rewards: Reward[];
  record?: { type: LivingRecordEventType; descriptionKey: string; locationId: string; causeEventIds: string[] };
}

export interface RestorationDefinition {
  id: string;
  name: string;
  locationId: string;
  initialState: string;
  states: string[];
  restoredState: string;
  requiredMaterials: ItemStack[];
  prerequisites: Condition[];
  resultingWorldFlags: string[];
  recordEventType: LivingRecordEventType;
  descriptionKey: string;
  interactableId?: string;
  inspectFlag?: string; // set when the player inspects it
  inspectText?: { before: string[]; after: string[] };
  /** Presentation of the player's repair work (animation clip and duration). */
  action?: { anim: "repair_channel" | "craft_at_station" | "place_object" | "harvest_plant"; seconds: number; label: string };
  // When set, the restoration is a consequence: it happens automatically once these flags exist.
  triggeredByFlags?: string[];
  causeEventIds: string[];
}

export interface GatherNodeDefinition {
  id: string;
  itemId: string;
  quantity: number;
  regrowMinutes: number;
  conditions: Condition[]; // e.g. marigolds only after the garden recovers
  label: string;
}

export interface ScheduleEntry {
  fromHour: number; // inclusive, 0-24 (values past 24 wrap to the next morning)
  toHour: number; // exclusive
  anchorId: string;
  activity: "work" | "rest" | "talk" | "home" | "sit" | "garden" | "craft" | "trade" | "festival" | "patrol";
  /** Optional: entry only applies while these hold (checked before unconditional entries). */
  when?: Condition[];
}

export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  /** Dialogue nodes addressed to "group:<group>" apply to every NPC of the group. */
  group?: string;
  /** NPC is absent from the world until these hold (e.g. the weaver returns after her house is restored). */
  appearsWhen?: Condition[];
  appearance: { model: string; tint: string; accent: string };
  homeAnchorId: string;
  workAnchorId: string;
  schedule: ScheduleEntry[];
}

export interface DialogueOption {
  label: string;
  effects: Effect[];
  next?: string;
}

export interface DialogueNode {
  id: string;
  npcId: string;
  priority: number; // highest matching root node is chosen when the conversation starts
  root: boolean;
  conditions: Condition[];
  lines: string[];
  effects: Effect[]; // applied when the node is shown
  options: DialogueOption[];
}

export interface ShopDefinition {
  id: string;
  npcId: string;
  sells: Array<{ itemId: string; price: number }>;
  buys: Array<{ itemId: string; price: number }>;
}

export type LivingRecordEventType = "arrival" | "restoration" | "consequence" | "discovery" | "community" | "craft" | "home" | "festival";

export type PlotStage = "empty" | "planted" | "growing" | "ripe";

export interface PlotDefinition {
  id: string;
  locationId: string;
  growMinutes: number;
  /** When this flag is set the plot is watered by the field channels automatically. */
  autoWaterFlag?: string;
}

export interface CropDefinition {
  seedItemId: string;
  produceItemId: string;
  yield: number;
}

export interface WaterSourceDefinition {
  id: string;
  label: string;
  conditions: Condition[];
  locationId: string;
}

export interface DecorSlotDefinition {
  id: string;
  label: string;
  accepts: string[]; // item ids that can be placed here
  /** Consumed items (kolam powder) cannot be taken back once placed. */
  consumes?: boolean;
}

export type SkillId = "gardening" | "masonry" | "crafting";

export interface PlotState {
  stage: PlotStage;
  seedItemId: string | null;
  plantedAt: number;
  wateredAt: number | null;
}

export interface LivingRecordEvent {
  id: string;
  type: LivingRecordEventType;
  worldDay: number;
  worldMinute: number;
  locationId: string;
  actionId: string;
  affectedEntityIds: string[];
  previousState: string | null;
  resultingState: string | null;
  causeEventIds: string[];
  descriptionKey: string;
}

export type QuestStatus = "active" | "completed";

export interface QuestProgress {
  status: QuestStatus;
  objectiveIndex: number;
  counts: Record<string, number>;
  startedDay: number;
  completedDay: number | null;
}

export interface GameState {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  player: { position: [number, number, number]; yaw: number };
  inventory: Array<ItemStack | null>;
  coins: number;
  quests: Record<string, QuestProgress>;
  flags: Record<string, boolean>;
  restorations: Record<string, string>;
  gatherNodes: Record<string, { depletedAtMinute: number }>;
  relationships: Record<string, number>;
  discoveries: string[];
  record: LivingRecordEvent[];
  claimedRewards: string[];
  craftedCounts: Record<string, number>;
  worldMinutes: number; // minutes since day 1 00:00
  storage: Array<ItemStack | null>;
  plots: Record<string, PlotState>;
  decor: Record<string, string | null>;
  lastTalkDay: Record<string, number>;
  skills: Record<SkillId, number>;
  doors: Record<string, boolean>; // v3: true = open
  containers: Record<string, Array<ItemStack | null>>; // v3
  pickedUp: string[]; // v3
  pendingCrime: PendingCrime | null; // v3
  talkLog: TalkLogEntry[]; // v3: recent conversation lines (newest last, capped)
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  graphicsQuality: "low" | "medium" | "high";
  textScale: number;
  fov: number;
  showIntro: boolean;
  /** Per-action key codes (see Input.BINDINGS for defaults). */
  keyBindings: Record<string, string[]>;
  dialogueBackdrop: number; // 0.4-1 opacity of the dialogue box
  typewriter: boolean; // reveal dialogue text gradually
  /** Screen-space ambient occlusion (GTAO). Re-renders the scene's normals, so it is off by default. */
  ambientOcclusion: boolean;
  showTargetRing: boolean;
}

export interface DoorDefinition {
  id: string;
  placementId: string;
  node: string; // DOOR_<node> in the placement's GLB
  label: string;
  /** Door cannot be opened while these hold (e.g. the granary at night). */
  lockedWhen?: Condition[];
  lockedReason?: string;
}

export interface ContainerDefinition {
  id: string;
  placementId: string;
  label: string;
  /** null = anyone may take from it; otherwise taking in view of others is theft. */
  ownerNpcId: string | null;
  initial: ItemStack[];
  slots: number;
  locationId: string;
}

export interface PickupDefinition {
  id: string;
  placementId: string;
  itemId: string;
  quantity: number;
  label: string;
  locationId: string;
  conditions: Condition[];
}

export interface TopicAnswer {
  /** npc id, "group:<group>" or "default" */
  who: string;
  when?: Condition[];
  lines: string[];
  effects?: Effect[];
}

export interface TopicDefinition {
  id: string;
  label: string;
  conditions: Condition[];
  answers: TopicAnswer[];
}

export type BarkTrigger = "greet" | "bump" | "rain" | "witness" | "festival" | "admire" | "missing";

export interface BarkDefinition {
  id: string;
  /** npc id, "group:<group>" or "any" */
  who: string;
  trigger: BarkTrigger;
  conditions: Condition[];
  lines: string[];
  priority: number;
}

export interface PendingCrime {
  containerId: string;
  itemId: string;
  quantity: number;
  witnessId: string;
  day: number;
}

export interface TalkLogEntry {
  npcId: string;
  text: string;
  day: number;
  minute: number;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; reason: string };
