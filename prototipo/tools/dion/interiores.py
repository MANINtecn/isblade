"""Interiores de Dion (lojas/casas): o piso do casco interno (BSP, textura interior_B_floor03) fica ABAIXO do terreno e os moveis (StaticMeshActor interior_B_*) tem a base nesse piso,
entao o terreno cobria a parte de baixo de balcoes e estantes ('cidade aterrada', 23/11/2026).
Aqui: para cada casco com piso mais baixo que o terreno, delta = terreno - piso + FOLGA (uu da UE). montar_brushes sobe o casco inteiro por delta; montar_cidade sobe os atores cujo XY cai na pegada do casco.
O terreno e a geodata (altura andavel) nao mudam: o piso de madeira passa a ficar logo acima do chao andavel.
Uso: from interiores import cascos  ->  lista de dicts {brush: indice do export, pol: Nx2 (uu), zf, delta}."""
import numpy as np, cv2
from scipy import ndimage as ndi

FOLGA = 3          # uu acima do terreno (nao dar z-fighting com o terreno)
_cache = {}

def cascos(pk, polys_do_modelo, polys_idx, ler_polys, matriz_ue, tile='20_22'):
    if tile in _cache: return _cache[tile]
    from escala import GEO_UU
    alt = np.load('raw_dion/alt_%s.npy' % tile).astype(np.float32) - GEO_UU        # o terreno do jogo desce GEO_UU (escala.py)
    liso = ndi.gaussian_filter(ndi.median_filter(ndi.grey_opening(alt, size=(25, 25)), size=11, mode='nearest'), 2.0)      # a mesma limpeza de montar_chao.py
    UY0 = 131072
    out = []; todos = []
    for bi, e in enumerate(pk.exports):
        if e['classe'] != 'Brush' or e['tam'] <= 0: continue
        pr = pk.propriedades(e)
        if pr.get('CsgOper') != 1 or 'Brush' not in pr: continue
        pi = polys_do_modelo(pr['Brush'])
        if not pi: continue
        try: polys = ler_polys(pk, polys_idx[pi])
        except Exception: continue
        loc = np.array(pr.get('Location', (0, 0, 0)), np.float64); pre = np.array(pr.get('PrePivot', (0, 0, 0)), np.float64); M = matriz_ue(*(pr.get('Rotation') or (0, 0, 0)))
        for q in polys:
            if 'interior_b_floor' not in pk.nome_ref(q['mat']).lower() or (q['flags'] & 1): continue
            v = (np.array(q['v'], np.float64) - pre) @ M + loc; nr = np.array(q['n']) @ M
            if not (nr[2] < -0.95 and np.ptp(v[:, 2]) < 1): continue                       # face de baixo, horizontal = o piso
            pts = np.stack([v[:, 0] / 16.0, (v[:, 1] - UY0) / 16.0], 1).round().astype(np.int32)
            if pts.min() < 0 or pts.max() > 2047: continue
            m = np.zeros((2048, 2048), np.uint8); cv2.fillPoly(m, [pts], 1); ys, xs = np.nonzero(m)
            if len(xs) < 4: continue
            zf = float(v[0, 2]); terr = float(np.median(liso[xs, ys])); delta = terr - zf + FOLGA
            todos.append({'pol': [[round(float(a_), 1), round(float(b_), 1)] for a_, b_ in v[:, :2]], 'zf': round(zf, 1), 'terreno': round(terr, 1), 'brush': bi})
            if delta < 4: continue                                                           # piso ja fica acima do terreno
            out.append({'brush': bi, 'pol': v[:, :2].copy(), 'zf': zf, 'delta': float(delta)})
    import json
    json.dump({'pisos': todos}, open('raw_dion/interiores_%s.json' % tile, 'w'))      # todos os pisos de interior (pegada + altura): gerar_walkgrid_dion.py ancora o chao andavel neles
    _cache[tile] = out
    return out

def delta_em(lista, x, y, z):
    """delta (uu) a somar no z de um ator em (x, y, z) da UE; 0 se nao esta dentro de nenhum casco (e entre o piso e ~4 m acima)."""
    for c in lista:
        if c['zf'] - 30 <= z <= c['zf'] + 260 and cv2.pointPolygonTest(c['pol'].astype(np.float32), (float(x), float(y)), False) >= 0: return c['delta']
    return 0.0
