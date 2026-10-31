/* Celular (toque): tela "gire o celular", botoes na tela (atacar, pular, esquiva/correr, bloquear, skills da barra) e tela cheia.
   Script comum para selecao, cidade e arena. So age em aparelho de toque (pointer: coarse). Os botoes mandam as MESMAS teclas do teclado (Espaco, Shift, C, 3/4/6),
   entao o jogo nao precisa saber que e um celular. As skills usam a barra (MuHudRef.triggerSlot). O analogico de mover ja existe (arrastar no lado esquerdo da tela). */
(function(){
  var touch = false;
  try { touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 1); } catch(e){}
  if(!touch) return;
  var pagina = /arena/i.test(location.pathname) ? 'arena' : (/cidade/i.test(location.pathname) ? 'cidade' : 'outra');
  var CSS =
    'body.is-touch #lockhint{display:none!important}' +
    '#mbgira{position:fixed;inset:0;z-index:99999;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#030611;color:#f5c451;font:600 18px system-ui,sans-serif;text-align:center;padding:24px}' +
    '#mbgira i{font-size:64px;font-style:normal;display:block;animation:mbgira 2s ease-in-out infinite}@keyframes mbgira{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}' +
    '#mbgira small{color:#9fb0d0;font-weight:400;font-size:14px;max-width:280px}' +
    '@media (orientation:portrait){#mbgira{display:flex}}' +
    '#mb{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:76px;z-index:60;display:none;pointer-events:none;user-select:none;-webkit-user-select:none;touch-action:none}' +
    'body.is-touch #mb{display:block}' +
    '#mb .b{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #b8923a;background:rgba(8,14,30,.72);color:#f5d27a;font:700 11px system-ui,sans-serif;text-align:center;line-height:1.1;touch-action:none;-webkit-tap-highlight-color:transparent;overflow:hidden}' +
    '#mb .b:active,#mb .b.on{background:rgba(245,196,81,.45);transform:scale(.94)}' +
    '#mb .atk{width:78px;height:78px;right:0;bottom:0;font-size:13px;border-color:#ff8a2a;color:#ffb066}' +
    '#mb .pul{width:54px;height:54px;right:86px;bottom:4px;font-size:10px}#mb .esq{width:54px;height:54px;right:18px;bottom:88px;font-size:9px}#mb .blq{width:54px;height:54px;right:86px;bottom:62px;font-size:9px}' +
    '#mb .sk{width:50px;height:50px;border-color:#4a6fb0;color:#cfe0ff}' +
    '#mb .sk svg{width:30px;height:30px}#mb .sk .k{position:absolute;right:4px;bottom:1px;font-size:9px;color:#9fb0d0}' +
    '#mb .sk .cd{position:absolute;left:0;bottom:0;width:100%;background:rgba(0,0,0,.6);height:0}#mb .sk .ct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;text-shadow:0 1px 3px #000}' +
    '#mbfs{position:fixed;left:50%;transform:translateX(-50%);top:6px;z-index:70;padding:6px 12px;border:1px solid #2b3a63;border-radius:999px;background:rgba(5,10,24,.8);color:#cfe0ff;font:600 12px system-ui,sans-serif;display:none}' +
    'body.is-touch #mbfs{display:block}' +
    'body.is-touch #mu-hotbar-host{pointer-events:none}';          /* a barra desenhada fica so como status; os botoes grandes acima fazem o trabalho */

  function ini(){
    document.body.classList.add('is-touch');
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var g = document.createElement('div'); g.id = 'mbgira'; g.innerHTML = '<i>📱</i>Gire o celular<small>O IS BLADE é jogado com o celular deitado (horizontal).</small>'; document.body.appendChild(g);
    var f = document.createElement('div'); f.id = 'mbfs'; f.textContent = 'tela cheia';
    var de = document.documentElement;
    f.onclick = function(){ try { (de.requestFullscreen || de.webkitRequestFullscreen).call(de); } catch(e){} try { screen.orientation.lock('landscape'); } catch(e){} f.style.display = 'none'; };
    document.addEventListener('fullscreenchange', function(){ f.style.display = document.fullscreenElement ? 'none' : ''; });
    if(!(de.requestFullscreen || de.webkitRequestFullscreen)) f.style.display = 'none';          /* iPhone: sem tela cheia; instalar o app (PWA) resolve */
    document.body.appendChild(f);
    if(pagina !== 'outra') montaBotoes();
  }
  function tecla(tipo, key, code){ try { window.dispatchEvent(new KeyboardEvent(tipo, { key: key, code: code || '', bubbles: true, cancelable: true })); } catch(e){} }
  function botao(cls, txt, aperta, solta){
    var b = document.createElement('div'); b.className = 'b ' + cls; b.innerHTML = txt;
    var ativo = null;
    b.addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch(x){} ativo = e.pointerId; b.classList.add('on'); aperta(); });
    function fim(){ if(ativo === null) return; ativo = null; b.classList.remove('on'); if(solta) solta(); }
    b.addEventListener('pointerup', fim); b.addEventListener('pointercancel', fim); b.addEventListener('lostpointercapture', fim);
    ['touchstart', 'contextmenu'].forEach(function(n){ b.addEventListener(n, function(e){ e.preventDefault(); }); });
    return b;
  }
  var combo = ['3', '4', '6'], ci = 0, tAtk = 0;
  function montaBotoes(){
    var mb = document.createElement('div'); mb.id = 'mb';
    mb.appendChild(botao('atk', 'ATACAR', function(){
      var t = performance.now(); if(t - tAtk > 1300) ci = 0; tAtk = t; var k = combo[ci++ % combo.length];
      tecla('keydown', k, 'Digit' + k); setTimeout(function(){ tecla('keyup', k, 'Digit' + k); }, 60);
    }));
    mb.appendChild(botao('pul', 'PULAR', function(){ tecla('keydown', ' ', 'Space'); }, function(){ tecla('keyup', ' ', 'Space'); }));
    mb.appendChild(botao('esq', 'ESQUIVA', function(){ tecla('keydown', 'Shift', 'ShiftLeft'); }, function(){ tecla('keyup', 'Shift', 'ShiftLeft'); }));
    mb.appendChild(botao('blq', 'BLOQUEIO', function(){ tecla('keydown', 'c', 'KeyC'); }, function(){ tecla('keyup', 'c', 'KeyC'); }));
    var sk = [];
    for(var i = 0; i < 6; i++){ (function(i){
      var b = botao('sk', '<span class="ic"></span><span class="k"></span><span class="cd"></span><span class="ct"></span>', function(){ var H = window.MuHudRef; if(H) H.triggerSlot(i); });
      b.style.right = (150 + (i % 3) * 56) + 'px'; b.style.bottom = (i < 3 ? 6 : 62) + 'px'; mb.appendChild(b); sk.push(b);
    })(i); }
    document.body.appendChild(mb);
    setInterval(function(){                                       /* espelha icone, tecla e recarga da barra */
      var slots = document.querySelectorAll('.mu-hotbar-slot');
      for(var i = 0; i < 6; i++){
        var s = slots[i], b = sk[i]; if(!s || !b) continue;
        var ic = s.querySelector('.slot-icon'), kk = s.querySelector('.slot-key'), cd = s.querySelector('.slot-cd-fill'), ct = s.querySelector('.slot-cd-txt');
        var h = ic ? ic.innerHTML : ''; if(b._h !== h){ b._h = h; b.querySelector('.ic').innerHTML = h; }
        b.style.opacity = h ? '1' : '.35'; b.querySelector('.k').textContent = kk ? kk.textContent : '';
        b.querySelector('.cd').style.height = cd ? cd.style.height : '0'; b.querySelector('.ct').textContent = ct ? ct.textContent : '';
      }
    }, 150);
  }
  if(document.body) ini(); else document.addEventListener('DOMContentLoaded', ini);
})();
