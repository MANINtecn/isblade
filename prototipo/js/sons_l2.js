/* Sons de interface e de ambiente do L2 (extraidos do cliente: interfacesound, ItemSound3, itemsound, ambsound, AmbSound2) em assets/l2_sounds/ui e /amb.
   SomL2.ui('inv_abre') toca um som de interface (devolve true se tocou; a pagina usa o som antigo se nao).
   SomL2.ambiente('cidade') liga o ambiente (vento em loop + ondas e gaivotas sorteadas); SomL2.ambiente(null) desliga.
   Volume: interface segue o volume e o mudo dos efeitos (isblade.vol / isblade.mute); ambiente tem controle proprio "Ambiente" nas Config (isblade.vol_amb).
   O navegador so libera o audio depois do primeiro clique/tecla. */
(function(){
  var SL = window.SomL2 = {}, ctx = null, uiG = null, ambG = null, BUF = {}, carregando = {}, ambAtual = null, ambPedido = null, timers = [], fontes = [];
  var UI = {
    clique: 'click_01', inv_abre: 'inventory_open_01', inv_fecha: 'inventory_close_01', status_abre: 'charstat_open_01', status_fecha: 'charstat_close_01',
    sistema_abre: 'system_open_01', sistema_fecha: 'system_close_01', janela_abre: 'window_open', janela_fecha: 'window_close', aceitar: 'quest_accept_01',
    enc_ok: 'sys_enchant_success', enc_falha: 'sys_enchant_failed', troca: 'sys_exchange_success', impossivel: 'sys_impossible', falta: 'sys_shortage',
    falhou: 'sys_failed', grupo_entra: 'sys_party_join', grupo_convite: 'sys_party_invite',
    pocao: 'itemequip_etc_potion', equipar: 'itemequip_shield_metal', joia: 'itemequip_etc_jewel', pegar: 'Pickup', pergaminho: 'Scroll', lixo: 'trash_basket', moeda: 'itemdrop_money'
  };
  var GANHO = { clique: .5, janela_abre: .6, janela_fecha: .6, falta: .8, impossivel: .7 };
  var AMB = {
    cidade: { loop: 'wind_light_loop_1', loopG: .22, eventos: [
      { sons: ['small_01', 'small_02', 'middle_03', 'large_01'], cada: [3.5, 8], g: [.16, .32] },        /* ondas (Talking Island e ilha) */
      { sons: ['h_seagull_01', 'h_seagull_02', 'h_seagull_03'], cada: [11, 26], g: [.1, .2] }               /* gaivotas */
    ] }
  };
  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function volFx(){ var v = parseFloat(ls('isblade.vol')); return (ls('isblade.mute') === '1') ? 0 : (isNaN(v) ? .6 : v); }
  function volAmb(){ var v = parseFloat(ls('isblade.vol_amb')); return (ls('isblade.mute') === '1') ? 0 : (isNaN(v) ? .5 : v); }
  function pasta(n){ return /^(small_|middle_|large_|h_seagull|wind_light)/.test(n) ? 'amb' : 'ui'; }
  function carrega(n, cb){
    if(BUF[n]){ if(cb) cb(BUF[n]); return; } if(!ctx) return;
    (carregando[n] = carregando[n] || []).push(cb); if(carregando[n].length > 1) return;
    fetch('assets/l2_sounds/' + pasta(n) + '/' + n + '.wav?v=1').then(function(r){ return r.arrayBuffer(); }).then(function(a){ return new Promise(function(ok, ko){ ctx.decodeAudioData(a, ok, ko); }); })
      .then(function(b){ BUF[n] = b; var l = carregando[n]; delete carregando[n]; l.forEach(function(f){ if(f) f(b); }); }).catch(function(){ delete carregando[n]; });
  }
  function toca(n, saida, g, o){
    o = o || {};
    carrega(n, function(b){
      var s = ctx.createBufferSource(), gn = ctx.createGain(); s.buffer = b; s.loop = !!o.loop; gn.gain.value = g;
      var no = gn; if(o.pan && ctx.createStereoPanner){ var p = ctx.createStereoPanner(); p.pan.value = o.pan; gn.connect(p); no = p; }
      s.connect(gn); no.connect(saida); s.start(); if(o.loop) fontes.push(s);
    });
  }
  function inicia(){
    if(ctx) return; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
    uiG = ctx.createGain(); uiG.connect(ctx.destination); ambG = ctx.createGain(); ambG.connect(ctx.destination); atualizaVol();
    ['click_01', 'window_open', 'window_close', 'inventory_open_01', 'inventory_close_01'].forEach(function(n){ carrega(n); });
    if(ambPedido) SL.ambiente(ambPedido);
  }
  function atualizaVol(){ if(!ctx) return; uiG.gain.value = volFx(); ambG.gain.value = volAmb(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(t){ window.addEventListener(t, function(){ inicia(); if(ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume(); }, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function(){ if(!ctx) return; if(document.hidden) ctx.suspend(); else ctx.resume(); });
  setInterval(atualizaVol, 1500);                                         /* acompanha o volume/mudo das Config */

  SL.ui = function(nome){
    var n = UI[nome] || nome; if(!ctx || !n || volFx() <= 0) return false;
    toca(n, uiG, GANHO[nome] || .85); return true;
  };
  SL.ambiente = function(nome){
    ambPedido = nome; if(!ctx || ambAtual === nome) return;
    timers.forEach(clearTimeout); timers = []; fontes.forEach(function(s){ try { s.stop(); } catch(e){} }); fontes = []; ambAtual = nome;
    var A = AMB[nome]; if(!A) return;
    if(A.loop) toca(A.loop, ambG, A.loopG, { loop: true });
    A.eventos.forEach(function(ev){
      function proximo(){ var t = ev.cada[0] + Math.random() * (ev.cada[1] - ev.cada[0]); timers.push(setTimeout(function(){ if(ambAtual !== nome) return; if(!document.hidden) toca(ev.sons[Math.floor(Math.random() * ev.sons.length)], ambG, ev.g[0] + Math.random() * (ev.g[1] - ev.g[0]), { pan: Math.random() * 1.6 - .8 }); proximo(); }, t * 1000)); }
      proximo();
    });
  };
  SL.agora = function(){ return ambAtual; };

  /* clique do L2 nos botoes das janelas (loja, inventario, skills, config, NPCs, chat) */
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('button,.l2-npc-btn'); if(!b) return;
    if(b.closest('#lojaWin,#inv,#skp,#cfg,[class*="l2-npc"],[id*="l2-npc"],#chatBox')) SL.ui('clique');
  }, true);

  /* controle "Ambiente" nas Config (abaixo da Musica, ou do titulo SOM) */
  function controle(){
    if(document.getElementById('cfgAmb')) return;
    var ref = document.getElementById('cfgMus'); if(!ref && tent < 10) return; var h = ref ? ref.parentNode : [].slice.call(document.querySelectorAll('h3')).filter(function(x){ return x.textContent.trim() === 'SOM'; })[0]; if(!h) return;
    var d = document.createElement('div'); d.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
    d.innerHTML = '<span>Ambiente</span><input type="range" id="cfgAmb" min="0" max="100" step="5" style="flex:1"><b id="cfgAmbV" style="width:34px;text-align:right"></b>';
    h.parentNode.insertBefore(d, h.nextSibling);
    var r = d.querySelector('#cfgAmb'), v = d.querySelector('#cfgAmbV'), atual = parseFloat(ls('isblade.vol_amb')); r.value = Math.round((isNaN(atual) ? .5 : atual) * 100); v.textContent = r.value + '%';
    r.addEventListener('input', function(){ try { localStorage.setItem('isblade.vol_amb', String(r.value / 100)); } catch(e){} v.textContent = r.value + '%'; atualizaVol(); });
  }
  var tent = 0, iv = setInterval(function(){ controle(); if(document.getElementById('cfgAmb') || ++tent > 40) clearInterval(iv); }, 500);
})();
