/* Ceu no padrao L2: cupula leve que segue a camera (degrade horizonte -> alto, nuvens finas e esticadas tipo cirro, estrelas pequenas a noite).
   Sem disco de sol/lua e sem nuvem redonda (regra do dono). Hora do jogo IGUAL para todos: sai do relogio real (1 dia = CICLO s), comeca 10:00 na hora 0.
   Uso:  CeuL2.init(THREE, scene, camera)              cria a cupula (cor do horizonte = cor da neblina: a borda do chao some no ceu)
         CeuL2.hora()                                   hora do jogo 0..24 (para a luz da pagina)
         CeuL2.cor(hora, corDia, alvo)                 cor do horizonte na hora (dia = corDia do mapa) -> alvo (THREE.Color)
         CeuL2.noite(hora)                              0 (dia) .. 1 (noite)
         CeuL2.atualiza(corHorizonte, noite)           a pagina chama no seu ciclo (ou CeuL2.automatico({...}) para os mapas abertos)
   Qualidade baixa: sem nuvens (so o degrade e as estrelas). */
window.CeuL2 = (function(){
  var C = {}, CICLO = 240, dome = null, mat = null, cam = null, T3 = null, t0 = performance.now();
  var PAL = null;
  function pal(){
    if(PAL) return PAL; var c = function(h){ return new T3.Color(h); };
    PAL = { por: c(0xd97736), noite: c(0x050c1e), aurora: c(0xe0a860), alto: { dia: c(0x2a63a8), por: c(0x5e3518), noite: c(0x01030a), aurora: c(0x35666e) } };
    return PAL;
  }
  C.hora = function(){ return ((Date.now() / 1000 / CICLO + 10 / 24) % 1) * 24; };
  /* pesos das fases: [dia, por do sol, noite, aurora] */
  function fases(h){
    function L(a, b, k){ return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; }
    var D = [1, 0, 0, 0], P = [0, 1, 0, 0], N = [0, 0, 1, 0], A = [0, 0, 0, 1];
    if(h >= 7 && h < 16.5) return D;
    if(h >= 16.5 && h < 19) return L(D, P, (h - 16.5) / 2.5);
    if(h >= 19 && h < 21) return L(P, N, (h - 19) / 2);
    if(h >= 21 || h < 5) return N;
    if(h < 6) return L(N, A, h - 5);
    return L(A, D, h - 6);
  }
  function mistura(w, cs, alvo){ alvo.setRGB(0, 0, 0); for(var i = 0; i < 4; i++){ alvo.r += cs[i].r * w[i]; alvo.g += cs[i].g * w[i]; alvo.b += cs[i].b * w[i]; } return alvo; }
  C.noite = function(h){ var w = fases(h); return w[2] + w[1] * .35 + w[3] * .35; };
  C.cor = function(h, corDia, alvo){ var p = pal(); return mistura(fases(h), [corDia, p.por, p.noite, p.aurora], alvo); };
  var _alto = null, _dia = null;
  function corAlto(h, alvo){ var p = pal(); return mistura(fases(h), [p.alto.dia, p.alto.por, p.alto.noite, p.alto.aurora], alvo); }

  var VS = 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }';
  var FS = [
    'uniform vec3 uHor; uniform vec3 uAlto; uniform float uNoite; uniform float uT; uniform float uNuv;',
    'varying vec3 vD;',
    'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }',
    'void main(){',
    '  float y = clamp(vD.y, -1.0, 1.0);',
    '  float k = pow(clamp(y, 0.0, 1.0), 0.55);',
    '  vec3 c = mix(uHor, uAlto, k);',
    '  if(y > 0.02){',
    '    vec2 q = vD.xz / (y + 0.12);',
    '    if(uNuv > 0.5){',                                               /* cirro: ruido esticado num eixo (faixas finas e quebradas) */
    '      vec2 r = vec2(q.x * 0.55 + uT * 0.012, q.y * 2.6);',
    '      float n = vn(r) * 0.55 + vn(r * 2.1 + 3.7) * 0.3 + vn(r * 4.3 + 9.1) * 0.15;',
    '      float m = smoothstep(0.56, 0.82, n) * smoothstep(0.02, 0.25, y) * (1.0 - smoothstep(0.75, 1.0, y));',
    '      vec3 cn = mix(vec3(1.0, 0.97, 0.92), uHor * 1.25 + 0.08, 0.35) * (1.0 - uNoite * 0.85);',
    '      c = mix(c, cn, m * 0.55);',
    '    }',
    '    vec2 g = floor(q * 26.0); float s = h21(g);',                  /* estrelas: pontinhos de 1 celula, so a noite */
    '    float st = step(0.9965, s) * uNoite * smoothstep(0.08, 0.4, y) * (0.6 + 0.4 * sin(uT * 2.0 + s * 60.0));',
    '    c += vec3(0.85, 0.9, 1.0) * st;',
    '  }',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  C.init = function(THREE, scene, camera){
    if(dome) return C; T3 = THREE; cam = camera; _alto = new THREE.Color(); _dia = new THREE.Color();
    var baixa = !!(window.QUAL && QUAL.nivel === 'baixa');
    mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: { uHor: { value: new THREE.Color(0x78b8e0) }, uAlto: { value: new THREE.Color(0x2a63a8) }, uNoite: { value: 0 }, uT: { value: 0 }, uNuv: { value: baixa ? 0 : 1 } } });
    dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat); dome.frustumCulled = false; dome.renderOrder = -1000; dome.name = 'ceuL2';
    scene.add(dome);
    dome.onBeforeRender = function(){ var r = cam.far * .9; dome.scale.set(r, r, r); dome.position.copy(cam.position); mat.uniforms.uT.value = (performance.now() - t0) / 1000; };
    return C;
  };
  C.atualiza = function(corHor, noite, h){
    if(!mat) return; mat.uniforms.uHor.value.copy(corHor); mat.uniforms.uNoite.value = noite;
    corAlto(h === undefined ? C.hora() : h, mat.uniforms.uAlto.value);
  };
  /* mapas abertos: ciclo proprio a cada 1/4 s. o = {corDia, fundo:true (pinta scene.background), neblina:scene.fog, luzes:[{luz, int, corNoite?}]} */
  C.automatico = function(scene, o){
    var cor = new T3.Color(), dia = new T3.Color(o.corDia), noiteCor = new T3.Color(0x5577bb);
    o.luzes.forEach(function(l){ l.cor0 = l.luz.color.clone(); });
    function passo(){
      var h = C.hora(), n = C.noite(h); C.cor(h, dia, cor);
      if(scene.background && scene.background.isColor) scene.background.copy(cor); if(scene.fog) scene.fog.color.copy(cor);
      o.luzes.forEach(function(l){ l.luz.intensity = l.int * (1 - .55 * n); if(l.sol) l.luz.color.copy(l.cor0).lerp(noiteCor, n * .8); });
      C.atualiza(cor, n, h);
    }
    passo(); return setInterval(passo, 250);
  };
  return C;
})();
