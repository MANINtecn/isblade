"""Skill 4 - Rugido do Guardiao (taunt): animacao (48 fps). Rugido a partir do frame 82, burst no 96."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion
DY_O = 2.0
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_src = open(_dir + "atk.py").read()
exec(_src.split("ATKS = {")[0])
exec(_src[_src.index("def _lerp"):_src.index("SPOS = globals()")])
add_overshoot = lambda poses, lin, **k: poses

W_ = dict(lf=(2.5, 0, 0), rf=(-2.5, 0, 0), freeR=0.0, rfist=(-9.0, -1.0, -13.0), headback=0.0, hip=0.0, torso=0.0, fo_l=0.0, fo_r=0.0)
def Q(**kw):
    d = dict(W_); d.update(kw); return P(**d)

_at = at_frame
def at_frame4(Pp, tag):
    d, sp = _at(Pp, tag)
    fr = Pp.get('freeR', 0.0)
    if fr > 0.001:
        wr = head('Bip01_R_Hand'); sh = head('Bip01_R_UpperArm')
        tgt = wr * (1 - fr) + (sh + V(Pp['rfist'])) * fr
        ik2('Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand', tgt, V((-1.0, 0.6, -0.3)))
    _k = min(1.0, abs(Pp.get('hip', 0.0)) / 59.0)
    if _k > 0.01:
        _f = PB['Bip01_head'].matrix.to_3x3() @ V((0, 1, 0))
        _err = math.radians(-90.0) - math.atan2(_f.y, _f.x)
        _err = (_err + math.pi) % (2 * math.pi) - math.pi
        rot_about('Bip01_head', Matrix.Rotation(_err * _k, 3, 'Z'))
    hb = Pp.get('headback', 0.0)
    if abs(hb) > 0.01:
        rot_about('Bip01_head', Matrix.Rotation(math.radians(hb), 3, 'X'))
    return final(), sp
V = Vector

ROAR0, BURST = 82, 96
SYM_L = (5.5, 7.2, 0.0); SYM_R = (-5.5, -10.6, 0.0)     # pes lado a lado, simetricos (a guarda base e um passo largo)
SIDE = dict(c=(11.5, -3.0, -9.0), syaw=90, freeR=1.0, sf=1, hip=59.0, torso=-4.0, fo_l=40.0, fo_r=50.0)
poses = {0: Q(), 20: Q(pel=(0, 0.3, -0.3), lean=1), 40: Q(pel=(0, 0.3, -1.0), lean=3)}
poses[60] = Q(pel=(0.7, 0, -2.5), lean=4, c=(5.0, -7.0, -8.0), syaw=40, freeR=0.5, sf=1, hip=30.0, torso=-2.0, fo_l=20.0, fo_r=25.0, lf=(2.8, 3.6, 0), rf=(-2.8, -5.3, 0))
poses[72] = Q(pel=(1.4, -0.5, -3.0), lean=-3, headback=-18, lf=SYM_L, rf=SYM_R, **SIDE)
poses[84] = Q(pel=(1.4, 0, -2.0), lean=-8, headback=-35, lf=SYM_L, rf=SYM_R, **SIDE)
for i, f in enumerate(range(96, 134, 6)):
    env = 1.0 if 108 <= f <= 132 else 0.6
    s_ = -1 if i % 2 else 1
    poses[f] = Q(pel=(1.4 + s_ * 0.25 * env, 0, -1.2 - 0.25 * env * s_), lean=-10 + s_ * 0.8 * env, headback=-42 + s_ * 1.2 * env,
                 lf=SYM_L, rf=SYM_R, **SIDE)
poses[144] = Q(pel=(1.0, 0, -1.8), lean=-6, headback=-20, lf=(4.5, 5.5, 0), rf=(-4.5, -8.0, 0), **dict(SIDE, hip=45.0, torso=-3.0, fo_l=30.0, fo_r=38.0))
poses[156] = Q(pel=(0.5, 0, -1.2), lean=-2, headback=-6, c=(5.0, -7.0, -8.0), syaw=40, freeR=0.5, sf=1, hip=22.0, torso=-1.0, fo_l=15.0, fo_r=18.0, lf=(2.5, 2.5, 0), rf=(-2.5, -3.6, 0))
poses[172] = Q()
poses[312] = Q()

_old = bpy.data.actions.get('Skill4_GuardianRoar')
if _old: bpy.data.actions.remove(_old)
SPOS4 = {}; _data = {}
for f, Pp in dense(poses, (), ()).items():
    _data[f], SPOS4[f] = at_frame4(Pp, ('S4', f))
write_action('Skill4_GuardianRoar', _data, linear=())
arm.animation_data.action = bpy.data.actions['Skill4_GuardianRoar']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.data.actions['Skill4_GuardianRoar'].use_fake_user = True
sc = bpy.context.scene
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 312; sc.render.fps = 48
for m in list(sc.timeline_markers):
    if m.name.startswith('S4_'): sc.timeline_markers.remove(m)
for nm, fr in (('S4_Roar_inicio', 82), ('S4_Roar_pico', 115), ('S4_Roar_fim', 178)):
    sc.timeline_markers.new(nm, frame=fr)
# distancia mao esquerda -> alca (escudo preso?)
sc.frame_set(96); bpy.context.view_layer.update()
_gl = SH.matrix_world @ V((XLH + FL, YBL, ZL))
print('skill4 anim ok; mao esq a alca no 96:', round((head('Bip01_L_Hand') - _gl).length, 1))
