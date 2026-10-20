"""Render all characters side by side (front and 3/4) for comparison with asserts_img/NPC.jpg.

Usage: blender -b --factory-startup -P blender/scripts/review_lineup.py -- [ASSET,ASSET...] [--pose CLIP:FRAME]
"""
import os
import sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from tom.core import BLEND_OUT, REPORT_OUT  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ids = [a for a in argv if not a.startswith("--") and ":" not in a] or [
    "CHR_Player_Base", "CHR_NPC_Amudha", "CHR_NPC_Velan", "CHR_NPC_Selvam", "CHR_NPC_Ponnan", "CHR_NPC_Valli", "CHR_Villager_A", "CHR_Villager_B", "CHR_Villager_C"]
pose_arg = next((a for a in argv if ":" in a), None)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
player_actions = {}
for i, aid in enumerate(ids):
    with bpy.data.libraries.load(os.path.join(BLEND_OUT, f"{aid}.blend"), link=False) as (src, dst):
        dst.objects = list(src.objects)
        dst.actions = list(src.actions)
    for o in dst.objects:
        if o is None:
            continue
        scene.collection.objects.link(o)
        if o.name.startswith(("COL_", "WALK_")):
            o.hide_render = True
        if o.parent is None:
            o.location = Vector((i * 0.9, 0, 0))
    for a in dst.actions:
        if a:
            player_actions[a.name] = a

if pose_arg:
    clip, frame = pose_arg.split(":")
    act = player_actions.get(clip)
    for o in scene.objects:
        if o.type == "ARMATURE" and act:
            o.animation_data_create()
            o.animation_data.action = act
            if act.slots:
                o.animation_data.action_slot = act.slots[0]
    scene.frame_set(int(frame))

scene.render.engine = "BLENDER_WORKBENCH"
sh = scene.display.shading
sh.light = "STUDIO"
sh.color_type = "VERTEX"
sh.show_cavity = True
sh.show_shadows = False
scene.render.resolution_x = 1600
scene.render.resolution_y = 560
cam_data = bpy.data.cameras.new("C")
cam_data.type = "ORTHO"
cam_data.ortho_scale = max(2.4, len(ids) * 0.9 + 0.4)
cam = bpy.data.objects.new("C", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
center = Vector(((len(ids) - 1) * 0.45, 0, 0.88))
out = os.path.join(REPORT_OUT, "previews")
for view, d in (("front", Vector((0, -1, 0.04))), ("three", Vector((0.55, -1, 0.12)))):
    cam.location = center + d.normalized() * 10
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(out, f"LINEUP_{view}{'_' + pose_arg.replace(':', '_') if pose_arg else ''}.png")
    bpy.ops.render.render(write_still=True)
print("[lineup] done")
