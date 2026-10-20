"""Category C - crafting and repair (asserts_img/CRAFTING.jpg)."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.props import bamboo, plank, rope_path, coil, pot, basket, heap

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


@asset
def PRP_Workbench_Artisan_A():
    """PRP_018/037 artisan workbench: thick top, splayed legs, stretchers, side vise, tools laid out."""
    rng = random.Random(5001)
    rt = root("PRP_Workbench_Artisan_A")
    p = Part()
    plank(p, (2.2, 0.75, 0.12), (0, 0, 0.86), rng, "teak")
    plank(p, (2.0, 0.08, 0.06), (0, -0.33, 0.95), rng, "teak_dark")  # tool tray lip
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.12, 0.12, 0.82), (sx * 0.95, sy * 0.28, 0.41), rng, "teak_dark")
        plank(p, (0.1, 0.6, 0.08), (sx * 0.95, 0, 0.18), rng, "teak_dark")
    plank(p, (1.8, 0.08, 0.08), (0, 0, 0.2), rng, "teak_dark")
    # vise: jaw block, screw, handle
    plank(p, (0.12, 0.3, 0.25), (1.18, -0.2, 0.82), rng, "teak")
    p.tube([(1.08, -0.2, 0.84), (1.4, -0.2, 0.84)], [0.025, 0.025], "MAT_Iron_A", rgb("iron"), segments=6)
    p.tube([(1.4, -0.38, 0.84), (1.4, -0.02, 0.84)], [0.018, 0.018], "MAT_Wood_Teak_A", rgb("teak"), segments=6)
    # tools: mallet, chisels, carved block in progress, wood shavings
    p.tube([(-0.6, -0.15, 0.95), (-0.25, -0.1, 0.95)], [0.016, 0.016], "MAT_Wood_Teak_A", rgb("teak"), segments=6)
    p.box((0.16, 0.1, 0.1), (-0.65, -0.15, 0.97), "MAT_Wood_Teak_A", rgb("teak_dark"))
    for k in range(3):
        p.box((0.2, 0.02, 0.02), (-0.1 + k * 0.06, -0.25, 0.93), "MAT_Iron_A", rgb("iron"), rot_z=0.2)
    p.box((0.3, 0.2, 0.18), (0.4, 0.05, 1.01), "MAT_Wood_Teak_A", rgb("bamboo", 0.05, rng))
    heap(p, (0.4, 0.2, 0.93), 0.2, 12, "bamboo", rng, size=0.02, scale=(2, 0.5, 0.3), mat="MAT_Wood_Teak_A")
    p.to_object("PRP_Workbench_Artisan_A_Mesh").parent = rt
    collider("Bench", (2.3, 0.85, 1.0), (0, 0, 0.5), parent=rt)
    empty("SOCKET_Work", (0, -0.9, 0), parent=rt)
    return export_asset("PRP_Workbench_Artisan_A", "props", rt), rt


@asset
def PRP_Stone_Work_Surface_A():
    """PRP_019 stoneworking surface: a rough granite slab on blocks with a half-dressed block and dust."""
    rng = random.Random(5101)
    rt = root("PRP_Stone_Work_Surface_A")
    p = Part()
    for sx in (-1, 1):
        p.box((0.4, 0.6, 0.45), (sx * 0.6, 0, 0.22), "MAT_Stone_Granite_A", rgb("granite_dark", 0.06, rng))
    p.ico(1.0, (0, 0, 0.55), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng), subdiv=2, scale=(0.95, 0.5, 0.12), noise=0.05, rng=rng)
    p.box((0.42, 0.3, 0.25), (0.1, 0.0, 0.78), "MAT_Stone_Granite_A", rgb("granite_new", 0.06, rng), rot_z=0.2)
    heap(p, (0.0, -0.1, 0.62), 0.5, 26, "clay_lime", rng, size=0.02, scale=(1.4, 1, 0.3), mat="MAT_Soil_A")
    heap(p, (0.3, -0.5, 0.0), 0.5, 22, "granite_new", rng, size=0.04, mat="MAT_Stone_Granite_A")
    p.to_object("PRP_Stone_Work_Surface_A_Mesh", bevel=0.01).parent = rt
    collider("Slab", (1.8, 1.0, 0.8), (0, 0, 0.4), parent=rt)
    empty("SOCKET_Work", (0, -0.9, 0), parent=rt)
    return export_asset("PRP_Stone_Work_Surface_A", "props", rt), rt


@asset
def PRP_Garland_Station_A():
    """PRP_020 garland-making station: low table with a woven mat, flower piles, twine bundle and scissors."""
    rng = random.Random(5201)
    rt = root("PRP_Garland_Station_A")
    p = Part()
    plank(p, (1.3, 0.8, 0.06), (0, 0, 0.32), rng, "teak")
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.07, 0.07, 0.3), (sx * 0.58, sy * 0.33, 0.15), rng, "teak_dark")
    p.box((1.1, 0.6, 0.01), (0, 0, 0.355), "MAT_Thatch_A", rgb("thatch", 0.04, rng))
    for (x, y, c) in ((-0.35, -0.12, "marigold"), (-0.05, 0.15, "jasmine"), (0.25, -0.1, "kolam_pink"), (0.35, 0.18, "marigold_yellow")):
        heap(p, (x, y, 0.36), 0.12, 16, c, rng, size=0.03)
    # a half-strung garland across the table
    pts = [(-0.5 + i * 0.05, 0.25 + math.sin(i * 0.4) * 0.03, 0.37) for i in range(16)]
    rope_path(p, pts, 0.005, rng)
    for i, q in enumerate(pts[::2]):
        p.ico(0.022, q, "MAT_Foliage_A", rgb("marigold" if i % 2 else "jasmine"), subdiv=1)
    coil(p, (0.45, -0.25, 0.36), 0.06, 3, rng, r=0.008)
    p.to_object("PRP_Garland_Station_A_Mesh").parent = rt
    collider("Table", (1.3, 0.8, 0.4), (0, 0, 0.2), parent=rt)
    empty("SOCKET_Work", (0, -0.85, 0), parent=rt)
    return export_asset("PRP_Garland_Station_A", "props", rt), rt


@asset
def PRP_Tool_Rack_A():
    """PRP_022 tool rack with hanging chisels, saw, mallet and a rope bundle."""
    rng = random.Random(5301)
    rt = root("PRP_Tool_Rack_A")
    p = Part()
    for sx in (-1, 1):
        plank(p, (0.08, 0.3, 1.3), (sx * 0.6, 0, 0.65), rng, "teak_dark")
        plank(p, (0.12, 0.45, 0.06), (sx * 0.6, 0, 0.03), rng, "teak_dark")
    plank(p, (1.3, 0.08, 0.08), (0, 0, 1.2), rng, "teak")
    plank(p, (1.3, 0.06, 0.06), (0, 0, 0.5), rng, "teak")
    for k in range(5):
        x = -0.45 + k * 0.22
        p.tube([(x, 0.05, 1.15), (x, 0.05, 0.75)], [0.012, 0.012], "MAT_Wood_Teak_A", rgb("teak"), segments=5)
        p.box((0.03, 0.01, 0.16), (x, 0.05, 0.66), "MAT_Iron_A", rgb("iron"))
    p.box((0.5, 0.01, 0.14), (0.25, 0.06, 0.95), "MAT_Iron_A", rgb("iron"))  # saw blade
    plank(p, (0.06, 0.04, 0.3), (0.52, 0.06, 0.95), rng, "teak")
    coil(p, (-0.3, 0.1, 0.3), 0.15, 4, rng)
    p.to_object("PRP_Tool_Rack_A_Mesh").parent = rt
    collider("Rack", (1.3, 0.4, 1.3), (0, 0, 0.65), parent=rt)
    return export_asset("PRP_Tool_Rack_A", "props", rt), rt


@asset
def PRP_Mortar_Pestle_A():
    """PRP_023 stone mortar and pestle plus PRP_031 mortar-mixing bowl with a wooden paddle."""
    rng = random.Random(5401)
    rt = root("PRP_Mortar_Pestle_A")
    p = Part()
    p.lathe([(0, 0), (0.22, 0), (0.26, 0.2), (0.2, 0.3), (0.12, 0.26), (0.0, 0.18)], (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng), segments=14)
    p.tube([(0.0, 0.05, 0.2), (0.08, 0.12, 0.6)], [0.05, 0.04], "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng), segments=8)
    p.lathe([(0, 0.0), (0.38, 0.0), (0.46, 0.18), (0.42, 0.2), (0.0, 0.08)], (0.7, 0.0, 0), "MAT_Terracotta_A", rgb("terracotta", 0.05, rng), segments=16)
    p.box((0.7, 0.6, 0.02), (0.7, 0.0, 0.15), "MAT_Plaster_Lime_A", rgb("clay_lime", 0.04, rng))
    p.tube([(0.6, -0.05, 0.16), (0.9, 0.2, 0.45)], [0.015, 0.015], "MAT_Wood_Teak_A", rgb("teak"), segments=5)
    p.to_object("PRP_Mortar_Pestle_A_Mesh").parent = rt
    collider("Group", (1.5, 1.0, 0.4), (0.35, 0, 0.2), parent=rt)
    return export_asset("PRP_Mortar_Pestle_A", "props", rt), rt


@asset
def PRP_Material_Stacks_A():
    """PRP_028-030 / ENV_036 repair material stacks: stone blocks, bricks, timber, lime bowls."""
    rng = random.Random(5501)
    rt = root("PRP_Material_Stacks_A")
    p = Part()
    for r in range(2):
        for k in range(3 - r):
            p.box((0.5, 0.3, 0.28), (-0.9 + k * 0.52 + r * 0.26, 0, 0.14 + r * 0.29), "MAT_Stone_Granite_A", rgb("granite_new", 0.07, rng), rot_z=(rng.random() - 0.5) * 0.06)
    for r in range(5):
        for k in range(4):
            rot = (r % 2) * math.pi / 2
            p.box((0.23, 0.11, 0.07), (0.25 + (k * 0.12 if r % 2 else k * 0.24) * 0.5, (0.0 if not r % 2 else (k - 1.5) * 0.12), 0.035 + r * 0.075), "MAT_Brick_A", rgb("brick", 0.07, rng), rot_z=rot)
    for k in range(4):
        p.tube([(0.9, -0.3 + k * 0.17, 0.08 + (k % 2) * 0.0), (1.9, -0.3 + k * 0.17, 0.08)], [0.08, 0.08], "MAT_Wood_Teak_A", rgb("bark" if k % 2 else "teak", 0.06, rng), segments=8)
    plank(p, (1.0, 0.3, 0.06), (1.4, -0.1, 0.2), rng, "teak")
    p.lathe([(0, 0), (0.2, 0.0), (0.25, 0.12), (0.0, 0.06)], (-0.3, -0.6, 0), "MAT_Terracotta_A", rgb("terracotta"), segments=12)
    p.box((0.4, 0.4, 0.02), (-0.3, -0.6, 0.1), "MAT_Plaster_Lime_A", rgb("clay_lime"))
    p.to_object("PRP_Material_Stacks_A_Mesh", bevel=0.008).parent = rt
    collider("Stacks", (3.2, 1.0, 0.7), (0.45, -0.1, 0.35), parent=rt)
    return export_asset("PRP_Material_Stacks_A", "props", rt), rt


@asset
def PRP_Timber_Pile_A():
    """PRP_028 felled timber pile (gatherable: the top log is PICK_Log)."""
    rng = random.Random(5601)
    rt = root("PRP_Timber_Pile_A")
    p = Part()
    for r in range(2):
        for k in range(3 - r):
            y = -0.25 + k * 0.25 + r * 0.12
            p.tube([(-0.9, y, 0.12 + r * 0.22), (0.9, y, 0.12 + r * 0.22)], [0.12, 0.11], "MAT_Wood_Teak_A", rgb("bark", 0.06, rng), segments=9)
            for sx in (-1, 1):
                p.lathe([(0.0, 0), (0.11, 0.0)], (sx * 0.9, y, 0.12 + r * 0.22), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), segments=9)
    p.to_object("PRP_Timber_Pile_A_Mesh").parent = rt
    t = Part()
    t.tube([(-0.85, 0.0, 0.56), (0.85, 0.0, 0.56)], [0.1, 0.1], "MAT_Wood_Teak_A", rgb("bark", 0.06, rng), segments=9)
    t.to_object("PICK_Log").parent = rt
    collider("Pile", (2.0, 0.9, 0.7), (0, 0, 0.35), parent=rt)
    return export_asset("PRP_Timber_Pile_A", "props", rt, required=["PICK_Log"]), rt


@asset
def PRP_Dry_Grass_A():
    """Tall dry grass clump at the field edge (gatherable thatching grass; PICK_Grass)."""
    rng = random.Random(5701)
    rt = root("PRP_Dry_Grass_A")
    p = Part()
    p.ico(0.3, (0, 0, 0.02), "MAT_Soil_A", rgb("soil_dry", 0.05, rng), subdiv=1, scale=(1.4, 1.4, 0.2))
    p.to_object("PRP_Dry_Grass_A_Base").parent = rt
    g = Part()
    for k in range(40):
        a = rng.random() * math.tau
        r = rng.random() * 0.4
        x, y = math.cos(a) * r, math.sin(a) * r
        lean = rng.random() * math.tau
        h = 0.7 + rng.random() * 0.6
        tip = (x + math.cos(lean) * 0.25, y + math.sin(lean) * 0.25, h)
        col = rgb(rng.choice(("paddy_dry", "thatch", "leaf_dry")), 0.08, rng)
        for order in (((x - 0.02, y, 0), (x + 0.02, y, 0), tip), ((x + 0.02, y, 0), (x - 0.02, y, 0), tip)):
            f = g.bm.faces.new([g.bm.verts.new(q) for q in order])
            g._finish([f], "MAT_Foliage_A", col, shade=True)
    g.to_object("PICK_Grass").parent = rt
    return export_asset("PRP_Dry_Grass_A", "props", rt, required=["PICK_Grass"]), rt
