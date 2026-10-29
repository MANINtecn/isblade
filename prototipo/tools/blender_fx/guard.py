import bpy, math, random
from mathutils import Vector, Matrix

arm = bpy.data.objects['HumanFighter_Armature']
PB = arm.pose.bones
if arm.animation_data:
    arm.animation_data.action = None
if 'Sword_1H' in bpy.data.objects:
    bpy.data.objects['Sword_1H'].hide_viewport = True
    bpy.data.objects['Sword_1H'].hide_render = True

def upd():
    bpy.context.view_layer.update()

def reset():
    for pb in PB:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
    upd()

def head(n):
    return PB[n].head.copy()

def rot_about(n, R3):
    pb = PB[n]
    m = pb.matrix.copy()
    p = m.translation.copy()
    pb.matrix = Matrix.Translation(p) @ R3.to_4x4() @ Matrix.Translation(-p) @ m
    upd()

def aim(n, child, d):
    v = PB[child].head - PB[n].head
    q = v.normalized().rotation_difference(Vector(d).normalized())
    rot_about(n, q.to_matrix())

def ik2(a, b, c, T, pole):
    S = head(a); E0 = head(b); W0 = head(c)
    l1 = (E0 - S).length; l2 = (W0 - E0).length
    v = T - S
    d = min(max(v.length, abs(l1 - l2) + .01), l1 + l2 - .01)
    dirn = v.normalized()
    x = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(l1 * l1 - x * x, 0))
    p = pole - dirn * pole.dot(dirn)
    p.normalize()
    E = S + dirn * x + p * h
    W = S + dirn * d
    aim(a, b, E - S)
    aim(b, c, W - head(b))

reset()
REST = {pb.name: pb.matrix.copy() for pb in PB}
REST_HEAD = {pb.name: pb.head.copy() for pb in PB}
SHIELD_OFF = Vector((0, -3.5, 0.5))

def basis(n, u):
    y = -Vector(n).normalized()
    z = Vector(u)
    z = (z - y * z.dot(y)).normalized()
    x = y.cross(z)
    return Matrix((x, y, z)).transposed()

