/* >>> CLAUDE [aura-chefe] 17/11/2026 (dono): chefes de campo do mapa-mundi (Nv 20 em diante, tipos `chefe*` do dungeon.json) maiores e com aura no contorno.
   Duas camadas:
   1) Contorno (rim light / fresnel): uma "casca" de cada malha do modelo, inchada um pouco pela normal e presa ao MESMO esqueleto (anima junto).
      Brilha so nas bordas da silhueta, com um ruido que sobe (textura de chama, nada chapado).
   2) Particulas de superficie: brasas nascem em vertices sorteados da malha ANIMADA (getVertexPosition ja aplica os ossos) e sobem.
      Formato losango com feixe anamorfico (regra do Optical Lens Flare; nada redondo). Paleta de explosao: branco-quente -> cor do chefe -> brasa escura.
   API: AuraChefe.init(THREE, scene, prep) ; AuraChefe.preparar(cenaDoModelo, css) ; AuraChefe.liga(m, css) ; AuraChefe.solta(m) ; AuraChefe.tick(dt, camera, renderer).
   REGRA de preparo: os shaders sao compilados antes de aparecer (preparar no carregamento do modelo; se faltar, liga() compila e so mostra quando terminar). */
(function(){
  var THREE = null, CENA = null, PREP = null, ATIVAS = [], MATS = {}, UT = { value: 0 }, UESC = { value: 600 }, PRONTO = {}, PTS_MAT = null;
  var NPART = 120, TAXA = 40;

  var RIM_VS = [
    '#include <common>',
    '#include <skinning_pars_vertex>',
    'uniform float uPush;',
    'varying float vF; varying vec3 vP; varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  #include <beginnormal_vertex>',
    '  #include <skinbase_vertex>',
    '  #include <skinnormal_vertex>',
    '  #include <defaultnormal_vertex>',
    '  #include <begin_vertex>',
    '  #include <skinning_vertex>',
    '  transformed += normalize(objectNormal) * uPush;',
    '  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);',
    '  vec3 n = normalize(transformedNormal), v = normalize(-mv.xyz);',
    '  vF = 1.0 - abs(dot(n, v));',
    '  vP = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * mv;',
    '}'].join('\n');
  var RIM_FS = [
    'uniform vec3 uCor; uniform float uT; uniform float uA; uniform sampler2D uMap; uniform float uTemMap; uniform float uExp; uniform float uGanho;',
    'varying float vF; varying vec3 vP; varying vec2 vUv;',
    'float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }',
    'float rn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),',
    '             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }',
    'void main(){',
    '  if(uTemMap > 0.5 && texture2D(uMap, vUv).a < 0.45) discard;',
    '  vec3 q = vP * 2.6 - vec3(0.0, uT * 1.7, 0.0);',
    '  float ch = rn(q) * 0.65 + rn(q * 2.3 + 7.1) * 0.35;',            /* chama que sobe */
    '  float r = pow(vF, uExp) * (0.45 + 1.1 * ch);',
    '  float pulso = 0.85 + 0.15 * sin(uT * 3.1);',
    '  vec3 c = mix(uCor, vec3(1.0, 0.96, 0.85), smoothstep(0.75, 1.1, r));',  /* borda mais forte = branco-quente */
    '  float a = clamp(r * pulso * uA, 0.0, 1.0);',
    '  gl_FragColor = vec4(c * a * uGanho, a);',
    '}'].join('\n');

  var PT_VS = [
    'attribute float aVida; attribute float aTam; attribute float aSem;',
    'uniform float uEsc; varying float vVida; varying float vSem;',
    'void main(){',
    '  vVida = aVida; vSem = aSem;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  float s = aVida < 0.0 ? 0.0 : aTam * (1.0 - aVida * 0.55) * smoothstep(0.0, 0.12, aVida);',
    '  gl_PointSize = s * uEsc / max(0.5, -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'].join('\n');
  var PT_FS = [
    'uniform vec3 uCor; varying float vVida; varying float vSem;',
    'void main(){',
    '  if(vVida < 0.0) discard;',
    '  vec2 p = gl_PointCoord * 2.0 - 1.0;',
    '  float d = abs(p.x) * 1.35 + abs(p.y);',                              /* losango alto */
    '  float nucleo = pow(max(0.0, 1.0 - d), 2.2);',
    '  float feixe = exp(-abs(p.y) * 22.0) * max(0.0, 1.0 - abs(p.x)) * 0.55;',  /* feixe anamorfico com falloff */
    '  float k = nucleo + feixe; if(k < 0.01) discard;',
    '  vec3 quente = vec3(1.0, 0.95, 0.82), brasa = uCor * vec3(0.75, 0.32, 0.12);',
    '  vec3 c = vVida < 0.3 ? mix(quente, uCor, vVida / 0.3) : mix(uCor, brasa, (vVida - 0.3) / 0.7);',
    '  c = mix(c, quente, step(0.86, vSem) * 0.5);',                        /* algumas faiscas mais claras */
    '  float a = k * (1.0 - smoothstep(0.65, 1.0, vVida));',
    '  gl_FragColor = vec4(c * a * 1.8, a);',
    '}'].join('\n');

  function cor(css){ return new THREE.Color(css || '#ffb03a'); }

  function matRim(css, map, skin, halo){
    var k = css + '|' + (map ? map.uuid : '-') + '|' + (skin ? 1 : 0) + '|' + (halo ? 1 : 0);
    if(MATS[k]) return MATS[k];
    var m = new THREE.ShaderMaterial({
      uniforms: { uCor: { value: cor(css) }, uT: UT, uA: { value: 1 }, uPush: { value: .01 }, uExp: { value: halo ? 1.15 : 2.0 }, uGanho: { value: halo ? 1.1 : 2.1 }, uMap: { value: map || null }, uTemMap: { value: map ? 1 : 0 } },
      vertexShader: RIM_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
    m.userData.aura = 1; MATS[k] = m; return m;
  }

  /* cascas das malhas da raiz (presas ao esqueleto de cada malha) */
  function cascas(raiz, css){
    var L = [];
    raiz.traverse(function(n){
      if(!n.isMesh || (n.userData && n.userData.aura)) return;
      var mt = Array.isArray(n.material) ? n.material[0] : n.material, g = n.geometry;
      if(!g || !g.attributes.normal) return;
      if(!g.boundingSphere) g.computeBoundingSphere();
      /* duas cascas por malha: contorno nitido colado no corpo + halo largo e macio que "vaza" pra fora da silhueta (energia do chefe) */
      [[false, .03], [true, .11]].forEach(function(cf){
        var mat = matRim(css, mt && mt.map, !!n.isSkinnedMesh, cf[0]), c;
        if(n.isSkinnedMesh){ c = new THREE.SkinnedMesh(g, mat); c.bind(n.skeleton, n.bindMatrix); c.bindMode = n.bindMode; }
        else c = new THREE.Mesh(g, mat);
        c.userData.aura = 1; c.userData.push = g.boundingSphere.radius * cf[1]; c.frustumCulled = false; c.renderOrder = 5;
        c.onBeforeRender = function(){ mat.uniforms.uPush.value = c.userData.push; mat.uniformsNeedUpdate = true; };      /* material dividido entre cascas: sobe o uPush de cada uma */
        L.push([n, c]);
      });
    });
    return L;
  }

  function matPts(){
    if(PTS_MAT) return PTS_MAT;
    PTS_MAT = new THREE.ShaderMaterial({ uniforms: { uCor: { value: new THREE.Color('#ffb03a') }, uEsc: UESC }, vertexShader: PT_VS, fragmentShader: PT_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return PTS_MAT;
  }

  function novoPts(css){
    var g = new THREE.BufferGeometry(), pos = new Float32Array(NPART * 3), vida = new Float32Array(NPART), tam = new Float32Array(NPART), sem = new Float32Array(NPART);
    for(var i = 0; i < NPART; i++){ vida[i] = -1; sem[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aVida', new THREE.BufferAttribute(vida, 1));
    g.setAttribute('aTam', new THREE.BufferAttribute(tam, 1)); g.setAttribute('aSem', new THREE.BufferAttribute(sem, 1));
    var m = matPts().clone(); m.uniforms.uEsc = UESC; m.uniforms.uCor.value = cor(css);
    var p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 6;
    return { p: p, vel: new Float32Array(NPART * 3), dur: new Float32Array(NPART), t: new Float32Array(NPART), prox: 0, acc: 0 };
  }

  var AuraChefe = {
    init: function(T3, cena, prep){
      THREE = T3; CENA = cena; PREP = prep;
      try{ var g = new THREE.Group(); g.add(novoPts('#ffb03a').p); if(PREP) PREP(g, true); }catch(e){ console.warn('[aura-chefe] init', e); }
    },
    /* no carregamento do modelo: compila as cascas antes do chefe aparecer */
    preparar: function(raiz, css){
      if(!THREE || !raiz) return Promise.resolve();
      var k = raiz.uuid + '|' + css; if(PRONTO[k]) return PRONTO[k];
      var tmp = new THREE.Group();
      cascas(raiz, css).forEach(function(par){ tmp.add(par[1]); });
      PRONTO[k] = (PREP ? Promise.resolve(PREP(tmp, true)) : Promise.resolve()).catch(function(){});
      return PRONTO[k];
    },
    liga: function(m, css, srcRaiz){
      if(!THREE || !m || !m.modelo || m.aura) return;
      var L = cascas(m.modelo, css), A = { m: m, cascas: [], fontes: [], pts: novoPts(css), vis: false, peso: 0 };
      L.forEach(function(par){
        var n = par[0], c = par[1]; c.visible = false; n.parent.add(c);
        c.position.copy(n.position); c.quaternion.copy(n.quaternion); c.scale.copy(n.scale);
        A.cascas.push(c);
        var nv = n.geometry.attributes.position.count; if(nv > 0){ A.fontes.push([n, nv]); A.peso += nv; }
      });
      A.pts.p.visible = false; CENA.add(A.pts.p);
      m.aura = A; ATIVAS.push(A);
      var pr = srcRaiz ? AuraChefe.preparar(srcRaiz, css) : Promise.resolve(PREP ? PREP(m.g, true) : null);
      Promise.resolve(pr).then(function(){ A.vis = true; }, function(){ A.vis = true; });
    },
    solta: function(m){
      var A = m && m.aura; if(!A) return;
      A.cascas.forEach(function(c){ if(c.parent) c.parent.remove(c); });
      CENA.remove(A.pts.p); A.pts.p.geometry.dispose(); A.pts.p.material.dispose();
      var i = ATIVAS.indexOf(A); if(i >= 0) ATIVAS.splice(i, 1); m.aura = null;
    },
    tick: function(dt, camera, renderer){
      if(!ATIVAS.length) return;
      UT.value += dt;
      try{ var hpx = renderer ? renderer.getDrawingBufferSize(V2).y : innerHeight; UESC.value = hpx * .5 / Math.tan((camera.fov || 50) * Math.PI / 360); }catch(_){}
      for(var a = 0; a < ATIVAS.length; a++){
        var A = ATIVAS[a], m = A.m, P = A.pts, vivo = A.vis && !m.dead && m.g.visible;
        var dc = camera ? Math.hypot(m.x - camera.position.x, m.z - camera.position.z) : 0, perto = dc < 70;
        for(var c = 0; c < A.cascas.length; c++) A.cascas[c].visible = vivo && perto;
        P.p.visible = A.vis && perto;
        if(!P.p.visible) continue;
        var g = P.p.geometry, pos = g.attributes.position.array, vida = g.attributes.aVida.array, tam = g.attributes.aTam.array, esc = m.esc || 1, alt = (m.T && m.T.altura || 1.8) * esc;
        /* nasce: vertice sorteado da malha ja animada */
        if(vivo && A.peso){
          P.acc += dt * TAXA * (dc < 30 ? 1 : .5);
          while(P.acc >= 1){
            P.acc -= 1; var r = Math.random() * A.peso, f = 0; while(f < A.fontes.length - 1 && r >= A.fontes[f][1]){ r -= A.fontes[f][1]; f++; }
            var n = A.fontes[f][0], vi = Math.floor(Math.random() * A.fontes[f][1]);
            try{ n.getVertexPosition(vi, VT); VT.applyMatrix4(n.matrixWorld); }catch(_){ continue; }
            var i = P.prox; P.prox = (P.prox + 1) % NPART;
            pos[i * 3] = VT.x; pos[i * 3 + 1] = VT.y; pos[i * 3 + 2] = VT.z;
            var ox = VT.x - m.x, oz = VT.z - m.z, ol = Math.hypot(ox, oz) || 1, so = .15 + Math.random() * .35;
            P.vel[i * 3] = ox / ol * so; P.vel[i * 3 + 1] = (.5 + Math.random() * .9) * Math.min(1.6, alt / 2.2); P.vel[i * 3 + 2] = oz / ol * so;
            P.dur[i] = .6 + Math.random() * .7; P.t[i] = 0; vida[i] = 0; tam[i] = (.24 + Math.random() * .26) * Math.min(1.8, alt / 2.2);
          }
        }
        for(var k = 0; k < NPART; k++){
          if(vida[k] < 0) continue;
          P.t[k] += dt; var u = P.t[k] / P.dur[k]; if(u >= 1){ vida[k] = -1; continue; }
          vida[k] = u; pos[k * 3] += P.vel[k * 3] * dt; pos[k * 3 + 1] += P.vel[k * 3 + 1] * dt; pos[k * 3 + 2] += P.vel[k * 3 + 2] * dt;
          P.vel[k * 3] *= .985; P.vel[k * 3 + 2] *= .985;
        }
        g.attributes.position.needsUpdate = true; g.attributes.aVida.needsUpdate = true; g.attributes.aTam.needsUpdate = true;
      }
    }
  };
  var VT = null, V2 = null;
  var _init = AuraChefe.init; AuraChefe.init = function(T3, c, p){ VT = new T3.Vector3(); V2 = new T3.Vector2(); _init(T3, c, p); };
  window.AuraChefe = AuraChefe;
})();
/* <<< CLAUDE [aura-chefe] */
