"""Arqueiro (Humano M, Arco da Floresta): 7 cenas = ataque padrao (3 niveis) + 6 skills, com o personagem de verdade e as animacoes nativas de arco do L2. v2 COM FISICA.
Rodar sem janela:  blender -b prototipo/assets/personagens/arqueiro_base.blend --python prototipo/tools/blender_fx/build_arqueiro.py   (ARQ_ONLY=S1 monta so uma cena)
Cenas: ARQUEIRO_BASICO (Flecha / Flecha Dupla / Leque) · _S1_PERFURANTE (nv1) · _S2_GANCHO (nv5) · _S3_ATORDOANTE (nv10) · _S4_CHUVA (nv20) · _S5_FALCAO (nv25) · _S6_ELITE (nv30). 48 fps. Frente = +Y.
Fisica (gravidade de jogo G = 22 m/s2, mais pesada que a real para o tiro ficar rapido e legivel): a flecha SAI DA CORDA (fica encaixada seguindo as maos durante a mira), voa em parabola com a ponta
acompanhando a velocidade, espeta no alvo/chao e balanca amortecida; a Perfurante perde 8% de velocidade em cada alvo; a Chuva sobe pelo arco do arco apontado para cima, para no apice e cai acelerando;
o Gancho tem corda com folga que estica e puxa o arqueiro com perfil de aceleracao e freada; alvos levam impulso (atrito, inclinacao com mola, quique); lascas quicam.
Paleta: verde-floresta escuro, prata e ambar. So formas angulares. O arco do L2 nao tem textura exportada: madeira escura procedural."""
import bpy, bmesh, math, random, os, sys
from mathutils import Vector, Matrix, Quaternion
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
import guerreiro_clips as G
import guerreiro_fx as X
PREF = "ARQUEIRO_"; YAW = math.pi; U = X.U; GA = 22.0                                   # gravidade de jogo (m/s2)
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
ONLY = os.environ.get("ARQ_ONLY", "")
X.ACO = (0.92, 1.0, 0.95); X.CARMESIM = (0.06, 0.45, 0.20); X.BRASA = (1.0, 0.62, 0.12); X.OURO = (1.0, 0.85, 0.45); X.AZUL = (0.55, 0.95, 0.80)
X.CORES = {"b": X.ACO, "c": (0.10, 0.60, 0.28), "o": X.BRASA, "g": X.OURO, "a": X.AZUL}
X.init_materiais(); M = X.M
M["haste"] = X.mat_emit("AR_haste", (0.50, 0.32, 0.14), 1.6); M["ponta"] = X.mat_emit("AR_ponta", (0.92, 1.0, 0.96), 4.5); M["pena"] = X.mat_emit("AR_pena", (0.15, 0.85, 0.40), 2.6); M["pena_o"] = X.mat_emit("AR_pena_o", (1.0, 0.6, 0.12), 2.6)
M["corda"] = X.mat_emit("AR_corda", (0.80, 0.62, 0.30), 2.0); M["poste"] = X.mat_pedra("AR_poste", (0.16, 0.10, 0.06))
BASE_ARM = bpy.data.objects["HumanFighter_Armature"]; BASE_ARCO = bpy.data.objects["Arco"]
G.BASE.update(sc=bpy.context.scene, arm=BASE_ARM, corpo=[o for o in bpy.data.objects if o.type == "MESH" and o.parent == BASE_ARM], espada=BASE_ARCO, ponta_local=Vector((0, 0, 0)), ossos=[b.name for b in BASE_ARM.data.bones])
BSC = G.BASE["sc"]; DT = 1.0 / 48.0

def R(p): return Vector((-p.x, -p.y, p.z))
_cache = {}
def maos(acao, n):
    """posicao (mundo do jogo, em unidades) das maos do arco (L) e da corda (R) em cada quadro 1..n da acao baked"""
    if acao in _cache: return _cache[acao]
    BASE_ARM.animation_data.action = bpy.data.actions[acao]; out = {}
    for f in range(1, n + 1):
        BSC.frame_set(f); BSC.view_layers[0].update(); mw = BASE_ARM.matrix_world
        out[f] = (R(mw @ BASE_ARM.pose.bones["Bip01_L_Hand"].head), R(mw @ BASE_ARM.pose.bones["Bip01_R_Hand"].head))
    _cache[acao] = out; return out
def dir_mira(mf, f):
    L, Rr = mf[f]; return (L - Rr).normalized()
def lanca_dir(O, alvo, v):
    """direcao de lancamento (com a elevacao que compensa a gravidade) para a flecha passar por 'alvo' saindo de O a v m/s"""
    d = Vector((alvo.x - O.x, alvo.y - O.y, 0)); dh = max(0.5, d.length / U); h = (alvo.z - O.z) / U; v2 = v * v; disc = v2 * v2 - GA * (GA * dh * dh + 2 * h * v2)
    t = (v2 - math.sqrt(disc)) / (GA * dh) if disc > 0 else 1.0
    return (d.normalized() + Vector((0, 0, t))).normalized()
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
    sc.camera = X.camera(sc, ref, "cam_perto", (3.4 * U, -1.2 * U, 1.7 * U), (0.0, 1.8 * U, 1.3 * U), 32)
