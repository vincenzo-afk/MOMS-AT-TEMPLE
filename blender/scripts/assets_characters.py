"""Characters: player base and five NPCs built from one procedural generator on the shared SK_Humanoid_A rig."""
import math
import random
import bpy
from mathutils import Vector
from tom.core import rgb, root, export_asset, PALETTE
from tom.character import Body, CharPart, build_armature, chain_weights, fixed, make_action, CLIPS, FPS, pose

ASSETS = {}

SKIN = {"warm": (0.55, 0.36, 0.24), "deep": (0.42, 0.27, 0.18), "light": (0.66, 0.46, 0.32)}
HAIR = {"black": (0.07, 0.06, 0.06), "grey": (0.62, 0.60, 0.58), "white": (0.86, 0.85, 0.82)}


def col(c, j=0.0, rng=None):
    if isinstance(c, str):
        return rgb(c, j, rng)
    return (c[0], c[1], c[2], 1.0)


def build_character(spec):
    rng = random.Random(spec["seed"])
    body = Body(height=spec.get("height", 1.75), shoulder=spec.get("shoulder", 0.19), hip=spec.get("hip", 0.095),
                female=spec.get("female", False), belly=spec.get("belly", 0.0))
    s = body.s
    rt = root(spec["id"])
    arm = build_armature(body)
    arm.parent = rt
    p = CharPart()
    skin = col(SKIN[spec.get("skin", "warm")])
    skin_fn = lambda z: skin
    fem = body.female
    belly = body.belly

    # ---------------- torso (skin) ----------------
    p.weight_fn = chain_weights([("hips", body.hips + Vector((0, 0, -0.12)), body.spine), ("spine", body.spine, body.chest), ("chest", body.chest, body.neck), ("neck", body.neck, body.head)], blend=0.07)
    rings = [
        (0.86 * s, 0.115, 0.085, 0.0),
        (0.95 * s, 0.16 + (0.02 if fem else 0), 0.105, 0.0),
        (1.05 * s, 0.14 - (0.015 if fem else 0) + belly, 0.098 + belly, -0.006 - belly * 0.5),
        (1.17 * s, 0.155 + belly * 0.6, 0.105 + belly * 0.6, -0.01),
        (1.29 * s, 0.17, 0.112 + (0.02 if fem else 0), -0.012 - (0.012 if fem else 0)),
        (1.39 * s, 0.175 if not fem else 0.16, 0.098, -0.002),
        (1.455 * s, 0.13 if not fem else 0.115, 0.075, 0.008),
        (1.49 * s, 0.055, 0.055, 0.012),
        (1.585 * s, 0.047, 0.05, 0.004),
    ]
    p.loft(rings, "MAT_Skin_A", skin_fn, segments=14, cap_bottom=True)

    # ---------------- head ----------------
    # Stylized: the head is drawn ~8% larger than its skeletal slot for readability at gameplay distance.
    s_body = s
    s = s * 1.08
    hc = Vector((0, -0.006, 1.665 * s_body + 0.006))
    p.weight_fn = fixed("head")
    p.ico(1.0, tuple(hc), "MAT_Skin_A", skin, subdiv=2, scale=(0.092 * s, 0.108 * s, 0.122 * s))
    # jaw / chin
    p.ico(1.0, (0, hc.y - 0.035, hc.z - 0.06 * s), "MAT_Skin_A", skin, subdiv=1, scale=(0.065 * s, 0.07 * s, 0.06 * s))
    # nose
    p.box((0.024, 0.04, 0.05), (0, hc.y - 0.108 * s, hc.z - 0.012 * s), "MAT_Skin_A", skin, taper=(0.6, 0.5))
    # ears
    for sx in (-1, 1):
        p.ico(1.0, (sx * 0.093 * s, hc.y + 0.005, hc.z - 0.005), "MAT_Skin_A", skin, subdiv=1, scale=(0.012, 0.028, 0.038))
    # eyes, brows, mouth
    for sx in (-1, 1):
        ex = sx * 0.035 * s
        p.ico(1.0, (ex, hc.y - 0.092 * s, hc.z + 0.012 * s), "MAT_Eye_A", col((0.93, 0.91, 0.86)), subdiv=1, scale=(0.017, 0.008, 0.012))
        p.ico(1.0, (ex, hc.y - 0.099 * s, hc.z + 0.012 * s), "MAT_Eye_A", col((0.12, 0.08, 0.06)), subdiv=1, scale=(0.009, 0.004, 0.009))
        p.box((0.034, 0.012, 0.008), (ex, hc.y - 0.098 * s, hc.z + 0.035 * s), "MAT_Hair_A", col(HAIR[spec.get("brows", spec.get("hair_color", "black"))]), rot_z=0.0)
    p.box((0.032, 0.01, 0.006), (0, hc.y - 0.1 * s, hc.z - 0.05 * s), "MAT_Skin_A", col((0.36, 0.17, 0.13)))
    if spec.get("moustache"):
        p.box((0.06, 0.016, 0.012), (0, hc.y - 0.103 * s, hc.z - 0.033 * s), "MAT_Hair_A", col(HAIR[spec.get("moustache")]), taper=(0.8, 1.0))
    if spec.get("beard"):
        p.ico(1.0, (0, hc.y - 0.06, hc.z - 0.085 * s), "MAT_Hair_A", col(HAIR[spec["beard"]]), subdiv=1, scale=(0.06, 0.05, 0.06), noise=0.08, rng=rng)
    if spec.get("bindi"):
        p.ico(1.0, (0, hc.y - 0.104 * s, hc.z + 0.05 * s), "MAT_Skin_A", col("cloth_red"), subdiv=1, scale=(0.006, 0.003, 0.006))
    if fem:
        for sx in (-1, 1):
            p.ico(1.0, (sx * 0.096 * s, hc.y - 0.005, hc.z - 0.045), "MAT_Brass_A", col("brass"), subdiv=1, scale=(0.009, 0.009, 0.012))

    # ---------------- hair / headwear ----------------
    hair = col(HAIR[spec.get("hair_color", "black")])
    style = spec.get("hair", "short")
    if style in ("short", "bun", "bald_fringe"):
        if style == "bald_fringe":
            for sx in (-1, 1):
                p.ico(1.0, (sx * 0.08 * s, hc.y + 0.03, hc.z + 0.0), "MAT_Hair_A", hair, subdiv=1, scale=(0.03, 0.07, 0.05), noise=0.08, rng=rng)
            p.ico(1.0, (0, hc.y + 0.075, hc.z - 0.01), "MAT_Hair_A", hair, subdiv=1, scale=(0.07, 0.04, 0.05), noise=0.08, rng=rng)
        else:
            p.ico(1.0, (0, hc.y + 0.008, hc.z + 0.022 * s), "MAT_Hair_A", hair, subdiv=2, scale=(0.098 * s, 0.112 * s, 0.112 * s))
            # trim the face opening by pushing a skin-coloured forehead patch slightly forward
            p.ico(1.0, (0, hc.y - 0.07 * s, hc.z + 0.03 * s), "MAT_Skin_A", skin, subdiv=1, scale=(0.072 * s, 0.045, 0.05 * s))
        if style == "bun":
            p.ico(1.0, (0, hc.y + 0.11 * s, hc.z - 0.03 * s), "MAT_Hair_A", hair, subdiv=2, scale=(0.055, 0.045, 0.05))
            for k in range(9):  # jasmine string around the bun
                a = math.pi * 0.15 + k * math.pi * 0.7 / 8
                p.ico(1.0, (math.cos(a) * 0.06, hc.y + 0.11 * s + math.sin(a) * 0.01 - 0.005, hc.z - 0.03 * s + math.sin(a) * 0.05), "MAT_Cloth_A", col("jasmine"), subdiv=1, scale=(0.011, 0.011, 0.011))
            # long plait down the back
            p.weight_fn = chain_weights([("head", hc, hc + Vector((0, 0.1, -0.1))), ("neck", body.neck + Vector((0, 0.1, 0)), body.chest + Vector((0, 0.13, 0)))], blend=0.05)
    headwear = spec.get("headwear")
    p.weight_fn = fixed("head")
    if headwear == "towel":
        tw = col(spec.get("headwear_color", "cloth_white"))
        p.lathe([(0.1 * s, 0.0), (0.112 * s, 0.02), (0.112 * s, 0.05), (0.1 * s, 0.07), (0.07 * s, 0.075)], (0, hc.y + 0.004, hc.z + 0.035 * s), "MAT_Cloth_A", tw, segments=14)
        p.ico(1.0, (0.06, hc.y - 0.08, hc.z + 0.085 * s), "MAT_Cloth_A", tw, subdiv=1, scale=(0.035, 0.03, 0.03))
    elif headwear == "turban":
        tw = col(spec.get("headwear_color", "cloth_saffron"))
        p.lathe([(0.102 * s, 0.0), (0.118 * s, 0.03), (0.12 * s, 0.07), (0.1 * s, 0.11), (0.05 * s, 0.125), (0.0, 0.127)], (0, hc.y + 0.006, hc.z + 0.03 * s), "MAT_Cloth_A", tw, segments=14)
        p.box((0.05, 0.02, 0.07), (0, hc.y - 0.115 * s, hc.z + 0.09 * s), "MAT_Cloth_A", col("cloth_red"), taper=(0.4, 1))

    s = s_body
    # ---------------- arms ----------------
    for side in ("L", "R"):
        g = lambda k: getattr(body, f"{k}_{side}")
        chain = [(f"shoulder_{side}", g("clav"), g("shoulder")), (f"upper_arm_{side}", g("shoulder"), g("elbow")),
                 (f"forearm_{side}", g("elbow"), g("wrist")), (f"hand_{side}", g("wrist"), g("hand_tip"))]
        p.weight_fn = lambda co, c=chain: {k: v for k, v in chain_weights(c, blend=0.05)(co).items()}
        r0 = 0.052 if not fem else 0.045
        p.ico(1.0, tuple(g("shoulder") + Vector((0, 0, 0.01))), "MAT_Skin_A", skin, subdiv=1, scale=(r0 * 1.15, r0 * 1.1, r0 * 1.1))
        path = [g("shoulder"), g("shoulder").lerp(g("elbow"), 0.5), g("elbow"), g("elbow").lerp(g("wrist"), 0.45), g("wrist")]
        p.tube([tuple(v) for v in path], [r0, r0 * 0.88, r0 * 0.72, r0 * 0.74, r0 * 0.56], "MAT_Skin_A", skin, segments=10)
        # hand: palm + fingers block + thumb
        d = (g("hand_tip") - g("wrist")).normalized()
        palm = g("wrist") + d * 0.055
        sx = 1 if side == "L" else -1
        p.ico(1.0, tuple(palm), "MAT_Skin_A", skin, subdiv=1, scale=(0.022, 0.042, 0.05))
        p.ico(1.0, tuple(palm + d * 0.06 + Vector((0, -0.004, 0))), "MAT_Skin_A", skin, subdiv=1, scale=(0.018, 0.038, 0.04))
        p.tube([tuple(palm + Vector((0, -0.03, 0.02))), tuple(palm + Vector((-sx * 0.005, -0.05, -0.02)))], [0.012, 0.01], "MAT_Skin_A", skin, segments=6)
        if fem or spec.get("bangles"):
            for k in range(3):
                p.lathe([(r0 * 0.62, -0.004), (r0 * 0.66, 0.0), (r0 * 0.62, 0.004)], tuple(g("wrist") - d * (0.02 + k * 0.012)), "MAT_Brass_A", col("brass"), segments=10)

    # ---------------- legs & feet ----------------
    for side in ("L", "R"):
        g = lambda k: getattr(body, f"{k}_{side}")
        chain = [("hips", body.hips, g("hipj")), (f"thigh_{side}", g("hipj"), g("knee")), (f"shin_{side}", g("knee"), g("ankle")),
                 (f"foot_{side}", g("ankle"), g("ball")), (f"toe_{side}", g("ball"), g("toe"))]
        p.weight_fn = chain_weights(chain, blend=0.06)
        path = [g("hipj") + Vector((0, 0, 0.05)), g("hipj").lerp(g("knee"), 0.5), g("knee"), g("knee").lerp(g("ankle"), 0.35), g("ankle") + Vector((0, 0, 0.02))]
        rk = 1.06 if fem else 1.0
        # thighs are slimmer than anatomy suggests: they are covered by the skirt and slim legs clip less
        p.tube([tuple(v) for v in path], [0.075 * rk, 0.062 * rk, 0.052, 0.054, 0.04], "MAT_Skin_A", skin, segments=10)
        foot_c = (g("ankle") + g("ball")) / 2
        sandal = spec.get("sandals")
        p.ico(1.0, tuple(foot_c + Vector((0, 0.015, -0.025))), "MAT_Skin_A", skin, subdiv=1, scale=(0.042, 0.085, 0.035))
        p.ico(1.0, tuple(g("ball") + Vector((0, -0.03, -0.005))), "MAT_Skin_A", skin, subdiv=1, scale=(0.044, 0.04, 0.022))
        if sandal:
            p.box((0.1, 0.27, 0.018), tuple(foot_c + Vector((0, -0.02, -0.05))), "MAT_Wood_Teak_A", col(sandal))

    # ---------------- clothing ----------------
    cloth = spec.get("clothes", {})
    # skirt: veshti (knee or ankle length) or saree skirt. Weighted between hips and thighs.
    if "skirt" in cloth:
        sk = cloth["skirt"]
        length = sk.get("bottom", 0.55) * s

        def skirt_w(co):
            sideL = max(0.0, min(1.0, 0.5 + co.x / 0.16))
            # lower skirt follows the legs closely so thighs don't punch through on long strides;
            # the front/back centre line is shared between both thighs and stretches instead.
            u = max(0.0, min(1.0, (0.98 * s - co.z) / (0.98 * s - length)))
            depth = (u ** 0.8) * 0.94
            w = {"hips": 1 - depth}
            if depth > 0:
                w["thigh_L"] = depth * sideL
                w["thigh_R"] = depth * (1 - sideL)
            return w

        p.weight_fn = skirt_w
        top = 1.07 * s
        base_col = col(sk["color"])
        band = col(sk.get("border", sk["color"]))
        flare = sk.get("flare", 0.2)
        n = 6
        rings = []
        for i in range(n + 1):
            t = i / n
            z = top + (length - top) * t
            rx = (0.155 + (0.02 if fem else 0)) + (flare - 0.155) * (t ** 0.8) + belly * (1 - t)
            ry = 0.11 + (flare * 0.75 - 0.11) * (t ** 0.8) + belly * (1 - t)
            rings.append((z, rx, ry, -0.005))
        rings.insert(0, (top + 0.02, rings[0][1] - 0.01, rings[0][2] - 0.01, -0.005))
        p.loft(rings, "MAT_Cloth_A", lambda z: band if (z < length + 0.06 or abs(z - top) < 0.03) else base_col, segments=16, double=True)
        if sk.get("pleats"):  # saree front pleats panel
            p.box((0.12, 0.02, top - length - 0.04), (0.02, -0.16 - flare * 0.15, (top + length) / 2), "MAT_Cloth_A", band, taper=(1.4, 1))
    if "top" in cloth:
        tp = cloth["top"]
        p.weight_fn = chain_weights([("hips", body.hips + Vector((0, 0, -0.12)), body.spine), ("spine", body.spine, body.chest), ("chest", body.chest, body.neck)], blend=0.07)
        bottom = tp.get("bottom", 0.98) * s
        c = col(tp["color"])
        trim = col(tp.get("trim", tp["color"]))
        rr = [(bottom, 0.17 + belly, 0.125 + belly, -0.006), (1.05 * s, 0.152 + belly, 0.112 + belly, -0.008), (1.17 * s, 0.166 + belly * 0.6, 0.117 + belly * 0.6, -0.012),
              (1.29 * s, 0.18, 0.124 + (0.022 if fem else 0), -0.014 - (0.012 if fem else 0)), (1.39 * s, 0.186 if not fem else 0.17, 0.108, -0.002),
              (1.455 * s, 0.142 if not fem else 0.126, 0.085, 0.008), (1.485 * s, 0.07, 0.066, 0.012)]
        rr = [r for r in rr if r[0] >= bottom - 1e-6]
        p.loft(rr, "MAT_Cloth_A", lambda z: trim if z < bottom + 0.03 or z > 1.47 * s else c, segments=14, double=False)
        sleeve = tp.get("sleeve", 0.45)
        for side in ("L", "R"):
            g = lambda k: getattr(body, f"{k}_{side}")
            chain = [(f"shoulder_{side}", g("clav"), g("shoulder")), (f"upper_arm_{side}", g("shoulder"), g("elbow")), (f"forearm_{side}", g("elbow"), g("wrist"))]
            p.weight_fn = chain_weights(chain, blend=0.05)
            end = g("shoulder").lerp(g("elbow"), sleeve)
            r0 = 0.058 if not fem else 0.051
            p.tube([tuple(g("shoulder") + Vector((0, 0, 0.005))), tuple(end)], [r0, r0 * 0.92], "MAT_Cloth_A", c, segments=10)
    if "drape" in cloth:  # angavastram / saree pallu: diagonal from one hip over the opposite shoulder
        dr = cloth["drape"]
        p.weight_fn = chain_weights([("spine", body.spine, body.chest), ("chest", body.chest, body.neck), ("shoulder_L", body.clav_L, body.shoulder_L)], blend=0.06)
        c = col(dr["color"])
        border = col(dr.get("border", dr["color"]))
        pts_front = [(-0.13, -0.135, 1.0), (-0.06, -0.15, 1.15), (0.04, -0.14, 1.3), (0.11, -0.11, 1.42), (0.15, -0.02, 1.49), (0.15, 0.08, 1.45), (0.1, 0.13, 1.3), (0.0, 0.13, 1.12), (-0.1, 0.125, 0.98)]
        if belly:
            pts_front = [(x * (1 + belly * 2), y * (1 + belly * 3), z) for x, y, z in pts_front]
        a, b = [], []
        width = dr.get("width", 0.15)
        for i, (x, y, z) in enumerate(pts_front):
            pnt = Vector((x * (1.0 + (0.08 if fem else 0)), y * 1.06, z * s))
            off = Vector((0, 0, width)) if i < 4 else (Vector((-width * 0.8, 0, 0.0)) if i < 6 else Vector((0, 0, width)))
            a.append(tuple(pnt))
            b.append(tuple(pnt + off * (0.7 if i in (4, 5) else 1.0)))
        p.quad_strip(a, b, "MAT_Cloth_A", c)
        p.quad_strip(b, a, "MAT_Cloth_A", border)

    mesh = p.to_skinned(f"{spec['id']}_Mesh", arm)
    mesh.parent = arm

    # ---------------- actions ----------------
    bpy.context.scene.render.fps = FPS
    clip_meta = []
    for name, frames, fn, loop in CLIPS:
        make_action(arm, name, frames, fn, step=2 if frames <= 60 else 4, loop=loop)
        clip_meta.append({"name": name, "duration": round(frames / FPS, 3), "loop": loop})
    arm.animation_data.action = None
    pose(arm, {})
    report = export_asset(spec["id"], "characters", rt, required=["SK_Humanoid_A", f"{spec['id']}_Mesh"], animations=True,
                          extra_report={"clips": clip_meta, "skeleton": "SK_Humanoid_A", "height": spec.get("height", 1.75)})
    return report, rt


