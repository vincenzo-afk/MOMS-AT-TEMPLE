"""Characters built to the reference sheet asserts_img/NPC.jpg (Category K) on the shared SK_Humanoid_A rig.

CHR_Player_Base   CHR_001 player: bare chest, kachcha dhoti, angavastram, topknot, waist pouch, cord necklace
CHR_NPC_Amudha    CHR_002 Thottakaari (gardener): older woman, orange saree, olive pallu, grey bun
CHR_NPC_Velan     CHR_003 Sirpi (stone carver): muscular, beard, indigo knee dhoti, wrist wraps, tool belt
CHR_NPC_Selvam    CHR_004 Viyaabaari (trader): white veshti with gold border, angavastram, satchel
CHR_NPC_Ponnan    CHR_005 Periyavar (elder / historian): white beard, grey topknot, shawl, staff
CHR_NPC_Valli     resident (not on the sheet): red saree with yellow border, jasmine bun
CHR_Villager_A/B/C  CHR_006 everyday villagers (ambient)

Only the player GLB carries animation clips; every NPC shares the same skeleton and the runtime retargets the
player's clips onto it (hip translation is re-based to each character's rest height).
"""
import math
import random
import bpy
from mathutils import Vector
from tom.core import rgb, root, export_asset
from tom.character import Body, CharPart, build_armature, chain_weights, fixed, make_action, CLIPS, FPS, pose
from tom.anatomy import HeadShape, build_head, build_hair_cap, build_eyes, build_brows, build_ears, build_hand, finger_joints, jaw_weight

ASSETS = {}

SKIN = {"warm": (0.60, 0.40, 0.27), "deep": (0.45, 0.29, 0.19), "light": (0.70, 0.50, 0.35), "tan": (0.54, 0.35, 0.23)}
HAIR = {"black": (0.07, 0.06, 0.06), "grey": (0.55, 0.53, 0.51), "white": (0.88, 0.87, 0.84), "salt": (0.32, 0.30, 0.29)}


def col(c, j=0.0, rng=None):
    if isinstance(c, str):
        return rgb(c, j, rng) if c in _PAL else (*HAIR[c], 1.0)
    return (c[0], c[1], c[2], 1.0)


from tom.core import PALETTE as _PAL  # noqa: E402

V = Vector


def torso(p, body, spec, skin):
    """Bare torso with chest, ribcage taper, belly and back; muscular/thin variants."""
    s = body.s
    m = spec.get("muscle", 0.0)
    thin = spec.get("thin", 0.0)
    fem = body.female
    belly = body.belly
    p.weight_fn = chain_weights([("hips", body.hips + V((0, 0, -0.12)), body.spine), ("spine", body.spine, body.chest),
                                 ("chest", body.chest, body.neck), ("neck", body.neck, body.head)], blend=0.07)
    k = 1 + m * 0.18 - thin * 0.1
    rings = [
        (0.86 * s, 0.115, 0.085, 0.0),
        (0.95 * s, (0.16 + (0.02 if fem else 0)), 0.105, 0.0),
        (1.05 * s, (0.135 - (0.015 if fem else 0)) * k + belly, (0.095 + belly) * k, -0.006 - belly * 0.5),
        (1.15 * s, 0.148 * k + belly * 0.6, (0.100 + belly * 0.6) * k, -0.012),
        (1.25 * s, 0.165 * k, (0.114 + (0.018 if fem else 0.006)) * k, -0.02 - (0.012 if fem else 0.006) - m * 0.012),
        (1.33 * s, 0.180 * k + m * 0.012, (0.116 if not fem else 0.112) * k, -0.018 - m * 0.014),
        (1.40 * s, (0.185 if not fem else 0.16) * k + m * 0.02, 0.100 * k, -0.002),
        (1.455 * s, (0.135 if not fem else 0.115) * k + m * 0.03, 0.078 * k, 0.008),
        (1.49 * s, 0.056 + m * 0.012, 0.056 + m * 0.008, 0.012),
        (1.585 * s, 0.047 + m * 0.006, 0.05 + m * 0.004, 0.004),
    ]
    gi = body.girth
    rings = [(z, rx * gi, ry * gi, cy * gi) for z, rx, ry, cy in rings]
    p.loft(rings, "MAT_Skin_A", lambda z: skin, segments=16, cap_bottom=True)
    if m > 0.3:  # trapezius slope for the stone carver, blended under the neck
        p.weight_fn = fixed("chest")
        for sx in (-1, 1):
            p.ico(1.0, (sx * 0.075, 0.01, 1.455 * s), "MAT_Skin_A", skin, subdiv=2, scale=(0.065, 0.045, 0.028))
    p.weight_fn = fixed("spine")
    p.ico(1.0, (0, -0.096 - belly, 1.035 * s), "MAT_Skin_A", (skin[0] * 0.7, skin[1] * 0.7, skin[2] * 0.7, 1), subdiv=1, scale=(0.006, 0.004, 0.008))


def shade(c, k):
    return (c[0] * k[0], c[1] * k[1], c[2] * k[2], 1)


