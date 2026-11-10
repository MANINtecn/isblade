"""Arqueiro (Humano M, Arco da Floresta): 7 cenas = ataque padrao (3 niveis) + 6 skills, com o personagem de verdade e as animacoes nativas de arco do L2.
Rodar sem janela:  blender -b prototipo/assets/personagens/arqueiro_base.blend --python prototipo/tools/blender_fx/build_arqueiro.py   (ARQ_ONLY=S1 monta so uma cena)
Cenas: ARQUEIRO_BASICO (Flecha / Flecha Dupla / Leque) · _S1_PERFURANTE (nv1) · _S2_EVASIVO (nv5) · _S3_ATORDOANTE (nv10) · _S4_CHUVA (nv20) · _S5_FALCAO (nv25) · _S6_ELITE (nv30). 48 fps. Frente = +Y.
Paleta: verde-floresta escuro, prata e ambar. So formas angulares. O arco do L2 nao tem textura exportada: madeira escura procedural."""
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
import guerreiro_clips as G
import guerreiro_fx as X
PREF = "ARQUEIRO_"; YAW = math.pi; U = X.U
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
ONLY = os.environ.get("ARQ_ONLY", "")
# paleta do arqueiro (antes de criar os materiais)
X.ACO = (0.92, 1.0, 0.95); X.CARMESIM = (0.06, 0.45, 0.20); X.BRASA = (1.0, 0.62, 0.12); X.OURO = (1.0, 0.85, 0.45); X.AZUL = (0.55, 0.95, 0.80)
X.CORES = {"b": X.ACO, "c": (0.10, 0.60, 0.28), "o": X.BRASA, "g": X.OURO, "a": X.AZUL}
X.init_materiais(); M = X.M
M["haste"] = X.mat_emit("AR_haste", (0.50, 0.32, 0.14), 1.6); M["ponta"] = X.mat_emit("AR_ponta", (0.92, 1.0, 0.96), 4.5); M["pena"] = X.mat_emit("AR_pena", (0.15, 0.85, 0.40), 2.6); M["pena_o"] = X.mat_emit("AR_pena_o", (1.0, 0.6, 0.12), 2.6)
# o personagem base (cena atual do arquivo) e o arco
BASE_ARM = bpy.data.objects["HumanFighter_Armature"]; BASE_ARCO = bpy.data.objects["Arco"]
G.BASE.update(sc=bpy.context.scene, arm=BASE_ARM, corpo=[o for o in bpy.data.objects if o.type == "MESH" and o.parent == BASE_ARM], espada=BASE_ARCO, ponta_local=Vector((0, 0, 0)), ossos=[b.name for b in BASE_ARM.data.bones])
BSC = G.BASE["sc"]

def R(p): return Vector((-p.x, -p.y, p.z))
def mao_dir(acao_nome, f):
    """origem (ponto entre as maos) e direcao da flecha no quadro f (mundo do jogo: frente +Y)"""
    BASE_ARM.animation_data.action = bpy.data.actions[acao_nome]; BSC.frame_set(f); BSC.view_layers[0].update()
    L = BASE_ARM.matrix_world @ BASE_ARM.pose.bones["Bip01_L_Hand"].head; Rr = BASE_ARM.matrix_world @ BASE_ARM.pose.bones["Bip01_R_Hand"].head
    d = (L - Rr); d = Vector((d.x, d.y, d.z)).normalized(); o = (L + Rr) / 2
    return R(o), Vector((-d.x, -d.y, d.z))
def cena(nome, fim, acao):
    sc, col, ref = X.nova_cena(PREF + nome, fim)
    me = bpy.data.meshes.new("AR_chao"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40 * U / 2); bm.to_mesh(me); bm.free(); me.materials.append(M["ref_chao"]); ref.objects.link(bpy.data.objects.new("chao", me))
    X.luz(ref, "sol", "SUN", (0, 0, 10 * U), 1.2, (0.9, 1.0, 0.9)).rotation_euler = (math.radians(50), 0, math.radians(35)); X.luz(ref, "luz_fria", "SUN", (0, 0, 10 * U), 0.4, (0.7, 0.8, 1.0)).rotation_euler = (math.radians(60), 0, math.radians(-120))
    arm, arco = G.clonar(col, nome, (0, 0, 0), YAW); arm.animation_data.action = acao
    if arm.animation_data.action_slot is None and len(acao.slots): arm.animation_data.action_slot = acao.slots[0]
    return sc, col, ref, arm
