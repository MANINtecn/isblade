"""Skill 5 - Correntes (Chain Pull): escudo cravado no chao, sem salto (impacto no frame 70).
Correntes em cone de 45 graus, 14 m (342 unidades), garras que prendem e arrastam o alvo. 48 fps."""
import bpy, math, random, bmesh
from mathutils import Matrix, Vector, Quaternion
V = Vector
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_src = open(_dir + "atk.py").read()
DY_O = 2.0
exec(_src.split("ATKS = {")[0])                                   # arm, SH, PB, V, helpers
_fx = open(_dir + "atk_fx2.py").read(); _s2 = open(_dir + "skill2_fx.py").read(); _s3 = open(_dir + "skill3_fx.py").read()
rng = random.Random(55)
GOLD = (1.0, 0.78, 0.25, 1); WHITE = (1.0, 0.96, 0.85, 1); ICE = (0.6, 0.85, 1.0, 1); DUST = (0.55, 0.5, 0.42, 1)
exec(_fx[_fx.index("def mesh_spike"):_fx.index("# ======================= ATK 1")])
exec(_fx[_fx.index("# --- pedra realista"):_fx.index("cr = fx_obj('A3_CraterDark'")])
exec(_s2[_s2.index("def vis("):_s2.index("emp = bpy.data.objects.new('Aegis_Swirl'")])
exec(_s2[_s2.index("def sparks2("):_s2.index("sparks2(cS, 'S2_Burst'")])
exec(_s3[_s3.index("def flat_ring("):_s3.index("rings = []")])
STEEL = (0.75, 0.78, 0.82, 1); PS = (0.14, 0.0, 0.45, 1); PM = (0.75, 0.25, 1.0, 1); PW = (0.95, 0.82, 1.0, 1); PD = (0.45, 0.08, 0.9, 1)
OR = (1.0, 0.40, 0.05, 1); OW = (1.0, 0.74, 0.30, 1)       # brasa laranja e laranja claro (o dourado ja e do rugido)
IMP = 70; RANGE = 342.0                                          # 14 m

# ---------- acao: ergue o escudo e finca a ponta no chao (sem salto) ----------
exec(open(_dir + "skill5_anim.py").read())
sc = bpy.context.scene

_c = bpy.data.collections.get('FX_Skill5_Chains')
if _c:
    for _o in list(_c.objects): bpy.data.objects.remove(_o, do_unlink=True)
    bpy.data.collections.remove(_c)
cS = fx_collection('FX_Skill5_Chains')
for _m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(_m)

# ---------- ponto de impacto ----------
sc.frame_set(0); bpy.context.view_layer.update()
CTR = V(((PB['bip01_l_foot'].head.x + PB['bip01_r_foot'].head.x) / 2, (PB['bip01_l_foot'].head.y + PB['bip01_r_foot'].head.y) / 2, 0))
sc.frame_set(IMP); bpy.context.view_layer.update()
_low = sorted([(SH.matrix_world @ v.co) for v in SH.data.vertices], key=lambda q: q.z)[:30]
GI = V((sum(q.x for q in _low) / len(_low), sum(q.y for q in _low) / len(_low), 0.3))
sc.frame_set(0)
FWD = V((0, -1, 0))
O = GI + V((0, -4, 4))                                          # origem das correntes (a frente do escudo)

# ---------- alvo de teste (so para ver o puxao) ----------
HIT_D = 244.0                                                    # alvo a ~10 m
TGT0 = V((O.x, O.y - HIT_D, 0))
TGT1 = V((O.x, O.y - 44.0, 0))                                   # chega colado a frente dele
tm = bpy.data.materials.new('S5_TargetMat'); tm.use_nodes = True
_b = next(n for n in tm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); _b.inputs['Base Color'].default_value = (0.58, 0.46, 0.36, 1); _b.inputs['Roughness'].default_value = 0.85
def _part(bm, kind, c, size, r1=None, r2=None):
    if kind == 'cone': bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=r1, radius2=r2, depth=size, matrix=Matrix.Translation(c))
    elif kind == 'sphere': bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=size, matrix=Matrix.Translation(c))
    else: bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
