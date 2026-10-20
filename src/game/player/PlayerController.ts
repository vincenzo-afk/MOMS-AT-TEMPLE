import * as THREE from "three";
import type { Input } from "../core/Input";
import type { CollisionWorld } from "../world/CollisionWorld";
import { CharacterAnimator } from "./CharacterAnimator";

export const WALK_SPEED = 2.2;
export const RUN_SPEED = 5.0;
const ACCEL = 14;
const DECEL = 18;
const TURN_RATE = 11; // rad/s
const RADIUS = 0.3;
const HEIGHT = 1.7;
const GRAVITY = 22;

/**
 * Third-person kinematic controller: camera-relative movement, acceleration, step-up onto WALK
 * surfaces, gravity, and collision against box proxies. Movement is in place-animation driven:
 * the animator receives the real horizontal speed so feet stay planted.
 */
export class PlayerController {
  readonly object = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  private vy = 0;
  grounded = true;
  locked = false; // true while an action animation plays

  constructor(
    model: THREE.Object3D,
    readonly animator: CharacterAnimator,
    private collision: CollisionWorld,
  ) {
    this.object.name = "Player";
    this.object.add(model);
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  teleport(pos: [number, number, number], yaw: number): void {
    this.object.position.set(...pos);
    this.object.position.y = this.collision.groundHeight(pos[0], pos[2], pos[1] + 0.3);
    this.yaw = yaw;
    this.velocity.set(0, 0, 0);
    this.object.rotation.y = yaw;
  }

  faceTowards(target: THREE.Vector3): void {
    this.yaw = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    this.object.rotation.y = this.yaw;
  }

  update(dt: number, input: Input, cameraYaw: number): void {
    // desired direction relative to the camera (camera looks along -Z when cameraYaw = 0)
    // keyboard gives unit length; a gamepad stick gives analog magnitude (gentle push = slow walk)
    const axis = this.locked ? { x: 0, z: 0 } : input.moveAxis();
    const len = Math.hypot(axis.x, axis.z);
    const target = new THREE.Vector3();
    if (len > 0) {
      const ix = axis.x / len;
      const iz = axis.z / len;
      const s = Math.sin(cameraYaw);
      const c = Math.cos(cameraYaw);
      target.set(ix * c + iz * s, 0, -ix * s + iz * c).multiplyScalar((input.isDown("run") ? RUN_SPEED : WALK_SPEED) * Math.max(0.35, len));
    }
    const horiz = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    const rate = target.lengthSq() > horiz.lengthSq() ? ACCEL : DECEL;
    horiz.lerp(target, 1 - Math.exp(-rate * dt * 0.35));
    if (horiz.lengthSq() < 1e-4 && len === 0) horiz.set(0, 0, 0);
    this.velocity.x = horiz.x;
    this.velocity.z = horiz.z;

    // facing follows movement direction
    let turnDir = 0;
    if (len > 0) {
      const want = Math.atan2(target.x, target.z);
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const step = Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * dt);
      this.yaw += step;
      if (Math.abs(d) > 0.6) turnDir = Math.sign(d);
    }
    this.object.rotation.y = this.yaw;

    // integrate horizontal movement with collision
    const p = this.position;
    let nx = p.x + this.velocity.x * dt;
    let nz = p.z + this.velocity.z * dt;
    [nx, nz] = this.collision.resolve(nx, nz, p.y, RADIUS, HEIGHT);
    const moved = Math.hypot(nx - p.x, nz - p.z) / Math.max(dt, 1e-4);
    p.x = nx;
    p.z = nz;

    // vertical: snap up steps, fall with gravity
    const ground = this.collision.groundHeight(p.x, p.z, p.y);
    if (ground >= p.y - 0.02) {
      p.y = THREE.MathUtils.lerp(p.y, ground, 1 - Math.exp(-25 * dt));
      if (Math.abs(p.y - ground) < 0.005) p.y = ground;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.vy -= GRAVITY * dt;
      p.y = Math.max(ground, p.y + this.vy * dt);
      this.grounded = p.y <= ground + 0.01;
      if (this.grounded) this.vy = 0;
    }

    this.animator.setTurning(turnDir);
    // speed used for animation is what actually happened after collision (prevents moonwalking into walls)
    this.animator.update(dt, Math.min(moved, Math.hypot(this.velocity.x, this.velocity.z)));
  }
}
