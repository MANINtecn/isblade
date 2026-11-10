#!/usr/bin/env python
"""Emenda mapa/terreno (10/11/2026): onde o terreno diz "andavel" dentro da regiao de um mapa mas o mapa carregado NAO tem chao ali (o personagem
passa a andar no terreno por baixo do mapa e "cai num buraco"). Mede por mapa:
  - alcance do walkgrid do mapa x tamanho da regiao dele no mundo
  - celulas da regiao com terreno andavel e SEM chao do mapa a +-3,5 m do terreno ("buraco")
  - celulas da regiao com chao do mapa mas terreno nao andavel (nao e problema: o mapa manda la)
Uso: python tools/verifica_emenda.py [--png saida.png]"""
import json, math, os, sys
import numpy as np
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MUNDO = os.path.join(RAIZ, 'assets', 'mundo')
MAPAS = {'curuma': ('curuma', 'curuma_walkgrid', -222.9, 1), 'fortress': ('fortress', 'fortress_walkgrid', -36.4, 2), 'pantano': ('blazing_swamp', 'blazing_swamp_walkgrid', -30.8, 3)}
ALTURA = 2.0

def carrega_grade(pasta, nome):
    d = os.path.join(RAIZ, 'assets', 'maps', pasta)
    j = json.load(open(os.path.join(d, nome + '.json'), encoding='utf-8')); n = j['n']; st = j.get('bytes_por_camada', 3)
    raw = np.fromfile(os.path.join(d, nome + '.bin'), dtype=np.uint8)
    offs = raw[:4 * (n * n + 1)].view('<u4'); dados = raw[4 * (n * n + 1):]
    k = len(dados) // st
    dados = dados[:k * st].reshape(k, st)
    h = dados[:, 0:2].copy().view('<i2').reshape(k).astype(np.float32) / j['altura_escala']
    l = dados[:, 2].astype(np.float32) / j['livre_escala']
    return j, offs, h, l

def main():
    png = None
    if '--png' in sys.argv: png = sys.argv[sys.argv.index('--png') + 1]
    J = json.load(open(os.path.join(MUNDO, 'mundo_grade.json'), encoding='utf-8')); nx, nz, ps = J['nx'], J['nz'], J['passo']
    raw = np.fromfile(os.path.join(MUNDO, 'mundo_grade.bin'), dtype=np.uint8).reshape(nz, nx, 9)
    H = raw[:, :, 0:2].copy().view('<i2').reshape(nz, nx).astype(np.float32) / 100.0
    reg = raw[:, :, 7]; anda = raw[:, :, 8] > 0
    xs = J['x0'] + np.arange(nx) * ps; zs = J['z0'] + np.arange(nz) * ps
    img = np.zeros((nz, nx, 3), np.uint8); img[:] = (28, 32, 44)
    for mid, (pasta, nome, chaoMin, r) in MAPAS.items():
        M = J['mapas'][mid]; X, Y, Z = M['pos']; rot = M['rotY']; c, s = math.cos(rot), math.sin(rot)
        g, offs, hh, ll = carrega_grade(pasta, nome); n = g['n']; cel = g['celula']
        m = reg == r
        js, is_ = np.where(m)
        # alcance: extremos da regiao no referencial local do mapa
        wx = xs[is_]; wz = zs[js]; dx = wx - X; dz = wz - Z; lx = dx * c - dz * s; lz = dx * s + dz * c
        raio_reg = float(np.max(np.hypot(lx, lz)))
        print('%-8s walkgrid: raio %.0f m (%dx%d celulas de %.1f m, %d camadas) | regiao: %d celulas, ate %.0f m do centro do mapa (extremos local x %.0f..%.0f, z %.0f..%.0f)' % (
            mid, g['raio'], n, n, cel, g['camadas'], m.sum(), raio_reg, lx.min(), lx.max(), lz.min(), lz.max()))
        buracos = 0; outra = 0; livre = 0; exemplos = []; dist_out = []; fora = 0; total = 0; sem_terreno = 0; ok = 0; dif = []
        for jj, ii in zip(js, is_):
            if not anda[jj, ii]: sem_terreno += 1; continue
            total += 1
            x = xs[ii]; z = zs[jj]; dxx = x - X; dzz = z - Z; lxx = dxx * c - dzz * s; lzz = dxx * s + dzz * c
            ix = int(math.floor((lxx - g['x0']) / cel)); iz = int(math.floor((-lzz - g['y0']) / cel))
            yl = H[jj, ii] - Y
            if ix < 0 or iz < 0 or ix >= n or iz >= n: fora += 1; img[jj, ii] = (255, 160, 0); continue
            a, b = offs[iz * n + ix], offs[iz * n + ix + 1]
            melhor = None
            for k in range(a, b):
                if hh[k] < chaoMin + .3 or ll[k] < ALTURA: continue
                d = abs(hh[k] - yl)
                if melhor is None or d < melhor: melhor = d
            if melhor is None or melhor > 3.5:
                buracos += 1
                # a coluna tem algum chao do mapa em OUTRA altura? (o jogador ficaria por baixo ou por cima da estrutura) ou nao tem nada (terreno livre)
                alguma = any(hh[k] >= chaoMin + .3 and ll[k] >= ALTURA for k in range(a, b))
                if alguma:
                    outra += 1; img[jj, ii] = (255, 30, 30); dist_out.append(min(abs(hh[k] - yl) for k in range(a, b) if hh[k] >= chaoMin + .3 and ll[k] >= ALTURA))
                    if len(exemplos) < 400: exemplos.append((float(x), float(z), float(H[jj, ii]), float(min(abs(hh[k] - yl) for k in range(a, b) if hh[k] >= chaoMin + .3 and ll[k] >= ALTURA))))
                else: livre += 1; img[jj, ii] = (255, 160, 0)
            else: ok += 1; dif.append(melhor); img[jj, ii] = (60, 150, 90)
        print('         terreno andavel na regiao: %d | com chao do mapa (+-3,5 m): %d (%.0f%%) | SEM chao do mapa (buraco): %d (%.0f%%) | fora do alcance do walkgrid: %d | terreno nao andavel: %d' % (
            total, ok, ok / max(1, total) * 100, buracos, buracos / max(1, total) * 100, fora, sem_terreno))
        print('         dos %d sem chao a +-3,5 m: %d tem chao do mapa em OUTRA altura (jogador por baixo/por cima da estrutura = BURACO) e %d nao tem chao nenhum na coluna (terreno livre, ok)' % (buracos, outra, livre))
        if dist_out:
            q = np.array(dist_out); print('         desencontro (m) nas %d colunas com chao em outra altura: 3,5-6 m: %d | 6-10 m: %d | 10-20 m: %d | mais de 20 m: %d' % (len(q), ((q > 3.5) & (q <= 6)).sum(), ((q > 6) & (q <= 10)).sum(), ((q > 10) & (q <= 20)).sum(), (q > 20).sum()))
        if exemplos:
            ex = sorted(exemplos, key=lambda q: -q[3])[:5]; print('         exemplos (x, z, altura do terreno, distancia ao chao do mapa mais proximo): ' + ' | '.join('(%.0f, %.0f, y %.1f, %.1f m)' % q for q in ex))
        if dif: print('         diferenca de altura terreno x chao do mapa nas celulas ok: media %.2f m, p95 %.2f m' % (np.mean(dif), np.percentile(dif, 95)))
    if png:
        from PIL import Image
        Image.fromarray(img[::-1]).resize((nx * 2, nz * 2), Image.NEAREST).save(png); print('mapa:', png)

if __name__ == '__main__':
    main()
