"""Guerreiro (Humano M, Dragon Slayer 2 maos): 7 skills NOVAS (N0 dash + N1..N6; a Sede de Sangue entrou na N2 Massacre), cada uma numa cena, com o personagem do L2 e um Orc do L2 como alvo.
Rodar sem janela:  blender -b prototipo/assets/personagens/guerreiro_base.blend --python prototipo/tools/blender_fx/build_guerreiro_novas.py
48 fps. Frente do guerreiro = +Y. Efeitos no padrao estilo-fx-refinado (Optical Lens Flare em todas) + glow de pos-processo (bloom + raios).
Movimento: pausa de impacto (hit-stop), tremor de camera, passos de avanco nos golpes, imagens residuais e contorno de energia no corpo."""
import bpy, math, random, os, sys
from mathutils import Vector
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
import importlib
import guerreiro_clips as G
import guerreiro_fx as X
import guerreiro_fx2 as F
importlib.reload(X); importlib.reload(F)
from guerreiro_fx import U, M, esc, anim, luz, pisca, camera, para_obj, sprite, espinhos, onda, fenda, brilho_chao, lascas, brasas
from guerreiro_fx2 import trilha_glow, flare, flare_vivo, veu, selo, faixa_chao, converge, absorve, estrelas_stun, aura_lamina, lajes_erguem, balistico, fantasmas, contorno, tremor, linhas_vento, sombras_espada

PREF = "GUERREIRO_"; YAW = math.pi; GRAV = 22.0                                   # gravidade de jogo (m/s2), a mesma do Arqueiro
ORC_GLB = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "orc_m.glb"))
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
ONLY = os.environ.get("GW_ONLY", "")
G.iniciar_base(); X.init_materiais(); F.init2(); F.troca_pedras(); BASE_ARM = G.BASE["arm"]; BASE_ESP = G.BASE["espada"]
PL = G.BASE["ponta_local"]; PONTA_X = float(PL.x)
PEITO = next((b for b in G.BASE["ossos"] if "spine2" in b.lower()), "Bip01")
def LEN(nome): return float(bpy.data.actions[nome].frame_range[1])
CARM = (0.9, 0.08, 0.02); OURO = (1.0, 0.62, 0.15); SANGUE = (0.55, 0.0, 0.01); BRASA = (1.0, 0.35, 0.05)

# ------------------------------------------------------------------ Orc do L2 (alvo)
def importa_orc():
    sc = G.BASE["sc"]; sc.render.fps = 48
    n0 = set(bpy.data.objects.keys()); a0 = set(bpy.data.actions.keys())
    bpy.ops.import_scene.gltf(filepath=ORC_GLB)
    for n in [n for n in bpy.data.objects.keys() if n not in n0]:
        o = bpy.data.objects[n]
        if o.type == "MESH" and o.parent is None: bpy.data.objects.remove(o, do_unlink=True)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE" and o.name.startswith("ORC")); arm.animation_data_clear()
    for n in bpy.data.actions.keys():
        if n not in a0: bpy.data.actions[n].use_fake_user = True
    return arm, [o for o in bpy.data.objects if o.parent == arm and o.type == "MESH"]
ORC, ORC_CORPO = importa_orc()
ORC_ACT = {k: next((n for n in bpy.data.actions.keys() if n == k or n.startswith(k + ".")), None) for k in ("idle", "slash1", "slash2", "death", "guard")}

def orc(col, tag, loc, clipes, yaw=0.0):
    """clipes: lista de (nome, quadro_inicio); cada clipe toca ate o proximo comecar (idle repete); o ultimo segura o fim.
    O orc do glb olha para -X: +90 graus = olha para -Y (para o guerreiro). Giro ZXY: vira para o guerreiro e depois inclina para tras."""
    yaw = yaw + math.pi / 2
    a = ORC.copy(); a.name = tag + "_orc"; a.animation_data_clear(); col.objects.link(a)
    a.location = loc; a.rotation_mode = "ZXY"; a.rotation_euler = (0, 0, yaw); a["yaw0"] = yaw
    for m in ORC_CORPO:
        m2 = m.copy(); m2.name = tag + "_" + m.name; m2.parent = a; m2.matrix_parent_inverse = m.matrix_parent_inverse.copy()
        for mod in m2.modifiers:
            if mod.type == "ARMATURE": mod.object = a
        col.objects.link(m2)
    ad = a.animation_data_create(); tr = ad.nla_tracks.new(); tr.name = "clipes"
    for i, (nome, ini) in enumerate(clipes):
        act = bpy.data.actions[ORC_ACT[nome]]; L = act.frame_range[1] - act.frame_range[0]
        st = tr.strips.new("%s_%d" % (nome, i), int(ini), act)
        try: st.action_slot = act.slots[0]
        except Exception: pass
        if i + 1 < len(clipes):
            gap = int(clipes[i + 1][1]) - int(ini) - 0.05
            if nome == "idle": st.repeat = max(gap / L, 0.05)
            elif gap < L: st.action_frame_end = st.action_frame_start + gap
        if nome == "death": st.scale = 0.45
        st.extrapolation = "HOLD_FORWARD" if i == len(clipes) - 1 else "NOTHING"
    tr.strips[0].extrapolation = "HOLD"
    return a

# ------------------------------------------------------------------ comum
def R(p): return Vector((-p.x, -p.y, p.z))
def dados_mundo(acao, n):
    """{quadro: (ponta, 64% da lamina, quadril, peito)} no mundo, guerreiro virado para +Y (sem o deslocamento do objeto)"""
    G.usa_acao(BASE_ARM, acao.name); sc = G.BASE["sc"]; out = {}
    for f in range(1, n + 1):
        sc.frame_set(f); sc.view_layers[0].update(); dg = sc.view_layers[0].depsgraph; Mw = BASE_ESP.evaluated_get(dg).matrix_world
        out[f] = (R(Mw @ PL), R(Mw @ (PL * 0.64)), R(BASE_ARM.matrix_world @ BASE_ARM.pose.bones["Bip01"].head), R(BASE_ARM.matrix_world @ BASE_ARM.pose.bones[PEITO].head))
    return out
def desloca(d, fn): return {f: tuple(v + fn(f) for v in vals) for f, vals in d.items()}
def pico(d, a, b):
    """quadro do golpe: lamina rapida E passando pela frente do guerreiro (+Y)"""
    def nota(f):
        v = d[f][0] - d[f][2]; v.z = 0; fr = max(0.0, v.normalized().y) if v.length > 1e-3 else 0.0
        return (d[f][0] - d[f - 1][0]).length * fr ** 2
    return max(range(a + 1, b + 1), key=nota)
def pico_rapido(d, a, b): return max(range(a + 1, b + 1), key=lambda f: (d[f][0] - d[f - 1][0]).length)
def frente(p, extra=0.45):
    v = Vector((p.x, p.y, 0)); n = v.normalized() if v.length > 1e-3 else Vector((0, 1, 0)); return (p.x / U + n.x * extra, p.y / U + n.y * extra)
def pausas(acao, N, lista):
    """hit-stop: aplica as pausas [(quadro, n)] na acao; devolve (N novo, mv(quadro antigo)->novo, dados novos)"""
    for f, n in sorted(lista, reverse=True): F.hitstop(acao, f, n)
    def mv(f): return f + sum(n for fs, n in lista if f > fs)
    N2 = mv(N); return N2, mv, dados_mundo(acao, N2)
