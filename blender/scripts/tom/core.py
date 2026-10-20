"""Scene, mesh, material and export helpers shared by every asset script."""
import bpy
import bmesh
import json
import math
import os
import random
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODELS_OUT = os.path.join(ROOT, "public", "assets", "models")
BLEND_OUT = os.path.join(ROOT, "blender", "source")
REPORT_OUT = os.path.join(ROOT, "blender", "export_reports")

# --------------------------------------------------------------------------- palette
# Linear-ish sRGB triples. Kept small and shared so every asset sits in one palette.
PALETTE = {
    "granite": (0.56, 0.50, 0.44),
    "granite_dark": (0.42, 0.38, 0.34),
    "granite_new": (0.66, 0.60, 0.52),
    "sandstone": (0.72, 0.58, 0.42),
    "plaster": (0.90, 0.86, 0.76),
    "plaster_warm": (0.88, 0.76, 0.58),
    "ochre": (0.70, 0.34, 0.18),
    "red_oxide": (0.55, 0.20, 0.13),
    "teak": (0.42, 0.26, 0.15),
    "teak_dark": (0.28, 0.17, 0.10),
    "terracotta": (0.66, 0.33, 0.20),
    "tile": (0.60, 0.27, 0.16),
    "thatch": (0.64, 0.52, 0.32),
    "soil": (0.36, 0.25, 0.17),
    "soil_dry": (0.55, 0.43, 0.30),
    "silt": (0.47, 0.40, 0.30),
    "moss": (0.30, 0.38, 0.18),
    "leaf": (0.22, 0.42, 0.16),
    "leaf_light": (0.36, 0.55, 0.20),
    "leaf_dry": (0.55, 0.48, 0.24),
    "palm": (0.30, 0.48, 0.18),
    "bark": (0.33, 0.26, 0.20),
    "palm_trunk": (0.45, 0.38, 0.30),
    "jasmine": (0.97, 0.96, 0.90),
    "marigold": (0.98, 0.52, 0.06),
    "marigold_yellow": (0.98, 0.76, 0.10),
    "brass": (0.80, 0.60, 0.25),
    "cloth_red": (0.62, 0.16, 0.12),
    "cloth_saffron": (0.86, 0.50, 0.14),
    "cloth_white": (0.92, 0.90, 0.84),
    "cloth_indigo": (0.18, 0.24, 0.42),
    "cloth_green": (0.24, 0.40, 0.26),
    "basket": (0.62, 0.48, 0.28),
    "clay_lime": (0.80, 0.76, 0.66),
    "dark_recess": (0.08, 0.06, 0.05),
    "brick": (0.70, 0.36, 0.24),
    "brick_old": (0.60, 0.38, 0.28),
    "bamboo": (0.72, 0.62, 0.38),
    "bamboo_dark": (0.55, 0.45, 0.26),
    "rope": (0.66, 0.54, 0.34),
    "iron": (0.22, 0.21, 0.20),
    "paddy": (0.42, 0.62, 0.22),
    "paddy_dry": (0.62, 0.55, 0.32),
    "mud_wet": (0.30, 0.24, 0.17),
    "hibiscus": (0.84, 0.12, 0.16),
    "mango_leaf": (0.20, 0.45, 0.14),
    "kolam_white": (0.96, 0.95, 0.90),
    "kolam_pink": (0.92, 0.36, 0.52),
    "kolam_green": (0.30, 0.66, 0.34),
    "flame": (1.0, 0.72, 0.25),
    "banana_fruit": (0.90, 0.80, 0.24),
    "coconut": (0.42, 0.34, 0.16),
    "vegetable_purple": (0.38, 0.16, 0.36),
    "mango": (0.95, 0.66, 0.16),
    "grain": (0.86, 0.74, 0.44),
}

MATERIAL_DEFS = {
    # name: (roughness, metallic)
    "MAT_Stone_Granite_A": (0.88, 0.0),
    "MAT_Plaster_Lime_A": (0.92, 0.0),
    "MAT_Wood_Teak_A": (0.72, 0.0),
    "MAT_Terracotta_A": (0.80, 0.0),
    "MAT_Thatch_A": (0.95, 0.0),
    "MAT_Foliage_A": (0.78, 0.0),
    "MAT_Soil_A": (0.97, 0.0),
    "MAT_Cloth_A": (0.95, 0.0),
    "MAT_Brass_A": (0.38, 0.9),
    "MAT_Water_A": (0.05, 0.0),
    "MAT_Skin_A": (0.62, 0.0),
    "MAT_Hair_A": (0.55, 0.0),
    "MAT_Eye_A": (0.25, 0.0),
    "MAT_Brick_A": (0.86, 0.0),
    "MAT_Iron_A": (0.55, 0.8),
    "MAT_Emissive_A": (0.5, 0.0),
}


