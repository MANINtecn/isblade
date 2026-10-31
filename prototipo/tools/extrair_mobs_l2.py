"""Extrai os SONS DOS MONSTROS do Lineage 2 (pacotes monsound*.uax) para prototipo/assets/mobs/<mob>/<evento>_<n>.ogg + mobs.json.
Uso (na pasta prototipo):  python tools/extrair_mobs_l2.py
Mobs do jogo -> monstro do L2 (troque aqui para mudar):  shade=shadow (sombra), caster=black_magician, brute=ogre, mini_boss=DeathLord, baium=baium.
Eventos: atk (golpe/grito de ataque), windup (preparacao: AtkWait/Special), swish (golpe cortando o ar), dmg (levou dano), death, idle (rosnado/respiracao)."""
import os, re, json, glob, subprocess, shutil
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
SONS = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x\sounds"
TMP = os.path.join(os.environ.get('TEMP', '.'), 'l2mob'); SAIDA = os.path.join(RAIZ, 'assets', 'mobs')
PACOTES = ['monsound', 'monsound2', 'monsound3', 'monsound4', 'monsound5', 'MonSound6', 'monsound7']
MOBS = {'shade': 'shadow', 'caster': 'black_magician', 'brute': 'ogre', 'mini_boss': 'DeathLord', 'baium': 'baium'}
EVENTOS = [('atk', r'(atk|attack)(_\d+)?'), ('windup', r'(atkwait|spcialattack_\d+|special\w*|spatk\w*)'), ('swish', r'swish(_\d+)?'),
           ('dmg', r'(dmg|damage)_\d+'), ('death', r'death(_\d+)?'), ('idle', r'(wait(_\d+)?|idle_\d+|breathe|breath_\d+|noise\w*)')]
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
if not glob.glob(os.path.join(TMP, '**', '*.wav'), recursive=True):
    os.makedirs(TMP, exist_ok=True)
    for pk in PACOTES:
        subprocess.run([UMODEL, '-path=' + SONS, '-export', '-sounds', pk + '.uax', '-out=' + TMP], stdout=subprocess.DEVNULL)
arqs = {}
for p in glob.glob(os.path.join(TMP, '**', '*.wav'), recursive=True): arqs[os.path.splitext(os.path.basename(p))[0].lower()] = p
if os.path.isdir(SAIDA): shutil.rmtree(SAIDA)
idx = {}; total = 0
for mob, l2 in MOBS.items():
    d = os.path.join(SAIDA, mob); os.makedirs(d, exist_ok=True); idx[mob] = {}
    for ev, rx in EVENTOS:
        sel = sorted(n for n in arqs if n.startswith(l2.lower() + '_') and re.fullmatch(rx, n[len(l2) + 1:], re.I))
        out = []
        for k, n in enumerate(sel, 1):
            nome = '%s_%d.ogg' % (ev, k)
            if subprocess.run([FF, '-y', '-loglevel', 'error', '-i', arqs[n], '-ac', '1', '-ar', '24000', '-c:a', 'libvorbis', '-q:a', '3', os.path.join(d, nome)]).returncode == 0: out.append(nome); total += 1
        idx[mob][ev] = out
    print(mob, '<-', l2, {k: len(v) for k, v in idx[mob].items()})
json.dump(idx, open(os.path.join(SAIDA, 'mobs.json'), 'w', encoding='utf-8'), indent=1)
tam = sum(os.path.getsize(p) for p in glob.glob(os.path.join(SAIDA, '**', '*.ogg'), recursive=True))
print('arquivos:', total, '|', round(tam / 1e6, 2), 'MB')
