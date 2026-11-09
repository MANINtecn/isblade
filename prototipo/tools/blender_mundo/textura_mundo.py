# Textura fundida do mapa-mundi (09/11/2026, dono: "ta sem textura? vai fundindo eles"): material MUNDO_SOLO no TERRA_FUNDO e no CAMPO_TI.
#   - cada ponto do terreno de fundo recebe o "bioma" do chao mais proximo: campo/cidade (sp_v_floor da cidade), Cruma, Fortaleza, Pantano, Torre
#     (a textura do proprio Terreno de cada mapa); as divisas sao borradas (~50-100 m) = um vai virando o outro, sem emenda reta;
#   - encostas (inclinacao) e montanhas altas viram rocha (gd_stone02_1) sozinhas no shader.
#   Pesos guardados nos atributos de cor PESO_A (campo, cruma, fortaleza, pantano) e PESO_B (torre) do TERRA_FUNDO.
# Rodar no Blender com o mapa_mundi.blend aberto: exec(open(r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_mundo\textura_mundo.py").read())
import bpy, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
BIOMAS = [  # (nome, objetos de chao, imagem, metros por repeticao = a MESMA escala que o proprio mapa usa no Terreno dele, medida pelos UVs)
  ("campo", ["CHAO", "CAMPO_TI"], None, 290.0),
  ("cruma", ["Terreno"], None, 70.0),
  ("fortaleza", ["Terreno.001"], None, 290.0),
  ("pantano", ["Terreno.002"], None, 352.0),
  ("torre", ["Terreno.003", "BASE_TORRE"], None, 363.0),
]
def imagem_do(obj_nome):
    o = bpy.data.objects.get(obj_nome)
    if not o: return None
    for m in o.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image: return n.image
    return None
img_campo = imagem_do("Terreno.001")      # grama da Fortaleza (o calcamento da cidade repetido no campo vira manchas)
IMGS = [img_campo, imagem_do("Terreno"), imagem_do("Terreno.001"), imagem_do("Terreno.002"), imagem_do("Terreno.003")]
ROCHA = bpy.data.images.get("gd_stone02_1") or img_campo
# ---- pesos por vertice ----
T = bpy.data.objects["TERRA_FUNDO"]; me = T.data
co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
xs, ys = np.unique(np.round(co[:, 0], 3)), np.unique(np.round(co[:, 1], 3)); nx, ny = len(xs), len(ys)
dg = bpy.context.evaluated_depsgraph_get(); arv = []
for b, (nome, objs, _, _) in enumerate(BIOMAS):
    for n in objs:
        ob = bpy.data.objects.get(n)
        if not ob: continue
        ev = ob.evaluated_get(dg); m = ev.to_mesh(); M = ob.matrix_world
        arv.append((b, BVHTree.FromPolygons([M @ v.co for v in m.vertices], [tuple(p.vertices) for p in m.polygons]))); ev.to_mesh_clear()
L = np.full(len(co), -1)
for i in range(len(co)):
    best = None
    for b, t in arv:
        h = t.ray_cast(Vector((co[i, 0], co[i, 1], 1500.0)), Vector((0, 0, -1)), 3000.0)
        if h[0] is not None and (best is None or h[0].z > best[0]): best = (h[0].z, b)
    if best: L[i] = best[1]
L = L.reshape(ny, nx)
for it in range(200):                                   # quem nao tem chao em cima herda o bioma vizinho mais proximo
    if (L >= 0).all(): break
    for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        v = np.roll(L, d[0], 0) if d[1] == 0 else np.roll(L, d[1], 1); L = np.where((L < 0) & (v >= 0), v, L)
W = np.stack([(L == b).astype(float) for b in range(len(BIOMAS))])
for it in range(14):                                    # borra as divisas (~50-100 m)
    W = (W + np.roll(W, 1, 1) + np.roll(W, -1, 1) + np.roll(W, 1, 2) + np.roll(W, -1, 2)) / 5.0
W /= np.maximum(W.sum(0), 1e-6); W = W.reshape(len(BIOMAS), -1)
for nome in ("PESO_A", "PESO_B"):
    if nome in me.color_attributes: me.color_attributes.remove(me.color_attributes[nome])
