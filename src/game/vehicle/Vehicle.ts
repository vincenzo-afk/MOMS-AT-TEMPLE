import * as THREE from "three";
import type { CollisionWorld } from "../world/CollisionWorld";

const MAX_FWD = 9.5; // m/s (about 34 km/h: an auto-rickshaw in a village lane)
const MAX_REV = 3;
const ACCEL = 5.5;
const BRAKE = 12;
const DRAG = 1.6;
const WHEELBASE = 1.7;
const MAX_STEER = 0.55; // radians at the front wheel
const RADIUS = 0.75; // collision circles at the front and rear axle

export interface DriveInput {
  throttle: number; // -1..1 (S reverses once stopped)
  steer: number; // -1 left .. 1 right
  brake: boolean;
}

const _a = new THREE.Vector3();

/**
 * Arcade three-wheeler: bicycle-model steering (turn rate = speed / wheelbase * tan(steer)), throttle, brake,
 * reverse, rolling drag. Two collision circles (front and rear) resolve against the level's proxies; hitting a
 * wall scrubs speed. Wheels spin by distance travelled.
 */
export class Vehicle {
  readonly object: THREE.Object3D;
  speed = 0;
  yaw: number;
  steer = 0;
  private wheels: THREE.Object3D[] = [];
  private driverSocket: THREE.Object3D | null = null;
  /** Diagnostics: total distance driven and wall hits. */
  readonly stats = { distance: 0, bumps: 0 };

  constructor(
    object: THREE.Object3D,
    private collision: CollisionWorld,
  ) {
    this.object = object;
    this.yaw = object.rotation.y;
    object.traverse((o) => {
      if (o.name.startsWith("WHEEL_")) this.wheels.push(o);
      if (o.name === "SOCKET_Driver") this.driverSocket = o;
    });
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  /** World position of the driver's seat (where the seated mom is placed). */
  driverSeat(out: THREE.Vector3): THREE.Vector3 {
    if (this.driverSocket) return this.driverSocket.getWorldPosition(out);
    return out.copy(this.object.position).setY(this.object.position.y + 0.95);
  }

  /** Where a passenger steps out: beside the cab on the right. */
  exitPoint(out: THREE.Vector3): THREE.Vector3 {
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    return out.set(this.position.x - c * 1.25 + s * 0.35, this.position.y, this.position.z + s * 1.25 + c * 0.35);
  }

  update(dt: number, input: DriveInput): void {
    // throttle / brake / reverse
    if (input.brake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), BRAKE * dt);
    else if (input.throttle > 0) this.speed += ACCEL * input.throttle * dt * (this.speed < 0 ? 2.5 : 1);
    else if (input.throttle < 0) this.speed += (this.speed > 0.2 ? -BRAKE : -ACCEL * 0.6) * -input.throttle * dt;
    this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), DRAG * dt);
    this.speed = THREE.MathUtils.clamp(this.speed, -MAX_REV, MAX_FWD);
    // steering eases toward the input; it gentles with speed so a fast auto does not spin
    const wantSteer = input.steer * MAX_STEER * (1 - Math.min(0.55, Math.abs(this.speed) / 20));
    this.steer += (wantSteer - this.steer) * (1 - Math.exp(-6 * dt));
    this.yaw -= (this.speed / WHEELBASE) * Math.tan(this.steer) * dt;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    // front of the model is +Z in three.js; move along it
    let x = this.position.x + fx * this.speed * dt;
    let z = this.position.z + fz * this.speed * dt;
    // resolve the front and rear circles; any push means we hit something
    const hx = fx * (WHEELBASE / 2);
    const hz = fz * (WHEELBASE / 2);
    const [fxr, fzr] = this.collision.resolve(x + hx, z + hz, this.position.y, RADIUS, 1.6);
    const [rxr, rzr] = this.collision.resolve(x - hx, z - hz, this.position.y, RADIUS, 1.6);
    const dx = (fxr - (x + hx) + (rxr - (x - hx))) / 2;
    const dz = (fzr - (z + hz) + (rzr - (z - hz))) / 2;
    if (Math.hypot(dx, dz) > 1e-4) {
      x += dx;
      z += dz;
      if (Math.abs(this.speed) > 2) this.stats.bumps++;
      this.speed *= 0.35;
    }
    _a.set(x - this.position.x, 0, z - this.position.z);
    this.stats.distance += _a.length();
    this.position.x = x;
    this.position.z = z;
    this.position.y = this.collision.groundHeight(x, z, this.position.y + 0.3);
    this.object.rotation.y = this.yaw;
    // wheels are lathed around their local Y (Blender Z): spin about it by distance / radius
    for (const w of this.wheels) w.rotateY((this.speed * dt) / 0.22);
  }
}
