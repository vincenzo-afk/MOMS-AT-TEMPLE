import * as THREE from "three";
import type { Game } from "../core/Game";
import type { InteractionAction } from "../core/interactables";
import { Vehicle } from "../vehicle/Vehicle";
import { Family, Person } from "./Followers";
import { VisitWorld } from "./VisitWorld";
import { BAG_ITEMS, FAMILY, GOSSIP, GOTRAS, LAYOUTS, NAKSHATRAS, PRAYER_NAMES, SLOKAS, TITHIS, type TempleLayout } from "../../data/visit";
import {
  ACTION_BY_ID,
  MOM_BY_ID,
  SAREES,
  TEMPLE_BY_ID,
  act,
  addStress,
  blessingsMultiplier,
  finalScore,
  newRun,
  settleRun,
  type Profile,
  type RunState,
  type RunSummary,
  type StageId,
} from "./rules";

// --------------------------------------------------------------------------- UI contract
export type MiniKind = "bag" | "tithi" | "hide" | "seek" | "choice" | "coconut" | "lamps" | "sloka" | "archana" | "darshan" | "prayer" | "gossip" | "photo";

export interface MiniGame {
  kind: MiniKind;
  title: string;
  /** kind-specific content (items, options, timings) */
  data: Record<string, unknown>;
}

export interface QueueUi {
  lane: number;
  lanes: Array<{ label: string; speed: number }>;
  progress: number;
  length: number;
  hints: string[];
  event: string | null;
}

export interface VisitUi {
  momName: string;
  templeName: string;
  festival: boolean;
  punya: number;
  blessings: number;
  stress: number;
  multiplier: number;
  streak: { category: string | null; count: number };
  stage: StageId;
  objective: string;
  info: string;
  lastAction: { label: string; points: number; combo: boolean; key: number } | null;
  pradakshina: number;
  queue: QueueUi | null;
  driving: boolean;
  mini: MiniGame | null;
  summary: (RunSummary & { ended: "exit" | "stress"; templeId: string; personalBest: number }) | null;
}

const STAGE_NAMES: Record<StageId, string> = {
  home: "Getting ready",
  arrival: "Arrival and chappals",
  queue: "The queue",
  rituals: "Rituals",
  darshan: "The darshan",
  exit: "Exit and social",
  steps: "The hill steps",
};

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

interface Station {
  key: string;
  label: string;
  position: () => THREE.Vector3;
  radius: number;
  actions: () => InteractionAction[];
}

interface LaneCrowd {
  label: string;
  speed: number; // m/s of flow
  people: Array<{ person: Person; q: number; aunty: boolean }>;
}

/**
 * Runs one Temple Visit (GAME_DESIGN.md): the six stages as places in the 3D world, the family, the auto,
 * chappals, the queue runner, rituals, darshan and exit, the mini-games (through the UI), the meters, and the
 * end-of-run settlement into the saved profile. Every score change goes through rules.act().
 */
export class VisitDirector {
  run: RunState;
  readonly layout: TempleLayout;
  private world: VisitWorld;
  private family = new Family();
  private crowd: LaneCrowd[] = [];
  private extras: Person[] = [];
  private auto: Vehicle | null = null;
  driving = false;
  private stations: Station[] = [];
  private registered = false;
  private t = 0;
  private lastKey = 0;
  // stage progress
  private woke = false;
  private bag: string[] | null = null;
  private tithi: string;
  private nakshatra: string;
  private gotra: string;
  private leftHome = false;
  private parked = false;
  private chappalsOff = false;
  private chappalsBack = false;
  private bushKey: string | null = null;
  private enteredTemple = false;
  private queueDone = false;
  private lampsDone = false;
  private darshanTried = false;
  private prayed = false;
  private vibhutiUntil = 0;
  private vibhutiDone = new Set<string>();
  private photoTries = 0;
  private prasadamAsked = false;
  private wandered: string | null = null;
  private atStairFoot = false;
  private pradAngle: number | null = null;
  private pradAccum = 0;
  // queue runner
  private q: { lane: number; p: number; switchT: number; switchFrom: number; joinedFastest: boolean; events: Set<string>; event: string | null; eventT: number; kidAhead: number; prayHeld: number } | null = null;
  private wishes = 4;
  private houseCenter = new THREE.Vector3(-26, 0, 28);
  readonly ui: VisitUi;

  constructor(
    private game: Game,
    private profile: Profile,
    momId: string,
    templeId: string,
    festival: boolean,
    private worlds: Map<string, VisitWorld>,
  ) {
    this.run = newRun(momId, templeId, festival);
    this.layout = LAYOUTS[this.run.templeId]!;
    let w = worlds.get(this.layout.templeId);
    if (!w) {
      w = new VisitWorld(this.layout, game.assets, game.level.collision);
      worlds.set(this.layout.templeId, w);
      game.scene.add(w.group);
    }
    this.world = w;
    const rnd = () => Math.random();
    this.tithi = TITHIS[Math.floor(rnd() * 3)]!; // Pournami, Sashti or Pradosham, as the design names
    this.nakshatra = NAKSHATRAS[Math.floor(rnd() * NAKSHATRAS.length)]!;
    this.gotra = GOTRAS[Math.floor(rnd() * GOTRAS.length)]!;
    this.wishes = 3 + Math.floor(rnd() * 3);
    const mom = MOM_BY_ID.get(this.run.momId)!;
    const temple = TEMPLE_BY_ID.get(this.run.templeId)!;
    this.ui = {
      momName: mom.name,
      templeName: temple.name,
      festival,
      punya: 0,
      blessings: 0,
      stress: 0,
      multiplier: 1,
      streak: { category: null, count: 0 },
      stage: "home",
      objective: "",
      info: `Family: gotra ${this.gotra} · your nakshatra ${this.nakshatra}`,
      lastAction: null,
      pradakshina: 0,
      queue: null,
      driving: false,
      mini: null,
      summary: null,
    };
  }

