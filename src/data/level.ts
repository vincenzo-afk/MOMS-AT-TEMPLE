// Settlement layout (Three.js world space: metres, +Y up, +X east, +Z south).
// Asset fronts face +Z at rotY = 0; rotY 90 faces east (+X), -90 west, 180 north.
// The walled core (+-46 m) holds the temple; outside it: south approach and tank, east bazaar and lane,
// north fields and reservoir, west ruins and woodland. See docs/ART_BIBLE.md and docs/GAMEPLAY_SYSTEMS.md.

export interface Placement {
  asset: string;
  pos: [number, number, number];
  rotY?: number; // degrees
  scale?: number;
  /** Named placements are referenced by gameplay (state toggles, gather nodes, sockets). */
  id?: string;
  instanced?: boolean;
  /** For decorative copies of stateful assets: always show this STATE_ child. */
  state?: string;
}

export interface InteractablePlacement {
  id: string;
  kind: "gather" | "station" | "restoration" | "discovery" | "rest" | "plot" | "water" | "storage" | "decor" | "notice" | "sit" | "container" | "pickup";
  refId: string;
  label: string;
  locationId: string;
  pos: [number, number, number];
  radius: number;
  /** Placement id whose PICK_ nodes follow this gather node's availability. */
  visualId?: string;
  /** For "sit": which way to face while seated (degrees). */
  faceY?: number;
  /** Resolve the position from a placement socket ("placementId.SOCKET_Name") instead of `pos`. */
  socket?: string;
}

export interface Region {
  id: string;
  min: [number, number];
  max: [number, number];
}

const P = (asset: string, x: number, z: number, rotY = 0, extra: Partial<Placement> = {}): Placement => ({ asset, pos: [x, 0, z], rotY, ...extra });
const I = (asset: string, x: number, z: number, rotY = 0, scale = 1): Placement => ({ asset, pos: [x, 0, z], rotY, scale, instanced: true });

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

const posts = (pts: Array<[number, number]>, asset = "ENV_Wall_Post_A") => pts.map(([x, z]) => I(asset, x, z));

const rng = (() => {
  let s = 1234567;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
})();

// ------------------------------------------------------------------ core walls with four gates
const B = 46;
/** Jasmine bushes along the west street house fronts (kept clear of the player's doorway). */
const JASMINE_Z = [4.5, 11.5, 14.5, 21.0, 23.2, 33.4];
const boundary = [
  ...wallRun("ENV_Wall_Stone_A", [-B, B], [B, B], (x) => Math.abs(x) < 6), // south: gopuram
  ...wallRun("ENV_Wall_Stone_A", [-B, -B], [B, -B], (x) => x > 18 && x < 26), // north gate to the fields
  ...wallRun("ENV_Wall_Stone_A", [-B, -B], [-B, B], (_x, z) => z > -30 && z < -22), // west gate to the ruins
  ...wallRun("ENV_Wall_Stone_A", [B, -B], [B, B], (_x, z) => z > 6 && z < 14), // east gate to the bazaar
  ...posts([[-B, -B], [B, -B], [-B, B], [B, B], [-6, B], [6, B], [18, -B], [26, -B], [-B, -30], [-B, -22], [B, 6], [B, 14]]),
];

const prakara = [
  ...wallRun("ENV_Wall_Prakara_A", [-12, 0], [12, 0], (x) => Math.abs(x) < 4),
  ...wallRun("ENV_Wall_Prakara_A", [-12, -32], [12, -32]),
  ...wallRun("ENV_Wall_Prakara_A", [-12, -32], [-12, 0]),
  ...wallRun("ENV_Wall_Prakara_A", [12, -32], [12, 0]),
  ...posts([[-12, 0], [12, 0], [-12, -32], [12, -32], [-4, 0], [4, 0]]),
];

// ------------------------------------------------------------------ ground cover and vegetation
const paving: Placement[] = [];
for (const x of [-10, 0, 10]) for (const z of [5, 15, 25, 35, -5, -15, -25]) paving.push({ asset: "ENV_Paving_Courtyard_A", pos: [x, -0.03, z], rotY: (x + z) % 20 === 0 ? 0 : 90, instanced: true });
for (const [x, z] of [[0, 45], [0, 55], [82, 10]] as Array<[number, number]>) paving.push({ asset: "ENV_Paving_Courtyard_A", pos: [x, -0.03, z], instanced: true });

const scatter = (asset: string, n: number, x0: number, x1: number, z0: number, z1: number, s0 = 0.8, s1 = 1.2, avoid?: (x: number, z: number) => boolean): Placement[] => {
  const out: Placement[] = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const x = x0 + rng() * (x1 - x0);
    const z = z0 + rng() * (z1 - z0);
    if (avoid?.(x, z)) continue;
    out.push(I(asset, x, z, rng() * 360, s0 + rng() * (s1 - s0)));
  }
  return out;
};

const inCore = (x: number, z: number) => Math.abs(x) < 49 && Math.abs(z) < 49;
const onRoad = (x: number, z: number) => (Math.abs(x) < 9 && z > 40) || (Math.abs(z - 10) < 9 && x > 40 && x < 135) || (Math.abs(x - 80) < 9 && z > 18 && z < 80);
const inFields = (x: number, z: number) => x > 28 && x < 120 && z < -54 && z > -150;
const inKulam = (x: number, z: number) => Math.hypot(x + 42, z - 82) < 22;
const inRuinsCore = (x: number, z: number) => x < -54 && x > -124 && z > -60 && z < 0;