def cams(sc, ref, alvo=(0, 8, 1.3), d=1.0):
    a = Vector(alvo) * U
    X.camera(sc, ref, "cam_lateral", (9 * U * d, alvo[1] * 0.5 * U, 2.0 * U), a, 34); X.camera(sc, ref, "cam_alvo", (4.0 * U * d, (alvo[1] + 6) * U, 2.6 * U), a, 32)
    X.camera(sc, ref, "cam_do_arqueiro", (-2.4 * U * d, -4.2 * U * d, 2.0 * U), a, 30)
    sc.camera = X.camera(sc, ref, "cam_perto", (3.4 * U, -1.2 * U, 1.7 * U), (0.0, 1.8 * U, 1.3 * U), 32)           # o arqueiro de perto (padrao): ve o arco e a saida da flecha
def dummy(ref, nome, pos, h=1.8):
    return X.caixa(ref, nome, (pos[0] * U, pos[1] * U, h * U / 2), (0.7 * U, 0.45 * U, h * U), M["ref_inimigo"])

# ------------------------------------------------------------------ flecha
def bm_flecha(esc=1.0):
    bm = bmesh.new(); L = 1.0 * U * esc; r = 0.012 * U * esc
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=6, radius1=r, radius2=r, depth=L); bmesh.ops.translate(bm, vec=(0, 0, L / 2), verts=bm.verts); return bm
def cria_flecha(col, nome, esc=1.0, cor_pena="pena"):
    raiz = bpy.data.objects.new(nome, None); col.objects.link(raiz); L = 1.0 * U * esc
    h = X.para_obj(col, nome + "_haste", bm_flecha(esc), M["haste"]); h.parent = raiz; h.location = (0, 0, -L)
    p = X.para_obj(col, nome + "_ponta", X.bm_cone(0.034 * U * esc, 0.0, 0.14 * U * esc, 4), M["ponta"]); p.parent = raiz; p.location = (0, 0, 0)
    for k in range(3):
        bm = bmesh.new(); a = 2 * math.pi * k / 3; q = [bm.verts.new(v) for v in ((0, 0, 0), (0.05 * U * esc, 0, 0.12 * U * esc), (0.05 * U * esc, 0, 0.30 * U * esc), (0, 0, 0.36 * U * esc))]; bm.faces.new(q)
        pe = X.para_obj(col, "%s_pena%d" % (nome, k), bm, M[cor_pena]); pe.parent = raiz; pe.location = (0, 0, -L); pe.rotation_euler = (0, 0, a)
    return raiz
def tiro(col, tag, f0, O, D, dist, v=40.0, esc=1.0, cor="b", fica=False, trilha=True, grav=0.0, cor_pena="pena", dur_min=0):
    """flecha de f0 ate a distancia 'dist' (m) na direcao D; devolve (quadro_chegada, funcao pos(f))"""
    D = Vector(D).normalized(); n = max(2, int(round(dist / v * 48))); f1 = f0 + n; fl = cria_flecha(col, "fl_" + tag, esc, cor_pena)
    X.apunta(fl, D); dados = {}
    for f in range(f0, f1 + 1):
        t = (f - f0) / n; p = Vector(O) + D * dist * U * t
        if grav: p.z -= grav * U * t * t * 4
        fl.location = tuple(p); fl.keyframe_insert("location", frame=f)
        dados[f] = (p, p - D * 0.9 * U * esc)
    fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=f0 - 1); fl.scale = (1, 1, 1); fl.keyframe_insert("scale", frame=f0)
    if fica: fl.keyframe_insert("scale", frame=f1 + 70); fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=f1 + 76)
    else: fl.keyframe_insert("scale", frame=f1); fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=f1 + 1)
    if trilha:
        up = Vector((0, 0, 1)); side = D.cross(up).normalized() if abs(D.z) < .95 else Vector((1, 0, 0)); w = 0.11 * U * esc
        for nome_t, off in (("v", up * w), ("h", side * w)):
            d2 = {f: (dados[f][0] + off, dados[f][0] - off) for f in dados}
            X.trilha(col, "tr_%s_%s" % (tag, nome_t), d2, f0, f1, 0.55, 3.4 * esc ** 0.3)
    X.clarao(col, "bo_" + tag, O, f0, 1.3 * esc, cor, 10)
    return f1, dados
