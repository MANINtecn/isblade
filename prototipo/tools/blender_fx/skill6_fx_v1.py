"""Skill 6 - Arremesso do escudo (azul eletrico): solta no 46, crava e explode em feixes de luz no 56,
enterrado ate o 100, quando sai quebrando o chao e volta girando para a mao (142). 48 fps."""
import bpy, math, random, bmesh
from mathutils import Matrix, Vector, Quaternion
V = Vector
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
_src = open(_dir + "atk.py").read()
DY_O = 2.0
exec(_src.split("ATKS = {")[0])                                   # arm, SH, PB, V, helpers
_fx = open(_dir + "atk_fx2.py").read(); _s2 = open(_dir + "skill2_fx.py").read(); _s3 = open(_dir + "skill3_fx.py").read()
rng = random.Random(66)
GOLD = (1.0, 0.78, 0.25, 1); WHITE = (1.0, 0.96, 0.85, 1); ICE = (0.6, 0.85, 1.0, 1); DUST = (0.50, 0.50, 0.52, 1)
exec(_fx[_fx.index("def mesh_spike"):_fx.index("# ======================= ATK 1")])
exec(_fx[_fx.index("# --- pedra realista"):_fx.index("cr = fx_obj('A3_CraterDark'")])
exec(_s2[_s2.index("def vis("):_s2.index("emp = bpy.data.objects.new('Aegis_Swirl'")])
exec(_s2[_s2.index("def sparks2("):_s2.index("sparks2(cS, 'S2_Burst'")])
exec(_s3[_s3.index("def flat_ring("):_s3.index("rings = []")])
G = (0.0, 0.42, 1.0, 1); GW = (0.55, 0.88, 1.0, 1); GD = (0.0, 0.2, 0.7, 1)      # azul eletrico (estilo Cabal), azul-branco, azul escuro

# ---------- animacao do personagem e voo do escudo ----------
exec(open(_dir + "skill6_anim.py").read())
sc = bpy.context.scene

_c = bpy.data.collections.get('FX_Skill6_ShieldThrow')
if _c:
    for _o in list(_c.objects): bpy.data.objects.remove(_o, do_unlink=True)
    bpy.data.collections.remove(_c)
cS = fx_collection('FX_Skill6_ShieldThrow')
for _m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(_m)

IMP, EX = IMPACT, EXIT
GI = GI6.copy(); GL = GI + V((0, 0, 0.2))
HAND = HM[CATCH].translation.copy()
def dirv(a, e): return V((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))

# ---------- rastro e brilho girando junto do escudo ----------
def trail(f_a, f_b, step, tag, w=1.8):
    for f in range(f_a, f_b, step):
        streak(cS, f'S6_Tr{tag}{f}', FLY[f][0], FLY[min(f + step + 1, f_b)][0], f, f + 8, w, G, 3.2, hold=0.4, fade='tip')
trail(RLS, IMP - 1, 2, 'a', 1.6)
trail(SP0 + 8, RLS - 1, 3, 's', 1.2)
trail(EX + 1, CATCH - 4, 3, 'b', 2.2)

def follow_glow(name, f_a, f_b, size, peak, color=G):
    ob = fx_obj(name, mesh_disc(1, .02), cS, color, 2.4)
    _radial(ob, 0.0, 1.0, 1.6); ob.rotation_mode = 'QUATERNION'
    fx_key(ob, f_a - 1, loc=FLY[f_a][0], scale=0, alpha=0)
    for f in range(f_a, f_b + 1):
        pos, q = FLY[f]; n = q @ V((0, -1, 0))
        ob.rotation_quaternion = V((0, 0, 1)).rotation_difference(n); ob.keyframe_insert('rotation_quaternion', frame=f)
        fx_key(ob, f, loc=pos, scale=size, alpha=peak * min(1.0, (f - f_a + 1) / 3.0, (f_b - f + 1) / 4.0))
    fx_key(ob, f_b + 1, scale=0, alpha=0)


