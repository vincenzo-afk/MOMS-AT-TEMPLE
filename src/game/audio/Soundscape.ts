/**
 * Procedural ambience synthesized with Web Audio (no files): wind, rain, nearby water, birdsong by day,
 * crickets by night, market murmur near the bazaar, surface-dependent footsteps and small action sounds.
 *
 * These are honest placeholders, not production audio: each layer is muted as soon as the matching Lyria
 * file in the audio manifest is loaded (AudioManager.hasFile), so the real recordings take over without
 * code changes.
 */
export interface SoundscapeParams {
  rain: number; // 0..1
  wind: number; // 0..1
  day: number; // 0..1 daylight
  water: number; // 0..1 proximity to flowing water
  crowd: number; // 0..1 proximity to the bazaar
  indoors: boolean;
}

export type Surface = "stone" | "soil" | "wood";

export class Soundscape {
  private noise: AudioBuffer;
  private layers: Record<"wind" | "rain" | "water" | "crowd", { gain: GainNode; filter: BiquadFilterNode }>;
  private birdTimer = 0;
  private cricketGain: GainNode;
  private t = 0;

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
    private hasFile: (id: string) => boolean,
  ) {
    // one shared 4 s noise buffer (pink-ish), looped by every noise layer at different filters/rates
    const len = ctx.sampleRate * 4;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    }
    const layer = (type: BiquadFilterType, freq: number, q: number, rate: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      src.playbackRate.value = rate;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(out);
      src.start(0, Math.random() * 3);
      return { gain, filter };
    };
    this.layers = {
      wind: layer("lowpass", 420, 0.7, 0.6),
      rain: layer("bandpass", 3800, 0.6, 1.4),
      water: layer("bandpass", 900, 1.4, 1.0),
      crowd: layer("bandpass", 520, 2.2, 0.85),
    };
    // crickets: a high tone amplitude-modulated into chirps
    const osc = ctx.createOscillator();
    osc.frequency.value = 4400;
    const am = ctx.createGain();
    am.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain).connect(am.gain);
    this.cricketGain = ctx.createGain();
    this.cricketGain.gain.value = 0;
    osc.connect(am).connect(this.cricketGain).connect(out);
    osc.start();
    lfo.start();
  }

  private set(g: GainNode, v: number, tc = 0.4): void {
    g.gain.setTargetAtTime(v, this.ctx.currentTime, tc);
  }

  update(dt: number, p: SoundscapeParams): void {
    this.t += dt;
    const inside = p.indoors ? 0.35 : 1;
    const has = this.hasFile;
    this.set(this.layers.wind.gain, has("amb_settlement_day") ? 0 : (0.05 + p.wind * 0.12) * (0.75 + 0.25 * Math.sin(this.t * 0.37)) * inside);
    this.layers.wind.filter.frequency.setTargetAtTime(300 + p.wind * 500 + Math.sin(this.t * 0.23) * 80, this.ctx.currentTime, 0.5);
    this.set(this.layers.rain.gain, p.rain * (p.indoors ? 0.18 : 0.32));
    this.set(this.layers.water.gain, has("amb_channel_water") ? 0 : p.water * 0.22 * inside);
    this.set(this.layers.crowd.gain, has("amb_settlement_day") ? 0 : p.crowd * p.day * 0.13 * inside * (0.7 + 0.3 * Math.sin(this.t * 1.7) * Math.sin(this.t * 0.61)));
    // crickets pulse in chirp groups at night
    const night = 1 - Math.min(1, p.day * 3);
    const chirp = Math.sin(this.t * 2.2) > 0.2 ? 1 : 0;
    this.set(this.cricketGain, has("amb_evening") ? 0 : night * (1 - p.rain) * 0.022 * chirp * inside, 0.05);
    // birdsong by day
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = 1.2 + Math.random() * 3.5;
      if (p.day > 0.4 && p.rain < 0.3 && !p.indoors && !has("amb_settlement_day")) this.bird();
    }
  }

  private bird(): void {
    const c = this.ctx;
    const now = c.currentTime;
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2200 + Math.random() * 1600;
    for (let n = 0; n < notes; n++) {
      const t0 = now + n * (0.09 + Math.random() * 0.05);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base * (1 + Math.random() * 0.3), t0);
      osc.frequency.exponentialRampToValueAtTime(base * (0.7 + Math.random() * 0.6), t0 + 0.07);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      const pan = c.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      osc.connect(g).connect(pan).connect(this.out);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    }
  }

  /** A short filtered noise burst shaped for the surface underfoot. */
  footstep(surface: Surface, running: boolean): void {
    if (this.hasFile(surface === "stone" ? "sfx_footstep_stone" : "sfx_footstep_soil")) return;
    const c = this.ctx;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = surface === "stone" ? 1.6 : 0.8;
    const f = c.createBiquadFilter();
    f.type = surface === "stone" ? "bandpass" : surface === "wood" ? "bandpass" : "lowpass";
    f.frequency.value = surface === "stone" ? 2400 : surface === "wood" ? 700 : 600;
    f.Q.value = surface === "stone" ? 1.2 : 0.8;
    const g = c.createGain();
    const level = (running ? 0.5 : 0.32) * (surface === "soil" ? 1.3 : 1);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(level, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (surface === "stone" ? 0.07 : 0.12));
    src.connect(f).connect(g).connect(this.out);
    src.start(now, Math.random() * 3, 0.15);
  }

  /** Wooden door creak / thud. */
  door(open: boolean): void {
    const c = this.ctx;
    const now = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(open ? 140 : 110, now);
    osc.frequency.linearRampToValueAtTime(open ? 230 : 80, now + 0.35);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 600;
    f.Q.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(f).connect(g).connect(this.out);
    osc.start(now);
    osc.stop(now + 0.45);
    if (!open) this.thud(now + 0.35);
  }

  private thud(at: number): void {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 220;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.4, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    src.connect(f).connect(g).connect(this.out);
    src.start(at, 1, 0.2);
  }

  /** Low two-tone "uh-oh" when the player is seen stealing. */
  alarm(): void {
    const c = this.ctx;
    const now = c.currentTime;
    [330, 247].forEach((fr, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = fr;
      const t0 = now + i * 0.18;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(g).connect(this.out);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }
}
