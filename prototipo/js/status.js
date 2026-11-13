/* status.js — Tela de CHARACTER STATUS Autêntica estilo Lineage 2 (tecla U / botão "Status" do HUD).
   Utiliza as texturas originais extraídas de l2ui.utx e L2UI_CH3.utx do cliente Lineage 2 Interlude:
   statusback.png, statusEXP1.png, hpbar_back.png, SystemWindowButton.png e TargetCloseButton.png. */
(function(){
  if(window.Status) return;
  var P = null, el = null, aberto = false, pend = { for: 0, int: 0, agi: 0, vit: 0 }, ATTRS = ['for', 'int', 'agi', 'vit'];
  
  var CSS = [
    '#stp{',
    '  position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9500;',
    '  width:min(520px,94vw);max-height:92vh;overflow:auto;',
    '  background:#0c101a url("assets/ui/statusback.png") repeat;',
    '  border:2px solid #3c301c;border-radius:2px;',
    '  box-shadow:inset 0 0 0 1px #8a7038, inset 0 0 24px rgba(0,0,0,0.95), 0 16px 48px rgba(0,0,0,0.85);',
    '  color:#eaf2ff;font-family:"Cinzel", Georgia, serif;padding:14px 18px;display:none;',
    '  user-select:none;-webkit-user-select:none;',
    '}',
    '#stp.on{display:block}',
    '#stp .stp-hd{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(138,112,56,0.3);padding-bottom:10px;margin-bottom:12px;}',
    '#stp .stp-hd h3{margin:0;font-size:16px;letter-spacing:.16em;color:#ffd166;text-shadow:0 1px 3px #000;display:flex;align-items:center;gap:8px;}',
    '#stp .stp-hd .sub{color:#8fa4c2;font-size:11px;letter-spacing:.04em;font-family:system-ui, sans-serif;margin-top:2px;}',
    '#stp .x{width:16px;height:16px;flex-shrink:0;border:none;outline:none;background:transparent url("assets/ui/TargetCloseButton.png") no-repeat center;cursor:pointer;transition:transform 0.1s ease;}',
    '#stp .x:hover, #stp .x:active{background-image:url("assets/ui/TargetCloseButton_click.png");}',
    '#stp .xp-bloco{margin-bottom:12px;}',
    '#stp .xp-trilho{height:11px;border-radius:1px;background:#09090b url("assets/ui/hpbar_back.png") repeat-x center;border:1px solid #1a1a1f;box-shadow:inset 0 1px 4px rgba(0,0,0,0.95);position:relative;overflow:hidden;}',
    '#stp .xp-fill{height:100%;background:#1c72e6 url("assets/ui/statusEXP1.png") repeat-x center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.4);transition:width 0.2s ease;}',
    '#stp .xpt{font-size:10px;color:#8fa4c2;font-family:system-ui, sans-serif;display:flex;justify-content:space-between;margin-top:3px;}',
    '#stp .pts{margin:10px 0 12px;padding:8px 12px;border-radius:2px;background:#0b0f18 url("assets/ui/TargetBack.png") repeat;border:1px solid #3c301c;box-shadow:inset 0 0 0 1px #8a7038;display:flex;justify-content:space-between;align-items:center;font-family:system-ui, sans-serif;font-weight:700;}',
    '#stp .pts b{color:#ffd166;font-size:18px;font-family:"Cinzel", Georgia, serif;}',
    '#stp .sec-tit{font-size:11px;letter-spacing:.14em;color:#d4af37;margin:12px 0 6px;font-weight:700;border-bottom:1px solid rgba(138,112,56,0.25);padding-bottom:3px;}',
    '#stp .row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-family:system-ui, sans-serif;}',
    '#stp .row .nm{flex:1;min-width:0}',
    '#stp .row .nm b{display:block;font-size:13px;color:#fff;font-family:"Cinzel", Georgia, serif;letter-spacing:0.04em;}',
    '#stp .row .nm small{color:#8fa4c2;font-size:10.5px;line-height:1.3;display:block;margin-top:1px;}',
    '#stp .row .val{min-width:64px;text-align:right;font:800 17px system-ui;color:#ffd166}',
    '#stp .row .val em{font-style:normal;color:#7ee0a0;font-size:12px;margin-left:3px}',
    '#stp button{background:url("assets/ui/SystemWindowButton.png") no-repeat center / 100% 100%;border:1px solid #3c301c;border-radius:2px;color:#f0e6c8;font:700 11.5px "Cinzel", Georgia, serif;min-width:32px;min-height:28px;cursor:pointer;padding:0 8px;text-shadow:0 1px 2px #000;transition:all 0.12s ease;}',
    '#stp button:hover:not(:disabled){background-image:url("assets/ui/SystemWindowButton_click.png");color:#ffffff;border-color:#d4af37;}',
    '#stp button:disabled{opacity:.35;cursor:default}',
    '#stp button.pri{filter:brightness(1.2) sepia(0.3);font-weight:800;}',
    '#stp .stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;padding:6px 0 10px;font-family:system-ui, sans-serif;font-size:11.5px;}',
    '#stp .stats-grid div{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.05);padding:3px 0;}',
    '#stp .stats-grid span{color:#8fa4c2;}',
    '#stp .stats-grid b{color:#fff;}',
    '#stp .foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
    '#stp .foot button{flex:1 1 30%;min-height:36px;font-size:11.5px;letter-spacing:0.04em;}',
    '#stp .aviso{margin-top:10px;font-size:11px;color:#ff9a9a;font-family:system-ui, sans-serif;}',
    '#stBtn{position:fixed;z-index:60;left:10px;top:10px;display:none;}'
  ].join('\n');

  function css(){
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  }

  function carrega(cb){
    if(P) return cb && cb();
    fetch('data/progressao.json').then(function(r){ return r.json(); }).then(function(j){
      P = j; cb && cb();
    }).catch(function(){
      P = { atributos: { for: { nome: 'Força' }, int: { nome: 'Inteligência' }, agi: { nome: 'Agilidade' }, vit: { nome: 'Vitalidade' } } };
      cb && cb();
    });
  }

  function S(){
    try { if(window.Net && Net.getS) return Net.getS(); } catch(e){}
    try { if(typeof S !== 'undefined') return S; } catch(e){}
    return {};
  }

  function livres(){ return Math.max(0, (S().pontos | 0) - gastos()); }
  function gastos(){ return pend.for + pend.int + pend.agi + pend.vit; }

  function efeito(k){
    var e = (P && P.efeitos && P.efeitos[k]) || {};
    if(k === 'for') return '+' + e.danoPorFor + '% dano físico';
    if(k === 'int') return '+' + e.danoPorInt + '% dano mágico';
    if(k === 'agi') return '+' + e.critPorAgi + '% crítico e +' + e.recargaPorAgi + '% recarga';
    if(k === 'vit') return '+' + e.vidaPorVit + ' vida e +' + e.estaminaPorVit + '% regen. estamina';
    return '';
  }

  function build(){
    css(); el = document.createElement('div'); el.id = 'stp'; document.body.appendChild(el);
    el.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('button'); if(!b) return;
      var a = b.getAttribute('data-a'), k = b.getAttribute('data-k');
      if(a === 'x') return Status.toggle(false);
      if(a === 'mais'){ var n = Math.min(+b.getAttribute('data-n'), livres()); pend[k] += n; }
      else if(a === 'menos'){ pend[k] = Math.max(0, pend[k] - 1); }
      else if(a === 'max'){ pend[k] += livres(); }
      else if(a === 'desfaz'){ pend = { for: 0, int: 0, agi: 0, vit: 0 }; }
      else if(a === 'ok'){ if(gastos() > 0 && window.Net && Net.attr(pend)) pend = { for: 0, int: 0, agi: 0, vit: 0 }; }
      else if(a === 'reset'){ if(window.Net && Net.attrReset()) pend = { for: 0, int: 0, agi: 0, vit: 0 }; }
      render();
    });
  }

  function render(){
    if(!el || !P) return;
    var s = S(), c = (P.classes || {})[s.classe] || {}, on = !!(window.Net && Net.on), st = s.atr || {};
    var need = s.need || 1, pct = Math.min(100, Math.round((s.xp | 0) / need * 100));
    var pmax = s.pmax || s.maxhp || 100;
    var danoTotal = 100 + (s.st ? (s.st.dano || 0) : 0);
    var defTotal = s.st ? (s.st.defesa || 0) : 0;
    var estTotal = s.st ? (s.st.estamina || 0) : 0;

    var h = [
      '<div class="stp-hd">',
      '  <div>',
      '    <h3>🛡️ ' + (c.nome || 'Guerreiro') + ' · Nv ' + (s.lvl || 1) + '</h3>',
      '    <div class="sub">' + (c.armaNome || 'Combatente') + (s.max ? ' · Nível máx ' + s.max : '') + '</div>',
      '  </div>',
      '  <button class="x" data-a="x" title="Fechar (Esc / U)"></button>',
      '</div>',
      '<div class="xp-bloco">',
      '  <div class="xp-trilho"><div class="xp-fill" style="width:' + pct + '%"></div></div>',
      '  <div class="xpt"><span>EXPERIÊNCIA</span><span>' + (s.xp | 0).toLocaleString('pt-BR') + ' / ' + need.toLocaleString('pt-BR') + ' (' + pct + '%)</span></div>',
      '</div>',
      '<div class="pts"><span>PONTOS DISPONÍVEIS</span><b>' + livres() + '</b></div>',
      '<div class="sec-tit">ATRIBUTOS PRIMÁRIOS</div>'
    ];

    ATTRS.forEach(function(k){
      var meta = (P.atributos || {})[k] || { nome: k };
      var v = (st[k] | 0) + pend[k];
      h.push(
        '<div class="row">',
        '  <div class="nm"><b>' + meta.nome.toUpperCase() + (c.principal === k ? ' ★' : '') + '</b><small>' + efeito(k) + '</small></div>',
        '  <div class="val">' + v + (pend[k] ? '<em>+' + pend[k] + '</em>' : '') + '</div>',
        '  <button data-a="menos" data-k="' + k + '"' + (pend[k] ? '' : ' disabled') + '>−</button>',
        '  <button data-a="mais" data-n="1" data-k="' + k + '"' + (livres() && on ? '' : ' disabled') + '>+</button>',
        '  <button data-a="mais" data-n="10" data-k="' + k + '"' + (livres() > 1 && on ? '' : ' disabled') + '>+10</button>',
        '  <button data-a="max" data-k="' + k + '"' + (livres() && on ? '' : ' disabled') + '>Máx</button>',
        '</div>'
      );
    });

    h.push(
      '<div class="sec-tit">ESTATÍSTICAS DE COMBATE</div>',
      '<div class="stats-grid">',
      '  <div><span>P.Atk / Poder:</span><b>' + Math.round(danoTotal) + '%</b></div>',
      '  <div><span>Max HP / Vida:</span><b>' + Math.round(pmax) + '</b></div>',
      '  <div><span>P.Def / Defesa:</span><b>+' + Math.round(defTotal) + '%</b></div>',
      '  <div><span>Estamina / Regen:</span><b>+' + Math.round(estTotal) + '%</b></div>',
      '</div>',
      '<div class="foot">',
      '  <button class="pri" data-a="ok"' + (gastos() && on ? '' : ' disabled') + '>CONFIRMAR</button>',
      '  <button data-a="desfaz"' + (gastos() ? '' : ' disabled') + '>DESFAZER</button>',
      '  <button data-a="reset"' + (on ? '' : ' disabled') + ' title="Devolve todos os pontos (grátis)">RESETAR PONTOS</button>',
      '</div>'
    );

    if(!on) h.push('<div class="aviso">Sem conexão com o servidor: os pontos só podem ser distribuídos online.</div>');

    el.innerHTML = h.join('');
  }

  window.Status = {
    toggle: function(f){
      carrega(function(){
        if(!el) build();
        aberto = (f === undefined) ? !aberto : !!f;
        el.classList.toggle('on', aberto);
        if(aberto){
          try { document.exitPointerLock && document.exitPointerLock(); } catch(e){}
          pend = { for: 0, int: 0, agi: 0, vit: 0 };
          render();
        }
      });
    },
    refresh: function(){
      if(aberto){
        var tot = gastos();
        if(tot > (S().pontos | 0)) pend = { for: 0, int: 0, agi: 0, vit: 0 };
        render();
      }
    },
    isOpen: function(){ return aberto; }
  };
})();
