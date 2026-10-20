/**
 * Temple Visit rules (GAME_DESIGN.md "Moms at Temples"), as pure data and functions so they are unit-tested
 * without a renderer. The 3D stages call `act()` when the player does something; nothing else changes a score.
 */

export type Category = "devotion" | "hustle" | "social" | "penalty";
export type StageId = "home" | "arrival" | "queue" | "rituals" | "darshan" | "exit" | "steps";

export interface VisitAction {
  id: string;
  stage: StageId;
  label: string;
  points: number;
  category: Category;
  /** extra category tags that some moms boost (Instagram Mom: photo / gopuram) */
  tags?: Array<"photo" | "gopuram">;
  /** Blessings added (devotional actions only) */
  blessings?: number;
  /** Stress added (positive) or drained (negative) */
  stress?: number;
  /** may be scored more than once per run (pradakshina rounds, lamps) */
  repeatable?: boolean;
}

// GAME_DESIGN.md §4: starting point values. Blessings and Stress amounts are this implementation's tuning
// (the design names which actions fill which meter, not by how much).
export const ACTIONS: VisitAction[] = [
  // Stage 1: getting ready (home)
  { id: "wake_early", stage: "home", label: "Wake up before 5 AM", points: 10, category: "devotion", blessings: 4 },
  { id: "pack_bag", stage: "home", label: "Pack the temple bag", points: 15, category: "devotion", blessings: 3 },
  { id: "family_pattu", stage: "home", label: "Whole family in matching pattu", points: 20, category: "social" },
  { id: "remember_tithi", stage: "home", label: "Remember today's tithi", points: 10, category: "devotion", blessings: 3 },
  { id: "forgot_coconut", stage: "home", label: "Forgot the coconut", points: -10, category: "penalty", stress: 6 },
  // Stage 2: arrival and chappals
  { id: "parking_close", stage: "arrival", label: "Parked within 100 m", points: 15, category: "hustle" },
  { id: "chappals_car", stage: "arrival", label: "Chappals left in the auto", points: 10, category: "hustle" },
  { id: "chappals_bush", stage: "arrival", label: "Chappals hidden in a secret bush", points: 25, category: "hustle" },
  { id: "chappals_stand", stage: "arrival", label: "Paid the chappal stand", points: 5, category: "devotion", blessings: 2 },
  { id: "side_gate", stage: "arrival", label: "Talked the guard into the side gate", points: 30, category: "social" },
  // Stage 3: the queue
  { id: "right_queue", stage: "queue", label: "Picked the right queue", points: 20, category: "hustle" },
  { id: "aunty_chat", stage: "queue", label: "Chatted with the aunty, advanced two spots", points: 15, category: "social" },
  { id: "kid_holds", stage: "queue", label: "Sent a kid ahead to hold the place", points: 20, category: "hustle" },
  { id: "relative_merge", stage: "queue", label: "Spotted a long-lost relative, merged families", points: 30, category: "social" },
  { id: "cutter_calm", stage: "queue", label: "Line cutter: stayed calm", points: 10, category: "devotion", blessings: 6, stress: -4 },
  { id: "cutter_scold", stage: "queue", label: "Line cutter: scolded in full eye contact", points: 25, category: "hustle", stress: 10 },
  { id: "prasadam_shortcut", stage: "queue", label: "Shortcut through the prasadam counter", points: 40, category: "hustle", stress: 4 },
  { id: "child_wandered", stage: "queue", label: "Child wandered off", points: -15, category: "penalty", stress: 15 },
  { id: "queue_patience", stage: "queue", label: "Prayed patiently in the queue", points: 5, category: "devotion", blessings: 3, stress: -3, repeatable: true },
  // Stage 4: rituals
  { id: "coconut_clean", stage: "rituals", label: "Broke the coconut cleanly in one shot", points: 20, category: "devotion", blessings: 5 },
  { id: "coconut_rolled", stage: "rituals", label: "Coconut rolled under the railing", points: -10, category: "penalty", stress: 8 },
  { id: "lamps_right", stage: "rituals", label: "Lit the right number of lamps", points: 15, category: "devotion", blessings: 8 },
  { id: "pradakshina_round", stage: "rituals", label: "Pradakshina round", points: 5, category: "devotion", blessings: 2, stress: -3, repeatable: true },
  { id: "pradakshina_9", stage: "rituals", label: "Pradakshina combo: 9 rounds", points: 30, category: "devotion", blessings: 10 },
  { id: "pradakshina_108", stage: "rituals", label: "Pradakshina combo: 108 rounds", points: 500, category: "devotion", blessings: 40 },
  { id: "sloka_right", stage: "rituals", label: "Chanted the correct sloka", points: 20, category: "devotion", blessings: 8 },
  { id: "vibhuti_family", stage: "rituals", label: "Vibhuti for the whole family in 10 s", points: 15, category: "social" },
  { id: "archana", stage: "rituals", label: "Archana with nakshatra and gotra, no pausing", points: 25, category: "devotion", blessings: 8 },
  // Stage 5: darshan
  { id: "darshan_full", stage: "darshan", label: "Full 5-second darshan", points: 50, category: "devotion", blessings: 15 },
  { id: "darshan_pushed", stage: "darshan", label: "Pushed before the darshan", points: -15, category: "penalty", stress: 12 },
  { id: "extra_prasadam", stage: "darshan", label: "Asked the priest for extra prasadam", points: 20, category: "social" },
  { id: "special_tulsi", stage: "darshan", label: "Received the special tulsi", points: 30, category: "devotion", blessings: 8 },
  { id: "pray_family", stage: "darshan", label: "Prayed for every family member, even the one abroad", points: 25, category: "devotion", blessings: 10 },
  // Stage 6: exit and social
  { id: "chappals_found", stage: "exit", label: "Found the chappals where you left them", points: 10, category: "hustle" },
  { id: "chappals_missing", stage: "exit", label: "Chappals missing", points: -30, category: "penalty", stress: 18 },
  { id: "chappals_better", stage: "exit", label: "Chappals missing, but found a better pair", points: 15, category: "hustle" },
  { id: "prasadam_neighbours", stage: "exit", label: "Bought prasadam for every neighbour", points: 20, category: "social" },
  { id: "gopuram_photo", stage: "exit", label: "Family photo at the gopuram, nobody blinking", points: 25, category: "social", tags: ["photo", "gopuram"] },
  { id: "gossip", stage: "exit", label: "Full gossip exchange", points: 30, category: "social" },
  { id: "annadanam", stage: "exit", label: "Kids finished the annadanam meal", points: 20, category: "social" },
  // Hill temple extra stage
  { id: "steps_climbed", stage: "steps", label: "Climbed the hill steps", points: 20, category: "devotion", blessings: 10, stress: 10 },
];
export const ACTION_BY_ID = new Map(ACTIONS.map((a) => [a.id, a]));

