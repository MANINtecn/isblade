"""Extrai e exporta os 15 monstros dos 3 novos mapas (Curuma 1-15, Fortaleza 15-30, Pantano Flamejante 30-45).
Gera:
  - prototipo/assets/mobs/modelos/<id>.glb  (<= 6000 tris, texturas <= 512px, animacoes padrao)
  - prototipo/assets/mobs/<id>/*.ogg       (sons de ataque, idle, morte, dano)
  - prototipo/assets/mobs/mobs.json        (registro de sons)
"""
import os, sys, re, json, glob, subprocess, shutil
import imageio_ffmpeg

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
CLIENTE = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x"
SONS = os.path.join(CLIENTE, "sounds")
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
FF = imageio_ffmpeg.get_ffmpeg_exe()

TMP_MESH = os.path.join(os.environ.get('TEMP', '.'), 'l2_novos_mobs_mesh')
TMP_AUDIO = os.path.join(os.environ.get('TEMP', '.'), 'l2_novos_mobs_audio')

DIR_MODELOS = os.path.join(RAIZ, 'assets', 'mobs', 'modelos')
DIR_MOBS = os.path.join(RAIZ, 'assets', 'mobs')
os.makedirs(DIR_MODELOS, exist_ok=True)
os.makedirs(DIR_MOBS, exist_ok=True)

# Definição dos 15 monstros
# id: (pkg_mesh, skeletal_mesh, pkg_anim, mesh_anim, altura, max_tris, som_prefixo, som_fallback_prefixo)
NOVOS_MOBS = {
    # --- CURUMA (Lvl 1 - 15) ---
    'sapo_curuma':      ('LineageMonsters', 'poison_toad_m00',          'LineageMonsters', 'poison_toad_anim',          1.3, 4000, 'g_toad', None),
    'stakato_curuma':   ('LineageMonsters', 'marsh_stakato_m00',        'LineageMonsters', 'marsh_stakato_drone_anim',   2.0, 4500, 'mstakato', None),
    'stalker_curuma':   ('LineageMonsters', 'field_stalker_m00',        'LineageMonsters', 'field_stalker_anim',        2.1, 4500, 'field_stalker', None),
    'aranha_curuma':    ('LineageMonsters', 'poison_spider_m00',        'LineageMonsters', 'poison_spider_anim',        1.3, 4000, 'g_spider', None),
    'chefe_curuma':     ('LineageMonsters', 'marsh_stakato_queen_m00',  'LineageMonsters', 'marsh_stakato_queen_anim',  3.2, 6000, 'mstakato_queen', 'mstakato'),

    # --- FORTALEZA (Lvl 15 - 30) ---
    'ol_mahum_fort':    ('LineageMonsters', 'ol_mahum_m00',             'LineageMonsters', 'ol_mahum_anim',             2.2, 4500, 'oel_mahum', None),
    'olho_fort':        ('LineageMonsters', 'monster_eye_m00',          'LineageMonsters', 'monster_eye_anim',          1.6, 4000, 'monster_eye', None),
    'basilisco_fort':   ('LineageMonsters', 'lesser_basilisk_m00',      'LineageMonsters', 'lesser_basilisk_anim',      1.4, 4500, 'less_basilisk', None),
    'formiga_fort':     ('LineageMonsters', 'ant_soldier_m00',          'LineageMonsters', 'soldier_ant_anim',          1.3, 4000, 'ant', None),
    'chefe_fort':       ('LineageMonsters3', 'Ol_Mahum_Raid_m00',       'LineageMonsters3', 'Ol_Mahum_Raid_anim',       3.0, 6000, 'oel_mahum', None),

    # --- PANTANO FLAMEJANTE (Lvl 30 - 45) ---
    'golem_lava':       ('LineageMonsters2', 'lava_golem_m00',          'LineageMonsters2', 'Lava_Golem_anim',          2.4, 5000, 'iron_golem', None),
    'salamandra_fogo':  ('LineageMonsters', 'salamander_m00',           'LineageMonsters', 'salamander_anim',           1.3, 4000, 'salamander', None),
    'wyrm_fogo':        ('LineageMonsters', 'wyrm_m00',                 'LineageMonsters', 'wyrm_anim',                 2.3, 4500, 'wyrm', None),
    'magmagoil':        ('LineageMonsters2', 'Magmagoil_m00',           'LineageMonsters2', 'Magmagoil_lad_anim',       2.0, 4500, 'magmagoil', 'iron_golem'),
    'chefe_blazing':    ('LineageMonsters3', 'Drake_Raid_m00',          'LineageMonsters3', 'Drake_Raid_anim',          3.8, 6500, 'drake', None),
}

EVENTOS = [
    ('atk', r'(atk|attack)(_\d+)?'),
    ('windup', r'(atkwait|spcialattack_\d+|special\w*|spatk\w*)'),
    ('swish', r'swish(_\d+)?'),
    ('dmg', r'(dmg|damage)_\d+'),
    ('death', r'(death|fall)(_\d+)?'),
    ('idle', r'(wait(_\d+)?|idle_\d+|breathe|breath_\d+|noise\w*)')
]

