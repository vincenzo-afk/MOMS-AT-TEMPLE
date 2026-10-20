"""Category G - historical discovery objects (asserts_img/HISTORIC DISCOVERY.jpg).

Script-like carving is abstract glyph grooves, not real text (no claim to a specific inscription)."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.props import plank, rope_path, pot

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def glyph_rows(p, x0, x1, z0, z1, y, rng, rows=8, color="granite_dark", depth=0.012):
    """Rows of abstract rounded glyph strokes carved into a -Y facing surface."""
    for r in range(rows):
        z = z1 - (r + 0.5) * (z1 - z0) / rows
        x = x0
        while x < x1 - 0.04:
            g = 0.025 + rng.random() * 0.04
            kind = rng.random()
            if kind < 0.45:
                p.box((g, depth, 0.035), (x + g / 2, y - depth / 2, z), "MAT_Stone_Granite_A", rgb(color, 0.04, rng))
            elif kind < 0.8:
                p.lathe([(0.012, -depth), (0.018, 0.0)], (x + 0.015, y, z), "MAT_Stone_Granite_A", rgb(color, 0.04, rng), segments=8, rot_offset=0)
            else:
                p.box((0.01, depth, 0.05), (x + 0.005, y - depth / 2, z + 0.005), "MAT_Stone_Granite_A", rgb(color, 0.04, rng))
            x += g + 0.012


@asset
def PRP_Inscription_Slab_B():
    """DSC_001 stone inscription slab: arched top, carved border, eight lines of glyphs, a crack and moss."""
    rng = random.Random(7001)
    rt = root("PRP_Inscription_Slab_B")
    p = Part()
    W, T, H = 1.0, 0.22, 1.7
    p.box((W + 0.3, T + 0.3, 0.2), (0, 0, 0.1), "MAT_Stone_Granite_A", rgb("granite_dark", 0.05, rng))
    p.box((W, T, H - W / 2), (0, 0, 0.2 + (H - W / 2) / 2), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    a_pts, b_pts = [], []
    for i in range(11):
        a = math.pi * i / 10
        a_pts.append((math.cos(a) * W / 2, -T / 2, 0.2 + H - W / 2 + math.sin(a) * W / 2 * 0.55))
        b_pts.append((math.cos(a) * W / 2, T / 2, 0.2 + H - W / 2 + math.sin(a) * W / 2 * 0.55))
    p.quad_strip(b_pts, a_pts, "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    for pts in (a_pts, list(reversed(b_pts))):
        f = p.bm.faces.new([p.bm.verts.new(q) for q in pts])
        p._finish([f], "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    # border frame
    for x in (-W / 2 + 0.05, W / 2 - 0.05):
        p.box((0.03, 0.02, H - W / 2 - 0.15), (x, -T / 2 - 0.008, 0.2 + (H - W / 2) / 2 + 0.05), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng))
    p.box((W - 0.07, 0.02, 0.03), (0, -T / 2 - 0.008, 0.32), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng))
    glyph_rows(p, -W / 2 + 0.1, W / 2 - 0.1, 0.38, 0.2 + H - W / 2 + 0.15, -T / 2, rng, rows=9)
    p.box((0.02, 0.025, 0.7), (0.15, -T / 2 - 0.004, 0.75), "MAT_Stone_Granite_A", rgb("dark_recess"), rot_z=0.0)
    p.ico(0.12, (-0.3, -T / 2 - 0.02, 0.3), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(2.2, 0.4, 1.0), noise=0.2, rng=rng)
    p.ico(0.12, (0.4, 0.0, 0.25), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(1.4, 2.4, 0.6), noise=0.2, rng=rng)
    p.to_object("PRP_Inscription_Slab_B_Mesh").parent = rt
    collider("Slab", (W + 0.3, T + 0.3, H), (0, 0, H / 2), parent=rt)
    return export_asset("PRP_Inscription_Slab_B", "props", rt), rt


@asset
def PRP_Carved_Fragment_A():
    """DSC_002 / DSC_006 carved stone fragment: a frieze block with a lotus band and two lion-like reliefs, broken at one end."""
    rng = random.Random(7101)
    rt = root("PRP_Carved_Fragment_A")
    p = Part()
    L, T, H = 1.3, 0.45, 0.55
    p.box((L, T, H), (0, 0, H / 2), "MAT_Stone_Granite_A", rgb("sandstone", 0.05, rng))
    p.box((L, T + 0.06, 0.08), (0, 0, H - 0.04), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    p.box((L, T + 0.06, 0.08), (0, 0, 0.04), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    for k in range(9):  # lotus petal band
        x = -L / 2 + 0.07 + k * (L - 0.14) / 8
        p.ico(0.04, (x, -T / 2 - 0.03, H - 0.13), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng), subdiv=1, scale=(0.9, 0.5, 1.3))
    for sx in (-1, 1):  # stylised lion: body, head, mane
        cx = sx * 0.35
        p.ico(0.1, (cx, -T / 2 - 0.02, 0.24), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng), subdiv=1, scale=(1.4, 0.4, 0.8))
        p.ico(0.07, (cx + sx * 0.12, -T / 2 - 0.035, 0.32), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng), subdiv=1, scale=(1, 0.5, 1))
        for k in range(3):
            p.box((0.025, 0.04, 0.12), (cx - sx * 0.05 + k * 0.05 * sx, -T / 2 - 0.02, 0.13), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng))
    p.lathe([(0, 0), (0.07, 0.0), (0.07, 0.03)], (0, -T / 2 - 0.035, 0.27), "MAT_Stone_Granite_A", rgb("sandstone", 0.04, rng), segments=10)
    for k in range(6):  # broken end
        p.box((0.15, T * 0.4, 0.15), (L / 2 + 0.03, (rng.random() - 0.5) * T * 0.6, 0.1 + rng.random() * 0.3), "MAT_Stone_Granite_A", rgb("sandstone", 0.06, rng), rot_z=rng.random())
    p.ico(0.15, (-0.3, 0.1, H), "MAT_Foliage_A", rgb("moss", 0.1, rng), subdiv=1, scale=(2, 1.2, 0.3), noise=0.2, rng=rng)
    p.to_object("PRP_Carved_Fragment_A_Mesh").parent = rt
    collider("Block", (L + 0.2, T + 0.1, H), (0, 0, H / 2), parent=rt)
    return export_asset("PRP_Carved_Fragment_A", "props", rt), rt


@asset
def PRP_Manuscript_Box_A():
    """DSC_003/004/011 sealed manuscript container with a palm-leaf bundle (PICK_Manuscript) on a display stand."""
    rng = random.Random(7201)
    rt = root("PRP_Manuscript_Box_A")
    p = Part()
    plank(p, (0.9, 0.55, 0.06), (0, 0, 0.42), rng, "teak_dark")
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.07, 0.07, 0.4), (sx * 0.38, sy * 0.22, 0.2), rng, "teak_dark")
    # bamboo-tube manuscript case with wax seal and cord
    p.tube([(-0.35, 0.05, 0.53), (0.35, 0.05, 0.53)], [0.08, 0.08], "MAT_Wood_Teak_A", rgb("bamboo", 0.05, rng), segments=10)
    for x in (-0.25, 0.25):
        p.lathe([(0.085, -0.01), (0.09, 0.0), (0.085, 0.01)], (x, 0.05, 0.53), "MAT_Thatch_A", rgb("rope"), segments=10)
    p.ico(0.03, (0.36, 0.05, 0.53), "MAT_Terracotta_A", rgb("cloth_red"), subdiv=1, scale=(0.5, 1, 1))
    p.to_object("PRP_Manuscript_Box_A_Mesh").parent = rt
    m = Part()
    for k in range(9):  # palm-leaf folios between wooden covers, tied with cord
        m.box((0.42, 0.06, 0.006), (0.0, -0.17, 0.46 + k * 0.007), "MAT_Thatch_A", rgb("thatch", 0.05, rng))
    for z in (0.455, 0.53):
        m.box((0.44, 0.07, 0.012), (0.0, -0.17, z), "MAT_Wood_Teak_A", rgb("teak", 0.04, rng))
    rope_path(m, [(-0.1, -0.21, 0.55), (-0.1, -0.13, 0.55), (-0.1, -0.13, 0.44)], 0.005, rng)
    m.to_object("PICK_Manuscript").parent = rt
    collider("Stand", (0.95, 0.6, 0.6), (0, 0, 0.3), parent=rt)
    return export_asset("PRP_Manuscript_Box_A", "props", rt, required=["PICK_Manuscript"]), rt


@asset
def PRP_Marker_Stone_A():
    """DSC_007 weathered boundary marker stone, half-sunk, mossy, with faint carving."""
    rng = random.Random(7301)
    rt = root("PRP_Marker_Stone_A")
    p = Part()
    p.ico(1.0, (0, 0, 0.55), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng), subdiv=2, scale=(0.32, 0.2, 0.62), noise=0.05, rng=rng)
    glyph_rows(p, -0.18, 0.18, 0.5, 0.95, -0.19, rng, rows=5, depth=0.015)
    p.ico(0.3, (0, 0, 0.9), "MAT_Foliage_A", rgb("moss", 0.08, rng), subdiv=2, scale=(1.05, 0.7, 0.55), noise=0.15, rng=rng)
    p.ico(0.5, (0, 0, 0.0), "MAT_Soil_A", rgb("soil", 0.05, rng), subdiv=1, scale=(1.4, 1.2, 0.25), noise=0.2, rng=rng)
    for k in range(5):
        p.ico(0.06, ((rng.random() - 0.5) * 0.8, (rng.random() - 0.5) * 0.6, 0.05), "MAT_Stone_Granite_A", rgb("granite_dark", 0.06, rng), subdiv=1)
    p.to_object("PRP_Marker_Stone_A_Mesh").parent = rt
    collider("Stone", (0.7, 0.5, 1.2), (0, 0, 0.6), parent=rt)
    return export_asset("PRP_Marker_Stone_A", "props", rt), rt


@asset
def PRP_Pottery_Shards_A():
    """DSC_005 old painted pottery fragments half-buried in soil (ambient discovery dressing)."""
    rng = random.Random(7401)
    rt = root("PRP_Pottery_Shards_A")
    p = Part()
    p.ico(0.4, (0, 0, 0), "MAT_Soil_A", rgb("soil", 0.05, rng), subdiv=1, scale=(1.4, 1.1, 0.2), noise=0.2, rng=rng)
    for k in range(7):
        a = rng.random() * math.tau
        x, y = math.cos(a) * rng.random() * 0.4, math.sin(a) * rng.random() * 0.35
        p.box((0.12 + rng.random() * 0.08, 0.02, 0.1), (x, y, 0.06), "MAT_Terracotta_A", rgb("terracotta", 0.06, rng), rot_z=rng.random() * 3)
        p.box((0.1, 0.022, 0.02), (x, y, 0.08), "MAT_Terracotta_A", rgb("dark_recess"), rot_z=0)
    p.to_object("PRP_Pottery_Shards_A_Mesh").parent = rt
    return export_asset("PRP_Pottery_Shards_A", "props", rt), rt
