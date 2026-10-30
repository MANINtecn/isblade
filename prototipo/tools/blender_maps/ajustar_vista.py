"""Deixa o Blender confortavel para editar o mapa: zoom ate o mouse, profundidade automatica, Clip Start/End folgados e
vista enquadrada no chao do salao. Rodar: blender -b <arquivo.blend> --python ajustar_vista.py -- <saida.blend>"""
import bpy, sys
OUT = sys.argv[sys.argv.index('--') + 1]
pr = bpy.context.preferences.inputs
pr.use_zoom_to_mouse = True            # zoom vai para onde o mouse aponta
pr.use_mouse_depth_navigate = True     # "Auto Depth": o centro do giro/zoom fica na peça sob o mouse
bpy.ops.wm.save_userpref()
n = 0
for win in bpy.context.window_manager.windows:
    for area in win.screen.areas:
        if area.type == 'VIEW_3D':
            for sp in area.spaces:
                if sp.type == 'VIEW_3D':
                    sp.clip_start = 0.01; sp.clip_end = 5000.0; sp.shading.type = 'MATERIAL'; n += 1
alvo = bpy.data.objects.get('chao_baium_salao')
print('vistas 3D ajustadas:', n, '| objeto alvo:', bool(alvo))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
