"""Guerreiro: biblioteca de efeitos (materiais, geometria, trilha da espada, impactos). Unidades do L2: 1 m = U unidades. Paleta: aco quente, carmesim, brasa, ouro. So formas angulares."""
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix

U = 23.4
FPS = 48
GAIN = 0.55
AQUI = os.path.dirname(os.path.abspath(__file__))
TEXDIR = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "fx")) + os.sep
ACO = (1.0, 0.93, 0.80); CARMESIM = (0.95, 0.10, 0.05); BRASA = (1.0, 0.42, 0.06); OURO = (1.0, 0.78, 0.30); AZUL = (0.55, 0.78, 1.0)
CORES = {"b": ACO, "c": CARMESIM, "o": BRASA, "g": OURO, "a": AZUL}
M = {}

# ------------------------------------------------------------------ cena
def nova_cena(nome, fim, ini=1):
    sc = bpy.data.scenes.new(nome)
    if bpy.context.window: bpy.context.window.scene = sc
    sc.render.fps = FPS; sc.frame_start = ini; sc.frame_end = fim
    try: sc.render.engine = "BLENDER_EEVEE"
    except TypeError: pass
    sc.render.resolution_x = 960; sc.render.resolution_y = 540
    sc.world = bpy.data.worlds.new(nome + "_mundo"); sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.020, 0.018, 0.022, 1); bg.inputs[1].default_value = 1.0
    sc.view_settings.view_transform = "Standard"
    col = bpy.data.collections.new(nome + "_FX"); sc.collection.children.link(col)
    ref = bpy.data.collections.new(nome + "_REF"); sc.collection.children.link(ref)
    return sc, col, ref

# ------------------------------------------------------------------ materiais
def mat_base(nome):
    m = bpy.data.materials.new(nome); m.use_nodes = True; m.node_tree.nodes.clear()
    try: m.surface_render_method = "BLENDED"
    except Exception: pass
    m.use_backface_culling = False
    return m
def _fim(m, em, alfa_socket, N):
    nt = m.node_tree; out = N.new("ShaderNodeOutputMaterial"); mix = N.new("ShaderNodeMixShader"); tr = N.new("ShaderNodeBsdfTransparent")
    nt.links.new(alfa_socket, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
def _img(arq): return bpy.data.images.load(TEXDIR + arq, check_existing=True)
def mat_tex(nome, arq, tint, forca=2.0, quente=(1.0, 0.96, 0.85), repete=False):
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes; L = nt.links
    tc = N.new("ShaderNodeTexCoord"); im = N.new("ShaderNodeTexImage"); im.image = _img(arq); im.extension = "REPEAT" if repete else "CLIP"
    rp = N.new("ShaderNodeValToRGB"); el = rp.color_ramp.elements; el[0].position = 0.0; el[0].color = (*[c * 0.55 for c in tint], 1); el[1].position = 1.0; el[1].color = (*quente, 1); e2 = el.new(0.5); e2.color = (*tint, 1)
    em = N.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = forca * GAIN
    L.new(tc.outputs["UV"], im.inputs["Vector"]); L.new(im.outputs["Alpha"], rp.inputs[0]); L.new(rp.outputs[0], em.inputs["Color"]); _fim(m, em, im.outputs["Alpha"], N); return m
def mat_grad(nome, stops, forca=3.0, alfa=1.0, cauda=0.0):
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); ramp = N.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    while len(el) < len(stops): el.new(0.5)
    for e, (p, c) in zip(el, stops): e.position = p; e.color = (*c, 1)
    nt.links.new(tc.outputs["UV"], sep.inputs[0]); nt.links.new(sep.outputs[1], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca * GAIN
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = max(cauda, 0.01)
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = alfa
    nt.links.new(sep.outputs[1], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    if cauda > 0: nt.links.new(pw.outputs[0], mul.inputs[0])
    else: mul.inputs[0].default_value = 1.0
    _fim(m, em, mul.outputs[0], N); return m
def mat_emit(nome, cor, forca=6.0):
    m = mat_base(nome); N = m.node_tree.nodes; em = N.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*cor, 1); em.inputs["Strength"].default_value = forca * GAIN
    out = N.new("ShaderNodeOutputMaterial"); m.node_tree.links.new(em.outputs[0], out.inputs[0]); return m
def mat_pedra(nome, cor=(0.07, 0.06, 0.06)):
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*cor, 1); b.inputs["Roughness"].default_value = 0.85
    b.inputs["Emission Color"].default_value = (1.0, 0.25, 0.04, 1); b.inputs["Emission Strength"].default_value = 0.08; return m
