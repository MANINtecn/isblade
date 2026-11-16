'use strict';
/* ==========================================================================
   FAKES / BOTS PVP - IS BLADE (16/11/2026)
   Gerenciador de jogadores falsos (bots) para PvP na Arena e no Mundo Aberto.
   - Níveis configuráveis (1 a 85) com equipamentos e armaduras 3D fiéis ao Grau:
     * Nv 1-19 (No-Grade): Sets No-Grade nativos, armas básicas (+0).
     * Nv 20-39 (Grau D): Set Brigandine, armas D (+4 glow azul).
     * Nv 40-51 (Grau C): Set Full Plate Armor, armas C (+7 glow azul vívido).
     * Nv 52-60 (Grau B): Set Doom Plate Armor, armas B (+10 glow púrpura).
     * Nv 61-75 (Grau A): Set Tallum / Imperial, armas A (+13 glow avermelhado).
     * Nv 76-85 (Grau S): Set Imperial Crusader / Tallum, Dragon Slayer (+16 glow vermelho lendário).
   - Skills desbloqueadas progressivamente conforme o nível.
   - Inteligência tática por classe: Mago à distância, Guardião defensivo, Espadachim agressivo.
   - Proteções completas contra crash no servidor.
   ========================================================================== */

const NOMES_BOTS = [
  'SirKael', 'ShadowBlade', 'Valkyrie', 'BloodHunter', 'Khadgar',
  'Raven', 'IronClad', 'Slayer', 'StormRider', 'Nightfall',
  'BladeDancer', 'AbyssWalker', 'SpellSinger', 'Titan', 'Destroyer',
  'GhostSentinel', 'Hawkeye', 'SilverRanger', 'Paladin', 'DarkAvenger',
  'TreasureHunter', 'PlainsWalker', 'SoulBreaker', 'Warlock', 'PhantomSummoner',
  'Dreadnought', 'GrandKhavatari', 'Doomcryer', 'Hierophant', 'EvaSaint',
  'Aries', 'Kronos', 'Artemis', 'Balthazar', 'Mordred'
];

const RACAS_BASE = [
  { raca: 'human_m', cls: 'fighter', arma: 'sword' },
  { raca: 'human_f', cls: 'fighter', arma: 'sword' },
  { raca: 'elf_f', cls: 'fighter', arma: 'sword' },
  { raca: 'dwarf_f', cls: 'fighter', arma: 'shield' },
  { raca: 'human_m', cls: 'fighter', arma: 'shield' },
  { raca: 'magic_m', cls: 'magic', arma: 'staff' },
  { raca: 'magic_f', cls: 'magic', arma: 'staff' },
  { raca: 'darkelf_f', cls: 'fighter', arma: 'sword' },
  { raca: 'orc_m', cls: 'fighter', arma: 'sword' }
];

const COMBOS_BASICOS = ['sweep', 'thrust', 'spin'];
const sorteio = a => a[Math.floor(Math.random() * a.length)];
const r2 = v => Math.round(v * 100) / 100;

let CTX = null;
let proxBotId = 90000;
const bots = new Map(); // id -> bot

function init(contexto){
  CTX = contexto;
}

function canalArenaPvp(){
  if(!CTX || !CTX.canais || !CTX.canais.pvp) return null;
  if(CTX.canais.pvp.length === 0){
    CTX.canais.pvp.push({ mapa: 'pvp', n: 1, jog: new Map() });
  }
  return CTX.canais.pvp[0];
}

function canalCidade(){
  if(!CTX || !CTX.canais || !CTX.canais.cidade) return null;
  if(CTX.canais.cidade.length === 0){
    CTX.canais.cidade.push({ mapa: 'cidade', n: 1, jog: new Map() });
  }
  return CTX.canais.cidade[0];
}

function nomeDisponivel(){
  const usados = new Set();
  for(const b of bots.values()) usados.add(b.nome);
  const livres = NOMES_BOTS.filter(n => !usados.has(n));
  if(livres.length > 0) return sorteio(livres);
  return sorteio(NOMES_BOTS) + '_' + Math.floor(10 + Math.random() * 89);
}

