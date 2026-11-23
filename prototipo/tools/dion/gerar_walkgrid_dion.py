"""Gera o mapa de chao andavel de Dion (formato do js/torre.js: dion_walkgrid.bin + .json) direto da geodata L2J do servidor (altura e nswe reais por celula),
em vez de lancar raios no modelo. Celula do jogo = 2 x 2 celulas da geodata = 0,64 m; 1024 x 1024 celulas = o tile inteiro (655 m).
Camadas por celula (andares/pontes/casas): altura (m do jogo * 50, int16), espaco livre acima (m * 10, uint8, ate 12 m) e mascara de arestas bloqueadas
(bit 1 = aresta para +x, bit 2 = aresta para +iz). Orientacao do motor: iz cresce para o NORTE (z do jogo decresce); x do jogo = leste.
Uso (tools/dion): python gerar_walkgrid_dion.py   ->  assets/maps/dion/dion_walkgrid.{bin,json}"""
import numpy as np, json, struct, time
from geodata_l2j import le_tile
from escala import K, GEO_UU

TX, TY = 20, 22
UX0, UY0 = (TX - 20) * 32768, (TY - 18) * 32768
OX, OY, OZ = 16169.0, 146880.0, -1966.0
t0 = time.time()
chao, topo, cam, nswe = le_tile(TX, TY); capas = le_tile.capas
N = 1024                                                      # celulas do jogo por lado
# fatia fina -> grossa (2x2): camada base = celula (2I, 2J)
h0 = chao[0::2, 0::2].astype(np.int32); f0 = nswe
# [pes no chao] 22/11/2026: a altura andavel da geodata inclui o topo de pedras/arvores/muros e ficava ate 1,3 m acima da malha DESENHADA (personagem 'flutuando').
# Onde o chao e' terreno (diferenca < 1,5 m da malha visivel) o jogador pisa na MESMA superficie da malha (mesma triangulacao de montar_chao.py); estruturas (escadas, pontes, topo de muro) mantem a altura da geodata.
from scipy import ndimage as ndi
_alt = np.load('raw_dion/alt_20_22.npy').astype(np.float32)
_liso = ndi.gaussian_filter(ndi.median_filter(ndi.grey_opening(_alt, size=(25, 25)), size=11, mode='nearest'), 2.0)
_H = np.pad(_liso[:2048, :2048].reshape(256, 8, 256, 8).mean(axis=(1, 3)), ((0, 1), (0, 1)), mode='edge')        # malha 257x257 (passo 128 uu), [i = x, j = y]
_u = (np.arange(N) + 0.5) / 4.0; _i0 = np.clip(np.floor(_u).astype(int), 0, 255); _f = _u - _i0                     # centro da celula grossa na grade da malha
_I, _J = np.meshgrid(_i0, _i0, indexing='ij'); _fx, _fz = np.meshgrid(_f, _f, indexing='ij')
_a = _H[_I, _J]; _b = _H[_I, _J + 1]; _c = _H[_I + 1, _J]; _d = _H[_I + 1, _J + 1]
_malha = np.where(_fx + _fz <= 1, _a + _fx * (_c - _a) + _fz * (_b - _a), _d + (1 - _fx) * (_b - _d) + (1 - _fz) * (_c - _d))      # triangulos (a,b,c) e (b,d,c)
_terreno = np.abs(h0 - _malha) < 75                                                                           # 1,5 m = 75 uu
print('celulas pisando na malha: %.1f%% (diferenca media antes %.2f m)' % (100 * _terreno.mean(), np.abs(h0 - _malha).mean() / 50))
h0 = np.where(_terreno, np.round(_malha), h0).astype(np.int32)
E = (nswe & 1) != 0; W = (nswe & 2) != 0; S = (nswe & 4) != 0; Nn = (nswe & 8) != 0         # pode andar para leste/oeste/sul/norte (aCis: N = y-1)
# aresta para leste da celula grossa (I,J): bloqueada se alguma das 2 celulas finas da borda leste nao pode ir a leste, ou a vizinha (leste) nao pode vir a oeste
def borda(a, b, eixo_x):
    return a & b
# fino: indice [cx, cy]; grossa [I, J] = [cx//2, cy//2]
lest_ok = np.ones((N, N), bool); norte_ok = np.ones((N, N), bool)
for dy in (0, 1):
    cx_borda = np.arange(N) * 2 + 1                          # coluna fina na borda leste de cada celula grossa
    ok = E[cx_borda][:, dy::2][:, :N] if False else None
