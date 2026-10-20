import type { Condition } from "../game/core/types";

export interface DiscoveryDefinition {
  id: string;
  interactableId: string;
  locationId: string;
  descriptionKey: string;
  title: string;
  reading: string[];
  /** Discovery can only be found while these hold (e.g. the path must be cleared first). */
  conditions: Condition[];
  /** Picking up the find gives this item (once). */
  givesItem?: string;
  causeEventIds: string[];
}

// Inscription texts are fiction written for the game, not translations of real inscriptions.
export const DISCOVERIES: DiscoveryDefinition[] = [
  {
    id: "disc_casting_ledger",
    interactableId: "int_casting_ledger",
    locationId: "loc_workshop",
    descriptionKey: "rec_ledger",
    title: "Kamala's mould ledger",
    conditions: [{ type: "flag", id: "casting_inspected", value: true }],
    causeEventIds: [],
    reading: [
      "Palm leaves tied between two boards, the writing small and quick. Each line is a lamp: who asked for it, the weight of brass, the festival.",
      "\"Five-faced kuthuvilakku for the weaver's daughter's wedding. Two hand-lamps for the well-house shrine. Forty agal for the temple walls at Karthigai, as every year.\"",
      "The last leaf has only a date and the word Karthigai. Nothing was written after it.",
    ],
  },
  {
    id: "disc_channel_inscription",
    interactableId: "int_inscription",
    locationId: "loc_forgotten",
    descriptionKey: "rec_inscription",
    title: "Inscribed stone",
    conditions: [],
    causeEventIds: [],
    reading: [
      "The carving is worn but legible where the moss has been pulled away.",
      "\"After the years without rain, the people of this village, every household together, cut this channel from the great tank to the flower garden.",
      "Let each household keep it in turn, clearing the silt in the month of Thai, so that the garden never thirsts.\"",
    ],
  },
  {
    id: "disc_carved_fragment",
    interactableId: "int_fragment",
    locationId: "loc_ruins",
    descriptionKey: "rec_fragment",
    title: "Carved frieze fragment",
    conditions: [{ type: "restoration", id: "rest_ruin_pillar", state: "standing" }],
    causeEventIds: ["restoration:rest_ruin_pillar"],
    reading: [
      "Lifting the pillar has exposed a block that was lying face-down beneath it.",
      "A band of lotus petals runs along the top. Below, two lions face each other across a round medallion, their manes cut in neat curls.",
      "Velan will want to see the chisel work. Whoever carved this was very good.",
    ],
  },
  {
    id: "disc_palm_manuscript",
    interactableId: "int_manuscript",
    locationId: "loc_ruins",
    descriptionKey: "rec_manuscript",
    title: "Sealed manuscript case",
    conditions: [{ type: "restoration", id: "rest_old_path", state: "cleared" }],
    givesItem: "palm_leaf_manuscript",
    causeEventIds: ["restoration:rest_old_path", "discovery:disc_channel_inscription"],
    reading: [
      "On a stone stand in the pavilion sits a bamboo case, its ends sealed with old red wax.",
      "Inside, wrapped in cloth, is a bundle of palm-leaf folios between two wooden boards.",
      "The first leaf lists households by name, each with a month beside it - a rota.",
    ],
  },
  {
    id: "disc_marker_stone",
    interactableId: "int_marker",
    locationId: "loc_fields",
    descriptionKey: "rec_marker",
    title: "Weathered boundary stone",
    conditions: [],
    causeEventIds: [],
    reading: [
      "A rounded stone half-sunk at the corner of the fields, green with moss.",
      "\"These fields are watered from the reservoir for the flower garden and the households of this village. Whoever blocks the water owes the village.\"",
    ],
  },
];
