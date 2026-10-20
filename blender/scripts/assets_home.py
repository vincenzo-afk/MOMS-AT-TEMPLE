"""Categories I and A - player home furniture and storage (asserts_img/EVERYDAY FURNITURE.jpg, STORAGE.jpg).

Home decorations are separate assets so the player can place them in decor slots at their house."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.props import plank, rope_path, pot, basket, heap, sack, chest, chest_lid, kolam, bamboo

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


@asset
def PRP_Storage_Chest_A():
    """PRP_002 wooden storage chest with iron bands (the player's storage container)."""
    rng = random.Random(8001)
    rt = root("PRP_Storage_Chest_A")
    p = Part()
    chest(p, (0, 0, 0.06), (0.9, 0.55, 0.45), rng, open_lid=True)  # body only: the lid is its own hinged node
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.08, 0.08, 0.06), (sx * 0.4, sy * 0.24, 0.03), rng, "teak_dark")
    p.to_object("PRP_Storage_Chest_A_Mesh").parent = rt
    lid = Part()
    chest_lid(lid, (0.9, 0.55, 0.45), rng)
    lo = lid.to_object("LID_Chest")
    lo.location = (0, 0.275, 0.51)  # the hinge: back top edge
    lo.parent = rt
    collider("Chest", (0.95, 0.6, 0.7), (0, 0, 0.35), parent=rt)
    return export_asset("PRP_Storage_Chest_A", "props", rt), rt


