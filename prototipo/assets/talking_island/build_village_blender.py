import bpy
import os
import sys

# Directory paths
base_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island"
raw_gltf_dir = os.path.join(base_dir, r"real_village\si_v_s\StaticMesh")
tex_dirs = [
    os.path.join(base_dir, r"real_village\si_v_t\Texture"),
    os.path.join(base_dir, r"real_village\interior_b_t\Texture"),
    os.path.join(base_dir, r"real_village\si_sh_inner_t\Texture"),
    os.path.join(base_dir, r"textures"),
    os.path.join(base_dir, r"raw_export\speakingfighter_t\Texture")
]
out_models_dir = os.path.join(base_dir, "assembled_glb")
os.makedirs(out_models_dir, exist_ok=True)

# Build texture lookup map
tex_map = {}
for td in tex_dirs:
    if os.path.exists(td):
        for f in os.listdir(td):
            if f.lower().endswith('.png'):
                clean = os.path.splitext(f.lower())[0].replace(' ', '')
                tex_map[clean] = os.path.join(td, f)
                # also without prefix
                clean_no_sp = clean.replace('sp_', '').replace('si_', '')
                tex_map[clean_no_sp] = os.path.join(td, f)

print(f">>> Total textures indexed in library: {len(tex_map)}")

def build_building(name, components, out_name):
    # 1. Clean scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Clean orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
            
    # 2. Import all components (e.g. body + roof)
    imported_objects = []
    for comp in components:
        gltf_path = os.path.join(raw_gltf_dir, comp + ".gltf")
        if not os.path.exists(gltf_path):
            print(f"WARN: {gltf_path} not found")
            continue
        bpy.ops.import_scene.gltf(filepath=gltf_path)
        for obj in bpy.context.selected_objects:
            if obj.type == 'MESH':
                imported_objects.append(obj)
                
    if not imported_objects:
        print(f"ERROR: No meshes imported for {name}")
        return False
        
    print(f">>> Building {name}: {len(imported_objects)} mesh objects imported")
    
    # 3. Apply textures to all materials
    for obj in imported_objects:
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            mat_name = mat.name.lower().replace(' ', '').replace('_m', '').replace('_s', '')
            # Match texture
            found_tex = None
            if mat_name in tex_map:
                found_tex = tex_map[mat_name]
            else:
                for k in [mat_name.replace('sp_', ''), mat_name.replace('si_', ''), mat_name.split('.')[0]]:
                    if k in tex_map:
                        found_tex = tex_map[k]
                        break
            
            if found_tex:
                mat.use_nodes = True
                bsdf = mat.node_tree.nodes.get("Principled BSDF")
                if bsdf:
                    # Remove existing texture node if any
                    for n in list(mat.node_tree.nodes):
                        if n.type == 'TEX_IMAGE':
                            mat.node_tree.nodes.remove(n)
                            
                    tex_img = bpy.data.images.load(found_tex)
                    tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
                    tex_node.image = tex_img
                    mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
                    bsdf.inputs['Roughness'].default_value = 0.75
                    bsdf.inputs['Metallic'].default_value = 0.05
                    print(f"   Mat '{mat.name}' -> Texture '{os.path.basename(found_tex)}'")
            else:
                print(f"   WARN: No texture found for material '{mat.name}'")

    # 4. Join all components into a single unified mesh
    bpy.ops.object.select_all(action='DESELECT')
    for obj in imported_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = imported_objects[0]
    
    if len(imported_objects) > 1:
        bpy.ops.object.join()
        
    unified = bpy.context.active_object
    unified.name = name
    
    # 5. Export as self-contained GLB
    out_glb_path = os.path.join(out_models_dir, out_name)
    bpy.ops.export_scene.gltf(
        filepath=out_glb_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f">>> Successfully exported {out_glb_path} (Size: {os.path.getsize(out_glb_path)} bytes)\n")
    return True

# Build all complete Lineage 2 Talking Island Village buildings
buildings = [
    # Casas Medievais Completas (Corpo + Telhado)
    ("TI_House_01", ["SI_H01", "SI_H01_Rf"], "ti_house_01.glb"),
    ("TI_House_02", ["SI_H02", "SI_H02_Rf"], "ti_house_02.glb"),
    ("TI_House_03", ["SI_H03", "SI_H03_Rf"], "ti_house_03.glb"),
    ("TI_House_04", ["SI_H04", "SI_H04_Rf"], "ti_house_04.glb"),
    # Lojas da Vila (Corpo + Telhado)
    ("TI_Shop_01", ["SI_SH01", "SI_SH01_Rf"], "ti_shop_01.glb"),
    ("TI_Shop_02", ["SI_SH02", "SI_SH02_Rf"], "ti_shop_02.glb"),
    ("TI_Shop_03", ["SI_SH03", "SI_SH03_Rf"], "ti_shop_03.glb"),
    # Clan Hall / Agit
    ("TI_Agit", ["SI_Agit", "SI_Agit_Rf"], "ti_agit.glb"),
    # Templo / Igreja de Einhasad
    ("TI_Church", ["SI_CH_Body"], "ti_church.glb"),
    # Portão de Pedra
    ("TI_Gate", ["SI_G01"], "ti_gate.glb"),
    # Muralhas
    ("TI_Wall_A", ["SI_Wall_A"], "ti_wall_a.glb"),
    ("TI_Wall_B", ["SI_Wall_B"], "ti_wall_b.glb"),
    ("TI_Wall_C", ["SI_Wall_C"], "ti_wall_c.glb"),
    ("TI_Wall_D", ["SI_Wall_D"], "ti_wall_d.glb")
]

for bname, comps, out_file in buildings:
    build_building(bname, comps, out_file)

print(">>> ALL LINEAGE 2 TALKING ISLAND BUILDINGS ASSEMBLED SUCCESSFULLY!")
