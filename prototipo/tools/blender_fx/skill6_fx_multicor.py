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
CY = (0.0, 0.9, 1.0, 1); VI = (0.28, 0.25, 1.0, 1); GO = (1.0, 0.58, 0.05, 1); MG = (0.15, 0.5, 1.0, 1)   # ciano, indigo, ouro, azul real (sem rosa)
def tint(c, k=0.3): return (c[0] + (1 - c[0]) * k, c[1] + (1 - c[1]) * k, c[2] + (1 - c[2]) * k, 1)

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

exec(open(_dir + "fx_premium.py").read())
# ---------- rastro 3D: tubos de luz que acompanham o escudo, mais duas helices (a borda girando) ----------
def tube_trail(tag, f0, f1, rmax, color, hot, st=4.0, turns=0, R=0.0, phase=0.0, span=0.5):
    pts = path_samples(FLY, f0, f1, 4)
    if turns: pts = helix_pts(pts, R, turns, phase)
    n = len(pts); rad = [rmax * (0.12 + 0.88 * (i / (n - 1)) ** 0.8) for i in range(n)]
    ob = fx_obj(f'S6_{tag}', tube_mesh(pts, rad), cS, color, st); style_emit(ob, hot, st, noise=0.3, nscale=2.0)
    hv, tv = window_alpha(ob); key_window(hv, tv, f0, f1, span)
    ob.scale = (1, 1, 1); _nt(ob).nodes[ob['mix']].inputs[0].default_value = 1.0
for (fa, fb, tn) in ((RLS, IMP, 2.0), (EX + 1, CATCH - 1, 5.0)):
    tag = 'a' if fa == RLS else 'b'
    tube_trail('TrCore' + tag, fa, fb, 2.4, CY, tint(CY), 5.0)
    tube_trail('TrGlow' + tag, fa, fb, 5.5, VI, tint(VI, 0.35), 2.6, span=0.6)
    tube_trail('TrH0' + tag, fa, fb, 1.5, GO, tint(GO), 5.5, turns=tn, R=11.0, phase=0.0)
    tube_trail('TrH1' + tag, fa, fb, 1.5, MG, tint(MG), 5.5, turns=tn, R=11.0, phase=math.pi)


# ---------- escudo puxado para o lado: gira e brilha ----------
star(cS, 'S6_SideFlash', FLY[SP0][0], SP0, 14, GO, 5)
star(cS, 'S6_SideFlash2', FLY[RLS - 2][0], RLS - 2, 14, CY, 5)
sparks2(cS, 'S6_SideSp', FLY[SP0 + 6][0], V((1, 0, 0.2)), SP0 + 6, 12, 28, GO, spread=1.6, dur=(10, 18))
sparks2(cS, 'S6_SideSp2', FLY[RLS - 1][0], V((0, -1, 0.2)), RLS - 1, 10, 30, MG, spread=1.6, dur=(8, 14))

# ---------- raios de luz escapando do escudo por todos os lados (giram junto, mostram o giro) ----------
RAY_SPANS = ((SP0, IMP), (EX + 1, CATCH - 1))
def ray_layer(name, n, seed, color, hot, size, extra, st, bw, lmin=0.7):
    ob = fx_obj(name, spike_mesh(n, seed, bw, lmin), cS, color, st); style_emit(ob, hot, st, noise=0.35, nscale=2.5); _radial(ob, 1.05, 0.2, 0.7); ob.rotation_mode = 'QUATERNION'
    for f0, f1 in RAY_SPANS:
        fx_key(ob, f0 - 1, loc=FLY[f0][0], scale=0, alpha=0)
        for f in range(f0, f1 + 1):
            pos, q = FLY[f]; ob.rotation_quaternion = q @ Quaternion(V((0, 1, 0)), extra * f); ob.keyframe_insert('rotation_quaternion', frame=f)
            k = min(1.0, (f - f0 + 1) / 4.0, (f1 - f + 1) / 4.0)
            fx_key(ob, f, loc=pos, scale=size * (0.75 + 0.25 * k), alpha=0.95 * k)
        fx_key(ob, f1 + 1, scale=0, alpha=0)