/* Identifica o Grau Lineage 2 pelo Nível */
function grauPorNivel(lv){
  if(lv >= 76) return 'S';
  if(lv >= 61) return 'A';
  if(lv >= 52) return 'B';
  if(lv >= 40) return 'C';
  if(lv >= 20) return 'D';
  return 'sem';
}

/* Configura Modelo 3D (armadura), Arma, Encantamento e Skills conforme Nível */
function setupPorNivel(racaBase, armaTipo, lv){
  const grau = grauPorNivel(lv);

  // 1. Armaduras 3D autênticas (sem vir pelado)
  let raca = racaBase;
  if(racaBase === 'human_m' || racaBase === 'human_fighter'){
    if(grau === 'S' || grau === 'A') raca = 'human_fighter_imperial';
    else if(grau === 'B') raca = 'human_fighter_doom';
    else if(grau === 'C') raca = 'human_fighter_fullplate';
    else if(grau === 'D') raca = 'human_fighter_brigandine';
    else raca = 'human_fighter_nograde';
  } else if(racaBase === 'elf_f'){
    if(grau === 'S' || grau === 'A') raca = 'elf_f_tallum';
    else if(grau === 'B') raca = 'elf_f_doom';
    else if(grau === 'C') raca = 'elf_f_fullplate';
    else if(grau === 'D') raca = 'elf_f_brigandine';
    else raca = 'elf_f_nograde';
  } else if(racaBase === 'dwarf_f'){
    if(grau === 'S' || grau === 'A') raca = 'dwarf_f_tallum';
    else if(grau === 'B') raca = 'dwarf_f_doom';
    else if(grau === 'C') raca = 'dwarf_f_fullplate';
    else if(grau === 'D') raca = 'dwarf_f_brigandine';
    else raca = 'dwarf_f_nograde';
  } else if(racaBase === 'human_f'){
    raca = (grau === 'D' || grau === 'C') ? 'human_fighter_brigandine' : 'human_fighter_female_nograde';
  } else if(racaBase === 'magic_m'){
    raca = 'magic_m_nograde';
  } else if(racaBase === 'magic_f'){
    raca = 'magic_f_nograde';
  } else if(racaBase === 'orc_m'){
    raca = 'orc_m_nograde';
  } else if(racaBase === 'orc_f'){
    raca = 'orc_f_nograde';
  } else if(racaBase === 'elf_m'){
    raca = 'elf_m_nograde';
  } else if(racaBase === 'dwarf_m'){
    raca = 'dwarf_m_nograde';
  } else if(racaBase === 'darkelf_f'){
    raca = 'darkelf_f';
  } else if(racaBase === 'darkelf_m'){
    raca = 'darkelf_m';
  }

  // 2. Armas e Encantamentos por Grau
  let wb = 'sword_long';
  let en = 0;

  if(armaTipo === 'shield'){
    // Guardião (Espada 1H + Escudo)
    if(grau === 'S'){ wb = 'samurai_longsword'; en = 16; }
    else if(grau === 'A'){ wb = 'gladius'; en = 13; }
    else if(grau === 'B'){ wb = 'samurai_longsword'; en = 10; }
    else if(grau === 'C'){ wb = 'samurai_longsword'; en = 7; }
    else if(grau === 'D'){ wb = 'bastard_sword'; en = 4; }
    else { wb = 'gladius'; en = 0; }
  } else if(armaTipo === 'staff'){
    // Mago (Cajado Arcano)
    if(grau === 'S'){ wb = 'ghouls_staff'; en = 16; }
    else if(grau === 'A'){ wb = 'sword_of_miracles'; en = 13; }
    else if(grau === 'B'){ wb = 'valhalla'; en = 10; }
    else if(grau === 'C'){ wb = 'ghouls_staff'; en = 7; }
    else if(grau === 'D'){ wb = 'ghost_staff'; en = 4; }
    else { wb = 'staff_arcane'; en = 0; }
  } else {
    // Espadachim (Espada 2H)
    if(grau === 'S'){ wb = 'dragon_slayer'; en = 16; }
    else if(grau === 'A'){ wb = 'dragon_slayer'; en = 13; }
    else if(grau === 'B'){ wb = 'great_sword'; en = 10; }
    else if(grau === 'C'){ wb = 'berserker_blade'; en = 7; }
    else if(grau === 'D'){ wb = 'claymore'; en = 4; }
    else { wb = 'sword_long'; en = 0; }
  }

  // 3. Skills liberadas conforme o nível (0 a 6)
  const maxSkillIdx = lv >= 76 ? 6 : (lv >= 61 ? 4 : (lv >= 52 ? 3 : (lv >= 40 ? 2 : (lv >= 20 ? 1 : 0))));
  const skills = [];
  for(let i = 0; i <= maxSkillIdx; i++) skills.push(i);

  // 4. HP proporcional ao nível e conjunto
  const hpBase = Math.round(300 + Math.pow(lv, 1.46) * 11);

  return { raca, wb, en, grau, skills, hpBase };
}

