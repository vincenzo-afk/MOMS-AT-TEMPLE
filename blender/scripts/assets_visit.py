"""Temple Visit assets (GAME_DESIGN.md): the auto-rickshaw, chappal stand, queue rails, ritual stations, exit props,
the neighbourhood shrine and the hill temple. Original procedural work, project-owned."""
import math
import random
from tom.core import Part, rgb, root, collider, empty, export_asset
from tom.props import plank, pot, basket, heap

ASSETS = {}


def asset(fn):
    ASSETS[fn.__name__] = fn
    return fn


def c(name, j=0.0, rng=None):
    return rgb(name, j, rng)


@asset
def PRP_Auto_Rickshaw_A():
    """Three-wheeled auto-rickshaw: yellow canopy over a black body, front wheel under the cab, two rear wheels.
    WHEEL_* nodes spin at runtime; SOCKET_Driver is the seat, SOCKET_Door the boarding point (front is -Y)."""
    rng = random.Random(4101)
    rt = root("PRP_Auto_Rickshaw_A")
    p = Part()
    # floor pan and rear body
    p.box((1.3, 2.3, 0.12), (0, 0.1, 0.36), "MAT_Iron_A", c("auto_black"))
    p.box((1.36, 0.95, 0.55), (0, 0.72, 0.68), "MAT_Iron_A", c("auto_black"))  # rear body / engine cover
    p.box((1.2, 0.4, 0.35), (0, 0.72, 0.62), "MAT_Cloth_A", c("auto_black"))  # passenger bench base
    p.box((1.16, 0.38, 0.12), (0, 0.62, 0.86), "MAT_Cloth_A", c("cloth_indigo"))  # bench cushion
    p.box((1.16, 0.08, 0.5), (0, 0.86, 1.12), "MAT_Cloth_A", c("cloth_indigo"))  # backrest
    # front cowl, windscreen frame and driver seat
    p.box((0.7, 0.35, 0.95), (0, -0.92, 0.85), "MAT_Iron_A", c("auto_yellow"), taper=(0.75, 1.0))
    p.box((0.62, 0.04, 0.55), (0, -0.88, 1.6), "MAT_Water_A", (0.55, 0.65, 0.7, 1))  # windscreen
    p.box((0.5, 0.3, 0.1), (0, -0.35, 0.9), "MAT_Cloth_A", c("auto_black"))  # driver seat
    # handlebar
    p.tube([(-0.32, -0.7, 1.25), (0, -0.74, 1.3), (0.32, -0.7, 1.25)], [0.018] * 3, "MAT_Iron_A", c("steel"), segments=6)
    p.tube([(0, -0.74, 1.3), (0, -0.92, 0.6)], [0.025] * 2, "MAT_Iron_A", c("steel"), segments=6)
    # canopy: yellow top with a black frame, side posts
    p.box((1.42, 2.1, 0.06), (0, 0.05, 1.92), "MAT_Cloth_A", c("auto_yellow"))
    p.box((1.44, 0.06, 0.4), (0, 1.08, 1.7), "MAT_Cloth_A", c("auto_black"))
    for sx in (-1, 1):
        p.box((0.04, 2.0, 0.06), (sx * 0.7, 0.05, 1.88), "MAT_Iron_A", c("auto_black"))
        for y in (-0.8, 1.05):
            p.box((0.04, 0.04, 1.4), (sx * 0.66, y, 1.2), "MAT_Iron_A", c("steel"))
        p.box((0.04, 0.6, 0.35), (sx * 0.68, 0.72, 1.2), "MAT_Iron_A", c("auto_yellow"))  # side panel
    # headlamp, number plate, a garland of marigolds on the cowl
    p.ico(1.0, (0, -1.1, 1.05), "MAT_Emissive_A", c("paper"), subdiv=1, scale=(0.09, 0.05, 0.09))
    p.box((0.3, 0.02, 0.1), (0, 1.2, 0.6), "MAT_Iron_A", c("paper"))
    for k in range(9):
        a = math.pi * (0.15 + 0.7 * k / 8)
        p.ico(1.0, (math.cos(a) * 0.28, -1.08, 1.32 - math.sin(a) * 0.12), "MAT_Foliage_A", c("marigold"), subdiv=1, scale=(0.03, 0.03, 0.03))
    p.to_object("PRP_Auto_Rickshaw_A_Mesh").parent = rt
    # wheels: separate nodes so the game can spin them
    for name, (x, y) in (("WHEEL_F", (0, -0.95)), ("WHEEL_RL", (0.66, 0.75)), ("WHEEL_RR", (-0.66, 0.75))):
        w = Part()
        w.lathe([(0.0, -0.06), (0.2, -0.06), (0.22, -0.03), (0.22, 0.03), (0.2, 0.06), (0.0, 0.06)], (0, 0, 0), "MAT_Iron_A", c("auto_black"), segments=16)
        w.lathe([(0.0, -0.065), (0.1, -0.065), (0.1, 0.065), (0.0, 0.065)], (0, 0, 0), "MAT_Iron_A", c("steel"), segments=10)
        obj = w.to_object(name)
        obj.rotation_euler = (0, math.pi / 2, 0)  # axle along X
        obj.location = (x, y, 0.22)
        obj.parent = rt
    collider("Body", (1.45, 2.4, 1.9), (0, 0.08, 0.95), parent=rt)
    empty("SOCKET_Driver", (0, -0.35, 0.95), parent=rt)
    empty("SOCKET_Door", (0.95, -0.35, 0.0), parent=rt)
    return export_asset("PRP_Auto_Rickshaw_A", "props", rt, required=["COL_Body", "WHEEL_F", "SOCKET_Driver"]), rt


