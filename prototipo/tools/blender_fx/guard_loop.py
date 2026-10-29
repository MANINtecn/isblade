"""Guardiao: guarda de combate em loop (respirando), para o jogo usar como 'parado em combate'. 96 frames a 48 fps, comeca e termina na mesma pose
(a mesma guarda larga em que as skills comecam e terminam, entao nao ha salto ao entrar numa skill)."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_s6 = open(_dir + "skill6_anim.py").read()
exec(_s6.split("poses = {0:")[0])
sc = bpy.context.scene
PZ = -8.5; NF = 96
data = {}
for f in range(0, NF + 1, 4):
    ph = f / float(NF) * math.tau
    Pp = Q(pel=(0.15 * math.sin(ph + 1.1), 0.12 * math.sin(ph + 2.1), PZ + 0.30 * math.sin(ph)), lean=12 + 0.9 * math.sin(ph + 0.6))
    data[f], _ = at_frame6(Pp, ('GL', f))
old = bpy.data.actions.get('Guard_Loop')
if old: bpy.data.actions.remove(old)
write_action('Guard_Loop', data, linear=())
bpy.data.actions['Guard_Loop'].use_fake_user = True
a = bpy.data.actions['Skill6_ShieldThrow']; arm.animation_data.action = a; arm.animation_data.action_slot = a.slots[0]
print('Guard_Loop ok', len(data), 'chaves')