def mat_ref(nome, cor):
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*cor, 1); b.inputs["Roughness"].default_value = 0.8; return m
def mat_feixe(nome, base, topo, forca=2.4, rep_u=3.0, rep_v=1.2, vel=0.7, alfa=0.9, fade=0.55, arq="clerigo_raios.png", f0=1, f1=400):
    """coluna de luz/fogo: veios verticais que sobem; base clara -> topo colorido; some no alto"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes; L = nt.links
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.name = "mapa"; mp.inputs[3].default_value = (rep_u, rep_v, 1.0)
    im = N.new("ShaderNodeTexImage"); im.image = _img(arq); im.extension = "REPEAT"
    sep = N.new("ShaderNodeSeparateXYZ"); gr = N.new("ShaderNodeValToRGB"); gr.color_ramp.elements[0].color = (*base, 1); gr.color_ramp.elements[1].color = (*topo, 1)
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = fade
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY_ADD"; mx.inputs[1].default_value = 0.85; mx.inputs[2].default_value = 0.15
    a1 = N.new("ShaderNodeMath"); a1.operation = "MULTIPLY"; a2 = N.new("ShaderNodeMath"); a2.operation = "MULTIPLY"; a2.inputs[1].default_value = alfa
    em = N.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = forca * GAIN
    L.new(tc.outputs["UV"], mp.inputs[0]); L.new(mp.outputs[0], im.inputs["Vector"]); L.new(tc.outputs["UV"], sep.inputs[0]); L.new(sep.outputs[1], gr.inputs[0]); L.new(gr.outputs[0], em.inputs["Color"])
    L.new(sep.outputs[1], inv.inputs[1]); L.new(inv.outputs[0], pw.inputs[0]); L.new(im.outputs["Alpha"], mx.inputs[0]); L.new(mx.outputs[0], a1.inputs[0]); L.new(pw.outputs[0], a1.inputs[1]); L.new(a1.outputs[0], a2.inputs[0]); _fim(m, em, a2.outputs[0], N)
    if vel:
        for fr, v in ((f0, 0.0), (f1, -vel * (f1 - f0) / 48.0)):
            mp.inputs[1].default_value = (0, v, 0); nt.keyframe_insert('nodes["mapa"].inputs[1].default_value', frame=fr)
    return m
def mat_trilha(nome, f_ini, f_fim, cauda=0.32, forca=3.2):
    """faixa de corte da espada: so aparece a janela [cabeca-cauda, cabeca] ao longo do caminho (u), que corre de f_ini a f_fim; borda da ponta branca -> brasa -> carmesim -> some junto ao cabo"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes; L = nt.links
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["UV"], sep.inputs[0])
    head = N.new("ShaderNodeValue"); head.name = "cabeca"; head.outputs[0].default_value = 0.0
    head.outputs[0].default_value = -cauda; nt.keyframe_insert('nodes["cabeca"].outputs[0].default_value', frame=max(0, f_ini - 1))
    head.outputs[0].default_value = 1.0; nt.keyframe_insert('nodes["cabeca"].outputs[0].default_value', frame=f_fim)
    head.outputs[0].default_value = 1.0 + cauda * 1.05; nt.keyframe_insert('nodes["cabeca"].outputs[0].default_value', frame=f_fim + 9)
    sub = N.new("ShaderNodeMath"); sub.operation = "SUBTRACT"; L.new(head.outputs[0], sub.inputs[0]); L.new(sep.outputs[0], sub.inputs[1])        # cabeca - u  (>=0 atras da cabeca)
    dv = N.new("ShaderNodeMath"); dv.operation = "DIVIDE"; dv.inputs[1].default_value = cauda; L.new(sub.outputs[0], dv.inputs[0])
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L.new(dv.outputs[0], inv.inputs[1]); cl = N.new("ShaderNodeMath"); cl.operation = "MAXIMUM"; cl.inputs[1].default_value = 0.0
    mn = N.new("ShaderNodeMath"); mn.operation = "MINIMUM"; mn.inputs[1].default_value = 1.0; L.new(inv.outputs[0], cl.inputs[0]); L.new(cl.outputs[0], mn.inputs[0])
    atras = mn.outputs[0]                                                                                      # 1 na cabeca, 0 no fim da cauda
    ja = N.new("ShaderNodeMath"); ja.operation = "GREATER_THAN"; ja.inputs[1].default_value = 0.0; L.new(sub.outputs[0], ja.inputs[0])             # so depois que a cabeca passou
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 1.4; L.new(atras, pw.inputs[0])
    tj = N.new("ShaderNodeMath"); tj.operation = "MULTIPLY"; L.new(pw.outputs[0], tj.inputs[0]); L.new(ja.outputs[0], tj.inputs[1])
    vp = N.new("ShaderNodeMath"); vp.operation = "POWER"; vp.inputs[1].default_value = 0.8; L.new(sep.outputs[1], vp.inputs[0])
    al = N.new("ShaderNodeMath"); al.operation = "MULTIPLY"; L.new(tj.outputs[0], al.inputs[0]); L.new(vp.outputs[0], al.inputs[1])
    rp = N.new("ShaderNodeValToRGB"); el = rp.color_ramp.elements; el[0].position = 0.25; el[0].color = (*CARMESIM, 1); el[1].position = 1.0; el[1].color = (*ACO, 1); e2 = el.new(0.78); e2.color = (*BRASA, 1)
    L.new(sep.outputs[1], rp.inputs[0]); em = N.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = forca * GAIN; L.new(rp.outputs[0], em.inputs["Color"]); _fim(m, em, al.outputs[0], N); return m

