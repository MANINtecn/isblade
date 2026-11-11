"""Gerador procedural das habilidades do Clerigo / Healer para o Blender 5.1.
Executavel via MCP (porta 9876) ou na aba Scripting do Blender.

Habilidades:
C0 - Lamina de Luz: Mini Cruz de Luz 3D facetada com acabamento refinado de flare estelar.
C1 - Cura Mirada: Cruz 3D de Cura com acabamento refinado caindo suavemente do ceu na posicao mirada.
C2 - Glifo de Cura: Obeliscos lapidados esmeralda/ouro, mandala sagrada suave no chao e cupula de cura.
C3 - Escudo Astral: Placas prismaticas e campo sagrado protetor.
C4 - Purificacao: Coluna de luz pura, coroa radiante e prisma sagrado.
C5 - Prece: Mandala sagrada no solo e colunas de bencao em todos os aliados.
C6 - Ressurreicao: Coluna celestial, circulo suave no chao e Asas Angelicais majestosas de penas reais em camadas.
"""

import bpy
import bmesh
import math
import random
from mathutils import Vector, Matrix

# ------------------------------------------------------------------ Cores e Paleta do Clerigo
BRANCO    = (1.00, 1.00, 1.00)
OURO      = (1.00, 0.82, 0.28)
AMARELO   = (1.00, 0.94, 0.52)
VERDE     = (0.22, 0.95, 0.62)
VERDE_ESC = (0.08, 0.55, 0.32)
AZUL_P    = (0.75, 0.90, 1.00)
MAGENTA   = (0.85, 0.35, 0.75)
CINZA_REF = (0.16, 0.17, 0.22)
ALVO_VERM = (0.85, 0.15, 0.15)
GAIN = 1.0

# ------------------------------------------------------------------ Auxiliares de Materiais
def mat_base(nome):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    m.blend_method = "BLEND"
    try:
        m.shadow_method = "NONE"
    except Exception:
        pass
    return m

def _fim(m, shader_node, alpha_socket, N):
    out = N.new("ShaderNodeOutputMaterial")
    mix = N.new("ShaderNodeMixShader")
    transp = N.new("ShaderNodeBsdfTransparent")
    L = m.node_tree.links
    L.new(alpha_socket, mix.inputs["Fac"])
    L.new(transp.outputs["BSDF"], mix.inputs[1])
    L.new(shader_node.outputs[0], mix.inputs[2])
    L.new(mix.outputs["Shader"], out.inputs["Surface"])

def mat_emit(nome, cor, forca=4.0):
    m = mat_base(nome)
    N, L = m.node_tree.nodes, m.node_tree.links
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*cor, 1.0)
    em.inputs["Strength"].default_value = forca * GAIN
    out = N.new("ShaderNodeOutputMaterial")
    L.new(em.outputs["Emission"], out.inputs["Surface"])
    return m

def mat_ref(nome, cor):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.clear()
    p = N.new("ShaderNodeBsdfPrincipled")
    p.inputs["Base Color"].default_value = (*cor, 1.0)
    p.inputs["Roughness"].default_value = 0.5
    out = N.new("ShaderNodeOutputMaterial")
    L.new(p.outputs["BSDF"], out.inputs["Surface"])
    return m

def mat_vidro(nome, cor_borda, cor_centro, forca=2.2, centro_alfa=0.35):
    m = mat_base(nome)
    N, L = m.node_tree.nodes, m.node_tree.links
    geom = N.new("ShaderNodeNewGeometry")
    fn = N.new("ShaderNodeFresnel")
    fn.inputs["IOR"].default_value = 1.35
    L.new(geom.outputs["Normal"], fn.inputs["Normal"])
    rp_c = N.new("ShaderNodeValToRGB")
    el_c = rp_c.color_ramp.elements
    el_c[0].position = 0.0
    el_c[0].color = (*cor_centro, 1.0)
    el_c[1].position = 1.0
    el_c[1].color = (*cor_borda, 1.0)
    L.new(fn.outputs["Fac"], rp_c.inputs[0])
    em = N.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = forca * GAIN
    L.new(rp_c.outputs["Color"], em.inputs["Color"])
    rp_a = N.new("ShaderNodeValToRGB")
    el_a = rp_a.color_ramp.elements
    el_a[0].position = 0.0
    el_a[0].color = (centro_alfa, centro_alfa, centro_alfa, 1.0)
    el_a[1].position = 1.0
    el_a[1].color = (0.95, 0.95, 0.95, 1.0)
    L.new(fn.outputs["Fac"], rp_a.inputs[0])
    _fim(m, em, rp_a.outputs["Color"], N)
    return m

def mat_grad(nome, pontos, forca=3.0, rugosidade=0.9, alfa=0.9, quente=(1.0, 0.98, 0.88)):
    m = mat_base(nome)
    N, L = m.node_tree.nodes, m.node_tree.links
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["UV"], sep.inputs["Vector"])
    rp_c = N.new("ShaderNodeValToRGB")
    el_c = rp_c.color_ramp.elements
    el_c[0].position = pontos[0][0]
    el_c[0].color = (*pontos[0][1], 1.0)
    el_c[1].position = pontos[-1][0]
    el_c[1].color = (*pontos[-1][1], 1.0)
    for p, c in pontos[1:-1]:
        e = el_c.new(p)
        e.color = (*c, 1.0)
    L.new(sep.outputs["Y"], rp_c.inputs[0])
    em = N.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = forca * GAIN
    L.new(rp_c.outputs["Color"], em.inputs["Color"])
    rp_a = N.new("ShaderNodeValToRGB")
    el_a = rp_a.color_ramp.elements
    el_a[0].position = 0.0
    el_a[0].color = (alfa, alfa, alfa, 1.0)
    el_a[1].position = 1.0
    el_a[1].color = (0.0, 0.0, 0.0, 1.0)
    L.new(sep.outputs["Y"], rp_a.inputs[0])
    _fim(m, em, rp_a.outputs["Color"], N)
    return m

