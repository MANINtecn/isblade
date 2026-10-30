/* >>> CLAUDE [guardiao] 2026-10-27 — biblioteca de efeitos 3D do Guardiao (three.js), portada dos efeitos feitos no Blender.
   Nada de faixas chapadas: espetos de secao redonda, cascas 3D com ruido, cupula hexagonal, chao rachado brilhando, pedras angulares,
   correntes de elos reais, escudos fantasma. Todos os efeitos moram aqui; js/guardiao.js so os orquestra por skill.
   Uso: const FX = criarFX(THREE, { getScene, getCamera }); FX.update(dt) a cada frame. */

export function criarFX(THREE, ctx){
  var V3 = THREE.Vector3, list = [], tmp = new V3(), tmpQ = new THREE.Quaternion();
  var seedN = 1;
  function rnd(){ seedN = (seedN * 16807) % 2147483647; return (seedN - 1) / 2147483646; }
  function rr(a, b){ return a + (b - a) * rnd(); }
  function seeded(s){ seedN = Math.max(1, Math.floor(s) % 2147483646); }
  function col(h){ return new THREE.Color(h); }
  function scene(){ return ctx.getScene(); }
  function smooth(x){ x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* ---------- registro de efeitos: cada um tem tempo, funcao de atualizacao e limpeza ---------- */
  function add(obj, dur, upd, lag){
    var e = { obj: obj, t: -(lag || 0), dur: dur, upd: upd, dead: false };
    if(obj){ obj.visible = !(lag > 0); scene().add(obj); }
    list.push(e); return e;
  }
  function dispose(o){
    if(!o) return;
    o.traverse(function(c){
      if(c.material && c.material.userData && c.material.userData.own){ c.material.dispose(); }
      if(c.geometry && c.geometry.userData && c.geometry.userData.own){ c.geometry.dispose(); }
    });
  }
  function update(dt){
    for(var i = list.length - 1; i >= 0; i--){
      var e = list[i]; e.t += dt;
      if(e.t < 0) continue;
      if(e.obj) e.obj.visible = true;
      var u = e.dur > 0 ? Math.min(1, e.t / e.dur) : 0;
      if(e.upd) e.upd(u, dt, e.t);
      if(e.t >= e.dur){
        e.dead = true; if(e.obj){ scene().remove(e.obj); dispose(e.obj); } if(e.done) e.done(); list.splice(i, 1);
      }
    }
    if(lightE.t < lightE.dur){ lightE.t += dt; var k = Math.max(0, 1 - lightE.t / lightE.dur); light.intensity = lightE.peak * k * k; }                                  /* a luz FICA na cena (intensidade 0 quando apagada): ligar/desligar mudava o numero de luzes e o three.js recompilava os shaders da cena toda a cada skill */
  }

  /* ---------- shaders ---------- */
  var NOISE = [
    'float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),',
    '             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }',
    'float fbm(vec3 p){ return .5 * vn(p) + .25 * vn(p * 2.03) + .125 * vn(p * 4.1) + .0625 * vn(p * 8.3); }'
  ].join('\n');
  function mat(vs, fs, uni, extra){
    var m = new THREE.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: fs, uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }, extra || {}));
    m.userData.own = true; return m;
  }
  /* espetos: nucleo quente na base, cor da skill na ponta, some na ponta */
  var SPIKE_VS = 'attribute float aT; varying float vT; varying vec3 vP; void main(){ vT = aT; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var SPIKE_FS = 'uniform vec3 uCol, uHot; uniform float uA, uTime, uGain; varying float vT; varying vec3 vP;\n' + NOISE +
    '\nvoid main(){ float k = smoothstep(0.0, .5, vT); vec3 c = mix(uHot, uCol, k); float tw = .8 + .2 * vn(vP * 9.0 + uTime * 6.0);' +
    ' float a = (1.0 - smoothstep(.55, 1.0, vT)) * uA * tw; gl_FragColor = vec4(c * uGain * a, a); }';
  var spikeCache = {};
  function spikeGeo(n, seed, bw, lmin){
    var key = n + '_' + seed + '_' + bw + '_' + lmin; if(spikeCache[key]) return spikeCache[key];
    seeded(seed); var pos = [], aT = [], idx = [], ga = Math.PI * (3 - Math.sqrt(5)), sides = 6, ts = [0, .06, .25, .5, .75, .92], base = 0;
    for(var i = 0; i < n; i++){
      var zc = 1 - 2 * (i + .5) / n, r = Math.sqrt(Math.max(0, 1 - zc * zc)), ph = i * ga + rr(-.3, .3);
      var d = new V3(Math.cos(ph) * r + rr(-.15, .15), zc + rr(-.15, .15), Math.sin(ph) * r + rr(-.15, .15)).normalize();
      var a = new V3().crossVectors(d, Math.abs(d.y) < .9 ? new V3(0, 1, 0) : new V3(1, 0, 0)).normalize(), b = new V3().crossVectors(d, a).normalize();
      var w = bw * rr(.85, 1.25), L = rr(lmin, 1.0);
      for(var j = 0; j < ts.length; j++){
        var t = ts[j], c = d.clone().multiplyScalar(.03 + (L - .03) * t), rad = w * Math.pow(1 - t, 1.35) * (.55 + .45 * Math.sin(Math.min(1, t * 4 + .3) * Math.PI / 2));
        for(var k = 0; k < sides; k++){ var ang = k / sides * Math.PI * 2; var p = c.clone().addScaledVector(a, Math.cos(ang) * rad).addScaledVector(b, Math.sin(ang) * rad); pos.push(p.x, p.y, p.z); aT.push(t); }
      }
      var tip = d.clone().multiplyScalar(L); pos.push(tip.x, tip.y, tip.z); aT.push(1);
      for(var j2 = 0; j2 < ts.length - 1; j2++) for(var k2 = 0; k2 < sides; k2++){
        var q0 = base + j2 * sides + k2, q1 = base + j2 * sides + (k2 + 1) % sides, q2 = base + (j2 + 1) * sides + (k2 + 1) % sides, q3 = base + (j2 + 1) * sides + k2; idx.push(q0, q1, q2, q0, q2, q3);
      }
      var last = base + (ts.length - 1) * sides, tipI = base + ts.length * sides;
      for(var k3 = 0; k3 < sides; k3++) idx.push(last + k3, last + (k3 + 1) % sides, tipI);
      base += ts.length * sides + 1;
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1)); g.setIndex(idx);
    spikeCache[key] = g; return g;   /* geometria compartilhada (nao descartar) */
  }
  /* casca aberta com ruido (coluna, onda de choque) */
  var SHELL_VS = 'varying vec3 vP; varying float vY; void main(){ vP = position; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var SHELL_FS = 'uniform vec3 uCol, uHot; uniform float uA, uFlow, uLo, uHi, uMode, uPow, uNS; varying vec3 vP; varying float vY;\n' + NOISE +
    '\nvoid main(){ float n = fbm(vec3(vP.x, vP.y * .6, vP.z) * uNS + vec3(0.0, uFlow, 0.0)); float m = smoothstep(uLo, uHi, n);' +
    ' float h = uMode < .5 ? pow(max(sin(3.14159 * clamp(vY, 0.0, 1.0)), 0.0), uPow) : pow(1.0 - clamp(vY, 0.0, 1.0), uPow);' +
    ' vec3 c = mix(uCol, uHot, smoothstep(.45, .85, n)); float a = m * h * uA; gl_FragColor = vec4(c * a * 1.6, a); }';
  var shellG;
  function shellGeo(){ if(!shellG){ shellG = new THREE.CylinderGeometry(1.12, 1, 1, 56, 8, true); shellG.translate(0, .5, 0); } return shellG; }
  /* aneis e discos no chao */
  var RING_FS = 'uniform vec3 uCol; uniform float uA; varying vec3 vP; void main(){ float r = length(vP.xy); float e = smoothstep(.80, 1.0, r) * (1.0 - smoothstep(.985, 1.0, r)); float g = smoothstep(.55, .98, r) * .35; float a = (e + g) * uA; gl_FragColor = vec4(uCol * a * 1.5, a); }';
  var FLAT_VS = 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var DISC_FS = 'uniform vec3 uCol; uniform float uA; varying vec3 vP; void main(){ float r = length(vP.xy); float a = pow(max(1.0 - r, 0.0), 1.7) * uA; gl_FragColor = vec4(uCol * a * 1.4, a); }';
  var ringG, discG;
  function ringGeo(){ if(!ringG) ringG = new THREE.RingGeometry(.78, 1, 96); return ringG; }
  function discGeo(){ if(!discG) discG = new THREE.CircleGeometry(1, 48); return discG; }

  /* ---------- luz de impacto (uma so, criada ja no inicio para nao recompilar shaders) ---------- */
  var light = new THREE.PointLight(0xff8a2a, 0, 40, 2); light.visible = true; var lightE = { t: 99, dur: 1, peak: 0 }; var lightInit = false;
  function luz(x, y, z, o){
    o = o || {}; if(!lightInit){ scene().add(light); lightInit = true; }
    light.position.set(x, y, z); light.color.set(o.color || 0xff8a2a); lightE.t = 0; lightE.dur = o.life || .5; lightE.peak = o.intensity || 60;
  }

  /* ---------- construtores ---------- */
  /* explosao de espetos de luz saindo de um ponto: gira e diminui ate sumir */
  function espetos(x, y, z, o){
    o = o || {}; var g = spikeGeo(o.n || 22, o.seed || 7, o.bw || .03, o.lmin || .55), size = o.size || 4, life = o.life || .75;
    var m = mat(SPIKE_VS, SPIKE_FS, { uCol: { value: col(o.color || 0xff6a1a) }, uHot: { value: col(o.hot || 0xfff0c8) }, uA: { value: 1 }, uTime: { value: 0 }, uGain: { value: o.gain || 1.5 } });
    var mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); seeded((o.seed || 7) * 13); mesh.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3));
    var sg = o.spin === undefined ? (rnd() < .5 ? -1 : 1) : o.spin, r0 = mesh.rotation.clone();
    return add(mesh, life, function(u, dt, t){
      var s = u < .12 ? size * (.45 + u / .12 * .55) : size * (1 - .25 * smooth((u - .12) / .5)) * (u < .6 ? 1 : 1 - smooth((u - .6) / .4));
      mesh.scale.setScalar(Math.max(.001, s)); m.uniforms.uA.value = u < .75 ? 1 : 1 - (u - .75) / .25; m.uniforms.uTime.value = t;
      mesh.rotation.set(r0.x + .5 * sg * u, r0.y + .4 * u, r0.z + 5.5 * sg * u);
    }, o.lag);
  }
  /* casca 3D com ruido que sobe/abre (coluna de luz, parede da onda de choque) */
  function casca(x, y, z, o){
    var m = mat(SHELL_VS, SHELL_FS, { uCol: { value: col(o.color || 0xff6a1a) }, uHot: { value: col(o.hot || 0xfff0c8) }, uA: { value: o.alpha || 1 }, uFlow: { value: 0 }, uLo: { value: o.lo || .38 }, uHi: { value: o.hi || .7 }, uMode: { value: o.vert === 'fade' ? 1 : 0 }, uPow: { value: o.power || .5 }, uNS: { value: o.ns || 2.4 } });
    var mesh = new THREE.Mesh(shellGeo(), m); mesh.position.set(x, y, z);
    var r0 = o.r0 || 1, r1 = o.r1 || r0, h0 = o.h0 || 1, h1 = o.h1 || h0, life = o.life || .6, fl = o.flow === undefined ? -3 : o.flow;
    return add(mesh, life, function(u, dt, t){
      var e = u < .2 ? smooth(u / .2) : 1; var rr_ = r0 + (r1 - r0) * (o.expand === 'out' ? 1 - (1 - u) * (1 - u) : u);
      mesh.scale.set(rr_ * (.6 + .4 * e), h0 + (h1 - h0) * u, rr_ * (.6 + .4 * e)); m.uniforms.uFlow.value = fl * t;
      m.uniforms.uA.value = (o.alpha || 1) * (u < .15 ? u / .15 : (u > .6 ? 1 - (u - .6) / .4 : 1));
    }, o.lag);
  }
  function anel(x, z, o){
    var m = mat(FLAT_VS, RING_FS, { uCol: { value: col(o.color || 0xff6a1a) }, uA: { value: o.alpha || .9 } }); var mesh = new THREE.Mesh(ringGeo(), m);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, o.y === undefined ? .16 : o.y, z); var r0 = o.r0 || .8, r1 = o.r1 || 6, life = o.life || .8;
    return add(mesh, life, function(u){ var e = 1 - (1 - u) * (1 - u); var r = r0 + (r1 - r0) * e; mesh.scale.set(r, r, 1); m.uniforms.uA.value = (o.alpha || .9) * (1 - u) * (1 - u * .3); }, o.lag);
  }
  function disco(x, y, z, o){
    var m = mat(FLAT_VS, DISC_FS, { uCol: { value: col(o.color || 0xff6a1a) }, uA: { value: o.alpha || .8 } }); var mesh = new THREE.Mesh(discGeo(), m);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); var r = o.r || 3, life = o.life || .5;
    return add(mesh, life, function(u){ mesh.scale.set(r * (.6 + .6 * u), r * (.6 + .6 * u), 1); m.uniforms.uA.value = (o.alpha || .8) * (1 - u); }, o.lag);
  }

  /* rachaduras: contorno preto + veios brilhando que se abrem do centro para fora */
  var CRACK_VS = 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var CRACK_FS = 'uniform vec3 uCol; uniform float uA, uR, uMode; varying vec3 vP; void main(){ float r = length(vP.xz); if(r > uR) discard; float a = uA; if(uMode > .5){ gl_FragColor = vec4(uCol * a * 1.6, a); } else { gl_FragColor = vec4(0.0, 0.0, 0.0, a * .9); } }';
  var crackCache = {};
  function crackGeo(seed, R, nMain, ws){
    var key = seed + '_' + R + '_' + nMain + '_' + ws; if(crackCache[key]) return crackCache[key];
    seeded(seed); var pos = [], idx = [];
    function line(x0, y0, a0, len, w0, step, jit){
      var x = x0, y = y0, ang = a0, pts = [[x, y]], t = 0;
      while(t < len){ ang += rr(-jit, jit); if(rnd() < .12) ang += (rnd() < .5 ? -1 : 1) * rr(.5, .9); var st = step * rr(.7, 1.3); x += Math.cos(ang) * st; y += Math.sin(ang) * st; t += st; pts.push([x, y]); }
      var prev = null, n = pts.length;
      for(var i = 0; i < n; i++){
        var w = Math.max(.03, w0 * ws * Math.pow(1 - i / n, 1.4)), q0 = pts[Math.max(i - 1, 0)], q1 = pts[Math.min(i + 1, n - 1)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
        var b = pos.length / 3; pos.push(pts[i][0] + nx, .03, pts[i][1] + ny, pts[i][0] - nx, .03, pts[i][1] - ny);
        if(prev !== null) idx.push(prev, b, b + 1, prev, b + 1, prev + 1); prev = b;
      }
      return { pts: pts, ang: ang };
    }
    for(var i = 0; i < nMain; i++){
      var a = i / nMain * Math.PI * 2 + rr(-.22, .22), L = rr(.55, 1.0) * R, main = line(0, 0, a, L, .5, R / 22, .38), nb = 1 + Math.floor(rnd() * 3);
      for(var b = 0; b < nb; b++){ if(main.pts.length < 6) break; var k = Math.floor(rr(2, main.pts.length - 3)), p = main.pts[k], sa = a + (rnd() < .5 ? -1 : 1) * rr(.45, .95); line(p[0], p[1], sa, L * rr(.25, .5), .3, R / 28, .38); }
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); crackCache[key] = g; return g;
  }
  function rachaduras(x, z, o){
    var R = o.R || 8, g = crackGeo(o.seed || 12, R, o.n || 11, o.ws || 1), life = o.life || 4, hold = o.hold || .7, grp = new THREE.Group(); grp.position.set(x, 0, z);
    var md = mat(CRACK_VS, CRACK_FS, { uCol: { value: col(0) }, uA: { value: 1 }, uR: { value: 0 }, uMode: { value: 0 } }, { blending: THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2 });
    var mg = mat(CRACK_VS, CRACK_FS, { uCol: { value: col(o.color || 0xff7a1a) }, uA: { value: 1 }, uR: { value: 0 }, uMode: { value: 1 } });
    var a = new THREE.Mesh(g, md), b = new THREE.Mesh(g, mg); a.position.y = .1; b.position.y = .13; grp.add(a); grp.add(b);
    return add(grp, life, function(u, dt, t){
      var open = smooth(Math.min(1, t / (o.open || .22))) * R * 1.7; md.uniforms.uR.value = open; mg.uniforms.uR.value = open;
      var fade = u < hold ? 1 : 1 - (u - hold) / (1 - hold); md.uniforms.uA.value = fade; mg.uniforms.uA.value = fade * (.55 + .45 * Math.sin(t * 5));
    }, o.lag);
  }
  /* bacia escura queimada (esconde o escudo enterrado no chao e da peso ao impacto) */
  var craterG;
  function cratera(x, z, o){
    if(!craterG) craterG = new THREE.CircleGeometry(1, 40);
    var m = new THREE.MeshBasicMaterial({ color: 0x0b0806, transparent: true, opacity: .0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }); m.userData.own = true;
    var mesh = new THREE.Mesh(craterG, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .09, z); var R = o.R || 4, life = o.life || 5;
    return add(mesh, life, function(u, dt, t){ var s = R * (u < .06 ? .55 + smooth(u / .06) * .45 : 1); mesh.scale.set(s, s, 1); m.opacity = .85 * (u < .75 ? Math.min(1, t / .1) : 1 - (u - .75) / .25); }, o.lag);
  }

  /* pedras angulares com gravidade; pousam, ficam e afundam */
  function shardGeo(){
    var g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position; seeded(Math.floor(rnd() * 99999 + 1));
    for(var i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rr(.6, 1.2), p.getY(i) * rr(.45, 1), p.getZ(i) * rr(.6, 1.2));
    g.computeVertexNormals(); g.userData.own = true; return g;
  }
  var rockMat;
  function rochas(x, z, o){
    if(!rockMat){ rockMat = new THREE.MeshStandardMaterial({ color: 0x4d443b, roughness: .95, metalness: 0, flatShading: true }); }
    var n = o.n || 8, hold = o.hold || 3.2;
    for(var i = 0; i < n; i++){ (function(){
      var s = rr(o.sz ? o.sz[0] : .2, o.sz ? o.sz[1] : .5), mesh = new THREE.Mesh(shardGeo(), rockMat), a = rr(0, Math.PI * 2), sp = rr(o.spd ? o.spd[0] : 2, o.spd ? o.spd[1] : 6), vy = rr(o.vz ? o.vz[0] : 6, o.vz ? o.vz[1] : 12), r0 = rr(o.rad ? o.rad[0] : .3, o.rad ? o.rad[1] : 1.5);
      var p = new V3(x + Math.cos(a) * r0, .3, z + Math.sin(a) * r0), v = new V3(Math.cos(a) * sp, vy, Math.sin(a) * sp), ax = new V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(), spin = rr(3, 9) * (rnd() < .5 ? -1 : 1), landed = false;
      mesh.scale.setScalar(s); mesh.position.copy(p); mesh.castShadow = true; mesh.userData.own = false;
      add(mesh, hold, function(u, dt, t){
        if(!landed){
          v.y -= 26 * dt; p.addScaledVector(v, dt); mesh.rotateOnAxis(ax, spin * dt);
          if(p.y <= s * .35 && v.y < 0){ p.y = s * .35; landed = true; spin = 0; }
        }
        mesh.position.copy(p); if(u > .85){ var k = 1 - (u - .85) / .15; mesh.scale.setScalar(Math.max(.001, s * k)); }
      }, o.lag);
    })(); }
  }
  /* brasas de luz que sobem balancando */
  var moteTex;
  function softTex(){
    if(moteTex) return moteTex; var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d').createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); var ctx2 = c.getContext('2d'); ctx2.fillStyle = g; ctx2.fillRect(0, 0, 64, 64);
    moteTex = new THREE.CanvasTexture(c); return moteTex;
  }
  function brasas(x, y, z, o){
    var n = o.n || 24, pos = new Float32Array(n * 3), st = [], life = o.life || 2.2;
    for(var i = 0; i < n; i++){ var a = rr(0, Math.PI * 2), r = rr(.1, 1) * (o.spread || 3); st.push({ x: x + Math.cos(a) * r, y: y + rr(0, .4), z: z + Math.sin(a) * r, sw: rr(.2, .6), ph: rr(0, 6), rise: (o.rise || 4) * rr(.7, 1.1), d: rr(0, .5) }); }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.userData.own = true;
    var m = new THREE.PointsMaterial({ map: softTex(), color: o.color || 0xffb84a, size: o.size || .32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }); m.userData.own = true;
    var pts = new THREE.Points(g, m); pts.frustumCulled = false;
    return add(pts, life, function(u, dt, t){
      for(var i = 0; i < n; i++){ var s = st[i], k = Math.min(1, Math.max(0, (t - s.d) / (life - .5))); pos[i * 3] = s.x + Math.sin(k * 5 + s.ph) * s.sw; pos[i * 3 + 1] = s.y + s.rise * k; pos[i * 3 + 2] = s.z + Math.cos(k * 4 + s.ph) * s.sw; }
      g.attributes.position.needsUpdate = true; m.opacity = u < .7 ? 1 : 1 - (u - .7) / .3;
    }, o.lag);
  }
  /* fumaca escura (fuligem) */
  function humo(x, z, o){
    o = o || {}; var n = o.n || 8;
    for(var i = 0; i < n; i++){ (function(){
      var a = rr(0, Math.PI * 2), sz = rr(.5, 1.0) * (o.size || 1.2), m = new THREE.MeshBasicMaterial({ color: 0x1b1714, transparent: true, opacity: 0, depthWrite: false }); m.userData.own = true;
      var g = new THREE.IcosahedronGeometry(1, 1); g.userData.own = true; var mesh = new THREE.Mesh(g, m); var d = rr(.8, 2.2) * (o.spread || 1);
      mesh.position.set(x + Math.cos(a) * rr(.2, 1.2), .4, z + Math.sin(a) * rr(.2, 1.2)); mesh.rotation.set(rr(0, 3), rr(0, 3), 0);
      var p0 = mesh.position.clone();
      add(mesh, rr(.9, 1.5), function(u){ mesh.position.set(p0.x + Math.cos(a) * d * u, p0.y + 1.6 * u, p0.z + Math.sin(a) * d * u); mesh.scale.setScalar(sz * (.4 + u * 1.2)); m.opacity = .55 * Math.sin(Math.PI * Math.min(1, u * 1.1)); }, o.lag);
    })(); }
  }

  /* cupula hexagonal (Fortaleza Egide): fresnel + malha triangular que pulsa */
  var DOME_VS = 'varying vec3 vN, vV, vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
  var DOME_FS = 'uniform vec3 uCol, uHot; uniform float uA, uTime; varying vec3 vN, vV, vP;\n' + NOISE +
    '\nfloat tri(vec2 p){ float s = 3.2; float a = abs(fract(dot(p, vec2(1.0, 0.0)) * s) - .5); float b = abs(fract(dot(p, vec2(.5, .866)) * s) - .5); float c = abs(fract(dot(p, vec2(-.5, .866)) * s) - .5); return 1.0 - smoothstep(.0, .06, min(a, min(b, c))); }' +
    '\nvoid main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float g = tri(vP.xz * 1.0 + vP.y * .6); float pulse = .6 + .4 * sin(uTime * 3.0 + vP.y * 5.0 + vn(vP * 3.0) * 4.0);' +
    ' float a = (f * .9 + g * .5 * pulse) * uA; vec3 c = mix(uCol, uHot, f); gl_FragColor = vec4(c * a * 1.5, a); }';
  var domeG;
  function cupula(x, z, o){
    if(!domeG) domeG = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    var m = mat(DOME_VS, DOME_FS, { uCol: { value: col(o.color || 0xff8a2a) }, uHot: { value: col(o.hot || 0xfff0c8) }, uA: { value: 0 }, uTime: { value: 0 } });
    var mesh = new THREE.Mesh(domeG, m); mesh.position.set(x, 0, z); var R = o.r || 6, life = o.life || 8;
    return add(mesh, life, function(u, dt, t){ var k = smooth(Math.min(1, t / .45)); mesh.scale.set(R * k, R * k * .95, R * k); mesh.rotation.y = t * 1.6; m.uniforms.uTime.value = t; m.uniforms.uA.value = (u > .88 ? (1 - u) / .12 : 1) * (.55 + .25 * Math.sin(t * 2)) * Math.min(1, t / .3); }, o.lag);
  }
  /* circulo de runas no chao (textura desenhada na hora) */
  var runeTex;
  function runaTex(){
    if(runeTex) return runeTex; var c = document.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d'); g.translate(256, 256); g.strokeStyle = '#ffc060'; g.fillStyle = '#ffc060'; g.lineCap = 'round';
    [[250, 3], [238, 1.5], [150, 2.5], [138, 1.2]].forEach(function(r){ g.lineWidth = r[1]; g.beginPath(); g.arc(0, 0, r[0], 0, Math.PI * 2); g.stroke(); });
    seeded(41); for(var i = 0; i < 48; i++){ var a = i / 48 * Math.PI * 2; g.save(); g.rotate(a); g.lineWidth = 2.2; g.beginPath(); var r0 = 160 + rr(0, 8), r1 = 225 - rr(0, 10), k = Math.floor(rr(2, 5)); g.moveTo(0, -r0);
      for(var j = 0; j < k; j++) g.lineTo(rr(-9, 9), -r0 - (r1 - r0) * (j + 1) / k); g.stroke(); g.restore(); }
    for(var t = 0; t < 12; t++){ g.save(); g.rotate(t / 12 * Math.PI * 2); g.beginPath(); g.moveTo(0, -250); g.lineTo(0, -228); g.lineWidth = 3; g.stroke(); g.restore(); }
    runeTex = new THREE.CanvasTexture(c); return runeTex;
  }
  function runas(x, z, o){
    var m = new THREE.MeshBasicMaterial({ map: runaTex(), color: o.color || 0xffa040, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); m.userData.own = true;
    var g = new THREE.PlaneGeometry(2, 2); g.userData.own = true; var mesh = new THREE.Mesh(g, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .12, z); var R = o.r || 6, life = o.life || 8;
    return add(mesh, life, function(u, dt, t){ var k = smooth(Math.min(1, t / .5)); mesh.scale.set(R * k, R * k, 1); mesh.rotation.z = t * .35; m.opacity = (u > .85 ? (1 - u) / .15 : 1) * .9 * k; }, o.lag);
  }

  /* rastro: fita voltada para a camera que acompanha uma posicao e apaga */
  var TRAIL_VS = 'attribute float aU; varying float vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var TRAIL_FS = 'uniform vec3 uCol, uHot; uniform float uA; varying float vU; void main(){ float a = pow(vU, 1.4) * uA; vec3 c = mix(uCol, uHot, pow(vU, 3.0)); gl_FragColor = vec4(c * a * .95, a); }';
  function trilha(getPos, o){
    var N = o.n || 26, pts = [], pos = new Float32Array(N * 2 * 3), au = new Float32Array(N * 2), g = new THREE.BufferGeometry(), idx = [];
    for(var i = 0; i < N - 1; i++){ var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aU', new THREE.BufferAttribute(au, 1)); g.setIndex(idx); g.userData.own = true;
    var m = mat(TRAIL_VS, TRAIL_FS, { uCol: { value: col(o.color || 0xff6a1a) }, uHot: { value: col(o.hot || 0xfff0c8) }, uA: { value: 1 } }); var mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    var wide = (o.width || .5) * .55, life = o.life || 1.2, cam = ctx.getCamera();
    return add(mesh, life, function(u, dt){
      var p = getPos(); if(p){ pts.unshift(p.clone()); if(pts.length > N) pts.pop(); }
      var side = new V3(), dir = new V3(), toCam = new V3();
      for(var i = 0; i < N; i++){
        var q = pts[Math.min(i, pts.length - 1)]; if(!q){ for(var k = 0; k < 6; k++) pos[i * 6 + k] = 0; continue; }
        var q2 = pts[Math.min(i + 1, pts.length - 1)]; dir.subVectors(q, q2); if(dir.lengthSq() < 1e-8) dir.set(0, 1, 0); dir.normalize();
        toCam.subVectors(cam.position, q).normalize(); side.crossVectors(dir, toCam).normalize(); var w = wide * (1 - i / N) * .5;
        pos[i * 6] = q.x + side.x * w; pos[i * 6 + 1] = q.y + side.y * w; pos[i * 6 + 2] = q.z + side.z * w; pos[i * 6 + 3] = q.x - side.x * w; pos[i * 6 + 4] = q.y - side.y * w; pos[i * 6 + 5] = q.z - side.z * w;
        var uu = 1 - i / (N - 1); au[i * 2] = uu; au[i * 2 + 1] = uu;
      }
      g.attributes.position.needsUpdate = true; g.attributes.aU.needsUpdate = true; m.uniforms.uA.value = u > .85 ? (1 - u) / .15 : 1;
    }, o.lag);
  }
  /* efeito preso a um objeto 3D (ex.: o escudo em voo): copia posicao e orientacao do alvo a cada frame */
  function seguir(getObj, build, dur, lag){
    var grp = new THREE.Group(); var inner = build(grp); var e = add(grp, dur, function(u, dt, t){
      var o = getObj(); if(!o) return; o.getWorldPosition(tmp); grp.position.copy(tmp); o.getWorldQuaternion(tmpQ); grp.quaternion.copy(tmpQ); if(inner) inner(u, dt, t);
    }, lag); return e;
  }
  /* camadas de espetos girando junto do objeto (escudo em velocidade maxima) */
  function espetosGirando(parent, o){
    var layers = o.layers || [{ n: 10, seed: 7, bw: .035, size: 2.0, spd: 5.4, color: 0xff6a1a }, { n: 8, seed: 21, bw: .022, size: 1.5, spd: -7.5, color: 0xffc83a }, { n: 14, seed: 3, bw: .04, size: 1.0, spd: 9, color: 0xff3a10, lmin: .6 }];
    var ms = layers.map(function(L){
      var m = mat(SPIKE_VS, SPIKE_FS, { uCol: { value: col(L.color) }, uHot: { value: col(0xfff0c8) }, uA: { value: 1 }, uTime: { value: 0 }, uGain: { value: 1.3 } });
      var mesh = new THREE.Mesh(spikeGeo(L.n, L.seed, L.bw, L.lmin || .7), m); mesh.scale.setScalar(L.size); parent.add(mesh); return { mesh: mesh, m: m, L: L };
    });
    return function(u, dt, t){ ms.forEach(function(q){ q.mesh.rotation.z = q.L.spd * t; q.mesh.rotation.x = q.L.spd * .35 * t; q.m.uniforms.uTime.value = t; var k = Math.min(1, t / .12) * (u > .9 ? (1 - u) / .1 : 1); q.mesh.scale.setScalar(q.L.size * (.75 + .25 * k)); q.m.uniforms.uA.value = k; }); };
  }

  /* correntes de elos reais (instanciados) com garra roxa escura na ponta; saem em leque, depois recolhem */
  var linkG, linkM, clawG, clawM;
  function correntes(px, pz, face, o){
    if(!linkG){ linkG = new THREE.TorusGeometry(.17, .052, 6, 8); linkG.scale(1.35, 1, 1); linkM = new THREE.MeshStandardMaterial({ color: 0x7c828c, metalness: .85, roughness: .38, emissive: 0x2a1204, emissiveIntensity: .6 });
      clawG = new THREE.ConeGeometry(.2, .62, 5); clawG.rotateZ(-Math.PI / 2); clawG.translate(.28, 0, 0); clawM = new THREE.MeshStandardMaterial({ color: 0x23095a, metalness: .5, roughness: .45, emissive: 0x16033d, emissiveIntensity: .7 }); }
    var n = o.n || 6, half = o.half || .39, len = o.len || 14, fly = o.fly || .3, hold = o.hold || .5, back = o.back || .45, total = fly + hold + back, grp = new THREE.Group(), chains = [];
    for(var i = 0; i < n; i++){
      var a = face + (-half + 2 * half * (i + .5) / n), L = len * (i === Math.floor(n / 2) && o.targetLen ? o.targetLen / len : rr(.72, 1)), steps = Math.floor(L / .4), inst = new THREE.InstancedMesh(linkG, linkM, steps), claw = new THREE.Mesh(clawG, clawM);
      var path = [], seed = rnd() * 10; for(var s = 0; s <= steps; s++){ var d = s * .4, wob = Math.sin(d * .9 + seed) * .35 + Math.sin(d * .37 + seed * 2) * .5; path.push(new V3(px + Math.sin(a) * d + Math.cos(a) * wob * Math.min(1, d / 4), 1.1 + Math.sin(d * .7 + seed) * .25, pz + Math.cos(a) * d - Math.sin(a) * wob * Math.min(1, d / 4))); }
      inst.frustumCulled = false; claw.frustumCulled = false; grp.add(inst); grp.add(claw); chains.push({ inst: inst, claw: claw, path: path, steps: steps, delay: Math.abs(i - n / 2) * .015 });
    }
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), px_ = new V3(), tx = new V3(), up = new V3(0, 1, 0), bs = new THREE.Matrix4();
    var e = add(grp, total, function(u, dt, t){
      chains.forEach(function(c){
        var tt = Math.max(0, t - c.delay), head;
        if(tt < fly) head = smooth(tt / fly); else if(tt < fly + hold) head = 1; else head = 1 - smooth((tt - fly - hold) / back);
        var cnt = Math.max(0, Math.min(c.steps, Math.floor(head * c.steps)));
        for(var s = 0; s < c.steps; s++){
          var a = c.path[s], b = c.path[s + 1]; tx.subVectors(b, a).normalize(); var side = new V3().crossVectors(tx, up).normalize(), upv = new V3().crossVectors(side, tx).normalize();
          if(s % 2) { var t2 = side; side = upv; upv = t2.clone().negate(); }
          bs.makeBasis(tx, upv, side); q.setFromRotationMatrix(bs); px_.copy(a).lerp(b, .5); m4.compose(px_, q, s < cnt ? new V3(1, 1, 1) : new V3(0, 0, 0)); c.inst.setMatrixAt(s, m4);
        }
        c.inst.instanceMatrix.needsUpdate = true;
        var hi = Math.max(0, Math.min(c.steps, cnt)), hp = c.path[hi], hq = c.path[Math.max(0, hi - 1)]; tx.subVectors(hp, hq).normalize();
        c.claw.position.copy(hp); c.claw.quaternion.setFromUnitVectors(new V3(1, 0, 0), tx.lengthSq() ? tx : new V3(1, 0, 0)); c.claw.visible = cnt > 1; c.claw.scale.setScalar(head > .02 ? 1 : 0);
      });
    }, o.lag); return e;
  }

  /* escudo fantasma (chuva de escudos): casco em formato de escudo brasonado que cai de ponta */
  var shG, shM;
  function escudoGeo(){
    if(shG) return shG; var s = new THREE.Shape(); s.moveTo(-.55, .8); s.lineTo(.55, .8); s.quadraticCurveTo(.6, .1, .45, -.35); s.quadraticCurveTo(.2, -.8, 0, -1.05); s.quadraticCurveTo(-.2, -.8, -.45, -.35); s.quadraticCurveTo(-.6, .1, -.55, .8);
    shG = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelSize: .05, bevelThickness: .04, bevelSegments: 2, curveSegments: 10 }); shG.translate(0, 0, -.05); shG.userData.own = false;
    shM = new THREE.MeshStandardMaterial({ color: 0xd9e2ee, metalness: .9, roughness: .3, emissive: 0xff7a22, emissiveIntensity: .8, transparent: true, opacity: .9 }); return shG;
  }
  function escudoFantasma(x, z, o){
    var g = escudoGeo(), m = shM.clone(), mesh = new THREE.Mesh(g, m), h0 = o.h || 11, size = o.size || 1.3, life = o.fall || .26, a = rr(0, Math.PI * 2);
    mesh.scale.setScalar(size); mesh.position.set(x, h0, z); mesh.rotation.set(0, a, 0); m.userData.own = true;     /* de pe (ponta para baixo), nao de cabeca para baixo */
    var done = false;
    var e = add(mesh, life + .35, function(u, dt, t){
      if(t < life){ var k = t / life; mesh.position.y = h0 * (1 - k * k) + .9 * size * k * k; mesh.rotation.z = Math.sin(t * 30) * .08; }
      else { mesh.position.y = Math.max(-.2, .9 * size - (t - life) * 3 * 1); m.opacity = Math.max(0, .9 - (t - life) / .35); }
      if(t >= life && !done){ done = true; if(o.onLand) o.onLand(x, z); }
    }, o.lag); return e;
  }


  /* casca em setor (cone de 90 graus do Escudo de Energia): cresce para a frente com ruido e brilho de borda */
  function cunha(x, z, face, o){
    var half = o.half || .785, g = new THREE.CylinderGeometry(1.1, 1, 1, 40, 6, true, face - half, half * 2);
    g.translate(0, .5, 0); g.userData.own = true; var cg = g;
    /* no three o angulo theta do cilindro aponta para (sin theta, cos theta), igual ao jogo */
    var m = mat(SHELL_VS, SHELL_FS, { uCol: { value: col(o.color || 0xffa030) }, uHot: { value: col(o.hot || 0xfff0c8) }, uA: { value: 1 }, uFlow: { value: 0 }, uLo: { value: .3 }, uHi: { value: .62 }, uMode: { value: 1 }, uPow: { value: .35 }, uNS: { value: 1.6 } });
    var mesh = new THREE.Mesh(cg, m); mesh.position.set(x, 0, z); var r1 = o.r1 || 5, h = o.h || 2.6, life = o.life || .75;
    return add(mesh, life, function(u, dt, t){ var e = 1 - (1 - Math.min(1, u * 1.6)) * (1 - Math.min(1, u * 1.6)); mesh.scale.set(.6 + r1 * e, h * (.7 + .3 * e), .6 + r1 * e); m.uniforms.uFlow.value = -2 * t; m.uniforms.uA.value = u < .1 ? u / .1 : 1 - smooth((u - .45) / .55); }, o.lag);
  }

  /* escudo de energia (Skill 1): placa 3D com o desenho do escudo equipado, malha hexagonal, energia correndo, borda em fresnel e nucleo branco-quente.
     escudoCarga: sobre o escudo do personagem durante a carga, trocando de cor (acumula energia). escudoEnergia: solta, sai da mao e cresce num leque. */
  var EN_VS = 'uniform float uBend; varying vec3 vN, vE, vP; void main(){ vP = position; vec3 p = position; p.z += uBend * p.x * p.x; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(p, 1.0); vE = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
  var EN_FS = 'uniform vec3 uCol, uHot, uEdge; uniform float uA, uTime, uGain, uAsp; varying vec3 vN, vE, vP;\n' + NOISE + '\n' +
    'float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(.866025, .5)), p.y); }\n' +
    'vec4 hexc(vec2 uv){ vec2 r = vec2(1.0, 1.7320508), h = r * .5; vec2 a = mod(uv, r) - h, b = mod(uv - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b; return vec4(g, uv - g); }\n' +
    'void main(){' +
    ' vec2 q = vec2(vP.x * uAsp, vP.y); vec4 hc = hexc(q * 5.2); float e = .5 - hexd(hc.xy); float line = 1.0 - smoothstep(.0, .09, e);' +
    ' float cell = h31(vec3(hc.zw * .37, floor(uTime * 3.0 + hc.z)));' +
    ' float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vE))), 2.0);' +
    ' float fl = fbm(vec3(q * 3.2, uTime * 1.6)); float sw = smoothstep(.0, .5, 1.0 - abs(fract(q.y * .45 - uTime * 1.1) - .5) * 2.0);' +
    ' vec2 cq = q / vec2(.62 * uAsp, 1.0); float core = exp(-dot(cq, cq) * 2.2);' +
    ' float en = .22 + .5 * fl + line * (.5 + 1.1 * cell) + sw * .35 + fr * 1.5;' +
    ' vec3 c = mix(uCol * .55, uEdge, clamp(fr * 1.2 + fl * .25, 0.0, 1.0)); c = mix(c, uHot, clamp(core * .55 + line * cell * .7, 0.0, 1.0));' +
    ' float a = clamp(.4 + en * .45, 0.0, .93) * uA; gl_FragColor = vec4(c * min(.55 + en * .5, 1.5) * uGain, a); }';
  function enMat(c, hot, edge){
    return mat(EN_VS, EN_FS, { uCol: { value: col(c) }, uHot: { value: col(hot) }, uEdge: { value: col(edge) }, uA: { value: 0 }, uTime: { value: 0 }, uGain: { value: 1 }, uBend: { value: 0 }, uAsp: { value: 1 } }, { blending: THREE.NormalBlending });
  }
  var enG;
  function energiaGeo(){
    if(enG) return enG; var s = new THREE.Shape(); s.moveTo(-.62, .85); s.lineTo(.62, .85); s.quadraticCurveTo(.7, .1, .5, -.4); s.quadraticCurveTo(.22, -.85, 0, -1.1); s.quadraticCurveTo(-.22, -.85, -.5, -.4); s.quadraticCurveTo(-.7, .1, -.62, .85);
    enG = new THREE.ExtrudeGeometry(s, { depth: .22, bevelEnabled: true, bevelSize: .07, bevelThickness: .08, bevelSegments: 3, curveSegments: 14 }); enG.translate(0, 0, -.11); return enG;
  }
  /* escudo classico para a saida: topo reto, laterais retas e ponta embaixo; borda alta, painel em relevo, umbo redondo e nervuras em cruz. 2 de altura, ~1,2 de largura */
  var limpoG;
  function limpoGeo(){
    if(limpoG) return limpoG;
    function heater(sc, cy){ var s = new THREE.Shape(), k = function(v, c){ return c + (v - c) * sc; };
      s.moveTo(-.52 * sc, k(1.0, cy)); s.lineTo(.52 * sc, k(1.0, cy)); s.quadraticCurveTo(.6 * sc, k(1.0, cy), .6 * sc, k(.9, cy)); s.lineTo(.6 * sc, k(.15, cy));
      s.bezierCurveTo(.6 * sc, k(-.45, cy), .25 * sc, k(-.8, cy), 0, k(-1.0, cy)); s.bezierCurveTo(-.25 * sc, k(-.8, cy), -.6 * sc, k(-.45, cy), -.6 * sc, k(.15, cy));
      s.lineTo(-.6 * sc, k(.9, cy)); s.quadraticCurveTo(-.6 * sc, k(1.0, cy), -.52 * sc, k(1.0, cy)); return s; }
    var parts = [], ex = function(sh, depth, z, bev){ var g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, z); return g; };
    parts.push(ex(heater(1, 0), .1, -.1, .05));                                   /* placa com borda */
    parts.push(ex(heater(.8, .1), .08, .02, .03));                                /* painel em relevo */
    var boss = new THREE.SphereGeometry(.22, 24, 14); boss.scale(1, 1, .5); boss.translate(0, .22, .2); parts.push(boss);   /* umbo */
    var v = new THREE.BoxGeometry(.07, 1.55, .07); v.translate(0, .1, .14); parts.push(v);                                  /* nervuras */
    var h = new THREE.BoxGeometry(.95, .07, .07); h.translate(0, .45, .14); parts.push(h);
    parts.push(ex(heater(.8, .1), .08, -.18, .03));                                /* o mesmo relevo no verso: a camera de terceira pessoa ve o escudo por tras */
    var boss2 = new THREE.SphereGeometry(.22, 24, 14); boss2.scale(1, 1, .5); boss2.translate(0, .22, -.2); parts.push(boss2);
    var v2 = new THREE.BoxGeometry(.07, 1.55, .07); v2.translate(0, .1, -.14); parts.push(v2);
    var h2 = new THREE.BoxGeometry(.95, .07, .07); h2.translate(0, .45, -.14); parts.push(h2);
    var P = [], N = []; parts.forEach(function(g){ var n = g.index ? g.toNonIndexed() : g, pa = n.attributes.position.array, na = n.attributes.normal.array, i; for(i = 0; i < pa.length; i++){ P.push(pa[i]); N.push(na[i]); } });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return (limpoG = g);
  }
  /* carga: cobre o escudo do personagem (acompanha a mao) e muda de cor aos poucos: branco -> ciano -> azul eletrico -> azul profundo */
  var CARGA = [[0xf4fbff, 0xcfe8ff, 0xffffff], [0x3fe0ff, 0x9ff0ff, 0xffffff], [0x2f7bff, 0x7fd2ff, 0xf4fbff], [0x1a3cff, 0x4f8cff, 0xf4fbff]];
  function escudoCarga(o){
    var info = o.info, life = o.life || 4, m = enMat(CARGA[0][0], CARGA[0][2], CARGA[0][1]), mesh = new THREE.Mesh(info.geo || energiaGeo(), m);
    mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
    var T = new THREE.Matrix4(), R = new THREE.Matrix4(), S = new THREE.Matrix4(), cc = new V3(), qi = info.rinv, ca = col(0), cb = col(0);
    return add(mesh, life, function(u, dt, t){
      var h = o.getHolder(); if(!h) return; h.updateWorldMatrix(true, false);
      cc.set(info.c[0], info.c[1], info.c[2]).applyQuaternion(qi); T.makeTranslation(cc.x, cc.y, cc.z); R.makeRotationFromQuaternion(qi);
      var pul = (1.05 + .025 * Math.sin(t * 11)) / info.s; S.makeScale(pul, pul, pul);
      mesh.matrix.copy(h.matrixWorld).multiply(T).multiply(R).multiply(S); mesh.matrixWorldNeedsUpdate = true;
      var f = Math.min(.999, u) * (CARGA.length - 1), i = Math.floor(f), k = f - i, A = CARGA[i], B = CARGA[i + 1];
      ca.set(A[0]).lerp(cb.set(B[0]), k); m.uniforms.uCol.value.copy(ca); ca.set(A[1]).lerp(cb.set(B[1]), k); m.uniforms.uEdge.value.copy(ca); ca.set(A[2]).lerp(cb.set(B[2]), k); m.uniforms.uHot.value.copy(ca);
      m.uniforms.uTime.value = t * (1 + u * 2); m.uniforms.uGain.value = .6 + .9 * u; m.uniforms.uA.value = (u < .1 ? u / .1 : 1) * (u > .94 ? Math.max(0, (1 - u) / .06) : 1);
    }, o.lag);
  }
  /* solta: sai da mao, anda 'range' m em 'life' s e cresce abrindo num leque de 2*half (curvo, as pontas ficam para tras) */
  function escudoEnergia(x, z, face, o){
    o = o || {}; var range = o.range || 5, life = o.life || 1.2, size = o.size || 1.25, half = o.half || .785, fx = Math.sin(face), fz = Math.cos(face), fim = false, from = o.from || { x: x + fx * .6, y: 1.2, z: z + fz * .6 };
    var d0 = Math.max(.3, (from.x - x) * fx + (from.z - z) * fz), w0 = (o.w0 || 1.4), wf = 2 * range * Math.tan(half) * .8, xmax = .64, tilt = o.tilt === undefined ? .4 : o.tilt;
    var m = enMat(o.color || 0x1a3cff, o.hot || 0xf4fbff, o.edge || 0x4f8cff); m.uniforms.uGain.value = o.gain || 1.1;
    var mesh = new THREE.Mesh(o.limpo ? limpoGeo() : (o.geo || energiaGeo()), m); mesh.rotation.order = 'YXZ'; mesh.rotation.y = face; mesh.position.set(from.x, from.y, from.z); mesh.scale.setScalar(.01);
    var e = add(mesh, life, function(u, dt, t){
      var g = smooth(Math.min(1, u / .85)), d = d0 + (range - d0) * (1 - Math.pow(1 - u, 2.2)), s = size * (.75 + .6 * g), sx = (w0 + (wf - w0) * g) / (2 * xmax), sz = s * (.8 + .2 * g) * (o.geo ? .4 : 1);
      if(o.limpo){ sx = s; sz = s; } mesh.scale.set(sx, s, sz); mesh.position.set(x + fx * d, from.y + (1.25 - from.y) * g, z + fz * d); mesh.rotation.x = -tilt * smooth(Math.min(1, u / .25));      /* reto, e vai deitando */
      m.uniforms.uBend.value = o.limpo ? 0 : -(1.8 * g) / (sz * xmax * xmax); m.uniforms.uAsp.value = sx / s;                                                                        /* leque curvo */
      m.uniforms.uTime.value = t; m.uniforms.uA.value = (u < .08 ? u / .08 : 1) * (u > .86 ? Math.max(0, 1 - (u - .86) / .14) : 1);
      if(u > .86 && !fim){ fim = true; var p = mesh.position;
        espetos(p.x, p.y, p.z, { n: 18, seed: 23, size: 2.6, color: 0x2f7bff, hot: 0xffffff, life: .55 });
        brasas(p.x, p.y - .6, p.z, { n: 22, spread: 2.4, rise: 1.8, color: 0xcfe8ff, life: 1.1, size: .2 }); }
    }, o.lag);
    e.mesh = mesh; return e;
  }

  /* feixe (estilo kamehameha): camadas de energia fluindo pelo cilindro, esfera na ponta que avanca, clarao na saida e impacto no fim */
  var BM_VS = 'uniform float uR, uL, uTime, uBulge; varying float vA, vAng; varying vec3 vN, vV;' +
    ' void main(){ float a = position.z; float r = uR * (1.0 + uBulge * sin(a * uL * 2.4 - uTime * 16.0)) * mix(.5, 1.0, smoothstep(0.0, .1, a));' +
    ' vec4 mv = modelViewMatrix * vec4(position.xy * r, a * uL, 1.0); vA = a; vAng = atan(position.y, position.x); vN = normalize(normalMatrix * vec3(position.xy, 0.0)); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
  var BM_FS = 'uniform vec3 uCol, uHot; uniform float uA, uTime, uFlow, uPow, uL; varying float vA, vAng; varying vec3 vN, vV;\n' + NOISE +
    '\nvoid main(){ float d = abs(dot(normalize(vN), normalize(vV))); float n = fbm(vec3(vAng * 1.8, vA * uL * .8 - uTime * uFlow, uTime * .6));' +
    ' float s = fbm(vec3(vAng * 4.0, vA * uL * .3 - uTime * uFlow * 1.7, 7.0)); float body = pow(d, uPow); float e = body * (.55 + .9 * n) + s * .25 * (1.0 - body);' +
    ' vec3 c = mix(uCol, uHot, clamp(body * body * (.4 + n), 0.0, 1.0)); float a = clamp(e, 0.0, 1.0) * uA * smoothstep(0.0, .05, vA); gl_FragColor = vec4(c * (.4 + .5 * e), a); }';
  var HD_VS = 'varying vec3 vN, vV, vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
  var HD_FS = 'uniform vec3 uCol, uHot; uniform float uA, uTime; varying vec3 vN, vV, vP;\n' + NOISE +
    '\nvoid main(){ float d = abs(dot(normalize(vN), normalize(vV))); float n = fbm(vP * 3.2 + vec3(0.0, 0.0, -uTime * 5.0)); float e = pow(d, 1.1) * (.6 + .9 * n);' +
    ' vec3 c = mix(uCol, uHot, clamp(pow(d, 4.0) * 1.1, 0.0, 1.0)); float a = clamp(e, 0.0, 1.0) * uA * .7; gl_FragColor = vec4(c * (.45 + .5 * e), a); }';
  var bmG, hdG;
  function beamGeo(){ if(!bmG){ bmG = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true); bmG.translate(0, .5, 0); bmG.rotateX(Math.PI / 2); } return bmG; }
  function headGeo(){ return hdG || (hdG = new THREE.SphereGeometry(1, 32, 20)); }
  var FEIXE = [ { r: .78, col: 0x1450ff, hot: 0x4fa8ff, pow: .7, flow: 2.6, a: .85, bulge: .08 }, { r: .55, col: 0x2f8bff, hot: 0x9fe0ff, pow: 1.2, flow: 3.8, a: .5, bulge: .05 },
                { r: .34, col: 0x7fd2ff, hot: 0xffffff, pow: 1.6, flow: 5.2, a: .38, bulge: .03 }, { r: .17, col: 0xf4fbff, hot: 0xffffff, pow: 2.2, flow: 7, a: .5, bulge: .02 } ];
  function feixe(x, z, face, o){
    o = o || {}; var range = o.range || 5, life = o.life || 1.5, fx = Math.sin(face), fz = Math.cos(face), from = o.from || { x: x + fx * .6, y: 1.2, z: z + fz * .6 }, esc = o.size || 1;
    var grp = new THREE.Group(); grp.position.set(from.x, from.y, from.z); grp.rotation.y = face;
    var ls = FEIXE.map(function(L){ var m = mat(BM_VS, BM_FS, { uCol: { value: col(L.col) }, uHot: { value: col(L.hot) }, uA: { value: 0 }, uTime: { value: 0 }, uFlow: { value: L.flow }, uPow: { value: L.pow }, uL: { value: 1 }, uR: { value: L.r }, uBulge: { value: L.bulge } });
      var me = new THREE.Mesh(beamGeo(), m); me.frustumCulled = false; grp.add(me); return { m: m, L: L }; });
    function ball(r0, c, h){ var m = mat(HD_VS, HD_FS, { uCol: { value: col(c) }, uHot: { value: col(h) }, uA: { value: 0 }, uTime: { value: 0 } }); var me = new THREE.Mesh(headGeo(), m); me.frustumCulled = false; grp.add(me); return { me: me, m: m, r: r0 }; }
    var head = ball(.62, 0x2f8bff, 0xffffff), head2 = ball(.34, 0x7fd2ff, 0xffffff), muz = ball(.5, 0x4fa8ff, 0xffffff), hit = false, p1 = false;
    return add(grp, life, function(u, dt, t){
      var gr = Math.min(1, u / .14), Lx = range * (1 - Math.pow(1 - gr, 3)), k = u < .08 ? smooth(u / .08) : (u > .72 ? smooth((1 - u) / .28) : 1), pul = 1 + .07 * Math.sin(t * 34);
      ls.forEach(function(q){ var U = q.m.uniforms; U.uL.value = Math.max(.01, Lx); U.uR.value = q.L.r * esc * k * pul; U.uTime.value = t; U.uA.value = q.L.a * Math.min(1, k * 1.4); });
      [head, head2, muz].forEach(function(b){ b.m.uniforms.uTime.value = t; b.m.uniforms.uA.value = Math.min(1, k * 1.3); });
      head.me.position.z = Lx; head.me.scale.setScalar(head.r * esc * k * pul); head2.me.position.z = Lx; head2.me.scale.setScalar(head2.r * esc * k * pul);
      muz.me.position.z = 0; muz.me.scale.setScalar(muz.r * esc * (1.15 - .25 * u) * k * (1 + .12 * Math.sin(t * 29)));
      if(!p1){ p1 = true; luz(from.x, from.y, from.z, { color: 0x7fd2ff, intensity: 60, life: .5 }); brasas(from.x, from.y - .6, from.z, { n: 16, spread: 1.2, rise: 1.4, color: 0xcfe8ff, life: .9, size: .18 }); }
      if(gr >= 1 && !hit){ hit = true; var ex = from.x + fx * range, ez = from.z + fz * range;
        espetos(ex, from.y, ez, { n: 22, seed: 29, size: 3, color: 0x2f8bff, hot: 0xffffff, life: .6 });
        brasas(ex, .3, ez, { n: 30, spread: 2.4, rise: 2.4, color: 0xcfe8ff, life: 1.5, size: .22 }); luz(ex, from.y, ez, { color: 0x7fd2ff, intensity: 70, life: .9 }); }
    }, o.lag);
  }

  /* escudo VOADOR (skill 6): disco de energia com o desenho do escudo equipado; sai da mao, vai ate 'dist', segura um instante e volta girando para a mao.
     o escudo real do braco some durante o voo (o chamador esconde e devolve em onEnd). o Blender nao anima mais o voo: o clipe do L2 so move o braco. */
  function escudoVoo(o){
    var m = enMat(o.color || 0xff6a1a, o.hot || 0xfff0c8, o.edge || 0xffc83a); m.uniforms.uGain.value = o.gain || 1.25;
    var mesh = new THREE.Mesh(o.info.geo, m); mesh.frustumCulled = false; mesh.scale.setScalar((o.info.altura || 2) / 2 * (o.size || 1));
    var tO = o.tOut || .3, tH = o.tHold || .12, tB = o.tBack || .55, T = tO + tH + tB, from = o.from, fx = Math.sin(o.face), fz = Math.cos(o.face), D = o.dist || 5.7, tgt = { x: from.x + fx * D, y: from.y, z: from.z + fz * D };
    var e = add(mesh, T, function(u, dt, t){
      var a, hand = o.getHand ? (o.getHand() || from) : from, p;
      if(t < tO){ a = 1 - Math.pow(1 - t / tO, 2); p = { x: from.x + (tgt.x - from.x) * a, y: from.y + .25 * Math.sin(a * Math.PI), z: from.z + (tgt.z - from.z) * a }; }
      else if(t < tO + tH){ p = tgt; }
      else { a = (t - tO - tH) / tB; a = a * a * (3 - 2 * a); p = { x: tgt.x + (hand.x - tgt.x) * a, y: tgt.y + (hand.y - tgt.y) * a + .3 * Math.sin(a * Math.PI), z: tgt.z + (hand.z - tgt.z) * a }; }
      mesh.position.set(p.x, p.y, p.z); mesh.rotation.set(0, o.face + t * 20, 0);
      m.uniforms.uTime.value = t * 2; m.uniforms.uA.value = u < .06 ? u / .06 : (u > .94 ? (1 - u) / .06 : 1);
    });
    e.done = o.onEnd; return e;
  }

  /* ---------- domo de colmeia + escudo astral (Skill 1: Escudo de Energia, canalizada) ----------
     meio domo de celulas hexagonais na frente do Guardiao (180 graus); cada golpe absorvido encaixa celulas ("tum"); ao soltar, o domo se expande e some.
     o escudo astral e um desenho fixo do IS (textura de canvas), de frente e de costas (a camera de terceira pessoa ve por tras). */
  var DM_VS = 'attribute vec3 aC; attribute float aE; attribute float aBorn; uniform float uTime, uExp; varying float vE, vAge; varying vec3 vN, vV, vP;' +
    ' void main(){ float age = aBorn < 0.0 ? -1.0 : uTime - aBorn; vAge = age; float pop = age < 0.0 ? 0.0 : smoothstep(0.0, .16, age);' +
    ' float s = mix(.15, 1.0, pop) * (1.0 + .22 * exp(-max(age, 0.0) * 9.0)); vec3 p = aC + (position - aC) * s; p *= (1.0 + (1.0 - pop) * .55) * uExp;' +
    ' vE = aE; vP = position; vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normalize(position)); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
  var DM_FS = 'uniform vec3 uCol, uHot; uniform float uTime, uA, uExpT, uPulse; varying float vE, vAge; varying vec3 vN, vV, vP;\n' + NOISE +
    '\nvoid main(){ if(vAge < 0.0) discard; float edge = smoothstep(.6, .96, vE); float flash = exp(-vAge * 4.5); float n = fbm(vP * 3.6 + vec3(0.0, uTime * .9, uTime * .4));' +
    ' float fr = 1.0 - abs(dot(normalize(vN), normalize(vV))); vec3 c = uCol * (.35 + .75 * n) + uHot * (edge * .9 + flash * 1.1 + uPulse * .5 + fr * .25);' +
    ' float a = (.26 + .5 * n * (1.0 - edge) + edge * .75 + flash * .55 + fr * .2 + uPulse * .25) * clamp(vAge * 10.0, 0.0, 1.0) * (1.0 - uExpT) * uA; gl_FragColor = vec4(c, clamp(a, 0.0, 1.0)); }';
  var AS_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var AS_FS = 'uniform sampler2D uTex; uniform vec3 uCol, uHot; uniform float uA, uTime, uPulse; varying vec2 vUv;\n' + NOISE +
    '\nvoid main(){ float m = texture2D(uTex, vUv).r; float sweep = smoothstep(.0, .5, 1.0 - abs(fract(vUv.y * .7 - uTime * .25) - .5) * 2.0);' +
    ' float n = fbm(vec3(vUv * 7.0, uTime * .6)); vec3 c = mix(uCol, uHot, clamp(m * m + uPulse * .4, 0.0, 1.0)) * (.5 + m * 1.1 + sweep * .25 * m + n * .25);' +
    ' float a = clamp(m * (.55 + n * .5 + sweep * .3) + .05 * n, 0.0, 1.0) * uA; gl_FragColor = vec4(c, a); }';
  var astralT;
  function astralTex(){
    if(astralT) return astralT;
    var W = 512, H = 768, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d'), cx = W / 2;
    function heater(sc, cy, ox){ var w = 205 * sc, top = cy - 330 * sc, bot = cy + 340 * sc; g.beginPath(); g.moveTo(cx - w + 26 * sc, top); g.lineTo(cx + w - 26 * sc, top); g.quadraticCurveTo(cx + w, top, cx + w, top + 26 * sc); g.lineTo(cx + w, cy + 40 * sc);
      g.bezierCurveTo(cx + w, cy + 200 * sc, cx + 90 * sc, cy + 290 * sc, cx, bot); g.bezierCurveTo(cx - 90 * sc, cy + 290 * sc, cx - w, cy + 200 * sc, cx - w, cy + 40 * sc); g.lineTo(cx - w, top + 26 * sc); g.quadraticCurveTo(cx - w, top, cx - w + 26 * sc, top); g.closePath(); }
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.shadowColor = '#fff'; g.shadowBlur = 14; g.lineJoin = 'round'; g.lineCap = 'round';
    heater(1, 384); g.fillStyle = 'rgba(255,255,255,.10)'; g.fill();
    [[1, 11, 1], [.94, 3, .8], [.78, 6, .95], [.72, 2, .7]].forEach(function(r){ heater(r[0], 384); g.strokeStyle = 'rgba(255,255,255,' + r[2] + ')'; g.lineWidth = r[1]; g.stroke(); });
    g.save(); heater(.72, 384); g.clip();                                                    /* dentro do painel: divisoes e circuitos */
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, 40); g.lineTo(cx, 740); g.moveTo(60, 300); g.lineTo(452, 300); g.stroke();
    var s = 17; function rn(){ s = (s * 16807) % 2147483647; return s / 2147483647; }
    for(var i = 0; i < 16; i++){ var x = 90 + rn() * 330, y = 430 + rn() * 260, d = rn() < .5 ? 1 : -1, L = 30 + rn() * 70; g.strokeStyle = 'rgba(255,255,255,' + (.3 + rn() * .4) + ')'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + d * L, y); g.lineTo(x + d * L, y + 24 + rn() * 40); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x + d * L, y + 24, 3.5, 0, 6.3); g.fill(); }
    g.restore();
    for(i = 0; i < 28; i++){ var a = i / 28 * 6.2832, x0 = cx + Math.cos(a) * 112, y0 = 300 + Math.sin(a) * 112, x1 = cx + Math.cos(a) * (i % 2 ? 124 : 132), y1 = 300 + Math.sin(a) * (i % 2 ? 124 : 132);   /* aro do emblema com marcas */
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = i % 2 ? 2 : 3.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    g.beginPath(); g.arc(cx, 300, 104, 0, 6.2832); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = '900 128px "Trebuchet MS", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('IS', cx, 304);
    g.font = '700 22px Arial'; g.fillText('✦', cx, 215); g.fillText('✦', cx, 392);
    var t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return (astralT = t);
  }
  function domo(o){
    var R = o.R || 3.6, ds = o.ds || .25, cells = [], i, j, rows = Math.ceil(1.3 / (ds * .866)) + 1;
    for(j = 0; j < rows; j++){ var el = .02 + j * ds * .866, step = ds / Math.cos(el);
      for(var a = -Math.PI / 2 + step * .5 + (j % 2) * step * .5; a <= Math.PI / 2 - step * .5 + 1e-6; a += step) cells.push({ az: a, el: el, k: 0 }); }
    seeded(41); cells.forEach(function(c){ c.k = Math.hypot(c.az * Math.cos(c.el) * .85, c.el - .45) + rnd() * .4; }); cells.sort(function(p, q){ return p.k - q.k; });
    var n = cells.length, P = new Float32Array(n * 21), C = new Float32Array(n * 21), E = new Float32Array(n * 7), B = new Float32Array(n * 7).fill(-1), ix = [], rh = .577 * ds * .93, d = new V3(), ea = new V3(), no = new V3(), v = new V3();
    cells.forEach(function(c, ci){
      d.set(Math.sin(c.az) * Math.cos(c.el), Math.sin(c.el), Math.cos(c.az) * Math.cos(c.el)); ea.set(Math.cos(c.az), 0, -Math.sin(c.az)); no.set(-Math.sin(c.az) * Math.sin(c.el), Math.cos(c.el), -Math.cos(c.az) * Math.sin(c.el));
      var b = ci * 7; P.set([d.x * R, d.y * R, d.z * R], b * 3);
      for(var k = 0; k < 6; k++){ var th = Math.PI / 2 + k * Math.PI / 3; v.copy(d).addScaledVector(ea, Math.cos(th) * rh).addScaledVector(no, Math.sin(th) * rh).normalize().multiplyScalar(R); P.set([v.x, v.y, v.z], (b + 1 + k) * 3); E[b + 1 + k] = 1; ix.push(b, b + 1 + k, b + 1 + (k + 1) % 6); }
      for(k = 0; k < 7; k++) C.set([d.x * R, d.y * R, d.z * R], (b + k) * 3);
    });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aC', new THREE.BufferAttribute(C, 3)); g.setAttribute('aE', new THREE.BufferAttribute(E, 1)); g.setAttribute('aBorn', new THREE.BufferAttribute(B, 1)); g.setIndex(ix); g.userData.own = true;
    var dm = mat(DM_VS, DM_FS, { uCol: { value: col(0xf4fbff) }, uHot: { value: col(0xffffff) }, uTime: { value: 0 }, uExp: { value: 1 }, uExpT: { value: 0 }, uA: { value: 1 }, uPulse: { value: 0 } });
    var dome = new THREE.Mesh(g, dm); dome.frustumCulled = false;
    var grp = new THREE.Group(), tex = astralTex(), planes = [];
    [0, Math.PI].forEach(function(ry){ var m = mat(AS_VS, AS_FS, { uTex: { value: tex }, uCol: { value: col(0xf4fbff) }, uHot: { value: col(0xffffff) }, uA: { value: 0 }, uTime: { value: 0 }, uPulse: { value: 0 } }, { side: THREE.FrontSide });
      var pg = new THREE.PlaneGeometry(1.85, 2.78); pg.userData.own = true; var me = new THREE.Mesh(pg, m); me.rotation.y = ry; me.position.z = ry ? -.012 : .012; me.frustumCulled = false; planes.push(me); });
    var asg = new THREE.Group(), em = null, asc = 1;
    if(o.info && o.info.geo){ em = enMat(0xf4fbff, 0xffffff, 0xcfe8ff); var emesh = new THREE.Mesh(o.info.geo, em); emesh.frustumCulled = false; asg.add(emesh); asc = 1.35; }
    else asg.add(planes[0], planes[1]);
    asg.position.set(0, 1.1, R * .5); grp.add(dome, asg);
    var st = { t: 0, filled: 0, rel: -1, pulse: 0, lastLv: 0 }, cc = col(0), cb = col(0), cd = col(0), ce = col(0), born = g.attributes.aBorn, clock = 0;
    var e = add(grp, 999, function(u, dt, t){
      clock = t; var p = o.getPos(); grp.position.set(p.x, .2, p.z); grp.rotation.y = p.face;
      var f = Math.min(.999, st.t / 5) * (CARGA.length - 1), i0 = Math.floor(f), k = f - i0, A = CARGA[i0], Bq = CARGA[i0 + 1]; cc.set(A[0]).lerp(cb.set(Bq[0]), k); cd.set(A[2]).lerp(cb.set(Bq[2]), k); ce.set(A[1]).lerp(cb.set(Bq[1]), k);
      st.pulse = Math.max(0, st.pulse - dt * 2.2); var rel = st.rel >= 0, ex = 1, ext = 0, fade = 1;
      if(rel){ st.rel += dt; var r = Math.min(1, st.rel / .65); ex = 1 + (15 / R - 1) * (1 - Math.pow(1 - r, 2.4)); ext = r; fade = 1 - r; if(r >= 1) e.t = e.dur; }
      var U = dm.uniforms; U.uTime.value = clock; U.uCol.value.copy(cc); U.uHot.value.copy(cd); U.uExp.value = ex; U.uExpT.value = ext; U.uPulse.value = st.pulse;
      var grow = smooth(clock / .35); asg.scale.setScalar(asc * (.4 + .6 * grow) * (rel ? 1 + st.rel * 2.2 : 1)); asg.position.y = 1.1 + .05 * Math.sin(clock * 2.2); asg.position.z = R * .5 + (rel ? st.rel * 4 : 0);
      if(em){ var W = em.uniforms; W.uCol.value.copy(cc); W.uEdge.value.copy(ce); W.uHot.value.copy(cd); W.uTime.value = clock * (1 + st.t * .4); W.uGain.value = .8 + .6 * Math.min(1, st.t / 5) + st.pulse * .6; W.uA.value = grow * fade; }
      planes.forEach(function(me){ var q = me.material.uniforms; q.uTime.value = clock; q.uCol.value.copy(cc); q.uHot.value.copy(cd); q.uPulse.value = st.pulse; q.uA.value = grow * (.65 + .35 * Math.min(1, st.t / 5)) * fade; });
    });
    return {
      enc: function(num){ var a0 = st.filled, a1 = Math.min(n, a0 + Math.max(1, num)); for(var c = a0; c < a1; c++) for(var k = 0; k < 7; k++) B[c * 7 + k] = clock + (c - a0) * .06; st.filled = a1; born.needsUpdate = true; st.pulse = Math.max(st.pulse, .5); return st.filled; },
      tempo: function(t){ st.t = t; }, pulso: function(){ st.pulse = 1; }, soltar: function(){ if(st.rel < 0) st.rel = 0; }, kill: function(){ e.t = e.dur; },
      total: n, cheias: function(){ return st.filled; }, R: R
    };
  }

  /* pre-aquecimento: a luz dos efeitos entra na cena JA no carregamento (nunca mais muda o numero de luzes) e cada efeito e criado uma vez e compilado antes de aparecer na tela.
     sem isso, a 1a skill compilava de 10 a 13 shaders de uma vez (travada de centenas de ms) e cada efeito novo compilava o seu na hora de aparecer. Chamado pelo Guardiao.init. */
  var sentinelas = [];
  function iniciarLuz(){ try { var sc = scene(); if(sc && !lightInit){ sc.add(light); lightInit = true; } } catch(e){} }
  function aquecer(extra){
    iniciarLuz(); if(!ctx.compile) return; var antes = list.length, o0 = { life: .02 };
    var T = [function(){ espetos(0, 0, 0, o0); }, function(){ casca(0, 0, 0, { r0: 1, r1: 1, h0: 1, h1: 1, life: .02 }); }, function(){ anel(0, 0, o0); }, function(){ disco(0, 0, 0, o0); },
      function(){ rachaduras(0, 0, { R: 2, life: .02 }); }, function(){ cratera(0, 0, { R: 1, life: .02 }); }, function(){ rochas(0, 0, { n: 1 }); }, function(){ brasas(0, 0, 0, { n: 1, life: .02 }); },
      function(){ humo(0, 0, { n: 1 }); }, function(){ cupula(0, 0, { r: 1, life: .02 }); }, function(){ runas(0, 0, { r: 1, life: .02 }); }, function(){ trilha(function(){ return new V3(0, 0, 0); }, o0); },
      function(){ correntes(0, 0, 0, o0); }, function(){ escudoFantasma(0, 0, o0); }, function(){ cunha(0, 0, 0, o0); }, function(){ domo({ getPos: function(){ return { x: 0, z: 0, face: 0 }; } }); }];
    T.forEach(function(f){ try { f(); } catch(e){} });
    try { escudoEnergia(0, 0, 0, { limpo: true, life: .02 }); } catch(e){}
    try { if(extra) extra(); } catch(e){ console.warn('aquecer (extra):', e); }
    for(var j = antes; j < list.length; j++) if(list[j].obj) list[j].obj.visible = true;               /* efeitos com atraso (lag) nascem invisiveis e o three.js so compila o que esta visivel */
    try { ctx.compile(); } catch(e){}
    for(var i = list.length - 1; i >= antes; i--){ var e = list[i]; if(e.obj){ try { scene().remove(e.obj); sentinelas.push(e.obj); } catch(x){} } list.splice(i, 1); }      /* ninguem chegou a ser desenhado: sai da cena SEM dispose: o three.js destroi o programa do shader quando o ultimo material dele e descartado; estas instancias ficam vivas (fora da cena) so para manter os programas compilados */
  }
  iniciarLuz();

  return { escudoVoo: escudoVoo, aquecer: aquecer, domo: domo, feixe: feixe, escudoCarga: escudoCarga, escudoEnergia: escudoEnergia, cunha: cunha, update: update, add: add, espetos: espetos, casca: casca, anel: anel, disco: disco, rachaduras: rachaduras, cratera: cratera, rochas: rochas, brasas: brasas, humo: humo,
           cupula: cupula, runas: runas, trilha: trilha, seguir: seguir, espetosGirando: espetosGirando, correntes: correntes, escudoFantasma: escudoFantasma, luz: luz, rnd: rnd, rr: rr, seeded: seeded };
}
/* <<< CLAUDE [guardiao] */
