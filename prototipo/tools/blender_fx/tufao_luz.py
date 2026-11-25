"""Tufao (guerreiro) SO DE LUZ sobre o clipe aprovado w_n2 (10 giros, guerreiro_clips/MFighter.glb). v6 (25/11/2026, pedido do dono):
- CARGA antes do giro: o golpe segura ~0,5 s (HOLD) e a lamina se enche de energia, com faiscas puxadas para ela (o peso da espada pesada).
- RASTRO DA ESPADA e o protagonista: largo, em 3 camadas (miolo branco-quente no fio, energia vermelha com fios dourados, fumaca escura atras = peso).
- Funil de vento fino em volta (aprovado). NADA no chao (os arcos pareciam marcador). Golpe final = onda de choque na altura da lamina.
- Dreno de vida (Sede de Sangue).
Uso: blender.exe -b --python prototipo/tools/blender_fx/tufao_luz.py   -> prototipo/assets/personagens/tufao.blend"""
import bpy, os, sys, math, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
import luz_lib as LZ

random.seed(11)
SAIDA = os.path.join(LZ.PERS, 'tufao.blend')
HOLD = 12                                   # quadros de carga inseridos depois do quadro 5 do clipe (0,5 s a 24 qps)
SH = HOLD                                   # tudo depois da carga anda SH quadros
INI, FINAL, FIM = 8 + SH, 95 + SH, 118 + SH
GIROS = [g + SH for g in (8, 18, 27, 35, 44, 52, 59, 67, 75, 82)]
CORES = [(1, .95, .86), (1, .16, .07), (.55, .01, .03), (.06, 0, .01), (1, .62, .16)]   # branco-quente, vermelho vivo, carmim, quase preto, dourado

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 0; sc.frame_end = FIM

# ---------- lutador + espada + clipe w_n2 com a CARGA (NLA: segura o quadro 5 por HOLD quadros) ----------
antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(LZ.PERS, 'human_fighter_nograde.glb'))
corpo = [o for o in bpy.data.objects if o not in antes]
arm = next(o for o in corpo if o.type == 'ARMATURE' and 'HumanFighter' in o.name)
for o in corpo:
    if o.animation_data:
        for t in list(o.animation_data.nla_tracks): o.animation_data.nla_tracks.remove(t)
        o.animation_data.action = None
acoes0 = set(bpy.data.actions); antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(LZ.PERS, 'guerreiro_clips', 'MFighter.glb'))
act = next(a for a in bpy.data.actions if a not in acoes0 and a.name.startswith('w_n2'))
for o in [o for o in bpy.data.objects if o not in antes]: bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update()
zs = [(o.matrix_world @ v.co).z for o in corpo if o.type == 'MESH' for i, v in enumerate(o.data.vertices) if i % 40 == 0]
alt = max(zs) - min(zs); K = 1.8 / alt
for o in [o for o in corpo if o.parent is None]: o.scale = [s * K for s in o.scale]; o.location.z -= min(zs) * K
arm.animation_data_create(); ad = arm.animation_data; ad.action = None
def faixa(nome, ini, a0, a1, extra):
    tr = ad.nla_tracks.new(); tr.name = nome; st = tr.strips.new(nome, ini, act)
    st.action_frame_start = a0; st.action_frame_end = a1; st.extrapolation = extra
    try:
        if st.action_suitable_slots: st.action_slot = st.action_suitable_slots[0]
    except Exception: pass
    return st
faixa('Inicio', 0, 0, 5, 'HOLD_FORWARD')                   # 0..5 e segura o quadro 5 (a carga)
faixa('Giro', 5 + HOLD, 5, 130, 'NOTHING')                 # o resto do golpe comeca depois da carga

antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(LZ.PERS, 'twohanded_sword.glb'))
raiz_esp = [o for o in bpy.data.objects if o not in antes and o.parent is None]
esp_meshes = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']
piv = bpy.data.objects.new('EspadaPivo', None); sc.collection.objects.link(piv); piv.empty_display_size = 0
for o in raiz_esp: o.parent = piv
c = piv.constraints.new('CHILD_OF'); c.target = arm; c.subtarget = 'Weapon_R_Bone'; c.set_inverse_pending = False

# ---------- mao e ponta da lamina em todos os quadros ----------
AM = {}
for f in range(0, FIM + 1):
    sc.frame_set(f); bpy.context.view_layer.update()
    mao = (arm.matrix_world @ arm.pose.bones['Weapon_R_Bone'].matrix).translation.copy()
    cantos = [o.matrix_world @ Vector(v) for o in esp_meshes for v in o.bound_box]
    AM[f] = (mao, max(cantos, key=lambda p: (p - mao).length).copy())
