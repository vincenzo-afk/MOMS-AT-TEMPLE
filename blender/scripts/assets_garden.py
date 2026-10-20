"""Category E - gardening and gathering (asserts_img/GARDENING.jpg) + improved vegetation (ENV DETAILS.jpg)."""
import math
import random
from tom.core import Part, rgb, root, collider, export_asset
from tom.props import bamboo, plank, rope_path, pot, basket, heap
from assets_nature import leaf_cluster

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def flower_head(p, loc, r, col, rng, petals=8):
    x, y, z = loc
    for k in range(petals):
        a = 2 * math.pi * k / petals
        p.ico(r * 0.5, (x + math.cos(a) * r * 0.6, y + math.sin(a) * r * 0.6, z), "MAT_Foliage_A", rgb(col, 0.05, rng), subdiv=1, scale=(1.3, 0.7, 0.35))
    p.ico(r * 0.35, (x, y, z + r * 0.12), "MAT_Foliage_A", rgb("marigold_yellow", 0.05, rng), subdiv=1, scale=(1, 1, 0.6))


@asset
def PRP_Hibiscus_A():
    """FNT_004 red hibiscus shrub."""
    rng = random.Random(3001)
    rt = root("PRP_Hibiscus_A")
    p = Part()
    for k in range(5):
        a = k * 1.25
        p.tube([(0, 0, 0), (math.cos(a) * 0.2, math.sin(a) * 0.2, 0.5), (math.cos(a) * 0.35, math.sin(a) * 0.35, 0.95)], [0.035, 0.025, 0.015], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=5)
    leaf_cluster(p, (0, 0, 0.8), 0.5, rng, colors=("leaf", "leaf_light", "leaf"), n=6)
    p.to_object("PRP_Hibiscus_A_Leaves").parent = rt
    f = Part()
    for k in range(18):
        a = rng.random() * math.tau
        e = rng.random() * 1.1 - 0.15
        r = 0.6
        flower_head(f, (math.cos(a) * r * math.cos(e), math.sin(a) * r * math.cos(e), 0.8 + math.sin(e) * r * 0.75), 0.12, "hibiscus", rng, petals=5)
    f.to_object("PICK_Flowers").parent = rt
    collider("Bush", (1.2, 1.2, 1.2), (0, 0, 0.6), parent=rt)
    return export_asset("PRP_Hibiscus_A", "props", rt), rt


@asset
def PRP_Marigold_Plant_A():
    """FNT_001 marigold flower plant (single bushy clump) for borders and the festival."""
    rng = random.Random(3101)
    rt = root("PRP_Marigold_Plant_A")
    p = Part()
    leaf_cluster(p, (0, 0, 0.32), 0.38, rng, colors=("leaf", "leaf_light"), n=7, squash=0.7)
    for k in range(16):
        a = rng.random() * math.tau
        r = 0.3 * math.sqrt(rng.random())
        flower_head(p, (math.cos(a) * r, math.sin(a) * r, 0.5 + rng.random() * 0.12), 0.06, "marigold" if k % 3 else "marigold_yellow", rng, petals=7)
    p.to_object("PRP_Marigold_Plant_A_Mesh").parent = rt
    return export_asset("PRP_Marigold_Plant_A", "props", rt), rt


@asset
def PRP_Tulsi_Pot_A():
    """FNT_003 holy basil in a decorated clay pot (home decoration reward)."""
    rng = random.Random(3201)
    rt = root("PRP_Tulsi_Pot_A")
    p = Part()
    p.lathe([(0, 0), (0.16, 0), (0.2, 0.08), (0.24, 0.3), (0.22, 0.42), (0.26, 0.46), (0.25, 0.5), (0.0, 0.48)], (0, 0, 0), "MAT_Terracotta_A", rgb("terracotta", 0.04, rng), segments=16)
    for k in range(8):  # painted band
        a = k * math.pi / 4
        p.box((0.06, 0.01, 0.06), (math.cos(a) * 0.235, math.sin(a) * 0.235, 0.28), "MAT_Terracotta_A", rgb("kolam_white"), rot_z=a + math.pi / 2)
    for k in range(7):
        a = k * 0.9
        p.tube([(0, 0, 0.48), (math.cos(a) * 0.08, math.sin(a) * 0.08, 0.75), (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.95)], [0.012, 0.009, 0.006], "MAT_Foliage_A", rgb("leaf", 0.05, rng), segments=4)
    leaf_cluster(p, (0, 0, 0.85), 0.22, rng, colors=("leaf", "vegetable_purple"), n=8)
    p.to_object("PRP_Tulsi_Pot_A_Mesh").parent = rt
    collider("Pot", (0.55, 0.55, 0.6), (0, 0, 0.3), parent=rt)
    return export_asset("PRP_Tulsi_Pot_A", "props", rt), rt


