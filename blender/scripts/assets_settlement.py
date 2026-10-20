"""Category H and M - temple / settlement interaction points and buildings (asserts_img/TEMPLE.jpg, BUILDINGS.jpg),
plus festival decorations (ENV_086_festival in ENV DETAILS.jpg)."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.arch import pillar, rect_lathe, kalasha
from tom.props import bamboo, plank, rope_path, thatch_roof, pot, basket, heap, cloth_sheet, chest

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


@asset
def ENV_Notice_Board_A():
    """ENV_043 community notice board: two posts, a small thatched hood, pinned palm-leaf notes."""
    rng = random.Random(9001)
    rt = root("ENV_Notice_Board_A")
    p = Part()
    for sx in (-1, 1):
        plank(p, (0.12, 0.12, 2.3), (sx * 0.85, 0, 1.15), rng, "teak_dark")
    plank(p, (1.6, 0.08, 1.0), (0, 0, 1.45), rng, "teak")
    plank(p, (1.7, 0.1, 0.08), (0, 0, 1.97), rng, "teak_dark")
    plank(p, (1.7, 0.1, 0.08), (0, 0, 0.93), rng, "teak_dark")
    for k, (x, z, w, h) in enumerate(((-0.5, 1.6, 0.35, 0.28), (-0.05, 1.5, 0.3, 0.4), (0.45, 1.62, 0.32, 0.24), (0.42, 1.25, 0.3, 0.2), (-0.45, 1.2, 0.3, 0.22))):
        p.box((w, 0.012, h), (x, -0.05, z), "MAT_Thatch_A", rgb("thatch" if k % 2 else "cloth_white", 0.05, rng), rot_z=0)
        for r in range(int(h / 0.06)):
            p.box((w * 0.8, 0.014, 0.008), (x, -0.052, z + h / 2 - 0.05 - r * 0.05), "MAT_Thatch_A", rgb("dark_recess"))
        p.ico(0.015, (x, -0.06, z + h / 2 - 0.02), "MAT_Brass_A", rgb("brass"), subdiv=1)
    tmp = Part()
    thatch_roof(tmp, 1.7, 0.5, 2.1, 2.5, rng, overhang=0.2)
    tmp.to_object("ENV_Notice_Board_A_Roof").parent = rt
    p.to_object("ENV_Notice_Board_A_Mesh").parent = rt
    for sx in (-1, 1):
        collider(f"Post_{sx}", (0.2, 0.2, 2.3), (sx * 0.85, 0, 1.15), parent=rt)
    collider("Board", (1.7, 0.12, 1.1), (0, 0, 1.45), parent=rt)
    return export_asset("ENV_Notice_Board_A", "props", rt), rt


@asset
def ENV_Seating_Platform_A():
    """ENV_045 roofed seating platform (a small mandapam for resting and gathering)."""
    rng = random.Random(9101)
    rt = root("ENV_Seating_Platform_A")
    p = Part()
    rect_lathe(p, [(0.08, 0), (0.08, 0.15), (0.0, 0.15), (0.0, 0.5)], 2.0, 1.5, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    for k in range(2):
        p.box((1.4, 0.35, 0.25 * (k + 1)), (0, -1.5 - 0.35 * (2 - k) + 0.175, 0.125 * (k + 1)), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    for sx in (-1, 1):
        for sy in (-1, 1):
            pillar(p, (sx * 1.7, sy * 1.2, 0.5), height=2.3, width=0.3, rng=rng, bracket=False)
    p.box((4.4, 3.4, 0.2), (0, 0, 2.9), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    for sy in (-1, 1):
        a = [(-2.4, sy * 1.9, 3.0), (2.4, sy * 1.9, 3.0)]
        b = [(-2.4, 0, 3.7), (2.4, 0, 3.7)]
        (p.quad_strip(a, b, "MAT_Terracotta_A", rgb("tile", 0.05, rng), smooth=False) if sy < 0 else p.quad_strip(b, a, "MAT_Terracotta_A", rgb("tile", 0.05, rng), smooth=False))
        for k in range(20):
            x = -2.35 + k * 0.245
            p.tube([(x, sy * 1.92, 3.03), (x, 0, 3.73)], [0.06, 0.06], "MAT_Terracotta_A", rgb("tile", 0.1, rng), segments=6)
    for sx in (-1, 1):
        f = p.bm.faces.new([p.bm.verts.new(q) for q in ((sx * 2.4, -1.9, 3.0), (sx * 2.4, 1.9, 3.0), (sx * 2.4, 0, 3.7))][:: sx])
        p._finish([f], "MAT_Plaster_Lime_A", rgb("plaster", 0.03, rng))
    plank(p, (2.2, 0.45, 0.08), (0, 0.9, 0.95), rng, "teak")  # bench on the platform
    for sx in (-1, 1):
        plank(p, (0.08, 0.35, 0.45), (sx * 0.95, 0.9, 0.72), rng, "teak_dark")
    p.to_object("ENV_Seating_Platform_A_Mesh").parent = rt
    collider("Platform", (4.2, 3.2, 0.5), (0, 0, 0.25), kind="WALK", parent=rt)
    for k in range(2):
        collider(f"Step_{k}", (1.4, 0.35, 0.25 * (k + 1)), (0, -1.5 - 0.35 * (2 - k) + 0.175, 0.125 * (k + 1)), kind="WALK", parent=rt)
    for sx in (-1, 1):
        for sy in (-1, 1):
            collider(f"Pillar_{sx}_{sy}", (0.35, 0.35, 2.5), (sx * 1.7, sy * 1.2, 1.7), parent=rt)
    collider("Bench", (2.2, 0.45, 1.0), (0, 0.9, 0.5), parent=rt)
    empty("SOCKET_Seat", (0, 0.65, 0.5), parent=rt)
    return export_asset("ENV_Seating_Platform_A", "buildings", rt), rt


@asset
def ENV_Festival_Station_A():
    """ENV_047 festival preparation station: canopy table with flowers, garlands, coconuts and a lamp."""
    rng = random.Random(9201)
    rt = root("ENV_Festival_Station_A")
    p = Part()
    for sx in (-1, 1):
        for sy in (-1, 1):
            bamboo(p, (sx * 1.2, sy * 0.8, 0), (sx * 1.2, sy * 0.8, 2.2), 0.04, rng)
    plank(p, (1.8, 0.8, 0.06), (0, 0, 0.75), rng, "teak")
    for sx in (-1, 1):
        plank(p, (0.06, 0.7, 0.72), (sx * 0.8, 0, 0.36), rng, "teak_dark")
    heap(p, (-0.5, 0.1, 0.78), 0.2, 26, lambda i: ("marigold", "jasmine", "kolam_pink")[i % 3], rng, size=0.035)
    heap(p, (0.1, 0.15, 0.78), 0.18, 16, "hibiscus", rng, size=0.04)
    for k in range(3):
        p.ico(0.1, (0.55 + k * 0.08, -0.15, 0.85), "MAT_Foliage_A", rgb("coconut"), subdiv=1)
    pts = [(-0.7 + i * 0.07, -0.25, 0.79) for i in range(14)]
    rope_path(p, pts, 0.006, rng)
    for i, q in enumerate(pts):
        p.ico(0.028, q, "MAT_Foliage_A", rgb("marigold" if i % 2 else "jasmine"), subdiv=1)
    p.to_object("ENV_Festival_Station_A_Mesh").parent = rt
    c = Part()
    cloth_sheet(c, [(-1.3, -0.9, 2.2), (1.3, -0.9, 2.2), (1.3, 0.9, 2.2), (-1.3, 0.9, 2.2)], 4, 3, 0.18, lambda i, j: "plaster_warm", rng)
    c.to_object("ENV_Festival_Station_A_Canopy").parent = rt
    collider("Table", (1.9, 0.9, 0.85), (0, 0, 0.42), parent=rt)
    empty("SOCKET_Work", (0, -0.9, 0), parent=rt)
    return export_asset("ENV_Festival_Station_A", "props", rt), rt


@asset
def PRP_Contribution_Chest_A():
    """ENV_049 community contribution chest on a stone plinth."""
    rng = random.Random(9301)
    rt = root("PRP_Contribution_Chest_A")
    p = Part()
    rect_lathe(p, [(0.06, 0), (0.06, 0.1), (0, 0.1), (0, 0.4)], 0.6, 0.4, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    chest(p, (0, 0, 0.4), (1.0, 0.6, 0.5), rng)
    p.box((0.2, 0.02, 0.02), (0, 0.0, 1.15), "MAT_Iron_A", rgb("iron"))
    p.to_object("PRP_Contribution_Chest_A_Mesh").parent = rt
    collider("Chest", (1.3, 0.9, 1.2), (0, 0, 0.6), parent=rt)
    return export_asset("PRP_Contribution_Chest_A", "props", rt), rt


@asset
def ENV_Carved_Frieze_A():
    """ENV_050 architectural inspection point: a carved frieze block with rows of figures and creepers."""
    rng = random.Random(9401)
    rt = root("ENV_Carved_Frieze_A")
    p = Part()
    rect_lathe(p, [(0.08, 0), (0.08, 0.12), (0.0, 0.12), (0.0, 0.9), (0.06, 0.95), (0.06, 1.05), (0, 1.05)], 1.2, 0.35, (0, 0, 0), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    for k in range(7):
        x = -1.0 + k * 0.33
        p.box((0.2, 0.04, 0.45), (x, -0.37, 0.5), "MAT_Stone_Granite_A", rgb("sandstone", 0.05, rng), taper=(0.6, 1.0))
        p.ico(0.06, (x, -0.38, 0.78), "MAT_Stone_Granite_A", rgb("sandstone", 0.05, rng), subdiv=1, scale=(1, 0.6, 1))
    for k in range(14):  # creeper band
        x = -1.1 + k * 0.17
        p.ico(0.04, (x, -0.37, 0.2 + 0.03 * math.sin(k)), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng), subdiv=1, scale=(1.4, 0.5, 0.8))
    p.to_object("ENV_Carved_Frieze_A_Mesh").parent = rt
    collider("Block", (2.5, 0.85, 1.05), (0, 0, 0.52), parent=rt)
    return export_asset("ENV_Carved_Frieze_A", "props", rt), rt


@asset
def ENV_Gate_Brick_Ruin_A():
    """ENV_037 / ENV_064 old brick entrance gate with peeling plaster, a lintel and a thatch-and-timber hood (ruins entry)."""
    rng = random.Random(9501)
    rt = root("ENV_Gate_Brick_Ruin_A")
    p = Part()
    W, D, H, PW = 5.6, 1.2, 3.6, 2.2
    pier = (W - PW) / 2
    for sx in (-1, 1):
        cx = sx * (PW / 2 + pier / 2)
        p.box((pier, D, H), (cx, 0, H / 2), "MAT_Brick_A", rgb("brick_old", 0.04, rng))
        # plaster patches (partly fallen)
        for k in range(3):
            p.box((pier * (0.5 + rng.random() * 0.4), 0.03, 0.6 + rng.random() * 0.8), (cx + (rng.random() - 0.5) * 0.4, -D / 2 - 0.012, 0.6 + k * 1.0), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.06, rng))
        p.box((0.5, 0.05, 0.7), (cx, -D / 2 - 0.02, 2.2), "MAT_Plaster_Lime_A", rgb("dark_recess"))  # niche
        rect_lathe(p, [(0.08, 0), (0.08, 0.3), (0, 0.3)], pier / 2, D / 2, (cx, 0, 0), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    p.box((W, D + 0.1, 0.5), (0, 0, H + 0.25), "MAT_Brick_A", rgb("brick_old", 0.04, rng))
    for k in range(8):  # broken top courses
        if rng.random() < 0.3:
            continue
        p.box((W / 8 - 0.02, D, 0.2 + rng.random() * 0.3), (-W / 2 + (k + 0.5) * W / 8, 0, H + 0.6), "MAT_Brick_A", rgb("brick_old", 0.06, rng))
    for k in range(9):  # projecting timber rafters
        plank(p, (0.08, 1.8, 0.08), (-W / 2 + 0.3 + k * (W - 0.6) / 8, -0.5, H + 0.45), rng, "bark")
    p.to_object("ENV_Gate_Brick_Ruin_A_Mesh").parent = rt
    for sx in (-1, 1):
        collider(f"Pier_{sx}", (pier, D, H + 0.8), (sx * (PW / 2 + pier / 2), 0, (H + 0.8) / 2), parent=rt)
    return export_asset("ENV_Gate_Brick_Ruin_A", "landmarks", rt), rt


@asset
def ENV_Field_Hut_A():
    """ENV_066 open thatched field hut on a stone floor (gardener's work shelter in the fields)."""
    rng = random.Random(9601)
    rt = root("ENV_Field_Hut_A")
    p = Part()
    p.box((4.4, 3.4, 0.2), (0, 0, 0.1), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.14, 0.14, 2.3), (sx * 1.9, sy * 1.4, 1.35), rng, "bark")
    for sy in (-1, 1):
        plank(p, (4.2, 0.12, 0.12), (0, sy * 1.4, 2.5), rng, "bark")
    basket(p, (-1.2, 0.8, 0.2), 0.3, 0.25, rng)
    heap(p, (-1.2, 0.8, 0.45), 0.25, 12, "grain", rng, size=0.05)
    sack_x = 1.2
    p.ico(0.25, (sack_x, 0.8, 0.45), "MAT_Cloth_A", rgb("basket", 0.05, rng), subdiv=2, scale=(1, 0.85, 1.2), noise=0.05, rng=rng)
    p.to_object("ENV_Field_Hut_A_Mesh").parent = rt
    t = Part()
    thatch_roof(t, 4.0, 3.0, 2.55, 3.6, rng, overhang=0.35)
    t.to_object("ENV_Field_Hut_A_Roof").parent = rt
    collider("Floor", (4.4, 3.4, 0.2), (0, 0, 0.1), kind="WALK", parent=rt)
    for sx in (-1, 1):
        for sy in (-1, 1):
            collider(f"Post_{sx}_{sy}", (0.2, 0.2, 2.5), (sx * 1.9, sy * 1.4, 1.35), parent=rt)
    return export_asset("ENV_Field_Hut_A", "buildings", rt), rt


