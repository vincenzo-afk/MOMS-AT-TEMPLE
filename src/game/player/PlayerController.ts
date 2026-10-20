import * as THREE from "three";
import type { Input } from "../core/Input";
import type { CollisionWorld, RayHit } from "../world/CollisionWorld";
import { AUTHORED_SPRINT_SPEED, CharacterAnimator } from "./CharacterAnimator";
import { findRig, lookAt, plantFeet, rotateBoneWorld, solveTwoBone, type Rig } from "./IK";

// Rewritten in session 4: jumping, vaulting and climbing change the integration order (scripted moves own the
// position; air time owns vertical motion), which the single-loop session-1 controller could not express.

export const WALK_SPEED = 1.75;
export const RUN_SPEED = 3.9; // jog: matches the run_forward stride, so the feet do not slide
export const SPRINT_SPEED = AUTHORED_SPRINT_SPEED;
const CROUCH_SPEED = 1.2;
const FOCUS_SPEED = 1.7;
const ACCEL = 16; // m/s^2 toward the wanted velocity
const DECEL = 26;
const AIR_ACCEL = 4;
const TURN_RATE = 12; // rad/s at walking pace; less when sprinting (momentum arcs)
const SPRINT_BUILD = 0.85; // seconds of holding run before the jog builds into a sprint
const RADIUS = 0.3;
const HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.15;
const GRAVITY = 24;
const FALL_GRAVITY = 1.35; // falling is faster than rising: weighty, not floaty
const JUMP_HEIGHT = 0.6;
const ANTICIPATION = 0.08;
const COYOTE = 0.12;
const BUFFER = 0.15;
const HARD_LANDING = 1.7; // metres of fall
const INJURY_FALL = 3.6;

export type MoveState = "ground" | "anticipation" | "air" | "vault" | "climb" | "scripted";
export type LandKind = "soft" | "hard" | "injury";

interface Traverse {
  kind: "vault" | "climb";
  t: number;
  dur: number;
  from: THREE.Vector3;
  over: THREE.Vector3;
  to: THREE.Vector3;
  edge: THREE.Vector3; // point on the obstacle top edge where the hands go
  side: THREE.Vector3; // body right
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _target = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _hit: RayHit = { dist: Infinity, box: null };

/**
 * Third-person kinematic controller (GTA-style feel): camera-relative movement with acceleration and momentum,
 * walk/jog/sprint, jump with anticipation, coyote time and input buffering, fall arcs and landings, vault and
 * climb, crouch, focus strafing, scripted walks; then procedural animation (lean, foot planting, hand IK,
 * head look-at) on top of the clip blend.
 */
export class PlayerController {
  readonly object = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  vy = 0;
  grounded = true;
  locked = false; // true while an action animation plays
  crouched = false;
  state: MoveState = "ground";
  /** Seconds the run key has been held while moving (builds jog into sprint). */
  private runHeld = 0;
  private sinceGrounded = 0;
  private jumpBuffer = 0;
  private stateTime = 0;
  private peakY = 0;
  private lockTimer = 0;
  private limpTimer = 0;
  private traverse: Traverse | null = null;
  private auto: { target: THREE.Vector3; speed: number; onArrive: () => void; timeout: number } | null = null;
  private yawRate = 0;
  private lean = 0;
  private look = 0;
  /** World point the head turns toward (interaction focus, nearby speaker), or null. */
  lookTarget: THREE.Vector3 | null = null;
  /** Local offset of the model inside the root (seated pelvis placement). */
  readonly modelOffset = new THREE.Vector3();
  /** Runs after the clip blend and before the procedural layers (seat placement). Owns model.position when set. */
  poseHook: (() => void) | null = null;
  /** Floor height for foot planting while seated (null = normal ground planting). */
  seatFloor: number | null = null;
  readonly rig: Rig | null;
  /** Fired on touchdown with the fall height. */
  onLand: ((kind: LandKind, height: number) => void) | null = null;
  onJump: ((kind: "jump" | "vault" | "climb") => void) | null = null;
  /** Diagnostics for tests: last landing and the current gait. */
  readonly stats = { lastLand: null as null | { kind: LandKind; height: number }, gait: "idle" as "idle" | "walk" | "jog" | "sprint" | "crouch" | "focus", jumps: 0, vaults: 0, climbs: 0 };

