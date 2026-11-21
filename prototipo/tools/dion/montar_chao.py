"""Monta o chao de Dion (tile 20_22) a partir da geodata real: malha + textura pintada por regras (as mascaras de mistura do L2 nao vem no cliente).
Saida: assets/dion/dion_chao.glb (malha 257x257 + textura JPEG 4096) e assets/dion/dion_chao.json (origem e escala).
Coordenadas do jogo: X leste = (ux - OX)/50, Y cima = (uz - OZ)/50, Z sul = (uy - OY)/50 (1 unidade = 1 m; a praca de Dion e' a origem).
Uso (na pasta tools/dion): python montar_chao.py"""
import numpy as np, json, struct, cv2, io
from PIL import Image
from scipy import ndimage as ndi

TX, TY = 20, 22
UX0, UY0 = (TX - 20) * 32768, (TY - 18) * 32768           # canto do tile em uu
OX, OY, OZ = 16169.0, 146880.0, -1966.0                     # origem do jogo = MusicVolume 202201 (cidade de Dion)
TEX = 4096; PASSO = 8
alt = np.load('raw_dion/alt_20_22.npy').astype(np.float32)   # [celulaX, celulaY], uu (1 celula = 16 uu)

# --- limpa muros/cercas finos da geodata (casas e muros sao props); mantem o relevo
alt = ndi.grey_opening(alt, size=(25, 25))          # tira torres e muros estreitos (props); platos largos (patio do castelo, praca) ficam
liso = ndi.median_filter(alt, size=11, mode='nearest')
liso = ndi.gaussian_filter(liso, 2.0)
macro = ndi.gaussian_filter(liso, 6.0)          # relevo sem degraus de muro/casa: usado para declive e para escolher rocha

# --- malha: media por bloco PASSO x PASSO
n = 2048 // PASSO + 1
bloco = liso[:2048, :2048].reshape(2048 // PASSO, PASSO, 2048 // PASSO, PASSO).mean(axis=(1, 3))
H = np.pad(bloco, ((0, 1), (0, 1)), mode='edge')            # n x n alturas, [i = x, j = y]
ux = UX0 + np.arange(n) * PASSO * 16.0
uy = UY0 + np.arange(n) * PASSO * 16.0
GX, GZ = np.meshgrid((ux - OX) / 50.0, (uy - OY) / 50.0, indexing='ij')
GY = (H - OZ) / 50.0
pos = np.stack([GX, GY, GZ], -1).reshape(-1, 3).astype(np.float32)
dx = np.gradient(GY, axis=0) / np.gradient(GX, axis=0)
dz = np.gradient(GY, axis=1) / np.gradient(GZ, axis=1)
nor = np.stack([-dx, np.ones_like(dx), -dz], -1)
nor /= np.linalg.norm(nor, axis=-1, keepdims=True)
nor = nor.reshape(-1, 3).astype(np.float32)
uv = np.stack([np.repeat(np.arange(n) / (n - 1.0), n), np.tile(np.arange(n) / (n - 1.0), n)], -1).astype(np.float32)   # u = x leste, v = y sul (para baixo na imagem)
i, j = np.meshgrid(np.arange(n - 1), np.arange(n - 1), indexing='ij')
a = (i * n + j).ravel(); b = a + 1; c = a + n; d = c + 1
idx = np.stack([a, b, c, b, d, c], -1).reshape(-1).astype(np.uint32)

# --- textura: pinta por regra
def tex(nome):
    return np.asarray(Image.open('raw_dion/tex/t_dion/Texture/%s.png' % nome).convert('RGB'), np.float32)
T = {k: tex(k) for k in ('DI_S4', 'DI_S5', 'DI_S10', 'DI_G2', 'DI_G3', 'DI_C5', 'DI_C')}
T['G_floor01'] = tex('G_floor01')

def amostra(img, tam_m, mx, my):
    h, w = img.shape[:2]
    mapx = ((mx / tam_m) % 1.0 * w).astype(np.float32)
    mapy = ((my / tam_m) % 1.0 * h).astype(np.float32)
    return cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)

