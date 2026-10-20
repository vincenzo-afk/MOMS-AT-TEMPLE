"""Render a pose contact sheet for a character .blend: each clip at several phases, front and side views.

Usage: blender -b blender/source/CHR_Player_Base.blend -P blender/scripts/review_character.py -- [CLIP,CLIP]
Writes blender/export_reports/previews/<asset>_<clip>.png (one strip per clip).
"""
import os
import sys
import math
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
wanted = set(argv[0].split(",")) if argv else None
scene = bpy.context.scene
arm = next(o for o in scene.objects if o.type == "ARMATURE")
asset = next(o for o in scene.objects if o.type == "EMPTY" and o.parent is None).name
out_dir = os.path.join(os.path.dirname(bpy.data.filepath), "..", "export_reports", "previews")
os.makedirs(out_dir, exist_ok=True)
for o in scene.objects:
    if o.name.startswith(("COL_", "WALK_")):
        o.hide_render = True

scene.render.engine = "BLENDER_WORKBENCH"
sh = scene.display.shading
sh.light = "STUDIO"
sh.color_type = "VERTEX"
sh.show_shadows = False
sh.show_cavity = True
scene.render.resolution_x = 220
scene.render.resolution_y = 300
scene.render.film_transparent = False

cam_data = bpy.data.cameras.new("ReviewCam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = 2.1
cam = bpy.data.objects.new("ReviewCam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def place(view):
    target = Vector((0, 0, 0.9))
    d = {"front": Vector((0, -1, 0.05)), "side": Vector((1, 0, 0.05)), "three": Vector((0.7, -0.7, 0.15))}[view]
    cam.location = target + d.normalized() * 6
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


frames_out = []
for act in bpy.data.actions:
    if wanted and act.name not in wanted:
        continue
    arm.animation_data.action = act
    if hasattr(arm.animation_data, "action_slot") and act.slots:
        arm.animation_data.action_slot = act.slots[0]
    start, end = act.frame_range
    phases = [0, 0.25, 0.5, 0.75]
    for view in ("front", "side"):
        place(view)
        for i, ph in enumerate(phases):
            scene.frame_set(int(start + (end - start) * ph))
            path = os.path.join(out_dir, f"_tmp_{act.name}_{view}_{i}.png")
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            frames_out.append((act.name, view, i, path))

# stitch per clip: 2 rows (front, side) x 4 phases
by_clip = {}
for name, view, i, path in frames_out:
    by_clip.setdefault(name, []).append((view, i, path))
W, H = 220, 300
for name, items in by_clip.items():
    sheet = bpy.data.images.new(f"sheet_{name}", W * 4, H * 2)
    px = [0.0] * (W * 4 * H * 2 * 4)
    for view, i, path in items:
        img = bpy.data.images.load(path)
        src = list(img.pixels)
        row = 1 if view == "front" else 0
        for y in range(H):
            so = y * W * 4
            do = ((row * H + y) * W * 4 + i * W) * 4
            px[do:do + W * 4] = src[so:so + W * 4]
        bpy.data.images.remove(img)
        os.remove(path)
    sheet.pixels = px
    sheet.filepath_raw = os.path.join(out_dir, f"{asset}_{name}.png")
    sheet.file_format = "PNG"
    sheet.save()
    print("[review]", sheet.filepath_raw)