bm_t = bmesh.new()                                   # manequim humano (alvo), de frente para +Y (para o Guardiao), ~38 de altura
for sx in (-1, 1):
    _part(bm_t, 'cone', (sx * 2.5, 0, 8.5), 16.0, 1.7, 2.5)                 # perna
    _part(bm_t, 'box', (sx * 2.5, 1.2, 1.0), (3.2, 6.0, 2.0))               # pe
    _part(bm_t, 'cone', (sx * 6.6, 0, 22.5), 11.0, 1.2, 1.7)                # braco
    _part(bm_t, 'sphere', (sx * 5.3, 0, 28.2), 2.1)                         # ombro
    _part(bm_t, 'sphere', (sx * 6.8, 0, 16.6), 1.5)                         # mao
_part(bm_t, 'box', (0, 0, 17.8), (8.6, 4.6, 3.4))                            # quadril
_part(bm_t, 'cone', (0, 0, 24.0), 12.0, 3.9, 4.9)                            # tronco
_part(bm_t, 'cone', (0, 0, 31.2), 2.8, 1.3, 1.5)                             # pescoco
_part(bm_t, 'sphere', (0, 0.2, 35.0), 3.4)                                   # cabeca
_part(bm_t, 'box', (0, 3.3, 34.6), (0.9, 1.4, 1.5))                          # nariz (marca a frente)
bmesh.ops.scale(bm_t, vec=(1.0, 0.8, 1.0), verts=[v for v in bm_t.verts if 17.0 < v.co.z < 31.0 and abs(v.co.x) < 5.0], space=Matrix.Identity(4))
me_t = bpy.data.meshes.new('S5_Target'); bm_t.to_mesh(me_t); bm_t.free(); me_t.materials.append(tm)
for _p in me_t.polygons: _p.use_smooth = True
tgt = bpy.data.objects.new('S5_Target_dummy', me_t); cS.objects.link(tgt)

# ---------- caminho caotico de cada corrente ----------
def chain_path(angle, L, seed, n=64, calm_end=False):
    r = random.Random(seed); f1, f2, f3 = r.uniform(0.03, 0.06), r.uniform(0.07, 0.13), r.uniform(0.04, 0.09)
    p1, p2, p3 = r.uniform(0, 6.28), r.uniform(0, 6.28), r.uniform(0, 6.28)
    d = Matrix.Rotation(angle, 3, 'Z') @ FWD; side = V((-d.y, d.x, 0))
    pts = []
    for i in range(n + 1):
        s = L * i / n; u = s / L
        amp = (0.07 + 0.2 * u ** 0.8) * s
        lat = amp * math.sin(s * f1 + p1) + 0.35 * amp * math.sin(s * f2 + p2)
        up = 5.0 + (0.1 + 0.16 * u) * s * (0.5 + 0.5 * math.sin(s * f3 + p3)) + 0.25 * amp * math.sin(s * f2 + p1)
        pts.append(O + d * s + side * lat + V((0, 0, max(up, 1.8))))
    return pts

