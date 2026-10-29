import bpy
import os

glb_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\assembled_glb"
for f in sorted(os.listdir(glb_dir)):
    if f.endswith('.glb'):
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()
        path = os.path.join(glb_dir, f)
        bpy.ops.import_scene.gltf(filepath=path)
        objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if objs:
            o = objs[0]
            mats = [m.name for m in o.data.materials if m]
            texs = []
            for m in bpy.data.materials:
                if m.node_tree:
                    for n in m.node_tree.nodes:
                        if n.type == 'TEX_IMAGE' and n.image:
                            texs.append(n.image.name)
            print(f"{f}: Dim=({o.dimensions.x:.1f}, {o.dimensions.y:.1f}, {o.dimensions.z:.1f}), Mats={mats}, Texs={texs}")
