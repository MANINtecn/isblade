"""Skill 2 - Aegis Fortress: efeitos (48 fps). Impacto no frame 165, domo ate ~312."""
import bpy, math, random, bmesh
import numpy as np
from mathutils import Matrix, Vector, Quaternion
V = Vector
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
exec(open(_dir + "skill2_anim.py").read())
_fx = open(_dir + "atk_fx2.py").read()
rng = random.Random(21)
GOLD = (1.0, 0.78, 0.25, 1); WHITE = (1.0, 0.96, 0.85, 1); ICE = (0.6, 0.85, 1.0, 1); DUST = (0.55, 0.5, 0.42, 1)
exec(_fx[_fx.index("def mesh_spike"):_fx.index("# ======================= ATK 1")])
exec(_fx[_fx.index("# --- pedra realista"):_fx.index("cr = fx_obj('A3_CraterDark'")])

AW = (0.86, 0.95, 1.0, 1); AB = (0.35, 0.7, 1.0, 1); AD = (0.15, 0.42, 1.0, 1)
IMP = 165

# ---------- colecao ----------
for _n in ('FX_Skill2_Aegis',):
    _c = bpy.data.collections.get(_n)
    if _c:
        for _o in list(_c.objects): bpy.data.objects.remove(_o, do_unlink=True)
        bpy.data.collections.remove(_c)
cS = fx_collection('FX_Skill2_Aegis')
for _m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(_m)

# ---------- referencias de posicao ----------
arm.animation_data.action = bpy.data.actions['Skill2_AegisFortress']; arm.animation_data.action_slot = arm.animation_data.action.slots[0]
sc = bpy.context.scene
sc.frame_set(0); bpy.context.view_layer.update()
CTR = V(((PB['bip01_l_foot'].head.x + PB['bip01_r_foot'].head.x) / 2, (PB['bip01_l_foot'].head.y + PB['bip01_r_foot'].head.y) / 2, 0))
def shield_pts(f):
    sc.frame_set(f); bpy.context.view_layer.update()
    mw = SH.matrix_world; return [mw @ v.co for v in SH.data.vertices]
_p = shield_pts(140); S_OVER = sum(_p, V((0, 0, 0))) / len(_p)
_p = sorted(shield_pts(IMP), key=lambda q: q.z)[:30]
GI = V((sum(q.x for q in _p) / len(_p), sum(q.y for q in _p) / len(_p), 0.3))
sc.frame_set(250); bpy.context.view_layer.update()
_ps = shield_pts(250); _sc = sum(_ps, V((0, 0, 0))) / len(_ps)
_pe = PB['Bip01_Pelvis'].head; _ft = (PB['bip01_l_foot'].head + PB['bip01_r_foot'].head) / 2
DC = V(((_sc.x + _pe.x + _ft.x) / 3, (_sc.y + _pe.y + _ft.y) / 3, 0))
print('centro domo', [round(x, 1) for x in DC], 'escudo', [round(x, 1) for x in _sc], 'pelvis', [round(x, 1) for x in _pe], 'pes', [round(x, 1) for x in _ft])
sc.frame_set(0)

def vis(ob, t0, t_in, t_out, t1, a_peak, loc=None, scale=1.0):
    s = scale if hasattr(scale, '__len__') else (scale, scale, scale)
    fx_key(ob, t0 - 1, loc=loc, scale=(0, 0, 0), alpha=0)
    fx_key(ob, t0, loc=loc, scale=s, alpha=0)
    fx_key(ob, t_in, scale=s, alpha=a_peak); fx_key(ob, t_out, scale=s, alpha=a_peak)
    fx_key(ob, t1, scale=s, alpha=0)
    fx_key(ob, t1 + 1, scale=(0, 0, 0), alpha=0)