@asset
def PRP_Chappal_Stand_A():
    """Paid chappal stand: a token counter and tiered racks full of sandals."""
    rng = random.Random(4102)
    rt = root("PRP_Chappal_Stand_A")
    p = Part()
    plank(p, (1.6, 0.6, 0.9), (0, -0.55, 0.45), rng, "teak_dark")
    plank(p, (1.7, 0.7, 0.05), (0, -0.55, 0.92), rng, "teak")
    for k in range(4):
        z = 0.3 + k * 0.38
        plank(p, (2.4, 0.4, 0.04), (0, 0.35, z), rng, "teak")
        for i in range(14):
            x = -1.1 + i * 0.165
            col = ["chappal", "auto_black", "red_oxide", "teak"][(i + k) % 4]
            for dx in (-0.035, 0.035):
                p.box((0.06, 0.24, 0.02), (x + dx, 0.35, z + 0.03), "MAT_Wood_Teak_A", c(col, 0.08, rng))
    for sx in (-1, 1):
        plank(p, (0.06, 0.45, 1.6), (sx * 1.22, 0.35, 0.8), rng, "teak_dark")
    p.box((0.5, 0.02, 0.28), (0, -0.86, 1.25), "MAT_Wood_Teak_A", c("paper"))  # tariff board
    p.to_object("PRP_Chappal_Stand_A_Mesh").parent = rt
    collider("Counter", (1.7, 0.7, 0.95), (0, -0.55, 0.47), parent=rt)
    collider("Racks", (2.5, 0.5, 1.6), (0, 0.35, 0.8), parent=rt)
    empty("SOCKET_Counter", (0, -1.2, 0.0), parent=rt)
    return export_asset("PRP_Chappal_Stand_A", "props", rt, required=["COL_Counter"]), rt


@asset
def PRP_Queue_Rails_A():
    """Darshan queue: three lanes (FREE, RS 20, RS 100) between steel rails, 14 m long, lane signs at the entry.
    Lanes run along -Y (the far end is the temple side). Rail colliders keep the crowd in its lane."""
    rng = random.Random(4103)
    rt = root("PRP_Queue_Rails_A")
    p = Part()
    length = 14.0
    xs = [-2.4, -0.8, 0.8, 2.4]
    for x in xs:
        for z in (0.45, 0.95):
            p.tube([(x, 0.0, z), (x, -length, z)], [0.03, 0.03], "MAT_Iron_A", c("steel"), segments=8)
        for k in range(8):
            y = -k * (length / 7)
            p.tube([(x, y, 0.0), (x, y, 1.0)], [0.035, 0.035], "MAT_Iron_A", c("steel"), segments=8)
    for i, (label_col, x) in enumerate((("cloth_white", -1.6), ("marigold_yellow", 0.0), ("cloth_red", 1.6))):
        p.box((1.3, 0.05, 0.45), (x, 0.15, 1.65), "MAT_Wood_Teak_A", c(label_col))
        p.tube([(x, 0.15, 1.0), (x, 0.15, 1.45)], [0.025] * 2, "MAT_Iron_A", c("steel"), segments=6)
        # a painted mark per lane: 1 / 2 / 3 stripes
        for s in range(i + 1):
            p.box((0.12, 0.06, 0.25), (x - 0.2 + s * 0.2, 0.12, 1.65), "MAT_Wood_Teak_A", c("auto_black"))
    p.to_object("PRP_Queue_Rails_A_Mesh").parent = rt
    for i, x in enumerate(xs):
        collider(f"Rail_{i}", (0.1, length, 1.0), (x, -length / 2, 0.5), parent=rt)
    for i, x in enumerate((-1.6, 0.0, 1.6)):
        empty(f"SOCKET_Lane_{i}", (x, 0.6, 0.0), parent=rt)
        empty(f"SOCKET_LaneEnd_{i}", (x, -length + 0.4, 0.0), parent=rt)
    return export_asset("PRP_Queue_Rails_A", "props", rt, required=["COL_Rail_0", "SOCKET_Lane_1"]), rt


