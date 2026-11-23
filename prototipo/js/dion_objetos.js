/* Objetos de Dion colocados pelo GM (F10 > Mobs / Bosses > NPCs e objetos), 22/11/2026.
   O servidor guarda a lista (dados/dion_objetos.json) e manda para quem entra ('dion_obj') e a cada mudanca ('dion_obj_add', 'dion_obj_del').
   Tipos: npc_clarissa, npc_altran, npc_mammon, npc_wilford, npc_galladucci (js/l2_npcs.js) e feixe (a coluna de luz dourada da praca de Talking Island).
   Uso: DionObjetos.msg(m) (chamado pelo js/net.js). Coordenadas = mundo da cidade (Dion fica em x ~1500). */
window.DionObjetos = (function(){
  var D = {}, vivos = {}, fila = [], timer = null, anim = false;
  function pronto(){ return !!(window.THREE && window.L2Npcs && L2Npcs.tipos && window.colunaCidade && colunaCidade.parent); }
  function cria(o){
    if(vivos[o.uid]) return true;
    if(o.tipo === 'feixe'){
      var m = new THREE.Mesh(colunaCidade.geometry, colunaCidade.material); m.position.set(o.x, o.y, o.z); m.renderOrder = 5; m.name = 'FEIXE_DION'; colunaCidade.parent.add(m);
      vivos[o.uid] = { m: m, tipo: o.tipo }; ligaAnim();
    } else if(/^npc_/.test(o.tipo)){
      var h = L2Npcs.criar(o.tipo.slice(4), o.x, o.y, o.z, o.rot || 0); if(!h) return false; vivos[o.uid] = { npc: h, tipo: o.tipo };
    }
    return true;
  }
  function tira(uid){
    var v = vivos[uid]; if(!v) return;
    if(v.m && v.m.parent) v.m.parent.remove(v.m);
    if(v.npc && window.L2Npcs) L2Npcs.remover(v.npc);
    delete vivos[uid];
  }
  function ligaAnim(){                                  /* o feixe gira so no eixo vertical para ficar de frente para a camera (o desenho original faz isso so na coluna da vila) */
    if(anim) return; anim = true;
    (function loop(){
      requestAnimationFrame(loop);
      var cam = window.camera || (window.__dbg && __dbg.camera); if(!cam) return;
      for(var k in vivos){ var v = vivos[k]; if(v.m) v.m.rotation.y = Math.atan2(cam.position.x - v.m.position.x, cam.position.z - v.m.position.z); }
    })();
  }
  function drena(){
    if(!pronto()) return;
    if(window.colunaCidade && !/[?&]talking=1/.test(location.search)) colunaCidade.visible = false;      /* a coluna da vila antiga some: em Dion so os feixes colocados */
    var f = fila; fila = [];
    f.forEach(function(q){ if(q.op === 'add') cria(q.o); else if(q.op === 'del') tira(q.uid); else if(q.op === 'tudo'){ Object.keys(vivos).forEach(tira); q.lista.forEach(cria); } });
    if(timer){ clearInterval(timer); timer = null; }
  }
  function enfileira(q){ fila.push(q); if(pronto()) drena(); else if(!timer) timer = setInterval(drena, 500); }
  D.msg = function(m){
    if(m.t === 'dion_obj') enfileira({ op: 'tudo', lista: m.lista || [] });
    else if(m.t === 'dion_obj_add' && m.o) enfileira({ op: 'add', o: m.o });
    else if(m.t === 'dion_obj_del') (m.uids || []).forEach(function(u){ enfileira({ op: 'del', uid: u }); });
  };
  D.lista = function(){ return Object.keys(vivos).map(function(k){ return { uid: k, tipo: vivos[k].tipo }; }); };
  return D;
})();
