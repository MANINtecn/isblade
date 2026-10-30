"""Monta a casa do Baium (topo da Torre da Insolencia, cliente 300x) num .blend para ajustar as pecas a mao.
Rodar:  blender -b --python montar_casa_baium.py -- <layout.json> <pasta_exp_umodel> <saida.blend>
  layout.json  = lista de atores {a (nome), m (malha), loc [x,y,z em uu do L2], rot [pitch,yaw,roll em 65536=360], s, s3}
  pasta_exp    = saida do umodel: <pasta>/aden_tower_of_hubris_s/StaticMesh/*.gltf e <pasta>/aden_tower_of_hubris_t/Texture/*.png
Cada ator vira UM objeto (nome = nome do ator no mapa) dentro de uma colecao por andar. Malhas iguais compartilham dados.
Regra que importa: o umodel exporta cada malha espelhada em Y; aqui espelhamos de volta uma vez por modelo."""
import bpy, json, math, os, sys, mathutils, collections

args = sys.argv[sys.argv.index('--') + 1:]
LAYOUT, EXP, OUT = args[0], args[1].rstrip('/\\') + '/', args[2]
PKG_S, PKG_T = 'aden_tower_of_hubris_s', 'aden_tower_of_hubris_t'
DIV = 100.0 / 2.8                      # uu do L2 por unidade (mesma escala da Talking Island)
BOSS = (116100.0, 17514.0, 10187.0)    # toh_boss02: pedestal do chefe = origem do mapa

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'

TEX = {}
tdir = EXP + PKG_T + '/Texture/'
for f in os.listdir(tdir):
    if f.lower().endswith('.png'): TEX[f[:-4].lower()] = tdir + f

lay = json.load(open(LAYOUT))
tpl, miss = {}, collections.Counter()

def carregar(nome):
    if nome in tpl: return tpl[nome]
    p = EXP + PKG_S + '/StaticMesh/' + nome + '.gltf'
    if not os.path.exists(p): tpl[nome] = None; return None
    antes = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=p)
    novos = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in antes]
    malhas = [o for o in novos if o.type == 'MESH']
    for o in malhas:
        for ms in o.material_slots:
            m = ms.material
            t = TEX.get(m.name.split('.')[0].lower()) if m and m.use_nodes else None
            if not t: continue
            bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf: continue
            img = bpy.data.images.load(t, check_existing=True); img.pack()
            tn = m.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = img
            m.node_tree.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
    for o in novos:
        for c in list(o.users_collection): c.objects.unlink(o)
    t = malhas[0] if malhas else None
    if t:   # umodel exporta espelhado em Y
        t.data.transform(mathutils.Matrix.Scale(-1, 4, (0, 1, 0))); t.data.flip_normals(); t.data.update()
    for o in novos:
        if o is not t: bpy.data.objects.remove(o, do_unlink=True)
    tpl[nome] = t
    return t

def colecao(nome):
    c = bpy.data.collections.get(nome)
    if not c: c = bpy.data.collections.new(nome); sc.collection.children.link(c)
    return c

cx = sum(a['loc'][0] for a in lay) / len(lay); cy = sum(a['loc'][1] for a in lay) / len(lay); cz = min(a['loc'][2] for a in lay)
off = mathutils.Vector(((BOSS[0] - cx) / DIV, (BOSS[1] - cy) / DIV, (BOSS[2] - cz) / DIV))
n = 0
for a in sorted(lay, key=lambda a: (a['loc'][2], a['m'])):
    t = carregar(a['m'])
    if not t: miss[a['m']] += 1; continue
    ob = bpy.data.objects.new(a['a'], t.data)
    andar = int((a['loc'][2] - BOSS[2]) // 500)            # faixas de 500 uu em relacao ao pedestal
    nome_col = ('Andar_%+d' % andar).replace('+', 'acima').replace('-', 'abaixo') if andar else 'Andar_0 (nivel do chefe)'
    colecao(nome_col).objects.link(ob)
    x, y, z = a['loc']
    ob.location = ((x - cx) / DIV - off.x, (y - cy) / DIV - off.y, (z - cz) / DIV - off.z)
    ps, ya, ro = [r / 65536.0 * 2 * math.pi for r in a['rot']]
    ob.rotation_euler = (mathutils.Matrix.Rotation(ya, 3, 'Z') @ mathutils.Matrix.Rotation(-ps, 3, 'Y') @ mathutils.Matrix.Rotation(ro, 3, 'X')).to_euler()
    k = 2.8 * a['s']; s3 = a['s3']
    ob.scale = (k * s3[0], k * s3[1], k * s3[2])
    ob['l2_malha'] = a['m']; ob['l2_pos_original_uu'] = [round(v, 1) for v in a['loc']]
    n += 1

# luz e fundo para ver as texturas (modo Material Preview: tecla Z)
sun = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN')); sun.data.energy = 3
sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
print('PRONTO: %d pecas, %d modelos, sem malha: %s' % (n, len([v for v in tpl.values() if v]), dict(miss)))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
