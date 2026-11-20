"""Le geodata L2J (aCis) de um tile (.l2j) e devolve a altura do chao por celula de 16 uu (0,32 m): 2048 x 2048 celulas por tile (256 x 256 blocos de 8 x 8).
Formato (aCis GeoEngine/BlockFlat/BlockComplex/BlockMultilayer): por bloco 1 byte de tipo: 0 = plano (1 short de altura), 1 = complexo (64 shorts), 2 = multicamada (por celula: 1 byte de camadas + N shorts).
Cada short de celula: nswe = dado & 0xF; altura = (int16)(dado & 0xFFF0) >> 1.  Ordem das celulas no bloco: x * 8 + y.  X mundo = (tileX - 20) * 32768 + celulaX * 16;  Y mundo = (tileY - 18) * 32768 + celulaY * 16.
Retorna (chao, topo, camadas): chao = camada mais baixa (o terreno), topo = mais alta, camadas = quantas existem (pontes/andares)."""
import struct, numpy as np

GEO = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/L2 essence Sourcer + Geodata/geodata/%d_%d.l2j"

def le_tile(tx, ty, caminho=None):
    d = open(caminho or GEO % (tx, ty), 'rb').read(); p = 0; mv = memoryview(d)
    capas = {}
    chao = np.zeros((2048, 2048), np.int16); topo = np.zeros((2048, 2048), np.int16); cam = np.ones((2048, 2048), np.uint8); nswe = np.zeros((2048, 2048), np.uint8)
    for bx in range(256):
        for by in range(256):
            t = d[p]; p += 1; x0, y0 = bx * 8, by * 8
            if t == 0:
                h = struct.unpack_from('<h', d, p)[0]; p += 2
                chao[x0:x0 + 8, y0:y0 + 8] = h; topo[x0:x0 + 8, y0:y0 + 8] = h; nswe[x0:x0 + 8, y0:y0 + 8] = 15
            elif t == 1:
                v = np.frombuffer(mv[p:p + 128], '<i2').astype(np.int32); p += 128
                h = ((v & 0xFFF0).astype(np.int16) >> 1).astype(np.int16).reshape(8, 8); nw = (v & 0xF).astype(np.uint8).reshape(8, 8)
                chao[x0:x0 + 8, y0:y0 + 8] = h; topo[x0:x0 + 8, y0:y0 + 8] = h; nswe[x0:x0 + 8, y0:y0 + 8] = nw
            elif t == 2:
                for c in range(64):
                    n = d[p]; p += 1; v = np.frombuffer(mv[p:p + 2 * n], '<i2').astype(np.int32); p += 2 * n
                    h = ((v & 0xFFF0).astype(np.int16) >> 1).astype(np.int16); cx, cy = x0 + c // 8, y0 + c % 8
                    chao[cx, cy] = h.min(); topo[cx, cy] = h.max(); cam[cx, cy] = n; nswe[cx, cy] = (v[np.argmin(h)] & 0xF)
                    if n > 1: capas[(cx, cy)] = sorted(zip(h.tolist(), (v & 0xF).tolist()))
            else: raise ValueError('tipo de bloco desconhecido %d em %d,%d (offset %d)' % (t, bx, by, p))
    assert p == len(d), 'sobrou/faltou %d bytes' % (len(d) - p)
    le_tile.capas = capas      # {(celulaX, celulaY): [(altura uu, nswe) ... ordenado]} so das celulas com 2+ camadas
    return chao, topo, cam, nswe

if __name__ == '__main__':
    import sys
    tx, ty = int(sys.argv[1]), int(sys.argv[2]); c, t, n, w = le_tile(tx, ty)
    print('chao: min %d max %d (uu) -> %.1f a %.1f m; celulas com 2+ camadas: %d (%.1f%%)' % (c.min(), c.max(), c.min() / 50, c.max() / 50, (n > 1).sum(), (n > 1).mean() * 100))
