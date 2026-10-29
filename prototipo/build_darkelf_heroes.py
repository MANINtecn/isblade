import bpy
import bmesh
import mathutils
import os
import struct

out_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens"
raw_base = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_test_darkelf"

tex_roots = [
    os.path.join(raw_base, "textures"),
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_tex_all",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_roster_extra"
]

def find_texture(name):
    if not name: return None
    for root_dir in tex_roots:
        for r, d, files in os.walk(root_dir):
            for f in files:
                if f.lower() == name.lower():
                    return os.path.join(r, f)
    return None

def get_psa_rates(path):
    if not os.path.exists(path): return {}
    with open(path, 'rb') as f: data = f.read()
    rates = {}
    pos = 0
    while pos < len(data):
        if pos + 32 > len(data): break
        tag, type_flag, data_size, data_count = struct.unpack('20sIII', data[pos:pos+32])
        tag = tag.rstrip(b'\x00').decode('latin1', errors='ignore')
        pos += 32
        if tag == 'ANIMINFO':
            for i in range(data_count):
                c = data[pos + i*data_size : pos + (i+1)*data_size]
                name = c[:64].rstrip(b'\x00').decode('latin1')
                floats = struct.unpack('10f', c[128:168])
                anim_rate = floats[6]
                if anim_rate > 0:
                    rates[name] = anim_rate
            break
        pos += data_size * data_count
    return rates

def get_action_fcurves(act):
    fcurves = []
    if hasattr(act, 'fcurves'):
        return list(act.fcurves)
    if hasattr(act, 'layers'):
        for layer in act.layers:
            for strip in layer.strips:
                for bag in getattr(strip, 'channelbags', []):
                    fcurves.extend(list(bag.fcurves))
    return fcurves

DARKELF_CONFIGS = [
    {
        'id': 'darkelf_m',
        'out_glb': os.path.join(out_dir, 'darkelf_m.glb'),
        'psa_path': os.path.join(raw_base, 'DarkElf', 'MeshAnimation', 'MDarkElf_anim.psa'),
        'suffix': '_MDarkElf',
        'parts': [
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'MDarkElf_m011_u.psk'), 'Chest', 'MDarkelf_m011_t2000_u_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'MDarkElf_m011_l.psk'), 'Legs', 'MDarkelf_m011_t2000_l_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'MDarkElf_m011_g.psk'), 'Gloves', 'MDarkelf_m011_t2000_g_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'MDarkElf_m011_b.psk'), 'Boots', 'MDarkelf_m011_t2000_b_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'MDarkElf_m001_m00_ah.psk'), 'Hair_Front', 'MDarkElf_m001_t00_m00_ah_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'MDarkElf_m001_m00_bh.psk'), 'Hair_Back', 'MDarkElf_m001_t00_m00_bh.png'),
        ],
        'teacher_psk': os.path.join(raw_base, 'LineageNpcs', 'SkeletalMesh', 'a_fighterguild_teacher_MDarkElf_m00.psk'),
        'face_tex': 'MDarkElf_m000_t00_f.png',
        # Calibrated 3D offset to align teacher Face mesh with MDarkElf_m001_m00_bh hairline & ears
        'face_offset': mathutils.Vector((0.0, 0.0, -0.45))
    },
    {
        'id': 'darkelf_f',
        'out_glb': os.path.join(out_dir, 'darkelf_f.glb'),
        'psa_path': os.path.join(raw_base, 'DarkElf', 'MeshAnimation', 'FDarkElf_anim.psa'),
        'suffix': '_FDarkElf',
        'parts': [
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'FDarkElf_m011_u.psk'), 'Chest', 'FDarkelf_m011_t2000_u_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'FDarkElf_m011_l.psk'), 'Legs', 'FDarkelf_m011_t2000_l_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'FDarkElf_m011_g.psk'), 'Gloves', 'FDarkelf_m011_t2000_g_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'FDarkElf_m011_b.psk'), 'Boots', 'FDarkelf_m011_t2000_b_ori.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'FDarkElf_m000_m00_ah_u00.psk'), 'Hair_Front', 'FDarkElf_m000_t00_m00_ah_u00.png'),
            (os.path.join(raw_base, 'DarkElf', 'SkeletalMesh', 'FDarkElf_m000_m00_bh_u00.psk'), 'Hair_Back', 'FDarkElf_m000_t00_m00_bh_u00.png'),
        ],
        'teacher_psk': os.path.join(raw_base, 'LineageNpcs', 'SkeletalMesh', 'a_fighterguild_teacher_FDarkElf_m00.psk'),
        'face_tex': 'FDarkElf_m000_t00_f.png',
        # Exact Bip01_head delta between FDarkElf player skeleton and FDarkElf teacher skeleton
        'face_offset': mathutils.Vector((0.0, -0.5023, 1.7587))
    }
]

