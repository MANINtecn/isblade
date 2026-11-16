"""Biblioteca comum dos efeitos refinados do Guardiao (Blender via MCP). Extraida da skill 1 (guardiao_s1_feixe.py), aprovada pelo dono 16/11/2026.
Receita (DIARIO, healer + estilo-fx-refinado): luz pura e leve, miolo branco quente caindo para ouro, Optical Lens Flare em toda skill,
transparencia aditiva com queda suave, nada maciço, nada redondo (anel/domo/esfera), nada girando como serra.
Uso dentro do Blender:
    import sys, importlib; sys.path.insert(0, PASTA); import guardiao_fx_lib as L; importlib.reload(L)
    L.cena('GUARDIAO_S2_EGIDE', 'G2', 'L2_Skill2_Slam', fim=260)      # cria/reaproveita a cena com o Guardiao tocando a acao
    L.colecao('G2_FX')                                               # limpa e devolve a colecao de efeitos
Unidades: personagem ~40 u de altura (1 m ~ 22 u). Frente do personagem = -Y."""
import bpy, math, os
from mathutils import Vector

M = 22.0                                   # 1 metro do jogo em unidades da cena
OURO = (1.0, 0.62, 0.18)
OURO_CLARO = (1.0, 0.82, 0.45)
AMBAR = (1.0, 0.45, 0.10)
BRANCO_Q = (1.0, 0.95, 0.85)
FX_DIR = None
SC = None; COL = None; CAM = None; PREF = 'GX'

def _fx_dir():
    return os.path.normpath(os.path.join(os.path.dirname(bpy.data.filepath), '..', 'fx'))

def img(n):
    im = bpy.data.images.get(n)
    if im: im.reload(); return im
    return bpy.data.images.load(os.path.join(_fx_dir(), n))

