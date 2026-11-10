"""Gera o arqueiro_skills.blend sem abrir janela:
blender -b prototipo/assets/personagens/arqueiro_base.blend --python prototipo/tools/blender_fx/build_guerreiro.py   (variavel ARQ_ONLY=BASICO para montar so uma cena)"""
import bpy, os, sys
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
exec(compile(open(os.path.join(AQUI, "arqueiro_skills.py"), encoding="utf8").read(), "gw", "exec"))
# tira o personagem base (cada cena tem o seu) e guarda o painel no arquivo
base = bpy.data.scenes["Scene"]
for o in list(base.objects): bpy.data.objects.remove(o, do_unlink=True)
if len(bpy.data.scenes) > 1: bpy.data.scenes.remove(base)
pt = bpy.data.texts.new("painel_skills_mago.py"); pt.from_string(open(os.path.join(AQUI, "painel_skills_mago.py"), encoding="utf8").read()); pt.use_module = True
SAIDA = os.path.abspath(os.path.join(AQUI, "..", "..", "assets", "personagens", "arqueiro_skills.blend"))
bpy.ops.wm.save_as_mainfile(filepath=SAIDA, compress=False); print("salvo", SAIDA)
