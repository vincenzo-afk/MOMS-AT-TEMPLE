import * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import type { AssetLibrary } from "../core/AssetLibrary";
import type { BarkTrigger, NpcDefinition, ScheduleEntry } from "../core/types";
import { CharacterAnimator, type LoopAction, type OneShot } from "../player/CharacterAnimator";
import { FaceController, findFace } from "../player/Face";
import { ANCHORS, NAV_EDGES, NAV_NODES } from "../../data/level";
import { SHELTER_ANCHORS } from "../../data/world";
import { evaluateAll } from "../world/conditions";
import { isRaining } from "../world/weather";
import type { CollisionWorld } from "../world/CollisionWorld";

const WALK_SPEED = 1.35;
const HURRY_SPEED = 2.7; // the watchman closing in, villagers running for shelter
const NPC_RADIUS = 0.28;
const SEPARATION = 0.85;
const AWARE_DIST = 15; // full simulation (collision, head look, barks) inside this radius
const MID_DIST = 55; // reduced update rate
const FAR_DIST = 110; // animation frozen, movement only

/** Role-appropriate loops for scheduled activities; per-NPC overrides first. */
const ACTIVITY_CLIP: Record<ScheduleEntry["activity"], LoopAction | null> = {
  talk: "talk_idle",
  work: "talk_listen",
  garden: "repair_channel",
  craft: "craft_at_station",
  trade: "trade_counter",
  sit: "sit_idle",
  rest: "sit_idle", // a seated rest (on the ground where the anchor has no seat)
  home: null,
  festival: "talk_idle",
  patrol: null,
  puja: "pray_idle",
};
const NPC_OVERRIDES: Record<string, Partial<Record<ScheduleEntry["activity"], LoopAction | null>>> = {
  npc_ponnan: { work: "read_record", rest: null, talk: "talk_explain" },
  npc_amudha: { garden: "garden_kneel" },
  npc_villager_lakshmi: { work: "sweep" },
  npc_meena: { craft: "make_garland" },
  npc_villager_pandi: { rest: "rest_idle" },
  npc_villager_siva: { rest: "rest_idle", work: "harvest_plant" },
  npc_villager_arul: { work: "place_object" },
};
/** Anchors that already have a roof over them (no need to run for shelter). */
const COVERED = new Set(["anc_workshop", "anc_workshop_cover", "anc_market", "anc_weaver", "anc_seating", "anc_bazaar_1", "anc_bazaar_2", "anc_bazaar_3", "anc_bazaar_4", "anc_field_hut", "anc_field_hut_rest", ...SHELTER_ANCHORS]);

export type NpcMode = "activity" | "walking" | "talking" | "reacting" | "pursuing";

export interface NpcRuntime {
  def: NpcDefinition;
  object: THREE.Group;
  animator: CharacterAnimator;
  face: FaceController | null;
  head: THREE.Object3D | null;
  path: THREE.Vector3[];
  anchorId: string;
  activity: ScheduleEntry["activity"];
  mode: NpcMode;
  speed: number;
  present: boolean;
  /** Inside a house for the night (not rendered, not interactable). */
  indoors: boolean;
  sheltering: boolean;
  lookYaw: number;
  lastGreet: number;
  lastBark: number;
  reactUntil: number;
  stuck: { time: number; from: THREE.Vector3; tries: number };
  tickAccum: number;
  frame: number;
}

export function scheduleAt(def: NpcDefinition, hour: number, session?: GameSession): ScheduleEntry {
  const inRange = (e: ScheduleEntry) => (hour >= e.fromHour && hour < e.toHour) || (hour + 24 >= e.fromHour && hour + 24 < e.toHour);
  for (const e of def.schedule) {
    if (!inRange(e)) continue;
    if (e.when && !(session && evaluateAll(e.when, session.state, session.defs))) continue;
    return e;
  }
  return def.schedule.find((e) => !e.when) ?? def.schedule[0]!;
}

