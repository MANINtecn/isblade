/* [pagina-unica] 09/11/2026: Cruma, Fortaleza e Pantano dentro do mundo aberto da cidade (sem trocar de pagina nem de conexao).
   Cada mapa fica no lugar dele no mapa-mundi (MundoCampo.dados.mapas: pos + rotY, a rotacao Y do jogo): mundo = R(rotY) * local + pos.
   Carrega por proximidade (modelo + walkgrid) e solta quando o jogador se afasta. Chao em camadas e colisao = mesmo walkgrid do torre.js.
   Uso: MapaVivo.init(THREE, scene, { baixa });  MapaVivo.tick(x, z)  (todo quadro, barato);
        MapaVivo.chao(x, z, y) -> altura do chao do mapa perto de y (null = fora dos mapas carregados);
        MapaVivo.bloq(x0, z0, x1, z1, y) -> null (nao esta num mapa: vale o terreno) | true (parede/borda) | false (livre);
        MapaVivo.pronto(id);  MapaVivo.spawn(id) -> [x, z, y] no mundo;  MapaVivo.CFG (nome por id). */
window.MapaVivo = (function(){
  var V = { mapas: {} }, THREE = null, scene = null, opt = {};
  var CFG = V.CFG = {
    curuma:   { pasta: 'curuma',        glb: 'curuma.glb',        grid: 'curuma_walkgrid',        chaoMin: -222.9, nome: 'Torre de Cruma',     niveis: '1-15',  spawn: [-50, 12, -195], regiao: 1 },
    fortress: { pasta: 'fortress',      glb: 'fortress.glb',      grid: 'fortress_walkgrid',      chaoMin: -36.4,  nome: 'Fortaleza',          niveis: '15-30', spawn: [0, 27, 3.5],    regiao: 2 },
    pantano:  { pasta: 'blazing_swamp', glb: 'blazing_swamp.glb', grid: 'blazing_swamp_walkgrid', chaoMin: -30.8,  nome: 'Pantano Flamejante', niveis: '30-45', spawn: [14.9, -43.9, 3.7], regiao: 3 }
  };
  var ALTURA = 2.0, RAIO = .5, PASSO = 1.04;
  var OFF = [[0, 0], [RAIO, 0], [-RAIO, 0], [0, RAIO], [0, -RAIO]];
  var PTS = [[0, 0], [RAIO, 0], [-RAIO, 0], [0, RAIO], [0, -RAIO], [RAIO * .7, RAIO * .7], [-RAIO * .7, RAIO * .7], [RAIO * .7, -RAIO * .7], [-RAIO * .7, -RAIO * .7]];

  function local(M, x, z){ var dx = x - M.X.x, dz = z - M.X.z; return [dx * M.X.c - dz * M.X.s, dx * M.X.s + dz * M.X.c]; }
  function mundo(M, x, z){ return [x * M.X.c + z * M.X.s + M.X.x, -x * M.X.s + z * M.X.c + M.X.z]; }
  /* walkgrid (mesmo formato do torre.js): camadas de chao por celula */
  function camadas(M, ix, iz){
    var G = M.G; if(ix < 0 || iz < 0 || ix >= G.n || iz >= G.n) return null;
    var i = iz * G.n + ix, a = M.offs[i], b = M.offs[i + 1], out = [];
    for(var k = a; k < b; k++){ var p = G.base + G.stride * k; out.push({ h: M.dv.getInt16(p, true) / G.hs, l: M.dv.getUint8(p + 2) / G.ls, m: M.dv.getUint8(p + 3) }); }
    return out;
  }
  function celula(M, x, z){ return [Math.floor((x - M.G.x0) / M.G.cel), Math.floor((-z - M.G.y0) / M.G.cel)]; }
  function sonda(M, x, z, y){
    var c = celula(M, x, z), L = camadas(M, c[0], c[1]); if(!L) return { chao: null, bloq: true };
    var melhor = null, bloq = false;
    for(var i = 0; i < L.length; i++){
      var q = L[i];
      if(q.h < M.C.chaoMin){ if(q.h > y - 3) bloq = true; continue; }
      if(q.h > y + PASSO){ if(q.h < y + ALTURA) bloq = true; continue; }
      if(q.l >= ALTURA){ if(melhor === null || q.h > melhor) melhor = q.h; } else if(q.h > y - .35) bloq = true;
    }
    return { chao: melhor, bloq: bloq };
  }
  function camadaDe(M, ix, iz, y){ var L = camadas(M, ix, iz); if(!L) return null; var b = null; for(var i = 0; i < L.length; i++){ if(L[i].h <= y + PASSO && (b === null || L[i].h > b.h)) b = L[i]; } return b; }
  function arestaBloq(M, x0, z0, x1, z1, y){
    var a = celula(M, x0, z0), b = celula(M, x1, z1); if(a[0] === b[0] && a[1] === b[1]) return false;
    if(a[0] !== b[0]){ var q = camadaDe(M, Math.min(a[0], b[0]), a[1], y); if(q && (q.m & 1)) return true; }
    if(a[1] !== b[1]){ var q2 = camadaDe(M, a[0], Math.min(a[1], b[1]), y); if(q2 && (q2.m & 2)) return true; }
    return false;
  }
  function cruza(M, x0, z0, x1, z1, y){ for(var i = 0; i < OFF.length; i++){ if(arestaBloq(M, x0 + OFF[i][0], z0 + OFF[i][1], x1 + OFF[i][0], z1 + OFF[i][1], y)) return true; } return false; }
  function livre(M, x, z, y){ for(var i = 0; i < PTS.length; i++){ if(sonda(M, x + PTS[i][0], z + PTS[i][1], y).bloq) return false; } return true; }
  /* chao local perto de y: sobe ate PASSO, desce ate 3 m; longe = a camada mais alta abaixo (queda) */
  function chaoLocal(M, x, z, y){
    var c = celula(M, x, z), L = camadas(M, c[0], c[1]); if(!L) return null; var b = null, baixo = null, perto = null;
    for(var i = 0; i < L.length; i++){ var h = L[i].h; if(h < M.C.chaoMin + .3 || L[i].l < ALTURA) continue;
      if(h <= y + PASSO && h >= y - 3 && (b === null || h > b)) b = h;
      if(h <= y + PASSO && (baixo === null || h > baixo)) baixo = h;
      if(Math.abs(h - y) <= 2.5 && (perto === null || Math.abs(h - y) < Math.abs(perto - y))) perto = h; }      /* emenda terreno/mapa: o chao do mapa pode ficar um pouco acima do terreno */
    return b !== null ? b : (perto !== null ? perto : baixo);
  }

  function carrega(M){
    M.estado = 1; var base = 'assets/maps/' + M.C.pasta + '/', C = M.C;
    fetch(base + C.grid + '.json', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(j){
      var v = '?v=' + (j.versao || 0);
      return fetch(base + C.grid + '.bin' + v).then(function(r){ return r.arrayBuffer(); }).then(function(bin){
        M.G = { n: j.n, cel: j.celula, x0: j.x0, y0: j.y0, hs: j.altura_escala, ls: j.livre_escala, base: 4 * (j.n * j.n + 1), stride: j.bytes_por_camada || 3 };
        M.offs = new Uint32Array(bin, 0, j.n * j.n + 1); M.dv = new DataView(bin);
        return new Promise(function(ok, falha){
          new THREE.GLTFLoader().load(base + C.glb + v, function(g){
            if(M.estado !== 1){ libera(g.scene); return ok(); }                    /* desistiu (o jogador se afastou) */
            g.scene.traverse(function(o){ if(o.isMesh){ o.castShadow = false; o.receiveShadow = !opt.baixa; (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ m.side = THREE.DoubleSide; }); } });
            var gr = new THREE.Group(); gr.add(g.scene); gr.position.set(M.X.x, M.X.y, M.X.z); gr.rotation.y = M.X.r; gr.name = 'MAPA_' + M.id;
            scene.add(gr); gr.updateMatrixWorld(true); gr.traverse(function(o){ o.matrixAutoUpdate = false; });
            M.grupo = gr; M.estado = 2; ok();
          }, undefined, falha);
        });
      });
    }).catch(function(e){ console.warn('[mapa-vivo] ' + M.id, e); M.estado = 0; M.erroT = performance.now(); });
  }
  function libera(o){
    o.traverse(function(n){ if(n.geometry) n.geometry.dispose(); if(n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(function(m){ for(var k in m){ if(m[k] && m[k].isTexture) m[k].dispose(); } m.dispose(); }); });
  }
  function solta(M){
    if(M.grupo){ scene.remove(M.grupo); libera(M.grupo); M.grupo = null; }
    M.G = null; M.offs = null; M.dv = null; M.estado = 0;
  }
  V.init = function(T, sc, o){
    THREE = T; scene = sc; opt = o || {}; var D = window.MundoCampo && MundoCampo.dados; if(!D || !D.mapas) return false;
    Object.keys(CFG).forEach(function(id){
      var P = D.mapas[id]; if(!P) return; var C = CFG[id];
      var M = V.mapas[id] = { id: id, C: C, estado: 0, X: { x: P.pos[0], y: P.pos[1], z: P.pos[2], r: P.rotY, c: Math.cos(P.rotY), s: Math.sin(P.rotY) } };
      M.centro = mundo(M, C.spawn[0], C.spawn[1]);
    });
    V.on = true; return true;
  };
  /* carrega perto (entrada do mapa a ate PERTO m), solta longe; nunca dois carregando juntos (celular) */
  V.tick = function(x, z){
    if(!V.on) return; var perto = opt.baixa ? 260 : 380, longe = perto + 140, ocupado = false, now = performance.now();
    for(var id in V.mapas) if(V.mapas[id].estado === 1) ocupado = true;
    for(var id2 in V.mapas){
      var M = V.mapas[id2], d = Math.hypot(x - M.centro[0], z - M.centro[1]);
      if(M.estado === 0 && d < perto && !ocupado && !(M.erroT && now - M.erroT < 15000)){ carrega(M); ocupado = true; }
      else if(M.estado === 2 && d > longe) solta(M);
      else if(M.estado === 1 && d > longe + 100) M.estado = 0;                 /* o carregamento em curso e descartado no fim */
    }
  };
  V.pronto = function(id){ var M = V.mapas[id]; return !!(M && M.estado === 2); };
  V.porRegiao = function(r){ for(var id in CFG) if(CFG[id].regiao === r) return id; return null; };
  V.chao = function(x, z, y){
    var best = null;
    for(var id in V.mapas){
      var M = V.mapas[id]; if(M.estado !== 2) continue;
      var l = local(M, x, z), h = chaoLocal(M, l[0], l[1], (y === undefined ? 1e4 : y) - M.X.y);
      if(h !== null){ h += M.X.y; if(best === null || (y !== undefined ? Math.abs(h - y) < Math.abs(best - y) : h > best)) best = h; }
    }
    return best;
  };
  /* movimento do jogador de (x0,z0) para (x1,z1) na altura y: so vale quando o destino tem chao de um mapa carregado */
  V.bloq = function(x0, z0, x1, z1, y){
    for(var id in V.mapas){
      var M = V.mapas[id]; if(M.estado !== 2) continue;
      var b = local(M, x1, z1), yl = y - M.X.y, h = chaoLocal(M, b[0], b[1], yl);
      if(h === null || Math.abs(h - yl) > 3.5) continue;
      var a = local(M, x0, z0);
      return !(livre(M, b[0], b[1], h) && !cruza(M, a[0], a[1], b[0], b[1], Math.min(yl, h + PASSO)));
    }
    return null;
  };
  V.spawn = function(id){ var M = V.mapas[id]; if(!M) return null; var p = mundo(M, M.C.spawn[0], M.C.spawn[1]); return [p[0], p[1], M.C.spawn[2] + M.X.y]; };
  V.estado = function(){ var o = {}; for(var id in V.mapas) o[id] = V.mapas[id].estado; return o; };
  return V;
})();
