"""Sculpted head, eyes, brows, mouth and jointed hands for the procedural characters.

The head is one continuous UV surface deformed by anatomical landmarks (brow ridge, eye sockets, nose bridge
and tip, nostril wings, cheekbones, muzzle, lips, chin, jaw angle) instead of separate blobs, so it shades as
a single form from every camera angle. Coordinates: character faces -Y, +X is the character's left, Z up.
"""
import math
from mathutils import Vector

V = Vector


def _g(x, sigma):
    return math.exp(-(x * x) / (2 * sigma * sigma))


def _smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def _interp(points, x):
    """Piecewise-linear lookup in [(x, y), ...] sorted by x."""
    if x <= points[0][0]:
        return points[0][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return points[-1][1]


# Head width multiplier by height on the unit sphere (+1 crown, -1 chin): temples, cheekbones, jaw angle, chin.
WIDTH = [(-1.0, 0.44), (-0.85, 0.66), (-0.62, 0.88), (-0.45, 0.94), (-0.15, 0.98), (0.2, 1.0), (0.6, 0.95), (1.0, 0.80)]


class HeadShape:
    """Deformation of a unit sphere into a stylised but structured head. `fem` softens brow and jaw."""

    def __init__(self, center, rx, ry, rz, fem=False, nose=1.0, jaw=1.0):
        self.c = V(center)
        self.r = (rx, ry, rz)
        self.fem = fem
        self.nose = nose
        self.jaw = jaw

    def point(self, ux, uy, uz):
        """Surface point for a unit direction (ux, uy, uz); front of the face is -uy."""
        f = max(0.0, -uy)  # 1 at the very front
        ax = abs(ux)
        w = _interp(WIDTH, uz)
        if self.jaw != 1.0 and uz < -0.3:
            w *= 1 + (self.jaw - 1) * _smooth(-0.3, -0.7, uz)
        x, y, z = ux * w, uy, uz
        # the face is flatter than the skull behind it, and the lower face recedes under the nose
        if uy < 0:
            y *= 0.9 - 0.06 * _smooth(-0.2, -0.8, uz)
        else:
            y *= 1.0 + 0.06 * _smooth(0.0, 0.6, uz)  # occiput
        d = 0.0
        brow = 0.045 if self.fem else 0.07
        d += brow * _g(uz - 0.25, 0.075) * _g(ax - 0.33, 0.22) * f ** 2
        d -= 0.085 * _g(uz - 0.09, 0.085) * _g(ax - 0.36, 0.12) * f ** 2  # eye sockets
        # nose: bridge rising from between the eyes to a rounded tip, then tucking under to the septum
        prof = _interp([(-0.46, 0.0), (-0.40, 0.09), (-0.34, 0.165), (-0.25, 0.15), (-0.05, 0.08), (0.1, 0.035), (0.2, 0.0)], uz)
        width = 0.055 + 0.06 * _g(uz + 0.32, 0.07)
        d += self.nose * prof * _g(ux, width) * f ** 4
        d += 0.06 * _g(uz + 0.36, 0.05) * _g(ax - 0.12, 0.05) * f ** 3  # nostril wings
        d += 0.05 * _g(uz + 0.06, 0.11) * _g(ax - 0.6, 0.14) * f  # cheekbones
        d -= 0.03 * _g(uz + 0.42, 0.12) * _g(ax - 0.62, 0.13) * f  # hollow under the cheekbone
        d += 0.05 * _g(uz + 0.55, 0.15) * _g(ux, 0.3) * f ** 2  # muzzle over the teeth
        d += 0.036 * _g(uz + 0.515, 0.03) * _g(ux, 0.23) * f ** 4  # upper lip
        d += 0.045 * _g(uz + 0.62, 0.037) * _g(ux, 0.2) * f ** 4  # lower lip
        d -= 0.026 * _g(uz + 0.567, 0.011) * _g(ux, 0.24) * f ** 3  # mouth line
        d -= 0.018 * _g(uz + 0.72, 0.04) * _g(ux, 0.2) * f ** 3  # crease under the lower lip
        d += (0.04 if self.fem else 0.06) * _g(uz + 0.86, 0.08) * _g(ux, 0.22) * f ** 2  # chin
        d += (0.015 if self.fem else 0.035) * _g(uz + 0.6, 0.1) * _g(ax - 0.82, 0.14)  # jaw angle
        n = V((x, y, z)).normalized()
        p = V((x, y, z)) + n * d
        return self.c + V((p.x * self.r[0], p.y * self.r[1], p.z * self.r[2]))

    def landmark(self, ux, uz, inset=0.0):
        """Surface point for a face landmark at (ux, uz) on the front of the unit sphere."""
        uy = -math.sqrt(max(0.0, 1 - ux * ux - uz * uz))
        p = self.point(ux, uy, uz)
        return p - (p - self.c).normalized() * inset

    def zone(self, ux, uy, uz):
        """Region name for colouring a vertex."""
        if uy < -0.55 and abs(ux) < 0.23 - 6 * (uz + 0.567) ** 2:  # the mouth narrows toward the lip edges
            if abs(uz + 0.567) < 0.012:
                return "mouth"
            if -0.545 < uz < -0.49 or -0.665 < uz < -0.575:
                return "lip"
        return "skin"


def _samples(breaks):
    """breaks: [(value, count_to_next), ..., (last, 0)] -> evenly spaced values per span (dense where counts are high)."""
    out = []
    for (v0, n), (v1, _) in zip(breaks, breaks[1:]):
        out += [v0 + (v1 - v0) * k / n for k in range(n)]
    out.append(breaks[-1][0])
    return out


# ring heights (uz) from just under the crown to just above the chin pole: dense over the eyes, nose and mouth
HEAD_UZ = _samples([(0.985, 5), (0.45, 13), (-0.4, 15), (-0.76, 4), (-0.985, 0)])
# azimuth (0 = front of the face, radians): dense across the face, sparse behind the ears
HEAD_PHI = _samples([(0.0, 11), (1.15, 5), (2.2, 4), (math.pi, 0)])
HEAD_PHI = HEAD_PHI + [2 * math.pi - x for x in reversed(HEAD_PHI[1:-1])]


def _dir(uz, phi):
    st = math.sqrt(max(0.0, 1 - uz * uz))
    return st * math.sin(phi), -st * math.cos(phi), uz


def build_head(p, shape, colors):
    """One continuous skinned head surface. colors: {'skin','lip','mouth'}."""
    pts, cols = [], []
    for uz in HEAD_UZ:
        row, crow = [], []
        for ph in HEAD_PHI:
            ux, uy, _ = _dir(uz, ph)
            row.append(shape.point(ux, uy, uz))
            crow.append(colors[shape.zone(ux, uy, uz)])
        pts.append(row)
        cols.append(crow)
    p.surface(pts, cols, "MAT_Skin_A", top=(shape.point(0, 0, 1), colors["skin"]), bottom=(shape.point(0, 0, -1), colors["skin"]))


def hairline_uz(phi, front=0.5, side=0.08, back=-0.42):
    """Lowest uz the hair reaches at azimuth phi: forehead, temples, above the ears, nape."""
    a = abs(math.atan2(math.sin(phi), math.cos(phi)))  # 0 front .. pi back
    pts = [(0.0, front), (0.55, front - 0.1), (1.2, side + 0.1), (1.6, side), (2.3, back + 0.12), (math.pi, back)]
    return _interp(pts, a)


def build_hair_cap(p, shape, color, thick=0.012, front=0.5, side=0.08, back=-0.42, volume=1.0):
    """Hair as a shell offset from the scalp down to a hairline (no helmet over the face)."""
    phis = [2 * math.pi * k / 30 for k in range(30)]
    rows = []
    for i in range(1, 10):
        t = i / 9
        row = []
        for ph in phis:
            lo = hairline_uz(ph, front, side, back)
            uz = 1 - (1 - lo) * t
            ux, uy, _ = _dir(uz, ph)
            q = shape.point(ux, uy, uz)
            n = (q - shape.c).normalized()
            row.append(q + n * (0.003 + thick * volume * (1 - 0.75 * t ** 2)))
        rows.append(row)
    cols = [[color] * len(phis) for _ in rows]
    top = shape.point(0, 0, 1) + V((0, 0, 0.003 + thick * volume))
    p.surface(rows, cols, "MAT_Hair_A", top=(top, color))
    # the underside of the edge, so the shell has no visible inside from below
    edge = rows[-1]
    inner = [shape.c + (q - shape.c) * 0.97 for q in edge]
    p.sheet([edge + [edge[0]], inner + [inner[0]]], "MAT_Hair_A", color)


def build_eyes(p, shape, colors, scale=1.0, iris_color=(0.2, 0.11, 0.05, 1)):
    """Eyeballs set into the sockets, with an iris, pupil, catch-light and upper and lower lids."""
    r = 0.0125 * scale
    for sx in (-1, 1):
        socket = shape.landmark(sx * 0.36, 0.09)
        out = (socket - shape.c).normalized()
        fwd = (out * 0.35 + V((0, -1, 0)) * 0.65).normalized()  # gaze straight ahead, slightly outward
        c = socket - out * (r * 0.55)
        p.ico(1.0, tuple(c), "MAT_Eye_A", colors["sclera"], subdiv=2, scale=(r, r, r))
        side = fwd.cross(V((0, 0, 1))).normalized()
        up = side.cross(fwd).normalized()
        # iris and pupil as shallow caps on the front of the ball
        for rad, depth, color in ((r * 0.52, r * 0.93, iris_color), (r * 0.24, r * 0.985, colors["pupil"])):
            ring = [c + fwd * depth + (side * math.cos(a) + up * math.sin(a)) * rad for a in (2 * math.pi * k / 12 for k in range(12))]
            tip = c + fwd * (r * 1.01 + (0.0004 if color is colors["pupil"] else 0))
            p.fan(ring, tip, "MAT_Eye_A", color)
        p.ico(1.0, tuple(c + fwd * r * 1.02 + up * r * 0.28 + side * (-sx) * r * 0.22), "MAT_Eye_A", colors["glint"], subdiv=0, scale=(r * 0.09,) * 3)
        # lids: partial shells of a slightly larger sphere; the upper lid covers the top of the iris
        for lo, hi, color, thick in ((0.32, 1.0, colors["lid"], 1.14), (-1.0, -0.62, colors["lid_low"], 1.1)):
            shell = []
            for k in range(4):
                v = lo + (hi - lo) * k / 3
                row = []
                for m in range(9):
                    a = -1.25 + 2.5 * m / 8
                    d = (fwd * math.cos(a) * math.sqrt(max(0.0, 1 - v * v)) + side * math.sin(a) * math.sqrt(max(0.0, 1 - v * v)) + up * v)
                    row.append(c + d * r * thick)
                shell.append(row)
            p.sheet(shell, "MAT_Skin_A", color)
        # lash line along the upper lid edge
        edge = []
        for m in range(9):
            a = -1.25 + 2.5 * m / 8
            v = 0.32
            d = fwd * math.cos(a) * math.sqrt(1 - v * v) + side * math.sin(a) * math.sqrt(1 - v * v) + up * v
            edge.append(c + d * r * 1.16)
        p.ribbon(edge, [r * 0.16 * (1 - abs(m - 4) / 6.5) for m in range(9)], up, "MAT_Hair_A", colors["lash"])


def build_brows(p, shape, color, thickness=1.0, arch=1.0):
    """Tapered brow strips lying on the brow ridge."""
    for sx in (-1, 1):
        pts, widths = [], []
        for k in range(8):
            t = k / 7
            ux = sx * (0.13 + 0.42 * t)
            uz = 0.235 + 0.045 * arch * math.sin(math.pi * min(1.0, t * 1.25)) - 0.03 * t
            pts.append(shape.landmark(ux, uz) + (shape.landmark(ux, uz) - shape.c).normalized() * 0.0025)
            widths.append(0.0075 * thickness * (1.15 - 0.75 * t))
        p.ribbon(pts, widths, V((0, 0, 1)), "MAT_Hair_A", color)


def build_ears(p, shape, color, dark):
    for sx in (-1, 1):
        base = shape.c + V((sx * shape.r[0] * 0.93, shape.r[1] * 0.08, -shape.r[2] * 0.08))
        p.ico(1.0, tuple(base + V((sx * 0.006, 0.004, 0))), "MAT_Skin_A", color, subdiv=2, scale=(0.008, 0.02, 0.031))
        p.ico(1.0, tuple(base + V((sx * 0.011, 0.0, 0.002))), "MAT_Skin_A", dark, subdiv=1, scale=(0.003, 0.012, 0.019))  # concha
        p.ico(1.0, tuple(base + V((sx * 0.008, 0.002, -0.026))), "MAT_Skin_A", color, subdiv=1, scale=(0.006, 0.009, 0.01))  # lobe


# --------------------------------------------------------------------------- hands
FINGERS = ("index", "middle", "ring", "pinky")
# (proximal, middle+distal) lengths in metres for a 1.75 m body, and offset along the hand
FINGER_LEN = {"index": (0.044, 0.05), "middle": (0.048, 0.055), "ring": (0.045, 0.05), "pinky": (0.035, 0.04)}
FINGER_BACK = {"index": 0.0, "middle": 0.003, "ring": 0.008, "pinky": 0.016}


def hand_frame(body, side):
    """Wrist, along-hand direction, palm normal (toward the thigh) and front (thumb side) vectors."""
    sx = 1 if side == "L" else -1
    w = getattr(body, f"wrist_{side}")
    d = (getattr(body, f"hand_tip_{side}") - w).normalized()
    front = V((0, -1, 0))
    front = (front - d * front.dot(d)).normalized()
    palm = d.cross(front).normalized() * (1 if sx < 0 else -1)
    if palm.x * sx > 0:  # palm must face inward (toward -sx)
        palm = -palm
    return w, d, palm, front


def finger_joints(body, side):
    """{finger: (knuckle, pip, tip)} and thumb (cmc, mcp, tip) in rest pose."""
    s = body.s
    w, d, palm, front = hand_frame(body, side)
    out = {}
    for k, f in enumerate(FINGERS):
        knuckle = w + d * (0.086 - FINGER_BACK[f]) * s + front * (0.025 - k * 0.0165) * s + palm * 0.002
        l1, l2 = FINGER_LEN[f]
        # a relaxed hand: fingers curve slightly toward the palm
        d1 = (d + palm * 0.12).normalized()
        d2 = (d + palm * 0.35).normalized()
        pip = knuckle + d1 * l1 * s
        tip = pip + d2 * l2 * s
        out[f] = (knuckle, pip, tip)
    cmc = w + d * 0.022 * s + front * 0.024 * s + palm * 0.008
    t1 = (d * 0.55 + front * 0.7 + palm * 0.3).normalized()
    t2 = (d * 0.75 + front * 0.45 + palm * 0.45).normalized()
    mcp = cmc + t1 * 0.042 * s
    out["thumb"] = (cmc, mcp, mcp + t2 * 0.05 * s)
    return out


def build_hand(p, body, side, skin, knuckle_shade, weight_fn_for):
    """Palm continuous with the forearm, three-phalanx fingers with knuckles, opposable thumb."""
    s = body.s
    nail = (min(1.0, skin[0] * 1.25 + 0.06), min(1.0, skin[1] * 1.15 + 0.05), min(1.0, skin[2] * 1.15 + 0.05), 1)
    w, d, palm, front = hand_frame(body, side)
    joints = finger_joints(body, side)
    # palm: rounded-rectangle loft from inside the wrist to the knuckles
    p.weight_fn = weight_fn_for("palm")
    rings = []
    for t, wd, th in ((-0.014, 0.046, 0.036), (0.008, 0.054, 0.033), (0.035, 0.068, 0.03), (0.062, 0.077, 0.027), (0.082, 0.076, 0.024), (0.094, 0.062, 0.018)):
        c = w + d * t * s + front * 0.002
        rings.append((c, wd * s / 2, th * s / 2))
    p.rect_loft(rings, front, palm, "MAT_Skin_A", skin, segments=14, exponent=0.8)
    p.weight_fn = weight_fn_for("thumb")
    p.ico(1.0, tuple(w + d * 0.03 * s + front * 0.018 * s + palm * 0.01 * s), "MAT_Skin_A", skin, subdiv=2, scale=(0.017 * s, 0.017 * s, 0.024 * s))  # thenar pad
    for f in FINGERS:
        knuckle, pip, tip = joints[f]
        l2 = (tip - pip).length
        dip = pip + (tip - pip) * 0.55
        r0 = {"index": 0.0095, "middle": 0.0098, "ring": 0.0092, "pinky": 0.008}[f] * s
        p.weight_fn = weight_fn_for(f)
        p.tube([tuple(knuckle - (pip - knuckle).normalized() * 0.012), tuple(knuckle), tuple(knuckle.lerp(pip, 0.55)), tuple(pip), tuple(dip), tuple(tip)],
               [r0 * 0.95, r0 * 1.08, r0 * 0.92, r0 * 0.95, r0 * 0.85, r0 * 0.62], "MAT_Skin_A", skin, segments=7)
        # fingernail
        n = (tip - dip).normalized()
        p.ico(1.0, tuple(tip - n * l2 * 0.12 - palm * r0 * 0.5), "MAT_Skin_A", nail, subdiv=1, scale=(r0 * 0.6, r0 * 0.6, r0 * 0.45))
    cmc, mcp, ttip = joints["thumb"]
    p.weight_fn = weight_fn_for("thumb")
    tr = 0.0115 * s
    p.tube([tuple(cmc - (mcp - cmc).normalized() * 0.01), tuple(cmc), tuple(mcp), tuple(mcp.lerp(ttip, 0.5)), tuple(ttip)],
           [tr * 1.3, tr * 1.25, tr * 1.0, tr * 0.92, tr * 0.68], "MAT_Skin_A", skin, segments=7)
