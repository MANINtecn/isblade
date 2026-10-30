"""Skills 2-6 do Guardiao em cima das animacoes NATIVAS do L2 (MFighter_anim.psa). Roda dentro do Blender (guardian_skills.blend, importador io_scene_psk_psa):
1) importar o PSA:  bpy.ops.psa_import.import(filepath=...raw_fighter/Fighter/MeshAnimation/MFighter_anim.psa)  (traz as 114; guardar so as de SPECS)
2) rodar este script: cria as acoes L2_Skill*_ (recorte [a,b] do PSA, velocidade, pausa final), com o tempo convertido para 48 fps
3) exportar com export_guardian.py (clipes l2_s2..l2_s6) e SALVAR o .blend
Cada linha: destino, origem, quadro inicial, quadro final, fps do PSA, velocidade, pausa final (s), quadro do impacto no PSA."""
import bpy
SPECS = [
 ('L2_Skill2_Slam',        'SpAtk03_2HS',   0, 54, 30, 1.10, 0.0, 34),   # Fortaleza Egide: pulo + pancada ajoelhado com o escudo no chao
 ('L2_Skill3_Rain',        'CastLong',      8, 114, 30, 1.60, 0.0, 109), # Chuva de Escudos: invocacao, bracos erguidos e descida
 ('L2_Skill4_Taunt',       'Social_Atk',    2, 56, 20, 1.30, 0.0, 24),   # Rugido: gesto de desafio
 ('L2_Skill5_Hook',        'Magicshot',     0, 45, 30, 1.00, 0.0, 20),   # Corrente de Puxao: soco para a frente e braco subindo
 ('L2_Skill6_ShieldThrow', 'ShieldAtk_1HS', 0, 45, 30, 1.00, 1.1, 34),   # Arremesso: escudo em arco e braco dispara; pausa final p/ o escudo (voo e FX) ir e voltar
]
def fcs(act):
    if hasattr(act, 'fcurves'): return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []): out.extend(list(bag.fcurves))
    return out
for dest, src, a, b, rate, spd, hold, imp in SPECS:
    for x in list(bpy.data.actions):
        if x.name == dest: bpy.data.actions.remove(x)
    novo = bpy.data.actions[src + '_MFighter'].copy(); novo.name = dest; novo.use_fake_user = True
    K = (48.0 / rate) / spd
    for fc in fcs(novo):
        for kp in reversed(list(fc.keyframe_points)):
            if kp.co[0] < a - 0.01 or kp.co[0] > b + 0.01: fc.keyframe_points.remove(kp, fast=True)
        for kp in fc.keyframe_points:
            kp.co[0] = (kp.co[0] - a) * K; kp.handle_left[0] = (kp.handle_left[0] - a) * K; kp.handle_right[0] = (kp.handle_right[0] - a) * K
        if hold > 0 and len(fc.keyframe_points):
            u = fc.keyframe_points[-1].co[0]; fc.keyframe_points.insert(u + hold * 48.0, fc.evaluate(u), options={'FAST'})
        fc.update()
    dur = (novo.frame_range[1] - novo.frame_range[0]) / 48.0; ti = (imp - a) * K / 48.0
    print('%-24s dur %.2f s | impacto %.2f s (fracao %.3f)' % (dest, dur, ti, ti / dur))
