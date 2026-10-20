import * as THREE from "three";

/** Oriented box (yaw-only) built from COL_/WALK_ proxy meshes exported from Blender. */
export interface Box {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  cos: number;
  sin: number;
  yMin: number;
  yMax: number;
  walk: boolean;
  name: string;
  /** State-dependent proxies (e.g. overgrowth) are switched off by WorldView. */
  enabled?: boolean;
}

const STEP = 0.36;
const tmpV = new THREE.Vector3();
const tmpRay = new THREE.Ray();
const tmpBox = new THREE.Box3();
const tmpSeen = new Set<Box>();

/** Result of {@link CollisionWorld.raycastHit}. */
export interface RayHit {
  dist: number;
  box: Box | null;
}

export class CollisionWorld {
  boxes: Box[] = [];
  private grid = new Map<string, Box[]>();
  private readonly cell = 8;

  /** Register a box proxy from its geometry's local bounds and a world matrix (yaw + uniform scale only). */
  addProxy(geo: THREE.BufferGeometry, matrixWorld: THREE.Matrix4, walk: boolean, name: string): Box {
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrixWorld.decompose(pos, quat, scale);
    const yaw = new THREE.Euler().setFromQuaternion(quat, "YXZ").y;
    const c = bb.getCenter(new THREE.Vector3()).applyMatrix4(matrixWorld);
    const size = bb.getSize(new THREE.Vector3()).multiply(scale);
    const box: Box = { cx: c.x, cz: c.z, hx: size.x / 2, hz: size.z / 2, cos: Math.cos(yaw), sin: Math.sin(yaw), yMin: c.y - size.y / 2, yMax: c.y + size.y / 2, walk, name };
    this.add(box);
    return box;
  }

  add(b: Box): void {
    this.boxes.push(b);
    const r = Math.hypot(b.hx, b.hz);
    for (let x = Math.floor((b.cx - r) / this.cell); x <= Math.floor((b.cx + r) / this.cell); x++)
      for (let z = Math.floor((b.cz - r) / this.cell); z <= Math.floor((b.cz + r) / this.cell); z++) {
        const k = `${x},${z}`;
        const list = this.grid.get(k);
        if (list) list.push(b);
        else this.grid.set(k, [b]);
      }
  }

  private near(x: number, z: number): Box[] {
    return this.grid.get(`${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`) ?? [];
  }

  private toLocal(b: Box, x: number, z: number): [number, number] {
    const dx = x - b.cx;
    const dz = z - b.cz;
    // inverse yaw rotation (Three.js yaw rotates +X toward -Z)
    return [dx * b.cos - dz * b.sin, dx * b.sin + dz * b.cos];
  }

  /** Highest walkable surface under (x, z) that can be reached from feetY (step-up limited). */
  groundHeight(x: number, z: number, feetY: number, margin = 0.05): number {
    let h = 0;
    for (const b of this.near(x, z)) {
      if (b.enabled === false || !b.walk || b.yMax > feetY + STEP) continue;
      const [lx, lz] = this.toLocal(b, x, z);
      if (Math.abs(lx) <= b.hx + margin && Math.abs(lz) <= b.hz + margin && b.yMax > h) h = b.yMax;
    }
    return h;
  }

