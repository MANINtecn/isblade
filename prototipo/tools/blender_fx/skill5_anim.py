"""Skill 5 - Correntes: animacao do personagem, sem salto. Ergue o escudo e finca a ponta no chao (impacto no frame 70)."""
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

IMPACT = 70
poses = {0: Q(), 8: Q()}
poses[22] = Q(pel=(0, 1.0, -4.0), lean=6, c=(0, -6.0, -8.0), lf=(4, 0, 0), rf=(-4, 0, 0))
poses[32] = Q(pel=(0, 0.5, -4.5), lean=3, c=(0, -9.0, -3.0), spitch=-12, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[40] = Q(pel=(0, 1.0, -3.5), lean=-2, c=(0, -9.0, 4.0), spitch=-45, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[48] = Q(pel=(0, 1.0, -2.6), lean=-5, c=(0, -4.0, 12.0), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[58] = Q(pel=(0, 1.0, -2.2), lean=-6, c=(0, -4.0, 12.8), spitch=-80, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[61] = Q(pel=(0, 0.5, -2.5), lean=0, c=(0, -6.0, 12.0), spitch=-62, lf=(4, 0, 0), rf=(-4, 0, 0))
poses[65] = Q(pel=(0, -1.5, -4.5), lean=14, c=(0, -10.5, 4.0), spitch=-28, lf=(3.5, -2, 0), rf=(-3.5, 0, 0))
poses[68] = Q(pel=(0, -3.0, -6.5), lean=22, c=(0, -11.5, -1.0), spitch=-12, lf=(3, -3, 0), rf=(-3, 0.5, 0))
poses[IMPACT] = Q(pel=(0, -5.0, -9.0), lean=30, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[76] = Q(pel=(0, -5.2, -9.4), lean=31, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[110] = Q(pel=(0, -5.0, -9.2), lean=30, c=(0, -9.0, -8.0), spitch=2, lf=(3, -4, 0), rf=(-3, 1, 0))
poses[134] = Q(pel=(0, -2.0, -5.0), lean=10, c=(0, -7.5, -7.8), lf=(3, 0, 0), rf=(-3, 0, 0))
poses[150] = Q()
poses[200] = Q()

_old = bpy.data.actions.get('Skill5_ChainPull')
if _old: bpy.data.actions.remove(_old)
SPOS5 = {}; _data = {}
for f, Pp in dense(poses, (61, 65, 68), ()).items():
    _data[f], SPOS5[f] = at_frame(Pp, ('S5', f))
write_action('Skill5_ChainPull', _data, linear=())
arm.animation_data.action = bpy.data.actions['Skill5_ChainPull']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.data.actions['Skill5_ChainPull'].use_fake_user = True
sc = bpy.context.scene
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 200; sc.render.fps = 48
print('skill5 anim ok; erro mao max', max(v for k, v in ERR.items() if k[0] == 'S5'))