def impacto(col, tag, f, p, escala=1.0, cor="b", chao=True, stun=False):
    X.clarao(col, "im_" + tag, p, f, 2.2 * escala, "b", 14); X.espinhos(col, "ie_" + tag, p, f, int(10 * escala + 6), 1.2 * escala, "b", 0.04, 12); X.espinhos(col, "ie2_" + tag, p, f, 6, 0.9 * escala, "c", 0.035, 14)
    X.brasas(col, "ib_" + tag, p, f, int(10 * escala), 1.6, 1.2, (28, 56), "o", 0.13)
    if chao: X.onda(col, "io_" + tag, (p.x, p.y), f, 1.6 * escala, "c", 14, 0.6)

# ================================================================== ATAQUE PADRAO: 3 niveis
def montar_basico():
    random.seed(1)
    acao, fx = G.bake(BASE_ARM, "W_BasicoA", [dict(acao="W_Atk01_Bow", de=14, ate=72, saida=59), dict(acao="W_Atk01_Bow", de=14, ate=72, saida=59, alinha=True), dict(acao="W_Atk01_Bow", de=14, ate=72, saida=59, alinha=True)], emenda=3)
    N = fx[-1][1]; rel = [fx[i][0] + (56 - 14) for i in range(3)]; print("BASICO release", rel, "total", N)
    sc, col, ref, arm = cena("BASICO", N + 24, acao); cams(sc, ref, (0, 9, 1.3)); dummy(ref, "inimigo", (0, 13.0))
    for k, f in enumerate(rel):
        O, D = mao_dir("W_BasicoA", f); n = (1, 2, 3)[k]; ang = {1: [0], 2: [-0.07, 0.07], 3: [-0.2, 0, 0.2]}[n]
        for j, a in enumerate(ang):
            Dj = Matrix.Rotation(a, 3, "Z") @ D; dist = 13.0 / max(0.2, math.cos(a)); fh, _ = tiro(col, "b%d_%d" % (k, j), f, O, Dj, dist, 38.0, 0.9, "c", fica=False)
            p = Vector(O) + Dj * dist * U; impacto(col, "b%d_%d" % (k, j), fh, p, 0.8 if k < 2 else 0.9)
    X.retarget(sc); return sc

# ================================================================== S1 TIRO PERFURANTE (nv 1)
def montar_perfurante():
    random.seed(2)
    acao, fx = G.bake(BASE_ARM, "W_Perfurante", [dict(acao="W_Atk01_Bow", de=10, ate=73, saida=44), dict(acao="W_Atk01_Bow", de=73, ate=73, saida=18)], emenda=0)
    N = fx[-1][1]; f = fx[0][0] + int((56 - 10) / (63 / 44.0)); print("PERFURANTE release", f, "total", N)
    sc, col, ref, arm = cena("S1_PERFURANTE", N + 40, acao); cams(sc, ref, (0, 10, 1.3), 1.15)
    ds = [dummy(ref, "inimigo%d" % i, (0, y)) for i, y in enumerate((6.5, 10.0, 13.5))]
    O, D = mao_dir("W_Perfurante", f); fh, dados = tiro(col, "p", f, O, D, 20.0, 46.0, 1.6, "c")
    for i, y in enumerate((6.5, 10.0, 13.5)):
        ff = f + int(y / 46.0 * 48); p = Vector(O) + D * y * U; impacto(col, "p%d" % i, ff, p, 1.1)
        X.espinhos(col, "pe%d" % i, p, ff, 14, 1.8, "g", 0.05, 16)
    X.fenda(col, "linha", (O.x + D.x * 10 * U, O.y + D.y * 10 * U, 0.4), f + 8, 3.0, "c", 40, 0.0)
    for k in range(4): X.espinhos(col, "vento%d" % k, O, f, 8, 2.2, "b", 0.03, 10 + k * 3)
    X.retarget(sc); return sc

