"""Geometria de BSP (pinceis aditivos / Brush) do mapa de Dion que o StaticMeshActor nao traz: pisos, ruas, paredes e muros do castelo, interiores.
Le cada Brush do mapa (Location, Rotation, PrePivot) -> Model -> Polys (FPoly), coloca no mundo, triangula, usa a textura do poligono e junta por material.
Saida: assets/dion/dion_brushes_<tile>.glb.   Uso (tools/dion): python montar_brushes.py [tile=20_22]"""
import sys, io, os, glob, json, struct, re, collections
import numpy as np
from PIL import Image
from ue2_pkg import Pacote
from polys_ue2 import ler_polys
from lib_malha import matriz_ue
from escala import K

TILE = sys.argv[1] if len(sys.argv) > 1 else '20_22'
OX, OY, OZ = 16169.0, 146880.0, -1966.0
IGNORA = ('none', 'antiportal', 'zoneportal', 'base', 'haze', 'skyback', 'cloud', 'water', 'ssq_', 'invisible', 'collision')
pk = Pacote('raw_dion/%s_dec.unr' % TILE); d = pk.d
png = {}
for f in glob.glob('raw_dion/**/Texture/*.png', recursive=True): png.setdefault(os.path.splitext(os.path.basename(f))[0].lower(), f)

def enc(v):
    b = v & 0x3F; v >>= 6; out = [b | (0x40 if v else 0)]
    while v: c = v & 0x7F; v >>= 7; out.append(c | (0x80 if v else 0))
    return bytes(out)
polys_idx = {i + 1: e for i, e in enumerate(pk.exports) if e['classe'] == 'Polys' and e['tam'] > 0}
enc_map = {i: enc(i) for i in polys_idx}
def polys_do_modelo(mi):
    e = pk.exports[mi - 1]; raw = d[e['off']:e['off'] + min(e['tam'], 400)]
    hits = [(raw.find(b), i) for i, b in enc_map.items() if raw.find(b) >= 0]
    p55 = [i for k, i in hits if k == 55]
    return (p55 or [i for _, i in hits] or [None])[0]

# portas das lojas/casas (pares de Mover H_Door_MV_01): o painel de tabuas que tapava a entrada era a parede da frente do casco interno (BSP sem o buraco da porta, que o CSG subtrativo abria)
_at = json.load(open('raw_dion/atores_%s.json' % TILE)); _d = [((m['x'] - OX) / 50.0, (m['y'] - OY) / 50.0) for m in _at['Mover'] if m['malha'] == 'H_Door_MV_01']
PORTAS = []
for i_, a_ in enumerate(_d):
    for b_ in _d[i_ + 1:]:
        if np.hypot(a_[0] - b_[0], a_[1] - b_[1]) < 2.5: PORTAS.append(((a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2))
print('portas (pares):', len(PORTAS), [tuple(round(v, 1) for v in p_) for p_ in PORTAS])
por_mat = {}; n_brush = n_poly = n_porta = 0; sem_tex = collections.Counter()
for e in pk.exports:
    if e['classe'] != 'Brush' or e['tam'] <= 0: continue
    pr = pk.propriedades(e)
    if pr.get('CsgOper') != 1 or 'Brush' not in pr: continue                    # so os aditivos (os subtrativos escavam o BSP, nao desenham)
    pi = polys_do_modelo(pr['Brush'])
    if not pi: continue
    try: polys = ler_polys(pk, polys_idx[pi])
    except Exception: continue
    loc = np.array(pr.get('Location', (0, 0, 0)), np.float64); pre = np.array(pr.get('PrePivot', (0, 0, 0)), np.float64)
    M = matriz_ue(*(pr.get('Rotation') or (0, 0, 0))); n_brush += 1
    for q in polys:
        nm = pk.nome_ref(q['mat'])
        if nm.lower().startswith(IGNORA) or (q['flags'] & 1): continue
        v = (np.array(q['v'], np.float64) - pre) @ M + loc                      # UE: x,y,z
        base = (np.array(q['base'], np.float64) - pre) @ M + loc
        tu = np.array(q['tu']) @ M; tv = np.array(q['tv']) @ M
        cam = png.get(nm.lower())
        if cam is None: sem_tex[nm] += 1; continue
        w, h = Image.open(cam).size
        uv = np.stack([((v - base) @ tu) / w, ((v - base) @ tv) / h], 1).astype(np.float32)
        game = np.stack([(v[:, 0] - OX) / 50.0, (v[:, 2] - OZ) / 50.0, (v[:, 1] - OY) / 50.0], 1).astype(np.float32)       # (a escala K entra mais abaixo)
        a, b, c = game[0], game[1], game[2]; nr = np.cross(b - a, c - a); nl = np.linalg.norm(nr)
        if nl > 0 and abs(nr[1] / nl) < 0.6 and any(game[:, 0].min() - 1.1 <= px <= game[:, 0].max() + 1.1 and game[:, 2].min() - 1.1 <= pz <= game[:, 2].max() + 1.1 for px, pz in PORTAS): n_porta += 1; continue      # parede da frente que tapava a porta
        game = game * K; a, b, c = game[0], game[1], game[2]; nr = np.cross(b - a, c - a); nl = np.linalg.norm(nr)
        nr = (nr / nl) if nl > 0 else np.array([0, 1, 0], np.float32)
        dd = por_mat.setdefault(nm, {'pos': [], 'nor': [], 'uv': [], 'idx': [], 'n': 0})
        k = len(game); tri = np.array([[0, i, i + 1] for i in range(1, k - 1)], np.uint32).reshape(-1) + dd['n']
        dd['pos'].append(game); dd['nor'].append(np.tile(nr.astype(np.float32), (k, 1))); dd['uv'].append(uv); dd['idx'].append(tri); dd['n'] += k; n_poly += 1
print('paredes de porta removidas:', n_porta); print('brushes aditivos', n_brush, 'poligonos', n_poly, 'materiais', len(por_mat), 'sem textura:', dict(sem_tex))

blob = bytearray(); vistas = []; acessores = []; imagens = []; texturas = []; materiais = []; primitivas = []
def add_view(b, alvo=None):
    while len(blob) % 4: blob.append(0)
    vistas.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(b), **({'target': alvo} if alvo else {})}); blob.extend(b); return len(vistas) - 1
