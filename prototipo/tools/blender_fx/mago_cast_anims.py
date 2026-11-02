"""Mago: clipe de CONJURACAO PADRAO de cada raca (CastShort do proprio PSA do L2) -> assets/personagens/mago_cast/<Nome>.glb (so esqueleto + clipe m_cast1, 48 fps).
Cada personagem usa a propria animacao de magia (ver diario: skills do L2 em cima dos clipes nativos de cada raca). Roda dentro do Blender (sem abrir janela):
  blender -b -P mago_cast_anims.py -- <Nome> <malha.psk> <anim.psa> <saida.glb> <medidas.json>
Mede onde a mao "solta" a magia (pico de velocidade da mao direita e da esquerda) e grava em medidas.json: {Nome: {dur, hit, cut, mao, ...}} (fracoes da duracao)."""
import bpy, sys, os, json, math
from mathutils import Vector
A = sys.argv[sys.argv.index('--') + 1:]
NOME, PSK, PSA, OUT, MED = A[0], A[1], A[2], A[3], A[4]
RATE = 30.0                       # os PSA do L2 gravam a 30 quadros/s; o jogo usa 48
K = 48.0 / RATE
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
bpy.ops.import_scene.psk(filepath=PSK)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in bpy.data.objects: o.select_set(False)
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
getattr(bpy.ops.psa_import, 'import')(filepath=PSA)
src = next((a for a in bpy.data.actions if a.name.lower().startswith('castshort')), None)
if src is None: raise SystemExit('sem CastShort em ' + PSA)
def fcs(act):
    if hasattr(act, 'fcurves'): return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []): out.extend(list(bag.fcurves))
    return out
n0 = int(round(src.frame_range[0])); n1 = int(round(src.frame_range[1]))
# ---- medidas (no clipe original, antes de esticar o tempo): velocidade das maos
ad = arm.animation_data or arm.animation_data_create(); ad.action = src
try: ad.action_slot = src.slots[0]
except Exception: pass
maos = {}; pelve = next((b.name for b in arm.pose.bones if 'pelvis' in b.name.lower()), None)
for b in arm.pose.bones:
    n = b.name.lower().replace(' ', '_')
    if n.endswith('r_hand') or n.endswith('l_hand'): maos[b.name] = n
pos = {k: [] for k in maos}; quad = []
for f in range(n0, n1 + 1):
    bpy.context.scene.frame_set(f)
    quad.append(arm.matrix_world @ arm.pose.bones[pelve].head if pelve else Vector())
    for k in maos: pos[k].append(arm.matrix_world @ arm.pose.bones[k].head)
total = max(1, n1 - n0)
med = {'dur': round(total / RATE, 3), 'quadros': n1 - n0 + 1, 'maos': {}}
# o "soltar" da magia = instante em que as DUAS maos estao mais esticadas para longe do quadril (miolo do clipe, 15%-85%); mais estavel que pico de velocidade
ext = [sum((pos[k][i] - quad[i]).length for k in maos) for i in range(len(quad))]
lo, hi = int(total * .15), int(total * .85)
gmax = max(ext[lo:hi + 1])
cand = [i for i in range(max(lo, 1), hi) if ext[i] >= ext[i - 1] and ext[i] > ext[i + 1] and ext[i] >= 0.8 * gmax]      # 1o pico forte: o estico da magia (depois vem a volta/segurar)
q = cand[0] if cand else max(range(lo, hi + 1), key=lambda i: ext[i])
for k, lst in pos.items(): med['maos'][maos[k]] = {'extensao_max': round(max((lst[i] - quad[i]).length for i in range(len(lst))), 3)}
med['curva'] = [round(v, 1) for v in ext]; fr = {}
for k in maos:
    fr[maos[k]] = [round(((pos[k][i] - quad[i]).dot((arm.matrix_world.to_3x3() @ Vector((0, 1, 0))))), 1) for i in range(len(quad))]
med['frente_eixoY'] = fr
med['hit'] = round(q / total, 3); med['cut'] = round(min(1.0, (q + 5) / total), 3); med['quadro_soltar'] = q
# ---- (opcional) prancha de quadros do clipe original para olhar o gesto: PREVIA=<pasta>  -> <pasta>/<Nome>_<quadro>.png (esqueleto, vista 3/4)
if os.environ.get('PREVIA'):
    import math
    pv = os.environ['PREVIA']; os.makedirs(pv, exist_ok=True); sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = sc.render.resolution_y = 300; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'SINGLE'
    sc.display.shading.single_color = (0.9, 0.9, 0.9); sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.05, 0.06, 0.09)
    arm.data.display_type = 'STICK'; arm.show_in_front = True
    bpy.context.scene.frame_set(n0); bpy.context.view_layer.update()
    altos = [(arm.matrix_world @ b.head).z for b in arm.pose.bones]; h = max(altos) - min(altos); cz = (max(altos) + min(altos)) / 2
    pel = arm.matrix_world @ arm.pose.bones[pelve].head
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.type = 'ORTHO'; cam.data.ortho_scale = h * 1.15
    alvo = bpy.data.objects.new('alvo', None); sc.collection.objects.link(alvo); alvo.location = (pel.x, pel.y, cz)
    cam.location = (pel.x + h * 1.2, pel.y - h * 1.6, cz + h * 0.1); sc.camera = cam
    tc = cam.constraints.new('TRACK_TO'); tc.target = alvo; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
    for f in range(n0, n1 + 1, 3):
        bpy.context.scene.frame_set(f); sc.render.filepath = os.path.join(pv, '%s_%02d.png' % (NOME, f - n0)); bpy.ops.render.render(write_still=True)
# ---- clipe final: tempo x1,6 (30 -> 48 fps), comecando no quadro 0
novo = src.copy(); novo.name = 'm_cast1'; novo.use_fake_user = True
for fc in fcs(novo):
    for kp in fc.keyframe_points:
        kp.co[0] = (kp.co[0] - n0) * K; kp.handle_left[0] = (kp.handle_left[0] - n0) * K; kp.handle_right[0] = (kp.handle_right[0] - n0) * K
    fc.update()
med['dur48'] = round((novo.frame_range[1] - novo.frame_range[0]) / 48.0, 3)
# ---- exporta so o esqueleto + o clipe (como guardian_anims.glb)
for o in list(bpy.data.objects):
    if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    if a is not novo: bpy.data.actions.remove(a)
ad.action = None
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
t = ad.nla_tracks.new(); t.name = 'm_cast1'; st = t.strips.new('m_cast1', int(novo.frame_range[0]), novo)
try: st.action_slot = novo.slots[0]
except Exception as e: print('slot', e)
st.name = 'm_cast1'
bpy.context.scene.render.fps = 48
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True); bpy.context.view_layer.objects.active = arm
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                          export_optimize_animation_size=True, export_yup=True, export_apply=False, export_skins=True, export_def_bones=False, export_anim_single_armature=True)
med['kb'] = os.path.getsize(OUT) // 1024; med['osso_quadril'] = next((b.name for b in arm.pose.bones if 'pelvis' in b.name.lower()), None)
dados = json.load(open(MED, encoding='utf-8')) if os.path.exists(MED) else {}
dados[NOME] = med; json.dump(dados, open(MED, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print('MEDIDAS', NOME, json.dumps(med, ensure_ascii=False))
