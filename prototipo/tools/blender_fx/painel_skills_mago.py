"""Painel "Skills Mago" na barra lateral do 3D (tecla N, aba Skills): um clique troca de skill, entra na camera, volta ao quadro 1 e toca.
Rodar no Blender (Scripting > Run Script) ou pelo MCP; o script tambem fica salvo no .blend como texto 'painel_skills_mago.py' (registra ao abrir, se o Blender permitir)."""
import bpy

SKILLS = [                                   # (cena, rotulo)
    ("MAGO_SKILL1", "1  Shuriken de Vento (Spellhowler)"),
    ("MAGO_ATAQUE", "Ataque padrao (cristais)"),
    ("MAGO_S2_FOGO", "2  Fogo: Meteoro de Magma (Archmage)"),
    ("MAGO_S2_AGUA", "2  Agua: Lanca de Gelo (Spellsinger)"),
    ("MAGO_S2_NECRO", "2  Morte: Espinhos de Osso (Necromante)"),
    ("MAGO_ELENCO", "Elenco: 12 personagens"),
]

class SKILLS_OT_ir(bpy.types.Operator):
    bl_idname = "skills.ir"; bl_label = "Ver skill"; bl_options = {"REGISTER"}
    cena: bpy.props.StringProperty()
    def execute(self, context):
        sc = bpy.data.scenes.get(self.cena)
        if not sc: self.report({"WARNING"}, "cena nao existe: " + self.cena); return {"CANCELLED"}
        if context.screen.is_animation_playing: bpy.ops.screen.animation_cancel(restore_frame=False)
        context.window.scene = sc; sc.frame_set(sc.frame_start)
        for c in sc.objects:                                   # se a cena nao tem camera ativa, usa a primeira
            if c.type == "CAMERA" and not sc.camera: sc.camera = c
        sp = context.space_data
        if sp and sp.type == "VIEW_3D":
            sp.region_3d.view_perspective = "CAMERA"; sp.shading.type = "MATERIAL"; sp.overlay.show_overlays = False
        bpy.ops.screen.animation_play()
        return {"FINISHED"}

class SKILLS_OT_camera(bpy.types.Operator):
    bl_idname = "skills.camera"; bl_label = "Trocar camera"
    def execute(self, context):
        sc = context.scene; cams = [o for o in sc.objects if o.type == "CAMERA"]
        if not cams: return {"CANCELLED"}
        i = cams.index(sc.camera) if sc.camera in cams else -1; sc.camera = cams[(i + 1) % len(cams)]
        context.space_data.region_3d.view_perspective = "CAMERA"; return {"FINISHED"}

class SKILLS_OT_tocar(bpy.types.Operator):
    bl_idname = "skills.tocar"; bl_label = "Tocar / parar"
    def execute(self, context):
        bpy.ops.screen.animation_play(); return {"FINISHED"}

class SKILLS_OT_inicio(bpy.types.Operator):
    bl_idname = "skills.inicio"; bl_label = "Voltar ao inicio"
    def execute(self, context):
        if context.screen.is_animation_playing: bpy.ops.screen.animation_cancel(restore_frame=False)
        context.scene.frame_set(context.scene.frame_start); return {"FINISHED"}

class SKILLS_PT_painel(bpy.types.Panel):
    bl_label = "Skills do Mago"; bl_idname = "SKILLS_PT_painel"; bl_space_type = "VIEW_3D"; bl_region_type = "UI"; bl_category = "Skills"
    def draw(self, context):
        lay = self.layout; atual = context.scene.name
        for cena, rotulo in SKILLS:
            if cena in bpy.data.scenes:
                r = lay.row(); r.scale_y = 1.4; op = r.operator("skills.ir", text=rotulo, depress=(cena == atual)); op.cena = cena
        lay.separator(); r = lay.row(align=True)
        r.operator("skills.tocar", text="Tocar / parar", icon="PLAY"); r.operator("skills.inicio", text="Inicio", icon="REW")
        lay.operator("skills.camera", text="Trocar camera", icon="CAMERA_DATA")
        lay.label(text="Quadro %d / %d" % (context.scene.frame_current, context.scene.frame_end))

CLASSES = (SKILLS_OT_ir, SKILLS_OT_camera, SKILLS_OT_tocar, SKILLS_OT_inicio, SKILLS_PT_painel)
def register():
    for c in CLASSES:
        try: bpy.utils.unregister_class(c)
        except Exception: pass
        bpy.utils.register_class(c)
register()
