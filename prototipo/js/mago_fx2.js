/* Efeitos do MAGO, parte 2: as skills 2 a 5 (desenhos aprovados pelo dono no Blender, cena mage_skills.blend: MAGO_S2_FOGO, MAGO_S2_FOGO_DISCO, MAGO_S2_AGUA, MAGO_S2_NECRO_PARALISIA).
     Meteoro de Magma (Archmage)  -> MagoFX2.meteoro(x, z, T)      aviso no chao, pedra cai e explode no tempo T
     Disco de Fogo (Archmage)     -> MagoFX2.criarDisco(escala)    projetil deitado, gira e faz espiral lateral (voo na borda de um vortice)
     Coluna de Agua (Spellsinger) -> MagoFX2.coluna(x, z, T, cx, cz)  aviso azul no alvo, correntes de agua no conjurador, coluna sobe no tempo T
     Espinho Paralisante (Necro)  -> MagoFX2.criarEspinho(escala)  projetil nivelado + MagoFX2.paralisia(x, z, altura, dur) + MagoFX2.zona(x, z, raio, dur, tick)
   Procedural (sem GLB). So formas angulares (cones, prismas de 6 lados, lascas), sem rastro; geometria e material compartilhados (leve com muitos magos).
   Uso: MagoFX2.init(THREE, scene); MagoFX2.tick(dt) todo quadro. Cada projetil devolve {group, update(dt, prog, p), impacto(p), dispose()}. */