# ================================================================== S2 SALTO EVASIVO (nv 5): salto para tras atirando
def montar_evasivo():
    random.seed(3)
    acao, fx = G.bake(BASE_ARM, "W_Evasivo", [dict(acao="W_Atk01_Bow", de=24, ate=73, saida=40), dict(acao="W_Atk01_Bow", de=73, ate=73, saida=24)], emenda=0)
    N = fx[-1][1]; f = fx[0][0] + int((56 - 24) / (49 / 40.0)); print("EVASIVO release", f, "total", N)
    sc, col, ref, arm = cena("S2_EVASIVO", N + 30, acao); cams(sc, ref, (0, 3.5, 1.3), 0.9); dummy(ref, "inimigo", (0, 10.0))
    # deslocamento por codigo: 5 m para tras em arco (o jogo faz o mesmo), com a flecha saindo no inicio do salto
    f0 = f - 6; f1 = f + 22
    for ff in range(f0, f1 + 1, 2):
        t = (ff - f0) / (f1 - f0); arm.location = (0, -5.0 * U * t, 0.9 * U * 4 * t * (1 - t)); arm.keyframe_insert("location", frame=ff)
    O, D = mao_dir("W_Evasivo", f); O = O + Vector((0, -5.0 * U * ((f - f0) / (f1 - f0)), 0.9 * U * 4 * ((f - f0) / (f1 - f0)) * (1 - (f - f0) / (f1 - f0))))
    fh, _ = tiro(col, "e", f, O, D, 12.0 + 0.5, 40.0, 1.0, "c"); impacto(col, "e", fh, Vector(O) + D * 12.5 * U, 0.9)
    X.onda(col, "pe0", (0, 0), f0, 2.4, "c", 16, 0.6); X.brasas(col, "pe_b", (0, 0, 0.4 * U), f0, 18, 1.6, 1.6, (24, 50), "o", 0.15); X.lascas(col, "pe_l", (0, 0, 0.5), f0, 6, 0.1, 2.6)
    ar = (0, -5.0 * U, 0.5)
    X.onda(col, "pe1", (0, -5.0 * U), f1, 2.4, "c", 16, 0.6); X.brasas(col, "pe_b2", (0, -5.0 * U, 0.4 * U), f1, 14, 1.4, 1.4, (24, 50), "o", 0.15)
    for k in range(8):                                                                     # folhas angulares e vento no caminho do salto
        t = k / 7.0; fk = f0 + int(t * (f1 - f0)); X.clarao(col, "vf%d" % k, (0, -5.0 * U * t, 0.7 * U + 0.9 * U * 4 * t * (1 - t)), fk, 1.1, "c", 14)
    X.retarget(sc); return sc

# ================================================================== S3 TIRO ATORDOANTE (nv 10): carregado, com aviso, stun
def montar_atordoante():
    random.seed(4)
    acao, fx = G.bake(BASE_ARM, "W_AtordoanteA", [dict(acao="W_SpAtk01_Bow", de=125, ate=190, saida=66), dict(acao="W_SpAtk01_Bow", de=190, ate=190, saida=24)], emenda=0)
    N = fx[-1][1]; f = fx[0][0] + (160 - 125); print("ATORDOANTE release", f, "total", N)
    sc, col, ref, arm = cena("S3_ATORDOANTE", N + 90, acao); cams(sc, ref, (0, 9, 1.3)); dm = dummy(ref, "inimigo", (0, 13.0))
    O, D = mao_dir("W_AtordoanteA", f)
    av = X.plano_chao(col, "aviso", 14 * U, M["bh_c"], 0.5); av.scale = (0.03, 1, 1); av.location = (O.x, O.y + 7 * U, 0.5)                                         # faixa de mira no chao ate o alvo
    X.esc(av, [(2, (1e-4,) * 3), (8, (0.05, 1, 1)), (f - 1, (0.05, 1, 1)), (f, (1e-4,) * 3)])
    ab = X.brilho_chao(col, "marca", (0, 13.0 * U), 6, 1.6, "o", f - 6)
    fh, _ = tiro(col, "a", f, O, D, 13.0, 48.0, 1.5, "o", cor_pena="pena_o"); p = Vector(O) + D * 13.0 * U
    impacto(col, "a", fh, p, 1.5, "o"); X.fenda(col, "af", (p.x, p.y, 0.45), fh, 3.0, "o", 40, 0.3); X.onda(col, "ao2", (p.x, p.y), fh + 3, 3.2, "o", 18, 0.6); X.lascas(col, "al", (p.x, p.y, 0.5), fh, 10, 0.14, 3.2)
    l0 = dm.location.copy(); dm.keyframe_insert("location", frame=fh - 1); dm.location = l0 + Vector((0, 1.0 * U, 0)); dm.keyframe_insert("location", frame=fh + 6)
    for k in range(4):                                                                      # stun 1,8 s: estrelas girando
        s = X.sprite(col, "stun%d" % k, M["est_g"], 0.55 * U, (0, 0, 0)); T = int(1.8 * 48)
        for ff in list(range(fh + 4, fh + 4 + T, 3)) + [fh + 4 + T]:
            t = (ff - fh - 4) / 48.0; a = k * 1.5708 + t * 6; s.location = (dm.location.x + math.cos(a) * 0.5 * U, dm.location.y + math.sin(a) * 0.5 * U, 2.25 * U); s.keyframe_insert("location", frame=ff)
        X.esc(s, [(fh + 2, 0.0), (fh + 6, 1.0), (fh + 4 + T - 4, 1.0), (fh + 4 + T, 0.0)])
    X.retarget(sc); return sc