  /** Push a vertical capsule (circle in XZ) out of blocking boxes. Returns the corrected position. */
  resolve(x: number, z: number, feetY: number, radius: number, height: number): [number, number] {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.near(x, z)) {
        if (b.enabled === false) continue;
        // Walkable surfaces block only when too high to step onto; obstacle proxies always block.
        const blocks = b.walk ? b.yMax > feetY + STEP : b.yMax > feetY + 0.05 && b.yMin < feetY + height;
        if (!blocks) continue;
        const [lx, lz] = this.toLocal(b, x, z);
        const qx = Math.max(-b.hx, Math.min(b.hx, lx));
        const qz = Math.max(-b.hz, Math.min(b.hz, lz));
        let dx = lx - qx;
        let dz = lz - qz;
        let d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        let push: number;
        if (d2 < 1e-8) {
          // centre inside the box: push out along the shallowest axis
          const ox = b.hx - Math.abs(lx);
          const oz = b.hz - Math.abs(lz);
          if (ox < oz) {
            dx = Math.sign(lx) || 1;
            dz = 0;
            push = ox + radius;
          } else {
            dx = 0;
            dz = Math.sign(lz) || 1;
            push = oz + radius;
          }
          d2 = 1;
        } else {
          const d = Math.sqrt(d2);
          dx /= d;
          dz /= d;
          push = radius - d;
        }
        // back to world
        const wx = dx * b.cos + dz * b.sin;
        const wz = -dx * b.sin + dz * b.cos;
        x += wx * push;
        z += wz * push;
        moved = true;
      }
      if (!moved) break;
    }
    return [x, z];
  }

  /** Distance along a ray to the first box hit (for camera collision), or Infinity. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
    return this.raycastHit(origin, dir, maxDist, scratchHit).dist;
  }

  /**
   * First box along a ray (no allocation: the result is written into `out`). Boxes containing the origin and
   * slabs thinner than `minThickness` (floor tiles) are ignored.
   */
  raycastHit(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, out: RayHit, minThickness = 0.3): RayHit {
    out.dist = Infinity;
    out.box = null;
    tmpSeen.clear();
    const steps = Math.ceil(maxDist / (this.cell / 2)) + 1;
    for (let i = 0; i <= steps; i++) {
      tmpV.copy(dir).multiplyScalar((maxDist * i) / steps).add(origin);
      for (const b of this.near(tmpV.x, tmpV.z)) tmpSeen.add(b);
    }
    for (const b of tmpSeen) {
      if (b.enabled === false || b.yMax - b.yMin < minThickness) continue;
      const [ox, oz] = this.toLocal(b, origin.x, origin.z);
      if (Math.abs(ox) < b.hx && Math.abs(oz) < b.hz && origin.y > b.yMin && origin.y < b.yMax) continue;
      const ldx = dir.x * b.cos - dir.z * b.sin;
      const ldz = dir.x * b.sin + dir.z * b.cos;
      tmpRay.origin.set(ox, origin.y, oz);
      tmpRay.direction.set(ldx, dir.y, ldz);
      tmpBox.min.set(-b.hx, b.yMin, -b.hz);
      tmpBox.max.set(b.hx, b.yMax, b.hz);
      const hit = tmpRay.intersectBox(tmpBox, tmpV);
      if (hit) {
        const d = hit.distanceTo(tmpRay.origin);
        if (d < out.dist && d <= maxDist) {
          out.dist = d;
          out.box = b;
        }
      }
    }
    return out;
  }

  /** Highest top (any enabled proxy) containing (x, z) with its top between y0 and y1, or -Infinity. */
  topAt(x: number, z: number, y0: number, y1: number, margin = 0): number {
    let h = -Infinity;
    for (const b of this.near(x, z)) {
      if (b.enabled === false || b.yMax < y0 || b.yMax > y1) continue;
      const [lx, lz] = this.toLocal(b, x, z);
      if (Math.abs(lx) <= b.hx + margin && Math.abs(lz) <= b.hz + margin && b.yMax > h) h = b.yMax;
    }
    return h;
  }

  /** True if the point is inside any enabled proxy (camera clipping checks). */
  inside(x: number, y: number, z: number, pad = 0): boolean {
    for (const b of this.near(x, z)) {
      if (b.enabled === false || b.yMax - b.yMin < 0.3) continue;
      if (y < b.yMin - pad || y > b.yMax + pad) continue;
      const [lx, lz] = this.toLocal(b, x, z);
      if (Math.abs(lx) < b.hx + pad && Math.abs(lz) < b.hz + pad) return true;
    }
    return false;
  }

  /** Is a vertical capsule at (x, z) from feetY to feetY + height free of blocking proxies? */
  clear(x: number, z: number, feetY: number, radius: number, height: number): boolean {
    for (const b of this.near(x, z)) {
      if (b.enabled === false) continue;
      const blocks = b.walk ? b.yMax > feetY + STEP && b.yMin < feetY + height : b.yMax > feetY + 0.05 && b.yMin < feetY + height;
      if (!blocks) continue;
      const [lx, lz] = this.toLocal(b, x, z);
      const qx = Math.max(-b.hx, Math.min(b.hx, lx));
      const qz = Math.max(-b.hz, Math.min(b.hz, lz));
      if ((lx - qx) ** 2 + (lz - qz) ** 2 < radius * radius) return false;
    }
    return true;
  }

  /** World-space local axes of a box: `along` is its local +X, `across` its local +Z (yaw only). */
  axes(b: Box, along: THREE.Vector3, across: THREE.Vector3): void {
    along.set(b.cos, 0, -b.sin);
    across.set(b.sin, 0, b.cos);
  }
}

const scratchHit: RayHit = { dist: Infinity, box: null };
