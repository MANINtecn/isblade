"""Guerreiro (Humano M, Dragon Slayer 2 maos): 6 cenas = ataque basico + 5 skills, com o personagem de verdade e as animacoes nativas do L2.
Rodar sem janela:  blender -b prototipo/assets/personagens/guerreiro_base.blend --python prototipo/tools/blender_fx/build_guerreiro.py
Cenas: GUERREIRO_BASICO (combo de 3 golpes) · _S1_PODEROSO · _S3_ATORDOANTE · _S4_REDEMOINHO (10 golpes cronometrados em 5 voltas) · _S5_GRITO · _S6_FURIA.
(O Avanço, que ja existe no jogo, nao foi refeito.) 48 fps. Frente do personagem = +Y."""
import bpy, math, random, os, sys
from mathutils import Vector, Matrix
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
import guerreiro_clips as G
import guerreiro_fx as X
from guerreiro_fx import U, M, esc, anim, apunta, luz, pisca, camera, caixa, para_obj, sprite, trilha, espinhos, clarao, onda, fenda, brilho_chao, lascas, brasas, coluna, bm_cone, bm_laje, bm_feixe, bm_lamina_energia
import importlib; importlib.reload(X)
from guerreiro_fx import U, M, esc, anim, apunta, luz, pisca, camera, caixa, para_obj, sprite, trilha, espinhos, clarao, onda, fenda, brilho_chao, lascas, brasas, coluna, bm_cone, bm_laje, bm_feixe, bm_lamina_energia

PREF = "GUERREIRO_"; YAW = math.pi
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
ONLY = os.environ.get("GW_ONLY", "")
G.iniciar_base(); X.init_materiais(); BASE_ARM = G.BASE["arm"]; BASE_ESP = G.BASE["espada"]
ORIG = {o.name for o in bpy.data.objects}

def R(p): return Vector((-p.x, -p.y, p.z))                                    # personagem virado +Y (gira 180 graus em Z)
def dados_mundo(acao, n):
    G.usa_acao(BASE_ARM, acao.name); d = G.ponta_e_cabo(BASE_ARM, BASE_ESP, 1, n)
    return {f: (R(a), R(b), R(h)) for f, (a, b, h) in d.items()}
def pico(dados, a, b):
    best = max(range(a + 1, b + 1), key=lambda f: (dados[f][0] - dados[f - 1][0]).length); return best
def no_golpe(p, extra=0.45):
    """posicao (m) do inimigo: onde a lamina acerta, um pouco alem, na direcao quadril -> ponta"""
    v = Vector((p.x, p.y, 0)); n = v.normalized() if v.length > 1e-3 else Vector((0, 1, 0)); return ((p.x + n.x * extra * U) / U, (p.y + n.y * extra * U) / U)
def cena(nome, fim, acao, dummy=(0.0, 2.6), dummy_h=1.8):
    sc, col, ref = X.nova_cena(PREF + nome, fim)
    plano = bpy.data.meshes.new("GW_chao"); import bmesh; bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30 * U / 2); bm.to_mesh(plano); bm.free(); plano.materials.append(M["ref_chao"])
    ch = bpy.data.objects.new("chao", plano); ref.objects.link(ch)
    luz(ref, "sol", "SUN", (0, 0, 10 * U), 1.2, (1.0, 0.92, 0.85)).rotation_euler = (math.radians(50), 0, math.radians(35))
    luz(ref, "luz_fria", "SUN", (0, 0, 10 * U), 0.35, (0.55, 0.65, 1.0)).rotation_euler = (math.radians(60), 0, math.radians(-120))
    arm, esp = G.clonar(col, nome, (0, 0, 0), YAW); arm.animation_data.action = acao
    if arm.animation_data.action_slot is None and len(acao.slots): arm.animation_data.action_slot = acao.slots[0]            # sem o slot a animacao nao toca no clone
    d = None
    if dummy: d = caixa(ref, "inimigo", (dummy[0] * U, dummy[1] * U, dummy_h * U / 2), (0.7 * U, 0.45 * U, dummy_h * U), M["ref_inimigo"])
    return sc, col, ref, arm, esp, d
