# Pecas de emenda do mapa-mundi (09/11/2026, aprovadas pelo dono): BASE_TORRE (planalto em volta da Torre do Baium) e PASSARELA_PANTANO
# (caminho de rocha ligando as duas areas do Pantano). Cada peca fica PRESA ao suporte do mapa (MUNDO_torre / MUNDO_pantano): mover o mapa leva a peca.
# Rodar: blender -b mapa_mundi.blend --python pecas_emenda.py   (recria as pecas se ja existirem)
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
random.seed(7)
def mat(nome, cor):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs["Base Color"].default_value = (*cor, 1); b.inputs["Roughness"].default_value = .95; m.diffuse_color = (*cor, 1); return m
def col(nome):
    c = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    if c.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(c)
    return c
for n in ("BASE_TORRE", "PASSARELA_PANTANO", "PORTAL_TORRE"):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
ruido = lambda x, y: (math.sin(x * .07) * math.cos(y * .06) + .5 * math.sin(x * .19 + 1.3) * math.cos(y * .17 - .4))
def chao_campo(x, y):                               # altura do campo do jogo (mesma funcao do mapa_mundi.py) em coordenadas do Blender
    gx, gz = x, -y; d = math.hypot(gx, gz)
    if d <= 76: return 0.0
    blend = min(1.0, (d - 76.0) / 22.0); h = math.sin(gx*0.032)*math.cos(gz*0.032)*4.2 + math.sin(gx*0.065+1.1)*2.0 + math.cos(gz*0.055-0.7)*1.6
    if d > 260: h -= (d - 260) * 0.065
    return max(-4.8, h * blend)
# ---------- planalto da Torre ----------
T = bpy.data.objects["MUNDO_torre"]; fil = [c for c in T.children_recursive if c.type == 'MESH']
mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
for c in fil:
    for v in c.bound_box:
        w = c.matrix_world @ Vector(v); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2; dist = math.hypot(cx, cy)
H_TOPO, R_IN, R_PLANO = 12.0, 55.0, 110.0
R_OUT = max(190.0, dist - 300 + 30)                 # vai ate encostar no anel do campo (300 m da cidade)
bm = bmesh.new(); nr, ns = 40, 120; an = []
for i in range(nr):
    r = R_IN + (R_OUT - R_IN) * (i / (nr - 1)) ** 1.15; lin = []
    for k in range(ns):
        a = 2 * math.pi * k / ns; x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        if r <= R_PLANO: z = H_TOPO + ruido(x, y) * .25
        else:
            t = min(1.0, (r - R_PLANO) / (R_OUT - R_PLANO)); t = t * t * (3 - 2 * t); z = H_TOPO + (chao_campo(x, y) - 1.0 - H_TOPO) * t + ruido(x, y) * 1.6 * math.sin(math.pi * t)
        lin.append(bm.verts.new((x, y, z)))
    an.append(lin)
for i in range(nr - 1):
    for k in range(ns): bm.faces.new((an[i][k], an[i][(k + 1) % ns], an[i + 1][(k + 1) % ns], an[i + 1][k]))
me = bpy.data.meshes.new("BASE_TORRE"); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new("BASE_TORRE", me); col("MUNDO_EMENDAS").objects.link(ob); me.materials.append(mat("PEDRA_PLANALTO", (.42, .4, .34)))
for p in me.polygons: p.use_smooth = True
ob.parent = T; ob.matrix_parent_inverse = T.matrix_world.inverted()
# portal na frente da torre, do lado da cidade
dx, dy = -cx / dist, -cy / dist
pt = bpy.data.objects.new("PORTAL_TORRE", None); pt.empty_display_type = 'CUBE'; pt.empty_display_size = 4
pt.location = (cx + dx * 85, cy + dy * 85, H_TOPO + 3); col("MUNDO_EMENDAS").objects.link(pt); pt.parent = T; pt.matrix_parent_inverse = T.matrix_world.inverted()
print("BASE_TORRE centro", round(cx), round(cy), "dist", round(dist), "raio ate", round(R_OUT), "topo", H_TOPO)
# ---------- passarela do Pantano (coordenadas do proprio mapa: jogo (x, z, h) -> (x, -z, h)) ----------
P = bpy.data.objects["MUNDO_pantano"]
A, B = Vector((-36.9, -1.1, -9.4)), Vector((-37.6, -69.4, -9.5))
eixo = (B - A); L = eixo.length; u = eixo.normalized(); lado = Vector((-u.y, u.x, 0)); EXT, LARG, ALT = 8.0, 13.0, 9.0
bm = bmesh.new(); seg = int((L + 2 * EXT) / 2) + 1; cima = []; baixo = []
for i in range(seg):
    t = -EXT + (L + 2 * EXT) * i / (seg - 1); c = A + u * t; meio = math.sin(math.pi * max(0, min(1, t / L))) * 1.2
    larg = LARG * (1 + .25 * math.sin(i * .9) * random.random())
    lc = []; lb = []
    for s in (-1, -.5, 0, .5, 1):
        p = c + lado * s * larg / 2; z = -9.0 + meio + (random.random() - .5) * .5 * (1 - abs(s)) - abs(s) * .8
        lc.append(bm.verts.new((p.x, p.y, z)))
    for s in (-1, 1):
        p = c + lado * s * (larg / 2 + 2.5); lb.append(bm.verts.new((p.x, p.y, -9.0 - ALT)))
    cima.append(lc); baixo.append(lb)
for i in range(seg - 1):
    for j in range(4): bm.faces.new((cima[i][j], cima[i][j + 1], cima[i + 1][j + 1], cima[i + 1][j]))
    bm.faces.new((baixo[i][0], cima[i][0], cima[i + 1][0], baixo[i + 1][0])); bm.faces.new((cima[i][4], baixo[i][1], baixo[i + 1][1], cima[i + 1][4]))
me = bpy.data.meshes.new("PASSARELA_PANTANO"); bm.to_mesh(me); bm.free()
op = bpy.data.objects.new("PASSARELA_PANTANO", me); col("MUNDO_EMENDAS").objects.link(op); me.materials.append(mat("ROCHA_VULCANICA", (.16, .12, .11)))
op.parent = P                                      # coordenadas ja sao do espaco do mapa
print("PASSARELA_PANTANO", round(L), "m + pontas, largura", LARG)
bpy.ops.wm.save_mainfile()
print("salvo")