@asset
def PRP_Cot_A():
    """PRP_065 rope-strung sleeping platform (kattil) with turned legs."""
    rng = random.Random(8101)
    rt = root("PRP_Cot_A")
    p = Part()
    L, W, H = 1.95, 0.95, 0.45
    for sx in (-1, 1):
        plank(p, (L, 0.08, 0.08), (0, sx * W / 2, H), rng, "teak_dark")
        plank(p, (0.08, W, 0.08), (sx * L / 2, 0, H), rng, "teak_dark")
        for sy in (-1, 1):
            p.lathe([(0.05, 0), (0.06, 0.1), (0.04, 0.2), (0.065, 0.3), (0.05, H + 0.05), (0.0, H + 0.06)], (sx * L / 2, sy * W / 2, 0), "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng), segments=8)
    for k in range(12):  # woven rope lattice
        t = -L / 2 + 0.08 + k * (L - 0.16) / 11
        rope_path(p, [(t, -W / 2 + 0.04, H + 0.02), (t + 0.15, W / 2 - 0.04, H + 0.02)], 0.01, rng)
    for k in range(7):
        t = -W / 2 + 0.06 + k * (W - 0.12) / 6
        rope_path(p, [(-L / 2 + 0.04, t, H + 0.025), (L / 2 - 0.04, t - 0.05, H + 0.025)], 0.01, rng)
    p.to_object("PRP_Cot_A_Mesh").parent = rt
    collider("Cot", (L + 0.1, W + 0.1, 0.55), (0, 0, 0.27), parent=rt)
    return export_asset("PRP_Cot_A", "props", rt), rt


@asset
def PRP_Woven_Mat_A():
    """PRP_064 woven sleeping mat laid out with one end rolled (decoration)."""
    rng = random.Random(8201)
    rt = root("PRP_Woven_Mat_A")
    p = Part()
    L, W = 1.6, 0.9
    for k in range(10):
        p.box((L / 10 - 0.004, W, 0.012), (-L / 2 + (k + 0.5) * L / 10, 0, 0.006), "MAT_Thatch_A", rgb("thatch" if k % 2 else "basket", 0.04, rng))
    p.box((L, 0.06, 0.013), (0, W / 2 - 0.1, 0.007), "MAT_Cloth_A", rgb("cloth_red", 0.03, rng))
    p.box((L, 0.06, 0.013), (0, -W / 2 + 0.1, 0.007), "MAT_Cloth_A", rgb("cloth_red", 0.03, rng))
    p.tube([(L / 2, -W / 2, 0.07), (L / 2, W / 2, 0.07)], [0.07, 0.07], "MAT_Thatch_A", rgb("thatch", 0.04, rng), segments=10)
    p.to_object("PRP_Woven_Mat_A_Mesh").parent = rt
    return export_asset("PRP_Woven_Mat_A", "props", rt), rt


@asset
def PRP_Oil_Lamp_A():
    """PRP_081 clay oil lamp (agal vilakku) on a small brass stand, with an emissive flame."""
    rng = random.Random(8301)
    rt = root("PRP_Oil_Lamp_A")
    p = Part()
    p.lathe([(0, 0), (0.12, 0), (0.12, 0.02), (0.03, 0.05), (0.02, 0.35), (0.06, 0.38), (0.07, 0.4), (0, 0.4)], (0, 0, 0), "MAT_Brass_A", rgb("brass"), segments=12)
    p.lathe([(0, 0), (0.07, 0.0), (0.085, 0.04), (0.07, 0.05), (0.0, 0.02)], (0, 0, 0.4), "MAT_Terracotta_A", rgb("terracotta", 0.04, rng), segments=12)
    p.box((0.04, 0.03, 0.02), (0.08, 0, 0.44), "MAT_Terracotta_A", rgb("terracotta"))
    p.to_object("PRP_Oil_Lamp_A_Mesh").parent = rt
    f = Part()
    f.lathe([(0, 0), (0.016, 0.015), (0.012, 0.04), (0, 0.065)], (0.09, 0, 0.445), "MAT_Emissive_A", rgb("flame"), segments=8)
    f.to_object("FLAME_Lamp").parent = rt
    return export_asset("PRP_Oil_Lamp_A", "props", rt), rt


@asset
def PRP_Kolam_A():
    """PRP_084 floor kolam drawn in rice flour at the doorway (decoration)."""
    rng = random.Random(8401)
    rt = root("PRP_Kolam_A")
    p = Part()
    kolam(p, (0, 0, 0), 0.6, rng)
    p.to_object("PRP_Kolam_A_Mesh").parent = rt
    return export_asset("PRP_Kolam_A", "props", rt), rt


@asset
def PRP_Kolam_Large_A():
    """Large festival kolam for the courtyard."""
    rng = random.Random(8402)
    rt = root("PRP_Kolam_Large_A")
    p = Part()
    kolam(p, (0, 0, 0), 1.8, rng, palette=("kolam_white", "marigold", "kolam_pink", "kolam_green"))
    for k in range(12):
        a = k * math.pi / 6
        p.ico(0.05, (math.cos(a) * 2.0, math.sin(a) * 2.0, 0.03), "MAT_Foliage_A", rgb("marigold" if k % 2 else "jasmine"), subdiv=1, scale=(1, 1, 0.5))
    p.to_object("PRP_Kolam_Large_A_Mesh").parent = rt
    return export_asset("PRP_Kolam_Large_A", "props", rt), rt


@asset
def PRP_Thoranam_A():
    """PRP_084 doorway thoranam: mango leaves and marigolds on a cord (decoration), 1.6 m wide."""
    rng = random.Random(8501)
    rt = root("PRP_Thoranam_A")
    p = Part()
    span = 1.6
    pts = [(-span / 2 + span * i / 30, 0, -0.08 * math.sin(math.pi * i / 30)) for i in range(31)]
    rope_path(p, pts[::3], 0.008, rng)
    for i in range(0, 31, 2):
        x, y, z = pts[i]
        p.ico(0.03, (x, y, z), "MAT_Foliage_A", rgb("marigold" if i % 4 else "marigold_yellow"), subdiv=1)
        # mango leaf hanging below
        p.box((0.05, 0.008, 0.18), (x, y, z - 0.11), "MAT_Foliage_A", rgb("mango_leaf", 0.08, rng), taper=(0.4, 1.0))
    p.to_object("PRP_Thoranam_A_Mesh").parent = rt
    return export_asset("PRP_Thoranam_A", "props", rt), rt


@asset
def PRP_Household_Set_A():
    """PRP_066-077 everyday household set: stool, low table, cooking pots, brass tumblers, broom, cloth bundle, water pot on stand."""
    rng = random.Random(8601)
    rt = root("PRP_Household_Set_A")
    p = Part()
    p.lathe([(0.18, 0), (0.18, 0.04)], (-0.9, 0.0, 0.3), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), segments=12)
    for k in range(3):
        a = k * 2.09
        plank(p, (0.04, 0.04, 0.32), (-0.9 + math.cos(a) * 0.12, math.sin(a) * 0.12, 0.15), rng, "teak_dark")
    plank(p, (0.8, 0.5, 0.05), (0.0, 0.0, 0.3), rng, "teak")
    for sx in (-1, 1):
        for sy in (-1, 1):
            plank(p, (0.06, 0.06, 0.28), (sx * 0.35, sy * 0.2, 0.14), rng, "teak_dark")
    pot(p, (-0.15, 0.05, 0.33), 0.6, rng)
    for k in range(3):
        p.lathe([(0, 0), (0.035, 0), (0.045, 0.09), (0.0, 0.09)], (0.15 + k * 0.08, -0.1, 0.33), "MAT_Brass_A", rgb("brass"), segments=10)
    p.lathe([(0, 0), (0.12, 0.0), (0.13, 0.015), (0.0, 0.01)], (0.2, 0.12, 0.33), "MAT_Brass_A", rgb("brass"), segments=12)
    pot(p, (0.8, 0.3, 0.0), 1.0, rng, lid=True)
    pot(p, (0.75, -0.2, 0.0), 0.7, rng, color="brass", mat="MAT_Brass_A")
    p.tube([(1.2, 0.3, 0.0), (1.25, 0.3, 1.0)], [0.015, 0.015], "MAT_Wood_Teak_A", rgb("bamboo"), segments=5)
    p.lathe([(0.0, 0.0), (0.13, 0.0), (0.035, 0.4), (0.02, 0.45)], (1.2, 0.3, 0.0), "MAT_Thatch_A", rgb("thatch", 0.05, rng), segments=10)
    for k in range(3):
        p.box((0.35, 0.28, 0.07), (-0.5, 0.45, 0.035 + k * 0.07), "MAT_Cloth_A", rgb(("cloth_indigo", "cloth_red", "cloth_white")[k], 0.04, rng), rot_z=(rng.random() - 0.5) * 0.15)
    p.to_object("PRP_Household_Set_A_Mesh").parent = rt
    collider("Group", (2.4, 1.1, 0.5), (0.15, 0.15, 0.25), parent=rt)
    return export_asset("PRP_Household_Set_A", "props", rt), rt