  constructor(
    readonly model: THREE.Object3D,
    readonly animator: CharacterAnimator,
    private collision: CollisionWorld,
  ) {
    this.object.name = "Player";
    this.object.add(model);
    this.rig = findRig(model);
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }
  /** Current additive lean into the turn (radians; diagnostics). */
  get leanAngle(): number {
    return this.lean;
  }
  get airborne(): boolean {
    return this.state === "air" || this.state === "anticipation";
  }
  /** True while a move owns the body (vault, climb, scripted walk, hard landing). */
  get busy(): boolean {
    return this.state === "vault" || this.state === "climb" || this.lockTimer > 0;
  }

  teleport(pos: [number, number, number], yaw: number): void {
    this.object.position.set(...pos);
    this.object.position.y = this.collision.groundHeight(pos[0], pos[2], pos[1] + 0.3);
    this.yaw = yaw;
    this.velocity.set(0, 0, 0);
    this.vy = 0;
    this.state = "ground";
    this.traverse = null;
    this.auto = null;
    this.object.rotation.y = yaw;
  }

  faceTowards(target: THREE.Vector3): void {
    this.yaw = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    this.object.rotation.y = this.yaw;
  }

  /** Walk (scripted) to a point, then call onArrive. Used for the sit-down approach. */
  walkTo(target: THREE.Vector3, onArrive: () => void, speed = WALK_SPEED): void {
    this.auto = { target: target.clone(), speed, onArrive, timeout: 4 };
    this.state = "scripted";
  }

  cancelScripted(): void {
    this.auto = null;
    if (this.state === "scripted") this.state = "ground";
  }

  /** Queue a jump (Space). Buffered for 150 ms so a press just before landing still jumps. */
  requestJump(): void {
    this.jumpBuffer = BUFFER;
  }