def dummy(ref, nome, pos, h=1.8):
    return X.caixa(ref, nome, (pos[0] * U, pos[1] * U, h * U / 2), (0.7 * U, 0.45 * U, h * U), M["ref_inimigo"])

# ------------------------------------------------------------------ flecha (ponta em z=0, haste para -Z)
def cria_flecha(col, nome, esc=1.0, cor_pena="pena"):
    raiz = bpy.data.objects.new(nome, None); col.objects.link(raiz); raiz.rotation_mode = "QUATERNION"; L = 1.0 * U * esc; r = 0.012 * U * esc
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=6, radius1=r, radius2=r, depth=L); bmesh.ops.translate(bm, vec=(0, 0, -L / 2), verts=bm.verts)
    h = X.para_obj(col, nome + "_haste", bm, M["haste"]); h.parent = raiz
    p = X.para_obj(col, nome + "_ponta", X.bm_cone(0.034 * U * esc, 0.0, 0.14 * U * esc, 4), M["ponta"]); p.parent = raiz
    for k in range(3):
        bm = bmesh.new(); q = [bm.verts.new(v) for v in ((0, 0, 0), (0.05 * U * esc, 0, 0.12 * U * esc), (0.05 * U * esc, 0, 0.30 * U * esc), (0, 0, 0.36 * U * esc))]; bm.faces.new(q)
        pe = X.para_obj(col, "%s_pena%d" % (nome, k), bm, M[cor_pena]); pe.parent = raiz; pe.location = (0, 0, -L); pe.rotation_euler = (0, 0, 2 * math.pi * k / 3)
    return raiz
def quat_de(d): return Vector(d).normalized().to_track_quat("Z", "Y")
def chave(fl, f, p, q):
    fl.location = tuple(p); fl.rotation_quaternion = q; fl.keyframe_insert("location", frame=f); fl.keyframe_insert("rotation_quaternion", frame=f)
def vivo(fl, f_ini, f_fim):
    fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=f_ini - 1); fl.scale = (1, 1, 1); fl.keyframe_insert("scale", frame=f_ini); fl.keyframe_insert("scale", frame=f_fim); fl.scale = (1e-4,) * 3; fl.keyframe_insert("scale", frame=f_fim + 1)
def sinal_continuo(qs):
    for i in range(1, len(qs)):
        if qs[i].dot(qs[i - 1]) < 0: qs[i].negate()
    return qs
def balanca(fl, f, p, q0, eixo, amp=0.16, hz=24.0, tau=0.14, dur=22):
    """flecha espetada: oscila amortecida em torno do eixo lateral (como mola)"""
    for k in range(dur + 1):
        t = k * DT; a = amp * math.exp(-t / tau) * math.cos(2 * math.pi * hz * t * 0.5); fl.location = tuple(p); fl.rotation_quaternion = Quaternion(eixo, a) @ q0; fl.keyframe_insert("location", frame=f + k); fl.keyframe_insert("rotation_quaternion", frame=f + k)
def voo(col, tag, mf, f_nock, f_rel, vel, alvo_pt=None, dir_fixa=None, esc=1.0, cor_pena="pena", alvos=(), furar=False, perda=0.92, max_q=170, trilha=True, v_cor="c", parar_chao=True, fica=70):
    """flecha completa: encaixada na corda (seguindo as maos) de f_nock a f_rel, depois balistica com gravidade; devolve dict(path, hits, f_fim, p_fim, O, D)"""
    fl = cria_flecha(col, "fl_" + tag, esc, cor_pena); qs = []; pts = []
    for f in range(f_nock, f_rel + 1):
        L, Rr = mf[f]; D = (L - Rr).normalized(); tip = L + D * 0.12 * U; qs.append(quat_de(D)); pts.append((f, tip))
    D0 = dir_mira(mf, f_rel); O = pts[-1][1].copy()
    Dl = dir_fixa if dir_fixa is not None else (lanca_dir(O, alvo_pt, vel) if alvo_pt is not None else D0)
    p = O.copy(); v = Dl * vel * U; path = [(f_rel, p.copy())]; f = f_rel; stop = False; hits = []; usados = set()
    while f < f_rel + max_q and not stop:
        f += 1; v.z -= GA * U * DT; p = p + v * DT; path.append((f, p.copy())); qs.append(quat_de(v)); pts.append((f, p.copy()))
        for i, a in enumerate(alvos):
            if i not in usados and math.hypot(p.x / U - a[0], p.y / U - a[1]) <= 0.6 and 0.0 <= p.z / U <= 2.0:
                usados.add(i); hits.append((f, p.copy(), i))
                if furar: v = v * perda
                else: stop = True
        if parar_chao and p.z <= 0.12 * U: stop = True
    qs = sinal_continuo(qs); f_fim = f
    for (ff, pp), q in zip(pts, qs): chave(fl, ff, pp, q)
    D_fim = (v.normalized() if v.length > 1e-6 else D0); lado = D_fim.cross(Vector((0, 0, 1))); lado = lado.normalized() if lado.length > 1e-4 else Vector((1, 0, 0))
    balanca(fl, f_fim, pts[-1][1], qs[-1], lado, 0.2 * (1 if esc < 2 else 0.6), dur=22)
    vivo(fl, f_nock, f_fim + fica)
    if trilha:
        up = Vector((0, 0, 1)); w = 0.1 * U * esc; seg = [(ff, pp) for ff, pp in pts if ff >= f_rel]
        for nt, kv in (("v", up), ("h", lado)):
            d2 = {ff: (pp + kv * w, pp - kv * w) for ff, pp in seg}; X.trilha(col, "tr_%s_%s" % (tag, nt), d2, f_rel, f_fim, 0.55, 3.2 * esc ** 0.3)
    X.clarao(col, "bo_" + tag, O, f_rel, 1.2 * esc, v_cor, 10)
    return dict(path=path, hits=hits, f_fim=f_fim, p_fim=pts[-1][1], flecha=fl, O=O, D=Dl)