def init_materiais():
    for c, t in CORES.items():
        M["est_" + c] = mat_tex("GW_est_" + c, "clerigo_estrela.png", t, 3.4)
        M["fenda_" + c] = mat_tex("GW_fenda_" + c, "guerreiro_fenda.png", t, 3.4, repete=False)
        M["onda_" + c] = mat_tex("GW_onda_" + c, "clerigo_onda.png", t, 3.4)
        M["leque_" + c] = mat_tex("GW_leque_" + c, "clerigo_leque.png", t, 2.8)
        M["bh_" + c] = mat_tex("GW_bh_" + c, "clerigo_hex_brilho.png", t, 2.0)
        M["esp_" + c] = mat_grad("GW_esp_" + c, [(0.0, (1.0, 1.0, 0.95)), (0.45, t), (1.0, tuple(x * 0.5 for x in t))], 3.4, 1.0, 0.9)
        M["em_" + c] = mat_emit("GW_em_" + c, t, 5.0)
    M["pedra"] = mat_pedra("GW_pedra"); M["pedra2"] = mat_pedra("GW_pedra2", (0.12, 0.10, 0.09))
    M["coluna_o"] = mat_feixe("GW_coluna_o", (1.0, 0.92, 0.7), (1.0, 0.30, 0.04), 2.6, 3.0, 1.3, 1.0, 0.95)
    M["coluna_c"] = mat_feixe("GW_coluna_c", (1.0, 0.75, 0.5), (0.85, 0.06, 0.03), 2.6, 3.0, 1.3, 1.1, 0.95)
    M["veios"] = mat_feixe("GW_veios", (1.0, 0.95, 0.85), (0.95, 0.15, 0.05), 3.4, 1.0, 1.0, 1.4, 0.95, 0.35, "guerreiro_veios.png")
    M["ref_chao"] = mat_ref("GW_chao", (0.05, 0.05, 0.055)); M["ref_inimigo"] = mat_ref("GW_inimigo", (0.35, 0.30, 0.28)); M["ref_aliado"] = mat_ref("GW_aliado", (0.20, 0.36, 0.60))

# ------------------------------------------------------------------ geometria
def para_obj(col, nome, bm, mat=None, flat=True):
    me = bpy.data.meshes.new("GW_" + nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = not flat
    if mat: me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me); col.objects.link(ob); return ob
def uv_z(bm, zmin, zmax):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert.co; lp[uvl].uv = ((math.atan2(v.y, v.x) / (2 * math.pi)) % 1.0, (v.z - zmin) / max(zmax - zmin, 1e-6))
def bm_cone(r1, r2, prof, lados=4):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r1, radius2=r2, depth=prof)
    bmesh.ops.translate(bm, vec=(0, 0, prof / 2), verts=bm.verts); uv_z(bm, 0, prof); return bm
def bm_feixe(r1, r2, H, pontas=6):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); n = pontas * 2; aneis = []
    for z, r in ((0.0, r1), (H, r2)):
        aneis.append([bm.verts.new((r * (1.0 if i % 2 == 0 else 0.70) * math.cos(2 * math.pi * i / n), r * (1.0 if i % 2 == 0 else 0.70) * math.sin(2 * math.pi * i / n), z)) for i in range(n)])
    for i in range(n):
        j = (i + 1) % n; f = bm.faces.new((aneis[0][i], aneis[0][j], aneis[1][j], aneis[1][i]))
        for lp in f.loops:
            k = i if lp.vert in (aneis[0][i], aneis[1][i]) else i + 1; lp[uvl].uv = (k / n, lp.vert.co.z / H)
    return bm
