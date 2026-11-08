# Cidade (Talking Island) editada no Blender -> jogo. Rodar no Blender com cidade_luz.blend aberto (MCP ou blender -b):
#   exec(open(r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\tools\blender_luz\cidade_saidas.py").read())
#   portais_cria()   cria os 4 portais retangulares (PORTAL_toi/blazing/fortress/curuma) dentro dos arcos dos portoes; o dono move/estica (S Y = largura, S Z = altura)
#   exporta()        grava no jogo: village_data_threejs.json (casas que ficaram, onde ficaram), colisores (muro e portoes pela malha, casas pela caixa)
#                    e portais_cidade.json; depois rodar tools/blender_luz/aplica_colisores.py para por os colisores no cidade.html
# Coordenadas: jogo (x, y, z) = Blender (x, z - alturaChao, -y). rotY do jogo = rotacao Z do Blender.
import bpy, json, os, math, bmesh
from mathutils import Vector, Matrix

R = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
TI = os.path.join(R, "assets", "talking_island")
RAIO = 110.0
# portao -> saida do jogo (ordem dos portoes no layout original: I_ti_gate, .001, .002, .003)
PORTOES = {"I_ti_gate": "toi", "I_ti_gate.001": "blazing", "I_ti_gate.002": "curuma", "I_ti_gate.003": "fortress"}
CORES = {"toi": (1.0, .79, .2), "blazing": (1.0, .35, .12), "fortress": (.81, .85, .91), "curuma": (.25, 1.0, .63)}

def gh(x, z):
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

def _filho(raiz):
    o = bpy.data.objects.get(raiz)
    if not o: return None
    for c in o.children:
        if c.type == 'MESH': return c
    return None

def portais_cria():
    """4 portais (plano 1 x 1 em pe; escala Y = largura, Z = altura) no vao de cada portao: 8,8 m x 4,5 m."""
    col = bpy.data.collections.get("PORTAIS") or bpy.data.collections.new("PORTAIS")
    if col.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(col)
    me = bpy.data.meshes.get("PORTAL_PLANO")
    if not me:
        me = bpy.data.meshes.new("PORTAL_PLANO"); bm = bmesh.new()
        vs = [bm.verts.new(v) for v in ((0, -.5, 0), (0, .5, 0), (0, .5, 1), (0, -.5, 1))]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
    feitos = []
    for raiz, sid in PORTOES.items():
        nome = "PORTAL_" + sid
        if bpy.data.objects.get(nome): continue
        g = _filho(raiz)
        if not g: print("sem portao", raiz); continue
        M = g.matrix_world; base = M @ Vector((0, 0, -1.67)); rz = M.to_euler().z
        o = bpy.data.objects.new(nome, me); col.objects.link(o)
        o.location = base; o.rotation_euler = (0, 0, rz); o.scale = (1, 8.8, 4.5)
        m = bpy.data.materials.get("PORTAL_" + sid) or bpy.data.materials.new("PORTAL_" + sid); m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); c = CORES[sid]
        b.inputs["Base Color"].default_value = (c[0], c[1], c[2], 1)
        try: b.inputs["Emission Color"].default_value = (c[0], c[1], c[2], 1); b.inputs["Emission Strength"].default_value = 2.0
        except Exception: pass
        b.inputs["Alpha"].default_value = .55; m.diffuse_color = (c[0], c[1], c[2], .55)
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
        o.data.materials.clear(); o.data.materials.append(m); o.active_material = m
        o.color = (c[0], c[1], c[2], .6); o.show_in_front = True; o.hide_render = True    # nao entra no bake da luz
        feitos.append(nome)
    return feitos

