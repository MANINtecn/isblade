/* PWA: registra o service worker e oferece "Instalar" (Android/PC) ou a dica do iPhone. Em localhost NAO registra (cache atrapalharia os testes);
   para testar o PWA localmente use ?pwa=1 na URL. */
(function(){
  var host = location.hostname, local = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host);
  var forcar = /[?&]pwa=1/.test(location.search); try { if(forcar) localStorage.setItem('isblade.pwa', '1'); } catch(e){}
  var ligado = !local || forcar || (function(){ try { return localStorage.getItem('isblade.pwa') === '1'; } catch(e){ return false; } })();
  var API = window.ISPWA = { pronto: false, instalavel: false, instalado: false, instalar: function(){ return Promise.resolve(false); } };
  if(!('serviceWorker' in navigator)) return;
  if(!ligado){ navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); if(window.caches) caches.keys().then(function(ks){ ks.forEach(function(k){ if(k.indexOf('is-') === 0) caches.delete(k); }); }); return; }
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').then(function(){ API.pronto = true; }).catch(function(e){ console.warn('PWA: sw falhou', e); }); });
  var standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true; API.instalado = standalone;
  var entrada = /selecao|index|criacao/.test(location.pathname) || location.pathname.slice(-1) === '/';
  function pilula(txt, fn){
    if(!entrada || standalone || document.getElementById('isPwaBtn')) return;
    var b = document.createElement('button'); b.id = 'isPwaBtn'; b.type = 'button'; b.textContent = txt;
    b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99999;padding:10px 16px;border-radius:999px;border:1px solid #f5c24a;background:rgba(5,6,13,.92);color:#f5c24a;font:600 13px system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;box-shadow:0 0 14px rgba(63,140,255,.35)';
    b.onclick = function(){ fn(b); }; document.body.appendChild(b);
  }
  var evt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); evt = e; API.instalavel = true;
    API.instalar = function(){ if(!evt) return Promise.resolve(false); evt.prompt(); return evt.userChoice.then(function(c){ evt = null; return c.outcome === 'accepted'; }); };
    if(document.body) pilula('Instalar app', function(b){ API.instalar().then(function(){ b.remove(); }); }); else window.addEventListener('DOMContentLoaded', function(){ pilula('Instalar app', function(b){ API.instalar().then(function(){ b.remove(); }); }); });
  });
  window.addEventListener('appinstalled', function(){ API.instalado = true; var b = document.getElementById('isPwaBtn'); if(b) b.remove(); });
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if(ios && !standalone){ var dono = false; try { dono = localStorage.getItem('isblade.iosDica') === '1'; } catch(e){}
    if(!dono) window.addEventListener('DOMContentLoaded', function(){ pilula('Instalar: Compartilhar > Adicionar a Tela de Inicio', function(b){ try { localStorage.setItem('isblade.iosDica', '1'); } catch(e){} b.remove(); }); }); }
})();
