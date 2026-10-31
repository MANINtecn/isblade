/* Voz do personagem (sons do Lineage 2, pacote chrsound.uax): cada raca/genero tem a sua. Arquivos: assets/vozes/<conjunto>/<evento>_<n>.ogg (gerados por tools/extrair_vozes_l2.py).
   Eventos: atk (golpe basico), skill (grito de skill), dmg (levou dano), death (morreu), breath (folego), victory (vitoria/nivel), greeting (cumprimento).
   Uso:  Voz.tocar('atk')   -> escolhe uma variacao ao acaso, respeita tempo minimo entre vozes e o volume/mudo do jogo (Opcoes).
   O conjunto vem de 'isblade.char_type' (tabela MAPA). Carrega so as vozes do personagem atual (~200 KB). */
(function(){
  var MAPA = { human_fighter: 'MHFighter', fighter: 'MHFighter', starter: 'MHFighter', human_fighter_female: 'FHFighter', imperial: 'FHFighter',
    magic_m: 'MHMagician', magic_f: 'FHMagician', elf_m: 'MElf', elf_f: 'FElf', orc_m: 'MOFighter', orc_f: 'FOFighter',
    dwarf_m: 'MDwarf', dwarf_f: 'FDwarf', darkelf_m: 'MDElf', darkelf_f: 'FDElf' };
  var CD = { atk: .42, skill: .7, dmg: .55, death: 0, breath: 2.5, victory: 1.2, greeting: 5, fail: 1.4 };       /* segundos minimos entre duas vozes do mesmo evento */
  var PROB = { atk: .7, skill: 1, dmg: .85, death: 1, breath: .45, victory: 1, greeting: 1, fail: .8 };
  var conj = null, idx = null, bufs = {}, ctx = null, ult = {}, ocupado = 0, pronto = false;
  function tipo(){ try { return (localStorage.getItem('isblade.char_type') || 'fighter').toLowerCase(); } catch(e){ return 'fighter'; } }
  function vol(){
    try { if(window.SFX && SFX.getVol){ return SFX.isMuted() ? 0 : SFX.getVol(); } } catch(e){}
    try { if(localStorage.getItem('isblade.mute') === '1') return 0; var v = parseFloat(localStorage.getItem('isblade.vol')); return isNaN(v) ? .8 : Math.max(0, Math.min(1, v)); } catch(e){ return .8; }
  }
  function audio(){
    if(ctx) return ctx;
    try { var A = window.AudioContext || window.webkitAudioContext; ctx = new A(); } catch(e){ ctx = null; }
    return ctx;
  }
  function destrava(){ var c = audio(); if(c && c.state === 'suspended') c.resume(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(n){ window.addEventListener(n, destrava, { passive: true }); });

  function carrega(){
    var c = audio(); if(!c || !conj || !idx) return;
    var set = idx[conj] || {};
    Object.keys(set).forEach(function(ev){ set[ev].forEach(function(f){
      var u = 'assets/vozes/' + conj + '/' + f; if(bufs[u]) return; bufs[u] = 1;
      fetch(u).then(function(r){ return r.arrayBuffer(); }).then(function(ab){ return new Promise(function(ok, no){ c.decodeAudioData(ab, ok, no); }); })
        .then(function(b){ bufs[u] = b; }).catch(function(){ delete bufs[u]; });
    }); });
    pronto = true;
  }
  function iniciar(){
    conj = MAPA[tipo()] || 'MHFighter';
    if(/arena/i.test(location.pathname)) setTimeout(mobCarregar, 300);               /* sons dos monstros so na arena/dungeon */
    fetch('assets/vozes/vozes.json').then(function(r){ return r.json(); }).then(function(j){ idx = j; carrega(); }).catch(function(){});
  }
  function tocar(ev, op){
    op = op || {}; var c = ctx; if(!pronto || !c || !idx || !conj) return false;
    var agora = performance.now() / 1000;
    if(ev !== 'death' && agora - (ocupado || 0) < .18) return false;                           /* nunca duas vozes coladas */
    if(agora - (ult[ev] || -9) < (CD[ev] || 0)) return false;
    if(!op.sempre && Math.random() > (PROB[ev] === undefined ? 1 : PROB[ev])) return false;
    var lista = (idx[conj] && idx[conj][ev]) || []; if(ev === 'skill' && idx[conj] && idx[conj].cast) lista = lista.concat(idx[conj].cast);      /* grito de skill + 'Shot/Throw' da raca */
    if(!lista.length) return false;
    var f = lista[Math.floor(Math.random() * lista.length)], b = bufs['assets/vozes/' + conj + '/' + f];
    if(!b || b === 1) return false;
    var v = vol() * (op.vol === undefined ? .9 : op.vol); if(v <= 0) return false;
    if(c.state === 'suspended') c.resume();
    var s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = v;
    s.playbackRate.value = 1 + (Math.random() - .5) * .06;                                        /* leve variacao de tom */
    s.connect(g); g.connect(c.destination); s.start(0); ult[ev] = ocupado = agora;
    return true;
  }
  if(/cidade/i.test(location.pathname)){                                                           /* cumprimento ao entrar na cidade (uma vez por aba, depois do primeiro toque/tecla) */
    var saudou = false; try { saudou = sessionStorage.getItem('isblade.saudou') === '1'; } catch(e){}
    if(!saudou){ var f = function(){ window.removeEventListener('pointerdown', f); window.removeEventListener('keydown', f); try { sessionStorage.setItem('isblade.saudou', '1'); } catch(e){} setTimeout(function(){ tocar('greeting', { sempre: true }); }, 700); };
      window.addEventListener('pointerdown', f); window.addEventListener('keydown', f); }
  }
  /* ---- passos (stepsound.uax): um passo a cada ~1,25 m andando / ~1,9 m correndo, no tom da superficie ---- */
  var PS = null, pbufs = {}, pult = null, pacum = 0, plado = 0;
  function passosJson(){ if(PS !== null) return; PS = false; fetch('assets/passos/passos.json').then(function(r){ return r.json(); }).then(function(j){ PS = j; }).catch(function(){ PS = false; }); }
  function passoBuf(u){
    if(pbufs[u] && pbufs[u] !== 1) return pbufs[u]; if(pbufs[u] === 1) return null; var c = audio(); if(!c) return null; pbufs[u] = 1;
    fetch(u).then(function(r){ return r.arrayBuffer(); }).then(function(ab){ return new Promise(function(ok, no){ c.decodeAudioData(ab, ok, no); }); }).then(function(b){ pbufs[u] = b; }).catch(function(){ delete pbufs[u]; });
    return null;
  }
  function passo(dt, px, pz, o){
    o = o || {}; passosJson(); if(!PS || !ctx || !(dt > 0)) return;
    if(!pult){ pult = [px, pz]; return; }
    var d = Math.hypot(px - pult[0], pz - pult[1]); pult = [px, pz];
    if(o.ar || o.rolando || d > 3){ pacum = 0; return; }                                           /* no ar, rolando ou teleportou: sem passo */
    var v = d / dt; if(v < .6){ pacum = Math.min(pacum, .4); return; }
    pacum += d; var modo = v > 3.4 ? 'run' : 'walk';
    if(pacum < (modo === 'run' ? 1.9 : 1.25)) return; pacum = 0;
    var sup = PS[o.sup] ? o.sup : 'default', lista = (PS[sup] && PS[sup][modo]) || []; if(!lista.length) return;
    var f = lista[Math.floor(Math.random() * lista.length)], b = passoBuf('assets/passos/' + f); if(!b) return;
    var vv = vol() * (modo === 'run' ? .34 : .26); if(vv <= 0) return; if(ctx.state === 'suspended') ctx.resume();
    var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vv; plado ^= 1;
    s.playbackRate.value = 1 + (plado ? .03 : -.03) + (Math.random() - .5) * .05; s.connect(g); g.connect(ctx.destination); s.start(0);
  }
  /* ---- monstros (monsound*.uax): sombra=shadow, conjurador=black_magician, brutamontes=ogre, comandante=DeathLord, Baium=baium. Arquivos: assets/mobs/<mob>/<evento>_<n>.ogg ---- */
  var MB = null, mbufs = {}, mult = {};
  var MCD = { atk: .35, windup: .5, dmg: .18, death: .1, idle: 2.2, swish: .3 };
  function mobCarregar(){
    var c = audio(); if(!c || MB !== null) return; MB = false;
    fetch('assets/mobs/mobs.json').then(function(r){ return r.json(); }).then(function(j){
      MB = j;
      Object.keys(j).forEach(function(m){ Object.keys(j[m]).forEach(function(ev){ j[m][ev].forEach(function(n){
        var u = 'assets/mobs/' + m + '/' + n; if(mbufs[u]) return; mbufs[u] = 1;
        fetch(u).then(function(r){ return r.arrayBuffer(); }).then(function(ab){ return new Promise(function(ok, no){ c.decodeAudioData(ab, ok, no); }); }).then(function(b){ mbufs[u] = b; }).catch(function(){ delete mbufs[u]; });
      }); }); });
    }).catch(function(){ MB = false; });
  }
  /* Voz.mob('brute','atk', distancia_em_m, {vol}) -> true se tratou (tocou ou esta em recarga), para o chamador nao tocar o som antigo. Some com a distancia. */
  function mob(tipo, ev, dist, op){
    op = op || {}; if(!ctx) return false; mobCarregar(); if(!MB || !MB[tipo]) return false;
    var agora = performance.now() / 1000, k = tipo + ':' + ev;
    if(agora - (mult[k] || -9) < (MCD[ev] || 0)) return true;
    var lista = MB[tipo][ev] || []; if(!lista.length) return false;
    var n = lista[Math.floor(Math.random() * lista.length)], b = mbufs['assets/mobs/' + tipo + '/' + n]; if(!b || b === 1) return false;
    var d = Math.max(0, dist || 0), v = vol() * (op.vol === undefined ? 1 : op.vol) * Math.max(.12, 1 / (1 + d / 9)); if(v <= 0) return true;
    if(ctx.state === 'suspended') ctx.resume();
    var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; g.gain.value = v; src.playbackRate.value = 1 + (Math.random() - .5) * .08;
    src.connect(g); g.connect(ctx.destination); src.start(0); mult[k] = agora; return true;
  }
  window.Voz = { mob: mob, mobCarregar: mobCarregar, _dbg: function(){ return { PS: !!PS, pult: pult, pacum: pacum, bufs: Object.keys(pbufs).map(function(k){ return k.slice(-16) + ':' + (pbufs[k] === 1 ? 'carregando' : 'ok'); }) }; }, passo: passo, iniciar: iniciar, tocar: tocar, conjunto: function(){ return conj; }, pronto: function(){ return pronto; }, MAPA: MAPA };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