def cams(sc, ref, alvo=(0, 1.8, 1.3), dist=1.0):
    a = Vector(alvo) * U
    camera(sc, ref, "cam_lateral", (7.5 * U * dist, 1.8 * U, 2.0 * U), a, 34)
    camera(sc, ref, "cam_alvo", (3.4 * U * dist, 6.2 * U * dist, 2.4 * U), a, 32)
    sc.camera = camera(sc, ref, "cam_do_guerreiro", (-2.6 * U * dist, -4.8 * U * dist, 2.3 * U), a, 30)
def fim_cena(sc): X.retarget(sc)

# ================================================================== ATAQUE BASICO: combo de 3 golpes
def montar_basico():
    random.seed(1)
    acao, fx = G.bake(BASE_ARM, "W_Basico", [dict(acao="W_Atk01_2HS", de=0, ate=56, saida=57), dict(acao="W_Atk02_2HS", de=0, ate=56, saida=57, alinha=True), dict(acao="W_Atk03_2HS", de=0, ate=66, saida=67, alinha=True)], emenda=3)
    N = fx[-1][1]; d = dados_mundo(acao, N); imp = [pico(d, a, b) for a, b in fx]; print("BASICO impactos", imp, "total", N)
    pm = sum((d[f][0] for f in imp), Vector((0, 0, 0))) / 3.0; sc, col, ref, arm, esp, dm = cena("BASICO", N + 20, acao, dummy=no_golpe(pm, 0.5), dummy_h=1.8); cams(sc, ref, (0, 1.6, 1.3))
    for k, f in enumerate(imp):
        trilha(col, "trilha%d" % k, d, f - 14, f + 3, 0.28, 3.4)
        p = d[f][0]; chao = (p.x, p.y, 0.5); grande = (k == 2)
        espinhos(col, "h%d_esp" % k, p, f, 16 if grande else 9, 1.5 if grande else 0.9, "b" if k < 2 else "o", 0.05, 14)
        clarao(col, "h%d_clarao" % k, p, f, 2.6 if grande else 1.5, "b", 16)
        brasas(col, "h%d_brasa" % k, p, f, 18 if grande else 8, 2.2, 1.6, (30, 60), "o", 0.16)
        lascas(col, "h%d_lasca" % k, chao, f, 10 if grande else 4, 0.14, 3.0)
        luzf = luz(col, "h%d_luz" % k, "POINT", (p.x, p.y, p.z + 0.5 * U), 0, (1.0, 0.55, 0.25)); pisca(luzf, [(f - 1, 0), (f, 2200 if grande else 1200), (f + 8, 400), (f + 18, 0)])
        if grande:
            fenda(col, "h2_fenda", chao, f, 2.6, "o", 36, 0.6); onda(col, "h2_onda", chao, f, 3.4, "o", 20); onda(col, "h2_onda2", chao, f + 4, 2.2, "c", 18)
        else:
            onda(col, "h%d_onda" % k, chao, f, 1.5, "o", 14)
    fim_cena(sc); return sc

