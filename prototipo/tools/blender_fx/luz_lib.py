"""Base comum dos efeitos SO DE LUZ das skills (padrao criado na Fenda Sismica, 25/11/2026).
Toda skill: animacao nativa sem bug + efeito de luz desenhado aqui no Blender + aprovacao do dono + porta para js/<classe>_fx.js.
Uso: import luz_lib as LZ (o script da skill poe a pasta no sys.path)."""
import bpy, os, math
from mathutils import Vector

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PERS = os.path.join(RAIZ, 'assets', 'personagens')


def mat_luz(nome, forca, cores, borda=1.0):
    """Emissao com transparencia, controlada por propriedades do OBJETO:
    frente (0..1: so aparece o trecho u <= frente), abertura (largura do miolo), brilho (0 = apagado).
    UV: u ao longo da peca, v na largura (miolo em v = .5). cores = 4 RGB do miolo para a borda."""
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs[0])
    def prop(nm):
        a = N.new('ShaderNodeAttribute'); a.attribute_type = 'OBJECT'; a.attribute_name = nm; return a.outputs['Fac']
    fren, abert, brilho = prop('frente'), prop('abertura'), prop('brilho')
    sub = N.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = .5; L.new(sep.outputs['Y'], sub.inputs[0])
    ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L.new(sub.outputs[0], ab.inputs[0])
    x2 = N.new('ShaderNodeMath'); x2.operation = 'MULTIPLY'; x2.inputs[1].default_value = 2; L.new(ab.outputs[0], x2.inputs[0])
    dv = N.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; L.new(x2.outputs[0], dv.inputs[0]); L.new(abert, dv.inputs[1])
    rmp = N.new('ShaderNodeValToRGB'); L.new(dv.outputs[0], rmp.inputs[0]); cr = rmp.color_ramp; cr.interpolation = 'EASE'
    cr.elements[0].position = 0; cr.elements[0].color = (*cores[0], 1); cr.elements[1].position = 1; cr.elements[1].color = (*cores[3], 0)
    for p_, cc, a_ in ((.18, cores[1], 1), (.42, cores[2], .85), (.75, cores[3], .45 * borda)): e = cr.elements.new(p_); e.color = (*cc, a_)
    fm = N.new('ShaderNodeMapRange'); fm.interpolation_type = 'SMOOTHSTEP'; L.new(sep.outputs['X'], fm.inputs['Value']); L.new(fren, fm.inputs['From Min']); fm.inputs['To Min'].default_value = 1; fm.inputs['To Max'].default_value = 0
    sm = N.new('ShaderNodeMath'); sm.operation = 'ADD'; sm.inputs[1].default_value = .04; L.new(fren, sm.inputs[0]); L.new(sm.outputs[0], fm.inputs['From Max'])
    alfa = N.new('ShaderNodeMath'); alfa.operation = 'MULTIPLY'; L.new(rmp.outputs['Alpha'], alfa.inputs[0]); L.new(fm.outputs[0], alfa.inputs[1])
    alfa2 = N.new('ShaderNodeMath'); alfa2.operation = 'MULTIPLY'; alfa2.use_clamp = True; L.new(alfa.outputs[0], alfa2.inputs[0]); L.new(brilho, alfa2.inputs[1])
    em = N.new('ShaderNodeEmission'); L.new(rmp.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = forca
    tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); L.new(alfa2.outputs[0], mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    m.use_backface_culling = False
    return m


def mat_rastro(nome, forca, cores):
    """Rastro de lamina: u = tempo (0 = mais velho, 1 = agora), v = 0 perto da mao .. 1 na ponta. Some no velho, mais forte na ponta."""
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs[0])
    br = N.new('ShaderNodeAttribute'); br.attribute_type = 'OBJECT'; br.attribute_name = 'brilho'
    rmp = N.new('ShaderNodeValToRGB'); L.new(sep.outputs['Y'], rmp.inputs[0]); cr = rmp.color_ramp; cr.interpolation = 'EASE'
    cr.elements[0].position = 0; cr.elements[0].color = (*cores[3], 0); cr.elements[1].position = 1; cr.elements[1].color = (*cores[0], 1)
    for p_, cc, a_ in ((.5, cores[3], 0), (.78, cores[2], .5), (.92, cores[1], 1)): e = cr.elements.new(p_); e.color = (*cc, a_)      # borda fina e brilhante na ponta (corte em meia-lua), nao placa
    pw = N.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.6; L.new(sep.outputs['X'], pw.inputs[0])
    a1 = N.new('ShaderNodeMath'); a1.operation = 'MULTIPLY'; L.new(rmp.outputs['Alpha'], a1.inputs[0]); L.new(pw.outputs[0], a1.inputs[1])
    a2 = N.new('ShaderNodeMath'); a2.operation = 'MULTIPLY'; a2.use_clamp = True; L.new(a1.outputs[0], a2.inputs[0]); L.new(br.outputs['Fac'], a2.inputs[1])
    em = N.new('ShaderNodeEmission'); L.new(rmp.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = forca
    tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); L.new(a2.outputs[0], mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    m.use_backface_culling = False
    return m


def malha(nome, vs, fs, uvs_por_vert, mat, col=None):
    me = bpy.data.meshes.new(nome); me.from_pydata(vs, [], fs); me.update(); uv = me.uv_layers.new()
    for f in me.polygons:
        for li, vi in zip(f.loop_indices, f.vertices): uv.data[li].uv = uvs_por_vert[vi]
    ob = bpy.data.objects.new(nome, me); (col or bpy.context.scene.collection).objects.link(ob); ob.data.materials.append(mat)
    ob.visible_shadow = False      # luz nao faz sombra
    return ob


def chave(ob, prop, quadros, interp='SINE'):
    for f, v in quadros: ob[prop] = v; ob.keyframe_insert('["%s"]' % prop, frame=f)


def cena_padrao(centro, frente, dist=6.5, alt=3.6, alvo_fr=0.0, fundo=(.015, .017, .025)):
    """chao escuro, lua fraca, camera de lado, compositor com bloom (Blender 5)."""
    sc = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=1, location=(centro.x, centro.y, 0)); chao = bpy.context.object; chao.name = 'Chao'; chao.scale = (18, 18, 1)
    mc = bpy.data.materials.new('Chao'); mc.use_nodes = True; b = next(n for n in mc.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (.09, .085, .08, 1); b.inputs['Roughness'].default_value = .85; chao.data.materials.append(mc)
    sol = bpy.data.lights.new('Lua', 'SUN'); sol.energy = .8; sol.color = (.7, .78, 1); ls = bpy.data.objects.new('Lua', sol); ls.rotation_euler = (math.radians(55), 0, math.radians(-30)); sc.collection.objects.link(ls)
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value = (*fundo, 1)
    lat = Vector((-frente.y, frente.x, 0))
    cd = bpy.data.cameras.new('Cam'); cd.lens = 28; cam = bpy.data.objects.new('Cam', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = centro + frente * 1.5 + lat * dist + Vector((0, 0, alt))
    alvo = bpy.data.objects.new('AlvoCam', None); alvo.location = centro + frente * alvo_fr + Vector((0, 0, .9)); sc.collection.objects.link(alvo); alvo.empty_display_size = 0
    tc = cam.constraints.new('TRACK_TO'); tc.target = alvo
    r = sc.render
    try: r.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        try: r.engine = 'BLENDER_EEVEE'
        except TypeError as e: print(e)
    r.resolution_x = 960; r.resolution_y = 540
    try:
        nt = bpy.data.node_groups.new('Brilho', 'CompositorNodeTree'); sc.compositing_node_group = nt
        rl = nt.nodes.new('CompositorNodeRLayers'); gl = nt.nodes.new('CompositorNodeGlare')
        for nome_, v_ in (('Type', 'Bloom'), ('Quality', 'High'), ('Threshold', .8), ('Strength', .9)):
            try: gl.inputs[nome_].default_value = v_
            except Exception: pass
        nt.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor'); go = nt.nodes.new('NodeGroupOutput')
        nt.links.new(rl.outputs['Image'], gl.inputs['Image']); nt.links.new(gl.outputs['Image'], go.inputs[0])
    except Exception as e: print('compositor:', e)
    try:
        import addon_utils; addon_utils.enable('blender_mcp_addon', default_set=True, persistent=True); sc.blendermcp_auto_start_server = True
    except Exception as e: print('mcp:', e)
    return cam


def _base(nome):
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs[0])
    br = N.new('ShaderNodeAttribute'); br.attribute_type = 'OBJECT'; br.attribute_name = 'brilho'
    return m, N, L, out, uv, sep, br.outputs['Fac']


def _fecha(m, N, L, out, cor, alfa, forca):
    em = N.new('ShaderNodeEmission'); L.new(cor, em.inputs['Color']); em.inputs['Strength'].default_value = forca
    tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); L.new(alfa, mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    m.use_backface_culling = False
    return m


def _mul(N, L, a, b, clamp=False):
    n = N.new('ShaderNodeMath'); n.operation = 'MULTIPLY'; n.use_clamp = clamp
    if isinstance(a, (int, float)): n.inputs[0].default_value = a
    else: L.new(a, n.inputs[0])
    if isinstance(b, (int, float)): n.inputs[1].default_value = b
    else: L.new(b, n.inputs[1])
    return n.outputs[0]


def mat_vento(nome, forca, cores, esticar=(3.0, 14.0)):
    """Parede de vento (funil do tornado): u = volta (0..1), v = altura (0..1). Faixas de vento esticadas na volta, somem em cima e embaixo."""
    m, N, L, out, uv, sep, br = _base(nome)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (esticar[0], esticar[1], 1); L.new(uv.outputs['UV'], mp.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; nz.inputs['Detail'].default_value = 3; L.new(mp.outputs[0], nz.inputs['Vector'])
    rg = N.new('ShaderNodeMapRange'); rg.inputs['From Min'].default_value = .56; rg.inputs['From Max'].default_value = .76; L.new(nz.outputs['Fac'], rg.inputs['Value'])
    rmp = N.new('ShaderNodeValToRGB'); L.new(rg.outputs[0], rmp.inputs[0]); cr = rmp.color_ramp
    cr.elements[0].position = 0; cr.elements[0].color = (*cores[3], 1); cr.elements[1].position = 1; cr.elements[1].color = (*cores[0], 1)
    for p_, cc in ((.4, cores[2]), (.75, cores[1])): e = cr.elements.new(p_); e.color = (*cc, 1)
    um = N.new('ShaderNodeMath'); um.operation = 'SUBTRACT'; um.inputs[0].default_value = 1; L.new(sep.outputs['Y'], um.inputs[1])
    fall = _mul(N, L, _mul(N, L, sep.outputs['Y'], um.outputs[0]), 4.0, True)
    alfa = _mul(N, L, _mul(N, L, _mul(N, L, rg.outputs[0], fall), br), .55, True)
    return _fecha(m, N, L, out, rmp.outputs['Color'], alfa, forca)


def mat_corte(nome, forca, cores):
    """Corte largo em meia-lua: u = angulo (0 = cauda, 1 = frente da lamina), v = raio (0 = perto do corpo, 1 = borda de fora)."""
    m, N, L, out, uv, sep, br = _base(nome)
    rmp = N.new('ShaderNodeValToRGB'); L.new(sep.outputs['Y'], rmp.inputs[0]); cr = rmp.color_ramp; cr.interpolation = 'EASE'
    cr.elements[0].position = 0; cr.elements[0].color = (*cores[3], 0); cr.elements[1].position = 1; cr.elements[1].color = (*cores[1], .25)
    for p_, cc, a_ in ((.45, cores[2], .35), (.82, cores[1], .9), (.92, cores[0], 1)): e = cr.elements.new(p_); e.color = (*cc, a_)
    pw = N.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.5; L.new(sep.outputs['X'], pw.inputs[0])
    alfa = _mul(N, L, _mul(N, L, rmp.outputs['Alpha'], pw.outputs[0]), br, True)
    return _fecha(m, N, L, out, rmp.outputs['Color'], alfa, forca)


def mat_energia(nome, forca, cores, fumaca=False):
    """Rastro largo de energia com TEXTURA leve (fios de energia ao longo do movimento).
    u = tempo (0 = mais velho, 1 = agora), v = raio na lamina (0 = perto da mao, 1 = alem da ponta).
    fumaca=True: mesma forma, cor escura e pouca emissao (da o PESO atras do corte)."""
    m, N, L, out, uv, sep, br = _base(nome)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.6, 11.0, 1); L.new(uv.outputs['UV'], mp.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 4; L.new(mp.outputs[0], nz.inputs['Vector'])
    fio = N.new('ShaderNodeMapRange'); fio.inputs['From Min'].default_value = .45; fio.inputs['From Max'].default_value = .7; L.new(nz.outputs['Fac'], fio.inputs['Value'])
    mistura = N.new('ShaderNodeMapRange'); mistura.inputs['To Min'].default_value = .06; mistura.inputs['To Max'].default_value = 1.0; L.new(fio.outputs[0], mistura.inputs['Value'])
    perfil = N.new('ShaderNodeValToRGB'); L.new(sep.outputs['Y'], perfil.inputs[0]); pr = perfil.color_ramp; pr.interpolation = 'EASE'
    pr.elements[0].position = 0; pr.elements[0].color = (1, 1, 1, 0); pr.elements[1].position = 1; pr.elements[1].color = (1, 1, 1, 0)
    for p_, a_ in ((.25, .45), (.7, .9), (.9, 1)): e = pr.elements.new(p_); e.color = (1, 1, 1, a_)
    pw = N.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.3; L.new(sep.outputs['X'], pw.inputs[0])
    alfa = _mul(N, L, _mul(N, L, _mul(N, L, perfil.outputs['Alpha'], pw.outputs[0]), mistura.outputs[0]), br, True)
    if fumaca:
        alfa = _mul(N, L, alfa, .5, True)
        cor = N.new('ShaderNodeRGB'); cor.outputs[0].default_value = (*cores[3], 1); corO = cor.outputs[0]
    else:
        rc = N.new('ShaderNodeValToRGB'); L.new(sep.outputs['Y'], rc.inputs[0]); cr = rc.color_ramp
        cr.elements[0].position = 0; cr.elements[0].color = (*cores[2], 1); cr.elements[1].position = 1; cr.elements[1].color = (*(cores[4] if len(cores) > 4 else cores[1]), 1)
        e = cr.elements.new(.6); e.color = (*cores[1], 1)      # energia vermelha -> dourada na ponta (o branco fica so no fio)
        corO = rc.outputs['Color']
    return _fecha(m, N, L, out, corO, alfa, forca)
