/* Agua no padrao L2 (mar da cidade): material leve feito na placa de video.
   - ondas no vertex shader (antes a CPU mexia 2.401 vertices por quadro);
   - cor funda + reflexo do ceu pela cor da neblina (acompanha o dia/noite) com Fresnel;
   - brilho do sol em faixas (ondulacao esticada no sentido do vento; nada de circulos);
   - espuma na beira: onde o chao da ilha (alturaChao, a mesma conta do jogo em GLSL) encosta na agua.
   Uso: mesh.material = AguaL2.material(THREE, { scene, sol: luzDirecional, nivel: -4.6, baixa: bool }); */
window.AguaL2 = (function(){
  var A = {};
  var VS = [
    'uniform float uT;',
    'varying vec3 vW; varying float vFogDepth;',
    'void main(){',
    '  vec4 w = modelMatrix * vec4(position, 1.0);',
    '  w.y += sin(w.x * 0.045 + uT * 1.1) * 0.12 + cos(w.z * 0.05 + uT * 0.9) * 0.10;',
    '  vW = w.xyz; vec4 mv = viewMatrix * w; vFogDepth = -mv.z; gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var FS = [
    'uniform float uT; uniform vec3 uCeu; uniform vec3 uFundo; uniform vec3 uRaso; uniform vec3 uSolDir; uniform vec3 uSolCor; uniform float uNoite; uniform float uNivel; uniform float uDet;',
    'uniform vec3 fogColor; uniform float fogDensity; uniform float fogNear; uniform float fogFar; uniform float uFogExp;',
    'varying vec3 vW; varying float vFogDepth;',
    'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }',
    'float chao(vec2 p){',                                            /* copia de getGroundHeight (cidade.html) */
    '  float x = p.x, z = p.y, d = length(p); if(d <= 76.0) return 0.0;',
    '  float bl = min(1.0, (d - 76.0) / 22.0);',
    '  float hl = sin(x * 0.032) * cos(z * 0.032) * 4.2 + sin(x * 0.065 + 1.1) * 2.0 + cos(z * 0.055 - 0.7) * 1.6;',
    '  float ca = atan(z, x), rb = 1.0;',
    '  if(d < 170.0){',
    '    float gs[4]; gs[0] = -0.804; gs[1] = 0.704; gs[2] = -2.470; gs[3] = 2.352;',
    '    for(int i = 0; i < 4; i++){ float ad = abs(atan(sin(ca - gs[i]), cos(ca - gs[i]))); float cd = d * sin(ad); if(cd < 14.0){ float rf = cd / 14.0; rb = min(rb, rf * rf); } }',
    '  }',
    '  hl *= rb; if(z > 80.0 && abs(x - 28.0) < 32.0) hl -= (z - 80.0) * 0.045; if(d > 260.0) hl -= (d - 260.0) * 0.065;',
    '  return max(-4.8, hl * bl);',
    '}',
    'void main(){',
    '  vec3 V = normalize(cameraPosition - vW);',
    '  vec2 q = vW.xz;',
    '  vec2 r = vec2(q.x * 0.22 + uT * 0.35, q.y * 0.9 - uT * 0.12);',      /* ondulacao esticada (vento) */
    '  float e = 0.35;',
    '  float n0 = vn(r) + 0.5 * vn(r * 2.3 + 4.1);',
    '  float nx = vn(r + vec2(e, 0.0)) + 0.5 * vn((r + vec2(e, 0.0)) * 2.3 + 4.1);',
    '  float nz = vn(r + vec2(0.0, e)) + 0.5 * vn((r + vec2(0.0, e)) * 2.3 + 4.1);',
    '  vec3 N = normalize(vec3((n0 - nx) * 0.9 * uDet, 1.0, (n0 - nz) * 0.9 * uDet));',
    '  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
    '  float prof = clamp((uNivel - chao(q)) / 0.18, 0.0, 1.0);',         /* 0 na beira, 1 no fundo (o fundo do mar fica 0,2 m abaixo: -4,8) */
    '  vec3 base = mix(uRaso, uFundo, prof) * (1.0 - 0.8 * uNoite);',
    '  vec3 c = mix(base, uCeu, clamp(fr * 1.15, 0.0, 0.85));',
    '  vec3 Hh = normalize(uSolDir + V); float sp = pow(max(dot(N, Hh), 0.0), 220.0);',
    '  c += uSolCor * sp * 2.2 * (1.0 - uNoite);',
    '  float espuma = (1.0 - smoothstep(0.0, 0.45, prof)) * smoothstep(0.3, 0.7, vn(q * vec2(0.9, 2.4) + uT * 0.5));',
    '  c = mix(c, vec3(0.92, 0.95, 0.97) * (1.0 - 0.85 * uNoite), espuma * 0.7);',
    '  float ff = uFogExp > 0.5 ? 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth) : smoothstep(fogNear, fogFar, vFogDepth);',
    '  gl_FragColor = vec4(mix(c, fogColor, ff), 1.0);',
    '}'
  ].join('\n');
  A.material = function(THREE, o){
    o = o || {}; var sc = o.scene, sol = o.sol, t0 = performance.now(), tmp = new THREE.Vector3();
    var U = {
      uT: { value: 0 }, uCeu: { value: new THREE.Color(0x78b8e0) }, uFundo: { value: new THREE.Color(0x0b3550) }, uRaso: { value: new THREE.Color(0x2f7d86) },
      uSolDir: { value: new THREE.Vector3(.5, .7, .4).normalize() }, uSolCor: { value: new THREE.Color(0xfff2dd) }, uNoite: { value: 0 }, uNivel: { value: o.nivel || -4.6 },
      uDet: { value: o.baixa ? .55 : 1 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, fogNear: { value: 1 }, fogFar: { value: 1000 }, uFogExp: { value: 1 }
    };
    var m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: U, fog: false });
    m.userData.atualiza = function(){
      U.uT.value = (performance.now() - t0) / 1000;
      if(sc && sc.fog){ U.fogColor.value.copy(sc.fog.color); U.uCeu.value.copy(sc.fog.color); if(sc.fog.isFogExp2){ U.uFogExp.value = 1; U.fogDensity.value = sc.fog.density; } else { U.uFogExp.value = 0; U.fogNear.value = sc.fog.near; U.fogFar.value = sc.fog.far; } }
      if(sol){ tmp.copy(sol.position).normalize(); U.uSolDir.value.copy(tmp); U.uSolCor.value.copy(sol.color); }
      U.uNoite.value = window.CeuL2 && CeuL2.noite ? CeuL2.noite(CeuL2.hora()) : 0;
    };
    return m;
  };
  return A;
})();