# ================================================================== S1 GOLPE PODEROSO (nv 1): talho de cima, rapido
def montar_poderoso():
    random.seed(2)
    acao, fx = G.bake(BASE_ARM, "W_Poderoso", [dict(acao="W_SpAtk18_2HS", de=0, ate=60, saida=61), dict(acao="W_SpAtk18_2HS", de=60, ate=60, saida=18)], emenda=0)
    N = fx[-1][1]; d = dados_mundo(acao, N); f = pico(d, 1, fx[0][1]); print("PODEROSO impacto", f, "total", N, [round((d[k][0] - d[k - 1][0]).length, 1) for k in range(2, 8)], fx)
    sc, col, ref, arm, esp, dm = cena("S1_PODEROSO", N + 24, acao, dummy=no_golpe(d[f][0], 0.6), dummy_h=1.8); cams(sc, ref, (dm_x := no_golpe(d[f][0], 0.6)[0] * 0.5, no_golpe(d[f][0], 0.6)[1] * 0.5 + 0.3, 1.2))
    trilha(col, "trilha_a", d, 2, f + 3, 0.30, 3.6)
    p = d[f][0]; chao = (p.x, p.y, 0.5)
    espinhos(col, "h_esp", p, f, 24, 1.8, "b", 0.05, 16); espinhos(col, "h_esp2", p, f, 10, 1.1, "o", 0.04, 20)
    clarao(col, "h_clarao", p, f, 3.2, "b", 18); brasas(col, "h_brasa", p, f, 26, 2.6, 2.0, (36, 70), "o", 0.17); lascas(col, "h_lasca", chao, f, 14, 0.15, 3.6)
    fenda(col, "h_fenda", chao, f, 3.0, "o", 42, 0.3); onda(col, "h_onda", chao, f, 3.6, "o", 22); onda(col, "h_onda2", chao, f + 4, 2.4, "c", 20)
    for k in range(3):                                                                         # fenda comprida a frente: o corte vai alem da lamina
        a = (p - Vector((0, 0, 0))).normalized(); q = Vector((p.x + a.x * (1.2 + k * 1.2) * U, p.y + a.y * (1.2 + k * 1.2) * U, 0.5)); fenda(col, "h_fendaL%d" % k, q, f + 2 + k * 2, 1.3, "c", 30, random.uniform(0, 3))
    luzf = luz(col, "h_luz", "POINT", (p.x, p.y, p.z + 0.5 * U), 0, (1.0, 0.5, 0.2)); pisca(luzf, [(f - 1, 0), (f, 3000), (f + 8, 700), (f + 22, 0)])
    # inimigo recebe o golpe: recua e sacode
    dm.keyframe_insert("location", frame=f - 1); l0 = dm.location.copy(); dm.location = l0 + Vector((-0.5 * U, 0.6 * U, 0)); dm.keyframe_insert("location", frame=f + 5); dm.location = l0 + Vector((-0.5 * U, 0.6 * U, 0)); dm.keyframe_insert("location", frame=f + 40)
    fim_cena(sc); return sc

# ================================================================== S3 GOLPE ATORDOANTE (nv 10): espada cravada no chao, cone de 4,5 m, stun
def montar_atordoante():
    random.seed(3)
    acao, fx = G.bake(BASE_ARM, "W_Atordoante", [dict(acao="W_SpAtk01_2HS", de=0, ate=86, saida=87), dict(acao="W_SpAtk01_2HS", de=86, ate=86, saida=60)], emenda=0)
    N = fx[-1][1]; d = dados_mundo(acao, N); f = pico(d, 1, fx[0][1]); print("ATORDOANTE impacto", f, "total", N)
    p = d[f][0]; dx, dy = p.x / U, p.y / U
    sc, col, ref, arm, esp, dm = cena("S3_ATORDOANTE", N + 30, acao, dummy=no_golpe(p, 0.6), dummy_h=1.8); cams(sc, ref, (dx * 0.5, dy * 0.5 + 0.4, 1.1))
    chao = (p.x, p.y, 0.5); cen = (dm.location.x, dm.location.y, 0.5)
    # aviso no chao (cone de 4,5 m): losango de brilho vermelho que pulsa ate o golpe
    av = brilho_chao(col, "aviso", cen, 6, 3.6, "c", f - 8); av.scale = (1e-3,) * 3
    esc(av, [(5, 0.0), (10, 0.7), (f - 6, 1.0), (f - 1, 1.0), (f, 0.0)])
    trilha(col, "trilha_a", d, f - 22, f + 2, 0.30, 3.6)
    espinhos(col, "h_esp", p, f, 30, 2.2, "b", 0.06, 18); espinhos(col, "h_esp2", p, f, 14, 1.4, "o", 0.05, 22)
    clarao(col, "h_clarao", p, f, 4.4, "b", 20); brasas(col, "h_brasa", p, f, 44, 3.0, 2.6, (40, 80), "o", 0.18); lascas(col, "h_lasca", chao, f, 26, 0.22, 4.6, "pedra", (36, 56))
    fenda(col, "h_fenda", chao, f, 4.8, "o", 70, 0.2); fenda(col, "h_fenda2", chao, f + 3, 3.2, "c", 64, 1.7)
    onda(col, "h_onda", chao, f, 5.4, "o", 24); onda(col, "h_onda2", chao, f + 4, 3.6, "c", 22); onda(col, "h_onda3", chao, f + 8, 2.4, "g", 20)
    brilho_chao(col, "h_brilho", chao, f, 3.2, "o", 40)
    for k in range(5):                                                                          # lajes erguidas em leque
        a = -0.7 + k * 0.35; q = (chao[0] + math.sin(a) * 0.9 * U, chao[1] + math.cos(a) * 0.9 * U, 0.5)
        o = para_obj(col, "laje%d" % k, bm_laje(0.55 * U, 0.2 * U, random.uniform(0.9, 1.5) * U), M["pedra"]); o.location = q; o.rotation_euler = (math.radians(random.uniform(-28, -12)), 0, -a)
        esc(o, [(f - 1, (1e-3,) * 3), (f + 1, (1, 1, 0.2)), (f + 5, (1, 1, 1)), (f + 50, (1, 1, 1)), (f + 60, (1, 1, 1e-3))])
    luzf = luz(col, "h_luz", "POINT", (p.x, p.y, 1.2 * U), 0, (1.0, 0.45, 0.15)); pisca(luzf, [(f - 1, 0), (f, 4500), (f + 8, 1300), (f + 30, 400), (f + 56, 0)])
    # stun: o inimigo pula e fica atordoado ~1,8 s (86 quadros) com estrelas girando acima da cabeca
    l0 = dm.location.copy(); dm.keyframe_insert("location", frame=f - 1); dm.location = l0 + Vector((0, 0, 0.5 * U)); dm.keyframe_insert("location", frame=f + 6); dm.location = l0; dm.keyframe_insert("location", frame=f + 13)
    for k in range(4):
        o = sprite(col, "estrela_stun%d" % k, M["est_g"], 0.55 * U, (0, 0, 0)); T = int(1.8 * 48)
        for ff in list(range(f + 8, f + 8 + T, 3)) + [f + 8 + T]:
            t = (ff - f - 8) / 48.0; a = k * math.pi / 2 + t * 6.0; o.location = (l0.x + math.cos(a) * 0.5 * U, l0.y + math.sin(a) * 0.5 * U, 2.25 * U + 0.06 * U * math.sin(t * 9)); o.keyframe_insert("location", frame=ff)
        esc(o, [(f + 6, 0.0), (f + 10, 1.0), (f + 8 + T - 4, 1.0), (f + 8 + T, 0.0)])
    fim_cena(sc); return sc

