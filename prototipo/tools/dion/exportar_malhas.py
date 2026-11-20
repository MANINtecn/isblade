"""Descobre em que pacote (.usx) esta cada malha usada pelos tiles de Dion e exporta os pacotes com o UModel (glTF + texturas PNG) para raw_dion/malhas.
Escreve raw_dion/malha_pacote.json (malha -> pacote) e raw_dion/malha_arquivo.json (malha -> caminho do .gltf).   Uso: python exportar_malhas.py [tiles...]"""
import json, os, subprocess, sys, glob, collections
from ue2_pkg import Pacote
TILES = sys.argv[1:] or ['20_22', '20_21', '20_23', '19_22', '21_22', '19_21', '21_21', '19_23', '21_23']
UMODEL = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/ferramentas para l2/umodel_materials.exe"
CLI = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/L2 IKARUS PVP 300x/Cliente Interlud 300x"
OUT = os.path.abspath('raw_dion/malhas'); os.makedirs(OUT, exist_ok=True)
malha_pk = {}; usos = collections.Counter(); sem = set()
for t in TILES:
    p = Pacote('raw_dion/%s_dec.unr' % t); pk = {-(i + 1): im['nome'] for i, im in enumerate(p.imports) if im['classe'] == 'Package'}
    for im in p.imports:
        if im['classe'] == 'StaticMesh': malha_pk[im['nome']] = pk.get(im['grupo'], '?')
    for a in json.load(open('raw_dion/atores_%s.json' % t)).get('StaticMeshActor', []): usos[a['malha']] += 1
    for m in json.load(open('raw_dion/atores_%s.json' % t)).get('Mover', []):
        if m.get('malha') and m['malha'] != 'None': usos[m['malha']] += 1
indice = json.load(open('raw_dion/indice_usx.json'))      # malha -> [.usx] (indexar_usx.py)
arquivos = {f.lower(): f for f in os.listdir(CLI + '/staticmeshes')}
usx = set(); sem_usx = []
for m in usos:
    pk = malha_pk.get(m, '?').lower() + '.usx'
    if pk in arquivos and m.lower() in [x.lower() for x in indice.get(m.lower(), [pk])] + [pk]: usx.add(arquivos[pk]); continue
    c = indice.get(m.lower())
    if c: usx.add(c[0])
    else: sem_usx.append(m)
print(len(usos), 'malhas em', len(usx), 'arquivos .usx;', len(sem_usx), 'sem arquivo em nenhum .usx')
for f in sorted(usx):
    subprocess.run([UMODEL, '-path=' + CLI, '-export', '-gltf', '-png', '-nooverwrite', '-out=' + OUT, CLI + '/staticmeshes/' + f], capture_output=True)
falta = sem_usx
mapa = {}
for g in glob.glob(OUT + '/**/StaticMesh/*.gltf', recursive=True): mapa.setdefault(os.path.basename(g)[:-5].lower(), os.path.normpath(g).replace(os.sep, '/'))
json.dump({m: malha_pk.get(m) for m in usos}, open('raw_dion/malha_pacote.json', 'w'), indent=0)
json.dump(mapa, open('raw_dion/malha_arquivo.json', 'w'), indent=0)
faltam = [m for m in usos if m.lower() not in mapa]
print('pacotes sem .usx no cliente:', falta); print('malhas exportadas:', len(mapa), '| usadas sem arquivo:', len(faltam), '(', sum(usos[m] for m in faltam), 'instancias )', faltam[:25])
