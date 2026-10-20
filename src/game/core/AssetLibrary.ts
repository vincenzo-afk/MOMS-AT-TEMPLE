import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export interface ModelManifestEntry {
  id: string;
  url: string;
  type: "environment" | "landmark" | "building" | "prop" | "character";
  triangles: number;
  bytes: number;
  clips?: Array<{ name: string; duration: number; loop: boolean }>;
}

export interface ModelManifest {
  generatedAt: string;
  assets: ModelManifestEntry[];
}

export interface LoadedModel {
  entry: ModelManifestEntry;
  gltf: GLTF;
}

export type AssetProblem = { id: string; message: string };

/**
 * Loads GLB models listed in public/assets/models/manifest.json. Missing or broken files are reported
 * and replaced by a clearly visible magenta fallback box so the world still loads.
 */
export class AssetLibrary {
  private loader = new GLTFLoader();
  private models = new Map<string, LoadedModel>();
  readonly problems: AssetProblem[] = [];
  manifest: ModelManifest | null = null;

  async loadManifest(url = "/assets/models/manifest.json"): Promise<ModelManifest> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Model manifest missing (${res.status}). Run "npm run assets" to build it.`);
    const data = (await res.json()) as ModelManifest;
    if (!Array.isArray(data.assets)) throw new Error("Model manifest is malformed.");
    this.manifest = data;
    return data;
  }

  async loadAll(ids: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
    if (!this.manifest) await this.loadManifest();
    let done = 0;
    const unique = [...new Set(ids)];
    await Promise.all(
      unique.map(async (id) => {
        const entry = this.manifest!.assets.find((a) => a.id === id);
        if (!entry) {
          this.problems.push({ id, message: "not listed in manifest" });
        } else {
          try {
            const gltf = await this.loader.loadAsync(entry.url);
            this.prepare(gltf);
            this.models.set(id, { entry, gltf });
          } catch (e) {
            this.problems.push({ id, message: `failed to load ${entry.url}: ${(e as Error).message}` });
          }
        }
        onProgress?.(++done, unique.length);
      }),
    );
    for (const p of this.problems) console.warn(`[assets] ${p.id}: ${p.message}`);
  }

  private prepare(gltf: GLTF): void {
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name;
      if (name.startsWith("COL_") || name.startsWith("WALK_")) {
        mesh.visible = false;
        return;
      }
      mesh.castShadow = !name.startsWith("WATER_");
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const sm = m as THREE.MeshStandardMaterial;
        if (sm.isMeshStandardMaterial) {
          sm.vertexColors = !!mesh.geometry.getAttribute("color");
          sm.envMapIntensity = 0.6;
          if (sm.name === "MAT_Foliage_A" || sm.name === "MAT_Cloth_A") sm.side = THREE.DoubleSide;
        }
      }
    });
  }

  has(id: string): boolean {
    return this.models.has(id);
  }

  get(id: string): LoadedModel | undefined {
    return this.models.get(id);
  }

  /** Independent copy of a model's scene graph (skinned meshes get their own skeleton). */
  instantiate(id: string): THREE.Object3D {
    const m = this.models.get(id);
    if (!m) return fallbackBox(id);
    return SkeletonUtils.clone(m.gltf.scene);
  }

  clips(id: string): THREE.AnimationClip[] {
    return this.models.get(id)?.gltf.animations ?? [];
  }
}

export function fallbackBox(id: string): THREE.Object3D {
  const g = new THREE.Group();
  g.name = `MISSING_${id}`;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }));
  mesh.position.y = 0.5;
  g.add(mesh);
  return g;
}
