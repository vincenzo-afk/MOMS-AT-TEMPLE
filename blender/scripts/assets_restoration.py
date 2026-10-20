"""Category F - restoration and environmental state changes (asserts_img/RESTORING ADN ENV CHANGES.jpg).

Each asset holds both states as STATE_<state> children so the save file alone decides what is shown.
"""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.arch import pillar
from tom.props import plank, rope_path, thatch_roof, heap, bamboo, pot, basket

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def brick_courses(p, x0, x1, z0, heights, rng, thick=0.45, y=0.0, color="brick_old", step=0.24):
    """Brick wall body as stepped solid sections (the brick detail texture draws the courses).

    heights(x) gives the top profile, quantised to whole courses so broken tops read as stepped brickwork."""
    bh = 0.085
    x = x0
    while x < x1 - 1e-6:
        w = min(step, x1 - x)
        h = max(bh, round(heights(x + w / 2) / bh) * bh)
        p.box((w, thick - rng.random() * 0.01, h), (x + w / 2, y, z0 + h / 2), "MAT_Brick_A", rgb(color, 0.05, rng))
        x += w


@asset
def ENV_Wall_Brick_Ruin_A():
    """ENV_028 old-grounds brick wall, 5 m. STATE_broken (collapsed V gap, rubble) / STATE_repaired (rebuilt, fresh bricks)."""
    rng = random.Random(6001)
    rt = root("ENV_Wall_Brick_Ruin_A")
    base = Part()
    base.box((5.2, 0.6, 0.3), (0, 0, 0.15), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    for sx in (-1, 1):
        base.box((0.6, 0.6, 2.3), (sx * 2.6, 0, 1.15), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.04, rng))
        base.box((0.7, 0.7, 0.12), (sx * 2.6, 0, 2.36), "MAT_Plaster_Lime_A", rgb("plaster", 0.04, rng))
    base.to_object("ENV_Wall_Brick_Ruin_A_Base", bevel=0.01).parent = rt
    b = Part()
    brick_courses(b, -2.3, 2.3, 0.3, lambda x: 2.0 if abs(x) > 1.4 else 0.4 + abs(x) * 1.1, rng)
    for k in range(26):
        b.box((0.24, 0.12, 0.085), ((rng.random() - 0.5) * 2.4, -0.45 - rng.random() * 0.7, 0.05), "MAT_Brick_A", rgb("brick_old", 0.1, rng), rot_z=rng.random() * 3)
    heap(b, (0.0, -0.6, 0.0), 0.7, 18, "granite_dark", rng, size=0.07, mat="MAT_Stone_Granite_A")
    for k in range(6):
        b.ico(0.18, ((rng.random() - 0.5) * 4, 0.35, 0.3 + rng.random() * 1.2), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(1.4, 0.4, 0.8), noise=0.2, rng=rng)
    b.to_object("STATE_broken").parent = rt
    r = Part()
    brick_courses(r, -2.3, 2.3, 0.3, lambda x: 2.0, rng)
    brick_courses(r, -1.4, 1.4, 0.3, lambda x: 1.9, rng, thick=0.47, color="brick")  # rebuilt section, warmer new bricks
    r.box((4.7, 0.55, 0.08), (0, 0, 2.34), "MAT_Plaster_Lime_A", rgb("plaster", 0.04, rng))
    r.to_object("STATE_repaired").parent = rt
    collider("Wall", (5.8, 0.65, 2.4), (0, 0, 1.2), parent=rt)
    empty("SOCKET_Work", (0, -1.3, 0), parent=rt)
    return export_asset("ENV_Wall_Brick_Ruin_A", "environment", rt, required=["STATE_broken", "STATE_repaired"]), rt


