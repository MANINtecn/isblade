import bpy
import os

base_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter"
psk_dir = os.path.join(base_dir, "Fighter", "SkeletalMesh")
tex_dir = os.path.join(base_dir, "textures", "MFighter", "Texture")
wp_psk = os.path.join(base_dir, "LineageWeapons", "SkeletalMesh", "dragon_slayer_m00_wp.psk")
wp_tex = os.path.join(base_dir, "LineageWeaponsTex", "Texture", "dragon_slayer_t00_sp.png")
out_wp_glb = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\dragon_slayer.glb"
out_imperial_glb = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\human_fighter_imperial.glb"

# ==================== 1. Export Dragon Slayer GLB ====================
print(">>> [1/2] Exportando Dragon Slayer...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

bpy.ops.import_scene.psk(filepath=wp_psk)
wp_obj = [o for o in bpy.data.objects if o.type == 'MESH'][0]
wp_obj.name = "DragonSlayer"

# Material
mat_wp = bpy.data.materials.new(name="Mat_DragonSlayer")
mat_wp.use_nodes = True
bsdf = mat_wp.node_tree.nodes.get("Principled BSDF")
if os.path.exists(wp_tex) and bsdf:
    tex_img = bpy.data.images.load(wp_tex)
    tex_node = mat_wp.node_tree.nodes.new('ShaderNodeTexImage')
    tex_node.image = tex_img
    mat_wp.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = 0.85
    if 'Roughness' in bsdf.inputs:
        bsdf.inputs['Roughness'].default_value = 0.35

wp_obj.data.materials.clear()
wp_obj.data.materials.append(mat_wp)

bpy.ops.export_scene.gltf(
    filepath=out_wp_glb,
    export_format='GLB'
)
print(">>> Dragon Slayer exportada com sucesso!")

# ==================== 2. Export Imperial Crusader Set ====================
print(">>> [2/2] Exportando Human Fighter com Set Imperial Crusader...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

imperial_parts = [
    ("MFighter_m013_u", "Chest_Imperial", "MFighter_m013_t2000_u_sp.png"),
    ("MFighter_m013_l", "Legs_Imperial", "MFighter_m013_t2000_l_sp.png"),
    ("MFighter_m013_g", "Gloves_Imperial", "MFighter_m013_t2000_g.png"),
    ("MFighter_m013_b", "Boots_Imperial", "MFighter_m013_t2000_b_sp.png"),
    ("MFighter_m000_h", "Hair", "MFighter_m000_t00_m00_bh.png"),
    ("MFighter_m000_f", "Face", "MFighter_m000_t00_f.png")
]

created_objects = []
for psk_name, nice_name, tex_file in imperial_parts:
    psk_file = os.path.join(psk_dir, f"{psk_name}.psk")
    bpy.ops.import_scene.psk(filepath=psk_file)
    mesh_obj = [o for o in bpy.data.objects if o.type == 'MESH' and o not in [c[0] for c in created_objects]][0]
    mesh_obj.name = nice_name
    created_objects.append((mesh_obj, nice_name, tex_file))

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
master_arm = armatures[0]
master_arm.name = "HumanFighter_Armature"

for mesh_obj, nice_name, tex_file in created_objects:
    for mod in mesh_obj.modifiers:
        if mod.type == 'ARMATURE':
            mod.object = master_arm
    mesh_obj.parent = master_arm
    
    mat = bpy.data.materials.new(name=f"Mat_{nice_name}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    tpath = os.path.join(tex_dir, tex_file)
    if os.path.exists(tpath) and bsdf:
        tex_img = bpy.data.images.load(tpath)
        tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_node.image = tex_img
        mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
        if "Imperial" in nice_name:
            if 'Metallic' in bsdf.inputs:
                bsdf.inputs['Metallic'].default_value = 0.8
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = 0.35
        else:
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = 0.55
    mesh_obj.data.materials.clear()
    mesh_obj.data.materials.append(mat)

for extra_arm in armatures[1:]:
    bpy.data.objects.remove(extra_arm, do_unlink=True)

# Copy NLA tracks/actions from earlier or basic idle
psa_path = os.path.join(base_dir, "Fighter", "MeshAnimation", "MFighter_anim.psa")
bpy.context.view_layer.objects.active = master_arm
master_arm.select_set(True)
psa_import_fn = getattr(bpy.ops.psa_import, 'import')
psa_import_fn(filepath=psa_path)

if 'Wait_2HS_MFighter' in bpy.data.actions:
    act_idle = bpy.data.actions['Wait_2HS_MFighter']
    act_idle.name = 'idle'
if 'Run_2HS_MFighter' in bpy.data.actions:
    act_run = bpy.data.actions['Run_2HS_MFighter']
    act_run.name = 'run'

bpy.ops.export_scene.gltf(
    filepath=out_imperial_glb,
    export_format='GLB',
    export_animations=True,
    export_skins=True
)
print(">>> Set Imperial Crusader exportado com sucesso!")
