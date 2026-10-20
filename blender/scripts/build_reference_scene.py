"""Scale reference scene: real assets beside measured markers. Writes blender/source/REF_Scale_Scene.blend
and blender/export_reports/previews/REF_Scale_Scene.png, plus a measurement report.

Usage: blender -b --factory-startup -P blender/scripts/build_reference_scene.py
Run after the assets exist (npm run assets).
"""
import os
import sys
import json
import math

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from tom.core import reset_scene, Part, root, BLEND_OUT, REPORT_OUT, _bounds  # noqa: E402

reset_scene()
scene = bpy.context.scene
ref = bpy.data.collections["Reference"]


def import_asset(asset_id, loc):
    path = os.path.join(BLEND_OUT, f"{asset_id}.blend")
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = list(src.objects)
    objs = [o for o in dst.objects if o is not None]
    for o in objs:
        ref.objects.link(o)
        if o.name.startswith(("COL_", "WALK_")):
            o.hide_render = True
    top = [o for o in objs if o.parent is None and o.type == "EMPTY"]
    for t in top:
        t.location = Vector(loc)
    meshes = [o for o in objs if o.type == "MESH" and not o.name.startswith(("COL_", "WALK_", "PICK_", "STATE_"))]
    bpy.context.view_layer.update()
    return meshes


def marker(name, size, loc, color):
    p = Part()
    p.box(size, loc, "MAT_Cloth_A", color)
    o = p.to_object(name, coll="Reference")
    return o


def label_bar(height, x, y, color=(0.9, 0.2, 0.1, 1)):
    """Vertical bar with 0.25 m ticks."""
    marker(f"BAR_{height}m_{x}", (0.04, 0.04, height), (x, y, height / 2), color)
    for k in range(int(height / 0.25) + 1):
        marker(f"TICK_{x}_{k}", (0.14 if k % 4 == 0 else 0.08, 0.02, 0.012), (x, y - 0.03, k * 0.25), (0.05, 0.05, 0.05, 1))


report = {}
# ground grid: 1 m squares, 30 x 12 m
for i in range(-6, 25):
    marker(f"GRID_X_{i}", (0.015, 12, 0.005), (i, 0, 0.0025), (0.3, 0.3, 0.3, 1))
for j in range(-6, 7):
    marker(f"GRID_Y_{j}", (31, 0.015, 0.005), (9, j, 0.0025), (0.3, 0.3, 0.3, 1))
# standard dimensions
label_bar(1.75, -1.0, -1.0)                                        # player height
marker("DOOR_2.2m", (1.1, 0.1, 2.2), (2.0, -1.5, 1.1), (0.2, 0.4, 0.8, 0.5))     # doorway
marker("PATH_2m", (2.0, 6.0, 0.01), (5.0, -2.0, 0.006), (0.8, 0.7, 0.3, 1))      # narrow path
marker("PATH_4m", (4.0, 6.0, 0.01), (8.5, -2.0, 0.006), (0.8, 0.6, 0.2, 1))      # main path
for k in range(4):
    marker(f"STEP_{k}", (1.2, 0.3, 0.2 * (k + 1)), (12.0, -3.0 + k * 0.3, 0.1 * (k + 1)), (0.5, 0.5, 0.5, 1))  # 0.2 m steps

assets = {
    "CHR_Player_Base": (0.0, 0.0, 0.0),
    "CHR_NPC_Valli": (0.7, 0.0, 0.0),
    "ENV_House_Village_A": (5.0, 6.0, 0.0),
    "ENV_Pillar_Temple_A": (-2.5, 2.0, 0.0),
    "ENV_Wall_Prakara_A": (12.5, 2.0, 0.0),
    "ENV_Market_Stall_A": (17.0, 2.0, 0.0),
}
for aid, loc in assets.items():
    try:
        meshes = import_asset(aid, loc)
        mn, mx = _bounds(meshes)
        report[aid] = {"size_m": [round(mx[i] - mn[i], 3) for i in range(3)], "min_z": mn[2]}
    except OSError as e:
        report[aid] = {"error": str(e)}

# camera and render
cam_data = bpy.data.cameras.new("RefCam")
cam_data.lens = 35
cam = bpy.data.objects.new("RefCam", cam_data)
scene.collection.objects.link(cam)
cam.location = (8, -16, 7)
cam.rotation_euler = (Vector((7.5, 2, 1.2)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "VERTEX"
scene.display.shading.show_shadows = True
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
out = os.path.join(REPORT_OUT, "previews", "REF_Scale_Scene.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_OUT, "REF_Scale_Scene.blend"), check_existing=False, compress=True)
with open(os.path.join(REPORT_OUT, "REF_Scale_Scene_measurements.json"), "w", encoding="utf-8") as fh:
    json.dump(report, fh, indent=2)
print("[ref]", json.dumps(report))