def rewire(ob, shape_builder):
    nt = ob.active_material.node_tree; mix = nt.nodes[ob['mix']]
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    shape = shape_builder(nt)
    nt.links.new(shape, mu.inputs[1]); nt.links.new(mu.outputs[0], mix.inputs[0]); ob['mix'] = mu.name

# ---------- fitas de energia girando (g16-g55) ----------
def ribbon_mesh(R, h0, h1, turns, w, n=72, wob=0.12, ph=0.0):
    bm = bmesh.new(); uvl = bm.verts.layers  # noqa
    rows = []
    for i in range(n + 1):
        t = i / n; a = turns * math.tau * t + ph
        r = R * (1 + wob * math.sin(t * 9 + ph)); z = h0 + (h1 - h0) * t + 1.4 * math.sin(t * 7 + ph)
        wi = w * (0.18 + 0.82 * math.sin(math.pi * t)); rows.append((bm.verts.new((r * math.cos(a), r * math.sin(a), z - wi / 2)), bm.verts.new((r * math.cos(a), r * math.sin(a), z + wi / 2))))
    for i in range(n): bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
    uv = bm.loops.layers.uv.new('UV')
    for f in bm.faces:
        for l in f.loops:
            idx = [j for j, rw in enumerate(rows) if l.vert in rw][0]
            l[uv].uv = (idx / n, 0.0 if l.vert == rows[idx][0] else 1.0)
    me = bpy.data.meshes.new('ribbon'); bm.to_mesh(me); bm.free(); return me

def uv_taper(ob, power=0.8):
    def build(nt):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ')
        pi = nt.nodes.new('ShaderNodeMath'); pi.operation = 'MULTIPLY'; pi.inputs[1].default_value = math.pi
        sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'
        pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power
        nt.links.new(tc.outputs['UV'], sp.inputs[0]); nt.links.new(sp.outputs['X'], pi.inputs[0])
        nt.links.new(pi.outputs[0], sn.inputs[0]); nt.links.new(sn.outputs[0], pw.inputs[0]); return pw.outputs[0]
    rewire(ob, build)

emp = bpy.data.objects.new('Aegis_Swirl', None); cS.objects.link(emp)
emp.rotation_mode = 'XYZ'; emp.location = CTR
for f, ang in ((47, 0.0), (80, 2.0 * math.tau * 0.5), (115, 2.0 * math.tau), (150, 3.2 * math.tau), (165, 3.6 * math.tau)):
    emp.rotation_euler = (0, 0, ang); emp.keyframe_insert('rotation_euler', frame=f)
RIB = [(13, 4, 40, 1.6, 2.6, 0.0), (17, 8, 30, 1.3, 2.2, 1.2), (20, 2, 36, 1.8, 2.0, 2.4), (11, 12, 42, 1.4, 2.8, 3.6), (22, 6, 26, 1.2, 2.2, 4.8), (15, 16, 38, 1.5, 2.4, 6.0)]
RIB = RIB + [(a_ + 3, b_ + 2, c_ - 3, d_ * 0.8, e_ * 0.8, f_ + 3.1) for (a_, b_, c_, d_, e_, f_) in RIB]
for i, (R, h0, h1, turns, w, ph) in enumerate(RIB):
    rb = fx_obj(f'S2_Ribbon{i}', ribbon_mesh(R, h0, h1, turns, w * 0.55, ph=ph), cS, AB if i % 2 else AW, 4.0)
    uv_taper(rb)
    rb.parent = emp
    vis(rb, 49 + i * 3, 78 + i * 3, 128, 156 + i * 2, 0.9, loc=V((0, 0, 0)))

# ---------- particulas de energia subindo (g25-g52) ----------
for k in range(20):
    r_ = rng.uniform(6, 22); a_ = rng.uniform(0, math.tau); x = CTR.x + r_ * math.cos(a_); y = CTR.y + r_ * math.sin(a_)
    f0 = rng.uniform(75, 135); dur = rng.uniform(26, 44)
    streak(cS, f'S2_Rise{k}', V((x, y, 1)), V((x, y, rng.uniform(10, 34))), f0, f0 + dur, 0.32, AW if k % 3 else AB, 2.6, hold=0.5, fade='base')

