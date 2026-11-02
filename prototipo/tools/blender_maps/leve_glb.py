"""Deixa um GLB leve: texturas sem recorte viram JPEG, as com recorte real ficam PNG (mesmo limite de tamanho).
Rodar:  python leve_glb.py <entrada.glb> <saida.glb> [qualidade_jpeg=72]
Motivo: o exportador do Blender 5.1 grava tudo em PNG mesmo pedindo JPEG; um mapa de 291 texturas passa de 11 MB para ~2 MB."""
import sys, struct, json, io
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
Q = int(sys.argv[3]) if len(sys.argv) > 3 else 72
f = open(src, 'rb').read()
jl = struct.unpack('<I', f[12:16])[0]
j = json.loads(f[20:20 + jl])
bl = struct.unpack('<I', f[20 + jl:24 + jl])[0]
binc = f[28 + jl:28 + jl + bl]
bv = j['bufferViews']
troca = {}
# imagens usadas por material com recorte (MASK/BLEND) precisam do alpha; as demais viram JPEG mesmo que o PNG traga canal alpha
recorte = set()
for m in j.get('materials', []):
    if m.get('alphaMode', 'OPAQUE') == 'OPAQUE': continue
    t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
    if t is not None: recorte.add(j['textures'][t['index']]['source'])
for ix, im in enumerate(j.get('images', [])):
    v = im['bufferView']; b = binc[bv[v]['byteOffset']:bv[v]['byteOffset'] + bv[v]['byteLength']]
    img = Image.open(io.BytesIO(b))
    if ix in recorte: continue
    out = io.BytesIO(); img.convert('RGB').save(out, 'JPEG', quality=Q, optimize=True)
    troca[v] = out.getvalue(); im['mimeType'] = 'image/jpeg'
novo = bytearray()
for k, v in enumerate(bv):
    d = troca.get(k, binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
    while len(novo) % 4: novo.append(0)
    v['byteOffset'] = len(novo); v['byteLength'] = len(d); novo += d
while len(novo) % 4: novo.append(0)
j['buffers'][0]['byteLength'] = len(novo)
jb = json.dumps(j, separators=(',', ':')).encode()
while len(jb) % 4: jb += b' '
tot = 12 + 8 + len(jb) + 8 + len(novo)
open(dst, 'wb').write(struct.pack('<4sII', b'glTF', 2, tot) + struct.pack('<I4s', len(jb), b'JSON') + jb + struct.pack('<I4s', len(novo), b'BIN\0') + bytes(novo))
print('texturas recodificadas', len(troca), 'de', len(j.get('images', [])), '->', round(tot / 1e6, 1), 'MB')
