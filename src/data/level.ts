// Settlement layout (Three.js world space: metres, +Y up, +X east, +Z south).
// Asset fronts face +Z at rotY = 0. See docs/ART_BIBLE.md for the coordinate convention.

export interface Placement {
  asset: string;
  pos: [number, number, number];
  rotY?: number; // degrees
  scale?: number;
  /** Named placements are referenced by gameplay (state toggles, gather nodes, sockets). */
  id?: string;
  instanced?: boolean;
}

export interface InteractablePlacement {
  id: string;
  kind: "gather" | "station" | "restoration" | "discovery" | "rest";
  refId: string;
  label: string;
  locationId: string;
  pos: [number, number, number];
  radius: number;
  /** Placement id whose PICK_ nodes follow this gather node's availability. */
  visualId?: string;
}

export interface Region {
  id: string;
  min: [number, number];
  max: [number, number];
}

const P = (asset: string, x: number, z: number, rotY = 0, extra: Partial<Placement> = {}): Placement => ({ asset, pos: [x, 0, z], rotY, ...extra });

function wallRun(asset: string, from: [number, number], to: [number, number], skip: (x: number, z: number) => boolean = () => false): Placement[] {
  const out: Placement[] = [];
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const n = Math.round(len / 4);
  const rot = (Math.atan2(-dz, dx) * 180) / Math.PI;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = from[0] + dx * t;
    const z = from[1] + dz * t;
    if (!skip(x, z)) out.push({ asset, pos: [x, 0, z], rotY: rot, instanced: true });
  }
  return out;
}

const posts = (pts: Array<[number, number]>, asset = "ENV_Wall_Post_A") => pts.map(([x, z]) => P(asset, x, z, 0, { instanced: true }));

// ------------------------------------------------------------------ boundary & enclosure walls
const B = 46;
const boundary = [
  ...wallRun("ENV_Wall_Stone_A", [-B, B], [B, B], (x) => Math.abs(x) < 6),
  ...wallRun("ENV_Wall_Stone_A", [-B, -B], [B, -B]),
  ...wallRun("ENV_Wall_Stone_A", [-B, -B], [-B, B]),
  ...wallRun("ENV_Wall_Stone_A", [B, -B], [B, B]),
  ...posts([[-B, -B], [B, -B], [-B, B], [B, B], [-6, B], [6, B]]),
];

const prakara = [
  ...wallRun("ENV_Wall_Prakara_A", [-12, 0], [12, 0], (x) => Math.abs(x) < 4),
  ...wallRun("ENV_Wall_Prakara_A", [-12, -32], [12, -32]),
  ...wallRun("ENV_Wall_Prakara_A", [-12, -32], [-12, 0]),
  ...wallRun("ENV_Wall_Prakara_A", [12, -32], [12, 0]),
  ...posts([[-12, 0], [12, 0], [-12, -32], [12, -32], [-4, 0], [4, 0]]),
];

// ------------------------------------------------------------------ ground cover
const paving: Placement[] = [];
for (const x of [-10, 0, 10]) for (const z of [5, 15, 25, 35, -5, -15, -25]) paving.push({ asset: "ENV_Paving_Courtyard_A", pos: [x, -0.03, z], rotY: ((x + z) % 20 === 0 ? 0 : 90), instanced: true });
for (const z of [45]) paving.push({ asset: "ENV_Paving_Courtyard_A", pos: [0, -0.03, z], instanced: true });

