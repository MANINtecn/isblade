# Pecas de emenda do mapa-mundi (Solda de emendas das 4 regioes: Cruma, Fortaleza, Pantano e Torre)
# Rodar: blender -b tools/blender_mundo/mapa_mundi.blend --python tools/blender_mundo/pecas_emenda.py
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

random.seed(42)

def mat(nome, cor, roughness=0.9):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs["Base Color"].default_value = (*cor, 1)
    b.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*cor, 1)
    return m

def col(nome):
    c = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c

c_emendas = col("MUNDO_EMENDAS")

# Limpar pecas antigas
for n in ["BASE_TORRE", "PASSARELA_PANTANO", "TERRA_PANTANO", "EMENDA_FORTRESS", "EMENDA_CRUMA", "EMENDA_PANTANO", "RAMPA_TORRE", "PORTAL_TORRE"]:
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)

print("Pecas antigas removidas.")

# ---------------------------------------------------------
# 1. EMENDA_FORTRESS: Rampa suave do campo ate o portao da Fortaleza
# Portal: (-54.2, -46.8, 0.3) -> Entrada: (-178.9, -125.1, 6.89)
# ---------------------------------------------------------
p_port_f = Vector((-54.2, -46.8, 0.3))
p_ent_f = Vector((-178.88, -125.14, 6.89))
dir_f = (p_ent_f - p_port_f).normalized()
lado_f = Vector((-dir_f.y, dir_f.x, 0))

p_inicio_f = p_port_f + dir_f * 70.0    # em torno de (-113, -84)
p_fim_f = p_ent_f + dir_f * 14.0        # entra no patio da fortaleza
seg_f = 26
larg_f = 28.0

bm = bmesh.new()
grid_f = []
for i in range(seg_f + 1):
    t = i / seg_f
    s = t * t * (3 - 2 * t)
    c_pt = p_inicio_f.lerp(p_fim_f, t)
    z_centro = 0.5 + (6.89 - 0.5) * s
    row = []
    for j in range(9):
        u = (j / 8.0 - 0.5) * 2.0  # -1 a +1
        larg_atual = larg_f * (1.0 + 0.25 * (1.0 - t))
        pt = c_pt + lado_f * (u * larg_atual * 0.5)
        drop = abs(u) ** 2.2 * 1.0
        row.append(bm.verts.new((pt.x, pt.y, z_centro - drop)))
    grid_f.append(row)

for i in range(seg_f):
    for j in range(8):
        bm.faces.new((grid_f[i][j], grid_f[i][j+1], grid_f[i+1][j+1], grid_f[i+1][j]))

me_f = bpy.data.meshes.new("EMENDA_FORTRESS")
bm.to_mesh(me_f); bm.free()
for p in me_f.polygons: p.use_smooth = True
ob_f = bpy.data.objects.new("EMENDA_FORTRESS", me_f)
ob_f.data.materials.append(mat("PEDRA_FORTALEZA", (0.38, 0.35, 0.30)))
c_emendas.objects.link(ob_f)
print(f"EMENDA_FORTRESS criada: {len(me_f.vertices)} vertices, {len(me_f.polygons)} faces")

# ---------------------------------------------------------
# 2. EMENDA_CRUMA: Estrada de pedra do anel da cidade ate a soleira de Cruma
# Portal: (-51.0, 47.1, -0.2) -> Entrada: (-267.9, 354.6, -2.03)
# ---------------------------------------------------------
p_port_c = Vector((-51.0, 47.1, -0.2))
p_ent_c = Vector((-267.9, 354.6, -2.03))
dir_c = (p_ent_c - p_port_c).normalized()
lado_c = Vector((-dir_c.y, dir_c.x, 0))

p_ini_c = p_port_c + dir_c * 200.0  # dist ~240m da cidade
p_fim_c = p_ent_c + dir_c * 15.0    # soleira
seg_c = 30
larg_c = 28.0

bm = bmesh.new()
grid_c = []
for i in range(seg_c + 1):
    t = i / seg_c
    s = t * t * (3 - 2 * t)
    c_pt = p_ini_c.lerp(p_fim_c, t)
    z_centro = -1.5 + (-2.03 - (-1.5)) * s
    row = []
    for j in range(9):
        u = (j / 8.0 - 0.5) * 2.0
        pt = c_pt + lado_c * (u * larg_c * 0.5)
        drop = abs(u) ** 2.2 * 0.6
        row.append(bm.verts.new((pt.x, pt.y, z_centro - drop)))
    grid_c.append(row)

for i in range(seg_c):
    for j in range(8):
        bm.faces.new((grid_c[i][j], grid_c[i][j+1], grid_c[i+1][j+1], grid_c[i+1][j]))

