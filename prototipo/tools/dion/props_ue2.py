"""Le propriedades UE2 de um trecho de bytes (struct dentro de array). Devolve lista de (nome, tipo, valor_bruto) e fronteiras 'None'."""
import struct
def le_props(pk, dado, ini=0, fim=None):
    d = dado; p = ini; fim = len(d) if fim is None else fim; out = []
    while p < fim:
        ni, p = pk.compacto_de_em(d, p)
        if not 0 <= ni < len(pk.nomes): out.append(('?ERRO', ni, p)); break
        nome = pk.nomes[ni]
        if nome == 'None': out.append(('None', None, None)); continue
        info = d[p]; p += 1; tipo = info & 0x0F; cod = (info >> 4) & 7; arr = bool(info & 0x80); sn = None
        if tipo == 10: si, p = pk.compacto_de_em(d, p); sn = pk.nomes[si]
        if cod == 5: tam = d[p]; p += 1
        elif cod == 6: tam = struct.unpack_from('<H', d, p)[0]; p += 2
        elif cod == 7: tam = struct.unpack_from('<i', d, p)[0]; p += 4
        else: tam = (1, 2, 4, 12, 16)[cod]
        idx = None
        if arr and tipo != 3:
            b = d[p]; p += 1
            if b < 128: idx = b
            elif b < 192: idx = ((b & 0x3F) << 8) | d[p]; p += 1
            else: idx = ((b & 0x3F) << 24) | (d[p] << 16) | (d[p + 1] << 8) | d[p + 2]; p += 3
        if tipo == 3: out.append((nome, 'bool', arr)); continue
        val = d[p:p + tam]; p += tam
        out.append((nome, (tipo, sn, idx), val))
    return out