const vegetation: Placement[] = [
  // palms frame the road, the tank, the bazaar and the outer edges
  ...[60, 72, 84, 96, 108, 120, 132].flatMap((z, i) => [I("PRP_Palm_Coconut_B", -7.5, z, rng() * 360, 0.9 + (i % 3) * 0.08), I("PRP_Palm_Coconut_B", 7.5, z + 6, rng() * 360, 0.95)]),
  ...[[-64, 66], [-66, 96], [-20, 98], [-24, 64], [-60, 104], [-30, 108]].map(([x, z]) => I("PRP_Palm_Coconut_B", x!, z!, rng() * 360, 0.95 + rng() * 0.2)),
  ...[[52, -6], [74, -14], [118, -8], [126, 24], [56, 28], [100, 34], [96, 82], [64, 80], [-40, 40], [40, 40], [-42, 4], [42, -6], [-14, 42], [14, 42]].map(([x, z]) =>
    I("PRP_Palm_Coconut_B", x!, z!, rng() * 360, 0.9 + rng() * 0.25),
  ),
  ...scatter("PRP_Palm_Coconut_B", 40, -148, 148, -148, 148, 0.85, 1.2, (x, z) => inCore(x, z) || onRoad(x, z) || inFields(x, z) || inKulam(x, z) || inRuinsCore(x, z) || Math.hypot(x, z) < 60),
  // woodland neem trees north-west
  ...scatter("PRP_Neem_Tree_B", 22, -145, -60, -145, -62, 0.85, 1.25),
  ...[[-8, 24, 40], [34, -40, 120], [-38, 30, 200], [38, 6, 300], [90, -2, 10], [108, 26, 70], [-30, 120, 30], [60, -46, 80], [-60, 30, 150]].map(([x, z, r]) => P("PRP_Neem_Tree_B", x!, z!, r!, { scale: x === -8 ? 1.0 : 0.9 })),
  ...[[-31.5, 3], [-32, 13], [-31.5, 23.5], [30.5, 14], [35, -20], [15.5, -22], [70, 26], [92, 28], [66, -12], [110, -14], [-50, 66], [24, 60]].map(([x, z]) => I("PRP_Banana_Plant_B", x!, z!, rng() * 360, 0.9 + rng() * 0.2)),
  ...scatter("PRP_Grass_Clump_A", 70, -42, -16, -44, -22, 0.8, 1.7),
  ...scatter("PRP_Grass_Clump_A", 90, -140, -54, -60, 10, 0.8, 1.8),
  ...scatter("PRP_Grass_Clump_A", 70, -148, 148, -148, 148, 0.6, 1.2, (x, z) => (Math.abs(x) < 16 && z > -34 && z < 46) || onRoad(x, z) || inFields(x, z)),
  ...[[-40, -24], [-18, -42], [-41, -40], [-31, -23], [-17, -30]].map(([x, z]) => I("PRP_Shrub_A", x!, z!, rng() * 360, 1 + rng() * 0.5)),
  ...[16, 18, 20, 22, 28, 30, 32, 34].map((x) => I("PRP_Shrub_A", x, -14.5, rng() * 360, 0.75)),
  ...scatter("PRP_Flowering_Shrub_A", 26, -60, 140, -40, 140, 0.8, 1.2, (x, z) => inCore(x, z) || onRoad(x, z) || inKulam(x, z) || inFields(x, z)),
  ...[[-8, 52], [8, 46], [-9, 64], [48, 4], [48, 16], [-48, -20], [-48, -32]].map(([x, z]) => I("PRP_Flowering_Shrub_A", x!, z!, rng() * 360, 0.9)),
  ...scatter("PRP_Ground_Cover_A", 50, -140, 140, -140, 140, 0.8, 1.4, (x, z) => inCore(x, z) || onRoad(x, z) || inFields(x, z)),
  ...[[-30, 20], [-30, 34], [-24, -6], [72, 52], [88, 52], [72, 70]].map(([x, z]) => I("PRP_Marigold_Plant_A", x!, z!, rng() * 360, 1)),
];

// ------------------------------------------------------------------ the north fields: channel network and paddies
const fieldChannel: Placement[] = [];
for (let k = 0; k < 14; k++) {
  const z = -113 + k * 4;
  fieldChannel.push(P(z === -85 ? "ENV_Channel_Junction_A" : "ENV_Channel_Straight_A", 82, z, 90, { id: `field_channel_${k}` }));
}
const paddies: Placement[] = [];
let paddyN = 0;
for (const x of [59.5, 70.5, 93.5, 104.5]) for (const z of [-66.5, -77.5, -88.5, -99.5, -110.5]) paddies.push(P("ENV_Paddy_Plot_A", x, z, 0, { id: `paddy_${++paddyN}` }));

// ------------------------------------------------------------------ west ruins: walled enclosure around the old pavilion, opening on the east
const enclosure = [
  ...wallRun("ENV_Wall_Stone_Broken_A", [-120, -36], [-88, -36]),
  ...wallRun("ENV_Wall_Stone_Broken_A", [-120, -4], [-88, -4]),
  ...wallRun("ENV_Wall_Stone_Broken_A", [-120, -36], [-120, -4]),
  ...wallRun("ENV_Wall_Stone_Broken_A", [-88, -36], [-88, -4], (_x, z) => Math.abs(z + 22) < 1.5),
];

