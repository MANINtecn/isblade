/* Efeitos do CLERIGO (healer), fase 1 (10/11/2026). Desenho aprovado pelo dono no Blender (prototipo/assets/personagens/clerigo_skills.blend,
   script tools/blender_fx/clerigo_skills.py) refeito aqui em Three.js com as mesmas texturas (assets/fx/clerigo_*.png, mascaras brancas tingidas).
   Paleta: ouro e branco quente (luz sagrada) + verde claro (cura). So formas angulares (cristal, losango, hexagono, cruz, estrela de 4 pontas).
     Lamina de Luz (ataque basico) -> projetil 'lamina_luz'  (registrado em MagoFX2.cria: o spawnProj das paginas ja sabe voar com ele)
     Cura Mirada (skill 1)         -> projetil 'cura_mirada'
     cura num jogador              -> ClerigoFX.cura(x, z, forte)        pilar verde-dourado, cruzes subindo, hexagono de choque
     Glifo de Cura (skill 2)       -> ClerigoFX.glifo(x, z, atraso, raio, dur, pulsos)
     Livro Astral (arma)           -> ClerigoFX.livro()  -> Group (aberto em V, paginas brilhando)
   Uso: ClerigoFX.init(THREE, cena); ClerigoFX.tick(dt) todo quadro (as paginas ja chamam MagoFX2.tick; este tem o proprio). */
