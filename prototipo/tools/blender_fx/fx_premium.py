"""Biblioteca de efeitos premium (3D, texturizados e com formato proprio) para as skills.
Faz parte do mesmo namespace dos scripts de skill: usa fx_obj, fx_key, fx_collection, mesh_sphere e _radial deles.
Nada de faixas chapadas: espetos e tubos com secao redonda, cascas 3D com ruido, chao com relevo e veios brilhantes."""
import bpy, bmesh, math, random
from mathutils import Vector, Quaternion
V = Vector

def _nt(ob): return ob.active_material.node_tree
def _em(ob): return next(n for n in _nt(ob).nodes if n.type == 'EMISSION')
def _link(nt, a, b): nt.links.new(a, b)

def _mix(nt, op, a=None, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    if a is not None:
        if hasattr(a, 'node'): _link(nt, a, n.inputs[0])
        else: n.inputs[0].default_value = a
    if b is not None:
        if hasattr(b, 'node'): _link(nt, b, n.inputs[1])
        else: n.inputs[1].default_value = b
    return n

def style_emit(ob, hot, strength=4.0, noise=0.0, nscale=3.0):
    """cor do brilho: centro quente (quase branco), borda na cor da skill; com ruido o brilho tremula pelo comprimento"""
    nt = _nt(ob); em = _em(ob); cold = tuple(em.inputs['Color'].default_value)
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = hot
    ramp.color_ramp.elements[1].position = 0.3; ramp.color_ramp.elements[1].color = cold
    _link(nt, lw.outputs['Facing'], ramp.inputs['Fac']); _link(nt, ramp.outputs['Color'], em.inputs['Color'])
    strength *= 0.3                                                    # menos estouro para o branco: a cor aparece
    em.inputs['Strength'].default_value = strength
    if noise > 0:
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = nscale; nz.inputs['Detail'].default_value = 3.0
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 1.0 - noise; mr.inputs['To Max'].default_value = 1.0 + noise * 0.6
        _link(nt, tc.outputs['Object'], nz.inputs['Vector']); _link(nt, nz.outputs['Fac'], mr.inputs['Value'])
        mu = _mix(nt, 'MULTIPLY', mr.outputs['Result'], strength); _link(nt, mu.outputs[0], em.inputs['Strength'])

def spike_mesh(n, seed, bw, lmin=0.6, sides=6, r0=0.03):
    """espetos de luz 3D: secao redonda, afinam em curva ate a ponta, saem do centro em todas as direcoes"""
    r = random.Random(seed); bm = bmesh.new(); ga = math.pi * (3 - math.sqrt(5))
    ts = (0.0, 0.06, 0.25, 0.5, 0.75, 0.92)
    for i in range(n):
        zc = 1 - 2 * (i + 0.5) / n; rr = math.sqrt(max(0.0, 1 - zc * zc)); ph = i * ga + r.uniform(-0.3, 0.3)
        d = (V((math.cos(ph) * rr, math.sin(ph) * rr, zc)) + V((r.uniform(-.15, .15), r.uniform(-.15, .15), r.uniform(-.15, .15)))).normalized()
        a_ = d.cross(V((0, 0, 1)) if abs(d.z) < 0.9 else V((1, 0, 0))).normalized(); b_ = d.cross(a_).normalized()
        w = bw * r.uniform(0.85, 1.25); L = r.uniform(lmin, 1.0); rings = []
        for t in ts:
            c = d * (r0 + (L - r0) * t); rad = w * (1 - t) ** 1.35 * (0.55 + 0.45 * math.sin(min(1.0, t * 4 + 0.3) * math.pi / 2))
            rings.append([bm.verts.new(c + (a_ * math.cos(k / sides * math.tau) + b_ * math.sin(k / sides * math.tau)) * rad) for k in range(sides)])
        tip = bm.verts.new(d * L)
        for i2 in range(len(ts) - 1):
            for k in range(sides):
                bm.faces.new((rings[i2][k], rings[i2][(k + 1) % sides], rings[i2 + 1][(k + 1) % sides], rings[i2 + 1][k]))
        for k in range(sides): bm.faces.new((rings[-1][k], rings[-1][(k + 1) % sides], tip))
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new('spikes'); bm.to_mesh(me); bm.free(); return me

def tube_mesh(pts, rad, sides=6):
    """tubo 3D ao longo de um caminho; u = distancia ao longo (0..1), raio por ponto"""
    n = len(pts); bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    tg = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    nr = tg[0].cross(V((0, 0, 1)))
    if nr.length < 0.1: nr = tg[0].cross(V((1, 0, 0)))
    nr.normalize(); rings = []; idx = {}
    for i in range(n):
        nr = nr - tg[i] * nr.dot(tg[i])
        if nr.length < 1e-4: nr = tg[i].cross(V((1, 0, 0)))
        nr.normalize(); bb = tg[i].cross(nr)
        ring = [bm.verts.new(pts[i] + (nr * math.cos(k / sides * math.tau) + bb * math.sin(k / sides * math.tau)) * rad[i]) for k in range(sides)]
        for k, v in enumerate(ring): idx[v] = (i, k)
        rings.append(ring)
    for i in range(n - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k])); f.smooth = True
            for lp in f.loops:
                ii, kk = idx[lp.vert]; lp[uvl].uv = (ii / (n - 1), kk / sides)
    me = bpy.data.meshes.new('tube'); bm.to_mesh(me); bm.free(); return me