# ---------------- shield mesh + texture ----------------
def build_shield():
    if 'Shield_Guardian' in bpy.data.objects:
        return
    import bmesh
    import numpy as np
    HW, HH = 6.0, 8.0
    def wfun(t):
        if t < 0.4: return HW
        s = (t - 0.4) / 0.6
        return HW * max(math.cos(s * math.pi / 2), 0) ** 0.8
    U, V = 24, 36
    bm = bmesh.new()
    grid = []
    for j in range(V + 1):
        t = j / V
        w = wfun(t); z = HH - 2 * HH * t
        row = []
        for i in range(U + 1):
            u = -1 + 2 * i / U
            x = u * w
            y = -1.4 * (1 - (x / HW) ** 2) * (1 - 0.25 * t) - 0.4 * (1 - abs(2 * t - 1) ** 2) * 0.3
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for j in range(V):
        for i in range(U):
            try:
                bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops:
            co = l.vert.co
            l[uvl].uv = ((co.x + HW) / (2 * HW), (co.z + HH) / (2 * HH))
    me = bpy.data.meshes.new('Shield_Guardian')
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('Shield_Guardian', me)
    bpy.context.scene.collection.objects.link(ob)
    # flip normals so that front faces -Y
    if sum(p.normal.y for p in me.polygons) > 0:
        for p in me.polygons: p.flip()
        me.update()
    sol = ob.modifiers.new('Solid', 'SOLIDIFY'); sol.thickness = 0.9; sol.offset = 1.0
    bev = ob.modifiers.new('Bev', 'BEVEL'); bev.width = 0.12; bev.segments = 2
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    for p in me.polygons: p.use_smooth = True

    # texture painted procedurally
    W = H = 1024
    ii, jj = np.meshgrid(np.arange(W), np.arange(H))
    uu = (ii + .5) / W; vv = (jj + .5) / H
    x = uu * 2 * HW - HW; z = vv * 2 * HH - HH
    t = (HH - z) / (2 * HH)
    w = np.where(t < .4, HW, HW * np.clip(np.cos(np.clip((t - .4) / .6, 0, 1) * np.pi / 2), 0, 1) ** 0.8)
    inside = np.abs(x) <= w
    edge = w - np.abs(x)
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, (H, W)).astype(np.float32)
    # brushed streaks
    streak = np.cumsum(noise, axis=1); streak = (streak - streak.mean()) / (streak.std() + 1e-6)
    img = np.zeros((H, W, 4), np.float32); img[..., 3] = 1
    navy = np.array([0.04, 0.10, 0.28]); steel = np.array([0.55, 0.62, 0.75]); gold = np.array([0.95, 0.68, 0.14]); dgold = np.array([0.45, 0.28, 0.04])
    col = np.zeros((H, W, 3), np.float32)
    grad = (0.6 + 0.4 * (t))[..., None]
    col[:] = navy * grad + 0.02 * streak[..., None]
    # gold border
    border = inside & (edge < 0.9)
    topb = inside & (z > HH - 0.9)
    inner = inside & ((edge >= 0.9) & (edge < 1.15))
    col[border | topb] = gold * (0.85 + 0.08 * streak[border | topb][:, None])
    col[inner] = dgold
    # cross
    cross = inside & (((np.abs(x) < 0.55) & (z > -6.0)) | ((np.abs(z - 2.0) < 0.55) & (np.abs(x) < 4.6)))
    col[cross] = gold * 0.95
    crossdark = inside & (((np.abs(x) < 0.7) & (np.abs(x) >= .55) & (z > -6.1)) | ((np.abs(z - 2.0) < .7) & (np.abs(z - 2.0) >= .55) & (np.abs(x) < 4.75)))
    col[crossdark & ~cross] = dgold
    # wings/diagonal accents
    # central boss with gem
    r = np.sqrt(x ** 2 + (z - 2.0) ** 2)
    boss = inside & (r < 1.9); col[boss] = steel * (0.7 + 0.3 * np.cos(r[boss] * 3))[:, None]
    ring = inside & (r > 1.6) & (r < 1.9); col[ring] = gold
    gem = inside & (r < 1.0); col[gem] = np.array([0.1, 0.8, 1.0]) * (1.3 - r[gem] * 0.6)[:, None]
    # rivets
    for py in (6.4, 3.0, -1.0, -4.2):
        for sx in (-1, 1):
            px = sx * (HW - 0.45)
            if py < 3: px = sx * max(0, (wfun((HH - py) / (2 * HH)) - 0.45))
            rv = np.sqrt((x - px) ** 2 + (z - py) ** 2)
            col[inside & (rv < 0.28)] = steel
    # wear: scratches and edge dirt
    col += (np.maximum(streak, 0) * 0.015)[..., None]
    col = np.clip(col, 0, 1)
    img[..., :3] = col
    img[~inside, :3] = navy * 0.5
    im = bpy.data.images.new('Shield_Guardian_albedo', W, H, alpha=False)
    im.pixels = img.ravel().tolist()
    im.filepath_raw = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\guardian_shield_albedo.png"
    im.file_format = 'PNG'
    try:
        im.save()
    except Exception as e:
        print('save fail', e)
    im.pack()
    mat = bpy.data.materials.new('Shield_Guardian_mat'); mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = im
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Metallic'].default_value = 0.85
    bsdf.inputs['Roughness'].default_value = 0.35
    me.materials.append(mat)
    # parent to left hand
    ob.parent = arm; ob.parent_type = 'BONE'; ob.parent_bone = 'Bip01_L_Hand'
    ob.matrix_parent_inverse = Matrix(); ob.matrix_basis = Matrix(); upd()
    Pm = ob.matrix_world.copy()
    ob.matrix_parent_inverse = Pm.inverted()
    ob.matrix_basis = Matrix.Translation(REST_HEAD['Bip01_L_Hand'] + SHIELD_OFF)
    upd()

build_shield()

# ---------------- pose ----------------
def fv(v, yaw):
    a, f, u = v
    return Matrix.Rotation(yaw, 3, 'Z') @ Vector((-a, -f, u))

