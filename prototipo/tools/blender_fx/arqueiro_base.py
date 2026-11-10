"""Arqueiro (Humano M) - base do showcase: monta o personagem L2 com o Arco da Floresta na mao e importa as animacoes nativas de arco (Bow).
Roda sem janela:  blender -b --factory-startup --python prototipo/tools/blender_fx/arqueiro_base.py
Sai em  prototipo/assets/personagens/arqueiro_base.blend  (git ignora .blend). Unidades do L2: o humano tem ~41 unidades (1 m ~ 23 unidades). 48 fps.
1) traz o armature + corpo do guardian_skills.blend  2) importa o PSA do MFighter (30 fps) e converte o que serve para 48 fps (acoes W_*)
3) prende a Dragon Slayer (PSK nativo) no osso Weapon_R_Bone por COPY_TRANSFORMS (o osso do L2 ja e o encaixe da arma)."""
import bpy, os, math, addon_utils
from mathutils import Vector, Matrix

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
PERS = os.path.join(RAIZ, "assets", "personagens")
RAW = os.path.join(PERS, "raw_fighter")
PSA = os.path.join(RAW, "Fighter", "MeshAnimation", "MFighter_anim.psa")
WP_PSK = os.path.join(RAW, "LineageWeapons", "SkeletalMesh", "bow_of_forest_m00_wp.psk")
if not os.path.exists(WP_PSK): WP_PSK = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/ferramentas para l2/export_nativo/LineageWeapons_dec/SkeletalMesh/bow_of_forest_m00_wp.psk"
WP_DIFF = os.path.join(RAW, "LineageWeaponsTex", "Texture", "dragon_slayer_t00_wp_ori.png")
WP_SPEC = os.path.join(RAW, "LineageWeaponsTex", "Texture", "dragon_slayer_t00_sp.png")
FONTE = os.path.join(PERS, "guardian_skills.blend")
SAIDA = os.path.join(PERS, "arqueiro_base.blend")
FPS = 48

bpy.ops.wm.read_factory_settings(use_empty=True)
for mod in ("bl_ext.user_default.io_scene_psk_psa", "io_scene_psk_psa"):
    try: addon_utils.enable(mod, default_set=False, persistent=False); break
    except Exception as e: print("addon", mod, e)
sc = bpy.context.scene; sc.render.fps = 30

# 1) personagem
corpo = ["HumanFighter_Armature", "Boots", "Chest", "Face", "Gloves", "Hair_Back", "Hair_Front", "Legs"]
with bpy.data.libraries.load(FONTE, link=False) as (df, dt): dt.objects = [n for n in corpo if n in df.objects]
for o in dt.objects:
    if o is not None: sc.collection.objects.link(o)
arm = bpy.data.objects["HumanFighter_Armature"]; arm.animation_data_clear()

# 2) animacoes nativas
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
if hasattr(sc, "psa_import"): sc.psa_import.fps_source = "SCENE"
getattr(bpy.ops.psa_import, "import")(filepath=PSA)
acoes = {a.name: a for a in bpy.data.actions}
print("acoes importadas:", len(acoes), [n for n in acoes if "2HS" in n])

def fcs(act):
    if hasattr(act, "fcurves"): return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []): out.extend(list(bag.fcurves))
    return out
CLIPES = ["Wait_Bow", "AtkWait_Bow", "Walk_Bow", "Run_Bow", "Atk01_Bow", "SpAtk01_Bow", "SpAtk02_Bow"]
K = 48.0 / 30.0                                                                 # PSA a 30 fps -> cena a 48 fps
for c in CLIPES:
    src = acoes.get(c + "_MFighter")
    if not src: print("sem", c); continue
    novo = src.copy(); novo.name = "W_" + c; novo.use_fake_user = True
    for fc in fcs(novo):
        for kp in fc.keyframe_points: kp.co[0] = kp.co[0] * K; kp.handle_left[0] *= K; kp.handle_right[0] *= K
        fc.update()
    print("W_%-12s %5.1f quadros (%.2f s)" % (c, novo.frame_range[1], novo.frame_range[1] / 48.0))
for a in list(bpy.data.actions):
    if not a.name.startswith("W_"): bpy.data.actions.remove(a)
sc.render.fps = FPS

# 3) Dragon Slayer
bpy.ops.object.select_all(action="DESELECT")
n0 = set(bpy.data.objects.keys()); bpy.ops.import_scene.psk(filepath=WP_PSK)
novos = [bpy.data.objects[n] for n in bpy.data.objects.keys() if n not in n0]
arma = next(o for o in novos if o.type == "MESH"); arma.name = "Arco"
for o in novos:
    if o.type == "ARMATURE": bpy.data.objects.remove(o, do_unlink=True)
arma.parent = None
for vg in list(arma.vertex_groups): arma.vertex_groups.remove(vg)
m = bpy.data.materials.new("Mat_Arco"); m.use_nodes = True; b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
b.inputs["Base Color"].default_value = (0.16, 0.085, 0.045, 1); b.inputs["Roughness"].default_value = 0.55; b.inputs["Metallic"].default_value = 0.1      # sem textura do L2 para este arco: madeira escura procedural
arma.data.materials.clear(); arma.data.materials.append(m)
k = arma.constraints.new("COPY_TRANSFORMS"); k.target = arm; k.subtarget = "Weapon_L_Bone"; k.name = "ENCAIXE"
arm.animation_data_create(); arm.animation_data.action = bpy.data.actions["W_AtkWait_Bow"]
sc.frame_start = 1; sc.frame_end = int(bpy.data.actions["W_AtkWait_Bow"].frame_range[1]) + 1
bpy.ops.wm.save_as_mainfile(filepath=SAIDA, compress=False); print("salvo", SAIDA)
