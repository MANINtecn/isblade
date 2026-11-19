"""Renderiza uma lista de GLB (frente) em PNG com o Blender sem janela, para conferir os sets.  blender -b --python render_glb.py -- saida.png a.glb b.glb c.glb ..."""
import bpy, sys, os, math
args = sys.argv[sys.argv.index('--') + 1:]; saida, glbs = args[0], args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'FLAT'; sc.display.shading.color_type = 'TEXTURE'; sc.render.film_transparent = False
w = bpy.data.worlds.new('w'); w.color = (.18, .2, .25); sc.world = w
n = len(glbs); sc.render.resolution_x = 360 * n; sc.render.resolution_y = 640
for i, g in enumerate(glbs):
    antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=g)
    novos = [o for o in bpy.data.objects if o not in antes]
    raiz = [o for o in novos if o.parent is None]
    for o in raiz: o.location.x += (i - (n - 1) / 2) * 60 * 1
    for o in novos:
        if o.animation_data: o.animation_data.action = None
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 60 * n * 1.02
cam.rotation_euler = (math.radians(90), 0, math.radians(0)); cam.location = (0, -300, 22)
bpy.context.scene.render.filepath = saida; bpy.ops.render.render(write_still=True); print('render', saida)