// ------------------------------------------------------------------ main placements
export const PLACEMENTS: Placement[] = [
  ...boundary,
  ...prakara,
  ...paving,
  ...vegetation,
  ...enclosure,
  ...fieldChannel,
  ...paddies,
  // ---- core: temple, gate, courtyard
  P("ENV_Gopuram_Entrance_A", 0, B, 0, { id: "gopuram" }),
  { asset: "PRP_Garland_Gate_A", pos: [0, 3.85, B - 2.56], rotY: 180, id: "gate_garland" },
  P("ENV_Temple_Main_A", 0, -14.5, 0, { id: "temple", scale: 1.25 }),
  P("ENV_Lamp_Pillar_A", 0, 5),
  P("ENV_Tree_Platform_A", -8, 24),
  P("ENV_Festival_Station_A", 9, 14, -90, { id: "festival_station" }),
  P("PRP_Bench_Wood_A", -12.5, 36, 90, { id: "bench_courtyard" }),
  P("PRP_Bench_Back_A", -12.5, 32, 90, { id: "bench_courtyard_back" }), // backrest + armrests
  P("PRP_Contribution_Chest_A", 6, 2.5, 180),
  // ---- core: west street
  P("ENV_House_Village_B", -26, -2, 90),
  P("ENV_House_Village_A", -26, 8, 90, { id: "house_ponnan" }),
  P("ENV_House_Village_B", -26, 18, 90, { id: "house_valli" }),
  P("ENV_House_Player_A", -26, 28, 90, { id: "house_player" }), // enterable: hinged door, furnished room
  { asset: "PRP_Storage_Chest_A", pos: [-22.9, 0.85, 30.3], rotY: 90, id: "home_chest" }, // on the left thinnai
  // player home decorations (shown by decor slot state)
  { asset: "PRP_Thoranam_A", pos: [-23.9, 2.85, 28], rotY: 90, id: "decor_doorway" },
  P("PRP_Kolam_A", -20.6, 28, 0, { id: "decor_doorstep" }),
  { asset: "PRP_Oil_Lamp_A", pos: [-22.45, 0.88, 26.9], rotY: 90, id: "decor_lamp" },
  { asset: "PRP_Woven_Mat_A", pos: [-23.15, 0.86, 25.6], rotY: 90, id: "decor_mat" },
  P("PRP_Tulsi_Pot_A", -21.0, 25.4, 0, { id: "decor_plant" }),
  P("PRP_Household_Set_A", -31.2, 31.5, 90),
  // ---- core: east side
  P("ENV_Workshop_A", 26, 8, -90, { id: "workshop" }),
  P("PRP_Stone_Work_Surface_A", 24.5, 14.5, -90),
  P("PRP_Tool_Rack_A", 30.6, 4.5, -90),
  P("PRP_Material_Stacks_A", 30.5, 13.5, 180),
  P("ENV_Market_Stall_A", 19, 30, -90, { id: "stall" }),
  P("PRP_Shelf_Bamboo_A", 21.5, 33.5, -90),
  // ---- core: garden, channel, tank, clay
  P("ENV_Tank_Stepped_A", 36.4, -29.5, 180, { id: "tank" }),
  P("PRP_Channel_Blocked_A", 25, -29.5, 180, { id: "channel_blocked" }),
  P("PRP_Channel_Restored_A", 25, -29.5, 180, { id: "channel_restored" }),
  P("PRP_Marigold_Bed_A", 21.5, -25, 0, { id: "bed_1" }),
  P("PRP_Marigold_Bed_A", 28.5, -25, 0, { id: "bed_2" }),
  P("PRP_Marigold_Bed_A", 21.5, -18.5, 0, { id: "bed_3" }),
  P("PRP_Marigold_Bed_A", 28.5, -18.5, 0, { id: "bed_4" }),
  P("PRP_Garden_Tools_A", 34, -16.5, 200),
  P("PRP_Clay_Bank_A", 15.5, -35.5, 0, { id: "claybank" }),
  // ---- core: old grounds
  P("ENV_Ruin_Mandapa_Base_A", -30, -34, 8),
  P("ENV_Wall_Stone_Broken_A", -22, -25.5, 0),
  P("ENV_Wall_Stone_Broken_A", -38.5, -38, 90),
  P("ENV_Wall_Stone_Broken_A", -25, -42.5, 6),
  P("ENV_Ruin_Pillar_Broken_A", -35, -26.5, 20),
  P("ENV_Ruin_Pillar_Broken_A", -20, -38, 70),
  P("ENV_Ruin_Pillar_Broken_A", -37, -41, 150),
  P("PRP_Inscription_Slab_B", -33, -24.2, 10, { id: "inscription" }),
  ...([[-24, -30], [-21, -27.5], [-36, -33.5], [-36.5, -37.5], [-23, -35.5], [-28, -40.5], [-62, -48], [-72, -52], [-64, -10], [-74, -6]] as Array<[number, number]>).map(([x, z], i) =>
    P("PRP_Rubble_Masonry_A", x, z, i * 60, { id: `rubble_${i + 1}` }),
  ),
  ...JASMINE_Z.map((z, i) => P("PRP_Jasmine_Bush_A", -20.2, z, i * 70, { id: `jasmine_${i + 1}` })),
  // ---- south approach
  P("ENV_Notice_Board_A", 6.5, 52, -90, { id: "notice" }),
  P("ENV_Seating_Platform_A", 16, 68, -90, { id: "seating" }),
  P("ENV_Temple_Tank_Large_A", -42, 82, 0, { id: "kulam" }),
  P("PRP_Water_Point_A", -22, 64, 90, { id: "water_point" }),
  P("PRP_Water_Vessels_A", -21, 61.5, 90),
  ...([[-27, 76], [-27, 88], [-57, 70]] as Array<[number, number]>).map(([x, z], i) => P("PRP_Hibiscus_A", x, z, i * 90, { id: `hibiscus_${i + 1}` })),
  // ---- east bazaar and well square
  ...[58, 66, 98, 106].flatMap((x, i) => [P("ENV_Market_Stall_B", x, 2, 0, { id: `bazaar_stall_n${i}` })]),
  ...[60, 68, 100, 108].flatMap((x, i) => [P("ENV_Market_Stall_B", x, 18, 180, { id: `bazaar_stall_s${i}` })]),
  P("PRP_Display_Flowers_A", 58, 4.6, 0),
  P("PRP_Display_Produce_A", 66, 4.6, 0),
  P("PRP_Pottery_Display_A", 98, 4.8, 0),
  P("PRP_Cloth_Rolls_A", 106, 4.6, 0),
  P("PRP_Grain_Sacks_A", 60, 15.2, 180),
  P("PRP_Display_Produce_A", 68, 15.4, 180),
  P("PRP_Display_Flowers_A", 100, 15.4, 180),
  P("PRP_Balance_Scale_A", 108, 15.6, 180),
  P("PRP_Tally_Board_A", 108.8, 16.0, 180),
  P("PRP_Goods_Packed_A", 118, 3, 90),
  P("PRP_Shelf_Bamboo_A", 62, -0.5, 0),
  P("PRP_Well_A", 82, 4, 0, { id: "well" }),
  P("PRP_Water_Trough_A", 88, 16, 90),
  P("PRP_Water_Vessels_A", 78.5, 6.5, 30),
  P("PRP_Bench_Wood_A", 82, 15.5, 180, { id: "bench_well" }),
  P("ENV_House_Thatch_A", 62, -8, 0, { state: "restored" }),
  P("ENV_House_Thatch_A", 102, -8, 0, { state: "restored" }),
  P("ENV_House_Village_B", 82, -11, 0),
  P("PRP_Storage_Set_A", 74, -4, 0),
  // ---- granary (owned by Selvam, watched by Kannan at night), rain shelters, containers, lost items
  P("ENV_Granary_A", 118, -8, 0, { id: "granary" }),
  { asset: "PRP_Crate_A", pos: [118.9, 0.4, -7.4], rotY: 10, id: "granary_crate" },
  P("PRP_Crate_A", 55.2, 2.8, 15, { id: "raman_crate" }),
  P("PRP_Crate_A", -108, -30, 40, { id: "ruins_crate" }),
  P("PRP_Crate_A", 43.6, -58.2, 0, { id: "field_crate" }),
  P("PRP_Rain_Shelter_A", 88, -3, 0, { id: "shelter_bazaar" }),
  P("PRP_Rain_Shelter_A", 60, -55, 0, { id: "shelter_fields" }),
  P("PRP_Rain_Shelter_A", 12, 84, 90, { id: "shelter_road" }),
  { asset: "PRP_Bangle_A", pos: [-29.6, 0.09, 78], rotY: 0, id: "pickup_bangle" },
  P("PRP_Chisel_A", -66.5, -41.6, 30, { id: "pickup_chisel" }),
  P("PRP_Coin_Pouch_A", 64.5, 10.8, 0, { id: "pickup_pouch" }),
  // ---- east lane
  P("ENV_House_Village_A", 71, 34, 90),
  P("ENV_House_Thatch_A", 72, 48, 90, { state: "restored" }),
  P("ENV_House_Village_B", 71, 62, 90),
  P("ENV_House_Thatch_A", 89, 42, -90, { id: "weaver_house" }),
  P("ENV_House_Village_A", 89, 58, -90),
  P("ENV_House_Thatch_A", 89, 72, -90, { state: "restored" }),
  P("PRP_Laundry_Line_A", 76, 40, 90),
  P("PRP_Household_Set_A", 75.6, 56, 90),
  P("PRP_Storage_Set_A", 84.5, 66, -90),
  // ---- north fields and reservoir
  P("ENV_Field_Hut_A", 40, -60, 0, { id: "field_hut" }),
  ...[34, 38, 42, 46].map((x, i) => P("ENV_Garden_Plot_A", x, -66, 0, { id: `plot_${i + 1}` })),
  P("PRP_Garden_Tools_A", 48.5, -60, 90),
  P("ENV_Temple_Tank_Large_A", 82, -132, 0, { id: "reservoir" }),
  P("ENV_Sluice_Gate_A", 82, -117.2, 0, { id: "sluice" }),
  ...([[50, -72], [52, -84], [112, -70], [113, -92], [110, -108]] as Array<[number, number]>).map(([x, z], i) => P("PRP_Dry_Grass_A", x, z, i * 70, { id: `grass_${i + 1}` })),
  P("PRP_Marker_Stone_A", 114, -60, 200, { id: "marker" }),
  // ---- west ruins
  P("ENV_Gate_Brick_Ruin_A", -56, -26, 90),
  P("ENV_Wall_Brick_Ruin_A", -68, -40, 0, { id: "ruin_wall" }),
  P("ENV_Pillar_Ruin_A", -76, -38, 30, { id: "ruin_pillar" }),
  P("PRP_Carved_Fragment_A", -79, -35.5, 160, { id: "fragment" }),
  P("ENV_Path_Old_A", -86, -22, 90, { id: "old_path" }),
  P("ENV_Ruin_Mandapa_Base_A", -104, -20, 0),
  P("PRP_Manuscript_Box_A", -104, -15.5, 180, { id: "manuscript" }),
  P("ENV_Ruin_Pillar_Broken_A", -96, -30, 40),
  P("ENV_Ruin_Pillar_Broken_A", -114, -26, 110),
  P("ENV_Carved_Frieze_A", -113, -9, 30),
  P("PRP_Pottery_Shards_A", -110, -31, 0),
  P("PRP_Debris_Pile_A", -64, -30, 20),
  // ---- woodland
  ...([[-70, -72], [-84, -80], [-98, -68], [-110, -88]] as Array<[number, number]>).map(([x, z], i) => P("PRP_Timber_Pile_A", x, z, i * 47, { id: `timber_${i + 1}` })),
  // ---- festival dressing (shown once the festival is held)
  P("PRP_Kolam_Large_A", 0, 12, 0, { id: "fest_kolam_1" }),
  P("PRP_Kolam_Large_A", -7, 31, 30, { id: "fest_kolam_2" }),
  P("PRP_Kolam_Large_A", 7, 31, 60, { id: "fest_kolam_3" }),
  { asset: "PRP_Festival_Bunting_A", pos: [0, 4.4, 40], rotY: 0, id: "fest_bunting_1" },
  { asset: "PRP_Festival_Bunting_A", pos: [70, 4.0, 10], rotY: 90, id: "fest_bunting_2" },
  { asset: "PRP_Festival_Bunting_A", pos: [95, 4.0, 10], rotY: 90, id: "fest_bunting_3" },
  P("PRP_Festival_Lamp_Row_A", -8, 1.2, 0, { id: "fest_lamps_1" }),
  P("PRP_Festival_Lamp_Row_A", 8, 1.2, 0, { id: "fest_lamps_2" }),
  P("PRP_Festival_Lamp_Row_A", -10, 44, 0, { id: "fest_lamps_3" }),
  P("PRP_Festival_Lamp_Row_A", 10, 44, 0, { id: "fest_lamps_4" }),
  P("PRP_Brass_Lamp_Stand_A", -2.6, 1.4, 0, { id: "fest_stand_1" }),
  P("PRP_Brass_Lamp_Stand_A", 2.6, 1.4, 0, { id: "fest_stand_2" }),
  P("PRP_Banana_Arch_A", 0, 49.5, 0, { id: "fest_arch_1" }),
  P("PRP_Banana_Arch_A", 47.5, 10, 90, { id: "fest_arch_2" }),
  P("PRP_Banana_Arch_A", 22, -47.5, 0, { id: "fest_arch_3" }),
];