# ================================================================== S4 CHUVA DE FLECHAS (nv 20): area mirada
def montar_chuva():
    random.seed(5)
    acao, fx = G.bake(BASE_ARM, "W_Chuva", [dict(acao="W_SpAtk02_Bow", de=40, ate=128, saida=89), dict(acao="W_SpAtk02_Bow", de=128, ate=128, saida=20)], emenda=0)
    N = fx[-1][1]; f = fx[0][0] + (123 - 40); print("CHUVA release", f, "total", N)
    alvo = Vector((0, 14.0, 0)); sc, col, ref, arm = cena("S4_CHUVA", N + 110, acao); cams(sc, ref, (0, 11, 1.4), 1.2)
    ds = [dummy(ref, "inimigo%d" % i, (x, 14.0 + y)) for i, (x, y) in enumerate(((-1.4, 0.6), (1.5, -0.8), (0.2, 1.8)))]
    O, D = mao_dir("W_Chuva", f); Dalto = (Vector((D.x, D.y, 0)).normalized() * 0.45 + Vector((0, 0, 1)) * 0.9).normalized()
    FA = f + 14                                                                                # flecha-sinal sobe e abre no alto
    fh, _ = tiro(col, "sinal", f, O, Dalto, 13.0, 30.0, 1.1, "c", trilha=True); topo = Vector(O) + Dalto * 13.0 * U
    ab = X.brilho_chao(col, "area", (0, 14.0 * U), f - 4, 4.2, "c", 100); X.onda(col, "av", (0, 14.0 * U), f + 6, 4.4, "c", 20, 0.6)
    X.clarao(col, "abre", topo, fh, 4.0, "b", 18)
    for i in range(26):                                                                         # 26 flechas caem em 3 ondas
        a = random.uniform(0, 6.28); r = 4.0 * math.sqrt(random.random()); fx_ = Vector((alvo.x + math.cos(a) * r, alvo.y + math.sin(a) * r, 0)); fi = fh + 4 + int(i / 26 * 54) + random.randint(0, 3)
        top = Vector((fx_.x * U, fx_.y * U, 13.0 * U)); fl = cria_flecha(col, "ch%d" % i, 1.0, "pena"); X.apunta(fl, Vector((0, 0, -1)))
        fl.location = tuple(top); fl.keyframe_insert("location", frame=fi - 1); fl.location = (top.x, top.y, 0.5 * U); fl.keyframe_insert("location", frame=fi + 7)
        fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=fi - 2); fl.scale = (1, 1, 1); fl.keyframe_insert("scale", frame=fi - 1); fl.keyframe_insert("scale", frame=fi + 60); fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=fi + 70)
        X.clarao(col, "chc%d" % i, (fx_.x * U, fx_.y * U, 0.6 * U), fi + 7, 1.0, "b", 10); X.brasas(col, "chb%d" % i, (fx_.x * U, fx_.y * U, 0.4 * U), fi + 7, 2, 1.0, 0.8, (20, 40), "o", 0.1)
        if i % 5 == 0: X.onda(col, "cho%d" % i, (fx_.x * U, fx_.y * U), fi + 7, 0.9, "c", 10, 0.6)
        tr = {ff: (Vector((top.x, top.y, 13.0 * U - (13.0 - 0.5) * U * (ff - fi + 1) / 8)), Vector((top.x, top.y, 13.0 * U - (13.0 - 0.5) * U * (ff - fi + 1) / 8 + 1.0 * U))) for ff in range(fi, fi + 8)}
        d2 = {ff: (tr[ff][0] + Vector((0.08 * U, 0, 0)), tr[ff][1] - Vector((0.08 * U, 0, 0))) for ff in tr}; X.trilha(col, "chT%d" % i, d2, fi, fi + 7, 0.6, 3.0)
    X.fenda(col, "marca", (alvo.x * U, alvo.y * U, 0.45), fh + 30, 4.4, "c", 80, 0.5)
    X.retarget(sc); return sc