# ================================================================== S4 REDEMOINHO DE ACO (nv 20): 5 voltas = 10 golpes cronometrados
def montar_redemoinho():
    random.seed(4)
    GRAUS_LOOP = 5 * 360 + 200                                                                     # 2000: a ultima volta devolve o personagem a mesma direcao do inicio (o clipe nativo gira 520)
    F_SPIN = 10.0                                                                        # quadro do clipe (48 fps) onde o giro ja esta a toda velocidade
    OMEGA = 14.0                                                                                  # graus por quadro (medido no clipe)
    LOOP = int(round(GRAUS_LOOP / OMEGA))
    partes = [dict(acao="W_SpAtk19_2HS", de=0, ate=F_SPIN, saida=int(F_SPIN) + 1), dict(acao="W_SpAtk19_2HS", de=F_SPIN, ate=F_SPIN, saida=LOOP, giro=lambda t: GRAUS_LOOP * t),
              dict(acao="W_SpAtk19_2HS", de=F_SPIN, ate=36.8, saida=int(36.8 - F_SPIN) + 1, giro=lambda t: float(GRAUS_LOOP)), dict(acao="W_SpAtk19_2HS", de=36.8, ate=36.8, saida=30, giro=lambda t: float(GRAUS_LOOP))]
    acao, fx = G.bake(BASE_ARM, "W_Redemoinho", partes, emenda=0)
    N = fx[-1][1]; d = dados_mundo(acao, N); ini_B, fim_B = fx[1]
    # angulo da ponta em volta do quadril, desenrolado; golpes = cada passagem a 90 e 270 graus (frente e costas), 10 passagens seguidas a partir do inicio do giro
    hip = [(Vector((0, 0, 0)))] * (N + 1); ang = {}; ult = None; acc = 0.0
    for f in range(1, N + 1):
        v = d[f][0] - d[f][2]; a = math.degrees(math.atan2(v.y, v.x))
        if ult is None: acc = a
        else: acc += (a - ult + 180) % 360 - 180
        ult = a; ang[f] = acc
    a0 = ang[ini_B]; k0 = math.ceil((a0 - 90.0) / 180.0 + 1e-9); alvos = [90.0 + (k0 + i) * 180.0 for i in range(10)]
    # as passagens podem ser no sentido crescente ou decrescente: o giro e para a esquerda (angulo cresce) no clipe nativo
    hits = []
    for al in alvos:
        for f in range(ini_B, N):
            if (ang[f] - al) * (ang[f + 1] - al) <= 0 and ang[f] != ang[f + 1]:
                hits.append(f + (al - ang[f]) / (ang[f + 1] - ang[f])); break
    print("REDEMOINHO quadros", N, "loop", LOOP, "golpes", len(hits), [round(h / 48.0, 3) for h in hits], "intervalos(s)", [round((hits[i + 1] - hits[i]) / 48.0, 3) for i in range(len(hits) - 1)])
    sc, col, ref, arm, esp, dm = cena("S4_REDEMOINHO", N + 30, acao, dummy=(0.0, 2.3), dummy_h=1.8); cams(sc, ref, (0, 0, 1.2), 1.55)
    dm2 = caixa(ref, "inimigo2", (-1.9 * U, -1.2 * U, 0.9 * U), (0.7 * U, 0.45 * U, 1.8 * U), M["ref_inimigo"]); dm3 = caixa(ref, "inimigo3", (1.8 * U, -1.6 * U, 0.9 * U), (0.7 * U, 0.45 * U, 1.8 * U), M["ref_inimigo"])
    trilha(col, "trilha_giro", d, ini_B - 6, fim_B + 8, 0.16, 3.4, 2)
    for i, h in enumerate(hits):
        f = int(round(h)); p = d[min(f, N)][0]; chao = (p.x, p.y, 0.5)
        espinhos(col, "g%d_esp" % i, p, f, 8, 1.1, "b", 0.04, 10); clarao(col, "g%d_clarao" % i, p, f, 1.6, "b", 10); brasas(col, "g%d_brasa" % i, p, f, 6, 1.6, 1.3, (26, 50), "o", 0.14)
        onda(col, "g%d_onda" % i, (0, 0, 0.5), f, 1.2 + 2.6 * 1.0, "o" if i % 2 == 0 else "c", 14, 0.6)
        lascas(col, "g%d_lasca" % i, chao, f, 3, 0.1, 2.6, "pedra", (22, 34))
        for j, dd in enumerate((dm, dm2, dm3)):                                                    # cada golpe sacode todos os inimigos no raio
            pass
    # inimigos sacodem a cada golpe
    for dd in (dm, dm2, dm3):
        l0 = dd.location.copy(); dd.keyframe_insert("location", frame=max(1, int(hits[0]) - 2))
        for i, h in enumerate(hits):
            f = int(round(h)); dd.location = l0 + Vector((0.12 * U * (-1) ** i, 0.1 * U, 0)); dd.keyframe_insert("location", frame=f); dd.location = l0; dd.keyframe_insert("location", frame=f + 4)
    brilho_chao(col, "area", (0, 0, 0.5), int(ini_B), 3.9, "c", int(fim_B - ini_B))
    fl = luz(col, "luz_giro", "POINT", (0, 0, 1.1 * U), 0, (1.0, 0.4, 0.15)); pisca(fl, [(int(ini_B) - 2, 0), (int(ini_B) + 6, 1500), (int(fim_B), 1500), (int(fim_B) + 10, 0)])
    brasas(col, "giro_brasa", (0, 0, 0.8 * U), int(ini_B), 70, 2.0, 3.2, (30, 60), "o", 0.15)
    fim_cena(sc); sc["hits_s"] = [round(h / 48.0, 3) for h in hits]; return sc

