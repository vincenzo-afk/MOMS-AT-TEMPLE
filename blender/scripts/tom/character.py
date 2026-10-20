"""Procedural stylized humanoid: mesh with construction-time skin weights, shared skeleton, keyed actions.

Skeleton SK_Humanoid_A (all characters share names and hierarchy):
  root > hips > spine > chest > neck > head
                       chest > shoulder_L > upper_arm_L > forearm_L > hand_L   (and _R)
        hips > thigh_L > shin_L > foot_L > toe_L                                (and _R)
Character faces -Y in Blender (+Z in glTF). Left side is +X. Animations are in place (no root motion).
"""
import math
import bpy
import bmesh
from mathutils import Vector, Quaternion, Matrix
from .core import Part, rgb, collection

FPS = 30
DEFORM_BONES = [
    "hips", "spine", "chest", "neck", "head",
    "shoulder_L", "upper_arm_L", "forearm_L", "hand_L",
    "shoulder_R", "upper_arm_R", "forearm_R", "hand_R",
    "thigh_L", "shin_L", "foot_L", "toe_L",
    "thigh_R", "shin_R", "foot_R", "toe_R",
]


class Body:
    """Joint positions for a character, derived from a few proportion parameters."""

    def __init__(self, height=1.75, shoulder=0.19, hip=0.095, female=False, belly=0.0, arm_out_deg=11.0):
        s = height / 1.75
        self.s = s
        self.female = female
        self.belly = belly
        self.hip_joint_z = 0.92 * s
        self.hips = Vector((0, 0, 0.95 * s))
        self.spine = Vector((0, 0, 1.06 * s))
        self.chest = Vector((0, 0, 1.22 * s))
        self.neck = Vector((0, 0.005, 1.49 * s))
        self.head = Vector((0, 0, 1.575 * s))
        self.head_top = Vector((0, 0, height))
        a = math.radians(arm_out_deg)
        for side, sx in (("L", 1), ("R", -1)):
            sh = Vector((sx * shoulder * s, 0.005, 1.435 * s))
            d = Vector((sx * math.sin(a), 0.0, -math.cos(a)))
            elbow = sh + d * 0.285 * s + Vector((0, -0.01, 0))
            wrist = elbow + (d * 0.255 * s) + Vector((0, -0.02, 0))
            hand_tip = wrist + d * 0.17 * s + Vector((0, -0.01, 0))
            setattr(self, f"clav_{side}", Vector((sx * 0.03, 0.0, 1.43 * s)))
            setattr(self, f"shoulder_{side}", sh)
            setattr(self, f"elbow_{side}", elbow)
            setattr(self, f"wrist_{side}", wrist)
            setattr(self, f"hand_tip_{side}", hand_tip)
            hj = Vector((sx * hip * s, 0, self.hip_joint_z))
            knee = Vector((sx * (hip + 0.005) * s, -0.01, 0.50 * s))
            ankle = Vector((sx * (hip + 0.01) * s, 0.01, 0.085 * s))
            ball = Vector((sx * (hip + 0.015) * s, -0.11 * s, 0.025))
            toe = Vector((sx * (hip + 0.015) * s, -0.18 * s, 0.02))
            for k, v in (("hipj", hj), ("knee", knee), ("ankle", ankle), ("ball", ball), ("toe", toe)):
                setattr(self, f"{k}_{side}", v)

    def bones(self):
        """(name, head, tail, parent)"""
        b = [
            ("root", Vector((0, 0, 0)), Vector((0, 0.2, 0)), None),
            ("hips", self.hips, self.spine, "root"),
            ("spine", self.spine, self.chest, "hips"),
            ("chest", self.chest, self.neck, "spine"),
            ("neck", self.neck, self.head, "chest"),
            ("head", self.head, self.head_top, "neck"),
        ]
        for s in ("L", "R"):
            g = lambda k: getattr(self, f"{k}_{s}")
            b += [
                (f"shoulder_{s}", g("clav"), g("shoulder"), "chest"),
                (f"upper_arm_{s}", g("shoulder"), g("elbow"), f"shoulder_{s}"),
                (f"forearm_{s}", g("elbow"), g("wrist"), f"upper_arm_{s}"),
                (f"hand_{s}", g("wrist"), g("hand_tip"), f"forearm_{s}"),
                (f"thigh_{s}", g("hipj"), g("knee"), "hips"),
                (f"shin_{s}", g("knee"), g("ankle"), f"thigh_{s}"),
                (f"foot_{s}", g("ankle"), g("ball"), f"shin_{s}"),
                (f"toe_{s}", g("ball"), g("toe"), f"foot_{s}"),
            ]
        return b


