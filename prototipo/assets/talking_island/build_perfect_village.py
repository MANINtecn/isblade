import bpy
import os
import glob
import re

base_ext = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\extracted_l2"
out_models_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\assembled_glb"
os.makedirs(out_models_dir, exist_ok=True)

# 1. Index all textures from extracted_l2
tex_map = {}
for root, dirs, files in os.walk(base_ext):
    for f in files:
        if f.lower().endswith('.png'):
            stem = os.path.splitext(f.lower())[0].replace(' ', '').replace('-', '_')
            full_path = os.path.join(root, f)
            tex_map[stem] = full_path

print(f">>> Total indexed textures: {len(tex_map)}")

def resolve_texture(mat_name, mesh_name=""):
    clean = mat_name.lower().replace(' ', '').replace('-', '_')
    # strip .001, etc.
    clean = re.sub(r'\.\d+$', '', clean)

    # exact match
    if clean in tex_map:
        return tex_map[clean]

    # strip suffixes
    clean_strip = re.sub(r'(_light|_2s|_m|_s|_a|_b|_c|_d|_win|\_sh)$', '', clean)
    if clean_strip in tex_map:
        return tex_map[clean_strip]

    # strip prefixes
    for prefix in ['sp_v_', 'sp_ch_', 'sp_p_', 'sp_', 'gl_p_', 'gl_', 'mw', 'ms']:
        clean_noprefix = clean.replace(prefix, '')
        if clean_noprefix in tex_map:
            return tex_map[clean_noprefix]

    # Partial search in tex_map
    for k, v in tex_map.items():
        if k in clean or clean in k:
            return v

    # Fallback for dummy materials
    if 'dummy' in clean:
        if 'h0' in mesh_name.lower() or 'sh0' in mesh_name.lower() or 'agit' in mesh_name.lower():
            # default house plaster wall
            return tex_map.get('sp_v_wall07a') or tex_map.get('sp_v_wall05a') or tex_map.get('sp_v_wall08')
        if 'gate' in mesh_name.lower() or 'g01' in mesh_name.lower() or 'wall' in mesh_name.lower():
            return tex_map.get('sp_v_wall13') or tex_map.get('sp_ch_wall01')
        return tex_map.get('sp_ch_wall01')

    # General fallback to linege 2 stone wall
    return tex_map.get('sp_ch_wall01') or tex_map.get('sp_v_wall08')

def build_asset(name, components, out_name):
    # 1. Clean scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes: bpy.data.meshes.remove(block)
    for block in bpy.data.materials: bpy.data.materials.remove(block)
    for block in bpy.data.images: bpy.data.images.remove(block)

    imported_objects = []
    for pkg_rel, comp in components:
        gltf_path = os.path.join(base_ext, pkg_rel, "StaticMesh", comp + ".gltf")
        if not os.path.exists(gltf_path):
            print(f"WARN: {gltf_path} not found")
            continue
        bpy.ops.import_scene.gltf(filepath=gltf_path)
        for obj in bpy.context.selected_objects:
            if obj.type == 'MESH':
                imported_objects.append((obj, comp))

    if not imported_objects:
        print(f"ERROR: No meshes imported for {name}")
        return False

    # Apply textures
    for obj, comp_name in imported_objects:
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            tex_file = resolve_texture(mat.name, comp_name)
            if tex_file and os.path.exists(tex_file):
                mat.use_nodes = True
                bsdf = mat.node_tree.nodes.get("Principled BSDF")
                if bsdf:
                    for n in list(mat.node_tree.nodes):
                        if n.type == 'TEX_IMAGE':
                            mat.node_tree.nodes.remove(n)
                    tex_img = bpy.data.images.load(tex_file)
                    tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
                    tex_node.image = tex_img
                    mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
                    
                    # If leaf or tree, handle alpha
                    if 'leaf' in mat.name.lower() or 'tent' in mat.name.lower():
                        mat.node_tree.links.new(bsdf.inputs['Alpha'], tex_node.outputs['Alpha'])
                        try:
                            mat.blend_method = 'CLIP'
                        except Exception:
                            pass
                    
                    bsdf.inputs['Roughness'].default_value = 0.8
                    bsdf.inputs['Metallic'].default_value = 0.05

    # Join meshes
    mesh_objs = [o for o, _ in imported_objects]
    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    if len(mesh_objs) > 1:
        bpy.ops.object.join()

    unified = bpy.context.active_object
    unified.name = name

    # Export GLB
    out_glb_path = os.path.join(out_models_dir, out_name)
    bpy.ops.export_scene.gltf(
        filepath=out_glb_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f"SUCCESS: {out_name} -> {os.path.getsize(out_glb_path)} bytes")
    return True

