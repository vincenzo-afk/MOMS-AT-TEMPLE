import * as THREE from "three";
import type { Input } from "../core/Input";
import type { CollisionWorld } from "../world/CollisionWorld";

const FOCUS_HEIGHT = 1.55;
const SHOULDER = 0.42; // over the right shoulder, as in GTA V on foot
const NEAR_CLEARANCE = 0.25; // keep the lens this far from any surface
const PROBE_OFFSETS: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const _desired = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

/**
 * Orbit follow camera: over-the-shoulder framing, a look-ahead in the direction of travel, smoothed follow,
 * zoom, a sprint FOV kick and landing shake. Collision uses five rays (centre plus a ring the size of the
 * near-plane clearance), so the camera stops short of geometry instead of clipping its edges, and a final
 * inside-geometry check pulls it in further if needed. No per-frame allocation.
 */
export class ThirdPersonCamera {
  yaw = 0; // camera looks along -Z at yaw 0
  pitch = 0.32;
  distance = 4.2;
  private current = 4.2;
  private target = new THREE.Vector3();
  private ahead = new THREE.Vector3();
  private shoulder = SHOULDER;
  private shake = 0;
  private shakeT = 0;
  private fovKick = 0;
  baseFov = 60;
  sensitivity = 1;
  invertY = false;
  /** Diagnostics: true if the camera ended a frame inside geometry (should never happen). */
  clippedFrames = 0;
  /** Current boom length (m); the game fades the player out when this gets very short. */
  get boom(): number {
    return this.current;
  }

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private collision: CollisionWorld,
  ) {}

  snapTo(focus: THREE.Vector3, yaw: number): void {
    this.yaw = yaw;
    this.target.copy(focus);
    this.target.y += FOCUS_HEIGHT;
    this.ahead.set(0, 0, 0);
    this.current = this.distance;
    this.apply(1);
  }

  /** Trigger a short decaying shake (hard landings). strength ~0.05-0.2 m. */
  addShake(strength: number): void {
    this.shake = Math.max(this.shake, strength);
  }

  /**
   * velocity: the player's horizontal velocity (look-ahead); sprint 0..1 drives the FOV kick;
   * shoulder: false centres the camera (sitting, cut-scenes).
   */
  update(dt: number, input: Pick<Input, "mouseDX" | "mouseDY" | "wheel">, focus: THREE.Vector3, velocity?: THREE.Vector3, sprint = 0, shoulder = true): void {
    const k = 0.0022 * this.sensitivity;
    this.yaw -= input.mouseDX * k;
    this.pitch += input.mouseDY * k * (this.invertY ? -1 : 1);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.35, 1.15);
    this.distance = THREE.MathUtils.clamp(this.distance + input.wheel * 0.5, 1.6, 9);
    // look-ahead: lead the framing slightly in the direction of travel
    _desired.set(0, 0, 0);
    if (velocity) _desired.set(velocity.x, 0, velocity.z).multiplyScalar(0.18);
    if (_desired.length() > 1.1) _desired.setLength(1.1);
    this.ahead.lerp(_desired, 1 - Math.exp(-2.5 * dt));
    _desired.copy(focus).add(this.ahead);
    _desired.y += FOCUS_HEIGHT;
    // a teleport or load moves the focus far in one frame: cut instead of gliding through the buildings between
    if (this.target.distanceToSquared(_desired) > 36) {
      this.target.copy(_desired);
      this.ahead.set(0, 0, 0);
    } else this.target.lerp(_desired, 1 - Math.exp(-14 * dt));
    this.shoulder = THREE.MathUtils.lerp(this.shoulder, shoulder ? SHOULDER : 0, 1 - Math.exp(-4 * dt));
    this.fovKick = THREE.MathUtils.lerp(this.fovKick, sprint * 9, 1 - Math.exp(-3 * dt));
    if (this.shake > 0) {
      this.shakeT += dt;
      this.shake = Math.max(0, this.shake - dt * 0.6);
    }
    this.apply(dt);
  }

  private apply(dt: number): void {
    _dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); // screen right when looking along -_dir
    _up.crossVectors(_dir, _right).normalize();
    // the pivot shifts over the shoulder, but never through a wall beside the player
    const side = this.collision.raycast(this.target, _right, this.shoulder + NEAR_CLEARANCE);
    const shoulder = Math.min(this.shoulder, Math.max(0, side - NEAR_CLEARANCE));
    _origin.copy(this.target).addScaledVector(_right, shoulder);
    // sphere-ish cast: the boom stops at the nearest of five parallel rays
    let hit = Infinity;
    for (const [ox, oy] of PROBE_OFFSETS) {
      _probe.copy(_origin).addScaledVector(_right, ox * NEAR_CLEARANCE).addScaledVector(_up, oy * NEAR_CLEARANCE);
      hit = Math.min(hit, this.collision.raycast(_probe, _dir, this.distance + NEAR_CLEARANCE));
    }
    const allowed = Math.max(0.35, Math.min(this.distance, hit - NEAR_CLEARANCE));
    // pull in instantly when blocked (never show the inside of a wall), ease back out when clear
    if (allowed < this.current) this.current = allowed;
    else this.current += (allowed - this.current) * (1 - Math.exp(-4 * dt));
    _pos.copy(_origin).addScaledVector(_dir, this.current);
    // when the boom is squeezed short (a wall behind), rise over the shoulder instead of staring into the head
    const squeeze = THREE.MathUtils.clamp((1.4 - this.current) / 1.0, 0, 1);
    if (squeeze > 0) {
      const lift = squeeze * 0.45;
      const above = this.collision.raycast(_pos, _up, lift + NEAR_CLEARANCE);
      _pos.addScaledVector(_up, Math.min(lift, Math.max(0, above - NEAR_CLEARANCE)));
    }
    _pos.y = Math.max(_pos.y, this.target.y - 1.3);
    // final guarantee: if the lens still ends up inside a proxy (thin gaps between probes), walk it back in
    let guard = 0;
    while (this.collision.inside(_pos.x, _pos.y, _pos.z, 0.05) && guard++ < 12) _pos.addScaledVector(_dir, -0.25);
    if (guard > 0 && this.collision.inside(_pos.x, _pos.y, _pos.z, 0)) this.clippedFrames++;
    if (this.shake > 0) {
      const a = this.shake;
      _pos.addScaledVector(_up, Math.sin(this.shakeT * 47) * a).addScaledVector(_right, Math.sin(this.shakeT * 31 + 1.3) * a * 0.6);
    }
    this.camera.position.copy(_pos);
    _look.copy(_origin);
    this.camera.lookAt(_look);
    const fov = this.baseFov + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