def cena(nome, fim, acao):
    sc, col, ref = X.nova_cena(PREF + nome, fim)
    import bmesh
    plano = bpy.data.meshes.new("GW_chao"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30 * U / 2); bm.to_mesh(plano); bm.free(); plano.materials.append(M["ref_chao"])
    ref.objects.link(bpy.data.objects.new("chao", plano))
    luz(ref, "sol", "SUN", (0, 0, 10 * U), 1.0, (1.0, 0.92, 0.85)).rotation_euler = (math.radians(50), 0, math.radians(35))
    luz(ref, "luz_fria", "SUN", (0, 0, 10 * U), 0.35, (0.55, 0.65, 1.0)).rotation_euler = (math.radians(60), 0, math.radians(-120))
    arm, esp = G.clonar(col, nome, (0, 0, 0), YAW); arm.animation_data.action = acao
    if arm.animation_data.action_slot is None and len(acao.slots): arm.animation_data.action_slot = acao.slots[0]
    F.glow(sc)
    return sc, col, ref, arm, esp
def cams(sc, ref, alvo=(0, 1.8, 1.3), dist=1.0, alto=0.0, padrao="cam_do_guerreiro"):
    a = Vector(alvo) * U
    cs = {"cam_lateral": camera(sc, ref, "cam_lateral", (7.5 * U * dist, alvo[1] * U, (2.0 + alto) * U), a, 34),
          "cam_alvo": camera(sc, ref, "cam_alvo", (3.4 * U * dist, (alvo[1] + 5.0 * dist) * U, (2.4 + alto) * U), a, 32),
          "cam_do_guerreiro": camera(sc, ref, "cam_do_guerreiro", (-2.6 * U * dist, (alvo[1] - 6.0 * dist) * U, (2.3 + alto) * U), a, 30)}
    sc.camera = cs[padrao]
def fim_cena(sc): X.retarget(sc)
def meta(sc, acao, N, hits, lg=0.0, **extra):
    """dados para o jogo (lidos por guerreiro_clips_export_novas.py): acao, quadros totais, quadros dos golpes, avanco em metros (feito por codigo no jogo)"""
    sc["gw_acao"] = acao.name; sc["gw_N"] = int(N); sc["gw_hits"] = [int(h) for h in hits]; sc["gw_lg"] = float(lg)
    for k, v in extra.items(): sc["gw_" + k] = v
def V(x, y, z=0.0): return Vector((x * U, y * U, z * U))
def anda_obj(o, quadros_pos):
    for f, p in quadros_pos: o.location = p; o.keyframe_insert("location", frame=f)
def gira_obj(o, quadros_rot):
    base = o.get("yaw0", o.rotation_euler.z)
    for f, r in quadros_rot: o.rotation_euler = (math.radians(r[0]), math.radians(r[1]), base + math.radians(r[2])); o.keyframe_insert("rotation_euler", frame=f)
def suave(t): t = min(max(t, 0.0), 1.0); return t * t * (3 - 2 * t)
def vertical(arm, peso):
    """retoque: gira so o encaixe da arma (osso Weapon_R_Bone) em volta da empunhadura ate a lamina ficar a 90 graus para baixo (peso 0..1)"""
    from mathutils import Matrix
    pb = arm.pose.bones["Weapon_R_Bone"]; Mw = arm.matrix_world; Wb = Mw @ pb.matrix
    b = (Wb.to_3x3() @ PL.normalized()).normalized(); alvo = Vector((0, 0, -1))
    frente = Mw.to_3x3() @ Vector((0, -1, 0))                                                  # frente do clipe = -Y do esqueleto
    if b.dot(frente) < 0.05 and b.z > -0.5: return                                          # lamina atras/acima do corpo: nao corrige (o giro passaria pelas costas)
    eixo = b.cross(alvo)
    if eixo.dot(frente.cross(Vector((0, 0, 1)))) < 0: return                                 # so gira descendo pela frente
    ang = b.angle(alvo) * peso
    if eixo.length < 1e-6 or ang < 1e-4: return
    h = Wb.translation; Rm = Matrix.Translation(h) @ Matrix.Rotation(ang, 4, eixo.normalized()) @ Matrix.Translation(-h)
    pb.matrix = Mw.inverted() @ Rm @ Wb; G.BASE["sc"].view_layers[0].update()
def horizontal(arm, peso):
    """retoque: gira so o encaixe da arma em volta da empunhadura ate a lamina ficar deitada (horizontal), mantendo a direcao para onde ela aponta"""
    from mathutils import Matrix
    pb = arm.pose.bones["Weapon_R_Bone"]; Mw = arm.matrix_world; Wb = Mw @ pb.matrix
    b = (Wb.to_3x3() @ PL.normalized()).normalized(); alvo = Vector((b.x, b.y, 0.0))
    if alvo.length < 1e-4: return
    alvo.normalize(); eixo = b.cross(alvo); ang = b.angle(alvo) * peso
    if eixo.length < 1e-6 or ang < 1e-4: return
    h = Wb.translation; Rm = Matrix.Translation(h) @ Matrix.Rotation(ang, 4, eixo.normalized()) @ Matrix.Translation(-h)
    pb.matrix = Mw.inverted() @ Rm @ Wb; G.BASE["sc"].view_layers[0].update()
def impacto(sc, col, nome, p, f, nivel=1, cor="b", luz_cor=(1.0, 0.5, 0.2)):
    """impacto padrao em 3 niveis: flare em camadas + nucleo, faiscas finas, brasas, luz, tremor. Nada no chao (quebra de chao so onde a espada bate nele)"""
    tam, nf, tr, td = {1: (1.6, 6, 0.05, 7), 2: (2.8, 10, 0.11, 11), 3: (4.4, 16, 0.2, 16)}[nivel]
    flare(col, nome, p, f, tam, cor, 14 + 6 * nivel); flare(col, nome + "_n", p, f, tam * 0.4, "b", 8 + 2 * nivel, largo=False)
    espinhos(col, nome + "_e", p, f, nf, 0.45 + 0.3 * nivel, "b", 0.022, 12)
    brasas(col, nome + "_br", p, f, nf + 6, 1.4 + 0.5 * nivel, 1.0 + 0.6 * nivel, (24, 44 + 10 * nivel), "o", 0.11)
    lz = luz(col, nome + "_luz", "POINT", tuple(p), 0, luz_cor); lz.data.use_shadow = False; pisca(lz, [(f - 1, 0), (f, 900 * nivel), (f + 6, 300 * nivel), (f + 14 + 4 * nivel, 0)])
    tremor(sc, f, tr, td, nivel)