@asset
def PRP_Fence_Bamboo_A():
    """ENV_024 bamboo garden fence, 3 m panel. STATE_damaged (broken, leaning) / STATE_repaired."""
    rng = random.Random(3301)
    rt = root("PRP_Fence_Bamboo_A")
    d = Part()
    for k in range(7):
        x = -1.5 + k * 0.5
        lean = 0.35 if k in (3, 4) else 0.0
        h = 0.5 if k == 4 else 1.1
        bamboo(d, (x, 0, 0), (x, lean, h), 0.03, rng, "bamboo_dark")
    bamboo(d, (-1.6, 0, 0.8), (0.0, 0.05, 0.75), 0.022, rng, "bamboo_dark")
    bamboo(d, (1.0, 0.3, 0.05), (1.6, 0.0, 0.5), 0.022, rng, "bamboo_dark")
    d.to_object("STATE_damaged").parent = rt
    r = Part()
    for k in range(7):
        x = -1.5 + k * 0.5
        bamboo(r, (x, 0, 0), (x, 0, 1.15), 0.03, rng)
    for z in (0.35, 0.8):
        bamboo(r, (-1.6, 0, z), (1.6, 0, z), 0.022, rng)
    for k in range(6):
        rope_path(r, [(-1.5 + k * 0.5 + 0.25, -0.03, 0.78), (-1.5 + k * 0.5 + 0.25, -0.03, 0.82)], 0.012, rng)
    r.to_object("STATE_repaired").parent = rt
    collider("Fence", (3.2, 0.15, 1.1), (0, 0, 0.55), parent=rt)
    return export_asset("PRP_Fence_Bamboo_A", "props", rt, required=["STATE_damaged", "STATE_repaired"]), rt


@asset
def PRP_Garden_Gate_A():
    """ENV_025 woven bamboo garden gate between two posts (open position)."""
    rng = random.Random(3401)
    rt = root("PRP_Garden_Gate_A")
    p = Part()
    for sx in (-1, 1):
        bamboo(p, (sx * 0.75, 0, 0), (sx * 0.75, 0, 1.4), 0.045, rng, "bamboo_dark")
    for k in range(6):
        y = 0.1 + k * 0.12
        bamboo(p, (0.72, y, 0.1), (0.72, y, 1.2), 0.02, rng)
    for z in (0.3, 0.7, 1.1):
        bamboo(p, (0.72, 0.05, z), (0.72, 0.75, z), 0.018, rng)
    p.to_object("PRP_Garden_Gate_A_Mesh").parent = rt
    for sx in (-1, 1):
        collider(f"Post_{sx}", (0.12, 0.12, 1.4), (sx * 0.75, 0, 0.7), parent=rt)
    return export_asset("PRP_Garden_Gate_A", "props", rt), rt