def mat_feixe(nome, cor_miolo, cor_halo, forca=2.4, rug=0.5, raio_soft=4.0, z_soft=0.85, vel=6.0, dir_y=-1, tam_ruido=260):
    m = mat_base(nome)
    N, L = m.node_tree.nodes, m.node_tree.links
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["Generated"], sep.inputs["Vector"])
    map_ = N.new("ShaderNodeMapRange")
    map_.inputs["From Min"].default_value = 0.0
    map_.inputs["From Max"].default_value = 0.5
    map_.inputs["To Min"].default_value = 1.0
    map_.inputs["To Max"].default_value = 0.0
    L.new(sep.outputs["X"], map_.inputs["Value"])
    rp = N.new("ShaderNodeValToRGB")
    el = rp.color_ramp.elements
    el[0].position = 0.0
    el[0].color = (*cor_halo, 1.0)
    el[1].position = 1.0
    el[1].color = (*cor_miolo, 1.0)
    L.new(map_.outputs["Result"], rp.inputs[0])
    em = N.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = forca * GAIN
    L.new(rp.outputs["Color"], em.inputs["Color"])
    
    # Suaviza a opacidade do feixe para que os personagens e as asas fiquem visiveis atraves da luz
    alpha_mul = N.new("ShaderNodeMath")
    alpha_mul.operation = "MULTIPLY"
    alpha_mul.inputs[1].default_value = 0.35
    L.new(map_.outputs["Result"], alpha_mul.inputs[0])
    
    _fim(m, em, alpha_mul.outputs["Value"], N)
    return m

M = {}

