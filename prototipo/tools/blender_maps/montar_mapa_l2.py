"""Monta uma regiao de um mapa L2 (saida do umodel + layout do .unr) num .blend, uma peca = um objeto.
Rodar:  blender -b --python montar_mapa_l2.py -- <layout.json> <pasta_exp> <pkg_malhas> <pkg_texturas> <saida.blend> <origem x,y,z em uu> [terreno_mesh.json terreno.png]
  <pasta_exp>/<pkg_malhas>/StaticMesh/*.gltf   e   <pasta_exp>/<pkg_texturas>/{Texture,Shader,Combiner,...}
Regras aprendidas: (1) umodel exporta cada malha espelhada em Y -> espelhamos de volta uma vez por modelo;
(2) posicao = loc/35.714 (mesma escala da Talking Island), rotacao yaw direto, escala = 2.8 * DrawScale * DrawScale3D."""
import bpy, json, math, os, sys, mathutils, collections

a = sys.argv[sys.argv.index('--') + 1:]
LAYOUT, EXP, PKG_S, PKG_T, OUT = a[0], a[1].rstrip('/\\') + '/', a[2], a[3], a[4]
ORIGEM = tuple(float(v) for v in a[5].split(','))
TERR_JSON, TERR_PNG = (a[6], a[7]) if len(a) >= 8 and a[6] != '-' else (None, None)
BRUSH_JSON = a[8] if len(a) >= 9 else None        # brushes CSG (pisos e paredes grandes que o jogo desenha como BSP)
DIV = 100.0 / 2.8
SKIP = ('Default_Flame', 'E_F_flame', 'Gludio_Refine_Fire', 'FixBox')     # emissores de fogo/caixas: sem malha util

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'

TEX, MAT = {}, {}
td = EXP + PKG_T + '/'
for f in os.listdir(td + 'Texture'):
    if f.lower().endswith('.png'): TEX[f[:-4].lower()] = td + 'Texture/' + f
for sub in os.listdir(td):
    if sub == 'Texture' or not os.path.isdir(td + sub): continue
    for f in os.listdir(td + sub):
        if f.endswith('.mat'):
            for ln in open(td + sub + '/' + f, errors='ignore'):
                if ln.startswith('Diffuse='): MAT[f[:-4].lower()] = ln.strip().split('=', 1)[1].lower(); break
def tex_for(n):
    n = n.lower()
    if n in TEX: return TEX[n]
    t = MAT.get(n)
    if t and t in TEX: return TEX[t]
    if t and MAT.get(t) in TEX: return TEX[MAT[t]]

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
            t = tex_for(m.name.split('.')[0]) if m and m.use_nodes else None
            bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if t else None
            if not bsdf: continue
            img = bpy.data.images.load(t, check_existing=True); img.pack()
            tn = m.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = img
            m.node_tree.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
    for o in novos:
        for c in list(o.users_collection): c.objects.unlink(o)
    t = malhas[0] if malhas else None
    if t: t.data.transform(mathutils.Matrix.Scale(-1, 4, (0, 1, 0))); t.data.flip_normals(); t.data.update()
    for o in novos:
        if o is not t: bpy.data.objects.remove(o, do_unlink=True)
    tpl[nome] = t
    return t

def colecao(nome):
    c = bpy.data.collections.get(nome)
    if not c: c = bpy.data.collections.new(nome); sc.collection.children.link(c)
    return c