@asset
def PRP_Garden_Tools_A():
    """PRP_055-058: flower basket, spouted watering vessel, trowel, hoe, broom and a compost pile."""
    rng = random.Random(3501)
    rt = root("PRP_Garden_Tools_A")
    p = Part()
    basket(p, (-0.6, 0, 0), 0.24, 0.12, rng)
    heap(p, (-0.6, 0, 0.1), 0.2, 26, lambda i: ("marigold", "jasmine", "kolam_pink", "marigold_yellow")[i % 4], rng, size=0.035)
    pot(p, (0.0, 0.1, 0), 0.75, rng)
    p.tube([(0.12, 0.05, 0.2), (0.25, 0.0, 0.3)], [0.025, 0.015], "MAT_Terracotta_A", rgb("terracotta"), segments=6)
    p.ico(0.45, (0.8, 0.2, 0.0), "MAT_Soil_A", rgb("soil", 0.06, rng), subdiv=2, scale=(1.2, 1.0, 0.55), noise=0.12, rng=rng)
    heap(p, (0.8, 0.2, 0.15), 0.4, 20, lambda i: ("leaf_dry", "bark", "leaf")[i % 3], rng, size=0.05, scale=(1.4, 0.8, 0.3))
    plank(p, (0.04, 0.04, 0.9), (0.35, -0.35, 0.45), rng, "teak", rot_z=0)
    p.box((0.18, 0.02, 0.12), (0.35, -0.35, 0.92), "MAT_Iron_A", rgb("iron"))
    p.tube([(-0.25, -0.4, 0.02), (-0.25, -0.4, 0.95)], [0.02, 0.018], "MAT_Wood_Teak_A", rgb("bamboo"), segments=6)
    p.lathe([(0.0, 0.0), (0.12, 0.0), (0.04, 0.35), (0.02, 0.4)], (-0.25, -0.4, 0.0), "MAT_Thatch_A", rgb("thatch", 0.05, rng), segments=10)
    p.to_object("PRP_Garden_Tools_A_Mesh").parent = rt
    collider("Group", (1.9, 1.0, 0.6), (0.1, 0, 0.3), parent=rt)
    return export_asset("PRP_Garden_Tools_A", "props", rt), rt


@asset
def PRP_Flowering_Shrub_A():
    """FNT_010 flowering shrub (white and orange blossoms) for path borders."""
    rng = random.Random(3601)
    rt = root("PRP_Flowering_Shrub_A")
    p = Part()
    leaf_cluster(p, (0, 0, 0.42), 0.6, rng, colors=("leaf", "leaf_light", "leaf"), n=8, squash=0.75)
    for k in range(24):
        a = rng.random() * math.tau
        e = rng.random() * 1.1 - 0.1
        r = 0.55
        p.ico(0.035, (math.cos(a) * r * math.cos(e), math.sin(a) * r * math.cos(e), 0.42 + math.sin(e) * r * 0.75), "MAT_Foliage_A", rgb("jasmine" if k % 2 else "marigold", 0.04, rng), subdiv=1)
    p.to_object("PRP_Flowering_Shrub_A_Mesh").parent = rt
    collider("Shrub", (1.0, 1.0, 0.8), (0, 0, 0.4), parent=rt)
    return export_asset("PRP_Flowering_Shrub_A", "environment", rt), rt


@asset
def PRP_Ground_Cover_A():
    """FNT_011 tropical ground cover: broad leaves fanning from the ground (colocasia-like)."""
    rng = random.Random(3701)
    rt = root("PRP_Ground_Cover_A")
    p = Part()
    for k in range(9):
        a = k * 2 * math.pi / 9 + rng.random() * 0.3
        L = 0.35 + rng.random() * 0.25
        base = (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.0)
        tip = (math.cos(a) * L, math.sin(a) * L, 0.25 + rng.random() * 0.25)
        p.tube([base, (tip[0] * 0.5, tip[1] * 0.5, tip[2] * 0.9)], [0.01, 0.008], "MAT_Foliage_A", rgb("leaf_light"), segments=4)
        p.ico(0.15, tip, "MAT_Foliage_A", rgb(rng.choice(("leaf", "leaf_light")), 0.08, rng), subdiv=1, scale=(1.3, 0.9, 0.12))
    p.to_object("PRP_Ground_Cover_A_Mesh").parent = rt
    return export_asset("PRP_Ground_Cover_A", "environment", rt), rt