SPECS = {
    # height is the skeletal height; enlarged head + hair add ~4 cm (measured 1.77 m in REF_Scale_Scene)
    "CHR_Player_Base": dict(seed=1, height=1.70, skin="warm", hair="short", hair_color="black", moustache="black",
                            clothes={"skirt": {"color": "cloth_white", "border": "cloth_red", "bottom": 0.52, "flare": 0.2},
                                     "top": {"color": "plaster_warm", "trim": "cloth_red", "bottom": 0.98, "sleeve": 0.55},
                                     "drape": {"color": "cloth_saffron", "border": "cloth_red"}}, sandals="teak_dark"),
    "CHR_NPC_Valli": dict(seed=2, height=1.6, female=True, shoulder=0.165, hip=0.09, skin="warm", hair="bun", hair_color="black", bindi=True,
                          clothes={"skirt": {"color": "cloth_red", "border": "marigold_yellow", "bottom": 0.07, "flare": 0.2, "pleats": True},
                                   "top": {"color": "marigold_yellow", "bottom": 1.17, "sleeve": 0.35},
                                   "drape": {"color": "cloth_red", "border": "marigold_yellow", "width": 0.2}}),
    "CHR_NPC_Murugan": dict(seed=3, height=1.72, skin="deep", hair="short", hair_color="black", moustache="black", headwear="towel", headwear_color="cloth_white",
                            clothes={"skirt": {"color": "cloth_green", "border": "cloth_white", "bottom": 0.56, "flare": 0.19},
                                     "drape": {"color": "cloth_white", "border": "leaf", "width": 0.12}}),
    "CHR_NPC_Kamala": dict(seed=4, height=1.63, female=True, shoulder=0.17, hip=0.092, skin="light", hair="bun", hair_color="black", bindi=True,
                           clothes={"skirt": {"color": "cloth_indigo", "border": "cloth_saffron", "bottom": 0.07, "flare": 0.2, "pleats": True},
                                    "top": {"color": "cloth_saffron", "bottom": 1.17, "sleeve": 0.4},
                                    "drape": {"color": "cloth_indigo", "border": "cloth_saffron", "width": 0.2}}),
    "CHR_NPC_Selvam": dict(seed=5, height=1.76, belly=0.035, skin="warm", hair="short", hair_color="black", moustache="black", headwear="turban", headwear_color="cloth_saffron",
                           clothes={"skirt": {"color": "cloth_white", "border": "cloth_indigo", "bottom": 0.1, "flare": 0.22},
                                    "top": {"color": "sandstone", "trim": "red_oxide", "bottom": 0.9, "sleeve": 0.8}}, sandals="teak_dark"),
    "CHR_NPC_Ponnan": dict(seed=6, height=1.68, skin="deep", hair="bald_fringe", hair_color="white", brows="grey", moustache="white", beard="white",
                           clothes={"skirt": {"color": "cloth_white", "border": "brass", "bottom": 0.1, "flare": 0.21},
                                    "drape": {"color": "cloth_white", "border": "brass", "width": 0.22}}, bangles=False),
}


def _make(name):
    def fn():
        return build_character({"id": name, **SPECS[name]})

    fn.__name__ = name
    return fn


for _n in SPECS:
    ASSETS[_n] = _make(_n)
