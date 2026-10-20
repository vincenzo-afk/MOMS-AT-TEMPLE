import type { QuestDefinition } from "../game/core/types";

export const QUESTS: QuestDefinition[] = [
  {
    id: "q_arrival",
    title: "A Welcome of Jasmine",
    description: "Valli has asked you to gather jasmine from the bushes along the residential street.",
    giverNpcId: "npc_valli",
    prerequisites: [],
    objectives: [
      { id: "gather", type: "collect", text: "Gather jasmine flowers", targetId: "jasmine_flower", requiredCount: 3, locationId: "loc_street" },
      { id: "return", type: "deliver", text: "Bring the jasmine to Valli", targetId: "jasmine_flower", requiredCount: 3, locationId: "loc_courtyard" },
    ],
    rewards: [
      { type: "coins", amount: 5 },
      { type: "relationship", npcId: "npc_valli", amount: 10 },
    ],
    record: { type: "arrival", descriptionKey: "rec_arrival", locationId: "loc_courtyard", causeEventIds: [] },
  },
  {
    id: "q_channel",
    title: "The Silent Channel",
    description: "The garden is dying because the old irrigation channel is blocked. Murugan needs it repaired.",
    giverNpcId: "npc_murugan",
    prerequisites: ["q_arrival"],
    objectives: [
      { id: "inspect", type: "inspect", text: "Inspect the blocked channel", targetId: "int_channel_east", locationId: "loc_garden" },
      { id: "ask_kamala", type: "talk", text: "Ask Kamala how to make mortar", targetId: "npc_kamala", locationId: "loc_workshop" },
      { id: "stones", type: "collect", text: "Salvage dressed stones from the old grounds", targetId: "channel_stone", requiredCount: 4, locationId: "loc_forgotten" },
      { id: "clay", type: "collect", text: "Dig lime clay past the west end of the channel", targetId: "lime_clay", requiredCount: 2, locationId: "loc_claypit" },
      { id: "mortar", type: "craft", text: "Make lime mortar at the workshop bench", targetId: "lime_mortar", requiredCount: 1, locationId: "loc_workshop" },
      { id: "repair", type: "restore", text: "Repair the channel", targetId: "rest_channel_east", targetState: "flowing", locationId: "loc_garden" },
      { id: "report", type: "talk", text: "Tell Murugan the water is flowing", targetId: "npc_murugan", locationId: "loc_garden" },
    ],
    rewards: [
      { type: "coins", amount: 8 },
      { type: "relationship", npcId: "npc_murugan", amount: 15 },
    ],
  },
  {
    id: "q_garland",
    title: "Garland for the Gate",
    description: "With the garden blooming again, Valli wants the courtyard gate dressed with a fresh garland.",
    giverNpcId: "npc_murugan",
    prerequisites: ["q_channel"],
    objectives: [
      { id: "learn", type: "talk", text: "Ask Kamala to teach you garland-stringing", targetId: "npc_kamala", locationId: "loc_workshop" },
      { id: "marigold", type: "collect", text: "Pick marigolds in the garden", targetId: "marigold_flower", requiredCount: 4, locationId: "loc_garden" },
      { id: "jasmine", type: "collect", text: "Gather jasmine", targetId: "jasmine_flower", requiredCount: 2, locationId: "loc_street" },
      { id: "twine", type: "collect", text: "Buy banana-fibre twine from Selvam", targetId: "banana_twine", requiredCount: 1, locationId: "loc_market" },
      { id: "craft", type: "craft", text: "String the garland at the workshop", targetId: "flower_garland", requiredCount: 1, locationId: "loc_workshop" },
      { id: "deliver", type: "deliver", text: "Give the garland to Valli", targetId: "flower_garland", requiredCount: 1, locationId: "loc_courtyard" },
    ],
    rewards: [
      { type: "coins", amount: 6 },
      { type: "relationship", npcId: "npc_valli", amount: 10 },
      { type: "relationship", npcId: "npc_kamala", amount: 10 },
      { type: "flag", id: "gate_garland_hung" },
    ],
    record: { type: "community", descriptionKey: "rec_garland", locationId: "loc_entrance", causeEventIds: ["consequence:rest_garden_main"] },
  },
  {
    id: "q_inscription",
    title: "Words in Old Stone",
    description: "Elder Ponnan remembers a carved stone in the overgrown grounds that nobody has read in years.",
    giverNpcId: "npc_ponnan",
    prerequisites: [],
    objectives: [
      { id: "find", type: "inspect", text: "Find and read the inscribed stone", targetId: "int_inscription", locationId: "loc_forgotten" },
      { id: "report", type: "talk", text: "Tell Elder Ponnan what the stone says", targetId: "npc_ponnan", locationId: "loc_street" },
    ],
    rewards: [
      { type: "relationship", npcId: "npc_ponnan", amount: 15 },
      { type: "coins", amount: 3 },
    ],
  },
];