@asset
def PRP_Festival_Bunting_A():
    """Festival decoration: string of cloth pennants and marigold strands, 8 m span (hung between two points)."""
    rng = random.Random(9701)
    rt = root("PRP_Festival_Bunting_A")
    p = Part()
    span = 8.0
    pts = [(-span / 2 + span * i / 40, 0, -0.5 * math.sin(math.pi * i / 40)) for i in range(41)]
    rope_path(p, pts[::4], 0.01, rng)
    cols = ["cloth_saffron", "cloth_red", "marigold_yellow", "cloth_green", "kolam_pink"]
    for i in range(1, 40, 2):
        x, y, z = pts[i]
        c = rgb(cols[(i // 2) % 5], 0.03, rng)
        tri = [(x - 0.12, 0, z), (x + 0.12, 0, z), (x, 0, z - 0.32)]
        for order in (tri, list(reversed(tri))):
            f = p.bm.faces.new([p.bm.verts.new(q) for q in order])
            p._finish([f], "MAT_Cloth_A", c)
    for i in range(0, 41, 4):  # marigold drops
        x, y, z = pts[i]
        for k in range(4):
            p.ico(0.03, (x, 0.02, z - 0.05 - k * 0.06), "MAT_Foliage_A", rgb("marigold" if k % 2 else "jasmine"), subdiv=1)
    p.to_object("PRP_Festival_Bunting_A_Mesh").parent = rt
    return export_asset("PRP_Festival_Bunting_A", "props", rt), rt


@asset
def PRP_Festival_Lamp_Row_A():
    """Festival decoration: a row of five lit clay lamps on a low stone ledge (2 m)."""
    rng = random.Random(9801)
    rt = root("PRP_Festival_Lamp_Row_A")
    p = Part()
    p.box((2.0, 0.3, 0.15), (0, 0, 0.075), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    for k in range(5):
        x = -0.8 + k * 0.4
        p.lathe([(0, 0), (0.07, 0.0), (0.085, 0.04), (0.07, 0.05), (0.0, 0.02)], (x, 0, 0.15), "MAT_Terracotta_A", rgb("terracotta", 0.04, rng), segments=10)
    p.to_object("PRP_Festival_Lamp_Row_A_Mesh").parent = rt
    f = Part()
    for k in range(5):
        f.lathe([(0, 0), (0.016, 0.015), (0.012, 0.04), (0, 0.065)], (-0.8 + k * 0.4 + 0.05, 0, 0.2), "MAT_Emissive_A", rgb("flame"), segments=8)
    f.to_object("FLAME_Row").parent = rt
    return export_asset("PRP_Festival_Lamp_Row_A", "props", rt), rt


@asset
def PRP_Banana_Arch_A():
    """Festival decoration: banana-stem pillars with bunches and a marigold garland across a doorway or street (3 m)."""
    rng = random.Random(9901)
    rt = root("PRP_Banana_Arch_A")
    p = Part()
    for sx in (-1, 1):
        p.lathe([(0.11, 0), (0.09, 2.3)], (sx * 1.5, 0, 0), "MAT_Foliage_A", rgb("leaf_light", 0.05, rng), segments=8)
        for k in range(3):
            a = k * 2.0 + (0.5 if sx > 0 else 0)
            p.quad_strip([(sx * 1.5, 0, 2.2), (sx * 1.5 + math.cos(a) * 0.9, math.sin(a) * 0.9, 2.5)], [(sx * 1.5 + 0.05, 0.05, 2.2), (sx * 1.5 + math.cos(a) * 0.9 + 0.2, math.sin(a) * 0.9 + 0.2, 2.35)], "MAT_Foliage_A", rgb("leaf", 0.06, rng))
            p.quad_strip([(sx * 1.5 + 0.05, 0.05, 2.2), (sx * 1.5 + math.cos(a) * 0.9 + 0.2, math.sin(a) * 0.9 + 0.2, 2.35)], [(sx * 1.5, 0, 2.2), (sx * 1.5 + math.cos(a) * 0.9, math.sin(a) * 0.9, 2.5)], "MAT_Foliage_A", rgb("leaf", 0.06, rng))
        for r in range(3):
            for k in range(5):
                a = k * 1.25
                p.tube([(sx * 1.5 + math.cos(a) * 0.1, -0.15 + math.sin(a) * 0.1, 1.6 - r * 0.12), (sx * 1.5 + math.cos(a) * 0.18, -0.15 + math.sin(a) * 0.18, 1.7 - r * 0.12)], [0.025, 0.02], "MAT_Foliage_A", rgb("banana_fruit" if r < 2 else "leaf_light", 0.05, rng), segments=5)
    pts = [(-1.5 + 3.0 * i / 20, -0.05, 2.25 - 0.35 * math.sin(math.pi * i / 20)) for i in range(21)]
    rope_path(p, pts[::4], 0.01, rng)
    for i, q in enumerate(pts):
        p.ico(0.04, q, "MAT_Foliage_A", rgb("marigold" if i % 3 else "jasmine"), subdiv=1)
    p.to_object("PRP_Banana_Arch_A_Mesh").parent = rt
    for sx in (-1, 1):
        collider(f"Stem_{sx}", (0.3, 0.3, 2.3), (sx * 1.5, 0, 1.15), parent=rt)
    return export_asset("PRP_Banana_Arch_A", "props", rt), rt


@asset
def PRP_Brass_Lamp_Stand_A():
    """ENV_051 courtyard brass lamp stand (kuthu vilakku) with five emissive wicks."""
    rng = random.Random(9951)
    rt = root("PRP_Brass_Lamp_Stand_A")
    p = Part()
    p.lathe([(0, 0), (0.28, 0), (0.28, 0.04), (0.12, 0.1), (0.05, 0.15), (0.035, 1.1), (0.06, 1.14), (0.16, 1.18), (0.18, 1.22), (0.05, 1.24), (0.03, 1.4),
             (0.06, 1.46), (0.0, 1.55)], (0, 0, 0), "MAT_Brass_A", rgb("brass"), segments=14)
    p.to_object("PRP_Brass_Lamp_Stand_A_Mesh").parent = rt
    f = Part()
    for k in range(5):
        a = k * 2 * math.pi / 5
        f.lathe([(0, 0), (0.016, 0.015), (0.012, 0.04), (0, 0.065)], (math.cos(a) * 0.17, math.sin(a) * 0.17, 1.22), "MAT_Emissive_A", rgb("flame"), segments=8)
    f.to_object("FLAME_Stand").parent = rt
    collider("Stand", (0.6, 0.6, 1.5), (0, 0, 0.75), parent=rt)
    return export_asset("PRP_Brass_Lamp_Stand_A", "props", rt), rt
