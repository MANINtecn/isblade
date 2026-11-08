/* Musica de fundo por lugar, com as faixas do Lineage 2 (data/musica.json -> assets/musica/).
   A pagina diz onde o jogador esta: Musica.init({ lugar: function(){ return 'cidade'; }, mudo: function(){ return SFX.isMuted(); } }).
   A cada 1,5 s confere o lugar; se mudou, troca com transicao suave (2 s). Comeca no primeiro toque/tecla (regra dos navegadores).
   Volume proprio (isblade.vol_musica, 0 a 1) com controle "Musica" nas Config (abaixo de SOM); pausa quando a aba sai da tela. */
(function(){
  var M = window.Musica = {};
  var cfg = null, A = [new Audio(), new Audio()], cur = 0, atual = null, op = {}, liberado = false, vol = null, fades = [null, null];
  A.forEach(function(a){ a.loop = true; a.preload = 'auto'; a.volume = 0; });
  function lerVol(){ try { var v = parseFloat(localStorage.getItem('isblade.vol_musica')); if(!isNaN(v)) return Math.max(0, Math.min(1, v)); } catch(e){} return cfg ? (cfg.volumePadrao || 0.35) : 0.35; }
  function alvo(){ var m = false; try { m = op.mudo ? !!op.mudo() : false; } catch(e){} return m ? 0 : vol; }
  function fade(i, para, ms, fim){
    clearInterval(fades[i]); var a = A[i], de = a.volume, t0 = performance.now();
    fades[i] = setInterval(function(){ var u = Math.min(1, (performance.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, de + (para - de) * u)); if(u >= 1){ clearInterval(fades[i]); fades[i] = null; if(fim) fim(); } }, 50);
  }
  function troca(arq){
    atual = arq; var velho = cur; cur = 1 - cur; var a = A[cur];
    fade(velho, 0, 2000, function(){ A[velho].pause(); });
    if(!arq){ return; }
    a.src = 'assets/musica/' + arq + '?v=' + (cfg.v || 1); a.currentTime = 0; a.volume = 0;
    var p = a.play(); if(p && p.catch) p.catch(function(){});
    fade(cur, alvo(), 2000);
  }
  function confere(){
    if(!cfg || !liberado || document.hidden) return;
    var l = null; try { l = op.lugar ? op.lugar() : null; } catch(e){}
    var arq = (l && cfg.lugares[l]) || null;
    if(arq !== atual) troca(arq);
    else if(arq){ var v = alvo(); if(Math.abs(A[cur].volume - v) > 0.01 && !fades[cur]) A[cur].volume = v; }
  }
  function libera(){ if(liberado) return; liberado = true; confere(); }
  M.init = function(o){
    op = o || {};
    fetch('data/musica.json?v=' + Date.now().toString().slice(0, -5)).then(function(r){ return r.json(); }).then(function(j){ cfg = j; vol = lerVol(); confere(); ui(); }).catch(function(e){ console.warn('Musica: sem data/musica.json', e); });
    ['pointerdown', 'keydown', 'touchstart'].forEach(function(t){ window.addEventListener(t, libera, { once: true, passive: true }); });
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){ A.forEach(function(a){ a.pause(); }); }
      else if(atual){ var p = A[cur].play(); if(p && p.catch) p.catch(function(){}); }
    });
    setInterval(confere, 1500);
  };
  M.volume = function(v){ vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('isblade.vol_musica', String(vol)); } catch(e){} clearInterval(fades[cur]); fades[cur] = null; A[cur].volume = alvo(); };
  M.agora = function(){ return atual; };
  /* controle nas Config: logo abaixo do titulo SOM */
  function ui(){
    if(document.getElementById('cfgMus')) return;
    var h = [].slice.call(document.querySelectorAll('h3')).filter(function(x){ return x.textContent.trim() === 'SOM'; })[0]; if(!h) return;
    var d = document.createElement('div'); d.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
    d.innerHTML = '<span>Musica</span><input type="range" id="cfgMus" min="0" max="100" step="5" style="flex:1"><b id="cfgMusV" style="width:34px;text-align:right"></b>';
    h.parentNode.insertBefore(d, h.nextSibling);
    var r = d.querySelector('#cfgMus'), b = d.querySelector('#cfgMusV'); r.value = Math.round(vol * 100); b.textContent = r.value + '%';
    r.addEventListener('input', function(){ M.volume(r.value / 100); b.textContent = r.value + '%'; });
  }
})();
