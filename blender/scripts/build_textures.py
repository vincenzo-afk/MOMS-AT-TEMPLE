"""Tileable detail textures (albedo modulation + normal map) for each library material.

Generated procedurally with numpy (frequency-domain noise is periodic, so every map tiles seamlessly).
Albedo maps are grey with mean ~0.5; the runtime multiplies them into the vertex colour so the shared
palette is preserved while surfaces gain grain (see src/game/world/DetailMaterials.ts).

Usage: blender -b --factory-startup -P blender/scripts/build_textures.py
Writes public/assets/textures/detail/<name>_albedo.jpg and <name>_normal.jpg.
"""
import os
import sys
import json
import numpy as np
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "assets", "textures", "detail")
N = 512
rng = np.random.default_rng(42)

fx = np.fft.fftfreq(N)[:, None]
fy = np.fft.fftfreq(N)[None, :]


def fractal(beta=2.0, stretch=(1.0, 1.0), lo=0.0, hi=1.0, seed=None):
    """Periodic 1/f^beta noise normalised to [0,1]. stretch elongates features (wood grain, strands)."""
    r = np.random.default_rng(seed) if seed is not None else rng
    f = np.sqrt((fx * stretch[0]) ** 2 + (fy * stretch[1]) ** 2)
    f[0, 0] = 1.0
    amp = 1.0 / f ** (beta / 2)
    amp[0, 0] = 0
    band = (f > lo) & (f <= hi) if hi < 1.0 or lo > 0 else np.ones_like(f, bool)
    spec = (r.normal(size=(N, N)) + 1j * r.normal(size=(N, N))) * amp * band
    img = np.real(np.fft.ifft2(spec))
    img -= img.min()
    img /= max(img.max(), 1e-9)
    return img


def cells(count, seed, jitter=1.0):
    """Periodic Voronoi edge distance (stones, cracks, cobbles)."""
    r = np.random.default_rng(seed)
    pts = r.random((count, 2))
    yy, xx = np.mgrid[0:N, 0:N] / N
    d1 = np.full((N, N), 9.0)
    d2 = np.full((N, N), 9.0)
    for px, py in pts:
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                d = np.sqrt((xx - px - ox) ** 2 + (yy - py - oy) ** 2)
                d2 = np.minimum(d2, np.maximum(d1, d))
                d1 = np.minimum(d1, d)
    return d2 - d1  # 0 on cell borders


