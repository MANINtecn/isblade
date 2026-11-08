/* Graus de equipamento (data/itens.json -> graus, conjunto): modelo da arma pelo grau + bonus de set + texto de grau.
   Uso na pagina (arena.html / cidade.html):
     ArmaGrau.aplica(rig, base, attachL2Item)  -> troca o modelo da arma do personagem L2 pelo 'modelo' da base equipada
        (espada: Weapon_R_Bone; escudo: Shield_L_Bone; cajado: Weapon_R_Bone). Base sem 'modelo' = volta o modelo original.
     ArmaGrau.conjunto(ITM, equip, baseOf, findItem) -> {grau, vida, dano} do set completo (elmo, peitoral, luvas e botas do mesmo grau) ou null
     ArmaGrau.tag(ITM, base, nivel) -> HTML curto "Grau D · Nv 20" (vermelho se o nivel do personagem nao alcanca) */
(function(){
  var A = window.ArmaGrau = {};
  function filhoGrau(holder, attach, url){
    if(!holder._orig){ holder._orig = holder.children.slice(); }
    if(holder._grauUrl === url) return;
    holder._grauUrl = url;
    if(holder._grau){ holder.remove(holder._grau); holder._grau = null; }
    holder._orig.forEach(function(c){ c.visible = !url; });
    if(!url) return;
    var g = attach(holder, null, url, { isL2: true });
    holder._grau = g;
  }
  A.aplica = function(rig, base, attach){
    if(!rig || !rig.isL2 || !rig.root || !attach) return;
    var w = base && base.weapon, url = (base && base.modelo) || null;
    /* espada de duas maos */
    if(rig.swd2h) filhoGrau(rig.swd2h, attach, w === 'sword' ? url : null);
    /* escudo do guardiao */
    if(rig.shd) filhoGrau(rig.shd, attach, w === 'shield' ? url : null);
    /* cajado do mago: o personagem L2 nao tinha cajado na mao; cria o suporte na mao direita */
    if(w === 'staff' && url && !rig.stfL2){
      rig.stfL2 = attach(rig.root, 'Weapon_R_Bone', url, { isL2: true });
      rig.stfL2._grauUrl = url; rig.stfL2._orig = [];
    } else if(rig.stfL2 && w === 'staff' && url && rig.stfL2._grauUrl !== url){
      var bone = rig.stfL2.parent; if(bone) bone.remove(rig.stfL2);
      rig.stfL2 = attach(rig.root, 'Weapon_R_Bone', url, { isL2: true }); rig.stfL2._grauUrl = url; rig.stfL2._orig = [];
    }
    if(rig.stfL2) rig.stfL2.visible = (w === 'staff' && !!url);
  };
  A.conjunto = function(ITM, equip, baseOf, findItem){
    var C = ITM && ITM.conjunto; if(!C || !equip) return null;
    var g = null;
    for(var i = 0; i < C.pecas.length; i++){
      var it = findItem(equip[C.pecas[i]]), b = it && baseOf(it.base); if(!b) return null;
      var gb = b.grau || 'sem'; if(g === null) g = gb; else if(g !== gb) return null;
    }
    var B = C[g]; if(!B) return null;
    return { grau: g, vida: B.vida || 0, dano: B.dano || 0 };
  };
  A.info = function(ITM, b){ var G = ITM && ITM.graus, g = (b && b.grau) || 'sem'; return (G && G[g]) || { name: 'Sem grau', css: '#9aa4b8', nivel: 1 }; };
  A.tag = function(ITM, b, nivel){
    var G = A.info(ITM, b), falta = (G.nivel | 0) > (nivel | 0);
    return '<span style="color:' + G.css + '">' + G.name + '</span>' + ((G.nivel | 0) > 1 ? ' <span style="color:' + (falta ? '#ff6a5a' : '#9fb0cc') + '">Nv ' + G.nivel + '</span>' : '');
  };
})();