def ribbon_path_mesh(pts, w=1.5):
    """corrente de elos quadrados de quinas cortadas, 3D: cada elo e uma peca unica oca (alternando 90 graus). u do UV = posicao ao longo da corrente"""
    hw = w * 0.62; hl = hw * 1.6; b = hw * 0.55; d = hw * 0.55; pitch = 2 * (hl - b) * 0.98
    cum = [0.0]
    for i in range(1, len(pts)): cum.append(cum[-1] + (pts[i] - pts[i - 1]).length)
    Ltot = cum[-1]; nl = max(3, int(Ltot / pitch))
    def at(sv):
        k = 1
        while k < len(cum) - 1 and cum[k] < sv: k += 1
        t = (sv - cum[k - 1]) / max(cum[k] - cum[k - 1], 1e-6)
        return pts[k - 1].lerp(pts[k], max(0.0, min(1.0, t))), (pts[k] - pts[k - 1]).normalized()
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UV'); linkfaces = []
    cc = hw * 0.32                                                    # corte das quinas (no contorno do elo)
    e = 0.30 * min(b, d)                                              # corte das arestas laterais (chanfro polido)
    k45 = 0.586

    def octa(hx, hy, ch):
        return [(hx - ch, hy), (-(hx - ch), hy), (-hx, hy - ch), (-hx, -(hy - ch)), (-(hx - ch), -hy), (hx - ch, -hy), (hx, -(hy - ch)), (hx, hy - ch)]
    O0 = octa(hl, hw, cc); O1 = octa(hl - e, hw - e, cc - k45 * e)              # contorno de fora: parede e topo (recuado)
    I0 = octa(hl - b, hw - b, cc * 0.6); I1 = octa(hl - b + e, hw - b + e, cc * 0.6 + k45 * e)   # furo: parede e boca (aberta)
    zw = d / 2 - e; zt = d / 2
    for i in range(nl):
        c, T = at((i + 0.5) * Ltot / nl)
        Aax = T.cross(V((0, 0, 1)))
        if Aax.length < 0.1: Aax = V((1, 0, 0))
        Aax.normalize(); Bax = T.cross(Aax).normalized()
        S, D = (Aax, Bax) if i % 2 == 0 else (Bax, Aax)
        ring = lambda poly, z: [bm.verts.new(c + T * q[0] + S * q[1] + D * z) for q in poly]
        o1f, o0f, o0b, o1b = ring(O1, zt), ring(O0, zw), ring(O0, -zw), ring(O1, -zt)
        i1f, i0f, i0b, i1b = ring(I1, zt), ring(I0, zw), ring(I0, -zw), ring(I1, -zt)
        flat, bevel = [], []
        for k in range(8):
            n_ = (k + 1) % 8
            flat.append(bm.faces.new((o0f[k], o0f[n_], o0b[n_], o0b[k])))              # parede de fora
            bevel.append(bm.faces.new((o1f[k], o1f[n_], o0f[n_], o0f[k])))             # chanfro de fora (frente)
            bevel.append(bm.faces.new((o0b[k], o0b[n_], o1b[n_], o1b[k])))             # chanfro de fora (tras)
            flat.append(bm.faces.new((o1f[k], o1f[n_], i1f[n_], i1f[k])))              # topo da frente
            flat.append(bm.faces.new((o1b[n_], o1b[k], i1b[k], i1b[n_])))              # topo de tras
            bevel.append(bm.faces.new((i1f[n_], i1f[k], i0f[k], i0f[n_])))             # chanfro do furo (frente)
            bevel.append(bm.faces.new((i0b[n_], i0b[k], i1b[k], i1b[n_])))             # chanfro do furo (tras)
            flat.append(bm.faces.new((i0f[n_], i0f[k], i0b[k], i0b[n_])))              # parede do furo
        for f in flat:
            for l in f.loops: l[uv].uv = (i / nl, 0.0)
        for f in bevel:
            for l in f.loops: l[uv].uv = (i / nl, 1.0)                                  # v=1 marca o chanfro (o material pinta de prata polida)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('chain'); bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = False
    return me

