"""Monta um NPC nativo do L2 (psk + psa + texturas PNG do umodel) e exporta GLB leve para o jogo.
Roda DENTRO do Blender:
blender -b --python montar_npc.py -- <malha.psk> <anim.psa> <pasta_texturas> <saida.glb> [altura=1.75] [giro_graus=0]
"""
import bpy, sys, os, math, glob, mathutils, numpy as np

A = sys.argv[sys.argv.index('--') + 1:]
PSK = os.path.abspath(A[0])
PSA = os.path.abspath(A[1]) if len(A) > 1 and A[1] and A[1] != 'none' else None
TEX = os.path.abspath(A[2])
OUT = os.path.abspath(A[3])
ALT = float(A[4]) if len(A) > 4 else 1.75
GIRO = float(A[5]) if len(A) > 5 else 0.0

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
bpy.ops.import_scene.psk(filepath=PSK)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
mesh = [o for o in bpy.data.objects if o.type == 'MESH']

for o in bpy.data.objects:
    o.select_set(False)

if PSA and os.path.exists(PSA) and arm:
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    try:
        getattr(bpy.ops.psa_import, 'import')(filepath=PSA)
    except Exception as e:
        print("Erro ao importar PSA:", e)

# Normalizar e manter acoes uteis de NPC
for a in list(bpy.data.actions):
    n = a.name.lower()
    if 'wait' in n or 'idle' in n:
        if 'wait' not in [x.name for x in bpy.data.actions]:
            a.name = 'wait'
        elif 'idle' not in [x.name for x in bpy.data.actions]:
            a.name = 'idle'
    elif 'social' in n:
        a.name = 'social'

# Se tiver 'wait', duplica ou garante 'idle' tambem para Three.js
wait_act = bpy.data.actions.get('wait')
if wait_act and 'idle' not in bpy.data.actions:
    idle_act = wait_act.copy()
    idle_act.name = 'idle'

for a in bpy.data.actions:
    a.use_fake_user = True

if arm:
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = bpy.data.actions.get('idle') or bpy.data.actions.get('wait') or (list(bpy.data.actions)[0] if bpy.data.actions else None)

# ---- tamanho / giro / pés no chão
bpy.context.view_layer.update()
bb = [m.matrix_world @ mathutils.Vector(c) for m in mesh for c in m.bound_box]
if bb:
    h = max(b.z for b in bb) - min(b.z for b in bb)
    if h > 0:
        k = ALT / h
        if arm:
            arm.scale = (arm.scale.x * k, arm.scale.y * k, arm.scale.z * k)
            arm.rotation_euler.z += math.radians(GIRO)
        else:
            for m in mesh:
                m.scale = (m.scale.x * k, m.scale.y * k, m.scale.z * k)
                m.rotation_euler.z += math.radians(GIRO)
        bpy.context.view_layer.update()
        bb = [m.matrix_world @ mathutils.Vector(c) for m in mesh for c in m.bound_box]
        min_z = min(b.z for b in bb)
        if arm:
            arm.location.z -= min_z
        else:
            for m in mesh:
                m.location.z -= min_z

# ---- texturas
PNGS = {os.path.splitext(os.path.basename(p))[0].lower(): os.path.abspath(p) for p in glob.glob(os.path.join(TEX, '**', '*.png'), recursive=True)}

def img_alpha(im):
    w, h2 = im.size
    a = np.empty(w * h2 * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    return float((a[3::4] < .5).mean())

for m in mesh:
    for slot in m.material_slots:
        mat = slot.material
        if not mat:
            continue
        nt = mat.node_tree
        if not nt:
            mat.use_nodes = True
            nt = mat.node_tree
        b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not b:
            continue
        p = PNGS.get((mat.name + '_ori').lower()) or PNGS.get(mat.name.lower())
        if not p:
            p = next((v for k, v in PNGS.items() if k.startswith(mat.name.split('_t')[0].lower() + '_t')), None)
        if not p:
            continue
        im = bpy.data.images.load(filepath=p)
        tn = nt.nodes.new('ShaderNodeTexImage')
        tn.image = im
        nt.links.new(tn.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.85
        fr = img_alpha(im)
        if .02 < fr < .9:
            nt.links.new(tn.outputs['Alpha'], b.inputs['Alpha'])
            if hasattr(mat, 'blend_method'):
                mat.blend_method = 'BLEND'
        # textura otimizada
        w, h2 = im.size
        if max(w, h2) > 512:
            s = 512 / max(w, h2)
            im.scale(max(1, int(w * s)), max(1, int(h2 * s)))

print('NPC', os.path.basename(OUT), 'mesh tris:', sum(len(m.data.polygons) for m in mesh), 'acoes:', [a.name for a in bpy.data.actions])

for o in bpy.data.objects:
    o.select_set(True)

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_force_sampling=True,
    export_image_format='AUTO',
    export_jpeg_quality=85,
    export_cameras=False,
    export_lights=False,
    export_yup=True
)
print('EXPORTADO COM SUCESSO:', OUT, round(os.path.getsize(OUT) / 1024), 'KB')
