import type * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import type { LevelHandles } from "./Level";
import { INTERACTABLES, VISUAL_BINDINGS } from "../../data/level";

/**
 * Applies the authoritative GameState to the 3D scene: restoration variants, STATE_ children,
 * PICK_ nodes for gatherables and flag-driven props. Runs on every state change (and after load),
 * so visuals can never drift from what the save file says.
 */
export class WorldView {
  constructor(
    private session: GameSession,
    private level: LevelHandles,
  ) {}

  apply(): void {
    const s = this.session.state;
    for (const b of VISUAL_BINDINGS) {
      const obj = this.level.byId.get(b.placementId);
      if (!obj) continue;
      if ("flag" in b) {
        obj.visible = s.flags[b.flag] === true;
        continue;
      }
      const state = s.restorations[b.restorationId];
      if (b.visibleInState) {
        obj.visible = state === b.visibleInState;
        continue;
      }
      obj.traverse((o) => {
        if (o.name.startsWith("STATE_")) o.visible = o.name === `STATE_${state}`;
      });
    }
    // gatherable visuals: PICK_ nodes show while any linked node is available
    const avail = new Map<string, boolean>();
    for (const it of INTERACTABLES) {
      if (it.kind !== "gather" || !it.visualId) continue;
      avail.set(it.visualId, (avail.get(it.visualId) ?? false) || this.session.isNodeAvailable(it.refId));
    }
    for (const [id, on] of avail) {
      const obj = this.level.byId.get(id);
      obj?.traverse((o: THREE.Object3D) => {
        if (o.name.startsWith("PICK_")) o.visible = on;
      });
    }
  }
}
