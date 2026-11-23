"""Portoes e portas moveis (Mover) do castelo e da fortaleza de Dion como PECAS SEPARADAS (antes iam fundidas no dion.glb, fechadas e sem colisao).
Cada Mover vira um no 'PORTAO_<id>' (id = L2ServerObjectID do proprio mapa: castelo 1-9, fortaleza 17-28) com a geometria na pose FECHADA, em coordenadas locais de Dion (ja com a escala K).
No JSON: a pose ABERTA como transformacao rigida (t + quaternion, ajustada por Kabsch entre os vertices fechados e abertos, a mesma conta do KeyPos/KeyRot da UE)
e a caixa de colisao (centro, eixo, meia-largura, meia-espessura, y min/max) para o cliente barrar a passagem enquanto o portao estiver fechado.
Saida: assets/maps/dion/dion_portoes.glb e dion_portoes.json.   Uso (tools/dion): python montar_portoes.py [tile=20_22]"""
import json, glob, os, io, re, struct, sys
import numpy as np
from PIL import Image
from escala import K
from lib_malha import ler_gltf, matriz_ue

TILE = sys.argv[1] if len(sys.argv) > 1 else '20_22'
OX, OY, OZ = 16169.0, 146880.0, -1966.0
TEXMAX = 512
IGNORA = ('dummy', 'zoneportal', 'antiportal', 'theme_transparency', 'invisible', 'collision', 'light_glow', 'flare')
PULA = ('h_door_mv_01',)                       # portas das casas/lojas: ja entram abertas no mapa (montar_cidade.py)
NOMES = {'main_gate_door_r': ('Portao principal do castelo', 'portao'), 'front_tower_door': ('Portao da torre da frente', 'portao'),
         'back_tower_door': ('Porta da torre de tras', 'porta'), 'castle_wall_back_doortower_door': ('Portao do muro de tras', 'portao'),
         'right_brokenwall_a': ('Muralha quebravel (direita)', 'muralha'), 'left_brokenwall_a': ('Muralha quebravel (esquerda)', 'muralha'),
         'fort02_wall_door': ('Portao da fortaleza', 'portao'), 'fort02_indoor': ('Porta interna da fortaleza', 'porta')}

atores = json.load(open('raw_dion/atores_%s.json' % TILE))
arq = json.load(open('raw_dion/malha_arquivo.json'))
png = {}
for f in glob.glob('raw_dion/malhas/**/Texture/*.png', recursive=True): png.setdefault(os.path.splitext(os.path.basename(f))[0].lower(), f)
mats = {}
for f in glob.glob('raw_dion/malhas/**/Shader/*.mat', recursive=True) + glob.glob('raw_dion/malhas/**/Material/*.mat', recursive=True):
    d = {}
    for l in open(f, encoding='utf-8', errors='replace'):
        if '=' in l: k, v = l.strip().split('=', 1); d[k] = v
    mats.setdefault(os.path.splitext(os.path.basename(f))[0].lower(), d)
def textura_de(mat):
    m = mats.get(mat.lower()); cand = []
    if m: cand += [m.get('Diffuse'), m.get('Texture'), m.get('Opacity')]
    cand += [mat, re.sub(r'_\d+$', '', mat), re.sub(r'(_a)?\d*$', '', mat)]
    for c in cand:
        if c and c.lower() in png: return png[c.lower()], bool(m and ('Opacity' in m))
    return None, False