def head(p, body, spec, skin, rng):
    """Sculpted head (one surface) with set-in eyes, lids, brows, ears, then hair and facial hair."""
    s0 = body.s
    fem = body.female
    hs = spec.get("head_scale", 1.0)  # children: a larger head for their height
    rx, ry, rz = (0.078 if fem else 0.082) * s0 * hs, 0.103 * s0 * hs, 0.116 * s0 * hs
    hc = V((0, -0.006, body.head_top.z - rz - 0.004))
    shape = HeadShape(hc, rx, ry, rz, fem=fem, nose=spec.get("nose", 1.0), jaw=spec.get("jaw", 1.0))
    p.weight_fn = jaw_weight(shape)
    lip = shade(skin, (0.82, 0.55, 0.55) if fem else (0.8, 0.6, 0.58))
    build_head(p, shape, {"skin": skin, "lip": lip, "mouth": shade(skin, (0.35, 0.22, 0.22))})
    # the inside of the mouth: dark, so an open jaw never shows through the head
    p.weight_fn = fixed("head")
    mouth = shape.landmark(0, -0.57)
    p.ico(1.0, tuple(mouth + (shape.c - mouth).normalized() * 0.022), "MAT_Skin_A", shade(skin, (0.25, 0.12, 0.12)), subdiv=2, scale=(rx * 0.32, ry * 0.2, rz * 0.12))
    build_eyes(p, shape, scale=s0 * hs * 1.04, weight_for=lambda part, side: fixed("head" if part == "head" else f"{part}_{side}"), colors={"sclera": (0.93, 0.91, 0.86, 1), "pupil": (0.02, 0.015, 0.015, 1), "glint": (1, 1, 1, 1),
                          "lid": shade(skin, (0.9, 0.86, 0.86)), "lid_low": shade(skin, (0.95, 0.93, 0.93)), "lash": (0.05, 0.04, 0.04, 1)})
    brow = col(spec.get("brows", spec.get("hair_color", "black")))
    p.weight_fn = fixed("head")
    build_brows(p, shape, brow, thickness=0.8 if fem else 1.15, arch=1.25 if fem else 0.8)
    build_ears(p, shape, skin, shade(skin, (0.7, 0.6, 0.58)))
    if spec.get("moustache"):
        m = col(spec["moustache"])
        pts = [shape.landmark(x, -0.455 - abs(x) * 0.12) for x in (-0.24, -0.16, -0.08, 0.0, 0.08, 0.16, 0.24)]
        p.ribbon([q + (q - hc).normalized() * 0.004 for q in pts], [0.008, 0.011, 0.012, 0.011, 0.012, 0.011, 0.008], V((0, 0, 1)), "MAT_Hair_A", m)
    if spec.get("beard"):
        p.weight_fn = jaw_weight(shape)  # the beard moves with the chin
        b = col(spec["beard"])
        long = spec.get("beard_long", 0.0)
        p.ico(1.0, tuple(shape.landmark(0, -0.84) + V((0, 0.03, -0.005 - long * 0.035))), "MAT_Hair_A", b, subdiv=2,
              scale=(0.055, 0.042, 0.04 + long * 0.06), noise=0.05, rng=rng)
        for sx in (-1, 1):
            p.ico(1.0, tuple(shape.landmark(sx * 0.62, -0.55) + V((sx * 0.004, 0.012, 0))), "MAT_Hair_A", b, subdiv=2, scale=(0.02, 0.04, 0.045), noise=0.04, rng=rng)
    p.weight_fn = fixed("head")
    if spec.get("bindi"):
        p.ico(1.0, tuple(shape.landmark(0, 0.2) + V((0, -0.002, 0))), "MAT_Skin_A", col("cloth_red"), subdiv=1, scale=(0.005, 0.002, 0.005))
    if spec.get("earrings"):
        for sx in (-1, 1):
            p.ico(1.0, (sx * rx * 1.0, hc.y + ry * 0.08, hc.z - rz * 0.36), "MAT_Brass_A", col("brass"), subdiv=1, scale=(0.007, 0.007, 0.01))

    hair = col(spec.get("hair_color", "black"))
    style = spec.get("hair", "short")
    if style in ("topknot", "short", "bun", "side"):
        # hair: a shell over the scalp ending at a hairline above the brow and ears
        long_back = -0.6 if fem else -0.42
        build_hair_cap(p, shape, hair, thick=0.014 if style != "short" else 0.009, front=0.52 if fem else 0.48, back=long_back)
    if style == "topknot":
        p.ico(1.0, tuple(hc + V((0, ry * 0.45, rz * 1.02))), "MAT_Hair_A", hair, subdiv=2, scale=(0.04, 0.04, 0.037))
        p.lathe([(0.019, -0.01), (0.021, 0.0), (0.019, 0.01)], tuple(hc + V((0, ry * 0.45, rz * 0.8))), "MAT_Thatch_A", col("thatch"), segments=8)
    if style == "bun":
        bc = hc + V((0, ry * 1.08, -rz * 0.18))
        p.ico(1.0, tuple(bc), "MAT_Hair_A", hair, subdiv=2, scale=(0.05, 0.04, 0.047))
        if spec.get("flowers", True):
            for k in range(9):
                a = math.pi * 0.15 + k * math.pi * 0.7 / 8
                p.ico(1.0, (math.cos(a) * 0.056, bc.y + 0.004, bc.z + math.sin(a) * 0.048), "MAT_Foliage_A", col("jasmine"), subdiv=1, scale=(0.01, 0.01, 0.01))
    if style == "bald_topknot":
        for sx in (-1, 1):
            p.ico(1.0, tuple(hc + V((sx * rx * 0.92, ry * 0.3, -rz * 0.05))), "MAT_Hair_A", hair, subdiv=2, scale=(0.022, 0.06, 0.045), noise=0.06, rng=rng)
        p.ico(1.0, tuple(hc + V((0, ry * 0.85, -rz * 0.12))), "MAT_Hair_A", hair, subdiv=2, scale=(0.065, 0.03, 0.045), noise=0.06, rng=rng)
        p.ico(1.0, tuple(hc + V((0, ry * 0.7, rz * 0.62))), "MAT_Hair_A", hair, subdiv=2, scale=(0.032, 0.032, 0.03))
    headwear = spec.get("headwear")
    if headwear == "towel":
        tw = col(spec.get("headwear_color", "cloth_white"))
        p.lathe([(rx * 1.16, 0.0), (rx * 1.26, 0.02), (rx * 1.26, 0.05), (rx * 1.14, 0.07), (rx * 0.8, 0.078)], tuple(hc + V((0, ry * 0.05, rz * 0.32))), "MAT_Cloth_A", tw, segments=16)
    return hc