/* Cria bots com configuração completa por nível e equipamento */
function spawnBots(opts){
  if(!CTX) return 0;
  const canal = opts.canal || canalCidade();
  if(!canal) return 0;

  const t = CTX.agora();
  const qtd = Math.max(1, Math.min(30, opts.qtd || 10));
  const cx = typeof opts.x === 'number' ? opts.x : 0;
  const cz = typeof opts.z === 'number' ? opts.z : 0;
  const modo = opts.modo || 'pvp'; // 'pvp', 'inimigo', 'treino'
  const lv = Math.max(1, Math.min(85, opts.lv || 40));

  let criados = 0;
  for(let i = 0; i < qtd; i++){
    const id = proxBotId++;
    const persona = sorteio(RACAS_BASE);
    const setup = setupPorNivel(persona.raca, persona.arma, lv);
    const nome = nomeDisponivel();

    const ang = (i / qtd) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const raio = 3.5 + Math.random() * 8.5;
    const bx = r2(cx + Math.sin(ang) * raio);
    const bz = r2(cz + Math.cos(ang) * raio);

    const bot = {
      id,
      ws: { readyState: 1, send: () => {} }, // mock socket seguro
      nome,
      raca: setup.raca,
      cls: persona.cls,
      arma: persona.arma,
      wb: setup.wb,
      en: setup.en,
      grau: setup.grau,
      skills: setup.skills,
      sid: 'bot_' + id,
      pers: {
        id: 'bot_' + id,
        name: nome,
        level: lv,
        charType: setup.raca,
        karma: 0,
        pk: 0,
        pvp: 0,
        inv: {
          items: [
            { uid: 'bot_wpn_' + id, base: setup.wb, en: setup.en }
          ],
          equip: {
            weapon: 'bot_wpn_' + id
          }
        }
      },
      lv,
      cid: '',
      party: 0,
      canalRef: canal,
      mapa: canal.mapa,
      x: bx,
      z: bz,
      f: r2(Math.random() * 6.28),
      y: 0,
      a: 'idle',
      ts: 1,
      guarda: false,
      pmax: setup.hpBase,
      hp: setup.hpBase,
      morto: false,
      tMorte: 0,
      imune: t + 1.0,
      isBot: true,
      modoPvp: true,
      flagAte: t + 999999, // nome roxo / flag sempre ativo
      spawnX: bx,
      spawnZ: bz,
      modo, // 'pvp', 'inimigo', 'treino'
      respawn: opts.respawn !== false,
      alvoId: 0,
      tAtk: t + 0.4 + Math.random() * 1.0,
      tSkill: t + 2.0 + Math.random() * 3.0,
      combo: 0,
      tStrafe: t + Math.random() * 2,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      tMudouAlvo: 0,
      rumo: null,
      atacante: 0,
      // Propriedades fundamentais para compatibilidade 100% com o servidor
      cd: {},
      ultSk: '',
      ultSkT: 0,
      ultB: 0,
      ssUlt: 0,
      abates: 0,
      mortes: 0,
      pvpHitT: 0,
      stPk: 1,
      kPk: 0,
      duelo: null,
      preceAte: 0,
      escudo: null,
      ultChat: 0,
      ultSt: t
    };

    canal.jog.set(bot.id, bot);
    bots.set(bot.id, bot);
    CTX.difunde(canal, { t: 'j', p: CTX.info(bot) });
    criados++;
  }

  // Notifica o canal sobre os novos bots com info de nível e grau
  const grauTxt = grauPorNivel(lv);
  const setNome = grauTxt === 'S' ? 'Imperial/Tallum (+16)' : (grauTxt === 'A' ? 'Tallum (+13)' : (grauTxt === 'B' ? 'Doom (+10)' : (grauTxt === 'C' ? 'Full Plate (+7)' : (grauTxt === 'D' ? 'Brigandine (+4)' : 'No-Grade'))));
  CTX.difunde(canal, {
    t: 'chat',
    n: 'Sistema',
    m: `⚔️ ${criados} bots Nv ${lv} (Grau ${grauTxt} · ${setNome}) entraram na partida!`,
    c: 's'
  });

  return criados;
}

