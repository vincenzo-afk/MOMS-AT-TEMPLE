import * as THREE from "three";
import type { Box, CollisionWorld, RayHit } from "../world/CollisionWorld";
import type { PlayerController } from "./PlayerController";

/** A seat measured from the level's collision proxies at the moment of interaction (nothing hard-coded). */
export interface SeatInfo {
  /** where the pelvis (hips bone origin) must rest, world space */
  pelvis: THREE.Vector3;
  /** facing while seated (radians, the character's yaw) */
  yaw: number;
  /** seat surface height and depth along the facing */
  seatTop: number;
  depth: number;
  /** floor in front of the seat (feet are planted here) */
  floorY: number;
  /** standing spot in front of the seat edge */
  stand: THREE.Vector3;
  backrest: boolean;
}

const _f = new THREE.Vector3();
const _along = new THREE.Vector3();
const _across = new THREE.Vector3();
const _p = new THREE.Vector3();
const _o = new THREE.Vector3();
const _hit: RayHit = { dist: Infinity, box: null };

/** Hip-bone height above the seat surface for a 1.75 m body (half the buttock and thigh thickness). */
export const PELVIS_ABOVE_SEAT = 0.12;
/** Distance of the pelvis behind the seat's front edge when there is no backrest (thighs rest on the seat). */
const PELVIS_BEHIND_EDGE = 0.16;

/**
 * Find the seat behind an interaction point: the highest proxy with a top between 0.25 and 0.8 m above the
 * floor within 0.9 m behind the point, measured along the sitting direction. Returns null when there is none.
 */
export function measureSeat(collision: CollisionWorld, at: THREE.Vector3, faceYDeg: number, bodyScale = 1): SeatInfo | null {
  const yaw = (faceYDeg * Math.PI) / 180;
  _f.set(Math.sin(yaw), 0, Math.cos(yaw));
  const floorAtPoint = collision.groundHeight(at.x, at.z, at.y + 0.3);
  let seat: Box | null = null;
  let top = -Infinity;
  for (let d = 0; d <= 0.9 && !seat; d += 0.05) {
    _p.copy(at).addScaledVector(_f, -d);
    const t = collision.topAt(_p.x, _p.z, floorAtPoint + 0.25, floorAtPoint + 0.8);
    if (t > -Infinity) {
      top = t;
      for (const b of collision.boxes) {
        if (b.enabled === false || Math.abs(b.yMax - t) > 1e-4) continue;
        const dx = _p.x - b.cx;
        const dz = _p.z - b.cz;
        const lx = dx * b.cos - dz * b.sin;
        const lz = dx * b.sin + dz * b.cos;
        if (Math.abs(lx) <= b.hx && Math.abs(lz) <= b.hz) {
          seat = b;
          break;
        }
      }
    }
  }
  if (!seat) return null;
  // extent of the seat box along the facing and across it
  collision.axes(seat, _along, _across);
  const ef = Math.abs(seat.hx * _along.dot(_f)) + Math.abs(seat.hz * _across.dot(_f));
  _o.set(seat.cx, 0, seat.cz);
  const centreF = _o.dot(_f);
  const frontEdge = centreF + ef;
  const depth = 2 * ef;
  // lateral position: where the player asked to sit, kept inside the seat ends
  const side = new THREE.Vector3(_f.z, 0, -_f.x);
  const lateralExtent = Math.abs(seat.hx * _along.dot(side)) + Math.abs(seat.hz * _across.dot(side));
  const lateral = THREE.MathUtils.clamp(at.x * side.x + at.z * side.z - (_o.x * side.x + _o.z * side.z), -lateralExtent + 0.3, lateralExtent - 0.3);
  const base = new THREE.Vector3().copy(_o).addScaledVector(side, lateral).addScaledVector(_f, -centreF);
  // backrest: anything rising more than 0.3 m above the seat right behind it
  let backrest = false;
  let behind = frontEdge - Math.min(PELVIS_BEHIND_EDGE, depth * 0.45) * bodyScale;
  _p.copy(base).addScaledVector(_f, frontEdge - 0.05);
  _p.y = top + 0.4;
  collision.raycastHit(_p, _f.clone().negate(), depth + 0.35, _hit, 0.2);
  if (_hit.box && _hit.box.yMax > top + 0.3) {
    backrest = true;
    behind = frontEdge - 0.05 - _hit.dist + 0.15 * bodyScale; // buttocks against the backrest
  }
  const pelvis = new THREE.Vector3().copy(base).addScaledVector(_f, behind);
  pelvis.y = top + PELVIS_ABOVE_SEAT * bodyScale;
  const stand = new THREE.Vector3().copy(base).addScaledVector(_f, frontEdge + 0.3);
  const floorY = collision.groundHeight(stand.x, stand.z, top);
  stand.y = floorY;
  return { pelvis, yaw, seatTop: top, depth, floorY, stand, backrest };
}