/** Shortest route between two points via the navigation graph (Dijkstra over a few dozen nodes). */
export function route(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const names = Object.keys(NAV_NODES);
  const pos = (n: string) => new THREE.Vector3(NAV_NODES[n]![0], 0, NAV_NODES[n]![1]);
  const nearest = (p: THREE.Vector3) => names.reduce((a, b) => (pos(a).distanceToSquared(p) < pos(b).distanceToSquared(p) ? a : b));
  const start = nearest(from);
  const goal = nearest(to);
  if (from.distanceTo(to) < pos(start).distanceTo(from) + pos(goal).distanceTo(to)) return [to.clone()];
  const dist = new Map<string, number>(names.map((n) => [n, Infinity]));
  const prev = new Map<string, string>();
  dist.set(start, 0);
  const open = new Set(names);
  while (open.size) {
    const u = [...open].reduce((a, b) => (dist.get(a)! < dist.get(b)! ? a : b));
    open.delete(u);
    if (u === goal || dist.get(u) === Infinity) break;
    for (const [a, b] of NAV_EDGES) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || !open.has(v)) continue;
      const d = dist.get(u)! + pos(u).distanceTo(pos(v));
      if (d < dist.get(v)!) {
        dist.set(v, d);
        prev.set(v, u);
      }
    }
  }
  const chain: string[] = [];
  for (let n: string | undefined = goal; n; n = prev.get(n)) chain.unshift(n);
  if (chain[0] !== start) return [to.clone()];
  return [...chain.map(pos), to.clone()];
}