# --------------------------------------------------------------------------- weights
def _seg_param(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return t, (a + ab * t - p).length


def chain_weights(chain, blend=0.06):
    """chain: list of (bone, head, tail). Returns fn(co)->{bone: w} blending across joints."""

    def fn(co):
        best = None
        for i, (name, h, t) in enumerate(chain):
            tt, d = _seg_param(co, h, t)
            if best is None or d < best[1] - 1e-6:
                best = (i, d, tt)
        i, _, tt = best
        name, h, t = chain[i]
        L = (t - h).length
        w = {name: 1.0}
        if tt * L < blend and i > 0:
            k = 0.5 - 0.5 * (tt * L / blend)
            w = {name: 1 - k, chain[i - 1][0]: k}
        elif (1 - tt) * L < blend and i < len(chain) - 1:
            k = 0.5 - 0.5 * ((1 - tt) * L / blend)
            w = {name: 1 - k, chain[i + 1][0]: k}
        return w

    return fn


def fixed(bone):
    return lambda co: {bone: 1.0}


class CharPart(Part):
    """Part that also writes skin weights into a deform layer for every vertex it creates."""

    def __init__(self):
        super().__init__()
        self.dl = self.bm.verts.layers.deform.verify()
        self.weight_fn = fixed("hips")

    def _finish(self, faces, mat, color, shade=None):
        super()._finish(faces, mat, color, shade=True if shade is None else shade)
        for f in faces:
            for v in f.verts:
                if len(v[self.dl]) == 0:
                    for bone, w in self.weight_fn(v.co).items():
                        if w > 0.001:
                            v[self.dl][DEFORM_BONES.index(bone)] = w

    def loft(self, rings, mat, color_fn, segments=14, cap_bottom=False, cap_top=False, double=False):
        """rings: [(z, rx, ry, cy)] elliptical cross-sections; color_fn(z) -> colour."""
        before = set(self.bm.faces)

        def make_rings(k):
            return [[self.bm.verts.new((math.cos(2 * math.pi * i / segments) * rx * k, cy + math.sin(2 * math.pi * i / segments) * ry * k, z)) for i in range(segments)]
                    for z, rx, ry, cy in rings]

        vr = make_rings(1.0)
        for a, b in zip(vr, vr[1:]):
            for i in range(segments):
                j = (i + 1) % segments
                self.bm.faces.new((a[i], a[j], b[j], b[i]))
        if double:  # inner shell with reversed winding so open cloth renders from inside too
            inner = make_rings(0.975)
            for a, b in zip(inner, inner[1:]):
                for i in range(segments):
                    j = (i + 1) % segments
                    self.bm.faces.new((b[i], b[j], a[j], a[i]))
        if cap_bottom:
            self.bm.faces.new(list(reversed(vr[0])))
        if cap_top:
            self.bm.faces.new(vr[-1])
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color_fn(rings[0][0]), shade=True)
        for f in new:
            for l in f.loops:
                l[self.col] = color_fn(l.vert.co.z)
        return new

    def to_skinned(self, name, arm_obj):
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        from .core import material
        for m in self.mats:
            me.materials.append(material(m))
        if "Col" in me.color_attributes:
            me.color_attributes.active_color_name = "Col"
            me.color_attributes.render_color_index = me.color_attributes.find("Col")
        obj = bpy.data.objects.new(name, me)
        collection("Geometry").objects.link(obj)
        for b in DEFORM_BONES:
            obj.vertex_groups.new(name=b)
        obj.parent = arm_obj
        mod = obj.modifiers.new("Armature", "ARMATURE")
        mod.object = arm_obj
        return obj


# --------------------------------------------------------------------------- armature
def build_armature(body, name="SK_Humanoid_A"):
    data = bpy.data.armatures.new(name)
    arm = bpy.data.objects.new(name, data)
    collection("Rig").objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for bname, h, t, parent in body.bones():
        b = data.edit_bones.new(bname)
        b.head, b.tail = h, t
        b.align_roll(Vector((0, -1, 0)) if abs((t - h).normalized().y) < 0.9 else Vector((0, 0, 1)))
        b.use_deform = bname in DEFORM_BONES
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
        eb[bname] = b
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return arm


# --------------------------------------------------------------------------- posing & actions
def _rest_q(arm, bone):
    return arm.data.bones[bone].matrix_local.to_quaternion()