@asset
def PRP_Palm_Coconut_B():
    """FNT_008 improved coconut palm: curved ringed trunk, leaflet-cut fronds, coconut cluster."""
    rng = random.Random(3801)
    rt = root("PRP_Palm_Coconut_B")
    p = Part()
    H = 9.0
    path = [(math.sin(i / 13 * 1.5) * 1.3, 0, i / 13 * H) for i in range(14)]
    radii = [0.25 - 0.1 * (i / 13) for i in range(14)]
    p.tube(path, radii, "MAT_Wood_Teak_A", rgb("palm_trunk", 0.04, rng), segments=9)
    for i in range(1, 13):
        p.lathe([(radii[i] + 0.012, -0.025), (radii[i] + 0.025, 0.0), (radii[i] + 0.012, 0.025)], path[i], "MAT_Wood_Teak_A", rgb("bark", 0.06, rng), segments=9)
    top = path[-1]
    for k in range(6):
        a = k * math.pi / 3
        p.ico(0.14, (top[0] + math.cos(a) * 0.24, top[1] + math.sin(a) * 0.24, top[2] - 0.3 - (k % 2) * 0.08), "MAT_Foliage_A", rgb("coconut" if k % 3 else "palm", 0.08, rng), subdiv=1)
    for k in range(13):
        a = k * math.tau / 13 + rng.random() * 0.2
        droop = 0.5 + rng.random() * 0.6
        L = 3.4 + rng.random() * 0.8
        rib = []
        for i in range(12):
            t = i / 11
            d = t * L
            z = top[2] + math.sin(t * math.pi * 0.65) * 0.9 - t * t * droop * 2.4
            rib.append((top[0] + math.cos(a) * d, top[1] + math.sin(a) * d, z))
        p.tube(rib, [0.03 - 0.025 * (i / 11) for i in range(12)], "MAT_Foliage_A", rgb("palm_trunk", 0.05, rng), segments=4)
        # leaflets: narrow blades either side, angled down from the rib
        col = rgb(rng.choice(("palm", "palm", "leaf")), 0.08, rng)
        for i2 in range(2, 21):
            t = i2 / 22
            fi = t * 11
            i0 = min(10, int(fi))
            x0, y0, z0 = rib[i0]
            x1, y1, z1 = rib[i0 + 1]
            u = fi - i0
            x, y, z = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, z0 + (z1 - z0) * u
            ln = math.sin(t * math.pi) * 0.85 + 0.15
            for side in (-1, 1):
                nx, ny = -math.sin(a) * side, math.cos(a) * side
                fwd = (math.cos(a), math.sin(a))
                mid = (x + nx * ln * 0.5 + fwd[0] * 0.1, y + ny * ln * 0.5 + fwd[1] * 0.1, z - ln * 0.18)
                tip = (x + nx * ln + fwd[0] * 0.22, y + ny * ln + fwd[1] * 0.22, z - ln * 0.55)
                b0 = (x - fwd[0] * 0.06, y - fwd[1] * 0.06, z)
                b1 = (x + fwd[0] * 0.06, y + fwd[1] * 0.06, z)
                m0 = (mid[0] - fwd[0] * 0.05, mid[1] - fwd[1] * 0.05, mid[2])
                m1 = (mid[0] + fwd[0] * 0.05, mid[1] + fwd[1] * 0.05, mid[2])
                for quad in ((b0, b1, m1, m0), (m0, m1, tip)):
                    for order in (quad, tuple(reversed(quad))):
                        f = p.bm.faces.new([p.bm.verts.new(q) for q in order])
                        p._finish([f], "MAT_Foliage_A", col, shade=True)
    p.to_object("PRP_Palm_Coconut_B_Mesh").parent = rt
    collider("Trunk", (0.6, 0.6, 3.0), (0, 0, 1.5), parent=rt)
    return export_asset("PRP_Palm_Coconut_B", "environment", rt), rt


