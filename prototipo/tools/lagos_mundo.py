#!/usr/bin/env python
"""Lagos do mundo aberto (10/11/2026, pedido do dono: "faca os lagos de verdade e nao partes do mar que invade; Blessing tem o nivel baixo acessivel, la nao tem agua").
Acha as bacias FECHADAS do terreno (priority-flood: o nivel de enchimento de cada celula e o menor ponto de transbordo ate a borda do mundo) e transforma em lago
as que tem profundidade e area suficientes, fora da cidade, dos mapas (cada um tem a sua agua) e da regiao do Pantano.
Saida: assets/mundo/lagos.json  {lagos: [{id, nivel, area, cx, cz, prof_max, raio, celulas: [[i,j]...]}], passo, x0, z0}
Uso: python tools/lagos_mundo.py [--png saida.png] [--prof 0.8] [--area 600]"""
import json, math, os, sys
import numpy as np
from scipy import ndimage as ndi
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MUNDO = os.path.join(RAIZ, 'assets', 'mundo')

def hierarquia(H, saida):
    """Hierarquia de bacias por enchimento (union-find em ordem crescente de altura). Cada bacia fechada "transborda" para uma vizinha mais baixa (ou para a saida)
    pelo ponto de passagem mais baixo: esse e o nivel do lago dela. Devolve [(nivel, minimo, celulas)] de cada bacia no momento em que transborda.
    saida = celulas que escoam (borda do mundo, a cidade e os mapas: cada mapa tem o seu terreno e a sua agua)."""
    nz, nx = H.shape; n = nx * nz; flat = H.ravel(); ordem = np.lexsort((np.arange(n), flat))
    pai = np.arange(n + 1, dtype=np.int64); minh = np.full(n + 1, np.inf); membros = [None] * (n + 1); fora = n              # no virtual "fora"
    minh[fora] = -np.inf; membros[fora] = []; feito = np.zeros(n, bool); mortos = []
    def raiz(a):
        while pai[a] != a: pai[a] = pai[pai[a]]; a = pai[a]
        return a
    sk = saida.ravel()
    for c in ordem:
        h = flat[c]; feito[c] = True; minh[c] = h; membros[c] = [c]; r = c
        j, i = divmod(c, nx); viz = []
        if i > 0: viz.append(c - 1)
        if i < nx - 1: viz.append(c + 1)
        if j > 0: viz.append(c - nx)
        if j < nz - 1: viz.append(c + nx)
        if sk[c] or j == 0 or j == nz - 1 or i == 0 or i == nx - 1: viz.append(fora)
        for q in viz:
            if q != fora and not feito[q]: continue
            rq = raiz(q); r = raiz(r)
            if rq == r: continue
            # o que tem o minimo MAIS ALTO e a bacia rasa: transborda aqui, no nivel h
            if minh[rq] > minh[r]: morre, vive = rq, r
            else: morre, vive = r, rq
            if morre != fora and len(membros[morre]) > 0: mortos.append((float(h), float(minh[morre]), membros[morre]))
            if len(membros[morre]) > len(membros[vive]): membros[morre].extend(membros[vive]); membros[vive] = membros[morre]
            else: membros[vive].extend(membros[morre])
            membros[morre] = None; pai[morre] = vive; minh[vive] = min(minh[vive], minh[morre]); r = vive
    return mortos