def pose(arm, rotations, hips_offset=(0, 0, 0)):
    """rotations: {bone: [(axis_char, degrees), ...]} applied in armature-space rest axes.

    Axes: 'X' pitches (positive leans an upward bone forward; negative swings a downward bone forward),
    'Y' rolls sideways, 'Z' yaws. Child rotations compose on top of their parents, as in FK.
    """
    for pb in arm.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
    for bone, rots in rotations.items():
        q = Quaternion()
        for axis, deg in rots:
            v = {"X": Vector((1, 0, 0)), "Y": Vector((0, 1, 0)), "Z": Vector((0, 0, 1))}[axis]
            q = Quaternion(v, math.radians(deg)) @ q
        r = _rest_q(arm, bone)
        arm.pose.bones[bone].rotation_quaternion = r.inverted() @ q @ r
    r = _rest_q(arm, "hips")
    arm.pose.bones["hips"].location = r.inverted() @ Vector(hips_offset)


def key_all(arm, frame):
    for pb in arm.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=frame)
    arm.pose.bones["hips"].keyframe_insert("location", frame=frame)


def make_action(arm, name, frames, pose_fn, step=2, loop=True):
    """Key pose_fn(t in [0,1]) every `step` frames. Loops repeat the first pose on the last frame."""
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    keys = list(range(0, frames + 1, step))
    if keys[-1] != frames:
        keys.append(frames)
    for f in keys:
        t = (f / frames) % 1.0 if loop else f / frames
        rots, off = pose_fn(t)
        pose(arm, rots, off)
        key_all(arm, f + 1)
    act["tom_loop"] = loop
    act["tom_duration"] = frames / FPS
    return act


# --------------------------------------------------------------------------- clip library
def _s(t, phase=0.0):
    return math.sin(2 * math.pi * (t + phase))


def _c(t, phase=0.0):
    return math.cos(2 * math.pi * (t + phase))


def _ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def _env(t, a, b, c, d):
    """0 before a, ramps to 1 by b, holds until c, ramps to 0 by d."""
    if t < a or t > d:
        return 0.0
    if t < b:
        return _ease((t - a) / (b - a))
    if t <= c:
        return 1.0
    return 1 - _ease((t - c) / (d - c))


ARMS_DOWN = {"upper_arm_L": [("X", -4)], "upper_arm_R": [("X", -4)], "forearm_L": [("X", -10)], "forearm_R": [("X", -10)]}


def clip_idle(t):
    br = _s(t)
    sway = _s(t, 0.25)
    rots = {
        "spine": [("X", 1.0 + br * 0.8)],
        "chest": [("X", br * 1.2)],
        "neck": [("X", -1 + br * 0.5)],
        "head": [("Z", math.sin(2 * math.pi * t * 2) * 3), ("X", -2)],
        "hips": [("Y", sway * 1.5)],
        "upper_arm_L": [("X", -3 + br), ("Y", -2)],
        "upper_arm_R": [("X", -3 + br), ("Y", 2)],
        "forearm_L": [("X", -12)],
        "forearm_R": [("X", -12)],
        "thigh_L": [("Y", -sway * 1.5)],
        "thigh_R": [("Y", -sway * 1.5)],
    }
    return rots, (sway * 0.012, 0, -0.004 + br * 0.003)


def clip_walk(t):
    sw = 27.0
    rots = {"spine": [("X", 3)], "chest": [("X", 1), ("Z", -_s(t) * 5)], "hips": [("Z", _s(t) * 5)], "neck": [("X", -2)], "head": [("Z", _s(t) * 3)]}
    for side, ph in (("L", 0.0), ("R", 0.5)):
        th = _s(t, ph) * sw  # positive = leg forward
        swing = max(0.0, _c(t, ph))  # swing phase (leg moving forward)
        knee = 6 + 42 * swing ** 1.4 + 6 * max(0.0, -_s(t, ph))
        foot = -th + knee - 6 - 12 * swing
        rots[f"thigh_{side}"] = [("X", -th - 4 * swing)]
        rots[f"shin_{side}"] = [("X", knee)]
        rots[f"foot_{side}"] = [("X", -foot * 0.55 - th * 0.15)]
        rots[f"toe_{side}"] = [("X", max(0.0, -_s(t, ph)) * 18)]
        arm = -_s(t, ph) * 17
        rots[f"upper_arm_{side}"] = [("X", -arm - 2), ("Y", 3 if side == "L" else -3)]
        rots[f"forearm_{side}"] = [("X", -14 - max(0.0, -_s(t, ph)) * 14)]
    bob = -0.022 * (_s(t) ** 2) + 0.008
    return rots, (_s(t, 0.25) * 0.018, 0, bob)


