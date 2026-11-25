"""Galeria dos golpes nativos do L2 (lutador humano): um boneco por animacao de combate, todos rodando em loop, com o nome em cima e a arma certa na mao.
Serve para escolher a base das skills do guerreiro (as 6 do inicio e as futuras da arvore de habilidades).
Uso:  blender.exe -b --python prototipo/tools/blender_fx/galeria_nativos.py   -> grava prototipo/assets/personagens/galeria_golpes_l2.blend
Depois: blender.exe prototipo/assets/personagens/galeria_golpes_l2.blend  (o MCP inicia sozinho)."""
import bpy, os, math, re
from mathutils import Euler

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = os.path.join(RAIZ, 'assets', 'personagens')
CORPO = os.path.join(P, 'human_fighter_nograde.glb')
SAIDA = os.path.join(P, 'galeria_golpes_l2.blend')
ARMAS = {'2HS': ['twohanded_sword.glb', None], '1HS': ['gladius.glb', 'composite_shield.glb'], 'Dual': ['gladius.glb', 'gladius.glb'],
         'Pole': ['ghost_staff.glb', None], 'Cast': ['ghost_staff.glb', None], 'Magic': ['ghost_staff.glb', None], 'Bow': [None, None], 'Hand': [None, None], 'Mix': ['twohanded_sword.glb', None]}
ORDEM = ['2HS', '1HS', 'Dual', 'Pole', 'Hand', 'Bow', 'Cast', 'Magic', 'Mix']
LOOP = 240                    # quadros da linha do tempo (10 s a 24 qps); cada golpe repete dentro dela
ESP = 2.6                     # espaco entre bonecos (m, depois de normalizar a altura para 1,8 m)

def grupo(nome):
    if nome in ('slash1', 'slash2', 'slash3', 'slash4', 'parry', 'guard', 'block_hit'): return 'Mix'
    if nome.startswith('Cast'): return 'Cast'
    if nome.startswith('Magic'): return 'Magic'
    if nome.startswith('ShieldAtk'): return '1HS'
    if nome.startswith('Social_Atk'): return 'Hand'
    m = re.search(r'_(2HS|1HS|Dual|Pole|Bow|Hand)$', nome); return m.group(1) if m else None

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 0; sc.frame_end = LOOP - 1

antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=CORPO)
base = [o for o in bpy.data.objects if o not in antes]
arm0 = next(o for o in base if o.type == 'ARMATURE')
for o in base:
    if o.animation_data:
        for t in list(o.animation_data.nla_tracks): o.animation_data.nla_tracks.remove(t)
        o.animation_data.action = None
bpy.context.view_layer.update()
zs = [(o.matrix_world @ v.co).z for o in base if o.type == 'MESH' for i, v in enumerate(o.data.vertices) if i % 50 == 0]
alt = (max(zs) - min(zs)) or 1.8
esc = 1.8 / alt                                                       # todo mundo com 1,8 m

def carrega_arma(arq):
    antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(P, arq))
    novos = [o for o in bpy.data.objects if o not in antes]
    for o in novos: o.hide_set(True); o.hide_render = True
    return novos
ARMA_OBJ = {}
def molde(arq):
    if arq not in ARMA_OBJ: ARMA_OBJ[arq] = carrega_arma(arq)
    return ARMA_OBJ[arq]

def copia_arma(arq, arm, osso, col):
    piv = bpy.data.objects.new('Arma_' + osso, None); col.objects.link(piv); piv.empty_display_size = .05
    mapa = {}
    for o in molde(arq):
        n = o.copy(); col.objects.link(n); n.hide_set(False); n.hide_render = False; mapa[o] = n
    for o, n in mapa.items(): n.parent = mapa.get(o.parent, piv)
    c = piv.constraints.new('CHILD_OF'); c.target = arm; c.subtarget = osso; c.set_inverse_pending = False
    return piv

acoes = {a.name: a for a in bpy.data.actions}
def nome_limpo(a): return a.replace('_MFighter', '')
alvos = []
for a in acoes:
    n = nome_limpo(a); g = grupo(n)
    if g is None or not (n.startswith(('Atk', 'SpAtk', 'Cast', 'Magic', 'ShieldAtk', 'Social_Atk')) or g == 'Mix'): continue
    if n.startswith('AtkWait') or n == 'CastEnd': continue
    alvos.append((ORDEM.index(g), n, g, acoes[a]))
