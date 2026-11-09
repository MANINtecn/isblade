"""Clerigo (healer) - PREVIA das 7 skills no Blender: ataque basico + 6 skills por nivel (1/5/10/20/25/30). So formas angulares, sem circulo, sem rosa/lilas.
Rodar ao vivo pelo MCP:  exec(compile(open(r"<este arquivo>", encoding="utf8").read(), "cl", "exec"))
Cria (ou refaz) as cenas CLERIGO_* no .blend aberto (nao mexe nas outras cenas). 48 fps, Livro Astral aberto na mao esquerda.
Paleta: ouro e branco quente (luz sagrada), verde claro (cura), azul palido so no escudo. Cenas:
  CLERIGO_BASICO      Lamina de Luz (ataque basico)       CLERIGO_S1_CURA      Cura Mirada (nivel 1)
  CLERIGO_S2_GLIFO    Glifo de Cura (nivel 5)             CLERIGO_S3_ESCUDO    Escudo Astral (nivel 10)
  CLERIGO_S4_PURIFICA Purificacao (nivel 20)              CLERIGO_S5_PRECE     Prece (nivel 25)
  CLERIGO_S6_RESSUR   Ressurreicao (nivel 30)"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

FPS = 48
GAIN = 0.5            # intensidade geral da luz dos materiais (1.0 estourava para branco)
PREFIXO = "CLERIGO_"
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
JANELA_ANTES = bpy.context.window.scene

# ------------------------------------------------------------------ limpeza so do que e do Clerigo
for s in [s for s in bpy.data.scenes if s.name.startswith(PREFIXO)]:
    for o in list(s.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections):
        if c.name.startswith(s.name): bpy.data.collections.remove(c)
    if bpy.context.window.scene is s: bpy.context.window.scene = next(x for x in bpy.data.scenes if not x.name.startswith(PREFIXO))
    bpy.data.scenes.remove(s)
for m in list(bpy.data.materials):
    if m.name.startswith("CL_"): bpy.data.materials.remove(m)
for me in list(bpy.data.meshes):
    if me.users == 0 and me.name.startswith("CL_"): bpy.data.meshes.remove(me)

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

# ------------------------------------------------------------------ materiais (todos CL_)
def mat_base(nome):
    m = bpy.data.materials.new(nome); m.use_nodes = True; m.node_tree.nodes.clear()
    try: m.surface_render_method = "BLENDED"
    except Exception: pass
    m.use_backface_culling = False
    return m
def _fim(m, em, alfa_socket, N):
    nt = m.node_tree; out = N.new("ShaderNodeOutputMaterial"); mix = N.new("ShaderNodeMixShader"); tr = N.new("ShaderNodeBsdfTransparent")
    nt.links.new(alfa_socket, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
def mat_grad(nome, stops, forca=3.0, alfa=1.0, cauda=0.0):
    """gradiente emissivo ao longo de uv y (0 base .. 1 ponta); some na ponta se cauda > 0"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); ramp = N.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    while len(el) < len(stops): el.new(0.5)
    for e, (p, c) in zip(el, stops): e.position = p; e.color = (*c, 1)
    nt.links.new(tc.outputs["UV"], sep.inputs[0]); nt.links.new(sep.outputs[1], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca * GAIN
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = max(cauda, 0.01)
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = alfa
    nt.links.new(sep.outputs[1], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    if cauda > 0: nt.links.new(pw.outputs[0], mul.inputs[0])
    else: mul.inputs[0].default_value = 1.0
    _fim(m, em, mul.outputs[0], N); return m
def mat_emit(nome, cor, forca=6.0):
    m = mat_base(nome); N = m.node_tree.nodes; em = N.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*cor, 1); em.inputs["Strength"].default_value = forca * GAIN
    out = N.new("ShaderNodeOutputMaterial"); m.node_tree.links.new(em.outputs[0], out.inputs[0]); return m
def mat_vidro(nome, centro, borda, forca=2.2, alfa_c=0.55):
    """cristal/barreira: centro translucido, borda (fresnel) clara; as faces retas dao os brilhos"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.42
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.30; ramp.color_ramp.elements[1].position = 0.95
    ramp.color_ramp.elements[0].color = (*centro, 1); ramp.color_ramp.elements[1].color = (*borda, 1)
    nt.links.new(lw.outputs["Facing"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca * GAIN
    al = N.new("ShaderNodeMapRange"); al.inputs[3].default_value = 1.0; al.inputs[4].default_value = alfa_c
    nt.links.new(lw.outputs["Facing"], al.inputs[0]); _fim(m, em, al.outputs[0], N); return m
def mat_feixe(nome, base, topo, forca=2.4, esticar=0.7, escala=5.0, alfa=0.9, vel=0.0, f0=1, f1=1, sobe=True):
    """feixe de luz: veios verticais (ruido esticado) que correm; mais claro na base, some no topo"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    em = N.new("ShaderNodeEmission"); tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.name = "mapa"
    mp.inputs[3].default_value = (escala, escala, esticar)
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.6; nz.inputs["Detail"].default_value = 3
    rv = N.new("ShaderNodeValToRGB"); rv.color_ramp.elements[0].position = 0.32; rv.color_ramp.elements[1].position = 0.70
    sep = N.new("ShaderNodeSeparateXYZ"); gr = N.new("ShaderNodeValToRGB"); gr.color_ramp.elements[0].color = (*base, 1); gr.color_ramp.elements[1].color = (*topo, 1)
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 0.55
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY_ADD"; mx.inputs[1].default_value = 0.75; mx.inputs[2].default_value = 0.25
    al = N.new("ShaderNodeMath"); al.operation = "MULTIPLY"; al2 = N.new("ShaderNodeMath"); al2.operation = "MULTIPLY"; al2.inputs[1].default_value = alfa
    L = nt.links; uv = N.new("ShaderNodeTexCoord")
    L.new(tc.outputs["Object"], mp.inputs[0]); L.new(mp.outputs[0], nz.inputs["Vector"]); L.new(nz.outputs["Fac"], rv.inputs[0])
    L.new(uv.outputs["UV"], sep.inputs[0]); L.new(sep.outputs[1], gr.inputs[0]); L.new(gr.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca * GAIN
    L.new(sep.outputs[1], inv.inputs[1]); L.new(inv.outputs[0], pw.inputs[0]); L.new(rv.outputs[0], mx.inputs[0]); L.new(mx.outputs[0], al.inputs[0]); L.new(pw.outputs[0], al.inputs[1])
    L.new(al.outputs[0], al2.inputs[0]); _fim(m, em, al2.outputs[0], N)
    if vel:
        for fr, z in ((f0, 0.0), (f1, -vel if sobe else vel)):
            mp.inputs[1].default_value = (0, 0, z); nt.keyframe_insert('nodes["mapa"].inputs[1].default_value', frame=fr)
    return m
def mat_ref(nome, cor):
    m = bpy.data.materials.new(nome); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*cor, 1); b.inputs["Roughness"].default_value = 0.8; return m

OURO = (1.0, 0.80, 0.32); BRANCO = (1.0, 0.96, 0.82); VERDE = (0.30, 1.0, 0.52); VERDE_ESC = (0.04, 0.55, 0.22); AZUL_P = (0.55, 0.85, 1.0)
M = {}
def mats():
    M["ouro_vidro"] = mat_vidro("CL_ouro_vidro", (1.0, 0.62, 0.10), (1.0, 0.95, 0.70), 2.2, 0.6)
    M["verde_vidro"] = mat_vidro("CL_verde_vidro", (0.05, 0.70, 0.32), (0.88, 1.0, 0.92), 2.2, 0.75)
    M["azul_vidro"] = mat_vidro("CL_azul_vidro", (0.12, 0.45, 0.95), (0.80, 0.95, 1.0), 2.0, 0.35)
    M["branco"] = mat_emit("CL_branco", BRANCO, 7.0)
    M["ouro"] = mat_emit("CL_ouro", OURO, 5.0)
    M["verde"] = mat_emit("CL_verde", VERDE, 5.5)
    M["rastro"] = mat_grad("CL_rastro", [(0.0, (1.0, 0.98, 0.85)), (0.5, OURO), (1.0, (0.9, 0.55, 0.10))], 3.0, 0.9, 0.7)
    M["rastro_v"] = mat_grad("CL_rastro_v", [(0.0, (0.92, 1.0, 0.92)), (0.5, VERDE), (1.0, VERDE_ESC)], 3.0, 0.9, 0.7)
    M["marca"] = mat_grad("CL_marca", [(0.0, (1.0, 0.85, 0.45)), (1.0, (1.0, 0.98, 0.85))], 3.2, 0.95)
    M["marca_v"] = mat_grad("CL_marca_v", [(0.0, (0.25, 0.85, 0.45)), (1.0, (0.9, 1.0, 0.92))], 3.2, 0.95)
    M["marca_a"] = mat_grad("CL_marca_a", [(0.0, (0.25, 0.60, 1.0)), (1.0, (0.88, 0.97, 1.0))], 3.0, 0.95)
    M["pilar"] = mat_grad("CL_pilar", [(0.0, (1.0, 0.97, 0.80)), (0.5, OURO), (1.0, (0.9, 0.5, 0.1))], 3.0, 0.9, 0.6)
    M["feixe_o"] = mat_feixe("CL_feixe_o", BRANCO, (1.0, 0.70, 0.18), 1.9, 0.5, 4.0, 0.8, 6.0, 1, 260)
    M["feixe_o2"] = mat_feixe("CL_feixe_o2", (1.0, 1.0, 0.92), OURO, 2.0, 0.4, 5.5, 0.85, 8.0, 1, 260)
    M["feixe_v"] = mat_feixe("CL_feixe_v", (0.9, 1.0, 0.92), (0.15, 0.80, 0.40), 2.2, 0.55, 4.0, 0.85, 5.0, 1, 260)
    M["feixe_b"] = mat_feixe("CL_feixe_b", (1.0, 1.0, 0.95), (1.0, 0.82, 0.35), 2.3, 0.35, 5.0, 0.9, 9.0, 1, 260)
    M["osso"] = mat_emit("CL_osso", (0.30, 0.27, 0.20), 0.9); M["lanca_m"] = mat_emit("CL_lanca_m", (1.0, 0.30, 0.06), 6.0)
    M["livro_capa"] = mat_ref("CL_livro_capa", (0.42, 0.10, 0.07)); M["livro_ouro"] = mat_emit("CL_livro_ouro", OURO, 2.5); M["livro_luz"] = mat_emit("CL_livro_luz", (1.0, 0.93, 0.62), 4.5)

# ------------------------------------------------------------------ geometria
def para_obj(col, nome, bm, mat=None, flat=True):
    me = bpy.data.meshes.new("CL_" + nome); bm.to_mesh(me); bm.free()
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
def bm_coluna(r1, r2, H, lados=6):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=lados, radius1=r1, radius2=r2, depth=H)
    bmesh.ops.translate(bm, vec=(0, 0, H / 2), verts=bm.verts); uv_z(bm, 0, H); return bm
