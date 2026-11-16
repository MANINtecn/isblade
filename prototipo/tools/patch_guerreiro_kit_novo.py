"""Kit novo do Guerreiro (15/11/2026): liga as 7 skills (poses w_n0..w_n6) em arena.html E cidade.html.
Rodar: python prototipo/tools/patch_guerreiro_kit_novo.py   (idempotente: nao aplica de novo o que ja esta)."""
import os
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, ".."))
F = '<rect x="1.5" y="1.5" width="29" height="29" rx="4" fill="#0b121e" stroke="#2c3d55" stroke-width="1.2"/>'
ICONES = {
 "w_investida": F + '<polyline points="3,12 10,12" stroke="#ff6a3a" stroke-width="1.4"/><polyline points="2,17 11,17" stroke="#ff8a4a" stroke-width="1.2"/><polyline points="4,22 9,22" stroke="#ff6a3a" stroke-width="1"/><polygon points="9,19 24,8 27,9 26,12 11,23" fill="#cfd8e6"/><polygon points="9,19 11,23 8,25 6,22" fill="#ffb04a"/><polygon points="26,5 27,8 30,9 27,10 26,13 25,10 22,9 25,8" fill="#ffe082"/>',
 "w_contra": F + '<polygon points="16,4 26,16 16,28 6,16" fill="none" stroke="#ffe082" stroke-width="1.8"/><polygon points="16,8 22,16 16,24 10,16" fill="#3a2c10"/><polygon points="9,24 22,9 24,10 23,12 11,26" fill="#cfd8e6"/><polygon points="16,13 17,15 19,16 17,17 16,19 15,17 13,16 15,15" fill="#fff6d8"/>',
 "w_tufao": F + '<polygon points="16,16 27,9 26,13" fill="#d8201a"/><polygon points="16,16 9,26 13,26" fill="#ff6a3a"/><polygon points="16,16 6,8 7,12" fill="#e0402a"/><polygon points="14,15 25,12 26,14 15,17" fill="#cfd8e6"/><polygon points="16,13 17,15 19,16 17,17 16,19 15,17 13,16 15,15" fill="#ffe082"/>',
 "w_modo": F + '<polygon points="16,3 18,7 18,22 14,22 14,7" fill="#cfd8e6"/><polygon points="12,22 20,22 20,24 12,24" fill="#ffb04a"/><polygon points="15,24 17,24 17,29 15,29" fill="#8a6a40"/><polyline points="9,20 11,14 9,8" fill="none" stroke="#ff4a1a" stroke-width="1.6"/><polyline points="23,20 21,14 23,8" fill="none" stroke="#ff4a1a" stroke-width="1.6"/><polyline points="6,18 7,12 6,7" fill="none" stroke="#ff8a3a" stroke-width="1"/><polyline points="26,18 25,12 26,7" fill="none" stroke="#ff8a3a" stroke-width="1"/>',
 "w_execucao": F + '<polyline points="6,8 26,24" stroke="#ff4a2a" stroke-width="1.8"/><polyline points="26,8 6,24" stroke="#ff8a3a" stroke-width="1.6"/><polyline points="16,4 16,28" stroke="#fff0d0" stroke-width="2"/><polygon points="16,11 18,15 22,16 18,17 16,21 14,17 10,16 14,15" fill="#ffe082"/>',
 "w_lancador": F + '<polygon points="15,27 15,9 17,6 19,9 19,27" fill="#cfd8e6"/><polyline points="6,14 10,9 14,14" fill="none" stroke="#ff6a3a" stroke-width="1.6"/><polyline points="18,14 22,9 26,14" fill="none" stroke="#ff6a3a" stroke-width="1.6"/><polyline points="4,28 9,24 12,28 16,25 20,28 23,24 28,28" fill="none" stroke="#ffb04a" stroke-width="1.2"/>',
 "w_fenda": F + '<polygon points="14,3 18,3 18,17 16,21 14,17" fill="#cfd8e6"/><polygon points="12,3 20,3 20,5 12,5" fill="#ffb04a"/><polyline points="16,21 14,24 17,26 15,29" fill="none" stroke="#ff6a14" stroke-width="2"/><polyline points="16,23 9,27 5,26" fill="none" stroke="#ff8a3a" stroke-width="1.2"/><polyline points="17,24 23,27 27,26" fill="none" stroke="#ff8a3a" stroke-width="1.2"/>',
}
SONS = ("w_n0_swing:function(){return smp('fatal_strike_shot',.45,1.3)||smp(F.las,.3,1.2);},w_n0_hit:function(){return smp('power_strike_shot',.7,1.2)||smp(F.gH,.6,1.1);},"
        "w_n1_swing:function(){return smp('shieldstun_shot',.45,1.1)||smp(F.las,.3,1);},w_n1_hit:function(){return smp('power_strike_shot',.75,1)||smp(F.gH,.7,1);},"
        "w_n2_swing:function(){return smp(L2.swordGreat,.5,.9)||smp(F.las,.3,1);},w_n2_hit:function(){return smp(L2.shing,.3,1.4)||smp(F.gL,.25,1.4);},"
        "w_n3_swing:function(){return smp('might_cast',.6,.9)||smp(F.las,.3,1);},w_n3_hit:function(){return smp('battle_roar_shot',.75,.95)||smp(F.gL,.5,1);},"
        "w_n4_swing:function(){return smp('fatal_strike_shot',.5,1.1)||smp(F.las,.3,1);},w_n4_hit:function(){return smp('power_strike_shot',.6,1.15)||smp(F.gH,.6,1.1);},"
        "w_n5_swing:function(){return smp(L2.swordGreat,.5,1)||smp(F.las,.3,1);},w_n5_hit:function(){return smp('baium_earthquake_shot',.55,1.15)||smp(F.gH,.7,1);},"
        "w_n6_swing:function(){return smp('shieldstun_shot',.5,.8)||smp(F.las,.3,.8);},w_n6_hit:function(){return (smp('baium_earthquake_shot',.85,.9)&&smp('fatal_strike_shot',.5,.9))||smp(F.gH,.9,.8);},")
