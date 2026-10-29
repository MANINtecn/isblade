"""Skill 4 - Rugido do Guardiao: efeitos dourados (48 fps). Burst no frame 96, rugido 82-178."""
import bpy, math, random, bmesh
from mathutils import Matrix, Vector, Quaternion
V = Vector
_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_fx\\"
exec(open(_dir + "skill4_anim.py").read())
_fx = open(_dir + "atk_fx2.py").read()
_s2 = open(_dir + "skill2_fx.py").read()
_s3 = open(_dir + "skill3_fx.py").read()
rng = random.Random(44)
GOLD = (1.0, 0.78, 0.25, 1); WHITE = (1.0, 0.96, 0.85, 1); ICE = (0.6, 0.85, 1.0, 1); DUST = (0.55, 0.5, 0.42, 1)
exec(_fx[_fx.index("def mesh_spike"):_fx.index("# ======================= ATK 1")])
GL = (1.0, 0.72, 0.18, 1); GW = (1.0, 0.92, 0.6, 1); GA = (1.0, 0.5, 0.08, 1)
BURST = 96

_c = bpy.data.collections.get('FX_Skill4_Roar')
if _c:
    for _o in list(_c.objects): bpy.data.objects.remove(_o, do_unlink=True)
    bpy.data.collections.remove(_c)
cS = fx_collection('FX_Skill4_Roar')
for _m in [m for m in bpy.data.meshes if m.users == 0]: bpy.data.meshes.remove(_m)
exec(_s2[_s2.index("def vis("):_s2.index("emp = bpy.data.objects.new('Aegis_Swirl'")])
exec(_s3[_s3.index("def flat_ring("):_s3.index("rings = []")])
im = bpy.data.images['FX_Rune_strip']

arm.animation_data.action = bpy.data.actions['Skill4_GuardianRoar']; arm.animation_data.action_slot = arm.animation_data.action.slots[0]
sc = bpy.context.scene
sc.frame_set(0); bpy.context.view_layer.update()
CTR = V(((PB['bip01_l_foot'].head.x + PB['bip01_r_foot'].head.x) / 2, (PB['bip01_l_foot'].head.y + PB['bip01_r_foot'].head.y) / 2, 0))
sc.frame_set(110); bpy.context.view_layer.update()
CHEST = PB['bip01_spine2'].head.copy()
sc.frame_set(0)

# ---------- circulo de runas no chao (v39) ----------
for j, (r0, r1, spd, rep) in enumerate(((26.0, 32.0, 1.0, 2), (16.0, 21.0, -1.4, 2))):
    ob = fx_obj(f'S4_Runes{j}', flat_ring(r0, r1, rep), cS, GL, 5.0)
    rewire(ob, rune_shape); ob.rotation_mode = 'XYZ'
    loc = CTR + V((0, 0, 0.3))
    fx_key(ob, 76, loc=loc, scale=(0, 0, 0), alpha=0, rot=(0, 0, 0))
    fx_key(ob, 96, scale=(1, 1, 1), alpha=1.0, rot=(0, 0, spd * 0.9))
    fx_key(ob, 250, scale=(1, 1, 1), alpha=0.9, rot=(0, 0, spd * 5.0))
    fx_key(ob, 306, scale=(1.05, 1.05, 1.05), alpha=0, rot=(0, 0, spd * 6.5))
    fx_key(ob, 307, scale=(0, 0, 0), alpha=0)
disc = fx_obj('S4_FloorGlow', mesh_disc(1, .02), cS, GL, 1.6)
_n = disc.active_material.node_tree; _mix = _n.nodes[disc['mix']]
_tc = _n.nodes.new('ShaderNodeTexCoord'); _ln = _n.nodes.new('ShaderNodeVectorMath'); _ln.operation = 'LENGTH'
_mr = _n.nodes.new('ShaderNodeMapRange'); _mr.clamp = True; _mr.inputs['From Min'].default_value = 0.0; _mr.inputs['From Max'].default_value = 1.0
_mr.inputs['To Min'].default_value = 0.5; _mr.inputs['To Max'].default_value = 0.0
_mu = _n.nodes.new('ShaderNodeMath'); _mu.operation = 'MULTIPLY'; _mu.use_clamp = True; _mu.inputs[0].default_value = 0.0
_n.links.new(_tc.outputs['Object'], _ln.inputs[0]); _n.links.new(_ln.outputs['Value'], _mr.inputs['Value'])
_n.links.new(_mr.outputs['Result'], _mu.inputs[1]); _n.links.new(_mu.outputs[0], _mix.inputs[0]); disc['mix'] = _mu.name
vis(disc, 76, 100, 250, 306, 1.0, loc=CTR + V((0, 0, 0.2)), scale=(40, 40, 40))
def wave_thin(name, p, f0, r1, dur, color, st, peak=0.9):
    """onda fina e nitida no chao: anel estreito, borda brilhante, 48 segmentos (leve)"""
    ob = fx_obj(name, annulus_mesh(0.94, 48), cS, color, st)
    _radial(ob, 0.94, 1.0, 1.4)
    loc = p + V((0, 0, 0.5))
    fx_key(ob, f0 - 1, loc=loc, scale=0, alpha=0)
    fx_key(ob, f0, loc=loc, scale=6, alpha=peak)
    fx_key(ob, f0 + dur * 0.6, loc=loc, scale=r1 * 0.8, alpha=peak * 0.7)
    fx_key(ob, f0 + dur, loc=loc, scale=r1, alpha=0)
    fx_key(ob, f0 + dur + 1, scale=0, alpha=0)
