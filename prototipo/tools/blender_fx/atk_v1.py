import bpy, math
from mathutils import Matrix, Vector, Quaternion
MODE = 'none'
exec(open(r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\twohand3.py").read())

BASE = sample('AtkWait_1HS_MFighter', 0)
apply(BASE)
FOOT = {n: head(n) for n in ('bip01_l_foot', 'bip01_r_foot')}
FOOT_R3 = {n: PB[n].matrix.to_3x3().copy() for n in FOOT}
ERR = {}

def at_frame(P, tag):
    apply(BASE)
    bl = PB['Bip01_L_UpperArm'].matrix.copy(); br = PB['Bip01_R_UpperArm'].matrix.copy()
    PB['Bip01_Pelvis'].matrix = Matrix.Translation(V(P['pel'])) @ PB['Bip01_Pelvis'].matrix
    upd()
    if abs(P.get('hip', 0)) > 0.01 or abs(P.get('torso', 0)) > 0.01:
        rot_about('Bip01_Pelvis', Matrix.Rotation(math.radians(P.get('hip', 0)), 3, 'Z'))
        for _n in ('bip01_spine', 'Bip01_Spine1', 'bip01_spine2'):
            rot_about(_n, Matrix.Rotation(math.radians(P.get('torso', 0)) / 3.0, 3, 'Z'))
    lean = math.radians(P.get('lean', 0)); yaw = math.radians(P.get('yaw', 0))
    cum = 0
    _rigid = P.get('rigid', 0) > 0.5
    _W = [('Bip01_Pelvis', 1.0, .15), ('bip01_spine', 0.0, .25), ('Bip01_Spine1', 0.0, .3), ('bip01_spine2', 0.0, .3)] if _rigid else [('Bip01_Pelvis', .35, .15), ('bip01_spine', .2, .25), ('Bip01_Spine1', .2, .3), ('bip01_spine2', .25, .3)]
    for n, fy, fl in _W:
        cum += yaw * fy
        rot_about(n, Matrix.Rotation(yaw * fy, 3, 'Z'))
        ax = Matrix.Rotation(cum, 3, 'Z') @ V((1, 0, 0))
        rot_about(n, Matrix.Rotation(lean * fl, 3, ax))
    for side, th, ca, ft, key in [(1, 'Bip01_L_Thigh', 'Bip01_L_Calf', 'bip01_l_foot', 'lf'),
                                  (-1, 'Bip01_R_Thigh', 'Bip01_R_Calf', 'bip01_r_foot', 'rf')]:
        piv = (FOOT['bip01_l_foot'] + FOOT['bip01_r_foot']) * 0.5; piv.z = 0
        Rfy = Matrix.Rotation(math.radians(P.get('fy', 0)), 3, 'Z')
        Rfo = Matrix.Rotation(math.radians(P.get('fo_l' if side == 1 else 'fo_r', P.get('fo', P.get('fy', 0)))), 3, 'Z')
        T = (piv + Rfy @ (FOOT[ft] - piv + V(P.get(key, (0, 0, 0))))) if _rigid else (piv + Rfy @ (FOOT[ft] - piv) + V(P.get(key, (0, 0, 0))))
        ik2(th, ca, ft, T, Matrix.Rotation(yaw, 3, 'Z') @ V((side * .25, -1, 0)))
        fb = PB[ft]
        n4 = (Rfo @ FOOT_R3[ft]).to_4x4(); n4.translation = fb.matrix.translation
        fb.matrix = n4; upd()
    chest = head('bip01_spine2')
    _c = V(P['c']); _c.y -= globals().get('DY_O', 0.0)
    c = Matrix.Rotation(yaw, 3, 'Z') @ _c
    ctr = V((chest.x * 0.6, chest.y, chest.z)) + c
    Rs = Matrix.Rotation(math.radians(P.get('syaw', 0)) + yaw * P.get('sf', 0), 3, 'Z') @ Matrix.Rotation(math.radians(P.get('spitch', 0)), 3, 'X') \
         @ Matrix.Rotation(math.radians(P.get('sroll', 0)), 3, 'Y')
    n = Rs @ V((0, -0.995, TILT_N)); u = Rs @ V((0, 0, 1))
    R = basis(n, u)
    S = R.to_4x4(); S.translation = ctr
    R3 = S.to_3x3()
    wl = S @ W_L; shL = head('Bip01_L_UpperArm')
    ik2('Bip01_L_UpperArm', 'Bip01_L_Forearm', 'Bip01_L_Hand', wl, pole_to(S, shL, wl, E_L))
    orient_hand('L', R3 @ V((-1, 0, 0)), R3 @ V((0, 1, 0)))
    wr = S @ W_R; shR = head('Bip01_R_UpperArm')
    ik2('Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand', wr, pole_to(S, shR, wr, E_R))
    follow_shoulder('L', bl); follow_shoulder('R', br)
    ERR[tag] = round((head('Bip01_R_Hand') - wr).length, 1)
    return final(), (SH.matrix_world.translation.copy(), (SH.matrix_world.to_3x3() @ V((0, -1, 0))).normalized())

READY = dict(pel=(0, 0, 0), yaw=0, lean=0, c=(0, -6.5, -8.0))

def P(**kw):
    d = dict(READY); d.update(kw); return d

ATKS = {
 'Atk01_ShieldRush': ({
    0: READY,
    5: P(pel=(0, 3.0, -4.5), lean=-8, c=(0, -3.5, -8.0)),
    8: P(pel=(0, -6.0, -5.0), lean=22, c=(0, -10.0, -7.0), lf=(0, -10, 3), rf=(0, 3, 0)),
    10: P(pel=(0, -9.0, -5.5), lean=24, c=(0, -10.0, -7.0), lf=(0, -4, 0), rf=(0, -12, 6)),
    12: P(pel=(0, -11.0, -5.0), lean=24, c=(0, -10.0, -7.0), lf=(0, -12, 5), rf=(0, -2, 0)),
    14: P(pel=(0, -9.0, -6.0), lean=20, c=(0, -10.0, -7.0), lf=(0, -8, 0), rf=(0, -10, 4)),
    16: P(pel=(0, -6.0, -6.5), lean=16, c=(0, -9.0, -7.5), lf=(0, -7, 0), rf=(0, -2, 0)),
    18: P(pel=(0, 2.0, -8.5), yaw=25, fy=12, lean=-12, c=(3, -4.5, -8.0), syaw=20, lf=(0, -3, 0), rf=(0, 2, 0)),
    22: P(pel=(0, -9.8, -7.5), yaw=-8, lean=26, c=(0, -11.0, -6.5), lf=(0, -8, 0)),
    27: P(pel=(0, -9.4, -7.5), yaw=-8, lean=25, c=(0, -10.8, -6.5), lf=(0, -8, 0)),
    34: P(pel=(0, -2.0, -4.0), lean=8, c=(0, -7.5, -7.5)),
    38: READY}, (18,)),
 'Atk02_ShieldSweep': ({
    0: P(sf=1, rigid=1),
    7: P(pel=(1.0, 2.5, -5.5), yaw=35, fy=35, fo=35, lean=2, c=(4, -5, -7.0), syaw=0, sf=1, rigid=1),
    11: P(pel=(0, 1.0, -3.0), yaw=-175, fy=-175, fo=-175, lean=6, c=(0, -7.5, -7.0), syaw=0, sf=1, rigid=1, lf=(0, 0, 3.5), rf=(0, 0, 3.5)),
    15: P(pel=(-1.0, -5.0, -6.0), yaw=-385, fy=-385, fo=-385, lean=12, c=(-3.5, -9.5, -6.5), syaw=-25, sf=1, rigid=1, lf=(0, -5, 0)),
    19: P(pel=(-1.0, -4.8, -6.0), yaw=-388, fy=-388, fo=-388, lean=12, c=(-3.5, -9.5, -6.5), syaw=-25, sf=1, rigid=1, lf=(0, -5, 0)),
    26: P(pel=(0, -1.5, -4.0), yaw=-372, fy=-372, fo=-372, lean=5, c=(-0.5, -7.0, -7.8), syaw=-8, sf=1, rigid=1),
    34: P(yaw=-360, fy=-360, fo=-360, sf=1, rigid=1)}, (11,)),
 'Atk03_ShieldJumpSlam': ({
    0: READY,
    5: P(pel=(0, 2.0, -7.0), lean=10, c=(0, -6.0, -8.0), lf=(0, -2, 0)),
    9: P(pel=(0, 0.5, -5.0), lean=-4, c=(0, -8.0, 1.0), spitch=-35),
    14: P(pel=(0, 0.5, -3.0), lean=-6, c=(0, -4.0, 12.0), spitch=-80),
    18: P(pel=(0, 0.5, 6.0), lean=-4, c=(0, -4.0, 12.0), spitch=-80, lf=(0, -4, 11), rf=(0, 3, 9)),
    22: P(pel=(0, 0.5, 15.0), lean=-4, c=(0, -4.0, 12.0), spitch=-80, lf=(0, -5, 22), rf=(0, 4, 20)),
    27: P(pel=(0, 0.0, 14.0), lean=2, c=(0, -11.0, 5.0), spitch=-20, lf=(0, -4, 20), rf=(0, 3, 18)),
    30: P(pel=(0, -2.0, 7.0), lean=14, c=(0, -13.0, 5.0), spitch=-35, lf=(0, -5, 9), rf=(0, 2, 7)),
    33: P(pel=(0, -3.5, -2.0), lean=22, c=(0, -11.0, -1.0), spitch=-12, lf=(0, -5, 2.5), rf=(0, 2, 2)),
    35: P(pel=(0, -5.0, -9.0), lean=30, c=(0, -9.0, -8.0), spitch=2, lf=(0, -4, 0)),
    42: P(pel=(0, -4.8, -9.0), lean=29, c=(0, -9.0, -8.0), spitch=2, lf=(0, -4, 0)),
    52: P(pel=(0, -2.0, -5.0), lean=10, c=(0, -7.5, -7.8)),
    60: READY}, (27,)),
}

ATKS = {n: ({2 * f: Pp for f, Pp in poses.items()}, tuple(2 * l for l in lin)) for n, (poses, lin) in ATKS.items()}

def _lerp(x, y, t):
    if isinstance(x, (tuple, list)):
        return tuple(_lerp(i, j, t) for i, j in zip(x, y))
    return x + (y - x) * t

RUNK = {'Atk01_ShieldRush': (8, 10, 12, 14), 'Atk02_ShieldSweep': (7, 11)}

def _ease(t, strike, run=False):
    if run: return t
    if strike:
        # antecipacao: recua um pouco antes de disparar, depois acelera forte ate o impacto
        return t ** 2.4 - 0.10 * math.sin(math.pi * min(t * 2.2, 1.0)) * (1 - t) ** 1.5
    return t * t * t * (t * (t * 6 - 15) + 10)

def interp_pose(Pa, Pb, t):
    out = {}
    for k in set(Pa) | set(Pb):
        dflt = (0, 0, 0) if k in ('pel', 'c', 'lf', 'rf') else 0
        out[k] = _lerp(Pa.get(k, dflt), Pb.get(k, dflt), t)
    return out

def add_overshoot(poses, lin, amount=0.22, settle=8):
    ks = sorted(poses); out = dict(poses)
    for k0 in lin:
        if k0 not in poses: continue
        i = ks.index(k0)
        if i + 1 >= len(ks): continue
        k1 = ks[i + 1]
        Pb = poses[k1]
        out[k1] = interp_pose(poses[k0], Pb, 1.0 + amount)           # passa do ponto no impacto
        if i + 2 < len(ks) and ks[i + 2] - k1 > settle + 2:
            out[k1 + settle] = Pb                                      # e assenta de volta
    return out

LEAD = {'pel': 3, 'yaw': 3, 'fy': 3, 'lean': 3, 'lf': 2, 'rf': 2}
LEAD_BASE = dict(LEAD)
LEAD_OVR = {'Atk02_ShieldSweep': {'yaw': 0, 'fy': 0, 'pel': 1, 'lean': 1, 'lf': 0, 'rf': 0}}    # o corpo conduz, escudo e bracos chegam depois

def dense(poses, lin, run=()):
    poses = add_overshoot(poses, lin)
    ks = sorted(poses); res = {}
    for i in range(len(ks) - 1):
        k0, k1 = ks[i], ks[i + 1]
        for f in range(k0, k1):
            t = (f - k0) / float(k1 - k0)
            res[f] = poses[k0] if f == k0 else interp_pose(poses[k0], poses[k1], _ease(t, k0 in lin, k0 in run))
    res[ks[-1]] = poses[ks[-1]]
    last = ks[-1]; out = {}
    for f in res:
        P_ = dict(res[f])
        for key, ld in LEAD.items():
            if key in res[min(f + ld, last)]: P_[key] = res[min(f + ld, last)][key]
        # vida: respiracao e pequena troca de peso (nao e igual de um frame para o outro)
        fade = min(1.0, f / 6.0, (last - f) / 6.0) if last > 12 else 0.0
        pz = P_.get('pel', (0, 0, 0))
        P_['pel'] = (pz[0] + 0.35 * math.sin(f * 0.11 + 0.7) * fade, pz[1] + 0.25 * math.sin(f * 0.07 + 2.1) * fade, pz[2] + 0.30 * math.sin(f * 0.19) * fade)
        P_['lean'] = P_.get('lean', 0) + 0.9 * math.sin(f * 0.13 + 1.3) * fade
        P_['yaw'] = P_.get('yaw', 0) + 1.2 * math.sin(f * 0.09 + 0.4) * fade
        out[f] = P_
    return out

SPOS = globals().setdefault('SPOS', {})
for name, (poses, lin) in ATKS.items():
    a_ = bpy.data.actions.get(name)
    if a_: bpy.data.actions.remove(a_)
    data = {}
    LEAD.clear(); LEAD.update(LEAD_BASE); LEAD.update(LEAD_OVR.get(name, {}))
    for f, Pp in dense(poses, lin, tuple(2 * k for k in RUNK.get(name, ()))).items():
        data[f], SPOS[(name, f)] = at_frame(Pp, (name, f))
    write_action(name, data, linear=())
print({k: v for k, v in ERR.items() if v > 0.8})
arm.animation_data.action = bpy.data.actions['Atk01_ShieldRush']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.context.scene.frame_set(0)
