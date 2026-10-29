import bpy
import os

path = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\assembled_glb\ti_wall_a.glb"
bpy.ops.import_scene.gltf(filepath=path)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in objs:
    print('Wall name:', o.name, 'Dimensions:', o.dimensions)
    bbox = [list(c) for c in o.bound_box]
    print('BBox min/max:', bbox[0], bbox[6])

out_dir = r"C:\Users\icaro\.gemini\antigravity-ide\brain\6884736c-5bb2-4acd-9136-e1da5bc05006"
cam_data = bpy.data.cameras.new('Cam')
cam = bpy.data.objects.new('Cam', cam_data)
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam
cam.location = (25, -30, 20)
cam.rotation_euler = (1.1, 0, 0.7)
light_data = bpy.data.lights.new(name='Sun', type='SUN')
light_data.energy = 4.0
light = bpy.data.objects.new('Sun', light_data)
bpy.context.scene.collection.objects.link(light)
bpy.context.scene.render.filepath = os.path.join(out_dir, "render_ti_wall_a.png")
bpy.ops.render.render(write_still=True)
print("Saved render_ti_wall_a.png")
