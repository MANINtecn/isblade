"""Exporta armas e armaduras por grau (Sem Grau, D e C) para as 3 classes:
- Guardiao: espada 1H + escudo
- Mago: cajado
- Guerreiro: espada 2H
- Armaduras: sets montados no corpo do Human Fighter com animacoes de combate completas

Roda via Blender headless:
blender.exe -b --python exportar_equipamentos_por_grau.py
"""
import bpy, os, sys, glob, shutil

RAIZ = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
CLIENTE = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x"
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
TMP = os.path.join(os.environ.get('TEMP', '.'), 'l2_equip_export')

OUT_PERSONAGENS = os.path.join(RAIZ, 'assets', 'personagens')
OUT_ARMAS = os.path.join(RAIZ, 'assets', 'armas')
os.makedirs(OUT_PERSONAGENS, exist_ok=True)
os.makedirs(OUT_ARMAS, exist_ok=True)

# Habilitar addon PSK/PSA se necessario
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')

# -------------------------------------------------------------
# 1. EXPORTACAO DE ARMAS
# -------------------------------------------------------------
WEAPONS = [
    # Guardiao No-Grade
    ('gladius', 'gladius_m00_wp', 'gladius_t00_wp'),
    ('round_shield', 'round_shield_m00_sh', 'round_shield_t00_sh'),
    # Mago No-Grade
    ('cedar_staff', 'Cedar_staff_m00_wp', 'Cedar_staff_t00_wp'),
    # Guerreiro No-Grade
    ('twohanded_sword', 'twohanded_sword_m00_wp', 'twohanded_sword_t00_sp'),

    # Guardiao D-Grade (bastard_sword e composite_shield ja existem mas garantimos a presenca)
    ('bastard_sword', 'bastard_sword_m00_wp', 'bastard_sword_t00_sp'),
    ('composite_shield', 'composite_shield_m00_sh', 'composite_shield_t00_sh'),
    # Mago D-Grade
    ('ghost_staff', 'ghost_staff_m00_wp', 'ghost_staff_t00_wp'),
    # Guerreiro D-Grade
    ('claymore', 'claymore_m00_wp', 'claymore_t00_sp'),

    # Guardiao C-Grade
    ('samurai_longsword', 'samurai_longsword_m00_wp', 'samurai_longsword_t00_wp'),
    ('full_plate_shield', 'full_plate_shield_m00_sh', 'full_plate_shield_t00_sh'),
    # Mago C-Grade
    ('ghouls_staff', 'ghouls_staff_m00_wp', 'ghouls_staff_t00_wp'),
    # Guerreiro C-Grade
    ('berserker_blade', 'berserker_blade_m00_wp', 'berserker_blade_t00_wp'),
]

def exportar_armas():
    print("=== EXPORTANDO ARMAS ===")
    wp_tmp = os.path.join(TMP, 'weapons')
    os.makedirs(wp_tmp, exist_ok=True)
    import subprocess
    
    # Extrair PSKs e Texturas das armas
    for wid, psk_name, tex_name in WEAPONS:
        print(f"\n--- Arma: {wid} ({psk_name}) ---")
        dest_psk = os.path.join(wp_tmp, psk_name)
        os.makedirs(dest_psk, exist_ok=True)
        subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', f'-obj={psk_name}', 'LineageWeapons.ukx', '-out=' + dest_psk], stdout=subprocess.DEVNULL)
        subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-png', f'-obj={tex_name}', 'LineageWeaponsTex.utx', '-out=' + dest_psk], stdout=subprocess.DEVNULL)
        
        psk_file = glob.glob(os.path.join(dest_psk, '**', f'{psk_name}.psk'), recursive=True)
        png_file = glob.glob(os.path.join(dest_psk, '**', f'{tex_name}.png'), recursive=True)
        if not psk_file:
            print(f"  [ERRO] PSK nao encontrado para {wid}")
            continue
            
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
        bpy.ops.import_scene.psk(filepath=psk_file[0])
        
        # Obter meshes
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
        
        if png_file and meshes:
            mat = bpy.data.materials.new(name=f"Mat_{wid}")
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                tex_img = bpy.data.images.load(png_file[0])
                tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
                tex_node.image = tex_img
                mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
                if 'Metallic' in bsdf.inputs:
                    bsdf.inputs['Metallic'].default_value = 0.75
                if 'Roughness' in bsdf.inputs:
                    bsdf.inputs['Roughness'].default_value = 0.35
            for m in meshes:
                m.data.materials.clear()
                m.data.materials.append(mat)
        
        out_p = os.path.join(OUT_PERSONAGENS, f"{wid}.glb")
        out_a = os.path.join(OUT_ARMAS, f"{wid}.glb")
        bpy.ops.export_scene.gltf(filepath=out_p, export_format='GLB')
        shutil.copyfile(out_p, out_a)
        print(f"  [OK] Exportado: {out_p} ({round(os.path.getsize(out_p)/1024, 1)} KB)")

