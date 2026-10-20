// Removes redundant animation keyframes from animated GLBs (lossless within a tiny tolerance).
// Clips key every bone on every sample, but most finger and leg channels are constant or linear for
// long stretches; resampling drops those keys. Usage: node scripts/optimize-animations.mjs
import { NodeIO } from "@gltf-transform/core";
import { resample, dedup, prune } from "@gltf-transform/functions";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public/assets/models/characters");
const io = new NodeIO();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".glb"))) {
  const path = join(dir, f);
  const doc = await io.read(path);
  if (doc.getRoot().listAnimations().length === 0) continue;
  const before = statSync(path).size;
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepLeaves: true, keepAttributes: true }));
  // Translation/scale channels that hold a bone exactly at its rest value in every key carry no motion; most
  // of the file was their JSON metadata. Dropping them is safe because no clip animates them, so bones simply
  // keep their rest translation and scale.
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const target = ch.getTargetPath();
      const node = ch.getTargetNode();
      if ((target !== "translation" && target !== "scale") || !node) continue;
      const rest = target === "scale" ? node.getScale() : node.getTranslation();
      const v = ch.getSampler()?.getOutput()?.getArray();
      if (!v) continue;
      let constant = true;
      for (let i = 0; i < v.length && constant; i++) if (Math.abs(v[i] - rest[i % 3]) > 1e-5) constant = false;
      if (constant) {
        const sampler = ch.getSampler();
        ch.dispose();
        if (sampler && sampler.listParents().every((p) => p === anim || p.propertyType === "Root")) sampler.dispose();
      }
    }
  }
  await doc.transform(prune({ keepLeaves: true, keepAttributes: true }));
  // rotation keys as normalized int16 (glTF core allows it; 1/32767 precision, about 0.002 degrees)
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      if (ch.getTargetPath() !== "rotation") continue;
      const out = ch.getSampler()?.getOutput();
      const src = out?.getArray();
      if (!out || !(src instanceof Float32Array)) continue;
      const q = new Int16Array(src.length);
      for (let i = 0; i < src.length; i++) q[i] = Math.round(Math.max(-1, Math.min(1, src[i])) * 32767);
      out.setArray(q).setNormalized(true);
    }
  }
  await doc.transform(dedup());
  await io.write(path, doc);
  console.log(`optimized ${f}: ${(before / 1024).toFixed(0)} kB -> ${(statSync(path).size / 1024).toFixed(0)} kB`);
}
