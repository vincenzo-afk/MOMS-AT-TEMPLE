"""Architectural building blocks: rectangular mouldings, pillars, miniature shrines, roofs, block walls."""
import math
import random
from .core import Part, rgb


def rect_lathe(p, profile, hw, hd, loc, mat, color, color_fn=None):
    """Sweep a moulding profile [(offset, z), ...] around a rectangle of half-size (hw, hd).

    offset grows the rectangle outward (negative = inset). Produces a closed ring with sharp corners,
    which is how plinth mouldings (upana, kumuda, pattika) and cornices (kapota) read.
    """
    bm = p.bm
    before = set(bm.faces)
    rings = []
    for off, z in profile:
        w, d = hw + off, hd + off
        pts = [(-w, -d), (w, -d), (w, d), (-w, d)]
        rings.append([bm.verts.new((loc[0] + x, loc[1] + y, loc[2] + z)) for x, y in pts])
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    new = [f for f in bm.faces if f not in before]
    p._finish(new, mat, color)
    if color_fn:
        for f in new:
            for l in f.loops:
                l[p.col] = color_fn(l.vert.co)
    return new


# Profiles are (offset, z) pairs relative to the moulding base.
PLINTH_PROFILE = [
    (0.10, 0.00), (0.10, 0.16),          # upana (footing)
    (0.02, 0.16), (0.02, 0.36),          # jagati
    (0.00, 0.36), (0.07, 0.46), (0.09, 0.55), (0.07, 0.64), (0.00, 0.72),  # kumuda (rounded torus)
    (-0.10, 0.72), (-0.10, 0.92),        # kantha (recessed neck)
    (0.03, 0.92), (0.03, 1.08),          # pattika (band)
    (0.00, 1.08), (0.00, 1.20),
]

KAPOTA_PROFILE = [
    (0.00, 0.00), (0.06, 0.04), (0.06, 0.10),    # bed moulding
    (0.10, 0.10), (0.38, 0.16), (0.46, 0.26), (0.48, 0.36), (0.42, 0.44),  # curved overhang
    (0.30, 0.48), (0.08, 0.50), (0.08, 0.62), (0.00, 0.62),
]


def pillar(p, loc, height=3.2, width=0.46, rng=None, stone="granite", bracket=True):
    """Dravidian-style pillar: square base, square/octagonal alternating shaft, kalasha capital, palagai, potika bracket."""
    r = rng or random
    x, y, z = loc
    c = lambda: rgb(stone, 0.05, r)
    mat = "MAT_Stone_Granite_A"
    hw = width / 2
    base_h = 0.42
    rect_lathe(p, [(0.06, 0), (0.06, 0.1), (0.02, 0.1), (0.04, 0.2), (0.0, 0.26), (0.0, base_h)], hw, hw, (x, y, z), mat, c())
    shaft_top = height - 0.75 if bracket else height - 0.45
    seg = (shaft_top - base_h) / 3
    z0 = z + base_h
    # square - octagon - square, each square block with a thin band
    p.box((width * 0.92, width * 0.92, seg), (x, y, z0 + seg / 2), mat, c())
    p.lathe([(width * 0.47, 0), (width * 0.47, seg)], (x, y, z0 + seg), mat, c(), segments=8, smooth=False, rot_offset=math.pi / 8)
    p.box((width * 0.92, width * 0.92, seg), (x, y, z0 + seg * 2.5), mat, c())
    for k in (1, 2):
        p.box((width * 0.98, width * 0.98, 0.05), (x, y, z0 + seg * k + (0.025 if k == 2 else -0.025)), mat, c())
    # capital: kalasha (pot) + tadi + kumbha + palagai (abacus)
    cz = z + shaft_top
    p.lathe([(0.0, 0.0), (hw * 0.75, 0.0), (hw * 0.95, 0.08), (hw * 1.05, 0.16), (hw * 0.8, 0.24), (hw * 0.55, 0.28), (hw * 0.6, 0.32), (hw * 1.15, 0.36), (hw * 1.2, 0.42), (0.0, 0.42)],
            (x, y, cz), mat, c(), segments=12, smooth=True)
    p.box((width * 1.35, width * 1.35, 0.08), (x, y, cz + 0.46), mat, c())
    if bracket:
        # potika: cross-shaped corbel with rolled ends (stepped blocks)
        bz = cz + 0.5
        for rot in (0, math.pi / 2):
            p.box((width * 2.2, width * 0.55, 0.14), (x, y, bz + 0.07), mat, c(), rot_z=rot)
            p.box((width * 1.6, width * 0.55, 0.12), (x, y, bz + 0.20), mat, c(), rot_z=rot)
        p.box((width * 0.9, width * 0.9, 0.08), (x, y, height + z - 0.04), mat, c())


def kalasha(p, loc, scale=1.0, mat="MAT_Brass_A", color=None):
    s = scale
    prof = [(0, 0), (0.10 * s, 0), (0.18 * s, 0.10 * s), (0.20 * s, 0.22 * s), (0.12 * s, 0.34 * s), (0.07 * s, 0.38 * s),
            (0.11 * s, 0.44 * s), (0.06 * s, 0.50 * s), (0.04 * s, 0.62 * s), (0.0, 0.72 * s)]
    p.lathe(prof, loc, mat, color or rgb("brass"), segments=12)


