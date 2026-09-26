"""
Blender 5.2 Python Script: Generate Ultra-Detailed 18.5m Luxury Explorer Yacht
Builds watertight multi-material monohull, Burmese teak deck, glass bridge helm cockpit,
solidly attached structural pillars, rear-view wing mirrors, and fully anchored running gear
(shaft logs, Monel shafts, bronze P-bracket struts, 5-blade props, spade rudders).
Properly mapped so that glTF export matches Three.js coordinates (+X=Starboard, +Y=Up, +Z=Bow).
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# 1. Clean scene
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for mesh in list(bpy.data.meshes):
    bpy.data.meshes.remove(mesh, do_unlink=True)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat, do_unlink=True)

# Coordinate conversion: Three.js (x=beam, y=height, z=length/bow) -> Blender (X=beam, Y=-z, Z=y)
# Blender glTF exporter transforms (X_b, Y_b, Z_b) -> glTF (X_b, Z_b, -Y_b) = (x, y, -(-z)) = (x, y, z)
def B(x, y, z):
    return Vector((x, -z, y))

# Helper: Create Principled BSDF Material with PBR parameters
def create_pbr_mat(name, base_color, roughness=0.3, metallic=0.0, specular=0.5, clearcoat=0.0, transmission=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (base_color[0], base_color[1], base_color[2], alpha)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
        elif 'Specular' in bsdf.inputs:
            bsdf.inputs['Specular'].default_value = specular
        if clearcoat > 0 and 'Coat Weight' in bsdf.inputs:
            bsdf.inputs['Coat Weight'].default_value = clearcoat
        if transmission > 0:
            if 'Transmission Weight' in bsdf.inputs:
                bsdf.inputs['Transmission Weight'].default_value = transmission
            elif 'Transmission' in bsdf.inputs:
                bsdf.inputs['Transmission'].default_value = transmission
            if 'IOR' in bsdf.inputs:
                bsdf.inputs['IOR'].default_value = 1.52
    if alpha < 1.0 or transmission > 0:
        mat.blend_method = 'BLEND'
    return mat

# Cylinder between two Three.js points (x1, y1, z1) -> (x2, y2, z2)
def add_cylinder_3js(bm, p1_3js, p2_3js, radius, segments=12):
    v1 = B(*p1_3js)
    v2 = B(*p2_3js)
    diff = v2 - v1
    length = diff.length
    if length < 1e-5:
        return
    dir_vec = diff.normalized()
    mid = (v1 + v2) * 0.5
    rot = Vector((0, 0, 1)).rotation_difference(dir_vec).to_matrix().to_4x4()
    mat = Matrix.Translation(mid) @ rot
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=radius, radius2=radius, depth=length, segments=segments, matrix=mat)

# Materials Setup
mat_gelcoat_white = create_pbr_mat("Gelcoat_White", (0.95, 0.96, 0.98), roughness=0.12, metallic=0.05, clearcoat=0.6)
mat_hull_navy = create_pbr_mat("Hull_Navy", (0.03, 0.07, 0.14), roughness=0.15, metallic=0.25, clearcoat=0.5)
mat_bootstripe = create_pbr_mat("Bootstripe_Crimson", (0.78, 0.10, 0.08), roughness=0.20, metallic=0.1)
mat_gold = create_pbr_mat("Accent_Gold", (0.86, 0.70, 0.28), roughness=0.22, metallic=0.88)
mat_teak = create_pbr_mat("Teak_Deck", (0.58, 0.40, 0.24), roughness=0.68, metallic=0.0)
mat_glass_tint = create_pbr_mat("Marine_Glass_Tint", (0.02, 0.05, 0.08), roughness=0.04, metallic=0.90, transmission=0.65, alpha=0.7)
mat_glass_clear = create_pbr_mat("Marine_Glass_Clear", (0.88, 0.95, 1.0), roughness=0.03, metallic=0.05, transmission=0.95, alpha=0.15)
mat_chrome = create_pbr_mat("Stainless_Steel_316", (0.95, 0.96, 0.98), roughness=0.08, metallic=0.98)
mat_bronze = create_pbr_mat("Bronze_Marine", (0.80, 0.56, 0.22), roughness=0.30, metallic=0.92)
mat_cushion = create_pbr_mat("Cream_Leather_Cushion", (0.92, 0.91, 0.86), roughness=0.75, metallic=0.02)
mat_charcoal = create_pbr_mat("Console_Charcoal", (0.08, 0.10, 0.12), roughness=0.85, metallic=0.05)
mat_mfd = create_pbr_mat("MFD_Screen_Display", (0.00, 0.85, 0.95), roughness=0.10, metallic=0.0)

root_group = bpy.data.objects.new("Yacht_Root", None)
bpy.context.collection.objects.link(root_group)

# ── 2. HULL GEOMETRY (18.5m DEEP-V MONOHULL WITH FLARED CLIPPER BOW & BOOTSTRIPE) ──
stations = [
    # Station 0: Sharp raked stem tip
    (9.45, [(0.0, -0.60), (0.04, 0.00), (0.06, 0.50), (0.08, 1.05), (0.10, 1.48)]),
    # Station 1: Forward Flare
    (8.20, [(0.0, -1.10), (0.28, -0.40), (0.60, 0.15), (0.90, 0.75), (1.18, 1.44)]),
    # Station 2: Bow Shoulder
    (6.00, [(0.0, -1.50), (0.75, -0.75), (1.30, -0.10), (1.75, 0.65), (2.05, 1.40)]),
    # Station 3: Forward Midbody
    (3.50, [(0.0, -1.72), (1.10, -0.90), (1.80, -0.15), (2.25, 0.60), (2.45, 1.36)]),
    # Station 4: Midships (Max Beam = 5.2m)
    (0.00, [(0.0, -1.85), (1.25, -0.98), (1.95, -0.20), (2.40, 0.55), (2.60, 1.32)]),
    # Station 5: Aft Midbody
    (-3.50, [(0.0, -1.75), (1.20, -0.92), (1.90, -0.20), (2.35, 0.52), (2.55, 1.28)]),
    # Station 6: Aft Quarters
    (-6.50, [(0.0, -1.60), (1.15, -0.85), (1.80, -0.22), (2.22, 0.50), (2.42, 1.24)]),
    # Station 7: Transom Stern
    (-9.10, [(0.0, -1.45), (1.05, -0.78), (1.68, -0.25), (2.05, 0.48), (2.20, 1.20)])
]

bm_hull = bmesh.new()
hull_rings = []

for z_pos, pts in stations:
    stbd = [B(x, y, z_pos) for (x, y) in pts]
    port = [B(-x, y, z_pos) for (x, y) in pts[1:]]
    port.reverse()
    ring = port + stbd
    ring_verts = [bm_hull.verts.new(p) for p in ring]
    hull_rings.append(ring_verts)

for s in range(len(hull_rings) - 1):
    r1, r2 = hull_rings[s], hull_rings[s + 1]
    half_pts = len(stations[s][1])
    total_pts = len(r1)
    for p in range(total_pts - 1):
        v1, v2 = r1[p], r1[p + 1]
        v3, v4 = r2[p + 1], r2[p]
        face = bm_hull.faces.new([v1, v2, v3, v4])
        tier = p if p < half_pts else (total_pts - 1 - p)
        if tier <= 1:
            face.material_index = 0 # Lower underwater hull navy
        elif tier == 2:
            face.material_index = 1 # Crimson bootstripe
        else:
            face.material_index = 2 # Upper gelcoat topsides

# Watertight Transom Stern (Station 7): Solid closed transom wall
t_ring = hull_rings[-1]
# Connect port sheer to starboard sheer with a top cap edge
f_transom = bm_hull.faces.new(t_ring)
f_transom.material_index = 0

# Cap bow stem edge
f_bow = bm_hull.faces.new(hull_rings[0])
f_bow.material_index = 0

mesh_hull = bpy.data.meshes.new("Hull_Mesh")
bm_hull.to_mesh(mesh_hull)
bm_hull.free()

mesh_hull.materials.append(mat_hull_navy)     # 0
mesh_hull.materials.append(mat_bootstripe)    # 1
mesh_hull.materials.append(mat_gelcoat_white) # 2

obj_hull = bpy.data.objects.new("Hull", mesh_hull)
obj_hull.parent = root_group
bpy.context.collection.objects.link(obj_hull)

for poly in mesh_hull.polygons:
    poly.use_smooth = True

# ── 3. MAIN TEAK DECK & INTEGRATED SWIM PLATFORM ──
bm_deck = bmesh.new()
deck_profile = [
    (0.0, 1.48, 9.42),
    (0.85, 1.45, 8.2),
    (1.65, 1.42, 6.0),
    (2.15, 1.38, 3.5),
    (2.40, 1.35, 0.0),
    (2.35, 1.30, -3.5),
    (2.22, 1.26, -6.5),
    (2.20, 1.20, -9.10),
    (-2.20, 1.20, -9.10),
    (-2.22, 1.26, -6.5),
    (-2.35, 1.30, -3.5),
    (-2.40, 1.35, 0.0),
    (-2.15, 1.38, 3.5),
    (-1.65, 1.42, 6.0),
    (-0.85, 1.45, 8.2)
]
deck_verts = [bm_deck.verts.new(B(x, y, z)) for (x, y, z) in deck_profile]
bm_deck.faces.new(deck_verts)

# Solid Aft Teak Swim Platform extending flush from transom Z=-9.10 to Z=-10.35
plat_pts = [
    (-2.15, 0.15, -9.10),
    (2.15, 0.15, -9.10),
    (2.05, 0.12, -10.35),
    (-2.05, 0.12, -10.35)
]
plat_verts = [bm_deck.verts.new(B(x, y, z)) for (x, y, z) in plat_pts]
bm_deck.faces.new(plat_verts)

# Swim platform underside & perimeter coaming (watertight solid box)
plat_under = [
    (-2.15, -0.05, -9.10),
    (2.15, -0.05, -9.10),
    (2.05, -0.08, -10.35),
    (-2.05, -0.08, -10.35)
]
pu_verts = [bm_deck.verts.new(B(x, y, z)) for (x, y, z) in plat_under]
bm_deck.faces.new(pu_verts)
# Side edges
bm_deck.faces.new([plat_verts[0], plat_verts[1], pu_verts[1], pu_verts[0]])
bm_deck.faces.new([plat_verts[1], plat_verts[2], pu_verts[2], pu_verts[1]])
bm_deck.faces.new([plat_verts[2], plat_verts[3], pu_verts[3], pu_verts[2]])
bm_deck.faces.new([plat_verts[3], plat_verts[0], pu_verts[0], pu_verts[3]])

mesh_deck = bpy.data.meshes.new("Deck_Mesh")
bm_deck.to_mesh(mesh_deck)
bm_deck.free()
mesh_deck.materials.append(mat_teak)
obj_deck = bpy.data.objects.new("Deck_Teak", mesh_deck)
obj_deck.parent = root_group
bpy.context.collection.objects.link(obj_deck)

# Heavy-duty stainless steel transom cantilever support knees bolting platform to transom
bm_knees = bmesh.new()
for bx in [-1.5, -0.5, 0.5, 1.5]:
    add_cylinder_3js(bm_knees, (bx, -0.45, -9.10), (bx, 0.05, -9.95), radius=0.045)
    add_cylinder_3js(bm_knees, (bx, -0.05, -9.10), (bx, -0.05, -10.25), radius=0.040)
# Twin companionway stairs connecting main aft deck (Y=1.20) down to swim platform (Y=0.15)
for sx in [-1.75, 1.75]:
    for st in range(4):
        sy = 0.35 + st * 0.22
        sz = -9.95 + st * 0.22
        bmesh.ops.create_cube(bm_knees, size=1.0, matrix=Matrix.Translation(B(sx, sy, sz)) @ Matrix.Scale(0.65, 4, Vector((1,0,0))) @ Matrix.Scale(0.25, 4, Vector((0,1,0))) @ Matrix.Scale(0.16, 4, Vector((0,0,1))))

m_knees = bpy.data.meshes.new("TransomKnees_Mesh")
bm_knees.to_mesh(m_knees)
bm_knees.free()
m_knees.materials.append(mat_chrome)
obj_knees = bpy.data.objects.new("Transom_Support_Knees", m_knees)
obj_knees.parent = root_group
bpy.context.collection.objects.link(obj_knees)

# ── 4. STREAMLINED SALOON & WHEELHOUSE BASE ──
bm_saloon = bmesh.new()
saloon_box = [
    # Bottom sheer contour (sits right on main deck)
    (-1.95, 1.28, 3.2), (1.95, 1.28, 3.2),
    (2.10, 1.24, -5.5), (-2.10, 1.24, -5.5),
    # Top roof rim
    (-1.65, 2.75, 2.2), (1.65, 2.75, 2.2),
    (1.75, 2.65, -5.2), (-1.75, 2.65, -5.2)
]
s_verts = [bm_saloon.verts.new(B(x, y, z)) for (x, y, z) in saloon_box]
bm_saloon.faces.new([s_verts[0], s_verts[1], s_verts[5], s_verts[4]]) # Front rake
bm_saloon.faces.new([s_verts[1], s_verts[2], s_verts[6], s_verts[5]]) # Starboard window
bm_saloon.faces.new([s_verts[2], s_verts[3], s_verts[7], s_verts[6]]) # Aft bulkhead
bm_saloon.faces.new([s_verts[3], s_verts[0], s_verts[4], s_verts[7]]) # Port window
bm_saloon.faces.new([s_verts[4], s_verts[5], s_verts[6], s_verts[7]]) # Saloon roof

mesh_saloon = bpy.data.meshes.new("Saloon_Mesh")
bm_saloon.to_mesh(mesh_saloon)
bm_saloon.free()
mesh_saloon.materials.append(mat_gelcoat_white) # 0
mesh_saloon.materials.append(mat_glass_tint)     # 1

for poly in mesh_saloon.polygons:
    if poly.index in [1, 3]: # Tinted side windows
        poly.material_index = 1
    else:
        poly.material_index = 0
    poly.use_smooth = True

obj_saloon = bpy.data.objects.new("Superstructure_Saloon", mesh_saloon)
obj_saloon.parent = root_group
bpy.context.collection.objects.link(obj_saloon)

# ── 5. OPEN WHEELHOUSE, PANORAMIC WINDSCREEN, A/B PILLARS & WING MIRRORS ──
# Bridge waist-level bulwarks (coaming) firmly resting on saloon roof (Y=2.75) up to Y=3.25
bm_bridge_coaming = bmesh.new()
for sx in [-1.60, 1.60]:
    bmesh.ops.create_cube(bm_bridge_coaming, size=1.0, matrix=Matrix.Translation(B(sx, 3.00, 0.65)) @ Matrix.Scale(0.14, 4, Vector((1,0,0))) @ Matrix.Scale(3.10, 4, Vector((0,1,0))) @ Matrix.Scale(0.50, 4, Vector((0,0,1))))

m_b_coaming = bpy.data.meshes.new("BridgeCoaming_Mesh")
bm_bridge_coaming.to_mesh(m_b_coaming)
bm_bridge_coaming.free()
m_b_coaming.materials.append(mat_gelcoat_white)
obj_b_coaming = bpy.data.objects.new("Bridge_Coaming", m_b_coaming)
obj_b_coaming.parent = root_group
bpy.context.collection.objects.link(obj_b_coaming)

# Panoramic Forward Windscreen (15° forward rake reverse sheer): Z=2.20 to 2.38, Y=3.25 to 4.10
bm_screen = bmesh.new()
screen_pts = [
    (-1.55, 3.25, 2.20), (1.55, 3.25, 2.20),
    (1.58, 4.10, 2.38), (-1.58, 4.10, 2.38)
]
scr_verts = [bm_screen.verts.new(B(x, y, z)) for (x, y, z) in screen_pts]
bm_screen.faces.new(scr_verts)

# Side panoramic quarter-light windows running from A-pillar to B-pillar
for sx in [-1.58, 1.58]:
    side_pts = [
        (sx, 3.25, 2.20),
        (sx, 4.10, 2.38),
        (sx, 4.10, -0.75),
        (sx, 3.25, -0.75)
    ]
    if sx < 0:
        side_pts.reverse()
    s_v = [bm_screen.verts.new(B(x, y, z)) for (x, y, z) in side_pts]
    bm_screen.faces.new(s_v)

mesh_screen = bpy.data.meshes.new("Windscreen_Mesh")
bm_screen.to_mesh(mesh_screen)
bm_screen.free()
mesh_screen.materials.append(mat_glass_clear)

obj_screen = bpy.data.objects.new("Windscreen", mesh_screen)
obj_screen.parent = root_group
bpy.context.collection.objects.link(obj_screen)

# ── SOLID STRUCTURAL PILLARS (A-Pillars & B-Pillars) FIRMLY SUPPORTING HARDTOP ──
bm_pillars = bmesh.new()
for sx in [-1.58, 1.58]:
    # 1. Forward A-Pillar: runs continuously from bridge coaming (Y=3.20, Z=2.20) to hardtop roof (Y=4.12, Z=2.38)
    add_cylinder_3js(bm_pillars, (sx, 3.20, 2.20), (sx, 4.12, 2.38), radius=0.048, segments=12)

    # 2. Aft B-Pillar / Arch Leg: runs continuously from saloon roof (Y=2.70, Z=-0.75) to hardtop roof (Y=4.12, Z=-0.75)
    add_cylinder_3js(bm_pillars, (sx, 2.70, -0.75), (sx, 4.12, -0.75), radius=0.055, segments=12)

    # 3. Horizontal window sill & upper roof frame trims linking A-pillar and B-pillar
    add_cylinder_3js(bm_pillars, (sx, 3.25, 2.20), (sx, 3.25, -0.75), radius=0.030, segments=8)
    add_cylinder_3js(bm_pillars, (sx, 4.10, 2.38), (sx, 4.10, -0.75), radius=0.032, segments=8)

    # 4. Chrome Rear-View Wing Mirrors solidly anchored directly onto the A-Pillar:
    # Stalk extends horizontally outward from the A-pillar
    bracket_inner = (sx, 3.65, 2.28)
    bracket_outer = (sx + (0.16 if sx > 0 else -0.16), 3.65, 2.28)
    add_cylinder_3js(bm_pillars, bracket_inner, bracket_outer, radius=0.018, segments=8)

    # Aerodynamic contoured chrome mirror housing firmly attached to outer end of stalk
    hx = sx + (0.22 if sx > 0 else -0.22)
    bmesh.ops.create_cube(bm_pillars, size=1.0, matrix=Matrix.Translation(B(hx, 3.65, 2.28)) @ Matrix.Scale(0.06, 4, Vector((1,0,0))) @ Matrix.Scale(0.16, 4, Vector((0,1,0))) @ Matrix.Scale(0.24, 4, Vector((0,0,1))))

m_pillars = bpy.data.meshes.new("Pillars_Mesh")
bm_pillars.to_mesh(m_pillars)
bm_pillars.free()
m_pillars.materials.append(mat_chrome)
obj_pillars = bpy.data.objects.new("Bridge_Structural_Pillars", m_pillars)
obj_pillars.parent = root_group
bpy.context.collection.objects.link(obj_pillars)

# High-Reflectivity Mirror Glass faces facing aft towards stern (Z < 0)
bm_mg = bmesh.new()
for sx in [-1.58, 1.58]:
    hx = sx + (0.22 if sx > 0 else -0.22)
    bmesh.ops.create_grid(bm_mg, x_segments=1, y_segments=1, size=0.5, matrix=Matrix.Translation(B(hx, 3.65, 2.20)) @ Matrix.Scale(0.12, 4, Vector((1,0,0))) @ Matrix.Scale(0.20, 4, Vector((0,0,1))))
m_mg = bpy.data.meshes.new("MirrorGlass_Mesh")
bm_mg.to_mesh(m_mg)
bm_mg.free()
m_mg.materials.append(mat_chrome)
obj_mg = bpy.data.objects.new("Mirror_Glass", m_mg)
obj_mg.parent = root_group
bpy.context.collection.objects.link(obj_mg)

# ── 6. HIGH-TECH GLASS BRIDGE HELM CONSOLE (Visible in 1st Person Bridge View) ──
bm_dash = bmesh.new()
bmesh.ops.create_cube(bm_dash, size=1.0)
for v in bm_dash.verts:
    v.co.x *= 2.45
    v.co.y *= 0.88
    v.co.z *= 0.28
m_dash = bpy.data.meshes.new("Dash_Mesh")
bm_dash.to_mesh(m_dash)
bm_dash.free()
m_dash.materials.append(mat_charcoal)
obj_dash = bpy.data.objects.new("Helm_Dashboard", m_dash)
obj_dash.location = B(0, 2.92, 1.88)
obj_dash.rotation_euler = (math.radians(-14), 0, 0)
obj_dash.parent = root_group
bpy.context.collection.objects.link(obj_dash)

# Triple MFD screens (GPS chartplotter, 360° radar, engine telemetry)
bm_mfd = bmesh.new()
bmesh.ops.create_grid(bm_mfd, x_segments=1, y_segments=1, size=0.5)
for v in bm_mfd.verts:
    v.co.x *= 2.25
    v.co.y *= 0.30
m_mfd = bpy.data.meshes.new("MFD_Mesh")
bm_mfd.to_mesh(m_mfd)
bm_mfd.free()
m_mfd.materials.append(mat_mfd)
obj_mfd = bpy.data.objects.new("Helm_MFD_Display", m_mfd)
obj_mfd.location = B(0, 3.04, 1.82)
obj_mfd.rotation_euler = (math.radians(-14), 0, 0)
obj_mfd.parent = root_group
bpy.context.collection.objects.link(obj_mfd)

# Angled steering column mounting hub
bm_col = bmesh.new()
bmesh.ops.create_cone(bm_col, cap_ends=True, radius1=0.045, radius2=0.055, depth=0.22, segments=12)
m_col = bpy.data.meshes.new("Col_Mesh")
bm_col.to_mesh(m_col)
bm_col.free()
m_col.materials.append(mat_chrome)
obj_col = bpy.data.objects.new("Steering_Column", m_col)
obj_col.location = B(-0.45, 3.12, 1.68)
obj_col.rotation_euler = (math.radians(35), 0, 0)
obj_col.parent = root_group
bpy.context.collection.objects.link(obj_col)

# 3-Spoke Marine Steering Wheel (Interactive: named Helm_Wheel)
wheel_pivot = bpy.data.objects.new("Helm_Wheel", None)
wheel_pivot.location = B(-0.45, 3.25, 1.58)
wheel_pivot.rotation_euler = (math.radians(35), 0, 0)
wheel_pivot.parent = root_group
bpy.context.collection.objects.link(wheel_pivot)

bm_wheel = bmesh.new()
num_c_segs, num_t_segs = 24, 8
R, r = 0.18, 0.02
for i in range(num_c_segs):
    phi1 = (i / num_c_segs) * math.pi * 2.0
    phi2 = ((i + 1) / num_c_segs) * math.pi * 2.0
    for j in range(num_t_segs):
        theta1 = (j / num_t_segs) * math.pi * 2.0
        theta2 = ((j + 1) / num_t_segs) * math.pi * 2.0
        p1 = Vector(((R + r * math.cos(theta1)) * math.cos(phi1), (R + r * math.cos(theta1)) * math.sin(phi1), r * math.sin(theta1)))
        p2 = Vector(((R + r * math.cos(theta2)) * math.cos(phi1), (R + r * math.cos(theta2)) * math.sin(phi1), r * math.sin(theta2)))
        p3 = Vector(((R + r * math.cos(theta2)) * math.cos(phi2), (R + r * math.cos(theta2)) * math.sin(phi2), r * math.sin(theta2)))
        p4 = Vector(((R + r * math.cos(theta1)) * math.cos(phi2), (R + r * math.cos(theta1)) * math.sin(phi2), r * math.sin(theta1)))
        bm_wheel.faces.new([bm_wheel.verts.new(p1), bm_wheel.verts.new(p2), bm_wheel.verts.new(p3), bm_wheel.verts.new(p4)])

bmesh.ops.create_cone(bm_wheel, cap_ends=True, radius1=0.045, radius2=0.045, depth=0.04, segments=12)
for sp in range(3):
    ang = (sp / 3.0) * math.pi * 2.0
    bmesh.ops.create_cube(bm_wheel, size=1.0, matrix=Matrix.Translation(Vector((math.cos(ang) * 0.09, math.sin(ang) * 0.09, 0))) @ Matrix.Rotation(ang, 4, 'Z') @ Matrix.Scale(0.16, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.018, 4, Vector((0, 1, 0))) @ Matrix.Scale(0.015, 4, Vector((0, 0, 1))))

m_wheel = bpy.data.meshes.new("Wheel_Mesh")
bm_wheel.to_mesh(m_wheel)
bm_wheel.free()
m_wheel.materials.append(mat_chrome)
obj_wheel_mesh = bpy.data.objects.new("Helm_Wheel_Mesh", m_wheel)
obj_wheel_mesh.location = (0, 0, 0)
obj_wheel_mesh.parent = wheel_pivot
bpy.context.collection.objects.link(obj_wheel_mesh)

# Throttle Quadrant Base & Levers (Interactive: named Throttle_Levers)
bm_th_base = bmesh.new()
bmesh.ops.create_cube(bm_th_base, size=1.0)
for v in bm_th_base.verts:
    v.co.x *= 0.18
    v.co.y *= 0.22
    v.co.z *= 0.08
m_th_base = bpy.data.meshes.new("ThrotBase_Mesh")
bm_th_base.to_mesh(m_th_base)
bm_th_base.free()
m_th_base.materials.append(mat_chrome)
obj_th_base = bpy.data.objects.new("Throttle_Base", m_th_base)
obj_th_base.location = B(0.22, 3.06, 1.68)
obj_th_base.parent = root_group
bpy.context.collection.objects.link(obj_th_base)

throt_group = bpy.data.objects.new("Throttle_Levers", None)
throt_group.location = B(0.22, 3.10, 1.68)
throt_group.parent = root_group
bpy.context.collection.objects.link(throt_group)

for lx, col_mat in [(-0.042, mat_bootstripe), (0.042, mat_hull_navy)]:
    bm_lev = bmesh.new()
    bmesh.ops.create_cone(bm_lev, cap_ends=True, radius1=0.008, radius2=0.008, depth=0.14, segments=8, matrix=Matrix.Translation(Vector((lx, 0, 0.07))))
    bmesh.ops.create_uvsphere(bm_lev, u_segments=12, v_segments=8, radius=0.02, matrix=Matrix.Translation(Vector((lx, 0, 0.14))) @ Matrix.Scale(1.1, 4, Vector((0, 1, 0))) @ Matrix.Scale(1.4, 4, Vector((0, 0, 1))))
    m_lev = bpy.data.meshes.new(f"LeverMesh_{'P' if lx<0 else 'S'}")
    bm_lev.to_mesh(m_lev)
    bm_lev.free()
    m_lev.materials.append(col_mat)
    o_lev = bpy.data.objects.new(f"Throttle_Lever_{'Port' if lx<0 else 'Stbd'}", m_lev)
    o_lev.location = (0, 0, 0)
    o_lev.parent = throt_group
    bpy.context.collection.objects.link(o_lev)

# ── 7. FLYBRIDGE HARDTOP & RADAR ARCH ──
# Hardtop roof: firmly anchored to the A-pillars and B-pillars
bm_hardtop = bmesh.new()
bmesh.ops.create_cube(bm_hardtop, size=1.0)
for v in bm_hardtop.verts:
    v.co.x *= 3.4
    v.co.y *= 3.8
    v.co.z *= 0.12
m_hardtop = bpy.data.meshes.new("Hardtop_Mesh")
bm_hardtop.to_mesh(m_hardtop)
bm_hardtop.free()
m_hardtop.materials.append(mat_gelcoat_white)
obj_hardtop = bpy.data.objects.new("Hardtop_Roof", m_hardtop)
obj_hardtop.location = B(0, 4.12, 0.75) # Sits perfectly on tops of A-pillars (Z=2.38) and B-pillars (Z=-0.75)
obj_hardtop.parent = root_group
bpy.context.collection.objects.link(obj_hardtop)

# Rotating Marine Radar Antenna (Interactive: Radar_Scanner)
radar_pedestal_mesh = bpy.data.meshes.new("RadarPed_Mesh")
bm_rped = bmesh.new()
bmesh.ops.create_cone(bm_rped, cap_ends=True, radius1=0.18, radius2=0.22, depth=0.25, segments=12)
bm_rped.to_mesh(radar_pedestal_mesh)
bm_rped.free()
radar_pedestal_mesh.materials.append(mat_gelcoat_white)
obj_rad_ped = bpy.data.objects.new("Radar_Pedestal", radar_pedestal_mesh)
obj_rad_ped.location = B(0, 4.30, -0.30)
obj_rad_ped.parent = root_group
bpy.context.collection.objects.link(obj_rad_ped)

radar_scanner_pivot = bpy.data.objects.new("Radar_Scanner", None)
radar_scanner_pivot.location = B(0, 4.45, -0.30)
radar_scanner_pivot.parent = root_group
bpy.context.collection.objects.link(radar_scanner_pivot)

bm_rbar = bmesh.new()
bmesh.ops.create_cube(bm_rbar, size=1.0)
for v in bm_rbar.verts:
    v.co.x *= 1.65
    v.co.y *= 0.14
    v.co.z *= 0.16
m_rbar = bpy.data.meshes.new("RadarBar_Mesh")
bm_rbar.to_mesh(m_rbar)
bm_rbar.free()
m_rbar.materials.append(mat_gelcoat_white)
obj_rad_bar = bpy.data.objects.new("Radar_Array_Bar", m_rbar)
obj_rad_bar.location = (0, 0, 0)
obj_rad_bar.parent = radar_scanner_pivot
bpy.context.collection.objects.link(obj_rad_bar)

# Dual KVH satellite domes firmly anchored to hardtop
for dx in [-0.85, 0.85]:
    bm_dome = bmesh.new()
    bmesh.ops.create_uvsphere(bm_dome, u_segments=16, v_segments=12, radius=0.34, matrix=Matrix.Translation(Vector((0, 0, 0.28))))
    bmesh.ops.create_cone(bm_dome, cap_ends=True, radius1=0.25, radius2=0.28, depth=0.14, segments=16, matrix=Matrix.Translation(Vector((0, 0, 0.07))))
    m_dome = bpy.data.meshes.new(f"DomeMesh_{'P' if dx<0 else 'S'}")
    bm_dome.to_mesh(m_dome)
    bm_dome.free()
    m_dome.materials.append(mat_gelcoat_white)
    o_dome = bpy.data.objects.new(f"Sat_Dome_{'Port' if dx<0 else 'Stbd'}", m_dome)
    o_dome.location = B(dx, 4.18, 0.35)
    o_dome.parent = root_group
    bpy.context.collection.objects.link(o_dome)

# ── 8. SOLID RUNNING GEAR: HULL PENETRATIONS, SHAFTS, P-BRACKET STRUTS, PROPELLERS & RUDDERS ──
bm_gear = bmesh.new()
for sx in [-1.20, 1.20]:
    # 1. Bronze Shaft Log Collar right on the hull deadrise at Z = -5.80, Y = -0.85
    bmesh.ops.create_cone(bm_gear, cap_ends=True, radius1=0.12, radius2=0.15, depth=0.35, segments=12, matrix=Matrix.Translation(B(sx, -0.85, -5.80)))

    # 2. Monel Propeller Shaft: runs mathematically from shaft log (sx, -0.85, -5.80) to cutless bearing (sx, -1.25, -8.15)
    p_shaft_start = (sx, -0.85, -5.80)
    p_shaft_end   = (sx, -1.25, -8.15)
    add_cylinder_3js(bm_gear, p_shaft_start, p_shaft_end, radius=0.045, segments=12)

    # 3. Bronze P-Bracket Cutless Bearing Barrel enclosing the shaft at Z = -8.05
    p_barrel_start = (sx, -1.23, -7.95)
    p_barrel_end   = (sx, -1.26, -8.15)
    add_cylinder_3js(bm_gear, p_barrel_start, p_barrel_end, radius=0.09, segments=12)

    # 4. Heavy-Duty Bronze V-Strut Arm: bolts the cutless bearing directly UP into the hull deadrise at Y = -0.72
    p_strut_bottom = (sx, -1.24, -8.05)
    p_strut_top    = (sx, -0.70, -8.05)
    add_cylinder_3js(bm_gear, p_strut_bottom, p_strut_top, radius=0.055, segments=10)

    # 5. Bronze Rudder Port Collar on the hull deadrise at Z = -8.80, Y = -0.62
    add_cylinder_3js(bm_gear, (sx, -0.58, -8.80), (sx, -0.66, -8.80), radius=0.10, segments=12)

m_gear = bpy.data.meshes.new("RunningGear_Mesh")
bm_gear.to_mesh(m_gear)
bm_gear.free()
m_gear.materials.append(mat_bronze)
obj_gear = bpy.data.objects.new("Running_Gear_Mounts", m_gear)
obj_gear.parent = root_group
bpy.context.collection.objects.link(obj_gear)

# 2. Interactive 5-Blade Bronze Propellers firmly keyed onto end of shaft at Z = -8.22, Y = -1.26
def build_propeller(name, sx, sy, sz):
    pivot = bpy.data.objects.new(name, None)
    pivot.location = B(sx, sy, sz)
    pivot.parent = root_group
    bpy.context.collection.objects.link(pivot)

    bm = bmesh.new()
    # Conical bronze hub aligned along shaft axis (-Y in Blender, which is +Z in Three.js)
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=0.14, radius2=0.07, depth=0.32, segments=12, matrix=Matrix.Rotation(math.radians(90), 4, 'X'))
    for b in range(5):
        ang = (b / 5.0) * math.pi * 2.0
        mat_blade = Matrix.Rotation(ang, 4, 'Y') @ Matrix.Translation(Vector((0.18, 0, 0))) @ Matrix.Rotation(math.radians(28), 4, 'X') @ Matrix.Scale(0.22, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.02, 4, Vector((0, 1, 0))) @ Matrix.Scale(0.08, 4, Vector((0, 0, 1)))
        bmesh.ops.create_cube(bm, size=1.0, matrix=mat_blade)

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat_bronze)

    obj = bpy.data.objects.new(f"{name}_Body", mesh)
    obj.location = (0, 0, 0)
    obj.parent = pivot
    bpy.context.collection.objects.link(obj)
    return pivot

build_propeller("Propeller_L", -1.20, -1.26, -8.22)
build_propeller("Propeller_R", 1.20, -1.26, -8.22)

# 3. Interactive Spade Rudders (stock entering hull collar at Z = -8.80, Y = -0.62)
def build_rudder(name, sx, sy, sz):
    pivot = bpy.data.objects.new(name, None)
    # Pivot positioned right at the hull rudder port collar
    pivot.location = B(sx, sy, sz)
    pivot.parent = root_group
    bpy.context.collection.objects.link(pivot)

    bm = bmesh.new()
    # Vertical rudder stock entering hull at local Z=0 down to Z=-0.75
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=0.048, radius2=0.048, depth=0.75, segments=12, matrix=Matrix.Translation(Vector((0, 0, -0.375))))
    # Hydrofoil rudder blade
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector((0, 0.14, -0.55))) @ Matrix.Scale(0.065, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.55, 4, Vector((0, 1, 0))) @ Matrix.Scale(0.75, 4, Vector((0, 0, 1))))

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat_chrome)

    obj = bpy.data.objects.new(f"{name}_Body", mesh)
    obj.location = (0, 0, 0)
    obj.parent = pivot
    bpy.context.collection.objects.link(obj)
    return pivot

build_rudder("Rudder_L", -1.20, -0.62, -8.80)
build_rudder("Rudder_R", 1.20, -0.62, -8.80)

# ── 9. FOREDECK LUXURY SUNPAD & CONTINUOUS BOW PULPIT RAILS ──
bm_pad = bmesh.new()
bmesh.ops.create_cube(bm_pad, size=1.0)
for v in bm_pad.verts:
    v.co.x *= 2.2
    v.co.y *= 2.8
    v.co.z *= 0.18
m_pad = bpy.data.meshes.new("Sunpad_Mesh")
bm_pad.to_mesh(m_pad)
bm_pad.free()
m_pad.materials.append(mat_cushion)
obj_sunpad = bpy.data.objects.new("Foredeck_Sunpad", m_pad)
obj_sunpad.location = B(0, 1.52, 5.5)
obj_sunpad.parent = root_group
bpy.context.collection.objects.link(obj_sunpad)

bm_bol = bmesh.new()
bmesh.ops.create_cone(bm_bol, cap_ends=True, radius1=0.12, radius2=0.12, depth=2.15, segments=16, matrix=Matrix.Rotation(math.radians(90), 4, 'X'))
m_bol = bpy.data.meshes.new("Bolster_Mesh")
bm_bol.to_mesh(m_bol)
bm_bol.free()
m_bol.materials.append(mat_cushion)
obj_bolster = bpy.data.objects.new("Sunpad_Bolster", m_bol)
obj_bolster.location = B(0, 1.68, 6.85)
obj_bolster.parent = root_group
bpy.context.collection.objects.link(obj_bolster)

# Seamless, continuous stainless steel bow pulpit railings
bm_rail = bmesh.new()
rail_stations = [
    (-2.15, 1.95, 0.0),
    (-1.95, 2.00, 3.5),
    (-1.45, 2.08, 6.0),
    (-0.75, 2.16, 8.2),
    (0.00, 2.22, 9.38),
    (0.75, 2.16, 8.2),
    (1.45, 2.08, 6.0),
    (1.95, 2.00, 3.5),
    (2.15, 1.95, 0.0)
]
for i in range(len(rail_stations) - 1):
    p1 = rail_stations[i]
    p2 = rail_stations[i+1]
    add_cylinder_3js(bm_rail, p1, p2, radius=0.02, segments=8)

for (x, y, z) in rail_stations:
    add_cylinder_3js(bm_rail, (x, 1.35, z), (x, y, z), radius=0.02, segments=8)

m_rail = bpy.data.meshes.new("BowRail_Mesh")
bm_rail.to_mesh(m_rail)
bm_rail.free()
m_rail.materials.append(mat_chrome)
obj_rail = bpy.data.objects.new("Bow_Railings", m_rail)
obj_rail.parent = root_group
bpy.context.collection.objects.link(obj_rail)

# ── 10. EXPORT HIGH-DETAIL GLB MODEL ──
out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\yacht.glb"
print(f"Exporting ultra-detailed luxury yacht to: {out_path} ...")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    export_apply=True
)
print("SUCCESS: Exported yacht.glb successfully with PBR materials, solidly attached running gear, and structural bridge.")