# ================================================================== S5 OLHO DE FALCAO (nv 25): buff + proxima flecha atravessa mais um
def bm_olho(w):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify()
    top = [(-w, 0), (-w * 0.5, w * 0.42), (w * 0.5, w * 0.42), (w, 0)]; bot = [(w, 0), (w * 0.5, -w * 0.42), (-w * 0.5, -w * 0.42), (-w, 0)]
    f = bm.faces.new([bm.verts.new((x, 0, z)) for x, z in top + bot[1:3]])
    for lp in f.loops: lp[uvl].uv = (lp.vert.co.x / (2 * w) + 0.5, lp.vert.co.z / (w * 0.9) + 0.5)
    return bm
def montar_falcao():
    random.seed(6)
    acao, fx = G.bake(BASE_ARM, "W_Falcao", [dict(acao="W_AtkWait_Bow", de=0, ate=36, saida=37), dict(acao="W_Atk01_Bow", de=24, ate=73, saida=45, alinha=True), dict(acao="W_Atk01_Bow", de=73, ate=73, saida=26, alinha=True)], emenda=6)
    N = fx[-1][1]; f = fx[1][0] + int((56 - 24) / (49 / 45.0)); print("FALCAO release", f, "total", N)
    sc, col, ref, arm = cena("S5_FALCAO", N + 40, acao); cams(sc, ref, (0, 5, 1.3), 1.0); [dummy(ref, "inimigo%d" % i, (0, y)) for i, y in enumerate((8.0, 11.5))]
    F0 = 10
    X.onda(col, "b1", (0, 0), F0, 4.2, "g", 22, 0.6); X.onda(col, "b2", (0, 0), F0 + 6, 2.8, "c", 22, 0.6); X.brilho_chao(col, "area", (0, 0), F0, 2.4, "c", f - F0 + 30)
    ol = X.para_obj(col, "olho", bm_olho(0.55 * U), M["bh_g"]); ol.location = (0, 0, 2.7 * U); pu = X.sprite(col, "pupila", M["est_b"], 0.75 * U, (0, 0, 2.7 * U))
    X.esc(ol, [(F0 - 1, 0.0), (F0 + 8, 1.0), (f + 20, 1.0), (f + 32, 0.0)]); X.esc(pu, [(F0, 0.0), (F0 + 9, 1.0), (f + 20, 1.0), (f + 32, 0.0)])
    ol.constraints.new("TRACK_TO").name = "GW_BB"; k = ol.constraints[0]; k.track_axis = "TRACK_Z"; k.up_axis = "UP_Y"
    for i in range(10):                                                                      # penas de vento girando em volta do arco
        a0 = i * 0.628; s = X.sprite(col, "pena%d" % i, M["est_c"], 0.5 * U, (0, 0, 0))
        for ff in list(range(F0, f + 24, 3)): t = (ff - F0) / 48.0; a = a0 + t * 4; s.location = (math.cos(a) * 1.0 * U, math.sin(a) * 1.0 * U, 1.0 * U + 0.9 * U * math.sin(t * 2 + a0)); s.keyframe_insert("location", frame=ff)
        X.esc(s, [(F0, 0.0), (F0 + 8 + i, 1.0), (f + 14, 1.0), (f + 26, 0.0)])
    O, D = mao_dir("W_Falcao", f); fh, _ = tiro(col, "f", f, O, D, 16.0, 46.0, 1.3, "g", cor_pena="pena_o")
    for i, y in enumerate((8.0, 11.5)):
        ff = f + int(y / 46.0 * 48); p = Vector(O) + D * y * U; impacto(col, "f%d" % i, ff, p, 1.2, "g"); X.clarao(col, "fcrit%d" % i, p + Vector((0, 0, 0.8 * U)), ff + 2, 2.6, "g", 16)
    X.retarget(sc); return sc

