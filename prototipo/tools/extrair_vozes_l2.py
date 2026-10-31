"""Extrai as VOZES de cada raca/genero do Lineage 2 (cliente Interlude, pacote chrsound.uax) e deixa em prototipo/assets/vozes/<conjunto>/<evento>_<n>.ogg + vozes.json.
Uso (na pasta prototipo):  python tools/extrair_vozes_l2.py
Eventos por conjunto: atk (grunhido do golpe basico: Preatk/1H/2H/Pole Atk), skill (grito de skill: *_S_Atk_*), dmg (dano), death (morte), breath (folego/cansaco), victory, greeting.
Conjuntos (prefixo do L2) -> tipos de personagem do jogo estao em js/voz.js (MAPA)."""
import os, re, json, glob, subprocess, shutil, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
SONS = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x\sounds"
TMP = os.path.join(os.environ.get('TEMP', '.'), 'l2voz')
SAIDA = os.path.join(RAIZ, 'assets', 'vozes')
CONJUNTOS = ['MHFighter', 'FHFighter', 'MHMagician', 'FHMagician', 'MElf', 'FElf', 'MOFighter', 'FOFighter', 'MDwarf', 'FDwarf', 'MDElf', 'FDElf']
EVENTOS = [('atk', r'(Preatk_\d|(1H|2H|Pole)_Atk_\d)'), ('skill', r'(1H|2H|Pole)_S_Atk_\d'), ('dmg', r'Dmg_\d'), ('death', r'Death'),
           ('breath', r'Breath_\d'), ('victory', r'Victory'), ('greeting', r'Greeting')]
# sons de lancamento proprios de cada raca/genero (F_/M_<raca>_<tipo>): Shot/Throw = soltar a skill (~0,8 s), Notarget = "nao da" (sem alvo/indisponivel)
FM = {'MHFighter': 'M_HFighter', 'FHFighter': 'F_HFighter', 'MHMagician': 'M_HMagician', 'FHMagician': 'F_HMagician', 'MElf': 'M_Elf', 'FElf': 'F_Elf',
      'MOFighter': 'M_Orc_Fighter', 'FOFighter': 'F_Orc_Fighter', 'MDwarf': 'M_Dwarf', 'FDwarf': 'F_Dwarf', 'MDElf': 'M_DarkElf', 'FDElf': 'F_DarkElf'}
EVENTOS_FM = [('cast', ['Shot', 'Throw']), ('fail', ['Notarget'])]
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

pasta = os.path.join(TMP, 'chrsound', 'Sound')
if not os.path.isdir(pasta):
    os.makedirs(TMP, exist_ok=True)
    subprocess.run([UMODEL, '-path=' + SONS, '-export', '-sounds', 'chrsound.uax', '-out=' + TMP], check=True, stdout=subprocess.DEVNULL)
if os.path.isdir(SAIDA): shutil.rmtree(SAIDA)
idx = {}; total = 0
for cj in CONJUNTOS:
    d = os.path.join(SAIDA, cj); os.makedirs(d, exist_ok=True); idx[cj] = {}
    arqs = {os.path.splitext(f)[0]: f for f in os.listdir(pasta) if f.lower().startswith(cj.lower() + '_')}
    for ev, rx in EVENTOS:
        sel = sorted(n for n in arqs if re.fullmatch(cj + '_' + rx, n, re.I))
        out = []
        for k, n in enumerate(sel, 1):
            nome = '%s_%d.ogg' % (ev, k)
            r = subprocess.run([FF, '-y', '-loglevel', 'error', '-i', os.path.join(pasta, arqs[n]), '-ac', '1', '-ar', '24000', '-c:a', 'libvorbis', '-q:a', '3', os.path.join(d, nome)])
            if r.returncode == 0: out.append(nome); total += 1
        idx[cj][ev] = out
    for ev, tipos in EVENTOS_FM:
        out = []
        for k, t in enumerate(tipos, 1):
            fonte = os.path.join(pasta, '%s_%s.wav' % (FM[cj], t))
            if not os.path.exists(fonte): continue
            nome = '%s_%d.ogg' % (ev, k)
            if subprocess.run([FF, '-y', '-loglevel', 'error', '-i', fonte, '-ac', '1', '-ar', '24000', '-c:a', 'libvorbis', '-q:a', '3', os.path.join(d, nome)]).returncode == 0: out.append(nome); total += 1
        idx[cj][ev] = out
    print(cj, {k: len(v) for k, v in idx[cj].items()})
json.dump(idx, open(os.path.join(SAIDA, 'vozes.json'), 'w', encoding='utf-8'), indent=1)
tam = sum(os.path.getsize(p) for p in glob.glob(os.path.join(SAIDA, '**', '*.ogg'), recursive=True))
print('arquivos:', total, '|', round(tam / 1e6, 2), 'MB')
