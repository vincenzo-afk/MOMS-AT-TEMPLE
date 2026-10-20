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

export const DIALOGUE: DialogueNode[] = [
  // ---------------- Valli, resident ----------------
  node({
    id: "v_intro",
    npcId: "npc_valli",
    priority: 100,
    conditions: [notStarted("q_arrival")],
    lines: [
      "You must be the newcomer. Welcome! I'm Valli. My family has lived by this courtyard for five generations.",
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
      "The temple stands at the heart of everything. Around it: the houses on the west street, Kamala's workshop and Selvam's stall to the east, and the garden to the north-east.",
      "Behind the temple, past the wall, are the old grounds. Nobody tends them now. Elder Ponnan says they hold more history than the rest of us put together.",
    ],
    options: [{ label: "I'll fetch the jasmine.", effects: [{ type: "startQuest", questId: "q_arrival" }], next: "v_accept" }],
  }),
  node({
    id: "v_accept",
    npcId: "npc_valli",
    root: false,
    lines: ["Wonderful. The bushes are in front of the houses, just west of here. Press E beside one to pick."],
  }),
  node({
    id: "v_arrival_waiting",
    npcId: "npc_valli",
    priority: 90,
    conditions: [at("q_arrival", "gather")],
    lines: ["The jasmine bushes grow in front of the houses on the west street. Three sprigs, please."],
  }),
  node({
    id: "v_arrival_deliver",
    npcId: "npc_valli",
    priority: 96,
    conditions: [at("q_arrival", "return"), { type: "hasItem", itemId: "jasmine_flower", count: 3 }],
    lines: ["Oh, you found them! Smell that."],
    options: [
      {
        label: "Here is the jasmine.",
        effects: [{ type: "deliver", questId: "q_arrival", objectiveId: "return" }],
        next: "v_arrival_done",
      },
    ],
  }),
  node({
    id: "v_arrival_short",
    npcId: "npc_valli",
    priority: 92,
    conditions: [at("q_arrival", "return")],
    lines: ["I'll need three sprigs of jasmine. The bushes regrow by evening if you've picked them bare."],
  }),
  node({
    id: "v_arrival_done",
    npcId: "npc_valli",
    root: false,
    lines: [
      "Thank you. Here, a few coins for your trouble.",
      "If you want to be useful here, go and see Murugan in the garden to the north-east. The flowers are dying and he won't say why. I think it's the water.",
    ],
  }),
  node({
    id: "v_garland_deliver",
    npcId: "npc_valli",
    priority: 96,
    conditions: [at("q_garland", "deliver"), { type: "hasItem", itemId: "flower_garland", count: 1 }],
    lines: ["Is that for the gate? Let me see it."],
    options: [
      {
        label: "Kamala taught me. It's yours.",
        effects: [{ type: "deliver", questId: "q_garland", objectiveId: "deliver" }],
        next: "v_garland_done",
      },
    ],
  }),
  node({
    id: "v_garland_done",
    npcId: "npc_valli",
    root: false,
    lines: [
      "Marigold from our own garden again. I haven't seen that colour on this gate since I was a girl.",
      "I'll hang it now. People will ask who made it, and I'll tell them.",
    ],
  }),
  node({
    id: "v_garland_waiting",
    npcId: "npc_valli",
    priority: 70,
    conditions: [active("q_garland")],
    lines: ["Murugan says you're making a garland for the gate! Marigold, jasmine and twine, strung tight. Kamala will show you how."],
  }),
  node({
    id: "v_after_garland",
    npcId: "npc_valli",
    priority: 65,
    conditions: [done("q_garland")],
    lines: ["Everyone who comes through the gate stops to look at the garland. You've made a mark here already."],
  }),
  node({
    id: "v_after_channel",
    npcId: "npc_valli",
    priority: 60,
    conditions: [{ type: "flag", id: "garden_blooming", value: true }],
    lines: ["Can you smell the garden from here? The water's flowing again, and they say you did it."],
  }),
  node({
    id: "v_channel_active",
    npcId: "npc_valli",
    priority: 55,
    conditions: [done("q_arrival")],
    lines: ["Murugan is in the garden, north-east past the workshop. Go and see him."],
  }),
  node({ id: "v_default", npcId: "npc_valli", lines: ["Good day to you."] }),

  // ---------------- Murugan, gardener ----------------
  node({
    id: "m_before",
    npcId: "npc_murugan",
    priority: 50,
    conditions: [notStarted("q_channel")],
    lines: ["Hm? Sorry, I was looking at the beds. Have you met Valli by the courtyard gate? She'll show you around."],
  }),
  node({
    id: "m_channel_intro",
    npcId: "npc_murugan",
    priority: 100,
    conditions: [done("q_arrival"), notStarted("q_channel")],
    lines: [
      "Valli sent you? Then look at these marigolds. They're dry as straw.",
      "The water comes from the old tank along a stone channel. Somewhere along it the wall has collapsed and the silt has packed in. I'm a gardener, not a mason.",
    ],
    options: [
      { label: "Let me take a look at the channel.", effects: [{ type: "startQuest", questId: "q_channel" }], next: "m_channel_accept" },
      { label: "Not right now.", effects: [] },
    ],
  }),
  node({
    id: "m_channel_accept",
    npcId: "npc_murugan",
    root: false,
    lines: ["It runs along the north edge of the beds. You'll see where it stops being a channel and starts being a ditch."],
  }),
  node({
    id: "m_inspect",
    npcId: "npc_murugan",
    priority: 90,
    conditions: [at("q_channel", "inspect")],
    lines: ["The channel's along the north edge of the beds. Have a look at the broken section."],
  }),
  node({
    id: "m_channel_hint",
    npcId: "npc_murugan",
    priority: 80,
    conditions: [active("q_channel")],
    lines: [
      "Stone from the old grounds behind the temple, mortar from Kamala's bench. That's how my grandfather would have done it.",
    ],
  }),
  node({
    id: "m_report",
    npcId: "npc_murugan",
    priority: 95,
    conditions: [at("q_channel", "report")],
    lines: [
      "Listen! You hear that? Water on stone. I haven't heard that sound in this garden for three summers.",
      "The beds are drinking already. Give it a day and you'll see colour again.",
    ],
    effects: [{ type: "advance", questId: "q_channel", objectiveId: "report" }],
    options: [{ label: "What happens now?", effects: [], next: "m_garland_offer" }],
  }),
  node({
    id: "m_garland_offer",
    npcId: "npc_murugan",
    root: false,
    lines: [
      "Now? The marigolds will open soon enough. Valli wants a garland on the courtyard gate, the way it used to be.",
      "Pick what you need from the beds and ask Kamala to show you the stringing.",
    ],
    options: [
      { label: "I'll make the garland.", effects: [{ type: "startQuest", questId: "q_garland" }] },
      { label: "Maybe later.", effects: [] },
    ],
  }),
  node({
    id: "m_garland_offer_root",
    npcId: "npc_murugan",
    priority: 85,
    conditions: [done("q_channel"), notStarted("q_garland")],
    lines: ["The marigolds are open. Valli still wants that garland for the gate. Will you make it?"],
    options: [
      { label: "I'll make the garland.", effects: [{ type: "startQuest", questId: "q_garland" }] },
      { label: "Not yet.", effects: [] },
    ],
  }),
  node({
    id: "m_garland_active",
    npcId: "npc_murugan",
    priority: 60,
    conditions: [active("q_garland")],
    lines: ["Take what you need from the beds. The plants will give again in a few hours now that they have water."],
  }),
  node({
    id: "m_after",
    npcId: "npc_murugan",
    priority: 40,
    conditions: [done("q_channel")],
    lines: ["The garden remembers who watered it. So do I."],
  }),
  node({ id: "m_default", npcId: "npc_murugan", lines: ["Mind the beds."] }),

  // ---------------- Kamala, artisan ----------------
  node({
    id: "k_mortar",
    npcId: "npc_kamala",
    priority: 95,
    conditions: [at("q_channel", "ask_kamala")],
    lines: [
      "Mortar for the channel? Finally, someone is going to fix it.",
      "You'll want lime clay from the pale bank just past the west end of the channel. Bring two lumps to my bench and work it there. For the wall itself, the fallen masonry in the old grounds, behind the temple to the north-west, is good granite. Take four blocks.",
    ],
    effects: [
      { type: "setFlag", id: "learned_mortar" },
      { type: "advance", questId: "q_channel", objectiveId: "ask_kamala" },
    ],
  }),
  node({
    id: "k_garland",
    npcId: "npc_kamala",
    priority: 95,
    conditions: [at("q_garland", "learn")],
    lines: [
      "A gate garland. Good. Four marigold heads, two sprigs of jasmine, one length of banana-fibre twine. Selvam sells the twine.",
      "Knot every head tight against the last one. A loose garland drops petals all day.",
    ],
    effects: [
      { type: "setFlag", id: "learned_garland" },
      { type: "advance", questId: "q_garland", objectiveId: "learn" },
    ],
  }),
  node({
    id: "k_hint",
    npcId: "npc_kamala",
    priority: 50,
    conditions: [{ type: "flag", id: "learned_mortar", value: true }, active("q_channel")],
    lines: ["Two lumps of lime clay per batch of mortar. Use the bench."],
  }),
  node({
    id: "k_default",
    npcId: "npc_kamala",
    lines: ["This workshop was busy once. Potters, garland-makers, a carpenter. Now it's me and the swallows."],
  }),

  // ---------------- Selvam, trader ----------------
  node({
    id: "s_twine",
    npcId: "npc_selvam",
    priority: 50,
    conditions: [at("q_garland", "twine")],
    lines: ["Twine for a garland? Two coins a hank, the best banana fibre on this street."],
    options: [
      { label: "Show me what you have.", effects: [{ type: "openShop", shopId: "shop_selvam" }] },
      { label: "Later.", effects: [] },
    ],
  }),
  node({
    id: "s_shop",
    npcId: "npc_selvam",
    priority: 10,
    lines: ["Selvam's stall. Twine, cloth, and whatever the carts bring. I also buy fresh flowers."],
    options: [
      { label: "Let me see your goods.", effects: [{ type: "openShop", shopId: "shop_selvam" }] },
      { label: "Just looking.", effects: [] },
    ],
  }),

  // ---------------- Ponnan, elder ----------------
  node({
    id: "p_intro",
    npcId: "npc_ponnan",
    priority: 90,
    conditions: [notStarted("q_inscription")],
    lines: [
      "Sit, sit. New faces are rare. Do you read the old script?",
      "In the overgrown grounds behind the temple there's a stone covered in carving. My eyes can't make it out any more. Would you read it for me?",
    ],
    options: [
      { label: "I'll find the stone.", effects: [{ type: "startQuest", questId: "q_inscription" }] },
      { label: "Another time, Elder.", effects: [] },
    ],
  }),
  node({
    id: "p_waiting",
    npcId: "npc_ponnan",
    priority: 60,
    conditions: [at("q_inscription", "find")],
    lines: ["The old grounds are past the north-west corner of the temple wall. The stone stands upright, near the broken pillars."],
  }),
  node({
    id: "p_report",
    npcId: "npc_ponnan",
    priority: 95,
    conditions: [at("q_inscription", "report")],
    lines: [
      "A channel from the tank to the garden, cut by the whole village after the dry years... and \"kept by every household in turn.\"",
      "So that's why the garden died. Nobody took their turn any more. We forgot the work, so we forgot the water.",
    ],
    effects: [
      { type: "advance", questId: "q_inscription", objectiveId: "report" },
      { type: "setFlag", id: "inscription_interpreted" },
    ],
  }),
  node({
    id: "p_after_flowing",
    npcId: "npc_ponnan",
    priority: 45,
    conditions: [done("q_inscription"), { type: "flag", id: "channel_east_flowing", value: true }],
    lines: ["You read the stone and then you did what it asked. The ancestors would be pleased to see their channel running again."],
  }),
  node({
    id: "p_after",
    npcId: "npc_ponnan",
    priority: 40,
    conditions: [done("q_inscription")],
    lines: ["The stone said every household kept the channel. Perhaps it is time someone kept it again."],
  }),
  node({ id: "p_default", npcId: "npc_ponnan", lines: ["The wind is kind today."] }),
];
