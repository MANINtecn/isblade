# TERRA_PANTANO (09/11/2026, pedido do dono: "eu quero terreno, espaco para fazer mais coisa", nao ponte): area larga de terra preenchendo o vale de lava
# (-32 m) entre as duas areas grandes do Pantano. Chao ondulado que vai da altura do lado da entrada (+0,6 m) ate a do outro lado (-2,6 m), dois morros
# para relevo/conteudo, borda em penhasco irregular descendo ate a lava. Presa ao MUNDO_pantano (coordenadas do proprio mapa). Substitui a PASSARELA_PANTANO.
import bpy, bmesh, math, random
from mathutils import Vector
random.seed(11)
for n in ("PASSARELA_PANTANO", "TERRA_PANTANO"):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
P = bpy.data.objects["MUNDO_pantano"]
# jogo (x, z) do mapa -> Blender local (x, -z)
CX, CZ = -37.0, 35.0; RX, RZ = 58.0, 68.0          # meia-largura (atravessado) e meio-comprimento (do lado A para o B)
HA, HB, LAVA = 0.6, -2.6, -32.0
def ruido(x, z): return math.sin(x * .09 + 1.7) * math.cos(z * .08) * 1.6 + math.sin(x * .21) * math.cos(z * .19 + .6) * .6
def borda(a): return 1 + .16 * math.sin(3 * a + .4) + .09 * math.sin(7 * a + 1.9) + .05 * math.sin(13 * a)      # contorno organico
MORROS = [(-55.0, 28.0, 9.0, 16.0), (-18.0, 52.0, 6.5, 13.0)]      # x, z, altura, raio
def altura(x, z):
    t = max(0.0, min(1.0, (z - (CZ - RZ)) / (2 * RZ))); t = t * t * (3 - 2 * t)
    h = HA + (HB - HA) * t + ruido(x, z)
    for mx, mz, mh, mr in MORROS:
        d = math.hypot(x - mx, z - mz) / mr
        if d < 1: h += mh * (1 - d * d) ** 2
    return h
bm = bmesh.new(); NA, NR = 96, 30; aneis = []
for i in range(NR + 1):
    f = i / NR; lin = []
    for k in range(NA):
        a = 2 * math.pi * k / NA; e = borda(a) * f
        x, z = CX + math.cos(a) * RX * e, CZ + math.sin(a) * RZ * e
        lin.append(bm.verts.new((x, -z, altura(x, z))))
    aneis.append(lin)
centro = bm.verts.new((CX, -CZ, altura(CX, CZ)))
for k in range(NA): bm.faces.new((centro, aneis[1][k], aneis[1][(k + 1) % NA]))
for i in range(1, NR):
    for k in range(NA): bm.faces.new((aneis[i][k], aneis[i + 1][k], aneis[i + 1][(k + 1) % NA], aneis[i][(k + 1) % NA]))
# penhasco: desce da borda ate a lava, com saliencias
saia = []
for k in range(NA):
    v = aneis[NR][k].co; a = 2 * math.pi * k / NA; s = 1 + random.uniform(.03, .1)
    x, zz = CX + (v.x - CX) * s, -CZ + (v.y + CZ) * s
    saia.append(bm.verts.new((x, zz, LAVA - 2)))
for k in range(NA): bm.faces.new((aneis[NR][k], saia[k], saia[(k + 1) % NA], aneis[NR][(k + 1) % NA]))
me = bpy.data.meshes.new("TERRA_PANTANO"); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
m = bpy.data.materials.get("ROCHA_VULCANICA") or bpy.data.materials.new("ROCHA_VULCANICA"); m.use_nodes = True
b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs["Base Color"].default_value = (.24, .19, .15, 1); m.diffuse_color = (.24, .19, .15, 1)
me.materials.append(m)
o = bpy.data.objects.new("TERRA_PANTANO", me)
c = bpy.data.collections.get("MUNDO_EMENDAS") or bpy.data.collections.new("MUNDO_EMENDAS")
if c.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(c)
c.objects.link(o); o.parent = P
area = math.pi * RX * RZ
print("TERRA_PANTANO pronta: ~%.0f x %.0f m, area ~%.0f m2 (a segunda area do mapa tem 12.600 m2)" % (2 * RX, 2 * RZ, area))
bpy.ops.wm.save_mainfile(); print("salvo")
