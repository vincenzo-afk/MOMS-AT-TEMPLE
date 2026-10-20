import * as THREE from "three";

/**
 * Lets an animated character be frustum culled (README §6.10, §11.5). A skinned mesh's bounds are not updated by
 * animation, so each mesh gets a fixed sphere: its bind-pose bounds, enlarged to cover raised arms, kneeling, sitting
 * and the hips' own motion in the clips. Movement through the world is the root object's transform, so it is covered.
 * Without this, every villager on the map is drawn every frame (and into the shadow map), seen or not.
 */
export function makeCharacterCullable(model: THREE.Object3D, grow = 1.6): void {
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    const g = mesh.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const sphere = g.boundingSphere!.clone();
    sphere.radius *= grow;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) (mesh as THREE.SkinnedMesh).boundingSphere = sphere;
    else g.boundingSphere = sphere;
    mesh.frustumCulled = true;
  });
}
