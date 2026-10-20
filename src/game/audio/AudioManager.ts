import { AUDIO_MANIFEST, type AudioEntry } from "../../data/audioManifest";
import type { Settings } from "../core/types";

type Bus = "music" | "effects";

/**
 * Web Audio playback with master / music / effects buses. Starts only after a user gesture.
 * Files that are missing (every Lyria slot until supplied) are skipped with one console warning each;
 * UI and interaction cues fall back to short synthesized blips so feedback and volume settings remain testable.
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
      void this.preload();
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

  play(id: string): void {
    const e = AUDIO_MANIFEST.find((a) => a.id === id);
    if (!this.ctx || !e) return;
    const buf = this.buffers.get(id);
    if (!buf) {
      this.blip(id);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = e.volume;
    src.connect(g).connect(this.buses[this.busFor(e)]);
    src.start();
  }

  /** Crossfade to a music track or ambience loop. Missing tracks simply leave silence. */
  setMusic(id: string | null, fade = 2.5): void {
    if (!this.ctx || this.music === id) return;
    if (this.music) this.stopLoop(this.music, fade);
    this.music = id;
    if (id) this.startLoop(id, fade);
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
    src.connect(g).connect(this.buses[this.busFor(e)]);
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
