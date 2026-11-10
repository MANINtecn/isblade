"""Guerreiro: ferramentas de animacao (rodam dentro do Blender, com o guerreiro_base.blend aberto).
  - clonar(): copia personagem + espada para uma cena (cada cena tem o seu, com a sua animacao)
  - bake(): monta um clipe novo a partir de pedacos dos clipes nativos 2HS (com giro de corpo por codigo, emendas suaves)
  - ponta_da_lamina(): posicao da ponta da espada em cada quadro (para sincronizar efeitos e golpes)"""
import bpy, math
from mathutils import Vector, Matrix, Quaternion

U = 23.4                                                                         # unidades do L2 por metro (humano ~ 41 unidades = 1,75 m)
FPS = 48
BASE = {}

def iniciar_base():
    BASE["sc"] = bpy.context.scene                                            # cena das ferramentas (a do personagem base); outras cenas nao entram no calculo
    BASE["arm"] = bpy.data.objects["HumanFighter_Armature"]
    BASE["corpo"] = [o for o in bpy.data.objects if o.type == "MESH" and o.parent == BASE["arm"]]
    BASE["espada"] = bpy.data.objects["DragonSlayer"]
    me = BASE["espada"].data; origem = Vector((0, 0, 0))
    BASE["ponta_local"] = max((v.co for v in me.vertices), key=lambda c: (c - origem).length).copy()
    BASE["ossos"] = [b.name for b in BASE["arm"].data.bones]

def clonar(col, tag, loc=(0, 0, 0), yaw=0.0):
    """cria arm + corpo + espada na colecao; devolve (arm, espada)"""
    b = BASE["arm"]; a = b.copy(); a.name = tag + "_arm"; a.animation_data_clear(); col.objects.link(a)
    a.location = loc; a.rotation_euler = (0, 0, yaw)
    for m in BASE["corpo"]:
        m2 = m.copy(); m2.name = tag + "_" + m.name; m2.parent = a; m2.matrix_parent_inverse = m.matrix_parent_inverse.copy()
        for mod in m2.modifiers:
            if mod.type == "ARMATURE": mod.object = a
        col.objects.link(m2)
    e = BASE["espada"].copy(); e.name = tag + "_espada"; col.objects.link(e)
    for k in e.constraints:
        if k.type == "COPY_TRANSFORMS": k.target = a
    a.animation_data_create()
    return a, e

def _canais(arm):
    return {n: arm.pose.bones[n] for n in BASE["ossos"]}

def captura(arm):
    return {n: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()) for n, pb in arm.pose.bones.items()}

def mistura(A, B, w):
    out = {}
    for n in A:
        la, qa, sa = A[n]; lb, qb, sb = B[n]
        out[n] = (la.lerp(lb, w), qa.slerp(qb, w), sa.lerp(sb, w))
    return out

def aplica(arm, pose):
    for n, (l, q, s) in pose.items():
        pb = arm.pose.bones[n]; pb.location = l; pb.rotation_quaternion = q; pb.scale = s

def pose_da_acao(arm, acao, quadro):
    """pose da acao no quadro (48 fps, pode ser fracionario)"""
    arm.animation_data.action = bpy.data.actions[acao]; f = int(math.floor(quadro)); sub = quadro - f
    BASE["sc"].frame_set(f, subframe=sub); BASE["sc"].view_layers[0].update(); return captura(arm)

def yaw_raiz(arm):
    pb = arm.pose.bones["Bip01"]; f = pb.matrix.to_3x3() @ Vector((1, 0, 0)); return math.degrees(math.atan2(f.y, f.x))

def gira_raiz(arm, graus, pivo_xy=None):
    """gira o personagem inteiro em volta do eixo vertical que passa pelo quadril (raiz Bip01), somando 'graus' ao que o clipe ja tem"""
    pb = arm.pose.bones["Bip01"]; M = pb.matrix.copy(); p = M.translation.copy() if pivo_xy is None else Vector((pivo_xy[0], pivo_xy[1], 0))
    R = Matrix.Translation(Vector((p.x, p.y, 0))) @ Matrix.Rotation(math.radians(graus), 4, "Z") @ Matrix.Translation(Vector((-p.x, -p.y, 0)))
    pb.matrix = R @ M; BASE["sc"].view_layers[0].update()

def bake(arm, nome, partes, emenda=5):
    """partes: lista de dict(acao=, de=, ate=, saida=quadros de saida, giro=funcao(t 0..1)->graus extras  ou None)
    A pose de cada pedaco e amostrada na acao nativa (de..ate em quadros de 48 fps) e esticada para 'saida' quadros; entre pedacos ha uma emenda suave de 'emenda' quadros.
    Devolve (acao_nova, lista_de_quadros_por_parte [(ini, fim)])."""
    poses = []; faixas = []; ultima = None; yaw_ult = 0.0
    for p in partes:
        n = p["saida"]; ini = len(poses); extra = 0.0
        if ultima is not None and p.get("alinha"):                                  # gira a pose para olhar para onde a pose anterior olhava
            ps0 = pose_da_acao(arm, p["acao"], p["de"]); aplica(arm, ps0); BASE["sc"].view_layers[0].update(); extra = (yaw_ult - yaw_raiz(arm) + 180) % 360 - 180
        g0 = p.get("giro"); gf = (lambda t, g0=g0, extra=extra: extra + (g0(t) if g0 else 0.0)) if (g0 or extra) else None
        p = dict(p); p["giro"] = gf
        if ultima is not None and emenda > 0:                                        # emenda: da ultima pose para a primeira desta
            arm.animation_data.action = bpy.data.actions[p["acao"]]
            prim = pose_da_acao(arm, p["acao"], p["de"])
            if p.get("giro"): aplica(arm, prim); gira_raiz(arm, p["giro"](0.0)); prim = captura(arm)
            for k in range(1, emenda + 1): poses.append(mistura(ultima, prim, k / (emenda + 1)))
            ini = len(poses)
        for i in range(n):
            t = i / max(1, n - 1); q = p["de"] + (p["ate"] - p["de"]) * t
            ps = pose_da_acao(arm, p["acao"], q)
            if p.get("giro"):
                aplica(arm, ps); gira_raiz(arm, p["giro"](t)); ps = captura(arm)
            poses.append(ps)
        ultima = poses[-1]; faixas.append((ini + 1, len(poses))); aplica(arm, ultima); BASE["sc"].view_layers[0].update(); yaw_ult = yaw_raiz(arm)
    nova = bpy.data.actions.new(nome); nova.use_fake_user = True; arm.animation_data.action = nova
    for i, ps in enumerate(poses):
        aplica(arm, ps); f = i + 1
        for n, pb in arm.pose.bones.items():
            pb.keyframe_insert("location", frame=f); pb.keyframe_insert("rotation_quaternion", frame=f)
    return nova, faixas

def usa_acao(arm, nome, copia=False):
    a = bpy.data.actions[nome]
    if copia: a = a.copy()
    arm.animation_data.action = a
    return a

def ponta_e_cabo(arm, esp, f0, f1):
    """posicao mundial da ponta da lamina e de um ponto a 40% da lamina, quadro a quadro (cena atual)"""
    sc = BASE["sc"]; out = {}; pl = BASE["ponta_local"]
    for f in range(f0, f1 + 1):
        sc.frame_set(f); sc.view_layers[0].update(); dg = sc.view_layers[0].depsgraph; e = esp.evaluated_get(dg); M = e.matrix_world
        out[f] = (M @ pl, M @ (pl * 0.64), arm.matrix_world @ arm.pose.bones["Bip01"].head)
    return out