def bm_lascas(r, lados=3):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r * 0.5, radius2=0.0, depth=r * 1.6)
    for v in bm.verts: v.co += Vector((random.uniform(-.04, .04), random.uniform(-.04, .04), random.uniform(-.04, .04))) * r * 4
    return bm
def bm_laje(w, d, h):
    """pedaco de pedra do chao: prisma irregular (angular)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=(w, d, h), verts=bm.verts)
    for v in bm.verts: v.co += Vector((random.uniform(-.18, .18) * w, random.uniform(-.18, .18) * d, random.uniform(-.1, .1) * h))
    return bm
def bm_lamina_energia(L, w, esp, pontas=True):
    """lamina gigante facetada: seccao em losango, lados retos, ponta afilada; eixo +Z (base em z=0), largura em X; uv y = comprimento"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); n = 7; aneis = []
    for k in range(n + 1):
        t = k / n; z = t * L; ww = w * (1.0 - 0.0 * t) if t < 0.82 else w * (1.0 - (t - 0.82) / 0.18); ww = max(ww, 0.001)
        aneis.append([bm.verts.new((ww / 2, 0, z)), bm.verts.new((0, esp * (1 - t * 0.4), z)), bm.verts.new((-ww / 2, 0, z)), bm.verts.new((0, -esp * (1 - t * 0.4), z))])
    for k in range(n):
        A, B = aneis[k], aneis[k + 1]
        for i in range(4):
            j = (i + 1) % 4; f = bm.faces.new((A[i], A[j], B[j], B[i]))
            for lp in f.loops: lp[uvl].uv = (0.5 + 0.5 * (lp.vert.co.x / max(w / 2, 1e-6)), lp.vert.co.z / L)
    return bm
def bm_cruz_chao(n=3):
    pass

# ------------------------------------------------------------------ objetos auxiliares
def sprite(col, nome, mat, tam, loc=(0, 0, 0), vertical=False, alto=None):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); w = tam; h = alto or tam
    pts = [(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, 0, h), (-w / 2, 0, h)] if vertical else [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): lp[uvl].uv = uv
    o = para_obj(col, nome, bm, mat); o.location = loc
    k = o.constraints.new("LOCKED_TRACK" if vertical else "TRACK_TO"); k.name = "GW_BB"
    if vertical: k.track_axis = "TRACK_Y"; k.lock_axis = "LOCK_Z"
    else: k.track_axis = "TRACK_Z"; k.up_axis = "UP_Y"
    return o
def retarget(sc):
    for o in sc.objects:
        for k in o.constraints:
            if k.name == "GW_BB": k.target = sc.camera
def plano_chao(col, nome, lado, mat, z=0.5):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); h = lado / 2; f = bm.faces.new([bm.verts.new(p) for p in ((-h, -h, 0), (h, -h, 0), (h, h, 0), (-h, h, 0))])
    for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): lp[uvl].uv = uv
    o = para_obj(col, nome, bm, mat); o.location = (0, 0, z); return o
def esc(o, pts):
    for f, s in pts:
        o.scale = (max(s, 1e-4),) * 3 if not isinstance(s, tuple) else tuple(max(x, 1e-4) for x in s); o.keyframe_insert("scale", frame=f)
def anim(o, prop, f0, f1, fn, passo=2):
    for f in list(range(f0, f1, passo)) + [f1]:
        setattr(o, prop, fn((f - f0) / max(1, (f1 - f0)))); o.keyframe_insert(prop, frame=f)
def apunta(o, d, eixo="Z", cima="Y"):
    o.rotation_euler = Vector(d).normalized().to_track_quat(eixo, cima).to_euler()
def luz(col, nome, tipo, loc, energia, cor=(1, 1, 1)):
    ld = bpy.data.lights.new(nome, tipo); ld.energy = energia; ld.color = cor
    o = bpy.data.objects.new(nome, ld); o.location = loc; col.objects.link(o); return o
def pisca(l, pts):
    for f, e in pts: l.data.energy = e * U * U * 0.35; l.data.keyframe_insert("energy", frame=f)
