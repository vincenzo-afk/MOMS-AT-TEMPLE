"""Inventory icons: one small model per item, rendered from a 3/4 view on a transparent background.

Usage: blender -b -P blender/scripts/render_icons.py [-- item_id,item_id]
Writes public/assets/icons/<item_id>.png (128 px) and src/data/itemIcons.ts (the ids that have an icon).
Same vertex-colour palette as the world assets, so items look like the things you pick up.
"""
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from tom.core import Part, rgb, reset_scene, _bounds, _lin, ROOT  # noqa: E402
from tom.props import coil, pot, basket, sack, heap, rope_path, plank  # noqa: E402

OUT = os.path.join(ROOT, "public", "assets", "icons")
LIST_TS = os.path.join(ROOT, "src", "data", "itemIcons.ts")
SIZE = 128


def raw(r, g, b):
    return (_lin(r), _lin(g), _lin(b), 1.0)


WATER = raw(0.36, 0.58, 0.72)
ICONS = {}


def icon(fn):
    ICONS[fn.__name__] = fn
    return fn


# --------------------------------------------------------------------------- shared shapes
def flower5(p, c, r, petal, centre, rng, tilt=0.0):
    """Five rounded petals around a centre."""
    x, y, z = c
    for k in range(5):
        a = k * 2 * math.pi / 5 + rng.random() * 0.2
        p.ico(r, (x + math.cos(a) * r * 1.1, y + math.sin(a) * r * 1.1, z + math.sin(a) * tilt), "MAT_Foliage_A", rgb(petal, 0.04, rng), subdiv=1, scale=(1.4, 0.8, 0.35))
    p.ico(r * 0.45, (x, y, z + r * 0.2), "MAT_Foliage_A", rgb(centre, 0.04, rng), subdiv=1)


def leaf(p, a, b, w, rng, color="leaf"):
    """A flat pointed leaf from a to b."""
    ax, ay, az = a
    bx, by, bz = b
    mx, my = (ax + bx) / 2, (ay + by) / 2
    nx, ny = -(by - ay), bx - ax
    ln = math.hypot(nx, ny) or 1
    nx, ny = nx / ln * w, ny / ln * w
    p.quad_strip([a, (mx + nx, my + ny, (az + bz) / 2 + 0.01), b], [a, (mx - nx, my - ny, (az + bz) / 2 + 0.01), b], "MAT_Foliage_A", rgb(color, 0.05, rng), smooth=False)
    p.quad_strip([a, (mx - nx, my - ny, (az + bz) / 2), b], [a, (mx + nx, my + ny, (az + bz) / 2), b], "MAT_Foliage_A", rgb(color, 0.05, rng), smooth=False)


def ring(p, c, R, r, mat, color, n=24):
    x, y, z = c
    pts = [(x + math.cos(a) * R, y + math.sin(a) * R, z) for a in [2 * math.pi * k / n for k in range(n + 1)]]
    p.tube(pts, [r] * len(pts), mat, color, segments=8)


# --------------------------------------------------------------------------- the items
@icon
def jasmine_flower(p, rng):
    p.tube([(0, -0.12, 0), (0.02, 0, 0.03), (0, 0.1, 0.05)], [0.006] * 3, "MAT_Foliage_A", rgb("leaf", 0.03, rng))
    for k, (x, y) in enumerate(((0, 0.1), (-0.05, 0.04), (0.05, 0.02), (0.0, -0.04), (-0.04, -0.08))):
        flower5(p, (x, y, 0.06 + k * 0.004), 0.022, "jasmine", "marigold_yellow", rng)
    leaf(p, (0.02, -0.06, 0.03), (0.1, -0.1, 0.02), 0.025, rng)


@icon
def marigold_flower(p, rng):
    for x, y, s in ((0, 0, 1.0), (-0.07, 0.05, 0.8), (0.06, 0.06, 0.75)):
        for layer in range(3):
            p.ico(0.05 * s * (1 - layer * 0.18), (x, y, 0.03 + layer * 0.012), "MAT_Foliage_A", rgb("marigold", 0.05, rng), subdiv=2, scale=(1, 1, 0.55), noise=0.25, rng=rng)
    leaf(p, (0, -0.02, 0.01), (0.03, -0.14, 0.0), 0.03, rng)


