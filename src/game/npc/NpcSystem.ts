import * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import type { AssetLibrary } from "../core/AssetLibrary";
import type { NpcDefinition, ScheduleEntry } from "../core/types";
import { CharacterAnimator, type LoopAction } from "../player/CharacterAnimator";
import { ANCHORS, NAV_EDGES, NAV_NODES } from "../../data/level";
import { evaluateAll } from "../world/conditions";
import type { CollisionWorld } from "../world/CollisionWorld";

const NPC_SPEED = 1.35;

/** Role-appropriate loops for scheduled activities; per-NPC overrides first. */
const ACTIVITY_CLIP: Record<ScheduleEntry["activity"], LoopAction | null> = {
  talk: "talk_idle",
  work: "talk_listen",
  garden: "repair_channel",
  craft: "craft_at_station",
  trade: "trade_counter",
  sit: "sit_idle",
  rest: null,
  home: null,
  festival: "talk_idle",
};
const NPC_OVERRIDES: Record<string, Partial<Record<ScheduleEntry["activity"], LoopAction | null>>> = {
  npc_ponnan: { work: "read_record", rest: null },
  npc_meena: { craft: "make_garland" },
  npc_villager_lakshmi: { work: "talk_listen" },
  npc_villager_pandi: { work: "talk_listen", rest: "rest_idle" },
};

export interface NpcRuntime {
  def: NpcDefinition;
  object: THREE.Group;
  animator: CharacterAnimator;
  path: THREE.Vector3[];
  anchorId: string;
  activity: ScheduleEntry["activity"];
  talking: boolean;
  speed: number;
  present: boolean;
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

export class NpcSystem {
  readonly npcs = new Map<string, NpcRuntime>();
  readonly group = new THREE.Group();

  constructor(
    private session: GameSession,
    assets: AssetLibrary,
    private collision: CollisionWorld,
    sourceModelId: string,
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
      const obj = new THREE.Group();
      obj.name = def.id;
      obj.add(model);
      this.group.add(obj);
      this.npcs.set(def.id, { def, object: obj, animator, path: [], anchorId: "", activity: "rest", talking: false, speed: 0, present: true });
    }
    this.snapToSchedule();
  }

  /** Place every NPC directly at its current scheduled anchor (new game / load). */
  snapToSchedule(): void {
    const hour = this.session.hourOfDay;
    for (const rt of this.npcs.values()) {
      const e = scheduleAt(rt.def, hour, this.session);
      const a = ANCHORS[e.anchorId]!;
      rt.object.position.set(...a.pos);
      rt.object.rotation.y = (a.faceY * Math.PI) / 180;
      rt.anchorId = e.anchorId;
      rt.activity = e.activity;
      rt.path = [];
      rt.talking = false;
      this.updatePresence(rt);
      this.startActivity(rt);
    }
  }

  private updatePresence(rt: NpcRuntime): void {
    rt.present = this.session.isNpcPresent(rt.def.id);
    rt.object.visible = rt.present;
  }

  private clipFor(rt: NpcRuntime): LoopAction | null {
    const o = NPC_OVERRIDES[rt.def.id];
    let clip = o && rt.activity in o ? o[rt.activity]! : ACTIVITY_CLIP[rt.activity];
    // sitting needs a seat: on the ground use the floor-sitting rest pose
    if (clip === "sit_idle" && (ANCHORS[rt.anchorId]?.pos[1] ?? 0) < 0.3) clip = "rest_idle";
    return clip;
  }

  private startActivity(rt: NpcRuntime): void {
    const clip = this.clipFor(rt);
    if (clip && rt.animator.has(clip)) rt.animator.play(clip, { once: false });
    else if (rt.animator.busy) rt.animator.stopAction();
  }

  beginTalk(npcId: string, playerPos: THREE.Vector3): void {
    const rt = this.npcs.get(npcId);
    if (!rt) return;
    rt.talking = true;
    rt.path = [];
    rt.object.rotation.y = Math.atan2(playerPos.x - rt.object.position.x, playerPos.z - rt.object.position.z);
    rt.animator.play("greet", { once: true, onDone: () => rt.talking && rt.animator.play("talk_gesture", { once: true, onDone: () => rt.talking && rt.animator.play("talk_idle", { once: false }) }) });
  }

  endTalk(npcId: string): void {
    const rt = this.npcs.get(npcId);
    if (!rt) return;
    rt.talking = false;
    if (!rt.path.length) {
      const a = ANCHORS[rt.anchorId];
      if (a) rt.object.rotation.y = (a.faceY * Math.PI) / 180;
      this.startActivity(rt);
    }
  }

  update(dt: number): void {
    const hour = this.session.hourOfDay;
    for (const rt of this.npcs.values()) {
      const wasPresent = rt.present;
      this.updatePresence(rt);
      if (!rt.present) continue;
      if (!wasPresent) {
        // just arrived (e.g. the weaver returning): appear at the scheduled anchor
        const e = scheduleAt(rt.def, hour, this.session);
        rt.anchorId = e.anchorId;
        rt.activity = e.activity;
        rt.object.position.set(...ANCHORS[e.anchorId]!.pos);
        this.startActivity(rt);
      }
      const e = scheduleAt(rt.def, hour, this.session);
      if (!rt.talking && (e.anchorId !== rt.anchorId || e.activity !== rt.activity)) {
        const moved = e.anchorId !== rt.anchorId;
        rt.anchorId = e.anchorId;
        rt.activity = e.activity;
        if (moved) {
          const a = ANCHORS[e.anchorId]!;
          rt.path = route(rt.object.position, new THREE.Vector3(...a.pos));
          if (rt.animator.busy) rt.animator.stopAction();
        } else this.startActivity(rt);
      }
      let speed = 0;
      if (rt.path.length && !rt.talking) {
        const p = rt.object.position;
        const next = rt.path[0]!;
        const d = Math.hypot(next.x - p.x, next.z - p.z);
        if (d < 0.15) {
          rt.path.shift();
          if (!rt.path.length) {
            const a = ANCHORS[rt.anchorId]!;
            p.set(...a.pos);
            rt.object.rotation.y = (a.faceY * Math.PI) / 180;
            this.startActivity(rt);
          }
        } else {
          const step = Math.min(d, NPC_SPEED * dt);
          p.x += ((next.x - p.x) / d) * step;
          p.z += ((next.z - p.z) / d) * step;
          p.y = this.collision.groundHeight(p.x, p.z, p.y + 0.3);
          const want = Math.atan2(next.x - p.x, next.z - p.z);
          let dy = want - rt.object.rotation.y;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          rt.object.rotation.y += dy * Math.min(1, dt * 6);
          speed = NPC_SPEED;
        }
      }
      rt.speed = speed;
      rt.animator.update(dt, speed);
    }
  }

  positionOf(npcId: string): THREE.Vector3 {
    return this.npcs.get(npcId)?.object.position ?? new THREE.Vector3();
  }
}
