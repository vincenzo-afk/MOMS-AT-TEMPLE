// Keyboard + mouse input with pointer lock. Bindings are data so the help screen and settings stay in sync.

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

export const CONTROLS_HELP: Array<[string, string]> = [
  ["W A S D", "Move"],
  ["Shift", "Run"],
  ["Mouse", "Look around (click the scene to capture the mouse)"],
  ["Mouse wheel", "Camera distance"],
  ["E", "Interact"],
  ["R", "Secondary action (e.g. inspect)"],
  ["I", "Inventory"],
  ["J", "Journal"],
  ["L", "Living Record"],
  ["M", "Map"],
  ["C", "Community and skills"],
  ["Esc", "Pause / close panel"],
];

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  enabled = true;
  private onLockChange: ((locked: boolean) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    document.addEventListener("mousemove", this.mousemove);
    document.addEventListener("pointerlockchange", this.lockchange);
    canvas.addEventListener("wheel", this.wheelHandler, { passive: true });
  }

  dispose(): void {
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("mousemove", this.mousemove);
    document.removeEventListener("pointerlockchange", this.lockchange);
    this.canvas.removeEventListener("wheel", this.wheelHandler);
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
      /* pointer lock unsupported: mouse-drag fallback is not implemented; keyboard still works */
    }
  }

  releaseLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  isDown(b: Binding): boolean {
    return this.enabled && BINDINGS[b].some((k) => this.down.has(k));
  }

  /** True once per key press. */
  wasPressed(b: Binding): boolean {
    return BINDINGS[b].some((k) => this.pressed.has(k));
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
    if (!this.locked) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };
  private wheelHandler = (e: WheelEvent) => {
    this.wheel += Math.sign(e.deltaY);
  };
  private lockchange = () => {
    if (!this.locked) this.down.clear();
    this.onLockChange?.(this.locked);
  };
}
