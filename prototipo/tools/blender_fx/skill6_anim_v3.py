"""Skill 6 - Arremesso do escudo: animacao do personagem + voo do escudo (48 fps).
Solta no frame 46, crava no chao no 56, fica enterrado ate o 100, sai girando e volta para a mao no 142."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion
DY_O = 2.0
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_src = open(_dir + "atk.py").read()
exec(_src.split("ATKS = {")[0])
exec(_src[_src.index("def _lerp"):_src.index("SPOS = globals()")])
add_overshoot = lambda poses, lin, **k: poses

# guarda de combate (referencia do usuario): pes paralelos e bem abertos, pontas para fora, joelhos fundos e para fora, quadril baixo
_fl, _fr = FOOT['bip01_l_foot'], FOOT['bip01_r_foot']
_cx, _cy = (_fl.x + _fr.x) / 2, (_fl.y + _fr.y) / 2
SPREAD = 10.5
def stance(z_l=0.0, z_r=0.0, spread=SPREAD):
    return dict(lf=(_cx + spread - _fl.x, _cy - _fl.y, z_l), rf=(_cx - spread - _fr.x, _cy - _fr.y, z_r), fo_l=60.0, fo_r=31.0, ko=0.55)
STN = stance()
apply(BASE)
_lt = head('Bip01_L_Thigh') - head('Bip01_R_Thigh'); HIP0 = -math.degrees(math.atan2(_lt.y, _lt.x))      # gira o quadril para ficar de frente
_ls = head('Bip01_L_UpperArm') - head('Bip01_R_UpperArm'); TORSO0 = -(math.degrees(math.atan2(_ls.y, _ls.x)) + HIP0)  # e os ombros tambem
print('quadril', round(HIP0, 1), 'torso', round(TORSO0, 1))
W_ = dict(STN, freeR=0.0, rfist=(2.0, -9.0, -5.0), hip=HIP0, torso=TORSO0)
def Q(**kw):
    d = dict(W_); d.update(kw); return P(**d)

_at = at_frame
def at_frame6(Pp, tag):                                           # braco direito livre em guarda; so o esquerdo leva o escudo
    d, sp = _at(Pp, tag)
    fr = Pp.get('freeR', 0.0)
    if fr > 0.001:
        wr = head('Bip01_R_Hand'); sh = head('Bip01_R_UpperArm')
        tgt = wr * (1 - fr) + (sh + V(Pp['rfist'])) * fr
        ik2('Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand', tgt, V((-1.0, 0.6, -0.3)))
    le = Pp.get('lelb', 0.0)
    if le > 0.001:                                                          # antebraco esquerdo na vertical: cotovelo vai para baixo, punho para cima
        shl, elb, wl = head('Bip01_L_UpperArm'), head('Bip01_L_Forearm'), head('Bip01_L_Hand')
        cur = (elb - (shl + wl) * 0.5)
        cur = cur.normalized() if cur.length > 1e-4 else V((0, 0, -1))
        pole = (cur * (1 - le) + V((0.35, -0.25, -1.0)).normalized() * le)
        ik2('Bip01_L_UpperArm', 'Bip01_L_Forearm', 'Bip01_L_Hand', wl, pole)
    _f = PB['Bip01_head'].matrix.to_3x3() @ V((0, 1, 0))                   # cabeca sempre olhando para a frente
    _err = math.radians(-90.0) - math.atan2(_f.y, _f.x); _err = (_err + math.pi) % (2 * math.pi) - math.pi
    rot_about('Bip01_head', Matrix.Rotation(_err, 3, 'Z'))
    return final(), sp
V = Vector

RLS, IMPACT, EXIT, CATCH, SP0 = 50, 64, 108, 150, 30
PZ = -8.5                                                          # altura do quadril na guarda (joelhos dobrados)
G_ = dict(freeR=1.0)
HOP = dict(stance(9, 8), freeR=1.0)
TW = lambda x: TORSO0 + x                                           # torcao dos ombros: + leva o ombro esquerdo para tras
poses = {0: Q(pel=(0, 0, PZ), lean=12), 8: Q(pel=(0, 0, PZ), lean=12)}
poses[16] = Q(pel=(0, 0.5, PZ - 1), lean=14, c=(8, -3, -5), syaw=30, torso=TW(8), freeR=0.6)
poses[24] = Q(pel=(0, 1.0, PZ - 2), lean=14, c=(15, 2, -4), syaw=70, torso=TW(22), **G_)
poses[44] = Q(pel=(0, 1.0, PZ - 3), lean=12, c=(16, 4, -3), syaw=75, torso=TW(26), **G_)
poses[47] = Q(pel=(0, -1.0, PZ + 8), lean=12, c=(15, -6, 1), syaw=72, spitch=0, torso=TW(4), **HOP)
poses[RLS] = Q(pel=(0, -2.5, PZ + 9), lean=22, c=(13, -13, 0), syaw=72, spitch=0, torso=TW(-12), **dict(HOP, lf=stance(8, 7)['lf'], rf=stance(8, 7)['rf']))
ARM = dict(c=(13, -9, 4), syaw=90, spitch=0, lelb=1.0)             # antebraco esquerdo na vertical, esperando o escudo
UP = dict(freeR=1.0, torso=TORSO0)
poses[53] = Q(pel=(0, -0.5, PZ), lean=3, **dict(ARM, **UP))
poses[56] = Q(pel=(0, -0.5, PZ), lean=3, **dict(ARM, **UP))
poses[104] = Q(pel=(0, -0.5, PZ), lean=3, **dict(ARM, **UP))
poses[120] = Q(pel=(0, -0.5, PZ + 0.5), lean=2, **dict(ARM, c=(13, -9, 5), **UP))
poses[142] = Q(pel=(0, -0.5, PZ + 0.5), lean=2, **dict(ARM, c=(13, -9, 5), **UP))
poses[CATCH] = Q(pel=(0, -0.5, PZ - 1.5), lean=6, **dict(ARM, **UP))
poses[160] = Q(pel=(0, -0.5, PZ - 0.5), lean=4, **dict(ARM, **UP))
poses[172] = Q(pel=(0, 0, PZ), lean=12)
poses[184] = Q(pel=(0, 0, PZ), lean=12)
poses[228] = Q(pel=(0, 0, PZ), lean=12)

_old = bpy.data.actions.get('Skill6_ShieldThrow')
if _old: bpy.data.actions.remove(_old)
SPOS6 = {}; _data = {}
for f, Pp in dense(poses, (44,), ()).items():
    _data[f], SPOS6[f] = at_frame6(Pp, ('S6', f))
write_action('Skill6_ShieldThrow', _data, linear=())
arm.animation_data.action = bpy.data.actions['Skill6_ShieldThrow']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.data.actions['Skill6_ShieldThrow'].use_fake_user = True
sc = bpy.context.scene
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 228; sc.render.fps = 48

# ---------- voo do escudo: empty no mundo + Copy Transforms com influencia animada ----------
for c_ in list(SH.constraints):
    if c_.name == 'S6_Fly': SH.constraints.remove(c_)
if SH.animation_data and SH.animation_data.action:
    _a = SH.animation_data.action; SH.animation_data.action = None; bpy.data.actions.remove(_a)
_e = bpy.data.objects.get('S6_ShieldRig')
if _e: bpy.data.objects.remove(_e, do_unlink=True)

sc.frame_set(0); bpy.context.view_layer.update()
CTR = V(((PB['bip01_l_foot'].head.x + PB['bip01_r_foot'].head.x) / 2, (PB['bip01_l_foot'].head.y + PB['bip01_r_foot'].head.y) / 2, 0))
HM = {}
for f in range(SP0, CATCH + 1):
    sc.frame_set(f); bpy.context.view_layer.update()
    HM[f] = SH.matrix_world.copy()
sc.frame_set(0)

HALF = 12.87                                                      # meia altura do escudo (ponta no -Z local)
BURY = 1.5 - HALF                                                 # centro do escudo enterrado: so a borda de cima fica para fora
GI6 = V((CTR.x, CTR.y - 140.0, 0.0))               # onde crava: ~5,7 m a frente
qB = Quaternion(V((0, 1, 0)), math.pi)                            # ponta para baixo, face para a frente
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def spin(psi): return Quaternion(V((0, 1, 0)), psi)               # giro em volta da face do escudo
def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return p0 * (u ** 3) + p1 * (3 * u * u * t) + p2 * (3 * u * t * t) + p3 * (t ** 3)

QF = HM[44].to_quaternion()                                         # orientacao do escudo girando ao lado: o eixo (face) nao muda mais, so gira
_n = QF @ V((0, 1, 0)); _t0 = QF @ V((0, 0, -1)); _dn = V((0, 0, -1))
_t0p = _t0 - _n * _t0.dot(_n); _dp = _dn - _n * _dn.dot(_n)
PSI_A = math.atan2(_n.dot(_t0p.cross(_dp)), _t0p.dot(_dp)) % math.tau   # giro extra para a ponta ficar para baixo ao chegar
PSI_IMP = math.tau * 8 + math.tau * 5 + PSI_A
qC = HM[CATCH].to_quaternion(); H = HM[CATCH].translation.copy()
P0 = HM[RLS].translation.copy(); PI = GI6 + V((0, 0, HALF + 0.8)); PB_ = GI6 + V((0, 0, BURY))
FLY = {}
rig = bpy.data.objects.new('S6_ShieldRig', None); rig.empty_display_type = 'ARROWS'; rig.empty_display_size = 6
sc.collection.objects.link(rig); rig.rotation_mode = 'QUATERNION'
rng6 = __import__('random').Random(66)
for f in range(SP0, CATCH + 1):
    if f < RLS:                                                    # gira no lado, acelerando
        u = (f - SP0) / float(RLS - SP0)
        pos = HM[f].translation.copy(); q = QF @ spin(math.tau * 8 * u ** 1.7)
    elif f <= IMPACT:                                                # arremesso: gira rapido, cai de ponta
        u = (f - RLS) / float(IMPACT - RLS); t = u ** 1.15
        pos = bez(P0, P0 + V((-6, -30, 12)), PI + V((0, 26, 14)), PI, t)
        q = QF @ spin(math.tau * 8 + (PSI_IMP - math.tau * 8) * t)             # sai girando como serra: a borda corta o ar
    elif f < EXIT:
        k = (f - IMPACT) / 6.0
        sink = 1 - (1 - min(k, 1.0)) ** 2.6                        # afunda rapido
        pos = PI.lerp(PB_, sink); q = QF @ spin(PSI_IMP + math.tau * sink)       # continua girando e entra cortando o chao
        if k >= 1.0:                                               # enterrado, tremendo mais e mais perto da saida
            amp = 0.15 + 1.1 * smooth((f - 78) / 28.0)
            pos = pos + V((rng6.uniform(-1, 1) * amp, rng6.uniform(-1, 1) * amp, rng6.uniform(-0.3, 0.8) * amp))
    else:                                                          # sai do chao e volta girando para a mao
        s = (f - EXIT) / float(CATCH - EXIT); t = 1 - (1 - s) ** 1.5
        p1 = PB_ + V((0, 6, 55)); p2 = H + V((0, -22, 26))
        pos = bez(PB_, p1, p2, H, t)
        q = (QF @ spin(PSI_IMP + math.tau)).slerp(qC, smooth(s)) @ spin(math.tau * 8 * t)
    FLY[f] = (pos.copy(), q.copy())
    rig.location = pos; rig.rotation_quaternion = q
    rig.keyframe_insert('location', frame=f); rig.keyframe_insert('rotation_quaternion', frame=f)
for fc in rig.animation_data.action.layers[0].strips[0].channelbags[0].fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
rig.animation_data.action.name = 'zFX_S6_ShieldRig'

cn = SH.constraints.new('COPY_TRANSFORMS'); cn.name = 'S6_Fly'; cn.target = rig
for f, v in ((SP0 - 1, 0.0), (SP0, 1.0), (CATCH - 1, 1.0), (CATCH, 0.0)):
    cn.influence = v; cn.keyframe_insert('influence', frame=f)
if SH.animation_data and SH.animation_data.action: SH.animation_data.action.name = 'zFX_S6_ShieldFly'
for fc in SH.animation_data.action.layers[0].strips[0].channelbags[0].fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
sc.frame_set(0)
print('skill6 anim ok; erro mao max', max(v for k, v in ERR.items() if k[0] == 'S6'), 'GI6', [round(x, 1) for x in GI6], 'solta', [round(x, 1) for x in P0], 'mao catch', [round(x, 1) for x in H])