@asset
def PRP_Coconut_Stone_A():
    """Coconut-breaking stone in front of a low railing, with broken shells and a heap of whole coconuts."""
    rng = random.Random(4104)
    rt = root("PRP_Coconut_Stone_A")
    p = Part()
    p.box((0.7, 0.6, 0.45), (0, 0, 0.225), "MAT_Stone_Granite_A", c("granite_dark", 0.05, rng), taper=(0.85, 0.85))
    for k in range(5):
        a = k * 1.3
        p.ico(1.0, (math.cos(a) * 0.5, 0.35 + math.sin(a) * 0.15, 0.04), "MAT_Wood_Teak_A", c("coconut", 0.1, rng), subdiv=1, scale=(0.07, 0.07, 0.035))
    heap(p, (-0.9, -0.2, 0.0), 0.3, 7, "coconut", rng, size=0.09, mat="MAT_Wood_Teak_A")
    for x in (-0.9, 0.0, 0.9):
        p.tube([(x, 0.7, 0.0), (x, 0.7, 0.8)], [0.03] * 2, "MAT_Iron_A", c("steel"), segments=6)
    p.tube([(-0.95, 0.7, 0.8), (0.95, 0.7, 0.8)], [0.03] * 2, "MAT_Iron_A", c("steel"), segments=6)
    p.to_object("PRP_Coconut_Stone_A_Mesh").parent = rt
    collider("Stone", (0.7, 0.6, 0.45), (0, 0, 0.225), parent=rt)
    collider("Rail", (1.9, 0.08, 0.8), (0, 0.7, 0.4), parent=rt)
    empty("SOCKET_Stand", (0, -0.65, 0.0), parent=rt)
    return export_asset("PRP_Coconut_Stone_A", "props", rt, required=["COL_Stone", "SOCKET_Stand"]), rt


@asset
def PRP_Lamp_Stand_A():
    """Tiered brass lamp stand with nine small oil lamps; FLAME_L1..L9 are lit by the player one by one."""
    rng = random.Random(4105)
    rt = root("PRP_Lamp_Stand_A")
    p = Part()
    p.lathe([(0.0, 0.0), (0.32, 0.0), (0.3, 0.06), (0.08, 0.1), (0.05, 0.9), (0.1, 0.95), (0.0, 0.97)], (0, 0, 0), "MAT_Brass_A", c("brass"), segments=18)
    lamps = []
    for tier, (r, z, n) in enumerate(((0.36, 0.45, 4), (0.26, 0.7, 3), (0.14, 0.95, 2))):
        p.lathe([(0.0, -0.01), (r + 0.06, -0.01), (r + 0.06, 0.01), (0.0, 0.01)], (0, 0, z), "MAT_Brass_A", c("brass"), segments=18)
        for k in range(n):
            a = 2 * math.pi * k / n + tier * 0.4
            pos = (math.cos(a) * r, math.sin(a) * r, z + 0.02)
            pot(p, pos, 0.35, rng, color="terracotta")
            lamps.append(pos)
    p.to_object("PRP_Lamp_Stand_A_Mesh").parent = rt
    for i, (x, y, z) in enumerate(lamps):
        f = Part()
        f.ico(1.0, (0, 0, 0), "MAT_Emissive_A", c("flame"), subdiv=1, scale=(0.02, 0.02, 0.045))
        obj = f.to_object(f"FLAME_L{i + 1}")
        obj.location = (x, y, z + 0.07)
        obj.parent = rt
    collider("Stand", (0.8, 0.8, 1.0), (0, 0, 0.5), parent=rt)
    empty("SOCKET_Stand", (0, -0.75, 0.0), parent=rt)
    return export_asset("PRP_Lamp_Stand_A", "props", rt, required=["COL_Stand", "FLAME_L1", "FLAME_L9"]), rt