(function(){
  var M2 = window.MagoFX2 = { pronto: false };
  var T, cena, vivos = [], TEX = {}, G = {}, MT = {};
  function leve(){ return !!(window.QUAL && (QUAL.nivel === 'baixa' || QUAL.touch)); }
  var AL = 11; function alea(){ AL = (AL * 16807) % 2147483647; return AL / 2147483647; }
  function rnd(a, b){ return a + (b - a) * alea(); }
  M2.init = function(THREE_, scene_){
    if(T) return; T = THREE_; cena = scene_; var tl = new T.TextureLoader();
    TEX.c1 = tl.load('assets/fx/mago_chama1.png?v=1'); TEX.c2 = tl.load('assets/fx/mago_chama2.png?v=1'); M2.pronto = true;
  };
  M2.tick = function(dt){ for(var i = vivos.length - 1; i >= 0; i--) if(vivos[i].tick(dt)) vivos.splice(i, 1); };

  /* ---------------- utilidades ---------------- */
  function kf(k, t){ if(t <= k[0][0]) return k[0][1]; for(var i = 1; i < k.length; i++) if(t <= k[i][0]){ var a = k[i - 1], b = k[i], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; } return k[k.length - 1][1]; }
  function esc(o, v){ o.scale.setScalar(Math.max(1e-4, v)); }
  function escXYZ(o, x, y, z){ o.scale.set(Math.max(1e-4, x), Math.max(1e-4, y), Math.max(1e-4, z)); }
  function grupo(x, y, z){ var g = new T.Group(); g.position.set(x, y, z); cena.add(g); return g; }
  function fim(g){ cena.remove(g); }
  function add(cor, op, tex){ var k = 'a' + cor + '_' + op + '_' + (tex ? tex.id : 0); return MT[k] || (MT[k] = new T.MeshBasicMaterial({ color: cor, map: tex || null, transparent: true, opacity: op == null ? 1 : op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); }
  function solido(cor, emis, ei){
    var k = 's' + cor + '_' + emis; if(MT[k]) return MT[k];
    var C = leve() ? T.MeshLambertMaterial : T.MeshStandardMaterial, m = new C({ color: cor, emissive: emis, emissiveIntensity: ei == null ? 0.7 : ei, flatShading: true });
    if(!leve()){ m.roughness = 0.55; m.metalness = 0.1; } return (MT[k] = m);
  }
  function gCone(r, L, seg){ var k = 'c' + r + '_' + L + '_' + seg; if(G[k]) return G[k]; var g = new T.ConeGeometry(r, L, seg || 4, 1, true); g.translate(0, L / 2, 0); return (G[k] = g); }
  function gTetra(r){ var k = 't' + r; if(G[k]) return G[k]; var g = new T.TetrahedronGeometry(r, 0); return (G[k] = g); }
  function gRocha(R, jag){
    var k = 'r' + R + '_' + jag; if(G[k]) return G[k]; var g = new T.IcosahedronGeometry(R, 1), p = g.attributes.position, i, f, seen = {};
    for(i = 0; i < p.count; i++){ var key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if(seen[key] === undefined) seen[key] = 1 + rnd(-jag, jag * 0.8); f = seen[key]; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
    g.computeVertexNormals(); return (G[k] = g);
  }
  function gLamina(L, w){                           /* faixa que afina em ponta: base em y=0, uv x = largura, y = altura */
    var k = 'l' + L + '_' + w; if(G[k]) return G[k]; var g = new T.PlaneGeometry(w, L, 1, 4), p = g.attributes.position, i;
    for(i = 0; i < p.count; i++){ var t = (p.getY(i) + L / 2) / L; p.setX(i, p.getX(i) * (1 - 0.85 * t)); p.setY(i, p.getY(i) + L / 2); }
    return (G[k] = g);
  }
  function lamina2(L, w, mat){                      /* duas faixas cruzadas: nunca fica de lado */
    var g = new T.Group(), a = new T.Mesh(gLamina(L, w), mat); g.add(a);
    if(!leve()){ var b = new T.Mesh(gLamina(L, w), mat); b.rotation.y = Math.PI / 2; g.add(b); } return g;
  }
  function linhas(segs, w){                         /* segmentos retos no chao (aviso) */
    var pos = [], idx = [], n = 0; segs.forEach(function(s){
      var dx = s[2] - s[0], dz = s[3] - s[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
      pos.push(s[0] + nx, 0, s[1] + nz, s[2] + nx, 0, s[3] + nz, s[2] - nx, 0, s[3] - nz, s[0] - nx, 0, s[1] - nz); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    });
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  function gLosango(R, ticks){
    var k = 'L' + R + '_' + (ticks ? 1 : 0); if(G[k]) return G[k];
    var s = [[R, 0, 0, R], [0, R, -R, 0], [-R, 0, 0, -R], [0, -R, R, 0], [R * .5, 0, 0, R * .5], [0, R * .5, -R * .5, 0], [-R * .5, 0, 0, -R * .5], [0, -R * .5, R * .5, 0]];
    if(ticks) s.push([R + .35, 0, R + 1.1, 0], [-R - .35, 0, -R - 1.1, 0], [0, R + .35, 0, R + 1.1], [0, -R - .35, 0, -R - 1.1]);
    return (G[k] = linhas(s, 0.09));
  }
  function gEstrela(R, pontas, cCentro, cBorda){   /* marca no chao: estrela irregular com cor por vertice */
    var pos = [], col = [], i, a, r, P = [];
    for(i = 0; i < pontas * 2; i++){ a = i * Math.PI / pontas + rnd(-.06, .06); r = R * (i % 2 === 0 ? rnd(.85, 1.1) : rnd(.38, .55)); P.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for(i = 0; i < P.length; i++){ var q = P[(i + 1) % P.length]; pos.push(0, 0, 0, P[i][0], 0, P[i][1], q[0], 0, q[1]); col.push(cCentro[0], cCentro[1], cCentro[2], cBorda[0], cBorda[1], cBorda[2], cBorda[0], cBorda[1], cBorda[2]); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); return g;
  }
  function matAgua(u, freq){
    return new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: u,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uT; uniform float uA; uniform float uF; varying vec2 vUv; void main(){ float s = sin(vUv.x * uF + sin(vUv.y * 8.0 - uT * 7.0) * 1.7 + vUv.y * 3.0);' +
        ' float n = 0.30 + 0.70 * smoothstep(-0.4, 0.9, s); float a = n * pow(max(0.0, 1.0 - vUv.y), 0.55) * uA; vec3 c = mix(vec3(0.82, 0.97, 1.0), vec3(0.12, 0.50, 1.0), vUv.y); gl_FragColor = vec4(c * 1.15, a * 0.85); }' });
  }
  function helice(r0, r1, H, voltas, larg, fase){   /* faixa de agua enroscada, uv x = largura, y = ao longo (0 base .. 1 topo) */
    var n = 22, pos = [], uv = [], idx = [], i; for(i = 0; i <= n; i++){ var t = i / n, a = fase + t * voltas * 6.2832, r = r0 + (r1 - r0) * t, z = t * H, w = larg * (0.55 + 0.45 * Math.sin(Math.min(1, t * 1.3) * 1.5708)) * (1 - 0.35 * t);
      pos.push(Math.cos(a) * r, z - w / 2, Math.sin(a) * r, Math.cos(a) * r, z + w / 2, Math.sin(a) * r); uv.push(0, t, 1, t); if(i < n){ var b = i * 2; idx.push(b, b + 2, b + 3, b, b + 3, b + 1); } }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  function seq(g, dur, upd){ var t = 0; vivos.push({ tick: function(dt){ t += dt; upd(t, dt); if(t >= dur){ fim(g); return true; } return false; } }); }
  /* particula balistica: o(t) calcula a posicao; vida em s; some encolhendo no fim */
  function balistica(g, geo, mat, p0, v0, grav, vida, esc0, spin){
    var o = new T.Mesh(geo, mat); o.frustumCulled = false; g.add(o); var r = [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)];
    return { o: o, tick: function(t){ if(t > vida){ o.visible = false; return; } o.position.set(p0[0] + v0[0] * t, Math.max(0.03, p0[1] + v0[1] * t - grav * t * t / 2), p0[2] + v0[2] * t); if(spin){ o.rotation.set(r[0] * t, r[1] * t, r[2] * t); } esc(o, esc0 * Math.min(1, (vida - t) / (vida * 0.3 + 1e-6))); } };
  }

  /* ---------------- explosao de fogo (usada pelo Meteoro e pelo impacto do Disco) ---------------- */
  M2.explosao = function(x, z, E){
    if(!T || !cena) return; E = E || 1; var g = grupo(x, 0, z), L = leve(), ev = [], i, a;
    var mQ = add(0xfff0b0, 1), mO = add(0xff6a14, 0.85), mFl1 = add(0xffa060, 1, TEX.c1), mFl2 = add(0xff9a70, 1, TEX.c2), mR = add(0xff7a1a, 1);
    var nf = L ? 7 : 12;
    for(i = 0; i < nf; i++){                                   /* clarao: espinhos brancos em todas as direcoes */
      var v = new T.Vector3(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize(), o = new T.Mesh(gCone(0.22 * E, rnd(1.4, 2.6) * E, 4), mQ); o.position.y = 0.9 * E; o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v); o.frustumCulled = false; g.add(o);
      ev.push({ o: o, f: function(t){ return kf([[0, 0], [0.03, 1], [0.14, 0.55], [0.26, 0]], t); } });
    }
    var ne = L ? 7 : 11;
    for(i = 0; i < ne; i++){                                   /* espinhos de fogo rente ao chao */
      a = i * 6.2832 / ne + rnd(-.15, .15); var o2 = new T.Mesh(gCone(0.7 * E, rnd(4.2, 6.2) * E * 0.8, 4), mO); o2.position.set(Math.cos(a) * 0.4, 0.3, Math.sin(a) * 0.4);
      o2.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(Math.cos(a), 0.32, Math.sin(a)).normalize()); o2.frustumCulled = false; g.add(o2);
      ev.push({ o: o2, f: function(t){ return kf([[0, 0.1], [0.07, 1], [0.25, 0.75], [0.5, 0]], t); } });
    }
    var nc = L ? 5 : 8;
    for(i = 0; i < nc; i++){                                   /* colunas de chamas subindo */
      var col = lamina2(rnd(4, 6.2) * E, rnd(1.8, 2.8) * E, i % 2 ? mFl1 : mFl2); a = rnd(0, 6.28); col.position.set(Math.cos(a) * rnd(.2, .9), 0, Math.sin(a) * rnd(.2, .9)); col.rotation.y = rnd(0, 6.28); g.add(col);
      ev.push({ o: col, y: true, f: function(t){ return kf([[0, 0.02], [0.05, 0.4], [0.15, 1], [0.4, 1.05], [0.6, 0.5], [0.72, 0]], t); } });
    }
    var sh = [], nsh = L ? 8 : 16;
    for(i = 0; i < nsh; i++){ a = rnd(0, 6.28); var vh = rnd(2.5, 7) * E; sh.push(balistica(g, gTetra(rnd(.12, .26) * E), mR, [0, 0.6, 0], [Math.cos(a) * vh, rnd(5, 10), Math.sin(a) * vh], 9.8, rnd(.45, .75), 1, true)); }
    var nb = L ? 10 : 26;
    for(i = 0; i < nb; i++){ a = rnd(0, 6.28); var vb = rnd(.8, 3.8); sh.push(balistica(g, gCone(0.05, 0.2, 4), mQ, [0, 0.5, 0], [Math.cos(a) * vb, rnd(2.5, 8), Math.sin(a) * vb], 4.5, rnd(.5, 1.0), 1, true)); }
    var mc = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide }), mk = new T.Mesh(gEstrela(3.4 * E, 10, [1, .45, .06], [.15, .03, 0]), mc); mk.position.y = 0.03; g.add(mk);
    seq(g, 1.7, function(t){
      ev.forEach(function(e){ var s = e.f(t); if(e.y) escXYZ(e.o, 1, s, 1); else esc(e.o, s); });
      sh.forEach(function(s){ s.tick(t); }); esc(mk, kf([[0, 0.4], [0.1, 1], [1.2, 1], [1.7, 0]], t)); if(t > 1.69) mc.dispose();
    });
  };

  /* ---------------- 1) METEORO DE MAGMA: aviso em losango no chao, a pedra cai e explode no tempo T ---------------- */
  M2.meteoro = function(x, z, Tt){
    if(!T || !cena) return; Tt = Math.max(0.4, Tt || 0.9); var g = grupo(x, 0, z), L = leve(), i, queda = Math.min(0.5, Tt - 0.05), tq = Tt - queda, feito = false;
    var av = new T.Mesh(gLosango(3.0, true), add(0xff7a1f, 0.9)); av.position.y = 0.05; av.rotation.y = Math.PI / 4; g.add(av);
    var S = new T.Vector3(-6, 15, -3.5), E = new T.Vector3(0, 0.95, 0), mov = new T.Group(); g.add(mov); mov.visible = false;
    var rocha = new T.Mesh(gRocha(0.95, 0.3), solido(0x2a140c, 0xff4a10, 1.0)); mov.add(rocha);
    var miolo = new T.Mesh(gRocha(0.45, 0.15), add(0xffb040, 0.9)); mov.add(miolo);
    var saia = new T.Group(); mov.add(saia); saia.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), S.clone().normalize());
    var mF1 = add(0xffa060, 1, TEX.c1), mF2 = add(0xff9a70, 1, TEX.c2), nb = L ? 5 : 8, bl = [];
    for(i = 0; i < nb; i++){ var a = i * 6.2832 / nb + rnd(-.2, .2), b = lamina2(rnd(3.2, 5.2), rnd(1.1, 1.8), i % 2 ? mF1 : mF2); b.position.set(Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4); b.rotation.set(Math.sin(a) * 0.3, a, -Math.cos(a) * 0.3); saia.add(b); bl.push(b); }
    seq(g, Tt + 0.05, function(t){
      av.rotation.y = Math.PI / 4 - t * 0.5; esc(av, t < Tt ? kf([[0, 0.55], [0.2, 1], [Tt - 0.02, 0.9]], t) : 0);
      if(t >= tq && t < Tt){ var u = (t - tq) / queda, q = Math.pow(u, 1.7); mov.visible = true; mov.position.set(S.x * (1 - q) + E.x * q, S.y * (1 - q) + E.y * q, S.z * (1 - q) + E.z * q); rocha.rotation.set(t * 9, t * 5.5, t * 12); esc(mov, kf([[0, 0.4], [0.35, 1]], u)); bl.forEach(function(b, k){ esc(b, 0.85 + 0.3 * Math.abs(Math.sin(t * 20 + k))); }); }
      else mov.visible = false;
      if(!feito && t >= Tt){ feito = true; M2.explosao(x, z, 1); }
    });
  };

  /* ---------------- 2) DISCO DE FOGO: projetil deitado, gira, faz espiral lateral como quem voa na borda de um vortice ---------------- */
  function gSerra(){
    if(G.serra) return G.serra; var s = new T.Shape(), n = 8, R = 1.1, i, passo = Math.PI * 2 / n;
    for(i = 0; i < n; i++){ var th = i * passo, v = [Math.cos(th) * R * 0.52, Math.sin(th) * R * 0.52], p = [Math.cos(th + 0.82 * passo) * R, Math.sin(th + 0.82 * passo) * R]; if(i === 0) s.moveTo(v[0], v[1]); else s.lineTo(v[0], v[1]); s.lineTo(p[0], p[1]); }
    s.closePath(); var g = new T.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -0.08, 0);
    var p2 = g.attributes.position, cols = new Float32Array(p2.count * 3), k;
    for(k = 0; k < p2.count; k++){ var r = Math.hypot(p2.getX(k), p2.getZ(k)), t = Math.min(1, Math.max(0, (r - 0.2) / 0.9)), c = t < 0.38 ? [1, 0.92 - 0.56 * t / 0.38, 0.55 - 0.51 * t / 0.38] : [1 - 0.55 * (t - 0.38) / 0.62, 0.36 - 0.31 * (t - 0.38) / 0.62, 0.04 - 0.04 * (t - 0.38) / 0.62]; cols[k * 3] = c[0]; cols[k * 3 + 1] = c[1]; cols[k * 3 + 2] = c[2]; }
    g.setAttribute('color', new T.BufferAttribute(cols, 3)); return (G.serra = g);
  }
  M2.criarDisco = function(escala){
    escala = escala || 0.85; var raiz = new T.Group(), giro = new T.Group(), plume = new T.Group(), L = leve(), i; raiz.add(giro); raiz.add(plume); raiz.scale.setScalar(escala); raiz.rotation.order = 'YXZ';
    giro.add(new T.Mesh(gSerra(), new T.MeshBasicMaterial({ vertexColors: true })));
    giro.add(new T.Mesh(gRocha(0.22, 0.1), add(0xfff0b0, 1)));
    var mF1 = add(0xffa060, 1, TEX.c1), mF2 = add(0xff9a70, 1, TEX.c2), mT = add(0xff8a2a, 0.85);
    for(i = 0; i < 8; i++){                                      /* linguas de fogo nas pontas, para tras do giro */
      var a = i * 6.2832 / 8 + 0.5, c = new T.Mesh(gCone(0.4, rnd(1.7, 2.5), 4), mT); c.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05);
      c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(-Math.sin(a), 0.12, Math.cos(a)).normalize()); giro.add(c);
    }
    plume.rotation.x = -Math.PI / 2; var pb = [], np = L ? 4 : 7;       /* penacho de chamas atras (nao gira) */
    for(i = 0; i < np; i++){ var a2 = i * 6.2832 / np + rnd(-.2, .2), b = lamina2(rnd(2.6, 4.0), rnd(1.0, 1.5), i % 2 ? mF1 : mF2); b.position.set(Math.cos(a2) * 0.55, 0.1, Math.sin(a2) * 0.55); b.rotation.set(Math.sin(a2) * 0.3, a2, -Math.cos(a2) * 0.3); plume.add(b); pb.push(b); }
    raiz.traverse(function(o){ o.frustumCulled = false; }); var base0 = null, rel = 0;
    function lat(pr){ return 1.5 * Math.sin(Math.PI * pr) * Math.cos(pr * 1.5 * 6.2832); }
    return {
      group: raiz,
      update: function(dt, prog, p){
        rel += dt; giro.rotation.y += Math.min(14 * dt, 0.6); pb.forEach(function(b, k){ esc(b, 0.85 + 0.3 * Math.abs(Math.sin(rel * 18 + k))); });
        if(!p) return; if(base0 === null) base0 = raiz.rotation.y; var pr = Math.min(1, Math.max(0, prog)), A = 1.5 * Math.sin(Math.PI * pr), fase = pr * 1.5 * 6.2832, off = A * Math.cos(fase);
        raiz.position.x += -p.dz * off; raiz.position.z += p.dx * off; raiz.position.y += 0.2 * A * Math.sin(fase);
        raiz.rotation.z = -0.62 * Math.cos(fase) * Math.sin(Math.PI * pr); raiz.rotation.y = base0 + Math.atan2(lat(Math.min(1, pr + 0.02)) - lat(Math.max(0, pr - 0.02)), Math.max(1, (p.range || 20)) * 0.04) * 0.9;
      },
      impacto: function(p){ M2.explosao(p.x, p.z, 0.75); },
      dispose: function(){ if(raiz.parent) raiz.parent.remove(raiz); }
    };
  };

  M2.cria = { disco_fogo: M2.criarDisco, espinho_necro: null };       /* projeteis por `proj.visual` (staff.json); espinho_necro e ligado logo abaixo */
  /* ---------------- 3) COLUNA DE AGUA: aviso no alvo, correntes de agua no conjurador, a coluna sobe no tempo T ---------------- */
  M2.coluna = function(x, z, Tt, cx, cz){
    if(!T || !cena) return; Tt = Math.max(0.4, Tt || 0.8); var g = grupo(x, 0, z), L = leve(), i, uA = { uT: { value: 0 }, uA: { value: 1 }, uF: { value: 22 } }, uB = { uT: { value: 0 }, uA: { value: 1 }, uF: { value: 38 } };
    var mCol = matAgua(uA, 22), mInt = matAgua(uB, 38), mAv = add(0x4fc3ff, 0.9);
    var av = new T.Mesh(gLosango(1.9, false), mAv); av.position.y = 0.05; g.add(av);
    var H = 5.8, ext = new T.Mesh(new T.CylinderGeometry(1.15, 0.95, H, 6, 1, true), mCol), inte = new T.Mesh(new T.CylinderGeometry(0.62, 0.5, H * 0.95, 6, 1, true), mInt);
    ext.geometry.translate(0, H / 2, 0); inte.geometry.translate(0, H * 0.475, 0); g.add(ext); g.add(inte); ext.visible = inte.visible = false; ext.frustumCulled = inte.frustumCulled = false;
    var drops = [], nd = L ? 10 : 20, mD = add(0xbfeaff, 0.95); for(i = 0; i < nd; i++){ var a = rnd(0, 6.28), vh = rnd(.8, 3.2); drops.push(balistica(g, new T.IcosahedronGeometry(rnd(.07, .15), 0), mD, [0, 0.8, 0], [Math.cos(a) * vh * .8, rnd(4, 9), Math.sin(a) * vh * .8], 9.8, rnd(.6, 1.0), 1, false)); }
    drops.forEach(function(d){ d.o.visible = false; });
    var cg = null, cw = [], cm = null, cdrops = [], uC = { uT: { value: 0 }, uA: { value: 1 }, uF: { value: 18 } }, mCor = null;
    if(cx !== undefined){                                     /* conjurador: marca nos pes, 3 correntes de agua em helice, gotas subindo */
      cg = grupo(cx, 0, cz); cm = new T.Mesh(gLosango(0.95, false), mAv); cm.position.y = 0.05; cg.add(cm); mCor = matAgua(uC, 18);
      for(i = 0; i < (L ? 2 : 3); i++){ var h = new T.Mesh(helice(0.78, 0.55, 1.9, 1.15, 0.42, i * 6.2832 / 3), mCor); h.frustumCulled = false; cg.add(h); cw.push(h); }
      for(i = 0; i < (L ? 5 : 10); i++) cdrops.push({ o: new T.Mesh(new T.IcosahedronGeometry(rnd(.05, .09), 0), mD), a0: rnd(0, 6.28), r: rnd(.55, .95), f0: rnd(0, Tt * .6), d: rnd(.5, .75) });
      cdrops.forEach(function(d){ cg.add(d.o); d.o.visible = false; });
    }
    var ts = Tt + 1.6;
    vivos.push({ t: 0, tick: function(dt){
      var t = this.t += dt; uA.uT.value = uB.uT.value = uC.uT.value = t;
      esc(av, t < Tt ? kf([[0, 0.5], [0.15, 1], [Tt - 0.02, 0.85]], t) : 0); av.rotation.y = -t * 0.9;
      if(cg){ var vis = t < Tt + 0.1; cg.visible = vis; if(vis){ cm.rotation.y = t * 1.2; esc(cm, kf([[0, 0.3], [0.15, 1], [Tt - 0.05, 1], [Tt + 0.1, 0]], t));
        cw.forEach(function(h, k){ h.rotation.y = t * 4.5 + k * 2; escXYZ(h, 1, kf([[0, 0.02], [0.35, 1], [Tt - 0.05, 1], [Tt + 0.1, 0.25]], t - k * 0.06), 1); });
        cdrops.forEach(function(d){ var u = (t - d.f0) / d.d; if(u < 0 || u > 1){ d.o.visible = false; return; } d.o.visible = true; var an = d.a0 + u * 2.4; d.o.position.set(Math.cos(an) * d.r, 0.2 + 1.9 * u, Math.sin(an) * d.r); esc(d.o, Math.sin(u * Math.PI)); }); } }
      if(t >= Tt){ var e = t - Tt; ext.visible = inte.visible = e < 1.5; esc(ext, 1); ext.rotation.y = e * 3; inte.rotation.y = -e * 3.6;
        var sy = kf([[0, 0.02], [0.1, 1.12], [0.2, 1], [1.1, 1], [1.35, 0.2], [1.45, 0]], e), sx = kf([[0, 0.6], [0.1, 1.1], [0.2, 1], [1.1, 1], [1.35, 0.25]], e); escXYZ(ext, sx, sy, sx); escXYZ(inte, sx, sy, sx);
        drops.forEach(function(d){ d.o.visible = true; d.tick(e); }); }
      if(t >= ts){ fim(g); if(cg) fim(cg); [mCol, mInt, mCor].forEach(function(m){ if(m) m.dispose(); }); ext.geometry.dispose(); inte.geometry.dispose(); cw.forEach(function(h){ h.geometry.dispose(); }); drops.forEach(function(d){ d.o.geometry.dispose(); }); cdrops.forEach(function(d){ d.o.geometry.dispose(); }); return true; } return false; } });
  };

  /* ---------------- 4) ESPINHO PARALISANTE: projetil de osso, nivelado, sem girar ---------------- */
  M2.criarEspinho = function(escala){
    escala = escala || 1; var raiz = new T.Group(), corpo = new T.Group(), i, L = 2.0, r = 0.13, osso = solido(0xe8e0c8, 0x1a3a20, 0.5), mV = add(0x5dff8a, 0.9);
    raiz.add(corpo); corpo.rotation.x = Math.PI / 2;                    /* eixo +Y do desenho vira +Z (frente do jogo) */
    var c1 = new T.Mesh(new T.ConeGeometry(r, L * 0.8, 6, 1, true), osso); c1.position.y = L * 0.6; corpo.add(c1);
    var c2 = new T.Mesh(new T.ConeGeometry(r, L * 0.2, 6, 1, true), osso); c2.rotation.x = Math.PI; c2.position.y = L * 0.1; corpo.add(c2);
    var nuc = new T.Mesh(new T.ConeGeometry(r * 0.5, L * 0.7, 4, 1, true), mV); nuc.position.y = L * 0.48; corpo.add(nuc);
    for(i = 0; i < 12; i++){                                            /* espinhos menores saindo do grande, para tras e para fora */
      var ang = i * 6.2832 / 5 + rnd(-.3, .3), pos = 0.45 + (i / 11) * (L - 0.85), Ls = rnd(0.32, 0.6) * (1.15 - 0.5 * pos / L), s = new T.Mesh(gCone(0.055, Ls, 4), osso);
      s.position.set(Math.cos(ang) * 0.07, pos, Math.sin(ang) * 0.07); s.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(Math.cos(ang), -0.55, Math.sin(ang)).normalize()); corpo.add(s);
    }
    raiz.scale.setScalar(escala); raiz.traverse(function(o){ o.frustumCulled = false; }); var rel = 0;
    return {
      group: raiz, update: function(dt){ rel += dt; nuc.scale.setScalar(0.9 + 0.12 * Math.sin(rel * 14)); },
      impacto: function(p){ M2.impactoEspinho(p.x, p.z); }, dispose: function(){ if(raiz.parent) raiz.parent.remove(raiz); }
    };
  };
  M2.cria.espinho_necro = M2.criarEspinho;
  M2.impactoEspinho = function(x, z){
    if(!T || !cena) return; var g = grupo(x, 0, z), i, ev = [], mV = add(0x5dff8a, 0.95), osso = solido(0xe8e0c8, 0x1a3a20, 0.5), sh = [];
    for(i = 0; i < (leve() ? 6 : 12); i++){ var v = new T.Vector3(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize(), o = new T.Mesh(gCone(0.12, rnd(0.9, 1.8), 4), mV); o.position.y = 1.25; o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v); g.add(o); ev.push(o); }
    for(i = 0; i < (leve() ? 5 : 10); i++){ var a = rnd(0, 6.28), vh = rnd(1.5, 4.5); sh.push(balistica(g, gTetra(rnd(.1, .2)), osso, [0, 1.25, 0], [Math.cos(a) * vh * .7, rnd(1, 4), Math.sin(a) * vh * .6], 9.8, rnd(.35, .5), 1, true)); }
    seq(g, 0.6, function(t){ ev.forEach(function(o){ esc(o, kf([[0, 0.3], [0.04, 1], [0.15, 0.5], [0.26, 0]], t)); }); sh.forEach(function(s){ s.tick(t); }); });
  };
  /* paralisia: marca de losango girando sobre a cabeca + espinhos de osso brotando do corpo; no fim viram cacos */
  M2.paralisia = function(x, z, h, dur){
    if(!T || !cena) return; h = h || 1.8; dur = dur || 3; var g = grupo(x, 0, z), k = h / 1.8, i, th = [], mV = add(0x5dff8a, 0.9), osso = solido(0xe8e0c8, 0x1a3a20, 0.5), mM = add(0x6dff98, 0.95);
    var mk = new T.Mesh(gLosango(0.75, false), mM); mk.position.y = h + 0.55; g.add(mk);
    var pts = []; for(i = 0; i < 4; i++){ var a = i * Math.PI / 2 + Math.PI / 4, c = new T.Mesh(gCone(0.07, 0.5, 4), mV); c.rotation.x = Math.PI; c.position.set(Math.cos(a) * 0.55, h + 0.3, Math.sin(a) * 0.55); g.add(c); pts.push(c); }
    var n = leve() ? 10 : 18;
    for(i = 0; i < n; i++){
      var a2 = rnd(0, 6.28), zz = rnd(0.15, 0.95) * h, rr = (zz > h * 0.85 ? 0.1 : 0.34) * k, Le = rnd(0.55, 1.3) * (zz > h * 0.8 ? 0.7 : 1) * Math.max(.7, k), o = new T.Mesh(gCone(rnd(.08, .13), Le, 5), osso);
      o.position.set(Math.cos(a2) * rr, zz, Math.sin(a2) * rr); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(Math.cos(a2), rnd(-.1, .6), Math.sin(a2)).normalize()); g.add(o); th.push({ o: o, t0: 0.08 + i * 0.05 });
    }
    var fez = false;
    seq(g, dur + 0.2, function(t){
      mk.rotation.y = t * 1.6; esc(mk, kf([[0, 0], [0.1, 1.2], [0.2, 1], [dur - 0.1, 1], [dur, 0]], t)); pts.forEach(function(c){ esc(c, kf([[0, 0], [0.18, 1], [dur - 0.1, 1], [dur, 0]], t)); });
      th.forEach(function(e){ esc(e.o, t < dur ? kf([[e.t0 - 0.01, 0], [e.t0, 0.05], [e.t0 + 0.08, 1.3], [e.t0 + 0.16, 1]], t) : 0); });
      if(!fez && t >= dur){ fez = true; M2.cacosOsso(x, z, h, th.length); }
    });
  };
  M2.cacosOsso = function(x, z, h, n){
    var g = grupo(x, 0, z), osso = solido(0xe8e0c8, 0x1a3a20, 0.5), sh = [], i; for(i = 0; i < n; i++){ var a = rnd(0, 6.28), v = rnd(1.2, 2.8); sh.push(balistica(g, gTetra(rnd(.1, .2)), osso, [Math.cos(a) * 0.3, rnd(.2, 1) * h, Math.sin(a) * 0.3], [Math.cos(a) * v, rnd(0, 2), Math.sin(a) * v], 9.8, rnd(.4, .6), 1, true)); }
    seq(g, 0.7, function(t){ sh.forEach(function(s){ s.tick(t); }); });
  };
  /* zona de espinhos no chao: pulsa a cada `tick` s (o dano em area acontece nesses pulsos) */
  M2.zona = function(x, z, R, dur, tick){
    if(!T || !cena) return; R = R || 3; dur = dur || 3; tick = tick || 0.5; var g = grupo(x, 0, z), i, sp = [], osso = solido(0xe8e0c8, 0x1a3a20, 0.5);
    var mc = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), mk = new T.Mesh(gEstrela(R, 9, [.2, .8, .3], [.02, .1, .04]), mc); mk.position.y = 0.03; g.add(mk);
    for(i = 0; i < (leve() ? 12 : 22); i++){ var a = rnd(0, 6.28), rr = R * Math.sqrt(rnd(.05, .95)) * 0.92, o = new T.Mesh(gCone(rnd(.07, .11), rnd(.4, .85), 4), osso); o.position.set(Math.cos(a) * rr, -0.02, Math.sin(a) * rr); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(rnd(-.25, .25), 1, rnd(-.25, .25)).normalize()); g.add(o); sp.push({ o: o, d: rnd(0, 0.18) }); }
    seq(g, dur + 0.3, function(t){
      esc(mk, kf([[0, 0.4], [0.2, 1], [dur - 0.2, 1], [dur + 0.3, 0]], t)); var ph = (t % tick) / tick, pulso = ph < 0.18 ? 1 + 0.35 * Math.sin(ph / 0.18 * Math.PI) : 1;
      sp.forEach(function(s){ esc(s.o, t < dur ? kf([[s.d, 0.05], [s.d + 0.12, 1.3], [s.d + 0.2, 1]], t) * pulso : kf([[dur, 1], [dur + 0.3, 0]], t)); });
      if(t > dur + 0.29) mc.dispose();
    });
  };
})();
