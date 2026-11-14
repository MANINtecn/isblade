import bpy, os, glob

RAIZ = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
BASE_GLB = os.path.join(RAIZ, "assets", "personagens", "elf_f.glb")
OUT_DIR = os.path.join(RAIZ, "assets", "personagens")
PSK_DIR = os.path.join(RAIZ, "assets", "personagens", "raw_elf_armors", "Elf", "SkeletalMesh")
TEX_DIR = os.path.join(RAIZ, "assets", "personagens", "raw_test_elf", "felf", "Texture")

bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')

SETS = [
    {
        "name": "elf_f_nograde",
        "label": "No-Grade Starter Armor",
        "metal": 0.40, "rough": 0.50,
        "parts": [
            ("FElf_m001_u", "Chest", "FElf_m001_t02_u.png"),
            ("FElf_m001_l", "Legs",  "FElf_m001_t02_l_sp.png"),
            ("FElf_m001_g", "Gloves","FElf_m001_t02_g.png"),
            ("FElf_m001_b", "Boots", "FElf_m001_t02_b.png"),
        ]
    },
    {
        "name": "elf_f_brigandine",
        "label": "D-Grade Brigandine",
        "metal": 0.55, "rough": 0.40,
        "parts": [
            ("FElf_m001_u", "Chest", "FElf_m001_t01_u_sp.png"),
            ("FElf_m001_l", "Legs",  "FElf_m001_t01_l_sp.png"),
            ("FElf_m001_g", "Gloves","FElf_m001_t01_g.png"),
            ("FElf_m001_b", "Boots", "FElf_m001_t01_b.png"),
        ]
    },
    {
        "name": "elf_f_fullplate",
        "label": "C-Grade Full Plate",
        "metal": 0.85, "rough": 0.28,
        "parts": [
            ("FElf_m002_u", "Chest", "FElf_m002_t1001_u_sp.png"),
            ("FElf_m002_l", "Legs",  "FElf_m002_t20_l_sp.png"),
            ("FElf_m002_g", "Gloves","FElf_m002_t19_g.png"),
            ("FElf_m002_b", "Boots", "FElf_m002_t20_b.png"),
        ]
    },
    {
        "name": "elf_f_doom",
        "label": "B-Grade Doom",
        "metal": 0.80, "rough": 0.32,
        "parts": [
            ("FElf_m007_u", "Chest", "FElf_m011_t1004_u_sp.png"),
            ("FElf_m007_l", "Legs",  "FElf_m011_t1004_l_sp.png"),
            ("FElf_m007_g", "Gloves","FElf_m011_t1004_g_sp.png"),
            ("FElf_m007_b", "Boots", "FElf_m011_t1004_b_sp.png"),
        ]
    },
    {
        "name": "elf_f_tallum",
        "label": "A-Grade Tallum",
        "metal": 0.85, "rough": 0.26,
        "parts": [
            ("FElf_m008_u", "Chest", "FElf_m008_t1005_u_sp.png"),
            ("FElf_m007_l", "Legs",  "FElf_m007_t1005_l_sp.png"),
            ("FElf_m008_g", "Gloves","FElf_m008_t1005_g_sp.png"),
            ("FElf_m007_b", "Boots", "FElf_m007_t1005_b_sp.png"),
        ]
    }
]

for s in SETS:
    print(f"\n==========================================")
    print(f"Montando modelo 3D: {s['label']} ({s['name']}.glb)")
    print(f"==========================================")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
    
    # 1. Carrega modelo base da Elfa com esqueleto e animacoes
    bpy.ops.import_scene.gltf(filepath=BASE_GLB)
    
    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not armatures:
        print("[ERRO] Armature base nao encontrada!")
        continue
    master_arm = armatures[0]
    
    # 2. Remove as 4 malhas sem armadura (Chest, Legs, Gloves, Boots)
    part_names = ["Chest", "Legs", "Gloves", "Boots"]
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name in part_names:
            bpy.data.objects.remove(o, do_unlink=True)
            
    # 3. Importa cada PSK da armadura e anexa ao master_arm
    for psk_name, slot_name, tex_name in s["parts"]:
        psk_path = os.path.join(PSK_DIR, f"{psk_name}.psk")
        if not os.path.exists(psk_path):
            print(f"[ERRO] PSK nao encontrado: {psk_path}")
            continue
            
        objs_before = set(bpy.data.objects)
        bpy.ops.import_scene.psk(filepath=psk_path)
        objs_new = [o for o in bpy.data.objects if o not in objs_before]
        
        mesh_obj = [o for o in objs_new if o.type == 'MESH'][0]
        arm_tmp = [o for o in objs_new if o.type == 'ARMATURE'][0]
        
        mesh_obj.name = slot_name
        
        # Redireciona modificador Armature para o master_arm
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE':
                mod.object = master_arm
        mesh_obj.parent = master_arm
        
        # Deleta a armature temporaria do PSK
        bpy.data.objects.remove(arm_tmp, do_unlink=True)
        
        # Cria material PBR com textura original
        mat = bpy.data.materials.new(name=f"Mat_{slot_name}_{s['name']}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        
        tex_path = os.path.join(TEX_DIR, tex_name)
        if os.path.exists(tex_path) and bsdf:
            img = bpy.data.images.load(tex_path)
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = img
            mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
            if 'Metallic' in bsdf.inputs:
                bsdf.inputs['Metallic'].default_value = s["metal"]
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = s["rough"]
                
        mesh_obj.data.materials.clear()
        mesh_obj.data.materials.append(mat)
        print(f" - Adicionada malha 3D '{slot_name}' ({psk_name}) com textura '{tex_name}'")
        
    out_glb = os.path.join(OUT_DIR, f"{s['name']}.glb")
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB')
    print(f"[OK] Exportado com sucesso: {out_glb} ({round(os.path.getsize(out_glb)/1024/1024, 2)} MB)")
