/* =========================================================================
   SOULSHOT & SPIRITSHOT FX - LINEAGE 2 CANÔNICO
   Brilho de Soulshot elétrico/ciano puro em Three.js (sem Blender/bakes).
   Compatível com armas comuns e encantadas (+4, +7, +12, +16).
   ========================================================================= */
(function(){
  'use strict';

  var S = window.SoulshotFX = {};
  var PARTES = ['sword', 'sword_', 'swd1h', 'swd2h', 'stf', 'shd', 'livro'];
  var _activeMeshes = [];
  var _sparks = [];
  var _rings = [];
  var _lightPool = [];
  var _glowTex = null;

  function getGlowTexture(){
    if(_glowTex) return _glowTex;
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gr.addColorStop(0.25, 'rgba(150, 230, 255, 0.95)');
    gr.addColorStop(0.55, 'rgba(50, 170, 255, 0.55)');
    gr.addColorStop(1.0, 'rgba(10, 80, 255, 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    _glowTex = new THREE.CanvasTexture(c);
    _glowTex.colorSpace = THREE.SRGBColorSpace;
    return _glowTex;
  }

  function getScene(){
    return (typeof scene !== 'undefined') ? scene : null;
  }

  function getPointLight(cor, x, y, z, int, dist, life){
    var sc = getScene();
    if(!sc) return null;
    var lt = null;
    for(var i = 0; i < _lightPool.length; i++){
      if(!_lightPool[i].active){
        lt = _lightPool[i];
        break;
      }
    }
    if(!lt){
      var lMesh = new THREE.PointLight(cor, int, dist, 2.0);
      sc.add(lMesh);
      lt = { light: lMesh, active: true, t: 0, life: life, maxInt: int };
      _lightPool.push(lt);
    } else {
      lt.active = true;
      lt.t = 0;
      lt.life = life;
      lt.maxInt = int;
      lt.light.color.setHex(cor);
      lt.light.intensity = int;
      lt.light.distance = dist;
      lt.light.visible = true;
    }
    lt.light.position.set(x, y, z);
    return lt;
  }

  function coletarMalhas(rig){
    var out = [], vistos = new Set();
    if(!rig) return out;

    PARTES.forEach(function(p){
      var o = rig[p];
      if(!o || !o.traverse || vistos.has(o)) return;
      vistos.add(o);
      o.traverse(function(m){
        if(m.isMesh && m.material && !vistos.has(m)){
          vistos.add(m);
          out.push(m);
        }
      });
    });

    if(rig.root && rig.root.traverse){
      var bones = ['Weapon_R_Bone', 'Shield_L_Bone'];
      bones.forEach(function(bName){
        var b = rig.root.getObjectByName(bName);
        if(!b) return;
        b.traverse(function(m){
          if(m.isMesh && m.material && !vistos.has(m)){
            vistos.add(m);
            out.push(m);
          }
        });
      });
    }

    return out;
  }

  /* Dispara o brilho e som na arma ao desferir ataque ou skill */
  S.ativar = function(rig, isMagic, duracao){
    var sc = getScene();
    var dur = (duracao || 0.45) * 1000;
    var corHex = isMagic ? 0x38e1ff : 0x58d4ff;

    // Som de ativação clássico L2
    try {
      if(window.SFX){
        if(isMagic && SFX.play('spirits_shot_cast')) {}
        else if(SFX.play('soulshot_cast')) {}
        else if(SFX.play('soulshot')) {}
      }
    } catch(_){}

    var ms = coletarMalhas(rig);
    var now = performance.now();

    var posW = new THREE.Vector3();
    var temPos = false;

    ms.forEach(function(m){
      var mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if(!mat) return;

      // Armazena propriedades originais para restauração
      if(!m.userData.__origEmissive){
        m.userData.__origEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0);
        m.userData.__origIntensity = (typeof mat.emissiveIntensity === 'number') ? mat.emissiveIntensity : 0;
      }

      m.userData.__ssActive = true;
      m.userData.__ssT0 = now;
      m.userData.__ssDur = dur;
      m.userData.__ssColor = corHex;
      m.userData.__ssIntensity = isMagic ? 3.0 : 3.4;

      if(mat.emissive){
        mat.emissive.setHex(corHex);
        mat.emissiveIntensity = m.userData.__ssIntensity;
      }

      if(!temPos && m.getWorldPosition){
        m.getWorldPosition(posW);
        temPos = true;
      }

      if(_activeMeshes.indexOf(m) < 0) _activeMeshes.push(m);
    });

    // Posição de fallback para a luz/faíscas
    if(!temPos && typeof S !== 'undefined' && S.px !== undefined){
      posW.set(S.px, 1.4, S.pz);
      temPos = true;
    }

    if(temPos && sc){
      // Flash de luz dinâmica instantânea na arma
      getPointLight(corHex, posW.x, posW.y, posW.z, 4.6, 7.5, 0.28);

      // Fagulhas elétricas de alma estalando na lâmina
      var tx = getGlowTexture();
      var qSparks = isMagic ? 7 : 11;
      for(var i = 0; i < qSparks; i++){
        var matSp = new THREE.SpriteMaterial({
          map: tx,
          color: (i % 2 === 0) ? 0xffffff : corHex,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false
        });
        var sp = new THREE.Sprite(matSp);
        var offX = (Math.random() - 0.5) * 0.7;
        var offY = (Math.random() - 0.5) * 0.9;
        var offZ = (Math.random() - 0.5) * 0.7;
        sp.position.set(posW.x + offX, posW.y + offY, posW.z + offZ);
        var tam = 0.2 + Math.random() * 0.22;
        sp.scale.set(tam, tam, 1);
        sc.add(sp);

        _sparks.push({
          sprite: sp,
          vx: (Math.random() - 0.5) * 1.8,
          vy: 0.6 + Math.random() * 1.6,
          vz: (Math.random() - 0.5) * 1.8,
          t: 0,
          life: 0.24 + Math.random() * 0.18,
          tamBase: tam
        });
      }
    }
  };

  /* Impacto explosivo de Soulshot no alvo (disparo e detonação) */
  S.impacto = function(x, y, z, isMagic){
    var sc = getScene();
    if(!sc) return;
    var corHex = isMagic ? 0x38e1ff : 0x58d4ff;

    // Som canônico de detonação explosiva do Soulshot
    try {
      if(window.SFX){
        if(SFX.play('soulshot_hit')) {}
        else if(SFX.play('soulshot')) {}
      }
    } catch(_){}

    // Acelera descarga da arma ativa
    _activeMeshes.forEach(function(m){
      if(m.userData.__ssActive){
        m.userData.__ssIntensity = Math.min(m.userData.__ssIntensity, 1.2);
        m.userData.__ssDur = 140; // Fim rápido pós-impacto
        m.userData.__ssT0 = performance.now();
      }
    });

    // Clarão de luz dinâmica de impacto
    getPointLight(corHex, x, y || 1.35, z, 5.8, 9.0, 0.22);

    // Anel de choque de energia de alma se expandindo
    var ringGeo = new THREE.RingGeometry(0.2, 0.45, 24);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0x88e8ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, (y || 1.35), z);
    ringMesh.rotation.x = -Math.PI / 2;
    sc.add(ringMesh);
    _rings.push({ mesh: ringMesh, t: 0, life: 0.24 });

    // Detonação de partículas explosivas de alma (brancas, ciano e azul elétrico)
    var tx = getGlowTexture();
    var totalP = isMagic ? 22 : 30;
    var paleta = [0xffffff, corHex, 0x1f7aff];

    for(var k = 0; k < totalP; k++){
      var corP = paleta[k % paleta.length];
      var matP = new THREE.SpriteMaterial({
        map: tx,
        color: corP,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });
      var sp = new THREE.Sprite(matP);
      sp.position.set(x, (y || 1.35), z);
      var sca = 0.22 + Math.random() * 0.28;
      sp.scale.set(sca, sca, 1);
      sc.add(sp);

      var a1 = Math.random() * Math.PI * 2;
      var a2 = Math.random() * Math.PI - 0.3;
      var vel = 3.5 + Math.random() * 6.5;

      _sparks.push({
        sprite: sp,
        vx: Math.cos(a1) * Math.cos(a2) * vel,
        vy: Math.sin(a2) * vel + 1.2,
        vz: Math.sin(a1) * Math.cos(a2) * vel,
        t: 0,
        life: 0.32 + Math.random() * 0.25,
        tamBase: sca,
        gravity: 9.8
      });
    }
  };

  /* Loop de atualização contínua dos efeitos */
  var _lastTime = performance.now();
  function loop(now){
    requestAnimationFrame(loop);
    var dt = Math.min((now - _lastTime) / 1000, 0.1);
    _lastTime = now;
    var sc = getScene();

    // 1. Atualização e decaimento do brilho nas malhas das armas
    for(var i = _activeMeshes.length - 1; i >= 0; i--){
      var m = _activeMeshes[i];
      if(!m || !m.userData || !m.userData.__ssActive){
        _activeMeshes.splice(i, 1);
        continue;
      }
      var elapsed = now - m.userData.__ssT0;
      var dur = m.userData.__ssDur || 400;
      var mat = Array.isArray(m.material) ? m.material[0] : m.material;

      if(!mat || elapsed >= dur){
        // Restaura emissive original/encantamento
        if(mat && mat.emissive){
          var origCor = m.userData.__origEmissive || new THREE.Color(0);
          var origInt = m.userData.__origIntensity || 0;
          mat.emissive.copy(origCor);
          mat.emissiveIntensity = origInt;
        }
        m.userData.__ssActive = false;
        _activeMeshes.splice(i, 1);
      } else {
        // Pulsação inicial forte seguida de curva suave de descarga
        var prog = elapsed / dur;
        var f = (prog < 0.25) ? 1.0 : Math.pow(1 - (prog - 0.25) / 0.75, 1.8);
        var baseInt = m.userData.__origIntensity || 0;
        var curInt = baseInt + (m.userData.__ssIntensity - baseInt) * f;
        if(mat.emissive){
          mat.emissiveIntensity = curInt;
        }
      }
    }

    // 2. Luzes dinâmicas
    for(var l = 0; l < _lightPool.length; l++){
      var lt = _lightPool[l];
      if(!lt.active) continue;
      lt.t += dt;
      if(lt.t >= lt.life){
        lt.active = false;
        lt.light.visible = false;
      } else {
        var fr = 1 - (lt.t / lt.life);
        lt.light.intensity = lt.maxInt * (fr * fr);
      }
    }

    // 3. Anéis de choque de impacto
    for(var r = _rings.length - 1; r >= 0; r--){
      var rg = _rings[r];
      rg.t += dt;
      if(rg.t >= rg.life){
        if(sc && rg.mesh.parent) sc.remove(rg.mesh);
        if(rg.mesh.geometry) rg.mesh.geometry.dispose();
        if(rg.mesh.material) rg.mesh.material.dispose();
        _rings.splice(r, 1);
      } else {
        var pR = rg.t / rg.life;
        var escR = 1 + pR * 5.5;
        rg.mesh.scale.set(escR, escR, escR);
        rg.mesh.material.opacity = (1 - pR) * 0.9;
      }
    }

    // 4. Faíscas e partículas de alma
    for(var s = _sparks.length - 1; s >= 0; s--){
      var spk = _sparks[s];
      spk.t += dt;
      if(spk.t >= spk.life){
        if(sc && spk.sprite.parent) sc.remove(spk.sprite);
        if(spk.sprite.material) spk.sprite.material.dispose();
        _sparks.splice(s, 1);
      } else {
        var pS = spk.t / spk.life;
        if(spk.gravity) spk.vy -= spk.gravity * dt;
        spk.sprite.position.x += spk.vx * dt;
        spk.sprite.position.y += spk.vy * dt;
        spk.sprite.position.z += spk.vz * dt;
        var escS = spk.tamBase * (1 - pS * 0.65);
        spk.sprite.scale.set(escS, escS, 1);
        spk.sprite.material.opacity = (1 - pS);
      }
    }
  }

  requestAnimationFrame(loop);
})();