@icon
def hibiscus_flower(p, rng):
    for k in range(5):
        a = k * 2 * math.pi / 5
        p.ico(0.05, (math.cos(a) * 0.055, math.sin(a) * 0.055, 0.02), "MAT_Foliage_A", rgb("hibiscus", 0.04, rng), subdiv=2, scale=(1.5, 1.0, 0.25), noise=0.1, rng=rng)
    p.tube([(0, 0, 0.02), (0.02, 0.01, 0.1)], [0.006, 0.004], "MAT_Foliage_A", rgb("marigold_yellow"), segments=6)
    leaf(p, (0, 0, 0), (0.06, -0.15, -0.01), 0.04, rng)


@icon
def channel_stone(p, rng):
    p.box((0.34, 0.2, 0.16), (0, 0, 0.08), "MAT_Stone_Granite_A", rgb("granite", 0.03, rng))
    p.box((0.3, 0.012, 0.004), (0, -0.101, 0.11), "MAT_Stone_Granite_A", rgb("granite_dark"))  # chisel line


@icon
def lime_clay(p, rng):
    p.ico(0.12, (0, 0, 0.08), "MAT_Soil_A", rgb("clay_lime", 0.04, rng), subdiv=2, scale=(1.2, 1, 0.7), noise=0.18, rng=rng)
    p.ico(0.06, (0.12, -0.04, 0.04), "MAT_Soil_A", rgb("clay_lime", 0.06, rng), subdiv=2, scale=(1, 1, 0.7), noise=0.2, rng=rng)


@icon
def lime_mortar(p, rng):
    p.lathe([(0, 0), (0.12, 0), (0.17, 0.07), (0.18, 0.09), (0.0, 0.09)], (0, 0, 0), "MAT_Terracotta_A", rgb("terracotta", 0.04, rng), segments=20)
    p.ico(0.15, (0, 0, 0.08), "MAT_Plaster_Lime_A", rgb("plaster", 0.02, rng), subdiv=2, scale=(1, 1, 0.3), noise=0.08, rng=rng)
    p.box((0.2, 0.03, 0.01), (0.12, -0.05, 0.12), "MAT_Iron_A", rgb("iron"), rot_z=0.5)  # trowel


@icon
def timber(p, rng):
    for y, z in ((-0.06, 0.06), (0.06, 0.06), (0, 0.16)):
        p.tube([(-0.2, y, z), (0.2, y, z)], [0.055, 0.055], "MAT_Wood_Teak_A", rgb("bark", 0.05, rng), segments=10)
        p.lathe([(0, 0), (0.052, 0), (0.0, 0.002)], (0.2, y, z), "MAT_Wood_Teak_A", rgb("teak", 0.03, rng), segments=10)  # cut end


@icon
def dry_grass(p, rng):
    """A loose armful of long dry grass lying on its side, fanning out from the cut ends."""
    for k in range(40):
        y0 = (rng.random() - 0.5) * 0.05
        z0 = 0.02 + rng.random() * 0.05
        spread = (rng.random() - 0.5) * 0.22
        p.tube([(-0.17, y0, z0), (0.0, y0 + spread * 0.4, z0 + 0.01), (0.19, y0 + spread, z0 + rng.random() * 0.03)], [0.005, 0.004, 0.002], "MAT_Thatch_A", rgb("thatch" if k % 3 else "leaf_dry", 0.12, rng), segments=4)


