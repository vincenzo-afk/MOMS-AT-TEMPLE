"""Minimal pipeline smoke test: one coloured box, a collider and an animated armature."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy
from tom.core import reset_scene, Part, rgb, root, collider, export_asset, render_preview

reset_scene()
rt = root("TEST_Smoke")
p = Part()
p.box((1, 1, 1), (0, 0, 0.5), "MAT_Stone_Granite_A", rgb("granite"))
p.lathe([(0.0, 1.0), (0.3, 1.0), (0.2, 1.5), (0.0, 1.6)], (0, 0, 0), "MAT_Brass_A", rgb("brass"))
o = p.to_object("TEST_Smoke_Mesh", bevel=0.02)
o.parent = rt
collider("Smoke", (1, 1, 1), (0, 0, 0.5), parent=rt)

arm_data = bpy.data.armatures.new("SK_Test")
arm = bpy.data.objects.new("SK_Test", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
b = arm_data.edit_bones.new("root")
b.head = (0, 0, 0)
b.tail = (0, 0, 1)
bpy.ops.object.mode_set(mode="OBJECT")
arm.parent = rt
for name, ang in (("clip_a", 0.5), ("clip_b", -0.5)):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    pb = arm.pose.bones["root"]
    pb.rotation_mode = "XYZ"
    for f, v in ((1, 0.0), (10, ang), (20, 0.0)):
        pb.rotation_euler = (v, 0, 0)
        pb.keyframe_insert("rotation_euler", frame=f)
    print("[smoke] action", name, "slots:", [s.identifier for s in getattr(act, "slots", [])])
rep = export_asset("TEST_Smoke", "test", rt, required=["COL_Smoke"], animations=True)
print("[smoke] report", rep["objects"])
render_preview("TEST_Smoke", rt)
