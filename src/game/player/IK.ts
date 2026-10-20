import * as THREE from "three";

/**
 * Procedural layers applied after the animation mixer each frame: two-bone IK (legs and arms), foot planting on
 * uneven ground, additive world-space rotations (lean into turns) and head look-at. No per-frame allocation.
 */

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _t = new THREE.Vector3();
const _ac = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _at = new THREE.Vector3();
const _ba = new THREE.Vector3();
const _bc = new THREE.Vector3();
const _axis0 = new THREE.Vector3();
const _axis1 = new THREE.Vector3();
const _la = new THREE.Vector3();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qInv = new THREE.Quaternion();
const _r0 = new THREE.Quaternion();
const _r1 = new THREE.Quaternion();
const _r2 = new THREE.Quaternion();
const _q = new THREE.Quaternion();
const _pole = new THREE.Vector3();

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const angleBetween = (u: THREE.Vector3, v: THREE.Vector3) => {
  const d = u.length() * v.length();
  return d < 1e-9 ? 0 : Math.acos(clamp(u.dot(v) / d, -1, 1));
};

/**
 * Analytic two-bone IK (D. Holden's formulation): rotates `upper` and `lower` so the end effector reaches
 * `target`, keeping the current bend plane (or `poleHint` when the limb is straight). `weight` blends with
 * the animated pose. Bones must have up-to-date world matrices.
 */
export function solveTwoBone(upper: THREE.Bone, lower: THREE.Bone, end: THREE.Object3D, target: THREE.Vector3, weight: number, poleHint?: THREE.Vector3): void {
  if (weight <= 0.001) return;
  upper.getWorldPosition(_a);
  lower.getWorldPosition(_b);
  end.getWorldPosition(_c);
  _t.copy(_c).lerp(target, clamp(weight, 0, 1));
  const lab = _b.distanceTo(_a);
  const lcb = _b.distanceTo(_c);
  const lat = clamp(_t.distanceTo(_a), 0.01, lab + lcb - 0.002);

  _ac.subVectors(_c, _a);
  _ab.subVectors(_b, _a);
  _at.subVectors(_t, _a);
  _ba.subVectors(_a, _b);
  _bc.subVectors(_c, _b);
  const acab0 = angleBetween(_ac, _ab);
  const babc0 = angleBetween(_ba, _bc);
  const acat0 = angleBetween(_ac, _at);
  const acab1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const babc1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));

  _axis0.crossVectors(_ac, _ab);
  if (_axis0.lengthSq() < 1e-10) {
    // straight limb: bend toward the pole hint (e.g. knees forward)
    _pole.copy(poleHint ?? _la.set(0, 0, 1)).sub(_a);
    _axis0.crossVectors(_ac, _pole);
  }
  _axis0.normalize();
  _axis1.crossVectors(_ac, _at);
  if (_axis1.lengthSq() < 1e-10) _axis1.copy(_axis0);
  else _axis1.normalize();

  upper.getWorldQuaternion(_qa);
  lower.getWorldQuaternion(_qb);
  _qInv.copy(_qa).invert();
  _r0.setFromAxisAngle(_la.copy(_axis0).applyQuaternion(_qInv), acab1 - acab0);
  _r2.setFromAxisAngle(_la.copy(_axis1).applyQuaternion(_qInv), acat0);
  _qInv.copy(_qb).invert();
  _r1.setFromAxisAngle(_la.copy(_axis0).applyQuaternion(_qInv), babc1 - babc0);
  upper.quaternion.multiply(_q.copy(_r0).multiply(_r2));
  lower.quaternion.multiply(_r1);
  upper.updateMatrixWorld(true);
}

/** Rotate a bone by `angle` around a world-space axis, on top of its animated pose. */
export function rotateBoneWorld(bone: THREE.Object3D, axisWorld: THREE.Vector3, angle: number): void {
  if (Math.abs(angle) < 1e-5) return;
  bone.getWorldQuaternion(_qa);
  _qInv.copy(_qa).invert();
  _q.setFromAxisAngle(_la.copy(axisWorld).applyQuaternion(_qInv).normalize(), angle);
  bone.quaternion.multiply(_q);
}

export interface Rig {
  root: THREE.Object3D;
  hips: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  neck: THREE.Bone;
  head: THREE.Bone;
  thigh: [THREE.Bone, THREE.Bone];
  shin: [THREE.Bone, THREE.Bone];
  foot: [THREE.Bone, THREE.Bone];
  upperArm: [THREE.Bone, THREE.Bone];
  forearm: [THREE.Bone, THREE.Bone];
  hand: [THREE.Bone, THREE.Bone];
  /** Rest-pose ankle height above the root (for planting). */
  ankleHeight: number;
}

