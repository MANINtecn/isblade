/* Efeitos do GUERREIRO (espada de 2 maos, Dragon Slayer), 10/11/2026. Desenho aprovado no Blender (prototipo/assets/personagens/guerreiro_skills.blend,
   scripts tools/blender_fx/guerreiro_*.py) refeito aqui em Three.js com texturas geradas (assets/fx/guerreiro_*.png + clerigo_*.png, mascaras brancas tingidas).
   Paleta: aco incandescente (branco -> brasa -> carmesim) + faiscas douradas + pedra escura. So formas angulares (rachaduras retas, hexagonos, estrelas de 4 pontas, lascas).
     w_s1 Golpe Poderoso    GuerreiroFX.swing('w_s1', o) / hit('w_s1', x, z, o)
     w_s3 Golpe Atordoante  aviso no chao ate o golpe; fenda + lascas + estrelas de stun no alvo
     w_s4 Redemoinho de Aco trilha continua + brilho hexagonal no chao; cada um dos 10 golpes (hit) acende na ponta da espada
     w_s5 Grito de Guerra   espada em chamas + ondas hexagonais + coluna (GuerreiroFX.grito para os aliados)
     w_s6 Furia do Dragao   lamina gigante de energia presa a espada + fenda enorme + colunas em linha
   o = {px, pz, face, rig (vrm, com swd2h), an, last, part, parts}.   Uso: GuerreiroFX.init(THREE, cena); GuerreiroFX.tick(dt) todo quadro. */