@icon
def thatch_bundle(p, rng):
    for k in range(30):
        x, y = (rng.random() - 0.5) * 0.12, (rng.random() - 0.5) * 0.12
        p.tube([(x * 0.6, y * 0.6, 0.0), (x, y, 0.36 + rng.random() * 0.04)], [0.006, 0.004], "MAT_Thatch_A", rgb("thatch", 0.1, rng), segments=4)
    ring(p, (0, 0, 0.12), 0.055, 0.008, "MAT_Thatch_A", rgb("rope"))
    ring(p, (0, 0, 0.26), 0.06, 0.008, "MAT_Thatch_A", rgb("rope"))


@icon
def rope(p, rng):
    for layer in range(3):
        coil(p, (0, 0, layer * 0.025), 0.13, 2.2, rng, r=0.012)


@icon
def wooden_bucket(p, rng):
    p.lathe([(0, 0), (0.1, 0), (0.13, 0.22), (0.12, 0.22), (0.09, 0.02), (0.0, 0.02)], (0, 0, 0), "MAT_Wood_Teak_A", rgb("teak", 0.04, rng), segments=16)
    for z in (0.04, 0.17):
        ring(p, (0, 0, z), 0.105 + z * 0.12, 0.006, "MAT_Iron_A", rgb("iron"), n=28)
    rope_path(p, [(-0.12, 0, 0.2)] + [(math.cos(a) * 0.12, 0, 0.2 + math.sin(a) * 0.12) for a in [math.pi * k / 8 for k in range(8, -1, -1)]][1:], 0.008, rng)


@icon
def sluice_board(p, rng):
    plank(p, (0.42, 0.04, 0.26), (0, 0, 0.13), rng, color="teak")
    for x in (-0.14, 0.14):
        p.box((0.03, 0.05, 0.27), (x, 0, 0.135), "MAT_Iron_A", rgb("iron"))
    p.tube([(-0.06, -0.03, 0.26), (-0.06, -0.03, 0.32), (0.06, -0.03, 0.32), (0.06, -0.03, 0.26)], [0.01] * 4, "MAT_Iron_A", rgb("iron"), segments=6)


@icon
def banana_twine(p, rng):
    for layer in range(2):
        coil(p, (0, 0, layer * 0.02), 0.09, 2.5, rng, r=0.007)


@icon
def sickle(p, rng):
    pts = [(math.cos(a) * 0.13, math.sin(a) * 0.13 + 0.05, 0.02) for a in [math.radians(d) for d in range(-40, 181, 20)]]
    p.tube(pts, [0.006 + 0.012 * math.sin(math.pi * i / (len(pts) - 1)) for i in range(len(pts))], "MAT_Iron_A", rgb("steel", 0.03, rng), segments=6)
    p.tube([(0.1, -0.03, 0.02), (0.16, -0.2, 0.02)], [0.018, 0.02], "MAT_Wood_Teak_A", rgb("teak", 0.04, rng), segments=8)


@icon
def water_vessel(p, rng):
    pot(p, (0, 0, 0), 0.7, rng)


@icon
def water_vessel_full(p, rng):
    pot(p, (0, 0, 0), 0.7, rng)
    p.lathe([(0, 0), (0.075, 0), (0.0, 0.004)], (0, 0, 0.275), "MAT_Water_A", WATER, segments=14)  # brim-full
    for k, (x, z) in enumerate(((0.1, 0.22), (0.13, 0.14), (0.145, 0.06))):  # water running down the side
        p.ico(0.016 - k * 0.002, (x, -0.06 - k * 0.01, z), "MAT_Water_A", WATER, subdiv=1, scale=(0.8, 0.8, 1.4))


@icon
def seed_packet(p, rng):
    p.box((0.16, 0.03, 0.22), (0, 0, 0.11), "MAT_Cloth_A", rgb("paper", 0.02, rng))
    p.box((0.16, 0.032, 0.03), (0, 0, 0.205), "MAT_Cloth_A", rgb("cloth_green", 0.03, rng))
    leaf(p, (0, -0.017, 0.06), (0.0, -0.017, 0.15), 0.025, rng, color="leaf_light")
    for k in range(6):
        p.ico(0.01, (0.1 + rng.random() * 0.06, -0.05 + rng.random() * 0.05, 0.01), "MAT_Soil_A", rgb("grain", 0.08, rng), subdiv=1, scale=(1.3, 1, 0.7))


