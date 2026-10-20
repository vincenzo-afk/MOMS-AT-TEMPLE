import * as THREE from "three";
import type { GameSession } from "../core/GameSession";
import type { InteractableDef, InteractionAction } from "../core/interactables";
import type { CollisionWorld } from "../world/CollisionWorld";

export interface Candidate {
  def: InteractableDef;
  position: THREE.Vector3;
  actions: InteractionAction[];
  distance: number;
  faceY?: number;
}

export interface InteractableSource {
  def: InteractableDef;
  position: () => THREE.Vector3;
  faceY?: number;
  /** Return false to make the source temporarily unavailable (e.g. an NPC indoors for the night). */
  available?: () => boolean;
  /** Custom verbs (Temple Visit stations); otherwise the GameSession decides from the kind. */
  actions?: () => InteractionAction[];
}

const tmpO = new THREE.Vector3();
const fwd = new THREE.Vector2();
const GROUND = [0.7, 1.5];
const RAISED = [0, 0.25];
const tmpD = new THREE.Vector3();

/**
 * Finds the best interactable near the player. Every interactable declares its kind, range and reference id;
 * the GameSession decides which verbs are available. Eligibility = in range + similar height + clear line of
 * sight (walls between the player and the target block it). Nothing is hardcoded per object.
 */
export class InteractionSystem {
  private sources: InteractableSource[] = [];
  focus: Candidate | null = null;
  /** Optional mode filter (a Temple Visit offers only its stations, doors and seats). */
  filter: ((def: InteractableDef) => boolean) | null = null;

  constructor(
    private session: GameSession,
    private collision?: CollisionWorld,
  ) {}

  register(src: InteractableSource): void {
    this.sources.push(src);
  }

  /** Remove sources (a finished Temple Visit takes its stations with it). */
  unregister(match: (src: InteractableSource) => boolean): void {
    this.sources = this.sources.filter((s) => !match(s));
    if (this.focus && match({ def: this.focus.def, position: () => this.focus!.position })) this.focus = null;
  }

  /**
   * Line of sight from the player's chest to the target at waist or shoulder height (so a trader behind a
   * counter stays reachable while walls block); the target's own collider may be hit at its edge.
   */
  private visible(from: THREE.Vector3, to: THREE.Vector3, dist: number): boolean {
    if (!this.collision) return true;
    tmpO.copy(from);
    tmpO.y += 1.3;
    // ground-level targets: waist and shoulder height; raised ones (a wall calendar, a shelf): the target itself
    const raised = to.y - from.y > 0.6;
    for (const h of raised ? RAISED : GROUND) {
      tmpD.copy(to);
      tmpD.y += h;
      tmpD.sub(tmpO);
      const len = tmpD.length();
      if (len < 0.01) return true;
      const hit = this.collision.raycast(tmpO, tmpD.normalize(), len);
      if (hit >= len - Math.min(0.9, dist * 0.6)) return true;
    }
    return false;
  }

  update(playerPos: THREE.Vector3, playerYaw: number): Candidate | null {
    let best: Candidate | null = null;
    let bestScore = Infinity;
    fwd.set(Math.sin(playerYaw), Math.cos(playerYaw));
    for (const src of this.sources) {
      if (this.filter && !this.filter(src.def)) continue;
      if (src.available && !src.available()) continue;
      const pos = src.position();
      const dx = pos.x - playerPos.x;
      const dz = pos.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > src.def.radius || Math.abs(pos.y - playerPos.y) > 1.6) continue;
      const facing = dist > 0.01 ? (dx * fwd.x + dz * fwd.y) / dist : 1;
      const score = dist * (1.6 - facing * 0.6);
      if (score >= bestScore) continue;
      if (!this.visible(playerPos, pos, dist)) continue;
      const actions = src.actions ? src.actions() : this.session.actionsFor(src.def);
      if (!actions.length) continue;
      bestScore = score;
      best = { def: src.def, position: pos, actions, distance: dist, faceY: src.faceY };
    }
    this.focus = best;
    return best;
  }
}