export interface MomDef {
  id: string;
  name: string;
  passive: string;
  mult: Partial<Record<Category | "photo", number>>;
  stressRate: number; // multiplier on Stress gained
  blessingsRate: number; // multiplier on Blessings gained
  freeMerges: number; // queue merges that cost nothing (Social Mom)
  laneSpeed: number; // queue lane-switch speed multiplier (Paati is slower)
  cost: number; // Kumkum to unlock (0 = starter)
  saree: string; // default saree colour (hex)
}

export const MOMS: MomDef[] = [
  { id: "devotional", name: "Devotional Mom", passive: "Devotion actions +25% points", mult: { devotion: 1.25 }, stressRate: 1, blessingsRate: 1, freeMerges: 0, laneSpeed: 1, cost: 0, saree: "#b3261e" },
  { id: "hustle", name: "Hustle Mom", passive: "Hustle actions +25%, Stress fills 20% faster", mult: { hustle: 1.25 }, stressRate: 1.2, blessingsRate: 1, freeMerges: 0, laneSpeed: 1.15, cost: 120, saree: "#1f5aa6" },
  { id: "social", name: "Social Mom", passive: "Social actions +25%, one free queue merge per run", mult: { social: 1.25 }, stressRate: 1, blessingsRate: 1, freeMerges: 1, laneSpeed: 1, cost: 120, saree: "#2e7d4f" },
  { id: "instagram", name: "Instagram Mom", passive: "Photo and gopuram actions +50%, Blessings fill slower", mult: { photo: 1.5 }, stressRate: 1, blessingsRate: 0.8, freeMerges: 0, laneSpeed: 1, cost: 200, saree: "#c2185b" },
  { id: "paati", name: "Paati (Grandma)", passive: "Stress fills 50% slower, moves one lane slower in the queue", mult: {}, stressRate: 0.5, blessingsRate: 1, freeMerges: 0, laneSpeed: 0.7, cost: 250, saree: "#8d6e63" },
];
export const MOM_BY_ID = new Map(MOMS.map((m) => [m.id, m]));