def pose(prims, a, aberto):
    """vertices (por primitiva) em coordenadas do jogo (x, altura, z) * K, na pose fechada ou aberta"""
    esc = float(a['esc']) if a.get('esc') else 1.0
    e3 = np.array(a['esc3'] if a.get('esc3') else (1.0, 1.0, 1.0), np.float64)
    rot_a = list(a.get('rot') or [0, 0, 0]); loc = np.array([a['x'], a['y'], a['z']], np.float64)
    if aberto:
        kr = (a.get('keyrot') or {}).get('1'); kp = (a.get('keypos') or {}).get('1')
        if kr: rot_a = [rot_a[i] + kr[i] for i in range(3)]
        if kp: loc = loc + np.array(kp, np.float64)
    M = matriz_ue(*rot_a); out = []; nors = []
    for p in prims:
        pos = p['pos'].astype(np.float64) * 100.0
        ue = np.stack([pos[:, 0], pos[:, 2], pos[:, 1]], 1)
        ue = (ue * esc * e3) @ M + loc
        out.append(np.stack([(ue[:, 0] - OX) / 50.0, (ue[:, 2] - OZ) / 50.0, (ue[:, 1] - OY) / 50.0], 1) * K)
        if p['nor'] is not None:
            nr = (np.stack([p['nor'][:, 0], p['nor'][:, 2], p['nor'][:, 1]], 1).astype(np.float64) / e3) @ M; nors.append(np.stack([nr[:, 0], nr[:, 2], nr[:, 1]], 1).astype(np.float32))
        else: nors.append(None)
    return out, nors

portoes = []; vistos = set()
for a in atores['Mover']:
    nm = a['malha'].lower()
    if nm in PULA or a.get('apagado'): continue
    prims = [p for p in ler_gltf(arq[nm]) if not p['mat'].lower().startswith(IGNORA)] if nm in arq else []
    if not prims: continue
    fech, nfech = pose(prims, a, False); abre = pose(prims, a, True)[0] if (a.get('keyrot') or a.get('keypos')) else None
    C = np.concatenate(fech); gid = int(a.get('id_servidor') or (1000 + len(portoes)))
    if gid in vistos: gid = 1000 + len(portoes)
    vistos.add(gid)
    g = {'id': gid, 'malha': a['malha'], 'nome': NOMES.get(nm, (a['malha'], 'portao'))[0], 'tipo': NOMES.get(nm, (a['malha'], 'portao'))[1],
         'grupo': 'castelo' if C[:, 0].mean() > 0 else 'forte', 'aberto': None}
    if abre is not None:
        O = np.concatenate(abre); cc, co = C.mean(0), O.mean(0); H = (C - cc).T @ (O - co); U, S, Vt = np.linalg.svd(H); d = np.sign(np.linalg.det(Vt.T @ U.T))
        R = Vt.T @ np.diag([1, 1, d]) @ U.T; t = co - R @ cc; res = np.abs((C @ R.T + t) - O).max()
        # quaternion (x, y, z, w) da matriz R
        tr = np.trace(R)
        if tr > 0: s_ = np.sqrt(tr + 1) * 2; q = [(R[2, 1] - R[1, 2]) / s_, (R[0, 2] - R[2, 0]) / s_, (R[1, 0] - R[0, 1]) / s_, .25 * s_]
        elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]: s_ = np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2; q = [.25 * s_, (R[0, 1] + R[1, 0]) / s_, (R[0, 2] + R[2, 0]) / s_, (R[2, 1] - R[1, 2]) / s_]
        elif R[1, 1] > R[2, 2]: s_ = np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2; q = [(R[0, 1] + R[1, 0]) / s_, .25 * s_, (R[1, 2] + R[2, 1]) / s_, (R[0, 2] - R[2, 0]) / s_]
        else: s_ = np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2; q = [(R[0, 2] + R[2, 0]) / s_, (R[1, 2] + R[2, 1]) / s_, .25 * s_, (R[1, 0] - R[0, 1]) / s_]
        g['aberto'] = {'t': [round(float(v), 4) for v in t], 'q': [round(float(v), 6) for v in q], 'erro': round(float(res), 3)}
    # caixa de colisao: eixo principal no plano horizontal
    xz = C[:, [0, 2]]; mu = xz.mean(0); w, V = np.linalg.eigh(np.cov((xz - mu).T)); u = V[:, 1]; v = V[:, 0]
    pa = (xz - mu) @ u; pb = (xz - mu) @ v; cen = mu + u * (pa.max() + pa.min()) / 2 + v * (pb.max() + pb.min()) / 2
    g['col'] = {'cx': round(float(cen[0]), 3), 'cz': round(float(cen[1]), 3), 'ux': round(float(u[0]), 4), 'uz': round(float(u[1]), 4), 'a': round(float((pa.max() - pa.min()) / 2), 3),
                'b': round(float(max((pb.max() - pb.min()) / 2, .3)), 3), 'y0': round(float(C[:, 1].min()), 3), 'y1': round(float(C[:, 1].max()), 3)}
    g['_prims'] = (prims, fech, nfech); portoes.append(g)