def arms(p, body, spec, skin):
    s = body.s
    m = spec.get("muscle", 0.0)
    thin = spec.get("thin", 0.0)
    fem = body.female
    for side, sx in (("L", 1), ("R", -1)):
        g = lambda k: getattr(body, f"{k}_{side}")
        chain = [(f"shoulder_{side}", g("clav"), g("shoulder")), (f"upper_arm_{side}", g("shoulder"), g("elbow")),
                 (f"forearm_{side}", g("elbow"), g("wrist")), (f"hand_{side}", g("wrist"), g("hand_tip"))]
        p.weight_fn = chain_weights(chain, blend=0.05)
        r0 = (0.052 if not fem else 0.044) * (1 + m * 0.3 - thin * 0.12) * body.girth
        p.ico(1.0, tuple(g("shoulder") + V((-sx * 0.012, 0, -0.004))), "MAT_Skin_A", skin, subdiv=2, scale=(r0 * 0.98, r0 * 0.98, r0 * 1.05))  # deltoid
        sh, el, wr = g("shoulder"), g("elbow"), g("wrist")
        path = [sh, sh.lerp(el, 0.45), el, el.lerp(wr, 0.3), el.lerp(wr, 0.7), wr + (wr - el).normalized() * 0.008]
        p.tube([tuple(v) for v in path], [r0, r0 * (1.02 + m * 0.12), r0 * 0.74, r0 * (0.84 + m * 0.08), r0 * 0.66, r0 * 0.54], "MAT_Skin_A", skin, segments=12)
        if spec.get("wraps"):
            for k in range(3):
                c = wr.lerp(el, 0.08 + k * 0.08)
                p.lathe([(r0 * 0.7, -0.012), (r0 * 0.76, 0.0), (r0 * 0.7, 0.012)], tuple(c), "MAT_Cloth_A", col("cloth_white"), segments=10)
        if spec.get("bangles") or fem:
            for k in range(2 if not fem else 3):
                p.lathe([(r0 * 0.64, -0.004), (r0 * 0.68, 0.0), (r0 * 0.64, 0.004)], tuple(wr.lerp(el, 0.06 + k * 0.03)), "MAT_Brass_A", col("brass"), segments=10)
        joints = finger_joints(body, side)
        knuckle_mid = (joints["index"][0] + joints["pinky"][0]) / 2

        def weight_for(part, side=side, joints=joints, knuckle_mid=knuckle_mid, el=el, wr=wr):
            if part == "palm":
                return chain_weights([(f"forearm_{side}", el, wr), (f"hand_{side}", wr, knuckle_mid)], blend=0.025)
            a, mm, t = joints[part]
            return chain_weights([(f"hand_{side}", wr, a), (f"{part}_01_{side}", a, mm), (f"{part}_02_{side}", mm, t)], blend=0.01)

        build_hand(p, body, side, skin, shade(skin, (0.88, 0.8, 0.78)), weight_for)


def legs(p, body, spec, skin, rng):
    s = body.s
    m = spec.get("muscle", 0.0)
    for side, sx in (("L", 1), ("R", -1)):
        g = lambda k: getattr(body, f"{k}_{side}")
        chain = [("hips", body.hips, g("hipj")), (f"thigh_{side}", g("hipj"), g("knee")), (f"shin_{side}", g("knee"), g("ankle")),
                 (f"foot_{side}", g("ankle"), g("ball")), (f"toe_{side}", g("ball"), g("toe"))]
        p.weight_fn = chain_weights(chain, blend=0.06)
        kn, an = g("knee"), g("ankle")
        path = [g("hipj") + V((0, 0, 0.05)), g("hipj").lerp(kn, 0.5), kn, kn.lerp(an, 0.3), kn.lerp(an, 0.75), an + V((0, 0, 0.02))]
        rk = 1 + m * 0.15
        gi = body.girth
        p.tube([tuple(v) for v in path], [r * gi for r in (0.075 * rk, 0.064 * rk, 0.05, 0.056 * rk, 0.042, 0.038)], "MAT_Skin_A", skin, segments=10)
        # bare foot: sole, instep, five toes
        foot_c = (an + g("ball")) / 2
        p.ico(1.0, tuple(foot_c + V((0, 0.012 * s, -0.03 * s))), "MAT_Skin_A", skin, subdiv=1, scale=(0.042 * gi, 0.088 * s, 0.034 * gi))
        p.ico(1.0, tuple(an + V((0, 0.035 * s, -0.045 * s))), "MAT_Skin_A", skin, subdiv=1, scale=(0.035 * gi, 0.035 * gi, 0.03 * gi))  # heel
        for t in range(5):
            tx = g("ball").x + sx * (-0.022 + t * 0.011) * gi
            p.ico(1.0, (tx, g("ball").y - 0.045 * s + abs(t - 1) * 0.006, 0.014), "MAT_Skin_A", skin, subdiv=1, scale=((0.0085 if t else 0.012) * gi, 0.016 * gi, 0.011 * gi))
        if spec.get("sandals"):
            p.box((0.1, 0.27, 0.016), tuple(foot_c + V((0, -0.02, -0.055))), "MAT_Wood_Teak_A", col(spec["sandals"]))


