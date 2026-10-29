"""Skill 2 - Aegis Fortress: animacao do personagem (48 fps, impacto no frame 165)."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion
DY_O = 2.0
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_src = open(_dir + "atk.py").read()
exec(_src.split("ATKS = {")[0])                                  # at_frame, P, READY, pose helpers
exec(_src[_src.index("def _lerp"):_src.index("SPOS = globals()")])  # dense, _ease, interp_pose, LEAD
add_overshoot = lambda poses, lin, **k: poses                    # sem excesso automatico nesta skill

W_ = dict(lf=(2.5, 0, 0), rf=(-2.5, 0, 0))
def Q(**kw):
    d = dict(W_); d.update(kw); return P(**d)

IMPACT = 165
poses = {0: Q(), 45: Q()}
# carga: tremor crescente (g16-g38)
for i, f in enumerate(range(48, 115, 6)):
    u = (f - 48) / 66.0
    a = 0.15 + 0.85 * u
    s = -1 if i % 2 else 1
    poses[f] = Q(pel=(s * 0.5 * a, 0.5, -2.5 - 0.8 * u), lean=3 + 3 * u, lf=(3 + u, 0, 0), rf=(-3 - u, 0, 0),
                 c=(s * 0.35 * a, -6.5, -8.0 + 0.3 * s * a))
poses[117] = Q(pel=(0, 1.0, -3.5), lean=0, c=(0, -6.5, -4.0), spitch=-20, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[126] = Q(pel=(0, 1.5, -3.5), lean=-2, c=(0, -5.0, 6.0), spitch=-55, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[132] = Q(pel=(0, 1.0, -3.0), lean=-4, c=(0, -4.0, 12.0), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[142] = Q(pel=(0, 1.0, -2.6), lean=-5, c=(0, -4.0, 12.5), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[150] = Q(pel=(0, 1.0, -1.8), lean=-5, c=(0, -4.0, 12.8), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[153] = Q(pel=(0, 0.5, -2.5), lean=0, c=(0, -6.0, 12.0), spitch=-62, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[159] = Q(pel=(0, -1.5, -4.5), lean=14, c=(0, -10.5, 4.0), spitch=-28, lf=(3.5, -2, 0), rf=(-3.5, 0, 0))
poses[162] = Q(pel=(0, -3.0, -6.5), lean=22, c=(0, -11.5, -1.0), spitch=-12, lf=(3, -3, 0), rf=(-3, 0.5, 0))
poses[IMPACT] = Q(pel=(0, -5.0, -9.0), lean=30, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[171] = Q(pel=(0, -5.2, -9.4), lean=31, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[180] = Q(pel=(0, -4.8, -9.0), lean=29, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[240] = Q(pel=(0, -4.8, -9.0), lean=29, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[288] = Q(pel=(0, -4.8, -9.0), lean=29, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[306] = Q(pel=(0, -2.0, -5.0), lean=10, c=(0, -7.5, -7.8), lf=(3, 0, 0), rf=(-3, 0, 0))
poses[324] = Q()

_old = bpy.data.actions.get('Skill2_AegisFortress')
if _old: bpy.data.actions.remove(_old)
SPOS2 = {}; _data = {}
for f, Pp in dense(poses, (153, 159, 162), ()).items():
    _data[f], SPOS2[f] = at_frame(Pp, ('S2', f))
write_action('Skill2_AegisFortress', _data, linear=())
arm.animation_data.action = bpy.data.actions['Skill2_AegisFortress']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.data.actions['Skill2_AegisFortress'].use_fake_user = True
sc = bpy.context.scene
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 324; sc.render.fps = 48
print('skill2 anim ok; erro mao max', max(v for k, v in ERR.items() if k[0] == 'S2'))
