"""Le um objeto Polys do UE2 (L2 Interlude): lista de FPoly (base, normal, texU, texV, vertices, flags, material). Formato conferido contra Polys2056 de Dion."""
import struct
def ler_polys(pk, e):
    d = pk.d; p = e['off']; fim = p + e['tam']
    _, p = pk.compacto(p)                                   # lista de propriedades vazia ('None')
    n, _ = struct.unpack_from('<ii', d, p); p += 8
    out = []
    for _ in range(n):
        nv, p = pk.compacto(p)
        if not 3 <= nv <= 16 or p + 12 * (4 + nv) + 4 > fim: raise ValueError('poly invalido')
        v = [struct.unpack_from('<3f', d, p + 12 * i) for i in range(4 + nv)]; p += 12 * (4 + nv)
        flags = struct.unpack_from('<I', d, p)[0]; p += 4
        c = []
        for _k in range(5): x, p = pk.compacto(p); c.append(x)       # Actor, Material, ItemName, ?, ?
        p += 4 + 4                                                  # LightMapScale (float), iLink (int)
        out.append({'base': v[0], 'n': v[1], 'tu': v[2], 'tv': v[3], 'v': v[4:], 'flags': flags, 'mat': c[1]})
    return out