/* Remove todos os bots ou bots de um canal */
function limparBots(canalAlvo){
  if(!CTX) return 0;
  let removidos = 0;
  for(const [id, bot] of bots.entries()){
    if(!canalAlvo || bot.canalRef === canalAlvo){
      if(bot.canalRef && bot.canalRef.jog.has(id)){
        bot.canalRef.jog.delete(id);
        CTX.difunde(bot.canalRef, { t: 'l', id });
      }
      bots.delete(id);
      removidos++;
    }
  }

  const canalAviso = canalAlvo || canalCidade();
  if(canalAviso && removidos > 0){
    CTX.difunde(canalAviso, {
      t: 'chat',
      n: 'Sistema',
      m: `🛑 ${removidos} bots foram removidos da partida.`,
      c: 's'
    });
  }
  return removidos;
}

/* Mata todos os bots ativos */
function matarBots(canalAlvo){
  if(!CTX) return 0;
  const t = CTX.agora();
  let mortos = 0;
  for(const bot of bots.values()){
    if((!canalAlvo || bot.canalRef === canalAlvo) && !bot.morto){
      bot.hp = 0;
      bot.morto = true;
      bot.a = 'death';
      bot.tMorte = t;
      if(bot.canalRef){
        CTX.difunde(bot.canalRef, { t: 'die', v: bot.id, a: 0, nv: bot.nome, na: 'Comando' });
      }
      mortos++;
    }
  }
  return mortos;
}

/* Encontra alvo adequado para o bot */
function buscaAlvo(bot, c, t){
  let melhor = null;
  let melhorDist = 42;

  for(const cand of c.jog.values()){
    if(cand === bot || cand.morto || cand.hp <= 0) continue;
    if(t < cand.imune) continue;

    // Se o bot estiver em modo 'inimigo', foca jogadores humanos
    if(bot.modo === 'inimigo' && cand.isBot) continue;

    const atacouEsseBot = bot.atacante && bot.atacante === cand.id;
    const d = Math.hypot(cand.x - bot.x, cand.z - bot.z);

    if(atacouEsseBot && d < 48){
      return cand;
    }

    if(d < melhorDist){
      melhorDist = d;
      melhor = cand;
    }
  }

  return melhor;
}

