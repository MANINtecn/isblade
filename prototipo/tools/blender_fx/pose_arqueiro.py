"""Retoque de pose do Arqueiro: MIRAR PARA CIMA de forma natural (nao girar o tronco como uma tabua).
Sobre a pose de mira do clipe nativo (Atk01_Bow), com peso w (0..1):
  - a coluna curva em PARTES (bip01_spine, Spine1, spine2, pescoco, cabeca) em torno do eixo lateral;
  - os bracos sobem (ombros) para a linha da mira chegar perto de 70 graus;
  - o quadril desce e vai para tras (contrapeso) e os joelhos DOBRAM: os pes ficam exatamente onde estavam (IK de 2 ossos, joelho para a frente);
  - o pe mantem a orientacao do clipe; a cabeca olha para a ponta da flecha.
Eixos do esqueleto base: frente = -Y, lateral = X, cima = Z."""
import bpy, math
from mathutils import Vector, Matrix, Quaternion

SC = {"sc": None}
def _upd(): SC["sc"].view_layers[0].update()
def rot_osso(arm, nome, graus):
    """gira o osso (e tudo que depende dele) em torno do eixo lateral X pelo ombro/articulacao do proprio osso; graus > 0 = inclina para tras/cima"""
    pb = arm.pose.bones[nome]; M = pb.matrix.copy(); p = M.translation.copy()
    pb.matrix = Matrix.Translation(p) @ Matrix.Rotation(math.radians(-graus), 4, "X") @ Matrix.Translation(-p) @ M; _upd()
def alinha(pb, dir_nova, cabeca_nova, filho_cabeca):
    """gira o osso em torno da cabeca ate o segmento (cabeca->filho) apontar para dir_nova; a cabeca vai para cabeca_nova"""
    M = pb.matrix.copy(); dir_velha = (filho_cabeca - M.translation).normalized(); q = dir_velha.rotation_difference(dir_nova.normalized())
    R = q.to_matrix().to_4x4(); Mr = R @ Matrix.Translation(-M.translation) @ M
    pb.matrix = Matrix.Translation(cabeca_nova) @ Mr; _upd()
def perna(arm, lado, alvo_pe, pe_matriz, polo):
    """IK de 2 ossos: coxa/canela para o pe ficar em alvo_pe (espaco do esqueleto), joelho para o lado do polo; devolve nada"""
    t = arm.pose.bones["Bip01_%s_Thigh" % lado]; c = arm.pose.bones["Bip01_%s_Calf" % lado]; f = arm.pose.bones["bip01_%s_foot" % lado.lower()]
    H = t.matrix.translation.copy(); K0 = c.matrix.translation.copy(); A0 = f.matrix.translation.copy(); L1 = (K0 - H).length; L2 = (A0 - K0).length
    d = alvo_pe - H; dist = d.length; dist = min(dist, (L1 + L2) * 0.999); a = d.normalized()
    cosA = max(-1.0, min(1.0, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))); sinA = math.sqrt(max(0.0, 1 - cosA * cosA))
    perp = (polo - a * polo.dot(a)); perp = perp.normalized() if perp.length > 1e-6 else Vector((0, -1, 0))
    K = H + a * (L1 * cosA) + perp * (L1 * sinA)
    alinha(t, K - H, H, K0)                                        # coxa aponta para o joelho
    alinha(c, alvo_pe - c.matrix.translation, c.matrix.translation.copy(), f.matrix.translation.copy())        # canela aponta para o pe (usa a posicao ATUAL do tornozelo, depois da coxa girar)
    F = pe_matriz.copy(); F.translation = f.matrix.translation.copy(); f.matrix = F; _upd()
def mira_para_cima(arm, w, tronco=44.0, bracos=44.0, baixa=9.0, atras=5.0):
    """aplica o retoque com peso w (0..1) sobre a pose ja posta no esqueleto"""
    if w <= 1e-4: return
    pb = arm.pose.bones; _upd()
    pes = {l: (pb["bip01_%s_foot" % l.lower()].matrix.translation.copy(), pb["bip01_%s_foot" % l.lower()].matrix.copy()) for l in ("L", "R")}
    # quadril desce e vai para tras (contrapeso)
    raiz = pb["Bip01"]; M = raiz.matrix.copy(); M.translation += Vector((0, atras * w, -baixa * w)); raiz.matrix = M; _upd()
    # joelhos dobram e os pes ficam onde estavam
    for l in ("L", "R"): perna(arm, l, pes[l][0], pes[l][1], Vector((0, -1.0, 0.25)))
    # coluna em partes
    for nome, k in (("bip01_spine", 0.18), ("Bip01_Spine1", 0.27), ("bip01_spine2", 0.30)): rot_osso(arm, nome, tronco * w * k * 3.33 * 0.30)
    rot_osso(arm, "Bip01_Neck", tronco * w * 0.10); rot_osso(arm, "Bip01_head", tronco * w * 0.22)
    # bracos sobem
    for l in ("L", "R"): rot_osso(arm, "Bip01_%s_UpperArm" % l, bracos * w)
