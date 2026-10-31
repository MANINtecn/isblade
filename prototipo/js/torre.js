/* Torre do Baium (Mini Toi): mapa de 3 andares para a arena.
   O jogo assume chao plano em y=0, entao em vez de subir o jogador movemos o MAPA na vertical (grupo em y = -altura do jogador).
   Colisao: mapa de chao andavel gerado do Blender (assets/maps/baium_house/mini_toi_walkgrid.*): camadas de chao por celula,
   espaco livre acima e arestas bloqueadas (paredes finas). Coordenadas do jogo = as do mapa (pedestal do chefe em 0,0). */
export const Torre = (function(){
  var T = { andarInicial: 2, on: false, pronto: false, y: -62, vy: 0, chao: true, baseY: -62, altura: 0, lx: 0, lz: 0, bx: 0, bz: 0, andares: [{ n: 1, y: -62.0 }, { n: 2, y: -33.8 }, { n: 3, y: -3.8 }] };
  var REG = null, PORTA = { aberta: false, abrindo: false, liberada: true, t: 0, nos: [], y0: [], H: 11 };
  var ALTURA = 2.0, RAIO = .5, PASSO = 1.04, GRAV = 34, PULO = 12, G = null, offs = null, dv = null, grupo = null, t0 = 0;

  function camadas(ix, iz){
    if(ix < 0 || iz < 0 || ix >= G.n || iz >= G.n) return null;
    var i = iz * G.n + ix, a = offs[i], b = offs[i + 1], out = [];
    for(var k = a; k < b; k++){ var p = G.base + G.stride * k; out.push({ h: dv.getInt16(p, true) / G.hs, l: dv.getUint8(p + 2) / G.ls, m: dv.getUint8(p + 3) }); }
    return out;
  }
  function celula(x, z){ return [Math.floor((x - G.x0) / G.cel), Math.floor((-z - G.y0) / G.cel)]; }
  function sonda(x, z, y){
    var c = celula(x, z), L = camadas(c[0], c[1]);
    if(!L) return { chao: null, bloq: true };
    var melhor = null, bloq = false;
    for(var i = 0; i < L.length; i++){
      var q = L[i];
      if(q.h > y + PASSO){ if(q.h < y + ALTURA) bloq = true; continue; }
      if(q.l >= ALTURA){ if(melhor === null || q.h > melhor) melhor = q.h; } else if(q.h > y - .35) bloq = true;
    }
    return { chao: melhor, bloq: bloq };
  }
  function camadaDe(ix, iz, y){ var L = camadas(ix, iz); if(!L) return null; var b = null; for(var i = 0; i < L.length; i++){ if(L[i].h <= y + PASSO && (b === null || L[i].h > b.h)) b = L[i]; } return b; }
  function arestaBloq(x0, z0, x1, z1, y){
    var a = celula(x0, z0), b = celula(x1, z1); if(a[0] === b[0] && a[1] === b[1]) return false;
    if(a[0] !== b[0]){ var q = camadaDe(Math.min(a[0], b[0]), a[1], y); if(q && (q.m & 1)) return true; }
    if(a[1] !== b[1]){ var q2 = camadaDe(a[0], Math.min(a[1], b[1]), y); if(q2 && (q2.m & 2)) return true; }
    return false;
  }
  var OFF = [[0, 0], [RAIO, 0], [-RAIO, 0], [0, RAIO], [0, -RAIO]];
  function cruza(x0, z0, x1, z1, y){ for(var i = 0; i < OFF.length; i++){ if(arestaBloq(x0 + OFF[i][0], z0 + OFF[i][1], x1 + OFF[i][0], z1 + OFF[i][1], y)) return true; } return false; }
  /* poligono convexo (qualquer sentido): distancia interna ao pior lado; >= -m = dentro (margem m) */
  function dentro(poly, x, z, m){
    var n = poly.length, area = 0, i, j;
    for(i = 0; i < n; i++){ j = (i + 1) % n; area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; }
    var sg = area >= 0 ? 1 : -1;
    for(i = 0; i < n; i++){
      j = (i + 1) % n; var ex = poly[j][0] - poly[i][0], ez = poly[j][1] - poly[i][1], l = Math.hypot(ex, ez) || 1;
      if(sg * (ex * (z - poly[i][1]) - ez * (x - poly[i][0])) / l < -m) return false;
    }
    return true;
  }
  /* empurra um ponto para dentro do poligono, com folga m */
  function prender(poly, x, z, m){
    var n = poly.length, area = 0, i, j, k;
    for(i = 0; i < n; i++){ j = (i + 1) % n; area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; }
    var sg = area >= 0 ? 1 : -1;
    for(k = 0; k < 4; k++) for(i = 0; i < n; i++){
      j = (i + 1) % n; var ex = poly[j][0] - poly[i][0], ez = poly[j][1] - poly[i][1], l = Math.hypot(ex, ez) || 1;
      var d = sg * (ex * (z - poly[i][1]) - ez * (x - poly[i][0])) / l;
      if(d < m){ var nx = -sg * ez / l, nz = sg * ex / l; x += nx * (m - d); z += nz * (m - d); }
    }
    return [x, z];
  }
  function pontoLivre(x, z, y){
    if(!PORTA.aberta && REG && y > -12 && dentro(REG.porta_entrada.poligono, x, z, .35)) return false;      /* porta de entrada do Baium fechada */
    var pts = [[0, 0], [RAIO, 0], [-RAIO, 0], [0, RAIO], [0, -RAIO], [RAIO * .7, RAIO * .7], [-RAIO * .7, RAIO * .7], [RAIO * .7, -RAIO * .7], [-RAIO * .7, -RAIO * .7]];
    for(var i = 0; i < pts.length; i++){ if(sonda(x + pts[i][0], z + pts[i][1], y).bloq) return false; }
    return true;
  }
  /* ponto de nascimento de um andar: o ponto livre mais proximo do centro da torre, com 2 un de folga em volta */
  function achaSpawn(yAndar){
    var cx = -27.05, cz = -50.71;
    for(var r = 0; r < 70; r++){
      var n = r ? Math.ceil(r * 6.3) : 1;
      for(var a = 0; a < n; a++){
        var ang = r ? a / n * 6.283 : 0, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r, ok = true;
        for(var k = 0; k < 9 && ok; k++){ var q = sonda(x + (k % 3 - 1) * 2, z + (Math.floor(k / 3) - 1) * 2, yAndar + .6); if(q.bloq || q.chao === null || Math.abs(q.chao - yAndar) > .7) ok = false; }
        if(ok) return [x, z];
      }
    }
    return [cx, cz];
  }

  T.carregar = function(THREE, scene, base){
    base = base || 'assets/maps/baium_house/';
    /* o service worker guarda .glb/.bin pela URL (cache primeiro): o json (sempre da rede) traz a versao e entra na URL dos arquivos pesados */
    return fetch(base + 'mini_toi_walkgrid.json', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(j){
      var v = '?v=' + (j.versao || 0);
      return Promise.all([fetch(base + 'mini_toi_walkgrid.bin' + v).then(function(r){ return r.arrayBuffer(); }), fetch(base + 'mini_toi_regioes.json' + v).then(function(r){ return r.json(); }).catch(function(){ return null; })]).then(function(q){ REG = q[1]; if(REG && REG.arena){ var A = REG.arena; A.poligono = []; for(var i = 0; i < 48; i++){ var an = i / 48 * Math.PI * 2; A.poligono.push([A.centro[0] + Math.cos(an) * A.raio, A.centro[1] + Math.sin(an) * A.raio]); } } return [j, q[0], v]; });
    }).then(function(r){
      var j = r[0], bin = r[1], VER = r[2];
      G = { n: j.n, cel: j.celula, x0: j.x0, y0: j.y0, hs: j.altura_escala, ls: j.livre_escala, base: 4 * (j.n * j.n + 1), stride: j.bytes_por_camada || 3 };
      offs = new Uint32Array(bin, 0, j.n * j.n + 1); dv = new DataView(bin);
      T.andares.forEach(function(f){ var s = achaSpawn(f.y); f.sx = s[0]; f.sz = s[1]; });
      return new Promise(function(ok, falha){
        new THREE.GLTFLoader().load(base + 'mini_toi.glb' + VER, function(g){
          g.scene.traverse(function(o){ if(o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ m.side = THREE.DoubleSide; }); });
          grupo = new THREE.Group(); grupo.add(g.scene); grupo.visible = false; scene.add(grupo); T.grupo = grupo; T.pronto = true;
          if(REG){ PORTA.nos = []; PORTA.y0 = []; REG.porta_entrada.objetos.forEach(function(n){ var o = grupo.getObjectByName(n); if(o){ PORTA.nos.push(o); PORTA.y0.push(o.position.y); } }); PORTA.H = REG.porta_entrada.z_max - REG.porta_entrada.z_min + .6; }
          ok(T);
        }, undefined, falha);
      });
    });
  };
  T.andarAtual = function(){ var m = 0, d = 1e9; T.andares.forEach(function(f, i){ var q = Math.abs(T.y - f.y); if(q < d){ d = q; m = i; } }); return d < 8 ? T.andares[m].n : 0; };
  T.porta = PORTA;
  /* o Baium so luta quando o jogador esta DENTRO do salao (ou colado nele, ate 1,5 un); aparece no 3o andar assim que a porta abre */
  function areaChefe(){ return REG.arena ? REG.arena.poligono : REG.salao.poligono; }      /* onde o Baium luta: o circulo gigante do 3o andar (REG.arena) */
  T.noSalao = function(m){ return !!REG && T.andarAtual() === 3 && dentro(areaChefe(), T.lx, T.lz, m); };
  T.chefeAtivo = function(){ return T.noSalao(1.5); };
  T.chefeVisivel = function(){ return T.andarAtual() === 3 && (PORTA.aberta || PORTA.abrindo || T.noSalao(1.5)); };
  T.pertoDaPorta = function(){ if(!REG || PORTA.aberta || PORTA.abrindo || T.andarAtual() !== 3) return false; var c = REG.porta_entrada.centro; return Math.hypot(T.lx - c[0], T.lz - c[1]) <= (REG.arena ? REG.arena.gatilho : 9); };
  T.abrirPorta = function(){ if(PORTA.aberta || PORTA.abrindo) return false; PORTA.abrindo = true; PORTA.t = 0; return true; };
  /* ---- DG: mobs ficam no andar da masmorra e nao atravessam paredes/porta ---- */
  function livre9(x, z, y){ for(var k = 0; k < 9; k++){ var q = sonda(x + (k % 3 - 1) * 1.2, z + (Math.floor(k / 3) - 1) * 1.2, y + .6); if(q.bloq || q.chao === null || Math.abs(q.chao - y) > .8) return false; } return true; }
  T.pontoAleatorio = function(andar, rmin, rmax){
    var f = T.andares[andar - 1];
    for(var t = 0; t < 200; t++){
      var a = Math.random() * 6.283, r = rmin + Math.random() * (rmax - rmin), x = f.sx + Math.cos(a) * r, z = f.sz + Math.sin(a) * r;
      if(livre9(x, z, f.y)) return [x, z];
    }
    return [f.sx, f.sz];
  };
  T.mob = function(m){
    var y = T.andares[(T.andarDG || 1) - 1].y;
    if(m.lx === undefined){ m.lx = m.x; m.lz = m.z; }
    var q = sonda(m.x, m.z, y + .6);
    if(!q.bloq && q.chao !== null && Math.abs(q.chao - y) < 1.5 && pontoLivre(m.x, m.z, y + .6)){ m.lx = m.x; m.lz = m.z; } else { m.x = m.lx; m.z = m.lz; }
  };
  T.pontoPortal = function(andar){ var f = T.andares[andar - 1]; return T.pontoAleatorio(andar, 5, 9); };
  T.liberarPorta = function(v){ PORTA.liberada = v !== false; };
  T.fecharPorta = function(){ PORTA.aberta = false; PORTA.abrindo = false; PORTA.t = 0; PORTA.nos.forEach(function(o, i){ o.position.y = PORTA.y0[i]; }); };
  T.nasce = function(S, andar){
    var f = T.andares[(andar || T.andarInicial) - 1]; S.px = f.sx; S.pz = f.sz; S.vx = 0; S.vz = 0; T.lx = f.sx; T.lz = f.sz; T.y = f.y + .3; T.vy = 0; T.chao = false; T.baseY = T.y; T.altura = 0; grupo.position.y = -T.baseY;
  };
  /* PvP: coloca o jogador num ponto do andar (x,z do mapa) sem mexer na porta */
  T.teleporta = function(S, x, z, andar){ var f = T.andares[(andar || 3) - 1]; S.px = x; S.pz = z; S.vx = 0; S.vz = 0; T.lx = x; T.lz = z; T.y = f.y + .3; T.vy = 0; T.chao = false; T.baseY = T.y; T.altura = 0; grupo.position.y = -T.baseY; };
  /* neblina: a da arena (22..62) apagava paredes e muros da torre; dentro dela fica longe (escuro so la fora, no vazio) */
  var neb0 = null;
  function neblina(on){ var fg = scene.fog; if(!fg) return; if(on){ if(!neb0) neb0 = [fg.near, fg.far]; fg.near = 75; fg.far = 195; } else if(neb0){ fg.near = neb0[0]; fg.far = neb0[1]; neb0 = null; } }
  T.ativar = function(S, andar){ if(!T.pronto) return false; T.on = true; neblina(true); grupo.visible = true; t0 = performance.now(); T.andarDG = andar || T.andarInicial; T.nasce(S, andar || T.andarInicial); return true; };   /* como no L2: os andares de baixo ficam de fora e todo mundo comeca na rampa do Baium (2o andar) */
  T.desativar = function(){ T.on = false; neblina(false); if(grupo) grupo.visible = false; };
  /* chamado todo quadro depois do movimento do jogador (dentro de separate()) */
  T.depois = function(S){
    var now = performance.now(), dt = Math.min(.05, Math.max(.001, (now - t0) / 1000)); t0 = now;
    var x1 = S.px, z1 = S.pz, y = T.y;
    if(!(pontoLivre(x1, z1, y) && !cruza(T.lx, T.lz, x1, z1, y))){
      if(pontoLivre(x1, T.lz, y) && !cruza(T.lx, T.lz, x1, T.lz, y)) { S.pz = T.lz; S.vz = 0; }
      else if(pontoLivre(T.lx, z1, y) && !cruza(T.lx, T.lz, T.lx, z1, y)) { S.px = T.lx; S.vx = 0; }
      else { S.px = T.lx; S.pz = T.lz; S.vx = 0; S.vz = 0; }
    }
    T.lx = S.px; T.lz = S.pz;
    var ch = sonda(S.px, S.pz, T.y).chao;
    if(ch !== null && T.vy <= 0 && T.y <= ch + .08){ if(ch > T.y) T.y += Math.min(ch - T.y, dt * 20 + .2); else T.y = ch; if(T.y >= ch - .01){ T.y = ch; T.vy = 0; T.chao = true; } }
    else { T.chao = false; T.vy -= GRAV * dt; T.y += T.vy * dt; if(ch !== null && T.vy <= 0 && T.y <= ch){ T.y = ch; T.vy = 0; T.chao = true; } }
    if(T.y < -130) T.nasce(S, T.andarInicial);
    /* o mapa acompanha o chao (suavizado nos degraus); o que sobra e a altura do pulo: o jogador sobe de verdade, a camera acompanha */
    if(T.chao) T.baseY += (T.y - T.baseY) * Math.min(1, dt * 12); else if(T.y < T.baseY) T.baseY = T.y;
    T.altura = Math.max(0, T.y - T.baseY);
    grupo.position.y = -T.baseY;
    if(PORTA.abrindo){                                   /* as folhas descem para dentro do piso */
      PORTA.t = Math.min(1, PORTA.t + dt / 1.8); var e = PORTA.t * PORTA.t * (3 - 2 * PORTA.t);
      PORTA.nos.forEach(function(o, i){ o.position.y = PORTA.y0[i] - e * PORTA.H; });
      if(PORTA.t >= 1){ PORTA.abrindo = false; PORTA.aberta = true; }
    }
  };
  T.pular = function(){ if(!T.on || !T.chao) return false; T.vy = PULO; T.chao = false; return true; };
  /* o chefe fica no andar 3: se tentar sair do chao livre, volta para o ultimo ponto valido */
  T.chefe = function(S){
    if(REG){ var p = prender(areaChefe(), S.ex, S.ez, 1.2); S.ex = p[0]; S.ez = p[1]; T.bx = S.ex; T.bz = S.ez; return; }      /* o Baium nunca sai do salao */
    var y = T.andares[2].y + .6;
    if(pontoLivre(S.ex, S.ez, y) && sonda(S.ex, S.ez, y).chao !== null){ T.bx = S.ex; T.bz = S.ez; } else { S.ex = T.bx; S.ez = T.bz; }
  };
  T.posChefe = function(){ if(REG){ var c = REG.arena ? REG.arena.spawn : REG.salao.centro; T.bx = c[0]; T.bz = c[1]; return [c[0], c[1]]; } var f = T.andares[2]; T.bx = f.sx; T.bz = f.sz; return [f.sx, f.sz]; };
  T._dbg = { sonda: sonda, pontoLivre: pontoLivre, cruza: cruza, get G(){ return G; } };
  return T;
})();