me_c = bpy.data.meshes.new("EMENDA_CRUMA")
bm.to_mesh(me_c); bm.free()
for p in me_c.polygons: p.use_smooth = True
ob_c = bpy.data.objects.new("EMENDA_CRUMA", me_c)
ob_c.data.materials.append(mat("PEDRA_CRUMA", (0.30, 0.32, 0.28)))
c_emendas.objects.link(ob_c)
print(f"EMENDA_CRUMA criada: {len(me_c.vertices)} vertices, {len(me_c.polygons)} faces")

# ---------------------------------------------------------
# 3. EMENDA_PANTANO: Estrada de rocha vulcanica do anel ate a entrada
# Portal: (48.8, -54.3, -0.1) -> Entrada: (313.2, -197.4, 2.50)
# ---------------------------------------------------------
p_port_p = Vector((48.8, -54.3, -0.1))
p_ent_p = Vector((313.2, -197.4, 2.50))
dir_p = (p_ent_p - p_port_p).normalized()
lado_p = Vector((-dir_p.y, dir_p.x, 0))

p_ini_p = p_port_p + dir_p * 180.0
p_fim_p = p_ent_p + dir_p * 15.0
seg_p = 25
larg_p = 26.0

bm = bmesh.new()
grid_p = []
for i in range(seg_p + 1):
    t = i / seg_p
    s = t * t * (3 - 2 * t)
    c_pt = p_ini_p.lerp(p_fim_p, t)
    z_centro = 0.5 + (2.50 - 0.5) * s
    row = []
    for j in range(9):
        u = (j / 8.0 - 0.5) * 2.0
        pt = c_pt + lado_p * (u * larg_p * 0.5)
        drop = abs(u) ** 2.2 * 0.7
        row.append(bm.verts.new((pt.x, pt.y, z_centro - drop)))
    grid_p.append(row)

for i in range(seg_p):
    for j in range(8):
        bm.faces.new((grid_p[i][j], grid_p[i][j+1], grid_p[i+1][j+1], grid_p[i+1][j]))

me_p = bpy.data.meshes.new("EMENDA_PANTANO")
bm.to_mesh(me_p); bm.free()
for p in me_p.polygons: p.use_smooth = True
ob_p = bpy.data.objects.new("EMENDA_PANTANO", me_p)
ob_p.data.materials.append(mat("ROCHA_PANTANO", (0.22, 0.18, 0.16)))
c_emendas.objects.link(ob_p)
print(f"EMENDA_PANTANO criada: {len(me_p.vertices)} vertices, {len(me_p.polygons)} faces")

# ---------------------------------------------------------
# 4. TERRA_PANTANO: Solo vulcanico no vale de lava do Pantano
# ---------------------------------------------------------
P = bpy.data.objects["MUNDO_pantano"]
CX, CZ = -37.0, 35.0; RX, RZ = 64.0, 74.0
HA, HB, LAVA = 0.6, -2.6, -32.0

def ruido_p(x, z): return math.sin(x * .09 + 1.7) * math.cos(z * .08) * 1.5 + math.sin(x * .21) * math.cos(z * .19 + .6) * .5
def borda_p(a): return 1 + .15 * math.sin(3 * a + .4) + .08 * math.sin(7 * a + 1.9)

bm = bmesh.new(); NA, NR = 72, 24; aneis_p = []
for i in range(NR + 1):
    f = i / NR; lin = []
    for k in range(NA):
        a = 2 * math.pi * k / NA; e = borda_p(a) * f
        x, z = CX + math.cos(a) * RX * e, CZ + math.sin(a) * RZ * e
        t = max(0.0, min(1.0, (z - (CZ - RZ)) / (2 * RZ))); t = t * t * (3 - 2 * t)
        h = HA + (HB - HA) * t + ruido_p(x, z)
        w_pt = P.matrix_world @ Vector((x, -z, h))
        lin.append(bm.verts.new(w_pt))
    aneis_p.append(lin)

centro_w = P.matrix_world @ Vector((CX, -CZ, HA + (HB - HA)*0.5))
centro_v = bm.verts.new(centro_w)
for k in range(NA): bm.faces.new((centro_v, aneis_p[1][k], aneis_p[1][(k + 1) % NA]))
for i in range(1, NR):
    for k in range(NA): bm.faces.new((aneis_p[i][k], aneis_p[i + 1][k], aneis_p[i + 1][(k + 1) % NA], aneis_p[i][(k + 1) % NA]))

saia_p = []
for k in range(NA):
    v_co = aneis_p[NR][k].co
    saia_p.append(bm.verts.new((v_co.x, v_co.y, v_co.z - 15.0)))
