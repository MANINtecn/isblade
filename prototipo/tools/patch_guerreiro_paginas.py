"""Liga as skills do Guerreiro (js/guerreiro_fx.js, clipes w_s*, icones, sons, Grito como suporte) em arena.html e cidade.html.
Rodar uma vez:  python prototipo/tools/patch_guerreiro_paginas.py   (faz copia .antes_guerreiro; preserva CRLF/LF)"""
import os, re, shutil, sys
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

W = lambda pts, cor: '<polygon points="%s" fill="%s"/>' % (pts, cor)
def svg(inner): return '<svg width="32" height="32" viewBox="0 0 32 32"><rect x="1.5" y="1.5" width="29" height="29" rx="4" fill="#0b121e" stroke="#2c3d55" stroke-width="1.2"/>' + inner + '</svg>'
ICONES = {
  "w_poderoso": svg(W("6,5 9,4 23,19 20,22", "#cfd8e6") + W("19,19 25,25 22,28 16,22", "#ffb04a") + '<polyline points="9,27 13,24 16,28 20,25" stroke="#f0402a" stroke-width="2" fill="none"/>'),
  "w_atordoante": svg(W("16,3 19,7 19,19 16,22 13,19 13,7", "#cfd8e6") + '<rect x="9" y="21" width="14" height="2.4" fill="#ffb04a"/>' + '<polyline points="16,25 10,29 6,26" stroke="#f0402a" stroke-width="2" fill="none"/><polyline points="16,25 22,29 26,26" stroke="#f0402a" stroke-width="2" fill="none"/><polyline points="16,25 16,29" stroke="#f0402a" stroke-width="2" fill="none"/>' + W("6,8 8,5 10,8 8,11", "#ffe082") + W("22,9 24,6 26,9 24,12", "#ffe082")),
  "w_redemoinho": svg(''.join('<g transform="rotate(%d 16 16)">%s</g>' % (a, W("16,4 22,8 18,9 16,14", "#cfd8e6")) for a in (0, 90, 180, 270)) + W("14,14 16,12 18,14 16,16", "#f0402a")),
  "w_grito": svg(W("16,9 18.5,12 18.5,25 16,27 13.5,25 13.5,12", "#cfd8e6") + W("16,2 20,8 16,10 12,8", "#f0402a") + W("16,5 18,8 16,9 14,8", "#ffe082") + '<polyline points="6,9 3,14 6,19" stroke="#ffb04a" stroke-width="2" fill="none"/><polyline points="26,9 29,14 26,19" stroke="#ffb04a" stroke-width="2" fill="none"/><polyline points="9,11 7,14 9,17" stroke="#ffb04a" stroke-width="1.5" fill="none"/><polyline points="23,11 25,14 23,17" stroke="#ffb04a" stroke-width="1.5" fill="none"/>'),
  "w_furia": svg(W("16,2 23,14 16,27 9,14", "#f0402a") + W("16,6 19.5,14 16,22 12.5,14", "#ffe0a0") + '<polyline points="4,29 9,25 13,29 18,25 23,29 28,26" stroke="#ffb04a" stroke-width="2" fill="none"/>'),
}
SFX_SMP = '''    w_s1_swing:function(){return smp(L2.swordGreat,.5,1.0)||smp(F.las,.3,1);},
    w_s1_hit:function(){return smp('power_strike_shot',.7,1.1)||smp(F.gH,.6,1);},
    w_s3_swing:function(){return smp('shieldstun_shot',.5,.8)||smp(F.las,.3,.8);},
    w_s3_hit:function(){return (smp('baium_earthquake_shot',.7,1.1)&&smp('fatal_strike_shot',.5,.9))||smp(F.gH,.8,.8);},
    w_s4_swing:function(){return smp(L2.swordGreat,.5,.9)||smp(F.las,.3,1);},
    w_s4_hit:function(){return smp(L2.shing,.28,1.5)||smp(F.gL,.25,1.4);},
    w_s5_swing:function(){return smp('battle_roar_shot',.8,1)||smp('might_cast',.6,1);},
    w_s5_hit:function(){return smp('battle_roar_shot',.7,.9)||smp(F.gL,.5,1);},
    w_s6_swing:function(){return smp('fatal_strike_shot',.5,.8)||smp(F.las,.3,.8);},
    w_s6_hit:function(){return (smp('baium_earthquake_shot',.85,.9)&&smp('power_strike_shot',.7,.8))||smp(F.gH,.9,.8);},
'''
POSES = '''  w_s1:  {c:'slash2',    sp:1.5,hit:.30,cut:.80,lg:0},
  w_s3:  {c:'skill_wave',sp:1.9,hit:.55,cut:.75,lg:0},
  w_s4:  {c:'boss_combo',sp:2.4,hit:.18,cut:.70,lg:0},
  w_s5:  {c:'slash4',    sp:1.4,hit:.30,cut:.75,lg:0},
  w_s6:  {c:'skill_ult', sp:1.6,hit:.25,cut:.65,lg:0},
'''

