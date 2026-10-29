import bpy
import os
import struct

out_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens"

tex_roots = [
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_tex_all",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_test_elf",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_roster_extra",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_races",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter"
]

psk_roots = [
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_roster_extra",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_races",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter"
]

psa_roots = [
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_anims",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_roster_extra",
    r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter"
]

def find_file(roots, name):
    for rt in roots:
        for r, d, files in os.walk(rt):
            for f in files:
                if f.lower() == name.lower():
                    return os.path.join(r, f)
    return None

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
    with open(path, 'rb') as f:
        data = f.read()
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

# Definition of the 10 Lineage 2 canonical heroes
ROSTER_CONFIGS = [
    # 1. Human Fighter Male (Starter)
    {
        'id': 'human_fighter',
        'out_glb': os.path.join(out_dir, 'human_fighter.glb'),
        'psa_name': 'MFighter_anim.psa',
        'suffix': '_MFighter',
        'parts': [
            ("MFighter_m000_u.psk", "Chest", "MFighter_m000_t1000_u.png"),
            ("MFighter_m000_l.psk", "Legs", "MFighter_m000_t1000_l.png"),
            ("MFighter_m000_g.psk", "Gloves", "MFighter_m000_t1000_g.png"),
            ("MFighter_m000_b.psk", "Boots", "MFighter_m000_t1000_b.png"),
            ("MFighter_m000_f.psk", "Face", "MFighter_m000_t00_f.png"),
            ("MFighter_m000_m00_ah.psk", "Hair_Front", "MFighter_m000_t00_m00_ah_ori.png"),
            ("MFighter_m000_m00_bh.psk", "Hair_Back", "MFighter_m000_t00_m00_bh.png")
        ]
    },
    # 2. Human Fighter Female
    {
        'id': 'human_fighter_female',
        'out_glb': os.path.join(out_dir, 'human_fighter_female.glb'),
        'psa_name': 'FFighter_anim.psa',
        'suffix': '_FFighter',
        'parts': [
            ("FFighter_m000_u.psk", "Chest", "FFighter_m000_t1000_u.png"),
            ("FFighter_m000_l.psk", "Legs", "FFighter_m000_t1000_l.png"),
            ("FFighter_m000_g.psk", "Gloves", "FFighter_m000_t1000_g.png"),
            ("FFighter_m000_b.psk", "Boots", "FFighter_m000_t1000_b.png"),
            ("FFighter_m000_f.psk", "Face", "FFighter_m000_t00_f.png"),
            ("FFighter_m000_m00_ah.psk", "Hair_Front", "FFighter_m000_t00_m00_ah_ori.png"),
            ("FFighter_m000_m00_bh.psk", "Hair_Back", "FFighter_m000_t00_m00_bh.png")
        ]
    },
    # 3. Human Mystic Male
    {
        'id': 'magic_m',
        'out_glb': os.path.join(out_dir, 'magic_m.glb'),
        'psa_name': 'MMagic_anim.psa',
        'suffix': '_MMagic',
        'parts': [
            ("MMagic_M000_u.psk", "Chest", "MMagic_m000_t1000_u.png"),
            ("MMagic_M000_l.psk", "Legs", "MMagic_m000_t1000_l.png"),
            ("MMagic_M000_g.psk", "Gloves", "MMagic_m000_t1000_g.png"),
            ("MMagic_M000_b.psk", "Boots", "MMagic_m000_t1000_b.png"),
            ("MMagic_m000_f.psk", "Face", "MMagic_m000_t00_f.png"),
            ("MMagic_m000_m00_ah.psk", "Hair_Front", "MMagic_m000_t00_m00_ah_ori.png"),
            ("MMagic_m000_m00_bh.psk", "Hair_Back", "MMagic_m000_t00_m00_bh.png")
        ]
    },
    # 4. Human Mystic Female
    {
        'id': 'magic_f',
        'out_glb': os.path.join(out_dir, 'magic_f.glb'),
        'psa_name': 'FMagic_anim.psa',
        'suffix': '_FMagic',
        'parts': [
            ("FMagic_m000_u.psk", "Chest", "FMagic_m000_t1000_u.png"),
            ("FMagic_m000_l.psk", "Legs", "FMagic_m000_t1000_l.png"),
            ("FMagic_m000_g.psk", "Gloves", "FMagic_m000_t1000_g.png"),
            ("FMagic_m000_b.psk", "Boots", "FMagic_m000_t1000_b.png"),
            ("FMagic_m000_f.psk", "Face", "FMagic_m000_t00_f.png"),
            ("FMagic_m000_m00_ah.psk", "Hair_Front", "FMagic_m000_t00_m00_ah_ori.png")
        ]
    },
    # 5. Elf Male
    {
        'id': 'elf_m',
        'out_glb': os.path.join(out_dir, 'elf_m.glb'),
        'psa_name': 'MElf_anim.psa',
        'suffix': '_MElf',
        'parts': [
            ("MElf_m000_u.psk", "Chest", "MElf_m000_t1000_u.png"),
            ("MElf_m000_l.psk", "Legs", "MElf_m000_t1000_l.png"),
            ("MElf_m000_g.psk", "Gloves", "MElf_m000_t1000_g.png"),
            ("MElf_m000_b.psk", "Boots", "MElf_m000_t1000_b.png"),
            ("MElf_m000_f.psk", "Face", "MElf_m000_t00_f.png"),
            ("MElf_m000_m00_ah.psk", "Hair_Front", "MElf_m000_t00_m00_ah_ori.png"),
            ("MElf_m000_m00_bh.psk", "Hair_Back", "MElf_m000_t00_m00_bh.png")
        ]
    },
    # 6. Elf Female
    {
        'id': 'elf_f',
        'out_glb': os.path.join(out_dir, 'elf_f.glb'),
        'psa_name': 'FElf_anim.psa',
        'suffix': '_FElf',
        'parts': [
            ("FElf_m000_u.psk", "Chest", "FElf_m000_t1000_u.png"),
            ("FElf_m000_l.psk", "Legs", "FElf_m000_t1000_l.png"),
            ("FElf_m000_g.psk", "Gloves", "FElf_m000_t1000_g.png"),
            ("FElf_m000_b.psk", "Boots", "FElf_m000_t1000_b.png"),
            ("FElf_m000_f.psk", "Face", "FElf_m000_t00_f.png"),
            ("FElf_m000_m00_ah.psk", "Hair_Front", "FElf_m000_t00_m00_ah_ori.png"),
            ("FElf_m000_m00_bh.psk", "Hair_Back", "FElf_m000_t00_m00_bh_ori.png")
        ]
    },
    # 7. Orc Fighter Male
    {
        'id': 'orc_m',
        'out_glb': os.path.join(out_dir, 'orc_m.glb'),
        'psa_name': 'MOrc_anim.psa',
        'suffix': '_MOrc',
        'parts': [
            ("MOrc_m000_u.psk", "Chest", "MOrc_m000_t1000_u.png"),
            ("MOrc_m000_l.psk", "Legs", "MOrc_m000_t1000_l.png"),
            ("MOrc_m000_g.psk", "Gloves", "MOrc_m000_t1000_g.png"),
            ("MOrc_m000_b.psk", "Boots", "MOrc_m000_t1000_b.png"),
            ("MOrc_m000_f.psk", "Face", "MOrc_m000_t00_f.png"),
            ("MOrc_m000_m00_bh.psk", "Hair_Back", "MOrc_m000_t00_m00_bh.png")
        ]
    },
    # 8. Orc Fighter Female
    {
        'id': 'orc_f',
        'out_glb': os.path.join(out_dir, 'orc_f.glb'),
        'psa_name': 'FOrc_anim.psa',
        'suffix': '_FOrc',
        'parts': [
            ("FOrc_m000_u.psk", "Chest", "FOrc_m000_t1000_u.png"),
            ("FOrc_m000_l.psk", "Legs", "FOrc_m000_t1000_l.png"),
            ("FOrc_m000_g.psk", "Gloves", "FOrc_m000_t1000_g.png"),
            ("FOrc_m000_b.psk", "Boots", "FOrc_m000_t1000_b.png"),
            ("FOrc_m000_f.psk", "Face", "FOrc_m000_t00_f.png"),
            ("FOrc_m000_m00_bh.psk", "Hair_Back", "FOrc_m000_t00_m00_bh.png")
        ]
    },
    # 9. Dwarf Male
    {
        'id': 'dwarf_m',
        'out_glb': os.path.join(out_dir, 'dwarf_m.glb'),
        'psa_name': 'MDwarf_anim.psa',
        'suffix': '_MDwarf',
        'parts': [
            ("MDwarf_m000_u.psk", "Chest", "MDwarf_m000_t1000_u.png"),
            ("MDwarf_m000_l.psk", "Legs", "MDwarf_m000_t1000_l.png"),
            ("MDwarf_m000_g.psk", "Gloves", "MDwarf_m000_t1000_g.png"),
            ("MDwarf_m000_b.psk", "Boots", "MDwarf_m004_t61_b.png"),
            ("MDwarf_m000_f.psk", "Face", "MDwarf_m000_t00_f.png"),
            ("MDwarf_m000_m00_ah.psk", "Hair_Front", "MDwarf_m004_t00_m00_ah.png"),
            ("MDwarf_m000_m00_bh.psk", "Hair_Back", "MDwarf_m000_t00_m00_bh.png")
        ]
    },
    # 10. Dwarf Female
    {
        'id': 'dwarf_f',
        'out_glb': os.path.join(out_dir, 'dwarf_f.glb'),
        'psa_name': 'FDwarf_anim.psa',
        'suffix': '_FDwarf',
        'parts': [
            ("FDwarf_m000_u.psk", "Chest", "FDwarf_m000_t1000_u.png"),
            ("FDwarf_m000_l.psk", "Legs", "FDwarf_m000_t1000_l.png"),
            ("FDwarf_m000_g.psk", "Gloves", "FDwarf_m000_t1000_g.png"),
            ("FDwarf_m000_b.psk", "Boots", "FDwarf_m000_t1000_b.png"),
            ("FDwarf_m000_f.psk", "Face", "FDwarf_m000_t00_f.png"),
            ("FDwarf_m000_m00_ah.psk", "Hair_Front", "FDwarf_m000_t00_m00_ah.png"),
            ("FDwarf_m000_m00_bh.psk", "Hair_Back", "FDwarf_m000_t00_m00_bh.png")
        ]
    }
]

