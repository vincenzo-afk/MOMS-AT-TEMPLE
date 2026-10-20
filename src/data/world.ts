import type { BarkDefinition, ContainerDefinition, DoorDefinition, PickupDefinition, TopicDefinition } from "../game/core/types";

// ------------------------------------------------------------------ doors
export const DOORS: DoorDefinition[] = [
  { id: "door_home", placementId: "house_player", node: "Main", label: "your door" },
  {
    id: "door_granary",
    placementId: "granary",
    node: "Main",
    label: "the granary door",
    lockedWhen: [{ type: "hour", from: 19, to: 6 }, { type: "flag", id: "granary_key", value: false }],
    lockedReason: "Barred for the night. Kannan the watchman keeps the granary after dark.",
  },
];

// ------------------------------------------------------------------ containers
export const CONTAINERS: ContainerDefinition[] = [
  { id: "ct_granary_crate", placementId: "granary_crate", label: "Selvam's crate", ownerNpcId: "npc_selvam", slots: 8, locationId: "loc_bazaar",
    initial: [{ itemId: "rope", quantity: 2 }, { itemId: "seed_packet", quantity: 3 }, { itemId: "banana_twine", quantity: 2 }] },
  { id: "ct_raman_crate", placementId: "raman_crate", label: "Raman's crate", ownerNpcId: "npc_villager_raman", slots: 6, locationId: "loc_bazaar",
    initial: [{ itemId: "produce", quantity: 3 }, { itemId: "jasmine_flower", quantity: 4 }] },
  { id: "ct_home_shelf", placementId: "house_player", label: "your shelf", ownerNpcId: null, slots: 10, locationId: "loc_home", initial: [] },
  { id: "ct_ruins_crate", placementId: "ruins_crate", label: "an abandoned crate", ownerNpcId: null, slots: 6, locationId: "loc_ruins",
    initial: [{ itemId: "timber", quantity: 2 }, { itemId: "rope", quantity: 1 }, { itemId: "kolam_powder", quantity: 1 }] },
  { id: "ct_field_crate", placementId: "field_crate", label: "the field hut crate", ownerNpcId: null, slots: 6, locationId: "loc_fields",
    initial: [{ itemId: "seed_packet", quantity: 1 }, { itemId: "banana_twine", quantity: 1 }] },
];

// ------------------------------------------------------------------ pickups
export const PICKUPS: PickupDefinition[] = [
  { id: "pk_bangle", placementId: "pickup_bangle", itemId: "brass_bangle", quantity: 1, label: "a brass bangle", locationId: "loc_kulam",
    conditions: [{ type: "quest", id: "q_bangle", status: "active" }] },
  { id: "pk_chisel", placementId: "pickup_chisel", itemId: "velan_chisel", quantity: 1, label: "a chisel", locationId: "loc_ruins", conditions: [] },
  { id: "pk_scrap_ruins", placementId: "pickup_scrap_ruins", itemId: "brass_scrap", quantity: 1, label: "broken brass", locationId: "loc_ruins", conditions: [] },
  { id: "pk_scrap_grounds", placementId: "pickup_scrap_grounds", itemId: "brass_scrap", quantity: 1, label: "broken brass", locationId: "loc_forgotten", conditions: [] },
  { id: "pk_scrap_ruins2", placementId: "pickup_scrap_ruins2", itemId: "brass_scrap", quantity: 1, label: "broken brass", locationId: "loc_ruins", conditions: [] },
  { id: "pk_pouch", placementId: "pickup_pouch", itemId: "coin_pouch", quantity: 1, label: "a cloth pouch", locationId: "loc_bazaar", conditions: [] },
];