/* Laço de IA dos bots (chamado no tick do server.js) */
function tick(t, dt){
  if(!CTX || bots.size === 0) return;

  for(const [id, bot] of bots.entries()){
    try {
      const c = bot.canalRef;
      if(!c || !c.jog.has(id)){
        bots.delete(id);
        continue;
      }

      // Bot morto: aguarda respawn
      if(bot.morto){
        if(bot.respawn && t - bot.tMorte > 5.5){
          bot.morto = false;
          bot.hp = bot.pmax;
          bot.imune = t + 2.0;
          bot.alvoId = 0;
          bot.atacante = 0;
          bot.a = 'idle';
          const ang = Math.random() * 6.28;
          const dist = 2 + Math.random() * 6;
          bot.x = r2(bot.spawnX + Math.sin(ang) * dist);
          bot.z = r2(bot.spawnZ + Math.cos(ang) * dist);
          CTX.difunde(c, { t: 'resp', id: bot.id, x: bot.x, z: bot.z, hp: bot.hp });
        }
        continue;
      }

      // Modo treino: passivo
      if(bot.modo === 'treino'){
        bot.a = 'idle';
        bot.guarda = false;
        continue;
      }

      // Atualiza / busca alvo
      let alvo = bot.alvoId ? c.jog.get(bot.alvoId) : null;
      if(!alvo || alvo.morto || alvo.hp <= 0 || Math.hypot(alvo.x - bot.x, alvo.z - bot.z) > 46){
        alvo = buscaAlvo(bot, c, t);
        bot.alvoId = alvo ? alvo.id : 0;
      }

      // Sem alvo: patrulha suave próximo ao ponto de spawn
      if(!alvo){
        bot.guarda = false;
        const dSpawn = Math.hypot(bot.spawnX - bot.x, bot.spawnZ - bot.z);
        if(dSpawn > 18){
          const angVolta = Math.atan2(bot.spawnX - bot.x, bot.spawnZ - bot.z);
          bot.f = r2(angVolta);
          bot.x = r2(bot.x + Math.sin(angVolta) * 3.5 * dt);
          bot.z = r2(bot.z + Math.cos(angVolta) * 3.5 * dt);
          bot.a = 'run';
        } else {
          bot.a = 'idle';
        }
        continue;
      }

      // Movimentação & Combate com alvo
      const dx = alvo.x - bot.x;
      const dz = alvo.z - bot.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const angAlvo = Math.atan2(dx, dz);
      bot.f = r2(angAlvo);

      const isMago = bot.arma === 'staff';
      const isGuardiao = bot.arma === 'shield';
      const distIdeal = isMago ? 10.0 : 2.1;

      // Distância de combate
      if(dist > distIdeal + 0.5){
        // Aproximação
        bot.guarda = false;
        bot.a = 'run';
        const vel = 4.8;
        const k = Math.min(dist - distIdeal, vel * dt);
        bot.x = r2(bot.x + (dx / dist) * k);
        bot.z = r2(bot.z + (dz / dist) * k);
      } else if(isMago && dist < 4.5){
        // Mago recua se alvo encostar
        bot.guarda = false;
        bot.a = 'run';
        const k = 4.2 * dt;
        bot.x = r2(bot.x - (dx / dist) * k);
        bot.z = r2(bot.z - (dz / dist) * k);
      } else {
        // Alcance de golpe
        if(t > bot.tStrafe){
          bot.tStrafe = t + 1.2 + Math.random() * 1.8;
          bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
        }

        // Movimento orbital lateral sutil
        const lateralAng = angAlvo + Math.PI / 2 * bot.strafeDir;
        bot.x = r2(bot.x + Math.sin(lateralAng) * 1.5 * dt);
        bot.z = r2(bot.z + Math.cos(lateralAng) * 1.5 * dt);

        // Guardião: ativa postura de guarda com frequência
        if(isGuardiao && Math.random() < 0.28 && !bot.guarda){
          bot.guarda = true;
          bot.a = 'guard';
          setTimeout(() => { if(bot) bot.guarda = false; }, 850);
        }

        // Esquiva defensiva (roll) quando sob ataque
        if(bot.atacante && Math.random() < 0.08 && t > bot.tAtk){
          bot.a = 'roll';
          bot.imune = t + 0.35;
          const kRoll = 3.6;
          bot.x = r2(bot.x + Math.sin(lateralAng) * kRoll);
          bot.z = r2(bot.z + Math.cos(lateralAng) * kRoll);
          bot.tAtk = t + 0.6;
          continue;
        }

        // Execução de ataque / skills
        if(t > bot.tAtk && !bot.guarda){
          bot.tAtk = t + 0.7 + Math.random() * 0.35;
          const temSkills = bot.skills && bot.skills.length > 0;
          const usaSkill = temSkills && t > bot.tSkill && Math.random() < 0.45;

          if(usaSkill){
            bot.tSkill = t + 3.2 + Math.random() * 2.5;
            const skIdx = sorteio(bot.skills);
            const anims = ['slash1', 'slash2', 'slash3', 'slash4', 'thrust', 'spin'];
            bot.a = anims[skIdx % anims.length];
            bot.tAtk = t + 1.0;
            CTX.ataque(c, bot, { k: 's', i: skIdx, f: bot.f, p: 1 });
          } else {
            const golpe = COMBOS_BASICOS[(bot.combo++) % COMBOS_BASICOS.length];
            bot.a = bot.combo % 2 ? 'slash1' : 'slash2';
            CTX.ataque(c, bot, { k: 'b', id: golpe, f: bot.f });
          }
        }
      }
    } catch(err){
      // Protege contra qualquer exceção isolada de um bot
      console.warn('[Fakes tick erro]', err && err.message);
    }
  }
}

