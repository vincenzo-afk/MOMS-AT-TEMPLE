/**
 * Temple Visit content and layouts (GAME_DESIGN.md "Moms at Temples"). World positions are in metres in the
 * settlement map; each temple lists its stations. Props are built at run time and disabled afterwards, so
 * story mode never sees them.
 */

export interface VisitProp {
  key: string;
  asset: string;
  pos: [number, number, number];
  rotY: number; // degrees
}

export interface TempleLayout {
  templeId: string;
  /** where the family's auto waits outside the house, and the gate the parking distance is measured to */
  auto: { pos: [number, number, number]; rotY: number };
  gate: [number, number, number];
  /** crossing into the temple ground: a plane z < gateLine (main temple) or a radius around the shrine */
  enclosure: { kind: "line"; z: number; xMin: number; xMax: number } | { kind: "radius"; center: [number, number]; r: number };
  props: VisitProp[];
  /** bushes where chappals can be hidden (prop keys) */
  bushes: string[];
  chappalStand: string;
  sideGate: { pos: [number, number, number]; guardNpc: string } | null;
  /** queue: rails prop key; lanes present at this temple */
  queue: string;
  coconut: string;
  lamps: string;
  priest: [number, number, number];
  darshan: [number, number, number];
  /** the sanctum the family walks around clockwise (pradakshina) */
  pradakshina: { center: [number, number]; rx: number; rz: number };
  prasadam: string;
  annadanam: string;
  gossip: [number, number, number];
  photo: [number, number, number];
  /** the hill temple's climb (foot and top sockets of the hill prop) */
  steps?: { prop: string };
}

const P = (key: string, asset: string, x: number, z: number, rotY = 0, y = 0): VisitProp => ({ key, asset, pos: [x, y, z], rotY });

export const LAYOUTS: Record<string, TempleLayout> = {
  city: {
    templeId: "city",
    auto: { pos: [-20.5, 0, 33], rotY: 0 },
    gate: [0, 0, 50],
    enclosure: { kind: "line", z: 48.5, xMin: -14, xMax: 14 },
    props: [
      P("auto", "PRP_Auto_Rickshaw_A", -20.5, 33, 0),
      P("stand", "PRP_Chappal_Stand_A", 9, 57, -90),
      P("bush1", "PRP_Bush_Hide_A", -8, 58),
      P("bush2", "PRP_Bush_Hide_A", -11.5, 61),
      P("bush3", "PRP_Bush_Hide_A", 13.5, 63),
      P("rails", "PRP_Queue_Rails_A", 0, 31.5, 180),
      P("coconut", "PRP_Coconut_Stone_A", -5.5, 8.5, 180),
      P("lamps", "PRP_Lamp_Stand_A", 5.5, 8.5, 180),
      P("prasadam", "PRP_Prasadam_Counter_A", 9, 44, 180),
      P("annadanam", "PRP_Annadanam_Mats_A", -12, 41, 0),
      P("calendar", "PRP_Calendar_A", -26.9, 26.4, 90, 1.5),
      P("bag", "PRP_Temple_Bag_A", -27.4, 29.6, 90, 0.6),
    ],
    bushes: ["bush1", "bush2", "bush3"],
    chappalStand: "stand",
    sideGate: { pos: [-13, 0, 50.5], guardNpc: "npc_kaaval" },
    queue: "rails",
    coconut: "coconut",
    lamps: "lamps",
    priest: [2.4, 0, -3.4],
    darshan: [0, 0, -3.2],
    pradakshina: { center: [0, -14.5], rx: 11, rz: 14.3 },
    prasadam: "prasadam",
    annadanam: "annadanam",
    gossip: [-5.5, 0, 45],
    photo: [0, 0, 60],
  },
  neighbourhood: {
    templeId: "neighbourhood",
    auto: { pos: [-20.5, 0, 33], rotY: 0 },
    gate: [-106, 0, 8],
    enclosure: { kind: "radius", center: [-106, 8], r: 9 },
    props: [
      P("auto", "PRP_Auto_Rickshaw_A", -20.5, 33, 0),
      P("shrine", "ENV_Shrine_Small_A", -106, 8, 90),
      P("stand", "PRP_Chappal_Stand_A", -94, 16, 180),
      P("bush1", "PRP_Bush_Hide_A", -93, 2),
      P("bush2", "PRP_Bush_Hide_A", -96, -2),
      P("bush3", "PRP_Bush_Hide_A", -92, 12),
      P("rails", "PRP_Queue_Rails_A", -88.5, 8, 90),
      P("coconut", "PRP_Coconut_Stone_A", -103, 13, -90),
      P("lamps", "PRP_Lamp_Stand_A", -103, 3, -90),
      P("prasadam", "PRP_Prasadam_Counter_A", -96, 22, 180),
      P("annadanam", "PRP_Annadanam_Mats_A", -110, 22, 0),
      P("calendar", "PRP_Calendar_A", -26.9, 26.4, 90, 1.5),
      P("bag", "PRP_Temple_Bag_A", -27.4, 29.6, 90, 0.6),
    ],
    bushes: ["bush1", "bush2", "bush3"],
    chappalStand: "stand",
    sideGate: null,
    queue: "rails",
    coconut: "coconut",
    lamps: "lamps",
    priest: [-102.5, 0, 9.8],
    darshan: [-102.8, 0, 8],
    pradakshina: { center: [-105.5, 8], rx: 4.3, rz: 4.3 },
    prasadam: "prasadam",
    annadanam: "annadanam",
    gossip: [-92, 0, 20],
    photo: [-96, 0, 8],
  },
  hill: {
    templeId: "hill",
    auto: { pos: [-20.5, 0, 33], rotY: 0 },
    gate: [-112, 0, 50],
    enclosure: { kind: "radius", center: [-128, 50], r: 15 },
    props: [
      P("auto", "PRP_Auto_Rickshaw_A", -20.5, 33, 0),
      P("hill", "ENV_Hill_Temple_A", -128, 50, 90),
      P("stand", "PRP_Chappal_Stand_A", -104, 58, 180),
      P("bush1", "PRP_Bush_Hide_A", -103, 42),
      P("bush2", "PRP_Bush_Hide_A", -100, 38),
      P("bush3", "PRP_Bush_Hide_A", -99, 62),
      P("rails", "PRP_Queue_Rails_A", -95.5, 50, 90),
      P("coconut", "PRP_Coconut_Stone_A", -127.5, 47, -90, 6),
      P("lamps", "PRP_Lamp_Stand_A", -127.5, 53, -90, 6),
      P("prasadam", "PRP_Prasadam_Counter_A", -104, 66, 180),
      P("annadanam", "PRP_Annadanam_Mats_A", -108, 34, 0),
      P("calendar", "PRP_Calendar_A", -26.9, 26.4, 90, 1.5),
      P("bag", "PRP_Temple_Bag_A", -27.4, 29.6, 90, 0.6),
    ],
    bushes: ["bush1", "bush2", "bush3"],
    chappalStand: "stand",
    sideGate: null,
    queue: "rails",
    coconut: "coconut",
    lamps: "lamps",
    priest: [-131.5, 6, 47.6],
    darshan: [-131, 6, 50],
    pradakshina: { center: [-134.5, 50], rx: 2.6, rz: 2.6 },
    prasadam: "prasadam",
    annadanam: "annadanam",
    gossip: [-100, 0, 46],
    photo: [-112, 0, 56],
    steps: { prop: "hill" },
  },
};

