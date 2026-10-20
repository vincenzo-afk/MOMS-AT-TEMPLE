import * as THREE from "three";
import type { AssetLibrary } from "../core/AssetLibrary";
import { CollisionWorld, type Box } from "./CollisionWorld";
import { createWaterMaterial } from "./Water";
import { applyDetail } from "./DetailMaterials";
import { NAV_EDGES, NAV_NODES, PLACEMENTS, WORLD_BOUNDS, type Placement } from "../../data/level";

export interface StateCollider {
  box: Box;
  placementId: string;
  state: string;
}

/** A hinged door leaf: the leaf rotates about its origin (the hinge); the doorway collider blocks while closed. */
export interface DoorRuntime {
  leaf: THREE.Object3D;
  baseRotY: number;
  opens: number; // +1 / -1
  angle: number; // current opening, 0..1
  collider: Box | null;
}

/** Instanced trees for one 60 m cell, with a full and a distant version. */
export interface LodChunk {
  center: THREE.Vector3;
  near: THREE.Object3D[];
  far: THREE.Object3D[];
}

export interface LevelHandles {
  root: THREE.Group;
  collision: CollisionWorld;
  byId: Map<string, THREE.Object3D>;
  sockets: Map<string, THREE.Vector3>;
  stateColliders: StateCollider[];
  flames: THREE.Object3D[];
  water: THREE.ShaderMaterial;
  doors: Map<string, DoorRuntime>;
  /** hinged lids (LID_* nodes) by placement id */
  lids: Map<string, { node: THREE.Object3D; baseRotX: number }>;
  lodChunks: LodChunk[];
  /** World positions of water surfaces (for spatial water ambience). */
  waterPoints: THREE.Vector3[];
  stats: { placements: number; instancedDraws: number; colliders: number };
}

const LOD_DISTANCE = 60;

/** Show full-detail trees near the camera and the LOD1 versions farther away. */
export function updateLod(level: LevelHandles, cameraPos: THREE.Vector3): void {
  for (const c of level.lodChunks) {
    const near = c.center.distanceTo(cameraPos) < LOD_DISTANCE;
    for (const o of c.near) o.visible = near;
    for (const o of c.far) o.visible = !near;
  }
}

const DEG = Math.PI / 180;
/** Flat or tiny assets whose shadows are not worth the shadow-pass cost. */
const NO_SHADOW = /^(PRP_Grass|PRP_Ground_Cover|PRP_Kolam|ENV_Paving|PRP_Pottery_Shards|PRP_Festival_Bunting)/;

/** "WATER_STATE_irrigated", "STATE_restored_Roof", "STATE_dry" -> the state name, else null. */
export function stateOfNode(name: string): string | null {
  const m = /STATE_([a-z]+)/.exec(name);
  return m ? m[1]! : null;
}

function placementMatrix(p: Placement): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const s = p.scale ?? 1;
  m.compose(new THREE.Vector3(...p.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (p.rotY ?? 0) * DEG), new THREE.Vector3(s, s, s));
  return m;
}

