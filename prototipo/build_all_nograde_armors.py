import bpy, os

RAIZ = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
OUT_DIR = os.path.join(RAIZ, "assets", "personagens")
PSK_BASE = os.path.join(RAIZ, "assets", "personagens", "raw_all_nograde_armors")

RACES_CONFIG = [
    {
        "id": "human_fighter_female",
        "label": "Humana Guerreira No-Grade",
        "base_glb": os.path.join(OUT_DIR, "human_fighter_female.glb"),
        "out_glb": os.path.join(OUT_DIR, "human_fighter_female_nograde.glb"),
        "metal": 0.35, "rough": 0.55,
        "parts": [
            ("FFighter_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t02_u_sp.png")),
            ("FFighter_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t02_l_sp.png")),
            ("FFighter_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t02_g.png")),
            ("FFighter_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FFighter/Texture/FFighter_m001_t02_b.png")),
        ]
    },
    {
        "id": "magic_m",
        "label": "Humano Místico Male No-Grade",
        "base_glb": os.path.join(OUT_DIR, "magic_m.glb"),
        "out_glb": os.path.join(OUT_DIR, "magic_m_nograde.glb"),
        "metal": 0.20, "rough": 0.65,
        "parts": [
            ("MMagic_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m001_t05_u.png")),
            ("MMagic_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m001_t05_l.png")),
            ("MMagic_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m001_t05_g.png")),
            ("MMagic_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/MMagic/Texture/MMagic_m001_t05_b_sp.png")),
        ]
    },
    {
        "id": "magic_f",
        "label": "Humana Mística Female No-Grade",
        "base_glb": os.path.join(OUT_DIR, "magic_f.glb"),
        "out_glb": os.path.join(OUT_DIR, "magic_f_nograde.glb"),
        "metal": 0.20, "rough": 0.65,
        "parts": [
            ("FMagic_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m001_t05_u.png")),
            ("FMagic_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m001_t03_l_sp.png")),
            ("FMagic_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m001_t05_g.png")),
            ("FMagic_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_tex_all/FMagic/Texture/FMagic_m001_t03_b.png")),
        ]
    },
    {
        "id": "elf_m",
        "label": "Elfo Male No-Grade",
        "base_glb": os.path.join(OUT_DIR, "elf_m.glb"),
        "out_glb": os.path.join(OUT_DIR, "elf_m_nograde.glb"),
        "metal": 0.35, "rough": 0.55,
        "parts": [
            ("MElf_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t02_u.png")),
            ("MElf_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t02_l_sp.png")),
            ("MElf_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t02_g.png")),
            ("MElf_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/melf/Texture/MElf_m001_t02_b.png")),
        ]
    },
    {
        "id": "orc_m",
        "label": "Orc Male No-Grade",
        "base_glb": os.path.join(OUT_DIR, "orc_m.glb"),
        "out_glb": os.path.join(OUT_DIR, "orc_m_nograde.glb"),
        "metal": 0.40, "rough": 0.50,
        "parts": [
            ("MOrc_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t02_u.png")),
            ("MOrc_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t02_l.png")),
            ("MOrc_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t02_g.png")),
            ("MOrc_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_tex_all/MOrc/Texture/MOrc_m001_t02_b.png")),
        ]
    },
    {
        "id": "orc_f",
        "label": "Orc Female No-Grade",
        "base_glb": os.path.join(OUT_DIR, "orc_f.glb"),
        "out_glb": os.path.join(OUT_DIR, "orc_f_nograde.glb"),
        "metal": 0.40, "rough": 0.50,
        "parts": [
            ("FOrc_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t02_u.png")),
            ("FOrc_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t02_l.png")),
            ("FOrc_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t02_g.png")),
            ("FOrc_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/FOrc/Texture/FOrc_m001_t02_b.png")),
        ]
    },
    {
        "id": "dwarf_m",
        "label": "Anão Male No-Grade",
        "base_glb": os.path.join(OUT_DIR, "dwarf_m.glb"),
        "out_glb": os.path.join(OUT_DIR, "dwarf_m_nograde.glb"),
        "metal": 0.40, "rough": 0.50,
        "parts": [
            ("MDwarf_m001_u", "Chest", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t02_u.png")),
            ("MDwarf_m001_l", "Legs",  os.path.join(RAIZ, "assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t02_l_sp.png")),
            ("MDwarf_m001_g", "Gloves",os.path.join(RAIZ, "assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t02_g.png")),
            ("MDwarf_m001_b", "Boots", os.path.join(RAIZ, "assets/personagens/raw_roster_extra/mdwarf/Texture/MDwarf_m001_t02_b.png")),
        ]
    }
]

def find_psk(psk_name):
    for root, dirs, files in os.walk(PSK_BASE):
        for f in files:
            if f.lower() == (psk_name + ".psk").lower():
                return os.path.join(root, f)
    return None

for cfg in RACES_CONFIG:
    print(f"\n==========================================")
    print(f"Construindo: {cfg['label']} ({cfg['id']})")
    print(f"==========================================")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
    
    if not os.path.exists(cfg["base_glb"]):
        print(f"[ERRO] Base GLB nao encontrado: {cfg['base_glb']}")
        continue
        
    bpy.ops.import_scene.gltf(filepath=cfg["base_glb"])
    
    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not armatures:
        print(f"[ERRO] Armature base nao encontrada em {cfg['id']}!")
        continue
    master_arm = armatures[0]
    
    # Remove as 4 malhas sem armadura (Chest, Legs, Gloves, Boots)
    part_names = ["chest", "legs", "gloves", "boots"]
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            nl = o.name.lower()
            if any(p in nl for p in part_names) and not any(h in nl for h in ["hair", "face", "_ah", "_bh"]):
                bpy.data.objects.remove(o, do_unlink=True)
                
    # Importa cada PSK da armadura No-Grade e anexa ao master_arm
    for psk_name, slot_name, tex_path in cfg["parts"]:
        psk_path = find_psk(psk_name)
        if not psk_path or not os.path.exists(psk_path):
            print(f"[ERRO] PSK nao encontrado: {psk_name}")
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
        
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE':
                mod.object = master_arm
        mesh_obj.parent = master_arm
        
        for arm_tmp in arm_tmps:
            bpy.data.objects.remove(arm_tmp, do_unlink=True)
            
        mat = bpy.data.materials.new(name=f"Mat_{slot_name}_{cfg['id']}_nograde")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        
        if os.path.exists(tex_path) and bsdf:
            img = bpy.data.images.load(tex_path)
            tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex_node.image = img
            mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
            if 'Metallic' in bsdf.inputs:
                bsdf.inputs['Metallic'].default_value = cfg["metal"]
            if 'Roughness' in bsdf.inputs:
                bsdf.inputs['Roughness'].default_value = cfg["rough"]
                
        mesh_obj.data.materials.clear()
        mesh_obj.data.materials.append(mat)
        print(f" - Adicionada malha '{slot_name}' ({psk_name})")
        
    bpy.ops.export_scene.gltf(filepath=cfg["out_glb"], export_format='GLB')
    print(f"[OK] Exportado com sucesso: {cfg['out_glb']} ({round(os.path.getsize(cfg['out_glb'])/1024/1024, 2)} MB)")

print("\nTODOS OS MODELOS NOGRADE DAS 7 RACAS CONSTRUIDOS COM SUCESSO!")