def clip_run(t):
    rots = {"spine": [("X", 9)], "chest": [("X", 3), ("Z", -_s(t) * 8)], "hips": [("Z", _s(t) * 7)], "neck": [("X", -8)], "head": [("X", -2)]}
    for side, ph in (("L", 0.0), ("R", 0.5)):
        th = _s(t, ph) * 40 + 8
        swing = max(0.0, _c(t, ph))
        knee = 15 + 85 * swing ** 1.2 + 10 * max(0.0, -_s(t, ph))
        rots[f"thigh_{side}"] = [("X", -th - 8 * swing)]
        rots[f"shin_{side}"] = [("X", knee)]
        rots[f"foot_{side}"] = [("X", (th - knee) * 0.45 + 10)]
        rots[f"toe_{side}"] = [("X", max(0.0, -_s(t, ph)) * 25)]
        arm = -_s(t, ph) * 38
        rots[f"upper_arm_{side}"] = [("X", -arm - 6), ("Y", 6 if side == "L" else -6)]
        rots[f"forearm_{side}"] = [("X", -75 - arm * 0.3)]
    bob = 0.045 * abs(_c(t)) - 0.03
    return rots, (0, 0, bob)


def clip_turn(direction):
    def fn(t):
        rots = {"hips": [("Z", direction * 9 * _s(t, 0.25))], "chest": [("Z", direction * 6 * _s(t, 0.1))], "head": [("Z", direction * 12)], "spine": [("X", 2)]}
        for side, ph in (("L", 0.0), ("R", 0.5)):
            lift = max(0.0, _s(t, ph))
            rots[f"thigh_{side}"] = [("X", -lift * 16), ("Z", direction * 6 * lift)]
            rots[f"shin_{side}"] = [("X", lift * 32)]
            rots[f"foot_{side}"] = [("X", -lift * 14)]
            rots[f"upper_arm_{side}"] = [("X", -4 + _s(t, ph) * 5)]
            rots[f"forearm_{side}"] = [("X", -14)]
        return rots, (0, 0, -0.01 * abs(_s(t)))

    return fn


def clip_reach(t):
    e = _env(t, 0.05, 0.45, 0.6, 0.95)
    rots = dict(ARMS_DOWN)
    rots.update({
        "spine": [("X", 2 + 6 * e)],
        "chest": [("X", 3 * e), ("Z", 8 * e)],
        "neck": [("X", 4 * e)],
        "upper_arm_R": [("X", -4 - 72 * e), ("Y", 8 * e)],
        "forearm_R": [("X", -10 - 18 * e)],
        "hand_R": [("X", 10 * e)],
        "upper_arm_L": [("X", -4 + 6 * e)],
    })
    return rots, (0, -0.03 * e, 0)


def clip_pickup(t):
    e = _env(t, 0.05, 0.42, 0.58, 0.95)
    rots = {
        "spine": [("X", 38 * e)],
        "chest": [("X", 16 * e)],
        "neck": [("X", 2 * e)],
        "head": [("X", 4 * e)],
        "thigh_L": [("X", -66 * e)], "thigh_R": [("X", -50 * e), ("Z", -4 * e)],
        "shin_L": [("X", 100 * e)], "shin_R": [("X", 84 * e)],
        "foot_L": [("X", -34 * e)], "foot_R": [("X", -34 * e)],
        "upper_arm_R": [("X", -4 - 22 * e), ("Y", -4 * e)], "forearm_R": [("X", -10 - 4 * e)],
        "upper_arm_L": [("X", -4 - 30 * e), ("Y", 10 * e)], "forearm_L": [("X", -10 - 45 * e)],
        "hand_R": [("X", -10 * e)],
    }
    return rots, (0, 0.06 * e, -0.40 * e)


def clip_talk_idle(t):
    w = _s(t)
    rots = {
        "spine": [("X", 1.5)],
        "chest": [("X", w * 1.0), ("Z", w * 2)],
        "head": [("X", -2 + math.sin(2 * math.pi * t * 3) * 2.5), ("Z", w * 4)],
        "hips": [("Y", w * 2)],
        "upper_arm_L": [("X", -12), ("Y", 4)], "upper_arm_R": [("X", -12), ("Y", -4)],
        "forearm_L": [("X", -48), ("Z", -14)], "forearm_R": [("X", -48), ("Z", 14)],
        "thigh_L": [("Y", -w * 2)], "thigh_R": [("Y", -w * 2)],
    }
    return rots, (w * 0.015, 0, 0)


