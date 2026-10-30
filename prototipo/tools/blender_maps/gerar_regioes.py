"""Gera mini_toi_regioes.json (salao do Baium, porta de entrada) a partir do .blend, em coordenadas do jogo (x, z = -y do Blender).
Rodar: blender -b <montagem.blend> --python gerar_regioes.py -- <saida.json> [objeto_salao=chao_baium_salao] [folhas_porta=StaticMeshActor455,StaticMeshActor474]
- salao: contorno (convexo) do topo do chao do salao, no sentido anti-horario + centro.
- porta_entrada: contorno (convexo) das folhas da porta no plano + altura; o jogo bloqueia esse contorno enquanto a porta esta fechada.
O jogo desce as folhas (por nome no GLB) para abrir."""
import bpy, sys, json, mathutils
a = sys.argv[sys.argv.index('--') + 1:]
OUT = a[0]; SAL = a[1] if len(a) > 1 else 'chao_baium_salao'; FOLHAS = (a[2] if len(a) > 2 else 'StaticMeshActor455,StaticMeshActor474').split(',')
for ob in list(bpy.data.objects):
    if ob.mode == 'EDIT': bpy.context.view_layer.objects.active = ob; bpy.ops.object.mode_set(mode='OBJECT')
def hull(P):
    P = sorted(set(P))
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in P:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    up = []
    for p in reversed(P):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
def jogo(v): return (round(v.x, 2), round(-v.y, 2))          # glTF: X = x_blender, Z = -y_blender
def pts_de(ob, so_topo=False):
    M = ob.matrix_world; out = []; zs = []
    for v in ob.data.vertices:
        w = M @ v.co; out.append(jogo(w)); zs.append(w.z)
    return out, zs
s = bpy.data.objects[SAL]
M = s.matrix_world; topo = []
for p in s.data.polygons:
    if (M.to_3x3() @ p.normal).z > 0.5:
        for i in p.vertices: topo.append(jogo(M @ s.data.vertices[i].co))
poly = hull(topo); cx = sum(p[0] for p in poly) / len(poly); cz = sum(p[1] for p in poly) / len(poly)
ps, zs = [], []
for n in FOLHAS:
    o = bpy.data.objects[n]; p, z = pts_de(o); ps += p; zs += z
porta = hull(ps); pcx = sum(p[0] for p in porta) / len(porta); pcz = sum(p[1] for p in porta) / len(porta)
d = dict(unidade='coordenadas do jogo: X, Z (=-y do Blender); altura em unidades do jogo relativas ao pedestal',
         salao=dict(poligono=[list(p) for p in poly], centro=[round(cx, 2), round(cz, 2)], altura_piso=round(max(v.co.z for v in s.data.vertices) + s.matrix_world.translation.z, 2)),
         porta_entrada=dict(objetos=FOLHAS, poligono=[list(p) for p in porta], centro=[round(pcx, 2), round(pcz, 2)], z_min=round(min(zs), 2), z_max=round(max(zs), 2)))
import math as _m                                                    # arena do Baium = circulo gigante do 3o andar (medido no mapa de colisao): centro (-28.4,-53.85), raio 62
_dx, _dz = -28.4 - pcx, -53.85 - pcz; _l = _m.hypot(_dx, _dz)
d['arena'] = dict(centro=[-28.4, -53.85], raio=62.0, spawn=[round(pcx + _dx / _l * 12, 2), round(pcz + _dz / _l * 12, 2)], gatilho=34)
json.dump(d, open(OUT, 'w', encoding='utf-8'), indent=1)
print('REGIOES salao', poly, 'centro', d['salao']['centro'], '| porta', porta, 'altura', d['porta_entrada']['z_min'], d['porta_entrada']['z_max'])