def bm_cristal(L, r, lados=4, cauda=0.28):
    """cristal de duas pontas ao longo de +Z: ponta curta atras (z=0), corpo facetado a cauda*L, ponta longa em L"""
    bm = bmesh.new(); a = bm.verts.new((0, 0, 0)); anel = [bm.verts.new((r * math.cos(2 * math.pi * i / lados + 0.4), r * math.sin(2 * math.pi * i / lados + 0.4), cauda * L)) for i in range(lados)]
    p = bm.verts.new((0, 0, L))
    for i in range(lados):
        j = (i + 1) % lados; bm.faces.new((a, anel[j], anel[i])); bm.faces.new((anel[i], anel[j], p))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); uv_z(bm, 0, L); return bm
def bm_lamina(L, w, wob=0.0, fase=0.0, segs=5):
    """faixa plana em ponta (plano XZ), comprimento em +Z; uv y = ao longo"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); linhas = []
    for k in range(segs + 1):
        t = k / segs; meio = w * 0.5 * (1 - t) ** 0.75 * (0.55 + 0.45 * math.sin(min(1.0, t * 1.5) * math.pi / 2)); cx = wob * math.sin(t * 3.0 + fase) * t
        if k == segs: linhas.append([bm.verts.new((cx, 0, t * L))])
        else: linhas.append([bm.verts.new((cx - meio, 0, t * L)), bm.verts.new((cx + meio, 0, t * L))])
    for k in range(segs):
        a, b = linhas[k], linhas[k + 1]; f = bm.faces.new((a[0], a[1], b[1], b[0]) if len(b) == 2 else (a[0], a[1], b[0]))
        for lp in f.loops: lp[uvl].uv = (0.5 + lp.vert.co.x / max(w, 1e-6), lp.vert.co.z / L)
    return bm
def bm_lascas(r, lados=3):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r * 0.5, radius2=0.0, depth=r * 1.6)
    for v in bm.verts: v.co += Vector((random.uniform(-.04, .04), random.uniform(-.04, .04), random.uniform(-.04, .04))) * r * 4
    return bm
def bm_octaedro(r, alto=1.5):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    for v in bm.verts: v.co.z *= alto
    return bm
def bm_cruz(s, esp):
    """cruz de cura (+) no plano XZ, extrudada em Y"""
    bm = bmesh.new(); h = s * 0.5; a = s * 0.17
    pts = [(-a, -h), (a, -h), (a, -a), (h, -a), (h, a), (a, a), (a, h), (-a, h), (-a, a), (-h, a), (-h, -a), (-a, -a)]
    vs = [bm.verts.new((x, -esp / 2, z)) for x, z in pts]; bm.faces.new(vs); bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=esp)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
def bm_seta(s, esp):
    """seta para cima (chevron de buff) no plano XZ, extrudada em Y"""
    bm = bmesh.new(); pts = [(0, s), (s * .75, 0), (s * .28, 0), (s * .28, -s * .7), (-s * .28, -s * .7), (-s * .28, 0), (-s * .75, 0)]
    vs = [bm.verts.new((x, -esp / 2, z)) for x, z in pts]; bm.faces.new(vs); bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=esp)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
def bm_placa(w, h, esp=0.05):
    """placa de barreira: hexagono alongado (em pe, plano XZ), uv x/y de 0..1"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); pts = [(0, h / 2), (w / 2, h * .26), (w / 2, -h * .26), (0, -h / 2), (-w / 2, -h * .26), (-w / 2, h * .26)]
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]; bm.faces.new(vs); bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=esp)
    bmesh.ops.translate(bm, vec=(0, 0, 0), verts=bm.verts); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        for lp in f.loops: lp[uvl].uv = (lp.vert.co.x / w + 0.5, lp.vert.co.z / h + 0.5)
    return bm
def bm_linhas(segs, larg):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify()
    for (a, b) in segs:
        d = (Vector(b) - Vector(a)); n = Vector((-d.y, d.x, 0)).normalized() * larg * 0.5
        vs = [bm.verts.new(Vector(a) + n), bm.verts.new(Vector(b) + n), bm.verts.new(Vector(b) - n), bm.verts.new(Vector(a) - n)]; f = bm.faces.new(vs)
        for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): lp[uvl].uv = uv
    return bm
def poligono(R, n, rot=0.0, z=0.03, passo=1):
    """lista de segmentos de um poligono regular (passo 2 em n=6 -> triangulo; em n=8 -> quadrado)"""
    pts = [(R * math.cos(rot + 2 * math.pi * i / n), R * math.sin(rot + 2 * math.pi * i / n), z) for i in range(n)]
    return [(pts[i], pts[(i + passo * 1) % n]) for i in range(n)] if passo == 1 else [(pts[i], pts[(i + passo) % n]) for i in range(n) if (i % passo) == 0 or n % passo]
def segs_glifo(R, tipo):
    """glifo de linhas retas: 'hex' (hexagono duplo + hexagrama) ou 'octa' (octagrama + octogono) ou 'losango'"""
    S = []
    if tipo == "hex":
        S += poligono(R, 6) + poligono(R * 0.86, 6)
        S += [(p[0], p[1]) for p in zip([(R * .86 * math.cos(2 * math.pi * i / 3 + 0.0), R * .86 * math.sin(2 * math.pi * i / 3), .03) for i in range(3)], [(R * .86 * math.cos(2 * math.pi * (i + 1) / 3), R * .86 * math.sin(2 * math.pi * (i + 1) / 3), .03) for i in range(3)])]
        S += [(p[0], p[1]) for p in zip([(R * .86 * math.cos(math.pi + 2 * math.pi * i / 3), R * .86 * math.sin(math.pi + 2 * math.pi * i / 3), .03) for i in range(3)], [(R * .86 * math.cos(math.pi + 2 * math.pi * (i + 1) / 3), R * .86 * math.sin(math.pi + 2 * math.pi * (i + 1) / 3), .03) for i in range(3)])]
    elif tipo == "octa":
        for rot in (0.0, math.pi / 4):
            P = [(R * .9 * math.cos(rot + math.pi / 2 * i), R * .9 * math.sin(rot + math.pi / 2 * i), .03) for i in range(4)]; S += [(P[i], P[(i + 1) % 4]) for i in range(4)]
        S += poligono(R, 8) + poligono(R * 0.35, 4, math.pi / 4)
    else:
        P = [(R, 0, .03), (0, R, .03), (-R, 0, .03), (0, -R, .03)]; S += [(P[i], P[(i + 1) % 4]) for i in range(4)]
        Q = [(R * .5, 0, .03), (0, R * .5, .03), (-R * .5, 0, .03), (0, -R * .5, .03)]; S += [(Q[i], Q[(i + 1) % 4]) for i in range(4)]
    return S

# ------------------------------------------------------------------ animacao
def anim(o, prop, f0, f1, fn, passo=2):
    for f in list(range(f0, f1, passo)) + [f1]:
        setattr(o, prop, fn((f - f0) / max(1, (f1 - f0)))); o.keyframe_insert(prop, frame=f)