def clip_talk_gesture(t):
    g = _env(t, 0.08, 0.3, 0.7, 0.92)
    sweep = math.sin(2 * math.pi * t * 2) * g
    rots = {
        "spine": [("X", 2)],
        "chest": [("Z", 6 * g + sweep * 3)],
        "head": [("Z", -5 * g + sweep * 4), ("X", -3 + sweep * 2)],
        "upper_arm_R": [("X", -12 - 30 * g), ("Y", -14 * g)],
        "forearm_R": [("X", -40 - 35 * g + sweep * 15), ("Z", 20 * g)],
        "hand_R": [("Y", -20 * g), ("X", -10 * g)],
        "upper_arm_L": [("X", -10), ("Y", 3)], "forearm_L": [("X", -40)],
    }
    return rots, (0, 0, 0)


def clip_craft(t):
    a = _s(t * 2)
    b = _s(t * 2, 0.5)
    rots = {
        "spine": [("X", 14)], "chest": [("X", 6)], "neck": [("X", 10)], "head": [("X", 12)],
        "upper_arm_L": [("X", -38 + a * 6), ("Y", 10)], "upper_arm_R": [("X", -38 + b * 6), ("Y", -10)],
        "forearm_L": [("X", -42 + a * 10), ("Z", -20)], "forearm_R": [("X", -42 + b * 10), ("Z", 20)],
        "hand_L": [("X", 10 + a * 8)], "hand_R": [("X", 10 + b * 8)],
        "thigh_L": [("X", -6)], "thigh_R": [("X", -6)], "shin_L": [("X", 10)], "shin_R": [("X", 10)], "foot_L": [("X", -4)], "foot_R": [("X", -4)],
    }
    return rots, (0, 0, -0.02)


def clip_repair(t):
    """Kneel-and-work loop used for the channel repair."""
    k = 1.0
    hit = max(0.0, _s(t * 2)) ** 2
    rots = {
        "spine": [("X", 34)], "chest": [("X", 10)], "neck": [("X", 6)], "head": [("X", 10)],
        "thigh_L": [("X", -80)], "shin_L": [("X", 80)], "foot_L": [("X", 0)],
        "thigh_R": [("X", -10)], "shin_R": [("X", 110)], "foot_R": [("X", -40)], "toe_R": [("X", 40)],
        "upper_arm_R": [("X", -55 + hit * 25), ("Y", -8)], "forearm_R": [("X", -40 - hit * 30)],
        "upper_arm_L": [("X", -40), ("Y", 12)], "forearm_L": [("X", -50)],
    }
    return rots, (0, 0.1 * k, -0.42 * k)


def _crouch(e, depth=1.0):
    """Shared knee-bend posture; e in [0,1]."""
    k = e * depth
    return {
        "thigh_L": [("X", -64 * k)], "thigh_R": [("X", -50 * k), ("Z", -4 * k)],
        "shin_L": [("X", 98 * k)], "shin_R": [("X", 84 * k)],
        "foot_L": [("X", -34 * k)], "foot_R": [("X", -34 * k)],
    }, (0, 0.06 * k, -0.40 * k)


def clip_look_around(t):
    """ACT_002: glance left, shade eyes with the right hand, glance right."""
    shade = _env(t, 0.3, 0.42, 0.62, 0.74)
    yaw = math.sin(2 * math.pi * t) * 35
    rots = {
        "spine": [("X", 1.5)], "chest": [("Z", yaw * 0.25)], "neck": [("Z", yaw * 0.35)], "head": [("Z", yaw * 0.45), ("X", -4 * shade)],
        "upper_arm_R": [("X", -4 - 100 * shade), ("Y", -25 * shade)], "forearm_R": [("X", -10 - 95 * shade)], "hand_R": [("X", 20 * shade)],
        "upper_arm_L": [("X", -4), ("Y", 2)], "forearm_L": [("X", -12)],
    }
    return rots, (0, 0, 0)


def clip_gather_flower(t):
    """ACT_014: half crouch at a bush, right hand plucks twice, left hand holds a basket at the hip."""
    e = _env(t, 0.05, 0.3, 0.72, 0.95)
    pluck = math.sin(t * 2 * math.pi * 3) * e
    rots, off = _crouch(e, 0.55)
    rots.update({
        "spine": [("X", 22 * e)], "chest": [("X", 6 * e), ("Z", 6 * e)], "neck": [("X", 4 * e)],
        "upper_arm_R": [("X", -4 - 62 * e + pluck * 6), ("Y", 6 * e)], "forearm_R": [("X", -10 - 25 * e - pluck * 12)], "hand_R": [("X", -12 * e + pluck * 10)],
        "upper_arm_L": [("X", -4 - 10 * e), ("Y", 22 * e)], "forearm_L": [("X", -10 - 70 * e)],
    })
    return rots, off


