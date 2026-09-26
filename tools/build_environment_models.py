"""
Blender 5.2 Python Script: Generate Ultra-Realistic Environment Models
Builds:
- assets/models/palm_tree.glb (Lush tropical coconut palm, upright Z-up)
- assets/models/coastal_rock.glb (Faceted granite sea-stack boulder, upright Z-up)
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

# ── 1. GENERATE TROPICAL COCONUT PALM (Z = Up, X/Y = Ground) ──
def build_palm():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    mat_trunk = create_pbr_mat("Palm_Bark", (0.34, 0.24, 0.16, 1.0), roughness=0.88)
    mat_frond = create_pbr_mat("Palm_Frond", (0.10, 0.36, 0.12, 1.0), roughness=0.45)
    mat_coco = create_pbr_mat("Coconut", (0.22, 0.15, 0.08, 1.0), roughness=0.85)

    root = bpy.data.objects.new("Palm_Root", None)
    bpy.context.collection.objects.link(root)

    # 1. Segmented curved trunk (height along Z axis)
    height = 10.5
    segments = 12
    bm_trunk = bmesh.new()

    grid = []
    for s in range(segments + 1):
        t = s / segments
        # Organic sea-breeze trunk lean
        cx = math.sin(t * 1.1) * 1.6
        cy = math.sin(t * 0.7) * 0.9
        cz = t * height

        # Taper trunk from wide root base to slender crown
        r = 0.44 * (1.0 - t * 0.48)
        ring_v = []
        for a in range(12):
            ang = (a / 12.0) * math.pi * 2.0
            vx = cx + math.cos(ang) * r
            vy = cy + math.sin(ang) * r
            vz = cz
            v = bm_trunk.verts.new((vx, vy, vz))
            ring_v.append(v)
        grid.append(ring_v)

    for s in range(segments):
        r1 = grid[s]
        r2 = grid[s + 1]
        for a in range(12):
            a_next = (a + 1) % 12
            bm_trunk.faces.new([r1[a], r1[a_next], r2[a_next], r2[a]])

    mesh_trunk = bpy.data.meshes.new("PalmTrunk_Mesh")
    bm_trunk.to_mesh(mesh_trunk)
    bm_trunk.free()
    mesh_trunk.materials.append(mat_trunk)

    obj_trunk = bpy.data.objects.new("Trunk", mesh_trunk)
    obj_trunk.parent = root
    bpy.context.collection.objects.link(obj_trunk)
    for p in mesh_trunk.polygons:
        p.use_smooth = True

    # 2. Arching Multi-Tiered Palm Canopy (14 fronds)
    crown_x = math.sin(1.1) * 1.6
    crown_y = math.sin(0.7) * 0.9
    crown_z = height

    bm_fronds = bmesh.new()
    num_fronds = 14

    for f in range(num_fronds):
        f_ang = (f / float(num_fronds)) * math.pi * 2.0
        # Tiered elevation: top fronds arch up, lower fronds droop down
        tier = f % 3
        elev = 0.45 - tier * 0.35 # elevation pitch angle
        f_len = 5.2 - tier * 0.4
        steps = 8

        for step in range(steps):
            st = step / float(steps)
            st_next = (step + 1) / float(steps)

            # Curved spine: extends out radially and droops down with gravity
            horiz_d1 = math.cos(elev) * st * f_len
            horiz_d2 = math.cos(elev) * st_next * f_len
            z1 = crown_z + math.sin(elev) * st * f_len - math.pow(st, 2.2) * 2.2
            z2 = crown_z + math.sin(elev) * st_next * f_len - math.pow(st_next, 2.2) * 2.2

            dx = math.cos(f_ang)
            dy = math.sin(f_ang)
            # Perpendicular vector for leaflet width
            perp_x = -dy
            perp_y = dx

            w1 = 0.65 * math.sin(st * math.pi)
            w2 = 0.65 * math.sin(st_next * math.pi)

            c1 = Vector((crown_x + dx * horiz_d1, crown_y + dy * horiz_d1, z1))
            c2 = Vector((crown_x + dx * horiz_d2, crown_y + dy * horiz_d2, z2))

            v1 = bm_fronds.verts.new(c1 + Vector((perp_x * w1, perp_y * w1, 0)))
            v2 = bm_fronds.verts.new(c1 - Vector((perp_x * w1, perp_y * w1, 0)))
            v3 = bm_fronds.verts.new(c2 - Vector((perp_x * w2, perp_y * w2, 0)))
            v4 = bm_fronds.verts.new(c2 + Vector((perp_x * w2, perp_y * w2, 0)))

            bm_fronds.faces.new([v1, v2, v3, v4])

    mesh_fronds = bpy.data.meshes.new("PalmFronds_Mesh")
    bm_fronds.to_mesh(mesh_fronds)
    bm_fronds.free()
    mesh_fronds.materials.append(mat_frond)

    obj_fronds = bpy.data.objects.new("Fronds", mesh_fronds)
    obj_fronds.parent = root
    bpy.context.collection.objects.link(obj_fronds)

    # 3. Coconuts cluster beneath the crown
    for c in range(6):
        c_ang = (c / 6.0) * math.pi * 2.0
        cx = crown_x + math.cos(c_ang) * 0.28
        cy = crown_y + math.sin(c_ang) * 0.28
        cz = crown_z - 0.25
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(cx, cy, cz))
        obj_c = bpy.context.active_object
        obj_c.name = f"Coconut_{c}"
        obj_c.scale = (0.9, 0.9, 1.2)
        obj_c.parent = root
        obj_c.data.materials.append(mat_coco)

    out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\palm_tree.glb"
    print(f"Exporting upright palm tree to: {out_path} ...")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported palm_tree.glb with upright Z-up orientation.")

# ── 2. GENERATE COASTAL GRANITE SEA-STACK ROCK (Z = Up) ──
def build_rock():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    # Dark wet maritime basalt / granite crag
    mat_rock = create_pbr_mat("Granite_Rock", (0.09, 0.08, 0.08, 1.0), roughness=0.38, metallic=0.04)

    root = bpy.data.objects.new("Rock_Root", None)
    bpy.context.collection.objects.link(root)

    # IcoSphere centered at Z=0.1 so bottom penetrates deep below waterline (Z down to -1.8)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=2.2, location=(0, 0, 0.1))
    obj_rock = bpy.context.active_object
    obj_rock.name = "Coastal_Rock"
    obj_rock.parent = root

    obj_rock.scale = (1.35, 1.15, 0.85)

    # Displace vertices to create rugged weathered sea crags & jagged wave-cut waterline
    for v in obj_rock.data.vertices:
        p = v.co
        disp = math.sin(p.x * 2.4) * math.cos(p.y * 2.2) * 0.45 + math.sin(p.z * 3.4) * 0.32
        v.co += v.normal * disp
        # Flatten and deepen underwater base so it firmly roots under ocean surface
        if v.co.z < -0.2:
            v.co.z *= 1.25

    obj_rock.data.materials.append(mat_rock)

    for poly in obj_rock.data.polygons:
        poly.use_smooth = False # Crisp faceted weathered rock

    out_path = r"c:\Users\anisa\Desktop\Ship\assets\models\coastal_rock.glb"
    print(f"Exporting coastal rock to: {out_path} ...")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported coastal_rock.glb with upright Z-up orientation.")

if __name__ == '__main__':
    build_palm()
    build_rock()
