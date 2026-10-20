"""Buildings: village houses, artisan workshop, market stall, stepped tank."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.arch import rect_lathe, pillar, tile_roof_slope, kalasha

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def teak_post(p, loc, height, rng, r=0.11):
    x, y, z = loc
    p.box((0.32, 0.32, 0.18), (x, y, z + 0.09), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.lathe([(r * 1.3, 0), (r, 0.12), (r * 0.9, height - 0.5), (r * 1.25, height - 0.38), (r * 1.25, height - 0.3), (r * 0.9, height - 0.22), (r * 0.9, height - 0.18)],
            (x, y, z + 0.18), "MAT_Wood_Teak_A", rgb("teak", 0.06, rng), segments=8)
    p.box((0.42, 0.24, 0.14), (x, y, z + height - 0.07), "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng))


def window(p, x, y, z, w, h, rng, frame="teak", facing_y=-1):
    """Wooden window with vertical bars set into a wall face that faces -Y (facing_y=-1)."""
    fy = y + facing_y * 0.02
    p.box((w, 0.06, h), (x, fy, z + h / 2), "MAT_Plaster_Lime_A", rgb("dark_recess"))
    p.box((w + 0.16, 0.1, 0.1), (x, fy + facing_y * 0.03, z - 0.05), "MAT_Wood_Teak_A", rgb(frame, 0.05, rng))
    p.box((w + 0.16, 0.1, 0.1), (x, fy + facing_y * 0.03, z + h + 0.05), "MAT_Wood_Teak_A", rgb(frame, 0.05, rng))
    for sx in (-1, 1):
        p.box((0.08, 0.1, h), (x + sx * (w / 2 + 0.04), fy + facing_y * 0.03, z + h / 2), "MAT_Wood_Teak_A", rgb(frame, 0.05, rng))
    n = int(w / 0.14)
    for i in range(1, n):
        p.box((0.03, 0.03, h), (x - w / 2 + w * i / n, fy + facing_y * 0.04, z + h / 2), "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng))


def house(asset_id, seed, wall_color, band_color, door_color):
    rng = random.Random(seed)
    rt = root(asset_id)
    p = Part()
    W, D = 7.0, 8.0
    PL = 0.45  # plinth
    p.box((W, D, PL), (0, 0, PL / 2), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    p.box((W + 0.1, D + 0.1, 0.06), (0, 0, PL - 0.03), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
    # entry steps
    p.box((1.6, 0.35, 0.15), (0, -D / 2 - 0.55, 0.075), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.box((1.6, 0.35, 0.30), (0, -D / 2 - 0.2, 0.15), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    # thinnai: raised veranda benches flanking the entry
    for sx in (-1, 1):
        cx = sx * 2.1
        p.box((2.4, 1.6, 0.4), (cx, -2.9, PL + 0.2), "MAT_Plaster_Lime_A", rgb(band_color, 0.04, rng))
        p.box((2.5, 1.7, 0.06), (cx, -2.9, PL + 0.43), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
    # main block walls
    body_y0, body_y1, H = -2.0, D / 2, 3.0
    by = (body_y0 + body_y1) / 2
    p.box((W - 0.2, body_y1 - body_y0, H), (0, by, PL + H / 2), "MAT_Plaster_Lime_A", rgb(wall_color, 0.02, rng))
    rect_lathe(p, [(0.02, 0), (0.02, 0.6)], (W - 0.2) / 2, (body_y1 - body_y0) / 2, (0, by, PL), "MAT_Plaster_Lime_A", rgb(band_color, 0.02, rng))
    rect_lathe(p, [(0.03, 0), (0.08, 0.08), (0.03, 0.16)], (W - 0.2) / 2, (body_y1 - body_y0) / 2, (0, by, PL + H - 0.16), "MAT_Plaster_Lime_A", rgb(wall_color, 0.02, rng))
    # front door: teak frame, threshold, closed double leaf with studs
    fy = body_y0 - 0.02
    p.box((1.5, 0.16, 2.4), (0, fy - 0.04, PL + 1.2), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    p.box((1.1, 0.12, 2.1), (0, fy - 0.08, PL + 1.05), "MAT_Wood_Teak_A", rgb(door_color, 0.05, rng))
    p.box((0.02, 0.13, 2.1), (0, fy - 0.09, PL + 1.05), "MAT_Wood_Teak_A", rgb("teak_dark"))
    p.box((1.5, 0.3, 0.1), (0, fy - 0.1, PL + 0.05), "MAT_Stone_Granite_A", rgb("granite_new", 0.03, rng))
    for row in range(4):
        for sx in (-1, 1):
            p.ico(0.03, (sx * 0.28, fy - 0.15, PL + 0.4 + row * 0.5), "MAT_Brass_A", rgb("brass"), subdiv=1)
    # small lamp niche beside the door
    p.box((0.25, 0.05, 0.3), (0.95, fy - 0.01, PL + 1.6), "MAT_Plaster_Lime_A", rgb("dark_recess"))
    for sx in (-1, 1):
        window(p, sx * 2.3, body_y0, PL + 1.1, 0.8, 1.0, rng)
        window(p, sx * 1.6, body_y1, PL + 1.1, 0.8, 1.0, rng, facing_y=1)
    # side windows (rotate by building them on the X faces with thin boxes)
    for sx in (-1, 1):
        x = sx * ((W - 0.2) / 2 + 0.02)
        p.box((0.06, 0.8, 1.0), (x, 1.2, PL + 1.6), "MAT_Plaster_Lime_A", rgb("dark_recess"))
        for k in range(5):
            p.box((0.04, 0.03, 1.0), (x + sx * 0.03, 0.88 + k * 0.16, PL + 1.6), "MAT_Wood_Teak_A", rgb("teak_dark"))
        p.box((0.1, 0.96, 0.1), (x + sx * 0.03, 1.2, PL + 2.15), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng))
    # veranda posts
    for x in (-3.2, -0.95, 0.95, 3.2):
        teak_post(p, (x, -3.75, PL), 2.75, rng)
    p.box((W + 0.2, 0.22, 0.2), (0, -3.75, PL + 2.85), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    # gable roof (ridge along X), covering veranda and body
    ov = 0.55
    z_eave, z_ridge, y_ridge = PL + 2.75 + 0.15, PL + 4.9, 0.0
    y_front, y_back = -D / 2 - ov, D / 2 + ov
    z_back = z_eave
    for (ye, ze) in ((y_front, z_eave), (y_back, z_back)):
        tile_roof_slope(p, -W / 2 - 0.45, W / 2 + 0.45, ye, ze, y_ridge, z_ridge, rng)
    p.tube([(-W / 2 - 0.5, 0, z_ridge + 0.06), (W / 2 + 0.5, 0, z_ridge + 0.06)], [0.12, 0.12], "MAT_Terracotta_A", rgb("terracotta", 0.03, rng), segments=8)
    # gable end walls (triangles above the side walls)
    for sx in (-1, 1):
        x = sx * (W - 0.2) / 2
        zw = PL + H
        # roof height at the body's front/back wall lines
        zf = z_eave + (z_ridge - z_eave) * (body_y0 - y_front) / (y_ridge - y_front)
        zb = z_back + (z_ridge - z_back) * (y_back - body_y1) / (y_back - y_ridge)
        pts = [(body_y0, zw), (body_y1, zw), (body_y1, max(zw, zb)), (y_ridge, z_ridge - 0.02), (body_y0, max(zw, zf))]
        verts = [p.bm.verts.new((x, yy, zz)) for yy, zz in pts]
        f = p.bm.faces.new(verts if sx > 0 else list(reversed(verts)))
        p._finish([f], "MAT_Plaster_Lime_A", rgb(wall_color, 0.02, rng))
        # fascia boards
    for ye, ze in ((y_front, z_eave), (y_back, z_back)):
        p.box((W + 1.0, 0.06, 0.18), (0, ye, ze - 0.02), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    # potted tulsi-style planter and a brass vessel by the door for life
    p.lathe([(0.0, 0), (0.22, 0), (0.25, 0.2), (0.2, 0.38), (0.24, 0.42), (0.0, 0.42)], (2.9, -4.5, 0), "MAT_Terracotta_A", rgb("terracotta", 0.05, rng), segments=10)
    p.ico(0.22, (2.9, -4.5, 0.6), "MAT_Foliage_A", rgb("leaf", 0.1, rng), subdiv=1, noise=0.25, rng=rng)
    p.lathe([(0, 0), (0.12, 0.02), (0.18, 0.14), (0.15, 0.26), (0.07, 0.32), (0.09, 0.38), (0, 0.38)], (-1.0, -3.2, PL + 0.46), "MAT_Brass_A", rgb("brass"), segments=12)

    p.to_object(f"{asset_id}_Mesh").parent = rt
    collider("Body", (W - 0.1, body_y1 - body_y0 + 0.1, H + 2), (0, by, PL + (H + 2) / 2), parent=rt)
    collider("Plinth", (W, D, PL), (0, 0, PL / 2), kind="WALK", parent=rt)
    collider("Step1", (1.6, 0.35, 0.15), (0, -D / 2 - 0.55, 0.075), kind="WALK", parent=rt)
    collider("Step2", (1.6, 0.35, 0.30), (0, -D / 2 - 0.2, 0.15), kind="WALK", parent=rt)
    for sx in (-1, 1):
        collider(f"Thinnai_{sx}", (2.4, 1.6, PL + 0.4), (sx * 2.1, -2.9, (PL + 0.4) / 2), kind="WALK", parent=rt)
    for x in (-3.2, 3.2):
        collider(f"Post_{x}", (0.34, 0.34, 3.0), (x, -3.75, PL + 1.5), parent=rt)
    empty("SOCKET_Door", (0, -2.5, PL), parent=rt)
    return export_asset(asset_id, "buildings", rt, required=["COL_Body", "WALK_Plinth"]), rt


@asset
def ENV_House_Village_A():
    return house("ENV_House_Village_A", 101, "plaster", "red_oxide", "teak")


@asset
def ENV_House_Village_B():
    return house("ENV_House_Village_B", 102, "plaster_warm", "plaster", "cloth_green")


@asset
def ENV_Workshop_A():
    """Artisan workshop: open-fronted shed, lean-to tile roof, workbench, shelves, lime trough, potter's wheel."""
    rng = random.Random(201)
    rt = root("ENV_Workshop_A")
    p = Part()
    W, D = 7.0, 5.0
    p.box((W + 0.4, D + 0.4, 0.15), (0, 0, 0.075), "MAT_Soil_A", rgb("soil_dry", 0.04, rng))
    p.box((W + 0.5, 0.3, 0.12), (0, -D / 2 - 0.15, 0.06), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    # back + side walls (sides open toward the front)
    p.box((W, 0.3, 3.4), (0, D / 2 - 0.15, 0.15 + 1.7), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.02, rng))
    p.box((W, 0.32, 0.5), (0, D / 2 - 0.15, 0.15 + 0.25), "MAT_Plaster_Lime_A", rgb("red_oxide", 0.03, rng))
    for sx in (-1, 1):
        # side wall top follows the roof slope (front lower than back)
        p.box((0.3, 3.4, 2.85), (sx * (W / 2 - 0.15), 0.8, 0.15 + 1.425), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.02, rng), taper=None)
        p.box((0.3, 1.7, 0.45), (sx * (W / 2 - 0.15), 1.65, 3.0 + 0.2), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.02, rng))
        p.box((0.32, 3.4, 0.5), (sx * (W / 2 - 0.15), 0.8, 0.15 + 0.25), "MAT_Plaster_Lime_A", rgb("red_oxide", 0.03, rng))
        p.box((0.3, 1.6, 1.0), (sx * (W / 2 - 0.15), -1.7, 0.15 + 0.5), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.02, rng))
    for x in (-3.3, -1.2, 1.2, 3.3):
        teak_post(p, (x, -D / 2 + 0.1, 0.15), 2.55, rng, r=0.1)
    p.box((W + 0.3, 0.2, 0.18), (0, -D / 2 + 0.1, 2.75), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    # lean-to roof: low at the front, high at the back
    tile_roof_slope(p, -W / 2 - 0.4, W / 2 + 0.4, -D / 2 - 0.6, 2.75, D / 2 + 0.3, 3.75, rng)
    p.box((W + 0.9, 0.06, 0.18), (0, -D / 2 - 0.6, 2.73), "MAT_Wood_Teak_A", rgb("teak_dark"))
    # workbench
    bx, by = 0.0, 0.6
    p.box((2.2, 0.85, 0.1), (bx, by, 0.15 + 0.85), "MAT_Wood_Teak_A", rgb("teak", 0.04, rng))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((0.1, 0.1, 0.85), (bx + sx * 1.0, by + sy * 0.35, 0.15 + 0.425), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    p.box((2.0, 0.7, 0.05), (bx, by, 0.15 + 0.25), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng))
    # on the bench: stone mixing bowl, flower basket, twine, tools
    p.lathe([(0, 0), (0.22, 0.0), (0.28, 0.12), (0.25, 0.16), (0.0, 0.1)], (bx - 0.6, by, 1.05), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng), segments=12)
    p.lathe([(0.0, 0), (0.24, 0.0), (0.28, 0.14), (0.0, 0.1)], (bx + 0.55, by + 0.05, 1.05), "MAT_Thatch_A", rgb("basket", 0.05, rng), segments=12)
    for k in range(9):
        a = k * 2.4
        p.ico(0.05, (bx + 0.55 + math.cos(a) * 0.14, by + 0.05 + math.sin(a) * 0.14, 1.19), "MAT_Foliage_A",
              rgb("marigold" if k % 3 else "jasmine", 0.05, rng), subdiv=1, scale=(1, 1, 0.6))
    p.tube([(bx + 0.1, by - 0.2, 1.08), (bx + 0.25, by - 0.25, 1.08)], [0.06, 0.06], "MAT_Thatch_A", rgb("thatch", 0.05, rng), segments=8)
    p.box((0.35, 0.05, 0.03), (bx - 0.1, by - 0.25, 1.07), "MAT_Wood_Teak_A", rgb("teak_dark"), rot_z=0.4)
    # shelves on the back wall with pots
    for z in (1.4, 2.1):
        p.box((3.0, 0.4, 0.06), (0, D / 2 - 0.5, z), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng))
        for k in range(6):
            s = 0.7 + rng.random() * 0.5
            x = -1.3 + k * 0.52
            p.lathe([(0, 0), (0.1 * s, 0), (0.16 * s, 0.1 * s), (0.15 * s, 0.22 * s), (0.08 * s, 0.3 * s), (0.1 * s, 0.34 * s), (0, 0.32 * s)],
                    (x, D / 2 - 0.5, z + 0.03), "MAT_Terracotta_A", rgb("terracotta", 0.08, rng), segments=10)
    for sx in (-1, 1):
        p.box((0.06, 0.4, 1.0), (sx * 1.55, D / 2 - 0.5, 1.75), "MAT_Wood_Teak_A", rgb("teak_dark"))
    # lime trough (right) and potter's wheel (left)
    p.box((1.2, 0.7, 0.45), (2.4, 0.9, 0.15 + 0.225), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.box((1.0, 0.5, 0.05), (2.4, 0.9, 0.15 + 0.43), "MAT_Plaster_Lime_A", rgb("clay_lime", 0.03, rng))
    p.lathe([(0, 0), (0.45, 0.0), (0.45, 0.12), (0.12, 0.14), (0.12, 0.3), (0.3, 0.32), (0.3, 0.38), (0, 0.38)], (-2.3, 0.7, 0.15), "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng), segments=14)
    p.lathe([(0, 0), (0.12, 0), (0.16, 0.12), (0.1, 0.22), (0.12, 0.26), (0, 0.24)], (-2.3, 0.7, 0.53), "MAT_Terracotta_A", rgb("clay_lime", 0.05, rng), segments=12)
    # stack of finished pots and baskets near the front
    for k, (x, y) in enumerate(((-2.7, -1.6), (-2.3, -1.9), (-2.75, -2.0))):
        s = 1.3
        p.lathe([(0, 0), (0.1 * s, 0), (0.18 * s, 0.12 * s), (0.17 * s, 0.25 * s), (0.08 * s, 0.34 * s), (0.11 * s, 0.38 * s), (0, 0.36 * s)],
                (x, y, 0.15), "MAT_Terracotta_A", rgb("terracotta", 0.08, rng), segments=10)
    p.lathe([(0.0, 0), (0.3, 0.0), (0.36, 0.3), (0.0, 0.26)], (2.6, -1.6, 0.15), "MAT_Thatch_A", rgb("basket", 0.05, rng), segments=12)
    p.to_object("ENV_Workshop_A_Mesh").parent = rt
    collider("Back", (W, 0.4, 3.6), (0, D / 2 - 0.15, 1.8), parent=rt)
    for sx in (-1, 1):
        collider(f"Side_{sx}", (0.4, D, 3.6), (sx * (W / 2 - 0.15), 0.0, 1.8), parent=rt)
    collider("Bench", (2.3, 0.95, 1.1), (bx, by, 0.55), parent=rt)
    collider("Trough", (1.25, 0.75, 0.6), (2.4, 0.9, 0.3), parent=rt)
    collider("Wheel", (1.0, 1.0, 0.6), (-2.3, 0.7, 0.3), parent=rt)
    collider("Shelves", (3.2, 0.6, 2.4), (0, D / 2 - 0.5, 1.2), parent=rt)
    for x in (-3.3, -1.2, 1.2, 3.3):
        collider(f"Post_{x}", (0.3, 0.3, 2.8), (x, -D / 2 + 0.1, 1.4), parent=rt)
    collider("Floor", (W + 0.4, D + 0.4, 0.15), (0, 0, 0.075), kind="WALK", parent=rt)
    empty("SOCKET_Bench", (bx, by - 1.0, 0.15), parent=rt)
    empty("SOCKET_Artisan", (bx - 0.6, by + 1.0, 0.15), parent=rt)
    return export_asset("ENV_Workshop_A", "buildings", rt, required=["COL_Bench", "SOCKET_Bench"]), rt


@asset
def ENV_Market_Stall_A():
    """Trader's stall: four posts, striped cloth canopy with sag, counter with goods."""
    rng = random.Random(301)
    rt = root("ENV_Market_Stall_A")
    p = Part()
    for sx in (-1, 1):
        for sy, h in ((-1, 2.4), (1, 2.7)):
            p.box((0.12, 0.12, h), (sx * 1.45, sy * 0.95, h / 2), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng))
            p.box((0.26, 0.26, 0.1), (sx * 1.45, sy * 0.95, 0.05), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    # canopy grid with sag, alternating saffron / off-white stripes, double-sided via thin thickness
    nx, ny = 8, 5
    pts = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            u, v = i / nx, j / ny
            x = -1.65 + 3.3 * u
            y = -1.15 + 2.3 * v
            z = 2.45 + 0.35 * v - math.sin(math.pi * u) * 0.12 * (0.5 + 0.5 * math.sin(math.pi * v))
            pts[(i, j)] = (x, y, z)
    for i in range(nx):
        col = rgb("cloth_saffron" if i % 2 == 0 else "cloth_white", 0.03, rng)
        for j in range(ny):
            quad = [pts[(i, j)], pts[(i + 1, j)], pts[(i + 1, j + 1)], pts[(i, j + 1)]]
            for off, order in ((0.0, quad), (-0.015, list(reversed(quad)))):
                verts = [p.bm.verts.new((q[0], q[1], q[2] + off)) for q in order]
                f = p.bm.faces.new(verts)
                p._finish([f], "MAT_Cloth_A", col)
                f.smooth = True
    # front valance with scalloped hem
    for i in range(nx):
        col = rgb("cloth_red", 0.04, rng)
        x0, x1 = -1.65 + 3.3 * i / nx, -1.65 + 3.3 * (i + 1) / nx
        a = [(x0, -1.16, 2.45), (x1, -1.16, 2.45)]
        b = [(x0, -1.16, 2.2), (x1, -1.16, 2.2)]
        p.quad_strip(b, a, "MAT_Cloth_A", col, smooth=False)
        p.quad_strip(a, b, "MAT_Cloth_A", col, smooth=False)
    # counter
    p.box((2.8, 0.75, 0.85), (0, -0.55, 0.425), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng))
    p.box((2.9, 0.85, 0.06), (0, -0.55, 0.88), "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    for k in range(5):
        p.box((0.04, 0.02, 0.7), (-1.2 + k * 0.6, -0.94, 0.42), "MAT_Wood_Teak_A", rgb("teak_dark"))
    # goods: twine rolls, flower baskets, brass pots, sacks, folded cloth
    for k in range(4):
        x = -1.15 + k * 0.17
        p.tube([(x, -0.75, 1.0), (x, -0.4, 1.0)], [0.08, 0.08], "MAT_Thatch_A", rgb("thatch", 0.06, rng), segments=8)
    for x, flower in ((-0.2, "marigold"), (0.45, "jasmine")):
        p.lathe([(0.0, 0), (0.24, 0.0), (0.28, 0.13), (0.0, 0.1)], (x, -0.55, 0.91), "MAT_Thatch_A", rgb("basket", 0.05, rng), segments=12)
        for k in range(10):
            a = k * 2.4
            r = 0.05 + (k % 3) * 0.06
            p.ico(0.05, (x + math.cos(a) * r, -0.55 + math.sin(a) * r, 1.05), "MAT_Foliage_A", rgb(flower, 0.05, rng), subdiv=1, scale=(1, 1, 0.6))
    p.lathe([(0, 0), (0.1, 0.02), (0.16, 0.14), (0.13, 0.25), (0.06, 0.3), (0.08, 0.35), (0, 0.35)], (1.05, -0.55, 0.91), "MAT_Brass_A", rgb("brass"), segments=12)
    for k, (x, y) in enumerate(((-1.0, 0.6), (-0.5, 0.75), (1.1, 0.6))):
        p.ico(0.3, (x, y, 0.3), "MAT_Cloth_A", rgb("cloth_white", 0.06, rng), subdiv=2, scale=(1, 0.85, 1.2), noise=0.05, rng=rng)
        p.lathe([(0.0, 0), (0.07, 0), (0.05, 0.12), (0, 0.12)], (x, y, 0.62), "MAT_Thatch_A", rgb("thatch"), segments=6)
    for k, c in enumerate(("cloth_indigo", "cloth_red", "cloth_green", "cloth_saffron")):
        p.box((0.7, 0.45, 0.08), (0.4, 0.6, 0.06 + k * 0.08), "MAT_Cloth_A", rgb(c, 0.04, rng), rot_z=(rng.random() - 0.5) * 0.2)
    p.to_object("ENV_Market_Stall_A_Mesh").parent = rt
    collider("Counter", (2.9, 0.85, 1.0), (0, -0.55, 0.5), parent=rt)
    for sx in (-1, 1):
        collider(f"Post_{sx}", (0.2, 0.2, 2.6), (sx * 1.45, 0.95, 1.3), parent=rt)
    empty("SOCKET_Trader", (0, 0.35, 0), parent=rt)
    return export_asset("ENV_Market_Stall_A", "buildings", rt, required=["COL_Counter"]), rt


@asset
def ENV_Tank_Stepped_A():
    """Small stepped water tank (8 x 8 m) with a parapet and an outlet gap on +X."""
    rng = random.Random(401)
    rt = root("ENV_Tank_Stepped_A")
    p = Part()
    S = 8.0
    steps = 5
    for i in range(steps):
        half = S / 2 - 0.5 - i * 0.45
        z_top = -0.25 * i
        rect_lathe(p, [(-0.45, z_top), (0, z_top), (0, z_top - 0.25)], half, half, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite" if i < 2 else "granite_dark", 0.05, rng))
    # rim slab
    rect_lathe(p, [(-0.5, 0.0), (0.0, 0.0), (0.0, -0.08)], S / 2, S / 2, (0, 0, 0.08), "MAT_Stone_Granite_A", rgb("granite_new", 0.04, rng))
    # parapet with an outlet gap on +X
    for side in range(4):
        for seg in range(4):
            if side == 0 and seg in (1, 2):
                continue
            t = -S / 2 + S * (seg + 0.5) / 4
            if side == 0:
                loc, size = (S / 2 + 0.2, t, 0.25), (0.4, S / 4 - 0.04, 0.5)
            elif side == 1:
                loc, size = (-S / 2 - 0.2, t, 0.25), (0.4, S / 4 - 0.04, 0.5)
            elif side == 2:
                loc, size = (t, S / 2 + 0.2, 0.25), (S / 4 - 0.04, 0.4, 0.5)
            else:
                loc, size = (t, -S / 2 - 0.2, 0.25), (S / 4 - 0.04, 0.4, 0.5)
            p.box(size, loc, "MAT_Stone_Granite_A", rgb("granite", 0.06, rng))
    # outlet sluice
    p.box((0.6, 1.2, 0.15), (S / 2 + 0.3, 0, 0.0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    p.to_object("ENV_Tank_Stepped_A_Mesh", bevel=0.01).parent = rt
    w = Part()
    w.box((S - 1.0 - 0.9 * (steps - 1) + 0.4, S - 1.0 - 0.9 * (steps - 1) + 0.4, 0.02), (0, 0, -0.9), "MAT_Water_A", rgb("cloth_indigo"))
    w.to_object("WATER_Tank").parent = rt
    for name, size, loc in (("N", (S + 0.8, 0.5, 1.0), (0, S / 2 + 0.2, 0.5)), ("S", (S + 0.8, 0.5, 1.0), (0, -S / 2 - 0.2, 0.5)),
                            ("W", (0.5, S, 1.0), (-S / 2 - 0.2, 0, 0.5))):
        collider(f"Rim_{name}", size, loc, parent=rt)
    for sy in (-1, 1):
        collider(f"Rim_E_{sy}", (0.5, S / 4, 1.0), (S / 2 + 0.2, sy * S * 3 / 8, 0.5), parent=rt)
    collider("Basin", (S - 0.6, S - 0.6, 1.0), (0, 0, 0.5), parent=rt)
    return export_asset("ENV_Tank_Stepped_A", "environment", rt, required=["WATER_Tank"]), rt
