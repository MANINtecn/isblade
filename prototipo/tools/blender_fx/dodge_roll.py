"""Retarget da rolagem do Mixamo (assets/mixamo/roll.fbx) para o esqueleto L2 (HumanFighter_Armature): cria a acao 'Dodge_Roll' (clipe g_roll no jogo).
Serve a todo lutador (tanker ao guerreiro). Fica NO LUGAR (o jogo move o personagem); so a descida vertical do quadril e mantida.
Metodo: por osso, rotacao de mundo = (pose_origem * repouso_origem^-1) * repouso_destino (preserva a torcao);
nos membros, depois corrige a DIRECAO do osso para a do Mixamo (compensa T-pose x pose de repouso do L2).
Roda dentro do Blender: exec(open(...).read()). Importa o FBX se o 'Armature' do Mixamo ainda nao existir."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion

FBX = r'C:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\mixamo\roll.fbx'
ACAO = 'Dodge_Roll'
sc = bpy.context.scene
FPS0 = (sc.render.fps, sc.render.fps_base)        # o importador de FBX muda o fps da cena: restaurar no fim
l2 = bpy.data.objects['HumanFighter_Armature']
mx = bpy.data.objects.get('Armature')
if mx is None or mx.type != 'ARMATURE' or not mx.data.bones.get('mixamorig:Hips'):
    bpy.ops.import_scene.fbx(filepath=FBX)
    mx = next(o for o in bpy.context.selected_objects if o.type == 'ARMATURE')
mx.hide_viewport = False; mx.hide_set(False)               # escondido o Blender nao avalia a pose
src_act = mx.animation_data.action

# (osso Mixamo, osso L2, corrigir direcao?)
MAP = [('Hips', 'Bip01_Pelvis', 0), ('Spine', 'bip01_spine', 0), ('Spine1', 'Bip01_Spine1', 0), ('Spine2', 'bip01_spine2', 0), ('Neck', 'Bip01_Neck', 0), ('Head', 'Bip01_head', 0),
       ('LeftShoulder', 'Bip01_L_Clavicle', 1), ('LeftArm', 'Bip01_L_UpperArm', 1), ('LeftForeArm', 'Bip01_L_Forearm', 1), ('LeftHand', 'Bip01_L_Hand', 0),
       ('RightShoulder', 'Bip01_R_Clavicle', 1), ('RightArm', 'Bip01_R_UpperArm', 1), ('RightForeArm', 'Bip01_R_Forearm', 1), ('RightHand', 'Bip01_R_Hand', 0),
       ('LeftUpLeg', 'Bip01_L_Thigh', 1), ('LeftLeg', 'Bip01_L_Calf', 1), ('LeftFoot', 'bip01_l_foot', 1), ('LeftToeBase', 'Bip01_L_Toe0', 0),
       ('RightUpLeg', 'Bip01_R_Thigh', 1), ('RightLeg', 'Bip01_R_Calf', 1), ('RightFoot', 'bip01_r_foot', 1), ('RightToeBase', 'Bip01_R_Toe0', 0)]
MAP = [('mixamorig:' + a, b, c) for a, b, c in MAP]

def rest_world(arm, name):
    return arm.matrix_world @ arm.data.bones[name].matrix_local
l2w, l2wi = l2.matrix_world, l2.matrix_world.inverted()

# gira o mundo do Mixamo para o L2 olhar para o mesmo lado (compara o sentido pe -> dedos no repouso)
def heading(arm, foot, toe):
    d = rest_world(arm, toe).translation - rest_world(arm, foot).translation; return math.atan2(d.y, d.x)
ang = heading(l2, 'bip01_l_foot', 'Bip01_L_Toe0') - heading(mx, 'mixamorig:LeftFoot', 'mixamorig:LeftToeBase')
RZ = Matrix.Rotation(ang, 4, 'Z')
print('giro do mundo do Mixamo (graus):', round(math.degrees(ang), 1))

# escala vertical: altura do quadril em repouso
h_src = rest_world(mx, 'mixamorig:Hips').translation.z
h_tg = rest_world(l2, 'Bip01_Pelvis').translation.z
ratio = h_tg / h_src
print('quadril origem', round(h_src, 3), 'destino', round(h_tg, 3), 'razao', round(ratio, 3))

ad = l2.animation_data or l2.animation_data_create()
prev_act = ad.action if ad.action and ad.action.name != ACAO else None
for a in list(bpy.data.actions):
    if a.name == ACAO: bpy.data.actions.remove(a)
act = bpy.data.actions.new(ACAO)
ad.action = act
try: ad.action_slot = act.slots[0] if act.slots else act.slots.new('OBJECT', l2.name)
except Exception as e: print('slot', e)
for pb in l2.pose.bones: pb.rotation_mode = 'QUATERNION'
f0, f1 = int(src_act.frame_range[0]), int(src_act.frame_range[1])
mapped = {b for _, b, _ in MAP}
for pb in l2.pose.bones:                                  # osso fora do mapeamento (raiz Bip01, dedos, capa...) fica no repouso: uma acao so afeta o que tem chave
    if pb.name in mapped: continue
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    for fr in (0, f1 - f0): pb.keyframe_insert('rotation_quaternion', frame=fr); pb.keyframe_insert('location', frame=fr)

mx.animation_data.action = src_act
sc.frame_set(f0)
hip0 = (mx.matrix_world @ mx.pose.bones['mixamorig:Hips'].matrix).translation.copy()
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    T = {}                                                   # matrizes de pose do destino, no espaco do esqueleto
    for sname, tname, aim in MAP:
        sb = mx.pose.bones[sname]
        Ps = (RZ @ mx.matrix_world @ sb.matrix).to_quaternion()
        Rs = (RZ @ rest_world(mx, sname)).to_quaternion()
        Rt = rest_world(l2, tname).to_quaternion()
        Q = (Ps @ Rs.inverted()) @ Rt
        if aim:
            cur = Q @ Vector((0, 1, 0)); want = Ps @ Vector((0, 1, 0))
            Q = cur.rotation_difference(want) @ Q
        tb = l2.data.bones[tname]; par = tb.parent
        if par.name in T: Tp, Rp = T[par.name], par.matrix_local
        else: Tp, Rp = par.matrix_local, par.matrix_local          # pai nao mapeado (Bip01): fica no repouso
        base = Tp @ (Rp.inverted() @ tb.matrix_local)
        pos = base.translation.copy()
        if tname == 'Bip01_Pelvis':                                # so a descida/subida do quadril (no lugar)
            hw = (RZ @ mx.matrix_world @ mx.pose.bones['mixamorig:Hips'].matrix).translation
            pos = pos + l2wi.to_3x3() @ Vector((0, 0, (hw.z - hip0.z) * ratio))
        # Q esta no mundo; leva ao espaco do esqueleto
        Tb = Matrix.Translation(pos) @ (l2wi.to_3x3() @ Q.to_matrix()).to_4x4()
        T[tname] = Tb
        basis = base.inverted() @ Tb
        pb = l2.pose.bones[tname]
        pb.rotation_quaternion = basis.to_quaternion(); pb.location = basis.translation
        pb.keyframe_insert('rotation_quaternion', frame=f - f0);
        if tname == 'Bip01_Pelvis': pb.keyframe_insert('location', frame=f - f0)
act.use_fake_user = True
ad.action = prev_act
sc.render.fps, sc.render.fps_base = FPS0
mx.hide_viewport = True
print('acao', ACAO, 'frames', 0, f1 - f0, '=', round((f1 - f0) / sc.render.fps, 2), 's')