def esc(o, pts):
    for f, s in pts:
        o.scale = (max(s, 1e-4),) * 3 if not isinstance(s, tuple) else tuple(max(x, 1e-4) for x in s); o.keyframe_insert("scale", frame=f)
def apunta(o, d, eixo="Z", cima="Y"):
    o.rotation_euler = Vector(d).normalized().to_track_quat(eixo, cima).to_euler()
def luz(col, nome, tipo, loc, energia, cor=(1, 1, 1)):
    ld = bpy.data.lights.new(nome, tipo); ld.energy = energia; ld.color = cor
    o = bpy.data.objects.new(nome, ld); o.location = loc; col.objects.link(o); return o
def pisca(l, pts):
    for f, e in pts: l.data.energy = e * 0.4; l.data.keyframe_insert("energy", frame=f)
def camera(sc, col, nome, loc, alvo, lente=32):
    nome = sc.name[len(PREFIXO):] + "_" + nome                                  # nomes de objeto sao unicos no arquivo: cada cena leva o seu prefixo
    c = bpy.data.objects.new(nome, bpy.data.cameras.new(nome)); c.data.lens = lente; c.location = loc; col.objects.link(c)
    t = bpy.data.objects.new(nome + "_alvo", None); t.location = alvo; col.objects.link(t)
    k = c.constraints.new("TRACK_TO"); k.target = t; k.track_axis = "TRACK_NEGATIVE_Z"; k.up_axis = "UP_Y"; return c
def caixa(ref, nome, loc, dim, mat):
    b = bmesh.new(); bmesh.ops.create_cube(b, size=1.0); bmesh.ops.scale(b, vec=dim, verts=b.verts); o = para_obj(ref, nome, b, mat); o.location = loc; return o
def base_cena(nome, fim, caster=(0, 0)):
    sc, col, ref = nova_cena(PREFIXO + nome, fim)
    b = bmesh.new(); bmesh.ops.create_grid(b, x_segments=1, y_segments=1, size=30); mc = mat_ref("CL_chao_" + nome, (0.045, 0.05, 0.06)); para_obj(ref, "chao", b, mc)
    cl = caixa(ref, "clerigo_ref_1.7m", (caster[0], caster[1], 0.85), (0.5, 0.35, 1.7), M["ref_c"])
    luz(ref, "sol", "SUN", (0, 0, 10), 0.9, (0.85, 0.85, 1.0)).rotation_euler = (math.radians(45), 0, math.radians(-30)); return sc, col, ref
def ref_mats():
    M["ref_c"] = mat_ref("CL_ref_clerigo", (0.55, 0.52, 0.42)); M["ref_a"] = mat_ref("CL_ref_aliado", (0.20, 0.36, 0.60)); M["ref_i"] = mat_ref("CL_ref_inimigo", (0.50, 0.14, 0.11))

# ------------------------------------------------------------------ Livro Astral (prop do Clerigo)
def livro(col, loc, f_abre, f_fecha, ang_aberto=50, ang_fechado=88, esc_=1.5):
    """livro aberto em V, lombada vertical, paginas brilhando para a frente (+Y); abre em f_abre e fecha em f_fecha"""
    L, W, H = 0.20 * esc_, 0.014 * esc_, 0.30 * esc_
    raiz = bpy.data.objects.new("livro", None); col.objects.link(raiz); raiz.location = loc
    def cubo(nome, mat, dim, off):
        b = bmesh.new(); bmesh.ops.create_cube(b, size=1.0); bmesh.ops.scale(b, vec=dim, verts=b.verts); bmesh.ops.translate(b, vec=off, verts=b.verts); return para_obj(col, nome, b, mat)
    lombada = cubo("livro_lombada", M["livro_capa"], (W * 1.6, W * 2.0, H), (0, 0, 0)); lombada.parent = raiz
    pivs = []
    for lado in (0, 1):
        pv = bpy.data.objects.new("livro_piv%d" % lado, None); col.objects.link(pv); pv.parent = raiz
        capa = cubo("livro_capa%d" % lado, M["livro_capa"], (L, W, H), (L / 2, 0, 0)); capa.parent = pv
        borda = cubo("livro_borda%d" % lado, M["livro_ouro"], (L * 0.96, W * 0.6, H * 1.02), (L / 2, W * (-0.7 if lado == 0 else 0.7), 0)); borda.parent = pv
        pag = cubo("livro_pag%d" % lado, M["livro_luz"], (L * 0.88, W * 0.5, H * 0.9), (L / 2 + 0.01, W * (-1.05 if lado == 0 else 1.05), 0)); pag.parent = pv
        pivs.append(pv)
    for f, a in ((1, ang_fechado), (f_abre, ang_fechado), (f_abre + 12, ang_aberto), (f_fecha - 10, ang_aberto), (f_fecha, ang_fechado)):
        pivs[0].rotation_euler = (0, 0, math.radians(180 - a)); pivs[1].rotation_euler = (0, 0, math.radians(a))
        pivs[0].keyframe_insert("rotation_euler", frame=f); pivs[1].keyframe_insert("rotation_euler", frame=f)
    for f, z in ((1, 0), (f_abre + 12, 0.03), (f_abre + 36, -0.02), (f_fecha, 0)):
        raiz.location = (loc[0], loc[1], loc[2] + z); raiz.keyframe_insert("location", frame=f)
    ll = luz(col, "livro_luz", "POINT", (0, 0.2, 0), 0, (1.0, 0.85, 0.5)); ll.parent = raiz
    pisca(ll, [(1, 0), (f_abre + 8, 0), (f_abre + 14, 60), (f_fecha - 10, 60), (f_fecha, 0)])
    return raiz

# ------------------------------------------------------------------ pecas reutilizaveis
def particulas_cruz(col, nome, centro, f0, n, mat, alt=2.6, raio=0.9, vida=(34, 52), tam=(.14, .22), espalha=0.0, f_ate=None):
    """cruzes de cura (+) que sobem girando de leve e some no fim"""
    for i in range(n):
        a0 = random.uniform(0, 6.28); rr = random.uniform(0.15, raio); ff = f0 + (random.randint(0, f_ate - f0) if f_ate else random.randint(0, 8)); dur = random.randint(*vida)
        o = para_obj(col, "%s%d" % (nome, i), bm_cruz(random.uniform(*tam), 0.035), mat); h = random.uniform(.5, 1.0) * alt
        for f in list(range(ff, ff + dur, 3)) + [ff + dur]:
            t = (f - ff) / dur; ang = a0 + t * 1.6
            o.location = (centro[0] + math.cos(ang) * rr * (1 + espalha * t), centro[1] + math.sin(ang) * rr * (1 + espalha * t), centro[2] + 0.2 + h * t)
            o.rotation_euler = (0, 0, ang + 1.57); o.scale = (max(math.sin(min(1.0, t) * math.pi) ** 0.5, 1e-4),) * 3
            o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=ff - 1)
def particulas_losango(col, nome, centro, f0, n, mat, alt=2.2, raio=0.9, vida=(30, 46), tam=(.05, .09), f_ate=None):
    for i in range(n):
        a0 = random.uniform(0, 6.28); rr = random.uniform(.2, raio); ff = f0 + (random.randint(0, f_ate - f0) if f_ate else random.randint(0, 8)); dur = random.randint(*vida)
        o = para_obj(col, "%s%d" % (nome, i), bm_octaedro(random.uniform(*tam), 1.5), mat); h = random.uniform(.5, 1.0) * alt
        for f in list(range(ff, ff + dur, 3)) + [ff + dur]:
            t = (f - ff) / dur; ang = a0 + t * 2.4
            o.location = (centro[0] + math.cos(ang) * rr, centro[1] + math.sin(ang) * rr, centro[2] + 0.1 + h * t); o.scale = (max(math.sin(min(1.0, t) * math.pi), 1e-4),) * 3
            o.keyframe_insert("location", frame=f); o.keyframe_insert("scale", frame=f)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=ff - 1)
def estrela_impacto(col, nome, pos, f, n, L, mat, r=0.2, dur=14):
    """espinhos de luz que abrem em estrela no impacto"""
    for i in range(n):
        v = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-.2, 1.0))).normalized(); Ls = random.uniform(.6, 1.0) * L
        o = para_obj(col, "%s%d" % (nome, i), bm_cone(r, 0.0, Ls, 4), mat); o.location = tuple(pos); apunta(o, v)
        esc(o, [(f - 1, 0.0), (f, 0.3), (f + 2, 1.0), (f + dur * 0.5, 0.55), (f + dur, 0.0)])