type Phase = "approach" | "turn" | "lower" | "seated" | "rise" | "done";

const _h = new THREE.Vector3();
const _d = new THREE.Vector3();

/**
 * Sit-down / stand-up choreography: approach -> turn -> lower -> seated -> rise. The clip supplies the joint
 * angles; the pelvis is pulled onto the measured seat point each frame (blended over the transition, so there
 * is no pop) and the feet are planted on the floor by IK.
 */
export class SeatSession {
  phase: Phase = "approach";
  private t = 0;
  private weight = 0;
  /** Diagnostics: pelvis error (m) after placement in the last frame. */
  lastError = 0;

  constructor(
    private player: PlayerController,
    readonly seat: SeatInfo,
    private onSeated: () => void,
    private onDone: () => void,
  ) {
    player.locked = false;
    if (player.position.distanceTo(seat.stand) > 0.2) player.walkTo(seat.stand, () => this.beginTurn());
    else this.beginTurn();
    player.poseHook = () => this.placePelvis();
  }

  get seated(): boolean {
    return this.phase === "seated";
  }

  private beginTurn(): void {
    this.phase = "turn";
    this.t = 0;
    this.player.locked = true;
  }

  /** Called every frame by the game while the session is alive. */
  update(dt: number): void {
    const p = this.player;
    this.t += dt;
    if (this.phase === "turn") {
      const d = Math.atan2(Math.sin(this.seat.yaw - p.yaw), Math.cos(this.seat.yaw - p.yaw));
      p.yaw += Math.sign(d) * Math.min(Math.abs(d), 7 * dt);
      p.object.rotation.y = p.yaw;
      p.animator.setTurning(Math.abs(d) > 0.2 ? Math.sign(d) : 0);
      if (Math.abs(d) < 0.03 || this.t > 0.6) {
        p.yaw = this.seat.yaw;
        p.object.rotation.y = p.yaw;
        p.animator.setTurning(0);
        this.phase = "lower";
        this.t = 0;
        p.seatFloor = this.seat.floorY;
        p.animator.play("sit_down", { once: true, onDone: () => this.settle() });
      }
    } else if (this.phase === "lower") {
      this.weight = THREE.MathUtils.smoothstep(this.t / 0.9, 0.1, 1);
    } else if (this.phase === "rise") {
      this.weight = 1 - THREE.MathUtils.smoothstep(this.t / 0.8, 0.0, 0.85);
    }
  }

  private settle(): void {
    if (this.phase !== "lower") return;
    this.phase = "seated";
    this.weight = 1;
    this.player.animator.play("sit_idle", { once: false });
    this.onSeated();
  }

  /** Movement input while seated: stand up. */
  rise(): void {
    if (this.phase !== "seated") return;
    this.phase = "rise";
    this.t = 0;
    this.player.animator.play("stand_up", {
      once: true,
      onDone: () => {
        if (this.phase === "rise") this.finish();
      },
    });
  }

  /** Abort (e.g. a teleport or a panel) without animating. */
  cancel(): void {
    this.finish();
  }

  private finish(): void {
    const p = this.player;
    this.phase = "done";
    this.weight = 0;
    p.poseHook = null;
    p.seatFloor = null;
    p.modelOffset.set(0, 0, 0);
    p.model.position.set(0, 0, 0);
    p.cancelScripted();
    p.locked = false;
    this.onDone();
  }

  /** Pose hook: offset the model so the animated pelvis lands on the measured seat point (weighted). */
  private placePelvis(): void {
    const p = this.player;
    const rig = p.rig;
    p.model.position.set(0, 0, 0);
    if (!rig || this.weight <= 0) {
      p.modelOffset.set(0, 0, 0);
      return;
    }
    p.object.updateMatrixWorld(true);
    rig.hips.getWorldPosition(_h);
    _d.subVectors(this.seat.pelvis, _h).multiplyScalar(this.weight);
    // world delta -> root-local (the root only yaws)
    const c = Math.cos(-p.yaw);
    const s = Math.sin(-p.yaw);
    p.modelOffset.set(_d.x * c + _d.z * s, _d.y, -_d.x * s + _d.z * c);
    p.model.position.copy(p.modelOffset);
    p.object.updateMatrixWorld(true);
    rig.hips.getWorldPosition(_h);
    this.lastError = this.weight >= 1 ? _h.distanceTo(this.seat.pelvis) : 0;
  }
}
