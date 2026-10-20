import * as THREE from "three";
import { rotateBoneWorld } from "./IK";

/**
 * Facial life on top of the body animation (README §6.9): blinking, eyes that follow a look target, and a jaw
 * that moves while the character speaks. Works on any SK_Humanoid_A character with the face bones (jaw,
 * eye_L/R, lid_L/R). Rotations are applied in world space about the head's own axes, so bone rolls do not matter.
 */
export interface FaceBones {
  head: THREE.Object3D;
  jaw: THREE.Object3D;
  eyes: [THREE.Object3D, THREE.Object3D];
  lids: [THREE.Object3D, THREE.Object3D];
}

export function findFace(root: THREE.Object3D): FaceBones | null {
  const get = (n: string) => root.getObjectByName(n) ?? null;
  const head = get("head");
  const jaw = get("jaw");
  const eL = get("eye_L");
  const eR = get("eye_R");
  const lL = get("lid_L");
  const lR = get("lid_R");
  if (!head || !jaw || !eL || !eR || !lL || !lR) return null;
  return { head, jaw, eyes: [eL, eR], lids: [lL, lR] };
}

const _q = new THREE.Quaternion();
const _left = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _to = new THREE.Vector3();
const _eye = new THREE.Vector3();

export class FaceController {
  private blinkT = 0;
  private nextBlink = 1 + Math.random() * 3;
  private talkT = Math.random() * 10;
  private jawOpen = 0;
  /** last measured lid closure 0..1 and jaw angle (diagnostics/tests) */
  readonly state = { lid: 0, jaw: 0, gazeYaw: 0 };

  // the face's forward / left / up in the head bone's local frame, captured in the bind pose
  private localFwd = new THREE.Vector3();
  private localLeft = new THREE.Vector3();
  private localUp = new THREE.Vector3();

  /** Create while the skeleton is still in its bind pose (before the first animation update). */
  constructor(
    private bones: FaceBones,
    characterRoot: THREE.Object3D,
  ) {
    characterRoot.updateWorldMatrix(true, true);
    const rootQ = characterRoot.getWorldQuaternion(new THREE.Quaternion());
    const headInv = bones.head.getWorldQuaternion(new THREE.Quaternion()).invert();
    // the model faces +Z, its left is +X, up is +Y
    this.localFwd.set(0, 0, 1).applyQuaternion(rootQ).applyQuaternion(headInv);
    this.localLeft.set(1, 0, 0).applyQuaternion(rootQ).applyQuaternion(headInv);
    this.localUp.set(0, 1, 0).applyQuaternion(rootQ).applyQuaternion(headInv);
  }

  /**
   * Call after the clip blend each frame. lookAt: world point the eyes should follow (null = ahead).
   * talking: the character is speaking (jaw moves in syllable-like pulses).
   */
  update(dt: number, lookAt: THREE.Vector3 | null, talking: boolean): void {
    const b = this.bones;
    b.head.updateWorldMatrix(true, false);
    b.head.getWorldQuaternion(_q);
    _fwd.copy(this.localFwd).applyQuaternion(_q);
    _left.copy(this.localLeft).applyQuaternion(_q);
    _up.copy(this.localUp).applyQuaternion(_q);

    // blink: a quick close and slower open every 2-6 s
    this.blinkT += dt;
    let lid = 0;
    if (this.blinkT > this.nextBlink) {
      const t = this.blinkT - this.nextBlink;
      lid = t < 0.07 ? t / 0.07 : t < 0.2 ? 1 - (t - 0.07) / 0.13 : 0;
      if (t > 0.2) {
        this.blinkT = 0;
        this.nextBlink = 2 + Math.random() * 4;
      }
    }
    this.state.lid = lid;
    for (const l of b.lids) rotateBoneWorld(l, _left, lid * 1.05);

    // gaze: eyes turn toward the target within comfortable limits (the head look-at does the rest)
    let yaw = 0;
    let pitch = 0;
    if (lookAt) {
      b.eyes[0].getWorldPosition(_eye);
      _to.subVectors(lookAt, _eye);
      const f = _to.dot(_fwd);
      if (f > 0.05) {
        yaw = THREE.MathUtils.clamp(Math.atan2(_to.dot(_left), f), -0.45, 0.45);
        pitch = THREE.MathUtils.clamp(Math.atan2(_to.dot(_up), f), -0.3, 0.3);
      }
    }
    this.state.gazeYaw = yaw;
    for (const e of b.eyes) {
      rotateBoneWorld(e, _up, yaw);
      rotateBoneWorld(e, _left, -pitch);
    }

    // jaw: syllable pulses while talking, closed otherwise
    this.talkT += dt;
    // syllables (~6 per second) inside phrases that rise and fall, with a short breath now and then
    const syll = 0.5 + 0.5 * Math.sin(this.talkT * 12);
    const phrase = 0.65 + 0.35 * Math.sin(this.talkT * 1.7);
    const breath = Math.sin(this.talkT * 0.6) > 0.97 ? 0 : 1;
    const want = talking ? syll * phrase * breath * 0.24 : 0;
    this.jawOpen += (want - this.jawOpen) * (1 - Math.exp(-18 * dt));
    this.state.jaw = this.jawOpen;
    rotateBoneWorld(b.jaw, _left, this.jawOpen);
  }
}
