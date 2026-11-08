# Luz pre-calculada do chao da cidade (Talking Island): monta a cidade com as MESMAS posicoes do jogo
# (assets/talking_island/village_data_threejs.json + getGroundHeight de cidade.html) e faz o bake da
# oclusao do ceu (so a luz do ceu, sem sol: o sol anda com o ciclo dia/noite) num chao de 176 x 176 m.
# Saida: assets/talking_island/luz/chao_ao.png (cinza; o jogo usa como aoMap no chao e na praca, UV pela posicao).
# Rodar dentro do Blender (MCP): exec(open(r"...\tools\blender_luz\cidade_luz.py").read()); depois monta() e assa().
import bpy, json, os, math, bmesh

R = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
GLB = os.path.join(R, "assets", "talking_island", "assembled_glb")
SAIDA = os.path.join(R, "assets", "talking_island", "luz")
BLEND = os.path.join(R, "tools", "blender_luz", "cidade_luz.blend")
L = 88.0          # meia largura do chao (m): x e z de -88 a 88
N = 264           # divisoes do chao (0,67 m)
RAIO = 110.0      # pecas mais longe que isso nao sombreiam o chao da cidade

def gh(x, z):     # copia de getGroundHeight (cidade.html)
    d = math.hypot(x, z)
    if d <= 21.0: return 0.02
    if d <= 23.0: return 0.02 * (1.0 - (d - 21.0) / 2.0)
    if d <= 76.0: return 0.0
    blend = min(1.0, (d - 76.0) / 22.0)
    hills = math.sin(x*0.032)*math.cos(z*0.032)*4.2 + math.sin(x*0.065+1.1)*2.0 + math.cos(z*0.055-0.7)*1.6
    ca = math.atan2(z, x); rb = 1.0
    for g in [-0.804, 0.704, -2.470, 2.352]:
        ad = abs(math.atan2(math.sin(ca-g), math.cos(ca-g))); cd = d*math.sin(ad)
        if cd < 14.0 and d < 170.0: rf = cd/14.0; rb = min(rb, rf*rf)
    hills *= rb
    if z > 80.0 and abs(x-28.0) < 32.0: hills -= (z-80.0)*0.045
    if d > 260.0: hills -= (d-260.0)*0.065
    return max(-4.8, hills*blend)

def monta():
    ents = json.load(open(os.path.join(R, "assets", "talking_island", "village_data_threejs.json"), encoding="utf-8"))
    ents = [e for e in ents if not (e["glb"] == "ti_centertop.glb" or e.get("name") == "SI_Centertop")]
    ents = [e for e in ents if math.hypot(e["pos"][0], e["pos"][2]) <= RAIO]
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)
    src = bpy.data.collections.new("FONTES"); bpy.context.scene.collection.children.link(src)
    cid = bpy.data.collections.new("CIDADE"); bpy.context.scene.collection.children.link(cid)
    fontes = {}
    for f in sorted(set(e["glb"] for e in ents)):
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(GLB, f))
        novos = [o for o in bpy.data.objects if o not in antes]
        for o in novos:
            for c in list(o.users_collection): c.objects.unlink(o)
            src.objects.link(o)
        fontes[f] = [o for o in novos if o.type == 'MESH']
    for e in ents:
        x, y, z = e["pos"]; s = e.get("scale", 1.0)
        raiz = bpy.data.objects.new("I_" + e["glb"][:-4], None); cid.objects.link(raiz)
        raiz.location = (x, -z, y + gh(x, z)); raiz.rotation_euler = (0, 0, e.get("rotY", 0) or 0); raiz.scale = (s, s, s)
        for o in fontes[e["glb"]]:
            c = bpy.data.objects.new(o.name + "_i", o.data); cid.objects.link(c)
            c.parent = raiz; c.matrix_basis = o.matrix_world.copy()
    src.hide_render = True; src.hide_viewport = True
    # chao com a altura do jogo; UV = posicao (u = (x+L)/2L, v = (L-z)/2L, z do jogo = -y do Blender)
    me = bpy.data.meshes.new("CHAO"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    vs = []
    for j in range(N + 1):
        zt = -L + 2*L*j/N; linha = []
        for i in range(N + 1):
            x = -L + 2*L*i/N; linha.append(bm.verts.new((x, -zt, gh(x, zt))))
        vs.append(linha)
    for j in range(N):
        for i in range(N):
            f = bm.faces.new((vs[j][i], vs[j+1][i], vs[j+1][i+1], vs[j][i+1]))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
        for lp in f.loops:
            lp[uvl].uv = ((lp.vert.co.x + L) / (2*L), (L + lp.vert.co.y) / (2*L))
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    chao = bpy.data.objects.new("CHAO", me); bpy.context.scene.collection.objects.link(chao)
    # material do chao: branco difuso + imagem alvo do bake
    m = bpy.data.materials.new("CHAO_M"); m.use_nodes = True; nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    img = bpy.data.images.get("chao_ao") or bpy.data.images.new("chao_ao", 2048, 2048, alpha=False, float_buffer=False)
    tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; tn.select = True; nt.nodes.active = tn
    me.materials.append(m)
    # ceu uniforme branco (so oclusao do ceu)
    w = bpy.context.scene.world or bpy.data.worlds.new("W"); bpy.context.scene.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 1.0
    # vista leve (solida) e camera de cima
    cd = bpy.data.cameras.new("CAM_TOPO"); cd.type = 'ORTHO'; cd.ortho_scale = 2*L
    cam = bpy.data.objects.new("CAM_TOPO", cd); bpy.context.scene.collection.objects.link(cam); cam.location = (0, 0, 150); bpy.context.scene.camera = cam
    for a in bpy.context.screen.areas:
        if a.type == 'VIEW_3D':
            for s in a.spaces:
                if s.type == 'VIEW_3D': s.shading.type = 'SOLID'
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    return len(ents), len(me.polygons)

def assa(amostras=96, lado=2048):
    sc = bpy.context.scene
    try: sc.render.engine = 'CYCLES'
    except TypeError as e: print(e)
    sc.cycles.samples = amostras
    try: sc.cycles.use_denoising = True
    except Exception: pass
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for t in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
            try:
                prefs.compute_device_type = t; prefs.get_devices()
                if any(d.use for d in prefs.devices if d.type != 'CPU'): sc.cycles.device = 'GPU'; break
            except Exception: pass
    except Exception: pass
    chao = bpy.data.objects["CHAO"]; img = bpy.data.images["chao_ao"]
    if img.size[0] != lado: img.scale(lado, lado)
    for o in bpy.context.selected_objects: o.select_set(False)
    chao.select_set(True); bpy.context.view_layer.objects.active = chao
    sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False
    sc.render.bake.margin = 4
    bpy.ops.object.bake(type='DIFFUSE')
    os.makedirs(SAIDA, exist_ok=True)
    img.filepath_raw = os.path.join(SAIDA, "chao_ao.png"); img.file_format = 'PNG'; img.save()
    bpy.ops.wm.save_mainfile()
    return img.filepath_raw, sc.cycles.device
