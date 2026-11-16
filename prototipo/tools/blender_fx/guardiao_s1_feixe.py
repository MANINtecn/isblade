"""Skill 1 do Guardiao — FEIXE DO ESCUDO (v6, 16/11/2026). Roda dentro do Blender (MCP), cena GUARDIAO_S1_FEIXE do guardian_skills.blend.
Mecanica: segura a tecla ate 3 s carregando (o dano cresce), solta = feixe de luz saindo da face do escudo, para a frente.
Animacao: G1_Feixe (Magicshot do L2 espelhado para o braco do escudo; 30 fps):
  0-10 preparo | 10-98 carga segurada (3 s) | 103 SOLTA (impacto) | 103-122 feixe | 122-146 recuperacao.
Soltura = LEQUE de 45 graus em 3D (v7). Efeitos (colecao G1_FX): texturas de guardiao_s1_texturas.py; branco quente no miolo caindo para ouro; tudo aditivo e sem forma redonda.
Unidades da cena: personagem ~40 u de altura (1 m ~ 22 u). Frente do personagem = -Y."""
import bpy, math, random, os
from mathutils import Vector, Matrix

SC = bpy.data.scenes['GUARDIAO_S1_FEIXE']
SH = bpy.data.objects['G1_Shield_Guardian']
CAM = bpy.data.objects['G1_Cam']
FX_DIR = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'fx')
F_INI, F_CARGA, F_SOLTA, F_FIM_FEIXE, F_FIM = 10, 98, 103, 122, 146
ALC = 220.0                     # alcance do feixe (10 m)
OURO = (1.0, 0.62, 0.18)
OURO_CLARO = (1.0, 0.82, 0.45)
rng = random.Random(3)

def img(n):
    p = os.path.normpath(os.path.join(FX_DIR, n)); im = bpy.data.images.get(n)
    if im: im.reload(); return im
    return bpy.data.images.load(p)