def pose(P):
    reset()
    PB['Bip01_Pelvis'].matrix = Matrix.Translation(Vector(P['pel'])) @ PB['Bip01_Pelvis'].matrix
    upd()
    yaw = math.radians(P['yaw']); lean = math.radians(P['lean'])
    cum = 0
    for n, fy, fl in [('Bip01_Pelvis', .35, .15), ('bip01_spine', .2, .25),
                      ('Bip01_Spine1', .2, .3), ('bip01_spine2', .25, .3)]:
        cum += yaw * fy
        rot_about(n, Matrix.Rotation(yaw * fy, 3, 'Z'))
        ax = Matrix.Rotation(cum, 3, 'Z') @ Vector((1, 0, 0))
        rot_about(n, Matrix.Rotation(lean * fl, 3, ax))
    rot_about('Bip01_head', Matrix.Rotation(-yaw * .55, 3, 'Z'))
    for side, th, ca, ft, key in [(1, 'Bip01_L_Thigh', 'Bip01_L_Calf', 'bip01_l_foot', 'lf'),
                                  (-1, 'Bip01_R_Thigh', 'Bip01_R_Calf', 'bip01_r_foot', 'rf')]:
        T = REST_HEAD[ft] + Vector(P[key])
        ik2(th, ca, ft, T, Vector((side * .25, -1, 0)))
        fpb = PB[ft]
        m = fpb.matrix.copy()
        R = Matrix.Rotation(math.radians(P.get('fyaw', 0)) * (-side), 3, 'Z') @ REST[ft].to_3x3()
        n4 = R.to_4x4(); n4.translation = m.translation
        fpb.matrix = n4; upd()
    S = head('Bip01_R_UpperArm')
    ik2('Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand',
        S + fv(P['rw'], yaw), fv(P.get('rpole', (1, -.2, -.6)), yaw))
    S = head('Bip01_L_UpperArm')
    ik2('Bip01_L_UpperArm', 'Bip01_L_Forearm', 'Bip01_L_Hand',
        S + fv(P['lw'], yaw), fv(P.get('lpole', (-.8, 0, -.6)), yaw))
    Rd = basis(fv(P['sn'], yaw), fv(P.get('su', (0, 0, 1)), yaw))
    hb = PB['Bip01_L_Hand']
    n4 = (Rd @ REST['Bip01_L_Hand'].to_3x3()).to_4x4(); n4.translation = hb.matrix.translation
    hb.matrix = n4; upd()
    sw = bpy.data.objects['Shield_Guardian'].matrix_world
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in PB}, sw.translation.copy(), (sw.to_3x3() @ Vector((0, -1, 0)))

def write_action(name, data, linear=()):
    reset()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    if not arm.animation_data: arm.animation_data_create()
    arm.animation_data.action = act
    for f, d in data.items():
        for n, (loc, q) in d.items():
            pb = PB[n]; pb.location = loc; pb.rotation_quaternion = q
            pb.keyframe_insert('location', frame=f, group=n)
            pb.keyframe_insert('rotation_quaternion', frame=f, group=n)
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points:
                        if kp.co[0] in linear:
                            kp.interpolation = 'LINEAR'
    arm.animation_data.action = None
    reset()
    return act

# ---------------- FX helpers ----------------
def fx_collection(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c

def fx_mat(name, color, strength=6.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    em.inputs['Color'].default_value = color; em.inputs['Strength'].default_value = strength
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    mix.inputs[0].default_value = 0.0
    try: m.surface_render_method = 'BLENDED'
    except Exception: pass
    m.diffuse_color = color
    return m, mix

def fx_obj(name, me, col, color, strength=6.0):
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    m, mix = fx_mat(name + '_mat', color, strength)
    me.materials.append(m)
    ob.scale = (0, 0, 0)
    ob['mix'] = mix.name
    return ob

def fx_key(ob, frame, loc=None, scale=None, alpha=None, rot=None):
    if loc is not None:
        ob.location = loc; ob.keyframe_insert('location', frame=frame)
    if rot is not None:
        ob.rotation_euler = rot; ob.keyframe_insert('rotation_euler', frame=frame)
    if scale is not None:
        ob.scale = scale if hasattr(scale, '__len__') else (scale, scale, scale)
        ob.keyframe_insert('scale', frame=frame)
    if alpha is not None:
        mix = ob.active_material.node_tree.nodes[ob['mix']]
        mix.inputs[0].default_value = alpha
        mix.inputs[0].keyframe_insert('default_value', frame=frame)

def mesh_torus(R=1, r=.08, axis_y=True):
    me = bpy.data.meshes.new('torus')
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=8)
    tmp = bpy.context.active_object
    me = tmp.data.copy(); bpy.data.objects.remove(tmp)
    if axis_y: me.transform(Matrix.Rotation(math.radians(90), 4, 'X'))
    return me

def mesh_sphere(r=1):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=24, ring_count=12)
    tmp = bpy.context.active_object
    me = tmp.data.copy(); bpy.data.objects.remove(tmp); return me

def mesh_disc(r=1, depth=.1):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=48)
    tmp = bpy.context.active_object
    me = tmp.data.copy(); bpy.data.objects.remove(tmp); return me

def mesh_cube(s=1):
    bpy.ops.mesh.primitive_cube_add(size=s)
    tmp = bpy.context.active_object
    me = tmp.data.copy(); bpy.data.objects.remove(tmp); return me

def mesh_cone_y():
    bpy.ops.mesh.primitive_cone_add(radius1=.3, radius2=1.0, depth=1, vertices=32, end_fill_type='NOTHING')
    tmp = bpy.context.active_object
    me = tmp.data.copy(); bpy.data.objects.remove(tmp)
    me.transform(Matrix.Translation((0, 0, .5)))
    me.transform(Matrix.Rotation(math.radians(90), 4, 'X'))
    return me
