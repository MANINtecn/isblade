"""Mago - skill 1: SHURIKEN DE VENTO (rapida, na mira). Monta tudo no Blender: corpo 3D da estrela, aura (malha de redemoinho do L2), rastro em helice e impacto.
Uso:  blender -b -P mago_skill1_shuriken.py        -> salva prototipo/assets/personagens/mage_skills.blend  (PREVIA=<pasta> tambem renderiza quadros)
48 fps. Voo: frames 1-30 (a estrela anda 20 m no eixo +Y, 12 m/s); impacto: frame 81 em diante (sumindo ate 101).
Paleta: nucleo branco-quente, jade palido, aco azulado, poeira cinza-areia. Sem rosa/lilas."""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
random.seed(7)
RAIZ = r"C:/TECX SOFTHOUSE/IS ONLINE/"
SAIDA = os.environ.get("SAIDA", RAIZ + "prototipo/assets/personagens/mage_skills.blend")        # SAIDA=<caminho> grava em outro arquivo (nao sobrescreve o que esta aberto)
L2MESH = RAIZ + "trabalho_l2fx/export_bruto/LineageEffectsStaticmeshes/StaticMesh/"
L2TEX = RAIZ + "trabalho_l2fx/export_bruto/LineageEffectsTextures/Texture/"
F0, F_HIT, F_FIM = 1, 81, 101       # voo de 20 m em 80 quadros = 1,667 s a 48 fps = 12 m/s (da tempo de ver e desviar)
DIST = 20.0
N_VOO = F_HIT - F0

bpy.ops.wm.read_factory_settings(use_empty=True)
try: bpy.ops.preferences.addon_enable(module="bl_ext.user_default.io_scene_psk_psa")
except Exception as e: print("addon psk:", e)
sc = bpy.context.scene; sc.name = "MAGO_SKILL1"
sc.render.fps = 48; sc.frame_start = 1; sc.frame_end = F_FIM
sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = 960; sc.render.resolution_y = 540
sc.world = bpy.data.worlds.new("mundo"); sc.world.use_nodes = True
bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.010, 0.014, 0.024, 1); bg.inputs[1].default_value = 1.0
sc.view_settings.view_transform = "Standard"
col = bpy.data.collections.new("FX_Mago_S1"); sc.collection.children.link(col)

def link(o): col.objects.link(o); return o
def kf(o, path, frame, value, idx=-1):
    setattr(o, path, value) if idx < 0 else None
    o.keyframe_insert(path, frame=frame, index=idx)

# ------------------------------------------------------------------ materiais
def mat_base(nome):
    m = bpy.data.materials.new(nome); m.use_nodes = True; m.node_tree.nodes.clear()
    try: m.surface_render_method = "BLENDED"
    except Exception: pass
    m.use_backface_culling = False
    return m
def mat_aco():
    """aco claro azulado + brilho de borda jade (fresnel) + nucleo quente: o corpo da estrela"""
    m = bpy.data.materials.new("S1_aco"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.74, 0.84, 0.90, 1); b.inputs["Metallic"].default_value = 0.92; b.inputs["Roughness"].default_value = 0.24
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0, 0, 0, 1); ramp.color_ramp.elements[1].color = (0.55, 1.0, 0.86, 1)
    ramp.color_ramp.elements[0].position = 0.35
    nt.links.new(lw.outputs["Facing"], ramp.inputs[0]); b.inputs["Emission Strength"].default_value = 2.6
    # a raiz das laminas esquenta (branco-jade) conforme chega perto do buraco negro (distancia ao centro, em coordenadas do objeto)
    N = nt.nodes; tc = N.new("ShaderNodeTexCoord"); vl = N.new("ShaderNodeVectorMath"); vl.operation = "LENGTH"
    mr = N.new("ShaderNodeMapRange"); mr.inputs[1].default_value = 0.10; mr.inputs[2].default_value = 0.60; mr.inputs[3].default_value = 1.0; mr.inputs[4].default_value = 0.0; mr.clamp = True
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 1.6
    mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs[7].default_value = (0.92, 1.0, 0.95, 1)
    ml = N.new("ShaderNodeMath"); ml.operation = "MULTIPLY_ADD"; ml.inputs[1].default_value = 9.0; ml.inputs[2].default_value = 2.6
    nt.links.new(tc.outputs["Object"], vl.inputs[0]); nt.links.new(vl.outputs["Value"], mr.inputs[0]); nt.links.new(mr.outputs[0], pw.inputs[0])
    nt.links.new(ramp.outputs[0], mx.inputs[6]); nt.links.new(pw.outputs[0], mx.inputs[0]); nt.links.new(mx.outputs[2], b.inputs["Emission Color"])
    nt.links.new(pw.outputs[0], ml.inputs[0]); nt.links.new(ml.outputs[0], b.inputs["Emission Strength"])
    return m
