"""Mago - skill 2 (PREVIA): METEORO DE MAGMA (fogo, Archmage) e LANCA DE GELO (agua, Spellsinger). So formas angulares, sem rastro.
Rodar ao vivo no Blender pelo MCP:  exec(compile(open(r"<este arquivo>", encoding="utf8").read(), "s2", "exec"))
Cria (ou refaz) as cenas MAGO_S2_FOGO e MAGO_S2_AGUA no .blend aberto. 48 fps.
Fogo: aviso 1-48, queda 20-48, impacto no quadro 48 (some ate 96). Agua: 3 lancas nascem 1-20, saem em 24/32/40, impactos em 64/72/80.
Paleta fogo: nucleo branco-amarelo, laranja, vermelho escuro, basalto preto. Agua: azul profundo, branco-ciano. Sem rosa/lilas."""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

RAIZ = "C:/TECX SOFTHOUSE/IS ONLINE/"
TEX1 = RAIZ + "trabalho_l2fx/export_bruto/FX_E_T/Texture/"
TEX2 = RAIZ + "trabalho_l2fx/export_bruto/LineageEffectsTextures/Texture/"
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
FPS = 48

# ------------------------------------------------------------------ limpeza de execucoes anteriores
for nome in ("MAGO_S2_FOGO", "MAGO_S2_AGUA", "MAGO_S2_NECRO", "TESTE_L2"):
    s = bpy.data.scenes.get(nome)
    if s:
        for o in list(s.objects): bpy.data.objects.remove(o, do_unlink=True)
        for c in list(bpy.data.collections):
            if c.name.startswith(nome): bpy.data.collections.remove(c)
        if bpy.context.window.scene is s: bpy.context.window.scene = next(x for x in bpy.data.scenes if x is not s)
        bpy.data.scenes.remove(s)
for m in list(bpy.data.materials):
    if m.name.startswith(("S2F_", "S2A_", "S2N_")): bpy.data.materials.remove(m)
for me in list(bpy.data.meshes):
    if me.users == 0: bpy.data.meshes.remove(me)

def nova_cena(nome, fim):
    sc = bpy.data.scenes.new(nome); bpy.context.window.scene = sc
    sc.render.fps = FPS; sc.frame_start = 1; sc.frame_end = fim
    try: sc.render.engine = "BLENDER_EEVEE"
    except TypeError: pass
    sc.render.resolution_x = 960; sc.render.resolution_y = 540
    sc.world = bpy.data.worlds.new(nome + "_mundo"); sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.012, 0.016, 0.026, 1); bg.inputs[1].default_value = 1.0
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
def _fim_emissivo(m, em, alfa_socket, N):
    nt = m.node_tree; out = N.new("ShaderNodeOutputMaterial"); mix = N.new("ShaderNodeMixShader"); tr = N.new("ShaderNodeBsdfTransparent")
    nt.links.new(alfa_socket, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
def mat_flama(nome, tex, tint=(1, 1, 1), forca=3.0, cauda=0.5):
    """chama com a textura do L2: uv x = largura, uv y = ao longo (0 base .. 1 ponta); alfa = brilho da textura, some na ponta"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); im = N.new("ShaderNodeTexImage"); bw = N.new("ShaderNodeRGBToBW")
    mm = N.new("ShaderNodeMix"); mm.data_type = "RGBA"; mm.blend_type = "MULTIPLY"; mm.inputs[0].default_value = 1.0; mm.inputs[7].default_value = (*tint, 1)
    im.image = bpy.data.images.load(tex, check_existing=True); im.extension = "CLIP"
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ")
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = cauda
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    nt.links.new(tc.outputs["UV"], im.inputs["Vector"]); nt.links.new(tc.outputs["UV"], sep.inputs[0])
    nt.links.new(im.outputs["Color"], mm.inputs[6]); nt.links.new(mm.outputs[2], em.inputs["Color"]); em.inputs["Strength"].default_value = forca
    nt.links.new(im.outputs["Color"], bw.inputs[0]); nt.links.new(sep.outputs[1], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    nt.links.new(bw.outputs[0], mul.inputs[0]); nt.links.new(pw.outputs[0], mul.inputs[1])
    _fim_emissivo(m, em, mul.outputs[0], N); return m
def mat_grad(nome, stops, forca=3.0, alfa=1.0, cauda=0.0, ruido=0.0):
    """gradiente emissivo ao longo de uv y (0 base .. 1 ponta); stops = [(pos, (r,g,b))]"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); ramp = N.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    while len(el) < len(stops): el.new(0.5)
    for e, (p, c) in zip(el, stops): e.position = p; e.color = (*c, 1)
    nt.links.new(tc.outputs["UV"], sep.inputs[0]); nt.links.new(sep.outputs[1], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = max(cauda, 0.01)
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = alfa
    nt.links.new(sep.outputs[1], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    nt.links.new((pw.outputs[0] if cauda > 0 else inv.outputs[0]), mul.inputs[0]) if cauda > 0 else None
    if cauda <= 0: mul.inputs[0].default_value = 1.0
    if ruido > 0:
        nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = ruido; nz.inputs["Detail"].default_value = 3
        m2 = N.new("ShaderNodeMath"); m2.operation = "MULTIPLY"; m2.inputs[1].default_value = 1.4
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], m2.inputs[0])
        m3 = N.new("ShaderNodeMath"); m3.operation = "MULTIPLY"; nt.links.new(mul.outputs[0], m3.inputs[0]); nt.links.new(m2.outputs[0], m3.inputs[1]); mul = m3
    _fim_emissivo(m, em, mul.outputs[0], N); return m
def mat_emit(nome, cor, forca=6.0):
    m = mat_base(nome); N = m.node_tree.nodes; em = N.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*cor, 1); em.inputs["Strength"].default_value = forca
    out = N.new("ShaderNodeOutputMaterial"); m.node_tree.links.new(em.outputs[0], out.inputs[0]); return m