@icon
def produce(p, rng):
    basket(p, (0, 0, 0), 0.16, 0.08, rng)
    for k in range(3):
        p.ico(0.045, (math.cos(k * 2.1) * 0.07, math.sin(k * 2.1) * 0.07, 0.11), "MAT_Foliage_A", rgb("hibiscus", 0.05, rng), subdiv=2)  # tomatoes
    p.ico(0.05, (0.02, 0.0, 0.14), "MAT_Foliage_A", rgb("vegetable_purple", 0.04, rng), subdiv=2, scale=(1.6, 0.9, 0.9))  # brinjal
    for k in range(3):
        p.tube([(-0.08 + k * 0.03, -0.08, 0.1), (-0.02 + k * 0.03, 0.06, 0.13)], [0.012, 0.004], "MAT_Foliage_A", rgb("leaf_light", 0.05, rng), segments=6)  # okra


@icon
def flower_garland(p, rng):
    n = 30
    for i in range(n):
        a = 2 * math.pi * i / n
        p.ico(0.028, (math.cos(a) * 0.15, math.sin(a) * 0.15 * 0.8, 0.03 + math.sin(a) * 0.01), "MAT_Foliage_A", rgb("marigold" if i % 3 else "jasmine", 0.05, rng), subdiv=2, noise=0.2, rng=rng)


@icon
def handwoven_cloth(p, rng):
    for k in range(3):
        z = 0.025 + k * 0.05
        p.box((0.3, 0.22, 0.045), (0, 0, z), "MAT_Cloth_A", rgb("cloth_red" if k != 1 else "cloth_indigo", 0.02, rng))
        p.box((0.302, 0.03, 0.047), (0, -0.095, z), "MAT_Cloth_A", rgb("marigold_yellow", 0.02, rng))  # zari border


@icon
def festival_bundle(p, rng):
    leaf(p, (-0.2, 0, 0.0), (0.2, 0, 0.0), 0.12, rng, color="banana_leaf")
    p.ico(0.06, (-0.06, 0.02, 0.05), "MAT_Foliage_A", rgb("coconut", 0.04, rng), subdiv=2)
    p.tube([(0.02, -0.04, 0.03), (0.12, 0.02, 0.06)], [0.025, 0.02], "MAT_Foliage_A", rgb("banana_fruit", 0.04, rng), segments=8)
    for k in range(10):
        a = k * 0.62
        p.ico(0.018, (math.cos(a) * 0.12, math.sin(a) * 0.07, 0.03), "MAT_Foliage_A", rgb("marigold" if k % 2 else "jasmine"), subdiv=1)
    p.box((0.1, 0.06, 0.03), (0.05, 0.05, 0.03), "MAT_Cloth_A", rgb("cloth_red"))


@icon
def palm_leaf_manuscript(p, rng):
    for k in range(6):
        p.box((0.36, 0.05, 0.004), (0, 0, 0.02 + k * 0.005), "MAT_Foliage_A", rgb("leaf_dry", 0.05, rng))
    for z in (0.012, 0.05):
        p.box((0.37, 0.055, 0.012), (0, 0, z), "MAT_Wood_Teak_A", rgb("teak_dark", 0.03, rng))
    rope_path(p, [(-0.1, -0.04, 0.0), (-0.1, -0.035, 0.06), (-0.1, 0.035, 0.06), (-0.1, 0.04, 0.0)], 0.004, rng)


@icon
def oil_lamp(p, rng):
    p.lathe([(0, 0), (0.07, 0), (0.09, 0.035), (0.07, 0.045), (0.0, 0.02)], (0, 0, 0), "MAT_Terracotta_A", rgb("terracotta", 0.04, rng), segments=14)
    p.lathe([(0, 0), (0.016, 0.015), (0.012, 0.04), (0, 0.065)], (0.06, 0, 0.04), "MAT_Emissive_A", rgb("flame"), segments=8)


