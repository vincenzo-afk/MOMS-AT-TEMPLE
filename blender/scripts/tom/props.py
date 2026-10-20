"""Reusable prop-building helpers shared by the category asset scripts (asserts_img/ reference sheets)."""
import math
import random
from mathutils import Vector
from .core import Part, rgb


def bamboo(p, a, b, r, rng, color="bamboo"):
    """Bamboo pole from a to b with node rings every ~0.4 m."""
    a, b = Vector(a), Vector(b)
    p.tube([tuple(a), tuple(b)], [r, r * 0.92], "MAT_Wood_Teak_A", rgb(color, 0.06, rng), segments=7)
    n = max(1, int((b - a).length / 0.42))
    for i in range(1, n):
        c = a.lerp(b, i / n)
        d = (b - a).normalized()
        p.tube([tuple(c - d * 0.012), tuple(c + d * 0.012)], [r * 1.15, r * 1.15], "MAT_Wood_Teak_A", rgb("bamboo_dark", 0.05, rng), segments=7)


def plank(p, size, loc, rng, color="teak", rot_z=0.0, mat="MAT_Wood_Teak_A"):
    p.box(size, loc, mat, rgb(color, 0.07, rng), rot_z=rot_z)


def rope_path(p, pts, r=0.012, rng=None):
    p.tube([tuple(q) for q in pts], [r] * len(pts), "MAT_Thatch_A", rgb("rope", 0.05, rng), segments=6)


def coil(p, center, radius, turns, rng, r=0.014):
    cx, cy, cz = center
    pts = []
    for i in range(int(turns * 16) + 1):
        a = i / 16 * 2 * math.pi
        rr = radius * (0.55 + 0.45 * (i / (turns * 16)))
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr, cz + (i % 16 == 0) * 0.0 + (i / (turns * 16)) * r * 2.5))
    rope_path(p, pts, r, rng)


def pot(p, loc, s, rng, color="terracotta", mat="MAT_Terracotta_A", lid=False, wide=1.0):
    """Clay/brass pot (kudam / panai) by lathe profile."""
    prof = [(0, 0), (0.10 * s * wide, 0), (0.17 * s * wide, 0.07 * s), (0.20 * s * wide, 0.17 * s), (0.17 * s * wide, 0.28 * s),
            (0.09 * s, 0.34 * s), (0.08 * s, 0.37 * s), (0.11 * s, 0.40 * s), (0.10 * s, 0.41 * s), (0.07 * s, 0.39 * s)]
    p.lathe(prof, loc, mat, rgb(color, 0.06, rng), segments=14)
    if lid:
        x, y, z = loc
        p.lathe([(0, 0.05 * s), (0.12 * s, 0.0), (0.13 * s, 0.015 * s), (0.03 * s, 0.06 * s), (0.035 * s, 0.09 * s), (0, 0.095 * s)],
                (x, y, z + 0.38 * s), mat, rgb(color, 0.06, rng), segments=12)


def basket(p, loc, r, h, rng, handle=False, color="basket", rim_color=None):
    """Woven basket: lathe body with alternating weave bands and a rim."""
    x, y, z = loc
    bands = 5
    for i in range(bands):
        z0 = h * i / bands
        z1 = h * (i + 1) / bands
        r0 = r * (0.72 + 0.28 * i / bands)
        r1 = r * (0.72 + 0.28 * (i + 1) / bands)
        p.lathe([(r0, z0), (r1, z1)] if i else [(0, 0), (r0, 0), (r1, z1)], (x, y, z), "MAT_Thatch_A", rgb(color, 0.08 if i % 2 else 0.02, rng), segments=16, smooth=False)
    p.lathe([(r * 1.0, h), (r * 1.06, h + 0.015), (r * 1.0, h + 0.03), (r * 0.94, h + 0.015)], (x, y, z), "MAT_Thatch_A", rgb(rim_color or color, 0.04, rng), segments=16)
    if handle:
        pts = [(x - r * 0.9, y, z + h + 0.02)] + [(x + math.cos(a) * r * 0.9, y, z + h + 0.02 + math.sin(a) * r * 0.9) for a in [math.pi * k / 8 for k in range(8, -1, -1)]][1:]
        p.tube(pts, [0.012] * len(pts), "MAT_Thatch_A", rgb(color, 0.05, rng), segments=6)


