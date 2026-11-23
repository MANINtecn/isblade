"""Monta a Dion inteira no Blender (chao + casas/arvores/muros + brushes do castelo + personagem de referencia 1,7 m) e renderiza vistas de conferencia.
Uso: blender.exe -b -P montar_cena.py -- <saida.blend> <pasta_renders> [x,z,y,alvo_x,alvo_z,alvo_y ...]   (coordenadas do jogo: x leste, z sul, y cima; 1 unidade = 1 m)"""
import bpy, sys, os, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
saida, pasta = args[0], args[1]; vistas = [tuple(float(v) for v in a.split(',')) for a in args[2:]]      # (x, z, olho_acima_do_chao, alvo_x, alvo_z, alvo_acima_do_chao) em m do jogo
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
def importa(rel, nome):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, rel))
    novos = [o for o in bpy.data.objects if o not in antes]
    col = bpy.data.collections.new(nome); bpy.context.scene.collection.children.link(col)
    for o in novos:
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o)
    return novos
mapa = importa('assets/maps/dion/dion.glb', 'DION_MAPA')
print('objetos do mapa:', len(mapa), 'materiais:', len(bpy.data.materials))
try:
    ref = importa('assets/personagens/human_fighter.glb', 'REFERENCIA_PERSONAGEM')
    bpy.context.view_layer.update()
    raiz = [o for o in ref if o.parent is None]
    zs = []
    for o in ref:
        if o.type == 'MESH':
            for c in o.bound_box: zs.append((o.matrix_world @ Vector(c)).z)
    altura = (max(zs) - min(zs)) if zs else 1.0
    esc = 2.25 / altura                                   # o humano do jogo tem 2,25 m
    for o in raiz: o.scale = (esc, esc, esc); o.location = (72, 42, -45.4)        # praca (spawn) em coordenadas do Blender (x, -z, y)
    print('personagem de referencia: altura original %.2f -> 2,25 m (escala %.4f)' % (altura, esc))
except Exception as e: print('sem personagem', e)
if os.environ.get('MOTOR') == 'EEVEE':
    try: bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    except TypeError as e: print('eevee indisponivel', e); bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
    sol = bpy.data.lights.new('SOL', 'SUN'); sol.energy = 4.0; so = bpy.data.objects.new('SOL', sol); bpy.context.scene.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(35))
    for m in bpy.data.materials:
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    try: n.inputs['Roughness'].default_value = 1.0; n.inputs['Specular IOR Level'].default_value = 0.0
                    except Exception: pass
else:
    bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'
sh = bpy.context.scene.display.shading; sh.light = 'FLAT'; sh.color_type = 'TEXTURE'; sh.show_backface_culling = False
bpy.context.scene.render.resolution_x = int(os.environ.get('RES_X', 1100)); bpy.context.scene.render.resolution_y = int(os.environ.get('RES_Y', 620))
bpy.context.scene.world = bpy.data.worlds.new('w'); bpy.context.scene.world.color = (0.62, 0.78, 0.95)
if os.environ.get('MOTOR') == 'EEVEE':
    bpy.context.scene.world.use_nodes = True; _bg = bpy.context.scene.world.node_tree.nodes.get('Background'); _bg.inputs['Color'].default_value = (0.55, 0.75, 1.0, 1); _bg.inputs['Strength'].default_value = 1.1
cam = bpy.data.objects.new('CAM', bpy.data.cameras.new('CAM')); bpy.context.scene.collection.objects.link(cam); bpy.context.scene.camera = cam
cam.data.lens = 28; cam.data.clip_end = 2000
os.makedirs(pasta, exist_ok=True)
chao_obj = [o for o in mapa if o.name.upper().startswith('DION_CHAO')]
dg = bpy.context.evaluated_depsgraph_get()
def chao_y(x, z):
    for o in chao_obj:
        mw = o.matrix_world; inv = mw.inverted()
        orig = inv @ Vector((x, -z, 200)); dire = (inv.to_3x3() @ Vector((0, 0, -1))).normalized()
        ok, loc, nor, idx = o.ray_cast(orig, dire)
        if ok: return (mw @ loc).z
    return None
for k, v in enumerate(vistas):
    x, z, ey, tx, tz, ty = v
    g0 = chao_y(x, z); g1 = chao_y(tx, tz)
    if g0 is None: g0 = -22.0
    if g1 is None: g1 = g0
    cam.location = (x, -z, g0 + ey); d = Vector((tx, -tz, g1 + ty)) - Vector(cam.location)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = os.path.join(pasta, 'v%02d.png' % k)
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=saida)
print('ok', saida)