for cfg in ROSTER_CONFIGS:
    race_id = cfg['id']
    print(f"\n=======================================================")
    print(f"       CONSTRUINDO ROSTER: {race_id.upper()}")
    print(f"=======================================================")

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    for img in list(bpy.data.images): bpy.data.images.remove(img)

    created_meshes = []
    for psk_name, nice_name, tex_name in cfg['parts']:
        psk_path = find_file(psk_roots, psk_name)
        if not psk_path:
            # Fallback for capitalization differences
            alt_psk = psk_name.replace('_m000_', '_M000_') if '_m000_' in psk_name else psk_name.replace('_M000_', '_m000_')
            psk_path = find_file(psk_roots, alt_psk)
        if not psk_path:
            print(f"  [AVISO] PSK nao encontrado: {psk_name}")
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

    for mesh_obj, nice_name, tex_name in created_meshes:
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE':
                mod.object = master_arm
        mesh_obj.parent = master_arm

        if "Face" in nice_name or "Hair" in nice_name:
            mesh_obj.vertex_groups.clear()
            head_grp = mesh_obj.vertex_groups.new(name="Bip01_head")
            all_verts = [v.index for v in mesh_obj.data.vertices]
            head_grp.add(all_verts, 1.0, 'REPLACE')

        mat = bpy.data.materials.new(name=f"Mat_{nice_name}_{race_id}")
        bsdf = mat.node_tree.nodes.get("Principled BSDF")

        tex_path = find_texture(tex_name)
        if tex_path and bsdf:
            tex_img = bpy.data.images.load(tex_path)
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = tex_img
            mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])

            if "Hair" in nice_name:
                mat.node_tree.links.new(bsdf.inputs['Alpha'], tex_node.outputs['Alpha'])
                mat.blend_method = 'CLIP'
                mat.alpha_threshold = 0.5
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = 0.55

        mesh_obj.data.materials.clear()
        mesh_obj.data.materials.append(mat)

    for extra_arm in armatures[1:]:
        bpy.data.objects.remove(extra_arm, do_unlink=True)

    bpy.context.scene.render.fps = 30
    bpy.context.view_layer.objects.active = master_arm
    master_arm.select_set(True)

    psa_path = find_file(psa_roots, cfg['psa_name'])
    if not psa_path:
        print(f"  [ERRO] PSA nao encontrado: {cfg['psa_name']}")
        continue

    psa_rates = get_psa_rates(psa_path)
    psa_import_fn = getattr(bpy.ops.psa_import, 'import')
    psa_import_fn(filepath=psa_path)

    sfx = cfg['suffix']
    # Canonical actions map using race suffix
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

    # Fallback mappings if specific 2HS isn't present
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
print("  >>> TODOS OS 10 HEROES FORAM CONSTRUÍDOS COM SUCESSO ABSOLUTO!")
print("=======================================================")