/** Find the SK_Humanoid_A bones in a skinned model (null if it is not a humanoid). */
export function findRig(root: THREE.Object3D): Rig | null {
  const bones = new Map<string, THREE.Bone>();
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
  });
  const g = (n: string) => bones.get(n);
  const need = ["hips", "spine", "chest", "neck", "head", "thigh_L", "thigh_R", "shin_L", "shin_R", "foot_L", "foot_R", "upper_arm_L", "upper_arm_R", "forearm_L", "forearm_R", "hand_L", "hand_R"];
  if (need.some((n) => !g(n))) return null;
  root.updateMatrixWorld(true);
  const rootY = root.getWorldPosition(new THREE.Vector3()).y;
  const ankle = g("foot_L")!.getWorldPosition(new THREE.Vector3()).y - rootY;
  return {
    root,
    hips: g("hips")!,
    spine: g("spine")!,
    chest: g("chest")!,
    neck: g("neck")!,
    head: g("head")!,
    thigh: [g("thigh_L")!, g("thigh_R")!],
    shin: [g("shin_L")!, g("shin_R")!],
    foot: [g("foot_L")!, g("foot_R")!],
    upperArm: [g("upper_arm_L")!, g("upper_arm_R")!],
    forearm: [g("forearm_L")!, g("forearm_R")!],
    hand: [g("hand_L")!, g("hand_R")!],
    ankleHeight: ankle,
  };
}

const _foot = new THREE.Vector3();
const _hip = new THREE.Vector3();
const _knee = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _offsets: [number, number] = [0, 0];
const _targets = [new THREE.Vector3(), new THREE.Vector3()];

/**
 * Plant both feet on the ground under them: each foot moves by the difference between the ground under it and
 * the ground under the character root; the pelvis drops so the lower foot can reach. `groundAt` returns the
 * walkable height at (x, z) reachable from y. `floorY` overrides the ground for both feet (sitting).
 * Returns the pelvis drop applied (<= 0).
 */
export function plantFeet(rig: Rig, rootY: number, weight: number, groundAt: (x: number, z: number, y: number) => number, floorY?: number): number {
  if (weight <= 0.001) return 0;
  rig.root.updateMatrixWorld(true);
  let drop = 0;
  for (let i = 0; i < 2; i++) {
    rig.foot[i]!.getWorldPosition(_foot);
    const g = floorY ?? groundAt(_foot.x, _foot.z, rootY + 0.45);
    // never pull a foot below a surface it is already above by more than a step (stairs going down)
    const o = clamp(g - rootY, -0.45, 0.45);
    _offsets[i] = o;
    if (o < drop) drop = o;
  }
  if (floorY !== undefined) drop = Math.min(0, drop);
  if (drop < 0) {
    rig.hips.getWorldPosition(_hip);
    _hip.y += drop * weight;
    rig.hips.parent!.worldToLocal(_hip);
    rig.hips.position.copy(_hip);
    rig.root.updateMatrixWorld(true);
  }
  for (let i = 0; i < 2; i++) {
    rig.foot[i]!.getWorldPosition(_foot);
    const t = _targets[i]!;
    // the foot keeps its animated height above its own ground; floorY pins it exactly to the floor
    t.copy(_foot);
    if (floorY !== undefined) t.y = floorY + rig.ankleHeight; // seated: feet flat on the floor
    else t.y = _foot.y + (_offsets[i]! - drop * weight);
    rig.shin[i]!.getWorldPosition(_knee);
    rig.root.getWorldDirection(_fwd);
    _knee.addScaledVector(_fwd, 0.5);
    solveTwoBone(rig.thigh[i]!, rig.shin[i]!, rig.foot[i]!, t, weight, _knee);
  }
  return drop * weight;
}

const _headPos = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _bodyFwd = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Turn the head (and a little of the neck) toward a world point within comfortable limits; `amount` 0..1 is
 * smoothed by the caller. Returns false when the target is behind the character (look ignored).
 */
export function lookAt(rig: Rig, target: THREE.Vector3, amount: number, maxYaw = 1.1, maxPitch = 0.5): boolean {
  if (amount <= 0.001) return true;
  rig.head.getWorldPosition(_headPos);
  _toTarget.subVectors(target, _headPos);
  rig.root.getWorldDirection(_bodyFwd);
  const yawBody = Math.atan2(_bodyFwd.x, _bodyFwd.z);
  const yawT = Math.atan2(_toTarget.x, _toTarget.z);
  let dy = Math.atan2(Math.sin(yawT - yawBody), Math.cos(yawT - yawBody));
  if (Math.abs(dy) > 2.2) return false;
  dy = clamp(dy, -maxYaw, maxYaw);
  const horiz = Math.hypot(_toTarget.x, _toTarget.z);
  const pitch = clamp(Math.atan2(_toTarget.y, horiz), -maxPitch, maxPitch);
  rotateBoneWorld(rig.neck, _up, dy * 0.35 * amount);
  rotateBoneWorld(rig.head, _up, dy * 0.65 * amount);
  rig.root.updateMatrixWorld(true);
  // pitch about the head's sideways axis (body right)
  _la.crossVectors(_up, _bodyFwd).normalize();
  rotateBoneWorld(rig.head, _la, -pitch * amount);
  return true;
}
