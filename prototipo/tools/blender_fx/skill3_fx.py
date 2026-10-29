"""Skill 3 - Shield Rain: efeitos (48 fps). Impacto no frame 144."""
import bpy, math, random, bmesh
import numpy as np
from mathutils import Matrix, Vector, Quaternion
V = Vector
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
exec(open(_dir + "skill3_anim.py").read())
_fx = open(_dir + "atk_fx2.py").read()
_s2 = open(_dir + "skill2_fx.py").read()
rng = random.Random(33)
GOLD = (1.0, 0.78, 0.25, 1); WHITE = (1.0, 0.96, 0.85, 1); ICE = (0.6, 0.85, 1.0, 1); DUST = (0.55, 0.5, 0.42, 1)
exec(_fx[_fx.index("def mesh_spike"):_fx.index("# ======================= ATK 1")])
exec(_fx[_fx.index("# --- pedra realista"):_fx.index("cr = fx_obj('A3_CraterDark'")])
AW = (0.86, 0.95, 1.0, 1); AB = (0.35, 0.7, 1.0, 1); AD = (0.15, 0.42, 1.0, 1)
IMP = 144

_c = bpy.data.collections.get('FX_Skill3_ShieldRain')
if _c:
    for _o in list(_c.objects): bpy.data.objects.remove(_o, do_unlink=True)
    bpy.data.collections.remove(_c)
cS = fx_collection('FX_Skill3_ShieldRain')
for _m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(_m)

# helpers da skill 2 (vis, rewire, ribbon_mesh, uv_taper)
exec(_s2[_s2.index("def vis("):_s2.index("emp = bpy.data.objects.new('Aegis_Swirl'")])

# ---------- posicoes ----------
arm.animation_data.action = bpy.data.actions['Skill3_ShieldRain']; arm.animation_data.action_slot = arm.animation_data.action.slots[0]
sc = bpy.context.scene
sc.frame_set(0); bpy.context.view_layer.update()
CTR = V(((PB['bip01_l_foot'].head.x + PB['bip01_r_foot'].head.x) / 2, (PB['bip01_l_foot'].head.y + PB['bip01_r_foot'].head.y) / 2, 0))
IMPC = V((CTR.x, CTR.y - 50.0, 0))
GI = V((IMPC.x, IMPC.y, 0.3))
def shield_pts(f):
    sc.frame_set(f); bpy.context.view_layer.update()
    mw = SH.matrix_world; return [mw @ v.co for v in SH.data.vertices]
_p = shield_pts(100); S_OVER = sum(_p, V((0, 0, 0))) / len(_p)
sc.frame_set(0)

# ---------- circulo magico no chao (g1-g15) ----------
W2, H2 = 2048, 96
if 'FX_Rune_strip' not in bpy.data.images:
    raise RuntimeError('rode skill2_fx.py antes (gera a textura de runas)')
im = bpy.data.images['FX_Rune_strip']
def flat_ring(r0, r1, rep, n=96):
    bm = bmesh.new(); rows = []
    for i in range(n + 1):
        a = i / n * math.tau
        rows.append((bm.verts.new((r0 * math.cos(a), r0 * math.sin(a), 0)), bm.verts.new((r1 * math.cos(a), r1 * math.sin(a), 0))))
    for i in range(n): bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
    uv = bm.loops.layers.uv.new('UV')
    for f in bm.faces:
        for l in f.loops:
            idx = [j for j, rw in enumerate(rows) if l.vert in rw][0]
            l[uv].uv = (idx / n * rep, 0.0 if l.vert == rows[idx][0] else 1.0)
    me = bpy.data.meshes.new('fring'); bm.to_mesh(me); bm.free(); return me
def rune_shape(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord'); tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = im; tx.extension = 'REPEAT'
    nt.links.new(tc.outputs['UV'], tx.inputs['Vector'])
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tx.outputs['Color'], sp.inputs[0])
    return sp.outputs['Red']
