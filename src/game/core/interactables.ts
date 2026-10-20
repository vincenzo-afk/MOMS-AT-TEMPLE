export type InteractableKind = "npc" | "gather" | "station" | "restoration" | "discovery" | "rest" | "plot" | "water" | "storage" | "decor" | "notice" | "sit" | "door" | "container" | "pickup";

export interface InteractableDef {
  id: string;
  kind: InteractableKind;
  refId: string; // npc id, gather node id, station id, restoration id or discovery id
  label: string;
  locationId: string;
  radius: number;
}

export type Verb = "talk" | "gather" | "craft" | "inspect" | "repair" | "read" | "rest" | "plant" | "water" | "harvest" | "fill" | "store" | "decorate" | "notices" | "sit" | "open" | "close" | "search" | "pickup";

export interface InteractionAction {
  verb: Verb;
  label: string;
  enabled: boolean;
  reason?: string;
}
