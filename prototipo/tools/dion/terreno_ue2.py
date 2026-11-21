"""Camadas de pintura e luz do terreno de um tile do L2 (TerrainInfo + 256 TerrainSector): ate 8 mapas de peso 17x17 por setor -> mapas 257x257."""
import struct, numpy as np
def cp(b, p):
    x = b[p]; p += 1; neg = x & 0x80; v = x & 0x3F
    if x & 0x40:
        sh = 6
        while True:
            c = b[p]; p += 1; v |= (c & 0x7F) << sh; sh += 7
            if not c & 0x80: break
    return (-v if neg else v), p
def setores(pk):
    d = pk.d; e = [x for x in pk.exports if x['classe'] == 'TerrainInfo'][0]
    pr = pk.propriedades(e)
    p = e['off']; fim = p + e['tam']
    if e['flags'] & 0x02000000:
        nodo, p = pk.compacto(p); _, p = pk.compacto(p); p += 12
        if nodo: _, p = pk.compacto(p)
    while True:
        ni, p = pk.compacto(p); nome = pk.nomes[ni]
        if nome == 'None': break
        info = d[p]; p += 1; tipo = info & 0xF; cod = (info >> 4) & 7; arr = bool(info & 0x80)
        if tipo == 10: _, p = pk.compacto(p)
        if cod == 5: tam = d[p]; p += 1
        elif cod == 6: tam = struct.unpack_from('<H', d, p)[0]; p += 2
        elif cod == 7: tam = struct.unpack_from('<i', d, p)[0]; p += 4
        else: tam = (1, 2, 4, 12, 16)[cod]
        if arr and tipo != 3:
            b = d[p]; p += 1
            if b >= 128: p += 1 if b < 192 else 3
        if tipo != 3: p += tam
    n, p = cp(d, p); refs = []
    for _ in range(n): r, p = cp(d, p); refs.append(r)
    out = []
    for r in refs:
        s = pk.exports[r - 1]; raw = d[s['off']:s['off'] + s['tam']]; q = 52; bl = []
        while q < len(raw) - 3:
            v, q2 = cp(raw, q)
            if v != 289: break
            bl.append(np.frombuffer(raw[q2:q2 + v], np.uint8).reshape(17, 17)); q = q2 + v
        out.append((s['nome'], raw[:52], bl))
    return pr, out