def heap(p, loc, r, n, color, rng, size=0.05, scale=(1, 1, 1), mat="MAT_Foliage_A", flat=0.55):
    """Mound of small round items (flowers, produce, grain) inside radius r."""
    x, y, z = loc
    for i in range(n):
        a = rng.random() * math.tau
        rr = r * math.sqrt(rng.random())
        hz = (1 - (rr / max(r, 1e-6)) ** 2) * r * flat
        c = color(i) if callable(color) else color
        p.ico(size * (0.8 + rng.random() * 0.4), (x + math.cos(a) * rr, y + math.sin(a) * rr, z + hz), mat, rgb(c, 0.06, rng), subdiv=1, scale=scale)


def cloth_sheet(p, corners, nx, ny, sag, colors, rng, double=True, mat="MAT_Cloth_A"):
    """Bilinear sheet between 4 corners (a,b,c,d) with sag; colors(i, j) -> palette name."""
    a, b, c, d = [Vector(q) for q in corners]
    grid = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            u, v = i / nx, j / ny
            pt = a.lerp(b, u).lerp(d.lerp(c, u), v)
            pt.z -= math.sin(math.pi * u) * math.sin(math.pi * v) * sag
            grid[(i, j)] = pt
    for i in range(nx):
        for j in range(ny):
            q = [grid[(i, j)], grid[(i + 1, j)], grid[(i + 1, j + 1)], grid[(i, j + 1)]]
            col = rgb(colors(i, j), 0.03, rng)
            for off, order in ((0.0, q), (-0.012, list(reversed(q)))):
                if off and not double:
                    continue
                verts = [p.bm.verts.new((w.x, w.y, w.z + off)) for w in order]
                f = p.bm.faces.new(verts)
                p._finish([f], mat, col, shade=True)


def thatch_roof(p, w, d, z_eave, z_ridge, rng, overhang=0.35, hip=False, color="thatch", ragged=True):
    """Gable thatch roof over a w x d footprint (ridge along X): thick slabs with ragged straw eaves."""
    hw, hd = w / 2 + overhang, d / 2 + overhang
    thick = 0.16
    for sy in (-1, 1):
        a = [(-hw, sy * hd, z_eave), (hw, sy * hd, z_eave)]
        b = [(-hw, 0, z_ridge), (hw, 0, z_ridge)]
        p.quad_strip(a, b, "MAT_Thatch_A", rgb(color, 0.05, rng), smooth=False) if sy < 0 else p.quad_strip(b, a, "MAT_Thatch_A", rgb(color, 0.05, rng), smooth=False)
        a2 = [(x, y, zz + thick) for x, y, zz in a]
        b2 = [(x, y, zz + thick) for x, y, zz in b]
        p.quad_strip(b2, a2, "MAT_Thatch_A", rgb(color, 0.05, rng), smooth=False) if sy < 0 else p.quad_strip(a2, b2, "MAT_Thatch_A", rgb(color, 0.05, rng), smooth=False)
        # eave thickness face
        p.quad_strip([a[0], a[1]], [a2[0], a2[1]], "MAT_Thatch_A", rgb(color, 0.08, rng), smooth=False)
        if ragged:  # straw tufts hanging off the eave
            n = int(2 * hw / 0.12)
            for k in range(n):
                x = -hw + (k + 0.5) * 2 * hw / n
                ln = 0.08 + rng.random() * 0.1
                p.box((0.1, 0.05, ln), (x, sy * (hd + 0.01), z_eave - ln / 2 + 0.05), "MAT_Thatch_A", rgb(color, 0.12, rng), taper=(1.0, 1.0))
    # ridge roll
    p.tube([(-hw - 0.05, 0, z_ridge + thick), (hw + 0.05, 0, z_ridge + thick)], [0.12, 0.12], "MAT_Thatch_A", rgb(color, 0.06, rng), segments=8)