for k in range(NA):
    bm.faces.new((aneis_p[NR][k], saia_p[k], saia_p[(k + 1) % NA], aneis_p[NR][(k + 1) % NA]))

me_tp = bpy.data.meshes.new("TERRA_PANTANO")
bm.to_mesh(me_tp); bm.free()
for p in me_tp.polygons: p.use_smooth = True
ob_tp = bpy.data.objects.new("TERRA_PANTANO", me_tp)
ob_tp.data.materials.append(mat("ROCHA_VULCANICA", (0.20, 0.16, 0.14)))
c_emendas.objects.link(ob_tp)
print(f"TERRA_PANTANO criada no espaco de mundo: {len(me_tp.vertices)} vertices, {len(me_tp.polygons)} faces")

# ---------------------------------------------------------
# 5. BASE_TORRE: Rodovia de montanha e rampa de acesso a Torre do Baium
# P0: (205, 185, 1.5) -> P1: (260, 235, 26.0) -> P2: (325, 290, 4.3)
# Subida: 17.4 graus, Descida: 13.9 graus. Ambas suaves (< 20 graus).
# ---------------------------------------------------------
p0_t = Vector((205.0, 185.0, 1.5))
p1_t = Vector((260.0, 235.0, 26.0))
p2_t = Vector((325.0, 290.0, 4.3))

dir1_t = (p1_t - p0_t).normalized()
lado1_t = Vector((-dir1_t.y, dir1_t.x, 0)).normalized()

dir2_t = (p2_t - p1_t).normalized()
lado2_t = Vector((-dir2_t.y, dir2_t.x, 0)).normalized()

bm = bmesh.new()
larg_t = 34.0
grid_t = []

# Segmento 1: Subida do campo ate a crista
seg1 = 26
for i in range(seg1):
    t = i / seg1
    s = t * t * (3 - 2 * t)
    c_pt = p0_t.lerp(p1_t, t)
    z_centro = p0_t.z + (p1_t.z - p0_t.z) * s
    row = []
    for j in range(9):
        u = (j / 8.0 - 0.5) * 2.0
        pt = c_pt + lado1_t * (u * larg_t * 0.5)
        drop = abs(u) ** 2.2 * 1.2
        row.append(bm.verts.new((pt.x, pt.y, z_centro - drop)))
    grid_t.append(row)

# Crista de transicao (P1)
row_c = []
for j in range(9):
    u = (j / 8.0 - 0.5) * 2.0
    lado_medio = (lado1_t + lado2_t).normalized()
    pt = p1_t + lado_medio * (u * larg_t * 0.5)
    drop = abs(u) ** 2.2 * 1.2
    row_c.append(bm.verts.new((pt.x, pt.y, p1_t.z - drop)))
grid_t.append(row_c)

# Segmento 2: Descida suave da crista ate o patio do Baium
seg2 = 28
for i in range(1, seg2 + 1):
    t = i / seg2
    s = t * t * (3 - 2 * t)
    c_pt = p1_t.lerp(p2_t, t)
    z_centro = p1_t.z + (p2_t.z - p1_t.z) * s
    row = []
    for j in range(9):
        u = (j / 8.0 - 0.5) * 2.0
        pt = c_pt + lado2_t * (u * larg_t * 0.5)
        drop = abs(u) ** 2.2 * 1.2
        row.append(bm.verts.new((pt.x, pt.y, z_centro - drop)))
    grid_t.append(row)

for i in range(len(grid_t) - 1):
    for j in range(8):
        bm.faces.new((grid_t[i][j], grid_t[i][j+1], grid_t[i+1][j+1], grid_t[i+1][j]))

me_bt = bpy.data.meshes.new("BASE_TORRE")
bm.to_mesh(me_bt); bm.free()
for p in me_bt.polygons: p.use_smooth = True
ob_bt = bpy.data.objects.new("BASE_TORRE", me_bt)
ob_bt.data.materials.append(mat("PEDRA_PLANALTO", (0.42, 0.40, 0.35)))
c_emendas.objects.link(ob_bt)
print(f"BASE_TORRE (Rodovia de Montanha e Rampa de Acesso) criada: {len(me_bt.vertices)} vertices, {len(me_bt.polygons)} faces")

# Portal empty no patio do topo
pt = bpy.data.objects.new("PORTAL_TORRE", None)
pt.empty_display_type = 'CUBE'; pt.empty_display_size = 4
pt.location = p2_t + Vector((0, 0, 3.0))
c_emendas.objects.link(pt)

bpy.ops.wm.save_mainfile()
print("pecas_emenda.py: todas as 5 pecas de solda foram criadas e salvas no mapa_mundi.blend!")