def kachcha_dhoti(p, body, spec):
    """Dhoti wrapped between the legs: waist roll, two baggy leg sleeves, front pleat fall, border at the hems."""
    s = body.s
    d = spec["dhoti"]
    base = col(d["color"])
    border = col(d.get("border", d["color"]))
    hem = d.get("hem", 0.3) * s  # height of the hem above the ground
    bag = d.get("bag", 1.0)
    p.weight_fn = chain_weights([("hips", body.hips + V((0, 0, -0.12)), body.spine), ("spine", body.spine, body.chest)], blend=0.05)
    top = 1.07 * s
    gi = body.girth
    p.loft([(top - 0.12, (0.172 + body.belly) * gi, (0.125 + body.belly) * gi, -0.004), (top - 0.03, (0.168 + body.belly) * gi, (0.12 + body.belly) * gi, -0.006),
            (top, (0.16 + body.belly) * gi, (0.112 + body.belly) * gi, -0.006)], "MAT_Cloth_A", lambda z: base, segments=16)
    # rolled waist band
    p.lathe([((0.164 + body.belly) * gi, -0.015), ((0.178 + body.belly) * gi, 0.0), ((0.164 + body.belly) * gi, 0.015)], (0, -0.006, top - 0.015), "MAT_Cloth_A", border, segments=16)
    for side, sx in (("L", 1), ("R", -1)):
        g = lambda k: getattr(body, f"{k}_{side}")
        chain = [("hips", body.hips, g("hipj")), (f"thigh_{side}", g("hipj"), g("knee")), (f"shin_{side}", g("knee"), g("ankle"))]
        p.weight_fn = chain_weights(chain, blend=0.09)
        kn, an = g("knee"), g("ankle")
        hem_pt = an.lerp(kn, max(0.0, min(1.0, (hem - an.z) / (kn.z - an.z)))) if hem < kn.z else kn.lerp(g("hipj"), (hem - kn.z) / (g("hipj").z - kn.z))
        top_pt = V((sx * 0.08 * s * gi, -0.005, top - 0.1))
        pts = [top_pt, g("hipj").lerp(kn, 0.35), kn + V((0, -0.01, 0))]
        radii = [0.13 * bag * gi, 0.115 * bag * gi, 0.098 * bag * gi]
        if hem < kn.z:
            pts.append(hem_pt + V((0, 0, 0.02)))
            radii.append(0.085 * bag * gi)
        else:
            pts[-1] = hem_pt
        p.tube([tuple(v) for v in pts], radii, "MAT_Cloth_A", base, segments=12)
        # hem border band
        hp = pts[-1]
        p.lathe([(radii[-1] * 1.02, -0.022), (radii[-1] * 1.06, 0.0), (radii[-1] * 1.02, 0.02)], tuple(hp + V((0, 0, 0.01))), "MAT_Cloth_A", border, segments=12)
    # front pleat fall (between the legs, shared by both thighs)
    p.weight_fn = lambda co: {"hips": 0.5, "thigh_L": 0.25, "thigh_R": 0.25} if co.z < 0.9 * s else {"hips": 1.0}
    fall_bottom = max(hem + 0.08, 0.5 * s)
    for k, off in enumerate((-0.03, 0.0, 0.03)):
        p.box((0.05, 0.02, top - fall_bottom), (off, -0.135 - body.belly - k * 0.003, (top + fall_bottom) / 2 - 0.02), "MAT_Cloth_A", base if k != 1 else border, taper=(1.6, 1.0))