# ---------- gema e raios no escudo (filhos do escudo) ----------
GEM = V((0, -2.7, 3.2))
gem = fx_obj('S2_Gem', mesh_sphere(1), cS, AW, 5.0); gem.parent = SH
for f, s, a in ((47, 0, 0), (50, 0.4, 0.5), (114, 1.3, 0.9), (132, 1.9, 1.0), (150, 2.2, 1.0), (164, 2.2, 1.0), (171, 2.2, 0.8), (195, 1.4, 0.55), (300, 1.2, 0.45), (324, 0, 0)):
    fx_key(gem, f, loc=GEM, scale=s, alpha=a)
def lightning_mesh(seed):
    me = crack_mesh(seed, 15, n_main=7, ws=0.32)
    me.transform(Matrix.Rotation(math.radians(90), 4, 'X')); me.transform(Matrix.Translation(GEM + V((0, -0.2, 0)))); return me
LT = [fx_obj(f'S2_Bolt{v}', lightning_mesh(50 + v * 7), cS, AW, 8.0) for v in range(3)]
for b in LT: b.parent = SH
for v, b in enumerate(LT):
    fx_key(b, 97, loc=V((0, 0, 0)), scale=(0, 0, 0), alpha=0)
    for f in range(99, 178, 3):
        on = ((f // 3) % 3 == v) and (f < 160 or f <= 171)
        fx_key(b, f, loc=V((0, 0, 0)), scale=(1, 1, 1) if on else (0, 0, 0), alpha=1.0 if on else 0.0)
    fx_key(b, 180, scale=(0, 0, 0), alpha=0)

# ---------- escudo erguido: fios de luz em volta ----------
for k in range(12):
    a_ = rng.uniform(0, math.tau); r_ = rng.uniform(8, 16)
    p0 = S_OVER + V((r_ * math.cos(a_), r_ * math.sin(a_) * 0.6, rng.uniform(-6, 2)))
    f0 = rng.uniform(125, 148)
    streak(cS, f'S2_Halo{k}', p0, p0 + V((0, 0, rng.uniform(12, 22))), f0, f0 + 24, 0.4, AW, 3.0, hold=0.5, fade='base')

# ---------- queda: colunas de luz acima do escudo ----------
for k in range(10):
    x = GI.x + rng.uniform(-7, 7); y = GI.y + rng.uniform(-3, 3) - 4
    f0 = rng.uniform(151, 158)
    streak(cS, f'S2_Fall{k}', V((x, y, 75 + rng.uniform(0, 14))), V((x, y, 22 + rng.uniform(0, 8))), f0, IMP + 6, 0.5, AB, 3.0, hold=0.6, fade='tip')

# ---------- impacto no frame 165 ----------
def sparks2(col, name, p, n, f0, count, speed, color, spread=1.0, dur=(12, 20), w=0.5, st=3.0):
    n = n.normalized(); side = n.cross(V((0, 0, 1)))
    if side.length < 0.1: side = V((1, 0, 0))
    side.normalize(); up = side.cross(n).normalized()
    for k in range(count):
        a = rng.uniform(0, math.tau); sp = rng.uniform(0.6, 1.0) * speed
        d = ((side * math.cos(a) + up * math.sin(a)) * spread + n * 0.5).normalized(); d.z = abs(d.z) * 0.6 + 0.12; d.normalize()
        streak(col, f'{name}_{k}', p + d * 2, p + d * sp, f0, f0 + rng.uniform(*dur), w, color, st, hold=0.5)
sparks2(cS, 'S2_Burst', GI + V((0, 0, 2)), V((0, 0, 1)), IMP, 46, 46, AW, spread=2.2)
sparks2(cS, 'S2_BurstUp', GI + V((0, 0, 4)), V((0, 0, 1)), IMP, 20, 36, AB, spread=0.7, dur=(14, 24))
star(cS, 'S2_Star', GI + V((0, 0, 8)), IMP, 20, AW, 3)
glow_disc(cS, 'S2_Glow', GI + V((0, -1, 8)), V((0, -1, 0.2)), IMP, 14, AW, 1.4)
wave_ring(cS, 'S2_Wave0', GI, IMP, 62, 30, AB, 3.5)
wave_ring(cS, 'S2_Wave1', GI, IMP, 44, 30, AW, 2.4, lag=5, peak=0.6)
wave_ring(cS, 'S2_Wave2', GI, IMP, 80, 36, AD, 2.0, lag=9, peak=0.45)
for k in range(12):
    a = k / 12 * math.tau
    puff(cS, f'S2_Dust{k}', GI + V((math.cos(a) * 7, math.sin(a) * 7, 2)), IMP, rng.uniform(5, 9), V((math.cos(a) * 18, math.sin(a) * 18, 3)))
# rachaduras com brilho azul
CR = 34
cd = fx_obj('S2_CracksDark', crack_mesh(9, CR, ws=1.5), cS, (0.02, 0.02, 0.03, 1), 0.0)
add_reveal(cd, CR * 1.6, IMP, IMP + 14)
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 150, 1), (IMP + 170, 0)): fx_key(cd, f, loc=GI, scale=1 if a else 0, alpha=a)
cg = fx_obj('S2_CracksGlow', crack_mesh(9, CR, ws=0.7), cS, AB, 6.0)
add_reveal(cg, CR * 1.6, IMP, IMP + 12)
GL = GI + V((0, 0, 0.12))
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 40, 1), (IMP + 110, 0.5), (IMP + 160, 0)): fx_key(cg, f, loc=GL, scale=1 if a else 0, alpha=a)
ch = fx_obj('S2_CracksHot', crack_mesh(9, CR, ws=0.3), cS, AW, 8.0)
add_reveal(ch, CR * 1.6, IMP, IMP + 12)
GH = GI + V((0, 0, 0.18))
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 24, 0.6), (IMP + 50, 0)): fx_key(ch, f, loc=GH, scale=1 if a else 0, alpha=a)
# pedras com textura
for k in range(18):
    big = k < 5
    sz = rng.uniform(1.6, 2.8) if big else rng.uniform(0.5, 1.4)
    me = shard_mesh(500 + k, sz * rng.uniform(0.7, 1.3), sz * rng.uniform(0.5, 1.2), sz * rng.uniform(0.4, 1.0), npts=rng.choice((7, 8, 9, 10)))
    ob = rock_obj(f'S2_Rock{k}', me, cS)
    ang = rng.uniform(0, math.tau); spd = rng.uniform(1.4, 4.2) * (0.8 if big else 1.0); vz = rng.uniform(26, 56) * (0.7 if big else 1.0)
    st = Quaternion(V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(), rng.uniform(0, 6))
    ax = V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(); spin = rng.uniform(3, 9) * rng.choice((-1, 1))
    p0 = GI + V((math.cos(ang) * rng.uniform(1, 5), math.sin(ang) * rng.uniform(1, 5), 1.0))
    rk(ob, IMP - 1, p0, st, 0)
    landed = None; rest = None
    for i in range(0, 90, 2):
        t = i / 48.0; i24 = i / 2.0
        x = p0.x + math.cos(ang) * spd * i24 * 1.7; y = p0.y + math.sin(ang) * spd * i24 * 1.7; z = p0.z + vz * t - 0.5 * 160 * t * t
        if z <= sz * 0.35:
            z = sz * 0.35
            if landed is None: landed = (x, y)
            x, y = landed
        rot = Quaternion(ax, spin * t * (0.25 if landed else 1.0)) @ st
        rk(ob, IMP + i, V((x, y, z)), rot, 1.0)
        if landed is not None and rest is None: rest = (V((x, y, z)), rot)
        if landed is not None and i > 30: break
    if rest is None: rest = (V((x, y, 0.3)), rot)
    rk(ob, IMP + 120, rest[0], rest[1], 1.0)
    rk(ob, IMP + 150, rest[0] - V((0, 0, 1.5)), rest[1], 0)

