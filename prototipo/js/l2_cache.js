/* Cache de modelos GLB (18/11/2026). Antes cada jogador/bot remoto fazia o download+parse completo do modelo (e da espada/escudo) de novo:
   ~100 geometrias e ~15 texturas novas POR jogador, travada de 300-500 ms ao entrar e memoria de video crescendo (no celular, o que derruba o jogo).
   Agora o arquivo e' lido UMA vez por URL; cada jogador recebe um CLONE que reaproveita geometrias, texturas e animacoes. So os materiais sao copiados (brilho/cor de cabelo
   sao por personagem). Mesma interface do GLTFLoader: L2Cache.loader().load(url, onLoad, onProgress, onError).
   Uso: var gltfLoader = window.L2Cache ? L2Cache.loader() : new THREE.GLTFLoader();   (precisa de THREE e THREE.GLTFLoader globais, como as paginas do jogo) */
(function(){
  var MODELOS = {};        /* url -> { gltf, espera: [[ok, erro], ...], falhou } */

  /* clone de malha com esqueleto (equivale ao SkeletonUtils.clone, que nao vem no vendor): geometrias e texturas continuam compartilhadas */
  function cloneEsqueleto(origem){
    var T = window.THREE, copia = origem.clone(true), a = [], b = [], idx = new Map(), i;
    origem.traverse(function(n){ idx.set(n, a.length); a.push(n); });
    copia.traverse(function(n){ b.push(n); });
    for(i = 0; i < a.length; i++){
      var s = a[i]; if(!s.isSkinnedMesh) continue;
      var d = b[i], ossos = s.skeleton.bones.map(function(o){ var k = idx.get(o); return k === undefined ? o : b[k]; });
      d.skeleton = new T.Skeleton(ossos, s.skeleton.boneInverses);
      d.bind(d.skeleton, s.bindMatrix);
    }
    return copia;
  }

  function entrega(g){
    var raiz = cloneEsqueleto(g.scene);
    raiz.traverse(function(o){
      if(!o.isMesh || !o.material) return;
      o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone();
    });
    return { scene: raiz, scenes: [raiz], animations: g.animations, cameras: g.cameras || [], asset: g.asset, parser: g.parser, userData: g.userData };
  }

  function Carregador(){}
  Carregador.prototype.load = function(url, ok, prog, erro){
    var m = MODELOS[url];
    if(m && m.gltf){ var g = m.gltf; setTimeout(function(){ try{ ok(entrega(g)); }catch(e){ if(erro) erro(e); else console.error('L2Cache', url, e); } }, 0); return; }
    if(m && !m.falhou){ m.espera.push([ok, erro]); return; }
    m = MODELOS[url] = { gltf: null, espera: [[ok, erro]], falhou: false };
    new window.THREE.GLTFLoader().load(url, function(g){
      m.gltf = g; var f = m.espera; m.espera = [];
      f.forEach(function(p){ try{ p[0](entrega(g)); }catch(e){ if(p[1]) p[1](e); else console.error('L2Cache', url, e); } });
    }, prog, function(e){
      m.falhou = true; var f = m.espera; m.espera = []; delete MODELOS[url];
      f.forEach(function(p){ if(p[1]) p[1](e); });
    });
  };
  var unico = null;
  window.L2Cache = {
    loader: function(){ return unico || (unico = new Carregador()); },
    cloneEsqueleto: cloneEsqueleto,
    quantos: function(){ return Object.keys(MODELOS).length; }
  };
})();