export interface NpcEvents {
  bark(npcId: string, text: string): void;
  /** The watchman reached the player while a crime is pending. */
  confront(npcId: string): void;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class NpcSystem {
  readonly npcs = new Map<string, NpcRuntime>();
  readonly group = new THREE.Group();
  private clock = 0;
  private lastGlobalBark = -10;
  private playerPos = new THREE.Vector3();
  private playerSpeed = 0;
  private playerBusy = false;
  private raining = false;
  /** Statistics for the performance overlay and tests. */
  readonly stats = { full: 0, mid: 0, far: 0, repaths: 0, unstuck: 0 };

  constructor(
    private session: GameSession,
    assets: AssetLibrary,
    private collision: CollisionWorld,
    sourceModelId: string,
    private events: NpcEvents,
  ) {
    this.group.name = "NPCs";
    for (const def of session.defs.npcs.values()) {
      const model = assets.instantiate(def.appearance.model);
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.frustumCulled = false; // skinned bounds are unreliable when animated
        }
      });
      const own = assets.clips(def.appearance.model);
      const clips = own.length ? own : assets.retargetClips(sourceModelId, def.appearance.model);
      const animator = new CharacterAnimator(model, clips);
      animator.fidgets = false; // schedules drive NPC idles
      const faceBones = findFace(model);
      const face = faceBones ? new FaceController(faceBones, model) : null; // created in the bind pose
      const obj = new THREE.Group();
      obj.name = def.id;
      obj.add(model);
      this.group.add(obj);
      this.npcs.set(def.id, {
        def,
        object: obj,
        animator,
        face,
        head: model.getObjectByName("head") ?? null,
        path: [],
        anchorId: "",
        activity: "rest",
        mode: "activity",
        speed: 0,
        present: true,
        indoors: false,
        sheltering: false,
        lookYaw: 0,
        lastGreet: -999,
        lastBark: -999,
        reactUntil: 0,
        stuck: { time: 0, from: new THREE.Vector3(), tries: 0 },
        tickAccum: 0,
        frame: Math.floor(Math.random() * 3),
      });
    }
    this.snapToSchedule();
  }

  // ------------------------------------------------------------------ schedule resolution
  /** The scheduled entry, redirected to the nearest shelter when it is raining on an uncovered spot. */
  private target(rt: NpcRuntime): { anchorId: string; activity: ScheduleEntry["activity"]; sheltering: boolean } {
    const e = scheduleAt(rt.def, this.session.hourOfDay, this.session);
    if (this.raining && !COVERED.has(e.anchorId) && e.activity !== "home" && e.activity !== "festival" && rt.def.id !== "npc_kaaval") {
      const a = ANCHORS[e.anchorId]!.pos;
      const best = SHELTER_ANCHORS.reduce((b, id) => (dist2(ANCHORS[id]!.pos, a) < dist2(ANCHORS[b]!.pos, a) ? id : b));
      return { anchorId: best, activity: "talk", sheltering: true };
    }
    return { anchorId: e.anchorId, activity: e.activity, sheltering: false };
  }

  /** Place every NPC directly at its current scheduled anchor (new game / load). */
  snapToSchedule(): void {
    this.raining = isRaining(this.session.state.worldMinutes, !!this.session.state.flags.festival_held);
    for (const rt of this.npcs.values()) {
      const t = this.target(rt);
      const a = ANCHORS[t.anchorId]!;
      rt.object.position.set(...a.pos);
      rt.object.rotation.y = (a.faceY * Math.PI) / 180;
      rt.anchorId = t.anchorId;
      rt.activity = t.activity;
      rt.sheltering = t.sheltering;
      rt.path = [];
      rt.mode = "activity";
      rt.indoors = false;
      this.updatePresence(rt);
      this.startActivity(rt);
    }
  }

  private updatePresence(rt: NpcRuntime): void {
    rt.present = this.session.isNpcPresent(rt.def.id) && !this.suppressed.has(rt.def.id);
    const h = this.session.hourOfDay;
    const night = h >= 21 || h < 5;
    rt.indoors = rt.present && rt.activity === "home" && night && rt.mode === "activity" && !rt.path.length;
    rt.object.visible = rt.present && !rt.indoors;
  }

  /** Visible, awake and in the world (used by interaction and witness checks). */
  /** A named NPC speaks a contextual line now (trespass warnings, the puja bell), if present and not busy. */
  say(npcId: string, trigger: BarkTrigger): boolean {
    const rt = this.npcs.get(npcId);
    if (!rt || !rt.present || rt.indoors || rt.mode === "talking") return false;
    return this.bark(rt, trigger, true);
  }

  private sprintRemark = new Map<string, number>();
  private lookPoint = new THREE.Vector3();

  /** NPCs hidden by a mode (the Temple Visit brings its own priest). */
  readonly suppressed = new Set<string>();

  isAvailable(npcId: string): boolean {
    const rt = this.npcs.get(npcId);
    return !!rt && rt.present && !rt.indoors;
  }

  private clipFor(rt: NpcRuntime): LoopAction | null {
    const o = NPC_OVERRIDES[rt.def.id];
    let clip = o && rt.activity in o ? o[rt.activity]! : ACTIVITY_CLIP[rt.activity];
    if (clip === "sit_idle" && (ANCHORS[rt.anchorId]?.pos[1] ?? 0) < 0.3) clip = "rest_idle"; // no seat: sit on the ground
    return clip;
  }

  private startActivity(rt: NpcRuntime): void {
    rt.mode = "activity";
    const clip = this.clipFor(rt);
    if (clip && rt.animator.has(clip)) rt.animator.play(clip, { once: false });
    else if (rt.animator.busy) rt.animator.stopAction();
  }

  private playOnce(rt: NpcRuntime, clip: OneShot, then?: () => void): void {
    rt.animator.play(clip, { once: true, onDone: () => (then ? then() : rt.mode === "activity" && this.startActivity(rt)) });
  }

  // ------------------------------------------------------------------ barks
  private bark(rt: NpcRuntime, trigger: BarkTrigger, force = false): boolean {
    if (!force && (this.clock - rt.lastBark < 20 || this.clock - this.lastGlobalBark < 3)) return false;
    const group = rt.def.group ? `group:${rt.def.group}` : "";
    const options = this.session.defs.barks
      .filter((b) => b.trigger === trigger && (b.who === rt.def.id || b.who === "any" || (group && b.who === group)))
      .filter((b) => evaluateAll(b.conditions, this.session.state, this.session.defs))
      .sort((a, b) => b.priority - a.priority);
    const b = options[0];
    if (!b) return false;
    rt.lastBark = this.clock;
    this.lastGlobalBark = this.clock;
    this.events.bark(rt.def.id, b.lines[Math.floor(Math.random() * b.lines.length)]!);
    return true;
  }

  // ------------------------------------------------------------------ conversations & reactions
  beginTalk(npcId: string, playerPos: THREE.Vector3): void {
    const rt = this.npcs.get(npcId);
    if (!rt) return;
    rt.mode = "talking";
    rt.path = []; // conversation interrupts movement; the route is recomputed afterwards
    rt.object.rotation.y = Math.atan2(playerPos.x - rt.object.position.x, playerPos.z - rt.object.position.z);
    rt.lastGreet = this.clock;
    this.playOnce(rt, "greet", () => rt.mode === "talking" && this.playOnce(rt, "talk_gesture", () => rt.mode === "talking" && rt.animator.play("talk_idle", { once: false })));
  }

  endTalk(npcId: string): void {
    const rt = this.npcs.get(npcId);
    if (!rt || rt.mode !== "talking") return;
    rt.mode = "activity";
    const t = this.target(rt);
    if (t.anchorId !== rt.anchorId || rt.object.position.distanceTo(new THREE.Vector3(...ANCHORS[t.anchorId]!.pos)) > 0.6) {
      this.goTo(rt, t.anchorId, t.activity, t.sheltering); // resume the interrupted errand
    } else {
      rt.object.rotation.y = (ANCHORS[rt.anchorId]!.faceY * Math.PI) / 180;
      this.startActivity(rt);
    }
  }

  /** Witnesses of a theft turn to the player, call out and gesture; the watchman starts pursuing. */
  reactToCrime(witnessIds: string[]): void {
    for (const id of witnessIds) {
      const rt = this.npcs.get(id);
      if (!rt || rt.mode === "talking") continue;
      rt.mode = "reacting";
      rt.reactUntil = this.clock + 3.5;
      rt.path = [];
      rt.object.rotation.y = Math.atan2(this.playerPos.x - rt.object.position.x, this.playerPos.z - rt.object.position.z);
      this.bark(rt, "witness", true);
      this.playOnce(rt, "talk_gesture", () => undefined);
    }
  }

  /** NPC ids that can currently see `pos` (distance + line of sight; asleep or absent NPCs see nothing). */
  witnessesOf(pos: THREE.Vector3): string[] {
    const out: string[] = [];
    for (const rt of this.npcs.values()) {
      if (!rt.present || rt.indoors) continue;
      const range = rt.def.id === "npc_kaaval" ? 22 : 14;
      const d = rt.object.position.distanceTo(pos);
      if (d > range) continue;
      tmpA.copy(rt.object.position).add(new THREE.Vector3(0, 1.55, 0));
      tmpB.copy(pos).add(new THREE.Vector3(0, 1.2, 0)).sub(tmpA);
      const len = tmpB.length();
      const hit = this.collision.raycast(tmpA, tmpB.normalize(), len);
      if (hit >= len - 0.4) out.push(rt.def.id);
    }
    return out;
  }

  private goTo(rt: NpcRuntime, anchorId: string, activity: ScheduleEntry["activity"], sheltering: boolean): void {
    const wasSheltering = rt.sheltering;
    rt.anchorId = anchorId;
    rt.activity = activity;
    rt.sheltering = sheltering;
    rt.path = route(rt.object.position, new THREE.Vector3(...ANCHORS[anchorId]!.pos));
    rt.mode = "walking";
    rt.stuck = { time: 0, from: rt.object.position.clone(), tries: 0 };
    if (rt.animator.busy) rt.animator.stopAction();
    if (sheltering && !wasSheltering) this.bark(rt, "rain");
  }

  // ------------------------------------------------------------------ frame
  update(dt: number, player: { position: THREE.Vector3; speed: number; busy: boolean }): void {
    this.clock += dt;
    this.playerPos.copy(player.position);
    this.playerSpeed = player.speed;
    this.playerBusy = player.busy;
    this.raining = isRaining(this.session.state.worldMinutes, !!this.session.state.flags.festival_held);
    this.stats.full = this.stats.mid = this.stats.far = 0;
    const crime = this.session.state.pendingCrime;

    for (const rt of this.npcs.values()) {
      const wasPresent = rt.present;
      this.updatePresence(rt);
      if (!rt.present) continue;
      if (!wasPresent) {
        const t = this.target(rt);
        rt.object.position.set(...ANCHORS[t.anchorId]!.pos);
        rt.anchorId = t.anchorId;
        rt.activity = t.activity;
        this.startActivity(rt);
      }
      const dPlayer = rt.object.position.distanceTo(this.playerPos);
      const tier = dPlayer < AWARE_DIST ? 0 : dPlayer < MID_DIST ? 1 : dPlayer < FAR_DIST ? 1 : 2;
      if (tier === 0) this.stats.full++;
      else if (dPlayer < FAR_DIST) this.stats.mid++;
      else this.stats.far++;

      // --- decide what to do (priority: talking > pursuing > reacting > schedule)
      if (rt.def.id === "npc_kaaval" && crime && rt.mode !== "talking") {
        if (rt.mode !== "pursuing") {
          rt.mode = "pursuing";
          rt.path = route(rt.object.position, this.playerPos);
          if (rt.animator.busy) rt.animator.stopAction();
        }
        rt.stuck.time += 0; // pursuit re-plans below
        if (dPlayer < 2.2) {
          rt.path = [];
          rt.object.rotation.y = Math.atan2(this.playerPos.x - rt.object.position.x, this.playerPos.z - rt.object.position.z);
          if (!this.playerBusy) this.events.confront(rt.def.id);
        } else if (!rt.path.length || rt.path[rt.path.length - 1]!.distanceTo(this.playerPos) > 3) {
          rt.path = route(rt.object.position, this.playerPos);
        }
      } else if (rt.mode === "pursuing") {
        this.goTo(rt, this.target(rt).anchorId, this.target(rt).activity, false); // crime resolved: back to post
      } else if (rt.mode === "reacting") {
        if (this.clock > rt.reactUntil) this.endReaction(rt);
      } else if (rt.mode !== "talking") {
        const t = this.target(rt);
        if (t.anchorId !== rt.anchorId) this.goTo(rt, t.anchorId, t.activity, t.sheltering);
        else if (t.activity !== rt.activity && rt.mode === "activity") {
          rt.activity = t.activity;
          this.startActivity(rt);
        }
      }

      // --- movement
      let speed = 0;
      if (rt.path.length && rt.mode !== "talking" && rt.mode !== "reacting") speed = this.walk(rt, dt, tier, rt.mode === "pursuing" || rt.sheltering ? HURRY_SPEED : WALK_SPEED);
      rt.speed = speed;

      // --- awareness (only near the player)
      if (tier === 0) this.awareness(rt, dPlayer);

      // --- animation, at a reduced rate when far away
      rt.tickAccum += dt;
      rt.frame++;
      const every = tier === 0 ? 1 : dPlayer < MID_DIST ? 2 : 6;
      if (rt.frame % every === 0 || speed > 0) {
        const step = rt.tickAccum;
        rt.animator.update(step, speed);
        rt.tickAccum = 0;
        if (tier === 0) {
          this.applyLook(rt, dPlayer);
          // faces only where you can see them: blinking, gaze toward you nearby, the jaw while speaking
          rt.face?.update(step, dPlayer < 6 ? this.lookPoint.copy(this.playerPos).setY(this.playerPos.y + 1.55) : null, rt.mode === "talking");
        }
      }
    }
  }

  private endReaction(rt: NpcRuntime): void {
    rt.mode = "activity";
    const t = this.target(rt);
    if (t.anchorId !== rt.anchorId || rt.object.position.distanceTo(new THREE.Vector3(...ANCHORS[t.anchorId]!.pos)) > 0.6) this.goTo(rt, t.anchorId, t.activity, t.sheltering);
    else this.startActivity(rt);
  }

  /** Steering: head for the next waypoint, keep apart from people, slide along walls, recover when stuck. */
  private walk(rt: NpcRuntime, dt: number, tier: number, speedWanted: number): number {
    const p = rt.object.position;
    const next = rt.path[0]!;
    const dx = next.x - p.x;
    const dz = next.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < (rt.path.length > 1 ? 0.5 : 0.15)) {
      rt.path.shift();
      if (!rt.path.length && rt.mode !== "pursuing") {
        const a = ANCHORS[rt.anchorId]!;
        p.set(a.pos[0], p.y, a.pos[2]);
        rt.object.rotation.y = (a.faceY * Math.PI) / 180;
        this.startActivity(rt);
      }
      return 0;
    }
    let vx = dx / d;
    let vz = dz / d;
    if (tier === 0) {
      // separation from other characters (and the player)
      for (const o of this.npcs.values()) {
        if (o === rt || !o.present || o.indoors) continue;
        const ox = p.x - o.object.position.x;
        const oz = p.z - o.object.position.z;
        const od = Math.hypot(ox, oz);
        if (od > 0.01 && od < SEPARATION) {
          vx += (ox / od) * (SEPARATION - od) * 2.2;
          vz += (oz / od) * (SEPARATION - od) * 2.2;
        }
      }
      const px = p.x - this.playerPos.x;
      const pz = p.z - this.playerPos.z;
      const pd = Math.hypot(px, pz);
      if (pd > 0.01 && pd < 1.0 && rt.mode !== "pursuing") {
        vx += (px / pd) * (1.0 - pd) * 2.5;
        vz += (pz / pd) * (1.0 - pd) * 2.5;
      }
      const vl = Math.hypot(vx, vz) || 1;
      vx /= vl;
      vz /= vl;
    }
    const step = Math.min(d, speedWanted * dt);
    let nx = p.x + vx * step;
    let nz = p.z + vz * step;
    if (tier === 0) [nx, nz] = this.collision.resolve(nx, nz, p.y, NPC_RADIUS, 1.6);
    const moved = Math.hypot(nx - p.x, nz - p.z);
    p.x = nx;
    p.z = nz;
    p.y = this.collision.groundHeight(p.x, p.z, p.y + 0.3);
    const want = Math.atan2(vx, vz);
    let dy = want - rt.object.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    rt.object.rotation.y += dy * Math.min(1, dt * 6);

    // stuck detection: too little progress over 2 seconds
    rt.stuck.time += dt;
    if (rt.stuck.time > 2) {
      const progress = p.distanceTo(rt.stuck.from);
      if (progress < 0.5) {
        rt.stuck.tries++;
        this.stats.repaths++;
        if (rt.stuck.tries === 1) {
          rt.path = route(p, rt.path[rt.path.length - 1]!); // re-plan from where we are
        } else if (rt.stuck.tries === 2 && rt.path.length > 1) {
          rt.path.shift(); // skip the blocked waypoint
        } else if (rt.stuck.tries >= 3) {
          const w = rt.path[0]!;
          p.set(w.x, this.collision.groundHeight(w.x, w.z, w.y + 0.5), w.z); // last resort: step past the obstacle
          this.stats.unstuck++;
          rt.stuck.tries = 0;
        }
      } else rt.stuck.tries = 0;
      rt.stuck.time = 0;
      rt.stuck.from.copy(p);
    }
    return moved / Math.max(dt, 1e-4);
  }

  private awareness(rt: NpcRuntime, dPlayer: number): void {
    if (rt.mode === "talking" || rt.mode === "pursuing") return;
    // bumped by a running player
    if (dPlayer < 0.8 && this.playerSpeed > 3.2 && this.clock - rt.lastBark > 6) {
      if (this.bark(rt, "bump", true) && rt.mode === "activity" && !rt.animator.currentAction?.startsWith("sit")) this.playOnce(rt, "talk_gesture");
      return;
    }
    // a sprinting player brushing past: a word about it (no crime, just manners)
    if (dPlayer < 2.6 && this.playerSpeed > 5 && this.clock - (this.sprintRemark.get(rt.def.id) ?? -99) > 15) {
      // its own cooldown: a greeting a moment ago should not swallow the remark
      if (this.bark(rt, "sprint", true)) this.sprintRemark.set(rt.def.id, this.clock);
      return;
    }
    // acknowledge the player passing by
    if (dPlayer < 4.5 && !this.playerBusy && this.clock - rt.lastGreet > 90) {
      const greeted = this.bark(rt, rt.activity === "festival" ? "festival" : "greet");
      rt.lastGreet = greeted ? this.clock : this.clock - 87; // blocked by another bubble: try again in 3 s
      const cur = rt.animator.currentAction;
      if (greeted && rt.mode === "activity" && cur !== "sit_idle" && cur !== "rest_idle" && cur !== "craft_at_station" && cur !== "make_garland") this.playOnce(rt, "greet");
      return;
    }
    // occasional remarks about the changed world, or a lost pouch
    if (dPlayer < 9 && this.clock - rt.lastBark > 45 && Math.random() < 0.004) {
      if (!this.bark(rt, "missing")) this.bark(rt, rt.activity === "festival" ? "festival" : "admire");
    }
  }

  /** Turn the head toward the player when they are close and in front (applied on top of the animation). */
  private applyLook(rt: NpcRuntime, dPlayer: number): void {
    if (!rt.head?.parent) return;
    const body = rt.object.rotation.y;
    const want = Math.atan2(this.playerPos.x - rt.object.position.x, this.playerPos.z - rt.object.position.z);
    let rel = Math.atan2(Math.sin(want - body), Math.cos(want - body));
    const engaged = dPlayer < 6 && Math.abs(rel) < 1.9 && rt.mode !== "pursuing";
    rel = engaged ? THREE.MathUtils.clamp(rel, -1.05, 1.05) : 0;
    rt.lookYaw += (rel - rt.lookYaw) * 0.12;
    if (Math.abs(rt.lookYaw) < 0.002) return;
    const head = rt.head;
    head.parent!.updateWorldMatrix(true, false);
    const parentQ = new THREE.Quaternion();
    head.parent!.getWorldQuaternion(parentQ);
    const turn = new THREE.Quaternion().setFromAxisAngle(UP, rt.lookYaw);
    // local' = parent^-1 * turn * parent * local
    head.quaternion.premultiply(parentQ.clone().invert().multiply(turn).multiply(parentQ));
  }

  positionOf(npcId: string): THREE.Vector3 {
    return this.npcs.get(npcId)?.object.position ?? new THREE.Vector3();
  }

  /** The anchor an NPC is currently heading to or working at (schedule, shelter or pursuit). */
  currentAnchor(npcId: string): string | null {
    return this.npcs.get(npcId)?.anchorId || null;
  }
}

const dist2 = (a: [number, number, number], b: [number, number, number]) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;