# versao direta e legivel (vetorizada por fatias)
Ef = E.reshape(N, 2, N, 2); Wf = W.reshape(N, 2, N, 2); Sf = S.reshape(N, 2, N, 2); Nf = Nn.reshape(N, 2, N, 2)
leste_ok = Ef[:, 1, :, :].all(axis=2)                        # as 2 celulas da coluna leste da celula grossa podem ir a leste
leste_viz = np.zeros_like(leste_ok); leste_viz[:-1] = Wf[1:, 0, :, :].all(axis=2)      # a vizinha leste aceita vir de oeste
leste_viz[-1] = True
bloq_x = ~(leste_ok & leste_viz)                              # bit 1
norte_ok = Nf[:, :, :, 0].all(axis=1)                        # linha fina norte (cy par) da celula grossa pode ir ao norte
norte_viz = np.ones_like(norte_ok); norte_viz[:, 1:] = Sf[:, :, :-1, 1].all(axis=1)    # a celula grossa J-1 (mais ao norte) aceita vir do sul
bloq_n = ~(norte_ok & norte_viz)                              # aresta para o norte (J-1)

# orientacao do motor: iz = N-1-J (iz cresce para o norte)
def para_motor(a): return a[:, ::-1]                          # [I, J] -> [I, iz]
H = para_motor(h0); BX = para_motor(bloq_x); BZ = np.zeros((N, N), bool)
# aresta +iz (norte) da celula iz = a aresta norte da celula J = N-1-iz
BZ = para_motor(bloq_n)

# camadas extras (andares): das 4 celulas finas da celula grossa, agrupa por altura (>= 25 uu de diferenca)
extras = {}
for (cx, cy), lst in capas.items():
    I, J = cx // 2, cy // 2
    for h, nw in lst[1:] if (cx % 2 == 0 and cy % 2 == 0) else lst:
        d = extras.setdefault((I, J), [])
        if all(abs(h - q[0]) >= 25 for q in d): d.append((h, nw))
# alturas base de celulas multicamada: a mais baixa; extras acima dela
def y_jogo(h_uu): return (h_uu - GEO_UU - OZ) / 50.0 * K      # geodata - GEO_UU: encosta nas malhas (ver escala.py)
counts = np.ones((N, N), np.int32)                            # [I, iz]
ex_motor = {}
for (I, J), lst in extras.items():
    base = int(h0[I, J]); lst = sorted(x for x in lst if x[0] > base + 25)
    if lst: ex_motor[(I, N - 1 - J)] = lst; counts[I, N - 1 - J] += len(lst)
# gravacao: ordem do motor = iz * N + ix
flat_counts = counts.T.reshape(-1)                           # [iz, I] -> indice iz*N + ix
offs = np.zeros(N * N + 1, np.uint32); offs[1:] = np.cumsum(flat_counts)
total = int(offs[-1])
rec = np.zeros(total, dtype=[('h', '<i2'), ('l', 'u1'), ('m', 'u1')])
base_pos = offs[:-1].astype(np.int64)
mask = (BX.astype(np.uint8) | (BZ.astype(np.uint8) << 1)).T.reshape(-1)       # [iz, I]
hb = np.round(y_jogo(H.T.reshape(-1)) * 50).astype(np.int16)
rec['h'][base_pos] = hb; rec['m'][base_pos] = mask
rec['l'][base_pos] = int(round(12 * K * 10))                    # 12 m livres (x escala) (ajustado abaixo onde ha camada acima)
for (I, iz), lst in ex_motor.items():
    k = iz * N + I; p = int(offs[k]); camadas = [(int(H[I, iz]), None)] + [(h, nw) for h, nw in lst]
    ys = [y_jogo(h) for h, _ in camadas]
    for q in range(1, len(camadas)):
        rec['h'][p + q] = int(round(ys[q] * 50)); rec['m'][p + q] = 0 if (camadas[q][1] & 0xF) == 0xF else 3; rec['l'][p + q] = int(round(12 * K * 10))
    for q in range(len(camadas) - 1):
        livre = max(0.0, min(12.0 * K, ys[q + 1] - ys[q] - 0.15)); rec['l'][p + q] = int(round(livre * 10))
with open('../../assets/maps/dion/dion_walkgrid.bin', 'wb') as f:
    f.write(offs.astype('<u4').tobytes()); f.write(rec.tobytes())
x0 = (UX0 - OX) / 50.0 * K; y0 = -((UY0 + 32768 - OY) / 50.0) * K       # x_blender minimo; y_blender = -z do jogo
cel = 32768 / N / 50.0 * K
json.dump({'versao': int(time.time()), 'celula': cel, 'raio': 330.0, 'n': N, 'camadas': total, 'altura_escala': 50, 'escala': K, 'livre_escala': 10, 'bytes_por_camada': 4, 'x0': x0, 'y0': y0,
           'nota': 'Dion 20_22 da geodata L2J (gerar_walkgrid_dion.py). x_jogo = x0+(ix+.5)*celula; z_jogo = -(y0+(iz+.5)*celula); altura = m do jogo (praca = 0).'},
          open('../../assets/maps/dion/dion_walkgrid.json', 'w'), indent=1)
print('walkgrid %dx%d celulas de %.2f m; %d camadas (%d extras de andares/pontes); bin %.1f MB; %.1f s' % (N, N, cel, total, total - N * N, (len(offs) * 4 + total * 4) / 1048576, time.time() - t0))
print('altura base (m do jogo): min %.1f max %.1f' % (y_jogo(h0.min()), y_jogo(h0.max())))