@asset
def PRP_Laundry_Line_A():
    """PRP_078 laundry line between two bamboo poles with drying cloths."""
    rng = random.Random(8701)
    rt = root("PRP_Laundry_Line_A")
    p = Part()
    for sx in (-1, 1):
        bamboo(p, (sx * 1.6, 0, 0), (sx * 1.6, 0, 1.9), 0.035, rng)
    pts = [(-1.6 + 3.2 * i / 12, 0, 1.8 - 0.12 * math.sin(math.pi * i / 12)) for i in range(13)]
    rope_path(p, pts, 0.006, rng)
    cols = ["cloth_green", "kolam_pink", "cloth_indigo", "marigold_yellow", "cloth_white"]
    for k in range(5):
        i = 2 + k * 2
        x, y, z = pts[i]
        p.quad_strip([(x - 0.18, 0, z), (x + 0.18, 0, z)], [(x - 0.17, 0.02, z - 0.55 - k % 2 * 0.15), (x + 0.17, 0.02, z - 0.6 - k % 2 * 0.15)], "MAT_Cloth_A", rgb(cols[k], 0.04, rng))
        p.quad_strip([(x - 0.17, 0.02, z - 0.55 - k % 2 * 0.15), (x + 0.17, 0.02, z - 0.6 - k % 2 * 0.15)], [(x - 0.18, 0, z), (x + 0.18, 0, z)], "MAT_Cloth_A", rgb(cols[k], 0.04, rng))
    p.to_object("PRP_Laundry_Line_A_Mesh").parent = rt
    for sx in (-1, 1):
        collider(f"Pole_{sx}", (0.15, 0.15, 1.9), (sx * 1.6, 0, 0.95), parent=rt)
    return export_asset("PRP_Laundry_Line_A", "props", rt), rt