  // ------------------------------------------------------------------ lifecycle
  start(): void {
    const g = this.game;
    this.world.setActive(true);
    this.world.resetLamps();
    g.npcs.suppressed.add("npc_archaka");
    // the house's player bed: wake up there at 4:50
    const bed = g.level.sockets.get("house_player.SOCKET_Bed") ?? new THREE.Vector3(-27.2, 0.45, 26.5);
    const inside = g.level.sockets.get("house_player.SOCKET_Inside") ?? this.houseCenter;
    this.houseCenter.copy(inside);
    g.session.state.worldMinutes = 4 * 60 + 50;
    g.npcs.snapToSchedule();
    g.player.teleport([inside.x, inside.y + 0.2, inside.z], Math.atan2(bed.x - inside.x, bed.z - inside.z));
    g.cam.snapTo(g.player.position, g.player.yaw + Math.PI);
    // family
    const clipsFrom = "CHR_Player_Base";
    for (const f of FAMILY) if (g.assets.has(f.model)) this.family.add(new Person(f.id, f.name, g.assets, f.model, clipsFrom, g.level.collision));
    g.scene.add(this.family.group);
    this.family.snapBehind(g.player.position, g.player.yaw);
    // the gossip aunty, waiting near the exit
    if (g.assets.has("CHR_Villager_C")) {
      const aunty = new Person("aunty_gossip", "Lakshmi-aunty", g.assets, "CHR_Villager_C", clipsFrom, g.level.collision);
      const [x, y, z] = this.layout.gossip;
      aunty.place(x, y, z, Math.PI);
      this.extras.push(aunty);
      g.scene.add(aunty.object);
    }
    if (g.assets.has("CHR_NPC_Priest")) {
      const priest = new Person("priest", "Priest", g.assets, "CHR_NPC_Priest", clipsFrom, g.level.collision);
      const [x, y, z] = this.layout.priest;
      priest.place(x, y, z, Math.atan2(this.layout.darshan[0] - x, this.layout.darshan[2] - z) + Math.PI);
      priest.setPose("talk_idle");
      this.extras.push(priest);
      g.scene.add(priest.object);
    }
    const autoObj = this.world.props.get("auto");
    if (autoObj) {
      autoObj.position.set(...this.layout.auto.pos);
      autoObj.rotation.y = (this.layout.auto.rotY * Math.PI) / 180;
      this.auto = new Vehicle(autoObj, g.level.collision);
      this.auto.yaw = autoObj.rotation.y;
    }
    this.buildQueueCrowd();
    this.registerStations();
    g.landListeners.push(this.onLand);
    this.refresh();
    g.toast(`${this.ui.momName} at the ${this.ui.templeName}${this.run.festival ? " - festival day: points and penalties doubled" : ""}.`, "info");
  }

  /** Remove everything this visit added (props are hidden, people removed). */
  dispose(): void {
    const g = this.game;
    this.world.setActive(false);
    this.world.resetLamps();
    g.npcs.suppressed.delete("npc_archaka");
    g.scene.remove(this.family.group);
    for (const e of this.extras) g.scene.remove(e.object);
    for (const lane of this.crowd) for (const c of lane.people) g.scene.remove(c.person.object);
    const i = g.landListeners.indexOf(this.onLand);
    if (i >= 0) g.landListeners.splice(i, 1);
    const prefix = `visit_${this.layout.templeId}_`;
    g.interaction.unregister((s) => s.def.kind === "visit" && s.def.id.startsWith(prefix));
    this.stations = [];
  }

  private onLand = (kind: string, height: number): void => {
    if (this.run.ended) return;
    const s = kind === "injury" ? 15 : kind === "hard" ? 6 : 0;
    if (s > 0) {
      addStress(this.run, s);
      this.game.toast(`Aiyyo! A ${height.toFixed(1)} m drop. Stress +${s}.`, "bad");
      this.game.audio.visitCue("aiyyo");
      this.checkStressEnd();
    }
  };

  // ------------------------------------------------------------------ scoring
  private score(actionId: string): boolean {
    const r = act(this.run, actionId);
    if (!r.ok) return false;
    const a = ACTION_BY_ID.get(actionId)!;
    this.ui.lastAction = { label: a.label, points: r.points, combo: r.combo, key: ++this.lastKey };
    if (a.category === "penalty") this.game.audio.visitCue("aiyyo");
    else if (r.points >= 30 || r.combo) this.game.audio.visitCue("nadaswaram");
    else this.game.audio.visitCue(a.category === "devotion" ? "bell" : "chime");
    this.refresh();
    this.checkStressEnd();
    return true;
  }

  private checkStressEnd(): void {
    if (this.run.ended === "stress") this.finish("stress");
  }

  private refresh(): void {
    const r = this.run;
    const u = this.ui;
    u.punya = r.punya;
    u.blessings = r.blessings;
    u.stress = r.stress;
    u.multiplier = blessingsMultiplier(r.blessings);
    u.streak = { ...r.streak };
    u.stage = r.stage;
    u.pradakshina = r.pradakshina;
    u.driving = this.driving;
    u.objective = this.objective();
    this.game.ui.set({ visit: { ...u, queue: u.queue ? { ...u.queue } : null } });
  }

  private objective(): string {
    if (!this.woke && this.run.stage === "home") return "Wake up before 5 AM: press E at the cot.";
    if (this.run.stage === "home") return this.bag ? "Check the calendar, dress the family, then go out to the auto." : "Pack the temple bag from the shelf before the auto honks.";
    if (this.run.stage === "arrival") {
      if (!this.parked && !this.enteredTemple) return this.driving ? "Drive to the temple and park close to the gate. E to get out." : "Get in the auto (it's outside) and drive to the temple.";
      if (!this.chappalsOff) return "Chappals off before the gate: the stand, a secret bush, the auto - or sweet-talk the guard.";
      return "Join the darshan queue.";
    }
    if (this.run.stage === "queue") return this.q ? "Shuffle forward (W), switch lanes (A/D), chat (E), pray (hold R), send a kid ahead (T)." : "Pick a queue lane: FREE, Rs 20 or Rs 100.";
    if (this.run.stage === "rituals") return `Coconut, lamps (${this.wishes} wishes), pradakshina (${this.run.pradakshina} rounds), sloka and archana at the priest, then the darshan.`;
    if (this.run.stage === "darshan") return this.prayed ? "Ask the priest for prasadam and tulsi, then head out." : "Hold the darshan, then pray for the whole family.";
    if (this.run.stage === "steps") return "Climb the hill steps to the shrine.";
    return this.chappalsBack ? "Prasadam for the neighbours, gossip, annadanam, a gopuram photo - then head home in the auto." : "Collect your chappals from where you left them.";
  }

  private advanceStage(s: StageId): void {
    const order: StageId[] = ["home", "arrival", "steps", "queue", "rituals", "darshan", "exit"];
    if (order.indexOf(s) > order.indexOf(this.run.stage)) {
      this.run.stage = s;
      this.game.toast(STAGE_NAMES[s], "info");
    }
  }