a = me.color_attributes.new("PESO_A", 'FLOAT_COLOR', 'POINT'); b = me.color_attributes.new("PESO_B", 'FLOAT_COLOR', 'POINT')
ca = np.stack([W[0], W[1], W[2], W[3]], 1).ravel(); cb = np.stack([W[4], np.zeros_like(W[4]), np.zeros_like(W[4]), np.ones_like(W[4])], 1).ravel()
a.data.foreach_set('color', ca); b.data.foreach_set('color', cb)
# ---- material ----
mt = bpy.data.materials.get("MUNDO_SOLO") or bpy.data.materials.new("MUNDO_SOLO"); mt.use_nodes = True; nt = mt.node_tree; nt.nodes.clear()
N = nt.nodes.new; L_ = nt.links.new
out = N('ShaderNodeOutputMaterial'); out.location = (1500, 0); bsdf = N('ShaderNodeBsdfPrincipled'); bsdf.location = (1250, 0); bsdf.inputs['Roughness'].default_value = .95
L_(bsdf.outputs[0], out.inputs[0])
geo = N('ShaderNodeNewGeometry'); geo.location = (-900, 0)
def ladrilho(img, tam, y):
    mp = N('ShaderNodeMapping'); mp.location = (-650, y); mp.inputs['Scale'].default_value = (1 / tam, 1 / tam, 1 / tam); L_(geo.outputs['Position'], mp.inputs['Vector'])
    tx = N('ShaderNodeTexImage'); tx.location = (-420, y); tx.image = img; tx.interpolation = 'Linear'; L_(mp.outputs[0], tx.inputs['Vector']); return tx.outputs['Color']
def attr(nome, y):
    at = N('ShaderNodeAttribute'); at.location = (-420, y); at.attribute_name = nome; at.attribute_type = 'GEOMETRY'
    sep = N('ShaderNodeSeparateColor'); sep.location = (-200, y); L_(at.outputs['Color'], sep.inputs[0]); return sep
pa, pb = attr("PESO_A", 600), attr("PESO_B", 450)
pesos = [None, pa.outputs['Green'], pa.outputs['Blue'], None, pb.outputs['Red']]      # campo e a base (sem peso); pantano vem do alfa (abaixo)
# o 4o bioma (pantano) esta no canal alfa do PESO_A: atributo 'Alpha'
atA = N('ShaderNodeAttribute'); atA.location = (-420, 750); atA.attribute_name = "PESO_A"; atA.attribute_type = 'GEOMETRY'; pesos[3] = atA.outputs['Alpha']
cor = ladrilho(IMGS[0], BIOMAS[0][3], 0)
acum = pa.outputs['Red']                                 # mistura certa: fator_i = peso_i / (soma dos pesos ate i) -> cada regiao so com a sua textura
for i in range(1, len(BIOMAS)):
    if not IMGS[i]: continue
    s = N('ShaderNodeMath'); s.operation = 'ADD'; s.location = (-100 + i * 180, 300); L_(acum, s.inputs[0]); L_(pesos[i], s.inputs[1])
    mxs = N('ShaderNodeMath'); mxs.operation = 'MAXIMUM'; mxs.location = (-100 + i * 180, 380); L_(s.outputs[0], mxs.inputs[0]); mxs.inputs[1].default_value = 1e-4
    dv = N('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.use_clamp = True; dv.location = (-100 + i * 180, 460); L_(pesos[i], dv.inputs[0]); L_(mxs.outputs[0], dv.inputs[1])
    mx = N('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.location = (-100 + i * 180, 0)
    L_(dv.outputs[0], mx.inputs['Factor']); L_(cor, mx.inputs['A']); L_(ladrilho(IMGS[i], BIOMAS[i][3], -260 * i), mx.inputs['B']); cor = mx.outputs['Result']; acum = s.outputs[0]
# rocha: inclinacao (normal) + altura
sepN = N('ShaderNodeSeparateXYZ'); sepN.location = (500, -500); L_(geo.outputs['Normal'], sepN.inputs[0])
rampa = N('ShaderNodeMapRange'); rampa.location = (700, -500); rampa.inputs['From Min'].default_value = .92; rampa.inputs['From Max'].default_value = .72; L_(sepN.outputs['Z'], rampa.inputs['Value'])
sepP = N('ShaderNodeSeparateXYZ'); sepP.location = (500, -700); L_(geo.outputs['Position'], sepP.inputs[0])
alta = N('ShaderNodeMapRange'); alta.location = (700, -700); alta.inputs['From Min'].default_value = 28.0; alta.inputs['From Max'].default_value = 55.0; L_(sepP.outputs['Z'], alta.inputs['Value'])
soma = N('ShaderNodeMath'); soma.operation = 'MAXIMUM'; soma.location = (900, -600); L_(rampa.outputs[0], soma.inputs[0]); L_(alta.outputs[0], soma.inputs[1])
mr = N('ShaderNodeMix'); mr.data_type = 'RGBA'; mr.location = (1050, 0); L_(soma.outputs[0], mr.inputs['Factor']); L_(cor, mr.inputs['A']); L_(ladrilho(ROCHA, 40.0, -1500), mr.inputs['B'])
L_(mr.outputs['Result'], bsdf.inputs['Base Color'])
for nome in ("TERRA_FUNDO", "CAMPO_TI"):
    o = bpy.data.objects.get(nome)
    if o: o.data.materials.clear(); o.data.materials.append(mt)
# o CAMPO_TI nao tem os pesos: fica com o chao do campo (sem atributo = 0 -> so a textura base + rocha)
print("MUNDO_SOLO aplicado; biomas por ponto:", {BIOMAS[b][0]: int((L == b).sum()) for b in range(len(BIOMAS))})
