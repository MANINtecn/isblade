import bpy, math, random, bmesh
from mathutils import Matrix, Vector
DY_O = 2.0
exec(open(r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\atk.py").read())
SPOS = {(n_, f_ // 2): v_ for (n_, f_), v_ in SPOS.items() if f_ % 2 == 0}
rng = random.Random(11)
GOLD = (1.0, 0.78, 0.25, 1); WHITE = (1.0, 0.96, 0.85, 1); ICE = (0.6, 0.85, 1.0, 1); DUST = (0.55, 0.5, 0.42, 1)

for cn in ('FX_Atk01_Bash', 'FX_Atk02_Sweep', 'FX_Atk03_Smash', 'FX_Atk03_Spin', 'FX_Atk01_Rush', 'FX_Atk03_JumpSlam'):
    c = bpy.data.collections.get(cn)
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(c)
c1 = fx_collection('FX_Atk01_Rush'); c2 = fx_collection('FX_Atk02_Sweep'); c3 = fx_collection('FX_Atk03_JumpSlam')
for m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(m)
for m in [m for m in bpy.data.materials if m.users == 0]: bpy.data.materials.remove(m)


def mesh_spike():
    bm = bmesh.new()
    b = [bm.verts.new((x, -0.5, z)) for x, z in ((-.5, -.5), (.5, -.5), (.5, .5), (-.5, .5))]
    t = bm.verts.new((0, 0.5, 0))
    bm.faces.new(b)
    for i in range(4): bm.faces.new((b[i], b[(i + 1) % 4], t))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('spike'); bm.to_mesh(me); bm.free(); return me

def smoke_material(ob):
    nt = ob.active_material.node_tree
    mix = nt.nodes[ob['mix']]
    em = next(n for n in nt.nodes if n.type == 'EMISSION')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.6
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 6.0
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[1].position = 0.75
    m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'
    m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; m2.use_clamp = True
    nt.links.new(lw.outputs['Facing'], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(pw.outputs[0], m1.inputs[0]); nt.links.new(ramp.outputs['Color'], m1.inputs[1])
    m2.inputs[0].default_value = 0.0
    nt.links.new(m1.outputs[0], m2.inputs[1]); nt.links.new(m2.outputs[0], mix.inputs[0])
    # cor tambem varia com o ruido
    cr = nt.nodes.new('ShaderNodeMix'); cr.data_type = 'RGBA'
    cr.inputs['A'].default_value = (0.32, 0.28, 0.24, 1); cr.inputs['B'].default_value = (0.78, 0.74, 0.68, 1)
    nt.links.new(nz.outputs['Fac'], cr.inputs['Factor']); nt.links.new(cr.outputs['Result'], em.inputs['Color'])
    ob['mix'] = m2.name

def quat_key(ob, f, q):
    ob.rotation_mode = 'QUATERNION'; ob.rotation_quaternion = q
    ob.keyframe_insert('rotation_quaternion', frame=f)

def streak(col, name, a, b, f0, f1, w, color, st, grow=True, hold=0.35, fade='tip'):
    """risco de energia: cresce de a ate b e some"""
    d = b - a; L = d.length
    q = V((0, 1, 0)).rotation_difference(d.normalized())
    ob = fx_obj(name, mesh_spike(), col, color, st)
    grad_alpha(ob, fade)
    for f in (f0 - 1, f0, f1):
        quat_key(ob, f, q)
    fx_key(ob, f0 - 1, loc=a, scale=(0, 0, 0), alpha=0)
    fx_key(ob, f0, loc=a + d * 0.25, scale=(w, L * 0.5, w), alpha=0.9)
    fx_key(ob, f0 + max(1, int((f1 - f0) * hold)), loc=a + d * 0.5, scale=(w, L, w), alpha=0.8)
    fx_key(ob, f1, loc=a + d * 0.5, scale=(w * 0.3, L, w * 0.3), alpha=0)
    fx_key(ob, f1 + 1, scale=(0, 0, 0), alpha=0)
    return ob

def star(col, name, p, f0, size, color, st=4):
    """flash em estrela: 3 lâminas cruzadas"""
    for k in range(3):
        ob = fx_obj(f'{name}_{k}', mesh_cube(1), col, color, st)
        rot = Matrix.Rotation(math.radians(60 * k), 3, 'Y').to_quaternion()
        quat_key(ob, f0 - 1, rot); quat_key(ob, f0 + 5, rot)
        fx_key(ob, f0 - 1, loc=p, scale=(0, 0, 0), alpha=0)
        fx_key(ob, f0, loc=p, scale=(size * 0.035, size * 0.035, size), alpha=0.9)
        fx_key(ob, f0 + 4, loc=p, scale=(size * 0.015, size * 0.015, size * 1.4), alpha=0)
        fx_key(ob, f0 + 5, scale=(0, 0, 0), alpha=0)

def ring(col, name, p, n, f0, r0, r1, dur, color, st=3.5, thick=.10, drift=0.0, lag=0):
    q = V((0, 1, 0)).rotation_difference(n.normalized())
    r = fx_obj(name, mesh_torus(1, thick), col, color, st)
    quat_key(r, f0 + lag - 1, q); quat_key(r, f0 + lag + dur, q)
    fx_key(r, f0 + lag - 1, loc=p, scale=0, alpha=0)
    fx_key(r, f0 + lag, loc=p, scale=r0, alpha=1)
    fx_key(r, f0 + lag + dur, loc=p + n.normalized() * drift, scale=r1, alpha=0)
    fx_key(r, f0 + lag + dur + 1, scale=0, alpha=0)

def sparks(col, name, p, n, f0, count, speed, length, color=GOLD, spread=1.0):
    side = n.cross(V((0, 0, 1)))
    if side.length < 0.1: side = V((1, 0, 0))
    side.normalize(); up = side.cross(n).normalized()
    for k in range(count):
        a = rng.uniform(0, math.tau); sp = rng.uniform(0.6, 1.0) * speed
        d = ((side * math.cos(a) + up * math.sin(a)) * spread + n.normalized() * 0.55).normalized()
        d.z += 0.25; d.normalize()
        streak(col, f'{name}_{k}', p + d * 2, p + d * sp, f0, f0 + rng.randint(6, 9), 0.5, color, 2.2, hold=0.5)

def puff(col, name, p, f0, size, drift):
    ob = fx_obj(name, mesh_sphere(1), col, DUST, 0.7)
    smoke_material(ob)
    ob.rotation_euler = (rng.uniform(0, 3), rng.uniform(0, 3), rng.uniform(0, 3))
    fx_key(ob, f0 - 1, loc=p, scale=0, alpha=0)
    fx_key(ob, f0, loc=p, scale=size * 0.45, alpha=1.0)
    fx_key(ob, f0 + 8, loc=p + drift, scale=size * 1.1, alpha=0.7)
    fx_key(ob, f0 + 16, loc=p + drift * 1.6, scale=size * 1.5, alpha=0)
    fx_key(ob, f0 + 17, scale=0, alpha=0)


def _mat_nodes(ob):
    return ob.active_material.node_tree, ob.active_material.node_tree.nodes[ob['mix']]

def grad_alpha(ob, fade='tip', power=1.4):
    """degrade ao longo do risco: 'tip' = ponta forte; 'base' = base forte"""
    nt, mix = _mat_nodes(ob)
    tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ')
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.clamp = True
    lo, hi = (-0.5, 0.5) if fade == 'tip' else (0.5, -0.5)
    mr.inputs['From Min'].default_value = lo; mr.inputs['From Max'].default_value = hi
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    nt.links.new(tc.outputs['Object'], sp.inputs[0]); nt.links.new(sp.outputs['Y'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], pw.inputs[0]); nt.links.new(pw.outputs[0], mu.inputs[1]); nt.links.new(mu.outputs[0], mix.inputs[0])
    ob['mix'] = mu.name

def bell_alpha(ob, z0, z1):
    """faixa que some nas bordas de cima e de baixo"""
    nt, mix = _mat_nodes(ob)
    tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ')
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.clamp = True
    mr.inputs['From Min'].default_value = z0; mr.inputs['From Max'].default_value = z1
    pi = nt.nodes.new('ShaderNodeMath'); pi.operation = 'MULTIPLY'; pi.inputs[1].default_value = math.pi
    sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 0.7
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    nt.links.new(tc.outputs['Object'], sp.inputs[0]); nt.links.new(sp.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], pi.inputs[0]); nt.links.new(pi.outputs[0], sn.inputs[0])
    nt.links.new(sn.outputs[0], pw.inputs[0]); nt.links.new(pw.outputs[0], mu.inputs[1]); nt.links.new(mu.outputs[0], mix.inputs[0])
    ob['mix'] = mu.name

def annulus_mesh(inner=0.82, n=64):
    bm = bmesh.new()
    a = [bm.verts.new((math.cos(i / n * math.tau) * inner, math.sin(i / n * math.tau) * inner, 0)) for i in range(n)]
    b = [bm.verts.new((math.cos(i / n * math.tau), math.sin(i / n * math.tau), 0)) for i in range(n)]
    for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    me = bpy.data.meshes.new('annulus'); bm.to_mesh(me); bm.free(); return me

def _radial(ob, lo, hi, power):
    nt, mix = _mat_nodes(ob)
    tc = nt.nodes.new('ShaderNodeTexCoord'); ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.clamp = True
    mr.inputs['From Min'].default_value = lo; mr.inputs['From Max'].default_value = hi
    mr.inputs['To Min'].default_value = 0.0 if hi > lo else 1.0; mr.inputs['To Max'].default_value = 1.0 if hi > lo else 0.0
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = power
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    nt.links.new(tc.outputs['Object'], ln.inputs[0]); nt.links.new(ln.outputs['Value'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], pw.inputs[0]); nt.links.new(pw.outputs[0], mu.inputs[1]); nt.links.new(mu.outputs[0], mix.inputs[0])
    ob['mix'] = mu.name

def wave_ring(col, name, p, f0, r1, dur, color, st, lag=0, peak=0.9, normal=None, z=0.5):
    """onda de choque fina: interior transparente, brilho na borda externa, some ao abrir"""
    ob = fx_obj(name, annulus_mesh(), col, color, st)
    _radial(ob, 0.82, 1.0, 2.2)
    loc = p + V((0, 0, z))
    if normal is not None:
        q = V((0, 0, 1)).rotation_difference(normal.normalized())
        quat_key(ob, f0 + lag - 1, q); quat_key(ob, f0 + lag + dur, q)
    fx_key(ob, f0 + lag - 1, loc=loc, scale=0, alpha=0)
    fx_key(ob, f0 + lag, loc=loc, scale=4, alpha=peak)
    fx_key(ob, f0 + lag + dur * 0.6, loc=loc, scale=r1 * 0.8, alpha=peak * 0.6)
    fx_key(ob, f0 + lag + dur, loc=loc, scale=r1, alpha=0)
    fx_key(ob, f0 + lag + dur + 1, scale=0, alpha=0)

def glow_disc(col, name, p, n, f0, size, color, st=3.0):
    """clarao suave (disco com degrade radial) voltado para a direcao do impacto"""
    ob = fx_obj(name, mesh_disc(1, .02), col, color, st)
    _radial(ob, 0.0, 1.0, 2.0)
    q = V((0, 0, 1)).rotation_difference(n.normalized())
    quat_key(ob, f0 - 1, q); quat_key(ob, f0 + 7, q)
    fx_key(ob, f0 - 1, loc=p, scale=0, alpha=0)
    fx_key(ob, f0, loc=p, scale=size * 0.5, alpha=1)
    fx_key(ob, f0 + 3, loc=p, scale=size, alpha=0.6)
    fx_key(ob, f0 + 6, loc=p, scale=size * 1.25, alpha=0)
    fx_key(ob, f0 + 7, scale=0, alpha=0)

def arc_band(a0, a1, R, z0, z1, n_=6):
    bm = bmesh.new(); vs = []
    for i in range(n_ + 1):
        a = math.radians(a0 + (a1 - a0) * i / n_)
        vs.append((bm.verts.new((R * math.sin(a), -R * math.cos(a), z0)), bm.verts.new((R * math.sin(a), -R * math.cos(a), z1))))
    for i in range(n_): bm.faces.new((vs[i][0], vs[i + 1][0], vs[i + 1][1], vs[i][1]))
    me = bpy.data.meshes.new('arc'); bm.to_mesh(me); bm.free(); return me

def foot_pos(act, f):
    arm.animation_data.action = bpy.data.actions[act]; arm.animation_data.action_slot = arm.animation_data.action.slots[0]
    bpy.context.scene.frame_set(f * 2); bpy.context.view_layer.update()
    return (PB['bip01_l_foot'].head.copy(), PB['bip01_r_foot'].head.copy())

# ======================= ATK 1: investida + estocada =======================
for k in range(20):
    x = rng.uniform(-16, 16); z = rng.uniform(3, 44); y0 = rng.uniform(-8, 4)
    streak(c1, f'A1_Speed{k}', V((x, y0 - 4, z)), V((x, y0 + 36 + rng.uniform(0, 18), z)), 8 + rng.randint(0, 3), 16, rng.uniform(0.25, 0.5), WHITE, 3.0, hold=0.4, fade='base')
# arrancada: nuvem grande atras do corpo
fl_, fr2_ = foot_pos('Atk01_ShieldRush', 8)
for k in range(4):
    puff(c1, f'A1_Launch{k}', V((fl_.x + rng.uniform(-5, 5), fl_.y + rng.uniform(2, 7), 2)), 8 + k % 2, rng.uniform(6, 10), V((rng.uniform(-4, 4), 10, 4)))
# passos
for k, fr_ in enumerate((9, 11, 13, 15)):
    fl_, fr2_ = foot_pos('Atk01_ShieldRush', fr_)
    for sidefoot in (fl_, fr2_):
        puff(c1, f'A1_Step{k}_{int(sidefoot.x)}', V((sidefoot.x + rng.uniform(-2, 2), sidefoot.y + rng.uniform(0, 3), 1.5)), fr_, rng.uniform(3.5, 6), V((rng.uniform(-3, 3), 6, 3)))
fl_, fr2_ = foot_pos('Atk01_ShieldRush', 16)
for k in range(3):
    puff(c1, f'A1_Plant{k}', V((fl_.x + rng.uniform(-4, 4), fl_.y, 1.5)), 16, rng.uniform(5, 8), V((rng.uniform(-4, 4), -5, 3)))
# impacto
pos, n = SPOS[('Atk01_ShieldRush', 22)]
n = n.normalized(); P0 = pos + n * 7
glow_disc(c1, 'A1_Glow', P0, n, 22, 30, GOLD, 3.0)
wave_ring(c1, 'A1_Wave0', P0, 22, 28, 10, GOLD, 3.5, normal=n, z=0)
wave_ring(c1, 'A1_Wave1', P0, 22, 19, 10, ICE, 2.2, lag=2, peak=0.55, normal=n, z=0)
star(c1, 'A1_Star', P0, 22, 22, GOLD, 3)
sparks(c1, 'A1_Spark', P0, n, 22, 24, 36, 4)
fl_, fr2_ = foot_pos('Atk01_ShieldRush', 22)
for k in range(4):
    puff(c1, f'A1_Land{k}', V((fl_.x + rng.uniform(-4, 4), fl_.y + rng.uniform(-2, 2), 1.5)), 22, rng.uniform(5, 9), V((rng.uniform(-4, 4), -6, 3)))
for k in range(4):
    puff(c1, f'A1_Front{k}', P0 + V((rng.uniform(-6, 6), rng.uniform(-3, 3), rng.uniform(-14, -4))), 22 + k % 2, rng.uniform(6, 9), n * 8 + V((rng.uniform(-4, 4), 0, 3)))

# ======================= ATK 2: giro de 360 =======================
arm.animation_data.action = bpy.data.actions['Atk02_ShieldSweep']; arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.context.scene.frame_set(0); bpy.context.view_layer.update()
_pv = PB['Bip01_Pelvis'].head.copy()
ctr = V((_pv.x, _pv.y, 0))
pos, n = SPOS[('Atk02_ShieldSweep', 15)]
n = n.normalized()
# faixa principal do escudo: degrade nas bordas, aparece em sequencia e some
NSEG = 14
for i in range(NSEG):
    a_hi = 35 - i * 30.0; a_lo = a_hi - 30.0
    seg = fx_obj(f'A2_Arc{i}', arc_band(a_lo, a_hi, 18.0, 13.0, 31.0), c2, WHITE if i % 2 else ICE, 2.2)
    bell_alpha(seg, 13.0, 31.0)
    f0 = int(8 + i * 0.55)
    fx_key(seg, f0 - 1, loc=ctr, scale=(0, 0, 0), alpha=0)
    fx_key(seg, f0, loc=ctr, scale=(1, 1, 1), alpha=0.9)
    fx_key(seg, f0 + 5, loc=ctr, scale=(1.12, 1.12, 1), alpha=0)
    fx_key(seg, f0 + 6, scale=(0, 0, 0), alpha=0)
# vento fino em volta do corpo (3 alturas, defasado do escudo)
for j, (zc, R, off) in enumerate(((7, 15, 12), (21, 21, -8), (38, 16, 22))):
    for i in range(10):
        a_hi = 35 + off - i * 40.0; a_lo = a_hi - 40.0
        w = fx_obj(f'A2_Wind{j}_{i}', arc_band(a_lo, a_hi, R, zc - 1.6, zc + 1.6, n_=5), c2, WHITE, 2.0)
        bell_alpha(w, zc - 1.6, zc + 1.6)
        f0 = int(8 + i * 0.7)
        fx_key(w, f0 - 1, loc=ctr, scale=(0, 0, 0), alpha=0)
        fx_key(w, f0, loc=ctr, scale=(1, 1, 1), alpha=0.8)
        fx_key(w, f0 + 6, loc=ctr, scale=(1.18, 1.18, 1), alpha=0)
        fx_key(w, f0 + 7, scale=(0, 0, 0), alpha=0)
# onda de vento horizontal no impacto
wave_ring(c2, 'A2_AirWave0', ctr, 15, 52, 12, ICE, 2.4, peak=0.8, z=22)
wave_ring(c2, 'A2_AirWave1', ctr, 15, 38, 12, GOLD, 2.6, lag=3, peak=0.55, z=22)
# impacto do escudo
P0 = pos + n * 7
glow_disc(c2, 'A2_Glow', P0, n, 15, 30, GOLD, 3.0)
star(c2, 'A2_Star', P0, 15, 22, GOLD, 3)
wave_ring(c2, 'A2_Wave0', P0, 15, 24, 10, GOLD, 3.5, normal=n, z=0)
wave_ring(c2, 'A2_Wave1', P0, 15, 17, 10, ICE, 2.2, lag=2, peak=0.55, normal=n, z=0)
sparks(c2, 'A2_Spark', P0, n, 15, 24, 34, 4)
# poeira dos pes durante o giro
for k, fr_ in enumerate((8, 10, 12, 14, 16, 18)):
    fl_, fr2_ = foot_pos('Atk02_ShieldSweep', fr_)
    for sidefoot in (fl_, fr2_):
        puff(c2, f'A2_Dust{k}_{int(sidefoot.x)}', V((sidefoot.x + rng.uniform(-3, 3), sidefoot.y + rng.uniform(-3, 3), 1.5)), fr_, rng.uniform(4, 7), V((rng.uniform(-8, 8), rng.uniform(-8, 8), 3)))

# ======================= ATK 3: salto + pancada no chao =======================
IMP = 35
# ponto exato onde o escudo toca o chao (frame de impacto)
arm.animation_data.action = bpy.data.actions['Atk03_ShieldJumpSlam']; arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.context.scene.frame_set(IMP * 2); bpy.context.view_layer.update()
_mw = SH.matrix_world
_low = sorted([(_mw @ v.co) for v in SH.data.vertices], key=lambda q: q.z)[:30]
G0 = V((sum(q.x for q in _low) / len(_low), sum(q.y for q in _low) / len(_low), 0.3))
FLOOR_N = V((0, 0, 1))
# rastro do escudo subindo
sp14, _ = SPOS[('Atk03_ShieldJumpSlam', 14)]
for k in range(5):
    x = rng.uniform(-7, 7)
    streak(c3, f'A3_Rise{k}', V((x, sp14.y + 4, 12 + k * 4)), V((x, sp14.y + 4, 44 + k * 5)), 9 + k, 17, 0.4, WHITE, 2.5)
# decolagem
fl, fr = foot_pos('Atk03_ShieldJumpSlam', 14)
for k in range(5):
    puff(c3, f'A3_Takeoff{k}', V((fl.x + rng.uniform(-6, 6), fl.y + rng.uniform(-3, 3), 1.5)), 15 + k % 2, rng.uniform(5, 8), V((rng.uniform(-6, 6), rng.uniform(-6, 6), 3)))
# queda: riscos verticais acima do escudo
sp27, _ = SPOS[('Atk03_ShieldJumpSlam', 27)]
for k in range(10):
    x = G0.x + rng.uniform(-9, 9); y = G0.y + rng.uniform(-4, 4)
    streak(c3, f'A3_Fall{k}', V((x, y, 70 + rng.uniform(0, 16))), V((x, y, 30 + rng.uniform(0, 10))), 27, IMP, 0.45, WHITE, 3.0, hold=0.6)

# --- pedra realista: lascas angulares (casco convexo de pontos aleatorios) ---
def shard_mesh(seed, sx, sy, sz, npts=10):
    r = random.Random(seed)
    bm = bmesh.new()
    for _ in range(npts):
        bm.verts.new((r.uniform(-1, 1) * sx, r.uniform(-1, 1) * sy, r.uniform(-1, 1) * sz))
    hull = bmesh.ops.convex_hull(bm, input=list(bm.verts))
    _g = [e for e in set(hull['geom_interior'] + hull['geom_unused']) if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.delete(bm, geom=_g, context='VERTS')
    me = bpy.data.meshes.new('shard'); bm.to_mesh(me); bm.free()
    for pl in me.polygons: pl.use_smooth = False
    return me

def rock_mat():
    m = bpy.data.materials.get('FX_Rock')
    if m: return m
    m = bpy.data.materials.new('FX_Rock'); m.use_nodes = True
    nt = m.node_tree; bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 0.6; nz.inputs['Detail'].default_value = 8
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.10, 0.075, 0.055, 1); ramp.color_ramp.elements[1].color = (0.42, 0.36, 0.30, 1)
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.95
    return m

def rock_obj(name, me, col):
    ob = bpy.data.objects.new(name, me); col.objects.link(ob); me.materials.append(rock_mat())
    ob.rotation_mode = 'QUATERNION'; ob.scale = (0, 0, 0)
    return ob

def rk(ob, f, loc, rot, sc):
    ob.location = loc; ob.rotation_quaternion = rot; ob.scale = (sc, sc, sc)
    ob.keyframe_insert('location', frame=f); ob.keyframe_insert('rotation_quaternion', frame=f); ob.keyframe_insert('scale', frame=f)

from mathutils import Quaternion, Euler
# chao rachado: buraco irregular + rachaduras
def crater_mesh(R, seed=3):
    r = random.Random(seed); bm = bmesh.new(); n = 18
    vs = [bm.verts.new((math.cos(i / n * math.tau) * R * r.uniform(0.6, 1.15), math.sin(i / n * math.tau) * R * r.uniform(0.6, 1.15), 0)) for i in range(n)]
    c = bm.verts.new((0, 0, 0))
    for i in range(n): bm.faces.new((c, vs[i], vs[(i + 1) % n]))
    me = bpy.data.meshes.new('crater'); bm.to_mesh(me); bm.free(); return me

def crack_mesh(seed, R, n_main=11, ws=1.0):
    r = random.Random(seed); bm = bmesh.new()
    def line(x0, y0, a, length, w0, step=1.6, jitter=0.38, z=0.06):
        x, y = x0, y0; ang = a; pts = [(x, y)]; t = 0.0
        while t < length:
            ang += r.uniform(-jitter, jitter)
            if r.random() < 0.12: ang += r.choice((-1, 1)) * r.uniform(0.5, 0.9)   # quebra brusca
            st = step * r.uniform(0.7, 1.3); x += math.cos(ang) * st; y += math.sin(ang) * st; t += st; pts.append((x, y))
        prev = None; n = len(pts)
        for i, (px, py) in enumerate(pts):
            w = max(0.05, w0 * ws * (1 - i / n) ** 1.4)
            q0 = pts[max(i - 1, 0)]; q1 = pts[min(i + 1, n - 1)]
            dx, dy = q1[0] - q0[0], q1[1] - q0[1]; L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L * w, dx / L * w
            cur = (bm.verts.new((px + nx, py + ny, z)), bm.verts.new((px - nx, py - ny, z)))
            if prev: bm.faces.new((prev[0], cur[0], cur[1], prev[1]))
            prev = cur
        return pts, ang
    for i in range(n_main):
        a = i / n_main * math.tau + r.uniform(-0.22, 0.22); L = r.uniform(0.55, 1.0) * R
        pts, _ = line(0.0, 0.0, a, L, 0.95)
        for _b in range(r.choice((1, 2, 3))):
            if len(pts) < 6: break
            k = r.randint(2, len(pts) - 3); bx, by = pts[k]
            sa = a + r.choice((-1, 1)) * r.uniform(0.45, 0.95)
            sp, sang = line(bx, by, sa, L * r.uniform(0.25, 0.5), 0.55)
            if r.random() < 0.6 and len(sp) > 4:                      # ramo fino do ramo
                k2 = r.randint(2, len(sp) - 2); line(sp[k2][0], sp[k2][1], sang + r.choice((-1, 1)) * r.uniform(0.5, 1.0), L * 0.18, 0.3, step=1.1)
    me = bpy.data.meshes.new('crack'); bm.to_mesh(me); bm.free(); return me

def add_reveal(ob, r_end, f0, f1):
    """as rachaduras se abrem do centro para fora (mascara radial animada)"""
    nt = ob.active_material.node_tree; mix = nt.nodes[ob['mix']]
    tc = nt.nodes.new('ShaderNodeTexCoord'); ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
    rv = nt.nodes.new('ShaderNodeValue'); lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    nt.links.new(tc.outputs['Object'], ln.inputs[0]); nt.links.new(ln.outputs['Value'], lt.inputs[0])
    nt.links.new(rv.outputs[0], lt.inputs[1]); nt.links.new(lt.outputs[0], mu.inputs[1]); nt.links.new(mu.outputs[0], mix.inputs[0])
    ob['mix'] = mu.name
    for f, v in ((f0 - 1, 0.0), (f0, 2.0), (f1, r_end)):
        rv.outputs[0].default_value = v; rv.outputs[0].keyframe_insert('default_value', frame=f)

cr = fx_obj('A3_CraterDark', crater_mesh(13), c3, (0.05, 0.035, 0.025, 1), 0.0)
fx_key(cr, IMP - 1, loc=G0, scale=0, alpha=0); fx_key(cr, IMP, loc=G0, scale=0.55, alpha=0.95)
fx_key(cr, IMP + 5, loc=G0, scale=1.0, alpha=0.95); fx_key(cr, IMP + 40, loc=G0, scale=1.0, alpha=0.9); fx_key(cr, IMP + 52, loc=G0, scale=1.0, alpha=0)
fx_key(cr, IMP + 53, scale=0, alpha=0)
CR = 32
cd = fx_obj('A3_CracksDark', crack_mesh(5, CR, ws=1.6), c3, (0.02, 0.015, 0.01, 1), 0.0)
add_reveal(cd, CR * 1.6, IMP, IMP + 7)
fx_key(cd, IMP - 1, loc=G0, scale=0, alpha=0); fx_key(cd, IMP, loc=G0, scale=1, alpha=1)
fx_key(cd, IMP + 42, loc=G0, scale=1, alpha=1); fx_key(cd, IMP + 54, loc=G0, scale=1, alpha=0); fx_key(cd, IMP + 55, scale=0, alpha=0)
GL = G0 + V((0, 0, 0.12))
cg = fx_obj('A3_CracksGlow', crack_mesh(5, CR, ws=0.7), c3, (1.0, 0.5, 0.12, 1), 5.0)
add_reveal(cg, CR * 1.6, IMP, IMP + 6)
fx_key(cg, IMP - 1, loc=GL, scale=0, alpha=0); fx_key(cg, IMP, loc=GL, scale=1, alpha=1)
fx_key(cg, IMP + 8, loc=GL, scale=1, alpha=1); fx_key(cg, IMP + 26, loc=GL, scale=1, alpha=0.25)
fx_key(cg, IMP + 38, loc=GL, scale=1, alpha=0); fx_key(cg, IMP + 39, scale=0, alpha=0)
# nucleo branco-quente, ainda mais fino, que apaga rapido
ch = fx_obj('A3_CracksHot', crack_mesh(5, CR, ws=0.3), c3, (1.0, 0.9, 0.6, 1), 7.0)
add_reveal(ch, CR * 1.6, IMP, IMP + 6)
GH = G0 + V((0, 0, 0.18))
fx_key(ch, IMP - 1, loc=GH, scale=0, alpha=0); fx_key(ch, IMP, loc=GH, scale=1, alpha=1)
fx_key(ch, IMP + 10, loc=GH, scale=1, alpha=0.6); fx_key(ch, IMP + 18, loc=GH, scale=1, alpha=0); fx_key(ch, IMP + 19, scale=0, alpha=0)

# lajes do chao quebradas que se erguem
for k in range(9):
    a = k / 9 * math.tau + rng.uniform(-0.2, 0.2); rr = rng.uniform(7, 15)
    me = shard_mesh(100 + k, rng.uniform(3.5, 6), rng.uniform(3, 5.5), rng.uniform(0.7, 1.4), npts=9)
    ob = rock_obj(f'A3_Slab{k}', me, c3)
    base = G0 + V((math.cos(a) * rr, math.sin(a) * rr, 0.4))
    tang = V((-math.sin(a), math.cos(a), 0))
    tilt = Quaternion(tang, math.radians(rng.uniform(22, 48)))
    yaw = Quaternion(V((0, 0, 1)), rng.uniform(0, math.tau))
    q_end = tilt @ yaw
    rk(ob, IMP - 1, base, Quaternion(), 0)
    rk(ob, IMP, base, yaw, 1.0)
    rk(ob, IMP + 4, base + V((0, 0, rng.uniform(2, 4))), q_end, 1.0)
    rk(ob, IMP + 8, base + V((0, 0, 1.2)), Quaternion(tang, math.radians(rng.uniform(15, 35))) @ yaw, 1.0)
    rk(ob, IMP + 40, base + V((0, 0, 1.2)), Quaternion(tang, math.radians(rng.uniform(15, 35))) @ yaw, 1.0)
    rk(ob, IMP + 50, base + V((0, 0, -3)), Quaternion(tang, math.radians(10)) @ yaw, 1.0)
    rk(ob, IMP + 51, base, Quaternion(), 0)

# destrocos voando: lascas angulares de tamanhos variados
for k in range(26):
    big = k < 6
    sz = rng.uniform(1.6, 3.0) if big else rng.uniform(0.5, 1.4)
    me = shard_mesh(300 + k, sz * rng.uniform(0.7, 1.3), sz * rng.uniform(0.5, 1.2), sz * rng.uniform(0.4, 1.0), npts=rng.choice((7, 8, 9, 10)))
    ob = rock_obj(f'A3_Debris{k}', me, c3)
    ang = rng.uniform(0, math.tau); spd = rng.uniform(1.4, 4.2) * (0.8 if big else 1.0); vz = rng.uniform(26, 56) * (0.7 if big else 1.0)
    st = Quaternion(V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(), rng.uniform(0, 6))
    spin_ax = V((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized(); spin = rng.uniform(3, 9) * rng.choice((-1, 1))
    pos0 = G0 + V((math.cos(ang) * rng.uniform(1, 5), math.sin(ang) * rng.uniform(1, 5), 1.0))
    rk(ob, IMP - 1, pos0, st, 0)
    landed = None; rest = None
    for i in range(0, 36):
        f = IMP + i; t = i / 24.0
        x = pos0.x + math.cos(ang) * spd * i * 1.7; y = pos0.y + math.sin(ang) * spd * i * 1.7
        z = pos0.z + vz * t - 0.5 * 160 * t * t
        if z <= sz * 0.35:
            z = sz * 0.35
            if landed is None: landed = (x, y)
            x, y = landed
        rot = Quaternion(spin_ax, spin * t * (0.25 if landed else 1.0)) @ st
        if f % 2 == 0 or landed is not None and rest is None:
            rk(ob, f, V((x, y, z)), rot, 1.0)
        if landed is not None and rest is None: rest = (V((x, y, z)), rot)
        if landed is not None and i > 14: break
    if rest is None: rest = (V((x, y, 0.3)), rot)
    rk(ob, IMP + 46, rest[0], rest[1], 1.0)
    rk(ob, IMP + 52, rest[0] - V((0, 0, 1.5)), rest[1], 0)

# nuvem de poeira em anel (fumaça com textura)
for k in range(14):
    a = k / 14 * math.tau
    puff(c3, f'A3_Ring{k}', G0 + V((math.cos(a) * 6, math.sin(a) * 6, 2)), IMP, rng.uniform(5, 9), V((math.cos(a) * 16, math.sin(a) * 16, 3)))
for k in range(5):
    puff(c3, f'A3_Core{k}', G0 + V((rng.uniform(-3, 3), rng.uniform(-3, 3), 2)), IMP + 1, rng.uniform(7, 11), V((rng.uniform(-3, 3), rng.uniform(-3, 3), 9)))
# ondas de choque e brilho
star(c3, 'A3_Star', G0 + V((0, 0, 6)), IMP, 30, GOLD, 3)
wave_ring(c3, 'A3_Wave0', G0, IMP, 52, 14, GOLD, 3.5)
wave_ring(c3, 'A3_Wave1', G0, IMP, 38, 14, ICE, 2.2, lag=3, peak=0.55)
sparks(c3, 'A3_Spark', G0 + V((0, 0, 3)), V((0, 0, 1)), IMP, 24, 32, 5, spread=1.4)


def _scale_action(act):
    for l in act.layers:
        for st in l.strips:
            for cb in st.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points:
                        kp.co.x *= 2; kp.handle_left.x *= 2; kp.handle_right.x *= 2
                    fc.update()
_seen = set()
for _c in (c1, c2, c3):
    for _o in _c.objects:
        acts = []
        if _o.animation_data and _o.animation_data.action: acts.append(_o.animation_data.action)
        for _m in (_o.data.materials if hasattr(_o.data, 'materials') else []):
            if _m and _m.node_tree and _m.node_tree.animation_data and _m.node_tree.animation_data.action: acts.append(_m.node_tree.animation_data.action)
        for _a in acts:
            if _a.name not in _seen:
                _seen.add(_a.name); _scale_action(_a)
bpy.data.orphans_purge(do_recursive=True)
print('fx dobrado:', len(_seen), 'acoes')

# visibilidade
for cc in (c1, c2, c3):
    lc = bpy.context.view_layer.layer_collection.children.get(cc.name)
    if lc: lc.exclude = False; lc.hide_viewport = True
bpy.context.view_layer.layer_collection.children['FX_Atk01_Rush'].hide_viewport = False
arm.animation_data.action = bpy.data.actions['Atk01_ShieldRush']
arm.animation_data.action_slot = arm.animation_data.action.slots[0]
bpy.context.scene.frame_start = 0; bpy.context.scene.frame_end = 38; bpy.context.scene.frame_set(0)
print('fx2 ok', len(c1.objects), len(c2.objects), len(c3.objects))
