/* Lagos do mundo aberto (10/11/2026, pedido do dono: "faca os lagos de verdade e nao partes do mar que invade; Blessing tem seu nivel baixo acessivel, la nao tem agua").
   Os lagos sao as BACIAS FECHADAS do terreno (tools/lagos_mundo.py -> assets/mundo/lagos.json): cada uma com o seu nivel (o ponto de transbordo mais baixo). Nada de plano de
   mar: cada lago e uma malha so sobre as celulas dele, na altura dele; o terreno esconde o excesso na beira. Cruma, Fortaleza e Pantano ficam de fora (Pantano: nivel baixo
   acessivel, sem agua). Aguas fundas (> 1,3 m) nao se atravessam a pe: o bin do mundo ja traz essas celulas como nao andaveis (cliente e servidor).
   Uso: Lagos.carregar(THREE, scene, { baixa }) depois do MundoCampo; Lagos.tick(dt) todo quadro; Lagos.profundidade(x, z) -> metros de agua acima do chao (0 = seco). */
window.Lagos = (function(){
  var L = { pronto: false, lagos: [], mesh: null }, uT = { value: 0 }, nivelEm = null;
  L.profundidade = function(x, z){
    if(!nivelEm) return 0; var k = nivelEm(x, z); if(k === null) return 0; var h = window.MundoCampo && MundoCampo.altura(x, z); return (h === null || h === undefined) ? 0 : Math.max(0, k - h);
  };
  /* distancia (m) da margem do lago mais proximo (aproximada: centro menos o raio da area); 1e9 sem lagos */
  L.distancia = function(x, z){ var d = 1e9; for(var i = 0; i < L.lagos.length; i++){ var q = L.lagos[i], k = Math.hypot(x - q.cx, z - q.cz) - q.raio; if(k < d) d = k; } return d; };
  L.carregar = function(THREE, scene, opt){
    opt = opt || {};
    return fetch('assets/mundo/lagos.json?v=' + Date.now().toString().slice(0, -5)).then(function(r){ return r.json(); }).then(function(J){
      var ps = J.passo, x0 = J.x0, z0 = J.z0, pos = [], col = [], idx = [], tem = new Map(), cel = new Map(), q = 0;
      L.lagos = J.lagos;
      J.lagos.forEach(function(lg){
        var S = new Set(); lg.celulas.forEach(function(c){ for(var a = -1; a <= 1; a++) for(var b = -1; b <= 1; b++) S.add((c[0] + a) + ',' + (c[1] + b)); });      /* +1 celula na beira: o terreno esconde o que sobrar */
        lg.celulas.forEach(function(c){ cel.set(c[0] + ',' + c[1], lg.nivel); });
        var vi = new Map();
        function vert(ci, cj){      /* canto da celula (ci, cj em meias celulas) */
          var key = lg.id + ':' + ci + ',' + cj, v = vi.get(key); if(v !== undefined) return v;
          var x = x0 + (ci - .5) * ps, z = z0 + (cj - .5) * ps, h = MundoCampo.altura(x, z), dep = h === null ? 0 : Math.max(0, lg.nivel - h), k = Math.min(1, dep / 3.2);
          pos.push(x, lg.nivel, z);
          col.push(.46 - .40 * k, .74 - .52 * k, .72 - .37 * k, Math.min(.93, .22 + dep * .42));      /* raso: verde-agua clarinho e quase transparente; fundo: azul escuro quase opaco */
          vi.set(key, q); return q++;
        }
        S.forEach(function(s){
          var p = s.split(','), i = +p[0], j = +p[1], a = vert(i, j), b2 = vert(i + 1, j), c2 = vert(i, j + 1), d = vert(i + 1, j + 1);
          idx.push(a, c2, b2, b2, c2, d);
        });
      });
      nivelEm = function(x, z){ var i = Math.round((x - x0) / ps), j = Math.round((z - z0) / ps), v = cel.get(i + ',' + j); return v === undefined ? null : v; };
      if(!pos.length){ L.pronto = true; return L; }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
      g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1)); g.computeVertexNormals(); g.computeBoundingSphere();
      var C = opt.baixa ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial, mat = new C({ vertexColors: true, transparent: true, depthWrite: false });
      if(!opt.baixa){ mat.roughness = .08; mat.metalness = .05; mat.emissive = new THREE.Color(0x0a2a38); mat.emissiveIntensity = .35; }
      mat.userData.lamb = 1;
      if(!opt.baixa) mat.onBeforeCompile = function(sh){      /* ondulacao suave (sem anel/circulo): so o brilho se mexe */
        sh.uniforms.uT = uT;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(position.x * 0.31 + uT * 0.9) * 0.035 + cos(position.z * 0.27 - uT * 0.7) * 0.03;');
      };
      var me = new THREE.Mesh(g, mat); me.name = 'LAGOS'; me.frustumCulled = true; me.renderOrder = 2; scene.add(me); L.mesh = me; L.pronto = true; return L;
    });
  };
  L.tick = function(dt){ uT.value += dt; };
  return L;
})();