def clip_water_plant(t):
    """ACT_015: both hands hold a vessel forward and tip it."""
    e = _env(t, 0.05, 0.25, 0.78, 0.96)
    tip = _env(t, 0.3, 0.45, 0.68, 0.78)
    rots = {
        "spine": [("X", 18 * e)], "chest": [("X", 6 * e)], "neck": [("X", 8 * e)],
        "upper_arm_R": [("X", -4 - 48 * e), ("Y", -6 * e)], "forearm_R": [("X", -10 - 45 * e + 30 * tip)], "hand_R": [("Y", -40 * tip)],
        "upper_arm_L": [("X", -4 - 44 * e), ("Y", 8 * e)], "forearm_L": [("X", -10 - 55 * e + 20 * tip)], "hand_L": [("Y", 30 * tip)],
        "thigh_L": [("X", -10 * e)], "shin_L": [("X", 14 * e)], "foot_L": [("X", -4 * e)],
    }
    return rots, (0, 0, -0.02 * e)


def clip_plant_seed(t):
    """ACT_016: crouch low, right hand presses seeds into the soil twice."""
    e = _env(t, 0.05, 0.3, 0.75, 0.95)
    poke = max(0.0, math.sin(t * 2 * math.pi * 2.5)) * e
    rots, off = _crouch(e, 1.0)
    rots.update({
        "spine": [("X", 40 * e)], "chest": [("X", 14 * e)], "head": [("X", 8 * e)],
        "upper_arm_R": [("X", -4 - 28 * e - poke * 10)], "forearm_R": [("X", -10 - 4 * e)], "hand_R": [("X", -15 * poke)],
        "upper_arm_L": [("X", -4 - 18 * e), ("Y", 12 * e)], "forearm_L": [("X", -10 - 60 * e)],
    })
    return rots, off


def clip_harvest(t):
    """ACT_017: crouch, grip with both hands, pull up."""
    e = _env(t, 0.05, 0.3, 0.8, 0.95)
    pull = _env(t, 0.42, 0.55, 0.65, 0.8)
    rots, off = _crouch(e * (1 - pull * 0.35), 1.0)
    rots.update({
        "spine": [("X", 36 * e - 10 * pull)], "chest": [("X", 12 * e)],
        "upper_arm_R": [("X", -4 - 30 * e - 25 * pull)], "forearm_R": [("X", -10 - 10 * e - 40 * pull)],
        "upper_arm_L": [("X", -4 - 30 * e - 25 * pull)], "forearm_L": [("X", -10 - 10 * e - 40 * pull)],
    })
    return rots, off


def clip_make_garland(t):
    """ACT_018: seated cross-legged, hands knotting flowers onto twine."""
    a = _s(t * 2)
    b = _s(t * 2, 0.5)
    rots = {
        "hips": [("X", -6)],
        "thigh_L": [("X", -80), ("Z", 48)], "thigh_R": [("X", -80), ("Z", -48)],
        "shin_L": [("X", 150), ("Z", -30)], "shin_R": [("X", 150), ("Z", 30)],
        "foot_L": [("X", -20)], "foot_R": [("X", -20)],
        "spine": [("X", 14)], "chest": [("X", 6)], "neck": [("X", 8)], "head": [("X", 14)],
        "upper_arm_L": [("X", -30 + a * 5), ("Y", 8)], "upper_arm_R": [("X", -30 + b * 5), ("Y", -8)],
        "forearm_L": [("X", -55 + a * 12), ("Z", -25)], "forearm_R": [("X", -55 + b * 12), ("Z", 25)],
        "hand_L": [("X", 10 + a * 10)], "hand_R": [("X", 10 + b * 10)],
    }
    return rots, (0, 0.05, -0.72)


def clip_open_chest(t):
    """ACT_012: bend over, lift a lid with both hands."""
    e = _env(t, 0.05, 0.35, 0.75, 0.97)
    lift = _env(t, 0.35, 0.6, 0.8, 0.95)
    rots = {
        "spine": [("X", 34 * e - 10 * lift)], "chest": [("X", 10 * e)], "neck": [("X", 6 * e)],
        "thigh_L": [("X", -22 * e)], "thigh_R": [("X", -22 * e)], "shin_L": [("X", 34 * e)], "shin_R": [("X", 34 * e)], "foot_L": [("X", -12 * e)], "foot_R": [("X", -12 * e)],
        "upper_arm_R": [("X", -4 - 40 * e - 50 * lift)], "forearm_R": [("X", -10 - 20 * e)],
        "upper_arm_L": [("X", -4 - 40 * e - 50 * lift)], "forearm_L": [("X", -10 - 20 * e)],
    }
    return rots, (0, 0.02 * e, -0.06 * e)