def mat(nome, imagem, cor, forca=6.0, quente=2.5, facing=0.0, rolar=None, ao_longo=False, rep=(1, 1), so_facing=False, base=0.0, some=0.72):
    """emissao aditiva: alfa = textura * alfa do objeto (ob.color[3]); cor = ouro -> branco onde a textura e forte."""
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); L = nt.links.new; N = nt.nodes.new
    try: m.surface_render_method = 'BLENDED'
    except Exception: m.blend_method = 'BLEND'
    m.use_backface_culling = False
    out = N('ShaderNodeOutputMaterial'); tc = N('ShaderNodeTexCoord'); mp = N('ShaderNodeMapping'); mp.name = 'MAP'
    mp.inputs['Scale'].default_value = (rep[0], rep[1], 1)
    tx = N('ShaderNodeTexImage'); tx.image = img(imagem); tx.extension = 'REPEAT' if rolar else 'CLIP'
    L(tc.outputs['UV'], mp.inputs['Vector']); L(mp.outputs['Vector'], tx.inputs['Vector'])
    oi = N('ShaderNodeObjectInfo')
    a = N('ShaderNodeMath'); a.operation = 'MULTIPLY'; L(oi.outputs['Alpha'], a.inputs[1])
    if so_facing: a.inputs[0].default_value = 1.0
    elif base:                                     # preenche o vazio entre filamentos (sem buracos no veu)
        bb = N('ShaderNodeMapRange'); bb.inputs['To Min'].default_value = base; L(tx.outputs['Alpha'], bb.inputs['Value']); L(bb.outputs[0], a.inputs[0])
    else: L(tx.outputs['Alpha'], a.inputs[0])
    if facing:
        lw = N('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
        inv = N('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; L(lw.outputs['Facing'], inv.inputs[1])
        pw = N('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = facing; L(inv.outputs[0], pw.inputs[0])
        a2 = N('ShaderNodeMath'); a2.operation = 'MULTIPLY'; L(a.outputs[0], a2.inputs[0]); L(pw.outputs[0], a2.inputs[1]); a = a2
    if ao_longo:                                    # some na ponta do feixe (U do cilindro = comprimento)
        sp = N('ShaderNodeSeparateXYZ'); L(tc.outputs['UV'], sp.inputs[0])
        # queda suave e explicita: t = clamp((1 - U) / (1 - some)), alfa *= t^2 (some sem corte reto na ponta)
        f1 = N('ShaderNodeMath'); f1.operation = 'SUBTRACT'; f1.inputs[0].default_value = 1.0; L(sp.outputs['X'], f1.inputs[1])
        f2 = N('ShaderNodeMath'); f2.operation = 'DIVIDE'; f2.use_clamp = True; f2.inputs[1].default_value = max(1e-3, 1.0 - some); L(f1.outputs[0], f2.inputs[0])
        fr = N('ShaderNodeMath'); fr.operation = 'POWER'; fr.inputs[1].default_value = 2.0; L(f2.outputs[0], fr.inputs[0])
        fi = N('ShaderNodeMapRange'); fi.inputs['From Min'].default_value = 0.0; fi.inputs['From Max'].default_value = 0.04; L(sp.outputs['X'], fi.inputs['Value'])
        a3 = N('ShaderNodeMath'); a3.operation = 'MULTIPLY'; L(a.outputs[0], a3.inputs[0]); L(fr.outputs[0], a3.inputs[1])
        a4 = N('ShaderNodeMath'); a4.operation = 'MULTIPLY'; L(a3.outputs[0], a4.inputs[0]); L(fi.outputs[0], a4.inputs[1]); a = a4
    hot = N('ShaderNodeMath'); hot.operation = 'POWER'; hot.inputs[1].default_value = quente; L((a.outputs[0] if so_facing else tx.outputs['Alpha']), hot.inputs[0])
    mix = N('ShaderNodeMix'); mix.data_type = 'RGBA'; L(hot.outputs[0], mix.inputs['Factor'])
    mix.inputs['A'].default_value = (*cor, 1); mix.inputs['B'].default_value = (1, 0.97, 0.9, 1)
    em = N('ShaderNodeEmission'); em.inputs['Strength'].default_value = forca; L(mix.outputs['Result'], em.inputs['Color'])
    tr = N('ShaderNodeBsdfTransparent'); ms = N('ShaderNodeMixShader')
    cl = N('ShaderNodeMath'); cl.operation = 'MINIMUM'; cl.inputs[1].default_value = 1.0; L(a.outputs[0], cl.inputs[0])
    L(cl.outputs[0], ms.inputs[0]); L(tr.outputs[0], ms.inputs[1]); L(em.outputs[0], ms.inputs[2]); L(ms.outputs[0], out.inputs['Surface'])
    return m

# ------------------------------------------------------------------ limpeza e colecao
def limpa():
    col = bpy.data.collections.get('G1_FX')
    if col:
        for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        col = bpy.data.collections.new('G1_FX'); SC.collection.children.link(col)
    return col
COL = limpa()

def plano(nome, w, h, m, pai=None):
    me = bpy.data.meshes.new(nome)
    me.from_pydata([(-w/2, 0, -h/2), (w/2, 0, -h/2), (w/2, 0, h/2), (-w/2, 0, h/2)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new();
    for i, c in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[i].uv = c
    ob = bpy.data.objects.new(nome, me); ob.data.materials.append(m); COL.objects.link(ob)
    if pai: ob.parent = pai
    return ob

def cilindro(nome, r, comp, m, segs=24, rep_v=2):
    """cilindro ao longo de -Y local, base em 0. UV: U = comprimento (0 na boca, 1 na ponta), V = volta."""
    vs, fs, uvs = [], [], []
    for i in range(2):
        for s in range(segs + 1):
            a = s / segs * 2 * math.pi; vs.append((math.cos(a) * r, -comp * i, math.sin(a) * r))
    for s in range(segs):
        a, b = s, s + 1; c, d = segs + 1 + s + 1, segs + 1 + s; fs.append((a, b, c, d))
    me = bpy.data.meshes.new(nome); me.from_pydata(vs, [], fs); uv = me.uv_layers.new()
    for f, poly in zip(fs, me.polygons):
        for li, vi in zip(poly.loop_indices, poly.vertices):
            i = vi // (segs + 1); s = vi % (segs + 1); uv.data[li].uv = (i, s / segs * rep_v)
    me.shade_smooth() if hasattr(me, 'shade_smooth') else None
    ob = bpy.data.objects.new(nome, me); ob.data.materials.append(m); COL.objects.link(ob); return ob

def olha_camera(ob):
    c = ob.constraints.new('TRACK_TO'); c.target = SC.camera or CAM; c.track_axis = 'TRACK_NEGATIVE_Y'; c.up_axis = 'UP_Z'

def chave(ob, frames_vals, prop):
    for f, v in frames_vals:
        if prop == 'alfa':
            ob.color[3] = v; ob.keyframe_insert('color', index=3, frame=f)
        elif prop == 'esc':
            ob.scale = v if isinstance(v, tuple) else (v, v, v); ob.keyframe_insert('scale', frame=f)
        elif prop == 'loc':
            ob.location = v; ob.keyframe_insert('location', frame=f)

def luz(nome, energia_frames, cor, pos=(0, 0, 0), pai=None):
    ld = bpy.data.lights.new(nome, 'POINT'); ld.color = cor; ld.shadow_soft_size = 2
    ob = bpy.data.objects.new(nome, ld); COL.objects.link(ob); ob.location = pos
    if pai: ob.parent = pai
    for f, e in energia_frames: ld.energy = e; ld.keyframe_insert('energy', frame=f)
    return ob

# ------------------------------------------------------------------ materiais
M_FLARE = mat('G1m_flare', 'guardiao_s1_flare.png', OURO, forca=9.0, quente=1.6)
M_FLARE_C = mat('G1m_flare_claro', 'guardiao_s1_flare.png', OURO_CLARO, forca=7.0, quente=1.3)
M_LASCA = mat('G1m_lasca', 'guardiao_s1_lasca.png', OURO, forca=8.0, quente=2.0)
M_ONDA = mat('G1m_onda', 'guardiao_s1_onda.png', OURO, forca=3.0, quente=3.0)
M_MIOLO = mat('G1m_feixe_miolo', 'guardiao_s1_feixe.png', OURO_CLARO, forca=10.0, quente=0.8, facing=1.6, rolar=True, ao_longo=True, rep=(3, 1), so_facing=True)
M_VEU = mat('G1m_feixe_veu', 'guardiao_s1_feixe.png', OURO, forca=6.0, quente=3.0, facing=2.2, rolar=True, ao_longo=True, rep=(2, 1))

# ------------------------------------------------------------------ ancora na face do escudo (segue o escudo)
boca = bpy.data.objects.new('G1_Boca', None); boca.empty_display_size = 3; COL.objects.link(boca)
boca.parent = SH; boca.location = (0, -5.5, -3.0)          # local do escudo (escala .38): ~2 u a frente da face
SC.frame_set(F_SOLTA); bpy.context.view_layer.update()
P0 = boca.matrix_world.translation.copy()                   # boca do feixe no quadro da soltura
FW = Vector((0, -1, 0))

# ================================================================== 1. CARGA (10 -> 98): flare crescendo em 3 degraus
fl = plano('G1_CargaFlare', 1, 1, M_FLARE, pai=boca); olha_camera(fl)
chave(fl, [(F_INI, 0.0), (F_INI + 6, 22.0), (38, 26.0), (40, 42.0), (44, 36.0), (68, 40.0), (70, 60.0), (74, 52.0), (F_CARGA, 56.0),
           (F_SOLTA - 1, 64.0), (F_SOLTA, 0.0)], 'esc')
chave(fl, [(F_INI, 0.0), (F_INI + 6, 0.55), (39, 0.6), (40, 0.9), (69, 0.8), (70, 1.0), (F_CARGA, 1.0), (F_SOLTA, 0.0)], 'alfa')
# segundo flare girado 45 graus (estrela de 8 pontas so no 3o degrau = carga maxima)
fl2 = plano('G1_CargaFlareMax', 1, 1, M_FLARE_C, pai=boca); olha_camera(fl2); fl2.rotation_euler = (0, math.radians(45), 0)
chave(fl2, [(69, 0.0), (70, 46.0), (76, 34.0), (F_CARGA, 38.0), (F_SOLTA, 0.0)], 'esc')
chave(fl2, [(69, 0.0), (70, 1.0), (76, 0.55), (F_CARGA, 0.7), (F_SOLTA, 0.0)], 'alfa')
luz('G1_LuzCarga', [(F_INI, 0), (40, 2500), (70, 6000), (F_CARGA, 7000), (F_SOLTA, 12000), (F_SOLTA + 8, 3000), (F_FIM_FEIXE, 0)], OURO_CLARO, pai=boca)

# lascas de luz convergindo para o escudo (mais rapidas e mais numerosas a cada degrau)
for i in range(34):
    t = i / 34; f0 = int(F_INI + 4 + t * (F_CARGA - F_INI - 14)); dur = int(20 - t * 9)
    ang = rng.uniform(0, 2 * math.pi); el = rng.uniform(-0.6, 0.9); R = rng.uniform(22, 34)
    d = Vector((math.cos(ang) * math.cos(el), -abs(math.sin(ang)) * 0.4 + 0.15, math.sin(el)))
    la = plano('G1_CargaLasca%02d' % i, 1.0, 5.0, M_LASCA, pai=boca)
    c = la.constraints.new('TRACK_TO'); c.target = boca; c.track_axis = 'TRACK_Z'; c.up_axis = 'UP_Y'
    s = rng.uniform(0.7, 1.3) * (1 + t * 0.5)
    chave(la, [(f0, tuple(d * (R / 0.38))), (f0 + dur, (0, 0, 0))], 'loc')
    chave(la, [(f0 - 1, 0.0), (f0, s), (f0 + dur, s * 0.3), (f0 + dur + 1, 0.0)], 'esc')
    chave(la, [(f0, 0.0), (f0 + 3, 1.0), (f0 + dur, 0.9), (f0 + dur + 1, 0.0)], 'alfa')

# (sem placa no chao durante a carga: ficava pesada; o chao so acende na ponta do feixe)
SC.frame_set(F_CARGA)

# ================================================================== 2. SOLTURA (103 -> 122): LEQUE de luz de 45 graus em 3D saindo do escudo
ABRE = math.radians(8.0)                           # meia abertura (16 graus no total; 45 e 25 ficaram abertos demais) = mesmo cone do acerto no jogo

def cone(nome, meia, comp, m, segs=40, rep_v=4, r0=1.5):
    """cone ao longo de -Y local, boca (raio r0) em 0, ponta aberta em comp. UV: U = comprimento, V = volta."""
    vs, fs = [], []
    rf = r0 + comp * math.tan(meia)
    for i, (r, y) in enumerate(((r0, 0.0), (rf, -comp))):
        for sgm in range(segs + 1):
            an = sgm / segs * 2 * math.pi; vs.append((math.cos(an) * r, y, math.sin(an) * r))
    for sgm in range(segs): fs.append((sgm, sgm + 1, segs + 1 + sgm + 1, segs + 1 + sgm))
    me = bpy.data.meshes.new(nome); me.from_pydata(vs, [], fs); uv = me.uv_layers.new()
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            uv.data[li].uv = (vi // (segs + 1), (vi % (segs + 1)) / segs * rep_v)
    ob = bpy.data.objects.new(nome, me); ob.data.materials.append(m); COL.objects.link(ob); return ob

def rola(m, ate=-2.2):
    mp = m.node_tree.nodes['MAP']                               # filamentos correndo para a frente
    mp.inputs['Location'].default_value = (0, 0, 0); mp.inputs['Location'].keyframe_insert('default_value', frame=F_SOLTA)
    mp.inputs['Location'].default_value = (ate, 0, 0); mp.inputs['Location'].keyframe_insert('default_value', frame=F_FIM_FEIXE + 2)

def abre(ob, alfa, atraso=0, s_fim=1.04):
    """o leque nasce na boca e se abre ate 10 m em 3 quadros (escala uniforme = o angulo nao muda)"""
    f = F_SOLTA + atraso
    chave(ob, [(f - 1, 0.02), (f + 3, 1.0), (F_FIM_FEIXE - 4, 1.0), (F_FIM_FEIXE + 2, s_fim)], 'esc')
    chave(ob, [(f - 1, 0.0), (f, alfa), (F_FIM_FEIXE - 6, alfa), (F_FIM_FEIXE + 2, 0.0)], 'alfa')

M_LEQUE = mat('G1m_leque_veu', 'guardiao_s1_feixe.png', OURO, forca=6.0, quente=3.0, facing=1.5, rolar=True, ao_longo=True, rep=(2, 1), base=0.45, some=0.0)
M_LEQUE_IN = mat('G1m_leque_miolo', 'guardiao_s1_feixe.png', OURO_CLARO, forca=3.0, quente=1.6, facing=1.2, rolar=True, ao_longo=True, rep=(2, 1), so_facing=True, some=0.0)
M_RAIO = mat('G1m_leque_raio', 'guardiao_s1_feixe.png', OURO_CLARO, forca=9.0, quente=0.9, facing=1.4, rolar=True, ao_longo=True, rep=(3, 1), so_facing=True, some=0.2)
rola(M_LEQUE); rola(M_LEQUE_IN, -1.6); rola(M_RAIO, -3.0)

lv = cone('G1_LequeVeu', ABRE, ALC, M_LEQUE, r0=3.0); lv.location = P0; abre(lv, 1.0, atraso=1)
lm = cone('G1_LequeMiolo', ABRE * 0.6, ALC * 0.85, M_LEQUE_IN, r0=1.6); lm.location = P0; abre(lm, 0.4)

# raios finos dentro do leque (cada um numa direcao do cone): da textura de "feixes de luz" ao leque
for i in range(11):
    ang = rng.uniform(0, 2 * math.pi); rr = math.sqrt(rng.random()) * ABRE * 0.92
    d = Vector((math.sin(rr) * math.cos(ang), -math.cos(rr), math.sin(rr) * math.sin(ang))).normalized()
    ra = cilindro('G1_LequeRaio%02d' % i, rng.uniform(0.8, 1.6), ALC * rng.uniform(0.7, 1.0), M_RAIO)
    ra.location = P0; ra.rotation_mode = 'QUATERNION'; ra.rotation_quaternion = Vector((0, -1, 0)).rotation_difference(d)
    at = rng.randint(0, 3); f = F_SOLTA + at
    chave(ra, [(f - 1, (1, 0.02, 1)), (f + 3, (1, 1, 1)), (F_FIM_FEIXE - 5 + at, (1, 1, 1)), (F_FIM_FEIXE + at, (0.1, 1, 0.1))], 'esc')
    chave(ra, [(f - 1, 0.0), (f, rng.uniform(0.6, 1.0)), (F_FIM_FEIXE - 5 + at, 0.8), (F_FIM_FEIXE + at, 0.0)], 'alfa')

# clarao da boca: flare grande no escudo
bo = plano('G1_BocaFlare', 1, 1, M_FLARE_C); bo.location = P0; olha_camera(bo)
chave(bo, [(F_SOLTA - 1, 0.0), (F_SOLTA, 48.0), (F_SOLTA + 4, 34.0), (F_FIM_FEIXE - 4, 26.0), (F_FIM_FEIXE + 2, 0.0)], 'esc')
chave(bo, [(F_SOLTA - 1, 0.0), (F_SOLTA, 1.0), (F_FIM_FEIXE - 4, 0.8), (F_FIM_FEIXE + 2, 0.0)], 'alfa')

# frente de onda em losango correndo pelo leque: cresce junto com a abertura do cone (marca o alcance no ar)
for k in range(0):                                 # (frentes em losango removidas: contorno duro parecia falha)
    on = plano('G1_Onda%d' % k, 1, 1, M_ONDA); on.rotation_euler = (0, math.radians(45 * (k % 2)), 0)
    f0 = F_SOLTA + k * 4; d1 = ALC * (0.55 + 0.2 * k); lado = lambda dd: 2.4 * (6.0 + dd * math.tan(ABRE))
    chave(on, [(f0, P0 + FW * 6), (f0 + 12, P0 + FW * d1)], 'loc')
    chave(on, [(f0 - 1, 0.0), (f0, lado(6)), (f0 + 12, lado(d1))], 'esc')
    chave(on, [(f0 - 1, 0.0), (f0, 0.3), (f0 + 12, 0.0)], 'alfa')

# lascas espirrando dentro do leque
for i in range(26):
    la = plano('G1_SoltaLasca%02d' % i, 1.0, 6.0, M_LASCA); f0 = F_SOLTA + rng.randint(0, 8); dur = rng.randint(9, 15)
    ang = rng.uniform(0, 2 * math.pi); rr = rng.uniform(0.1, 1.0) * ABRE
    d = Vector((math.sin(rr) * math.cos(ang), -math.cos(rr), math.sin(rr) * math.sin(ang)))
    ini = P0 + d * rng.uniform(4, 20); fim = P0 + d * rng.uniform(110, ALC)
    la.location = ini; c = la.constraints.new('DAMPED_TRACK')
    alvo = bpy.data.objects.new('G1_SoltaAlvo%02d' % i, None); alvo.location = fim + d * 30; COL.objects.link(alvo); alvo.hide_viewport = alvo.hide_render = True
    c.target = alvo; c.track_axis = 'TRACK_Z'
    chave(la, [(f0, ini), (f0 + dur, fim)], 'loc')
    chave(la, [(f0 - 1, 0.0), (f0, rng.uniform(1.2, 2.0)), (f0 + dur, 0.4)], 'esc')
    chave(la, [(f0 - 1, 0.0), (f0, 1.0), (f0 + dur, 0.0)], 'alfa')

luz('G1_LuzLeque', [(F_SOLTA - 1, 0), (F_SOLTA, 8000), (F_FIM_FEIXE - 4, 3000), (F_FIM_FEIXE + 2, 0)], OURO, pos=tuple(P0 + FW * ALC * 0.45))
PT = P0 + FW * ALC
SC.frame_set(F_CARGA)
print('G1_FX:', len(COL.objects), 'objetos; boca', [round(v, 1) for v in P0], 'alcance', ALC, 'abertura', round(math.degrees(ABRE * 2)))