export interface TempleDef {
  id: string;
  name: string;
  crowd: "low" | "medium" | "high";
  rule: string;
  queueTiers: Array<"free" | "20" | "100">;
  /** probability that the chappals are gone at the exit, by where they were left */
  theftRisk: { car: number; bush: number; stand: number; side: number };
  extraStages: StageId[];
  cost: number;
}

export const TEMPLES: TempleDef[] = [
  { id: "city", name: "Big city temple", crowd: "high", rule: "Three queue tiers, chappal theft risk high", queueTiers: ["free", "20", "100"], theftRisk: { car: 0.1, bush: 0.45, stand: 0.03, side: 0.25 }, extraStages: [], cost: 0 },
  { id: "neighbourhood", name: "Neighbourhood temple", crowd: "low", rule: "Short queue, no special darshan line", queueTiers: ["free"], theftRisk: { car: 0.03, bush: 0.12, stand: 0.01, side: 0.08 }, extraStages: [], cost: 100 },
  { id: "hill", name: "Hill temple", crowd: "medium", rule: "Extra stage: climbing the steps (Stress and Blessings rise)", queueTiers: ["free", "20"], theftRisk: { car: 0.08, bush: 0.25, stand: 0.02, side: 0.15 }, extraStages: ["steps"], cost: 180 },
];
export const TEMPLE_BY_ID = new Map(TEMPLES.map((t) => [t.id, t]));

export const SAREES: Array<{ id: string; name: string; color: string; cost: number }> = [
  { id: "default", name: "Your mom's own", color: "", cost: 0 },
  { id: "kanjivaram_gold", name: "Kanjivaram gold", color: "#c9962b", cost: 60 },
  { id: "peacock", name: "Peacock blue", color: "#126e82", cost: 60 },
  { id: "mango", name: "Mango yellow", color: "#e8a317", cost: 80 },
  { id: "temple_red", name: "Temple-border red", color: "#9b111e", cost: 80 },
];

export interface LogEntry {
  actionId: string;
  points: number;
  combo: boolean;
}

export interface RunState {
  momId: string;
  templeId: string;
  festival: boolean;
  punya: number;
  blessings: number;
  stress: number;
  /** consecutive same-category streak (penalties break it) */
  streak: { category: Category | null; count: number };
  log: LogEntry[];
  done: string[];
  pradakshina: number;
  freeMergesLeft: number;
  /** where the chappals were left (asked about at the exit) */
  chappals: { method: "car" | "bush" | "stand" | "side" | null; spot: number | null };
  ended: null | "exit" | "stress";
  stage: StageId;
}

export function newRun(momId: string, templeId: string, festival: boolean): RunState {
  const mom = MOM_BY_ID.get(momId) ?? MOMS[0]!;
  return {
    momId: mom.id,
    templeId: TEMPLE_BY_ID.has(templeId) ? templeId : "city",
    festival,
    punya: 0,
    blessings: 0,
    stress: 0,
    streak: { category: null, count: 0 },
    log: [],
    done: [],
    pradakshina: 0,
    freeMergesLeft: mom.freeMerges,
    chappals: { method: null, spot: null },
    ended: null,
    stage: "home",
  };
}

