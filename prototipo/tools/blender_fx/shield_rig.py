"""Escudo do Guardiao animado direto no osso Shield_L_Bone (sem constraints, drivers nem propriedades): cada acao grava a posicao do escudo
(na mao, nas costas ou em voo) nos canais do osso. Funciona em qualquer reproducao e exporta para glTF.
Este arquivo e executado no mesmo namespace dos scripts de animacao (arm, SH, PB, upd, reset ja existem)."""
import bpy
from mathutils import Matrix
SB = 'Shield_L_Bone'
SHIELD_PROPS = ('escudo_costas', 's6_fly', 'draw_fly', 'sheath_fly')

def clear_shield_rig():
    """tira tudo o que as versoes antigas deixaram: constraints, drivers, acao do escudo, propriedades e empties de voo"""
    for c_ in list(SH.constraints): SH.constraints.remove(c_)
    ad = SH.animation_data
    if ad:
        for d_ in list(ad.drivers): ad.drivers.remove(d_)
        if ad.action:
            a_ = ad.action; ad.action = None; bpy.data.actions.remove(a_)
    for n_ in ('S6_ShieldRig', 'S_DrawRig', 'S_SheathRig', 'S_BackStrap'):
        o_ = bpy.data.objects.get(n_)
        if o_: bpy.data.objects.remove(o_, do_unlink=True)
    for p_ in SHIELD_PROPS:
        if p_ in arm.keys(): del arm[p_]
    for a_ in bpy.data.actions:                                     # canais de propriedade deixados nas acoes
        for layer in a_.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for fc in list(cb.fcurves):
                        if fc.data_path.startswith('["') and any(('"%s"' % p_) in fc.data_path for p_ in SHIELD_PROPS): cb.fcurves.remove(fc)

def calib_Y():
    """mundo do escudo = arm_world @ pose_matrix(Shield_L_Bone) @ Y  (Y e constante: ponta do osso + inversa do pai)"""
    reset(); upd()
    return (arm.matrix_world @ PB[SB].matrix).inverted() @ SH.matrix_world

def set_pose(d):
    for n, (loc, q) in d.items():
        PB[n].location = loc; PB[n].rotation_quaternion = q
    upd()

def place(W, Y):
    """coloca o escudo no mundo W mexendo so no osso do escudo (o resto da pose ja esta aplicado)"""
    PB[SB].matrix = arm.matrix_world.inverted() @ W @ Y.inverted(); upd()
    return PB[SB].location.copy(), PB[SB].rotation_quaternion.copy()

def shield_frames(data, desired, Y):
    """data = {frame: {osso: (loc, quat)}}; desired(frame) -> matriz do escudo no mundo, ou None para deixar na mao"""
    out = {}
    for f, d in data.items():
        W = desired(f)
        if W is None: out[f] = d; continue
        set_pose(d); nd = dict(d); nd[SB] = place(W, Y); out[f] = nd
    reset()
    return out