(function(){
  var C = window.ClerigoFX = { pronto: false };
  var T, cena, vivos = [], TX = {}, MT = {}, rastro = null;
  var OURO = 0xffd977, BRANCO = 0xfff6dc, VERDE = 0x8dffb0;
  function leve(){ return !!(window.QUAL && (QUAL.nivel === 'baixa' || QUAL.touch)); }
  function rnd(a, b){ return a + (b - a) * Math.random(); }
  function kf(k, t){ if(t <= k[0][0]) return k[0][1]; for(var i = 1; i < k.length; i++) if(t <= k[i][0]){ var a = k[i - 1], b = k[i], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; } return k[k.length - 1][1]; }
  C.init = function(THREE_, cena_){
    if(T) return; T = THREE_; cena = cena_; var tl = new T.TextureLoader(), v = '?v=1';
    ['cruz', 'estrela', 'glifo_hex', 'raios', 'onda', 'hex_brilho', 'leque', 'facetas'].forEach(function(n){ TX[n] = tl.load('assets/fx/clerigo_' + n + '.png' + v); });
    rastro = new T.Group(); cena.add(rastro);                 /* rastro em coordenadas do mundo (fica na origem: sem suporte de chao) */
    C.pronto = true;
    if(window.MagoFX2 && MagoFX2.cria){ MagoFX2.cria.lamina_luz = C.criarLamina; MagoFX2.cria.cura_mirada = C.criarCristal; }
  };
  C.tick = function(dt){ for(var i = vivos.length - 1; i >= 0; i--) if(vivos[i](dt)) vivos.splice(i, 1); };
  function seq(dur, fn, fimFn){ var t = 0; vivos.push(function(dt){ t += dt; fn(Math.min(1, t / dur), t); if(t >= dur){ if(fimFn) fimFn(); return true; } return false; }); }
  function aditivo(cor, tex, op){ var k = cor + '_' + (tex ? tex.uuid : 0) + '_' + (op || 1); return MT[k] || (MT[k] = new T.MeshBasicMaterial({ color: cor, map: tex || null, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); }
  function sprite(tex, cor, tam, op){ var s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: cor, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(tam, tam, 1); return s; }
  function plano(tex, cor, w, h, op, deitado){ var m = new T.Mesh(new T.PlaneGeometry(w, h), aditivo(cor, tex, op).clone()); if(deitado) m.rotation.x = -Math.PI / 2; return m; }
  function grupo(x, y, z){ var g = new T.Group(); g.position.set(x, y, z); cena.add(g); return g; }
  function some(g){ g.traverse(function(o){ if(o.material && o.material.dispose && !isShared(o.material)) o.material.dispose(); }); if(g.parent) g.parent.remove(g); }
  function isShared(m){ for(var k in MT) if(MT[k] === m) return true; return false; }
  /* cruzes de cura (+) que sobem girando de leve */
  function cruzes(g, n, cor, raio, alt, dur){
    var L = []; for(var i = 0; i < n; i++){ var s = sprite(TX.cruz, cor, rnd(.22, .36)); var a = rnd(0, 6.28), r = rnd(.15, raio); s.position.set(Math.cos(a) * r, rnd(.2, .8), Math.sin(a) * r); s.userData = { a: a, r: r, d: rnd(0, .25), h: rnd(.6, 1) * alt, y0: s.position.y, t0: s.scale.x }; g.add(s); L.push(s); }
    return function(t){ L.forEach(function(s){ var u = Math.max(0, (t - s.userData.d) / Math.max(.1, 1 - s.userData.d)), a = s.userData.a + u * 1.4; s.position.set(Math.cos(a) * s.userData.r, s.userData.y0 + s.userData.h * u, Math.sin(a) * s.userData.r); var k = Math.sin(Math.min(1, u) * Math.PI); s.scale.set(s.userData.t0 * k, s.userData.t0 * k, 1); s.material.opacity = k; }); };
  }

  /* ---------------- Lamina de Luz: cristal ouro-branco alongado, rapido, com rastro de estrelas ---------------- */
  C.criarLamina = function(escala){
    escala = escala || 1; var raiz = new T.Group(), corpo = new T.Group(); raiz.add(corpo);
    var cr = new T.Mesh(new T.OctahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: 0xffe6a0 })); cr.scale.set(.13, .13, .85); corpo.add(cr);
    var nu = new T.Mesh(new T.OctahedronGeometry(1, 0), aditivo(BRANCO, null, .9)); nu.scale.set(.2, .2, 1.05); corpo.add(nu);
    var br = sprite(TX.estrela, OURO, 1.5, .95); corpo.add(br);
    var fio = plano(TX.raios, OURO, .35, 1.8, .55); fio.rotation.x = Math.PI / 2; fio.position.z = -.9; corpo.add(fio);
    raiz.scale.setScalar(escala); raiz.traverse(function(o){ o.frustumCulled = false; }); var rel = 0, tr = 0, wp = new T.Vector3();
    return {
      group: raiz,
      update: function(dt){ rel += dt; corpo.rotation.z += dt * 9; br.material.rotation = rel * 3; tr -= dt;
        if(tr <= 0 && rastro){ tr = leve() ? .07 : .035; raiz.getWorldPosition(wp); var s = sprite(TX.estrela, OURO, .6 * escala, .8); s.position.copy(wp); rastro.add(s); seq(.32, function(u){ s.material.opacity = .8 * (1 - u); s.scale.setScalar(.6 * escala * (1 - u * .6)); }, function(){ rastro.remove(s); s.material.dispose(); }); } },
      impacto: function(p){ C.impacto(p.x, p.z, false); },
      dispose: function(){ if(raiz.parent) raiz.parent.remove(raiz); }
    };
  };
  /* ---------------- Cura Mirada: cristal hexagonal verde com nucleo branco e 4 estilhacos dourados orbitando ---------------- */
  C.criarCristal = function(escala){
    escala = escala || 1; var raiz = new T.Group(), corpo = new T.Group(); raiz.add(corpo); corpo.rotation.x = Math.PI / 2;
    var hx = new T.Mesh(new T.CylinderGeometry(.28, .28, .9, 6, 1), new T.MeshBasicMaterial({ color: 0x5fe89a, transparent: true, opacity: .85 })); corpo.add(hx);
    var pt1 = new T.Mesh(new T.ConeGeometry(.28, .35, 6), hx.material); pt1.position.y = .62; corpo.add(pt1);
    var pt2 = new T.Mesh(new T.ConeGeometry(.28, .35, 6), hx.material); pt2.position.y = -.62; pt2.rotation.x = Math.PI; corpo.add(pt2);
    var nu = new T.Mesh(new T.CylinderGeometry(.12, .12, 1.1, 6, 1), aditivo(BRANCO, null, .95)); corpo.add(nu);
    var hb = sprite(TX.hex_brilho, VERDE, 1.9, .8); raiz.add(hb);
    var est = []; for(var i = 0; i < 4; i++){ var e = new T.Mesh(new T.OctahedronGeometry(.09, 0), new T.MeshBasicMaterial({ color: OURO })); e.scale.set(1, 1, 2.2); raiz.add(e); est.push(e); }
    raiz.scale.setScalar(escala); raiz.traverse(function(o){ o.frustumCulled = false; }); var rel = 0, tr = 0, wp = new T.Vector3();
    return {
      group: raiz,
      update: function(dt){ rel += dt; corpo.rotation.y += dt * 4; est.forEach(function(e, i){ var a = rel * 7 + i * 1.5708; e.position.set(Math.cos(a) * .55, Math.sin(a) * .55, 0); e.rotation.z = a; });
        tr -= dt; if(tr <= 0 && rastro){ tr = leve() ? .08 : .04; raiz.getWorldPosition(wp); var s = sprite(TX.cruz, VERDE, .32 * escala, .8); s.position.copy(wp); rastro.add(s); seq(.4, function(u){ s.material.opacity = .8 * (1 - u); s.position.y += .01; }, function(){ rastro.remove(s); s.material.dispose(); }); } },
      impacto: function(p){ C.impacto(p.x, p.z, true); },
      dispose: function(){ if(raiz.parent) raiz.parent.remove(raiz); }
    };
  };
  /* impacto: estrela branca + espinhos finos de luz + losango no chao (verde = cristal de cura) */
  C.impacto = function(x, z, verde){
    if(!T) return; var g = grupo(x, 0, z), cor = verde ? VERDE : OURO, est = sprite(TX.estrela, BRANCO, .3), lq = sprite(TX.leque, cor, .3, .9), esp = [];
    est.position.y = 1.3; lq.position.y = 1.3; g.add(est); g.add(lq);
    for(var i = 0; i < (leve() ? 5 : 9); i++){ var v = new T.Vector3(rnd(-1, 1), rnd(-.1, 1), rnd(-1, 1)).normalize(), o = new T.Mesh(new T.ConeGeometry(.05, rnd(.7, 1.3), 4), aditivo(i % 2 ? BRANCO : cor, null, .95)); o.position.y = 1.3; o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v); g.add(o); esp.push(o); }
    var lo = plano(TX.hex_brilho, cor, 1.6, 1.6, .7, true); lo.position.y = .06; lo.rotation.z = Math.PI / 4; g.add(lo);
    seq(.55, function(u){ var k = kf([[0, .3], [.1, 1], [1, 0]], u); est.scale.setScalar(2.6 * k); lq.scale.setScalar(2.4 * kf([[0, .2], [.15, 1], [1, .6]], u)); lq.material.opacity = .9 * (1 - u); esp.forEach(function(o){ o.scale.setScalar(kf([[0, .2], [.1, 1], [.5, .5], [1, 0]], u)); }); lo.material.opacity = .7 * (1 - u); lo.scale.setScalar(.6 + u); }, function(){ some(g); });
  };

  /* ---------------- cura num jogador: pilar verde-dourado, cruzes subindo, hexagono de choque ---------------- */
  C.cura = function(x, z, forte){
    if(!T) return; var g = grupo(x, 0, z), A = forte ? 1 : .7, pil = [];
    for(var i = 0; i < 2; i++){ var p = plano(TX.raios, i ? OURO : VERDE, 1.4 * A, 3.6 * A, .75); p.position.y = 1.8 * A; p.rotation.y = i * Math.PI / 2; g.add(p); pil.push(p); }
    var on = plano(TX.onda, VERDE, 1, 1, .9, true); on.position.y = .07; g.add(on);
    var cz = cruzes(g, leve() ? 4 : (forte ? 9 : 6), VERDE, .7, 2.4 * A, 1);
    seq(1.1, function(u){ pil.forEach(function(p){ p.scale.set(kf([[0, .2], [.15, 1], [1, .3]], u), kf([[0, .1], [.2, 1], [1, 1.15]], u), 1); p.material.opacity = .75 * kf([[0, 0], [.1, 1], [.6, .8], [1, 0]], u); });
      on.scale.setScalar(.4 + 2.6 * u * A); on.material.opacity = .9 * (1 - u); cz(u); }, function(){ some(g); });
  };

  /* ---------------- Glifo de Cura: hexagrama no chao, 6 pilares nos cantos, pulsos de cura ---------------- */
  C.glifo = function(x, z, atraso, raio, dur, pulsos){
    if(!T) return; raio = raio || 3.3; dur = dur || 4; pulsos = pulsos || 4; atraso = atraso || 0;
    var g = grupo(x, 0, z), gl = plano(TX.glifo_hex, OURO, raio * 2.15, raio * 2.15, .9, true), luz = plano(TX.hex_brilho, VERDE, raio * 2, raio * 2, .35, true), pil = [], tot = atraso + dur + .5;
    gl.position.y = .08; luz.position.y = .06; g.add(luz); g.add(gl);
    for(var i = 0; i < 6; i++){ var a = i * Math.PI / 3, p = plano(TX.raios, i % 2 ? OURO : VERDE, .35, 2.6, .7); p.position.set(Math.cos(a) * raio * .92, 1.3, Math.sin(a) * raio * .92); p.rotation.y = -a; g.add(p); pil.push(p); }
    var feitos = 0;
    seq(tot, function(u, t){
      var ab = kf([[0, 0], [Math.min(.4, atraso + .2), 1]], t), fe = t > tot - .5 ? (tot - t) / .5 : 1;
      gl.scale.setScalar(Math.max(.01, ab)); gl.rotation.z = t * .25; gl.material.opacity = .9 * fe * (.8 + .2 * Math.sin(t * 6)); luz.material.opacity = .35 * ab * fe;
      pil.forEach(function(p, k){ p.scale.set(1, Math.max(.01, kf([[0, 0], [atraso + .1 + k * .04, 0], [atraso + .4 + k * .04, 1]], t)) * fe, 1); });
      while(feitos < pulsos && t >= atraso + feitos * (dur / pulsos)){ feitos++; pulso(g, raio); }
    }, function(){ some(g); });
  };
  function pulso(g, raio){
    var on = plano(TX.onda, VERDE, 1, 1, .95, true); on.position.y = .1; g.add(on); var cz = cruzes(g, leve() ? 3 : 6, VERDE, raio * .8, 1.8, .8), sub = new T.Group(); g.add(sub);
    seq(.8, function(u){ on.scale.setScalar(.5 + raio * 2 * u); on.material.opacity = .95 * (1 - u); cz(u); }, function(){ g.remove(on); on.material.dispose(); });
  }

  /* ---------------- Livro Astral (arma do Clerigo): aberto em V, lombada vertical, paginas brilhando para a frente ---------------- */
  C.livro = function(esc){
    esc = esc || 1; var L = .2 * esc, W = .014 * esc, H = .3 * esc, raiz = new T.Group();
    var capa = new T.MeshStandardMaterial({ color: 0x1c2c48, roughness: .6, metalness: .2 }), ouro = new T.MeshStandardMaterial({ color: 0xd9b25a, roughness: .35, metalness: .8, emissive: 0x3a2a08 }), pag = new T.MeshBasicMaterial({ color: 0xfff0c4 });
    function caixa(m, w, h, d, x, y, z){ var o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; }
    raiz.add(caixa(capa, W * 1.6, H, W * 2, 0, 0, 0));
    [-1, 1].forEach(function(lado){
      var pv = new T.Group(); pv.rotation.y = lado * (Math.PI / 2 - .87); raiz.add(pv);      /* ~50 graus de abertura de cada lado */
      pv.add(caixa(capa, L, H, W, lado * L / 2, 0, 0));
      pv.add(caixa(ouro, L * .96, H * 1.02, W * .6, lado * L / 2, 0, -W * .7));
      pv.add(caixa(pag, L * .88, H * .9, W * .5, lado * (L / 2 + .01), 0, W * 1.05));
    });
    var br = sprite(TX.estrela || null, OURO, .5 * esc, .7); br.position.z = .12 * esc; raiz.add(br); raiz.userData.brilho = br;
    return raiz;
  };
})();