def impacto(col, tag, f, p, escala=1.0, chao=True):
    X.clarao(col, "im_" + tag, p, f, 2.0 * escala, "b", 14); X.espinhos(col, "ie_" + tag, p, f, int(10 * escala + 6), 1.1 * escala, "b", 0.04, 12); X.espinhos(col, "ie2_" + tag, p, f, 6, 0.9 * escala, "c", 0.035, 14)
    X.brasas(col, "ib_" + tag, p, f, int(10 * escala), 1.6, 1.2, (28, 56), "o", 0.13)
    if chao: X.onda(col, "io_" + tag, (p.x, p.y), f, 1.5 * escala, "c", 14, 0.6)
def empurra(dm, f, dir_xy, v0, massa=1.0, tilt=14.0, voa=0.0):
    """impulso no alvo (caixa): desliza com atrito (mu 0,9), inclina com mola amortecida e, se 'voa' > 0, sobe e quica (restituicao 0,35) girando"""
    l0 = dm.location.copy(); r0 = dm.rotation_euler.copy(); d = Vector((dir_xy[0], dir_xy[1], 0)).normalized(); vel = v0 / massa * U; vz = voa * U; pos = Vector((0, 0, 0)); rot = 0.0; w = 0.0
    ang_alvo = math.radians(tilt) * min(1.0, v0 / 10.0); ax = d.cross(Vector((0, 0, 1)))
    for i in range(0, 90):
        ff = f + i; vel = max(0.0, vel - 0.9 * GA * U * DT * (1 if pos.z <= 0.001 else 0.15))
        if voa > 0:
            vz -= GA * U * DT; pos.z += vz * DT
            if pos.z < 0: pos.z = 0; vz = -vz * 0.35 if abs(vz) > 1.0 * U else 0.0
        pos = pos + d * vel * DT; pos.z = max(0, pos.z)
        w += (-40.0 * (rot - (ang_alvo if i < 3 else 0.0)) - 6.0 * w) * DT * (6 if voa == 0 else 0.5); rot += w * DT
        if voa > 0: rot += 6.0 * DT * (1 if vel > 0.5 * U else 0.1) * (1 if pos.z > 0 else 0.3)
        if i % 2 == 0: dm.location = l0 + pos; dm.rotation_euler = (r0.x + ax.x * rot, r0.y + ax.y * rot, r0.z); dm.keyframe_insert("location", frame=ff); dm.keyframe_insert("rotation_euler", frame=ff)

