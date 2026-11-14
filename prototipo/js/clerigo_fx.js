/* Efeitos do CLERIGO (healer) - Versão Refinada e Fluida (10/11/2026).
   Elimina completamente o aspecto quadrado/lowpoly rígido (substituindo cones e octaedros secos de 4 lados por geometrias facetadas polidas,
   shaders volumétricos aditivos e partículas fluidas orgânicas com ruído curl no vertex shader).
   Mantém a regra de ouro: paleta sagrada ouro/branco quente + verde cura (sem rosa/lilás) e formas angulares (cristal, losango, cruz, faísca, hex/octa),
   mas com gradientes suaves (smoothstep) e núcleos incandescentes que evitam cortes e quinas duras.
   Uso: ClerigoFX.init(THREE, cena); ClerigoFX.tick(dt) todo quadro. */
(function(){
  var C = window.ClerigoFX = { pronto: false };
  var T, cena, vivos = [], TX = {}, MT = {}, rastro = null;
  var OURO = 0xffd977, BRANCO = 0xffffff, VERDE = 0x5aff9a, AZUL = 0x1575ff;

  function leve(){ return !!(window.QUAL && (QUAL.nivel === 'baixa' || QUAL.touch)); }
  function rnd(a, b){ return a + (b - a) * Math.random(); }
  function kf(k, t){
    if(t <= k[0][0]) return k[0][1];
    for(var i = 1; i < k.length; i++){
      if(t <= k[i][0]){
        var a = k[i - 1], b = k[i], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * u;
      }
    }
    return k[k.length - 1][1];
  }

  /* Motor de Partículas Fluidas Angulares do IS BLADE (THREE.Points + ShaderMaterial com Curl Noise)
     Gera nuvens e caudas de luz orgânicas que eliminam qualquer aspecto lowpoly.
     Formas no fragment: 0 = losango sagrado, 1 = faísca em cruz fina, 2 = lasca de cristal esticada. */
  var NOISE_GLSL = [
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);',
    '  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    '  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z);',
    '  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 nr=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=nr.x; p1*=nr.y; p2*=nr.z; p3*=nr.w;',
    '  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;',
    '  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}',
    'vec3 curl(vec3 p){',
    '  const float e=.1;',
    '  float a=snoise(p+vec3(0,e,0))-snoise(p-vec3(0,e,0)), b=snoise(p+vec3(0,0,e))-snoise(p-vec3(0,0,e)), c=snoise(p+vec3(e,0,0))-snoise(p-vec3(e,0,0));',
    '  float d=snoise(p+vec3(0,0,e)+17.)-snoise(p-vec3(0,0,e)+17.), f=snoise(p+vec3(e,0,0)+31.)-snoise(p-vec3(e,0,0)+31.), g=snoise(p+vec3(0,e,0)+31.)-snoise(p-vec3(e,0,0)+31.);',
    '  return vec3(d-b, f-c, a-g)/(2.*e);',
    '}'
  ].join('\n');

  var VERT_FLUID = NOISE_GLSL + '\n' + [
    'uniform float uTime, uTam, uRaio, uTurb, uSubir;',
    'attribute float aSeed;',
    'varying float vVida;',
    'varying float vSeed;',
    'void main(){',
    '  vec3 p = position;',
    '  float t = uTime * .4 + aSeed * 8.;',
    '  p += curl(p * .45 + t) * uTurb;',
    '  p.y += uSubir * mod(uTime * 1.6 + aSeed * 2.0, 3.0);',
    '  p += normalize(position + 1e-3) * sin(t * 2. + aSeed * 6.28) * .12 * uRaio;',
    '  vVida = .5 + .5 * snoise(vec3(aSeed * 7., uTime * .25, 0.));',
    '  vSeed = aSeed;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.);',
    '  gl_PointSize = uTam * (.65 + .75 * vVida) * (1. / max(.1, -mv.z));',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var FRAG_FLUID = [
    'uniform vec3 uCor;',
    'uniform float uForma, uAlfa;',
    'varying float vVida;',
    'varying float vSeed;',
    'void main(){',
    '  vec2 q = gl_PointCoord * 2. - 1.;',
    '  float ang = vSeed * 6.2831;',
    '  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));',
    '  q = rot * q;',
    '  float d = 0.0;',
    '  if(uForma < .5){',
    '    d = abs(q.x) + abs(q.y);', // losango sagrado
    '  } else if(uForma < 1.5){',
    '    d = min(abs(q.x) * 6. + abs(q.y), abs(q.y) * 6. + abs(q.x)) * .65;', // faísca em cruz fina
    '  } else {',
    '    d = abs(q.x) * 2.4 + abs(q.y) * .7;', // lasca esticada
    '  }',
    '  float a = 1.0 - smoothstep(.55, 1.0, d);',
    '  float nucleo = 1.0 - smoothstep(0.0, .45, d);',
    '  if(a < .01) discard;',
    '  vec3 c = mix(uCor, vec3(1.0, 0.96, 0.85), nucleo * .75);',
    '  gl_FragColor = vec4(c * (a + nucleo * .65), a * uAlfa * (.45 + .55 * vVida));',
    '}'
  ].join('\n');

  function criarParticulas(opts){
    if(!T) return null;
    var o = opts || {};
    var n = leve() ? Math.max(12, ((o.n || 80) * .35) | 0) : (o.n || 80);
    var raio = o.raio || 1.8;
    var geo = new T.BufferGeometry();
    var pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for(var i = 0; i < n; i++){
      var u = Math.random() * 2 - 1, a = Math.random() * 6.2831, r = raio * Math.cbrt(Math.random()), s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(a);
      pos[i * 3 + 1] = (o.altura != null ? o.altura * (Math.random() - .5) : r * u);
      pos[i * 3 + 2] = r * s * Math.sin(a);
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
    var corHex = o.cor || OURO;
    var c3 = new T.Color(corHex);
    var mat = new T.ShaderMaterial({
      vertexShader: VERT_FLUID,
      fragmentShader: FRAG_FLUID,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uTam: { value: o.tam || 52 },
        uRaio: { value: raio },
        uTurb: { value: o.turb || 0.65 },
        uSubir: { value: o.subir || 0 },
        uCor: { value: new T.Vector3(c3.r, c3.g, c3.b) },
        uForma: { value: o.forma != null ? o.forma : 0 },
        uAlfa: { value: o.alfa || 0.95 }
      }
    });
    var pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    return {
      points: pts,
      update: function(dt){ mat.uniforms.uTime.value += dt; },
      setAlfa: function(v){ mat.uniforms.uAlfa.value = v; },
      dispose: function(){ geo.dispose(); mat.dispose(); }
    };
  }

  C.init = function(THREE_, cena_){
    if(T) return;
    T = THREE_; cena = cena_;
    var tl = new T.TextureLoader(), v = '?v=5';
    ['cruz', 'estrela', 'glifo_hex', 'glifo_octa', 'raios', 'onda', 'hex_brilho', 'leque', 'facetas', 'favo', 'cruz_flare', 'veu_energia', 'pena'].forEach(function(n){
      TX[n] = tl.load('assets/fx/clerigo_' + n + '.png' + v);
    });
    rastro = new T.Group();
    cena.add(rastro);
    C.pronto = true;
    if(window.MagoFX2 && MagoFX2.cria){
      MagoFX2.cria.lamina_luz = C.criarLamina;
      MagoFX2.cria.cura_mirada = C.criarCristal;
    }
  };

  C.tick = function(dt){
    for(var i = vivos.length - 1; i >= 0; i--){
      if(vivos[i](dt)) vivos.splice(i, 1);
    }
  };

  function seq(dur, fn, fimFn){
    var t = 0;
    vivos.push(function(dt){
      t += dt;
      fn(Math.min(1, t / dur), t);
      if(t >= dur){
        if(fimFn) fimFn();
        return true;
      }
      return false;
    });
  }

  function aditivo(cor, tex, op){
    var k = cor + '_' + (tex ? tex.uuid : 0) + '_' + (op || 1);
    return MT[k] || (MT[k] = new T.MeshBasicMaterial({
      color: cor,
      map: tex || null,
      transparent: true,
      opacity: op == null ? 1 : op,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide
    }));
  }

  function sprite(tex, cor, tam, op){
    var s = new T.Sprite(new T.SpriteMaterial({
      map: tex,
      color: cor,
      transparent: true,
      opacity: op == null ? 1 : op,
      blending: T.AdditiveBlending,
      depthWrite: false
    }));
    s.scale.set(tam, tam, 1);
    return s;
  }

  function plano(tex, cor, w, h, op, deitado){
    var m = new T.Mesh(new T.PlaneGeometry(w, h), aditivo(cor, tex, op).clone());
    if(deitado) m.rotation.x = -Math.PI / 2;
    return m;
  }

  /* Cilindro volumétrico translúcido e suave para colunas de luz divina (substitui os 2 planos cruzados em X) */
  function colunaLuz(cor, rTop, rBot, h, segs, op){
    var geo = new T.CylinderGeometry(rTop, rBot, h, segs || 16, 1, true);
    var mat = new T.MeshBasicMaterial({
      color: cor,
      map: TX.raios || null,
      transparent: true,
      opacity: op || 0.75,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide
    });
    return new T.Mesh(geo, mat);
  }

  /* Coluna de Véu Rasgado de Energia Celestial (cilindro 360 com filamentos e transparência suave) */
  function colunaVeu(cor, r, h, op){
    var geo = new T.CylinderGeometry(r, r, h, 24, 1, true);
    var mat = new T.MeshBasicMaterial({
      color: cor,
      map: TX.veu_energia || null,
      transparent: true,
      opacity: op || 0.85,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide
    });
    return new T.Mesh(geo, mat);
  }

  function grupo(x, y, z){
    var g = new T.Group();
    g.position.set(x, y, z);
    cena.add(g);
    return g;
  }

  function some(g){
    g.traverse(function(o){
      if(o.material && o.material.dispose && !isShared(o.material)) o.material.dispose();
      if(o.geometry && o.geometry.dispose) o.geometry.dispose();
    });
    if(g.parent) g.parent.remove(g);
  }

  function isShared(m){
    for(var k in MT) if(MT[k] === m) return true;
    return false;
  }

  /* Cruzes sagradas de cura com partículas suaves e rotação fluida */
  function cruzes(g, n, cor, raio, alt, dur){
    var L = [];
    for(var i = 0; i < n; i++){
      var s = sprite(TX.cruz, cor, rnd(.24, .42));
      var a = rnd(0, 6.28), r = rnd(.15, raio);
      s.position.set(Math.cos(a) * r, rnd(.2, .8), Math.sin(a) * r);
      s.userData = { a: a, r: r, d: rnd(0, .25), h: rnd(.65, 1.15) * alt, y0: s.position.y, t0: s.scale.x };
      g.add(s);
      L.push(s);
    }
    return function(t){
      L.forEach(function(s){
        var u = Math.max(0, (t - s.userData.d) / Math.max(.1, 1 - s.userData.d));
        var a = s.userData.a + u * 1.5;
        s.position.set(Math.cos(a) * s.userData.r, s.userData.y0 + s.userData.h * u, Math.sin(a) * s.userData.r);
        var k = Math.sin(Math.min(1, u) * Math.PI);
        s.scale.set(s.userData.t0 * k, s.userData.t0 * k, 1);
        s.material.opacity = k * 0.95;
      });
    };
  }

  /* ---------------- C0 - Lâmina de Luz (ataque básico):
     Mini Cruz de Luz Pura em Optical Cross Flare radiante, com núcleo incandescente
     e rastro suave de luz sagrada etérea (zero peças maciças). ---------------- */
  C.criarLamina = function(escala){
    escala = escala || 1;
    var raiz = new T.Group();

    // Cruz de Luz Pura em Lens Flare Radiante (idêntico ao refinamento do Blender)
    var crz = sprite(TX.cruz_flare || TX.estrela, OURO, 1.85 * escala, 0.95);
    raiz.add(crz);

    // Núcleo incandescente central
    var nu = sprite(TX.estrela, BRANCO, 0.95 * escala, 0.98);
    raiz.add(nu);

    // Partículas fluidas douradas acompanhando o projétil
    var pf = criarParticulas({ n: 24, raio: 0.35 * escala, cor: OURO, tam: 38, forma: 1, turb: 0.45 });
    if(pf) raiz.add(pf.points);

    raiz.scale.setScalar(escala);
    raiz.traverse(function(o){ o.frustumCulled = false; });
    var rel = 0, tr = 0, wp = new T.Vector3();

    return {
      group: raiz,
      update: function(dt){
        rel += dt;
        nu.material.rotation = rel * 2.2;
        if(pf) pf.update(dt);
        tr -= dt;
        if(tr <= 0 && rastro){
          tr = leve() ? 0.05 : 0.025;
          raiz.getWorldPosition(wp);
          var s = sprite(TX.estrela, OURO, 0.55 * escala, 0.85);
          s.position.copy(wp);
          rastro.add(s);
          seq(0.3, function(u){
            s.material.opacity = 0.85 * (1 - u);
            s.scale.setScalar(0.55 * escala * (1 - u * 0.5));
          }, function(){
            rastro.remove(s);
            s.material.dispose();
          });
        }
      },
      impacto: function(p){ C.impacto(p.x, p.z, false); },
      dispose: function(){
        if(pf) pf.dispose();
        if(raiz.parent) raiz.parent.remove(raiz);
      }
    };
  };

  /* ---------------- C1 - Cura Mirada (skill 1):
     Cruz de Luz Sagrada Esmeralda e Ouro em proporções latinas nobres (ampliada em 3x visualmente),
     descendo dos céus e se fincando no solo (sem domo pesado, sem peças 3D duras). ---------------- */
  C.criarCristal = function(escala){
    var multCura = 3; // 3x o tamanho visual atual (pedido do usuário)
    var escEfetiva = (escala || 0.9) * multCura;
    var raiz = new T.Group();

    // Cruz Sagrada Esmeralda de Luz Pura (3x maior)
    var crz = sprite(TX.cruz_flare || TX.cruz, VERDE, 2.8, 0.95);
    raiz.add(crz);

    // Núcleo incandescente branco/esmeralda (3x maior)
    var nu = sprite(TX.estrela, BRANCO, 1.35, 0.95);
    raiz.add(nu);

    var pf = criarParticulas({ n: 36, raio: 0.45, cor: VERDE, tam: 46, forma: 0, turb: 0.5 });
    if(pf) raiz.add(pf.points);

    raiz.scale.setScalar(escEfetiva);
    raiz.traverse(function(o){ o.frustumCulled = false; });
    var rel = 0, tr = 0, wp = new T.Vector3();

    return {
      group: raiz,
      update: function(dt){
        rel += dt;
        nu.material.rotation = -rel * 1.8;
        if(pf) pf.update(dt);
        tr -= dt;
        if(tr <= 0 && rastro){
          tr = leve() ? 0.06 : 0.03;
          raiz.getWorldPosition(wp);
          var s = sprite(TX.estrela, VERDE, 0.45 * escEfetiva, 0.85);
          s.position.copy(wp);
          rastro.add(s);
          seq(0.35, function(u){
            s.material.opacity = 0.85 * (1 - u);
            s.position.y += 0.02;
          }, function(){
            rastro.remove(s);
            s.material.dispose();
          });
        }
      },
      impacto: function(p){ C.impacto(p.x, p.z, true); },
      dispose: function(){
        if(pf) pf.dispose();
        if(raiz.parent) raiz.parent.remove(raiz);
      }
    };
  };

  /* Impacto de Luz / Cura:
     Estrela de energia radiante, espinhos facetados suaves, ondas de luz sagrada e explosão de partículas fluidas. */
  C.impacto = function(x, z, verde){
    if(!T) return;
    var mult = verde ? 3 : 1; // 3x o tamanho visual no impacto de Cura Mirada
    var g = grupo(x, 0, z), cor = verde ? VERDE : OURO;
    var est = sprite(TX.estrela, BRANCO, 0.4 * mult), lq = sprite(TX.leque, cor, 0.4 * mult, 0.95), esp = [];
    est.position.y = 1.3 * mult;
    lq.position.y = 1.3 * mult;
    g.add(est);
    g.add(lq);

    // Espinhos de luz suaves facetados
    for(var i = 0; i < (leve() ? 6 : 10); i++){
      var v = new T.Vector3(rnd(-1, 1), rnd(-.1, 1), rnd(-1, 1)).normalize();
      var o = new T.Mesh(new T.CylinderGeometry(0.01 * mult, 0.05 * mult, rnd(0.8, 1.4) * mult, 8, 1), aditivo(i % 2 ? BRANCO : cor, null, 0.95));
      o.position.y = 1.3 * mult;
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v);
      g.add(o);
      esp.push(o);
    }

    // Partículas fluidas de detonação
    var pf = criarParticulas({ n: 40, raio: 1.2 * mult, cor: cor, tam: 48 * (mult > 1 ? 1.5 : 1), forma: 1, turb: 0.8 });
    if(pf) g.add(pf.points);

    // Glifo de luz no chão
    var lo = plano(TX.hex_brilho, cor, 1.8 * mult, 1.8 * mult, 0.75, true);
    lo.position.y = 0.06;
    lo.rotation.z = Math.PI / 4;
    g.add(lo);

    seq(0.6, function(u, t){
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.95 * (1 - u));
      }
      var k = kf([[0, .3], [.1, 1], [1, 0]], u);
      est.scale.setScalar(2.8 * k * mult);
      lq.scale.setScalar(2.6 * kf([[0, .2], [.15, 1], [1, .6]], u) * mult);
      lq.material.opacity = 0.95 * (1 - u);
      esp.forEach(function(o){
        o.scale.setScalar(kf([[0, .2], [.1, 1], [.5, .5], [1, 0]], u));
      });
      lo.material.opacity = 0.75 * (1 - u);
      lo.scale.setScalar((0.7 + u * 1.1) * mult);
    }, function(){
      if(pf) pf.dispose();
      some(g);
    });
  };

  /* ---------------- C1 (Impacto / Efeito no Alvo) - Cura no Jogador:
     Sem domo pesado! A cruz finca-se suavemente no solo, emitindo onda de choque fluida
     e fazendo brotar fragmentos de cura cintilantes que sobem em espiral leve (ampliada em 3x visualmente). ---------------- */
  C.cura = function(x, z, forte){
    if(!T) return;
    var multCura = 3; // 3x o tamanho visual atual (pedido do usuário)
    var g = grupo(x, 0, z), A = (forte ? 1.2 : 0.9) * multCura;

    // Cruz de luz flare no centro do impacto (fincada e ressoando, 3x maior)
    var crz = sprite(TX.cruz_flare || TX.estrela, VERDE, 1.6 * A, 0.95);
    crz.position.y = 1.0 * A;
    g.add(crz);

    // Núcleo cintilante de impacto (3x maior)
    var est = sprite(TX.estrela, BRANCO, 0.9 * A, 0.98);
    est.position.y = 1.0 * A;
    g.add(est);

    // Onda de choque etérea suave no solo (sem domo, 3x maior)
    var on = plano(TX.onda, VERDE, 1.4 * A, 1.4 * A, 0.9, true);
    on.position.y = 0.06;
    g.add(on);

    var on2 = plano(TX.hex_brilho, OURO, 1.2 * A, 1.2 * A, 0.6, true);
    on2.position.y = 0.05;
    g.add(on2);

    // Fragmentos cintilantes de cura subindo da terra pelo ar
    var frags = [];
    var nFrags = leve() ? 10 : (forte ? 22 : 16);
    for(var i = 0; i < nFrags; i++){
      var ang = rnd(0, 6.28), r0 = rnd(0.2, 1.3 * A);
      var sp = sprite(TX.estrela, i % 2 ? VERDE : OURO, rnd(0.22, 0.38) * A, 0.95);
      sp.position.set(Math.cos(ang) * r0, rnd(0.05, 0.3), Math.sin(ang) * r0);
      sp.userData = {
        ang: ang,
        raio: r0,
        y0: sp.position.y,
        velSubida: rnd(1.8, 3.2),
        velGiro: rnd(1.5, 3.5) * (Math.random() < 0.5 ? 1 : -1),
        atraso: rnd(0, 0.25)
      };
      g.add(sp);
      frags.push(sp);
    }

    // Partículas fluidas esmeralda em ascensão
    var pf = criarParticulas({ n: 46, raio: 1.0 * A, cor: VERDE, tam: 52, forma: 0, subir: 1.4, turb: 0.55 });
    if(pf) g.add(pf.points);

    seq(1.2, function(u, t){
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.95 * kf([[0, 0], [.15, 1], [.7, .9], [1, 0]], u));
      }
      var kCrz = kf([[0, .2], [.15, 1], [.6, .85], [1, 0]], u);
      crz.scale.setScalar(1.6 * A * kCrz);
      crz.material.opacity = 0.95 * (1 - u);
      est.scale.setScalar(0.9 * A * kf([[0, .3], [.1, 1], [1, 0]], u));

      // Onda no solo expandindo suavemente
      on.scale.setScalar(0.4 + 2.8 * u * A);
      on.material.opacity = 0.9 * (1 - u);
      on2.scale.setScalar(0.6 + 2.0 * u * A);
      on2.material.opacity = 0.6 * (1 - u);

      // Fragmentos de cura subindo em espiral
      frags.forEach(function(sp){
        var ud = sp.userData;
        if(t < ud.atraso){
          sp.visible = false;
          return;
        }
        sp.visible = true;
        var uu = Math.min(1, (t - ud.atraso) / (1.2 - ud.atraso));
        var a = ud.ang + ud.velGiro * uu;
        var r = ud.raio * (1.0 + uu * 0.4);
        sp.position.set(Math.cos(a) * r, ud.y0 + ud.velSubida * uu, Math.sin(a) * r);
        var fOp = Math.sin(uu * Math.PI);
        sp.material.opacity = 0.95 * fOp;
        sp.scale.setScalar((0.25 + 0.15 * fOp) * A);
      });
    }, function(){
      if(pf) pf.dispose();
      some(g);
    });
  };

  /* ---------------- C2 - Glifo de Cura (Santuário):
     Hexagrama sagrado no solo, 6 Colunas de Véu Rasgado de Energia Celestial nos vértices
     (sem domo e sem cruzes no topo das colunas) e fragmentos de cura pulsantes. ---------------- */
  C.glifo = function(x, z, atraso, raio, dur, pulsos){
    if(!T) return;
    raio = raio || 3.3; dur = dur || 4; pulsos = pulsos || 4; atraso = atraso || 0;
    var g = grupo(x, 0, z);
    var gl = plano(TX.glifo_hex, OURO, raio * 2.15, raio * 2.15, 0.9, true);
    var luz = plano(TX.hex_brilho, VERDE, raio * 2, raio * 2, 0.4, true);
    var pil = [], tot = atraso + dur + 0.5;

    gl.position.y = 0.08;
    luz.position.y = 0.06;
    g.add(luz);
    g.add(gl);

    // 6 Colunas de Véu Rasgado de Energia Celestial nos vértices (sem cruz no topo, textura de véu esbelto)
    for(var i = 0; i < 6; i++){
      var a = i * Math.PI / 3;
      var col = colunaVeu(i % 2 ? OURO : VERDE, 0.22, 3.2, 0.85);
      col.position.set(Math.cos(a) * raio * 0.92, 1.6, Math.sin(a) * raio * 0.92);
      g.add(col);
      pil.push(col);
    }

    var pf = criarParticulas({ n: 45, raio: raio * 0.85, cor: VERDE, tam: 42, forma: 0, subir: 0.85, turb: 0.55 });
    if(pf) g.add(pf.points);

    var feitos = 0;
    seq(tot, function(u, t){
      if(pf) pf.update(0.016);
      var ab = kf([[0, 0], [Math.min(.4, atraso + .2), 1]], t);
      var fe = t > tot - .5 ? (tot - t) / .5 : 1;
      gl.scale.setScalar(Math.max(.01, ab));
      gl.rotation.z = t * 0.25;
      gl.material.opacity = 0.9 * fe * (.8 + .2 * Math.sin(t * 6));
      luz.material.opacity = 0.4 * ab * fe;
      pil.forEach(function(p, k){
        var h = Math.max(.01, kf([[0, 0], [atraso + .1 + k * .04, 0], [atraso + .4 + k * .04, 1]], t)) * fe;
        p.scale.set(1, h, 1);
        p.material.opacity = 0.85 * h;
        // Leve rotação orgânica do véu de energia
        p.rotation.y = t * (k % 2 ? 0.4 : -0.4);
      });
      while(feitos < pulsos && t >= atraso + feitos * (dur / pulsos)){
        feitos++;
        pulso(g, raio);
      }
    }, function(){
      if(pf) pf.dispose();
      some(g);
    });
  };

  function pulso(g, raio){
    var on = plano(TX.onda, VERDE, 1.2, 1.2, 0.95, true);
    on.position.y = 0.1;
    g.add(on);
    // Fragmentos sutis de luz de cura
    var frags = [];
    for(var k = 0; k < (leve() ? 4 : 8); k++){
      var a = rnd(0, 6.28), r = rnd(0.3, raio * 0.85);
      var sp = sprite(TX.estrela, VERDE, rnd(0.2, 0.35), 0.9);
      sp.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
      sp.userData = { velY: rnd(1.5, 2.5), y0: 0.15 };
      g.add(sp);
      frags.push(sp);
    }
    seq(0.85, function(u){
      on.scale.setScalar(0.5 + raio * 2.1 * u);
      on.material.opacity = 0.95 * (1 - u);
      frags.forEach(function(sp){
        sp.position.y = sp.userData.y0 + sp.userData.velY * u;
        sp.material.opacity = 0.9 * (1 - u);
      });
    }, function(){
      g.remove(on);
      on.material.dispose();
      frags.forEach(function(sp){
        g.remove(sp);
        sp.material.dispose();
      });
    });
  }

  function segue(pos, fn, dur, fimFn){
    var g = new T.Group();
    rastro.add(g);
    var p0 = pos();
    if(p0) g.position.set(p0.x, p0.y, p0.z);
    seq(dur, function(u, t){
      var p = pos();
      if(p) g.position.set(p.x, p.y, p.z);
      fn(g, u, t);
    }, function(){
      rastro.remove(g);
      g.traverse(function(o){
        if(o.material && !isShared(o.material) && o.material.dispose) o.material.dispose();
        if(o.geometry && o.geometry.dispose) o.geometry.dispose();
      });
      if(fimFn) fimFn();
    });
    return g;
  }

  /* Losango sagrado suave multifacetado */
  function losango(cor, tam){
    var geo = new T.CylinderGeometry(0.01, tam, tam * 1.8, 8, 1);
    var m = new T.Mesh(geo, aditivo(cor, null, 0.92).clone());
    return m;
  }

  /* ---------------- C3 - Escudo Astral:
     Cruzes de Proteção em Azul Safira Puro (0x1575ff) com flare óptico radiante (ampliadas em 5x visualmente),
     orbitando suavemente o aliado e detonando clarão estelar ao bloquear dano. ---------------- */
  var ESC = {};
  C.escudo = function(id, pos, dur, n){
    if(!T) return;
    C.escudoFim(id, true);
    n = n || 6;
    var cruzesEsc = [], E = { n: n, vivo: true, placas: cruzesEsc };
    var multEscudo = 5; // 5x o tamanho visual atual (pedido do usuário)

    for(var i = 0; i < n; i++){
      var pl = new T.Group(), a = i * 6.2832 / n;
      // Cruz de Proteção em Azul Safira Radiante (5x maior: 0.85 * 5 = 4.25)
      var crz = sprite(TX.cruz_flare || TX.cruz, AZUL, 0.85 * multEscudo, 0.95);
      pl.add(crz);

      // Núcleo estelar azul celeste puro (5x maior: 0.42 * 5 = 2.1)
      var nu = sprite(TX.estrela, 0x9fd4ff, 0.42 * multEscudo, 0.95);
      pl.add(nu);

      pl.userData = { a: a, crz: crz, nu: nu };
      cruzesEsc.push(pl);
    }

    E.g = segue(pos, function(g, u, t){
      if(!cruzesEsc[0].parent) cruzesEsc.forEach(function(pl){ g.add(pl); });
      var ab = Math.min(1, t / 0.4), fe = t > dur - 0.5 ? Math.max(0, (dur - t) / 0.5) : 1;
      cruzesEsc.forEach(function(pl, k){
        if(!pl.visible) return;
        var a = pl.userData.a + t * 0.65;
        // Raio de órbita e elevação ajustados para que as cruzes de 4.25m circundem o aliado com majestade sem atravessar o corpo
        var r = 2.8 + (1 - ab) * 2.2;
        pl.position.set(Math.cos(a) * r, 1.35 + 0.18 * Math.sin(t * 2.4 + k) + (1 - fe) * 2.0, Math.sin(a) * r);
        pl.userData.crz.material.opacity = 0.95 * Math.min(ab, fe);
        pl.userData.nu.material.opacity = 0.9 * Math.min(ab, fe);
        pl.userData.nu.material.rotation = t * 1.5;
      });
    }, dur, function(){
      if(ESC[id] === E) delete ESC[id];
    });
    ESC[id] = E;
  };

  C.escudoParte = function(id, parte, pos){
    var E = ESC[id];
    if(!E) return;
    var vivas = Math.ceil(Math.max(0, parte) * E.n);
    E.placas.forEach(function(pl, k){
      if(k >= vivas && pl.visible){
        pl.visible = false;
        var w = new T.Vector3();
        pl.getWorldPosition(w);
        quebra(w);
      }
    });
    if(vivas <= 0) C.escudoFim(id, true);
  };

  C.escudoFim = function(id, ja){
    var E = ESC[id];
    if(!E) return;
    delete ESC[id];
    E.placas.forEach(function(pl){ pl.visible = false; });
  };

  function quebra(w){
    var mult = 5; // 5x escala visual de quebra
    var s = sprite(TX.estrela, 0xdff2ff, 0.45 * mult), h = sprite(TX.onda, AZUL, 0.45 * mult, 0.85);
    s.position.copy(w);
    h.position.copy(w);
    rastro.add(s);
    rastro.add(h);

    var pf = criarParticulas({ n: 35, raio: 0.6 * mult, cor: AZUL, tam: 56, forma: 1, turb: 0.75 });
    if(pf){
      pf.points.position.copy(w);
      rastro.add(pf.points);
    }

    seq(0.45, function(u){
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.9 * (1 - u));
      }
      s.scale.setScalar(1.8 * mult * Math.sin(u * Math.PI));
      h.scale.setScalar((0.4 + 1.8 * u) * mult);
      h.material.opacity = 0.85 * (1 - u);
    }, function(){
      rastro.remove(s);
      rastro.remove(h);
      s.material.dispose();
      h.material.dispose();
      if(pf){
        rastro.remove(pf.points);
        pf.dispose();
      }
    });
  }

  /* ---------------- C4 - Purificação:
     Coluna de Véu Celestial 360 translúcida e suave (sem corte de metade).
     Sem cruz! Um Halo Radiante de Purificação desce escaneando e lavando o corpo do aliado,
     dissolvendo impurezas em faíscas estelares cintilantes. ---------------- */
  C.purifica = function(pos, dur){
    if(!T) return;
    dur = dur || 2;
    var colVeu = null, halo = null, ons = [], chao = null, pf = null;

    segue(pos, function(g, u, t){
      if(!colVeu){
        // Coluna de Véu Celestial 360 completa (sem corte pela metade)
        colVeu = colunaVeu(BRANCO, 0.95, 5.5, 0.88);
        colVeu.position.y = 2.5;
        g.add(colVeu);

        // Halo Radiante de Purificação (anel de luz sagrada que desce lavando o aliado)
        halo = plano(TX.onda, OURO, 1.6, 1.6, 0.95, true);
        halo.position.y = 3.2;
        g.add(halo);

        // Brilho sagrado suave no topo da cabeça
        var coroa = sprite(TX.estrela, BRANCO, 0.65, 0.95);
        coroa.position.y = 2.4;
        g.add(coroa);

        chao = plano(TX.hex_brilho, BRANCO, 2.0, 2.0, 0.65, true);
        chao.position.y = 0.06;
        g.add(chao);

        pf = criarParticulas({ n: 30, raio: 0.9, cor: BRANCO, tam: 42, forma: 1, subir: -0.8, turb: 0.5 });
        if(pf) g.add(pf.points);
      }
      if(pf) pf.update(0.016);

      var tp = Math.min(1, t / 0.8);
      colVeu.material.opacity = 0.88 * (1 - tp * 0.85);
      colVeu.rotation.y = t * 0.4;

      // Halo descendo do topo (Y=3.2) até o chão (Y=0.1) como um scanner divino
      var uHalo = Math.min(1, t / 0.9);
      halo.position.y = 3.2 - 3.1 * uHalo;
      halo.scale.setScalar(1.2 + 0.6 * Math.sin(uHalo * Math.PI));
      halo.material.opacity = 0.95 * (1 - uHalo * 0.6);

      var fe = t > dur ? Math.max(0, (dur + 0.5 - t) / 0.5) : 1;
      chao.material.opacity = 0.65 * fe;
      chao.rotation.z = t * 0.5;
    }, dur + 0.5, function(){
      if(pf) pf.dispose();
    });
  };

  /* ---------------- C5 - Prece (Buff de Grupo):
     Octagrama dourado no solo no ponto de conjuração.
     Em cada aliado atingido: Coluna de Véu Celestial Dourado 360 inteira (sem corte)
     e uma Coroa / Halo de Bênção Dourada pairando suavemente sobre a cabeça, emanando orvalho divino. ---------------- */
  C.prece = function(x, z, raio, alvos, dur){
    if(!T) return;
    raio = raio || 5;
    var g = grupo(x, 0, z);
    var oc = plano(TX.glifo_octa, OURO, raio * 2.1, raio * 2.1, 0.9, true);
    var lq = plano(TX.leque, OURO, raio * 1.4, raio * 1.4, 0.65, true);
    oc.position.y = 0.08;
    lq.position.y = 0.1;
    g.add(oc);
    g.add(lq);

    seq(1.6, function(u){
      oc.scale.setScalar(kf([[0, .2], [.25, 1], [1, 1]], u));
      oc.rotation.z = u * 0.65;
      oc.material.opacity = 0.9 * kf([[0, 0], [.15, 1], [.7, 1], [1, 0]], u);
      lq.rotation.z = -u * 1.1;
      lq.material.opacity = 0.65 * (1 - u);
    }, function(){
      some(g);
    });

    (alvos || []).forEach(function(pos){
      var col = null, halo = null, coroa = null, pf = null;
      segue(pos, function(gg, u, t){
        if(!col){
          // Coluna de Véu Celestial 360 Dourada (sem corte pela metade)
          col = colunaVeu(OURO, 0.75, 5.0, 0.85);
          col.position.y = 2.5;
          gg.add(col);

          // Coroa / Halo de Bênção Dourada pairando sobre a cabeça (sem cruz)
          halo = plano(TX.onda, OURO, 0.95, 0.95, 0.9, true);
          halo.position.y = 2.45;
          gg.add(halo);

          coroa = sprite(TX.estrela, OURO, 0.65, 0.95);
          coroa.position.y = 2.45;
          gg.add(coroa);

          pf = criarParticulas({ n: 24, raio: 0.75, cor: OURO, tam: 42, forma: 1, subir: 0.9, turb: 0.5 });
          if(pf) gg.add(pf.points);
        }
        if(pf) pf.update(0.016);
        var tb = Math.min(1, t / 1.2);
        if(col){
          col.material.opacity = 0.85 * (1 - tb * 0.8);
          col.rotation.y = t * 0.35;
        }
        var fim = t > dur - 0.5 ? Math.max(0, (dur - t) / 0.5) : 1;
        halo.rotation.z = t * 1.5;
        halo.position.y = 2.45 + 0.06 * Math.sin(t * 3);
        halo.material.opacity = 0.85 * fim;
        coroa.material.rotation = -t * 1.2;
        coroa.material.opacity = 0.95 * fim;
      }, dur, function(){
        if(pf) pf.dispose();
      });
    });
  };

  /* ---------------- C6 - Ressurreição:
     reviveIni: Octagrama dourado no solo + Monumental Coluna de Véu Celestial 360 descendo dos céus.
     reviveFim: Sem asa no alvo e sem cruz no alvo! Pulso divino no solo e Chuva Radiante de Penas de Anjo de Luz Pura
     descendo suavemente em espiral ao redor do aliado ressuscitado. ---------------- */
  C.reviveIni = function(pos, dur){
    if(!T) return;
    dur = dur || 2;
    var oc = null, fe = null, pf = null;

    segue(pos, function(g, u, t){
      if(!oc){
        oc = plano(TX.glifo_octa, OURO, 3.8, 3.8, 0.95, true);
        oc.position.y = 0.08;
        g.add(oc);

        // Monumental Coluna de Véu Celestial 360 descendo dos céus (sem corte)
        fe = colunaVeu(BRANCO, 1.4, 14.0, 0.88);
        fe.position.y = 7;
        g.add(fe);

        pf = criarParticulas({ n: 40, raio: 1.8, cor: OURO, tam: 46, forma: 1, subir: -0.6, turb: 0.6 });
        if(pf) g.add(pf.points);
      }
      if(pf) pf.update(0.016);
      oc.rotation.z = t * 0.85;
      oc.scale.setScalar(Math.min(1, t / 0.4));
      oc.material.opacity = 0.95 * (u > 0.9 ? (1 - u) * 10 : 1);
      if(fe){
        var q = Math.min(1, Math.max(0, (u - 0.25) / 0.6));
        fe.scale.set(q, 1, q);
        fe.position.y = 7 + (1 - q) * 4.0;
        fe.material.opacity = 0.88 * q;
        fe.rotation.y = t * 0.5;
      }
    }, dur, function(){
      if(pf) pf.dispose();
    });
  };

  C.reviveFim = function(pos){
    if(!T) return;
    var penas = [], esp = [], ons = [], pf = null;

    segue(pos, function(g, u, t){
      if(!penas.length){
        // Chuva Radiante de Penas de Anjo de Luz Pura (substitui asas coladas no corpo)
        var nPenas = leve() ? 10 : 18;
        for(var p = 0; p < nPenas; p++){
          var angP = p * 6.2831 / nPenas + rnd(-0.2, 0.2);
          var raioP = rnd(0.6, 1.8);
          var pe = sprite(TX.pena || TX.estrela, BRANCO, rnd(0.5, 0.8), 0.95);
          pe.position.set(Math.cos(angP) * raioP, rnd(4.0, 7.5), Math.sin(angP) * raioP);
          pe.userData = {
            ang: angP,
            raio: raioP,
            y0: pe.position.y,
            velQueda: rnd(2.5, 4.0),
            velGiro: rnd(1.0, 2.5) * (Math.random() < 0.5 ? 1 : -1),
            osc: rnd(1.5, 3.0),
            tam: pe.scale.x
          };
          g.add(pe);
          penas.push(pe);
        }

        // Espinhos de luz sagrada facetados sutis
        for(var k = 0; k < (leve() ? 6 : 12); k++){
          var v = new T.Vector3(Math.cos(k * 0.52), 0.2 + (k % 3) * 0.2, Math.sin(k * 0.52)).normalize();
          var e = new T.Mesh(new T.CylinderGeometry(0.01, 0.05, 1.2, 8, 1), aditivo(k % 2 ? OURO : BRANCO, null, 0.95).clone());
          e.position.y = 1.0;
          e.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v);
          g.add(e);
          esp.push(e);
        }

        // Ondas de choque luminosas no solo
        for(var h = 0; h < 2; h++){
          var o = plano(TX.onda, h === 1 ? VERDE : OURO, 1.4, 1.4, 0.95, true);
          o.position.y = 0.08 + h * 0.04;
          g.add(o);
          ons.push(o);
        }

        pf = criarParticulas({ n: 60, raio: 2.0, cor: OURO, tam: 52, forma: 0, subir: 1.4, turb: 0.75 });
        if(pf) g.add(pf.points);
      }
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.95 * (1 - u));
      }

      // Chuva de Penas caindo em espiral suave
      penas.forEach(function(pe){
        var ud = pe.userData;
        var yAtual = ud.y0 - ud.velQueda * t;
        if(yAtual < 0.1) yAtual = 0.1;
        var a = ud.ang + ud.velGiro * t;
        var r = ud.raio + 0.15 * Math.sin(t * ud.osc);
        pe.position.set(Math.cos(a) * r, yAtual, Math.sin(a) * r);
        pe.material.rotation = Math.sin(t * ud.osc) * 0.35;
        // Fade suave ao se aproximar do solo ou no final
        var fOp = Math.min(1, Math.max(0, (yAtual - 0.1) / 1.5)) * (1 - u);
        pe.material.opacity = 0.95 * fOp;
      });

      esp.forEach(function(e){
        e.scale.setScalar(kf([[0, .2], [.12, 1], [.5, .6], [1, 0]], u));
      });
      ons.forEach(function(o, k){
        var uu = Math.max(0, Math.min(1, (t - k * 0.15) / 0.8));
        o.scale.setScalar(0.5 + 3.2 * uu);
        o.material.opacity = 0.95 * (1 - uu);
      });
    }, 2.0, function(){
      if(pf) pf.dispose();
    });
  };

  /* ---------------- Livro Astral (arma do Clérigo):
     Aberto em V, lombada vertical, páginas iluminadas e estrela sagrada flutuante. ---------------- */
  C.livro = function(esc){
    esc = esc || 1;
    var L = 0.2 * esc, W = 0.014 * esc, H = 0.3 * esc, raiz = new T.Group();
    var capa = new T.MeshStandardMaterial({ color: 0x1c2c48, roughness: 0.55, metalness: 0.25 });
    var ouro = new T.MeshStandardMaterial({ color: 0xd9b25a, roughness: 0.3, metalness: 0.85, emissive: 0x3a2a08 });
    var pag = new T.MeshBasicMaterial({ color: 0xfff0c4 });

    function caixa(m, w, h, d, x, y, z){
      var o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      return o;
    }
    raiz.add(caixa(capa, W * 1.6, H, W * 2, 0, 0, 0));
    [-1, 1].forEach(function(lado){
      var pv = new T.Group();
      pv.rotation.y = lado * (Math.PI / 2 - 0.87);
      raiz.add(pv);
      pv.add(caixa(capa, L, H, W, lado * L / 2, 0, 0));
      pv.add(caixa(ouro, L * 0.96, H * 1.02, W * 0.6, lado * L / 2, 0, -W * 0.7));
      pv.add(caixa(pag, L * 0.88, H * 0.9, W * 0.5, lado * (L / 2 + 0.01), 0, W * 1.05));
    });
    var br = sprite(TX.estrela || null, OURO, 0.55 * esc, 0.75);
    br.position.z = 0.12 * esc;
    raiz.add(br);
    raiz.userData.brilho = br;
    return raiz;
  };
})();
