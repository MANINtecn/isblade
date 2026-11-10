/* Sons de interface e de ambiente do L2 (extraidos do cliente: interfacesound, ItemSound3, itemsound, ambsound, AmbSound2) em assets/l2_sounds/ui e /amb.
   SomL2.ui('inv_abre') toca um som de interface (devolve true se tocou; a pagina usa o som antigo se nao).
   SomL2.ambiente('cidade') liga o ambiente (vento em loop + ondas e gaivotas sorteadas); SomL2.ambiente(null) desliga.
   Volume: interface segue o volume e o mudo dos efeitos (isblade.vol / isblade.mute); ambiente tem controle proprio "Ambiente" nas Config (isblade.vol_amb).
   O navegador so libera o audio depois do primeiro clique/tecla. */
(function(){
  var SL = window.SomL2 = {}, ctx = null, uiG = null, ambG = null, BUF = {}, carregando = {}, ambAtual = null, ambPedido = null, sessao = null;
  var UI = {
    clique: 'click_01', inv_abre: 'inventory_open_01', inv_fecha: 'inventory_close_01', status_abre: 'charstat_open_01', status_fecha: 'charstat_close_01',
    sistema_abre: 'system_open_01', sistema_fecha: 'system_close_01', janela_abre: 'window_open', janela_fecha: 'window_close', aceitar: 'quest_accept_01',
    enc_ok: 'sys_enchant_success', enc_falha: 'sys_enchant_failed', troca: 'sys_exchange_success', impossivel: 'sys_impossible', falta: 'sys_shortage',
    falhou: 'sys_failed', grupo_entra: 'sys_party_join', grupo_convite: 'sys_party_invite',
    pocao: 'itemequip_etc_potion', equipar: 'itemequip_shield_metal', joia: 'itemequip_etc_jewel', pegar: 'Pickup', pergaminho: 'Scroll', lixo: 'trash_basket', moeda: 'itemdrop_money'
  };
  var GANHO = { clique: .5, janela_abre: .6, janela_fecha: .6, falta: .8, impossivel: .7 };
  /* [ambiente-zonas] 10/11/2026: ambiente por ZONA do mundo aberto (antes era um so: vento, ondas e gaivotas ate no meio do campo). Nomes do L2: ad_ = dia (passaros, sapo),
     an_ = noite (coruja, raposa, lobo), in_ = grilos. SomL2.ambiente('campo_dia+lago') = zona base + camada (lago). A troca entre zonas e suave (2-3 s). */
  var AMB = {
    cidade: { loop: 'wind_light_loop_1', loopG: .22, eventos: [
      { sons: ['small_01', 'small_02', 'middle_03', 'large_01'], cada: [3.5, 8], g: [.16, .32] },        /* ondas (Talking Island e ilha) */
      { sons: ['h_seagull_01', 'h_seagull_02', 'h_seagull_03'], cada: [11, 26], g: [.1, .2] }               /* gaivotas */
    ] },
    campo_dia: { loop: 'ms_wind_loop_01', loopG: .12, eventos: [
      { sons: ['ad_bird_01', 'ad_bird_02', 'ad_bird_05', 'ad_bird_08', 'ad_bird_11', 'ad_bird_14'], cada: [2.5, 7], g: [.12, .26] },
      { sons: ['ad_hawk_01'], cada: [40, 90], g: [.08, .14] },
      { sons: ['id_cicada_01'], cada: [14, 30], g: [.06, .12] }
    ] },
    campo_noite: { loop: 'ms_wind_loop_01', loopG: .1, eventos: [
      { sons: ['in_cricket_01', 'in_cricket_02', 'in_cricket_03'], cada: [2, 5], g: [.1, .2] },
      { sons: ['an_bird_03', 'an_bird_07'], cada: [14, 32], g: [.08, .16] },
      { sons: ['an_fox_01'], cada: [60, 130], g: [.05, .1] },
      { sons: ['an_wolf_01'], cada: [90, 200], g: [.04, .08] }                                           /* lobo ao longe (raro e baixo) */
    ] },
    lago: { eventos: [                                                                                    /* camada: perto de um lago */
      { sons: ['lake_01', 'lake_02', 'lake_03'], cada: [4, 9], g: [.14, .26] },
      { sons: ['ad_frog_01', 'ad_frog_02'], cada: [12, 28], g: [.08, .16] }
    ] },
    curuma: { loop: 'd_wind_loop_03', loopG: .1, eventos: [                                               /* ruinas: vento fundo, gotas, ave rara */
      { sons: ['d_water_drop_01', 'd_water_drop_03', 'd_water_drop_05', 'an_water_drop_01'], cada: [3, 9], g: [.1, .22] },
      { sons: ['ad_bird_05', 'ad_bird_11'], cada: [14, 34], g: [.06, .12] }
    ] },
    fortaleza: { loop: 'wind_light_loop_1', loopG: .2, eventos: [
      { sons: ['an_crow_01', 'an_crow_02'], cada: [14, 34], g: [.1, .2] },
      { sons: ['ad_bird_02', 'ad_bird_08'], cada: [8, 20], g: [.08, .16] }
    ] },
    pantano: { loop: 'lava_bubble_loop_01', loopG: .2, eventos: [                                        /* lava borbulhando, estalos e tremor */
      { sons: ['lava_splash_01', 'lava_splash_02'], cada: [3, 8], g: [.12, .26] },
      { sons: ['lava_1', 'lava_2'], cada: [8, 18], g: [.1, .2] },
      { sons: ['rumble_01'], cada: [40, 90], g: [.05, .1] },
      { sons: ['fire_loop_01'], cada: [20, 40], g: [.05, .1] }
    ] },
    dungeon: { loop: 'd_wind_loop_08', loopG: .08, eventos: [                                            /* Torre do Baium / DGs */
      { sons: ['d_water_drop_01', 'd_water_drop_03', 'd_water_drop_05'], cada: [4, 11], g: [.08, .18] },
      { sons: ['rumble_01'], cada: [50, 110], g: [.04, .08] }
    ] }
  };
  var AMBN = {}; Object.keys(AMB).forEach(function(k){ var A = AMB[k]; if(A.loop) AMBN[A.loop] = 1; A.eventos.forEach(function(e){ e.sons.forEach(function(s){ AMBN[s] = 1; }); }); });
  function compor(nome){                                                                                  /* 'campo_dia+lago' = base + camadas */
    var P = String(nome).split('+'), A = AMB[P[0]]; if(!A) return null; var R = { loop: A.loop, loopG: A.loopG, eventos: A.eventos.slice() };
    for(var i = 1; i < P.length; i++){ var O = AMB[P[i]]; if(O) R.eventos = R.eventos.concat(O.eventos); } return R;
  }
  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function volFx(){ var v = parseFloat(ls('isblade.vol')); return (ls('isblade.mute') === '1') ? 0 : (isNaN(v) ? .6 : v); }
  function volAmb(){ var v = parseFloat(ls('isblade.vol_amb')); return (ls('isblade.mute') === '1') ? 0 : (isNaN(v) ? .5 : v); }
  function pasta(n){ return (AMBN[n] || /^(small_|middle_|large_|h_seagull|wind_light)/.test(n)) ? 'amb' : 'ui'; }
  function carrega(n, cb){
    if(BUF[n]){ if(cb) cb(BUF[n]); return; } if(!ctx) return;
    (carregando[n] = carregando[n] || []).push(cb); if(carregando[n].length > 1) return;
    fetch('assets/l2_sounds/' + pasta(n) + '/' + n + '.wav?v=2').then(function(r){ return r.arrayBuffer(); }).then(function(a){ return new Promise(function(ok, ko){ ctx.decodeAudioData(a, ok, ko); }); })
      .then(function(b){ BUF[n] = b; var l = carregando[n]; delete carregando[n]; l.forEach(function(f){ if(f) f(b); }); }).catch(function(){ delete carregando[n]; });
  }
  function toca(n, saida, g, o){
    o = o || {};
    carrega(n, function(b){
      var s = ctx.createBufferSource(), gn = ctx.createGain(); s.buffer = b; s.loop = !!o.loop; gn.gain.value = g;
      var no = gn; if(o.pan && ctx.createStereoPanner){ var p = ctx.createStereoPanner(); p.pan.value = o.pan; gn.connect(p); no = p; }
      s.connect(gn); no.connect(saida); s.start(); if(o.loop && o.sess) o.sess.fontes.push(s);
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
    var velha = sessao; ambAtual = nome;
    if(velha){ velha.morta = true; velha.timers.forEach(clearTimeout); try { velha.gain.gain.setTargetAtTime(0, ctx.currentTime, .7); } catch(e){} setTimeout(function(){ velha.fontes.forEach(function(s){ try { s.stop(); } catch(e){} }); try { velha.gain.disconnect(); } catch(e){} }, 4000); }
    var A = nome ? compor(nome) : null; if(!A){ sessao = null; return; }
    var se = sessao = { nome: nome, gain: ctx.createGain(), fontes: [], timers: [], morta: false };
    se.gain.gain.value = 0; se.gain.connect(ambG); try { se.gain.gain.setTargetAtTime(1, ctx.currentTime, .8); } catch(e){ se.gain.gain.value = 1; }
    if(A.loop) toca(A.loop, se.gain, A.loopG, { loop: true, sess: se });
    A.eventos.forEach(function(ev){
      function proximo(){ var t = ev.cada[0] + Math.random() * (ev.cada[1] - ev.cada[0]); se.timers.push(setTimeout(function(){ if(se.morta) return; if(!document.hidden) toca(ev.sons[Math.floor(Math.random() * ev.sons.length)], se.gain, ev.g[0] + Math.random() * (ev.g[1] - ev.g[0]), { pan: Math.random() * 1.6 - .8 }); proximo(); }, t * 1000)); }
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