  update(dt: number, input: Input, cameraYaw: number): void {
    this.stateTime += dt;
    this.lockTimer = Math.max(0, this.lockTimer - dt);
    this.limpTimer = Math.max(0, this.limpTimer - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.state === "vault" || this.state === "climb") {
      this.updateTraverse(dt);
      this.animate(dt, 0, 0, 1, false);
      return;
    }
    const p = this.position;
    const prevYaw = this.yaw;

    // ---- intent
    const axis = this.locked || this.lockTimer > 0 ? null : input.moveAxis();
    let ax = axis?.x ?? 0;
    let az = axis?.z ?? 0;
    if (this.state === "scripted" && this.auto) {
      _v.subVectors(this.auto.target, p).setY(0);
      this.auto.timeout -= dt;
      if (_v.length() < 0.1 || this.auto.timeout <= 0) {
        const done = this.auto.onArrive;
        this.auto = null;
        this.state = "ground";
        this.velocity.set(0, 0, 0);
        done();
      } else {
        _v.normalize();
        // convert the world direction to camera-space intent so the same integrator drives it
        const s = Math.sin(cameraYaw);
        const c = Math.cos(cameraYaw);
        ax = _v.x * c - _v.z * s;
        az = _v.x * s + _v.z * c;
      }
    }
    const len = Math.min(1, Math.hypot(ax, az));
    const focus = input.focusHeld && !this.crouched && this.state !== "scripted";
    if (input.wasPressed("crouch") && this.grounded && !this.locked) this.crouched = !this.crouched;
    const running = len > 0 && input.isDown("run") && !this.crouched && !focus;
    this.runHeld = running ? this.runHeld + dt : 0;

    // wanted horizontal velocity (world)
    _target.set(0, 0, 0);
    if (len > 0) {
      const s = Math.sin(cameraYaw);
      const c = Math.cos(cameraYaw);
      const ix = ax / (Math.hypot(ax, az) || 1);
      const iz = az / (Math.hypot(ax, az) || 1);
      _target.set(ix * c + iz * s, 0, -ix * s + iz * c);
      let speed = this.state === "scripted" && this.auto ? this.auto.speed : WALK_SPEED * Math.max(0.35, len);
      if (running) speed = this.runHeld > SPRINT_BUILD ? SPRINT_SPEED : RUN_SPEED;
      if (this.crouched) speed = CROUCH_SPEED;
      if (focus) speed = input.isDown("run") ? 2.6 : FOCUS_SPEED;
      if (this.limpTimer > 0) speed = Math.min(speed, 1.3);
      _target.multiplyScalar(speed);
    }

    // ---- facing: follow the movement direction; focus keeps facing the camera direction
    let turnDir = 0;
    const speedNow = Math.hypot(this.velocity.x, this.velocity.z);
    if (focus) {
      this.turnTowards(cameraYaw + Math.PI, TURN_RATE * 1.5, dt);
    } else if (len > 0) {
      const want = Math.atan2(_target.x, _target.z);
      const sprintK = THREE.MathUtils.clamp((speedNow - RUN_SPEED) / (SPRINT_SPEED - RUN_SPEED), 0, 1);
      const d = this.turnTowards(want, THREE.MathUtils.lerp(TURN_RATE, 5.5, sprintK), dt);
      if (Math.abs(d) > 0.6) turnDir = Math.sign(d);
    }
    this.object.rotation.y = this.yaw;

    // ---- horizontal velocity with momentum
    const onGround = this.state === "ground" || this.state === "scripted" || this.state === "anticipation";
    if (onGround && !focus && _target.lengthSq() > RUN_SPEED * RUN_SPEED * 1.01) {
      // at a sprint the body leads: velocity runs along the facing, so turns become arcs (no skating)
      const sp = _target.length();
      _target.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(sp);
    }
    _v.set(this.velocity.x, 0, this.velocity.z);
    _w.subVectors(_target, _v);
    const gaining = _target.lengthSq() >= _v.lengthSq() && _target.dot(_v) >= 0;
    const rate = onGround ? (gaining ? ACCEL : DECEL) : AIR_ACCEL;
    const step = rate * dt;
    if (_w.length() > step) _w.setLength(step);
    this.velocity.x += _w.x;
    this.velocity.z += _w.z;
    if (len === 0 && Math.hypot(this.velocity.x, this.velocity.z) < 0.05) this.velocity.x = this.velocity.z = 0;

    // ---- jump / vault / climb (buffered press + coyote time)
    if (input.wasPressed("jump")) this.requestJump();
    if (this.jumpBuffer > 0 && !this.locked && this.lockTimer <= 0 && this.state !== "scripted" && this.state !== "anticipation" && (this.grounded || this.sinceGrounded < COYOTE) && this.state !== "air") {
      this.jumpBuffer = 0;
      if (!this.tryTraverse()) {
        this.crouched = false;
        this.state = "anticipation";
        this.stateTime = 0;
        this.animator.setAir("start");
      }
    }
    if (this.state === "anticipation" && this.stateTime >= ANTICIPATION) {
      this.state = "air";
      this.vy = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
      this.grounded = false;
      this.peakY = p.y;
      this.stats.jumps++;
      this.animator.setAir("air");
      this.onJump?.("jump");
    }

    // ---- integrate horizontal movement with collision
    const height = this.crouched ? CROUCH_HEIGHT : HEIGHT;
    let nx = p.x + this.velocity.x * dt;
    let nz = p.z + this.velocity.z * dt;
    [nx, nz] = this.collision.resolve(nx, nz, p.y, RADIUS, height);
    const moved = Math.hypot(nx - p.x, nz - p.z) / Math.max(dt, 1e-4);
    // walking into a wall: keep only the velocity that actually happened (no pushing against geometry)
    if (onGround && moved < Math.hypot(this.velocity.x, this.velocity.z) * 0.5 && len > 0) {
      const k = moved / (Math.hypot(this.velocity.x, this.velocity.z) || 1);
      this.velocity.x *= Math.max(k, 0.3);
      this.velocity.z *= Math.max(k, 0.3);
    }
    p.x = nx;
    p.z = nz;

    // ---- vertical
    const ground = this.collision.groundHeight(p.x, p.z, p.y);
    if (this.state === "air") {
      this.vy -= GRAVITY * (this.vy < 0 ? FALL_GRAVITY : 1) * dt;
      p.y += this.vy * dt;
      if (p.y > this.peakY) this.peakY = p.y;
      if (this.vy < -4 && this.peakY - p.y > 1.4) this.animator.setAir("fall");
      if (p.y <= ground && this.vy <= 0) {
        p.y = ground;
        this.touchDown();
      }
    } else if (ground >= p.y - 0.02) {
      p.y = THREE.MathUtils.lerp(p.y, ground, 1 - Math.exp(-25 * dt));
      if (Math.abs(p.y - ground) < 0.005) p.y = ground;
      this.vy = 0;
      this.grounded = true;
      this.sinceGrounded = 0;
    } else if (p.y - ground > 0.45 && onGround) {
      // walked off a ledge: become airborne (coyote time still allows a jump for a moment)
      this.state = "air";
      this.vy = 0;
      this.peakY = p.y;
      this.grounded = false;
      this.animator.setAir("air");
    } else {
      // small step down: follow the ground quickly without an air state
      this.vy -= GRAVITY * dt;
      p.y = Math.max(ground, p.y + this.vy * dt);
      if (p.y <= ground + 0.01) {
        this.vy = 0;
        this.grounded = true;
        this.sinceGrounded = 0;
      }
    }
    if (!this.grounded) this.sinceGrounded += dt;

    this.yawRate = THREE.MathUtils.lerp(this.yawRate, Math.atan2(Math.sin(this.yaw - prevYaw), Math.cos(this.yaw - prevYaw)) / Math.max(dt, 1e-4), 1 - Math.exp(-10 * dt));
    this.animator.setTurning(turnDir);
    const achieved = Math.min(moved, Math.hypot(this.velocity.x, this.velocity.z));
    // body-frame direction of the achieved velocity for the directional blend
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const vl = Math.hypot(this.velocity.x, this.velocity.z) || 1;
    const dirZ = (this.velocity.x * fx + this.velocity.z * fz) / vl;
    const dirX = (this.velocity.x * -fz + this.velocity.z * fx) / vl;
    this.stats.gait = this.crouched ? "crouch" : focus ? "focus" : achieved < 0.1 ? "idle" : achieved < 2.6 ? "walk" : achieved < 4.6 ? "jog" : "sprint";
    this.animate(dt, achieved, dirX, dirZ, focus);
  }