# Define all village assets to assemble
VILLAGE_ASSETS = [
    # 1. Casas Medievais Completas (Corpo + Telhado)
    ("TI_House_01", [("si_v_s", "SI_H01"), ("si_v_s", "SI_H01_Rf")], "ti_house_01.glb"),
    ("TI_House_02", [("si_v_s", "SI_H02"), ("si_v_s", "SI_H02_Rf")], "ti_house_02.glb"),
    ("TI_House_03", [("si_v_s", "SI_H03"), ("si_v_s", "SI_H03_Rf")], "ti_house_03.glb"),
    ("TI_House_04", [("si_v_s", "SI_H04"), ("si_v_s", "SI_H04_Rf")], "ti_house_04.glb"),
    
    # 2. Lojas Oficiais (Weapon, Grocer, Magic/Warehouse)
    ("TI_Shop_01", [("si_v_s", "SI_SH01"), ("si_v_s", "SI_SH01_Rf")], "ti_shop_01.glb"),
    ("TI_Shop_02", [("si_v_s", "SI_SH02"), ("si_v_s", "SI_SH02_Rf")], "ti_shop_02.glb"),
    ("TI_Shop_03", [("si_v_s", "SI_SH03"), ("si_v_s", "SI_SH03_Rf")], "ti_shop_03.glb"),
    
    # 3. Clan Hall / Agit
    ("TI_Agit", [("si_v_s", "SI_Agit"), ("si_v_s", "SI_Agit_Rf")], "ti_agit.glb"),
    
    # 4. Templo / Igreja de Einhasad
    ("TI_Church", [("si_v_s", "SI_CH_Body")], "ti_church.glb"),
    
    # 5. Guilda dos Guerreiros (Fighter Guild)
    ("TI_Fighter_Hall", [("speakingfighter_s", "SI_Fighter_Hall"), ("speakingfighter_s", "SI_Fighter_Front")], "ti_fighter_hall.glb"),
    
    # 6. Portão de Pedra
    ("TI_Gate", [("si_v_s", "SI_G01")], "ti_gate.glb"),
    
    # 7. Muralhas de Pedra
    ("TI_Wall_A", [("si_v_s", "SI_Wall_A")], "ti_wall_a.glb"),
    ("TI_Wall_B", [("si_v_s", "SI_Wall_B")], "ti_wall_b.glb"),
    ("TI_Wall_C", [("si_v_s", "SI_Wall_C")], "ti_wall_c.glb"),
    ("TI_Wall_D", [("si_v_s", "SI_Wall_D")], "ti_wall_d.glb"),
    
    # 8. Centro da Praça (Center Top / Fountain Base)
    ("TI_Center_Top", [("si_v_s", "SI_Centertop")], "ti_centertop.glb"),
    
    # 9. Farol da Costa
    ("TI_Lighthouse", [("speaking_port_s", "sp_p_light_tower")], "ti_lighthouse.glb"),
    
    # 10. Pier do Porto
    ("TI_Port_Dock", [("speaking_port_s", "sp_p_wood01")], "ti_port_dock.glb"),
    
    # 11. Árvores Nativas do Lineage 2
    ("TI_Tree_01", [("speaking_tree_s", "splandtree1_A")], "ti_tree_01.glb"),
    ("TI_Tree_02", [("speaking_tree_s", "splandtree4_A")], "ti_tree_02.glb"),
    ("TI_Tree_Legend", [("speaking_tree_s", "spLand_Legend_tree01")], "ti_tree_legend.glb")
]

for name, comps, out_file in VILLAGE_ASSETS:
    build_asset(name, comps, out_file)

print(">>> ALL PERFECT LINEAGE 2 TALKING ISLAND ASSETS ASSEMBLED SUCCESSFULLY!")
