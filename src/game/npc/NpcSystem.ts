import * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import type { AssetLibrary } from "../core/AssetLibrary";
import type { NpcDefinition, ScheduleEntry } from "../core/types";
import { CharacterAnimator, type LoopAction } from "../player/CharacterAnimator";
import { ANCHORS, NAV_EDGES, NAV_NODES } from "../../data/level";
import type { CollisionWorld } from "../world/CollisionWorld";

const NPC_SPEED = 1.35;

// Role-appropriate loops while an NPC is at its scheduled activity.
const ACTIVITY_CLIP: Record<string, Partial<Record<ScheduleEntry["activity"], LoopAction | null>>> = {
  npc_valli: { talk: "talk_idle" },
  npc_murugan: { work: "repair_channel" },
  npc_kamala: { work: "craft_at_station" },
  npc_selvam: { work: "talk_idle" },
  npc_ponnan: {},
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
}

export function scheduleAt(def: NpcDefinition, hour: number): ScheduleEntry {
  for (const e of def.schedule) {
    if ((hour >= e.fromHour && hour < e.toHour) || (hour + 24 >= e.fromHour && hour + 24 < e.toHour)) return e;
  }
  return def.schedule[0]!;
}

/** Shortest route between two points via the navigation graph (Dijkstra over a dozen nodes). */
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
    if (u === goal) break;
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
    sharedClips: THREE.AnimationClip[],
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
      const animator = new CharacterAnimator(model, own.length ? own : sharedClips);
      const obj = new THREE.Group();
      obj.name = def.id;
      obj.add(model);
      this.group.add(obj);
      const rt: NpcRuntime = { def, object: obj, animator, path: [], anchorId: "", activity: "rest", talking: false, speed: 0 };
      this.npcs.set(def.id, rt);
    }
    this.snapToSchedule();
  }

  /** Place every NPC directly at its current scheduled anchor (new game / load). */
  snapToSchedule(): void {
    const hour = this.session.hourOfDay;
    for (const rt of this.npcs.values()) {
      const e = scheduleAt(rt.def, hour);
      const a = ANCHORS[e.anchorId]!;
      rt.object.position.set(...a.pos);
      rt.object.rotation.y = (a.faceY * Math.PI) / 180;
      rt.anchorId = e.anchorId;
      rt.activity = e.activity;
      rt.path = [];
      this.startActivity(rt);
    }
  }

  private startActivity(rt: NpcRuntime): void {
    const clip = ACTIVITY_CLIP[rt.def.id]?.[rt.activity] ?? null;
    if (clip) rt.animator.play(clip, { once: false });
    else if (rt.animator.busy) rt.animator.stopAction();
  }

  beginTalk(npcId: string, playerPos: THREE.Vector3): void {
    const rt = this.npcs.get(npcId);
    if (!rt) return;
    rt.talking = true;
    rt.path = [];
    rt.object.rotation.y = Math.atan2(playerPos.x - rt.object.position.x, playerPos.z - rt.object.position.z);
    rt.animator.play("talk_gesture", { once: true, onDone: () => rt.talking && rt.animator.play("talk_idle", { once: false }) });
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
      const e = scheduleAt(rt.def, hour);
      if (e.anchorId !== rt.anchorId && !rt.talking) {
        rt.anchorId = e.anchorId;
        rt.activity = e.activity;
        const a = ANCHORS[e.anchorId]!;
        rt.path = route(rt.object.position, new THREE.Vector3(...a.pos));
        if (rt.animator.busy) rt.animator.stopAction();
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
