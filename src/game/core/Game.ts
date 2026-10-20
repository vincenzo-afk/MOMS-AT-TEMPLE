import * as THREE from "three";
import { AssetLibrary } from "./AssetLibrary";
import { Input } from "./Input";
import { Store } from "./Store";
import type { GameEvent, GameSession } from "./GameSession";
import { newGameState } from "./GameSession";
import type { InteractableDef, Verb } from "./interactables";
import type { Settings } from "./types";
import { buildLevel, type LevelHandles } from "../world/Level";
import { WorldView } from "../world/WorldView";
import { configureDetail } from "../world/DetailMaterials";
import { Atmosphere, Bubbles, TargetRing } from "../world/Atmosphere";
import { updateLod } from "../world/Level";
import { weatherAt, type Weather } from "../world/weather";
import { PlayerController, RUN_SPEED, WALK_SPEED } from "../player/PlayerController";
import { CharacterAnimator } from "../player/CharacterAnimator";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { InteractionSystem, type Candidate } from "../interaction/InteractionSystem";
import { NpcSystem } from "../npc/NpcSystem";
import { AudioManager } from "../audio/AudioManager";
import type { SaveSystem } from "../save/SaveSystem";
import { INTERACTABLES, PLACEMENTS, PLAYER_SPAWN, REGIONS } from "../../data/level";
import { LOCATIONS } from "../../data/text";

export const MINUTES_PER_SECOND = 1; // one real second = one world minute (24 min day)
const PLAYER_MODEL = "CHR_Player_Base";

export type Mode = "loading" | "title" | "intro" | "play" | "paused" | "error";
export type Panel = null | "inventory" | "journal" | "record" | "dialogue" | "craft" | "shop" | "reading" | "inspect" | "settings" | "storage" | "decor" | "notices" | "map" | "community" | "container";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "good" | "bad";
}

