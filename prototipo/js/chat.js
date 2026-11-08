/* Chat no estilo Lineage 2 (arena e cidade).
   Enter abre/manda; Esc fecha. Texto normal = geral (todos do seu canal/mapa). Começando com # = grupo (verde, chega em qualquer mapa).
   No celular: botão "CHAT" no canto esquerdo. As linhas somem depois de 15 s; com o chat aberto aparece o histórico (últimas 40).
   Uso:  Chat.init({ enviar: function(texto, canal){ Net.chat(texto, canal); } });   Chat.recebe({ n, m, c });   Chat.sistema('texto');
   Enquanto o campo está aberto, as teclas não chegam ao jogo (o evento para no campo). */
(function(){
  var C = window.Chat = { aberto: false };
  var box, log, campo, btn, linhas = [], cfg = {}, MAXL = 40;
  var COR = { g: '#7dff8a', s: '#f2d27a', '': '#e8eefc' };
  function esc(t){ return String(t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toque(){ return !!(window.QUAL && QUAL.touch); }

  function monta(){
    if(box) return;
    var st = document.createElement('style');
    st.textContent = '#chatBox{position:fixed;left:10px;bottom:150px;width:min(400px,46vw);z-index:60;pointer-events:none;font:13px/1.35 system-ui,sans-serif;text-shadow:0 1px 2px #000,0 0 3px #000}' +
      '#chatBox.toq{bottom:auto;top:178px;width:min(330px,42vw);font-size:12px}' +
      '#chatLog div{padding:1px 4px;transition:opacity .6s;word-wrap:break-word}#chatLog div.velha{opacity:0}#chatBox.on #chatLog{background:rgba(5,10,24,.55);border-radius:6px;max-height:34vh;overflow-y:auto;pointer-events:auto}' +
      '#chatBox.on #chatLog div.velha{opacity:1}#chatCampo{display:none;pointer-events:auto;width:100%;box-sizing:border-box;margin-top:4px;padding:7px 9px;background:rgba(5,10,24,.88);color:#fff;border:1px solid #2b3a63;border-radius:6px;font:inherit;outline:none}' +
      '#chatBox.on #chatCampo{display:block}#chatBtn{position:fixed;left:10px;top:138px;z-index:61;pointer-events:auto;font:700 11px system-ui,sans-serif;color:#cfe0ff;background:rgba(10,18,36,.75);border:1px solid #2b3a63;border-radius:6px;padding:6px 10px;letter-spacing:.5px}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'chatBox'; if(toque()) box.className = 'toq';
    box.innerHTML = '<div id="chatLog"></div><input id="chatCampo" maxlength="120" autocomplete="off" placeholder="Enter manda · # no começo = grupo · Esc fecha">';
    document.body.appendChild(box); log = box.querySelector('#chatLog'); campo = box.querySelector('#chatCampo');
    ['keydown', 'keyup', 'keypress'].forEach(function(t){ campo.addEventListener(t, function(e){ e.stopPropagation(); if(t === 'keydown'){ if(e.key === 'Enter'){ e.preventDefault(); manda(); } else if(e.key === 'Escape'){ e.preventDefault(); fecha(); } } }); });
    campo.addEventListener('blur', function(){ setTimeout(function(){ if(C.aberto && document.activeElement !== campo && !campo.value) fecha(); }, 150); });
    if(toque()){ btn = document.createElement('button'); btn.id = 'chatBtn'; btn.type = 'button'; btn.textContent = 'CHAT'; btn.addEventListener('click', function(e){ e.stopPropagation(); C.aberto ? fecha() : abre(); }); document.body.appendChild(btn); }
    window.addEventListener('keydown', function(e){
      if(e.key !== 'Enter' || C.aberto || e.repeat) return;
      var a = document.activeElement; if(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return;
      e.preventDefault(); abre();
    });
  }
  function abre(){ monta(); C.aberto = true; box.classList.add('on'); campo.value = ''; try { if(document.pointerLockElement) document.exitPointerLock(); } catch(e){} setTimeout(function(){ campo.focus(); }, 0); log.scrollTop = log.scrollHeight; }
  function fecha(){ C.aberto = false; box.classList.remove('on'); campo.blur(); }
  function manda(){
    var t = campo.value.trim(); campo.value = '';
    if(t){ var canal = ''; if(t.charAt(0) === '#'){ canal = 'g'; t = t.slice(1).trim(); } if(t && cfg.enviar) cfg.enviar(t, canal); }
    fecha();
  }
  function poe(html, cor){
    monta(); var d = document.createElement('div'); d.style.color = cor; d.innerHTML = html; log.appendChild(d); linhas.push(d);
    while(linhas.length > MAXL){ var v = linhas.shift(); if(v.parentNode) v.parentNode.removeChild(v); }
    setTimeout(function(){ d.classList.add('velha'); }, 15000); log.scrollTop = log.scrollHeight;
  }
  C.init = function(o){ cfg = o || {}; if(document.body) monta(); else document.addEventListener('DOMContentLoaded', monta); };
  C.recebe = function(m){ if(m.c === 's'){ C.sistema(m.m || ''); return; } var c = m.c === 'g' ? 'g' : ''; poe((c === 'g' ? '(Grupo) ' : '') + '<b>' + esc(m.n || '?') + '</b>: ' + esc(m.m || ''), COR[c]); };
  C.sistema = function(t){ poe(esc(t), COR.s); };
  C.abrir = abre;
})();