def cacos(col, nome, pos, f, n, mat, tam=0.28, vel=5.0, g=9.8, dur=(26, 36)):
    for k in range(n):
        a = k * 2 * math.pi / n + random.uniform(-.2, .2); o = para_obj(col, "%s%d" % (nome, k), bm_lascas(tam, 3), mat); wx, wy, wz = [random.uniform(-9, 9) for _ in range(3)]; vida = random.randint(*dur)
        for ff in list(range(f, f + vida, 3)) + [f + vida]:
            s_ = (ff - f) / FPS; o.location = (pos[0] + math.cos(a) * vel * s_, pos[1] + math.sin(a) * vel * s_ * 0.8, max(0.05, pos[2] + 1.8 * s_ - g * s_ * s_ / 2))
            o.rotation_euler = (wx * s_, wy * s_, wz * s_); o.scale = ((1,) * 3 if ff < f + vida else (1e-4,) * 3)
            o.keyframe_insert("location", frame=ff); o.keyframe_insert("rotation_euler", frame=ff); o.keyframe_insert("scale", frame=ff)
        o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=f - 1)
def onda_hex(col, nome, centro, f, R, mat, dur=20, larg=0.14, n=6, z=0.04):
    """anel de choque hexagonal no chao: cresce e some (poligono de linhas retas)"""
    o = para_obj(col, nome, bm_linhas(poligono(1.0, n), larg / R), mat); o.location = (centro[0], centro[1], z)
    esc(o, [(f - 1, (1e-3, 1e-3, 1e-3)), (f, (0.25 * R, 0.25 * R, 1)), (f + dur, (R, R, 1)), (f + dur + 1, (1e-3, 1e-3, 1e-3))]); return o
def feixe_reto(col, nome, a, b, f0, f1, mat, larg=0.07, lados=4, sai=6):
    """fio de luz de a ate b: nasce em a, cresce ate b, some de tras para frente"""
    a, b = Vector(a), Vector(b); L = (b - a).length; o = para_obj(col, nome, bm_coluna(larg, larg * 0.6, L, lados), mat); o.location = tuple(a); apunta(o, b - a)
    esc(o, [(f0 - 1, (1, 1, 1e-3)), (f0 + 6, (1, 1, 0.55)), (f0 + 10, (1, 1, 1.0)), (f1 - sai, (1, 1, 1.0)), (f1, (1e-3, 1e-3, 1.0))]); return o
def cena_final(sc, ref, c1, cams):
    sc.camera = c1; return sc

# ================================================================== 0. ATAQUE BASICO: LAMINA DE LUZ
def montar_basico():
    random.seed(7); F_FIM = 76
    sc, col, ref = base_cena("BASICO", F_FIM)
    ali = caixa(ref, "aliado_ref", (0.7, 5.6, 0.9), (0.6, 0.4, 1.8), M["ref_a"]); ini = caixa(ref, "inimigo_ref", (0, 12.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, F_FIM - 6)
    raiz = bpy.data.objects.new("lamina_raiz", None); col.objects.link(raiz); apunta(raiz, (0, 1, 0)); raiz.rotation_euler = (math.pi / 2, 0, 0)
    corpo = para_obj(col, "lamina_corpo", bm_cristal(1.45, 0.13, 4, 0.22), M["ouro_vidro"]); corpo.parent = raiz
    miolo = para_obj(col, "lamina_miolo", bm_cristal(1.0, 0.055, 4, 0.2), M["branco"]); miolo.parent = raiz; miolo.location = (0, 0, 0.15)
    for k in range(3):
        rst = para_obj(col, "lamina_rastro%d" % k, bm_lamina(2.6 - k * 0.5, 0.30 - k * 0.07), M["rastro"]); rst.parent = raiz; rst.location = (0, 0, -0.1); rst.rotation_euler = (math.pi, 0, k * math.pi / 3)
    F0, F1 = 10, 46; Y0, Y1 = 1.2, 12.0
    raiz.location = (0, Y0, 1.25); raiz.keyframe_insert("location", frame=F0)
    raiz.location = (0, Y1 - 0.5, 1.25); raiz.keyframe_insert("location", frame=F1)
    esc(raiz, [(F0 - 1, 0.0), (F0 + 3, 1.0), (F1 - 1, 1.0), (F1, 0.0)])
    luz_ = luz(col, "lamina_luz", "POINT", (0, 0.2, 0), 0, (1.0, 0.85, 0.45)); luz_.parent = raiz; pisca(luz_, [(F0 - 1, 0), (F0 + 3, 400), (F1 - 1, 400), (F1, 0)])
    # o aliado no caminho recebe cura leve (cruzes pequenas e verdes) quando a lamina atravessa, em torno do quadro 26
    FA = F0 + int((5.6 - Y0) / (Y1 - Y0) * (F1 - F0)); particulas_cruz(col, "cura_leve", (0.7, 5.6, 0.0), FA, 7, M["verde"], 2.2, 0.6, (30, 44), (.16, .24))
    estrela_impacto(col, "ali_lamp", (0.7, 5.6, 1.2), FA, 5, 0.9, M["verde"], 0.07, 10)
    cura_l = luz(col, "cura_luz", "POINT", (0.7, 5.6, 1.4), 0, VERDE); pisca(cura_l, [(FA - 1, 0), (FA + 3, 500), (FA + 22, 0)])
    # impacto no inimigo: flash, estrela de 8 espinhos de luz, cacos dourados e marca de losango no chao
    estrela_impacto(col, "hit_esp", (0, 12.0, 1.3), F1, 8, 1.5, M["branco"], 0.17, 14)
    cacos(col, "hit_caco", (0, 12.0, 1.3), F1, 7, M["ouro_vidro"], 0.20, 4.0)
    mc = para_obj(col, "hit_marca", bm_linhas(segs_glifo(1.3, "losango"), 0.06), M["marca"]); mc.location = (0, 12.0, 0.01)
    esc(mc, [(F1 - 1, 0.0), (F1, 0.5), (F1 + 4, 1.0), (F1 + 14, 1.0), (F1 + 24, 0.0)])
    fl = luz(col, "hit_flash", "POINT", (0, 11.2, 1.8), 0, (1.0, 0.85, 0.5)); pisca(fl, [(F1 - 1, 0), (F1, 3200), (F1 + 5, 1600), (F1 + 16, 0)])
    camera(sc, ref, "cam_lateral", (11.0, 6.0, 2.6), (0, 6.0, 1.5), 32); camera(sc, ref, "cam_alvo", (5.0, 9.0, 2.2), (0, 12.0, 1.4), 32); sc.camera = camera(sc, ref, "cam_do_clerigo", (3.0, -2.5, 1.8), (0, 4.0, 1.3), 32)
    return sc

# ================================================================== 1. CURA MIRADA (nivel 1): projetil de luz que cura aliado e fere inimigo
def projetil_cura(col, nome, f0, voo, p0, p1, z=1.3):
    p0 = Vector((p0[0], p0[1], 0.0)); p1 = Vector((p1[0], p1[1], 0.0)); d = p1 - p0
    raiz = bpy.data.objects.new(nome, None); col.objects.link(raiz); raiz.rotation_euler = (math.pi / 2, 0, math.atan2(d.y, d.x) - math.pi / 2)   # +Z do filho aponta para frente
    ext = para_obj(col, nome + "_cristal", bm_cristal(2.0, 0.30, 6, 0.24), M["verde_vidro"]); ext.parent = raiz
    nuc = para_obj(col, nome + "_nucleo", bm_cristal(1.25, 0.12, 6, 0.2), M["branco"]); nuc.parent = raiz; nuc.location = (0, 0, 0.18)
    for k in range(3):
        r = para_obj(col, nome + "_rastro%d" % k, bm_lamina(3.4 - k * 0.7, 0.34 - k * 0.08), M["rastro_v"]); r.parent = raiz; r.location = (0, 0, -0.05); r.rotation_euler = (math.pi, 0, k * math.pi / 3)
    for k in range(4):                                                         # 4 estilhacos de ouro presos ao corpo, orbitando devagar
        s = para_obj(col, nome + "_est%d" % k, bm_cristal(0.5, 0.05, 4, 0.3), M["ouro_vidro"]); s.parent = raiz; a = k * math.pi / 2; s.location = (math.cos(a) * 0.36, math.sin(a) * 0.36, 0.8); s.rotation_euler = (math.cos(a) * 0.5, math.sin(a) * 0.5, 0)
        anim(s, "location", f0, f0 + voo, lambda t, a=a: (math.cos(a + t * 5) * 0.36, math.sin(a + t * 5) * 0.36, 0.8 + 0.5 * math.sin(t * 9 + a)), 4)
    raiz.location = (p0.x, p0.y, z); raiz.keyframe_insert("location", frame=f0)
    raiz.location = (p1.x, p1.y, z); raiz.keyframe_insert("location", frame=f0 + voo)
    esc(raiz, [(f0 - 1, 0.0), (f0 + 4, 1.0), (f0 + voo - 1, 1.0), (f0 + voo, 0.0)])
    l = luz(col, nome + "_luz", "POINT", (0, 0.2, 0), 0, (0.6, 1.0, 0.65)); l.parent = raiz; pisca(l, [(f0 - 1, 0), (f0 + 4, 700), (f0 + voo - 1, 700), (f0 + voo, 0)])
    return raiz
def cura_burst(col, nome, pos, f):
    """cura no aliado: pilar de luz verde-dourado sobe do chao, cruzes sobem, hexagono de choque e luz verde"""
    x, y = pos[0], pos[1]
    pil = para_obj(col, nome + "_pilar", bm_coluna(0.80, 0.55, 4.4, 6), M["feixe_v"]); pil.location = (x, y, 0)
    esc(pil, [(f - 1, (1, 1, 1e-3)), (f + 3, (1.15, 1.15, 0.55)), (f + 8, (1, 1, 1.0)), (f + 46, (1, 1, 1.0)), (f + 62, (0.4, 0.4, 0.9)), (f + 63, (1e-3,) * 3)])
    anim(pil, "rotation_euler", f, f + 62, lambda t: (0, 0, t * math.radians(160)), 6)
    pil2 = para_obj(col, nome + "_pilar2", bm_coluna(0.42, 0.28, 4.0, 6), M["feixe_o2"]); pil2.location = (x, y, 0)
    esc(pil2, [(f - 1, (1, 1, 1e-3)), (f + 4, (1.1, 1.1, 0.6)), (f + 9, (1, 1, 1.0)), (f + 40, (1, 1, 1.0)), (f + 56, (0.3, 0.3, 0.9)), (f + 57, (1e-3,) * 3)])
    particulas_cruz(col, nome + "_cruz", (x, y, 0), f + 2, 12, M["verde"], 3.0, 0.9, (36, 56), (.16, .26), 0.25, f + 24)
    particulas_losango(col, nome + "_mote", (x, y, 0), f + 1, 14, M["ouro"], 2.8, 1.0, (30, 48), (.04, .08), f + 24)
    onda_hex(col, nome + "_onda", (x, y), f, 3.2, M["marca_v"], 22); onda_hex(col, nome + "_onda2", (x, y), f + 8, 2.2, M["marca"], 20, 0.10)
    mc = para_obj(col, nome + "_marca", bm_linhas(segs_glifo(1.5, "hex"), 0.05), M["marca_v"]); mc.location = (x, y, 0.02)
    esc(mc, [(f - 1, 0.0), (f + 3, 1.0), (f + 36, 1.0), (f + 50, 0.0)]); anim(mc, "rotation_euler", f, f + 50, lambda t: (0, 0, t * math.radians(80)), 6)
    l = luz(col, nome + "_brilho", "POINT", (x, y, 1.6), 0, VERDE); pisca(l, [(f - 1, 0), (f + 2, 5500), (f + 18, 2400), (f + 50, 0)])
def dano_burst(col, nome, pos, f):
    """dano no inimigo: estrela de luz branca, cacos dourados, marca de losango, flash"""
    x, y = pos[0], pos[1]
    estrela_impacto(col, nome + "_esp", (x, y, 1.3), f, 9, 2.0, M["branco"], 0.2, 16); estrela_impacto(col, nome + "_esp2", (x, y, 1.3), f, 5, 1.2, M["ouro"], 0.14, 20)
    cacos(col, nome + "_caco", (x, y, 1.3), f, 8, M["ouro_vidro"], 0.26, 4.6); onda_hex(col, nome + "_onda", (x, y), f, 3.0, M["marca"], 18)
    mc = para_obj(col, nome + "_marca", bm_linhas(segs_glifo(1.6, "losango"), 0.06), M["marca"]); mc.location = (x, y, 0.02)
    esc(mc, [(f - 1, 0.0), (f, 0.5), (f + 4, 1.0), (f + 16, 1.0), (f + 28, 0.0)])
    fl = luz(col, nome + "_flash", "POINT", (x, y, 1.8), 0, (1.0, 0.85, 0.5)); pisca(fl, [(f - 1, 0), (f, 4500), (f + 5, 2200), (f + 20, 0)])
def montar_cura():
    random.seed(11); F_FIM = 216
    sc, col, ref = base_cena("S1_CURA", F_FIM)
    ali = caixa(ref, "aliado_ref_1.8m", (-3.6, 10.5, 0.9), (0.6, 0.4, 1.8), M["ref_a"]); ini = caixa(ref, "inimigo_ref_1.8m", (4.2, 10.5, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, F_FIM - 8)
    # ---- no conjurador: losango de ouro nos pes + 6 estilhacos de luz soltando do livro (so efeito leve)
    mc = para_obj(col, "cj_marca", bm_linhas(segs_glifo(0.95, "losango"), 0.06), M["marca"]); mc.location = (0, 0, 0.03)
    esc(mc, [(1, 0.0), (8, 1.0), (30, 1.0), (40, 0.0), (90, 0.0), (98, 1.0), (118, 1.0), (128, 0.0)]); anim(mc, "rotation_euler", 1, 128, lambda t: (0, 0, t * math.radians(90)), 6)
    particulas_losango(col, "cj_mote", (0.0, 0.0, 0.0), 6, 10, M["ouro"], 2.0, 0.8, (30, 44), (.04, .07), 110)
    # ---- tiro 1: aliado (cura)
    projetil_cura(col, "proj1", 16, 52, (0.5, 0.8), (-3.6, 10.5)); cura_burst(col, "ali", (-3.6, 10.5), 68)
    # ---- tiro 2: inimigo (dano), mesmo projetil
    projetil_cura(col, "proj2", 112, 52, (0.5, 0.8), (4.2, 10.5)); dano_burst(col, "ini", (4.2, 10.5), 164)
    camera(sc, ref, "cam_lateral", (14.0, 4.0, 3.6), (0, 6.5, 1.8), 30); camera(sc, ref, "cam_alvos", (0.6, -2.5, 4.6), (0, 10.5, 1.8), 30); sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.4, 2.0), (-0.4, 4.0, 1.2), 32)
    return sc

