"""Abre o guerreiro_skills.blend ja com o painel 'Skills' (tecla N) registrado e a Redemoinho de Aco em camera.
Uso:  blender.exe prototipo/assets/personagens/guerreiro_skills.blend --python prototipo/tools/blender_fx/abrir_guerreiro.py"""
import bpy, os
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "painel_skills_mago.py"), encoding="utf8").read(), "painel", "exec"))
def _inicio():
    sc = bpy.data.scenes.get("GUERREIRO_S4_REDEMOINHO") or bpy.data.scenes[0]
    bpy.context.window.scene = sc
    for a in bpy.context.window.screen.areas:
        if a.type == "VIEW_3D":
            sp = a.spaces[0]; sp.shading.type = "MATERIAL"; sp.overlay.show_overlays = False; sp.region_3d.view_perspective = "CAMERA"; sp.show_region_ui = True
    return None
bpy.app.timers.register(_inicio, first_interval=1.0)
