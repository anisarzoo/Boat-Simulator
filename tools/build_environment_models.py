"""
Blender 5.2 Python Script: Generate Realistic Archipelago Environment Models
Exports:
- assets/models/palm_tree.glb
- assets/models/coastal_rock.glb
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

def create_pbr_mat(name, base_color, roughness=0.6, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
    return mat

# ── 1. GENERATE TROPICAL COCONUT PALM ──
def build_palm():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    mat_trunk = create_pbr_mat("Palm_Bark", (0.38, 0.28, 0.18, 1.0), roughness=0.85)
    mat_frond = create_pbr_mat("Palm_Frond", (0.12, 0.38, 0.14, 1.0), roughness=0.55)
    mat_coco = create_pbr_mat("Coconut", (0.24, 0.16, 0.08, 1.0), roughness=0.88)

    root = bpy.data.objects.new("Palm_Root", None)
    bpy.context.collection.objects.link(root)

    # 1. Segmented curved trunk
    height = 10.5
    segments = 8
    bm_trunk = bmesh.new()

    curr_pos = Vector((0, 0, 0))
    grid = []

    for s in range(segments + 1):
        t = s / segments
        # Natural oceanic curve towards light
        cx = math.sin(t * 1.2) * 1.8
        cz = math.sin(t * 0.8) * 1.1
        cy = t * height

        r = 0.42 * (1.0 - t * 0.45)
        ring_v = []
        for a in range(10):
            ang = (a / 10.0) * math.pi * 2.0
            vx = cx + math.cos(ang) * r
            vz = cz + math.sin(ang) * r
            v = bm_trunk.verts.new((vx, cy, vz))
            ring_v.append(v)
        grid.append(ring_v)

    for s in range(segments):
        r1 = grid[s]
        r2 = grid[s + 1]
        for a in range(10):
            a_next = (a + 1) % 10
            bm_trunk.faces.new([r1[a], r1[a_next], r2[a_next], r2[a]])

    mesh_trunk = bpy.data.meshes.new("PalmTrunk_Mesh")
    bm_trunk.to_mesh(mesh_trunk)
    bm_trunk.free()
    mesh_trunk.materials.append(mat_trunk)

    obj_trunk = bpy.data.objects.new("Trunk", mesh_trunk)
    obj_trunk.parent = root
    bpy.context.collection.objects.link(obj_trunk)

    # 2. Radiating Drooping Palm Fronds
    top_x = math.sin(1.2) * 1.8
    top_z = math.sin(0.8) * 1.1
    top_y = height

    bm_fronds = bmesh.new()
    num_fronds = 10

    for f in range(num_fronds):
        f_angle = (f / float(num_fronds)) * math.pi * 2.0
        # Curved parabolic spine with leaflets
        length = 5.2
        steps = 6
        for step in range(steps):
            st = step / float(steps)
            st_next = (step + 1) / float(steps)

            # Arching droop
            p1_y = top_y - math.pow(st, 1.8) * 1.6
            p2_y = top_y - math.pow(st_next, 1.8) * 1.6

            d1 = st * length
            d2 = st_next * length

            w1 = 0.75 * math.sin(st * math.pi)
            w2 = 0.75 * math.sin(st_next * math.pi)

            # Radial direction
            dir_x = math.cos(f_angle)
            dir_z = math.sin(f_angle)
            perp_x = -dir_z
            perp_z = dir_x

            c1 = Vector((top_x + dir_x * d1, p1_y, top_z + dir_z * d1))
            c2 = Vector((top_x + dir_x * d2, p2_y, top_z + dir_z * d2))

            v1 = bm_fronds.verts.new(c1 + Vector((perp_x * w1, 0, perp_z * w1)))
            v2 = bm_fronds.verts.new(c1 - Vector((perp_x * w1, 0, perp_z * w1)))
            v3 = bm_fronds.verts.new(c2 - Vector((perp_x * w2, 0, perp_z * w2)))
            v4 = bm_fronds.verts.new(c2 + Vector((perp_x * w2, 0, perp_z * w2)))

            bm_fronds.faces.new([v1, v2, v3, v4])

    mesh_fronds = bpy.data.meshes.new("PalmFronds_Mesh")
    bm_fronds.to_mesh(mesh_fronds)
    bm_fronds.free()
    mesh_fronds.materials.append(mat_frond)

    obj_fronds = bpy.data.objects.new("Fronds", mesh_fronds)
    obj_fronds.parent = root
    bpy.context.collection.objects.link(obj_fronds)

    out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\palm_tree.glb"
    print(f"Exporting palm to: {out_path}")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported palm_tree.glb")

# ── 2. GENERATE COASTAL ROCK / SEA BOULDER ──
def build_rock():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    mat_rock = create_pbr_mat("Granite_Rock", (0.28, 0.26, 0.25, 1.0), roughness=0.88, metallic=0.08)

    root = bpy.data.objects.new("Rock_Root", None)
    bpy.context.collection.objects.link(root)

    # IcoSphere with organic sculpting displacement
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=2.5, location=(0, 1.8, 0))
    obj_rock = bpy.context.active_object
    obj_rock.name = "Coastal_Rock"
    obj_rock.parent = root

    # Flatten base for shoreline resting
    obj_rock.scale = (1.4, 0.85, 1.1)

    # Displace vertices to create jagged weathered cliff rock
    for v in obj_rock.data.vertices:
        p = v.co
        disp = math.sin(p.x * 2.2) * math.cos(p.y * 2.4) * 0.35 + math.sin(p.z * 3.1) * 0.22
        v.co += v.normal * disp
        if v.co.y < 0.1:
            v.co.y *= 0.4 # Flat waterline base

    obj_rock.data.materials.append(mat_rock)

    for poly in obj_rock.data.polygons:
        poly.use_smooth = False # Faceted rocky cliff look

    out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\coastal_rock.glb"
    print(f"Exporting rock to: {out_path}")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported coastal_rock.glb")

if __name__ == '__main__':
    build_palm()
    build_rock()
