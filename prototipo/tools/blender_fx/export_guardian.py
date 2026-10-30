"""Exporta as animacoes do Guardiao para prototipo/assets/personagens/guardian_anims.glb (so o esqueleto e os clipes, sem malhas).
O jogo carrega esse arquivo e junta os clipes aos do personagem (mesmos nomes de osso). O escudo anima pelo osso Shield_L_Bone."""
import bpy, os
sc = bpy.context.scene
arm = bpy.data.objects['HumanFighter_Armature']
OUT = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\guardian_anims.glb"
# nome no blend -> nome do clipe no jogo
CLIPS = {
    'Rest_Idle_Shield': 'g_idle', 'Rest_Walk_Shield': 'g_walk', 'Rest_Run_Shield': 'g_run_rest',
    'Rest_DrawShield': 'g_draw', 'Rest_SheatheShield': 'g_sheathe',
    'Guard_Loop': 'g_guard',
    'Atk01_ShieldRush': 'g_atk1', 'Atk02_ShieldSweep': 'g_atk2', 'Atk03_ShieldJumpSlam': 'g_atk3',
    'Skill_EnergyShield_1p2s': 'g_skill1', 'Skill2_AegisFortress': 'g_skill2', 'Skill3_ShieldRain': 'g_skill3',
    'Skill4_GuardianRoar': 'g_skill4', 'Skill5_ChainPull': 'g_skill5', 'Skill6_ShieldThrow': 'g_skill6',
    'Dodge_Roll': 'g_roll',          # rolagem do Mixamo retargeteada (tools/blender_fx/dodge_roll.py): esquiva de todo lutador
    'L2_Cast_Skill1': 'l2_cast1',    # Skill 1 (canalizada): CastMid do L2 (MFighter_anim.psa) a 48 fps; escudo erguido = pose segurada, impulso = liberacao
    # Skills 2-6 em cima das animacoes nativas do L2 (MFighter_anim.psa; ver prototipo/tools/blender_fx/skills_l2.py)
    'L2_Skill2_Slam': 'l2_s2', 'L2_Skill3_Rain': 'l2_s3', 'L2_Skill4_Taunt': 'l2_s4', 'L2_Skill5_Hook': 'l2_s5', 'L2_Skill6_ShieldThrow': 'l2_s6',
}
miss = [k for k in CLIPS if k not in bpy.data.actions]
print('faltando', miss)
ad = arm.animation_data or arm.animation_data_create()
prev = ad.action; prev_slot = getattr(ad, 'action_slot', None)
ad.action = None
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
for src, dst in CLIPS.items():
    a = bpy.data.actions.get(src)
    if not a: continue
    t = ad.nla_tracks.new(); t.name = dst
    st = t.strips.new(dst, int(a.frame_range[0]), a)
    try: st.action_slot = a.slots[0]
    except Exception as e: print('slot', src, e)
    st.name = dst
for o in bpy.context.view_layer.objects: o.select_set(False)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
try:
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                              export_force_sampling=True, export_optimize_animation_size=True, export_yup=True, export_apply=False,
                              export_skins=True, export_def_bones=False, export_anim_single_armature=True)
    print('exportado', OUT, os.path.getsize(OUT) // 1024, 'KB')
except Exception as e:
    print('ERRO export', e)
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
ad.action = prev
try:
    if prev_slot is not None: ad.action_slot = prev_slot
except Exception: pass
