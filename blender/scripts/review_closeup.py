"""Close-up review renders of a character's face and hands (Eevee, three-quarter and front).

Usage: blender -b blender/source/CHR_Player_Base.blend -P blender/scripts/review_closeup.py
Writes blender/export_reports/previews/<asset>_face.png and <asset>_hand.png.
"""
import os
import math
import bpy
from mathutils import Vector

scene = bpy.context.scene
asset = next(o for o in scene.objects if o.type == "EMPTY" and o.parent is None).name
arm = next(o for o in scene.objects if o.type == "ARMATURE")
out_dir = os.path.join(os.path.dirname(bpy.data.filepath), "..", "export_reports", "previews")
os.makedirs(out_dir, exist_ok=True)
for o in scene.objects:
    if o.name.startswith(("COL_", "WALK_")):
        o.hide_render = True
if arm.animation_data:
    arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)

try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
world = scene.world or bpy.data.worlds.new("W")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.55, 0.6, 0.68, 1)
bg.inputs[1].default_value = 0.8

sun_d = bpy.data.lights.new("Sun", "SUN")
sun_d.energy = 3.5
sun = bpy.data.objects.new("Sun", sun_d)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))

cam_d = bpy.data.cameras.new("C")
cam_d.lens = 85
cam = bpy.data.objects.new("C", cam_d)
scene.collection.objects.link(cam)
scene.camera = cam


def bone_head(name):
    return arm.matrix_world @ arm.data.bones[name].head_local


def shoot(target, dist, yaw_deg, pitch_deg, path):
    yaw = math.radians(yaw_deg)
    pitch = math.radians(pitch_deg)
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    cam.location = target + d * dist
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


face = bone_head("head") + Vector((0, -0.02, 0.09))
shoot(face, 0.75, 0, 2, os.path.join(out_dir, f"{asset}_face.png"))
shoot(face, 0.75, 35, 8, os.path.join(out_dir, f"{asset}_face34.png"))
hand = (bone_head("hand_L") + arm.matrix_world @ arm.data.bones["hand_L"].tail_local) / 2
shoot(hand, 0.55, 60, 5, os.path.join(out_dir, f"{asset}_hand.png"))
# the hand as players see it: posed by real clips (relaxed idle, tool grip, pointing)
for clip, tag in (("idle_relaxed", "relaxed"), ("craft_at_station", "grip"), ("talk_gesture", "point")):
    act = bpy.data.actions.get(clip)
    if not act:
        continue
    arm.animation_data_create()
    arm.animation_data.action = act
    scene.frame_set(int(act.frame_range[0] + (act.frame_range[1] - act.frame_range[0]) * 0.5))
    bone = "hand_R" if tag == "point" else "hand_L"
    pb = arm.pose.bones[bone]
    c = arm.matrix_world @ ((pb.head + pb.tail) / 2)
    shoot(c, 0.5, -60 if bone == "hand_R" else 60, 10, os.path.join(out_dir, f"{asset}_hand_{tag}.png"))
print("[tom] closeups written")
