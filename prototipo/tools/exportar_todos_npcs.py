import os, subprocess, sys, glob

UMODEL = r'C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe'
CLIENTE = r'C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x'
BLENDER = r'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe'
RAIZ = os.path.abspath(r'C:\TECX SOFTHOUSE\IS ONLINE\prototipo')
SCRIPT_MONTAR = os.path.join(RAIZ, 'tools', 'montar_npc.py')
OUT_DIR = os.path.join(RAIZ, 'assets', 'personagens')
TEMP_DIR = os.path.join(RAIZ, 'assets', 'temp_npc_exports')

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

NPCS = [
    {
        'id': 'clarissa',
        'mesh': 'a_teleporter_FHuman_m00',
        'anim': 'a_teleporter_FHuman_anim',
        'altura': 1.75,
        'giro': 0.0,
        'out': 'npc_clarissa.glb'
    },
    {
        'id': 'altran',
        'mesh': 'a_smith_MDwarf_m00',
        'anim': 'a_smith_MDwarf_anim',
        'altura': 1.35,
        'giro': 0.0,
        'out': 'npc_altran.glb'
    },
    {
        'id': 'galladucci',
        'mesh': 'a_traderA_Mhuman_m00',
        'anim': 'a_traderA_Mhuman_anim',
        'altura': 1.80,
        'giro': 0.0,
        'out': 'npc_galladucci.glb'
    },
    {
        'id': 'wilford',
        'mesh': 'a_warehouse_keeper_MDwarf_m00',
        'anim': 'a_warehouse_keeper_MDwarf_anim',
        'altura': 1.35,
        'giro': 0.0,
        'out': 'npc_wilford.glb'
    },
    {
        'id': 'mammon',
        'mesh': 'Black_Market_Trader_MDwarf_set_m00',
        'anim': 'Black_Market_trader_set_anim',
        'altura': 1.40,
        'giro': 0.0,
        'out': 'npc_mammon.glb'
    }
]

for npc in NPCS:
    print(f"=== Processando {npc['id']} ({npc['mesh']}) ===")
    d = os.path.join(TEMP_DIR, npc['id'])
    os.makedirs(d, exist_ok=True)

    # 1. Exportar Mesh (.psk) e Texturas (.png)
    cmd_mesh = [UMODEL, f'-path={CLIENTE}', '-export', '-psk', '-png', f"-obj={npc['mesh']}", 'LineageNpcs.ukx', f'-out={d}']
    subprocess.run(cmd_mesh, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Exportar Anim (.psa)
    cmd_anim = [UMODEL, f'-path={CLIENTE}', '-export', '-psk', f"-obj={npc['anim']}", 'LineageNpcs.ukx', f'-out={d}']
    subprocess.run(cmd_anim, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 3. Localizar arquivos exportados
    psk_list = glob.glob(os.path.join(d, '**', f"{npc['mesh']}.psk"), recursive=True)
    psa_list = glob.glob(os.path.join(d, '**', f"{npc['anim']}.psa"), recursive=True)
    tex_dir = os.path.join(d, 'LineageNpcsTex', 'Texture')
    if not os.path.exists(tex_dir):
        tex_dir = d

    if not psk_list:
        print(f"  [ERRO] PSK nao encontrado para {npc['id']}")
        continue

    psk = psk_list[0]
    psa = psa_list[0] if psa_list else 'none'
    out_glb = os.path.join(OUT_DIR, npc['out'])

    print(f"  PSK: {os.path.basename(psk)}")
    print(f"  PSA: {os.path.basename(psa) if psa != 'none' else 'Nenhum'}")
    print(f"  Montando GLB: {npc['out']}...")

    cmd_blender = [
        BLENDER, '-b', '--python', SCRIPT_MONTAR, '--',
        psk, psa, tex_dir, out_glb, str(npc['altura']), str(npc['giro'])
    ]
    res = subprocess.run(cmd_blender, capture_output=True, text=True)
    if os.path.exists(out_glb):
        print(f"  [OK] Sucesso! Tamanho: {round(os.path.getsize(out_glb)/1024)} KB\n")
    else:
        print(f"  [FALHA] Blender erro:\n{res.stdout}\n{res.stderr}\n")

print("Todos os NPCs foram processados!")