  private turnTowards(want: number, rate: number, dt: number): number {
    const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    this.yaw += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    return d;
  }

  private touchDown(): void {
    const height = this.peakY - this.position.y;
    this.state = "ground";
    this.vy = 0;
    this.grounded = true;
    this.sinceGrounded = 0;
    let kind: LandKind = "soft";
    if (height >= INJURY_FALL) kind = "injury";
    else if (height >= HARD_LANDING) kind = "hard";
    this.animator.land(kind === "soft" ? "soft" : "hard");
    if (kind === "hard") {
      this.lockTimer = 0.45;
      this.velocity.multiplyScalar(0.2);
    } else if (kind === "injury") {
      this.lockTimer = 0.9;
      this.limpTimer = 6;
      this.velocity.set(0, 0, 0);
    } else this.velocity.multiplyScalar(0.85);
    this.stats.lastLand = { kind, height: Math.round(height * 100) / 100 };
    this.onLand?.(kind, height);
  }

  /**
   * Space near an obstacle: vault over a thin waist-high one, or climb a walkable ledge up to 2.1 m.
   * Probes with rays at knee height along the facing; returns true when a traverse started.
   */
  private tryTraverse(): boolean {
    const p = this.position;
    _fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    _right.set(_fwd.z, 0, -_fwd.x);
    _origin.set(p.x, p.y + 0.35, p.z);
    this.collision.raycastHit(_origin, _fwd, 1.0, _hit, 0.2);
    let box = _hit.box;
    let dist = _hit.dist;
    if (!box) {
      _origin.y = p.y + 1.3; // a ledge face at chest height (climb)
      this.collision.raycastHit(_origin, _fwd, 0.9, _hit, 0.2);
      box = _hit.box;
      dist = _hit.dist;
    }
    if (!box) return false;
    const top = box.yMax;
    const h = top - p.y;
    const face = _w.copy(p).addScaledVector(_fwd, dist);
    if (h > 0.3 && h <= 1.2) {
      // vault: find the landing beyond the obstacle
      for (let d = 0.35; d <= 1.6; d += 0.1) {
        _v.copy(face).addScaledVector(_fwd, d);
        if (this.collision.topAt(_v.x, _v.z, top - 0.05, top + 0.05) > -Infinity) continue; // still on top of it
        const g = this.collision.groundHeight(_v.x, _v.z, p.y + 0.4);
        if (Math.abs(g - p.y) > 0.6) return false; // a drop or a rise on the far side: not a vault
        // just past the far edge the capsule still touches the obstacle: keep looking a little further out
        if (!this.collision.clear(_v.x, _v.z, g, RADIUS, HEIGHT)) continue;
        const to = new THREE.Vector3(_v.x, g, _v.z).addScaledVector(_fwd, 0.25);
        if (!this.collision.clear(to.x, to.z, g, RADIUS, HEIGHT)) return false;
        this.startTraverse("vault", 0.65, face, top, to);
        return true;
      }
      return false;
    }
    if (h > 1.2 && h <= 2.15 && box.walk) {
      _v.copy(face).addScaledVector(_fwd, 0.45);
      if (!this.collision.clear(_v.x, _v.z, top, RADIUS, HEIGHT)) return false;
      this.startTraverse("climb", 1.1, face, top, new THREE.Vector3(_v.x, top, _v.z));
      return true;
    }
    return false;
  }

