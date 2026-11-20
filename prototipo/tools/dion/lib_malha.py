"""Leitura de glTF exportado pelo UModel (so o que precisamos: posicao, normal, uv, indices por primitiva + nome do material) e matriz de instancia dos atores L2."""
import json, struct, base64, os, numpy as np

def ler_gltf(caminho):
    g = json.load(open(caminho)); base = os.path.dirname(caminho); bufs = []
    for b in g['buffers']:
        uri = b['uri']; bufs.append(base64.b64decode(uri.split(',', 1)[1]) if uri.startswith('data:') else open(os.path.join(base, uri), 'rb').read())
    def acc(i):
        a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]; off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        passo = v.get('byteStride') or n * np.dtype(dt).itemsize
        if passo == n * np.dtype(dt).itemsize: return np.frombuffer(bufs[v['buffer']], dt, a['count'] * n, off).reshape(-1, n).astype(np.float32 if dt == '<f4' else np.int64)
        return np.stack([np.frombuffer(bufs[v['buffer']], dt, n, off + k * passo) for k in range(a['count'])]).astype(np.float32)
    prims = []
    for m in g['meshes']:
        for p in m['primitives']:
            at = p['attributes']; pos = acc(at['POSITION'])
            prims.append({'pos': pos, 'nor': acc(at['NORMAL']) if 'NORMAL' in at else None, 'uv': acc(at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None,
                          'idx': acc(p['indices']).reshape(-1) if 'indices' in p else np.arange(len(pos)), 'mat': g['materials'][p['material']]['name'] if 'material' in p else ''})
    return prims

def matriz_ue(pitch, yaw, roll):
    """FRotationMatrix da UE (vetores-linha, rotacao em unidades de 65536 = 360 graus) -> matriz 3x3 para v_novo = v @ M."""
    p, y, r = [a * 2 * np.pi / 65536.0 for a in (pitch, yaw, roll)]
    sp, cp, sy, cy, sr, cr = np.sin(p), np.cos(p), np.sin(y), np.cos(y), np.sin(r), np.cos(r)
    return np.array([[cp * cy, cp * sy, sp], [sr * sp * cy - cr * sy, sr * sp * sy + cr * cy, -sr * cp], [-(cr * sp * cy + sr * sy), cy * sr - cr * sp * sy, cr * cp]], np.float64)

# glTF (UModel) -> UE: x = gx, y = -gz, z = gy ; 1 unidade glTF = 100 uu
G2U = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], np.float64)      # v_ue_linha = v_gltf_linha @ G2U  ->  (gx, -gz, gy)