// ------------------------------------------------------------------ interactables (non-NPC)
type IP = InteractablePlacement;
const gather = (id: string, refId: string, label: string, locationId: string, pos: [number, number], radius: number, visualId?: string): IP => ({ id, kind: "gather", refId, label, locationId, pos: [pos[0], 0, pos[1]], radius, visualId });

export const INTERACTABLES: InteractablePlacement[] = [
  ...JASMINE_Z.map((z, i) => gather(`int_jasmine_${i + 1}`, `gn_jasmine_${i + 1}`, "jasmine bush", "loc_street", [-20.2, z], 1.9, `jasmine_${i + 1}`)),
  ...([[21.5, -25], [28.5, -25], [21.5, -18.5], [28.5, -18.5]] as Array<[number, number]>).map(([x, z], i) => gather(`int_marigold_${i + 1}`, `gn_marigold_${i + 1}`, "marigold bed", "loc_garden", [x, z], 2.4, `bed_${i + 1}`)),
  ...([[-27, 76], [-27, 88], [-57, 70]] as Array<[number, number]>).map(([x, z], i) => gather(`int_hibiscus_${i + 1}`, `gn_hibiscus_${i + 1}`, "hibiscus", "loc_kulam", [x, z], 2.0, `hibiscus_${i + 1}`)),
  ...([[-24, -30], [-21, -27.5], [-36, -33.5], [-36.5, -37.5], [-23, -35.5], [-28, -40.5], [-62, -48], [-72, -52], [-64, -10], [-74, -6]] as Array<[number, number]>).map(([x, z], i) =>
    gather(`int_stone_${i + 1}`, `gn_stone_${i + 1}`, "fallen masonry", i < 6 ? "loc_forgotten" : "loc_ruins", [x, z], 1.9, `rubble_${i + 1}`),
  ),
  gather("int_clay_1", "gn_clay_1", "clay bank", "loc_claypit", [15.5, -34.2], 2.2, "claybank"),
  gather("int_clay_2", "gn_clay_2", "clay bank", "loc_claypit", [14.2, -34.4], 2.2),
  ...([[-70, -72], [-84, -80], [-98, -68], [-110, -88]] as Array<[number, number]>).map(([x, z], i) => gather(`int_timber_${i + 1}`, `gn_timber_${i + 1}`, "log pile", "loc_woods", [x, z + 1.0], 2.0, `timber_${i + 1}`)),
  ...([[50, -72], [52, -84], [112, -70], [113, -92], [110, -108]] as Array<[number, number]>).map(([x, z], i) => gather(`int_grass_${i + 1}`, `gn_grass_${i + 1}`, "dry grass", "loc_fields", [x, z], 1.8, `grass_${i + 1}`)),
  { id: "int_bench", kind: "station", refId: "st_workshop_bench", label: "Velan's workbench", locationId: "loc_workshop", pos: [25.5, 0.15, 8], radius: 1.8 },
  { id: "int_festival_station", kind: "station", refId: "st_festival_station", label: "the festival table", locationId: "loc_courtyard", pos: [8.0, 0, 14], radius: 1.8 },
  { id: "int_channel_east", kind: "restoration", refId: "rest_channel_east", label: "the garden channel", locationId: "loc_garden", pos: [24.9, 0, -28.6], radius: 2.4 },
  { id: "int_well", kind: "restoration", refId: "rest_well", label: "the well", locationId: "loc_well", pos: [80.4, 0, 6.0], radius: 2.0 },
  { id: "int_sluice", kind: "restoration", refId: "rest_sluice", label: "the sluice gate", locationId: "loc_reservoir", pos: [82, 0, -115.6], radius: 2.4 },
  { id: "int_ruin_wall", kind: "restoration", refId: "rest_ruin_wall", label: "the old brick wall", locationId: "loc_ruins", pos: [-68, 0, -38.5], radius: 2.6 },
  { id: "int_ruin_pillar", kind: "restoration", refId: "rest_ruin_pillar", label: "the fallen pillar", locationId: "loc_ruins", pos: [-76.5, 0, -36.2], radius: 2.2 },
  { id: "int_old_path", kind: "restoration", refId: "rest_old_path", label: "the overgrown path", locationId: "loc_ruins", pos: [-81.2, 0, -22], radius: 2.4 },
  { id: "int_weaver_house", kind: "restoration", refId: "rest_weaver_house", label: "the weaver's house", locationId: "loc_lane", pos: [84.6, 0, 42], radius: 2.6 },
  { id: "int_inscription", kind: "discovery", refId: "disc_channel_inscription", label: "the inscribed stone", locationId: "loc_forgotten", pos: [-33, 0, -23.6], radius: 2.0 },
  { id: "int_fragment", kind: "discovery", refId: "disc_carved_fragment", label: "the carved block", locationId: "loc_ruins", pos: [-78.6, 0, -34.4], radius: 2.0 },
  { id: "int_manuscript", kind: "discovery", refId: "disc_palm_manuscript", label: "the sealed case", locationId: "loc_ruins", pos: [-104, 0, -14.4], radius: 2.0 },
  { id: "int_marker", kind: "discovery", refId: "disc_marker_stone", label: "the boundary stone", locationId: "loc_fields", pos: [113.6, 0, -58.8], radius: 2.0 },
  { id: "int_rest", kind: "rest", refId: "home", label: "your cot", locationId: "loc_home", pos: [-27.2, 0.45, 26.5], radius: 1.4, socket: "house_player.SOCKET_Bed" },
  { id: "int_ct_granary", kind: "container", refId: "ct_granary_crate", label: "crate", locationId: "loc_bazaar", pos: [118.9, 0.4, -6.8], radius: 1.4 },
  { id: "int_ct_raman", kind: "container", refId: "ct_raman_crate", label: "crate", locationId: "loc_bazaar", pos: [55.2, 0, 3.4], radius: 1.4 },
  { id: "int_ct_ruins", kind: "container", refId: "ct_ruins_crate", label: "crate", locationId: "loc_ruins", pos: [-108, 0, -29.3], radius: 1.4 },
  { id: "int_ct_field", kind: "container", refId: "ct_field_crate", label: "crate", locationId: "loc_fields", pos: [43.6, 0, -57.5], radius: 1.4 },
  { id: "int_pk_bangle", kind: "pickup", refId: "pk_bangle", label: "bangle", locationId: "loc_kulam", pos: [-29.6, 0.09, 78], radius: 1.4, visualId: "pickup_bangle" },
  { id: "int_pk_chisel", kind: "pickup", refId: "pk_chisel", label: "chisel", locationId: "loc_ruins", pos: [-66.5, 0, -41.6], radius: 1.4, visualId: "pickup_chisel" },
  { id: "int_pk_pouch", kind: "pickup", refId: "pk_pouch", label: "pouch", locationId: "loc_bazaar", pos: [64.5, 0, 10.8], radius: 1.4, visualId: "pickup_pouch" },
  { id: "int_home_chest", kind: "storage", refId: "home_chest", label: "your chest", locationId: "loc_home", pos: [-21.6, 0.6, 30.3], radius: 1.4 },
  { id: "int_home_decor", kind: "decor", refId: "home", label: "your house", locationId: "loc_home", pos: [-20.4, 0, 28.0], radius: 1.4 },
  { id: "int_notice", kind: "notice", refId: "board", label: "the notice board", locationId: "loc_approach", pos: [5.2, 0, 52], radius: 2.2 },
  { id: "int_water_tank", kind: "water", refId: "ws_tank", label: "the garden tank", locationId: "loc_garden", pos: [36.4, 0, -24.4], radius: 2.0 },
  { id: "int_water_point", kind: "water", refId: "ws_water_point", label: "the water point", locationId: "loc_approach", pos: [-20.6, 0, 64], radius: 2.0 },
  { id: "int_water_well", kind: "water", refId: "ws_well", label: "the well", locationId: "loc_well", pos: [83.8, 0, 6.0], radius: 1.8 },
  ...[34, 38, 42, 46].map((x, i): IP => ({ id: `int_plot_${i + 1}`, kind: "plot", refId: `plot_${i + 1}`, label: "your plot", locationId: "loc_fields", pos: [x, 0, -64.6], radius: 1.6 })),
  { id: "int_sit_courtyard", kind: "sit", refId: "bench_courtyard", label: "bench", locationId: "loc_courtyard", pos: [-12.2, 0, 36], radius: 1.5, faceY: 90 },
  { id: "int_sit_courtyard_back", kind: "sit", refId: "bench_courtyard_back", label: "bench", locationId: "loc_courtyard", pos: [-11.95, 0, 32], radius: 1.5, faceY: 90 },
  { id: "int_sit_well", kind: "sit", refId: "bench_well", label: "bench", locationId: "loc_well", pos: [82, 0, 15.2], radius: 1.5, faceY: 180 },
];