  private startTraverse(kind: "vault" | "climb", dur: number, face: THREE.Vector3, top: number, to: THREE.Vector3): void {
    const from = this.position.clone();
    const over = new THREE.Vector3(face.x, top + (kind === "vault" ? 0.12 : 0), face.z).addScaledVector(_fwd, kind === "vault" ? 0.25 : 0.1);
    this.traverse = { kind, t: 0, dur, from, over, to, edge: new THREE.Vector3(face.x, top, face.z), side: _right.clone() };
    this.state = kind;
    this.crouched = false;
    this.velocity.set(0, 0, 0);
    this.animator.play(kind, { once: true });
    if (kind === "vault") this.stats.vaults++;
    else this.stats.climbs++;
    this.onJump?.(kind);
  }

  private updateTraverse(dt: number): void {
    const tr = this.traverse!;
    tr.t += dt;
    const u = Math.min(1, tr.t / tr.dur);
    const p = this.position;
    if (tr.kind === "vault") {
      // arc: up onto the top, over, and down beyond (quadratic Bezier through `over`)
      const a = 1 - u;
      p.set(a * a * tr.from.x + 2 * a * u * tr.over.x + u * u * tr.to.x, 0, a * a * tr.from.z + 2 * a * u * tr.over.z + u * u * tr.to.z);
      const lift = Math.sin(Math.PI * u);
      p.y = THREE.MathUtils.lerp(tr.from.y, tr.to.y, u) + lift * Math.max(0, tr.over.y - Math.min(tr.from.y, tr.to.y) - 0.35);
    } else {
      // climb: rise up the face while hanging, then move onto the top
      const rise = THREE.MathUtils.smoothstep(u, 0.1, 0.7);
      const onto = THREE.MathUtils.smoothstep(u, 0.55, 1);
      p.x = THREE.MathUtils.lerp(tr.from.x, tr.to.x, onto);
      p.z = THREE.MathUtils.lerp(tr.from.z, tr.to.z, onto);
      p.y = THREE.MathUtils.lerp(tr.from.y, tr.to.y, rise);
    }
    if (u >= 1) {
      p.copy(tr.to);
      this.traverse = null;
      this.state = "ground";
      this.grounded = true;
      this.vy = 0;
      this.animator.stopAction();
    }
  }

