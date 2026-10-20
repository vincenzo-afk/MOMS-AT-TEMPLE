import type { Condition, DialogueNode } from "../game/core/types";

const node = (n: Partial<DialogueNode> & Pick<DialogueNode, "id" | "npcId" | "lines">): DialogueNode => ({
  priority: 0,
  root: true,
  conditions: [],
  effects: [],
  options: [],
  ...n,
});

const notStarted = (id: string): Condition => ({ type: "quest", id, status: "not_started" });
const active = (id: string): Condition => ({ type: "quest", id, status: "active" });
const done = (id: string): Condition => ({ type: "quest", id, status: "completed" });
const at = (questId: string, objectiveId: string): Condition => ({ type: "objective", questId, objectiveId });
const flag = (id: string, value = true): Condition => ({ type: "flag", id, value });
const has = (itemId: string, count = 1): Condition => ({ type: "hasItem", itemId, count });
const friend = (npcId: string, min: number): Condition => ({ type: "relationship", npcId, min });

export const DIALOGUE: DialogueNode[] = [
  // ================================================================ Valli, resident
  node({
    id: "v_intro",
    npcId: "npc_valli",
    priority: 100,
    conditions: [notStarted("q_arrival")],
    lines: [
      "Vanakkam! You must be the newcomer. I'm Valli. My family has lived by this courtyard for five generations.",
      "We're dressing the house fronts this evening, but my hands are full. Could you gather some jasmine from the bushes along the west street? Three sprigs will do.",
    ],
    options: [
      { label: "I'd be glad to help.", effects: [{ type: "startQuest", questId: "q_arrival" }], next: "v_accept" },
      { label: "Tell me about this place first.", effects: [], next: "v_about" },
    ],
  }),
  node({
    id: "v_about",
    npcId: "npc_valli",
    root: false,
    lines: [
      "The temple stands at the heart of everything. The houses are on the west street, Velan's workshop and Selvam's stall are to the east, and the garden is north-east past them.",
      "Outside the walls you'll find the bazaar and its well through the east gate, the fields through the north gate, and the old ruins out west. Look at the notice board by the south gate if you want to know who needs a hand.",
    ],
    options: [{ label: "I'll fetch the jasmine.", effects: [{ type: "startQuest", questId: "q_arrival" }], next: "v_accept" }],
  }),
  node({ id: "v_accept", npcId: "npc_valli", root: false, lines: ["Wonderful. The bushes are in front of the houses just west of here. Press E beside one to pick."] }),
  node({ id: "v_arrival_waiting", npcId: "npc_valli", priority: 90, conditions: [at("q_arrival", "gather")], lines: ["The jasmine bushes grow in front of the houses on the west street. Three sprigs, please."] }),
  node({
    id: "v_arrival_deliver",
    npcId: "npc_valli",
    priority: 96,
    conditions: [at("q_arrival", "return"), has("jasmine_flower", 3)],
    lines: ["Oh, you found them! Smell that."],
    options: [{ label: "Here is the jasmine.", effects: [{ type: "deliver", questId: "q_arrival", objectiveId: "return" }], next: "v_arrival_done" }],
  }),
  node({ id: "v_arrival_short", npcId: "npc_valli", priority: 92, conditions: [at("q_arrival", "return")], lines: ["I'll need three sprigs of jasmine. The bushes regrow by evening if you've picked them bare."] }),
  node({
    id: "v_arrival_done",
    npcId: "npc_valli",
    root: false,
    lines: [
      "Thank you. Here, a few coins for your trouble.",
      "You'll need somewhere to sleep. The empty house at the end of the west street is yours if you want it - there's a chest on the veranda for your things.",
      "And go and see Amudha in the garden to the north-east. The flowers are dying and I think it's the water.",
    ],
    options: [{ label: "I'll take the house. Thank you.", effects: [{ type: "startQuest", questId: "q_home" }] }],
  }),
  node({
    id: "v_home_offer",
    npcId: "npc_valli",
    priority: 58,
    conditions: [done("q_arrival"), notStarted("q_home")],
    lines: ["The empty house at the end of the west street is still waiting for you, you know."],
    options: [
      { label: "I'll make it my home.", effects: [{ type: "startQuest", questId: "q_home" }] },
      { label: "Later.", effects: [] },
    ],
  }),
  node({
    id: "v_home_show",
    npcId: "npc_valli",
    priority: 94,
    conditions: [at("q_home", "show")],
    lines: ["You've made the old place look lived in! Here - rice flour for a kolam on your doorstep. Draw it in the morning."],
    effects: [{ type: "advance", questId: "q_home", objectiveId: "show" }],
  }),
  node({ id: "v_home_waiting", npcId: "npc_valli", priority: 57, conditions: [active("q_home")], lines: ["Put your things in the chest by your door, and make the veranda yours. Selvam sells lamps and mats."] }),
  node({
    id: "v_garland_deliver",
    npcId: "npc_valli",
    priority: 96,
    conditions: [at("q_garland", "deliver"), has("flower_garland")],
    lines: ["Is that for the gate? Let me see it."],
    options: [{ label: "Amudha showed me how. It's yours.", effects: [{ type: "deliver", questId: "q_garland", objectiveId: "deliver" }], next: "v_garland_done" }],
  }),
  node({
    id: "v_garland_done",
    npcId: "npc_valli",
    root: false,
    lines: ["Marigold from our own garden again. I haven't seen that colour on this gate since I was a girl.", "I'll hang it now. People will ask who made it, and I'll tell them."],
  }),
  node({ id: "v_garland_waiting", npcId: "npc_valli", priority: 70, conditions: [active("q_garland")], lines: ["Amudha says you're making a garland for the gate! Marigold, jasmine and twine, strung tight."] }),
  node({
    id: "v_weaver_offer",
    npcId: "npc_valli",
    priority: 80,
    conditions: [done("q_garland"), notStarted("q_weaver")],
    lines: [
      "Do you know what this settlement is missing? Meena's loom. She wove the cloth for every wedding and festival on this street.",
      "She left when her roof fell in. Her house on the east lane, past the bazaar, is still standing. If someone fixed it, I know she'd come back.",
    ],
    options: [
      { label: "I'll repair her house.", effects: [{ type: "startQuest", questId: "q_weaver" }] },
      { label: "Not right now.", effects: [] },
    ],
  }),
  node({ id: "v_weaver_waiting", npcId: "npc_valli", priority: 69, conditions: [active("q_weaver")], lines: ["Velan knows how to tie thatch. Dry grass grows tall at the edges of the north fields."] }),
  node({
    id: "v_festival_plan",
    npcId: "npc_valli",
    priority: 97,
    conditions: [at("q_festival", "plan")],
    lines: [
      "The lamp festival! Oh, I've been waiting years to hear someone say that.",
      "The offering bundle is the heart of it: a garland, vegetables from our own fields, and new cloth from Meena's loom. Put it together at the festival table in the courtyard and bring it to Ponnan.",
    ],
    effects: [
      { type: "setFlag", id: "festival_preparing" },
      { type: "advance", questId: "q_festival", objectiveId: "plan" },
    ],
  }),
  node({ id: "v_festival_waiting", npcId: "npc_valli", priority: 68, conditions: [active("q_festival")], lines: ["Vegetables, cloth and a garland, put together at the festival table. Then to Ponnan!"] }),
  node({ id: "v_festival_held", npcId: "npc_valli", priority: 75, conditions: [flag("festival_held")], lines: ["Every lamp in the courtyard lit! Come back in the evening - there's always someone singing by the tank."] }),
  node({ id: "v_after_garland", npcId: "npc_valli", priority: 65, conditions: [done("q_garland")], lines: ["Everyone who comes through the gate stops to look at the garland. You've made a mark here already."] }),
  node({ id: "v_after_channel", npcId: "npc_valli", priority: 60, conditions: [flag("garden_blooming")], lines: ["Can you smell the garden from here? The water's flowing again, and they say you did it."] }),
  node({ id: "v_channel_active", npcId: "npc_valli", priority: 55, conditions: [done("q_arrival")], lines: ["Amudha is in the garden, north-east past the workshop. Go and see her."] }),
  node({ id: "v_friend", npcId: "npc_valli", priority: 30, conditions: [friend("npc_valli", 30)], lines: ["My grandmother used to say the courtyard has a long memory. I think it'll remember you."] }),
  node({ id: "v_default", npcId: "npc_valli", lines: ["Vanakkam. Good day to you."] }),

  // ================================================================ Amudha, Thottakaari (gardener)
  node({ id: "a_before", npcId: "npc_amudha", priority: 50, conditions: [notStarted("q_channel")], lines: ["Hm? Sorry, I was looking at the beds. Have you met Valli by the gate? She'll show you around."] }),
  node({
    id: "a_channel_intro",
    npcId: "npc_amudha",
    priority: 100,
    conditions: [done("q_arrival"), notStarted("q_channel")],
    lines: [
      "Valli sent you? Then look at these marigolds. Dry as straw.",
      "The water comes from the old tank along a stone channel. Somewhere along it the wall has collapsed and the silt has packed in. I'm a gardener, not a mason.",
    ],
    options: [
      { label: "Let me look at the channel.", effects: [{ type: "startQuest", questId: "q_channel" }], next: "a_channel_accept" },
      { label: "Not right now.", effects: [] },
    ],
  }),
  node({ id: "a_channel_accept", npcId: "npc_amudha", root: false, lines: ["It runs along the north edge of the beds. You'll see where it stops being a channel and starts being a ditch."] }),
  node({ id: "a_inspect", npcId: "npc_amudha", priority: 90, conditions: [at("q_channel", "inspect")], lines: ["The channel's along the north edge of the beds. Have a look at the broken section."] }),
  node({ id: "a_channel_hint", npcId: "npc_amudha", priority: 80, conditions: [active("q_channel")], lines: ["Stone from the old grounds behind the temple, mortar from Velan's bench. That's how my grandfather would have done it."] }),
  node({
    id: "a_report",
    npcId: "npc_amudha",
    priority: 95,
    conditions: [at("q_channel", "report")],
    lines: ["Listen! You hear that? Water on stone. I haven't heard that sound in this garden for three summers.", "The beds are drinking already. Give it a day and you'll see colour again."],
    effects: [{ type: "advance", questId: "q_channel", objectiveId: "report" }],
    options: [{ label: "What happens now?", effects: [], next: "a_garland_offer" }],
  }),
  node({
    id: "a_garland_offer",
    npcId: "npc_amudha",
    root: false,
    lines: [
      "Now? The marigolds will open soon enough. Valli wants a garland on the gate, the way it used to be.",
      "Let me show you. Four marigold heads, two sprigs of jasmine, one length of banana-fibre twine - Selvam sells it. Knot every head tight against the last. Make it at Velan's bench.",
    ],
    options: [
      { label: "I'll make the garland.", effects: [{ type: "setFlag", id: "learned_garland" }, { type: "startQuest", questId: "q_garland" }] },
      { label: "Maybe later.", effects: [{ type: "setFlag", id: "learned_garland" }] },
    ],
  }),
  node({
    id: "a_garland_offer_root",
    npcId: "npc_amudha",
    priority: 85,
    conditions: [done("q_channel"), notStarted("q_garland")],
    lines: ["The marigolds are open. Valli still wants that garland for the gate. Will you make it?"],
    options: [
      { label: "I'll make the garland.", effects: [{ type: "setFlag", id: "learned_garland" }, { type: "startQuest", questId: "q_garland" }] },
      { label: "Not yet.", effects: [] },
    ],
  }),
  node({
    id: "a_fields_offer",
    npcId: "npc_amudha",
    priority: 84,
    conditions: [done("q_garland"), notStarted("q_fields")],
    lines: [
      "The garden is the small problem. The north fields are the big one. The reservoir is full, but its sluice has been jammed shut for years and the paddies are cracked dust.",
      "If that gate could be opened again, half the village would eat better.",
    ],
    options: [
      { label: "I'll look at the sluice.", effects: [{ type: "startQuest", questId: "q_fields" }] },
      { label: "Another day.", effects: [] },
    ],
  }),
  node({ id: "a_fields_hint", npcId: "npc_amudha", priority: 79, conditions: [active("q_fields")], lines: ["The sluice is at the far north end of the fields, where the reservoir wall is. Velan can help you make a board for it."] }),
  node({
    id: "a_fields_report",
    npcId: "npc_amudha",
    priority: 96,
    conditions: [at("q_fields", "report")],
    lines: ["You've seen it? Water in every paddy, all the way down to the hut! Muthu was crying, the old fool. So was I.", "And your plots by the hut will drink from the channels now too - no more carrying pots."],
    effects: [{ type: "advance", questId: "q_fields", objectiveId: "report" }],
  }),
  node({
    id: "a_harvest_offer",
    npcId: "npc_amudha",
    priority: 83,
    conditions: [done("q_channel"), notStarted("q_harvest")],
    lines: [
      "You have a gardener's patience, I think. There are four plots beside my field hut, north through the gate. Nobody's using them.",
      "Plant seeds, water them, and wait. Here - take this pot for carrying water. The garden tank, the water point on the south road and the bazaar well, if it ever works again.",
    ],
    options: [
      { label: "I'd like to try.", effects: [{ type: "giveItem", itemId: "water_vessel", quantity: 1, once: "amudha_vessel" }, { type: "startQuest", questId: "q_harvest" }] },
      { label: "Not now.", effects: [] },
    ],
  }),
  node({
    id: "a_harvest_deliver",
    npcId: "npc_amudha",
    priority: 96,
    conditions: [at("q_harvest", "deliver"), has("produce", 2)],
    lines: ["Look at that brinjal! You grew that? Then this belongs at your door."],
    options: [{ label: "These are for you.", effects: [{ type: "deliver", questId: "q_harvest", objectiveId: "deliver" }], next: "a_harvest_done" }],
  }),
  node({ id: "a_harvest_done", npcId: "npc_amudha", root: false, lines: ["A tulsi in a painted pot. Put it by your house; it brings the morning in."] }),
  node({ id: "a_harvest_hint", npcId: "npc_amudha", priority: 78, conditions: [active("q_harvest")], lines: ["Seeds go in, water goes on, then you wait a few hours. Don't harvest before the vegetables show."] }),
  node({
    id: "a_festival_cloth",
    npcId: "npc_amudha",
    priority: 60,
    conditions: [active("q_festival")],
    lines: ["The festival! Take whatever flowers you need from the beds. They'll grow back - they have water now."],
  }),
  node({ id: "a_after", npcId: "npc_amudha", priority: 40, conditions: [done("q_channel")], lines: ["The garden remembers who watered it. So do I."] }),
  node({ id: "a_friend", npcId: "npc_amudha", priority: 35, conditions: [friend("npc_amudha", 40)], lines: ["My mother kept these beds, and her mother. I thought I'd be the one to lose them. Thank you for that."] }),
  node({ id: "a_default", npcId: "npc_amudha", lines: ["Mind the beds."] }),

  // ================================================================ Velan, Sirpi (stone carver)
  node({
    id: "ve_mortar",
    npcId: "npc_velan",
    priority: 95,
    conditions: [at("q_channel", "ask_velan")],
    lines: [
      "Mortar for the channel? Finally, someone is going to fix it.",
      "Lime clay from the pale bank past the west end of the channel - two lumps per batch, worked at my bench. For the wall itself, the fallen masonry in the old grounds behind the temple is good granite. Take four blocks.",
    ],
    effects: [{ type: "setFlag", id: "learned_mortar" }, { type: "advance", questId: "q_channel", objectiveId: "ask_velan" }],
  }),
  node({
    id: "ve_bucket",
    npcId: "npc_velan",
    priority: 95,
    conditions: [at("q_well", "ask_velan")],
    lines: ["A bucket? Two timbers - the woodland logs north-west of the ruins are seasoned - and a length of rope for the bail. I'll show you the joints.", "Same joints make a sluice board, if anyone ever needs one."],
    effects: [{ type: "setFlag", id: "learned_carpentry" }, { type: "advance", questId: "q_well", objectiveId: "ask_velan" }],
  }),
  node({
    id: "ve_sluice",
    npcId: "npc_velan",
    priority: 95,
    conditions: [at("q_fields", "ask_velan")],
    lines: ["The reservoir sluice! Three timbers pinned together, a rope to lift it, and mortar to bed the seat. Use my bench."],
    effects: [{ type: "setFlag", id: "learned_carpentry" }, { type: "advance", questId: "q_fields", objectiveId: "ask_velan" }],
  }),
  node({
    id: "ve_thatch",
    npcId: "npc_velan",
    priority: 95,
    conditions: [at("q_weaver", "ask_velan")],
    lines: ["Thatch is easy and tedious. Three handfuls of dry grass, one twist of twine, makes two bundles. Meena's roof will want four.", "Two timbers for new roof poles, and mortar for the cracks in her walls."],
    effects: [{ type: "setFlag", id: "learned_thatching" }, { type: "advance", questId: "q_weaver", objectiveId: "ask_velan" }],
  }),
  node({
    id: "ve_wall_offer",
    npcId: "npc_velan",
    priority: 82,
    conditions: [done("q_channel"), notStarted("q_wall")],
    lines: [
      "You did good work on that channel. Neat joints.",
      "Out past the west gate there's a brick wall falling down and a carved pillar lying in the grass. Old work - better than mine. One more monsoon and they're gone. Will you help me save them?",
    ],
    options: [
      { label: "Show me what to do.", effects: [{ type: "startQuest", questId: "q_wall" }] },
      { label: "Not today.", effects: [] },
    ],
  }),
  node({ id: "ve_wall_hint", npcId: "npc_velan", priority: 78, conditions: [active("q_wall")], lines: ["Stone for the wall core, mortar for every course. The pillar needs a rope to lever it upright."] }),
  node({
    id: "ve_wall_report",
    npcId: "npc_velan",
    priority: 96,
    conditions: [at("q_wall", "report")],
    lines: ["I went and looked. You set that pillar straighter than I would have.", "And the frieze under it - did you see the lions? Whoever carved those knew what they were doing."],
    effects: [{ type: "advance", questId: "q_wall", objectiveId: "report" }],
  }),
  node({ id: "ve_hint", npcId: "npc_velan", priority: 50, conditions: [flag("learned_mortar"), active("q_channel")], lines: ["Two lumps of lime clay per batch of mortar. Use the bench."] }),
  node({ id: "ve_friend", npcId: "npc_velan", priority: 35, conditions: [friend("npc_velan", 30)], lines: ["My father carved the lamp pillar in the courtyard. I'll show you his mark on it some time."] }),
  node({ id: "ve_default", npcId: "npc_velan", lines: ["This workshop was busy once. Potters, garland-makers, a carpenter. Now it's me and the swallows. The bench is yours to use."] }),

  // ================================================================ Selvam, Viyaabaari (trader)
  node({
    id: "s_well_offer",
    npcId: "npc_selvam",
    priority: 70,
    conditions: [done("q_arrival"), notStarted("q_well")],
    lines: [
      "You're the one helping everybody? Then help a trader. The well in the bazaar square has been dry since its rope rotted through.",
      "My customers walk all the way to the tank and back, and they buy less on the way.",
    ],
    options: [
      { label: "I'll see to the well.", effects: [{ type: "startQuest", questId: "q_well" }] },
      { label: "Show me your goods instead.", effects: [{ type: "openShop", shopId: "shop_selvam" }] },
    ],
  }),
  node({
    id: "s_well_report",
    npcId: "npc_selvam",
    priority: 96,
    conditions: [at("q_well", "report")],
    lines: ["They're queuing at the well already! Business will be up by noon. Here, you've earned this.", "And take this key to the granary bar - you can fetch from the granary any time, even at night. My crate only, mind."],
    effects: [{ type: "advance", questId: "q_well", objectiveId: "report" }, { type: "setFlag", id: "granary_key" }],
  }),
  node({
    id: "s_needs",
    npcId: "npc_selvam",
    priority: 60,
    conditions: [{ type: "quest", id: "q_well", status: "active" }],
    lines: ["Rope's three coins a length. You'll want two - one for the bucket, one for the winch."],
    options: [
      { label: "Show me what you have.", effects: [{ type: "openShop", shopId: "shop_selvam" }] },
      { label: "Later.", effects: [] },
    ],
  }),
  node({
    id: "s_shop",
    npcId: "npc_selvam",
    priority: 10,
    lines: ["Selvam's stall. Twine, rope, seed, tools, lamps for your house. And I buy fresh flowers and vegetables."],
    options: [
      { label: "Let me see your goods.", effects: [{ type: "openShop", shopId: "shop_selvam" }] },
      { label: "Just looking.", effects: [] },
    ],
  }),

  // ================================================================ Ponnan, Periyavar (elder)
  node({
    id: "p_intro",
    npcId: "npc_ponnan",
    priority: 90,
    conditions: [notStarted("q_inscription")],
    lines: ["Sit, sit. New faces are rare. Do you read the old script?", "In the overgrown grounds behind the temple there's a stone covered in carving. My eyes can't make it out any more. Would you read it for me?"],
    options: [
      { label: "I'll find the stone.", effects: [{ type: "startQuest", questId: "q_inscription" }] },
      { label: "Another time, Elder.", effects: [] },
    ],
  }),
  node({ id: "p_waiting", npcId: "npc_ponnan", priority: 60, conditions: [at("q_inscription", "find")], lines: ["The old grounds are past the north-west corner of the temple wall. The stone stands upright, near the broken pillars."] }),
  node({
    id: "p_report",
    npcId: "npc_ponnan",
    priority: 95,
    conditions: [at("q_inscription", "report")],
    lines: [
      "A channel from the tank to the garden, cut by the whole village after the dry years... and \"kept by every household in turn.\"",
      "So that's why the garden died. Nobody took their turn any more. We forgot the work, so we forgot the water.",
    ],
    effects: [{ type: "advance", questId: "q_inscription", objectiveId: "report" }, { type: "setFlag", id: "inscription_interpreted" }],
  }),
  node({
    id: "p_manuscript_offer",
    npcId: "npc_ponnan",
    priority: 85,
    conditions: [done("q_inscription"), notStarted("q_manuscript")],
    lines: [
      "That stone has kept me awake. \"Kept by every household in turn\" - there must have been a list. Lists were written on palm leaf and kept somewhere safe.",
      "The old pavilion in the western ruins. The path's been lost to thorns for twenty years. Selvam sells sickles.",
    ],
    options: [
      { label: "I'll search the pavilion.", effects: [{ type: "startQuest", questId: "q_manuscript" }] },
      { label: "Another time.", effects: [] },
    ],
  }),
  node({ id: "p_manuscript_hint", npcId: "npc_ponnan", priority: 75, conditions: [active("q_manuscript")], lines: ["Out through the west gate, past the broken brick arch. The pavilion is inside the old enclosure."] }),
  node({
    id: "p_manuscript_deliver",
    npcId: "npc_ponnan",
    priority: 96,
    conditions: [at("q_manuscript", "deliver"), has("palm_leaf_manuscript")],
    lines: ["You found it? Let me see... yes. Yes! Names, households, months. A rota."],
    options: [{ label: "It's yours to keep, Elder.", effects: [{ type: "deliver", questId: "q_manuscript", objectiveId: "deliver" }], next: "p_manuscript_done" }],
  }),
  node({
    id: "p_manuscript_done",
    npcId: "npc_ponnan",
    root: false,
    lines: ["My own grandfather's name is on this leaf, against the month of Thai. I'll copy it fresh and nail it to the notice board. Every household will see their turn."],
    effects: [{ type: "setFlag", id: "rota_restored" }],
  }),
  node({
    id: "p_festival_offer",
    npcId: "npc_ponnan",
    priority: 99,
    conditions: [done("q_garland"), done("q_fields"), done("q_weaver"), notStarted("q_festival")],
    lines: [
      "Water in the garden, water in the fields, Meena's loom clacking on the east lane... Do you know what this means?",
      "It means we can hold the lamp festival again. When I was young, every doorstep in the settlement had a lamp and a kolam on festival night.",
    ],
    options: [
      { label: "Let's hold the festival.", effects: [{ type: "startQuest", questId: "q_festival" }] },
      { label: "Soon, Elder.", effects: [] },
    ],
  }),
  node({
    id: "p_festival_deliver",
    npcId: "npc_ponnan",
    priority: 97,
    conditions: [at("q_festival", "deliver"), has("festival_bundle")],
    lines: ["The offering bundle. Garland from the garden, food from the fields, cloth from the loom."],
    options: [{ label: "Light the lamps, Elder.", effects: [{ type: "deliver", questId: "q_festival", objectiveId: "deliver" }], next: "p_festival_done" }],
  }),
  node({
    id: "p_festival_done",
    npcId: "npc_ponnan",
    root: false,
    lines: ["Then let the lamps be lit! Come back to the courtyard at dusk. Everyone will be there.", "And I'll write tonight into the record myself. Your name, and what you mended."],
  }),
  node({ id: "p_festival_waiting", npcId: "npc_ponnan", priority: 74, conditions: [active("q_festival")], lines: ["Valli knows what the bundle needs. Bring it to me in the courtyard when it's ready."] }),
  node({ id: "p_after_flowing", npcId: "npc_ponnan", priority: 45, conditions: [done("q_inscription"), flag("channel_east_flowing")], lines: ["You read the stone and then you did what it asked. The ancestors would be pleased to see their channel running again."] }),
  node({ id: "p_after", npcId: "npc_ponnan", priority: 40, conditions: [done("q_inscription")], lines: ["The stone said every household kept the channel. Perhaps it is time someone kept it again."] }),
  node({ id: "p_default", npcId: "npc_ponnan", lines: ["The wind is kind today."] }),

  // ================================================================ Meena, weaver
  node({
    id: "m_welcome",
    npcId: "npc_meena",
    priority: 96,
    conditions: [at("q_weaver", "meet")],
    lines: ["You're the one who fixed my roof? I came back the day Valli sent word. I didn't believe her until I saw the thatch.", "The loom is set up again. Come back whenever you need cloth."],
    effects: [{ type: "advance", questId: "q_weaver", objectiveId: "meet" }],
  }),
  node({
    id: "m_festival_cloth",
    npcId: "npc_meena",
    priority: 95,
    conditions: [at("q_festival", "cloth")],
    lines: ["Festival cloth! I wove a length the first night I was back, just in case. Take it - and no, I won't take coins for it."],
    effects: [{ type: "giveItem", itemId: "handwoven_cloth", quantity: 1, once: "meena_festival_cloth" }],
  }),
  node({
    id: "m_shop",
    npcId: "npc_meena",
    priority: 10,
    lines: ["Clack, clack, clack. Do you hear it? The street's heard it again for a week now."],
    options: [
      { label: "May I buy some cloth?", effects: [{ type: "openShop", shopId: "shop_meena" }] },
      { label: "It's a good sound.", effects: [] },
    ],
  }),

  // ================================================================ lost and found (session 3)
  node({
    id: "v_bangle_offer",
    npcId: "npc_valli",
    priority: 59,
    conditions: [done("q_arrival"), notStarted("q_bangle")],
    lines: ["Oh, before you go - I lost a bangle when I went down to the temple tank for water. Brass, with a red bead. If you're on the south road, would you look?"],
    options: [
      { label: "I'll look for it.", effects: [{ type: "startQuest", questId: "q_bangle" }] },
      { label: "Not now.", effects: [] },
    ],
  }),
  node({
    id: "v_bangle_deliver",
    npcId: "npc_valli",
    priority: 97,
    conditions: [at("q_bangle", "return"), has("brass_bangle")],
    lines: ["My bangle! My mother gave me that pair."],
    options: [{ label: "It was on the tank steps.", effects: [{ type: "deliver", questId: "q_bangle", objectiveId: "return" }] }],
  }),
  node({
    id: "ve_chisel_offer",
    npcId: "npc_velan",
    priority: 81,
    conditions: [done("q_channel"), notStarted("q_chisel"), flag("heard_chisel")],
    lines: ["You'll be out in the ruins anyway. If you see a chisel with a brass collar by the broken wall, it's mine."],
    options: [
      { label: "I'll find it.", effects: [{ type: "startQuest", questId: "q_chisel" }] },
      { label: "Maybe.", effects: [] },
    ],
  }),
  node({
    id: "ve_chisel_deliver",
    npcId: "npc_velan",
    priority: 97,
    conditions: [at("q_chisel", "return"), has("velan_chisel")],
    lines: ["My father's chisel! I thought the monsoon had taken it."],
    options: [{ label: "Here you are.", effects: [{ type: "deliver", questId: "q_chisel", objectiveId: "return" }] }],
  }),
  node({
    id: "r_pouch",
    npcId: "npc_villager_raman",
    priority: 95,
    conditions: [has("coin_pouch")],
    lines: ["Is that - that's my pouch! I've been looking everywhere."],
    options: [
      {
        label: "Here, it's yours.",
        effects: [{ type: "takeItem", itemId: "coin_pouch", quantity: 1 }, { type: "coins", amount: 2 }, { type: "relationship", npcId: "npc_villager_raman", amount: 20 }, { type: "setFlag", id: "returned_pouch" }],
        next: "r_pouch_thanks",
      },
      { label: "I found it - finders keepers.", effects: [{ type: "relationship", npcId: "npc_villager_raman", amount: -20 }, { type: "setFlag", id: "refused_pouch" }] },
    ],
  }),
  node({ id: "r_pouch_thanks", npcId: "npc_villager_raman", root: false, lines: ["Take these two for your honesty. I'll tell everyone at the stalls."] }),
  node({ id: "r_pouch_kept", npcId: "npc_villager_raman", priority: 80, conditions: [flag("kept_pouch")], lines: ["I lost my pouch at the bazaar. If you hear anything... no? No. Of course not."] }),
  node({ id: "r_pouch_returned", npcId: "npc_villager_raman", priority: 70, conditions: [flag("returned_pouch")], lines: ["Vanakkam, my honest friend! Have a mango."] }),

  // ================================================================ Kannan, watchman
  node({
    id: "k_confront",
    npcId: "npc_kaaval",
    priority: 200,
    conditions: [{ type: "crime", value: true }],
    lines: ["Stop right there. Somebody saw you take what isn't yours.", "Put it back where it came from, or pay the fine. Your choice - but you're not walking off with it."],
    options: [
      { label: "I'll put it back.", effects: [{ type: "resolveCrime", mode: "return" }], next: "k_resolved" },
      { label: "I'll pay the fine (6 coins).", effects: [{ type: "resolveCrime", mode: "fine" }], next: "k_resolved" },
    ],
  }),
  node({ id: "k_resolved", npcId: "npc_kaaval", root: false, lines: ["Good. We'll say no more about it. But people talk, and they'll remember."] }),
  node({ id: "k_key", npcId: "npc_kaaval", priority: 30, conditions: [flag("granary_key")], lines: ["Selvam says you can come and go from the granary. Just bar the door behind you."] }),
  node({ id: "k_default", npcId: "npc_kaaval", lines: ["Kannan. I keep the granary and walk the bazaar at night.", "Honest business by day. After seven, the door is barred."] }),

  // ================================================================ everyday villagers (group)
  node({ id: "g_festival", npcId: "group:villager", priority: 90, conditions: [flag("festival_held")], lines: ["Did you see the courtyard last night? Lamps on every step. My children won't stop talking about it."] }),
  node({ id: "g_fields", npcId: "group:villager", priority: 80, conditions: [flag("fields_irrigated")], lines: ["Green in the paddies again! I walked the bund this morning just to look at it."] }),
  node({ id: "g_well", npcId: "group:villager", priority: 70, conditions: [flag("well_working")], lines: ["The bazaar well works again! No more carrying pots from the tank. Vanakkam to you."] }),
  node({ id: "g_weaver", npcId: "group:villager", priority: 65, conditions: [flag("weaver_returned")], lines: ["Meena's back on the east lane, did you hear? I'm having a new veshti woven before the festival."] }),
  node({ id: "g_garden", npcId: "group:villager", priority: 60, conditions: [flag("garden_blooming")], lines: ["The marigolds are back in Amudha's garden. My mother used to say a garden is the settlement's face."] }),
  node({ id: "g_rota", npcId: "group:villager", priority: 75, conditions: [flag("rota_restored")], lines: ["Elder Ponnan put a rota on the notice board - my household's month is Aadi. We'll clear the channels then, like our grandparents did."] }),
  node({ id: "g_default", npcId: "group:villager", lines: ["Vanakkam! Busy day.", "If you're looking for work, the notice board by the south gate always has something."] }),
  // ---- Sundaram, the archaka
  node({
    id: "ar_lamp_offer",
    npcId: "npc_archaka",
    priority: 59,
    conditions: [done("q_arrival"), notStarted("q_archaka_lamp")],
    lines: ["Vanakkam. You are the newcomer Valli spoke of.", "The evening puja needs one more lamp at the sanctum door, and my hands are full with the archana. Could you bring one?"],
    options: [
      { label: "I'll find a lamp.", effects: [{ type: "startQuest", questId: "q_archaka_lamp" }] },
      { label: "Another time.", effects: [] },
    ],
  }),
  node({ id: "ar_lamp_waiting", npcId: "npc_archaka", priority: 60, conditions: [active("q_archaka_lamp")], lines: ["Selvam keeps lamps on his stall. Before sunset, if you can."] }),
  node({
    id: "ar_lamp_deliver",
    npcId: "npc_archaka",
    priority: 97,
    conditions: [at("q_archaka_lamp", "deliver"), has("oil_lamp")],
    lines: ["A good lamp. It will burn at the door tonight."],
    options: [{ label: "For the evening puja.", effects: [{ type: "deliver", questId: "q_archaka_lamp", objectiveId: "deliver" }] }],
  }),
  node({
    id: "ar_blessed",
    npcId: "npc_archaka",
    priority: 20,
    conditions: [flag("archaka_blessing")],
    lines: ["Your lamp burns at the door every evening now. Come for the puja at six - morning or evening, the bell will tell you."],
  }),
  node({
    id: "ar_default",
    npcId: "npc_archaka",
    priority: 10,
    lines: ["The morning puja is at five, the evening one at five in the afternoon. The bell rings for both.", "Walk around the sanctum keeping it on your right - that is pradakshina."],
  }),
  // ---- the casting corner and Karthigai Deepam (session 5)
  node({
    id: "ve_casting_offer",
    npcId: "npc_velan",
    priority: 80,
    conditions: [done("q_chisel"), notStarted("q_casting")],
    lines: [
      "Since you brought my father's chisel back - there's something else. Behind the workshop is the corner where my grandmother Kamala cast brass lamps.",
      "Nobody has lit that furnace since she died. Look it over and tell me if it's worth saving.",
    ],
    options: [
      { label: "I'll take a look.", effects: [{ type: "startQuest", questId: "q_casting" }] },
      { label: "Another day.", effects: [] },
    ],
  }),
  node({
    id: "ve_casting_hint",
    npcId: "npc_velan",
    priority: 78,
    conditions: [active("q_casting")],
    lines: ["Two timbers, mortar for the furnace, a rope for the bellows. Then brass and wax - Selvam has wax, and the ruins are full of broken brass."],
  }),
  node({
    id: "ve_casting_show",
    npcId: "npc_velan",
    priority: 97,
    conditions: [at("q_casting", "show"), has("brass_lamp")],
    lines: ["Let me see. The foot is true and the cups are even.", "Kamala would have sold that one. Keep it - the furnace is yours as much as mine now."],
  }),
  node({
    id: "ve_casting_after",
    npcId: "npc_velan",
    priority: 36,
    conditions: [done("q_casting")],
    lines: ["The furnace is warm again. Two pieces of brass and a cake of wax make a lamp - the corner is yours whenever you want it."],
  }),
  node({
    id: "ve_deepam_lamp",
    npcId: "npc_velan",
    priority: 96,
    conditions: [at("q_deepam", "ask_velan")],
    lines: ["A lamp for the sanctum door at Karthigai? Then cast it tall and cast it clean. Two pieces of brass and a cake of wax, same as before."],
  }),
  node({
    id: "ar_deepam_offer",
    npcId: "npc_archaka",
    priority: 61,
    conditions: [done("q_festival"), done("q_casting"), notStarted("q_deepam")],
    lines: [
      "The lamp festival brought the courtyard back to life. There is an older custom still: Karthigai Deepam, when every ledge of the temple carries a lamp.",
      "Now that brass is cast behind the workshop again, we could keep it properly. A brass lamp for the sanctum door, clay lamps for the walls. Will you help?",
    ],
    options: [
      { label: "Gladly.", effects: [{ type: "startQuest", questId: "q_deepam" }] },
      { label: "Not yet.", effects: [] },
    ],
  }),
  node({
    id: "ar_deepam_waiting",
    npcId: "npc_archaka",
    priority: 62,
    conditions: [active("q_deepam")],
    lines: ["Velan will cast the brass lamp with you. The clay lamps you can make at the bench or buy from Selvam."],
  }),
  node({
    id: "ar_deepam_brass",
    npcId: "npc_archaka",
    priority: 97,
    conditions: [at("q_deepam", "brass_deliver"), has("brass_lamp")],
    lines: ["Cast here, in the settlement. It will stand at the sanctum door."],
    options: [{ label: "For the door.", effects: [{ type: "deliver", questId: "q_deepam", objectiveId: "brass_deliver" }] }],
  }),
  node({
    id: "ar_deepam_clay",
    npcId: "npc_archaka",
    priority: 97,
    conditions: [at("q_deepam", "clay_deliver"), has("oil_lamp", 3)],
    lines: ["Good. Valli is waiting at the wall with the oil - go and help her set them out."],
    options: [{ label: "Here are the lamps.", effects: [{ type: "deliver", questId: "q_deepam", objectiveId: "clay_deliver" }] }],
  }),
  node({
    id: "v_deepam_line",
    npcId: "npc_valli",
    priority: 96,
    conditions: [at("q_deepam", "line")],
    lines: ["Lamps on every ledge - I'll take the far wall, you take the gate side.", "There. Wait for dusk, then look back at the temple."],
  }),
  node({
    id: "ar_deepam_after",
    npcId: "npc_archaka",
    priority: 25,
    conditions: [flag("deepam_held")],
    lines: ["The walls carry their lamps again, as Kamala's ledger says they did. Sundaram thanks you - and so, I think, does she."],
  }),
];
