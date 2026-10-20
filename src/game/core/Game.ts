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
import { PlayerController, RUN_SPEED, SPRINT_SPEED, WALK_SPEED, type LandKind } from "../player/PlayerController";
import { measureSeat, SeatSession } from "../player/Seat";
import { PostFX } from "../render/PostFX";
import type { VisitDirector, VisitUi } from "../visit/VisitDirector";
import type { VisitWorld } from "../visit/VisitWorld";
import { isFestivalDay } from "../visit/rules";
import { visitAssetIds } from "../../data/visit";
import { TUTORIAL, currentStep, stepDone, type TutorialSignals } from "./Tutorial";
import { CharacterAnimator } from "../player/CharacterAnimator";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { InteractionSystem, type Candidate } from "../interaction/InteractionSystem";
import { NpcSystem } from "../npc/NpcSystem";
import { AudioManager } from "../audio/AudioManager";
import { musicCueFor } from "../audio/musicCues";
import type { SaveSystem } from "../save/SaveSystem";
import { INTERACTABLES, PLACEMENTS, PLAYER_SPAWN, REGIONS } from "../../data/level";
import { LOCATIONS } from "../../data/text";

export const MINUTES_PER_SECOND = 1; // one real second = one world minute (24 min day)
const PLAYER_MODEL = "CHR_Player_Base";

/** Input seen by the player controller while a panel or menu has the keyboard: no intent at all. */
const NO_INPUT = {
  moveAxis: () => ({ x: 0, z: 0 }),
  isDown: () => false,
  wasPressed: () => false,
  get focusHeld() {
    return false;
  },
} as unknown as Input;

const NO_LOOK = { mouseDX: 0, mouseDY: 0, wheel: 0 };

export type Mode = "loading" | "title" | "intro" | "play" | "paused" | "error";
export type Panel = null | "inventory" | "journal" | "record" | "dialogue" | "craft" | "shop" | "reading" | "inspect" | "settings" | "storage" | "decor" | "notices" | "map" | "community" | "container" | "minigame" | "visitScore";

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
  /** Temple Visit HUD and mini-game state (null outside a visit). */
  visit: VisitUi | null;
  /** Current onboarding step (null when finished, skipped or switched off). */
  tutorial: { index: number; total: number; text: string; keys: string } | null;
}

