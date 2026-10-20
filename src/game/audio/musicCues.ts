// Which music cue fits the moment (README §11: morning, exploration, workshop, evening, festival).
// Pure so the rules can be unit tested; AudioManager plays the file when supplied, else MusicSynth's placeholder.

export type MusicCue = "mus_main_theme" | "mus_morning" | "mus_exploration_day" | "mus_workshop" | "mus_evening" | "mus_festival";

export interface MusicContext {
  /** hour of day, 0-24 (fractional) */
  hour: number;
  /** the lamp festival has been held (festival evenings follow) */
  festivalHeld: boolean;
  /** the player stands in the workshop yard */
  inWorkshop: boolean;
  /** inside a Temple Visit (its own soundscape of bells and crowd) */
  visiting: boolean;
}

/** null = no music, ambience only (late night, and Temple Visits where the bells and crowd carry the scene). */
export function musicCueFor(c: MusicContext): MusicCue | null {
  const h = c.hour;
  if (c.visiting) return null;
  if (c.festivalHeld && h >= 17 && h < 23) return "mus_festival";
  if (h >= 21 || h < 5) return null;
  if (h < 9) return "mus_morning";
  if (h >= 17) return "mus_evening";
  if (c.inWorkshop) return "mus_workshop";
  return "mus_exploration_day";
}
