"""Architecture assets: temple, gateway, pillars, walls, paving, lamp pillar."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset, render_preview
from tom.arch import rect_lathe, pillar, kalasha, kuta, shala, hara, block_course_wall, PLINTH_PROFILE, KAPOTA_PROFILE

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


@asset
def ENV_Pillar_Temple_A():
    rng = random.Random(11)
    rt = root("ENV_Pillar_Temple_A")
    p = Part()
    pillar(p, (0, 0, 0), height=3.2, rng=rng)
    p.to_object("ENV_Pillar_Temple_A_Mesh", bevel=0.01).parent = rt
    collider("Pillar", (0.56, 0.56, 3.2), (0, 0, 1.6), parent=rt)
    return export_asset("ENV_Pillar_Temple_A", "environment", rt, required=["COL_Pillar"]), rt


@asset
def ENV_Pillar_Temple_B():
    """Shorter, bracket-less variant for verandas and wall ends."""
    rng = random.Random(12)
    rt = root("ENV_Pillar_Temple_B")
    p = Part()
    pillar(p, (0, 0, 0), height=2.4, width=0.38, rng=rng, bracket=False)
    p.to_object("ENV_Pillar_Temple_B_Mesh", bevel=0.008).parent = rt
    collider("Pillar", (0.46, 0.46, 2.4), (0, 0, 1.2), parent=rt)
    return export_asset("ENV_Pillar_Temple_B", "environment", rt), rt


@asset
def ENV_Temple_Main_A():
    """Central shrine: moulded plinth, sanctum with vimana tower, ardha-mandapa and pillared porch."""
    rng = random.Random(7)
    rt = root("ENV_Temple_Main_A")
    stone = lambda j=0.05: rgb("granite", j, rng)
    plaster = lambda j=0.04: rgb("plaster_warm", j, rng)
    PH = 1.2  # plinth height
    p = Part()

    # --- plinth (adhishthana) 11 x 15, centre at origin; front faces -Y
    rect_lathe(p, PLINTH_PROFILE, 5.5, 7.5, (0, 0, 0), "MAT_Stone_Granite_A", stone(),
               color_fn=lambda co: rgb("granite_dark" if 0.36 < co.z < 0.72 else "granite", 0.03, rng))
    # paving on the plinth top (separate unbevelled mesh to keep the triangle count down)
    pave = Part()
    for ix in range(11):
        for iy in range(15):
            pave.box((0.97, 0.97, 0.03), (-5 + ix, -7 + iy, PH + 0.015), "MAT_Stone_Granite_A", rgb("granite_new", 0.06, rng))

    # --- steps (6 x 0.2 m) leading up the front
    for i in range(6):
        h = 0.2 * (i + 1)
        y = -7.5 - 0.34 * (6 - i) + 0.17
        p.box((3.2, 0.34, h), (0, y, h / 2), "MAT_Stone_Granite_A", stone(0.04))
    # balustrades (sloped side blocks with rolled ends)
    for sx in (-1, 1):
        x = sx * 1.85
        p.box((0.4, 2.1, 0.5), (x, -8.55, 0.25), "MAT_Stone_Granite_A", stone())
        p.box((0.4, 1.2, 0.55), (x, -8.0, 0.75), "MAT_Stone_Granite_A", stone(), taper=(1.0, 0.5))
        p.lathe([(0, 0), (0.28, 0), (0.3, 0.2), (0.22, 0.38), (0, 0.42)], (x, -9.4, 0.0), "MAT_Stone_Granite_A", stone(), segments=10)

    # --- sanctum (garbhagriha) 6x6 behind, ardha-mandapa 5x3, walls on the plinth
    def wall_block(cx, cy, w, d, h, z0):
        rect_lathe(p, [(0.08, 0), (0.08, 0.12), (0.02, 0.12), (0.02, 0.22), (0, 0.22), (0, h)], w / 2, d / 2, (cx, cy, z0), "MAT_Stone_Granite_A", stone())

    wall_block(0, 3.5, 6.0, 6.0, 4.2, PH)          # sanctum
    wall_block(0, -1.0, 5.0, 3.0, 3.8, PH)         # ardha-mandapa
    # pilasters on the sanctum walls (3 per side) and niches mid-side
    for side in (-1, 1):
        for k in (-2.2, 2.2):
            p.box((0.36, 0.12, 3.6), (side * 3.04, 3.5 + k, PH + 2.0), "MAT_Stone_Granite_A", stone())
            p.box((0.5, 0.18, 0.2), (side * 3.06, 3.5 + k, PH + 3.9), "MAT_Stone_Granite_A", stone())
        # niche (devakoshta): recessed panel with its own small cornice and pilasters
        p.box((0.06, 1.1, 2.0), (side * 3.0, 3.5, PH + 1.9), "MAT_Stone_Granite_A", rgb("dark_recess"))
        for k in (-0.7, 0.7):
            p.box((0.16, 0.2, 2.2), (side * 3.06, 3.5 + k, PH + 1.9), "MAT_Stone_Granite_A", stone())
        p.box((0.3, 1.8, 0.18), (side * 3.12, 3.5, PH + 3.1), "MAT_Stone_Granite_A", stone())
        shala(p, (side * 3.1, 3.5, PH + 3.2), 1.2, 0.45, plaster(), along_x=False, rng=rng)
    for k in (-2.2, 0, 2.2):
        p.box((0.36, 0.12, 3.6), (k, 6.54, PH + 2.0), "MAT_Stone_Granite_A", stone())
    p.box((1.1, 0.06, 2.0), (0, 6.52, PH + 1.9), "MAT_Stone_Granite_A", rgb("dark_recess"))
    # kapota cornices
    rect_lathe(p, KAPOTA_PROFILE, 3.0, 3.0, (0, 3.5, PH + 4.2), "MAT_Stone_Granite_A", stone(0.03))
    rect_lathe(p, KAPOTA_PROFILE, 2.5, 1.5, (0, -1.0, PH + 3.8), "MAT_Stone_Granite_A", stone(0.03))

    # doorway into the ardha-mandapa (closed teak doors with brass studs)
    p.box((1.9, 0.3, 3.0), (0, -2.56, PH + 1.5), "MAT_Stone_Granite_A", stone())
    p.box((1.5, 0.1, 2.6), (0, -2.66, PH + 1.3), "MAT_Stone_Granite_A", rgb("dark_recess"))
    for sx in (-1, 1):
        p.box((0.66, 0.08, 2.5), (sx * 0.36, -2.72, PH + 1.25), "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng))
        for row in range(5):
            for col in range(2):
                p.ico(0.035, (sx * (0.2 + col * 0.32), -2.78, PH + 0.4 + row * 0.48), "MAT_Brass_A", rgb("brass"), subdiv=1)
    p.box((2.1, 0.4, 0.3), (0, -2.6, PH + 3.15), "MAT_Stone_Granite_A", stone())

    # --- pillared porch (mukha-mandapa) 7 x 4.3 with flat roof
    porch_y0, porch_y1 = -7.0, -2.5
    for ix in (-2.9, -0.95, 0.95, 2.9):
        for iy in (-6.6, -4.6):
            pillar(p, (ix, iy, PH), height=3.3, rng=rng)
    for ix in (-2.9, 2.9):
        pillar(p, (ix, -2.9, PH), height=3.3, rng=rng)
    roof_z = PH + 3.3
    p.box((7.2, 4.9, 0.28), (0, (porch_y0 + porch_y1) / 2 + 0.2, roof_z + 0.14), "MAT_Stone_Granite_A", stone())
    rect_lathe(p, KAPOTA_PROFILE, 3.6, 2.45, (0, (porch_y0 + porch_y1) / 2 + 0.2, roof_z + 0.28), "MAT_Stone_Granite_A", stone(0.03))
    # porch parapet of small shrines
    pz = roof_z + 0.9
    hara(p, 3.4, 2.25, pz - 0.0, 0.62, [plaster(), plaster()], rng, cy=(porch_y0 + porch_y1) / 2 + 0.2)
    p.box((6.6, 4.3, 0.12), (0, (porch_y0 + porch_y1) / 2 + 0.2, pz - 0.05), "MAT_Plaster_Lime_A", plaster())

    # --- vimana over the sanctum: three diminishing tiers, neck, octagonal dome, finial
    z = PH + 4.2 + 0.62
    hara(p, 3.2, 3.2, z, 0.85, [plaster(), rgb("plaster", 0.04, rng)], rng, cy=3.5)
    tiers = [(4.6, 1.5), (3.5, 1.2), (2.5, 1.0)]
    for i, (w, h) in enumerate(tiers):
        rect_lathe(p, [(0, 0), (0, h)], w / 2, w / 2, (0, 3.5, z), "MAT_Plaster_Lime_A", plaster())
        # pilasters and ochre-washed recesses give each tier a rhythm
        for side in range(4):
            for k in (-0.3, 0.3):
                ang = side * math.pi / 2
                ox, oy = math.sin(ang) * (w / 2 + 0.03), -math.cos(ang) * (w / 2 + 0.03)
                tx, ty = math.cos(ang) * k * w, math.sin(ang) * k * w
                p.box((0.22, 0.08, h * 0.85), (ox + tx, 3.5 + oy + ty, z + h * 0.45), "MAT_Plaster_Lime_A", plaster(), rot_z=ang)
            ox, oy = math.sin(side * math.pi / 2) * (w / 2 + 0.01), -math.cos(side * math.pi / 2) * (w / 2 + 0.01)
            p.box((w * 0.3, 0.04, h * 0.6), (ox, 3.5 + oy, z + h * 0.45), "MAT_Plaster_Lime_A", rgb("ochre", 0.05, rng), rot_z=side * math.pi / 2)
        z += h
        rect_lathe(p, [(0, 0), (0.18, 0.08), (0.24, 0.2), (0.2, 0.28), (0, 0.3)], w / 2, w / 2, (0, 3.5, z), "MAT_Plaster_Lime_A", plaster())
        z += 0.3
        if i < len(tiers) - 1:
            nw = tiers[i + 1][0]
            hara_unit = 0.62 - i * 0.12
            hara_p_w = (w + nw) / 4 + 0.15
            hara(p, hara_p_w, hara_p_w, z, hara_unit, [plaster(), rgb("plaster", 0.04, rng)], rng, cy=3.5)
    # griva (neck)
    p.lathe([(1.0, 0), (1.0, 0.7), (1.15, 0.8)], (0, 3.5, z), "MAT_Plaster_Lime_A", plaster(), segments=8, smooth=False, rot_offset=math.pi / 8)
    z += 0.8
    # octagonal shikhara dome
    p.lathe([(1.55, 0), (1.62, 0.18), (1.5, 0.55), (1.2, 0.95), (0.75, 1.3), (0.3, 1.5), (0, 1.55)],
            (0, 3.5, z), "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.02, rng), segments=8, smooth=False, rot_offset=math.pi / 8)
    # kirtimukha gables on the dome's four faces
    for side in range(4):
        ang = side * math.pi / 2
        ox, oy = math.sin(ang) * 1.45, -math.cos(ang) * 1.45
        p.box((0.7, 0.25, 0.9), (ox, 3.5 + oy, z + 0.55), "MAT_Plaster_Lime_A", rgb("ochre", 0.04, rng), rot_z=ang, taper=(0.4, 1.0))
    z += 1.5
    kalasha(p, (0, 3.5, z), scale=1.6)

    p.to_object("ENV_Temple_Main_A_Mesh").parent = rt
    pave.to_object("ENV_Temple_Main_A_Paving").parent = rt

    # --- collision & walkable surfaces
    collider("Plinth", (11.2, 15.2, PH), (0, 0, PH / 2), kind="WALK", parent=rt)
    for i in range(6):
        h = 0.2 * (i + 1)
        y = -7.5 - 0.34 * (6 - i) + 0.17
        collider(f"Step_{i}", (3.2, 0.34, h), (0, y, h / 2), kind="WALK", parent=rt)
    # Plinth sides block the player except at the steps (side blocks flanking the stair)
    collider("Sanctum", (6.4, 6.4, 6), (0, 3.5, PH + 3), parent=rt)
    collider("Ardha", (5.2, 3.2, 5), (0, -1.0, PH + 2.5), parent=rt)
    for ix in (-2.9, -0.95, 0.95, 2.9):
        for iy in (-6.6, -4.6):
            collider(f"PorchPillar_{ix}_{iy}", (0.5, 0.5, 3.3), (ix, iy, PH + 1.65), parent=rt)
    for sx in (-1, 1):
        collider(f"Balustrade_{sx}", (0.45, 2.2, 1.2), (sx * 1.85, -8.55, 0.6), parent=rt)
    empty("SOCKET_TempleDoor", (0, -3.2, PH), parent=rt)
    return export_asset("ENV_Temple_Main_A", "landmarks", rt, required=["COL_Sanctum", "WALK_Plinth"]), rt


@asset
def ENV_Gopuram_Entrance_A():
    """Entrance gateway tower: granite base with passage, three stucco tiers, barrel-vault crown."""
    rng = random.Random(21)
    rt = root("ENV_Gopuram_Entrance_A")
    stone = lambda: rgb("granite", 0.05, rng)
    plaster = lambda: rgb("plaster_warm", 0.04, rng)
    p = Part()
    W, D, BH, PW = 9.2, 5.0, 4.6, 2.8  # width, depth, base height, passage width
    pier_w = (W - PW) / 2
    for sx in (-1, 1):
        cx = sx * (PW / 2 + pier_w / 2)
        rect_lathe(p, [(0.1, 0), (0.1, 0.15), (0.02, 0.15), (0.06, 0.32), (0.08, 0.42), (0.04, 0.52), (-0.04, 0.55), (-0.04, 0.7), (0.0, 0.7), (0, BH)],
                   pier_w / 2, D / 2, (cx, 0, 0), "MAT_Stone_Granite_A", stone())
        # pilasters and niches on the front and back faces
        for fy in (-1, 1):
            for k in (-1.05, 0, 1.05):
                p.box((0.32, 0.12, BH - 1.0), (cx + k, fy * (D / 2 + 0.05), 0.7 + (BH - 1.0) / 2), "MAT_Stone_Granite_A", stone())
            p.box((0.7, 0.06, 1.8), (cx + (0.52 if sx < 0 else -0.52), fy * (D / 2 + 0.02), 2.2), "MAT_Stone_Granite_A", rgb("dark_recess"))
    # passage lintel and ceiling beams
    p.box((PW + 0.3, D, 0.7), (0, 0, BH - 0.35), "MAT_Stone_Granite_A", stone())
    # open teak doors swung against the passage walls
    for sx in (-1, 1):
        p.box((0.08, 1.35, 3.6), (sx * (PW / 2 - 0.08), -D / 2 + 0.9, 1.8), "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng))
        for row in range(6):
            p.ico(0.04, (sx * (PW / 2 - 0.14), -D / 2 + 0.9, 0.4 + row * 0.55), "MAT_Brass_A", rgb("brass"), subdiv=1)
    rect_lathe(p, KAPOTA_PROFILE, W / 2, D / 2, (0, 0, BH), "MAT_Stone_Granite_A", stone())
    z = BH + 0.62
    # stucco tiers with parapets
    tiers = [(W - 0.4, D - 0.4, 1.7), (W - 1.6, D - 1.1, 1.5), (W - 2.8, D - 1.8, 1.35)]
    for i, (w, d, h) in enumerate(tiers):
        rect_lathe(p, [(0, 0), (0, h)], w / 2, d / 2, (0, 0, z), "MAT_Plaster_Lime_A", plaster())
        for fy in (-1, 1):
            n = 5 - i
            for k in range(n):
                x = -w / 2 + w * (k + 0.5) / n
                p.box((0.22, 0.08, h * 0.85), (x, fy * (d / 2 + 0.03), z + h * 0.45), "MAT_Plaster_Lime_A", plaster())
            # central window opening on each tier
            p.box((0.6, 0.06, h * 0.55), (0, fy * (d / 2 + 0.01), z + h * 0.4), "MAT_Plaster_Lime_A", rgb("dark_recess"))
        z += h
        rect_lathe(p, [(0, 0), (0.15, 0.08), (0.22, 0.2), (0.18, 0.28), (0, 0.3)], w / 2, d / 2, (0, 0, z), "MAT_Plaster_Lime_A", rgb("ochre", 0.04, rng))
        z += 0.3
        nxt = tiers[i + 1] if i + 1 < len(tiers) else (w - 1.2, d - 0.7, 0)
        unit = 0.6 - 0.08 * i
        hw, hd = (w + nxt[0]) / 4 + 0.1, (d + nxt[1]) / 4 + 0.05
        for sx in (-1, 1):
            for sy in (-1, 1):
                kuta(p, (sx * (hw - unit / 2), sy * (hd - unit / 2), z), unit, plaster(), rng)
        for sy in (-1, 1):
            shala(p, (0, sy * (hd - unit * 0.4), z), max(0.8, 2 * hw - 2 * unit - 0.6), unit * 0.8, plaster(), along_x=True, rng=rng)
    # wagon-vault crown (shala) with five finials
    cw, cd = tiers[-1][0] - 0.6, tiers[-1][1] - 0.5
    p.box((cw, cd, 0.5), (0, 0, z + 0.25), "MAT_Plaster_Lime_A", plaster())
    z += 0.5
    rad = cd / 2
    a_pts, b_pts = [], []
    for i in range(10):
        a = math.pi * i / 9
        a_pts.append((-cw / 2, math.cos(a) * rad, z + math.sin(a) * rad * 1.3))
        b_pts.append((cw / 2, math.cos(a) * rad, z + math.sin(a) * rad * 1.3))
    p.quad_strip(a_pts, b_pts, "MAT_Plaster_Lime_A", rgb("plaster_warm", 0.02, rng))
    for pts in (a_pts, b_pts):
        f = p.bm.faces.new([p.bm.verts.new(q) for q in pts])
        p._finish([f], "MAT_Plaster_Lime_A", rgb("ochre", 0.03, rng))
    for k in range(5):
        kalasha(p, (-cw / 2 + cw * (k + 0.5) / 5, 0, z + rad * 1.28), scale=1.0)
    p.to_object("ENV_Gopuram_Entrance_A_Mesh").parent = rt
    for sx in (-1, 1):
        collider(f"Pier_{sx}", (pier_w + 0.2, D + 0.2, BH), (sx * (PW / 2 + pier_w / 2), 0, BH / 2), parent=rt)
    empty("SOCKET_Garland", (0, -D / 2 - 0.05, BH - 0.75), parent=rt)
    return export_asset("ENV_Gopuram_Entrance_A", "landmarks", rt, required=["COL_Pier"]), rt


@asset
def ENV_Wall_Prakara_A():
    """4 m courtyard wall module: lime plaster with red-ochre and white vertical stripes, stone base and coping."""
    rng = random.Random(31)
    rt = root("ENV_Wall_Prakara_A")
    L, H, T = 4.0, 2.8, 0.6
    p = Part()
    rect_lathe(p, [(0.08, 0), (0.08, 0.2), (0.03, 0.2), (0.03, 0.4), (0.0, 0.4)], L / 2, T / 2, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.05, rng))
    # striped plaster body: alternating stripes as separate faces so colour stays crisp
    n = 10
    for i in range(n):
        x = -L / 2 + L * (i + 0.5) / n
        col = rgb("red_oxide" if i % 2 == 0 else "plaster", 0.03, rng)
        p.box((L / n, T, H - 0.75), (x, 0, 0.4 + (H - 0.75) / 2), "MAT_Plaster_Lime_A", col)
    # coping: band + rounded top
    p.box((L, T + 0.12, 0.12), (0, 0, H - 0.29), "MAT_Plaster_Lime_A", rgb("plaster", 0.02, rng))
    a_pts, b_pts = [], []
    for i in range(8):
        a = math.pi * i / 7
        a_pts.append((-L / 2, math.cos(a) * (T / 2 + 0.04), H - 0.23 + math.sin(a) * 0.23))
        b_pts.append((L / 2, math.cos(a) * (T / 2 + 0.04), H - 0.23 + math.sin(a) * 0.23))
    p.quad_strip(b_pts, a_pts, "MAT_Plaster_Lime_A", rgb("plaster", 0.02, rng))
    for pts in (a_pts, b_pts):
        f = p.bm.faces.new([p.bm.verts.new(q) for q in pts])
        p._finish([f], "MAT_Plaster_Lime_A", rgb("plaster", 0.02, rng))
    p.to_object("ENV_Wall_Prakara_A_Mesh").parent = rt
    collider("Wall", (L, T + 0.1, H), (0, 0, H / 2), parent=rt)
    return export_asset("ENV_Wall_Prakara_A", "environment", rt), rt


@asset
def ENV_Wall_Stone_A():
    """4 m granite block wall module for the settlement boundary."""
    rng = random.Random(41)
    rt = root("ENV_Wall_Stone_A")
    L, H, T = 4.0, 2.4, 0.7
    p = Part()
    p.box((L, T + 0.16, 0.25), (0, 0, 0.125), "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng))
    block_course_wall(p, L, H - 0.45, T, (0, 0, 0.25), rng, course=0.44, block=0.95)
    p.box((L, T + 0.1, 0.2), (0, 0, H - 0.1), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    p.to_object("ENV_Wall_Stone_A_Mesh", bevel=0.01).parent = rt
    collider("Wall", (L, T + 0.1, H), (0, 0, H / 2), parent=rt)
    return export_asset("ENV_Wall_Stone_A", "environment", rt), rt


@asset
def ENV_Wall_Stone_Broken_A():
    """Collapsed 4 m wall module for the old grounds: stepped broken top, fallen blocks, moss."""
    rng = random.Random(42)
    rt = root("ENV_Wall_Stone_Broken_A")
    L, T = 4.0, 0.7
    p = Part()
    p.box((L, T + 0.16, 0.25), (0, 0, 0.125), "MAT_Stone_Granite_A", rgb("granite_dark", 0.04, rng))
    heights = [1.9, 1.75, 1.4, 0.9, 0.5, 0.45, 0.9, 1.3]
    seg = L / len(heights)
    for i, h in enumerate(heights):
        rows = max(1, round(h / 0.44))
        for r in range(rows):
            if r == rows - 1 and rng.random() < 0.4:
                continue
            x = -L / 2 + seg * (i + 0.5) + (seg / 2 if r % 2 else 0) * 0.3
            p.box((seg - 0.015, T - rng.random() * 0.04, 0.43), (x, 0, 0.25 + r * 0.44 + 0.215), "MAT_Stone_Granite_A",
                  rgb("granite" if rng.random() > 0.3 else "granite_dark", 0.08, rng), rot_z=(rng.random() - 0.5) * 0.04)
    for k in range(6):
        x = (rng.random() - 0.5) * L
        y = -T / 2 - 0.3 - rng.random() * 0.8
        p.box((0.6 + rng.random() * 0.4, 0.45, 0.4), (x, y, 0.18), "MAT_Stone_Granite_A", rgb("granite_dark", 0.08, rng), rot_z=rng.random() * 3)
    for k in range(5):
        p.ico(0.25 + rng.random() * 0.2, ((rng.random() - 0.5) * L, -T / 2 - 0.1, 0.08), "MAT_Foliage_A", rgb("moss", 0.12, rng), scale=(1.4, 1, 0.45), noise=0.2, rng=rng)
    p.to_object("ENV_Wall_Stone_Broken_A_Mesh", bevel=0.01).parent = rt
    collider("Wall", (L, T + 0.1, 1.9), (0, 0, 0.95), parent=rt)
    return export_asset("ENV_Wall_Stone_Broken_A", "environment", rt), rt


@asset
def ENV_Wall_Post_A():
    """Square post that caps wall module joints and corners."""
    rng = random.Random(51)
    rt = root("ENV_Wall_Post_A")
    p = Part()
    rect_lathe(p, [(0.1, 0), (0.1, 0.3), (0.03, 0.3), (0.03, 0.45), (0.0, 0.45), (0.0, 2.7), (0.08, 2.78), (0.08, 2.9), (0, 2.9)], 0.45, 0.45, (0, 0, 0),
               "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    kalasha(p, (0, 0, 2.9), scale=0.7, mat="MAT_Stone_Granite_A", color=rgb("granite", 0.03, rng))
    p.to_object("ENV_Wall_Post_A_Mesh", bevel=0.01).parent = rt
    collider("Post", (1.0, 1.0, 3.0), (0, 0, 1.5), parent=rt)
    return export_asset("ENV_Wall_Post_A", "environment", rt), rt


@asset
def ENV_Lamp_Pillar_A():
    """Tall stone lamp pillar (deepa stambha) - courtyard landmark."""
    rng = random.Random(61)
    rt = root("ENV_Lamp_Pillar_A")
    p = Part()
    rect_lathe(p, [(0.5, 0), (0.5, 0.3), (0.35, 0.3), (0.35, 0.6), (0.25, 0.6), (0.25, 0.9)], 0.5, 0.5, (0, 0, 0), "MAT_Stone_Granite_A", rgb("granite", 0.04, rng))
    p.lathe([(0.3, 0), (0.24, 3.8), (0.2, 4.6)], (0, 0, 0.9), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng), segments=8, smooth=False, rot_offset=math.pi / 8)
    for k, z in enumerate((2.0, 3.0, 4.0, 5.0)):
        r = 0.55 - k * 0.07
        p.lathe([(0.0, 0), (r, 0.05), (r + 0.05, 0.12), (r, 0.16), (0.25, 0.16)], (0, 0, z), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng), segments=12, smooth=True)
        for i in range(8):
            a = i * math.pi / 4
            p.ico(0.045, (math.cos(a) * r, math.sin(a) * r, z + 0.18), "MAT_Brass_A", rgb("brass"), subdiv=1)
    p.lathe([(0.0, 0), (0.35, 0.05), (0.3, 0.25), (0.0, 0.3)], (0, 0, 5.5), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng), segments=8)
    kalasha(p, (0, 0, 5.8), scale=0.9)
    p.to_object("ENV_Lamp_Pillar_A_Mesh", bevel=0.008).parent = rt
    collider("Base", (1.2, 1.2, 6.0), (0, 0, 3.0), parent=rt)
    return export_asset("ENV_Lamp_Pillar_A", "landmarks", rt), rt


@asset
def ENV_Paving_Courtyard_A():
    """10 x 10 m tile of granite paving slabs with irregular courses (tiles seamlessly)."""
    rng = random.Random(71)
    rt = root("ENV_Paving_Courtyard_A")
    p = Part()
    S = 10.0
    y = -S / 2
    while y < S / 2 - 0.01:
        row_h = min(rng.choice([0.9, 1.1, 1.3]), S / 2 - y)
        x = -S / 2
        while x < S / 2 - 0.01:
            w = min(rng.choice([0.9, 1.2, 1.5, 1.8]), S / 2 - x)
            r = rng.random()
            col = rgb("granite" if r > 0.3 else ("granite_dark" if r < 0.12 else "sandstone"), 0.08, rng)
            p.box((w - 0.04, row_h - 0.04, 0.06), (x + w / 2, y + row_h / 2, 0.03 - rng.random() * 0.008), "MAT_Stone_Granite_A", col)
            x += w
        y += row_h
    p.to_object("ENV_Paving_Courtyard_A_Mesh").parent = rt
    return export_asset("ENV_Paving_Courtyard_A", "environment", rt), rt