@asset
def PRP_Prasadam_Counter_A():
    """Prasadam counter: a stall with laddoo trays, puliyodarai bowls in leaf cups and a paper-wrapped stack."""
    rng = random.Random(4106)
    rt = root("PRP_Prasadam_Counter_A")
    p = Part()
    plank(p, (2.4, 0.7, 0.95), (0, 0, 0.475), rng, "teak_dark")
    plank(p, (2.5, 0.8, 0.05), (0, 0, 0.97), rng, "teak")
    for k in range(3):
        x = -0.8 + k * 0.8
        p.lathe([(0.0, 0.0), (0.28, 0.0), (0.3, 0.04), (0.0, 0.04)], (x, 0.05, 1.0), "MAT_Brass_A", c("brass"), segments=16)
        heap(p, (x, 0.05, 1.03), 0.22, 14, "laddoo", rng, size=0.05, mat="MAT_Terracotta_A")
    for k in range(6):
        p.box((0.16, 0.12, 0.08), (-1.0 + k * 0.4, -0.25, 1.04), "MAT_Cloth_A", c("paper", 0.05, rng))
    for sx in (-1, 1):
        p.tube([(sx * 1.2, 0.35, 0.95), (sx * 1.2, 0.35, 2.3)], [0.04] * 2, "MAT_Wood_Teak_A", c("teak_dark"), segments=6)
    p.box((2.6, 1.0, 0.05), (0, 0.1, 2.3), "MAT_Cloth_A", c("cloth_saffron"))
    p.to_object("PRP_Prasadam_Counter_A_Mesh").parent = rt
    collider("Counter", (2.5, 0.8, 1.0), (0, 0, 0.5), parent=rt)
    empty("SOCKET_Front", (0, -1.0, 0.0), parent=rt)
    return export_asset("PRP_Prasadam_Counter_A", "props", rt, required=["COL_Counter", "SOCKET_Front"]), rt


@asset
def PRP_Annadanam_Mats_A():
    """Annadanam: two rows of floor mats with banana-leaf plates and rice, a brass serving bucket."""
    rng = random.Random(4107)
    rt = root("PRP_Annadanam_Mats_A")
    p = Part()
    for row in (-0.7, 0.7):
        p.box((4.0, 0.8, 0.02), (0, row, 0.01), "MAT_Cloth_A", c("basket", 0.05, rng))
        for k in range(6):
            x = -1.7 + k * 0.68
            p.box((0.45, 0.32, 0.01), (x, row - 0.1 * (1 if row > 0 else -1), 0.025), "MAT_Foliage_A", c("banana_leaf", 0.08, rng))
            heap(p, (x, row - 0.1 * (1 if row > 0 else -1), 0.03), 0.07, 4, "plaster", rng, size=0.03, mat="MAT_Cloth_A")
    pot(p, (2.3, 0.0, 0.0), 1.2, rng, color="brass", mat="MAT_Brass_A")
    p.to_object("PRP_Annadanam_Mats_A_Mesh").parent = rt
    collider("Floor", (4.2, 2.2, 0.03), (0, 0, 0.015), kind="WALK", parent=rt)
    empty("SOCKET_Serve", (0, 0, 0.0), parent=rt)
    return export_asset("PRP_Annadanam_Mats_A", "props", rt, required=["SOCKET_Serve"]), rt