# ================================================================== 2. GLIFO DE CURA (nivel 5): zona no chao que cura em pulsos
def montar_glifo():
    random.seed(21); F_FIM = 224; C = (0.0, 9.0)
    sc, col, ref = base_cena("S2_GLIFO", F_FIM)
    aliados = [(-1.6, 8.0), (1.5, 10.0), (0.3, 7.4)]
    for i, (x, y) in enumerate(aliados): caixa(ref, "aliado_ref_%d" % i, (x, y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_fora_ref", (7.2, 9.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, 30)
    mc = para_obj(col, "cj_marca", bm_linhas(segs_glifo(0.95, "losango"), 0.06), M["marca"]); mc.location = (0, 0, 0.03); esc(mc, [(1, 0.0), (8, 1.0), (24, 1.0), (32, 0.0)])
    F0 = 16; F_PULSOS = [44, 92, 140, 188]; F_SAI = 206
    gl = para_obj(col, "glifo", bm_linhas(segs_glifo(3.3, "hex"), 0.10), M["marca_v"]); gl.location = (C[0], C[1], 0.025)
    esc(gl, [(F0 - 1, 0.0), (F0 + 12, 1.0), (F_SAI, 1.0), (F_SAI + 12, 0.0)]); anim(gl, "rotation_euler", F0, F_SAI + 12, lambda t: (0, 0, t * math.radians(90)), 6)
    ex = para_obj(col, "glifo_borda", bm_linhas(poligono(3.55, 6, 0.0, 0.02), 0.22), M["marca"]); ex.location = (C[0], C[1], 0.0)
    esc(ex, [(F0 - 1, 0.0), (F0 + 12, 1.0), (F_SAI, 1.0), (F_SAI + 12, 0.0)])
    fill = para_obj(col, "glifo_brilho", bm_estrela_fill(3.3), M["marca_v"]); fill.location = (C[0], C[1], 0.012)
    esc(fill, [(F0 - 1, 0.0), (F0 + 12, 0.7), (F_SAI, 0.7), (F_SAI + 12, 0.0)])
    for k in range(6):                                                         # 6 pilares finos nos cantos do hexagono: luz que sobe
        a = k * math.pi / 3; p = para_obj(col, "pilar%d" % k, bm_coluna(0.14, 0.03, 3.4, 4), M["pilar"]); p.location = (C[0] + math.cos(a) * 3.3, C[1] + math.sin(a) * 3.3, 0)
        esc(p, [(F0 + 4 + k, (1, 1, 1e-3)), (F0 + 18 + k, (1, 1, 1.0)), (F_SAI, (1, 1, 1.0)), (F_SAI + 12, (1, 1, 1e-3))])
    particulas_cruz(col, "amb_cruz", (C[0], C[1], 0), F0 + 10, 26, M["verde"], 3.0, 3.0, (44, 70), (.15, .24), 0.0, F_SAI - 40)
    particulas_losango(col, "amb_mote", (C[0], C[1], 0), F0 + 8, 24, M["ouro"], 3.2, 3.0, (36, 60), (.04, .08), F_SAI - 40)
    for n, fp in enumerate(F_PULSOS):                                          # cada pulso de cura: hexagono de choque + flash verde no chao + cruzes em cada aliado
        onda_hex(col, "pulso%d" % n, C, fp, 3.5, M["marca_v"], 22, 0.2)
        fl = para_obj(col, "pulso_chao%d" % n, bm_estrela_fill(3.3), M["verde"]); fl.location = (C[0], C[1], 0.035); esc(fl, [(fp - 1, 0.0), (fp + 2, 1.0), (fp + 14, 0.0)])
        lz = luz(col, "pulso_luz%d" % n, "POINT", (C[0], C[1], 1.8), 0, VERDE); pisca(lz, [(fp - 1, 0), (fp + 2, 4500), (fp + 18, 0)])
        for j, (x, y) in enumerate(aliados):
            particulas_cruz(col, "p%d_a%d" % (n, j), (x, y, 0), fp + 2 + j * 2, 4, M["verde"], 2.4, 0.5, (26, 38), (.12, .2))
            pb = para_obj(col, "p%d_pil%d" % (n, j), bm_coluna(0.5, 0.32, 3.0, 6), M["feixe_v"]); pb.location = (x, y, 0); esc(pb, [(fp + 1 + j * 2, (1, 1, 1e-3)), (fp + 5 + j * 2, (1, 1, 1.0)), (fp + 16 + j * 2, (1, 1, 1.0)), (fp + 24 + j * 2, (0.4, 0.4, 1e-3))])
    camera(sc, ref, "cam_alto", (9.0, 0.5, 10.5), (0, 8.8, 0.8), 30); camera(sc, ref, "cam_lateral", (11.0, 3.0, 3.0), (0, 9.0, 1.6), 30); sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.2, 2.2), (0, 7.5, 1.0), 30)
    return sc