def long_veshti(p, body, spec):
    """Straight ankle-length veshti (trader, elder, women's saree skirt). Hem weighted toward the thighs."""
    s = body.s
    sk = spec["veshti"]
    length = sk.get("bottom", 0.1) * s

    def skirt_w(co):
        sideL = max(0.0, min(1.0, 0.5 + co.x / 0.16))
        u = max(0.0, min(1.0, (0.98 * s - co.z) / (0.98 * s - length)))
        depth = (u ** 0.8) * 0.9
        w = {"hips": 1 - depth}
        if depth > 0:
            w["thigh_L"] = depth * sideL
            w["thigh_R"] = depth * (1 - sideL)
        return w

    p.weight_fn = skirt_w
    top = 1.07 * s
    base, band = col(sk["color"]), col(sk.get("border", sk["color"]))
    flare = sk.get("flare", 0.21)
    n = 7
    rings = []
    for i in range(n + 1):
        t = i / n
        z = top + (length - top) * t
        rx = (0.158 + (0.02 if body.female else 0)) + (flare - 0.158) * (t ** 0.8) + body.belly * (1 - t)
        ry = 0.112 + (flare * 0.78 - 0.112) * (t ** 0.8) + body.belly * (1 - t)
        rings.append((z, rx * body.girth, ry * body.girth, -0.005))
    rings.insert(0, (top + 0.02, rings[0][1] - 0.01, rings[0][2] - 0.01, -0.005))
    mat = sk.get("mat", "MAT_Cloth_A")
    p.loft(rings, mat, lambda z: band if (z < length + 0.07 or abs(z - top) < 0.025) else base, segments=18, double=True)
    if sk.get("pleats"):
        p.box((0.13 * body.girth, 0.02, top - length - 0.05), (0.02, (-0.165 - flare * 0.15) * body.girth, (top + length) / 2), mat, band, taper=(1.4, 1))
    else:  # front tuck fold of a veshti
        p.box((0.06 * body.girth, 0.02, top - length - 0.1), (-0.05 * body.girth, (-0.16 - flare * 0.12) * body.girth, (top + length) / 2 + 0.03), "MAT_Cloth_A", base, taper=(1.6, 1))


def blouse(p, body, spec):
    s = body.s
    b = spec["blouse"]
    c = col(b["color"])
    p.weight_fn = chain_weights([("spine", body.spine, body.chest), ("chest", body.chest, body.neck)], blend=0.07)
    gi = body.girth
    p.loft([(z, rx * gi, ry * gi, cy * gi) for z, rx, ry, cy in [(1.17 * s, 0.158, 0.118, -0.012), (1.25 * s, 0.17, 0.132, -0.03), (1.33 * s, 0.17, 0.124, -0.026),
            (1.40 * s, 0.168, 0.106, -0.002), (1.455 * s, 0.124, 0.085, 0.008), (1.49 * s, 0.066, 0.064, 0.012)]], "MAT_Cloth_A", lambda z: c, segments=16)
    for side in ("L", "R"):
        g = lambda k: getattr(body, f"{k}_{side}")
        p.weight_fn = chain_weights([(f"shoulder_{side}", g("clav"), g("shoulder")), (f"upper_arm_{side}", g("shoulder"), g("elbow"))], blend=0.05)
        p.tube([tuple(g("shoulder") + V((0, 0, 0.008))), tuple(g("shoulder").lerp(g("elbow"), 0.4))], [0.052 * gi, 0.047 * gi], "MAT_Cloth_A", c, segments=10)


def shoulder_cloth(p, body, spec, key="angavastram"):
    """Long cloth over the LEFT shoulder hanging down front and back, with woven border stripes."""
    s = body.s
    a = spec[key]
    base, border = col(a["color"]), col(a.get("border", a["color"]))
    w = a.get("width", 0.13)
    front_len = a.get("front", 0.5) * s
    back_len = a.get("back", 0.45) * s
    sh = body.shoulder_L
    p.weight_fn = chain_weights([("spine", body.spine, body.chest), ("chest", body.chest, body.neck), ("shoulder_L", body.clav_L, body.shoulder_L)], blend=0.08)
    bulk = (1 + spec.get("muscle", 0) * 0.15 + body.belly * 2) * body.girth
    x0 = sh.x - 0.07
    over = [(x0, -0.13 * bulk, 1.30 * s), (x0, -0.105 * bulk, 1.42 * s), (x0 + 0.005, -0.03, 1.49 * s), (x0 + 0.005, 0.05, 1.49 * s), (x0, 0.105 * bulk, 1.42 * s), (x0, 0.12 * bulk, 1.30 * s)]
    front = [(x0 + 0.01, -0.138 * bulk, z) for z in (1.30 * s - front_len * t for t in (0.33, 0.66, 1.0))]
    back = [(x0 + 0.01, 0.128 * bulk, z) for z in (1.30 * s - back_len * t for t in (0.33, 0.66, 1.0))]
    path = list(reversed(front)) + over + back
    # three parallel strips (border | body | border), double-sided
    for k, (o0, o1, c) in enumerate(((-w / 2, -w / 2 + 0.018, border), (-w / 2 + 0.018, w / 2 - 0.018, base), (w / 2 - 0.018, w / 2, border))):
        a_pts = [(x + o0, y, z) for x, y, z in path]
        b_pts = [(x + o1, y, z) for x, y, z in path]
        p.quad_strip(a_pts, b_pts, "MAT_Cloth_A", c)
        p.quad_strip([(x, y + (0.004 if y < 0 else -0.004), z) for x, y, z in b_pts], [(x, y + (0.004 if y < 0 else -0.004), z) for x, y, z in a_pts], "MAT_Cloth_A", c)