rng = np.random.default_rng(22)
def fbm(shape, escalas):
    s = np.zeros(shape, np.float32)
    for k, esc in enumerate(escalas):
        g = rng.random((max(2, int(shape[0] / esc)) + 2, max(2, int(shape[1] / esc)) + 2)).astype(np.float32)
        s += cv2.resize(g, (shape[1], shape[0]), interpolation=cv2.INTER_CUBIC) / (1 + k)
    s -= s.min()
    return s / s.max()

def suave(a_, b_, x):
    t = np.clip((x - a_) / (b_ - a_), 0, 1)
    return t * t * (3 - 2 * t)

Hh = cv2.resize(macro, (TEX, TEX), interpolation=cv2.INTER_CUBIC)         # altura (uu) por pixel (suavizada)
metros_px = 32768 / TEX / 50.0
inc = np.hypot(*np.gradient(Hh / 50.0)) / metros_px                         # declive (m de altura por m de distancia)
rel = ndi.gaussian_filter(Hh, 40) - ndi.gaussian_filter(Hh, 220)            # vale/rio < 0, serra > 0 (uu)
F1 = fbm((TEX, TEX), (300, 120, 40, 14))
F2 = fbm((TEX, TEX), (200, 70, 22))
F3 = fbm((TEX, TEX), (500, 160))
# --- ruas e praca de pedra (G_floor01): chao proximo das construcoes da cidade (as mascaras de pintura do L2 nao vem no cliente)
atores = json.load(open('raw_dion/atores_20_22.json'))['StaticMeshActor']
rua_raiz = np.zeros((TEX, TEX), np.uint8)
for at in atores:
    nm = at['malha'].lower()
    if not (nm.startswith(('dion_nv', 'o_well', 'o_tank', 'o_loadlamp', 'dion_house', 'h_')) ): continue
    px_ = int((at['x'] - UX0) / 32768 * TEX); py_ = int((at['y'] - UY0) / 32768 * TEX)
    cv2.circle(rua_raiz, (px_, py_), int(11.0 / metros_px), 255, -1)
rua = ndi.gaussian_filter(rua_raiz.astype(np.float32) / 255.0, 6.0 / metros_px)
rua = suave(.30, .75, rua) * suave(.22, .06, inc)                         # so onde o terreno e plano
rocha = np.maximum(suave(.38, .85, inc), suave(900, 2400, rel))
verde = suave(.50, .72, F1) * suave(.45, -.10, inc) * (.55 + .45 * suave(60, -180, rel))
terra2 = suave(.35, .65, F2)

# --- pintura REAL do L2: as mascaras alfa das camadas vem em textures/T_20_22.utx (UModel -> raw_dion/terreno_utx). Ordem e textura de cada camada = ordem dos imports do mapa.
def alfa(nome):
    a = np.asarray(Image.open('raw_dion/terreno_utx/T_20_22/Texture/20_22_%s.png' % nome).convert('L'), np.float32) / 255.0
    return cv2.resize(a, (TEX, TEX), interpolation=cv2.INTER_CUBIC).clip(0, 1)
def tex2(nome):
    import glob
    f = glob.glob('raw_dion/tex_brush/**/%s.png' % nome, recursive=True)
    return np.asarray(Image.open(f[0]).convert('RGB'), np.float32)