  // ------------------------------------------------------------------ stations
  private registerStations(): void {
    const g = this.game;
    const W = this.world;
    const L = this.layout;
    const live = () => g.visit === this && !this.run.ended && !this.ui.mini && !this.q && !this.driving;
    const add = (key: string, label: string, position: () => THREE.Vector3, radius: number, actions: () => InteractionAction[]) => this.stations.push({ key, label, position, radius, actions });
    const a = (id: string, label: string, enabled = true, reason?: string): InteractionAction => ({ verb: "visit", id, label, enabled, reason });
    const fixed = (v: THREE.Vector3) => () => v;
    const bed = g.level.sockets.get("house_player.SOCKET_Bed") ?? new THREE.Vector3(-27.2, 0.45, 26.5);

    add("cot", "your cot", fixed(bed), 1.6, () => (this.run.stage === "home" && !this.woke ? [a("wake", "Wake up")] : []));
    add("bag", "temple bag", () => W.position("bag"), 1.5, () => (this.run.stage === "home" && !this.bag ? [a("pack", "Pack the temple bag")] : []));
    add("calendar", "calendar", () => W.position("calendar"), 1.5, () => (this.run.stage === "home" && !this.run.done.includes("remember_tithi") && !this.flag("tithi_tried") ? [a("tithi", "Check today on the calendar")] : []));
    add("husband", "Ravi", () => this.member("husband")?.position ?? bed, 1.6, () =>
      this.run.stage === "home" && !this.flag("pattu_tried") ? [a("pattu", "Get the family into matching pattu")] : this.vibhutiActive() && !this.vibhutiDone.has("husband") ? [a("vibhuti_husband", "Vibhuti for Ravi")] : [],
    );
    for (const f of FAMILY.slice(1))
      add(f.id, f.name, () => this.member(f.id)?.position ?? bed, 1.4, () => (this.vibhutiActive() && !this.vibhutiDone.has(f.id) ? [a(`vibhuti_${f.id}`, `Vibhuti for ${f.name}`)] : []));
    add("auto", "auto-rickshaw", () => this.auto?.position ?? new THREE.Vector3(...L.auto.pos), 2.6, () => {
      const out: InteractionAction[] = [];
      if (!this.queueDone && !this.enteredTemple) out.push(a("drive", "Get in the auto"));
      if (!this.chappalsOff && this.parked) out.push(a("chappals_car", "Leave your chappals in the auto"));
      if (this.chappalsOff && !this.chappalsBack && this.run.chappals.method === "car" && this.queueDone) out.push(a("collect_car", "Take your chappals from the auto"));
      if (this.queueDone) out.push(a("end", "Head home (end the visit)", this.chappalsBack, "Find your chappals first."));
      return out;
    });
    add("stand", "chappal stand", () => W.socket(`${L.chappalStand}.SOCKET_Counter`, W.position(L.chappalStand)), 2.0, () => {
      if (!this.chappalsOff) return [a("chappals_stand", "Leave your chappals at the stand (pay 5 rupees)")];
      if (this.run.chappals.method === "stand" && !this.chappalsBack && this.queueDone) return [a("collect_stand", "Show the token, collect your chappals")];
      return [];
    });
    for (const [i, key] of L.bushes.entries())
      add(key, "bush", () => W.position(key), 1.9, () => {
        if (!this.chappalsOff) return [a(`hide_${key}`, "Hide your chappals in this bush")];
        if (this.run.chappals.method === "bush" && !this.chappalsBack && this.queueDone) return [a(`seek_${key}`, "Look for your chappals here")];
        void i;
        return [];
      });
    if (L.sideGate) {
      const sg = new THREE.Vector3(...L.sideGate.pos);
      add("side_gate", "side gate", fixed(sg), 2.2, () => {
        if (!this.chappalsOff) return [a("side_gate", "Talk the guard into the side gate (family and chappals)")];
        if (this.run.chappals.method === "side" && !this.chappalsBack && this.queueDone) return [a("collect_side", "Collect your chappals from the guard")];
        return [];
      });
    }
    // queue lanes (entry sockets of the rails)
    for (let i = 0; i < 3; i++) {
      const sock = W.socket(`${L.queue}.SOCKET_Lane_${i}`, W.position(L.queue));
      add(`lane_${i}`, "queue", fixed(sock), 1.3, () => (this.chappalsOff && !this.queueDone && !this.q && i < this.crowd.length ? [a(`join_${i}`, `Join the ${this.crowd[i]!.label} queue`)] : []));
    }
    add("coconut", "coconut stone", () => W.socket(`${L.coconut}.SOCKET_Stand`, W.position(L.coconut)), 1.6, () => {
      if (!this.queueDone || this.flag("coconut_tried")) return [];
      const has = !!this.bag?.includes("coconut");
      return [a("coconut", "Break the coconut", has, "You forgot the coconut at home.")];
    });
    add("lamps", "lamp stand", () => W.socket(`${L.lamps}.SOCKET_Stand`, W.position(L.lamps)), 1.6, () => (this.queueDone && !this.lampsDone ? [a("lamps", `Light lamps for your ${this.wishes} wishes`)] : []));
    const priest = new THREE.Vector3(...L.priest);
    add("priest", "priest", fixed(priest), 2.2, () => {
      if (!this.queueDone) return [];
      const out: InteractionAction[] = [];
      if (!this.flag("sloka_tried")) out.push(a("sloka", "Chant the sloka for this deity"));
      if (!this.flag("archana_tried")) out.push(a("archana", "Archana: nakshatra and gotra, no pausing"));
      if (!this.flag("vibhuti_tried")) out.push(a("vibhuti", "Vibhuti for the whole family (10 seconds)"));
      if (this.darshanTried && !this.prasadamAsked) out.push(a("extra_prasadam", "Ask for extra prasadam"));
      if (this.run.done.includes("darshan_full") && !this.run.done.includes("special_tulsi")) out.push(a("tulsi", "Receive the special tulsi"));
      return out.slice(0, 2);
    });
    add("darshan", "sanctum", fixed(new THREE.Vector3(...L.darshan)), 1.8, () => {
      if (!this.queueDone) return [];
      if (!this.darshanTried) return [a("darshan", "Stand for the darshan")];
      if (!this.prayed) return [a("pray", "Pray for every family member")];
      return [];
    });
    add("prasadam", "prasadam counter", () => W.socket(`${L.prasadam}.SOCKET_Front`, W.position(L.prasadam)), 2.0, () => (this.queueDone && !this.run.done.includes("prasadam_neighbours") ? [a("prasadam", "Buy prasadam for every neighbour")] : []));
    add("annadanam", "annadanam", () => W.position(L.annadanam), 3.0, () => (this.queueDone && !this.run.done.includes("annadanam") && !this.flag("annadanam_tried") ? [a("annadanam", "Sit the kids down for annadanam")] : []));
    add("gossip", "Lakshmi-aunty", () => this.extras.find((e) => e.id === "aunty_gossip")?.position ?? new THREE.Vector3(...L.gossip), 2.2, () => (this.queueDone && !this.flag("gossip_tried") ? [a("gossip", "Catch up with Lakshmi-aunty")] : []));
    add("photo", "photo spot", fixed(new THREE.Vector3(...L.photo)), 2.4, () => (this.queueDone && this.photoTries < 2 && !this.run.done.includes("gopuram_photo") ? [a("photo", "Family photo in front of the gopuram")] : []));

    if (!this.registered) {
      for (const st of this.stations)
        g.interaction.register({
          def: { id: `visit_${this.layout.templeId}_${st.key}`, kind: "visit", refId: st.key, label: st.label, locationId: "", radius: st.radius },
          position: st.position,
          available: () => live() && g.visit === this,
          actions: st.actions,
        });
      this.registered = true;
    }
  }

