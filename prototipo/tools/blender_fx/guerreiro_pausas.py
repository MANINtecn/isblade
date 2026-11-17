"""Guerreiro (kit novo): mede em cada skill onde o corpo comeca a se mexer ("ini") e os trechos parados ("pausas": hit-stop gravado no Blender)
e grava em medidas.json. O jogo comeca o clipe no "ini" e passa rapido pelas pausas (deixa so um hit-stop curto), sem mudar a animacao.
Roda sem janela:  blender -b prototipo/assets/personagens/guerreiro_skills_novas.blend --python prototipo/tools/blender_fx/guerreiro_pausas.py
Velocidade medida = ponta da espada + quadril no espaco do mundo (avanco e salto do objeto contam), em m/s, quadro a quadro (48 fps)."""
import bpy, os, json
AQUI = os.path.dirname(os.path.abspath(__file__))
MED = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "guerreiro_clips", "medidas.json"))
CENAS = {"GUERREIRO_N0_DASH": "w_n0", "GUERREIRO_N1_CONTRA": "w_n1", "GUERREIRO_N2_MASSACRE": "w_n2", "GUERREIRO_N3_MODO_BATALHA": "w_n3",
         "GUERREIRO_N4_EXECUCAO": "w_n4", "GUERREIRO_N5_LANCADOR": "w_n5", "GUERREIRO_N6_FENDA": "w_n6"}
U = 23.4
med = json.load(open(MED, encoding="utf-8"))
for sn, nome in CENAS.items():
    sc = bpy.data.scenes[sn]; N = int(sc["gw_N"]); f0 = int(round(bpy.data.actions[sc["gw_acao"]].frame_range[0]))
    arm = next(o for o in sc.objects if o.type == "ARMATURE" and o.name.endswith("_arm") and "eco" not in o.name and "sombra" not in o.name)
    esp = next(o for o in sc.objects if o.name.startswith(sn.replace("GUERREIRO_", "") + "_espada"))
    tipL = max((v.co for v in esp.data.vertices), key=lambda v: v.length)
    pts = []
    for f in range(f0, f0 + N):
        sc.frame_set(f); dg = sc.view_layers[0].depsgraph; dg.update(); ae = arm.evaluated_get(dg); ee = esp.evaluated_get(dg); inv = 1   # cena fora da janela: le a versao avaliada; espaco do MUNDO (avanco e salto do objeto contam como movimento)
        pts.append(((ee.matrix_world @ tipL), (ae.matrix_world @ ae.pose.bones["Bip01_Pelvis"].head)))
    sp = [0.0] + [((pts[i][0] - pts[i - 1][0]).length + (pts[i][1] - pts[i - 1][1]).length) / U * 48 for i in range(1, len(pts))]
    mx = max(sp); ini = next(i for i, x in enumerate(sp) if x > mx * 0.06)
    ini = max(0, ini - 3)                                                                  # 3 quadros de antecipacao
    if med[nome].get("guarda"): ini = min(ini, max(0, int(med[nome]["guarda"][0] * (N - 1)) - 8))   # Contra-Golpe: nunca pula a subida para a guarda (janela de aparo)
    cut = int(med[nome]["cut"] * (N - 1)); pausas = []; a = None
    for i in range(ini, cut + 1):
        parado = sp[i] < mx * 0.04
        if parado and a is None: a = i
        if (not parado or i == cut) and a is not None:
            g = med[nome].get("guarda"); gi = [x * (N - 1) for x in g] if g else None
            if i - a >= 4 and not (gi and a <= gi[1] and i >= gi[0]): pausas.append([round(a / 48, 3), round(i / 48, 3)])   # a guarda do Contra-Golpe (aparo) nao e pausa
            a = None
    med[nome]["ini"] = round(ini / 48, 3); med[nome]["pausas"] = pausas
    print("PAUSAS", nome, "ini %.2f s" % (ini / 48), "pausas", pausas)
json.dump(med, open(MED, "w", encoding="utf-8"), indent=1)
print("OK", MED)
