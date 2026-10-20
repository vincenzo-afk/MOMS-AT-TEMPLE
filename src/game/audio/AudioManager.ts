import { AUDIO_MANIFEST, type AudioEntry } from "../../data/audioManifest";
import type { Settings } from "../core/types";
import { Soundscape, type SoundscapeParams, type Surface } from "./Soundscape";
import { MusicSynth } from "./MusicSynth";
import type { MusicCue } from "./musicCues";

type Bus = "music" | "effects";

/**
 * Web Audio playback with master / music / effects buses. Starts only after a user gesture.
 * Files that are missing (every Lyria slot until supplied) are skipped with one console warning each;
 * UI and interaction cues fall back to short synthesized blips, music cues to MusicSynth's placeholder score,
 * so feedback, mood and volume settings remain audible and testable. Manifest entries with `spatial` play
 * through a PannerNode; the listener follows the camera (setListener).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<Bus, GainNode>;
  private buffers = new Map<string, AudioBuffer | null>();
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private music: string | null = null;
  readonly missing = new Set<string>();
  readonly loaded = new Set<string>();
  private settings: Settings | null = null;
  /** Procedural ambience; present once audio is unlocked. */
  soundscape: Soundscape | null = null;
  /** Placeholder score for music cues without a file; present once audio is unlocked. */
  synth: MusicSynth | null = null;
  /** Counts of triggered cues (diagnostics and tests). */
  readonly cueCounts: Record<string, number> = {};

  get started(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }

  /** Must be called from a user gesture handler (click / key press). */
  async unlock(settings: Settings): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.buses = { music: this.ctx.createGain(), effects: this.ctx.createGain() };
      this.buses.music.connect(this.master);
      this.buses.effects.connect(this.master);
      this.applySettings(settings);
      this.soundscape = new Soundscape(this.ctx, this.buses.effects, (id) => this.loaded.has(id), AUDIO_MANIFEST.find((e) => e.id === "amb_workshop")?.spatial ?? null);
      this.synth = new MusicSynth(this.ctx, this.buses.music);
      if (this.music) this.synth.play(this.music as MusicCue, 1);
      void this.preload().then(() => {
        // a supplied track that finished loading after its cue started takes over from the placeholder
        const m = this.music;
        if (m && this.loaded.has(m) && !this.loops.has(m)) {
          this.synth?.play(null, 1.5);
          this.startLoop(m, 1.5);
        }
      });
    }
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => undefined);
  }

  applySettings(s: Settings): void {
    this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterVolume, t, 0.05);
    this.buses.music.gain.setTargetAtTime(s.musicVolume, t, 0.05);
    this.buses.effects.gain.setTargetAtTime(s.effectsVolume, t, 0.05);
  }

  /** Effective linear gain of a bus (for tests and the settings screen). */
  busGain(bus: Bus): number {
    const s = this.settings;
    if (!s) return 0;
    return s.masterVolume * (bus === "music" ? s.musicVolume : s.effectsVolume);
  }

  private async preload(): Promise<void> {
    // Pending entries have no file yet: don't request them (avoids 404 noise), treat as missing.
    for (const e of AUDIO_MANIFEST) if (e.status === "pending") this.missing.add(e.id);
    await Promise.all(AUDIO_MANIFEST.filter((e) => e.status !== "pending").map((e) => this.load(e)));
  }

  private async load(e: AudioEntry): Promise<AudioBuffer | null> {
    if (this.buffers.has(e.id)) return this.buffers.get(e.id) ?? null;
    this.buffers.set(e.id, null);
    if (!this.ctx) return null;
    try {
      const res = await fetch(e.path);
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || type.includes("text/html")) throw new Error(`HTTP ${res.status}`);
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(e.id, buf);
      this.loaded.add(e.id);
      return buf;
    } catch {
      this.missing.add(e.id);
      if (e.status !== "pending") console.warn(`[audio] ${e.id} expected at ${e.path} but could not be loaded`);
      return null;
    }
  }

  private busFor(e: AudioEntry): Bus {
    return e.type === "music" ? "music" : "effects";
  }

  /** True when the real audio file for this manifest id is loaded. */
  hasFile(id: string): boolean {
    return this.loaded.has(id);
  }

  updateAmbience(dt: number, p: SoundscapeParams): void {
    this.soundscape?.update(dt, p);
    // the recorded workshop loop (once supplied) plays only while someone works at the bench
    if (this.loaded.has("amb_workshop")) {
      if (p.workshop > 0) this.startLoop("amb_workshop", 2);
      else this.stopLoop("amb_workshop", 2);
    }
  }

  /** Schedule the placeholder score's next notes; call every frame, in every mode. */
  tick(): void {
    this.synth?.update();
  }

  /** The ears of every positional sound: the camera's position and facing. */
  setListener(x: number, y: number, z: number, fx: number, fy: number, fz: number): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      l.forwardX.value = fx;
      l.forwardY.value = fy;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }

  /** The music cue currently wanted (file or placeholder), for diagnostics and tests. */
  get musicCue(): string | null {
    return this.music;
  }
  footstep(surface: Surface, running: boolean): void {
    this.count("footstep");
    this.soundscape?.footstep(surface, running);
  }
  door(open: boolean): void {
    this.count("door");
    this.soundscape?.door(open);
  }
  /** Temple Visit sound cues (procedural placeholders until recorded audio exists). */
  visitCue(kind: "bell" | "chime" | "nadaswaram" | "aiyyo" | "horn"): void {
    this.count(kind);
    this.soundscape?.[kind]();
  }
  engine(on: boolean): void {
    this.count(on ? "engine_on" : "engine_off");
    this.soundscape?.engine(on);
  }
  engineSpeed(v: number): void {
    this.soundscape?.engineSpeed(v);
  }
  alarm(): void {
    this.count("alarm");
    this.soundscape?.alarm();
  }
  private count(id: string): void {
    this.cueCounts[id] = (this.cueCounts[id] ?? 0) + 1;
  }

  play(id: string): void {
    this.count(id);
    const e = AUDIO_MANIFEST.find((a) => a.id === id);
    if (!this.ctx || !e) return;
    const buf = this.buffers.get(id);
    if (!buf) {
      if (id === "mus_restoration" || id === "mus_discovery") this.synth?.sting(id === "mus_restoration" ? "restoration" : "discovery");
      else this.blip(id);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = e.volume;
    src.connect(g).connect(this.buses[this.busFor(e)]);
    src.start();
  }

  /** Crossfade to a music cue: its supplied track, else the synthesized placeholder. null fades to silence. */
  setMusic(id: MusicCue | null, fade = 2.5): void {
    if (this.music === id) return;
    if (this.music) this.stopLoop(this.music, fade);
    this.music = id;
    if (!this.ctx) return; // remembered; starts on unlock
    if (id && this.buffers.get(id)) {
      this.synth?.play(null, fade);
      this.startLoop(id, fade);
    } else this.synth?.play(id, fade);
  }

  startLoop(id: string, fade = 1.5): void {
    const e = AUDIO_MANIFEST.find((a) => a.id === id);
    const buf = this.buffers.get(id);
    if (!this.ctx || !e || !buf || this.loops.has(id)) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = e.loop;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(e.volume, this.ctx.currentTime, fade / 3);
    const bus = this.buses[this.busFor(e)];
    src.connect(g).connect(e.spatial ? Soundscape.panner(this.ctx, e.spatial, bus) : bus);
    src.start();
    this.loops.set(id, { src, gain: g });
  }

  stopLoop(id: string, fade = 1.5): void {
    const l = this.loops.get(id);
    if (!l || !this.ctx) return;
    l.gain.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
    l.src.stop(this.ctx.currentTime + fade * 2);
    this.loops.delete(id);
  }

  /** Placeholder synthesized cue (not a production asset) so interactions still have feedback. */
  private blip(id: string): void {
    if (!this.ctx) return;
    const tones: Record<string, [number, number, number]> = {
      sfx_pickup: [660, 990, 0.12],
      sfx_craft: [440, 660, 0.18],
      sfx_restore: [392, 784, 0.45],
      ui_open: [520, 520, 0.05],
      ui_confirm: [600, 900, 0.1],
      ui_error: [300, 200, 0.12],
    };
    const t = tones[id];
    if (!t) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(t[0], now);
    osc.frequency.exponentialRampToValueAtTime(t[1], now + t[2]);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t[2] + 0.15);
    osc.connect(g).connect(this.buses.effects);
    osc.start(now);
    osc.stop(now + t[2] + 0.2);
  }
}