def clip_inspect(t):
    """ACT_011: lean in, hand to chin, slow head tilt."""
    e = _env(t, 0.05, 0.25, 0.8, 0.97)
    tilt = math.sin(t * 2 * math.pi) * 6 * e
    rots = {
        "spine": [("X", 12 * e)], "chest": [("X", 4 * e)], "neck": [("X", 10 * e)], "head": [("X", 8 * e), ("Y", tilt)],
        "upper_arm_R": [("X", -4 - 28 * e), ("Y", -6 * e)], "forearm_R": [("X", -10 - 120 * e)], "hand_R": [("X", 20 * e)],
        "upper_arm_L": [("X", -4 - 22 * e), ("Y", 12 * e)], "forearm_L": [("X", -10 - 70 * e), ("Z", -30 * e)],
    }
    return rots, (0, -0.02 * e, 0)


def clip_place(t):
    """ACT_010: crouch and set something down in front."""
    e = _env(t, 0.05, 0.42, 0.6, 0.95)
    rots, off = _crouch(e, 0.9)
    rots.update({
        "spine": [("X", 34 * e)], "chest": [("X", 12 * e)],
        "upper_arm_R": [("X", -4 - 45 * e)], "forearm_R": [("X", -10 - 20 * e)],
        "upper_arm_L": [("X", -4 - 45 * e)], "forearm_L": [("X", -10 - 20 * e)],
    })
    return rots, off


def clip_greet(t):
    """Palms pressed together at the chest with a slight bow (vanakkam)."""
    e = _env(t, 0.05, 0.3, 0.75, 0.95)
    bow = _env(t, 0.32, 0.45, 0.55, 0.7)
    rots = {
        "spine": [("X", 4 * e + 10 * bow)], "neck": [("X", 8 * bow)], "head": [("X", 10 * bow)],
        "upper_arm_L": [("X", -4 - 28 * e), ("Y", 18 * e), ("Z", -14 * e)], "upper_arm_R": [("X", -4 - 28 * e), ("Y", -18 * e), ("Z", 14 * e)],
        "forearm_L": [("X", -10 - 105 * e), ("Z", -55 * e)], "forearm_R": [("X", -10 - 105 * e), ("Z", 55 * e)],
        "hand_L": [("Y", -30 * e)], "hand_R": [("Y", 30 * e)],
    }
    return rots, (0, 0, 0)


def clip_listen(t):
    """ACT_022: arms loosely crossed, slow nods."""
    nod = max(0.0, math.sin(t * 2 * math.pi * 2)) * 5
    w = _s(t)
    rots = {
        "spine": [("X", 1)], "hips": [("Y", w * 2)], "head": [("X", nod), ("Z", 4)],
        "upper_arm_L": [("X", -22), ("Y", 10)], "upper_arm_R": [("X", -22), ("Y", -10)],
        "forearm_L": [("X", -85), ("Z", -55)], "forearm_R": [("X", -80), ("Z", 50)],
    }
    return rots, (w * 0.012, 0, 0)


def clip_give(t):
    """ACT_023: both hands offer an item forward at chest height."""
    e = _env(t, 0.05, 0.4, 0.65, 0.95)
    rots = {
        "spine": [("X", 8 * e)], "head": [("X", 6 * e)],
        "upper_arm_L": [("X", -4 - 50 * e), ("Y", 6 * e)], "upper_arm_R": [("X", -4 - 50 * e), ("Y", -6 * e)],
        "forearm_L": [("X", -10 - 30 * e), ("Z", -20 * e)], "forearm_R": [("X", -10 - 30 * e), ("Z", 20 * e)],
        "hand_L": [("Y", -40 * e)], "hand_R": [("Y", 40 * e)],
    }
    return rots, (0, -0.02 * e, 0)


def clip_receive(t):
    """ACT_024: hands come forward cupped, then draw back to the chest."""
    out = _env(t, 0.05, 0.3, 0.45, 0.6)
    back = _env(t, 0.45, 0.65, 0.8, 0.96)
    rots = {
        "spine": [("X", 6 * out)], "head": [("X", 6 * out)],
        "upper_arm_L": [("X", -4 - 45 * out - 20 * back), ("Y", 6)], "upper_arm_R": [("X", -4 - 45 * out - 20 * back), ("Y", -6)],
        "forearm_L": [("X", -10 - 25 * out - 80 * back), ("Z", -20)], "forearm_R": [("X", -10 - 25 * out - 80 * back), ("Z", 20)],
        "hand_L": [("Y", -40 * (out + back))], "hand_R": [("Y", 40 * (out + back))],
    }
    return rots, (0, 0, 0)


