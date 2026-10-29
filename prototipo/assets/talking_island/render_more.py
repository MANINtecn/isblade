import bpy
import os

glb_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\assembled_glb"
out_dir = r"C:\Users\icaro\.gemini\antigravity-ide\brain\6884736c-5bb2-4acd-9136-e1da5bc05006"

for mname in ['ti_fighter_hall.glb', 'ti_tree_01.glb', 'ti_centertop.glb']:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for b in bpy.data.meshes: bpy.data.meshes.remove(b)
    for b in bpy.data.materials: bpy.data.materials.remove(b)
    for b in bpy.data.images: bpy.data.images.remove(b)
    bpy.ops.import_scene.gltf(filepath=os.path.join(glb_dir, mname))
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not objs: continue
    dim = objs[0].dimensions
    max_d = max(dim.x, dim.y, dim.z)
    cam_data = bpy.data.cameras.new('Cam')
    cam = bpy.data.objects.new('Cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = (max_d * 1.4, -max_d * 1.6, max_d * 0.9)
    cam.rotation_euler = (1.1, 0, 0.7)
    light_data = bpy.data.lights.new(name='Sun', type='SUN')
    light_data.energy = 4.0
    light = bpy.data.objects.new('Sun', light_data)
    light.rotation_euler = (0.8, 0.2, 0.5)
    bpy.context.scene.collection.objects.link(light)
    bpy.context.scene.render.resolution_x = 800
    bpy.context.scene.render.resolution_y = 600
    out_png = os.path.join(out_dir, f'render_{os.path.splitext(mname)[0]}.png')
    bpy.context.scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {out_png}")