// ------------------------------------------------------------------ NPC anchors and navigation
const fest: Record<string, { pos: [number, number, number]; faceY: number }> = {};
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const r = 4.2 + (i % 2) * 1.6;
  fest[`anc_fest_${i + 1}`] = { pos: [Math.cos(a) * r, 0, 12 + Math.sin(a) * r], faceY: (Math.atan2(-Math.cos(a), -Math.sin(a)) * 180) / Math.PI };
}

export const ANCHORS: Record<string, { pos: [number, number, number]; faceY: number }> = {
  anc_courtyard_gate: { pos: [3.5, 0, 39], faceY: 200 },
  anc_valli_home: { pos: [-21.0, 0, 18], faceY: 90 },
  anc_garden: { pos: [25, 0, -21.7], faceY: 180 },
  anc_amudha_rest: { pos: [-5.0, 0, 22.5], faceY: 120 },
  anc_field_hut: { pos: [40, 0.2, -61.2], faceY: 180 },
  anc_field_hut_rest: { pos: [38.4, 0.2, -59.2], faceY: 160 },
  anc_workshop: { pos: [27.6, 0.15, 7.3], faceY: -90 },
  anc_market: { pos: [19.4, 0, 30], faceY: -90 },
  anc_ponnan_veranda: { pos: [-22.4, 0.45, 10.1], faceY: 90 },
  anc_forgotten_edge: { pos: [-19.5, 0, -22.5], faceY: 210 },
  anc_seating: { pos: [16.6, 0.5, 68], faceY: -90 },
  anc_weaver: { pos: [85.4, 0.35, 43.6], faceY: -90 },
  anc_bazaar_1: { pos: [58, 0, 0.7], faceY: 0 },
  anc_bazaar_2: { pos: [68, 0, 19.3], faceY: 180 },
  anc_bazaar_3: { pos: [100, 0, 19.3], faceY: 180 },
  anc_bazaar_4: { pos: [98, 0, 0.7], faceY: 0 },
  anc_well_side: { pos: [79, 0, 8.2], faceY: 140 },
  anc_lane_home_1: { pos: [75.6, 0, 34], faceY: 90 },
  anc_lane_home_2: { pos: [75.6, 0, 62], faceY: 90 },
  anc_lane_home_3: { pos: [84.4, 0, 58], faceY: -90 },
  anc_laundry: { pos: [77.4, 0, 41.5], faceY: -90 },
  anc_paddy: { pos: [78, 0, -78], faceY: 270 },
  anc_kulam: { pos: [-28, 0, 74], faceY: 250 },
  anc_road: { pos: [4.5, 0, 75], faceY: 270 },
  anc_woods: { pos: [-80, 0, -72], faceY: 30 },
  anc_granary: { pos: [119.6, 0, -3.6], faceY: 0 },
  anc_shelter_bazaar: { pos: [88, 0, -2.4], faceY: 0 },
  anc_shelter_fields: { pos: [60, 0, -54.4], faceY: 0 },
  anc_shelter_road: { pos: [12.6, 0, 84], faceY: 90 },
  anc_workshop_cover: { pos: [26.2, 0.15, 10.6], faceY: -90 },
  anc_courtyard_cover: { pos: [2.2, 1.5, -9.4], faceY: 0 },
  anc_well_queue: { pos: [80.2, 0, 7.6], faceY: 120 },
  anc_road_south: { pos: [-1.5, 0, 128], faceY: 0 },
  anc_road_north: { pos: [1.5, 0, 60], faceY: 180 },
  anc_logs: { pos: [-96, 0, -67], faceY: 200 },
  anc_paddy_2: { pos: [100, 0, -95], faceY: 90 },
  ...fest,
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
  garden_w: [14, -22],
  claypass: [12.6, -40],
  north_in: [22, -43],
  north_out: [22, -54],
  hut: [38, -56],
  fields_c: [78, -60],
  paddy: [78, -80],
  sluice: [78, -114],
  workshop: [21, 8],
  market: [16, 30],
  east_in: [40, 10],
  east_out: [52, 10],
  bazaar_w: [64, 10],
  well: [82, 10],
  bazaar_e: [112, 10],
  lane_n: [80, 24],
  lane_m: [80, 48],
  lane_s: [80, 70],
  south_out: [0, 52],
  road_mid: [0, 75],
  kulam: [-24, 74],
  west_in: [-40, -26],
  west_out: [-52, -26],
  ruins_c: [-66, -28],
  ruins_e: [-80, -22],
  woods: [-76, -66],
  bazaar_far: [122, 10],
  granary: [118, -2],
  road_far: [0, 128],
};

