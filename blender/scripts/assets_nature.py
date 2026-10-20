"""Vegetation, garden, irrigation channel and old-grounds pieces.

State-driven sub-objects (toggled at runtime from GameState):
  STATE_<state>   visible only while the owning restoration is in <state>
  PICK_<name>     visible only while the gather node is available
  WATER_<name>    rendered with the runtime water shader
"""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.arch import pillar, rect_lathe

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def leaf_cluster(p, center, radius, rng, colors=("leaf", "leaf_light"), n=6, squash=0.8):
    cx, cy, cz = center
    for i in range(n):
        a = rng.random() * math.tau
        r = radius * (0.2 + rng.random() * 0.55)
        loc = (cx + math.cos(a) * r, cy + math.sin(a) * r, cz + (rng.random() - 0.4) * radius * 0.5)
        p.ico(radius * (0.45 + rng.random() * 0.3), loc, "MAT_Foliage_A", rgb(rng.choice(colors), 0.08, rng), subdiv=1,
              scale=(1, 1, squash), noise=0.18, rng=rng)


@asset
def PRP_Jasmine_Bush_A():
    rng = random.Random(501)
    rt = root("PRP_Jasmine_Bush_A")
    p = Part()
    for k in range(5):
        a = k * 1.3
        p.tube([(0, 0, 0), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.35), (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.6)], [0.03, 0.022, 0.015], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=5)
    leaf_cluster(p, (0, 0, 0.6), 0.5, rng, colors=("leaf", "leaf"), n=9)
    p.to_object("PRP_Jasmine_Bush_A_Leaves").parent = rt
    f = Part()
    for k in range(34):
        a = rng.random() * math.tau
        e = rng.random() * 1.2 - 0.2
        r = 0.48 + rng.random() * 0.12
        f.ico(0.035, (math.cos(a) * r * math.cos(e), math.sin(a) * r * math.cos(e), 0.6 + math.sin(e) * r * 0.75), "MAT_Foliage_A", rgb("jasmine", 0.03, rng), subdiv=1)
    f.to_object("PICK_Flowers").parent = rt
    collider("Bush", (0.9, 0.9, 1.0), (0, 0, 0.5), parent=rt)
    return export_asset("PRP_Jasmine_Bush_A", "props", rt, required=["PICK_Flowers"]), rt


