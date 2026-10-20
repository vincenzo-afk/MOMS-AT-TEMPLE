import * as THREE from "three";

// Authored locomotion: metres travelled per cycle of each in-place clip (see docs/ANIMATION_SPEC.md).
export const WALK_STRIDE_PER_CYCLE = 1.65; // walk_forward, 1.0 s cycle -> 1.65 m/s at timeScale 1
export const RUN_STRIDE_PER_CYCLE = 2.6; // run_forward (jog), 0.667 s cycle -> 3.9 m/s
export const SPRINT_STRIDE_PER_CYCLE = 3.7; // sprint_forward, 0.6 s cycle -> 6.2 m/s
export const BACK_STRIDE_PER_CYCLE = 1.3; // walk_back
export const STRAFE_STRIDE_PER_CYCLE = 1.2; // strafe_left / strafe_right
export const CROUCH_STRIDE_PER_CYCLE = 1.0; // crouch_walk
export const AUTHORED_WALK_SPEED = 1.65;
export const AUTHORED_RUN_SPEED = 3.9;
export const AUTHORED_SPRINT_SPEED = 6.2;

export type OneShot =
  | "interact_reach"
  | "pickup_ground"
  | "talk_gesture"
  | "greet"
  | "gather_flower"
  | "water_plant"
  | "plant_seed"
  | "harvest_plant"
  | "open_container"
  | "inspect_object"
  | "place_object"
  | "give_item"
  | "receive_item"
  | "idle_look_around"
  | "idle_fidget_shift"
  | "idle_fidget_stretch"
  | "sit_down"
  | "stand_up"
  | "vault"
  | "climb"
  | "coconut_smash"
  | "light_lamp"
  | "apply_vibhuti"
  | "scold";
export type LoopAction =
  | "talk_idle"
  | "talk_listen"
  | "craft_at_station"
  | "repair_channel"
  | "make_garland"
  | "trade_counter"
  | "read_record"
  | "sit_idle"
  | "rest_idle"
  | "harvest_plant"
  | "place_object"
  | "pray_idle"
  | "photo_pose"
  | "drive_seated"
  | "queue_shuffle";

/** Crossfade time constant: weights reach ~95% of a new target in about 0.2 s (150-250 ms fades). */
const TAU = 0.068;
const FIDGETS = ["idle_fidget_shift", "idle_fidget_stretch", "idle_look_around"] as const;

export interface LocoInput {
  /** horizontal speed actually achieved (m/s) */
  speed: number;
  /** velocity direction in the body frame: x = right, z = forward (unit or zero) */
  dirX: number;
  dirZ: number;
  crouch: boolean;
  /** true while the body faces the camera (strafe/backpedal set); false = body faces its velocity */
  strafe: boolean;
}

type AirPhase = "none" | "start" | "air" | "fall";

/**
 * Animation state machine for humanoids. Ground locomotion is a phase-synchronised directional blend; air and
 * landing states and exclusive actions sit on top. All clip weights are smoothed toward per-frame targets and
 * renormalised to sum to 1, so a crossfade can never blend in the bind (T) pose.
 */
export class CharacterAnimator {
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private weightsNow = new Map<string, number>();
  private targets = new Map<string, number>();
  private phase = 0;
  /** Normalised locomotion cycle position (0..1), used to time footsteps. */
  get cyclePhase(): number {
    return this.phase;
  }
  private current: { name: string; action: THREE.AnimationAction; once: boolean; onDone?: () => void } | null = null;
  private turn = 0; // -1 right, 0 none, 1 left
  private loco: LocoInput = { speed: 0, dirX: 0, dirZ: 1, crouch: false, strafe: false };
  private air: AirPhase = "none";
  private landing: { name: string; t: number; dur: number } | null = null;
  private idleTime = 0;
  private nextFidget = 9 + Math.random() * 5;
  /** Set false for NPCs, whose schedules drive their own idles. */
  fidgets = true;
  readonly missing: string[] = [];

