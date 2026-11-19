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
  { raca: 'elf_f', cls: 'clerigo', arma: 'book' },
  { raca: 'human_f', cls: 'clerigo', arma: 'book' },
  { raca: 'darkelf_f', cls: 'fighter', arma: 'sword' },
  { raca: 'orc_m', cls: 'fighter', arma: 'sword' }
];

/* Mapeamento de Classes Específicas para Seleção */
const CLASSES_MAP = {
  guerreiro: [
    { raca: 'human_m', cls: 'fighter', arma: 'sword' },
    { raca: 'human_f', cls: 'fighter', arma: 'sword' },
    { raca: 'elf_f', cls: 'fighter', arma: 'sword' },
    { raca: 'darkelf_f', cls: 'fighter', arma: 'sword' },
    { raca: 'orc_m', cls: 'fighter', arma: 'sword' }
  ],
  guardiao: [
    { raca: 'dwarf_f', cls: 'fighter', arma: 'shield' },
    { raca: 'human_m', cls: 'fighter', arma: 'shield' },
    { raca: 'elf_f', cls: 'fighter', arma: 'shield' }
  ],
  mago: [
    { raca: 'magic_m', cls: 'magic', arma: 'staff' },
    { raca: 'magic_f', cls: 'magic', arma: 'staff' }
  ],
  clerigo: [
    { raca: 'elf_f', cls: 'clerigo', arma: 'book' },
    { raca: 'human_f', cls: 'clerigo', arma: 'book' },
    { raca: 'magic_f', cls: 'clerigo', arma: 'book' },
    { raca: 'human_m', cls: 'clerigo', arma: 'book' }
  ]
};

// Sinônimos & Aliases
CLASSES_MAP.fighter = CLASSES_MAP.guerreiro;
CLASSES_MAP.dps = CLASSES_MAP.guerreiro;
CLASSES_MAP.tank = CLASSES_MAP.guardiao;
CLASSES_MAP.shield = CLASSES_MAP.guardiao;
CLASSES_MAP.nuker = CLASSES_MAP.mago;
CLASSES_MAP.staff = CLASSES_MAP.mago;
CLASSES_MAP.healer = CLASSES_MAP.clerigo;
CLASSES_MAP.curandeiro = CLASSES_MAP.clerigo;
CLASSES_MAP.book = CLASSES_MAP.clerigo;

const COMBOS_BASICOS = ['sweep', 'thrust', 'spin'];
const sorteio = a => a[Math.floor(Math.random() * a.length)];

/* [pose-bot] pose real de cada skill por arma (data/armas/*.json -> skills[i].pose): o cliente dos outros jogadores toca o clipe certo e o aviso do golpe.
   Antes o bot mandava 'slash1/thrust/spin' (varios nao existem no modelo = ficava parado) e a animacao sumia no quadro seguinte (movimento voltava a 'run'). */
const POSE_ARMA = {};
try {
  const fsP = require('fs'), pathP = require('path'), dirP = pathP.join(__dirname, '..', 'prototipo', 'data', 'armas');
  fsP.readdirSync(dirP).filter(f => f.endsWith('.json')).forEach(f => { const j = JSON.parse(fsP.readFileSync(pathP.join(dirP, f), 'utf8')); if(j.id && j.skills) POSE_ARMA[j.id] = j.skills.map(sk => sk.pose || ''); });
} catch(e) { /* sem dados: cai no comportamento antigo */ }
const POSE_DUR = 0.95;      // quanto tempo a pose da skill fica no snapshot (o movimento do bot nao a sobrescreve)
function ataqueBot(c, bot, m){
  if(m && m.k === 's'){ const pose = (POSE_ARMA[bot.arma] || [])[m.i | 0]; if(pose){ bot.aPose = pose; bot.aPoseAte = CTX.agora() + POSE_DUR; bot.a = pose; } }
  if(m && !m.atraso) m.atraso = m.k === 's' ? 0.42 : 0.3;      // [reacao] so vale para golpe corpo a corpo (server.js ataque): o dano cai neste tempo depois do aviso
  return CTX.ataque(c, bot, m);
}
const r2 = v => Math.round(v * 100) / 100;

let CTX = null;
let proxBotId = 90000;
const bots = new Map(); // id -> bot

function init(contexto){
  CTX = contexto;
}

/* [paridade] ficha (nivel, pontos, arma, armadura, encantamento) de quem invocou os bots: o bot luta com o MESMO poder do jogador (so muda a arma/classe).
   Antes o bot nascia 'otimizado' (conjunto completo do grau, arma +7, todos os pontos em dano): nivel 40 contra nivel 40 mas ele matava em 11 golpes e levava 34. */
const CbL2 = require('./combate_l2.js');
function espelhoDe(J){
  try { if(!CTX || !CTX.ficha || !J || J.isBot) return null; const f = CTX.ficha(J, CTX.agora()); return f ? JSON.parse(JSON.stringify(f)) : null; } catch(e) { return null; }
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
/* modelo (.glb) do conjunto da raca para o grau: <raca>_brigandine (D), _fullplate (C), _doom (B), _tallum (A/S); sem grau = _nograde */
function comSet(base, grau){
  const suf = { D: 'brigandine', C: 'fullplate', B: 'doom', A: 'tallum', S: 'tallum' }[grau];
  if(!suf && base.indexOf('darkelf') === 0) return base;      // elfo negro: o corpo base e' o 'sem grau' (nao existe darkelf_*_nograde.glb)
  return base + '_' + (suf || 'nograde');
}
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
    raca = comSet('human_fighter_female', grau);
  } else if(racaBase === 'magic_m'){
    raca = comSet('magic_m', grau);
  } else if(racaBase === 'magic_f'){
    raca = comSet('magic_f', grau);
  } else if(racaBase === 'orc_m'){
    raca = comSet('orc_m', grau);
  } else if(racaBase === 'orc_f'){
    raca = comSet('orc_f', grau);
  } else if(racaBase === 'elf_m'){
    raca = comSet('elf_m', grau);
  } else if(racaBase === 'dwarf_m'){
    raca = comSet('dwarf_m', grau);
  } else if(racaBase === 'darkelf_f'){
    raca = comSet('darkelf_f', grau);      // set = armaduras do elfo no corpo do elfo negro (as malhas proprias sao ilegiveis no cliente)
  } else if(racaBase === 'darkelf_m'){
    raca = comSet('darkelf_m', grau);
  }

  // 2. Armas e Encantamentos por Grau
  let wb = 'sword_long';
  let en = 0;

  if(armaTipo === 'book'){
    // Clérigo / Healer: Cajado de mago conforme o grau (idêntico ao L2, sem livro)
    if(grau === 'S'){ wb = 'ghouls_staff'; en = 16; }
    else if(grau === 'A'){ wb = 'sword_of_miracles'; en = 13; }
    else if(grau === 'B'){ wb = 'valhalla'; en = 10; }
    else if(grau === 'C'){ wb = 'ghouls_staff'; en = 7; }
    else if(grau === 'D'){ wb = 'ghost_staff'; en = 4; }
    else { wb = 'staff_arcane'; en = 0; }
  } else if(armaTipo === 'shield'){
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

  // 3. Skills liberadas conforme o nível
  const skills = [];
  if(armaTipo === 'book'){
    // Clérigo: 0 Cura Mirada, 1 Glifo de Cura, 2 Escudo Astral, 3 Purificação, 4 Prece, 5 Ressurreição
    skills.push(0);
    if(lv >= 5) skills.push(1);
    if(lv >= 10) skills.push(2);
    if(lv >= 20) skills.push(3);
    if(lv >= 25) skills.push(4);
    if(lv >= 30) skills.push(5);
  } else {
    const maxSkillIdx = lv >= 76 ? 6 : (lv >= 61 ? 4 : (lv >= 52 ? 3 : (lv >= 40 ? 2 : (lv >= 20 ? 1 : 0))));
    for(let i = 0; i <= maxSkillIdx; i++) skills.push(i);
  }

  // 4. HP proporcional ao nível e conjunto
  /* [dano-l2] 17/11/2026: vida = a de um jogador do mesmo nivel com o equipamento do bot (antes 300 + nivel^1,46 x 11, ~2,5x a de um jogador) */
  let hpBase; try { const Cb = require('./combate_l2.js'); const cls = { sword: 'guerreiro', shield: 'guardiao', staff: 'mago', book: 'clerico' }[armaTipo] || 'guerreiro'; hpBase = Cb.vidaMax(Cb.fichaBot(lv, cls, armaTipo, grau, en)); } catch(e){ hpBase = Math.round(300 + Math.pow(lv, 1.46) * 11); }

  return { raca, wb, en, grau, skills, hpBase };
}