alvos.sort(key=lambda x: (x[0], x[1]))
print('golpes na galeria:', len(alvos))

mat_txt = bpy.data.materials.new('Rotulo'); mat_txt.use_nodes = True
b = next(n for n in mat_txt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value = (1, .85, .35, 1)
try: b.inputs['Emission Color'].default_value = (1, .85, .35, 1); b.inputs['Emission Strength'].default_value = 2
except Exception: pass

COLS = 8; grupo_ant = None; lin = -1; col_i = COLS
for gi, nome, g, act in alvos:
    if g != grupo_ant or col_i >= COLS:
        lin += 1 if g == grupo_ant else (2 if grupo_ant else 1); col_i = 0; grupo_ant = g
    x = col_i * ESP; y = lin * ESP * 1.25; col_i += 1
    col = bpy.data.collections.new(nome); sc.collection.children.link(col)
    arm = arm0.copy(); arm.data = arm0.data; col.objects.link(arm)          # mesmo esqueleto (dados), pose propria (objeto)
    arm.location = (x, y, 0); arm.scale = (esc, esc, esc) if arm0.parent is None else arm.scale
    for o in base:
        if o.type == 'MESH':
            m = o.copy(); col.objects.link(m); m.parent = arm
            for md in m.modifiers:
                if md.type == 'ARMATURE': md.object = arm
    arm.animation_data_create(); tr = arm.animation_data.nla_tracks.new(); tr.name = nome
    f0, f1 = act.frame_range; dur = max(1, f1 - f0)
    st = tr.strips.new(nome, 0, act); st.repeat = max(1, math.ceil(LOOP / (dur + 6)))
    try:
        if st.action_suitable_slots: st.action_slot = st.action_suitable_slots[0]
    except Exception: pass
    st.extrapolation = 'HOLD'
    d, e = ARMAS[g]
    if d: copia_arma(d, arm, 'Weapon_R_Bone', col)
    if e: copia_arma(e, arm, 'Shield_L_Bone' if 'shield' in e else 'Weapon_L_Bone', col)
    cu = bpy.data.curves.new(nome + '_txt', 'FONT'); cu.body = '%s\n%.2f s  %s' % (nome, dur / 24.0, g); cu.size = .22; cu.align_x = 'CENTER'
    t = bpy.data.objects.new(nome + '_txt', cu); col.objects.link(t); t.location = (x, y, 2.25); t.rotation_euler = (math.radians(90), 0, 0); t.data.materials.append(mat_txt)

for o in base: o.hide_set(True); o.hide_render = True                    # o original fica escondido (so serve de molde)

bpy.ops.mesh.primitive_plane_add(size=1, location=(COLS * ESP / 2 - ESP / 2, (lin * ESP * 1.25) / 2, 0)); chao = bpy.context.object
chao.scale = (COLS * ESP + 4, lin * ESP * 1.25 + 6, 1)
mat = bpy.data.materials.new('Chao'); mat.use_nodes = True; nt = mat.node_tree
bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); chk = nt.nodes.new('ShaderNodeTexChecker'); chk.inputs['Scale'].default_value = 40
chk.inputs['Color1'].default_value = (.3, .3, .32, 1); chk.inputs['Color2'].default_value = (.18, .18, .2, 1); nt.links.new(chk.outputs['Color'], bs.inputs['Base Color']); chao.data.materials.append(mat)
sol = bpy.data.lights.new('Sol', 'SUN'); sol.energy = 3.5; ls = bpy.data.objects.new('Sol', sol); ls.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(ls)
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value = (.06, .07, .09, 1)
cd = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (COLS * ESP / 2, -9, 6); cam.rotation_euler = (math.radians(65), 0, 0)
try:
    import addon_utils; addon_utils.enable('blender_mcp_addon', default_set=True, persistent=True)
except Exception as e: print('addon:', e)
try: sc.blendermcp_auto_start_server = True
except Exception as e: print('auto start MCP:', e)
bpy.ops.wm.save_as_mainfile(filepath=SAIDA)
print('SALVO', SAIDA, len(alvos))
