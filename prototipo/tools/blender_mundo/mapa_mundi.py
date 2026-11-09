# Mapa-mundi do IS BLADE (09/11/2026, pedido do dono: mundo aberto estilo Priston Tale, mapas ligados a cidade, sem tela de carregamento).
# Monta a partir de uma COPIA da cidade (tools/blender_luz/cidade_luz.blend, nao e alterado):
#   - cada mapa aberto (Cruma, Fortaleza, Pantano) e a Torre do Baium dentro de um suporte MUNDO_<id> (empty): mover/girar o suporte move o mapa inteiro;
#     a entrada do mapa fica virada para o portao certo da cidade, do lado de fora do anel.
#   - CAMPO_TI: anel de terreno em volta da muralha (90 a 300 m do centro, alturas iguais as do jogo hoje) = a "emenda": esculpir a vontade.
#   - ESTRADA_<id>: guia do portao ate a entrada de cada mapa.
#   - SPOT_<faixa>_<n>: onde ficam os mobs de nivel baixo no campo (Nv 1-5 perto da muralha, 5-10, 10-15, 15-20 mais longe). Mover/criar/apagar a vontade.
# Uso (Blender 5.1):
#   montar (sem janela): blender -b tools/blender_luz/cidade_luz.blend --python tools/blender_mundo/mapa_mundi.py -- monta
#   exportar (depois de ajustar):  blender -b tools/blender_mundo/mapa_mundi.blend --python tools/blender_mundo/mapa_mundi.py -- exporta
#   ou, com o arquivo aberto: exec(open(r"...\mapa_mundi.py").read()); exporta()
# Coordenadas: jogo (x, y, z) = Blender (x, -z, y); rotacao Y do jogo = rotacao Z do Blender.
import bpy, bmesh, math, json, os, sys
from mathutils import Vector, Matrix

R = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
SAIDA = os.path.join(R, "tools", "blender_mundo", "mapa_mundi.blend")
MAPAS = {  # id: glb, terra (do walkgrid), entrada (spawn do jogo: x, z, altura), portao da cidade, meia-largura da terra
  "curuma":   {"glb": "assets/maps/curuma/curuma.glb", "centro": (-15.1, -10.0), "spawn": (-50.0, 12.0, -194.8), "portao": "curuma", "raio": 300},
  "fortress": {"glb": "assets/maps/fortress/fortress.glb", "centro": (-2.2, 2.6), "spawn": (0.0, 27.0, 3.5), "portao": "fortress", "raio": 105},
  "pantano":  {"glb": "assets/maps/blazing_swamp/blazing_swamp.glb", "centro": (-2.2, 13.1), "spawn": (14.9, -43.9, 3.7), "portao": "blazing", "raio": 170},
  "torre":    {"glb": "assets/maps/baium_house/mini_toi.glb", "centro": (0.0, -60.0), "spawn": (0.0, 40.0, -62.0), "portao": "toi", "raio": 190},
}
CAMPO_R0, CAMPO_R1, FOLGA = 90.0, 300.0, 30.0

def gh(x, z):  # mesma altura do chao do jogo (cidade.html getGroundHeight)
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

def b2(x, z, y=0.0): return Vector((x, -z, y))                  # jogo -> Blender
def col(nome):
    c = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    if c.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(c)
    return c
def mat(nome, cor):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs["Base Color"].default_value = (*cor, 1); m.diffuse_color = (*cor, 1); return m

def portao(pid):
    P = json.load(open(os.path.join(R, "assets", "talking_island", "portais_cidade.json"), encoding="utf-8"))
    p = next(q for q in P if q["id"] == pid); L = math.hypot(p["x"], p["z"]); return (p["x"] / L, p["z"] / L), (p["x"], p["z"])

def campo():
    me = bpy.data.meshes.new("CAMPO_TI"); bm = bmesh.new(); anel = []
    nr, ns = int((CAMPO_R1 - CAMPO_R0) / 4) + 1, 180
    for i in range(nr):
        r = CAMPO_R0 + (CAMPO_R1 - CAMPO_R0) * i / (nr - 1); linha = []
        for k in range(ns):
            a = 2 * math.pi * k / ns; x, z = math.cos(a) * r, math.sin(a) * r; linha.append(bm.verts.new(b2(x, z, gh(x, z))))
        anel.append(linha)
    for i in range(nr - 1):
        for k in range(ns): bm.faces.new((anel[i][k], anel[i][(k + 1) % ns], anel[i + 1][(k + 1) % ns], anel[i + 1][k]))
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new("CAMPO_TI", me); col("MUNDO_CAMPO").objects.link(o)
    me.materials.append(mat("CAMPO_GRAMA", (.28, .42, .2))); return o

