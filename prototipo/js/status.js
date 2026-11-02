/* status.js — tela de STATUS do personagem (tecla U / botao "Status" do HUD): classe, nivel, XP, 4 atributos e pontos para distribuir.
   - Os numeros (nivel, xp, pontos, atributos) vem do SERVIDOR pela mensagem `prog` (guardada em window.S pelo jogo); aqui so se pede a distribuicao (Net.attr) e o reset (Net.attrReset).
   - Efeitos e nomes: data/progressao.json (mesma fonte do servidor). Reset de pontos e sempre gratis (decisao do dono). */
(function(){
  if(window.Status) return;
  var P = null, el = null, aberto = false, pend = { for: 0, int: 0, agi: 0, vit: 0 }, ATTRS = ['for', 'int', 'agi', 'vit'];
  var CSS = '#stp{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9500;width:min(520px,94vw);max-height:92vh;overflow:auto;background:rgba(8,14,28,.97);border:1.5px solid #f5c451;border-radius:12px;box-shadow:0 0 40px rgba(0,0,0,.9);color:#eaf1fb;font:13px system-ui,sans-serif;padding:14px 16px;display:none;user-select:none;-webkit-user-select:none}' +
    '#stp.on{display:block}#stp h3{margin:0;font:800 18px Cinzel,serif;color:#f5c451;letter-spacing:.06em}#stp .sub{color:#7fb6ff;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-top:2px}' +
    '#stp .xp{height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin:10px 0 2px}#stp .xp i{display:block;height:100%;background:linear-gradient(90deg,#5aa9ff,#f5c451)}#stp .xpt{font-size:11px;color:#8b9bb4}' +
    '#stp .pts{margin:12px 0 6px;padding:8px 10px;border-radius:8px;background:rgba(245,196,81,.12);border:1px solid rgba(245,196,81,.4);display:flex;justify-content:space-between;align-items:center;font-weight:700}#stp .pts b{color:#f5c451;font-size:18px}' +
    '#stp .row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)}#stp .row .nm{flex:1;min-width:0}#stp .row .nm b{display:block;font-size:14px}#stp .row .nm small{color:#8b9bb4;font-size:11px;line-height:1.35;display:block}' +
    '#stp .row .val{min-width:64px;text-align:right;font:800 18px system-ui;color:#f5c451}#stp .row .val em{font-style:normal;color:#7ee0a0;font-size:12px;margin-left:3px}' +
    '#stp button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);border-radius:8px;color:#fff;font:700 13px system-ui;min-width:38px;min-height:38px;cursor:pointer;padding:0 10px}#stp button:disabled{opacity:.35;cursor:default}' +
    '#stp button.pri{background:linear-gradient(135deg,#f5c451,#e5a720);color:#1a1200;border:0}#stp .foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#stp .foot button{flex:1 1 30%;min-height:42px}' +
    '#stp .aviso{margin-top:10px;font-size:11px;color:#ff9a9a}#stp .x{position:absolute;right:10px;top:8px;min-width:34px;min-height:34px}' +
    '#stBtn{position:fixed;z-index:60;left:10px;top:10px;display:none}';
  function css(){ if(document.getElementById('stpcss')) return; var s = document.createElement('style'); s.id = 'stpcss'; s.textContent = CSS; document.head.appendChild(s); }
  function carrega(cb){ if(P) return cb(); fetch('data/progressao.json?v=1').then(function(r){ return r.json(); }).then(function(j){ P = j; cb(); }).catch(function(){ P = { classes: {}, atributos: {}, efeitos: {} }; cb(); }); }
  function S(){ return window.S || {}; }
  function gastos(){ return ATTRS.reduce(function(a, k){ return a + pend[k]; }, 0); }
  function livres(){ return Math.max(0, (S().pontos | 0) - gastos()); }
  function efeito(k){
    var e = P.efeitos || {}, c = (P.classes || {})[S().classe] || {}, dano = c.danoAttr === k;
    if(k === 'for' || k === 'int') return dano ? '+' + e.danoPct + '% de dano por ponto (sua classe usa ' + (k === 'for' ? 'Força' : 'Inteligência') + ')' : 'Não aumenta o dano da sua classe';
    if(k === 'agi') return '+' + (e.corridaPorAgi * 100).toFixed(1) + '% de velocidade de corrida por ponto (máx +' + Math.round(e.corridaMax * 100) + '%)';
    return '+' + e.vidaPorVit + ' de vida, +' + e.defesaPorVit + '% de defesa e +' + e.estaminaPorVit + '% de regeneração de estamina por ponto';
  }
  function build(){
    css(); el = document.createElement('div'); el.id = 'stp'; document.body.appendChild(el);
    el.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('button'); if(!b) return; var a = b.getAttribute('data-a'), k = b.getAttribute('data-k');
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
    if(!el || !P) return; var s = S(), c = (P.classes || {})[s.classe] || {}, on = !!(window.Net && Net.on), st = s.atr || {}, base = c.inicial || {};
    var need = s.need || 1, pct = Math.min(100, Math.round((s.xp | 0) / need * 100)), h = '';
    h += '<button class="x" data-a="x" aria-label="Fechar">✕</button><h3>' + (c.nome || 'Personagem') + ' · Nv ' + (s.lvl || 1) + '</h3><div class="sub">' + (c.armaNome || '') + (s.max ? ' · nível máx ' + s.max : '') + '</div>';
    h += '<div class="xp"><i style="width:' + pct + '%"></i></div><div class="xpt">XP ' + (s.xp | 0) + ' / ' + need + ' (' + pct + '%)</div>';
    h += '<div class="pts"><span>Pontos para distribuir</span><b>' + livres() + '</b></div>';
    ATTRS.forEach(function(k){
      var meta = (P.atributos || {})[k] || { nome: k }, v = (st[k] | 0) + pend[k], extra = v - (base[k] | 0);
      h += '<div class="row"><div class="nm"><b>' + meta.nome + (c.principal === k ? ' ★' : '') + '</b><small>' + efeito(k) + '</small></div><div class="val">' + v + (pend[k] ? '<em>+' + pend[k] + '</em>' : '') + '</div>' +
        '<button data-a="menos" data-k="' + k + '"' + (pend[k] ? '' : ' disabled') + '>−</button>' +
        '<button data-a="mais" data-n="1" data-k="' + k + '"' + (livres() && on ? '' : ' disabled') + '>+</button>' +
        '<button data-a="mais" data-n="10" data-k="' + k + '"' + (livres() > 1 && on ? '' : ' disabled') + '>+10</button>' +
        '<button data-a="max" data-k="' + k + '"' + (livres() && on ? '' : ' disabled') + '>Máx</button></div>';
    });
    h += '<div class="foot"><button class="pri" data-a="ok"' + (gastos() && on ? '' : ' disabled') + '>Confirmar</button><button data-a="desfaz"' + (gastos() ? '' : ' disabled') + '>Desfazer</button><button data-a="reset"' + (on ? '' : ' disabled') + ' title="Devolve todos os pontos (grátis)">Resetar pontos (grátis)</button></div>';
    if(!on) h += '<div class="aviso">Sem conexão com o servidor: os pontos só podem ser distribuídos online.</div>';
    el.innerHTML = h;
  }
  window.Status = {
    toggle: function(f){
      carrega(function(){ if(!el) build(); aberto = (f === undefined) ? !aberto : !!f; el.classList.toggle('on', aberto);
        if(aberto){ try { document.exitPointerLock && document.exitPointerLock(); } catch(e){} pend = { for: 0, int: 0, agi: 0, vit: 0 }; render(); } });
    },
    refresh: function(){ if(aberto){ var tot = gastos(); if(tot > (S().pontos | 0)) pend = { for: 0, int: 0, agi: 0, vit: 0 }; render(); } },
    isOpen: function(){ return aberto; }
  };
})();
