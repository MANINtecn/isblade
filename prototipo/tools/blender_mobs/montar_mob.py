"""Monta um monstro do L2 (psk + psa + texturas do umodel) e exporta GLB leve para o jogo. Roda DENTRO do Blender:
blender -b --python montar_mob.py -- <malha.psk> <anim.psa> <pasta_texturas> <saida.glb> [altura=1.0] [giro_graus=0] [max_tris=3500]
- normaliza a altura para `altura` (o jogo escala pelo valor de dungeon.json), renomeia as animacoes (atk, atkwait, death, run, wait, walk, dmg), liga as texturas (alpha so se a imagem tem recorte),
  reduz a malha se passar de max_tris. O giro (graus em torno de Z) acerta para onde o modelo olha: no jogo o frente e +Z."""
import bpy, sys, os, math, glob, mathutils, numpy as np
A = sys.argv[sys.argv.index('--') + 1:]
PSK, PSA, TEX, OUT = A[0], A[1], A[2], A[3]
ALT = float(A[4]) if len(A) > 4 else 1.0; GIRO = float(A[5]) if len(A) > 5 else 0.0; MAXT = int(A[6]) if len(A) > 6 else 3500
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
bpy.ops.import_scene.psk(filepath=PSK)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); mesh = [o for o in bpy.data.objects if o.type == 'MESH']
for o in bpy.data.objects: o.select_set(False)
if PSA and os.path.exists(PSA):
    bpy.context.view_layer.objects.active = arm; arm.select_set(True)
    getattr(bpy.ops.psa_import, 'import')(filepath=PSA)
# ---- animacoes: nomes curtos; guarda so as que o jogo usa
ALIAS = {'atk01': 'atk', 'atk': 'atk', 'atkwait': 'atkwait', 'death': 'death', 'run': 'run', 'wait': 'wait', 'walk': 'walk', 'dmg': 'dmg', 'damage': 'dmg', 'dmg01': 'dmg', 'spwait': None}
for a in list(bpy.data.actions):
    k = ALIAS.get(a.name.lower(), '_')
    if k is None or k == '_' and a.name.lower() not in ALIAS:
        if a.name.lower().startswith('atk') and 'atk' not in [x.name for x in bpy.data.actions]: a.name = 'atk'; continue
        bpy.data.actions.remove(a); continue
    a.name = k
for a in bpy.data.actions: a.use_fake_user = True
if arm.animation_data is None: arm.animation_data_create()
arm.animation_data.action = bpy.data.actions.get('wait') or (list(bpy.data.actions)[0] if bpy.data.actions else None)
# ---- tamanho / giro
bpy.context.view_layer.update()
bb = [m.matrix_world @ mathutils.Vector(c) for m in mesh for c in m.bound_box]
h = max(b.z for b in bb) - min(b.z for b in bb); k = ALT / h
arm.scale = (arm.scale.x * k, arm.scale.y * k, arm.scale.z * k); arm.rotation_euler.z += math.radians(GIRO)
bpy.context.view_layer.update()
bb = [m.matrix_world @ mathutils.Vector(c) for m in mesh for c in m.bound_box]
arm.location.z -= min(b.z for b in bb)                                   # pes no chao
# ---- texturas
PNGS = {os.path.splitext(os.path.basename(p))[0].lower(): p for p in glob.glob(os.path.join(TEX, '**', '*.png'), recursive=True)}      # todas as texturas exportadas (qualquer subpasta)
PRIMEIRA = []; SEM_TEX = []
def img_alpha(im):
    w, h2 = im.size; a = np.empty(w * h2 * 4, dtype=np.float32); im.pixels.foreach_get(a); return float((a[3::4] < .5).mean())
for m in mesh:
    for slot in sorted(m.material_slots, key=lambda sl: 0 if (sl.material and ((sl.material.name + '_ori').lower() in PNGS or sl.material.name.lower() in PNGS)) else 1):
        mat = slot.material
        if not mat: continue
        mat.use_nodes = True; nt = mat.node_tree; b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        p = PNGS.get((mat.name + '_ori').lower()) or PNGS.get(mat.name.lower())
        if not p: p = next((v for k, v in PNGS.items() if k.startswith(mat.name.split('_t')[0].lower() + '_t')), None)
        if not p and b: SEM_TEX.append((m, slot.material.name)); continue      # material sem textura exportada (ex.: material_1 do cao): suas faces saem (ficariam brancas)
        if not p or not b: continue
        if not PRIMEIRA: PRIMEIRA.append(p)
        im = bpy.data.images.load(p); tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = im
        nt.links.new(tn.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = .85
        fr = img_alpha(im)
        if .02 < fr < .9: nt.links.new(tn.outputs['Alpha'], b.inputs['Alpha']); mat.blend_method = 'BLEND' if hasattr(mat, 'blend_method') else None
        # reduz a textura (celular)
        w, h2 = im.size
        if max(w, h2) > 512: s = 512 / max(w, h2); im.scale(max(1, int(w * s)), max(1, int(h2 * s)))
import bmesh
for m, nome in SEM_TEX:
    idx = [i for i, sl in enumerate(m.material_slots) if sl.material and sl.material.name == nome]
    bm = bmesh.new(); bm.from_mesh(m.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in idx], context='FACES'); bm.to_mesh(m.data); bm.free()
    print('faces sem textura removidas:', nome)
# ---- reduz a malha
tris = sum(len(m.data.polygons) for m in mesh)
if tris > MAXT:
    for m in mesh:
        mod = m.modifiers.new('dec', 'DECIMATE'); mod.ratio = MAXT / tris
        bpy.context.view_layer.objects.active = m
        mods = [x for x in m.modifiers]; mod_idx = mods.index(mod)
        try: bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
        except Exception: pass
        try: bpy.ops.object.modifier_apply(modifier='dec')
        except Exception as e: print('decimate falhou', e)
print('MOB', os.path.basename(OUT), 'tris', sum(len(m.data.polygons) for m in mesh), 'acoes', [a.name for a in bpy.data.actions])
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
                          export_image_format='AUTO', export_jpeg_quality=80, export_cameras=False, export_lights=False, export_yup=True)
print('EXPORTADO', OUT, round(os.path.getsize(OUT) / 1024), 'KB')
