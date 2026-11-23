"""Renders de conferencia por dentro (castelo/fortaleza): cameras em altura ABSOLUTA do jogo. Uso: blender -b -P cena_int.py -- <pasta> x,z,y,tx,tz,ty ..."""
import bpy, sys, os, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]; pasta = args[0]; vistas = [tuple(float(v) for v in a.split(',')) for a in args[1:]]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
for rel in ('assets/maps/dion/dion.glb', 'assets/maps/dion/dion_portoes.glb'): bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, rel))
sc = bpy.context.scene
try: sc.render.engine = 'BLENDER_EEVEE'
except TypeError: sc.render.engine = 'BLENDER_WORKBENCH'
sol = bpy.data.lights.new('SOL', 'SUN'); sol.energy = 4.0; so = bpy.data.objects.new('SOL', sol); sc.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(35))
pt = bpy.data.lights.new('LUZ', 'POINT'); pt.energy = 4000; pt.shadow_soft_size = 2
for m in bpy.data.materials:
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                try: n.inputs['Roughness'].default_value = 1.0; n.inputs['Specular IOR Level'].default_value = 0.0
                except Exception: pass
sc.render.resolution_x = 640; sc.render.resolution_y = 360
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True; bg = sc.world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (0.55, 0.75, 1.0, 1); bg.inputs['Strength'].default_value = 1.4
cam = bpy.data.objects.new('CAM', bpy.data.cameras.new('CAM')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 24; cam.data.clip_end = 2000; cam.data.clip_start = 0.05
lo = bpy.data.objects.new('LUZ', pt); sc.collection.objects.link(lo)
os.makedirs(pasta, exist_ok=True)
for k, (x, z, y, tx, tz, ty) in enumerate(vistas):
    cam.location = (x, -z, y); lo.location = (x, -z, y + 1.5)
    cam.rotation_euler = (Vector((tx, -tz, ty)) - Vector(cam.location)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(pasta, 'v%02d.png' % k); bpy.ops.render.render(write_still=True)
print('ok')