def window_alpha(ob):
    """mostra so um trecho (tail..head) do tubo e esmaece a cauda; devolve os sockets head e tail para animar"""
    nt = _nt(ob); mix = nt.nodes[ob['mix']]
    tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); _link(nt, tc.outputs['UV'], sp.inputs[0])
    hv = nt.nodes.new('ShaderNodeValue'); tv = nt.nodes.new('ShaderNodeValue')
    s1 = _mix(nt, 'SUBTRACT', sp.outputs['X'], tv.outputs[0]); s2 = _mix(nt, 'SUBTRACT', hv.outputs[0], tv.outputs[0])
    mx = _mix(nt, 'MAXIMUM', s2.outputs[0], 0.02); dv = _mix(nt, 'DIVIDE', s1.outputs[0], mx.outputs[0], clamp=True)
    pw = _mix(nt, 'POWER', dv.outputs[0], 1.3); lt = _mix(nt, 'LESS_THAN', sp.outputs['X'], hv.outputs[0])
    a = _mix(nt, 'MULTIPLY', pw.outputs[0], lt.outputs[0])
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    _link(nt, a.outputs[0], mu.inputs[1]); _link(nt, mu.outputs[0], mix.inputs[0]); ob['mix'] = mu.name
    return hv.outputs[0], tv.outputs[0]

def key_window(hv, tv, f0, f1, span=0.45):
    """cabeca acompanha o escudo (f0..f1); a cauda vem atras e some depois"""
    ex = int(math.ceil(span * (f1 - f0))) + 3
    for f in range(f0 - 1, f1 + ex + 1):
        u = (f - f0) / float(f1 - f0)
        hv.default_value = max(0.0, min(1.0, u)); tv.default_value = min(1.05, u - span)
        hv.keyframe_insert('default_value', frame=f); tv.keyframe_insert('default_value', frame=f)

def path_samples(FLY, f0, f1, sub=4):
    pts = []
    for f in range(f0, f1):
        a = FLY[f][0]; b = FLY[f + 1][0]
        for k in range(sub): pts.append(a.lerp(b, k / sub))
    pts.append(FLY[f1][0]); return pts

def helix_pts(pts, R, turns, phase=0.0):
    """pontos girando em volta do caminho (como a borda do escudo girando)"""
    n = len(pts); out = []; tg0 = (pts[1] - pts[0]).normalized()
    nr = tg0.cross(V((0, 0, 1)))
    if nr.length < 0.1: nr = tg0.cross(V((1, 0, 0)))
    nr.normalize()
    for i in range(n):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        nr = nr - t * nr.dot(t); nr.normalize(); bb = t.cross(nr)
        ph = phase + turns * math.tau * i / (n - 1)
        out.append(pts[i] + (nr * math.cos(ph) + bb * math.sin(ph)) * R)
    return out