ROUBO = "function rouboVida(an,d){var sk=an&&an.skill;return (sk&&sk.roubo&&d>0)?Math.max(1,Math.round(d*sk.roubo)):0;}/* [guerreiro] Tufao + Sede de Sangue: cura parte do dano causado (PvE) */\n"
MODO = ("  }else if(m.k==='modo'){/* [guerreiro] Modo de Batalha: buff so do proprio guerreiro */\n"
        "    var LM=m.l||[];if(window.Net&&LM.indexOf(Net.id)>=0){SUP.preceAte=now+(m.dur||15);SUP.atk=m.atk||.3;SUP.def=m.def||.1;floatText('MODO DE BATALHA','#ff5a20',22,'p');try{GuerreiroFX.hit('w_n3',S.px,S.pz,{rig:vrm,px:S.px,pz:S.pz,face:S.face});GuerreiroFX.modo(vrm,m.dur||15);}catch(_){}}\n"
        "    else{try{var pm=posDe(m.de);if(pm)GuerreiroFX.modoRemoto(pm.x,pm.z);}catch(_){}}SFX.play('w_n3_hit');\n")

def patch(nome):
    p = os.path.join(RAIZ, nome); s = open(p, encoding="utf8", newline="").read(); n0 = s
    def R(a, b, n=1):
        nonlocal s
        if b in s and a not in s: return
        assert s.count(a) == n, (nome, a[:70], s.count(a)); s = s.replace(a, b)
    R("/^w_s[1-6]$/.test(pose)", "/^w_[sn][0-9]$/.test(pose)")
    R("/^w_s/.test(", "/^w_[sn]/.test(", 5)
    R("var animRoot=!!an0&&((an0.skill&&an0.skill.armor)||", "var animRoot=!!an0&&((an0.skill&&an0.skill.armor&&!an0.skill.mover)||")      # Tufao: o jogador move o giro
    R("if(dr>0){S.php=Math.min(S.pmax,S.php+dr);floatText('+'+dr,'#7dff9a',20,'p');}", "dr+=rouboVida(an,dmg);if(dr>0){S.php=Math.min(S.pmax,S.php+dr);floatText('+'+dr,'#7dff9a',20,'p');}", 2)
    if "function rouboVida(" not in s:
        i = s.index("function damageMob(m,dmg,an){"); s = s[:i] + ROUBO + s[i:]
    if "m.k==='modo'" not in s:
        R("  }else if(m.k==='grito'){", MODO + "  }else if(m.k==='grito'){")
    R("sk.suporte.tipo==='grito'||!window.Net", "sk.suporte.tipo==='grito'||sk.suporte.tipo==='modo'||!window.Net")
    if "w_n0_swing:" not in s:
        i = s.index("    w_s1_swing:function(){"); s = s[:i] + "    " + SONS + "/* [guerreiro] kit novo */\n" + s[i:]
    if "w_investida:'" not in s:
        i = s.index("w_poderoso:'"); s = s[:i] + "".join("%s:'<svg width=\"32\" height=\"32\" viewBox=\"0 0 32 32\">%s</svg>'," % (k, v) for k, v in ICONES.items()) + s[i:]
    R('js/guerreiro_fx.js?v=2"', 'js/guerreiro_fx.js?v=4"')
    R("./js/guardiao.js?v=18'", "./js/guardiao.js?v=19'")
    if s != n0: open(p, "w", encoding="utf8", newline="").write(s)
    print(nome, "ok" if s != n0 else "sem mudanca")
# (15/11) reservas w_n* nas tabelas CM e POSE (raca sem os clipes do Blender) foram aplicadas a parte, na mesma sessao:
#   CM:   w_n0 slash2 lg 7 | w_n1 slash4 lg .6 | w_n2 boss_combo | w_n3 slash4 | w_n4 boss_combo lg 2.4 | w_n5 skill_ult lg 1.1 | w_n6 skill_wave
#   POSE: w_n0..w_n6 = {w:.9,e:-2.0,yw:.4,ye:-.4,lg:0,spin:false}
for n in ("arena.html", "cidade.html"): patch(n)