ray_layer('S6_RaysA', 12, 7, CY, tint(CY), 50, 0.30, 5.0, 0.034)
ray_layer('S6_RaysB', 9, 21, VI, tint(VI), 38, -0.42, 5.5, 0.022)
ray_layer('S6_RaysC', 16, 3, GO, tint(GO), 26, 0.55, 4.5, 0.04, 0.6)

# ---------- chao 3D: bacia com borda levantada e veios brilhando; esconde o escudo enterrado ----------
cr = ground_fx('S6_Crater', crater3d(17, 5), cS, GO, 17.0, 3.6)
for f, s_, a in ((IMP - 1, 0, 0), (IMP, 0.7, 1), (IMP + 5, 1.0, 1), (EX - 1, 1.0, 1), (EX + 3, 1.55, 1), (EX + 8, 1.7, 1), (EX + 118, 1.7, 1), (EX + 128, 1.7, 0)):
    fx_key(cr, f, loc=GI, scale=s_ if a else 0, alpha=a)
cr.rotation_euler = (0, 0, 0.4)

def spike_burst(name, n, seed, size, bw, f0, life, st=5.0, lmin=0.55, pos=None, color=None):
    """explosao de espetos 3D saindo de um ponto so (todos se encontram no centro)"""
    ob = fx_obj(name, spike_mesh(n, seed, bw, lmin), cS, color or G, st); style_emit(ob, tint(color or G), st, noise=0.3, nscale=1.5); _radial(ob, 1.05, 0.15, 0.6)
    r0 = (rng.uniform(0, 3), rng.uniform(0, 3), rng.uniform(0, 3)); p = pos or (GI + V((0, 0, 8)))
    sg = rng.choice((-1, 1)); dl = (0.5 * sg, 0.4, 5.5 * sg)                 # gira ~1 volta enquanto a explosao acaba e vai diminuindo ate sumir
    R_ = lambda k: tuple(r0[i] + dl[i] * k for i in range(3))
    fx_key(ob, f0 - 1, loc=p, scale=0, alpha=0, rot=R_(0))
    fx_key(ob, f0, loc=p, scale=size * 0.45, alpha=1.0, rot=R_(0.02))
    fx_key(ob, f0 + 4, loc=p, scale=size, alpha=0.95, rot=R_(0.15))
    fx_key(ob, f0 + int(life * 0.6), loc=p, scale=size * 0.72, alpha=0.85, rot=R_(0.6))
    fx_key(ob, f0 + life, loc=p, scale=0, alpha=0, rot=R_(1.0))
    fx_key(ob, f0 + life + 1, scale=0, alpha=0)

def blast(tag, f0, r1, h, dur, color, lag=0, peak=0.95):
    ob = shell_fx(f'S6_Blast{tag}', cS, color, tint(color, 0.55), 4.5, nscale=(5.0, 5.0, 2.2), lo=0.3, hi=0.55, vert='fade', power=1.2)
    fx_key(ob, f0 + lag - 1, loc=GI, scale=(0, 0, 0), alpha=0); fx_key(ob, f0 + lag, loc=GI, scale=(10, 10, h * 0.5), alpha=peak)
    fx_key(ob, f0 + lag + dur * 0.5, scale=(r1 * 0.7, r1 * 0.7, h), alpha=peak * 0.7); fx_key(ob, f0 + lag + dur, scale=(r1, r1, h * 1.25), alpha=0)
    fx_key(ob, f0 + lag + dur + 1, scale=(0, 0, 0), alpha=0); key_flow(ob, f0 + lag, f0 + lag + dur, -1.5)
spike_burst('S6_BurstI0', 26, 11, 112, 0.03, IMP, 36, color=CY)
spike_burst('S6_BurstI1', 16, 29, 84, 0.022, IMP, 30, color=GO)

