"""Cria escadas (remendos) que o mapa baixado nao traz. Rodar:  blender -b <entrada.blend> --python remendo_escadas.py -- <escadas.json> <saida.blend>
escadas.json = [{"nome": "...", "de": [x,y,z], "ate": [x,y,z], "largura": 5.0, "degraus": 28}]   (coordenadas do Blender, unidades do jogo;
'de' = pe da escada (altura mais baixa), 'ate' = topo; a escada sobe em linha reta no plano de 'de' para 'ate').
Cada escada vira o objeto 'chao_escada_<nome>' (maciço, com topo plano em cada degrau) na colecao 'Remendos'; depois rode texturizar_bsp.py."""
import bpy, bmesh, sys, json, math, mathutils
a = sys.argv[sys.argv.index('--') + 1:]
LISTA, OUT = json.load(open(a[0], encoding='utf-8')), a[1]
col = bpy.data.collections.get('Remendos') or bpy.data.collections.new('Remendos')
if col.name not in [c.name for c in bpy.context.scene.collection.children]: bpy.context.scene.collection.children.link(col)
mat = bpy.data.materials.get('PISO_pedra') or bpy.data.materials.new('PISO_pedra')
for e in LISTA:
    nome = 'chao_escada_' + e['nome']
    if nome in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[nome], do_unlink=True)
    A = mathutils.Vector(e['de']); B = mathutils.Vector(e['ate'])
    d = mathutils.Vector((B.x - A.x, B.y - A.y, 0)); L = d.length; d.normalize()
    p = mathutils.Vector((-d.y, d.x, 0)); w = e['largura']; N = e['degraus']
    z0, z1 = A.z, B.z; base = z0 - 0.5; t = L / N; h = (z1 - z0) / N
    perfil = [(0, base), (0, z0 + h)]                       # (distancia ao longo, altura): serrote de degraus
    for i in range(N):
        s0 = i * t; s1 = (i + 1) * t; zt = z0 + h * (i + 1)
        if i: perfil.append((s0, zt))
        perfil.append((s1, zt))
    perfil.append((L, base))
    bm = bmesh.new(); o0 = mathutils.Vector((A.x, A.y, 0)) - p * (w / 2)      # so o plano XY: a altura entra no perfil
    vs = [bm.verts.new(o0 + d * s + mathutils.Vector((0, 0, z))) for s, z in perfil]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=p * w, verts=[g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me); col.objects.link(ob); ob['remendo'] = e['nome']
    print('escada', nome, 'comprimento %.1f' % L, 'degraus', N, 'altura do degrau %.2f' % h, 'sobe %.1f' % (z1 - z0))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('ESCADAS_OK', len(LISTA))