// ------------------------------------------------------------------ dialogue topics ("Ask about...")
// Knowledge boundaries: an NPC only answers what its role would know; everyone else gets the default.
export const TOPICS: TopicDefinition[] = [
  {
    id: "t_work",
    label: "Your work",
    conditions: [],
    answers: [
      { who: "npc_valli", lines: ["Work? I keep a house, feed four people and know everyone's business. That last part is the hard work."] },
      { who: "npc_amudha", lines: ["Marigold for the gate, jasmine for the evenings, greens for the pot. The beds tell me what they need if I listen."] },
      { who: "npc_velan", lines: ["Stone. Granite mostly. You learn its grain the way you learn a person's temper - slowly, and by getting it wrong."] },
      { who: "npc_selvam", lines: ["I buy what the carts bring and sell it to people who did not know they needed it. Also rope. Everyone needs rope."] },
      { who: "npc_ponnan", lines: ["At my age, remembering is the work. Somebody has to hold on to what the village used to know."] },
      { who: "npc_meena", lines: ["Warp, weft, and patience. A wedding cloth takes me eleven days."] },
      { who: "npc_kaaval", lines: ["I keep the granary and walk the bazaar at night. Quiet nights are the good ones."] },
      { who: "group:villager", lines: ["This and that. Fields in the morning, market in the afternoon, whatever needs doing."] },
      { who: "default", lines: ["I get by."] },
    ],
  },
  {
    id: "t_channel",
    label: "The garden channel",
    conditions: [],
    answers: [
      { who: "npc_amudha", when: [{ type: "flag", id: "channel_east_flowing", value: true }], lines: ["Flowing, thanks to you. I clear the silt every week now - I'm not losing it again."] },
      { who: "npc_amudha", lines: ["Blocked somewhere near the beds. Without it the garden dies by summer."] },
      { who: "npc_ponnan", when: [{ type: "discovered", id: "disc_channel_inscription", value: true }], lines: ["The stone said every household kept it in turn. We stopped, and it silted up. Simple as that."] },
      { who: "npc_ponnan", lines: ["The channel is older than my grandfather. There's a carved stone about it somewhere in the old grounds."] },
      { who: "npc_velan", lines: ["Good granite walls. Whoever built them knew how to set a joint."] },
      { who: "default", when: [{ type: "flag", id: "channel_east_flowing", value: true }], lines: ["The garden has water again. Everyone's talking about it."] },
      { who: "default", lines: ["The garden channel? Amudha would know more than me."] },
    ],
  },
  {
    id: "t_ruins",
    label: "The western ruins",
    conditions: [],
    answers: [
      { who: "npc_ponnan", lines: ["A pavilion and its walls, older than the temple tank. People say records were kept there once. Nobody has looked in years."] },
      { who: "npc_velan", lines: ["Brick and granite, fine work. And I left my best chisel out there last month, curse it - somewhere by the broken wall."], effects: [{ type: "setFlag", id: "heard_chisel" }] },
      { who: "default", lines: ["I don't go out there. Ask Elder Ponnan - or Velan, he's always poking about in the old stones."] },
    ],
  },
  {
    id: "t_granary",
    label: "The granary",
    conditions: [],
    answers: [
      { who: "npc_selvam", lines: ["The village grain, and my stores for the stall. Open by day for anyone with honest business. After dark Kannan bars the door."] },
      { who: "npc_kaaval", lines: ["Open from dawn until seven in the evening. After that it's barred and I'm watching it. Take what's yours and nothing else."] },
      { who: "default", lines: ["Selvam keeps the village grain in the granary by the bazaar. Kannan the watchman doesn't like people poking around it at night."] },
    ],
  },
  {
    id: "t_weaver",
    label: "Meena the weaver",
    conditions: [{ type: "quest", id: "q_garland", status: "completed" }],
    answers: [
      { who: "npc_meena", lines: ["I'm back, aren't I? That's the whole story. Well - that, and somebody fixed my roof."] },
      { who: "npc_valli", when: [{ type: "flag", id: "weaver_returned", value: true }], lines: ["She's back! I went over with sweets the first morning. We cried, then argued about the price of thread."] },
      { who: "npc_valli", lines: ["My oldest friend. She left when her roof fell in. Her house is on the east lane."] },
      { who: "default", lines: ["Meena wove the cloth for half the weddings on the east lane."] },
    ],
  },
  {
    id: "t_festival",
    label: "The lamp festival",
    conditions: [{ type: "quest", id: "q_channel", status: "completed" }],
    answers: [
      { who: "npc_ponnan", when: [{ type: "flag", id: "festival_held", value: true }], lines: ["Every doorstep lit. I had forgotten the courtyard could look like that."] },
      { who: "npc_ponnan", lines: ["When I was young, every doorstep had a lamp and a kolam. We stopped when the garden and the fields failed. Nothing to celebrate."] },
      { who: "npc_archaka", lines: ["The temple keeps the festival's lamps in the store room. They have waited a long time for oil."] },
      { who: "npc_valli", lines: ["If we ever hold it again, I'm drawing the biggest kolam on the street."] },
      { who: "default", when: [{ type: "flag", id: "festival_held", value: true }], lines: ["Did you see the lamps? My grandmother would have wept."] },
      { who: "default", lines: ["The lamp festival? Not for years now."] },
    ],
  },
  {
    id: "t_rota",
    label: "The channel rota",
    conditions: [{ type: "flag", id: "rota_restored", value: true }],
    answers: [
      { who: "npc_ponnan", lines: ["Copied fresh and nailed to the board. Every household has its month again. That's how a village keeps its water."] },
      { who: "group:villager", lines: ["Our month is on the board now. We'll clear the channels when it comes round."] },
      { who: "default", lines: ["The rota on the notice board? Good idea. Should have been there all along."] },
    ],
  },
];

