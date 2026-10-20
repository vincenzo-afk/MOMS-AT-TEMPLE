import type { MusicCue } from "./musicCues";

/**
 * Placeholder score synthesized with Web Audio until the Lyria tracks are supplied (docs/AUDIO_BIBLE.md):
 * a tanpura drone (Pa - Sa' - Sa' - Sa plucks, rich in harmonics) under sparse flute-like phrases in a raga
 * that suits the hour, with a soft frame-drum pulse at the workshop and the festival. Each cue has its own
 * gain node so cues crossfade; notes are scheduled a little ahead on the audio clock, so frame hitches do not
 * make the music stumble.
 */
interface Mood {
  /** Sa, Hz */
  tonic: number;
  /** seconds per drone pluck */
  pluck: number;
  /** melody notes in semitones above Sa */
  scale: number[];
  /** seconds between phrases [min, max] */
  gap: [number, number];
  /** seconds per melody note */
  note: number;
  /** drone low-pass cutoff */
  bright: number;
  /** frame-drum beats per pluck (0 = none) */
  drum: number;
  level: number;
}

const MOODS: Record<MusicCue, Mood> = {
  // Mohanam: open and warm for the title and the day
  mus_main_theme: { tonic: 146.8, pluck: 1.3, scale: [0, 2, 4, 7, 9, 12, 14], gap: [4, 8], note: 0.55, bright: 2200, drum: 0, level: 0.9 },
  mus_exploration_day: { tonic: 146.8, pluck: 1.4, scale: [0, 2, 4, 7, 9, 12], gap: [8, 14], note: 0.6, bright: 1900, drum: 0, level: 0.7 },
  // Bhupalam at dawn: unhurried, bright
  mus_morning: { tonic: 138.6, pluck: 1.5, scale: [0, 1, 4, 7, 8, 12], gap: [5, 9], note: 0.7, bright: 2600, drum: 0, level: 0.75 },
  // Kharaharapriya in the workshop, with a working pulse
  mus_workshop: { tonic: 130.8, pluck: 1.1, scale: [0, 2, 3, 5, 7, 9, 10, 12], gap: [6, 10], note: 0.4, bright: 1800, drum: 2, level: 0.7 },
  // Kalyani (Yaman) at lamp-lighting: lower, softer
  mus_evening: { tonic: 123.5, pluck: 1.7, scale: [0, 2, 4, 6, 7, 9, 11, 12], gap: [6, 11], note: 0.8, bright: 1400, drum: 0, level: 0.75 },
  // Shankarabharanam for festival evenings: brisk, drum on every beat
  mus_festival: { tonic: 146.8, pluck: 0.9, scale: [0, 2, 4, 5, 7, 9, 11, 12, 14], gap: [1.5, 3.5], note: 0.3, bright: 2800, drum: 4, level: 0.9 },
};

const AHEAD = 0.35;

export class MusicSynth {
  private cue: MusicCue | null = null;
  private out: GainNode | null = null;
  private nextPluck = 0;
  private pluckIndex = 0;
  private nextPhrase = 0;
  /** notes scheduled so far (diagnostics and tests) */
  readonly counts = { plucks: 0, notes: 0, drums: 0, stings: 0 };

  constructor(
    private ctx: AudioContext,
    private bus: AudioNode,
  ) {}

  get playing(): MusicCue | null {
    return this.cue;
  }

  /** Crossfade to a cue (null = fade to silence). */
  play(cue: MusicCue | null, fade = 2.5): void {
    if (cue === this.cue) return;
    const now = this.ctx.currentTime;
    if (this.out) {
      const old = this.out;
      old.gain.setTargetAtTime(0, now, fade / 3);
      window.setTimeout(() => old.disconnect(), fade * 2000 + 200);
    }
    this.cue = cue;
    this.out = null;
    if (!cue) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(MOODS[cue].level, now, fade / 3);
    g.connect(this.bus);
    this.out = g;
    this.nextPluck = now + 0.1;
    this.pluckIndex = 0;
    this.nextPhrase = now + 2 + Math.random() * 2;
  }