def monta():
    cm = col("MUNDO_MAPAS"); info = {}
    for mid, M in MAPAS.items():
        d, pg = portao(M["portao"]); D = CAMPO_R1 - 40 + M["raio"] + FOLGA if mid != "torre" else CAMPO_R1 + M["raio"] - 60
        cx, cz = d[0] * D, d[1] * D
        vx, vz = M["spawn"][0] - M["centro"][0], M["spawn"][1] - M["centro"][1]
        th = math.atan2(-d[0], -d[1]) - math.atan2(vx, vz)          # gira para a entrada olhar para a cidade (rotacao Y do jogo)
        c, s = math.cos(th), math.sin(th)
        rx = M["centro"][0] * c + M["centro"][1] * s; rz = -M["centro"][0] * s + M["centro"][1] * c
        tx, tz, ty = cx - rx, cz - rz, -M["spawn"][2] + 2.0
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(R, M["glb"]))
        novos = [o for o in bpy.data.objects if o not in antes]
        sup = bpy.data.objects.new("MUNDO_" + mid, None); sup.empty_display_type = 'CUBE'; sup.empty_display_size = 12; cm.objects.link(sup)
        for o in novos:
            for cc in list(o.users_collection): cc.objects.unlink(o)
            cm.objects.link(o)
            if o.parent is None: o.parent = sup
        sup.location = b2(tx, tz, ty); sup.rotation_euler = (0, 0, th)
        sx = M["spawn"][0] * c + M["spawn"][1] * s + tx; sz = -M["spawn"][0] * s + M["spawn"][1] * c + tz
        ent = bpy.data.objects.new("ENTRADA_" + mid, None); ent.empty_display_type = 'SINGLE_ARROW'; ent.empty_display_size = 10; ent.location = b2(sx, sz, 2.0); col("MUNDO_GUIAS").objects.link(ent)
        # estrada guia: do portao ate a entrada
        cu = bpy.data.curves.new("ESTRADA_" + mid, 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(1)
        p0 = b2(pg[0], pg[1], .5); sp.points[0].co = (*p0, 1); sp.points[1].co = (*b2(sx, sz, 2.5), 1); cu.bevel_depth = 2.0
        oe = bpy.data.objects.new("ESTRADA_" + mid, cu); oe.data.materials.append(mat("ESTRADA", (.55, .45, .3))); col("MUNDO_GUIAS").objects.link(oe)
        info[mid] = {"centro": [round(cx, 1), round(cz, 1)], "entrada": [round(sx, 1), round(sz, 1)], "rotY": round(th, 4), "dist": round(D)}
        print("mapa", mid, info[mid], "objetos", len(novos))
    campo()
    # spots dos mobs de nivel baixo no campo, entre as estradas (angulos dos portoes), em faixas pela distancia da muralha
    cs = col("MUNDO_SPOTS"); angs = sorted(math.atan2(portao(M["portao"])[0][1], portao(M["portao"])[0][0]) for M in MAPAS.values()); n = 0
    for faixa, r in (("1-5", 120), ("5-10", 160), ("10-15", 205), ("15-20", 250)):
        for i, a in enumerate(angs):
            b = angs[(i + 1) % len(angs)] + (2 * math.pi if i == len(angs) - 1 else 0)
            for f in (.33, .66):
                m = a + (b - a) * f; x, z = math.cos(m) * r, math.sin(m) * r; n += 1
                e = bpy.data.objects.new("SPOT_%s_%02d" % (faixa, n), None); e.empty_display_type = 'CUBE'; e.empty_display_size = 4; e.location = b2(x, z, gh(x, z) + 2); cs.objects.link(e)
    json.dump(info, open(os.path.join(R, "tools", "blender_mundo", "mapa_mundi_layout.json"), "w"), indent=1)
    bpy.ops.wm.save_as_mainfile(filepath=SAIDA, copy=False)
    print("salvo", SAIDA)

def exporta():
    """grava prototipo/data/mundo.json: onde cada mapa fica no mundo (posicao/rotacao do suporte), entradas e spots do campo"""
    out = {"_nota": "Mapa-mundi (tools/blender_mundo/mapa_mundi.blend -> exporta()). mapas[id].pos = deslocamento do mapa no mundo (jogo x, y, z), rotY = giro. spots = mobs de nivel baixo no Campo de Talking Island.", "mapas": {}, "spots": []}
    for mid in MAPAS:
        o = bpy.data.objects.get("MUNDO_" + mid)
        if not o: continue
        l = o.location; out["mapas"][mid] = {"pos": [round(l.x, 2), round(l.z, 2), round(-l.y, 2)], "rotY": round(o.rotation_euler.z, 4)}
    for o in bpy.data.objects:
        if o.name.startswith("SPOT_"):
            p = o.name.split("_"); out["spots"].append({"faixa": p[1], "x": round(o.location.x, 1), "z": round(-o.location.y, 1), "y": round(o.location.z, 1)})
    json.dump(out, open(os.path.join(R, "data", "mundo.json"), "w", encoding="utf-8"), indent=1)
    print("exportado", len(out["mapas"]), "mapas,", len(out["spots"]), "spots")

if "--" in sys.argv:
    cmd = sys.argv[sys.argv.index("--") + 1:]
    if cmd and cmd[0] == "monta": monta()
    elif cmd and cmd[0] == "exporta": exporta()
