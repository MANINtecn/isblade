"""Leitor minimo de pacotes Unreal Engine 2 (L2 Interlude, versao 123/28): tabelas de nomes, imports e exports, e a lista de propriedades de um objeto.
Usado para tirar de um mapa do L2 (maps/20_22.unr = Dion) a POSICAO de cada casa, arvore e objeto (StaticMeshActor) e o terreno, que o UModel nao exporta.
Uso: from ue2_pkg import Pacote;  p = Pacote(r'.../maps/20_22.unr');  p.exports  (lista de dicts: nome, classe, offset, tamanho)"""
import struct, sys

class Pacote:
    def __init__(self, caminho):
        self.d = open(caminho, 'rb').read(); d = self.d
        tag, ver, lic, flags, nn, no, ne, eo, ni, io = struct.unpack('<IHHIiiiiii', d[:36])
        assert tag == 0x9E2A83C1, 'nao e pacote UE2: %x' % tag
        self.ver, self.lic = ver, lic
        self.nomes = []; p = no
        for _ in range(nn):
            n, p = self.compacto(p)
            if n < 0: s = d[p:p - n * 2 - 2].decode('utf-16le', 'replace'); p += -n * 2
            else: s = d[p:p + n - 1].decode('latin1'); p += n
            p += 4; self.nomes.append(s)
        self.imports = []; p = io
        for _ in range(ni):
            cp, p = self.compacto(p); cn, p = self.compacto(p); pk = struct.unpack_from('<i', d, p)[0]; p += 4; on, p = self.compacto(p)
            self.imports.append({'pacote_classe': self.nomes[cp], 'classe': self.nomes[cn], 'grupo': pk, 'nome': self.nomes[on]})
        self.exports = []; p = eo
        for _ in range(ne):
            ci, p = self.compacto(p); si, p = self.compacto(p); gr = struct.unpack_from('<i', d, p)[0]; p += 4; on, p = self.compacto(p)
            fl = struct.unpack_from('<I', d, p)[0]; p += 4; sz, p = self.compacto(p); off = 0
            if sz > 0: off, p = self.compacto(p)
            self.exports.append({'classe_idx': ci, 'super': si, 'grupo': gr, 'nome': self.nomes[on], 'flags': fl, 'tam': sz, 'off': off})
        for e in self.exports: e['classe'] = self.nome_ref(e['classe_idx'])

    def compacto(self, p):
        b = self.d[p]; p += 1; neg = b & 0x80; v = b & 0x3F
        if b & 0x40:
            sh = 6
            while True:
                c = self.d[p]; p += 1; v |= (c & 0x7F) << sh; sh += 7
                if not (c & 0x80): break
        return (-v if neg else v), p

    def nome_ref(self, i):
        """indice de objeto: >0 export (i-1), <0 import (-i-1), 0 = nada -> nome do objeto/classe"""
        if i > 0: return self.exports[i - 1]['nome']
        if i < 0: return self.imports[-i - 1]['nome']
        return 'None'

    def propriedades(self, e):
        """lista de propriedades de um export (sem ler o que vem depois da lista). Retorna dict nome -> valor (float/int/tupla/str)."""
        d = self.d; p = e['off']; fim = e['off'] + e['tam']; out = {}
        if e['flags'] & 0x02000000:        # RF_HasStack (atores de mapa tem): Node, StateNode, ProbeMask(8), LatentAction(4), Offset
            nodo, p = self.compacto(p); _, p = self.compacto(p); p += 8 + 4      # Node, StateNode, ProbeMask(8), LatentAction(4)
            if nodo: _, p = self.compacto(p)      # Offset
        while p < fim:
            ni, p = self.compacto(p); nome = self.nomes[ni]
            if nome == 'None': break
            info = d[p]; p += 1; tipo = info & 0x0F; cod = (info >> 4) & 7; arr = bool(info & 0x80); sn = None
            if tipo == 10: sni, p = self.compacto(p); sn = self.nomes[sni]
            if cod == 5: tam = d[p]; p += 1
            elif cod == 6: tam = struct.unpack_from('<H', d, p)[0]; p += 2
            elif cod == 7: tam = struct.unpack_from('<i', d, p)[0]; p += 4
            else: tam = (1, 2, 4, 12, 16)[cod]
            idx = 0
            if arr and tipo != 3:
                b = d[p]; p += 1
                if b < 128: idx = b
                elif b < 192: idx = ((b & 0x3F) << 8) | d[p]; p += 1
                else: idx = ((b & 0x3F) << 24) | (d[p] << 16) | (d[p + 1] << 8) | d[p + 2]; p += 3
            dado = d[p:p + tam] if tipo != 3 else b''; p += tam if tipo != 3 else 0
            if tipo == 3: v = arr
            elif tipo == 2: v = struct.unpack('<i', dado)[0]
            elif tipo == 4: v = struct.unpack('<f', dado)[0]
            elif tipo == 1: v = dado[0]
            elif tipo == 5: v = self.compacto_de(dado)
            elif tipo == 6: v = self.nomes[self.compacto_de(dado)]
            elif tipo == 10 and sn == 'Vector' and tam == 12: v = struct.unpack('<3f', dado)
            elif tipo == 10 and sn == 'Rotator' and tam == 12: v = struct.unpack('<3i', dado)
            elif tipo == 10 and tam == 12: v = struct.unpack('<3f', dado)
            else: v = dado
            out[nome] = v if not idx else out.get(nome, {}) | {idx: v} if isinstance(out.get(nome, {}), dict) else v
        return out

    def compacto_de(self, dado):
        b = dado[0]; neg = b & 0x80; v = b & 0x3F; q = 1
        if b & 0x40:
            sh = 6
            while True:
                c = dado[q]; q += 1; v |= (c & 0x7F) << sh; sh += 7
                if not (c & 0x80): break
        return -v if neg else v

if __name__ == '__main__':
    pk = Pacote(sys.argv[1]); print('versao', pk.ver, pk.lic, 'nomes', len(pk.nomes), 'imports', len(pk.imports), 'exports', len(pk.exports))
    import collections; print(collections.Counter(e['classe'] for e in pk.exports).most_common(8))
    n = 0
    for e in pk.exports:
        if e['classe'] == 'StaticMeshActor':
            pr = pk.propriedades(e); print(e['nome'], {k: (pk.nome_ref(v) if k == 'StaticMesh' and isinstance(v, int) else v) for k, v in pr.items()}); n += 1
            if n >= 6: break
