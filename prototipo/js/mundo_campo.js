/* Mundo aberto, etapa 1 (09/11/2026): terreno de fora da muralha vindo do mapa-mundi do Blender (tools/blender_mundo/exporta_mundo.py -> assets/mundo/).
   Monta o chao do mundo inteiro numa malha so (passo 6 m; 12 m no celular basico), com a textura fundida por bioma (campo, Cruma, Fortaleza,
   Pantano, Torre: cada uma na mesma escala do proprio mapa) e rocha nas encostas e montanhas, tudo no shader (leve).
   Uso: MundoCampo.carregar(THREE, scene, { baixa }) -> Promise;  MundoCampo.altura(x, z) (null fora da grade);  MundoCampo.regiao(x, z)
        (0 campo, 1 Cruma, 2 Fortaleza, 3 Pantano, 4 Torre);  MundoCampo.anda(x, z);  MundoCampo.dados (cabecalho: mapas, spots...). */
window.MundoCampo = (function(){
  var M = { pronto: false, dados: null }, H = null, P = null, RG = null, AN = null, nx = 0, nz = 0, x0 = 0, z0 = 0, ps = 3;
  var BASE = 'assets/mundo/';
  function cel(x, z){ return [(x - x0) / ps, (z - z0) / ps]; }
  var SM = 2;                                      /* passo da malha DESENHADA em celulas (2 = 6 m; 4 = 12 m no modo baixa) */
  /* altura da grade fina de 3 m (bilinear): para ferramentas e testes */
  M.alturaFina = function(x, z){
    if(!H) return null; var c = cel(x, z), i = Math.floor(c[0]), j = Math.floor(c[1]);
    if(i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return null;
    var fx = c[0] - i, fz = c[1] - j, k = j * nx + i;
    var a = H[k] + (H[k + 1] - H[k]) * fx, b = H[k + nx] + (H[k + nx + 1] - H[k + nx]) * fx; return a + (b - a) * fz;
  };
  /* [malha] 10/11/2026: o personagem pisa na MESMA superficie que e desenhada (mesmos vertices e mesma diagonal dos triangulos): antes a altura vinha da
     grade fina e a malha era mais grossa (6 m; 12 m no celular basico), entao em encostas o personagem entrava no chao ou flutuava (em 12 m: 5% dos pontos
     com mais de 1 m de erro, em penhasco ate dezenas de metros) */
  function hv(i, j){ return H[Math.min(nz - 1, j * SM) * nx + Math.min(nx - 1, i * SM)]; }
  M.altura = function(x, z){
    if(!H) return null; var c = cel(x, z); if(c[0] < 0 || c[1] < 0 || c[0] >= nx - 1 || c[1] >= nz - 1) return null;
    var gx = Math.floor((nx - 1) / SM) + 1, gz = Math.floor((nz - 1) / SM) + 1, u = c[0] / SM, v = c[1] / SM, i = Math.min(gx - 2, Math.floor(u)), j = Math.min(gz - 2, Math.floor(v)), tx = u - i, tz = v - j;
    var h00 = hv(i, j), h10 = hv(i + 1, j), h01 = hv(i, j + 1), h11 = hv(i + 1, j + 1);
    return tx + tz <= 1 ? h00 + (h10 - h00) * tx + (h01 - h00) * tz : h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);      /* triangulo (a,c,b) ou (b,c,d) da malha */
  };
  function amostra(A, x, z){ if(!A) return 0; var c = cel(x, z), i = Math.round(c[0]), j = Math.round(c[1]); if(i < 0 || j < 0 || i >= nx || j >= nz) return 0; return A[j * nx + i]; }
  M.regiao = function(x, z){ return amostra(RG, x, z); };
  M.anda = function(x, z){ return !!amostra(AN, x, z); };
  M.carregar = function(THREE, scene, opt){
    opt = opt || {};
    var v = '?v=' + Date.now().toString().slice(0, -5);
    return Promise.all([fetch(BASE + 'mundo_grade.json' + v).then(function(r){ return r.json(); }), fetch(BASE + 'mundo_grade.bin' + v).then(function(r){ return r.arrayBuffer(); })]).then(function(q){
      var J = q[0], dv = new DataView(q[1]); M.dados = J; nx = J.nx; nz = J.nz; x0 = J.x0; z0 = J.z0; ps = J.passo; var B = J.bytes_celula || 9, n = nx * nz;
      H = new Float32Array(n); P = new Uint8Array(n * 5); RG = new Uint8Array(n); AN = new Uint8Array(n);
      for(var k = 0; k < n; k++){ var o = k * B; H[k] = dv.getInt16(o, true) / 100; for(var b = 0; b < 5; b++) P[k * 5 + b] = dv.getUint8(o + 2 + b); RG[k] = dv.getUint8(o + 7); AN[k] = dv.getUint8(o + 8); }
      /* malha (passo de s celulas) */
      var s = SM = opt.baixa ? 4 : 2, gx = Math.floor((nx - 1) / s) + 1, gz = Math.floor((nz - 1) / s) + 1, N = gx * gz;
      var pos = new Float32Array(N * 3), p1 = new Float32Array(N * 4), p2 = new Float32Array(N), idx = [];
      for(var j = 0; j < gz; j++) for(var i = 0; i < gx; i++){
        var ci = Math.min(nx - 1, i * s), cj = Math.min(nz - 1, j * s), kk = cj * nx + ci, t = j * gx + i, x = x0 + ci * ps, z = z0 + cj * ps;
        var y = H[kk]; if(Math.hypot(x, z) < 88) y -= 1.5;                       /* dentro da muralha fica o chao da cidade (este afunda e some) */
        pos[t * 3] = x; pos[t * 3 + 1] = y; pos[t * 3 + 2] = z;
        p1[t * 4] = P[kk * 5] / 255; p1[t * 4 + 1] = P[kk * 5 + 1] / 255; p1[t * 4 + 2] = P[kk * 5 + 2] / 255; p1[t * 4 + 3] = P[kk * 5 + 3] / 255; p2[t] = P[kk * 5 + 4] / 255;
      }
      for(var j2 = 0; j2 < gz - 1; j2++) for(var i2 = 0; i2 < gx - 1; i2++){ var a = j2 * gx + i2, b2 = a + 1, c = a + gx, d = c + 1; idx.push(a, c, b2, b2, c, d); }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('peso1', new THREE.BufferAttribute(p1, 4)); g.setAttribute('peso2', new THREE.BufferAttribute(p2, 1));
      g.setIndex(N > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1)); g.computeVertexNormals(); g.computeBoundingSphere();
      /* textura fundida */
      var tl = new THREE.TextureLoader(), U = {};
      J.texturas.forEach(function(tx, i){ var t = tl.load(BASE + tx.arquivo + v); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = opt.baixa ? 1 : 4; U['tSolo' + i] = { value: t }; U['eSolo' + i] = { value: 1 / tx.metros }; });
      var mat = new THREE.MeshStandardMaterial({ roughness: .95, metalness: 0 });
      mat.onBeforeCompile = function(sh){
        Object.keys(U).forEach(function(k){ sh.uniforms[k] = U[k]; });
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 peso1; attribute float peso2; varying vec4 vP1; varying float vP2; varying vec3 vMW; varying vec3 vNW;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP1 = peso1; vP2 = peso2; vMW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNW = normalize(mat3(modelMatrix) * objectNormal);');
        var dec = 'varying vec4 vP1; varying float vP2; varying vec3 vMW; varying vec3 vNW;\n'; for(var i = 0; i < 6; i++) dec += 'uniform sampler2D tSolo' + i + '; uniform float eSolo' + i + ';\n';
        dec += 'vec3 solo(sampler2D t, float e){ return pow(texture2D(t, vMW.xz * e).rgb, vec3(2.2)); }\n';
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + dec).replace('#include <map_fragment>',
          'vec3 cS = solo(tSolo0, eSolo0) * vP1.x + solo(tSolo1, eSolo1) * vP1.y + solo(tSolo2, eSolo2) * vP1.z + solo(tSolo3, eSolo3) * vP1.w + solo(tSolo4, eSolo4) * vP2;\n' +
          'float rocha = max(smoothstep(.92, .72, vNW.y), smoothstep(28.0, 55.0, vMW.y));\n' +
          'cS = mix(cS, solo(tSolo5, eSolo5), rocha);\n diffuseColor.rgb *= cS;');
      };
      var me = new THREE.Mesh(g, mat); me.receiveShadow = true; me.frustumCulled = false; me.name = 'MUNDO_TERRENO'; scene.add(me); M.mesh = me;
      M.pronto = true; return M;
    });
  };
  return M;
})();