@asset
def PRP_Banana_Plant_B():
    """FNT_009 banana plant with torn leaves, a fruit bunch and a purple flower."""
    rng = random.Random(3901)
    rt = root("PRP_Banana_Plant_B")
    p = Part()
    p.lathe([(0.2, 0), (0.17, 1.2), (0.12, 2.1)], (0, 0, 0), "MAT_Foliage_A", rgb("leaf_light", 0.05, rng), segments=9)
    for k in range(8):
        a = k * math.tau / 8 + rng.random() * 0.3
        L = 1.7 + rng.random() * 0.5
        rib = [(math.cos(a) * t * L, math.sin(a) * t * L, 1.95 + math.sin(t * 2.2) * 0.65 - t * 0.5) for t in [i / 7 for i in range(8)]]
        for side in (-1, 1):
            # torn segments: separate strips along the rib
            for i in range(7):
                if rng.random() < 0.15:
                    continue
                t0, t1 = i / 7, (i + 1) / 7
                w0 = math.sin(t0 * math.pi) * 0.42
                w1 = math.sin(t1 * math.pi) * 0.42
                a0, a1 = rib[i], rib[i + 1]
                o0 = (a0[0] - math.sin(a) * side * w0, a0[1] + math.cos(a) * side * w0, a0[2] - 0.06)
                o1 = (a1[0] - math.sin(a) * side * w1, a1[1] + math.cos(a) * side * w1, a1[2] - 0.06)
                col = rgb("leaf_dry" if k == 7 else rng.choice(("leaf", "leaf_light")), 0.06, rng)
                p.quad_strip([a0, a1], [o0, o1], "MAT_Foliage_A", col)
                p.quad_strip([o0, o1], [a0, a1], "MAT_Foliage_A", col)
    # fruit bunch hanging from a curved stalk, purple flower below
    stalk = [(0.1, 0, 2.0), (0.35, 0, 1.9), (0.45, 0, 1.6), (0.45, 0, 1.2)]
    p.tube(stalk, [0.03, 0.03, 0.025, 0.02], "MAT_Foliage_A", rgb("leaf"), segments=5)
    for r_ in range(5):
        for k in range(6):
            a = k * math.pi / 3
            z = 1.75 - r_ * 0.1
            p.tube([(0.45 + math.cos(a) * 0.05, math.sin(a) * 0.05, z), (0.45 + math.cos(a) * 0.14, math.sin(a) * 0.14, z + 0.1)], [0.025, 0.02], "MAT_Foliage_A", rgb("banana_fruit" if r_ < 3 else "leaf_light", 0.05, rng), segments=5)
    p.ico(0.09, (0.45, 0, 1.15), "MAT_Foliage_A", rgb("vegetable_purple"), subdiv=1, scale=(0.8, 0.8, 1.5))
    p.to_object("PRP_Banana_Plant_B_Mesh").parent = rt
    collider("Stem", (0.5, 0.5, 2.0), (0, 0, 1.0), parent=rt)
    return export_asset("PRP_Banana_Plant_B", "environment", rt), rt


@asset
def PRP_Neem_Tree_B():
    """FNT_007 fuller neem: thick trunk, spreading boughs, many small layered leaf clumps."""
    rng = random.Random(4001)
    rt = root("PRP_Neem_Tree_B")
    p = Part()
    p.tube([(0, 0, 0), (0.15, 0.05, 1.5), (0.05, 0, 2.8)], [0.42, 0.32, 0.26], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=11)
    p.lathe([(0.65, 0), (0.42, 0.3), (0.0, 0.35)], (0, 0, -0.05), "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=11)
    tips = []
    for k in range(8):
        a = k * math.tau / 8 + rng.random() * 0.4
        s = (0.05, 0.0, 2.2 + rng.random() * 0.9)
        m = (math.cos(a) * 1.3, math.sin(a) * 1.3, s[2] + 0.9)
        t = (math.cos(a) * 2.6, math.sin(a) * 2.6, s[2] + 1.6 + rng.random() * 0.7)
        p.tube([s, m, t], [0.16, 0.1, 0.05], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=6)
        tips.append(t)
    for t in tips:
        leaf_cluster(p, t, 1.0, rng, colors=("leaf", "leaf_light", "leaf", "moss"), n=7)
    for k in range(10):
        a = rng.random() * math.tau
        r = rng.random() * 1.6
        leaf_cluster(p, (math.cos(a) * r, math.sin(a) * r, 5.0 + rng.random() * 1.2), 0.9, rng, colors=("leaf", "leaf_light"), n=4)
    p.to_object("PRP_Neem_Tree_B_Mesh").parent = rt
    collider("Trunk", (0.9, 0.9, 3.0), (0, 0, 1.5), parent=rt)
    return export_asset("PRP_Neem_Tree_B", "environment", rt), rt
