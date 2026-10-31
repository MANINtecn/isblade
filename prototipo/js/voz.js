/* Voz do personagem (sons do Lineage 2, pacote chrsound.uax): cada raca/genero tem a sua. Arquivos: assets/vozes/<conjunto>/<evento>_<n>.ogg (gerados por tools/extrair_vozes_l2.py).
   Eventos: atk (golpe basico), skill (grito de skill), dmg (levou dano), death (morreu), breath (folego), victory (vitoria/nivel), greeting (cumprimento).
   Uso:  Voz.tocar('atk')   -> escolhe uma variacao ao acaso, respeita tempo minimo entre vozes e o volume/mudo do jogo (Opcoes).
   O conjunto vem de 'isblade.char_type' (tabela MAPA). Carrega so as vozes do personagem atual (~200 KB). */
(function(){
  var MAPA = { human_fighter: 'MHFighter', fighter: 'MHFighter', starter: 'MHFighter', human_fighter_female: 'FHFighter', imperial: 'FHFighter',
    magic_m: 'MHMagician', magic_f: 'FHMagician', elf_m: 'MElf', elf_f: 'FElf', orc_m: 'MOFighter', orc_f: 'FOFighter',
    dwarf_m: 'MDwarf', dwarf_f: 'FDwarf', darkelf_m: 'MDElf', darkelf_f: 'FDElf' };
  var CD = { atk: .42, skill: .7, dmg: .55, death: 0, breath: 2.5, victory: 1.2, greeting: 5 };       /* segundos minimos entre duas vozes do mesmo evento */
  var PROB = { atk: .7, skill: 1, dmg: .85, death: 1, breath: .45, victory: 1, greeting: 1 };
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
    fetch('assets/vozes/vozes.json').then(function(r){ return r.json(); }).then(function(j){ idx = j; carrega(); }).catch(function(){});
  }
  function tocar(ev, op){
    op = op || {}; var c = ctx; if(!pronto || !c || !idx || !conj) return false;
    var agora = performance.now() / 1000;
    if(ev !== 'death' && agora - (ocupado || 0) < .18) return false;                           /* nunca duas vozes coladas */
    if(agora - (ult[ev] || -9) < (CD[ev] || 0)) return false;
    if(!op.sempre && Math.random() > (PROB[ev] === undefined ? 1 : PROB[ev])) return false;
    var lista = (idx[conj] && idx[conj][ev]) || []; if(!lista.length) return false;
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
  window.Voz = { iniciar: iniciar, tocar: tocar, conjunto: function(){ return conj; }, pronto: function(){ return pronto; }, MAPA: MAPA };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
