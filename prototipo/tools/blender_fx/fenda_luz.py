"""Fenda Sismica (guerreiro) feita SO de luz: rachadura que corre 9 m para a frente a partir do ponto onde a espada crava (quadro 27 do SpAtk03_2HS do L2).
Monta prototipo/assets/personagens/fenda_sismica.blend para o dono ver e ajustar ao vivo (MCP inicia sozinho).
Uso: blender.exe -b --python prototipo/tools/blender_fx/fenda_luz.py
Pecas: rachadura (fita emissiva com ramos), brilho largo no chao, luzes reais ao longo da fenda, colunas de luz, brasas. Sem pedras/blocos."""
import bpy, os, math, random
from mathutils import Vector

random.seed(7)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = os.path.join(RAIZ, 'assets', 'personagens')
SAIDA = os.path.join(P, 'fenda_sismica.blend')
IMPACTO, ABRE, FIM = 27, 10, 75          # quadro da cravada, quadros para a frente correr 9 m, fim da cena
COMP = 9.0                               # metros (alcance da skill no jogo)
CORES = [(1, .97, .85), (1, .78, .28), (1, .42, .06), (.75, .06, .03)]   # miolo branco-quente -> dourado -> brasa -> carmim

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 0; sc.frame_end = FIM

# ---------- lutador + espada + golpe ----------
antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(P, 'human_fighter_nograde.glb'))
corpo = [o for o in bpy.data.objects if o not in antes]
arm = next(o for o in corpo if o.type == 'ARMATURE' and 'HumanFighter' in o.name)
for o in corpo:
    if o.animation_data:
        for t in list(o.animation_data.nla_tracks): o.animation_data.nla_tracks.remove(t)
        o.animation_data.action = None
bpy.context.view_layer.update()
zs = [(o.matrix_world @ v.co).z for o in corpo if o.type == 'MESH' for i, v in enumerate(o.data.vertices) if i % 40 == 0]
alt = max(zs) - min(zs); K = 1.8 / alt                                        # tudo em metros: personagem com 1,8 m
raiz = [o for o in corpo if o.parent is None]
for o in raiz: o.scale = [s * K for s in o.scale]; o.location.z -= min(zs) * K
act = bpy.data.actions['SpAtk03_2HS_MFighter']
arm.animation_data_create(); arm.animation_data.action = act
try: arm.animation_data.action_slot = arm.animation_data.action_suitable_slots[0]
except Exception: pass
antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(P, 'twohanded_sword.glb'))
raiz_esp = [o for o in bpy.data.objects if o not in antes and o.parent is None]
piv = bpy.data.objects.new('EspadaPivo', None); sc.collection.objects.link(piv); piv.empty_display_size = 0
for o in raiz_esp: o.parent = piv
c = piv.constraints.new('CHILD_OF'); c.target = arm; c.subtarget = 'Weapon_R_Bone'; c.set_inverse_pending = False

# ponto e direcao da cravada (medidos no quadro do impacto)
sc.frame_set(IMPACTO); bpy.context.view_layer.update()
mao = (arm.matrix_world @ arm.pose.bones['Weapon_R_Bone'].matrix).translation
pel = (arm.matrix_world @ arm.pose.bones['Bip01_Pelvis'].matrix).translation
fr = Vector((mao.x - pel.x, mao.y - pel.y, 0)); fr = fr.normalized() if fr.length > 1e-4 else Vector((0, -1, 0))
lat = Vector((-fr.y, fr.x, 0))
O = Vector((mao.x, mao.y, 0)) + fr * .55                                   # a lamina toca o chao um pouco a frente da mao
print('cravada', tuple(round(x, 2) for x in O), 'frente', tuple(round(x, 2) for x in fr))

