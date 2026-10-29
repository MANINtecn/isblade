import bpy, math
from mathutils import Matrix, Vector, Quaternion
exec(open(r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\guard.py").read())
V = Vector
SH = bpy.data.objects['Shield_Guardian']
SH.hide_set(False); SH.hide_viewport = False
FWD = globals().get('FWD_O', 6.5)
TILT_N = globals().get('TILT_O', -0.077)
OFF = globals().get('OFF_O', V((1.6, -0.5, 0.0)))

def sample(actname, f):
    a = bpy.data.actions[actname]
    arm.animation_data.action = a
    arm.animation_data.action_slot = a.slots[0]
    bpy.context.scene.frame_set(f); upd()
    d = {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()) for pb in PB}
    arm.animation_data.action = None
    return d

def apply(d):
    for pb in PB:
        l, q, s = d[pb.name]
        pb.location = l; pb.rotation_quaternion = q; pb.scale = s
    upd()

def final():
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in PB}

XLH, XLS, ZL = SH['X_LH'], SH['X_LS'], SH['Z_L']
XRH, ZR = SH['X_RH'], SH['Z_R']
YBL, YBR = SH['yb_l'], SH['yb_r']

# comprimento mao->centro do punho (articulacoes dos dedos), medido no rig em repouso
def fist_len(side):
    h = REST_HEAD[f'Bip01_{side}_Hand']
    c = (REST_HEAD[f'Bip01_{side}_Finger1'] + REST_HEAD[f'Bip01_{side}_Finger0']) * 0.5
    return (c - h).length
FL = fist_len('L')
W_L = V((XLH + FL, YBL, ZL)); E_L = V((XLS + 3.0, YBL + 0.8, ZL))
W_R = V((XRH - FL, YBR + 0.8, ZR)); E_R = V((XRH - 7.0, YBR + 0.8, ZR))

def hand_frame(side):
    h = PB[f'Bip01_{side}_Hand'].head
    f1 = PB[f'Bip01_{side}_Finger1'].head; f0 = PB[f'Bip01_{side}_Finger0'].head
    f = ((f1 + f0) * 0.5 - h).normalized()
    t = f0 - f1; t = (t - f * t.dot(f)).normalized()
    n = f.cross(t)   # normal da palma (mao esquerda)
    return f, n

def frame_mat(f, n):
    return Matrix((f, n, f.cross(n))).transposed()

def orient_hand(side, f_des, n_des, twist=0.65):
    hand = f'Bip01_{side}_Hand'; fore = f'Bip01_{side}_Forearm'
    f, n = hand_frame(side)
    R = frame_mat(V(f_des).normalized(), V(n_des).normalized()) @ frame_mat(f, n).inverted()
    a_ = (PB[hand].head - PB[fore].head).normalized()
    dq = R.to_quaternion()
    pv = V((dq.x, dq.y, dq.z)); pj = a_ * pv.dot(a_)
    ang = 2 * math.atan2(pj.dot(a_), dq.w)
    if ang > math.pi: ang -= 2 * math.pi
    rot_about(fore, Matrix.Rotation(twist * ang, 3, a_))
    f, n = hand_frame(side)
    R = frame_mat(V(f_des).normalized(), V(n_des).normalized()) @ frame_mat(f, n).inverted()
    rot_about(hand, R)

def shield_target(chest):
    c = V((chest.x * 0.6, chest.y - FWD, chest.z - 8.0))
    R = basis(V((0, -0.995, TILT_N)), V((0, 0, 1)))
    S = R.to_4x4(); S.translation = c
    return S

def pole_to(S_, sh, w, e_local):
    return (S_ @ e_local) - (sh + w) * 0.5

# ---- calibragem: escudo "deitado" (carregado), antebraco na alca, mao na barra do meio ----
apply(sample('Wait_1HS_MFighter', 0))
_w = PB['Bip01_L_Hand'].head + OFF
ik2('Bip01_L_UpperArm', 'Bip01_L_Forearm', 'Bip01_L_Hand', _w, V((0.5, 0, -1)))
orient_hand('L', V((0, 0, -1)), V((-1, 0, 0)))
H0 = PB['Bip01_L_Hand'].matrix.copy()
_Rc = Matrix((V((0, 0, 1)), V((-1, 0, 0)), V((0, -1, 0)))).transposed()   # x_l=+Z, y_l=-X, z_l=-Y
S0 = _Rc.to_4x4(); S0.translation = H0.translation - _Rc @ W_L
C = H0.inverted() @ S0
SH.parent = arm; SH.parent_type = 'BONE'; SH.parent_bone = 'Shield_L_Bone'
SH.matrix_parent_inverse = Matrix(); SH.matrix_basis = Matrix(); upd()
Pm = SH.matrix_world.copy()
SH.matrix_parent_inverse = Pm.inverted()
SH.matrix_basis = S0
upd()

def follow_shoulder(side, before, k=0.55):
    now = PB[f'Bip01_{side}_UpperArm'].matrix.to_3x3()
    q = (now @ before.to_3x3().inverted()).to_quaternion()
    q = Quaternion().slerp(q, k)
    rot_about(f'Shoulder_{side}_Bone', q.to_matrix())

def battle_frame(f):
    apply(sample('AtkWait_1HS_MFighter', f))
    bl = PB['Bip01_L_UpperArm'].matrix.copy(); br = PB['Bip01_R_UpperArm'].matrix.copy()
    S = shield_target(head('bip01_spine2'))
    R3 = S.to_3x3()
    wl = S @ W_L
    shL = head('Bip01_L_UpperArm')
    ik2('Bip01_L_UpperArm', 'Bip01_L_Forearm', 'Bip01_L_Hand', wl, pole_to(S, shL, wl, E_L))
    orient_hand('L', R3 @ V((-1, 0, 0)), R3 @ V((0, 1, 0)))
    wr = S @ W_R
    shR = head('Bip01_R_UpperArm')
    ik2('Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand', wr, pole_to(S, shR, wr, E_R))
    follow_shoulder('L', bl); follow_shoulder('R', br)
    return final()

if MODE == 'battle':
    data = {f: battle_frame(f) for f in range(0, 23)}
    data[23] = data[0]
    write_action('Guardian_Battle_2H', data)
elif MODE == 'idle':
    data = {}
    for f in range(0, 46):
        apply(sample('Wait_1HS_MFighter', f))
        w = PB['Bip01_L_Hand'].head + OFF
        ik2('Bip01_L_UpperArm', 'Bip01_L_Forearm', 'Bip01_L_Hand', w, V((0.5, 0, -1)))
        orient_hand('L', V((0, 0, -1)), V((-1, 0, 0)))
        data[f] = final()
    data[46] = data[0]
    write_action('Guardian_Idle_Shield', data)
if MODE in ('battle', 'idle'):
    arm.animation_data.action = bpy.data.actions['Guardian_Battle_2H' if MODE == 'battle' else 'Guardian_Idle_Shield']
    arm.animation_data.action_slot = arm.animation_data.action.slots[0]
    bpy.context.scene.frame_set(0)
print('ok', MODE, 'FL', round(FL, 2))