def chest(p, loc, size, rng, rot_z=0.0, open_lid=False):
    """Wooden storage chest with iron bands and a domed lid (PRP_002)."""
    x, y, z = loc
    w, d, h = size
    c, s_ = math.cos(rot_z), math.sin(rot_z)
    p.box((w, d, h), (x, y, z + h / 2), "MAT_Wood_Teak_A", rgb("teak", 0.05, rng), rot_z=rot_z)
    for k in (-0.38, 0.0, 0.38):
        p.box((0.04, d + 0.02, h + 0.01), (x + c * k * w, y + s_ * k * w, z + h / 2), "MAT_Iron_A", rgb("iron", 0.04, rng), rot_z=rot_z)
    if not open_lid:
        lid = [(0, 0)] + [(math.cos(a) * d / 2, math.sin(a) * d * 0.28) for a in [math.pi * k / 6 for k in range(0, 7)]]
        for i in range(6):
            a0, a1 = math.pi * i / 6, math.pi * (i + 1) / 6
            y0, z0 = math.cos(a0) * d / 2, math.sin(a0) * d * 0.28
            y1, z1 = math.cos(a1) * d / 2, math.sin(a1) * d * 0.28
            pa = [(x - c * w / 2 - s_ * y0, y - s_ * w / 2 + c * y0, z + h + z0), (x + c * w / 2 - s_ * y0, y + s_ * w / 2 + c * y0, z + h + z0)]
            pb = [(x - c * w / 2 - s_ * y1, y - s_ * w / 2 + c * y1, z + h + z1), (x + c * w / 2 - s_ * y1, y + s_ * w / 2 + c * y1, z + h + z1)]
            p.quad_strip(pb, pa, "MAT_Wood_Teak_A", rgb("teak_dark", 0.05, rng), smooth=False)
        for end in (-1, 1):
            verts = [p.bm.verts.new((x + c * end * w / 2 - s_ * math.cos(math.pi * k / 6) * d / 2, y + s_ * end * w / 2 + c * math.cos(math.pi * k / 6) * d / 2, z + h + math.sin(math.pi * k / 6) * d * 0.28)) for k in range(7)]
            f = p.bm.faces.new(verts if end > 0 else list(reversed(verts)))
            p._finish([f], "MAT_Wood_Teak_A", rgb("teak_dark", 0.04, rng))
    p.box((0.06, 0.02, 0.08), (x - s_ * (-d / 2 - 0.01), y + c * (-d / 2 - 0.01), z + h - 0.02), "MAT_Brass_A", rgb("brass"), rot_z=rot_z)


def sack(p, loc, s, rng, color="cloth_white", open_top=False, fill="grain"):
    x, y, z = loc
    p.ico(0.22 * s, (x, y, z + 0.2 * s), "MAT_Cloth_A", rgb(color, 0.06, rng), subdiv=2, scale=(1, 0.85, 1.15), noise=0.05, rng=rng)
    if open_top:
        p.lathe([(0.15 * s, 0), (0.17 * s, 0.04 * s), (0.14 * s, 0.07 * s)], (x, y, z + 0.4 * s), "MAT_Cloth_A", rgb(color, 0.05, rng), segments=10)
        p.ico(0.13 * s, (x, y, z + 0.42 * s), "MAT_Foliage_A", rgb(fill, 0.05, rng), subdiv=1, scale=(1, 1, 0.4))
    else:
        p.lathe([(0.0, 0), (0.06 * s, 0.0), (0.04 * s, 0.08 * s), (0.08 * s, 0.13 * s), (0, 0.14 * s)], (x, y, z + 0.4 * s), "MAT_Cloth_A", rgb(color, 0.05, rng), segments=8)