def normal_from_height(h, strength):
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    n = np.dstack([-dx, -dy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def save(name, rgb):
    os.makedirs(OUT, exist_ok=True)
    img = bpy.data.images.new(name, N, N, alpha=False)
    rgba = np.dstack([rgb, np.ones((N, N))]).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(OUT, f"{name}.jpg")
    img.file_format = "JPEG"
    bpy.context.scene.render.image_settings.quality = 88
    img.save()
    bpy.data.images.remove(img)


def emit(name, albedo, height, nstrength):
    a = np.clip(albedo, 0, 1)
    save(f"{name}_albedo", np.dstack([a, a, a]))
    save(f"{name}_normal", normal_from_height(height, nstrength))
    return {"mean": float(a.mean())}


stats = {}
# --- granite: speckled grain, soft mottling, a few hairline cracks
grain = fractal(1.0, seed=1)
mott = fractal(3.0, seed=2)
speck = (np.random.default_rng(3).random((N, N)) > 0.985).astype(float)
crack = np.clip(1 - cells(14, 4) * 60, 0, 1) * (fractal(2.5, seed=5) > 0.62)
stone_h = grain * 0.5 + mott * 0.8 - crack * 0.6
stats["stone"] = emit("stone", 0.30 + grain * 0.25 + mott * 0.25 - speck * 0.15 - crack * 0.25, stone_h, 6)

# --- lime plaster: weathered blotches, drips, fine grain
blot = fractal(3.2, seed=11)
fine = fractal(0.8, seed=12)
drip = np.clip(fractal(2.0, stretch=(6.0, 0.4), seed=13) - 0.55, 0, 1) * 1.5
stats["plaster"] = emit("plaster", 0.40 + blot * 0.22 + fine * 0.10 - drip * 0.25, blot * 0.6 + fine * 0.3, 4)

# --- teak: long grain lines with ring waves
g = fractal(2.6, stretch=(0.08, 1.0), seed=21)
# ring bands run along the fibres (both horizontal), gently warped by low-frequency grain
rings = np.sin((np.mgrid[0:N, 0:N][0] / N * 2 * np.pi * 7) + g * 5) * 0.5 + 0.5
fibres = fractal(1.2, stretch=(0.05, 1.0), seed=22)
stats["wood"] = emit("wood", 0.28 + rings * 0.18 + fibres * 0.22 + g * 0.12, rings * 0.4 + fibres * 0.6, 5)

# --- terracotta / clay tile: grain + horizontal throwing rings + specks
tc = fractal(1.4, seed=31)
throw = np.sin(np.mgrid[0:N, 0:N][0] / N * 2 * np.pi * 40) * 0.5 + 0.5
stats["terracotta"] = emit("terracotta", 0.36 + tc * 0.22 + throw * 0.06 + fractal(3, seed=32) * 0.16, tc * 0.6 + throw * 0.2, 5)

# --- thatch / basketry: dense directional strands
strands = fractal(1.8, stretch=(0.03, 1.0), seed=41)
strands2 = fractal(1.5, stretch=(0.06, 1.0), seed=42)
stats["thatch"] = emit("thatch", 0.18 + strands * 0.5 + strands2 * 0.25, strands * 0.8 + strands2 * 0.4, 9)

# --- soil: clods, pebbles, fine dust
clod = fractal(2.6, seed=51)
peb = np.clip(1 - cells(90, 52) * 30, 0, 1)
stats["soil"] = emit("soil", 0.28 + clod * 0.32 + fractal(0.7, seed=53) * 0.12 + peb * 0.12, clod * 0.7 + peb * 0.4, 7)

# --- ground: soft earth for the terrain (no cell network, which tiles visibly at terrain scale)
gclod = fractal(2.4, seed=111)
gfine = fractal(0.9, seed=112)
gdots = (np.random.default_rng(113).random((N, N)) > 0.992).astype(float)
gdots = np.clip(gdots + np.roll(gdots, 1, 0) + np.roll(gdots, 1, 1), 0, 1)
stats["ground"] = emit("ground", 0.30 + gclod * 0.3 + gfine * 0.18 - gdots * 0.12, gclod * 0.6 + gfine * 0.3 + gdots * 0.3, 4)

# --- foliage: leaf mottling and veins
leaf = fractal(2.0, seed=61)
vein = np.clip(1 - cells(40, 62) * 40, 0, 1)
stats["foliage"] = emit("foliage", 0.36 + leaf * 0.28 + vein * 0.1, leaf * 0.5 + vein * 0.3, 4)

# --- cloth: plain weave + slubs
yy, xx = np.mgrid[0:N, 0:N]
weave = (np.sin(xx / N * 2 * np.pi * 128) * np.sin(yy / N * 2 * np.pi * 128)) * 0.5 + 0.5
slub = fractal(2.0, stretch=(0.1, 1.0), seed=71)
stats["cloth"] = emit("cloth", 0.40 + weave * 0.12 + slub * 0.16, weave * 0.5 + slub * 0.3, 3)

# --- brass: soft tarnish and hammer marks
tarn = fractal(3.0, seed=81)
ham = np.clip(1 - cells(60, 82) * 25, 0, 1)
stats["brass"] = emit("brass", 0.40 + tarn * 0.18 - ham * 0.06 + 0.06, tarn * 0.3 + ham * 0.5, 3)

# --- skin: very subtle pores / variation
stats["skin"] = emit("skin", 0.46 + fractal(1.0, seed=91) * 0.06 + fractal(3.0, seed=92) * 0.06, fractal(1.0, seed=93), 1.5)

# --- brick: running-bond courses with mortar joints
rows = 16
by = (yy / N * rows) % 1.0
bx = ((xx / N * rows / 2) + (np.floor(yy / N * rows) % 2) * 0.5) % 1.0
mortar = ((by < 0.08) | (bx < 0.04)).astype(float)
bf = fractal(1.5, seed=101)
stats["brick"] = emit("brick", 0.40 + bf * 0.2 - mortar * 0.0 + mortar * 0.25, (1 - mortar) * 0.8 + bf * 0.2, 8)

with open(os.path.join(OUT, "textures.json"), "w", encoding="utf-8") as fh:
    json.dump({"size": N, "maps": stats}, fh, indent=2)
print("[tex] wrote", len(stats), "detail sets to", OUT)
