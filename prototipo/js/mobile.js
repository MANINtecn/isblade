/* Celular (toque): tela "gire o celular", botoes na tela e tela cheia. So age em aparelho de toque (pointer: coarse). Pensado para aparelhos basicos (ex.: Redmi C13, ~800x360 px).
   - Botao principal DINAMICO: ATACAR; perto de portal, bau ou porta vira ENTRAR / ABRIR (manda a tecla E). O aviso "Pressione [E]" some no toque.
   - Pular / esquiva (segurar = correr) / bloqueio: 3 botoes pequenos so com icone. 6 skills da barra: grade 3x2 pequena e translucida (icone, sem texto).
   - A barra de skills e os botoes I C S Q O do HUD ficam escondidos (repetiam os botoes); a engrenagem abre os de sistema. O minimapa fica recolhido e abre no botao do mapa.
   Os botoes mandam as MESMAS teclas do teclado (Espaco, Shift, C, E, 3/4/6); skills por MuHudRef.triggerSlot. O analogico de mover e arrastar o lado esquerdo da tela. */
(function(){
  var touch = false;
  try { touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 1); } catch(e){}
  if(!touch) return;
  var pagina = /arena/i.test(location.pathname) ? 'arena' : (/cidade/i.test(location.pathname) ? 'cidade' : 'outra');
  var CSS =
    'body.is-touch #lockhint,body.is-touch #portal-prompt{opacity:0!important;pointer-events:none!important}' +   /* o botao principal mostra a acao; o aviso fica no DOM so para o jogo dizer quando ha o que usar */
    '#mbgira{position:fixed;inset:0;z-index:99999;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#030611;color:#9fd6ff;font:600 18px system-ui,sans-serif;text-align:center;padding:24px}' +
    '#mbgira i{font-size:64px;font-style:normal;display:block;animation:mbgira 2s ease-in-out infinite}@keyframes mbgira{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}' +
    '#mbgira small{color:#9fb0d0;font-weight:400;font-size:14px;max-width:280px}' +
    '@media (orientation:portrait){#mbgira{display:flex}}' +
    '#mb{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:34px;z-index:60;display:none;pointer-events:none;user-select:none;-webkit-user-select:none;touch-action:none}' +
    'body.is-touch #mb{display:block}' +
    '#mb .b{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid rgba(120,196,255,.5);background:rgba(7,12,24,.42);color:#e8f3ff;font:700 11px system-ui,sans-serif;text-align:center;line-height:1.1;touch-action:none;-webkit-tap-highlight-color:transparent;overflow:hidden;opacity:.72}' +
    '#mb .b:active,#mb .b.on{background:rgba(92,200,255,.35);transform:scale(.93);opacity:1}' +
    '#mb .atk{width:64px;height:64px;right:0;bottom:0;font-size:12px;border-color:rgba(255,110,140,.8);color:#ffd0da;opacity:.9;letter-spacing:.04em}' +
    '#mb .atk.usar{border-color:rgba(120,230,170,.9);color:#c8ffe2;background:rgba(10,40,30,.55);animation:mbpulsa 1.2s ease-in-out infinite}@keyframes mbpulsa{0%,100%{box-shadow:0 0 0 0 rgba(120,230,170,.5)}50%{box-shadow:0 0 0 9px rgba(120,230,170,0)}}' +
    '#mb .ac{width:32px;height:32px;right:14px}#mb .ac svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#mb .pul{bottom:122px}#mb .esq{bottom:86px}#mb .blq{bottom:158px}' +
    '#mb .sk{width:36px;height:36px;border-color:rgba(120,196,255,.4);color:#cfe0ff;opacity:.6}' +
    '#mb .sk svg{width:24px;height:24px}#mb .sk .k{display:none}' +
    '#mb .sk .cd{position:absolute;left:0;bottom:0;width:100%;background:rgba(0,0,0,.6);height:0}#mb .sk .ct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;text-shadow:0 1px 3px #000}' +
    '#mbfs,#mbmap,#mbsys{position:fixed;z-index:70;padding:0;width:34px;height:34px;border:0;border-radius:9px;background:rgba(7,12,24,.5);box-shadow:inset 0 0 0 1px rgba(120,196,255,.4);color:#cfe8ff;font:600 15px system-ui,sans-serif;display:none;align-items:center;justify-content:center;opacity:.8}' +
    '#mbfs{left:12px;top:96px;width:auto;padding:0 10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase}#mbmap{right:10px;top:8px}#mbsys{right:52px;top:8px}' +
    'body.is-touch #mbmap,body.is-touch #mbsys{display:flex}body.is-touch #mbfs{display:flex}' +
    /* HUD no toque: so as barras; os botoes I C S Q O abrem pela engrenagem; minimapa recolhido */
    'body.is-touch #mu-hotbar-host,body.is-touch .mu-hud-nameplate,body.is-touch .mu-exp-strip{display:none!important}' +
    'body.is-touch .mu-sys-wrap{display:none!important;position:fixed!important;right:52px;top:48px;gap:6px;z-index:75;pointer-events:auto}body.is-touch.sys-aberto .mu-sys-wrap{display:flex!important}' +
    'body.is-touch #mu-hud-bottom{grid-template-areas:"hp hb mp"!important;grid-template-rows:auto!important;padding-bottom:max(4px,env(safe-area-inset-bottom))!important}' +
    'body.is-touch .mu-bar-slot{height:12px!important;width:min(100%,clamp(100px,26vw,170px))!important}body.is-touch .mu-bar-text{font-size:8px!important;padding:0 8px!important}' +
    'body.is-touch #minimap-wrap,body.is-touch #map-panel .atmo-bar-box,body.is-touch #teleport-bar{display:none!important}body.is-touch.mapa-aberto #minimap-wrap{display:block!important;width:96px!important;height:96px!important}body.is-touch #map-panel{top:48px!important;right:10px!important}' +
    'body.is-touch #netBtn,body.is-touch #btnReturnCity{padding:5px 9px!important;font-size:9.5px!important;letter-spacing:.08em!important}body.is-touch #btnReturnCity{top:10px!important;left:10px!important}body.is-touch #netBtn{top:46px!important;left:10px!important}';
  var I = {
    pul: '<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6M6 19l6-6 6 6"/></svg>',
    esq: '<svg viewBox="0 0 24 24"><path d="M5 7l5 5-5 5M12 7l5 5-5 5"/></svg>',
    blq: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/></svg>'
  };
  function ini(){
    document.body.classList.add('is-touch');
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var g = document.createElement('div'); g.id = 'mbgira'; g.innerHTML = '<i>📱</i>Gire o celular<small>O jogo é jogado com o celular deitado (horizontal).</small>'; document.body.appendChild(g);
    var de = document.documentElement, f = document.createElement('button'); f.id = 'mbfs'; f.type = 'button'; f.textContent = 'tela cheia';
    f.onclick = function(){ try { (de.requestFullscreen || de.webkitRequestFullscreen).call(de); } catch(e){} try { screen.orientation.lock('landscape'); } catch(e){} f.style.display = 'none'; };
    document.addEventListener('fullscreenchange', function(){ f.style.display = document.fullscreenElement ? 'none' : ''; });
    if(!(de.requestFullscreen || de.webkitRequestFullscreen)) f.style.display = 'none';          /* iPhone: sem tela cheia; instalar o app (PWA) resolve */
    document.body.appendChild(f);
    var bm = document.createElement('button'); bm.id = 'mbmap'; bm.type = 'button'; bm.textContent = '▦'; bm.title = 'Mapa'; bm.onclick = function(){ document.body.classList.toggle('mapa-aberto'); }; document.body.appendChild(bm);
    var bs = document.createElement('button'); bs.id = 'mbsys'; bs.type = 'button'; bs.textContent = '⚙'; bs.title = 'Menu'; bs.onclick = function(){ document.body.classList.toggle('sys-aberto'); }; document.body.appendChild(bs);
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
  var combo = ['3', '4', '6'], ci = 0, tAtk = 0, modoUsar = false;
  function rotulo(t){ t = (t || '').toLowerCase(); return /portal|dungeon|entrar|sair|duelo|pvp|arena|retorn/.test(t) ? 'ENTRAR' : (/bau|baú|porta/.test(t) ? 'ABRIR' : 'USAR'); }
  function montaBotoes(){
    var mb = document.createElement('div'); mb.id = 'mb';
    var atk = botao('atk', 'ATACAR', function(){
      if(modoUsar){ tecla('keydown', 'e', 'KeyE'); setTimeout(function(){ tecla('keyup', 'e', 'KeyE'); }, 60); return; }
      var t = performance.now(); if(t - tAtk > 1300) ci = 0; tAtk = t; var k = combo[ci++ % combo.length];
      tecla('keydown', k, 'Digit' + k); setTimeout(function(){ tecla('keyup', k, 'Digit' + k); }, 60);
    });
    mb.appendChild(atk);
    mb.appendChild(botao('ac pul', I.pul, function(){ tecla('keydown', ' ', 'Space'); }, function(){ tecla('keyup', ' ', 'Space'); }));
    mb.appendChild(botao('ac esq', I.esq, function(){ tecla('keydown', 'Shift', 'ShiftLeft'); }, function(){ tecla('keyup', 'Shift', 'ShiftLeft'); }));
    mb.appendChild(botao('ac blq', I.blq, function(){ tecla('keydown', 'c', 'KeyC'); }, function(){ tecla('keyup', 'c', 'KeyC'); }));
    var sk = [];
    for(var i = 0; i < 6; i++){ (function(i){
      var b = botao('sk', '<span class="ic"></span><span class="k"></span><span class="cd"></span><span class="ct"></span>', function(){ var H = window.MuHudRef; if(H) H.triggerSlot(i); });
      b.style.right = (78 + (i % 3) * 40) + 'px'; b.style.bottom = (i < 3 ? 2 : 42) + 'px'; mb.appendChild(b); sk.push(b);
    })(i); }
    document.body.appendChild(mb);
    setInterval(function(){                                       /* espelha icone e recarga da barra; troca ATACAR por ENTRAR/ABRIR perto de portal, bau ou porta */
      var pr = document.getElementById('portal-prompt'), ver = !!(pr && getComputedStyle(pr).display !== 'none' && pr.textContent.trim());
      modoUsar = ver; atk.classList.toggle('usar', ver); var tx = ver ? rotulo(pr.textContent) : 'ATACAR'; if(atk.textContent !== tx) atk.textContent = tx;
      var slots = document.querySelectorAll('.mu-hotbar-slot');
      for(var i = 0; i < 6; i++){
        var s = slots[i], b = sk[i]; if(!s || !b) continue;
        var ic = s.querySelector('.slot-icon'), cd = s.querySelector('.slot-cd-fill'), ct = s.querySelector('.slot-cd-txt');
        var h = ic ? ic.innerHTML : ''; if(b._h !== h){ b._h = h; b.querySelector('.ic').innerHTML = h; }
        b.style.display = h ? '' : 'none';
        b.querySelector('.cd').style.height = cd ? cd.style.height : '0'; b.querySelector('.ct').textContent = ct ? ct.textContent : '';
      }
    }, 200);
  }
  if(document.body) ini(); else document.addEventListener('DOMContentLoaded', ini);
})();
