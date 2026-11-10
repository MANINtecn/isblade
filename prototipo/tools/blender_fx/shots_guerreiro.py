"""Renders de conferencia do Guerreiro (EEVEE, em segundo plano). Uso: blender -b <blend> --python shots_clerigo.py -- <pasta_saida> cena:quadro:camera ..."""
import bpy, sys
args = sys.argv[sys.argv.index("--") + 1:]; pasta = args[0]
for a in args[1:]:
    nome, quadro, cam = a.split(":"); sc = bpy.data.scenes["GUERREIRO_" + nome]; sc.camera = sc.objects[nome + "_" + cam]
    sc.render.resolution_x = 640; sc.render.resolution_y = 360; sc.render.resolution_percentage = 100; sc.frame_set(int(quadro) - 1); sc.frame_set(int(quadro)); sc.view_layers[0].depsgraph.update()
    sc.render.filepath = "%s/%s_%s_%s.png" % (pasta, nome, quadro, cam); sc.render.image_settings.file_format = "PNG"
    with bpy.context.temp_override(scene=sc, view_layer=sc.view_layers[0]):      # em segundo plano o render sem isso usa a cena errada
        bpy.ops.render.render(write_still=True, scene=sc.name)
