# Fecha o mapa-mundi (09/11/2026, pedido do dono: "fechar o mapa porem emendando"): TERRA_FUNDO = terreno de fundo do mundo inteiro (grade de 6 m).
#   - onde ja existe chao (CHAO da cidade, CAMPO_TI, BASE_TORRE e o Terreno de cada mapa): copia a altura e fica 0,6 m ABAIXO (escondido);
#   - nos vaos entre as pecas: altura interpolada das bordas vizinhas (relaxacao), emenda sem degrau;
#   - longe de qualquer chao (> 70 m): sobe em cordilheira (ondas em varias direcoes + cristas angulosas) = borda do mundo.
# Rodar de novo depois de mexer nas pecas/mapas: no Blender com o mapa_mundi.blend aberto: exec(open(r"...\fechar_mundo.py").read())
#   ou sem janela: blender -b mapa_mundi.blend --python fechar_mundo.py   (recria o TERRA_FUNDO e salva)
import bpy, bmesh, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
CHAOS = ['CHAO', 'CAMPO_TI', 'BASE_TORRE', 'Terreno', 'Terreno.001', 'Terreno.002', 'Terreno.003']
X0, X1, Y0, Y1, P = -810.0, 690.0, -670.0, 900.0, 6.0
o = bpy.data.objects.get('TERRA_FUNDO')
if o: bpy.data.objects.remove(o, do_unlink=True)
dg = bpy.context.evaluated_depsgraph_get(); arvs = []
for n in CHAOS:
    ob = bpy.data.objects.get(n)
    if not ob: continue
    ev = ob.evaluated_get(dg); m = ev.to_mesh(); M = ob.matrix_world
    arvs.append(BVHTree.FromPolygons([M @ v.co for v in m.vertices], [tuple(p.vertices) for p in m.polygons])); ev.to_mesh_clear()
nx, ny = int((X1 - X0) / P) + 1, int((Y1 - Y0) / P) + 1
yy, xx = np.mgrid[0:ny, 0:nx]; wx = X0 + xx * P; wy = Y0 + yy * P
H = np.full((ny, nx), np.nan)
for j in range(ny):
    for i in range(nx):
        best = None
        for b in arvs:
            h = b.ray_cast(Vector((wx[j, i], wy[j, i], 1500.0)), Vector((0, 0, -1)), 3000.0)
            if h[0] is not None and (best is None or h[0].z > best): best = h[0].z
        if best is not None: H[j, i] = best
conhec = ~np.isnan(H)
F = np.where(conhec, H, np.nanmean(H))
for it in range(1500): F = np.where(conhec, H, (np.roll(F, 1, 0) + np.roll(F, -1, 0) + np.roll(F, 1, 1) + np.roll(F, -1, 1)) / 4.0)
D = np.where(conhec, 0, 9999).astype(float)
for it in range(80): D = np.minimum(D, np.minimum.reduce([np.roll(D, 1, 0), np.roll(D, -1, 0), np.roll(D, 1, 1), np.roll(D, -1, 1)]) + 1)
dm = D * P
def ondas(x, y):
    s = np.zeros_like(x)
    for f, a, d, ph in [(.011, 1.0, .37, 0), (.017, .7, 1.9, 1.3), (.023, .5, 2.8, 2.2), (.041, .3, .9, .4), (.067, .18, 2.3, 1.7)]:
        s += a * np.sin(f * (x * np.cos(d) + y * np.sin(d)) + ph)
    return s
cristas = 1 - np.abs(np.sin(.019 * (wx * np.cos(.6) + wy * np.sin(.6)) + .5 * np.sin(.013 * (wx * np.cos(2.1) + wy * np.sin(2.1)))))
mont = np.clip((dm - 70.0) / 120.0, 0, 1); mont = mont * mont * (3 - 2 * mont)
Z = F + mont * (38 + 11 * ondas(wx, wy) + 30 * cristas) + (1 - mont) * ondas(wx, wy) * 1.2 * np.clip(dm / 40.0, 0, 1)
Z = np.where(conhec, H - 0.6, Z)
bm = bmesh.new(); V = [[bm.verts.new((float(wx[j, i]), float(wy[j, i]), float(Z[j, i]))) for i in range(nx)] for j in range(ny)]
for j in range(ny - 1):
    for i in range(nx - 1): bm.faces.new((V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]))
me = bpy.data.meshes.new('TERRA_FUNDO'); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
mt = bpy.data.materials.get('CAMPO_GRAMA')
if mt: me.materials.append(mt)
ob = bpy.data.objects.new('TERRA_FUNDO', me)
c = bpy.data.collections.get('MUNDO_CAMPO') or bpy.data.collections.new('MUNDO_CAMPO')
if c.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(c)
c.objects.link(ob)
bpy.ops.wm.save_mainfile()
print('TERRA_FUNDO: %d x %d, %d com chao embaixo, pico %.0f m' % (nx, ny, int(conhec.sum()), float(Z.max())))