@asset
def PRP_Bush_Hide_A():
    """Dense hibiscus bush: a believable place to hide a pair of chappals."""
    rng = random.Random(4108)
    rt = root("PRP_Bush_Hide_A")
    p = Part()
    for k in range(9):
        a = rng.random() * 2 * math.pi
        r = rng.random() * 0.35
        p.ico(1.0, (math.cos(a) * r, math.sin(a) * r, 0.35 + rng.random() * 0.3), "MAT_Foliage_A", c("leaf", 0.12, rng), subdiv=2,
              scale=(0.38, 0.38, 0.32), noise=0.12, rng=rng)
    for k in range(10):
        a = rng.random() * 2 * math.pi
        p.ico(1.0, (math.cos(a) * 0.5, math.sin(a) * 0.5, 0.4 + rng.random() * 0.4), "MAT_Foliage_A", c("hibiscus"), subdiv=1, scale=(0.05, 0.05, 0.04))
    p.to_object("PRP_Bush_Hide_A_Mesh").parent = rt
    collider("Bush", (1.1, 1.1, 0.9), (0, 0, 0.45), parent=rt)
    return export_asset("PRP_Bush_Hide_A", "props", rt, required=["COL_Bush"]), rt


@asset
def PRP_Calendar_A():
    """Daily tear-off panchangam calendar for the wall: shows the tithi."""
    rng = random.Random(4109)
    rt = root("PRP_Calendar_A")
    p = Part()
    p.box((0.32, 0.02, 0.45), (0, 0, 0), "MAT_Cloth_A", c("paper"))
    p.box((0.3, 0.025, 0.12), (0, -0.002, 0.14), "MAT_Cloth_A", c("kumkum_red"))
    for k in range(4):
        p.box((0.22, 0.026, 0.012), (0, -0.003, 0.02 - k * 0.04), "MAT_Cloth_A", c("auto_black"))
    p.to_object("PRP_Calendar_A_Mesh").parent = rt
    return export_asset("PRP_Calendar_A", "props", rt), rt


@asset
def PRP_Temple_Bag_A():
    """Cloth temple bag with a coconut, flowers and a kumkum box peeking out."""
    rng = random.Random(4110)
    rt = root("PRP_Temple_Bag_A")
    p = Part()
    p.box((0.36, 0.14, 0.3), (0, 0, 0.15), "MAT_Cloth_A", c("cloth_saffron"), taper=(1.0, 0.85))
    p.tube([(-0.14, 0, 0.29), (0, 0, 0.5), (0.14, 0, 0.29)], [0.012] * 3, "MAT_Cloth_A", c("cloth_saffron"), segments=5)
    p.ico(1.0, (0.06, 0, 0.32), "MAT_Wood_Teak_A", c("coconut"), subdiv=1, scale=(0.08, 0.08, 0.07))
    heap(p, (-0.08, 0, 0.3), 0.06, 5, "marigold", rng, size=0.03)
    p.to_object("PRP_Temple_Bag_A_Mesh").parent = rt
    return export_asset("PRP_Temple_Bag_A", "props", rt), rt


@asset
def ENV_Shrine_Small_A():
    """Neighbourhood temple: a single-cell stone shrine on a plinth with a small vimana, bell and lamp post."""
    rng = random.Random(4111)
    rt = root("ENV_Shrine_Small_A")
    p = Part()
    p.box((5.0, 5.0, 0.4), (0, 0, 0.2), "MAT_Stone_Granite_A", c("granite", 0.04, rng))
    p.box((2.6, 2.6, 2.4), (0, 0.5, 1.6), "MAT_Stone_Granite_A", c("granite_new", 0.04, rng))
    p.box((1.0, 0.1, 1.7), (0, -0.82, 1.25), "MAT_Stone_Granite_A", c("dark_recess"))  # doorway
    for k in range(4):
        w = 2.6 - k * 0.5
        p.box((w, w, 0.45), (0, 0.5, 3.0 + k * 0.45), "MAT_Plaster_Lime_A", c("plaster_warm", 0.04, rng))
    p.lathe([(0.0, 0.0), (0.35, 0.0), (0.25, 0.3), (0.05, 0.5), (0.0, 0.55)], (0, 0.5, 4.8), "MAT_Brass_A", c("brass"), segments=12)
    p.lathe([(0.0, 0.0), (0.1, 0.0), (0.1, 0.25), (0.0, 0.25)], (1.6, -1.6, 0.4), "MAT_Brass_A", c("brass"), segments=10)  # bell post base
    p.tube([(1.6, -1.6, 0.4), (1.6, -1.6, 2.2)], [0.05] * 2, "MAT_Iron_A", c("iron"), segments=6)
    p.lathe([(0.0, 0.0), (0.12, 0.0), (0.1, 0.18), (0.0, 0.2)], (1.6, -1.6, 1.95), "MAT_Brass_A", c("brass"), segments=12)
    p.to_object("ENV_Shrine_Small_A_Mesh").parent = rt
    collider("Plinth", (5.0, 5.0, 0.4), (0, 0, 0.2), kind="WALK", parent=rt)
    collider("Cell", (2.6, 2.6, 4.8), (0, 0.5, 2.8), parent=rt)
    empty("SOCKET_Darshan", (0, -1.6, 0.4), parent=rt)
    return export_asset("ENV_Shrine_Small_A", "buildings", rt, required=["WALK_Plinth", "COL_Cell", "SOCKET_Darshan"]), rt