# ================================================================== ATAQUE PADRAO: 3 niveis
def montar_basico():
    random.seed(1)
    acao, fx = G.bake(BASE_ARM, "W_BasicoA", [dict(acao="W_Atk01_Bow", de=14, ate=72, saida=59), dict(acao="W_Atk01_Bow", de=14, ate=72, saida=59, alinha=True), dict(acao="W_Atk01_Bow", de=14, ate=72, saida=59, alinha=True)], emenda=3)
    N = fx[-1][1]; mf = maos("W_BasicoA", N); print("BASICO frames", N)
    sc, col, ref, arm = cena("BASICO", N + 120, acao); cams(sc, ref, (0, 9, 1.3)); dm = dummy(ref, "inimigo", (0, 13.0)); alvo = Vector((0, 13.0 * U, 1.2 * U))
    for k in range(3):
        f_n = fx[k][0] + 8; f_rel = fx[k][0] + (56 - 14); ang = {0: [0], 1: [-0.06, 0.06], 2: [-0.18, 0, 0.18]}[k]
        for j, a in enumerate(ang):
            O = mf[f_rel][0] + dir_mira(mf, f_rel) * 0.12 * U; Dj = Matrix.Rotation(a, 3, "Z") @ lanca_dir(O, alvo, 42.0)
            r = voo(col, "b%d_%d" % (k, j), mf, f_n if j == len(ang) // 2 else f_rel, f_rel, 42.0, dir_fixa=Dj, esc=0.9, alvos=[(0, 13.0)])
            for (ff, pp, i) in r["hits"]: impacto(col, "b%d_%d" % (k, j), ff, pp, 0.8); empurra(dm, ff, (0, 1), 2.0 + 1.0 * k, 1.0, 8.0)
    X.retarget(sc); return sc

# ================================================================== S1 TIRO PERFURANTE (nv 1): atravessa todos, perde 8% por alvo
def montar_perfurante():
    random.seed(2)
    acao, fx = G.bake(BASE_ARM, "W_Perfurante", [dict(acao="W_Atk01_Bow", de=10, ate=73, saida=44), dict(acao="W_Atk01_Bow", de=73, ate=73, saida=18)], emenda=0)
    N = fx[-1][1]; mf = maos("W_Perfurante", N); f_rel = fx[0][0] + int((56 - 10) / (63 / 44.0)); print("PERFURANTE release", f_rel, "total", N)
    sc, col, ref, arm = cena("S1_PERFURANTE", N + 100, acao); cams(sc, ref, (0, 10, 1.3), 1.15)
    ys = (6.5, 10.0, 13.5); ds = [dummy(ref, "inimigo%d" % i, (0, y)) for i, y in enumerate(ys)]
    r = voo(col, "p", mf, fx[0][0] + 6, f_rel, 70.0, alvo_pt=Vector((0, 13.5 * U, 1.25 * U)), esc=1.6, alvos=[(0, y) for y in ys], furar=True)
    for (ff, pp, i) in r["hits"]:
        impacto(col, "p%d" % i, ff, pp, 1.1); X.espinhos(col, "pe%d" % i, pp, ff, 14, 1.8, "g", 0.05, 16); empurra(ds[i], ff, (0, 1), 6.0 - i * 1.2, 1.0, 12.0)
    X.fenda(col, "marca_chao", (r["p_fim"].x, r["p_fim"].y, 0.4), r["f_fim"], 1.8, "c", 40, 0.0)
    for k in range(4): X.espinhos(col, "vento%d" % k, r["O"], f_rel, 8, 2.2, "b", 0.03, 10 + k * 3)
    X.retarget(sc); return sc

# ================================================================== S2 FLECHA-GANCHO (nv 5): mobilidade, puxa o arqueiro ate o ponto mirado
def perfil_puxada(dist_m, a=40.0, vmax=16.0):
    """perfil trapezoidal (aceleracao, cruzeiro, freada): s(t) em metros por quadro"""
    ta = vmax / a; sa = 0.5 * a * ta * ta
    if 2 * sa > dist_m: ta = math.sqrt(dist_m / a); vmax = a * ta; sa = 0.5 * a * ta * ta; tc = 0.0
    else: tc = (dist_m - 2 * sa) / vmax
    T = 2 * ta + tc; n = int(math.ceil(T * 48)); out = []
    for i in range(n + 1):
        t = i * DT
        if t < ta: s = 0.5 * a * t * t
        elif t < ta + tc: s = sa + vmax * (t - ta)
        else: u = max(0.0, T - t); s = dist_m - 0.5 * a * u * u
        out.append(min(dist_m, max(0.0, s)))
    return out
def montar_gancho():
    random.seed(3); DIST = 11.0; PUXA = DIST - 1.6
    perfil = perfil_puxada(PUXA); NP = len(perfil)
    acao, fx = G.bake(BASE_ARM, "W_Gancho", [dict(acao="W_Atk01_Bow", de=24, ate=73, saida=49), dict(acao="W_Run_Bow", de=0, ate=38, saida=NP + 1, alinha=True), dict(acao="W_AtkWait_Bow", de=0, ate=9, saida=30, alinha=True)], emenda=4)
    N = fx[-1][1]; mf = maos("W_Gancho", N); f_rel = fx[0][0] + (56 - 24); f_pull = fx[1][0]; print("GANCHO release", f_rel, "puxada", f_pull, NP, "total", N)
    sc, col, ref, arm = cena("S2_GANCHO", N + 60, acao); cams(sc, ref, (0, 6, 1.3), 1.0)
    X.caixa(ref, "poste", (0, DIST * U, 1.5 * U), (0.5 * U, 0.5 * U, 3.0 * U), M["poste"])
    r = voo(col, "g", mf, fx[0][0] + 4, f_rel, 60.0, alvo_pt=Vector((0, (DIST - 0.25) * U, 1.8 * U)), esc=1.0, alvos=[(0, DIST)], fica=N)
    f_cr = r["hits"][0][0] if r["hits"] else r["f_fim"]; p_ancora = r["hits"][0][1] if r["hits"] else r["p_fim"]; impacto(col, "gancho", f_cr, p_ancora, 0.9, False)
    arm.location = (0, 0, 0); arm.keyframe_insert("location", frame=f_pull - 1)
    for i, s in enumerate(perfil):                                                       # deslocamento com aceleracao e freada (o jogo faz o mesmo em codigo)
        arm.location = (0, s * U, 0); arm.keyframe_insert("location", frame=f_pull + i)
        if i % 3 == 0 and i < NP - 4: X.lascas(col, "poeira%d" % i, (0, s * U, 0.5), f_pull + i, 2, 0.06, 1.2, "pedra2", (10, 16)); X.brasas(col, "pb%d" % i, (0, s * U, 0.3 * U), f_pull + i, 2, 0.8, 0.8, (14, 26), "c", 0.1)
    X.onda(col, "ini", (0, 0), f_pull, 2.2, "c", 14, 0.6); X.onda(col, "fim", (0, PUXA * U), f_pull + NP, 2.4, "c", 16, 0.6); X.lascas(col, "pouso", (0, PUXA * U, 0.5), f_pull + NP, 6, 0.1, 2.4, "pedra2", (16, 26))
    seg = []                                                                              # corda: 10 segmentos com folga (catenaria) que estica ao cravar
    for k in range(10):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=4, radius1=0.012 * U, radius2=0.012 * U, depth=1.0); bmesh.ops.translate(bm, vec=(0, 0, 0.5), verts=bm.verts)
        o = X.para_obj(col, "corda%d" % k, bm, M["corda"]); o.rotation_mode = "QUATERNION"; seg.append(o)
    f_fim = f_pull + NP + 8
    for f in range(f_rel, f_fim + 1):
        s = perfil[min(f - f_pull, NP - 1)] if f >= f_pull else 0.0; L = mf[min(f, N)][0] + Vector((0, s * U, 0))
        A = r["path"][min(len(r["path"]) - 1, f - f_rel)][1] if f <= f_cr else p_ancora
        dist = (A - L).length; folga = max(0.0, 1.0 - (f - f_rel) / max(1.0, f_cr - f_rel + 6)) * 0.12 * dist if f < f_cr + 8 else 0.0
        pts = [L.lerp(A, k / 10.0) - Vector((0, 0, 4.0 * folga * (k / 10.0) * (1 - k / 10.0))) for k in range(11)]
        for k in range(10):
            a, b = pts[k], pts[k + 1]; d = b - a; seg[k].location = tuple(a); seg[k].rotation_quaternion = quat_de(d); seg[k].scale = (1, 1, max(1e-4, d.length))
            seg[k].keyframe_insert("location", frame=f); seg[k].keyframe_insert("rotation_quaternion", frame=f); seg[k].keyframe_insert("scale", frame=f)
    for o in seg: o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f_rel - 1); o.keyframe_insert("scale", frame=f_fim + 1)
    X.retarget(sc); return sc

