"""
Blender 5.2 Python Script: Generate Ultra-Detailed, Photorealistic Marine Traffic 3D Models
Builds:
1. assets/models/fishing_trawler.glb (26m commercial stern trawler with fully rigged A-frame, outriggers, winches, wheelhouse)
2. assets/models/container_ship.glb (110m commercial container vessel with batched containers, bulbous bow, deck cranes)
3. assets/models/sailing_yacht.glb (20m carbon racing sloop with plumb bow, cockpit, twin helms, dual sails)

Coordinate convention:
Three.js (x=starboard, y=elevation, z=forward) -> Blender (X=x, Y=-z, Z=y)
Exported with glTF 2.0 (-Y forward, +Z up) so coordinates match Three.js natively.
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

def B(x, y, z):
    return Vector((x, -z, y))

def add_cylinder_3js(bm, p1, p2, radius1, radius2=None, segments=12):
    v1 = B(*p1)
    v2 = B(*p2)
    diff = v2 - v1
    length = diff.length
    if length < 1e-5:
        return
    dir_vec = diff.normalized()
    mid = (v1 + v2) * 0.5
    rot = Vector((0, 0, 1)).rotation_difference(dir_vec).to_matrix().to_4x4()
    mat = Matrix.Translation(mid) @ rot
    r2 = radius2 if radius2 is not None else radius1
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=radius1, radius2=r2, depth=length, segments=segments, matrix=mat)

def add_box_3js(bm, center_3js, size_3js, rot_y_deg=0.0):
    c = B(*center_3js)
    # Scale along Three.js axes: X -> Blender X, Y -> Blender Z, Z -> Blender Y
    mat = (
        Matrix.Translation(c) @
        Matrix.Rotation(math.radians(-rot_y_deg), 4, Vector((0, 0, 1))) @
        Matrix.Scale(size_3js[0], 4, Vector((1, 0, 0))) @
        Matrix.Scale(size_3js[2], 4, Vector((0, 1, 0))) @
        Matrix.Scale(size_3js[1], 4, Vector((0, 0, 1)))
    )
    bmesh.ops.create_cube(bm, size=1.0, matrix=mat)

def create_pbr_mat(name, base_color, roughness=0.4, metallic=0.0, specular=0.5, clearcoat=0.0, transmission=0.0, alpha=1.0):
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
            if 'IOR' in bsdf.inputs:
                bsdf.inputs['IOR'].default_value = 1.52
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
    return mat

def clean_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)


# ══════════════════════════════════════════════════════════════════════════════
# 1. GENERATE ULTRA-DETAILED 26m COMMERCIAL FISHING TRAWLER (FV NORTHERN SEAS)
# ══════════════════════════════════════════════════════════════════════════════
def build_fishing_trawler():
    clean_scene()
    root = bpy.data.objects.new("FishingTrawler_Root", None)
    bpy.context.collection.objects.link(root)

    # High-fidelity marine workboat PBR materials
    mat_hull = create_pbr_mat("Trawler_Hull_Navy", (0.08, 0.16, 0.26), roughness=0.52, metallic=0.18, clearcoat=0.2)
    mat_keel = create_pbr_mat("Trawler_Keel_Red", (0.55, 0.12, 0.08), roughness=0.68, metallic=0.08)
    mat_bootstripe = create_pbr_mat("Trawler_Bootstripe_White", (0.92, 0.93, 0.94), roughness=0.45)
    mat_deck = create_pbr_mat("Trawler_Wood_Deck", (0.48, 0.36, 0.24), roughness=0.82)
    mat_steel_deck = create_pbr_mat("Trawler_Steel_Deck", (0.24, 0.26, 0.28), roughness=0.72, metallic=0.4)
    mat_cabin = create_pbr_mat("Trawler_Cabin_White", (0.90, 0.91, 0.92), roughness=0.35, clearcoat=0.3)
    mat_cabin_roof = create_pbr_mat("Trawler_Cabin_Roof", (0.16, 0.32, 0.44), roughness=0.55)
    mat_glass = create_pbr_mat("Trawler_Bridge_Glass", (0.03, 0.08, 0.12), roughness=0.05, metallic=0.92, transmission=0.4, alpha=0.75)
    mat_gantry = create_pbr_mat("Trawler_Safety_Orange", (0.95, 0.48, 0.06), roughness=0.38, metallic=0.1)
    mat_steel = create_pbr_mat("Galvanized_Steel", (0.42, 0.44, 0.46), roughness=0.35, metallic=0.88)
    mat_net = create_pbr_mat("Trawl_Nets_Green", (0.08, 0.34, 0.16), roughness=0.92)
    mat_black_rubber = create_pbr_mat("Heavy_Fender_Rubber", (0.05, 0.06, 0.07), roughness=0.90)
    mat_solas_orange = create_pbr_mat("SOLAS_Lifebuoy_Orange", (0.96, 0.28, 0.05), roughness=0.40)

    # ── A. WATERTIGHT MULTI-STATION TRAWLER HULL ──
    # Stations: (Z, [(x, y)...]) from stem (13.2) to stern ramp (-12.8)
    stations = [
        # 0: Sharp raked stem head
        (13.2, [(0.0, -1.8), (0.08, 0.0), (0.12, 1.8), (0.15, 3.8), (0.18, 4.8)]),
        # 1: Forward flare / bulbous forefoot
        (11.2, [(0.0, -2.4), (0.75, -0.9), (1.65, 0.8), (2.40, 2.8), (2.85, 4.5)]),
        # 2: Forecastle shoulder
        (7.8,  [(0.0, -2.9), (1.75, -1.4), (2.85, 0.5), (3.45, 2.2), (3.70, 4.2)]),
        # 3: Forward midbody
        (3.5,  [(0.0, -3.1), (2.35, -1.6), (3.40, 0.3), (3.75, 1.8), (3.80, 3.7)]),
        # 4: Midships (max beam 7.6m)
        (-1.5, [(0.0, -3.2), (2.55, -1.65),(3.55, 0.2), (3.80, 1.6), (3.80, 3.5)]),
        # 5: Aft working deck
        (-6.5, [(0.0, -2.9), (2.45, -1.5), (3.45, 0.1), (3.75, 1.5), (3.75, 3.4)]),
        # 6: Aft quarters
        (-10.5,[(0.0, -2.2), (2.15, -1.1), (3.15, 0.0), (3.50, 1.4), (3.55, 3.3)]),
        # 7: Stern ramp / transom
        (-12.8,[(0.0,  0.4), (1.40,  0.8), (2.40, 1.4), (3.10, 2.2), (3.30, 3.2)])
    ]

    bm_hull = bmesh.new()
    h_rings = []
    for z_pos, pts in stations:
        stbd = [B(x, y, z_pos) for (x, y) in pts]
        port = [B(-x, y, z_pos) for (x, y) in pts[1:]]
        port.reverse()
        ring = port + stbd
        r_verts = [bm_hull.verts.new(p) for p in ring]
        h_rings.append(r_verts)

    # Connect rings with properly oriented outward faces
    for s in range(len(h_rings) - 1):
        r1, r2 = h_rings[s], h_rings[s + 1]
        half = len(stations[s][1])
        total = len(r1)
        for p in range(total - 1):
            tier = p if p < half else (total - 1 - p)
            # Order [r1[p], r2[p], r2[p+1], r1[p+1]] for outward normals
            f = bm_hull.faces.new([r1[p], r2[p], r2[p + 1], r1[p + 1]])
            if tier <= 1:
                f.material_index = 1 # Red anti-fouling keel
            elif tier == 2:
                f.material_index = 2 # White waterline boot-top
            else:
                f.material_index = 0 # Deep navy topsides

    # Bow knife-edge cap (Station 0)
    for p in range(len(h_rings[0]) - 2):
        bm_hull.faces.new([h_rings[0][0], h_rings[0][p + 2], h_rings[0][p + 1]])

    # Stern transom cap (Station 7)
    for p in range(len(h_rings[-1]) - 2):
        bm_hull.faces.new([h_rings[-1][0], h_rings[-1][p + 1], h_rings[-1][p + 2]])

    bmesh.ops.recalc_face_normals(bm_hull, faces=bm_hull.faces)

    m_hull = bpy.data.meshes.new("TrawlerHull_Mesh")
    bm_hull.to_mesh(m_hull)
    bm_hull.free()
    m_hull.materials.append(mat_hull)       # 0
    m_hull.materials.append(mat_keel)       # 1
    m_hull.materials.append(mat_bootstripe) # 2

    obj_hull = bpy.data.objects.new("Trawler_Hull", m_hull)
    obj_hull.parent = root
    bpy.context.collection.objects.link(obj_hull)
    for p in m_hull.polygons:
        p.use_smooth = True

    # Heavy Vulcanized Rubber Rub-Rail along Sheerline
    bm_rub = bmesh.new()
    for sx in [-1.0, 1.0]:
        for s in range(len(stations) - 1):
            p1 = (sx * stations[s][1][-1][0], stations[s][1][-1][1], stations[s][0])
            p2 = (sx * stations[s + 1][1][-1][0], stations[s + 1][1][-1][1], stations[s + 1][0])
            add_cylinder_3js(bm_rub, p1, p2, radius1=0.10, segments=8)
    m_rub = bpy.data.meshes.new("RubRail_Mesh")
    bm_rub.to_mesh(m_rub)
    bm_rub.free()
    m_rub.materials.append(mat_black_rubber)
    o_rub = bpy.data.objects.new("Trawler_RubRails", m_rub)
    o_rub.parent = root
    bpy.context.collection.objects.link(o_rub)

    # ── B. DECKS & CONTINUOUS STEEL BULWARKS ──
    bm_decks = bmesh.new()
    # 1. Raised Forecastle Deck (Bow area, Z = 6.0 to 12.8, Y = 4.2)
    add_box_3js(bm_decks, (0.0, 4.15, 9.4), (5.8, 0.22, 6.8))
    # 2. Main Working Deck (Aft area, Z = -12.2 to 6.0, Y = 2.6)
    add_box_3js(bm_decks, (0.0, 2.55, -3.1), (7.1, 0.22, 17.8))

    # Continuous Bulwarks (Safety Coaming, 1.1m high from Y = 2.6 to 3.7)
    for sx in [-1.0, 1.0]:
        add_box_3js(bm_decks, (sx * 3.65, 3.15, -3.1), (0.16, 1.10, 17.8))
    # Forecastle Bulwark forward
    for sx in [-1.0, 1.0]:
        add_box_3js(bm_decks, (sx * 2.50, 4.60, 9.8), (0.16, 0.95, 5.8))
    # Bow rail cap
    add_box_3js(bm_decks, (0.0, 4.80, 12.8), (1.4, 0.85, 0.16))

    m_decks = bpy.data.meshes.new("TrawlerDecks_Mesh")
    bm_decks.to_mesh(m_decks)
    bm_decks.free()
    m_decks.materials.append(mat_deck)
    o_decks = bpy.data.objects.new("Trawler_Decks_Bulwarks", m_decks)
    o_decks.parent = root
    bpy.context.collection.objects.link(o_decks)

    # ── C. WHEELHOUSE & FORWARD SUPERSTRUCTURE ──
    bm_house = bmesh.new()
    # 1. Lower Crew Deckhouse (Z = 2.5 to 7.8, Y = 2.6 to 5.2)
    add_box_3js(bm_house, (0.0, 3.90, 5.2), (5.4, 2.60, 5.6))
    # 2. Upper Wheelhouse Bridge (Z = 3.2 to 7.2, Y = 5.2 to 7.8) with sloped brow
    add_box_3js(bm_house, (0.0, 6.50, 5.2), (5.0, 2.60, 4.4))
    # Bridge roof with visor overhang
    add_box_3js(bm_house, (0.0, 7.85, 5.3), (5.4, 0.22, 4.8))
    # Bridge wings
    for sx in [-1.0, 1.0]:
        add_box_3js(bm_house, (sx * 2.85, 6.40, 5.2), (0.75, 1.10, 2.2))

    m_house = bpy.data.meshes.new("Wheelhouse_Mesh")
    bm_house.to_mesh(m_house)
    bm_house.free()
    m_house.materials.append(mat_cabin)
    o_house = bpy.data.objects.new("Trawler_Wheelhouse", m_house)
    o_house.parent = root
    bpy.context.collection.objects.link(o_house)

    # Tinted Bridge Windows with Reverse Rake
    bm_win = bmesh.new()
    # Forward reverse-raked windows
    add_box_3js(bm_win, (0.0, 6.70, 7.42), (4.4, 1.15, 0.18))
    # Port and Starboard bridge windows
    for sx in [-1.0, 1.0]:
        add_box_3js(bm_win, (sx * 2.52, 6.70, 5.2), (0.16, 1.10, 3.2))
    m_win = bpy.data.meshes.new("TrawlerWindows_Mesh")
    bm_win.to_mesh(m_win)
    bm_win.free()
    m_win.materials.append(mat_glass)
    o_win = bpy.data.objects.new("Trawler_Windows", m_win)
    o_win.parent = root
    bpy.context.collection.objects.link(o_win)

    # Exhaust Smokestack Funnel & Whistle (Behind Wheelhouse)
    bm_fun = bmesh.new()
    add_cylinder_3js(bm_fun, (0.0, 5.2, 2.0), (0.0, 9.4, 1.8), radius1=0.75, radius2=0.62, segments=12)
    # Funnel top cap / exhaust pipe
    add_cylinder_3js(bm_fun, (0.0, 9.4, 1.8), (0.0, 10.2, 1.8), radius1=0.35, segments=8)
    m_fun = bpy.data.meshes.new("TrawlerFunnel_Mesh")
    bm_fun.to_mesh(m_fun)
    bm_fun.free()
    m_fun.materials.append(mat_cabin_roof)
    o_fun = bpy.data.objects.new("Trawler_Smokestack", m_fun)
    o_fun.parent = root
    bpy.context.collection.objects.link(o_fun)

    # ── D. CENTRAL TRIPOD FORE-MAST & RADAR ARRAY ──
    bm_mast = bmesh.new()
    # Main central spar from wheelhouse roof (Y = 7.8) up to masthead (Y = 16.5)
    add_cylinder_3js(bm_mast, (0.0, 7.8, 5.5), (0.0, 16.5, 5.2), radius1=0.22, radius2=0.10, segments=10)
    # Aft tripod support struts anchoring into wheelhouse roof corners
    add_cylinder_3js(bm_mast, (-1.8, 7.8, 3.6), (0.0, 12.8, 5.3), radius1=0.10, radius2=0.07, segments=8)
    add_cylinder_3js(bm_mast, ( 1.8, 7.8, 3.6), (0.0, 12.8, 5.3), radius1=0.10, radius2=0.07, segments=8)
    # Cross-trees yardarm at Y = 13.5 (where boom topping lifts attach!)
    add_cylinder_3js(bm_mast, (-2.4, 13.5, 5.3), (2.4, 13.5, 5.3), radius1=0.08, segments=8)
    # Top masthead cross-tree at Y = 15.6
    add_cylinder_3js(bm_mast, (-1.2, 15.6, 5.2), (1.2, 15.6, 5.2), radius1=0.06, segments=8)
    # Rotating Radar scanner array bar
    add_box_3js(bm_mast, (0.0, 16.8, 5.2), (1.8, 0.16, 0.35))
    # Inmarsat / VSAT satellite dome (white sphere)
    add_cylinder_3js(bm_mast, (0.8, 14.0, 5.3), (0.8, 14.8, 5.3), radius1=0.35, segments=10)

    m_mast = bpy.data.meshes.new("TrawlerMast_Mesh")
    bm_mast.to_mesh(m_mast)
    bm_mast.free()
    m_mast.materials.append(mat_steel)
    o_mast = bpy.data.objects.new("Trawler_Mast", m_mast)
    o_mast.parent = root
    bpy.context.collection.objects.link(o_mast)

    # ── E. OUTRIGGER STABILIZER BOOMS (SOLIDLY ANCHORED & FULLY RIGGED) ──
    bm_booms = bmesh.new()
    bm_rigging = bmesh.new()

    for sx in [-1.0, 1.0]:
        # 1. Cast Steel Gooseneck Mounting Bracket on Wheelhouse Roof Base
        bracket_root = (sx * 2.50, 7.60, 5.4)
        hinge_pivot = (sx * 2.80, 7.80, 5.3)
        add_cylinder_3js(bm_booms, bracket_root, hinge_pivot, radius1=0.18, segments=8)

        # 2. Heavy Tapered Outrigger Boom extending outward & upward
        boom_tip = (sx * 8.20, 11.2, 4.4)
        add_cylinder_3js(bm_booms, hinge_pivot, boom_tip, radius1=0.14, radius2=0.07, segments=10)

        # 3. Intermediate Spreader Truss along the boom (structural lattice)
        mid_boom = (sx * 5.50, 9.50, 4.85)
        strut_tip = (sx * 5.50, 10.4, 4.85)
        add_cylinder_3js(bm_booms, mid_boom, strut_tip, radius1=0.04, segments=6)

        # 4. Steel Wire Rigging (Topping Lifts & Stays - completely eliminating any floating look!)
        # Topping lift from boom tip to Mast Cross-Tree at (0, 13.5, 5.3)
        add_cylinder_3js(bm_rigging, boom_tip, (sx * 2.2, 13.5, 5.3), radius1=0.022, segments=6)
        # Mid-boom topping stay
        add_cylinder_3js(bm_rigging, strut_tip, (sx * 1.5, 12.8, 5.3), radius1=0.020, segments=6)
        # Forward guy cable to forecastle deck at (sx * 2.6, 4.2, 9.8)
        add_cylinder_3js(bm_rigging, boom_tip, (sx * 2.6, 4.2, 9.8), radius1=0.020, segments=6)
        # Aft guy cable to main deck bulwark at (sx * 3.6, 3.2, -1.0)
        add_cylinder_3js(bm_rigging, boom_tip, (sx * 3.6, 3.2, -1.0), radius1=0.020, segments=6)

        # 5. Suspended Paravane "Torpedo" Stabilizer hanging down from boom tip
        paravane_top = boom_tip
        paravane_bottom = (sx * 8.20, 3.2, 4.4)
        # Suspension wire
        add_cylinder_3js(bm_rigging, paravane_top, paravane_bottom, radius1=0.018, segments=6)
        # Hydrodynamic paravane bird / torpedo wing
        add_cylinder_3js(bm_booms, (sx * 8.20, 3.2, 4.9), (sx * 8.20, 3.2, 3.9), radius1=0.18, segments=8)
        add_box_3js(bm_booms, (sx * 8.20, 3.15, 4.4), (1.1, 0.05, 0.6))

    m_booms = bpy.data.meshes.new("TrawlerBooms_Mesh")
    bm_booms.to_mesh(m_booms)
    bm_booms.free()
    m_booms.materials.append(mat_gantry)
    o_booms = bpy.data.objects.new("Trawler_Outrigger_Booms", m_booms)
    o_booms.parent = root
    bpy.context.collection.objects.link(o_booms)

    m_rigging = bpy.data.meshes.new("TrawlerRigging_Mesh")
    bm_rigging.to_mesh(m_rigging)
    bm_rigging.free()
    m_rigging.materials.append(mat_steel)
    o_rigging = bpy.data.objects.new("Trawler_Boom_Rigging", m_rigging)
    o_rigging.parent = root
    bpy.context.collection.objects.link(o_rigging)

    # ── F. AFT STERN TRAWL NET GANTRY (4-LEGGED HEAVY WELDED A-FRAME) ──
    bm_gan = bmesh.new()
    # 4 Heavy-duty structural tubular legs firmly rooted into the deck & stern bulwarks
    for sx in [-1.0, 1.0]:
        # Forward legs: rooted in working deck at (sx * 3.1, 2.6, -7.5)
        add_cylinder_3js(bm_gan, (sx * 3.1, 2.6, -7.5), (sx * 2.8, 10.8, -10.5), radius1=0.18, radius2=0.14, segments=10)
        # Aft legs: rooted in stern quarter coamings at (sx * 3.3, 3.3, -12.4)
        add_cylinder_3js(bm_gan, (sx * 3.3, 3.3, -12.4), (sx * 2.8, 10.8, -10.5), radius1=0.18, radius2=0.14, segments=10)
        # Diagonal cross-brace gusset
        add_cylinder_3js(bm_gan, (sx * 3.2, 6.2, -10.0), (sx * 2.8, 10.8, -10.5), radius1=0.10, segments=8)

    # Heavy structural overhead crossbeam (connecting port and starboard at Y = 10.8, Z = -10.5)
    add_cylinder_3js(bm_gan, (-2.8, 10.8, -10.5), (2.8, 10.8, -10.5), radius1=0.20, segments=10)

    # Intermediate lower safety crossbar & working platform
    add_cylinder_3js(bm_gan, (-2.9, 7.8, -10.2), (2.9, 7.8, -10.2), radius1=0.10, segments=8)

    # Swiveling Trawl Hanging Blocks (Sheaves) suspended from overhead beam
    for bx in [-1.8, 1.8]:
        add_cylinder_3js(bm_gan, (bx, 10.8, -10.5), (bx, 9.8, -10.5), radius1=0.08, segments=8)
        # Heavy steel sheave pulley
        add_cylinder_3js(bm_gan, (bx - 0.12, 9.6, -10.5), (bx + 0.12, 9.6, -10.5), radius1=0.32, segments=12)

    # Halogen Deck Floodlight housings on gantry
    for lx in [-1.2, 1.2]:
        add_box_3js(bm_gan, (lx, 10.6, -10.1), (0.42, 0.32, 0.32))

    m_gan = bpy.data.meshes.new("TrawlerGantry_Mesh")
    bm_gan.to_mesh(m_gan)
    bm_gan.free()
    m_gan.materials.append(mat_gantry)
    o_gan = bpy.data.objects.new("Trawler_A_Frame_Gantry", m_gan)
    o_gan.parent = root
    bpy.context.collection.objects.link(o_gan)

    # ── G. WORKING DECK MACHINERY (TRAWL WINCHES, NET DRUM, FISH HATCH) ──
    bm_mach = bmesh.new()
    bm_net = bmesh.new()

    # 1. Twin Hydraulic Split Trawl Winches (wound with heavy wire rope)
    for wx in [-1.75, 1.75]:
        # Winch foundation base
        add_box_3js(bm_mach, (wx, 2.75, -3.2), (1.4, 0.35, 2.4))
        # Cable spool drum
        add_cylinder_3js(bm_mach, (wx - 0.55, 3.4, -3.2), (wx + 0.55, 3.4, -3.2), radius1=0.65, segments=12)
        # Hydraulic motor & drive casing
        add_cylinder_3js(bm_mach, (wx + 0.65, 3.4, -3.2), (wx + 0.85, 3.4, -3.2), radius1=0.45, segments=8)
        # Level-wind guide bar
        add_box_3js(bm_mach, (wx, 3.8, -2.1), (1.1, 0.12, 0.12))

    # 2. Central Net Drum Reel (wound with ocean trawl netting)
    # Drum flanged ends
    add_cylinder_3js(bm_mach, (-1.65, 3.8, -6.8), (-1.50, 3.8, -6.8), radius1=1.10, segments=14)
    add_cylinder_3js(bm_mach, ( 1.50, 3.8, -6.8), ( 1.65, 3.8, -6.8), radius1=1.10, segments=14)
    # Stanchion pedestals
    add_box_3js(bm_mach, (-1.60, 3.1, -6.8), (0.25, 1.2, 0.8))
    add_box_3js(bm_mach, ( 1.60, 3.1, -6.8), (0.25, 1.2, 0.8))
    # Wound Netting Mass
    add_cylinder_3js(bm_net, (-1.50, 3.8, -6.8), (1.50, 3.8, -6.8), radius1=0.95, segments=14)

    # 3. Main Fish Hold Hatch Coaming & Covers
    add_box_3js(bm_mach, (0.0, 2.85, 0.2), (3.4, 0.42, 2.8))
    # Hatch cover plates
    add_box_3js(bm_mach, (0.0, 3.12, 0.2), (3.2, 0.14, 2.6))

    # 4. Mooring Bitts / Bollards on Aft Quarters
    for bx in [-3.2, 3.2]:
        add_box_3js(bm_mach, (bx, 3.45, -11.2), (0.45, 0.12, 0.85))
        add_cylinder_3js(bm_mach, (bx, 3.45, -11.4), (bx, 4.05, -11.4), radius1=0.12, segments=8)
        add_cylinder_3js(bm_mach, (bx, 3.45, -11.0), (bx, 4.05, -11.0), radius1=0.12, segments=8)

    # 5. Port Hydraulic Fish Box Unloading Crane
    add_cylinder_3js(bm_mach, (-3.2, 3.5, 1.8), (-3.2, 5.6, 1.8), radius1=0.18, segments=8)
    add_cylinder_3js(bm_mach, (-3.2, 5.6, 1.8), (-1.2, 7.2, 0.8), radius1=0.12, segments=8)
    add_cylinder_3js(bm_mach, (-1.2, 7.2, 0.8), ( 0.5, 6.4, 0.2), radius1=0.09, segments=8)

    # 6. Heavy Steel Otter Boards (Trawl Doors) stowed in bulwark pockets
    for dx in [-3.68, 3.68]:
        add_box_3js(bm_mach, (dx, 3.8, -8.8), (0.12, 1.4, 2.4), rot_y_deg=4.0)

    m_mach = bpy.data.meshes.new("TrawlerMachinery_Mesh")
    bm_mach.to_mesh(m_mach)
    bm_mach.free()
    m_mach.materials.append(mat_steel)
    o_mach = bpy.data.objects.new("Trawler_Machinery", m_mach)
    o_mach.parent = root
    bpy.context.collection.objects.link(o_mach)

    m_net = bpy.data.meshes.new("TrawlerNets_Mesh")
    bm_net.to_mesh(m_net)
    bm_net.free()
    m_net.materials.append(mat_net)
    o_net = bpy.data.objects.new("Trawler_Nets", m_net)
    o_net.parent = root
    bpy.context.collection.objects.link(o_net)

    # ── H. SAFETY EQUIPMENT (LIFE RAFTS & SOLAS LIFE RINGS) ──
    bm_safe = bmesh.new()
    # White cylindrical life raft canisters in cradles
    for sx in [-1.0, 1.0]:
        add_cylinder_3js(bm_safe, (sx * 2.70, 7.85, 3.4), (sx * 2.70, 7.85, 4.4), radius1=0.32, segments=10)
    m_safe = bpy.data.meshes.new("TrawlerSafety_Mesh")
    bm_safe.to_mesh(m_safe)
    bm_safe.free()
    m_safe.materials.append(mat_cabin)
    o_safe = bpy.data.objects.new("Trawler_LifeRafts", m_safe)
    o_safe.parent = root
    bpy.context.collection.objects.link(o_safe)

    # SOLAS Life Rings (Safety Orange)
    bm_rings = bmesh.new()
    for sx in [-1.0, 1.0]:
        add_cylinder_3js(bm_rings, (sx * 2.72, 6.4, 6.2), (sx * 2.76, 6.4, 6.2), radius1=0.38, segments=12)
    m_rings = bpy.data.meshes.new("TrawlerRings_Mesh")
    bm_rings.to_mesh(m_rings)
    bm_rings.free()
    m_rings.materials.append(mat_solas_orange)
    o_rings = bpy.data.objects.new("Trawler_LifeRings", m_rings)
    o_rings.parent = root
    bpy.context.collection.objects.link(o_rings)

    # Export to GLB
    out_p = r"c:\Users\anisa\Desktop\Ship\assets\models\fishing_trawler.glb"
    print(f"Exporting ultra-detailed fishing trawler to: {out_p} ...")
    bpy.ops.export_scene.gltf(filepath=out_p, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported ultra-realistic fishing_trawler.glb")


# ══════════════════════════════════════════════════════════════════════════════
# 2. GENERATE ULTRA-REALISTIC CONTAINER CARGO SHIP (110m LOA)
# ══════════════════════════════════════════════════════════════════════════════
def build_container_ship():
    clean_scene()
    root = bpy.data.objects.new("ContainerShip_Root", None)
    bpy.context.collection.objects.link(root)

    mat_hull = create_pbr_mat("Cargo_Hull_Dark", (0.07, 0.09, 0.12), roughness=0.52, metallic=0.25)
    mat_primer = create_pbr_mat("Red_Primer_Bottom", (0.55, 0.10, 0.08), roughness=0.65, metallic=0.1)
    mat_white_stripe = create_pbr_mat("Waterline_White", (0.92, 0.93, 0.94), roughness=0.4)
    mat_super = create_pbr_mat("Superstructure_White", (0.95, 0.95, 0.96), roughness=0.3, clearcoat=0.3)
    mat_glass = create_pbr_mat("Bridge_Glass", (0.04, 0.12, 0.18), roughness=0.05, metallic=0.9, transmission=0.4, alpha=0.75)
    mat_crane = create_pbr_mat("Crane_Yellow", (0.95, 0.65, 0.10), roughness=0.45)
    mat_deck = create_pbr_mat("Steel_Deck", (0.20, 0.22, 0.25), roughness=0.75)

    mat_c_evergreen = create_pbr_mat("Container_Evergreen", (0.08, 0.38, 0.18), roughness=0.65)
    mat_c_maersk = create_pbr_mat("Container_Maersk", (0.24, 0.58, 0.82), roughness=0.6)
    mat_c_hapag = create_pbr_mat("Container_Hapag", (0.92, 0.44, 0.08), roughness=0.6)
    mat_c_msc = create_pbr_mat("Container_MSC", (0.85, 0.68, 0.12), roughness=0.6)
    mat_c_red = create_pbr_mat("Container_Red", (0.72, 0.15, 0.12), roughness=0.6)
    c_mats = [mat_c_evergreen, mat_c_maersk, mat_c_hapag, mat_c_msc, mat_c_red]

    # 1. Hydrodynamic Commercial Hull (110m long, 18m beam)
    hull_stations = [
        (56.0, [(0.0, -4.5), (0.2, 0.0), (0.6, 3.5), (1.2, 6.8)]),
        (50.0, [(0.0, -5.2), (3.5, -2.5), (6.8, 1.5), (8.5, 6.2)]),
        (35.0, [(0.0, -5.5), (7.5, -3.8), (8.8, 0.5), (9.0, 5.5)]),
        (0.0,  [(0.0, -5.5), (8.2, -4.2), (9.0, 0.2), (9.0, 5.2)]),
        (-35.0,[(0.0, -5.5), (8.2, -4.2), (9.0, 0.2), (9.0, 5.2)]),
        (-48.0,[(0.0, -4.8), (6.5, -3.2), (8.5, 0.5), (8.8, 5.4)]),
        (-54.0,[(0.0, -3.2), (4.5, -1.8), (7.8, 0.8), (8.2, 5.5)])
    ]

    bm_hull = bmesh.new()
    h_rings = []
    for z_pos, pts in hull_stations:
        stbd = [B(x, y, z_pos) for (x, y) in pts]
        port = [B(-x, y, z_pos) for (x, y) in pts[1:]]
        port.reverse()
        ring = port + stbd
        r_verts = [bm_hull.verts.new(p) for p in ring]
        h_rings.append(r_verts)

    for s in range(len(h_rings) - 1):
        r1, r2 = h_rings[s], h_rings[s + 1]
        half = len(hull_stations[s][1])
        total = len(r1)
        for p in range(total - 1):
            tier = p if p < half else (total - 1 - p)
            f = bm_hull.faces.new([r1[p], r2[p], r2[p + 1], r1[p + 1]])
            if tier <= 1:
                f.material_index = 1
            elif tier == 2:
                f.material_index = 2
            else:
                f.material_index = 0

    # Cap stem and transom
    for p in range(len(h_rings[0]) - 2):
        bm_hull.faces.new([h_rings[0][0], h_rings[0][p + 2], h_rings[0][p + 1]])
    for p in range(len(h_rings[-1]) - 2):
        bm_hull.faces.new([h_rings[-1][0], h_rings[-1][p + 1], h_rings[-1][p + 2]])

    bmesh.ops.recalc_face_normals(bm_hull, faces=bm_hull.faces)

    m_hull = bpy.data.meshes.new("CargoHull_Mesh")
    bm_hull.to_mesh(m_hull)
    bm_hull.free()
    m_hull.materials.append(mat_hull)
    m_hull.materials.append(mat_primer)
    m_hull.materials.append(mat_white_stripe)

    obj_hull = bpy.data.objects.new("Container_Ship_Hull", m_hull)
    obj_hull.parent = root
    bpy.context.collection.objects.link(obj_hull)
    for p in m_hull.polygons:
        p.use_smooth = True

    # Bulbous Bow
    bm_bulb = bmesh.new()
    bmesh.ops.create_uvsphere(bm_bulb, u_segments=16, v_segments=12, radius=3.2, matrix=Matrix.Translation(B(0, -4.2, 54.5)) @ Matrix.Scale(0.85, 4, Vector((1, 0, 0))) @ Matrix.Scale(1.15, 4, Vector((0, 0, 1))) @ Matrix.Scale(2.2, 4, Vector((0, 1, 0))))
    m_bulb = bpy.data.meshes.new("Bulb_Mesh")
    bm_bulb.to_mesh(m_bulb)
    bm_bulb.free()
    m_bulb.materials.append(mat_primer)
    obj_bulb = bpy.data.objects.new("Bulbous_Bow", m_bulb)
    obj_bulb.parent = root
    bpy.context.collection.objects.link(obj_bulb)

    # Main Deck Plating
    bm_deck = bmesh.new()
    add_box_3js(bm_deck, (0, 5.2, 0), (17.8, 0.25, 104.0))
    m_deck = bpy.data.meshes.new("CargoDeck_Mesh")
    bm_deck.to_mesh(m_deck)
    bm_deck.free()
    m_deck.materials.append(mat_deck)
    obj_deck = bpy.data.objects.new("Cargo_Deck", m_deck)
    obj_deck.parent = root
    bpy.context.collection.objects.link(obj_deck)

    # Stacked Cargo Containers
    c_w, c_h, c_l = 4.8, 2.7, 12.2
    bays = [-28, -15, 0, 15, 28]
    brand_bms = [bmesh.new() for _ in range(len(c_mats))]

    for b_idx, bay_z in enumerate(bays):
        for rx in [-5.4, 0, 5.4]:
            tiers = 3 if abs(bay_z) > 20 else 4
            for t in range(tiers):
                m_idx = (b_idx + int(rx) + t) % len(c_mats)
                target_bm = brand_bms[m_idx]
                cy = 5.4 + t * (c_h + 0.10) + c_h * 0.5
                add_box_3js(target_bm, (rx, cy, bay_z), (c_w, c_h, c_l))

    for i, bm_brand in enumerate(brand_bms):
        m_brand = bpy.data.meshes.new(f"Containers_Brand_{i}_Mesh")
        bm_brand.to_mesh(m_brand)
        bm_brand.free()
        m_brand.materials.append(c_mats[i])
        o_brand = bpy.data.objects.new(f"Containers_Brand_{i}", m_brand)
        o_brand.parent = root
        bpy.context.collection.objects.link(o_brand)

    # Deck Gantry Cranes
    bm_crane = bmesh.new()
    for bay_z in [-21.5, 21.5]:
        add_box_3js(bm_crane, (0, 11.5, bay_z), (1.8, 12.0, 1.8))
        add_box_3js(bm_crane, (0, 17.5, bay_z), (19.5, 1.4, 1.4))
    m_cr = bpy.data.meshes.new("DeckCranes_Mesh")
    bm_crane.to_mesh(m_cr)
    bm_crane.free()
    m_cr.materials.append(mat_crane)
    o_cr = bpy.data.objects.new("Deck_Cranes", m_cr)
    o_cr.parent = root
    bpy.context.collection.objects.link(o_cr)

    # Aft Superstructure Navigation Castle (6 Decks)
    bm_sup = bmesh.new()
    add_box_3js(bm_sup, (0, 13.5, -41.0), (15.5, 16.0, 15.0))
    # Extended Bridge Wings (Wheelhouse)
    add_box_3js(bm_sup, (0, 20.2, -41.0), (21.5, 2.8, 4.8))
    m_sup = bpy.data.meshes.new("Superstructure_Mesh")
    bm_sup.to_mesh(m_sup)
    bm_sup.free()
    m_sup.materials.append(mat_super)
    obj_sup = bpy.data.objects.new("Aft_Superstructure", m_sup)
    obj_sup.parent = root
    bpy.context.collection.objects.link(obj_sup)

    # Tinted Bridge Windows
    bm_win = bmesh.new()
    add_box_3js(bm_win, (0, 20.4, -38.4), (16.5, 1.4, 0.4))
    m_win = bpy.data.meshes.new("BridgeWin_Mesh")
    bm_win.to_mesh(m_win)
    bm_win.free()
    m_win.materials.append(mat_glass)
    obj_win = bpy.data.objects.new("Bridge_Windows", m_win)
    obj_win.parent = root
    bpy.context.collection.objects.link(obj_win)

    # Smokestack Funnel & Radar Mast
    bm_fun = bmesh.new()
    add_cylinder_3js(bm_fun, (0, 17.0, -47.0), (0, 28.0, -47.0), radius1=2.6, radius2=2.1, segments=12)
    add_cylinder_3js(bm_fun, (0, 21.0, -41.0), (0, 35.0, -41.0), radius1=0.25, radius2=0.08, segments=8)
    m_fun = bpy.data.meshes.new("Funnel_Mesh")
    bm_fun.to_mesh(m_fun)
    bm_fun.free()
    m_fun.materials.append(mat_primer)
    obj_fun = bpy.data.objects.new("Funnel_Mast", m_fun)
    obj_fun.parent = root
    bpy.context.collection.objects.link(obj_fun)

    out_p = r"c:\Users\anisa\Desktop\Ship\assets\models\container_ship.glb"
    print(f"Exporting container ship to: {out_p} ...")
    bpy.ops.export_scene.gltf(filepath=out_p, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported container_ship.glb")


# ══════════════════════════════════════════════════════════════════════════════
# 3. GENERATE RACING SAILING YACHT (20m LOA)
# ══════════════════════════════════════════════════════════════════════════════
def build_sailing_yacht():
    clean_scene()
    root = bpy.data.objects.new("SailingYacht_Root", None)
    bpy.context.collection.objects.link(root)

    mat_hull = create_pbr_mat("Sloop_Hull_White", (0.94, 0.95, 0.97), roughness=0.12, clearcoat=0.6)
    mat_teak = create_pbr_mat("Sloop_Teak", (0.58, 0.40, 0.24), roughness=0.68)
    mat_carbon = create_pbr_mat("Carbon_Mast", (0.10, 0.12, 0.14), roughness=0.3, metallic=0.7)
    mat_sail = create_pbr_mat("Dacron_Sail", (0.95, 0.96, 0.98), roughness=0.75)

    stations = [
        (10.0, [(0.0, -1.2), (0.05, 0.2), (0.08, 1.4)]),
        (7.0,  [(0.0, -1.6), (1.1, -0.4), (1.8, 1.3)]),
        (2.0,  [(0.0, -1.8), (2.0, -0.3), (2.4, 1.2)]),
        (-4.0, [(0.0, -1.6), (2.1, -0.2), (2.35, 1.15)]),
        (-9.8, [(0.0, -0.8), (1.8, 0.1), (2.1, 1.05)])
    ]

    bm_hull = bmesh.new()
    h_rings = []
    for z_pos, pts in stations:
        stbd = [B(x, y, z_pos) for (x, y) in pts]
        port = [B(-x, y, z_pos) for (x, y) in pts[1:]]
        port.reverse()
        ring = port + stbd
        r_verts = [bm_hull.verts.new(p) for p in ring]
        h_rings.append(r_verts)

    for s in range(len(h_rings) - 1):
        r1, r2 = h_rings[s], h_rings[s + 1]
        for p in range(len(r1) - 1):
            bm_hull.faces.new([r1[p], r2[p], r2[p + 1], r1[p + 1]])

    for p in range(len(h_rings[-1]) - 2):
        bm_hull.faces.new([h_rings[-1][0], h_rings[-1][p + 1], h_rings[-1][p + 2]])

    bmesh.ops.recalc_face_normals(bm_hull, faces=bm_hull.faces)

    m_hull = bpy.data.meshes.new("SloopHull_Mesh")
    bm_hull.to_mesh(m_hull)
    bm_hull.free()
    m_hull.materials.append(mat_hull)

    obj_hull = bpy.data.objects.new("Sloop_Hull", m_hull)
    obj_hull.parent = root
    bpy.context.collection.objects.link(obj_hull)
    for p in m_hull.polygons:
        p.use_smooth = True

    # Flush Teak Deck
    bm_deck = bmesh.new()
    add_box_3js(bm_deck, (0, 1.15, 0), (4.6, 0.12, 19.2))
    m_deck = bpy.data.meshes.new("SloopDeck_Mesh")
    bm_deck.to_mesh(m_deck)
    bm_deck.free()
    m_deck.materials.append(mat_teak)
    obj_deck = bpy.data.objects.new("Sloop_Deck", m_deck)
    obj_deck.parent = root
    bpy.context.collection.objects.link(obj_deck)

    # Carbon Spar / Mast, Spreaders, and Boom
    bm_rig = bmesh.new()
    add_cylinder_3js(bm_rig, (0, 1.2, 2.0), (0, 24.5, 1.5), radius1=0.18, radius2=0.08, segments=12)
    add_cylinder_3js(bm_rig, (0, 2.6, 1.8), (0, 2.4, -8.2), radius1=0.12, radius2=0.08, segments=8)
    for sp_y in [9.0, 16.0]:
        add_cylinder_3js(bm_rig, (-1.6, sp_y, 1.8), (1.6, sp_y, 1.8), radius1=0.04, segments=6)

    m_rig = bpy.data.meshes.new("SloopRig_Mesh")
    bm_rig.to_mesh(m_rig)
    bm_rig.free()
    m_rig.materials.append(mat_carbon)
    obj_rig = bpy.data.objects.new("Carbon_Rigging", m_rig)
    obj_rig.parent = root
    bpy.context.collection.objects.link(obj_rig)

    # Mainsail
    bm_sail = bmesh.new()
    s_pts = [
        (0.0, 2.6, 1.6),    # Tack
        (0.0, 24.2, 1.5),   # Head
        (0.65, 2.5, -8.0)   # Clew
    ]
    s_verts = [bm_sail.verts.new(B(p[0], p[1], p[2])) for p in s_pts]
    bm_sail.faces.new(s_verts)

    m_sail = bpy.data.meshes.new("SloopSail_Mesh")
    bm_sail.to_mesh(m_sail)
    bm_sail.free()
    m_sail.materials.append(mat_sail)
    obj_sail = bpy.data.objects.new("Mainsail", m_sail)
    obj_sail.parent = root
    bpy.context.collection.objects.link(obj_sail)

    out_p = r"c:\Users\anisa\Desktop\Ship\assets\models\sailing_yacht.glb"
    print(f"Exporting sailing yacht to: {out_p} ...")
    bpy.ops.export_scene.gltf(filepath=out_p, export_format='GLB', export_apply=True)
    print("SUCCESS: Exported sailing_yacht.glb")


if __name__ == '__main__':
    build_fishing_trawler()
    build_container_ship()
    build_sailing_yacht()
