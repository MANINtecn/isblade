"""Monta a cidade de Dion (tile 20_22): coloca cada casa, arvore, muro e pedra do mapa L2 na posicao/giro/escala exatos e junta tudo por material num GLB.
Entrada: raw_dion/atores_20_22.json (extrair_atores.py), raw_dion/malha_arquivo.json + raw_dion/malhas (exportar_malhas.py: UModel glTF + .mat + PNG).
Saida: assets/dion/dion_cidade.glb e assets/dion/dion_cidade.json.
Conversao (conferida contra a geodata, IoU castelo 0,48): glTF do UModel (gx,gy,gz) -> UE (gx,gz,gy)*100 uu -> gira (matriz de rotacao da UE) e escala (DrawScale) -> soma Location
-> jogo: X=(ux-OX)/50, Y=(uz-OZ)/50, Z=(uy-OY)/50 (a mesma do chao: montar_chao.py).   Uso (tools/dion): python montar_cidade.py [tile=20_22]"""
import json, glob, os, io, re, struct, sys
import numpy as np
from PIL import Image
from lib_malha import ler_gltf, matriz_ue

TILE = sys.argv[1] if len(sys.argv) > 1 else '20_22'
OX, OY, OZ = 16169.0, 146880.0, -1966.0
TEXMAX = 512
IGNORA = ('dummy', 'zoneportal', 'antiportal', 'theme_transparency', 'invisible', 'collision', 'light_glow', 'flare')

atores = json.load(open('raw_dion/atores_%s.json' % TILE))
arq = json.load(open('raw_dion/malha_arquivo.json'))

# --- materiais: nome -> (png difuso, tem opacidade)
png = {}
for f in glob.glob('raw_dion/malhas/**/Texture/*.png', recursive=True): png.setdefault(os.path.splitext(os.path.basename(f))[0].lower(), f)
mats = {}
for f in glob.glob('raw_dion/malhas/**/Shader/*.mat', recursive=True) + glob.glob('raw_dion/malhas/**/Material/*.mat', recursive=True):
    d = {}
    for l in open(f, encoding='utf-8', errors='replace'):
        if '=' in l: k, v = l.strip().split('=', 1); d[k] = v
    mats.setdefault(os.path.splitext(os.path.basename(f))[0].lower(), d)

def textura_de(mat):
    m = mats.get(mat.lower())
    cand = []
    if m:
        cand += [m.get('Diffuse'), m.get('Texture'), m.get('Opacity')]
    cand += [mat, re.sub(r'_\d+$', '', mat), re.sub(r'(_a)?\d*$', '', mat)]
    for c in cand:
        if c and c.lower() in png: return png[c.lower()], bool(m and ('Opacity' in m))
    return None, False

# --- instancias
cache = {}
def malha(nome):
    if nome not in cache: cache[nome] = ler_gltf(arq[nome.lower()])
    return cache[nome]

por_mat = {}      # material -> listas
n_inst = 0; n_pular = 0
for a in atores['StaticMeshActor'] + atores.get('Mover', []):      # portas e portoes (Mover) entram fechados, como no L2
    try: prims = malha(a['malha'])
    except KeyError: n_pular += 1; continue
    esc = float(a['esc']) if a.get('esc') else 1.0
    M = matriz_ue(*(a.get('rot') or [0, 0, 0])); loc = np.array([a['x'], a['y'], a['z']], np.float64)
    for p in prims:
        if p['mat'].lower().startswith(IGNORA): continue
        pos = p['pos'].astype(np.float64) * 100.0
        ue = np.stack([pos[:, 0], pos[:, 2], pos[:, 1]], 1)              # glTF -> UE (gx, gz, gy)
        ue = (ue * esc) @ M + loc
        game = np.stack([(ue[:, 0] - OX) / 50.0, (ue[:, 2] - OZ) / 50.0, (ue[:, 1] - OY) / 50.0], 1).astype(np.float32)
        if p['nor'] is not None:
            nr = np.stack([p['nor'][:, 0], p['nor'][:, 2], p['nor'][:, 1]], 1).astype(np.float64) @ M
            nr = np.stack([nr[:, 0], nr[:, 2], nr[:, 1]], 1).astype(np.float32)
        else: nr = np.zeros_like(game); nr[:, 1] = 1
        uv = p['uv'] if p['uv'] is not None else np.zeros((len(game), 2), np.float32)
        d = por_mat.setdefault(p['mat'], {'pos': [], 'nor': [], 'uv': [], 'idx': [], 'n': 0})
        d['pos'].append(game); d['nor'].append(nr); d['uv'].append(uv.astype(np.float32)); d['idx'].append(p['idx'].astype(np.uint32) + d['n']); d['n'] += len(game)
    n_inst += 1