/* Cria bots com configuração completa por nível e equipamento */
/* Salão do Baium (3o andar da Torre): piso plano e livre num disco de ~55 m em volta de (-28.4, -53.85) (medido no walkgrid, 18/11/2026).
   No meio ficam o altar e 4 pilares a ~17 m: ninguém nasce ali. Cada time nasce numa ponta (BAIUM_LADO m do centro, no eixo oeste-leste). */
const BAIUM_C = { x: -28.4, z: -53.85 }, BAIUM_LADO = 34, BAIUM_RMAX = 52, BAIUM_ANEL = [28, 38];
/* o ponto esta no salao do Baium (e nao no Coliseu antigo, que fica em 0,0 com 16 m) */
const noSalaoBaium = (x, z) => Math.hypot(x - BAIUM_C.x, z - BAIUM_C.z) < 58 && Math.hypot(x, z) > 16;
// Raio e limites seguros de navegação para evitar queda ou flutuação fora do chão
function clampCoordenadas(x, z, mapa){
  if(mapa === 'pvp'){
    // Detecta se a arena em uso é o Coliseu clássico (centro 0,0) ou o Salão do Baium / Torre (-28.4, -53.85)
    const emBaium = noSalaoBaium(x, z);
    const areX = emBaium ? BAIUM_C.x : 0;
    const areZ = emBaium ? BAIUM_C.z : 0;
    const rMax = emBaium ? BAIUM_RMAX : 12.8; // Coliseu tem anel em 13.5m; 12.8m garante piso 100% sólido sem flutuar
    const dx = x - areX, dz = z - areZ;
    const d = Math.hypot(dx, dz);
    if(d > rMax && d > 0.0001){
      return { x: r2(areX + (dx / d) * (rMax - 0.2)), z: r2(areZ + (dz / d) * (rMax - 0.2)) };
    }
  } else if(mapa === 'cidade' && Math.hypot(x - (-28.4), z - (-53.85)) < 30){
    const areX = -28.4, areZ = -53.85, rMax = 19.5;
    const dx = x - areX, dz = z - areZ;
    const d = Math.hypot(dx, dz);
    if(d > rMax && d > 0.0001){
      return { x: r2(areX + (dx / d) * (rMax - 0.2)), z: r2(areZ + (dz / d) * (rMax - 0.2)) };
    }
  }
  return { x: r2(x), z: r2(z) };
}

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
  const team = (opts.team === 'A' || opts.team === 'B') ? opts.team : '';
  const classeDesejada = (opts.classe || '').toLowerCase().trim();
  const comHealer = !!opts.comHealer;

  let criados = 0;
  for(let i = 0; i < qtd; i++){
    const id = proxBotId++;

    // Escolha da Persona (Classe + Raça + Arma)
    let persona;
    if(classeDesejada && CLASSES_MAP[classeDesejada]){
      persona = sorteio(CLASSES_MAP[classeDesejada]);
    } else if(comHealer && i === 0){
      // 1º bot do time é sempre o Healer / Clérigo (Livro Astral)
      persona = sorteio(CLASSES_MAP.clerigo);
    } else if(comHealer && i === 1 && qtd >= 2){
      // 2º bot do time é o Guardião / Tank (Escudo)
      persona = sorteio(CLASSES_MAP.guardiao);
    } else if(comHealer && i === 2 && qtd >= 3){
      // 3º bot do time é o Mago / Nuker (Cajado)
      persona = sorteio(CLASSES_MAP.mago);
    } else {
      persona = sorteio(RACAS_BASE);
    }

    const setup = setupPorNivel(persona.raca, persona.arma, lv);
    const nomeBase = nomeDisponivel();
    const nome = team ? (team === 'A' ? 'Azul_' : 'Verm_') + nomeBase : nomeBase;

    let bx, bz, fRot;
    if(qtd === 1){
      // Duelo 1v1: Spawna exatamente na frente do jogador/invocador a 4.2m de distância
      const dirPlayer = typeof opts.playerF === 'number' ? opts.playerF : (typeof opts.direcaoOlhar === 'number' ? opts.direcaoOlhar : 0);
      const distDuelo = 4.2;
      bx = r2(cx + Math.sin(dirPlayer) * distDuelo);
      bz = r2(cz + Math.cos(dirPlayer) * distDuelo);
      fRot = r2(dirPlayer + Math.PI); // virado de frente para o jogador
    } else if(opts.formacao){
      // Formação militar tática de batalha: linha de frente avançada, retaguarda protegida
      const isBackline = (persona.arma === 'book' || persona.arma === 'staff' || persona.cls === 'clerigo' || persona.cls === 'magic');
      const dir = typeof opts.direcaoOlhar === 'number' ? opts.direcaoOlhar : (team === 'A' ? Math.PI / 2 : -Math.PI / 2);
      const fwdX = Math.sin(dir);
      const fwdZ = Math.cos(dir);
      const latX = Math.cos(dir);
      const latZ = -Math.sin(dir);

      const distLinha = isBackline ? -2.4 : 1.8;
      const slotIndex = Math.floor(i / 2);
      const lado = (i % 2 === 0) ? 1 : -1;
      const distLat = slotIndex === 0 ? 0 : (lado * slotIndex * 2.2);

      bx = r2(cx + fwdX * distLinha + latX * distLat);
      bz = r2(cz + fwdZ * distLinha + latZ * distLat);
      fRot = typeof opts.direcaoOlhar === 'number' ? opts.direcaoOlhar : (team === 'A' ? Math.PI / 2 : -Math.PI / 2);
    } else {
      const ang = (i / qtd) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const raio = 3.5 + Math.random() * 8.5;
      bx = r2(cx + Math.sin(ang) * raio);
      bz = r2(cz + Math.cos(ang) * raio);
      fRot = typeof opts.direcaoOlhar === 'number' ? opts.direcaoOlhar : r2(Math.random() * 6.28);
    }

    const espelho = opts.espelho || null;
    let hpIni = setup.hpBase; if(espelho){ try { hpIni = Math.max(50, CbL2.vidaMax(espelho)); } catch(e) { /* mantem a vida padrao */ } }
    const cPos = clampCoordenadas(bx, bz, canal.mapa);
    bx = cPos.x;
    bz = cPos.z;

    const bot = {
      id,
      ws: { readyState: 1, send: () => {} }, // mock socket seguro
      nome,
      team,
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
      f: fRot,
      y: null,
      a: 'idle',
      ts: 1,
      guarda: false,
      pmax: hpIni,
      hp: hpIni,
      espelho,
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
      iaTipo: opts.ia || 'humano', // 'humano', 'agressivo', 'defensivo'
      ordem: 'normal',            // 'normal', 'avancar', 'proteger', 'recuar', 'pausar'
      modoTatico: 'combate',      // 'combate', 'peel', 'recuo', 'posicionamento'
      tRecuo: 0,
      tPausaCombo: 0,
      comboHits: 0,
      alvoFocoTeam: 0,
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
  if(!opts.silencioso){
    const grauTxt = grauPorNivel(lv);
    const setNome = grauTxt === 'S' ? 'Imperial/Tallum (+16)' : (grauTxt === 'A' ? 'Tallum (+13)' : (grauTxt === 'B' ? 'Doom (+10)' : (grauTxt === 'C' ? 'Full Plate (+7)' : (grauTxt === 'D' ? 'Brigandine (+4)' : 'No-Grade'))));
    const timeTxt = team ? ` [${team === 'A' ? 'Time Azul' : 'Time Vermelho'}]` : '';
    const msg = criados === 1
      ? `⚔️ DUELO 1v1: 1 bot${timeTxt} Nv ${lv} (Grau ${grauTxt} · ${setNome}) aceitou o desafio e está à sua frente!`
      : `⚔️ ${criados} bots${timeTxt} Nv ${lv} (Grau ${grauTxt} · ${setNome}) entraram na partida!`;
    CTX.difunde(canal, {
      t: 'chat',
      n: 'Sistema',
      m: msg,
      c: 's'
    });
  }

  return criados;
}

/* Cria duas equipes rivais (Time Azul vs Time Vermelho) com posições em cantos opostos e formação de batalha */
function spawnTimes(opts){
  if(!CTX) return { timeA: 0, timeB: 0 };
  const canal = opts.canal || canalArenaPvp() || canalCidade();
  if(!canal) return { timeA: 0, timeB: 0 };

  const qtdPorTime = Math.max(1, Math.min(25, opts.qtdPorTime || opts.qtd || 5));
  const lv = Math.max(1, Math.min(85, opts.lv || 40));
  const comHealer = opts.comHealer !== false;
  const classeA = opts.classeA || opts.classe || '';
  const classeB = opts.classeB || opts.classe || '';

  let cx, cz, distBase;

  if(canal.mapa === 'pvp'){
    // Detecta se estamos no Coliseu clássico (0,0) ou no Salão de Baium / Torre (-28.4, -53.85)
    let emBaium = false;
    if(typeof opts.x === 'number' && typeof opts.z === 'number'){
      emBaium = noSalaoBaium(opts.x, opts.z);
    } else {
      for(const jog of canal.jog.values()){
        if(!jog.isBot && noSalaoBaium(jog.x, jog.z)){
          emBaium = true;
          break;
        }
      }
    }

    if(emBaium){
      cx = BAIUM_C.x;      // Azul na ponta oeste, Vermelho na ponta leste do salao: 2 x BAIUM_LADO m um do outro
      cz = BAIUM_C.z;
      distBase = BAIUM_LADO;
    } else {
      // Coliseu clássico (centro 0, 0, raio 13.5m)
      cx = 0;
      cz = 0;
      distBase = 7.5; // Times a 15m de distância, perfeitamente posicionados dentro do Coliseu
    }
  } else if(canal.mapa === 'cidade'){
    // Campo aberto ao sul de Talking Island
    cx = (typeof opts.x === 'number' && Math.abs(opts.x) > 40) ? opts.x : 0;
    cz = (typeof opts.z === 'number' && opts.z > 70) ? opts.z : 105;
    distBase = 24.0;
  } else {
    cx = typeof opts.x === 'number' ? opts.x : 0;
    cz = typeof opts.z === 'number' ? opts.z : 0;
    distBase = 18.0;
  }

  // Time Azul (A): nasce no Canto Oeste (cx - distBase) perfilado em formação olhando para Leste
  const spA = spawnBots({
    espelho: opts.espelho,
    canal,
    x: cx - distBase,
    z: cz,
    qtd: qtdPorTime,
    lv,
    team: 'A',
    modo: 'pvp',
    comHealer,
    classe: classeA,
    direcaoOlhar: Math.PI / 2,
    formacao: true,
    silencioso: true
  });

  // Time Vermelho (B): nasce no Canto Leste (cx + distBase) perfilado em formação olhando para Oeste
  const spB = spawnBots({
    espelho: opts.espelho,
    canal,
    x: cx + distBase,
    z: cz,
    qtd: qtdPorTime,
    lv,
    team: 'B',
    modo: 'pvp',
    comHealer,
    classe: classeB,
    direcaoOlhar: -Math.PI / 2,
    formacao: true,
    silencioso: true
  });

  const grauTxt = grauPorNivel(lv);
  CTX.difunde(canal, {
    t: 'chat',
    n: 'Sistema',
    m: `🚩 GUERRA DE TIMES: 🔵 Time Azul (${spA}) vs 🔴 Time Vermelho (${spB}) · Nv ${lv} (Grau ${grauTxt})! Cantos opostos em formação de batalha!`,
    c: 's'
  });

  return { timeA: spA, timeB: spB };
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

/* Localiza o alvo prioritário da equipe (focus fire de grupo em alvos feridos ou healers) */
function alvoPrioritarioTime(canal, team, t){
  if(!canal || !canal.jog || !team) return null;
  let melhorAlvo = null;
  let menorHpPct = 999;
  let healerInimigo = null;

  for(const cand of canal.jog.values()){
    if(cand.morto || cand.hp <= 0 || t < cand.imune) continue;
    if(cand.team === team) continue;
    if(cand.team && cand.team !== team){
      const hpPct = (cand.hp || 0) / (cand.pmax || 1);
      if(hpPct < 0.40 && hpPct < menorHpPct){
        menorHpPct = hpPct;
        melhorAlvo = cand;
      }
      if((cand.arma === 'book' || cand.cls === 'clerigo') && !healerInimigo){
        healerInimigo = cand;
      }
    }
  }
  return melhorAlvo || healerInimigo;
}

/* Encontra alvo adequado para o bot com inteligência tática */
function buscaAlvo(bot, c, t){
  if(bot.ordem === 'pausar') return null;

  // Assistência Tática de Equipe (Focus Fire)
  if(bot.team && bot.iaTipo === 'humano'){
    const foco = alvoPrioritarioTime(c, bot.team, t);
    if(foco && Math.random() < 0.72){
      const d = Math.hypot(foco.x - bot.x, foco.z - bot.z);
      if(d < 38) return foco;
    }
  }

  let melhor = null;
  let melhorDist = 48;

  for(const cand of c.jog.values()){
    if(cand === bot || cand.morto || cand.hp <= 0) continue;
    if(t < cand.imune) continue;

    // Se ambos tiverem time e forem do mesmo time: nunca atacar!
    if(bot.team && cand.team && bot.team === cand.team) continue;

    // Se o bot tiver time e o candidato for aliado: nunca atacar!
    if(bot.team && CTX.aliadoDe && CTX.aliadoDe(c, bot, cand, t)) continue;

    // Se o bot estiver em modo 'inimigo', foca jogadores humanos
    if(bot.modo === 'inimigo' && cand.isBot) continue;

    const timeRival = !!(bot.team && cand.team && bot.team !== cand.team);
    const atacouEsseBot = bot.atacante && bot.atacante === cand.id;
    const d = Math.hypot(cand.x - bot.x, cand.z - bot.z);

    if(atacouEsseBot && d < 48){
      return cand;
    }

    // Se o bot tem time, ele busca preferencialmente o time rival pelo mapa
    let pesoDist = d;
    if(bot.team){
      if(timeRival){
        const hpPct = (cand.hp || 0) / (cand.pmax || 1);
        const bonusExecucao = hpPct < 0.4 ? 0.6 : 1.0;
        pesoDist = d * 0.25 * bonusExecucao;
      } else {
        pesoDist = d * 2.5; // evita quem não tem time
      }
    }

    if(pesoDist < melhorDist){
      melhorDist = pesoDist;
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

      // deslize da esquiva em andamento (veja [esquiva-justa])
      if(bot.rolaAte && t < bot.rolaAte){
        bot.a = 'roll';
        bot.x = r2(bot.x + bot.rolaVx * dt);
        bot.z = r2(bot.z + bot.rolaVz * dt);
        continue;
      }

      // Modo treino ou ordem de pausa
      if(bot.modo === 'treino' || bot.ordem === 'pausar'){
        bot.a = 'idle';
        bot.guarda = false;
        continue;
      }

      // Ordem coletiva: Recuo Geral / Reagrupar
      if(bot.ordem === 'recuar' && t < bot.tRecuo){
        bot.guarda = false;
        bot.a = 'run';
        const angRecuo = Math.atan2(bot.spawnX - bot.x, bot.spawnZ - bot.z);
        bot.f = r2(angRecuo);
        bot.x = r2(bot.x + Math.sin(angRecuo) * 5.8 * dt);
        bot.z = r2(bot.z + Math.cos(angRecuo) * 5.8 * dt);
        continue;
      }

      // 1. RECUO DE SOBREVIVÊNCIA POR HP BAIXO (< 28%)
      // Um jogador humano não continua batendo suicida com 10% de HP; ele desengaja e busca suporte!
      const hpPct = (bot.hp || 0) / (bot.pmax || 1);
      const isHealer = bot.arma === 'book' || bot.cls === 'clerigo';
      const isGuardiao = bot.arma === 'shield';
      const isMago = bot.arma === 'staff';

      if(hpPct < 0.28 && bot.iaTipo === 'humano' && !isHealer && bot.ordem !== 'avancar'){
        if(t > bot.tRecuo){
          bot.tRecuo = t + 2.5; // recua por 2.5 segundos
          bot.a = 'roll';
          bot.imune = t + 0.35;
        }
      }

      if(t < bot.tRecuo && !isHealer){
        // Recua em direção à base ou ao Healer do time
        let destinoX = bot.spawnX, destinoZ = bot.spawnZ;
        if(bot.team){
          for(const W of c.jog.values()){
            if(W.team === bot.team && (W.arma === 'book' || W.cls === 'clerigo') && !W.morto && W.hp > 0){
              destinoX = W.x; destinoZ = W.z;
              break;
            }
          }
        }
        const dxR = destinoX - bot.x, dzR = destinoZ - bot.z;
        const dR = Math.hypot(dxR, dzR) || 1;
        bot.f = r2(Math.atan2(dxR, dzR));
        bot.a = 'run';
        bot.guarda = false;
        const k = Math.min(dR, 5.8 * dt);
        bot.x = r2(bot.x + (dxR / dR) * k);
        bot.z = r2(bot.z + (dzR / dR) * k);
        continue;
      }

      // IA DEDICADA DE CLÉRIGO / HEALER (LIVRO ASTRAL)
      if(isHealer){
        // Instinto de Sobrevivência & Fuga Tática do Healer:
        // Se um inimigo estiver colado no curandeiro (< 4.2m), ele NÃO fica parado apanhando!
        let perseguidor = null;
        let menorDistInim = 4.5;
        for(const Inim of c.jog.values()){
          if(Inim.morto || Inim.hp <= 0) continue;
          if(bot.team && Inim.team === bot.team) continue;
          if(CTX.aliadoDe && CTX.aliadoDe(c, bot, Inim, t)) continue;
          const dI = Math.hypot(Inim.x - bot.x, Inim.z - bot.z);
          if(dI < menorDistInim){ menorDistInim = dI; perseguidor = Inim; }
        }

        if(perseguidor){
          // Auto-preservação: Escudo Astral se disponível
          if(bot.skills.includes(2) && (!bot.cd['book2'] || t > bot.cd['book2'])){
            bot.a = 'c_s3';
            bot.tAtk = t + 1.2;
            ataqueBot(c, bot, { k: 's', i: 2, al: bot.id, f: bot.f, p: 1 });
          } else if(Math.random() < 0.25 && t > bot.tAtk && t > (bot.tEsquivaCd || 0)){
            bot.a = 'roll';
            bot.imune = t + 0.28;
            bot.tEsquivaCd = t + 3.5;      // healer tambem tem recarga na esquiva
          }

          // Corre na direção do Guardião ou Guerreiro aliado mais próximo!
          let protetor = null;
          let menorDistP = 999;
          for(const W of c.jog.values()){
            if(W === bot || W.morto || W.hp <= 0 || W.arma === 'book') continue;
            if((bot.team && W.team === bot.team) || (CTX.aliadoDe && CTX.aliadoDe(c, bot, W, t))){
              const d = Math.hypot(W.x - bot.x, W.z - bot.z);
              if(d < menorDistP){ menorDistP = d; protetor = W; }
            }
          }

          let dirFugaX, dirFugaZ;
          if(protetor){
            dirFugaX = protetor.x - bot.x;
            dirFugaZ = protetor.z - bot.z;
          } else {
            dirFugaX = bot.x - perseguidor.x;
            dirFugaZ = bot.z - perseguidor.z;
          }
          const dFuga = Math.hypot(dirFugaX, dirFugaZ) || 1;
          bot.f = r2(Math.atan2(dirFugaX, dirFugaZ));
          bot.a = 'run';
          bot.guarda = false;
          const k = 5.8 * dt;
          bot.x = r2(bot.x + (dirFugaX / dFuga) * k);
          bot.z = r2(bot.z + (dirFugaZ / dFuga) * k);
          continue;
        }

        // 1. Procura aliado caído do mesmo time para ressuscitar (até 12m)
        let aliadoCaido = null;
        let menorDistCaido = 14;
        for(const W of c.jog.values()){
          if(W === bot || !W.morto || (W.hp > 0)) continue;
          if(CTX.aliadoDe && !CTX.aliadoDe(c, bot, W, t)) continue;
          if(bot.team && W.team && bot.team !== W.team) continue;
          const d = Math.hypot(W.x - bot.x, W.z - bot.z);
          if(d < menorDistCaido){ menorDistCaido = d; aliadoCaido = W; }
        }

        // Se tem aliado caído e skill de ressurreição (skill 5, lv >= 30)
        if(aliadoCaido && bot.skills.includes(5) && t > bot.tSkill){
          const dx = aliadoCaido.x - bot.x, dz = aliadoCaido.z - bot.z;
          const dist = Math.hypot(dx, dz) || 0.001;
          bot.f = r2(Math.atan2(dx, dz));
          if(dist > 9){
            bot.a = 'run';
            const k = Math.min(dist - 8, 6.2 * dt);
            bot.x = r2(bot.x + (dx / dist) * k);
            bot.z = r2(bot.z + (dz / dist) * k);
          } else {
            bot.a = 'c_s6';
            bot.tSkill = t + 4.5;
            bot.tAtk = t + 2.5;
            ataqueBot(c, bot, { k: 's', i: 5, al: aliadoCaido.id, f: bot.f, p: 1 });
          }
          continue;
        }

        // 2. Autopreservação: se o Healer estiver com pouco HP (< 65%)
        if(bot.hp < bot.pmax * 0.65 && t > bot.tAtk){
          if(bot.skills.includes(2) && (!bot.cd['book2'] || t > bot.cd['book2'])){
            bot.a = 'c_s3';
            bot.tAtk = t + 1.2;
            ataqueBot(c, bot, { k: 's', i: 2, al: bot.id, f: bot.f, p: 1 });
            continue;
          } else {
            bot.a = 'c_s1';
            bot.tAtk = t + 1.0;
            if(CTX.curaJog) CTX.curaJog(c, bot, bot, Math.round(bot.pmax * 0.35), t);
            continue;
          }
        }

        // 3. Procura aliado mais ferido do time
        let aliadoFerido = null;
        let menorPctHp = 0.85; // Só cura se tiver < 85% de vida
        let aliadosPerto = 0;
        for(const W of c.jog.values()){
          if(W.morto || W.hp <= 0) continue;
          if(CTX.aliadoDe && !CTX.aliadoDe(c, bot, W, t)) continue;
          if(bot.team && W.team && bot.team !== W.team) continue;
          const d = Math.hypot(W.x - bot.x, W.z - bot.z);
          if(d < 5) aliadosPerto++;
          const pct = W.hp / (W.pmax || 1);
          if(pct < menorPctHp && d < 36){
            menorPctHp = pct;
            aliadoFerido = W;
          }
        }

        // 4. Se tiver 2 ou mais aliados perto e Prece estiver pronta (buff em área de atk/def)
        if(aliadosPerto >= 2 && bot.skills.includes(4) && t > bot.tSkill && (!bot.cd['book4'] || t > bot.cd['book4'])){
          bot.a = 'c_s5';
          bot.tSkill = t + 8.0;
          bot.tAtk = t + 1.2;
          ataqueBot(c, bot, { k: 's', i: 4, f: bot.f, p: 1 });
          continue;
        }

        // 5. Cura no aliado mais ferido
        if(aliadoFerido){
          const dx = aliadoFerido.x - bot.x, dz = aliadoFerido.z - bot.z;
          const dist = Math.hypot(dx, dz) || 0.001;
          bot.f = r2(Math.atan2(dx, dz));

          if(dist > 12){
            bot.a = 'run';
            const k = Math.min(dist - 8, 6.2 * dt);
            bot.x = r2(bot.x + (dx / dist) * k);
            bot.z = r2(bot.z + (dz / dist) * k);
          } else {
            if(t > bot.tAtk){
              bot.tAtk = t + 1.1 + Math.random() * 0.4;
              if(menorPctHp < 0.45 && bot.skills.includes(2) && (!bot.cd['book2'] || t > bot.cd['book2'])){
                // Aliado em perigo grave: Escudo Astral
                bot.a = 'c_s3';
                ataqueBot(c, bot, { k: 's', i: 2, al: aliadoFerido.id, f: bot.f, p: 1 });
              } else if(aliadosPerto >= 2 && bot.skills.includes(1) && (!bot.cd['book1'] || t > bot.cd['book1'])){
                // Glifo de Cura no chão
                bot.a = 'c_s2';
                ataqueBot(c, bot, { k: 's', i: 1, x: aliadoFerido.x, z: aliadoFerido.z, f: bot.f, p: 1 });
              } else {
                // Cura Mirada
                bot.a = 'c_s1';
                ataqueBot(c, bot, { k: 's', i: 0, al: aliadoFerido.id, f: bot.f, p: 1 });
                if(CTX.curaJog) CTX.curaJog(c, bot, aliadoFerido, 70, t);
              }
            } else {
              bot.a = 'idle';
            }
          }
          continue;
        }
      }

      // Atualiza / busca alvo
      let alvo = bot.alvoId ? c.jog.get(bot.alvoId) : null;
      if(!alvo || alvo.morto || alvo.hp <= 0 || Math.hypot(alvo.x - bot.x, alvo.z - bot.z) > 46){
        alvo = buscaAlvo(bot, c, t);
        bot.alvoId = alvo ? alvo.id : 0;
      }

      // IA DE PEELING DO GUARDIÃO (TANK)
      // Se algum aliado frágil do time estiver sendo atacado a menos de 15m, o Guardião intercepta!
      if(isGuardiao && bot.team && bot.ordem !== 'avancar'){
        let ameaca = null;
        for(const W of c.jog.values()){
          if(W === bot || W.morto || W.hp <= 0 || W.team !== bot.team) continue;
          const ehFragil = (W.arma === 'book' || W.cls === 'clerigo' || W.arma === 'staff' || (W.hp / W.pmax < 0.35));
          if(ehFragil){
            for(const Inim of c.jog.values()){
              if(Inim.morto || Inim.hp <= 0 || Inim.team === bot.team) continue;
              const dInim = Math.hypot(Inim.x - W.x, Inim.z - W.z);
              if(dInim < 4.8){
                ameaca = Inim;
                break;
              }
            }
          }
          if(ameaca) break;
        }

        if(ameaca){
          alvo = ameaca;
          bot.alvoId = ameaca.id;
          bot.modoTatico = 'peel';
        }
      }

      // Sem alvo: patrulha suave próximo ao ponto de spawn
      if(!alvo){
        bot.guarda = false;
        const dSpawn = Math.hypot(bot.spawnX - bot.x, bot.spawnZ - bot.z);
        if(dSpawn > 18){
          const angVolta = Math.atan2(bot.spawnX - bot.x, bot.spawnZ - bot.z);
          bot.f = r2(angVolta);
          bot.x = r2(bot.x + Math.sin(angVolta) * 5.2 * dt);
          bot.z = r2(bot.z + Math.cos(angVolta) * 5.2 * dt);
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

      const isHealerCombat = bot.arma === 'book' || bot.cls === 'clerigo';
      const distIdeal = (isMago || isHealerCombat) ? 10.0 : 2.1;

      // Distância de combate
      if(dist > distIdeal + 0.5){
        // Aproximação ágil (rush)
        bot.guarda = false;
        bot.a = 'run';
        const vel = 6.4;
        const k = Math.min(dist - distIdeal, vel * dt);
        bot.x = r2(bot.x + (dx / dist) * k);
        bot.z = r2(bot.z + (dz / dist) * k);
      } else if((isMago || isHealerCombat) && dist < 4.5){
        // Mago / Healer recua se alvo encostar
        bot.guarda = false;
        bot.a = 'run';
        const k = 5.2 * dt;
        bot.x = r2(bot.x - (dx / dist) * k);
        bot.z = r2(bot.z - (dz / dist) * k);
      } else {
        // Alcance de golpe

        // 1. Respeito à Guarda do Alvo (Shield Awareness):
        // Se o oponente ergueu o escudo, o bot humano NÃO bate na parede frontal de escudo!
        const alvoBloqueando = alvo.guarda || (alvo.a && alvo.a.indexOf('guard') >= 0);
        if(alvoBloqueando){
          // Circula rapidamente pelo flanco ou recua 1 metro
          const angFlanco = angAlvo + Math.PI / 2 * bot.strafeDir;
          bot.x = r2(bot.x + Math.sin(angFlanco) * 2.8 * dt);
          bot.z = r2(bot.z + Math.cos(angFlanco) * 2.8 * dt);
          bot.tAtk = Math.max(bot.tAtk, t + 0.45);
          bot.a = 'run';
          continue;
        }

        // 2. Bloqueio Reativo do Guardião:
        // Se o inimigo iniciou ataque corpo a corpo, o Guardião ergue o escudo!
        const alvoAtacando = alvo.a && (alvo.a.indexOf('slash') >= 0 || alvo.a.indexOf('thrust') >= 0 || alvo.a.indexOf('atk') >= 0);
        if(isGuardiao && alvoAtacando && dist < 3.2 && !bot.guarda && t > (bot.tGuardaCd || 0) && Math.random() < 0.45){
          bot.guarda = true;
          bot.a = 'guard';
          bot.tGuardaCd = t + 1.9;      // 0,75 s de guarda + folga: o jogador acha o intervalo (antes a guarda quase nunca caia)
          setTimeout(() => { if(bot) bot.guarda = false; }, 750);
          continue;
        }

        // 3. Cadência Humana (Pacing & Footsies - pausa entre combos):
        if(t < bot.tPausaCombo){
          // Movimentação orbital leve enquanto recupera estamina/fôlego
          const lateralAng = angAlvo + Math.PI / 2 * bot.strafeDir;
          bot.x = r2(bot.x + Math.sin(lateralAng) * 1.6 * dt);
          bot.z = r2(bot.z + Math.cos(lateralAng) * 1.6 * dt);
          bot.a = 'idle';
          continue;
        }

        if(t > bot.tStrafe){
          bot.tStrafe = t + 1.2 + Math.random() * 1.8;
          bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
        }

        // Movimento orbital lateral sutil
        const lateralAng = angAlvo + Math.PI / 2 * bot.strafeDir;
        bot.x = r2(bot.x + Math.sin(lateralAng) * 1.5 * dt);
        bot.z = r2(bot.z + Math.cos(lateralAng) * 1.5 * dt);

        // Guardião: postura de guarda preventiva ocasional
        if(isGuardiao && Math.random() < 0.22 && !bot.guarda){
          bot.guarda = true;
          bot.a = 'guard';
          setTimeout(() => { if(bot) bot.guarda = false; }, 850);
        }

        // Esquiva defensiva (roll) quando sob ataque
        // [esquiva-justa] 18/11/2026: antes bastava ter sido atingido uma vez (atacante nunca zerava) para ter 12% de chance A CADA 83 ms de rolar: ~35% do tempo invulneravel e
        // teletransporte de 3,6 m, sem gastar nada. Agora so rola quando o alvo esta mesmo golpeando perto, com recarga de 3,5 s, 35% de chance, e desliza em 0,28 s.
        if(bot.atacante && alvoAtacando && dist < 5.5 && t > (bot.tEsquivaCd || 0) && t > bot.tAtk && Math.random() < 0.35){
          bot.a = 'roll';
          bot.imune = t + 0.28;
          bot.tEsquivaCd = t + 3.5;
          bot.rolaAte = t + 0.28;
          bot.rolaVx = Math.sin(lateralAng) * 4.2 / 0.28;
          bot.rolaVz = Math.cos(lateralAng) * 4.2 / 0.28;
          bot.tAtk = t + 0.6;
          bot.comboHits = 0;
          continue;
        }

        // Execução de ataque / skills
        if(t > bot.tAtk && !bot.guarda){
          bot.comboHits = (bot.comboHits || 0) + 1;
          // Após 2 ataques consecutivos, faz uma pausa tática de 0.5s a 0.8s (footsies)
          if(bot.comboHits >= 2 && bot.iaTipo === 'humano'){
            bot.comboHits = 0;
            bot.tPausaCombo = t + 0.5 + Math.random() * 0.35;
          }

          bot.tAtk = t + 0.75 + Math.random() * 0.35;
          const temSkills = bot.skills && bot.skills.length > 0;
          const usaSkill = temSkills && t > bot.tSkill && Math.random() < 0.55;

          if(isHealerCombat){
            // Ataque de luz do clérigo
            bot.a = 'c_s1';
            ataqueBot(c, bot, { k: 'b', id: 'thrust', f: bot.f });
          } else if(usaSkill){
            // Filtra skills que não estão em cooldown no servidor
            const skillsProntas = bot.skills.filter(i => {
              const cdKey = bot.arma + i;
              return !bot.cd[cdKey] || t >= bot.cd[cdKey];
            });

            if(skillsProntas.length > 0){
              bot.tSkill = t + 2.8 + Math.random() * 2.0;
              const skIdx = sorteio(skillsProntas);
              const anims = isMago ? ['m_s1', 'm_s2', 'm_s3', 'm_s4'] : ['slash1', 'slash2', 'slash3', 'slash4', 'thrust', 'spin'];
              bot.a = anims[skIdx % anims.length];
              bot.tAtk = t + 0.95;
              ataqueBot(c, bot, { k: 's', i: skIdx, f: bot.f, p: 1 });
            } else {
              const golpe = COMBOS_BASICOS[(bot.combo++) % COMBOS_BASICOS.length];
              bot.a = bot.combo % 2 ? 'slash1' : 'slash2';
              ataqueBot(c, bot, { k: 'b', id: golpe, f: bot.f });
            }
          } else {
            const golpe = COMBOS_BASICOS[(bot.combo++) % COMBOS_BASICOS.length];
            bot.a = bot.combo % 2 ? 'slash1' : 'slash2';
            ataqueBot(c, bot, { k: 'b', id: golpe, f: bot.f });
          }
        }
      }
    } catch(err){
      // Protege contra qualquer exceção isolada de um bot
      console.warn('[Fakes tick erro]', err && err.message);
    }
  }

  // PASSE FINAL DE SEGURANÇA ESPACIAL E POSICIONAMENTO HUMANO:
  // 1. Anti-dogpiling (espaçamento natural entre aliados e inimigos)
  // 2. Restrição estrita de perímetro (impede atravessar paredes ou flutuar no vazio da arena)
  for(const c of CTX.canais.cidade.concat(CTX.canais.pvp)){
    if(!c || !c.jog || c.jog.size === 0) continue;
    for(const bot of bots.values()){
      if(bot.canalRef !== c || bot.morto || bot.hp <= 0) continue;

      // Anti-dogpiling
      for(const outro of c.jog.values()){
        if(outro === bot || outro.morto || outro.hp <= 0) continue;
        const dSepX = bot.x - outro.x, dSepZ = bot.z - outro.z;
        const dSep = Math.hypot(dSepX, dSepZ);
        const espacoMin = 1.6;
        if(dSep > 0.0001 && dSep < espacoMin){
          const forca = ((espacoMin - dSep) / espacoMin) * 2.8 * dt;
          bot.x = r2(bot.x + (dSepX / dSep) * forca);
          bot.z = r2(bot.z + (dSepZ / dSep) * forca);
        }
      }

      // Restringe ao piso seguro
      const cp = clampCoordenadas(bot.x, bot.z, c.mapa);
      bot.x = cp.x;
      bot.z = cp.z;
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

  // /1v1 ou /duelo [lv] [classe] -> Duelo solo diretamente em frente ao jogador
  if(cmd === '/1v1' || cmd === '/duelo' || sub === '1v1' || sub === 'duelo'){
    const lv = Math.min(85, Math.max(1, parseInt(cmd === '/1v1' || cmd === '/duelo' ? sub : arg2, 10) || J.lv || 40));
    const argClasse = (cmd === '/1v1' || cmd === '/duelo' ? arg2 : arg3) || '';
    const sp = spawnBots({ espelho: espelhoDe(J), canal: c, x: J.x, z: J.z, qtd: 1, lv, modo: 'pvp', classe: argClasse, playerF: J.f, ia: 'humano' });
    sis(`⚔️ 1 bot Nv ${lv} (${argClasse || 'desafiante'}) aceitou seu duelo 1v1 e está à sua frente!`);
    return;
  }

  // /bot ordem [avancar|proteger|recuar|pausar|continuar]
  if(sub === 'ordem' || sub === 'tatico'){
    const ordem = (arg2 || 'normal').toLowerCase();
    const tNow = agora();
    let n = 0;
    for(const b of bots.values()){
      if(b.canalRef === c){
        b.ordem = ordem;
        if(ordem === 'recuar') b.tRecuo = tNow + 4.5;
        n++;
      }
    }
    sis(`🚩 Ordem tática para ${n} bots definida: ${ordem.toUpperCase()}`);
    return;
  }

  // Atalhos diretos de ordens
  if(sub === 'pausar'){
    for(const b of bots.values()) if(b.canalRef === c) b.ordem = 'pausar';
    sis('🛑 Todos os bots foram pausados.');
    return;
  }
  if(sub === 'continuar' || sub === 'play'){
    for(const b of bots.values()) if(b.canalRef === c) b.ordem = 'normal';
    sis('▶️ Bots retomaram o combate!');
    return;
  }
  if(sub === 'avancar'){
    for(const b of bots.values()) if(b.canalRef === c) b.ordem = 'avancar';
    sis('⚔️ Ordem: AVANÇAR!');
    return;
  }
  if(sub === 'proteger'){
    for(const b of bots.values()) if(b.canalRef === c) b.ordem = 'proteger';
    sis('🛡️ Ordem: PROTEGER HEALER!');
    return;
  }
  if(sub === 'recuar' || sub === 'reagrupar'){
    const tNow = agora();
    for(const b of bots.values()) if(b.canalRef === c){ b.ordem = 'recuar'; b.tRecuo = tNow + 4.5; }
    sis('🏃 Ordem: RECUAR / REAGRUPAR!');
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

  // /bot times [qtdPorTime] [lv] -> Guerra de Times (Azul vs Vermelho) com 1 Healer garantido em cada lado
  if(sub === 'times' || sub === 'guerra'){
    const qtdPorTime = Math.min(25, Math.max(1, parseInt(arg2, 10) || 5));
    const lv = Math.min(85, Math.max(1, parseInt(arg3, 10) || J.lv || 40));
    const r = spawnTimes({ espelho: espelhoDe(J), canal: c, x: J.x, z: J.z, qtdPorTime, lv, comHealer: true });
    sis(`🚩 Guerra de Times iniciada! Azul (${r.timeA}) vs Vermelho (${r.timeB}) · Nv ${lv} com Healers em combate!`);
    return;
  }

  // /bot time [azul|vermelho|A|B] [classe] [qtd] [lv]
  if(sub === 'time' || sub === 'team'){
    const timeArg = (arg2 || 'A').toUpperCase();
    const team = (timeArg === 'A' || timeArg === 'AZUL' || timeArg === 'BLUE') ? 'A' : 'B';
    const argClasse = (arg3 || 'equilibrada').toLowerCase();
    const qtd = Math.min(30, Math.max(1, parseInt(partes[4], 10) || 5));
    const lv = Math.min(85, Math.max(1, parseInt(partes[5], 10) || J.lv || 40));
    const sp = spawnBots({ espelho: espelhoDe(J), canal: c, x: J.x, z: J.z, qtd, lv, team, modo: 'pvp', classe: argClasse, comHealer: argClasse.includes('healer') || argClasse === 'equilibrada' });
    sis(`⚔️ ${sp} bots do ${team === 'A' ? 'Time Azul' : 'Time Vermelho'} (${argClasse}) Nv ${lv} criados!`);
    return;
  }

  // /bot healer [qtd] [lv]
  if(sub === 'healer' || sub === 'clerigo'){
    const qtd = Math.min(20, Math.max(1, parseInt(arg2, 10) || 2));
    const lv = Math.min(85, Math.max(1, parseInt(arg3, 10) || J.lv || 40));
    const sp = spawnBots({ espelho: espelhoDe(J), canal: c, x: J.x, z: J.z, qtd, lv, classe: 'clerigo', modo: 'pvp' });
    sis(`✝️ ${sp} bots Clérigos / Healers Nv ${lv} criados ao seu redor!`);
    return;
  }

  // /bot classe [guerreiro|guardiao|mago|healer] [qtd] [lv]
  if(sub === 'classe'){
    const classe = (arg2 || 'guerreiro').toLowerCase();
    const qtd = Math.min(30, Math.max(1, parseInt(arg3, 10) || 5));
    const lv = Math.min(85, Math.max(1, parseInt(partes[4], 10) || J.lv || 40));
    const sp = spawnBots({ espelho: espelhoDe(J), canal: c, x: J.x, z: J.z, qtd, lv, classe, modo: 'pvp' });
    sis(`⚔️ ${sp} bots da classe ${classe.toUpperCase()} Nv ${lv} criados ao seu redor!`);
    return;
  }

  // /bot arena [qtd] [lv]
  if(sub === 'arena'){
    const qtd = Math.min(30, Math.max(1, parseInt(arg2, 10) || 10));
    const lv = Math.min(85, Math.max(1, parseInt(arg3, 10) || J.lv || 40));
    const cArena = canalArenaPvp();
    const emBaium = (cArena && cArena.jog) ? [...cArena.jog.values()].some(j => !j.isBot && noSalaoBaium(j.x, j.z)) : false;
    const ax = emBaium ? BAIUM_C.x : 0;
    const az = emBaium ? BAIUM_C.z : 0;
    const sp = spawnBots({ espelho: espelhoDe(J), canal: cArena, x: ax, z: az, qtd, modo: 'pvp', lv, comHealer: true });
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
    const sp = spawnBots({ espelho: espelhoDe(J), canal: cCid, x: cx, z: cz, qtd, modo: 'pvp', lv, comHealer: true });
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
    sis('/bot times 5 40           -> Inicia guerra 5v5 (Time Azul vs Vermelho com Healers)');
    sis('/bot time azul healer 1 40 -> Cria 1 Healer no Time Azul');
    sis('/bot classe mago 5 40      -> Cria 5 Magos');
    sis('/bot healer 2 40           -> Cria 2 Healers');
    sis('/time azul                 -> Entra no Time Azul (ou /time vermelho / /time neutro)');
    sis('/bot 10 76                 -> Cria 10 bots Nv 76 (Grau S)');
    sis('/bot arena 10 40           -> Cria 10 bots Nv 40 na Arena PvP');
    sis('/bot limpar                -> Deleta todos os bots');
    sis('/painel                    -> Abre o Painel Visual de Bots');
    return;
  }

  // /bot [numero] [lv] (ex: /bot 10 ou /bot 10 76 ou /bot 5 20)
  const qtdNum = parseInt(sub, 10);
  const qtd = isNaN(qtdNum) ? 10 : Math.min(30, Math.max(1, qtdNum));
  const lvNum = parseInt(arg2, 10);
  const lv = isNaN(lvNum) ? (J.lv || 40) : Math.min(85, Math.max(1, lvNum));

  const sp = spawnBots({ espelho: espelhoDe(J), canal: c, x: J.x, z: J.z, qtd, modo: 'pvp', lv, comHealer: true });
  sis(`⚔️ ${sp} bots Nv ${lv} criados ao seu redor! Boa luta!`);
}

/* Executa ações vindas do Painel de Controle (m.t === 'bot_cmd') */
function executa(c, J, m){
  if(!CTX || !J) return;
  const acao = String(m.acao || '').toLowerCase();
  const qtd = Math.min(30, Math.max(1, parseInt(m.qtd, 10) || 10));
  const lv = Math.min(85, Math.max(1, parseInt(m.lv, 10) || J.lv || 40));
  const modo = ['pvp', 'inimigo', 'treino'].includes(m.modo) ? m.modo : 'pvp';

  if(acao === 'spawn_times'){
    let canal = c;
    let x = J.x, z = J.z;

    if(m.local === 'arena' || c.mapa === 'pvp'){
      canal = canalArenaPvp() || c;      // a arena de PvP e' sempre o salao do Baium (a posicao do jogador pode ainda nao ter chegado ao servidor)
      x = BAIUM_C.x;
      z = BAIUM_C.z;
    } else if(m.local === 'campo' || c.mapa === 'cidade'){
      canal = canalCidade() || c;
      x = Math.hypot(J.x, J.z) > 96 ? J.x : 0;
      z = Math.hypot(J.x, J.z) > 96 ? J.z : 105;
    }

    const r = spawnTimes({
      espelho: m.paridade === false ? null : espelhoDe(J),
      canal,
      x,
      z,
      qtdPorTime: Math.min(25, Math.max(1, parseInt(m.qtdPorTime, 10) || 5)),
      lv,
      comHealer: m.comHealer !== false,
      classeA: m.classeA || '',
      classeB: m.classeB || '',
      ia: m.ia || 'humano'
    });
    CTX.envia(J, { t: 'bot_info', total: bots.size, mapa: c.mapa });
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `🚩 Painel: Guerra de Times iniciada (Azul ${r.timeA} vs Vermelho ${r.timeB})!`, c: 's' });
  } else if(acao === 'spawn'){
    let canal = c;
    let x = J.x, z = J.z;

    if(m.local === 'arena' || c.mapa === 'pvp'){
      canal = canalArenaPvp() || c;
      x = BAIUM_C.x;
      z = BAIUM_C.z;
      if(qtd === 1 && noSalaoBaium(J.x, J.z)){ x = J.x; z = J.z; }                                  // duelo 1v1: o bot nasce na frente do jogador, nao no altar
      else if(m.team === 'A' || m.team === 'B'){ x = BAIUM_C.x + (m.team === 'A' ? -BAIUM_LADO : BAIUM_LADO); }   // time avulso: na ponta do time
      else { const a = Math.random() * 6.283, r = BAIUM_ANEL[0] + Math.random() * (BAIUM_ANEL[1] - BAIUM_ANEL[0]); x = BAIUM_C.x + Math.sin(a) * r; z = BAIUM_C.z + Math.cos(a) * r; }   // livre: num ponto do anel, longe do altar
    } else if(m.local === 'campo'){
      canal = canalCidade();
      x = Math.hypot(J.x, J.z) > 96 ? J.x : 0;
      z = Math.hypot(J.x, J.z) > 96 ? J.z : 105;
    }

    const criados = spawnBots({
      espelho: m.paridade === false ? null : espelhoDe(J),
      canal,
      x,
      z,
      qtd,
      modo,
      lv,
      team: m.team || '',
      classe: m.classe || '',
      comHealer: m.comHealer !== false,
      ia: m.ia || 'humano',
      playerF: J.f
    });
    CTX.envia(J, { t: 'bot_info', total: bots.size, mapa: c.mapa });
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `⚔️ Painel: ${criados} bots Nv ${lv} spawnados com sucesso!`, c: 's' });
  } else if(acao === 'ordem'){
    const ordem = String(m.ordem || 'normal').toLowerCase();
    const tNow = agora();
    let n = 0;
    for(const b of bots.values()){
      if(b.canalRef === c){
        b.ordem = ordem;
        if(ordem === 'recuar') b.tRecuo = tNow + 4.5;
        n++;
      }
    }
    CTX.envia(J, { t: 'chat', n: 'Sistema', m: `🚩 Painel: Ordem Tática ${ordem.toUpperCase()} transmitida a ${n} bots!`, c: 's' });
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
  noSalaoBaium, BAIUM_C, BAIUM_LADO, BAIUM_ANEL,
  spawnBots,
  spawnTimes,
  limparBots,
  matarBots,
  tick,
  comando,
  executa,
  setupPorNivel,
  grauPorNivel,
  CLASSES_MAP,
  get total(){ return bots.size; }
};
