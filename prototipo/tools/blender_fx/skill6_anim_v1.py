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

W_ = dict(lf=(2.5, 0, 0), rf=(-2.5, 0, 0), freeR=0.0, rfist=(2.0, -9.0, -5.0), fo_l=0.0, fo_r=0.0)
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
    return final(), sp
V = Vector

RLS, IMPACT, EXIT, CATCH, SP0 = 50, 64, 108, 150, 30
FOL, FOR = 0.0, 0.0
SYL, SYR = (7.5, 7.2, 0), (-7.5, -10.6, 0)                         # pes lado a lado (a guarda base e um passo largo)
G_ = dict(lf=SYL, rf=SYR, freeR=1.0, fo_l=FOL, fo_r=FOR)                 # pernas abertas, flexionadas e alinhadas
FLW = dict(lf=(8, 7.2, 0), rf=(-8, -10.6, 0), freeR=1.0, fo_l=FOL, fo_r=FOR)
poses = {0: Q(), 8: Q()}
poses[16] = Q(pel=(0, 0.5, -6.5), lean=0, c=(8, -3, -5), syaw=30, **dict(G_, freeR=0.6))
poses[24] = Q(pel=(0, 1.0, -9.0), lean=-4, c=(15, 2, -4), syaw=70, **G_)
poses[44] = Q(pel=(0, 1.0, -10.5), lean=-6, c=(16, 4, -3), syaw=75, **G_)
poses[47] = Q(pel=(0, -1.0, 3.0), lean=8, c=(9, -8, 2), syaw=25, spitch=-20, **dict(G_, lf=(7.5, 7.2, 9), rf=(-7.5, -10.6, 8)))
poses[RLS] = Q(pel=(0, -2.5, 2.5), lean=20, c=(2, -15, -3), spitch=-8, **dict(G_, lf=(7.5, 7.2, 8), rf=(-7.5, -10.6, 7)))
poses[54] = Q(pel=(0, -4.0, -9.5), lean=24, c=(0, -17, -9), spitch=-5, **FLW)
poses[56] = Q(pel=(0, -4.0, -9.5), lean=24, c=(0, -17, -9), spitch=-5, **FLW)
poses[104] = Q(pel=(0, -4.0, -9.5), lean=24, c=(0, -17, -9), spitch=-5, **FLW)
poses[114] = Q(pel=(0, -3.0, -8.0), lean=18, c=(0, -15, -5), spitch=-12, **FLW)
poses[128] = Q(pel=(0, -1.0, -6.0), lean=6, c=(0, -9, 3), spitch=-30, **G_)
poses[142] = Q(pel=(0, -0.5, -5.0), lean=2, c=(0, -8, 4), spitch=-22, **G_)
poses[CATCH] = Q(pel=(0, -1.0, -6.5), lean=6, c=(0, -9, -4), spitch=-5, **G_)
poses[158] = Q(pel=(0, 0, -3.5), lean=2, freeR=0.5)
poses[172] = Q()
poses[184] = Q()
poses[228] = Q()

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
GI6 = V((HM[RLS].translation.x, CTR.y - 140.0, 0.0))               # onde crava: ~5,7 m a frente
qB = Quaternion(V((0, 1, 0)), math.pi)                            # ponta para baixo, face para a frente
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def spin(psi): return Quaternion(V((0, 1, 0)), psi)               # giro em volta da face do escudo
def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return p0 * (u ** 3) + p1 * (3 * u * u * t) + p2 * (3 * u * t * t) + p3 * (t ** 3)

q0 = HM[RLS].to_quaternion(); qC = HM[CATCH].to_quaternion(); H = HM[CATCH].translation.copy()
P0 = HM[RLS].translation.copy(); PI = GI6 + V((0, 0, HALF + 0.8)); PB_ = GI6 + V((0, 0, BURY))
FLY = {}
rig = bpy.data.objects.new('S6_ShieldRig', None); rig.empty_display_type = 'ARROWS'; rig.empty_display_size = 6
sc.collection.objects.link(rig); rig.rotation_mode = 'QUATERNION'
rng6 = __import__('random').Random(66)
for f in range(SP0, CATCH + 1):
    if f < RLS:                                                    # gira no lado, acelerando
        u = (f - SP0) / float(RLS - SP0)
        pos = HM[f].translation.copy(); q = HM[f].to_quaternion() @ spin(math.tau * 8 * u ** 1.7)
    elif f <= IMPACT:                                                # arremesso: gira rapido, cai de ponta
        u = (f - RLS) / float(IMPACT - RLS); t = u ** 1.15
        pos = bez(P0, P0 + V((12, -30, 18)), PI + V((0, 26, 16)), PI, t)
        q = q0.slerp(qB, smooth(t)) @ spin(math.tau * 5 * t)
    elif f < EXIT:
        k = (f - IMPACT) / 6.0
        sink = 1 - (1 - min(k, 1.0)) ** 2.6                        # afunda rapido
        pos = PI.lerp(PB_, sink); q = qB.copy()
        if k >= 1.0:                                               # enterrado, tremendo mais e mais perto da saida
            amp = 0.15 + 1.1 * smooth((f - 78) / 28.0)
            pos = pos + V((rng6.uniform(-1, 1) * amp, rng6.uniform(-1, 1) * amp, rng6.uniform(-0.3, 0.8) * amp))
    else:                                                          # sai do chao e volta girando para a mao
        s = (f - EXIT) / float(CATCH - EXIT); t = 1 - (1 - s) ** 1.5
        p1 = PB_ + V((0, 6, 120)); p2 = H + V((0, -34, 100))
        pos = bez(PB_, p1, p2, H, t)
        q = qB.slerp(qC, smooth(s)) @ spin(math.tau * 8 * t)
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