T['GUG03'] = tex2('GUG03')
CAMADAS = [('DI_S4', 'S1', 7.0), ('DI_S10', 'S2', 9.0), ('DI_G2', 'G', 5.0), ('DI_G2', 'G1', 6.0), ('DI_G3', 'G2', 7.0), ('DI_C5', 'C', 9.0), ('DI_S5', 'R', 6.0), ('G_floor01', 'ST01', 4.0), ('GUG03', 'S1_C', 6.0)]
AL = [alfa(a) for _, a, _ in CAMADAS]
luz = np.load('raw_dion/luz_20_22.npy')[4].astype(np.float32); luz = cv2.resize(luz, (TEX, TEX), interpolation=cv2.INTER_CUBIC) / max(1.0, np.percentile(luz, 95))   # sombras de casas/arvores (13h30)
img = np.zeros((TEX, TEX, 3), np.float32)
LIN = 256
for y0 in range(0, TEX, LIN):
    ys = np.arange(y0, y0 + LIN); xs = np.arange(TEX)
    XX, YY = np.meshgrid(xs, ys)
    mx = ((XX + .5) * 32768 / TEX + UX0) / 50.0
    my = ((YY + .5) * 32768 / TEX + UY0) / 50.0
    s = slice(y0, y0 + LIN)
    cor = amostra(T['DI_S4'], 7.0, mx, my)
    for (tn, _, esc), a_ in zip(CAMADAS, AL):
        cor = cor * (1 - a_[s, :, None]) + amostra(T[tn], esc, mx, my) * a_[s, :, None]
    cor *= (.80 + .40 * np.clip(luz[s, :, None], 0, 1.15)) * (.94 + .12 * F3[s, :, None])
    img[s] = cor
img = np.clip(img, 0, 255).astype(np.uint8)
Image.fromarray(img).save('raw_dion/dion_cor_4096.png')
buf = io.BytesIO()
Image.fromarray(img).save(buf, 'JPEG', quality=86)
jpg = buf.getvalue()

# --- GLB
def pad(b_, f=b'\x00'):
    return b_ + f * ((4 - len(b_) % 4) % 4)

partes = [pos.tobytes(), nor.tobytes(), uv.tobytes(), idx.tobytes(), jpg]
offs = []; o = 0; blob = b''
for p_ in partes:
    offs.append(o); q = pad(p_); blob += q; o += len(q)
mn, mx_ = pos.min(0).tolist(), pos.max(0).tolist()
vistas = []
for k in range(5):
    vv = {'buffer': 0, 'byteOffset': offs[k], 'byteLength': len(partes[k])}
    if k < 4: vv['target'] = 34963 if k == 3 else 34962
    vistas.append(vv)
gltf = {'asset': {'version': '2.0', 'generator': 'montar_chao.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'DION_CHAO'}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
        'materials': [{'name': 'chao_dion', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}],
        'textures': [{'source': 0, 'sampler': 0}], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'images': [{'bufferView': 4, 'mimeType': 'image/jpeg'}],
        'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': mn, 'max': mx_},
                      {'bufferView': 1, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3'},
                      {'bufferView': 2, 'componentType': 5126, 'count': len(pos), 'type': 'VEC2'},
                      {'bufferView': 3, 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'}],
        'bufferViews': vistas, 'buffers': [{'byteLength': len(blob)}]}
js = pad(json.dumps(gltf, separators=(',', ':')).encode(), b' ')
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(blob), b'BIN\x00') + blob
open('../../assets/dion/dion_chao.glb', 'wb').write(glb)
json.dump({'tile': [TX, TY], 'origem_uu': [OX, OY, OZ], 'escala_uu_por_unidade': 50, 'cantos_uu': [UX0, UY0, UX0 + 32768, UY0 + 32768], 'grade': n, 'passo_celulas': PASSO,
           'altura_min_m': float(GY.min()), 'altura_max_m': float(GY.max()), 'nota': 'jogo: X=(ux-OX)/50, Y=(uz-OZ)/50, Z=(uy-OY)/50'},
          open('../../assets/dion/dion_chao.json', 'w'), indent=1)
print('malha %dx%d (%d verts, %d tris); altura %.1f..%.1f m; GLB %.1f MB' % (n, n, len(pos), len(idx) // 3, GY.min(), GY.max(), len(glb) / 1048576))