# ---------- escudo puxado para o lado: gira e brilha ----------
star(cS, 'S6_SideFlash', FLY[SP0][0], SP0, 14, GW, 5)
star(cS, 'S6_SideFlash2', FLY[RLS - 2][0], RLS - 2, 14, GW, 5)
sparks2(cS, 'S6_SideSp', FLY[SP0 + 6][0], V((1, 0, 0.2)), SP0 + 6, 12, 28, GW, spread=1.6, dur=(10, 18))
sparks2(cS, 'S6_SideSp2', FLY[RLS - 1][0], V((0, -1, 0.2)), RLS - 1, 10, 30, G, spread=1.6, dur=(8, 14))

# ---------- raios de luz escapando do escudo por todos os lados (giram junto, mostram o giro) ----------
def ray_mesh(n, seed, r0, bw, lmin=0.7):
    """espetos de luz em 3D (piramides) saindo do centro em todas as direcoes: todos se encontram no centro"""
    r = random.Random(seed); bm = bmesh.new(); ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        zc = 1 - 2 * (i + 0.5) / n; rr = math.sqrt(max(0.0, 1 - zc * zc)); ph = i * ga + r.uniform(-0.3, 0.3)
        d = V((math.cos(ph) * rr, math.sin(ph) * rr, zc)); d = (d + V((r.uniform(-.15, .15), r.uniform(-.15, .15), r.uniform(-.15, .15)))).normalized()
        t_ = d.cross(V((0, 0, 1)) if abs(d.z) < 0.9 else V((1, 0, 0))).normalized(); u_ = d.cross(t_).normalized()
        w = bw * r.uniform(0.8, 1.3); L = r.uniform(lmin, 1.0); b0 = d * r0
        bs = [bm.verts.new(b0 + t_ * w + u_ * w), bm.verts.new(b0 - t_ * w + u_ * w), bm.verts.new(b0 - t_ * w - u_ * w), bm.verts.new(b0 + t_ * w - u_ * w)]
        tip = bm.verts.new(d * L)
        for k in range(4): bm.faces.new((bs[k], bs[(k + 1) % 4], tip))
    me = bpy.data.meshes.new('rays'); bm.to_mesh(me); bm.free(); return me
RAY_SPANS = ((SP0, IMP), (EX + 1, CATCH - 1))
def ray_layer(name, n, seed, color, size, extra, st, r0, bw, lmin=0.7):
    ob = fx_obj(name, ray_mesh(n, seed, r0, bw, lmin), cS, color, st); _radial(ob, 1.0, 0.15, 0.9); ob.rotation_mode = 'QUATERNION'
    for f0, f1 in RAY_SPANS:
        fx_key(ob, f0 - 1, loc=FLY[f0][0], scale=0, alpha=0)
        for f in range(f0, f1 + 1):
            pos, q = FLY[f]; ob.rotation_quaternion = q @ Quaternion(V((0, 1, 0)), extra * f); ob.keyframe_insert('rotation_quaternion', frame=f)
            k = min(1.0, (f - f0 + 1) / 4.0, (f1 - f + 1) / 4.0)
            fx_key(ob, f, loc=pos, scale=size * (0.75 + 0.25 * k), alpha=0.95 * k)
        fx_key(ob, f1 + 1, scale=0, alpha=0)
ray_layer('S6_RaysA', 10, 7, G, 46, 0.30, 4.5, 0.05, 0.035)
ray_layer('S6_RaysB', 8, 21, GW, 36, -0.42, 5.0, 0.05, 0.022)
ray_layer('S6_RaysC', 14, 3, G, 24, 0.55, 4.0, 0.05, 0.04, 0.6)

# ---------- chao: area queimada que esconde o escudo enterrado ----------
cr = fx_obj('S6_Crater', crater_mesh(17, 5), cS, (0.045, 0.035, 0.03, 1), 0.0)
for f, s_, a in ((IMP - 1, 0, 0), (IMP, 0.7, 1), (IMP + 5, 1.0, 1), (EX - 1, 1.0, 1), (EX + 3, 1.55, 1), (EX + 8, 1.7, 1), (EX + 118, 1.7, 1), (EX + 128, 1.7, 0)):
    fx_key(cr, f, loc=GL, scale=s_ if a else 0, alpha=a)
