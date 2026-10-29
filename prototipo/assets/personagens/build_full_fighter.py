import bpy
import os

base_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter\Fighter"
psk_dir = os.path.join(base_dir, "SkeletalMesh")
psa_path = os.path.join(base_dir, "MeshAnimation", "MFighter_anim.psa")
tex_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter\textures\MFighter\Texture"
mixamo_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\mixamo"
out_glb_base = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\human_fighter.glb"

print(">>> [1/7] Limpando cena do Blender...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)

# 1. Import meshes
parts = [
    ("MFighter_m000_u", "Chest", "MFighter_m000_t1000_u.png"),
    ("MFighter_m000_l", "Legs", "MFighter_m000_t1000_l.png"),
    ("MFighter_m000_g", "Gloves", "MFighter_m000_t1000_g.png"),
    ("MFighter_m000_b", "Boots", "MFighter_m000_t1000_b.png"),
    ("MFighter_m000_h", "Hair", "MFighter_m000_t00_m00_bh.png"),
    ("MFighter_m000_f", "Face", "MFighter_m000_t00_f.png")
]

created_objects = []
for psk_name, nice_name, tex_file in parts:
    psk_file = os.path.join(psk_dir, f"{psk_name}.psk")
    print(f"Importando {psk_name}...")
    bpy.ops.import_scene.psk(filepath=psk_file)
    mesh_obj = [o for o in bpy.data.objects if o.type == 'MESH' and o not in [c[0] for c in created_objects]][0]
    mesh_obj.name = nice_name
    created_objects.append((mesh_obj, nice_name, tex_file))

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
master_arm = armatures[0]
master_arm.name = "HumanFighter_Armature"
print(f">>> Esqueleto Mestre: {master_arm.name}")

# Rebind meshes to master armature and delete redundant armatures
for mesh_obj, nice_name, tex_file in created_objects:
    for mod in mesh_obj.modifiers:
        if mod.type == 'ARMATURE':
            mod.object = master_arm
    mesh_obj.parent = master_arm
    
    # Material
    mat = bpy.data.materials.new(name=f"Mat_{nice_name}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    tpath = os.path.join(tex_dir, tex_file)
    if os.path.exists(tpath) and bsdf:
        tex_img = bpy.data.images.load(tpath)
        tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_node.image = tex_img
        mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = 0.55
        if nice_name == 'Face' or nice_name == 'Hair':
            # Alpha handling if present
            tex_img.alpha_mode = 'CHANNEL_PACKED'
    mesh_obj.data.materials.clear()
    mesh_obj.data.materials.append(mat)

for extra_arm in armatures[1:]:
    bpy.data.objects.remove(extra_arm, do_unlink=True)

print(">>> [2/7] Importando PSA do Lineage 2 (MFighter_anim.psa)...")
bpy.context.view_layer.objects.active = master_arm
master_arm.select_set(True)
psa_import_fn = getattr(bpy.ops.psa_import, 'import')
psa_import_fn(filepath=psa_path)
print(f"Total acoes L2 carregadas: {len(bpy.data.actions)}")

# Map L2 actions
l2_action_map = {
    'Run_2HS_MFighter': 'run',
    'Wait_2HS_MFighter': 'idle',
    'Walk_2HS_MFighter': 'walk',
    'Death_MFighter': 'death',
}

final_actions = {}
for orig_name, target_name in l2_action_map.items():
    if orig_name in bpy.data.actions:
        act = bpy.data.actions[orig_name]
        act.name = target_name
        final_actions[target_name] = act
        print(f"  * L2 Action: {orig_name} -> {target_name}")

# Mixamo retarget map
BONE_MAP = {
    'Bip01_Pelvis': 'mixamorig:Hips',
    'bip01_spine': 'mixamorig:Spine',
    'Bip01_Spine1': 'mixamorig:Spine1',
    'bip01_spine2': 'mixamorig:Spine2',
    'Bip01_Neck': 'mixamorig:Neck',
    'Bip01_head': 'mixamorig:Head',
    'Bip01_L_Clavicle': 'mixamorig:LeftShoulder',
    'Bip01_L_UpperArm': 'mixamorig:LeftArm',
    'Bip01_L_Forearm': 'mixamorig:LeftForeArm',
    'Bip01_L_Hand': 'mixamorig:LeftHand',
    'Bip01_R_Clavicle': 'mixamorig:RightShoulder',
    'Bip01_R_UpperArm': 'mixamorig:RightArm',
    'Bip01_R_Forearm': 'mixamorig:RightForeArm',
    'Bip01_R_Hand': 'mixamorig:RightHand',
    'Bip01_L_Thigh': 'mixamorig:LeftUpLeg',
    'Bip01_L_Calf': 'mixamorig:LeftLeg',
    'bip01_l_foot': 'mixamorig:LeftFoot',
    'Bip01_L_Toe0': 'mixamorig:LeftToeBase',
    'Bip01_R_Thigh': 'mixamorig:RightUpLeg',
    'Bip01_R_Calf': 'mixamorig:RightLeg',
    'bip01_r_foot': 'mixamorig:RightFoot',
    'Bip01_R_Toe0': 'mixamorig:RightToeBase',
}

mixamo_targets = [
    ("roll.fbx", "roll"),
    ("guard.fbx", "guard"),
    ("block_hit.fbx", "block_hit"),
    ("parry.fbx", "parry"),
    ("slash1.fbx", "slash1"),
    ("slash2.fbx", "slash2"),
    ("slash3.fbx", "slash3"),
    ("slash4.fbx", "slash4"),
    ("hit_small.fbx", "hit_small"),
    ("hit_large.fbx", "hit_large"),
]

print(">>> [3/7] Retargeting e Baking das animacoes de combate Dragon Nest...")
for fbx_file, act_name in mixamo_targets:
    fbx_path = os.path.join(mixamo_dir, fbx_file)
    if not os.path.exists(fbx_path):
        print(f"AVISO: {fbx_file} nao encontrado!")
        continue
    
    # Import mixamo FBX
    bpy.ops.import_scene.fbx(filepath=fbx_path)
    mix_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE' and o != master_arm][0]
    
    # Setup constraints
    bpy.context.view_layer.objects.active = master_arm
    bpy.ops.object.mode_set(mode='POSE')
    
    for l2_bone, mix_bone in BONE_MAP.items():
        if l2_bone in master_arm.pose.bones and mix_bone in mix_arm.pose.bones:
            pb = master_arm.pose.bones[l2_bone]
            c = pb.constraints.new('COPY_ROTATION')
            c.target = mix_arm
            c.subtarget = mix_bone
            if l2_bone == 'Bip01_Pelvis':
                cl = pb.constraints.new('COPY_LOCATION')
                cl.target = mix_arm
                cl.subtarget = mix_bone
    
    # Bake
    mix_act = mix_arm.animation_data.action if mix_arm.animation_data else None
    frame_end = int(mix_act.frame_range[1]) if mix_act else 60
    
    bpy.ops.nla.bake(
        frame_start=1,
        frame_end=frame_end,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        bake_types={'POSE'}
    )
    
    bpy.ops.object.mode_set(mode='OBJECT')
    baked_act = master_arm.animation_data.action
    baked_act.name = act_name
    final_actions[act_name] = baked_act
    print(f"  * Baked {act_name} (1..{frame_end} frames)")
    
    # Clean up mixamo armature and objects
    bpy.data.objects.remove(mix_arm, do_unlink=True)

print(f">>> [4/7] Configurando trilhas NLA para exportacao GLB ({len(final_actions)} acoes)...")
if master_arm.animation_data is None:
    master_arm.animation_data_create()

# Clear existing NLA tracks
for tr in list(master_arm.animation_data.nla_tracks):
    master_arm.animation_data.nla_tracks.remove(tr)

for name, act in final_actions.items():
    track = master_arm.animation_data.nla_tracks.new()
    track.name = name
    f_start = int(act.frame_range[0])
    strip = track.strips.new(name, f_start, act)
    strip.action_frame_start = act.frame_range[0]
    strip.action_frame_end = act.frame_range[1]

# Set active action to idle
master_arm.animation_data.action = final_actions.get('idle', None)

print(f">>> [5/7] Exportando GLB Base: {out_glb_base}...")
bpy.ops.export_scene.gltf(
    filepath=out_glb_base,
    export_format='GLB',
    export_animations=True,
    export_nla_strips=True,
    export_skins=True,
    export_morph=True
)
print(">>> SUCESSO: human_fighter.glb exportado com sucesso!")