def add_acc(vi, comp, cnt, tipo, mn=None, mx=None):
    a = {'bufferView': vi, 'componentType': comp, 'count': cnt, 'type': tipo}
    if mn is not None: a['min'] = mn; a['max'] = mx
    acessores.append(a); return len(acessores) - 1
for nome, dd in sorted(por_mat.items()):
    pos = np.concatenate(dd['pos']); nor = np.concatenate(dd['nor']); uv = np.concatenate(dd['uv']); idx = np.concatenate(dd['idx'])
    im = Image.open(png[nome.lower()]); tem_alfa = 'A' in im.getbands() and not re.search(r'wall|floor|roof|intop', nome, re.I); im = im.convert('RGBA' if tem_alfa else 'RGB')
    if max(im.size) > 512: im.thumbnail((512, 512), Image.LANCZOS)
    b = io.BytesIO(); (im.save(b, 'PNG') if tem_alfa else im.save(b, 'JPEG', quality=86)); vi = add_view(b.getvalue())
    imagens.append({'bufferView': vi, 'mimeType': 'image/png' if tem_alfa else 'image/jpeg'}); texturas.append({'source': len(imagens) - 1, 'sampler': 0})
    mat = {'name': nome, 'pbrMetallicRoughness': {'baseColorTexture': {'index': len(texturas) - 1}, 'metallicFactor': 0, 'roughnessFactor': 1}, 'doubleSided': True}
    if tem_alfa: mat['alphaMode'] = 'MASK'; mat['alphaCutoff'] = 0.5
    materiais.append(mat)
    ap = add_acc(add_view(pos.tobytes(), 34962), 5126, len(pos), 'VEC3', pos.min(0).tolist(), pos.max(0).tolist())
    an = add_acc(add_view(nor.tobytes(), 34962), 5126, len(nor), 'VEC3'); au = add_acc(add_view(uv.tobytes(), 34962), 5126, len(uv), 'VEC2')
    ai = add_acc(add_view(idx.astype(np.uint32).tobytes(), 34963), 5125, len(idx), 'SCALAR')
    primitivas.append({'attributes': {'POSITION': ap, 'NORMAL': an, 'TEXCOORD_0': au}, 'indices': ai, 'material': len(materiais) - 1})
gltf = {'asset': {'version': '2.0', 'generator': 'montar_brushes.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'DION_BRUSHES_' + TILE}], 'meshes': [{'primitives': primitivas}],
        'materials': materiais, 'textures': texturas, 'images': imagens, 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
        'accessors': acessores, 'bufferViews': vistas, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
while len(blob) % 4: blob.append(0)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(blob), b'BIN\x00') + bytes(blob)
open('../../assets/dion/dion_brushes_%s.glb' % TILE, 'wb').write(glb)
print('GLB %.2f MB' % (len(glb) / 1048576))