const _listenDir = new THREE.Vector3();
// per-frame scratch values and constants (the frame loop allocates nothing)
const _ORIGIN = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);
const _head = new THREE.Vector3();
const _sunDir = new THREE.Vector3();
const _skyTop = new THREE.Color();
const _skyHorizon = new THREE.Color();
const _overcast = new THREE.Color();
const TEMPLE_BELL = new THREE.Vector3(0, 0, -14.5);
const C_MOON = new THREE.Color(0x9fb4dd);
const C_HEMI_NIGHT = new THREE.Color(0x6a7cae);
const C_TOP_NIGHT = new THREE.Color(0x0e1630);
const C_DUSK = new THREE.Color(0xf09a5a);
const C_HAZE = new THREE.Color(0xa3a7ab);
const C_HORIZON_NIGHT = new THREE.Color(0x26304a);
const LAMP_LIGHTS = 6;

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 280); // just beyond the fog: distant chunks are culled
  private postfx: PostFX;
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
    visit: null,
    tutorial: null,
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
  private seat: SeatSession | null = null;
  /** placement whose lid is open (storage chest or a world crate) */
  private lidOpen: string | null = null;
  private lidAngles = new Map<string, number>();
  private tut: TutorialSignals = { cameraTurned: 0, walked: 0, jogSeconds: 0, jumps: 0, talkedToValli: false, gathered: false, panelsOpened: new Set(), inspected: false };
  private tutYaw = 0;
  private tutPos = new THREE.Vector3();
  /** The running Temple Visit (GAME_DESIGN.md), if any. */
  visit: VisitDirector | null = null;
  private visitWorlds = new Map<string, VisitWorld>();
  private readonly lookPoint = new THREE.Vector3();
  private readonly lookPointB = new THREE.Vector3();
  /** Subscribers to hard landings (the temple visit turns a bad fall into Stress). */
  readonly landListeners: Array<(kind: LandKind, height: number) => void> = [];
  private get seated(): boolean {
    return this.seat !== null;
  }
  /** The active sit choreography, if any (diagnostics and tests). */
  get seatSession(): SeatSession | null {
    return this.seat;
  }
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
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = settings.graphicsQuality !== "low";
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    this.postfx.configure(settings.graphicsQuality, settings.ambientOcclusion === true);
    this.input = new Input(canvas);
    this.input.setLockListener((locked) => {
      this.ui.set({ pointerLocked: locked });
      // Browsers consume Esc to release pointer lock, so losing the lock during play opens the pause menu.
      if (!locked && this.ui.get().mode === "play" && this.ui.get().panel === null) this.pause();
    });
    window.addEventListener("resize", this.resize);
    // closing or hiding the tab saves (the 60 s autosave alone could lose a minute of play)
    window.addEventListener("pagehide", this.saveOnHide);
    document.addEventListener("visibilitychange", this.saveOnHide);
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

      this.level = buildLevel(this.assets);
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
      this.player.onLand = (kind, h) => this.onPlayerLand(kind, h);
      this.player.onJump = () => this.audio.footstep("soil", true);
      this.scene.add(this.player.object);
      this.cam = new ThirdPersonCamera(this.camera, this.level.collision);
      this.cam.baseFov = this.settings.fov;
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

  private saveOnHide = () => {
    if (document.visibilityState === "hidden" || !document.hasFocus()) {
      const ui = this.ui.get();
      if ((ui.mode === "play" || ui.mode === "paused") && !this.visit) void this.saveGame();
    }
  };

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const q = this.settings?.graphicsQuality ?? "high";
    const scale = Math.min(1, Math.max(0.5, this.settings?.renderScale ?? 1));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 2 : q === "medium" ? 1.5 : 1) * scale);
    this.renderer.setSize(w, h, false);
    this.postfx?.setSize(w, h, this.renderer.getPixelRatio());
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  applySettings(s: Settings): void {
    const qualityChanged = this.settings?.graphicsQuality !== s.graphicsQuality;
    this.settings = s;
    this.postfx?.configure(s.graphicsQuality, s.ambientOcclusion === true);
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    if (this.cam) {
      this.cam.baseFov = s.fov;
      this.cam.sensitivity = s.mouseSensitivity;
      this.cam.invertY = s.invertY;
    }
    this.renderer.shadowMap.enabled = s.graphicsQuality !== "low";
    this.sun.castShadow = s.graphicsQuality !== "low";
    // materials compile their shadow-receiving code once: recompile them when shadows switch on or off
    if (qualityChanged)
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true;
      });
    if (this.cam) this.cam.reducedMotion = s.reducedMotion === true;
    if (this.player) this.player.reducedMotion = s.reducedMotion === true;
    document.documentElement.classList.toggle("high-contrast", s.highContrast === true);
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
    if (this.visit) this.exitVisit();
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

  /**
   * Start a Temple Visit: a fresh in-memory world (the story save is never touched), the chosen mom with her
   * saree, her family, and the temple's stations.
   */
  async startVisit(momId: string, templeId: string): Promise<void> {
    await this.audio.unlock(this.settings);
    if (this.visit) this.disposeVisit();
    this.seat?.cancel();
    const missing = visitAssetIds(templeId).filter((id) => !this.assets.has(id));
    if (missing.length) {
      this.ui.set({ mode: "loading", loading: { done: 0, total: missing.length, label: "Packing for the temple" } });
      await this.assets.loadAll(missing, (done, total) => this.ui.set({ loading: { done, total, label: "Packing for the temple" } }));
    }
    // the visit director, its followers and the auto load on first use (kept out of the startup bundle)
    const { VisitDirector } = await import("../visit/VisitDirector");
    this.session.replaceState(newGameState());
    this.applyStateToWorld();
    const profile = await this.saves.loadVisitProfile();
    const day = new Date().toISOString().slice(0, 10);
    const visit = new VisitDirector(this, profile, momId, templeId, isFestivalDay(day), this.visitWorlds);
    this.setPlayerModel("CHR_Player_Mom", visit.saree);
    this.visit = visit;
    this.interaction.filter = (d) => d.kind === "visit" || d.kind === "door" || d.kind === "sit";
    visit.start();
    this.introCurve = null;
    this.ui.set({ mode: "play", caption: null, panel: null });
    this.audio.setMusic(null); // bells, the crowd and the soundscape carry a visit (musicCueFor)
    this.audio.startLoop("amb_settlement_day");
    this.input.requestLock();
  }

  private disposeVisit(): void {
    if (!this.visit) return;
    this.visit.dispose();
    this.visit = null;
    this.interaction.filter = null;
    this.ui.set({ visit: null });
  }

  /** Leave the visit (score screen "Back to title", pause menu exit): restore the story-mode player. */
  exitVisit(): void {
    this.disposeVisit();
    this.audio.engine(false);
    this.setPlayerModel(PLAYER_MODEL);
  }

  /** Swap the controlled character (the mom for a visit, the newcomer for story mode); an optional saree tint. */
  setPlayerModel(modelId: string, saree?: string): void {
    if (!this.assets.has(modelId)) return;
    const old = this.player;
    const model = this.assets.instantiate(modelId);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      if (saree) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const tinted = mats.map((m) => {
          if (m.name !== "MAT_Saree_A") return m;
          const c = (m as THREE.MeshStandardMaterial).clone();
          c.color.set(saree);
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? tinted : tinted[0]!;
      }
    });
    const clips = modelId === PLAYER_MODEL ? this.assets.clips(PLAYER_MODEL) : this.assets.retargetClips(PLAYER_MODEL, modelId);
    const animator = new CharacterAnimator(model, clips, WALK_SPEED, RUN_SPEED);
    const p = new PlayerController(model, animator, this.level.collision);
    p.onLand = old.onLand;
    p.onJump = old.onJump;
    p.teleport([old.position.x, old.position.y, old.position.z], old.yaw);
    this.scene.remove(old.object);
    this.scene.add(p.object);
    this.player = p;
    this.playerMaterials = null;
    this.playerAlpha = 1;
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
    if (!this.session.state.quests.q_arrival && this.settings.tutorial === false) this.toast("Valli is waiting just inside the gate. Walk with W A S D, press E to talk.", "info");
  }

  pause(): void {
    if (this.ui.get().mode !== "play") return;
    this.input.releaseLock();
    this.ui.set({ mode: "paused" });
  }

  resume(): void {
    // a pause over an open panel (focus loss mid-dialogue) returns to that panel, so its conversation still ends properly
    this.ui.set({ mode: "play" });
    if (!this.ui.get().panel) this.input.requestLock();
  }

  openPanel(panel: Panel): void {
    if (this.ui.get().mode !== "play") return;
    if (panel === "storage") this.lidOpen = "home_chest";
    if (panel === "container") this.lidOpen = this.session.defs.containers.get(this.ui.get().containerId ?? "")?.placementId ?? null;
    if (panel) this.tut.panelsOpened.add(panel);
    this.input.releaseLock();
    this.audio.play("ui_open");
    this.ui.set({ panel });
  }

  closePanel(): void {
    const { panel } = this.ui.get();
    if (panel === "storage" || panel === "container") {
      this.lidOpen = null;
      if (this.player.animator.currentAction === "open_container" || !this.player.animator.busy) this.player.animator.play("close_container", { once: true });
    }
    if (panel === "minigame" && this.visit?.ui.mini) {
      // Esc out of a mini-game: it counts as a failed attempt
      this.ui.set({ panel: null });
      this.visit.finishMini({ ok: false });
      if (this.ui.get().mode === "play") this.input.requestLock();
      return;
    }
    if (panel === "visitScore") return; // the score screen leaves through its own buttons
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
    if (this.visit) return true; // a visit is a separate run; it never writes the story save
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
      case "handover":
        // hands the item across (or takes it): a one-shot over the conversation pose
        this.player.animator.play(e.give ? "give_item" : "receive_item", { once: true });
        break;
      case "gathered":
        this.tut.gathered = true;
        this.audio.play("sfx_pickup");
        break;
      case "crafted":
        this.audio.play("sfx_craft");
        break;
      case "restored":
        this.audio.play("sfx_restore");
        this.audio.play("mus_restoration");
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
        this.tut.inspected = true;
        this.tut.panelsOpened.add("inspect");
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
    if (act.verb === "visit") {
      this.audio.play("ui_confirm");
      this.visit?.perform(act.id ?? "");
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
        this.lockFor("door_push");
        break;
      case "pickup":
        this.lockFor("pickup_ground");
        break;
      case "rest":
        break;
    }
  }

  private lockFor(clip: "interact_reach" | "pickup_ground" | "gather_flower" | "plant_seed" | "water_plant" | "harvest_plant" | "inspect_object" | "door_push"): void {
    this.player.locked = true;
    const ok = this.player.animator.play(clip, { once: true, onDone: () => (this.player.locked = false) });
    if (!ok) this.player.locked = false;
  }

  /**
   * Sit on whatever seat is behind the interaction point: the seat height, depth, floor and backrest are
   * measured from the collision proxies now, then the approach -> turn -> sit-down choreography runs.
   */
  private sitAt(at: THREE.Vector3, faceY: number): void {
    if (this.player.airborne || this.player.busy || this.seat) return;
    const info = measureSeat(this.level.collision, at, faceY);
    if (!info) {
      this.toast("There is nowhere to sit here.", "bad");
      return;
    }
    this.seat = new SeatSession(
      this.player,
      info,
      () => this.toast("Press a movement key to stand up.", "info"),
      () => {
        this.seat = null;
      },
    );
  }

  private playerAlpha = 1;
  private playerMaterials: THREE.Material[] | null = null;

  /** Fade the player out when the camera is pressed against them (a wall behind), so we never see inside the head. */
  private fadePlayer(): void {
    this.player.rig?.head.getWorldPosition(this.lookPointB);
    const d = this.camera.position.distanceTo(this.lookPointB);
    const alpha = Math.round(THREE.MathUtils.smoothstep(d, 0.45, 0.95) * 50) / 50;
    if (alpha === this.playerAlpha) return;
    this.playerAlpha = alpha;
    if (!this.playerMaterials) {
      const mats = new Set<THREE.Material>();
      this.player.model.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const x of Array.isArray(m) ? m : [m]) mats.add(x);
      });
      this.playerMaterials = [...mats];
    }
    for (const m of this.playerMaterials) {
      const fading = alpha < 0.999;
      if (m.transparent !== fading) {
        m.transparent = fading;
        m.needsUpdate = true;
      }
      m.opacity = alpha;
      m.depthWrite = !fading;
    }
    this.player.model.visible = alpha > 0.02;
  }

  private lastTrespass = -999;
  private lastBellHour = -1;
  /** Inside the granary after closing time without Selvam's key: the watchman objects (and remembers). */
  private checkTrespass(indoors: boolean): void {
    if (!indoors || this.visit) return;
    const granary = this.level.byId.get("granary");
    if (!granary || granary.position.distanceTo(this.player.position) > 5) return;
    const h = this.session.hourOfDay;
    if ((h < 19 && h >= 6) || this.session.state.flags.granary_key) return;
    if (this.clock - this.lastTrespass < 30) return;
    this.lastTrespass = this.clock;
    if (this.npcs.say("npc_kaaval", "trespass")) {
      this.session.changeRelationship("npc_kaaval", -3);
      this.toast("Kannan doesn't like you being in the granary after dark.", "bad");
    }
  }

  /** The temple bell for the morning and evening puja, heard within 80 m of the temple. */
  private templeBells(): void {
    const h = Math.floor(this.session.hourOfDay);
    if (h === this.lastBellHour) return;
    this.lastBellHour = h;
    if (h !== 5 && h !== 17) return;
    if (this.player.position.distanceTo(TEMPLE_BELL) > 80) return;
    [0, 900, 1800].forEach((ms) => window.setTimeout(() => this.audio.visitCue("bell"), ms));
    this.npcs.say("npc_archaka", "bell");
  }

  /** Onboarding: feed what the player did into the current step; complete it in the save flags. */
  private updateTutorial(dt: number): void {
    const flags = this.session.state.flags;
    const step = this.visit || this.settings.tutorial === false ? null : currentStep(flags);
    if (step) {
      const t = this.tut;
      t.cameraTurned += Math.abs(Math.atan2(Math.sin(this.cam.yaw - this.tutYaw), Math.cos(this.cam.yaw - this.tutYaw)));
      if (this.player.grounded) t.walked += Math.min(1, this.player.position.distanceTo(this.tutPos));
      if (this.player.stats.gait === "jog" || this.player.stats.gait === "sprint") t.jogSeconds += dt;
      t.jumps = this.player.stats.jumps;
      t.talkedToValli = !!this.session.state.quests.q_arrival;
      if (stepDone(step.id, t)) {
        flags[`tut_${step.id}`] = true;
        this.audio.play("ui_confirm");
      }
    }
    this.tutYaw = this.cam.yaw;
    this.tutPos.copy(this.player.position);
    const now = this.visit || this.settings.tutorial === false ? null : currentStep(flags);
    const cur = this.ui.get().tutorial;
    if ((now?.id ?? null) !== (cur ? TUTORIAL[cur.index]?.id : null))
      this.ui.set({ tutorial: now ? { index: TUTORIAL.indexOf(now), total: TUTORIAL.length, text: now.text, keys: now.keys } : null });
  }

  /** Skip the rest of the onboarding (the tutorial card's Skip button). */
  skipTutorial(): void {
    for (const t of TUTORIAL) this.session.state.flags[`tut_${t.id}`] = true;
    this.ui.set({ tutorial: null });
  }

  /** Landing juice and consequences: camera shake and dust scale with the fall; a long fall hurts (limp). */
  private onPlayerLand(kind: LandKind, height: number): void {
    const p = this.player.position;
    if (height > 0.3) this.atmosphere.puff(p, Math.min(1, height / 2.5));
    if (kind === "soft") {
      if (height > 0.4) this.audio.footstep(p.y > 0.03 ? "stone" : "soil", true);
      return;
    }
    this.cam.addShake(kind === "injury" ? 0.14 : 0.07);
    this.audio.footstep(p.y > 0.03 ? "stone" : "soil", true);
    this.audio.footstep(p.y > 0.03 ? "stone" : "soil", true);
    if (kind === "injury") {
      this.audio.play("ui_error");
      this.toast("Ouch. That was a long drop - you'll be limping for a moment.", "bad");
    }
    for (const l of this.landListeners) l(kind, height);
  }

  private standUp(): void {
    if (this.seat?.seated) this.seat.rise();
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
    this.audio.tick();
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
      }
      // re-read the UI: a hotkey pressed in the same frame as the Esc that closed a panel still opens its panel
      const now = this.ui.get();
      if (now.mode === "play" && now.panel === null) {
        if (this.input.wasPressed("inventory")) this.openPanel("inventory");
        else if (this.input.wasPressed("journal")) this.openPanel("journal");
        else if (this.input.wasPressed("record")) this.openPanel("record");
        else if (this.input.wasPressed("map")) this.openPanel("map");
        else if (this.input.wasPressed("community")) this.openPanel("community");
      }
      if (this.seated && ui.panel === null && (this.input.isDown("forward") || this.input.isDown("back") || this.input.isDown("left") || this.input.isDown("right") || this.input.wasPressed("jump"))) this.standUp();
      // no interacting mid-air, mid-vault or while a landing or the seat choreography owns the body
      const canAct = ui.panel === null && !this.player.locked && !this.player.airborne && !this.player.busy && !this.seated && !this.visit?.controlsPlayer;
      this.session.advanceTime(dt * MINUTES_PER_SECOND);
      const focus = canAct ? this.interaction.update(this.player.position, this.player.yaw) : null;
      // gamepad A is contextual: interact with a target, otherwise jump
      if (!focus && ui.panel === null && this.input.padPressedButton(0)) this.player.requestJump();
      this.player.lookTarget = focus ? this.lookPoint.copy(focus.position).setY(focus.position.y + (focus.def.kind === "npc" ? 1.55 : 0.6)) : null;
      if (this.visit && ui.panel === null) this.visit.update(dt);
      this.player.carrying = !this.visit && this.session.state.inventory.some((x) => x?.itemId === "water_vessel_full");
      if (!this.visit?.controlsPlayer) this.player.update(dt, ui.panel === null && !this.seated ? this.input : NO_INPUT, this.cam.yaw);
      this.seat?.update(dt);
      const pSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
      const sprint = THREE.MathUtils.clamp((pSpeed - RUN_SPEED) / (SPRINT_SPEED - RUN_SPEED), 0, 1);
      const drive = this.visit?.vehicleHeading;
      if (drive) {
        // vehicle camera: swing behind the auto while it moves, unless the player is looking around
        if (Math.abs(drive.speed) > 1 && Math.abs(this.input.mouseDX) < 1) {
          const want = drive.yaw + Math.PI;
          this.cam.yaw += Math.atan2(Math.sin(want - this.cam.yaw), Math.cos(want - this.cam.yaw)) * (1 - Math.exp(-2 * dt));
        }
        this.cam.update(dt, ui.panel === null ? this.input : NO_LOOK, this.visit!.cameraFocus(this.lookPointB)!, undefined, Math.min(1, Math.abs(drive.speed) / 9) * 0.6, false);
      } else this.cam.update(dt, ui.panel === null ? this.input : NO_LOOK, this.player.position, this.player.velocity, sprint, !this.seated);
      this.fadePlayer();
      this.npcs.update(dt, { position: this.player.position, speed: pSpeed, busy: ui.panel !== null || this.player.locked });
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
      if (this.autosaveTimer > 60 && !this.visit) {
        this.autosaveTimer = 0;
        void this.saveGame();
      }
      this.updateLocation();
      this.updateTutorial(dt);
      if (!this.visit) this.templeBells();
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
    if (this.level?.water) this.level.water.uniforms.uTime!.value += dt;
    this.sky.position.copy(this.camera.position);
    this.renderer.info.reset(); // post passes render several times a frame: count them all (autoReset is off)
    this.postfx.render(dt);
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
    // chest and crate lids swing about their back hinge
    for (const [placementId, lid] of this.level.lids) {
      const want = this.lidOpen === placementId ? 1 : 0;
      const cur = this.lidAngles.get(placementId) ?? 0;
      const next = cur + (want - cur) * (1 - Math.exp(-7 * dt));
      this.lidAngles.set(placementId, next);
      lid.node.rotation.x = lid.baseRotX - next * 1.25;
    }
    // indoors = a ceiling or roof collider directly overhead
    if (this.player) {
      _head.copy(this.player.position).y += 1.7;
      const indoors = this.level.collision.raycast(_head, _UP, 2.5) < 2.5;
      if (indoors !== this.indoors) {
        this.indoors = indoors;
        this.ui.set({ indoors });
      }
      this.checkTrespass(indoors);
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
      // Velan at his bench by day: the chisel is heard from the workshop
      const velan = this.npcs.positionOf("npc_velan");
      const working = h >= 7 && h < 18 && Math.hypot(velan.x - 25.5, velan.z - 8) < 3.5 ? 1 : 0;
      this.camera.getWorldDirection(_listenDir);
      this.audio.setListener(this.camera.position.x, this.camera.position.y, this.camera.position.z, _listenDir.x, _listenDir.y, _listenDir.z);
      this.audio.updateAmbience(dt, {
        workshop: working,
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

  /** Music for the hour and place (musicCueFor); evening ambience after 18:00. Checked every few seconds. */
  updateMusic(): void {
    const h = this.session.hourOfDay;
    const p = this.player.position;
    const ws = REGIONS.find((r) => r.id === "loc_workshop");
    const inWorkshop = !!ws && p.x >= ws.min[0] && p.x <= ws.max[0] && p.z >= ws.min[1] && p.z <= ws.max[1];
    this.audio.setMusic(musicCueFor({ hour: h, festivalHeld: !!this.session.state.flags.festival_held, inWorkshop, visiting: !!this.visit }));
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
  /** flame world positions (flames never move), measured once */
  private flamePos = new Map<THREE.Object3D, THREE.Vector3>();
  /** the nearest visible flames this frame, kept sorted by distance (reused every frame) */
  private flameSlots = Array.from({ length: LAMP_LIGHTS }, () => ({ pos: null as THREE.Vector3 | null, d: Infinity }));
  private updateLampLights(day: number): void {
    if (!this.level) return;
    if (!this.lampLights.length) {
      for (let i = 0; i < LAMP_LIGHTS; i++) {
        const l = new THREE.PointLight(0xffb060, 0, 9, 1.6);
        l.castShadow = false;
        this.lampLights.push(l);
        this.scene.add(l);
      }
    }
    const strength = THREE.MathUtils.clamp(1 - day * 1.6, 0, 1) * 6;
    if (strength <= 0) {
      for (const l of this.lampLights) l.intensity = 0;
      return;
    }
    const p = this.player?.position ?? _ORIGIN;
    const slots = this.flameSlots;
    for (const s of slots) {
      s.pos = null;
      s.d = Infinity;
    }
    const last = slots.length - 1;
    for (const f of this.level.flames) {
      let shown = true;
      for (let o: THREE.Object3D | null = f; o && shown; o = o.parent) shown = o.visible;
      if (!shown) continue;
      let pos = this.flamePos.get(f);
      if (!pos) {
        pos = f.getWorldPosition(new THREE.Vector3());
        this.flamePos.set(f, pos);
      }
      const d = pos.distanceToSquared(p);
      if (d >= slots[last]!.d) continue;
      let i = last;
      for (; i > 0 && slots[i - 1]!.d > d; i--) {
        slots[i]!.pos = slots[i - 1]!.pos;
        slots[i]!.d = slots[i - 1]!.d;
      }
      slots[i]!.pos = pos;
      slots[i]!.d = d;
    }
    this.lampLights.forEach((l, i) => {
      const t = slots[i]!.pos;
      l.intensity = t ? strength * (0.9 + Math.random() * 0.2) : 0;
      if (t) {
        l.position.copy(t);
        l.position.y += 0.3;
      }
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
    const center = this.player?.position ?? _ORIGIN;
    const dir = _sunDir.set(Math.cos(az) * 0.8, elev, -0.45).normalize();
    this.sun.position.copy(center).addScaledVector(dir, 70);
    this.sun.target.position.copy(center);
    const cloud = this.weather.cloud;
    // overcast: the direct sun is diffused into sky light (soft, near-shadowless), and rain pulls the fog in
    this.sun.intensity = (0.55 + day * 1.8) * (1 - cloud * 0.8); // moonlight floor keeps nights readable
    this.sun.color.setRGB(1, 0.92 - dusk * 0.25, 0.82 - dusk * 0.4).lerp(C_MOON, 1 - day);
    this.hemi.intensity = 0.8 + day * (0.4 + cloud * 0.45);
    this.hemi.color.setHex(0xcfe3f5).lerp(C_HEMI_NIGHT, 1 - day);
    const top = _skyTop.setHex(0x7fb2dc).lerp(C_TOP_NIGHT, 1 - day).lerp(_overcast.setHex(0x6d7480).multiplyScalar(0.4 + day * 0.6), cloud * 0.7);
    const horizon = _skyHorizon.setHex(0xf1dcb5).lerp(C_DUSK, dusk * 0.6).lerp(C_HAZE, cloud * 0.65).lerp(C_HORIZON_NIGHT, 1 - day);
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
    this.postfx?.setBloom(0.1 + (1 - day) * 0.3); // lamps and flames glow at night; daylight barely blooms
    this.updateLampLights(day);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.input.dispose();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pagehide", this.saveOnHide);
    document.removeEventListener("visibilitychange", this.saveOnHide);
    this.timer.dispose();
    this.renderer.dispose();
  }
}