cr.rotation_euler = (0, 0, 0.4)

# ---------- impacto no 56: flash, feixes de luz em varias direcoes, ondas, rachaduras ----------
star(cS, 'S6_Flash', GI + V((0, 0, 10)), IMP, 36, GW, 6)
glow_disc(cS, 'S6_FlashG', GI + V((0, 0, 1.2)), V((0, 0, 1)), IMP, 48, G, 2.4)
for k in range(24):
    a = k / 24 * math.tau + rng.uniform(-0.12, 0.12)
    e = math.radians(rng.uniform(55, 80) if k % 3 == 0 else rng.uniform(8, 50))
    d = dirv(a, e); st_ = GI + V((0, 0, 7)) + d * 4; L = rng.uniform(50, 80) if k % 3 == 0 else rng.uniform(60, 118)
    streak(cS, f'S6_Beam{k}', st_, st_ + d * L, IMP, IMP + rng.randint(15, 23), rng.uniform(0.9, 1.7), GW if k % 2 else G, 4.5, hold=0.5, fade='base')
wave_ring(cS, 'S6_W0', GI, IMP, 96, 26, G, 3.6)
wave_ring(cS, 'S6_W1', GI, IMP, 70, 26, GW, 2.6, lag=3, peak=0.6)
wave_ring(cS, 'S6_W2', GI, IMP, 140, 32, G, 2.2, lag=7, peak=0.45)
sparks2(cS, 'S6_Sp', GI + V((0, 0, 3)), V((0, 0, 1)), IMP, 18, 62, GW, spread=2.0)
for k in range(8):
    a = k / 8 * math.tau + rng.uniform(-0.2, 0.2)
    puff(cS, f'S6_Dust{k}', GI + V((math.cos(a) * 8, math.sin(a) * 8, 2)), IMP, rng.uniform(5, 8), V((math.cos(a) * 16, math.sin(a) * 16, 3)))

def rocks(tag, n, f0, ctr, sz, spd, vz, rad=(1, 6), settle=26):
    for k in range(n):
        s_ = rng.uniform(*sz)
        me = shard_mesh(rng.randint(1, 9999), s_ * rng.uniform(0.7, 1.3), s_ * rng.uniform(0.5, 1.2), s_ * rng.uniform(0.4, 1.0), npts=rng.choice((7, 8, 9)))
        ob = rock_obj(f'S6_{tag}{k}', me, cS)
        ang = rng.uniform(0, math.tau); sp = rng.uniform(*spd); vz_ = rng.uniform(*vz)
        st0 = Quaternion(V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(), rng.uniform(0, 6))
        ax = V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(); spin_ = rng.uniform(3, 9) * rng.choice((-1, 1))
        r0 = rng.uniform(*rad); p0 = ctr + V((math.cos(ang) * r0, math.sin(ang) * r0, 1.0)); landed = None; rest = None
        rk(ob, f0 - 1, p0, st0, 0)
        for i in range(0, 90, 2):
            t = i / 48.0; i24 = i / 2.0
            x = p0.x + math.cos(ang) * sp * i24 * 1.7; y = p0.y + math.sin(ang) * sp * i24 * 1.7; z = p0.z + vz_ * t - 0.5 * 160 * t * t
            if z <= s_ * 0.35:
                z = s_ * 0.35
                if landed is None: landed = (x, y)
                x, y = landed
            rot = Quaternion(ax, spin_ * t * (0.25 if landed else 1.0)) @ st0
            rk(ob, f0 + i, V((x, y, z)), rot, 1.0)
            if landed is not None and rest is None: rest = (V((x, y, z)), rot)
            if landed is not None and i > settle: break
        if rest is None: rest = (V((x, y, 0.3)), rot)
        rk(ob, EX + 118, rest[0], rest[1], 1.0); rk(ob, EX + 130, rest[0] - V((0, 0, 2.0)), rest[1], 0)
rocks('RockA', 6, IMP, GI, (0.9, 2.0), (1.3, 3.0), (24, 46), settle=22)

