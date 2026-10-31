"""Gera os modelos 3D (GLB com animacoes) dos monstros do L2 usados nas dungeons: assets/mobs/modelos/<id>.glb.
Uso (na pasta prototipo):  python tools/blender_mobs/exportar_mobs.py [id ...]     (sem argumentos = todos)
Passos por monstro: umodel exporta a malha (.psk + texturas .png) e a animacao (.psa) do pacote .ukx do cliente; o Blender (montar_mob.py) liga tudo e exporta o GLB."""
import os, sys, subprocess, shutil
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
CLIENTE = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x"
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
TMP = os.path.join(os.environ.get('TEMP', '.'), 'l2mobmesh'); SAIDA = os.path.join(RAIZ, 'assets', 'mobs', 'modelos')
# id: (pacote da malha, malha, pacote da animacao, animacao, max_tris, giro)
MOBS = {
  'fantasma':     ('LineageMonsters',  'human_ghost_m00',          'LineageMonsters',  'human_ghost_anim',          2500, 0),
  'esqueleto':    ('LineageMonsters',  'skeleton_knight_m00',      'LineageMonsters',  'skeleton_knight_anim',      3000, 0),
  'vidente':      ('LineageMonsters2', 'black_magician_m00',       'LineageMonsters2', 'Black_magician_anim',       3000, 0),
  'lamina':       ('LineageMonsters',  'death_knight_m00',         'LineageMonsters',  'death_knight_anim',         3500, 0),
  'guarda_real':  ('LineageMonsters',  'skeleton_royal_guard_m00', 'LineageMonsters',  'skeleton_royal_guard_anim', 3000, 0),
  'cavaleiro':    ('LineageMonsters',  'headless_knight_m00',      'LineageMonsters',  'headless_knight_anim',      3500, 0),
  'erinia':       ('LineageMonsters2', 'erinyes_m00',              'LineageMonsters2', 'erinyes_anim',              3500, 0),
  'cao':          ('LineageMonsters',  'werewolf_m00',             'LineageMonsters',  'werewolf_anim',             3500, 0),
  'comandante':   ('LineageMonsters2', 'knight_of_shadow_m00',     'LineageMonsters2', 'knight_of_shadow_anim',     4000, 0),
  'anjo':         ('LineageMonsters',  'angel_m00',                'LineageMonsters',  'angel_anim',                3500, 0),
  'arcanjo':      ('LineageMonsters',  'archangel_m00',            'LineageMonsters',  'archangel_anim',            4000, 0),
  'xama':         ('LineageMonsters',  'batur_orc_shaman_a_m00',   'LineageMonsters',  'batur_orc_shaman_anim',     3000, 0),
  'overlord':     ('LineageMonsters',  'batur_orc_overlord_m00',   'LineageMonsters',  'batur_orc_overlord_anim',   3500, 0),
}
quais = sys.argv[1:] or list(MOBS)
os.makedirs(SAIDA, exist_ok=True)
for mid in quais:
    pm, malha, pa, anim, mt, giro = MOBS[mid]
    d = os.path.join(TMP, mid)
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d)
    subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', '-png', '-obj=' + malha, pm + '.ukx', '-out=' + d], stdout=subprocess.DEVNULL)
    subprocess.run([UMODEL, '-path=' + CLIENTE, '-export', '-psk', '-obj=' + anim, pa + '.ukx', '-out=' + d], stdout=subprocess.DEVNULL)
    psk = os.path.join(d, pm, 'SkeletalMesh', malha + '.psk'); psa = os.path.join(d, pa, 'MeshAnimation', anim + '.psa')
    if not os.path.exists(psk): print(mid, 'SEM MALHA', psk); continue
    out = os.path.join(SAIDA, mid + '.glb')
    r = subprocess.run([BLENDER, '-b', '--python', os.path.join(RAIZ, 'tools', 'blender_mobs', 'montar_mob.py'), '--', psk, psa, d, out, '1.0', str(giro), str(mt)], capture_output=True, text=True)
    linha = [l for l in r.stdout.splitlines() if l.startswith(('MOB', 'EXPORTADO', 'decimate'))]
    print(mid, '|', ' | '.join(linha) if linha else 'FALHOU: ' + r.stdout[-300:] + r.stderr[-200:])