export const NAV_EDGES: Array<[string, string]> = [
  ["gate", "court"], ["court", "court_e"], ["court", "court_w"], ["court_w", "street_s"], ["court_w", "street_n"],
  ["street_n", "temple_w"], ["temple_w", "forgotten"], ["court_e", "workshop"], ["court_e", "market"], ["workshop", "east_n"],
  ["east_n", "garden_gate"], ["garden_gate", "garden"], ["gate", "market"], ["street_s", "gate"],
  ["east_n", "garden_w"], ["garden_w", "claypass"], ["claypass", "north_in"], ["north_in", "north_out"], ["north_out", "hut"], ["hut", "fields_c"],
  ["fields_c", "paddy"], ["paddy", "sluice"],
  ["court_e", "east_in"], ["workshop", "east_in"], ["east_in", "east_out"], ["east_out", "bazaar_w"], ["bazaar_w", "well"], ["well", "bazaar_e"],
  ["well", "lane_n"], ["lane_n", "lane_m"], ["lane_m", "lane_s"],
  ["gate", "south_out"], ["south_out", "road_mid"], ["road_mid", "kulam"],
  ["forgotten", "west_in"], ["west_in", "west_out"], ["west_out", "ruins_c"], ["ruins_c", "ruins_e"], ["ruins_c", "woods"],
  ["bazaar_e", "bazaar_far"], ["bazaar_far", "granary"], ["road_mid", "road_far"],
];

