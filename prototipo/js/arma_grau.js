/* Graus de equipamento (data/itens.json -> graus, conjunto): modelo da arma pelo grau + bonus de set + texto de grau.
   Uso na pagina (arena.html / cidade.html):
     ArmaGrau.aplica(rig, baseArma, attach, baseEscudo)  -> troca o modelo da arma e escudo do personagem L2
     ArmaGrau.aplicaArmadura(rig, equip, baseOf, findItem) -> aplica as texturas oficiais de armadura L2 (D, C, B, A) no corpo 3D
     ArmaGrau.conjunto(ITM, equip, baseOf, findItem) -> {grau, vida, dano, defesa, nome} do set completo
     ArmaGrau.tag(ITM, base, nivel) -> HTML curto "Grau D · Nv 20" */
(function(){
  var A = window.ArmaGrau = {};
  var texLoader = null, texCache = {};

  function getTex(path){
    if(!path) return null;
    if(!texLoader && window.THREE) texLoader = new THREE.TextureLoader();
    if(!texLoader) return null;
    if(!texCache[path]){
      var t = texLoader.load(path);
      t.flipY = false;
      texCache[path] = t;
    }
    return texCache[path];
  }

  // Texturas oficiais 1:1 do Lineage 2 Interlude para Human Fighter / Raças
  var SET_TEXTURES = {
    sem: {
      chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m000_t1000_u.png',
      legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m000_t1000_l.png',
      gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m000_t1000_g.png',
      boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m000_t1000_b.png'
    },
    D: {
      chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_u_sp.png',
      legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_l_sp.png',
      gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_g_sp.png',
      boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_b_sp.png'
    },
    C: {
      chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m002_t1002_u_sp.png',
      legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m001_t01_l_sp.png',
      gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m002_t1002_g.png',
      boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m002_t1002_b.png'
    },
    B: {
      chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m012_t80_u_sp.png',
      legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m012_t80_l_sp.png',
      gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m012_t80_g.png',
      boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m012_t80_b.png'
    },
    A: {
      chest: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_u_sp.png',
      legs:  'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_l_sp.png',
      gloves:'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_g.png',
      boots: 'assets/personagens/raw_fighter/textures/MFighter/Texture/MFighter_m013_t2000_b_sp.png'
    }
  };

  function filhoGrau(holder, attach, url){
    if(!holder._orig){ holder._orig = holder.children.slice(); }
    if(holder._grauUrl === url) return;
    holder._grauUrl = url;
    if(holder._grau){ holder.remove(holder._grau); holder._grau = null; }
    holder._orig.forEach(function(c){ c.visible = !url; });
    if(!url) return;
    var g = attach(holder, null, url, { isL2: true });
    holder._grau = g;
  }

  A.aplica = function(rig, base, attach, baseEscudo){
    if(!rig || !rig.isL2 || !rig.root || !attach) return;
    var w = base && base.weapon, url = (base && base.modelo) || null;
    /* espada de duas maos */
    if(rig.swd2h) filhoGrau(rig.swd2h, attach, w === 'sword' ? url : null);

    /* escudo na mao esquerda */
    var shdUrl = (baseEscudo && baseEscudo.modelo) || (w === 'shield' ? url : null);
    if(rig.shd) filhoGrau(rig.shd, attach, shdUrl);

    /* cajado do mago na mao direita */
    if(w === 'staff' && url && !rig.stfL2){
      rig.stfL2 = attach(rig.root, 'Weapon_R_Bone', url, { isL2: true });
      rig.stfL2._grauUrl = url; rig.stfL2._orig = [];
    } else if(rig.stfL2 && w === 'staff' && url && rig.stfL2._grauUrl !== url){
      var bone = rig.stfL2.parent; if(bone) bone.remove(rig.stfL2);
      rig.stfL2 = attach(rig.root, 'Weapon_R_Bone', url, { isL2: true }); rig.stfL2._grauUrl = url; rig.stfL2._orig = [];
    }
    if(rig.stfL2) rig.stfL2.visible = (w === 'staff' && !!url);
  };

  A.aplicaArmadura = function(rig, equip, baseOf, findItem){
    if(!rig || !rig.root) return;

    if(!rig._meshParts){
      rig._meshParts = {};
      rig.root.traverse(function(c){
        if(c.isMesh){
          var nl = (c.name || '').toLowerCase();
          if(nl.indexOf('chest') >= 0 || nl.indexOf('_u') >= 0) rig._meshParts.chest = c;
          else if(nl.indexOf('legs') >= 0 || nl.indexOf('_l') >= 0) rig._meshParts.legs = c;
          else if(nl.indexOf('gloves') >= 0 || nl.indexOf('_g') >= 0) rig._meshParts.gloves = c;
          else if(nl.indexOf('boots') >= 0 || nl.indexOf('_b') >= 0) rig._meshParts.boots = c;
          else if(nl.indexOf('face') >= 0 || nl.indexOf('_f') >= 0) rig._meshParts.face = c;
          else if(nl.indexOf('hair') >= 0 || nl.indexOf('_h') >= 0) rig._meshParts.hair = c;
        }
      });
    }

    var parts = ['chest', 'legs', 'gloves', 'boots'];
    for(var i = 0; i < parts.length; i++){
      var p = parts[i];
      var m = rig._meshParts[p];
      if(!m || !m.material) continue;

      var itUid = equip && equip[p];
      var it = itUid && findItem ? findItem(itUid) : null;
      var b = it && baseOf ? baseOf(it.base) : null;
      var grau = (b && b.grau) || 'sem';

      // Herda o grau do peitoral se a peça for secundária sem grau explícito
      if(p !== 'chest' && grau === 'sem' && equip && equip.chest && findItem && baseOf){
        var chestIt = findItem(equip.chest);
        var chestB = chestIt && baseOf(chestIt.base);
        if(chestB && chestB.grau) grau = chestB.grau;
      }

      var setConf = SET_TEXTURES[grau] || SET_TEXTURES.sem;
      var texPath = setConf[p];
      if(texPath){
        var tex = getTex(texPath);
        if(tex){
          var matList = Array.isArray(m.material) ? m.material : [m.material];
          matList.forEach(function(mat){
            if(mat.map !== tex){
              mat.map = tex;
              mat.needsUpdate = true;
            }
          });
        }
      }
    }
  };

  A.conjunto = function(ITM, equip, baseOf, findItem){
    var C = ITM && ITM.conjunto; if(!C || !equip) return null;

    // 1. Checa se formou um Set Específico (ex: brigandine, fullplate, doom, tallum)
    if(C.sets){
      for(var sKey in C.sets){
        var sDef = C.sets[sKey];
        var match = true;
        for(var pi = 0; pi < sDef.pecas.length; pi++){
          var pSlot = sDef.pecas[pi];
          var itP = findItem(equip[pSlot]), bP = itP && baseOf(itP.base);
          if(!bP || (bP.set !== sKey && (bP.grau !== sDef.grau))){ match = false; break; }
        }
        if(match){
          return {
            grau: sDef.grau,
            nome: sDef.nome,
            vida: sDef.vida || 0,
            dano: sDef.dano || 0,
            defesa: sDef.defesa || 0
          };
        }
      }
    }

    // 2. Fallback: Checa conjunto por Grau de peças equipadas
    var g = null;
    for(var i = 0; i < C.pecas.length; i++){
      var it = findItem(equip[C.pecas[i]]), b = it && baseOf(it.base);
      if(!b) return null;
      var gb = b.grau || 'sem';
      if(g === null) g = gb;
      else if(g !== gb) return null;
    }
    var B = C[g]; if(!B) return null;
    return {
      grau: g,
      nome: B.name || ('Conjunto Grau ' + g),
      vida: B.vida || 0,
      dano: B.dano || 0,
      defesa: B.defesa || 0
    };
  };

  A.info = function(ITM, b){
    var G = ITM && ITM.graus, g = (b && b.grau) || 'sem';
    return (G && G[g]) || { name: 'Sem grau', css: '#9aa4b8', nivel: 1 };
  };

  A.tag = function(ITM, b, nivel){
    var G = A.info(ITM, b), falta = (G.nivel | 0) > (nivel | 0);
    return '<span style="color:' + G.css + '">' + G.name + '</span>' + ((G.nivel | 0) > 1 ? ' <span style="color:' + (falta ? '#ff6a5a' : '#9fb0cc') + '">Nv ' + G.nivel + '</span>' : '');
  };
})();