CR1 = 40
cd = fx_obj('S6_CracksDark1', crack_mesh(12, CR1, ws=2.6), cS, (0.0, 0.0, 0.0, 1), 0.0); add_reveal(cd, CR1 * 1.6, IMP, IMP + 7)
for f, a in ((IMP - 1, 0), (IMP, 1), (EX + 10, 1), (EX + 11, 0)): fx_key(cd, f, loc=GI, scale=1 if a else 0, alpha=a)
cg = fx_obj('S6_CracksGlow1', crack_mesh(12, CR1, ws=0.8), cS, G, 3.0); add_reveal(cg, CR1 * 1.6, IMP, IMP + 6)
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 14, 0.5), (82, 0.85), (90, 0.45), (98, 0.9), (EX - 1, 1), (EX + 10, 1), (EX + 11, 0)): fx_key(cg, f, loc=GL, scale=1 if a else 0, alpha=a)

# ---------- enterrado (60-100): brilho pulsando, aneis que sugam para dentro, avisando a saida ----------
bg = fx_obj('S6_BuryGlow', mesh_disc(1, .02), cS, G, 3.0); _radial(bg, 0.0, 1.0, 1.8)
for f, s_, a in ((IMP + 4, 18, 0.0), (74, 22, 0.5), (82, 26, 0.3), (90, 28, 0.6), (98, 32, 0.4), (104, 40, 0.8), (EX - 1, 46, 1.0), (EX, 0, 0)):
    fx_key(bg, f, loc=GL + V((0, 0, 0.3)), scale=s_, alpha=a)
for j, f0 in enumerate((88, 96, 102)):
    ob = fx_obj(f'S6_Suck{j}', annulus_mesh(), cS, GW, 2.6); _radial(ob, 0.82, 1.0, 2.2)
    loc = GI + V((0, 0, 0.5))
    fx_key(ob, f0 - 1, loc=loc, scale=0, alpha=0)
    fx_key(ob, f0, loc=loc, scale=82, alpha=0.0)
    fx_key(ob, f0 + 4, loc=loc, scale=60, alpha=0.7)
    fx_key(ob, f0 + 12, loc=loc, scale=8, alpha=0.0)
    fx_key(ob, f0 + 13, scale=0, alpha=0)

# ---------- saida no 100: chao se quebra todo ----------
star(cS, 'S6_FlashE', GI + V((0, 0, 14)), EX, 54, GW, 6)
glow_disc(cS, 'S6_FlashEG', GI + V((0, 0, 1.5)), V((0, 0, 1)), EX, 72, G, 2.6)
streak(cS, 'S6_Col', GI, GI + V((0, 0, 185)), EX, EX + 20, 8.5, G, 4.5, hold=0.55, fade='base')
streak(cS, 'S6_ColW', GI, GI + V((0, 0, 170)), EX, EX + 14, 3.6, GW, 5.0, hold=0.5, fade='base')
for k in range(14):
    a = k / 14 * math.tau + rng.uniform(-0.15, 0.15); e = math.radians(rng.uniform(30, 82))
    d = dirv(a, e); st_ = GI + V((0, 0, 8)) + d * 4
    streak(cS, f'S6_BeamE{k}', st_, st_ + d * rng.uniform(70, 140), EX, EX + rng.randint(14, 22), rng.uniform(1.0, 1.9), GW if k % 2 else G, 4.5, hold=0.5, fade='base')
wave_ring(cS, 'S6_WE0', GI, EX, 150, 30, G, 3.6)
wave_ring(cS, 'S6_WE1', GI, EX, 110, 28, GW, 2.6, lag=4, peak=0.65)
wave_ring(cS, 'S6_WE2', GI, EX, 205, 36, G, 2.2, lag=8, peak=0.5)
sparks2(cS, 'S6_SpE', GI + V((0, 0, 4)), V((0, 0, 1)), EX, 20, 78, GW, spread=1.8)
sparks2(cS, 'S6_SpEu', GI + V((0, 0, 6)), V((0, 0, 1)), EX, 10, 90, G, spread=0.6, dur=(16, 26))
for k in range(14):
    a = k / 14 * math.tau + rng.uniform(-0.2, 0.2)
    puff(cS, f'S6_DustE{k}', GI + V((math.cos(a) * 12, math.sin(a) * 12, 2)), EX, rng.uniform(8, 13), V((math.cos(a) * 24, math.sin(a) * 24, 4)))
