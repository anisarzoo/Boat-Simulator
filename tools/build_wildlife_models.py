"""
Blender 5.2 Python Script: Generate Realistic Marine Wildlife 3D Models
Exports:
- assets/models/dolphin.glb
- assets/models/whale.glb
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

def create_pbr_mat(name, base_color, roughness=0.3, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
    return mat

# ── 1. GENERATE ANATOMICAL BOTTLENOSE DOLPHIN ──
def build_dolphin():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    mat_dorsal = create_pbr_mat("Dolphin_Skin", (0.11, 0.16, 0.22, 1.0), roughness=0.18, metallic=0.08)
    mat_eye = create_pbr_mat("Dolphin_Eye", (0.02, 0.03, 0.04, 1.0), roughness=0.05, metallic=0.8)

    root = bpy.data.objects.new("Dolphin_Root", None)
    bpy.context.collection.objects.link(root)

    # Lofted organic fuselage rings along Z axis: [z, radius_x, radius_y, offset_y]
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
            px = math.cos(theta) * rx
            py = oy + math.sin(theta) * ry
            pz = z
            v = bm.verts.new((px, py, pz))
            ring_verts.append(v)
        grid.append(ring_verts)

    for r in range(len(grid) - 1):
        r1 = grid[r]
        r2 = grid[r + 1]
        for s in range(num_segs):
            s_next = (s + 1) % num_segs
            bm.faces.new([r1[s], r1[s_next], r2[s_next], r2[s]])

    # Cap snout tip and peduncle
    bm.faces.new(grid[0])
    bm.faces.new(list(reversed(grid[-1])))

    # Dorsal fin (curved falcate foil)
    df_pts = [
        (0.0, 0.32, -0.20), (0.0, 0.65, -0.42), (0.0, 0.58, -0.52), (0.0, 0.32, -0.55)
    ]
    df_verts = [bm.verts.new(p) for p in df_pts]
    bm.faces.new(df_verts)

    # Pectoral flippers
    for side in [-1.0, 1.0]:
        pf_pts = [
            (side * 0.28, -0.10, 0.45),
            (side * 0.72, -0.32, 0.25),
            (side * 0.68, -0.30, 0.12),
            (side * 0.26, -0.12, 0.22)
        ]
        pf_verts = [bm.verts.new(p) for p in pf_pts]
        bm.faces.new(pf_verts)

    # Horizontal tail flukes (wide hydrofoil)
    tf_pts = [
        (0.0, -0.04, -1.58),
        (-0.48, -0.04, -1.82),
        (-0.42, -0.04, -1.95),
        (0.0, -0.04, -1.82),
        (0.42, -0.04, -1.95),
        (0.48, -0.04, -1.82)
    ]
    tf_v = [bm.verts.new(p) for p in tf_pts]
    bm.faces.new([tf_v[0], tf_v[1], tf_v[2], tf_v[3]])
    bm.faces.new([tf_v[0], tf_v[3], tf_v[4], tf_v[5]])

    mesh = bpy.data.meshes.new("Dolphin_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat_dorsal)

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

# ── 2. GENERATE HUMPBACK WHALE (15m LEVIATHAN) ──
def build_whale():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    mat_whale = create_pbr_mat("Whale_Skin", (0.08, 0.10, 0.12, 1.0), roughness=0.35, metallic=0.05)
    mat_belly = create_pbr_mat("Whale_Belly", (0.65, 0.68, 0.72, 1.0), roughness=0.45, metallic=0.0)

    root = bpy.data.objects.new("Whale_Root", None)
    bpy.context.collection.objects.link(root)

    # Massive contoured fuselage rings: [z, rx, ry, oy]
    rings = [
        (7.5, 0.4, 0.35, 0.0),    # Rostrum tip
        (5.8, 1.3, 1.10, 0.1),    # Head with blowhole crest
        (3.5, 1.85, 1.70, 0.0),   # Cranial throat
        (0.0, 2.15, 2.10, -0.1),  # Mid torso max girth (4.3m wide)
        (-3.8, 1.70, 1.65, -0.1), # Ventral groove termination
        (-7.5, 1.05, 1.15, -0.05),# Dorsal fin ridge
        (-10.8, 0.55, 0.65, 0.0), # Caudal peduncle
        (-13.5, 0.25, 0.30, 0.0)  # Fluke insertion
    ]

    bm = bmesh.new()
    num_segs = 18
    grid = []

    for z, rx, ry, oy in rings:
        ring_verts = []
        for s in range(num_segs):
            theta = (s / num_segs) * math.pi * 2.0
            px = math.cos(theta) * rx
            py = oy + math.sin(theta) * ry
            pz = z
            v = bm.verts.new((px, py, pz))
            ring_verts.append(v)
        grid.append(ring_verts)

    for r in range(len(grid) - 1):
        r1 = grid[r]
        r2 = grid[r + 1]
        for s in range(num_segs):
            s_next = (s + 1) % num_segs
            bm.faces.new([r1[s], r1[s_next], r2[s_next], r2[s]])

    bm.faces.new(grid[0])
    bm.faces.new(list(reversed(grid[-1])))

    # Low stepped dorsal fin
    df_pts = [(0.0, 1.65, -7.2), (0.0, 2.15, -7.8), (0.0, 1.55, -8.3)]
    df_v = [bm.verts.new(p) for p in df_pts]
    bm.faces.new(df_v)

    # 4.8m long wing-like pectoral flippers
    for side in [-1.0, 1.0]:
        pf_pts = [
            (side * 1.95, -0.4, 2.2),
            (side * 4.65, -1.8, 0.4),
            (side * 4.40, -1.7, -0.3),
            (side * 1.85, -0.5, 0.8)
        ]
        pf_v = [bm.verts.new(p) for p in pf_pts]
        bm.faces.new(pf_v)

    # 4.5m broad serrated tail flukes
    tf_pts = [
        (0.0, 0.0, -13.5),
        (-2.4, 0.0, -15.2),
        (-2.1, 0.0, -15.8),
        (0.0, 0.0, -15.1),
        (2.1, 0.0, -15.8),
        (2.4, 0.0, -15.2)
    ]
    tf_v = [bm.verts.new(p) for p in tf_pts]
    bm.faces.new([tf_v[0], tf_v[1], tf_v[2], tf_v[3]])
    bm.faces.new([tf_v[0], tf_v[3], tf_v[4], tf_v[5]])

    mesh = bpy.data.meshes.new("Whale_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat_whale)

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