  private flags = new Set<string>();
  private lastShout = -10;
  private flag(k: string): boolean {
    return this.flags.has(k);
  }

  private member(id: string): Person | undefined {
    return this.family.members.find((m) => m.id === id);
  }

  private vibhutiActive(): boolean {
    return this.t < this.vibhutiUntil;
  }

  /** An action chosen at a station (E / R on the prompt). */
  perform(actionId: string): void {
    const g = this.game;
    const L = this.layout;
    const open = (m: MiniGame) => {
      this.ui.mini = m;
      this.refresh();
      g.openPanel("minigame");
    };
    if (actionId === "wake") {
      this.woke = true;
      if (g.session.state.worldMinutes < 300) this.score("wake_early");
      else g.toast("It's past five. The early bird has flown.", "info");
      g.player.animator.play("idle_fidget_stretch", { once: true });
    } else if (actionId === "pack") {
      open({ kind: "bag", title: "Pack the temple bag before the auto honks", data: { items: BAG_ITEMS.map((i) => ({ id: i.id, label: i.label })), seconds: 12 } });
    } else if (actionId === "tithi") {
      this.flags.add("tithi_tried");
      open({ kind: "tithi", title: "What is special about today?", data: { shown: this.tithi, options: TITHIS.slice(0, 3), seconds: 6 } });
    } else if (actionId === "pattu") {
      this.flags.add("pattu_tried");
      open({ kind: "choice", title: "Ravi is reaching for his everyday shirt...", data: { id: "pattu", options: ["Matching silk pattu for everyone!", "Whatever is ironed."] } });
    } else if (actionId === "drive") {
      this.enterAuto();
    } else if (actionId === "chappals_car") {
      this.chappalsLeft("car", "chappals_car");
    } else if (actionId === "chappals_stand") {
      this.chappalsLeft("stand", "chappals_stand");
    } else if (actionId.startsWith("hide_")) {
      this.bushKey = actionId.slice(5);
      open({ kind: "hide", title: "Pick a hiding spot - and remember it", data: { spots: ["Under the big leaves", "Behind the roots", "By the red flowers", "Next to the stone"] } });
    } else if (actionId === "side_gate") {
      g.player.animator.play("talk_gesture", { once: true });
      this.chappalsLeft("side", "side_gate");
      g.toast("\"For you, amma, the side gate. Leave the chappals with me.\"", "good");
    } else if (actionId.startsWith("join_")) {
      this.joinQueue(Number(actionId.slice(5)));
    } else if (actionId === "coconut") {
      this.flags.add("coconut_tried");
      g.player.faceTowards(this.world.position(L.coconut));
      open({ kind: "coconut", title: "Break the coconut: stop the marker in the green", data: { speed: 1.6 + Math.random() * 0.6 } });
    } else if (actionId === "lamps") {
      open({ kind: "lamps", title: `Light one lamp for each wish (${this.wishes} wishes)`, data: { wishes: this.wishes, lamps: this.world.lampFlames.length || 9, matches: this.wishes + 2 } });
    } else if (actionId === "sloka") {
      this.flags.add("sloka_tried");
      const s = SLOKAS[this.layout.templeId] ?? SLOKAS.city!;
      const options = [s.right, ...s.wrong].sort(() => Math.random() - 0.5);
      open({ kind: "sloka", title: `Chant the sloka for ${s.deity}`, data: { options, right: s.right, seconds: 8 } });
    } else if (actionId === "archana") {
      this.flags.add("archana_tried");
      open({ kind: "archana", title: "Archana: tell the priest, without pausing", data: { nakshatras: this.pick(NAKSHATRAS, this.nakshatra, 4), gotras: this.pick(GOTRAS, this.gotra, 4), seconds: 3 } });
    } else if (actionId === "vibhuti") {
      this.flags.add("vibhuti_tried");
      this.vibhutiUntil = this.t + 10;
      this.vibhutiDone.clear();
      g.player.animator.play("apply_vibhuti", { once: true });
      this.vibhutiDone.add("self");
      g.toast("Vibhuti for everyone - walk to each of them and press E. 10 seconds!", "info");
    } else if (actionId.startsWith("vibhuti_")) {
      const who = actionId.slice(8);
      this.vibhutiDone.add(who);
      g.player.animator.play("apply_vibhuti", { once: true });
      if (FAMILY.every((f) => this.vibhutiDone.has(f.id)) && this.vibhutiActive()) {
        this.score("vibhuti_family");
        this.vibhutiUntil = 0;
      }
    } else if (actionId === "darshan") {
      this.darshanTried = true;
      this.advanceStage("darshan");
      open({ kind: "darshan", title: "Hold the darshan for 5 seconds", data: { seconds: 5, crowd: TEMPLE_BY_ID.get(this.run.templeId)!.crowd } });
    } else if (actionId === "pray") {
      open({ kind: "prayer", title: "Pray for every family member - don't forget anyone", data: { names: [...PRAYER_NAMES, "The neighbour's cat"].sort(() => Math.random() - 0.5), needed: PRAYER_NAMES, seconds: 10 } });
    } else if (actionId === "extra_prasadam") {
      this.prasadamAsked = true;
      if (Math.random() < 0.7 || this.run.momId === "social") this.score("extra_prasadam");
      else g.toast("\"Next time, amma.\" No extra prasadam today.", "info");
    } else if (actionId === "tulsi") {
      this.score("special_tulsi");
    } else if (actionId === "collect_car" || actionId === "collect_stand" || actionId === "collect_side") {
      this.collectChappals();
    } else if (actionId.startsWith("seek_")) {
      const key = actionId.slice(5);
      if (key !== this.bushKey) {
        addStress(this.run, 4);
        g.toast("Not in this bush... (Stress +4)", "bad");
        this.refresh();
        this.checkStressEnd();
      } else open({ kind: "seek", title: "Where exactly did you hide them?", data: { spots: ["Under the big leaves", "Behind the roots", "By the red flowers", "Next to the stone"] } });
    } else if (actionId === "prasadam") {
      g.player.animator.play("receive_item", { once: true });
      this.score("prasadam_neighbours");
    } else if (actionId === "gossip") {
      this.flags.add("gossip_tried");
      open({ kind: "gossip", title: "Lakshmi-aunty has news", data: { rounds: GOSSIP } });
    } else if (actionId === "annadanam") {
      this.flags.add("annadanam_tried");
      this.annadanam();
    } else if (actionId === "photo") {
      this.photoTries++;
      open({ kind: "photo", title: "Family photo: click when nobody is blinking", data: { faces: FAMILY.length + 1 } });
    } else if (actionId === "end") {
      this.finish("exit");
    }
    this.refresh();
  }

