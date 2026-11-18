/* Visibilidade das skills dos OUTROS jogadores (18/11/2026).
   1) aviso(): marca no chao, por ~0,5 s, a area que a skill de um inimigo vai acertar (faixa, cone ou losango), para dar tempo de esquivar/bloquear mesmo quando o efeito
      bonito atrasa, e para o celular (efeito reduzido) nao perder a leitura do golpe. Pool fixo de 8 marcas (sem alocar nada na hora do golpe), formas angulares, aditivo, 1 textura cada.
   2) cota(): limite de efeitos completos de skill de outros por janela de 0,4 s (celular: 2; PC: 5). O aviso do chao e' SEMPRE mostrado; so o enfeite e' cortado.
   Uso: RemoteVis.init(THREE, scene, alturaDoChao(x,z)?)  ->  RemoteVis.aviso(e, sk, f) / RemoteVis.cota() */
(function(){
  var T, cena, alt = null, pool = [], i0 = 0, tex = {}, geo = null, geoC = null, janela = 0, usados = 0;
  var COR = 0xff5a3a, DUR = .55;
  function touch(){ return !!(window.QUAL && (QUAL.touch || QUAL.nivel === 'baixa')); }
  function canvasTex(desenha){
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'); desenha(g); var t = new T.CanvasTexture(c); t.needsUpdate = true; return t;
  }
  function criaTexturas(){
    /* faixa (retangulo) e cone (triangulo) apontam para +Z do plano; losango = area em volta do lutador. Bordas retas, miolo mais fraco que a borda (le-se o contorno) */
    tex.faixa = canvasTex(function(g){ var d = g.createLinearGradient(0, 0, 0, 128); d.addColorStop(0, 'rgba(255,255,255,.95)'); d.addColorStop(.5, 'rgba(255,255,255,.28)'); d.addColorStop(1, 'rgba(255,255,255,.1)'); g.fillStyle = d; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122); });
    tex.cone = canvasTex(function(g){ var d = g.createLinearGradient(0, 128, 0, 0); d.addColorStop(0, 'rgba(255,255,255,.08)'); d.addColorStop(1, 'rgba(255,255,255,.95)'); g.fillStyle = d; g.beginPath(); g.moveTo(64, 2); g.lineTo(126, 126); g.lineTo(2, 126); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke(); });
    tex.losango = canvasTex(function(g){ var d = g.createRadialGradient(64, 64, 4, 64, 64, 64); d.addColorStop(0, 'rgba(255,255,255,.08)'); d.addColorStop(.8, 'rgba(255,255,255,.45)'); d.addColorStop(1, 'rgba(255,255,255,.95)'); g.fillStyle = d; g.beginPath(); g.moveTo(64, 2); g.lineTo(126, 64); g.lineTo(64, 126); g.lineTo(2, 64); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke(); });
  }
  function init(THREE_, cena_, altFn){
    if(T) return; T = THREE_; cena = cena_; alt = altFn || null; criaTexturas();
    geo = new T.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, .5);      /* plano deitado, base na origem e ponta em +Z */
    geoC = new T.PlaneGeometry(1, 1); geoC.rotateX(-Math.PI / 2);      /* mesmo plano, centrado (area em volta do lutador) */
    for(var i = 0; i < 8; i++){
      var m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: COR, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      m.visible = false; m.frustumCulled = false; m.renderOrder = 4; m.userData = { t: 1, dur: DUR }; cena.add(m); pool.push(m);
    }
  }
  function marca(x, z, f, comp, larg, forma, centrado){
    var m = pool[i0++ % pool.length], y = (alt ? alt(x, z) : 0) + .09;
    m.geometry = centrado ? geoC : geo; m.material.map = tex[forma]; m.material.needsUpdate = true;
    m.position.set(x, y, z); m.rotation.set(0, f, 0); m.scale.set(larg, 1, comp);
    m.userData.t = 0; m.visible = true; m.material.opacity = .6;
  }
  /* e = jogador remoto (x, z, team, arma), sk = skill (range, half, suporte, proj, area), f = direcao do golpe */
  function aviso(e, sk, f){
    if(!T || !sk || sk.suporte || sk.proj || sk.area) return;
    if(window.Net && Net.hostil && !Net.hostil(e)) return;      /* aliado/grupo/mesmo time: sem marca */
    var r = +sk.range || 0, h = +sk.half || 0; if(r < .5) return;
    if(h >= 3){ var d = r * 2; marca(e.x, e.z, Math.PI / 4, d * .72, d * .72, 'losango', true); return; }      /* area em volta do lutador: losango (quadrado girado) */
    var larg = Math.max(1.2, Math.min(r * 2 * Math.tan(Math.min(h, 1.4)), r * 2.2));
    marca(e.x, e.z, f, r, larg, h < .5 ? 'faixa' : 'cone', false);
  }
  function tick(dt){
    for(var i = 0; i < pool.length; i++){
      var m = pool[i]; if(!m.visible) continue;
      m.userData.t += dt / DUR; var u = m.userData.t;
      if(u >= 1){ m.visible = false; m.material.opacity = 0; continue; }
      m.material.opacity = .6 * (1 - u * u);
    }
  }
  function cota(){
    var agora = performance.now(); if(agora - janela > 400){ janela = agora; usados = 0; }
    usados++; return usados <= (touch() ? 2 : 5);
  }
  /* o aquecimento das skills dispara efeitos: os do Guerreiro nascem NA POSICAO DO JOGADOR (usam S.px/ponta da espada), os das outras armas em (-3000,-3000). Alguns (rochas, fissuras, marcas)
     nascem com atraso e nao somem sozinhos. Varre por ~8 s essas duas areas e tira da cena SO o que nao existia antes (antes = conjunto dos filhos da cena no inicio) e e' malha/sprite/pontos
     sem esqueleto (jogadores sao Group, nunca entram). */
  function limpaAquecimento(cena_, antes, cx, cz){
    var n = 0, iv = setInterval(function(){
      n++; cena_.children.slice().forEach(function(o){
        if(antes && antes.has(o)) return;
        if(!(o.isMesh || o.isSprite || o.isPoints) || o.isSkinnedMesh) return;
        var x = o.position.x, z = o.position.z;
        if((Math.abs(x + 3000) < 300 && Math.abs(z + 3000) < 300) || (Math.abs(x - cx) < 30 && Math.abs(z - cz) < 30)) cena_.remove(o);
      });
      if(n > 32) clearInterval(iv);
    }, 250);
  }
  window.RemoteVis = { init: init, aviso: aviso, tick: tick, cota: cota, limpaAquecimento: limpaAquecimento };
})();
