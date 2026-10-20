export interface DiscoveryDefinition {
  id: string;
  interactableId: string;
  locationId: string;
  descriptionKey: string;
  title: string;
  reading: string[];
}

export const DISCOVERIES: DiscoveryDefinition[] = [
  {
    id: "disc_channel_inscription",
    interactableId: "int_inscription",
    locationId: "loc_forgotten",
    descriptionKey: "rec_inscription",
    title: "Inscribed stone",
    reading: [
      "The carving is worn but legible where the moss has been pulled away.",
      "\"After the years without rain, the people of this village, every household together, cut this channel from the great tank to the flower garden.",
      "Let each household keep it in turn, clearing the silt in the month of Thai, so that the garden never thirsts.\"",
    ],
  },
];