# ================================================================== N0 INVESTIDA RELAMPAGO (dash): 7,5 m em 0,45 s atravessando o alvo; o corte explode depois que ele passou
def montar_dash():
    random.seed(10); L18 = LEN("W_SpAtk18_2HS")
    acao, fx = G.bake(BASE_ARM, "W_N0_Dash", [dict(acao="W_AtkWait_2HS", de=0, ate=12, saida=13), dict(acao="W_SpAtk18_2HS", de=0, ate=L18, saida=int(L18 / 1.15) + 1, alinha=True),
                     dict(acao="W_SpAtk18_2HS", de=L18, ate=L18, saida=56, alinha=True)], emenda=3)
    N = fx[-1][1]; d0 = dados_mundo(acao, N); P = pico_rapido(d0, fx[1][0], fx[1][1])
    N, mv, d0 = pausas(acao, N, [(P, 5)]); PS = P + 5                                     # pausa de impacto no corte
    A0, A1, A2 = P - 12, P, PS + 10                                                       # arrancada -> corte -> freada
    D1, D2 = 5.4, 7.6
    def corpo(f):
        if f <= A0: return V(0, 0)
        if f <= A1: t = (f - A0) / (A1 - A0); return V(0, D1 * (t ** 1.6))                  # acelera
        if f <= PS: return V(0, D1)
        if f <= A2: t = (f - PS) / (A2 - PS); return V(0, D1 + (D2 - D1) * (1 - (1 - t) ** 2.4))   # freia
        return V(0, D2)
    for f, p in [(f, corpo(f)) for f in range(1, N + 1)]: pass
    d = desloca(d0, corpo); p = d[P][0]; OX, OY = p.x / U + 0.15, p.y / U + 0.25
    print("DASH corte", P, "pausa ate", PS, "total", N)
    sc, col, ref, arm, esp = cena("N0_DASH", N + 30, acao); cams(sc, ref, (0, 4.8, 1.1), 1.55, 0.3, "cam_lateral")
    anda_obj(arm, [(f, corpo(f)) for f in range(1, N + 1)])
    o = orc(col, "N0", V(OX, OY), [("idle", 1), ("death", PS + 18)], yaw=math.atan2(-OX, OY))
    # arrancada: poeira, lascas para tras, flare baixo nos pes
    flare(col, "arranca", V(0, 0.2, 0.25), A0 + 2, 1.6, "o", 12); lascas(col, "arranca_l", (0, -0.3 * U, 0.5), A0 + 1, 8, 0.1, 2.4)
    # imagens residuais ao longo do caminho, linhas de velocidade, rastro queimado no chao
    fantasmas(col, "eco", arm, esp, list(range(A0 + 6, PS + 6, 2)), CARM, 12, 0.55)
    linhas_vento(col, "vento", V(0, 0.2, 0), V(0, D2, 0), A0 + 2, 16, "b", (0.3, 2.0), 12)
    rastro = faixa_chao(col, "rastro", (0, D2 / 2 * U), math.pi / 2, D2 * U, 0.7 * U, M["fll_c"], 0.38)
    esc(rastro, [(A0, (1e-3, 1, 1)), (A1, (0.75, 1, 1)), (A2, (1, 1, 1)), (A2 + 30, (1, 0.6, 1)), (A2 + 44, (1, 1e-3, 1))])
    contorno(col, "aura_dash", arm, [(A0, 0.0), (A0 + 3, 0.8), (A2, 0.6), (A2 + 14, 0.0)], CARM, 3.6, 0.02)
    trilha_glow(col, "tr", d, P - 9, P + 2, 0.24, 3.4)
    # o corte: linha fina de luz atravessa o orc na pausa; 18 quadros depois explode
    pc = V(OX, OY, 1.25)
    corte = sprite(col, "corte_linha", M["fll_b"], 3.4 * U, tuple(pc), alto=0.22 * U); esc(corte, [(P - 1, 0.0), (P, 1.0), (PS + 14, 0.85), (PS + 18, 1.4), (PS + 22, 0.0)])
    flare(col, "corte_fl", pc, P, 1.4, "b", 10, largo=False); tremor(sc, P, 0.06, 6, 1)
    impacto(sc, col, "explode", pc, PS + 18, 3, "c")
    veu(col, "explode_veu", (pc.x, pc.y, 0.3), PS + 18, 0.5, 3.6, "veu_c", 10, 12, 0.7, 6, 3)
    for k in range(6):
        a = random.uniform(0, 6.28); q = pc + Vector((math.cos(a) * 0.4 * U, math.sin(a) * 0.4 * U, random.uniform(-0.4, 0.5) * U)); s = sprite(col, "estilhaco%d" % k, M["los_c"], 0.5 * U, tuple(q))
        anda_obj(s, [(PS + 18, q), (PS + 34, q + Vector((math.cos(a) * 1.6 * U, math.sin(a) * 1.6 * U, 1.2 * U)))]); esc(s, [(PS + 17, 0.0), (PS + 19, 1.0), (PS + 34, 0.0)])
    anda_obj(o, [(PS + 17, V(OX, OY)), (PS + 24, V(OX, OY + 0.6))]); gira_obj(o, [(P - 1, (0, 0, 0)), (P + 3, (-6, 0, 12)), (PS + 17, (-6, 0, 12)), (PS + 24, (-30, 0, -8))])
    meta(sc, acao, N, [P], D2)
    fim_cena(sc); return sc

# ================================================================== N1 CONTRA-GOLPE: guarda com janela de 0,4 s; aparou -> passo a frente e revide com stun (sem efeito no chao)
def montar_contra():
    random.seed(11); L7 = LEN("W_SpAtk07_2HS")
    acao, fx = G.bake(BASE_ARM, "W_N1_Contra", [dict(acao="W_AtkWait_2HS", de=0, ate=12, saida=13), dict(acao="W_SpAtk07_2HS", de=0, ate=L7, saida=12, alinha=True),
                     dict(acao="W_SpAtk07_2HS", de=L7, ate=L7, saida=30, alinha=True), dict(acao="W_Atk03_2HS", de=8, ate=66, saida=40, alinha=True), dict(acao="W_Atk03_2HS", de=66, ate=66, saida=44, alinha=True)], emenda=3)
    N = fx[-1][1]; d0 = dados_mundo(acao, N); g0 = fx[2][0]; FP = g0 + 14; FC = pico(d0, fx[3][0], fx[3][1])
    N, mv, d0 = pausas(acao, N, [(FP, 6), (FC, 7)]); C0 = mv(fx[3][0]); FC = mv(FC); print("CONTRA aparo", FP, "revide", FC, "total", N)
    def corpo(f): return V(0, 0.6 * suave((f - C0) / max(1, FC - C0)))
    d = desloca(d0, corpo)
    sc, col, ref, arm, esp = cena("N1_CONTRA", N + 30, acao); cams(sc, ref, (0, 1.2, 1.3))
    anda_obj(arm, [(f, corpo(f)) for f in range(C0 - 1, FC + 2)])
    OY = 1.95; Lsl = LEN(ORC_ACT["slash1"]); hit_orc = 0.42 * Lsl
    o = orc(col, "N1", V(0, OY), [("idle", 1), ("slash1", int(FP - hit_orc)), ("idle", int(FP - hit_orc + Lsl + 6))])
    gl = para_obj(col, "guarda_losango", X.bm_lamina_energia(1.9 * U, 1.1 * U, 0.02 * U), M["los_g"]); gl.location = (0, 0.75 * U, 0.25 * U)
    esc(gl, [(g0 - 1, (1e-3,) * 3), (g0 + 4, (1, 1, 1)), (FP - 1, (1, 1, 1)), (FP + 2, (1.25, 1.25, 1.25)), (FP + 8, (1e-3,) * 3)])
    flare(col, "guarda_brilho", d[g0 + 2][1], g0 + 2, 1.0, "g", 14, largo=False)
    contorno(col, "guarda_aura", arm, [(g0, 0.0), (g0 + 4, 0.35), (FP - 1, 0.35), (FP, 1.0), (FP + 16, 0.0)], OURO, 3.4, 0.02)
    pc = d[FP][1] + Vector((0, 0.15 * U, 0)); impacto(sc, col, "aparo", pc, FP, 2, "g", (1.0, 0.75, 0.35))
    trilha_glow(col, "trilha_rev", d, FC - 14, FC + 3, 0.26, 3.6)
    sombras_espada(col, "sombra", arm, esp, FC - 14, FC + 2, 1, CARM, 12, 0.55)
    fantasmas(col, "eco", arm, esp, [FC - 6, FC - 3], CARM, 12, 0.5)
    impacto(sc, col, "rev", V(0, OY + 0.15, 1.25), FC, 3, "c")
    l0 = V(0, OY)
    anda_obj(o, [(FP - 1, l0), (FP + 7, l0 + V(0, 0.4)), (FC - 1, l0 + V(0, 0.4)), (FC + 6, l0 + V(0, 2.0, 0.4)), (FC + 12, l0 + V(0, 2.4)), (FC + 16, l0 + V(0, 2.5))])
    gira_obj(o, [(FP - 1, (0, 0, 0)), (FP + 4, (-12, 0, 0)), (FP + 16, (0, 0, 0)), (FC - 1, (0, 0, 0)), (FC + 5, (-26, 0, 8)), (FC + 16, (0, 0, 4))])
    estrelas_stun(col, "stun", lambda f: l0 + V(0, 2.5), FC + 14, 72)
    meta(sc, acao, N, [FC], 0.6, guarda=[int(g0), int(FP)])
    fim_cena(sc); return sc