def shell_mesh(seg=48, rings=8, flare=0.12):
    """casca aberta (cilindro com abertura) de z=0 a 1, raio 1 -> 1+flare"""
    bm = bmesh.new(); vs = []
    for j in range(rings + 1):
        z = j / rings; vs.append([bm.verts.new((math.cos(k / seg * math.tau) * (1 + flare * z), math.sin(k / seg * math.tau) * (1 + flare * z), z)) for k in range(seg)])
    for j in range(rings):
        for k in range(seg): bm.faces.new((vs[j][k], vs[j][(k + 1) % seg], vs[j + 1][(k + 1) % seg], vs[j + 1][k]))
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new('shell'); bm.to_mesh(me); bm.free(); return me

def shell_fx(name, col, color, hot, strength=5.0, nscale=(3.0, 3.0, 1.6), lo=0.36, hi=0.66, vert='bell', power=0.6, flow=False):
    """casca 3D com ruido: alpha pelo ruido (contraste lo..hi) e pela altura; cor quente nos picos do ruido"""
    ob = fx_obj(name, shell_mesh(), col, color, strength); nt = _nt(ob); mix = nt.nodes[ob['mix']]; em = _em(ob)
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = nscale
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.0; nz.inputs['Detail'].default_value = 5.0; nz.inputs['Roughness'].default_value = 0.6
    _link(nt, tc.outputs['Object'], mp.inputs['Vector']); _link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = lo; ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = hi; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    _link(nt, nz.outputs['Fac'], ramp.inputs['Fac'])
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.45; cr.color_ramp.elements[0].color = color
    cr.color_ramp.elements[1].position = 0.8; cr.color_ramp.elements[1].color = hot
    _link(nt, nz.outputs['Fac'], cr.inputs['Fac']); _link(nt, cr.outputs['Color'], em.inputs['Color'])
    sz = nt.nodes.new('ShaderNodeSeparateXYZ'); _link(nt, tc.outputs['Object'], sz.inputs[0])
    if vert == 'bell':
        m = _mix(nt, 'MULTIPLY', sz.outputs['Z'], math.pi); s = _mix(nt, 'SINE', m.outputs[0]); v = _mix(nt, 'POWER', s.outputs[0], power)
    else:
        o = _mix(nt, 'SUBTRACT', 1.0, sz.outputs['Z'], clamp=True); v = _mix(nt, 'POWER', o.outputs[0], power)
    a = _mix(nt, 'MULTIPLY', ramp.outputs['Color'], v.outputs[0])
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.use_clamp = True; mu.inputs[0].default_value = 0.0
    _link(nt, a.outputs[0], mu.inputs[1]); _link(nt, mu.outputs[0], mix.inputs[0]); ob['mix'] = mu.name
    ob['flow'] = mp.name
    return ob

def key_flow(ob, f0, f1, dz):
    mp = _nt(ob).nodes[ob['flow']]; loc = mp.inputs['Location']
    for f, z in ((f0, 0.0), (f1, dz)):
        loc.default_value = (0, 0, z); loc.keyframe_insert('default_value', frame=f)

def crater3d(R, seed=5, rings=12, seg=40):
    """chao com relevo: bacia no centro, borda levantada e franja de ejecao"""
    r = random.Random(seed); bm = bmesh.new(); vs = []
    for i in range(rings + 1):
        rr = R * 1.3 * i / rings; row = []
        for k in range(seg):
            a = k / seg * math.tau; wob = 1 + 0.12 * math.sin(a * 3 + seed) + 0.07 * math.sin(a * 7 + seed * 2)
            x = rr * wob; u = x / R
            h = -2.6 * max(0.0, 1 - (u / 0.8) ** 2) + 3.4 * math.exp(-((u - 0.86) / 0.13) ** 2) + 0.9 * math.exp(-((u - 1.12) / 0.1) ** 2) + r.uniform(-0.35, 0.35) * min(1.0, u)
            row.append(bm.verts.new((math.cos(a) * x, math.sin(a) * x, h)))
        vs.append(row)
    for i in range(rings):
        for k in range(seg): bm.faces.new((vs[i][k], vs[i][(k + 1) % seg], vs[i + 1][(k + 1) % seg], vs[i + 1][k]))
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new('crater3d'); bm.to_mesh(me); bm.free(); return me