def saree_pallu(p, body, spec):
    """Saree end: a band drawn from the right hip across the chest, over the left shoulder and down the back.
    Built as a ribbon lying on the body surface (width across the path), with a woven border on both edges."""
    s = body.s
    gi = body.girth
    pa = spec["pallu"]
    base, border = col(pa["color"]), col(pa.get("border", pa["color"]))
    mat = pa.get("mat", "MAT_Cloth_A")
    p.weight_fn = chain_weights([("hips", body.hips + V((0, 0, -0.1)), body.spine), ("spine", body.spine, body.chest), ("chest", body.chest, body.neck),
                                 ("shoulder_L", body.clav_L, body.shoulder_L)], blend=0.07)
    bulge = 1 + body.belly * 2
    path = [(-0.15, -0.135, 1.0), (-0.09, -0.152, 1.12), (-0.02, -0.158, 1.24), (0.05, -0.148, 1.33), (0.1, -0.12, 1.4), (0.125, -0.07, 1.452),
            (0.13, 0.0, 1.472), (0.125, 0.07, 1.452), (0.1, 0.112, 1.38), (0.065, 0.122, 1.22), (0.03, 0.122, 1.05), (0.0, 0.118, 0.88)]
    pts = [V((x * gi, y * gi * bulge, z * s)) for x, y, z in path]
    wd = pa.get("width", 0.2) * gi
    edges_a, edges_b, mids_a, mids_b = [], [], [], []
    prev = None
    for i, q in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = V((q.x, q.y * 1.3, max(0.0, q.z - 1.4 * s) * 4)).normalized()  # roughly the body surface normal
        d = t.cross(n).normalized()
        if prev is not None and d.dot(prev) < 0:
            d = -d
        prev = d
        lift = n * 0.006
        # over the shoulder the band narrows into a fold
        w = wd * (0.6 if 5 <= i <= 7 else 1.0)
        edges_a.append(tuple(q + d * w / 2 + lift))
        edges_b.append(tuple(q - d * w / 2 + lift))
        mids_a.append(tuple(q + d * (w / 2 - 0.025) + lift * 1.1))
        mids_b.append(tuple(q - d * (w / 2 - 0.025) + lift * 1.1))
    p.quad_strip(mids_a, mids_b, mat, base)
    p.quad_strip(mids_b, mids_a, mat, base)
    for e, m in ((edges_a, mids_a), (edges_b, mids_b)):
        p.quad_strip(e, m, "MAT_Cloth_A", border)
        p.quad_strip(m, e, "MAT_Cloth_A", border)


def accessories(p, body, spec, rng):
    s = body.s
    if spec.get("pouch"):  # cloth pouch at the right hip with a tie
        p.weight_fn = fixed("hips")
        c = col(spec["pouch"])
        p.ico(1.0, (-0.17, -0.07, 0.97 * s), "MAT_Cloth_A", c, subdiv=2, scale=(0.045, 0.04, 0.05), noise=0.08, rng=rng)
        p.lathe([(0.02, 0), (0.016, 0.02), (0.022, 0.04)], (-0.17, -0.07, 1.015 * s), "MAT_Cloth_A", c, segments=8)
    if spec.get("necklace"):
        p.weight_fn = fixed("chest")
        p.lathe([(0.075, -0.003), (0.078, 0.0), (0.075, 0.003)], (0, 0.0, 1.47 * s), "MAT_Thatch_A", col("thatch"), segments=14)
        p.ico(1.0, (0, -0.095, 1.405 * s), "MAT_Brass_A", col("brass"), subdiv=1, scale=(0.012, 0.006, 0.016))
    if spec.get("tool_belt"):
        p.weight_fn = fixed("hips")
        c = col("teak_dark")
        p.lathe([(0.178, -0.022), (0.186, 0.0), (0.178, 0.022)], (0, -0.006, 1.03 * s), "MAT_Wood_Teak_A", c, segments=16)
        for x, y in ((0.12, -0.14), (-0.15, -0.1), (0.17, 0.02)):
            p.box((0.07, 0.035, 0.08), (x, y, 0.97 * s), "MAT_Wood_Teak_A", col("teak"), rot_z=math.atan2(y, x) + math.pi / 2)
        p.box((0.015, 0.015, 0.14), (0.15, -0.13, 0.95 * s), "MAT_Wood_Teak_A", col("teak"))  # chisel handle
    if spec.get("satchel"):  # cross-body strap from left shoulder to a bag at the right hip
        p.weight_fn = chain_weights([("hips", body.hips, body.spine), ("spine", body.spine, body.chest), ("chest", body.chest, body.neck)], blend=0.08)
        c = col("teak")
        strap_a = [(0.13, -0.11, 1.42 * s), (0.02, -0.15, 1.26 * s), (-0.1, -0.15, 1.1 * s), (-0.16, -0.12, 1.0 * s)]
        p.quad_strip(strap_a, [(x + 0.03, y - 0.004, z + 0.012) for x, y, z in strap_a], "MAT_Wood_Teak_A", c)
        p.weight_fn = fixed("hips")
        p.box((0.16, 0.06, 0.13), (-0.17, -0.1, 0.94 * s), "MAT_Wood_Teak_A", col("teak"), rot_z=0.5)
        p.box((0.16, 0.065, 0.05), (-0.17, -0.105, 0.99 * s), "MAT_Wood_Teak_A", col("teak_dark"), rot_z=0.5)
    if spec.get("sacred_thread"):  # poonal: a thin cord from the left shoulder across to the right hip
        p.weight_fn = chain_weights([("spine", body.spine, body.chest), ("chest", body.chest, body.neck)], blend=0.08)
        pts = [(0.12, -0.105, 1.42 * s), (0.04, -0.14, 1.3 * s), (-0.06, -0.15, 1.17 * s), (-0.14, -0.12, 1.05 * s), (-0.16, 0.0, 1.0 * s), (-0.1, 0.11, 1.1 * s), (0.05, 0.12, 1.3 * s), (0.12, 0.09, 1.42 * s)]
        p.tube(pts, [0.004] * len(pts), "MAT_Cloth_A", col("cloth_white"), segments=4)
    if spec.get("vibhuti"):  # three horizontal ash stripes on the forehead and a kumkum dot
        p.weight_fn = fixed("head")
        hz = body.head_top.z - 0.116 * s - 0.004
        for k in range(3):
            p.box((0.07, 0.004, 0.006), (0, -0.006 - 0.103 * s * 0.88, hz + (0.035 + k * 0.012) * s), "MAT_Skin_A", col("vibhuti"))
        p.ico(1.0, (0, -0.006 - 0.103 * s * 0.93, hz + 0.02 * s), "MAT_Skin_A", col("kumkum_red"), subdiv=1, scale=(0.005, 0.003, 0.005))
    if spec.get("waist_rope"):
        p.weight_fn = fixed("hips")
        p.lathe([(0.17, -0.008), (0.176, 0.0), (0.17, 0.008)], (0, -0.008, 1.02 * s), "MAT_Thatch_A", col("thatch"), segments=16)
    if spec.get("staff"):  # weighted entirely to the right hand so it follows the arm
        p.weight_fn = fixed("hand_R")
        w = body.wrist_R + (body.hand_tip_R - body.wrist_R) * 0.6
        p.tube([(w.x - 0.01, w.y - 0.06, w.z + 0.35), (w.x - 0.02, w.y - 0.05, w.z), (w.x - 0.04, w.y - 0.03, 0.01)], [0.016, 0.017, 0.015], "MAT_Wood_Teak_A", col("teak"), segments=6)