def mats():
    M["ref_c"] = mat_ref("CL_ref_clerigo", (0.55, 0.52, 0.42))
    M["ref_a"] = mat_ref("CL_ref_aliado", (0.20, 0.36, 0.60))
    M["ref_i"] = mat_ref("CL_ref_inimigo", (0.50, 0.14, 0.11))
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
        M["spr_estrela_" + c] = mat_tex("CL_spr_estrela_" + c, "clerigo_estrela.png", t, 3.8)
        M["spr_cruz_" + c] = mat_tex("CL_spr_cruz_" + c, "clerigo_cruz.png", t, 3.0)
        M["cruz_flare_" + c] = mat_tex("CL_cruz_flare_" + c, "clerigo_cruz_flare.png", t, 4.5)
        M["leque_" + c] = mat_tex("CL_leque_" + c, "clerigo_leque.png", t, 2.8)
    for c, t in (("o", OURO), ("v", VERDE), ("a", AZUL_P), ("b", BRANCO)):
        M["esp_" + c] = mat_grad("CL_esp_" + c, [(0.0, (1.0, 1.0, 0.98)), (0.45, t), (1.0, tuple(x * 0.55 for x in t))], 3.8, 1.0, 0.9)
    M["halo_v"] = mat_vidro("CL_halo_v", (0.06, 0.9, 0.45), (0.88, 1.0, 0.92), 1.5, 0.22)
    M["halo_o"] = mat_vidro("CL_halo_o", (1.0, 0.75, 0.2), (1.0, 0.98, 0.85), 1.5, 0.22)
    # Material especial das Asas Angelicais: branco celestial radiante com reflexo dourado suave
    M["asa_luz"] = mat_grad("CL_asa_luz", [(0.0, (1.0, 1.0, 1.0)), (0.5, (1.0, 0.96, 0.88)), (1.0, (1.0, 0.85, 0.42))], 3.4, 0.6, 0.95)

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
            lp[uvl].uv = (v.x / (2 * r_ext) + 0.5, v.y / (2 * r_ext) + 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_toro(R, r, segs_u=32, segs_v=12):
    """Toro circular elegante para aneis de energia e orbitas celestiais"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    verts = []
    for i in range(segs_u):
        u = 2 * math.pi * i / segs_u
        cos_u, sin_u = math.cos(u), math.sin(u)
        linha = []
        for j in range(segs_v):
            v = 2 * math.pi * j / segs_v
            cos_v, sin_v = math.cos(v), math.sin(v)
            x = (R + r * cos_v) * cos_u
            y = (R + r * cos_v) * sin_u
            z = r * sin_v
            linha.append(bm.verts.new((x, y, z)))
        verts.append(linha)
    for i in range(segs_u):
        i2 = (i + 1) % segs_u
        for j in range(segs_v):
            j2 = (j + 1) % segs_v
            f = bm.faces.new((verts[i][j], verts[i2][j], verts[i2][j2], verts[i][j2]))
            for lp in f.loops:
                lp[uvl].uv = (i / segs_u, j / segs_v)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_cruz_facetada(s=0.6, esp=0.08, haste_longa=False):
    """Cruz 3D Facetada e vertical (plano XZ, espessura Y). haste_longa=True alonga a parte inferior para se fincar no chao."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    w = s * 0.10     # largura elegante e fina dos bracos
    Zup = s * 0.36   # braco superior
    Zdown = s * (0.92 if haste_longa else 0.52) # haste inferior bem mais longa e esbelta
    Xarm = s * 0.35  # bracos laterais
    
    perim_2d = [
        (w, -w), (Xarm, -w), (Xarm, w), (w, w),
        (w, Zup), (-w, Zup), (-w, w), (-Xarm, w),
        (-Xarm, -w), (-w, -w), (-w, -Zdown), (w, -Zdown)
    ]
    
    v_f = [bm.verts.new((x, esp * 0.25, z)) for x, z in perim_2d]
    v_v = [bm.verts.new((x, -esp * 0.25, z)) for x, z in perim_2d]
    
    # Cristas em Y (espinha facetada em diamante)
    c_f = bm.verts.new((0, esp * 0.65, 0))
    top_f = bm.verts.new((0, esp * 0.3, Zup))
    bot_f = bm.verts.new((0, esp * 0.3, -Zdown))
    esq_f = bm.verts.new((-Xarm, esp * 0.3, 0))
    dir_f = bm.verts.new((Xarm, esp * 0.3, 0))
    
    c_v = bm.verts.new((0, -esp * 0.65, 0))
    top_v = bm.verts.new((0, -esp * 0.3, Zup))
    bot_v = bm.verts.new((0, -esp * 0.3, -Zdown))
    esq_v = bm.verts.new((-Xarm, -esp * 0.3, 0))
    dir_v = bm.verts.new((Xarm, -esp * 0.3, 0))
    
    # Faces frente (+Y)
    bm.faces.new((c_f, v_f[0], v_f[1], dir_f))
    bm.faces.new((c_f, dir_f, v_f[2], v_f[3]))
    bm.faces.new((c_f, v_f[3], v_f[4], top_f))
    bm.faces.new((c_f, top_f, v_f[5], v_f[6]))
    bm.faces.new((c_f, v_f[6], v_f[7], esq_f))
    bm.faces.new((c_f, esq_f, v_f[8], v_f[9]))
    bm.faces.new((c_f, v_f[9], v_f[10], bot_f))
    bm.faces.new((c_f, bot_f, v_f[11], v_f[0]))
    
    # Faces verso (-Y)
    bm.faces.new((c_v, dir_v, v_v[1], v_v[0]))
    bm.faces.new((c_v, v_v[3], v_v[2], dir_v))
    bm.faces.new((c_v, top_v, v_v[4], v_v[3]))
    bm.faces.new((c_v, v_v[6], v_v[5], top_v))
    bm.faces.new((c_v, esq_v, v_v[7], v_v[6]))
    bm.faces.new((c_v, v_v[9], v_v[8], esq_v))
    bm.faces.new((c_v, bot_v, v_v[10], v_v[9]))
    bm.faces.new((c_v, v_v[0], v_v[11], bot_v))
    
    # Laterais (12 quads)
    for i in range(12):
        j = (i + 1) % 12
        bm.faces.new((v_f[i], v_f[j], v_v[j], v_v[i]))
        
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_asa_completa(lado=1):
    """Asa Angelical Majestosa multi-camadas de penas reais fanned (serafim / alta fantasia)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    
    # Penas: (comprimento, largura, curvatura, angulo_graus, tilt_graus, pos_base)
    penas = [
        # Primarias superiores (penas de voo longas na ponta da asa)
        (2.6, 0.26, 0.35, 72, 10, Vector((0, 0, 0.3))),
        (2.4, 0.26, 0.32, 58, 8, Vector((0, 0, 0.25))),
        (2.1, 0.25, 0.30, 44, 6, Vector((0, 0, 0.20))),
        (1.8, 0.24, 0.26, 30, 4, Vector((0, 0, 0.15))),
        (1.5, 0.22, 0.22, 16, 2, Vector((0, 0, 0.10))),
        (1.2, 0.20, 0.18, 2, 0, Vector((0, 0, 0.05))),
        # Secundarias (corpo intermediario da asa)
        (1.6, 0.25, 0.24, 52, 18, Vector((0, -0.05, 0.15))),
        (1.4, 0.24, 0.22, 38, 16, Vector((0, -0.05, 0.10))),
        (1.2, 0.22, 0.18, 24, 14, Vector((0, -0.05, 0.05))),
        (1.0, 0.20, 0.15, 10, 12, Vector((0, -0.05, 0.0))),
        # Coberturas menores do ombro (base macia na raiz)
        (0.9, 0.22, 0.14, 65, 25, Vector((0, -0.08, 0.20))),
        (0.8, 0.20, 0.12, 45, 22, Vector((0, -0.08, 0.12))),
        (0.65, 0.18, 0.10, 25, 20, Vector((0, -0.08, 0.05)))
    ]
    
    for comp, larg, curv, ang_deg, tilt_deg, p_base in penas:
        ang = math.radians(ang_deg)
        tilt = math.radians(tilt_deg)
        segs = 8
        v_cen, v_esq, v_dir = [], [], []
        
        rot_z = Matrix.Rotation(ang * lado, 4, 'Z')
        rot_x = Matrix.Rotation(tilt, 4, 'X')
        mat = rot_z @ rot_x
        
        for i in range(segs + 1):
            t = i / segs
            y_local = t * comp
            x_local = curv * (t ** 1.6) * lado
            z_local = 0.04 * math.sin(t * math.pi)
            
            w = larg * math.sin(t * math.pi * 0.9) * (1.0 - t * 0.25)
            
            p_c = mat @ Vector((x_local, y_local, z_local + 0.015)) + p_base
            p_e = mat @ Vector((x_local - w * lado, y_local, z_local - 0.015)) + p_base
            p_d = mat @ Vector((x_local + w * 0.7 * lado, y_local, z_local - 0.015)) + p_base
            
            v_cen.append(bm.verts.new(p_c))
            v_esq.append(bm.verts.new(p_e))
            v_dir.append(bm.verts.new(p_d))
            
        for i in range(segs):
            if lado == 1:
                bm.faces.new((v_cen[i], v_esq[i], v_esq[i+1], v_cen[i+1]))
                bm.faces.new((v_cen[i], v_cen[i+1], v_dir[i+1], v_dir[i]))
            else:
                bm.faces.new((v_cen[i], v_cen[i+1], v_esq[i+1], v_esq[i]))
                bm.faces.new((v_cen[i], v_dir[i], v_dir[i+1], v_cen[i+1]))
                
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_cristal_lapidado(comp, r, lados=8, chanfro=0.25):
    """Cristal pontiagudo com multiplas facetas lapidadas nas extremidades"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    p_topo = bm.verts.new((0, 0, comp))
    p_base = bm.verts.new((0, 0, 0))
    z_m1 = comp * chanfro
    z_m2 = comp * (1.0 - chanfro)
    anel1 = [bm.verts.new((r * math.cos(2 * math.pi * i / lados), r * math.sin(2 * math.pi * i / lados), z_m1)) for i in range(lados)]
    anel2 = [bm.verts.new((r * math.cos(2 * math.pi * i / lados), r * math.sin(2 * math.pi * i / lados), z_m2)) for i in range(lados)]
    for i in range(lados):
        j = (i + 1) % lados
        bm.faces.new((p_base, anel1[j], anel1[i]))
        bm.faces.new((anel1[i], anel1[j], anel2[j], anel2[i]))
        bm.faces.new((p_topo, anel2[i], anel2[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_obelisco(r_base, r_topo, altura, lados=8):
    """Obelisco cristalino conico com base mais larga e ponta afilada"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    vb = [bm.verts.new((r_base * math.cos(2 * math.pi * i / lados), r_base * math.sin(2 * math.pi * i / lados), 0)) for i in range(lados)]
    vt = [bm.verts.new((r_topo * math.cos(2 * math.pi * i / lados), r_topo * math.sin(2 * math.pi * i / lados), altura)) for i in range(lados)]
    pt = bm.verts.new((0, 0, altura + r_topo * 1.5))
    for i in range(lados):
        j = (i + 1) % lados
        bm.faces.new((vb[i], vb[j], vt[j], vt[i]))
        bm.faces.new((vt[i], vt[j], pt))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_cupula(R, segs=32, anéis=8):
    """Hemisferio de luz translucidocúpula sagrada suave"""
    bm = bmesh.new()
    topo = bm.verts.new((0, 0, R))
    layers = []
    for k in range(1, anéis + 1):
        phi = (math.pi / 2) * (1.0 - k / anéis)
        z = R * math.sin(phi)
        r_k = R * math.cos(phi)
        layer = [bm.verts.new((r_k * math.cos(2 * math.pi * i / segs), r_k * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)]
        layers.append(layer)
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((topo, layers[0][j], layers[0][i]))
    for k in range(len(layers) - 1):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((layers[k][i], layers[k][j], layers[k + 1][j], layers[k + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def bm_mandala_suave(R):
    """Mandala magica suave com aneis concentricos (sem dentes de engrenagem)"""
    bm = bmesh.new()
    segs = 48
    v_c = [bm.verts.new((R * 0.3 * math.cos(2 * math.pi * i / segs), R * 0.3 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    v_m = [bm.verts.new((R * 0.7 * math.cos(2 * math.pi * i / segs), R * 0.7 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    v_e = [bm.verts.new((R * 1.0 * math.cos(2 * math.pi * i / segs), R * 1.0 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((v_c[i], v_m[i], v_m[j], v_c[j]))
        bm.faces.new((v_m[i], v_e[i], v_e[j], v_m[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

# Auxiliares de Cena e Animacao
def esc(o, pts):
    for f, s in pts:
        o.scale = (max(s, 1e-4),) * 3 if not isinstance(s, tuple) else tuple(max(x, 1e-4) for x in s)
        o.keyframe_insert("scale", frame=f)

def anim(o, prop, f0, f1, fn, passo=1):
    for f in range(f0, f1 + 1, passo):
        t = (f - f0) / max(f1 - f0, 1)
        val = fn(t)
        setattr(o, prop, val)
        o.keyframe_insert(prop, frame=f)

def pisca(luz_obj, pts):
    for f, pot in pts:
        luz_obj.data.energy = pot
        luz_obj.data.keyframe_insert("energy", frame=f)

def base_cena(suf, frame_end):
    nome = "CLERIGO_" + suf
    sc = bpy.data.scenes.get(nome)
    if sc:
        for o in list(sc.objects):
            try:
                bpy.data.objects.remove(o, do_unlink=True)
            except Exception:
                pass
    else:
        sc = bpy.data.scenes.new(nome)
    sc.frame_start = 1
    sc.frame_end = frame_end
    sc.render.fps = 30
    col = sc.collection
    ref = col

    # Chao escuro de referencia
    me = bpy.data.meshes.new("chao")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=24.0)
    bm.to_mesh(me)
    bm.free()
    chao = bpy.data.objects.new("chao", me)
    chao.location = (0, 6.0, 0)
    col.objects.link(chao)
    m_ch = mat_ref("CL_chao", (0.05, 0.05, 0.07))
    me.materials.append(m_ch)

    # Clerigo de referencia
    c = caixa(ref, "clerigo_ref_1.7m", (0, 0, 0.85), (0.5, 0.35, 1.7), mat_ref("CL_ref_c", CINZA_REF))

    # Luz de preenchimento suave
    sol = bpy.data.lights.new("sol", "SUN")
    sol.energy = 0.8
    sol.color = (0.95, 0.95, 1.0)
    osol = bpy.data.objects.new("sol", sol)
    osol.rotation_euler = (math.radians(55), math.radians(20), math.radians(-35))
    col.objects.link(osol)

    return sc, col, ref

def caixa(col, nome, pos, dim, mat):
    me = bpy.data.meshes.new("CL_" + nome)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    ob.location = pos
    ob.scale = dim
    col.objects.link(ob)
    return ob

def luz(col, nome, tipo, pos, energia, cor):
    l = bpy.data.lights.new("CL_" + nome, tipo)
    l.energy = energia
    l.color = cor
    ob = bpy.data.objects.new(nome, l)
    ob.location = pos
    col.objects.link(ob)
    return ob

def sprite(col, nome, mat, tam, pos):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    h = tam * 0.5
    v0 = bm.verts.new((-h, 0, -h))
    v1 = bm.verts.new(( h, 0, -h))
    v2 = bm.verts.new(( h, 0,  h))
    v3 = bm.verts.new((-h, 0,  h))
    f = bm.faces.new((v0, v1, v2, v3))
    f.loops[0][uvl].uv = (0, 0)
    f.loops[1][uvl].uv = (1, 0)
    f.loops[2][uvl].uv = (1, 1)
    f.loops[3][uvl].uv = (0, 1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = para_obj(col, nome, bm, mat)
    ob.location = pos
    k = ob.constraints.new("TRACK_TO")
    k.name = "CL_BB"
    k.track_axis = "TRACK_Y"
    k.up_axis = "UP_Z"
    return ob

def apunta(ob, alvo):
    d = Vector(alvo) - ob.location
    ob.rotation_euler = (math.atan2(d.z, math.sqrt(d.x**2 + d.y**2)), 0, -math.atan2(d.x, d.y))

def camera(sc, col, nome, pos, alvo, fov=32):
    c = bpy.data.cameras.new("CL_" + nome)
    c.lens = fov
    ob = bpy.data.objects.new("CL_" + sc.name + "_" + nome, c)
    ob.location = pos
    col.objects.link(ob)
    alv = bpy.data.objects.new("CL_" + sc.name + "_" + nome + "_alvo", None)
    alv.location = alvo
    col.objects.link(alv)
    k = ob.constraints.new("TRACK_TO")
    k.target = alv
    k.track_axis = "TRACK_NEGATIVE_Z"
    k.up_axis = "UP_Y"
    return ob

def livro(col, pos, f_abre, f_fecha):
    esc_ = 1.3
    raiz = bpy.data.objects.new("livro", None)
    col.objects.link(raiz)
    raiz.location = pos
    raiz.scale = (esc_,) * 3
    caixa(col, "livro_lombada", (0, 0, 0), (0.05, 0.02, 0.28), M["livro_capa"]).parent = raiz
    gl = sprite(col, "livro_brilho", M["spr_estrela_o"], 1.5 * esc_, (0, 0.12, 0))
    gl.parent = raiz
    esc(gl, [(f_abre - 1, 0.0), (f_abre + 4, 1.0), (f_fecha - 4, 1.0), (f_fecha, 0.0)])
    return raiz

# ================================================================== 0. ATAQUE BASICO: CRUZ DE LUZ PURA / CROSS FLARE (C0)
def montar_basico():
    random.seed(7)
    F_FIM = 76
    sc, col, ref = base_cena("BASICO", F_FIM)
    caixa(ref, "aliado_ref", (0.7, 5.6, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_ref", (0, 12.0, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, F_FIM - 6)

    raiz = bpy.data.objects.new("cruz_raiz", None)
    col.objects.link(raiz)

    # A propria Cruz de Luz e feita do acabamento refinado de pura luz (Cross Flare / Lens Flare Sagrado)
    cruz_luz = sprite(col, "cruz_luz_flare", M["cruz_flare_o"], 2.4, (0, 0, 0))
    cruz_luz.parent = raiz

    # Ponto de luz no centro da cruz emitindo iluminacao dourada no cenario (alinhado a intersecao)
    luz_ = luz(col, "cruz_luz", "POINT", (0, 0.05, 0.288), 0, (1.0, 0.95, 0.75))
    luz_.parent = raiz

    F0, F1 = 10, 46
    Y0, Y1 = 1.2, 12.0
    raiz.location = (0, Y0, 1.25)
    raiz.keyframe_insert("location", frame=F0)
    raiz.location = (0, Y1 - 0.4, 1.25)
    raiz.keyframe_insert("location", frame=F1)
    esc(raiz, [(F0 - 1, 0.0), (F0 + 3, 1.0), (F1 - 1, 1.0), (F1, 0.0)])
    pisca(luz_, [(F0 - 1, 0), (F0 + 3, 600), (F1 - 1, 600), (F1, 0)])

    # Impacto no inimigo: clarao de luz sagrada e estrelas luminosas
    imp_est = sprite(col, "hit_est", M["spr_estrela_o"], 0.1, (0, 12.0, 1.25))
    esc(imp_est, [(F1 - 1, 0.0), (F1, 3.2), (F1 + 18, 0.0)])

    camera(sc, ref, "cam_lateral", (11.0, 6.0, 2.6), (0, 6.0, 1.5), 32)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.0, -2.5, 1.8), (0, 4.0, 1.3), 32)
    return sc

# ================================================================== 1. CURA MIRADA: CRUZ DE LUZ SAGRADA CAI DO CEU E SE FINCA (C1)
def montar_cura():
    random.seed(11)
    F_FIM = 216
    sc, col, ref = base_cena("S1_CURA", F_FIM)
    A = (-3.6, 10.5) # Posicao do aliado mirado
    caixa(ref, "aliado_ref_1.8m", (A[0], A[1], 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    caixa(ref, "inimigo_ref_1.8m", (4.2, 10.5, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, F_FIM - 8)

    # SEM COLUNA: A Cruz e pura luz radiosa que desce diretamente dos ceus
    cruz_raiz = bpy.data.objects.new("cruz_descida_raiz", None)
    col.objects.link(cruz_raiz)

    # Cruz de Luz Radiosa (Cross Flare esmeralda e ouro com proporcoes latinas nobres)
    cruz_cura = sprite(col, "cruz_cura_flare", M["cruz_flare_v"], 4.2, (0, 0, 0))
    cruz_cura.parent = cruz_raiz

    luz_cruz = luz(col, "cruz_cura_luz", "POINT", (0, 0.05, 0.504), 0, (0.5, 1.0, 0.75))
    luz_cruz.parent = cruz_raiz

    # Animacao: cai do ceu em pe e se finca no solo
    f_ini, f_finca = 16, 40
    # Desce de Z=10.0 ate Z=1.1 (a ponta inferior de luz finca no solo)
    cruz_raiz.location = (A[0], A[1], 10.0)
    cruz_raiz.keyframe_insert("location", frame=f_ini)
    cruz_raiz.location = (A[0], A[1], 1.1)
    cruz_raiz.keyframe_insert("location", frame=f_finca)
    # Permanece fincada no solo brilhando ate dissolver em luz
    cruz_raiz.location = (A[0], A[1], 1.1)
    cruz_raiz.keyframe_insert("location", frame=78)

    esc(cruz_raiz, [(f_ini - 1, 0.0), (f_ini + 3, 1.0), (f_finca, 1.0), (f_finca + 2, 1.12), (f_finca + 6, 1.0), (78, 1.0), (92, 0.0)])
    pisca(luz_cruz, [(f_ini - 1, 0), (f_ini + 3, 600), (f_finca, 1800), (f_finca + 8, 900), (78, 900), (92, 0)])

    # Ao se fincar no chao: anel sagrado de choque na base fincada e cupula de cura
    an_chao = para_obj(col, "ali_anel_fincado", bm_anel(0.2, 2.4, 48), M["marca_v"])
    an_chao.location = (A[0], A[1], 0.025)
    esc(an_chao, [(f_finca - 1, 0.0), (f_finca, 0.4), (f_finca + 8, 1.2), (f_finca + 40, 0.0)])

    cup = para_obj(col, "ali_cupula", bm_cupula(2.4, 32, 8), M["verde_vidro"])
    cup.location = (A[0], A[1], 0.02)
    esc(cup, [(f_finca - 1, 0.0), (f_finca + 4, 1.0), (f_finca + 32, 1.05), (f_finca + 48, 0.0)])

    # Sparkle estelar suave no ponto de impacto no chao
    fl_bencao = sprite(col, "cura_bencao_est", M["spr_estrela_v"], 0.1, (A[0], A[1], 0.82))
    esc(fl_bencao, [(f_finca - 1, 0.0), (f_finca + 2, 3.5), (f_finca + 20, 0.0)])

    camera(sc, ref, "cam_lateral", (14.0, 4.0, 3.6), (0, 6.5, 1.8), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.4, -3.4, 2.0), (-0.4, 4.0, 1.2), 32)
    return sc

# ================================================================== 2. GLIFO DE CURA: SANTUARIO SAGRADO COM CRUZES DE LUZ (C2)
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

    # 1. Chao: Mandala sagrada suave com aneis concentricos (sem dentes de serra)
    mandala = para_obj(col, "glifo_mandala", bm_mandala_suave(RAIO), M["marca_v"])
    mandala.location = (C.x, C.y, 0.025)
    esc(mandala, [(F0 - 1, 0.0), (F0 + 8, 1.0), (F_SAI, 1.0), (F_SAI + 12, 0.0)])

    anel_ext = para_obj(col, "glifo_anel_ext", bm_anel(RAIO - 0.2, RAIO + 0.2, 48), M["ouro"])
    anel_ext.location = (C.x, C.y, 0.03)
    esc(anel_ext, [(F0 - 1, 0.0), (F0 + 6, 1.0), (F_SAI, 1.0), (F_SAI + 10, 0.0)])

    # 2. Cupula sagrada de cura translúcida
    cupula = para_obj(col, "glifo_cupula", bm_cupula(RAIO, 32, 10), M["verde_vidro"])
    cupula.location = (C.x, C.y, 0.02)
    esc(cupula, [(F0 + 4, 0.0), (F0 + 16, 1.0), (F_SAI - 6, 1.0), (F_SAI + 10, 0.0)])

    # 3. Cruz Central de Luz Sagrada flutuando no meio do Santuário
    cruz_centro = sprite(col, "glifo_cruz_centro", M["cruz_flare_v"], 3.2, (C.x, C.y, 1.8))
    esc(cruz_centro, [(F0 + 6, 0.0), (F0 + 18, 1.0), (F_SAI - 8, 1.0), (F_SAI + 10, 0.0)])
    luz_centro = luz(col, "glifo_luz_centro", "POINT", (C.x, C.y, 1.8), 0, (0.5, 1.0, 0.75))
    pisca(luz_centro, [(F0 + 6, 0), (F0 + 18, 800), (F_SAI - 8, 800), (F_SAI + 10, 0)])

    # 4. Nos 6 vértices: Pilares de Luz Translúcida coroados por Mini Cruzes de Luz Radiantes
    for i in range(6):
        ang = 2 * math.pi * i / 6
        px = C.x + math.cos(ang) * (RAIO - 0.3)
        py = C.y + math.sin(ang) * (RAIO - 0.3)
        mat_pil = M["feixe_v"] if i % 2 == 0 else M["feixe_o"]

        # Pilar de luz etérea translúcida (conforme referência de alta qualidade)
        pilar = para_obj(col, "glifo_pilar_%d" % i, bm_obelisco(0.18, 0.12, 3.6, 16), mat_pil)
        pilar.location = (px, py, 0)
        esc(pilar, [(F0 + i * 2, (1, 1, 1e-3)), (F0 + 10 + i * 2, (1, 1, 1.0)), (F_SAI, (1, 1, 1.0)), (F_SAI + 8, (0.2, 0.2, 1e-3))])

        # Mini Cruz de Luz Radiante flutuando no topo de cada pilar
        mat_crz = M["cruz_flare_v"] if i % 2 == 0 else M["cruz_flare_o"]
        crz_pil = sprite(col, "glifo_crz_pil_%d" % i, mat_crz, 1.4, (px, py, 3.8))
        esc(crz_pil, [(F0 + 4 + i * 2, 0.0), (F0 + 12 + i * 2, 1.0), (F_SAI, 1.0), (F_SAI + 8, 0.0)])

    # 5. Pulsos de cura sincronizados com flashes da Cruz Central
    for p_idx, fp in enumerate(F_PULSOS):
        pulso = para_obj(col, "pulso_anel%d" % p_idx, bm_anel(0.4, 0.9, 36), M["marca_v"])
        pulso.location = (C.x, C.y, 0.04)
        esc(pulso, [(fp - 1, 0.0), (fp, 0.5), (fp + 16, RAIO * 1.1), (fp + 20, 0.0)])

    camera(sc, ref, "cam_alto", (0.0, 0.5, 9.5), (0, 9.0, 1.5), 32)
    camera(sc, ref, "cam_lateral", (11.0, 9.0, 3.2), (0, 9.0, 1.5), 32)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (3.2, -2.5, 2.0), (0, 8.5, 1.5), 32)
    return sc

# ================================================================== 3. ESCUDO ASTRAL: BARREIRA DE CRUZES DE LUZ PURA (C3)
def montar_escudo():
    random.seed(33)
    F_FIM = 176
    sc, col, ref = base_cena("S3_ESCUDO", F_FIM)
    caixa(ref, "inimigo_ref", (0, 7.5, 0.9), (0.6, 0.4, 1.8), M["ref_i"])
    livro(col, (0.55, 0.3, 1.25), 2, 36)

    F_CAST = 12
    F_ATIVO = 28
    F_GOLPE = 84
    F_SAI = 156

    raiz_esc = bpy.data.objects.new("escudo_raiz", None)
    col.objects.link(raiz_esc)
    raiz_esc.location = (0, 0, 1.1)

    # 6 Cruzes de Luz Radiosa Astral orbitando em formacao hexagonal sagrada (sem blocos solidos)
    for i in range(6):
        ang = 2 * math.pi * i / 6
        crz_esc = sprite(col, "escudo_crz_%d" % i, M["cruz_flare_a"], 1.6, (1.35 * math.cos(ang), 1.35 * math.sin(ang), 0))
        crz_esc.parent = raiz_esc

    # Anel toroidal etéreo de sustentação cósmica
    toro_base = para_obj(col, "toro_escudo_base", bm_toro(1.4, 0.025, 36, 8), M["ouro"])
    toro_base.parent = raiz_esc
    toro_base.location = (0, 0, -0.45)

    luz_esc = luz(col, "escudo_luz", "POINT", (0, 0, 0), 0, (0.4, 0.8, 1.0))
    luz_esc.parent = raiz_esc

    esc(raiz_esc, [(F_CAST, 0.0), (F_ATIVO, 1.0), (F_GOLPE, 1.0), (F_GOLPE + 4, 1.25), (F_GOLPE + 10, 1.0), (F_SAI, 1.0), (F_SAI + 14, 0.0)])
    pisca(luz_esc, [(F_CAST, 0), (F_ATIVO, 400), (F_GOLPE - 1, 400), (F_GOLPE, 2500), (F_GOLPE + 8, 400), (F_SAI, 400), (F_SAI + 14, 0)])
    anim(raiz_esc, "rotation_euler", F_ATIVO, F_SAI, lambda t: (0, 0, t * 1.5), 3)

    camera(sc, ref, "cam_lateral", (8.5, 3.5, 2.6), (0, 0, 1.2), 32)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (2.8, -3.2, 1.8), (0, 1.5, 1.2), 32)
    return sc

# ================================================================== 4. PURIFICACAO: CRUZ SAGRADA PURIFICADORA E COLUNA DE LUZ (C4)
def montar_purifica():
    random.seed(44)
    F_FIM = 168
    sc, col, ref = base_cena("S4_PURIFICA", F_FIM)
    caixa(ref, "aliado_debilitado", (0, 4.0, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 42)

    F0 = 18
    F_COL = 36
    F_FIM_EFEITO = 142

    col_luz = para_obj(col, "purif_coluna", bm_obelisco(1.2, 1.0, 10.0, 24), M["feixe_b"])
    col_luz.location = (0, 4.0, 0)
    esc(col_luz, [(F0, (1, 1, 1e-3)), (F_COL, (1.1, 1.1, 1.0)), (F_FIM_EFEITO, (1.1, 1.1, 1.0)), (F_FIM_EFEITO + 16, (0.2, 0.2, 1e-3))])

    # Cruz de Luz Pura Branca e Ouro flutuando majestosamente acima da cabeca (sem prismas maciços)
    cruz_purif = sprite(col, "purif_cruz_luz", M["cruz_flare_b"], 3.4, (0, 4.0, 3.0))
    esc(cruz_purif, [(F_COL - 2, 0.0), (F_COL + 6, 1.0), (F_FIM_EFEITO - 6, 1.0), (F_FIM_EFEITO + 6, 0.0)])
    
    luz_purif = luz(col, "purif_luz_ponto", "POINT", (0, 4.0, 3.0), 0, (1.0, 0.98, 0.85))
    pisca(luz_purif, [(F_COL - 2, 0), (F_COL + 6, 1200), (F_FIM_EFEITO - 6, 1200), (F_FIM_EFEITO + 6, 0)])

    camera(sc, ref, "cam_lateral", (9.5, 4.0, 2.5), (0, 4.0, 1.5), 32)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (2.6, -2.6, 1.8), (0, 3.5, 1.3), 32)
    return sc

# ================================================================== 5. PRECE: CRUZES DE LUZ DOURADA SOBRE CADA ALIADO (C5)
def montar_prece():
    random.seed(55)
    F_FIM = 200
    sc, col, ref = base_cena("S5_PRECE", F_FIM)
    aliados = [(-2.2, 4.5), (2.0, 5.0), (-0.2, 7.8)]
    for i, (x, y) in enumerate(aliados):
        caixa(ref, "aliado_ref_%d" % i, (x, y, 0.9), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 70)

    F_G = 16
    F_SAI = 180

    # Mandala sagrada suave no piso sob o Clerigo (sem dentes de serra)
    mand = para_obj(col, "prece_mandala", bm_mandala_suave(3.2), M["marca"])
    mand.location = (0, 0, 0.025)
    esc(mand, [(F_G - 1, 0.0), (F_G + 14, 1.0), (F_SAI, 1.0), (F_SAI + 14, 0.0)])

    # Cruz de Luz Sagrada e Coluna Divina sobre CADA ALIADO
    for i, (x, y) in enumerate(aliados):
        fb = F_G + 20 + i * 6
        # Coluna de luz translúcida
        col_ali = para_obj(col, "prece_col%d" % i, bm_obelisco(0.8, 0.65, 8.0, 16), M["feixe_o"])
        col_ali.location = (x, y, 0)
        esc(col_ali, [(fb - 1, (1, 1, 1e-3)), (fb + 8, (1, 1, 1.0)), (F_SAI - 16, (1, 1, 1.0)), (F_SAI, (0.3, 0.3, 1e-3))])

        # Cruz de Luz Radiante dourada flutuando sobre a cabeca de cada aliado
        crz_ali = sprite(col, "prece_crz_%d" % i, M["cruz_flare_o"], 2.5, (x, y, 2.6))
        esc(crz_ali, [(fb - 1, 0.0), (fb + 6, 1.0), (F_SAI - 10, 1.0), (F_SAI, 0.0)])

    camera(sc, ref, "cam_alto", (0.0, -12.0, 11.5), (0, 0.5, 0.8), 30)
    sc.camera = camera(sc, ref, "cam_do_clerigo", (2.2, -3.4, 2.0), (0.0, 3.0, 1.4), 28)
    return sc

# ================================================================== 6. RESSURREICAO: CRUZ SAGRADA DE GLORIA E ASAS ANGELICAIS (C6)
def montar_ressur():
    random.seed(66)
    F_FIM = 252
    A = Vector((0.0, 8.0, 0.0))
    F_CLIM = 95
    sc, col, ref = base_cena("S6_RESSUR", F_FIM)
    ali = caixa(ref, "aliado_ref_1.8m", (A.x, A.y, 0.3), (0.6, 0.4, 1.8), M["ref_a"])
    livro(col, (0.55, 0.3, 1.25), 2, 112)

    ali.rotation_euler = (math.pi / 2, 0, 0)
    ali.location = (A.x, A.y, 0.2)
    ali.keyframe_insert("location", frame=1)
    ali.keyframe_insert("rotation_euler", frame=1)
    for f, z, rot in ((F_CLIM - 16, 0.2, math.pi / 2), (F_CLIM + 12, 1.5, 0.35), (F_CLIM + 36, 1.1, 0.0), (F_CLIM + 50, 0.9, 0.0)):
        ali.location = (A.x, A.y, z)
        ali.rotation_euler = (rot, 0, 0)
        ali.keyframe_insert("location", frame=f)
        ali.keyframe_insert("rotation_euler", frame=f)

    # 1. Chao Sagrado Suave (SEM engrenagens, SEM dentes de serra, SEM girar feito serra eletrica)
    circulo_chao = para_obj(col, "ressur_circulo_suave", bm_anel(0.2, 2.8, 48), M["gh_o"])
    circulo_chao.location = (A.x, A.y, 0.025)
    esc(circulo_chao, [(14, 0.0), (32, 1.0), (F_CLIM + 70, 1.0), (F_CLIM + 90, 0.0)])
    anim(circulo_chao, "rotation_euler", 14, F_CLIM + 90, lambda t: (0, 0, t * 0.15), 4)

    # 6 Pilares de luz translucida eterea nos vertices coroados por Mini Cruzes de Luz
    for k in range(6):
        ang = k * math.pi / 3
        px = A.x + math.cos(ang) * 2.6
        py = A.y + math.sin(ang) * 2.6
        pilar_luz = para_obj(col, "ressur_pilar_%d" % k, bm_obelisco(0.18, 0.14, 4.0, 16), M["feixe_v"] if k % 2 == 0 else M["feixe_o"])
        pilar_luz.location = (px, py, 0)
        esc(pilar_luz, [(22 + k * 2, (1, 1, 1e-3)), (38 + k * 2, (1, 1, 1.0)), (F_CLIM + 60, (1, 1, 1.0)), (F_CLIM + 78, (0.2, 0.2, 1e-3))])
        
        # Mini Cruz de Luz no topo dos pilares
        crz_pil = sprite(col, "ressur_crz_pil_%d" % k, M["cruz_flare_o"], 1.3, (px, py, 4.2))
        esc(crz_pil, [(26 + k * 2, 0.0), (40 + k * 2, 1.0), (F_CLIM + 60, 1.0), (F_CLIM + 76, 0.0)])

    # 2. Monumental coluna de luz celestial descendo do ceu
    feixe_ceu = para_obj(col, "ressur_feixe_ceu", bm_obelisco(1.5, 1.3, 16.0, 24), M["feixe_b"])
    feixe_ceu.location = (A.x, A.y, 0)
    esc(feixe_ceu, [(F_CLIM - 32, (1, 1, 1e-3)), (F_CLIM - 10, (1.1, 1.1, 1.0)), (F_CLIM + 48, (1.1, 1.1, 1.0)), (F_CLIM + 66, (0.3, 0.3, 1e-3))])

    # 3. ASAS ANGELICAIS MAJESTOSAS DE PENAS REAIS (Penas em camadas fanned estilo serafim)
    for lado, l_nome in ((-1, "esq"), (1, "dir")):
        asa = para_obj(col, "asa_angelical_" + l_nome, bm_asa_completa(lado), M["asa_luz"])
        asa.location = (A.x + lado * 0.28, A.y + 0.32, 1.35)

        for f, z_off in ((1, 0.2), (F_CLIM - 16, 0.2), (F_CLIM + 12, 1.5), (F_CLIM + 36, 1.1), (F_CLIM + 50, 0.9)):
            asa.location = (A.x + lado * 0.28, A.y + 0.32, z_off + 0.35)
            asa.keyframe_insert("location", frame=f)

        rot_fechada = (math.radians(-10), math.radians(lado * 15), math.radians(lado * 10))
        rot_aberta = (math.radians(-18), math.radians(lado * 55), math.radians(lado * 28))
        rot_bater = (math.radians(-15), math.radians(lado * 65), math.radians(lado * 35))

        for f, r in ((F_CLIM - 8, rot_fechada), (F_CLIM + 16, rot_aberta), (F_CLIM + 34, rot_bater), (F_CLIM + 56, rot_aberta), (F_CLIM + 80, rot_fechada)):
            asa.rotation_euler = r
            asa.keyframe_insert("rotation_euler", frame=f)

        esc(asa, [(F_CLIM - 10, 0.0), (F_CLIM + 6, 1.0), (F_CLIM + 65, 1.0), (F_CLIM + 84, 0.0)])

    # 4. Cruz Monumental de Ressurreicao no peito do aliado ao despertar
    cruz_ressur = sprite(col, "ressur_cruz_gloria", M["cruz_flare_o"], 4.2, (A.x, A.y, 1.6))
    for f, z_cruz in ((1, 0.5), (F_CLIM - 16, 0.5), (F_CLIM + 12, 1.8), (F_CLIM + 36, 1.4), (F_CLIM + 50, 1.2)):
        cruz_ressur.location = (A.x, A.y, z_cruz)
        cruz_ressur.keyframe_insert("location", frame=f)
    esc(cruz_ressur, [(F_CLIM - 6, 0.0), (F_CLIM + 12, 1.2), (F_CLIM + 20, 1.0), (F_CLIM + 60, 1.0), (F_CLIM + 80, 0.0)])

    fl_despertar = sprite(col, "despertar_estrela", M["spr_estrela_o"], 0.1, (A.x, A.y, 1.35))
    esc(fl_despertar, [(F_CLIM + 4, 0.0), (F_CLIM + 14, 3.2), (F_CLIM + 36, 0.0)])

    sc.camera = camera(sc, ref, "cam_frontal", (0.0, 3.2, 1.8), (0, 8.0, 1.4), 32)
    camera(sc, ref, "cam_lateral", (12.0, 4.0, 3.6), (0, 8.0, 2.2), 30)
    camera(sc, ref, "cam_aliado", (4.8, 3.8, 2.6), (0, 8.0, 1.6), 32)
    camera(sc, ref, "cam_do_clerigo", (3.4, -3.2, 2.2), (0, 6.5, 1.8), 30)
    return sc

def retarget(sc):
    pass

def _vai(sc):
    pass

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

# Registra o painel interativo de skills na aba "Skills" da barra lateral (tecla N)
try:
    caminho_p = "C:/TECX SOFTHOUSE/IS ONLINE/prototipo/tools/blender_fx/painel_skills_mago.py"
    if os.path.exists(caminho_p):
        exec(compile(open(caminho_p, encoding="utf-8").read(), "painel", "exec"))
    for a in bpy.context.window.screen.areas:
        if a.type == "VIEW_3D":
            for sp in a.spaces:
                if sp.type == "VIEW_3D":
                    sp.show_region_ui = True
                    sp.shading.type = "MATERIAL"
except Exception as e:
    print("Nota sobre painel:", e)

print("Clerigo estilizado pronto! Cenas geradas:", [(s.name, len(s.objects), s.frame_end) for s in cenas])
