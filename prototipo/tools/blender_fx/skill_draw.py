"""Guardiao: pose de descanso do Lineage 2 (braco pendurado, escudo de lado) e a transicao para a guarda de combate, simples e sem giro (48 fps).
Descansar: Wait_1HS / Walk_1HS / Run_1HS do Lineage 2 (o escudo fica na mao, deitado). Sacar: o braco sobe e o escudo se levanta ate a guarda. Guardar: o contrario.
So poses de osso: nada de voo, constraint ou driver. A versao com o escudo nas costas ficou em skill_draw_costas.py (acoes Costas_*)."""
import bpy, math
from mathutils import Matrix, Vector, Quaternion
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_s6 = open(_dir + "skill6_anim.py").read()
exec(_s6.split("poses = {0:")[0])                     # atk.py, shield_rig, guarda larga (stance), Q, at_frame6
sc = bpy.context.scene
N = 30; T0, T1 = 4, 22                                 # parado ate 4, sobe ate 22, firma na guarda ate 30

# aposenta a versao das costas (renomeia, nao apaga)
for old, new in (('Rest_DrawShield', 'Costas_DrawShield'), ('Rest_SheatheShield', 'Costas_SheatheShield'), ('Rest_Idle_ShieldBack', 'Costas_Idle'),
                 ('Rest_Walk_ShieldBack', 'Costas_Walk'), ('Rest_Run_ShieldBack', 'Costas_Run')):
    a_ = bpy.data.actions.get(old)
    if a_ and new not in bpy.data.actions: a_.name = new

def snapshot(): return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in PB}
def blend(a, b, t):
    return {n: (a[n][0].lerp(b[n][0], t), a[n][1].slerp(b[n][1], t)) for n in a}
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def sel_action(name):
    a = bpy.data.actions[name]; arm.animation_data.action = a
    try: arm.animation_data.action_slot = a.slots[0]
    except Exception: pass
    return a
def make(name, data):
    old = bpy.data.actions.get(name)
    if old: bpy.data.actions.remove(old)
    write_action(name, data, linear=())
    bpy.data.actions[name].use_fake_user = True

# copias das poses de descanso do Lineage 2 com espada e escudo (o escudo acompanha a mao, deitado)
def copy_rest(src, dst):
    a = sel_action(src); f0, f1 = int(a.frame_range[0]), int(a.frame_range[1]); reset()
    data = {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f); upd(); data[f] = snapshot()
    arm.animation_data.action = None; reset()
    make(dst, data)
    return data, f0, f1
IDLE_D, i0, i1 = copy_rest('Wait_1HS_MFighter', 'Rest_Idle_Shield')
copy_rest('Walk_1HS_MFighter', 'Rest_Walk_Shield')
copy_rest('Run_1HS_MFighter', 'Rest_Run_Shield')
IDLE = IDLE_D[i0]

# guarda de combate (a mesma da skill 6 e do ataque basico)
PZ = -8.5
GUARD, sp_g = at_frame6(Q(pel=(0, 0, PZ), lean=12), ('D', 'guard'))
reset()

def bone_frame(f):
    if f <= T0: return IDLE
    if f >= T1: return GUARD
    return blend(IDLE, GUARD, smooth((f - T0) / float(T1 - T0)))
make('Rest_DrawShield', {f: bone_frame(f) for f in range(0, N + 1)})
make('Rest_SheatheShield', {i: bone_frame(N - i) for i in range(0, N + 1)})
sel_action('Skill6_ShieldThrow')
print('descanso ok: sacar', N, 'frames; descanso', i0, i1)