rings = []
for j, (r0, r1, rep, sp_) in enumerate(((26.0, 32.0, 2, 1.0), (16.0, 21.0, 2, -1.3))):
    ob = fx_obj(f'S3_CircleRunes{j}', flat_ring(r0, r1, rep), cS, AW if j == 0 else AB, 4.5)
    rewire(ob, rune_shape); ob.rotation_mode = 'XYZ'
    ob.location = CTR + V((0, 0, 0.3))
    fx_key(ob, 2, loc=CTR + V((0, 0, 0.3)), scale=(0, 0, 0), alpha=0, rot=(0, 0, 0))
    fx_key(ob, 14, scale=(0.6, 0.6, 0.6), alpha=0.6, rot=(0, 0, sp_ * 0.4))
    fx_key(ob, 45, scale=(1, 1, 1), alpha=1.0, rot=(0, 0, sp_ * 1.4))
    fx_key(ob, 132, scale=(1, 1, 1), alpha=1.0, rot=(0, 0, sp_ * 5.2))
    fx_key(ob, 156, scale=(1.08, 1.08, 1.08), alpha=0, rot=(0, 0, sp_ * 6.2))
    fx_key(ob, 157, scale=(0, 0, 0), alpha=0)
disc = fx_obj('S3_CircleGlow', mesh_disc(1, .02), cS, AB, 1.2)
_n = disc.active_material.node_tree; _mix = _n.nodes[disc['mix']]
_tc = _n.nodes.new('ShaderNodeTexCoord'); _ln = _n.nodes.new('ShaderNodeVectorMath'); _ln.operation = 'LENGTH'
_mr = _n.nodes.new('ShaderNodeMapRange'); _mr.clamp = True; _mr.inputs['From Min'].default_value = 0.0; _mr.inputs['From Max'].default_value = 1.0
_mr.inputs['To Min'].default_value = 0.25; _mr.inputs['To Max'].default_value = 0.0
_mu = _n.nodes.new('ShaderNodeMath'); _mu.operation = 'MULTIPLY'; _mu.use_clamp = True; _mu.inputs[0].default_value = 0.0
_n.links.new(_tc.outputs['Object'], _ln.inputs[0]); _n.links.new(_ln.outputs['Value'], _mr.inputs['Value'])
_n.links.new(_mr.outputs['Result'], _mu.inputs[1]); _n.links.new(_mu.outputs[0], _mix.inputs[0]); disc['mix'] = _mu.name
vis(disc, 3, 40, 130, 156, 1.0, loc=CTR + V((0, 0, 0.2)), scale=(34, 34, 34))
wave_ring(cS, 'S3_CircleWave0', CTR, 3, 30, 22, AB, 3.0, peak=0.8)
wave_ring(cS, 'S3_CircleWave1', CTR, 12, 34, 24, AW, 2.4, peak=0.6)
wave_ring(cS, 'S3_PulseWave', CTR, 84, 44, 30, AW, 2.6, peak=0.7)

# ---------- fitas de energia girando em espiral nas pernas (g16-g27) ----------
emp = bpy.data.objects.new('Rain_Swirl', None); cS.objects.link(emp)
emp.rotation_mode = 'XYZ'; emp.location = CTR
for f, ang in ((45, 0.0), (72, math.tau * 1.0), (110, math.tau * 2.4), (150, math.tau * 3.6)):
    emp.rotation_euler = (0, 0, ang); emp.keyframe_insert('rotation_euler', frame=f)
RIB = [(15, 2, 36, 1.5, 2.4, 0.0), (19, 4, 30, 1.2, 2.0, 1.4), (22, 1, 40, 1.7, 2.0, 2.8), (13, 6, 44, 1.3, 2.6, 4.2), (24, 3, 28, 1.1, 2.0, 5.6)]
for i, (R_, h0, h1, turns, w, ph) in enumerate(RIB):
    rb = fx_obj(f'S3_Ribbon{i}', ribbon_mesh(R_, h0, h1, turns, w, ph=ph), cS, AB if i % 2 else AW, 3.0)
    uv_taper(rb); rb.parent = emp
    vis(rb, 48 + i * 3, 66 + i * 3, 114, 140 + i * 2, 0.9, loc=V((0, 0, 0)))
for k in range(18):
    r_ = rng.uniform(5, 30); a_ = rng.uniform(0, math.tau); x = CTR.x + r_ * math.cos(a_); y = CTR.y + r_ * math.sin(a_)
    f0 = rng.uniform(48, 124); dur = rng.uniform(26, 44)
    streak(cS, f'S3_Rise{k}', V((x, y, 1)), V((x, y, rng.uniform(10, 38))), f0, f0 + dur, 0.3, AW if k % 3 else AB, 2.6, hold=0.5, fade='base')