  private pick(all: string[], right: string, n: number): string[] {
    const others = all.filter((x) => x !== right).sort(() => Math.random() - 0.5).slice(0, n - 1);
    return [right, ...others].sort(() => Math.random() - 0.5);
  }

  private chappalsLeft(method: "car" | "stand" | "side" | "bush", actionId: string): void {
    this.chappalsOff = true;
    this.run.chappals.method = method;
    this.game.player.animator.play("pickup_ground", { once: true });
    this.score(actionId);
  }

  private collectChappals(): void {
    const g = this.game;
    const method = this.run.chappals.method ?? "stand";
    const risk = TEMPLE_BY_ID.get(this.run.templeId)!.theftRisk[method];
    g.player.animator.play("pickup_ground", { once: true });
    if (Math.random() < risk) {
      this.ui.mini = { kind: "choice", title: "Your chappals are gone!", data: { id: "missing", options: ["Look around for them", "Walk home barefoot, with dignity"] } };
      this.refresh();
      g.openPanel("minigame");
      return;
    }
    this.chappalsBack = true;
    this.score("chappals_found");
  }

  private annadanam(): void {
    const g = this.game;
    const mats = this.world.position(this.layout.annadanam);
    const kids = this.family.members.filter((m) => m.id !== "husband");
    kids.forEach((k, i) => {
      this.family.detached.add(k.id);
      k.goal = new THREE.Vector3(mats.x - 1 + i * 1.4, mats.y, mats.z - 0.5);
    });
    if (this.wandered) {
      g.toast(`There you are, ${this.member(this.wandered)?.name}! Found at the annadanam.`, "good");
      this.wandered = null;
    }
    window.setTimeout(() => kids.forEach((k) => k.setPose("sit_idle")), 2500);
    window.setTimeout(() => {
      if (this.run.ended) return;
      kids.forEach((k) => {
        k.setPose(null);
        this.family.detached.delete(k.id);
      });
      this.score("annadanam");
      g.toast("Every last grain of rice, finished!", "good");
    }, 8000);
  }

  /** The UI finished a mini-game. */
  finishMini(result: Record<string, unknown>): void {
    const g = this.game;
    const m = this.ui.mini;
    this.ui.mini = null;
    if (g.ui.get().panel === "minigame") g.closePanel();
    if (!m || this.run.ended) {
      this.refresh();
      return;
    }
    const ok = result.ok === true;
    switch (m.kind) {
      case "bag": {
        const packed = (result.packed as string[]) ?? [];
        this.bag = packed;
        const needed = BAG_ITEMS.filter((i) => i.needed).map((i) => i.id);
        const wrong = packed.filter((p) => !needed.includes(p)).length;
        if (needed.filter((n) => packed.includes(n)).length >= 4 && wrong === 0) this.score("pack_bag");
        else g.toast(wrong ? "Why is the TV remote in the temple bag?" : "Half-packed. It'll have to do.", "info");
        if (!packed.includes("coconut")) g.toast("No coconut in the bag...", "bad");
        break;
      }
      case "tithi":
        if (result.choice === this.tithi) this.score("remember_tithi");
        else g.toast(`It was ${this.tithi}! The calendar knew.`, "bad");
        break;
      case "choice":
        if (m.data.id === "pattu" && result.choice === 0) {
          this.score("family_pattu");
          this.family.members.forEach((p) => p.playOnce("greet"));
        } else if (m.data.id === "cutter") {
          if (result.choice === 0) this.score("cutter_calm");
          else {
            g.player.animator.play("scold", { once: true });
            this.score("cutter_scold");
          }
        } else if (m.data.id === "missing") {
          if (result.choice === 0 && Math.random() < 0.45) this.score("chappals_better");
          else this.score("chappals_missing");
          this.chappalsBack = true;
        }
        break;
      case "hide":
        this.run.chappals.spot = Number(result.choice ?? 0);
        this.chappalsLeft("bush", "chappals_bush");
        break;
      case "seek":
        if (Number(result.choice) === this.run.chappals.spot) this.collectChappals();
        else {
          addStress(this.run, 6);
          g.toast("You rummage in the wrong spot. Stress +6. Try again.", "bad");
        }
        break;
      case "coconut":
        g.player.animator.play("coconut_smash", { once: true });
        this.score(ok ? "coconut_clean" : "coconut_rolled");
        break;
      case "lamps": {
        const lit = Number(result.lit ?? 0);
        this.world.lampFlames.forEach((f, i) => (f.visible = i < lit));
        g.player.animator.play("light_lamp", { once: true });
        this.lampsDone = true;
        if (lit === this.wishes) this.score("lamps_right");
        else g.toast(lit < this.wishes ? "One wish will have to wait." : "Extra lamps - generous, but not the right number.", "info");
        break;
      }
      case "sloka":
        if (ok) this.score("sloka_right");
        else g.toast("The priest gently corrects you.", "info");
        break;
      case "archana":
        if (result.nakshatra === this.nakshatra && result.gotra === this.gotra && ok) this.score("archana");
        else g.toast("You paused - or mixed up the gotra. The archana goes on anyway.", "info");
        break;
      case "darshan":
        g.player.animator.play("greet", { once: true });
        this.score(ok ? "darshan_full" : "darshan_pushed");
        break;
      case "prayer":
        this.prayed = true;
        if (ok) this.score("pray_family");
        else g.toast("Someone was left out of the prayers...", "info");
        break;
      case "gossip":
        if (ok) this.score("gossip");
        else g.toast("Lakshmi-aunty moves on to someone more interested.", "info");
        break;
      case "photo":
        if (ok) this.score("gopuram_photo");
        else g.toast(this.photoTries < 2 ? "Someone blinked! One more try." : "Blinked again. The photo goes in the album anyway.", "info");
        break;
    }
    this.refresh();
  }