def _lin(v):
    """Palette values are display (sRGB) colours. The bmesh colour layer is a BYTE_COLOR attribute, which
    Blender stores as sRGB and the glTF exporter converts to linear COLOR_0, so values are passed through."""
    return max(0.0, min(1.0, v))


def rgb(name, jitter=0.0, rng=None):
    r = rng or random
    c = PALETTE[name]
    if jitter <= 0:
        return (_lin(c[0]), _lin(c[1]), _lin(c[2]), 1.0)
    k = 1.0 + (r.random() * 2 - 1) * jitter
    h = (r.random() * 2 - 1) * jitter * 0.35
    return (_lin(c[0] * k + h), _lin(c[1] * k), _lin(c[2] * k - h), 1.0)


# --------------------------------------------------------------------------- scene
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    for name in ("Geometry", "Collision", "Rig", "Reference", "Export"):
        col = bpy.data.collections.new(name)
        scene.collection.children.link(col)
    return scene


def collection(name):
    return bpy.data.collections[name]


def material(name):
    """Get or create a library material that reads its base colour from the 'Col' attribute."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    rough, metal = MATERIAL_DEFS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    if name == "MAT_Emissive_A":  # lamp flames: exported as an emissive glTF material
        bsdf.inputs["Emission Color"].default_value = (1.0, 0.7, 0.25, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 3.0
    return m


# --------------------------------------------------------------------------- mesh building
class Part:
    """Accumulates geometry into a bmesh with per-face material index and corner colours."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new("Col")
        self.mats = []

    def _mat_index(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _finish(self, faces, mat, color, shade=None):
        mi = self._mat_index(mat)
        for f in faces:
            f.material_index = mi
            f.smooth = bool(shade)
            for l in f.loops:
                l[self.col] = color

    def box(self, size, loc, mat, color, rot_z=0.0, taper=None):
        """Axis box centred at loc. size=(x,y,z). taper=(sx,sy) scales the top face."""
        sx, sy, sz = size
        before = set(self.bm.faces)
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        verts = res["verts"]
        for v in verts:
            v.co.x *= sx
            v.co.y *= sy
            v.co.z *= sz
            if taper and v.co.z > 0:
                v.co.x *= taper[0]
                v.co.y *= taper[1]
        m = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot_z, 4, "Z")
        bmesh.ops.transform(self.bm, matrix=m, verts=verts)
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color)
        return new

    def lathe(self, profile, loc, mat, color, segments=16, smooth=True, rot_offset=0.0, color_fn=None):
        """Revolve [(radius, z), ...] around Z. Caps closed when radius==0 at the ends."""
        before = set(self.bm.faces)
        rings = []
        for r, z in profile:
            ring = []
            for i in range(segments):
                a = rot_offset + 2 * math.pi * i / segments
                ring.append(self.bm.verts.new((loc[0] + r * math.cos(a), loc[1] + r * math.sin(a), loc[2] + z)))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for i in range(segments):
                j = (i + 1) % segments
                try:
                    self.bm.faces.new((a[i], a[j], b[j], b[i]))
                except ValueError:
                    pass
        if profile[0][0] > 0:
            self.bm.faces.new(list(reversed(rings[0])))
        if profile[-1][0] > 0:
            self.bm.faces.new(rings[-1])
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color, shade=smooth)
        if color_fn:
            for f in new:
                for l in f.loops:
                    l[self.col] = color_fn(l.vert.co)
        return new

    def prism(self, points2d, z0, z1, mat, color, smooth=False):
        """Extrude a closed 2D polygon (x, y) from z0 to z1."""
        before = set(self.bm.faces)
        bot = [self.bm.verts.new((x, y, z0)) for x, y in points2d]
        top = [self.bm.verts.new((x, y, z1)) for x, y in points2d]
        n = len(points2d)
        self.bm.faces.new(list(reversed(bot)))
        self.bm.faces.new(top)
        for i in range(n):
            j = (i + 1) % n
            self.bm.faces.new((bot[i], bot[j], top[j], top[i]))
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color, shade=smooth)
        return new

    def ico(self, radius, loc, mat, color, subdiv=1, scale=(1, 1, 1), noise=0.0, rng=None, smooth=True):
        r = rng or random
        before = set(self.bm.faces)
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius)
        for v in res["verts"]:
            k = 1 + (r.random() * 2 - 1) * noise
            v.co = Vector((v.co.x * scale[0] * k + loc[0], v.co.y * scale[1] * k + loc[1], v.co.z * scale[2] * k + loc[2]))
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color, shade=smooth)
        return new

    def quad_strip(self, pts_a, pts_b, mat, color, smooth=True):
        """Faces between two equal-length polylines (used for leaves, cloth, fronds). Double-sided by thickness elsewhere."""
        before = set(self.bm.faces)
        va = [self.bm.verts.new(p) for p in pts_a]
        vb = [self.bm.verts.new(p) for p in pts_b]
        for i in range(len(va) - 1):
            self.bm.faces.new((va[i], va[i + 1], vb[i + 1], vb[i]))
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color, shade=smooth)
        return new

    def tube(self, path, radii, mat, color, segments=8, smooth=True):
        """Sweep a circle along a polyline path with per-point radius (trunks, branches, twine)."""
        before = set(self.bm.faces)
        rings = []
        for i, p in enumerate(path):
            p = Vector(p)
            if i < len(path) - 1:
                t = (Vector(path[i + 1]) - p).normalized()
            else:
                t = (p - Vector(path[i - 1])).normalized()
            up = Vector((0, 0, 1)) if abs(t.z) < 0.95 else Vector((1, 0, 0))
            n1 = t.cross(up).normalized()
            n2 = t.cross(n1).normalized()
            ring = []
            for s in range(segments):
                a = 2 * math.pi * s / segments
                ring.append(self.bm.verts.new(p + (n1 * math.cos(a) + n2 * math.sin(a)) * radii[i]))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for s in range(segments):
                t2 = (s + 1) % segments
                self.bm.faces.new((a[s], a[t2], b[t2], b[s]))
        self.bm.faces.new(list(reversed(rings[0])))
        self.bm.faces.new(rings[-1])
        new = [f for f in self.bm.faces if f not in before]
        self._finish(new, mat, color, shade=smooth)
        return new

    def to_object(self, name, coll="Geometry", bevel=0.0, smooth_angle=None):
        me = bpy.data.meshes.new(name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(material(m))
        if "Col" in me.color_attributes:
            me.color_attributes.active_color_name = "Col"
            me.color_attributes.render_color_index = me.color_attributes.find("Col")
        obj = bpy.data.objects.new(name, me)
        collection(coll).objects.link(obj)
        if bevel > 0:
            mod = obj.modifiers.new("Bevel", "BEVEL")
            mod.width = bevel
            mod.segments = 1
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(50)
            mod.harden_normals = False
            apply_modifiers(obj)
        return obj


def apply_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)
    # new_from_object does not carry over the active/render colour attribute; without it the glTF
    # exporter (export_vertex_color="ACTIVE") silently drops COLOR_0 and the asset renders white.
    if "Col" in me.color_attributes:
        me.color_attributes.active_color_name = "Col"
        me.color_attributes.render_color_index = me.color_attributes.find("Col")