  /** Clip blend, then the procedural layers (seat offset, lean, foot planting, hand IK, look-at). */
  private animate(dt: number, speed: number, dirX: number, dirZ: number, focus: boolean): void {
    this.animator.setLocomotion({ speed, dirX, dirZ, crouch: this.crouched, strafe: focus });
    this.animator.update(dt);
    if (this.poseHook) this.poseHook();
    else this.model.position.copy(this.modelOffset);
    const rig = this.rig;
    if (!rig) return;
    this.object.updateMatrixWorld(true);

    // lean into turns, proportional to speed x yaw rate (additive on the spine and chest)
    const wantLean = this.state === "ground" ? THREE.MathUtils.clamp(-this.yawRate * speed * 0.045, -0.3, 0.3) : 0;
    this.lean = THREE.MathUtils.lerp(this.lean, wantLean, 1 - Math.exp(-8 * dt));
    if (Math.abs(this.lean) > 0.002) {
      _fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      rotateBoneWorld(rig.hips, _fwd, this.lean * 0.35);
      rotateBoneWorld(rig.spine, _fwd, this.lean * 0.4);
      rotateBoneWorld(rig.chest, _fwd, this.lean * 0.25);
      this.object.updateMatrixWorld(true);
    }

    // feet on the ground: full weight standing and walking, fading out at a run and in the air
    const plant = this.seatFloor !== null ? 1 : this.state === "ground" || this.state === "scripted" ? THREE.MathUtils.clamp(1 - (speed - 1.5) / 2.5, 0, 1) : 0;
    plantFeet(rig, this.position.y, plant, (x, z, y) => this.collision.groundHeight(x, z, y), this.seatFloor ?? undefined);

    // hands on the obstacle while vaulting or climbing
    const tr = this.traverse;
    if (tr) {
      const u = tr.t / tr.dur;
      const w = tr.kind === "vault" ? Math.sin(Math.PI * THREE.MathUtils.clamp((u - 0.1) / 0.5, 0, 1)) : THREE.MathUtils.clamp(1 - Math.max(0, u - 0.55) / 0.35, 0, 1) * THREE.MathUtils.smoothstep(u, 0, 0.12);
      for (let i = 0; i < 2; i++) {
        if (tr.kind === "vault" && i === 1) continue; // one-handed vault (left hand plants)
        _hand.copy(tr.edge).addScaledVector(tr.side, (i === 0 ? -1 : 1) * 0.2);
        rig.forearm[i]!.getWorldPosition(_pole);
        _pole.y -= 0.3;
        solveTwoBone(rig.upperArm[i]!, rig.forearm[i]!, rig.hand[i]!, _hand, w, _pole);
      }
    }

    // head tracking toward points of interest
    const wantLook = this.lookTarget && this.state !== "vault" && this.state !== "climb" ? 1 : 0;
    this.look = THREE.MathUtils.lerp(this.look, wantLook, 1 - Math.exp(-5 * dt));
    if (this.lookTarget && this.look > 0.01) lookAt(rig, this.lookTarget, this.look * 0.85);
  }
}