/** State -> visual rules. See WorldView. */
export type VisualBinding =
  | { placementId: string; restorationId: string; visibleInState?: string }
  | { placementId: string; flag: string }
  | { placementId: string; plotId: string }
  | { placementId: string; decorSlot: string }
  | { placementId: string; pickupId: string };

export const VISUAL_BINDINGS: VisualBinding[] = [
  { placementId: "channel_blocked", restorationId: "rest_channel_east", visibleInState: "blocked" },
  { placementId: "channel_restored", restorationId: "rest_channel_east", visibleInState: "flowing" },
  ...[1, 2, 3, 4].map((i) => ({ placementId: `bed_${i}`, restorationId: "rest_garden_main" })),
  { placementId: "gate_garland", flag: "gate_garland_hung" },
  { placementId: "well", restorationId: "rest_well" },
  { placementId: "sluice", restorationId: "rest_sluice" },
  ...Array.from({ length: 14 }, (_, k) => ({ placementId: `field_channel_${k}`, restorationId: "rest_fields" })),
  ...Array.from({ length: 20 }, (_, k) => ({ placementId: `paddy_${k + 1}`, restorationId: "rest_fields" })),
  { placementId: "ruin_wall", restorationId: "rest_ruin_wall" },
  { placementId: "ruin_pillar", restorationId: "rest_ruin_pillar" },
  { placementId: "fragment", restorationId: "rest_ruin_pillar", visibleInState: "standing" },
  { placementId: "old_path", restorationId: "rest_old_path" },
  { placementId: "weaver_house", restorationId: "rest_weaver_house" },
  ...[1, 2, 3, 4].map((i) => ({ placementId: `plot_${i}`, plotId: `plot_${i}` })),
  ...["pickup_bangle", "pickup_chisel", "pickup_pouch"].map((p) => ({ placementId: p, pickupId: `pk_${p.slice(7)}` })),
  ...["decor_doorway", "decor_doorstep", "decor_lamp", "decor_mat", "decor_plant"].map((s) => ({ placementId: s, decorSlot: s })),
  ...["fest_kolam_1", "fest_kolam_2", "fest_kolam_3", "fest_bunting_1", "fest_bunting_2", "fest_bunting_3", "fest_lamps_1", "fest_lamps_2", "fest_lamps_3", "fest_lamps_4", "fest_stand_1", "fest_stand_2", "fest_arch_1", "fest_arch_2", "fest_arch_3"].map(
    (p) => ({ placementId: p, flag: "festival_held" }),
  ),
];

