// Validates every exported GLB against public/assets/models/manifest.json expectations.
// Usage: node scripts/validate-glb.mjs [--file path.glb]
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const io = new NodeIO();

async function inspect(path) {
  const doc = await io.read(path);
  const r = doc.getRoot();
  const nodes = r.listNodes().map((n) => n.getName());
  const meshes = r.listMeshes();
  let triangles = 0;
  const uncoloured = [];
  // mesh name -> node names using it, so collision proxies can be excluded from the colour check
  const meshNodes = new Map();
  for (const n of r.listNodes()) if (n.getMesh()) meshNodes.set(n.getMesh(), [...(meshNodes.get(n.getMesh()) ?? []), n.getName()]);
  for (const m of meshes) {
    const proxy = (meshNodes.get(m) ?? []).every((n) => n.startsWith("COL_") || n.startsWith("WALK_"));
    for (const p of m.listPrimitives()) {
      const idx = p.getIndices();
      const pos = p.getAttribute("POSITION");
      triangles += (idx ? idx.getCount() : pos.getCount()) / 3;
      const col = p.getAttribute("COLOR_0");
      // A missing attribute, or one that is uniformly white (the exporter's placeholder when no active
      // colour attribute exists), means the asset would render as plain white.
      let allWhite = !!col;
      if (col) {
        const e = [];
        for (let i = 0; i < col.getCount() && allWhite; i += Math.max(1, Math.floor(col.getCount() / 200))) {
          col.getElement(i, e);
          if (e[0] < 0.999 || e[1] < 0.999 || e[2] < 0.999) allWhite = false;
        }
      }
      if (!proxy && (!col || allWhite)) uncoloured.push((meshNodes.get(m) ?? [m.getName()]).join("|"));
    }
  }
  const hasColor = uncoloured.length === 0;
  const animations = r.listAnimations().map((a) => ({
    name: a.getName(),
    channels: a.listChannels().length,
    duration: Math.max(0, ...a.listSamplers().map((s) => s.getInput()?.getMax([0])[0] ?? 0)),
  }));
  return {
    bytes: statSync(path).size,
    nodes,
    triangles,
    hasColor,
    uncoloured,
    materials: r.listMaterials().map((m) => m.getName()),
    skins: r.listSkins().map((s) => ({ name: s.getName(), joints: s.listJoints().map((j) => j.getName()) })),
    animations,
  };
}

const args = process.argv.slice(2);
if (args[0] === "--file") {
  console.log(JSON.stringify(await inspect(args[1]), null, 2));
  process.exit(0);
}

const manifestPath = join(root, "public/assets/models/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
let failures = 0;
const results = [];
// every character must share the player's skeleton node-for-node (shared clips are retargeted by bone name)
const playerEntry = manifest.assets.find((a) => a.id === "CHR_Player_Base");
const playerJoints = playerEntry && existsSync(join(root, "public", playerEntry.url)) ? (await inspect(join(root, "public", playerEntry.url))).skins[0]?.joints.join(",") : null;
for (const a of manifest.assets) {
  const file = join(root, "public", a.url);
  const problems = [];
  if (!existsSync(file)) {
    problems.push("file missing");
  } else {
    const info = await inspect(file);
    for (const n of a.expect?.nodes ?? []) if (!info.nodes.some((x) => x === n || x.startsWith(n))) problems.push(`missing node ${n}`);
    for (const c of a.expect?.animations ?? []) if (!info.animations.some((x) => x.name === c)) problems.push(`missing animation ${c}`);
    if (a.expect?.skinned && info.skins.length === 0) problems.push("no skin");
    if (a.type === "character" && playerJoints && info.skins[0]?.joints.join(",") !== playerJoints) problems.push("skeleton differs from CHR_Player_Base (shared clips would not apply)");
    if (!info.hasColor) problems.push(`visible meshes without vertex colours: ${info.uncoloured.join(", ")}`);
    if (info.bytes > (a.expect?.maxBytes ?? 2_000_000)) problems.push(`file too large (${info.bytes} bytes)`);
    if (info.triangles > (a.expect?.maxTriangles ?? 60000)) problems.push(`too many triangles (${info.triangles})`);
    results.push({ id: a.id, bytes: info.bytes, triangles: info.triangles, animations: info.animations.length, problems });
  }
  if (problems.length) {
    failures++;
    console.error(`FAIL ${a.id}: ${problems.join("; ")}`);
  } else console.log(`ok   ${a.id}`);
}
writeFileSync(join(root, "blender/export_reports/glb_validation.json"), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
if (failures) {
  console.error(`${failures} asset(s) failed validation`);
  process.exit(1);
}
console.log(`${manifest.assets.length} assets validated`);