# ---------- gema, raios no escudo e clarao (g23-g27) ----------
GEM = V((0, -2.7, 3.2))
gem = fx_obj('S3_Gem', mesh_sphere(1), cS, AW, 5.0); gem.parent = SH
for f, s_, a in ((60, 0, 0), (72, 1.6, 1), (84, 2.4, 1), (132, 2.0, 0.9), (IMP, 2.4, 1), (165, 1.5, 0.7), (205, 1.2, 0.5), (216, 0, 0)):
    fx_key(gem, f, loc=GEM, scale=s_, alpha=a)
def lightning_mesh(seed):
    me = crack_mesh(seed, 11, n_main=9, ws=0.7)
    me.transform(Matrix.Rotation(math.radians(90), 4, 'X')); me.transform(Matrix.Translation(GEM + V((0, -0.2, 0)))); return me
LT = [fx_obj(f'S3_Bolt{v}', lightning_mesh(70 + v * 7), cS, AW, 8.0) for v in range(3)]
for b in LT: b.parent = SH
for v, b in enumerate(LT):
    fx_key(b, 69, loc=V((0, 0, 0)), scale=(0, 0, 0), alpha=0)
    for f in range(72, 216, 3):
        on = ((f // 3) % 3 == v) and (72 <= f <= 150 or 156 <= f <= 200)
        fx_key(b, f, loc=V((0, 0, 0)), scale=(1, 1, 1) if on else (0, 0, 0), alpha=1.0 if on else 0.0)
for f0_, sz_ in ((72, 34), (80, 44), (100, 30), (126, 36)):
    star(cS, f'S3_Flare{f0_}', S_OVER + V((0, -3, 3)), f0_, sz_, AW, 4)
    glow_disc(cS, f'S3_FlareGlow{f0_}', S_OVER + V((0, -4, 3)), V((0, -1, 0.3)), f0_, sz_ * 0.55, AW, 1.4)
for k in range(6):
    a_ = rng.uniform(0, math.tau); r_ = rng.uniform(8, 18)
    p0 = S_OVER + V((r_ * math.cos(a_), r_ * math.sin(a_) * 0.6, rng.uniform(-8, 0)))
    f0 = rng.uniform(78, 125)
    streak(cS, f'S3_Halo{k}', p0, p0 + V((0, 0, rng.uniform(12, 24))), f0, f0 + 24, 0.4, AW, 3.0, hold=0.5, fade='base')

def sparks2(col, name, p, n, f0, count, speed, color, spread=1.0, dur=(12, 20), w=0.5, st=3.0):
    n = n.normalized(); side = n.cross(V((0, 0, 1)))
    if side.length < 0.1: side = V((1, 0, 0))
    side.normalize(); up = side.cross(n).normalized()
    for k in range(count):
        a = rng.uniform(0, math.tau); sp = rng.uniform(0.6, 1.0) * speed
        d = ((side * math.cos(a) + up * math.sin(a)) * spread + n * 0.5).normalized(); d.z = abs(d.z) * 0.6 + 0.12; d.normalize()
        streak(col, f'{name}_{k}', p + d * 2, p + d * sp, f0, f0 + rng.uniform(*dur), w, color, st, hold=0.5)

# ---------- escudos fantasma no ceu (g28-g38) ----------
def ghost_shape(nt):
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.4
    sc_ = nt.nodes.new('ShaderNodeMath'); sc_.operation = 'MULTIPLY'; sc_.inputs[1].default_value = 0.55
    ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; ad.inputs[1].default_value = 0.45
    nt.links.new(lw.outputs['Facing'], pw.inputs[0]); nt.links.new(pw.outputs[0], sc_.inputs[0]); nt.links.new(sc_.outputs[0], ad.inputs[0])
    return ad.outputs[0]
def ghost_look(ob):
    """escudo fantasma: usa o desenho real do escudo (cruz dourada, gema) tingido de azul, com borda de luz"""
    nt = ob.active_material.node_tree
    em = next(n for n in nt.nodes if n.type == 'EMISSION')
    tc = nt.nodes.new('ShaderNodeTexCoord'); tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = bpy.data.images['Shield_Guardian_albedo']
    nt.links.new(tc.outputs['UV'], tx.inputs['Vector'])
    tint = nt.nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'
    tint.inputs['Factor'].default_value = 0.35; tint.inputs['B'].default_value = (0.35, 0.7, 1.0, 1)
    nt.links.new(tx.outputs['Color'], tint.inputs['A'])
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    rim = nt.nodes.new('ShaderNodeMix'); rim.data_type = 'RGBA'
    rim.inputs['A'].default_value = (0, 0, 0, 1); rim.inputs['B'].default_value = (0.8, 0.95, 1.0, 1)
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 2.0
    nt.links.new(lw.outputs['Fresnel'], pw.inputs[0]); nt.links.new(pw.outputs[0], rim.inputs['Factor'])
    add = nt.nodes.new('ShaderNodeMix'); add.data_type = 'RGBA'; add.blend_type = 'ADD'; add.inputs['Factor'].default_value = 1.0
    nt.links.new(tint.outputs['Result'], add.inputs['A']); nt.links.new(rim.outputs['Result'], add.inputs['B'])
    nt.links.new(add.outputs['Result'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 2.6
NSH = 18
LAYOUT = [((-34 + 68 * ((k * 5) % NSH) / (NSH - 1), 18 * math.sin(k * 1.7)), 0.8 + 0.5 * ((k * 7) % 5) / 4.0) for k in range(NSH)]
TOP = 150.0
for i, ((dx, dz), s_) in enumerate(LAYOUT):
    me = SH.data.copy(); me.materials.clear()
    gh = fx_obj(f'S3_Ghost{i}', me, cS, AW, 2.2)
    rewire(gh, ghost_shape); ghost_look(gh)
    gh.rotation_mode = 'XYZ'
    yaw = rng.uniform(-0.18, 0.18)
    sx = IMPC.x + dx * 0.9; sy_ = IMPC.y + rng.uniform(-3, 3) + 4
    z_sky = TOP + dz
    _th = math.radians(-84 + 168 * (((i * 7) % NSH) / (NSH - 1.0)))     # leque de 180 graus a frente
    _rr = (34.0, 58.0, 82.0, 104.0)[i % 4]
    land_x = CTR.x + _rr * math.sin(_th); land_y = CTR.y - _rr * math.cos(_th)
    land_z = 12.9 * (s_ * 1.0) * 1.0
    center = (i == 0)
    t_land = IMP - 4 + (i * 5) % 9
    t_app = 84 + int(i * 0.9)
    t_fall = 112 + (0 if center else rng.randint(0, 3))
    skyS = s_ * 0.55
    fx_key(gh, t_app - 1, loc=V((sx, sy_, z_sky)), scale=(0, 0, 0), alpha=0, rot=(0, 0, yaw))
    fx_key(gh, t_app + 6, loc=V((sx, sy_, z_sky)), scale=(skyS,) * 3, alpha=0.9, rot=(0, 0, yaw))
    fx_key(gh, t_fall, loc=V((sx, sy_, z_sky - 4 * (1 if center else 0))), scale=(skyS * 1.05,) * 3, alpha=1.0, rot=(0, 0, yaw))
    n_steps = 6
    for k in range(1, n_steps + 1):
        u = k / n_steps; e = u ** 2.2
        f = t_fall + (t_land - t_fall) * u
        x = sx + (land_x - sx) * e; y = sy_ + (land_y - sy_) * e; z = z_sky + (land_z - z_sky) * e
        sc2 = skyS + (s_ - skyS) * e
        fx_key(gh, f, loc=V((x, y, z)), scale=(sc2,) * 3, alpha=1.0, rot=(math.radians(-6 * (1 - e)), 0, yaw))
    fx_key(gh, t_land + 8, loc=V((land_x, land_y, land_z)), scale=(s_,) * 3, alpha=0.9, rot=(0, 0, yaw))
    fx_key(gh, t_land + 30, loc=V((land_x, land_y, land_z)), scale=(s_,) * 3, alpha=0.0, rot=(0, 0, yaw))
    fx_key(gh, t_land + 31, scale=(0, 0, 0), alpha=0)
    streak(cS, f'S3_Trail{i}', V((land_x * 0.4 + sx * 0.6, land_y * 0.4 + sy_ * 0.6, z_sky + 90)), V((land_x, land_y, land_z + 28 * s_)), t_fall, t_land + 3, 1.0 * s_, AB, 3.0, hold=0.7, fade='tip')
    if i % 2 == 0: streak(cS, f'S3_Trail2_{i}', V((land_x, land_y, z_sky + 50)), V((land_x, land_y, land_z + 14 * s_)), t_fall + 1, t_land + 2, 0.5, AW, 3.5, hold=0.8, fade='tip')
    _L = V((land_x, land_y, 0.3))
    if not center:
        wave_ring(cS, f'S3_LandWave{i}', _L, t_land, 22, 14, AB, 3.0, peak=0.8)
        sparks2(cS, f'S3_LandSpark{i}', _L + V((0, 0, 3)), V((0, 0, 1)), t_land, 5, 24, AW, spread=1.8, dur=(10, 16))
        for _k in range(1):
            puff(cS, f'S3_LandDust{i}_{_k}', _L + V((rng.uniform(-5, 5), rng.uniform(-5, 5), 2)), t_land, rng.uniform(4, 7), V((rng.uniform(-8, 8), rng.uniform(-8, 8), 3)))
star(cS, 'S3_SkyFlash', V((IMPC.x, IMPC.y + 4, TOP)), 88, 70, AW, 4)
glow_disc(cS, 'S3_SkyGlow', V((IMPC.x, IMPC.y + 3, TOP)), V((0, -1, 0)), 88, 44, AB, 1.4)
wave_ring(cS, 'S3_SkyWave', V((IMPC.x, IMPC.y + 4, TOP)), 90, 50, 16, AW, 2.4, normal=V((0, -1, 0)), z=0)
# fios de luz caindo do ceu (g40-g47)
for k in range(10):
    x = IMPC.x + rng.uniform(-45, 45); y = IMPC.y + rng.uniform(-18, 18)
    f0 = rng.uniform(114, 128)
    streak(cS, f'S3_Drop{k}', V((x, y, 210 + rng.uniform(0, 30))), V((x, y, 18 + rng.uniform(0, 14))), f0, IMP + 3, 0.5, AB if k % 2 else AW, 3.0, hold=0.6, fade='tip')

# ---------- impacto (g47-g52): mesmo padrao dos outros golpes ----------
exec(_s2[_s2.index("# ---------- impacto no frame 165"):_s2.index("# ---------- domo (g59-g104)")].replace('S2_', 'S3_'))

# ---------- raios longos saindo do impacto (g50-g63) ----------
for k in range(12):
    a = k / 12 * math.tau + rng.uniform(-0.2, 0.2); el = rng.uniform(0.35, 1.1)
    d = V((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
    p0 = GI + V((0, 0, 4)); L = rng.uniform(70, 110)
    streak(cS, f'S3_LongBolt{k}', p0 + d * 6, p0 + d * L, IMP + 1 + rng.randint(0, 4), IMP + 30 + rng.randint(0, 10), 1.1, AW if k % 2 else AB, 4.0, hold=0.35, fade='tip')
for k in range(26):
    a = rng.uniform(0, math.tau); r_ = rng.uniform(4, 60); x = IMPC.x + r_ * math.cos(a); y = IMPC.y + r_ * math.sin(a)
    z0 = rng.uniform(14, 70); f0 = rng.uniform(IMP + 6, IMP + 80); dur = rng.uniform(34, 64)
    mt = fx_obj(f'S3_Mote{k}', mesh_cube(0.7), cS, AW, 4.0)
    fx_key(mt, f0 - 1, loc=V((x, y, z0)), scale=(0, 0, 0), alpha=0)
    fx_key(mt, f0, loc=V((x, y, z0)), scale=(1, 1, 1), alpha=0.9)
    fx_key(mt, f0 + dur, loc=V((x + rng.uniform(-3, 3), y + rng.uniform(-3, 3), max(z0 - rng.uniform(20, 40), 1.0))), scale=(1, 1, 1), alpha=0.0)
    fx_key(mt, f0 + dur + 1, scale=(0, 0, 0), alpha=0)

# ---------- visibilidade ----------
for c_ in bpy.data.collections:
    if c_.name.startswith('FX_'):
        lc = bpy.context.view_layer.layer_collection.children.get(c_.name)
        if lc: lc.exclude = (c_.name != 'FX_Skill3_ShieldRain'); lc.hide_viewport = False
        c_.hide_render = (c_.name != 'FX_Skill3_ShieldRain')
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 216; sc.frame_set(0)
print('skill3 fx ok', len(cS.objects), 'objetos; IMPC', [round(x, 1) for x in IMPC], 'S_OVER', [round(x, 1) for x in S_OVER])
