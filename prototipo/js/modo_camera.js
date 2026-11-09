/* Modo camera para gravar video (PC): F9 esconde/mostra a HUD (fica so o jogo), F10 troca a velocidade (normal -> 1/2 -> 1/4 -> normal).
   A camera continua a do jogo (mouse gira, roda aproxima). A velocidade so vale neste navegador (o servidor e os outros jogadores seguem normais).
   Na pagina: dt do quadro x ModoCamera.escala. */
(function(){
  var M = window.ModoCamera = { escala: 1, limpa: false }, VEL = [1, .5, .25], vi = 0, aviso = null, tAviso = 0;
  var st = document.createElement('style');
  st.textContent = 'body.cam-limpa > *:not(#scene):not(#camAviso):not(script):not(style){visibility:hidden !important}' +
    '#camAviso{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;pointer-events:none;padding:6px 14px;border-radius:6px;background:rgba(6,10,20,.82);color:#f5c451;font:700 12px system-ui,sans-serif;letter-spacing:.1em;transition:opacity .4s}';
  document.head.appendChild(st);
  function avisa(t){
    if(!aviso){ aviso = document.createElement('div'); aviso.id = 'camAviso'; document.body.appendChild(aviso); }
    aviso.textContent = t; aviso.style.opacity = '1'; clearTimeout(tAviso); tAviso = setTimeout(function(){ aviso.style.opacity = '0'; }, 1600);
  }
  function digitando(){ var a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)); }
  window.addEventListener('keydown', function(e){
    if(digitando()) return;
    if(e.key === 'F9'){ e.preventDefault(); M.limpa = !M.limpa; document.body.classList.toggle('cam-limpa', M.limpa); avisa(M.limpa ? 'MODO CAMERA: HUD escondida (F9 volta)' : 'HUD de volta'); }
    else if(e.key === 'F10'){ e.preventDefault(); vi = (vi + 1) % VEL.length; M.escala = VEL[vi]; avisa(M.escala === 1 ? 'Velocidade normal' : 'Camera lenta: ' + (M.escala === .5 ? '1/2' : '1/4') + ' (F10 troca)'); }
  }, true);
})();
