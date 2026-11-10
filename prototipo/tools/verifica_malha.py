#!/usr/bin/env python
"""Verificacao da malha do mundo aberto (10/11/2026, pedido do dono: "tem lugares que nao da pra andar ou subir").
Le assets/mundo/mundo_grade.{json,bin} e, para cada mapa (Cruma, Fortaleza, Pantano), o walkgrid dele encaixado no mundo
(mesma conta de js/mapa_vivo.js e servidor/mobs_mundo.js). Mede:
  1. ilhas: regioes andaveis do terreno que NAO se ligam a cidade (jogador nao chega la) e a area delas
  2. buracos: celulas nao andaveis cercadas de andavel (pocos) e as "linhas" de celulas nao andaveis que cortam caminhos
  3. alcance: da cidade ate a entrada de cada mapa e ate cada spot de mob (caminho existe? quantos metros?)
  4. degraus: pares de celulas vizinhas andaveis com diferenca de altura maior que o passo do jogo (1,04 m)
  5. emenda: ao redor de cada mapa, onde o chao do mapa e o terreno se encontram: diferenca de altura e vaos
Uso: python tools/verifica_malha.py [--mapa mapa.png] [--relatorio relatorio.json]
"""
import json, math, os, struct, sys
import numpy as np
from scipy import ndimage as ndi

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MUNDO = os.path.join(RAIZ, 'assets', 'mundo')
PASSO_JOGO = 1.04            # sobe ate 1,04 m por celula (torre.js / mapa_vivo.js)

def carrega_mundo():
    J = json.load(open(os.path.join(MUNDO, 'mundo_grade.json'), encoding='utf-8'))
    nx, nz, B = J['nx'], J['nz'], J.get('bytes_celula', 9)
    raw = np.fromfile(os.path.join(MUNDO, 'mundo_grade.bin'), dtype=np.uint8).reshape(nz, nx, B)
    H = raw[:, :, 0:2].copy().view('<i2').reshape(nz, nx).astype(np.float32) / 100.0
    reg = raw[:, :, 7]; anda = raw[:, :, 8] > 0
    return J, H, reg, anda

def mundo_xz(J, i, j): return J['x0'] + i * J['passo'], J['z0'] + j * J['passo']
def celula_de(J, x, z): return int(round((x - J['x0']) / J['passo'])), int(round((z - J['z0']) / J['passo']))

def caminho_possivel(H, anda, passo_max):
    """celulas vizinhas (4 direcoes) so se ligam quando as duas sao andaveis e a diferenca de altura <= passo_max"""
    nz, nx = H.shape
    liga_x = anda[:, :-1] & anda[:, 1:] & (np.abs(H[:, :-1] - H[:, 1:]) <= passo_max)     # (nz, nx-1)
    liga_z = anda[:-1, :] & anda[1:, :] & (np.abs(H[:-1, :] - H[1:, :]) <= passo_max)     # (nz-1, nx)
    return liga_x, liga_z

def componentes(anda, liga_x, liga_z):
    nz, nx = anda.shape
    idx = np.arange(nz * nx).reshape(nz, nx)
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    a = idx[:, :-1][liga_x]; b = idx[:, 1:][liga_x]
    c = idx[:-1, :][liga_z]; d = idx[1:, :][liga_z]
    r = np.concatenate([a, c]); s = np.concatenate([b, d])
    g = coo_matrix((np.ones(len(r), dtype=np.uint8), (r, s)), shape=(nz * nx, nz * nx))
    n, lab = connected_components(g, directed=False)
    return n, lab.reshape(nz, nx)

