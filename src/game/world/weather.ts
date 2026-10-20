/**
 * Weather is a pure function of world time: every 3-hour block of every day gets a deterministic kind.
 * Nothing is saved, so weather is identical after a reload. The lamp festival evening is always clear.
 */
export type WeatherKind = "clear" | "cloudy" | "rain";

export interface Weather {
  kind: WeatherKind;
  /** 0..1 rain amount, eased in and out at block boundaries. */
  rain: number;
  /** 0..1 cloud cover. */
  cloud: number;
  /** 0..1 wind strength. */
  wind: number;
}

const BLOCK = 180; // minutes

function hash(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822507) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

export function kindAt(minutes: number, festivalHeld = false): WeatherKind {
  const day = Math.floor(minutes / 1440);
  const hourOfDay = (minutes % 1440) / 60;
  if (day === 0 && hourOfDay < 12) return "clear"; // a fair first morning for new players
  if (festivalHeld && hourOfDay >= 16 && hourOfDay < 23) return "clear";
  const r = hash(Math.floor(minutes / BLOCK) + 17);
  return r < 0.16 ? "rain" : r < 0.42 ? "cloudy" : "clear";
}

const TARGET: Record<WeatherKind, { rain: number; cloud: number; wind: number }> = {
  clear: { rain: 0, cloud: 0.05, wind: 0.25 },
  cloudy: { rain: 0, cloud: 0.6, wind: 0.5 },
  rain: { rain: 1, cloud: 1, wind: 0.85 },
};

/** Blended weather: eases over the first and last 20 minutes of each block. */
export function weatherAt(minutes: number, festivalHeld = false): Weather {
  const kind = kindAt(minutes, festivalHeld);
  const into = minutes % BLOCK;
  const prev = kindAt(minutes - into - 1, festivalHeld);
  const next = kindAt(minutes - into + BLOCK, festivalHeld);
  const a = TARGET[kind];
  const ease = (t: number) => t * t * (3 - 2 * t);
  let mix = { ...a };
  if (into < 20) {
    const t = ease(into / 20);
    const p = TARGET[prev];
    mix = { rain: p.rain + (a.rain - p.rain) * t, cloud: p.cloud + (a.cloud - p.cloud) * t, wind: p.wind + (a.wind - p.wind) * t };
  } else if (into > BLOCK - 20) {
    const t = ease((into - (BLOCK - 20)) / 20);
    const n = TARGET[next];
    mix = { rain: a.rain + (n.rain - a.rain) * t, cloud: a.cloud + (n.cloud - a.cloud) * t, wind: a.wind + (n.wind - a.wind) * t };
  }
  return { kind, ...mix };
}

export const isRaining = (minutes: number, festivalHeld = false) => kindAt(minutes, festivalHeld) === "rain";