# ---------- material de luz (emissao + transparencia, controlado por propriedades do objeto) ----------
def mat_luz(nome, forca, borda=1.0):
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs[0])
    def prop(nm):
        a = N.new('ShaderNodeAttribute'); a.attribute_type = 'OBJECT'; a.attribute_name = nm; return a.outputs['Fac']
    fren, abert, brilho = prop('frente'), prop('abertura'), prop('brilho')
    # largura: |v-0.5|*2 -> 0 no meio, 1 na borda; a abertura empurra o miolo para fora
    sub = N.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = .5; L.new(sep.outputs['Y'], sub.inputs[0])
    ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L.new(sub.outputs[0], ab.inputs[0])
    x2 = N.new('ShaderNodeMath'); x2.operation = 'MULTIPLY'; x2.inputs[1].default_value = 2; L.new(ab.outputs[0], x2.inputs[0])
    dv = N.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; L.new(x2.outputs[0], dv.inputs[0]); L.new(abert, dv.inputs[1])
    rmp = N.new('ShaderNodeValToRGB'); L.new(dv.outputs[0], rmp.inputs[0]); cr = rmp.color_ramp; cr.interpolation = 'EASE'
    cr.elements[0].position = 0; cr.elements[0].color = (*CORES[0], 1); cr.elements[1].position = 1; cr.elements[1].color = (*CORES[3], 0)
    for p_, cc, a_ in ((.18, CORES[1], 1), (.42, CORES[2], .85), (.75, CORES[3], .45 * borda)): e = cr.elements.new(p_); e.color = (*cc, a_)
    # ruido ao longo da fenda (pulsa, nao fica chapado)
    tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 26; nz.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    nm = N.new('ShaderNodeMapRange'); nm.inputs['From Min'].default_value = .3; nm.inputs['From Max'].default_value = .7; nm.inputs['To Min'].default_value = .55; nm.inputs['To Max'].default_value = 1.25; L.new(nz.outputs['Fac'], nm.inputs['Value'])
    # frente: so aparece o que a frente ja passou (u <= frente), com borda macia
    fm = N.new('ShaderNodeMapRange'); fm.interpolation_type = 'SMOOTHSTEP'; L.new(sep.outputs['X'], fm.inputs['Value']); L.new(fren, fm.inputs['From Min']); fm.inputs['To Min'].default_value = 1; fm.inputs['To Max'].default_value = 0
    sm = N.new('ShaderNodeMath'); sm.operation = 'ADD'; sm.inputs[1].default_value = .04; L.new(fren, sm.inputs[0]); L.new(sm.outputs[0], fm.inputs['From Max'])
    alfa = N.new('ShaderNodeMath'); alfa.operation = 'MULTIPLY'; L.new(rmp.outputs['Alpha'], alfa.inputs[0]); L.new(fm.outputs[0], alfa.inputs[1])
    alfa2 = N.new('ShaderNodeMath'); alfa2.operation = 'MULTIPLY'; alfa2.use_clamp = True; L.new(alfa.outputs[0], alfa2.inputs[0]); L.new(brilho, alfa2.inputs[1])
    em = N.new('ShaderNodeEmission'); L.new(rmp.outputs['Color'], em.inputs['Color'])
    st = N.new('ShaderNodeMath'); st.operation = 'MULTIPLY'; st.inputs[1].default_value = forca; L.new(nm.outputs[0], st.inputs[0]); L.new(st.outputs[0], em.inputs['Strength'])
    tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); L.new(alfa2.outputs[0], mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs[0])
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    m.use_backface_culling = False
    return m

# ---------- geometria: fita ao longo de uma linha quebrada (u = 0..1 no comprimento, v = 0..1 na largura) ----------
def linha(ini, rumo, comp, n, desvio):
    pts = [ini.copy()]; ang = 0.0
    for i in range(1, n + 1):
        ang += random.uniform(-desvio, desvio); ang *= .7
        d = (rumo * math.cos(ang) + Vector((-rumo.y, rumo.x, 0)) * math.sin(ang)).normalized()
        pts.append(pts[-1] + d * (comp / n))
    return pts

def fita(nome, pts, larg, z, mat, larg_fim=None, u0=0.0, u1=1.0):
    me = bpy.data.meshes.new(nome); vs, fs, uvs = [], [], []; n = len(pts)
    for i, p in enumerate(pts):
        a = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]; a.z = 0; a = a.normalized(); l = Vector((-a.y, a.x, 0))
        t = i / (n - 1); w = larg * (1 - t) + (larg_fim if larg_fim is not None else larg * .35) * t; w *= random.uniform(.75, 1.25)
        vs += [(p + l * w / 2) + Vector((0, 0, z)), (p - l * w / 2) + Vector((0, 0, z))]
    for i in range(n - 1): fs.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    me.from_pydata(vs, [], fs); me.update(); uv = me.uv_layers.new()
    for f in me.polygons:
        for li, vi in zip(f.loop_indices, f.vertices): i = vi // 2; uv.data[li].uv = (u0 + (u1 - u0) * i / (n - 1), 0.0 if vi % 2 == 0 else 1.0)
    ob = bpy.data.objects.new(nome, me); sc.collection.objects.link(ob); ob.data.materials.append(mat)
    return ob