def build_character(spec, with_clips):
    rng = random.Random(spec["seed"])
    body = Body(height=spec.get("height", 1.72), shoulder=spec.get("shoulder", 0.19), hip=spec.get("hip", 0.095),
                female=spec.get("female", False), belly=spec.get("belly", 0.0), head_scale=spec.get("head_scale", 1.0))
    rt = root(spec["id"])
    arm = build_armature(body)
    arm.parent = rt
    p = CharPart()
    skin = col(SKIN[spec.get("skin", "warm")])
    torso(p, body, spec, skin)
    head(p, body, spec, skin, rng)
    arms(p, body, spec, skin)
    legs(p, body, spec, skin, rng)
    if "dhoti" in spec:
        kachcha_dhoti(p, body, spec)
    if "veshti" in spec:
        long_veshti(p, body, spec)
    if "blouse" in spec:
        blouse(p, body, spec)
    if "angavastram" in spec:
        shoulder_cloth(p, body, spec)
    if "pallu" in spec:
        saree_pallu(p, body, spec)
    accessories(p, body, spec, rng)
    mesh = p.to_skinned(f"{spec['id']}_Mesh", arm)
    mesh.parent = arm

    bpy.context.scene.render.fps = FPS
    clip_meta = []
    if with_clips:
        for name, frames, fn, loop in CLIPS:
            make_action(arm, name, frames, fn, step=2 if frames <= 60 else 3, loop=loop)
            clip_meta.append({"name": name, "duration": round(frames / FPS, 3), "loop": loop})
        arm.animation_data.action = None
    pose(arm, {})
    extra = {"skeleton": "SK_Humanoid_A", "height": spec.get("height", 1.72), "sharesClipsFrom": None if with_clips else "CHR_Player_Base"}
    if with_clips:
        extra["clips"] = clip_meta
    report = export_asset(spec["id"], "characters", rt, required=["SK_Humanoid_A", f"{spec['id']}_Mesh"], animations=with_clips, extra_report=extra)
    return report, rt