/* Processa comandos de chat: /bot [qtd] [lv], /bot arena, /bot limpar, /bot matar */
function comando(c, J, txt){
  if(!CTX || !J) return;
  const partes = txt.trim().split(/\s+/);
  const cmd = (partes[0] || '').toLowerCase();
  const sub = (partes[1] || '').toLowerCase();
  const arg2 = partes[2];
  const arg3 = partes[3];

  const sis = msg => CTX.envia(J, { t: 'chat', n: 'Sistema', m: msg, c: 's' });

  // /painel ou /bot painel
  if(cmd === '/painel' || sub === 'painel'){
    CTX.envia(J, { t: 'bot_painel', open: true, total: bots.size });
    sis('Painel de Bots PvP aberto.');
    return;
  }

  // /bot limpar | /bot del | /bot kill | /bot remover
  if(sub === 'limpar' || sub === 'del' || sub === 'kill' || sub === 'remover'){
    const qtd = limparBots(c);
    sis(`Todos os bots (${qtd}) foram removidos deste mapa.`);
    return;
  }

  // /bot limpar_tudo
  if(sub === 'limpartudo' || sub === 'limpar_tudo'){
    const qtd = limparBots(null);
    sis(`Todos os bots (${qtd}) de todos os mapas foram removidos.`);
    return;
  }

  // /bot matar
  if(sub === 'matar'){
    const qtd = matarBots(c);
    sis(`💀 ${qtd} bots foram abatidos.`);
    return;
  }

  // /bot arena [qtd] [lv]
  if(sub === 'arena'){
    const qtd = Math.min(30, Math.max(1, parseInt(arg2, 10) || 10));
    const lv = Math.min(85, Math.max(1, parseInt(arg3, 10) || J.lv || 40));
    const cArena = canalArenaPvp();
    const are = CTX.ARENA_PVP || { x: -28.4, z: -53.85 };
    const sp = spawnBots({ canal: cArena, x: are.x, z: are.z, qtd, modo: 'pvp', lv });
    sis(`⚔️ ${sp} bots Nv ${lv} foram criados na Arena PvP! Vá até a Arena para lutar.`);
    return;
  }

  // /bot campo [qtd] [lv]
  if(sub === 'campo'){
    const qtd = Math.min(30, Math.max(1, parseInt(arg2, 10) || 10));
    const lv = Math.min(85, Math.max(1, parseInt(arg3, 10) || J.lv || 40));
    const cCid = canalCidade();
    const cx = Math.hypot(J.x, J.z) > 96 ? J.x : 0;
    const cz = Math.hypot(J.x, J.z) > 96 ? J.z : 105;
    const sp = spawnBots({ canal: cCid, x: cx, z: cz, qtd, modo: 'pvp', lv });
    sis(`⚔️ ${sp} bots Nv ${lv} criados no campo aberto fora da muralha!`);
    return;
  }

  // /bot modo [pvp|inimigo|treino]
  if(sub === 'modo'){
    const modo = (arg2 || 'pvp').toLowerCase();
    if(!['pvp', 'inimigo', 'treino'].includes(modo)){
      sis('Modos válidos: /bot modo pvp | /bot modo inimigo | /bot modo treino');
      return;
    }
    let n = 0;
    for(const b of bots.values()){
      if(b.canalRef === c){ b.modo = modo; n++; }
    }
    sis(`Modo dos ${n} bots alterado para: ${modo.toUpperCase()}`);
    return;
  }

  // /bot status
  if(sub === 'status'){
    let locais = 0, total = bots.size;
    for(const b of bots.values()) if(b.canalRef === c) locais++;
    sis(`Bots ativos: ${locais} neste mapa | ${total} no servidor.`);
    return;
  }

  // /bot ajuda | /bot help
  if(sub === 'ajuda' || sub === 'help'){
    sis('--- COMANDOS DE BOTS PVP ---');
    sis('/bot 10           -> Cria 10 bots com seu nível');
    sis('/bot 10 76        -> Cria 10 bots Nv 76 (Grau S)');
    sis('/bot arena 10 40  -> Cria 10 bots Nv 40 na Arena PvP');
    sis('/bot campo 10 20  -> Cria 10 bots Nv 20 fora da muralha');
    sis('/bot limpar       -> Deleta todos os bots');
    sis('/bot matar        -> Abate todos os bots ativos');
    sis('/bot modo pvp     -> Muda comportamento (pvp|inimigo|treino)');
    sis('/painel           -> Abre o Painel Visual');
    return;
  }

  // /bot [numero] [lv] (ex: /bot 10 ou /bot 10 76 ou /bot 5 20)
  const qtdNum = parseInt(sub, 10);
  const qtd = isNaN(qtdNum) ? 10 : Math.min(30, Math.max(1, qtdNum));
  const lvNum = parseInt(arg2, 10);
  const lv = isNaN(lvNum) ? (J.lv || 40) : Math.min(85, Math.max(1, lvNum));

  const sp = spawnBots({ canal: c, x: J.x, z: J.z, qtd, modo: 'pvp', lv });
  sis(`⚔️ ${sp} bots Nv ${lv} criados ao seu redor! Boa luta!`);
}

