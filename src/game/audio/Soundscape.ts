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
  workshop: number; // 0..1 someone is working at the workshop bench
}

export type Surface = "stone" | "soil" | "wood";

export class Soundscape {
  private noise: AudioBuffer;
  private layers: Record<"wind" | "rain" | "water" | "crowd", { gain: GainNode; filter: BiquadFilterNode }>;
  private birdTimer = 0;
  private cricketGain: GainNode;
  private t = 0;
  private tapTimer = 0;
  private workshopOut: PannerNode | null = null;
  /** procedural events so far (diagnostics and tests) */
  readonly counts = { taps: 0 };

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
    private hasFile: (id: string) => boolean,
    private workshopAt: { x: number; y: number; z: number; refDistance: number } | null = null,
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
    // chisel and mallet at the workbench, heard from the bench itself
    this.tapTimer -= dt;
    if (this.tapTimer <= 0) {
      this.tapTimer = 1.3 + Math.random() * 2.2;
      if (p.workshop > 0 && this.workshopAt && !has("amb_workshop")) this.chisel(p.workshop);
    }
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
  // ---------------------------------------------------------------- temple visit cues (placeholders)
  /** Temple bell: inharmonic partials with a long decay. */
  bell(): void {
    const c = this.ctx;
    const now = c.currentTime;
    for (const [ratio, amp, decay] of [[1, 0.06, 2.4], [2.76, 0.03, 1.6], [5.4, 0.018, 0.9], [8.9, 0.01, 0.5]] as const) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = 620 * ratio;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(amp, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      o.connect(g).connect(this.out);
      o.start(now);
      o.stop(now + decay + 0.05);
    }
  }

  /** A light ting for social and hustle points. */
  chime(): void {
    const c = this.ctx;
    const now = c.currentTime;
    [1320, 1760].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.035, now + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.35);
      o.connect(g).connect(this.out);
      o.start(now + i * 0.07);
      o.stop(now + i * 0.07 + 0.4);
    });
  }

  /** Nadaswaram sting: a short reedy rising phrase (Mohanam notes) for big scores. */
  nadaswaram(): void {
    const c = this.ctx;
    const now = c.currentTime;
    const notes = [523, 587, 659, 784, 880, 784, 1047];
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1400;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.value = 0.0001;
    f.connect(g).connect(this.out);
    const o = c.createOscillator();
    o.type = "sawtooth";
    const vib = c.createOscillator();
    vib.frequency.value = 6;
    const vg = c.createGain();
    vg.gain.value = 9;
    vib.connect(vg).connect(o.frequency);
    notes.forEach((n, i) => o.frequency.setValueAtTime(n, now + i * 0.11));
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.05);
    g.gain.setValueAtTime(0.05, now + notes.length * 0.11);
    g.gain.exponentialRampToValueAtTime(0.0001, now + notes.length * 0.11 + 0.4);
    o.connect(f);
    o.start(now);
    vib.start(now);
    o.stop(now + notes.length * 0.11 + 0.45);
    vib.stop(now + notes.length * 0.11 + 0.45);
  }

  /** "Aiyyo": a two-syllable falling vowel glide through formant filters (placeholder for a recorded voice). */
  aiyyo(): void {
    const c = this.ctx;
    const now = c.currentTime;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(260, now);
    o.frequency.linearRampToValueAtTime(300, now + 0.12);
    o.frequency.linearRampToValueAtTime(200, now + 0.45);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.03);
    g.gain.setValueAtTime(0.05, now + 0.16);
    g.gain.exponentialRampToValueAtTime(0.02, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.26);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    // formants glide from "ai" (F1 700, F2 1700) to "yo" (F1 450, F2 850)
    for (const [a0, a1, q] of [[700, 450, 6], [1700, 850, 8]] as const) {
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = q;
      f.frequency.setValueAtTime(a0, now);
      f.frequency.linearRampToValueAtTime(a0, now + 0.18);
      f.frequency.linearRampToValueAtTime(a1, now + 0.32);
      o.connect(f).connect(g);
    }
    g.connect(this.out);
    o.start(now);
    o.stop(now + 0.6);
  }

  /** Auto-rickshaw horn: two detuned squares. */
  horn(): void {
    const c = this.ctx;
    const now = c.currentTime;
    for (const f of [420, 435]) {
      const o = c.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.025, now + 0.02);
      g.gain.setValueAtTime(0.025, now + 0.28);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      o.connect(g).connect(this.out);
      o.start(now);
      o.stop(now + 0.36);
    }
  }

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  /** Two-stroke engine hum: a filtered sawtooth whose pitch follows speed. */
  engine(on: boolean): void {
    const c = this.ctx;
    if (on && !this.engineOsc) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 38;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      const g = c.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.04, c.currentTime + 0.3);
      o.connect(f).connect(g).connect(this.out);
      o.start();
      this.engineOsc = o;
      this.engineGain = g;
    } else if (!on && this.engineOsc) {
      const o = this.engineOsc;
      this.engineGain!.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
      o.stop(c.currentTime + 0.35);
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  engineSpeed(v: number): void {
    if (this.engineOsc) this.engineOsc.frequency.setTargetAtTime(38 + v * 9, this.ctx.currentTime, 0.1);
  }

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

  /** A positional output at a point in the world (HRTF panning, inverse-distance roll-off). */
  static panner(ctx: AudioContext, at: { x: number; y: number; z: number; refDistance: number }, out: AudioNode): PannerNode {
    const p = ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = at.refDistance;
    p.maxDistance = 80;
    p.rolloffFactor = 1.3;
    if (p.positionX) {
      p.positionX.value = at.x;
      p.positionY.value = at.y;
      p.positionZ.value = at.z;
    } else p.setPosition(at.x, at.y, at.z);
    p.connect(out);
    return p;
  }

  /** Two to four mallet-on-chisel taps: a bright click over a short wooden knock. */
  private chisel(level: number): void {
    const c = this.ctx;
    this.workshopOut ??= Soundscape.panner(c, this.workshopAt!, this.out);
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t0 = c.currentTime + i * (0.2 + Math.random() * 0.08);
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2300 + Math.random() * 500;
      bp.Q.value = 3;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5 * level, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      src.connect(bp).connect(g).connect(this.workshopOut);
      src.start(t0, Math.random() * 3, 0.1);
      const knock = c.createOscillator();
      knock.frequency.setValueAtTime(240, t0);
      knock.frequency.exponentialRampToValueAtTime(130, t0 + 0.06);
      const kg = c.createGain();
      kg.gain.setValueAtTime(0.0001, t0);
      kg.gain.exponentialRampToValueAtTime(0.25 * level, t0 + 0.004);
      kg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      knock.connect(kg).connect(this.workshopOut);
      knock.start(t0);
      knock.stop(t0 + 0.1);
    }
    this.counts.taps++;
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
