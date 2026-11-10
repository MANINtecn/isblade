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
    ['cruz', 'estrela', 'glifo_hex', 'glifo_octa', 'raios', 'onda', 'hex_brilho', 'leque', 'facetas', 'favo'].forEach(function(n){ TX[n] = tl.load('assets/fx/clerigo_' + n + '.png' + v); });
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

  /* ================= fase 2 (10/11/2026): efeitos que seguem um jogador. pos(): {x, y, z} do alvo a cada quadro (a pagina sabe onde cada um esta) ================= */
  function segue(pos, fn, dur, fimFn){ var g = new T.Group(); rastro.add(g); var p0 = pos(); if(p0) g.position.set(p0.x, p0.y, p0.z);
    seq(dur, function(u, t){ var p = pos(); if(p) g.position.set(p.x, p.y, p.z); fn(g, u, t); }, function(){ rastro.remove(g); g.traverse(function(o){ if(o.material && !isShared(o.material) && o.material.dispose) o.material.dispose(); }); if(fimFn) fimFn(); }); return g; }
  function losango(cor, tam){ var m = new T.Mesh(new T.OctahedronGeometry(tam, 0), aditivo(cor, null, .9).clone()); m.scale.set(1, 1.6, 1); return m; }
  /* ---------------- Escudo Astral: 8 placas hexagonais (ouro e azul palido) em octogono em volta do aliado; cada golpe absorvido quebra placas ---------------- */
  var ESC = {};
  C.escudo = function(id, pos, dur, n){
    if(!T) return; C.escudoFim(id, true); n = n || 8; var placas = [], E = { n: n, vivo: true, placas: placas };
    for(var i = 0; i < n; i++){ var pl = new T.Group(), a = i * 6.2832 / n;
      var hx = new T.Mesh(new T.CylinderGeometry(.34, .34, .04, 6, 1), new T.MeshBasicMaterial({ color: i % 2 ? 0xbfe4ff : OURO, transparent: true, opacity: .55, side: T.DoubleSide, depthWrite: false })); hx.rotation.x = Math.PI / 2; pl.add(hx);
      var fv = plano(TX.favo, i % 2 ? 0xbfe4ff : OURO, .7, .7, .8); pl.add(fv); pl.userData = { a: a }; placas.push(pl); }
    E.g = segue(pos, function(g, u, t){
      if(!placas[0].parent) placas.forEach(function(pl){ g.add(pl); });
      var ab = Math.min(1, t / .4), fe = t > dur - .5 ? Math.max(0, (dur - t) / .5) : 1;
      placas.forEach(function(pl, k){ if(!pl.visible) return; var a = pl.userData.a + t * .5, r = .95 + (1 - ab) * 2.5; pl.position.set(Math.cos(a) * r, 1.15 + .12 * Math.sin(t * 2 + k) + (1 - fe) * 1.5, Math.sin(a) * r); pl.rotation.y = -a + Math.PI / 2; pl.children.forEach(function(o){ if(o.material) o.material.opacity = (o === pl.children[0] ? .55 : .8) * Math.min(ab, fe); }); });
    }, dur, function(){ if(ESC[id] === E) delete ESC[id]; });
    ESC[id] = E;
  };
  /* parte (0..1) = vida que sobra no escudo: quebra as placas que passaram */
  C.escudoParte = function(id, parte, pos){
    var E = ESC[id]; if(!E) return; var vivas = Math.ceil(Math.max(0, parte) * E.n);
    E.placas.forEach(function(pl, k){ if(k >= vivas && pl.visible){ pl.visible = false; var w = new T.Vector3(); pl.getWorldPosition(w); quebra(w); } });
    if(vivas <= 0) C.escudoFim(id, true);
  };
  C.escudoFim = function(id, ja){ var E = ESC[id]; if(!E) return; delete ESC[id]; E.placas.forEach(function(pl){ pl.visible = false; }); };
  function quebra(w){ var s = sprite(TX.estrela, 0xdff2ff, .3), h = sprite(TX.onda, 0x9fd4ff, .3, .8); s.position.copy(w); h.position.copy(w); rastro.add(s); rastro.add(h);
    seq(.35, function(u){ s.scale.setScalar(1.6 * Math.sin(u * Math.PI)); h.scale.setScalar(.4 + 1.4 * u); h.material.opacity = .8 * (1 - u); }, function(){ rastro.remove(s); rastro.remove(h); s.material.dispose(); h.material.dispose(); }); }
  /* ---------------- Purificacao: pilar branco-dourado + 3 hexagonos de choque; imunidade: losango dourado girando sobre a cabeca ---------------- */
  C.purifica = function(pos, dur){
    if(!T) return; dur = dur || 2;
    var pil = [], ons = [], lo = losango(OURO, .16), chao = plano(TX.hex_brilho, BRANCO, 1.6, 1.6, .6, true);
    segue(pos, function(g, u, t){
      if(!lo.parent){ for(var i = 0; i < 2; i++){ var p = plano(TX.raios, i ? OURO : BRANCO, 1.3, 3.6, .8); p.position.y = 1.8; p.rotation.y = i * Math.PI / 2; g.add(p); pil.push(p); }
        for(var k = 0; k < 3; k++){ var o = plano(TX.onda, k === 1 ? OURO : BRANCO, 1, 1, .9, true); o.position.y = .2 + k * .7; g.add(o); ons.push(o); } lo.position.y = 2.35; g.add(lo); chao.position.y = .06; chao.rotation.z = Math.PI / 4; g.add(chao); }
      var tp = Math.min(1, t / .7);
      pil.forEach(function(p){ p.scale.set(kf([[0, .2], [.15, 1], [1, .2]], tp), 1, 1); p.material.opacity = .8 * (1 - tp); });
      ons.forEach(function(o, k){ var uu = Math.max(0, Math.min(1, (t - k * .1) / .6)); o.scale.setScalar(.4 + 2.4 * uu); o.material.opacity = .9 * (1 - uu); });
      var fe = t > dur + .2 ? Math.max(0, (dur + .7 - t) / .5) : 1; lo.rotation.y = t * 3; lo.material.opacity = .9 * fe; chao.material.opacity = .5 * fe; chao.rotation.z = Math.PI / 4 + t;
    }, dur + .7);
  };
  /* ---------------- Prece: octagrama dourado no chao do Clerigo + feixe do ceu e setas douradas em cada aliado; losango de buff sobre a cabeca ---------------- */
  C.prece = function(x, z, raio, alvos, dur){
    if(!T) return; raio = raio || 5; var g = grupo(x, 0, z), oc = plano(TX.glifo_octa, OURO, raio * 2.1, raio * 2.1, .85, true), lq = plano(TX.leque, OURO, raio * 1.4, raio * 1.4, .6, true); oc.position.y = .08; lq.position.y = .1; g.add(oc); g.add(lq);
    seq(1.6, function(u){ oc.scale.setScalar(kf([[0, .2], [.25, 1], [1, 1]], u)); oc.rotation.z = u * .6; oc.material.opacity = .85 * kf([[0, 0], [.15, 1], [.7, 1], [1, 0]], u); lq.rotation.z = -u; lq.material.opacity = .6 * (1 - u); }, function(){ some(g); });
    (alvos || []).forEach(function(pos){
      var fe = [], se = [], lo = losango(OURO, .13);
      segue(pos, function(gg, u, t){
        if(!lo.parent){ for(var i = 0; i < 2; i++){ var p = plano(TX.raios, i ? OURO : BRANCO, .9, 6, .7); p.position.y = 3; p.rotation.y = i * Math.PI / 2; gg.add(p); fe.push(p); }
          for(var k = 0; k < (leve() ? 3 : 6); k++){ var s = new T.Mesh(new T.ConeGeometry(.08, .32, 4), aditivo(OURO, null, .9)); var a = k * 6.28 / 6; s.position.set(Math.cos(a) * .55, .3, Math.sin(a) * .55); s.userData = { y0: .3 + Math.random() * .3, d: Math.random() * .3 }; gg.add(s); se.push(s); }
          lo.position.y = 2.4; gg.add(lo); }
        var tb = Math.min(1, t / 1.2); fe.forEach(function(p){ p.scale.set(kf([[0, .1], [.2, 1], [1, .2]], tb), kf([[0, .3], [.25, 1], [1, 1]], tb), 1); p.material.opacity = .7 * (1 - tb); });
        se.forEach(function(s){ var uu = Math.max(0, Math.min(1, (t - s.userData.d) / 1)); s.position.y = s.userData.y0 + 1.8 * uu; s.visible = uu < 1; });
        var fim = t > dur - .5 ? Math.max(0, (dur - t) / .5) : 1; lo.rotation.y = t * 2.4; lo.position.y = 2.4 + .08 * Math.sin(t * 3); lo.material.opacity = .9 * fim;
      }, dur);
    });
  };

  /* ================= fase 3 (10/11/2026): Ressurreicao ================= */
  /* canalizacao: octagrama sob o caido, 6 pilares altos e o feixe largo do ceu descendo (dur = tempo de canalizar) */
  C.reviveIni = function(pos, dur){
    if(!T) return; dur = dur || 2; var oc = null, pil = [], fe = [];
    segue(pos, function(g, u, t){
      if(!oc){ oc = plano(TX.glifo_octa, OURO, 3.6, 3.6, .9, true); oc.position.y = .08; g.add(oc);
        for(var i = 0; i < 6; i++){ var a = i * Math.PI / 3, p = plano(TX.raios, i % 2 ? OURO : BRANCO, .3, 4, .75); p.position.set(Math.cos(a) * 1.6, 2, Math.sin(a) * 1.6); p.rotation.y = -a; g.add(p); pil.push(p); }
        for(var k = 0; k < 2; k++){ var f = plano(TX.raios, k ? OURO : BRANCO, 2.2, 14, .7); f.position.y = 7; f.rotation.y = k * Math.PI / 2; g.add(f); fe.push(f); } }
      oc.rotation.z = t * .8; oc.scale.setScalar(Math.min(1, t / .4)); oc.material.opacity = .9 * (u > .9 ? (1 - u) * 10 : 1);
      pil.forEach(function(p, k){ p.scale.set(1, Math.min(1, Math.max(.01, (t - k * .08) / .35)), 1); });
      fe.forEach(function(f){ var q = Math.min(1, Math.max(0, (u - .35) / .5)); f.scale.set(q, 1, 1); f.position.y = 7 + (1 - q) * 5; f.material.opacity = .7 * q; });
    }, dur);
  };
  /* levanta: 4 laminas de luz de cada lado abrindo como asas atras, 16 espinhos de luz, 3 hexagonos de choque, cruzes subindo */
  C.reviveFim = function(pos){
    if(!T) return; var asas = [], esp = [], ons = [], cz = null;
    segue(pos, function(g, u, t){
      if(!asas.length){
        for(var l = -1; l <= 1; l += 2) for(var i = 0; i < 4; i++){ var la = new T.Mesh(new T.ConeGeometry(.12, 1.6 + i * .25, 4), aditivo(i % 2 ? OURO : BRANCO, null, .9).clone()); la.userData = { l: l, i: i }; g.add(la); asas.push(la); }
        for(var k = 0; k < (leve() ? 8 : 16); k++){ var v = new T.Vector3(Math.cos(k * .3927), .2 + (k % 3) * .25, Math.sin(k * .3927)).normalize(), e = new T.Mesh(new T.ConeGeometry(.05, 1.2, 4), aditivo(k % 2 ? OURO : BRANCO, null, .95).clone()); e.position.y = 1.2; e.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v); g.add(e); esp.push(e); }
        for(var h = 0; h < 3; h++){ var o = plano(TX.onda, h === 1 ? VERDE : OURO, 1, 1, .9, true); o.position.y = .15 + h * .6; g.add(o); ons.push(o); }
        cz = cruzes(g, leve() ? 5 : 10, VERDE, .8, 2.6, 1); }
      asas.forEach(function(la){ var d = la.userData, ab = Math.min(1, t / .35), a = (.35 + d.i * .32) * ab; la.position.set(d.l * (.2 + Math.sin(a) * .9), 1.4 + Math.cos(a) * .9, -.35); la.rotation.set(0, 0, -d.l * a); la.material.opacity = .9 * (1 - u); });
      esp.forEach(function(e){ e.scale.setScalar(kf([[0, .2], [.12, 1], [.5, .6], [1, 0]], u)); });
      ons.forEach(function(o, k){ var uu = Math.max(0, Math.min(1, (t - k * .12) / .7)); o.scale.setScalar(.4 + 3.2 * uu); o.material.opacity = .9 * (1 - uu); });
      cz(u);
    }, 1.6);
  };

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
