#!/usr/bin/env python
"""Acesso apos a emenda (11/11/2026): aplica as regras de js/mapa_vivo.js (TOL 6,5 m, 'estrutura' 6,5-14 m acima) celula a celula na regiao de cada mapa e mede
quanto do terreno andavel fica BLOQUEADO ou ISOLADO (nao alcancavel a partir da entrada). Uso: python tools/verifica_acesso.py [--png saida.png]"""
import math, os, sys, json
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verifica_emenda as E
import verifica_malha as Mz
TOL, ALT = 6.5, 2.0
SPAWN = {'curuma': [-50, 12], 'fortress': [0, 27], 'pantano': [14.9, -43.9]}
def main():
    png = sys.argv[sys.argv.index('--png') + 1] if '--png' in sys.argv else None
    J, H, reg, anda = Mz.carrega_mundo(); nz, nx = H.shape; ps = J['passo']
    xs = J['x0'] + np.arange(nx) * ps; zs = J['z0'] + np.arange(nz) * ps
    img = np.zeros((nz, nx, 3), np.uint8); img[:] = (28, 32, 44)
    BLOQ = np.zeros((nz, nx), bool)
    for mid, (pasta, nome, chaoMin, r) in E.MAPAS.items():
        M = J['mapas'][mid]; X, Y, Z = M['pos']; rot = M['rotY']; c, s = math.cos(rot), math.sin(rot)
        g, offs, hh, ll = E.carrega_grade(pasta, nome); n = g['n']; cel = g['celula']
        estado = np.zeros((nz, nx), np.int8)   # 0 fora, 1 terreno, 2 mapa ok, 3 bloqueado estrutura
        js, is_ = np.where((reg == r) & anda)
        for jj, ii in zip(js, is_):
            dx = xs[ii] - X; dz = zs[jj] - Z; lx = dx * c - dz * s; lz = dx * s + dz * c
            ix = int(math.floor((lx - g['x0']) / cel)); iz = int(math.floor((-lz - g['y0']) / cel)); yl = H[jj, ii] - Y
            if ix < 0 or iz < 0 or ix >= n or iz >= n: estado[jj, ii] = 1; continue
            a, b = offs[iz * n + ix], offs[iz * n + ix + 1]; bd = 1e9; up = 1e9
            for k in range(a, b):
                if hh[k] < chaoMin + .3 or ll[k] < ALT: continue
                bd = min(bd, abs(hh[k] - yl))
                if hh[k] > yl and hh[k] - yl < up: up = hh[k] - yl
            estado[jj, ii] = 2 if bd <= TOL else (3 if TOL < up <= 14 else 1)
        for mm in E.MAPAS: pass
        livre = anda & (estado != 3) & ((estado > 0) | (reg != r))   # mundo todo: a ilha pode se ligar por fora da regiao
        # entrada: spawn do mapa
        sp = SPAWN[mid]; wx = sp[0] * c + sp[1] * s + X; wz = -sp[0] * s + sp[1] * c + Z
        si, sj = int(round((wx - J['x0']) / ps)), int(round((wz - J['z0']) / ps))
        lab, nl = ndi.label(livre)
        dist, (ci, cj) = ndi.distance_transform_edt(lab == 0, return_indices=True)
        l0 = lab[ci[sj, si], cj[sj, si]]
        alc = lab == l0
        tot = int((estado > 0).sum()); bl = int((estado == 3).sum()); iso = int((livre & ~alc).sum())
        print('%-8s celulas andaveis %d | mapa ok %d | so terreno %d | BLOQUEADAS (estrutura) %d (%.1f%%) | isoladas da entrada %d (%.1f%%) em %d ilhas' % (
            mid, tot, (estado == 2).sum(), (estado == 1).sum(), bl, bl / tot * 100, iso, iso / tot * 100, nl - 1))
        # maiores ilhas isoladas
        areas = ndi.sum(livre, lab, range(1, nl + 1))
        for q in sorted([(a_, k + 1) for k, a_ in enumerate(areas) if k + 1 != l0], reverse=True)[:4]:
            jj, ii = np.where(lab == q[1]); print('    ilha %d celulas (%d m2) centro (%.0f, %.0f)' % (q[0], q[0] * 9, xs[ii].mean(), zs[jj].mean()))
        m = estado == 3; 
        if m.any():
            l3, n3 = ndi.label(m); ar = ndi.sum(m, l3, range(1, n3 + 1))
            for a_, k in sorted([(a_, k + 1) for k, a_ in enumerate(ar)], reverse=True)[:4]:
                jj, ii = np.where(l3 == k); print('    bloqueio %d celulas (%d m2) centro (%.0f, %.0f)' % (a_, a_ * 9, xs[ii].mean(), zs[jj].mean()))
        img[estado == 1] = (60, 110, 160); img[estado == 2] = (60, 150, 90); img[estado == 3] = (255, 30, 30); img[livre & ~alc] = (255, 200, 0)
    if png:
        from PIL import Image
        Image.fromarray(img[::-1]).resize((nx * 2, nz * 2), Image.NEAREST).save(png)
main()
