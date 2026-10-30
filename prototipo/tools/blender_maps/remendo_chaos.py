"""Cria lajes de chao (remendos) a partir de uma lista de poligonos, para buracos que o mapa baixado nao preenche.
Rodar:  blender -b <entrada.blend> --python remendo_chaos.py -- <remendos.json> <saida.blend>
remendos.json = [{"nome": "...", "cantos": [[x,y],...] (coordenadas do Blender, unidades do jogo), "topo": z, "espessura": 0.4, "folga": 1.04}]
Cada remendo vira o objeto 'chao_<nome>' na colecao 'Remendos' (a folga aumenta o poligono um pouco para sobrepor as lajes vizinhas).
Depois rode texturizar_bsp.py (objetos chao_* recebem a pedra)."""
import bpy, bmesh, sys, json
a = sys.argv[sys.argv.index('--') + 1:]
LISTA, OUT = json.load(open(a[0], encoding='utf-8')), a[1]
col = bpy.data.collections.get('Remendos') or bpy.data.collections.new('Remendos')
if col.name not in [c.name for c in bpy.context.scene.collection.children]: bpy.context.scene.collection.children.link(col)
mat = bpy.data.materials.get('PISO_pedra') or bpy.data.materials.new('PISO_pedra')
for r in LISTA:
    nome = 'chao_' + r['nome']
    if nome in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[nome], do_unlink=True)
    cs = r['cantos']; cx = sum(c[0] for c in cs) / len(cs); cy = sum(c[1] for c in cs) / len(cs); k = r.get('folga', 1.04)
    bm = bmesh.new()
    vs = [bm.verts.new((cx + (c[0] - cx) * k, cy + (c[1] - cy) * k, r['topo'])) for c in cs]
    f = bm.faces.new(vs)
    if f.normal.z < 0: f.normal_flip()
    ext = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    bmesh.ops.translate(bm, vec=(0, 0, -r.get('espessura', 0.4)), verts=[g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me); col.objects.link(ob); ob['remendo'] = r['nome']
    print('remendo', nome, 'topo', r['topo'], 'cantos', len(cs))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('REMENDOS_OK', len(LISTA))
