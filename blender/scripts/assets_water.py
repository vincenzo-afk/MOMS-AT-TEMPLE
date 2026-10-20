"""Category B - water, wells and irrigation (asserts_img/WATER WELLS IRRIGATION.jpg), plus field plots.

State-driven children use STATE_<state> (see WorldView). Channel modules are 4 m long and snap end to end.
"""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.arch import rect_lathe
from tom.props import bamboo, plank, rope_path, coil, pot, basket, heap

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


@asset
def PRP_Well_A():
    """PRP_017 well / water-drawing station: stone drum, timber frame, tiled hood, winch. STATE_dry / STATE_working."""
    rng = random.Random(1001)
    rt = root("PRP_Well_A")
    p = Part()
    # stone drum of dressed blocks in courses
    R = 0.95
    for course in range(4):
        n = 12
        for k in range(n):
            a0 = (k + (0.5 if course % 2 else 0)) * 2 * math.pi / n
            p.box((0.48, 0.32, 0.2), (math.cos(a0) * R, math.sin(a0) * R, 0.1 + course * 0.21), "MAT_Stone_Granite_A", rgb("granite", 0.08, rng), rot_z=a0 + math.pi / 2)
    p.lathe([(R + 0.18, 0.84), (R + 0.2, 0.9), (R - 0.16, 0.9), (R - 0.16, 0.84)], (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng), segments=24, smooth=False)
    p.lathe([(R - 0.17, -0.8), (R - 0.17, 0.84)], (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng), segments=20, smooth=False)
    rect_lathe(p, [(0.0, 0.0), (0.0, 0.08)], 1.6, 1.6, (0, 0, -0.04), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    # posts, beams, winch drum, crank
    for sx in (-1, 1):
        plank(p, (0.16, 0.16, 2.3), (sx * 1.15, 0, 1.15), rng, "teak_dark")
        plank(p, (0.3, 0.3, 0.08), (sx * 1.15, 0, 0.04), rng, "teak")
    plank(p, (2.6, 0.18, 0.16), (0, 0, 2.3), rng, "teak_dark")
    p.tube([(-1.07, 0, 1.55), (1.07, 0, 1.55)], [0.09, 0.09], "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), segments=10)
    p.tube([(1.25, 0, 1.55), (1.35, 0, 1.55), (1.35, -0.22, 1.55), (1.35, -0.22, 1.42)], [0.025] * 4, "MAT_Iron_A", rgb("iron"), segments=6)
    # tiled hood roof
    for sy in (-1, 1):
        a = [(-1.5, sy * 0.95, 2.35), (1.5, sy * 0.95, 2.35)]
        b = [(-1.5, 0, 2.85), (1.5, 0, 2.85)]
        (p.quad_strip(a, b, "MAT_Terracotta_A", rgb("tile", 0.06, rng), smooth=False) if sy < 0 else p.quad_strip(b, a, "MAT_Terracotta_A", rgb("tile", 0.06, rng), smooth=False))
        for k in range(13):
            x = -1.45 + k * 0.24
            p.tube([(x, sy * 0.97, 2.37), (x, 0, 2.88)], [0.05, 0.05], "MAT_Terracotta_A", rgb("tile", 0.1, rng), segments=6)
    for sx in (-1, 1):
        f = p.bm.faces.new([p.bm.verts.new(q) for q in ((sx * 1.5, -0.95, 2.35), (sx * 1.5, 0.95, 2.35), (sx * 1.5, 0, 2.85))][:: sx])
        p._finish([f], "MAT_Wood_Teak_A", rgb("teak_dark"))
    p.to_object("PRP_Well_A_Mesh").parent = rt
    # dry: frayed rope stub, dry leaves and a cracked pot at the foot
    d = Part()
    rope_path(d, [(0, 0, 1.55), (0.05, 0.02, 1.2), (0.0, 0.05, 1.05)], 0.014, rng)
    heap(d, (0, 0, -0.75), 0.6, 30, "leaf_dry", rng, size=0.07, scale=(1.4, 1, 0.3), mat="MAT_Foliage_A")
    pot(d, (1.4, -0.9, 0), 0.9, rng)
    d.box((0.2, 0.15, 0.12), (1.1, -1.2, 0.06), "MAT_Terracotta_A", rgb("terracotta", 0.08, rng), rot_z=0.6)
    d.to_object("STATE_dry").parent = rt
    # working: rope wound on the drum, bucket hanging, water inside, brass pot waiting on the rim
    w = Part()
    coil(w, (0, 0, 1.55), 0.1, 3, rng)
    rope_path(w, [(0.05, -0.1, 1.5), (0.05, -0.1, 1.05)], 0.012, rng)
    w.lathe([(0, 0), (0.12, 0), (0.15, 0.25), (0.14, 0.26), (0.0, 0.03)], (0.05, -0.1, 0.78), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), segments=12)
    for k in (0.06, 0.2):
        w.lathe([(0.128 + k * 0.1, k - 0.01), (0.135 + k * 0.1, k), (0.128 + k * 0.1, k + 0.01)], (0.05, -0.1, 0.78), "MAT_Iron_A", rgb("iron"), segments=12)
    rope_path(w, [(-0.08, -0.1, 1.04), (0.05, -0.1, 1.08), (0.18, -0.1, 1.04)], 0.01, rng)
    pot(w, (0.9, -0.55, 0.9), 0.8, rng, color="brass", mat="MAT_Brass_A")
    w.to_object("STATE_working").parent = rt
    wat = Part()
    wat.lathe([(0, 0), (R - 0.17, 0), (R - 0.17, 0.01)], (0, 0, -0.35), "MAT_Water_A", rgb("cloth_indigo"), segments=20)
    o = wat.to_object("WATER_Well")
    o.parent = rt
    collider("Drum", (2.3, 2.3, 1.0), (0, 0, 0.5), parent=rt)
    for sx in (-1, 1):
        collider(f"Post_{sx}", (0.3, 0.3, 2.4), (sx * 1.15, 0, 1.2), parent=rt)
    empty("SOCKET_Draw", (0, -1.6, 0), parent=rt)
    return export_asset("PRP_Well_A", "props", rt, required=["STATE_dry", "STATE_working"]), rt


def channel_module(asset_id, shape):
    """4 m field channel module: 'straight', 'corner' or 'junction'. STATE_dry (silt, weeds) / STATE_irrigated (water)."""
    rng = random.Random(hash(asset_id) & 0xFFFF)
    rt = root(asset_id)
    p = Part()
    inner, wall_w, wall_h = 0.5, 0.24, 0.32
    arms = {"straight": [(-1, 0), (1, 0)], "corner": [(-1, 0), (0, 1)], "junction": [(-1, 0), (1, 0), (0, 1), (0, -1)]}[shape]
    # bed
    p.box((inner + 0.02, inner + 0.02, 0.05), (0, 0, 0.025), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    for ax, ay in arms:
        cx, cy = ax * 1.0, ay * 1.0
        p.box((2.0 if ax else inner, 2.0 if ay else inner, 0.05), (cx, cy, 0.025), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    # walls: along each arm, both sides, skipping the openings toward other arms
    def wall_run(x0, y0, x1, y1):
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(1, int(L / 0.55))
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            mx, my = x0 + (x1 - x0) * (t0 + t1) / 2, y0 + (y1 - y0) * (t0 + t1) / 2
            p.box((L / n - 0.015 if x1 != x0 else wall_w, L / n - 0.015 if y1 != y0 else wall_w, wall_h), (mx, my, wall_h / 2), "MAT_Stone_Granite_A", rgb("granite", 0.08, rng))
    h = inner / 2 + wall_w / 2
    edge = 2.0
    if shape == "straight":
        for s in (-1, 1):
            wall_run(-edge, s * h, edge, s * h)
    elif shape == "corner":
        wall_run(-edge, -h, h + wall_w / 2, -h)   # outer wall along the bottom
        wall_run(h, -h, h, edge)                  # outer wall on the right
        wall_run(-edge, h, -h, h)                 # inner short wall
        wall_run(-h, h, -h, edge)
    else:
        for (x0, y0, x1, y1) in ((-edge, -h, -h, -h), (h, -h, edge, -h), (-edge, h, -h, h), (h, h, edge, h),
                                 (-h, -edge, -h, -h), (h, -edge, h, -h), (-h, h, -h, edge), (h, h, h, edge)):
            wall_run(x0, y0, x1, y1)
    p.to_object(f"{asset_id}_Mesh", bevel=0.01).parent = rt
    d = Part()
    for ax, ay in arms:
        for k in range(3):
            t = 0.3 + k * 0.6
            d.ico(0.22, (ax * t, ay * t, 0.05), "MAT_Soil_A", rgb("silt", 0.08, rng), subdiv=1, scale=(1.3, 1.0, 0.35), noise=0.15, rng=rng)
        d.ico(0.1, (ax * 1.4 + 0.1, ay * 1.4, 0.1), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(1, 1, 0.6), noise=0.2, rng=rng)
    d.to_object("STATE_dry").parent = rt
    w = Part()
    w.box((inner, inner, 0.02), (0, 0, 0.2), "MAT_Water_A", rgb("cloth_indigo"))
    for ax, ay in arms:
        w.box((2.0 if ax else inner, 2.0 if ay else inner, 0.02), (ax * 1.0, ay * 1.0, 0.2), "MAT_Water_A", rgb("cloth_indigo"))
    o = w.to_object("WATER_STATE_irrigated")
    o.parent = rt
    # walls block, the bed is crossable at junction plates (planks) - keep simple: low walls block
    if shape == "straight":
        for s in (-1, 1):
            collider(f"Wall_{s}", (4.0, wall_w, 0.5), (0, s * h, 0.25), parent=rt)
        collider("Bed", (4.0, inner, 0.5), (0, 0, 0.25), parent=rt)
    else:
        collider("Core", (inner + 2 * wall_w, inner + 2 * wall_w, 0.5), (0, 0, 0.25), parent=rt)
        for ax, ay in arms:
            collider(f"Arm_{ax}_{ay}", (2.0 if ax else inner + 2 * wall_w, 2.0 if ay else inner + 2 * wall_w, 0.5), (ax * 1.0, ay * 1.0, 0.25), parent=rt)
    return export_asset(asset_id, "environment", rt, required=["STATE_dry"]), rt


@asset
def ENV_Channel_Straight_A():
    return channel_module("ENV_Channel_Straight_A", "straight")


@asset
def ENV_Channel_Corner_A():
    return channel_module("ENV_Channel_Corner_A", "corner")


@asset
def ENV_Channel_Junction_A():
    return channel_module("ENV_Channel_Junction_A", "junction")


@asset
def ENV_Sluice_Gate_A():
    """ENV_004 channel gate / outlet: stone cheeks, timber frame, sliding board. STATE_blocked / STATE_open."""
    rng = random.Random(1101)
    rt = root("ENV_Sluice_Gate_A")
    p = Part()
    for sx in (-1, 1):
        p.box((0.5, 0.9, 1.1), (sx * 0.55, 0, 0.55), "MAT_Stone_Granite_A", rgb("granite", 0.06, rng))
        p.box((0.6, 1.0, 0.1), (sx * 0.55, 0, 1.15), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
        plank(p, (0.12, 0.12, 1.9), (sx * 0.34, 0, 1.25), rng, "teak_dark")
    plank(p, (0.9, 0.14, 0.14), (0, 0, 2.2), rng, "teak_dark")
    p.tube([(-0.05, 0, 2.27), (-0.05, 0, 2.6)], [0.03, 0.03], "MAT_Iron_A", rgb("iron"), segments=6)
    p.tube([(-0.25, 0, 2.6), (0.15, 0, 2.6)], [0.025, 0.025], "MAT_Iron_A", rgb("iron"), segments=6)
    p.box((0.62, 1.4, 0.06), (0, 0, 0.03), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    p.to_object("ENV_Sluice_Gate_A_Mesh", bevel=0.01).parent = rt
    b = Part()  # blocked: board jammed down, debris piled behind, broken plank
    for k in range(4):
        plank(b, (0.58, 0.07, 0.24), (0, 0.05, 0.14 + k * 0.25), rng, "teak_dark")
    for k in range(9):
        b.ico(0.12 + rng.random() * 0.08, ((rng.random() - 0.5) * 0.5, 0.55 + rng.random() * 0.4, 0.15), "MAT_Soil_A", rgb(rng.choice(("silt", "leaf_dry", "bark")), 0.08, rng), subdiv=1, scale=(1.4, 1, 0.6), noise=0.2, rng=rng)
    plank(b, (0.08, 0.8, 0.06), (0.3, 0.8, 0.12), rng, "bark", rot_z=0.5)
    b.to_object("STATE_blocked").parent = rt
    o = Part()  # open: board raised and pinned, rope tie, water rushing through
    for k in range(4):
        plank(o, (0.58, 0.07, 0.24), (0, 0.05, 1.2 + k * 0.25), rng, "teak")
    rope_path(o, [(-0.34, 0.08, 1.5), (0.0, 0.1, 1.45), (0.34, 0.08, 1.5)], 0.015, rng)
    o.to_object("STATE_open").parent = rt
    w = Part()
    w.box((0.6, 1.6, 0.02), (0, 0, 0.18), "MAT_Water_A", rgb("cloth_indigo"))
    w.box((0.6, 0.4, 0.02), (0, -0.95, 0.12), "MAT_Water_A", rgb("cloth_indigo"), rot_z=0)
    w.to_object("WATER_STATE_open").parent = rt
    for sx in (-1, 1):
        collider(f"Cheek_{sx}", (0.5, 0.9, 1.2), (sx * 0.55, 0, 0.6), parent=rt)
    collider("Gate", (0.6, 0.9, 0.6), (0, 0, 0.3), parent=rt)
    empty("SOCKET_Work", (0, -1.2, 0), parent=rt)
    return export_asset("ENV_Sluice_Gate_A", "environment", rt, required=["STATE_blocked", "STATE_open"]), rt


@asset
def PRP_Water_Point_A():
    """ENV_011 / ENV_046 public water point: carved spout over a stepped basin."""
    rng = random.Random(1201)
    rt = root("PRP_Water_Point_A")
    p = Part()
    rect_lathe(p, [(0.1, 0), (0.1, 0.12), (0.0, 0.12), (0.0, 0.55)], 0.9, 0.6, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.box((1.5, 0.95, 0.06), (0, 0, 0.5), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))  # basin floor (inside the rim)
    p.box((0.5, 0.35, 1.45), (0, 0.45, 0.72), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.box((0.62, 0.42, 0.12), (0, 0.45, 1.5), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
    p.tube([(0, 0.3, 1.15), (0, 0.05, 1.12), (0, -0.05, 1.05)], [0.05, 0.045, 0.04], "MAT_Brass_A", rgb("brass"), segments=8)
    for k in range(2):
        p.box((0.9, 0.3, 0.14), (0, -0.78 - k * 0.3, 0.14 - k * 0.07), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    pot(p, (0.62, -0.95, 0.0), 0.9, rng, color="brass", mat="MAT_Brass_A")
    p.to_object("PRP_Water_Point_A_Mesh", bevel=0.01).parent = rt
    w = Part()
    w.box((1.6, 1.0, 0.02), (0, 0, 0.45), "MAT_Water_A", rgb("cloth_indigo"))
    w.tube([(0, -0.06, 1.03), (0, -0.08, 0.6)], [0.025, 0.035], "MAT_Water_A", rgb("cloth_indigo"), segments=6)
    w.to_object("WATER_Point").parent = rt
    collider("Basin", (2.0, 1.4, 0.6), (0, 0, 0.3), parent=rt)
    collider("Spout", (0.6, 0.45, 1.6), (0, 0.45, 0.8), parent=rt)
    return export_asset("PRP_Water_Point_A", "props", rt), rt


@asset
def PRP_Water_Trough_A():
    """ENV_012 water trough with a moss line (the reference's carved animal head is left out)."""
    rng = random.Random(1301)
    rt = root("PRP_Water_Trough_A")
    p = Part()
    rect_lathe(p, [(0, 0), (0.02, 0.05), (0.02, 0.5), (0, 0.52)], 1.0, 0.32, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.06, rng))
    p.box((1.9, 0.5, 0.04), (0, 0, 0.5), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    p.box((2.08, 0.66, 0.04), (0, 0, 0.17), "MAT_Foliage_A", rgb("moss", 0.1, rng))
    p.to_object("PRP_Water_Trough_A_Mesh", bevel=0.01).parent = rt
    w = Part()
    w.box((1.84, 0.46, 0.02), (0, 0, 0.47), "MAT_Water_A", rgb("cloth_indigo"))
    w.to_object("WATER_Trough").parent = rt
    collider("Trough", (2.1, 0.7, 0.55), (0, 0, 0.27), parent=rt)
    return export_asset("PRP_Water_Trough_A", "props", rt), rt


@asset
def PRP_Water_Vessels_A():
    """PRP_012-016 cluster: brass kudam, clay pot, wooden bucket, rope coil and a big storage vessel on a stand."""
    rng = random.Random(1401)
    rt = root("PRP_Water_Vessels_A")
    p = Part()
    pot(p, (-0.5, 0.1, 0), 1.0, rng, color="brass", mat="MAT_Brass_A")
    pot(p, (-0.05, 0.25, 0), 1.0, rng)
    p.lathe([(0, 0), (0.13, 0), (0.16, 0.28), (0.15, 0.29), (0.0, 0.03)], (0.35, 0.1, 0), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), segments=12)
    for k in (0.06, 0.22):
        p.lathe([(0.14 + k * 0.08, k - 0.012), (0.148 + k * 0.08, k), (0.14 + k * 0.08, k + 0.012)], (0.35, 0.1, 0), "MAT_Iron_A", rgb("iron"), segments=12)
    coil(p, (0.4, -0.3, 0.0), 0.16, 4, rng)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        plank(p, (0.08, 0.08, 0.32), (0.95 + math.cos(a) * 0.22, 0.2 + math.sin(a) * 0.22, 0.16), rng, "teak_dark")
    plank(p, (0.62, 0.62, 0.06), (0.95, 0.2, 0.33), rng, "teak")
    pot(p, (0.95, 0.2, 0.36), 1.9, rng, wide=1.15)
    p.to_object("PRP_Water_Vessels_A_Mesh").parent = rt
    collider("Group", (2.0, 0.9, 0.9), (0.25, 0.15, 0.45), parent=rt)
    return export_asset("PRP_Water_Vessels_A", "props", rt), rt


@asset
def ENV_Temple_Tank_Large_A():
    """Large stepped temple tank (kulam), 26 m square, eight 0.25 m steps on every side, corner landings."""
    rng = random.Random(1501)
    rt = root("ENV_Temple_Tank_Large_A")
    p = Part()
    S = 26.0
    steps = 8
    for i in range(steps):
        half = S / 2 - 0.6 - i * 0.7
        z = -0.25 * i
        rect_lathe(p, [(0, z), (-0.7, z), (-0.7, z - 0.25)], half, half, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite" if i < 3 else "granite_dark", 0.06, rng), caps=False)
    rect_lathe(p, [(0.0, -0.08), (0.0, 0.0), (-0.6, 0.0)], S / 2, S / 2, (0, 0, 0.08), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng), caps=False)
    # low parapet with gaps on each side (ghats)
    for side in range(4):
        for seg in range(6):
            if seg in (2, 3):
                continue
            t = -S / 2 + S * (seg + 0.5) / 6
            if side == 0:
                loc, size = (S / 2 + 0.25, t, 0.3), (0.45, S / 6 - 0.05, 0.6)
            elif side == 1:
                loc, size = (-S / 2 - 0.25, t, 0.3), (0.45, S / 6 - 0.05, 0.6)
            elif side == 2:
                loc, size = (t, S / 2 + 0.25, 0.3), (S / 6 - 0.05, 0.45, 0.6)
            else:
                loc, size = (t, -S / 2 - 0.25, 0.3), (S / 6 - 0.05, 0.45, 0.6)
            p.box(size, loc, "MAT_Stone_Granite_A", rgb("granite", 0.06, rng))
    # small four-pillared pavilion (neerazhi mandapam) in the middle
    rect_lathe(p, [(0.1, -1.9), (0.1, -1.5), (0, -1.5), (0, -1.2)], 1.6, 1.6, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((0.32, 0.32, 2.2), (sx * 1.2, sy * 1.2, -0.1), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    rect_lathe(p, [(0, 1.0), (0.25, 1.1), (0.3, 1.25), (0, 1.3)], 1.6, 1.6, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    p.lathe([(1.2, 1.3), (1.1, 1.6), (0.6, 2.1), (0.0, 2.3)], (0, 0, 0), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.03, rng), segments=4, smooth=False, rot_offset=math.pi / 4)
    p.lathe([(0, 0), (0.1, 0.02), (0.15, 0.15), (0.06, 0.3), (0, 0.4)], (0, 0, 2.3), "MAT_Brass_A", rgb("brass"), segments=10)
    p.to_object("ENV_Temple_Tank_Large_A_Mesh").parent = rt
    w = Part()
    wsz = S - 1.2 - 0.7 * 2 * (steps - 3)
    w.box((wsz, wsz, 0.02), (0, 0, -1.4), "MAT_Water_A", rgb("cloth_indigo"))
    w.to_object("WATER_Tank").parent = rt
    collider("Basin", (S - 1.0, S - 1.0, 1.2), (0, 0, 0.5), parent=rt)
    for name, size, loc in (("N", (S + 1, 0.6, 1.0), (0, S / 2 + 0.25, 0.5)), ("S", (S + 1, 0.6, 1.0), (0, -S / 2 - 0.25, 0.5)),
                            ("E", (0.6, S + 1, 1.0), (S / 2 + 0.25, 0, 0.5)), ("W", (0.6, S + 1, 1.0), (-S / 2 - 0.25, 0, 0.5))):
        collider(f"Rim_{name}", size, loc, parent=rt)
    return export_asset("ENV_Temple_Tank_Large_A", "landmarks", rt, required=["WATER_Tank"]), rt


@asset
def ENV_Paddy_Plot_A():
    """10 x 10 m paddy field with earthen bunds. STATE_dry (cracked, stubble) / STATE_irrigated (flooded, green rows)."""
    rng = random.Random(1601)
    rt = root("ENV_Paddy_Plot_A")
    p = Part()
    S = 10.0
    for k in range(4):
        a = k * math.pi / 2
        x, y = math.cos(a) * S / 2, math.sin(a) * S / 2
        p.box((0.6 if k % 2 == 0 else S + 0.6, S + 0.6 if k % 2 == 0 else 0.6, 0.3), (x, y, 0.08), "MAT_Soil_A", rgb("soil", 0.05, rng), taper=(0.6, 0.6) if k % 2 == 0 else (1.0, 0.6))
    p.to_object("ENV_Paddy_Plot_A_Mesh").parent = rt
    d = Part()
    d.box((S - 0.3, S - 0.3, 0.04), (0, 0, -0.02), "MAT_Soil_A", rgb("soil_dry", 0.05, rng))
    for i in range(14):
        d.box((rng.random() * 1.5 + 0.4, 0.02, 0.01), ((rng.random() - 0.5) * (S - 1), (rng.random() - 0.5) * (S - 1), 0.005), "MAT_Soil_A", rgb("soil", 0.04, rng), rot_z=rng.random() * 3)
    for i in range(60):
        d.box((0.03, 0.03, 0.12), ((rng.random() - 0.5) * (S - 1), (rng.random() - 0.5) * (S - 1), 0.06), "MAT_Foliage_A", rgb("paddy_dry", 0.1, rng))
    d.to_object("STATE_dry").parent = rt
    g = Part()
    g.box((S - 0.3, S - 0.3, 0.04), (0, 0, -0.02), "MAT_Soil_A", rgb("mud_wet", 0.03, rng))
    rows = 16
    for i in range(rows):
        for j in range(rows):
            x = -S / 2 + 0.5 + i * (S - 1) / (rows - 1)
            y = -S / 2 + 0.5 + j * (S - 1) / (rows - 1)
            h = 0.32 + rng.random() * 0.12
            for k in range(3):
                a = k * 2.1 + rng.random()
                tip = (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, h)
                verts = [g.bm.verts.new((x - 0.015, y, 0.0)), g.bm.verts.new((x + 0.015, y, 0.0)), g.bm.verts.new(tip)]
                f = g.bm.faces.new(verts)
                g._finish([f], "MAT_Foliage_A", rgb("paddy", 0.1, rng), shade=True)
    g.to_object("STATE_irrigated").parent = rt
    w = Part()
    w.box((S - 0.4, S - 0.4, 0.01), (0, 0, 0.04), "MAT_Water_A", rgb("cloth_indigo"))
    w.to_object("WATER_STATE_irrigated").parent = rt
    return export_asset("ENV_Paddy_Plot_A", "environment", rt, required=["STATE_dry", "STATE_irrigated"]), rt


@asset
def ENV_Garden_Plot_A():
    """ENV_016-021 farming plot, 2.4 x 1.6 m with stone edging: STATE_empty / planted / growing / ripe."""
    rng = random.Random(1701)
    rt = root("ENV_Garden_Plot_A")
    p = Part()
    L, W = 2.4, 1.6
    for sx in (-1, 1):
        for k in range(5):
            p.box((0.46, 0.18, 0.16), (-L / 2 + 0.24 + k * 0.48, sx * (W / 2 + 0.09), 0.08), "MAT_Stone_Granite_A", rgb("granite", 0.08, rng), rot_z=(rng.random() - 0.5) * 0.08)
        for k in range(4):
            p.box((0.18, 0.4, 0.16), (sx * (L / 2 + 0.09), -W / 2 + 0.2 + k * 0.4, 0.08), "MAT_Stone_Granite_A", rgb("granite", 0.08, rng))
    p.box((L, W, 0.12), (0, 0, 0.06), "MAT_Soil_A", rgb("soil", 0.04, rng))
    for r in range(3):
        p.box((L - 0.2, 0.22, 0.05), (0, -W / 2 + 0.3 + r * 0.5, 0.13), "MAT_Soil_A", rgb("soil", 0.06, rng))
    p.to_object("ENV_Garden_Plot_A_Mesh", bevel=0.01).parent = rt
    pts = [(-L / 2 + 0.3 + i * 0.45, -W / 2 + 0.3 + r * 0.5) for i in range(5) for r in range(3)]
    e = Part()
    for x, y in pts[::3]:
        e.ico(0.06, (x, y, 0.15), "MAT_Soil_A", rgb("soil_dry", 0.06, rng), subdiv=1, scale=(1, 1, 0.4))
    e.to_object("STATE_empty").parent = rt
    pl = Part()
    for x, y in pts:
        pl.box((0.02, 0.02, 0.06), (x, y, 0.18), "MAT_Foliage_A", rgb("leaf_light", 0.1, rng))
        pl.ico(0.025, (x, y, 0.22), "MAT_Foliage_A", rgb("leaf_light", 0.1, rng), subdiv=1, scale=(1.4, 1, 0.4))
    pl.to_object("STATE_planted").parent = rt
    gr = Part()
    for x, y in pts:
        gr.tube([(x, y, 0.15), (x, y, 0.35)], [0.012, 0.01], "MAT_Foliage_A", rgb("leaf", 0.05, rng), segments=4)
        for k in range(3):
            a = k * 2.1 + rng.random()
            gr.ico(0.07, (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, 0.3 + k * 0.03), "MAT_Foliage_A", rgb("leaf", 0.1, rng), subdiv=1, scale=(1.2, 0.7, 0.35), noise=0.1, rng=rng)
    gr.to_object("STATE_growing").parent = rt
    rp = Part()
    for i, (x, y) in enumerate(pts):
        rp.tube([(x, y, 0.15), (x, y, 0.45)], [0.014, 0.011], "MAT_Foliage_A", rgb("leaf", 0.05, rng), segments=4)
        for k in range(4):
            a = k * 1.6 + rng.random()
            rp.ico(0.09, (x + math.cos(a) * 0.08, y + math.sin(a) * 0.08, 0.36 + k * 0.03), "MAT_Foliage_A", rgb("leaf", 0.1, rng), subdiv=1, scale=(1.2, 0.7, 0.35), noise=0.1, rng=rng)
        crop = ("vegetable_purple", "mango", "hibiscus")[i % 3]
        rp.ico(0.05, (x + 0.05, y - 0.04, 0.3), "MAT_Foliage_A", rgb(crop if crop != "hibiscus" else "marigold", 0.06, rng), subdiv=1, scale=(0.8, 0.8, 1.4))
    rp.to_object("STATE_ripe").parent = rt
    collider("Plot", (L + 0.3, W + 0.3, 0.25), (0, 0, 0.12), parent=rt)
    return export_asset("ENV_Garden_Plot_A", "props", rt, required=["STATE_empty", "STATE_planted", "STATE_growing", "STATE_ripe"]), rt


@asset
def PRP_Debris_Pile_A():
    """ENV_010 drainage debris: twigs, leaves and silt. Also used as a 'clearable' marker."""
    rng = random.Random(1801)
    rt = root("PRP_Debris_Pile_A")
    p = Part()
    p.ico(0.45, (0, 0, 0.0), "MAT_Soil_A", rgb("silt", 0.06, rng), subdiv=2, scale=(1.4, 1.1, 0.35), noise=0.12, rng=rng)
    heap(p, (0, 0, 0.05), 0.5, 40, lambda i: ("leaf_dry", "leaf", "bark")[i % 3], rng, size=0.06, scale=(1.5, 0.8, 0.3))
    for k in range(7):
        a = rng.random() * math.pi
        p.tube([(math.cos(a) * -0.5, math.sin(a) * -0.4, 0.1), (math.cos(a) * 0.5, math.sin(a) * 0.4, 0.14 + rng.random() * 0.1)], [0.015, 0.01], "MAT_Wood_Teak_A", rgb("bark", 0.06, rng), segments=5)
    p.to_object("PRP_Debris_Pile_A_Mesh").parent = rt
    return export_asset("PRP_Debris_Pile_A", "props", rt), rt