# ================================================================== S3 TIRO ATORDOANTE (nv 10): carregado, com aviso, stun
def montar_atordoante():
    random.seed(4)
    acao, fx = G.bake(BASE_ARM, "W_AtordoanteA", [dict(acao="W_SpAtk01_Bow", de=125, ate=190, saida=66), dict(acao="W_SpAtk01_Bow", de=190, ate=190, saida=24)], emenda=0)
    N = fx[-1][1]; mf = maos("W_AtordoanteA", N); f_rel = fx[0][0] + (160 - 125); print("ATORDOANTE release", f_rel, "total", N)
    sc, col, ref, arm = cena("S3_ATORDOANTE", N + 120, acao); cams(sc, ref, (0, 9, 1.3)); dm = dummy(ref, "inimigo", (0, 13.0))
    O = mf[f_rel][0]
    av = X.plano_chao(col, "aviso", 14 * U, M["bh_c"], 0.5); av.scale = (0.03, 1, 1); av.location = (O.x, O.y + 7 * U, 0.5)
    X.esc(av, [(2, (1e-4,) * 3), (8, (0.05, 1, 1)), (f_rel - 1, (0.05, 1, 1)), (f_rel, (1e-4,) * 3)]); X.brilho_chao(col, "marca", (0, 13.0 * U), 6, 1.6, "o", f_rel - 6)
    r = voo(col, "a", mf, 1, f_rel, 55.0, alvo_pt=Vector((0, 13.0 * U, 1.25 * U)), esc=1.5, cor_pena="pena_o", alvos=[(0, 13.0)], v_cor="o")
    for (ff, p, i) in r["hits"]:
        impacto(col, "a", ff, p, 1.5); X.fenda(col, "af", (p.x, p.y, 0.45), ff, 3.0, "o", 40, 0.3); X.onda(col, "ao2", (p.x, p.y), ff + 3, 3.2, "o", 18, 0.6); X.lascas(col, "al", (p.x, p.y, 0.5), ff, 10, 0.14, 3.2)
        empurra(dm, ff, (0, 1), 8.0, 1.0, 14.0)
        for k in range(4):                                                                # stun 1,8 s: estrelas girando acima da cabeca
            s = X.sprite(col, "stun%d" % k, M["est_g"], 0.55 * U, (0, 0, 0)); T = int(1.8 * 48)
            for f2 in list(range(ff + 6, ff + 6 + T, 3)) + [ff + 6 + T]:
                t = (f2 - ff - 6) / 48.0; a = k * 1.5708 + t * 6; s.location = (dm.location.x + math.cos(a) * 0.5 * U, dm.location.y + math.sin(a) * 0.5 * U, 2.25 * U); s.keyframe_insert("location", frame=f2)
            X.esc(s, [(ff + 4, 0.0), (ff + 8, 1.0), (ff + 6 + T - 4, 1.0), (ff + 6 + T, 0.0)])
    X.retarget(sc); return sc

