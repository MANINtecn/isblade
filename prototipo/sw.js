/* Service worker do jogo (PWA). Estrategia:
   - codigo (html, js, css, json): REDE PRIMEIRO, cache de reserva -> atualizacoes aparecem na hora e o jogo ainda abre offline;
   - assets pesados (glb, texturas, audio, vrm...): CACHE PRIMEIRO, guardados na primeira vez que sao pedidos (sem baixar tudo na instalacao);
   - a URL com ?v=N e parte da chave: subir o numero (ex.: guardian_anims.glb?v=3) busca o arquivo novo.
   Mudou algo aqui ou quer limpar tudo no aparelho? Suba VERSAO. */
var VERSAO = 'v2';                                                   /* sobe quando o CODIGO em cache precisa ser descartado nos aparelhos (abre as abas ja abertas de novo) */
var VERSAO_ASSETS = 'v1';                                            /* os assets pesados (100 MB) so mudam de nome se for preciso rebaixar tudo */
var CODIGO = 'is-codigo-' + VERSAO, ASSETS = 'is-assets-' + VERSAO_ASSETS;
var CASCA = ['./', 'selecao.html', 'criacao.html', 'arena.html', 'cidade.html', 'manifest.json', 'js/pwa.js', 'icons/icon-192.png', 'icons/icon-512.png'];
var EXT_ASSET = /\.(glb|gltf|vrm|fbx|png|jpg|jpeg|webp|svg|ogg|mp3|wav|woff2?|ttf|bin|md5anim|psa)$/i;

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CODIGO).then(function(c){ return Promise.all(CASCA.map(function(u){ return c.add(u).catch(function(){}); })); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CODIGO && k !== ASSETS && k.indexOf('is-') === 0; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }).then(function(){ return self.clients.matchAll({ type: 'window' }); }).then(function(cs){ cs.forEach(function(c){ try { c.navigate(c.url); } catch(e){} }); }));   /* abas abertas recarregam e pegam a versao nova */
});
self.addEventListener('fetch', function(e){
  var r = e.request, u = new URL(r.url);
  if(r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range')) return;       /* audio em pedacos e outros dominios: deixa passar */
  if(EXT_ASSET.test(u.pathname)){
    e.respondWith(caches.open(ASSETS).then(function(c){ return c.match(r).then(function(hit){
      if(hit) return hit;
      return fetch(r).then(function(res){ if(res && res.ok){ try { c.put(r, res.clone()).catch(function(){}); } catch(x){} } return res; });      /* falha ao guardar (sem espaco) nao pode derrubar o download */
    }); }).catch(function(){ return fetch(r); }));
    return;
  }
  e.respondWith(fetch(r).then(function(res){
    if(res && res.ok){ var cp = res.clone(); caches.open(CODIGO).then(function(c){ c.put(r, cp); }); }
    return res;
  }).catch(function(){ return caches.match(r).then(function(hit){ return hit || (r.mode === 'navigate' ? caches.match('selecao.html') : Response.error()); }); }));
});