  constructor(
    root: THREE.Object3D,
    clips: THREE.AnimationClip[],
    private walkSpeed = AUTHORED_WALK_SPEED,
    private runSpeed = AUTHORED_RUN_SPEED,
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of clips) {
      const a = this.mixer.clipAction(clip);
      a.enabled = true;
      a.setEffectiveWeight(0);
      a.play();
      this.actions.set(clip.name, a);
      this.weightsNow.set(clip.name, 0);
    }
    for (const n of ["idle_relaxed", "walk_forward", "run_forward"]) if (!this.actions.has(n)) this.missing.push(n);
    // cycle clips are driven by phase, not by the mixer clock
    for (const n of ["walk_forward", "run_forward", "sprint_forward", "walk_back", "strafe_left", "strafe_right", "crouch_walk"]) {
      const a = this.actions.get(n);
      if (a) a.timeScale = 0;
    }
    this.weightsNow.set("idle_relaxed", 1);
    this.actions.get("idle_relaxed")?.setEffectiveWeight(1);
    this.mixer.addEventListener("finished", (e) => {
      const cur = this.current;
      if (cur && (e as unknown as { action: THREE.AnimationAction }).action === cur.action && cur.once) this.stopAction();
    });
  }

  get busy(): boolean {
    return this.current !== null;
  }
  get currentAction(): string | null {
    return this.current?.name ?? null;
  }
  get airborne(): boolean {
    return this.air !== "none";
  }
  has(name: string): boolean {
    return this.actions.has(name);
  }
  /** Effective weight per clip (diagnostics and tests). */
  weights(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [n, a] of this.actions) out[n] = Math.round(a.getEffectiveWeight() * 100) / 100;
    return out;
  }
  /** Sum of all clip weights (1 when the pose is fully defined by clips; used by the T-pose detector test). */
  totalWeight(): number {
    let s = 0;
    for (const a of this.actions.values()) s += a.getEffectiveWeight();
    return s;
  }

  play(name: OneShot | LoopAction, opts: { once: boolean; onDone?: () => void; timeScale?: number }): boolean {
    const a = this.actions.get(name);
    if (!a) return false;
    if (this.current && this.current.action !== a) {
      const prev = this.current;
      this.current = null;
      if (prev.name !== name) prev.onDone?.();
    }
    a.reset();
    a.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = opts.timeScale ?? 1;
    a.play();
    this.current = { name, action: a, once: opts.once, onDone: opts.onDone };
    this.idleTime = 0;
    return true;
  }

  stopAction(): void {
    const cur = this.current;
    if (!cur) return;
    this.current = null;
    cur.onDone?.();
  }

  setTurning(dir: number): void {
    this.turn = dir;
  }

  /** Air phases: "start" (anticipation dip), "air" (tucked), "fall" (long fall), "none" (grounded). */
  setAir(phase: AirPhase): void {
    if (phase === this.air) return;
    const restart = (n: string, ts = 1) => {
      const a = this.actions.get(n);
      if (!a) return;
      a.reset();
      a.setLoop(n === "fall_loop" ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      a.clampWhenFinished = true;
      a.timeScale = ts;
      a.play();
    };
    if (phase === "start") restart("jump_start", 2); // 0.1 s anticipation
    if (phase === "air") restart("jump_air");
    if (phase === "fall") restart("fall_loop");
    this.air = phase;
    if (phase !== "none") this.landing = null;
  }

  /** Touch down: soft (absorb with the knees) or hard (deep crouch, hand to the ground). */
  land(kind: "soft" | "hard"): void {
    this.air = "none";
    const name = kind === "hard" ? "land_hard" : "land_soft";
    const a = this.actions.get(name);
    if (!a) return;
    a.reset();
    a.setLoop(THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = 1;
    a.play();
    this.landing = { name, t: 0, dur: a.getClip().duration };
  }

  /** Per-frame locomotion input (preferred). `update(dt, speed)` keeps working for simple callers (NPCs). */
  setLocomotion(input: LocoInput): void {
    this.loco = input;
  }

  update(dt: number, speed?: number): void {
    if (speed !== undefined) {
      this.loco.speed = speed;
      this.loco.dirX = 0;
      this.loco.dirZ = 1;
      this.loco.strafe = false;
    }
    const L = this.loco;
    this.targets.clear();
    const set = (n: string, w: number) => {
      if (w > 0 && this.actions.has(n)) this.targets.set(n, (this.targets.get(n) ?? 0) + w);
    };

    // fidgets: after standing still for a while, play a small idle variation (interrupted by moving)
    if (this.fidgets && !this.current && this.air === "none" && !this.landing && L.speed < 0.1 && !L.crouch) {
      this.idleTime += dt;
      if (this.idleTime > this.nextFidget) {
        const pick = FIDGETS.filter((n) => this.actions.has(n));
        if (pick.length) this.play(pick[Math.floor(Math.random() * pick.length)]!, { once: true });
        this.idleTime = 0;
        this.nextFidget = 7 + Math.random() * 7;
      }
    } else if (!this.current) this.idleTime = 0;
    if (this.current && FIDGETS.includes(this.current.name as (typeof FIDGETS)[number]) && (L.speed > 0.2 || this.air !== "none")) this.stopAction();

    if (this.landing) {
      this.landing.t += dt;
      if (this.landing.t >= this.landing.dur) this.landing = null;
    }

    // ---- ground locomotion targets (phase synchronised)
    const fwd = L.strafe ? Math.max(0, L.dirZ) : 1;
    const back = L.strafe ? Math.max(0, -L.dirZ) : 0;
    const side = L.strafe ? L.dirX : 0;
    const move = THREE.MathUtils.clamp(L.speed / 0.5, 0, 1);
    let stride: number;
    let locoTargets: Array<[string, number]>;
    if (L.crouch) {
      stride = CROUCH_STRIDE_PER_CYCLE;
      locoTargets = [
        ["crouch_idle", 1 - move],
        ["crouch_walk", move],
      ];
    } else {
      const jog = THREE.MathUtils.clamp((L.speed - this.walkSpeed) / (this.runSpeed - this.walkSpeed), 0, 1);
      const sprint = THREE.MathUtils.clamp((L.speed - this.runSpeed) / (AUTHORED_SPRINT_SPEED - this.runSpeed), 0, 1);
      const fwdStride = sprint > 0 ? THREE.MathUtils.lerp(RUN_STRIDE_PER_CYCLE, SPRINT_STRIDE_PER_CYCLE, sprint) : THREE.MathUtils.lerp(WALK_STRIDE_PER_CYCLE, RUN_STRIDE_PER_CYCLE, jog);
      const wf = Math.abs(fwd) + Math.abs(back) + Math.abs(side) || 1;
      const kf = fwd / wf;
      const kb = back / wf;
      const ks = Math.abs(side) / wf;
      stride = fwdStride * kf + BACK_STRIDE_PER_CYCLE * kb * (1 + jog) + STRAFE_STRIDE_PER_CYCLE * ks * (1 + jog);
      const turning = this.turn !== 0 && L.speed < 0.4 ? 1 : 0;
      locoTargets = [
        ["idle_relaxed", (1 - move) * (1 - turning)],
        ["turn_left", (1 - move) * (this.turn > 0 ? turning : 0)],
        ["turn_right", (1 - move) * (this.turn < 0 ? turning : 0)],
        ["walk_forward", move * kf * (1 - jog)],
        ["run_forward", move * kf * jog * (1 - sprint)],
        ["sprint_forward", move * kf * sprint],
        ["walk_back", move * kb],
        ["strafe_left", move * ks * (side < 0 ? 1 : 0)],
        ["strafe_right", move * ks * (side > 0 ? 1 : 0)],
      ];
    }
    if (L.speed > 0.01) this.phase = (this.phase + (L.speed / Math.max(0.3, stride)) * dt) % 1;
    for (const n of ["walk_forward", "run_forward", "sprint_forward", "walk_back", "strafe_left", "strafe_right", "crouch_walk"]) {
      const a = this.actions.get(n);
      if (a) a.time = this.phase * a.getClip().duration;
    }

    // ---- layer priority: action > air > landing > locomotion
    if (this.current) set(this.current.name, 1);
    else if (this.air !== "none") {
      set(this.air === "start" ? "jump_start" : this.air === "fall" ? "fall_loop" : "jump_air", 1);
    } else if (this.landing) {
      // blend the landing over the locomotion pose as it finishes so movement resumes smoothly
      const k = this.landing.name === "land_hard" ? 1 - THREE.MathUtils.smoothstep(this.landing.t / this.landing.dur, 0.7, 1) : 1 - THREE.MathUtils.smoothstep(this.landing.t / this.landing.dur, 0.4, 1);
      set(this.landing.name, k);
      for (const [n, w] of locoTargets) set(n, w * (1 - k));
    } else for (const [n, w] of locoTargets) set(n, w);
    if (this.targets.size === 0) set("idle_relaxed", 1);

    // ---- smooth toward targets, then renormalise so the weights always sum to 1
    const k = 1 - Math.exp(-dt / TAU);
    let sum = 0;
    for (const [n, w] of this.weightsNow) {
      const nw = w + ((this.targets.get(n) ?? 0) - w) * k;
      const v = nw < 0.002 ? 0 : nw;
      this.weightsNow.set(n, v);
      sum += v;
    }
    if (sum < 1e-4) {
      for (const [n, w] of this.targets) this.weightsNow.set(n, w);
      sum = [...this.targets.values()].reduce((a, b) => a + b, 0) || 1;
    }
    for (const [n, a] of this.actions) a.setEffectiveWeight((this.weightsNow.get(n) ?? 0) / sum);
    this.mixer.update(dt);
  }
}