def ponto(f, k): h, t = AM[max(0, min(FIM, f))]; return h + (t - h) * k
def ponto_sub(t, k):                                 # entre dois quadros: interpola girando em volta do corpo (a borda fica redonda, sem facetas)
    f0 = math.floor(t); e = t - f0; p0 = ponto(f0, k); p1 = ponto(f0 + 1, k)
    a0 = math.atan2(p0.y - C.y, p0.x - C.x); a1 = math.atan2(p1.y - C.y, p1.x - C.x); da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
    r0 = math.hypot(p0.x - C.x, p0.y - C.y); r1 = math.hypot(p1.x - C.x, p1.y - C.y); aa = a0 + da * e; rr = r0 + (r1 - r0) * e
    return Vector((C.x + math.cos(aa) * rr, C.y + math.sin(aa) * rr, p0.z + (p1.z - p0.z) * e))
pel = (arm.matrix_world @ arm.pose.bones['Bip01_Pelvis'].matrix).translation
C = Vector((pel.x, pel.y, 0))

col = bpy.data.collections.new('TufaoLuz'); sc.collection.children.link(col)
def so_no_quadro(ob, f):
    for ff, h in ((f - 1, True), (f, False), (f + 1, True)):
        ob.hide_viewport = h; ob.hide_render = h; ob.keyframe_insert('hide_viewport', frame=ff); ob.keyframe_insert('hide_render', frame=ff)

# ---------- 1) CARGA: a lamina se enche de energia (quadros 2 .. INI) ----------
M_CARGA = LZ.mat_luz('Carga', 9, CORES, borda=.8)
for f in range(2, INI + 1):
    h, t = AM[f]; d = (t - h).normalized(); o = d.cross(Vector((0, 0, 1)))
    o = o.normalized() if o.length > 1e-3 else Vector((1, 0, 0))
    e = min(1.0, (f - 2) / max(1, INI - 4))                   # 0 -> 1 ao longo da carga
    w = .05 + .16 * e; vs, uvs, fs = [], [], []
    for i in range(9):
        k = .1 + .95 * i / 8; p = h + (t - h) * k
        vs += [tuple(p - o * w / 2), tuple(p + o * w / 2)]; uvs += [(i / 8, 0), (i / 8, 1)]
    for i in range(8): fs.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    ob = LZ.malha('Carga%03d' % f, vs, fs, uvs, M_CARGA, col)
    ob['frente'] = 1.05; ob['abertura'] = .35 + .65 * e; ob['brilho'] = .3 + 1.9 * e
    so_no_quadro(ob, f)
M_FA = LZ.mat_luz('Faisca', 10, [CORES[0], CORES[4], CORES[1], CORES[2]])
for k in range(24):
    f0 = random.randint(2, INI - 7); a = random.uniform(0, 6.28); r = random.uniform(1.2, 2.3); z = random.uniform(.3, 2.2)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=random.uniform(.018, .035)); ob = bpy.context.object; ob.name = 'Faisca%d' % k
    for cc in list(ob.users_collection): cc.objects.unlink(ob)
    col.objects.link(ob); ob.data.materials.append(M_FA); ob.visible_shadow = False; ob['frente'] = 2.0; ob['abertura'] = 1.0
    kk = random.uniform(.3, 1.0)
    for i in range(7):
        e = i / 6; alvo = ponto(f0 + i, kk); ini_ = Vector((C.x + math.cos(a) * r, C.y + math.sin(a) * r, z))
        ob.location = ini_ * (1 - e * e) + alvo * (e * e); ob.keyframe_insert('location', frame=f0 + i)
    LZ.chave(ob, 'brilho', [(f0 - 1, 0), (f0, .7), (f0 + 5, 1.4), (f0 + 7, 0)])

# ---------- 2) RASTRO DA ESPADA em 3 camadas (o protagonista) ----------
M_FUM = LZ.mat_energia('RastroFumaca', .4, CORES, fumaca=True)
M_EN = LZ.mat_energia('RastroEnergia', 7, CORES)
M_MI = LZ.mat_rastro('RastroMiolo', 14, CORES)
def fita_rastro(nome, f, span, k0, k1, mat, dz=0.0, sub=5):
    vs, uvs, fs = [], [], []; ns = span * sub + 1             # span = quadros de rastro (~40 graus cada); sub = passos por quadro
    for i in range(ns):
        tt = f - span + i / sub; a = ponto_sub(tt, k0) + Vector((0, 0, dz)); b = ponto_sub(tt, k1) + Vector((0, 0, dz))
        vs += [tuple(a), tuple(b)]; uvs += [(i / (ns - 1), 0), (i / (ns - 1), 1)]
    for i in range(ns - 1): fs.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    ob = LZ.malha(nome, vs, fs, uvs, mat, col); so_no_quadro(ob, f); return ob
