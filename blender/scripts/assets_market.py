"""Category D - market and trade (asserts_img/MARKET.jpg). Goods are separate props so stock can change."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.props import bamboo, plank, pot, basket, heap, sack, cloth_sheet, rope_path

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def stall_frame(p, rng, w=3.0, d=1.8, front_h=2.3, back_h=2.6):
    for sx in (-1, 1):
        for sy, h in ((-1, front_h), (1, back_h)):
            bamboo(p, (sx * w / 2, sy * d / 2, 0), (sx * w / 2, sy * d / 2, h + 0.1), 0.05, rng)
    for sy, h in ((-1, front_h), (1, back_h)):
        bamboo(p, (-w / 2 - 0.1, sy * d / 2, h), (w / 2 + 0.1, sy * d / 2, h), 0.04, rng)
    for sx in (-1, 1):
        bamboo(p, (sx * w / 2, -d / 2 - 0.1, front_h), (sx * w / 2, d / 2 + 0.1, back_h), 0.04, rng)
        rope_path(p, [(sx * w / 2 - 0.04, -d / 2, front_h + 0.05), (sx * w / 2 + 0.04, -d / 2, front_h - 0.05)], 0.012, rng)


def counter(p, rng, w=2.8, y=-0.5, h=0.85):
    """ENV_013 tiered counter: front shelf, raised back step, plank top."""
    plank(p, (w, 0.7, 0.06), (0, y, h), rng, "teak")
    plank(p, (w, 0.5, 0.06), (0, y + 0.55, h + 0.22), rng, "teak")
    for sx in (-1, 0, 1):
        for sy in (y - 0.3, y + 0.75):
            bamboo(p, (sx * (w / 2 - 0.08), sy, 0), (sx * (w / 2 - 0.08), sy, h + (0.22 if sy > y else 0)), 0.035, rng)
    for k in range(9):  # woven front skirt slats
        plank(p, (w / 9 - 0.02, 0.03, h - 0.1), (-w / 2 + (k + 0.5) * w / 9, y - 0.34, (h - 0.1) / 2), rng, "bamboo")


@asset
def ENV_Market_Stall_B():
    """ENV_013/015 bamboo stall with a sagging fabric canopy (empty counter - goods are separate props)."""
    rng = random.Random(2001)
    rt = root("ENV_Market_Stall_B")
    p = Part()
    stall_frame(p, rng)
    counter(p, rng)
    p.to_object("ENV_Market_Stall_B_Frame").parent = rt
    c = Part()
    cols = ("cloth_white", "cloth_saffron", "leaf_dry")
    cloth_sheet(c, [(-1.65, -1.05, 2.33), (1.65, -1.05, 2.33), (1.65, 1.05, 2.63), (-1.65, 1.05, 2.63)], 6, 4, 0.12, lambda i, j: cols[(i // 2) % 3], rng)
    # front valance flaps
    for k in range(6):
        x0 = -1.65 + k * 0.55
        cloth_sheet(c, [(x0, -1.06, 2.33), (x0 + 0.55, -1.06, 2.33), (x0 + 0.55, -1.06, 2.08), (x0, -1.06, 2.08)], 1, 1, -0.02, lambda i, j: cols[k % 3], rng)
    c.to_object("ENV_Market_Stall_B_Canopy").parent = rt
    collider("Counter", (2.9, 1.4, 1.1), (0, -0.25, 0.55), parent=rt)
    for sx in (-1, 1):
        collider(f"Post_{sx}", (0.15, 0.15, 2.6), (sx * 1.5, 0.9, 1.3), parent=rt)
    empty("SOCKET_Trader", (0, 0.55, 0), parent=rt)
    empty("SOCKET_Goods", (0, -0.5, 0.88), parent=rt)
    return export_asset("ENV_Market_Stall_B", "buildings", rt, required=["COL_Counter"]), rt


def tiered_display(asset_id, fills, seed, size=0.05, mat="MAT_Foliage_A"):
    """PRP_043/044 three-tier display with a basket of goods per slot. fills: list of colour lists, one per tier."""
    rng = random.Random(seed)
    rt = root(asset_id)
    p = Part()
    for t in range(3):
        z = 0.06 + t * 0.2
        y = t * 0.18  # higher tiers step back
        plank(p, (1.3, 0.3, 0.04), (0, y, z), rng, "teak")
        for k in range(3):
            x = -0.42 + k * 0.42
            basket(p, (x, y, z + 0.02), 0.16, 0.07, rng)
            heap(p, (x, y, z + 0.08), 0.13, 20, fills[t][k % len(fills[t])], rng, size=size, mat=mat, scale=(1, 1, 0.7))
    for sx in (-1, 1):
        for t in range(3):
            plank(p, (0.04, 0.04, 0.06 + t * 0.2), (sx * 0.62, t * 0.18, (0.06 + t * 0.2) / 2), rng, "teak_dark")
    p.to_object(f"{asset_id}_Mesh").parent = rt
    return export_asset(asset_id, "props", rt), rt


@asset
def PRP_Display_Flowers_A():
    return tiered_display("PRP_Display_Flowers_A", [["marigold", "jasmine", "kolam_pink"], ["marigold_yellow", "hibiscus", "jasmine"], ["marigold", "kolam_pink", "marigold_yellow"]], 2101, size=0.032)


@asset
def PRP_Display_Produce_A():
    return tiered_display("PRP_Display_Produce_A", [["mango", "banana_fruit", "leaf_light"], ["vegetable_purple", "marigold", "leaf"], ["coconut", "mango", "hibiscus"]], 2201, size=0.045)


@asset
def PRP_Grain_Sacks_A():
    """PRP_045 open grain sacks with scoops."""
    rng = random.Random(2301)
    rt = root("PRP_Grain_Sacks_A")
    p = Part()
    for (x, y, s, fill) in ((-0.35, 0, 1.0, "grain"), (0.12, 0.1, 1.1, "soil_dry"), (0.5, -0.15, 0.9, "kolam_white"), (-0.05, -0.4, 0.8, "terracotta")):
        sack(p, (x, y, 0), s, rng, color="basket", open_top=True, fill=fill)
    p.tube([(0.12, 0.1, 0.5), (0.2, 0.05, 0.62)], [0.012, 0.012], "MAT_Wood_Teak_A", rgb("teak"), segments=5)
    p.lathe([(0, 0), (0.05, 0.0), (0.06, 0.04), (0, 0.03)], (0.12, 0.1, 0.46), "MAT_Wood_Teak_A", rgb("teak"), segments=8)
    heap(p, (0.25, -0.5, 0), 0.12, 20, "grain", rng, size=0.02)
    p.to_object("PRP_Grain_Sacks_A_Mesh").parent = rt
    collider("Sacks", (1.3, 1.0, 0.5), (0.05, -0.1, 0.25), parent=rt)
    return export_asset("PRP_Grain_Sacks_A", "props", rt), rt


@asset
def PRP_Pottery_Display_A():
    """PRP_047 pots and bowls laid out on a woven mat."""
    rng = random.Random(2401)
    rt = root("PRP_Pottery_Display_A")
    p = Part()
    p.box((1.6, 1.0, 0.012), (0, 0, 0.006), "MAT_Thatch_A", rgb("thatch", 0.04, rng))
    for k, (x, y, s) in enumerate(((-0.55, 0.25, 1.1), (-0.1, 0.3, 1.4), (0.4, 0.25, 0.9), (-0.4, -0.2, 0.7), (0.1, -0.15, 0.8), (0.55, -0.25, 0.6))):
        pot(p, (x, y, 0.012), s * 0.8, rng, lid=k == 1)
    for x in (-0.65, 0.65):
        p.lathe([(0, 0), (0.12, 0.0), (0.16, 0.08), (0.15, 0.09), (0.0, 0.03)], (x, -0.4, 0.012), "MAT_Terracotta_A", rgb("terracotta", 0.06, rng), segments=12)
    p.to_object("PRP_Pottery_Display_A_Mesh").parent = rt
    return export_asset("PRP_Pottery_Display_A", "props", rt), rt


@asset
def PRP_Cloth_Rolls_A():
    """PRP_048 folded cloth stacks and fabric rolls on a low bench."""
    rng = random.Random(2501)
    rt = root("PRP_Cloth_Rolls_A")
    p = Part()
    plank(p, (1.4, 0.6, 0.05), (0, 0, 0.3), rng, "teak")
    for sx in (-1, 1):
        plank(p, (0.06, 0.5, 0.3), (sx * 0.62, 0, 0.15), rng, "teak_dark")
    cols = ["cloth_indigo", "cloth_red", "cloth_saffron", "cloth_green", "kolam_pink", "cloth_white"]
    for s_ in range(2):
        for k in range(5):
            p.box((0.36, 0.3, 0.05), (-0.42 + s_ * 0.36, -0.05, 0.35 + k * 0.05), "MAT_Cloth_A", rgb(cols[(k + s_ * 2) % 6], 0.04, rng), rot_z=(rng.random() - 0.5) * 0.08)
    for k in range(4):
        p.tube([(0.2 + k * 0.12, -0.25, 0.4), (0.2 + k * 0.12, 0.25, 0.4)], [0.06, 0.06], "MAT_Cloth_A", rgb(cols[k + 1], 0.04, rng), segments=10)
    p.to_object("PRP_Cloth_Rolls_A_Mesh").parent = rt
    collider("Bench", (1.4, 0.6, 0.6), (0, 0, 0.3), parent=rt)
    return export_asset("PRP_Cloth_Rolls_A", "props", rt), rt


@asset
def PRP_Tally_Board_A():
    """PRP_049 trade ledger and tally board with chalk marks; PRP_050 coin bowl."""
    rng = random.Random(2601)
    rt = root("PRP_Tally_Board_A")
    p = Part()
    plank(p, (0.6, 0.05, 0.45), (0, 0.1, 0.35), rng, "teak_dark")
    p.box((0.5, 0.06, 0.36), (0, 0.09, 0.35), "MAT_Stone_Granite_A", rgb("dark_recess"))
    for r in range(5):
        for k in range(3 + r % 3):
            p.box((0.008, 0.07, 0.05), (-0.2 + k * 0.03 + r * 0.0, 0.08, 0.48 - r * 0.06), "MAT_Plaster_Lime_A", rgb("kolam_white"))
    plank(p, (0.08, 0.3, 0.02), (0, 0.0, 0.12), rng, "teak", rot_z=0)
    p.box((0.32, 0.22, 0.03), (-0.25, -0.15, 0.015), "MAT_Thatch_A", rgb("thatch", 0.04, rng), rot_z=0.2)  # palm-leaf ledger
    p.lathe([(0, 0), (0.09, 0.0), (0.11, 0.04), (0.0, 0.02)], (0.25, -0.15, 0.0), "MAT_Brass_A", rgb("brass"), segments=12)
    heap(p, (0.25, -0.15, 0.02), 0.07, 10, "brass", rng, size=0.018, scale=(1, 1, 0.3), mat="MAT_Brass_A")
    p.to_object("PRP_Tally_Board_A_Mesh").parent = rt
    return export_asset("PRP_Tally_Board_A", "props", rt), rt


@asset
def PRP_Balance_Scale_A():
    """PRP_051 hand balance with brass pans, weights and spice bowls on a cloth."""
    rng = random.Random(2701)
    rt = root("PRP_Balance_Scale_A")
    p = Part()
    p.box((0.9, 0.6, 0.01), (0, 0, 0.005), "MAT_Cloth_A", rgb("cloth_red", 0.04, rng))
    p.box((0.12, 0.12, 0.04), (0, 0.1, 0.03), "MAT_Wood_Teak_A", rgb("teak_dark"))
    p.tube([(0, 0.1, 0.05), (0, 0.1, 0.45)], [0.012, 0.012], "MAT_Brass_A", rgb("brass"), segments=6)
    p.tube([(-0.25, 0.1, 0.44), (0.25, 0.1, 0.44)], [0.008, 0.008], "MAT_Brass_A", rgb("brass"), segments=6)
    for sx in (-1, 1):
        for k in range(3):
            a = k * 2.09
            p.tube([(sx * 0.25, 0.1, 0.44), (sx * 0.25 + math.cos(a) * 0.08, 0.1 + math.sin(a) * 0.08, 0.2)], [0.003, 0.003], "MAT_Brass_A", rgb("brass"), segments=4)
        p.lathe([(0, 0), (0.09, 0.02), (0.1, 0.04)], (sx * 0.25, 0.1, 0.18), "MAT_Brass_A", rgb("brass"), segments=12)
    for k, c in enumerate(("marigold", "hibiscus", "grain", "leaf")):
        x = -0.3 + k * 0.2
        p.lathe([(0, 0), (0.06, 0.0), (0.075, 0.04), (0, 0.02)], (x, -0.18, 0.01), "MAT_Terracotta_A", rgb("terracotta", 0.05, rng), segments=10)
        heap(p, (x, -0.18, 0.04), 0.05, 6, c, rng, size=0.02, scale=(1, 1, 0.5))
    p.to_object("PRP_Balance_Scale_A_Mesh").parent = rt
    return export_asset("PRP_Balance_Scale_A", "props", rt), rt


@asset
def PRP_Shelf_Bamboo_A():
    """PRP_042 three-level bamboo storage shelf, stocked with baskets and pots."""
    rng = random.Random(2801)
    rt = root("PRP_Shelf_Bamboo_A")
    p = Part()
    for sx in (-1, 1):
        for sy in (-1, 1):
            bamboo(p, (sx * 0.6, sy * 0.22, 0), (sx * 0.6, sy * 0.22, 1.5), 0.03, rng)
    for z in (0.1, 0.6, 1.1):
        for k in range(6):
            bamboo(p, (-0.62, -0.2 + k * 0.08, z), (0.62, -0.2 + k * 0.08, z), 0.02, rng)
    basket(p, (-0.3, 0, 0.12), 0.18, 0.18, rng)
    pot(p, (0.3, 0, 0.12), 0.8, rng)
    basket(p, (0.0, 0, 0.62), 0.2, 0.14, rng, handle=True)
    heap(p, (0.0, 0, 0.72), 0.16, 12, "coconut", rng, size=0.06)
    pot(p, (-0.35, 0, 1.12), 0.6, rng, color="brass", mat="MAT_Brass_A")
    pot(p, (0.25, 0, 1.12), 0.7, rng)
    p.to_object("PRP_Shelf_Bamboo_A_Mesh").parent = rt
    collider("Shelf", (1.3, 0.5, 1.5), (0, 0, 0.75), parent=rt)
    return export_asset("PRP_Shelf_Bamboo_A", "props", rt), rt


@asset
def PRP_Goods_Packed_A():
    """PRP_052 goods packed for delivery: bundles, crates and sacks on a hand cart."""
    rng = random.Random(2901)
    rt = root("PRP_Goods_Packed_A")
    p = Part()
    plank(p, (1.6, 0.9, 0.06), (0, 0, 0.45), rng, "teak")
    for sx in (-1, 1):
        p.lathe([(0, -0.04), (0.38, -0.04), (0.38, 0.04), (0, 0.04)], (0.35, sx * 0.5, 0.38), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng), segments=14)
    bamboo(p, (-0.8, -0.3, 0.45), (-1.6, -0.3, 0.2), 0.035, rng)
    bamboo(p, (-0.8, 0.3, 0.45), (-1.6, 0.3, 0.2), 0.035, rng)
    for k, (x, y, z) in enumerate(((-0.4, -0.2, 0.48), (0.1, -0.2, 0.48), (-0.15, 0.2, 0.48), (-0.15, -0.05, 0.85))):
        p.box((0.45, 0.4, 0.35), (x, y, z + 0.175), "MAT_Wood_Teak_A", rgb(("teak", "bamboo", "teak_dark", "soil_dry")[k], 0.06, rng))
        rope_path(p, [(x - 0.23, y, z + 0.36), (x + 0.23, y, z + 0.36)], 0.012, rng)
    sack(p, (0.5, 0.15, 0.48), 0.9, rng, color="basket")
    p.box((0.4, 0.35, 0.2), (0.55, -0.25, 0.58), "MAT_Cloth_A", rgb("cloth_red", 0.05, rng))
    p.to_object("PRP_Goods_Packed_A_Mesh").parent = rt
    collider("Cart", (2.5, 1.2, 1.2), (-0.3, 0, 0.6), parent=rt)
    return export_asset("PRP_Goods_Packed_A", "props", rt), rt
