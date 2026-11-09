"""Gera o clerigo_skills.blend sem abrir janela: blender -b --factory-startup --python prototipo/tools/blender_fx/build_clerigo.py"""
import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
AQUI = os.path.dirname(os.path.abspath(__file__))
exec(compile(open(os.path.join(AQUI, "clerigo_skills.py"), encoding="utf8").read(), "cl", "exec"))
pt = bpy.data.texts.new("painel_skills_mago.py"); pt.from_string(open(os.path.join(AQUI, "painel_skills_mago.py"), encoding="utf8").read()); pt.use_module = True
if "Scene" in bpy.data.scenes and len(bpy.data.scenes) > 1: bpy.data.scenes.remove(bpy.data.scenes["Scene"])
SAIDA = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "clerigo_skills.blend"))
bpy.ops.wm.save_as_mainfile(filepath=SAIDA, compress=False); print("salvo", SAIDA)
