/* inventario_ui.js — Interface Oficial 1:1 do Lineage 2 Interlude (Fiel ao interface.xdat & InventoryWnd.uc).
   Geometria nativa exata do XDAT: Janela 256x382 px, fundo L2UI_CH3.InventoryWnd.Inventory_Back,
   Coordenadas de slots milimétricas do XDAT original (Paperdoll 15 slots + Grade 6x4 de 24 slots visíveis). */
(function(){
  var U = window.InvUI = {}, sel = null, conf = '', css = false, aba = 'inv';
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Mapeamento dos 15 slots oficiais de equipamento do Lineage 2 (InventoryWnd.uc & 0046_InventoryWnd.xml)
  var XDAT_SLOTS = {
    hair:      { x: 14,  y: 16, name: 'Hair' },
    helmet:    { x: 53,  y: 16, name: 'Head' },
    hair2:     { x: 92,  y: 16, name: 'Hair2' },
    underwear: { x: 137, y: 16, name: 'Underwear' },
    neck:      { x: 176, y: 16, name: 'Neck' },
    weapon:    { x: 14,  y: 54, name: 'RHand' },
    chest:     { x: 53,  y: 54, name: 'Chest' },
    shield:    { x: 92,  y: 54, name: 'LHand' },
    rear:      { x: 137, y: 54, name: 'REar' },
    lear:      { x: 176, y: 54, name: 'LEar' },
    gloves:    { x: 14,  y: 92, name: 'Gloves' },
    legs:      { x: 53,  y: 92, name: 'Legs' },
    boots:     { x: 92,  y: 92, name: 'Feet' },
    rfinger:   { x: 137, y: 92, name: 'RFinger' },
    lfinger:   { x: 176, y: 92, name: 'LFinger' }
  };

  function tipoDe(b, it){
    var id = (b && (b.id || b.base)) || (it && it.base);
    if(id) return id;
    if(!b) return 'sword_long';
    if(b.slot === 'weapon') return b.weapon === 'shield' ? 'shield_guardian' : (b.weapon === 'staff' ? 'staff_arcane' : 'sword_long');
    var map = { helmet: 'helmet_iron', chest: 'chest_plate', gloves: 'gloves_hide', boots: 'boots_swift' };
    return map[b.slot] || b.id || 'sword_long';
  }

  U.icone = function(b, o){
    o = o || {};
    var id = typeof b === 'string' ? b : (b && (b.id || b.base));
    var t = typeof b === 'string' ? b : tipoDe(b);
    var tam = o.tam || 32;
    var iconKey = id || t || 'sword_long';
    return '<img src="assets/icones/' + iconKey + '.png" width="' + tam + '" height="' + tam + '" alt="" style="display:block;width:' + tam + 'px;height:' + tam + 'px;object-fit:cover;pointer-events:none;" onerror="this.onerror=null;this.src=\'assets/icones/sword_long.png\';"/>';
  };

  function estilo(){
    if(css) return; css = true;
    var s = document.createElement('style');
    s.textContent = [
      '#inv, #inv.invui{',
      '  position:fixed !important;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9000;',
      '  width:256px !important;height:382px !important;box-sizing:border-box !important;',
      '  background:transparent url("assets/ui/l2_inventory_bg_clean.png") no-repeat 0 0 / 256px 382px !important;',
      '  border:none !important;border-radius:0 !important;',
      '  box-shadow:0 12px 36px rgba(0,0,0,0.95), 0 0 1px rgba(0,0,0,0.8) !important;',
      '  padding:0 !important;margin:0 !important;overflow:visible !important;',
      '  color:#eaf2ff !important;font-family:Tahoma, Arial, sans-serif !important;user-select:none !important;pointer-events:all !important;',
      '  touch-action:none;',
      '}',
      '#inv.open{display:block !important;}',
      '.l2-inv-title{position:absolute;left:10px;top:2px;font:700 11px Tahoma,Arial,sans-serif;color:#e2d6b5;letter-spacing:0.04em;text-shadow:0 1px 2px #000;pointer-events:all;cursor:grab;}',
      '.l2-inv-title:active{cursor:grabbing;}',
      '.l2-inv-close{position:absolute;right:6px;top:4px;width:13px;height:13px;border:none;background:transparent url("assets/ui/TargetCloseButton.png") no-repeat center;cursor:pointer;outline:none;}',
      '.l2-inv-close:hover{background-image:url("assets/ui/TargetCloseButton_click.png");}',
      '.l2-inv-tab{position:absolute;top:139px;height:20px;line-height:20px;text-align:center;font:700 10px Tahoma,sans-serif;color:#8f9ba8;cursor:pointer;}',
      '.l2-inv-tab.tab-inv{left:12px;width:86px;}',
      '.l2-inv-tab.tab-quest{left:100px;width:86px;}',
      '.l2-inv-tab.ativa{color:#ffd166;text-shadow:0 1px 2px #000;}',
      '.l2-inv-count{position:absolute;right:16px;top:143px;font:700 9.5px Tahoma,sans-serif;color:#8fa4c2;}',
      '.l2-item-slot{position:absolute;width:32px;height:32px;box-sizing:border-box;cursor:pointer;background:transparent;}',
      '.l2-item-slot:hover::after{content:"";position:absolute;inset:-2px;background:url("assets/ui/inventory_outline_over.png") no-repeat center / 36px 36px;pointer-events:none;}',
      '.l2-item-slot.sel::after{content:"";position:absolute;inset:-2px;background:url("assets/ui/inventory_outline_over.png") no-repeat center / 36px 36px;filter:drop-shadow(0 0 3px #ffd166);pointer-events:none;}',
      '.l2-item-slot .en{position:absolute;right:1px;top:1px;font:800 9px Tahoma,sans-serif;color:#7dff9a;text-shadow:0 1px 2px #000;pointer-events:none;}',
      '.l2-item-slot .gr{position:absolute;left:1px;bottom:1px;font:800 8.5px Tahoma,sans-serif;text-shadow:0 1px 2px #000;pointer-events:none;}',
      '.l2-adena-txt{position:absolute;left:110px;top:336px;width:90px;text-align:right;font:700 11px Tahoma,Arial,sans-serif;color:#ffd166;text-shadow:0 1px 2px #000;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.l2-inv-recipe{position:absolute;left:14px;top:331px;width:34px;height:34px;cursor:pointer;background:transparent;}',
      '.l2-inv-trash{position:absolute;left:208px;top:331px;width:34px;height:34px;cursor:pointer;background:transparent;}',
      '.l2-inv-tooltip{position:absolute;left:262px;top:0;width:210px;padding:8px 10px;background:#090d16 url("assets/ui/TargetBack.png") repeat;border:1px solid #3c301c;border-radius:2px;box-shadow:0 8px 24px rgba(0,0,0,0.9), inset 0 0 0 1px #8a7038;z-index:9999;pointer-events:all;}',
      '.l2-inv-tooltip b{display:block;font-size:12px;color:#ffd166;font-family:"Cinzel", Georgia, serif;}',
      '.l2-inv-tooltip small{display:block;font-size:10px;color:#8fa4c2;margin-top:2px;}',
      '.l2-inv-tooltip-bts{display:flex;gap:4px;margin-top:8px;}',
      '.l2-inv-btn{flex:1;min-height:22px;background:url("assets/ui/SystemWindowButton.png") no-repeat center / 100% 100%;border:1px solid #3c301c;color:#f0e6c8;font:700 9.5px Tahoma, sans-serif;cursor:pointer;text-shadow:0 1px 2px #000;}',
      '.l2-inv-btn:hover:not(:disabled){background-image:url("assets/ui/SystemWindowButton_click.png");color:#fff;border-color:#d4af37;}',
      '.l2-inv-btn:disabled{opacity:0.35;cursor:default;}',
      '.l2-inv-btn.pe{color:#ff9a9a;filter:hue-rotate(330deg);}'
    ].join('\n');
    document.head.appendChild(s);
  }

  U.render = function(box, E, op){
    estilo();
    if(box && box.classList) box.classList.add('invui');
    var G = (E.itm && E.itm.graus) || { sem: { name: 'Sem grau', css: '#c9d1de' }, D: { name: 'Grau D', css: '#9fe6b8' }, C: { name: 'Grau C', css: '#ffe08a' } };
    var R = (E.itm && E.itm.rarities) || {};
    var base = function(id){
      if(!id) return null;
      if(E.itm && E.itm.bases){
        if(Array.isArray(E.itm.bases)){
          for(var bi = 0; bi < E.itm.bases.length; bi++){
            if(E.itm.bases[bi].id === id) return E.itm.bases[bi];
          }
        } else if(E.itm.bases[id]){
          return E.itm.bases[id];
        }
      }
      return null;
    };
    var acha = function(uidOrIt){
      if(!uidOrIt) return null;
      if(typeof uidOrIt === 'object') return uidOrIt;
      if(E.inv && Array.isArray(E.inv.items)){
        for(var i = 0; i < E.inv.items.length; i++){
          if(E.inv.items[i] && E.inv.items[i].uid === uidOrIt) return E.inv.items[i];
        }
      }
      return null;
    };
    var eqUid = {};
    if(E.inv && E.inv.equip){
      for(var k in E.inv.equip){
        var val = E.inv.equip[k];
        if(val){
          var itemUid = (typeof val === 'object' && val.uid) ? val.uid : String(val);
          eqUid[itemUid] = k;
        }
      }
    }

    var h = [
      '<div class="l2-inv-title">Inventory</div>',
      '<button type="button" class="l2-inv-close" data-a="fechar" title="Fechar (I)"></button>',
      '<div class="l2-inv-tab tab-inv ' + (aba === 'inv' ? 'ativa' : '') + '" data-a="tab-inv">Inventory</div>',
      '<div class="l2-inv-tab tab-quest ' + (aba === 'quest' ? 'ativa' : '') + '" data-a="tab-quest">Quest</div>'
    ];

    if(aba === 'inv'){
      // 1. PAPERDOLL OFICIAL LINEAGE 2: 15 Slots com posições exatas do interface.xdat
      for(var sKey in XDAT_SLOTS){
        var pos = XDAT_SLOTS[sKey];
        var eqIt = acha(E.inv.equip[sKey]);
        if(eqIt){
          var b = base(eqIt.base), r = R[eqIt.rar] || {}, g = G[(b && b.grau) || 'sem'] || {};
          var iconItem = b || eqIt.base || 'sword_long';
          h.push(
            '<div class="l2-item-slot' + (sel === eqIt.uid ? ' sel' : '') + '" draggable="true" data-u="' + esc(eqIt.uid) + '" data-slot="' + sKey + '" title="' + esc(op.nome(eqIt)) + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px;">' +
              U.icone(iconItem, { tam: 32 }) +
              ((eqIt.en | 0) ? '<span class="en">+' + (eqIt.en | 0) + '</span>' : '') +
              ((b && b.grau && b.grau !== 'sem') ? '<span class="gr" style="color:' + (g.css || '#fff') + '">' + esc(b.grau) + '</span>' : '') +
            '</div>'
          );
        }
      }

      // 2. GRADE DA MOCHILA (InventoryItem do XDAT: x=9, y=168, col=6, row=4, gapX=5, gapY=3)
      var bagItens = E.inv.items.filter(function(i){ return !eqUid[i.uid]; });

      // Inclui consumíveis do jogador (Soulshots, Poções) na mochila com ícones oficiais
      var consums = E.consum || window.CONSUM || {};
      var consumDefs = {
        soulshot: { name: 'Soulshot: No Grade', ico: 'soulshot', id: 'soulshot' },
        spiritshot: { name: 'Spiritshot: No Grade', ico: 'spiritshot', id: 'spiritshot' },
        pocao_vida: { name: 'Poção de Vida', ico: 'pocao_vida', id: 'pocao_vida' },
        pergaminho_res: { name: 'Pergaminho de Ressurreição', ico: 'pergaminho_res', id: 'pergaminho_res' },
        pergaminho_volta: { name: 'Pergaminho de Retorno', ico: 'pergaminho_volta', id: 'pergaminho_volta' }
      };
      for(var cKey in consumDefs){
        var qtd = consums[cKey];
        if(qtd !== undefined && qtd > 0){
          bagItens.push({
            uid: '__c_' + cKey,
            base: cKey,
            id: consumDefs[cKey].id,
            name: consumDefs[cKey].name,
            ico: consumDefs[cKey].ico,
            isConsum: true,
            qtd: qtd
          });
        }
      }

      h.push('<div class="l2-inv-count">' + bagItens.length + ' / 80</div>');

      var gx = 9, gy = 168;
      for(var idx = 0; idx < Math.min(24, bagItens.length); idx++){
        var it = bagItens[idx];
        var col = idx % 6;
        var row = Math.floor(idx / 6);
        var sx = gx + col * 37;
        var sy = gy + row * 35;
        if(it.isConsum){
          h.push(
            '<div class="l2-item-slot' + (sel === it.uid ? ' sel' : '') + '" draggable="true" data-u="' + esc(it.uid) + '" title="' + esc(it.name) + ' (x' + it.qtd + ')' + '" style="left:' + sx + 'px;top:' + sy + 'px;">' +
              '<img src="assets/icones/' + it.ico + '.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;pointer-events:none;" onerror="this.onerror=null;this.src=\'assets/icones/pocao_vida.png\';"/>' +
              '<span class="en" style="color:#ffd166;font-size:8px;">' + (it.qtd > 999 ? (it.qtd / 1000).toFixed(0) + 'k' : it.qtd) + '</span>' +
            '</div>'
          );
        } else {
          var b = base(it.base), r = R[it.rar] || {}, g = G[(b && b.grau) || 'sem'] || {};
          var iconItem = b || it.base || 'sword_long';
          h.push(
            '<div class="l2-item-slot' + (sel === it.uid ? ' sel' : '') + '" draggable="true" data-u="' + esc(it.uid) + '" title="' + esc(op.nome(it)) + '" style="left:' + sx + 'px;top:' + sy + 'px;">' +
              U.icone(iconItem, { tam: 32 }) +
              ((it.en | 0) ? '<span class="en">+' + (it.en | 0) + '</span>' : '') +
              ((b && b.grau && b.grau !== 'sem') ? '<span class="gr" style="color:' + (g.css || '#fff') + '">' + esc(b.grau) + '</span>' : '') +
            '</div>'
          );
        }
      }

      // 3. TOOLTIP / POPUP LATERAL DE AÇÕES DO ITEM SELECIONADO
      if(sel){
        if(sel.indexOf('__c_') === 0){
          var cKey = sel.replace('__c_', '');
          var cDef = consumDefs[cKey] || { name: cKey, ico: cKey, id: cKey };
          var qtdC = consums[cKey] || 1;
          h.push(
            '<div class="l2-inv-tooltip">',
            '  <b style="color:#ffd166">' + esc(cDef.name) + '</b>',
            '  <small>Consumível · Quantidade: ' + qtdC + '</small>',
            '  <div class="l2-inv-tooltip-bts">',
            '    <button type="button" class="l2-inv-btn" data-a="usar" data-v="' + esc(cDef.id) + '">USAR</button>',
            '  </div>',
            '</div>'
          );
        } else {
          var it = acha(sel);
          if(it){
            var b = base(it.base), r = R[it.rar] || {}, g = G[(b && b.grau) || 'sem'] || {};
            var slotEq = eqUid[it.uid];
            h.push(
              '<div class="l2-inv-tooltip">',
              '  <b style="color:' + (r.css || '#ffd166') + '">' + esc(op.nome(it)) + ((it.en | 0) ? ' +' + (it.en | 0) : '') + '</b>',
              '  <small>' + esc(r.name || 'Comum') + ' · ' + esc(g.name || 'Sem Grau') + '</small>',
              '  <small style="color:#d4af37">' + esc(op.statsDe ? statTxt(op.statsDe(it)) : '') + '</small>',
              '  <div class="l2-inv-tooltip-bts">',
              (slotEq ? (slotEq === 'weapon' ? '<button type="button" class="l2-inv-btn" disabled>EQUIPADO</button>' : '<button type="button" class="l2-inv-btn" data-a="tirar" data-v="' + slotEq + '">TIRAR</button>') : '<button type="button" class="l2-inv-btn" data-a="equip" data-v="' + esc(it.uid) + '">EQUIPAR</button>'),
              (slotEq ? '' : '<button type="button" class="l2-inv-btn pe" data-a="desc" data-v="' + esc(it.uid) + '">' + (conf === it.uid ? 'CONFIRMAR' : 'DESCARTAR') + '</button>'),
              '  </div>',
              '</div>'
            );
          }
        }
      }
    } else {
      // Aba Quest
      h.push(
        '<div style="position:absolute;left:14px;top:170px;width:228px;text-align:center;font-size:10px;color:#8fa4c2;">',
        '  Nenhum item de missão.',
        '</div>'
      );
    }

    // 4. RODAPÉ OFICIAL LINEAGE 2: Adena, Receita e Lixeira nas coordenadas do XDAT
    h.push(
      '<div class="l2-adena-txt">' + (E.adena | 0).toLocaleString('pt-BR') + '</div>',
      '<div class="l2-inv-recipe" title="Livro de Receitas (Crystallize / Recipe)"></div>',
      '<div class="l2-inv-trash" title="Lixeira (Descartar itens)"></div>'
    );

    box.innerHTML = h.join('');

    // Previne que cliques no inventário vazem para o mundo ou fechem a mira
    box.onpointerdown = function(ev){ ev.stopPropagation(); };
    box.onmousedown = function(ev){ ev.stopPropagation(); };

    // Drag & Drop de itens e consumíveis da mochila para a barra de atalhos (ShortcutWnd)
    box.ondragstart = function(ev){
      var t = ev.target.closest('.l2-item-slot'); if(!t) return;
      var u = t.getAttribute('data-u'); if(!u) return;
      var it = acha(u);
      var payload = null;
      if(it){
        var b = base(it.base);
        var iconKey = (b && b.id) || it.base || 'sword_long';
        payload = JSON.stringify({
          type: 'item',
          uid: it.uid,
          id: iconKey,
          base: it.base,
          name: op.nome(it),
          ico: 'assets/icones/' + iconKey + '.png'
        });
      } else if(u.indexOf('__c_') === 0){
        var cKey = u.replace('__c_', '');
        var def = consumDefs[cKey] || { name: cKey, ico: cKey, id: cKey };
        payload = JSON.stringify({
          type: 'item',
          id: def.id,
          name: def.name,
          ico: 'assets/icones/' + def.ico + '.png'
        });
      }
      if(payload){
        ev.dataTransfer.setData('text/plain', payload);
        ev.dataTransfer.setData('application/json', payload);
      }
    };

    // Eventos (Duplo clique / clique rápido para equipar/desequipar fiel ao InventoryWnd.uc)
    box.onclick = function(ev){
      var t = ev.target.closest('[data-a],[data-u]'); if(!t || !box.contains(t)) return; ev.stopPropagation();
      var a = t.getAttribute('data-a'), v = t.getAttribute('data-v');
      if(a === 'fechar'){ sel = null; conf = ''; op.fechar(); return; }
      if(a === 'tab-inv'){ aba = 'inv'; U.render(box, E, op); return; }
      if(a === 'tab-quest'){ aba = 'quest'; U.render(box, E, op); return; }
      if(a === 'equip'){ op.equip(v); sel = null; conf = ''; return; }
      if(a === 'tirar'){ op.tirar(v); sel = null; conf = ''; return; }
      if(a === 'usar'){ op.usar && op.usar(v); sel = null; conf = ''; return; }
      if(a === 'desc'){
        if(conf === v){ op.descartar(v); sel = null; conf = ''; return; }
        conf = v; U.render(box, E, op); return;
      }
      var u = t.getAttribute('data-u');
      if(u){
        if(sel === u){
          if(u.indexOf('__c_') === 0){
            var cKey = u.replace('__c_', '');
            op.usar && op.usar(cKey);
            sel = null; conf = ''; return;
          }
          // Segundo clique imediato: equipa se estiver na bolsa, desequipa se estiver equipado (como no L2)
          var item = acha(u);
          if(item){
            if(eqUid[item.uid]) op.tirar(eqUid[item.uid]);
            else op.equip(item.uid);
            sel = null; conf = ''; return;
          }
        }
        sel = u; conf = ''; U.render(box, E, op); return;
      }
    };

    // Duplo clique nativo: equipa da bolsa ou desequipa da Paperdoll imediatamente
    box.ondblclick = function(ev){
      var t = ev.target.closest('[data-u]');
      if(!t || !box.contains(t)) return;
      ev.stopPropagation();
      var u = t.getAttribute('data-u');
      if(u){
        if(u.indexOf('__c_') === 0){
          var cKey = u.replace('__c_', '');
          op.usar && op.usar(cKey);
          sel = null; conf = ''; return;
        }
        var item = acha(u);
        if(item){
          if(eqUid[item.uid]) op.tirar(eqUid[item.uid]);
          else op.equip(item.uid);
          sel = null; conf = ''; return;
        }
      }
    };
    if (window.L2Drag && typeof window.L2Drag.restore === 'function') {
      window.L2Drag.restore('inv');
    }
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
