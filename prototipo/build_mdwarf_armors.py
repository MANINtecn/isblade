import bpy, os

RAIZ = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
BASE_GLB = os.path.join(RAIZ, "assets", "personagens", "dwarf_m.glb")
OUT_DIR = os.path.join(RAIZ, "assets", "personagens")
PSK_DIR = os.path.join(RAIZ, "assets", "personagens", "raw_mdwarf_armors", "Dwarf", "SkeletalMesh")
TEX_DIR = os.path.join(RAIZ, "assets", "personagens", "raw_roster_extra", "mdwarf", "Texture")

SETS = [
    {
        "name": "dwarf_m_brigandine",
        "label": "Dwarf Male D-Grade Brigandine",
        "metal": 0.55, "rough": 0.40,
        "parts": [
            ("MDwarf_m002_u", "Chest",  "MDwarf_m002_t1006_u_sp.png"),
            ("MDwarf_m002_l", "Legs",   "MDwarf_m002_t1006_l_sp.png"),
            ("MDwarf_m002_g", "Gloves", "MDwarf_m002_t1006_g_sp.png"),
            ("MDwarf_m002_b", "Boots",  "MDwarf_m002_t1006_b_sp.png"),
        ]
    },
    {
        "name": "dwarf_m_fullplate",
        "label": "Dwarf Male C-Grade Full Plate",
        "metal": 0.85, "rough": 0.28,
        "parts": [
            ("MDwarf_m004_u", "Chest",  "MDwarf_m004_t1002_u_sp.png"),
            ("MDwarf_m004_l", "Legs",   "MDwarf_m004_t1002_l_sp.png"),
            ("MDwarf_m004_g", "Gloves", "MDwarf_m004_t1002_g.png"),
            ("MDwarf_m004_b", "Boots",  "MDwarf_m004_t1002_b.png"),
        ]
    },
    {
        "name": "dwarf_m_doom",
        "label": "Dwarf Male B-Grade Doom",
        "metal": 0.80, "rough": 0.32,
        "parts": [
            ("MDwarf_m008_u", "Chest",  "MDwarf_m008_t1004_u_sp.png"),
            ("MDwarf_m008_l", "Legs",   "MDwarf_m008_t1004_l_sp.png"),
            ("MDwarf_m008_g", "Gloves", "MDwarf_m008_t1004_g_sp.png"),
            ("MDwarf_m008_b", "Boots",  "MDwarf_m008_t1004_b_sp.png"),
        ]
    },
    {
        "name": "dwarf_m_tallum",
        "label": "Dwarf Male A-Grade Tallum",
        "metal": 0.85, "rough": 0.26,
        "parts": [
            ("MDwarf_m009_u", "Chest",  "MDwarf_m009_t2000_u_sp.png"),
            ("MDwarf_m009_l", "Legs",   "MDwarf_m009_t2000_l_sp.png"),
            ("MDwarf_m009_g", "Gloves", "MDwarf_m009_t2000_g_sp.png"),
            ("MDwarf_m009_b", "Boots",  "MDwarf_m009_t2000_b_sp.png"),
        ]
    }
]

for s in SETS:
    print(f"\n==========================================")
    print(f"Montando modelo 3D: {s['label']} ({s['name']}.glb)")
    print(f"==========================================")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
    
    # 1. Carrega modelo base do Anão Male com esqueleto e animações
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
        
        mesh_objs = [o for o in objs_new if o.type == 'MESH']
        arm_tmps = [o for o in objs_new if o.type == 'ARMATURE']
        
        if not mesh_objs:
            print(f"[ERRO] Mesh nao encontrada no PSK {psk_name}")
            continue
        mesh_obj = mesh_objs[0]
        mesh_obj.name = slot_name
        
        # Redireciona modificador Armature para o master_arm
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE':
                mod.object = master_arm
        mesh_obj.parent = master_arm
        
        # Deleta a armature temporaria do PSK
        for arm_tmp in arm_tmps:
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