/* Executa ações vindas do Painel de Controle (m.t === 'bot_cmd') */
function executa(c, J, m){
  if(!CTX || !J) return;
  const acao = String(m.acao || '').toLowerCase();
  const qtd = Math.min(30, Math.max(1, parseInt(m.qtd, 10) || 10));
  const lv = Math.min(85, Math.max(1, parseInt(m.lv, 10) || J.lv || 40));
  const modo = ['pvp', 'inimigo', 'treino'].includes(m.modo) ? m.modo : 'pvp';

  if(acao === 'spawn'){
    let canal = c;
    let x = J.x, z = J.z;

    if(m.local === 'arena'){
      canal = canalArenaPvp();
      const are = CTX.ARENA_PVP || { x: -28.4, z: -53.85 };
      x = are.x; z = are.z;
    } else if(m.local === 'campo'){
      canal = canalCidade();
      x = Math.hypot(J.x, J.z) > 96 ? J.x : 0;
      z = Math.hypot(J.x, J.z) > 96 ? J.z : 105;
    }

    const criados = spawnBots({ canal, x, z, qtd, modo, lv });
    CTX.envia(J, { t: 'bot_info', total: bots.size, mapa: c.mapa });
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `⚔️ Painel: ${criados} bots Nv ${lv} spawnados com sucesso!`, c: 's' });
  } else if(acao === 'limpar'){
    const removidos = limparBots(m.tudo ? null : c);
    CTX.envia(J, { t: 'bot_info', total: bots.size, mapa: c.mapa });
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `🛑 Painel: ${removidos} bots foram removidos.`, c: 's' });
  } else if(acao === 'matar'){
    const mortos = matarBots(c);
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `💀 Painel: ${mortos} bots foram abatidos.`, c: 's' });
  } else if(acao === 'modo'){
    let n = 0;
    for(const b of bots.values()){
      if(b.canalRef === c){ b.modo = modo; n++; }
    }
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `⚙️ Painel: Modo dos bots definido como ${modo.toUpperCase()}.`, c: 's' });
  } else if(acao === 'status'){
    CTX.envia(J, { t: 'bot_info', total: bots.size, mapa: c.mapa });
  }
}

module.exports = {
  init,
  spawnBots,
  limparBots,
  matarBots,
  tick,
  comando,
  executa,
  setupPorNivel,
  grauPorNivel,
  get total(){ return bots.size; }
};