# ---------- domo (g59-g104) ----------
R = 56.0; KR = R / 40.0
bmd = bmesh.new(); bmesh.ops.create_uvsphere(bmd, u_segments=48, v_segments=24, radius=1.0)
bmesh.ops.delete(bmd, geom=[v for v in bmd.verts if v.co.z < -0.001], context='VERTS')
med = bpy.data.meshes.new('dome'); bmd.to_mesh(med); bmd.free()
for p_ in med.polygons: p_.use_smooth = True
dome = fx_obj('S2_Dome', med, cS, AB, 2.6)
def dome_shape(nt):
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 2.0
    ed = nt.nodes.new('ShaderNodeMath'); ed.operation = 'MULTIPLY'; ed.inputs[1].default_value = 0.85
    tc = nt.nodes.new('ShaderNodeTexCoord'); vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 7.0
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.0; rp.color_ramp.elements[0].color = (1, 1, 1, 1)
    rp.color_ramp.elements[1].position = 0.06; rp.color_ramp.elements[1].color = (0, 0, 0, 1)
    ln = nt.nodes.new('ShaderNodeMath'); ln.operation = 'MULTIPLY'; ln.inputs[1].default_value = 0.9
    s1 = nt.nodes.new('ShaderNodeMath'); s1.operation = 'ADD'
    s2 = nt.nodes.new('ShaderNodeMath'); s2.operation = 'ADD'; s2.inputs[1].default_value = 0.07
    nt.links.new(lw.outputs['Facing'], pw.inputs[0]); nt.links.new(pw.outputs[0], ed.inputs[0])
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector']); nt.links.new(vor.outputs['Distance'], rp.inputs['Fac'])
    nt.links.new(rp.outputs['Color'], ln.inputs[0]); nt.links.new(ed.outputs[0], s1.inputs[0]); nt.links.new(ln.outputs[0], s1.inputs[1])
    nt.links.new(s1.outputs[0], s2.inputs[0]); return s2.outputs[0]