def mat_fx(nome, quente, jade, forca=5.0, ruido=6.0, cauda=True, borda=False):
    """tubo/faixa de vento: u = ao longo (0 cabeca .. 1 cauda); cor quente->jade, alfa pelo ruido e pela cauda"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    out = N.new("ShaderNodeOutputMaterial"); mix = N.new("ShaderNodeMixShader"); tr = N.new("ShaderNodeBsdfTransparent"); em = N.new("ShaderNodeEmission")
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = ruido; nz.inputs["Detail"].default_value = 4
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*quente, 1); ramp.color_ramp.elements[1].color = (*jade, 1)
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[1].position = 0.7
    rg = N.new("ShaderNodeMapRange"); rg.inputs[1].default_value = 0.0; rg.inputs[2].default_value = 1.0; rg.inputs[3].default_value = 1.0; rg.inputs[4].default_value = 0.0
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 1.4
    cr = N.new("ShaderNodeMath"); cr.operation = "MULTIPLY"; cr.inputs[1].default_value = 1.15
    nt.links.new(tc.outputs["UV"], sep.inputs[0]); nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nt.links.new(sep.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = forca
    nt.links.new(sep.outputs[0], rg.inputs[0]); nt.links.new(rg.outputs[0], pw.inputs[0])
    nt.links.new(pw.outputs[0], mul.inputs[0]); nt.links.new(nz.outputs["Fac"], cr.inputs[0]); nt.links.new(cr.outputs[0], mul.inputs[1]) if cauda else None
    if borda:                                      # fita: o alfa some nas duas bordas (v = 0..1 na largura)
        eb = N.new('ShaderNodeMath'); eb.operation = 'PINGPONG'; eb.inputs[1].default_value = 0.5
        sb = N.new('ShaderNodeMath'); sb.operation = 'MULTIPLY'; sb.inputs[1].default_value = 2.0
        pb = N.new('ShaderNodeMath'); pb.operation = 'POWER'; pb.inputs[1].default_value = 1.3
        mb = N.new('ShaderNodeMath'); mb.operation = 'MULTIPLY'
        nt.links.new(sep.outputs[1], eb.inputs[0]); nt.links.new(eb.outputs[0], sb.inputs[0]); nt.links.new(sb.outputs[0], pb.inputs[0])
        nt.links.new(mul.outputs[0], mb.inputs[0]); nt.links.new(pb.outputs[0], mb.inputs[1]); mul = mb
    nt.links.new(mul.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    return m
def mat_l2(nome, tex, forca=2.4, tint=(1, 1, 1)):
    """malha do L2 com a textura original: emissao com alfa pelo brilho (o L2 usa mistura aditiva)"""
    m = mat_base(nome); nt = m.node_tree; N = nt.nodes
    out = N.new("ShaderNodeOutputMaterial"); mix = N.new("ShaderNodeMixShader"); tr = N.new("ShaderNodeBsdfTransparent"); em = N.new("ShaderNodeEmission")
    im = N.new("ShaderNodeTexImage"); bw = N.new("ShaderNodeRGBToBW"); mm = N.new("ShaderNodeMix"); mm.data_type = "RGBA"; mm.blend_type = "MULTIPLY"; mm.inputs[0].default_value = 1.0
    mm.inputs[7].default_value = (*tint, 1)
    p = L2TEX + tex + ".png"
    if os.path.exists(p): im.image = bpy.data.images.load(p); im.image.pack()
    nt.links.new(im.outputs["Color"], mm.inputs[6]); nt.links.new(mm.outputs[2], em.inputs["Color"]); nt.links.new(im.outputs["Color"], bw.inputs[0]); nt.links.new(bw.outputs[0], mix.inputs[0])
    em.inputs["Strength"].default_value = forca
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    return m
def fade_node(m, nome="fade"):
    """multiplica o alfa final por um valor animavel (0..1) para sumir no fim"""
    nt = m.node_tree; mix = next(n for n in nt.nodes if n.type == "MIX_SHADER"); v = nt.nodes.new("ShaderNodeValue"); v.label = nome; v.name = nome; v.outputs[0].default_value = 1.0
    if mix.inputs[0].links: old = mix.inputs[0].links[0].from_socket
    else:
        base = nt.nodes.new("ShaderNodeValue"); base.outputs[0].default_value = mix.inputs[0].default_value; old = base.outputs[0]
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    nt.links.new(old, mul.inputs[0]); nt.links.new(v.outputs[0], mul.inputs[1]); nt.links.new(mul.outputs[0], mix.inputs[0]); return v

# ------------------------------------------------------------------ corpo da estrela
def blade_mesh(nome, R=1.0, hub=0.2, n_blades=4, esp=0.075, miolo=True, swirl=0.0, swirl_len=0.30, K=22):
    """estrela de 4 laminas curvas (foice), secao em losango, pontas afiadas. swirl>0: a RAIZ gira em espiral em volta do centro
    (laminas "sugadas" pelo buraco negro): fica fina, mais fina quanto mais perto, e comeca dentro do buraco (hub pequeno)."""
    me = bpy.data.meshes.new(nome); bm = bmesh.new()
    suave = lambda x: (lambda y: y * y * (3 - 2 * y))(max(0.0, min(1.0, x)))
    for bi in range(n_blades):
        a0 = bi * 2 * math.pi / n_blades; R2 = Matrix.Rotation(a0, 3, "Z"); linhas = []
        for k in range(K + 1):
            t = (k / K) ** (1.55 if swirl else 1.0); x = hub + (R - hub) * t
            curva = 0.34 * t * t * R                       # curvatura da foice (sentido do giro)
            raiz = (0.28 + 0.72 * suave((x - hub) / 0.38)) if swirl else 1.0
            w_f = 0.30 * R * (1 - t) ** 0.75 * (0.55 + 0.45 * math.sin(min(1, t * 1.4) * math.pi / 2)) * raiz
            w_t = 0.12 * R * (1 - t) ** 1.1 * raiz
            e_ = esp * (1 - t * 0.6) * ((0.5 + 0.5 * raiz) if swirl else 1.0)
            centro = curva + 0.25 * (w_f - w_t)
            pts = [(x, curva + w_f, 0.0), (x, centro, e_), (x, curva - w_t, 0.0), (x, centro, -e_)]
            Rg = Matrix.Rotation(-swirl * math.exp(-(x - hub) / swirl_len), 3, "Z") if swirl else Matrix.Identity(3)
            linhas.append([bm.verts.new(R2 @ (Rg @ Vector(q))) for q in pts])
        for k in range(K):
            A, Bq = linhas[k], linhas[k + 1]
            for j in range(4):
                try: bm.faces.new((A[j], A[(j + 1) % 4], Bq[(j + 1) % 4], Bq[j]))
                except ValueError: pass
        try: bm.faces.new(linhas[0])
        except ValueError: pass
    if miolo: bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8, radius1=hub * 1.25, radius2=hub * 1.05, depth=esp * 3.2)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            v = lp.vert.co; lp[uvl].uv = (min(1.0, max(0.0, (math.hypot(v.x, v.y) - hub) / max(R - hub, 1e-6))), 0.5)
    for f in bm.faces: f.smooth = True
    bm.to_mesh(me); bm.free(); return me
def corpo_estrela():
    ob = bpy.data.objects.new("S1_estrela", blade_mesh("S1_estrela", hub=0.07, miolo=False, swirl=1.45, K=40)); link(ob)
    ob.data.materials.append(mat_aco())
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.shade_smooth()
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
    except Exception: pass
    bev = ob.modifiers.new("bev", "BEVEL"); bev.width = 0.012; bev.segments = 2; bev.limit_method = "ANGLE"
    # BURACO NEGRO no miolo: nucleo preto, halo de borda, disco de acrecao em espiral (gira) e aro de aco ligando as laminas
    def esfera(nome, r, seg=28, ring=18):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r); me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
        for p_ in me.polygons: p_.use_smooth = True
        o = bpy.data.objects.new(nome, me); link(o); o.parent = ob; return o
    m_pre = bpy.data.materials.new("S1_bn_preto"); m_pre.use_nodes = True; nt = m_pre.node_tree; nt.nodes.clear()
    o_ = nt.nodes.new("ShaderNodeOutputMaterial"); e_ = nt.nodes.new("ShaderNodeEmission"); e_.inputs["Color"].default_value = (0, 0, 0, 1); nt.links.new(e_.outputs[0], o_.inputs[0])
    nuc = esfera("S1_bn_nucleo", 0.150); nuc.data.materials.append(m_pre)
    # halo: so a borda brilha (fresnel), centro transparente
    m_h = mat_base("S1_bn_halo"); nt = m_h.node_tree; N = nt.nodes
    o_ = N.new("ShaderNodeOutputMaterial"); mx_ = N.new("ShaderNodeMixShader"); tr_ = N.new("ShaderNodeBsdfTransparent"); em_ = N.new("ShaderNodeEmission"); fr = N.new("ShaderNodeFresnel"); fr.inputs["IOR"].default_value = 1.6
    pw_ = N.new("ShaderNodeMath"); pw_.operation = "POWER"; pw_.inputs[1].default_value = 2.2; em_.inputs["Color"].default_value = (0.78, 1.0, 0.92, 1); em_.inputs["Strength"].default_value = 6.0
    nt.links.new(fr.outputs[0], pw_.inputs[0]); nt.links.new(pw_.outputs[0], mx_.inputs[0]); nt.links.new(tr_.outputs[0], mx_.inputs[1]); nt.links.new(em_.outputs[0], mx_.inputs[2]); nt.links.new(mx_.outputs[0], o_.inputs[0])
    halo = esfera("S1_bn_halo", 0.185); halo.data.materials.append(m_h)
    # disco de acrecao: espiral que vai do branco-quente (perto) ao jade (longe), alfa pelo ruido e pela distancia
    bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap"); AN, SG = 9, 72; grade = []
    for ia in range(AN + 1):
        t = ia / AN; r = 0.17 + 0.30 * t; row = []
        for isg in range(SG):
            ang = 2 * math.pi * isg / SG + 1.1 * t; row.append(bm.verts.new((math.cos(ang) * r, math.sin(ang) * r, 0.0)))
        grade.append(row)
    for ia in range(AN):
        for isg in range(SG):
            i2 = (isg + 1) % SG; f = bm.faces.new((grade[ia][isg], grade[ia][i2], grade[ia + 1][i2], grade[ia + 1][isg]))
            for lp, (ii, ss) in zip(f.loops, ((ia, isg), (ia, i2), (ia + 1, i2), (ia + 1, isg))): lp[uv].uv = (ii / AN, ss / SG)
    me = bpy.data.meshes.new("S1_bn_disco"); bm.to_mesh(me); bm.free(); disco = bpy.data.objects.new("S1_bn_disco", me); link(disco); disco.parent = ob
    disco.data.materials.append(mat_fx("S1_bn_disco_m", (1.0, 0.99, 0.90), (0.38, 0.86, 0.74), 6.5, 7.0)); disco.location = (0, 0, 0.012)
    ob["disco"] = disco.name
    return ob

# ------------------------------------------------------------------ tubo com u (para rastro em helice)
def tubo(nome, pts, rads, lados=7):
    me = bpy.data.meshes.new(nome); bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap"); rings = []
    n = len(pts)
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized(); ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        a = t.cross(ref).normalized(); b = t.cross(a).normalized(); ring = []
        for s in range(lados): ang = 2 * math.pi * s / lados; ring.append(bm.verts.new(p + (a * math.cos(ang) + b * math.sin(ang)) * rads[i]))
        rings.append(ring)
    for i in range(n - 1):
        for s in range(lados):
            s2 = (s + 1) % lados; f = bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))
            for lp, (ii, ss) in zip(f.loops, ((i, s), (i, s2), (i + 1, s2), (i + 1, s))): lp[uv].uv = (ii / (n - 1), ss / lados)
    bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nome, me); link(ob); return ob
def fita(nome, pts, larg):
    """faixa plana que acompanha o caminho; larg[i] = meia largura; u ao longo (0..1), v na largura (0..1)"""
    me = bpy.data.meshes.new(nome); bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap"); n = len(pts); cols = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized(); rad = Vector((p.x, 0, p.z))
        rad = rad.normalized() if rad.length > 1e-4 else Vector((1, 0, 0))
        lado = t.cross(rad).normalized() if abs(t.dot(rad)) < .98 else Vector((0, 0, 1))
        cols.append((bm.verts.new(p + lado * larg[i]), bm.verts.new(p - lado * larg[i])))
    for i in range(n - 1):
        f = bm.faces.new((cols[i][0], cols[i + 1][0], cols[i + 1][1], cols[i][1]))
        for lp, (ii, vv) in zip(f.loops, ((i, 0), (i + 1, 0), (i + 1, 1), (i, 1))): lp[uv].uv = (ii / (n - 1), vv)
    bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nome, me); link(ob); return ob
def helice_fita(nome, fase, raio0=0.10, raio1=0.5, comp=3.6, voltas=2.2, larg0=0.13, onda=0.0):
    pts, lg = [], []
    for i in range(48):
        s_ = i / 47; r = raio0 + (raio1 - raio0) * s_ ** 0.75; ang = fase + voltas * 2 * math.pi * s_ + onda * math.sin(s_ * 9 + fase)
        pts.append(Vector((math.cos(ang) * r, -0.35 - s_ * comp, math.sin(ang) * r)))
        lg.append(larg0 * math.sin(min(1, s_ * 6) * math.pi / 2) * (1 - s_) ** 0.6 + 0.004)
    return fita(nome, pts, lg)
def helice(nome, fase, raio0=0.10, raio1=0.36, comp=3.6, voltas=2.2, esp0=0.026):
    pts, rads = [], []
    for i in range(40):
        s = i / 39; r = raio0 + (raio1 - raio0) * s ** 0.8; ang = fase + voltas * 2 * math.pi * s
        pts.append(Vector((math.cos(ang) * r, -s * comp, math.sin(ang) * r))); rads.append(esp0 * (1 - s) ** 0.7 + 0.004)
    return tubo(nome, pts, rads)

# ------------------------------------------------------------------ montagem
raiz = bpy.data.objects.new("S1_RAIZ", None); link(raiz)
estrela = corpo_estrela(); estrela.parent = raiz
estrela.scale = (0.78, 0.78, 0.78)

# aura do L2 (redemoinho de vento) ao redor da estrela, girando ao contrario
def malha_l2(nome, arq, tex, escala, forca, tint=(1, 1, 1)):
    antes = set(bpy.data.objects.keys())
    bpy.ops.import_scene.psk(filepath=L2MESH + arq + ".pskx")
    novos = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in antes]
    me = next(o for o in novos if o.type == "MESH")
    for o in novos:
        for c in list(o.users_collection): c.objects.unlink(o)
    bpy.context.view_layer.update(); f = escala / max(me.dimensions); me.scale = (f, f, f); me.name = nome
    link(me); m = mat_l2("S1_" + nome, tex, forca, tint); me.data.materials.clear(); me.data.materials.append(m)
    for o in novos:
        if o is not me and o.name in bpy.data.objects: bpy.data.objects.remove(o)
    return me, m
aura, m_aura = malha_l2("S1_aura_L2", "windblowin03", "fx_m_t0001", 1.9, 3.2, (0.80, 1.0, 0.90)); aura.parent = raiz
anel, m_anel = malha_l2("S1_anel_L2", "windknifewave00", "fx_m_t0005", 1.5, 3.0, (0.85, 1.0, 1.0)); anel.parent = raiz
anel.rotation_euler = (math.radians(90), 0, 0)

# rastro: 3 helices que giram em volta do eixo +Y (cauda atras, em -Y)
grupo_rastro = bpy.data.objects.new("S1_rastro", None); link(grupo_rastro); grupo_rastro.parent = raiz
m_r = mat_fx("S1_rastro_m", (1.0, 0.97, 0.86), (0.40, 0.86, 0.74), 1.7, 5.0, True, True)
m_r2 = mat_fx("S1_rastro2_m", (0.90, 0.96, 1.0), (0.50, 0.74, 0.90), 1.3, 8.0, True, True)
for i in range(7):
    h = helice_fita("S1_vento%d" % i, i * 2 * math.pi / 7 + random.uniform(-.2, .2), random.uniform(.10, .16), random.uniform(.38, .62), random.uniform(2.8, 4.6), random.uniform(1.4, 2.4), random.uniform(.030, .062), random.uniform(0, .5))
    h.parent = grupo_rastro; h.data.materials.append(m_r)
for i in range(5):
    h = helice_fita("S1_fio%d" % i, i * 2 * math.pi / 5 + 0.7, 0.07, random.uniform(.20, .34), random.uniform(1.8, 3.0), random.uniform(2.6, 3.8), random.uniform(.014, .026), random.uniform(.2, .6))
    h.parent = grupo_rastro; h.data.materials.append(m_r2)

# ------------------------------------------------------------------ impacto (frame 24): cortes de vento, anel e poeira
imp = bpy.data.objects.new("S1_IMPACTO", None); link(imp); imp.location = (0, DIST, 0)
m_corte = mat_fx("S1_corte_m", (1.0, 1.0, 0.95), (0.50, 0.88, 0.78), 2.4, 5.0, True, True); v_corte = fade_node(m_corte)
cortes = []
for i in range(9):
    ang = i * 2 * math.pi / 9 + random.uniform(-.15, .15); R0 = random.uniform(.9, 1.5); arco = random.uniform(.9, 1.5); pts = []; lg = []
    for k in range(26):
        t = k / 25; a_ = -arco / 2 + arco * t; rr = R0 * (0.55 + .45 * t)
        pts.append(Vector((math.cos(a_) * rr, math.sin(a_) * rr, 0.0))); lg.append(0.055 * math.sin(math.pi * t) ** 0.9 + 0.004)
    c = fita("S1_corte%d" % i, pts, lg); c.data.materials.append(m_corte); c.parent = imp
    c.rotation_euler = (math.radians(random.uniform(-60, 60)), math.radians(random.uniform(-40, 40)), ang); c.scale = (0.001,) * 3
    cortes.append((c, random.uniform(0.9, 1.25)))
# anel serrilhado do L2 que se abre no impacto
anel_imp, m_anel_i = malha_l2("S1_anel_imp_L2", "windknifewave00", "fx_m_t0005", 2.2, 3.4, (0.85, 1.0, 1.0)); anel_imp.parent = imp
anel_imp.rotation_euler = (math.radians(90), 0, 0); v_anel = fade_node(m_anel_i)
# poeira/fiapos: bolinhas moles (a borda some), sem arestas
m_poeira = mat_base("S1_poeira_m"); nt = m_poeira.node_tree; N = nt.nodes
o_ = N.new("ShaderNodeOutputMaterial"); mx_ = N.new("ShaderNodeMixShader"); tr_ = N.new("ShaderNodeBsdfTransparent"); em_ = N.new("ShaderNodeEmission")
lw_ = N.new("ShaderNodeLayerWeight"); lw_.inputs["Blend"].default_value = 0.45
inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
pw_ = N.new("ShaderNodeMath"); pw_.operation = "POWER"; pw_.inputs[1].default_value = 1.6
em_.inputs["Color"].default_value = (0.86, 0.90, 0.80, 1); em_.inputs["Strength"].default_value = 0.9
nt.links.new(lw_.outputs["Facing"], inv.inputs[1]); nt.links.new(inv.outputs[0], pw_.inputs[0]); mx_.inputs[0].default_value = 0.35
nt.links.new(tr_.outputs[0], mx_.inputs[1]); nt.links.new(em_.outputs[0], mx_.inputs[2]); nt.links.new(mx_.outputs[0], o_.inputs[0])
v_poeira = fade_node(m_poeira)
motes = []
for i in range(40):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=random.uniform(.015, .04)); me = bpy.data.meshes.new("S1_p%d" % i); bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = True
    o = bpy.data.objects.new("S1_poeira%d" % i, me); link(o); o.parent = imp; o.data.materials.append(m_poeira)
    d = Vector((random.uniform(-1, 1), random.uniform(-.4, 1), random.uniform(-.3, 1))).normalized(); motes.append((o, d, random.uniform(1.0, 2.6)))

# ------------------------------------------------------------------ animacao (48 fps)
# voo da raiz: 1..24 em +Y; depois some
raiz.location = (0, 0, 0); raiz.keyframe_insert("location", frame=F0)
raiz.location = (0, DIST, 0); raiz.keyframe_insert("location", frame=F_HIT)
for fc in raiz.animation_data.action.layers[0].strips[0].channelbags[0].fcurves if hasattr(raiz.animation_data.action, "layers") else raiz.animation_data.action.fcurves:
    for p in fc.keyframe_points: p.interpolation = "LINEAR"
# giro da estrela (rapido, 2 voltas por 24 frames) + oscilacao leve
estrela.rotation_euler = (0, 0, 0); estrela.keyframe_insert("rotation_euler", frame=F0)
estrela.rotation_euler = (0, 0, math.radians(43 * N_VOO)); estrela.keyframe_insert("rotation_euler", frame=F_HIT)
aura.rotation_euler = (0, 0, 0); aura.keyframe_insert("rotation_euler", frame=F0); aura.rotation_euler = (0, 0, math.radians(-40 * N_VOO)); aura.keyframe_insert("rotation_euler", frame=F_HIT)
anel.rotation_euler = (math.radians(90), 0, 0); anel.keyframe_insert("rotation_euler", frame=F0); anel.rotation_euler = (math.radians(90), math.radians(24 * N_VOO), 0); anel.keyframe_insert("rotation_euler", frame=F_HIT)
grupo_rastro.rotation_euler = (0, 0, 0); grupo_rastro.keyframe_insert("rotation_euler", frame=F0); grupo_rastro.rotation_euler = (0, math.radians(-58 * N_VOO), 0); grupo_rastro.keyframe_insert("rotation_euler", frame=F_HIT)
dsc = bpy.data.objects[estrela['disco']]; dsc.rotation_euler = (0, 0, 0); dsc.keyframe_insert('rotation_euler', frame=F0); dsc.rotation_euler = (0, 0, math.radians(-80 * N_VOO)); dsc.keyframe_insert('rotation_euler', frame=F_HIT)
# depois do impacto: estrela/aura/rastro encolhem e somem
for o, esc in ((estrela, 0.78), (aura, aura.scale[0]), (anel, anel.scale[0])):
    o.scale = (esc,) * 3; o.keyframe_insert("scale", frame=F_HIT); o.scale = (0.001,) * 3; o.keyframe_insert("scale", frame=F_HIT + 3)
grupo_rastro.scale = (1, 1, 1); grupo_rastro.keyframe_insert("scale", frame=F_HIT); grupo_rastro.scale = (0.001,) * 3; grupo_rastro.keyframe_insert("scale", frame=F_HIT + 6)
# antes do voo, tudo encolhido no frame 0 para nao aparecer fora do tempo
imp.scale = (1, 1, 1)
for c, mx in cortes:
    c.scale = (0.001,) * 3; c.keyframe_insert("scale", frame=F_HIT - 1)
    c.scale = (mx, mx, mx); c.keyframe_insert("scale", frame=F_HIT + 5)
    c.scale = (mx * 1.35, mx * 1.35, mx * 1.35); c.keyframe_insert("scale", frame=F_FIM)
e0 = anel_imp.scale[0]; anel_imp.scale = (0.001,) * 3; anel_imp.keyframe_insert("scale", frame=F_HIT - 1); anel_imp.scale = (e0 * 1.8,) * 3; anel_imp.keyframe_insert("scale", frame=F_HIT + 9); anel_imp.scale = (e0 * 2.4,) * 3; anel_imp.keyframe_insert("scale", frame=F_HIT + 16)
for v, f0, f1 in ((v_corte, F_HIT + 4, F_FIM), (v_anel, F_HIT + 4, F_HIT + 16), (v_poeira, F_HIT + 8, F_FIM)):
    v.outputs[0].default_value = 1.0; v.outputs[0].keyframe_insert("default_value", frame=f0)
    v.outputs[0].default_value = 0.0; v.outputs[0].keyframe_insert("default_value", frame=f1)
for o, d, v in motes:
    o.scale = (0.001,) * 3; o.keyframe_insert("scale", frame=F_HIT - 1)
    o.location = (0, 0, 0); o.scale = (1, 1, 1); o.keyframe_insert("location", frame=F_HIT); o.keyframe_insert("scale", frame=F_HIT)
    o.location = d * v * 1.6 + Vector((0, 0, 0.5)); o.keyframe_insert("location", frame=F_FIM)
# fora do voo/impacto: impacto some antes do frame 24
# espiral: a estrela (com aura, anel e rastro) ORBITA o eixo do voo: abre do centro ate RAIO_ORB, circula e volta ao centro no impacto; torce (inclina) enquanto voa
RAIO_ORB, VOLTAS_ORB, TORCAO_GRAUS = 0.0, 1.6, 180.0      # torcao: gira SEMPRE no mesmo sentido em volta do eixo do voo, 0 -> TORCAO_GRAUS no alvo (sem balancar de ida e volta)
orb = bpy.data.objects.new("S1_ORBITA", None); orb.empty_display_type = "SPHERE"; orb.empty_display_size = 0.15; link(orb); orb.parent = raiz
for o_ in (estrela, aura, anel, grupo_rastro): o_.parent = orb; o_.matrix_parent_inverse.identity()
def _suave(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
for f in sorted(set(list(range(F0, F_HIT + 1, 2)) + [F_HIT])):
    ph = 2 * math.pi * VOLTAS_ORB * (f - F0) / (F_HIT - F0); r = RAIO_ORB * _suave((f - F0) / 18.0) * _suave((F_HIT - f) / 10.0)
    orb.location = (r * math.cos(ph), 0.0, r * math.sin(ph)); orb.rotation_euler = (0.0, math.radians(TORCAO_GRAUS) * (f - F0) / (F_HIT - F0), 0.0)
    orb.keyframe_insert("location", frame=f); orb.keyframe_insert("rotation_euler", frame=f)
_act = orb.animation_data.action
for _fc in (_act.layers[0].strips[0].channelbags[0].fcurves if hasattr(_act, "layers") else _act.fcurves):
    for _k in _fc.keyframe_points: _k.interpolation = "LINEAR"
# cameras para a previa: lateral (voo inteiro) e de perto (segue a estrela)
cam = bpy.data.objects.new("cam_voo", bpy.data.cameras.new("cam_voo")); sc.collection.objects.link(cam); cam.data.lens = 32
cam.location = (21.0, 10.5, 3.6); sc.camera = cam
alvo = bpy.data.objects.new("alvo_cam", None); sc.collection.objects.link(alvo); alvo.location = (0, 10.3, 0.9)
tc = cam.constraints.new("TRACK_TO"); tc.target = alvo; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
cam2 = bpy.data.objects.new("cam_perto", bpy.data.cameras.new("cam_perto")); sc.collection.objects.link(cam2); cam2.data.lens = 50
cam2.parent = raiz; cam2.location = (3.0, -2.4, 0.9)
tc2 = cam2.constraints.new("TRACK_TO"); tc2.target = estrela; tc2.track_axis = "TRACK_NEGATIVE_Z"; tc2.up_axis = "UP_Y"
for nome, loc, en, tam in (("luz_topo", (0, 3, 6), 900, 5), ("luz_lado", (6, 4, 2.5), 700, 4), ("luz_fundo", (-5, 8, 3), 500, 4)):
    l = bpy.data.objects.new(nome, bpy.data.lights.new(nome, "AREA")); l.data.energy = en; l.data.size = tam; l.location = loc; sc.collection.objects.link(l)
    t_ = l.constraints.new("TRACK_TO"); t_.target = alvo; t_.track_axis = "TRACK_NEGATIVE_Z"; t_.up_axis = "UP_Y"
# chao de referencia (escuro, so para dar escala) fora da colecao FX
ch = bpy.data.objects.new("chao_ref", bpy.data.meshes.new("chao_ref")); sc.collection.objects.link(ch)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=2, y_segments=2, size=24); bm.to_mesh(ch.data); bm.free(); ch.location = (0, 10, -1.2)
mc = bpy.data.materials.new("chao_m"); mc.use_nodes = True; mc.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.03, 0.035, 0.045, 1); mc.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0; ch.data.materials.append(mc)

bpy.ops.wm.save_as_mainfile(filepath=SAIDA); print("salvo:", SAIDA)
pasta = os.environ.get("PREVIA")
if pasta:
    os.makedirs(pasta, exist_ok=True)
    for nome_cam, c in (("voo", cam), ("perto", cam2)):
        sc.camera = c
        for f in (8, 30, 55, 76, 83, 88, 96, 101):
            sc.frame_set(f); sc.render.filepath = os.path.join(pasta, "s1_%s_f%02d.png" % (nome_cam, f)); bpy.ops.render.render(write_still=True)

if os.environ.get("MODELO"):
    pasta = os.environ["MODELO"]; os.makedirs(pasta, exist_ok=True)
    for o in list(col.objects):
        if o is not estrela and o.parent is not estrela and o.name not in ("S1_RAIZ",): o.hide_render = True
    estrela.animation_data_clear(); raiz.animation_data_clear(); estrela.parent = None; estrela.location = (0, 0, 0); estrela.rotation_euler = (0, 0, 0); estrela.scale = (1, 1, 1)
    for n_, o_ in list(bpy.data.objects.items()):
        if n_ in ("cam_voo", "cam_perto", "chao_ref"): o_.hide_render = True
    cm = bpy.data.objects.new("cam_modelo", bpy.data.cameras.new("cam_modelo")); sc.collection.objects.link(cm); cm.data.lens = 60; sc.camera = cm
    for nome_v, loc in (("topo", (0, -0.01, 3.4)), ("tres_quartos", (2.2, -2.6, 1.9)), ("lado", (3.4, 0, 0.35)), ("frente_baixa", (0, -3.0, 0.9))):
        cm.location = loc; cm.constraints.clear(); t_ = cm.constraints.new("TRACK_TO"); t_.target = estrela; t_.track_axis = "TRACK_NEGATIVE_Z"; t_.up_axis = "UP_Y"
        bpy.context.view_layer.update(); sc.render.filepath = os.path.join(pasta, "modelo_%s.png" % nome_v); sc.render.resolution_x = 700; sc.render.resolution_y = 520; bpy.ops.render.render(write_still=True)