def ground_fx(name, me, col, glow, R, glow_strength=3.0):
    """chao escuro rachado com veios que brilham (Voronoi distancia-a-aresta), animavel por alpha"""
    ob = bpy.data.objects.new(name, me); col.objects.link(ob); ob.scale = (0, 0, 0)
    m = bpy.data.materials.new(name + '_mat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); pr = nt.nodes.new('ShaderNodeBsdfPrincipled'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 8.0
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (0.012, 0.010, 0.012, 1); ramp.color_ramp.elements[1].color = (0.09, 0.08, 0.075, 1)
    _link(nt, tc.outputs['Object'], nz.inputs['Vector']); _link(nt, nz.outputs['Fac'], ramp.inputs['Fac']); _link(nt, ramp.outputs['Color'], pr.inputs['Base Color'])
    pr.inputs['Roughness'].default_value = 0.92
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 0.17
    _link(nt, tc.outputs['Object'], vo.inputs['Vector'])
    ve = nt.nodes.new('ShaderNodeValToRGB'); ve.color_ramp.elements[0].position = 0.0; ve.color_ramp.elements[0].color = (1, 1, 1, 1)
    ve.color_ramp.elements[1].position = 0.09; ve.color_ramp.elements[1].color = (0, 0, 0, 1)
    _link(nt, vo.outputs['Distance'], ve.inputs['Fac'])
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; _link(nt, tc.outputs['Object'], ln.inputs[0])
    fo = nt.nodes.new('ShaderNodeMapRange'); fo.inputs['From Min'].default_value = R * 0.2; fo.inputs['From Max'].default_value = R * 1.1
    fo.inputs['To Min'].default_value = 1.0; fo.inputs['To Max'].default_value = 0.0; fo.clamp = True; _link(nt, ln.outputs['Value'], fo.inputs['Value'])
    gm = _mix(nt, 'MULTIPLY', ve.outputs['Color'], fo.outputs['Result'])
    ec = nt.nodes.new('ShaderNodeMix'); ec.data_type = 'RGBA'; ec.inputs['B'].default_value = glow; ec.inputs['A'].default_value = (0, 0, 0, 1)
    _link(nt, gm.outputs[0], ec.inputs['Factor']); _link(nt, ec.outputs['Result'], pr.inputs['Emission Color']); pr.inputs['Emission Strength'].default_value = glow_strength
    _link(nt, tr.outputs[0], mix.inputs[1]); _link(nt, pr.outputs[0], mix.inputs[2]); _link(nt, mix.outputs[0], out.inputs[0]); mix.inputs[0].default_value = 0.0
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    me.materials.append(m); ob['mix'] = mix.name
    return ob

def motes(col, tag, ctr, n, f0, spread, rise, color, seed, life=(50, 90)):
    """brasas de luz subindo devagar, balancando e apagando"""
    r = random.Random(seed)
    for k in range(n):
        ob = fx_obj(f'{tag}{k}', mesh_sphere(1), col, color, 8.0)
        a = r.uniform(0, math.tau); rr = r.uniform(0.15, 1.0) * spread; p0 = ctr + V((math.cos(a) * rr, math.sin(a) * rr, r.uniform(0, 6)))
        s = r.uniform(0.35, 0.95); L = r.randint(*life); t0 = f0 + r.randint(0, 14); sw = r.uniform(4, 11); ph = r.uniform(0, 6)
        fx_key(ob, t0 - 1, loc=p0, scale=0, alpha=0)
        for j in range(1, 5):
            u = j / 4.0; p = p0 + V((math.sin(u * 5 + ph) * sw, math.cos(u * 4 + ph) * sw, rise * u * r.uniform(0.7, 1.1)))
            fx_key(ob, t0 + int(L * u), loc=p, scale=s * (1.0 - 0.7 * u) if j < 4 else 0, alpha=0.95 * (1 - u) ** 0.7 if j < 4 else 0)

def upgrade_rock_mat():
    """pedras com relevo (bump) e bordas mais claras, para todas as skills"""
    m = bpy.data.materials.get('FX_Rock')
    if not m or any(n.type == 'BUMP' for n in m.node_tree.nodes): return
    nt = m.node_tree; bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.8; nz.inputs['Detail'].default_value = 10.0
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6; bp.inputs['Distance'].default_value = 0.5
    _link(nt, tc.outputs['Object'], nz.inputs['Vector']); _link(nt, nz.outputs['Fac'], bp.inputs['Height']); _link(nt, bp.outputs['Normal'], bs.inputs['Normal'])
