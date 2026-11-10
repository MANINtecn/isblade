"""Guerreiro: exporta os clipes das skills (Humano M) -> assets/personagens/guerreiro_clips/MFighter.glb (so esqueleto + clipes w_s1..w_s6, 48 fps).
Roda sem janela:  blender -b prototipo/assets/personagens/guerreiro_skills.blend --python prototipo/tools/blender_fx/guerreiro_clips_export.py
Clipes (acoes baked do guerreiro_skills.blend): w_s1 = Golpe Poderoso, w_s3 = Golpe Atordoante, w_s4 = Redemoinho de Aco, w_s5 = Grito de Guerra, w_s6 = Furia do Dragao.
Cada acao e deslocada para comecar no quadro 0. Escreve tambem medidas.json (duracao em segundos de cada clipe)."""
import bpy, os, json
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "guerreiro_clips", "MFighter.glb"))
MAP = {"w_s1": "W_Poderoso", "w_s3": "W_Atordoante", "w_s4": "W_Redemoinho", "w_s5": "W_Grito", "w_s6": "W_Furia"}
def fcs(act):
    if hasattr(act, "fcurves"): return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []): out.extend(list(bag.fcurves))
    return out
base = bpy.data.scenes["GUERREIRO_BASICO"]; arm = next(o for o in base.objects if o.type == "ARMATURE")
# tira tudo que nao e o esqueleto
for o in list(bpy.data.objects):
    if o is not arm: bpy.data.objects.remove(o, do_unlink=True)
arm.location = (0, 0, 0); arm.rotation_euler = (0, 0, 0); arm.scale = (1, 1, 1)
ad = arm.animation_data or arm.animation_data_create(); ad.action = None
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
novas = {}; med = {}
for nome, src in MAP.items():
    a = bpy.data.actions[src].copy(); a.name = nome; a.use_fake_user = True; f0 = a.frame_range[0]
    for fc in fcs(a):
        for kp in fc.keyframe_points: kp.co[0] -= f0; kp.handle_left[0] -= f0; kp.handle_right[0] -= f0
        fc.update()
    novas[nome] = a; med[nome] = {"quadros": round(a.frame_range[1] - a.frame_range[0], 1) + 1, "dur": round((a.frame_range[1] - a.frame_range[0]) / 48.0, 3)}
for a in list(bpy.data.actions):
    if a.name not in novas: bpy.data.actions.remove(a)
for nome, a in novas.items():
    t = ad.nla_tracks.new(); t.name = nome; st = t.strips.new(nome, 0, a)
    try: st.action_slot = a.slots[0]
    except Exception as e: print("slot", e)
    st.name = nome
bpy.context.scene.render.fps = 48
for o in bpy.context.scene.objects: o.select_set(False)
if arm.name not in bpy.context.scene.objects: bpy.context.scene.collection.objects.link(arm)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=True,
                          export_optimize_animation_size=True, export_yup=True, export_apply=False, export_skins=True, export_def_bones=False, export_anim_single_armature=True)
med["kb"] = os.path.getsize(SAIDA) // 1024
json.dump(med, open(os.path.join(os.path.dirname(SAIDA), "medidas.json"), "w", encoding="utf-8"), indent=1)
print("MEDIDAS", json.dumps(med))