print('instancias', n_inst, 'puladas', n_pular, 'materiais', len(por_mat))

# --- GLB
blob = bytearray(); vistas = []; acessores = []; imagens = []; texturas = []; materiais = []; primitivas = []
def add_view(b, alvo=None):
    while len(blob) % 4: blob.append(0)
    vistas.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(b), **({'target': alvo} if alvo else {})}); blob.extend(b); return len(vistas) - 1
def add_acc(vi, comp, cnt, tipo, mn=None, mx=None):
    a = {'bufferView': vi, 'componentType': comp, 'count': cnt, 'type': tipo}
    if mn is not None: a['min'] = mn; a['max'] = mx
    acessores.append(a); return len(acessores) - 1
tris = verts = 0; sem_tex = []; usadas = {}
for nome, d in sorted(por_mat.items()):
    if not d['pos'] or d['n'] == 0: continue
    pos = np.concatenate(d['pos']); nor = np.concatenate(d['nor']); uv = np.concatenate(d['uv']); idx = np.concatenate(d['idx']); tris += len(idx) // 3; verts += len(pos)
    caminho, opaco = textura_de(nome); mat = {'name': nome, 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}, 'doubleSided': True}
    if caminho:
        if caminho not in usadas:
            im = Image.open(caminho); tem_alfa = im.mode in ('RGBA', 'LA', 'P') and ('A' in im.getbands() or 'transparency' in im.info)
            im = im.convert('RGBA' if tem_alfa else 'RGB')
            if tem_alfa and np.asarray(im.getchannel('A')).min() > 250: im = im.convert('RGB'); tem_alfa = False
            if max(im.size) > TEXMAX: im.thumbnail((TEXMAX, TEXMAX), Image.LANCZOS)
            b = io.BytesIO(); (im.save(b, 'PNG') if tem_alfa else im.save(b, 'JPEG', quality=86)); vi = add_view(b.getvalue())
            imagens.append({'bufferView': vi, 'mimeType': 'image/png' if tem_alfa else 'image/jpeg'}); texturas.append({'source': len(imagens) - 1, 'sampler': 0}); usadas[caminho] = (len(texturas) - 1, tem_alfa)
        ti, alfa = usadas[caminho]; mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': ti}
        if alfa or opaco: mat['alphaMode'] = 'MASK'; mat['alphaCutoff'] = 0.5
    else: sem_tex.append(nome); mat['pbrMetallicRoughness']['baseColorFactor'] = [0.6, 0.6, 0.6, 1]
    materiais.append(mat)
    ap = add_acc(add_view(pos.tobytes(), 34962), 5126, len(pos), 'VEC3', pos.min(0).tolist(), pos.max(0).tolist())
    an = add_acc(add_view(nor.tobytes(), 34962), 5126, len(nor), 'VEC3'); au = add_acc(add_view(uv.tobytes(), 34962), 5126, len(uv), 'VEC2')
    ai = add_acc(add_view(idx.astype(np.uint32).tobytes(), 34963), 5125, len(idx), 'SCALAR')
    primitivas.append({'attributes': {'POSITION': ap, 'NORMAL': an, 'TEXCOORD_0': au}, 'indices': ai, 'material': len(materiais) - 1})
gltf = {'asset': {'version': '2.0', 'generator': 'montar_cidade.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'DION_CIDADE_' + TILE}], 'meshes': [{'primitives': primitivas}],
        'materials': materiais, 'textures': texturas, 'images': imagens, 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
        'accessors': acessores, 'bufferViews': vistas, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
while len(blob) % 4: blob.append(0)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(blob), b'BIN\x00') + bytes(blob)
open('../../assets/dion/dion_cidade_%s.glb' % TILE, 'wb').write(glb)
print('GLB %.1f MB | %d materiais (%d sem textura) | %d texturas | %d vertices, %d triangulos' % (len(glb) / 1048576, len(materiais), len(sem_tex), len(imagens), verts, tris))
print('sem textura (primeiros):', sem_tex[:15])