export interface UiState {
  mode: Mode;
  panel: Panel;
  loading: { done: number; total: number; label: string };
  error: string | null;
  prompt: { primary?: { label: string; enabled: boolean; reason?: string }; secondary?: { label: string } } | null;
  toasts: Toast[];
  shopId: string | null;
  stationId: string | null;
  readingId: string | null;
  inspectText: string[];
  caption: string | null;
  locationName: string;
  busyLabel: string | null;
  pointerLocked: boolean;
  assetProblems: string[];
  hasSave: boolean;
  /** Living Record entry to highlight on the map. */
  mapFocus: string | null;
  containerId: string | null;
  weather: Weather["kind"];
  indoors: boolean;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 280); // just beyond the fog: distant chunks are culled
  readonly assets = new AssetLibrary();
  readonly audio = new AudioManager();
  readonly ui = new Store<UiState>({
    mode: "loading",
    panel: null,
    loading: { done: 0, total: 1, label: "Preparing" },
    error: null,
    prompt: null,
    toasts: [],
    shopId: null,
    stationId: null,
    readingId: null,
    inspectText: [],
    caption: null,
    locationName: "",
    busyLabel: null,
    pointerLocked: false,
    assetProblems: [],
    hasSave: false,
    mapFocus: null,
    containerId: null,
    weather: "clear",
    indoors: false,
  });
  input: Input;
  level!: LevelHandles;
  player!: PlayerController;
  cam!: ThirdPersonCamera;
  npcs!: NpcSystem;
  interaction!: InteractionSystem;
  worldView!: WorldView;
  private sun = new THREE.DirectionalLight(0xffffff, 2.5);
  private hemi = new THREE.HemisphereLight(0xcfe3f5, 0x7a6248, 1.0);
  private sky!: THREE.Mesh;
  private timer = new THREE.Timer();
  private toastId = 0;
  private autosaveTimer = 0;
  private introT = 0;
  private introCurve: THREE.CatmullRomCurve3 | null = null;
  private titleT = 0;
  private actionTimer = 0;
  private talkingTo: string | null = null;
  private seated = false;
  private musicCheck = 0;
  private atmosphere = new Atmosphere();
  private ring = new TargetRing();
  private bubbles: Bubbles | null = null;
  private clock = 0;
  private interactCooldown = 0;
  private confrontCooldown = 0;
  private lastFootPhase = 0;
  private lodTimer = 0;
  private indoors = false;
  weather: Weather = { kind: "clear", rain: 0, cloud: 0, wind: 0.3 };
  private fogBase: { near: number; far: number } | null = null;
  private disposed = false;
  stats = { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    readonly session: GameSession,
    readonly saves: SaveSystem,
    public settings: Settings,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = settings.graphicsQuality !== "low";
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.input = new Input(canvas);
    this.input.setLockListener((locked) => {
      this.ui.set({ pointerLocked: locked });
      // Browsers consume Esc to release pointer lock, so losing the lock during play opens the pause menu.
      if (!locked && this.ui.get().mode === "play" && this.ui.get().panel === null) this.pause();
    });
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  // ------------------------------------------------------------------ setup
  async init(): Promise<void> {
    try {
      this.setupScene();
      configureDetail({ anisotropy: Math.min(8, this.renderer.capabilities.getMaxAnisotropy()), enabled: this.settings.graphicsQuality !== "low" });
      this.ui.set({ loading: { done: 0, total: 1, label: "Reading asset manifest" } });
      await this.assets.loadManifest();
      const base = [...new Set([...PLACEMENTS.map((p) => p.asset), PLAYER_MODEL, ...[...this.session.defs.npcs.values()].map((n) => n.appearance.model)])];
      const lods = (this.assets.manifest?.assets ?? []).map((a) => a.id).filter((id) => id.endsWith("_LOD1") && base.includes(id.slice(0, -5)));
      const ids = [...base, ...lods];
      await this.assets.loadAll(ids, (done, total) => this.ui.set({ loading: { done, total, label: "Loading models" } }));
      this.ui.set({ loading: { done: 1, total: 1, label: "Building the settlement" }, assetProblems: this.assets.problems.map((p) => `${p.id}: ${p.message}`) });

      this.level = buildLevel(this.assets, this.settings.graphicsQuality);
      this.scene.add(this.level.root);
      this.worldView = new WorldView(this.session, this.level);

      const model = this.assets.instantiate(PLAYER_MODEL);
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      const clips = this.assets.clips(PLAYER_MODEL);
      const animator = new CharacterAnimator(model, clips, WALK_SPEED, RUN_SPEED);
      if (animator.missing.length) this.ui.set({ assetProblems: [...this.ui.get().assetProblems, `player clips missing: ${animator.missing.join(", ")}`] });
      this.player = new PlayerController(model, animator, this.level.collision);
      this.scene.add(this.player.object);
      this.cam = new ThirdPersonCamera(this.camera, this.level.collision);
      this.npcs = new NpcSystem(this.session, this.assets, this.level.collision, PLAYER_MODEL, {
        bark: (npcId, text) => this.bubbles?.show(text, npcId, () => this.npcs.positionOf(npcId)),
        confront: (npcId) => this.confront(npcId),
      });
      this.scene.add(this.npcs.group);
      this.scene.add(this.atmosphere.group, this.ring.mesh);
      this.bubbles = new Bubbles(this.canvas.parentElement ?? document.body);

      this.interaction = new InteractionSystem(this.session, this.level.collision);
      for (const p of INTERACTABLES) {
        const socket = p.socket ? this.level.sockets.get(p.socket) : undefined;
        const v = socket ? socket.clone() : new THREE.Vector3(...p.pos);
        this.interaction.register({ def: { id: p.id, kind: p.kind, refId: p.refId, label: p.label, locationId: p.locationId, radius: p.radius }, position: () => v, faceY: p.faceY });
      }
      for (const npc of this.session.defs.npcs.values()) {
        this.interaction.register({
          def: { id: `int_${npc.id}`, kind: "npc", refId: npc.id, label: npc.name, locationId: "", radius: 2.6 },
          position: () => this.npcs.positionOf(npc.id),
          available: () => this.npcs.isAvailable(npc.id),
        });
      }
      // doors: the interaction point is the middle of the doorway (its collider), so it works from both sides
      for (const d of this.session.defs.doors.values()) {
        const rt = this.level.doors.get(`${d.placementId}.${d.node}`);
        if (!rt?.collider) continue;
        const v = new THREE.Vector3(rt.collider.cx, rt.collider.yMin, rt.collider.cz);
        this.interaction.register({ def: { id: `int_${d.id}`, kind: "door", refId: d.id, label: d.label, locationId: "", radius: 1.9 }, position: () => v });
      }

      this.session.subscribe(() => this.worldView.apply());
      this.session.onEvent(this.onGameEvent);
      this.applySettings(this.settings);
      this.applyStateToWorld();
      this.ui.set({ hasSave: await this.saves.hasSave() });
      this.enterTitle();
      this.timer.connect(document);
      this.renderer.setAnimationLoop(this.frame);
    } catch (e) {
      console.error(e);
      this.ui.set({ mode: "error", error: (e as Error).message });
    }
  }

  private setupScene(): void {
    this.scene.fog = new THREE.Fog(0xe9dcc0, 70, 250);
    this.sun.castShadow = true;
    const q = this.settings.graphicsQuality;
    this.sun.shadow.mapSize.set(q === "high" ? 2048 : 1024, q === "high" ? 2048 : 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -40;
    sc.right = 40;
    sc.top = 40;
    sc.bottom = -40;
    sc.near = 1;
    sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    const skyGeo = new THREE.SphereGeometry(250, 32, 16); // inside the camera far plane
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: { value: new THREE.Color(0x7fb2dc) }, uHorizon: { value: new THREE.Color(0xf1dcb5) }, uSun: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y, -0.2, 1.0); vec3 c = mix(uHorizon, uTop, pow(max(h,0.0), 0.55));
        float s = pow(max(dot(normalize(vDir), normalize(uSun)), 0.0), 600.0); c += vec3(1.0,0.9,0.7) * s * 1.5;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.name = "Sky";
    this.scene.add(this.sky);
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const q = this.settings?.graphicsQuality ?? "high";
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 2 : q === "medium" ? 1.5 : 1));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  applySettings(s: Settings): void {
    this.settings = s;
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    if (this.cam) {
      this.cam.sensitivity = s.mouseSensitivity;
      this.cam.invertY = s.invertY;
    }
    this.renderer.shadowMap.enabled = s.graphicsQuality !== "low";
    this.sun.castShadow = s.graphicsQuality !== "low";
    this.input.setBindings(s.keyBindings ?? {});
    document.documentElement.style.setProperty("--dialogue-alpha", String(s.dialogueBackdrop ?? 0.9));
    document.documentElement.style.setProperty("--text-scale", String(s.textScale));
    this.audio.applySettings(s);
    this.resize();
  }

  /** Push the loaded/new state into the world: player transform, NPC positions, visuals. */
  applyStateToWorld(): void {
    const p = this.session.state.player;
    this.player.teleport(p.position, p.yaw);
    this.cam.snapTo(this.player.position, p.yaw + Math.PI);
    this.npcs.snapToSchedule();
    this.worldView.apply();
  }

  // ------------------------------------------------------------------ modes
  enterTitle(): void {
    this.ui.set({ mode: "title", panel: null, caption: null });
    this.input.releaseLock();
  }

  async newGame(): Promise<void> {
    await this.audio.unlock(this.settings);
    this.session.replaceState(newGameState());
    this.session.setPlayerTransform(PLAYER_SPAWN.pos, PLAYER_SPAWN.yaw);
    this.applyStateToWorld();
    this.autosaveTimer = 0;
    if (this.settings.showIntro) this.startIntro();
    else this.startPlay();
  }

  async continueGame(): Promise<string | null> {
    await this.audio.unlock(this.settings);
    const r = await this.saves.load();
    if (r.status === "loaded") {
      this.session.replaceState(r.state);
      this.applyStateToWorld();
      this.startPlay();
      if (r.warnings.length) this.toast(r.fromBackup ? "Main save was damaged; loaded the backup." : "Save loaded with minor repairs.", "bad");
      return null;
    }
    return r.status === "empty" ? "No saved game found." : `Could not load the save: ${r.error}`;
  }

  private startIntro(): void {
    const end = this.player.position.clone().add(new THREE.Vector3(0, 2.6, 5));
    this.introCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-30, 34, 120),
      new THREE.Vector3(25, 20, 92),
      new THREE.Vector3(8, 9, 70),
      end,
    ]);
    this.introT = 0;
    this.ui.set({ mode: "intro", caption: "A settlement on the river plain, grown up around its temple." });
    this.audio.setMusic("mus_main_theme");
  }

  skipIntro(): void {
    if (this.ui.get().mode !== "intro") return;
    this.settings = { ...this.settings, showIntro: false };
    void this.saves.saveSettings(this.settings);
    this.startPlay();
  }

  startPlay(): void {
    this.introCurve = null;
    this.cam.snapTo(this.player.position, this.player.yaw + Math.PI);
    this.ui.set({ mode: "play", caption: null, panel: null });
    this.audio.setMusic("mus_exploration_day");
    this.audio.startLoop("amb_settlement_day");
    this.input.requestLock();
    if (!this.session.state.quests.q_arrival) this.toast("Valli is waiting just inside the gate. Walk with W A S D, press E to talk.", "info");
  }

  pause(): void {
    if (this.ui.get().mode !== "play") return;
    this.input.releaseLock();
    this.ui.set({ mode: "paused" });
  }

  resume(): void {
    this.ui.set({ mode: "play", panel: null });
    this.input.requestLock();
  }

  openPanel(panel: Panel): void {
    if (this.ui.get().mode !== "play") return;
    this.input.releaseLock();
    this.audio.play("ui_open");
    this.ui.set({ panel });
  }

  closePanel(): void {
    const { panel } = this.ui.get();
    if ((panel === "storage" || panel === "decor") && this.player.animator.currentAction === "open_container") this.player.animator.stopAction();
    if (panel === "dialogue") {
      this.session.endConversation();
      this.confrontCooldown = this.clock + 5;
    }
    if (this.talkingTo) {
      this.npcs.endTalk(this.talkingTo);
      this.talkingTo = null;
      if (this.player.animator.currentAction === "talk_idle") this.player.animator.stopAction();
      this.player.locked = false;
    }
    this.ui.set({ panel: null, shopId: null, stationId: null, readingId: null, mapFocus: null, containerId: null });
    if (this.ui.get().mode === "play") this.input.requestLock();
  }

  async saveGame(manual = false): Promise<boolean> {
    this.session.setPlayerTransform([this.player.position.x, this.player.position.y, this.player.position.z], this.player.yaw);
    try {
      await this.saves.save(this.session.state);
      this.ui.set({ hasSave: true });
      if (manual) this.toast("Game saved", "good");
      return true;
    } catch (e) {
      this.toast(`Save failed: ${(e as Error).message}`, "bad");
      return false;
    }
  }

  toast(text: string, tone: Toast["tone"] = "info"): void {
    const t = { id: ++this.toastId, text, tone };
    this.ui.set({ toasts: [...this.ui.get().toasts.slice(-3), t] });
    window.setTimeout(() => this.ui.set({ toasts: this.ui.get().toasts.filter((x) => x.id !== t.id) }), 4200);
  }

  // ------------------------------------------------------------------ gameplay glue
  private onGameEvent = (e: GameEvent) => {
    switch (e.type) {
      case "notify":
        this.toast(e.text, e.tone);
        break;
      case "gathered":
        this.audio.play("sfx_pickup");
        break;
      case "crafted":
        this.audio.play("sfx_craft");
        break;
      case "restored":
        this.audio.play("sfx_restore");
        if (e.restorationId === "rest_channel_east") this.audio.startLoop("amb_channel_water");
        void this.saveGame();
        break;
      case "questCompleted":
      case "record":
        this.audio.play("ui_confirm");
        void this.saveGame();
        break;
      case "questStarted":
      case "objective":
        this.audio.play("ui_confirm");
        break;
      case "shop":
        this.ui.set({ panel: "shop", shopId: e.shopId });
        break;
      case "reading":
        this.ui.set({ panel: "reading", readingId: e.discoveryId });
        this.audio.play("mus_discovery");
        break;
      case "inspect":
        this.ui.set({ panel: "inspect", inspectText: e.text });
        break;
      case "door":
        this.audio.door(e.open);
        break;
      case "pickup":
        this.audio.play("sfx_pickup");
        break;
      case "fail":
        this.audio.play("ui_error");
        break;
    }
  };

  /** Take a stack from a world container; NPCs who can see the player act as witnesses. */
  takeFromContainer(containerId: string, slot: number): void {
    const witnesses = this.npcs.witnessesOf(this.player.position);
    const before = this.session.state.pendingCrime;
    const r = this.session.takeFromContainer(containerId, slot, witnesses);
    if (!r.ok) return;
    if (!before && this.session.state.pendingCrime) {
      this.npcs.reactToCrime(witnesses);
      this.audio.alarm();
      this.closePanel();
    }
  }

  /** The watchman caught up with the player: open his conversation (it offers return or fine). */
  private confront(npcId: string): void {
    const ui = this.ui.get();
    if (ui.mode !== "play" || ui.panel !== null || this.player.locked || this.clock < this.confrontCooldown) return;
    const pos = this.npcs.positionOf(npcId);
    this.perform({ id: `int_${npcId}`, kind: "npc", refId: npcId, label: "", locationId: "", radius: 3 }, "talk", pos);
  }

  private interact(c: Candidate, secondary: boolean): void {
    if (this.clock < this.interactCooldown) return; // debounce: one action per press, no double triggers
    this.interactCooldown = this.clock + 0.35;
    const acts = c.actions;
    const act = secondary ? acts[1] : acts[0];
    if (!act) return;
    if (!act.enabled) {
      this.toast(act.reason ?? "You can't do that yet.", "bad");
      this.audio.play("ui_error");
      return;
    }
    this.perform(c.def, act.verb, c.position, c.faceY);
  }

  /** Executes a verb: the GameSession validates and applies the state change; the animation is presentation. */
  perform(def: InteractableDef, verb: Verb, at: THREE.Vector3, faceY?: number): void {
    if (verb === "craft") {
      this.player.faceTowards(at);
      this.ui.set({ stationId: def.refId });
      this.openPanel("craft");
      return;
    }
    if (verb === "notices") {
      this.player.faceTowards(at);
      this.openPanel("notices");
      return;
    }
    if (verb === "sit") {
      this.sitAt(at, faceY ?? 0);
      return;
    }
    if (verb === "search") {
      this.player.faceTowards(at);
      this.player.animator.play("open_container", { once: true });
      this.ui.set({ containerId: def.refId });
      this.openPanel("container");
      return;
    }
    const result = this.session.perform(def, verb);
    if (!result.ok) {
      this.toast(result.reason, "bad");
      return;
    }
    this.player.faceTowards(at);
    const anim = this.player.animator;
    switch (verb) {
      case "talk":
        this.talkingTo = def.refId;
        this.npcs.beginTalk(def.refId, this.player.position);
        this.player.locked = true;
        anim.play("greet", { once: true, onDone: () => this.talkingTo && anim.play("talk_idle", { once: false }) });
        if (this.session.conversation) this.openPanel("dialogue");
        break;
      case "gather": {
        const cat = this.session.defs.items.get(this.session.defs.gatherNodes.get(def.refId)?.itemId ?? "")?.category;
        this.lockFor(cat === "flower" ? "gather_flower" : "pickup_ground");
        break;
      }
      case "repair": {
        const r = this.session.defs.restorations.get(def.refId);
        const act = r?.action ?? { anim: "repair_channel" as const, seconds: 2.6, label: "Repairing..." };
        this.player.locked = true;
        this.actionTimer = act.seconds;
        anim.play(act.anim, { once: false });
        this.ui.set({ busyLabel: act.label });
        break;
      }
      case "plant":
        this.lockFor("plant_seed");
        break;
      case "water":
        this.lockFor("water_plant");
        break;
      case "harvest":
        this.lockFor("harvest_plant");
        break;
      case "fill":
        this.lockFor("pickup_ground");
        break;
      case "inspect":
      case "read":
        this.lockFor("inspect_object");
        break;
      case "store":
        anim.play("open_container", { once: true });
        this.openPanel("storage");
        break;
      case "decorate":
        this.openPanel("decor");
        break;
      case "open":
      case "close":
        this.lockFor("interact_reach");
        break;
      case "pickup":
        this.lockFor("pickup_ground");
        break;
      case "rest":
        break;
    }
  }

  private lockFor(clip: "interact_reach" | "pickup_ground" | "gather_flower" | "plant_seed" | "water_plant" | "harvest_plant" | "inspect_object"): void {
    this.player.locked = true;
    const ok = this.player.animator.play(clip, { once: true, onDone: () => (this.player.locked = false) });
    if (!ok) this.player.locked = false;
  }

  private sitAt(at: THREE.Vector3, faceY: number): void {
    this.player.position.set(at.x, this.player.position.y, at.z);
    this.player.yaw = (faceY * Math.PI) / 180;
    this.player.object.rotation.y = this.player.yaw;
    this.player.locked = true;
    this.seated = true;
    this.player.animator.play("sit_idle", { once: false });
    this.toast("Press a movement key to stand up.", "info");
  }

  private standUp(): void {
    this.seated = false;
    this.player.animator.stopAction();
    this.player.locked = false;
  }

  /** Called by the craft panel after the session accepted the craft. */
  playCraft(seconds: number, label: string): void {
    this.player.locked = true;
    this.actionTimer = seconds;
    this.player.animator.play("craft_at_station", { once: false });
    this.ui.set({ busyLabel: label });
  }

  // ------------------------------------------------------------------ frame
  private frame = () => {
    if (this.disposed) return;
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t0 = performance.now();
    const ui = this.ui.get();
    const mode = ui.mode;
    this.clock += dt;
    this.input.pollGamepad(dt);
    if (this.input.padNav && (ui.panel !== null || mode !== "play")) this.gamepadMenu(this.input.padNav, mode);

    if (mode === "play") {
      // Esc reaches us only when the pointer is not locked (locked Esc is handled via pointerlockchange).
      if (this.input.wasPressed("pause")) {
        if (ui.panel) this.closePanel();
        else this.pause();
      } else if (ui.panel === null) {
        if (this.input.wasPressed("inventory")) this.openPanel("inventory");
        else if (this.input.wasPressed("journal")) this.openPanel("journal");
        else if (this.input.wasPressed("record")) this.openPanel("record");
        else if (this.input.wasPressed("map")) this.openPanel("map");
        else if (this.input.wasPressed("community")) this.openPanel("community");
      }
      if (this.seated && ui.panel === null && (this.input.isDown("forward") || this.input.isDown("back") || this.input.isDown("left") || this.input.isDown("right"))) this.standUp();
      const canAct = ui.panel === null && !this.player.locked;
      this.session.advanceTime(dt * MINUTES_PER_SECOND);
      this.player.update(dt, this.input, this.cam.yaw);
      this.cam.update(dt, ui.panel === null ? this.input : ({ mouseDX: 0, mouseDY: 0, wheel: 0 } as Input), this.player.position);
      const pSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
      this.npcs.update(dt, { position: this.player.position, speed: pSpeed, busy: ui.panel !== null || this.player.locked });
      const focus = canAct ? this.interaction.update(this.player.position, this.player.yaw) : null;
      this.updatePrompt(focus);
      this.ring.update(dt, focus?.position ?? null, focus ? focus.position.y : 0, !!focus?.actions[0]?.enabled, this.settings.showTargetRing !== false && ui.pointerLocked !== undefined);
      this.footsteps(pSpeed);
      if (focus && canAct) {
        if (this.input.wasPressed("interact")) this.interact(focus, false);
        else if (this.input.wasPressed("secondary")) this.interact(focus, true);
      }
      if (this.actionTimer > 0) {
        this.actionTimer -= dt;
        if (this.actionTimer <= 0) {
          this.player.animator.stopAction();
          this.player.locked = false;
          this.ui.set({ busyLabel: null });
        }
      }
      this.autosaveTimer += dt;
      if (this.autosaveTimer > 60) {
        this.autosaveTimer = 0;
        void this.saveGame();
      }
      this.updateLocation();
      this.musicCheck -= dt;
      if (this.musicCheck <= 0) {
        this.musicCheck = 5;
        this.updateMusic();
      }
    } else if (mode === "intro" && this.introCurve) {
      this.introT += dt / 11;
      const t = Math.min(1, this.introT);
      const e = t * t * (3 - 2 * t);
      this.camera.position.copy(this.introCurve.getPoint(e));
      this.camera.lookAt(new THREE.Vector3(0, 6 - e * 4, 30 + e * 25 - (1 - e) * 40));
      this.npcs.update(dt, { position: this.player.position, speed: 0, busy: true });
      this.player.animator.update(dt, 0);
      const caption = t < 0.33 ? "A settlement on the river plain, grown up around its temple." : t < 0.7 ? "Its people still keep its gardens and workshops - though some of the old ways have been forgotten." : "You have come to make a life here.";
      if (caption !== ui.caption) this.ui.set({ caption });
      if (this.input.wasPressed("interact") || this.input.wasPressed("pause")) this.skipIntro();
      else if (t >= 1) this.startPlay();
    } else if (mode === "title") {
      this.titleT += dt * 0.03;
      const a = this.titleT + 2.2;
      this.camera.position.set(Math.cos(a) * 58, 24, Math.sin(a) * 58 - 6);
      this.camera.lookAt(0, 5, -6);
      this.npcs?.update(dt, { position: this.player?.position ?? new THREE.Vector3(), speed: 0, busy: true });
    } else if (mode === "paused") {
      // world frozen; still render for the backdrop
    }

    this.updateEnvironment(dt);
    this.updateLighting();
    for (const f of this.level?.flames ?? []) f.scale.setScalar(0.85 + Math.random() * 0.3);
    this.level?.water && (this.level.water.uniforms.uTime!.value += dt);
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.bubbles?.update(dt, this.camera, this.canvas.clientWidth || window.innerWidth, this.canvas.clientHeight || window.innerHeight);
    this.input.endFrame();

    const ms = performance.now() - t0;
    this.stats.frameMs = this.stats.frameMs * 0.95 + ms * 0.05;
    this.stats.fps = this.stats.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
    this.stats.drawCalls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
  };

  /** Weather, doors, tree LOD, particles and the procedural soundscape. */
  private updateEnvironment(dt: number): void {
    if (!this.level) return;
    const minutes = this.session.state.worldMinutes;
    this.weather = weatherAt(minutes, !!this.session.state.flags.festival_held);
    if (this.weather.kind !== this.ui.get().weather) this.ui.set({ weather: this.weather.kind });
    // doors swing toward their saved state
    for (const d of this.session.defs.doors.values()) {
      const rt = this.level.doors.get(`${d.placementId}.${d.node}`);
      if (!rt) continue;
      const target = this.session.isDoorOpen(d.id) ? 1 : 0;
      rt.angle += (target - rt.angle) * Math.min(1, dt * 5);
      rt.leaf.rotation.y = rt.baseRotY + rt.opens * rt.angle * 1.45;
    }
    // indoors = a ceiling or roof collider directly overhead
    if (this.player) {
      const head = this.player.position.clone().add(new THREE.Vector3(0, 1.7, 0));
      const indoors = this.level.collision.raycast(head, new THREE.Vector3(0, 1, 0), 2.5) < 2.5;
      if (indoors !== this.indoors) {
        this.indoors = indoors;
        this.ui.set({ indoors });
      }
    }
    this.lodTimer -= dt;
    if (this.lodTimer <= 0) {
      this.lodTimer = 0.25;
      updateLod(this.level, this.camera.position);
    }
    const h = this.session.hourOfDay;
    const day = THREE.MathUtils.smoothstep(Math.sin(((h - 6) / 12) * Math.PI), -0.15, 0.35);
    this.atmosphere.update(dt, this.camera, this.weather, day, this.indoors);
    if (this.player) {
      const p = this.player.position;
      const water = this.level.waterPoints.reduce((m, w) => Math.min(m, w.distanceTo(p)), Infinity);
      const crowd = Math.hypot(p.x - 82, p.z - 10);
      const channelFlowing = this.session.state.restorations.rest_channel_east === "flowing";
      this.audio.updateAmbience(dt, {
        rain: this.weather.rain,
        wind: this.weather.wind,
        day,
        water: THREE.MathUtils.clamp(1 - water / 14, 0, 1) * (channelFlowing || water > 3 ? 1 : 0.6),
        crowd: THREE.MathUtils.clamp(1 - crowd / 40, 0, 1),
        indoors: this.indoors,
      });
    }
  }

  /** Footstep on each foot contact of the locomotion cycle, sounding like the surface underfoot. */
  private footsteps(speed: number): void {
    const ph = this.player.animator.cyclePhase;
    const crossed = (this.lastFootPhase < 0.5 && ph >= 0.5) || ph < this.lastFootPhase;
    this.lastFootPhase = ph;
    if (!crossed || speed < 0.4) return;
    const p = this.player.position;
    let surface: "stone" | "soil" | "wood" = "soil";
    if (p.y > 0.03) surface = this.indoors ? "wood" : "stone";
    else if (PLACEMENTS.some((pl) => pl.asset === "ENV_Paving_Courtyard_A" && Math.abs(pl.pos[0] - p.x) < 5 && Math.abs(pl.pos[2] - p.z) < 5)) surface = "stone";
    this.audio.footstep(surface, speed > 3.5);
  }

  /** Gamepad navigation of menus and panels: d-pad moves focus, A activates, B goes back. */
  private gamepadMenu(nav: NonNullable<Input["padNav"]>, mode: Mode): void {
    if (nav === "back") {
      if (mode === "play") this.closePanel();
      else if (mode === "paused") this.resume();
      return;
    }
    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".panel button:not(:disabled), .dialogue button:not(:disabled), .title-card button:not(:disabled)")];
    if (!buttons.length) return;
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (nav === "accept") {
      (i >= 0 ? buttons[i]! : buttons[0]!).click();
      return;
    }
    const next = nav === "down" ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
    buttons[i < 0 ? 0 : next]!.focus();
  }

  /** Evening ambience after 18:00; festival music on festival evenings. Missing tracks simply stay silent. */
  private updateMusic(): void {
    const h = this.session.hourOfDay;
    const festival = this.session.state.flags.festival_held && h >= 17 && h < 23;
    this.audio.setMusic(festival ? "mus_festival" : "mus_exploration_day");
    if (h >= 18 || h < 6) {
      this.audio.stopLoop("amb_settlement_day");
      this.audio.startLoop("amb_evening");
    } else {
      this.audio.stopLoop("amb_evening");
      this.audio.startLoop("amb_settlement_day");
    }
  }

  /** Open the map focused on a Living Record entry's location. */
  showOnMap(eventId: string): void {
    this.ui.set({ panel: "map", mapFocus: eventId });
  }

  /** Up to LAMP_LIGHTS warm point lights follow the nearest visible lit flames at dusk and night. */
  private lampLights: THREE.PointLight[] = [];
  private updateLampLights(day: number): void {
    if (!this.level) return;
    if (!this.lampLights.length) {
      for (let i = 0; i < 6; i++) {
        const l = new THREE.PointLight(0xffb060, 0, 9, 1.6);
        l.castShadow = false;
        this.lampLights.push(l);
        this.scene.add(l);
      }
    }
    const strength = THREE.MathUtils.clamp(1 - day * 1.6, 0, 1) * 6;
    const p = this.player?.position ?? new THREE.Vector3();
    const lit = this.level.flames
      .filter((f) => {
        let o: THREE.Object3D | null = f;
        while (o) {
          if (!o.visible) return false;
          o = o.parent;
        }
        return true;
      })
      .map((f) => ({ f, pos: f.getWorldPosition(new THREE.Vector3()) }))
      .sort((a, b) => a.pos.distanceToSquared(p) - b.pos.distanceToSquared(p));
    this.lampLights.forEach((l, i) => {
      const t = lit[i];
      l.intensity = t ? strength * (0.9 + Math.random() * 0.2) : 0;
      if (t) l.position.copy(t.pos).add(new THREE.Vector3(0, 0.3, 0));
    });
  }

  private updatePrompt(focus: Candidate | null): void {
    const prev = this.ui.get().prompt;
    let next: UiState["prompt"] = null;
    if (focus) {
      const [a, b] = focus.actions;
      next = { primary: a ? { label: a.label, enabled: a.enabled, reason: a.reason } : undefined, secondary: b ? { label: b.label } : undefined };
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) this.ui.set({ prompt: next });
  }

  private updateLocation(): void {
    const p = this.player.position;
    const region = REGIONS.find((r) => p.x >= r.min[0] && p.x <= r.max[0] && p.z >= r.min[1] && p.z <= r.max[1]);
    const name = region ? (LOCATIONS[region.id] ?? "") : "Outside the walls";
    if (name !== this.ui.get().locationName) this.ui.set({ locationName: name });
  }

  private updateLighting(): void {
    const h = this.session.hourOfDay;
    const dayK = THREE.MathUtils.clamp(Math.sin(((h - 6) / 12) * Math.PI), -1, 1); // 1 at noon, <0 at night
    const day = THREE.MathUtils.smoothstep(dayK, -0.15, 0.35);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(dayK) * 4, 0, 1) * (dayK > -0.2 ? 1 : 0);
    const az = ((h - 6) / 12) * Math.PI;
    const elev = Math.max(0.12, dayK) * 1.15;
    const center = this.player?.position ?? new THREE.Vector3();
    const dir = new THREE.Vector3(Math.cos(az) * 0.8, elev, -0.45).normalize();
    this.sun.position.copy(center).addScaledVector(dir, 70);
    this.sun.target.position.copy(center);
    const cloud = this.weather.cloud;
    // overcast: the direct sun is diffused into sky light (soft, near-shadowless), and rain pulls the fog in
    this.sun.intensity = (0.55 + day * 1.8) * (1 - cloud * 0.8); // moonlight floor keeps nights readable
    this.sun.color.setRGB(1, 0.92 - dusk * 0.25, 0.82 - dusk * 0.4).lerp(new THREE.Color(0x9fb4dd), 1 - day);
    this.hemi.intensity = 0.8 + day * (0.4 + cloud * 0.45);
    this.hemi.color.setHex(0xcfe3f5).lerp(new THREE.Color(0x6a7cae), 1 - day);
    const top = new THREE.Color(0x7fb2dc).lerp(new THREE.Color(0x0e1630), 1 - day).lerp(new THREE.Color(0x6d7480).multiplyScalar(0.4 + day * 0.6), cloud * 0.7);
    const horizon = new THREE.Color(0xf1dcb5)
      .lerp(new THREE.Color(0xf09a5a), dusk * 0.6)
      .lerp(new THREE.Color(0xa3a7ab), cloud * 0.65)
      .lerp(new THREE.Color(0x26304a), 1 - day);
    const u = (this.sky.material as THREE.ShaderMaterial).uniforms;
    u.uTop!.value.copy(top);
    u.uHorizon!.value.copy(horizon);
    u.uSun!.value.copy(dir);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(horizon);
    this.fogBase ??= { near: fog.near, far: fog.far };
    fog.near = this.fogBase.near * (1 - this.weather.rain * 0.5);
    fog.far = this.fogBase.far * (1 - this.weather.rain * 0.45);
    this.renderer.toneMappingExposure = 1.0 + day * 0.1;
    this.updateLampLights(day);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.input.dispose();
    window.removeEventListener("resize", this.resize);
    this.timer.dispose();
    this.renderer.dispose();
  }
}