# ================================================================== S5 GRITO DE GUERRA (nv 25): buff em area
def bm_seta(s, esp):
    import bmesh; bm = bmesh.new(); pts = [(0, s), (s * .75, 0), (s * .28, 0), (s * .28, -s * .7), (-s * .28, -s * .7), (-s * .28, 0), (-s * .75, 0)]
    vs = [bm.verts.new((x, -esp / 2, z)) for x, z in pts]; bm.faces.new(vs); bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=esp); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
def montar_grito():
    random.seed(5)
    acao, fx = G.bake(BASE_ARM, "W_Grito", [dict(acao="W_AtkWait_2HS", de=0, ate=9, saida=16), dict(acao="W_SpAtk19_2HS", de=22.0, ate=36.8, saida=30, alinha=True), dict(acao="W_SpAtk19_2HS", de=36.8, ate=36.8, saida=70, alinha=True)], emenda=5)
    N = fx[-1][1]; d = dados_mundo(acao, N); F_GRITO = fx[1][1] - 4
    sc, col, ref, arm, esp, dm = cena("S5_GRITO", N + 24, acao, dummy=None); cams(sc, ref, (0, 0.5, 1.2), 1.3)
    aliados = [(-3.6, 2.8), (3.8, 2.4), (0.6, -4.0), (-3.4, -2.8)]
    for i, (x, y) in enumerate(aliados): caixa(ref, "aliado%d" % i, (x * U, y * U, 0.9 * U), (0.6 * U, 0.4 * U, 1.8 * U), M["ref_aliado"])
    # a espada pega fogo: linguas de chama (sprites) presas a lamina, do inicio do grito ate o fim
    for k in range(7):
        s = sprite(col, "chama%d" % k, M["est_o"], 2.6 * U * (1.0 - 0.07 * k), (0, 0, 0)); s.parent = esp; s.location = (4.0 + k * 5.2, 0, 0)
        esc(s, [(F_GRITO - 6 + k, 0.0), (F_GRITO - 1 + k, 1.0), (N - 4, 1.0), (N + 8, 0.0)])
        t = sprite(col, "chama_v%d" % k, M["leque_o"], 0.9 * U, (0, 0, 0), True, 1.5 * U); t.parent = esp; t.location = (4.0 + k * 5.2, 0, 0)
        esc(t, [(F_GRITO - 6 + k, 0.0), (F_GRITO - 1 + k, 1.0), (N - 4, 1.0), (N + 8, 0.0)])
    chao = (0, 0, 0.5)
    onda(col, "o1", chao, F_GRITO, 8.6, "o", 30); onda(col, "o2", chao, F_GRITO + 6, 6.0, "c", 28); onda(col, "o3", chao, F_GRITO + 12, 3.8, "g", 26)
    brilho_chao(col, "area", chao, F_GRITO, 8.4, "c", 70)
    fenda(col, "f1", chao, F_GRITO, 3.2, "c", 60, 0.3)
    coluna(col, "pilar_proprio", (0, 0, 0.5), F_GRITO, 7.5, 1.1, "coluna_c", 50, 200)
    brasas(col, "b_proprio", (0, 0, 0.8 * U), F_GRITO, 70, 3.4, 2.2, (40, 90), "o", 0.18)
    clarao(col, "clarao", (0, 0, 1.6 * U), F_GRITO, 4.5, "o", 24)
    for i, (x, y) in enumerate(aliados):                                                         # cada aliado no raio recebe a coluna e setas de bonus subindo
        fb = F_GRITO + 8 + i * 3; coluna(col, "pilar%d" % i, (x * U, y * U, 0.5), fb, 5.2, 0.7, "coluna_o", 52, 160)
        onda(col, "oa%d" % i, (x * U, y * U), fb, 2.2, "c", 20)
        for j in range(6):
            a0 = j * 2 * math.pi / 6 + i; ff = fb + 6 + j * 6; o = para_obj(col, "seta%d_%d" % (i, j), bm_seta(0.2 * U, 0.04 * U), M["em_c"])
            for rep in range(2):
                f0 = ff + rep * 36
                for f in list(range(f0, f0 + 34, 3)) + [f0 + 34]:
                    t = (f - f0) / 34; a = a0 + t * 1.1; o.location = (x * U + math.cos(a) * 0.8 * U, y * U + math.sin(a) * 0.8 * U, 0.1 * U + 2.6 * U * t); o.rotation_euler = (0, 0, a + math.pi / 2); o.scale = (max(math.sin(t * math.pi), 1e-4),) * 3
                    o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
        ic = para_obj(col, "icone%d" % i, bm_seta(0.3 * U, 0.06 * U), M["em_g"]); ic.location = (x * U, y * U, 2.5 * U); esc(ic, [(fb + 8, 0.0), (fb + 16, 1.0), (F_GRITO + 90, 1.0), (F_GRITO + 100, 0.0)]); anim(ic, "rotation_euler", fb + 8, F_GRITO + 100, lambda t: (0, 0, t * math.radians(360)), 6)
        brasas(col, "ba%d" % i, (x * U, y * U, 0.5 * U), fb, 18, 2.4, 1.0, (34, 70), "o", 0.14)
    fl = luz(col, "luz", "POINT", (0, 0, 2.0 * U), 0, (1.0, 0.35, 0.12)); pisca(fl, [(F_GRITO - 1, 0), (F_GRITO + 3, 4500), (F_GRITO + 30, 2000), (F_GRITO + 90, 900), (F_GRITO + 110, 0)])
    fim_cena(sc); return sc

