/* Entrega de assets (regras em REGRAS_ASSETS_WEB.md). O codigo do jogo continua pedindo o arquivo de ORIGEM ('assets/x.glb?v=3');
   este modulo troca pela versao de ENTREGA ('assets_web/x.glb?h=<hash>': meshopt + WebP), gerada por tools/assets_web/otimizar.mjs.
   A lista vem de js/assets_manifesto.js (gerado). Se a entrega falhar, cai na origem e avisa no console: o jogo nunca fica sem o modelo.
   Desligar para comparar/depurar:  ?brutos=1 na URL   ou   localStorage.isblade_assets_brutos = '1'.
   Uso:  script classico, DEPOIS de lib/meshopt_decoder.js e js/assets_manifesto.js. Nas paginas-modulo (three pelo vendor.js):
         AssetsWeb.instala(THREE.GLTFLoader);   logo depois do import. Com o three global (selecao.html) instala sozinho.
         AssetsWeb.url(u) -> URL de entrega;  AssetsWeb.busca(u, opcoes) -> fetch com queda para a origem (GLB lido por fetch + parse). */
(function(){
  var M = (window.ASSETS_WEB && window.ASSETS_WEB.m) || {}, K = (window.ASSETS_WEB && window.ASSETS_WEB.k) || {}, desl = false;
  try { desl = /[?&]brutos=1/.test(location.search) || localStorage.getItem('isblade_assets_brutos') === '1'; } catch(_){}
  var A = window.AssetsWeb = { falhas: [], trocas: 0, ligado: !desl, ktx: false, pronto: null, pend: 0 };      /* ktx: o transcodificador KTX2 esta pronto (so paginas que passam o THREE do vendor.js a instala) */

  function chave(u){ var q = u.indexOf('?'); return (q < 0 ? u : u.slice(0, q)).replace(/^\.\//, ''); }
  A.url = function(u){
    if(desl || typeof u !== 'string' || !window.MeshoptDecoder) return u;              /* sem decodificador nao da para ler a entrega */
    var p = chave(u), h = M[p];
    if(h && K[p] && !A.ktx) return u;                                                  /* entrega com textura KTX2 so vale se esta pagina sabe ler KTX2 */
    return h ? 'assets_web/' + p.slice(7) + '?h=' + h : u;                             /* as chaves comecam sempre com 'assets/' */
  };
  A.espera = function(u){ return (!desl && A.pronto && !fim && typeof u === 'string' && K[chave(u)]) ? A.pronto : null; };   /* promessa enquanto o KTX2 ainda esta subindo */

  A.busca = function(u, op){
    var w = A.espera(u); if(w) return w.then(function(){ return A.busca(u, op); });
    var n = A.url(u);
    if(n === u) return fetch(u, op);
    A.trocas++;
    return fetch(n, op).then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r; })
      .catch(function(e){ console.warn('[assets-web] entrega falhou, usando a origem:', u, e); A.falhas.push(u); return fetch(u, op); });
  };

  /* KTX2 (Basis): textura comprimida direto na placa de video (4 a 8x menos memoria que PNG/WebP decodificado). O three do jogo (vendor.js) nao traz o KTX2Loader:
     ele fica em lib/ktx2_loader.js (importa o vendor.js) com o transcodificador em lib/basis/. Se nao subir, as paginas usam a origem (PNG/JPG), como antes. */
  var kloader = null, fim = false;                                                      /* fim: o KTX2 acabou de subir (ou falhou): nao ha mais o que esperar */
  function sobeKtx(T){
    if(A.pronto || desl || !T || !T.WebGLRenderer || typeof document === 'undefined') return;
    A.pronto = import(new URL('lib/ktx2_loader.js', document.baseURI).href).then(function(m){
      var r = new T.WebGLRenderer({ canvas: document.createElement('canvas') });       /* so para o detectSupport ler as extensoes da placa; some logo depois */
      var l = new m.KTX2Loader().setTranscoderPath(new URL('lib/basis/', document.baseURI).href).setWorkerLimit(2);
      l.detectSupport(r); try { r.dispose(); r.forceContextLoss(); } catch(_){}
      kloader = l; A.ktx = true; fim = true;
    }).catch(function(e){ A.ktx = false; fim = true; console.warn('[assets-web] KTX2 indisponivel, usando a origem:', e); });
  }
  A.instala = function(L, T){
    if(!L || !L.prototype || L.prototype.__assetsWeb) return;
    sobeKtx(T);
    var P = L.prototype, load = P.load, parse = P.parse; P.__assetsWeb = true;
    function dec(l){ if(window.MeshoptDecoder && l.setMeshoptDecoder && !l.meshoptDecoder) l.setMeshoptDecoder(window.MeshoptDecoder); if(kloader && l.setKTX2Loader && !l.ktx2Loader) l.setKTX2Loader(kloader); }
    function conta(ok, err){                                                           /* conta o que esta em andamento: A.pend e A.quieto() (tela de carregamento espera tudo chegar) */
      A.pend++; var f = false; function fim(){ if(!f){ f = true; A.pend--; } }
      return [function(){ fim(); return ok && ok.apply(this, arguments); }, function(){ fim(); return err && err.apply(this, arguments); }];
    }
    function carrega(u, ok, prog, err){
      var l = this, w = A.espera(u);
      if(w) return void w.then(function(){ carrega.call(l, u, ok, prog, err); });
      var n = A.url(u); dec(l);
      if(n === u) return load.call(l, u, ok, prog, err);
      A.trocas++;
      return load.call(l, n, ok, prog, function(e){
        console.warn('[assets-web] entrega falhou, usando a origem:', u, e); A.falhas.push(u);
        load.call(l, u, ok, prog, err);
      });
    }
    P.load = function(u, ok, prog, err){ var c = conta(ok, err); return carrega.call(this, u, c[0], prog, c[1]); };
    P.parse = function(d, path, ok, err){ dec(this); if(typeof ok !== 'function') return parse.apply(this, arguments); var c = conta(ok, err); return parse.call(this, d, path, c[0], c[1]); };
  };

  /* A tela de carregamento so sai quando nenhum modelo esta mais chegando (e fica assim por ~1,2 s: da tempo de montar e mandar para a placa de video). Limite: max ms. */
  A.quieto = function(cb, max){
    var t0 = Date.now(), calmo = 0, lim = max || 30000;
    (function v(){ calmo = A.pend === 0 ? calmo + 1 : 0; if(calmo >= 12 || Date.now() - t0 > lim) return cb(); setTimeout(v, 100); })();
  };

  if(window.THREE && window.THREE.GLTFLoader) A.instala(window.THREE.GLTFLoader);        /* three global (selecao.html) */
})();
