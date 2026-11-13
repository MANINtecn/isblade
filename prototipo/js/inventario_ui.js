/* inventario_ui.js — Janela de Inventário Autêntica estilo Lineage 2 Interlude.
   Formato clássico vertical (300px): Abas [Inventory / Quest], Paperdoll anatômico no topo,
   Grade de Mochila 5 colunas x 8 linhas (40 slots com moldura oficial inventory_outline.png),
   Contador de Adena, botões de Lixeira e Receita no rodapé, e Tooltip clássico flutuante de ações. */
(function(){
  var U = window.InvUI = {}, sel = null, conf = '', css = false, aba = 'inv';
  var METAL = { sem: ['#c9d1de', '#6f7a8d'], D: ['#9fe6b8', '#3f8a5e'], C: ['#ffe08a', '#b8862a'] };
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  
  function tipoDe(b){
    if(!b) return 'item';
    if(b.slot === 'weapon') return b.weapon === 'shield' ? 'escudo' : (b.weapon === 'staff' ? 'cajado' : 'espada');
    return { helmet: 'elmo', chest: 'peito', gloves: 'luvas', boots: 'botas' }[b.slot] || 'item';
  }

  U.icone = function(b, o){
    o = o || {};
    var id = typeof b === 'string' ? b : (b && b.id);
    var t = typeof b === 'string' ? b : tipoDe(b);
    var tam = o.tam || 32;
    var iconKey = id || t;
    return '<img src="assets/icones/' + iconKey + '.png" width="' + tam + '" height="' + tam + '" alt="" style="display:block;border-radius:2px;object-fit:cover;pointer-events:none;" onerror="this.style.display=\'none\';"/>';
  };

  function estilo(){
    if(css) return; css = true;
    var s = document.createElement('style');
    s.textContent = [
      '#inv, #inv.invui{',
      '  position:fixed !important;left:50% !important;top:50% !important;transform:translate(-50%,-50%) !important;z-index:9000 !important;',
      '  width:300px !important;max-width:96vw !important;max-height:94vh !important;overflow-y:auto !important;overflow-x:hidden !important;',
      '  background:#0c0f18 url("assets/ui/InventoryBack.png") repeat !important;',
      '  border:2px solid #3c301c !important;border-radius:2px !important;',
      '  box-shadow:inset 0 0 0 1px #8a7038, inset 0 0 20px rgba(0,0,0,0.95), 0 16px 48px rgba(0,0,0,0.85) !important;',
      '  color:#eaf2ff !important;font-family:"Cinzel", Georgia, serif !important;padding:8px 10px !important;user-select:none !important;',
      '}',
      '#inv.open{display:block !important;}',
      '.invui-topo{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid rgba(138,112,56,0.3);padding-bottom:4px;}',
      '.invui-topo b{font-size:13px;letter-spacing:0.12em;color:#ffd166;text-shadow:0 1px 2px #000;}',
      '.invui-fechar{width:16px;height:16px;border:none;background:transparent url("assets/ui/TargetCloseButton.png") no-repeat center;cursor:pointer;outline:none;}',
      '.invui-fechar:hover, .invui-fechar:active{background-image:url("assets/ui/TargetCloseButton_click.png");}',
      '.invui-abas{display:flex;gap:4px;margin-bottom:8px;}',
      '.invui-tab{flex:1;height:24px;background:#151c2b;border:1px solid #3c301c;color:#8fa4c2;font:700 10.5px "Cinzel", Georgia, serif;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.12s ease;}',
      '.invui-tab.ativa{background:url("assets/ui/SystemWindowButton.png") no-repeat center / 100% 100%;color:#ffd166;border-color:#8a7038;text-shadow:0 1px 2px #000;}',
      '.invui-paperdoll{position:relative;width:280px;height:148px;margin:0 auto 10px;background:#090d16 url("assets/ui/inv_top_preview.png") no-repeat center / cover;border:1px solid #3c301c;box-shadow:inset 0 0 14px rgba(0,0,0,0.9);border-radius:2px;}',
      '.invui-sl{position:absolute;width:40px;height:40px;}',
      '.invui-sl[data-p=helmet]{left:120px;top:8px;}',
      '.invui-sl[data-p=weapon]{left:42px;top:54px;}',
      '.invui-sl[data-p=chest]{left:120px;top:54px;}',
      '.invui-sl[data-p=gloves]{left:198px;top:54px;}',
      '.invui-sl[data-p=boots]{left:120px;top:100px;}',
      '.invui-sub{font-size:10.5px;letter-spacing:0.08em;color:#d4af37;margin:4px 0 6px;font-weight:700;display:flex;justify-content:space-between;align-items:center;}',
      '.invui-grade{display:grid;grid-template-columns:repeat(5, 50px);gap:6px;justify-content:center;margin-bottom:10px;}',
      '.invui-cx{position:relative;width:50px;height:50px;cursor:pointer;background:#090c14 url("assets/ui/inventory_outline.png") no-repeat center / 100% 100%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 4px rgba(0,0,0,0.8);border-radius:2px;transition:all 0.1s ease;}',
      '.invui-cx.vz{opacity:0.45;}',
      '.invui-cx:hover{background-image:url("assets/ui/inventory_outline_over.png");}',
      '.invui-cx.sel{background-image:url("assets/ui/inventory_outline_over.png");filter:drop-shadow(0 0 4px #ffd166);}',
      '.invui-cx .en{position:absolute;right:3px;top:2px;font:800 10px system-ui,sans-serif;color:#7dff9a;text-shadow:0 1px 2px #000;}',
      '.invui-cx .gr{position:absolute;left:3px;bottom:2px;font:800 9px system-ui,sans-serif;text-shadow:0 1px 2px #000;}',
      '.invui-cx .q{position:absolute;right:3px;bottom:2px;font:800 10px system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000;}',
      '.invui-tooltip{margin-bottom:8px;padding:8px 10px;background:#090c14 url("assets/ui/TargetBack.png") repeat;border:1px solid #3c301c;border-radius:2px;box-shadow:inset 0 0 8px rgba(0,0,0,0.9);}',
      '.invui-tooltip b{display:block;font-size:12px;color:#ffd166;}',
      '.invui-tooltip small{display:block;font-size:10px;color:#8fa4c2;font-family:system-ui, sans-serif;margin-top:2px;}',
      '.invui-tooltip-bts{display:flex;gap:6px;margin-top:6px;}',
      '.invui-btn{flex:1;min-height:26px;background:url("assets/ui/SystemWindowButton.png") no-repeat center / 100% 100%;border:1px solid #3c301c;color:#f0e6c8;font:700 10.5px "Cinzel", Georgia, serif;cursor:pointer;text-shadow:0 1px 2px #000;border-radius:2px;transition:all 0.12s ease;}',
      '.invui-btn:hover:not(:disabled){background-image:url("assets/ui/SystemWindowButton_click.png");color:#ffffff;border-color:#d4af37;}',
      '.invui-btn:disabled{opacity:0.35;cursor:default;}',
      '.invui-btn.pe{color:#ff9a9a;filter:hue-rotate(330deg);}',
      '.invui-rodape{display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid rgba(138,112,56,0.3);font-size:11px;color:#ffd166;font-family:system-ui, sans-serif;}',
      '.invui-rodape .ad{display:flex;align-items:center;gap:4px;font-weight:700;}',
      '.invui-rodape .icones-acao{display:flex;gap:6px;}',
      '.invui-rodape .icones-acao img{cursor:pointer;opacity:0.8;transition:opacity 0.15s ease;}',
      '.invui-rodape .icones-acao img:hover{opacity:1.0;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  U.render = function(box, E, op){
    estilo();
    if(box && box.classList) box.classList.add('invui');
    var G = (E.itm && E.itm.graus) || { sem: { name: 'Sem grau', css: '#c9d1de' }, D: { name: 'Grau D', css: '#9fe6b8' }, C: { name: 'Grau C', css: '#ffe08a' } };
    var R = (E.itm && E.itm.rarities) || {};
    var base = function(id){ return (E.itm && E.itm.bases && E.itm.bases[id]) || null; };
    var acha = function(uidOrIt){
      if(!uidOrIt) return null; if(typeof uidOrIt === 'object') return uidOrIt;
      for(var k in E.inv.equip) if(E.inv.equip[k] && E.inv.equip[k].uid === uidOrIt) return E.inv.equip[k];
      for(var i = 0; i < E.inv.items.length; i++) if(E.inv.items[i].uid === uidOrIt) return E.inv.items[i];
      return null;
    };
    var eqUid = {}; for(var k in E.inv.equip) if(E.inv.equip[k]) eqUid[E.inv.equip[k].uid] = k;

    function caixa(it, extra){
      if(!it) return '<div class="invui-cx vz"' + (extra || '') + '></div>';
      var b = base(it.base), r = R[it.rar] || {}, g = G[(b && b.grau) || 'sem'] || {};
      return '<div class="invui-cx' + (sel === it.uid ? ' sel' : '') + '" data-u="' + esc(it.uid) + '" title="' + esc(op.nome(it)) + '" style="box-shadow:inset 0 0 10px ' + (r.css || '#000') + '55">' + U.icone(b, { tam: 32 }) +
        ((it.en | 0) ? '<span class="en">+' + (it.en | 0) + '</span>' : '') + ((b && b.grau && b.grau !== 'sem') ? '<span class="gr" style="color:' + (g.css || '#fff') + '">' + esc(b.grau) + '</span>' : '') + '</div>';
    }

    var h = [
      '<div class="invui-topo">',
      '  <b>INVENTORY</b>',
      '  <button type="button" class="invui-fechar" data-a="fechar" title="Fechar (I)"></button>',
      '</div>',
      '<div class="invui-abas">',
      '  <div class="invui-tab ' + (aba === 'inv' ? 'ativa' : '') + '" data-a="tab-inv">Inventory</div>',
      '  <div class="invui-tab ' + (aba === 'quest' ? 'ativa' : '') + '" data-a="tab-quest">Quest</div>',
      '</div>'
    ];

    if(aba === 'inv'){
      // 1. Paperdoll anatômico Lineage 2
      h.push('<div class="invui-paperdoll">');
      ['helmet', 'weapon', 'chest', 'gloves', 'boots'].forEach(function(s){
        h.push('<div class="invui-sl" data-p="' + s + '">' + caixa(acha(E.inv.equip[s]), 'data-vs="' + s + '"') + '</div>');
      });
      h.push('</div>');

      // 2. Tooltip de ações para item selecionado
      if(sel){
        var it = acha(sel);
        if(it){
          var b = base(it.base), r = R[it.rar] || {}, g = G[(b && b.grau) || 'sem'] || {};
          var slotEq = eqUid[it.uid];
          var falta = (b && b.grau && b.grau !== 'sem' && (E.lvl || 1) < (g.lvlMin || 0));
          h.push(
            '<div class="invui-tooltip">',
            '  <b style="color:' + (r.css || '#ffd166') + '">' + esc(op.nome(it)) + ((it.en | 0) ? ' +' + (it.en | 0) : '') + '</b>',
            '  <small>' + esc(r.name || 'Comum') + ' · ' + esc(g.name || 'Sem Grau') + '</small>',
            '  <small style="color:#d4af37">' + esc(op.statsDe ? statTxt(op.statsDe(it)) : '') + '</small>',
            '  <div class="invui-tooltip-bts">',
            (slotEq ? (slotEq === 'weapon' ? '<button type="button" class="invui-btn" disabled>EQUIPADO</button>' : '<button type="button" class="invui-btn" data-a="tirar" data-v="' + slotEq + '">TIRAR</button>') : '<button type="button" class="invui-btn" data-a="equip" data-v="' + esc(it.uid) + '"' + (falta ? ' disabled' : '') + '>EQUIPAR</button>'),
            (slotEq ? '' : '<button type="button" class="invui-btn pe" data-a="desc" data-v="' + esc(it.uid) + '">' + (conf === it.uid ? 'CONFIRMAR' : 'DESCARTAR') + '</button>'),
            '  </div>',
            '</div>'
          );
        }
      }

      // 3. Grade de 40 slots (5 colunas x 8 linhas)
      var maxSlots = 40;
      var bagItens = E.inv.items.filter(function(i){ return !eqUid[i.uid]; });
      h.push(
        '<div class="invui-sub">',
        '  <span>MOCHILA</span>',
        '  <span>' + bagItens.length + ' / ' + maxSlots + '</span>',
        '</div>',
        '<div class="invui-grade">'
      );
      for(var i = 0; i < maxSlots; i++){
        var it = bagItens[i] || null;
        h.push(caixa(it));
      }
      h.push('</div>');
    } else {
      // Aba Quest
      h.push(
        '<div style="min-height:220px;padding:20px;text-align:center;font-size:11px;color:#8fa4c2;">',
        '  Nenhum item de missão no momento.',
        '</div>'
      );
    }

    // Rodapé autêntico do L2: Adena, Lixeira e Receita
    h.push(
      '<div class="invui-rodape">',
      '  <div class="ad">',
      '    <img src="assets/icones/adena.png" width="16" height="16" alt="Adena">',
      '    <span>' + (E.adena | 0).toLocaleString('pt-BR') + '</span>',
      '  </div>',
      '  <div class="icones-acao">',
      '    <img src="assets/ui/inventory_recipe.png" width="20" height="20" title="Livro de Receitas" alt="Receitas">',
      '    <img src="assets/ui/inventory_trash.png" width="20" height="20" title="Lixeira" alt="Lixeira">',
      '  </div>',
      '</div>'
    );

    box.innerHTML = h.join('');
    box.onclick = function(ev){
      var t = ev.target.closest('[data-a],[data-u]'); if(!t || !box.contains(t)) return; ev.stopPropagation();
      var a = t.getAttribute('data-a'), v = t.getAttribute('data-v');
      if(a === 'fechar'){ sel = null; conf = ''; op.fechar(); return; }
      if(a === 'tab-inv'){ aba = 'inv'; U.render(box, E, op); return; }
      if(a === 'tab-quest'){ aba = 'quest'; U.render(box, E, op); return; }
      if(a === 'equip'){ op.equip(v); sel = null; conf = ''; return; }
      if(a === 'tirar'){ op.tirar(v); sel = null; conf = ''; return; }
      if(a === 'desc'){
        if(conf === v){ op.descartar(v); sel = null; conf = ''; return; }
        conf = v; U.render(box, E, op); return;
      }
      var u = t.getAttribute('data-u');
      if(u){
        if(sel === u && window.matchMedia && matchMedia('(pointer:fine)').matches){
          var item = acha(u); if(item){ if(eqUid[item.uid]) op.tirar(eqUid[item.uid]); else op.equip(item.uid); sel = null; conf = ''; return; }
        }
        sel = u; conf = ''; U.render(box, E, op); return;
      }
    };
  };

  function statTxt(st){
    if(!st) return '';
    var out = [];
    if(st.hp) out.push('Vida +' + st.hp);
    if(st.pAtk) out.push('P.Atk +' + st.pAtk);
    if(st.mAtk) out.push('M.Atk +' + st.mAtk);
    if(st.pDef) out.push('P.Def +' + st.pDef);
    if(st.mDef) out.push('M.Def +' + st.mDef);
    if(st.crit) out.push('Crit +' + st.crit);
    return out.join(' · ');
  }
})();
