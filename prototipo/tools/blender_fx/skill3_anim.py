"""Skill 3 - Chuva de escudos (Shield Rain): animacao do personagem (48 fps, impacto no frame 144)."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion
DY_O = 2.0
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_src = open(_dir + "atk.py").read()
exec(_src.split("ATKS = {")[0])
exec(_src[_src.index("def _lerp"):_src.index("SPOS = globals()")])
add_overshoot = lambda poses, lin, **k: poses

W_ = dict(lf=(2.5, 0, 0), rf=(-2.5, 0, 0))
def Q(**kw):
    d = dict(W_); d.update(kw); return P(**d)

IMPACT = 144
poses = {0: Q(), 45: Q()}
poses[54] = Q(pel=(0, 1.0, -5.0), lean=8, c=(0, -6.0, -8.0), lf=(4, 0, 0), rf=(-4, 0, 0))
poses[60] = Q(pel=(0, 0.5, -4.5), lean=3, c=(0, -9.5, -3.0), spitch=-12, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[66] = Q(pel=(0, 1.0, -3.5), lean=-2, c=(0, -9.0, 4.0), spitch=-45, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[72] = Q(pel=(0, 1.0, -2.6), lean=-5, c=(0, -4.0, 12.0), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[81] = Q(pel=(0, 1.0, -1.5), lean=-5, c=(0, -4.0, 13.0), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
for i, f in enumerate(range(90, 133, 6)):
    s = -1 if i % 2 else 1
    a = 0.3 + 0.7 * (f - 90) / 42.0
    poses[f] = Q(pel=(s * 0.35 * a, 1.0, -1.8 - 0.3 * s * a), lean=-5, c=(s * 0.3 * a, -4.0, 13.2 + 0.3 * s * a), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[138] = Q(pel=(0, 1.0, -1.8), lean=-5, c=(0, -4.0, 13.6), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[IMPACT] = Q(pel=(0, 0.5, -2.8), lean=-2, c=(0, -5.0, 11.0), spitch=-72, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[153] = Q(pel=(0, -2.0, -5.0), lean=14, c=(0, -9.0, -2.0), spitch=-20, lf=(3.5, -2, 0), rf=(-3.5, 0, 0))
poses[165] = Q(pel=(0, -3.5, -6.5), lean=18, c=(0, -9.5, -7.0), spitch=0, lf=(3, -3, 0), rf=(-3, 0.5, 0))
poses[190] = Q(pel=(0, -1.0, -4.0), lean=6, c=(0, -7.0, -7.8), lf=(3, 0, 0), rf=(-3, 0, 0))
poses[216] = Q()

_old = bpy.data.actions.get('Skill3_ShieldRain')
if _old: bpy.data.actions.remove(_old)
SPOS3 = {}; _data = {}
for f, Pp in dense(poses, (144, 153), ()).items():
    _data[f], SPOS3[f] = at_frame(Pp, ('S3', f))
write_action('Skill3_ShieldRain', _data, linear=())
arm.animation_data.action = bpy.data.actions['Skill3_ShieldRain']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.data.actions['Skill3_ShieldRain'].use_fake_user = True
sc = bpy.context.scene
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 216; sc.render.fps = 48
print('skill3 anim ok; erro mao max', max(v for k, v in ERR.items() if k[0] == 'S3'))