def bm_estrela_fill(R):
    """preenchimento fraco do glifo: hexagono cheio com centro claro (uv y: 1 no centro, 0 na borda)"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); c = bm.verts.new((0, 0, 0)); ps = [bm.verts.new((R * math.cos(i * math.pi / 3), R * math.sin(i * math.pi / 3), 0)) for i in range(6)]
    for i in range(6):
        f = bm.faces.new((c, ps[i], ps[(i + 1) % 6]))
        for lp in f.loops: lp[uvl].uv = (0.5, 1 - min(1.0, lp.vert.co.length / R) * 0.9)
    return bm

# ================================================================== 3. ESCUDO ASTRAL (nivel 10): placas de luz em volta do aliado, absorvem golpes
def montar_escudo():
    random.seed(33); F_FIM = 176; A = Vector((0.0, 8.0, 0.0))
    sc, col, ref = base_cena("S3_ESCUDO", F_FIM)
    ali = caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.9), (0.6, 0.4, 1.8), M["ref_a"]); ini = caixa(ref, "inimigo_ref_1.8m", (7.0, 8.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, 36)
    feixe_reto(col, "fio", (0.45, 0.3, 1.3), (A.x, A.y - 0.2, 1.2), 8, 34, M["rastro"], 0.06)                            # fio de luz do livro ao aliado
    mc = para_obj(col, "cj_marca", bm_linhas(segs_glifo(0.95, "losango"), 0.06), M["marca_a"]); mc.location = (0, 0, 0.03); esc(mc, [(1, 0.0), (8, 1.0), (28, 1.0), (36, 0.0)])
    marca = para_obj(col, "ali_marca", bm_linhas(segs_glifo(1.5, "losango"), 0.07), M["marca_a"]); marca.location = (A.x, A.y, 0.03)
    esc(marca, [(20, 0.0), (30, 1.0), (140, 1.0), (152, 0.0)]); anim(marca, "rotation_euler", 20, 152, lambda t: (0, 0, t * math.radians(-120)), 6)
    N = 8; R = 1.05; placas = []
    for i in range(N):                                                         # 8 placas (hexagonos altos) em octogono em volta do aliado, de frente para fora
        a = i * 2 * math.pi / N; alt = 1.0 + (i % 2) * 0.35
        p = para_obj(col, "placa%d" % i, bm_placa(0.78, 1.55 * alt, 0.045), M["azul_vidro"] if i % 2 else M["ouro_vidro"])
        pos = (A.x + math.cos(a) * R, A.y + math.sin(a) * R, 1.0 + (i % 2) * 0.12); p.rotation_euler = (0, 0, a - math.pi / 2)
        f0 = 22 + i * 2
        for f, k in ((f0 - 1, 3.0), (f0 + 12, 1.0)):                           # chegam de longe, de fora para dentro
            p.location = (A.x + math.cos(a) * R * k, A.y + math.sin(a) * R * k, pos[2] + (1.6 if k > 1.5 else 0)); p.keyframe_insert("location", frame=f)
        esc(p, [(f0 - 2, 0.0), (f0 - 1, 0.2), (f0 + 12, 1.0)]); placas.append((p, a, pos))
        for f in range(f0 + 14, 150, 8):                                       # flutuam de leve
            p.location = (pos[0], pos[1], pos[2] + 0.07 * math.sin((f + i * 5) * 0.2)); p.keyframe_insert("location", frame=f)
    lz = luz(col, "escudo_luz", "POINT", (A.x, A.y, 1.3), 0, (0.7, 0.9, 1.0)); pisca(lz, [(21, 0), (36, 700), (140, 700), (152, 0)])
    # golpes: lanca laranja do inimigo bate na placa mais proxima, a placa quebra em cacos e a luz absorve
    def golpe(f_ini, voo, placa_i):
        p, a, pos = placas[placa_i]; ini_p = Vector((7.0, 8.0, 1.3)); fim_p = Vector(pos); lan = para_obj(col, "lanca%d" % placa_i, bm_cristal(1.5, 0.12, 4, 0.2), M["lanca_m"]); lan.location = tuple(ini_p); apunta(lan, fim_p - ini_p)
        lan.location = tuple(ini_p); lan.keyframe_insert("location", frame=f_ini); lan.location = tuple(fim_p); lan.keyframe_insert("location", frame=f_ini + voo); esc(lan, [(f_ini - 1, 0.0), (f_ini, 1.0), (f_ini + voo - 1, 1.0), (f_ini + voo, 0.0)])
        fh = f_ini + voo; estrela_impacto(col, "abs%d_esp" % placa_i, fim_p, fh, 8, 1.4, M["branco"], 0.14, 12); estrela_impacto(col, "abs%d_esp2" % placa_i, fim_p, fh, 4, 0.9, M["azul_vidro"], 0.10, 14)
        cacos(col, "abs%d_caco" % placa_i, tuple(fim_p), fh, 7, M["azul_vidro"] if placa_i % 2 else M["ouro_vidro"], 0.22, 3.4)
        for f, k in ((fh - 1, 1.0), (fh, 1.25), (fh + 2, 0.0)): esc(p, [(f, k)])                         # a placa estala e some
        o = onda_hex(col, "abs%d_onda" % placa_i, (A.x, A.y), fh, 1.9, M["marca_a"], 14, 0.10, 8, 0.05)
        fl = luz(col, "abs%d_flash" % placa_i, "POINT", tuple(fim_p), 0, (0.8, 0.95, 1.0)); pisca(fl, [(fh - 1, 0), (fh, 3000), (fh + 8, 0)])
    golpe(66, 12, 0); golpe(100, 12, 6)
    # fim: as placas que sobraram se partem e sobem como luz
    for i in (1, 2, 3, 4, 5, 7):
        p, a, pos = placas[i]; esc(p, [(142 + i, 1.0), (146 + i, 1.1), (152 + i, 0.0)]); cacos(col, "fim%d_caco" % i, pos, 146 + i, 3, M["azul_vidro"] if i % 2 else M["ouro_vidro"], 0.18, 1.6, 2.0)
    particulas_losango(col, "fim_mote", (A.x, A.y, 0.0), 144, 14, M["branco"], 2.4, 1.0, (30, 44), (.04, .08))
    camera(sc, ref, "cam_lateral", (11.0, 2.0, 3.0), (0, 6.0, 1.4), 30); camera(sc, ref, "cam_aliado", (4.2, 4.2, 2.4), (0, 8.0, 1.2), 32); sc.camera = camera(sc, ref, "cam_do_clerigo", (3.2, -3.0, 2.0), (0.2, 5.5, 1.2), 32)
    return sc

# ================================================================== 4. PURIFICACAO (nivel 20): remove stun/paralisia e da imunidade curta
def montar_purifica():
    random.seed(44); F_FIM = 168; A = Vector((0.0, 8.0, 0.0))
    sc, col, ref = base_cena("S4_PURIFICA", F_FIM)
    ali = caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.9), (0.6, 0.4, 1.8), M["ref_a"]); livro(col, (0.55, 0.3, 1.25), 2, 40)
    # espinhos de paralisia no corpo do aliado (os do Espinho Paralisante do mago): estao la desde o inicio e se desfazem na purificacao
    esp = []
    for i in range(16):
        a = random.uniform(0, 6.28); z = random.uniform(.2, 1.7); v = Vector((math.cos(a) * 0.9, math.sin(a) * 0.9, random.uniform(-.3, .5))).normalized(); L = random.uniform(.5, 1.0)
        o = para_obj(col, "espinho%d" % i, bm_cone(0.09, 0.0, L, 4), M["osso"]); o.location = (A.x + math.cos(a) * 0.3, A.y + math.sin(a) * 0.3, z); apunta(o, v); esp.append((o, a, z, v, L))
    # lanca de luz do livro ao aliado, no quadro 14
    feixe_reto(col, "fio", (0.45, 0.3, 1.3), (A.x, A.y - 0.2, 1.3), 8, 34, M["rastro"], 0.07)
    FI = 30                                                                    # impacto: tudo estoura
    for o, a, z, v, L in esp:
        o.scale = (1, 1, 1); o.keyframe_insert("scale", frame=FI - 1); o.scale = (1.25, 1.25, 1.25); o.keyframe_insert("scale", frame=FI + 1); o.scale = (1e-4,) * 3; o.keyframe_insert("scale", frame=FI + 4)
    cacos(col, "poeira", (A.x, A.y, 1.1), FI, 14, M["osso"], 0.12, 3.2, 3.0, (24, 34))
    pil = para_obj(col, "pilar", bm_coluna(0.95, 0.75, 3.4, 6), M["feixe_b"]); pil.location = (A.x, A.y, 0)
    esc(pil, [(FI - 1, (1, 1, 1e-3)), (FI + 2, (1.25, 1.25, 0.7)), (FI + 7, (1, 1, 1.0)), (FI + 18, (1, 1, 1.0)), (FI + 30, (0.45, 0.45, 0.9)), (FI + 31, (1e-3,) * 3)])
    anim(pil, "rotation_euler", FI, FI + 31, lambda t: (0, 0, t * math.radians(120)), 6)
    onda_hex(col, "onda1", (A.x, A.y), FI, 5.0, M["marca"], 20, 0.24); onda_hex(col, "onda2", (A.x, A.y), FI + 4, 3.6, M["marca_a"], 22, 0.16); onda_hex(col, "onda3", (A.x, A.y), FI + 9, 2.4, M["marca"], 20, 0.12)
    estrela_impacto(col, "estrela", (A.x, A.y, 1.1), FI, 12, 2.2, M["branco"], 0.18, 16)
    fl = luz(col, "flash", "POINT", (A.x, A.y, 1.7), 0, (1.0, 0.95, 0.75)); pisca(fl, [(FI - 1, 0), (FI, 7000), (FI + 6, 3000), (FI + 24, 0)])
    # imunidade: bainha fina de luz (prisma translucido) em volta dele + losango flutuando acima da cabeca, ate o quadro 134
    ba = para_obj(col, "imune_bainha", bm_coluna(0.95, 0.85, 2.3, 6), M["feixe_o"]); ba.location = (A.x, A.y, 0)
    esc(ba, [(FI + 4, (1, 1, 1e-3)), (FI + 14, (1, 1, 1.0)), (122, (1, 1, 1.0)), (136, (0.9, 0.9, 0.3)), (137, (1e-3,) * 3)]); anim(ba, "rotation_euler", FI + 4, 137, lambda t: (0, 0, t * math.radians(-140)), 6)
    mc = para_obj(col, "imune_marca", bm_linhas(segs_glifo(1.3, "losango"), 0.06), M["marca"]); mc.location = (A.x, A.y, 0.03)
    esc(mc, [(FI + 4, 0.0), (FI + 14, 1.0), (122, 1.0), (136, 0.0)]); anim(mc, "rotation_euler", FI + 4, 136, lambda t: (0, 0, t * math.radians(100)), 6)
    ic = para_obj(col, "imune_icone", bm_octaedro(0.18, 1.5), M["ouro_vidro"]); ic.location = (A.x, A.y, 2.7); esc(ic, [(FI + 10, 0.0), (FI + 18, 1.0), (122, 1.0), (136, 0.0)]); anim(ic, "rotation_euler", FI + 10, 136, lambda t: (0, 0, t * math.radians(360)), 6)
    particulas_losango(col, "imune_mote", (A.x, A.y, 0.0), FI + 6, 14, M["branco"], 2.4, 0.9, (30, 44), (.04, .08), 110)
    # fim da imunidade: os cacos de luz sobem
    camera(sc, ref, "cam_lateral", (9.0, 5.0, 2.8), (0, 8.0, 1.3), 30); camera(sc, ref, "cam_aliado", (3.8, 4.8, 2.4), (0, 8.0, 1.2), 34); sc.camera = camera(sc, ref, "cam_do_clerigo", (3.2, -3.0, 2.0), (0.2, 5.5, 1.2), 32)
    return sc

# ================================================================== 5. PRECE (nivel 25): buff de grupo
def montar_prece():
    random.seed(55); F_FIM = 200; F_G = 12; F_SAI = 170
    sc, col, ref = base_cena("S5_PRECE", F_FIM)
    aliados = [(-3.6, 3.4), (3.6, 3.2), (0.2, -4.2), (-3.0, -2.8)]
    for i, (x, y) in enumerate(aliados): caixa(ref, "aliado_ref_%d" % i, (x, y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 56)
    gl = para_obj(col, "glifo", bm_linhas(segs_glifo(5.2, "octa"), 0.12), M["marca"]); gl.location = (0, 0, 0.025)
    esc(gl, [(F_G - 1, 0.0), (F_G + 14, 1.0), (F_SAI, 1.0), (F_SAI + 14, 0.0)]); anim(gl, "rotation_euler", F_G, F_SAI + 14, lambda t: (0, 0, t * math.radians(70)), 6)
    gl2 = para_obj(col, "glifo_int", bm_linhas(segs_glifo(2.2, "hex"), 0.08), M["marca_v"]); gl2.location = (0, 0, 0.03)
    esc(gl2, [(F_G, 0.0), (F_G + 14, 1.0), (F_SAI, 1.0), (F_SAI + 14, 0.0)]); anim(gl2, "rotation_euler", F_G, F_SAI + 14, lambda t: (0, 0, t * math.radians(-110)), 6)
    for k in range(8):                                                         # 8 raios de luz no chao saindo do conjurador (sol baixo)
        a = k * math.pi / 4
        b = para_obj(col, "raio%d" % k, bm_lamina(5.4, 0.7), M["rastro"]); b.location = (0, 0, 0.05)        # lamina cresce em +Z: deita (gira 90 em Y -> aponta +X) e gira em Z para a direcao
        b.rotation_mode = "QUATERNION"; b.rotation_quaternion = (Matrix.Rotation(a, 3, "Z") @ Matrix.Rotation(math.pi / 2, 3, "Y")).to_quaternion()
        esc(b, [(F_G + 4, 0.0), (F_G + 20, 1.0), (F_SAI - 6, 1.0), (F_SAI + 10, 0.0)])
    for i, (x, y) in enumerate(aliados):                                       # sobre cada aliado: feixe do ceu, setas de buff subindo, losango de status sobre a cabeca
        fb = F_G + 24 + i * 5
        fx = para_obj(col, "feixe%d" % i, bm_coluna(0.85, 0.7, 9.0, 6), M["feixe_o"]); fx.location = (x, y, 0)
        esc(fx, [(fb - 1, (1, 1, 1e-3)), (fb + 5, (1.1, 1.1, 1.0)), (fb + 10, (1, 1, 1.0)), (F_SAI - 20, (1, 1, 1.0)), (F_SAI - 4, (0.3, 0.3, 1.0)), (F_SAI - 3, (1e-3,) * 3)]); anim(fx, "rotation_euler", fb, F_SAI - 3, lambda t: (0, 0, t * math.radians(170)), 6)
        fi = para_obj(col, "feixe_int%d" % i, bm_coluna(0.38, 0.30, 8.0, 6), M["feixe_b"]); fi.location = (x, y, 0); esc(fi, [(fb - 1, (1, 1, 1e-3)), (fb + 4, (1, 1, 1.0)), (F_SAI - 20, (1, 1, 1.0)), (F_SAI - 4, (0.3, 0.3, 1.0)), (F_SAI - 3, (1e-3,) * 3)])
        for j in range(7):
            a0 = j * 2 * math.pi / 7 + i; ff = fb + 8 + j * 9; o = para_obj(col, "seta%d_%d" % (i, j), bm_seta(0.20, 0.04), M["ouro"])
            for rep in range(3):
                f0 = ff + rep * 40
                if f0 > F_SAI - 22: break
                for f in list(range(f0, f0 + 36, 3)) + [f0 + 36]:
                    t = (f - f0) / 36; ang = a0 + t * 1.2; o.location = (x + math.cos(ang) * 0.85, y + math.sin(ang) * 0.85, 0.1 + 2.7 * t); o.rotation_euler = (0, 0, ang + math.pi / 2); o.scale = (max(math.sin(t * math.pi), 1e-4),) * 3
                    o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f); o.keyframe_insert("scale", frame=f)
        ic = para_obj(col, "status%d" % i, bm_seta(0.28, 0.06), M["ouro_vidro"]); ic.location = (x, y, 2.6); esc(ic, [(fb + 6, 0.0), (fb + 14, 1.0), (F_SAI - 12, 1.0), (F_SAI - 2, 0.0)]); anim(ic, "rotation_euler", fb + 6, F_SAI, lambda t: (0, 0, t * math.radians(360)), 6)
        onda_hex(col, "onda%d" % i, (x, y), fb, 2.4, M["marca"], 18, 0.12); particulas_losango(col, "mote%d" % i, (x, y, 0.0), fb + 4, 8, M["branco"], 2.8, 0.8, (30, 44), (.04, .07), F_SAI - 60)
        lz = luz(col, "luz%d" % i, "POINT", (x, y, 1.8), 0, (1.0, 0.85, 0.5)); pisca(lz, [(fb - 1, 0), (fb + 6, 3200), (F_SAI - 20, 3200), (F_SAI - 4, 0)])
    camera(sc, ref, "cam_alto", (0.0, -12.0, 11.5), (0, 0.5, 0.8), 30); camera(sc, ref, "cam_lateral", (12.0, -5.5, 3.2), (0, 0.5, 1.6), 30); sc.camera = camera(sc, ref, "cam_do_clerigo", (2.2, -3.4, 2.0), (0.0, 3.0, 1.4), 28)
    return sc

# ================================================================== 6. RESSURREICAO (nivel 30): luz do ceu e asas de luz levantam o aliado caido
def montar_ressur():
    random.seed(66); F_FIM = 252; A = Vector((0.0, 8.0, 0.0)); F_CLIM = 100
    sc, col, ref = base_cena("S6_RESSUR", F_FIM)
    ali = caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.3), (0.6, 0.4, 1.8), M["ref_a"]); livro(col, (0.55, 0.3, 1.25), 2, 112)
    ali.rotation_euler = (math.pi / 2, 0, 0); ali.location = (A.x, A.y, 0.2); ali.keyframe_insert("location", frame=1); ali.keyframe_insert("rotation_euler", frame=1)
    for f, z, rot in ((F_CLIM - 12, 0.2, math.pi / 2), (F_CLIM + 14, 1.5, 0.45), (F_CLIM + 34, 1.0, 0.0), (F_CLIM + 46, 0.9, 0.0)):
        ali.location = (A.x, A.y, z); ali.rotation_euler = (rot, 0, 0); ali.keyframe_insert("location", frame=f); ali.keyframe_insert("rotation_euler", frame=f)
    mc = para_obj(col, "cj_marca", bm_linhas(segs_glifo(0.95, "losango"), 0.06), M["marca"]); mc.location = (0, 0, 0.03); esc(mc, [(1, 0.0), (8, 1.0), (100, 1.0), (112, 0.0)])
    feixe_reto(col, "fio", (0.45, 0.3, 1.3), (A.x, A.y - 0.4, 0.5), 8, F_CLIM + 8, M["rastro"], 0.06, 4, 10)                          # fio de luz da conjuracao (dura toda a canalizacao)
    # canalizacao: glifo grande no chao sob o aliado, linhas de luz convergem
    gl = para_obj(col, "glifo", bm_linhas(segs_glifo(3.8, "octa"), 0.12), M["marca"]); gl.location = (A.x, A.y, 0.025)
    esc(gl, [(14, 0.0), (36, 1.0), (F_CLIM + 70, 1.0), (F_CLIM + 90, 0.0)]); anim(gl, "rotation_euler", 14, F_CLIM + 90, lambda t: (0, 0, t * math.radians(120)), 6)
    gl2 = para_obj(col, "glifo_int", bm_linhas(segs_glifo(2.0, "hex"), 0.08), M["marca_v"]); gl2.location = (A.x, A.y, 0.03)
    esc(gl2, [(20, 0.0), (40, 1.0), (F_CLIM + 70, 1.0), (F_CLIM + 90, 0.0)]); anim(gl2, "rotation_euler", 20, F_CLIM + 90, lambda t: (0, 0, t * math.radians(-160)), 6)
    for k in range(6):                                                         # pilares nos cantos do hexagono, mais altos que os do glifo de cura
        a = k * math.pi / 3; p = para_obj(col, "pilar%d" % k, bm_coluna(0.16, 0.03, 4.2, 4), M["pilar"]); p.location = (A.x + math.cos(a) * 3.8, A.y + math.sin(a) * 3.8, 0)
        esc(p, [(30 + k * 3, (1, 1, 1e-3)), (50 + k * 3, (1, 1, 1.0)), (F_CLIM + 60, (1, 1, 1.0)), (F_CLIM + 78, (1, 1, 1e-3))])
    particulas_losango(col, "canal_mote", (A.x, A.y, 0.0), 30, 26, M["ouro"], 3.0, 3.4, (36, 56), (.05, .09), F_CLIM - 6)
    # luz do ceu: feixe largo desce em cima do corpo e pinta tudo de branco-dourado
    fx = para_obj(col, "feixe", bm_coluna(1.35, 1.15, 16.0, 6), M["feixe_o"]); fx.location = (A.x, A.y, 0)
    esc(fx, [(F_CLIM - 38, (1, 1, 1e-3)), (F_CLIM - 22, (1, 1, 0.5)), (F_CLIM - 8, (1.1, 1.1, 1.0)), (F_CLIM + 50, (1.1, 1.1, 1.0)), (F_CLIM + 66, (0.4, 0.4, 1.0)), (F_CLIM + 67, (1e-3,) * 3)])
    anim(fx, "rotation_euler", F_CLIM - 38, F_CLIM + 67, lambda t: (0, 0, t * math.radians(190)), 6)
    fi = para_obj(col, "feixe_int", bm_coluna(0.55, 0.45, 15.0, 6), M["feixe_b"]); fi.location = (A.x, A.y, 0)
    esc(fi, [(F_CLIM - 34, (1, 1, 1e-3)), (F_CLIM - 18, (1, 1, 1.0)), (F_CLIM + 44, (1, 1, 1.0)), (F_CLIM + 60, (0.3, 0.3, 1.0)), (F_CLIM + 61, (1e-3,) * 3)])
    # asas de luz: 3 laminas de cada lado abrem em leque atras do aliado quando ele se levanta
    for lado in (-1, 1):
        for k in range(4):
            L = 3.4 - k * 0.45; w = 0.95 - k * 0.12; b = para_obj(col, "asa%s%d" % ("e" if lado < 0 else "d", k), bm_lamina(L, w), M["feixe_b"] if k % 2 == 0 else M["feixe_o2"])
            b.location = (A.x + lado * 0.3, A.y + 0.45, 1.45 + k * 0.05); fecha = math.radians(78); abre = math.radians(30 + k * 24)
            for f, ang in ((F_CLIM + 6 + k * 2, fecha), (F_CLIM + 26 + k * 2, abre), (F_CLIM + 72, abre + math.radians(4)), (F_CLIM + 92, fecha)):
                b.rotation_euler = (math.radians(-12), lado * ang, math.radians(lado * 20)); b.keyframe_insert("rotation_euler", frame=f)
            esc(b, [(F_CLIM + 4 + k * 2, 0.0), (F_CLIM + 24 + k * 2, 1.0), (F_CLIM + 78, 1.0), (F_CLIM + 94, 0.0)])
    estrela_impacto(col, "clima", (A.x, A.y, 1.3), F_CLIM + 12, 16, 3.0, M["branco"], 0.22, 20); estrela_impacto(col, "clima2", (A.x, A.y, 1.3), F_CLIM + 12, 8, 1.8, M["ouro"], 0.16, 24)
    onda_hex(col, "onda1", (A.x, A.y), F_CLIM + 10, 7.0, M["marca"], 26, 0.28); onda_hex(col, "onda2", (A.x, A.y), F_CLIM + 15, 5.0, M["marca_v"], 26, 0.20); onda_hex(col, "onda3", (A.x, A.y), F_CLIM + 20, 3.4, M["marca"], 24, 0.14)
    particulas_cruz(col, "fim_cruz", (A.x, A.y, 0), F_CLIM + 14, 22, M["verde"], 4.0, 1.4, (40, 66), (.18, .30), 0.3, F_CLIM + 50)
    particulas_losango(col, "fim_mote", (A.x, A.y, 0), F_CLIM + 12, 22, M["ouro"], 4.0, 1.6, (36, 60), (.05, .09), F_CLIM + 50)
    fl = luz(col, "clima_flash", "POINT", (A.x, A.y, 2.0), 0, (1.0, 0.93, 0.7)); pisca(fl, [(F_CLIM - 30, 0), (F_CLIM - 6, 2500), (F_CLIM + 11, 3500), (F_CLIM + 12, 14000), (F_CLIM + 26, 5000), (F_CLIM + 70, 2500), (F_CLIM + 90, 0)])
    camera(sc, ref, "cam_lateral", (12.0, 4.0, 3.6), (0, 8.0, 2.2), 30); camera(sc, ref, "cam_aliado", (4.8, 3.8, 2.6), (0, 8.0, 1.6), 32); sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.2, 2.2), (0, 6.5, 1.8), 30)
    return sc

mats(); ref_mats()
cenas = [montar_basico(), montar_cura(), montar_glifo(), montar_escudo(), montar_purifica(), montar_prece(), montar_ressur()]
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
bpy.context.window.scene = cenas[1]
print("Clerigo pronto:", [(s.name, len(s.objects), s.frame_end) for s in cenas])
