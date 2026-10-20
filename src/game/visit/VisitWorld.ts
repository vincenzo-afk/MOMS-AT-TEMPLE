import * as THREE from "three";
import type { AssetLibrary } from "../core/AssetLibrary";
import type { Box, CollisionWorld } from "../world/CollisionWorld";
import type { TempleLayout } from "../../data/visit";

const DEG = Math.PI / 180;

/**
 * The props of one temple layout (auto-rickshaw, rails, stands, stations, the extra temples), built once and
 * switched on for a visit and off afterwards (hidden, colliders disabled), so story mode never sees them.
 */
export class VisitWorld {
  readonly group = new THREE.Group();
  readonly props = new Map<string, THREE.Object3D>();
  readonly sockets = new Map<string, THREE.Vector3>();
  /** FLAME_L1..L9 of the lamp stand, lit one by one */
  readonly lampFlames: THREE.Object3D[] = [];
  private boxes: Box[] = [];

  constructor(
    readonly layout: TempleLayout,
    assets: AssetLibrary,
    private collision: CollisionWorld,
  ) {
    this.group.name = `Visit_${layout.templeId}`;
    for (const p of layout.props) {
      if (!assets.has(p.asset)) continue;
      const obj = assets.instantiate(p.asset);
      obj.name = `visit_${p.key}`;
      const pos = this.resolvePlacement(p.key, p.pos);
      obj.position.copy(pos);
      obj.rotation.y = p.rotY * DEG;
      this.group.add(obj);
      obj.updateMatrixWorld(true);
      this.props.set(p.key, obj);
      obj.traverse((o) => {
        if (o.name.startsWith("SOCKET_")) this.sockets.set(`${p.key}.${o.name}`, o.getWorldPosition(new THREE.Vector3()));
        if (p.key === layout.lamps && o.name.startsWith("FLAME_L")) {
          this.lampFlames.push(o);
          o.visible = false;
        }
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        if (mesh.name.startsWith("COL_") || mesh.name.startsWith("WALK_")) {
          this.boxes.push(this.collision.addProxy(mesh.geometry, mesh.matrixWorld, mesh.name.startsWith("WALK_"), mesh.name));
        }
      });
    }
    this.lampFlames.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    this.setActive(false);
  }

  /** The bag and the calendar sit on the shelf inside the player's house (found from its collider). */
  private resolvePlacement(key: string, pos: [number, number, number]): THREE.Vector3 {
    const v = new THREE.Vector3(...pos);
    if (key !== "bag" && key !== "calendar") return v;
    let shelf: Box | null = null;
    for (const b of this.collision.boxes) {
      if (b.name !== "COL_Shelf") continue;
      if (Math.hypot(b.cx - pos[0], b.cz - pos[2]) < 6 && (!shelf || Math.hypot(b.cx - pos[0], b.cz - pos[2]) < Math.hypot(shelf.cx - pos[0], shelf.cz - pos[2]))) shelf = b;
    }
    if (!shelf) return v;
    // the shelf's thin axis points into the room; `pos` (the layout hint) is a point in the room
    const along = new THREE.Vector3();
    const across = new THREE.Vector3();
    this.collision.axes(shelf, along, across);
    const [thin, long, half, len] = shelf.hx < shelf.hz ? [along, across, shelf.hx, shelf.hz] : [across, along, shelf.hz, shelf.hx];
    const toRoom = Math.sign((pos[0] - shelf.cx) * thin.x + (pos[2] - shelf.cz) * thin.z) || 1;
    const base = new THREE.Vector3(shelf.cx, 0, shelf.cz);
    if (key === "bag") return base.addScaledVector(thin, toRoom * (half + 0.3)).addScaledVector(long, -len * 0.5).setY(shelf.yMin);
    // the calendar hangs on the shelf's front face, at eye level
    return base.addScaledVector(thin, toRoom * (half + 0.03)).addScaledVector(long, len * 0.5).setY(shelf.yMin + 1.25);
  }

  setActive(on: boolean): void {
    this.group.visible = on;
    for (const b of this.boxes) b.enabled = on;
  }

  socket(key: string, fallback: THREE.Vector3): THREE.Vector3 {
    return this.sockets.get(key) ?? fallback;
  }

  position(key: string): THREE.Vector3 {
    return this.props.get(key)?.position ?? new THREE.Vector3();
  }

  resetLamps(): void {
    for (const f of this.lampFlames) f.visible = false;
  }
}
