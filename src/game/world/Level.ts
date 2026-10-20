import * as THREE from "three";
import type { AssetLibrary } from "../core/AssetLibrary";
import { CollisionWorld } from "./CollisionWorld";
import { createWaterMaterial } from "./Water";
import { NAV_EDGES, NAV_NODES, PLACEMENTS, WORLD_BOUNDS, type Placement } from "../../data/level";

export interface LevelHandles {
  root: THREE.Group;
  collision: CollisionWorld;
  byId: Map<string, THREE.Object3D>;
  sockets: Map<string, THREE.Vector3>;
  water: THREE.ShaderMaterial;
  stats: { placements: number; instancedDraws: number; colliders: number };
}

const DEG = Math.PI / 180;

function placementMatrix(p: Placement): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const s = p.scale ?? 1;
  m.compose(new THREE.Vector3(...p.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (p.rotY ?? 0) * DEG), new THREE.Vector3(s, s, s));
  return m;
}

/** Builds the settlement from src/data/level.ts using the exported Blender GLBs. */
export function buildLevel(assets: AssetLibrary, quality: "low" | "medium" | "high"): LevelHandles {
  const root = new THREE.Group();
  root.name = "Level";
  const collision = new CollisionWorld();
  const byId = new Map<string, THREE.Object3D>();
  const sockets = new Map<string, THREE.Vector3>();
  const water = createWaterMaterial();
  let instancedDraws = 0;

  root.add(buildGround());

  // ---- instanced placements, grouped by asset
  const groups = new Map<string, Placement[]>();
  for (const p of PLACEMENTS) {
    if (p.instanced && assets.has(p.asset)) {
      const list = groups.get(p.asset) ?? [];
      list.push(p);
      groups.set(p.asset, list);
    }
  }
  for (const [assetId, list] of groups) {
    const template = assets.get(assetId)!.gltf.scene;
    template.updateMatrixWorld(true);
    const matrices = list.map(placementMatrix);
    template.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name.startsWith("COL_") || mesh.name.startsWith("WALK_")) {
        for (const m of matrices) collision.addProxy(mesh.geometry, m.clone().multiply(mesh.matrixWorld), mesh.name.startsWith("WALK_"), mesh.name);
        return;
      }
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
      matrices.forEach((m, i) => inst.setMatrixAt(i, m.clone().multiply(mesh.matrixWorld)));
      inst.castShadow = quality !== "low" && !assetId.startsWith("PRP_Grass");
      inst.receiveShadow = true;
      inst.name = `${assetId}__instanced`;
      inst.computeBoundingSphere();
      root.add(inst);
      instancedDraws++;
    });
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
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name.startsWith("COL_") || mesh.name.startsWith("WALK_")) {
        if (!skipColliders) collision.addProxy(mesh.geometry, mesh.matrixWorld, mesh.name.startsWith("WALK_"), mesh.name);
      } else if (mesh.name.startsWith("WATER_")) {
        mesh.material = water;
        mesh.castShadow = false;
        mesh.renderOrder = 2;
      } else if (quality === "low") {
        mesh.castShadow = false;
      }
    });
  }

  // ---- world boundary (invisible): keeps the player near the settlement approach
  const W = WORLD_BOUNDS;
  for (const [cx, cz, hx, hz] of [[0, -W, W, 1], [0, W, W, 1], [-W, 0, 1, W], [W, 0, 1, W]] as Array<[number, number, number, number]>)
    collision.add({ cx, cz, hx, hz, cos: 1, sin: 0, yMin: -1, yMax: 10, walk: false, name: "BOUNDARY" });

  return { root, collision, byId, sockets, water, stats: { placements: PLACEMENTS.length, instancedDraws, colliders: collision.boxes.length } };
}

/** Earth ground with vertex-colour variation and worn paths along the NPC navigation graph. */
function buildGround(): THREE.Mesh {
  const size = 160;
  const seg = 160;
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
    if (!inside) c.lerp(field, THREE.MathUtils.clamp(0.5 + n * 0.3, 0, 0.85));
    let dmin = Infinity;
    for (const [a, b] of segs) dmin = Math.min(dmin, distToSeg(x, z, a[0], a[1], b[0], b[1]));
    dmin = Math.min(dmin, Math.abs(x) < 3.5 && z > 30 && z < 70 ? 0 : Infinity); // approach road
    if (dmin < 2.2) c.lerp(path, (1 - dmin / 2.2) * 0.85);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    pos.setY(i, inside ? 0 : Math.max(0, (Math.hypot(x, z) - 75) * 0.08) - 0.01);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
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