cx = sum(x['loc'][0] for x in lay) / len(lay); cy = sum(x['loc'][1] for x in lay) / len(lay); cz = min(x['loc'][2] for x in lay)
off = mathutils.Vector(((ORIGEM[0] - cx) / DIV, (ORIGEM[1] - cy) / DIV, (ORIGEM[2] - cz) / DIV))
n = 0
for x in sorted(lay, key=lambda q: (q['loc'][2], q['m'])):
    if x['m'].startswith(SKIP): continue
    t = carregar(x['m'])
    if not t: miss[x['m']] += 1; continue
    ob = bpy.data.objects.new(x['a'], t.data)
    andar = int((x['loc'][2] - ORIGEM[2]) // 500)
    colecao('Andar %s%d (z L2 %s)' % ('+' if andar >= 0 else '-', abs(andar) * 500, 'acima' if andar >= 0 else 'abaixo')).objects.link(ob)
    X, Y, Z = x['loc']
    ob.location = ((X - cx) / DIV - off.x, (Y - cy) / DIV - off.y, (Z - cz) / DIV - off.z)
    ps, ya, ro = [r / 65536.0 * 2 * math.pi for r in x['rot']]
    ob.rotation_euler = (mathutils.Matrix.Rotation(ya, 3, 'Z') @ mathutils.Matrix.Rotation(-ps, 3, 'Y') @ mathutils.Matrix.Rotation(ro, 3, 'X')).to_euler()
    k = 2.8 * x['s']; s3 = x['s3']; ob.scale = (k * s3[0], k * s3[1], k * s3[2])
    ob['l2_malha'] = x['m']; ob['l2_pos_original_uu'] = [round(v, 1) for v in x['loc']]
    n += 1

if TERR_JSON:        # terreno aproximado (mascara do radar + altura por setor)
    d = json.load(open(TERR_JSON))
    dep = os.environ.get('DEPRIMIR')          # 'x,y,raio,z' em uu: afunda o terreno dentro da torre (o terreno aproximado furava os pisos)
    if dep:
        dx, dy, dr, dz = (float(t) for t in dep.split(','))
        d['v'] = [[vx, vy, min(vz, dz) if math.hypot(vx - dx, vy - dy) < dr else vz] for vx, vy, vz in d['v']]
    me = bpy.data.meshes.new('Terreno'); me.from_pydata([((vx - cx) / DIV - off.x, (vy - cy) / DIV - off.y, (vz - cz) / DIV - off.z) for vx, vy, vz in d['v']], [], [tuple(f) for f in d['f']]); me.update()
    uv = me.uv_layers.new(name='UV')
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices): uv.data[li].uv = d['uv'][vi]
    mat = bpy.data.materials.new('Terreno'); mat.use_nodes = True
    bsdf = next(nn for nn in mat.node_tree.nodes if nn.type == 'BSDF_PRINCIPLED')
    tn = mat.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(TERR_PNG); tn.image.pack()
    mat.node_tree.links.new(tn.outputs['Color'], bsdf.inputs['Base Color']); me.materials.append(mat)
    colecao('Terreno (aproximado)').objects.link(bpy.data.objects.new('Terreno', me))