# ================================================================== S4 CHUVA DE FLECHAS (nv 20): arco apontado para cima; a flecha sobe, para no apice e cai acelerando
def montar_chuva():
    random.seed(5); TILT = 58.0
    incl = lambda t: TILT * min(1.0, t / 0.5) * (1.0 if t < 0.95 else max(0.0, 1.0 - (t - 0.95) / 0.05))
    pt = lambda g: [dict(acao="W_SpAtk02_Bow", de=40, ate=128, saida=89, inclina=incl, giro=g), dict(acao="W_SpAtk02_Bow", de=128, ate=128, saida=22, giro=g)]
    a0, fx0 = G.bake(BASE_ARM, "W_Chuva0", pt(None), emenda=0); mf0 = maos("W_Chuva0", fx0[-1][1]); d0 = dir_mira(mf0, fx0[0][0] + (123 - 40))
    delta = 90.0 - math.degrees(math.atan2(d0.y, d0.x)); print("CHUVA corrige a direcao do arco em", round(delta), "graus (o arco inclinado desvia do eixo da frente)")
    acao, fx = G.bake(BASE_ARM, "W_Chuva", pt(lambda t: delta), emenda=0)
    N = fx[-1][1]; mf = maos("W_Chuva", N); f_rel = fx[0][0] + (123 - 40); print("CHUVA release", f_rel, "total", N)
    sc, col, ref, arm = cena("S4_CHUVA", N + 130, acao)
    D0 = dir_mira(mf, f_rel); print("CHUVA inclinacao do arco no disparo (graus):", round(math.degrees(math.asin(D0.z))))
    r = voo(col, "sinal", mf, fx[0][0] + 20, f_rel, 24.0, dir_fixa=D0, esc=1.1, parar_chao=False, max_q=48, fica=0)
    path = r["path"]; i_ap = max(range(len(path)), key=lambda i: path[i][1].z); f_ap, P_ap = path[i_ap]; cx, cy = P_ap.x / U, P_ap.y / U; print("CHUVA area em", round(cx, 1), round(cy, 1), "apice m", round(P_ap.z / U, 1), "quadro", f_ap); cams(sc, ref, (cx * 0.55, cy * 0.55, 1.6), 1.5)
    X.brilho_chao(col, "area", (cx * U, cy * U), f_rel, 4.2, "c", f_ap - f_rel + 60); X.onda(col, "av", (cx * U, cy * U), f_rel + 4, 4.4, "c", 20, 0.6)
    X.clarao(col, "abre", P_ap, f_ap, 4.0, "b", 18); X.espinhos(col, "abre_e", P_ap, f_ap, 14, 1.4, "b", 0.04, 14)
    ds = [dummy(ref, "inimigo%d" % i, (cx + x, cy + y)) for i, (x, y) in enumerate(((-1.4, 0.6), (1.5, -0.8), (0.2, 1.8)))]
    nf = 26; H = P_ap.z / U
    for i in range(nf):
        a = random.uniform(0, 6.28); rr = 4.0 * math.sqrt(random.random()); aim = Vector((cx + math.cos(a) * rr, cy + math.sin(a) * rr, 0)); f0 = f_ap + 2 + int(i / nf * 40) + random.randint(0, 2)
        vz0 = -20.0; t_f = (-vz0 + math.sqrt(vz0 * vz0 + 2 * GA * H)) / GA; vh = Vector((aim.x - cx, aim.y - cy, 0)) / t_f
        p = Vector((cx * U, cy * U, P_ap.z)) + Vector((random.uniform(-.3, .3) * U, random.uniform(-.3, .3) * U, 0)); v = Vector((vh.x * U, vh.y * U, vz0 * U)); fl = cria_flecha(col, "ch%d" % i, 1.0, "pena"); f = f0; pts = []; qs = []
        while p.z > 0.10 * U and f < f0 + 60:
            pts.append((f, p.copy())); qs.append(quat_de(v)); v.z -= GA * U * DT; p = p + v * DT; f += 1
        pts.append((f, Vector((p.x, p.y, 0.1 * U)))); qs.append(quat_de(v)); qs = sinal_continuo(qs)
        for (ff, pp), q in zip(pts, qs): chave(fl, ff, pp, q)
        lado = v.cross(Vector((0, 0, 1))).normalized(); balanca(fl, f, pts[-1][1], qs[-1], lado, 0.25, dur=20); vivo(fl, f0, f + 70)
        X.clarao(col, "chc%d" % i, (p.x, p.y, 0.6 * U), f, 1.0, "b", 10); X.brasas(col, "chb%d" % i, (p.x, p.y, 0.4 * U), f, 2, 1.0, 0.8, (20, 40), "o", 0.1)
        if i % 5 == 0: X.onda(col, "cho%d" % i, (p.x, p.y), f, 0.9, "c", 10, 0.6)
        d3 = {ff: (pp, pp - v.normalized() * 1.1 * U) for ff, pp in pts}; d4 = {ff: (d3[ff][0] + Vector((0.07 * U, 0, 0)), d3[ff][0] - Vector((0.07 * U, 0, 0))) for ff in d3}; X.trilha(col, "chT%d" % i, d4, f0, f, 0.6, 2.4)
        for j, dd in enumerate(ds):
            if math.hypot(aim.x - dd.location.x / U, aim.y - dd.location.y / U) < 0.7: impacto(col, "chd%d_%d" % (i, j), f, Vector((aim.x * U, aim.y * U, 1.0 * U)), 0.7, False); empurra(dd, f, (aim.x - cx, aim.y - cy), 2.0, 1.0, 6.0)
    X.fenda(col, "marca", (cx * U, cy * U, 0.45), f_ap + 8, 4.4, "c", 80, 0.5)
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
    N = fx[-1][1]; mf = maos("W_Falcao", N); f_rel = fx[1][0] + int((56 - 24) / (49 / 45.0)); print("FALCAO release", f_rel, "total", N)
    sc, col, ref, arm = cena("S5_FALCAO", N + 100, acao); cams(sc, ref, (0, 5, 1.3), 1.0); ds = [dummy(ref, "inimigo%d" % i, (0, y)) for i, y in enumerate((8.0, 11.5))]
    F0 = 10
    X.onda(col, "b1", (0, 0), F0, 4.2, "g", 22, 0.6); X.onda(col, "b2", (0, 0), F0 + 6, 2.8, "c", 22, 0.6); X.brilho_chao(col, "area", (0, 0), F0, 2.4, "c", f_rel - F0 + 30)
    ol = X.para_obj(col, "olho", bm_olho(0.55 * U), M["bh_g"]); ol.location = (0, 0, 2.7 * U); pu = X.sprite(col, "pupila", M["est_b"], 0.75 * U, (0, 0, 2.7 * U))
    X.esc(ol, [(F0 - 1, 0.0), (F0 + 8, 1.0), (f_rel + 20, 1.0), (f_rel + 32, 0.0)]); X.esc(pu, [(F0, 0.0), (F0 + 9, 1.0), (f_rel + 20, 1.0), (f_rel + 32, 0.0)])
    k = ol.constraints.new("TRACK_TO"); k.name = "GW_BB"; k.track_axis = "TRACK_Z"; k.up_axis = "UP_Y"
    for i in range(10):
        a0 = i * 0.628; s = X.sprite(col, "pena%d" % i, M["est_c"], 0.5 * U, (0, 0, 0))
        for ff in list(range(F0, f_rel + 24, 3)): t = (ff - F0) / 48.0; a = a0 + t * 4; s.location = (math.cos(a) * 1.0 * U, math.sin(a) * 1.0 * U, 1.0 * U + 0.9 * U * math.sin(t * 2 + a0)); s.keyframe_insert("location", frame=ff)
        X.esc(s, [(F0, 0.0), (F0 + 8 + i, 1.0), (f_rel + 14, 1.0), (f_rel + 26, 0.0)])
    r = voo(col, "f", mf, fx[1][0] + 4, f_rel, 62.0, alvo_pt=Vector((0, 11.5 * U, 1.25 * U)), esc=1.3, cor_pena="pena_o", alvos=[(0, 8.0), (0, 11.5)], furar=True, v_cor="g")
    for (ff, p, i) in r["hits"]:
        impacto(col, "f%d" % i, ff, p, 1.2); X.clarao(col, "fcrit%d" % i, p + Vector((0, 0, 0.8 * U)), ff + 2, 2.6, "g", 16); empurra(ds[i], ff, (0, 1), 5.0, 1.0, 10.0)
    X.retarget(sc); return sc