def camera(sc, col, nome, loc, alvo, lente=32):
    nome = sc.name.split("_", 1)[1] + "_" + nome
    c = bpy.data.objects.new(nome, bpy.data.cameras.new(nome)); c.data.lens = lente; c.data.clip_end = 20000; c.location = loc; col.objects.link(c)
    t = bpy.data.objects.new(nome + "_alvo", None); t.location = alvo; col.objects.link(t)
    k = c.constraints.new("TRACK_TO"); k.target = t; k.track_axis = "TRACK_NEGATIVE_Z"; k.up_axis = "UP_Y"; return c
def caixa(ref, nome, loc, dim, mat):
    b = bmesh.new(); bmesh.ops.create_cube(b, size=1.0); bmesh.ops.scale(b, vec=dim, verts=b.verts); o = para_obj(ref, nome, b, mat); o.location = loc; return o

# ------------------------------------------------------------------ efeitos
def _cr(p0, p1, p2, p3, t):
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
def trilha(col, nome, dados, f0, f1, cauda=0.30, forca=4.6, passo=1, sub=3):
    """faixa de corte seguindo a espada: dados = {quadro: (ponta, ponto a 64% da lamina)} no mundo; curva suavizada entre os quadros"""
    quadros = [f for f in range(f0, f1 + 1, passo)]; n = len(quadros)
    def pts(idx):
        L = [Vector(dados[f][idx]) for f in quadros]; out = []
        for k in range(n - 1):
            a, b, c, d = L[max(k - 1, 0)], L[k], L[k + 1], L[min(k + 2, n - 1)]
            for t in range(sub): out.append(_cr(a, b, c, d, t / sub))
        out.append(L[-1]); return out
    A = pts(1); B = pts(0); m = len(A); bm = bmesh.new(); uvl = bm.loops.layers.uv.verify()
    pares = [(bm.verts.new(A[k]), bm.verts.new(B[k])) for k in range(m)]
    for k in range(m - 1):
        fc = bm.faces.new((pares[k][0], pares[k + 1][0], pares[k + 1][1], pares[k][1]))
        for lp in fc.loops:
            idx = k if lp.vert in (pares[k][0], pares[k][1]) else k + 1; lp[uvl].uv = (idx / (m - 1), 1.0 if lp.vert == pares[idx][1] else 0.0)
    return para_obj(col, nome, bm, mat_trilha("GW_trilha_" + nome, f0, f1, cauda, forca))
def espinhos(col, nome, pos, f, n, L, cor, r=0.04, dur=14, cone=1.0):
    """espinhos finos de luz em leque no impacto (L em metros)"""
    for i in range(n):
        v = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-.1, 1.0 * cone))).normalized(); Ls = random.uniform(.5, 1.0) * L * U
        o = para_obj(col, "%s%d" % (nome, i), bm_cone(r * U * 0.6, 0.0, Ls, 4), M["esp_" + cor]); o.location = tuple(pos); apunta(o, v)
        esc(o, [(f - 1, 0.0), (f, 0.3), (f + 2, 1.0), (f + dur * 0.5, 0.55), (f + dur, 0.0)])
def clarao(col, nome, pos, f, tam, cor="b", dur=16):
    sp = sprite(col, nome, M["est_" + cor], tam * U, tuple(pos)); esc(sp, [(f - 1, 0.0), (f, 0.6), (f + 2, 1.0), (f + dur * 0.6, 0.3), (f + dur, 0.0)]); return sp
def onda(col, nome, centro, f, R, cor="o", dur=18, z=0.6):
    o = plano_chao(col, nome, R * 2.1 * U, M["onda_" + cor], z); o.location = (centro[0], centro[1], z)
    esc(o, [(f - 1, (1e-3,) * 3), (f, (0.2, 0.2, 1)), (f + dur, (1, 1, 1)), (f + dur + 1, (1e-3,) * 3)]); return o
def fenda(col, nome, centro, f, R, cor="o", dur_vida=60, giro=0.0):
    """rachaduras radiais no chao que se abrem do centro e depois esmaecem"""
    o = plano_chao(col, nome, R * 2 * U, M["fenda_" + cor], 0.45); o.location = (centro[0], centro[1], 0.45); o.rotation_euler = (0, 0, giro)
    esc(o, [(f - 1, (1e-3,) * 3), (f, (0.15, 0.15, 1)), (f + 5, (0.85, 0.85, 1)), (f + 10, (1, 1, 1)), (f + dur_vida, (1.0, 1.0, 1)), (f + dur_vida + 14, (1e-3,) * 3)]); return o
