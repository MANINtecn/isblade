'use strict';
/* ==========================================================================
   FAKES / BOTS PVP - IS BLADE (16/11/2026)
   Gerenciador de jogadores falsos (bots) para PvP na Arena e no Mundo Aberto.
   - Spawna via comando de chat (/bot 10, /bot arena 10, /bot limpar) ou painel.
   - Luta de verdade usando a fisica e os pacotes nativos do servidor.
   - Variedade de racas, armas e nomes classicos do Lineage 2.
   - Inteligencia artificial de combate: perseguir, esquivar (roll), guarda e combos.
   ========================================================================== */

const NOMES_BOTS = [
  'SirKael', 'ShadowBlade', 'Valkyrie', 'BloodHunter', 'Khadgar',
  'Raven', 'IronClad', 'Slayer', 'StormRider', 'Nightfall',
  'BladeDancer', 'AbyssWalker', 'SpellSinger', 'Titan', 'Destroyer',
  'GhostSentinel', 'Hawkeye', 'SilverRanger', 'Paladin', 'DarkAvenger',
  'TreasureHunter', 'PlainsWalker', 'SoulBreaker', 'Warlock', 'PhantomSummoner',
  'Dreadnought', 'GrandKhavatari', 'Doomcryer', 'Hierophant', 'EvaSaint'
];

