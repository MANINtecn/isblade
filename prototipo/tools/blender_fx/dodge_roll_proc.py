"""Rolagem para a FRENTE do lutador (acao 'Dodge_Roll' -> clipe g_roll), feita por codigo no esqueleto L2 (HumanFighter_Armature).
Substitui dodge_roll.py: o roll.fbx do Mixamo e um rolamento para TRAS com salto (o quadril anda ~3 m para tras e o corpo gira ao contrario do
deslocamento do jogo), o que parecia duas piruetas.
Metodo: cada pose e descrita por DIRECOES de osso no espaco do corpo (x direita, y frente, z cima); o osso e apontado para a direcao (swing a partir do repouso).
O corpo inteiro gira theta(t) em torno do eixo lateral que passa pelo quadril; o quadril fica na altura de uma bola encolhida durante o giro. No lugar (o jogo move).
Fases (48 fps, 0..40 = 0,85 s): pronto -> mergulho/encolhe -> rola sobre as costas -> pousa nos pes agachado -> levanta.
Roda dentro do Blender: exec(open(...).read())."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion

ACAO = 'Dodge_Roll'
N = 40
l2 = bpy.data.objects['HumanFighter_Armature']
sc = bpy.context.scene
for o in bpy.context.view_layer.objects:
    if o.type == 'ARMATURE' and o.name == 'Armature': o.hide_viewport = True
B = l2.data.bones
def rw(n): return l2.matrix_world @ B[n].matrix_local            # repouso, mundo

# eixos do corpo (do repouso do L2)
UP = Vector((0, 0, 1))
RIGHT = (rw('Bip01_R_UpperArm').translation - rw('Bip01_L_UpperArm').translation); RIGHT.z = 0; RIGHT.normalize()
FWD = UP.cross(RIGHT).normalized()
print('direita', [round(x, 2) for x in RIGHT], 'frente', [round(x, 2) for x in FWD])
H_REST = rw('Bip01_Pelvis').translation.z

# ---- poses: direcoes (x lateral com sinal por lado, y frente, z cima) ----
# osso: (A pronto agachado, B encolhido em bola)
S = 1  # lado: +1 direito, -1 esquerdo (aplicado em x)
POSE = {
 'bip01_spine':      ((0, .22, .97),  (0, .70, .72)),
 'Bip01_Spine1':     ((0, .28, .96),  (0, .85, .52)),
 'bip01_spine2':     ((0, .25, .97),  (0, .92, .40)),
 'Bip01_Neck':       ((0, .25, .97),  (0, .96, .25)),
 'Bip01_head':       ((0, .22, .98),  (0, .98, .10)),
 'Bip01_{s}_Clavicle': ((.97, .10, .08), (.80, .55, -.20)),
 'Bip01_{s}_UpperArm': ((.22, .45, -.87), (.18, .62, -.76)),
 'Bip01_{s}_Forearm':  ((.08, .90, -.40), (.05, .70, .70)),
 'Bip01_{s}_Hand':     ((.08, .90, -.40), (.05, .70, .70)),
 'Bip01_{s}_Thigh':    ((.10, .45, -.89), (.12, .86, .50)),
 'Bip01_{s}_Calf':     ((0, -.30, -.95),  (0, -.80, -.60)),
 'bip01_{l}_foot':     ((0, .95, -.30),   (0, .30, -.95)),
 'Bip01_{s}_Toe0':     ((0, .92, -.40),   (0, .30, -.95)),
}
CHAIN = ['Bip01_Pelvis', 'bip01_spine', 'Bip01_Spine1', 'bip01_spine2', 'Bip01_Neck', 'Bip01_head',
         'Bip01_{s}_Clavicle', 'Bip01_{s}_UpperArm', 'Bip01_{s}_Forearm', 'Bip01_{s}_Hand',
         'Bip01_{s}_Thigh', 'Bip01_{s}_Calf', 'bip01_{l}_foot', 'Bip01_{s}_Toe0']
def expand():
    out = []
    for k in CHAIN:
        if '{' in k:
            for s, l, sx in (('R', 'r', 1), ('L', 'l', -1)): out.append((k.format(s=s, l=l), k, sx))
        else: out.append((k, k, 0))
    return out
BONES = expand()
# osso filho (para achar a direcao real do membro: nos ossos do L2 o eixo Y NAO aponta para o filho, o deslocamento e por outro eixo)
CHILD = {'bip01_spine': 'Bip01_Spine1', 'Bip01_Spine1': 'bip01_spine2', 'bip01_spine2': 'Bip01_Neck', 'Bip01_Neck': 'Bip01_head', 'Bip01_head': 'Bip01_HeadNub',
         'Bip01_{s}_Clavicle': 'Bip01_{s}_UpperArm', 'Bip01_{s}_UpperArm': 'Bip01_{s}_Forearm', 'Bip01_{s}_Forearm': 'Bip01_{s}_Hand', 'Bip01_{s}_Hand': 'Bip01_{s}_Finger1',
         'Bip01_{s}_Thigh': 'Bip01_{s}_Calf', 'Bip01_{s}_Calf': 'bip01_{l}_foot', 'bip01_{l}_foot': 'Bip01_{s}_Toe0', 'Bip01_{s}_Toe0': 'Bip01_{s}_Toe0Nub'}
def limb_dir(name, key):
    sd = name[7] if name.startswith('Bip01_') and name[6] in 'LR' and name[7] == '_' else ''
    s = 'R' if '_R_' in name or '_r_' in name else 'L'
    ch = CHILD[key].format(s=s, l=s.lower())
    return (rw(ch).translation - rw(name).translation).normalized()
def pdir(key, sx, w):                                               # direcao do corpo para o peso w (0 = A, 1 = B)
    a, b = POSE[key]; v = Vector([a[i] + (b[i] - a[i]) * w for i in range(3)]); v.normalize()
    return RIGHT * (v.x * (sx or 1)) + FWD * v.y + UP * v.z

def sm(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def seg(f, a, b): return sm((f - a) / (b - a))
# peso da pose encolhida e giro do corpo (graus, para a frente) e altura do quadril (fracao da altura em pe)
def weight(f): return seg(f, 3, 12) * (1 - seg(f, 28, 35))
def theta(f):
    if f <= 4: return 0.0
    if f <= 12: return 100 * ((f - 4) / 8) ** 1.6
    if f <= 28: return 100 + 190 * ((f - 12) / 16)
    if f <= 36: return 290 + 70 * seg(f, 28, 36)
    return 360.0
def height(f):
    kf = [(0, .93), (4, .85), (9, .56), (14, .38), (26, .38), (31, .52), (36, .76), (40, .96)]
    for (f0, h0), (f1, h1) in zip(kf, kf[1:]):
        if f0 <= f <= f1: return (h0 + (h1 - h0) * sm((f - f0) / (f1 - f0))) * H_REST
    return kf[-1][1] * H_REST

# ---- acao ----
for a in list(bpy.data.actions):
    if a.name == ACAO: bpy.data.actions.remove(a)
act = bpy.data.actions.new(ACAO)
ad = l2.animation_data or l2.animation_data_create()
prev = ad.action if ad.action and ad.action.name != ACAO else None
ad.action = act
try: ad.action_slot = act.slots[0] if act.slots else act.slots.new('OBJECT', l2.name)
except Exception as e: print('slot', e)
for pb in l2.pose.bones: pb.rotation_mode = 'QUATERNION'
mapped = {b for b, _, _ in BONES}
for pb in l2.pose.bones:                                             # o que nao e do roll fica no repouso
    if pb.name in mapped: continue
    pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    for fr in (0, N): pb.keyframe_insert('rotation_quaternion', frame=fr); pb.keyframe_insert('location', frame=fr)

pel0 = rw('Bip01_Pelvis').translation.copy()
for f in range(N + 1):
    w = weight(f); th = math.radians(theta(f))
    Rth = Matrix.Rotation(-th, 3, RIGHT)                             # girar para a frente: cabeca vai para a frente e para baixo
    T = {}
    for name, key, sx in BONES:
        tb = B[name]; par = tb.parent
        rest_rot = rw(name).to_quaternion()
        if name == 'Bip01_Pelvis':
            pitch = math.radians(12 + 30 * w)                        # o quadril tambem se inclina
            Q = (Rth @ Matrix.Rotation(-pitch, 3, RIGHT)).to_quaternion() @ rest_rot
        else:
            want = Rth @ pdir(key, sx, w)
            cur = limb_dir(name, key)
            Q = cur.rotation_difference(want) @ rest_rot
        Tp, Rp = (T[par.name], par.matrix_local) if par.name in T else (par.matrix_local, par.matrix_local)
        base = Tp @ (Rp.inverted() @ tb.matrix_local)
        pos = base.translation.copy()
        if name == 'Bip01_Pelvis': pos = Vector((pel0.x, pel0.y, height(f)))
        Tb = Matrix.Translation(pos) @ (l2.matrix_world.inverted().to_3x3() @ Q.to_matrix()).to_4x4()
        T[name] = Tb
        basis = base.inverted() @ Tb
        pb = l2.pose.bones[name]; pb.rotation_quaternion = basis.to_quaternion(); pb.location = basis.translation
        pb.keyframe_insert('rotation_quaternion', frame=f)
        if name == 'Bip01_Pelvis': pb.keyframe_insert('location', frame=f)
act.use_fake_user = True
ad.action = act
print('acao', ACAO, '0..%d' % N, '=', round(N / 48, 2), 's')