for k in range(10):                    # uma onda apos a outra, ate depois do fim da animacao
    wave_thin(f'S4_FloorWave{k}', CTR, 78 + k * 20, 60 + k * 9, 52, GW if k % 2 else GL, 6.0, peak=max(0.95 - 0.05 * k, 0.5))

# ---------- coluna de luz falhada (mesmo desenho de celulas) ----------
def column_mesh(r0=18.0, r1=12.0, h=105.0, seg=40, rings=14):
    bm = bmesh.new(); rows = []
    for j in range(rings + 1):
        t = j / rings; r = r0 + (r1 - r0) * t; z = h * t
        rows.append([bm.verts.new((r * math.cos(i / seg * math.tau), r * math.sin(i / seg * math.tau), z)) for i in range(seg)])
    for j in range(rings):
        for i in range(seg):
            bm.faces.new((rows[j][i], rows[j][(i + 1) % seg], rows[j + 1][(i + 1) % seg], rows[j + 1][i]))
    me = bpy.data.meshes.new('column'); bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = True
    return me
col_ob = fx_obj('S4_Column', column_mesh(), cS, GL, 4.2)
scroll = {}
def column_shape(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    sv = nt.nodes.new('ShaderNodeValue'); scroll['v'] = sv
    cb = nt.nodes.new('ShaderNodeCombineXYZ'); neg = nt.nodes.new('ShaderNodeMath'); neg.operation = 'MULTIPLY'; neg.inputs[1].default_value = -60.0
    nt.links.new(sv.outputs[0], neg.inputs[0]); nt.links.new(neg.outputs[0], cb.inputs['Z'])
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(cb.outputs[0], mp.inputs['Location'])
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 0.3
    nt.links.new(mp.outputs[0], vor.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.0; rp.color_ramp.elements[0].color = (1, 1, 1, 1)
    rp.color_ramp.elements[1].position = 0.045; rp.color_ramp.elements[1].color = (0, 0, 0, 1)
    nt.links.new(vor.outputs['Distance'], rp.inputs['Fac'])
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    ed = nt.nodes.new('ShaderNodeMath'); ed.operation = 'MULTIPLY'; ed.inputs[1].default_value = 0.35
    nt.links.new(lw.outputs['Facing'], ed.inputs[0])
    ve = nt.nodes.new('ShaderNodeMath'); ve.operation = 'MULTIPLY'; ve.inputs[1].default_value = 0.95
    nt.links.new(rp.outputs['Color'], ve.inputs[0])
    sm = nt.nodes.new('ShaderNodeMath'); sm.operation = 'ADD'; sm.inputs[1].default_value = 0.0
    nt.links.new(ve.outputs[0], sm.inputs[0])
    sm2 = nt.nodes.new('ShaderNodeMath'); sm2.operation = 'ADD'
    nt.links.new(sm.outputs[0], sm2.inputs[0]); nt.links.new(ed.outputs[0], sm2.inputs[1])
    # falhas: ruido grande em Z (sobe) recorta partes da coluna
    mp2 = nt.nodes.new('ShaderNodeMapping'); nt.links.new(tc.outputs['Object'], mp2.inputs['Vector']); nt.links.new(cb.outputs[0], mp2.inputs['Location'])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.06; nz.inputs['Detail'].default_value = 6.0
    nt.links.new(mp2.outputs[0], nz.inputs['Vector'])
    gp = nt.nodes.new('ShaderNodeValToRGB'); gp.color_ramp.elements[0].position = 0.47; gp.color_ramp.elements[1].position = 0.55
    nt.links.new(nz.outputs['Fac'], gp.inputs['Fac'])
    # some em cima e embaixo
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sp.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.clamp = True; mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 105.0
    nt.links.new(sp.outputs['Z'], mr.inputs['Value'])
    pi = nt.nodes.new('ShaderNodeMath'); pi.operation = 'MULTIPLY'; pi.inputs[1].default_value = math.pi; nt.links.new(mr.outputs['Result'], pi.inputs[0])
    sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'; nt.links.new(pi.outputs[0], sn.inputs[0])
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 0.45; nt.links.new(sn.outputs[0], pw.inputs[0])
    m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'; nt.links.new(sm2.outputs[0], m1.inputs[0]); nt.links.new(gp.outputs['Color'], m1.inputs[1])
    m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; nt.links.new(m1.outputs[0], m2.inputs[0]); nt.links.new(pw.outputs[0], m2.inputs[1])
    return m2.outputs[0]
rewire(col_ob, column_shape)
sv = scroll['v']
for f, v in ((96, 0.0), (312, 2.2)):
    sv.outputs[0].default_value = v; sv.outputs[0].keyframe_insert('default_value', frame=f)
LOC = V((CTR.x, CTR.y, 0.0))
fx_key(col_ob, 98, loc=LOC, scale=(0.3, 0.3, 0.02), alpha=0)
fx_key(col_ob, 106, scale=(1.0, 1.0, 0.45), alpha=1.0)
fx_key(col_ob, 118, scale=(1.0, 1.0, 1.0), alpha=1.0)
fx_key(col_ob, 190, scale=(1.0, 1.0, 1.0), alpha=0.9)
fx_key(col_ob, 250, scale=(0.9, 0.9, 1.0), alpha=0.5)
fx_key(col_ob, 290, scale=(0.8, 0.8, 1.0), alpha=0.0)
fx_key(col_ob, 291, scale=(0, 0, 0), alpha=0)

for k in range(14):
    a_ = rng.uniform(0, math.tau); r_ = 17.0 - rng.uniform(0, 2); f0 = rng.uniform(112, 200)
    x = CTR.x + r_ * math.cos(a_); y = CTR.y + r_ * math.sin(a_)
    streak(cS, f'S4_Thread{k}', V((x, y, 2)), V((x * 0.93 + CTR.x * 0.07, y * 0.93 + CTR.y * 0.07, rng.uniform(50, 100))), f0, f0 + rng.uniform(36, 60), 0.5, GW if k % 2 else GL, 4.0, hold=0.6, fade='base')

# ---------- particulas douradas (v57-v93) ----------
for k in range(36):
    a = rng.uniform(0, math.tau); r_ = rng.uniform(6, 46); x = CTR.x + r_ * math.cos(a); y = CTR.y + r_ * math.sin(a) * 0.8
    z0 = rng.uniform(4, 60); f0 = rng.uniform(BURST + 4, BURST + 56); dur = rng.uniform(44, 80)
    mt = fx_obj(f'S4_Spark{k}', mesh_cube(0.7), cS, GW if k % 3 else GL, 5.0)
    fx_key(mt, f0 - 1, loc=V((x, y, z0)), scale=(0, 0, 0), alpha=0)
    fx_key(mt, f0, loc=V((x, y, z0)), scale=(1, 1, 1), alpha=1.0)
    fx_key(mt, f0 + dur * 0.5, loc=V((x + rng.uniform(-3, 3), y + rng.uniform(-3, 3), z0 + rng.uniform(-4, 6))), scale=(1, 1, 1), alpha=0.9)
    fx_key(mt, f0 + dur, loc=V((x + rng.uniform(-4, 4), y + rng.uniform(-4, 4), max(z0 - rng.uniform(8, 20), 1.0))), scale=(1, 1, 1), alpha=0.0)
    fx_key(mt, f0 + dur + 1, scale=(0, 0, 0), alpha=0)
for k in range(24):
    x = CTR.x + rng.uniform(-14, 14); y = CTR.y + rng.uniform(-14, 14); f0 = rng.uniform(BURST - 4, BURST + 50)
    streak(cS, f'S4_Rise{k}', V((x, y, 1)), V((x, y, rng.uniform(14, 44))), f0, f0 + rng.uniform(24, 44), 0.35, GW if k % 2 else GL, 3.2, hold=0.5, fade='base')
for k in range(6):
    a = k / 6 * math.tau
    puff(cS, f'S4_Dust{k}', CTR + V((math.cos(a) * 18, math.sin(a) * 18, 2)), 80, rng.uniform(4, 7), V((math.cos(a) * 12, math.sin(a) * 12, 3)))

# ---------- visibilidade ----------
for c_ in bpy.data.collections:
    if c_.name.startswith('FX_'):
        lc = bpy.context.view_layer.layer_collection.children.get(c_.name)
        if lc: lc.exclude = (c_.name != 'FX_Skill4_Roar'); lc.hide_viewport = False
        c_.hide_render = (c_.name != 'FX_Skill4_Roar')
sc.use_preview_range = False; sc.frame_start = 0; sc.frame_end = 312; sc.frame_set(0)
bpy.data.orphans_purge(do_recursive=True)
print('skill4 fx ok', len(cS.objects), 'objetos; CHEST', [round(x, 1) for x in CHEST])
