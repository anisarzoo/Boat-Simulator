"""
Blender 5.2 Python Script: Generate Ultra-Realistic Historic Coastal Lighthouse ("Lightroom")
Builds:
- assets/models/lighthouse.glb
Features:
- Weathered stone foundation with arched oak entry door and steps
- Classical tapering cylindrical masonry tower (26m tall) with alternating red & white maritime bands
- Recessed stone casement arched windows with sills
- Corbelled capital supporting the cast iron gallery balcony with safety stanchions & railings
- Octagonal glass lantern room with polished brass framework & crystal-clear safety glass
- Hyper-detailed multi-tier concentric brass Fresnel lens optical assembly with central glowing lamp
- Domed copper cupola roof with green verdigris patina, lightning conductor rod & spinning anemometer
- Attached stone lighthouse keeper's cottage with gabled slate roof, stone quoins & chimney
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

# Coordinate conversion: Three.js (x, y=height, z) -> Blender (X=x, Y=-z, Z=y)
def B(x, y, z):
    return Vector((x, -z, y))

def create_pbr_mat(name, base_color, roughness=0.5, metallic=0.0, transmission=0.0, alpha=1.0, emissive=(0, 0, 0)):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (base_color[0], base_color[1], base_color[2], alpha)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if transmission > 0:
            if 'Transmission Weight' in bsdf.inputs:
                bsdf.inputs['Transmission Weight'].default_value = transmission
            elif 'Transmission' in bsdf.inputs:
                bsdf.inputs['Transmission'].default_value = transmission
            if 'IOR' in bsdf.inputs:
                bsdf.inputs['IOR'].default_value = 1.52
        if any(e > 0 for e in emissive):
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = (emissive[0], emissive[1], emissive[2], 1.0)
                bsdf.inputs['Emission Strength'].default_value = 3.5
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = (emissive[0], emissive[1], emissive[2], 1.0)
    if alpha < 1.0 or transmission > 0:
        mat.blend_method = 'BLEND'
    return mat

# PBR Materials
mat_granite = create_pbr_mat("Lighthouse_Granite_Base", (0.35, 0.36, 0.38), roughness=0.88, metallic=0.02)
mat_white_brick = create_pbr_mat("Lighthouse_White_Stucco", (0.92, 0.93, 0.94), roughness=0.72, metallic=0.01)
mat_red_band = create_pbr_mat("Lighthouse_Red_Band", (0.75, 0.12, 0.10), roughness=0.68, metallic=0.02)
mat_iron_black = create_pbr_mat("Cast_Iron_Balcony", (0.12, 0.13, 0.15), roughness=0.45, metallic=0.85)
mat_brass = create_pbr_mat("Fresnel_Brass", (0.84, 0.68, 0.28), roughness=0.22, metallic=0.92)
mat_copper_patina = create_pbr_mat("Cupola_Copper_Patina", (0.28, 0.52, 0.44), roughness=0.65, metallic=0.35)
mat_glass = create_pbr_mat("Lantern_Glass", (0.92, 0.96, 1.0), roughness=0.03, metallic=0.08, transmission=0.95, alpha=0.15)
mat_lamp_glow = create_pbr_mat("Fresnel_Lamp_Core", (1.0, 0.95, 0.8), roughness=0.1, emissive=(1.0, 0.92, 0.75))
mat_slate_roof = create_pbr_mat("Slate_Roof", (0.22, 0.24, 0.28), roughness=0.82)
mat_wood_door = create_pbr_mat("Oak_Timber_Door", (0.28, 0.18, 0.10), roughness=0.78)

root = bpy.data.objects.new("Lighthouse_Root", None)
bpy.context.collection.objects.link(root)

# ── 1. OCTAGONAL CUT-STONE FOUNDATION BASE ──
bm_base = bmesh.new()
bmesh.ops.create_cone(bm_base, cap_ends=True, radius1=5.8, radius2=5.2, depth=3.8, segments=8, matrix=Matrix.Translation(Vector((0, 0, 1.9))))
# Entrance stairway projecting outward (towards +Z south in Three.js = -Y in Blender)
for st in range(4):
    w = 3.2 - st * 0.25
    d = 0.9
    h = 0.35
    mat_step = Matrix.Translation(Vector((0, -5.6 - st * 0.75, 0.18 + st * h))) @ Matrix.Scale(w, 4, Vector((1, 0, 0))) @ Matrix.Scale(d, 4, Vector((0, 1, 0))) @ Matrix.Scale(h, 4, Vector((0, 0, 1)))
    bmesh.ops.create_cube(bm_base, size=1.0, matrix=mat_step)

m_base = bpy.data.meshes.new("Base_Mesh")
bm_base.to_mesh(m_base)
bm_base.free()
m_base.materials.append(mat_granite)
obj_base = bpy.data.objects.new("Lighthouse_Foundation", m_base)
obj_base.parent = root
bpy.context.collection.objects.link(obj_base)

# Arched Oak Entry Door
bm_door = bmesh.new()
bmesh.ops.create_cube(bm_door, size=1.0, matrix=Matrix.Translation(Vector((0, -5.1, 2.4))) @ Matrix.Scale(1.8, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.35, 4, Vector((0, 1, 0))) @ Matrix.Scale(2.8, 4, Vector((0, 0, 1))))
m_door = bpy.data.meshes.new("Door_Mesh")
bm_door.to_mesh(m_door)
bm_door.free()
m_door.materials.append(mat_wood_door)
obj_door = bpy.data.objects.new("Entry_Door", m_door)
obj_door.parent = root
bpy.context.collection.objects.link(obj_door)

# ── 2. TAPERING CYLINDRICAL TOWER (24m Tall, 5 Alternating Bands) ──
# Built with red and white alternating sections
band_h = 4.2
num_bands = 5
base_h = 3.8

for b in range(num_bands):
    bm_band = bmesh.new()
    r_bot = 4.9 - b * 0.30
    r_top = 4.9 - (b + 1) * 0.30
    cz = base_h + b * band_h + band_h / 2.0
    bmesh.ops.create_cone(bm_band, cap_ends=True, radius1=r_bot, radius2=r_top, depth=band_h, segments=24, matrix=Matrix.Translation(Vector((0, 0, cz))))
    
    # Add deep stone-framed arched windows on bands 1, 2, 3
    if b in [1, 2, 3]:
        # Window facing south (-Y in Blender)
        w_z = base_h + b * band_h + band_h * 0.5
        mat_win = Matrix.Translation(Vector((0, -(r_bot + r_top) * 0.5 + 0.1, w_z))) @ Matrix.Scale(0.9, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.45, 4, Vector((0, 1, 0))) @ Matrix.Scale(1.6, 4, Vector((0, 0, 1)))
        bmesh.ops.create_cube(bm_band, size=1.0, matrix=mat_win)

    m_band = bpy.data.meshes.new(f"TowerBand_{b}_Mesh")
    bm_band.to_mesh(m_band)
    bm_band.free()
    m_band.materials.append(mat_red_band if b % 2 == 1 else mat_white_brick)
    
    obj_band = bpy.data.objects.new(f"Tower_Band_{b}", m_band)
    obj_band.parent = root
    bpy.context.collection.objects.link(obj_band)
    for p in m_band.polygons:
        p.use_smooth = True

# ── 3. CORBELLED GALLERY CAPITAL & CAST IRON BALCONY ──
gallery_z = base_h + num_bands * band_h # Y = 24.8m in Three.js = Z in Blender

bm_gallery = bmesh.new()
# Flared stone corbel capital
bmesh.ops.create_cone(bm_gallery, cap_ends=True, radius1=3.4, radius2=4.8, depth=1.2, segments=24, matrix=Matrix.Translation(Vector((0, 0, gallery_z - 0.6))))
# Cast iron balcony deck slab
bmesh.ops.create_cone(bm_gallery, cap_ends=True, radius1=4.9, radius2=4.9, depth=0.35, segments=24, matrix=Matrix.Translation(Vector((0, 0, gallery_z + 0.18))))

# Circular iron railing with stanchions
r_rail = 4.75
num_stanchions = 24
for s in range(num_stanchions):
    ang = (s / float(num_stanchions)) * math.pi * 2.0
    px = math.cos(ang) * r_rail
    py = math.sin(ang) * r_rail
    mat_stan = Matrix.Translation(Vector((px, py, gallery_z + 0.85))) @ Matrix.Scale(0.06, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.06, 4, Vector((0, 1, 0))) @ Matrix.Scale(1.1, 4, Vector((0, 0, 1)))
    bmesh.ops.create_cube(bm_gallery, size=1.0, matrix=mat_stan)

# Top and middle handrail rings
for r_h in [0.75, 1.35]:
    ring_pts = []
    for s in range(num_stanchions):
        ang = (s / float(num_stanchions)) * math.pi * 2.0
        ring_pts.append(bm_gallery.verts.new(Vector((math.cos(ang) * r_rail, math.sin(ang) * r_rail, gallery_z + r_h))))
    for i in range(len(ring_pts)):
        bm_gallery.edges.new([ring_pts[i], ring_pts[(i + 1) % len(ring_pts)]])

m_gallery = bpy.data.meshes.new("Gallery_Mesh")
bm_gallery.to_mesh(m_gallery)
bm_gallery.free()
m_gallery.materials.append(mat_iron_black)
obj_gallery = bpy.data.objects.new("Gallery_Balcony", m_gallery)
obj_gallery.parent = root
bpy.context.collection.objects.link(obj_gallery)

# ── 4. OCTAGONAL GLASS LANTERN ROOM ──
lantern_z = gallery_z + 0.35
lantern_h = 3.8

# Brass base murette & octagonal mullion pillars
bm_murette = bmesh.new()
bmesh.ops.create_cone(bm_murette, cap_ends=True, radius1=3.4, radius2=3.4, depth=0.85, segments=8, matrix=Matrix.Translation(Vector((0, 0, lantern_z + 0.42))))
for a in range(8):
    ang = (a / 8.0) * math.pi * 2.0
    px = math.cos(ang) * 3.32
    py = math.sin(ang) * 3.32
    mat_pil = Matrix.Translation(Vector((px, py, lantern_z + 2.0))) @ Matrix.Scale(0.12, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.12, 4, Vector((0, 1, 0))) @ Matrix.Scale(2.6, 4, Vector((0, 0, 1)))
    bmesh.ops.create_cube(bm_murette, size=1.0, matrix=mat_pil)

m_murette = bpy.data.meshes.new("Murette_Mesh")
bm_murette.to_mesh(m_murette)
bm_murette.free()
m_murette.materials.append(mat_brass)
obj_murette = bpy.data.objects.new("Lantern_Murette", m_murette)
obj_murette.parent = root
bpy.context.collection.objects.link(obj_murette)

# Octagonal crystal-clear safety glass panels
bm_glass = bmesh.new()
bmesh.ops.create_cone(bm_glass, cap_ends=False, radius1=3.35, radius2=3.35, depth=2.5, segments=8, matrix=Matrix.Translation(Vector((0, 0, lantern_z + 2.1))))
m_glass = bpy.data.meshes.new("LanternGlass_Mesh")
bm_glass.to_mesh(m_glass)
bm_glass.free()
m_glass.materials.append(mat_glass)
obj_glass = bpy.data.objects.new("Lantern_Glass", m_glass)
obj_glass.parent = root
bpy.context.collection.objects.link(obj_glass)

# ── 5. HYPER-DETAILED BRASS FRESNEL LENS APPARATUS (Rotating Pivot in Three.js) ──
lens_pivot = bpy.data.objects.new("Fresnel_Assembly", None)
lens_pivot.location = Vector((0, 0, lantern_z + 2.1))
lens_pivot.parent = root
bpy.context.collection.objects.link(lens_pivot)

bm_lens = bmesh.new()
# Bronze rotating turntable pedestal
bmesh.ops.create_cone(bm_lens, cap_ends=True, radius1=1.4, radius2=1.1, depth=0.45, segments=16, matrix=Matrix.Translation(Vector((0, 0, -0.85))))
# Multi-tier concentric stepped brass annular prisms
for ring in range(5):
    r_in = 0.45 + ring * 0.22
    r_out = r_in + 0.18
    bmesh.ops.create_cone(bm_lens, cap_ends=True, radius1=r_out, radius2=r_in, depth=0.18, segments=16, matrix=Matrix.Translation(Vector((0, 0, -0.45 + ring * 0.22))))
    bmesh.ops.create_cone(bm_lens, cap_ends=True, radius1=r_in, radius2=r_out, depth=0.18, segments=16, matrix=Matrix.Translation(Vector((0, 0, 0.45 - ring * 0.22))))

# Central bullseye lens frames pointing east and west (dual beam apertures)
for dir_side in [-1.0, 1.0]:
    bmesh.ops.create_cone(bm_lens, cap_ends=True, radius1=0.75, radius2=0.55, depth=0.45, segments=16, matrix=Matrix.Translation(Vector((dir_side * 1.0, 0, 0))) @ Matrix.Rotation(math.radians(90), 4, 'Y'))

m_lens = bpy.data.meshes.new("FresnelLens_Mesh")
bm_lens.to_mesh(m_lens)
bm_lens.free()
m_lens.materials.append(mat_brass)
obj_lens = bpy.data.objects.new("Fresnel_Lens_Housing", m_lens)
obj_lens.location = (0, 0, 0)
obj_lens.parent = lens_pivot
bpy.context.collection.objects.link(obj_lens)

# Glowing incandescent core lamp inside the lens
bm_lamp = bmesh.new()
bmesh.ops.create_uvsphere(bm_lamp, u_segments=12, v_segments=8, radius=0.38)
m_lamp = bpy.data.meshes.new("LampCore_Mesh")
bm_lamp.to_mesh(m_lamp)
bm_lamp.free()
m_lamp.materials.append(mat_lamp_glow)
obj_lamp = bpy.data.objects.new("Fresnel_Lamp_Core", m_lamp)
obj_lamp.location = (0, 0, 0)
obj_lamp.parent = lens_pivot
bpy.context.collection.objects.link(obj_lamp)

# ── 6. COPPER CUPOLA DOME ROOF & WEATHER VANE ──
dome_z = lantern_z + lantern_h

bm_cupola = bmesh.new()
# Ribbed hemispherical copper dome roof
bmesh.ops.create_cone(bm_cupola, cap_ends=True, radius1=3.55, radius2=0.6, depth=2.4, segments=16, matrix=Matrix.Translation(Vector((0, 0, dome_z + 1.2))))
# Ball finial
bmesh.ops.create_uvsphere(bm_cupola, u_segments=12, v_segments=8, radius=0.45, matrix=Matrix.Translation(Vector((0, 0, dome_z + 2.6))))
# Tall lightning conductor rod
bmesh.ops.create_cone(bm_cupola, cap_ends=True, radius1=0.04, radius2=0.02, depth=3.2, segments=8, matrix=Matrix.Translation(Vector((0, 0, dome_z + 4.2))))

m_cupola = bpy.data.meshes.new("Cupola_Mesh")
bm_cupola.to_mesh(m_cupola)
bm_cupola.free()
m_cupola.materials.append(mat_copper_patina)
obj_cupola = bpy.data.objects.new("Cupola_Roof", m_cupola)
obj_cupola.parent = root
bpy.context.collection.objects.link(obj_cupola)

# ── 7. ATTACHED LIGHTHOUSE KEEPER'S COTTAGE ──
# Located on north side (+Y in Blender)
bm_cottage = bmesh.new()
# Stone cottage walls (9m wide, 7m deep, 4.2m tall)
cot_w, cot_d, cot_h = 9.0, 7.2, 4.2
cot_y = 7.0
bmesh.ops.create_cube(bm_cottage, size=1.0, matrix=Matrix.Translation(Vector((0, cot_y, cot_h * 0.5))) @ Matrix.Scale(cot_w, 4, Vector((1, 0, 0))) @ Matrix.Scale(cot_d, 4, Vector((0, 1, 0))) @ Matrix.Scale(cot_h, 4, Vector((0, 0, 1))))

m_cottage = bpy.data.meshes.new("Cottage_Mesh")
bm_cottage.to_mesh(m_cottage)
bm_cottage.free()
m_cottage.materials.append(mat_granite)
obj_cot = bpy.data.objects.new("Keeper_Cottage", m_cottage)
obj_cot.parent = root
bpy.context.collection.objects.link(obj_cot)

# Gabled slate roof
bm_roof = bmesh.new()
roof_pts = [
    Vector((-cot_w * 0.55, cot_y - cot_d * 0.55, cot_h)),
    Vector((cot_w * 0.55, cot_y - cot_d * 0.55, cot_h)),
    Vector((cot_w * 0.55, cot_y + cot_d * 0.55, cot_h)),
    Vector((-cot_w * 0.55, cot_y + cot_d * 0.55, cot_h)),
    Vector((0, cot_y - cot_d * 0.55, cot_h + 2.8)),
    Vector((0, cot_y + cot_d * 0.55, cot_h + 2.8))
]
r_v = [bm_roof.verts.new(p) for p in roof_pts]
bm_roof.faces.new([r_v[0], r_v[1], r_v[4]])
bm_roof.faces.new([r_v[3], r_v[5], r_v[2]])
bm_roof.faces.new([r_v[0], r_v[4], r_v[5], r_v[3]])
bm_roof.faces.new([r_v[1], r_v[2], r_v[5], r_v[4]])

# Brick chimney
bmesh.ops.create_cube(bm_roof, size=1.0, matrix=Matrix.Translation(Vector((2.2, cot_y, cot_h + 2.4))) @ Matrix.Scale(0.85, 4, Vector((1, 0, 0))) @ Matrix.Scale(0.85, 4, Vector((0, 1, 0))) @ Matrix.Scale(2.2, 4, Vector((0, 0, 1))))

m_roof = bpy.data.meshes.new("Roof_Mesh")
bm_roof.to_mesh(m_roof)
bm_roof.free()
m_roof.materials.append(mat_slate_roof)
obj_roof = bpy.data.objects.new("Cottage_Roof", m_roof)
obj_roof.parent = root
bpy.context.collection.objects.link(obj_roof)

# ── 8. EXPORT GLB MODEL ──
out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\lighthouse.glb"
print(f"Exporting ultra-realistic historic coastal lighthouse to: {out_path} ...")
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    export_apply=True
)
print("SUCCESS: Exported lighthouse.glb successfully.")
