// Audio manifest. Files are produced with Gemini Lyria outside the game and copied into public/assets/audio.
// No audio file has been supplied yet: every entry is "pending" and the game runs silently for these slots
// (UI feedback uses synthesized placeholder blips, see AudioManager). Update status to "integrated" only after
// the file exists and has been checked in game. Prompts live in docs/AUDIO_BIBLE.md.

export type AudioType = "music" | "ambience" | "sfx" | "ui";
export type AudioStatus = "pending" | "supplied" | "integrated" | "verified";

export interface AudioEntry {
  id: string;
  path: string;
  type: AudioType;
  durationSec: number | null; // null until the real file is measured
  loop: boolean;
  intendedUse: string;
  volume: number; // 0-1 relative to its bus
  source: string;
  status: AudioStatus;
  spatial?: { x: number; y: number; z: number; refDistance: number };
}

const lyria = "Gemini Lyria (to be generated - prompt in docs/AUDIO_BIBLE.md)";

export const AUDIO_MANIFEST: AudioEntry[] = [
  { id: "mus_main_theme", path: "/assets/audio/music/mus_main_theme.ogg", type: "music", durationSec: null, loop: true, intendedUse: "Title screen and opening approach", volume: 0.7, source: lyria, status: "pending" },
  { id: "mus_exploration_day", path: "/assets/audio/music/mus_exploration_day.ogg", type: "music", durationSec: null, loop: true, intendedUse: "Daytime exploration bed", volume: 0.5, source: lyria, status: "pending" },
  { id: "mus_restoration", path: "/assets/audio/music/mus_restoration.ogg", type: "music", durationSec: null, loop: false, intendedUse: "Sting after a restoration completes", volume: 0.7, source: lyria, status: "pending" },
  { id: "mus_discovery", path: "/assets/audio/music/mus_discovery.ogg", type: "music", durationSec: null, loop: false, intendedUse: "Sting when reading a historical discovery", volume: 0.6, source: lyria, status: "pending" },
  { id: "amb_settlement_day", path: "/assets/audio/ambience/amb_settlement_day.ogg", type: "ambience", durationSec: null, loop: true, intendedUse: "Birds, distant voices-free village life, wind in palms", volume: 0.6, source: lyria, status: "pending" },
  { id: "amb_evening", path: "/assets/audio/ambience/amb_evening.ogg", type: "ambience", durationSec: null, loop: true, intendedUse: "Crickets and evening birds after 18:00", volume: 0.55, source: lyria, status: "pending" },
  { id: "amb_channel_water", path: "/assets/audio/ambience/amb_channel_water.ogg", type: "ambience", durationSec: null, loop: true, intendedUse: "Spatial loop at the restored channel", volume: 0.7, source: lyria, status: "pending", spatial: { x: 25, y: 0.3, z: -29.5, refDistance: 4 } },
  { id: "amb_workshop", path: "/assets/audio/ambience/amb_workshop.ogg", type: "ambience", durationSec: null, loop: true, intendedUse: "Spatial loop at Kamala's workshop", volume: 0.5, source: lyria, status: "pending", spatial: { x: 26, y: 1, z: 8, refDistance: 3 } },
  { id: "sfx_footstep_stone", path: "/assets/audio/footsteps/sfx_footstep_stone.ogg", type: "sfx", durationSec: null, loop: false, intendedUse: "Footsteps on paving", volume: 0.4, source: lyria, status: "pending" },
  { id: "sfx_footstep_soil", path: "/assets/audio/footsteps/sfx_footstep_soil.ogg", type: "sfx", durationSec: null, loop: false, intendedUse: "Footsteps on earth", volume: 0.4, source: lyria, status: "pending" },
  { id: "sfx_pickup", path: "/assets/audio/interactions/sfx_pickup.ogg", type: "sfx", durationSec: null, loop: false, intendedUse: "Gathering an item", volume: 0.7, source: lyria, status: "pending" },
  { id: "sfx_craft", path: "/assets/audio/interactions/sfx_craft.ogg", type: "sfx", durationSec: null, loop: false, intendedUse: "Completing a craft", volume: 0.7, source: lyria, status: "pending" },
  { id: "sfx_restore", path: "/assets/audio/interactions/sfx_restore.ogg", type: "sfx", durationSec: null, loop: false, intendedUse: "Restoration complete", volume: 0.8, source: lyria, status: "pending" },
  { id: "ui_open", path: "/assets/audio/ui/ui_open.ogg", type: "ui", durationSec: null, loop: false, intendedUse: "Panel open", volume: 0.5, source: lyria, status: "pending" },
  { id: "ui_confirm", path: "/assets/audio/ui/ui_confirm.ogg", type: "ui", durationSec: null, loop: false, intendedUse: "Confirm / quest update", volume: 0.5, source: lyria, status: "pending" },
];