@icon
def woven_mat(p, rng):
    p.tube([(-0.2, 0, 0.06), (0.2, 0, 0.06)], [0.06, 0.06], "MAT_Thatch_A", rgb("basket", 0.03, rng), segments=14)
    for x in (-0.17, 0.17):
        p.tube([(x - 0.012, 0, 0.06), (x + 0.012, 0, 0.06)], [0.062, 0.062], "MAT_Cloth_A", rgb("cloth_red"), segments=14)
    p.lathe([(0, 0), (0.06, 0), (0.0, 0.002)], (0.2, 0, 0.06), "MAT_Thatch_A", rgb("thatch"), segments=14)


@icon
def kolam_powder(p, rng):
    p.lathe([(0, 0), (0.09, 0), (0.13, 0.06), (0.0, 0.06)], (0, 0, 0), "MAT_Wood_Teak_A", rgb("brass", 0.03, rng), segments=18)
    p.ico(0.11, (0, 0, 0.06), "MAT_Plaster_Lime_A", rgb("kolam_white", 0.02, rng), subdiv=2, scale=(1, 1, 0.45), noise=0.05, rng=rng)


@icon
def brass_bangle(p, rng):
    ring(p, (0, 0, 0.02), 0.1, 0.012, "MAT_Brass_A", rgb("brass", 0.02, rng), n=32)
    p.ico(0.02, (0.1, 0, 0.02), "MAT_Foliage_A", rgb("kumkum_red"), subdiv=2)


@icon
def velan_chisel(p, rng):
    p.box((0.16, 0.02, 0.012), (-0.12, 0, 0.012), "MAT_Iron_A", rgb("steel", 0.03, rng), taper=(1.0, 0.4))
    p.tube([(-0.04, 0, 0.012), (-0.02, 0, 0.012)], [0.016, 0.016], "MAT_Brass_A", rgb("brass"), segments=10)
    p.tube([(-0.02, 0, 0.012), (0.16, 0, 0.012)], [0.016, 0.018], "MAT_Wood_Teak_A", rgb("teak", 0.04, rng), segments=10)


@icon
def coin_pouch(p, rng):
    sack(p, (0, 0, 0), 0.5, rng, color="cloth_red")
    ring(p, (0, 0, 0.19), 0.035, 0.005, "MAT_Thatch_A", rgb("marigold_yellow"))
    for k in range(3):
        p.lathe([(0, 0), (0.025, 0), (0.025, 0.005), (0, 0.005)], (0.13 + k * 0.02, -0.06 + k * 0.03, 0.0 + k * 0.003), "MAT_Brass_A", rgb("brass"), segments=12)


@icon
def brass_scrap(p, rng):
    p.lathe([(0, 0), (0.11, 0), (0.11, 0.015), (0.05, 0.04), (0.025, 0.06), (0.0, 0.06)], (0, 0, 0), "MAT_Brass_A", rgb("brass", 0.08, rng), segments=14)
    p.tube([(0.12 + math.cos(a) * 0.09, -0.05 + math.sin(a) * 0.09, 0.012) for a in [k * 0.45 for k in range(9)]], [0.01] * 9, "MAT_Brass_A", rgb("brass", 0.1, rng), segments=6)


@icon
def beeswax(p, rng):
    p.lathe([(0, 0), (0.12, 0), (0.13, 0.03), (0.12, 0.06), (0.0, 0.065)], (0, 0, 0), "MAT_Wood_Teak_A", rgb("marigold_yellow", 0.03, rng), segments=18)
    p.ico(0.05, (0.13, -0.05, 0.03), "MAT_Wood_Teak_A", rgb("marigold_yellow", 0.05, rng), subdiv=2, scale=(1, 1, 0.6), noise=0.15, rng=rng)


