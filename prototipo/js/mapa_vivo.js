/* [pagina-unica] 09/11/2026: Cruma, Fortaleza e Pantano dentro do mundo aberto da cidade (sem trocar de pagina nem de conexao).
   Cada mapa fica no lugar dele no mapa-mundi (MundoCampo.dados.mapas: pos + rotY, a rotacao Y do jogo): mundo = R(rotY) * local + pos.
   Carrega por proximidade (fora da muralha, a 230 m da entrada; 170 no celular basico) (modelo + walkgrid) e solta quando o jogador se afasta. Chao em camadas e colisao = mesmo walkgrid do torre.js.
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
      if(h <= y + PASSO && h >= y - 6 && (baixo === null || h > baixo)) baixo = h;      /* queda curta; mais fundo que isso (subsolo da Cruma, buraco na grade) nao conta: vale o terreno */
      if(Math.abs(h - y) <= 2.5 && (perto === null || Math.abs(h - y) < Math.abs(perto - y))) perto = h; }      /* emenda terreno/mapa: o chao do mapa pode ficar um pouco acima do terreno */
    return b !== null ? b : (perto !== null ? perto : baixo);
  }

  /* [emenda] 10/11/2026: o terreno esculpido e o chao do mapa nao coincidem (desencontro tipico de 3,5 a 6 m): quando o chao do mapa ficava acima do terreno, o
     personagem andava ENTERRADO no terreno por baixo do mapa ("caiu num buraco"). Dentro de um mapa vale o chao do mapa ate TOL m de diferenca (sobe/desce ate ele);
     onde a coluna tem chao do mapa mas so mais longe que isso, a passagem e bloqueada (motivo 'estrutura') em vez de deixar andar enterrado. */
  var TOL = 6.5;
  function chaoProx(M, x, z, y){
    var c = celula(M, x, z), L = camadas(M, c[0], c[1]); if(!L) return { h: null, acima: false }; var b = null, bd = 1e9, up = 1e9;
    for(var i = 0; i < L.length; i++){ var h = L[i].h; if(h < M.C.chaoMin + .3 || L[i].l < ALTURA) continue; var d = Math.abs(h - y); if(d < bd){ bd = d; b = h; } if(h > y && h - y < up) up = h - y; }
    /* acima = o chao do mapa fica ACIMA do terreno entre TOL e 14 m (a superficie visivel e a dele: o personagem andaria enterrado). Chao mais alto que isso (sobre um
       penhasco) ou abaixo do terreno (colina por cima do mapa) nao conta: ali o terreno e o que se ve e se pisa */
    return { h: (b !== null && bd <= TOL) ? b : null, acima: up > TOL && up <= 14 };
  }
  /* [etapas] 10/11/2026 (dono: "quando vai carregar a outra parte do mapa trava"): o carregamento era um bloco so (baixar + ler o GLB + subir tudo para a placa
     de uma vez no primeiro quadro). Agora: 1) baixa os bytes de longe (so rede, nada na cena); 2) le o GLB perto; 3) sobe para a placa aos poucos, o mais
     perto do jogador primeiro, com limite de triangulos/texturas por quadro. A distancia e ate a BORDA DA REGIAO do mapa (antes era ate a entrada). */
  function lg(M, m){ if(window.__MV_LOG) console.log('[mapa-vivo] ' + M.id + ' ' + m + ' @' + Math.round(performance.now())); }
  function ab(r){ if(!r.ok) throw new Error('http ' + r.status + ' ' + r.url); return r.arrayBuffer(); }
  function baixa(M){
    if(M.bytes) return Promise.resolve(M.bytes);
    if(M.bpend) return M.bpend;
    var base = 'assets/maps/' + M.C.pasta + '/', C = M.C, t0 = performance.now(), tk = M.tok;
    M.bpend = fetch(base + C.grid + '.json', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(j){
      var v = '?v=' + (j.versao || 0), op = { priority: 'low' };
      return Promise.all([fetch(base + C.grid + '.bin' + v, op).then(ab), fetch(base + C.glb + v, op).then(ab)]).then(function(q){
        M.bpend = null; if(M.tok !== tk) return null;
        M.bytes = { j: j, bin: q[0], glb: q[1], v: v }; lg(M, 'baixou ' + Math.round(q[1].byteLength / 1e5) / 10 + ' MB em ' + Math.round(performance.now() - t0) + ' ms'); return M.bytes;
      });
    }).catch(function(e){ M.bpend = null; M.erroT = performance.now(); console.warn('[mapa-vivo] ' + M.id, e); return null; });
    return M.bpend;
  }
  function carrega(M){
    M.estado = 1; var tk = ++M.tok, base = 'assets/maps/' + M.C.pasta + '/';
    baixa(M).then(function(B){
      if(!B || M.tok !== tk || M.estado !== 1){ if(!B && M.tok === tk) M.estado = 0; return; }
      var j = B.j; M.G = { n: j.n, cel: j.celula, x0: j.x0, y0: j.y0, hs: j.altura_escala, ls: j.livre_escala, base: 4 * (j.n * j.n + 1), stride: j.bytes_por_camada || 3 };
      M.offs = new Uint32Array(B.bin, 0, j.n * j.n + 1); M.dv = new DataView(B.bin);
      var t0 = performance.now();
      new THREE.GLTFLoader().parse(B.glb, base, function(g){
        B.glb = null;                                                                     /* bytes do GLB nao precisam mais ficar na memoria */
        if(M.tok !== tk || M.estado !== 1){ libera(g.scene); return; }
        lg(M, 'leu o GLB em ' + Math.round(performance.now() - t0) + ' ms');
        var fila = [], vistos = new Map(), dup = 0, tot = 0;
        g.scene.traverse(function(o){ if(o.isMesh){ o.castShadow = false; o.receiveShadow = !opt.baixa; o.visible = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ m.side = THREE.DoubleSide; }); fila.push(o);
          /* o three cria UMA textura por referencia do GLB (mesma imagem usada em varios materiais = varias subidas para a placa); junta as repetidas */
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ MAPS_TEX.forEach(function(k){
            var t = m[k]; if(!t || !t.isTexture) return; tot++; var im = t.image || (t.source && t.source.data); if(!im) return; var L = vistos.get(im); if(!L){ vistos.set(im, [t]); return; }
            for(var q = 0; q < L.length; q++){ var u = L[q]; if(u === t){ dup++; return; } if(u.wrapS === t.wrapS && u.wrapT === t.wrapT && u.flipY === t.flipY && u.minFilter === t.minFilter && u.magFilter === t.magFilter && u.colorSpace === t.colorSpace && u.offset.equals(t.offset) && u.repeat.equals(t.repeat) && u.rotation === t.rotation){ m[k] = u; dup++; return; } }
            L.push(t); }); });
        } });
        lg(M, 'texturas: ' + tot + ' referencias, ' + dup + ' repetidas juntadas');
        var gr = new THREE.Group(); gr.add(g.scene); gr.position.set(M.X.x, M.X.y, M.X.z); gr.rotation.y = M.X.r; gr.name = 'MAPA_' + M.id;
        scene.add(gr); gr.updateMatrixWorld(true); gr.traverse(function(o){ o.matrixAutoUpdate = false; });
        var c = new THREE.Vector3();
        fila.forEach(function(o){ var gm = o.geometry; if(!gm.boundingSphere) gm.computeBoundingSphere(); c.copy(gm.boundingSphere.center); o.localToWorld(c); o.userData.mvx = c.x; o.userData.mvz = c.z; o.userData.mvr = gm.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis(); o.userData.mvtri = (gm.index ? gm.index.count : (gm.attributes.position ? gm.attributes.position.count : 0)) / 3; });
        M.grupo = gr; M.fila = fila; M.tri0 = fila.length; M.tSubir = performance.now(); ordena(M, V.px, V.pz);
      }, function(e){ console.warn('[mapa-vivo] ' + M.id, e); M.estado = 0; M.erroT = performance.now(); });
    });
  }
  function dSup(o, x, z){ var u = o.userData; return Math.max(0, Math.hypot(u.mvx - x, u.mvz - z) - (u.mvr || 0)); }      /* distancia ate a SUPERFICIE da esfera da peca: o chao grande embaixo do jogador conta como perto */
  function ordena(M, x, z){ M.tOrd = performance.now(); M.xOrd = x; M.zOrd = z; M.fila.sort(function(a, b){ return dSup(b, x, z) - dSup(a, x, z); }); }   /* o ultimo da fila e o mais perto */
  var MAPS_TEX = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap', 'alphaMap'];
  function sobe(M){
    var f = M.fila; if(!f || !f.length) return;
    if(Math.hypot(V.px - M.xOrd, V.pz - M.zOrd) > 60) ordena(M, V.px, V.pz);                      /* o jogador andou: refaz a ordem */
    var t0 = performance.now(), orc = opt.baixa ? 2.5 : 5, rd = opt.renderer, n = 0;
    while(f.length && (n === 0 || performance.now() - t0 < orc)){                              /* orcamento de TEMPO por quadro (pelo menos 1 peca) */
      var o = f[f.length - 1], mats = Array.isArray(o.material) ? o.material : [o.material];
      if(rd && rd.initTexture) mats.forEach(function(m){ MAPS_TEX.forEach(function(k){ var t = m[k]; if(t && t.isTexture && !t.userData._mv){ t.userData._mv = 1; rd.initTexture(t); } }); });
      f.pop(); o.visible = true; n++;
    }
    if(!M.usavel && (!f.length || dSup(f[f.length - 1], V.px, V.pz) > 90)){ M.usavel = true; lg(M, 'entorno pronto (a ' + Math.round(performance.now() - M.tSubir) + ' ms, faltam ' + f.length + ' pecas longe)'); }
    if(!f.length){ M.fila = null; M.estado = 2; lg(M, 'pronto: ' + M.tri0 + ' pecas subiram em ' + Math.round(performance.now() - M.tSubir) + ' ms'); }
  }
  function libera(o){
    o.traverse(function(n){ if(n.geometry) n.geometry.dispose(); if(n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(function(m){ for(var k in m){ if(m[k] && m[k].isTexture) m[k].dispose(); } m.dispose(); }); });
  }
  function solta(M){
    M.tok++; if(M.grupo){ scene.remove(M.grupo); libera(M.grupo); M.grupo = null; }
    M.G = null; M.offs = null; M.dv = null; M.estado = 0; M.usavel = false; M.fila = null; M.bytes = null; M.bpend = null;
  }
  V.init = function(T, sc, o){
    THREE = T; scene = sc; opt = o || {}; var D = window.MundoCampo && MundoCampo.dados; if(!D || !D.mapas) return false;
    Object.keys(CFG).forEach(function(id){
      var P = D.mapas[id]; if(!P) return; var C = CFG[id];
      var M = V.mapas[id] = { id: id, C: C, estado: 0, tok: 0, pts: [], dReg: 1e9, X: { x: P.pos[0], y: P.pos[1], z: P.pos[2], r: P.rotY, c: Math.cos(P.rotY), s: Math.sin(P.rotY) } };
      M.centro = mundo(M, C.spawn[0], C.spawn[1]);
    });
    /* pontos de amostra da regiao de cada mapa (a cada 12 m) para medir a distancia ate a borda dela */
    var porReg = {}; for(var id in CFG) porReg[CFG[id].regiao] = id;
    for(var x = D.x0; x < D.x0 + D.nx * D.passo; x += 12) for(var z = D.z0; z < D.z0 + D.nz * D.passo; z += 12){ var r = MundoCampo.regiao(x, z); if(r >= 1 && r <= 3 && V.mapas[porReg[r]]) V.mapas[porReg[r]].pts.push(x, z); }
    V.on = true; return true;
  };
  V.px = 0; V.pz = 0; var tReg = 0;
  /* baixa os bytes de longe (PRE), le o GLB perto (PERTO), solta longe; um mapa por vez na memoria da placa */
  V.tick = function(x, z){
    if(!V.on) return; V.px = x; V.pz = z;
    var pre = opt.baixa ? 300 : 450, perto = opt.baixa ? 130 : 200, longe = perto + 160, now = performance.now(), fora = Math.hypot(x, z) > 90, ocupado = false, id;
    if(now - tReg > 400){ tReg = now;
      for(id in V.mapas){ var M0 = V.mapas[id], P = M0.pts, md = 1e18; for(var k = 0; k < P.length; k += 2){ var dd = (P[k] - x) * (P[k] - x) + (P[k + 1] - z) * (P[k + 1] - z); if(dd < md) md = dd; } M0.dReg = Math.sqrt(md); }
    }
    for(id in V.mapas){ var Mq = V.mapas[id]; if(Mq.estado === 1) ocupado = true; if(Mq.fila) sobe(Mq); }
    for(id in V.mapas){
      var M = V.mapas[id], d = M.dReg;
      if(M.estado === 0 && fora && d < perto && !ocupado && !(M.erroT && now - M.erroT < 15000)){
        if(opt.baixa) for(var o in V.mapas) if(o !== id && V.mapas[o].estado !== 0 && V.mapas[o].dReg > 40) solta(V.mapas[o]);      /* celular basico: um mapa so na memoria da placa */
        carrega(M); ocupado = true; }
      else if(M.estado === 0 && fora && d < pre && !M.bytes && !M.bpend && !(M.erroT && now - M.erroT < 15000)){ var baixando = false; for(var q in V.mapas) if(V.mapas[q].bpend) baixando = true; if(!baixando) baixa(M); }
      else if(M.estado === 2 && d > longe) solta(M);
      else if(M.estado === 1 && d > longe + 100) solta(M);                         /* o carregamento em curso e descartado */
      else if(M.estado === 0 && M.bytes && d > pre + 150) M.bytes = null;           /* afastou-se: larga os bytes baixados */
    }
  };
  V.info = function(){ var o = {}; for(var id in V.mapas){ var M = V.mapas[id]; o[id] = { estado: M.estado, bytes: !!M.bytes, baixando: !!M.bpend, fila: M.fila ? M.fila.length : 0, usavel: !!M.usavel, dReg: Math.round(M.dReg) }; } return o; };
  V.pronto = function(id){ var M = V.mapas[id]; return !!(M && (M.estado === 2 || M.usavel)); };
  V.porRegiao = function(r){ for(var id in CFG) if(CFG[id].regiao === r) return id; return null; };
  V.chao = function(x, z, y){
    var best = null;
    for(var id in V.mapas){
      var M = V.mapas[id]; if(M.estado !== 2 && !M.usavel) continue;
      var l = local(M, x, z), yy = (y === undefined ? 1e4 : y) - M.X.y, h = chaoLocal(M, l[0], l[1], yy);
      if(h === null && y !== undefined) h = chaoProx(M, l[0], l[1], yy).h;                /* [emenda] chao do mapa um pouco acima/abaixo do terreno */
      if(h !== null){ h += M.X.y; if(best === null || (y !== undefined ? Math.abs(h - y) < Math.abs(best - y) : h > best)) best = h; }
    }
    return best;
  };
  /* movimento do jogador de (x0,z0) para (x1,z1) na altura y: so vale quando o destino tem chao de um mapa carregado */
  V.bloq = function(x0, z0, x1, z1, y){
    for(var id in V.mapas){
      var M = V.mapas[id]; if(M.estado !== 2 && !M.usavel) continue;
      var b = local(M, x1, z1), yl = y - M.X.y, h = chaoLocal(M, b[0], b[1], yl);
      if(h === null){ var cp = chaoProx(M, b[0], b[1], yl); h = cp.h; if(h === null){ if(cp.acima && MundoCampo.regiao(x1, z1) === M.C.regiao){ V.motivo = 'estrutura'; return true; } continue; } }      /* [emenda] so chao do mapa longe demais: nao deixa andar enterrado */
      if(Math.abs(h - yl) > TOL) continue;
      var a = local(M, x0, z0), yr = Math.min(Math.max(yl, h - PASSO), h + PASSO);
      V.motivo = 'parede';
      return !(livre(M, b[0], b[1], h) && !cruza(M, a[0], a[1], b[0], b[1], yr));
    }
    return null;
  };
  V.spawn = function(id){ var M = V.mapas[id]; if(!M) return null; var p = mundo(M, M.C.spawn[0], M.C.spawn[1]); return [p[0], p[1], M.C.spawn[2] + M.X.y]; };
  V.estado = function(){ var o = {}; for(var id in V.mapas) o[id] = V.mapas[id].estado; return o; };
  return V;
})();
