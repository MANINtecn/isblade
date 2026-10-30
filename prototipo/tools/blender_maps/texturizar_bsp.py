"""Aplica textura de pedra nos pisos/paredes que vem dos brushes (BSP_*) e nos remendos (chao_*).
Esses objetos nao tem UV (o glTF exportava so a cor lisa). Aqui: UV triplanar pelo mundo (escala 0.08 = 1 repeticao a cada 12.5 un)
e dois materiais por objeto: PISO (faces voltadas para cima/baixo) e PAREDE (faces verticais).
Rodar:  blender -b <entrada.blend> --python texturizar_bsp.py -- <pasta_texturas> <saida.blend> [piso=toh_tile01] [parede=toh_wall_05]
<pasta_texturas> = pasta com PNGs do umodel (ex.: .../exp/Amfa_T/Texture) ou '-' para usar os materiais ja existentes no .blend"""
import bpy, sys, os, math, mathutils

a = sys.argv[sys.argv.index('--') + 1:]
TEXDIR, OUT = a[0], a[1]
PISO = a[2] if len(a) > 2 else 'toh_tile01'; PAREDE = a[3] if len(a) > 3 else 'toh_wall_05'
ESC = 0.08

def _sair_do_modo_edicao():
    """O .blend pode ter sido salvo com uma peca em modo de edicao (Tab): as ferramentas nao conseguem ler/gravar a malha assim."""
    import bpy
    for ob in list(bpy.data.objects):
        if ob.mode == 'EDIT':
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.mode_set(mode='OBJECT')
            print('saiu do modo de edicao:', ob.name)
_sair_do_modo_edicao()

def material(nome, tex):
    m = bpy.data.materials.get(nome)
    if m and m.use_nodes and any(n.type == 'TEX_IMAGE' and n.image for n in m.node_tree.nodes) and (TEXDIR == '-' or not os.path.exists(os.path.join(TEXDIR, tex + '.png'))):
        return m                                    # material ja existe com a imagem empacotada no .blend: reaproveita (a pasta de texturas pode nao existir mais)
    if m: bpy.data.materials.remove(m)
    m = bpy.data.materials.new(nome); m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bsdf.inputs['Roughness'].default_value = 0.9
    p = os.path.join(TEXDIR, tex + '.png')
    if os.path.exists(p):
        img = bpy.data.images.load(p, check_existing=True); img.pack()
        tn = m.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = img
        m.node_tree.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        print('textura nao achada:', p); bsdf.inputs['Base Color'].default_value = (.32, .30, .27, 1)
    return m
mp, mw = material('PISO_pedra', PISO), material('PAREDE_pedra', PAREDE)

n = 0
for ob in bpy.data.objects:
    if ob.type != 'MESH' or not (ob.name.startswith('BSP_') or ob.name.startswith('chao_')): continue
    me = ob.data
    me.materials.clear(); me.materials.append(mp); me.materials.append(mw)
    # editar a malha no Blender pode deixar a UV vazia/desencontrada (o export do glTF quebra): reconstroi a malha do zero e refaz a UV
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    for l in list(bm.loops.layers.uv.values()): bm.loops.layers.uv.remove(l)
    bm.to_mesh(me); bm.free(); me.update()
    while len(me.uv_layers): me.uv_layers.remove(me.uv_layers[0])
    uv = me.uv_layers.new(name='UV')
    M = ob.matrix_world
    for p in me.polygons:
        nw = (M.to_3x3() @ p.normal).normalized()
        p.material_index = 0 if abs(nw.z) > 0.6 else 1
        for li in p.loop_indices:
            w = M @ me.vertices[me.loops[li].vertex_index].co
            if abs(nw.z) > 0.6: u, v = w.x, w.y
            elif abs(nw.x) > abs(nw.y): u, v = w.y, w.z
            else: u, v = w.x, w.z
            uv.data[li].uv = (u * ESC, v * ESC)
    n += 1
print('TEXTURIZADOS: %d objetos' % n)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