@icon
def brass_lamp(p, rng):
    p.lathe([(0, 0), (0.09, 0), (0.09, 0.015), (0.04, 0.035), (0.016, 0.06), (0.012, 0.34), (0.03, 0.35), (0.07, 0.37), (0.075, 0.385), (0.02, 0.395), (0.012, 0.44), (0.025, 0.46), (0.0, 0.5)], (0, 0, 0), "MAT_Brass_A", rgb("brass", 0.03, rng), segments=16)
    for k in range(5):
        a = k * 2 * math.pi / 5
        p.lathe([(0, 0), (0.008, 0.008), (0.006, 0.02), (0, 0.032)], (math.cos(a) * 0.065, math.sin(a) * 0.065, 0.385), "MAT_Emissive_A", rgb("flame"), segments=6)


@icon
def tulsi_pot(p, rng):
    p.lathe([(0, 0), (0.1, 0), (0.12, 0.12), (0.13, 0.14), (0.0, 0.14)], (0, 0, 0), "MAT_Terracotta_A", rgb("terracotta", 0.03, rng), segments=16)
    p.lathe([(0.121, 0.05), (0.124, 0.08)], (0, 0, 0), "MAT_Terracotta_A", rgb("kolam_white"), segments=16)  # painted band
    for k in range(9):
        a = k * 0.7
        p.ico(0.045, (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.19 + (k % 3) * 0.04), "MAT_Foliage_A", rgb("leaf", 0.08, rng), subdiv=1, noise=0.3, rng=rng)


# --------------------------------------------------------------------------- rendering
def setup_render(scene):
    scene.render.engine = "BLENDER_WORKBENCH"
    sh = scene.display.shading
    sh.light = "STUDIO"
    sh.color_type = "VERTEX"
    sh.show_shadows = True
    sh.shadow_intensity = 0.35
    sh.show_cavity = True
    sh.cavity_type = "BOTH"
    sh.show_specular_highlight = True
    scene.display.render_aa = "16"
    scene.render.resolution_x = SIZE * 2
    scene.render.resolution_y = SIZE * 2
    scene.render.resolution_percentage = 50
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"


def render_icon(item_id):
    scene = reset_scene()
    setup_render(scene)
    rng = random.Random(hash(item_id) & 0xFFFF)
    p = Part()
    ICONS[item_id](p, rng)
    obj = p.to_object(item_id)
    mn, mx = _bounds([obj])
    center = Vector([(a + b) / 2 for a, b in zip(mn, mx)])
    cam_data = bpy.data.cameras.new("IconCam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("IconCam", cam_data)
    scene.collection.objects.link(cam)
    e, a = math.radians(32), math.radians(-30)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = center + d * 3
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    # fit: project the bounding box corners onto the camera plane and take the larger extent, plus a margin
    inv = cam.matrix_world.inverted()
    pts = [inv @ (obj.matrix_world @ Vector(c)) for c in obj.bound_box]
    w = max(q.x for q in pts) - min(q.x for q in pts)
    h = max(q.y for q in pts) - min(q.y for q in pts)
    cx = (max(q.x for q in pts) + min(q.x for q in pts)) / 2
    cy = (max(q.y for q in pts) + min(q.y for q in pts)) / 2
    cam_data.shift_x = 0
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    cam_data.ortho_scale = max(w, h) * 1.12
    scene.camera = cam
    os.makedirs(OUT, exist_ok=True)
    scene.render.filepath = os.path.join(OUT, f"{item_id}.png")
    bpy.ops.render.render(write_still=True)


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ids = args[0].split(",") if args else list(ICONS)
    for item_id in ids:
        render_icon(item_id)
        print(f"[icons] {item_id}")
    have = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith(".png") and f[:-4] in ICONS)
    with open(LIST_TS, "w", encoding="utf8", newline="\n") as fh:
        fh.write("// Generated by blender/scripts/render_icons.py: items that have a rendered icon in public/assets/icons/.\n")
        fh.write("export const ITEM_ICONS = new Set<string>([\n")
        for i in have:
            fh.write(f'  "{i}",\n')
        fh.write("]);\n")
    print(f"[icons] {len(ids)} rendered, {len(have)} listed")


main()