/** Builds the settlement from src/data/level.ts using the exported Blender GLBs. */
export function buildLevel(assets: AssetLibrary): LevelHandles {
  const root = new THREE.Group();
  root.name = "Level";
  const collision = new CollisionWorld();
  const byId = new Map<string, THREE.Object3D>();
  const sockets = new Map<string, THREE.Vector3>();
  const stateColliders: StateCollider[] = [];
  const flames: THREE.Object3D[] = [];
  const water = createWaterMaterial();
  const doors = new Map<string, DoorRuntime>();
  const lids = new Map<string, { node: THREE.Object3D; baseRotX: number }>();
  const lodChunks: LodChunk[] = [];
  const waterPoints: THREE.Vector3[] = [];
  let instancedDraws = 0;

  root.add(buildGround());

  // ---- instanced placements, grouped by asset and 60 m cell so frustum culling can skip distant chunks
  const CELL = 60;
  const groups = new Map<string, Placement[]>();
  for (const p of PLACEMENTS) {
    if (p.instanced && assets.has(p.asset)) {
      const key = `${p.asset}|${Math.floor(p.pos[0] / CELL)}|${Math.floor(p.pos[2] / CELL)}`;
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
  }
  const instanceAll = (assetId: string, matrices: THREE.Matrix4[], withColliders: boolean): THREE.Object3D[] => {
    const out: THREE.Object3D[] = [];
    const template = assets.get(assetId)!.gltf.scene;
    template.updateMatrixWorld(true);
    template.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name.startsWith("COL_") || mesh.name.startsWith("WALK_")) {
        if (withColliders) for (const m of matrices) collision.addProxy(mesh.geometry, m.clone().multiply(mesh.matrixWorld), mesh.name.startsWith("WALK_"), mesh.name);
        return;
      }
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
      matrices.forEach((m, i) => inst.setMatrixAt(i, m.clone().multiply(mesh.matrixWorld)));
      inst.castShadow = !NO_SHADOW.test(assetId); // the renderer's shadow switch turns all shadows off on low
      inst.receiveShadow = true;
      inst.name = `${assetId}__instanced`;
      inst.computeBoundingSphere();
      root.add(inst);
      out.push(inst);
      instancedDraws++;
    });
    return out;
  };
  for (const [key, list] of groups) {
    const assetId = key.split("|")[0]!;
    const matrices = list.map(placementMatrix);
    const near = instanceAll(assetId, matrices, true);
    const lodId = `${assetId}_LOD1`;
    if (assets.has(lodId)) {
      const far = instanceAll(lodId, matrices, false);
      const center = list.reduce((acc, p) => acc.add(new THREE.Vector3(...p.pos)), new THREE.Vector3()).multiplyScalar(1 / list.length);
      for (const o of far) o.visible = false;
      lodChunks.push({ center, near, far });
    }
  }

  // ---- unique placements
  for (const p of PLACEMENTS) {
    if (p.instanced && assets.has(p.asset)) continue;
    const obj = assets.instantiate(p.asset);
    obj.name = p.id ?? p.asset;
    obj.position.set(...p.pos);
    obj.rotation.y = (p.rotY ?? 0) * DEG;
    obj.scale.setScalar(p.scale ?? 1);
    root.add(obj);
    obj.updateMatrixWorld(true);
    if (p.id) byId.set(p.id, obj);
    const skipColliders = p.id === "channel_restored"; // shares its footprint with channel_blocked
    obj.traverse((o) => {
      if (o.name.startsWith("SOCKET_") && p.id) sockets.set(`${p.id}.${o.name}`, o.getWorldPosition(new THREE.Vector3()));
      if (o.name.startsWith("FLAME_")) flames.push(o);
      if (o.name.startsWith("LID_") && p.id) lids.set(p.id, { node: o, baseRotX: o.rotation.x });
      if (o.name.startsWith("DOOR_") && p.id) {
        const key = `${p.id}.${o.name.slice(5)}`;
        const prev = doors.get(key);
        doors.set(key, { leaf: o, baseRotY: o.rotation.y, opens: Number((o.userData as { opens?: number }).opens ?? 1) || 1, angle: 0, collider: prev?.collider ?? null });
      }
      const st = stateOfNode(o.name);
      if (p.state && st && !o.name.startsWith("COL_")) o.visible = st === p.state; // decorative copies show one fixed state
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name.startsWith("COL_") || mesh.name.startsWith("WALK_")) {
        if (skipColliders) return;
        const box = collision.addProxy(mesh.geometry, mesh.matrixWorld, mesh.name.startsWith("WALK_"), mesh.name);
        if (mesh.name.startsWith("COL_DOOR_") && p.id) {
          const key = `${p.id}.${mesh.name.slice(9)}`;
          const d = doors.get(key);
          if (d) d.collider = box;
          else doors.set(key, { leaf: new THREE.Object3D(), baseRotY: 0, opens: 1, angle: 0, collider: box });
          return;
        }
        const state = (mesh.userData as { state?: string }).state;
        if (state && p.id) stateColliders.push({ box, placementId: p.id, state });
        else if (state && p.state) box.enabled = state === p.state;
      } else if (mesh.name.startsWith("WATER_")) {
        mesh.material = water;
        waterPoints.push(mesh.getWorldPosition(new THREE.Vector3()));
        mesh.castShadow = false;
        mesh.renderOrder = 2;
      } else if (NO_SHADOW.test(p.asset) || (p.id?.startsWith("paddy_") && mesh.name.startsWith("STATE_"))) {
        mesh.castShadow = false;
      }
    });
  }

  // ---- world boundary (invisible)
  const W = WORLD_BOUNDS;
  for (const [cx, cz, hx, hz] of [[0, -W, W, 1], [0, W, W, 1], [-W, 0, 1, W], [W, 0, 1, W]] as Array<[number, number, number, number]>)
    collision.add({ cx, cz, hx, hz, cos: 1, sin: 0, yMin: -1, yMax: 10, walk: false, name: "BOUNDARY" });

  return { root, collision, byId, sockets, stateColliders, flames, water, doors, lids, lodChunks, waterPoints, stats: { placements: PLACEMENTS.length, instancedDraws, colliders: collision.boxes.length } };
}

/** Earth ground with vertex-colour variation, worn paths along the navigation graph and greener field margins. */
function buildGround(): THREE.Mesh {
  const size = WORLD_BOUNDS * 2 + 40;
  const seg = 190;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const earth = new THREE.Color(0x8a6a48);
  const grass = new THREE.Color(0x6f7a3c);
  const path = new THREE.Color(0xb39a78);
  const field = new THREE.Color(0x5f7a32);
  const c = new THREE.Color();
  const segs = NAV_EDGES.map(([a, b]) => [NAV_NODES[a]!, NAV_NODES[b]!] as const);
  const noise = (x: number, z: number) => Math.sin(x * 0.37 + Math.cos(z * 0.21) * 2) * 0.5 + Math.sin(z * 0.29 - x * 0.13) * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = noise(x, z);
    c.copy(earth).lerp(grass, THREE.MathUtils.clamp(0.45 + n * 0.35, 0, 1));
    const inside = Math.abs(x) < 46 && Math.abs(z) < 46;
    if (!inside) c.lerp(field, THREE.MathUtils.clamp(0.45 + n * 0.3, 0, 0.8));
    let dmin = Infinity;
    for (const [a, b] of segs) dmin = Math.min(dmin, distToSeg(x, z, a[0], a[1], b[0], b[1]));
    if (Math.abs(x) < 3.5 && z > 30 && z < WORLD_BOUNDS) dmin = 0; // approach road
    if (Math.abs(z - 10) < 3.5 && x > 40 && x < 130) dmin = Math.min(dmin, 0.5); // bazaar street
    if (dmin < 2.4) c.lerp(path, (1 - dmin / 2.4) * 0.85);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    const r = Math.max(Math.abs(x), Math.abs(z));
    pos.setY(i, r > WORLD_BOUNDS + 2 ? (r - WORLD_BOUNDS) * 0.18 : -0.01);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 });
  applyDetail(mat, "GROUND", false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = "Ground";
  return mesh;
}

function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
