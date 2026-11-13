/* Inventario com cara de Lineage 2 autêntico.
   Utiliza as texturas originais extraídas de L2UI_CH3.utx e l2ui.utx do cliente Lineage 2 Interlude:
   inventory_back.png, inventory_outline.png, inventory_outline_over.png,
   inventory_trash.png, SystemWindowButton.png, TargetCloseButton.png e adena.png.
   Uso (arena.html / cidade.html, dentro de renderInv): InvUI.render(caixa, estado, op)
     estado: { itm, inv: {items, equip}, st, pmax, conj, adena, srv, consum, lvl, lojaDados }
     op: { equip(uid), tirar(slot), descartar(uid), usar(id), fechar(), statsDe(it), nome(it) }
   InvUI.icone(baseOuId, opcoes) devolve o ícone oficial PNG com fallback para SVG. */
(function(){
  var U = window.InvUI = {}, sel = null, conf = '', css = false;
  var METAL = { sem: ['#c9d1de', '#6f7a8d'], D: ['#9fe6b8', '#3f8a5e'], C: ['#ffe08a', '#b8862a'] };
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* ---- icones (viewBox 40x40, so poligonos e linhas retas para fallback) ---- */
  function tipoDe(b){ if(!b) return 'item'; if(b.slot === 'weapon') return b.weapon === 'shield' ? 'escudo' : (b.weapon === 'staff' ? 'cajado' : 'espada'); return { helmet: 'elmo', chest: 'peito', gloves: 'luvas', boots: 'botas' }[b.slot] || 'item'; }
  var DESENHO = {
    espada: function(m, e){ return '<polygon points="31,4 36,9 15,30 10,25" fill="' + m + '" stroke="' + e + '" stroke-width="1.2"/><polygon points="33,6 34,7 14,27 13,26" fill="#ffffff" opacity=".55"/><polygon points="7,22 18,33 16,35 5,24" fill="' + e + '"/><polygon points="10,28 12,30 6,36 4,34" fill="#5a4630"/><polygon points="3,35 5,37 3,39 1,37" fill="' + e + '"/>'; },
    escudo: function(m, e){ return '<polygon points="20,3 34,8 33,22 20,37 7,22 6,8" fill="' + m + '" stroke="' + e + '" stroke-width="1.6"/><polygon points="20,7 30,10.5 29.4,21 20,32.5" fill="#000" opacity=".18"/><polyline points="20,8 20,32" stroke="' + e + '" stroke-width="2" fill="none"/><polyline points="10,15 30,15" stroke="' + e + '" stroke-width="2" fill="none"/>'; },
    cajado: function(m, e){ return '<polygon points="8,36 10,38 28,14 26,12" fill="#6b4f33" stroke="#3b2a18" stroke-width=".8"/><polygon points="30,2 37,9 32,16 25,9" fill="' + m + '" stroke="' + e + '" stroke-width="1.2"/><polygon points="30,5 34,9 31,13 27,9" fill="#ffffff" opacity=".5"/><polygon points="22,13 27,18 25,20 20,15" fill="' + e + '"/>'; },
    elmo: function(m, e){ return '<polygon points="20,4 31,9 34,22 31,33 24,35 24,26 16,26 16,35 9,33 6,22 9,9" fill="' + m + '" stroke="' + e + '" stroke-width="1.4"/><polygon points="11,18 29,18 28,21 12,21" fill="#0b1020"/><polyline points="20,5 20,17" stroke="' + e + '" stroke-width="1.6"/>'; },
    peito: function(m, e){ return '<polygon points="9,6 15,4 20,8 25,4 31,6 35,14 31,16 30,35 10,35 9,16 5,14" fill="' + m + '" stroke="' + e + '" stroke-width="1.4"/><polyline points="20,9 20,34" stroke="' + e + '" stroke-width="1.4"/><polyline points="12,20 28,20" stroke="' + e + '" stroke-width="1.2"/><polyline points="12,27 28,27" stroke="' + e + '" stroke-width="1.2"/>'; },
    luvas: function(m, e){ return '<polygon points="12,36 12,20 9,14 12,12 15,16 15,6 18,5 19,15 20,4 23,4 23,15 25,6 28,7 27,17 30,12 33,14 29,24 28,36" fill="' + m + '" stroke="' + e + '" stroke-width="1.3"/><polygon points="12,30 28,30 28,36 12,36" fill="' + e + '"/>'; },
    botas: function(m, e){ return '<polygon points="13,3 25,3 25,24 35,28 36,36 9,36 9,30 13,26" fill="' + m + '" stroke="' + e + '" stroke-width="1.4"/><polygon points="9,32 36,32 36,36 9,36" fill="' + e + '"/><polyline points="13,10 25,10" stroke="' + e + '" stroke-width="1.2"/>'; },
    pocao_vida: function(){ return '<polygon points="16,3 24,3 24,9 31,16 31,33 26,37 14,37 9,33 9,16 16,9" fill="#2a1418" stroke="#c9d1de" stroke-width="1.4"/><polygon points="11,20 29,20 29,32 25,35 15,35 11,32" fill="#e8343f"/><polygon points="13,22 17,22 15,32" fill="#ffffff" opacity=".35"/><polygon points="15,1 25,1 25,4 15,4" fill="#8a6a44"/>'; },
    pergaminho_volta: function(){ return '<polygon points="6,8 34,8 30,14 34,20 30,26 34,32 6,32 10,26 6,20 10,14" fill="#e9dcb8" stroke="#8a6a44" stroke-width="1.3"/><polygon points="14,15 26,15 22,20 26,25 14,25 18,20" fill="#3f8cff"/>'; },
    pergaminho_res: function(){ return '<polygon points="6,8 34,8 30,14 34,20 30,26 34,32 6,32 10,26 6,20 10,14" fill="#f3ecc8" stroke="#b8862a" stroke-width="1.3"/><polygon points="20,10 23,17 20,30 17,17" fill="#ffd977"/><polyline points="13,20 27,20" stroke="#7dffa8" stroke-width="1.6"/>'; },
    soulshot: function(){ return '<polygon points="20,3 31,17 20,37 9,17" fill="#ffd34d" stroke="#b8862a" stroke-width="1.3"/><polygon points="20,7 26,17 20,30" fill="#ffffff" opacity=".45"/>'; },
    spiritshot: function(){ return '<polygon points="20,3 31,17 20,37 9,17" fill="#5ab4ff" stroke="#2a5fb8" stroke-width="1.3"/><polygon points="20,7 26,17 20,30" fill="#ffffff" opacity=".45"/>'; },
    item: function(m, e){ return '<polygon points="20,4 34,20 20,36 6,20" fill="' + m + '" stroke="' + e + '" stroke-width="1.4"/>'; }
  };
  U.icone = function(b, o){
    o = o || {};
    var id = typeof b === 'string' ? b : (b && b.id);
    var t = typeof b === 'string' ? b : tipoDe(b);
    var g = (b && b.grau) || 'sem', M = METAL[g] || METAL.sem, f = DESENHO[t] || DESENHO.item;
    var tam = o.tam || 36;
    var iconKey = id || t;
    return '<img src="assets/icones/' + iconKey + '.png" width="' + tam + '" height="' + tam + '" alt="" style="display:block;border-radius:2px;object-fit:cover;" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'block\'"/><span style="display:none"><svg viewBox="0 0 40 40" width="' + tam + '" height="' + tam + '" aria-hidden="true">' + f(M[0], M[1]) + '</svg></span>';
  };
  function estilo(){
    if(css) return; css = true; var s = document.createElement('style');
    s.textContent =
      '#inv.invui{z-index:300;max-height:94vh;width:min(820px,96vw);padding:12px 16px;background:#0d111a url("assets/ui/InventoryBack.png") repeat;border:2px solid #3c301c;box-shadow:inset 0 0 0 1px #8a7038, inset 0 0 24px rgba(0,0,0,0.95), 0 16px 48px rgba(0,0,0,0.85);border-radius:2px;color:#eaf2ff;user-select:none}' +
      '.invui .hd{display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(138,112,56,0.3)}' +
      '.invui .hd b{font-family:"Cinzel", Georgia, serif;font-size:15px;letter-spacing:.16em;color:#ffd166;text-shadow:0 1px 3px #000}' +
      '.invui .hd .ad{margin-left:auto;color:#ffd166;font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px}' +
      '.invui .hd .l2-btn-fechar{width:16px;height:16px;flex-shrink:0;border:none;outline:none;background:transparent url("assets/ui/TargetCloseButton.png") no-repeat center;cursor:pointer;transition:transform 0.1s ease;}' +
      '.invui .hd .l2-btn-fechar:hover, .invui .hd .l2-btn-fechar:active{background-image:url("assets/ui/TargetCloseButton_click.png");}' +
      '.invui .lay{display:grid;grid-template-columns:250px 1fr;gap:16px}@media (max-width:700px){.invui .lay{grid-template-columns:1fr}}' +
      '.invui h3{font-family:"Cinzel", Georgia, serif;font-size:11px;letter-spacing:.16em;color:#d4af37;margin:0 0 8px;font-weight:700}' +
      '.invui .boneco{position:relative;height:250px;border:1px solid #3c301c;background:#090d15 url("assets/ui/inv_top_preview.png") no-repeat center / cover;border-radius:2px;box-shadow:inset 0 0 15px rgba(0,0,0,.85)}' +
      '.invui .silh{display:none}' +
      '.invui .sl{position:absolute;width:54px;height:54px}.invui .sl small{position:absolute;left:0;right:0;bottom:-14px;text-align:center;font-size:9px;letter-spacing:.08em;color:#8fa4c2;font-family:system-ui, sans-serif}' +
      '.invui .sl[data-p=helmet]{left:98px;top:8px}.invui .sl[data-p=weapon]{left:14px;top:96px}.invui .sl[data-p=chest]{left:98px;top:96px}.invui .sl[data-p=gloves]{left:182px;top:96px}.invui .sl[data-p=boots]{left:98px;top:176px}' +
      '.invui .cx{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;cursor:pointer;background:#0a0e17 url("assets/ui/inventory_outline.png") no-repeat center / 100% 100%;border:none;border-radius:2px;box-shadow:inset 0 0 6px rgba(0,0,0,.8);transition:all 0.12s ease}' +
      '.invui .cx.vz{opacity:.45}.invui .cx:hover{background-image:url("assets/ui/inventory_outline_over.png");}.invui .cx.sel{background-image:url("assets/ui/inventory_outline_over.png");filter:drop-shadow(0 0 4px #ffd166);}' +
      '.invui .cx .en{position:absolute;right:3px;top:2px;font:800 10px system-ui,sans-serif;color:#7dff9a;text-shadow:0 1px 2px #000}' +
      '.invui .cx .gr{position:absolute;left:3px;bottom:2px;font:800 9px system-ui,sans-serif;text-shadow:0 1px 2px #000}' +
      '.invui .cx .q{position:absolute;right:3px;bottom:2px;font:800 10px system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000}' +
      '.invui .grade{display:grid;grid-template-columns:repeat(8,minmax(0,50px));gap:5px}.invui .grade .cx{aspect-ratio:1/1;height:auto}' +
      '.invui .det{margin-top:12px;min-height:96px;padding:10px 12px;border:1px solid #3c301c;background:#0b0f18 url("assets/ui/TargetBack.png") repeat;border-radius:2px;box-shadow:inset 0 0 12px rgba(0,0,0,.85);display:flex;gap:12px}' +
      '.invui .det .tx{flex:1;min-width:0}.invui .det b{display:block;font-size:13px;font-family:"Cinzel", Georgia, serif}.invui .det small{display:block;color:#9fb0cc;font-size:11px;margin-top:2px}' +
      '.invui .det .bt{display:flex;flex-direction:column;gap:5px}' +
      '.invui .det button,.invui .cons button{pointer-events:auto;cursor:pointer;font:700 11px "Cinzel", Georgia, serif;letter-spacing:.04em;color:#f0e6c8;background:url("assets/ui/SystemWindowButton.png") no-repeat center / 100% 100%;border:1px solid #3c301c;border-radius:2px;padding:7px 12px;text-shadow:0 1px 2px #000;transition:all 0.12s ease}' +
      '.invui .det button:hover:not(:disabled),.invui .cons button:hover{background-image:url("assets/ui/SystemWindowButton_click.png");color:#ffffff;border-color:#d4af37}' +
      '.invui .det button.pe{color:#ffb3b3;filter:hue-rotate(330deg);}' +
      '.invui .det button:disabled{opacity:.35;cursor:default}' +
      '.invui .st{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin-top:10px;font-size:11px;color:#8fa4c2;font-family:system-ui,sans-serif}.invui .st div{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.05);padding:2px 0}.invui .st b{color:#eaf2ff}' +
      '.invui .cons{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:6px}.invui .cons .c1{display:flex;flex-direction:column;align-items:center}.invui .cons .cx{width:46px;height:46px}';
    document.head.appendChild(s);
  }
  var SILH = '<svg class="silh" viewBox="0 0 100 200" width="100" height="200" aria-hidden="true"><circle cx="50" cy="24" r="16" fill="#c9d1de"/><rect x="32" y="44" width="36" height="60" rx="4" fill="#c9d1de"/><rect x="18" y="48" width="10" height="50" rx="3" fill="#c9d1de"/><rect x="72" y="48" width="10" height="50" rx="3" fill="#c9d1de"/><rect x="34" y="108" width="13" height="65" rx="3" fill="#c9d1de"/><rect x="53" y="108" width="13" height="65" rx="3" fill="#c9d1de"/></svg>';
  U.render = function(box, E, op){
    estilo();
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
      if(!it) return '<div class="cx vz"' + (extra || '') + '></div>';
      var b = base(it.base), r = R[it.rar] || {}, g = G[(b && b.grau) || 'sem'] || {};
      return '<div class="cx' + (sel === it.uid ? ' sel' : '') + '" data-u="' + esc(it.uid) + '" title="' + esc(op.nome(it)) + '" style="box-shadow:inset 0 0 10px ' + (r.css || '#000') + '55">' + U.icone(b, { tam: 34 }) +
        ((it.en | 0) ? '<span class="en">+' + (it.en | 0) + '</span>' : '') + ((b && b.grau && b.grau !== 'sem') ? '<span class="gr" style="color:' + (g.css || '#fff') + '">' + esc(b.grau) + '</span>' : '') + '</div>';
    }
    var h = '<div class="hd"><b>INVENTÁRIO</b>' + (E.srv ? '<span class="ad"><img src="assets/icones/adena.png" width="16" height="16" style="vertical-align:middle;margin-right:2px;" alt="">' + (E.adena | 0).toLocaleString('pt-BR') + '</span>' : '<span class="ad"></span>') + '<button type="button" class="l2-btn-fechar" data-a="fechar" title="Fechar (I)"></button></div><div class="lay"><div>';
    h += '<h3>EQUIPAMENTO</h3><div class="boneco">';
    ['helmet', 'weapon', 'chest', 'gloves', 'boots'].forEach(function(s){ h += '<div class="sl" data-p="' + s + '">' + caixa(acha(E.inv.equip[s]), 'data-vs="' + s + '"') + '<small>' + esc((E.itm.slots[s] || s).toUpperCase()) + '</small></div>'; });
    h += '</div><div class="st"><div><span>Vida</span><b>' + E.pmax + '</b></div>';
    Object.keys(E.itm.stats).forEach(function(k){ if(k === 'vida') return; var v = Math.round(((E.st || {})[k] || 0) * 10) / 10; h += '<div><span>' + esc(E.itm.stats[k].name) + '</span><b>' + v + esc(E.itm.stats[k].unit) + '</b></div>'; });
    if(E.conj){ var gc = G[E.conj.grau] || {}; h += '<div><span style="color:' + (gc.css || '#fff') + '">Set ' + esc(gc.name || E.conj.grau) + '</span><b>+' + E.conj.vida + '% vida' + (E.conj.dano ? ' · +' + E.conj.dano + '% dano' : '') + '</b></div>'; }
    h += '</div></div><div>';
    var bag = E.inv.items.filter(function(i){ return !eqUid[i.uid]; }), max = E.itm.bagMax || 40;
    h += '<h3>MOCHILA (' + E.inv.items.length + '/' + max + ')</h3><div class="grade">';
    for(var i = 0; i < Math.max(max - Object.keys(eqUid).length, bag.length); i++) h += caixa(bag[i]);
    h += '</div>';
    /* detalhes do selecionado */
    var it = sel && acha(sel);
    if(it){
      var b = base(it.base), r = R[it.rar] || {}, g = G[(b && b.grau) || 'sem'] || { name: 'Sem grau', nivel: 1 }, falta = (g.nivel | 0) > (E.lvl | 0), slotEq = eqUid[it.uid];
      var st = op.statsDe(it), stx = Object.keys(st).map(function(k){ var d = E.itm.stats[k]; return (d ? d.name : k) + ' +' + st[k] + (d ? d.unit : ''); }).join(' · ');
      h += '<div class="det"><div class="cx" style="width:58px;height:58px;flex:none;">' + U.icone(b, { tam: 44 }) + '</div><div class="tx"><b style="color:' + (r.css || '#fff') + '">' + esc(op.nome(it)) + '</b>' +
        '<small>' + esc(r.name || it.rar) + ' · <span style="color:' + (g.css || '#9fb0cc') + '">' + esc(g.name) + '</span>' + ((g.nivel | 0) > 1 ? ' · <span style="color:' + (falta ? '#ff6a5a' : '#9fb0cc') + '">Nv ' + g.nivel + '</span>' : '') + ' · ' + esc((E.itm.slots[b.slot] || '')) + '</small><small>' + esc(stx) + '</small></div><div class="bt">' +
        (slotEq ? (slotEq === 'weapon' ? '<button type="button" disabled>EQUIPADO</button>' : '<button type="button" data-a="tirar" data-v="' + slotEq + '">TIRAR</button>') : '<button type="button" data-a="equip" data-v="' + esc(it.uid) + '"' + (falta ? ' disabled' : '') + '>EQUIPAR</button>') +
        (slotEq ? '' : '<button type="button" class="pe" data-a="desc" data-v="' + esc(it.uid) + '">' + (conf === it.uid ? 'CONFIRMAR' : 'DESCARTAR') + '</button>') + '</div></div>';
    } else h += '<div class="det"><small>Toque num item para ver os detalhes. ' + (window.matchMedia && matchMedia('(pointer:fine)').matches ? 'Clique duas vezes para equipar. ' : '') + 'A cor da borda é a raridade; D e C são o grau.</small></div>';
    /* consumiveis */
    var ks = Object.keys(E.consum || {}), LD = E.lojaDados;
    if(E.srv){ h += '<h3 style="margin-top:10px">CONSUMÍVEIS</h3><div class="cons">';
      if(!ks.length) h += '<small style="color:#7f8db0">Nada. Compre poções com o Galladucci ou o Mammon na cidade.</small>';
      ks.forEach(function(k){ var c = LD && LD.consumiveis[k], auto = !!(c && c.ss); h += '<div class="c1"><div class="cx" ' + (auto ? '' : 'data-usar="' + esc(k) + '"') + ' title="' + esc((c && c.nome) || k) + (auto ? ' (automático)' : ' (tocar = usar)') + '">' + U.icone(k, { tam: 32 }) + '<span class="q">' + E.consum[k] + '</span>' + (auto ? '<span class="gr" style="color:#7dff9a">A</span>' : '') + '</div></div>'; });
      h += '</div>'; }
    h += '</div></div>';
    box.innerHTML = h;
    box.onclick = function(ev){
      var t = ev.target.closest('[data-a],[data-u],[data-usar]'); if(!t || !box.contains(t)) return; ev.stopPropagation();
      var a = t.getAttribute('data-a'), v = t.getAttribute('data-v');
      if(a === 'fechar'){ sel = null; conf = ''; op.fechar(); return; }
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
      var us = t.getAttribute('data-usar'); if(us) op.usar(us);
    };
  };
})();