  /** Schedule the notes due in the next fraction of a second. Call every frame. */
  update(): void {
    if (!this.cue || !this.out) return;
    const m = MOODS[this.cue];
    const horizon = this.ctx.currentTime + AHEAD;
    while (this.nextPluck < horizon) {
      // the tanpura cycle: Pa (below), Sa', Sa', Sa (low)
      const k = this.pluckIndex++ % 4;
      const f = k === 0 ? m.tonic * 0.75 : k === 3 ? m.tonic * 0.5 : m.tonic;
      this.pluck(f, this.nextPluck, m.pluck * 2.2, m.bright);
      for (let d = 0; d < m.drum; d++) this.drum(this.nextPluck + (d * m.pluck) / m.drum, d === 0 ? 1 : 0.55);
      this.nextPluck += m.pluck;
    }
    if (this.nextPhrase < horizon) {
      this.phrase(m, this.nextPhrase);
      this.nextPhrase += m.gap[0] + Math.random() * (m.gap[1] - m.gap[0]);
    }
  }

  /** A short rising figure for a restoration or a discovery, over whatever is playing. */
  sting(kind: "restoration" | "discovery"): void {
    const now = this.ctx.currentTime + 0.05;
    const tonic = 146.8;
    const steps = kind === "restoration" ? [0, 4, 7, 12, 16] : [0, 2, 7, 9];
    steps.forEach((s, i) => this.flute(tonic * 2 ** (s / 12) * 2, now + i * 0.16, kind === "restoration" ? 1.4 - i * 0.1 : 0.9, this.bus, 0.07));
    this.counts.stings++;
  }

  private phrase(m: Mood, t0: number): void {
    // a stepwise wander through the scale, resolving to Sa or Pa
    const len = 3 + Math.floor(Math.random() * 4);
    let i = Math.floor(Math.random() * m.scale.length);
    let t = t0;
    for (let n = 0; n < len; n++) {
      const last = n === len - 1;
      const semis = last ? (Math.random() < 0.6 ? 12 : 7) : m.scale[i]!;
      const dur = m.note * (last ? 2.2 : Math.random() < 0.3 ? 1.6 : 1);
      this.flute(m.tonic * 2 ** (semis / 12) * 2, t, dur, this.out!, 0.05);
      t += dur;
      i = Math.max(0, Math.min(m.scale.length - 1, i + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.25 ? 2 : 1)));
    }
  }

  private pluck(f: number, t: number, len: number, bright: number): void {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = bright;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    lp.connect(g).connect(this.out!);
    // the tanpura's buzz: many harmonics, the upper ones swelling slightly after the attack (jivari)
    for (let h = 1; h <= 7; h++) {
      const o = c.createOscillator();
      o.frequency.value = f * h * (1 + (Math.random() - 0.5) * 0.002);
      const hg = c.createGain();
      const a = 1 / h;
      hg.gain.setValueAtTime(a * (h > 3 ? 0.4 : 1), t);
      hg.gain.linearRampToValueAtTime(a * (h > 3 ? 0.9 : 0.8), t + 0.35);
      o.connect(hg).connect(lp);
      o.start(t);
      o.stop(t + len + 0.05);
    }
    this.counts.plucks++;
  }

  private flute(f: number, t: number, dur: number, out: AudioNode, peak: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = "sine";
    // a gentle gamaka: a small slide into the note
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.12, dur * 0.3));
    const breath = c.createOscillator();
    breath.type = "triangle";
    breath.frequency.value = f * 2;
    const bg = c.createGain();
    bg.gain.value = 0.12;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.07);
    g.gain.setTargetAtTime(peak * 0.7, t + 0.1, dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    o.connect(g);
    breath.connect(bg).connect(g);
    g.connect(out);
    o.start(t);
    breath.start(t);
    o.stop(t + dur + 0.3);
    breath.stop(t + dur + 0.3);
    this.counts.notes++;
  }

  private drum(t: number, accent: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08 * accent, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.out!);
    o.start(t);
    o.stop(t + 0.25);
    this.counts.drums++;
  }
}