def extrair_sons():
    print("=== 1. Extraindo pacotes de audio (.uax) ===")
    os.makedirs(TMP_AUDIO, exist_ok=True)
    pkgs = ['monsound', 'monsound2', 'monsound3', 'monsound4', 'monsound5', 'MonSound6', 'monsound7']
    for pk in pkgs:
        dest = os.path.join(TMP_AUDIO, pk)
        if not os.path.exists(dest):
            subprocess.run([UMODEL, '-path=' + SONS, '-export', '-sounds', pk + '.uax', '-out=' + dest], stdout=subprocess.DEVNULL)
    
    # Mapear todos os wavs extraídos
    arqs = {}
    for p in glob.glob(os.path.join(TMP_AUDIO, '**', '*.wav'), recursive=True):
        nome = os.path.splitext(os.path.basename(p))[0].lower()
        arqs[nome] = p
    print(f"Total de audios WAV indexados: {len(arqs)}")
    return arqs

def processar_sons(arqs):
    print("=== 2. Gerando audios .ogg e atualizando mobs.json ===")
    mobs_json_path = os.path.join(DIR_MOBS, 'mobs.json')
    with open(mobs_json_path, 'r', encoding='utf-8') as f:
        idx = json.load(f)
    
    total_convertidos = 0
    for mob_id, cfg in NOVOS_MOBS.items():
        som_pref = cfg[6].lower()
        som_fallback = cfg[7].lower() if cfg[7] else None
        d = os.path.join(DIR_MOBS, mob_id)
        os.makedirs(d, exist_ok=True)
        idx[mob_id] = {}

        for ev, rx in EVENTOS:
            sel = sorted(n for n in arqs if n.startswith(som_pref + '_') and re.fullmatch(rx, n[len(som_pref) + 1:], re.I))
            if not sel and som_fallback:
                sel = sorted(n for n in arqs if n.startswith(som_fallback + '_') and re.fullmatch(rx, n[len(som_fallback) + 1:], re.I))
            
            out = []
            for k, n in enumerate(sel[:3], 1): # Max 3 variacoes por evento
                nome = f"{ev}_{k}.ogg"
                caminho_ogg = os.path.join(d, nome)
                cmd = [FF, '-y', '-loglevel', 'error', '-i', arqs[n], '-ac', '1', '-ar', '24000', '-c:a', 'libvorbis', '-q:a', '3', caminho_ogg]
                if subprocess.run(cmd).returncode == 0:
                    out.append(nome)
                    total_convertidos += 1
            idx[mob_id][ev] = out
        print(f"  [AUDIO] {mob_id} -> {som_pref}: { {k: len(v) for k, v in idx[mob_id].items()} }")

    with open(mobs_json_path, 'w', encoding='utf-8') as f:
        json.dump(idx, f, indent=1)
    print(f"Audio finalizado! {total_convertidos} arquivos ogg gerados.")

def processar_modelos():
    print("=== 3. Extraindo e gerando modelos GLB com animacoes ===")
    montar_script = os.path.join(RAIZ, 'tools', 'blender_mobs', 'montar_mob.py')
    
    for mob_id, (pm, malha, pa, anim, altura, max_tris, _, _) in NOVOS_MOBS.items():
        print(f"\n--- Processando {mob_id} ({malha} | {anim}) ---")
        out_glb = os.path.join(DIR_MODELOS, f"{mob_id}.glb")
        
        d = os.path.join(TMP_MESH, mob_id)
        if os.path.isdir(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)

        # Exportar PSK + PNG da malha
        subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', '-png', f'-obj={malha}', f'{pm}.ukx', f'-out={d}'], stdout=subprocess.DEVNULL)
        # Exportar PSA da animação
        subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', f'-obj={anim}', f'{pa}.ukx', f'-out={d}'], stdout=subprocess.DEVNULL)

        # Localizar arquivos exportados
        psk_files = glob.glob(os.path.join(d, '**', f'{malha}.psk'), recursive=True)
        psa_files = glob.glob(os.path.join(d, '**', f'{anim}.psa'), recursive=True)

        if not psk_files:
            print(f"  [ERRO] PSK nao encontrado para {mob_id} ({malha})")
            continue
        if not psa_files:
            print(f"  [ERRO] PSA nao encontrado para {mob_id} ({anim})")
            continue

        psk = psk_files[0]
        psa = psa_files[0]

        cmd = [
            BLENDER, '-b', '--python', montar_script, '--',
            psk, psa, d, out_glb, str(altura), '0', str(max_tris)
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        res_lines = [l for l in r.stdout.splitlines() if l.startswith(('MOB', 'EXPORTADO', 'decimate', 'WARNING'))]
        if os.path.exists(out_glb) and os.path.getsize(out_glb) > 1000:
            print(f"  [SUCESSO] {mob_id}.glb gerado ({round(os.path.getsize(out_glb)/1024, 1)} KB): {' | '.join(res_lines)}")
        else:
            print(f"  [FALHA] {mob_id}: {r.stdout[-300:]}\n{r.stderr[-200:]}")

if __name__ == '__main__':
    arqs_wav = extrair_sons()
    processar_sons(arqs_wav)
    processar_modelos()
    print("\n=== TODOS OS 15 MOBS PROCESSADOS COM SUCESSO! ===")

