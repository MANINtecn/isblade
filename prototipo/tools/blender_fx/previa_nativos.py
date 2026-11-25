"""Previas em video dos golpes nativos do L2 (lutador humano) com espada de 2 maos, para escolher a base das skills do guerreiro.
Cada video tem o nome do clipe e o numero do quadro gravados (para marcar o quadro do impacto).
Uso (Blender em segundo plano):
  blender.exe -b --python prototipo/tools/blender_fx/previa_nativos.py -- <pasta_saida> [teste | clipe1,clipe2,...]
  'teste' -> so um PNG (confere a espada na mao)."""
import bpy, sys, os, math
from mathutils import Vector, Euler

ARG = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARG[0] if ARG else os.path.join(os.path.dirname(__file__), 'previas')
MODO = ARG[1] if len(ARG) > 1 else ''
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CORPO = os.path.join(RAIZ, 'assets', 'personagens', 'human_fighter_nograde.glb')
ESPADA = os.path.join(RAIZ, 'assets', 'personagens', 'twohanded_sword.glb')
CLIPES = ['Atk01_2HS', 'Atk02_2HS', 'Atk03_2HS', 'SpAtk01_2HS', 'SpAtk03_2HS', 'SpAtk07_2HS', 'SpAtk11_2HS', 'SpAtk18_2HS', 'SpAtk19_2HS',
          'SpAtk01_1HS', 'SpAtk02_1HS', 'SpAtk03_1HS', 'SpAtk04_1HS', 'SpAtk01_Pole', 'SpAtk03_Pole', 'SpAtk01_Dual', 'SpAtk03_Dual']
ROT_ESPADA = Euler((math.radians(float(os.environ.get('RX', 0))), math.radians(float(os.environ.get('RY', 0))), math.radians(float(os.environ.get('RZ', 0)))))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=CORPO)
corpo = [o for o in bpy.data.objects if o not in antes]
arm = next(o for o in corpo if o.type == 'ARMATURE')
for o in corpo:                                     # o importador deixa a ultima animacao em NLA: limpa para controlar a acao na mao
    if o.animation_data:
        for t in list(o.animation_data.nla_tracks): o.animation_data.nla_tracks.remove(t)

antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=ESPADA)
esp = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']
raiz_esp = [o for o in bpy.data.objects if o not in antes and o.parent is None]
piv = bpy.data.objects.new('EspadaPivo', None); sc.collection.objects.link(piv)
for o in raiz_esp: o.parent = piv
c = piv.constraints.new('CHILD_OF'); c.target = arm; c.subtarget = 'Weapon_R_Bone'
c.set_inverse_pending = False
piv.rotation_euler = ROT_ESPADA

# chao quadriculado (referencia de altura e de giro; sem formas redondas)
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); chao = bpy.context.object
mat = bpy.data.materials.new('Chao'); mat.use_nodes = True; nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
chk = nt.nodes.new('ShaderNodeTexChecker'); chk.inputs['Scale'].default_value = 16
chk.inputs['Color1'].default_value = (.32, .32, .34, 1); chk.inputs['Color2'].default_value = (.18, .18, .2, 1)
nt.links.new(chk.outputs['Color'], bsdf.inputs['Base Color']); chao.data.materials.append(mat)

# altura do personagem para enquadrar
bpy.context.view_layer.update()
zs = [ (o.matrix_world @ Vector(v)).z for o in corpo if o.type == 'MESH' for v in o.bound_box ]
alt = max(zs) - min(zs) if zs else 1.8
for o in corpo:
    if o.parent is None: o.location.z -= min(zs) if zs else 0

cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = 35; cam = bpy.data.objects.new('Cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (alt * 1.35, -alt * 1.7, alt * .7)
chao.scale = (alt * .6, alt * .6, 1)
alvo = bpy.data.objects.new('Alvo', None); alvo.location = (0, 0, alt * .5); sc.collection.objects.link(alvo)
tc = cam.constraints.new('TRACK_TO'); tc.target = alvo
sol = bpy.data.lights.new('Sol', 'SUN'); sol.energy = 3.5; ls = bpy.data.objects.new('Sol', sol); ls.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(ls)
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value = (.06, .07, .09, 1)

r = sc.render
try: r.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    try: r.engine = 'BLENDER_EEVEE'
    except TypeError as e: print('motores:', e)
r.resolution_x = 640; r.resolution_y = 640; r.fps = 24                          # o importador do glTF assa a animacao a 24 qps
r.use_stamp = True; r.use_stamp_frame = True; r.use_stamp_note = True; r.stamp_font_size = 22
for k in ('use_stamp_date', 'use_stamp_time', 'use_stamp_render_time', 'use_stamp_camera', 'use_stamp_lens', 'use_stamp_scene', 'use_stamp_filename', 'use_stamp_memory', 'use_stamp_hostname', 'use_stamp_frame_range', 'use_stamp_marker', 'use_stamp_sequencer_strip'):
    if hasattr(r, k): setattr(r, k, False)
os.makedirs(OUT, exist_ok=True)

def acao(nome):
    for a in bpy.data.actions:
        if a.name == nome + '_MFighter' or a.name.startswith(nome + '_MFighter'): return a
    return None

def poe(nome):
    a = acao(nome)
    if not a: print('SEM CLIPE', nome); return None
    arm.animation_data_create(); arm.animation_data.action = a
    try:
        if hasattr(arm.animation_data, 'action_suitable_slots') and arm.animation_data.action_suitable_slots: arm.animation_data.action_slot = arm.animation_data.action_suitable_slots[0]
    except Exception as e: print('slot', e)
    f0, f1 = a.frame_range; return int(f0), int(math.ceil(f1))

if MODO.startswith('folha'):                      # folha:<clipes>  -> 8 quadros por clipe em PNG (para revisar sem video)
    r.image_settings.file_format = 'PNG'
    for nome in (MODO.split(':')[1].split(',') if ':' in MODO else CLIPES):
        fr = poe(nome)
        if not fr: continue
        f0, f1 = fr
        for k in range(8):
            f = round(f0 + (f1 - f0) * k / 7); sc.frame_set(f); r.stamp_note_text = nome
            r.filepath = os.path.join(OUT, 'folha', '%s_%02d.png' % (nome, f)); bpy.ops.render.render(write_still=True)
    sys.exit(0)

if MODO == 'teste':
    poe('Atk01_2HS'); sc.frame_set(12); r.stamp_note_text = 'teste'
    r.image_settings.file_format = 'PNG'; r.filepath = os.path.join(OUT, 'teste.png'); bpy.ops.render.render(write_still=True)
    sys.exit(0)

lista = MODO.split(',') if MODO else CLIPES
if hasattr(r.image_settings, 'media_type'): r.image_settings.media_type = 'VIDEO'      # Blender 5.x: video tem tipo proprio
r.image_settings.file_format = 'FFMPEG'
r.ffmpeg.format = 'MPEG4'; r.ffmpeg.codec = 'H264'; r.ffmpeg.constant_rate_factor = 'MEDIUM'
for nome in lista:
    fr = poe(nome)
    if not fr: continue
    f0, f1 = fr; n = f1 - f0 + 1
    sc.frame_start = f0; sc.frame_end = f1
    r.stamp_note_text = '%s  (%d quadros, %.2f s)' % (nome, n, n / 24.0)
    r.filepath = os.path.join(OUT, nome + '.mp4'); bpy.ops.render.render(animation=True)
    print('OK', nome, f0, f1)