  // ------------------------------------------------------------------ auto-rickshaw
  private enterAuto(): void {
    if (!this.auto) return;
    this.driving = true;
    this.family.visible = false;
    this.game.player.animator.play("drive_seated", { once: false });
    this.game.cam.distance = Math.max(this.game.cam.distance, 6.5); // see the road ahead
    this.game.audio.engine(true);
    this.game.toast("W/S drive, A/D steer, Space brake, H horn, E get out.", "info");
  }

  private exitAuto(): void {
    if (!this.auto) return;
    const g = this.game;
    this.driving = false;
    g.audio.engine(false);
    g.player.animator.stopAction();
    g.cam.distance = 4.2;
    this.auto.exitPoint(_v);
    g.player.teleport([_v.x, _v.y + 0.3, _v.z], this.auto.yaw);
    this.family.visible = true;
    this.family.snapBehind(g.player.position, g.player.yaw);
    const gate = new THREE.Vector3(...this.layout.gate);
    const d = Math.hypot(this.auto.position.x - gate.x, this.auto.position.z - gate.z);
    if (!this.parked && this.leftHome && d < 100 && !this.insideEnclosure(this.auto.position)) {
      this.parked = true;
      if (d <= 100) this.score("parking_close");
      g.toast(`Parked ${Math.round(d)} m from the gate.`, "good");
    } else if (!this.parked && d < 140) this.parked = true;
    this.refresh();
  }

  // ------------------------------------------------------------------ queue runner
  private buildQueueCrowd(): void {
    const g = this.game;
    const temple = TEMPLE_BY_ID.get(this.run.templeId)!;
    const crowdN = temple.crowd === "high" ? 7 : temple.crowd === "medium" ? 5 : 3;
    const labels: Record<string, string> = { free: "FREE", "20": "Rs 20", "100": "Rs 100" };
    // today's flow speeds: the paid lanes are usually faster, but not always (that's the skill)
    const speeds = temple.queueTiers.map((tier) => (tier === "free" ? 0.25 : tier === "20" ? 0.38 : 0.5) * (0.7 + Math.random() * 0.6));
    const models = ["CHR_Villager_A", "CHR_Villager_B", "CHR_Villager_C"].filter((m) => g.assets.has(m));
    temple.queueTiers.forEach((tier, i) => {
      const lane: LaneCrowd = { label: labels[tier]!, speed: speeds[i]!, people: [] };
      for (let k = 0; k < crowdN; k++) {
        const model = models[(i + k) % models.length]!;
        const person = new Person(`q${i}_${k}`, "devotee", g.assets, model, "CHR_Player_Base", g.level.collision);
        lane.people.push({ person, q: 1.2 + k * 0.85 + Math.random() * 0.2, aunty: model === "CHR_Villager_C" });
        g.scene.add(person.object);
      }
      this.crowd.push(lane);
    });
    this.layoutCrowd(0);
  }

  /** Lane geometry from the rails' sockets: entry and end points per lane. */
  private lane(i: number): { a: THREE.Vector3; b: THREE.Vector3; len: number } {
    const W = this.world;
    const a = W.socket(`${this.layout.queue}.SOCKET_Lane_${i}`, W.position(this.layout.queue));
    const b = W.socket(`${this.layout.queue}.SOCKET_LaneEnd_${i}`, a.clone());
    return { a, b, len: a.distanceTo(b) };
  }

  private lanePoint(i: number, q: number, out: THREE.Vector3): THREE.Vector3 {
    const { a, b, len } = this.lane(i);
    return out.copy(a).lerp(b, THREE.MathUtils.clamp(q / Math.max(len, 0.1), 0, 1));
  }

  private layoutCrowd(dt: number): void {
    this.crowd.forEach((lane, i) => {
      const { a, b, len } = this.lane(i);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      // people advance at the lane's flow, never closer than 0.85 m to the one ahead; at the end they enter the
      // sanctum and rejoin at the back
      const sorted = [...lane.people].sort((x, y) => y.q - x.q);
      let ahead = Infinity;
      for (const c of sorted) {
        const before = c.q;
        if (this.run.stage !== "home") c.q = Math.min(c.q + lane.speed * dt, ahead - 0.85);
        // reached the sanctum: rejoin at the very back (behind the player too, if she is in this lane)
        if (c.q > len - 0.3) c.q = Math.min(0.4, ...lane.people.map((o) => o.q), this.q && this.q.lane === i ? this.q.p : Infinity) - 0.85;
        ahead = c.q;
        const moving = c.q - before > 0.0005;
        this.lanePoint(i, Math.max(0, c.q), _w);
        c.person.place(_w.x, _w.y, _w.z, yaw);
        c.person.object.visible = c.q >= 0;
        c.person.setPose(moving ? "queue_shuffle" : null);
        c.person.update(dt);
      }
    });
  }

  private joinQueue(lane: number): void {
    const g = this.game;
    const fastest = this.crowd.reduce((best, l, i) => (l.speed > this.crowd[best]!.speed ? i : best), 0);
    const back = Math.min(...this.crowd[lane]!.people.map((c) => c.q)) - 0.9;
    this.q = { lane, p: Math.max(-0.5, back), switchT: 0, switchFrom: lane, joinedFastest: lane === fastest, events: new Set(), event: null, eventT: 0, kidAhead: 0, prayHeld: 0 };
    g.player.locked = true;
    this.advanceStage("queue");
    this.ui.queue = { lane, lanes: this.crowd.map((l) => ({ label: l.label, speed: Math.round(l.speed * 100) / 100 })), progress: 0, length: this.lane(lane).len, hints: [], event: null };
    this.refresh();
  }