for f in range(INI, FINAL + 4):
    forte = 1.5 if f >= FINAL - 3 else 1.0
    fita_rastro('Fumaca%03d' % f, f, 5, .1, 1.2, M_FUM, -.04)['brilho'] = .9 * forte
    fita_rastro('Energia%03d' % f, f, 4, .2, 1.12, M_EN)['brilho'] = 1.0 * forte
    fita_rastro('Miolo%03d' % f, f, 3, .8, 1.03, M_MI)['brilho'] = 1.0 * forte

# ---------- 3) funil de vento fino em volta (aprovado) ----------
for k, (r0, r1, h, voltas, forca) in enumerate(((.9, 1.7, 2.2, 11, 1.8), (1.2, 2.1, 2.6, 8, 1.3))):
    nv, nh = 48, 8; vs, uvs, fs = [], [], []
    for j in range(nh + 1):
        t = j / nh; r = r0 + (r1 - r0) * t; z = .05 + h * t
        for i in range(nv + 1):
            a_ = i / nv * 2 * math.pi; vs.append((math.cos(a_) * r, math.sin(a_) * r, z)); uvs.append((i / nv, t))
    for j in range(nh):
        for i in range(nv): q = j * (nv + 1) + i; fs.append((q, q + 1, q + nv + 2, q + nv + 1))
    ob = LZ.malha('Funil%d' % k, vs, fs, uvs, LZ.mat_vento('Vento%d' % k, forca, CORES, (3.0 + k, 12.0 + 3 * k)), col)
    pv = bpy.data.objects.new('PivoFunil%d' % k, None); pv.location = C; col.objects.link(pv); pv.empty_display_size = 0; ob.parent = pv
    LZ.chave(ob, 'brilho', [(INI - 1, 0), (INI + 6, .75), (FINAL - 2, .85), (FINAL + 2, 1.15), (FINAL + 12, 0)])
    pv.rotation_euler = (0, 0, 0); pv.keyframe_insert('rotation_euler', frame=INI)
    pv.rotation_euler = (0, 0, -2 * math.pi * voltas); pv.keyframe_insert('rotation_euler', frame=FINAL + 12)

# ---------- 4) golpe final: onda de choque na ALTURA DA LAMINA (nao no chao) ----------
n = 56; vs, uvs, fs = [], [], []
for i in range(n + 1):
    a = i / n * 2 * math.pi
    for j, r in enumerate((.85, 1.2)): vs.append((math.cos(a) * r, math.sin(a) * r, 0)); uvs.append((i / n, j))
for i in range(n): fs.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
zf = (AM[FINAL][0].z + AM[FINAL][1].z) / 2
fin = LZ.malha('Onda', vs, fs, uvs, LZ.mat_luz('Onda', 7, CORES), col); fin.location = (C.x, C.y, max(.6, zf))
LZ.chave(fin, 'frente', [(FINAL, 1.05)]); LZ.chave(fin, 'abertura', [(FINAL, 1.0), (FINAL + 9, .4)])
LZ.chave(fin, 'brilho', [(FINAL - 1, 0), (FINAL, 2.0), (FINAL + 9, 0)])
for f, s in ((FINAL, 1.0), (FINAL + 9, 3.6)): fin.scale = (s, s, 1); fin.keyframe_insert('scale', frame=f)

# ---------- 5) dreno de vida: gotas que espiralam para o peito ----------
M_D = LZ.mat_luz('Dreno', 8, CORES)
for k in range(22):
    f0 = random.randint(INI + 4, FINAL - 6); a = random.uniform(0, 6.28); r = random.uniform(2.0, 2.8); z = random.uniform(.4, 1.6)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=random.uniform(.025, .04)); ob = bpy.context.object; ob.name = 'Dreno%d' % k
    for cc in list(ob.users_collection): cc.objects.unlink(ob)
    col.objects.link(ob); ob.data.materials.append(M_D); ob.visible_shadow = False; ob['frente'] = 2.0; ob['abertura'] = 1.0
    for i in range(6):
        e = i / 5; aa = a - e * 2.2; rr = r * (1 - e) + .15 * e; ob.location = (C.x + math.cos(aa) * rr, C.y + math.sin(aa) * rr, z * (1 - e) + 1.25 * e)
        ob.keyframe_insert('location', frame=f0 + i * 2)
    LZ.chave(ob, 'brilho', [(f0 - 1, 0), (f0, 1), (f0 + 9, 1), (f0 + 11, 0)])

LZ.cena_padrao(C, Vector((0, -1, 0)), dist=6.0, alt=3.2)
sc.frame_set(INI - 2)
bpy.ops.wm.save_as_mainfile(filepath=SAIDA)
print('SALVO', SAIDA, 'carga ate', INI, 'final', FINAL)
