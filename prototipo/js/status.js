/* status.js — Tela de CHARACTER STATUS Autêntica estilo Lineage 2 (tecla U / botão "Status" do HUD).
   Moldura metálica chanfrada em bronze/ouro, brasão clássico, barra de XP 3D,
   distribuição de atributos e estatísticas de combate (P.Atk, P.Def, Vida, Estamina, Velocidade). */
(function(){
  if(window.Status) return;
  var P = null, el = null, aberto = false, pend = { for: 0, int: 0, agi: 0, vit: 0 }, ATTRS = ['for', 'int', 'agi', 'vit'];
  
  var CSS = [
    '#stp{',
    '  position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9500;',
    '  width:min(540px,94vw);max-height:92vh;overflow:auto;',
    '  background:linear-gradient(180deg, rgba(22,28,44,0.98) 0%, rgba(10,14,24,0.99) 100%);',
    '  border:2px solid #5a4828;border-radius:4px;',
    '  box-shadow:inset 0 0 0 1px #a4823e, inset 0 0 24px rgba(0,0,0,0.85), 0 16px 48px rgba(0,0,0,0.85);',
    '  color:#eaf2ff;font-family:"Cinzel", Georgia, serif;padding:14px 18px;display:none;',
    '  user-select:none;-webkit-user-select:none;',
    '}',
    '#stp.on{display:block}',
    '#stp .stp-hd{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(164,130,62,0.25);padding-bottom:10px;margin-bottom:12px;}',
    '#stp .stp-hd h3{margin:0;font-size:16px;letter-spacing:.16em;color:#ffd166;text-shadow:0 1px 3px #000;display:flex;align-items:center;gap:8px;}',
    '#stp .stp-hd .sub{color:#8fa4c2;font-size:11px;letter-spacing:.04em;font-family:system-ui, sans-serif;margin-top:2px;}',
    '#stp .x{width:22px;height:22px;border-radius:3px;background:rgba(0,0,0,0.45);border:1px solid #5a4828;color:#a4823e;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;transition:all 0.15s ease;}',
    '#stp .x:hover{background:#a4823e;color:#000;}',
    '#stp .xp-bloco{margin-bottom:12px;}',
    '#stp .xp-trilho{height:10px;border-radius:2px;background:#090d18;border:1px solid #4a3c20;box-shadow:inset 0 1px 4px rgba(0,0,0,0.95);position:relative;overflow:hidden;}',
    '#stp .xp-fill{height:100%;background:linear-gradient(90deg, #1c72e6 0%, #4facfe 50%, #facc15 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.4);transition:width 0.2s ease;}',
    '#stp .xpt{font-size:10px;color:#8fa4c2;font-family:system-ui, sans-serif;display:flex;justify-content:space-between;margin-top:3px;}',
    '#stp .pts{margin:10px 0 12px;padding:8px 12px;border-radius:3px;background:linear-gradient(180deg, rgba(35,48,75,0.7) 0%, rgba(14,20,32,0.85) 100%);border:1px solid #5a4828;box-shadow:inset 0 0 0 1px #8a6c32;display:flex;justify-content:space-between;align-items:center;font-family:system-ui, sans-serif;font-weight:700;}',
    '#stp .pts b{color:#ffd166;font-size:18px;font-family:"Cinzel", Georgia, serif;}',
    '#stp .sec-tit{font-size:11px;letter-spacing:.14em;color:#d4af37;margin:12px 0 6px;font-weight:700;border-bottom:1px solid rgba(164,130,62,0.18);padding-bottom:3px;}',
    '#stp .row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-family:system-ui, sans-serif;}',
    '#stp .row .nm{flex:1;min-width:0}',
    '#stp .row .nm b{display:block;font-size:13px;color:#fff;font-family:"Cinzel", Georgia, serif;letter-spacing:0.04em;}',
    '#stp .row .nm small{color:#8fa4c2;font-size:10.5px;line-height:1.3;display:block;margin-top:1px;}',
    '#stp .row .val{min-width:64px;text-align:right;font:800 17px system-ui;color:#ffd166}',
    '#stp .row .val em{font-style:normal;color:#7ee0a0;font-size:12px;margin-left:3px}',
    '#stp button{background:linear-gradient(180deg, #2a3a5c 0%, #121a2c 100%);border:1px solid #5a4828;box-shadow:inset 0 0 0 1px #8a6c32;border-radius:3px;color:#eaf2ff;font:700 12px system-ui;min-width:34px;min-height:30px;cursor:pointer;padding:0 8px;transition:all 0.15s ease;}',
    '#stp button:hover:not(:disabled){background:linear-gradient(180deg, #3d5485 0%, #1a253f 100%);border-color:#d4af37;}',
    '#stp button:disabled{opacity:.35;cursor:default}',
    '#stp button.pri{background:linear-gradient(180deg, #d4a017 0%, #8a6500 100%);border-color:#ffd166;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px rgba(212,160,23,0.4);font-weight:800;}',
    '#stp .stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;padding:6px 0 10px;font-family:system-ui, sans-serif;font-size:11.5px;}',
    '#stp .stats-grid div{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.05);padding:3px 0;}',
    '#stp .stats-grid span{color:#8fa4c2;}',
    '#stp .stats-grid b{color:#fff;}',
    '#stp .foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
    '#stp .foot button{flex:1 1 30%;min-height:38px;font-size:11.5px;letter-spacing:0.04em;}',
    '#stp .aviso{margin-top:10px;font-size:11px;color:#ff9a9a;font-family:system-ui, sans-serif;}',
    '#stBtn{position:fixed;z-index:60;left:10px;top:10px;display:none;}'
  ].join('\n');

  function css(){
    if(document.getElementById('stpcss')) return;
    var s = document.createElement('style'); s.id = 'stpcss'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function carrega(cb){
    if(P) return cb();
    fetch('data/progressao.json?v=1').then(function(r){ return r.json(); }).then(function(j){ P = j; cb(); }).catch(function(){ P = { classes: {}, atributos: {}, efeitos: {} }; cb(); });
  }

  function S(){ return window.S || {}; }
  function gastos(){ return ATTRS.reduce(function(a, k){ return a + pend[k]; }, 0); }
  function livres(){ return Math.max(0, (S().pontos | 0) - gastos()); }

  function efeito(k){
    var e = P.efeitos || {}, c = (P.classes || {})[S().classe] || {}, dano = c.danoAttr === k;
    if(k === 'for' || k === 'int') return dano ? '+' + e.danoPct + '% de dano por ponto (sua classe usa ' + (k === 'for' ? 'Força' : 'Inteligência') + ')' : 'Não afeta o dano principal';
    if(k === 'agi') return '+' + (e.corridaPorAgi * 100).toFixed(1) + '% vel. corrida por ponto (máx +' + Math.round(e.corridaMax * 100) + '%)';
    return '+' + e.vidaPorVit + ' vida, +' + e.defesaPorVit + '% defesa e +' + e.estaminaPorVit + '% regen. estamina';
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
    var s = S(), c = (P.classes || {})[s.classe] || {}, on = !!(window.Net && Net.on), st = s.atr || {}, base = c.inicial || {};
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
      '  <button class="x" data-a="x" title="Fechar (Esc / U)">✕</button>',
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