def chave(ob, prop, quadros):
    for f, v in quadros: ob[prop] = v; ob.keyframe_insert('["%s"]' % prop, frame=f)

M_FENDA = mat_luz('FendaMiolo', 22); M_HALO = mat_luz('FendaHalo', 1.1, borda=.35)
principal = linha(O, fr, COMP, 46, .55)
pecas = []
pecas.append(fita('Fenda', principal, .13, .02, M_FENDA, .05))
pecas.append(fita('FendaHalo', principal, 1.1, .015, M_HALO, .45))
# ramos: saem da linha principal para os lados, comecam quando a frente passa por eles
for k in range(7):
    i = random.randint(3, len(principal) - 4); u0 = i / (len(principal) - 1)
    lado = 1 if k % 2 else -1; rumo = (fr * 1.1 + lat * lado * random.uniform(.5, 1)).normalized()
    pr = linha(principal[i], rumo, random.uniform(.5, 1.3), 10, .9)
    pecas.append(fita('Ramo%d' % k, pr, .06, .021, M_FENDA, .01, u0, min(1, u0 + .12)))
T1 = IMPACTO + ABRE
for ob in pecas:
    halo = 'Halo' in ob.name
    chave(ob, 'frente', [(IMPACTO - 1, -.05), (T1, 1.05)])
    chave(ob, 'abertura', [(IMPACTO, .12), (IMPACTO + 6, 1.0), (IMPACTO + 22, 1.1), (FIM - 8, .35)])
    chave(ob, 'brilho', [(IMPACTO - 1, 0), (IMPACTO, 1.6 if not halo else 1.0), (IMPACTO + 8, 1.15 if not halo else .8), (IMPACTO + 26, .9 if not halo else .55), (FIM - 4, 0)])
    if ob.animation_data and ob.animation_data.action:
        try:
            for fc in ob.animation_data.action.fcurves:
                for kp in fc.keyframe_points: kp.interpolation = 'SINE'
        except Exception: pass

# ---------- luzes reais ao longo da fenda (acendem quando a frente passa) ----------
for k in range(6):
    t = (k + .5) / 6; p = principal[int(t * (len(principal) - 1))]
    ld = bpy.data.lights.new('LuzFenda%d' % k, 'POINT'); ld.color = CORES[2]; ld.shadow_soft_size = .6
    lo = bpy.data.objects.new('LuzFenda%d' % k, ld); lo.location = p + Vector((0, 0, .25)); sc.collection.objects.link(lo)
    f0 = IMPACTO + t * ABRE
    for f, e in ((f0 - 1, 0), (f0 + 1, 700), (f0 + 6, 320), (IMPACTO + 20, 160), (IMPACTO + 32, 0)): ld.energy = e; ld.keyframe_insert('energy', frame=f)

# ---------- colunas de luz (planos finos verticais que sobem e somem) ----------
M_COL = mat_luz('ColunaLuz', 6)
for k in range(9):
    t = random.uniform(.05, .95); p = principal[int(t * (len(principal) - 1))] + lat * random.uniform(-.15, .15)
    h = random.uniform(.9, 2.2); me = bpy.data.meshes.new('Coluna%d' % k)
    me.from_pydata([(-.05, 0, 0), (.05, 0, 0), (.05, 0, h), (-.05, 0, h)], [], [(0, 1, 2, 3)]); uv = me.uv_layers.new()
    for li, vi in zip(me.polygons[0].loop_indices, me.polygons[0].vertices): uv.data[li].uv = ((0, 1, 1, 0)[vi] * 0 + (0, 0, 1, 1)[vi], (0, 1, 1, 0)[vi])
    ob = bpy.data.objects.new('Coluna%d' % k, me); ob.location = p; sc.collection.objects.link(ob); ob.data.materials.append(M_COL)
    ob.rotation_euler = (0, 0, math.atan2(fr.y, fr.x) + random.uniform(-.4, .4))
    f0 = IMPACTO + t * ABRE
    chave(ob, 'frente', [(f0, -.05), (f0 + 5, 1.05)]); chave(ob, 'abertura', [(f0, .6), (f0 + 5, 1)])
    chave(ob, 'brilho', [(f0 - 1, 0), (f0 + 1, 1.2), (f0 + 9, 0)])

