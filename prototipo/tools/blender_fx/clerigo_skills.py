"""Clerigo (healer) - PREVIA das 7 skills no Blender: ataque basico + 6 skills por nivel (1/5/10/20/25/30).
Versao ESTILIZADA com liberdade geometrica completa (mandalas magicas, aneis circulares, toros orbitais,
obeliscos de cristal lapidados, cupulas translucidas e asas angelicais de luz divina).
Rodar ao vivo pelo MCP:  exec(compile(open(r"<este arquivo>", encoding="utf8").read(), "cl", "exec"))
Cria (ou refaz) as cenas CLERIGO_* no .blend aberto. 48 fps, Livro Astral aberto na mao esquerda.
Paleta sagrada: ouro, branco quente e verde esmeralda de cura, azul astral nas barreiras.
Cenas:
  CLERIGO_BASICO      Lamina de Luz (ataque basico)       CLERIGO_S1_CURA      Cura Mirada (nivel 1)
  CLERIGO_S2_GLIFO    Glifo de Cura (nivel 5)             CLERIGO_S3_ESCUDO    Escudo Astral (nivel 10)
  CLERIGO_S4_PURIFICA Purificacao (nivel 20)              CLERIGO_S5_PRECE     Prece (nivel 25)
  CLERIGO_S6_RESSUR   Ressurreicao (nivel 30)
"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

FPS = 48
GAIN = 0.55
PREFIXO = "CLERIGO_"
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"

def _vai(sc):
    if bpy.context.window:
        bpy.context.window.scene = sc

JANELA_ANTES = bpy.context.window.scene if bpy.context.window else None

# Limpeza seletiva das cenas do Clerigo
for s in [s for s in bpy.data.scenes if s.name.startswith(PREFIXO)]:
    for o in list(s.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections):
        if c.name.startswith(s.name):
            bpy.data.collections.remove(c)
    if bpy.context.window and bpy.context.window.scene is s:
        outra = next((x for x in bpy.data.scenes if not x.name.startswith(PREFIXO)), None)
        if outra:
            _vai(outra)
    bpy.data.scenes.remove(s)

for m in list(bpy.data.materials):
    if m.name.startswith("CL_"):
        bpy.data.materials.remove(m)
for me in list(bpy.data.meshes):
    if me.users == 0 and me.name.startswith("CL_"):
        bpy.data.meshes.remove(me)

def nova_cena(nome, fim):
    sc = bpy.data.scenes.new(nome)
    _vai(sc)
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = fim
    try:
        sc.render.engine = "BLENDER_EEVEE"
    except TypeError:
        pass
    sc.render.resolution_x = 960
    sc.render.resolution_y = 540
    sc.world = bpy.data.worlds.new(nome + "_mundo")
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.012, 0.016, 0.026, 1)
    bg.inputs[1].default_value = 1.0
    sc.view_settings.view_transform = "Standard"
    col = bpy.data.collections.new(nome + "_FX")
    sc.collection.children.link(col)
    ref = bpy.data.collections.new(nome + "_REF")
    sc.collection.children.link(ref)
    return sc, col, ref

# ------------------------------------------------------------------ Materiais
def mat_base(nome):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    try:
        m.surface_render_method = "BLENDED"
    except Exception:
        pass
    m.use_backface_culling = False
    return m

def _fim(m, em, alfa_socket, N):
    nt = m.node_tree
    out = N.new("ShaderNodeOutputMaterial")
    mix = N.new("ShaderNodeMixShader")
    tr = N.new("ShaderNodeBsdfTransparent")
    nt.links.new(alfa_socket, mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])

def mat_grad(nome, stops, forca=3.2, alfa=1.0, cauda=0.0):
    m = mat_base(nome)
    nt = m.node_tree
    N = nt.nodes
    em = N.new("ShaderNodeEmission")
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ")
    ramp = N.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    while len(el) < len(stops):
        el.new(0.5)
    for e, (p, c) in zip(el, stops):
        e.position = p
        e.color = (*c, 1)
    nt.links.new(tc.outputs["UV"], sep.inputs[0])
    nt.links.new(sep.outputs[1], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], em.inputs["Color"])
    em.inputs["Strength"].default_value = forca * GAIN
    inv = N.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    pw = N.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = max(cauda, 0.01)
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = alfa
    nt.links.new(sep.outputs[1], inv.inputs[1])
    nt.links.new(inv.outputs[0], pw.inputs[0])
    if cauda > 0:
        nt.links.new(pw.outputs[0], mul.inputs[0])
    else:
        mul.inputs[0].default_value = 1.0
    _fim(m, em, mul.outputs[0], N)
    return m

def mat_emit(nome, cor, forca=6.0):
    m = mat_base(nome)
    N = m.node_tree.nodes
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*cor, 1)
    em.inputs["Strength"].default_value = forca * GAIN
    out = N.new("ShaderNodeOutputMaterial")
    m.node_tree.links.new(em.outputs[0], out.inputs[0])
    return m

def mat_vidro(nome, centro, borda, forca=2.4, alfa_c=0.6):
    m = mat_base(nome)
    nt = m.node_tree
    N = nt.nodes
    em = N.new("ShaderNodeEmission")
    lw = N.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.42
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[1].position = 0.95
    ramp.color_ramp.elements[0].color = (*centro, 1)
    ramp.color_ramp.elements[1].color = (*borda, 1)
    nt.links.new(lw.outputs["Facing"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], em.inputs["Color"])
    em.inputs["Strength"].default_value = forca * GAIN
    al = N.new("ShaderNodeMapRange")
    al.inputs[3].default_value = 1.0
    al.inputs[4].default_value = alfa_c
    nt.links.new(lw.outputs["Facing"], al.inputs[0])
    _fim(m, em, al.outputs[0], N)
    return m

def mat_feixe(nome, base, topo, forca=2.4, esticar=0.7, escala=5.0, alfa=0.9, vel=0.0, f0=1, f1=1, sobe=True):
    m = mat_base(nome)
    nt = m.node_tree
    N = nt.nodes
    em = N.new("ShaderNodeEmission")
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.name = "mapa"
    mp.inputs[3].default_value = (escala, escala, esticar)
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.8
    nz.inputs["Detail"].default_value = 3
    rv = N.new("ShaderNodeValToRGB")
    rv.color_ramp.elements[0].position = 0.3
    rv.color_ramp.elements[1].position = 0.72
    sep = N.new("ShaderNodeSeparateXYZ")
    gr = N.new("ShaderNodeValToRGB")
    gr.color_ramp.elements[0].color = (*base, 1)
    gr.color_ramp.elements[1].color = (*topo, 1)
    inv = N.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    pw = N.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 0.55
    mx = N.new("ShaderNodeMath")
    mx.operation = "MULTIPLY_ADD"
    mx.inputs[1].default_value = 0.75
    mx.inputs[2].default_value = 0.25
    al = N.new("ShaderNodeMath")
    al.operation = "MULTIPLY"
    al2 = N.new("ShaderNodeMath")
    al2.operation = "MULTIPLY"
    al2.inputs[1].default_value = alfa
    L = nt.links
    uv = N.new("ShaderNodeTexCoord")
    L.new(tc.outputs["Object"], mp.inputs[0])
    L.new(mp.outputs[0], nz.inputs["Vector"])
    L.new(nz.outputs["Fac"], rv.inputs[0])
    L.new(uv.outputs["UV"], sep.inputs[0])
    L.new(sep.outputs[1], gr.inputs[0])
    L.new(gr.outputs[0], em.inputs["Color"])
    em.inputs["Strength"].default_value = forca * GAIN
    L.new(sep.outputs[1], inv.inputs[1])
    L.new(inv.outputs[0], pw.inputs[0])
    L.new(rv.outputs[0], mx.inputs[0])
    L.new(mx.outputs[0], al.inputs[0])
    L.new(pw.outputs[0], al.inputs[1])
    L.new(al.outputs[0], al2.inputs[0])
    _fim(m, em, al2.outputs[0], N)
    if vel:
        for fr, z in ((f0, 0.0), (f1, -vel if sobe else vel)):
            mp.inputs[1].default_value = (0, 0, z)
            nt.keyframe_insert('nodes["mapa"].inputs[1].default_value', frame=fr)
    return m

def mat_ref(nome, cor):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*cor, 1)
    b.inputs["Roughness"].default_value = 0.8
    return m

OURO = (1.0, 0.82, 0.35)
BRANCO = (1.0, 0.97, 0.86)
VERDE = (0.35, 1.0, 0.58)
VERDE_ESC = (0.05, 0.65, 0.28)
AZUL_P = (0.6, 0.88, 1.0)
M = {}

def mats():
    M["ouro_vidro"] = mat_vidro("CL_ouro_vidro", (1.0, 0.65, 0.12), (1.0, 0.96, 0.75), 2.6, 0.65)
    M["verde_vidro"] = mat_vidro("CL_verde_vidro", (0.06, 0.75, 0.35), (0.9, 1.0, 0.94), 2.6, 0.78)
    M["azul_vidro"] = mat_vidro("CL_azul_vidro", (0.15, 0.5, 0.98), (0.85, 0.96, 1.0), 2.4, 0.45)
    M["branco"] = mat_emit("CL_branco", BRANCO, 7.5)
    M["ouro"] = mat_emit("CL_ouro", OURO, 5.5)
    M["verde"] = mat_emit("CL_verde", VERDE, 6.0)
    M["rastro"] = mat_grad("CL_rastro", [(0.0, (1.0, 0.98, 0.88)), (0.5, OURO), (1.0, (0.95, 0.6, 0.12))], 3.2, 0.95, 0.7)
    M["rastro_v"] = mat_grad("CL_rastro_v", [(0.0, (0.94, 1.0, 0.94)), (0.5, VERDE), (1.0, VERDE_ESC)], 3.2, 0.95, 0.7)
    M["marca"] = mat_grad("CL_marca", [(0.0, (1.0, 0.88, 0.5)), (1.0, (1.0, 0.98, 0.88))], 3.5, 0.95)
    M["marca_v"] = mat_grad("CL_marca_v", [(0.0, (0.28, 0.9, 0.5)), (1.0, (0.92, 1.0, 0.94))], 3.5, 0.95)
    M["marca_a"] = mat_grad("CL_marca_a", [(0.0, (0.3, 0.65, 1.0)), (1.0, (0.9, 0.98, 1.0))], 3.2, 0.95)
    M["pilar"] = mat_grad("CL_pilar", [(0.0, (1.0, 0.98, 0.85)), (0.5, OURO), (1.0, (0.95, 0.55, 0.12))], 3.2, 0.95, 0.6)
    M["feixe_o"] = mat_feixe("CL_feixe_o", BRANCO, (1.0, 0.72, 0.2), 2.2, 0.5, 4.0, 0.85, 6.0, 1, 260)
    M["feixe_o2"] = mat_feixe("CL_feixe_o2", (1.0, 1.0, 0.95), OURO, 2.4, 0.4, 5.5, 0.9, 8.0, 1, 260)
    M["feixe_v"] = mat_feixe("CL_feixe_v", (0.92, 1.0, 0.94), (0.18, 0.85, 0.45), 2.4, 0.55, 4.0, 0.9, 5.0, 1, 260)
    M["feixe_b"] = mat_feixe("CL_feixe_b", (1.0, 1.0, 0.97), (1.0, 0.85, 0.38), 2.6, 0.35, 5.0, 0.95, 9.0, 1, 260)
    M["osso"] = mat_emit("CL_osso", (0.32, 0.28, 0.22), 0.9)
    M["lanca_m"] = mat_emit("CL_lanca_m", (1.0, 0.35, 0.08), 6.5)
    M["livro_capa"] = mat_ref("CL_livro_capa", (0.45, 0.12, 0.08))
    M["livro_ouro"] = mat_emit("CL_livro_ouro", OURO, 3.0)
    M["livro_luz"] = mat_emit("CL_livro_luz", (1.0, 0.95, 0.65), 5.0)

RAIZ = "C:/TECX SOFTHOUSE/IS ONLINE/"
TEXDIR = RAIZ + "prototipo/assets/fx/"

def _img(arq):
    return bpy.data.images.load(TEXDIR + arq, check_existing=True)

def mat_tex(nome, arq, tint, forca=2.4, quente=(1.0, 0.98, 0.88), repete=False):
    m = mat_base(nome)
    nt = m.node_tree
    N = nt.nodes
    L = nt.links
    tc = N.new("ShaderNodeTexCoord")
    im = N.new("ShaderNodeTexImage")
    im.image = _img(arq)
    im.extension = "REPEAT" if repete else "CLIP"
    rp = N.new("ShaderNodeValToRGB")
    el = rp.color_ramp.elements
    el[0].position = 0.0
    el[0].color = (*[c * 0.7 for c in tint], 1)
    el[1].position = 1.0
    el[1].color = (*quente, 1)
    e2 = el.new(0.45)
    e2.color = (*tint, 1)
    em = N.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = forca * GAIN
    L.new(tc.outputs["UV"], im.inputs["Vector"])
    L.new(im.outputs["Alpha"], rp.inputs[0])
    L.new(rp.outputs[0], em.inputs["Color"])
    _fim(m, em, im.outputs["Alpha"], N)
    return m

def mats2():
    for c, t in (("o", OURO), ("v", VERDE), ("a", AZUL_P), ("b", BRANCO)):
        M["gh_" + c] = mat_tex("CL_gh_" + c, "clerigo_glifo_hex.png", t, 2.6)
        M["go_" + c] = mat_tex("CL_go_" + c, "clerigo_glifo_octa.png", t, 2.6)
        M["bh_" + c] = mat_tex("CL_bh_" + c, "clerigo_hex_brilho.png", t, 1.8)
        M["on_" + c] = mat_tex("CL_on_" + c, "clerigo_onda.png", t, 3.2)
        M["spr_estrela_" + c] = mat_tex("CL_spr_estrela_" + c, "clerigo_estrela.png", t, 3.4)
        M["spr_cruz_" + c] = mat_tex("CL_spr_cruz_" + c, "clerigo_cruz.png", t, 2.6)
        M["leque_" + c] = mat_tex("CL_leque_" + c, "clerigo_leque.png", t, 2.8)
    for c, t in (("o", OURO), ("v", VERDE), ("a", AZUL_P), ("b", BRANCO)):
        M["esp_" + c] = mat_grad("CL_esp_" + c, [(0.0, (1.0, 1.0, 0.98)), (0.45, t), (1.0, tuple(x * 0.55 for x in t))], 3.5, 1.0, 0.9)
    M["halo_v"] = mat_vidro("CL_halo_v", (0.06, 0.9, 0.45), (0.88, 1.0, 0.92), 1.5, 0.22)
    M["halo_o"] = mat_vidro("CL_halo_o", (1.0, 0.75, 0.2), (1.0, 0.98, 0.85), 1.5, 0.22)

# ------------------------------------------------------------------ Geometrias Livres e Estilizadas
def para_obj(col, nome, bm, mat=None, flat=False):
    me = bpy.data.meshes.new("CL_" + nome)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = not flat
    if mat:
        me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    return ob

def uv_z(bm, zmin, zmax):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert.co
            lp[uvl].uv = ((math.atan2(v.y, v.x) / (2 * math.pi)) % 1.0, (v.z - zmin) / max(zmax - zmin, 1e-6))

def bm_anel(r_int, r_ext, segs=36):
    """Anel circular magico plano (eixo Z perpendicular)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    v_int = [bm.verts.new((r_int * math.cos(2 * math.pi * i / segs), r_int * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    v_ext = [bm.verts.new((r_ext * math.cos(2 * math.pi * i / segs), r_ext * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    for i in range(segs):
        j = (i + 1) % segs
        f = bm.faces.new((v_int[i], v_ext[i], v_ext[j], v_int[j]))
        for lp in f.loops:
            v = lp.vert.co
            lp[uvl].uv = (math.atan2(v.y, v.x) / (2 * math.pi) % 1.0, (v.length - r_int) / max(1e-5, r_ext - r_int))
    return bm

def bm_toro(r_maior, r_menor, seg_u=32, seg_v=12):
    """Toro circular volumetrico 3D (para auras orbitais e aneis sagrados de poder)"""
    bm = bmesh.new()
    aneis = []
    for u in range(seg_u):
        ang_u = 2 * math.pi * u / seg_u
        cu = Vector((r_maior * math.cos(ang_u), r_maior * math.sin(ang_u), 0))
        rad = Vector((math.cos(ang_u), math.sin(ang_u), 0))
        up = Vector((0, 0, 1))
        circ = []
        for v in range(seg_v):
            ang_v = 2 * math.pi * v / seg_v
            pt = cu + (rad * math.cos(ang_v) + up * math.sin(ang_v)) * r_menor
            circ.append(bm.verts.new(pt))
        aneis.append(circ)
    for u in range(seg_u):
        u2 = (u + 1) % seg_u
        for v in range(seg_v):
            v2 = (v + 1) % seg_v
            bm.faces.new((aneis[u][v], aneis[u2][v], aneis[u2][v2], aneis[u][v2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_cristal_lapidado(L, r, lados=8, cauda=0.25):
    """Cristal sagrado lapidado suave com facetas de gema (corpo aerodinamico ao longo de +Z)"""
    bm = bmesh.new()
    a = bm.verts.new((0, 0, 0))
    anel = [bm.verts.new((r * math.cos(2 * math.pi * i / lados), r * math.sin(2 * math.pi * i / lados), cauda * L)) for i in range(lados)]
    p = bm.verts.new((0, 0, L))
    for i in range(lados):
        j = (i + 1) % lados
        bm.faces.new((a, anel[j], anel[i]))
        bm.faces.new((anel[i], anel[j], p))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv_z(bm, 0, L)
    return bm

def bm_obelisco(r1, r2, H, lados=8):
    """Obelisco colunar de cristal para os pilares sagrados (com base e topo facetado lapidado)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=lados, radius1=r1, radius2=r2, depth=H)
    bmesh.ops.translate(bm, vec=(0, 0, H / 2), verts=bm.verts)
    uv_z(bm, 0, H)
    return bm

def bm_cupula(R, segs=28, aneis=10):
    """Cupula hemisferica translucida de cura (abobada celeste)"""
    bm = bmesh.new()
    topo = bm.verts.new((0, 0, R))
    layers = []
    for ring in range(1, aneis + 1):
        phi = (math.pi / 2) * (ring / aneis)
        z = R * math.cos(phi)
        r = R * math.sin(phi)
        circ = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)]
        layers.append(circ)
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((topo, layers[0][j], layers[0][i]))
    for k in range(len(layers) - 1):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((layers[k][i], layers[k][j], layers[k + 1][j], layers[k + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_asa_angelical(L, w, segs=16):
    """Asa de anjo estilizada em arco de luz divina fluida (curvatura elegante)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    linhas = []
    for k in range(segs + 1):
        t = k / segs
        # Curva de asa suave estilo arco celestial
        arco_x = math.sin(t * math.pi * 0.85) * (w * 0.9)
        arco_y = math.sin(t * math.pi) * 0.15
        esp = w * 0.45 * math.sin(t * math.pi) * (1.0 - t * 0.25)
        z = t * L
        linhas.append([
            bm.verts.new((arco_x - esp, arco_y, z)),
            bm.verts.new((arco_x + esp, arco_y, z))
        ])
    for k in range(segs):
        a, b = linhas[k], linhas[k + 1]
        f = bm.faces.new((a[0], a[1], b[1], b[0]))
        for lp in f.loops:
            lp[uvl].uv = (lp.vert.co.x / max(w, 1e-4) + 0.5, lp.vert.co.z / L)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_cruz(s, esp):
    bm = bmesh.new()
    h = s * 0.5
    a = s * 0.18
    pts = [(-a, -h), (a, -h), (a, -a), (h, -a), (h, a), (a, a), (a, h), (-a, h), (-a, a), (-h, a), (-h, -a), (-a, -a)]
    vs = [bm.verts.new((x, -esp / 2, z)) for x, z in pts]
    bm.faces.new(vs)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=esp)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_mandala_solar(R, raios=12):
    """Mandala magica rica com aneis circulares e raios solares curvos"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    # Anel central
    segs = 36
    v_c = [bm.verts.new((R * 0.25 * math.cos(2 * math.pi * i / segs), R * 0.25 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    v_m = [bm.verts.new((R * 0.65 * math.cos(2 * math.pi * i / segs), R * 0.65 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    v_e = [bm.verts.new((R * 0.95 * math.cos(2 * math.pi * i / segs), R * 0.95 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((v_c[i], v_m[i], v_m[j], v_c[j]))
        bm.faces.new((v_m[i], v_e[i], v_e[j], v_m[j]))
    # Raios solares ornamentais
    for r in range(raios):
        ang = 2 * math.pi * r / raios
        p1 = Vector((R * 0.95 * math.cos(ang), R * 0.95 * math.sin(ang), 0))
        p2 = Vector((R * 1.35 * math.cos(ang + 0.15), R * 1.35 * math.sin(ang + 0.15), 0))
        p3 = Vector((R * 0.95 * math.cos(ang + 0.3), R * 0.95 * math.sin(ang + 0.3), 0))
        v1, v2, v3 = bm.verts.new(p1), bm.verts.new(p2), bm.verts.new(p3)
        bm.faces.new((v1, v2, v3))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

# Auxiliares de Cena e Animacao
def esc(o, pts):
    for f, s in pts:
        o.scale = (max(s, 1e-4),) * 3 if not isinstance(s, tuple) else tuple(max(x, 1e-4) for x in s)
        o.keyframe_insert("scale", frame=f)

def anim(o, prop, f0, f1, fn, passo=2):
    for f in list(range(f0, f1, passo)) + [f1]:
        setattr(o, prop, fn((f - f0) / max(1, (f1 - f0))))
        o.keyframe_insert(prop, frame=f)

def apunta(o, d, eixo="Z", cima="Y"):
    o.rotation_euler = Vector(d).normalized().to_track_quat(eixo, cima).to_euler()

def luz(col, nome, tipo, loc, energia, cor=(1, 1, 1)):
    ld = bpy.data.lights.new(nome, tipo)
    ld.energy = energia
    ld.color = cor
    o = bpy.data.objects.new(nome, ld)
    o.location = loc
    col.objects.link(o)
    return o

def pisca(l, pts):
    for f, e in pts:
        l.data.energy = e * 0.4
        l.data.keyframe_insert("energy", frame=f)

def camera(sc, col, nome, loc, alvo, lente=32):
    nome = sc.name[len(PREFIXO):] + "_" + nome
    c = bpy.data.objects.new(nome, bpy.data.cameras.new(nome))
    c.data.lens = lente
    c.location = loc
    col.objects.link(c)
    t = bpy.data.objects.new(nome + "_alvo", None)
    t.location = alvo
    col.objects.link(t)
    k = c.constraints.new("TRACK_TO")
    k.target = t
    k.track_axis = "TRACK_NEGATIVE_Z"
    k.up_axis = "UP_Y"
    return c

def caixa(ref, nome, loc, dim, mat):
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1.0)
    bmesh.ops.scale(b, vec=dim, verts=b.verts)
    o = para_obj(ref, nome, b, mat)
    o.location = loc
    return o

def plano_chao(col, nome, lado, mat, z=0.02):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    h = lado / 2
    f = bm.faces.new([bm.verts.new(p) for p in ((-h, -h, 0), (h, -h, 0), (h, h, 0), (-h, h, 0))])
    for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        lp[uvl].uv = uv
    o = para_obj(col, nome, bm, mat)
    o.location = (0, 0, z)
    return o

def glifo_obj(col, nome, R, tipo, cor, z=0.025):
    g = plano_chao(col, nome, R * 2.06, M[("go_" if tipo == "octa" else "gh_") + cor], z)
    b = plano_chao(col, nome + "_luz", R * 2.5, M["bh_" + cor], -0.012)
    b.parent = g
    return g

def brilho_chao(col, nome, R, cor, z=0.012):
    return plano_chao(col, nome, R * 2, M["bh_" + cor], z)

def sprite(col, nome, mat, tam, loc=(0, 0, 0), vertical=False, alto=None):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    w = tam
    h = alto or tam
    pts = [(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, 0, h), (-w / 2, 0, h)] if vertical else [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        lp[uvl].uv = uv
    o = para_obj(col, nome, bm, mat)
    o.location = loc
    k = o.constraints.new("LOCKED_TRACK" if vertical else "TRACK_TO")
    k.name = "CL_BB"
    if vertical:
        k.track_axis = "TRACK_Y"
        k.lock_axis = "LOCK_Z"
    else:
        k.track_axis = "TRACK_Z"
        k.up_axis = "UP_Y"
    return o

def retarget(sc):
    for o in sc.objects:
        for k in o.constraints:
            if k.name == "CL_BB":
                k.target = sc.camera

def base_cena(nome, fim, caster=(0, 0)):
    sc, col, ref = nova_cena(PREFIXO + nome, fim)
    b = bmesh.new()
    bmesh.ops.create_grid(b, x_segments=1, y_segments=1, size=30)
    mc = mat_ref("CL_chao_" + nome, (0.045, 0.05, 0.06))
    para_obj(ref, "chao", b, mc)
    M["ref_c"] = mat_ref("CL_ref_clerigo", (0.55, 0.52, 0.42))
    M["ref_a"] = mat_ref("CL_ref_aliado", (0.20, 0.36, 0.60))
    M["ref_i"] = mat_ref("CL_ref_inimigo", (0.50, 0.14, 0.11))
    caixa(ref, "clerigo_ref_1.7m", (caster[0], caster[1], 0.85), (0.5, 0.35, 1.7), M["ref_c"])
    luz(ref, "sol", "SUN", (0, 0, 10), 0.9, (0.85, 0.85, 1.0)).rotation_euler = (math.radians(45), 0, math.radians(-30))
    return sc, col, ref

def livro(col, loc, f_abre, f_fecha, esc_=1.5):
    L, W, H = 0.20 * esc_, 0.014 * esc_, 0.30 * esc_
    raiz = bpy.data.objects.new("livro", None)
    col.objects.link(raiz)
    raiz.location = loc
    def cubo(nome, mat, dim, off):
        b = bmesh.new()
        bmesh.ops.create_cube(b, size=1.0)
        bmesh.ops.scale(b, vec=dim, verts=b.verts)
        bmesh.ops.translate(b, vec=off, verts=b.verts)
        return para_obj(col, nome, b, mat)
    cubo("livro_lombada", M["livro_capa"], (W * 1.6, W * 2.0, H), (0, 0, 0)).parent = raiz
    for lado in (0, 1):
        pv = bpy.data.objects.new("livro_piv%d" % lado, None)
        col.objects.link(pv)
        pv.parent = raiz
        cubo("livro_capa%d" % lado, M["livro_capa"], (L, W, H), (L / 2, 0, 0)).parent = pv
        cubo("livro_borda%d" % lado, M["livro_ouro"], (L * 0.96, W * 0.6, H * 1.02), (L / 2, W * (-0.7 if lado == 0 else 0.7), 0)).parent = pv
        cubo("livro_pag%d" % lado, M["livro_luz"], (L * 0.88, W * 0.5, H * 0.9), (L / 2 + 0.01, W * (-1.05 if lado == 0 else 1.05), 0)).parent = pv
        a = 50
        pv.rotation_euler = (0, 0, math.radians(180 - a if lado == 0 else a))
    ll = luz(col, "livro_luz", "POINT", (0, 0.2, 0), 40, (1.0, 0.88, 0.55))
    ll.parent = raiz
    gl = sprite(col, "livro_brilho", M["spr_estrela_o"], 1.5 * esc_, (0, 0.12, 0))
    gl.parent = raiz
    return raiz

# ================================================================== 0. ATAQUE BASICO: LAMINA DE LUZ (Estilizado)
def montar_basico():
    random.seed(7)
    F_FIM = 76
    sc, col, ref = base_cena("BASICO", F_FIM)
    caixa(ref, "aliado_ref", (0.7, 5.6, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_ref", (0, 12.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, F_FIM - 6)

    raiz = bpy.data.objects.new("lamina_raiz", None)
    col.objects.link(raiz)
    apunta(raiz, (0, 1, 0))
    raiz.rotation_euler = (math.pi / 2, 0, 0)

    # Lamina sagrada de cristal lapidado (8 lados) com miolo incandescente
    corpo = para_obj(col, "lamina_corpo", bm_cristal_lapidado(1.6, 0.15, 8, 0.22), M["ouro_vidro"])
    corpo.parent = raiz
    miolo = para_obj(col, "lamina_miolo", bm_cristal_lapidado(1.2, 0.07, 8, 0.2), M["branco"])
    miolo.parent = raiz
    miolo.location = (0, 0, 0.15)

    # Aneis magicos circulares orbitais em gimbal (estilo JRPG magico)
    an1 = para_obj(col, "lamina_anel1", bm_toro(0.38, 0.02, 28, 8), M["ouro"])
    an1.parent = raiz
    an1.location = (0, 0, 0.6)
    an2 = para_obj(col, "lamina_anel2", bm_toro(0.50, 0.018, 28, 8), M["marca"])
    an2.parent = raiz
    an2.location = (0, 0, 0.8)

    cl = sprite(col, "lamina_clarao", M["spr_estrela_o"], 2.2, (0, 0, 1.6))
    cl.parent = raiz

    F0, F1 = 10, 46
    Y0, Y1 = 1.2, 12.0
    raiz.location = (0, Y0, 1.25)
    raiz.keyframe_insert("location", frame=F0)
    raiz.location = (0, Y1 - 0.5, 1.25)
    raiz.keyframe_insert("location", frame=F1)
    esc(raiz, [(F0 - 1, 0.0), (F0 + 3, 1.0), (F1 - 1, 1.0), (F1, 0.0)])

    anim(an1, "rotation_euler", F0, F1, lambda t: (t * 12, t * 8, 0), 2)
    anim(an2, "rotation_euler", F0, F1, lambda t: (0, -t * 10, t * 14), 2)

    luz_ = luz(col, "lamina_luz", "POINT", (0, 0.2, 0), 0, (1.0, 0.85, 0.45))
    luz_.parent = raiz
    pisca(luz_, [(F0 - 1, 0), (F0 + 3, 600), (F1 - 1, 600), (F1, 0)])

    # Impacto no inimigo com mandala de choque circular
    mand = para_obj(col, "hit_mandala", bm_anel(0.2, 1.8, 36), M["marca"])
    mand.location = (0, 12.0, 0.02)
    esc(mand, [(F1 - 1, 0.0), (F1, 0.4), (F1 + 6, 1.1), (F1 + 24, 0.0)])
    anim(mand, "rotation_euler", F1, F1 + 24, lambda t: (0, 0, t * 2.5), 3)

    camera(sc, ref, "cam_lateral", (11.0, 6.0, 2.6), (0, 6.0, 1.5), 32)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.0, -2.5, 1.8), (0, 4.0, 1.3), 32)
    return sc

# ================================================================== 1. CURA MIRADA: Diamante de Cura com Aneis Celestes (C1)
def montar_cura():
    random.seed(11)
    F_FIM = 216
    sc, col, ref = base_cena("S1_CURA", F_FIM)
    caixa(ref, "aliado_ref_1.8m", (-3.6, 10.5, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_ref_1.8m", (4.2, 10.5, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, F_FIM - 8)

    def criar_tiro(nome, p0, p1, f0, voo):
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        r = bpy.data.objects.new(nome, None)
        col.objects.link(r)
        r.rotation_euler = (math.pi / 2, 0, math.atan2(d.y, d.x) - math.pi / 2)

        # Cristal esmeralda lapidado
        cr = para_obj(col, nome + "_cristal", bm_cristal_lapidado(2.2, 0.32, 8, 0.25), M["verde_vidro"])
        cr.parent = r
        nu = para_obj(col, nome + "_nucleo", bm_cristal_lapidado(1.4, 0.14, 8, 0.2), M["branco"])
        nu.parent = r
        nu.location = (0, 0, 0.2)

        # Aneis orbitais celestes
        toro1 = para_obj(col, nome + "_toro1", bm_toro(0.65, 0.025, 28, 8), M["ouro"])
        toro1.parent = r
        toro1.location = (0, 0, 1.0)
        toro2 = para_obj(col, nome + "_toro2", bm_toro(0.85, 0.02, 28, 8), M["marca_v"])
        toro2.parent = r
        toro2.location = (0, 0, 1.2)

        r.location = (p0.x, p0.y, 1.3)
        r.keyframe_insert("location", frame=f0)
        r.location = (p1.x, p1.y, 1.3)
        r.keyframe_insert("location", frame=f0 + voo)
        esc(r, [(f0 - 1, 0.0), (f0 + 4, 1.0), (f0 + voo - 1, 1.0), (f0 + voo, 0.0)])
        anim(toro1, "rotation_euler", f0, f0 + voo, lambda t: (t * 8, t * 6, 0), 3)
        anim(toro2, "rotation_euler", f0, f0 + voo, lambda t: (0, -t * 10, t * 12), 3)

        l = luz(col, nome + "_luz", "POINT", (0, 0.2, 0), 0, (0.6, 1.0, 0.65))
        l.parent = r
        pisca(l, [(f0 - 1, 0), (f0 + 4, 800), (f0 + voo - 1, 800), (f0 + voo, 0)])

    criar_tiro("proj1", (0.5, 0.8), (-3.6, 10.5), 16, 52)
    # Efeito no aliado: Domo de cura translucido e anel de luz
    f_ali = 68
    cup = para_obj(col, "ali_cupula", bm_cupula(2.2, 28, 8), M["verde_vidro"])
    cup.location = (-3.6, 10.5, 0.02)
    esc(cup, [(f_ali - 1, 0.0), (f_ali + 4, 1.0), (f_ali + 28, 1.05), (f_ali + 45, 0.0)])
    an_ali = para_obj(col, "ali_anel", bm_anel(0.4, 2.8, 36), M["marca_v"])
    an_ali.location = (-3.6, 10.5, 0.03)
    esc(an_ali, [(f_ali - 1, 0.0), (f_ali + 6, 1.1), (f_ali + 36, 0.0)])

    criar_tiro("proj2", (0.5, 0.8), (4.2, 10.5), 112, 52)
    camera(sc, ref, "cam_lateral", (14.0, 4.0, 3.6), (0, 6.5, 1.8), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.4, 2.0), (-0.4, 4.0, 1.2), 32)
    return sc

# ================================================================== 2. GLIFO DE CURA: Mandala Sagrada, Obeliscos e Cupula Divina (C2 - O DO PRINT!)
def montar_glifo():
    random.seed(21)
    F_FIM = 224
    C = Vector((0.0, 9.0, 0.0))
    sc, col, ref = base_cena("S2_GLIFO", F_FIM)
    aliados = [(-1.6, 8.0), (1.5, 10.0), (0.3, 7.4)]
    for i, (x, y) in enumerate(aliados):
        caixa(ref, "aliado_ref_%d" % i, (x, y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_fora_ref", (7.2, 9.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, 30)

    F0 = 16
    F_PULSOS = [44, 92, 140, 188]
    F_SAI = 206
    RAIO = 3.6

    # 1. Chão: Mandala sagrada rica com aneis circulares concentricos e raios (Livre Geometricamente!)
    mandala = para_obj(col, "glifo_mandala", bm_mandala_solar(RAIO, raios=12), M["marca_v"])
    mandala.location = (C.x, C.y, 0.025)
    esc(mandala, [(F0 - 1, 0.0), (F0 + 12, 1.0), (F_SAI, 1.0), (F_SAI + 12, 0.0)])
    anim(mandala, "rotation_euler", F0, F_SAI + 12, lambda t: (0, 0, t * 1.5), 4)

    # Anel dourado externo de contencao sagrada
    anel_ext = para_obj(col, "glifo_anel_ext", bm_anel(RAIO * 0.96, RAIO * 1.06, 48), M["marca"])
    anel_ext.location = (C.x, C.y, 0.03)
    esc(anel_ext, [(F0 - 1, 0.0), (F0 + 10, 1.0), (F_SAI, 1.0), (F_SAI + 12, 0.0)])

    # 2. Cupula Hemisferica translucida de cura que pulsa protegendo a area
    cupula = para_obj(col, "glifo_cupula", bm_cupula(RAIO * 0.98, 32, 10), M["verde_vidro"])
    cupula.location = (C.x, C.y, 0.035)
    esc(cupula, [(F0 - 1, 0.0), (F0 + 16, 0.95), (F_SAI - 10, 0.95), (F_SAI + 12, 0.0)])
    anim(cupula, "rotation_euler", F0, F_SAI, lambda t: (0, 0, -t * 0.8), 4)

    # 3. 6 Obeliscos Esculpidos nos vertices (em vez dos canudos retos simples da foto!)
    for k in range(6):
        ang = k * math.pi / 3
        px = C.x + math.cos(ang) * RAIO * 0.92
        py = C.y + math.sin(ang) * RAIO * 0.92
        # Obelisco estilizado facetado (8 lados) com afinamento elegante
        ob = para_obj(col, "obelisco%d" % k, bm_obelisco(0.24, 0.08, 4.2, 8), M["verde_vidro"] if k % 2 else M["ouro_vidro"])
        ob.location = (px, py, 0)
        esc(ob, [(F0 + 4 + k, (1, 1, 1e-3)), (F0 + 16 + k, (1, 1, 1.0)), (F_SAI, (1, 1, 1.0)), (F_SAI + 12, (1, 1, 1e-3))])

        # Anel de luz orbital que sobe em espiral ao redor de cada obelisco
        toro_ob = para_obj(col, "toro_ob%d" % k, bm_toro(0.38, 0.02, 20, 6), M["ouro"] if k % 2 else M["verde"])
        toro_ob.location = (px, py, 0.5)
        esc(toro_ob, [(F0 + 10 + k, 0.0), (F0 + 20 + k, 1.0), (F_SAI, 1.0), (F_SAI + 10, 0.0)])
        anim(toro_ob, "location", F0 + 20, F_SAI, lambda t, px=px, py=py: (px, py, 0.6 + 2.8 * (t % 0.35 / 0.35)), 3)
        anim(toro_ob, "rotation_euler", F0, F_SAI, lambda t: (0, 0, t * 14), 2)

    # 4. Pulsos de cura
    for n, fp in enumerate(F_PULSOS):
        onda = para_obj(col, "pulso_anel%d" % n, bm_anel(0.2, RAIO * 1.25, 40), M["marca_v"])
        onda.location = (C.x, C.y, 0.04)
        esc(onda, [(fp - 1, 0.0), (fp, 0.25), (fp + 16, 1.1), (fp + 22, 0.0)])

        lz = luz(col, "pulso_luz%d" % n, "POINT", (C.x, C.y, 2.0), 0, VERDE)
        pisca(lz, [(fp - 1, 0), (fp + 2, 5000), (fp + 18, 0)])

    camera(sc, ref, "cam_alto", (9.0, 0.5, 10.5), (0, 8.8, 0.8), 30)
    camera(sc, ref, "cam_lateral", (11.0, 3.0, 3.0), (0, 9.0, 1.6), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.2, 2.2), (0, 7.5, 1.0), 30)
    return sc

# ================================================================== 3. ESCUDO ASTRAL: Campo de Forca e Placas com Aneis Celestes (C3)
def montar_escudo():
    random.seed(33)
    F_FIM = 176
    A = Vector((0.0, 8.0, 0.0))
    sc, col, ref = base_cena("S3_ESCUDO", F_FIM)
    caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_ref_1.8m", (7.0, 8.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, 36)

    # Anel magico circular contínuo unindo as placas
    R = 1.35
    toro_barreira = para_obj(col, "escudo_toro_cintura", bm_toro(R, 0.035, 36, 8), M["marca_a"])
    toro_barreira.location = (A.x, A.y, 1.1)
    esc(toro_barreira, [(20, 0.0), (32, 1.0), (140, 1.0), (154, 0.0)])
    anim(toro_barreira, "rotation_euler", 20, 154, lambda t: (0, 0, t * 6), 3)

    toro_inclinado = para_obj(col, "escudo_toro_gimbal", bm_toro(R * 1.08, 0.025, 36, 8), M["marca"])
    toro_inclinado.location = (A.x, A.y, 1.1)
    toro_inclinado.rotation_euler = (math.radians(35), 0, 0)
    esc(toro_inclinado, [(24, 0.0), (36, 1.0), (138, 1.0), (150, 0.0)])
    anim(toro_inclinado, "rotation_euler", 24, 150, lambda t: (math.radians(35), t * 8, t * 5), 3)

    # 8 Placas lapidadas de barreira astral
    N = 8
    placas = []
    for i in range(N):
        ang = i * 2 * math.pi / N
        pl = para_obj(col, "placa_lap%d" % i, bm_cristal_lapidado(1.6, 0.38, 6, 0.5), M["azul_vidro"] if i % 2 else M["ouro_vidro"])
        pos = (A.x + math.cos(ang) * R, A.y + math.sin(ang) * R, 0.3)
        pl.location = pos
        pl.rotation_euler = (0, 0, ang - math.pi / 2)
        esc(pl, [(22 + i * 2, 0.0), (34 + i * 2, 1.0), (140, 1.0), (152, 0.0)])
        placas.append((pl, ang, pos))

    camera(sc, ref, "cam_lateral", (11.0, 2.0, 3.0), (0, 6.0, 1.4), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.2, -3.0, 2.0), (0.2, 5.5, 1.2), 32)
    return sc

# ================================================================== 4. PURIFICACAO: Cascata Celestial e Coroa de Luz (C4)
def montar_purifica():
    random.seed(44)
    F_FIM = 168
    A = Vector((0.0, 8.0, 0.0))
    sc, col, ref = base_cena("S4_PURIFICA", F_FIM)
    caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 40)

    FI = 30
    # 3 Cilindros concentricos volumetricos de cascata divina
    c1 = para_obj(col, "purif_col1", bm_obelisco(0.9, 0.7, 7.0, 16), M["feixe_b"])
    c1.location = (A.x, A.y, 0)
    esc(c1, [(FI - 1, (1, 1, 1e-3)), (FI + 6, (1.1, 1.1, 1.0)), (FI + 24, (1, 1, 1.0)), (FI + 36, (0.2, 0.2, 1e-3))])

    # Coroa sagrada de imunidade acima da cabeca
    coroa_anel = para_obj(col, "imune_coroa_anel", bm_toro(0.35, 0.03, 24, 8), M["ouro"])
    coroa_anel.location = (A.x, A.y, 2.65)
    esc(coroa_anel, [(FI + 6, 0.0), (FI + 16, 1.0), (124, 1.0), (138, 0.0)])
    anim(coroa_anel, "rotation_euler", FI + 6, 138, lambda t: (0, 0, t * 10), 3)

    prisma_imune = para_obj(col, "imune_prisma", bm_cristal_lapidado(0.65, 0.16, 8, 0.5), M["ouro_vidro"])
    prisma_imune.location = (A.x, A.y, 2.35)
    esc(prisma_imune, [(FI + 8, 0.0), (FI + 18, 1.0), (124, 1.0), (138, 0.0)])
    anim(prisma_imune, "rotation_euler", FI + 8, 138, lambda t: (0, 0, -t * 8), 3)

    camera(sc, ref, "cam_lateral", (9.0, 5.0, 2.8), (0, 8.0, 1.3), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.2, -3.0, 2.0), (0.2, 5.5, 1.2), 32)
    return sc

# ================================================================== 5. PRECE: Mandala Solar e Colunas de Graca (C5)
def montar_prece():
    random.seed(55)
    F_FIM = 200
    F_G = 12
    F_SAI = 170
    sc, col, ref = base_cena("S5_PRECE", F_FIM)
    aliados = [(-3.6, 3.4), (3.6, 3.2), (0.2, -4.2), (-3.0, -2.8)]
    for i, (x, y) in enumerate(aliados):
        caixa(ref, "aliado_ref_%d" % i, (x, y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 56)

    # Mandala solar rica do Clerigo
    mand = para_obj(col, "prece_mandala", bm_mandala_solar(5.2, raios=16), M["marca"])
    mand.location = (0, 0, 0.025)
    esc(mand, [(F_G - 1, 0.0), (F_G + 14, 1.0), (F_SAI, 1.0), (F_SAI + 14, 0.0)])
    anim(mand, "rotation_euler", F_G, F_SAI + 14, lambda t: (0, 0, t * 1.8), 4)

    # Cada aliado recebe uma coluna de bencao com espirais de luz e coroa
    for i, (x, y) in enumerate(aliados):
        fb = F_G + 24 + i * 5
        col_ali = para_obj(col, "prece_col%d" % i, bm_obelisco(0.8, 0.65, 8.0, 16), M["feixe_o"])
        col_ali.location = (x, y, 0)
        esc(col_ali, [(fb - 1, (1, 1, 1e-3)), (fb + 8, (1, 1, 1.0)), (F_SAI - 16, (1, 1, 1.0)), (F_SAI, (0.3, 0.3, 1e-3))])

        toro_ali = para_obj(col, "prece_toro%d" % i, bm_toro(0.65, 0.03, 24, 6), M["ouro"])
        toro_ali.location = (x, y, 0.3)
        esc(toro_ali, [(fb, 0.0), (fb + 10, 1.0), (F_SAI - 10, 1.0), (F_SAI, 0.0)])
        anim(toro_ali, "location", fb, F_SAI, lambda t, x=x, y=y: (x, y, 0.3 + 2.5 * (t % 0.4 / 0.4)), 3)

    camera(sc, ref, "cam_alto", (0.0, -12.0, 11.5), (0, 0.5, 0.8), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (2.2, -3.4, 2.0), (0.0, 3.0, 1.4), 28)
    return sc

# ================================================================== 6. RESSURREICAO: O Apice com Asas Angelicais de Luz Divina (C6)
def montar_ressur():
    random.seed(66)
    F_FIM = 252
    A = Vector((0.0, 8.0, 0.0))
    F_CLIM = 100
    sc, col, ref = base_cena("S6_RESSUR", F_FIM)
    ali = caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.3), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 112)

    ali.rotation_euler = (math.pi / 2, 0, 0)
    ali.location = (A.x, A.y, 0.2)
    ali.keyframe_insert("location", frame=1)
    ali.keyframe_insert("rotation_euler", frame=1)
    for f, z, rot in ((F_CLIM - 12, 0.2, math.pi / 2), (F_CLIM + 14, 1.5, 0.45), (F_CLIM + 34, 1.0, 0.0), (F_CLIM + 46, 0.9, 0.0)):
        ali.location = (A.x, A.y, z)
        ali.rotation_euler = (rot, 0, 0)
        ali.keyframe_insert("location", frame=f)
        ali.keyframe_insert("rotation_euler", frame=f)

    # Mandala sagrada de renascimento sob o caido
    mand_res = para_obj(col, "ressur_mandala", bm_mandala_solar(4.2, raios=16), M["marca"])
    mand_res.location = (A.x, A.y, 0.025)
    esc(mand_res, [(14, 0.0), (36, 1.0), (F_CLIM + 70, 1.0), (F_CLIM + 90, 0.0)])
    anim(mand_res, "rotation_euler", 14, F_CLIM + 90, lambda t: (0, 0, t * 2.2), 4)

    # Monumental coluna de luz celestial
    feixe_ceu = para_obj(col, "ressur_feixe_ceu", bm_obelisco(1.6, 1.4, 16.0, 24), M["feixe_b"])
    feixe_ceu.location = (A.x, A.y, 0)
    esc(feixe_ceu, [(F_CLIM - 32, (1, 1, 1e-3)), (F_CLIM - 10, (1.15, 1.15, 1.0)), (F_CLIM + 50, (1.15, 1.15, 1.0)), (F_CLIM + 68, (0.3, 0.3, 1e-3))])

    # ASAS ANGELICAIS DE LUZ DIVINA (2 Asas Majestosas Arqueadas que se abrem suavemente)
    for lado, l_nome in ((-1, "esq"), (1, "dir")):
        for camada in range(3):
            compr = 3.6 - camada * 0.45
            larg = 1.1 - camada * 0.15
            asa = para_obj(col, "asa_angelical_%s_%d" % (l_nome, camada), bm_asa_angelical(compr, larg, 18), M["feixe_b"] if camada == 0 else M["ouro_vidro"])
            asa.location = (A.x + lado * 0.25, A.y + 0.35, 1.35 + camada * 0.08)

            ang_fecha = math.radians(12)
            ang_abre = math.radians(45 + camada * 15)
            for f, ang in ((F_CLIM + 6, ang_fecha), (F_CLIM + 24, ang_abre), (F_CLIM + 76, ang_abre + math.radians(5)), (F_CLIM + 96, ang_fecha)):
                asa.rotation_euler = (math.radians(-15), lado * ang, math.radians(lado * 22))
                asa.keyframe_insert("rotation_euler", frame=f)
            esc(asa, [(F_CLIM + 4, 0.0), (F_CLIM + 22, 1.0), (F_CLIM + 78, 1.0), (F_CLIM + 98, 0.0)])

    # Anel de choque de Gloria Divina
    toro_gloria = para_obj(col, "ressur_toro_gloria", bm_toro(1.0, 0.08, 36, 12), M["branco"])
    toro_gloria.location = (A.x, A.y, 1.3)
    esc(toro_gloria, [(F_CLIM + 10, 0.0), (F_CLIM + 14, 0.5), (F_CLIM + 32, 6.0), (F_CLIM + 36, 0.0)])

    camera(sc, ref, "cam_lateral", (12.0, 4.0, 3.6), (0, 8.0, 2.2), 30)
    camera(sc, ref, "cam_aliado", (4.8, 3.8, 2.6), (0, 8.0, 1.6), 32)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.2, 2.2), (0, 6.5, 1.8), 30)
    return sc

# ------------------------------------------------------------------ Execucao e Registro
mats()
mats2()
cenas = [
    montar_basico(),
    montar_cura(),
    montar_glifo(),
    montar_escudo(),
    montar_purifica(),
    montar_prece(),
    montar_ressur()
]

for _s in cenas:
    retarget(_s)

# Deixar na cena S2_GLIFO (a que o usuario mandou foto) e selecionar no viewport
_vai(cenas[2])

print("Clerigo estilizado pronto! Cenas geradas:", [(s.name, len(s.objects), s.frame_end) for s in cenas])
