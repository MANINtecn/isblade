/* Expedicao de entrada (tutorial rapido ate o nivel 20). Uma vez por personagem (localStorage 'isblade.expedicao.<id do personagem>'), pode pular.
   Uso na pagina:  Expedicao.init({ pagina: 'cidade' | 'arena', mapa: 'curuma' | 'fortress' | ... | null, S: function(){ return S; } });
                   Expedicao.ev('abate' | 'skill' | 'drop')   (ganchos no arena.html)
   Cada passo: texto + condicao. Passos de nivel se completam sozinhos (personagem antigo nao precisa refazer). */
(function(){
  var E = window.Expedicao = {}, op = null, el = null, passo = 0, conta = 0, t0 = 0, ini = null;
  var PASSOS = [
    { pg: 'cidade', txt: 'Ande pela cidade: <b>W A S D</b> (no celular, o joystick).', ok: function(s){ return ini && Math.hypot(s.px - ini[0], s.pz - ini[1]) > 6; } },
    { pg: 'cidade', txt: 'Abra o <b>inventario</b>: tecla <b>I</b> ou o botao I.', ev: 'inv', n: 1 },
    { pg: 'cidade', txt: 'Visite um <b>comerciante</b> (Galladucci ou Mammon): pocoes, soulshot e equipamento.', ok: function(){ return !!(window.Loja && Loja.aberta && Loja.aberta()); } },
    { pg: 'cidade', txt: 'Atravesse o <b style="color:#40ffa0">portal verde</b>: Torre de Cruma (niveis 1-15).', ok: function(){ return op.mapa === 'curuma'; }, sempre: 1 },
    { pg: 'arena', txt: 'Derrote <b>3 monstros</b>. Os mais fracos ficam perto da entrada.', ev: 'abate', n: 3 },
    { pg: 'arena', txt: 'Use uma <b>skill</b>: <b>Q</b>, <b>E</b> ou <b>R</b>.', ev: 'skill', n: 1 },
    { pg: 'arena', txt: 'Pegue seu primeiro <b>drop</b> (adena ou item).', ev: 'drop', n: 1 },
    { txt: 'Chegue ao <b>nivel 5</b>.', ok: function(s){ return (s.lvl | 0) >= 5; } },
    { txt: 'Chegue ao <b>nivel 15</b>. Mais longe da entrada = monstros mais fortes. Morrer fora da DG tira um pouco de XP (a partir do Nv 10).', ok: function(s){ return (s.lvl | 0) >= 15; } },
    { txt: 'Nivel 15: va para a <b>Fortaleza</b> (portal branco na cidade).', ok: function(s){ return op.mapa === 'fortress' || (s.lvl | 0) >= 20; } },
    { txt: 'Chegue ao <b>nivel 20</b>: o equipamento <b style="color:#7fd6a0">Grau D</b> libera (o Mammon vende).', ok: function(s){ return (s.lvl | 0) >= 20; } }
  ];
  function chave(){ var id = null; try { id = localStorage.getItem('isblade_active_character_id'); } catch(e){} return 'isblade.expedicao.' + (id || 'x'); }
  function le(){ try { return localStorage.getItem(chave()); } catch(e){ return null; } }
  function grava(v){ try { localStorage.setItem(chave(), String(v)); } catch(e){} }
  function monta(){
    if(el) return;
    var st = document.createElement('style');
    st.textContent = '#expBox{position:fixed;right:12px;top:184px;width:min(250px,56vw);z-index:60;pointer-events:auto;padding:9px 11px;border-radius:8px;background:linear-gradient(rgba(16,26,48,.9),rgba(6,10,20,.9));' +
      'box-shadow:inset 0 0 0 1px #5a7ea6,0 0 14px rgba(0,0,0,.6);color:#e4edf8;font:12px system-ui,sans-serif;line-height:1.35}#expBox .hd{display:flex;align-items:center;gap:6px;margin-bottom:5px;color:#f5c451;font-weight:700;letter-spacing:.12em;font-size:10px}' +
      '#expBox .hd span{margin-left:auto;color:#7f8db0;letter-spacing:0}#expBox button{font:inherit;font-size:10px;color:#9fb0cc;background:none;border:0;cursor:pointer;padding:0;margin-top:5px;text-decoration:underline}' +
      '#expBox .bar{height:3px;background:#1d2a48;margin-top:6px}#expBox .bar i{display:block;height:3px;background:#f5c451}#expBox.ok{box-shadow:inset 0 0 0 1px #7dff9a,0 0 14px rgba(125,255,154,.35)}';
    document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'expBox'; document.body.appendChild(el);
    el.addEventListener('click', function(e){
      var b = e.target.getAttribute && e.target.getAttribute('data-p'); if(!b) return; e.stopPropagation();
      if(b === '1'){ e.target.setAttribute('data-p', '2'); e.target.textContent = 'Tem certeza? Clique de novo para pular'; return; }
      grava('pulou'); el.style.display = 'none';
    });
  }
  function desenha(){
    if(!el) return; var P = PASSOS[passo]; if(!P){ el.style.display = 'none'; return; }
    var outra = P.pg && P.pg !== op.pagina && !P.sempre;
    el.style.display = 'block';
    el.innerHTML = '<div class="hd">EXPEDICAO DE ENTRADA<span>' + (passo + 1) + '/' + PASSOS.length + '</span></div><div>' + P.txt + (P.n > 1 ? ' <span style="color:#9fb0cc">(' + conta + '/' + P.n + ')</span>' : '') + '</div>' +
      (outra ? '<div style="color:#7f8db0;margin-top:4px">' + (P.pg === 'arena' ? 'Entre na Torre de Cruma pelo portal verde da cidade.' : 'Volte para a cidade (B).') + '</div>' : '') +
      '<div class="bar"><i style="width:' + Math.round(passo / PASSOS.length * 100) + '%"></i></div><button type="button" data-p="1">Pular expedicao</button>';
  }
  function avanca(){
    passo++; conta = 0; grava(passo); if(window.SomL2) try { SomL2.ui('missao'); } catch(e){}
    if(el){ el.classList.add('ok'); setTimeout(function(){ if(el) el.classList.remove('ok'); }, 700); }
    if(passo >= PASSOS.length){
      grava('fim'); try { if(window.Chat) Chat.sistema('Expedicao de entrada concluida. Boa caçada!'); } catch(e){}
      if(el) el.style.display = 'none'; return;
    }
    try { if(window.Chat) Chat.sistema('Expedicao: ' + PASSOS[passo].txt.replace(/<[^>]+>/g, '')); } catch(e){}
    desenha();
  }
  function tick(){
    var s = op.S && op.S(); if(!s || PASSOS[passo] === undefined) return;
    if(!ini && typeof s.px === 'number') ini = [s.px, s.pz];
    var P = PASSOS[passo];
    if(P.pg === 'cidade' && op.pagina === 'arena'){                    /* ja saiu da cidade: pula os passos da cidade */
      while(PASSOS[passo] && PASSOS[passo].pg === 'cidade' && !PASSOS[passo].sempre) passo++;
      grava(passo); desenha(); P = PASSOS[passo]; if(!P) return;
    }
    if(P.pg && P.pg !== op.pagina && !P.sempre){
      if((s.lvl | 0) >= 20 && passo < PASSOS.length - 1){ passo = PASSOS.length - 1; desenha(); }   /* personagem que ja passou dessa fase */
      return;
    }
    if(P.ok && P.ok(s)) avanca();
  }
  E.ev = function(nome){
    if(!op) return; var P = PASSOS[passo]; if(!P || P.ev !== nome || (P.pg && P.pg !== op.pagina)) return;
    conta++; if(conta >= (P.n || 1)) avanca(); else desenha();
  };
  E.init = function(o){
    op = o || {}; var v = le(); if(v === 'fim' || v === 'pulou') return;
    passo = Math.max(0, Math.min(PASSOS.length - 1, parseInt(v, 10) || 0));
    setTimeout(function(){
      var s = op.S && op.S();
      if(s && (s.lvl | 0) >= 20 && passo === 0){ grava('fim'); return; }                 /* personagem antigo: nao mostra */
      monta(); desenha(); setInterval(tick, 500);
    }, 4000);
  };
})();