  private updateQueue(dt: number): void {
    const q = this.q!;
    const g = this.game;
    const input = g.input;
    const { len } = this.lane(q.lane);
    const people = this.crowd[q.lane]!.people;
    const ahead = people.filter((c) => c.q > q.p).sort((a, b) => a.q - b.q)[0];
    const limit = ahead ? ahead.q - 0.85 : len;
    let moved = 0;
    if (q.switchT > 0) {
      q.switchT = Math.max(0, q.switchT - dt * (MOM_BY_ID.get(this.run.momId)?.laneSpeed ?? 1) * 2.5);
    } else if (input.isDown("forward") && q.p < limit) {
      const step = Math.min(1.1 * dt, limit - q.p);
      q.p += step;
      moved = step / dt;
    }
    // lane switch: needs a gap of 0.6 m in the target lane
    for (const [key, dir] of [["left", -1], ["right", 1]] as const) {
      if (q.switchT > 0 || !input.wasPressed(key)) continue;
      const target = q.lane + dir;
      if (target < 0 || target >= this.crowd.length) continue;
      if (this.crowd[target]!.people.some((c) => Math.abs(c.q - q.p) < 0.6)) {
        g.toast("No gap in that lane.", "info");
        continue;
      }
      q.switchFrom = q.lane;
      q.lane = target;
      q.switchT = 1;
    }
    // chat with an aunty ahead: she waves you two places forward
    const adj = ahead && ahead.q - q.p < 1.2 ? ahead : null;
    const hints: string[] = [];
    if (adj?.aunty && !this.run.done.includes("aunty_chat")) {
      hints.push("E: chat with the aunty ahead");
      if (input.wasPressed("interact")) {
        g.player.animator.play("talk_gesture", { once: true });
        const two = people.filter((c) => c.q > q.p).sort((a, b) => a.q - b.q).slice(0, 2);
        const top = two[two.length - 1]!.q;
        for (const c of two) c.q = q.p - 0.1;
        q.p = top;
        this.score("aunty_chat");
      }
    }
    // send a kid ahead to hold a place three people up
    const kid = this.family.members.find((m) => m.id !== "husband" && !this.family.detached.has(m.id));
    if (kid && !this.run.done.includes("kid_holds") && people.filter((c) => c.q > q.p).length >= 3) {
      hints.push("T: send a kid ahead to hold your place");
      if (input.keyPressed("KeyT")) {
        const third = people.filter((c) => c.q > q.p).sort((a, b) => a.q - b.q)[2]!;
        q.kidAhead = third.q + 0.42;
        this.family.detached.add(kid.id);
        this.lanePoint(q.lane, q.kidAhead, _w);
        kid.goal = _w.clone();
        window.setTimeout(() => {
          if (!this.q) return;
          for (const c of people) if (c.q > q.p && c.q < q.kidAhead) c.q = q.p - 0.1;
          q.p = q.kidAhead;
          this.family.detached.delete(kid.id);
          this.score("kid_holds");
        }, 2500);
      }
    }
    // hold R to pray patiently: Blessings, calm
    if (input.isDown("secondary")) {
      q.prayHeld += dt;
      hints.push("Praying...");
      if (q.prayHeld > 3) {
        q.prayHeld = 0;
        this.score("queue_patience");
      }
    } else q.prayHeld = 0;
    // events along the queue
    const frac = q.p / len;
    if (frac > 0.25 && !q.events.has("cutter")) {
      q.events.add("cutter");
      this.ui.mini = { kind: "choice", title: "Someone just cut in front of you!", data: { id: "cutter", options: ["Stay calm. God is watching.", "Full eye contact. Scold."] } };
      g.openPanel("minigame");
    } else if (frac > 0.45 && !q.events.has("relative")) {
      q.events.add("relative");
      q.event = "relative";
      q.eventT = 5;
      g.toast("Is that Kamala-chithi from Madurai in the next lane?! (E to merge families)", "info");
    } else if (frac > 0.6 && !q.events.has("wander")) {
      q.events.add("wander");
      const kidNow = this.family.members.find((m) => m.id !== "husband" && !this.family.detached.has(m.id));
      if (kidNow && Math.random() < 0.4 && this.run.momId !== "paati") {
        this.wandered = kidNow.id;
        this.family.detached.add(kidNow.id);
        kidNow.goal = this.world.position(this.layout.annadanam).clone();
        this.score("child_wandered");
        g.toast(`${kidNow.name} has wandered off! (You'll find them later.)`, "bad");
      }
    } else if (frac > 0.72 && !q.events.has("shortcut") && !this.run.done.includes("prasadam_shortcut")) {
      q.event = "shortcut";
      q.eventT = 6;
      q.events.add("shortcut");
    }
    if (q.event && q.eventT > 0) {
      q.eventT -= dt;
      hints.push(q.event === "relative" ? "E: merge with the relatives' place" : "E: slip through the prasadam counter");
      if (input.wasPressed("interact")) {
        if (q.event === "relative") {
          const mom = MOM_BY_ID.get(this.run.momId)!;
          if (this.run.freeMergesLeft > 0) this.run.freeMergesLeft--;
          else addStress(this.run, 5);
          q.p = Math.min(len - 0.6, q.p + 3.4);
          for (const c of people) if (c.q > q.p - 3.4 && c.q < q.p) c.q = q.p - 4;
          this.score("relative_merge");
          void mom;
        } else {
          q.p = len;
          this.score("prasadam_shortcut");
        }
        q.event = null;
      }
    } else q.event = null;

    // place the player along the lane (sideways tween while switching)
    const yaw = Math.atan2(this.lane(q.lane).b.x - this.lane(q.lane).a.x, this.lane(q.lane).b.z - this.lane(q.lane).a.z);
    this.lanePoint(q.lane, Math.max(0, q.p), _v);
    if (q.switchT > 0) {
      this.lanePoint(q.switchFrom, Math.max(0, q.p), _w);
      _v.lerp(_w, q.switchT);
    }
    g.player.position.copy(_v);
    g.player.yaw = yaw;
    g.player.object.rotation.y = yaw;
    const praying = input.isDown("secondary");
    if (praying && g.player.animator.currentAction !== "pray_idle") g.player.animator.play("pray_idle", { once: false });
    else if (!praying && g.player.animator.currentAction === "pray_idle") g.player.animator.stopAction();
    g.player.animateInPlace(dt, q.switchT > 0 ? 1.2 : moved, q.switchT > 0 ? (q.lane > q.switchFrom ? 1 : -1) : 0, q.switchT > 0 ? 0 : 1, q.switchT > 0);
    this.family.snapBehind(g.player.position, yaw);
    this.ui.queue = { lane: q.lane, lanes: this.ui.queue!.lanes, progress: Math.max(0, q.p), length: len, hints, event: q.event };
    if (q.p >= len - 0.3) this.leaveQueue();
  }

  private leaveQueue(): void {
    const q = this.q!;
    const g = this.game;
    this.q = null;
    this.queueDone = true;
    g.player.locked = false;
    g.player.animator.stopAction();
    if (q.joinedFastest) this.score("right_queue");
    this.ui.queue = null;
    this.advanceStage("rituals");
    g.toast("Through the queue! Rituals and darshan ahead.", "good");
    this.refresh();
  }

  // ------------------------------------------------------------------ per frame
  /** Camera focus while driving: above the auto's canopy, so the boom never starts inside the cab. */
  cameraFocus(out: THREE.Vector3): THREE.Vector3 | null {
    if (!this.driving || !this.auto) return null;
    return out.copy(this.auto.position).setY(this.auto.position.y + 0.75);
  }

