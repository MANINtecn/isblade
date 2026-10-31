/* >>> CLAUDE [guardiao] 2026-10-27 — modulo de jogabilidade do Guardiao e das regras de classe por arma.
   Este arquivo e do Claude. O Gemini nao precisa editar aqui; os HTMLs so tem ganchos pequenos assinados com "CLAUDE [guardiao]".
   Regras (definidas com o usuario, estilo Albion Online):
     1) a ARMA define a classe (escudo = Guardiao, cajado = mago, ...);
     2) em combate nao troca de arma;
     3) fora de combate (sem hit dado/recebido por `saidaSegundos`, 60 s) libera a troca;
     4) trocar de arma nao zera o cooldown das skills (guardado por arma). */

import { criarFX } from './guardiao_fx.js?v=7';

export const Guardiao = (function(){
  var ctx = null;
  var G = {};

  /* ---------- classes por arma ---------- */
  G.CLASSES = { sword: 'Guerreiro', shield: 'Guardiao', staff: 'Mago', none: 'Desarmado' };
  G.className = function(wpn){ return G.CLASSES[wpn] || 'Aventureiro'; };

  /* ---------- estado de combate ---------- */
  var cfg = { saidaSegundos: 60 };
  var st = { em: false, ultimo: -1e9, motivo: '' };
  var cdPorArma = {};                       /* cooldowns guardados por arma: trocar nao zera */
  function agora(){ return performance.now() / 1000; }

  G.emCombate = function(){ return st.em; };
  G.segundosParaSair = function(){ return st.em ? Math.max(0, cfg.saidaSegundos - (agora() - st.ultimo)) : 0; };
  G.podeTrocarArma = function(){ return !st.em; };

  /* marca combate: dano dado, dano recebido, debuff, inimigo atacando. Entrar em combate saca o escudo (classe Guardiao). */
  G.tocar = function(motivo){
    st.ultimo = agora(); st.motivo = motivo || '';
    if(!st.em){
      st.em = true;
      if(ctx && ctx.getWPN() === 'shield') G.sacarEscudo();
      if(ctx && ctx.onCombate) ctx.onCombate(true);
    }
  };
  G.tick = function(dt){
    G.tickEfeitos(dt); if(FX) FX.update(dt); G.ajusteParado(dt);
    if(st.em && agora() - st.ultimo >= cfg.saidaSegundos){
      st.em = false;
      if(ctx && ctx.getWPN() === 'shield') G.guardarEscudo();
      if(ctx){ if(ctx.gestMsg) ctx.gestMsg('Fora de combate: ja pode trocar de arma.'); if(ctx.onCombate) ctx.onCombate(false); }
    }
  };
  /* pergunta antes de trocar de arma; devolve true se pode. Mostra o motivo se nao pode. */
  G.autorizaTroca = function(){
    if(G.podeTrocarArma()) return true;
    if(ctx && ctx.gestMsg) ctx.gestMsg('Em combate: nao da para trocar de arma (faltam ' + Math.ceil(G.segundosParaSair()) + ' s fora de combate).');
    return false;
  };
  /* cooldown por arma: salvo ao sair da arma e devolvido ao voltar, descontando o tempo que passou */
  G.salvarCd = function(wpn, cdArr){ cdPorArma[wpn] = { t: agora(), cd: cdArr.slice() }; };
  G.restaurarCd = function(wpn, cdArr){
    var r = cdPorArma[wpn]; if(!r) return;
    var dec = agora() - r.t;
    for(var i = 0; i < cdArr.length; i++) cdArr[i] = Math.max(0, (r.cd[i] || 0) - dec);
  };

  /* ---------- clipes (animacoes do Blender: assets/personagens/guardian_anims.glb) ---------- */
  var clipsPromise = null;
  G.carregarClipes = function(THREE, gltfLoader){
    if(!clipsPromise) clipsPromise = new Promise(function(ok){
      gltfLoader.load('assets/personagens/guardian_anims.glb?v=5', function(g){ ok(g.animations || []); }, undefined, function(){ ok([]); });
    });
    return clipsPromise;
  };
  /* junta os clipes g_* aos do personagem (mesmos nomes de osso); os clipes entram depois de ~100 ms, e sao usados por nome na hora de tocar */
  G.anexarClipes = function(rig, THREE){
    if(!rig || !rig.clips) return;
    var loader = (window._l2GltfLoader = window._l2GltfLoader || new THREE.GLTFLoader());
    G.carregarClipes(THREE, loader).then(function(list){
      /* retarget por rotacao: os clipes foram gravados no corpo do humano. Posicao e escala de osso do humano esticam as outras racas,
         entao so as rotacoes ficam; o quadril guarda o movimento (delta) e o osso do escudo mantem a posicao (voo da skill 6).
         A altura do quadril e calibrada POR RACA: mede onde caem os pes na guarda e ajusta ate pousarem no chao. */
      var pelvis = null, feet = []; rig.root.traverse(function(o){ if(o.name === 'Bip01_Pelvis') pelvis = o; var n = o.name.toLowerCase(); if(n.indexOf('foot') >= 0 && n.indexOf('toe') < 0 && n.indexOf('nub') < 0) feet.push(o); });
      rig.root.updateMatrixWorld(true); var wp = new THREE.Vector3(), kxz = 1;
      if(pelvis){ pelvis.getWorldPosition(wp); kxz = Math.max(.5, Math.min(1.6, (wp.y / rig.root.scale.y) / 25.9)); }
      var ref0 = [0, 0, 0]; list.forEach(function(c){ if(c.name === 'g_idle') c.tracks.forEach(function(t){ if(t.name === 'Bip01_Pelvis.position') ref0 = [t.values[0], t.values[1], t.values[2]]; }); });
      function build(src, ky){
        var c = src.clone(), tr = [];
        c.tracks.forEach(function(t){
          var dot = t.name.lastIndexOf('.'), node = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
          if(prop === 'scale') return;
          if(prop === 'position'){
            if(node === 'Shield_L_Bone'){ tr.push(t); return; }
            if(node === 'Bip01_Pelvis' && pelvis){
              var v = t.values.slice(), x0 = ref0[0], y0 = ref0[1], z0 = ref0[2];   /* referencia: quadril em pe (primeiro quadro do descanso do humano), nao o 1o quadro do proprio clipe */
              for(var i = 0; i < v.length; i += 3){ v[i] = pelvis.position.x + (v[i] - x0) * ky; v[i + 1] = pelvis.position.y + (v[i + 1] - y0) * ky; v[i + 2] = pelvis.position.z + (v[i + 2] - z0) * ky; }   /* os eixos do quadril sao locais (o vertical nao e o Y): escala o vetor inteiro */
              tr.push(new THREE.VectorKeyframeTrack(t.name, t.times, v));
            }
            return;
          }
          tr.push(t);
        });
        c.tracks = tr; return c;
      }
      /* menor altura (mundo) dos pes quando o clipe esta no instante 0 */
      var mx = new THREE.AnimationMixer(rig.root);
      function minFoot(clip){
        mx.stopAllAction(); var act = mx.clipAction(clip); act.reset().play(); mx.update(0); rig.root.updateMatrixWorld(true);
        var m = 1e9, v = new THREE.Vector3(); feet.forEach(function(f){ f.getWorldPosition(v); m = Math.min(m, v.y); }); act.stop(); mx.uncacheAction(clip); return m;
      }
      var ky = kxz, ref = rig.clips.idle || rig.clips.Wait_1HS, src0 = null; list.forEach(function(c){ if(c.name === 'g_guard') src0 = c; });
      if(pelvis && feet.length && src0 && ref){
        var ground = minFoot(ref), lo = .1, hi = 3; rig.guardiaoDbg = { ground: +ground.toFixed(3), idle: ref.name, guard: [.5, 1, 2].map(function(k){ return +minFoot(build(src0, k)).toFixed(3); }), feet: feet.map(function(f){ return f.name; }), scale: rig.root.scale.y };
        for(var it = 0; it < 14; it++){ ky = (lo + hi) / 2; if(minFoot(build(src0, ky)) > ground) lo = ky; else hi = ky; }   /* mais ky = quadril mais baixo = pes mais baixos */
        ky = (lo + hi) / 2;
      }
      mx.stopAllAction(); mx.uncacheRoot(rig.root);
      list.forEach(function(src){ var c = build(src, ky); rig.clips[c.name] = c; });
      rig.guardiaoClipes = list.length; rig.guardiaoK = +kxz.toFixed(2); rig.guardiaoKy = +ky.toFixed(2);
    });
  };

  /* esquiva por classe: lutador (tanker ao guerreiro, qualquer raca) usa a rolagem do Mixamo retargeteada (g_roll, tools/blender_fx/dodge_roll.py);
     mago usa o blink (m_blink: saltinho, giro vertical no ar e reaparece a frente, no mesmo alcance da rolagem). Devolve {nome, speed} ou null (cai no clipe antigo).
     speed encaixa o clipe na duracao da esquiva do jogo. */
  G.clipeEsquiva = function(rig, dur){
    if(!rig || !rig.clips) return null;
    var tipo = ''; try { tipo = (localStorage.getItem('isblade.char_type') || '').toLowerCase(); } catch(e){}
    var nome = tipo.indexOf('magic') >= 0 ? 'm_blink' : 'g_roll', c = rig.clips[nome];
    return c ? { nome: nome, speed: c.duration / Math.max(.2, dur) } : null;
  };

  /* clipe de parado/andando do escudo conforme esteja ou nao em combate (retorna null se nao for a classe) */
  G.clipeLoco = function(wpn, rig, tipo){
    if(wpn !== 'shield' || !rig || !rig.clips || !rig.clips.g_idle) return null;
    var c = rig.clips;
    if(tipo === 'guard') return 'g_guard';
    if(st.em){
      /* em combate: guarda e corrida de duas maos do proprio Lineage 2 da raca (balanco vivo); 'isblade.guardaL2' = '0' volta aos clipes do Blender */
      var l2 = true; try { l2 = localStorage.getItem('isblade.guardaL2') !== '0'; } catch(e){}
      if(l2) return tipo === 'run' ? (c.run ? 'run' : (c.g_run_rest ? 'g_run_rest' : null)) : (c.guard ? 'guard' : 'g_guard');
      return tipo === 'run' ? (c.g_run_rest ? 'g_run_rest' : null) : 'g_guard';
    }
    /* fora de combate: cada raca do Lineage 2 usa a propria animacao de descanso (nao forcamos a do humano) */
    if(tipo === 'idle') return c.Wait_1HS ? 'Wait_1HS' : (c.idle_hand ? 'idle_hand' : 'g_idle');
    if(tipo === 'run') return c.Run_1HS ? 'Run_1HS' : (c.run_hand ? 'run_hand' : null);
    return null;
  };
  G.sacarEscudo = function(){
    if(!ctx) return; var rig = ctx.getVrm();
    if(rig && rig.clips && rig.clips.g_draw) ctx.playClip(rig, 'g_draw', { once: true, speed: 1.1, fade: .08, hold: rig.clips.g_draw.duration / 1.1 });
  };
  G.guardarEscudo = function(){
    if(!ctx) return; var rig = ctx.getVrm();
    if(rig && rig.clips && rig.clips.g_sheathe) ctx.playClip(rig, 'g_sheathe', { once: true, speed: 1.1, fade: .08, hold: rig.clips.g_sheathe.duration / 1.1 });
  };

  /* ---------- clipes de ataque e skills: pose do jogo -> clipe do Blender, com tempo do golpe (fracao do clipe) ---------- */
  /* ataque basico (3 golpes) usa as poses 'sweep','thrust','spin' do jogo; as 6 skills usam g_s1..g_s6 (data/armas/shield.json).
     hit/cut = fracao do clipe em que o golpe acerta / em que a animacao termina (ja volta para a guarda); sp = velocidade. */
  var CM = {
    sweep:  { c: 'g_atk1',   sp: 2.0, hit: .58, cut: .86, lg: 2.6 },
    thrust: { c: 'g_atk2',   sp: 1.9, hit: .52, cut: .92, lg: 0 },
    spin:   { c: 'g_atk3',   sp: 1.7, hit: .58, cut: .82, lg: 0 },
    g_s1:   { c: 'l2_cast1', sp: 1.0, hit: .86, cut: .94, lg: 0, fz: 1.1 },      /* CastMid do L2 (1,79 s): escudo erguido = pose segurada (congela em fz s), impulso = liberacao (golpe em ~1,53 s) */
    g_s2:   { c: 'l2_s2', sp: 2.0, hit: .63, cut: .75, lg: 0 },       /* SpAtk03_2HS do L2: pulo + pancada ajoelhado com o escudo no chao (impacto em 1,03 s) */
    g_s3:   { c: 'l2_s3', sp: 2.0, hit: .95, cut: .995, lg: 0 },       /* CastLong do L2 (recortado, x1,6): invocacao com os bracos erguidos; a chuva cai ao baixar (2,10 s) */
    g_s4:   { c: 'l2_s4', sp: 1.0, hit: .41, cut: .53, lg: 0 },       /* Social_Atk do L2 (x1,3): gesto de desafio, escudo aberto e braco apontando (impacto em 0,85 s) */
    g_s5:   { c: 'l2_s5', sp: 1.0, hit: .445, cut: .58, lg: 0 },      /* Magicshot do L2: soco para a frente e braco subindo (impacto em 0,67 s) */
    g_s6:   { c: 'l2_s6', sp: 1.0, hit: .554, cut: .81, lg: 0, solta: 1.13 }   /* ShieldAtk_1HS do L2 + pausa final (2,58 s): o escudo e solto em 1,13 s e o voo e um escudo de energia separado */
  };
  G.clipeConfig = function(pose, rig){
    var m = CM[pose];
    return (m && rig && rig.clips && rig.clips[m.c]) ? m : null;
  };

  /* ---------- efeitos de estado das skills (reducao de dano, zona, puxao) ---------- */
  var buffs = { reflexoT: 0, defT: 0, zona: null, puxar: null };
  /* ---------- Escudo de Energia (skill 1), canalizada: segura a tecla = absorve o dano da frente (180 graus), enche um domo de colmeia e devolve ao soltar ----------
     nivel do reflexo pelo tempo segurado: 0-3 s = 50%, 3-5 s = 100%, 5 s = 200%. Sem golpe recebido na frente nao acumula nada e nao devolve. */
  var CANAL_T = 5, CANAL_CAP = .4, CANAL_FRAME = 120;               /* CANAL_CAP: dano (fracao da vida maxima) que fecha o domo todo */
  var canal = { ph: 0, t: 0, acc: 0, ctrl: null, dano: 0, mult: .5 };    /* ph: 0 parado, 1 aquecendo, 2 canalizando, 3 soltou */
  G.canal = canal;
  function fimCanal(){ if(canal.ctrl){ canal.ctrl.kill(); canal.ctrl = null; } canal.ph = 0; }
  function golpeNaFrente(S){                                         /* o atacante e o inimigo mais proximo; frente = ate 90 graus de cada lado da mira */
    var foes = ctx.getFoes ? ctx.getFoes() : [], best = null, bd = 1e9;
    foes.forEach(function(e){ var d = Math.hypot(e.x - S.px, e.z - S.pz); if(d < bd){ bd = d; best = e; } });
    if(!best) return true;
    var a = Math.atan2(best.x - S.px, best.z - S.pz) - S.face; while(a > Math.PI) a -= 6.2832; while(a < -Math.PI) a += 6.2832;
    return Math.abs(a) <= Math.PI / 2;
  }
  G.canalAtivo = function(){ return canal.ph === 2; };
  /* chamado a cada frame pelo tick da animacao da skill; devolve true enquanto a animacao deve ficar congelada na pose de carga */
  G.canalTick = function(an, dt){
    if(!ctx || !an || !an.skill || an.skill.pose !== 'g_s1' || ctx.getWPN() !== 'shield' || !FX) return false;
    if(canal.ph !== 2 || !canal.ctrl) return false;
    var S = ctx.getS(), cfg = CM.g_s1, rig = ctx.getVrm(), act = rig && rig.drv && rig.drv.cur, idx = G.dados.armas.shield.skills.indexOf(an.skill);
    canal.t += dt; S.stun = 0; canal.ctrl.tempo(canal.t);
    var l = canal.t >= 5 ? 2 : (canal.t >= 3 ? 1 : 0); if(l > (canal.lv || 0)){ canal.lv = l; canal.ctrl.pulso(); } canal.lv = l;
    if(S.skHeld === idx && canal.t < CANAL_T){                          /* segurando: o escudo e o domo ja estao ativos; a animacao congela na pose de carga */
      if(an.tt >= (cfg.fz ? cfg.fz / cfg.sp : sec(CANAL_FRAME, cfg.sp))){ if(act) act.paused = true; return true; }
      return false;
    }
    canal.ph = 3; if(act) act.paused = false;                            /* soltou (ou chegou aos 5 s): resolve o reflexo */
    canal.mult = canal.t >= 5 ? 2 : (canal.t >= 3 ? 1 : .5); canal.dano = Math.round(canal.acc * canal.mult);
    if(canal.dano <= 0){ an.hitT = 1e9; fimCanal(); }                  /* nada acumulado: sem golpe e sem efeito */
    else { an.dmg = canal.dano; an.skill = Object.assign({}, an.skill, { range: 15, half: Math.PI / 2 }); }
    return false;
  };
  /* LIBERACAO (agilidade): `cut` = fracao do clipe em que o personagem volta a agir = ultimo golpe + uma pequena recuperacao; o resto do clipe (a "cauda" em que o braco relaxa) e cortado,
     porque o jogo so libera ataque basico, skill, andar normal e guarda quando a animacao (S.anim) acaba. Recuperacao por skill (s depois do ultimo golpe): s1 .15, s2 .20, s3 .10, s4 .25, s5 .20, s6 .10
     (na 6 o escudo volta ~0,1 s depois). Antes liberava 0,4 a 1,1 s depois do golpe. */
  /* cancelar: SO depois do ultimo golpe. A regra padrao do jogo liberava aos 60% do clipe mesmo antes do golpe (a Chuva de Escudos perdia o efeito); aqui nunca ha skill por cima de skill
     nem golpe perdido. null = regra padrao do jogo (outras armas). */
  G.podeCancelar = function(an){
    if(!ctx || !an || !an.skill || !an.clipMode || ctx.getWPN() !== 'shield' || !CM[an.skill.pose]) return null;
    if(an.skill.pose === 'g_s1' && canal.ph === 2) return false;
    return an.hitList ? an.hi >= an.hitList.length : !!an.hit;
  };
  G.filtrarDano = function(d){
    if(!ctx || ctx.getWPN() !== 'shield' || d <= 0) return d;
    if(canal.ph === 2 && canal.ctrl && golpeNaFrente(ctx.getS())){      /* absorve tudo o que vem da frente e encaixa celulas no domo */
      var S0 = ctx.getS(), porCel = Math.max(1, (S0.pmax || 1000) * CANAL_CAP / canal.ctrl.total);
      canal.acc += d; canal.ctrl.enc(Math.max(1, Math.round(d / porCel))); return 0;
    }
    var f = 1;
    if(buffs.reflexoT > 0) f *= .5;                 /* Escudo de Energia: absorve metade do dano recebido */
    if(buffs.defT > 0) f *= .7;                     /* Rugido: +30% de defesa */
    var z = buffs.zona, S = ctx.getS();
    if(z && z.t > 0 && Math.hypot(S.px - z.x, S.pz - z.z) <= z.r) f *= .5;   /* Fortaleza Egide: metade do dano dentro da zona */
    return Math.max(1, Math.round(d * f));
  };

  /* ---------- efeitos visuais (js/guardiao_fx.js): 3D, com textura procedural, portados dos efeitos do Blender ---------- */
  var FX = null;
  var COR = { fogo: 0xff6a1a, ouro: 0xffc83a, brasa: 0xd62a10, quente: 0xfff0c8, aco: 0xcfd8e6, ambar: 0xff9a2a, roxo: 0x23095a, gelo: 0x4fa8ff, azulE: 0x2f7bff, branco: 0xf4fbff, ceu: 0x7fd2ff };
  function later(fn, sgs){ setTimeout(fn, sgs * 1000); }
  function sec(frame, sp){ return frame / 48 / sp; }              /* instante (s) de um frame do clipe, ja com a velocidade da skill */
  function shieldObj(){ var r = ctx && ctx.getVrm(); return r && r.shd ? r.shd : null; }
  function cfg6(){ return CM.g_s6.sp; }
  /* silhueta do escudo equipado (placa, bordas, espetos e miolo; sem couro nem empunhadura) como geometria do escudo de energia: o desenho da skill
     acompanha o modelo (evolucoes, outros escudos). Em pe e de frente (mesma orientacao da guarda), centrada, normalizada para 2 de altura. Guarda em cache no escudo. */
  function geoEscudo(r){
    var T = window.THREE, h = r && r.shd; if(!T || !h || !h.children.length) return null;
    if(h.userData.geoEn) return h.userData.geoEn;
    h.updateWorldMatrix(true, true);
    var inv = new T.Matrix4().copy(h.matrixWorld).invert(), q = G.guarda.q, rot = new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion(q[0], q[1], q[2], q[3]).normalize());
    var P = [], N = [], I = [], v = new T.Vector3(), M = new T.Matrix4();
    h.traverse(function(o){
      if(!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      var nome = (Array.isArray(o.material) ? o.material[0] : o.material).name; if(nome === 'is_handle' || nome === 'is_leather') return;
      M.copy(rot).multiply(inv).multiply(o.matrixWorld); var nm = new T.Matrix3().getNormalMatrix(M), pa = o.geometry.attributes.position, na = o.geometry.attributes.normal, base = P.length / 3, i;
      for(i = 0; i < pa.count; i++){ v.fromBufferAttribute(pa, i).applyMatrix4(M); P.push(v.x, v.y, v.z); if(na){ v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z); } else N.push(0, 0, 1); }
      if(o.geometry.index){ for(i = 0; i < o.geometry.index.count; i++) I.push(base + o.geometry.index.getX(i)); } else for(i = 0; i < pa.count; i++) I.push(base + i);
    });
    if(!P.length) return null;
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], i, k; for(i = 0; i < P.length; i += 3) for(k = 0; k < 3; k++){ mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
    var H = mx[1] - mn[1], s = 2 / H, c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    for(i = 0; i < P.length; i += 3) for(k = 0; k < 3; k++) P[i + k] = (P[i + k] - c[k]) * s;
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setIndex(I);
    return (h.userData.geoEn = { geo: g, altura: H * (r.root.scale.y || 1), largura: (mx[0] - mn[0]) * (r.root.scale.y || 1), rinv: new T.Quaternion(q[0], q[1], q[2], q[3]).normalize().invert(), c: c, s: s });
  }

  /* no instante do disparo (cast): efeitos que acompanham o escudo antes do golpe */
  G.aoCastar = function(sk){
    if(!ctx || !FX || !sk || ctx.getWPN() !== 'shield') return;
    var S = ctx.getS(), cfg = CM[sk.pose]; if(!cfg) return;
    if(sk.pose === 'g_s1'){                                          /* canalizada: o domo e o escudo astral nascem quando a animacao chega na pose de carga (G.canalTick) */
      fimCanal(); canal.ph = 2; canal.lv = 0; canal.acc = 0; canal.t = 0; canal.dano = 0;               /* o escudo astral e o domo aparecem NA HORA do cast */
      canal.ctrl = FX.domo({ info: geoEscudo(ctx.getVrm()), getPos: function(){ var s = ctx.getS(); return { x: s.px, z: s.pz, face: s.face }; } });
    } else if(sk.pose === 'g_s6'){                                   /* o escudo do braco vira um disco de energia que voa ate 5,7 m, segura um instante e volta; o escudo real some do braco enquanto isso */
      var gc6 = geoEscudo(ctx.getVrm()), ev6 = FX.add(null, .01, null, cfg.solta || 1.13), al6 = (ctx.getS().anim && ctx.getS().anim.alvo) || null;      /* [mira] ponto mirado (se houver) */
      ev6.done = function(){
        var S6 = ctx.getS(), o6 = shieldObj(), T6 = window.THREE, hp6 = o6 ? o6.getWorldPosition(new T6.Vector3()) : { x: S6.px, y: 1.3, z: S6.pz };
        if(!gc6){ return; }
        if(o6) o6.visible = false;
        var d6 = al6 ? Math.hypot(al6.x - S6.px, al6.z - S6.pz) : 5.7, f6 = al6 ? Math.atan2(al6.x - S6.px, al6.z - S6.pz) : S6.face;      /* o escudo vai ao PONTO travado no lancamento, mesmo que o jogador ja tenha virado/andado */
        var vo = FX.escudoVoo({ info: gc6, from: { x: hp6.x, y: hp6.y, z: hp6.z }, face: f6, dist: Math.max(2, d6), tOut: al6 ? Math.min(.45, .3 * Math.sqrt(Math.max(2, d6) / 5.7)) : .3, tHold: .12, tBack: .55, color: COR.fogo, hot: COR.quente, edge: COR.ouro,
          getHand: function(){ var oo = shieldObj(); return oo ? oo.getWorldPosition(new T6.Vector3()) : null; }, onEnd: function(){ var oo = shieldObj(); if(oo) oo.visible = true; } });
        FX.trilha(function(){ return vo.obj ? vo.obj.position.clone() : null; }, { color: COR.fogo, hot: COR.quente, width: .55, life: 1.2, n: 30 });
        FX.seguir(function(){ return vo.obj; }, function(grp){ return FX.espetosGirando(grp, {}); }, 1.0, 0);
      };
    }
  };

  /* ---------- ataque padrao (3 golpes): sweep = investida + pancada (g_atk1), thrust = giro de 360 (g_atk2), spin = salto + pancada no chao (g_atk3, so ele quebra o chao) ----------
     paleta: aco/branco quente + faiscas douradas + poeira de pedra. aoAtacar roda quando o golpe comeca (rastro, poeira); fxBasico roda no impacto. */
  function posEscudo(){ var o = shieldObj(); return o ? o.getWorldPosition(new window.THREE.Vector3()) : null; }
  G.aoAtacar = function(an){
    if(!ctx || !FX || !an || an.skill || ctx.getWPN() !== 'shield') return;
    var cfg = CM[an.id], rig = ctx.getVrm(), clip = rig && cfg && rig.clips[cfg.c]; if(!clip) return;
    var hit = clip.duration / cfg.sp * cfg.hit, S = ctx.getS(), f = ctx.fx.fwd(S.face);
    function pe(dx, dz, n, size){ var s = ctx.getS(); FX.humo(s.px + dx, s.pz + dz, { n: n, size: size }); }
    if(an.id === 'sweep'){
      later(function(){ pe(-f[0] * .6, -f[1] * .6, 5, 1.1); }, hit * .1);
      FX.trilha(posEscudo, { color: COR.aco, hot: COR.quente, width: .55, life: hit * .5 + .4, n: 26, lag: hit * .5 });
    } else if(an.id === 'thrust'){
      FX.trilha(posEscudo, { color: COR.aco, hot: COR.quente, width: .8, life: hit * .7 + .5, n: 34, lag: hit * .3 });
      FX.trilha(function(){ var p = posEscudo(); if(p) p.y += .55; return p; }, { color: COR.ambar, hot: COR.quente, width: .4, life: hit * .7 + .5, n: 30, lag: hit * .34 });
      [.3, .5, .7].forEach(function(k, i){ later(function(){ var s = ctx.getS(); FX.casca(s.px, .25 + i * .55, s.pz, { r0: 1.0, r1: 1.7 + i * .2, h0: .4, h1: .5, life: .5, color: COR.aco, hot: COR.branco, power: .5, ns: 3, flow: -6, alpha: .55 }); }, hit * k); });
    } else if(an.id === 'spin'){
      later(function(){ pe(-f[0] * .4, -f[1] * .4, 4, 1.2); }, hit * .12);
      FX.trilha(posEscudo, { color: COR.ambar, hot: COR.quente, width: .32, life: hit * .6 + .35, n: 30, lag: hit * .4 });
    }
  };
  G.fxBasico = function(an){
    if(!ctx || !FX || !an || an.skill || ctx.getWPN() !== 'shield') return false;
    var S = ctx.getS(), f = ctx.fx.fwd(S.face), px = S.px, pz = S.pz, sh = ctx.shake, ix = px + f[0] * 1.8, iz = pz + f[1] * 1.8;
    if(an.id === 'sweep'){
      FX.espetos(ix, 1.3, iz, { n: 14, seed: 71, size: 2.4, color: COR.ouro, hot: COR.quente, life: .4 });
      FX.casca(ix, 0, iz, { r0: .5, r1: 2.2, h0: .35, h1: .3, life: .5, color: COR.aco, hot: COR.branco, power: .55, ns: 3, flow: -5, alpha: .6, expand: 'out' });
      FX.humo(ix, iz, { n: 4, size: 1.0 }); FX.brasas(ix, .4, iz, { n: 14, spread: 1.4, rise: 1.6, color: COR.ouro, life: 1.0, size: .16 }); FX.luz(ix, 1.2, iz, { color: COR.ouro, intensity: 35, life: .3 }); sh(.18);
    } else if(an.id === 'thrust'){
      FX.casca(px, 0, pz, { r0: 1.0, r1: 3.8, h0: .55, h1: .45, life: .6, color: COR.aco, hot: COR.branco, power: .5, ns: 2.6, flow: -6, alpha: .7, expand: 'out' });
      FX.espetos(px + f[0] * 1.2, 1.2, pz + f[1] * 1.2, { n: 18, seed: 72, size: 3, color: COR.ouro, hot: COR.quente, life: .45 });
      for(var i = 0; i < 4; i++){ var a = S.face + i * 1.5708 + .6; FX.humo(px + Math.sin(a) * 1.4, pz + Math.cos(a) * 1.4, { n: 2, size: .9 }); }
      FX.brasas(px, .5, pz, { n: 18, spread: 2.2, rise: 1.8, color: COR.ouro, life: 1.0, size: .16 }); FX.luz(px, 1.3, pz, { color: COR.quente, intensity: 40, life: .35 }); sh(.22);
    } else if(an.id === 'spin'){                                     /* golpe final: o escudo racha o chao */
      FX.cratera(ix, iz, { R: 1.4, life: 3 }); FX.rachaduras(ix, iz, { R: 3.4, seed: 73, n: 10, life: 3, hold: .8, color: COR.fogo });
      FX.casca(ix, 0, iz, { r0: .6, r1: 4.0, h0: .6, h1: .5, life: .6, color: COR.ambar, hot: COR.quente, power: .5, ns: 2.6, flow: -6, alpha: .75, expand: 'out' });
      FX.espetos(ix, 1.0, iz, { n: 22, seed: 74, size: 3.4, color: COR.fogo, hot: COR.quente, life: .6 });
      FX.rochas(ix, iz, { n: 7, sz: [.12, .3], spd: [1.5, 3.5], vz: [4, 7.5], rad: [.3, 1.4] }); FX.humo(ix, iz, { n: 7, size: 1.3 });
      FX.brasas(ix, .3, iz, { n: 24, spread: 2.6, rise: 3, color: COR.ouro, life: 1.8, size: .2 }); FX.luz(ix, 1.4, iz, { color: COR.ouro, intensity: 60, life: .5 }); sh(.4);
    } else return false;
    return true;
  };

  /* no golpe (impacto da animacao): a explosao da skill */
  G.log = [];
  G.fxSwing = function(an){
    G.log.push((an.skill ? an.skill.pose : '?') + ':' + (an.part || 1) + '@' + agora().toFixed(2));
    var sk = an.skill; if(!sk || !ctx || !FX) return; var S = ctx.getS(), f = ctx.fx.fwd(S.face), px = S.px, pz = S.pz, sh = ctx.shake;
    if(sk.pose === 'g_s1'){                                          /* escudo de energia: cone de 90 graus por 5 m */
      if(canal.ctrl){ canal.ctrl.soltar(); canal.ctrl = null; }          /* o domo se expande ate 10 m; o dano refletido ja foi aplicado pelo golpe */
      FX.espetos(px + f[0] * 1.2, 1.2, pz + f[1] * 1.2, { n: 20, seed: 11, size: 3, color: COR.gelo, hot: COR.branco, life: .5 });
      FX.brasas(px + f[0] * 2, .3, pz + f[1] * 2, { n: 26, spread: 3, rise: 2.2, color: COR.ceu, life: 1.4, size: .2 }); FX.luz(px + f[0] * 1.5, 1.3, pz + f[1] * 1.5, { color: COR.gelo, intensity: 70, life: .6 });
      sh(.35);
    } else if(sk.pose === 'g_s2'){                                   /* fortaleza egide: zona de 6 m por 8 s */
      buffs.zona = { x: px, z: pz, r: 6, t: 8, ang: 0, acc: 0, dano: Math.max(1, Math.round(sk.dmg * .3)) };   /* o domo gira: a cada .5 s corta quem esta dentro (dano = 30% do da skill) e cura mais que o golpe comum */
      FX.runas(px, pz, { r: 6.4, life: 8 }); FX.cupula(px, pz, { r: 6, life: 8 });
      [0, .16, .32].forEach(function(l, i){ FX.anel(px, pz, { r0: .8, r1: 7 + i * 1.5, color: i ? COR.ambar : COR.ouro, life: 1.1, lag: l }); });
      FX.cratera(px, pz, { R: 1.6, life: 8 }); FX.rachaduras(px, pz, { R: 5, seed: 31, n: 12, life: 8, hold: .75, color: COR.fogo });
      FX.espetos(px, 1.2, pz, { n: 24, seed: 41, size: 3.6, color: COR.fogo, life: .8 }); FX.rochas(px, pz, { n: 7, sz: [.18, .4], spd: [1.5, 4], vz: [5, 9], rad: [.5, 2] });
      FX.humo(px, pz, { n: 8, size: 1.3 }); FX.brasas(px, .2, pz, { n: 26, spread: 4.5, rise: 5, color: COR.ouro, life: 2.6 }); FX.luz(px, 2, pz, { color: COR.ouro, intensity: 55, life: .6 }); sh(.45);
    } else if(sk.pose === 'g_s3'){                                   /* chuva de escudos: 18 escudos caem num leque de 180 graus */
      var N = 18;
      for(var k = 0; k < N; k++){ (function(kk){
        var a = S.face + FX.rr(-1.55, 1.55), r = FX.rr(2.2, sk.range - .5), x = px + Math.sin(a) * r, z = pz + Math.cos(a) * r, lag = kk * .018;
        FX.escudoFantasma(x, z, { h: 12, size: FX.rr(1.0, 1.5), lag: lag, onLand: function(lx, lz){
          FX.anel(lx, lz, { r0: .3, r1: 2.2, color: COR.ambar, life: .45 }); FX.espetos(lx, .7, lz, { n: 10, seed: 50 + kk, size: 1.5, color: COR.fogo, life: .45, bw: .028 });
          FX.rachaduras(lx, lz, { R: 1.6, seed: 60 + kk, n: 7, life: 2.2, hold: .5, open: .1, color: COR.fogo }); FX.humo(lx, lz, { n: 2, size: .7 }); if(kk % 3 === 0) FX.rochas(lx, lz, { n: 2, sz: [.08, .16], spd: [1, 2.5], vz: [3, 6], rad: [.1, .4] });
        } });
      })(k); }
      FX.anel(px + f[0] * 6, pz + f[1] * 6, { r0: 1, r1: 9, color: COR.ouro, life: .8, lag: .32 }); sh(.5);
    } else if(sk.pose === 'g_s4'){                                   /* rugido: coluna dourada, aneis no chao, +30% de defesa por 6 s */
      buffs.defT = 6;
      FX.casca(px, 0, pz, { r0: 1.1, r1: 1.5, h0: 3, h1: 11, life: 1.0, color: COR.ouro, hot: COR.quente, power: .55, ns: 2.2, flow: -3.4 });
      FX.casca(px, 0, pz, { r0: .45, r1: .6, h0: 3, h1: 10, life: .8, color: COR.quente, hot: COR.quente, power: .5, ns: 3, flow: -4.5 });
      [0, .2, .4].forEach(function(l, i){ FX.anel(px, pz, { r0: .8, r1: 10, color: i % 2 ? COR.fogo : COR.ouro, life: 1.2, lag: l }); });
      FX.runas(px, pz, { r: 5.5, life: 3.4, color: COR.ouro }); FX.espetos(px, 1.4, pz, { n: 20, seed: 71, size: 3.2, color: COR.ouro, life: .8 });
      FX.brasas(px, .2, pz, { n: 30, spread: 3, rise: 6, color: COR.ouro, life: 3 }); FX.humo(px, pz, { n: 8, size: 1.2 }); FX.luz(px, 3, pz, { color: COR.ouro, intensity: 50, life: .7 }); sh(.7);
    } else if(sk.pose === 'g_s5'){                                   /* correntes: leque de 45 graus ate 14 m, garras roxas */
      FX.correntes(px, pz, S.face, { n: 6, half: .39, len: sk.range, fly: .3, hold: .55, back: .45 });
      FX.anel(px + f[0] * 1.6, pz + f[1] * 1.6, { r0: .4, r1: 2.6, color: COR.brasa, life: .5 }); FX.espetos(px + f[0] * 1.2, .5, pz + f[1] * 1.2, { n: 10, seed: 81, size: 1.7, color: COR.fogo, life: .45 });
      FX.rachaduras(px + f[0] * 1.5, pz + f[1] * 1.5, { R: 3, seed: 91, n: 9, life: 3, hold: .6, color: COR.fogo }); FX.luz(px + f[0], 1, pz + f[1], { color: COR.fogo, intensity: 30, life: .4 });
    } else if(sk.pose === 'g_s6'){                                   /* arremesso: crava a 5,7 m, explode; ao voltar, destroi o local */
      var tx = an.alvo ? an.alvo.x : px + f[0] * 5.7, tz = an.alvo ? an.alvo.z : pz + f[1] * 5.7, pt = an.part || 1, first = pt === 1;      /* cai onde o jogador mirou (ate 10 m) */
      if(pt === 2 || pt === 3 || pt === 5 || pt === 6){                   /* golpes extras (3 na ida, 3 na volta): pulso curto no mesmo ponto */
        var volta = pt > 3, cp = volta ? COR.ouro : COR.fogo;
        FX.anel(tx, tz, { r0: .5, r1: volta ? 8 : 5.5, color: cp, life: .35 }); FX.espetos(tx, 1.2, tz, { n: 10, seed: 70 + pt, size: volta ? 4.6 : 3.4, bw: .028, color: cp, life: .4 });
        FX.brasas(tx, .2, tz, { n: 8, spread: 2, rise: 3, color: COR.ouro, life: 1 }); FX.luz(tx, 2, tz, { color: cp, intensity: 35, life: .3 }); sh(.15);
      } else if(first){
        FX.espetos(tx, 1.2, tz, { n: 26, seed: 11, size: 5.4, bw: .03, color: COR.fogo, life: .9 }); FX.espetos(tx, 1.2, tz, { n: 16, seed: 29, size: 4, bw: .022, color: COR.ouro, life: .75, lag: .02 });
        FX.casca(tx, 0, tz, { r0: .6, r1: 6.5, h0: .9, h1: 1.5, life: .55, color: COR.fogo, hot: COR.quente, vert: 'fade', power: 1.1, ns: 3.2, flow: -1.5, expand: 'out' });
        FX.anel(tx, tz, { r0: .5, r1: 6.5, color: COR.ouro, life: .7 }); FX.anel(tx, tz, { r0: .5, r1: 4.6, color: COR.quente, life: .6, lag: .08 });
        FX.cratera(tx, tz, { R: 2.3, life: sec(150, cfg6()) + 3 }); FX.rachaduras(tx, tz, { R: 5, seed: 12, n: 11, life: 3.2, hold: .75, color: COR.fogo });
        FX.rochas(tx, tz, { n: 6, sz: [.15, .35], spd: [1.5, 3.5], vz: [5, 9], rad: [.3, 1.2] }); FX.humo(tx, tz, { n: 8, size: 1.1 }); FX.brasas(tx, .2, tz, { n: 14, spread: 2.2, rise: 3, color: COR.ouro, life: 1.8 });
        FX.luz(tx, 2, tz, { color: COR.ambar, intensity: 55, life: .5 }); sh(.4);
      } else {
        FX.casca(tx, 0, tz, { r0: 1, r1: 3, h0: 6, h1: 12, life: 1.0, color: COR.ouro, hot: COR.quente, power: .5, ns: 2.4, flow: -3.6 });
        FX.espetos(tx, 1.5, tz, { n: 22, seed: 41, size: 7.5, bw: .03, color: COR.ouro, life: 1.1 }); FX.espetos(tx, 1.5, tz, { n: 14, seed: 53, size: 5.5, bw: .022, color: COR.fogo, life: .95, lag: .02 });
        FX.casca(tx, 0, tz, { r0: .8, r1: 11, h0: 1.4, h1: 2.2, life: .8, color: COR.fogo, hot: COR.quente, vert: 'fade', power: 1.1, ns: 3, flow: -1.6, expand: 'out' });
        FX.anel(tx, tz, { r0: .8, r1: 9, color: COR.fogo, life: 1.0 }); FX.anel(tx, tz, { r0: .8, r1: 7, color: COR.ouro, life: .9, lag: .12 });
        FX.cratera(tx, tz, { R: 4.8, life: 4 }); FX.rachaduras(tx, tz, { R: 10, seed: 31, n: 13, life: 4.2, hold: .8, color: COR.fogo, ws: 1.4 });
        FX.rochas(tx, tz, { n: 16, sz: [.25, .65], spd: [2, 6], vz: [8, 15], rad: [.5, 2.5], hold: 3.6 }); FX.humo(tx, tz, { n: 14, size: 1.6, spread: 1.4 });
        FX.brasas(tx, .2, tz, { n: 28, spread: 4, rise: 5.5, color: COR.ouro, life: 2.8 }); FX.luz(tx, 3, tz, { color: COR.ouro, intensity: 70, life: .7 }); sh(.8);
      }
    }
  };
  /* ao acertar: faiscas e o puxao da corrente */
  G.fxHit = function(an, hx, hz){
    var sk = an.skill; if(!sk || !ctx || !FX) return; var S = ctx.getS();
    FX.espetos(hx, 1.5, hz, { n: 10, seed: 17, size: 1.5, color: COR.fogo, life: .4, bw: .026 }); FX.brasas(hx, 1, hz, { n: 8, spread: .8, rise: 1.6, color: COR.ouro, life: .9 });
    /* o puxao dos mobs comuns e em arena.html (hitMobs); o chefe nunca e puxado */
  };

  G.tickEfeitos = function(dt){
    if(!ctx) return; var S = ctx.getS();
    if(canal.ph === 2 && (!S.anim || !S.anim.skill || S.anim.skill.pose !== 'g_s1')){                  /* canalizacao interrompida (golpe pelas costas, esquiva...) */
      var r0 = ctx.getVrm(), a0 = r0 && r0.drv && r0.drv.cur; if(a0) a0.paused = false; fimCanal();
    }
    if(canal.ph === 3 && !S.anim) canal.ph = 0;
    if(buffs.reflexoT > 0) buffs.reflexoT -= dt;
    if(buffs.defT > 0) buffs.defT -= dt;
    if(buffs.zona){
      var zn = buffs.zona; zn.t -= dt; zn.ang += dt * 4.2; zn.acc += dt;
      if(zn.acc >= .5){ zn.acc -= .5; GIRO = true; try{ if(ctx.domoDano) ctx.domoDano(zn.x, zn.z, zn.r, zn.dano); } finally { GIRO = false; }
        if(ctx.fx && ctx.fx.slashArc){ ctx.fx.slashArc(zn.x, zn.z, zn.ang, 0xffc83a, 5.2, 1.4); ctx.fx.slashArc(zn.x, zn.z, zn.ang + Math.PI, 0xff8a2a, 5.2, 1.4); } }
      if(zn.t <= 0) buffs.zona = null;
    }
    var p = buffs.puxar;
    if(p){                                                       /* o alvo vem ate a frente do escudo */
      p.t += dt; var k = Math.min(1, p.t / p.dur), e = S.en;
      if(e && e.cx !== undefined){ e.cx += (p.tx - e.cx) * Math.min(1, dt * 9); e.cz += (p.tz - e.cz) * Math.min(1, dt * 9); }
      S.ex += (p.tx - S.ex) * Math.min(1, dt * 9); S.ez += (p.tz - S.ez) * Math.min(1, dt * 9);
      if(k >= 1) buffs.puxar = null;
    }
  };
  G.buffs = buffs;
  /* Fortaleza Egide: dentro da zona (8 s) parte do dano causado volta como vida. Equilibrado: 10% do dano; devolve a cura (o jogo aplica). */
  var DRENO = .10, DRENO_GIRO = .35, GIRO = false;   /* o golpe do domo girando cura 35% (o comum, 10%) */
  G.drenar = function(dmg){
    if(!ctx || ctx.getWPN() !== 'shield' || !(dmg > 0)) return 0; var z = buffs.zona, S = ctx.getS();
    if(!z || z.t <= 0 || Math.hypot(S.px - z.x, S.pz - z.z) > z.r) return 0;
    var h = Math.max(1, Math.round(dmg * (GIRO ? DRENO_GIRO : DRENO)));
    if(FX) FX.brasas(S.px, .3, S.pz, { n: 6, spread: .7, rise: 2.4, color: 0x8dffa8, life: .8, size: .14 });
    return h;
  };

  G.init = function(c, dados){
    ctx = c; G.dados = dados; if(c.getScene && window.THREE) FX = criarFX(window.THREE, { getScene: c.getScene, getCamera: c.getCamera, compile: c.compile });
    if(FX && FX.aquecer) [2000, 6000, 12000].forEach(function(ms){ setTimeout(function(){ G.aquecer(); }, ms); });        /* compila os efeitos antes da 1a skill (evita a travada); repete porque o cenario termina de carregar depois (as repeticoes sao baratas: o que ja esta compilado nao recompila) */
    if(dados && dados.estadoCombate && dados.estadoCombate.saidaSegundos) cfg.saidaSegundos = dados.estadoCombate.saidaSegundos;
    /* teste rapido no console: Guardiao.estado() */
    window.Guardiao = G;
  };
  G.debug = function(){ var r = ctx && ctx.getVrm(); return { wpn: ctx && ctx.getWPN(), clipesG: r ? Object.keys(r.clips).filter(function(k){ return k.indexOf('g_') === 0; }) : null, atual: r && r.drv ? r.drv.curName : null, isL2: r ? !!r.isL2 : null, nClipes: r && r.clips ? Object.keys(r.clips).length : null, anexou: r ? (r.guardiaoClipes || 0) : null }; };
  /* teste visual sem chefe: toca o clipe da skill (1..6) e dispara os efeitos nos mesmos instantes do jogo */
  G.teste = function(n){
    var sk = G.dados && G.dados.armas.shield.skills[n - 1]; if(!sk || !ctx) return;
    var cfg = CM[sk.pose], rig = ctx.getVrm(), clip = rig && rig.clips[cfg.c]; if(!clip) return;
    var base = clip.duration / cfg.sp; ctx.playClip(rig, cfg.c, { once: true, speed: cfg.sp, fade: .08, hold: base * cfg.cut });
    G.aoCastar(sk);
    (sk.hits || [cfg.hit]).forEach(function(fr, i){ later(function(){ G.fxSwing({ skill: sk, part: i + 1, parts: (sk.hits || [1]).length }); }, base * fr); });
  };
  G.testeAtaque = function(id){                                      /* teste visual do ataque padrao: 'sweep' | 'thrust' | 'spin' */
    var cfg = CM[id], rig = ctx && ctx.getVrm(), clip = rig && cfg && rig.clips[cfg.c]; if(!clip) return;
    var base = clip.duration / cfg.sp; ctx.playClip(rig, cfg.c, { once: true, speed: cfg.sp, fade: .08, hold: base * cfg.cut });
    G.aoAtacar({ id: id }); later(function(){ G.fxBasico({ id: id }); }, base * cfg.hit);
  };
  G.rig = function(){ var r = ctx && ctx.getVrm(), pv = null, hd = null; if(!r) return null; r.root.traverse(function(o){ if(o.name === 'Bip01_Pelvis') pv = o; if(o.name === 'Bip01_head') hd = o; }); return pv ? { pelvis: pv.position.toArray().map(function(n){ return +n.toFixed(1); }), k: r.guardiaoK, ky: r.guardiaoKy, dbg: r.guardiaoDbg } : 'sem pelvis'; };
  /* modelo do escudo (desenvolvimento): padrao = escudo IS feito no Blender (shield_is.glb, ja no espaco do osso Shield_L_Bone, sem correcao de eixo L2);
     localStorage 'isblade.escudo' = 'l2' volta ao composite_shield.glb original */
  G.escudoModelo = function(){
    var l2 = false; try { l2 = localStorage.getItem('isblade.escudo') === 'l2'; } catch(e){}
    return l2 ? { url: 'assets/personagens/composite_shield.glb', isL2: true } : { url: 'assets/personagens/shield_is.glb?v=4', isL2: false };
  };
  /* pre-aquecimento: roda UMA vez, longe do jogador (x=z=4000, fora da tela), o codigo real dos efeitos das 6 skills e dos 3 golpes e compila os shaders antes da 1a skill.
     guarda e devolve o que esse codigo mexe (posicao, buffs, tremor, arma) e nenhum efeito chega a ser desenhado perto do jogador. */
  G.aquecer = function(){
    if(!ctx || !FX || !FX.aquecer) return; G._quente = (G._quente || 0) + 1;
    var S = ctx.getS(), skills = G.dados && G.dados.armas && G.dados.armas.shield ? G.dados.armas.shield.skills : [];
    var sv = { px: S.px, pz: S.pz, face: S.face, shake: ctx.shake, wpn: ctx.getWPN, buffs: { reflexoT: buffs.reflexoT, defT: buffs.defT, zona: buffs.zona, puxar: buffs.puxar } };
    try {
      FX.aquecer(function(){
        S.px = 4000; S.pz = 4000; S.face = 0; ctx.shake = function(){}; ctx.getWPN = function(){ return 'shield'; };
        skills.forEach(function(sk, i){ try { G.fxSwing({ skill: sk, part: 1, parts: 1 }); } catch(e){} });
        ['sweep', 'thrust', 'spin'].forEach(function(id){ try { G.fxBasico({ id: id }); } catch(e){} });
      });
    } catch(e){ console.warn('aquecer:', e); }
    finally {
      S.px = sv.px; S.pz = sv.pz; S.face = sv.face; ctx.shake = sv.shake; ctx.getWPN = sv.wpn;
      buffs.reflexoT = sv.buffs.reflexoT; buffs.defT = sv.buffs.defT; buffs.zona = sv.buffs.zona; buffs.puxar = sv.buffs.puxar;
    }
  };
  G.cena = function(){ return ctx ? { wpn: ctx.getWPN(), vrm: ctx.getVrm(), camera: ctx.getCamera && ctx.getCamera(), scene: ctx.getScene && ctx.getScene(), fx: FX, S: ctx.getS() } : null; };  /* acesso de depuracao (capturas de teste) */
  G.shd = function(ox, oy, oz, rx, ry, rz){ var r = ctx && ctx.getVrm(); if(!r || !r.shd) return null; var h = r.shd; if(!h.userData.base0) h.userData.base0 = { p: h.position.clone(), r: h.rotation.clone() }; var b = h.userData.base0; h.position.set(b.p.x + (ox||0), b.p.y + (oy||0), b.p.z + (oz||0)); h.rotation.set(b.r.x + (rx||0), b.r.y + (ry||0), b.r.z + (rz||0)); return { p: b.p.toArray(), r: [b.r.x, b.r.y, b.r.z], parent: h.parent && h.parent.name }; };
  /* ---------- posicao do escudo na pose parada, por raca (o escudo anda no osso da mao; cada raca tem a mao em lugar diferente) ----------
     x/y/z em METROS do jogo (eixos do osso do escudo: x- e y- e z+ aproximam do corpo), r = giro em radianos. Em combate volta a zero. */
  var AJ = {
    darkelf_f: { x: .18 },
    dwarf_f:   { x: .12, rx: -.25 },
    dwarf_m:   { x: -.15 },
    orc_f:     { x: -.2 },
    orc_m:     { x: -.2 }
  };
  /* guarda do L2 (clipe 'guard', duas maos no quadril): o escudo ficaria deitado ao longo da perna; este ajuste o levanta para a frente do corpo.
     mesmo formato de AJ (metros do jogo e radianos), somado ao ajuste por raca; G.guardaAj pode ser mudado no console para afinar. */
  /* na guarda o escudo e posto em relacao ao CORPO (nao ao osso, cujos eixos mudam de raca para raca): em pe, face para a frente (quaternion no espaco do personagem),
     a 'off' da mao esquerda (unidades do modelo, escaladas pela raca) — assim acompanha o balanco da guarda do L2. Medido no humano; mude G.guarda no console para afinar. */
  G.guarda = { off: [-3.1, 7, 6], q: [.70, -.44, -.19, .52] };
  /* aparencia do escudo IS: metal puro sem reflexo de ambiente fica preto no jogo, entao menos metal, cor viva e um brilho proprio por material (nomes do glb) */
  var ESTILO = {
    is_steel:   { c: 0x7d8696, m: .25, r: .45, e: 0x0b0f16, ei: .3 },   /* placa: aco claro */
    is_trim:    { c: 0xf5c24a, m: .2,  r: .35, e: 0x6b4200, ei: .55 },    /* bordas e espetos: ouro */
    is_logo:    { c: 0xd8ecff, m: .35, r: .22, e: 0x3d8bff, ei: .75 },   /* miolo com o logo IS: brilho azul */
    is_leather: { c: 0x7a4422, m: 0,   r: .8,  e: 0x1a0c04, ei: .4 },
    is_handle:  { c: 0x9aa2b0, m: .6,  r: .4,  e: 0x10141c, ei: .4 }
  };
  G.estilo = ESTILO;
  function vestirEscudo(h){
    if(h.userData.vestido || !h.children.length) return; var n = 0;
    h.traverse(function(o){
      if(!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
        var s = ESTILO[m.name]; if(!s) return; n++;
        m.color.setHex(s.c); m.metalness = s.m; m.roughness = s.r; m.envMapIntensity = 2;
        if(m.emissive){ m.emissive.setHex(s.e); m.emissiveIntensity = s.ei; } m.needsUpdate = true;
      });
    });
    if(n) h.userData.vestido = true;
  }
  /* repouso (fora de combate): em pe ao lado da perna esquerda, face para fora, tambem em relacao ao CORPO (o repouso do L2 deixa a mao em lugar diferente em cada raca e o escudo
     saia como uma tabua na diagonal). yaw gira a pose da guarda em torno do vertical (pi/2 = face para a esquerda do personagem). G.repouso pode ser mudado no console. */
  G.repouso = { off: [3, 7, -2], yaw: 1.5708 };
  var ajK = 0, gK = 0, rK = 0, _g = null, _qr = null;
  function guardaPose(r, h, off, qa, w){
    var T = window.THREE; if(!T) return;
    if(!_g) _g = { m: new T.Matrix4(), inv: new T.Matrix4(), hp: new T.Vector3(), q: new T.Quaternion(), s: new T.Vector3(1, 1, 1), tp: new T.Vector3(), tq: new T.Quaternion(), ts: new T.Vector3() };
    var P = h.parent; if(!P) return; r.root.updateMatrixWorld(true);
    _g.inv.copy(r.root.matrixWorld).invert();
    _g.hp.setFromMatrixPosition(P.matrixWorld).applyMatrix4(_g.inv);
    var o = off || G.guarda.off, k = r.guardiaoK || 1, q = qa || G.guarda.q, wt = w === undefined ? gK : w;
    _g.hp.x += o[0] * k; _g.hp.y += o[1] * k; _g.hp.z += o[2] * k;
    _g.q.set(q[0], q[1], q[2], q[3]).normalize();
    _g.m.compose(_g.hp, _g.q, _g.s);
    _g.inv.copy(P.matrixWorld).invert().multiply(r.root.matrixWorld).multiply(_g.m);
    _g.inv.decompose(_g.tp, _g.tq, _g.ts);
    h.position.lerp(_g.tp, wt); h.quaternion.slerp(_g.tq, wt);
  }
  G.ajusteParado = function(dt){
    if(!ctx) return; var r = ctx.getVrm(); if(!r || !r.shd) return;
    var tipo = (localStorage.getItem('isblade.char_type') || '').toLowerCase(), a = AJ[tipo];
    vestirEscudo(r.shd);
    var shd = ctx.getWPN() === 'shield';
    var alvo = (a && shd && !st.em) ? 1 : 0, alvoG = (shd && st.em && r.drv && r.drv.curName === 'guard') ? 1 : 0, alvoR = (shd && !st.em) ? 1 : 0;
    if(!a && !alvoG && !gK && !alvoR && !rK && !r.shd.userData.base0) return;
    ajK += (alvo - ajK) * Math.min(1, dt * 6); gK += (alvoG - gK) * Math.min(1, dt * 8); rK += (alvoR - rK) * Math.min(1, dt * 6);
    var h = r.shd; if(!h.userData.base0) h.userData.base0 = { p: h.position.clone(), r: h.rotation.clone() };
    var b = h.userData.base0, k = ajK, sc = r.root.scale.y || 1; a = a || {};
    h.position.set(b.p.x + (a.x || 0) / sc * k, b.p.y + (a.y || 0) / sc * k, b.p.z + (a.z || 0) / sc * k);
    h.rotation.set(b.r.x + (a.rx || 0) * k, b.r.y + (a.ry || 0) * k, b.r.z + (a.rz || 0) * k);
    if(rK > .001){
      var T = window.THREE; if(T){ if(!_qr) _qr = new T.Quaternion(); var g = G.guarda.q; _qr.setFromAxisAngle(new T.Vector3(0, 1, 0), G.repouso.yaw).multiply(new T.Quaternion(g[0], g[1], g[2], g[3]).normalize()); guardaPose(r, h, G.repouso.off, [_qr.x, _qr.y, _qr.z, _qr.w], rK); }
    }
    if(gK > .001) guardaPose(r, h);
  };
  /* jogador REMOTO (PvP): o mesmo posicionamento do escudo (repouso em pe ao lado da perna, guarda na frente do corpo), com o estado guardado no proprio rig.
     arma = arma do jogador remoto; clipe = nome do clipe que ele toca agora (guard/run/ataques = em combate; g_idle/g_run_rest = repouso). */
  G.ajusteRemoto = function(r, arma, clipe, tipo, dt){
    if(!r || !r.shd || !window.THREE) return; vestirEscudo(r.shd);
    var T = window.THREE, shd = arma === 'shield', e = r._aj || (r._aj = { ajK: 0, gK: 0, rK: 0 });
    var repouso = !clipe || /^(g_idle|g_run_rest|g_walk|g_draw|g_sheathe|idle|idle_hand|walk|walk_hand|run_hand)$/.test(clipe);
    var alvoR = (shd && repouso) ? 1 : 0, alvoG = (shd && clipe === 'guard') ? 1 : 0, a = AJ[tipo];
    if(!alvoR && !alvoG && !e.rK && !e.gK) { if(r.shd.userData.base0) { var b0 = r.shd.userData.base0; r.shd.position.copy(b0.p); r.shd.rotation.copy(b0.r); } return; }
    e.rK += (alvoR - e.rK) * Math.min(1, dt * 6); e.gK += (alvoG - e.gK) * Math.min(1, dt * 8);
    var h = r.shd; if(!h.userData.base0) h.userData.base0 = { p: h.position.clone(), r: h.rotation.clone() };
    var b = h.userData.base0; h.position.copy(b.p); h.rotation.copy(b.r);
    if(e.rK > .001){ var qr = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), G.repouso.yaw).multiply(new T.Quaternion(G.guarda.q[0], G.guarda.q[1], G.guarda.q[2], G.guarda.q[3]).normalize()); guardaPose(r, h, G.repouso.off, [qr.x, qr.y, qr.z, qr.w], e.rK); }
    if(e.gK > .001) guardaPose(r, h, null, null, e.gK);
  };
  G.estado = function(){ return { emCombate: st.em, segundosParaSair: +G.segundosParaSair().toFixed(1), motivo: st.motivo, saida: cfg.saidaSegundos }; };
  G.config = cfg;
  return G;
})();
/* <<< CLAUDE [guardiao] */