def _flat_poly(p, pts, z, color, mat="MAT_Soil_A"):
    """Filled flat polygon (fan from its centroid), facing up."""
    cx = sum(q[0] for q in pts) / len(pts)
    cy = sum(q[1] for q in pts) / len(pts)
    c = p.bm.verts.new((cx, cy, z))
    ring = [p.bm.verts.new((x, y, z)) for x, y in pts]
    faces = []
    for i in range(len(ring)):
        faces.append(p.bm.faces.new((c, ring[i], ring[(i + 1) % len(ring)])))
    p._finish(faces, mat, color)


def _stroke(p, pts, w, z, color, closed=True, mat="MAT_Soil_A"):
    """Flat line of width w along a 2D polyline (kolam outline)."""
    n = len(pts)
    seq = pts + [pts[0]] if closed else pts
    for i in range(len(seq) - 1):
        (x0, y0), (x1, y1) = seq[i], seq[i + 1]
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy) or 1e-6
        nx, ny = -dy / L * w / 2, dx / L * w / 2
        quad = [(x0 - nx, y0 - ny, z), (x1 - nx, y1 - ny, z), (x1 + nx, y1 + ny, z), (x0 + nx, y0 + ny, z)]
        f = p.bm.faces.new([p.bm.verts.new(q) for q in quad])
        p._finish([f], mat, color)


def _petal(cx, cy, a, r0, r1, width, n=10):
    """Teardrop petal outline from radius r0 to r1 along angle a."""
    pts = []
    for i in range(n + 1):
        t = i / n
        r = r0 + (r1 - r0) * t
        w = math.sin(math.pi * t) * width * (1 - 0.35 * t)
        pts.append((cx + math.cos(a) * r - math.sin(a) * w, cy + math.sin(a) * r + math.cos(a) * w))
    for i in range(n - 1, 0, -1):
        t = i / n
        r = r0 + (r1 - r0) * t
        w = math.sin(math.pi * t) * width * (1 - 0.35 * t)
        pts.append((cx + math.cos(a) * r + math.sin(a) * w, cy + math.sin(a) * r - math.cos(a) * w))
    return pts


def kolam(p, loc, r, rng, z=0.012, palette=("kolam_white", "kolam_pink", "kolam_green", "marigold")):
    """Rice-flour floor drawing: two rings of filled petals with white outlines, lotus centre, dot border."""
    x, y, _ = loc
    white = rgb("kolam_white")
    # outer ring: 12 petals, inner ring: 8 petals (offset), centre disc
    for ring, (n, r0, r1, wd, col) in enumerate(((12, r * 0.42, r * 0.95, r * 0.16, palette[1]), (8, r * 0.18, r * 0.55, r * 0.15, palette[3]))):
        for k in range(n):
            a = 2 * math.pi * k / n + (math.pi / n if ring else 0)
            pts = _petal(x, y, a, r0, r1, wd)
            _flat_poly(p, pts, z + ring * 0.002, rgb(col, 0.03, rng))
            _stroke(p, pts, r * 0.025, z + 0.003 + ring * 0.002, white)
    centre = [(x + math.cos(2 * math.pi * k / 20) * r * 0.2, y + math.sin(2 * math.pi * k / 20) * r * 0.2) for k in range(20)]
    _flat_poly(p, centre, z + 0.006, rgb(palette[2], 0.03, rng))
    _stroke(p, centre, r * 0.025, z + 0.007, white)
    inner = [(x + math.cos(2 * math.pi * k / 16) * r * 0.08, y + math.sin(2 * math.pi * k / 16) * r * 0.08) for k in range(16)]
    _flat_poly(p, inner, z + 0.008, rgb("marigold_yellow"))
    # dot border (pulli)
    for k in range(24):
        a = 2 * math.pi * k / 24
        dot = [(x + math.cos(a) * r * 1.08 + math.cos(2 * math.pi * j / 6) * r * 0.025, y + math.sin(a) * r * 1.08 + math.sin(2 * math.pi * j / 6) * r * 0.025) for j in range(6)]
        _flat_poly(p, dot, z, white)