rocks('RockB', 16, EX, GI, (1.4, 3.8), (1.4, 3.6), (40, 88), rad=(3, 14), settle=30)

CR2 = 100
cd2 = fx_obj('S6_CracksDark2', crack_mesh(31, CR2, n_main=13, ws=3.4), cS, (0.0, 0.0, 0.0, 1), 0.0); add_reveal(cd2, CR2 * 1.6, EX, EX + 9)
for f, a in ((EX - 1, 0), (EX, 1), (EX + 118, 1), (EX + 128, 0)): fx_key(cd2, f, loc=GI + V((0, 0, 0.05)), scale=1 if a else 0, alpha=a)
cg2 = fx_obj('S6_CracksGlow2', crack_mesh(31, CR2, n_main=13, ws=1.0), cS, G, 3.2); add_reveal(cg2, CR2 * 1.6, EX, EX + 8)
for f, a in ((EX - 1, 0), (EX, 1), (EX + 30, 0.9), (EX + 70, 0.5), (EX + 100, 0.25), (EX + 120, 0)): fx_key(cg2, f, loc=GL + V((0, 0, 0.05)), scale=1 if a else 0, alpha=a)

NSL = 12                                                           # placas do chao levantadas em volta do buraco
for k in range(NSL):
    a = k / NSL * math.tau + rng.uniform(-0.18, 0.18); rr = rng.uniform(15, 42)
    me = shard_mesh(rng.randint(1, 9999), rng.uniform(6, 11), rng.uniform(6, 11), rng.uniform(1.1, 2.0), npts=9)
    ob = rock_obj(f'S6_Slab{k}', me, cS)
    th = math.radians(rng.uniform(16, 38)); tg = V((-math.sin(a), math.cos(a), 0)); yaw_ = Quaternion(V((0, 0, 1)), rng.uniform(0, math.tau))
    qr = Quaternion(tg, th) @ yaw_; qf = yaw_
    pos = GI + V((math.cos(a) * rr, math.sin(a) * rr, 0.6 + rng.uniform(0, 2.2)))
    rk(ob, EX - 1, pos - V((0, 0, 2)), qf, 0)
    rk(ob, EX, pos - V((0, 0, 2)), qf, 1.0)
    rk(ob, EX + 4, pos + V((0, 0, 6 + rng.uniform(0, 5))), Quaternion(tg, th * 1.3) @ yaw_, 1.0)
    rk(ob, EX + 9, pos, qr, 1.0)
    rk(ob, EX + 118, pos, qr, 1.0); rk(ob, EX + 130, pos - V((0, 0, 3)), qr, 0)

# ---------- volta para a mao no 142 ----------
star(cS, 'S6_FlashC', HAND, CATCH, 28, GW, 5)
glow_disc(cS, 'S6_FlashCG', HAND, V((0, -1, 0.3)), CATCH, 36, G, 3.0)
wave_ring(cS, 'S6_WC', HAND, CATCH, 30, 16, GW, 3.0, normal=V((0, -1, 0.2)), z=0)
sparks2(cS, 'S6_SpC', HAND, V((0, -1, 0.3)), CATCH, 8, 26, GW, spread=1.8, dur=(8, 14))

# ---------- visibilidade ----------
for c_ in bpy.data.collections:
    if c_.name.startswith('FX_'):
        lc = bpy.context.view_layer.layer_collection.children.get(c_.name)
        if lc: lc.exclude = (c_.name != 'FX_Skill6_ShieldThrow'); lc.hide_viewport = False
        c_.hide_render = (c_.name != 'FX_Skill6_ShieldThrow')
for a_ in bpy.data.actions:
    if a_.name.startswith('S6_'): a_.name = 'zFX_' + a_.name
sc.frame_start = 0; sc.frame_end = 228; sc.frame_set(0)
bpy.data.orphans_purge(do_recursive=True)
print('skill6 fx ok', len(cS.objects), 'objetos')
