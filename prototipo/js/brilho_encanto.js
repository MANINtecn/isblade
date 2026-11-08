/* Brilho do encantamento na arma (como no L2: a partir de +4 a arma brilha; a cor sobe com o nivel). Cores em data/loja.json -> encantar.brilho.
   Uso:  Brilho.aplica(chave, function(){ return rig; }, nivel)   (chave: 'eu' para o jogador local, 'r'+id para os outros)
         Brilho.tira(chave)
   O rig pode ainda nao existir ou trocar (troca de raca/arma): a cada meio segundo o laco confere e reaplica. Pulso leve no emissive, sem luz extra. */
(function(){
  var B = window.Brilho = {}, REG = {}, CORES = [[4, '#3f8cff'], [7, '#38e1ff'], [12, '#ffc23a'], [16, '#ff5a1f']], tConf = 0;
  fetch('data/loja.json?v=' + Date.now().toString().slice(0, -5)).then(function(r){ return r.json(); }).then(function(j){ if(j && j.encantar && j.encantar.brilho) CORES = j.encantar.brilho; for(var k in REG) REG[k].sig = ''; }).catch(function(){});
  var PARTES = ['sword', 'sword_', 'swd1h', 'swd2h', 'stf', 'shd'];
  function cor(n){ var c = null; for(var i = 0; i < CORES.length; i++) if(n >= CORES[i][0]) c = CORES[i][1]; return c; }
  function forca(n){ return n >= 16 ? .95 : n >= 12 ? .7 : n >= 7 ? .48 : .32; }
  function malhas(rig){ var out = [], vistos = []; PARTES.forEach(function(p){ var o = rig[p]; if(!o || !o.traverse || vistos.indexOf(o) >= 0) return; vistos.push(o); o.traverse(function(m){ if(m.isMesh && m.material && !Array.isArray(m.material)) out.push(m); }); }); return out; }
  function restaura(m){ if(m.userData.__bm0){ m.material = m.userData.__bm0; delete m.userData.__bm0; } }
  function confere(k){
    var r = REG[k], rig = r.get && r.get(); if(!rig){ r.rig = null; return; }
    var ms = malhas(rig), c = cor(r.n), sig = (c || '-') + '|' + ms.length;
    if(rig === r.rig && sig === r.sig) return;
    (r.ms || []).forEach(restaura); r.rig = rig; r.sig = sig; r.ms = [];
    if(!c) return;
    ms.forEach(function(m){
      var m0 = m.material; if(!m0.emissive) return;
      var mm = m0.clone(); mm.emissive = mm.emissive.clone().set(c); mm.emissiveIntensity = forca(r.n); m.userData.__bm0 = m0; m.material = mm; r.ms.push(m);
    });
  }
  B.aplica = function(k, get, n){ var r = REG[k] || (REG[k] = { ms: [] }); r.get = get; if(r.n !== (n | 0)){ r.n = n | 0; r.sig = ''; } confere(k); };
  B.tira = function(k){ var r = REG[k]; if(!r) return; (r.ms || []).forEach(restaura); delete REG[k]; };
  B.nivel = function(k){ return REG[k] ? REG[k].n : 0; };
  B.qtd = function(k){ return REG[k] ? REG[k].ms.length : 0; };      /* teste: quantas malhas brilham */
  B.cor = cor;
  function laco(t){
    requestAnimationFrame(laco);
    if(t - tConf > 500){ tConf = t; for(var k in REG) confere(k); }
    var p = .78 + .22 * Math.sin(t * .004);
    for(var k2 in REG){ var r = REG[k2], f = forca(r.n) * p; for(var i = 0; i < r.ms.length; i++) r.ms[i].material.emissiveIntensity = f; }
  }
  requestAnimationFrame(laco);
})();