blast('I0', IMP, 135, 18, 20, CY); blast('I1', IMP, 95, 11, 16, VI, lag=3, peak=0.8)
wave_ring(cS, 'S6_W0', GI, IMP, 96, 26, CY, 3.6)
wave_ring(cS, 'S6_W1', GI, IMP, 70, 26, GO, 2.6, lag=3, peak=0.6)
wave_ring(cS, 'S6_W2', GI, IMP, 140, 32, VI, 2.2, lag=7, peak=0.45)
sparks2(cS, 'S6_Sp', GI + V((0, 0, 3)), V((0, 0, 1)), IMP, 18, 62, GO, spread=2.0)
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
cg = fx_obj('S6_CracksGlow1', crack_mesh(12, CR1, ws=0.8), cS, GO, 3.2); add_reveal(cg, CR1 * 1.6, IMP, IMP + 6)
for f, a in ((IMP - 1, 0), (IMP, 1), (IMP + 14, 0.5), (82, 0.85), (90, 0.45), (98, 0.9), (EX - 1, 1), (EX + 10, 1), (EX + 11, 0)): fx_key(cg, f, loc=GL, scale=1 if a else 0, alpha=a)

# ---------- enterrado (60-100): brilho pulsando, aneis que sugam para dentro, avisando a saida ----------
bg = fx_obj('S6_BuryGlow', mesh_disc(1, .02), cS, G, 3.0); _radial(bg, 0.0, 1.0, 1.8)
for f, s_, a in ((IMP + 4, 14, 0.0), (74, 16, 0.3), (82, 18, 0.2), (90, 20, 0.35), (98, 22, 0.25), (104, 26, 0.5), (EX - 1, 30, 0.6), (EX, 0, 0)):
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
glow_disc(cS, 'S6_FlashEG', GI + V((0, 0, 1.5)), V((0, 0, 1)), EX, 72, VI, 2.6)
col = shell_fx('S6_Column', cS, VI, CY, 5.5, nscale=(2.6, 2.6, 1.1), lo=0.38, hi=0.7, vert='bell', power=0.5)
colw = shell_fx('S6_ColumnW', cS, GO, tint(GO, 0.7), 6.0, nscale=(3.0, 3.0, 0.9), lo=0.3, hi=0.6, vert='bell', power=0.45)
for ob_, rr_, hh_ in ((col, 9.0, 190.0), (colw, 3.4, 175.0)):
    fx_key(ob_, EX - 1, loc=GI, scale=(0, 0, 0), alpha=0); fx_key(ob_, EX, loc=GI, scale=(rr_ * 0.7, rr_ * 0.7, hh_ * 0.3), alpha=1.0)
    fx_key(ob_, EX + 5, scale=(rr_, rr_, hh_), alpha=1.0); fx_key(ob_, EX + 16, scale=(rr_ * 0.8, rr_ * 0.8, hh_ * 1.05), alpha=0.6)
    fx_key(ob_, EX + 26, scale=(rr_ * 0.25, rr_ * 0.25, hh_ * 1.05), alpha=0); fx_key(ob_, EX + 27, scale=(0, 0, 0), alpha=0)
    key_flow(ob_, EX, EX + 26, -3.2 if ob_ is col else -4.5)
spike_burst('S6_BurstE0', 22, 41, 150, 0.03, EX, 42, color=GO)
spike_burst('S6_BurstE1', 14, 53, 110, 0.022, EX, 34, color=VI)

blast('E0', EX, 230, 34, 26, VI); blast('E1', EX, 170, 20, 22, CY, lag=4, peak=0.8)

wave_ring(cS, 'S6_WE0', GI, EX, 150, 30, VI, 3.6)
wave_ring(cS, 'S6_WE1', GI, EX, 110, 28, GO, 2.6, lag=4, peak=0.65)
wave_ring(cS, 'S6_WE2', GI, EX, 205, 36, CY, 2.2, lag=8, peak=0.5)
sparks2(cS, 'S6_SpE', GI + V((0, 0, 4)), V((0, 0, 1)), EX, 20, 78, GO, spread=1.8)
sparks2(cS, 'S6_SpEu', GI + V((0, 0, 6)), V((0, 0, 1)), EX, 10, 90, MG, spread=0.6, dur=(16, 26))
for k in range(14):
    a = k / 14 * math.tau + rng.uniform(-0.2, 0.2)
    puff(cS, f'S6_DustE{k}', GI + V((math.cos(a) * 12, math.sin(a) * 12, 2)), EX, rng.uniform(8, 13), V((math.cos(a) * 24, math.sin(a) * 24, 4)))