const rng = (() => {
  let s = 1234567;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

const palms: Placement[] = [];
for (let i = 0; i < 26; i++) {
  const a = (i / 26) * Math.PI * 2;
  const r = 54 + rng() * 14;
  palms.push(P("PRP_Palm_Coconut_A", Math.cos(a) * r, Math.sin(a) * r, rng() * 360, { scale: 0.85 + rng() * 0.35, instanced: true }));
}
for (const [x, z] of [[-40, 40], [40, 40], [-42, 4], [42, -6], [-14, 42], [14, 42], [38, 20], [-34, 16]] as Array<[number, number]>)
  palms.push(P("PRP_Palm_Coconut_A", x, z, rng() * 360, { scale: 0.9 + rng() * 0.2, instanced: true }));

const overgrowth: Placement[] = [];
for (let i = 0; i < 70; i++) {
  const x = -42 + rng() * 26;
  const z = -44 + rng() * 22;
  overgrowth.push(P("PRP_Grass_Clump_A", x, z, rng() * 360, { scale: 0.8 + rng() * 0.9, instanced: true }));
}
for (let i = 0; i < 40; i++) {
  const x = -44 + rng() * 88;
  const z = -44 + rng() * 88;
  if (Math.abs(x) < 16 && z > -34 && z < 46) continue; // keep the courtyard and temple clean
  overgrowth.push(P("PRP_Grass_Clump_A", x, z, rng() * 360, { scale: 0.6 + rng() * 0.6, instanced: true }));
}
const shrubs: Placement[] = [
  ...[[-40, -24], [-18, -42], [-41, -40], [-31, -23], [-17, -30]].map(([x, z]) => P("PRP_Shrub_A", x!, z!, rng() * 360, { scale: 1 + rng() * 0.5, instanced: true })),
  // garden hedge with a gap for the path
  ...[16, 18, 20, 22, 28, 30, 32, 34].map((x) => P("PRP_Shrub_A", x, -14.5, rng() * 360, { scale: 0.75, instanced: true })),
];

// ------------------------------------------------------------------ main placements
export const PLACEMENTS: Placement[] = [
  ...boundary,
  ...prakara,
  ...paving,
  ...palms,
  ...overgrowth,
  ...shrubs,
  P("ENV_Gopuram_Entrance_A", 0, B, 0, { id: "gopuram" }),
  { asset: "PRP_Garland_Gate_A", pos: [0, 3.85, B - 2.56], rotY: 180, id: "gate_garland" },
  P("ENV_Temple_Main_A", 0, -14.5, 0, { id: "temple", scale: 1.25 }), // landmark scale; steps become 0.25 m
  P("ENV_Lamp_Pillar_A", 0, 5),
  P("ENV_Tree_Platform_A", -8, 24),
  P("PRP_Tree_Neem_A", -8, 24, 40, { scale: 1.15 }),
  P("PRP_Tree_Neem_A", 34, -40, 120, { scale: 1.0 }),
  P("PRP_Tree_Neem_A", -38, 30, 200, { scale: 0.95 }),
  P("PRP_Tree_Neem_A", 38, 6, 300, { scale: 1.05 }),
  // west street
  P("ENV_House_Village_B", -26, -2, 90),
  P("ENV_House_Village_A", -26, 8, 90, { id: "house_ponnan" }),
  P("ENV_House_Village_B", -26, 18, 90, { id: "house_valli" }),
  P("ENV_House_Village_A", -26, 28, 90, { id: "house_player" }),
  P("PRP_Banana_Plant_A", -31.5, 3, 30),
  P("PRP_Banana_Plant_A", -32, 13, 80),
  P("PRP_Banana_Plant_A", -31.5, 23.5, 140),
  // east: workshop and market
  P("ENV_Workshop_A", 26, 8, -90, { id: "workshop" }),
  P("ENV_Market_Stall_A", 19, 30, -90, { id: "stall" }),
  P("PRP_Banana_Plant_A", 30.5, 14, 200),
  // garden, channel and tank
  P("ENV_Tank_Stepped_A", 36.4, -29.5, 180, { id: "tank" }),
  P("PRP_Channel_Blocked_A", 25, -29.5, 180, { id: "channel_blocked" }),
  P("PRP_Channel_Restored_A", 25, -29.5, 180, { id: "channel_restored" }),
  P("PRP_Marigold_Bed_A", 21.5, -25, 0, { id: "bed_1" }),
  P("PRP_Marigold_Bed_A", 28.5, -25, 0, { id: "bed_2" }),
  P("PRP_Marigold_Bed_A", 21.5, -18.5, 0, { id: "bed_3" }),
  P("PRP_Marigold_Bed_A", 28.5, -18.5, 0, { id: "bed_4" }),
  P("PRP_Banana_Plant_A", 35, -20, 10),
  P("PRP_Banana_Plant_A", 15.5, -22, 250),
  P("PRP_Clay_Bank_A", 15.5, -35.5, 0, { id: "claybank" }),
  // old grounds
  P("ENV_Ruin_Mandapa_Base_A", -30, -34, 8),
  P("ENV_Wall_Stone_Broken_A", -22, -25.5, 0),
  P("ENV_Wall_Stone_Broken_A", -38.5, -27, 90),
  P("ENV_Wall_Stone_Broken_A", -38.5, -31, 90),
  P("ENV_Wall_Stone_Broken_A", -25, -42.5, 6),
  P("ENV_Ruin_Pillar_Broken_A", -35, -26.5, 20),
  P("ENV_Ruin_Pillar_Broken_A", -20, -38, 70),
  P("ENV_Ruin_Pillar_Broken_A", -37, -41, 150),
  P("PRP_Inscription_Stone_A", -33, -24.2, 10, { id: "inscription" }),
  P("PRP_Rubble_Masonry_A", -24, -30, 10, { id: "rubble_1" }),
  P("PRP_Rubble_Masonry_A", -21, -27.5, 80, { id: "rubble_2" }),
  P("PRP_Rubble_Masonry_A", -36, -33.5, 140, { id: "rubble_3" }),
  P("PRP_Rubble_Masonry_A", -36.5, -37.5, 200, { id: "rubble_4" }),
  P("PRP_Rubble_Masonry_A", -23, -35.5, 260, { id: "rubble_5" }),
  P("PRP_Rubble_Masonry_A", -28, -40.5, 320, { id: "rubble_6" }),
  // jasmine along the house fronts
  ...[4.5, 11.5, 14.5, 21.5, 24.5, 31.5].map((z, i) => P("PRP_Jasmine_Bush_A", -20.2, z, i * 70, { id: `jasmine_${i + 1}` })),
];

// ------------------------------------------------------------------ interactables (non-NPC)
export const INTERACTABLES: InteractablePlacement[] = [
  ...[4.5, 11.5, 14.5, 21.5, 24.5, 31.5].map((z, i) => ({
    id: `int_jasmine_${i + 1}`,
    kind: "gather" as const,
    refId: `gn_jasmine_${i + 1}`,
    label: "jasmine bush",
    locationId: "loc_street",
    pos: [-20.2, 0, z] as [number, number, number],
    radius: 1.9,
    visualId: `jasmine_${i + 1}`,
  })),
  ...([[21.5, -25], [28.5, -25], [21.5, -18.5], [28.5, -18.5]] as Array<[number, number]>).map(([x, z], i) => ({
    id: `int_marigold_${i + 1}`,
    kind: "gather" as const,
    refId: `gn_marigold_${i + 1}`,
    label: "marigold bed",
    locationId: "loc_garden",
    pos: [x, 0, z] as [number, number, number],
    radius: 2.4,
    visualId: `bed_${i + 1}`,
  })),
  ...([[-24, -30], [-21, -27.5], [-36, -33.5], [-36.5, -37.5], [-23, -35.5], [-28, -40.5]] as Array<[number, number]>).map(([x, z], i) => ({
    id: `int_stone_${i + 1}`,
    kind: "gather" as const,
    refId: `gn_stone_${i + 1}`,
    label: "fallen masonry",
    locationId: "loc_forgotten",
    pos: [x, 0, z] as [number, number, number],
    radius: 1.9,
    visualId: `rubble_${i + 1}`,
  })),
  { id: "int_clay_1", kind: "gather", refId: "gn_clay_1", label: "clay bank", locationId: "loc_claypit", pos: [15.5, 0, -34.2], radius: 2.2, visualId: "claybank" },
  { id: "int_clay_2", kind: "gather", refId: "gn_clay_2", label: "clay bank", locationId: "loc_claypit", pos: [14.2, 0, -34.4], radius: 2.2 },
  { id: "int_bench", kind: "station", refId: "st_workshop_bench", label: "Kamala's workbench", locationId: "loc_workshop", pos: [25.5, 0.15, 8], radius: 1.8 },
  { id: "int_channel_east", kind: "restoration", refId: "rest_channel_east", label: "the garden channel", locationId: "loc_garden", pos: [24.9, 0, -28.6], radius: 2.4 },
  { id: "int_inscription", kind: "discovery", refId: "disc_channel_inscription", label: "the inscribed stone", locationId: "loc_forgotten", pos: [-33, 0, -23.6], radius: 2.0 },
  { id: "int_rest", kind: "rest", refId: "home", label: "your doorway", locationId: "loc_home", pos: [-23.2, 0.45, 28], radius: 1.8 },
];

// ------------------------------------------------------------------ NPC anchors and navigation
export const ANCHORS: Record<string, { pos: [number, number, number]; faceY: number }> = {
  anc_courtyard_gate: { pos: [3.5, 0, 39], faceY: 200 },
  anc_valli_home: { pos: [-21.0, 0, 18], faceY: 90 },
  anc_garden: { pos: [25, 0, -21.7], faceY: 180 },
  anc_murugan_rest: { pos: [-5.0, 0, 22.5], faceY: 120 },
  anc_workshop: { pos: [27.6, 0.15, 7.3], faceY: -90 },
  anc_market: { pos: [19.4, 0, 30], faceY: -90 },
  anc_ponnan_veranda: { pos: [-22.4, 0.45, 10.1], faceY: 90 },
  anc_forgotten_edge: { pos: [-19.5, 0, -22.5], faceY: 210 },
};

export const NAV_NODES: Record<string, [number, number]> = {
  gate: [0, 38],
  court: [0, 20],
  court_e: [14, 20],
  court_w: [-17, 20],
  street_s: [-18, 32],
  street_n: [-18, -4],
  temple_w: [-15, -20],
  forgotten: [-19, -24],
  east_n: [15, -6],
  garden_gate: [25, -14],
  garden: [25, -21.7],
  workshop: [21, 8],
  market: [16, 30],
};

export const NAV_EDGES: Array<[string, string]> = [
  ["gate", "court"], ["court", "court_e"], ["court", "court_w"], ["court_w", "street_s"], ["court_w", "street_n"],
  ["street_n", "temple_w"], ["temple_w", "forgotten"], ["court_e", "workshop"], ["court_e", "market"], ["workshop", "east_n"],
  ["east_n", "garden_gate"], ["garden_gate", "garden"], ["gate", "market"], ["street_s", "gate"],
];

export const REGIONS: Region[] = [
  { id: "loc_entrance", min: [-8, 36], max: [8, 60] },
  { id: "loc_market", min: [14, 24], max: [26, 36] },
  { id: "loc_workshop", min: [20, 2], max: [30, 14] },
  { id: "loc_garden", min: [14, -32], max: [40, -14] },
  { id: "loc_claypit", min: [10, -42], max: [20, -31] },
  { id: "loc_forgotten", min: [-46, -46], max: [-16, -22] },
  { id: "loc_home", min: [-30, 24], max: [-20, 33] },
  { id: "loc_street", min: [-32, -6], max: [-16, 36] },
  { id: "loc_temple", min: [-12, -32], max: [12, 0] },
  { id: "loc_courtyard", min: [-16, 0], max: [16, 36] },
];

/**
 * State -> visual rules. A placement is shown only in `visibleInState` (or when `flag` is set);
 * otherwise its STATE_<state> children follow the restoration state.
 */
export type VisualBinding =
  | { placementId: string; restorationId: string; visibleInState?: string }
  | { placementId: string; flag: string };

export const VISUAL_BINDINGS: VisualBinding[] = [
  { placementId: "channel_blocked", restorationId: "rest_channel_east", visibleInState: "blocked" },
  { placementId: "channel_restored", restorationId: "rest_channel_east", visibleInState: "flowing" },
  ...[1, 2, 3, 4].map((i) => ({ placementId: `bed_${i}`, restorationId: "rest_garden_main" })),
  { placementId: "gate_garland", flag: "gate_garland_hung" },
];

export const PLAYER_SPAWN: { pos: [number, number, number]; yaw: number } = { pos: [0, 0, 55], yaw: Math.PI };
export const WORLD_BOUNDS = 70;