@asset
def PRP_Storage_Set_A():
    """PRP_001-011 storage set: baskets, flower basket, crate, sacks, cloth bundle, glazed jar, lidded pots, urn."""
    rng = random.Random(8801)
    rt = root("PRP_Storage_Set_A")
    p = Part()
    basket(p, (-1.0, 0.2, 0), 0.3, 0.3, rng)
    basket(p, (-0.4, 0.3, 0), 0.24, 0.18, rng, handle=True, rim_color="cloth_red")
    # wooden crate with slats and rope handle
    for k in range(4):
        plank(p, (0.6, 0.04, 0.08), (0.2, 0.25, 0.06 + k * 0.1), rng, "teak_dark")
        plank(p, (0.6, 0.04, 0.08), (0.2, -0.15, 0.06 + k * 0.1), rng, "teak_dark")
        plank(p, (0.04, 0.4, 0.08), (-0.08, 0.05, 0.06 + k * 0.1), rng, "teak_dark")
        plank(p, (0.04, 0.4, 0.08), (0.48, 0.05, 0.06 + k * 0.1), rng, "teak_dark")
    sack(p, (0.9, 0.2, 0), 1.0, rng, color="basket")
    p.ico(0.2, (1.3, -0.1, 0.18), "MAT_Cloth_A", rgb("cloth_white", 0.05, rng), subdiv=2, scale=(1, 0.9, 0.9), noise=0.08, rng=rng)
    p.ico(0.07, (1.3, -0.1, 0.38), "MAT_Cloth_A", rgb("cloth_white", 0.05, rng), subdiv=1, scale=(1.4, 0.6, 0.8))
    p.lathe([(0, 0), (0.14, 0), (0.2, 0.1), (0.21, 0.22), (0.15, 0.32), (0.1, 0.35), (0.0, 0.36)], (-0.7, -0.4, 0), "MAT_Terracotta_A", rgb("plaster", 0.04, rng), segments=14)
    p.lathe([(0.2, 0.2), (0.15, 0.32), (0.1, 0.35), (0.0, 0.37)], (-0.7, -0.4, 0.005), "MAT_Brass_A", rgb("brass", 0.04, rng), segments=14)
    pot(p, (-0.1, -0.45, 0), 1.0, rng, color="terracotta", lid=True, wide=1.2)
    pot(p, (0.65, -0.5, 0), 1.6, rng, wide=1.1)
    p.to_object("PRP_Storage_Set_A_Mesh").parent = rt
    collider("Group", (2.7, 1.2, 0.7), (0.15, -0.05, 0.35), parent=rt)
    return export_asset("PRP_Storage_Set_A", "props", rt), rt


@asset
def PRP_Bench_Wood_A():
    """PRP_067 plain wooden bench (seat height 0.45 m) - NPCs and the player can sit."""
    rng = random.Random(8901)
    rt = root("PRP_Bench_Wood_A")
    p = Part()
    plank(p, (1.6, 0.4, 0.07), (0, 0, 0.42), rng, "teak")
    for sx in (-1, 1):
        plank(p, (0.08, 0.32, 0.4), (sx * 0.65, 0, 0.2), rng, "teak_dark")
    plank(p, (1.2, 0.05, 0.06), (0, 0, 0.18), rng, "teak_dark")
    p.to_object("PRP_Bench_Wood_A_Mesh").parent = rt
    collider("Bench", (1.6, 0.42, 0.45), (0, 0, 0.22), parent=rt)
    empty("SOCKET_Seat", (0, -0.05, 0.0), parent=rt)
    return export_asset("PRP_Bench_Wood_A", "props", rt), rt


@asset
def PRP_Bench_Back_A():
    """Teak courtyard bench with a slatted backrest and armrests (seat 0.45 m, depth 0.45 m, back to 0.95 m)."""
    rng = random.Random(8911)
    rt = root("PRP_Bench_Back_A")
    p = Part()
    # seat boards (front is -Y), back legs run up into the backrest posts
    for k in range(3):
        plank(p, (1.5, 0.14, 0.045), (0, -0.15 + k * 0.15, 0.43), rng, "teak")
    for sx in (-1, 1):
        plank(p, (0.07, 0.07, 0.43), (sx * 0.7, -0.19, 0.215), rng, "teak_dark")  # front legs
        plank(p, (0.07, 0.07, 0.95), (sx * 0.7, 0.2, 0.475), rng, "teak_dark")  # back posts
        plank(p, (0.07, 0.45, 0.05), (sx * 0.7, 0.0, 0.66), rng, "teak")  # armrest
        plank(p, (0.05, 0.05, 0.22), (sx * 0.7, -0.19, 0.54), rng, "teak_dark")  # armrest support
    for k in range(4):  # backrest slats, leaning back slightly
        plank(p, (1.34, 0.03, 0.08), (0, 0.205 + k * 0.012, 0.56 + k * 0.11), rng, "teak")
    plank(p, (1.45, 0.06, 0.07), (0, 0.25, 0.95), rng, "teak_dark")  # top rail
    plank(p, (1.3, 0.05, 0.06), (0, 0.0, 0.12), rng, "teak_dark")  # stretcher
    p.to_object("PRP_Bench_Back_A_Mesh").parent = rt
    collider("Seat", (1.5, 0.45, 0.45), (0, 0.0, 0.225), parent=rt)
    collider("Backrest", (1.5, 0.12, 0.5), (0, 0.24, 0.72), parent=rt)
    for sx in (-1, 1):
        collider(f"Arm{'L' if sx > 0 else 'R'}", (0.08, 0.45, 0.24), (sx * 0.7, 0.0, 0.57), parent=rt)
    empty("SOCKET_Seat", (0, -0.1, 0.45), parent=rt)
    return export_asset("PRP_Bench_Back_A", "props", rt, required=["COL_Seat", "COL_Backrest"]), rt
