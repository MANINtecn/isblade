"""Gera a silhueta leve de um mapa para o horizonte da cidade (so geometria, sem textura, ~6 mil triangulos).
Rodar:  blender -b <montagem.blend> --python gerar_horizonte.py -- <saida.glb> [triangulos=6000]
Junta todas as pecas visiveis, corta o terreno abaixo do nivel do mar, simplifica e centra: (0,0) no meio da ilha e y=0 no nivel do mar."""
import bpy, bmesh, sys, mathutils

a = sys.argv[sys.argv.index('--') + 1:]
OUT = a[0]; ALVO = int(a[1]) if len(a) > 1 else 6000
dg = bpy.context.evaluated_depsgraph_get()
terr = bpy.data.objects.get('Terreno')
mar = min((terr.matrix_world @ v.co).z for v in terr.data.vertices) if terr else None
bm = bmesh.new()
for o in bpy.context.scene.objects:
    if o.type != 'MESH' or o.hide_viewport: continue
    if o.users_collection and o.users_collection[0].name == 'Arvores': continue
    me = o.evaluated_get(dg).to_mesh(); me.transform(o.matrix_world)
    b2 = bmesh.new(); b2.from_mesh(me)
    if o is terr and mar is not None:                                   # so a ilha: some a placa de mar
        b2.faces.ensure_lookup_table()
        ruim = [f for f in b2.faces if max(v.co.z for v in f.verts) < mar + 0.8]
        bmesh.ops.delete(b2, geom=ruim, context='FACES')
    bmesh.ops.triangulate(b2, faces=b2.faces[:])
    tmp = bpy.data.meshes.new('t'); b2.to_mesh(tmp); b2.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    o.evaluated_get(dg).to_mesh_clear()
if mar is None: mar = min(v.co.z for v in bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.02)
me = bpy.data.meshes.new('horizonte'); bm.to_mesh(me); bm.free()
ob = bpy.data.objects.new('horizonte', me); bpy.context.scene.collection.objects.link(ob)
n0 = len(me.polygons)
md = ob.modifiers.new('d', 'DECIMATE'); md.ratio = min(1.0, ALVO / max(1, n0)); md.use_collapse_triangulate = True
bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier='d')
xs = [v.co.x for v in ob.data.vertices]; ys = [v.co.y for v in ob.data.vertices]
cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
ob.data.transform(mathutils.Matrix.Translation((-cx, -cy, -mar)))
for p in ob.data.polygons: p.use_smooth = True
for o in list(bpy.context.scene.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update(); bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
dim = ob.dimensions
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_materials='NONE', export_yup=True, export_cameras=False, export_lights=False)
print('HORIZONTE', OUT, n0, '->', len(ob.data.polygons), 'faces; dim', [round(v, 1) for v in dim], 'mar z', round(mar, 1))