def empty(name, loc, parent=None, coll="Geometry", props=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    e.empty_display_size = 0.3
    e.location = loc
    collection(coll).objects.link(e)
    if parent:
        e.parent = parent
    for k, v in (props or {}).items():
        e[k] = v
    return e


def collider(name, size, loc, rot_z=0.0, kind="COL", parent=None):
    """Box proxy. kind COL blocks movement, WALK is a surface whose top the player can stand on."""
    p = Part()
    p.box(size, loc, "MAT_Stone_Granite_A", (1, 0, 1, 1), rot_z=rot_z)
    obj = p.to_object(f"{kind}_{name}", coll="Collision")
    obj["collider"] = "walk" if kind == "WALK" else "box"
    obj.display_type = "WIRE"
    if parent:
        obj.parent = parent
    return obj


def root(name):
    r = bpy.data.objects.new(name, None)
    r.empty_display_type = "ARROWS"
    collection("Export").objects.link(r)
    return r


def parent_all(rt, objs):
    for o in objs:
        if o.parent is None:
            o.parent = rt


# --------------------------------------------------------------------------- export & report
def tri_count(obj):
    if obj.type != "MESH":
        return 0
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def export_asset(asset_id, subdir, rt, required=None, extra_report=None, animations=False):
    """Save the .blend, export a GLB of the root hierarchy, then verify the file exists."""
    os.makedirs(os.path.join(MODELS_OUT, subdir), exist_ok=True)
    os.makedirs(BLEND_OUT, exist_ok=True)
    os.makedirs(REPORT_OUT, exist_ok=True)
    objs = [rt] + list(rt.children_recursive)
    names = {o.name for o in objs}
    missing = [r for r in (required or []) if not any(n == r or n.startswith(r) for n in names)]
    if missing:
        raise RuntimeError(f"{asset_id}: missing required objects {missing}")

    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.hide_set(False)
        o.hide_viewport = False
        o.hide_render = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = rt

    blend_path = os.path.join(BLEND_OUT, f"{asset_id}.blend")
    glb_path = os.path.join(MODELS_OUT, subdir, f"{asset_id}.glb")
    if os.path.exists(glb_path):
        os.remove(glb_path)
    bpy.ops.wm.save_as_mainfile(filepath=blend_path, check_existing=False, compress=True)

    kwargs = dict(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_extras=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_vertex_color="ACTIVE",
        export_animations=animations,
        # Same skeleton export for every character: deforming bones only (drops the non-deforming 'root'), so
        # NPC rigs match the player's rig node-for-node and shared clips apply in the same bone spaces.
        export_skins=True,
        export_def_bones=True,
    )
    if animations:
        kwargs.update(export_animation_mode="ACTIONS", export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True)
    bpy.ops.export_scene.gltf(**kwargs)

    if not os.path.exists(glb_path) or os.path.getsize(glb_path) < 200:
        raise RuntimeError(f"{asset_id}: GLB export failed or produced an empty file")

    mesh_objs = [o for o in objs if o.type == "MESH" and not o.name.startswith(("COL_", "WALK_"))]
    dims = _bounds(mesh_objs)
    report = {
        "assetId": asset_id,
        "glb": os.path.relpath(glb_path, ROOT).replace("\\", "/"),
        "blend": os.path.relpath(blend_path, ROOT).replace("\\", "/"),
        "bytes": os.path.getsize(glb_path),
        "triangles": sum(tri_count(o) for o in mesh_objs),
        "objects": sorted(o.name for o in objs),
        "colliders": sorted(o.name for o in objs if o.name.startswith(("COL_", "WALK_"))),
        "materials": sorted({m.name for o in mesh_objs for m in o.data.materials if m}),
        "boundsMin": dims[0],
        "boundsMax": dims[1],
        "blenderVersion": bpy.app.version_string,
    }
    if extra_report:
        report.update(extra_report)
    with open(os.path.join(REPORT_OUT, f"{asset_id}.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    print(f"[tom] exported {asset_id}: {report['triangles']} tris, {report['bytes']} bytes")
    return report


def _bounds(objs):
    mn = [1e9] * 3
    mx = [-1e9] * 3
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                mn[i] = min(mn[i], w[i])
                mx[i] = max(mx[i], w[i])
    if mn[0] > mx[0]:
        return [[0, 0, 0], [0, 0, 0]]
    return [[round(v, 3) for v in mn], [round(v, 3) for v in mx]]


# --------------------------------------------------------------------------- preview rendering
def render_preview(asset_id, rt, distance=None, elev=18, azim=-35, size=640):
    """Workbench render with vertex colours from a 3/4 front view, for visual review."""
    scene = bpy.context.scene
    objs = [o for o in [rt] + list(rt.children_recursive) if o.type == "MESH" and not o.name.startswith(("COL_", "WALK_"))]
    for o in [rt] + list(rt.children_recursive):
        if o.name.startswith(("COL_", "WALK_")):
            o.hide_render = True
    mn, mx = _bounds(objs)
    center = Vector([(a + b) / 2 for a, b in zip(mn, mx)])
    radius = max(Vector(mx) - Vector(mn)) * 0.5 + 0.01
    dist = distance or radius * 3.2
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    e, a = math.radians(elev), math.radians(azim)
    cam.location = center + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    direction = center - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "VERTEX"
    shading.show_shadows = True
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.film_transparent = False
    scene.display.render_aa = "8"
    out = os.path.join(REPORT_OUT, "previews", f"{asset_id}.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    return out