# ================================================================== S6 FURIA DO DRAGAO (nv 30): corte ascendente que lanca, salto e pancada com a lamina gigante
def montar_furia():
    random.seed(6)
    acao, fx = G.bake(BASE_ARM, "W_Furia", [dict(acao="W_SpAtk11_2HS", de=0, ate=30, saida=31), dict(acao="W_SpAtk03_2HS", de=0, ate=86, saida=87, alinha=True), dict(acao="W_SpAtk03_2HS", de=86, ate=86, saida=60, alinha=True)], emenda=6)
    N = fx[-1][1]; d = dados_mundo(acao, N); f_up = pico(d, 1, fx[0][1]); f_sl = pico(d, fx[1][0], fx[1][1]); print("FURIA subida f", f_up, "pancada f", f_sl, "total", N)
    pu = d[f_up][0]; ps = d[f_sl][0]
    # o personagem salta ate o inimigo: o inimigo fica onde o corte ascendente o pega; a pancada acontece em cima dele (translacao do personagem no ar)
    alvo = Vector((pu.x, pu.y + 0.4 * U, 0))
    desl = Vector((alvo.x - ps.x, alvo.y - ps.y, 0))
    sc, col, ref, arm, esp, dm = cena("S6_FURIA", N + 30, acao, dummy=(alvo.x / U, alvo.y / U), dummy_h=1.8); cams(sc, ref, (alvo.x / U * 0.5, alvo.y / U * 0.5 + 0.8, 1.4), 1.25)
    ini_sl = fx[1][0]; ar = ini_sl + 22                                                          # comeca a deslocar quando a pose de agachar passa
    arm.location = (0, 0, 0); arm.keyframe_insert("location", frame=ini_sl + 4); arm.keyframe_insert("location", frame=ini_sl + 16)
    arm.location = (desl.x, desl.y, 0); arm.keyframe_insert("location", frame=f_sl - 6); arm.keyframe_insert("location", frame=N + 30)
    def Rp(p): return Vector((p.x + desl.x, p.y + desl.y, p.z))
    # inimigo: sobe com o corte ascendente, fica no ar e cai com a pancada
    l0 = dm.location.copy(); dm.keyframe_insert("location", frame=f_up - 1)
    dm.location = l0 + Vector((0, 0, 3.2 * U)); dm.keyframe_insert("location", frame=f_up + 20); dm.location = l0 + Vector((0, 0, 3.5 * U)); dm.keyframe_insert("location", frame=f_sl - 6)
    dm.location = l0; dm.keyframe_insert("location", frame=f_sl + 1)
    dm.rotation_euler = (0, 0, 0); dm.keyframe_insert("rotation_euler", frame=f_up - 1); dm.rotation_euler = (math.radians(70), 0, math.radians(25)); dm.keyframe_insert("rotation_euler", frame=f_sl - 6); dm.rotation_euler = (0, 0, 0); dm.keyframe_insert("rotation_euler", frame=f_sl + 14)
    # --- corte ascendente
    trilha(col, "trilha_up", d, f_up - 10, f_up + 4, 0.3, 3.6)
    espinhos(col, "u_esp", pu, f_up, 18, 1.5, "b", 0.05, 16); clarao(col, "u_clarao", pu, f_up, 2.8, "b", 16); brasas(col, "u_brasa", pu, f_up, 24, 2.8, 1.6, (36, 70), "o", 0.16)
    fenda(col, "u_fenda", (alvo.x, alvo.y, 0.5), f_up, 2.4, "o", 28, 0.9); onda(col, "u_onda", (alvo.x, alvo.y, 0.5), f_up, 3.0, "o", 18)
    # --- lamina gigante de energia (presa a espada, cresce ate a pancada)
    import bmesh
    LG = 6.5 * U; lam = para_obj(col, "lamina_gigante", bm_lamina_energia(LG, 0.9 * U, 0.07 * U), M["veios"]); lam.parent = esp; lam.location = (BASEX(), 0, 0); lam.rotation_euler = (0, math.pi / 2, 0)
    lam2 = para_obj(col, "lamina_halo", bm_lamina_energia(LG * 1.04, 1.5 * U, 0.14 * U), M["coluna_c"]); lam2.parent = esp; lam2.location = (BASEX(), 0, 0); lam2.rotation_euler = (0, math.pi / 2, 0)
    for l in (lam, lam2):
        esc(l, [(ini_sl + 14, (1, 1, 1e-3)), (ini_sl + 26, (1, 1, 0.35)), (f_sl - 8, (1, 1, 1.0)), (f_sl + 20, (1, 1, 1.0)), (f_sl + 32, (1, 1, 0.1)), (f_sl + 34, (1e-3,) * 3)])
    # --- pancada: tudo estoura
    f = f_sl; pp = Rp(ps); ch = (alvo.x, alvo.y, 0.5)
    espinhos(col, "s_esp", pp, f, 40, 3.0, "b", 0.07, 20); espinhos(col, "s_esp2", pp, f, 18, 2.0, "o", 0.06, 24); clarao(col, "s_clarao", pp, f, 7.0, "b", 26); clarao(col, "s_clarao2", pp, f + 2, 4.0, "o", 30)
    fenda(col, "s_fenda", ch, f, 9.0, "o", 80, 0.0); fenda(col, "s_fenda2", ch, f + 3, 6.0, "c", 74, 1.1)
    onda(col, "s_onda", ch, f, 9.6, "o", 28); onda(col, "s_onda2", ch, f + 5, 6.6, "c", 26); onda(col, "s_onda3", ch, f + 10, 4.0, "g", 24)
    brilho_chao(col, "s_brilho", ch, f, 6.5, "o", 60)
    lascas(col, "s_lasca", ch, f, 44, 0.26, 6.0, "pedra", (40, 70)); brasas(col, "s_brasa", pp, f, 90, 4.2, 3.4, (46, 100), "o", 0.2)
    dirf = Vector((0, 1, 0))
    for k in range(7):                                                                           # colunas de fogo e luz em linha para a frente (o golpe continua alem da lamina)
        q = (ch[0] + dirf.x * (1.4 + k * 1.5) * U, ch[1] + dirf.y * (1.4 + k * 1.5) * U, 0.5); fk = f + 3 + k * 3
        coluna(col, "s_col%d" % k, q, fk, 6.0 + (k % 2) * 1.5, 0.75, "coluna_c" if k % 2 else "coluna_o", 34, 140); onda(col, "s_cw%d" % k, q, fk, 2.0, "o", 14); fenda(col, "s_cf%d" % k, q, fk, 1.8, "o", 40, k)
    coluna(col, "s_col_centro", ch, f, 10.0, 1.8, "coluna_o", 40, 220)
    luzf = luz(col, "s_luz", "POINT", (ch[0], ch[1], 2.0 * U), 0, (1.0, 0.4, 0.12)); pisca(luzf, [(f - 1, 0), (f, 9000), (f + 8, 3500), (f + 40, 900), (f + 70, 0)])
    fim_cena(sc); return sc
def BASEX(): return 0.55 * float(G.BASE["ponta_local"].x)                                         # comeca a lamina gigante no meio da lamina real

CENAS = [("BASICO", montar_basico), ("S1_PODEROSO", montar_poderoso), ("S3_ATORDOANTE", montar_atordoante), ("S4_REDEMOINHO", montar_redemoinho), ("S5_GRITO", montar_grito), ("S6_FURIA", montar_furia)]
cenas = []
for nome, fn in CENAS:
    if ONLY and ONLY not in nome: continue
    cenas.append(fn()); print("cena pronta", nome, len(cenas[-1].objects), "objetos")
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
