import * as THREE from "three";
import { makeCharacterCullable } from "../render/characterBounds";
import type { AssetLibrary } from "../core/AssetLibrary";
import type { CollisionWorld } from "../world/CollisionWorld";
import { CharacterAnimator, type LoopAction, type OneShot } from "../player/CharacterAnimator";

const _v = new THREE.Vector3();

/** One animated person driven by the visit: follows a target, walks to a point, or holds a pose. */
export class Person {
  readonly object = new THREE.Group();
  readonly animator: CharacterAnimator;
  yaw = 0;
  speed = 0;
  /** world point to walk to (null = stand) */
  goal: THREE.Vector3 | null = null;
  maxSpeed = 2.4;
  private pose: string | null = null;

  constructor(
    readonly id: string,
    readonly name: string,
    assets: AssetLibrary,
    modelId: string,
    clipsFrom: string,
    private collision: CollisionWorld,
  ) {
    const model = assets.instantiate(modelId);
    makeCharacterCullable(model);
    this.object.add(model);
    this.object.name = `Visit_${id}`;
    this.animator = new CharacterAnimator(model, assets.retargetClips(clipsFrom, modelId));
    this.animator.fidgets = false;
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  place(x: number, y: number, z: number, yaw: number): void {
    this.object.position.set(x, y, z);
    this.yaw = yaw;
    this.object.rotation.y = yaw;
    this.goal = null;
    this.speed = 0;
  }

  /** Hold a looping pose (sit, pray, shuffle) until cleared with null. */
  setPose(name: LoopAction | null): void {
    if (name === this.pose) return;
    this.pose = name;
    if (name) this.animator.play(name, { once: false });
    else this.animator.stopAction();
  }

  playOnce(name: OneShot): void {
    this.pose = null;
    this.animator.play(name, { once: true });
  }

  update(dt: number): void {
    let want = 0;
    if (this.goal) {
      _v.subVectors(this.goal, this.object.position).setY(0);
      const d = _v.length();
      if (d > 0.15) {
        want = Math.min(this.maxSpeed, d > 4 ? 3.6 : d > 1.2 ? 1.8 : d * 1.4);
        const target = Math.atan2(_v.x, _v.z);
        const dy = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw));
        this.yaw += Math.sign(dy) * Math.min(Math.abs(dy), 8 * dt);
      }
    }
    this.speed += (want - this.speed) * (1 - Math.exp(-8 * dt));
    if (this.speed > 0.02 && !this.animator.busy) {
      const p = this.object.position;
      let nx = p.x + Math.sin(this.yaw) * this.speed * dt;
      let nz = p.z + Math.cos(this.yaw) * this.speed * dt;
      [nx, nz] = this.collision.resolve(nx, nz, p.y, 0.25, 1.4);
      p.x = nx;
      p.z = nz;
      p.y = this.collision.groundHeight(nx, nz, p.y + 0.4);
    }
    this.object.rotation.y = this.yaw;
    this.animator.update(dt, this.animator.busy ? 0 : this.speed);
  }
}

/**
 * The family walking with the mom: each member keeps a slot behind her (husband close, children either side),
 * catching up at a jog when left behind. A member can be detached (the child who wanders off).
 */
export class Family {
  readonly group = new THREE.Group();
  readonly members: Person[] = [];
  private slots: Array<[number, number]> = [
    [-0.9, -1.4],
    [0.8, -1.2],
    [0.0, -2.1],
  ];
  /** members not following (wandered, holding a place in the queue, sitting at annadanam) */
  readonly detached = new Set<string>();
  visible = true;

  add(p: Person): void {
    this.members.push(p);
    this.group.add(p.object);
  }

  /** Place the family behind the leader immediately (start of a stage, after a teleport). */
  snapBehind(leader: THREE.Vector3, yaw: number): void {
    this.members.forEach((m, i) => {
      const [sx, sz] = this.slots[i % this.slots.length]!;
      const s = Math.sin(yaw);
      const c = Math.cos(yaw);
      m.place(leader.x + sx * c + sz * s, leader.y, leader.z - sx * s + sz * c, yaw);
    });
  }

  update(dt: number, leader: THREE.Vector3, yaw: number): void {
    this.members.forEach((m, i) => {
      if (!this.detached.has(m.id)) {
        const [sx, sz] = this.slots[i % this.slots.length]!;
        const s = Math.sin(yaw);
        const c = Math.cos(yaw);
        const gx = leader.x + sx * c + sz * s;
        const gz = leader.z - sx * s + sz * c;
        // far away (a teleport, a drive): appear behind rather than run across the map
        if (Math.hypot(gx - m.position.x, gz - m.position.z) > 25) m.place(gx, leader.y, gz, yaw);
        m.goal = m.goal ?? new THREE.Vector3();
        m.goal.set(gx, leader.y, gz);
      }
      m.update(dt);
    });
    this.group.visible = this.visible;
  }
}