GOLD = "marigold_yellow"
SPECS = {
    "CHR_Player_Base": dict(seed=1, height=1.70, skin="warm", hair="topknot", hair_color="black", necklace=True, pouch="soil_dry",
                            dhoti={"color": "cloth_white", "border": GOLD, "hem": 0.2},
                            angavastram={"color": "cloth_white", "border": GOLD, "front": 0.52, "back": 0.42}),
    "CHR_NPC_Amudha": dict(seed=2, height=1.58, female=True, shoulder=0.165, hip=0.092, skin="tan", hair="bun", hair_color="grey", flowers=True,
                           earrings=True, waist_rope=True, veshti={"color": "ochre", "border": "red_oxide", "bottom": 0.07, "flare": 0.2, "pleats": True},
                           blouse={"color": "marigold_yellow"}, pallu={"color": "leaf_dry", "border": "cloth_green", "width": 0.2}),
    "CHR_NPC_Velan": dict(seed=3, height=1.76, shoulder=0.215, muscle=1.0, skin="deep", hair="topknot", hair_color="black", moustache="black", beard="black",
                          wraps=True, tool_belt=True, dhoti={"color": "cloth_indigo", "border": "cloth_indigo", "hem": 0.42, "bag": 1.1}),
    "CHR_NPC_Selvam": dict(seed=4, height=1.72, belly=0.02, skin="warm", hair="short", hair_color="black", moustache="black", satchel=True, bangles=True,
                           veshti={"color": "cloth_white", "border": GOLD, "bottom": 0.07, "flare": 0.21},
                           angavastram={"color": "cloth_white", "border": GOLD, "front": 0.48, "back": 0.45}),
    "CHR_NPC_Ponnan": dict(seed=5, height=1.66, thin=1.0, skin="deep", hair="bald_topknot", hair_color="white", brows="grey", moustache="white", beard="white",
                           beard_long=1.0, staff=True, veshti={"color": "cloth_white", "border": GOLD, "bottom": 0.06, "flare": 0.2},
                           angavastram={"color": "cloth_white", "border": GOLD, "front": 0.6, "back": 0.55, "width": 0.2}),
    "CHR_NPC_Valli": dict(seed=6, height=1.6, female=True, shoulder=0.165, hip=0.09, skin="warm", hair="bun", hair_color="black", bindi=True, earrings=True,
                          veshti={"color": "cloth_red", "border": GOLD, "bottom": 0.07, "flare": 0.2, "pleats": True},
                          blouse={"color": GOLD}, pallu={"color": "cloth_red", "border": GOLD, "width": 0.2}),
    "CHR_NPC_Meena": dict(seed=10, height=1.62, female=True, shoulder=0.165, hip=0.09, skin="tan", hair="bun", hair_color="black", bindi=True, earrings=True,
                          veshti={"color": "cloth_indigo", "border": "cloth_red", "bottom": 0.07, "flare": 0.2, "pleats": True},
                          blouse={"color": "plaster"}, pallu={"color": "cloth_indigo", "border": "cloth_red", "width": 0.2}),
    "CHR_NPC_Kaaval": dict(seed=11, height=1.78, shoulder=0.205, muscle=0.5, skin="deep", hair="short", hair_color="black", moustache="black",
                           headwear="towel", headwear_color="red_oxide", staff=True, waist_rope=True,
                           dhoti={"color": "soil_dry", "border": "red_oxide", "hem": 0.38, "bag": 1.0},
                           angavastram={"color": "red_oxide", "border": "soil_dry", "front": 0.45, "back": 0.4}),
    # temple visit: the playable mom (saree tinted at runtime), her family and the priest
    "CHR_Player_Mom": dict(seed=21, height=1.6, female=True, shoulder=0.165, hip=0.095, belly=0.012, skin="warm", hair="bun", hair_color="black",
                           flowers=True, bindi=True, earrings=True, necklace=True,
                           veshti={"color": "saree_base", "border": GOLD, "bottom": 0.06, "flare": 0.21, "pleats": True, "mat": "MAT_Saree_A"},
                           blouse={"color": "marigold_yellow"}, pallu={"color": "saree_base", "border": GOLD, "width": 0.22, "mat": "MAT_Saree_A"}),
    "CHR_Family_Husband": dict(seed=22, height=1.73, belly=0.025, skin="tan", hair="short", hair_color="black", moustache="black",
                               veshti={"color": "cloth_white", "border": GOLD, "bottom": 0.07, "flare": 0.21},
                               angavastram={"color": "cloth_white", "border": GOLD, "front": 0.5, "back": 0.45}),
    "CHR_Child_Boy": dict(seed=23, height=1.12, head_scale=1.38, shoulder=0.15, hip=0.085, skin="warm", hair="short", hair_color="black",
                          dhoti={"color": "cloth_white", "border": GOLD, "hem": 0.32}, angavastram={"color": "marigold_yellow", "border": GOLD, "front": 0.4, "back": 0.35, "width": 0.1}),
    "CHR_Child_Girl": dict(seed=24, height=1.05, head_scale=1.4, female=True, shoulder=0.14, hip=0.085, skin="light", hair="bun", hair_color="black", flowers=True, bindi=True,
                           veshti={"color": "cloth_green", "border": GOLD, "bottom": 0.08, "flare": 0.19, "pleats": True}, blouse={"color": "cloth_saffron"}),
    "CHR_NPC_Priest": dict(seed=25, height=1.68, belly=0.03, skin="tan", hair="bald_topknot", hair_color="black", sacred_thread=True, vibhuti=True,
                           veshti={"color": "cloth_saffron", "border": "red_oxide", "bottom": 0.07, "flare": 0.2}),
    "CHR_Villager_A": dict(seed=7, height=1.69, skin="tan", hair="short", hair_color="black", moustache="black",
                           dhoti={"color": "cloth_white", "border": "cloth_white", "hem": 0.4}),
    "CHR_Villager_B": dict(seed=8, height=1.73, skin="deep", hair="short", hair_color="salt", moustache="salt", headwear="towel", headwear_color="cloth_white",
                           dhoti={"color": "sandstone", "border": "red_oxide", "hem": 0.45}),
    "CHR_Villager_C": dict(seed=9, height=1.56, female=True, shoulder=0.16, hip=0.09, skin="light", hair="bun", hair_color="black", flowers=False, earrings=True,
                           veshti={"color": "cloth_green", "border": "marigold", "bottom": 0.07, "flare": 0.19, "pleats": True},
                           blouse={"color": "cloth_saffron"}, pallu={"color": "cloth_green", "border": "marigold", "width": 0.18}),
}


def _make(name):
    def fn():
        return build_character({"id": name, **SPECS[name]}, with_clips=name == "CHR_Player_Base")

    fn.__name__ = name
    return fn


for _n in SPECS:
    ASSETS[_n] = _make(_n)
