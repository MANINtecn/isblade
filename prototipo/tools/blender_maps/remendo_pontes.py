"""Cria o CHAO das passarelas que o mapa baixado nao traz: o modelo toh_fence11 so tem os dois corrimaos.
Rodar:  blender -b <entrada.blend> --python remendo_pontes.py -- <saida.blend>
Para cada objeto cuja propriedade l2_malha == 'toh_fence11': separa os corrimaos (componentes conectados), pega a linha central de cada um,
monta o poligono entre a fileira de cima e a de baixo e extruda para baixo (laje de 0.3 un). O topo da laje fica no ponto mais baixo do corrimao
(o corrimao e uma barra de ~1 un de altura apoiada no chao). Resultado na colecao 'Remendos', objeto 'chao_ponte_<ator>' com a mesma transformacao do ator."""
import bpy, bmesh, sys, mathutils, collections

OUT = sys.argv[sys.argv.index('--') + 1]
BIN = 0.3                       # largura da faixa de amostragem ao longo da ponte (un)
ESPESSURA = 0.3
mat = bpy.data.materials.get('BSP_pedra')
if not mat:
    mat = bpy.data.materials.new('BSP_pedra'); mat.use_nodes = True
    next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (.32, .30, .27, 1)
col = bpy.data.collections.get('Remendos') or bpy.data.collections.new('Remendos')
if col.name not in [c.name for c in bpy.context.scene.collection.children]: bpy.context.scene.collection.children.link(col)

def componentes(me):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    visto, comps = set(), []
    for v in bm.verts:
        if v.index in visto: continue
        pilha, comp = [v], []
        visto.add(v.index)
        while pilha:
            u = pilha.pop(); comp.append(u.co.copy())
            for e in u.link_edges:
                w = e.other_vert(u)
                if w.index not in visto: visto.add(w.index); pilha.append(w)
        comps.append(comp)
    bm.free(); return comps

def linha_central(pontos, lo, hi):
    """mediana de y por faixa de x ao longo do trecho [lo, hi]"""
    faixas = collections.defaultdict(list)
    for p in pontos: faixas[int((p.x - lo) // BIN)].append(p.y)
    ks = sorted(faixas)
    return [(lo + k * BIN + BIN / 2, sorted(faixas[k])[len(faixas[k]) // 2]) for k in ks]

feitos = 0
for ob in list(bpy.data.objects):
    if ob.type != 'MESH' or ob.get('l2_malha') != 'toh_fence11': continue
    me = ob.data
    comps = componentes(me)
    ys = [p.y for c in comps for p in c]; ym = (min(ys) + max(ys)) / 2
    # corrimao de cima = componentes com y medio abaixo do meio; de baixo = acima
    cima = [p for c in comps if sum(q.y for q in c) / len(c) < ym for p in c]
    baixo = [p for c in comps if sum(q.y for q in c) / len(c) >= ym for p in c]
    if not cima or not baixo: print('ignorado (nao achei dois corrimaos):', ob.name); continue
    zmin = min(p.z for c in comps for p in c)
    def trilha(pontos):
        lo = min(p.x for p in pontos); hi = max(p.x for p in pontos)
        return linha_central(pontos, lo, hi)
    T, B = trilha(cima), trilha(baixo)
    poly = [(x, y) for x, y in T] + [(x, y) for x, y in reversed(B)]
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, zmin)) for x, y in poly]
    try:
        f = bm.faces.new(vs)
    except ValueError:
        bm.free(); print('poligono invalido em', ob.name); continue
    if f.normal.z < 0: f.normal_flip()
    bmesh.ops.triangulate(bm, faces=[f])
    ext = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    bmesh.ops.translate(bm, vec=(0, 0, -ESPESSURA), verts=[g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    nm = bpy.data.meshes.new('chao_ponte_' + ob.name); bm.to_mesh(nm); bm.free()
    nm.materials.append(mat)
    nob = bpy.data.objects.new('chao_ponte_' + ob.name, nm)
    nob.matrix_world = ob.matrix_world.copy(); col.objects.link(nob)
    nob['remendo_de'] = ob.name
    feitos += 1
    print('ponte', ob.name, 'trilhas', len(T), len(B), 'poligono', len(poly), 'topo local z', round(zmin, 2))
print('REMENDOS: %d passarelas' % feitos)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