@asset
def PRP_Marigold_Bed_A():
    rng = random.Random(511)
    rt = root("PRP_Marigold_Bed_A")
    p = Part()
    L, Wd = 3.0, 1.3
    # brick edging and soil
    for sx in (-1, 1):
        p.box((L + 0.2, 0.12, 0.22), (0, sx * (Wd / 2 + 0.06), 0.11), "MAT_Terracotta_A", rgb("terracotta", 0.06, rng))
        p.box((0.12, Wd, 0.22), (sx * (L / 2 + 0.04), 0, 0.11), "MAT_Terracotta_A", rgb("terracotta", 0.06, rng))
    p.box((L, Wd, 0.18), (0, 0, 0.09), "MAT_Soil_A", rgb("soil", 0.04, rng))
    p.to_object("PRP_Marigold_Bed_A_Bed").parent = rt
    positions = [(-L / 2 + 0.3 + i * 0.6, -Wd / 2 + 0.33 + j * 0.64) for i in range(5) for j in range(2)]
    # withered: dry bent stalks and fallen leaves
    w = Part()
    for x, y in positions:
        for k in range(3):
            a = rng.random() * math.tau
            w.tube([(x, y, 0.18), (x + math.cos(a) * 0.08, y + math.sin(a) * 0.08, 0.38), (x + math.cos(a) * 0.22, y + math.sin(a) * 0.22, 0.42)], [0.015, 0.012, 0.008],
                   "MAT_Foliage_A", rgb("leaf_dry", 0.1, rng), segments=4)
        w.ico(0.1, (x, y, 0.2), "MAT_Foliage_A", rgb("soil_dry", 0.1, rng), subdiv=1, scale=(1.4, 1.4, 0.3), noise=0.3, rng=rng)
    w.to_object("STATE_withered").parent = rt
    # recovering: healthy leafy plants
    g = Part()
    for x, y in positions:
        g.tube([(x, y, 0.18), (x, y, 0.42)], [0.02, 0.015], "MAT_Foliage_A", rgb("leaf", 0.05, rng), segments=4)
        leaf_cluster(g, (x, y, 0.42), 0.22, rng, colors=("leaf", "leaf_light"), n=4, squash=0.7)
    g.to_object("STATE_recovering").parent = rt
    # blooms (pickable when the garden recovers)
    b = Part()
    for x, y in positions:
        for k in range(3):
            a = rng.random() * math.tau
            r = rng.random() * 0.14
            loc = (x + math.cos(a) * r, y + math.sin(a) * r, 0.56 + rng.random() * 0.08)
            col = rgb("marigold" if rng.random() > 0.3 else "marigold_yellow", 0.04, rng)
            b.lathe([(0, -0.02), (0.06, 0.0), (0.075, 0.03), (0.055, 0.06), (0.0, 0.07)], loc, "MAT_Foliage_A", col, segments=10)
    b.to_object("PICK_Blooms").parent = rt
    collider("Bed", (L + 0.3, Wd + 0.3, 0.25), (0, 0, 0.125), parent=rt)
    return export_asset("PRP_Marigold_Bed_A", "props", rt, required=["STATE_withered", "STATE_recovering", "PICK_Blooms"]), rt