# ---------- brasas (pontinhos que sobem) ----------
M_BR = mat_luz('Brasa', 10)
for k in range(40):
    t = random.uniform(0, 1); p = principal[int(t * (len(principal) - 1))] + lat * random.uniform(-.3, .3)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(.012, .03), location=p); ob = bpy.context.object; ob.name = 'Brasa%d' % k
    ob.data.materials.append(M_BR); ob['frente'] = 2.0; ob['abertura'] = 1.0
    f0 = int(IMPACTO + t * ABRE + random.uniform(0, 8)); vida = random.randint(14, 30)
    ob.location = p; ob.keyframe_insert('location', frame=f0)
    ob.location = p + Vector((random.uniform(-.4, .4), random.uniform(-.4, .4), random.uniform(1.2, 2.8))); ob.keyframe_insert('location', frame=f0 + vida)
    chave(ob, 'brilho', [(f0 - 1, 0), (f0, 1), (f0 + vida * .7, .8), (f0 + vida, 0)])

# ---------- cena: chao, luz, camera, compositor com brilho ----------
bpy.ops.mesh.primitive_plane_add(size=1, location=(O.x + fr.x * 4, O.y + fr.y * 4, 0)); chao = bpy.context.object; chao.name = 'Chao'; chao.scale = (16, 16, 1)
mc = bpy.data.materials.new('Chao'); mc.use_nodes = True; b = next(n for n in mc.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
b.inputs['Base Color'].default_value = (.09, .085, .08, 1); b.inputs['Roughness'].default_value = .85; chao.data.materials.append(mc)
sol = bpy.data.lights.new('Lua', 'SUN'); sol.energy = .6; sol.color = (.7, .78, 1); ls = bpy.data.objects.new('Lua', sol); ls.rotation_euler = (math.radians(55), 0, math.radians(-30)); sc.collection.objects.link(ls)
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value = (.015, .017, .025, 1)
cd = bpy.data.cameras.new('Cam'); cd.lens = 28; cam = bpy.data.objects.new('Cam', cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = O + fr * 1.5 + lat * 6.5 + Vector((0, 0, 3.6))
alvo = bpy.data.objects.new('AlvoCam', None); alvo.location = O + fr * 3.2 + Vector((0, 0, .4)); sc.collection.objects.link(alvo); alvo.empty_display_size = 0
tc = cam.constraints.new('TRACK_TO'); tc.target = alvo
r = sc.render
try: r.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    try: r.engine = 'BLENDER_EEVEE'
    except TypeError as e: print(e)
r.resolution_x = 960; r.resolution_y = 540
try:                                                                     # Blender 5: o compositor e um grupo de nos da cena
    nt = bpy.data.node_groups.new('Brilho', 'CompositorNodeTree'); sc.compositing_node_group = nt
    rl = nt.nodes.new('CompositorNodeRLayers'); gl = nt.nodes.new('CompositorNodeGlare')
    for nome_, v_ in (('Type', 'Bloom'), ('Quality', 'High'), ('Threshold', .8), ('Strength', .9)):   # Blender 5: tipo/qualidade sao entradas do no
        try: gl.inputs[nome_].default_value = v_
        except Exception as e_: print('glare', nome_, e_)
    try: gl.inputs['Size'].default_value = .8
    except Exception: pass
    sai = nt.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor'); go = nt.nodes.new('NodeGroupOutput')
    nt.links.new(rl.outputs['Image'], gl.inputs['Image']); nt.links.new(gl.outputs['Image'], go.inputs[0])
    print('compositor ok', [i.name for i in gl.inputs][:8])
except Exception as e: print('compositor:', e)
try:
    import addon_utils; addon_utils.enable('blender_mcp_addon', default_set=True, persistent=True); sc.blendermcp_auto_start_server = True
except Exception as e: print('mcp:', e)
sc.frame_set(IMPACTO + 8)
bpy.ops.wm.save_as_mainfile(filepath=SAIDA)
print('SALVO', SAIDA)
