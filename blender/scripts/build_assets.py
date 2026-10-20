"""Build, export and preview Temple of Monks assets.

Usage (from the repo root):
  blender -b --factory-startup -P blender/scripts/build_assets.py -- [--only NAME[,NAME]] [--group GROUP] [--no-preview]
Exits with code 1 if any asset fails, so the npm wrapper reports failure honestly.
"""
import os
import sys
import json
import traceback

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from tom.core import reset_scene, render_preview, REPORT_OUT  # noqa: E402
import assets_architecture  # noqa: E402

GROUPS = {"architecture": assets_architecture.ASSETS}
for mod_name in ("assets_buildings", "assets_nature", "assets_props", "assets_characters"):
    try:
        mod = __import__(mod_name)
        GROUPS[mod_name.replace("assets_", "")] = mod.ASSETS
    except ModuleNotFoundError as e:
        if e.name != mod_name:
            raise

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
only = None
group = None
preview = "--no-preview" not in argv
if "--only" in argv:
    only = set(argv[argv.index("--only") + 1].split(","))
if "--group" in argv:
    group = argv[argv.index("--group") + 1]

results, failures = [], []
for gname, assets in GROUPS.items():
    if group and gname != group:
        continue
    for name, fn in assets.items():
        if only and name not in only:
            continue
        try:
            reset_scene()
            report, rt = fn()
            if preview:
                render_preview(name, rt)
            results.append(report)
        except Exception as exc:  # report every failure, keep building the rest
            traceback.print_exc()
            failures.append({"assetId": name, "error": str(exc)})

os.makedirs(REPORT_OUT, exist_ok=True)
summary_path = os.path.join(REPORT_OUT, "last_build.json")
with open(summary_path, "w", encoding="utf-8") as fh:
    json.dump({"blender": bpy.app.version_string, "exported": [r["assetId"] for r in results], "failures": failures}, fh, indent=2)
print(f"[tom] build finished: {len(results)} exported, {len(failures)} failed")
for f in failures:
    print(f"[tom] FAILED {f['assetId']}: {f['error']}")
sys.exit(1 if failures else 0)