# ================================================================== N2 TUFAO + SEDE DE SANGUE (estilo Cabal): 9 voltas violentas em ~3,2 s avancando como um tornado;
# cada passagem pela frente acerta, puxa o inimigo para dentro e rouba vida; termina numa explosao que joga todos longe
def montar_massacre():
    random.seed(12)
    F_SPIN = 10.0; OMEGA = 22.0; VOLTAS = 9; GRAUS = VOLTAS * 360 + 200; LOOP = int(round(GRAUS / OMEGA))
    balanco = lambda t: 9.0 * math.sin(t * 2 * math.pi * 4.5) * (0.4 + 0.6 * math.sin(math.pi * t))      # tronco jogando para tras/frente (violencia)
    partes = [dict(acao="W_AtkWait_2HS", de=0, ate=8, saida=9),
              dict(acao="W_SpAtk19_2HS", de=0, ate=F_SPIN, saida=int(F_SPIN) + 1, alinha=True, retoque=lambda a, t: horizontal(a, suave(t))),
              dict(acao="W_SpAtk19_2HS", de=F_SPIN, ate=F_SPIN, saida=LOOP, giro=lambda t: GRAUS * (t ** 1.08), inclina=balanco, retoque=lambda a, t: horizontal(a, 1.0)),   # lamina deitada no giro
              dict(acao="W_SpAtk19_2HS", de=F_SPIN, ate=36.8, saida=int(36.8 - F_SPIN) + 1, giro=lambda t: float(GRAUS), retoque=lambda a, t: horizontal(a, 1.0 - suave(t))),
              dict(acao="W_SpAtk19_2HS", de=36.8, ate=36.8, saida=50, giro=lambda t: float(GRAUS))]
    acao, fx = G.bake(BASE_ARM, "W_N2_Tufao", partes, emenda=0)
    N = fx[-1][1]; s0, s1 = fx[2]; FE = fx[3][1]                                                      # giro: s0..s1; explosao final no fim da saida
    N, mv, d0 = pausas(acao, N, [(FE, 9)])
    ANDA = 0.0                                                                                     # gira no lugar; no jogo o jogador move o tufao com as setas/WASD
    def corpo(f): return V(0, ANDA * suave((f - s0) / max(1, s1 - s0)))
    d = desloca(d0, corpo)
    # golpes = cada vez que a ponta passa pela frente (+Y) em volta do quadril
    ang = {}; ult = None; acc = 0.0
    for f in range(1, N + 1):
        v = d[f][0] - d[f][2]; a = math.degrees(math.atan2(v.y, v.x))
        acc = a if ult is None else acc + (a - ult + 180) % 360 - 180; ult = a; ang[f] = acc
    hits = []; alvo = (math.floor((ang[s0] - 90) / 360) + 1) * 360 + 90; sent = 1 if ang[s1] > ang[s0] else -1
    if sent < 0: alvo -= 360
    for f in range(s0, s1):
        if (ang[f] - alvo) * (ang[f + 1] - alvo) <= 0: hits.append(f); alvo += 360 * sent
    print("TUFAO giro", s0, s1, "golpes", len(hits), hits, "explosao", FE, "total", N)
    sc, col, ref, arm, esp = cena("N2_MASSACRE", N + 30, acao); cams(sc, ref, (0, 1.6, 1.2), 1.45, 0.9)
    anda_obj(arm, [(f, corpo(f)) for f in range(1, N + 1, 2)] + [(N, corpo(N))])
    # orcs em volta do caminho do tornado
    base_orcs = [V(-1.6, 1.0), V(1.7, 1.2), V(0.1, 2.3)]
    orcs = [orc(col, "N2%d" % i, p, [("idle", 1 + i * 7)], yaw=math.atan2(-p.x, p.y - corpo(s0).y)) for i, p in enumerate(base_orcs)]
    posic = [[(1, p.copy())] for p in base_orcs]; atual = [p.copy() for p in base_orcs]
    # a lamina bebe e o corpo pulsa sangue; selo de sangue preso no corpo
    aura_lamina(col, "lamina_sangue", esp, 6, N, PONTA_X, "aura_s", 0.26, 0.04)
    selo(col, "postura", (0, 0), 6, FE + 10, 1.7, "s", 30).parent = arm
    # rastro do giro: trilha curta (so o ultimo pedaco da volta) + sombras da espada espacadas
    F.trilha_leve(col, "tr_giro", d, s0, s1 + 6, 0.04, 3.6)
    sombras_espada(col, "sombra", arm, esp, s0 + 2, s1, 2, CARM, 12, 0.65)
    F.vortice(col, "vortice", lambda f: corpo(f), s0, s1, 130, (0.9, 1.9), 14.0, "b", (1.0, 2.0), 2.6)
    F.vortice(col, "vortice_s", lambda f: corpo(f), s0 + 10, s1, 60, (0.6, 1.3), 18.0, "c", (0.8, 1.5), 2.0)
    fantasmas(col, "eco_giro", arm, esp, list(range(s0 + 6, s1, 26)), CARM, 10, 0.35)
    peito = {f: d[f][3] for f in d}; pulso = [(4, 0.0), (s0, 0.45)]
    for k, f in enumerate(hits):
        centro = corpo(f)
        i = min(range(3), key=lambda j: (atual[j] - d[f][0]).length)                              # o orc mais perto da lamina leva o golpe
        dist = (atual[i] - centro); dist.z = 0
        if dist.length > 2.6 * U: continue
        puxa = dist.normalized() * min(0.22 * U, max(0.0, dist.length - 1.25 * U))               # tornado puxa para dentro (ate 1,25 m do centro)
        posic[i].append((f - 1, atual[i].copy())); atual[i] = atual[i] - puxa; posic[i].append((f + 3, atual[i] + V(0.06 * (-1) ** k, 0, 0.12))); posic[i].append((f + 6, atual[i].copy()))
        p = atual[i] + V(0, 0, 1.3)
        impacto(sc, col, "h%d" % k, p, f, 1, "s" if k % 2 else "b", (1.0, 0.3, 0.1))
        cheg = absorve(col, "dreno%d" % k, p, peito, f + 1, 4, "c", 0.24, (14, 22), 3)
        fa = int(sum(cheg) / len(cheg)); flare(col, "bebe%d" % k, peito[min(fa, N)], fa, 0.9, "c", 10, largo=False)
        pulso += [(f, 0.75), (fa, 0.9), (fa + 6, 0.5)]
    # vento: linhas de velocidade e poeira em volta do tornado
    for k, f in enumerate(range(s0, s1, 14)):
        c = corpo(f); linhas_vento(col, "vento%d" % k, c + V(-1.2, -0.4), c + V(1.2, 0.4), f, 5, "b", (0.2, 2.2), 10)
        lascas(col, "poeira%d" % k, (c.x, c.y, 0.5), f, 3, 0.07, 2.6, "pedra2", (16, 26))
        brasas(col, "brasa%d" % k, c + V(0, 0, 0.6), f, 6, 2.2, 2.4, (20, 36), "o", 0.1)
    # explosao final: tudo voa para fora
    cf = corpo(FE) + V(0, 0, 1.1)
    impacto(sc, col, "explode", cf, FE, 3, "c"); flare(col, "explode_s", cf, FE + 2, 3.6, "s", 30, largo=False)
    fantasmas(col, "eco_final", arm, esp, [FE - 6, FE - 3], CARM, 16, 0.6)
    for i in range(3):
        dirv = (atual[i] - corpo(FE)); dirv.z = 0; dirv = dirv.normalized() if dirv.length > 1e-3 else Vector((0, 1, 0))
        fim = atual[i] + dirv * 2.4 * U
        posic[i] += [(FE - 1, atual[i].copy()), (FE + 6, atual[i] + dirv * 1.3 * U + V(0, 0, 0.6)), (FE + 14, fim)]
        anda_obj(orcs[i], posic[i])
        gira_obj(orcs[i], [(s0, (0, 0, 0))] + [(f + 2, (-8, 0, 25 * (-1) ** k)) for k, f in enumerate(hits[::3])] + [(FE - 1, (0, 0, 0)), (FE + 8, (-35, 0, 15)), (FE + 20, (0, 0, 10))])
        cheg = absorve(col, "dreno_fim%d" % i, atual[i] + V(0, 0, 1.3), peito, FE + 1, 8, "c", 0.32, (20, 30), 6)
        estrelas_stun(col, "stun%d" % i, (lambda ff, p=fim: p), FE + 16, 60)
    pulso += [(FE, 1.0), (FE + 30, 0.6)]
    contorno(col, "sangue_corpo", arm, pulso + [(N + 10, 0.0)], SANGUE, 4.2, 0.02)
    veu(col, "veu_cura", corpo(FE) + Vector((0, 0, 0.3)), FE + 22, 0.8, 2.4, "veuL_s", 18, 12, 0.88, 8, 5)
    meta(sc, acao, N, hits + [FE], 0.0)
    fim_cena(sc); return sc