// --------------------------------------------------------------------------- mini-game content
export const BAG_ITEMS: Array<{ id: string; label: string; needed: boolean }> = [
  { id: "flowers", label: "Flowers", needed: true },
  { id: "coconut", label: "Coconut", needed: true },
  { id: "kumkum", label: "Kumkum box", needed: true },
  { id: "pins", label: "Safety pins", needed: true },
  { id: "spare_chappals", label: "Spare chappals", needed: true },
  { id: "remote", label: "TV remote", needed: false },
  { id: "ladle", label: "Kitchen ladle", needed: false },
  { id: "homework", label: "Son's homework", needed: false },
];

export const TITHIS = ["Pournami", "Sashti", "Pradosham", "Ekadasi", "Amavasai"];

/** Sloka quiz: the presiding deity of each temple and the sloka that belongs to it. */
export const SLOKAS: Record<string, { deity: string; right: string; wrong: string[] }> = {
  city: { deity: "Shiva", right: "Om Namah Shivaya", wrong: ["Om Namo Narayanaya", "Om Saravanabhava", "Om Gam Ganapataye Namaha"] },
  neighbourhood: { deity: "Ganesha", right: "Om Gam Ganapataye Namaha", wrong: ["Om Namah Shivaya", "Om Saravanabhava", "Om Namo Narayanaya"] },
  hill: { deity: "Murugan", right: "Om Saravanabhava", wrong: ["Om Gam Ganapataye Namaha", "Om Namo Narayanaya", "Om Namah Shivaya"] },
};

export const NAKSHATRAS = ["Ashwini", "Rohini", "Thiruvathirai", "Punarpoosam", "Uthiram", "Chithirai", "Visakam", "Anusham"];
export const GOTRAS = ["Bharadwaja", "Kashyapa", "Vasishta", "Atreya", "Gautama"];

export const FAMILY = [
  { id: "husband", name: "Ravi", model: "CHR_Family_Husband", abroad: false },
  { id: "son", name: "Karthik", model: "CHR_Child_Boy", abroad: false },
  { id: "daughter", name: "Priya", model: "CHR_Child_Girl", abroad: false },
];
/** Prayed for by name at the darshan, including the one abroad. */
export const PRAYER_NAMES = ["Ravi", "Karthik", "Priya", "Amma and Appa", "Anand (in Dubai)"];

export const GOSSIP: Array<{ them: string; good: string; bad: string }> = [
  { them: "Did you hear? Saroja's daughter got into engineering!", good: "Which college? Tell me everything.", bad: "Hmm. Okay." },
  { them: "And her mother-in-law is visiting for TWO months.", good: "Two months?! Poor Saroja.", bad: "That's nice for them." },
  { them: "Shh, I'll tell you about the wedding next week.", good: "Same time, same temple. Promise!", bad: "I have to go now." },
];

/** Every model a visit to this temple needs (loaded when the visit starts, not at boot). */
export function visitAssetIds(templeId: string): string[] {
  const layout = LAYOUTS[templeId] ?? LAYOUTS.city!;
  return [...new Set([...layout.props.map((p) => p.asset), "CHR_Player_Mom", "CHR_NPC_Priest", "CHR_Villager_A", "CHR_Villager_B", "CHR_Villager_C", ...FAMILY.map((f) => f.model)])];
}
