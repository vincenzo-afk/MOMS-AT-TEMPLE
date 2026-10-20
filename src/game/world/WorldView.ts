import type * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import { stateOfNode, type LevelHandles } from "./Level";
import { INTERACTABLES, VISUAL_BINDINGS } from "../../data/level";

/**
 * Applies the authoritative GameState to the 3D scene: restoration variants, STATE_ children (and their
 * state-dependent colliders), PICK_ nodes for gatherables, farm plot stages, home decorations and festival
 * dressing. Runs on every state change (and after load), so visuals can never drift from the save file.
 */
export class WorldView {
  private restorationOf = new Map<string, string>();

  constructor(
    private session: GameSession,
    private level: LevelHandles,
  ) {
    for (const b of VISUAL_BINDINGS) if ("restorationId" in b) this.restorationOf.set(b.placementId, b.restorationId);
  }

  private showState(obj: THREE.Object3D, state: string): void {
    obj.traverse((o) => {
      if (o.name.startsWith("COL_")) return;
      const st = stateOfNode(o.name);
      if (st) o.visible = st === state;
    });
  }

  apply(): void {
    const s = this.session.state;
    for (const b of VISUAL_BINDINGS) {
      const obj = this.level.byId.get(b.placementId);
      if (!obj) continue;
      if ("flag" in b) {
        obj.visible = s.flags[b.flag] === true;
      } else if ("plotId" in b) {
        this.showState(obj, s.plots[b.plotId]?.stage ?? "empty");
      } else if ("decorSlot" in b) {
        obj.visible = !!s.decor[b.decorSlot];
      } else {
        const state = s.restorations[b.restorationId] ?? "";
        if (b.visibleInState) obj.visible = state === b.visibleInState;
        else this.showState(obj, state);
      }
    }
    for (const sc of this.level.stateColliders) {
      const rid = this.restorationOf.get(sc.placementId);
      sc.box.enabled = rid ? s.restorations[rid] === sc.state : true;
    }
    // gatherable visuals: PICK_ nodes show while any linked node is available
    const avail = new Map<string, boolean>();
    for (const it of INTERACTABLES) {
      if (it.kind !== "gather" || !it.visualId) continue;
      avail.set(it.visualId, (avail.get(it.visualId) ?? false) || this.session.isNodeAvailable(it.refId));
    }
    for (const [id, on] of avail) {
      this.level.byId.get(id)?.traverse((o) => {
        if (o.name.startsWith("PICK_")) o.visible = on;
      });
    }
    // the manuscript leaves the case once it has been taken
    this.level.byId.get("manuscript")?.traverse((o) => {
      if (o.name.startsWith("PICK_")) o.visible = !s.discoveries.includes("disc_palm_manuscript");
    });
  }
}
