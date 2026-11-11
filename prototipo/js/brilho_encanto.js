/* Brilho do encantamento na arma (como no L2: a partir de +4 a arma brilha; a cor sobe com o nivel). Cores em data/loja.json -> encantar.brilho.
   Uso:  Brilho.aplica(chave, function(){ return rig; }, nivel)   (chave: 'eu' para o jogador local, 'r'+id para os outros)
         Brilho.tira(chave)
         Brilho.soulshot(rig, isMagic, durMs)                       (brilho nostálgico do Soulshot na arma)
         Brilho.soulshotImpacto()                                   (descarrega o Soulshot no impacto)
   O rig pode ainda nao existir ou trocar (troca de raca/arma): a cada meio segundo o laco confere e reaplica. Pulso leve no emissive, sem luz extra. */
(function(){
  var B = window.Brilho = {}, REG = {}, CORES = [[4, '#3f8cff'], [7, '#38e1ff'], [12, '#ffc23a'], [16, '#ff5a1f']], tConf = 0;
  fetch('data/loja.json?v=' + Date.now().toString().slice(0, -5)).then(function(r){ return r.json(); }).then(function(j){ if(j && j.encantar && j.encantar.brilho) CORES = j.encantar.brilho; for(var k in REG) REG[k].sig = ''; }).catch(function(){});
  var PARTES = ['sword', 'sword_', 'swd1h', 'swd2h', 'stf', 'shd', 'livro'];
  function cor(n){ var c = null; for(var i = 0; i < CORES.length; i++) if(n >= CORES[i][0]) c = CORES[i][1]; return c; }
  function forca(n){ return n >= 16 ? .95 : n >= 12 ? .7 : n >= 7 ? .48 : .32; }
  function malhas(rig){
    var out = [], vistos = [];
    if(!rig) return out;
    PARTES.forEach(function(p){
      var o = rig[p];
      if(!o || !o.traverse || vistos.indexOf(o) >= 0) return;
      vistos.push(o);
      o.traverse(function(m){
        if(m && m.isMesh && m.material && !Array.isArray(m.material) && vistos.indexOf(m) < 0){
          vistos.push(m);
          out.push(m);
        }
      });
    });
    return out;
  }
  function restaura(m){ if(m.userData && m.userData.__bm0){ m.material = m.userData.__bm0; delete m.userData.__bm0; } }
  function confere(k){
    var r = REG[k], rig = r.get && r.get(); if(!rig){ r.rig = null; return; }
    var ms = malhas(rig), c = cor(r.n), sig = (c || '-') + '|' + ms.length;
    if(rig === r.rig && sig === r.sig) return;
    (r.ms || []).forEach(restaura); r.rig = rig; r.sig = sig; r.ms = [];
    if(!c) return;
    ms.forEach(function(m){
      var m0 = m.material; if(!m0 || !m0.emissive) return;
      var mm = m0.clone(); mm.emissive = mm.emissive.clone().set(c); mm.emissiveIntensity = forca(r.n); m.userData.__bm0 = m0; m.material = mm; r.ms.push(m);
    });
  }
  B.aplica = function(k, get, n){ var r = REG[k] || (REG[k] = { ms: [] }); r.get = get; if(r.n !== (n | 0)){ r.n = n | 0; r.sig = ''; } confere(k); };
  B.tira = function(k){ var r = REG[k]; if(!r) return; (r.ms || []).forEach(restaura); delete REG[k]; };
  B.nivel = function(k){ return REG[k] ? REG[k].n : 0; };
  B.qtd = function(k){ return REG[k] ? REG[k].ms.length : 0; };      /* teste: quantas malhas brilham */
  B.cor = cor;

  /* Brilho nostálgico do Soulshot / Spiritshot do Lineage 2:
     A lâmina se acende com a explosão azul/ciano clássica do L2 ao golpear ou usar skill,
     durando o tempo do golpe e retornando suavemente ao normal (ou ao encanto +4/+7/+16). */
  var ssTimer = 0, ssCor = '#38d0ff', ssMs = [];
  B.soulshot = function(rig, isMagic, durMs){
    try {
      if(!rig) return;
      ssCor = isMagic ? '#38e1ff' : '#4dd4ff';
      ssTimer = performance.now() + (durMs || 380);
      ssMs = malhas(rig);
      ssMs.forEach(function(m){
        var mt = m.material;
        if(!mt || !mt.emissive) return;
        if(!m.userData.__origEmissive){
          m.userData.__origEmissive = mt.emissive.clone();
          m.userData.__origIntensity = (typeof mt.emissiveIntensity === 'number') ? mt.emissiveIntensity : 0;
        }
        mt.emissive.set(ssCor);
        mt.emissiveIntensity = 2.8;
      });
    } catch(e){ console.warn('B.soulshot err:', e); }
  };
  B.soulshotImpacto = function(){
    try {
      ssTimer = 0;
    } catch(_){}
  };

  function laco(t){
    requestAnimationFrame(laco);
    if(t - tConf > 500){ tConf = t; for(var k in REG) confere(k); }
    var now = performance.now();
    var ssAtivo = (now < ssTimer);
    var p = .78 + .22 * Math.sin(t * .004);

    if(!ssAtivo && ssMs.length > 0){
      ssMs.forEach(function(m){
        var mt = m && m.material;
        if(!mt || !mt.emissive) return;
        var encCor = null, encForca = 0;
        for(var k in REG){
          var r = REG[k];
          if(r.ms && r.ms.indexOf(m) >= 0){
            encCor = cor(r.n);
            encForca = forca(r.n);
            break;
          }
        }
        if(encCor){
          mt.emissive.set(encCor);
          mt.emissiveIntensity = encForca * p;
        } else if(m.userData && m.userData.__origEmissive){
          mt.emissive.copy(m.userData.__origEmissive);
          mt.emissiveIntensity = m.userData.__origIntensity || 0;
        } else {
          mt.emissive.setHex(0x000000);
          mt.emissiveIntensity = 0;
        }
      });
      ssMs = [];
    }

    for(var k2 in REG){
      var r2 = REG[k2], f = forca(r2.n) * p;
      for(var i = 0; i < r2.ms.length; i++){
        var m2 = r2.ms[i];
        if(ssAtivo) continue;
        if(m2 && m2.material && m2.material.emissive) m2.material.emissiveIntensity = f;
      }
    }
  }
  requestAnimationFrame(laco);
})();