@asset
def ENV_Pillar_Ruin_A():
    """ENV_029 fallen / reconstructed carved pillar on its base."""
    rng = random.Random(6101)
    rt = root("ENV_Pillar_Ruin_A")
    base = Part()
    base.box((1.0, 1.0, 0.3), (0, 0, 0.15), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    base.to_object("ENV_Pillar_Ruin_A_Base", bevel=0.01).parent = rt
    f = Part()
    pillar(f, (0, 0, 0.3), height=0.6, rng=rng, stone="granite_dark", bracket=False)
    # fallen shaft lying on the ground, capital broken off beside it
    for k, (x, rot) in enumerate(((1.4, 0.15), (2.3, 0.3))):
        f.box((0.9, 0.42, 0.42), (x, -0.3 - k * 0.2, 0.21), "MAT_Stone_Granite_A", rgb("granite_dark", 0.06, rng), rot_z=rot)
    f.lathe([(0, 0), (0.24, 0.0), (0.3, 0.15), (0.2, 0.3), (0, 0.3)], (3.0, -0.9, 0.0), "MAT_Stone_Granite_A", rgb("granite_dark", 0.06, rng), segments=10)
    f.ico(0.25, (1.8, -0.1, 0.05), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(2.4, 1.2, 0.4), noise=0.2, rng=rng)
    f.to_object("STATE_fallen").parent = rt
    s = Part()
    pillar(s, (0, 0, 0.3), height=3.0, rng=rng, stone="granite_new", bracket=True)
    s.to_object("STATE_standing").parent = rt
    collider("Base", (1.0, 1.0, 1.0), (0, 0, 0.5), parent=rt)
    empty("SOCKET_Work", (0, -1.2, 0), parent=rt)
    return export_asset("ENV_Pillar_Ruin_A", "environment", rt, required=["STATE_fallen", "STATE_standing"]), rt


@asset
def ENV_Path_Old_A():
    """ENV_031 old flagstone path, 3 x 8 m. STATE_overgrown (brambles, deadfall) / STATE_cleared (worn flagstones)."""
    rng = random.Random(6201)
    rt = root("ENV_Path_Old_A")
    p = Part()
    y = -4.0
    while y < 4.0:
        x = -1.5
        h = 0.5 + rng.random() * 0.3
        while x < 1.5:
            w = 0.5 + rng.random() * 0.5
            p.box((min(w, 1.5 - x) - 0.06, h - 0.06, 0.05), (x + min(w, 1.5 - x) / 2, y + h / 2, 0.02), "MAT_Stone_Granite_A", rgb("granite", 0.09, rng), rot_z=(rng.random() - 0.5) * 0.05)
            x += w
        y += h
    p.to_object("ENV_Path_Old_A_Mesh").parent = rt
    o = Part()
    for k in range(26):
        a = rng.random() * math.tau
        x, yy = (rng.random() - 0.5) * 3.2, (rng.random() - 0.5) * 8
        o.ico(0.35 + rng.random() * 0.25, (x, yy, 0.25), "MAT_Foliage_A", rgb(rng.choice(("moss", "leaf", "leaf_dry")), 0.1, rng), subdiv=1, scale=(1.3, 1.1, 0.8), noise=0.3, rng=rng)
    for k in range(9):
        a = rng.random() * math.pi
        x, yy = (rng.random() - 0.5) * 3, (rng.random() - 0.5) * 7
        o.tube([(x - math.cos(a) * 1.2, yy - math.sin(a) * 1.2, 0.1), (x + math.cos(a) * 1.2, yy + math.sin(a) * 1.2, 0.18)], [0.07, 0.05], "MAT_Wood_Teak_A", rgb("bark", 0.06, rng), segments=6)
    o.to_object("STATE_overgrown").parent = rt
    c = Part()
    for sx in (-1, 1):
        for k in range(8):
            c.ico(0.12, (sx * 1.7, -3.5 + k, 0.05), "MAT_Foliage_A", rgb("leaf", 0.1, rng), subdiv=1, scale=(1.2, 1, 0.5), noise=0.2, rng=rng)
    c.to_object("STATE_cleared").parent = rt
    # the overgrowth blocks passage; the cleared path is walkable
    o_col = collider("Overgrowth", (3.2, 7.6, 1.0), (0, 0, 0.5), parent=rt)
    o_col["state"] = "overgrown"
    return export_asset("ENV_Path_Old_A", "environment", rt, required=["STATE_overgrown", "STATE_cleared"]), rt


@asset
def ENV_House_Thatch_A():
    """ENV_033 weaver's thatched house. STATE_neglected (holed roof, broken door, weeds) / STATE_restored (new thatch, loom on the veranda)."""
    rng = random.Random(6301)
    rt = root("ENV_House_Thatch_A")
    W, D, H = 6.0, 5.0, 2.6
    base = Part()
    base.box((W + 0.6, D + 1.6, 0.35), (0, -0.4, 0.175), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    base.box((W, D, H), (0, 0.4, 0.35 + H / 2), "MAT_Plaster_Lime_A", rgb("clay_lime", 0.04, rng))
    base.box((W + 0.02, D + 0.02, 0.5), (0, 0.4, 0.6), "MAT_Plaster_Lime_A", rgb("ochre", 0.04, rng))
    # gable walls
    for sx in (-1, 1):
        x = sx * W / 2
        pts = [(x, -D / 2 + 0.4, 0.35 + H), (x, D / 2 + 0.4, 0.35 + H), (x, 0.4, 0.35 + H + 1.5)]
        f = base.bm.faces.new([base.bm.verts.new(q) for q in (pts if sx > 0 else list(reversed(pts)))])
        base._finish([f], "MAT_Plaster_Lime_A", rgb("clay_lime", 0.04, rng))
    base.box((1.2, 0.12, 2.0), (0, -D / 2 + 0.36, 0.35 + 1.0), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    for sx in (-1, 1):
        plank(base, (0.14, 0.14, 2.6), (sx * (W / 2 - 0.2), -D / 2 - 0.9, 1.65), rng, "teak_dark")
    base.box((0.7, 0.06, 0.6), (-1.8, -D / 2 + 0.38, 1.55), "MAT_Plaster_Lime_A", rgb("dark_recess"))
    base.box((0.7, 0.06, 0.6), (1.8, -D / 2 + 0.38, 1.55), "MAT_Plaster_Lime_A", rgb("dark_recess"))
    base.to_object("ENV_House_Thatch_A_Base", bevel=0.01).parent = rt
    n = Part()
    # sagging, holed thatch: slabs with gaps and fallen bundles; door ajar, cracks, weeds
    for sy in (-1, 1):
        for k in range(5):
            if (sy, k) in ((-1, 2), (1, 3)):
                continue
            x0 = -W / 2 - 0.35 + k * (W + 0.7) / 5
            a = [(x0, sy * (D / 2 + 1.25) + 0.4 - (0.5 if sy < 0 else 0), 0.35 + H - 0.1 - (0.25 if k == 1 else 0)), (x0 + (W + 0.7) / 5 - 0.05, sy * (D / 2 + 1.25) + 0.4 - (0.5 if sy < 0 else 0), 0.35 + H - 0.1)]
            b = [(x0, 0.4, 0.35 + H + 1.5 - (0.3 if k == 1 else 0)), (x0 + (W + 0.7) / 5 - 0.05, 0.4, 0.35 + H + 1.5)]
            (n.quad_strip(a, b, "MAT_Thatch_A", rgb("leaf_dry", 0.1, rng), smooth=False) if sy < 0 else n.quad_strip(b, a, "MAT_Thatch_A", rgb("leaf_dry", 0.1, rng), smooth=False))
            (n.quad_strip(b, a, "MAT_Thatch_A", rgb("leaf_dry", 0.1, rng), smooth=False) if sy < 0 else n.quad_strip(a, b, "MAT_Thatch_A", rgb("leaf_dry", 0.1, rng), smooth=False))
    plank(n, (0.6, 0.08, 1.9), (0.5, -D / 2 - 0.2, 1.3), rng, "bark", rot_z=0.8)
    for k in range(5):
        n.box((0.5, 0.25, 0.2), ((rng.random() - 0.5) * W, -D / 2 - 1.2 - rng.random(), 0.45), "MAT_Thatch_A", rgb("leaf_dry", 0.1, rng), rot_z=rng.random() * 3)
    for k in range(12):
        n.ico(0.2, ((rng.random() - 0.5) * (W + 1), -D / 2 - 1.3 + (rng.random() - 0.5) * 0.6, 0.35), "MAT_Foliage_A", rgb(rng.choice(("moss", "leaf_dry", "leaf")), 0.1, rng), subdiv=1, scale=(1.2, 1, 0.8), noise=0.3, rng=rng)
    for k in range(5):
        n.box((0.02, 0.07, 0.8), ((rng.random() - 0.5) * W * 0.8, -D / 2 + 0.38, 1.2 + rng.random()), "MAT_Plaster_Lime_A", rgb("soil", 0.05, rng), rot_z=0.0)
    n.to_object("STATE_neglected").parent = rt
    r = Part()
    # thatch_roof() builds a gable along X centred on the origin; it's placed then offset in y
    tmp = Part()
    thatch_roof(tmp, W, D + 1.4, 0.35 + H - 0.1, 0.35 + H + 1.5, rng, overhang=0.35)
    for v in tmp.bm.verts:
        v.co.y += 0.4 - 0.25
    tmp_obj = tmp.to_object("STATE_restored_Roof")
    plank(r, (1.1, 0.06, 1.95), (0, -D / 2 + 0.3, 1.33), rng, "teak")
    for k in range(4):
        r.ico(0.025, (-0.25 + (k % 2) * 0.5, -D / 2 + 0.26, 0.9 + (k // 2) * 0.8), "MAT_Brass_A", rgb("brass"), subdiv=1)
    # pit loom on the veranda with cloth on the beam
    lx, ly = 1.6, -D / 2 - 0.6
    for sx in (-1, 1):
        plank(r, (0.08, 0.08, 1.4), (lx + sx * 0.7, ly, 1.05), rng, "teak")
    plank(r, (1.6, 0.1, 0.1), (lx, ly, 1.75), rng, "teak_dark")
    plank(r, (1.6, 0.1, 0.1), (lx, ly - 0.6, 0.75), rng, "teak_dark")
    r.quad_strip([(lx - 0.6, ly, 1.7), (lx + 0.6, ly, 1.7)], [(lx - 0.6, ly - 0.6, 0.8), (lx + 0.6, ly - 0.6, 0.8)], "MAT_Cloth_A", rgb("cloth_red", 0.03, rng))
    r.quad_strip([(lx - 0.6, ly - 0.6, 0.8), (lx + 0.6, ly - 0.6, 0.8)], [(lx - 0.6, ly, 1.7), (lx + 0.6, ly, 1.7)], "MAT_Cloth_A", rgb("cloth_red", 0.03, rng))
    for k in range(3):
        r.tube([(lx - 0.5 + k * 0.5, ly - 0.75, 0.42), (lx - 0.5 + k * 0.5, ly - 0.75, 0.7)], [0.06, 0.06], "MAT_Cloth_A", rgb(("cloth_indigo", "cloth_saffron", "cloth_green")[k], 0.04, rng), segments=8)
    pot(r, (-2.4, -D / 2 - 1.2, 0.35), 0.9, rng)
    basket(r, (-1.6, -D / 2 - 1.3, 0.35), 0.2, 0.15, rng)
    r.to_object("STATE_restored").parent = rt
    tmp_obj.name = "STATE_restored_Roof"
    tmp_obj.parent = rt
    collider("Body", (W, D, H + 1.5), (0, 0.4, 0.35 + (H + 1.5) / 2), parent=rt)
    collider("Plinth", (W + 0.6, D + 1.6, 0.35), (0, -0.4, 0.175), kind="WALK", parent=rt)
    for sx in (-1, 1):
        collider(f"Post_{sx}", (0.2, 0.2, 2.6), (sx * (W / 2 - 0.2), -D / 2 - 0.9, 1.65), parent=rt)
    empty("SOCKET_Door", (0, -D / 2 - 0.4, 0.35), parent=rt)
    return export_asset("ENV_House_Thatch_A", "buildings", rt, required=["STATE_neglected", "STATE_restored"]), rt
