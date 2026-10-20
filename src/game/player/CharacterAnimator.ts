import * as THREE from "three";

// Authored locomotion: metres travelled per cycle of each in-place clip (see docs/ANIMATION_SPEC.md).
export const WALK_STRIDE_PER_CYCLE = 1.65; // walk_forward, 1.0 s cycle -> 1.65 m/s at timeScale 1
export const RUN_STRIDE_PER_CYCLE = 2.6; // run_forward, 0.667 s cycle -> 3.9 m/s
export const AUTHORED_WALK_SPEED = 1.65;
export const AUTHORED_RUN_SPEED = 3.9;

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
  | "idle_look_around";
export type LoopAction = "talk_idle" | "talk_listen" | "craft_at_station" | "repair_channel" | "make_garland" | "trade_counter" | "read_record" | "sit_idle" | "rest_idle" | "harvest_plant" | "place_object";

const FADE = 0.22;

/**
 * Locomotion blend (idle/walk/run with phase-synchronised cycles) plus exclusive actions.
 * While an action plays, locomotion weights fade to zero, so unrelated clips never mix.
 */
export class CharacterAnimator {
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private phase = 0;
  /** Normalised locomotion cycle position (0..1), used to time footsteps. */
  get cyclePhase(): number {
    return this.phase;
  }
  private locoWeight = 1;
  private current: { name: string; action: THREE.AnimationAction; once: boolean; onDone?: () => void } | null = null;
  private turn = 0; // -1 right, 0 none, 1 left
  readonly missing: string[] = [];

  /**
   * walkSpeed/runSpeed are the character's gameplay speeds: at or below walkSpeed only the walk cycle
   * plays (sped up so the stride still matches), at runSpeed only the run cycle.
   */
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
    }
    for (const n of ["idle_relaxed", "walk_forward", "run_forward"]) if (!this.actions.has(n)) this.missing.push(n);
    for (const n of ["walk_forward", "run_forward"]) {
      const a = this.actions.get(n);
      if (a) a.timeScale = 0; // driven manually by phase
    }
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
  has(name: string): boolean {
    return this.actions.has(name);
  }
  /** Effective weight per clip (diagnostics and tests). */
  weights(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [n, a] of this.actions) out[n] = Math.round(a.getEffectiveWeight() * 100) / 100;
    return out;
  }

  play(name: OneShot | LoopAction, opts: { once: boolean; onDone?: () => void }): boolean {
    const a = this.actions.get(name);
    if (!a) return false;
    if (this.current && this.current.action !== a) this.current.action.fadeOut(FADE);
    a.reset();
    a.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    a.setEffectiveTimeScale(1);
    a.setEffectiveWeight(1);
    a.fadeIn(FADE);
    a.play();
    this.current = { name, action: a, once: opts.once, onDone: opts.onDone };
    return true;
  }

  stopAction(): void {
    const cur = this.current;
    if (!cur) return;
    cur.action.fadeOut(FADE);
    this.current = null;
    cur.onDone?.();
  }

  setTurning(dir: number): void {
    this.turn = dir;
  }

  /** speed in m/s (horizontal). */
  update(dt: number, speed: number): void {
    const targetLoco = this.current ? 0 : 1;
    this.locoWeight += (targetLoco - this.locoWeight) * Math.min(1, dt / FADE);

    const k = THREE.MathUtils.clamp((speed - this.walkSpeed) / (this.runSpeed - this.walkSpeed), 0, 1);
    const stride = THREE.MathUtils.lerp(WALK_STRIDE_PER_CYCLE, RUN_STRIDE_PER_CYCLE, k);
    this.phase = (this.phase + (speed / stride) * dt) % 1;
    const move = THREE.MathUtils.clamp(speed / 0.6, 0, 1);
    const turning = this.turn !== 0 && speed < 0.4 ? 1 : 0;

    const idle = this.actions.get("idle_relaxed");
    const walk = this.actions.get("walk_forward");
    const run = this.actions.get("run_forward");
    const tl = this.actions.get("turn_left");
    const tr = this.actions.get("turn_right");
    const w = this.locoWeight;
    if (walk) {
      walk.time = this.phase * walk.getClip().duration;
      walk.setEffectiveWeight(w * move * (1 - k));
    }
    if (run) {
      run.time = this.phase * run.getClip().duration;
      run.setEffectiveWeight(w * move * k);
    }
    if (tl) tl.setEffectiveWeight(w * (1 - move) * (this.turn > 0 ? turning : 0));
    if (tr) tr.setEffectiveWeight(w * (1 - move) * (this.turn < 0 ? turning : 0));
    if (idle) idle.setEffectiveWeight(w * (1 - move) * (1 - turning));
    this.mixer.update(dt);
  }
}