def main():
    a = sys.argv[1:]
    png = a[a.index('--png') + 1] if '--png' in a else None
    prof_min = float(a[a.index('--prof') + 1]) if '--prof' in a else 0.8
    area_min = float(a[a.index('--area') + 1]) if '--area' in a else 600.0
    area_max = float(a[a.index('--max') + 1]) if '--max' in a else 70000.0
    J = json.load(open(os.path.join(MUNDO, 'mundo_grade.json'), encoding='utf-8')); nx, nz, ps = J['nx'], J['nz'], J['passo']
    raw = np.fromfile(os.path.join(MUNDO, 'mundo_grade.bin'), dtype=np.uint8).reshape(nz, nx, 9)
    H = raw[:, :, 0:2].copy().view('<i2').reshape(nz, nx).astype(np.float64) / 100.0
    reg = raw[:, :, 7]; anda = raw[:, :, 8] > 0
    xs = J['x0'] + np.arange(nx) * ps; zs = J['z0'] + np.arange(nz) * ps; XX, ZZ = np.meshgrid(xs, zs); dist = np.hypot(XX, ZZ)
    saida = (dist < 100) | np.isin(reg, [1, 2, 3])
    mortos = hierarquia(H, saida)
    print('bacias que transbordam: %d' % len(mortos))
    cand = []
    for nivel, mn, cel in mortos:
        c = np.array(cel, dtype=np.int64); js, is_ = np.divmod(c, nx); ar = len(c) * ps * ps; prof = nivel - mn
        if prof < prof_min or ar < area_min or ar > area_max: continue
        cand.append((ar, nivel, mn, js, is_))
    cand.sort(key=lambda q: -q[0])
    aceitos = []; ocupado = np.zeros((nz, nx), bool)
    for ar, nivel, mn, js, is_ in cand:
        if ocupado[js, is_].mean() > .3: continue                                     # ja coberto por um lago maior (bacia aninhada)
        m = np.zeros((nz, nx), bool); m[js, is_] = True
        anel = ndi.binary_dilation(m, iterations=6) & ~m
        if (anda & anel).sum() < 0.35 * anel.sum(): continue                          # lago de montanha (anel sem terreno andavel): nao entra
        if nivel > 18: continue
        pc = np.cov(np.vstack([js, is_]).astype(np.float64)); ev = np.sort(np.linalg.eigvalsh(pc))
        if ev[0] <= 0 or math.sqrt(ev[1] / ev[0]) > 3.2: continue                    # faixa comprida (desfiladeiro ao pe da montanha): nao e lago
        ocupado |= m; aceitos.append((ar, nivel, mn, js, is_))
    lagos = []; img = np.zeros((nz, nx, 3), np.uint8); img[:] = (28, 32, 44); img[anda] = (52, 86, 62); img[~anda] = (70, 40, 40)
    for k, (ar, nivel, mn, js, is_) in enumerate(aceitos):
        cx, cz = float(xs[is_].mean()), float(zs[js].mean())
        lagos.append({'id': k, 'nivel': round(nivel, 2), 'area': int(ar), 'cx': round(cx, 1), 'cz': round(cz, 1), 'prof_max': round(nivel - mn, 2), 'raio': round(math.sqrt(ar / math.pi), 1),
                      'celulas': [[int(i), int(j)] for j, i in zip(js, is_)]}); img[js, is_] = (60, 140, 230)
    print('lagos aceitos (area %d-%d m2, profundidade >= %.1f m, em volta de terreno andavel, nivel <= 18 m): %d' % (area_min, area_max, prof_min, len(lagos)))
    for q in lagos[:30]: print('  lago %2d: nivel %6.2f m  area %6d m2  profundidade max %5.2f m  centro (%7.1f, %7.1f)' % (q['id'], q['nivel'], q['area'], q['prof_max'], q['cx'], q['cz']))
    # aguas fundas nao se atravessa a pe (sem nado): marca como nao andavel no bin do mundo (cliente e servidor leem o mesmo arquivo). Rodar de novo depois de exportar o mundo do Blender.
    if '--aplicar' in a:
        prof_andar = float(a[a.index('--fundo') + 1]) if '--fundo' in a else 1.3
        buf = raw.copy(); n_fundo = 0
        for q in lagos:
            for i, j in q['celulas']:
                if q['nivel'] - H[j, i] > prof_andar: buf[j, i, 8] = 0; n_fundo += 1
        buf.tofile(os.path.join(MUNDO, 'mundo_grade.bin')); print('mundo_grade.bin: %d celulas de agua funda (> %.1f m) agora nao andaveis' % (n_fundo, prof_andar))
    spots = J.get('spots', []); dentro = []
    for s in spots:
        i, j = int(round((s['x'] - J['x0']) / ps)), int(round((s['z'] - J['z0']) / ps))
        for q in lagos:
            if [i, j] in q['celulas'] and q['nivel'] - H[j, i] > 0.3: dentro.append((s['faixa'], s['x'], s['z'], q['id']))
    print('spots de monstro dentro da agua: %d %s' % (len(dentro), dentro))
    json.dump({'passo': ps, 'x0': J['x0'], 'z0': J['z0'], 'lagos': lagos}, open(os.path.join(MUNDO, 'lagos.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('lagos.json: %.0f KB' % (os.path.getsize(os.path.join(MUNDO, 'lagos.json')) / 1024))
    if png:
        from PIL import Image
        Image.fromarray(img[::-1]).resize((nx * 2, nz * 2), Image.NEAREST).save(png); print('mapa:', png)

if __name__ == '__main__':
    main()
