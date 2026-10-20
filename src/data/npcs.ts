import type { NpcDefinition } from "../game/core/types";

// Names are fictional Tamil names; roles are functional (see docs/CHARACTER_BIBLE.md).
export const NPCS: NpcDefinition[] = [
  {
    id: "npc_valli",
    name: "Valli",
    role: "Resident",
    appearance: { model: "CHR_NPC_Valli", tint: "#b8452f", accent: "#e0b44c" },
    homeAnchorId: "anc_valli_home",
    workAnchorId: "anc_courtyard_gate",
    schedule: [
      { fromHour: 6, toHour: 19, anchorId: "anc_courtyard_gate", activity: "talk" },
      { fromHour: 19, toHour: 30, anchorId: "anc_valli_home", activity: "home" },
    ],
  },
  {
    id: "npc_murugan",
    name: "Murugan",
    role: "Gardener",
    appearance: { model: "CHR_NPC_Murugan", tint: "#e9e1cc", accent: "#5f7d3a" },
    homeAnchorId: "anc_murugan_rest",
    workAnchorId: "anc_garden",
    schedule: [
      { fromHour: 6, toHour: 12, anchorId: "anc_garden", activity: "work" },
      { fromHour: 12, toHour: 14, anchorId: "anc_murugan_rest", activity: "rest" },
      { fromHour: 14, toHour: 19, anchorId: "anc_garden", activity: "work" },
      { fromHour: 19, toHour: 30, anchorId: "anc_murugan_rest", activity: "home" },
    ],
  },
  {
    id: "npc_kamala",
    name: "Kamala",
    role: "Artisan",
    appearance: { model: "CHR_NPC_Kamala", tint: "#2f5f73", accent: "#c98a3a" },
    homeAnchorId: "anc_workshop",
    workAnchorId: "anc_workshop",
    schedule: [{ fromHour: 0, toHour: 24, anchorId: "anc_workshop", activity: "work" }],
  },
  {
    id: "npc_selvam",
    name: "Selvam",
    role: "Trader",
    appearance: { model: "CHR_NPC_Selvam", tint: "#d6c49a", accent: "#7a3b2e" },
    homeAnchorId: "anc_market",
    workAnchorId: "anc_market",
    schedule: [{ fromHour: 0, toHour: 24, anchorId: "anc_market", activity: "work" }],
  },
  {
    id: "npc_ponnan",
    name: "Elder Ponnan",
    role: "Elder and keeper of stories",
    appearance: { model: "CHR_NPC_Ponnan", tint: "#efe8d8", accent: "#8c7a5b" },
    homeAnchorId: "anc_ponnan_veranda",
    workAnchorId: "anc_ponnan_veranda",
    schedule: [
      { fromHour: 6, toHour: 10, anchorId: "anc_ponnan_veranda", activity: "rest" },
      { fromHour: 10, toHour: 16, anchorId: "anc_forgotten_edge", activity: "work" },
      { fromHour: 16, toHour: 30, anchorId: "anc_ponnan_veranda", activity: "rest" },
    ],
  },
];
