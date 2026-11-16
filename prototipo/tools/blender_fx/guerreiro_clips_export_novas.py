"""Guerreiro (kit novo, 15/11/2026): exporta os clipes das 7 skills (Humano M) -> assets/personagens/guerreiro_clips/MFighter.glb (so esqueleto + clipes w_n0..w_n6, 48 fps).
Roda sem janela:  blender -b prototipo/assets/personagens/guerreiro_skills_novas.blend --python prototipo/tools/blender_fx/guerreiro_clips_export_novas.py
Le os dados gravados em cada cena por guerreiro_novas.py (gw_acao, gw_N, gw_hits, gw_lg, gw_salto, gw_guarda).
- O deslocamento do OBJETO (dash, passos) sai do clipe: no jogo o avanco e feito por codigo (an.lg, em metros) e o servidor sabe onde o jogador esta.
- O salto do Corte Lancador (altura do objeto) e passado para o osso Bip01 (o jogo guarda o delta do quadril), entao ele pula de verdade so no visual.
Escreve medidas.json: dur (s), hits (fracao da duracao), cut (fim do controle), lg (m), guarda (fracao) por clipe."""
import bpy, os, json
from mathutils import Vector
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "guerreiro_clips", "MFighter.glb"))
CENAS = {"GUERREIRO_N0_DASH": "w_n0", "GUERREIRO_N1_CONTRA": "w_n1", "GUERREIRO_N2_MASSACRE": "w_n2", "GUERREIRO_N3_MODO_BATALHA": "w_n3",
         "GUERREIRO_N4_EXECUCAO": "w_n4", "GUERREIRO_N5_LANCADOR": "w_n5", "GUERREIRO_N6_FENDA": "w_n6"}
FIM_EXTRA = {"w_n0": 0.35, "w_n1": 0.45, "w_n2": 0.55, "w_n3": 0.30, "w_n4": 0.55, "w_n5": 0.50, "w_n6": 0.60}   # segundos de pose final antes de devolver o controle
def fcs(act):
    out = []
    if hasattr(act, "layers"):
        for layer in act.layers:
            for strip in layer.strips:
                for bag in getattr(strip, "channelbags", []): out.extend(list(bag.fcurves))
    if not out and hasattr(act, "fcurves"): out = list(act.fcurves)
    return out
def canal(act, path):
    for fc in fcs(act):
        if fc.data_path == path: yield fc
info = {}
for sn, nome in CENAS.items():
    sc = bpy.data.scenes[sn]; info[nome] = dict(acao=sc["gw_acao"], N=int(sc["gw_N"]), hits=list(sc["gw_hits"]), lg=float(sc["gw_lg"]), salto=bool(sc.get("gw_salto", False)), guarda=list(sc.get("gw_guarda", [])))
sc0 = bpy.data.scenes["GUERREIRO_N0_DASH"]; arm = next(o for o in sc0.objects if o.type == "ARMATURE" and o.name.endswith("_arm") and "eco" not in o.name and "sombra" not in o.name)
bpy.context.window.scene = sc0 if bpy.context.window else None
for o in list(bpy.data.objects):
    if o is not arm: bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data_clear(); arm.location = (0, 0, 0); arm.rotation_mode = "XYZ"; arm.rotation_euler = (0, 0, 0); arm.scale = (1, 1, 1)
ad = arm.animation_data_create()
bip = arm.data.bones["Bip01"]; R_inv = bip.matrix_local.to_3x3().inverted()
novas = {}; med = {}
for nome, d in info.items():
    src = bpy.data.actions[d["acao"]]; a = src.copy(); a.name = nome; a.use_fake_user = True
    zfc = next(canal(a, "location"), None) and [fc for fc in canal(a, "location") if fc.array_index == 2]
    zfc = zfc[0] if zfc else None
    if d["salto"] and zfc is not None:                                                      # salto do objeto -> delta do Bip01 (eixos locais do osso)
        bl = {fc.array_index: fc for fc in canal(a, 'pose.bones["Bip01"].location')}
        for i in range(3):
            fc = bl.get(i)
            if not fc: continue
            for kp in fc.keyframe_points:
                dz = zfc.evaluate(kp.co[0]); dl = R_inv @ Vector((0, 0, dz)); kp.co[1] += dl[i]; kp.handle_left[1] += dl[i]; kp.handle_right[1] += dl[i]
            fc.update()
    for fc in list(fcs(a)):                                                                  # tira transformacoes do objeto (o jogo move o jogador por codigo)
        if not fc.data_path.startswith("pose."):
            try: fc.id_data.fcurves.remove(fc)
            except Exception:
                for layer in a.layers:
                    for strip in layer.strips:
                        for bag in strip.channelbags:
                            if fc in list(bag.fcurves): bag.fcurves.remove(fc)
    f0 = a.frame_range[0]
    for fc in fcs(a):
        for kp in fc.keyframe_points: kp.co[0] -= f0; kp.handle_left[0] -= f0; kp.handle_right[0] -= f0
        fc.update()
    novas[nome] = a
    n1 = d["N"] - 1; dur = n1 / 48.0
    hits = [round((h - 1) / n1, 4) for h in d["hits"]]
    cut = min(1.0, ((d["hits"][-1] - 1) + FIM_EXTRA[nome] * 48) / n1)
    med[nome] = {"dur": round(dur, 3), "hits": hits, "cut": round(cut, 4), "lg": round(d["lg"], 2)}
    if d["guarda"]: med[nome]["guarda"] = [round((g - 1) / n1, 4) for g in d["guarda"]]
for a in list(bpy.data.actions):
    if a.name not in novas: bpy.data.actions.remove(a)
for nome, a in novas.items():
    t = ad.nla_tracks.new(); t.name = nome; st = t.strips.new(nome, 0, a)
    try: st.action_slot = a.slots[0]
    except Exception as e: print("slot", e)
    st.name = nome
sc = bpy.context.scene if bpy.context.scene else sc0
for s2 in list(bpy.data.scenes):
    if s2 is not sc0: bpy.data.scenes.remove(s2)
sc0.render.fps = 48
if arm.name not in sc0.objects: sc0.collection.objects.link(arm)
for o in sc0.objects: o.select_set(False)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=SAIDA, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=True,
                          export_optimize_animation_size=True, export_yup=True, export_apply=False, export_skins=True, export_def_bones=False, export_anim_single_armature=True)
med["kb"] = os.path.getsize(SAIDA) // 1024
json.dump(med, open(os.path.join(os.path.dirname(SAIDA), "medidas.json"), "w", encoding="utf-8"), indent=1)
print("MEDIDAS", json.dumps(med))