// ------------------------------------------------------------------ ambient barks (short reactions, no dialogue box)
export const BARKS: BarkDefinition[] = [
  { id: "b_greet_friend", who: "any", trigger: "greet", priority: 20, conditions: [{ type: "flag", id: "festival_held", value: true }], lines: ["Vanakkam! What a festival that was.", "There's the one who lit the courtyard!", "Vanakkam, friend."] },
  { id: "b_greet_valli", who: "npc_valli", trigger: "greet", priority: 10, conditions: [], lines: ["Vanakkam!", "Eaten yet?", "There you are."] },
  { id: "b_greet_velan", who: "npc_velan", trigger: "greet", priority: 10, conditions: [], lines: ["Mind the chips.", "Hm. Vanakkam.", "Come to work, or to watch?"] },
  { id: "b_greet_selvam", who: "npc_selvam", trigger: "greet", priority: 10, conditions: [], lines: ["Rope! Twine! Seed!", "Good prices today!", "Ah, my best customer."] },
  { id: "b_greet_kaaval", who: "npc_kaaval", trigger: "greet", priority: 10, conditions: [], lines: ["Evening.", "Keep to the street.", "All quiet."] },
  { id: "b_greet_any", who: "any", trigger: "greet", priority: 1, conditions: [], lines: ["Vanakkam.", "Good day.", "Hot one today.", "Morning!"] },
  { id: "b_bump", who: "any", trigger: "bump", priority: 1, conditions: [], lines: ["Careful!", "Watch where you're going!", "Oof - mind me!", "Ayyo!"] },
  { id: "b_sprint", who: "any", trigger: "sprint", priority: 1, conditions: [], lines: ["Slow down! Where's the fire?", "Running in the temple street?", "Steady, steady!"] },
  { id: "b_trespass", who: "npc_kaaval", trigger: "trespass", priority: 5, conditions: [], lines: ["What are you doing in the granary at this hour?", "The store room is shut for the night. Out, please."] },
  { id: "b_bell", who: "npc_archaka", trigger: "bell", priority: 5, conditions: [], lines: ["Om Namah Shivaya.", "The puja begins."] },
  { id: "b_rain", who: "any", trigger: "rain", priority: 1, conditions: [], lines: ["Rain! Under the roof, quick.", "The fields will be glad of this.", "Ayyo, my washing!"] },
  { id: "b_witness", who: "any", trigger: "witness", priority: 1, conditions: [], lines: ["Hey! That isn't yours!", "Thief! Kannan!", "I saw that!"] },
  { id: "b_witness_owner", who: "npc_selvam", trigger: "witness", priority: 5, conditions: [], lines: ["That's my stock! Kannan!"] },
  { id: "b_missing_raman", who: "npc_villager_raman", trigger: "missing", priority: 5, conditions: [{ type: "flag", id: "kept_pouch", value: true }], lines: ["Has anyone seen my pouch? Red cloth, a few coins...", "My pouch... I had it at the stall."] },
  { id: "b_admire_garden", who: "any", trigger: "admire", priority: 3, conditions: [{ type: "flag", id: "garden_blooming", value: true }], lines: ["Smell those marigolds.", "Garden looks alive again."] },
  { id: "b_admire_fields", who: "any", trigger: "admire", priority: 4, conditions: [{ type: "flag", id: "fields_irrigated", value: true }], lines: ["Water in the paddies!", "Good harvest coming."] },
  { id: "b_admire_loom", who: "any", trigger: "admire", priority: 4, conditions: [{ type: "flag", id: "weaver_returned", value: true }], lines: ["Hear Meena's loom?", "New cloth for the wedding season."] },
  { id: "b_festival", who: "any", trigger: "festival", priority: 5, conditions: [], lines: ["Look at the lamps!", "Come, sit with us!", "Every doorstep lit!"] },
];

/** Where villagers wait out the rain (anchors in level.ts). */
export const SHELTER_ANCHORS = ["anc_shelter_bazaar", "anc_shelter_fields", "anc_shelter_road", "anc_seating", "anc_workshop_cover", "anc_courtyard_cover"];
