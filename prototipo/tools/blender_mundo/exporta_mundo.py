# Exporta o mapa-mundi do Blender para o jogo (09/11/2026, mundo aberto estilo Priston Tale, etapa 1).
# Le o mapa_mundi.blend e grava em prototipo/assets/mundo/:
#   mundo_grade.json  = cabecalho (x0, z0, passo, nx, nz em coordenadas do JOGO; biomas; regioes; texturas e escalas) + mapas (pos/rotY dos suportes) + spots
#   mundo_grade.bin   = por celula, em ordem z depois x: altura int16 (cm), pesos de bioma 5 x uint8, regiao uint8, andavel uint8
#   <textura>.png     = as texturas da fusao (mesma escala que cada mapa usa)
# Jogo (x, y, z) = Blender (x, z, -y). Regiao: 0 = campo/cidade, 1 Cruma, 2 Fortaleza, 3 Pantano, 4 Torre (onde o chao e o do proprio mapa).
# Rodar: blender -b tools/blender_mundo/mapa_mundi.blend --python tools/blender_mundo/exporta_mundo.py
import bpy, json, os, struct, math, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"; OUT = os.path.join(R, "assets", "mundo"); os.makedirs(OUT, exist_ok=True)
PASSO = 3.0
CHAOS = [("CHAO", 0), ("CAMPO_TI", 0), ("TERRA_FUNDO", -1), ("Terreno", 1), ("Terreno.001", 2), ("Terreno.002", 3), ("Terreno.003", 4), ("BASE_TORRE", 4)]
BIOMAS = [("campo", "Terreno.001", 290.0), ("cruma", "Terreno", 70.0), ("fortaleza", "Terreno.001", 290.0), ("pantano", "Terreno.002", 352.0), ("torre", "Terreno.003", 363.0)]
dg = bpy.context.evaluated_depsgraph_get(); arv = []
for n, reg in CHAOS:
    o = bpy.data.objects.get(n)
    if not o: continue
    ev = o.evaluated_get(dg); m = ev.to_mesh(); M = o.matrix_world
    arv.append((reg, BVHTree.FromPolygons([M @ v.co for v in m.vertices], [tuple(p.vertices) for p in m.polygons]))); ev.to_mesh_clear()
T = bpy.data.objects["TERRA_FUNDO"]; bb = [T.matrix_world @ Vector(c) for c in T.bound_box]
bx0, bx1 = min(v.x for v in bb), max(v.x for v in bb); by0, by1 = min(v.y for v in bb), max(v.y for v in bb)
# grade em coordenadas do jogo: x = bx, z = -by
x0, z0 = bx0, -by1; nx, nz = int((bx1 - bx0) / PASSO) + 1, int((by1 - by0) / PASSO) + 1
H = np.full((nz, nx), -50.0); REG = np.full((nz, nx), -1, np.int16)
for j in range(nz):
    gz = z0 + j * PASSO; by = -gz
    for i in range(nx):
        gx = x0 + i * PASSO; best = None
        for reg, t in arv:
            h = t.ray_cast(Vector((gx, by, 2000.0)), Vector((0, 0, -1)), 4000.0)
            if h[0] is not None and (best is None or h[0].z > best[0] + 0.05): best = (h[0].z, reg)
        if best: H[j, i] = best[0]; REG[j, i] = best[1]
# biomas: celula do fundo herda o bioma vizinho mais proximo; divisas borradas
L = REG.copy()
for it in range(400):
    if (L >= 0).all(): break
    for ax, sh in ((0, 1), (0, -1), (1, 1), (1, -1)):
        v = np.roll(L, sh, ax); L = np.where((L < 0) & (v >= 0), v, L)
L = np.where(L < 0, 0, L)
W = np.stack([(L == b).astype(np.float32) for b in range(5)])
for it in range(26): W = (W + np.roll(W, 1, 1) + np.roll(W, -1, 1) + np.roll(W, 1, 2) + np.roll(W, -1, 2)) / 5.0
W /= np.maximum(W.sum(0), 1e-6)
# andavel: inclinacao ate ~40 graus e fora da cordilheira (muito acima dos vizinhos de baixo)
gy, gxx = np.gradient(H, PASSO); incl = np.degrees(np.arctan(np.hypot(gxx, gy)))
anda = (incl < 40.0) & (H > -45.0)
regiao = np.where(REG > 0, REG, 0).astype(np.uint8)
# binario
buf = bytearray()
Hc = np.clip(np.round(H * 100), -32768, 32767).astype('<i2'); Wb = np.clip(np.round(W * 255), 0, 255).astype(np.uint8)
for j in range(nz):
    for i in range(nx):
        buf += struct.pack('<h5BBB', int(Hc[j, i]), *[int(Wb[b, j, i]) for b in range(5)], int(regiao[j, i]), 1 if anda[j, i] else 0)
open(os.path.join(OUT, "mundo_grade.bin"), "wb").write(bytes(buf))
# texturas
tex = []
def img_de(n):
    o = bpy.data.objects.get(n)
    for mt in (o.data.materials if o else []):
        if mt and mt.use_nodes:
            for nd in mt.node_tree.nodes:
                if nd.type == 'TEX_IMAGE' and nd.image: return nd.image
def salva(img, nome):
    c = img.copy(); c.filepath_raw = os.path.join(OUT, nome); c.file_format = 'PNG'; c.save(); bpy.data.images.remove(c); return nome
for nome, ob, esc in BIOMAS: tex.append({"bioma": nome, "arquivo": salva(img_de(ob), "solo_" + nome + ".png"), "metros": esc})
rocha = bpy.data.images.get("gd_stone02_1"); tex.append({"bioma": "rocha", "arquivo": salva(rocha, "solo_rocha.png"), "metros": 40.0})
mapas = {}
for o in bpy.data.objects:
    if o.name.startswith("MUNDO_") and "." not in o.name:
        l = o.location; mapas[o.name[6:]] = {"pos": [round(l.x, 2), round(l.z, 2), round(-l.y, 2)], "rotY": round(o.rotation_euler.z, 4)}
spots = [{"faixa": o.name.split("_")[1], "x": round(o.location.x, 1), "z": round(-o.location.y, 1), "y": round(o.location.z, 1)} for o in bpy.data.objects if o.name.startswith("SPOT_")]
cab = {"_nota": "Mundo aberto (tools/blender_mundo/exporta_mundo.py). Celula = int16 altura (cm) + 5 pesos de bioma (uint8) + regiao (0 campo, 1 cruma, 2 fortaleza, 3 pantano, 4 torre) + andavel; ordem z depois x; coordenadas do jogo.",
       "x0": round(x0, 3), "z0": round(z0, 3), "passo": PASSO, "nx": nx, "nz": nz, "bytes_celula": 9, "biomas": [b[0] for b in BIOMAS], "texturas": tex, "mapas": mapas, "spots": spots}
json.dump(cab, open(os.path.join(OUT, "mundo_grade.json"), "w", encoding="utf-8"), indent=1)
print("mundo exportado: %d x %d celulas de %.0f m, %.1f MB, andavel %.0f%%, regioes %s, spots %d" % (nx, nz, PASSO, len(buf) / 1e6, anda.mean() * 100, {r: int((regiao == r).sum()) for r in range(5)}, len(spots)))
