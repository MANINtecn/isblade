"""Extrai os PASSOS do Lineage 2 (pacote stepsound.uax) para prototipo/assets/passos/<superficie>_<walk|run>_<n>.ogg + passos.json.
Uso (na pasta prototipo):  python tools/extrair_passos_l2.py"""
import os, re, json, glob, subprocess, shutil, collections
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
SONS = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x\sounds"
TMP = os.path.join(os.environ.get('TEMP', '.'), 'l2passos'); SAIDA = os.path.join(RAIZ, 'assets', 'passos')
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
pasta = None
if not glob.glob(os.path.join(TMP, '**', '*.wav'), recursive=True):
    os.makedirs(TMP, exist_ok=True)
    subprocess.run([UMODEL, '-path=' + SONS, '-export', '-sounds', 'stepsound.uax', '-out=' + TMP], check=True, stdout=subprocess.DEVNULL)
if os.path.isdir(SAIDA): shutil.rmtree(SAIDA)
os.makedirs(SAIDA)
grupos = collections.defaultdict(list)
for p in glob.glob(os.path.join(TMP, '**', '*.wav'), recursive=True):
    n = os.path.splitext(os.path.basename(p))[0].lower()
    m = re.fullmatch(r'(.+?)_(walk|run)_(\d+)', n)
    if m: grupos[(m.group(1), m.group(2))].append((int(m.group(3)), p))
idx = collections.defaultdict(dict); total = 0
for (sup, modo), lst in sorted(grupos.items()):
    out = []
    for k, (_, p) in enumerate(sorted(lst), 1):
        nome = '%s_%s_%d.ogg' % (sup, modo, k)
        if subprocess.run([FF, '-y', '-loglevel', 'error', '-i', p, '-ac', '1', '-ar', '22050', '-c:a', 'libvorbis', '-q:a', '2', os.path.join(SAIDA, nome)]).returncode == 0: out.append(nome); total += 1
    idx[sup][modo] = out
json.dump(idx, open(os.path.join(SAIDA, 'passos.json'), 'w', encoding='utf-8'), indent=1)
tam = sum(os.path.getsize(p) for p in glob.glob(os.path.join(SAIDA, '*.ogg')))
print({s: {m: len(v) for m, v in d.items()} for s, d in idx.items()}); print('arquivos:', total, '|', round(tam / 1e6, 2), 'MB')
