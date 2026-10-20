"""Session 3: enterable interiors with hinged doors, world containers, pickups and tree LODs.

Conventions added here (read by src/game/world/Level.ts):
  DOOR_<name>      hinged door leaf; object origin = hinge; opens by rotating about the vertical axis
  COL_DOOR_<name>  doorway blocker, enabled only while the door is closed
  CEIL_<name>      interior ceiling (camera collision keeps the camera inside the room)
  SOCKET_*         interaction points
"""
import math
import random
import bpy
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.arch import rect_lathe, tile_roof_slope
from tom.props import plank, pot, basket, heap, sack, chest, rope_path, coil

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def door_leaf(name, width, height, rng, parent, hinge, color="teak", studs=True, opens=-1):
    """Single door leaf built relative to its hinge (hinge at x=0, leaf extends +X), placed at `hinge`."""
    p = Part()
    p.box((width, 0.07, height), (width / 2, 0, height / 2), "MAT_Wood_Teak_A", rgb(color, 0.05, rng))
    for z in (0.25, height / 2, height - 0.25):
        p.box((width - 0.06, 0.09, 0.1), (width / 2, -0.01, z), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    if studs:
        for r in range(4):
            for c in range(2):
                p.ico(0.022, (0.25 + c * (width - 0.5), -0.05, 0.45 + r * (height - 0.9) / 3), "MAT_Brass_A", rgb("brass"), subdiv=1)
    p.box((0.05, 0.04, 0.12), (width - 0.12, -0.06, height * 0.48), "MAT_Iron_A", rgb("iron"))  # latch
    obj = p.to_object(f"DOOR_{name}")
    obj.location = hinge
    obj.parent = parent
    obj["opens"] = opens  # sign of the opening rotation
    return obj


def hollow_body(p, rt, W, D, H, y0, PL, wall_c, band_c, rng, door_w=1.1, door_h=2.1, t=0.22, windows=True, prefix=""):
    """Four walls with a front door opening; returns wall colliders added under rt."""
    y1 = y0 + D
    cy = (y0 + y1) / 2
    mat = "MAT_Plaster_Lime_A"
    # back and side walls
    p.box((W, t, H), (0, y1 - t / 2, PL + H / 2), mat, rgb(wall_c, 0.02, rng))
    for sx in (-1, 1):
        p.box((t, D, H), (sx * (W / 2 - t / 2), cy, PL + H / 2), mat, rgb(wall_c, 0.02, rng))
    # front wall in three pieces around the door
    side_w = (W - door_w) / 2
    for sx in (-1, 1):
        p.box((side_w, t, H), (sx * (door_w / 2 + side_w / 2), y0 + t / 2, PL + H / 2), mat, rgb(wall_c, 0.02, rng))
    p.box((door_w, t, H - door_h), (0, y0 + t / 2, PL + door_h + (H - door_h) / 2), mat, rgb(wall_c, 0.02, rng))
    # red-oxide dado bands inside and out
    for inset, sgn in ((0.012, -1), (t + 0.012, 1)):
        for sx in (-1, 1):
            p.box((side_w, 0.02, 0.55), (sx * (door_w / 2 + side_w / 2), y0 + (t + 0.012 if sgn > 0 else -0.012), PL + 0.275), mat, rgb(band_c, 0.02, rng))
    p.box((W - 2 * t, 0.02, 0.55), (0, y1 - t - 0.012, PL + 0.275), mat, rgb(band_c, 0.02, rng))
    for sx in (-1, 1):
        p.box((0.02, D - 2 * t, 0.55), (sx * (W / 2 - t - 0.012), cy, PL + 0.275), mat, rgb(band_c, 0.02, rng))
    # door frame
    for sx in (-1, 1):
        p.box((0.12, t + 0.06, door_h + 0.1), (sx * (door_w / 2 + 0.06), y0 + t / 2, PL + (door_h + 0.1) / 2), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    p.box((door_w + 0.36, t + 0.08, 0.14), (0, y0 + t / 2, PL + door_h + 0.07), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    p.box((door_w + 0.2, t + 0.2, 0.06), (0, y0 + t / 2, PL + 0.03), "MAT_Stone_Granite_A", rgb("granite_new", 0.03, rng))
    if windows:
        for sx in (-1, 1):
            for y in (cy - D * 0.22, cy + D * 0.22):
                x = sx * (W / 2 - t / 2)
                p.box((t + 0.02, 0.7, 0.8), (x, y, PL + 1.4), mat, rgb("dark_recess"))
                for k in range(4):
                    p.box((t + 0.05, 0.03, 0.8), (x, y - 0.27 + k * 0.18, PL + 1.4), "MAT_Wood_Teak_A", rgb("teak_dark"))
    # colliders (walls only; the doorway gap is filled by the door collider)
    collider(f"{prefix}WallBack", (W, t + 0.06, H), (0, y1 - t / 2, PL + H / 2), parent=rt)
    for sx in (-1, 1):
        collider(f"{prefix}WallSide_{sx}", (t + 0.06, D, H), (sx * (W / 2 - t / 2), cy, PL + H / 2), parent=rt)
        collider(f"{prefix}WallFront_{sx}", (side_w, t + 0.06, H), (sx * (door_w / 2 + side_w / 2), y0 + t / 2, PL + H / 2), parent=rt)
    collider(f"DOOR_{prefix}Main", (door_w, t + 0.1, door_h), (0, y0 + t / 2, PL + door_h / 2), parent=rt)
    # ceiling (visual, double-sided) + camera blocker
    c = Part()
    c.box((W - 2 * t, D - 2 * t, 0.06), (0, cy, PL + H - 0.03), "MAT_Wood_Teak_A", rgb("teak", 0.04, rng))
    for k in range(int(D / 0.6)):
        c.box((W - 2 * t, 0.1, 0.12), (0, y0 + t + 0.3 + k * 0.6, PL + H - 0.1), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    c.to_object(f"CEIL_{prefix}Main").parent = rt
    collider(f"{prefix}Ceiling", (W, D, 0.35), (0, cy, PL + H + 0.17), parent=rt)
    return y1


def gable_roof(p, W, D, y_front, y_back, z_eave, z_ridge, rng, wall_c, PL, H, body_y0, body_y1):
    tile_roof_slope(p, -W / 2 - 0.45, W / 2 + 0.45, y_front, z_eave, (y_front + y_back) / 2, z_ridge, rng)
    tile_roof_slope(p, -W / 2 - 0.45, W / 2 + 0.45, y_back, z_eave, (y_front + y_back) / 2, z_ridge, rng)
    yr = (y_front + y_back) / 2
    p.tube([(-W / 2 - 0.5, yr, z_ridge + 0.06), (W / 2 + 0.5, yr, z_ridge + 0.06)], [0.12, 0.12], "MAT_Terracotta_A", rgb("terracotta", 0.03, rng), segments=8)
    for sx in (-1, 1):
        x = sx * W / 2
        zw = PL + H
        zf = z_eave + (z_ridge - z_eave) * (body_y0 - y_front) / (yr - y_front)
        zb = z_eave + (z_ridge - z_eave) * (y_back - body_y1) / (y_back - yr)
        pts = [(body_y0, zw), (body_y1, zw), (body_y1, max(zw, zb)), (yr, z_ridge - 0.02), (body_y0, max(zw, zf))]
        for order in (pts, list(reversed(pts))):  # double-sided so it reads from inside too
            f = p.bm.faces.new([p.bm.verts.new((x, yy, zz)) for yy, zz in order])
            p._finish([f], "MAT_Plaster_Lime_A", rgb(wall_c, 0.02, rng))
    for ye in (y_front, y_back):
        p.box((W + 1.0, 0.06, 0.18), (0, ye, z_eave - 0.02), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))


@asset
def ENV_House_Player_A():
    """The player's house: thinnai veranda outside, a furnished room inside, a hinged door you can open."""
    rng = random.Random(1201)
    rt = root("ENV_House_Player_A")
    p = Part()
    W, D, PL, H = 7.0, 8.0, 0.45, 3.0
    p.box((W, D, PL), (0, 0, PL / 2), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    p.box((W + 0.1, D + 0.1, 0.06), (0, 0, PL - 0.03), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
    p.box((1.6, 0.35, 0.15), (0, -D / 2 - 0.55, 0.075), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.box((1.6, 0.35, 0.30), (0, -D / 2 - 0.2, 0.15), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    for sx in (-1, 1):
        p.box((2.4, 1.6, 0.4), (sx * 2.1, -2.9, PL + 0.2), "MAT_Plaster_Lime_A", rgb("red_oxide", 0.04, rng))
        p.box((2.5, 1.7, 0.06), (sx * 2.1, -2.9, PL + 0.43), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
    body_y0 = -2.0
    body_y1 = hollow_body(p, rt, W - 0.2, D / 2 + 2.0, H, body_y0, PL, "plaster", "red_oxide", rng)
    # interior floor (polished lime-and-cow-dung floor, dark)
    p.box((W - 0.7, body_y1 - body_y0 - 0.45, 0.02), (0, (body_y0 + body_y1) / 2, PL + 0.01), "MAT_Soil_A", rgb("soil", 0.03, rng))
    # veranda posts + roof
    from assets_buildings import teak_post
    for x in (-3.2, -0.95, 0.95, 3.2):
        teak_post(p, (x, -3.75, PL), 2.75, rng)
    p.box((W + 0.2, 0.22, 0.2), (0, -3.75, PL + 2.85), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    gable_roof(p, W - 0.2, D, -D / 2 - 0.55, D / 2 + 0.55, PL + 2.9, PL + 4.9, rng, "plaster", PL, H, body_y0, body_y1)
    # ---- interior furnishing (PRP_062-085 vocabulary)
    by = body_y1 - 0.25
    # rope cot along the right wall
    cx, cy = 2.2, 1.2
    for sx in (-1, 1):
        plank(p, (0.08, 1.95, 0.08), (cx + sx * 0.45, cy, PL + 0.45), rng, "teak_dark")
        for sy in (-1, 1):
            p.lathe([(0.05, 0), (0.06, 0.1), (0.04, 0.25), (0.05, 0.5)], (cx + sx * 0.45, cy + sy * 0.95, PL), "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng), segments=8)
    for sy in (-1, 1):
        plank(p, (0.98, 0.08, 0.08), (cx, cy + sy * 0.95, PL + 0.45), rng, "teak_dark")
    for k in range(10):
        rope_path(p, [(cx - 0.42, cy - 0.9 + k * 0.2, PL + 0.47), (cx + 0.42, cy - 0.85 + k * 0.2, PL + 0.47)], 0.009, rng)
    p.box((0.85, 1.7, 0.06), (cx, cy + 0.05, PL + 0.52), "MAT_Thatch_A", rgb("thatch", 0.04, rng))
    p.ico(0.2, (cx, cy + 0.75, PL + 0.6), "MAT_Cloth_A", rgb("cloth_white", 0.04, rng), subdiv=2, scale=(1.8, 0.8, 0.45))
    # kitchen corner: hearth, pots, low shelf (back-left)
    kx, ky = -2.3, by - 0.5
    p.box((0.9, 0.6, 0.35), (kx, ky, PL + 0.175), "MAT_Terracotta_A", rgb("clay_lime", 0.05, rng))
    p.box((0.5, 0.4, 0.1), (kx, ky - 0.05, PL + 0.35), "MAT_Soil_A", rgb("dark_recess"))
    pot(p, (kx - 0.15, ky, PL + 0.35), 0.6, rng)
    pot(p, (kx + 0.25, ky + 0.05, PL + 0.35), 0.5, rng, color="brass", mat="MAT_Brass_A")
    for z in (PL + 1.1, PL + 1.6):
        plank(p, (1.4, 0.32, 0.05), (-1.6, by - 0.05, z), rng, "teak")
        for k in range(4):
            pot(p, (-2.1 + k * 0.33, by - 0.05, z + 0.03), 0.45 + (k % 2) * 0.15, rng, color="brass" if k == 2 else "terracotta", mat="MAT_Brass_A" if k == 2 else "MAT_Terracotta_A")
    # grain urn, baskets, mat, lamp niche with lamp
    pot(p, (-2.6, 1.0, PL), 1.6, rng, wide=1.2, lid=True)
    basket(p, (-2.5, 0.2, PL), 0.22, 0.18, rng)
    p.box((1.6, 0.9, 0.012), (0.0, 1.4, PL + 0.03), "MAT_Thatch_A", rgb("thatch", 0.05, rng))
    p.box((0.3, 0.05, 0.35), (0.0, by + 0.01, PL + 1.5), "MAT_Plaster_Lime_A", rgb("dark_recess"))
    p.to_object("ENV_House_Player_A_Mesh").parent = rt
    lamp = Part()
    lamp.lathe([(0, 0), (0.06, 0.0), (0.075, 0.035), (0.0, 0.02)], (0.0, by - 0.02, PL + 1.35), "MAT_Terracotta_A", rgb("terracotta"), segments=10)
    lamp.to_object("ENV_House_Player_A_Lamp").parent = rt
    flame = Part()
    flame.lathe([(0, 0), (0.014, 0.012), (0.01, 0.035), (0, 0.055)], (0.05, by - 0.02, PL + 1.38), "MAT_Emissive_A", rgb("flame"), segments=8)
    flame.to_object("FLAME_HouseNiche").parent = rt
    door_leaf("Main", 1.1, 2.1, rng, rt, (-0.55, body_y0 + 0.11, PL), color="teak", opens=1)
    collider("Plinth", (W, D, PL), (0, 0, PL / 2), kind="WALK", parent=rt)
    collider("Step1", (1.6, 0.35, 0.15), (0, -D / 2 - 0.55, 0.075), kind="WALK", parent=rt)
    collider("Step2", (1.6, 0.35, 0.30), (0, -D / 2 - 0.2, 0.15), kind="WALK", parent=rt)
    for sx in (-1, 1):
        collider(f"Thinnai_{sx}", (2.4, 1.6, PL + 0.4), (sx * 2.1, -2.9, (PL + 0.4) / 2), kind="WALK", parent=rt)
    for x in (-3.2, 3.2):
        collider(f"Post_{x}", (0.34, 0.34, 3.0), (x, -3.75, PL + 1.5), parent=rt)
    collider("Cot", (1.0, 2.0, 0.6), (cx, cy, PL + 0.3), parent=rt)
    collider("Hearth", (1.0, 0.7, 0.5), (kx, ky, PL + 0.25), parent=rt)
    collider("Shelf", (1.5, 0.4, 2.0), (-1.6, by - 0.05, PL + 1.0), parent=rt)
    collider("Urn", (0.8, 0.8, 0.9), (-2.6, 1.0, PL + 0.45), parent=rt)
    empty("SOCKET_Door", (0, body_y0 - 0.6, PL), parent=rt)
    empty("SOCKET_Bed", (cx - 0.7, cy, PL), parent=rt)
    empty("SOCKET_Inside", (0, 0.5, PL), parent=rt)
    return export_asset("ENV_House_Player_A", "buildings", rt, required=["DOOR_Main", "COL_DOOR_Main", "CEIL_Main"]), rt


@asset
def ENV_Granary_A():
    """Village granary (kalanjiyam): thick walls, high vents, one door. Owned by Selvam; watched at night."""
    rng = random.Random(1301)
    rt = root("ENV_Granary_A")
    p = Part()
    W, D, PL, H = 6.0, 5.0, 0.4, 3.2
    rect_lathe(p, [(0.1, 0), (0.1, 0.15), (0, 0.15), (0, PL)], W / 2 + 0.3, D / 2 + 0.6, (0, 0.3, 0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.box((1.4, 0.35, 0.2), (0, -D / 2 - 0.45, 0.1), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    y1 = hollow_body(p, rt, W, D, H, -D / 2, PL, "plaster_warm", "ochre", rng, door_w=1.2, windows=False)
    for k in range(4):  # high vents
        p.box((0.4, 0.26, 0.18), (-2.0 + k * 1.33, y1 - 0.1, PL + H - 0.45), "MAT_Plaster_Lime_A", rgb("dark_recess"))
    p.box((W - 0.5, D - 0.5, 0.02), (0, 0, PL + 0.01), "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng))
    gable_roof(p, W, D, -D / 2 - 0.6, D / 2 + 0.6, PL + H, PL + H + 1.6, rng, "plaster_warm", PL, H, -D / 2, y1)
    # stores inside: sacks against the back wall, bins on the sides
    for k in range(5):
        sack(p, (-2.0 + k * 1.0, 1.75, PL), 1.1, rng, color="basket")
    for k in range(3):
        sack(p, (-1.5 + k * 1.0, 1.35, PL + 0.4), 0.9, rng, color="cloth_white")
    for sx in (-1, 1):
        pot(p, (sx * 2.4, -1.4, PL), 2.0, rng, wide=1.2, lid=True)
    p.box((1.6, 0.05, 1.0), (1.8, -D / 2 + 0.24, PL + 1.6), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))  # tally board inside
    p.to_object("ENV_Granary_A_Mesh").parent = rt
    door_leaf("Main", 1.2, 2.1, rng, rt, (-0.6, -D / 2 + 0.11, PL), color="teak_dark", opens=1)
    collider("Floor", (W + 0.6, D + 1.2, PL), (0, 0.3, PL / 2), kind="WALK", parent=rt)
    collider("Step", (1.4, 0.35, 0.2), (0, -D / 2 - 0.45, 0.1), kind="WALK", parent=rt)
    collider("Sacks", (W - 0.6, 1.2, 1.0), (0, 1.6, PL + 0.5), parent=rt)
    for sx in (-1, 1):
        collider(f"Bin_{sx}", (0.9, 0.9, 1.0), (sx * 2.4, -1.4, PL + 0.5), parent=rt)
    empty("SOCKET_Door", (0, -D / 2 - 1.0, 0), parent=rt)
    return export_asset("ENV_Granary_A", "buildings", rt, required=["DOOR_Main", "COL_DOOR_Main"]), rt


@asset
def PRP_Crate_A():
    """Lidded storage crate (PRP_004) - a world container."""
    rng = random.Random(1401)
    rt = root("PRP_Crate_A")
    p = Part()
    for z in range(4):
        for sy in (-1, 1):
            plank(p, (0.8, 0.04, 0.12), (0, sy * 0.28, 0.07 + z * 0.13), rng, "teak")
        for sx in (-1, 1):
            plank(p, (0.04, 0.56, 0.12), (sx * 0.38, 0, 0.07 + z * 0.13), rng, "teak")
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.06, 0.06, 0.55), (sx * 0.38, sy * 0.28, 0.275), rng, "teak_dark")
    plank(p, (0.84, 0.62, 0.05), (0, 0, 0.56), rng, "teak_dark")
    rope_path(p, [(-0.42, -0.1, 0.4), (-0.46, 0, 0.35), (-0.42, 0.1, 0.4)], 0.012, rng)
    p.box((0.75, 0.52, 0.02), (0, 0, 0.05), "MAT_Wood_Teak_A", rgb("teak_dark"))
    p.to_object("PRP_Crate_A_Mesh").parent = rt
    collider("Crate", (0.85, 0.65, 0.6), (0, 0, 0.3), parent=rt)
    return export_asset("PRP_Crate_A", "props", rt), rt


def pickup(asset_id, build, seed):
    rng = random.Random(seed)
    rt = root(asset_id)
    p = Part()
    build(p, rng)
    p.to_object(f"{asset_id}_Mesh").parent = rt
    return export_asset(asset_id, "props", rt), rt


@asset
def PRP_Bangle_A():
    """Valli's lost brass bangle (pickup)."""
    def b(p, rng):
        p.lathe([(0.032, 0.0), (0.04, 0.004), (0.04, 0.012), (0.032, 0.016), (0.028, 0.008)], (0, 0, 0.0), "MAT_Brass_A", rgb("brass"), segments=20)
        p.ico(0.008, (0.036, 0, 0.012), "MAT_Foliage_A", rgb("hibiscus"), subdiv=1)
    return pickup("PRP_Bangle_A", b, 1501)


@asset
def PRP_Chisel_A():
    """Velan's lost chisel (pickup)."""
    def b(p, rng):
        p.box((0.16, 0.022, 0.02), (0.08, 0, 0.012), "MAT_Iron_A", rgb("iron"))
        p.box((0.05, 0.02, 0.012), (0.18, 0, 0.012), "MAT_Iron_A", rgb("iron"), taper=(0.3, 1.0))
        p.tube([(-0.1, 0, 0.016), (0.0, 0, 0.016)], [0.016, 0.014], "MAT_Wood_Teak_A", rgb("teak"), segments=8)
        p.lathe([(0.018, -0.005), (0.02, 0.0), (0.018, 0.005)], (0.0, 0, 0.016), "MAT_Brass_A", rgb("brass"), segments=8)
    return pickup("PRP_Chisel_A", b, 1601)


@asset
def PRP_Coin_Pouch_A():
    """Cloth coin pouch (pickup)."""
    def b(p, rng):
        p.ico(0.06, (0, 0, 0.05), "MAT_Cloth_A", rgb("cloth_red", 0.04, rng), subdiv=2, scale=(1, 0.9, 0.85), noise=0.05, rng=rng)
        p.lathe([(0.03, 0.0), (0.02, 0.025), (0.035, 0.045)], (0, 0, 0.09), "MAT_Cloth_A", rgb("cloth_red", 0.04, rng), segments=8)
        p.lathe([(0.024, -0.004), (0.027, 0.0), (0.024, 0.004)], (0, 0, 0.1), "MAT_Thatch_A", rgb("rope"), segments=8)
        for k in range(3):
            p.lathe([(0.0, 0), (0.014, 0.0), (0.014, 0.004), (0.0, 0.004)], (0.07 + k * 0.012, 0.02 * k, 0.0 + k * 0.004), "MAT_Brass_A", rgb("brass"), segments=10)
    return pickup("PRP_Coin_Pouch_A", b, 1701)


@asset
def PRP_Palm_Coconut_B_LOD1():
    """Distant palm: same silhouette, ~12% of the triangles."""
    rng = random.Random(3801)
    rt = root("PRP_Palm_Coconut_B_LOD1")
    p = Part()
    H = 9.0
    path = [(math.sin(i / 5 * 1.5) * 1.3, 0, i / 5 * H) for i in range(6)]
    p.tube(path, [0.25 - 0.1 * (i / 5) for i in range(6)], "MAT_Wood_Teak_A", rgb("palm_trunk", 0.04, rng), segments=5)
    top = path[-1]
    for k in range(9):
        a = k * math.tau / 9
        L = 3.6
        droop = 0.8
        rib = [(top[0] + math.cos(a) * t * L, top[1] + math.sin(a) * t * L, top[2] + math.sin(t * math.pi * 0.65) * 0.9 - t * t * droop * 2.4) for t in [i / 4 for i in range(5)]]
        for side in (-1, 1):
            outer = [(x - math.sin(a) * side * (math.sin(i / 4 * math.pi) * 0.8 + 0.1), y + math.cos(a) * side * (math.sin(i / 4 * math.pi) * 0.8 + 0.1), z - 0.4 * (i / 4)) for i, (x, y, z) in enumerate(rib)]
            col = rgb("palm", 0.06, rng)
            p.quad_strip(rib, outer, "MAT_Foliage_A", col)
            p.quad_strip(outer, rib, "MAT_Foliage_A", col)
    p.to_object("PRP_Palm_Coconut_B_LOD1_Mesh").parent = rt
    return export_asset("PRP_Palm_Coconut_B_LOD1", "environment", rt), rt


@asset
def PRP_Neem_Tree_B_LOD1():
    """Distant neem: trunk, four boughs and a few large canopy lobes."""
    rng = random.Random(4001)
    rt = root("PRP_Neem_Tree_B_LOD1")
    p = Part()
    p.tube([(0, 0, 0), (0.1, 0.05, 1.5), (0.05, 0, 2.8)], [0.42, 0.32, 0.26], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=6)
    for k in range(4):
        a = k * math.tau / 4 + 0.3
        p.tube([(0.05, 0, 2.5), (math.cos(a) * 2.2, math.sin(a) * 2.2, 4.3)], [0.14, 0.06], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=4)
        p.ico(1.5, (math.cos(a) * 2.3, math.sin(a) * 2.3, 4.6), "MAT_Foliage_A", rgb("leaf", 0.08, rng), subdiv=1, scale=(1, 1, 0.75), noise=0.2, rng=rng)
    p.ico(2.0, (0, 0, 5.6), "MAT_Foliage_A", rgb("leaf_light", 0.08, rng), subdiv=1, scale=(1, 1, 0.7), noise=0.2, rng=rng)
    p.to_object("PRP_Neem_Tree_B_LOD1_Mesh").parent = rt
    return export_asset("PRP_Neem_Tree_B_LOD1", "environment", rt), rt


@asset
def PRP_Rain_Shelter_A():
    """Thatched rain shelter on four posts - where villagers wait out the rain at the bazaar and fields."""
    from tom.props import thatch_roof, bamboo
    rng = random.Random(1801)
    rt = root("PRP_Rain_Shelter_A")
    p = Part()
    for sx in (-1, 1):
        for sy in (-1, 1):
            bamboo(p, (sx * 1.6, sy * 1.2, 0), (sx * 1.6, sy * 1.2, 2.4), 0.06, rng, "bamboo_dark")
    plank(p, (2.6, 0.4, 0.08), (0, 0.7, 0.45), rng, "teak")
    for sx in (-1, 1):
        plank(p, (0.08, 0.35, 0.45), (sx * 1.1, 0.7, 0.22), rng, "teak_dark")
    p.to_object("PRP_Rain_Shelter_A_Mesh").parent = rt
    t = Part()
    thatch_roof(t, 3.4, 2.6, 2.45, 3.3, rng, overhang=0.3)
    t.to_object("PRP_Rain_Shelter_A_Roof").parent = rt
    for sx in (-1, 1):
        for sy in (-1, 1):
            collider(f"Post_{sx}_{sy}", (0.15, 0.15, 2.4), (sx * 1.6, sy * 1.2, 1.2), parent=rt)
    collider("Bench", (2.6, 0.4, 0.5), (0, 0.7, 0.25), parent=rt)
    empty("SOCKET_Shelter", (0, 0, 0), parent=rt)
    return export_asset("PRP_Rain_Shelter_A", "props", rt), rt