def mat_magma(nome):
    """basalto escuro com rachaduras de lava (voronoi por distancia a borda)"""
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]; N = nt.nodes
    b.inputs["Base Color"].default_value = (0.11, 0.075, 0.065, 1); b.inputs["Roughness"].default_value = 0.8
    tc = N.new("ShaderNodeTexCoord"); vr = N.new("ShaderNodeTexVoronoi"); vr.feature = "DISTANCE_TO_EDGE"; vr.inputs["Scale"].default_value = 2.3
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[1].position = 0.22
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1); ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
    cr = N.new("ShaderNodeValToRGB"); e = cr.color_ramp.elements; e[0].position = 0.0; e[0].color = (0.16, 0.025, 0.0, 1); e[1].position = 1.0; e[1].color = (1, 0.55, 0.10, 1)
    e2 = e.new(0.55); e2.color = (0.95, 0.20, 0.02, 1)
    nt.links.new(tc.outputs["Object"], vr.inputs["Vector"]); nt.links.new(vr.outputs["Distance"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], cr.inputs[0])
    nt.links.new(cr.outputs[0], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = 5.0
    return m
def mat_gelo(nome, centro, borda, forca=2.2, alfa_c=0.55):
    """gelo/agua: centro azul translucido, borda (fresnel) branco-ciano; as faces retas dao os brilhos"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.42
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.30; ramp.color_ramp.elements[1].position = 0.95
    ramp.color_ramp.elements[0].color = (*centro, 1); ramp.color_ramp.elements[1].color = (*borda, 1)
    nt.links.new(lw.outputs["Facing"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca
    al = N.new("ShaderNodeMapRange"); al.inputs[3].default_value = 1.0; al.inputs[4].default_value = alfa_c
    nt.links.new(lw.outputs["Facing"], al.inputs[0])
    _fim_emissivo(m, em, al.outputs[0], N); return m

# ------------------------------------------------------------------ geometria
def para_obj(col, nome, bm, mat=None, flat=True):
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = not flat
    if mat: me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me); col.objects.link(ob); return ob
def uv_z(bm, zmin, zmax):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert.co; lp[uvl].uv = ((math.atan2(v.y, v.x) / (2 * math.pi)) % 1.0, (v.z - zmin) / max(zmax - zmin, 1e-6))
def bm_rocha(r, estica=1.0, jag=0.32):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    for v in bm.verts:
        k = 1 + random.uniform(-jag, jag * 0.8); v.co = Vector((v.co.x * k, v.co.y * k, v.co.z * k * estica))
    return bm
def bm_cone(r1, r2, prof, lados=4, base_em_zero=True):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r1, radius2=r2, depth=prof)
    bmesh.ops.translate(bm, vec=(0, 0, prof / 2), verts=bm.verts); uv_z(bm, 0, prof); return bm
def bm_lamina(L, w, wob=0.0, fase=0.0, segs=5):
    """lamina de chama: faixa plana (plano XZ), comprimento em +Z, afinando em ponta; uv x = largura, y = ao longo"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); linhas = []
    for k in range(segs + 1):
        t = k / segs; meio = w * 0.5 * (1 - t) ** 0.75 * (0.55 + 0.45 * math.sin(min(1.0, t * 1.5) * math.pi / 2)); cx = wob * math.sin(t * 3.0 + fase) * t
        if k == segs: linhas.append([bm.verts.new((cx, 0, t * L))])
        else: linhas.append([bm.verts.new((cx - meio, 0, t * L)), bm.verts.new((cx + meio, 0, t * L))])
    for k in range(segs):
        a, b = linhas[k], linhas[k + 1]
        f = bm.faces.new((a[0], a[1], b[1], b[0]) if len(b) == 2 else (a[0], a[1], b[0]))
        for lp in f.loops:
            t = lp.vert.co.z / L; x = lp.vert.co.x; lp[uvl].uv = (0.5 + (0.0 if len(b) == 1 and t > 0.99 else x / max(w, 1e-6)), t)
    return bm
def bm_cristal(L, r, lados=6):
    """lanca de gelo: eixo +Y; cauda curta e pontuda, corpo facetado, ponta longa"""
    bm = bmesh.new()
    perfil = [(0.0, 0.0), (0.10, 0.55), (0.32, 1.0), (0.70, 0.82)]
    aneis = []
    for z, k in perfil:
        if k == 0: aneis.append([bm.verts.new((0, 0, 0))]); continue
        aneis.append([bm.verts.new((r * k * math.cos(2 * math.pi * i / lados + (0.3 if z > 0.2 else 0)), r * k * math.sin(2 * math.pi * i / lados + (0.3 if z > 0.2 else 0)), z * L)) for i in range(lados)])
    ponta = bm.verts.new((0, 0, L))
    for a in range(len(aneis) - 1):
        A, B = aneis[a], aneis[a + 1]
        for i in range(lados):
            j = (i + 1) % lados
            if len(A) == 1: bm.faces.new((A[0], B[j], B[i]))
            else: bm.faces.new((A[i], A[j], B[j], B[i]))
    U = aneis[-1]
    for i in range(lados): bm.faces.new((U[i], U[(i + 1) % lados], ponta))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, "X"), verts=bm.verts)      # z -> +y
    return bm
def bm_lascas(r, lados=3):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r * 0.5, radius2=0.0, depth=r * 1.6)
    for v in bm.verts: v.co += Vector((random.uniform(-.04, .04), random.uniform(-.04, .04), random.uniform(-.04, .04))) * r * 4
    return bm