def _circulos_caixa(o, folga=.92):
    """casa: caixa do objeto (no espaco dele) -> circulos ao longo do lado maior"""
    M = o.matrix_world; cs = [M @ Vector(c) for c in o.bound_box]
    z0 = min(c.z for c in cs); base = [c for c in cs if c.z < z0 + .01][:4]
    if len(base) < 4: base = sorted(cs, key=lambda c: c.z)[:4]
    p0 = base[0]; outros = sorted(base[1:], key=lambda c: (c - p0).length)
    a, b = outros[0] - p0, outros[1] - p0
    if a.length > b.length: a, b = b, a                       # a = lado menor, b = lado maior
    r = a.length / 2 * folga; n = max(1, math.ceil((b.length - a.length) / max(r, .5)) + 1)
    out = []
    for i in range(n):
        t = .5 if n == 1 else (a.length / 2 + (b.length - a.length) * i / (n - 1)) / b.length
        c = p0 + a / 2 + b * t
        out.append({"x": round(c.x, 2), "z": round(-c.y, 2), "r": round(r, 2)})
    return out

def _circulos_borda(o, passo=1.1, r=1.0, alt=2.5):
    """muro e portao: arestas de baixo da malha -> circulos encostados (sem frestas)"""
    M = o.matrix_world; vs = [M @ v.co for v in o.data.vertices]; z0 = min(v.z for v in vs); pts = []
    for e in o.data.edges:
        a, b = vs[e.vertices[0]], vs[e.vertices[1]]
        if a.z > z0 + alt or b.z > z0 + alt: continue
        L = (Vector((b.x, b.y)) - Vector((a.x, a.y))).length; n = max(1, int(L / passo))
        for i in range(n + 1):
            t = i / n; pts.append((a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
    pts.sort(); fic = []
    grade = {}
    for x, y in pts:
        k = (int(x // .8), int(y // .8))
        if any(math.hypot(x - q[0], y - q[1]) < .8 for dx in (-1, 0, 1) for dy in (-1, 0, 1) for q in grade.get((k[0] + dx, k[1] + dy), [])): continue
        grade.setdefault(k, []).append((x, y)); fic.append({"x": round(x, 2), "z": round(-y, 2), "r": r})
    return fic

def exporta():
    dados = os.path.join(TI, "village_data_threejs.json"); antigos = json.load(open(dados, encoding="utf-8"))
    nomes = {}
    for e in antigos: nomes.setdefault(e["glb"], e.get("name"))
    fora = [e for e in antigos if e["glb"] == "ti_centertop.glb" or e.get("name") == "SI_Centertop" or math.hypot(e["pos"][0], e["pos"][2]) > RAIO]
    ents, col = [], []
    raizes = sorted([o for o in bpy.data.objects if o.name.startswith("I_") and o.type == 'EMPTY'], key=lambda o: o.name)
    for raiz in raizes:
        g = next((c for c in raiz.children if c.type == 'MESH'), None)
        if not g: continue                                           # casa apagada no Blender
        glb = raiz.name[2:].split(".")[0] + ".glb"; M = g.matrix_world; t = M.to_translation(); s = M.to_scale().x
        x, z = t.x, -t.y; e = {"name": nomes.get(glb) or "SI_" + glb[3:-4], "glb": glb, "pos": [round(x, 3), round(t.z - gh(x, z), 3), round(z, 3)], "rotY": round(M.to_euler().z, 4), "scale": round(s, 3)}
        ents.append(e)
        if "_wall_" in glb or "_gate" in glb: col += _circulos_borda(g)
        elif "tree" not in glb and "dock" not in glb: col += _circulos_caixa(g)
    ents = ents + fora
    with open(dados, "w", encoding="utf-8") as f: json.dump(ents, f, indent=1)
    portais = []
    for sid in PORTOES.values():
        o = bpy.data.objects.get("PORTAL_" + sid)
        if not o: continue
        x, z = o.location.x, -o.location.y
        portais.append({"id": sid, "x": round(x, 3), "y": round(o.location.z - gh(x, z), 3), "z": round(z, 3), "rotY": round(o.rotation_euler.z, 4), "w": round(o.scale.y, 3), "h": round(o.scale.z, 3)})
    with open(os.path.join(TI, "portais_cidade.json"), "w", encoding="utf-8") as f: json.dump(portais, f, indent=1)
    with open(os.path.join(TI, "colisores_blender.json"), "w", encoding="utf-8") as f: json.dump(col, f)
    return len(ents), len(col), len(portais)