def kuta(p, loc, size, color, rng=None):
    """Miniature square shrine (kuta): base, short walls, square dome, finial."""
    x, y, z = loc
    h = size * 0.5
    p.box((size, size, h), (x, y, z + h / 2), "MAT_Plaster_Lime_A", color)
    p.box((size * 1.12, size * 1.12, size * 0.08), (x, y, z + h + size * 0.04), "MAT_Plaster_Lime_A", color)
    dome = [(size * 0.62, 0), (size * 0.66, size * 0.12), (size * 0.58, size * 0.32), (size * 0.36, size * 0.5), (size * 0.12, size * 0.6), (0, size * 0.62)]
    p.lathe(dome, (x, y, z + h + size * 0.08), "MAT_Plaster_Lime_A", color, segments=4, smooth=False, rot_offset=math.pi / 4)
    kalasha(p, (x, y, z + h + size * 0.68), scale=size * 0.35)


def shala(p, loc, length, width, color, along_x=True, rng=None):
    """Miniature barrel-vaulted shrine (shala) with gable ends and finials."""
    x, y, z = loc
    h = width * 0.45
    lx, ly = (length, width) if along_x else (width, length)
    p.box((lx, ly, h), (x, y, z + h / 2), "MAT_Plaster_Lime_A", color)
    p.box((lx * 1.06, ly * 1.12, width * 0.07), (x, y, z + h + width * 0.035), "MAT_Plaster_Lime_A", color)
    # barrel roof as a half-cylinder swept along the long axis
    bm_pts = 7
    zr = z + h + width * 0.07
    rad = width * 0.5
    a_pts, b_pts = [], []
    for i in range(bm_pts + 1):
        a = math.pi * i / bm_pts
        u, v = math.cos(a) * rad, math.sin(a) * rad * 1.15
        if along_x:
            a_pts.append((x - length / 2, y + u, zr + v))
            b_pts.append((x + length / 2, y + u, zr + v))
        else:
            a_pts.append((x + u, y - length / 2, zr + v))
            b_pts.append((x + u, y + length / 2, zr + v))
    p.quad_strip(a_pts, b_pts, "MAT_Plaster_Lime_A", color, smooth=True)
    # gable end caps
    for pts in (a_pts, b_pts):
        verts = [p.bm.verts.new(q) for q in pts]
        f = p.bm.faces.new(verts)
        p._finish([f], "MAT_Plaster_Lime_A", color)
    n = 3 if length > width * 1.6 else 1
    for i in range(n):
        t = (i + 0.5) / n - 0.5
        fx, fy = (x + t * length * 0.8, y) if along_x else (x, y + t * length * 0.8)
        kalasha(p, (fx, fy, zr + rad * 1.1), scale=width * 0.3)


def hara(p, hw, hd, z, unit, colors, rng, cx=0.0, cy=0.0):
    """Parapet of miniature shrines around a rectangle centred at (cx, cy): kutas at corners, shalas mid-sides."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            kuta(p, (cx + sx * (hw - unit / 2), cy + sy * (hd - unit / 2), z), unit, colors[0], rng)
    span_x = 2 * hw - 2 * unit - 0.3
    span_y = 2 * hd - 2 * unit - 0.3
    if span_x > unit:
        for sy in (-1, 1):
            shala(p, (cx, cy + sy * (hd - unit * 0.4), z), span_x * 0.55, unit * 0.8, colors[1], along_x=True, rng=rng)
    if span_y > unit:
        for sx in (-1, 1):
            shala(p, (cx + sx * (hw - unit * 0.4), cy, z), span_y * 0.55, unit * 0.8, colors[1], along_x=False, rng=rng)


def block_course_wall(p, length, height, thick, loc, rng, course=0.42, block=0.9, stone="granite", gap=0.014, rot=0.0):
    """Wall of staggered dressed blocks along local X, base centred at loc."""
    import mathutils
    x0, y0, z0 = loc
    cr, sr = math.cos(rot), math.sin(rot)
    rows = max(1, round(height / course))
    ch = height / rows
    for row in range(rows):
        offset = (block / 2) if row % 2 else 0
        xs = -length / 2 - offset
        while xs < length / 2:
            bl = block * (0.75 + rng.random() * 0.5)
            a = max(xs, -length / 2)
            b = min(xs + bl, length / 2)
            if b - a > 0.08:
                cx = (a + b) / 2
                inset = rng.random() * 0.02
                wx, wy = x0 + cx * cr, y0 + cx * sr
                p.box((b - a - gap, thick - inset, ch - gap), (wx, wy, z0 + row * ch + ch / 2), "MAT_Stone_Granite_A", rgb(stone, 0.07, rng), rot_z=rot)
            xs += bl


def tile_roof_slope(p, x0, x1, y_eave, z_eave, y_ridge, z_ridge, rng, pitch=0.24, color="tile"):
    """Clay tile slope: underlay quad plus half-round tile rows running from eave to ridge."""
    p.quad_strip([(x0, y_eave, z_eave), (x1, y_eave, z_eave)], [(x0, y_ridge, z_ridge), (x1, y_ridge, z_ridge)], "MAT_Terracotta_A", rgb(color, 0.04, rng), smooth=False)
    n = int((x1 - x0) / pitch)
    for i in range(n + 1):
        x = x0 + i * (x1 - x0) / n
        c = rgb(color, 0.10, rng)
        p.tube([(x, y_eave, z_eave + 0.03), (x, y_ridge, z_ridge + 0.03)], [0.065, 0.065], "MAT_Terracotta_A", c, segments=6, smooth=True)