def clip_trade(t):
    """ACT_025: one hand rests on the counter, the other counts / gestures."""
    c = math.sin(t * 2 * math.pi * 3)
    rots = {
        "spine": [("X", 10)], "chest": [("Z", 4)], "head": [("X", 6), ("Z", c * 3)],
        "upper_arm_L": [("X", -40), ("Y", 8)], "forearm_L": [("X", -30)], "hand_L": [("X", 20)],
        "upper_arm_R": [("X", -35 + c * 4), ("Y", -12)], "forearm_R": [("X", -70 + c * 10), ("Z", 20)], "hand_R": [("X", c * 15)],
    }
    return rots, (0, 0, 0)


def clip_read(t):
    """ACT_026: holds a palm-leaf record open with both hands, head down, slow page motion."""
    p = math.sin(t * 2 * math.pi) * 4
    rots = {
        "spine": [("X", 4)], "neck": [("X", 14)], "head": [("X", 12 + p * 0.5)],
        "upper_arm_L": [("X", -30), ("Y", 10)], "upper_arm_R": [("X", -30), ("Y", -10)],
        "forearm_L": [("X", -75 + p), ("Z", -30)], "forearm_R": [("X", -75 - p), ("Z", 30)],
        "hand_L": [("X", -10)], "hand_R": [("X", -10)],
    }
    return rots, (0, 0, 0)


def clip_sit(t):
    """ACT_027: seated on a bench (seat 0.45 m), hands on thighs, breathing."""
    br = _s(t) * 0.8
    rots = {
        "thigh_L": [("X", -88)], "thigh_R": [("X", -88)], "shin_L": [("X", 92)], "shin_R": [("X", 92)], "foot_L": [("X", -4)], "foot_R": [("X", -4)],
        "spine": [("X", 4 + br)], "chest": [("X", br)], "head": [("X", 2), ("Z", math.sin(2 * math.pi * t * 2) * 3)],
        "upper_arm_L": [("X", -24), ("Y", 4)], "upper_arm_R": [("X", -24), ("Y", -4)], "forearm_L": [("X", -40)], "forearm_R": [("X", -40)],
    }
    return rots, (0, 0.06, -0.46)


def clip_rest(t):
    """ACT_028: seated on the ground leaning back on the hands, one knee raised."""
    br = _s(t) * 1.0
    rots = {
        "thigh_L": [("X", -60), ("Z", 8)], "shin_L": [("X", 95)], "foot_L": [("X", -30)],
        "thigh_R": [("X", -85), ("Z", -4)], "shin_R": [("X", 12)], "foot_R": [("X", 10)],
        "spine": [("X", -18 + br)], "chest": [("X", -4)], "neck": [("X", 10)], "head": [("X", 4)],
        "upper_arm_L": [("X", 30), ("Y", -14)], "upper_arm_R": [("X", 30), ("Y", 14)],
        "forearm_L": [("X", 4)], "forearm_R": [("X", 4)], "hand_L": [("X", -60)], "hand_R": [("X", -60)],
    }
    return rots, (0, 0.12, -0.74)


CLIPS = [
    # name, frames @30fps, function, loop
    ("idle_relaxed", 120, clip_idle, True),
    ("walk_forward", 30, clip_walk, True),
    ("run_forward", 20, clip_run, True),
    ("turn_left", 24, clip_turn(1), True),
    ("turn_right", 24, clip_turn(-1), True),
    ("interact_reach", 30, clip_reach, False),
    ("pickup_ground", 42, clip_pickup, False),
    ("talk_idle", 90, clip_talk_idle, True),
    ("talk_gesture", 60, clip_talk_gesture, False),
    ("craft_at_station", 60, clip_craft, True),
    ("repair_channel", 48, clip_repair, True),
    ("idle_look_around", 120, clip_look_around, False),
    ("gather_flower", 54, clip_gather_flower, False),
    ("water_plant", 72, clip_water_plant, False),
    ("plant_seed", 60, clip_plant_seed, False),
    ("harvest_plant", 54, clip_harvest, False),
    ("make_garland", 60, clip_make_garland, True),
    ("open_container", 42, clip_open_chest, False),
    ("inspect_object", 72, clip_inspect, False),
    ("place_object", 42, clip_place, False),
    ("greet", 54, clip_greet, False),
    ("talk_listen", 90, clip_listen, True),
    ("give_item", 42, clip_give, False),
    ("receive_item", 48, clip_receive, False),
    ("trade_counter", 60, clip_trade, True),
    ("read_record", 90, clip_read, True),
    ("sit_idle", 90, clip_sit, True),
    ("rest_idle", 120, clip_rest, True),
]