@asset
def ENV_Hill_Temple_A():
    """Hill temple: a rocky hill (6 m) climbed by 30 stone steps with landings and a mandapam, a shrine on top.
    Steps are WALK slabs (0.2 m rise); the slopes are COL so the climb follows the stair."""
    rng = random.Random(4112)
    rt = root("ENV_Hill_Temple_A")
    p = Part()
    rise, run, width = 0.2, 0.42, 2.4
    n = 30
    top = n * rise
    # hill mass: stacked rough slabs narrowing upward
    for k in range(12):
        z = k * 0.5
        w = 20 - k * 1.2
        d = 18 - k * 1.0
        p.box((w, d, 0.52), (0, 2.0 + k * 0.25, z + 0.26), "MAT_Stone_Granite_A", c("granite_dark", 0.06, rng))
    # the stair runs up the -Y face toward +Y
    y0 = -9.5
    for i in range(n):
        y = y0 + i * run
        z = (i + 1) * rise
        p.box((width, run, rise), (0, y + run / 2, z - rise / 2), "MAT_Stone_Granite_A", c("granite_new", 0.05, rng))
        collider(f"Step_{i:02d}", (width, run + 0.02, z), (0, y + run / 2, z / 2), kind="WALK", parent=rt)
    for sx in (-1, 1):  # parapets beside the stair
        p.box((0.3, n * run, 0.5), (sx * (width / 2 + 0.15), y0 + n * run / 2, top / 2 + 0.25), "MAT_Stone_Granite_A", c("granite", 0.05, rng))
        collider(f"Parapet_{'L' if sx > 0 else 'R'}", (0.3, n * run, top + 0.5), (sx * (width / 2 + 0.15), y0 + n * run / 2, (top + 0.5) / 2), parent=rt)
    # summit platform
    ys = y0 + n * run
    p.box((10, 8, 0.2), (0, ys + 4, top - 0.1), "MAT_Stone_Granite_A", c("granite", 0.05, rng))
    collider("Summit", (10, 8, top), (0, ys + 4, top / 2), kind="WALK", parent=rt)
    # shrine on the summit
    p.box((3.0, 3.0, 2.6), (0, ys + 5.5, top + 1.3), "MAT_Stone_Granite_A", c("granite_new", 0.04, rng))
    p.box((1.0, 0.1, 1.8), (0, ys + 3.97, top + 0.9), "MAT_Stone_Granite_A", c("dark_recess"))
    for k in range(3):
        w = 3.0 - k * 0.6
        p.box((w, w, 0.5), (0, ys + 5.5, top + 2.85 + k * 0.5), "MAT_Plaster_Lime_A", c("plaster_warm", 0.04, rng))
    p.lathe([(0.0, 0.0), (0.4, 0.0), (0.3, 0.35), (0.06, 0.55), (0.0, 0.6)], (0, ys + 5.5, top + 4.35), "MAT_Brass_A", c("brass"), segments=12)
    collider("Shrine", (3.0, 3.0, 4.0), (0, ys + 5.5, top + 2.0), parent=rt)
    # the hill sides block walking up the rock (the stair is the way)
    collider("Rock_W", (7.4, 18, top), (-5.0, 2.0, top / 2), parent=rt)
    collider("Rock_E", (7.4, 18, top), (5.0, 2.0, top / 2), parent=rt)
    p.to_object("ENV_Hill_Temple_A_Mesh").parent = rt
    empty("SOCKET_StairFoot", (0, y0 - 1.0, 0.0), parent=rt)
    empty("SOCKET_StairTop", (0, ys + 0.8, top), parent=rt)
    empty("SOCKET_Darshan", (0, ys + 3.2, top), parent=rt)
    return export_asset("ENV_Hill_Temple_A", "buildings", rt, required=["WALK_Summit", "SOCKET_StairFoot", "SOCKET_Darshan"]), rt