# -------------------------------------------------------------
# 2. EXPORTACAO DE ARMADURAS (SETS HUMAN FIGHTER)
# -------------------------------------------------------------
ARMOR_SETS = [
    ('human_fighter_nograde', 'No-Grade Leather', 'm001', 't01', 0.2, 0.7),
    ('human_fighter_brigandine', 'D-Grade Brigandine', 'm003', 't19', 0.75, 0.35),
    ('human_fighter_fullplate', 'C-Grade Full Plate', 'm006', 't43', 0.85, 0.30),
]

def exportar_armaduras():
    print("\n=== EXPORTANDO ARMADURAS NO HUMAN FIGHTER ===")
    import subprocess
    base_raw = os.path.join(RAIZ, 'assets', 'personagens', 'raw_fighter')
    mixamo_dir = os.path.join(RAIZ, 'assets', 'mixamo')
    psa_path = os.path.join(base_raw, 'Fighter', 'MeshAnimation', 'MFighter_anim.psa')
    
    # Extrair PSA se nao existir
    if not os.path.exists(psa_path):
        subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', '-obj=MFighter_anim', 'Fighter.ukx', '-out=' + base_raw], stdout=subprocess.DEVNULL)
        psas = glob.glob(os.path.join(base_raw, '**', 'MFighter_anim.psa'), recursive=True)
        if psas: psa_path = psas[0]

    for out_name, label, m_idx, t_idx, metal, rough in ARMOR_SETS:
        print(f"\n--- Montando {label} ({out_name}) ---")
        out_glb = os.path.join(OUT_PERSONAGENS, f"{out_name}.glb")
        set_tmp = os.path.join(TMP, out_name)
        os.makedirs(set_tmp, exist_ok=True)
        
        # Extrair partes do set
        parts = [
            (f"MFighter_{m_idx}_u", "Chest", f"MFighter_{m_idx}_{t_idx}_u_sp.png"),
            (f"MFighter_{m_idx}_l", "Legs", f"MFighter_{m_idx}_{t_idx}_l_sp.png"),
            (f"MFighter_{m_idx}_g", "Gloves", f"MFighter_{m_idx}_{t_idx}_g_sp.png"),
            (f"MFighter_{m_idx}_b", "Boots", f"MFighter_{m_idx}_{t_idx}_b_sp.png"),
            ("MFighter_m000_h", "Hair", "MFighter_m000_t00_m00_bh.png"),
            ("MFighter_m000_f", "Face", "MFighter_m000_t00_f.png"),
        ]
        
        for psk_id, slot_name, tex_id in parts:
            subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', f'-obj={psk_id}', 'Fighter.ukx', '-out=' + set_tmp], stdout=subprocess.DEVNULL)
            # Extrair textura correspondente
            base_tex = tex_id.replace('.png', '')
            subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-png', f'-obj={base_tex}', 'MFighter.utx', '-out=' + set_tmp], stdout=subprocess.DEVNULL)
        
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
        
        created_objects = []
        for psk_id, slot_name, tex_id in parts:
            psk_files = glob.glob(os.path.join(set_tmp, '**', f'{psk_id}.psk'), recursive=True)
            if not psk_files:
                # Fallback para raw_fighter
                psk_files = glob.glob(os.path.join(base_raw, '**', f'{psk_id}.psk'), recursive=True)
            if not psk_files:
                print(f"  [AVISO] PSK {psk_id} nao encontrado")
                continue
            bpy.ops.import_scene.psk(filepath=psk_files[0])
            mesh_obj = [o for o in bpy.data.objects if o.type == 'MESH' and o not in [c[0] for c in created_objects]][0]
            mesh_obj.name = slot_name
            created_objects.append((mesh_obj, slot_name, tex_id))
            
        armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
        if not armatures:
            print("  [ERRO] Nenhuma armadura criada")
            continue
        master_arm = armatures[0]
        master_arm.name = "HumanFighter_Armature"
        
        for mesh_obj, slot_name, tex_id in created_objects:
            for mod in mesh_obj.modifiers:
                if mod.type == 'ARMATURE':
                    mod.object = master_arm
            mesh_obj.parent = master_arm
            
            mat = bpy.data.materials.new(name=f"Mat_{slot_name}")
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            
            base_tex = tex_id.replace('.png', '')
            tex_files = glob.glob(os.path.join(set_tmp, '**', f'{base_tex}.png'), recursive=True)
            if not tex_files:
                # fallback textures in raw_fighter
                tex_files = glob.glob(os.path.join(base_raw, '**', f'{base_tex}.png'), recursive=True)
            if not tex_files:
                # busca generica
                tex_files = glob.glob(os.path.join(set_tmp, '**', f'*{slot_name.lower()}*.png'), recursive=True)
                
            if tex_files and bsdf:
                tex_img = bpy.data.images.load(tex_files[0])
                tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
                tex_node.image = tex_img
                mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
                if slot_name in ('Chest', 'Legs', 'Gloves', 'Boots'):
                    if 'Metallic' in bsdf.inputs:
                        bsdf.inputs['Metallic'].default_value = metal
                    if 'Roughness' in bsdf.inputs:
                        bsdf.inputs['Roughness'].default_value = rough
                else:
                    if 'Roughness' in bsdf.inputs:
                        bsdf.inputs['Roughness'].default_value = 0.55
            mesh_obj.data.materials.clear()
            mesh_obj.data.materials.append(mat)
            
        for extra_arm in armatures[1:]:
            bpy.data.objects.remove(extra_arm, do_unlink=True)
            
        # Carregar animacoes nativas do L2
        if os.path.exists(psa_path):
            bpy.context.view_layer.objects.active = master_arm
            master_arm.select_set(True)
            getattr(bpy.ops.psa_import, 'import')(filepath=psa_path)
            
        final_actions = {}
        l2_action_map = {
            'Run_2HS_MFighter': 'run',
            'Wait_2HS_MFighter': 'idle',
            'Walk_2HS_MFighter': 'walk',
            'Death_MFighter': 'death',
        }
        for orig_name, target_name in l2_action_map.items():
            if orig_name in bpy.data.actions:
                act = bpy.data.actions[orig_name]
                act.name = target_name
                final_actions[target_name] = act
                
        # Retarget de acoes Mixamo
        BONE_MAP = {
            'Bip01_Pelvis': 'mixamorig:Hips', 'bip01_spine': 'mixamorig:Spine',
            'Bip01_Spine1': 'mixamorig:Spine1', 'bip01_spine2': 'mixamorig:Spine2',
            'Bip01_Neck': 'mixamorig:Neck', 'Bip01_head': 'mixamorig:Head',
            'Bip01_L_Clavicle': 'mixamorig:LeftShoulder', 'Bip01_L_UpperArm': 'mixamorig:LeftArm',
            'Bip01_L_Forearm': 'mixamorig:LeftForeArm', 'Bip01_L_Hand': 'mixamorig:LeftHand',
            'Bip01_R_Clavicle': 'mixamorig:RightShoulder', 'Bip01_R_UpperArm': 'mixamorig:RightArm',
            'Bip01_R_Forearm': 'mixamorig:RightForeArm', 'Bip01_R_Hand': 'mixamorig:RightHand',
            'Bip01_L_Thigh': 'mixamorig:LeftUpLeg', 'Bip01_L_Calf': 'mixamorig:LeftLeg',
            'bip01_l_foot': 'mixamorig:LeftFoot', 'Bip01_L_Toe0': 'mixamorig:LeftToeBase',
            'Bip01_R_Thigh': 'mixamorig:RightUpLeg', 'Bip01_R_Calf': 'mixamorig:RightLeg',
            'bip01_r_foot': 'mixamorig:RightFoot', 'Bip01_R_Toe0': 'mixamorig:RightToeBase',
        }
        mixamo_targets = [
            ("roll.fbx", "roll"), ("guard.fbx", "guard"),
            ("block_hit.fbx", "block_hit"), ("parry.fbx", "parry"),
            ("slash1.fbx", "slash1"), ("slash2.fbx", "slash2"),
            ("slash3.fbx", "slash3"), ("slash4.fbx", "slash4"),
            ("hit_small.fbx", "hit_small"), ("hit_large.fbx", "hit_large"),
        ]
        for fbx_file, act_name in mixamo_targets:
            fbx_path = os.path.join(mixamo_dir, fbx_file)
            if not os.path.exists(fbx_path): continue
            bpy.ops.import_scene.fbx(filepath=fbx_path)
            mix_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE' and o != master_arm][0]
            bpy.context.view_layer.objects.active = master_arm
            bpy.ops.object.mode_set(mode='POSE')
            for l2_bone, mix_bone in BONE_MAP.items():
                if l2_bone in master_arm.pose.bones and mix_bone in mix_arm.pose.bones:
                    pb = master_arm.pose.bones[l2_bone]
                    c = pb.constraints.new('COPY_ROTATION')
                    c.target = mix_arm; c.subtarget = mix_bone
                    if l2_bone == 'Bip01_Pelvis':
                        cl = pb.constraints.new('COPY_LOCATION')
                        cl.target = mix_arm; cl.subtarget = mix_bone
            mix_act = mix_arm.animation_data.action if mix_arm.animation_data else None
            frame_end = int(mix_act.frame_range[1]) if mix_act else 60
            bpy.ops.nla.bake(frame_start=1, frame_end=frame_end, only_selected=False, visual_keying=True, clear_constraints=True, bake_types={'POSE'})
            bpy.ops.object.mode_set(mode='OBJECT')
            baked_act = master_arm.animation_data.action
            baked_act.name = act_name
            final_actions[act_name] = baked_act
            bpy.data.objects.remove(mix_arm, do_unlink=True)
            
        if master_arm.animation_data is None: master_arm.animation_data_create()
        for tr in list(master_arm.animation_data.nla_tracks): master_arm.animation_data.nla_tracks.remove(tr)
        for name, act in final_actions.items():
            track = master_arm.animation_data.nla_tracks.new()
            track.name = name
            strip = track.strips.new(name, int(act.frame_range[0]), act)
            strip.action_frame_start = act.frame_range[0]
            strip.action_frame_end = act.frame_range[1]
            
        master_arm.animation_data.action = final_actions.get('idle', None)
        bpy.ops.export_scene.gltf(
            filepath=out_glb,
            export_format='GLB',
            export_animations=True,
            export_nla_strips=True,
            export_skins=True
        )
        print(f"  [OK] Set exportado: {out_glb} ({round(os.path.getsize(out_glb)/1024, 1)} KB)")

if __name__ == '__main__':
    exportar_armas()
    exportar_armaduras()
    print("\n=== TODOS OS EQUIPAMENTOS E SETS FORAM EXPORTADOS COM SUCESSO! ===")