@asset
def PRP_Tree_Neem_A():
    rng = random.Random(521)
    rt = root("PRP_Tree_Neem_A")
    p = Part()
    trunk = [(0, 0, 0), (0.1, 0.05, 1.2), (0.05, 0.0, 2.6), (0.0, 0.1, 3.4)]
    p.tube(trunk, [0.36, 0.28, 0.22, 0.17], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=10)
    p.lathe([(0.55, 0), (0.36, 0.25), (0.0, 0.3)], (0, 0, -0.05), "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=10)
    tips = []
    for k in range(6):
        a = k * math.tau / 6 + rng.random() * 0.5
        start = (0.05, 0.05, 2.2 + rng.random() * 1.0)
        mid = (math.cos(a) * 1.0, math.sin(a) * 1.0, start[2] + 0.9)
        tip = (math.cos(a) * 2.0, math.sin(a) * 2.0, start[2] + 1.6 + rng.random() * 0.6)
        p.tube([start, mid, tip], [0.14, 0.09, 0.05], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=6)
        tips.append(tip)
    for t in tips:
        leaf_cluster(p, t, 1.15, rng, colors=("leaf", "leaf_light", "leaf"), n=5)
    leaf_cluster(p, (0, 0, 5.4), 1.6, rng, colors=("leaf", "leaf_light"), n=7)
    p.to_object("PRP_Tree_Neem_A_Mesh").parent = rt
    collider("Trunk", (0.8, 0.8, 3.0), (0, 0, 1.5), parent=rt)
    return export_asset("PRP_Tree_Neem_A", "environment", rt), rt


@asset
def PRP_Palm_Coconut_A():
    rng = random.Random(531)
    rt = root("PRP_Palm_Coconut_A")
    p = Part()
    H = 8.5
    path = []
    for i in range(12):
        t = i / 11
        path.append((math.sin(t * 1.6) * 0.9, 0, t * H))
    radii = [0.24 - 0.09 * (i / 11) for i in range(12)]
    p.tube(path, radii, "MAT_Wood_Teak_A", rgb("palm_trunk", 0.04, rng), segments=8)
    # trunk ring scars
    for i in range(1, 11):
        p.lathe([(radii[i] + 0.02, -0.03), (radii[i] + 0.03, 0.0), (radii[i] + 0.02, 0.03)], path[i], "MAT_Wood_Teak_A", rgb("bark", 0.06, rng), segments=8)
    top = path[-1]
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        p.ico(0.13, (top[0] + math.cos(a) * 0.22, top[1] + math.sin(a) * 0.22, top[2] - 0.25), "MAT_Foliage_A", rgb("palm", 0.1, rng), subdiv=1)
    # fronds: arched midrib with leaflets as a zig-zag strip, double-sided
    for k in range(11):
        a = k * math.tau / 11 + rng.random() * 0.2
        droop = 0.4 + rng.random() * 0.5
        L = 3.2 + rng.random() * 0.6
        rib = []
        for i in range(9):
            t = i / 8
            d = t * L
            z = top[2] + math.sin(t * math.pi * 0.7) * 1.0 - t * t * droop * 2.2
            rib.append((top[0] + math.cos(a) * d, top[1] + math.sin(a) * d, z))
        for side in (-1, 1):
            outer = []
            for i, (x, y, z) in enumerate(rib):
                t = i / 8
                w = math.sin(t * math.pi) * 0.7 + 0.05
                outer.append((x + -math.sin(a) * side * w, y + math.cos(a) * side * w, z - 0.25 * t - 0.1 * w))
            col = rgb("palm", 0.08, rng)
            p.quad_strip(rib, outer, "MAT_Foliage_A", col)
            p.quad_strip(outer, rib, "MAT_Foliage_A", col)
    p.to_object("PRP_Palm_Coconut_A_Mesh").parent = rt
    collider("Trunk", (0.6, 0.6, 3.0), (0, 0, 1.5), parent=rt)
    return export_asset("PRP_Palm_Coconut_A", "environment", rt), rt


@asset
def PRP_Banana_Plant_A():
    rng = random.Random(541)
    rt = root("PRP_Banana_Plant_A")
    p = Part()
    p.lathe([(0.18, 0), (0.15, 1.2), (0.1, 2.0)], (0, 0, 0), "MAT_Foliage_A", rgb("leaf_light", 0.05, rng), segments=8)
    for k in range(7):
        a = k * math.tau / 7 + rng.random() * 0.3
        L = 1.6 + rng.random() * 0.4
        rib = []
        for i in range(7):
            t = i / 6
            rib.append((math.cos(a) * t * L, math.sin(a) * t * L, 1.8 + math.sin(t * 2.2) * 0.6 - t * 0.4))
        for side in (-1, 1):
            outer = [(x - math.sin(a) * side * math.sin((i / 6) * math.pi) * 0.38, y + math.cos(a) * side * math.sin((i / 6) * math.pi) * 0.38, z - 0.05) for i, (x, y, z) in enumerate(rib)]
            col = rgb(rng.choice(("leaf", "leaf_light", "leaf_dry" if k == 6 else "leaf")), 0.06, rng)
            p.quad_strip(rib, outer, "MAT_Foliage_A", col)
            p.quad_strip(outer, rib, "MAT_Foliage_A", col)
    p.to_object("PRP_Banana_Plant_A_Mesh").parent = rt
    collider("Stem", (0.5, 0.5, 2.0), (0, 0, 1.0), parent=rt)
    return export_asset("PRP_Banana_Plant_A", "environment", rt), rt


@asset
def PRP_Grass_Clump_A():
    rng = random.Random(551)
    rt = root("PRP_Grass_Clump_A")
    p = Part()
    for k in range(22):
        a = rng.random() * math.tau
        r = rng.random() * 0.35
        x, y = math.cos(a) * r, math.sin(a) * r
        lean = rng.random() * math.tau
        h = 0.35 + rng.random() * 0.45
        tip = (x + math.cos(lean) * 0.18, y + math.sin(lean) * 0.18, h)
        w = 0.04
        base = [(x - math.sin(lean) * w, y + math.cos(lean) * w, 0), (x + math.sin(lean) * w, y - math.cos(lean) * w, 0)]
        col = rgb(rng.choice(("leaf", "leaf_light", "leaf_dry", "moss")), 0.08, rng)
        for order in ((0, 1), (1, 0)):
            verts = [p.bm.verts.new(base[order[0]]), p.bm.verts.new(base[order[1]]), p.bm.verts.new(tip)]
            f = p.bm.faces.new(verts)
            p._finish([f], "MAT_Foliage_A", col, shade=True)
    p.to_object("PRP_Grass_Clump_A_Mesh").parent = rt
    return export_asset("PRP_Grass_Clump_A", "environment", rt), rt


@asset
def PRP_Shrub_A():
    rng = random.Random(561)
    rt = root("PRP_Shrub_A")
    p = Part()
    leaf_cluster(p, (0, 0, 0.45), 0.7, rng, colors=("leaf", "moss", "leaf_light"), n=8, squash=0.65)
    p.to_object("PRP_Shrub_A_Mesh").parent = rt
    collider("Shrub", (1.2, 1.2, 0.9), (0, 0, 0.45), parent=rt)
    return export_asset("PRP_Shrub_A", "environment", rt), rt


def channel(asset_id, restored):
    """14 m stone-lined irrigation channel along X. Upstream (water source) at -X."""
    rng = random.Random(601)
    rt = root(asset_id)
    p = Part()
    L, inner, wall_w, wall_h = 14.0, 0.6, 0.28, 0.38
    broken0, broken1 = -1.2, 1.4
    # bed slabs
    x = -L / 2
    while x < L / 2:
        w = min(0.7, L / 2 - x)
        dry = not restored and x > broken1
        p.box((w - 0.02, inner, 0.06), (x + w / 2, 0, 0.03), "MAT_Stone_Granite_A", rgb("silt" if dry else "granite_dark", 0.06, rng))
        x += w
    # walls of dressed blocks on both sides
    for side in (-1, 1):
        y = side * (inner / 2 + wall_w / 2)
        x = -L / 2
        while x < L / 2:
            bl = min(0.5 + rng.random() * 0.25, L / 2 - x)
            cx = x + bl / 2
            in_break = broken0 < cx < broken1
            if in_break and not restored:
                if side == 1:  # north wall collapsed into the channel
                    p.box((bl, wall_w, wall_h), (cx + (rng.random() - 0.5) * 0.2, y - 0.35, 0.16), "MAT_Stone_Granite_A", rgb("granite_dark", 0.08, rng), rot_z=(rng.random() - 0.5) * 0.9)
                else:
                    p.box((bl - 0.015, wall_w, wall_h * 0.5), (cx, y, wall_h * 0.25), "MAT_Stone_Granite_A", rgb("granite", 0.06, rng))
            else:
                col = rgb("granite_new" if (in_break and restored) else "granite", 0.06, rng)
                p.box((bl - 0.015, wall_w, wall_h), (cx, y, wall_h / 2), "MAT_Stone_Granite_A", col)
                if in_break and restored:  # fresh lime mortar joint
                    p.box((0.02, wall_w + 0.01, wall_h - 0.02), (x + bl, y, wall_h / 2), "MAT_Plaster_Lime_A", rgb("clay_lime"))
                p.box((bl - 0.015, wall_w + 0.04, 0.05), (cx, y, wall_h + 0.025), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
            x += bl
    # garden-end spill lip
    p.box((0.4, inner + 0.6, 0.08), (L / 2 + 0.2, 0, 0.04), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    if not restored:
        # silt mound and weeds choking the break
        for k in range(5):
            p.ico(0.32 + rng.random() * 0.12, (broken0 + 0.3 + k * 0.5, (rng.random() - 0.5) * 0.2, 0.06), "MAT_Soil_A", rgb("silt", 0.08, rng), subdiv=2, scale=(1.3, 0.8, 0.55), noise=0.15, rng=rng)
        for k in range(8):
            p.ico(0.12, (broken0 + rng.random() * (broken1 - broken0), (rng.random() - 0.5) * 0.9, 0.22), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(1, 1, 0.6), noise=0.2, rng=rng)
        # cracked dry bed downstream
        for k in range(10):
            xx = broken1 + 0.3 + rng.random() * (L / 2 - broken1 - 0.6)
            p.box((0.25 + rng.random() * 0.3, 0.02, 0.01), (xx, (rng.random() - 0.5) * 0.4, 0.065), "MAT_Soil_A", rgb("soil", 0.05, rng), rot_z=rng.random() * 3)
    p.to_object(f"{asset_id}_Mesh", bevel=0.008).parent = rt
    w = Part()
    if restored:
        w.box((L, inner - 0.02, 0.02), (0, 0, 0.24), "MAT_Water_A", rgb("cloth_indigo"))
        w.box((0.5, inner + 0.3, 0.02), (L / 2 + 0.3, 0, 0.1), "MAT_Water_A", rgb("cloth_indigo"))
    else:
        w.box((broken0 + L / 2 - 0.2, inner - 0.02, 0.02), ((-L / 2 + broken0 - 0.2) / 2, 0, 0.2), "MAT_Water_A", rgb("cloth_indigo"))
    w.to_object("WATER_Channel").parent = rt
    for side in (-1, 1):
        collider(f"Wall_{side}", (L, wall_w + 0.05, 0.6), (0, side * (inner / 2 + wall_w / 2), 0.3), parent=rt)
    collider("Bed", (L, inner, 0.6), (0, 0, 0.3), parent=rt)
    empty("SOCKET_Break", ((broken0 + broken1) / 2, -0.9, 0), parent=rt)
    return export_asset(asset_id, "props", rt, required=["WATER_Channel", "SOCKET_Break"]), rt


@asset
def PRP_Channel_Blocked_A():
    return channel("PRP_Channel_Blocked_A", restored=False)


@asset
def PRP_Channel_Restored_A():
    return channel("PRP_Channel_Restored_A", restored=True)


@asset
def PRP_Rubble_Masonry_A():
    """Pile of fallen dressed blocks; the top block (PICK_Stone) is salvageable."""
    rng = random.Random(611)
    rt = root("PRP_Rubble_Masonry_A")
    p = Part()
    for k in range(6):
        a = rng.random() * math.tau
        r = rng.random() * 0.5
        p.box((0.55, 0.32, 0.3), (math.cos(a) * r, math.sin(a) * r, 0.14), "MAT_Stone_Granite_A", rgb("granite_dark", 0.08, rng), rot_z=rng.random() * 3)
    for k in range(3):
        p.ico(0.2, ((rng.random() - 0.5) * 1.0, (rng.random() - 0.5) * 1.0, 0.05), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(1.3, 1, 0.4), noise=0.2, rng=rng)
    p.to_object("PRP_Rubble_Masonry_A_Mesh", bevel=0.012).parent = rt
    s = Part()
    s.box((0.55, 0.32, 0.3), (0.05, 0.0, 0.42), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng), rot_z=0.3)
    s.to_object("PICK_Stone", bevel=0.012).parent = rt
    collider("Pile", (1.2, 1.2, 0.5), (0, 0, 0.25), parent=rt)
    return export_asset("PRP_Rubble_Masonry_A", "props", rt, required=["PICK_Stone"]), rt


@asset
def PRP_Inscription_Stone_A():
    rng = random.Random(621)
    rt = root("PRP_Inscription_Stone_A")
    p = Part()
    W, T, H = 0.95, 0.24, 1.55
    p.box((W + 0.3, T + 0.3, 0.2), (0, 0, 0.1), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    p.box((W, T, H - W / 2), (0, 0, 0.2 + (H - W / 2) / 2), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng))
    # rounded top
    a_pts, b_pts = [], []
    for i in range(9):
        a = math.pi * i / 8
        a_pts.append((math.cos(a) * W / 2, -T / 2, 0.2 + H - W / 2 + math.sin(a) * W / 2))
        b_pts.append((math.cos(a) * W / 2, T / 2, 0.2 + H - W / 2 + math.sin(a) * W / 2))
    p.quad_strip(b_pts, a_pts, "MAT_Stone_Granite_A", rgb("granite", 0.03, rng))
    for pts in (a_pts, list(reversed(b_pts))):
        f = p.bm.faces.new([p.bm.verts.new(q) for q in pts])
        p._finish([f], "MAT_Stone_Granite_A", rgb("granite", 0.03, rng))
    # carved lines of script on the front face (-Y) and a sun/moon motif at the top
    for row in range(9):
        z = 0.45 + row * 0.11
        x = -W / 2 + 0.1
        while x < W / 2 - 0.12:
            g = 0.03 + rng.random() * 0.06
            p.box((g, 0.02, 0.05), (x + g / 2, -T / 2 - 0.005, z), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
            x += g + 0.02
    p.lathe([(0.0, 0), (0.09, 0), (0.09, 0.02)], (-0.2, -T / 2 - 0.01, 1.55), "MAT_Stone_Granite_A", rgb("granite_dark"), segments=12)
    p.ico(0.1, (0.0, 0.0, 0.25), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(5.5, 2.2, 0.6), noise=0.2, rng=rng)
    p.to_object("PRP_Inscription_Stone_A_Mesh").parent = rt
    collider("Stone", (W + 0.3, T + 0.3, H), (0, 0, H / 2), parent=rt)
    return export_asset("PRP_Inscription_Stone_A", "props", rt), rt


@asset
def PRP_Clay_Bank_A():
    rng = random.Random(631)
    rt = root("PRP_Clay_Bank_A")
    p = Part()
    p.ico(1.4, (0, 0.6, -0.4), "MAT_Soil_A", rgb("soil_dry", 0.05, rng), subdiv=2, scale=(1.6, 1.0, 0.7), noise=0.08, rng=rng)
    p.ico(0.9, (0.0, -0.2, -0.35), "MAT_Soil_A", rgb("clay_lime", 0.05, rng), subdiv=2, scale=(1.4, 0.9, 0.55), noise=0.06, rng=rng)
    p.lathe([(0.0, 0), (0.24, 0.0), (0.28, 0.16), (0.0, 0.12)], (1.3, -0.9, 0), "MAT_Thatch_A", rgb("basket", 0.05, rng), segments=12)
    p.box((0.06, 0.06, 1.2), (-1.4, -0.8, 0.5), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), rot_z=0.3)
    p.box((0.3, 0.04, 0.25), (-1.4, -0.8, 0.05), "MAT_Brass_A", rgb("granite_dark"))
    for k in range(5):
        p.ico(0.25, ((rng.random() - 0.5) * 3.2, 1.2 + rng.random() * 0.4, 0.3), "MAT_Foliage_A", rgb("leaf", 0.1, rng), subdiv=1, noise=0.25, rng=rng)
    p.to_object("PRP_Clay_Bank_A_Mesh").parent = rt
    c = Part()
    for k in range(3):
        c.ico(0.16, (0.9 + k * 0.18, -0.95 + (k % 2) * 0.1, 0.1), "MAT_Soil_A", rgb("clay_lime", 0.04, rng), subdiv=1, scale=(1, 1, 0.7), noise=0.15, rng=rng)
    c.to_object("PICK_Clay").parent = rt
    collider("Mound", (4.0, 2.0, 1.0), (0, 0.8, 0.5), parent=rt)
    return export_asset("PRP_Clay_Bank_A", "props", rt, required=["PICK_Clay"]), rt


@asset
def ENV_Ruin_Pillar_Broken_A():
    rng = random.Random(641)
    rt = root("ENV_Ruin_Pillar_Broken_A")
    p = Part()
    pillar(p, (0, 0, 0), height=3.2, rng=rng, stone="granite_dark", bracket=True)
    bm = p.bm
    # snap off the top: delete everything above 1.9 m and drop a tilted capital on the ground
    cut = [f for f in bm.faces if all(v.co.z > 1.9 for v in f.verts)]
    import bmesh as _bm
    _bm.ops.delete(bm, geom=cut, context="FACES")
    p.box((0.42, 0.42, 0.35), (0.7, 0.5, 0.17), "MAT_Stone_Granite_A", rgb("granite_dark", 0.06, rng), rot_z=0.5)
    p.lathe([(0, 0), (0.24, 0), (0.3, 0.15), (0.2, 0.3), (0, 0.3)], (-0.6, 0.7, 0.0), "MAT_Stone_Granite_A", rgb("granite_dark", 0.06, rng), segments=10)
    p.ico(0.3, (0, 0, 0.08), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(1.6, 1.6, 0.4), noise=0.2, rng=rng)
    p.to_object("ENV_Ruin_Pillar_Broken_A_Mesh").parent = rt
    collider("Pillar", (0.56, 0.56, 1.9), (0, 0, 0.95), parent=rt)
    return export_asset("ENV_Ruin_Pillar_Broken_A", "environment", rt), rt


@asset
def ENV_Ruin_Mandapa_Base_A():
    """Remains of a small pillared pavilion: a moulded platform with four pillar stumps (old grounds landmark)."""
    rng = random.Random(651)
    rt = root("ENV_Ruin_Mandapa_Base_A")
    p = Part()
    rect_lathe(p, [(0.1, 0), (0.1, 0.15), (0.0, 0.15), (0.06, 0.3), (0.0, 0.42), (-0.05, 0.42), (-0.05, 0.6), (0, 0.6)], 3.0, 3.0, (0, 0, 0), "MAT_Stone_Granite_A",
               rgb("granite_dark", 0.05, rng))
    for i in range(6):
        for j in range(6):
            if rng.random() < 0.18:
                continue
            p.box((0.96, 0.96, 0.04), (-2.5 + i, -2.5 + j, 0.62), "MAT_Stone_Granite_A", rgb("granite", 0.07, rng), rot_z=(rng.random() - 0.5) * 0.06)
    for (x, y), h in zip(((-2.2, -2.2), (2.2, -2.2), (-2.2, 2.2), (2.2, 2.2)), (2.6, 1.1, 1.7, 0.6)):
        sub = Part()
        pillar(sub, (x, y, 0.6), height=3.2, rng=rng, stone="granite_dark")
        cut = [f for f in sub.bm.faces if all(v.co.z > 0.6 + h for v in f.verts)]
        import bmesh as _bm
        _bm.ops.delete(sub.bm, geom=cut, context="FACES")
        sub.to_object(f"Stump_{x}_{y}").parent = rt
    # steps on the south side
    for k in range(3):
        p.box((1.6, 0.3, 0.2 * (k + 1)), (0, -3.6 + k * 0.3, 0.1 * (k + 1)), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    for k in range(10):
        p.ico(0.3, ((rng.random() - 0.5) * 6.4, (rng.random() - 0.5) * 6.4, 0.62), "MAT_Foliage_A", rgb(rng.choice(("moss", "leaf")), 0.1, rng), subdiv=1, scale=(1.3, 1.3, 0.4), noise=0.2, rng=rng)
    p.to_object("ENV_Ruin_Mandapa_Base_A_Mesh").parent = rt
    collider("Platform", (6.2, 6.2, 0.6), (0, 0, 0.3), kind="WALK", parent=rt)
    for k in range(3):
        collider(f"Step_{k}", (1.6, 0.3, 0.2 * (k + 1)), (0, -3.6 + k * 0.3, 0.1 * (k + 1)), kind="WALK", parent=rt)
    for (x, y) in ((-2.2, -2.2), (2.2, -2.2), (-2.2, 2.2), (2.2, 2.2)):
        collider(f"Stump_{x}_{y}", (0.6, 0.6, 3.0), (x, y, 1.5), parent=rt)
    return export_asset("ENV_Ruin_Mandapa_Base_A", "environment", rt), rt


@asset
def PRP_Garland_Gate_A():
    """Doorway garland (thoranam-style swag) of marigold and jasmine on twine, hung across a 2.8 m opening.
    Origin at the top centre of the opening; hangs downward and spans X."""
    rng = random.Random(671)
    rt = root("PRP_Garland_Gate_A")
    p = Part()
    span, sag = 2.9, 0.55
    n = 70
    pts = []
    for i in range(n + 1):
        t = i / n
        x = -span / 2 + span * t
        z = -sag * math.sin(math.pi * t)
        pts.append((x, -0.05, z))
    p.tube(pts[::5], [0.012] * len(pts[::5]), "MAT_Thatch_A", rgb("thatch"), segments=5)
    for i, (x, y, z) in enumerate(pts):
        c = "jasmine" if (i // 4) % 3 == 0 else ("marigold" if i % 2 else "marigold_yellow")
        r = 0.045 if c != "jasmine" else 0.032
        p.ico(r, (x, y, z), "MAT_Foliage_A", rgb(c, 0.04, rng), subdiv=1, scale=(1, 0.8, 1))
    # hanging tassels
    for k in range(7):
        t = (k + 0.5) / 7
        x = -span / 2 + span * t
        z0 = -sag * math.sin(math.pi * t)
        for j in range(5):
            c = "marigold" if j % 2 == 0 else "jasmine"
            p.ico(0.035, (x, -0.05, z0 - 0.06 - j * 0.07), "MAT_Foliage_A", rgb(c, 0.04, rng), subdiv=1)
        p.lathe([(0, 0), (0.05, 0.03), (0.03, 0.08), (0, 0.1)], (x, -0.05, z0 - 0.48), "MAT_Foliage_A", rgb("leaf", 0.05, rng), segments=6)
    p.to_object("PRP_Garland_Gate_A_Mesh").parent = rt
    return export_asset("PRP_Garland_Gate_A", "props", rt), rt


@asset
def ENV_Tree_Platform_A():
    """Raised circular stone seat around a courtyard tree - a social landmark."""
    rng = random.Random(661)
    rt = root("ENV_Tree_Platform_A")
    p = Part()
    p.lathe([(0, 0.0), (2.4, 0.0), (2.4, 0.15), (2.3, 0.15), (2.3, 0.5), (2.4, 0.55), (2.4, 0.62), (0.7, 0.62), (0, 0.62)], (0, 0, 0), "MAT_Stone_Granite_A",
            rgb("granite", 0.04, rng), segments=20, smooth=False)
    p.lathe([(0.75, 0.62), (0.75, 0.95), (0.85, 1.0), (0.6, 1.0), (0.6, 0.62)], (0, 0, 0), "MAT_Plaster_Lime_A", rgb("plaster", 0.03, rng), segments=16, smooth=False)
    p.to_object("ENV_Tree_Platform_A_Mesh").parent = rt
    collider("Platform", (3.4, 3.4, 0.62), (0, 0, 0.31), kind="WALK", parent=rt)
    collider("Platform_rot", (3.4, 3.4, 0.62), (0, 0, 0.31), rot_z=math.pi / 4, kind="WALK", parent=rt)
    collider("Core", (1.6, 1.6, 2.0), (0, 0, 1.0), parent=rt)
    return export_asset("ENV_Tree_Platform_A", "environment", rt), rt