# ================================================================== S6 TIRO DE ELITE (nv 30): carga longa, flecha gigante; efeito no chao SO quando acerta
def montar_elite():
    random.seed(7)
    acao, fx = G.bake(BASE_ARM, "W_Elite", [dict(acao="W_SpAtk01_Bow", de=0, ate=190, saida=191), dict(acao="W_SpAtk01_Bow", de=190, ate=190, saida=26)], emenda=0)
    N = fx[-1][1]; mf = maos("W_Elite", N); f_rel = fx[0][0] + 160; print("ELITE release", f_rel, "total", N)
    sc, col, ref, arm = cena("S6_ELITE", N + 130, acao); cams(sc, ref, (0, 14, 1.4), 1.9); dm = dummy(ref, "inimigo", (0, 26.0))
    for i in range(16):                                                                   # carga: energia convergindo na flecha, no ar (nada no chao)
        f0 = 50 + i * 6; a = random.uniform(0, 6.28); s = X.sprite(col, "carga%d" % i, M["est_c"], 0.7 * U, (0, 0, 0)); dur = 28
        for ff in range(f0, f0 + dur + 1, 2):
            t = (ff - f0) / dur; c = mf[min(max(ff, 1), N)][0]; rr = (1 - t) * 1.6 * U
            s.location = (c.x + math.cos(a + t * 3) * rr, c.y + math.sin(a + t * 3) * rr * 0.6, c.z + math.sin(a + t * 3) * rr * 0.8); s.keyframe_insert("location", frame=ff)
        X.esc(s, [(f0 - 1, 0.0), (f0 + 4, 1.0), (f0 + dur - 3, 0.8), (f0 + dur, 0.0)])
    r = voo(col, "elite", mf, 56, f_rel, 95.0, alvo_pt=Vector((0, 26.0 * U, 1.3 * U)), esc=3.2, cor_pena="pena_o", alvos=[(0, 26.0)], v_cor="g")
    D = r["D"]; Lm = 28.0 * U; mira = X.para_obj(col, "mira_ar", X.bm_feixe(0.015 * U, 0.015 * U, Lm, 4), M["coluna_c"]); mira.location = tuple(r["O"]); X.apunta(mira, D)
    X.esc(mira, [(60, (1e-4,) * 3), (80, (1, 1, 0.1)), (f_rel - 6, (1, 1, 1.0)), (f_rel, (3, 3, 1.0)), (f_rel + 1, (1e-4,) * 3)])
    X.espinhos(col, "disp", r["O"], f_rel, 40, 3.5, "b", 0.05, 16); X.clarao(col, "disp_c", r["O"], f_rel, 5.0, "g", 22)
    for (ff, p, i) in r["hits"]:                                                          # tudo que toca o chao acontece so aqui, no acerto
        X.clarao(col, "ex1", p, ff, 8.0, "b", 26); X.clarao(col, "ex2", p, ff + 2, 5.0, "g", 28); X.espinhos(col, "ex_e", p, ff, 40, 3.2, "b", 0.07, 20); X.espinhos(col, "ex_e2", p, ff, 18, 2.2, "o", 0.06, 24)
        ch = (p.x, p.y, 0.45); X.fenda(col, "ex_f", ch, ff, 7.0, "o", 80, 0.0); X.fenda(col, "ex_f2", ch, ff + 3, 4.5, "c", 70, 1.1); X.onda(col, "ex_o1", (p.x, p.y), ff, 8.0, "o", 26, 0.6); X.onda(col, "ex_o2", (p.x, p.y), ff + 5, 5.4, "c", 24, 0.6); X.onda(col, "ex_o3", (p.x, p.y), ff + 10, 3.4, "g", 22, 0.6)
        X.lascas(col, "ex_l", ch, ff, 36, 0.24, 5.5, "pedra", (36, 64)); X.brasas(col, "ex_b", p, ff, 70, 3.6, 3.0, (40, 90), "o", 0.18); X.coluna(col, "ex_c", ch, ff, 9.0, 1.4, "coluna_o", 34, 3.0)
        empurra(dm, ff, (D.x, D.y), 24.0, 1.0, 40.0, voa=6.0)
    X.retarget(sc); return sc

CENAS = [("BASICO", montar_basico), ("S1_PERFURANTE", montar_perfurante), ("S2_GANCHO", montar_gancho), ("S3_ATORDOANTE", montar_atordoante), ("S4_CHUVA", montar_chuva), ("S5_FALCAO", montar_falcao), ("S6_ELITE", montar_elite)]
cenas = []
for nome, fn in CENAS:
    if ONLY and ONLY not in nome: continue
    cenas.append(fn()); print("cena pronta", nome, len(cenas[-1].objects), "objetos")
for sc_ in cenas:                                                                          # efeitos nao projetam sombra (milhares de flechas/faiscas estouravam o buffer de sombras do EEVEE)
    for o in sc_.objects:
        if o.type == "MESH" and any(c.name.endswith("_FX") for c in o.users_collection) and not (o.parent and o.parent.type == "ARMATURE") and not o.name.endswith("_espada"):
            try: o.visible_shadow = False
            except Exception: pass
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
