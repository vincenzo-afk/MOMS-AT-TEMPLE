// Player-facing text for locations and Living Record entries, keyed by stable IDs.

export const LOCATIONS: Record<string, string> = {
  loc_entrance: "Main gate",
  loc_courtyard: "Central courtyard",
  loc_temple: "Temple",
  loc_street: "West street",
  loc_market: "Market corner",
  loc_workshop: "Kamala's workshop",
  loc_garden: "Settlement garden",
  loc_claypit: "Clay bank",
  loc_forgotten: "Old grounds",
  loc_home: "Your house",
};

export const RECORD_TEXT: Record<string, { title: string; body: string }> = {
  rec_arrival: {
    title: "A newcomer is welcomed",
    body: "You arrived at the settlement and gathered jasmine for Valli's house front. Your first gift to the community.",
  },
  rec_channel: {
    title: "The garden channel flows again",
    body: "You salvaged granite from the old grounds, worked lime mortar at Kamala's bench and rebuilt the collapsed channel wall. Water from the old tank reaches the garden for the first time in three summers.",
  },
  rec_garden: {
    title: "The garden recovers",
    body: "With water in the channel again, the marigold beds in Murugan's garden turned green and began to flower.",
  },
  rec_inscription: {
    title: "The channel stone is read",
    body: "In the old grounds you found a carved stone recording that the whole village cut the garden channel together after a drought, and that every household kept it in turn.",
  },
  rec_garland: {
    title: "A garland on the gate",
    body: "Kamala taught you to string marigolds from the recovered garden into a garland. Valli hung it on the courtyard gate, the first in many years.",
  },
};