const RACAS_CONFIG = [
  { raca: 'human_m', cls: 'fighter', arma: 'sword' },
  { raca: 'human_f', cls: 'fighter', arma: 'sword' },
  { raca: 'elf_f', cls: 'fighter', arma: 'sword' },
  { raca: 'darkelf_f', cls: 'fighter', arma: 'sword' },
  { raca: 'orc_m', cls: 'fighter', arma: 'sword' },
  { raca: 'dwarf_f', cls: 'fighter', arma: 'sword' }
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

/* Cria bots em torno de uma coordenada (x, z) */
function spawnBots(opts){
  if(!CTX) return 0;
  const canal = opts.canal || canalCidade();
  if(!canal) return 0;

  const t = CTX.agora();
  const qtd = Math.max(1, Math.min(30, opts.qtd || 10));
  const cx = typeof opts.x === 'number' ? opts.x : 0;
  const cz = typeof opts.z === 'number' ? opts.z : 0;
  const modo = opts.modo || 'pvp'; // 'pvp' (todos contra todos), 'inimigo' (foca player), 'treino' (passivo)
  const lv = Math.max(1, opts.lv || 25);
  const hpBase = Math.max(100, opts.hp || (350 + lv * 22));

  let criados = 0;
  for(let i = 0; i < qtd; i++){
    const id = proxBotId++;
    const persona = sorteio(RACAS_CONFIG);
    const nome = nomeDisponivel();
    const ang = (i / qtd) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const raio = 3.5 + Math.random() * 8.5;
    const bx = r2(cx + Math.sin(ang) * raio);
    const bz = r2(cz + Math.cos(ang) * raio);

    const bot = {
      id,
      ws: { readyState: 1, send: () => {} }, // mock socket
      nome,
      raca: persona.raca,
      cls: persona.cls,
      arma: persona.arma,
      sid: 'bot_' + id,
      pers: { id: 'bot_' + id, name: nome, level: lv, charType: persona.raca, karma: 0, pk: 0, pvp: 0, inv: { items: [], equip: {} } },
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
      pmax: hpBase,
      hp: hpBase,
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
      tAtk: t + 0.5 + Math.random() * 1.5,
      tSkill: t + 3.0 + Math.random() * 4.0,
      combo: 0,
      tStrafe: t + Math.random() * 2,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      tMudouAlvo: 0,
      rumo: null,
      atacante: 0
    };

    canal.jog.set(bot.id, bot);
    bots.set(bot.id, bot);
    CTX.difunde(canal, { t: 'j', p: CTX.info(bot) });
    criados++;
  }

  // Notifica o canal sobre os novos bots
  CTX.difunde(canal, {
    t: 'chat',
    n: 'Sistema',
    m: `⚔️ ${criados} bots foram convocados para combate (${modo === 'treino' ? 'Treino Passivo' : 'Modo PvP'})!`,
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
  let melhorDist = 38; // alcance maximo de visao

  for(const cand of c.jog.values()){
    if(cand === bot || cand.morto || cand.hp <= 0) continue;
    if(t < cand.imune) continue;

    // Se o bot estiver em modo 'inimigo', foca jogadores reais!
    if(bot.modo === 'inimigo' && cand.isBot) continue;

    // Se este candidato atacou o bot recentemente, ganha prioridade maxima!
    const atacouEsseBot = bot.atacante && bot.atacante === cand.id;
    const d = Math.hypot(cand.x - bot.x, cand.z - bot.z);

    if(atacouEsseBot && d < 45){
      return cand;
    }

    if(d < melhorDist){
      melhorDist = d;
      melhor = cand;
    }
  }

  return melhor;
}

/* Laco de IA dos bots (chamado no tick do server.js) */
function tick(t, dt){
  if(!CTX || bots.size === 0) return;

  for(const [id, bot] of bots.entries()){
    const c = bot.canalRef;
    if(!c || !c.jog.has(id)){
      bots.delete(id);
      continue;
    }

    // Bot morto: aguarda tempo de respawn ou permanece caido
    if(bot.morto){
      if(bot.respawn && t - bot.tMorte > 5.5){
        bot.morto = false;
        bot.hp = bot.pmax;
        bot.imune = t + 2.0;
        bot.alvoId = 0;
        bot.atacante = 0;
        bot.a = 'idle';
        // Respawn proximo do ponto inicial
        const ang = Math.random() * 6.28;
        const dist = 2 + Math.random() * 6;
        bot.x = r2(bot.spawnX + Math.sin(ang) * dist);
        bot.z = r2(bot.spawnZ + Math.cos(ang) * dist);
        CTX.difunde(c, { t: 'resp', id: bot.id, x: bot.x, z: bot.z, hp: bot.hp });
      }
      continue;
    }

    // Modo treino: passivo, so fica parado ou respirando
    if(bot.modo === 'treino'){
      bot.a = 'idle';
      bot.guarda = false;
      continue;
    }

    // Busca ou valida alvo
    let alvo = bot.alvoId ? c.jog.get(bot.alvoId) : null;
    if(!alvo || alvo.morto || alvo.hp <= 0 || Math.hypot(alvo.x - bot.x, alvo.z - bot.z) > 42){
      alvo = buscaAlvo(bot, c, t);
      bot.alvoId = alvo ? alvo.id : 0;
      bot.tMudouAlvo = t;
    }

    if(!alvo){
      // Sem alvos por perto: caminha suavemente ou fica em idle
      bot.guarda = false;
      bot.a = 'idle';
      continue;
    }

    const dx = alvo.x - bot.x;
    const dz = alvo.z - bot.z;
    const dist = Math.hypot(dx, dz);
    bot.f = r2(Math.atan2(dx, dz));

    // Distancia de ataque (espada ~2.2 m)
    if(dist > 2.2){
      // Persegue o alvo
      bot.guarda = false;
      bot.a = 'run';
      const vel = 4.8;
      const k = Math.min(dist - 1.8, vel * dt);
      bot.x = r2(bot.x + (dx / dist) * k);
      bot.z = r2(bot.z + (dz / dist) * k);
    } else {
      // Em alcance de combate corpo a corpo:
      bot.guarda = false;

      // Movimentacao de strafe lateral para nao ficar estatico
      if(t > bot.tStrafe){
        bot.tStrafe = t + 0.8 + Math.random() * 1.2;
        bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
      }
      const sideX = -Math.cos(bot.f) * bot.strafeDir;
      const sideZ = Math.sin(bot.f) * bot.strafeDir;
      bot.x = r2(bot.x + sideX * 1.6 * dt);
      bot.z = r2(bot.z + sideZ * 1.6 * dt);

      // Reacao defensiva ocasional (guarda ou esquiva)
      if(alvo.a && (alvo.a.startsWith('slash') || alvo.a.startsWith('atk')) && Math.random() < 0.28){
        if(t > bot.imune + 2.0 && Math.random() < 0.5){
          // Rola para esquivar
          bot.a = 'roll';
          bot.imune = t + 0.45;
          bot.x = r2(bot.x - Math.sin(bot.f) * 2.5);
          bot.z = r2(bot.z - Math.cos(bot.f) * 2.5);
          continue;
        } else {
          // Ergue a guarda
          bot.guarda = true;
          bot.a = 'guard';
        }
      }

      // Ataque ofensivo
      if(t > bot.tAtk && !bot.guarda){
        bot.tAtk = t + 0.75 + Math.random() * 0.35;
        const usaSkill = t > bot.tSkill && Math.random() < 0.35;

        if(usaSkill){
          bot.tSkill = t + 4.5 + Math.random() * 3.0;
          bot.a = 'slash4';
          bot.tAtk = t + 1.1;
          CTX.ataque(c, bot, { k: 's', i: 1, f: bot.f, p: 1 });
        } else {
          const golpe = COMBOS_BASICOS[(bot.combo++) % COMBOS_BASICOS.length];
          bot.a = bot.combo % 2 ? 'slash1' : 'slash2';
          CTX.ataque(c, bot, { k: 'b', id: golpe, f: bot.f });
        }
      }
    }
  }
}

/* Processa comandos de chat como /bot 10, /bot arena, /bot limpar */
function comando(c, J, txt){
  if(!CTX || !J) return;
  const partes = txt.trim().split(/\s+/);
  const cmd = (partes[0] || '').toLowerCase();
  const sub = (partes[1] || '').toLowerCase();
  const arg = partes[2];

  const sis = msg => CTX.envia(J, { t: 'chat', n: 'Sistema', m: msg, c: 's' });

  // /painel ou /bot painel
  if(cmd === '/painel' || sub === 'painel'){
    CTX.envia(J, { t: 'bot_painel', on: true });
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

  // /bot arena [qtd]
  if(sub === 'arena'){
    const qtd = Math.min(30, Math.max(1, parseInt(arg, 10) || 10));
    const cArena = canalArenaPvp();
    const are = CTX.ARENA_PVP || { x: -28.4, z: -53.85 };
    const sp = spawnBots({ canal: cArena, x: are.x, z: are.z, qtd, modo: 'pvp' });
    sis(`⚔️ ${sp} bots foram criados na Arena PvP! Vá até a Arena para lutar.`);
    return;
  }

  // /bot campo [qtd]
  if(sub === 'campo'){
    const qtd = Math.min(30, Math.max(1, parseInt(arg, 10) || 10));
    const cCid = canalCidade();
    // Fora da muralha (x: 0, z: 105) ou na posicao do jogador se ja estiver fora
    const cx = Math.hypot(J.x, J.z) > 96 ? J.x : 0;
    const cz = Math.hypot(J.x, J.z) > 96 ? J.z : 105;
    const sp = spawnBots({ canal: cCid, x: cx, z: cz, qtd, modo: 'pvp' });
    sis(`⚔️ ${sp} bots criados no campo aberto fora da muralha!`);
    return;
  }

  // /bot modo [pvp|inimigo|treino]
  if(sub === 'modo'){
    const modo = (arg || 'pvp').toLowerCase();
    if(!['pvp', 'inimigo', 'treino'].includes(modo)){
      sis('Modos validos: /bot modo pvp | /bot modo inimigo | /bot modo treino');
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
    sis('/bot 10  -> Cria 10 bots PvP ao seu redor');
    sis('/bot arena 10 -> Cria 10 bots na Arena PvP');
    sis('/bot campo 10 -> Cria 10 bots fora da muralha');
    sis('/bot limpar  -> Deleta todos os bots');
    sis('/bot matar   -> Abate todos os bots');
    sis('/bot modo [pvp|inimigo|treino] -> Muda comportamento');
    sis('/bot painel  -> Abre o Painel Visual de Controle');
    return;
  }

  // /bot [numero] (ex: /bot ou /bot 10 ou /bot 5)
  const qtdNum = parseInt(sub, 10);
  const qtd = isNaN(qtdNum) ? 10 : Math.min(30, Math.max(1, qtdNum));
  const sp = spawnBots({ canal: c, x: J.x, z: J.z, qtd, modo: 'pvp', lv: J.lv || 25 });
  sis(`⚔️ ${sp} bots criados ao seu redor! Boa luta!`);
}

/* Executa acoes vindas do Painel de Controle (m.t === 'bot_cmd') */
function executa(c, J, m){
  if(!CTX || !J) return;
  const acao = String(m.acao || '').toLowerCase();
  const qtd = Math.min(30, Math.max(1, parseInt(m.qtd, 10) || 10));
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

    const criados = spawnBots({ canal, x, z, qtd, modo, lv: J.lv || 25 });
    CTX.envia(J, { t: 'bot_info', total: bots.size, mapa: c.mapa });
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `⚔️ Painel: ${criados} bots spawnados com sucesso!`, c: 's' });
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
  get total(){ return bots.size; }
};
