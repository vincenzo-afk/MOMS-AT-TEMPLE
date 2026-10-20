import * as THREE from "three";
import type { Input } from "../core/Input";
import type { CollisionWorld } from "../world/CollisionWorld";

/** Orbiting follow camera with collision-aware boom shortening and smoothing. */
export class ThirdPersonCamera {
  yaw = 0; // camera looks along -Z at yaw 0
  pitch = 0.32;
  distance = 4.6;
  private current = 4.6;
  private target = new THREE.Vector3();
  sensitivity = 1;
  invertY = false;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private collision: CollisionWorld,
  ) {}

  snapTo(focus: THREE.Vector3, yaw: number): void {
    this.yaw = yaw;
    this.target.copy(focus).add(new THREE.Vector3(0, 1.55, 0));
    this.current = this.distance;
    this.apply(1);
  }

  update(dt: number, input: Input, focus: THREE.Vector3): void {
    const k = 0.0022 * this.sensitivity;
    this.yaw -= input.mouseDX * k;
    this.pitch += input.mouseDY * k * (this.invertY ? -1 : 1);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.35, 1.15);
    this.distance = THREE.MathUtils.clamp(this.distance + input.wheel * 0.5, 2.2, 9);
    const desired = focus.clone().add(new THREE.Vector3(0, 1.55, 0));
    this.target.lerp(desired, 1 - Math.exp(-14 * dt));
    this.apply(dt);
  }

  private apply(dt: number): void {
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const hit = this.collision.raycast(this.target, dir, this.distance + 0.3);
    const allowed = Math.max(0.6, Math.min(this.distance, hit - 0.3));
    // pull in quickly when blocked, ease back out when clear
    const rate = allowed < this.current ? 30 : 4;
    this.current += (allowed - this.current) * (1 - Math.exp(-rate * dt));
    const pos = this.target.clone().addScaledVector(dir, this.current);
    pos.y = Math.max(pos.y, this.target.y - 1.3);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }
}