def bm_estrela_chao(R, pontas=11):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); c = bm.verts.new((0, 0, 0)); ps = []
    for i in range(pontas * 2):
        a = i * math.pi / pontas + random.uniform(-.06, .06); r = R * (random.uniform(.85, 1.1) if i % 2 == 0 else random.uniform(.38, .55))
        ps.append(bm.verts.new((r * math.cos(a), r * math.sin(a), 0)))
    for i in range(len(ps)):
        f = bm.faces.new((c, ps[i], ps[(i + 1) % len(ps)]))
        for lp in f.loops: lp[uvl].uv = (0.5, 1 - min(1.0, lp.vert.co.length / R))
    return bm
def bm_linhas(segs, larg):
    """segmentos retos no chao (aviso): lista de (p0, p1)"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify()
    for (a, b) in segs:
        d = (Vector(b) - Vector(a)); n = Vector((-d.y, d.x, 0)).normalized() * larg * 0.5
        vs = [bm.verts.new(Vector(a) + n), bm.verts.new(Vector(b) + n), bm.verts.new(Vector(b) - n), bm.verts.new(Vector(a) - n)]
        f = bm.faces.new(vs)
        for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): lp[uvl].uv = uv
    return bm

# ------------------------------------------------------------------ animacao
def anim(o, prop, f0, f1, fn, passo=2):
    """amostra fn(t) (t 0..1) entre f0 e f1 e grava chaves (interpolacao linear)"""
    quadros = list(range(f0, f1, passo)) + [f1]
    for f in quadros:
        setattr(o, prop, fn((f - f0) / max(1, (f1 - f0)))); o.keyframe_insert(prop, frame=f)
def esc(o, pts):
    """escala uniforme por (quadro, valor)"""
    for f, s in pts:
        o.scale = (max(s, 1e-4),) * 3 if not isinstance(s, tuple) else tuple(max(x, 1e-4) for x in s); o.keyframe_insert("scale", frame=f)
def apunta(o, d, eixo="Z", cima="Y"):
    o.rotation_euler = Vector(d).normalized().to_track_quat(eixo, cima).to_euler()
def luz(col, nome, tipo, loc, energia, cor=(1, 1, 1), tam=None):
    ld = bpy.data.lights.new(nome, tipo); ld.energy = energia; ld.color = cor
    if tam is not None and tipo == "AREA": ld.size = tam
    o = bpy.data.objects.new(nome, ld); o.location = loc; col.objects.link(o); return o
def camera(sc, col, nome, loc, alvo, lente=32):
    c = bpy.data.objects.new(nome, bpy.data.cameras.new(nome)); c.data.lens = lente; c.location = loc; col.objects.link(c)
    t = bpy.data.objects.new(nome + "_alvo", None); t.location = alvo; col.objects.link(t)
    k = c.constraints.new("TRACK_TO"); k.target = t; k.track_axis = "TRACK_NEGATIVE_Z"; k.up_axis = "UP_Y"; return c
def chao_e_referencia(sc, ref, col_fx, alvo_y=None):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
    mc = bpy.data.materials.new("S2F_chao" if "FOGO" in sc.name else ("S2N_chao" if "NECRO" in sc.name else "S2A_chao")); mc.use_nodes = True; b = mc.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.045, 0.05, 0.06, 1); b.inputs["Roughness"].default_value = 0.92
    para_obj(ref, "chao", bm, mc)
    def caixa(nome, loc, dim):
        b2 = bmesh.new(); bmesh.ops.create_cube(b2, size=1.0); bmesh.ops.scale(b2, vec=dim, verts=b2.verts)
        m2 = bpy.data.materials.new(("S2F_" if "FOGO" in sc.name else ("S2N_" if "NECRO" in sc.name else "S2A_")) + nome); m2.use_nodes = True
        m2.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.35, 0.37, 0.4, 1)
        o = para_obj(ref, nome, b2, m2); o.location = loc; return o
    return caixa

# ================================================================== FOGO: METEORO DE MAGMA
def montar_fogo():
    random.seed(21)
    F_AVISO0, F_QUEDA0, F_HIT, F_FIM = 1, 20, 48, 96
    sc, col, ref = nova_cena("MAGO_S2_FOGO", F_FIM)
    caixa = chao_e_referencia(sc, ref, col)
    caixa("mago_ref_1.7m", (-9.0, -6.0, 0.85), (0.5, 0.35, 1.7))                    # so para escala (nao exporta)
    T = Vector((0, 0, 0)); S = Vector((-6.0, -3.5, 15.0)); R_ROCHA = 0.95
    centro_hit = Vector((0, 0, R_ROCHA * 0.9)); dirv = (centro_hit - S).normalized()
    m_magma = mat_magma("S2F_magma")
    m_f1 = mat_flama("S2F_chama", TEX1 + "flame_a00.png", (1.0, 0.58, 0.26), 2.5, 0.45)
    m_f2 = mat_flama("S2F_chama_vermelha", TEX2 + "fx_m_t2076.png", (1.0, 0.62, 0.45), 2.4, 0.5)
    m_nucleo = mat_emit("S2F_nucleo", (1.0, 0.93, 0.62), 9.0)
    m_brasa = mat_emit("S2F_brasa", (1.0, 0.52, 0.10), 8.0)
    m_aviso = mat_grad("S2F_aviso", [(0.0, (1.0, 0.22, 0.03)), (1.0, (1.0, 0.62, 0.12))], 3.6, 0.9)
    m_chao = mat_grad("S2F_marca", [(0.0, (0.10, 0.03, 0.01)), (0.5, (0.55, 0.10, 0.01)), (1.0, (1.0, 0.50, 0.06))], 2.2, 1.0, 0.0)
    m_fumaca = mat_flama("S2F_fumaca", TEX2 + "fx_m_t0074.png", (0.20, 0.16, 0.15), 1.0, 0.35)
    m_pico = mat_grad("S2F_pico", [(0.0, (1.0, 0.78, 0.30)), (0.35, (1.0, 0.28, 0.03)), (1.0, (0.22, 0.015, 0.0))], 2.6, 0.78, 0.55, 5.0)

    # ---- aviso no chao: losango de linhas retas + marcas, cresce e pisca ate o impacto
    D = 3.0
    segs = [((D, 0, .03), (0, D, .03)), ((0, D, .03), (-D, 0, .03)), ((-D, 0, .03), (0, -D, .03)), ((0, -D, .03), (D, 0, .03)),
            ((D * .5, 0, .03), (0, D * .5, .03)), ((0, D * .5, .03), (-D * .5, 0, .03)), ((-D * .5, 0, .03), (0, -D * .5, .03)), ((0, -D * .5, .03), (D * .5, 0, .03)),
            ((D + .35, 0, .03), (D + 1.1, 0, .03)), ((-D - .35, 0, .03), (-D - 1.1, 0, .03)), ((0, D + .35, .03), (0, D + 1.1, .03)), ((0, -D - .35, .03), (0, -D - 1.1, .03))]
    aviso = para_obj(col, "S2F_aviso", bm_linhas(segs, 0.085), m_aviso)
    esc(aviso, [(F_AVISO0, 0.55), (F_AVISO0 + 10, 1.0), (F_HIT - 1, 0.9), (F_HIT, 0.0), (F_HIT + 1, 0.0)])
    aviso.rotation_euler[2] = math.radians(45)
    anim(aviso, "rotation_euler", F_AVISO0, F_HIT, lambda t: (0, 0, math.radians(45) - t * math.radians(30)), 4)
    # ---- meteoro: grupo (posicao) -> rocha (gira) + saia de chamas (aponta para tras do voo)
    gr = bpy.data.objects.new("S2F_meteoro", None); col.objects.link(gr)
    anim(gr, "location", F_QUEDA0, F_HIT, lambda t: tuple(S + (centro_hit - S) * (t ** 1.7)), 2)
    esc(gr, [(F_QUEDA0 - 1, 0.0), (F_QUEDA0, 0.35), (F_QUEDA0 + 8, 1.0), (F_HIT - 1, 1.0), (F_HIT, 0.0)])
    rocha = para_obj(col, "S2F_rocha", bm_rocha(R_ROCHA, 1.0, 0.34), m_magma); rocha.parent = gr
    anim(rocha, "rotation_euler", F_QUEDA0, F_HIT, lambda t: (t * 9.0, t * 5.5, t * 12.0), 4)
    nuc = para_obj(col, "S2F_miolo_quente", bm_rocha(0.40, 1.0, 0.25), m_nucleo); nuc.parent = gr
    saia = bpy.data.objects.new("S2F_saia", None); col.objects.link(saia); saia.parent = gr; apunta(saia, -dirv)
    for i in range(8):
        a = i * 2 * math.pi / 8 + random.uniform(-.2, .2); L = random.uniform(3.2, 5.2); w = random.uniform(1.1, 1.8)
        b = para_obj(col, "S2F_chama_voo%d" % i, bm_lamina(L, w, random.uniform(.1, .4), random.uniform(0, 6)), m_f1 if i % 2 == 0 else m_f2)
        b.parent = saia; b.location = (math.cos(a) * 0.38, math.sin(a) * 0.38, 0.1); b.rotation_euler = (math.sin(a) * 0.30, -math.cos(a) * 0.30, a)
        esc(b, [(F_QUEDA0 + k * 3, random.uniform(.8, 1.15)) for k in range((F_HIT - F_QUEDA0) // 3 + 1)])
    # ---- impacto
    flash = luz(col, "S2F_flash", "POINT", (0, 0, 2.2), 0)
    flash.data.energy = 0; flash.data.keyframe_insert("energy", frame=F_HIT - 1)
    for f, e in ((F_HIT, 9000), (F_HIT + 4, 5000), (F_HIT + 18, 1500), (F_HIT + 40, 0)): flash.data.energy = e; flash.data.keyframe_insert("energy", frame=f)
    flash.data.color = (1.0, 0.55, 0.2)
    for i in range(14):                                                         # clarao: estrela de espinhos brancos (angular, sem bloco)
        v = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.15, 1.0))).normalized(); L = random.uniform(2.2, 4.0)
        o = para_obj(col, "S2F_clarao%d" % i, bm_cone(0.28, 0.0, L, 4), m_nucleo); o.location = (0, 0, 0.9); apunta(o, v)
        esc(o, [(F_HIT - 1, 0.0), (F_HIT, 0.3), (F_HIT + 2, 1.0), (F_HIT + 7, 0.55), (F_HIT + 13, 0.0)])
    pico_ang = random.uniform(0, 1)
    for i in range(12):                                                         # espinhos de fogo rente ao chao, para fora
        a = (i + pico_ang) * 2 * math.pi / 12; L = random.uniform(4.2, 6.4)
        b = para_obj(col, "S2F_espinho%d" % i, bm_cone(0.7, 0.0, L, 4), m_pico); apunta(b, (math.cos(a), math.sin(a), 0.32)); b.location = (math.cos(a) * 0.4, math.sin(a) * 0.4, 0.3)
        esc(b, [(F_HIT - 1, 0.0), (F_HIT, 0.12), (F_HIT + 4, 1.0), (F_HIT + 12, 0.75), (F_HIT + 26, 0.0)])
    for i in range(10):                                                         # coluna de chamas subindo
        a = i * 2 * math.pi / 10 + random.uniform(-.3, .3); rr = random.uniform(.2, 1.1); L = random.uniform(5.0, 8.0)
        b = para_obj(col, "S2F_coluna%d" % i, bm_lamina(L, random.uniform(2.4, 3.4), random.uniform(.2, .7), random.uniform(0, 6)), m_f1 if i % 2 == 0 else m_f2)
        b.location = (math.cos(a) * rr, math.sin(a) * rr, 0.0); b.rotation_euler[2] = random.uniform(0, 6.28)
        esc(b, [(F_HIT - 1, (1, 1, 0.02)), (F_HIT + 2, (0.5, 1, 0.35)), (F_HIT + 9, (1, 1, 1)), (F_HIT + 20, (0.9, 1, 1.05)), (F_HIT + 34, (0.6, 1, 0.5)), (F_HIT + 40, (0.1, 1, 0.02))])
    for i in range(7):                                                          # fumaca escura (contraste com o fogo), sobe devagar
        a = i * 2 * math.pi / 7 + random.uniform(-.4, .4); rr = random.uniform(.4, 1.6); L = random.uniform(6.0, 9.0)
        b = para_obj(col, "S2F_fumaca%d" % i, bm_lamina(L, random.uniform(2.6, 3.6), random.uniform(.3, .9), random.uniform(0, 6)), m_fumaca)
        b.location = (math.cos(a) * rr, math.sin(a) * rr, 0.0); b.rotation_euler[2] = random.uniform(0, 6.28)
        esc(b, [(F_HIT + 4, (1, 1, 0.02)), (F_HIT + 18, (0.8, 1, 0.55)), (F_HIT + 40, (1.0, 1, 0.9)), (F_FIM - 6, (1.0, 1, 1.0)), (F_FIM, (0.2, 1, 0.1))])
    for i in range(18):                                                         # lascas de rocha
        d = random.uniform(0, 6.28); vh = random.uniform(2.5, 7.0); vz = random.uniform(5.0, 10.0); r = random.uniform(.10, .26)
        o = para_obj(col, "S2F_lasca%d" % i, bm_lascas(r * 2.0, 3 if i % 2 else 4), m_magma); vida = random.randint(30, 44); wx, wy, wz = [random.uniform(-9, 9) for _ in range(3)]
        def pos(t, d=d, vh=vh, vz=vz): s = t * (F_HIT + vida - F_HIT) / FPS; return (math.cos(d) * vh * s, math.sin(d) * vh * s, 0.6 + vz * s - 9.8 * s * s / 2)
        quadros = list(range(F_HIT, F_HIT + vida, 3)) + [F_HIT + vida]
        for f in quadros:
            s = (f - F_HIT) / FPS; o.location = (math.cos(d) * vh * s, math.sin(d) * vh * s, max(0.05, 0.6 + vz * s - 9.8 * s * s / 2)); o.rotation_euler = (wx * s, wy * s, wz * s)
            o.scale = (1,) * 3 if f < F_HIT + vida else (1e-4,) * 3; o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=F_HIT - 1)
    for i in range(34):                                                         # brasas
        d = random.uniform(0, 6.28); vh = random.uniform(.8, 3.8); vz = random.uniform(2.5, 8.0); vida = random.randint(34, 62)
        o = para_obj(col, "S2F_brasa%d" % i, bm_cone(0.05, 0.0, 0.2, 4), m_brasa)
        for f in list(range(F_HIT, F_HIT + vida, 4)) + [F_HIT + vida]:
            s = (f - F_HIT) / FPS; o.location = (math.cos(d) * vh * s + .35 * math.sin(s * 5 + d), math.sin(d) * vh * s, max(0.05, 0.5 + vz * s - 4.5 * s * s)); o.rotation_euler = (s * 6, s * 4, s * 3)
            q = max(0.0, 1.0 - (f - F_HIT) / vida); o.scale = (max(q, 1e-4),) * 3; o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=F_HIT - 1)
    marca = para_obj(col, "S2F_marca_no_chao", bm_estrela_chao(4.4), m_chao); marca.location = (0, 0, 0.025)
    esc(marca, [(F_HIT - 1, 0.0), (F_HIT, 0.4), (F_HIT + 5, 1.0), (F_HIT + 36, 1.0), (F_FIM - 4, 0.9), (F_FIM, 0.0)])
    luz(ref, "S2F_sol", "SUN", (0, 0, 10), 0.8, (0.55, 0.65, 1.0)).rotation_euler = (math.radians(40), 0, math.radians(30))
    c1 = camera(sc, ref, "cam_voo", (11.5, -7.5, 4.2), (-0.8, -0.3, 2.6), 30); c2 = camera(sc, ref, "cam_perto", (7.5, -9.0, 3.0), (0, 0, 2.0), 38); sc.camera = c1
    return sc

# ================================================================== AGUA: LANCA DE GELO
def montar_agua():
    random.seed(33)
    F_FIM = 104; NASC = 1; SAI = (24, 32, 40); VOO = 40
    sc, col, ref = nova_cena("MAGO_S2_AGUA", F_FIM)
    caixa = chao_e_referencia(sc, ref, col)
    caixa("mago_ref_1.7m", (0.0, 0.0, 0.85), (0.5, 0.35, 1.7)); caixa("alvo_ref_1.8m", (0.0, 14.2, 0.9), (0.6, 0.4, 1.8))
    m_gelo = mat_gelo("S2A_gelo", (0.03, 0.22, 0.72), (0.70, 0.93, 1.0), 1.3, 0.70)
    m_miolo = mat_emit("S2A_agua_viva", (0.12, 0.50, 1.0), 3.5)
    m_casca = mat_gelo("S2A_casca", (0.20, 0.60, 0.95), (0.90, 1.0, 1.0), 1.8, 0.9)
    m_agua = mat_grad("S2A_agua", [(0.0, (0.95, 1.0, 1.0)), (0.5, (0.35, 0.78, 1.0)), (1.0, (0.08, 0.35, 0.85))], 3.2, 0.85, 0.5, 4.0)
    m_clarao = mat_emit("S2A_clarao", (0.85, 0.97, 1.0), 8.0)
    frente = Vector((0, 1, 0)); alvo_c = Vector((0, 14.2, 1.15))
    for i in range(3):
        x0 = (-1.15, 0.0, 1.15)[i]; z0 = (1.65, 2.05, 1.65)[i]; p0 = Vector((x0, 0.9, z0)); yaw = (0.17, 0.0, -0.17)[i]
        L = 3.4; r = 0.24
        lanca = bpy.data.objects.new("S2A_lanca%d" % (i + 1), None); col.objects.link(lanca)
        corpo = para_obj(col, "S2A_gelo%d" % (i + 1), bm_cristal(L, r, 6), m_gelo); corpo.parent = lanca
        miolo = para_obj(col, "S2A_miolo%d" % (i + 1), bm_cristal(L * 0.82, r * 0.5, 4), m_miolo); miolo.parent = lanca; miolo.location = (0, 0.12, 0)
        for j in range(3):                                                     # cristais menores colados na lanca (brotam do corpo)
            c = para_obj(col, "S2A_farpa%d_%d" % (i + 1, j), bm_cristal(0.7, 0.07, 4), m_casca); c.parent = lanca
            c.location = (0, 0.5 + j * 0.45, 0); c.rotation_euler = (0, math.radians(35 + j * 12) * (1 if j % 2 else -1), 0); c.rotation_euler[2] = math.radians(60 * j)
            c.rotation_euler = (math.radians(-18), math.radians(40) * (1 if j % 2 else -1), 0)
        for j in range(3):                                                     # agua viva: lencois de agua correndo junto da lanca (curtos, presos a ela)
            a = j * 2 * math.pi / 3 + 0.5
            w = para_obj(col, "S2A_lencol%d_%d" % (i + 1, j), bm_lamina(2.6, 0.75, 0.15, j), m_agua); w.parent = lanca
            w.location = (math.cos(a) * 0.3, 0.9, math.sin(a) * 0.3); w.rotation_euler = (math.radians(90), 0, 0)
            esc(w, [(1, 1.0), (SAI[i] - 1, 1.0), (SAI[i] + VOO - 2, 1.0)])
        dir0 = Vector((math.sin(-yaw), math.cos(yaw), 0.0)); apunta(lanca, dir0, "Y", "Z")
        nasc = NASC + i * 4
        anim(lanca, "location", nasc, SAI[i], lambda t, p0=p0: tuple(p0 + Vector((0, -0.7 * (1 - t) ** 2, 0.18 * math.sin(t * 9) * (1 - t * .5)))), 3)
        esc(lanca, [(nasc - 1, 0.0), (nasc + 3, 0.5), (nasc + 12, 1.0), (SAI[i], 1.0)])
        # voo: converge no alvo
        alvo_i = alvo_c + Vector(((-0.35, 0.0, 0.35)[i], 0, (0.15, -0.05, 0.1)[i]))
        d_voo = (alvo_i - p0).normalized()
        for f in range(SAI[i], SAI[i] + VOO + 1, 4):
            t = (f - SAI[i]) / VOO; lanca.location = tuple(p0 + (alvo_i - p0) * t); lanca.keyframe_insert("location", frame=f)
        apunta(lanca, d_voo, "Y", "Z"); lanca.keyframe_insert("rotation_euler", frame=SAI[i])
        lanca.rotation_euler = dir0.to_track_quat("Y", "Z").to_euler(); lanca.keyframe_insert("rotation_euler", frame=SAI[i] - 1)
        apunta(lanca, d_voo, "Y", "Z"); lanca.keyframe_insert("rotation_euler", frame=SAI[i] + 4)
        f_hit = SAI[i] + VOO
        esc(lanca, [(f_hit - 1, 1.0), (f_hit, 0.0)])
        # ---- impacto
        ip = alvo_i
        for j in range(10):                                                    # clarao: estrela de espinhos claros
            v = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.2, 1.0))).normalized(); Ls = random.uniform(1.0, 2.0)
            o = para_obj(col, "S2A_clarao%d_%d" % (i + 1, j), bm_cone(0.14, 0.0, Ls, 4), m_clarao); o.location = ip; apunta(o, v)
            esc(o, [(f_hit - 1, 0.0), (f_hit, 0.3), (f_hit + 2, 1.0), (f_hit + 6, 0.5), (f_hit + 11, 0.0)])
        for j in range(12):                                                    # estilhacos de gelo
            d = random.uniform(0, 6.28); vh = random.uniform(2.0, 6.5); vz = random.uniform(1.0, 5.5); rr = random.uniform(.10, .26); vida = random.randint(26, 38)
            o = para_obj(col, "S2A_estilhaco%d_%d" % (i + 1, j), bm_lascas(rr * 2.0, 3 if j % 2 else 4), m_casca); wx, wy, wz = [random.uniform(-10, 10) for _ in range(3)]
            for f in list(range(f_hit, f_hit + vida, 3)) + [f_hit + vida]:
                s = (f - f_hit) / FPS; o.location = tuple(ip + Vector((math.cos(d) * vh * s, math.sin(d) * vh * s * 0.8 + 0.8 * s, vz * s - 9.8 * s * s / 2)))
                o.location.z = max(0.05, o.location.z); o.rotation_euler = (wx * s, wy * s, wz * s); o.scale = ((1,) * 3 if f < f_hit + vida else (1e-4,) * 3)
                o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
            o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f_hit - 1)
        for j in range(8):                                                     # coroa de agua: espinhos angulares que sobem e caem para fora
            a = j * 2 * math.pi / 8 + random.uniform(-.2, .2); L = random.uniform(1.4, 2.3)
            o = para_obj(col, "S2A_agua%d_%d" % (i + 1, j), bm_cone(0.22, 0.0, L, 4), m_agua); o.location = ip + Vector((math.cos(a) * .25, math.sin(a) * .25, -.5))
            apunta(o, (math.cos(a) * 0.65, math.sin(a) * 0.65, 1.0))
            esc(o, [(f_hit - 1, 0.0), (f_hit, 0.1), (f_hit + 4, 1.0), (f_hit + 11, 0.85), (f_hit + 20, 0.0)])
        for j in range(5):                                                     # gelo que brota no chao (fica um tempo: lentidao)
            a = random.uniform(0, 6.28); rr = random.uniform(.5, 1.6); L = random.uniform(.8, 1.7)
            o = para_obj(col, "S2A_geada%d_%d" % (i + 1, j), bm_cristal(L, .17, 5), m_gelo); o.location = (ip.x + math.cos(a) * rr, ip.y + math.sin(a) * rr, 0.0)
            o.rotation_euler = (math.radians(random.uniform(-25, 25)) - math.pi / 2 + math.pi / 2, 0, 0); apunta(o, (math.cos(a) * .3, math.sin(a) * .3, 1.0), "Y", "Z")
            esc(o, [(f_hit - 1, 0.0), (f_hit + 2, 0.15), (f_hit + 7, 1.0), (F_FIM - 14, 1.0), (F_FIM - 2, 0.0)])
    luz(ref, "S2A_sol", "SUN", (0, 0, 10), 1.0, (0.7, 0.85, 1.0)).rotation_euler = (math.radians(45), 0, math.radians(-30))
    lf = luz(col, "S2A_brilho_impacto", "POINT", (0, 14.2, 1.5), 0, (0.5, 0.8, 1.0))
    for f, e in ((60, 0), (64, 6000), (70, 1000), (72, 6000), (78, 1000), (80, 6000), (92, 0)): lf.data.energy = e; lf.data.keyframe_insert("energy", frame=f)
    c1 = camera(sc, ref, "cam_lateral", (13.5, 7.2, 3.0), (0, 7.2, 1.5), 30); c2 = camera(sc, ref, "cam_alvo", (5.5, 9.5, 2.2), (0, 14.0, 1.2), 35); sc.camera = c1
    return sc

# ================================================================== NECROMANTE: ESPINHOS DE OSSO (Death Spike / Vampiric Claw do L2)
def montar_necro():
    random.seed(55)
    F_FIM = 112; F_AV = 1; F_ERU = 14; N_ESP = 11; PASSO = 2; F_ALMA = 36
    sc, col, ref = nova_cena("MAGO_S2_NECRO", F_FIM)
    caixa = chao_e_referencia(sc, ref, col)
    caixa("mago_ref_1.7m", (0.0, 0.0, 0.85), (0.5, 0.35, 1.7)); caixa("alvo_ref_1.8m", (0.0, 11.5, 0.9), (0.6, 0.4, 1.8))
    m_osso = mat_gelo("S2N_osso", (0.40, 0.36, 0.28), (0.96, 0.98, 0.84), 1.2, 1.0)
    m_verde = mat_emit("S2N_alma", (0.12, 0.85, 0.25), 2.6)
    m_rach = mat_grad("S2N_rachadura", [(0.0, (0.10, 0.60, 0.20)), (1.0, (0.55, 1.0, 0.55))], 4.0, 1.0)
    m_aviso = mat_grad("S2N_aviso", [(0.0, (0.15, 0.75, 0.25)), (1.0, (0.70, 1.0, 0.60))], 3.5, 0.9)
    m_nevoa = mat_flama("S2N_nevoa", TEX2 + "fx_m_t0074.png", (0.30, 0.95, 0.45), 1.6, 0.35)
    m_sombra = mat_flama("S2N_fumaca_negra", TEX2 + "fx_m_t0074.png", (0.03, 0.06, 0.04), 1.0, 0.35)
    ys = [1.4 + i * 0.95 for i in range(N_ESP)]
    # aviso: marcas retas no chao ate o alvo
    segs = []
    for i in range(N_ESP):
        y = ys[i]; segs += [((-0.55, y, .03), (0.0, y + 0.45, .03)), ((0.0, y + 0.45, .03), (0.55, y, .03))]
    aviso = para_obj(col, "S2N_aviso", bm_linhas(segs, 0.08), m_aviso)
    esc(aviso, [(F_AV, 0.6), (F_AV + 8, 1.0), (F_ERU + 4, 1.0), (F_ERU + 5, 0.0)])
    # rachadura em zigue-zague no chao (por onde os espinhos sobem)
    zz = []; px, py = 0.0, 0.8
    for i in range(N_ESP * 2):
        nx, ny = (0.0 if i % 2 else random.uniform(-0.35, 0.35)), 0.8 + (i + 1) * 0.48
        zz.append(((px, py, .035), (nx, ny, .035))); px, py = nx, ny
    rach = para_obj(col, "S2N_rachadura", bm_linhas(zz, 0.16), m_rach)
    esc(rach, [(F_ERU - 1, (1, 0.02, 1)), (F_ERU, (1, 0.05, 1)), (F_ERU + 22, (1, 1.0, 1)), (F_FIM - 20, (1, 1.0, 1)), (F_FIM - 4, (1, 0.02, 1))])
    # espinhos de osso: brotam em sequencia, ate 10 m
    espinhos = []
    for i in range(N_ESP):
        f0 = F_ERU + i * PASSO; y = ys[i]; x = random.uniform(-0.55, 0.55) * (0.6 + i * 0.05); L = random.uniform(1.7, 2.6) * (0.85 + i * 0.045)
        for k in range(2):                                                   # um espinho grande e um menor ao lado
            Lk = L * (1.0 if k == 0 else 0.55); xo = x + (0 if k == 0 else random.choice((-1, 1)) * 0.55)
            o = para_obj(col, "S2N_espinho%d_%d" % (i, k), bm_cone(0.26 if k == 0 else 0.17, 0.0, Lk, 5), m_osso)
            o.location = (xo, y + (0 if k == 0 else 0.25), -0.1); apunta(o, (random.uniform(-0.25, 0.25) + (0.0 if k == 0 else xo * 0.4), random.uniform(0.15, 0.55), 1.0))
            esc(o, [(f0 - 1, (1, 1, 0.01)), (f0, (1, 1, 0.1)), (f0 + 3, (1, 1, 1.25)), (f0 + 6, (1, 1, 1.0)), (F_FIM - 30, (1, 1, 1.0)), (F_FIM - 16, (1, 1, 0.02))])
            espinhos.append((o, xo, y))
        n = para_obj(col, "S2N_nevoa%d" % i, bm_lamina(random.uniform(1.8, 2.8), random.uniform(1.0, 1.5), 0.3, i), m_nevoa)
        n.location = (x, y, 0.0); n.rotation_euler[2] = random.uniform(0, 6.28)
        esc(n, [(f0, (1, 1, 0.02)), (f0 + 6, (1, 1, 0.9)), (f0 + 30, (1, 1, 0.5)), (f0 + 44, (1, 1, 0.02))])
        if i % 2 == 0:
            sm = para_obj(col, "S2N_fumaca%d" % i, bm_lamina(random.uniform(2.4, 3.6), random.uniform(1.2, 1.8), 0.4, i), m_sombra)
            sm.location = (x, y, 0.0); sm.rotation_euler[2] = random.uniform(0, 6.28)
            esc(sm, [(f0 + 1, (1, 1, 0.02)), (f0 + 10, (1, 1, 0.9)), (f0 + 50, (1, 1, 1.0)), (f0 + 70, (1, 1, 0.02))])
    # cacos de osso: o espinho se desfaz no fim
    for i in range(N_ESP):
        for j in range(3):
            xo, y = espinhos[i * 2][1], espinhos[i * 2][2]; d = random.uniform(0, 6.28); vh = random.uniform(.8, 2.4); vz = random.uniform(1.0, 3.0)
            o = para_obj(col, "S2N_caco%d_%d" % (i, j), bm_lascas(random.uniform(.12, .22) * 2, 3), m_osso); f1 = F_FIM - 30 + (i % 4)
            for f in list(range(f1, f1 + 34, 3)) + [f1 + 34]:
                t = (f - f1) / FPS; o.location = (xo + math.cos(d) * vh * t, y + math.sin(d) * vh * t, max(0.04, 1.2 + vz * t - 9.8 * t * t / 2)); o.rotation_euler = (t * 6, t * 5, t * 4)
                o.scale = (1,) * 3 if f < f1 + 34 else (1e-4,) * 3; o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
            o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f1 - 1)
    # almas: pedacos verdes sobem dos espinhos e voltam em arco para o mago (vida roubada)
    C = Vector((0, 0.1, 1.25))
    for j in range(16):
        k = random.randrange(N_ESP); xo, y = espinhos[k * 2][1], ys[k]; f0 = F_ALMA + j * 2 + random.randint(0, 2); dur = random.randint(16, 24)
        o = para_obj(col, "S2N_alma%d" % j, bm_cone(0.15, 0.0, 0.85, 4), m_verde); lado = random.choice((-1, 1)) * random.uniform(.6, 1.6); alt = random.uniform(1.4, 2.6)
        for f in list(range(f0, f0 + dur, 2)) + [f0 + dur]:
            t = (f - f0) / dur; p0 = Vector((xo, y, 1.3)); p = p0 + (C - p0) * t
            p += Vector((lado * math.sin(t * math.pi), 0, alt * math.sin(t * math.pi)))
            o.location = p; o.rotation_euler = (t * 9, t * 7, t * 5)
            o.scale = (max((0.2 + math.sin(min(1.0, t * 1.2) * math.pi / 2)) if t < 0.85 else 1.2 * (1.0 - (t - 0.85) / 0.15), 1e-4),) * 3
            o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f0 - 1); o.keyframe_insert("scale", frame=f0 + dur + 1)
        fl = para_obj(col, "S2N_absorve%d" % j, bm_cone(0.10, 0.0, 0.6, 4), m_verde); fl.location = (random.uniform(-.25, .25), 0.1, 1.25 + random.uniform(-.3, .5))
        apunta(fl, (random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(0.1, 1)))
        esc(fl, [(f0 + dur - 1, 0.0), (f0 + dur, 1.0), (f0 + dur + 4, 0.0)])
    luz(ref, "S2N_sol", "SUN", (0, 0, 10), 0.7, (0.7, 0.85, 0.8)).rotation_euler = (math.radians(45), 0, math.radians(-25))
    lv = luz(col, "S2N_brilho", "POINT", (0, 6.0, 1.8), 0, (0.3, 1.0, 0.45))
    for f, e in ((F_ERU - 1, 0), (F_ERU + 6, 1200), (F_ERU + 30, 600), (F_FIM - 20, 0)): lv.data.energy = e; lv.data.keyframe_insert("energy", frame=f)
    c1 = camera(sc, ref, "cam_lateral", (12.5, 5.8, 3.2), (0, 5.8, 1.3), 30); camera(sc, ref, "cam_do_mago", (-4.2, -4.5, 2.4), (0, 6.0, 1.2), 32); sc.camera = c1
    return sc

sc_f = montar_fogo(); sc_a = montar_agua(); sc_n = montar_necro()
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
bpy.context.window.scene = sc_f
print("S2 pronto:", [s.name for s in bpy.data.scenes], "objetos fogo", len(sc_f.objects), "agua", len(sc_a.objects), "necro", len(sc_n.objects))
