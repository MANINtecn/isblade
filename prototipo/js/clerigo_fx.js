/* Efeitos do CLERIGO (healer) - Versão Refinada e Fluida (10/11/2026).
   Elimina completamente o aspecto quadrado/lowpoly rígido (substituindo cones e octaedros secos de 4 lados por geometrias facetadas polidas,
   shaders volumétricos aditivos e partículas fluidas orgânicas com ruído curl no vertex shader).
   Mantém a regra de ouro: paleta sagrada ouro/branco quente + verde cura (sem rosa/lilás) e formas angulares (cristal, losango, cruz, faísca, hex/octa),
   mas com gradientes suaves (smoothstep) e núcleos incandescentes que evitam cortes e quinas duras.
   Uso: ClerigoFX.init(THREE, cena); ClerigoFX.tick(dt) todo quadro. */
(function(){
  var C = window.ClerigoFX = { pronto: false };
  var T, cena, vivos = [], TX = {}, MT = {}, rastro = null;
  var OURO = 0xffd977, BRANCO = 0xfff6dc, VERDE = 0x8dffb0, AZUL = 0xbfe4ff;

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
    var tl = new T.TextureLoader(), v = '?v=2';
    ['cruz', 'estrela', 'glifo_hex', 'glifo_octa', 'raios', 'onda', 'hex_brilho', 'leque', 'facetas', 'favo'].forEach(function(n){
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
     Lâmina sagrada de cristal translúcida, facetada e aerodinâmica com núcleo incandescente,
     acompanhada por partículas fluidas orgânicas e rastro de luz sagrada etérea. ---------------- */
  C.criarLamina = function(escala){
    escala = escala || 1;
    var raiz = new T.Group(), corpo = new T.Group();
    raiz.add(corpo);

    // Lâmina de cristal lapidada e suave (cilindro de 12 faces esticado e afinado, sem quinas duras)
    var crMat = new T.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false });
    var cr = new T.Mesh(new T.CylinderGeometry(0.04, 0.16, 1.4, 12, 1), crMat);
    cr.rotation.x = Math.PI / 2;
    corpo.add(cr);

    // Núcleo branco incandescente interno
    var nu = new T.Mesh(new T.CylinderGeometry(0.02, 0.08, 1.45, 8, 1), aditivo(BRANCO, null, 0.95));
    nu.rotation.x = Math.PI / 2;
    corpo.add(nu);

    // Halo sagrado na ponta
    var br = sprite(TX.estrela, OURO, 1.6, 0.95);
    corpo.add(br);

    // Feixes de energia celestial envolvendo o corpo
    var fio = plano(TX.raios, OURO, 0.42, 2.2, 0.65);
    fio.rotation.x = Math.PI / 2;
    fio.position.z = -0.7;
    corpo.add(fio);

    // Partículas fluidas acompanhando o projétil
    var pf = criarParticulas({ n: 28, raio: 0.4, cor: OURO, tam: 42, forma: 1, turb: 0.5 });
    if(pf) corpo.add(pf.points);

    raiz.scale.setScalar(escala);
    raiz.traverse(function(o){ o.frustumCulled = false; });
    var rel = 0, tr = 0, wp = new T.Vector3();

    return {
      group: raiz,
      update: function(dt){
        rel += dt;
        corpo.rotation.z += dt * 8;
        br.material.rotation = rel * 3.5;
        if(pf) pf.update(dt);
        tr -= dt;
        if(tr <= 0 && rastro){
          tr = leve() ? 0.06 : 0.03;
          raiz.getWorldPosition(wp);
          var s = sprite(TX.estrela, OURO, 0.65 * escala, 0.85);
          s.position.copy(wp);
          rastro.add(s);
          seq(0.35, function(u){
            s.material.opacity = 0.85 * (1 - u);
            s.scale.setScalar(0.65 * escala * (1 - u * 0.5));
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
     Cristal sagrado esmeralda e ouro lapidado com relevo límpido, estilhaços orbitais suaves
     e cauda orgânica de partículas fluidas de cura. ---------------- */
  C.criarCristal = function(escala){
    escala = escala || 1;
    var raiz = new T.Group(), corpo = new T.Group();
    raiz.add(corpo);
    corpo.rotation.x = Math.PI / 2;

    // Cristal de cura lapidado de 12 faces com transparência prismática
    var cMat = new T.MeshBasicMaterial({ color: VERDE, transparent: true, opacity: 0.88, blending: T.AdditiveBlending, depthWrite: false });
    var hx = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.85, 12, 1), cMat);
    corpo.add(hx);

    // Pontas do cristal facetadas suavemente
    var pt1 = new T.Mesh(new T.ConeGeometry(0.24, 0.38, 12), cMat);
    pt1.position.y = 0.6;
    corpo.add(pt1);
    var pt2 = new T.Mesh(new T.ConeGeometry(0.24, 0.38, 12), cMat);
    pt2.position.y = -0.6;
    pt2.rotation.x = Math.PI;
    corpo.add(pt2);

    // Núcleo celestial branco puro
    var nu = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 1.15, 8, 1), aditivo(BRANCO, null, 0.95));
    corpo.add(nu);

    // Brilho radiante em volta
    var hb = sprite(TX.hex_brilho, VERDE, 2.1, 0.85);
    raiz.add(hb);

    // Estilhaços orbitais refinados
    var est = [];
    for(var i = 0; i < 4; i++){
      var e = new T.Mesh(new T.CylinderGeometry(0.02, 0.07, 0.32, 6, 1), aditivo(OURO, null, 0.9));
      raiz.add(e);
      est.push(e);
    }

    // Partículas fluidas de orvalho sagrado orbitando
    var pf = criarParticulas({ n: 36, raio: 0.55, cor: VERDE, tam: 45, forma: 0, turb: 0.6 });
    if(pf) raiz.add(pf.points);

    raiz.scale.setScalar(escala);
    raiz.traverse(function(o){ o.frustumCulled = false; });
    var rel = 0, tr = 0, wp = new T.Vector3();

    return {
      group: raiz,
      update: function(dt){
        rel += dt;
        corpo.rotation.y += dt * 4.5;
        if(pf) pf.update(dt);
        est.forEach(function(e, i){
          var a = rel * 6.5 + i * 1.5708;
          e.position.set(Math.cos(a) * 0.58, Math.sin(a) * 0.58, Math.sin(rel * 5 + i) * 0.15);
          e.rotation.z = a;
        });
        tr -= dt;
        if(tr <= 0 && rastro){
          tr = leve() ? 0.07 : 0.035;
          raiz.getWorldPosition(wp);
          var s = sprite(TX.cruz, VERDE, 0.38 * escala, 0.85);
          s.position.copy(wp);
          rastro.add(s);
          seq(0.42, function(u){
            s.material.opacity = 0.85 * (1 - u);
            s.position.y += 0.015;
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
    var g = grupo(x, 0, z), cor = verde ? VERDE : OURO;
    var est = sprite(TX.estrela, BRANCO, 0.4), lq = sprite(TX.leque, cor, 0.4, 0.95), esp = [];
    est.position.y = 1.3;
    lq.position.y = 1.3;
    g.add(est);
    g.add(lq);

    // Espinhos de luz suaves facetados (substituindo cones secos de 4 lados)
    for(var i = 0; i < (leve() ? 6 : 10); i++){
      var v = new T.Vector3(rnd(-1, 1), rnd(-.1, 1), rnd(-1, 1)).normalize();
      var o = new T.Mesh(new T.CylinderGeometry(0.01, 0.05, rnd(0.8, 1.4), 8, 1), aditivo(i % 2 ? BRANCO : cor, null, 0.95));
      o.position.y = 1.3;
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v);
      g.add(o);
      esp.push(o);
    }

    // Partículas fluidas de detonação
    var pf = criarParticulas({ n: 40, raio: 1.2, cor: cor, tam: 48, forma: 1, turb: 0.8 });
    if(pf) g.add(pf.points);

    // Glifo de luz no chão
    var lo = plano(TX.hex_brilho, cor, 1.8, 1.8, 0.75, true);
    lo.position.y = 0.06;
    lo.rotation.z = Math.PI / 4;
    g.add(lo);

    seq(0.6, function(u, t){
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.95 * (1 - u));
      }
      var k = kf([[0, .3], [.1, 1], [1, 0]], u);
      est.scale.setScalar(2.8 * k);
      lq.scale.setScalar(2.6 * kf([[0, .2], [.15, 1], [1, .6]], u));
      lq.material.opacity = 0.95 * (1 - u);
      esp.forEach(function(o){
        o.scale.setScalar(kf([[0, .2], [.1, 1], [.5, .5], [1, 0]], u));
      });
      lo.material.opacity = 0.75 * (1 - u);
      lo.scale.setScalar(0.7 + u * 1.1);
    }, function(){
      if(pf) pf.dispose();
      some(g);
    });
  };

  /* ---------------- Cura no Jogador:
     Coluna volumétrica cilíndrica suave de luz celestial (sem cortes de cartolina),
     onda de choque no solo, vórtice de partículas fluidas e cruzes sagradas ascendentes. ---------------- */
  C.cura = function(x, z, forte){
    if(!T) return;
    var g = grupo(x, 0, z), A = forte ? 1.15 : 0.85;

    // Coluna volumétrica suave de luz celestial (cilindro 3D com textura aditiva vertical)
    var colExt = colunaLuz(VERDE, 0.85 * A, 1.2 * A, 4.0 * A, 20, 0.75);
    colExt.position.y = 2.0 * A;
    g.add(colExt);

    var colInt = colunaLuz(OURO, 0.45 * A, 0.7 * A, 4.2 * A, 16, 0.85);
    colInt.position.y = 2.1 * A;
    g.add(colInt);

    // Onda de choque de cura no solo
    var on = plano(TX.onda, VERDE, 1.2, 1.2, 0.95, true);
    on.position.y = 0.07;
    g.add(on);

    // Nuvem de partículas fluidas subindo em vórtice
    var pf = criarParticulas({ n: 55, raio: 1.1 * A, cor: VERDE, tam: 48, forma: 0, subir: 1.2, turb: 0.6 });
    if(pf) g.add(pf.points);

    var cz = cruzes(g, leve() ? 5 : (forte ? 10 : 7), VERDE, 0.85, 2.6 * A, 1);

    seq(1.2, function(u, t){
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.95 * kf([[0, 0], [.15, 1], [.7, .9], [1, 0]], u));
      }
      var fOp = kf([[0, 0], [.1, 1], [.6, .85], [1, 0]], u);
      colExt.material.opacity = 0.75 * fOp;
      colInt.material.opacity = 0.85 * fOp;
      colExt.scale.set(kf([[0, .3], [.15, 1], [1, .4]], u), kf([[0, .1], [.2, 1], [1, 1.15]], u), kf([[0, .3], [.15, 1], [1, .4]], u));
      colInt.scale.set(kf([[0, .2], [.15, 1], [1, .3]], u), kf([[0, .1], [.2, 1], [1, 1.15]], u), kf([[0, .2], [.15, 1], [1, .3]], u));
      on.scale.setScalar(0.5 + 3.0 * u * A);
      on.material.opacity = 0.95 * (1 - u);
      cz(u);
    }, function(){
      if(pf) pf.dispose();
      some(g);
    });
  };

  /* ---------------- C2 - Glifo de Cura:
     Hexagrama sagrado no chão, colunas volumétricas de luz suave nos 6 vértices
     e pulsos de cura com ondas e partículas fluidas. ---------------- */
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

    // 6 colunas volumétricas cilíndricas nos vértices (substituindo planos retos simples)
    for(var i = 0; i < 6; i++){
      var a = i * Math.PI / 3;
      var col = colunaLuz(i % 2 ? OURO : VERDE, 0.18, 0.28, 2.8, 12, 0.7);
      col.position.set(Math.cos(a) * raio * 0.92, 1.4, Math.sin(a) * raio * 0.92);
      g.add(col);
      pil.push(col);
    }

    var pf = criarParticulas({ n: 45, raio: raio * 0.85, cor: VERDE, tam: 42, forma: 0, subir: 0.8, turb: 0.55 });
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
        p.material.opacity = 0.75 * h;
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
    var cz = cruzes(g, leve() ? 4 : 7, VERDE, raio * 0.85, 2.0, 0.85);
    seq(0.85, function(u){
      on.scale.setScalar(0.5 + raio * 2.1 * u);
      on.material.opacity = 0.95 * (1 - u);
      cz(u);
    }, function(){
      g.remove(on);
      on.material.dispose();
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
     Placas de cristal prismático translúcidas com borda luminosa, textura de favo astral
     e fragmentação brilhante com partículas fluidas estelares ao absorver impacto. ---------------- */
  var ESC = {};
  C.escudo = function(id, pos, dur, n){
    if(!T) return;
    C.escudoFim(id, true);
    n = n || 8;
    var placas = [], E = { n: n, vivo: true, placas: placas };

    for(var i = 0; i < n; i++){
      var pl = new T.Group(), a = i * 6.2832 / n;
      // Cristal prismático suave de 12 lados (em vez do cilindro seco de 6 lados)
      var hxMat = new T.MeshBasicMaterial({
        color: i % 2 ? AZUL : OURO,
        transparent: true,
        opacity: 0.65,
        blending: T.AdditiveBlending,
        depthWrite: false,
        side: T.DoubleSide
      });
      var hx = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.05, 12, 1), hxMat);
      hx.rotation.x = Math.PI / 2;
      pl.add(hx);

      var fv = plano(TX.favo, i % 2 ? AZUL : OURO, 0.72, 0.72, 0.85);
      pl.add(fv);
      pl.userData = { a: a };
      placas.push(pl);
    }

    E.g = segue(pos, function(g, u, t){
      if(!placas[0].parent) placas.forEach(function(pl){ g.add(pl); });
      var ab = Math.min(1, t / 0.4), fe = t > dur - 0.5 ? Math.max(0, (dur - t) / 0.5) : 1;
      placas.forEach(function(pl, k){
        if(!pl.visible) return;
        var a = pl.userData.a + t * 0.55, r = 0.98 + (1 - ab) * 2.2;
        pl.position.set(Math.cos(a) * r, 1.15 + 0.14 * Math.sin(t * 2.2 + k) + (1 - fe) * 1.5, Math.sin(a) * r);
        pl.rotation.y = -a + Math.PI / 2;
        pl.children.forEach(function(o){
          if(o.material) o.material.opacity = (o === pl.children[0] ? 0.65 : 0.85) * Math.min(ab, fe);
        });
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
    var s = sprite(TX.estrela, 0xdff2ff, 0.35), h = sprite(TX.onda, 0x9fd4ff, 0.35, 0.85);
    s.position.copy(w);
    h.position.copy(w);
    rastro.add(s);
    rastro.add(h);

    var pf = criarParticulas({ n: 20, raio: 0.6, cor: AZUL, tam: 40, forma: 2, turb: 0.75 });
    if(pf){
      pf.points.position.copy(w);
      rastro.add(pf.points);
    }

    seq(0.4, function(u){
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.9 * (1 - u));
      }
      s.scale.setScalar(1.8 * Math.sin(u * Math.PI));
      h.scale.setScalar(0.4 + 1.6 * u);
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
     Coluna volumétrica branca e ouro celestial, anéis de choque luminosos
     e prisma de imunidade celestial sobre a cabeça. ---------------- */
  C.purifica = function(pos, dur){
    if(!T) return;
    dur = dur || 2;
    var colVol = null, ons = [], lo = losango(OURO, 0.18), chao = plano(TX.hex_brilho, BRANCO, 1.8, 1.8, 0.65, true);

    segue(pos, function(g, u, t){
      if(!lo.parent){
        colVol = colunaLuz(BRANCO, 0.8, 1.1, 4.0, 16, 0.85);
        colVol.position.y = 2.0;
        g.add(colVol);

        for(var k = 0; k < 3; k++){
          var o = plano(TX.onda, k === 1 ? OURO : BRANCO, 1.2, 1.2, 0.95, true);
          o.position.y = 0.2 + k * 0.7;
          g.add(o);
          ons.push(o);
        }
        lo.position.y = 2.38;
        g.add(lo);
        chao.position.y = 0.06;
        chao.rotation.z = Math.PI / 4;
        g.add(chao);
      }
      var tp = Math.min(1, t / 0.7);
      if(colVol){
        colVol.scale.set(kf([[0, .2], [.15, 1], [1, .2]], tp), 1, kf([[0, .2], [.15, 1], [1, .2]], tp));
        colVol.material.opacity = 0.85 * (1 - tp);
      }
      ons.forEach(function(o, k){
        var uu = Math.max(0, Math.min(1, (t - k * 0.1) / 0.6));
        o.scale.setScalar(0.4 + 2.6 * uu);
        o.material.opacity = 0.95 * (1 - uu);
      });
      var fe = t > dur + 0.2 ? Math.max(0, (dur + 0.7 - t) / 0.5) : 1;
      lo.rotation.y = t * 3.2;
      lo.material.opacity = 0.95 * fe;
      chao.material.opacity = 0.55 * fe;
      chao.rotation.z = Math.PI / 4 + t;
    }, dur + 0.7);
  };

  /* ---------------- C5 - Prece:
     Octagrama dourado no chão, feixes celestiais volumétricos,
     setas de luz sagrada ascendentes e fluxo de partículas de bênção. ---------------- */
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
      var col = null, se = [], lo = losango(OURO, 0.15), pf = null;
      segue(pos, function(gg, u, t){
        if(!lo.parent){
          col = colunaLuz(OURO, 0.55, 0.75, 6.0, 16, 0.8);
          col.position.y = 3.0;
          gg.add(col);

          // Setas sagradas estilizadas (cilindro esguio suave em vez de cone seco de 4 lados)
          for(var k = 0; k < (leve() ? 3 : 6); k++){
            var s = new T.Mesh(new T.CylinderGeometry(0.01, 0.08, 0.42, 8, 1), aditivo(OURO, null, 0.95));
            var a = k * 6.28 / 6;
            s.position.set(Math.cos(a) * 0.58, 0.3, Math.sin(a) * 0.58);
            s.userData = { y0: 0.3 + Math.random() * 0.35, d: Math.random() * 0.3 };
            gg.add(s);
            se.push(s);
          }
          lo.position.y = 2.45;
          gg.add(lo);

          pf = criarParticulas({ n: 24, raio: 0.8, cor: OURO, tam: 42, forma: 1, subir: 0.9, turb: 0.5 });
          if(pf) gg.add(pf.points);
        }
        if(pf) pf.update(0.016);
        var tb = Math.min(1, t / 1.2);
        if(col){
          col.scale.set(kf([[0, .1], [.2, 1], [1, .2]], tb), kf([[0, .3], [.25, 1], [1, 1]], tb), kf([[0, .1], [.2, 1], [1, .2]], tb));
          col.material.opacity = 0.75 * (1 - tb);
        }
        se.forEach(function(s){
          var uu = Math.max(0, Math.min(1, (t - s.userData.d) / 1));
          s.position.y = s.userData.y0 + 2.0 * uu;
          s.visible = uu < 1;
        });
        var fim = t > dur - 0.5 ? Math.max(0, (dur - t) / 0.5) : 1;
        lo.rotation.y = t * 2.6;
        lo.position.y = 2.45 + 0.08 * Math.sin(t * 3);
        lo.material.opacity = 0.95 * fim;
      }, dur, function(){
        if(pf) pf.dispose();
      });
    });
  };

  /* ---------------- C6 - Ressurreição:
     Canalização celestial com runas sagradas e feixe divino das alturas (reviveIni);
     Asas celestiais abertas de luz radiante, espinhos lapidados, ondas e explosão gloriosa de partículas (reviveFim). ---------------- */
  C.reviveIni = function(pos, dur){
    if(!T) return;
    dur = dur || 2;
    var oc = null, pil = [], fe = null, pf = null;

    segue(pos, function(g, u, t){
      if(!oc){
        oc = plano(TX.glifo_octa, OURO, 3.8, 3.8, 0.95, true);
        oc.position.y = 0.08;
        g.add(oc);

        for(var i = 0; i < 6; i++){
          var a = i * Math.PI / 3;
          var p = colunaLuz(i % 2 ? OURO : BRANCO, 0.16, 0.26, 4.2, 12, 0.8);
          p.position.set(Math.cos(a) * 1.65, 2.1, Math.sin(a) * 1.65);
          g.add(p);
          pil.push(p);
        }
        fe = colunaLuz(BRANCO, 1.2, 1.8, 14.0, 20, 0.8);
        fe.position.y = 7;
        g.add(fe);

        pf = criarParticulas({ n: 40, raio: 1.8, cor: OURO, tam: 46, forma: 1, subir: -0.6, turb: 0.6 });
        if(pf) g.add(pf.points);
      }
      if(pf) pf.update(0.016);
      oc.rotation.z = t * 0.85;
      oc.scale.setScalar(Math.min(1, t / 0.4));
      oc.material.opacity = 0.95 * (u > 0.9 ? (1 - u) * 10 : 1);
      pil.forEach(function(p, k){
        var h = Math.min(1, Math.max(0.01, (t - k * 0.08) / 0.35));
        p.scale.set(1, h, 1);
      });
      if(fe){
        var q = Math.min(1, Math.max(0, (u - 0.35) / 0.5));
        fe.scale.set(q, 1, q);
        fe.position.y = 7 + (1 - q) * 4.5;
        fe.material.opacity = 0.8 * q;
      }
    }, dur, function(){
      if(pf) pf.dispose();
    });
  };

  C.reviveFim = function(pos){
    if(!T) return;
    var asas = [], esp = [], ons = [], cz = null, pf = null;

    segue(pos, function(g, u, t){
      if(!asas.length){
        // Asas celestiais radiantes estilizadas (feixes arqueados de luz sagrada)
        for(var l = -1; l <= 1; l += 2){
          for(var i = 0; i < 4; i++){
            var laMat = aditivo(i % 2 ? OURO : BRANCO, null, 0.95).clone();
            var la = new T.Mesh(new T.CylinderGeometry(0.02, 0.14, 1.8 + i * 0.3, 8, 1), laMat);
            la.userData = { l: l, i: i };
            g.add(la);
            asas.push(la);
          }
        }
        for(var k = 0; k < (leve() ? 8 : 16); k++){
          var v = new T.Vector3(Math.cos(k * 0.3927), 0.2 + (k % 3) * 0.25, Math.sin(k * 0.3927)).normalize();
          var e = new T.Mesh(new T.CylinderGeometry(0.01, 0.05, 1.3, 8, 1), aditivo(k % 2 ? OURO : BRANCO, null, 0.95).clone());
          e.position.y = 1.2;
          e.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v);
          g.add(e);
          esp.push(e);
        }
        for(var h = 0; h < 3; h++){
          var o = plano(TX.onda, h === 1 ? VERDE : OURO, 1.2, 1.2, 0.95, true);
          o.position.y = 0.15 + h * 0.65;
          g.add(o);
          ons.push(o);
        }
        cz = cruzes(g, leve() ? 6 : 12, VERDE, 0.9, 2.8, 1);
        pf = criarParticulas({ n: 60, raio: 2.0, cor: OURO, tam: 52, forma: 0, subir: 1.4, turb: 0.75 });
        if(pf) g.add(pf.points);
      }
      if(pf){
        pf.update(0.016);
        pf.setAlfa(0.95 * (1 - u));
      }
      asas.forEach(function(la){
        var d = la.userData, ab = Math.min(1, t / 0.35), a = (0.35 + d.i * 0.32) * ab;
        la.position.set(d.l * (0.2 + Math.sin(a) * 0.95), 1.4 + Math.cos(a) * 0.95, -0.35);
        la.rotation.set(0, 0, -d.l * a);
        la.material.opacity = 0.95 * (1 - u);
      });
      esp.forEach(function(e){
        e.scale.setScalar(kf([[0, .2], [.12, 1], [.5, .6], [1, 0]], u));
      });
      ons.forEach(function(o, k){
        var uu = Math.max(0, Math.min(1, (t - k * 0.12) / 0.7));
        o.scale.setScalar(0.5 + 3.4 * uu);
        o.material.opacity = 0.95 * (1 - uu);
      });
      cz(u);
    }, 1.6, function(){
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
