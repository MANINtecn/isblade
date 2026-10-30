"""Monta a vila (Talking Island) no Blender para organizar as casas: cada entidade de village_data_threejs.json vira um objeto arrastavel.
Rodar: blender -b --python montar_vila.py -- <village_data_threejs.json> <pasta_assembled_glb> <saida.blend>
Convencao: three (x,y,z) -> Blender (x,-z,y); rotY do three = rotacao Z do Blender. Cada objeto guarda custom props (glb, nome, y0, z0) para exportar de volta.
Pode duplicar (Shift+D) e apagar; exportar_vila.py le tudo que tiver a propriedade 'glb'."""
import bpy, sys, json, os, math
JSON, GLBDIR, OUT = sys.argv[sys.argv.index('--') + 1:][:3]
ents = json.load(open(JSON, encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def col(nome, parent=None):
    c = bpy.data.collections.new(nome); (parent or sc.collection).children.link(c); return c
cCasas, cArv, cRef, cTpl = col('Casas_e_muros'), col('Arvores'), col('Referencias'), col('_modelos')
# 1 modelo por glb: importa, junta as malhas em 1 objeto
tpl = {}
for g in sorted(set(e['glb'] for e in ents)):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(GLBDIR, g))
    novos = [o for o in bpy.data.objects if o not in before]
    malhas = [o for o in novos if o.type == 'MESH']
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in malhas: o.select_set(True)
    if not malhas: print('sem malha', g); continue
    bpy.context.view_layer.objects.active = malhas[0]
    for o in malhas:                                   # tira o pai mantendo a posicao
        m = o.matrix_world.copy(); o.parent = None; o.matrix_world = m
    if len(malhas) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in novos:
        if o != ob and o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
    for c in list(ob.users_collection): c.objects.unlink(ob)
    cTpl.objects.link(ob); tpl[g] = ob.data; ob.hide_set(True); ob.hide_render = True
    print('modelo', g, len(ob.data.polygons), 'faces')
cTpl.hide_viewport = True
for i, e in enumerate(ents):
    me = tpl.get(e['glb'])
    if me is None: continue
    o = bpy.data.objects.new('V%03d_%s' % (i, e.get('name', e['glb'])), me)
    x, y, z = e['pos']
    o.location = (x, -z, y); o.rotation_euler = (0, 0, e.get('rotY', 0) or 0)
    s = e.get('scale', 1.0) or 1.0; o.scale = (s, s, s)
    o['glb'] = e['glb']; o['nome'] = e.get('name', ''); o['y0'] = y
    (cArv if 'tree' in e['glb'] else cCasas).objects.link(o)
# referencias: chao, praca (raio 21), portal, spawn
bpy.ops.mesh.primitive_plane_add(size=900, location=(0, 0, -0.3)); ch = bpy.context.active_object; ch.name = 'REF_chao'
m = bpy.data.materials.new('chao'); m.diffuse_color = (.18, .28, .14, 1); ch.data.materials.append(m)
for c in list(ch.users_collection): c.objects.unlink(ch)
cRef.objects.link(ch); ch.hide_select = True
def ref(nome, loc, tam, cor, forma='CIRCLE'):
    if forma == 'CIRCLE': bpy.ops.mesh.primitive_circle_add(radius=tam, vertices=48, fill_type='NGON', location=loc)
    else: bpy.ops.mesh.primitive_cylinder_add(radius=tam, depth=8, location=loc)
    o = bpy.context.active_object; o.name = nome
    mm = bpy.data.materials.new(nome); mm.diffuse_color = cor; o.data.materials.append(mm)
    for c in list(o.users_collection): c.objects.unlink(c.objects[o.name]) if False else c.objects.unlink(o)
    cRef.objects.link(o); o.hide_select = True; return o
ref('REF_praca_raio21', (0, 0, 0.05), 21, (.75, .7, .45, 1))
ref('REF_portal_dg (-13.5,-13)', (-13.5, 13.0, 4), 1.6, (0, .8, 1, 1), 'CYL')
ref('REF_spawn (0,0)', (0, 0, 4), .8, (1, .3, .3, 1), 'CYL')
for a in bpy.context.screen.areas if bpy.context.screen else []: pass
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('SALVO', OUT, len([o for o in bpy.data.objects if 'glb' in o]), 'objetos')