# ================================================================== N3 MODO DE BATALHA (Cabal): concentra, corte para cima, a lamina INTEIRA acende e o corpo fica em brasa (sem colunas)
def montar_modo():
    random.seed(13); L7 = LEN("W_SpAtk07_2HS"); LW = LEN("W_AtkWait_2HS")
    acao, fx = G.bake(BASE_ARM, "W_N3_Modo", [dict(acao="W_AtkWait_2HS", de=0, ate=12, saida=13), dict(acao="W_SpAtk07_2HS", de=0, ate=L7, saida=14, alinha=True),
                     dict(acao="W_SpAtk07_2HS", de=L7, ate=L7, saida=46, alinha=True), dict(acao="W_SpAtk11_2HS", de=0, ate=30, saida=30, alinha=True),
                     dict(acao="W_SpAtk11_2HS", de=30, ate=30, saida=34, alinha=True), dict(acao="W_AtkWait_2HS", de=0, ate=LW, saida=int(LW) + 1, alinha=True), dict(acao="W_AtkWait_2HS", de=0, ate=LW, saida=int(LW) + 1, alinha=True)], emenda=6)
    N = fx[-1][1]; c0 = fx[2][0]; FB = fx[3][1] - 2
    N, mv, d = pausas(acao, N, [(FB, 8)]); print("MODO concentra", c0, "explode", FB, "total", N)
    sc, col, ref, arm, esp = cena("N3_MODO_BATALHA", N + 30, acao); cams(sc, ref, (0, 0.2, 1.4), 1.1)
    converge(col, "conc", {f: d[f][1] for f in d}, c0 - 6, FB, 40, 1.8, "o", 0.12)
    selo(col, "selo", (0, 0), c0, N, 2.6, "c", 20)
    # a lamina inteira: veios do cabo a ponta + halos ao longo dela (glow da lamina toda, nao so da ponta)
    aura_lamina(col, "carga_lamina", esp, c0, FB, PONTA_X, "aura_c", 0.22, 0.04)
    aura_lamina(col, "aura_lamina", esp, FB - 2, N, PONTA_X, "aura_c", 0.34, 0.04)
    pos = [0.18, 0.36, 0.54, 0.72, 0.90]
    for i, x in enumerate(pos):
        h = sprite(col, "carga_halo%d" % i, M["halo_o"], 0.9 * U, (PONTA_X * x, 0, 0)); h.parent = esp; esc(h, [(c0 - 1, 0.0), (c0 + 10 + i * 3, 0.35), (FB - 2, 0.9), (FB, 0.0)])
        flare(col, "explode%d" % i, (PONTA_X * x, 0, 0), FB, 2.4 if i == 2 else 1.5, "b" if i == 2 else "o", 26, largo=(i == 2), pai=esp)
        vivo = flare_vivo(col, "lamina_viva%d" % i, (PONTA_X * x, 0, 0), FB + 4, N, 0.9, "c", 0.3, pai=esp, entra=6 + i * 2)
    tremor(sc, FB, 0.18, 16, 3)
    lz = luz(col, "explode_luz", "POINT", tuple(d[FB][1]), 0, (1.0, 0.45, 0.15)); lz.data.use_shadow = False; pisca(lz, [(FB - 1, 0), (FB, 3600), (FB + 14, 900), (N, 600), (N + 10, 0)])
    pulso = [(c0, 0.0), (FB - 6, 0.3), (FB, 0.6), (FB + 12, 0.45)]
    f = FB + 12
    while f < N - 12: f += 14; pulso.append((f, 0.5 if (f // 14) % 2 else 0.75))
    contorno(col, "brasa_corpo", arm, pulso + [(N + 10, 0.0)], CARM, 2.6, 0.025)
    for k in range(0, N - FB, 18): brasas(col, "aura_br%d" % k, (0, 0, 0.4 * U), FB + k, 12, 2.8, 0.7, (40, 70), "o", 0.12)
    meta(sc, acao, N, [FB], 0.0)
    fim_cena(sc); return sc

# ================================================================== N4 EXECUCAO (estilo Cabal): arrancada ate o alvo marcado + 5 cortes encadeados (horizontal, volta, sobe, giro, vertical);
# cada corte deixa uma marca de luz no alvo; no golpe vertical final o mundo para e todas as marcas detonam juntas
def marca_corte(col, sc, nome, pos, vel, f, f_det, cor="c"):
    """linha de luz no alvo na direcao do corte (plano virado para a camera padrao, girado pelo sentido da lamina na tela); fica acesa ate detonar"""
    import bmesh
    from mathutils import Quaternion
    cam = sc.camera.location; zf = (cam - pos).normalized(); q = zf.to_track_quat("Z", "Y")
    dx, dy = q @ Vector((1, 0, 0)), q @ Vector((0, 1, 0)); ang = math.atan2(vel.dot(dy), vel.dot(dx))
    q = q @ Quaternion((0, 0, 1), ang)
    w, h = 2.6 * U, 0.3 * U; bm = bmesh.new(); uvl = bm.loops.layers.uv.verify()
    fc = bm.faces.new([bm.verts.new(p) for p in ((-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0))])
    for lp, uv in zip(fc.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): lp[uvl].uv = uv
    o = para_obj(col, nome, bm, M["fll_" + cor]); o.location = pos + zf * 0.25 * U; o.rotation_mode = "QUATERNION"; o.rotation_quaternion = q
    esc(o, [(f - 1, (1e-3, 1, 1)), (f, (0.6, 1.4, 1)), (f + 2, (1.0, 1.0, 1)), (f + 8, (0.9, 0.55, 1)), (f_det - 1, (0.9, 0.55, 1)), (f_det + 2, (1.5, 2.2, 1)), (f_det + 10, (1.7, 1e-3, 1))])
    return o

def montar_execucao():
    random.seed(14); L19 = LEN("W_SpAtk19_2HS")
    partes = [dict(acao="W_AtkWait_2HS", de=0, ate=8, saida=9),
              dict(acao="W_Atk01_2HS", de=4, ate=56, saida=26, alinha=True),                    # 1 horizontal (com a arrancada)
              dict(acao="W_Atk02_2HS", de=8, ate=56, saida=22, alinha=True),                    # 2 volta
              dict(acao="W_SpAtk11_2HS", de=0, ate=30, saida=22, alinha=True),                  # 3 sobe (levanta o alvo)
              dict(acao="W_SpAtk19_2HS", de=4, ate=L19, saida=32, alinha=True),                 # 4 giro com a espada
              dict(acao="W_SpAtk01_2HS", de=24, ate=43, saida=13, alinha=True, retoque=lambda a, t: vertical(a, 0.55 * suave(t))),   # 5 vertical final
              dict(acao="W_SpAtk01_2HS", de=43, ate=43, saida=60, alinha=True, retoque=lambda a, t: vertical(a, 0.55))]
    acao, fx = G.bake(BASE_ARM, "W_N4_Execucao", partes, emenda=3)
    N = fx[-1][1]; d0 = dados_mundo(acao, N)
    h0 = [pico(d0, fx[1][0], fx[1][1]), pico(d0, fx[2][0], fx[2][1]), pico_rapido(d0, fx[3][0], fx[3][1]), pico(d0, fx[4][0], fx[4][1])]
    c0, c1 = fx[5]; h0.append(next((f for f in range(c0, c1 + 1) if d0[f][0].z < 1.3 * U), c1))
    N, mv, d0 = pausas(acao, N, [(h0[0], 3), (h0[1], 3), (h0[2], 4), (h0[3], 4), (h0[4], 12)]); H = [mv(h) for h in h0]; FF = H[4]
    A0 = fx[1][0]
    def corpo(f): return V(0, 2.0 * suave((f - A0) / max(1, H[0] - 2 - A0)) + 0.4 * suave((f - H[3]) / max(1, FF - H[3])))   # arrancada de 2 m + passo no golpe final
    d = desloca(d0, corpo); print("EXECUCAO cortes", H, "total", N)
    qx = sum(d[f][2].x for f in H) / len(H) / U; qy = sum(d[f][2].y for f in H) / len(H) / U   # quadril real nos cortes (o clipe do L2 desloca o corpo)
    OX, OY = qx, qy + 1.35
    sc, col, ref, arm, esp = cena("N4_EXECUCAO", N + 40, acao); cams(sc, ref, (OX * 0.5, OY - 0.7, 1.3), 1.05)
    anda_obj(arm, [(f, corpo(f)) for f in range(1, N + 1, 2)] + [(N, corpo(N))])
    o = orc(col, "N4", V(OX, OY), [("idle", 1), ("death", FF + 12)], yaw=math.atan2(-OX, OY))
    peito = V(OX, OY, 1.3)
    # alvo marcado (pouca vida)
    flare_vivo(col, "marca", (OX * U, OY * U, 2.9 * U), 1, FF, 1.0, "c", 0.3)
    m2 = sprite(col, "marca_los", M["los_c"], 0.42 * U, (OX * U, OY * U, 2.9 * U)); esc(m2, [(0, 0.0), (8, 1.0), (FF - 1, 1.0), (FF + 3, 2.0), (FF + 8, 0.0)])
    # arrancada: ecos, linhas de velocidade, corpo acende
    fantasmas(col, "eco_arranca", arm, esp, list(range(A0 + 4, H[0] - 2, 3)), CARM, 12, 0.55)
    linhas_vento(col, "vento", V(0, 0.2), V(0, 2.2), A0 + 2, 8, "b", (0.4, 1.8), 10)
    contorno(col, "furia", arm, [(A0, 0.0), (A0 + 4, 0.6)] + [(h, 0.85) for h in H] + [(FF + 24, 0.0)], CARM, 3.2, 0.02)
    aura_lamina(col, "lamina", esp, A0, FF + 8, PONTA_X, "aura_c", 0.24, 0.04)
    # os 5 cortes: trilha, sombra da espada, impacto, marca no alvo
    for k, f in enumerate(H):
        final = k == 4
        trilha_glow(col, "tr%d" % k, d, f - (12 if k != 3 else 20), f + 2, 0.24, 3.4 if not final else 4.2)
        sombras_espada(col, "sombra%d" % k, arm, esp, f - (11 if k != 3 else 18), f + 1, 1 if final else 2, CARM, 12 if not final else 18, 0.5 if not final else 0.8)
        vel = d[f][0] - d[f - 1][0]
        marca_corte(col, sc, "marca_corte%d" % k, peito + V(random.uniform(-0.15, 0.15), 0, random.uniform(-0.25, 0.25)), vel, f, FF + 14, "c" if k % 2 else "o")
        if not final: impacto(sc, col, "h%d" % k, peito - V(0, 0.3), f, 1 if k < 2 else 2, "b")
    # golpe final: corte vertical de luz, pausa longa, depois as marcas detonam juntas
    lam = sprite(col, "corte_vertical", M["los_b"], 0.55 * U, (OX * U, OY * U, 0.0), vertical=True, alto=5.0 * U); esc(lam, [(FF - 1, (1e-3, 1, 1e-3)), (FF, (0.4, 1, 1.0)), (FF + 3, (1.0, 1, 1.0)), (FF + 18, (0.2, 1, 1.0)), (FF + 22, (1e-3, 1, 1e-3))])
    impacto(sc, col, "final", peito - V(0, 0.3), FF, 2, "b"); fantasmas(col, "eco_final", arm, esp, [FF - 6, FF - 3], CARM, 16, 0.6)
    impacto(sc, col, "detona", peito, FF + 14, 3, "c"); flare(col, "detona_c", peito, FF + 15, 3.4, "c", 32, largo=False)
    for k in range(10):
        a = random.uniform(0, 6.28); q = peito + Vector((math.cos(a) * 0.3 * U, math.sin(a) * 0.3 * U, random.uniform(-0.5, 0.6) * U)); s = sprite(col, "estilhaco%d" % k, M["los_c"], 0.45 * U, tuple(q))
        anda_obj(s, [(FF + 14, q), (FF + 30, q + Vector((math.cos(a) * 1.8 * U, math.sin(a) * 1.8 * U, 1.0 * U)))]); esc(s, [(FF + 13, 0.0), (FF + 15, 1.0), (FF + 30, 0.0)])
    # reacoes do orc: tranco a cada corte, sobe no 3o, gira no 4o, desaba no fim
    l0 = V(OX, OY)
    anda_obj(o, [(H[0] - 1, l0), (H[0] + 4, l0 + V(0, 0.2)), (H[1] + 4, l0 + V(0, 0.35)), (H[2] - 1, l0 + V(0, 0.35)), (H[2] + 8, l0 + V(0, 0.45, 0.7)),
                 (H[3] - 4, l0 + V(0, 0.5, 0.5)), (H[3] + 2, l0 + V(0, 0.55, 0.35)), (FF - 1, l0 + V(0, 0.55, 0.0)), (FF + 14, l0 + V(0, 0.55)), (FF + 20, l0 + V(0, 1.0))])
    gira_obj(o, [(H[0] - 1, (0, 0, 0)), (H[0] + 3, (-8, 0, -14)), (H[1] + 3, (-8, 0, 16)), (H[2] + 6, (-22, 0, 0)), (H[3] + 3, (-12, 0, 40)), (FF + 2, (-6, 0, 10)), (FF + 18, (-20, 0, 6))])
    meta(sc, acao, N, H, 2.4)
    fim_cena(sc); return sc

# ================================================================== N5 CORTE LANCADOR: crava na diagonal no pe do alvo, arranca a espada quebrando o chao em leque e lanca;
# 2 cortes no ar; desce cravando a espada 100% na vertical com as duas maos e quebra o chao
def montar_lancador():
    random.seed(15); INCL_L = float(os.environ.get("GW_INCL", "-16"))
    # a descida usa a MESMA direcao do corpo da versao aprovada (que vinha depois dos 2 cortes no ar): mede essa direcao montando a sequencia antiga so para medir
    _v, _ = G.bake(BASE_ARM, "W_N5_medida", [dict(acao="W_AtkWait_2HS", de=0, ate=8, saida=9), dict(acao="W_SpAtk01_2HS", de=22, ate=43, saida=14, alinha=True),
                     dict(acao="W_SpAtk01_2HS", de=43, ate=43, saida=10, alinha=True), dict(acao="W_SpAtk11_2HS", de=0, ate=30, saida=26, alinha=True),
                     dict(acao="W_Atk01_2HS", de=6, ate=56, saida=30, alinha=True), dict(acao="W_Atk02_2HS", de=6, ate=56, saida=30, alinha=True)], emenda=7)
    yw = list(G.BASE["yaws"]); GIRO_L = (yw[5] - yw[3] + 180) % 360 - 180; bpy.data.actions.remove(_v); print("LANCADOR giro da descida", round(GIRO_L, 1))                              # inclinacao do tronco na descida (negativo = para a frente)
    acao, fx = G.bake(BASE_ARM, "W_N5_Lancador", [dict(acao="W_AtkWait_2HS", de=0, ate=8, saida=9), dict(acao="W_SpAtk01_2HS", de=22, ate=43, saida=14, alinha=True),
                     dict(acao="W_SpAtk01_2HS", de=43, ate=43, saida=10, alinha=True), dict(acao="W_SpAtk11_2HS", de=0, ate=30, saida=26, alinha=True),
                     # 17/11/2026 (dono): sem os dois cortes no ar; o corte subindo emenda direto no corte descendo, espada fincada NA FRENTE
                     dict(acao="W_SpAtk01_2HS", de=43, ate=43, saida=14, alinha=True, giro=lambda t: GIRO_L, inclina=lambda t: INCL_L, retoque=lambda a, t: vertical(a, 1.0)),          # desce ja com a espada em pe NA FRENTE (ponta para baixo)
                     dict(acao="W_SpAtk01_2HS", de=43, ate=43, saida=44, alinha=True, giro=lambda t: GIRO_L, inclina=lambda t: INCL_L, retoque=lambda a, t: vertical(a, 1.0))], emenda=7)
    N = fx[-1][1]; d0 = dados_mundo(acao, N)
    h0 = [fx[1][1], pico_rapido(d0, fx[3][0], fx[3][1]), fx[4][1]]
    N, mv, d0 = pausas(acao, N, [(h0[0], 4), (h0[1], 4), (h0[2], 9)]); FP, FL, FD = [mv(h) for h in h0]
    J0 = FL + 4; ZA = 1.6; D0 = mv(fx[4][0]); H2 = D0                                           # H2 = topo do salto (inicio da descida)
    def corpo(f):
        if f <= J0: return V(0, 0)
        if f <= D0: t = (f - J0) / max(1, D0 - J0); return V(0, 0.7 * t, ZA * (1 - (1 - t) ** 2))
        if f <= FD: t = (f - D0) / max(1, FD - D0); return V(0, 0.7 + 0.4 * t, ZA * (1 - t * t))     # cai acelerando ate cravar
        return V(0, 1.1, 0)
    d = desloca(d0, corpo); print("LANCADOR crava", FP, "arranca", FL, "topo", D0, "desce", FD, "total", N)
    sc, col, ref, arm, esp = cena("N5_LANCADOR", N + 34, acao); cams(sc, ref, (0, 1.8, 1.6), 1.3, 0.6, "cam_lateral")
    anda_obj(arm, [(f, corpo(f)) for f in range(1, N + 1)])
    pf = d[FP][0]; OY = pf.y / U + 0.35                                                          # a ponta crava no pe do orc
    g = 9.0 * U; HC = 0.7 * U
    alvos = [(FL, 0.0), (H2, max(0.7 * U, d[H2][0].z - HC + 0.2 * U))]
    zs = {f: 0.0 for f in range(1, FL + 1)}
    for (fa, za), (fb, zb) in zip(alvos, alvos[1:]):
        T = (fb - fa) / 48.0; v = balistico(za, zb, T, g)
        for f in range(fa, fb + 1): t = (f - fa) / 48.0; zs[f] = za + v * t - 0.5 * g * t * t
    g = GRAV * U; z = zs[H2]; v = 2.0 * U; f = H2; quique = 0; FCH = H2 + 10
    while f < N + 34:                                                                            # depois do 2o corte o orc cai; a cravada faz ele quicar
        f += 1
        if f == FD: v = max(v, 4.5 * U); z = max(z, 0.01)
        z += v / 48.0; v -= g / 48.0
        if z <= 0:
            z = 0.0; v = 2.4 * U if quique == 0 else 0.0; quique += 1
            if quique == 1: FCH = f
        zs[f] = z
    ys = {f: OY * U + (0.9 * U * min(1, max(0, (f - FL) / (FD - FL)))) for f in zs}
    o = orc(col, "N5", V(0, OY), [("idle", 1), ("death", FCH - 4)])
    for f in sorted(zs):
        if f % 2 == 0 or f in (FL, H2, FD, FCH): o.location = (0, ys[f], zs[f]); o.keyframe_insert("location", frame=f)
    gira_obj(o, [(FL - 1, (0, 0, 0)), (FL + 12, (-25, 0, 0)), (H2 + 3, (-50, 0, 6)), (FCH, (-90, 0, 0))])
    # 1) crava na diagonal: faisca na ponta, rachadura comeca
    impacto(sc, col, "crava", pf, FP, 1, "o"); fenda(col, "crava_fenda", (pf.x, pf.y, 0.5), FP, 1.2, "o", 30, 0.2)
    sombras_espada(col, "sombra_crava", arm, esp, FP - 10, FP, 2, BRASA, 10, 0.5)
    # 2) arranca: o chao quebra em leque (cone para a frente) e o orc sobe
    leque_quebra(sc, col, "leque", Vector((pf.x, pf.y, 0)), FP + 4, FL, 50, 4.2)
    trilha_glow(col, "tr_sobe", d, FL - 10, FL + 4, 0.30, 3.6); impacto(sc, col, "sobe", d[FL][0], FL, 2, "o")
    sombras_espada(col, "sombra_sobe", arm, esp, FL - 10, FL + 2, 1, CARM, 12, 0.55)
    fantasmas(col, "eco_salto", arm, esp, [J0 + 2, J0 + 5, J0 + 8], CARM, 14, 0.5)
    # 3) desce cravando na vertical NA FRENTE: rastro do corpo e da espada, quebra de chao em estrela
    fantasmas(col, "eco_desce", arm, esp, [D0 + 3, (D0 + FD) // 2, FD - 2], CARM, 14, 0.55)
    sombras_espada(col, "sombra_desce", arm, esp, D0, FD, 1, CARM, 14, 0.6)
    pd = d[FD][0]; ch = Vector((pd.x, pd.y, 0))
    impacto(sc, col, "desce", pd + Vector((0, 0, 0.4 * U)), FD, 3, "b")
    estrela_quebra(sc, col, "estrela", ch, FD, 8)
    sc.frame_set(FD + 6); pb = arm.pose.bones; Mw = arm.matrix_world; fr = (Mw.to_3x3() @ Vector((0, -1, 0))).normalized(); fr.z = 0; fr.normalize()
    tipw = esp.matrix_world @ PL; pel = Mw @ pb["Bip01_Pelvis"].head; lado = fr.cross(Vector((0, 0, 1))); mao = Mw @ pb["Weapon_R_Bone"].head; print("LANCADOR ponta cravada: frente %.2f m lado %.2f m altura %.2f m | mao frente %.2f lado %.2f" % ((tipw - pel).dot(fr) / U, (tipw - pel).dot(lado) / U, tipw.z / U, (mao - pel).dot(fr) / U, (mao - pel).dot(lado) / U))
    meta(sc, acao, N, [FP, FL, FD], 1.1, salto=True)
    fim_cena(sc); return sc

# ================================================================== N6 FENDA SISMICA: crava a espada e a fenda (mais larga) corre 9 m para a frente
def montar_fenda():
    random.seed(16)
    acao, fx = G.bake(BASE_ARM, "W_N6_Fenda", [dict(acao="W_SpAtk01_2HS", de=0, ate=86, saida=87), dict(acao="W_SpAtk01_2HS", de=86, ate=86, saida=84)], emenda=0)
    N = fx[-1][1]; d0 = dados_mundo(acao, N); FI = pico(d0, 1, fx[0][1])
    N, mv, d = pausas(acao, N, [(FI, 7)]); p = d[FI][0]; FS = FI + 7; print("FENDA impacto", FI, "total", N)
    sc, col, ref, arm, esp = cena("N6_FENDA", N + 30, acao); cams(sc, ref, (0, 4.4, 0.9), 1.6, 0.7)
    COMP = 9.0; VEL = 15.0; y0 = p.y / U
    def chega(dist): return FS + int(round(dist / VEL * 48))
    orcs = [(-0.3, y0 + 3.4), (0.4, y0 + 6.4)]
    obs = [orc(col, "N6%d" % i, V(x, y), [("idle", 1 + i * 9)]) for i, (x, y) in enumerate(orcs)]
    impacto(sc, col, "crava", p, FI, 2, "b"); fenda(col, "crava_fenda", (p.x, p.y, 0.5), FI, 2.2, "o", 70, 0.4)
    aura_lamina(col, "crava_lamina", esp, FI - 6, FS + 30, PONTA_X, "aura_c", 0.26)
    contorno(col, "crava_corpo", arm, [(FI - 4, 0.0), (FI, 0.9), (FS + 26, 0.0)], BRASA, 3.4, 0.02)
    k = 0; dist = 0.4
    while dist <= COMP:
        f = chega(dist); c = (p.x + random.uniform(-0.1, 0.1) * U, p.y + dist * U, 0.0)
        seg = faixa_chao(col, "fis%d" % k, c, math.pi / 2 + random.uniform(-0.12, 0.12), 1.45 * U, 1.1 * U, M["fis_o" if k % 2 else "fis_c"], 0.42)
        esc(seg, [(f - 1, (1e-3, 1, 1)), (f + 2, (1, 1, 1)), (f + 64, (1, 1, 1)), (f + 78, (1, 1e-3, 1))])
        brilho = faixa_chao(col, "fis_glow%d" % k, c, math.pi / 2, 1.8 * U, 1.8 * U, M["halo_o"], 0.40)
        esc(brilho, [(f - 1, (1e-3,) * 3), (f + 1, (1, 1, 1)), (f + 10, (0.8, 0.8, 1)), (f + 40, (1e-3,) * 3)])
        lajes_erguem(col, "laje%d" % k, c, f, 3, (math.pi if k % 2 else 0.0), (0.7, 1.4), 50)
        if k % 2 == 0:
            veu(col, "jorro%d" % k, (c[0], c[1], 0.3), f, 0.26, 2.2 + random.uniform(0, 0.9), "veu_o", 12, 10, 0.7, 5, 3)
            flare(col, "frente%d" % k, (c[0], c[1], 0.5 * U), f, 1.5, "o", 12, largo=False); tremor(sc, f, 0.05, 5, k)
        lascas(col, "lasca%d" % k, (c[0], c[1], 0.5), f, 4, 0.12, 2.4, "pedra", (22, 34))
        dist += 0.75; k += 1
    fe = chega(COMP); q = Vector((p.x, p.y + COMP * U, 0.8 * U))
    impacto(sc, col, "fim", q, fe, 3, "b"); veu(col, "fim_veu", (q.x, q.y, 0.3), fe, 0.7, 5.2, "veu_c", 22, 14, 0.75, 6, 4)
    lascas(col, "fim_lasca", (q.x, q.y, 0.5), fe, 16, 0.18, 3.6)
    luzc = luz(col, "luz_corre", "POINT", (p.x, p.y, 0.8 * U), 0, (1.0, 0.45, 0.15)); luzc.data.use_shadow = False; pisca(luzc, [(FS - 1, 0), (FS, 2400), (fe, 1600), (fe + 14, 0)])
    anda_obj(luzc, [(FS, Vector((p.x, p.y, 0.8 * U))), (fe, q)])
    g = GRAV * U
    for i, ((x, y), o) in enumerate(zip(orcs, obs)):
        f0 = chega(y - y0); v = 6.5 * U; z = 0.0; yy = y * U; pts = [(f0 - 1, V(x, y))]; f = f0
        while True:
            f += 1; z += v / 48.0; v -= g / 48.0; yy += 1.2 * U / 48.0
            if z <= 0: pts.append((f, Vector((x * U, yy, 0)))); break
            if f % 2 == 0: pts.append((f, Vector((x * U, yy, z))))
        anda_obj(o, pts); gira_obj(o, [(f0 - 1, (0, 0, 0)), (f0 + 10, (-28, 0, 10 * (-1) ** i)), (f + 8, (0, 0, 0))])
        impacto(sc, col, "orc_hit%d" % i, Vector((x * U, y * U, 1.0 * U)), f0, 1, "o")
        estrelas_stun(col, "stun%d" % i, (lambda ff, x=x, yy=yy: Vector((x * U, yy, 0))), f + 2, 70)
    meta(sc, acao, N, [FI], 0.0)
    fim_cena(sc); return sc

# ------------------------------------------------------------------ quebras de chao (so onde a animacao bate no chao)
def leque_quebra(sc, col, nome, ponta, f0, f1, abertura=50, comp=4.0):
    """a espada sai do chao rasgando: rachaduras em leque para a frente, rochas que sobem em cone, lascas e poeira"""
    for i in range(7):
        a = math.radians(90 + (i - 3) * abertura / 6); L = comp * random.uniform(0.7, 1.0); fs = f0 + int((f1 - f0) * random.uniform(0.0, 0.5))
        c = (ponta.x + math.cos(a) * L / 2 * U, ponta.y + math.sin(a) * L / 2 * U, 0)
        seg = faixa_chao(col, "%s_fis%d" % (nome, i), c, a, L * U, 0.7 * U, M["fis_o" if i % 2 else "fis_c"], 0.42)
        esc(seg, [(fs - 1, (1e-3, 1, 1)), (fs + 4, (1, 1, 1)), (fs + 60, (1, 1, 1)), (fs + 74, (1, 1e-3, 1))])
        for j in range(3):                                                                       # rochas erguem ao longo de cada rachadura
            t = (j + 1) / 4; q = (ponta.x + math.cos(a) * L * t * U, ponta.y + math.sin(a) * L * t * U, 0)
            lajes_erguem(col, "%s_r%d_%d" % (nome, i, j), q, fs + 2 + j * 2, 1, a, (0.5 + 0.5 * (1 - t), 1.0 + 0.6 * (1 - t)), 44)
    lascas(col, nome + "_l", (ponta.x, ponta.y + 0.8 * U, 0.5), f1, 22, 0.16, 4.2)
    flare(col, nome + "_fl", (ponta.x, ponta.y + 0.4 * U, 0.4 * U), f1, 2.6, "o", 18); tremor(sc, f1, 0.14, 12, 7)
def estrela_quebra(sc, col, nome, centro, f, n=8):
    """a espada cravada na vertical: o chao estoura em estrela em volta, rochas sobem inclinadas para fora"""
    fenda(col, nome + "_fenda", (centro.x, centro.y, 0.5), f, 4.2, "o", 70, 0.3); fenda(col, nome + "_fenda2", (centro.x, centro.y, 0.5), f + 2, 2.8, "c", 66, 1.2)
    for i in range(n):
        a = i * 2 * math.pi / n + random.uniform(-0.2, 0.2); r = random.uniform(1.0, 1.8)
        lajes_erguem(col, "%s_r%d" % (nome, i), (centro.x + math.cos(a) * r * U, centro.y + math.sin(a) * r * U, 0), f + 1, 1, a, (0.8, 1.5), 50)
    lascas(col, nome + "_l", (centro.x, centro.y, 0.5), f, 30, 0.2, 4.8)
    veu(col, nome + "_veu", (centro.x, centro.y, 0.3), f, 0.5, 3.6, "veu_o", 10, 12, 0.7, 6, 3)

CENAS = [("N0_DASH", montar_dash), ("N1_CONTRA", montar_contra), ("N2_MASSACRE", montar_massacre), ("N3_MODO", montar_modo), ("N4_EXECUCAO", montar_execucao),
         ("N5_LANCADOR", montar_lancador), ("N6_FENDA", montar_fenda)]
cenas = []
for nome, fn in CENAS:
    if ONLY and ONLY not in nome: continue
    cenas.append(fn()); print("cena pronta", nome, len(cenas[-1].objects), "objetos")
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
