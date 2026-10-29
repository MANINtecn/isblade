"""Guardiao: sacar e guardar o escudo (48 fps) + poses de descanso com o escudo nas costas.
Parte da pose de descanso do Lineage 2 (idle_hand), a mao esquerda pega o escudo nas costas, ele voa por cima do ombro ate a mao
e o personagem assume a guarda. Guardar e o mesmo movimento ao contrario.
O escudo e animado direto no osso Shield_L_Bone (shield_rig.py), sem constraints nem drivers."""
import bpy, math, random, bmesh
from mathutils import Matrix, Vector, Quaternion
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_s6 = open(_dir + "skill6_anim.py").read()
exec(_s6.split("poses = {0:")[0])                     # atk.py, shield_rig, guarda larga (stance), Q, at_frame6
sc = bpy.context.scene
N = 52; T_REACH0, T_REACH1, T_GRAB, T_LAND = 6, 16, 19, 32

def snapshot(): return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in PB}
def blend(a, b, t):
    return {n: (a[n][0].lerp(b[n][0], t), a[n][1].slerp(b[n][1], t)) for n in a}
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def sel_action(name):
    a = bpy.data.actions[name]; arm.animation_data.action = a
    try: arm.animation_data.action_slot = a.slots[0]
    except Exception: pass
    return a

# pose de descanso do Lineage 2
sel_action('idle_hand')
sc.frame_set(1); upd()
IDLE = snapshot()
arm.animation_data.action = None; reset()

# escudo nas costas do lado da mao esquerda (+X), mais alto: a mao sobe por tras da cabeca para pegar a alca
set_pose(IDLE)
mount = bpy.data.objects['S_BackMount']; _pbn = arm.pose.bones['bip01_spine2']; _sp = arm.matrix_world @ _pbn.head
_M = Matrix.Translation(_sp + Vector((3.6, 7.2, -1.5))) @ Quaternion((0, 0, 1), math.pi).to_matrix().to_4x4() @ Matrix.Rotation(math.radians(-30), 4, 'Y')
mount.matrix_parent_inverse = (arm.matrix_world @ _pbn.matrix).inverted(); mount.matrix_basis = _M
reset()

# poses de combate (IK do escudo): alcance atras das costas e guarda
PZ = -8.5
GUARD, sp_g = at_frame6(Q(pel=(0, 0, PZ), lean=12), ('D', 'guard'))
REACH_P = globals().get('REACH_P') or dict(pel=(0, 1.0, PZ + 4), lean=-2, c=(3.4, 9.2, -1.5), syaw=180, sroll=-30, freeR=1.0, torso=TORSO0 + 6, shk=0.0)   # shk=0: o ombro nao sobe junto
REACH, sp_r = at_frame6(Q(**REACH_P), ('D', 'reach'))
print('erro mao alcance', ERR[('D', 'reach')], 'guarda', ERR[('D', 'guard')])
reset()

YC = calib_Y()
def mount_world(pose):
    set_pose(pose); return mount.matrix_world.copy()
def hand_world(pose):
    set_pose(pose); return SH.matrix_world.copy()
M_back = mount_world(REACH); M_hand = hand_world(GUARD); reset()

def bez(p0, p1, p2, p3, t):
    u = 1 - t; return p0 * (u ** 3) + p1 * (3 * u * u * t) + p2 * (3 * u * t * t) + p3 * (t ** 3)
Pb, Ph = M_back.translation.copy(), M_hand.translation.copy(); qb, qh = M_back.to_quaternion(), M_hand.to_quaternion()
def flight(f):                                                      # f no tempo do sacar
    s = (f - T_GRAB) / float(T_LAND - T_GRAB); t = 1 - (1 - s) ** 1.7                 # desacelera ao chegar na mao
    pos = bez(Pb, Pb + Vector((-3, -4, 20)), Ph + Vector((4, 6, 12)), Ph, t)
    ps = min(1.0, s / 0.7)                                                              # o giro acaba antes: nos ultimos frames o escudo desce em pe ate a mao
    q = qb.slerp(qh, smooth(min(1.0, s / 0.8))) @ Quaternion(Vector((0, 1, 0)), math.tau * 2 * smooth(ps))
    return Matrix.Translation(pos) @ q.to_matrix().to_4x4()

def bone_frame(f):                                                  # pose do osso no frame f do sacar
    if f <= T_REACH0: return IDLE
    if f <= T_REACH1: return blend(IDLE, REACH, smooth((f - T_REACH0) / float(T_REACH1 - T_REACH0)))
    if f <= T_GRAB: return REACH
    if f <= T_LAND: return blend(REACH, GUARD, 1 - (1 - smooth((f - T_GRAB) / float(T_LAND - T_GRAB))) ** 2)
    return GUARD
def W_draw(f):                                                      # onde o escudo esta no frame f do sacar (None = na mao)
    if f < T_GRAB: return mount_world(bone_frame(f))
    if f < T_LAND: return flight(f)
    return None

def make(name, data):
    old = bpy.data.actions.get(name)
    if old: bpy.data.actions.remove(old)
    write_action(name, data, linear=())
    bpy.data.actions[name].use_fake_user = True
make('Rest_DrawShield', shield_frames({f: bone_frame(f) for f in range(0, N + 1)}, W_draw, YC))
make('Rest_SheatheShield', shield_frames({i: bone_frame(N - i) for i in range(0, N + 1)}, lambda i: W_draw(N - i), YC))

# versoes das poses de descanso do Lineage 2 com o escudo nas costas (as originais ficam como estao)
def bake_rest(src, dst):
    a = sel_action(src); f0, f1 = int(a.frame_range[0]), int(a.frame_range[1]); reset()
    data, Ws = {}, {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f); upd(); data[f] = snapshot(); Ws[f] = mount.matrix_world.copy()
    arm.animation_data.action = None; reset()
    make(dst, shield_frames(data, lambda f: Ws[f], YC))
    return f0, f1
for src, dst in (('idle_hand', 'Rest_Idle_ShieldBack'), ('walk_hand', 'Rest_Walk_ShieldBack'), ('run_hand', 'Rest_Run_ShieldBack')):
    print(dst, bake_rest(src, dst))
sel_action('Skill6_ShieldThrow')
print('sacar ok', N, 'frames')