export const REGIONS: Region[] = [
  { id: "loc_entrance", min: [-8, 36], max: [8, 50] },
  { id: "loc_market", min: [14, 24], max: [26, 36] },
  { id: "loc_workshop", min: [20, 2], max: [32, 16] },
  { id: "loc_garden", min: [14, -32], max: [40, -14] },
  { id: "loc_claypit", min: [10, -42], max: [20, -31] },
  { id: "loc_forgotten", min: [-46, -46], max: [-16, -22] },
  { id: "loc_home", min: [-30, 24], max: [-20, 33] },
  { id: "loc_street", min: [-32, -6], max: [-16, 36] },
  { id: "loc_temple", min: [-12, -32], max: [12, 0] },
  { id: "loc_courtyard", min: [-16, 0], max: [16, 36] },
  { id: "loc_kulam", min: [-70, 56], max: [-14, 108] },
  { id: "loc_approach", min: [-14, 46], max: [40, 150] },
  { id: "loc_well", min: [72, -2], max: [92, 20] },
  { id: "loc_lane", min: [64, 22], max: [96, 82] },
  { id: "loc_bazaar", min: [46, -16], max: [140, 30] },
  { id: "loc_reservoir", min: [60, -150], max: [104, -114] },
  { id: "loc_fields", min: [26, -150], max: [140, -46] },
  { id: "loc_ruins", min: [-150, -60], max: [-46, 20] },
  { id: "loc_woods", min: [-150, -150], max: [-46, -60] },
];

export const PLAYER_SPAWN: { pos: [number, number, number]; yaw: number } = { pos: [0, 0, 55], yaw: Math.PI };
export const WORLD_BOUNDS = 150;
