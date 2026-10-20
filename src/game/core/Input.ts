// Keyboard, mouse and gamepad input. Bindings are data: the defaults below can be overridden per action
// from Settings.keyBindings (remapping), and the help screen reads the same table.

export const BINDINGS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  run: ["ShiftLeft", "ShiftRight"],
  interact: ["KeyE"],
  secondary: ["KeyR"],
  inventory: ["KeyI"],
  journal: ["KeyJ"],
  record: ["KeyL"],
  map: ["KeyM"],
  community: ["KeyC"],
  pause: ["Escape"],
} as const;

export type Binding = keyof typeof BINDINGS;

/** Actions the player may remap (Escape stays fixed so a menu is always reachable). */
export const REMAPPABLE: Array<[Binding, string]> = [
  ["forward", "Move forward"],
  ["back", "Move back"],
  ["left", "Move left"],
  ["right", "Move right"],
  ["run", "Run"],
  ["interact", "Interact"],
  ["secondary", "Secondary action"],
  ["inventory", "Inventory"],
  ["journal", "Journal"],
  ["record", "Living Record"],
  ["map", "Map"],
  ["community", "Community"],
];

export const CONTROLS_HELP: Array<[string, string]> = [
  ["W A S D", "Move"],
  ["Shift", "Run"],
  ["Mouse", "Look around (click the scene to capture the mouse, or hold the right button)"],
  ["Mouse wheel", "Camera distance"],
  ["E", "Interact"],
  ["R", "Secondary action (e.g. inspect)"],
  ["I", "Inventory"],
  ["J", "Journal"],
  ["L", "Living Record"],
  ["M", "Map"],
  ["C", "Community and skills"],
  ["Esc", "Pause / close panel"],
  ["Gamepad", "Left stick move · right stick look · A interact · X secondary · B back · LT run · LB inventory · RB map · Y journal · View record · Start pause"],
];

/** Standard-mapping gamepad buttons per action. */
const PAD_BUTTONS: Partial<Record<Binding, number[]>> = {
  interact: [0],
  secondary: [2],
  pause: [9],
  journal: [3],
  inventory: [4],
  map: [5],
  record: [8],
};

export type PadNav = "up" | "down" | "accept" | "back" | null;

