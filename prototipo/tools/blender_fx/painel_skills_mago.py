"""Painel "Skills Mago" na barra lateral do 3D (tecla N, aba Skills): um clique troca de skill, entra na camera, volta ao quadro 1 e toca.
Rodar no Blender (Scripting > Run Script) ou pelo MCP; o script tambem fica salvo no .blend como texto 'painel_skills_mago.py' (registra ao abrir, se o Blender permitir)."""
import bpy

SKILLS = [                                   # (cena, rotulo)
    ("MAGO_SKILL1", "1  Shuriken de Vento (Spellhowler)"),
    ("MAGO_ATAQUE", "Ataque padrao (cristais)"),
    ("MAGO_S2_FOGO", "2  Fogo: Meteoro de Magma (Archmage)"),
    ("MAGO_S2_FOGO_DISCO", "3  Fogo: Disco de Fogo (Archmage)"),
    ("MAGO_S2_AGUA", "2  Agua: Coluna de Agua (Spellsinger)"),
    ("MAGO_S2_NECRO", "2  Morte: Espinhos de Osso (Necromante)"),
    ("MAGO_S2_NECRO_PARALISIA", "2b Morte: Espinho Paralisante (Necromante)"),
    ("MAGO_ELENCO", "Elenco: 12 personagens"),
    ("ARQUEIRO_BASICO", "A0  Flecha / Dupla / Leque (basico)"),
    ("ARQUEIRO_S1_PERFURANTE", "A1  Tiro Perfurante (nv 1)"),
    ("ARQUEIRO_S2_GANCHO", "A2  Flecha-Gancho (nv 5)"),
    ("ARQUEIRO_S3_ATORDOANTE", "A3  Tiro Atordoante (nv 10)"),
    ("ARQUEIRO_S4_CHUVA", "A4  Chuva de Flechas (nv 20)"),
    ("ARQUEIRO_S5_FALCAO", "A5  Olho de Falcao (nv 25)"),
    ("ARQUEIRO_S6_ELITE", "A6  Tiro de Elite (nv 30)"),
    ("GUERREIRO_BASICO", "G0  Combo de 3 golpes (basico)"),
    ("GUERREIRO_S1_PODEROSO", "G1  Golpe Poderoso (nv 1)"),
    ("GUERREIRO_S3_ATORDOANTE", "G3  Golpe Atordoante (nv 10)"),
    ("GUERREIRO_S4_REDEMOINHO", "G4  Redemoinho de Aco (nv 20) - 10 golpes"),
    ("GUERREIRO_S5_GRITO", "G5  Grito de Guerra (nv 25)"),
    ("GUERREIRO_S6_FURIA", "G6  Furia do Dragao (nv 30)"),
    ("CLERIGO_BASICO", "C0  Lamina de Luz (ataque basico)"),
    ("CLERIGO_S1_CURA", "C1  Cura Mirada (nv 1)"),
    ("CLERIGO_S2_GLIFO", "C2  Glifo de Cura (nv 5)"),
    ("CLERIGO_S3_ESCUDO", "C3  Escudo Astral (nv 10)"),
    ("CLERIGO_S4_PURIFICA", "C4  Purificacao (nv 20)"),
    ("CLERIGO_S5_PRECE", "C5  Prece (nv 25)"),
    ("CLERIGO_S6_RESSUR", "C6  Ressurreicao (nv 30)"),
]

def _billboards(sc):
    """brilhos/sprites do Clerigo (constraint CL_BB) passam a olhar para a camera atual da cena"""
    for o in sc.objects:
        for k in o.constraints:
            if k.name in ("CL_BB", "GW_BB"): k.target = sc.camera

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
        _billboards(sc)
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
        i = cams.index(sc.camera) if sc.camera in cams else -1; sc.camera = cams[(i + 1) % len(cams)]; _billboards(sc)
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