def brilho_chao(col, nome, centro, f, R, cor="o", dur=40):
    o = plano_chao(col, nome, R * 2 * U, M["bh_" + cor], 0.3); o.location = (centro[0], centro[1], 0.3)
    esc(o, [(f - 1, (1e-3,) * 3), (f + 1, (0.3, 0.3, 1)), (f + 6, (1, 1, 1)), (f + dur, (0.8, 0.8, 1)), (f + dur + 12, (1e-3,) * 3)]); return o
def lascas(col, nome, pos, f, n, tam=0.18, vel=4.0, mat="pedra", dur=(30, 44), g=9.8):
    """lascas de pedra com fisica: lancamento, gravidade, quique no chao (restituicao 0,35, atrito 0,6) e rolagem ate parar"""
    for k in range(n):
        a = k * 2 * math.pi / n + random.uniform(-.3, .3); v = random.uniform(.5, 1.0) * vel * U; vz = random.uniform(2.0, 5.5) * U; vida = random.randint(*dur) + 20; w = [random.uniform(-8, 8) for _ in range(3)]
        o = para_obj(col, "%s%d" % (nome, k), bm_lasca_pedra(tam * U), M[mat if k % 3 else "pedra2"])
        p = Vector((pos[0], pos[1], max(0.5, pos[2]))); vv = Vector((math.cos(a) * v, math.sin(a) * v, vz)); piso = tam * U * 0.6; dt = 1.0 / FPS
        for ff in range(f, f + vida + 1):
            for _ in range(1):
                vv.z -= g * U * dt; p += vv * dt
                if p.z < piso:
                    p.z = piso
                    if abs(vv.z) > 0.6 * U: vv.z = -vv.z * 0.35; vv.x *= 0.6; vv.y *= 0.6
                    else: vv.z = 0.0; vv.x *= 0.85; vv.y *= 0.85
            o.location = tuple(p); sp = vv.length / max(U, 1); o.rotation_euler = (w[0] * (ff - f) * dt * min(1, sp), w[1] * (ff - f) * dt * min(1, sp), w[2] * (ff - f) * dt * min(1, sp))
            o.scale = ((1,) * 3 if ff < f + vida else (1e-4,) * 3)
            if (ff - f) % 2 == 0 or ff == f + vida: o.keyframe_insert("location", frame=ff); o.keyframe_insert("rotation_euler", frame=ff); o.keyframe_insert("scale", frame=ff)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f - 1)
def bm_lasca_pedra(r):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * random.uniform(.6, 1.3), v.co.y * random.uniform(.5, 1.2), v.co.z * random.uniform(.5, 1.0)))
    return bm
def brasas(col, nome, pos, f, n, alt=2.5, vel=2.0, dur=(36, 70), cor="o", tam=0.18):
    for i in range(n):
        d = random.uniform(0, 6.28); vh = random.uniform(.2, 1.0) * vel * U; vz = random.uniform(.7, 1.0) * alt * U * 1.4; vida = random.randint(*dur)
        o = sprite(col, "%s%d" % (nome, i), M["est_" + cor], tam * U * random.uniform(.5, 1.0), (0, 0, 0))
        for ff in list(range(f, f + vida, 3)) + [f + vida]:
            s = (ff - f) / FPS; o.location = (pos[0] + math.cos(d) * vh * s + .12 * U * math.sin(s * 6 + d), pos[1] + math.sin(d) * vh * s, pos[2] + vz * s - 0.6 * U * s * s)
            o.scale = (max(1.0 - (ff - f) / vida, 1e-4) * (0.7 + 0.3 * math.sin(s * 20 + d)),) * 3; o.keyframe_insert("location", frame=ff); o.keyframe_insert("scale", frame=ff)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f - 1)
def coluna(col, nome, pos, f, H, R, mat, dur=44, giro=160):
    o = para_obj(col, nome, bm_feixe(R * U, R * U * 0.8, H * U, 6), M[mat]); o.location = tuple(pos)
    esc(o, [(f - 1, (1, 1, 1e-3)), (f + 3, (1.15, 1.15, 0.6)), (f + 8, (1, 1, 1.0)), (f + dur, (1, 1, 1.0)), (f + dur + 14, (0.35, 0.35, 0.9)), (f + dur + 15, (1e-3,) * 3)])
    anim(o, "rotation_euler", f, f + dur + 15, lambda t: (0, 0, t * math.radians(giro)), 6); return o
