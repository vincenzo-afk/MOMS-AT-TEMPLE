import * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import type { InteractableDef, InteractionAction } from "../core/interactables";

export interface Candidate {
  def: InteractableDef;
  position: THREE.Vector3;
  actions: InteractionAction[];
  distance: number;
}

export interface InteractableSource {
  def: InteractableDef;
  position: () => THREE.Vector3;
}

/**
 * Finds the best interactable near the player. Every interactable declares its kind, range and
 * reference id; the GameSession decides which verbs are available. Nothing is hardcoded per object.
 */
export class InteractionSystem {
  private sources: InteractableSource[] = [];
  focus: Candidate | null = null;

  constructor(private session: GameSession) {}

  register(src: InteractableSource): void {
    this.sources.push(src);
  }

  update(playerPos: THREE.Vector3, playerYaw: number): Candidate | null {
    let best: Candidate | null = null;
    let bestScore = Infinity;
    const fwd = new THREE.Vector2(Math.sin(playerYaw), Math.cos(playerYaw));
    for (const src of this.sources) {
      const pos = src.position();
      const dx = pos.x - playerPos.x;
      const dz = pos.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > src.def.radius || Math.abs(pos.y - playerPos.y) > 1.6) continue;
      const facing = dist > 0.01 ? (dx * fwd.x + dz * fwd.y) / dist : 1;
      const score = dist * (1.6 - facing * 0.6);
      if (score < bestScore) {
        const actions = this.session.actionsFor(src.def);
        if (!actions.length) continue;
        bestScore = score;
        best = { def: src.def, position: pos, actions, distance: dist };
      }
    }
    this.focus = best;
    return best;
  }
}