rewire(dome, dome_shape)
def eio(t): return 1 - (1 - t) ** 3
dome.location = DC
fx_key(dome, 176, loc=DC, scale=(0, 0, 0), alpha=0)
for i in range(0, 25, 3):
    s = 0.25 + 0.75 * eio(i / 24.0); fx_key(dome, 177 + i, loc=DC, scale=(R * s, R * s, R * s), alpha=min(1.0, 0.4 + i / 20.0))
for f in range(204, 292, 12):
    k = ((f // 12) % 2) * 0.025
    fx_key(dome, f, loc=DC, scale=(R * (1 + k),) * 3, alpha=0.85 + 0.15 * (k > 0))
fx_key(dome, 296, loc=DC, scale=(R * 1.0,) * 3, alpha=0.85)
fx_key(dome, 312, loc=DC, scale=(R * 1.08,) * 3, alpha=0)
fx_key(dome, 313, scale=(0, 0, 0), alpha=0)

# ---------- runas em faixas sobre o domo ----------
W_, H_ = 2048, 96
img = np.zeros((H_, W_), np.float32); pur = np.zeros((H_, W_), np.float32); rg = np.random.default_rng(8)
def seg(x0, y0, x1, y1, th=5):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for t in np.linspace(0, 1, n):
        x = int(x0 + (x1 - x0) * t); y = int(y0 + (y1 - y0) * t)
        img[max(y - th // 2, 0):y + th // 2 + 1, max(x - th // 2, 0):x + th // 2 + 1] = 1
for k in range(40):
    pur[:, k * 51:(k + 1) * 51] = 1.0 if k % 2 else 0.0
    x0 = k * 51 + 6; xs = x0 + int(rg.integers(10, 34))
    seg(xs, 12, xs, H_ - 12)
    for _ in range(int(rg.integers(2, 5))):
        y = int(rg.integers(14, H_ - 14)); L = int(rg.integers(8, 28)); side = int(rg.choice((-1, 1))); d = int(rg.integers(-12, 13))
        seg(xs, y, xs + side * L, y + d)
    if rg.random() < 0.5: seg(xs - int(rg.integers(6, 16)), 12, xs + int(rg.integers(6, 16)), int(rg.integers(12, 40)))
rgba = np.ones((H_, W_, 4), np.float32); rgba[..., 0] = rgba[..., 1] = img; rgba[..., 2] = pur
im = bpy.data.images.get('FX_Rune_strip') or bpy.data.images.new('FX_Rune_strip', W_, H_, alpha=False)
im.pixels = rgba.ravel().tolist(); im.filepath_raw = _dir.rstrip('\\') + r"\..\..\assets\personagens\fx_rune_strip.png"
im.file_format = 'PNG'
try: im.save()
except Exception as e: print('rune save', e)
im.pack()

def band_mesh(z0, z1, n=96):
    bm = bmesh.new(); rows = []
    for i in range(n + 1):
        a = i / n * math.tau
        r0 = math.sqrt(max(R * R - z0 * z0, 1)) * 1.002; r1 = math.sqrt(max(R * R - z1 * z1, 1)) * 1.002
        rows.append((bm.verts.new((r0 * math.cos(a), r0 * math.sin(a), z0)), bm.verts.new((r1 * math.cos(a), r1 * math.sin(a), z1))))
    for i in range(n): bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
    uv = bm.loops.layers.uv.new('UV')
    for f in bm.faces:
        for l in f.loops:
            idx = [j for j, rw in enumerate(rows) if l.vert in rw][0]
            l[uv].uv = (idx / n * 4.0, 0.0 if l.vert == rows[idx][0] else 1.0)
    me = bpy.data.meshes.new('band'); bm.to_mesh(me); bm.free(); return me

def rune_shape(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord'); tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = im; tx.extension = 'REPEAT'
    nt.links.new(tc.outputs['UV'], tx.inputs['Vector'])
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tx.outputs['Color'], sp.inputs[0])
    em = next(n for n in nt.nodes if n.type == 'EMISSION')
    cm = nt.nodes.new('ShaderNodeMix'); cm.data_type = 'RGBA'
    cm.inputs['A'].default_value = AW; cm.inputs['B'].default_value = (0.5, 0.06, 1.0, 1)
    nt.links.new(sp.outputs['Blue'], cm.inputs['Factor']); nt.links.new(cm.outputs['Result'], em.inputs['Color'])
    return sp.outputs['Red']

bands = []
for j, (z0, z1, spd) in enumerate(((6.0, 14.0, 1.0), (25.0, 33.0, -0.8), (41.0, 48.0, 0.6))):
    bd = fx_obj(f'S2_Runes{j}', band_mesh(z0, z1), cS, AW, 7.0)
    rewire(bd, rune_shape); bd.rotation_mode = 'XYZ'
    t_on = 185 + j * 4
    fx_key(bd, t_on - 1, loc=DC, scale=(0, 0, 0), alpha=0)
    fx_key(bd, t_on, loc=DC, scale=(1, 1, 1), alpha=0, rot=(0, 0, 0))
    fx_key(bd, t_on + 18, scale=(1, 1, 1), alpha=1.0)
    fx_key(bd, 296, scale=(1, 1, 1), alpha=0.95, rot=(0, 0, spd * math.tau * 0.5))
    fx_key(bd, 312, scale=(1, 1, 1), alpha=0)
    fx_key(bd, 313, scale=(0, 0, 0), alpha=0)
    bands.append(bd)
# anel no chao
fr_ = fx_obj('S2_FloorRing', annulus_mesh(0.9), cS, AB, 4.0)
fr_.rotation_mode = 'XYZ'
vis(fr_, 180, 195, 296, 312, 0.9, loc=DC + V((0, 0, 0.4)), scale=(R * 1.02,) * 3)
# rotacao do anel no chao nao e necessaria (simetrico)


# ---------- raios eletricos correndo na superficie do domo ----------
def surf_bolt(seed, rot):
    me = crack_mesh(seed, 30, n_main=3, ws=0.55)
    for v in me.vertices:
        x, y = v.co.x, v.co.y; rr = math.hypot(x, y) / 44.0; th = min(rr, 1.0) * (math.pi / 2)
        ph = math.atan2(y, x) + rot; pr = R * 1.005 * math.sin(th)
        v.co = (pr * math.cos(ph), pr * math.sin(ph), R * 1.005 * math.cos(th))
    me.update(); return me
for k in range(7):
    bl = fx_obj(f'S2_DomeBolt{k}', surf_bolt(300 + k * 11, rng.uniform(0, math.tau)), cS, AW, 9.0)
    fx_key(bl, 189, loc=DC, scale=(0, 0, 0), alpha=0)
    for f in range(192, 300, 4):
        on = ((f // 4 + k) % 5 == 0)
        fx_key(bl, f, loc=DC, scale=(1, 1, 1) if on else (0, 0, 0), alpha=1.0 if on else 0.0)
    fx_key(bl, 300, scale=(0, 0, 0), alpha=0)

# ---------- raios e particulas dentro do domo (g60-g95) ----------
for k in range(20):
    a = rng.uniform(0, math.tau); el = rng.uniform(0.1, 1.1)
    d = V((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
    f0 = rng.uniform(IMP + 12, IMP + 60); dur = rng.uniform(18, 36)
    streak(cS, f'S2_Arc{k}', GI + V((0, 0, 10)) + d * 5, GI + V((0, 0, 10)) + d * rng.uniform(36, 54), f0, f0 + dur, 0.35, AW if k % 2 else AB, 3.0, hold=0.5)
for k in range(24):
    a = rng.uniform(0, math.tau); r_ = rng.uniform(4, 48); x = DC.x + r_ * math.cos(a); y = DC.y + r_ * math.sin(a)
    z0 = rng.uniform(12, 50); f0 = rng.uniform(IMP + 60, IMP + 110); dur = rng.uniform(40, 70)
    mt = fx_obj(f'S2_Mote{k}', mesh_cube(0.7), cS, AW, 4.0)
    fx_key(mt, f0 - 1, loc=V((x, y, z0)), scale=(0, 0, 0), alpha=0)
    fx_key(mt, f0, loc=V((x, y, z0)), scale=(1, 1, 1), alpha=0.9)
    fx_key(mt, f0 + dur, loc=V((x + rng.uniform(-2, 2), y + rng.uniform(-2, 2), max(z0 - rng.uniform(14, 26), 1.0))), scale=(1, 1, 1), alpha=0.0)
    fx_key(mt, f0 + dur + 1, scale=(0, 0, 0), alpha=0)

# ---------- visibilidade e fim ----------
for c_ in bpy.data.collections:
    if c_.name.startswith('FX_'):
        lc = bpy.context.view_layer.layer_collection.children.get(c_.name)
        if lc: lc.exclude = (c_.name != 'FX_Skill2_Aegis'); lc.hide_viewport = False
        c_.hide_render = (c_.name != 'FX_Skill2_Aegis')
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 324; sc.frame_set(0)
print('skill2 fx ok', len(cS.objects), 'objetos; GI', [round(x, 1) for x in GI], 'CTR', [round(x, 1) for x in CTR])
