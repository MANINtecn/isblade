"""Exporta o escudo IS do Guardiao para o jogo: assets/personagens/shield_is.glb, ja no espaco do osso Shield_L_Bone
(o jogo prende o glb nesse osso). Materiais lisos (os de ruido procedural nao exportam).
ALTURA_M: altura final em metros do jogo (o humano do L2 tem ~52 un no Blender; escala medida: 1 m ~ 29 un). A escala e feita em torno da
empunhadura (material Shield_HandleSteel), para o escudo continuar na mao."""
import bpy
from mathutils import Matrix, Vector
ALTURA_UN = 40.95          # altura final em unidades do Blender (tamanho original do escudo, ~1,4 m; 1 m seria 29)
OUT = r'C:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\shield_is.glb'
arm = bpy.data.objects['HumanFighter_Armature']; sh = bpy.data.objects['Shield_Guardian']
pb = arm.pose.bones['Shield_L_Bone']
M = (arm.matrix_world @ pb.matrix).inverted() @ sh.matrix_world           # escudo no espaco do osso (cabeca)
conv = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # o exportador faz Z-up -> Y-up
me = sh.data.copy(); me.name = 'Shield_IS_export_mesh'
me.transform(M)
# escala em torno do centro da empunhadura
hi = [i for i, m in enumerate(sh.data.materials) if m and m.name == 'Shield_HandleSteel']
hv = [me.vertices[v].co.copy() for p in me.polygons if p.material_index in hi for v in p.vertices]
piv = sum(hv, Vector()) / len(hv) if hv else Vector()
alt = max(v.co.z for v in me.vertices) - min(v.co.z for v in me.vertices)   # (o eixo longo do escudo e z no Blender)
f = ALTURA_UN / (sh.dimensions.z)
me.transform(Matrix.Translation(piv) @ Matrix.Scale(f, 4) @ Matrix.Translation(-piv))
me.transform(conv)
def mat(n, c, met, r):
    m = bpy.data.materials.get(n) or bpy.data.materials.new(n); m.use_nodes = True
    bs = next(x for x in m.node_tree.nodes if x.type == 'BSDF_PRINCIPLED')
    for l in list(m.node_tree.links): m.node_tree.links.remove(l)
    bs.inputs['Base Color'].default_value = c; bs.inputs['Metallic'].default_value = met; bs.inputs['Roughness'].default_value = r
    out = next(x for x in m.node_tree.nodes if x.type == 'OUTPUT_MATERIAL'); m.node_tree.links.new(bs.outputs[0], out.inputs[0]); return m
E = [mat('is_steel', (0.30, 0.31, 0.35, 1), 1, .42), mat('is_trim', (0.55, 0.50, 0.44, 1), 1, .30), mat('is_logo', (0.85, 0.87, 0.92, 1), 1, .22),
     mat('is_leather', (0.30, 0.15, 0.07, 1), 0, .7), mat('is_handle', (0.40, 0.40, 0.44, 1), 1, .4)]
idx = [p.material_index for p in me.polygons]      # clear() zera os indices; guardar e restaurar
me.materials.clear()
for m in E: me.materials.append(m)
for p, i in zip(me.polygons, idx): p.material_index = i
ob = bpy.data.objects.new('Shield_IS_export', me); bpy.context.scene.collection.objects.link(ob)
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_yup=True, export_apply=False, export_animations=False, export_cameras=False, export_lights=False)
print('escala', round(f, 3), 'pivo (osso)', [round(v, 1) for v in piv])
bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