# ------------------------------------------------------------------ material de luz (o mesmo da skill 1)
def mat(nome, imagem, cor, forca=6.0, quente=2.5, facing=0.0, rolar=None, ao_longo=False, rep=(1, 1), so_facing=False, base=0.0, some=0.72, aro=0.0, nasce=0.04):
    """emissao aditiva: alfa = textura * alfa do objeto (ob.color[3]); cor = ouro -> branco onde a textura e forte.
    facing: bordas de silhueta somem; ao_longo: some ao longo de U (U = comprimento/altura); base: preenche vazios da textura."""
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
    elif base:
        bb = N('ShaderNodeMapRange'); bb.inputs['To Min'].default_value = base; L(tx.outputs['Alpha'], bb.inputs['Value']); L(bb.outputs[0], a.inputs[0])
    else: L(tx.outputs['Alpha'], a.inputs[0])
    if facing:
        lw = N('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
        inv = N('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; L(lw.outputs['Facing'], inv.inputs[1])
        pw = N('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = facing; L(inv.outputs[0], pw.inputs[0])
        a2 = N('ShaderNodeMath'); a2.operation = 'MULTIPLY'; L(a.outputs[0], a2.inputs[0]); L(pw.outputs[0], a2.inputs[1]); a = a2
    if aro:                                         # brilho de borda (fresnel): forte onde a superficie vira de lado (domo)
        lw2 = N('ShaderNodeLayerWeight'); lw2.inputs['Blend'].default_value = 0.5
        pw2 = N('ShaderNodeMath'); pw2.operation = 'POWER'; pw2.inputs[1].default_value = aro; L(lw2.outputs['Facing'], pw2.inputs[0])
        ad = N('ShaderNodeMath'); ad.operation = 'MULTIPLY_ADD'; ad.inputs[2].default_value = 0.12; L(pw2.outputs[0], ad.inputs[0]); ad.inputs[1].default_value = 1.0
        a5 = N('ShaderNodeMath'); a5.operation = 'MULTIPLY'; L(a.outputs[0], a5.inputs[0]); L(ad.outputs[0], a5.inputs[1]); a = a5
    if ao_longo:
        sp = N('ShaderNodeSeparateXYZ'); L(tc.outputs['UV'], sp.inputs[0])
        f1 = N('ShaderNodeMath'); f1.operation = 'SUBTRACT'; f1.inputs[0].default_value = 1.0; L(sp.outputs['X'], f1.inputs[1])
        f2 = N('ShaderNodeMath'); f2.operation = 'DIVIDE'; f2.use_clamp = True; f2.inputs[1].default_value = max(1e-3, 1.0 - some); L(f1.outputs[0], f2.inputs[0])
        fr = N('ShaderNodeMath'); fr.operation = 'POWER'; fr.inputs[1].default_value = 2.0; L(f2.outputs[0], fr.inputs[0])
        fi = N('ShaderNodeMapRange'); fi.inputs['From Min'].default_value = 0.0; fi.inputs['From Max'].default_value = nasce; L(sp.outputs['X'], fi.inputs['Value'])
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

def rola(m, f0, f1, ate=-2.0, eixo=0):
    """corre a textura (filamentos) entre f0 e f1"""
    mp = m.node_tree.nodes['MAP']; v = [0, 0, 0]
    mp.inputs['Location'].default_value = (0, 0, 0); mp.inputs['Location'].keyframe_insert('default_value', frame=f0)
    v[eixo] = ate; mp.inputs['Location'].default_value = tuple(v); mp.inputs['Location'].keyframe_insert('default_value', frame=f1)
    fc = m.node_tree.animation_data.action
    try:
        for l in fc.layers:
            for s in l.strips:
                for cb in s.channelbags:
                    for c in cb.fcurves:
                        for k in c.keyframe_points: k.interpolation = 'LINEAR'
    except Exception: pass

# ------------------------------------------------------------------ cena
def _copia_comp(dst):
    """compositor proprio por cena (bloom). O no Render Layers PRECISA apontar para a propria cena (compartilhar o da skill 1 renderizava a skill 1)."""
    dst.use_nodes = True
    ng = bpy.data.node_groups.get(dst.name + '_Comp')
    if not ng:
        src = bpy.data.scenes.get('GUARDIAO_S1_FEIXE')
        base = src.compositing_node_group if src else None
        ng = base.copy() if base else bpy.data.node_groups.new(dst.name + '_Comp', 'CompositorNodeTree')
        ng.name = dst.name + '_Comp'
    for n in ng.nodes:
        if n.bl_idname == 'CompositorNodeRLayers': n.scene = dst
    dst.compositing_node_group = ng

def aponta(o, alvo):
    d = Vector(alvo) - o.location; o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def cena(nome, pref, acao, fim, fps=48, cam_pos=(150, -60, 60), cam_alvo=(0, -40, 18), lente=28):
    """cria (ou reaproveita) a cena com uma copia do Guardiao (prefixo pref_) tocando a acao; devolve a cena"""
    global SC, CAM, PREF
    PREF = pref
    sc = bpy.data.scenes.get(nome)
    if not sc:
        sc = bpy.data.scenes.new(nome); src = bpy.data.objects['HumanFighter_Armature']; g1sh = bpy.data.objects['G1_Shield_Guardian']
        arm = src.copy(); arm.data = src.data; arm.name = pref + '_Armature'; sc.collection.objects.link(arm)
        arm.animation_data_clear(); arm.location = (0, 0, 0)
        for c in src.children:
            n = c.copy(); n.name = pref + '_' + c.name; n.parent = arm
            for md in n.modifiers:
                if md.type == 'ARMATURE': md.object = arm
            if c.name == 'Shield_Guardian':
                n.location = g1sh.location.copy(); n.rotation_euler = g1sh.rotation_euler.copy(); n.scale = g1sh.scale.copy()
            sc.collection.objects.link(n)
        ch = bpy.data.objects['G1_Chao'].copy(); ch.name = pref + '_Chao'; ch.scale = (3, 3, 1); sc.collection.objects.link(ch)
        sol = bpy.data.objects['G1_Sol'].copy(); sol.name = pref + '_Sol'; sc.collection.objects.link(sol)
        cd = bpy.data.cameras.new(pref + '_Cam'); cam = bpy.data.objects.new(pref + '_Cam', cd); sc.collection.objects.link(cam); cd.clip_end = 5000
        sc.world = bpy.data.worlds.get('G1_Mundo'); sc.render.engine = bpy.data.scenes['GUARDIAO_S1_FEIXE'].render.engine
        sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    arm = bpy.data.objects[pref + '_Armature']
    arm.animation_data_create(); arm.animation_data.action = bpy.data.actions[acao]
    try: arm.animation_data.action_slot = arm.animation_data.action_suitable_slots[0]
    except Exception: pass
    _copia_comp(sc)
    sc.render.fps = fps; sc.frame_start = 0; sc.frame_end = fim
    cam = bpy.data.objects[pref + '_Cam']; cam.location = cam_pos; aponta(cam, cam_alvo); cam.data.lens = lente
    sc.camera = cam; SC = sc; CAM = cam
    return sc

def camera_extra(nome, pos, alvo, lente=30):
    o = bpy.data.objects.get(nome)
    if not o:
        o = bpy.data.objects.new(nome, bpy.data.cameras.new(nome)); SC.collection.objects.link(o); o.data.clip_end = 5000
    o.location = pos; aponta(o, alvo); o.data.lens = lente; return o

def colecao(nome):
    global COL
    col = bpy.data.collections.get(nome)
    if col:
        for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        col = bpy.data.collections.new(nome); SC.collection.children.link(col)
    COL = col; return col

def mira_camera(cam):
    """faz os flares (billboards) olharem para a camera usada no render"""
    SC.camera = cam
    for o in COL.objects:
        for k in o.constraints:
            if k.type == 'TRACK_TO' and k.target and k.target.type == 'CAMERA': k.target = cam

# ------------------------------------------------------------------ pecas
def _obj(nome, me, m, pai=None):
    ob = bpy.data.objects.new(nome, me); ob.data.materials.append(m); COL.objects.link(ob)
    if pai: ob.parent = pai
    return ob

def plano(nome, w, h, m, pai=None, deitado=False):
    me = bpy.data.meshes.new(nome)
    if deitado: vs = [(-w/2, -h/2, 0), (w/2, -h/2, 0), (w/2, h/2, 0), (-w/2, h/2, 0)]
    else: vs = [(-w/2, 0, -h/2), (w/2, 0, -h/2), (w/2, 0, h/2), (-w/2, 0, h/2)]
    me.from_pydata(vs, [], [(0, 1, 2, 3)]); uv = me.uv_layers.new()
    for i, c in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[i].uv = c
    return _obj(nome, me, m, pai)

def cilindro(nome, r, comp, m, segs=24, rep_v=2, r1=None):
    """tubo (ou cone se r1) ao longo de -Y local, base em 0. UV: U = comprimento (0 na base), V = volta."""
    r1 = r if r1 is None else r1; vs, fs = [], []
    for i, rr in enumerate((r, r1)):
        for s in range(segs + 1):
            a = s / segs * 2 * math.pi; vs.append((math.cos(a) * rr, -comp * i, math.sin(a) * rr))
    for s in range(segs): fs.append((s, s + 1, segs + 1 + s + 1, segs + 1 + s))
    me = bpy.data.meshes.new(nome); me.from_pydata(vs, [], fs); uv = me.uv_layers.new()
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices): uv.data[li].uv = (vi // (segs + 1), (vi % (segs + 1)) / segs * rep_v)
    return _obj(nome, me, m)

def domo(nome, R, m, seg=48, aneis=16, rep_v=4):
    """meio domo (cupula) centrado na origem. UV: U = altura (0 na base, 1 no topo), V = volta."""
    vs, fs = [], []
    for j in range(aneis + 1):
        la = j / aneis * math.pi / 2
        for i in range(seg + 1):
            a = i / seg * 2 * math.pi; vs.append((math.cos(a) * math.cos(la) * R, math.sin(a) * math.cos(la) * R, math.sin(la) * R))
    for j in range(aneis):
        for i in range(seg): a0 = j * (seg + 1) + i; fs.append((a0, a0 + 1, a0 + seg + 2, a0 + seg + 1))
    me = bpy.data.meshes.new(nome); me.from_pydata(vs, [], fs); uv = me.uv_layers.new()
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices): uv.data[li].uv = ((vi // (seg + 1)) / aneis, (vi % (seg + 1)) / seg * rep_v)
    me.shade_smooth()
    return _obj(nome, me, m)

def parede(nome, pts, alt, m, rep_v=None, fechada=True):
    """veu vertical ao longo de uma linha de pontos no chao (x, y). UV: U = altura (0 no chao), V = ao longo da linha."""
    P = list(pts) + ([pts[0]] if fechada else []); vs, fs = [], []
    tot = [0.0]
    for a, b in zip(P, P[1:]): tot.append(tot[-1] + (Vector(b) - Vector(a)).length)
    rep_v = rep_v or max(1.0, tot[-1] / 60.0)
    for (x, y) in P: vs += [(x, y, 0), (x, y, alt)]
    for i in range(len(P) - 1): fs.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    me = bpy.data.meshes.new(nome); me.from_pydata(vs, [], fs); uv = me.uv_layers.new()
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices): uv.data[li].uv = (vi % 2, tot[vi // 2] / tot[-1] * rep_v)
    return _obj(nome, me, m)

def poligono(R, lados, rot=0.0):
    return [(math.cos(rot + i / lados * 2 * math.pi) * R, math.sin(rot + i / lados * 2 * math.pi) * R) for i in range(lados)]

def olha_camera(ob):
    c = ob.constraints.new('TRACK_TO'); c.target = CAM; c.track_axis = 'TRACK_NEGATIVE_Y'; c.up_axis = 'UP_Z'

def aponta_para(ob, alvo_pos, nome_alvo):
    """faz o eixo Z do objeto apontar para alvo_pos (lascas alongadas)"""
    al = bpy.data.objects.new(nome_alvo, None); al.location = alvo_pos; COL.objects.link(al); al.hide_viewport = al.hide_render = True
    c = ob.constraints.new('DAMPED_TRACK'); c.target = al; c.track_axis = 'TRACK_Z'; return al

def chave(ob, frames_vals, prop):
    for f, v in frames_vals:
        if prop == 'alfa': ob.color[3] = v; ob.keyframe_insert('color', index=3, frame=f)
        elif prop == 'esc': ob.scale = v if isinstance(v, tuple) else (v, v, v); ob.keyframe_insert('scale', frame=f)
        elif prop == 'loc': ob.location = v; ob.keyframe_insert('location', frame=f)
        elif prop == 'rot': ob.rotation_euler = v; ob.keyframe_insert('rotation_euler', frame=f)

def luz(nome, energia_frames, cor, pos=(0, 0, 0), pai=None):
    ld = bpy.data.lights.new(nome, 'POINT'); ld.color = cor; ld.shadow_soft_size = 2
    ob = bpy.data.objects.new(nome, ld); COL.objects.link(ob); ob.location = pos
    if pai: ob.parent = pai
    for f, e in energia_frames: ld.energy = e; ld.keyframe_insert('energy', frame=f)
    return ob

def flare(nome, pos, frames_esc, frames_alfa, m):
    """Optical Lens Flare (billboard) — regra de toda skill"""
    o = plano(nome, 1, 1, m); o.location = pos; olha_camera(o); chave(o, frames_esc, 'esc'); chave(o, frames_alfa, 'alfa'); return o

# ------------------------------------------------------------------ materiais padrao (texturas de guardiao_s1_texturas.py)
def mats():
    return {
        'flare': mat('GXm_flare', 'guardiao_s1_flare.png', OURO, forca=9.0, quente=1.6),
        'flare_c': mat('GXm_flare_claro', 'guardiao_s1_flare.png', OURO_CLARO, forca=7.0, quente=1.3),
        'lasca': mat('GXm_lasca', 'guardiao_s1_lasca.png', OURO, forca=8.0, quente=2.0),
    }

def render(arqs, pasta, res=60):
    """arqs = [(camera, frame, nome_png)]. A cena SC precisa ja ser a ativa da janela (trocar numa chamada anterior: renderizar outra cena derrubou o Blender)."""
    assert bpy.context.scene == SC, "troque a cena da janela antes de renderizar"
    SC.render.resolution_percentage = res; bpy.context.window.scene = SC
    for cam, f, n in arqs:
        mira_camera(cam); SC.frame_set(f); SC.render.filepath = os.path.join(pasta, n); bpy.ops.render.render(write_still=True)
    SC.render.resolution_percentage = 100