  /** The auto's heading and speed (the camera swings behind a moving vehicle). */
  get vehicleHeading(): { yaw: number; speed: number } | null {
    return this.driving && this.auto ? { yaw: this.auto.yaw, speed: this.auto.speed } : null;
  }

  /** True while the visit owns the player's body (driving, queue). */
  get controlsPlayer(): boolean {
    return this.driving || this.q !== null;
  }

  update(dt: number): void {
    if (this.run.ended) return;
    this.t += dt;
    const g = this.game;
    const p = g.player.position;
    // home -> arrival when leaving the house
    if (!this.leftHome && p.distanceTo(this.houseCenter) > 6) {
      this.leftHome = true;
      if (!this.bag?.includes("coconut")) this.score("forgot_coconut");
      this.advanceStage("arrival");
    }
    if (this.driving && this.auto) {
      const inp = g.input;
      const throttle = (inp.isDown("forward") ? 1 : 0) - (inp.isDown("back") ? 1 : 0);
      const steer = (inp.isDown("right") ? 1 : 0) - (inp.isDown("left") ? 1 : 0);
      this.auto.update(dt, { throttle, steer, brake: inp.isDown("jump") });
      if (inp.keyPressed("KeyH")) g.audio.visitCue("horn");
      g.audio.engineSpeed(Math.abs(this.auto.speed));
      this.auto.driverSeat(_v);
      g.player.position.set(_v.x, _v.y - 0.47, _v.z);
      g.player.yaw = this.auto.yaw;
      g.player.object.rotation.y = this.auto.yaw;
      g.player.animateInPlace(dt, 0);
      if (inp.wasPressed("interact") && Math.abs(this.auto.speed) < 1.2) this.exitAuto();
    } else if (this.q && !this.ui.mini) this.updateQueue(dt);
    this.layoutCrowd(dt);
    this.family.update(dt, p, g.player.yaw);
    for (const e of this.extras) e.update(dt);

    // the gate rule: no chappals inside the temple ground
    if (!this.driving && this.insideEnclosure(p)) {
      if (!this.chappalsOff) {
        this.pushOut(p);
        if (this.t - this.lastShout > 3) {
          this.lastShout = this.t;
          g.toast("\"Amma! Chappals off before you go in!\"", "bad");
        }
      } else if (!this.enteredTemple) {
        this.enteredTemple = true;
        this.advanceStage(this.layout.steps ? "steps" : "queue");
      }
    }
    // hill: climbing the steps
    if (this.layout.steps) {
      const foot = this.world.socket(`${this.layout.steps.prop}.SOCKET_StairFoot`, p);
      const top = this.world.socket(`${this.layout.steps.prop}.SOCKET_StairTop`, p);
      if (p.distanceTo(foot) < 2.5) this.atStairFoot = true;
      if (this.atStairFoot && Math.hypot(p.x - top.x, p.z - top.z) < 2.5 && p.y > top.y - 0.4 && !this.run.done.includes("steps_climbed")) this.score("steps_climbed");
    }
    // pradakshina: clockwise laps around the sanctum (the deity on your right), counted after the queue
    if (this.queueDone && !this.driving) this.trackPradakshina();
    // vibhuti timer
    if (this.vibhutiUntil > 0 && this.t > this.vibhutiUntil) {
      this.vibhutiUntil = 0;
      g.toast("Too slow - someone ran off before the vibhuti.", "info");
    }
    this.ui.queue = this.q ? this.ui.queue : null;
    this.refresh();
  }

  private insideEnclosure(p: THREE.Vector3): boolean {
    const e = this.layout.enclosure;
    if (e.kind === "line") return p.z < e.z && p.x > e.xMin && p.x < e.xMax && p.z > e.z - 70;
    return Math.hypot(p.x - e.center[0], p.z - e.center[1]) < e.r;
  }

  private pushOut(p: THREE.Vector3): void {
    const e = this.layout.enclosure;
    if (e.kind === "line") p.z = e.z + 0.4;
    else {
      const dx = p.x - e.center[0];
      const dz = p.z - e.center[1];
      const d = Math.hypot(dx, dz) || 1;
      p.x = e.center[0] + (dx / d) * (e.r + 0.4);
      p.z = e.center[1] + (dz / d) * (e.r + 0.4);
    }
    this.game.player.velocity.set(0, 0, 0);
  }

  private trackPradakshina(): void {
    const g = this.game;
    const c = this.layout.pradakshina;
    const p = g.player.position;
    const dx = (p.x - c.center[0]) / c.rx;
    const dz = (p.z - c.center[1]) / c.rz;
    const r = Math.hypot(dx, dz);
    if (r < 0.75 || r > 1.6) {
      this.pradAngle = null; // off the circuit
      return;
    }
    const a = Math.atan2(p.z - c.center[1], p.x - c.center[0]);
    if (this.pradAngle !== null) {
      const d = Math.atan2(Math.sin(a - this.pradAngle), Math.cos(a - this.pradAngle));
      this.pradAccum += d; // increasing atan2(z, x) is clockwise seen from above: the sanctum stays on the right
      if (this.pradAccum < -0.5) this.pradAccum = -0.5; // walking the wrong way does not count
      if (this.pradAccum >= Math.PI * 2) {
        this.pradAccum -= Math.PI * 2;
        this.score("pradakshina_round");
        g.toast(`Pradakshina round ${this.run.pradakshina}`, "good");
        if (this.run.pradakshina === 9) this.score("pradakshina_9");
        if (this.run.pradakshina === 108 && this.run.festival) this.score("pradakshina_108");
      }
    }
    this.pradAngle = a;
  }

  // ------------------------------------------------------------------ end
  private finishing = false;
  finish(reason: "exit" | "stress"): void {
    if (this.finishing) return;
    this.finishing = true;
    const g = this.game;
    if (this.driving) this.exitAuto();
    this.run.ended = reason;
    const day = new Date().toISOString().slice(0, 10);
    const summary = settleRun(this.profile, this.run, day);
    void g.saves.saveVisitProfile(this.profile);
    if (reason === "stress") g.audio.visitCue("aiyyo");
    else if (summary.score.total > 0) g.audio.visitCue("nadaswaram");
    this.ui.summary = { ...summary, ended: reason, templeId: this.run.templeId, personalBest: this.profile.personalBest[this.run.templeId] ?? 0 };
    this.refresh();
    g.openPanel("visitScore");
  }

  get saree(): string {
    const id = this.profile.sareeChoice[this.run.momId] ?? "default";
    const s = SAREES.find((x) => x.id === id);
    return s && s.color ? s.color : (MOM_BY_ID.get(this.run.momId)?.saree ?? "#b3261e");
  }

  /** Current final score preview (HUD). */
  preview(): number {
    return finalScore(this.run).total;
  }
}
