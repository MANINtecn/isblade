/* Service worker do jogo (PWA). So cuida dos ARQUIVOS PESADOS do jogo (modelos 3D, texturas, sons, ...): cache-primeiro, guardados na primeira vez que sao pedidos.
   Paginas, scripts, estilos e JSON NAO passam por aqui: vao sempre para a rede (o navegador cuida do cache HTTP), entao o site nunca fica preso numa versao antiga.
   A URL com ?v=N faz parte da chave: subir o numero (ex.: guardian_anims.glb?v=3) busca o arquivo novo.
   Quer limpar os assets de todos os aparelhos? Suba VERSAO_ASSETS. */
var VERSAO_ASSETS = 'v1';
var ASSETS = 'is-assets-' + VERSAO_ASSETS;
var EXT_ASSET = /\.(glb|gltf|vrm|fbx|png|jpg|jpeg|webp|svg|ogg|mp3|wav|woff2?|ttf|bin|md5anim|psa)$/i;

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf('is-') === 0 && k !== ASSETS; }).map(function(k){ return caches.delete(k); }));      /* some o cache antigo de codigo/paginas */
  }).then(function(){ return self.clients.claim(); }).then(function(){ return self.clients.matchAll({ type: 'window' }); }).then(function(cs){
    cs.forEach(function(c){ try { c.navigate(c.url); } catch(x){} });                                                                              /* abas abertas recarregam e pegam a pagina nova */
  }));
});
self.addEventListener('fetch', function(e){
  var r = e.request, u = new URL(r.url);
  if(r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range')) return;       /* audio em pedacos e outros dominios: deixa passar */
  if(!EXT_ASSET.test(u.pathname)) return;                                                          /* paginas, js, css, json: rede direto, sem cache do app */
  e.respondWith(caches.open(ASSETS).then(function(c){ return c.match(r).then(function(hit){
    if(hit) return hit;
    return fetch(r).then(function(res){ if(res && res.ok){ try { c.put(r, res.clone()).catch(function(){}); } catch(x){} } return res; });      /* falha ao guardar (sem espaco) nao derruba o download */
  }); }).catch(function(){ return fetch(r); }));
});
