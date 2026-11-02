/* giro.js — tela deitada AUTOMATICA em todas as paginas (celular/tablet).
   - Ao abrir: tenta travar em horizontal na hora (funciona no app instalado/PWA).
   - No navegador o Android so deixa travar em tela cheia: o 1o toque em qualquer lugar entra em tela cheia + trava.
   - iPhone/iPad (sem trava): aviso "Gire o celular" enquanto estiver em pe.
   Em PC nao faz nada. Independente do mobile.js (que cuida dos botoes do jogo): os dois podem estar na mesma pagina. */
(function(){
  if(window.__giro) return; window.__giro = 1;
  var touch = false;
  try { touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 1); } catch(e){}
  if(!touch) return;
  var de = document.documentElement, ult = 0;
  function trava(){ try { var p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if(p && p.catch) p.catch(function(){}); } catch(e){} }
  function telaCheia(){
    var fs = document.fullscreenElement || document.webkitFullscreenElement, t = Date.now();
    var rf = de.requestFullscreen || de.webkitRequestFullscreen;
    if(!fs && rf && t - ult > 1500){ ult = t;
      try { var r = rf.call(de, { navigationUI: 'hide' }); if(r && r.then) r.then(trava, trava); else trava(); } catch(e){ trava(); } }
    else trava();
  }
  trava();
  ['pointerdown', 'touchend'].forEach(function(ev){ document.addEventListener(ev, telaCheia, { capture: true, passive: true }); });
  document.addEventListener('fullscreenchange', trava);
  window.addEventListener('orientationchange', trava);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') trava(); });
  /* aviso de reserva (iPhone e quem recusou tela cheia); o mobile.js ja tem o seu (#mbgira) */
  function aviso(){
    if(document.getElementById('mbgira') || document.getElementById('giroAviso')) return;
    var st = document.createElement('style');
    st.textContent = '#giroAviso{position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#03050c;color:#9fc4ff;font:600 18px system-ui,sans-serif;text-align:center;padding:24px}#giroAviso i{font-size:64px;font-style:normal;animation:giroA 2s ease-in-out infinite}#giroAviso small{font-weight:400;font-size:13px;color:#7f93b4}@keyframes giroA{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}@media (orientation:portrait){#giroAviso{display:flex}}';
    document.head.appendChild(st);
    var g = document.createElement('div'); g.id = 'giroAviso'; g.innerHTML = '<i>📱</i>Gire o celular<small>O jogo é jogado com o celular deitado (horizontal).</small>'; document.body.appendChild(g);
  }
  if(document.body) aviso(); else document.addEventListener('DOMContentLoaded', aviso);
})();