def construir_bsp(caminho):
    """Brushes do UnrealEd: Add (csg=1) soma volume, Subtract (csg=2) escava, na ORDEM do nivel. Coordenadas = as do mapa (sem espelho)."""
    bs = json.load(open(caminho)); col = colecao('BSP (pisos e paredes - brushes)')
    def conv(v): return ((v[0] - cx) / DIV - off.x, (v[1] - cy) / DIV - off.y, (v[2] - cz) / DIV - off.z)
    def malha(b, largo=False):
        idx, vs, fs = {}, [], []
        for f in b['faces']:
            ids = []
            for v in f['v']:
                p = conv(v); k = (round(p[0], 3), round(p[1], 3), round(p[2], 3))
                if k not in idx: idx[k] = len(vs); vs.append(p)
                ids.append(idx[k])
            P = [mathutils.Vector(vs[i]) for i in ids]          # normal de Newell vs normal do mapa
            nw = mathutils.Vector((0, 0, 0))
            for i in range(len(P)): u, w = P[i], P[(i + 1) % len(P)]; nw += mathutils.Vector(((u.y - w.y) * (u.z + w.z), (u.z - w.z) * (u.x + w.x), (u.x - w.x) * (u.y + w.y)))
            if nw.dot(mathutils.Vector(f['nor'])) < 0: ids.reverse()
            fs.append(ids)
        if largo:        # SUB 'largo': alarga um pouco em Z; usado so no ADD parceiro de mesma altura (cortes coplanares falhavam e deixavam lajes macicas)
            zs = [v[2] for v in vs]; zc = (min(zs) + max(zs)) / 2
            vs = [(v[0], v[1], v[2] + (0.05 if v[2] > zc else -0.05)) for v in vs]
        me = bpy.data.meshes.new(b['name']); me.from_pydata(vs, [], fs); me.update(); me.validate()
        ob = bpy.data.objects.new(b['name'], me); col.objects.link(ob); return ob
    mat = bpy.data.materials.new('BSP_pedra'); mat.use_nodes = True
    bsdf = next(nn for nn in mat.node_tree.nodes if nn.type == 'BSDF_PRINCIPLED'); bsdf.inputs['Base Color'].default_value = (.32, .30, .27, 1)
    t = TEX.get('toh_tile01') or TEX.get('toh_wall_05')
    if t:
        tn = mat.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(t); tn.image.pack(); tn.projection = 'BOX'
        tc = mat.node_tree.nodes.new('ShaderNodeTexCoord'); mp = mat.node_tree.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.08, .08, .08)
        mat.node_tree.links.new(tc.outputs['Object'], mp.inputs['Vector']); mat.node_tree.links.new(mp.outputs['Vector'], tn.inputs['Vector'])
        mat.node_tree.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
    # Cada brush ADD vira uma peca propria; so os SUB que vem DEPOIS dele na ordem do nivel e que encostam nele o cortam.
    # (a uniao sequencial de todos num so objeto perdia pisos finos; assim cada piso/parede fica editavel separado)
    def bbox(ob):
        ws = [ob.matrix_world @ mathutils.Vector(c) for c in ob.bound_box]
        return [min(w[k] for w in ws) for k in range(3)], [max(w[k] for w in ws) for k in range(3)]
    def toca(a, b, m=0.02):
        (a0, a1), (b0, b1) = bbox(a), bbox(b)
        return all(a0[k] < b1[k] - m and b0[k] < a1[k] - m for k in range(3))
    pecas, n_ok, n_falha = [], 0, 0          # pecas = [(indice, objeto)]
    for idx, b in enumerate(bs):
        if b['csg'] not in (1, 2): continue
        ob = malha(b)
        if b['csg'] == 1:
            ob.data.materials.append(mat); pecas.append(ob); ob.name = 'BSP_' + b['name']; ob['bsp_ordem'] = idx
            continue
        largo = None
        for p in pecas:                       # SUB: corta as pecas ADD anteriores que ele atravessa
            if not toca(p, ob): continue
            (p0, p1), (s0, s1) = bbox(p), bbox(ob)
            parceiro = abs(p0[2] - s0[2]) < 0.1 and abs(p1[2] - s1[2]) < 0.1        # mesma altura: oca o volume (coplanar -> usa a versao alargada)
            if parceiro and largo is None: largo = malha(b, True)
            op = largo if parceiro else ob
            md = p.modifiers.new('csg', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = op; md.solver = 'EXACT'; md.use_self = True
            bpy.context.view_layer.objects.active = p
            try: bpy.ops.object.modifier_apply(modifier='csg'); n_ok += 1
            except Exception as e: p.modifiers.remove(md); n_falha += 1
        if largo: bpy.data.objects.remove(largo, do_unlink=True)
        bpy.data.objects.remove(ob, do_unlink=True)
    print('BSP: %d pecas (brushes ADD), %d cortes ok, %d falharam' % (len(pecas), n_ok, n_falha))

if BRUSH_JSON: construir_bsp(BRUSH_JSON)

sun = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN')); sun.data.energy = 3
sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
print('PRONTO: %d pecas, %d modelos, sem malha: %s' % (n, len([v for v in tpl.values() if v]), dict(miss)))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
