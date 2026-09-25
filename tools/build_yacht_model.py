"""
Blender 5.2 Python Script: Generate Ultra-Realistic 14.5m Sport Yacht 3D Model
Exports to assets/models/yacht.glb with PBR materials and named animated sub-assemblies.
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# 1. Clear existing scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Helper: Create Principled BSDF Material
def create_pbr_mat(name, base_color, roughness=0.3, metallic=0.0, specular=0.5, clearcoat=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
        elif 'Specular' in bsdf.inputs:
            bsdf.inputs['Specular'].default_value = specular
        if clearcoat > 0 and 'Coat Weight' in bsdf.inputs:
            bsdf.inputs['Coat Weight'].default_value = clearcoat
    return mat

# Materials Definition
mat_gelcoat = create_pbr_mat("Gelcoat_White", (0.96, 0.97, 0.98, 1.0), roughness=0.18, metallic=0.05, clearcoat=0.6)
mat_hull_dark = create_pbr_mat("Hull_Navy", (0.05, 0.09, 0.16, 1.0), roughness=0.22, metallic=0.12, clearcoat=0.5)
mat_bootstripe = create_pbr_mat("Bootstripe_Gold", (0.88, 0.72, 0.32, 1.0), roughness=0.25, metallic=0.7)
mat_teak = create_pbr_mat("Teak_Deck", (0.68, 0.48, 0.31, 1.0), roughness=0.75, metallic=0.0)
mat_glass = create_pbr_mat("Marine_Glass", (0.04, 0.08, 0.12, 1.0), roughness=0.02, metallic=0.95)
mat_chrome = create_pbr_mat("Stainless_Steel", (0.95, 0.95, 0.96, 1.0), roughness=0.08, metallic=0.98)
mat_bronze = create_pbr_mat("Bronze_Prop", (0.82, 0.58, 0.25, 1.0), roughness=0.35, metallic=0.90)
mat_cushion = create_pbr_mat("Vinyl_Cushion", (0.92, 0.90, 0.86, 1.0), roughness=0.60, metallic=0.0)
mat_charcoal = create_pbr_mat("Console_Charcoal", (0.10, 0.12, 0.14, 1.0), roughness=0.45, metallic=0.1)
mat_nav_red = create_pbr_mat("Nav_Red", (1.0, 0.05, 0.05, 1.0), roughness=0.2)
mat_nav_green = create_pbr_mat("Nav_Green", (0.05, 1.0, 0.2, 1.0), roughness=0.2)

root_group = bpy.data.objects.new("Yacht_Root", None)
bpy.context.collection.objects.link(root_group)

# ── 2. HULL GEOMETRY (LOFTED DEEP-V MONOHULL) ──
# Cross-section profiles: [z, [(x, y), ...]] from keel to sheerline
stations = [
    # Station 0: Stem / Bow tip
    (7.4, [(0.0, -0.2), (0.06, 0.4), (0.12, 1.2), (0.15, 1.65)]),
    # Station 1: Forward Flare
    (5.4, [(0.0, -0.85), (0.45, -0.4), (1.1, 0.5), (1.45, 1.55)]),
    # Station 2: Forward Midbody
    (3.0, [(0.0, -1.15), (0.95, -0.75), (1.85, 0.3), (2.18, 1.45)]),
    # Station 3: Midships (Beam Max = 4.6m)
    (0.0, [(0.0, -1.25), (1.15, -0.85), (2.10, 0.15), (2.30, 1.35)]),
    # Station 4: Aft Midbody
    (-3.0, [(0.0, -1.20), (1.10, -0.82), (2.05, 0.10), (2.25, 1.28)]),
    # Station 5: Aft Quarters
    (-5.5, [(0.0, -1.12), (1.05, -0.78), (1.95, 0.05), (2.15, 1.22)]),
    # Station 6: Transom Stern
    (-7.2, [(0.0, -1.05), (0.98, -0.75), (1.85, 0.0), (2.05, 1.18)])
]

bm_hull = bmesh.new()
grid_verts = []

for s_idx, (z, pts) in enumerate(stations):
    row = []
    # Port side (negative x) reversed, center keel, starboard (positive x)
    # Keel pt is pts[0] where x = 0
    # Starboard points
    stbd = [(x, y, z) for (x, y) in pts]
    # Port points (exclude keel pt to avoid duplicate)
    port = [(-x, y, z) for (x, y) in pts[1:]]
    port.reverse()
    full_ring = port + stbd
    row_verts = [bm_hull.verts.new(p) for p in full_ring]
    grid_verts.append(row_verts)

for s in range(len(grid_verts) - 1):
    r1 = grid_verts[s]
    r2 = grid_verts[s + 1]
    for p in range(len(r1) - 1):
        v1, v2 = r1[p], r1[p + 1]
        v3, v4 = r2[p + 1], r2[p]
        bm_hull.faces.new([v1, v2, v3, v4])

# Cap transom stern face
transom_verts = grid_verts[-1]
bm_hull.faces.new(transom_verts)

# Create mesh object
mesh_hull = bpy.data.meshes.new("Hull_Mesh")
bm_hull.to_mesh(mesh_hull)
bm_hull.free()
mesh_hull.materials.append(mat_hull_dark)

obj_hull = bpy.data.objects.new("Hull", mesh_hull)
obj_hull.parent = root_group
bpy.context.collection.objects.link(obj_hull)

# Smooth shading & edge split
for poly in mesh_hull.polygons:
    poly.use_smooth = True

mod_sub = obj_hull.modifiers.new("Subsurf", 'SUBSURF')
mod_sub.levels = 1
mod_sub.render_levels = 2

# ── 3. MAIN TEAK DECK & SWIM PLATFORM ──
bm_deck = bmesh.new()
# Foredeck and cockpit floor
deck_pts = [
    (0.0, 1.62, 7.3),
    (1.35, 1.52, 5.2),
    (2.10, 1.42, 3.0),
    (2.22, 1.32, 0.0),
    (2.18, 1.25, -3.0),
    (2.08, 1.18, -5.5),
    (1.98, 1.15, -7.1),
    (-1.98, 1.15, -7.1),
    (-2.08, 1.18, -5.5),
    (-2.18, 1.25, -3.0),
    (-2.22, 1.32, 0.0),
    (-2.10, 1.42, 3.0),
    (-1.35, 1.52, 5.2)
]
deck_verts = [bm_deck.verts.new(p) for p in deck_pts]
bm_deck.faces.new(deck_verts)

# Aft Swim Platform (Extended hydraulic step at waterline)
plat_pts = [
    (1.85, 0.22, -7.15),
    (1.80, 0.20, -8.45),
    (-1.80, 0.20, -8.45),
    (-1.85, 0.22, -7.15)
]
plat_verts = [bm_deck.verts.new(p) for p in plat_pts]
bm_deck.faces.new(plat_verts)

mesh_deck = bpy.data.meshes.new("Deck_Mesh")
bm_deck.to_mesh(mesh_deck)
bm_deck.free()
mesh_deck.materials.append(mat_teak)
obj_deck = bpy.data.objects.new("Deck_Teak", mesh_deck)
obj_deck.parent = root_group
bpy.context.collection.objects.link(obj_deck)

# ── 4. STREAMLINED SUPERSTRUCTURE & SALOON CABIN ──
bm_cabin = bmesh.new()
# Raked saloon house with wraparound panoramic windscreen
cabin_box = [
    # Bottom rim
    (-1.75, 1.30, 2.8), (1.75, 1.30, 2.8),
    (1.85, 1.25, -1.8), (-1.85, 1.25, -1.8),
    # Top flybridge rim (tapered and raked aft)
    (-1.35, 2.55, 1.8), (1.35, 2.55, 1.8),
    (1.45, 2.50, -1.6), (-1.45, 2.50, -1.6)
]
cb_verts = [bm_cabin.verts.new(p) for p in cabin_box]
# Faces: Windscreen (front), sides, aft, top
bm_cabin.faces.new([cb_verts[0], cb_verts[1], cb_verts[5], cb_verts[4]]) # Windscreen
bm_cabin.faces.new([cb_verts[1], cb_verts[2], cb_verts[6], cb_verts[5]]) # Starboard side
bm_cabin.faces.new([cb_verts[2], cb_verts[3], cb_verts[7], cb_verts[6]]) # Aft bulkhead
bm_cabin.faces.new([cb_verts[3], cb_verts[0], cb_verts[4], cb_verts[7]]) # Port side
bm_cabin.faces.new([cb_verts[4], cb_verts[5], cb_verts[6], cb_verts[7]]) # Flybridge floor

mesh_cabin = bpy.data.meshes.new("Superstructure_Mesh")
bm_cabin.to_mesh(mesh_cabin)
bm_cabin.free()
mesh_cabin.materials.append(mat_gelcoat)
mesh_cabin.materials.append(mat_glass)

# Assign glass to windscreen and side windows
for poly in mesh_cabin.polygons:
    if poly.index in [0, 1, 3]:
        poly.material_index = 1
    else:
        poly.material_index = 0
    poly.use_smooth = True

obj_cabin = bpy.data.objects.new("Superstructure", mesh_cabin)
obj_cabin.parent = root_group
bpy.context.collection.objects.link(obj_cabin)

mod_bevel = obj_cabin.modifiers.new("Bevel", 'BEVEL')
mod_bevel.width = 0.08
mod_bevel.segments = 2

# ── 5. SWEPT-BACK AERODYNAMIC RADAR ARCH ──
bm_arch = bmesh.new()
# Arch cross section profile swept upwards and over cockpit
arch_pts = [
    # Base port
    (-1.65, 2.45, -1.5), (-1.65, 2.45, -1.1),
    # Top port
    (-1.10, 3.85, -1.6), (-1.10, 3.85, -1.2),
    # Top starboard
    (1.10, 3.85, -1.6), (1.10, 3.85, -1.2),
    # Base starboard
    (1.65, 2.45, -1.5), (1.65, 2.45, -1.1)
]
a_verts = [bm_arch.verts.new(p) for p in arch_pts]
# Port upright
bm_arch.faces.new([a_verts[0], a_verts[1], a_verts[3], a_verts[2]])
# Top bridge
bm_arch.faces.new([a_verts[2], a_verts[3], a_verts[5], a_verts[4]])
# Starboard upright
bm_arch.faces.new([a_verts[4], a_verts[5], a_verts[7], a_verts[6]])

mesh_arch = bpy.data.meshes.new("RadarArch_Mesh")
bm_arch.to_mesh(mesh_arch)
bm_arch.free()
mesh_arch.materials.append(mat_gelcoat)

obj_arch = bpy.data.objects.new("Radar_Arch", mesh_arch)
obj_arch.parent = root_group
bpy.context.collection.objects.link(obj_arch)

mod_solid = obj_arch.modifiers.new("Solidify", 'SOLIDIFY')
mod_solid.thickness = 0.22

# ── 6. DYNAMIC ANIMATED SUB-ASSEMBLIES ──

# A. ROTATING RAYMARINE RADAR SCANNER
bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.18, vertices=16, location=(0, 4.02, -1.4))
obj_radar = bpy.context.active_object
obj_radar.name = "Radar_Scanner"
obj_radar.parent = root_group
obj_radar.data.materials.append(mat_gelcoat)

# B. DUAL BRONZE PROPELLERS (Named for dynamic spin in Three.js)
def create_propeller(name, loc):
    bm_prop = bmesh.new()
    # Hub
    bmesh.ops.create_cone(bm_prop, cap_ends=True, cap_tris=False, segments=12, radius1=0.14, radius2=0.12, depth=0.32)
    # 4 Skewed Blades
    for b in range(4):
        ang = (b / 4.0) * math.pi * 2.0
        blade = bmesh.ops.create_cube(bm_prop, size=1.0)
        for v in blade['verts']:
            v.co.x *= 0.08
            v.co.y *= 0.38
            v.co.z *= 0.03
            # Twist angle
            rot_y = Matrix.Rotation(0.45, 4, 'Y')
            rot_z = Matrix.Rotation(ang, 4, 'Z')
            v.co = rot_z @ rot_y @ v.co
            v.co.x += math.cos(ang) * 0.24
            v.co.y += math.sin(ang) * 0.24
    mesh_prop = bpy.data.meshes.new(f"{name}_Mesh")
    bm_prop.to_mesh(mesh_prop)
    bm_prop.free()
    mesh_prop.materials.append(mat_bronze)
    obj_prop = bpy.data.objects.new(name, mesh_prop)
    obj_prop.location = loc
    obj_prop.rotation_euler = (math.pi / 2, 0, 0)
    obj_prop.parent = root_group
    bpy.context.collection.objects.link(obj_prop)
    return obj_prop

obj_prop_l = create_propeller("Propeller_L", Vector((-0.95, -1.05, -6.15)))
obj_prop_r = create_propeller("Propeller_R", Vector((0.95, -1.05, -6.15)))

# C. DUAL SPADE RUDDERS (Named for dynamic turning in Three.js)
def create_rudder(name, loc):
    bm_rud = bmesh.new()
    # Airfoil blade
    blade = bmesh.ops.create_cube(bm_rud, size=1.0)
    for v in blade['verts']:
        v.co.x *= 0.05
        v.co.y *= 0.35
        v.co.z *= 0.42
        v.co.z -= 0.15
        v.co.y -= 0.15
    mesh_rud = bpy.data.meshes.new(f"{name}_Mesh")
    bm_rud.to_mesh(mesh_rud)
    bm_rud.free()
    mesh_rud.materials.append(mat_bronze)
    obj_rud = bpy.data.objects.new(name, mesh_rud)
    obj_rud.location = loc
    obj_rud.parent = root_group
    bpy.context.collection.objects.link(obj_rud)
    return obj_rud

obj_rud_l = create_rudder("Rudder_L", Vector((-0.95, -0.95, -6.85)))
obj_rud_r = create_rudder("Rudder_R", Vector((0.95, -0.95, -6.85)))

# ── 7. STAINLESS STEEL BOW RAILS & MOORING HARDWARE ──
bm_rail = bmesh.new()
rail_pts = [
    (0.0, 2.25, 7.35),
    (0.85, 2.15, 5.8),
    (1.45, 2.05, 4.2),
    (1.85, 1.95, 2.2),
    (2.05, 1.85, 0.0),
    (-2.05, 1.85, 0.0),
    (-1.85, 1.95, 2.2),
    (-1.45, 2.05, 4.2),
    (-0.85, 2.15, 5.8)
]
r_verts = [bm_rail.verts.new(p) for p in rail_pts]
for i in range(len(r_verts) - 1):
    bm_rail.edges.new([r_verts[i], r_verts[i + 1]])

# Stanchion vertical uprights
for p in rail_pts:
    v_top = bm_rail.verts.new(p)
    v_bot = bm_rail.verts.new((p[0], p[1] - 0.55, p[2]))
    bm_rail.edges.new([v_top, v_bot])

mesh_rail = bpy.data.meshes.new("BowRail_Mesh")
bm_rail.to_mesh(mesh_rail)
bm_rail.free()
mesh_rail.materials.append(mat_chrome)
obj_rail = bpy.data.objects.new("Bow_Railings", mesh_rail)
obj_rail.parent = root_group
bpy.context.collection.objects.link(obj_rail)

mod_skin = obj_rail.modifiers.new("Skin", 'SKIN')
for v in obj_rail.data.skin_vertices[0].data:
    v.radius = [0.024, 0.024]

# ── 8. FOREDECK SUNPAD LOUNGER CUSHIONS ──
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.72, 3.8))
obj_sunpad = bpy.context.active_object
obj_sunpad.name = "Sunpad_Cushion"
obj_sunpad.scale = (1.4, 0.14, 1.6)
obj_sunpad.parent = root_group
obj_sunpad.data.materials.append(mat_cushion)
mod_bev_pad = obj_sunpad.modifiers.new("Bevel", 'BEVEL')
mod_bev_pad.width = 0.06

# ── 9. EXPORT COMPLETE GLB MODEL ──
out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\yacht.glb"
print(f"Exporting realistic sport yacht to: {out_path} ...")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    export_apply=True
)
print("SUCCESS: Exported yacht.glb")