def aplica(nome, cena):
    p = os.path.join(RAIZ, nome); s = open(p, encoding="utf8", newline="").read(); shutil.copy(p, p + ".antes_guerreiro")
    nl = "\r\n" if "\r\n" in s else "\n"
    def um(a, b, vezes=1):
        nonlocal s
        assert s.count(a) >= 1, nome + ": nao achei: " + a[:80]
        s = s.replace(a, b, vezes)
    um('<script src="js/clerigo_fx.js?v=3"></script>', '<script src="js/clerigo_fx.js?v=3"></script>' + nl + '<script src="js/guerreiro_fx.js?v=1"></script>')
    um('try{ClerigoFX.init(THREE,%s);}catch(_){}' % cena, 'try{ClerigoFX.init(THREE,%s);}catch(_){}try{GuerreiroFX.init(THREE,%s);}catch(_){}/* [guerreiro] */' % (cena, cena))
    um('if(window.ClerigoFX)ClerigoFX.tick(dt);', 'if(window.ClerigoFX)ClerigoFX.tick(dt);if(window.GuerreiroFX)GuerreiroFX.tick(dt);/* [guerreiro] */')
    um("from './js/guardiao.js?v=17'", "from './js/guardiao.js?v=18'")
    # sons
    a = "    c_s5_hit:function(){return smp('might_shot',.65,1) || smp(F.gL,.4,1);},"
    um(a, a + nl + SFX_SMP.replace("\n", nl).rstrip(nl))
    # icones
    um("var SKILL_ICONS={", "var SKILL_ICONS={" + nl + nl.join("%s:'%s'," % (k, v) for k, v in ICONES.items()))
    # poses de reserva (outras racas) e clipe proprio do Humano
    m = re.search(r"  c_s6:  \{c:'slash2',    sp:1\.5,hit:\.30,cut:\.80,lg:0\},\r?\n", s); assert m, nome + " c_s6"
    s = s[:m.end()] + POSES.replace("\n", nl) + s[m.end():]
    um("function getClipConfig(pose){", "function getClipConfig(pose){if(WPN==='sword'&&/^w_s[1-6]$/.test(pose)&&vrm&&vrm.wClips&&vrm.wClips[pose]&&vrm.clips&&vrm.clips[pose])return vrm.wClips[pose];/* [guerreiro] clipe do Blender (so Humano M) */")
    # efeitos
    um("burst(S.px, 1.3, S.pz, 12, 0x5aa9ff, 2.6);", "if(!(an&&an.skill&&/^w_s/.test(an.skill.pose)))burst(S.px, 1.3, S.pz, 12, 0x5aa9ff, 2.6);")
    um("spark(S.px, 1.4, S.pz, 2.0, 0xcfe6ff, 0.25);", "if(!(an&&an.skill&&/^w_s/.test(an.skill.pose)))spark(S.px, 1.4, S.pz, 2.0, 0xcfe6ff, 0.25);")
    um("  if(WPN==='shield'){Guardiao.fxSwing(an);return;}", "  if(WPN==='shield'){Guardiao.fxSwing(an);return;}" + nl + "  if(WPN==='sword'&&/^w_s/.test(sk.pose)&&window.GuerreiroFX){try{GuerreiroFX.swing(sk.pose,{px:S.px,pz:S.pz,face:S.face,rig:vrm,an:an});}catch(_){}return;}/* [guerreiro] */")
    um("  if(WPN==='shield'){Guardiao.fxHit(an,hx,hz);return;}", "  if(WPN==='shield'){Guardiao.fxHit(an,hx,hz);return;}" + nl + "  if(WPN==='sword'&&/^w_s/.test(sk.pose)&&window.GuerreiroFX){try{GuerreiroFX.hit(sk.pose,hx,hz,{px:S.px,pz:S.pz,face:S.face,rig:vrm,last:last,part:an.part,parts:an.parts});}catch(_){}return;}/* [guerreiro] */")
    um("if(!sk||!sk.pose)return;if(sk.suporte)return;", "if(!sk||!sk.pose)return;if(/^w_s/.test(sk.pose)&&window.GuerreiroFX){if(sk.pose!=='w_s5'){try{GuerreiroFX.remoto(sk.pose,{x:e.x,z:e.z,f:f});}catch(_){}}return;}/* [guerreiro] */if(sk.suporte)return;")
    # Grito de Guerra (suporte em area, como a Prece)
    um("sk.suporte.tipo==='prece'||!window.Net)return 0;", "sk.suporte.tipo==='prece'||sk.suporte.tipo==='grito'||!window.Net)return 0;")
    um("  }else if(m.k==='revini'){", "  }else if(m.k==='grito'){/* [guerreiro] Grito de Guerra: +ataque/+defesa em area */" + nl + "    var LG=m.l||[];if(window.Net&&LG.indexOf(Net.id)>=0){SUP.preceAte=now+(m.dur||8);SUP.atk=m.atk||.25;SUP.def=m.def||.15;floatText('GRITO DE GUERRA','#ff7a30',22,'p');}" + nl + "    try{GuerreiroFX.hit('w_s5',m.x,m.z,{px:m.x,pz:m.z});GuerreiroFX.grito(m.x,m.z,8,LG.map(function(id){return function(){return posDe(id);};}),m.dur||8);}catch(_){}SFX.play('w_s5_hit');" + nl + "  }else if(m.k==='revini'){")
    open(p, "w", encoding="utf8", newline="").write(s); print(nome, "ok", "CRLF" if nl == "\r\n" else "LF")

aplica("arena.html", "scene"); aplica("cidade.html", "FXCENA")
