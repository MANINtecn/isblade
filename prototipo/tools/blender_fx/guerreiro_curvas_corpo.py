"""Guerreiro (kit novo): le a curva de deslocamento do corpo de cada skill (anda_obj do guerreiro_novas.py) e grava em medidas.json como "rm".
Roda sem janela:  blender -b prototipo/assets/personagens/guerreiro_skills_novas.blend --python prototipo/tools/blender_fx/guerreiro_curvas_corpo.py
rm = metros andados para a frente em cada quadro do clipe (48 fps, quadro 0 = inicio do clipe exportado). O jogo move o jogador por essa curva
(arrancada, pausa no corte, freada) em vez de espalhar o total (lg) numa curva generica antes do 1o golpe."""
import bpy, os, json
AQUI = os.path.dirname(os.path.abspath(__file__))
MED = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "guerreiro_clips", "medidas.json"))
CENAS = {"GUERREIRO_N0_DASH": "w_n0", "GUERREIRO_N1_CONTRA": "w_n1", "GUERREIRO_N2_MASSACRE": "w_n2", "GUERREIRO_N3_MODO_BATALHA": "w_n3",
         "GUERREIRO_N4_EXECUCAO": "w_n4", "GUERREIRO_N5_LANCADOR": "w_n5", "GUERREIRO_N6_FENDA": "w_n6"}
med = json.load(open(MED, encoding="utf-8"))
brutos = {}
for sn, nome in CENAS.items():
    sc = bpy.data.scenes[sn]; N = int(sc["gw_N"]); f0 = int(round(bpy.data.actions[sc["gw_acao"]].frame_range[0]))
    arm = next(o for o in sc.objects if o.type == "ARMATURE" and o.name.endswith("_arm") and "eco" not in o.name and "sombra" not in o.name)
    ad = arm.animation_data; ys = []
    fc = None
    if ad and ad.action:
        acts = [ad.action]
        for a in acts:
            curvas = []
            if hasattr(a, "layers"):
                for layer in a.layers:
                    for strip in layer.strips:
                        for bag in getattr(strip, "channelbags", []): curvas.extend(list(bag.fcurves))
            if not curvas and hasattr(a, "fcurves"): curvas = list(a.fcurves)
            fc = next((c for c in curvas if c.data_path == "location" and c.array_index == 1), None)
    for f in range(f0, f0 + N):
        ys.append(fc.evaluate(f) if fc else 0.0)
    brutos[nome] = [y - ys[0] for y in ys]
    print("CURVA", nome, "quadros", N, "f0", f0, "fim", brutos[nome][-1], "lg", med[nome]["lg"])
U = brutos["w_n0"][-1] / med["w_n0"]["lg"]                                                    # unidade do Blender por metro (o dash anda lg metros)
for nome, ys in brutos.items():
    rm = [round(y / U, 3) for y in ys]
    med[nome]["rm"] = rm
    print("RM", nome, "total %.2f m" % rm[-1], "(lg %.2f)" % med[nome]["lg"])
json.dump(med, open(MED, "w", encoding="utf-8"), indent=1)
print("OK", MED)