rocks('RockB', 16, EX, GI, (1.4, 3.8), (1.4, 3.6), (40, 88), rad=(3, 14), settle=30)

CR2 = 100
cd2 = fx_obj('S6_CracksDark2', crack_mesh(31, CR2, n_main=13, ws=3.4), cS, (0.0, 0.0, 0.0, 1), 0.0); add_reveal(cd2, CR2 * 1.6, EX, EX + 9)
for f, a in ((EX - 1, 0), (EX, 1), (EX + 118, 1), (EX + 128, 0)): fx_key(cd2, f, loc=GI + V((0, 0, 0.05)), scale=1 if a else 0, alpha=a)
cg2 = fx_obj('S6_CracksGlow2', crack_mesh(31, CR2, n_main=13, ws=1.0), cS, GO, 3.4); add_reveal(cg2, CR2 * 1.6, EX, EX + 8)
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
star(cS, 'S6_FlashC', HAND, CATCH, 28, GO, 5)
glow_disc(cS, 'S6_FlashCG', HAND, V((0, -1, 0.3)), CATCH, 36, CY, 3.0)
wave_ring(cS, 'S6_WC', HAND, CATCH, 30, 16, VI, 3.0, normal=V((0, -1, 0.2)), z=0)
sparks2(cS, 'S6_SpC', HAND, V((0, -1, 0.3)), CATCH, 8, 26, MG, spread=1.8, dur=(8, 14))

# ---------- volta: brilho pequeno no escudo + rastro de faiscas que ficam para tras e apagam ----------
orb = fx_obj('S6_ReturnOrb', mesh_sphere(1), cS, GO, 9.0); orb_h = fx_obj('S6_ReturnOrbHalo', mesh_sphere(1), cS, CY, 3.0)
for o_, sz_, al_ in ((orb, 2.4, 1.0), (orb_h, 5.5, 0.35)):
    fx_key(o_, EX, loc=FLY[EX + 1][0], scale=0, alpha=0)
    for f in range(EX + 1, CATCH):
        k = min(1.0, (f - EX) / 4.0, (CATCH - f) / 4.0); pulse = 1 + 0.15 * math.sin(f * 1.3)
        fx_key(o_, f, loc=FLY[f][0], scale=sz_ * k * pulse, alpha=al_ * k)
    fx_key(o_, CATCH, scale=0, alpha=0)
cols_ = (GO, CY, MG, GO, VI)
for f in range(EX + 3, CATCH - 2):
    for j in range(2):
        ob = fx_obj(f'S6_Spark{f}_{j}', mesh_sphere(1), cS, cols_[(f + j) % len(cols_)], 8.0)
        p0 = FLY[f][0] + V((rng.uniform(-5, 5), rng.uniform(-5, 5), rng.uniform(-5, 5))); sz_ = rng.uniform(0.7, 1.5)
        dr = V((rng.uniform(-6, 6), rng.uniform(-6, 6), rng.uniform(-9, 2)))
        fx_key(ob, f - 1, loc=p0, scale=0, alpha=0); fx_key(ob, f, loc=p0, scale=sz_, alpha=1.0)
        fx_key(ob, f + 8, loc=p0 + dr * 0.6, scale=sz_ * 0.7, alpha=0.7); fx_key(ob, f + 16, loc=p0 + dr, scale=0, alpha=0)

upgrade_rock_mat()
motes(cS, 'S6_MoteE', GI + V((0, 0, 4)), 26, EX + 6, 55, 95, GO, 11)
motes(cS, 'S6_MoteI', GI + V((0, 0, 3)), 12, IMP + 2, 28, 60, CY, 12, life=(30, 60))

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