(function(){
  var G = window.GuerreiroFX = { pronto: false };
  var T, cena, vivos = [], TX = {}, MT = {};
  var ACO = 0xffedcc, CARM = 0xf21a0d, BRASA = 0xff6b10, OURO = 0xffc84d;
  function leve(){ return !!(window.QUAL && (QUAL.nivel === 'baixa' || QUAL.touch)); }
  function rnd(a, b){ return a + (b - a) * Math.random(); }
  G.init = function(THREE_, cena_){
    if(T) return; T = THREE_; cena = cena_; var tl = new T.TextureLoader(), v = '?v=1';
    ['estrela', 'onda', 'leque', 'raios', 'hex_brilho'].forEach(function(n){ TX[n] = tl.load('assets/fx/clerigo_' + n + '.png' + v); });
    ['fenda', 'veios'].forEach(function(n){ TX[n] = tl.load('assets/fx/guerreiro_' + n + '.png' + v); });
    TX.raios.wrapS = TX.raios.wrapT = TX.veios.wrapS = TX.veios.wrapT = T.RepeatWrapping;
    G.pronto = true;
  };
  G.tick = function(dt){ for(var i = vivos.length - 1; i >= 0; i--) if(vivos[i](dt)) vivos.splice(i, 1); };
  function seq(dur, fn, fimFn){ var t = 0; vivos.push(function(dt){ t += dt; fn(Math.min(1, t / dur), t); if(t >= dur){ if(fimFn) fimFn(); return true; } return false; }); }
  function aditivo(cor, tex, op, lado){ return new T.MeshBasicMaterial({ color: cor, map: tex || null, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false, side: lado || T.DoubleSide }); }
  function sprite(tex, cor, tam, op){ var s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: cor, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(tam, tam, 1); s.frustumCulled = false; return s; }
  function chao(tex, cor, lado, op, y){ var m = new T.Mesh(new T.PlaneGeometry(lado, lado), aditivo(cor, tex, op)); m.rotation.x = -Math.PI / 2; m.position.y = y || .05; m.frustumCulled = false; return m; }
  function grupo(x, y, z){ var g = new T.Group(); g.position.set(x, y, z); cena.add(g); return g; }
  function some(g){ g.traverse(function(o){ if(o.material && o.material.dispose) o.material.dispose(); if(o.geometry && o.geometry.dispose && !o.userData.keep) o.geometry.dispose(); }); if(g.parent) g.parent.remove(g); }
  function agita(a){ try{ if(window.S) S.shake = Math.max(S.shake || 0, a); }catch(_){} }
  function flash(cor, a, ms){ try{ if(window.screenFlash) screenFlash(cor, a, ms); }catch(_){} }
  var geoPedra = null;

  /* ---------- pecas ---------- */
  function clarao(x, y, z, tam, cor, dur){ var s = sprite(TX.estrela, cor || ACO, tam, 1); s.position.set(x, y, z); cena.add(s); seq(dur || .3, function(u){ var k = u < .15 ? u / .15 : 1 - (u - .15) / .85; s.scale.set(tam * (.5 + .7 * Math.min(1, u * 3)), tam * (.5 + .7 * Math.min(1, u * 3)), 1); s.material.opacity = Math.max(0, k); s.material.rotation = u * .6; }, function(){ some(s); }); }
  function espinhos(x, y, z, n, L, cor, dur){
    var g = grupo(x, y, z), cs = [];
    for(var i = 0; i < n; i++){ var m = new T.Mesh(new T.ConeGeometry(.05 * L, L * rnd(.5, 1), 4, 1, true), aditivo(cor || ACO, null, 1)); var d = new T.Vector3(rnd(-1, 1), rnd(-.1, 1), rnd(-1, 1)).normalize(); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); m.position.copy(d).multiplyScalar(m.geometry.parameters.height * .5); m.userData.d = d; g.add(m); cs.push(m); }
    seq(dur || .28, function(u){ var k = u < .2 ? u / .2 : 1 - (u - .2) / .8; cs.forEach(function(m){ m.scale.set(1, .4 + 1.2 * Math.min(1, u * 4), 1); m.position.copy(m.userData.d).multiplyScalar(m.geometry.parameters.height * .5 * m.scale.y); m.material.opacity = Math.max(0, k); }); }, function(){ some(g); });
  }
  function onda(x, z, R, cor, dur){ var m = chao(TX.onda, cor, R * 2.1, 1, .07); m.position.x = x; m.position.z = z; cena.add(m); seq(dur || .6, function(u){ var s = .2 + .8 * (1 - Math.pow(1 - u, 2)); m.scale.set(s, s, s); m.material.opacity = Math.max(0, 1 - u * u); }, function(){ some(m); }); }
  function fenda(x, z, R, cor, vida, giro){ var m = chao(TX.fenda, cor, R * 2, 1, .06); m.position.x = x; m.position.z = z; m.rotation.z = giro || 0; cena.add(m); seq(vida || 1.6, function(u, t){ var s = u < .12 ? .2 + .8 * u / .12 : 1; m.scale.set(s, s, s); m.material.opacity = u < .75 ? 1 : Math.max(0, 1 - (u - .75) / .25); }, function(){ some(m); }); }
  function brilhoChao(x, z, R, cor, vida){ var m = chao(TX.hex_brilho, cor, R * 2, 1, .04); m.position.x = x; m.position.z = z; cena.add(m); seq(vida || 1, function(u){ var s = u < .15 ? u / .15 : 1; m.scale.set(s, s, s); m.material.opacity = u < .7 ? .85 : Math.max(0, .85 * (1 - (u - .7) / .3)); }, function(){ some(m); }); return m; }
  function lascas(x, z, n, vel, tam){
    if(!geoPedra) geoPedra = new T.DodecahedronGeometry(1, 0); if(leve()) n = Math.ceil(n * .5);
    for(var i = 0; i < n; i++){ (function(){ var m = new T.Mesh(geoPedra, new T.MeshBasicMaterial({ color: i % 3 ? 0x2a2220 : 0x3a2a22 })); m.userData.keep = true; var a = rnd(0, 6.28), v = rnd(.5, 1) * vel, vz = rnd(2.2, 5.2); m.scale.set(tam * rnd(.6, 1.3), tam * rnd(.4, .9), tam * rnd(.6, 1.1)); m.position.set(x, .2, z); cena.add(m); var vida = rnd(.7, 1.1), w = [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)];
      seq(vida, function(u, t){ m.position.set(x + Math.cos(a) * v * t, Math.max(.05, .2 + vz * t - 9.8 * t * t / 2), z + Math.sin(a) * v * t); m.rotation.set(w[0] * t, w[1] * t, w[2] * t); if(u > .8) m.scale.multiplyScalar(.93); }, function(){ cena.remove(m); m.material.dispose(); }); })(); }
  }
  function brasas(x, y, z, n, alt, vel, cor){
    if(leve()) n = Math.ceil(n * .5);
    for(var i = 0; i < n; i++){ (function(){ var s = sprite(TX.estrela, cor || BRASA, rnd(.14, .3), 1), a = rnd(0, 6.28), v = rnd(.2, 1) * vel, vz = rnd(.7, 1) * alt * 1.4, vida = rnd(.8, 1.6); s.position.set(x, y, z); cena.add(s);
      seq(vida, function(u, t){ s.position.set(x + Math.cos(a) * v * t + .12 * Math.sin(t * 6 + a), y + vz * t - .6 * t * t, z + Math.sin(a) * v * t); s.material.opacity = (1 - u) * (.7 + .3 * Math.sin(t * 20 + a)); }, function(){ some(s); }); })(); }
  }
  function coluna(x, z, H, R, cor, dur, giro){
    var g = grupo(x, 0, z), m = new T.Mesh(new T.CylinderGeometry(R, R * .8, H, 6, 1, true), aditivo(cor, TX.raios, .85)); m.position.y = H / 2; m.material.map = TX.raios.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(3, 1.2); g.add(m);
    seq(dur || .8, function(u, t){ var k = u < .12 ? u / .12 : (u > .75 ? 1 - (u - .75) / .25 : 1); m.scale.set(1 + .1 * (1 - k), Math.max(.01, k), 1); m.position.y = H / 2 * m.scale.y; m.rotation.y = (giro || 2) * t; m.material.map.offset.y -= .05; m.material.opacity = .85 * (u > .75 ? k : 1); }, function(){ some(g); });
  }
  function luzPonto(){ /* sem luz dinamica: adicionar/remover PointLight recompila todos os materiais da cena (trava); o brilho vem dos sprites e do chao */ }

  /* ---------- trilha da espada (faixa entre 64% da lamina e a ponta, sobre o caminho real) ---------- */
  function ponta(swd){
    if(swd.userData.gwTip) return swd.userData.gwTip;
    var best = 0, tip = null, v = new T.Vector3(), o = new T.Vector3(); swd.updateMatrixWorld(true); swd.getWorldPosition(o); var oL = swd.worldToLocal(o.clone());
    swd.traverse(function(m){ if(!m.isMesh || !m.geometry || !m.geometry.attributes.position) return; var p = m.geometry.attributes.position; for(var i = 0; i < p.count; i += 2){ v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); swd.worldToLocal(v); var d = v.distanceTo(oL); if(d > best){ best = d; tip = v.clone(); } } });
    if(!tip) return null; return swd.userData.gwTip = { tip: tip, mid: oL.clone().lerp(tip, .64), len: best, org: oL };
  }
  function trilha(swd, dur, forca){
    if(!swd || !swd.parent) return; var P = ponta(swd); if(!P) return;
    var N = 56, geo = new T.BufferGeometry(), pos = new Float32Array(N * 6), col = new Float32Array(N * 6), idx = [];
    for(var i = 0; i < N - 1; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 2);
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(idx);
    var mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); mesh.frustumCulled = false; cena.add(mesh);
    var S_ = [], vida = .3, t = 0, f = forca || 1, A = new T.Vector3(), B = new T.Vector3();
    vivos.push(function(dt){
      t += dt; if(t < dur){ A.copy(P.tip); B.copy(P.mid); swd.localToWorld(A); swd.localToWorld(B); S_.push({ a: A.clone(), b: B.clone(), e: 0 }); if(S_.length > N) S_.shift(); }
      for(var k = 0; k < S_.length; k++) S_[k].e += dt; while(S_.length && S_[0].e > vida) S_.shift();
      var n = S_.length; for(var k = 0; k < n; k++){ var s = S_[k], br = Math.pow(Math.max(0, 1 - s.e / vida), 1.3) * f;
        pos[6 * k] = s.b.x; pos[6 * k + 1] = s.b.y; pos[6 * k + 2] = s.b.z; pos[6 * k + 3] = s.a.x; pos[6 * k + 4] = s.a.y; pos[6 * k + 5] = s.a.z;
        col[6 * k] = .8 * br * .5; col[6 * k + 1] = .07 * br * .5; col[6 * k + 2] = .03 * br * .5; col[6 * k + 3] = .95 * br * .7; col[6 * k + 4] = .5 * br * .7; col[6 * k + 5] = .16 * br * .7; }
      geo.setDrawRange(0, Math.max(0, (n - 1) * 6)); geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      if(t >= dur && n === 0){ cena.remove(mesh); geo.dispose(); mesh.material.dispose(); return true; } return false;
    });
  }
  function pontaMundo(swd){ var P = swd && ponta(swd); if(!P) return null; var v = P.tip.clone(); swd.localToWorld(v); return v; }

  /* ---------- skills ---------- */
  G.swing = function(pose, o){
    if(!G.pronto) return; var rig = o.rig, swd = rig && rig.swd2h, x = o.px, z = o.pz, dur;
    if(pose === 'w_s1') trilha(swd, .75, 1.3);
    else if(pose === 'w_s3'){ trilha(swd, 1.3, 1.2); var fx = x + Math.sin(o.face) * 2.6, fz = z + Math.cos(o.face) * 2.6; var av = brilhoChao(fx, fz, 3.4, CARM, 1.15); seq(1.0, function(u){ av.scale.setScalar(.4 + .6 * Math.min(1, u * 3)); }); }
    else if(pose === 'w_s4'){ trilha(swd, 3.6, 1.2); var area = brilhoChao(x, z, 3.9, CARM, 3.6); vivos.push(function(){ try{ area.position.set(window.S ? S.px : x, 0, window.S ? S.pz : z); }catch(_){} return !area.parent; }); luzPonto(x, 1.1, z, 0xff6a2a, 3.5, 3.4); }
    else if(pose === 'w_s5' && swd){ var P = ponta(swd); if(P){ for(var k = 0; k < 7; k++){ (function(k){ var s = sprite(TX.estrela, BRASA, .85 * (1 - .07 * k), 1); s.position.copy(P.org).lerp(P.tip, (k + .5) / 7.5); swd.add(s); seq(4.2, function(u, t){ s.material.opacity = (u < .08 ? u / .08 : u > .85 ? (1 - u) / .15 : 1) * (.65 + .35 * Math.sin(t * 22 + k)); s.material.rotation = t * 1.5; }, function(){ swd.remove(s); s.material.dispose(); }); })(k); } } }
    else if(pose === 'w_s6'){
      trilha(swd, 3.0, 1.3);
      if(swd){ var P2 = ponta(swd); if(P2){ var dir = P2.tip.clone().sub(P2.org).normalize(), L = P2.len * 3.7, wd = P2.len * .22, gm = new T.Group(); gm.position.copy(P2.org).addScaledVector(dir, P2.len * .55); gm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        var cor = new T.Mesh(new T.CylinderGeometry(wd * .5, wd * .5, L, 4, 1, true), aditivo(0xfff0d0, TX.veios, .95)); cor.position.y = L / 2; cor.rotation.y = Math.PI / 4; cor.scale.set(1, 1, .22); gm.add(cor);
        var halo = new T.Mesh(new T.CylinderGeometry(wd * .9, wd * .9, L * 1.03, 4, 1, true), aditivo(CARM, null, .5)); halo.position.y = L * .515; halo.rotation.y = Math.PI / 4; halo.scale.set(1, 1, .3); gm.add(halo); swd.add(gm); gm.scale.set(1, .001, 1);
        seq(2.3, function(u, t){ var k = u < .3 ? 0 : u < .5 ? (u - .3) / .2 : u < .92 ? 1 : Math.max(0, 1 - (u - .92) / .08); gm.scale.set(1, Math.max(.001, k), 1); cor.material.map.offset.y -= .04; }, function(){ swd.remove(gm); cor.material.dispose(); halo.material.dispose(); }); } } }
  };
  G.hit = function(pose, hx, hz, o){
    if(!G.pronto) return; o = o || {}; var swd = o.rig && o.rig.swd2h, tp = pontaMundo(swd), px = o.px, pz = o.pz, last = o.last !== false;
    var ex = tp ? tp.x : hx, ey = tp ? Math.max(.4, tp.y) : 1.3, ez = tp ? tp.z : hz;
    if(pose === 'w_s1'){ clarao(ex, ey, ez, 3.2, ACO, .35); espinhos(ex, ey, ez, leve() ? 12 : 22, 1.8, ACO, .3); brasas(ex, ey, ez, 22, 2.4, 2.0); lascas(hx, hz, 8, 3.4, .13); fenda(hx, hz, 3, BRASA, 1.4, .3); onda(hx, hz, 3.4, BRASA, .6); luzPonto(hx, 1.2, hz, 0xff7a30, 4, .35); agita(.25); }
    else if(pose === 'w_s3'){ clarao(ex, ey, ez, 4.4, ACO, .45); espinhos(ex, ey, ez, leve() ? 16 : 28, 2.2, ACO, .32); brasas(hx, .6, hz, 44, 3, 2.6); lascas(hx, hz, 22, 4.6, .2); fenda(hx, hz, 4.8, BRASA, 2.2, .2); fenda(hx, hz, 3.2, CARM, 2.0, 1.7);
      onda(hx, hz, 5.4, BRASA, .7); onda(hx, hz, 3.6, CARM, .65); brilhoChao(hx, hz, 3.2, BRASA, 1.4); luzPonto(hx, 1.5, hz, 0xff5a20, 6, .6); agita(.45); flash('#ff6a2a', .18, 220);
      for(var k = 0; k < 4; k++){ (function(k){ var s = sprite(TX.estrela, OURO, .55, 1); cena.add(s); seq(1.8, function(u, t){ var a = k * 1.5708 + t * 6; s.position.set(hx + Math.cos(a) * .5, 2.25 + .06 * Math.sin(t * 9), hz + Math.sin(a) * .5); s.material.opacity = u < .08 ? u / .08 : u > .9 ? (1 - u) / .1 : 1; }, function(){ some(s); }); })(k); } }
    else if(pose === 'w_s4'){ clarao(ex, ey, ez, 1.7, ACO, .22); espinhos(ex, ey, ez, 8, 1.1, ACO, .2); brasas(ex, ey, ez, 6, 1.6, 1.3); onda(px != null ? px : hx, pz != null ? pz : hz, 3.8, (o.part || 0) % 2 ? CARM : BRASA, .4); if(o.part % 3 === 0) lascas(hx, hz, 3, 2.6, .1); agita(.12); }
    else if(pose === 'w_s5'){ var X = px != null ? px : hx, Z = pz != null ? pz : hz; onda(X, Z, 8.6, BRASA, .9); setTimeout(function(){ onda(X, Z, 6, CARM, .8); }, 110); setTimeout(function(){ onda(X, Z, 3.8, OURO, .7); }, 220); brilhoChao(X, Z, 8.4, CARM, 3); fenda(X, Z, 3.2, CARM, 2, .3); coluna(X, Z, 7.5, 1.1, 0xff5a20, 1.6, 3); brasas(X, .8, Z, 70, 3.4, 2.2); clarao(X, 1.7, Z, 4.5, BRASA, .6); luzPonto(X, 2, Z, 0xff5a20, 6, 1.2); agita(.3); flash('#ff4a10', .2, 260); }
    else if(pose === 'w_s6'){
      if(!last){ clarao(ex, ey, ez, 2.8, ACO, .3); espinhos(ex, ey, ez, 18, 1.5, ACO, .26); brasas(ex, ey, ez, 24, 2.8, 1.6); fenda(hx, hz, 2.4, BRASA, 1.2, .9); onda(hx, hz, 3, BRASA, .5); agita(.2); return; }
      clarao(ex, ey, ez, 7, ACO, .55); clarao(ex, ey, ez, 4, BRASA, .6); espinhos(ex, ey, ez, leve() ? 22 : 40, 3, ACO, .36); espinhos(ex, ey, ez, 18, 2, BRASA, .4);
      fenda(hx, hz, 9, BRASA, 3, 0); fenda(hx, hz, 6, CARM, 2.8, 1.1); onda(hx, hz, 9.6, BRASA, .8); onda(hx, hz, 6.6, CARM, .75); onda(hx, hz, 4, OURO, .7); brilhoChao(hx, hz, 6.5, BRASA, 2); lascas(hx, hz, 44, 6, .26); brasas(hx, .8, hz, 90, 4.2, 3.4);
      var f = o.face != null ? o.face : 0; for(var k = 0; k < 7; k++){ (function(k){ setTimeout(function(){ var cx = hx + Math.sin(f) * (1.4 + k * 1.5), cz = hz + Math.cos(f) * (1.4 + k * 1.5); coluna(cx, cz, 6 + (k % 2) * 1.5, .75, k % 2 ? 0xe01808 : 0xff6a14, .7, 2.4); onda(cx, cz, 2, BRASA, .35); fenda(cx, cz, 1.8, BRASA, 1.2, k); }, 60 + k * 62); })(k); }
      coluna(hx, hz, 10, 1.8, 0xff7a20, .9, 3.4); luzPonto(hx, 2, hz, 0xff5a18, 9, .9); agita(.7); flash('#ff7a20', .35, 380);
    }
  };
  /* aliados no raio do Grito de Guerra: coluna de brasas + setas de bonus subindo (pos = funcao que devolve {x,z}) */
  G.grito = function(x, z, raio, fns, dur){
    if(!G.pronto) return; dur = dur || 8;
    (fns || []).forEach(function(fn, i){ setTimeout(function(){ var p = fn && fn(); if(!p) return; coluna(p.x, p.z, 5.2, .7, 0xff6a14, 2.2, 2.4); onda(p.x, p.z, 2.2, CARM, .5); brasas(p.x, .5, p.z, 16, 2.4, 1);
      for(var j = 0; j < 5; j++){ (function(j){ var s = new T.Mesh(new T.ConeGeometry(.12, .3, 4), aditivo(0xff4a10, null, 1)); cena.add(s); var a0 = j * 1.256 + i; seq(1.6, function(u, t){ var a = a0 + u * 1.1; s.position.set(p.x + Math.cos(a) * .8, .1 + 2.6 * u, p.z + Math.sin(a) * .8); s.rotation.y = a; s.scale.setScalar(Math.max(.01, Math.sin(u * Math.PI))); }, function(){ some(s); }); })(j); } }, 40 + i * 70); });
  };
  /* outro jogador usou a skill: mostra no ponto dele (sem a espada dele) */
  G.remoto = function(pose, e){ if(!G.pronto || !e) return; var x = e.x, z = e.z, f = e.f || 0; if(pose === 'w_s5') G.hit('w_s5', x, z, { px: x, pz: z }); else if(pose === 'w_s6') G.hit('w_s6', x + Math.sin(f) * 2.4, z + Math.cos(f) * 2.4, { face: f, last: true, px: x, pz: z }); else if(pose === 'w_s3') G.hit('w_s3', x + Math.sin(f) * 2.6, z + Math.cos(f) * 2.6, { px: x, pz: z }); else if(pose === 'w_s1') G.hit('w_s1', x + Math.sin(f) * 2.2, z + Math.cos(f) * 2.2, { px: x, pz: z }); else if(pose === 'w_s4'){ brilhoChao(x, z, 3.9, CARM, 3); onda(x, z, 3.8, BRASA, .5); } };
})();
