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
    ['halo', 'flare', 'flare_largo', 'losango', 'vento', 'fissura', 'selo'].forEach(txN); TX.veu = tl.load('assets/fx/clerigo_veu_energia.png' + v); TX.veu.wrapS = TX.veu.wrapT = T.RepeatWrapping; TX.raiosCol = TX.raios.clone(); TX.raiosCol.repeat.set(3, 1.2);
    G.pronto = true;
  };
  /* G.preparar({ renderer, camera, scene, rt: fn -> alvo do bloom, rig: fn -> personagem }) (regra: nada compila na hora da skill) */
  var PREP = null; G.preparar = function(c){ PREP = c; };
  function prepTick(){
    if(!PREP || PREP.ok) return; var rig = null; try{ rig = PREP.rig && PREP.rig(); }catch(_){} if(!rig || !rig.root || !rig.swd2h) return;
    var ks = Object.keys(TX); if(!ks.every(function(k){ var im = TX[k].image; return im && im.width; })) return;
    PREP.ok = true; var R = PREP.renderer, g = new T.Group();
    try{ ks.forEach(function(k){ R.initTexture(TX[k]); }); }catch(e){ console.warn('[guerreiro] texturas', e); }
    g.add(sprite(TX.estrela, ACO, 1, 1)); g.add(chao(TX.onda, ACO, 1, 1));
    g.add(new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: ACO, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })));
    var tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(9), 3)); tg.setAttribute('color', new T.BufferAttribute(new Float32Array(9), 3));
    g.add(new T.Mesh(tg, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })));
    rochas(); g.add(new T.Mesh(GEO_ROCHAS[0], MAT_ROCHA)); g.add(new T.Mesh(geoVeu(6, .7), aditivo(ACO, TX.veu, .5)));
    var mc = matCasca(ACO, .5, .01), mf = new T.MeshBasicMaterial({ color: ACO, transparent: true, opacity: .2, blending: T.AdditiveBlending, depthWrite: false });
    malhas(rig).forEach(function(o){ [mc, mf].forEach(function(mm){ var c = new T.SkinnedMesh(o.geometry, mm); c.bind(o.skeleton, o.bindMatrix); c.frustumCulled = false; g.add(c); }); });
    var rt = null; try{ rt = PREP.rt ? PREP.rt() : null; }catch(_){}
    try{ R.setRenderTarget(rt); if(R.compileAsync) R.compileAsync(g, PREP.camera, PREP.scene); else R.compile(g, PREP.camera, PREP.scene); }catch(e){ console.warn('[guerreiro] shaders', e); }
    try{ R.setRenderTarget(null); }catch(_){}
    G._amostras = g;   /* fica guardado: os materiais nao sao descartados, entao os shaders nao somem */
    /* aquecimento real: dispara UMA vez cada skill (w_n0..w_n6) no mesmo instante em que compila e termina os efeitos na hora (nenhum quadro e desenhado com eles).
       Assim a placa monta os programas EXATOS de cada skill atras da tela de carregamento (so o compile acima deixava 3 a 5 shaders para a 1a skill, que travava) */
    try{
      var antes = new Set(PREP.scene.children), ax = window.S ? S.px : 0, az = window.S ? S.pz : 0;      /* o que o aquecimento criar sai da cena depois (rochas, fissuras, marcas ficavam no chao da arena) */
      var oq = { rig: rig, px: -3000, pz: -3000, face: 0, an: { hitT: .3, hitList: [{ t: .3 }, { t: .5 }], total: 1.2, lg: 3 } };
      ['w_n0', 'w_n1', 'w_n2', 'w_n3', 'w_n4', 'w_n5', 'w_n6'].forEach(function(po){ try{ G.swingN(po, oq); if(G.hitN) G.hitN(po, -3000, -3000, oq); }catch(e){} });
      R.setRenderTarget(rt); R.compile(PREP.scene, PREP.camera); R.setRenderTarget(null); /* PREP.scene: na cidade 'cena' e' um proxy (FXCENA), nao um Object3D */
      vivos.slice().forEach(function(f){ try{ f(99); }catch(e){} }); vivos.length = 0;
      PREP.scene.children.slice().forEach(function(o){ if(!antes.has(o)) PREP.scene.remove(o); });
      if(window.RemoteVis) RemoteVis.limpaAquecimento(PREP.scene, antes, ax, az);      /* efeitos com atraso (rochas, fissuras) nascem depois: varre a area do aquecimento por alguns segundos */          /* encerra tudo e tira os efeitos da cena */
    }catch(e){ console.warn('[guerreiro] aquecimento', e); try{ R.setRenderTarget(null); }catch(_){} }
  }
  G.tick = function(dt){ prepTick(); if(TX.veu) TX.veu.offset.y -= dt * .9; for(var i = vivos.length - 1; i >= 0; i--) if(vivos[i](dt)) vivos.splice(i, 1); };
  function seq(dur, fn, fimFn){ var t = 0; vivos.push(function(dt){ t += dt; fn(Math.min(1, t / dur), t); if(t >= dur){ if(fimFn) fimFn(); return true; } return false; }); }
  function aditivo(cor, tex, op, lado){ return new T.MeshBasicMaterial({ color: cor, map: tex || null, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false, side: lado || T.DoubleSide }); }
  function sprite(tex, cor, tam, op){ var s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: cor, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false })); s.scale.set(tam, tam, 1); s.frustumCulled = false; return s; }
  function chao(tex, cor, lado, op, y){ var m = new T.Mesh(new T.PlaneGeometry(lado, lado), aditivo(cor, tex, op)); m.rotation.x = -Math.PI / 2; m.position.y = y || .05; m.frustumCulled = false; return m; }
  function grupo(x, y, z){ var g = new T.Group(); g.position.set(x, y, z); cena.add(g); return g; }
  function some(g){ g.traverse(function(o){ if(o.geometry && o.geometry.dispose && !o.userData.keep) o.geometry.dispose(); }); if(g.parent) g.parent.remove(g); }
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
    var G_ = rochas(); if(leve()) n = Math.ceil(n * .5);   /* lascas de rocha de verdade (bm_lasca_pedra do Blender), material compartilhado */
    for(var i = 0; i < n; i++){ (function(){ var m = new T.Mesh(G_[i % G_.length], MAT_ROCHA); m.userData.keep = true; var a = rnd(0, 6.28), v = rnd(.5, 1) * vel, vz = rnd(2.2, 5.2); m.scale.set(tam * rnd(.6, 1.3), tam * rnd(.4, .9), tam * rnd(.6, 1.1)); m.position.set(x, .2, z); cena.add(m); var vida = rnd(.7, 1.1), w = [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)];
      seq(vida, function(u, t){ m.position.set(x + Math.cos(a) * v * t, Math.max(.05, .2 + vz * t - 9.8 * t * t / 2), z + Math.sin(a) * v * t); m.rotation.set(w[0] * t, w[1] * t, w[2] * t); if(u > .8) m.scale.multiplyScalar(.93); }, function(){ cena.remove(m); }); })(); }
  }
  function brasas(x, y, z, n, alt, vel, cor){
    if(leve()) n = Math.ceil(n * .5);
    for(var i = 0; i < n; i++){ (function(){ var s = sprite(TX.estrela, cor || BRASA, rnd(.14, .3), 1), a = rnd(0, 6.28), v = rnd(.2, 1) * vel, vz = rnd(.7, 1) * alt * 1.4, vida = rnd(.8, 1.6); s.position.set(x, y, z); cena.add(s);
      seq(vida, function(u, t){ s.position.set(x + Math.cos(a) * v * t + .12 * Math.sin(t * 6 + a), y + vz * t - .6 * t * t, z + Math.sin(a) * v * t); s.material.opacity = (1 - u) * (.7 + .3 * Math.sin(t * 20 + a)); }, function(){ some(s); }); })(); }
  }
  function coluna(x, z, H, R, cor, dur, giro){
    var g = grupo(x, 0, z), m = new T.Mesh(new T.CylinderGeometry(R, R * .8, H, 6, 1, true), aditivo(cor, TX.raios, .85)); m.position.y = H / 2; if(!TX.raiosCol){ TX.raiosCol = TX.raios.clone(); TX.raiosCol.needsUpdate = true; TX.raiosCol.repeat.set(3, 1.2); } m.material.map = TX.raiosCol;   /* [travada] 1 copia so (antes: textura nova a cada coluna, nunca liberada) */ g.add(m);
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
      if(t >= dur && n === 0){ cena.remove(mesh); geo.dispose(); return true; } return false;
    });
  }
  function pontaMundo(swd){ var P = swd && ponta(swd); if(!P) return null; var v = P.tip.clone(); swd.localToWorld(v); return v; }

  /* ---------- skills ---------- */
  G.swing = function(pose, o){
    if(!G.pronto) return; if(/^w_n/.test(pose)) return G.swingN(pose, o || {}); var rig = o.rig, swd = rig && rig.swd2h, x = o.px, z = o.pz, dur;
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
    if(!G.pronto) return; o = o || {}; if(/^w_n/.test(pose)) return G.hitN(pose, hx, hz, o); var swd = o.rig && o.rig.swd2h, tp = pontaMundo(swd), px = o.px, pz = o.pz, last = o.last !== false;
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
  G.remoto = function(pose, e){ if(!G.pronto || !e) return; if(/^w_n/.test(pose)) return G.remotoN(pose, e); var x = e.x, z = e.z, f = e.f || 0; if(pose === 'w_s5') G.hit('w_s5', x, z, { px: x, pz: z }); else if(pose === 'w_s6') G.hit('w_s6', x + Math.sin(f) * 2.4, z + Math.cos(f) * 2.4, { face: f, last: true, px: x, pz: z }); else if(pose === 'w_s3') G.hit('w_s3', x + Math.sin(f) * 2.6, z + Math.cos(f) * 2.6, { px: x, pz: z }); else if(pose === 'w_s1') G.hit('w_s1', x + Math.sin(f) * 2.2, z + Math.cos(f) * 2.2, { px: x, pz: z }); else if(pose === 'w_s4'){ brilhoChao(x, z, 3.9, CARM, 3); onda(x, z, 3.8, BRASA, .5); } };

  /* =====================================================================================================================
     KIT NOVO (15/11/2026): poses w_n0..w_n6, desenho aprovado no Blender (guerreiro_skills_novas.blend, tools/blender_fx/guerreiro_novas.py + guerreiro_fx2.py).
     Formula: Optical Lens Flare em 3 camadas (halo largo + estrela anamorfica + barra), ecos do corpo (pose congelada), sombra da espada (copias da lamina que somem),
     contorno do corpo (casca inflada por tras = brilho so na silhueta), sem hexagono e sem quebra de chao onde a espada nao bate no chao.
       w_n0 Investida Relampago  w_n1 Contra-Golpe  w_n2 Tufao + Sede de Sangue  w_n3 Modo de Batalha  w_n4 Execucao  w_n5 Corte Lancador  w_n6 Fenda Sismica
     ===================================================================================================================== */
  var SANG = 0x8c0303, CARM2 = 0xd81408;
  function txN(n){ if(!TX[n]){ TX[n] = new T.TextureLoader().load('assets/fx/guerreiro2_' + n + '.png?v=1'); } return TX[n]; }
  function flareN(x, y, z, tam, cor, dur, largo){
    var h = sprite(txN('halo'), cor, tam * 1.3, .9), s = sprite(txN('flare'), cor, tam, 1), n = sprite(txN('flare'), 0xfff4e0, tam * .4, 1), b = largo === false ? null : sprite(txN('flare_largo'), cor, tam * 3, 1);
    [h, s, n, b].forEach(function(q){ if(q){ q.position.set(x, y, z); cena.add(q); } }); if(b) b.scale.set(tam * 3, tam * .38, 1);
    seq(dur || .45, function(u){ var k = u < .1 ? u / .1 : 1 - (u - .1) / .9, e = .45 + .65 * Math.min(1, u * 6);
      s.scale.set(tam * e, tam * e, 1); s.material.opacity = Math.max(0, k); n.material.opacity = Math.max(0, k * (1 - u)); h.material.opacity = Math.max(0, .85 * (1 - u * .9));
      if(b){ b.scale.set(tam * 3 * e, tam * .38, 1); b.material.opacity = Math.max(0, k); } }, function(){ some(s); some(h); some(n); if(b) some(b); });
  }
  function matCasca(cor, op, infla){
    var m = new T.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.BackSide });
    m.userData.inf = { value: infla || 0 };
    m.onBeforeCompile = function(sh){ sh.uniforms.uInf = m.userData.inf; sh.vertexShader = 'uniform float uInf;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normal * uInf;'); };
    return m;
  }
  function malhas(rig){ var L = []; if(rig && rig.root) rig.root.traverse(function(o){ if(o.isSkinnedMesh && o.visible && !o.userData.gwCopia && o.geometry && o.geometry.attributes.normal) L.push(o);   /* nunca copia as proprias copias (contorno/eco): antes dobrava a cada skill */ }); return L; }
  function escalaRig(rig){ var L = malhas(rig); return L.length ? L[0].matrixWorld.getMaxScaleOnAxis() : 1; }
  /* contorno: casca colada no corpo (mesmo esqueleto = acompanha a animacao); fn(t) -> opacidade; some quando fn devolve < 0 */
  function contornoN(rig, cor, dur, fn){
    if(!rig || !rig.root) return; var L = malhas(rig); if(!L.length) return; if(cor === CARM2) cor = 0xff3c0a;   /* carmesim puro aditivo sobre a pele + bloom puxa para o rosa: brasa no contorno */
    var sc = escalaRig(rig), m = matCasca(cor, 0, .022 / Math.max(sc, 1e-4)), cs = [];
    L.forEach(function(o){ var c = new T.SkinnedMesh(o.geometry, m); c.userData.gwCopia = true; c.bind(o.skeleton, o.bindMatrix); c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale); c.frustumCulled = false; c.renderOrder = 5; o.parent.add(c); cs.push(c); });
    seq(dur, function(u, t){ m.opacity = .65 * Math.max(0, Math.min(1, fn ? fn(t, u) : (u < .1 ? u / .1 : 1 - u))); }, function(){ cs.forEach(function(c){ if(c.parent) c.parent.remove(c); }); });
  }
  /* esqueleto parado na pose atual: calcula os ossos uma vez so (nao reenvia a textura de ossos todo quadro); malhas com o mesmo esqueleto dividem a copia */
  function congela(src, lista){ for(var i = 0; i < lista.length; i++) if(lista[i]._src === src) return lista[i];
    var bs = src.bones.map(function(b){ var n = new T.Bone(); n.matrixAutoUpdate = false; n.matrixWorld.copy(b.matrixWorld); return n; }), sk = new T.Skeleton(bs, src.boneInverses), up = sk.update, feito = false;
    sk._src = src; sk.update = function(){ if(feito) return; feito = true; up.call(sk); }; lista.push(sk); return sk; }
  /* eco do corpo: copia da pose ATUAL (ossos congelados) com brilho na silhueta e um pouco de miolo; some em `vida` s */
  function ecoN(rig, cor, vida, a0, soEspada){
    if(!rig) return; var g = new T.Group(); cena.add(g); var corpo = !soEspada && !leve(), mf = null, mc = null, me = null;     /* sombra so da espada: nao cria os materiais do corpo (eram 2 a mais a cada 0,03 s) */
    if(corpo){ mf = new T.MeshBasicMaterial({ color: cor, transparent: true, opacity: .18 * a0, blending: T.AdditiveBlending, depthWrite: false }); mc = matCasca(cor, a0, .03 / Math.max(escalaRig(rig), 1e-4)); }
    var sks = [];
    if(corpo) malhas(rig).forEach(function(o){
      o.updateMatrixWorld(true); var sk = congela(o.skeleton, sks);
      [mf, mc].forEach(function(mm){ var c = new T.SkinnedMesh(o.geometry, mm); c.userData.gwCopia = true; c.bind(sk, o.bindMatrix); c.matrixAutoUpdate = false; c.matrix.copy(o.matrixWorld); c.frustumCulled = false; g.add(c); });
    });
    var swd = rig.swd2h; if(swd){ swd.updateMatrixWorld(true); me = new T.MeshBasicMaterial({ color: cor, transparent: true, opacity: .55 * a0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      swd.traverse(function(o){ if(!o.isMesh || !o.geometry) return; var c = new T.Mesh(o.geometry, me); c.matrixAutoUpdate = false; c.matrix.copy(o.matrixWorld); c.frustumCulled = false; g.add(c); }); }
    seq(vida, function(u){ var k = 1 - u; if(mf) mf.opacity = .18 * a0 * k; if(mc) mc.opacity = a0 * k; if(me) me.opacity = .55 * a0 * k * k; }, function(){ cena.remove(g); sks.forEach(function(k){ k.dispose(); }); });
  }
  /* sombra da espada: uma copia da lamina a cada `passo` s durante `dur` s */
  function sombrasN(rig, dur, passo, cor, vida, a0, atraso){ var t = -(atraso || 0), prox = 0; vivos.push(function(dt){ t += dt; if(t < 0) return false; if(t >= prox){ prox += passo * (leve() ? 2 : 1); ecoN(rig, cor, vida, a0, true); } return t >= dur; }); }
  function ecosN(rig, ini, fim, passo, cor, vida, a0){ var t = 0, prox = ini; vivos.push(function(dt){ t += dt; if(t >= prox && t <= fim){ prox += passo * (leve() ? 2 : 1); ecoN(rig, cor, vida, a0, false); } return t > fim; }); }
  function peitoDe(o){ return { x: (window.S ? S.px : o.px), y: 1.3, z: (window.S ? S.pz : o.pz) }; }
  /* estilhacos de vida voando do alvo ate o peito do guerreiro (Sede de Sangue) */
  function drenoN(x, y, z, n, alvoFn, cor){
    for(var i = 0; i < n; i++){ (function(){ var s = sprite(txN('losango'), cor || CARM2, rnd(.25, .4), 1), lado = new T.Vector3(rnd(-1.4, 1.4), rnd(.3, 1.4), rnd(-1.4, 1.4)), o0 = new T.Vector3(x, y, z), dur = rnd(.35, .55), atraso = rnd(0, .12); s.visible = false; cena.add(s);
      seq(dur + atraso, function(u, t){ var e = Math.max(0, (t - atraso) / dur); if(e <= 0) return; s.visible = true; e = e * e * (3 - 2 * e); var p = alvoFn(), D = new T.Vector3(p.x, p.y, p.z), C = o0.clone().add(D).multiplyScalar(.5).add(lado);
        s.position.copy(o0).multiplyScalar((1 - e) * (1 - e)).addScaledVector(C, 2 * (1 - e) * e).addScaledVector(D, e * e); s.material.opacity = e > .85 ? (1 - e) / .15 : 1; }, function(){ some(s); }); })(); }
  }
  function marcaN(x, y, z, ang, cor){ var s = sprite(txN('flare_largo'), cor, 2.4, 1); s.scale.set(2.4, .26, 1); s.material.rotation = ang; s.position.set(x, y, z); cena.add(s); return s; }
  function estilhacosN(x, y, z, n, cor){ for(var i = 0; i < n; i++){ (function(){ var s = sprite(txN('losango'), cor, rnd(.35, .55), 1), a = rnd(0, 6.28), v = rnd(2.2, 4), vz = rnd(1, 3); s.position.set(x, y, z); cena.add(s); seq(.45, function(u, t){ s.position.set(x + Math.cos(a) * v * t, y + vz * t, z + Math.sin(a) * v * t); s.material.opacity = 1 - u; }, function(){ some(s); }); })(); } }
  function vorticeN(fnCentro, dur, n, cor){
    n = leve() ? Math.ceil(n / 3) : n; var ps = [];
    for(var i = 0; i < n; i++){ var vento = i % 3 !== 0, s = sprite(vento ? txN('vento') : txN('losango'), vento ? 0xffe0c0 : 0xff6a14, 1, 1); if(vento) s.scale.set(rnd(1, 2), .1, 1); else s.scale.set(.25, .25, 1); cena.add(s); ps.push({ s: s, a: rnd(0, 6.28), r: rnd(.9, 1.9), w: rnd(11, 16), z0: rnd(.1, .9), t0: rnd(0, dur * .9), vida: rnd(.3, .55) }); }
    var t = 0; vivos.push(function(dt){ t += dt; var c = fnCentro(); ps.forEach(function(p){ var k = (t - p.t0) / p.vida; if(k < 0 || k > 1){ p.s.visible = false; if(k > 1 && t < dur){ p.t0 = t + rnd(0, .1); } return; } p.s.visible = true; var a = p.a + p.w * (t - p.t0), r = p.r * (1 - .25 * k); p.s.position.set(c.x + Math.cos(a) * r, p.z0 + 2.4 * k, c.z + Math.sin(a) * r); p.s.material.opacity = k < .15 ? k / .15 : 1 - (k - .15) / .85; });
      if(t >= dur + .6){ ps.forEach(function(p){ some(p.s); }); return true; } return false; });
  }
  function fissuraN(x, z, rumo, comp, larg, cor, vida){ var geo = new T.PlaneGeometry(comp, larg); geo.rotateX(-Math.PI / 2); var m = new T.Mesh(geo, aditivo(cor, txN('fissura'), 1)); m.rotation.y = rumo - Math.PI / 2; m.position.set(x, .06, z);   /* rumo = direcao no chao (como o face): comprimento ao longo dela */ m.frustumCulled = false; cena.add(m);
    seq(vida || 1.6, function(u){ var s = u < .06 ? u / .06 : 1; m.scale.set(s, 1, 1); m.material.opacity = u < .75 ? 1 : Math.max(0, 1 - (u - .75) / .25); }, function(){ some(m); }); }
  function rochasN(x, z, n, alt, ang){ lajesN(x, z, n, ang == null ? null : ang, .5 * (alt || 1), (alt || 1), 1.3, ang == null ? rnd(.2, .6) : .45); }   /* pedras de verdade (lajes do Blender) no lugar dos dados de 12 faces */
  /* ---------- pecas do Blender que faltavam no jogo (17/11/2026, comparacao skill a skill com guerreiro_skills_novas.blend) ----------
     rocha: icosfera deformada por ruido, base achatada, faces chapadas, cor de rocha escura/clara (bm_pedra + mat_rocha do guerreiro_fx2.py)
     laje: rocha alongada que sobe do chao inclinada para fora e afunda no fim (lajes_erguem); veu: prisma estrelado translucido com filamentos subindo (veu);
     selo: selo angular no chao, entra devagar e gira pouco (selo). Geometrias e o material da rocha sao compartilhados (nada e criado/descartado por golpe). */
  var GEO_ROCHAS = null, MAT_ROCHA = null, GEO_VEU = {};
  function ruido(x, y, z){ return Math.sin(x * 1.9 + Math.sin(y * 1.3) * 1.7) * Math.cos(y * 1.7 + Math.sin(z * 1.1) * 1.5) * .7 + Math.sin(z * 2.3 + x * .9) * .3; }
  function rochas(){
    if(GEO_ROCHAS) return GEO_ROCHAS; GEO_ROCHAS = [];
    for(var s = 0; s < 6; s++){
      var g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position, v = new T.Vector3(), o = [s * 13.7 + 1, s * 7.3 + 5, s * 3.1 + 9], corte = -(.1 + .25 * ((s * .37) % 1)), cor = new Float32Array(p.count * 3);
      for(var i = 0; i < p.count; i++){ v.fromBufferAttribute(p, i); var n = ruido(v.x * 1.3 + o[0], v.y * 1.3 + o[1], v.z * 1.3 + o[2]) * .38 + ruido(v.x * 3.1 + o[0], v.y * 3.1 + o[1], v.z * 3.1 + o[2]) * .12;
        v.multiplyScalar(1 + n); v.y = Math.max(v.y, corte); p.setXYZ(i, v.x, v.y, v.z); var k = Math.max(0, Math.min(1, (n + .25) / .5));
        cor[i * 3] = .085 + k * .21; cor[i * 3 + 1] = .075 + k * .17; cor[i * 3 + 2] = .066 + k * .14; }
      g.setAttribute('color', new T.BufferAttribute(cor, 3)); g.computeVertexNormals(); GEO_ROCHAS.push(g);
    }
    MAT_ROCHA = new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x1c0703 }); return GEO_ROCHAS;
  }
  /* lajes de rocha: n lajes a `dist` m de (x,z) na direcao `ang` (rumo como o face; null = qualquer), altura alt0..alt1 m, ficam `vida` s */
  function lajesN(x, z, n, ang, alt0, alt1, vida, dist){
    var G_ = rochas(); n = leve() ? Math.ceil(n / 2) : n;
    for(var k = 0; k < n; k++){ (function(){
      var a = ang == null ? rnd(0, 6.28) : ang + rnd(-.5, .5), d = dist == null ? .45 : dist, h = rnd(alt0 || .8, alt1 || 1.4), w = rnd(.36, .48), dd = Math.max(.32, w * .75);
      var m = new T.Mesh(G_[Math.floor(rnd(0, G_.length))], MAT_ROCHA); m.userData.keep = true; m.rotation.order = 'YXZ'; m.rotation.y = a + rnd(-.25, .25); m.rotation.x = rnd(.24, .52); m.rotation.z = rnd(-.24, .24);
      m.position.set(x + Math.sin(a) * d, -.02, z + Math.cos(a) * d); cena.add(m); var V_ = vida || 1;
      seq(V_ + .28, function(u, t){ var sy = t < .04 ? .25 + .85 * t / .04 : (t < .08 ? 1.1 : (t < .15 ? 1.1 - .1 * (t - .08) / .07 : 1)); if(t > V_) sy = Math.max(.001, 1 - (t - V_) / .28);
        m.scale.set(w / 2, h / 2 * sy, dd / 2); }, function(){ cena.remove(m); });
    })(); }
  }
  function geoVeu(pontas, r2){ var ch = pontas + '_' + r2; if(GEO_VEU[ch]) return GEO_VEU[ch];
    var g = new T.CylinderGeometry(1, 1, 1, pontas * 2, 1, true), p = g.attributes.position, v = new T.Vector3();
    for(var i = 0; i < p.count; i++){ v.fromBufferAttribute(p, i); var a = Math.atan2(v.x, v.z), idx = Math.round(a / (Math.PI / pontas)); if(Math.abs(idx) % 2 === 1){ p.setX(i, v.x * r2); p.setZ(i, v.z * r2); } }
    g.translate(0, .5, 0); return GEO_VEU[ch] = g; }
  /* veu de energia: prisma estrelado (pontas) de raio R e altura H; cresce rapido, fica `vida` s, abre e achata ao sumir */
  function veuN(x, z, R, H, cor, vida, r2, pontas){
    var m = new T.Mesh(geoVeu(pontas || 6, r2 || .7), aditivo(cor, TX.veu, .9)); m.userData.keep = true; m.position.set(x, .02, z); m.rotation.y = rnd(0, 6.28); m.frustumCulled = false; cena.add(m); var V_ = vida || .3;
    seq(.12 + V_ + .3, function(u, t){ var sy, sr = 1, op = .9; if(t < .12){ sy = .02 + .98 * t / .12; } else if(t < .12 + V_){ sy = 1; } else { var e = (t - .12 - V_) / .3; sy = Math.max(.001, 1 - e); sr = 1 + .15 * e; op = .9 * (1 - e); }
      m.scale.set(R * sr, H * sy, R * sr); m.material.opacity = op; m.rotation.y += .01; }, function(){ cena.remove(m); });
  }
  /* selo angular no chao, preso a fnPos() (o jogador); entra em .2 s, gira devagar, some no fim */
  function seloN(fnPos, R, cor, vida, giro){
    var m = chao(txN('selo'), cor, R * 2, 0, .06); cena.add(m); var V_ = vida || 1;
    seq(V_ + .25, function(u, t){ var p = fnPos(); m.position.x = p.x; m.position.z = p.z; m.rotation.z = (giro || .3) * t; var s = t < .2 ? .4 + .6 * t / .2 : 1; m.scale.set(s, s, s);
      m.material.opacity = t < .2 ? .85 * t / .2 : (t > V_ ? Math.max(0, .85 * (1 - (t - V_) / .25)) : .85); }, function(){ some(m); });
  }
  /* linhas de velocidade ao longo de um caminho (sprites esticados de vento) */
  function linhasN(x, z, fx, fz, L, n, t0, cor){
    for(var i = 0; i < (leve() ? Math.ceil(n / 2) : n); i++){ (function(){ var s = sprite(txN('vento'), cor || 0xffe8d0, 1, 1), k = rnd(.1, .9), h = rnd(.4, 1.8), w = rnd(1.2, 2.4), ti = (t0 || 0) + k * .15; s.scale.set(w, .07, 1); s.visible = false; cena.add(s);
      seq(ti + .25, function(u, t){ if(t < ti) return; s.visible = true; var e = (t - ti) / .25; s.position.set(x + fx * (L * k + e * .6), h, z + fz * (L * k + e * .6)); s.material.opacity = 1 - e; }, function(){ some(s); }); })(); }
  }
  function estrelasStun(x, z, dur){ for(var k = 0; k < 4; k++){ (function(k){ var s = sprite(txN('flare'), OURO, .6, 1); cena.add(s); seq(dur, function(u, t){ var a = k * 1.5708 + t * 6; s.position.set(x + Math.cos(a) * .5, 2.3 + .06 * Math.sin(t * 9), z + Math.sin(a) * .5); s.material.opacity = u < .9 ? 1 : (1 - u) / .1; }, function(){ some(s); }); })(k); } }
  function auraLamina(swd, dur, cor){
    if(!swd) return; var P = ponta(swd); if(!P) return; var L = [];
    for(var i = 0; i < 5; i++){ var s = sprite(txN('halo'), cor, P.len * .55, .0); s.position.copy(P.org).lerp(P.tip, .15 + .19 * i); swd.add(s); L.push(s); }
    seq(dur, function(u, t){ var k = u < .05 ? u / .05 : (u > .92 ? (1 - u) / .08 : 1); L.forEach(function(s, i){ s.material.opacity = k * (.55 + .25 * Math.sin(t * 7 + i)); }); }, function(){ L.forEach(function(s){ swd.remove(s); s.material.dispose(); }); });
  }
  function tempos(an){ var ht = (an && an.hitT) || .5, L = an && an.hitList ? an.hitList.map(function(h){ return h.t; }) : [ht]; return { ht: ht, L: L, tot: (an && an.total) || 2 }; }

  G.swingN = function(pose, o){
    var rig = o.rig, swd = rig && rig.swd2h, x = o.px, z = o.pz, f = o.face || 0, tm = tempos(o.an), fx = Math.sin(f), fz = Math.cos(f);
    if(pose === 'w_n0'){                                                                           /* Investida: arrancada com ecos, linhas de vento e rastro no chao */
      contornoN(rig, CARM2, tm.ht + .6, function(t){ return t < .1 ? t / .1 * .8 : (t < tm.ht + .2 ? .8 : .8 - (t - tm.ht - .2) * 2); });
      ecosN(rig, tm.ht * .4, tm.ht * 1.15, .05, CARM2, .32, .7); sombrasN(rig, tm.ht * 1.2, .035, CARM2, .25, .6, tm.ht * .3);
      var L = o.an && o.an.lg ? o.an.lg : 7.6, gr = new T.PlaneGeometry(L, .7); gr.rotateX(-Math.PI / 2); var r = new T.Mesh(gr, aditivo(CARM, txN('flare_largo'), .8)); r.frustumCulled = false; r.position.set(x + fx * L / 2, .05, z + fz * L / 2); r.rotation.y = f - Math.PI / 2; cena.add(r);
      seq(tm.ht + 1.2, function(u, t){ var k = t < tm.ht ? t / tm.ht : 1; r.scale.set(Math.max(.01, k), 1, 1); r.material.opacity = t < tm.ht + .5 ? .8 : Math.max(0, .8 * (1 - (t - tm.ht - .5) / .7)); }, function(){ some(r); });
      for(var i = 0; i < (leve() ? 6 : 14); i++){ (function(){ var s = sprite(txN('vento'), 0xffe8d0, rnd(1.6, 3), 1), k = rnd(.1, .9), h = rnd(.3, 2); s.scale.set(rnd(1.6, 3), .07, 1); s.visible = false; cena.add(s); var t0 = tm.ht * (.35 + .6 * k);
        seq(t0 + .3, function(u, t){ if(t < t0) return; s.visible = true; var e = (t - t0) / .3; s.position.set(x + fx * (L * k + e) + fz * rnd(-.3, .3) * 0, h, z + fz * (L * k + e)); s.material.opacity = 1 - e; }, function(){ some(s); }); })(); }
      lascas(x, z, 6, 2.2, .1);
    }
    else if(pose === 'w_n1'){                                                                      /* Contra-Golpe: guarda dourada (placa em losango + contorno), sombra da espada no revide */
      var g0 = tm.ht * .34, g1 = tm.ht * .5; contornoN(rig, OURO, tm.ht + .5, function(t){ return t < g0 ? t / g0 * .35 : (t < g1 ? .35 + .5 * (t - g0) / (g1 - g0) : Math.max(0, .85 - (t - g1) * 2.5)); });
      var gm = new T.Mesh(new T.PlaneGeometry(1.1, 1.9), aditivo(OURO, txN('losango'), 0)); gm.position.set(x + fx * .75, 1.2, z + fz * .75); gm.rotation.y = f; gm.frustumCulled = false; cena.add(gm);
      seq(g1 + .2, function(u, t){ gm.material.opacity = t < g0 ? 0 : (t < g1 ? .9 : Math.max(0, .9 - (t - g1) * 5)); var e = t > g1 ? 1 + (t - g1) * 2 : 1; gm.scale.set(e, e, 1); gm.position.set((window.S ? S.px : x) + fx * .75, 1.2, (window.S ? S.pz : z) + fz * .75); }, function(){ some(gm); });
      setTimeout(function(){ var p = pontaMundo(swd); if(p) flareN(p.x, p.y, p.z, 1.2, OURO, .3, false); }, g0 * 1000);
      sombrasN(rig, .32, .03, CARM2, .26, .6, tm.ht - .3); ecosN(rig, tm.ht - .14, tm.ht - .04, .07, CARM2, .3, .5); trilha(swd, tm.ht + .1, 1.1);
    }
    else if(pose === 'w_n2'){                                                                      /* Tufao: lamina deitada, vortice de vento, sombras da espada, contorno de sangue */
      var giro = (tm.L[tm.L.length - 2] || tm.ht) + .1; contornoN(rig, SANG, tm.tot + .4, function(t){ return t < .3 ? t / .3 * .5 : (t < tm.tot ? .5 + .25 * Math.sin(t * 9) : Math.max(0, .5 - (t - tm.tot) * 2)); });
      auraLamina(swd, tm.tot, SANG); trilha(swd, giro, .9); sombrasN(rig, giro, .045, CARM2, .2, .6, tm.ht * .6);
      seloN(function(){ return { x: window.S ? S.px : x, z: window.S ? S.pz : z }; }, 1.7, SANG, tm.tot + .2, .6);   /* selo de postura (Blender: selo 's' preso ao corpo) */
      vorticeN(function(){ return { x: window.S ? S.px : x, z: window.S ? S.pz : z }; }, giro, 70, CARM2);
      if(!leve()) vorticeN(function(){ return { x: window.S ? S.px : x, z: window.S ? S.pz : z }; }, giro, 30, SANG);
    }
    else if(pose === 'w_n3'){                                                                      /* Modo de Batalha: estilhacos convergem para a lamina enquanto ele concentra */
      var P0 = swd && ponta(swd); if(P0){ for(var j = 0; j < (leve() ? 10 : 26); j++){ (function(){ var s = sprite(txN('losango'), BRASA, .2, 1), a0 = rnd(0, 6.28), r0 = rnd(1.2, 2), z0 = rnd(-.2, 1.6), t0 = rnd(0, tm.ht * .7), d = rnd(.3, .5); s.visible = false; cena.add(s);
        seq(t0 + d, function(u, t){ if(t < t0) return; s.visible = true; var e = (t - t0) / d, alvo = P0.org.clone().lerp(P0.tip, .5); swd.localToWorld(alvo); var a = a0 + e * 2.4; s.position.set(alvo.x + Math.cos(a) * r0 * (1 - e * e), alvo.y + z0 * (1 - e * e), alvo.z + Math.sin(a) * r0 * (1 - e * e)); s.material.opacity = 1 - e * .5; }, function(){ some(s); }); })(); } }
      contornoN(rig, CARM2, tm.ht + .1, function(t){ return .4 * t / tm.ht; }); seloN(function(){ return { x: window.S ? S.px : x, z: window.S ? S.pz : z }; }, 2.6, BRASA, tm.tot, .35);
    }
    else if(pose === 'w_n4'){                                                                      /* Execucao: arrancada com ecos, contorno, lamina em brasa, sombra da espada em cada corte */
      contornoN(rig, CARM2, tm.tot + .5, function(t){ return t < .15 ? t / .15 * .6 : (t < tm.tot ? .6 + .25 * Math.sin(t * 8) : Math.max(0, .6 - (t - tm.tot) * 2)); });
      auraLamina(swd, tm.tot, CARM2); ecosN(rig, .05, tm.ht * .9, .06, CARM2, .3, .55); linhasN(x, z, fx, fz, 2.2, 8, .05);
      tm.L.forEach(function(th, k){ sombrasN(rig, k === tm.L.length - 1 ? .3 : .22, .03, CARM2, .28, k === tm.L.length - 1 ? .8 : .55, Math.max(0, th - .24)); });
      trilha(swd, tm.tot, 1.1);
    }
    else if(pose === 'w_n5'){                                                                      /* Corte Lancador: sombra na cravada, no arranque, no ar e na descida */
      tm.L.forEach(function(th, k){ sombrasN(rig, .26, .03, k === 0 ? BRASA : CARM2, .26, .55, Math.max(0, th - .22)); });
      var tl = tm.L[1] || tm.ht; ecosN(rig, tl + .05, tl + .25, .08, CARM2, .3, .45); var td = tm.L[tm.L.length - 1]; ecosN(rig, td - .28, td, .1, CARM2, .3, .55); trilha(swd, tm.tot, 1.05);
    }
    else if(pose === 'w_n6'){                                                                      /* Fenda Sismica: lamina acende e o corpo pega brasa na cravada */
      auraLamina(swd, tm.ht + .8, BRASA); contornoN(rig, BRASA, tm.ht + .7, function(t){ return t < tm.ht ? .15 : Math.max(0, .85 - (t - tm.ht) * 1.3); }); trilha(swd, tm.ht + .05, 1);
    }
  };
  G.hitN = function(pose, hx, hz, o){
    var swd = o.rig && o.rig.swd2h, tp = pontaMundo(swd), last = o.last !== false, part = o.part || 1, f = o.face || 0, fx = Math.sin(f), fz = Math.cos(f);
    var ex = tp ? tp.x : hx, ey = tp ? Math.max(.4, tp.y) : 1.3, ez = tp ? tp.z : hz, pt = function(){ var q = peitoDe(o); return q; };
    if(pose === 'w_n0'){                                                                           /* linha de corte no alvo; 0,38 s depois explode */
      var cx = (o.px != null ? o.px : hx) - fx * 1.2, cz = (o.pz != null ? o.pz : hz) - fz * 1.2, mk = marcaN(cx, 1.25, cz, 0, ACO); flareN(cx, 1.25, cz, 1.2, ACO, .25, false);
      seq(.42, function(u){ mk.scale.set(2.4 + u * .6, .26 * (1 - u * .4), 1); }, function(){ some(mk); flareN(cx, 1.25, cz, 4.4, CARM2, .6); flareN(cx, 1.25, cz, 2, ACO, .35, false); estilhacosN(cx, 1.25, cz, leve() ? 4 : 8, CARM2); brasas(cx, 1.2, cz, 18, 2.4, 2); veuN(cx, cz, .5, 3.6, ACO, .2, .7, 6); agita(.5); flash('#ff3a1a', .2, 260); });
    }
    else if(pose === 'w_n1'){ flareN(ex, ey, ez, 2.8, CARM2, .45); flareN(ex, ey, ez, 1.1, ACO, .22, false); espinhos(ex, ey, ez, leve() ? 6 : 10, 1, ACO, .25); brasas(ex, ey, ez, 16, 2.2, 1.8); estrelasStun(hx, hz, 1.5); agita(.45); }
    else if(pose === 'w_n2'){
      if(!last){ flareN(ex, ey, ez, 1.5, part % 2 ? SANG : ACO, .28, part % 2 === 0); drenoN(ex, ey, ez, leve() ? 2 : 4, pt, CARM2); if(part % 3 === 0){ var px_ = window.S ? S.px : hx, pz_ = window.S ? S.pz : hz; lascas(px_, pz_, 3, 2.6, .07); brasas(px_, .6, pz_, 6, 2.2, 2.4); } agita(.12); return; }
      var X = window.S ? S.px : hx, Z = window.S ? S.pz : hz; flareN(X, 1.1, Z, 4.6, CARM2, .6); flareN(X, 1.1, Z, 3.4, SANG, .7, false); estilhacosN(X, 1.1, Z, leve() ? 5 : 10, CARM2); drenoN(X + 1.5, 1.2, Z, leve() ? 4 : 10, pt, CARM2); brasas(X, 1, Z, 30, 2.6, 2.4); estrelasStun(hx, hz, 1.25); setTimeout(function(){ var q = window.S ? { x: S.px, z: S.pz } : { x: X, z: Z }; veuN(q.x, q.z, .8, 2.4, SANG, .37, .88, 8); }, 450); agita(.6); flash('#c01008', .22, 300);
    }
    else if(pose === 'w_n3'){ var P = swd && ponta(swd); if(P){ [.18, .36, .54, .72, .9].forEach(function(k, i){ var v = P.org.clone().lerp(P.tip, k); swd.localToWorld(v); flareN(v.x, v.y, v.z, i === 2 ? 3 : 1.6, i === 2 ? ACO : BRASA, .5, i === 2); }); } agita(.4); flash('#ff4a1a', .18, 260); }
    else if(pose === 'w_n4'){
      var ox = o.px != null ? o.px + fx * 1.35 : hx, oz = o.pz != null ? o.pz + fz * 1.35 : hz; G._marcas = G._marcas || [];
      if(!last){ flareN(ox, 1.3, oz, 1.6, ACO, .3, part % 2 === 1); var mk2 = marcaN(ox + rnd(-.15, .15), 1.3 + rnd(-.25, .25), oz, rnd(-1.2, 1.2), part % 2 ? CARM2 : BRASA); G._marcas.push(mk2); brasas(ox, 1.3, oz, 8, 1.6, 1.4); agita(.15); return; }
      var feixe = sprite(txN('losango'), ACO, 1, 1); feixe.scale.set(.5, 5, 1); feixe.position.set(ox, 2.2, oz); cena.add(feixe); seq(.45, function(u){ feixe.scale.set(.5 * (1 - u), 5, 1); feixe.material.opacity = 1 - u; }, function(){ some(feixe); });
      flareN(ox, 1.3, oz, 2.6, ACO, .35); var ms = G._marcas.splice(0); setTimeout(function(){ ms.forEach(function(m){ seq(.25, function(u){ m.scale.set(2.4 * (1 + u), .26 * (1 + 2 * u), 1); m.material.opacity = 1 - u; }, function(){ some(m); }); });
        flareN(ox, 1.3, oz, 4.6, CARM2, .6); flareN(ox, 1.3, oz, 2.2, ACO, .35, false); estilhacosN(ox, 1.3, oz, leve() ? 5 : 10, CARM2); brasas(ox, 1.2, oz, 30, 2.6, 2.4); agita(.6); flash('#ff2a10', .22, 280); }, 300);
    }
    else if(pose === 'w_n5'){
      if(part === 1){ flareN(ex, .4, ez, 1.4, BRASA, .3, false); fenda(ex, ez, 1.2, BRASA, 1.2, .2); return; }
      if(part === 2){ for(var i = 0; i < 7; i++){ var a = f + (i - 3) * .15, L2 = rnd(2.8, 4); fissuraN(ex + Math.sin(a) * L2 / 2, ez + Math.cos(a) * L2 / 2, a, L2, .7, i % 2 ? BRASA : CARM, 1.6); for(var j = 0; j < 3; j++){ var tq = (j + 1) / 4; lajesN(ex + Math.sin(a) * L2 * tq, ez + Math.cos(a) * L2 * tq, 1, a, .5 + .5 * (1 - tq), 1 + .6 * (1 - tq), .92); } }
        lascas(ex + fx * .8, ez + fz * .8, 16, 4, .16); flareN(ex, .6, ez, 2.6, BRASA, .4); agita(.4); return; }
      if(!last){ flareN(ex, ey, ez, 1.8, ACO, .3); brasas(ex, ey, ez, 8, 1.4, 1.6); agita(.15); return; }
      fenda(ex, ez, 4.2, BRASA, 2.2, .3); fenda(ex, ez, 2.8, CARM, 2, 1.2); for(var e8 = 0; e8 < 8; e8++){ var a8 = e8 * .785 + rnd(-.2, .2); lajesN(ex, ez, 1, a8, .8, 1.5, 1.05, rnd(1, 1.8)); } lascas(ex, ez, 30, 4.8, .2); flareN(ex, .8, ez, 4.4, ACO, .55); veuN(ex, ez, .5, 3.6, BRASA, .2, .7, 6); agita(.7); flash('#ff6a14', .25, 300);
    }
    else if(pose === 'w_n6'){                                                                      /* a fenda corre 9 m pela frente: segmentos, rochas, jatos e flares; fecha com explosao */
      var x0 = ex, z0 = ez; flareN(x0, .6, z0, 2.8, ACO, .4); fenda(x0, z0, 2.2, BRASA, 2.2, .4); agita(.45); estrelasStun(hx, hz, 1.45);
      var passos = Math.round(9 / .75); for(var k = 0; k < passos; k++){ (function(k){ setTimeout(function(){ var d = .4 + k * .75, cx = x0 + fx * d, cz = z0 + fz * d; fissuraN(cx, cz, f, 1.45, 1.1, k % 2 ? BRASA : CARM, 1.8); lajesN(cx, cz, 3, k % 2 ? f + 1.57 : f - 1.57, .7, 1.4, 1.05); if(k % 2 === 0){ veuN(cx, cz, .26, 2.2 + rnd(0, .9), BRASA, .25, .7, 5); flareN(cx, .5, cz, 1.4, BRASA, .25, false); agita(.08); } lascas(cx, cz, 4, 2.4, .12);
        if(k === passos - 1){ flareN(cx, .8, cz, 4, ACO, .5); veuN(cx, cz, .7, 5.2, ACO, .45, .75, 6); lascas(cx, cz, 16, 3.6, .18); agita(.4); } }, k * 50); })(k); }
    }
  };
  G.modo = function(rig, dur){ if(!G.pronto || !rig) return; auraLamina(rig.swd2h, dur, CARM2); contornoN(rig, CARM2, dur, function(t, u){ return u > .95 ? (1 - u) / .05 * .55 : .45 + .15 * Math.sin(t * 5); }); var tb_ = 0, tt_ = 0; vivos.push(function(dt){ tt_ += dt; tb_ -= dt; if(tb_ <= 0){ tb_ = leve() ? .7 : .36; if(window.S) brasas(S.px, .4, S.pz, 4, 2.8, .7); } return tt_ >= dur; });   /* aura de brasas do buff (Blender: aura_br a cada 18 quadros) */
    var t = 0, prox = 0; vivos.push(function(dt){ t += dt; if(t >= prox && window.S){ prox += .35; brasas(S.px, .4, S.pz, leve() ? 2 : 4, 2.8, .6); } return t >= dur; }); };
  G.modoRemoto = function(x, z){ if(!G.pronto) return; flareN(x, 1.8, z, 3, BRASA, .5); brasas(x, .5, z, 20, 2.6, 1); };
  G.remotoN = function(pose, e){ var x = e.x, z = e.z, f = e.f || 0, fx = Math.sin(f), fz = Math.cos(f);
    if(pose === 'w_n0') G.hitN('w_n0', x, z, { px: x, pz: z, face: f, last: true });
    else if(pose === 'w_n6') G.hitN('w_n6', x + fx * 1.4, z + fz * 1.4, { face: f, last: true });
    else if(pose === 'w_n2') vorticeN(function(){ return { x: x, z: z }; }, 3.2, 40, CARM2);
    else flareN(x + fx * 1.5, 1.3, z + fz * 1.5, 2.6, CARM2, .45);
  };
})();