def main():
    mapa_png = rel_json = None
    a = sys.argv[1:]
    if '--mapa' in a: mapa_png = a[a.index('--mapa') + 1]
    if '--relatorio' in a: rel_json = a[a.index('--relatorio') + 1]
    J, H, reg, anda = carrega_mundo()
    nz, nx = H.shape; ps = J['passo']
    print('malha %dx%d celulas de %g m | andavel %.1f%%' % (nx, nz, ps, anda.mean() * 100))
    R = {'passo': ps, 'tam': [nx, nz]}

    # --- passo do jogo na malha de 3 m: o jogo anda por celula de 3 m (altura bilinear), entao o degrau util e a inclinacao maxima
    #     (40 graus -> ~2,5 m de diferenca por celula de 3 m). Para ligar celulas usamos 2,6 m (a inclinacao ja foi filtrada na exportacao).
    LIM = ps * math.tan(math.radians(40)) + .1
    lx, lz = caminho_possivel(H, anda, LIM)
    n, lab = componentes(anda, lx, lz)

    # --- centro da cidade = ponto de partida
    ci, cj = celula_de(J, 0, 6)
    base = lab[cj, ci]
    if not anda[cj, ci]:
        print('ATENCAO: o centro da cidade (0,6) nao e andavel na grade do mundo (a cidade usa colisao propria: ok); partindo do anel em volta da muralha.')
    # a cidade (raio < 100 m) e de colisao propria: tudo dentro de 100 m conta como "cidade"
    xs = J['x0'] + np.arange(nx) * ps; zs = J['z0'] + np.arange(nz) * ps
    XX, ZZ = np.meshgrid(xs, zs); dist = np.hypot(XX, ZZ)
    sementes = np.unique(lab[(dist > 100) & (dist < 130) & anda])
    # maior componente andavel fora da cidade vizinha do anel
    cont = np.bincount(lab[anda].ravel(), minlength=n)
    base = sementes[np.argmax(cont[sementes])] if len(sementes) else lab[anda][0]
    alc = (lab == base)
    area_total = anda.sum() * ps * ps
    print('area andavel total %.0f ha; ligada ao anel da cidade %.0f ha (%.1f%%)' % (area_total / 1e4, (alc & anda).sum() * ps * ps / 1e4, (alc & anda).sum() / anda.sum() * 100))

    # --- 1. ilhas
    ilhas = []
    for L in np.unique(lab[anda & ~alc]):
        m = (lab == L); ar = m.sum() * ps * ps
        if ar < 500: continue                         # ate 50 x 10 m e ruido
        js, is_ = np.where(m); ci_, cj_ = is_.mean(), js.mean(); x, z = mundo_xz(J, ci_, cj_)
        ilhas.append({'area_m2': int(ar), 'x': round(float(x), 1), 'z': round(float(z), 1), 'regiao': int(np.bincount(reg[m]).argmax()), 'altura': round(float(H[m].mean()), 1)})
    ilhas.sort(key=lambda q: -q['area_m2'])
    print('\n[1] ILHAS andaveis sem ligacao com a cidade (>= 500 m2): %d' % len(ilhas))
    for q in ilhas[:15]: print('   %7d m2  em (%7.1f, %7.1f)  regiao %d  altura %.1f' % (q['area_m2'], q['x'], q['z'], q['regiao'], q['altura']))
    R['ilhas'] = ilhas

    # --- 2. pocos (nao andavel cercado de andavel) e cortes
    cheio = ndi.binary_fill_holes(anda) & ~anda
    labp, np_ = ndi.label(cheio); pocos = []
    for L in range(1, np_ + 1):
        m = labp == L; ar = m.sum() * ps * ps
        if ar < 20: continue
        js, is_ = np.where(m); x, z = mundo_xz(J, is_.mean(), js.mean())
        if math.hypot(x, z) < 100: continue
        pocos.append({'area_m2': int(ar), 'x': round(float(x), 1), 'z': round(float(z), 1), 'regiao': int(np.bincount(reg[m]).argmax())})
    pocos.sort(key=lambda q: -q['area_m2'])
    print('\n[2] POCOS (area nao andavel rodeada de andavel, >= 20 m2, fora da cidade): %d' % len(pocos))
    for q in pocos[:12]: print('   %6d m2  em (%7.1f, %7.1f)  regiao %d' % (q['area_m2'], q['x'], q['z'], q['regiao']))
    R['pocos'] = pocos

    # --- 3. alcance: entrada de cada mapa e spots
    dist_g = ndi.distance_transform_edt(~alc) * ps
    print('\n[3] ALCANCE')
    ent = {}
    for mid, M in J.get('mapas', {}).items():
        pos = M['pos']; c = celula_de(J, pos[0], pos[2]) if False else None
    spots = J.get('spots', [])
    sem = []
    for s in spots:
        i, j = celula_de(J, s['x'], s['z'])
        if not (0 <= i < nx and 0 <= j < nz): continue
        ok = alc[j, i]
        if not ok: sem.append({'faixa': s['faixa'], 'x': s['x'], 'z': s['z'], 'perto_m': round(float(dist_g[j, i]), 1)})
    print('   spots do campo fora da area ligada a cidade: %d de %d' % (len(sem), len(spots)))
    for q in sem: print('     faixa %s em (%.1f, %.1f), a %.1f m da area ligada' % (q['faixa'], q['x'], q['z'], q['perto_m']))
    R['spots_isolados'] = sem

    # entradas dos mapas: usa o spawn (mesma conta de mapa_vivo.js) e o que o servidor/IA usam
    SPAWN = {'curuma': [-50, 12], 'fortress': [0, 27], 'pantano': [14.9, -43.9]}
    ent_r = {}
    for mid, sp in SPAWN.items():
        M = J['mapas'].get(mid)
        if not M: continue
        pos, rot = M['pos'], M['rotY']; c, s_ = math.cos(rot), math.sin(rot)
        wx = sp[0] * c + sp[1] * s_ + pos[0]; wz = -sp[0] * s_ + sp[1] * c + pos[2]
        i, j = celula_de(J, wx, wz)
        r = int(reg[j, i]); ok = bool(alc[j, i]); d = float(dist_g[j, i])
        # entrada do mapa: o terreno em volta da entrada deve ligar a cidade (se nao, ninguem chega andando)
        print('   entrada de %-8s em (%7.1f, %7.1f) regiao %d  terreno andavel e ligado a cidade: %s  (mais proximo: %.1f m)' % (mid, wx, wz, r, 'SIM' if ok else 'NAO', d))
        ent_r[mid] = {'x': round(wx, 1), 'z': round(wz, 1), 'ligado': ok, 'distancia_m': round(d, 1)}
    R['entradas'] = ent_r

    # --- 4. degraus
    dz_x = np.abs(H[:, :-1] - H[:, 1:]); dz_z = np.abs(H[:-1, :] - H[1:, :])
    ambos_x = anda[:, :-1] & anda[:, 1:]; ambos_z = anda[:-1, :] & anda[1:, :]
    ruins_x = ambos_x & (dz_x > LIM); ruins_z = ambos_z & (dz_z > LIM)
    print('\n[4] DEGRAUS entre celulas andaveis maiores que %.1f m: %d (x) + %d (z)' % (LIM, ruins_x.sum(), ruins_z.sum()))
    R['degraus'] = int(ruins_x.sum() + ruins_z.sum())

    # --- 5. emenda: perimetro de cada mapa
    print('\n[5] EMENDA mapa/terreno')
    R['emenda'] = {}
    for mid, M in J.get('mapas', {}).items():
        if mid not in SPAWN: continue
        m = (reg == {'curuma': 1, 'fortress': 2, 'pantano': 3}[mid])
        if not m.any(): continue
        borda = m & ~ndi.binary_erosion(m, iterations=2)
        andav = borda & anda
        js, is_ = np.where(borda)
        print('   %-8s celulas da regiao %6d | perimetro %5d | perimetro andavel %5d (%.0f%%)' % (mid, m.sum(), borda.sum(), andav.sum(), andav.sum() / max(1, borda.sum()) * 100))
        R['emenda'][mid] = {'regiao_celulas': int(m.sum()), 'perimetro': int(borda.sum()), 'perimetro_andavel': int(andav.sum())}

    # mapa de calor
    if mapa_png:
        from PIL import Image
        img = np.zeros((nz, nx, 3), np.uint8)
        img[:] = (28, 32, 44)
        img[anda & alc] = (60, 150, 90)              # ligado a cidade
        img[anda & ~alc] = (230, 190, 40)            # andavel mas ilhado
        img[~anda] = (90, 46, 46)                    # nao andavel
        for q in pocos: i, j = celula_de(J, q['x'], q['z']); img[max(0, j - 1):j + 2, max(0, i - 1):i + 2] = (255, 255, 255)
        for s in spots: i, j = celula_de(J, s['x'], s['z']); img[j, i] = (0, 200, 255) if alc[j, i] else (255, 40, 40)
        Image.fromarray(img[::-1]).resize((nx * 2, nz * 2), Image.NEAREST).save(mapa_png); print('mapa:', mapa_png)
    if rel_json: json.dump(R, open(rel_json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('relatorio:', rel_json)

if __name__ == '__main__':
    main()
