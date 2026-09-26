"""
Blender 5.2 Python Script: Generate Anatomical Marine Wildlife 3D Models
Properly mapped for Three.js coordinates (+X=Right, +Y=Up, +Z=Forward)
Exports:
- assets/models/dolphin.glb (2.5m Bottlenose Dolphin with falcate dorsal fin)
- assets/models/whale.glb (14m Humpback Whale with pleated throat and wing flippers)
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# Coordinate conversion: Three.js (x, y=height, z=forward) -> Blender (X=x, Y=-z, Z=y)
def B(x, y, z):
    return Vector((x, -z, y))

def create_pbr_mat(name, base_color, roughness=0.3, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
    return mat

def clean_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)

# ── 1. GENERATE ANATOMICAL BOTTLENOSE DOLPHIN (Z = Forward, Y = Up) ──
def build_dolphin():
    clean_scene()
    
    mat_dorsal = create_pbr_mat("Dolphin_Skin", (0.12, 0.18, 0.26, 1.0), roughness=0.20, metallic=0.08)
    mat_belly = create_pbr_mat("Dolphin_Belly", (0.75, 0.82, 0.88, 1.0), roughness=0.25, metallic=0.05)

    root = bpy.data.objects.new("Dolphin_Root", None)
    bpy.context.collection.objects.link(root)

    # Fuselage rings: [z (forward), rx, ry, oy (height offset)]
    rings = [
        (1.50, 0.03, 0.025, -0.04),  # Beak tip
        (1.30, 0.08, 0.065, -0.03),  # Beak base
        (1.05, 0.20, 0.22, 0.04),    # Melon forehead
        (0.65, 0.32, 0.35, 0.02),    # Thoracic cranial
        (0.15, 0.36, 0.38, 0.00),    # Mid torso
        (-0.35, 0.32, 0.34, -0.02),  # Dorsal fin base
        (-0.80, 0.22, 0.26, -0.03),  # Lumbar trunk
        (-1.25, 0.12, 0.16, -0.04),  # Peduncle start
        (-1.60, 0.05, 0.08, -0.04)   # Fluke insertion
    ]

    bm = bmesh.new()
    num_segs = 16
    grid = []

    for z, rx, ry, oy in rings:
        ring_verts = []
        for s in range(num_segs):
            theta = (s / num_segs) * math.pi * 2.0
            x = math.cos(theta) * rx
            y = oy + math.sin(theta) * ry
            v = bm.verts.new(B(x, y, z))
            ring_verts.append(v)
        grid.append(ring_verts)

    for r in range(len(grid) - 1):
        r1 = grid[r]
        r2 = grid[r + 1]
        for s in range(num_segs):
            s_next = (s + 1) % num_segs
            f = bm.faces.new([r1[s], r1[s_next], r2[s_next], r2[s]])
            # Bottom half of rings is lighter belly
            f.material_index = 1 if (s > num_segs * 0.4 and s < num_segs * 0.9) else 0

    bm.faces.new(grid[0])
    bm.faces.new(list(reversed(grid[-1])))

    # Falcate curved dorsal fin
    df_pts = [(0.0, 0.32, -0.20), (0.0, 0.65, -0.42), (0.0, 0.58, -0.52), (0.0, 0.32, -0.55)]
    df_v = [bm.verts.new(B(p[0], p[1], p[2])) for p in df_pts]
    bm.faces.new(df_v)

    # Swept pectoral flippers
    for side in [-1.0, 1.0]:
        pf_pts = [
            (side * 0.28, -0.10, 0.45),
            (side * 0.72, -0.32, 0.25),
            (side * 0.68, -0.30, 0.12),
            (side * 0.26, -0.12, 0.22)
        ]
        pf_v = [bm.verts.new(B(p[0], p[1], p[2])) for p in pf_pts]
        bm.faces.new(pf_v)

    # Horizontal tail flukes
    tf_pts = [
        (0.0, -0.04, -1.58),
        (-0.48, -0.04, -1.82),
        (-0.42, -0.04, -1.95),
        (0.0, -0.04, -1.82),
        (0.42, -0.04, -1.95),
        (0.48, -0.04, -1.82)
    ]
    tf_v = [bm.verts.new(B(p[0], p[1], p[2])) for p in tf_pts]
    bm.faces.new([tf_v[0], tf_v[1], tf_v[2], tf_v[3]])
    bm.faces.new([tf_v[0], tf_v[3], tf_v[4], tf_v[5]])

    mesh = bpy.data.meshes.new("Dolphin_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat_dorsal)
    mesh.materials.append(mat_belly)

    obj = bpy.data.objects.new("Dolphin", mesh)
    obj.parent = root
    bpy.context.collection.objects.link(obj)

    for poly in mesh.polygons:
        poly.use_smooth = True

    mod_sub = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod_sub.levels = 1

    out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\dolphin.glb"
    print(f"Exporting dolphin to: {out_path}")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported dolphin.glb")

# ── 2. GENERATE ANATOMICAL HUMPBACK WHALE (14m LEVIATHAN) ──
def build_whale():
    clean_scene()
    
    mat_whale = create_pbr_mat("Whale_Skin", (0.07, 0.09, 0.12, 1.0), roughness=0.30, metallic=0.06)
    mat_belly = create_pbr_mat("Whale_Belly", (0.55, 0.60, 0.65, 1.0), roughness=0.45, metallic=0.02)

    root = bpy.data.objects.new("Whale_Root", None)
    bpy.context.collection.objects.link(root)

    # Massive contoured fuselage rings: [z (forward), rx, ry, oy]
    rings = [
        (7.5, 0.35, 0.25, -0.1),   # Rostrum tip
        (5.8, 1.35, 0.95, 0.15),   # Head with blowhole splash guard
        (3.5, 2.05, 1.65, 0.05),   # Cranial throat
        (0.0, 2.35, 2.10, -0.15),  # Mid torso max girth (4.7m wide)
        (-3.8, 1.85, 1.70, -0.15), # Ventral groove termination
        (-7.5, 1.15, 1.20, -0.05), # Dorsal fin ridge
        (-10.8, 0.60, 0.70, 0.0),  # Caudal peduncle
        (-13.5, 0.25, 0.30, 0.0)   # Fluke insertion
    ]

    bm = bmesh.new()
    num_segs = 18
    grid = []

    for z, rx, ry, oy in rings:
        ring_verts = []
        for s in range(num_segs):
            theta = (s / num_segs) * math.pi * 2.0
            x = math.cos(theta) * rx
            y = oy + math.sin(theta) * ry
            v = bm.verts.new(B(x, y, z))
            ring_verts.append(v)
        grid.append(ring_verts)

    for r in range(len(grid) - 1):
        r1 = grid[r]
        r2 = grid[r + 1]
        for s in range(num_segs):
            s_next = (s + 1) % num_segs
            f = bm.faces.new([r1[s], r1[s_next], r2[s_next], r2[s]])
            # Ventral pleats on lower half forward of mid-torso
            f.material_index = 1 if (r < 5 and s > num_segs * 0.4 and s < num_segs * 0.9) else 0

    bm.faces.new(grid[0])
    bm.faces.new(list(reversed(grid[-1])))

    # Low stepped dorsal fin on back ridge
    df_pts = [(0.0, 1.45, -7.2), (0.0, 2.10, -7.8), (0.0, 1.35, -8.3)]
    df_v = [bm.verts.new(B(p[0], p[1], p[2])) for p in df_pts]
    bm.faces.new(df_v)

    # 4.8m long wing-like pectoral flippers (Humpback signature)
    for side in [-1.0, 1.0]:
        pf_pts = [
            (side * 1.95, -0.4, 2.2),
            (side * 4.85, -1.8, 0.3),
            (side * 4.60, -1.7, -0.4),
            (side * 1.85, -0.5, 0.8)
        ]
        pf_v = [bm.verts.new(B(p[0], p[1], p[2])) for p in pf_pts]
        bm.faces.new(pf_v)

    # 4.8m broad serrated tail flukes
    tf_pts = [
        (0.0, 0.0, -13.5),
        (-2.4, 0.0, -15.2),
        (-2.1, 0.0, -15.8),
        (0.0, 0.0, -15.1),
        (2.1, 0.0, -15.8),
        (2.4, 0.0, -15.2)
    ]
    tf_v = [bm.verts.new(B(p[0], p[1], p[2])) for p in tf_pts]
    bm.faces.new([tf_v[0], tf_v[1], tf_v[2], tf_v[3]])
    bm.faces.new([tf_v[0], tf_v[3], tf_v[4], tf_v[5]])

    mesh = bpy.data.meshes.new("Whale_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat_whale)
    mesh.materials.append(mat_belly)

    obj = bpy.data.objects.new("Whale", mesh)
    obj.parent = root
    bpy.context.collection.objects.link(obj)

    for poly in mesh.polygons:
        poly.use_smooth = True

    mod_sub = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod_sub.levels = 1

    out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\whale.glb"
    print(f"Exporting whale to: {out_path}")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported whale.glb")

if __name__ == '__main__':
    build_dolphin()
    build_whale()
