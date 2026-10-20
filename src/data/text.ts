// Player-facing text for locations and Living Record entries, keyed by stable IDs.

export const LOCATIONS: Record<string, string> = {
  loc_approach: "South approach",
  loc_kulam: "Temple tank",
  loc_entrance: "Main gate",
  loc_courtyard: "Central courtyard",
  loc_temple: "Temple",
  loc_street: "West street",
  loc_market: "Selvam's stall",
  loc_workshop: "Velan's workshop",
  loc_garden: "Settlement garden",
  loc_claypit: "Clay bank",
  loc_forgotten: "Old grounds",
  loc_home: "Your house",
  loc_bazaar: "East bazaar",
  loc_well: "Well square",
  loc_lane: "East lane",
  loc_fields: "North fields",
  loc_reservoir: "Reservoir",
  loc_ruins: "Western ruins",
  loc_woods: "Woodland",
};

export const RECORD_TEXT: Record<string, { title: string; body: string }> = {
  rec_arrival: {
    title: "A newcomer is welcomed",
    body: "You arrived at the settlement and gathered jasmine for Valli's house front. Your first gift to the community.",
  },
  rec_channel: {
    title: "The garden channel flows again",
    body: "You salvaged granite from the old grounds, worked lime mortar at Velan's bench and rebuilt the collapsed channel wall. Water from the old tank reaches the garden for the first time in three summers.",
  },
  rec_garden: {
    title: "The garden recovers",
    body: "With water in the channel again, the marigold beds in Amudha's garden turned green and began to flower.",
  },
  rec_inscription: {
    title: "The channel stone is read",
    body: "In the old grounds you found a carved stone recording that the whole village cut the garden channel together after a drought, and that every household kept it in turn.",
  },
  rec_garland: {
    title: "A garland on the gate",
    body: "Amudha taught you to string marigolds from the recovered garden into a garland. Valli hung it on the gateway, the first in many years.",
  },
  rec_home: {
    title: "The newcomer's house is lit",
    body: "You stored your things and dressed the empty house at the end of the west street. Valli says it looks lived in now.",
  },
  rec_well: {
    title: "The bazaar well draws water",
    body: "You made a bucket at Velan's bench and fitted a new coir rope to the old well. The bazaar has its own water again.",
  },
  rec_sluice: {
    title: "The field sluice opens",
    body: "You built a new gate board for the reservoir sluice and seated it in fresh mortar. Water runs north into the field channels.",
  },
  rec_fields: {
    title: "The paddy fields turn green",
    body: "Fed by the reopened sluice, the dry paddies flooded and their rows came up green. Your own vegetable plots are now watered by the channels too.",
  },
  rec_harvest: {
    title: "A first harvest",
    body: "You planted, watered and harvested vegetables on the plots beside Amudha's field hut and shared the first baskets with her.",
  },
  rec_ruin_wall: {
    title: "The old brick wall is rebuilt",
    body: "Under Velan's eye you relaid the collapsed courses of the brick wall in the western ruins with stone and lime mortar.",
  },
  rec_ruin_pillar: {
    title: "A carved pillar stands again",
    body: "You levered the fallen pillar back onto its base and bedded the joint in mortar.",
  },
  rec_fragment: {
    title: "The lion frieze",
    body: "Raising the pillar revealed a carved frieze block with lotus petals and two lions - evidence of skilled carvers working here long ago.",
  },
  rec_path: {
    title: "The pavilion path is cleared",
    body: "You cut back the scrub that had swallowed the flagstone path to the old pavilion in the western ruins.",
  },
  rec_manuscript: {
    title: "The keepers' rota",
    body: "In the old pavilion you found a sealed palm-leaf manuscript: a rota naming which household cleaned the channels in which month. Elder Ponnan says it explains how the village kept its water for generations.",
  },
  rec_marker: {
    title: "The boundary stone",
    body: "At the corner of the north fields you read a boundary stone declaring that the reservoir's water belongs to the garden and the village households.",
  },
  rec_weaver: {
    title: "The weaver comes home",
    body: "You re-thatched and repaired the neglected house on the east lane. Meena the weaver has moved back in and her loom is working again.",
  },
  rec_festival: {
    title: "The lamp festival returns",
    body: "With water in the garden and fields, a working well and a loom weaving again, the settlement held its lamp festival for the first time in years. Your offering bundle opened the evening.",
  },
};

export const NOTICE_HINTS: Record<string, string> = {
  q_arrival: "Valli is looking for help just inside the main gate.",
  q_channel: "Amudha the gardener is worried about the garden's water.",
  q_garland: "Amudha would like a garland made for the gateway.",
  q_inscription: "Elder Ponnan wants someone to read an old stone for him.",
  q_home: "Valli has a house for you at the end of the west street.",
  q_well: "Selvam needs the bazaar well working again.",
  q_fields: "Amudha says the north fields need their sluice repaired.",
  q_harvest: "Amudha has garden plots to spare by her field hut.",
  q_wall: "Velan wants help with the western ruins.",
  q_manuscript: "Elder Ponnan has a lead on old writings in the western ruins.",
  q_weaver: "Valli hopes someone will fix the weaver's house.",
  q_festival: "Elder Ponnan is thinking about the lamp festival.",
  q_bangle: "Valli has lost a bangle near the temple tank.",
  q_chisel: "Velan is missing a chisel somewhere in the western ruins.",
};
