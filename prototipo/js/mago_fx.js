/* Efeitos do MAGO. Hoje: SHURIKEN DE VENTO (skill 1 do cajado).
   Modelo feito no Blender (prototipo/tools/blender_fx/mago_skill1_shuriken.py -> assets/fx/shuriken_vento.glb): estrela de 4 laminas "sugadas" por um buraco negro,
   aura e anel de vento do L2 (malhas windblowin03 / windknifewave00 com texturas do cliente), rastro em fitas e impacto em cortes. Materiais refeitos aqui (aditivos).
   Uso (arena/cidade):  MagoFX.init(THREE, scene);  var fx = MagoFX.criarShuriken(escala);  fx.update(dt, progresso0a1);  fx.dispose();  MagoFX.impacto(x, y, z, face, escala);
   Ligado por dados: data/armas/staff.json -> skills[1].proj.visual = "shuriken_vento".
   Eixos: no GLB a estrela fica no plano XZ e o voo e para -Z; o grupo gira PI para o voo ficar em +Z (o jogo usa +Z = frente). */
(function(){
  var M = window.MagoFX = { pronto: false };
  var T, cena, P = {}, TEX = {}, carregando = false, vivos = [];
  function leve(){ return !!(window.QUAL && (QUAL.nivel === 'baixa' || QUAL.touch)); }

  M.init = function(THREE_, scene_){ if(T) return; T = THREE_; cena = scene_; carrega(); };
  function carrega(){
    if(carregando) return; carregando = true;
    var tl = new T.TextureLoader(); TEX.t1 = tl.load('assets/fx/vento_t1.png?v=1'); TEX.t5 = tl.load('assets/fx/vento_t5.png?v=1');
    [TEX.t1, TEX.t5].forEach(function(t){ t.wrapS = t.wrapT = T.RepeatWrapping; });
    new T.GLTFLoader().load('assets/fx/shuriken_vento.glb?v=1', function(g){
      g.scene.traverse(function(o){ if(o.isMesh) P[o.name] = o; });
      M.pronto = !!(P.S1_estrela && P.S1_bn_nucleo && P.S1_bn_halo && P.S1_bn_disco && P.S1_aura_L2 && P.S1_anel_L2);
    }, undefined, function(e){ console.warn('MagoFX: nao carregou o modelo', e); });
  }

  /* ---------------- materiais ---------------- */
  var VERT_UV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  function matAco(){
    var Cls = leve() ? T.MeshLambertMaterial : T.MeshStandardMaterial;
    var m = new Cls({ color: 0x9db6c6, emissive: 0x143f36, side: T.DoubleSide });
    if(!leve()){ m.metalness = 0.55; m.roughness = 0.3; m.emissiveIntensity = 0.45; } else m.emissiveIntensity = 0.5;
    m.onBeforeCompile = function(sh){                      /* a raiz das laminas esquenta (branco-jade) perto do buraco negro */
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float hq = pow(1.0 - smoothstep(0.10, 0.60, length(vOP.xz)), 1.6); totalEmissiveRadiance += vec3(0.80, 1.0, 0.92) * hq * 0.9;');
    };
    return m;
  }
  function matHalo(){
    return new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(vec3(0.75, 1.0, 0.90) * 0.8, f * 0.9); }' });
  }
  function matDisco(u){
    return new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: u,
      vertexShader: VERT_UV,
      fragmentShader: 'uniform float uT; varying vec2 vUv; void main(){ float r = vUv.x, a = vUv.y; float n = 0.5 + 0.5 * sin(a * 37.7 + r * 9.0 - uT * 3.0) * (0.6 + 0.4 * sin(a * 12.5 + uT));' +
        ' float al = pow(1.0 - r, 1.4) * (0.35 + 0.65 * n); vec3 c = mix(vec3(1.0, 0.99, 0.9), vec3(0.38, 0.86, 0.74), smoothstep(0.0, 0.7, r)); gl_FragColor = vec4(c * 0.9, al * 0.8); }' });
  }
  function matL2(tex, cor, op){ return new T.MeshBasicMaterial({ map: tex, color: cor, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }); }
  function matFita(u, forca){
    return new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: u,
      vertexShader: VERT_UV,
      fragmentShader: 'uniform float uT; uniform float uK; uniform float uF; varying vec2 vUv; void main(){ float u = vUv.x, v = vUv.y; float edge = pow(1.0 - abs(v * 2.0 - 1.0), 1.3);' +
        ' float n = 0.55 + 0.45 * sin(u * 24.0 - uT * 9.0 + v * 3.0); float a = pow(1.0 - u, 1.4) * edge * n * uF; vec3 c = mix(vec3(1.0, 0.97, 0.86), vec3(0.40, 0.86, 0.74), smoothstep(0.0, 0.7, u)); gl_FragColor = vec4(c * uK, a); }' });
  }

  /* ---------------- fita (faixa plana): u ao longo, v na largura ---------------- */
  function fita(pts, larg){
    var n = pts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [], i, t = new T.Vector3(), rad = new T.Vector3(), lado = new T.Vector3();
    for(i = 0; i < n; i++){
      t.copy(pts[Math.min(i + 1, n - 1)]).sub(pts[Math.max(i - 1, 0)]).normalize(); rad.set(pts[i].x, pts[i].y, 0); if(rad.lengthSq() < 1e-6) rad.set(1, 0, 0); rad.normalize();
      lado.crossVectors(t, rad); if(lado.lengthSq() < 1e-6) lado.set(0, 1, 0); lado.normalize();
      pos[i * 6] = pts[i].x + lado.x * larg[i]; pos[i * 6 + 1] = pts[i].y + lado.y * larg[i]; pos[i * 6 + 2] = pts[i].z + lado.z * larg[i];
      pos[i * 6 + 3] = pts[i].x - lado.x * larg[i]; pos[i * 6 + 4] = pts[i].y - lado.y * larg[i]; pos[i * 6 + 5] = pts[i].z - lado.z * larg[i];
      uv[i * 4] = i / (n - 1); uv[i * 4 + 1] = 0; uv[i * 4 + 2] = i / (n - 1); uv[i * 4 + 3] = 1;
      if(i < n - 1){ var a = i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
    }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  function helice(fase, r0, r1, comp, voltas, larg0, onda){      /* eixo do voo = Z; a cauda vai para -Z */
    var pts = [], lg = [], i, s, r, ang;
    for(i = 0; i < 48; i++){ s = i / 47; r = r0 + (r1 - r0) * Math.pow(s, 0.75); ang = fase + voltas * 6.2832 * s + onda * Math.sin(s * 9 + fase);
      pts.push(new T.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, -0.35 - s * comp)); lg.push(larg0 * Math.sin(Math.min(1, s * 6) * 1.5708) * Math.pow(1 - s, 0.6) + 0.004); }
    return fita(pts, lg);
  }
  var ALEA = 7; function alea(){ ALEA = (ALEA * 16807) % 2147483647; return ALEA / 2147483647; }

  /* ---------------- a estrela ---------------- */
  M.criarShuriken = function(escala){
    escala = escala || 0.65;
    var raiz = new T.Group(), tor = new T.Group(), corpo = new T.Group(); raiz.add(tor); tor.add(corpo); corpo.rotation.y = Math.PI;
    raiz.scale.setScalar(escala);
    var uD = { uT: { value: 0 } }, uR = { uT: { value: 0 }, uK: { value: 1.3 }, uF: { value: 1 } }, uR2 = { uT: { value: 0 }, uK: { value: 0.9 }, uF: { value: 1 } }, geos = [], mats = [];
    var sc0 = P.S1_estrela.scale.x;
    function parte(nome, mat, filho){ var o = P[nome].clone(false); if(filho){ o.position.multiplyScalar(sc0); o.scale.multiplyScalar(sc0); } o.material = mat; mats.push(mat); corpo.add(o); return o; }
    var estrela = parte('S1_estrela', matAco()); parte('S1_bn_nucleo', new T.MeshBasicMaterial({ color: 0x000000 }), true); parte('S1_bn_halo', matHalo(), true);
    var disco = parte('S1_bn_disco', matDisco(uD), true);
    var aura = parte('S1_aura_L2', matL2(TEX.t1, 0xccffe6, 0.35)); var anelO = P.S1_anel_L2.clone(false); anelO.material = matL2(TEX.t5, 0xd9ffff, 0.5); mats.push(anelO.material);
    var anelW = new T.Group(); anelW.add(anelO); corpo.add(anelW);
    /* [mago] sem rastro de fitas: so a shuriken e seus efeitos (muitos magos juntos pesavam) */
    var i, m, g;
    corpo.traverse(function(o){ o.frustumCulled = false; });
    var rel = 0;
    return {
      group: raiz,
      update: function(dt, prog){
        rel += dt; uD.uT.value = rel; 
        estrela.rotation.y += Math.min(36 * dt, 0.70);                               /* gira no proprio eixo (limite por quadro: 4 laminas nao "voltam") */
        disco.rotation.y -= Math.min(31 * dt, 0.65); aura.rotation.y -= Math.min(24 * dt, 0.60); anelW.rotation.z += Math.min(10 * dt, 0.40);
        tor.rotation.z = Math.PI * Math.max(0, Math.min(1, prog || 0));                /* torce ate 180 graus no alvo */
      },
      dispose: function(){ if(raiz.parent) raiz.parent.remove(raiz); geos.forEach(function(x){ x.dispose(); }); mats.forEach(function(x){ x.dispose(); }); }
    };
  };

  /* ---------------- impacto: anel de vento do L2 que se abre + cortes em arco ---------------- */
  M.impacto = function(x, y, z, face, escala){
    if(!M.pronto || !cena) return; escala = escala || 0.65;
    var g = new T.Group(); g.position.set(x, y, z); g.rotation.y = face || 0; cena.add(g);
    var corpo = new T.Group(); corpo.rotation.y = Math.PI; g.add(corpo);
    var anel = P.S1_anel_L2.clone(false); anel.material = matL2(TEX.t5, 0xd9ffff, 0.75); corpo.add(anel);
    var uC = { uT: { value: 0 }, uK: { value: 1.5 }, uF: { value: 1 } }, mC = matFita(uC), geos = [], cortes = [], nc = leve() ? 5 : 9, i, k;
    for(i = 0; i < nc; i++){
      var R0 = 0.9 + alea() * 0.6, arco = 0.9 + alea() * 0.6, pts = [], lg = [], t;
      for(k = 0; k < 26; k++){ t = k / 25; var a = -arco / 2 + arco * t, rr = R0 * (0.55 + 0.45 * t); pts.push(new T.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0)); lg.push(0.055 * Math.pow(Math.sin(Math.PI * t), 0.9) + 0.004); }
      var ge = fita(pts, lg); geos.push(ge); var me = new T.Mesh(ge, mC); me.frustumCulled = false;
      me.rotation.set((alea() - 0.5) * 2.1, (alea() - 0.5) * 1.4, i * 6.2832 / nc + (alea() - 0.5) * 0.3); me.scale.setScalar(0.001); g.add(me); cortes.push({ o: me, s: 0.9 + alea() * 0.35 });
    }
    g.scale.setScalar(escala); anel.scale.multiplyScalar(0.001);
    var e0 = anel.userData.e0 = P.S1_anel_L2.scale.x, vida = 0.62, t0 = 0;
    vivos.push({ t: 0, tick: function(dt){
      t0 += dt; var u = Math.min(1, t0 / vida), eo = 1 - Math.pow(1 - u, 3);
      anel.scale.setScalar(e0 * (0.1 + 2.3 * eo)); anel.material.opacity = Math.max(0, 1 - u * u);
      uC.uT.value = t0; uC.uF.value = Math.max(0, 1 - u * u); cortes.forEach(function(c){ c.o.scale.setScalar(c.s * (0.35 + 1.0 * eo)); });
      if(u >= 1){ cena.remove(g); geos.forEach(function(x){ x.dispose(); }); mC.dispose(); anel.material.dispose(); return true; }
      return false; } });
  };
  M._cena = function(){ return cena; };                                          /* so para depuracao/testes */
  M.tick = function(dt){ for(var i = vivos.length - 1; i >= 0; i--) if(vivos[i].tick(dt)) vivos.splice(i, 1); };
})();