print('portoes', len(portoes), 'com pose aberta', sum(1 for g in portoes if g['aberto']), '| maior erro do ajuste rigido', max([g['aberto']['erro'] for g in portoes if g['aberto']] or [0]))

# --- GLB: um no (e uma malha) por portao
blob = bytearray(); vistas_ = []; acessores = []; imagens = []; texturas = []; materiais = []; malhas = []; nos = []; usadas = {}; mat_idx = {}
def add_view(b, alvo=None):
    while len(blob) % 4: blob.append(0)
    vistas_.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(b), **({'target': alvo} if alvo else {})}); blob.extend(b); return len(vistas_) - 1
def add_acc(vi, comp, cnt, tipo, mn=None, mx=None):
    a = {'bufferView': vi, 'componentType': comp, 'count': cnt, 'type': tipo}
    if mn is not None: a['min'] = mn; a['max'] = mx
    acessores.append(a); return len(acessores) - 1
def material(nome):
    if nome in mat_idx: return mat_idx[nome]
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
    else: mat['pbrMetallicRoughness']['baseColorFactor'] = [0.6, 0.6, 0.6, 1]
    materiais.append(mat); mat_idx[nome] = len(materiais) - 1; return mat_idx[nome]
tris = 0
for g in portoes:
    prims, fech, nfech = g.pop('_prims'); primitivas = []
    for p, game, nrm in zip(prims, fech, nfech):
        if len(game) == 0 or len(p['idx']) == 0: continue
        game = game.astype(np.float32)
        nr = nrm if nrm is not None else np.tile(np.array([0, 1, 0], np.float32), (len(game), 1))
        uv = (p['uv'] if p['uv'] is not None else np.zeros((len(game), 2))).astype(np.float32); idx = p['idx'].astype(np.uint32); tris += len(idx) // 3
        ap = add_acc(add_view(game.tobytes(), 34962), 5126, len(game), 'VEC3', game.min(0).tolist(), game.max(0).tolist()); an = add_acc(add_view(nr.astype(np.float32).tobytes(), 34962), 5126, len(nr), 'VEC3')
        au = add_acc(add_view(uv.tobytes(), 34962), 5126, len(uv), 'VEC2'); ai = add_acc(add_view(idx.tobytes(), 34963), 5125, len(idx), 'SCALAR')
        primitivas.append({'attributes': {'POSITION': ap, 'NORMAL': an, 'TEXCOORD_0': au}, 'indices': ai, 'material': material(p['mat'])})
    malhas.append({'name': 'PORTAO_%d' % g['id'], 'primitives': primitivas}); nos.append({'mesh': len(malhas) - 1, 'name': 'PORTAO_%d' % g['id']}); g['node'] = 'PORTAO_%d' % g['id']
gltf = {'asset': {'version': '2.0', 'generator': 'montar_portoes.py'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nos)))}], 'nodes': nos, 'meshes': malhas,
        'materials': materiais, 'textures': texturas, 'images': imagens, 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
        'accessors': acessores, 'bufferViews': vistas_, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
while len(blob) % 4: blob.append(0)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(blob), b'BIN\x00') + bytes(blob)
open('../../assets/maps/dion/dion_portoes.glb', 'wb').write(glb)
json.dump({'versao': int(os.path.getmtime('../../assets/maps/dion/dion_portoes.glb')), 'escala': K, 'portoes': portoes}, open('../../assets/maps/dion/dion_portoes.json', 'w'), indent=1)
print('GLB %.2f MB | %d triangulos' % (len(glb) / 1048576, tris))
for g in portoes: print(g['id'], g['grupo'], g['tipo'], g['nome'], 'col a=%.1f b=%.1f y %.1f..%.1f' % (g['col']['a'], g['col']['b'], g['col']['y0'], g['col']['y1']), 'aberto' if g['aberto'] else '-')