def claw_mesh():
    """garra solida: cubo central e 4 dedos curvos afilados (3D, para ter volume)"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((3.6, 2.4, 3.6, 1.0)) @ Matrix.Translation((0, -0.2, 0)))
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        R = V((math.cos(a), 0, math.sin(a))); Tg = V((-math.sin(a), 0, math.cos(a)))
        path = [(V((0, 0.4, 0)) + R * 1.7, 1.25), (V((0, 3.6, 0)) + R * 4.2, 0.95), (V((0, 6.6, 0)) + R * 3.0, 0.7), (V((0, 9.2, 0)) + R * 1.0, 0.08)]
        rings = [[bm.verts.new(pt + R * (sa * r) + Tg * (sb * r)) for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1))] for pt, r in path]
        for m in range(len(rings) - 1):
            for q in range(4): bm.faces.new((rings[m][q], rings[m][(q + 1) % 4], rings[m + 1][(q + 1) % 4], rings[m + 1][q]))
        bm.faces.new(rings[0])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new('claw'); bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = False
    return me

def link_shape_builder(store, nlinks):
    """so a revelacao ao longo da corrente (a forma agora e geometria real)"""
    def build(nt):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['UV'], sp.inputs[0])
        hv = nt.nodes.new('ShaderNodeValue'); store['head'] = hv
        lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; nt.links.new(sp.outputs['X'], lt.inputs[0]); nt.links.new(hv.outputs[0], lt.inputs[1])
        return lt.outputs[0]
    return build

def tint_chain(ob, store, base=(0.012, 0.013, 0.018, 1), hi=(0.38, 0.41, 0.48, 1), st=1.0):
    """aco com volume: o tom varia com a direcao da face em relacao a uma luz fixa (emissivo nao tem sombra)"""
    nt = ob.active_material.node_tree
    em = next(n for n in nt.nodes if n.type == 'EMISSION')
    gn = nt.nodes.new('ShaderNodeNewGeometry')
    dt = nt.nodes.new('ShaderNodeVectorMath'); dt.operation = 'DOT_PRODUCT'; dt.inputs[1].default_value = (0.74, 0.32, 0.45)
    nt.links.new(gn.outputs['Normal'], dt.inputs[0])
    mp = nt.nodes.new('ShaderNodeMapRange'); mp.clamp = True; mp.inputs['From Min'].default_value = -0.45; mp.inputs['From Max'].default_value = 0.85
    nt.links.new(dt.outputs['Value'], mp.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = base; mx.inputs['B'].default_value = hi
    nt.links.new(mp.outputs['Result'], mx.inputs['Factor'])
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    fp = nt.nodes.new('ShaderNodeMath'); fp.operation = 'POWER'; fp.inputs[1].default_value = 2.5; nt.links.new(lw.outputs['Fresnel'], fp.inputs[0])
    ad = nt.nodes.new('ShaderNodeMix'); ad.data_type = 'RGBA'; ad.blend_type = 'ADD'; ad.inputs['B'].default_value = (0.9, 0.95, 1.0, 1)
    tc2 = nt.nodes.new('ShaderNodeTexCoord'); sp2 = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc2.outputs['UV'], sp2.inputs[0])
    sv = nt.nodes.new('ShaderNodeMix'); sv.data_type = 'RGBA'; sv.inputs['A'].default_value = (0.52, 0.55, 0.62, 1); sv.inputs['B'].default_value = (1.0, 1.02, 1.08, 1)
    nt.links.new(mp.outputs['Result'], sv.inputs['Factor'])
    pol = nt.nodes.new('ShaderNodeMix'); pol.data_type = 'RGBA'
    nt.links.new(mx.outputs['Result'], pol.inputs['A']); nt.links.new(sv.outputs['Result'], pol.inputs['B']); nt.links.new(sp2.outputs['Y'], pol.inputs['Factor'])
    nt.links.new(pol.outputs['Result'], ad.inputs['A']); nt.links.new(fp.outputs[0], ad.inputs['Factor'])
    nt.links.new(ad.outputs['Result'], em.inputs['Color'])
    em.inputs['Strength'].default_value = st

def tint_claw(ob):
    nt = ob.active_material.node_tree
    em = next(n for n in nt.nodes if n.type == 'EMISSION')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.3
    fp = nt.nodes.new('ShaderNodeMath'); fp.operation = 'POWER'; fp.inputs[1].default_value = 1.6; nt.links.new(lw.outputs['Fresnel'], fp.inputs[0])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = (0.05, 0.0, 0.22, 1); mx.inputs['B'].default_value = (0.38, 0.02, 0.85, 1)
    nt.links.new(fp.outputs[0], mx.inputs['Factor']); nt.links.new(mx.outputs['Result'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.4

def solid(ob):
    """metal opaco: sem mistura por transparencia (que deixava os elos ocos/transparentes por tras uns dos outros)"""
    m = ob.active_material
    try: m.surface_render_method = 'DITHERED'
    except Exception: pass
    m.use_backface_culling = True

def ease_out(t): return 1 - (1 - t) ** 2.0
T_FLY = 30.0
def reveal(f, L):                                    # comprimento revelado da corrente no frame f (voo)
    t = max(0.0, min(1.0, (f - IMP) / T_FLY)); return min(RANGE * ease_out(t), L)

# frame em que a corrente do alvo o alcanca
f_hit = next(f for f in range(IMP, IMP + 60) if reveal(f, 9999) >= HIT_D)
F_PULL0, F_PULL1 = f_hit + 5, f_hit + 38
print('alvo alcancado no frame', f_hit, '| puxao', F_PULL0, '->', F_PULL1)

def put_claw(claw, f, pos, tan, sc_=1.0):
    q = V((0, 1, 0)).rotation_difference(tan)
    claw.location = pos; claw.rotation_mode = 'QUATERNION'; claw.rotation_quaternion = q; claw.scale = (sc_ * 1.9,) * 3
    claw.keyframe_insert('location', frame=f); claw.keyframe_insert('rotation_quaternion', frame=f); claw.keyframe_insert('scale', frame=f)

def key_val(store, f, v):
    o = store['head'].outputs[0]; o.default_value = v; o.keyframe_insert('default_value', frame=f)

# ---------- 6 correntes soltas (cone de 45 graus) + 1 que prende o alvo ----------
NCH = 6
angles = [math.radians(-22.5 + 45 * (k + 0.5) / NCH) + math.radians(rng.uniform(-1.5, 1.5)) for k in range(NCH)]
for k, ang in enumerate(angles):
    if abs(ang) < math.radians(2.5): ang += math.radians(4) * (1 if k % 2 else -1)
    L = rng.uniform(230, RANGE); pts = chain_path(ang, L, 100 + k)
    ch = fx_obj(f'S5_Chain{k}', ribbon_path_mesh(pts, 5.6), cS, STEEL, 1.1)
    st = {}; rewire(ch, link_shape_builder(st, max(8, int(L / 15.0)))); tint_chain(ch, st); solid(ch)
    key_val(st, IMP - 1, 0.0); key_val(st, IMP + 1, 0.0)
    f_end = IMP + int(T_FLY * (1 - (1 - L / RANGE) ** 0.5)) if L < RANGE else IMP + int(T_FLY)
    for f in range(IMP + 2, f_end + 1, 2): key_val(st, f, min(reveal(f, L) / L, 1.0))
    hold = IMP + int(T_FLY) + 4; back = hold + 22                     # todas recolhem juntas (antes a mais longa ficava para tras)
    key_val(st, hold, 1.0)
    for f in range(hold + 2, back + 1, 2): key_val(st, f, 1.0 - ((f - hold) / (back - hold)) ** 1.6)
    key_val(st, back + 1, 0.0)
    fx_key(ch, IMP - 1, loc=V((0, 0, 0)), scale=(0, 0, 0), alpha=0)
    fx_key(ch, IMP, loc=V((0, 0, 0)), scale=(1, 1, 1), alpha=1.0)
    fx_key(ch, back, scale=(1, 1, 1), alpha=1.0)
    fx_key(ch, back + 1, scale=(0, 0, 0), alpha=0)
    claw = fx_obj(f'S5_Claw{k}', claw_mesh(), cS, PS, 0.7); tint_claw(claw); solid(claw)
    fx_key(claw, IMP - 1, loc=pts[0], scale=(0, 0, 0), alpha=0)
    pos_at = lambda s_: pts[min(int(s_ / L * (len(pts) - 1) + 0.5), len(pts) - 1)]
    def tan_at(s_):
        i = min(int(s_ / L * (len(pts) - 1) + 0.5), len(pts) - 2); return (pts[i + 1] - pts[max(i - 1, 0)]).normalized()
    for f in list(range(IMP + 2, f_end + 1, 2)) + [hold]:
        s_ = reveal(f, L) if f <= f_end else L
        put_claw(claw, f, pos_at(s_), tan_at(s_), 1.0)
    for f in range(hold + 2, back + 1, 2):
        s_ = L * (1.0 - ((f - hold) / (back - hold)) ** 1.6)
        put_claw(claw, f, pos_at(s_), tan_at(s_), 0.8)
    fx_key(claw, IMP, alpha=1.0); fx_key(claw, back, alpha=1.0); fx_key(claw, back + 1, scale=(0, 0, 0), alpha=0)

# ---------- a corrente que prende o alvo (reta, com leve balanco) ----------
hd = (TGT0 - O); hd.z = 0; hd.normalize()                         # TGT0 provisorio: so a direcao
Lh = HIT_D; npts = 64; loc_pts = []
for i in range(npts + 1):
    s = Lh * i / npts; u = s / Lh
    loc_pts.append(V((3.5 * math.sin(u * 9) * math.sin(math.pi * u), s, 6.0 + 18.0 * (1 - (1 - min(u / 0.25, 1.0)) ** 2) + 2.5 * math.sin(u * 7) * math.sin(math.pi * u) ** 0.6)))
hit = fx_obj('S5_ChainHit', ribbon_path_mesh(loc_pts, 6.2), cS, STEEL, 1.2)
stH = {}; rewire(hit, link_shape_builder(stH, max(8, int(Lh / 15.0)))); tint_chain(hit, stH, st=1.2); solid(hit)
qh = Quaternion((0, 0, 1), math.atan2(hd.y, hd.x) - math.pi / 2)      # so gira no chao (rotation_difference virava o eixo Z de cabeca para baixo)
hit.rotation_mode = 'QUATERNION'; hit.rotation_quaternion = qh
def ease_io(t): return t * t * (3 - 2 * t)
D_END = (O - TGT1).length                                           # distancia final da garra (alvo colado ao escudo)
def hit_world(d):                                                   # ponto da corrente a d de distancia da origem (a garra fica ali)
    i = min(int(d / Lh * npts + 0.5), npts); lp = loc_pts[i]
    return O + qh @ V((lp.x, lp.y, lp.z))
hit.location = O
# a corrente NAO e esticada/achatada: ela e encurtada de verdade (a revelacao dos elos acompanha a garra)
R0, R1 = F_PULL1 + 2, F_PULL1 + 18                                  # solta o alvo e recolhe, junto com as outras
key_val(stH, IMP - 1, 0.0); key_val(stH, IMP + 1, 0.0)
for f in range(IMP + 2, f_hit + 1, 2): key_val(stH, f, min(reveal(f, 9999) / Lh, 1.0))
key_val(stH, f_hit + 1, 1.0); key_val(stH, F_PULL0, 1.0)
dist_at = {}
for f in range(F_PULL0 + 2, F_PULL1 + 1, 2):
    t = ease_io((f - F_PULL0) / (F_PULL1 - F_PULL0)); dist_at[f] = Lh + (D_END - Lh) * t
    key_val(stH, f, dist_at[f] / Lh)
for f in range(R0 + 2, R1 + 1, 2):
    t = ease_io((f - R0) / (R1 - R0)); dist_at[f] = D_END * (1.0 - t); key_val(stH, f, dist_at[f] / Lh)
key_val(stH, R1 + 1, 0.0)
fx_key(hit, IMP - 1, loc=O, scale=(0, 0, 0), alpha=0)
fx_key(hit, IMP, loc=O, scale=(1, 1, 1), alpha=1.0)
fx_key(hit, R1, scale=(1, 1, 1), alpha=1.0)
fx_key(hit, R1 + 1, scale=(0, 0, 0), alpha=0)
hclaw = fx_obj('S5_ClawHit', claw_mesh(), cS, PS, 0.8); tint_claw(hclaw); solid(hclaw)
fx_key(hclaw, IMP - 1, loc=O, scale=(0, 0, 0), alpha=0)
fx_key(hclaw, IMP, alpha=1.0)
for f in range(IMP + 2, f_hit + 1, 2):
    s_ = min(reveal(f, 9999), Lh); put_claw(hclaw, f, hit_world(s_), hd, 1.0)
for f in range(f_hit + 2, f_hit + 8, 2): put_claw(hclaw, f, hit_world(Lh), hd, 1.0 - 0.45 * (f - f_hit) / 6.0)
for f in sorted(dist_at): put_claw(hclaw, f, hit_world(dist_at[f]), hd, 0.55 if f <= F_PULL1 else 0.55 * (1.0 - 0.6 * (f - R0) / (R1 - R0)))
fx_key(hclaw, R1, alpha=1.0); fx_key(hclaw, R1 + 1, scale=(0, 0, 0), alpha=0)

# movimento do alvo (segue a garra, que o segura no peito)
def tgt_at(d): c_ = hit_world(d); return V((c_.x, c_.y, 0.0))
TGT0 = tgt_at(Lh); TGT1 = tgt_at(D_END)
tgt.location = TGT0; tgt.rotation_mode = 'XYZ'
tgt.keyframe_insert('location', frame=0); tgt.keyframe_insert('scale', frame=0); tgt.keyframe_insert('rotation_euler', frame=0)
for f in range(f_hit, f_hit + 6, 2):                                   # tranco ao ser preso
    tgt.location = TGT0 + V((rng.uniform(-1, 1), 0, 0)); tgt.rotation_euler = (math.radians(rng.uniform(-3, 3)), 0, 0); tgt.keyframe_insert('location', frame=f); tgt.keyframe_insert('rotation_euler', frame=f)
for f in range(F_PULL0, F_PULL1 + 1, 2):
    t = ease_io((f - F_PULL0) / (F_PULL1 - F_PULL0))
    tgt.location = tgt_at(Lh + (D_END - Lh) * t); tgt.rotation_euler = (math.radians(-16) * math.sin(math.pi * t) - math.radians(8), 0, 0)
    tgt.keyframe_insert('location', frame=f); tgt.keyframe_insert('rotation_euler', frame=f)
tgt.location = TGT1; tgt.rotation_euler = (math.radians(-6), 0, 0)
for f in (F_PULL1 + 6, F_PULL1 + 20):
    tgt.keyframe_insert('location', frame=f); tgt.keyframe_insert('rotation_euler', frame=f)

# poeira arrastando o alvo e impacto na chegada
for k in range(10):
    f = F_PULL0 + 2 + k * 3; t = ease_io((f - F_PULL0) / (F_PULL1 - F_PULL0)); p = TGT0 * (1 - t) + TGT1 * t
    puff(cS, f'S5_Drag{k}', p + V((rng.uniform(-4, 4), rng.uniform(-2, 4), 2)), f, rng.uniform(4, 7), V((rng.uniform(-5, 5), 6, 3)))
wave_ring(cS, 'S5_ArriveWave0', TGT1, F_PULL1, 34, 18, OW, 4.0, peak=0.9)
wave_ring(cS, 'S5_ArriveWave1', TGT1, F_PULL1, 24, 18, OR, 3.0, lag=3, peak=0.7)
sparks2(cS, 'S5_ArriveSpark', TGT1 + V((0, 0, 20)), V((0, 1, 0.3)), F_PULL1, 14, 28, OW, spread=1.6, dur=(10, 16))
star(cS, 'S5_ArriveStar', TGT1 + V((0, 0, 20)), F_PULL1, 22, OW, 4)

# ---------- impacto do escudo no chao (frame 70) ----------
star(cS, 'S5_Star', GI + V((0, 0, 8)), IMP, 20, OR, 2.4)
glow_disc(cS, 'S5_Glow', GI + V((0, -1, 8)), V((0, -1, 0.2)), IMP, 16, OR, 1.2)
for i, (lag, mx, cc) in enumerate(((0, 96, OR), (4, 62, OR))):
    wave_ring(cS, f'S5_Wave{i}', GI, IMP, mx, 26, cc, 2.6, lag=lag, peak=0.95 - 0.15 * i)
sparks2(cS, 'S5_Burst', GI + V((0, 0, 2)), V((0, -1, 0.4)), IMP, 18, 36, OR, spread=2.0)
for k in range(8):
    a = rng.uniform(-0.8, 0.8) + math.pi * 1.5
    puff(cS, f'S5_Dust{k}', GI + V((math.cos(a) * 9, math.sin(a) * 9, 2)), IMP, rng.uniform(5, 8), V((math.cos(a) * 16, math.sin(a) * 16, 3)))
CR = 58
cd = fx_obj('S5_CracksDark', crack_mesh(11, CR, ws=2.9), cS, (0.0, 0.0, 0.0, 1), 0.0); add_reveal(cd, CR * 1.6, IMP, IMP + 8)
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 100, 1), (IMP + 124, 0)): fx_key(cd, f, loc=GI, scale=1 if a else 0, alpha=a)
cg = fx_obj('S5_CracksGlow', crack_mesh(11, CR, ws=0.85), cS, OR, 3.0); add_reveal(cg, CR * 1.6, IMP, IMP + 7)
GL_ = GI + V((0, 0, 0.12))
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 40, 1), (IMP + 100, 0.5), (IMP + 124, 0)): fx_key(cg, f, loc=GL_, scale=1 if a else 0, alpha=a)
for k in range(8):
    sz = rng.uniform(0.9, 2.2)
    me = shard_mesh(900 + k, sz * rng.uniform(0.7, 1.3), sz * rng.uniform(0.5, 1.2), sz * rng.uniform(0.4, 1.0), npts=rng.choice((7, 8, 9)))
    ob = rock_obj(f'S5_Rock{k}', me, cS)
    ang = rng.uniform(0, math.tau); spd = rng.uniform(1.4, 3.6); vz = rng.uniform(26, 50)
    st0 = Quaternion(V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(), rng.uniform(0, 6))
    ax = V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(); spin = rng.uniform(3, 9) * rng.choice((-1, 1))
    p0 = GI + V((math.cos(ang) * rng.uniform(1, 5), math.sin(ang) * rng.uniform(1, 5), 1.0)); landed = None; rest = None
    rk(ob, IMP - 1, p0, st0, 0)
    for i in range(0, 80, 2):
        t = i / 48.0; i24 = i / 2.0
        x = p0.x + math.cos(ang) * spd * i24 * 1.7; y = p0.y + math.sin(ang) * spd * i24 * 1.7; z = p0.z + vz * t - 0.5 * 160 * t * t
        if z <= sz * 0.35:
            z = sz * 0.35
            if landed is None: landed = (x, y)
            x, y = landed
        rot = Quaternion(ax, spin * t * (0.25 if landed else 1.0)) @ st0
        rk(ob, IMP + i, V((x, y, z)), rot, 1.0)
        if landed is not None and rest is None: rest = (V((x, y, z)), rot)
        if landed is not None and i > 26: break
    if rest is None: rest = (V((x, y, 0.3)), rot)
    rk(ob, IMP + 100, rest[0], rest[1], 1.0); rk(ob, IMP + 124, rest[0] - V((0, 0, 1.5)), rest[1], 0)

# ---------- circulo de runas roxo, dura depois da skill ----------
im = bpy.data.images['FX_Rune_strip']
def rune_shape(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord'); tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = im; tx.extension = 'REPEAT'
    nt.links.new(tc.outputs['UV'], tx.inputs['Vector']); sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tx.outputs['Color'], sp.inputs[0]); return sp.outputs['Red']
for j, (r0, r1, spd, rep) in enumerate(((22.0, 28.0, 1.0, 2), (13.0, 18.0, -1.4, 2))):
    ob = fx_obj(f'S5_Runes{j}', flat_ring(r0, r1, rep), cS, OR, 3.4)
    rewire(ob, rune_shape); ob.rotation_mode = 'XYZ'
    loc = GI + V((0, 0, 0.3))
    fx_key(ob, IMP - 1, loc=loc, scale=(0, 0, 0), alpha=0, rot=(0, 0, 0))
    fx_key(ob, IMP + 8, scale=(1, 1, 1), alpha=1.0, rot=(0, 0, spd * 0.7))
    fx_key(ob, IMP + 110, scale=(1, 1, 1), alpha=0.9, rot=(0, 0, spd * 3.2))
    fx_key(ob, IMP + 150, scale=(1.05, 1.05, 1.05), alpha=0, rot=(0, 0, spd * 4.2)); fx_key(ob, IMP + 151, scale=(0, 0, 0), alpha=0)

# ---------- visibilidade ----------
for c_ in bpy.data.collections:
    if c_.name.startswith('FX_'):
        lc = bpy.context.view_layer.layer_collection.children.get(c_.name)
        if lc: lc.exclude = (c_.name != 'FX_Skill5_Chains'); lc.hide_viewport = False
        c_.hide_render = (c_.name != 'FX_Skill5_Chains')
sc.frame_start = 0; sc.frame_end = 200; sc.frame_set(0)
bpy.data.orphans_purge(do_recursive=True)
print('skill5 ok', len(cS.objects), 'objetos; GI', [round(x, 1) for x in GI], 'origem', [round(x, 1) for x in O])
