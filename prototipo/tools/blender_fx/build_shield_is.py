"""Escudo do Guardiao IS - estagio 0% (aco): silhueta de losango com espinhos, nucleo redondo com o logo IS.
Mesmo referencial do escudo antigo: origem no centro do escudo antigo, face para -Y, ponta para -Z, topo para +Z; as alcas antigas (y>0.4) sao reaproveitadas,
entao as animacoes ja feitas continuam valendo. O mesh antigo fica guardado em 'Shield_Guardian_old_mesh'."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
SH = bpy.data.objects['Shield_Guardian']
OLD = SH.data
if OLD.name != 'Shield_Guardian_old_mesh' and 'Shield_Guardian_old_mesh' not in bpy.data.meshes:
    OLD.name = 'Shield_Guardian_old_mesh'; OLD.use_fake_user = True
OLD = bpy.data.meshes['Shield_Guardian_old_mesh']

# ---------- materiais ----------
def mk(name, base, metal, rough, noise_rough=0.25, tint=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 10
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 5.0
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(tc.outputs['Object'], vo.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = base; ramp.color_ramp.elements[1].color = tint or (base[0] * 2.2, base[1] * 2.1, base[2] * 2.0, 1)
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], bs.inputs['Base Color'])
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough - noise_rough; rr.inputs['To Max'].default_value = rough + noise_rough
    nt.links.new(vo.outputs['Distance'], rr.inputs['Value']); nt.links.new(rr.outputs['Result'], bs.inputs['Roughness'])
    bs.inputs['Metallic'].default_value = metal
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .25; nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], bs.inputs['Normal'])
    nt.links.new(bs.outputs[0], out.inputs[0]); return m
M_STEEL = mk('Shield_IS_steel', (0.045, 0.047, 0.055, 1), 1.0, .42, .22, (0.20, 0.205, 0.22, 1))
M_TRIM = mk('Shield_IS_trim', (0.17, 0.155, 0.14, 1), 1.0, .30, .18, (0.48, 0.45, 0.42, 1))
M_LOGO = mk('Shield_IS_logo', (0.55, 0.57, 0.62, 1), 1.0, .22, .1, (0.85, 0.87, 0.92, 1))
MATS = [M_STEEL, M_TRIM, M_LOGO]
LEATHER, HSTEEL = OLD.materials[1], OLD.materials[2]

bm = bmesh.new()
def poly_prism(pts, y0, y1, mat, cz=0.0, sc=1.0):
    """prisma de silhueta (x,z) entre y0 (frente, mais negativo) e y1"""
    vs = [bm.verts.new((x * sc, y1, (z - cz) * sc + cz)) for x, z in pts]
    f = bm.faces.new(vs); f.material_index = mat
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); nv = [v for v in r['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, y0 - y1, 0), verts=nv)
    for g in r['geom']:
        if isinstance(g, bmesh.types.BMFace): g.material_index = mat
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))

half = [(0, 17.5), (1.3, 10), (3.4, 14.5), (4.2, 8.8), (7.0, 13.2), (7.4, 6.5), (11.8, 11.4), (10.4, 4.0), (12.4, -0.8), (8.6, 0.2), (9.8, -6.8), (6.4, -4.4), (6.9, -12.8), (4.0, -9.8), (3.4, -18.8), (1.8, -14), (0, -23.5)]
sil = [(x, z) for x, z in half[:-1]] + [(0, -23.5)] + [(-x, z) for x, z in reversed(half[1:-1])]
def inside(pt, poly):
    x, z = pt; c = False; n = len(poly)
    for i in range(n):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % n]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1 + 1e-9) + x1: c = not c
    return c
CZ = 3.0
poly_prism(sil, -0.7, 0.0, 0)                                  # placa de tras
poly_prism(sil, -1.5, -0.7, 0, cz=CZ, sc=0.90)                 # placa elevada
poly_prism(sil, -2.1, -1.5, 1, cz=CZ, sc=0.62)                 # miolo em relevo

import random
rnd = random.Random(11)
def blade(cx, cz, ang, r0, L, w, y0, y1, mat, bend=0.0):
    dx, dz = math.sin(ang), math.cos(ang); ox, oz = dz, -dx
    pts = []; N = 6
    for i in range(N + 1):
        t = i / N; r = r0 + L * t; k = bend * t * t * L
        pts.append((cx + dx * r + ox * k, cz + dz * r + oz * k, (1 - t) ** .8 * w))
    left = [(x + ox * wd, z + oz * wd) for x, z, wd in pts]; right = [(x - ox * wd, z - oz * wd) for x, z, wd in pts]
    poly_prism(left + right[::-1][1:], y0, y1, mat)
sil_in = [(x * .96, (z - CZ) * .96 + CZ) for x, z in sil]
for side in (1, -1):
    for i in range(14):
        th = math.radians(rnd.uniform(8, 168)); ang = th * side
        L0 = rnd.uniform(6, 17); r0 = 5.0
        dx, dz = math.sin(ang), math.cos(ang)
        L = L0
        while L > 3 and not inside((dx * (r0 + L), CZ + dz * (r0 + L)), sil_in): L -= .6
        if L > 3.5: blade(0, CZ, ang, r0, L, rnd.uniform(.55, 1.1), -2.0, -0.9 - rnd.uniform(0, .5), 1, bend=rnd.uniform(-.05, .05) * side)
# espinha central (diamante afunilado de ponta a ponta)
poly_prism([(0, 15.2), (1.3, 5), (1.6, -3), (0.9, -14), (0, -21), (-0.9, -14), (-1.6, -3), (-1.3, 5)], -2.4, -1.6, 1)

# nucleo: aneis e disco com o logo
def disc(r, y0, y1, mat, n=48, cz=3.0):
    poly_prism([(math.cos(i / n * math.tau) * r, cz + math.sin(i / n * math.tau) * r) for i in range(n)], y0, y1, mat)
disc(5.6, -3.0, -1.9, 1); disc(4.7, -3.4, -3.0, 0); disc(3.9, -3.7, -3.4, 2)
# face curva (convexa): as bordas recuam, o centro avanca
for v in bm.verts:
    v.co.y += 0.011 * v.co.x * v.co.x + 0.0028 * (v.co.z - 3.0) ** 2
body_end = len(bm.faces)

# alcas antigas (parte de tras), com os materiais originais
ob = bmesh.new(); ob.from_mesh(OLD)
keep = [f for f in ob.faces if all(v.co.y > 0.4 for v in f.verts)]
vmap = {}
for f in keep:
    nv = []
    for v in f.verts:
        if v.index not in vmap: vmap[v.index] = bm.verts.new(v.co)
        nv.append(vmap[v.index])
    try:
        nf = bm.faces.new(nv); nf.material_index = {1: 3, 2: 4}.get(f.material_index, 4)
    except ValueError: pass
ob.free()

me = bpy.data.meshes.new('Shield_IS_mesh'); bm.to_mesh(me); bm.free()
for m_ in MATS + [LEATHER, HSTEEL]: me.materials.append(m_)
for p in me.polygons: p.use_smooth = False

# logo IS (texto em relevo na frente do nucleo)
tc = bpy.data.curves.new('IS_txt', 'FONT'); tc.body = 'IS'; tc.size = 3.3; tc.extrude = .18; tc.align_x = 'CENTER'; tc.align_y = 'CENTER'
to = bpy.data.objects.new('IS_txt', tc); bpy.context.scene.collection.objects.link(to)
dg = bpy.context.evaluated_depsgraph_get(); tm = bpy.data.meshes.new_from_object(to.evaluated_get(dg))
bpy.data.objects.remove(to); bpy.data.curves.remove(tc)
tm.transform(Matrix.Rotation(math.radians(90), 4, 'X')); tm.transform(Matrix.Translation((0, -3.7, 3.0)))
tmp = bpy.data.objects.new('t', tm); bpy.context.scene.collection.objects.link(tmp)
body = bpy.data.objects.new('b', me); bpy.context.scene.collection.objects.link(body)
tm.materials.clear(); tm.materials.append(M_TRIM)
for p in tm.polygons: p.material_index = 0
# junta o texto no mesh do escudo com o indice do material de trim (1)
bm2 = bmesh.new(); bm2.from_mesh(me)
bm2.from_mesh(tm)
n0 = len(me.polygons)
for i, f in enumerate(bm2.faces):
    if i >= n0: f.material_index = 1
bm2.to_mesh(me); bm2.free()
bpy.data.objects.remove(tmp); bpy.data.objects.remove(body); bpy.data.meshes.remove(tm)
for p in me.polygons: p.use_smooth = False

# bisel leve para pegar brilho nas quinas (modificador aplicado)
tmpo = bpy.data.objects.new('bev', me); bpy.context.scene.collection.objects.link(tmpo)
md = tmpo.modifiers.new('bev', 'BEVEL'); md.width = .09; md.segments = 2; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(35)
dg = bpy.context.evaluated_depsgraph_get(); fin = bpy.data.meshes.new_from_object(tmpo.evaluated_get(dg)); fin.name = 'Shield_IS_final'
bpy.data.objects.remove(tmpo); bpy.data.meshes.remove(me)
for p in fin.polygons: p.use_smooth = False
fin.shade_flat() if hasattr(fin, 'shade_flat') else None
SH.data = fin
dims = SH.dimensions
print('escudo IS aplicado:', len(fin.vertices), 'verts', [round(x, 1) for x in dims], 'mats', [m.name for m in fin.materials])
