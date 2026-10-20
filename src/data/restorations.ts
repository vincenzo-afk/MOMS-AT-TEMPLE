import type { RestorationDefinition } from "../game/core/types";

export const RESTORATIONS: RestorationDefinition[] = [
  {
    id: "rest_channel_east",
    name: "Garden irrigation channel",
    locationId: "loc_garden",
    initialState: "blocked",
    states: ["blocked", "flowing"],
    restoredState: "flowing",
    requiredMaterials: [
      { itemId: "channel_stone", quantity: 4 },
      { itemId: "lime_mortar", quantity: 1 },
    ],
    prerequisites: [{ type: "flag", id: "channel_inspected", value: true }],
    resultingWorldFlags: ["channel_east_flowing"],
    recordEventType: "restoration",
    descriptionKey: "rec_channel",
    causeEventIds: [],
    interactableId: "int_channel_east",
    inspectFlag: "channel_inspected",
    inspectText: {
      before: [
        "A section of the channel wall has collapsed inward. Fallen blocks and packed silt choke the flow, and the water pools uselessly on the tank side.",
        "Rebuilding it will take dressed stone and lime mortar.",
      ],
      after: ["Clear water runs between the rebuilt stone walls and spills into the garden beds."],
    },
  },
  {
    id: "rest_garden_main",
    name: "Settlement flower garden",
    locationId: "loc_garden",
    initialState: "withered",
    states: ["withered", "recovering"],
    restoredState: "recovering",
    requiredMaterials: [],
    prerequisites: [],
    resultingWorldFlags: ["garden_blooming"],
    recordEventType: "consequence",
    descriptionKey: "rec_garden",
    triggeredByFlags: ["channel_east_flowing"],
    causeEventIds: ["restoration:rest_channel_east"],
  },
];
