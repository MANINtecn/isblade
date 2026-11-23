/* Portoes e portas moveis do castelo e da fortaleza de Dion (23/11/2026). Pecas separadas do mapa (assets/maps/dion/dion_portoes.glb + .json, tools/dion/montar_portoes.py):
   cada uma tem 3 estados -> 'fechado' (bloqueia a passagem), 'aberto' (gira/sobe como o KeyPos/KeyRot do L2 e libera) e 'destruido' (some e libera).
   O id e o L2ServerObjectID do proprio mapa (castelo 1-9, fortaleza 17-28), o mesmo que a guerra de cerco vai usar.
   O servidor guarda o estado (dados/dion_portoes.json) e manda 'dion_portoes' (todos, ao entrar) e 'dion_portao' (mudanca) -> PortoesDion.msg(m).
   Colisao: MapaVivo.bloq chama PortoesDion.bloq(x0, z0, x1, z1, y) antes do walkgrid. Quem ja esta DENTRO da caixa pode sair (nao fica preso quando o portao fecha).
   Uso: PortoesDion.init(THREE, scene, prepShaders); PortoesDion.tick(dt) (todo quadro); PortoesDion.msg(m); PortoesDion.lista() -> [{id, nome, grupo, tipo, estado}]. */
window.PortoesDion = (function(){
  var P = {}, THREE = null, scene = null, prep = null, D = null, G = {}, E = {}, raiz = null, carregando = false, pronto = false, off = [1500, 0, 0], fila = [];
  var RAIO = .5, DUR = 1.6, TAB = { fechado: 1, aberto: 1, destruido: 1 };
  function poeEstado(id, est, imediato){
    if(!TAB[est]) return; E[id] = est; var g = G[id]; if(!g) return;
    if(est === 'aberto' && !g.def.aberto) est = 'fechado';                  /* muralha quebravel nao abre: so cai (destruido) */
    g.alvo = est === 'aberto' ? 1 : 0; g.dest = est === 'destruido';
    if(imediato || g.dest){ g.s = g.alvo; g.o.visible = !g.dest; aplica(g); } else { g.o.visible = true; g.mov = true; }
  }
  function aplica(g){
    var s = g.s, a = g.def.aberto; if(!a){ g.o.position.set(0, 0, 0); g.o.quaternion.identity(); return; }
    var e = s * s * (3 - 2 * s);                                  /* suaviza o inicio e o fim */
    g.o.position.set(a.t[0] * e, a.t[1] * e, a.t[2] * e); g.o.quaternion.copy(g.q0).slerp(g.q1, e); g.o.updateMatrixWorld(true);
  }
  function monta(glb, dados){
    new THREE.GLTFLoader().parse(glb, 'assets/maps/dion/', function(g){
      raiz = new THREE.Group(); raiz.name = 'PORTOES_DION'; raiz.position.set(off[0], off[1], off[2]);
      dados.portoes.forEach(function(def){
        var o = g.scene.getObjectByName(def.node); if(!o) return;
        o.parent && o.parent.remove(o); o.traverse(function(n){ if(n.isMesh){ n.castShadow = !(window.__opt_baixa); n.receiveShadow = false; (Array.isArray(n.material) ? n.material : [n.material]).forEach(function(m){ m.side = THREE.DoubleSide; }); } });
        var q1 = def.aberto ? new THREE.Quaternion(def.aberto.q[0], def.aberto.q[1], def.aberto.q[2], def.aberto.q[3]) : new THREE.Quaternion();
        G[def.id] = { def: def, o: o, s: 0, alvo: 0, mov: false, dest: false, q0: new THREE.Quaternion(), q1: q1 }; raiz.add(o);
      });
      scene.add(raiz); raiz.updateMatrixWorld(true);
      var p = prep ? Promise.resolve(prep(raiz, true)).catch(function(){}) : Promise.resolve();
      p.then(function(){ pronto = true; Object.keys(G).forEach(function(id){ poeEstado(+id, E[id] || 'fechado', true); }); });
    }, function(e){ carregando = false; console.warn('[portoes-dion]', e); });
  }
  function carrega(){
    if(carregando) return; carregando = true;
    fetch('assets/maps/dion/dion_portoes.json', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(dados){
      D = dados; var v = '?v=' + (dados.versao || 0), url = 'assets/maps/dion/dion_portoes.glb' + v;
      return (window.AssetsWeb ? window.AssetsWeb.busca(url, { priority: 'low' }) : fetch(url)).then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(function(buf){ monta(buf, dados); });
    }).catch(function(e){ carregando = false; console.warn('[portoes-dion]', e); });
  }
  P.init = function(T3, sc, prepFn){
    THREE = T3; scene = sc; prep = prepFn;
    var C = window.MapaVivo && MapaVivo.CFG && MapaVivo.CFG.dion; if(C && C.fixo) off = C.fixo.pos.slice();
  };
  P.msg = function(m){
    if(m.t === 'dion_portoes'){ E = {}; var e = m.estados || {}; Object.keys(e).forEach(function(k){ E[k] = e[k]; }); if(pronto) Object.keys(G).forEach(function(id){ poeEstado(+id, E[id] || 'fechado', true); }); }
    else if(m.t === 'dion_portao'){ (m.ids || []).forEach(function(id){ poeEstado(+id, m.estado, !pronto); }); }
  };
  P.tick = function(dt){
    if(!pronto){ if(!carregando && window.MapaVivo && MapaVivo.on && MapaVivo.pronto && MapaVivo.pronto('dion') && window.THREE) carrega(); return; }
    for(var id in G){ var g = G[id]; if(!g.mov) continue;
      var d = dt / DUR; g.s += g.alvo > g.s ? d : -d; if((g.alvo > g.s && g.s > g.alvo - 1e-3) || (g.alvo < g.s && g.s < g.alvo + 1e-3) || Math.abs(g.s - g.alvo) < d){ g.s = g.alvo; g.mov = false; } aplica(g); }
  };
  /* o jogador vai de (x0,z0) para (x1,z1) na altura y (mundo): true = o portao fechado barra */
  P.bloq = function(x0, z0, x1, z1, y){
    if(!pronto) return false; var lx = x1 - off[0], lz = z1 - off[2], ax = x0 - off[0], az = z0 - off[2], yy = y - off[1];
    for(var id in G){
      var g = G[id]; if(g.dest || g.s > .85 || g.alvo === 1) continue; var c = g.def.col; if(yy < c.y0 - 2.2 || yy > c.y1 + .3) continue;
      var A = c.a + RAIO, B = c.b + RAIO, fim = dentro(c, lx, lz, A, B); if(!fim) continue;
      if(dentro(c, ax, az, A, B)) continue;                        /* ja estava dentro: deixa sair */
      return true;
    }
    return false;
  };
  function dentro(c, x, z, A, B){ var dx = x - c.cx, dz = z - c.cz, du = dx * c.ux + dz * c.uz, dv = -dx * c.uz + dz * c.ux; return Math.abs(du) <= A && Math.abs(dv) <= B; }
  P.lista = function(){ return D ? D.portoes.map(function(g){ return { id: g.id, nome: g.nome, grupo: g.grupo, tipo: g.tipo, estado: E[g.id] || 'fechado' }; }) : []; };
  P.estado = function(){ return E; };
  P.pronto = function(){ return pronto; };
  P.obj = function(id){ return G[id] ? G[id].o : null; };                /* so para teste */
  return P;
})();
