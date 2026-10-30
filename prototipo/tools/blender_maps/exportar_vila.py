"""Le o .blend da vila e regrava village_data_threejs.json (faz backup antes). Tudo com a propriedade 'glb' vira entidade (duplicar/apagar vale).
Rodar: blender -b <vila.blend> --python exportar_vila.py -- <village_data_threejs.json>"""
import bpy, sys, json, shutil, time
OUT = sys.argv[sys.argv.index('--') + 1]
for ob in list(bpy.data.objects):
    if ob.mode == 'EDIT': bpy.context.view_layer.objects.active = ob; bpy.ops.object.mode_set(mode='OBJECT')
res = []
for o in sorted([o for o in bpy.data.objects if 'glb' in o], key=lambda o: o.name):
    y = round(o.location.z, 3)   # a altura do objeto no Blender = y do jogo (o jogo soma o relevo do terreno)
    res.append({'name': o.get('nome') or o.name, 'glb': o['glb'], 'pos': [round(o.location.x, 3), round(y, 3), round(-o.location.y, 3)],
                'rotY': round(o.rotation_euler.z, 4), 'scale': round(o.scale.x, 3)})
shutil.copy(OUT, OUT + '.antes_vila_%d' % int(time.time()))
json.dump(res, open(OUT, 'w', encoding='utf-8'), indent=1)
print('EXPORTADO', len(res), 'entidades ->', OUT)
