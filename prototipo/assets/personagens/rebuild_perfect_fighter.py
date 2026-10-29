import bpy
import os

base_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter"
psk_dir = os.path.join(base_dir, "Fighter", "SkeletalMesh")
tex_dir = os.path.join(base_dir, "textures", "MFighter", "Texture")
psa_path = os.path.join(base_dir, "Fighter", "MeshAnimation", "MFighter_anim.psa")

wp_psk = os.path.join(base_dir, "LineageWeapons", "SkeletalMesh", "dragon_slayer_m00_wp.psk")
wp_diff = os.path.join(base_dir, "LineageWeaponsTex", "Texture", "dragon_slayer_t00_wp_ori.png")
wp_spec = os.path.join(base_dir, "LineageWeaponsTex", "Texture", "dragon_slayer_t00_sp.png")
out_wp_glb = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\dragon_slayer.glb"

out_fighter_glb = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\human_fighter.glb"
out_imperial_glb = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\human_fighter_imperial.glb"

# ==================== 1. Export Dragon Slayer ====================
print(">>> [1/3] Exportando Dragon Slayer com textura original e specular...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

bpy.ops.import_scene.psk(filepath=wp_psk)
wp_obj = [o for o in bpy.data.objects if o.type == 'MESH'][0]
wp_obj.name = "DragonSlayer"

mat_wp = bpy.data.materials.new(name="Mat_DragonSlayer")
mat_wp.use_nodes = True
bsdf = mat_wp.node_tree.nodes.get("Principled BSDF")

if os.path.exists(wp_diff) and bsdf:
    tex_diff = bpy.data.images.load(wp_diff)
    diff_node = mat_wp.node_tree.nodes.new('ShaderNodeTexImage')
    diff_node.image = tex_diff
    mat_wp.node_tree.links.new(bsdf.inputs['Base Color'], diff_node.outputs['Color'])

if os.path.exists(wp_spec) and bsdf:
    tex_spec = bpy.data.images.load(wp_spec)
    spec_node = mat_wp.node_tree.nodes.new('ShaderNodeTexImage')
    spec_node.image = tex_spec
    if 'Metallic' in bsdf.inputs:
        mat_wp.node_tree.links.new(bsdf.inputs['Metallic'], spec_node.outputs['Color'])
    if 'Roughness' in bsdf.inputs:
        bsdf.inputs['Roughness'].default_value = 0.28

wp_obj.data.materials.clear()
wp_obj.data.materials.append(mat_wp)

bpy.ops.export_scene.gltf(filepath=out_wp_glb, export_format='GLB')
print("Dragon Slayer exportada com perfeicao!")


# ==================== 2. Export Personagens L2 ====================
def build_character(model_type, out_glb):
    print(f">>> Construindo {model_type} -> {out_glb}...")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)

    if model_type == 'starter':
        parts = [
            ("MFighter_m000_u", "Chest", "MFighter_m000_t1000_u.png", False, None),
            ("MFighter_m000_l", "Legs", "MFighter_m000_t1000_l.png", False, None),
            ("MFighter_m000_g", "Gloves", "MFighter_m000_t1000_g.png", False, None),
            ("MFighter_m000_b", "Boots", "MFighter_m000_t1000_b.png", False, None),
            ("MFighter_m000_f", "Face", "MFighter_m000_t00_f.png", False, None),
            ("MFighter_m000_m00_ah", "Hair_Front", "MFighter_m000_t00_m00_ah_ori.png", False, None),
            ("MFighter_m000_m00_bh", "Hair_Back", "MFighter_m000_t00_m00_bh.png", False, None)
        ]
    else: # imperial oficial: m012_u, m009_l, m012_g, m009_b
        parts = [
            ("MFighter_m012_u", "Chest_Imperial", "MFighter_m012_t88_u_ori.png", True, "MFighter_m012_t88_u_sp.png"),
            ("MFighter_m009_l", "Legs_Imperial", "MFighter_m009_t88_l_ori.png", True, "MFighter_m009_t88_l_sp.png"),
            ("MFighter_m012_g", "Gloves_Imperial", "MFighter_m012_t88_g_ori.png", True, "MFighter_m012_t88_g_sp.png"),
            ("MFighter_m009_b", "Boots_Imperial", "MFighter_m009_t88_b_ori.png", True, "MFighter_m009_t88_b_sp.png"),
            ("MFighter_m000_f", "Face", "MFighter_m000_t00_f.png", False, None),
            ("MFighter_m000_m00_ah", "Hair_Front", "MFighter_m000_t00_m00_ah_ori.png", False, None),
            ("MFighter_m000_m00_bh", "Hair_Back", "MFighter_m000_t00_m00_bh.png", False, None)
        ]

    created = []
    for psk_name, nice_name, tex_diff_name, is_metal, tex_spec_name in parts:
        psk_file = os.path.join(psk_dir, f"{psk_name}.psk")
        bpy.ops.import_scene.psk(filepath=psk_file)
        mesh_obj = [o for o in bpy.data.objects if o.type == 'MESH' and o not in [c[0] for c in created]][0]
        mesh_obj.name = nice_name
        created.append((mesh_obj, nice_name, tex_diff_name, is_metal, tex_spec_name))

    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    master_arm = armatures[0]
    master_arm.name = "HumanFighter_Armature"

    for mesh_obj, nice_name, tex_diff_name, is_metal, tex_spec_name in created:
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE':
                mod.object = master_arm
        mesh_obj.parent = master_arm

        # CRITICAL FIX FOR HEAD BINDING:
        # Rebind Face, Hair_Front, and Hair_Back to Bip01_head so they move 100% in sync with the head bone!
        if nice_name in ["Face", "Hair_Front", "Hair_Back"]:
            mesh_obj.vertex_groups.clear()
            head_grp = mesh_obj.vertex_groups.new(name="Bip01_head")
            all_verts = [v.index for v in mesh_obj.data.vertices]
            head_grp.add(all_verts, 1.0, 'REPLACE')

        mat = bpy.data.materials.new(name=f"Mat_{nice_name}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")

        # Diffuse
        tpath = os.path.join(tex_dir, tex_diff_name)
        tex_node = None
        if os.path.exists(tpath) and bsdf:
            tex_img = bpy.data.images.load(tpath)
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = tex_img
            mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])

        # Alpha clip for hair strands
        if "Hair" in nice_name and bsdf and tex_node:
            mat.node_tree.links.new(bsdf.inputs['Alpha'], tex_node.outputs['Alpha'])
            mat.blend_method = 'CLIP'
            mat.alpha_threshold = 0.5

        # Specular / Metallic
        if tex_spec_name:
            spath = os.path.join(tex_dir, tex_spec_name)
            if os.path.exists(spath) and bsdf:
                spec_img = bpy.data.images.load(spath)
                spec_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
                spec_node.image = spec_img
                if 'Metallic' in bsdf.inputs:
                    mat.node_tree.links.new(bsdf.inputs['Metallic'], spec_node.outputs['Color'])
                if 'Roughness' in bsdf.inputs:
                    bsdf.inputs['Roughness'].default_value = 0.32

        if is_metal and not tex_spec_name and bsdf:
            if 'Metallic' in bsdf.inputs:
                bsdf.inputs['Metallic'].default_value = 0.85
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = 0.32
        elif not is_metal and bsdf:
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = 0.65

        mesh_obj.data.materials.clear()
        mesh_obj.data.materials.append(mat)

    for extra_arm in armatures[1:]:
        bpy.data.objects.remove(extra_arm, do_unlink=True)

    # Import PSA with canonical SCENE framerate (30 fps) to prevent hyper-accelerated GM animations
    bpy.context.scene.render.fps = 30
    if hasattr(bpy.context.scene, 'psa_import'):
        bpy.context.scene.psa_import.fps_source = 'SCENE'

    bpy.context.view_layer.objects.active = master_arm
    master_arm.select_set(True)
    psa_import_fn = getattr(bpy.ops.psa_import, 'import')
    psa_import_fn(filepath=psa_path)

    # NATIVE COMBAT & LOCOMOTION ANIMATIONS
    actions_map = {
        'Wait_2HS_MFighter': 'idle',
        'Run_2HS_MFighter': 'run',
        'Walk_2HS_MFighter': 'walk',
        'Death_MFighter': 'death',
        # Combo 4 hits:
        'Atk01_2HS_MFighter': 'slash1',
        'Atk02_2HS_MFighter': 'slash2',
        'Atk03_2HS_MFighter': 'slash3',
        'SpAtk01_2HS_MFighter': 'slash4',
        # Dodge Rush:
        'SpAtk11_2HS_MFighter': 'roll',
        # Bloqueio com espada erguida na frente:
        'AtkWait_2HS_MFighter': 'guard',
        'SpAtk07_2HS_MFighter': 'block_hit',
        # Parry:
        'SpAtk18_2HS_MFighter': 'parry',
        'Social_unaware_MFighter': 'hit_small',
        'Falling_MFighter': 'hit_large',
        # Desarmado / Punhos:
        'Wait_Hand_MFighter': 'idle_hand',
        'Run_Hand_MFighter': 'run_hand',
        'Walk_Hand_MFighter': 'walk_hand',
        'Atk01_Hand_MFighter': 'punch'
    }

    final_actions = {}
    for orig_name, target_name in actions_map.items():
        if orig_name in bpy.data.actions:
            act = bpy.data.actions[orig_name]
            act.name = target_name
            final_actions[target_name] = act

    if master_arm.animation_data is None:
        master_arm.animation_data_create()

    for tr in list(master_arm.animation_data.nla_tracks):
        master_arm.animation_data.nla_tracks.remove(tr)

    for name, act in final_actions.items():
        track = master_arm.animation_data.nla_tracks.new()
        track.name = name
        f_start = int(act.frame_range[0])
        strip = track.strips.new(name, f_start, act)
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
    print(f"Exportacao concluida com sucesso para {out_glb}!")

# Export starter e imperial
build_character('starter', out_fighter_glb)
build_character('imperial', out_imperial_glb)
print(">>> TODOS OS MODELOS E ARMAS FORAM RECONSTRUÍDOS COM PERFEIÇÃO!")