export interface ActResult {
  ok: boolean;
  reason?: string;
  points: number;
  combo: boolean;
  blessings: number;
  stress: number;
  endedByStress: boolean;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/**
 * Score one action. Points: base x archetype multiplier (category, or photo tags) x festival (points and
 * penalties doubled) x combo (the fourth action after three of one category in a row is doubled).
 * Blessings rise only from devotional actions; Stress at 100 ends the run.
 */
export function act(run: RunState, actionId: string): ActResult {
  const a = ACTION_BY_ID.get(actionId);
  const fail = (reason: string): ActResult => ({ ok: false, reason, points: 0, combo: false, blessings: 0, stress: 0, endedByStress: false });
  if (!a) return fail("unknown action");
  if (run.ended) return fail("the visit is over");
  if (!a.repeatable && run.done.includes(a.id)) return fail("already done");
  const mom = MOM_BY_ID.get(run.momId)!;
  let mult = mom.mult[a.category] ?? 1;
  if (a.tags?.some((t) => t === "photo" || t === "gopuram") && mom.mult.photo) mult = Math.max(mult, mom.mult.photo);
  if (run.festival) mult *= 2;
  let combo = false;
  if (a.category === "penalty") run.streak = { category: null, count: 0 };
  else if (run.streak.category === a.category && run.streak.count >= 3) {
    combo = true;
    mult *= 2;
    run.streak = { category: a.category, count: 0 }; // the bonus is spent; a new streak starts after it
  } else if (run.streak.category === a.category) run.streak.count++;
  else run.streak = { category: a.category, count: 1 };
  const points = Math.round(a.points * mult);
  run.punya += points;
  const blessings = a.category === "devotion" && a.blessings ? a.blessings * mom.blessingsRate : 0;
  run.blessings = clamp(run.blessings + blessings, 0, 100);
  const rawStress = a.stress ?? 0;
  const stress = rawStress > 0 ? rawStress * mom.stressRate * (run.festival ? 2 : 1) : rawStress;
  run.stress = clamp(run.stress + stress, 0, 100);
  run.log.push({ actionId: a.id, points, combo });
  if (!a.repeatable) run.done.push(a.id);
  if (a.id === "pradakshina_round") run.pradakshina++;
  const endedByStress = run.stress >= 100;
  if (endedByStress) run.ended = "stress";
  return { ok: true, points, combo, blessings, stress, endedByStress };
}

/** Stress outside of actions (a bad fall, a long wait): applies the mom's stress rate and can end the run. */
export function addStress(run: RunState, amount: number): boolean {
  if (run.ended) return false;
  const mom = MOM_BY_ID.get(run.momId)!;
  run.stress = clamp(run.stress + (amount > 0 ? amount * mom.stressRate : amount), 0, 100);
  if (run.stress >= 100) run.ended = "stress";
  return run.ended === "stress";
}

/** Blessings multiplier table (§3.2). */
export function blessingsMultiplier(b: number): number {
  if (b >= 100) return 3;
  if (b >= 75) return 2;
  if (b >= 50) return 1.5;
  if (b >= 25) return 1.25;
  return 1;
}

export interface FinalScore {
  punya: number;
  multiplier: number;
  /** §2.4 "Stress caps it": the score is capped at (1 - stress/200) of its value, so a frazzled visit keeps
   * at least half (interpretation: the doc names the effect, not the formula). */
  stressCap: number;
  total: number;
  kumkum: number;
  fullyBlessed: boolean;
}

export function finalScore(run: RunState): FinalScore {
  const multiplier = blessingsMultiplier(run.blessings);
  const stressCap = 1 - run.stress / 200;
  const total = Math.max(0, Math.round(Math.max(0, run.punya) * multiplier * stressCap));
  return { punya: run.punya, multiplier, stressCap, total, kumkum: Math.floor(total / 10), fullyBlessed: run.blessings >= 100 };
}

// --------------------------------------------------------------------------- progression (§7)
export interface Profile {
  version: 1;
  kumkum: number;
  unlockedMoms: string[];
  unlockedTemples: string[];
  unlockedSarees: string[];
  sareeChoice: Record<string, string>; // momId -> saree id
  personalBest: Record<string, number>; // templeId -> best total
  badges: string[];
  runs: number;
  /** consecutive runs that ended with the chappals found */
  chappalStreak: number;
  missions: { day: string; ids: string[]; done: string[] };
}

export function newProfile(): Profile {
  return {
    version: 1,
    kumkum: 0,
    unlockedMoms: ["devotional"],
    unlockedTemples: ["city"],
    unlockedSarees: ["default"],
    sareeChoice: {},
    personalBest: {},
    badges: [],
    runs: 0,
    chappalStreak: 0,
    missions: { day: "", ids: [], done: [] },
  };
}

export const BADGES: Array<{ id: string; name: string; how: string }> = [
  { id: "fully_blessed", name: "Fully Blessed", how: "Finish a visit with the Blessings meter full" },
  { id: "queue_ninja", name: "Queue Ninja", how: "Get through the queue using three hustle moves and no penalty" },
  { id: "chappal_keeper", name: "Chappal Keeper", how: "Find your chappals where you left them" },
  { id: "gossip_queen", name: "Gossip Queen", how: "Complete a full gossip exchange" },
  { id: "coconut_sniper", name: "Coconut Sniper", how: "Break the coconut cleanly in one shot" },
];

export interface MissionDef {
  id: string;
  text: string;
  reward: number;
  check: (run: RunState, score: FinalScore, profile: Profile) => boolean;
}

export const MISSIONS: MissionDef[] = [
  { id: "no_hustle_500", text: "Score 500 without hustle actions", reward: 40, check: (r, s) => s.total >= 500 && !r.log.some((l) => ACTION_BY_ID.get(l.actionId)?.category === "hustle") },
  { id: "visit_hill", text: "Visit the hill temple", reward: 30, check: (r) => r.templeId === "hill" && r.ended === "exit" },
  { id: "chappals_3", text: "Find your chappals three runs in a row", reward: 50, check: (_r, _s, p) => p.chappalStreak >= 3 },
  { id: "nine_rounds", text: "Walk 9 rounds of pradakshina in one visit", reward: 30, check: (r) => r.pradakshina >= 9 },
  { id: "calm_visit", text: "Finish a visit with Stress under 25", reward: 30, check: (r) => r.ended === "exit" && r.stress < 25 },
  { id: "combo_twice", text: "Trigger two combos in one visit", reward: 35, check: (r) => r.log.filter((l) => l.combo).length >= 2 },
];

/** Three missions per calendar day, chosen deterministically from the date. */
export function missionsFor(day: string): string[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ids = MISSIONS.map((m) => m.id);
  const out: string[] = [];
  while (out.length < 3) {
    h = (h * 1103515245 + 12345) >>> 0;
    const id = ids[h % ids.length]!;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Badges a finished run earns. */
export function runBadges(run: RunState, score: FinalScore): string[] {
  const out: string[] = [];
  if (score.fullyBlessed) out.push("fully_blessed");
  const queue = run.log.filter((l) => ACTION_BY_ID.get(l.actionId)?.stage === "queue");
  if (queue.filter((l) => ACTION_BY_ID.get(l.actionId)?.category === "hustle").length >= 3 && !queue.some((l) => ACTION_BY_ID.get(l.actionId)?.category === "penalty")) out.push("queue_ninja");
  if (run.done.includes("chappals_found")) out.push("chappal_keeper");
  if (run.done.includes("gossip")) out.push("gossip_queen");
  if (run.done.includes("coconut_clean")) out.push("coconut_sniper");
  return out;
}

export interface RunSummary {
  score: FinalScore;
  newBest: boolean;
  badges: string[];
  missionsCompleted: string[];
  kumkumEarned: number;
}

/** Fold a finished run into the profile: Kumkum, personal best, badges, chappal streak, daily missions. */
export function settleRun(profile: Profile, run: RunState, day: string): RunSummary {
  const score = finalScore(run);
  const p = profile;
  p.runs++;
  if (p.missions.day !== day) p.missions = { day, ids: missionsFor(day), done: [] };
  p.chappalStreak = run.done.includes("chappals_found") ? p.chappalStreak + 1 : 0;
  const prev = p.personalBest[run.templeId] ?? 0;
  const newBest = score.total > prev;
  if (newBest) p.personalBest[run.templeId] = score.total;
  const badges = runBadges(run, score).filter((b) => !p.badges.includes(b));
  p.badges.push(...badges);
  let kumkum = score.kumkum;
  const missionsCompleted: string[] = [];
  for (const id of p.missions.ids) {
    if (p.missions.done.includes(id)) continue;
    const m = MISSIONS.find((x) => x.id === id);
    if (m && m.check(run, score, p)) {
      p.missions.done.push(id);
      missionsCompleted.push(id);
      kumkum += m.reward;
    }
  }
  p.kumkum += kumkum;
  return { score, newBest, badges, missionsCompleted, kumkumEarned: kumkum };
}

/** Spend Kumkum on an unlock; false if unaffordable or already owned. */
export function unlock(profile: Profile, kind: "mom" | "temple" | "saree", id: string): boolean {
  const list = kind === "mom" ? profile.unlockedMoms : kind === "temple" ? profile.unlockedTemples : profile.unlockedSarees;
  const cost = kind === "mom" ? MOM_BY_ID.get(id)?.cost : kind === "temple" ? TEMPLE_BY_ID.get(id)?.cost : SAREES.find((s) => s.id === id)?.cost;
  if (cost === undefined || list.includes(id) || profile.kumkum < cost) return false;
  profile.kumkum -= cost;
  list.push(id);
  return true;
}

/** Festival day: deterministic from the calendar date (about one day in six). */
export function isFestivalDay(day: string): boolean {
  let h = 7;
  for (const ch of day) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h % 6 === 0;
}