# ================================================================== S6 TIRO DE ELITE (nv 30): carga longa, linha de mira, flecha gigante
def montar_elite():
    random.seed(7)
    acao, fx = G.bake(BASE_ARM, "W_Elite", [dict(acao="W_SpAtk01_Bow", de=0, ate=190, saida=191), dict(acao="W_SpAtk01_Bow", de=190, ate=190, saida=26)], emenda=0)
    N = fx[-1][1]; f = fx[0][0] + 160; print("ELITE release", f, "total", N)
    sc, col, ref, arm = cena("S6_ELITE", N + 100, acao); cams(sc, ref, (0, 14, 1.4), 1.9); dm = dummy(ref, "inimigo", (0, 26.0))
    O, D = mao_dir("W_Elite", f); Dh = Vector((D.x, D.y, 0)).normalized()
    L = X.plano_chao(col, "mira_linha", 40 * U, M["bh_c"], 0.6); L.scale = (0.012, 1, 1); L.location = (0, 20 * U, 0.6)
    X.esc(L, [(40, (1e-4,) * 3), (62, (0.012, 0.15, 1)), (f - 4, (0.03, 1.0, 1)), (f, (0.06, 1.0, 1)), (f + 1, (1e-4,) * 3)])
    X.brilho_chao(col, "carga", (0, 0), 40, 2.6, "c", f - 40); X.onda(col, "c1", (0, 0), 90, 3.4, "c", 40, 0.6); X.onda(col, "c2", (0, 0), 130, 2.2, "g", 28, 0.6)
    for i in range(14): X.espinhos(col, "carga%d" % i, (O.x, O.y, O.z), 60 + i * 7, 3, 0.9, "c", 0.03, 18)
    fh, _ = tiro(col, "elite", f, O, D, 26.0, 80.0, 3.2, "g", cor_pena="pena_o")
    X.espinhos(col, "disp", O, f, 40, 3.5, "b", 0.05, 16); X.clarao(col, "disp_c", O, f, 5.0, "g", 22); X.onda(col, "disp_o", (O.x, O.y), f, 6.0, "o", 22, 0.6)
    for k in range(9):                                                                       # poeira e vento em toda a linha percorrida
        t = (k + 1) / 10.0; X.fenda(col, "via%d" % k, (O.x * 1 + Dh.x * 26 * U * t, O.y + Dh.y * 26 * U * t, 0.45), f + int(t * (fh - f)), 2.0, "c", 36, k)
    p = Vector(O) + D * 26.0 * U; X.clarao(col, "ex1", p, fh, 8.0, "b", 26); X.clarao(col, "ex2", p, fh + 2, 5.0, "g", 28); X.espinhos(col, "ex_e", p, fh, 40, 3.2, "b", 0.07, 20); X.espinhos(col, "ex_e2", p, fh, 18, 2.2, "o", 0.06, 24)
    ch = (p.x, p.y, 0.45); X.fenda(col, "ex_f", ch, fh, 7.0, "o", 80, 0.0); X.fenda(col, "ex_f2", ch, fh + 3, 4.5, "c", 70, 1.1); X.onda(col, "ex_o1", (p.x, p.y), fh, 8.0, "o", 26, 0.6); X.onda(col, "ex_o2", (p.x, p.y), fh + 5, 5.4, "c", 24, 0.6); X.onda(col, "ex_o3", (p.x, p.y), fh + 10, 3.4, "g", 22, 0.6)
    X.lascas(col, "ex_l", ch, fh, 36, 0.24, 5.5, "pedra", (36, 64)); X.brasas(col, "ex_b", p, fh, 70, 3.6, 3.0, (40, 90), "o", 0.18); X.coluna(col, "ex_c", ch, fh, 9.0, 1.4, "coluna_o", 34, 3.0)
    l0 = dm.location.copy(); dm.keyframe_insert("location", frame=fh - 1); dm.location = l0 + Vector((0, 8.0 * U, 0)); dm.keyframe_insert("location", frame=fh + 22)
    dm.rotation_euler = (0, 0, 0); dm.keyframe_insert("rotation_euler", frame=fh - 1); dm.rotation_euler = (math.radians(80), 0, math.radians(20)); dm.keyframe_insert("rotation_euler", frame=fh + 20)
    X.retarget(sc); return sc

CENAS = [("BASICO", montar_basico), ("S1_PERFURANTE", montar_perfurante), ("S2_EVASIVO", montar_evasivo), ("S3_ATORDOANTE", montar_atordoante), ("S4_CHUVA", montar_chuva), ("S5_FALCAO", montar_falcao), ("S6_ELITE", montar_elite)]
cenas = []
for nome, fn in CENAS:
    if ONLY and ONLY not in nome: continue
    cenas.append(fn()); print("cena pronta", nome, len(cenas[-1].objects), "objetos")
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