for cfg in DARKELF_CONFIGS:
    race_id = cfg['id']
    print(f"\n=======================================================")
    print(f"       CONSTRUINDO DARK ELF: {race_id.upper()}")
    print(f"=======================================================")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    for img in list(bpy.data.images): bpy.data.images.remove(img)

    created_meshes = []
    for psk_path, nice_name, tex_name in cfg['parts']:
        if not os.path.exists(psk_path):
            print(f"  [ERRO] PSK nao encontrado: {psk_path}")
            continue

        bpy.ops.import_scene.psk(filepath=psk_path)
        mesh_obj = [o for o in bpy.data.objects if o.type == 'MESH' and o not in [c[0] for c in created_meshes]][0]
        mesh_obj.name = nice_name
        created_meshes.append((mesh_obj, nice_name, tex_name))

    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not armatures:
        print(f"  [ERRO] Nenhuma armadura encontrada para {race_id}")
        continue
    master_arm = armatures[0]
    master_arm.name = f"{race_id.upper()}_Armature"

    # Extract the Face from teacher
    teacher_psk = cfg['teacher_psk']
    if os.path.exists(teacher_psk):
        pre_objs = set(bpy.data.objects)
        bpy.ops.import_scene.psk(filepath=teacher_psk)
        new_objs = [o for o in bpy.data.objects if o not in pre_objs]
        t_mesh = [o for o in new_objs if o.type == 'MESH'][0]
        t_arm = [o for o in new_objs if o.type == 'ARMATURE'][0]

        offset = cfg['face_offset']

        # Extract slot 2 faces (the face)
        bm = bmesh.new()
        bm.from_mesh(t_mesh.data)
        faces_to_del = [f for f in bm.faces if f.material_index != 2]
        bmesh.ops.delete(bm, geom=faces_to_del, context='FACES')
        verts_to_del = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=verts_to_del, context='VERTS')

        # Apply calibrated offset to match master head & hairline position
        bmesh.ops.translate(bm, vec=offset, verts=bm.verts)

        face_mesh_data = bpy.data.meshes.new(f'{race_id}_Face_Mesh')
        bm.to_mesh(face_mesh_data)
        bm.free()

        face_obj = bpy.data.objects.new('Face', face_mesh_data)
        bpy.context.collection.objects.link(face_obj)
        created_meshes.append((face_obj, 'Face', cfg['face_tex']))

        # Delete teacher temporary objects
        bpy.data.objects.remove(t_mesh, do_unlink=True)
        bpy.data.objects.remove(t_arm, do_unlink=True)

    # Clean up extra armatures
    for extra_arm in [o for o in bpy.data.objects if o.type == 'ARMATURE' and o != master_arm]:
        bpy.data.objects.remove(extra_arm, do_unlink=True)

    # Bind and skin all meshes to master armature
    for mesh_obj, nice_name, tex_name in created_meshes:
        has_arm_mod = False
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE':
                mod.object = master_arm
                has_arm_mod = True
        if not has_arm_mod:
            mod = mesh_obj.modifiers.new(name='Armature', type='ARMATURE')
            mod.object = master_arm

        mesh_obj.parent = master_arm

        if "Face" in nice_name or "Hair" in nice_name:
            mesh_obj.vertex_groups.clear()
            head_grp = mesh_obj.vertex_groups.new(name="Bip01_head")
            all_verts = [v.index for v in mesh_obj.data.vertices]
            head_grp.add(all_verts, 1.0, 'REPLACE')

        mat = bpy.data.materials.new(name=f"Mat_{nice_name}_{race_id}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")

        tex_path = find_texture(tex_name)
        if not tex_path:
            alt_name = tex_name.replace('_u00', '').replace('_ori', '')
            tex_path = find_texture(alt_name)

        if tex_path and bsdf:
            tex_img = bpy.data.images.load(tex_path)
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = tex_img
            mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])

            if "Hair" in nice_name:
                # Blender 5.1 glTF 2.0 exporter requires a Math GREATER_THAN node on Alpha to export alphaMode = 'MASK'
                math_node = mat.node_tree.nodes.new('ShaderNodeMath')
                math_node.operation = 'GREATER_THAN'
                math_node.inputs[1].default_value = 0.5
                mat.node_tree.links.new(math_node.inputs[0], tex_node.outputs['Alpha'])
                mat.node_tree.links.new(bsdf.inputs['Alpha'], math_node.outputs['Value'])
                mat.surface_render_method = 'DITHERED'
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = 0.55

        mesh_obj.data.materials.clear()
        mesh_obj.data.materials.append(mat)

    bpy.context.scene.render.fps = 30
    bpy.context.view_layer.objects.active = master_arm
    master_arm.select_set(True)

    psa_path = cfg['psa_path']
    if not os.path.exists(psa_path):
        print(f"  [ERRO] PSA nao encontrado: {psa_path}")
        continue

    psa_rates = get_psa_rates(psa_path)
    psa_import_fn = getattr(bpy.ops.psa_import, 'import')
    psa_import_fn(filepath=psa_path)

    sfx = cfg['suffix']
    action_map = {
        f'Wait_2HS{sfx}': 'idle',
        f'Run_2HS{sfx}': 'run',
        f'Walk_2HS{sfx}': 'walk',
        f'Death{sfx}': 'death',
        f'Atk01_2HS{sfx}': 'slash1',
        f'Atk02_2HS{sfx}': 'slash2',
        f'SpAtk01_2HS{sfx}': 'slash4',
        f'AtkWait_2HS{sfx}': 'guard',
        f'Wait_Hand{sfx}': 'idle_hand',
        f'Run_Hand{sfx}': 'run_hand',
        f'Walk_Hand{sfx}': 'walk_hand',
        f'Atk01_Hand{sfx}': 'punch',
        f'SpAtk02_1HS{sfx}': 'roll'
    }

    alt_fallbacks = {
        'idle': [f'Wait_1HS{sfx}', f'Wait_Dual{sfx}', f'Wait_Pole{sfx}'],
        'run': [f'Run_1HS{sfx}', f'Run_Dual{sfx}'],
        'walk': [f'Walk_1HS{sfx}', f'Walk_Dual{sfx}'],
        'guard': [f'AtkWait_1HS{sfx}', f'AtkWait_Dual{sfx}'],
        'slash4': [f'SpAtk02_2HS{sfx}', f'SpAtk01_1HS{sfx}', f'SpAtk02_Bow{sfx}'],
        'roll': [f'SpAtk11_2HS{sfx}', f'SpAtk11_1HS{sfx}', f'SpAtk02_Bow{sfx}']
    }

    final_actions = {}
    for orig_name, target_name in action_map.items():
        chosen_act = None
        orig_key = orig_name
        if orig_name in bpy.data.actions:
            chosen_act = bpy.data.actions[orig_name]
        elif target_name in alt_fallbacks:
            for fb in alt_fallbacks[target_name]:
                if fb in bpy.data.actions:
                    chosen_act = bpy.data.actions[fb]
                    orig_key = fb
                    break

        if chosen_act:
            chosen_act.name = target_name
            native_fps = psa_rates.get(orig_key, 30.0)
            scale_factor = 30.0 / native_fps
            for fc in get_action_fcurves(chosen_act):
                for kp in fc.keyframe_points:
                    kp.co[0] *= scale_factor
                    kp.handle_left[0] *= scale_factor
                    kp.handle_right[0] *= scale_factor
            final_actions[target_name] = chosen_act

    print(f"  * {len(final_actions)} acoes canonicas calibradas com precisao:")
    for k, a in final_actions.items():
        dur = (a.frame_range[1] - a.frame_range[0]) / 30.0
        print(f"    - {k:12}: {dur:.3f}s")

    for a in list(bpy.data.actions):
        if a not in final_actions.values():
            bpy.data.actions.remove(a)

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

    out_glb = cfg['out_glb']
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        export_animations=True,
        export_nla_strips=True,
        export_skins=True
    )
    print(f"  >>> SUCESSO: Gerado {out_glb} ({os.path.getsize(out_glb)} bytes)")

print("\n=======================================================")
print("  >>> DARK ELVES CONSTRUÍDOS COM SUCESSO TOTAL!")
print("=======================================================")