const ARROWS: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
export const keyLabel = (code: string) =>
  ARROWS[code] ?? code.replace(/^Key/, "").replace(/^Digit/, "").replace(/Left$/, " L").replace(/Right$/, " R");

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private bindings: Record<Binding, readonly string[]> = { ...BINDINGS };
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  enabled = true;
  private dragging = false;
  private onLockChange: ((locked: boolean) => void) | null = null;
  // gamepad state
  private padPrev: boolean[] = [];
  private padPressed = new Set<number>();
  private padDown = new Set<number>();
  private padMove = { x: 0, z: 0 };
  private padRun = false;
  /** Menu navigation event from the gamepad this frame. */
  padNav: PadNav = null;
  gamepadConnected = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    document.addEventListener("mousemove", this.mousemove);
    document.addEventListener("pointerlockchange", this.lockchange);
    canvas.addEventListener("wheel", this.wheelHandler, { passive: true });
    canvas.addEventListener("mousedown", this.mousedown);
    window.addEventListener("mouseup", this.mouseup);
    canvas.addEventListener("contextmenu", this.noMenu);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("mousemove", this.mousemove);
    document.removeEventListener("pointerlockchange", this.lockchange);
    this.canvas.removeEventListener("wheel", this.wheelHandler);
    this.canvas.removeEventListener("mousedown", this.mousedown);
    window.removeEventListener("mouseup", this.mouseup);
    this.canvas.removeEventListener("contextmenu", this.noMenu);
  }

  /** Apply remapped keys from settings; unknown actions are ignored, an empty list leaves the action unbound (its key was given to another action). */
  setBindings(overrides: Record<string, string[]>): void {
    const next = { ...BINDINGS } as Record<Binding, readonly string[]>;
    for (const [k, v] of Object.entries(overrides)) if (k in BINDINGS && k !== "pause") next[k as Binding] = v;
    this.bindings = next;
  }
  keysFor(b: Binding): readonly string[] {
    return this.bindings[b];
  }

  setLockListener(fn: (locked: boolean) => void): void {
    this.onLockChange = fn;
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestLock(): void {
    if (this.locked) return;
    try {
      const r = this.canvas.requestPointerLock() as unknown;
      if (r instanceof Promise) r.catch(() => undefined); // denied (e.g. too soon after exit) - harmless
    } catch {
      /* pointer lock unsupported: right-drag look still works */
    }
  }

  releaseLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  isDown(b: Binding): boolean {
    if (!this.enabled) return false;
    if (b === "run" && this.padRun) return true;
    return this.bindings[b].some((k) => this.down.has(k)) || (PAD_BUTTONS[b]?.some((i) => this.padDown.has(i)) ?? false);
  }

  /** True once per press (keyboard or gamepad). */
  wasPressed(b: Binding): boolean {
    return this.bindings[b].some((k) => this.pressed.has(k)) || (PAD_BUTTONS[b]?.some((i) => this.padPressed.has(i)) ?? false);
  }

  /** Movement intent in camera space: x right, z back; length 0..1 (analog on a gamepad). */
  moveAxis(): { x: number; z: number } {
    if (!this.enabled) return { x: 0, z: 0 };
    let x = (this.isDown("right") ? 1 : 0) - (this.isDown("left") ? 1 : 0);
    let z = (this.isDown("back") ? 1 : 0) - (this.isDown("forward") ? 1 : 0);
    const len = Math.hypot(x, z);
    if (len > 0) return { x: x / len, z: z / len };
    x = this.padMove.x;
    z = this.padMove.z;
    return { x, z };
  }

  /** Poll the first connected gamepad (call once per frame before reading input). */
  pollGamepad(dt: number): void {
    this.padPressed.clear();
    this.padNav = null;
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected) ?? null;
    this.gamepadConnected = !!pad;
    if (!pad) {
      this.padDown.clear();
      this.padMove = { x: 0, z: 0 };
      this.padRun = false;
      return;
    }
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    const lx = dz(pad.axes[0] ?? 0);
    const ly = dz(pad.axes[1] ?? 0);
    const mag = Math.min(1, Math.hypot(lx, ly));
    this.padMove = mag > 0 ? { x: (lx / Math.hypot(lx, ly)) * mag, z: (ly / Math.hypot(lx, ly)) * mag } : { x: 0, z: 0 };
    const rx = dz(pad.axes[2] ?? 0);
    const ry = dz(pad.axes[3] ?? 0);
    this.mouseDX += rx * 900 * dt;
    this.mouseDY += ry * 600 * dt;
    const btn = pad.buttons.map((b) => b.pressed);
    this.padDown.clear();
    btn.forEach((on, i) => {
      if (on) this.padDown.add(i);
      if (on && !this.padPrev[i]) this.padPressed.add(i);
    });
    this.padRun = (pad.buttons[6]?.value ?? 0) > 0.4 || !!btn[10];
    if (this.padPressed.has(12)) this.padNav = "up";
    else if (this.padPressed.has(13)) this.padNav = "down";
    else if (this.padPressed.has(0)) this.padNav = "accept";
    else if (this.padPressed.has(1)) this.padNav = "back";
    this.padPrev = btn;
  }

  /** Call at the end of each frame. */
  endFrame(): void {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }

  private keydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
    if (!e.repeat) this.pressed.add(e.code);
    this.down.add(e.code);
  };
  private keyup = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };
  private blur = () => this.down.clear();
  private mousemove = (e: MouseEvent) => {
    if (!this.locked && !this.dragging) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };
  private mousedown = (e: MouseEvent) => {
    if (e.button === 2) this.dragging = true;
  };
  private mouseup = (e: MouseEvent) => {
    if (e.button === 2) this.dragging = false;
  };
  private noMenu = (e: Event) => e.preventDefault();
  private wheelHandler = (e: WheelEvent) => {
    this.wheel += Math.sign(e.deltaY);
  };
  private lockchange = () => {
    if (!this.locked) this.down.clear();
    this.onLockChange?.(this.locked);
  };
}
