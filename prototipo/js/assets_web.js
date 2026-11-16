/* Entrega de assets (regras em REGRAS_ASSETS_WEB.md). O codigo do jogo continua pedindo o arquivo de ORIGEM ('assets/x.glb?v=3');
   este modulo troca pela versao de ENTREGA ('assets_web/x.glb?h=<hash>': meshopt + WebP), gerada por tools/assets_web/otimizar.mjs.
   A lista vem de js/assets_manifesto.js (gerado). Se a entrega falhar, cai na origem e avisa no console: o jogo nunca fica sem o modelo.
   Desligar para comparar/depurar:  ?brutos=1 na URL   ou   localStorage.isblade_assets_brutos = '1'.
   Uso:  script classico, DEPOIS de lib/meshopt_decoder.js e js/assets_manifesto.js. Nas paginas-modulo (three pelo vendor.js):
         AssetsWeb.instala(THREE.GLTFLoader);   logo depois do import. Com o three global (selecao.html) instala sozinho.
         AssetsWeb.url(u) -> URL de entrega;  AssetsWeb.busca(u, opcoes) -> fetch com queda para a origem (GLB lido por fetch + parse). */
(function(){
  var M = (window.ASSETS_WEB && window.ASSETS_WEB.m) || {}, desl = false;
  try { desl = /[?&]brutos=1/.test(location.search) || localStorage.getItem('isblade_assets_brutos') === '1'; } catch(_){}
  var A = window.AssetsWeb = { falhas: [], trocas: 0, ligado: !desl };

  A.url = function(u){
    if(desl || typeof u !== 'string' || !window.MeshoptDecoder) return u;              /* sem decodificador nao da para ler a entrega */
    var q = u.indexOf('?'), p = (q < 0 ? u : u.slice(0, q)).replace(/^\.\//, ''), h = M[p];
    return h ? 'assets_web/' + p.slice(7) + '?h=' + h : u;                             /* as chaves comecam sempre com 'assets/' */
  };

  A.busca = function(u, op){
    var n = A.url(u);
    if(n === u) return fetch(u, op);
    A.trocas++;
    return fetch(n, op).then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r; })
      .catch(function(e){ console.warn('[assets-web] entrega falhou, usando a origem:', u, e); A.falhas.push(u); return fetch(u, op); });
  };

  A.instala = function(L){
    if(!L || !L.prototype || L.prototype.__assetsWeb) return;
    var P = L.prototype, load = P.load, parse = P.parse; P.__assetsWeb = true;
    function dec(l){ if(window.MeshoptDecoder && l.setMeshoptDecoder && !l.meshoptDecoder) l.setMeshoptDecoder(window.MeshoptDecoder); }
    P.load = function(u, ok, prog, err){
      var l = this, n = A.url(u); dec(l);
      if(n === u) return load.call(l, u, ok, prog, err);
      A.trocas++;
      return load.call(l, n, ok, prog, function(e){
        console.warn('[assets-web] entrega falhou, usando a origem:', u, e); A.falhas.push(u);
        load.call(l, u, ok, prog, err);
      });
    };
    P.parse = function(){ dec(this); return parse.apply(this, arguments); };
  };

  if(window.THREE && window.THREE.GLTFLoader) A.instala(window.THREE.GLTFLoader);        /* three global (selecao.html) */
})();
