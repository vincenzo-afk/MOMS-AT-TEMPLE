// Runs the Blender asset build headlessly, then regenerates the manifest and validates every GLB.
// Usage: npm run assets [-- --only NAME,NAME | --group architecture|buildings|nature|characters]
// Set BLENDER to override the executable path.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [process.env.BLENDER, "D:/Blender/blender.exe", "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe", "blender"].filter(Boolean);
const blender = candidates.find((c) => c === "blender" || existsSync(c));
const extra = process.argv.slice(2);
console.log(`Using Blender: ${blender}`);
const r = spawnSync(blender, ["-b", "--factory-startup", "-P", join(root, "blender/scripts/build_assets.py"), "--", ...extra], { stdio: "inherit", cwd: root });
if (r.error) {
  console.error(`Could not start Blender (${r.error.message}). Set the BLENDER environment variable to blender.exe.`);
  process.exit(1);
}
const m = spawnSync(process.execPath, [join(root, "scripts/build-manifest.mjs")], { stdio: "inherit", cwd: root });
const v = spawnSync(process.execPath, [join(root, "scripts/validate-glb.mjs")], { stdio: "inherit", cwd: root });
process.exit(r.status || m.status || v.status || 0);
