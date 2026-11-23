'use strict';
const crypto = require('crypto');
const fs = require('fs'), path = require('path');
/* ==========================================================================
   ADMIN / GM POWERS - IS BLADE (17/11/2026)
   Sistema completo de administração e controle de jogo (GM):
   - Definir Nível (//setlevel [1-85], //lvl [1-85]) em Mim ou no Target
   - Ressurreição Instantânea (//ress, //res) em Mim ou no Target
   - Cura Total (//heal) em Mim ou no Target
   - Trocar Nick (//setnick [novo_nome], //nick) em Mim ou no Target
   - Trocar Sexo (//setsex [M|F|toggle], //sexo) em Mim ou no Target
   - Dar Kit Automático por Grau (//setkit [NG|D|C|B|A|S], //kit)
   - God Mode / Invulnerabilidade (//god, //invul)
   - Abater Alvo (//kill)
   - Adena e Economia (//adena [qtd])
   - Encantamento de Arma com Glow (//enchant [+4/+7/+10/+16])
   - Velocidade de Movimento GM (//speed [1-4])
   - Teleporte Rápido (//teleport [lugar], //goto [lugar])
   - Painel Visual de Admin (//admin, //painel, tecla F10)
   ========================================================================== */

let CTX = null;
/* [gm] objetos de Dion colocados pelo GM (NPCs e feixe de luz): dados/dion_objetos.json, em coordenadas do MUNDO da cidade */
const ARQ_OBJ = path.join(process.env.DATA_DIR || path.join(__dirname, 'dados'), 'dion_objetos.json');
const TIPOS_OBJ = ['npc_clarissa', 'npc_altran', 'npc_mammon', 'npc_wilford', 'npc_galladucci', 'feixe'];
function lerObj(){ try { const a = JSON.parse(fs.readFileSync(ARQ_OBJ, 'utf8')); return Array.isArray(a) ? a : []; } catch(e){ return []; } }
function salvaObj(a){ try { fs.mkdirSync(path.dirname(ARQ_OBJ), { recursive: true }); fs.writeFileSync(ARQ_OBJ, JSON.stringify(a, null, 1)); return null; } catch(e){ return e.message; } }
const objetosDion = () => lerObj();
/* [portoes-dion] 23/11/2026: estado dos portoes/portas do castelo (ids 1-9) e da fortaleza (17-28) de Dion = L2ServerObjectID do mapa. Arquivo dados/dion_portoes.json {id: 'fechado'|'aberto'|'destruido'} (so os que nao estao fechados). */
const ARQ_PORT = path.join(process.env.DATA_DIR || path.join(__dirname, 'dados'), 'dion_portoes.json');
const GRUPOS_PORT = { castelo: [1, 2, 3, 4, 5, 6, 7, 8, 9], forte: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] }, TODOS_PORT = GRUPOS_PORT.castelo.concat(GRUPOS_PORT.forte), ESTADOS_PORT = ['fechado', 'aberto', 'destruido'];
let PORT = null;
function lerPort(){ if(PORT) return PORT; PORT = {}; try { const o = JSON.parse(fs.readFileSync(ARQ_PORT, 'utf8')); for(const k of Object.keys(o)) if(TODOS_PORT.indexOf(+k) >= 0 && ESTADOS_PORT.indexOf(o[k]) >= 0) PORT[k] = o[k]; } catch(e){} return PORT; }
function salvaPort(){ try { fs.mkdirSync(path.dirname(ARQ_PORT), { recursive: true }); const o = {}; for(const k of Object.keys(PORT)) if(PORT[k] !== 'fechado') o[k] = PORT[k]; fs.writeFileSync(ARQ_PORT, JSON.stringify(o, null, 1)); return null; } catch(e){ return e.message; } }
const portoesDion = () => { const p = lerPort(), o = {}; for(const id of TODOS_PORT) o[id] = p[id] || 'fechado'; return o; };
function difundeCidade(msg){ try { for(const cc of (CTX.canais.cidade || [])) CTX.difunde(cc, msg); } catch(e){} }


const DESTINOS = {
  cidade: { nome: 'Dion (Cidade)', x: 1572, z: -42 },
  arena: { nome: 'Arena PvP (Coliseu)', x: -28.4, z: -53.85 },
  curuma: { nome: 'Torre de Cruma', x: -53.7, z: -42.7 },
  fortress: { nome: 'Fortaleza', x: -51.0, z: 51.5 },
  pantano: { nome: 'Pântano Flamejante', x: 51.1, z: 43.4 },
  baium: { nome: 'Salão de Baium', x: -28.4, z: -53.85 }
};

/* Kits Oficiais de Equipamento por Grau Lineage 2 */
const KITS_GRAU = {
  sem: {
    grau: 'sem',
    nome: 'No-Grade (Nv 1 · Set Plate/Devotion +0)',
    minLv: 1,
    en: 0,
    set: {
      helmet: 'helmet_iron',
      chest:  'chest_plate',
      legs:   'legs_plate',
      gloves: 'gloves_hide',
      boots:  'boots_swift'
    },
    armas: {
      sword:  'sword_long',
      shield: 'gladius',
      escudo: 'shield_guardian',
      staff:  'staff_arcane',
      book:   'staff_arcane'
    }
  },
  D: {
    grau: 'D',
    nome: 'Grau D (Nv 20 · Set Brigandine +4 Azul)',
    minLv: 20,
    en: 4,
    set: {
      helmet: 'brigandine_helmet',
      chest:  'brigandine_tunic',
      legs:   'brigandine_gaiters',
      gloves: 'brigandine_gauntlets',
      boots:  'brigandine_boots'
    },
    armas: {
      sword:  'claymore',
      shield: 'bastard_sword',
      escudo: 'composite_shield',
      staff:  'ghost_staff',
      book:   'ghost_staff'
    }
  },
  C: {
    grau: 'C',
    nome: 'Grau C (Nv 40 · Set Full Plate +7 Vívido)',
    minLv: 40,
    en: 7,
    set: {
      helmet: 'fullplate_helmet',
      chest:  'fullplate_armor',
      legs:   'fullplate_gaiters',
      gloves: 'fullplate_gauntlets',
      boots:  'fullplate_boots'
    },
    armas: {
      sword:  'berserker_blade',
      shield: 'samurai_longsword',
      escudo: 'full_plate_shield',
      staff:  'ghouls_staff',
      book:   'ghouls_staff'
    }
  },
  B: {
    grau: 'B',
    nome: 'Grau B (Nv 52 · Set Doom Plate +10 Púrpura)',
    minLv: 52,
    en: 10,
    set: {
      helmet: 'doom_helmet',
      chest:  'doom_armor',
      legs:   null, // Doom é armadura de corpo inteiro
      gloves: 'doom_gauntlets',
      boots:  'doom_boots'
    },
    armas: {
      sword:  'great_sword',
      shield: 'samurai_longsword',
      escudo: 'doom_shield',
      staff:  'valhalla',
      book:   'valhalla'
    }
  },
  A: {
    grau: 'A',
    nome: 'Grau A (Nv 61+ · Set Tallum / Dragon Slayer +16 Hero)',
    minLv: 61,
    en: 16,
    set: {
      helmet: 'tallum_helmet',
      chest:  'tallum_armor',
      legs:   null, // Tallum é armadura inteiriça
      gloves: 'tallum_gauntlets',
      boots:  'tallum_boots'
    },
    armas: {
      sword:  'dragon_slayer',
      shield: 'gladius',
      escudo: 'shield_imperial',
      staff:  'sword_of_miracles',
      book:   'sword_of_miracles'
    }
  }
};

/* Mapeamento de Sexo por Raça (Lineage 2) */
const MAPA_SEXO = {
  // Masculino -> Feminino
  'human_m': 'human_fighter_female',
  'human_fighter': 'human_fighter_female',
  'magic_m': 'magic_f',
  'elf_m': 'elf_f',
  'darkelf_m': 'darkelf_f',
  'orc_m': 'orc_f',
  'dwarf_m': 'dwarf_f',

  // Feminino -> Masculino
  'human_f': 'human_fighter',
  'human_fighter_female': 'human_fighter',
  'magic_f': 'magic_m',
  'elf_f': 'elf_m',
  'darkelf_f': 'darkelf_m',
  'orc_f': 'orc_m',
  'dwarf_f': 'dwarf_m'
};

function extrairRacaBase(racaStr){
  const s = String(racaStr || 'human_fighter').toLowerCase();
  if(s.includes('human_fighter_female') || s.includes('female') || s.includes('ffighter')) return 'human_fighter_female';
  if(s.includes('human_fighter') || s.includes('human_m') || s.includes('fighter')) return 'human_fighter';
  if(s.includes('darkelf_f')) return 'darkelf_f';
  if(s.includes('darkelf_m')) return 'darkelf_m';
  if(s.includes('darkelf')) return 'darkelf_f';
  if(s.includes('elf_f')) return 'elf_f';
  if(s.includes('elf_m')) return 'elf_m';
  if(s.includes('dwarf_f')) return 'dwarf_f';
  if(s.includes('dwarf_m')) return 'dwarf_m';
  if(s.includes('orc_f')) return 'orc_f';
  if(s.includes('orc_m')) return 'orc_m';
  if(s.includes('magic_f')) return 'magic_f';
  if(s.includes('magic_m')) return 'magic_m';
  return 'human_fighter';
}

function init(contexto){
  CTX = contexto;
}

function sis(J, msg){
  if(!CTX || !J) return;
  CTX.envia(J, { t: 'chat', n: 'Admin', m: msg, c: 's' });
}

function broadcastSis(c, msg){
  if(!CTX || !c) return;
  CTX.difunde(c, { t: 'chat', n: 'Admin', m: msg, c: 's' });
}

/* Verifica se um texto é um comando administrativo */
function ehComando(txt){
  if(!txt || typeof txt !== 'string') return false;
  const t = txt.trim().toLowerCase();
  if(t.startsWith('//')) return true;
  return /^\/(setlevel|lvl|nivel|ress|res|heal|curar|god|invul|kill|matar|adena|enchant|encantar|speed|velo|teleport|goto|admin|painel|gm|setkit|kit|setnick|nick|setsex|sexo)\b/.test(t);
}

/* Localiza um alvo no canal (por id, nome ou alvo do jogador) */
function obterAlvo(c, J, idOuNome){
  if(!c || !c.jog) return J;
  if(!idOuNome || idOuNome === 'eu' || idOuNome === J.id) return J;

  const idNum = parseInt(idOuNome, 10);
  if(!isNaN(idNum) && c.jog.has(idNum)) return c.jog.get(idNum);

  const nomeBuscado = String(idOuNome).toLowerCase();
  for(const jog of c.jog.values()){
    if(jog.nome && jog.nome.toLowerCase() === nomeBuscado) return jog;
  }

  // Se o jogador estiver com alvo selecionado no jogo
  if(J.alvoId && c.jog.has(J.alvoId)) return c.jog.get(J.alvoId);
  return J;
}

/* 1. Definir Nível */
function setLevel(c, J, lvNum, targetId){
  if(!CTX || !J) return;
  const lv = Math.max(1, Math.min(85, parseInt(lvNum, 10) || 1));
  const alvo = obterAlvo(c, J, targetId);

  if(alvo.isBot){
    alvo.lv = lv;
    if(CTX.Fakes && CTX.Fakes.setupPorNivel){
      const setup = CTX.Fakes.setupPorNivel(alvo.raca, alvo.arma, lv);
      alvo.pmax = setup.hpBase;
      alvo.hp = setup.hpBase;
      alvo.en = setup.en;
      alvo.wb = setup.wb;
      alvo.grau = setup.grau;
      alvo.skills = setup.skills;
      if(alvo.pers){
        alvo.pers.level = lv;
        alvo.pers.charType = setup.raca;
      }
      CTX.difunde(c, { t: 'en', v: alvo.id, en: alvo.en });
      CTX.difunde(c, { t: 'wb', v: alvo.id, b: alvo.wb });
      CTX.difunde(c, { t: 'ent_update', id: alvo.id, lv: alvo.lv, hp: alvo.hp, pmax: alvo.pmax, en: alvo.en, wb: alvo.wb, raca: alvo.raca, grau: alvo.grau });
    }
    broadcastSis(c, `👑 [ADMIN] Bot ${alvo.nome} foi configurado para Nível ${lv} (Grau ${alvo.grau})!`);
    return;
  }

  // Jogador real
  if(alvo.pers){
    alvo.pers.level = lv;
    alvo.pers.xp = 0;
    alvo.lv = lv;
    if(CTX.pmaxMax){
      alvo.pmax = CTX.pmaxMax(alvo.pers);
    } else {
      alvo.pmax = 400 + lv * 25;
    }
    alvo.hp = alvo.pmax;
    if(CTX.Contas) CTX.Contas.grava();
    if(CTX.Prog) CTX.envia(alvo, Object.assign({ t: 'prog', subiu: 1 }, CTX.Prog.info(alvo.pers)));
    CTX.envia(alvo, { t: 'usou', hp: alvo.hp, cura: 1 });
    CTX.difunde(c, { t: 'ent_update', id: alvo.id, lv: alvo.lv, hp: alvo.hp, pmax: alvo.pmax });
  }

  broadcastSis(c, `👑 [ADMIN] Nível de ${alvo.nome} definido para ${lv}! (HP Máximo: ${alvo.pmax})`);
}

/* 2. Ressuscitar (Ress) */
function ress(c, J, targetId){
  if(!CTX || !J) return;
  const alvo = obterAlvo(c, J, targetId);

  alvo.morto = false;
  alvo.hp = alvo.pmax;
  alvo.tMorte = 0;
  if(alvo.isBot){
    alvo.a = 'idle';
  }

  CTX.difunde(c, { t: 'resp', id: alvo.id, x: alvo.x, z: alvo.z, hp: alvo.hp, pm: alvo.pmax, keep: 1 });
  CTX.difunde(c, { t: 'ent_update', id: alvo.id, hp: alvo.hp, pmax: alvo.pmax });
  CTX.envia(alvo, { t: 'usou', hp: alvo.hp, cura: 1 });
  broadcastSis(c, `⚡ [ADMIN] ${alvo.nome} foi ressuscitado com 100% de vida e mana!`);
}

/* 3. Curar Tudo (Full Heal) */
function heal(c, J, targetId){
  if(!CTX || !J) return;
  const alvo = obterAlvo(c, J, targetId);

  alvo.morto = false;
  alvo.hp = alvo.pmax;
  CTX.difunde(c, { t: 'resp', id: alvo.id, x: alvo.x, z: alvo.z, hp: alvo.hp, pm: alvo.pmax, keep: 1 });
  CTX.difunde(c, { t: 'ent_update', id: alvo.id, hp: alvo.hp, pmax: alvo.pmax });
  CTX.envia(alvo, { t: 'usou', hp: alvo.hp, cura: 1 });
  sis(J, `💖 [ADMIN] ${alvo.nome} recebeu cura total (HP: ${alvo.hp}/${alvo.pmax})!`);
}

/* 4. Trocar Nick */
function setNick(c, J, novoNick, targetId){
  if(!CTX || !J) return;
  const limpo = String(novoNick || '').trim();
  if(!limpo || limpo.length < 2 || limpo.length > 20){
    sis(J, '⚠️ Nick inválido! Deve conter entre 2 e 20 caracteres.');
    return;
  }
  const alvo = obterAlvo(c, J, targetId);
  const antigo = alvo.nome;
  alvo.nome = limpo;
  if(alvo.pers){
    alvo.pers.name = limpo;
    if(CTX.Contas) CTX.Contas.grava();
  }
  CTX.difunde(c, { t: 'admin_renomeado', id: alvo.id, nome: limpo, antigo });
  CTX.difunde(c, { t: 'ent_update', id: alvo.id, nome: limpo });
  broadcastSis(c, `👑 [ADMIN] ${antigo} agora se chama ${limpo}!`);
}

/* 5. Trocar Sexo */
function setSexo(c, J, targetId, sexoDesejado){
  if(!CTX || !J) return;
  const alvo = obterAlvo(c, J, targetId);
  const racaAtual = (alvo.pers && alvo.pers.charType) || alvo.raca || 'human_fighter';
  const racaBaseAtual = extrairRacaBase(racaAtual);
  const isFem = racaBaseAtual.endsWith('_f') || racaBaseAtual === 'human_fighter_female';

  let novaRacaBase = racaBaseAtual;
  const sexoAlvo = String(sexoDesejado || '').toUpperCase();

  if(sexoAlvo === 'M'){
    novaRacaBase = isFem ? (MAPA_SEXO[racaBaseAtual] || 'human_fighter') : racaBaseAtual;
  } else if(sexoAlvo === 'F'){
    novaRacaBase = !isFem ? (MAPA_SEXO[racaBaseAtual] || 'human_fighter_female') : racaBaseAtual;
  } else {
    // Alternar (toggle)
    novaRacaBase = MAPA_SEXO[racaBaseAtual] || (isFem ? 'human_fighter' : 'human_fighter_female');
  }

  const novoSexo = (novaRacaBase.endsWith('_f') || novaRacaBase === 'human_fighter_female') ? 'F' : 'M';

  if(alvo.isBot){
    if(CTX.Fakes && CTX.Fakes.setupPorNivel){
      const setup = CTX.Fakes.setupPorNivel(novaRacaBase, alvo.arma, alvo.lv);
      alvo.raca = setup.raca;
      alvo.wb = setup.wb;
      alvo.en = setup.en;
      if(alvo.pers) alvo.pers.charType = setup.raca;
      CTX.difunde(c, { t: 'admin_sexo', id: alvo.id, raca: setup.raca, sexo: novoSexo });
      CTX.difunde(c, { t: 'ent_update', id: alvo.id, raca: setup.raca, wb: setup.wb, en: setup.en });
    } else {
      alvo.raca = novaRacaBase;
      if(alvo.pers) alvo.pers.charType = novaRacaBase;
      CTX.difunde(c, { t: 'admin_sexo', id: alvo.id, raca: novaRacaBase, sexo: novoSexo });
    }
  } else {
    // Jogador Real
    alvo.raca = novaRacaBase;
    if(alvo.pers){
      alvo.pers.charType = novaRacaBase;
      if(CTX.Contas) CTX.Contas.grava();
    }
    CTX.envia(alvo, { t: 'admin_sexo', id: alvo.id, raca: novaRacaBase, sexo: novoSexo, eu: true });
    CTX.difunde(c, { t: 'admin_sexo', id: alvo.id, raca: novaRacaBase, sexo: novoSexo });
    CTX.difunde(c, { t: 'ent_update', id: alvo.id, raca: novaRacaBase });
  }

  broadcastSis(c, `👑 [ADMIN] Sexo de ${alvo.nome} alterado para ${novoSexo === 'F' ? 'Feminino ♀️' : 'Masculino ♂️'} (${novaRacaBase})!`);
}

/* 6. Dar Kit de Equipamento por Grau (Lineage 2) */
function darKit(c, J, grauKey, targetId){
  if(!CTX || !J) return;
  const gNorm = String(grauKey || 'C').toUpperCase();
  const kitKey = (gNorm === 'NO-GRADE' || gNorm === 'SEM' || gNorm === 'NG') ? 'sem' : ((gNorm === 'S' || gNorm === 'A') ? 'A' : (KITS_GRAU[gNorm] ? gNorm : 'C'));
  const kit = KITS_GRAU[kitKey] || KITS_GRAU.C;
  const alvo = obterAlvo(c, J, targetId);

  // 1. Caso Bot
  if(alvo.isBot){
    if((alvo.lv || 1) < kit.minLv) alvo.lv = kit.minLv;
    alvo.grau = kit.grau;
    if(CTX.Fakes && CTX.Fakes.setupPorNivel){
      const setup = CTX.Fakes.setupPorNivel(alvo.raca, alvo.arma, alvo.lv);
      alvo.pmax = setup.hpBase;
      alvo.hp = setup.hpBase;
      alvo.en = kit.en;
      alvo.wb = setup.wb;
      alvo.grau = kit.grau;
      alvo.skills = setup.skills;
      if(alvo.pers){
        alvo.pers.level = alvo.lv;
        alvo.pers.charType = setup.raca;
      }
      CTX.difunde(c, { t: 'en', v: alvo.id, en: alvo.en });
      CTX.difunde(c, { t: 'wb', v: alvo.id, b: alvo.wb });
      CTX.difunde(c, { t: 'ent_update', id: alvo.id, lv: alvo.lv, hp: alvo.hp, pmax: alvo.pmax, en: alvo.en, wb: alvo.wb, raca: alvo.raca, grau: alvo.grau });
    }
    broadcastSis(c, `👑 [ADMIN] Kit ${kit.nome} concedido para o bot ${alvo.nome}! (+${kit.en})`);
    return;
  }

  // 2. Caso Jogador Real
  if(!alvo.pers) return;
  if((alvo.lv || (alvo.pers && alvo.pers.level) || 1) < kit.minLv){
    setLevel(c, J, kit.minLv, alvo.id);
  }

  if(CTX.Inv && CTX.Inv.garante) CTX.Inv.garante(alvo.pers);
  alvo.pers.inv = alvo.pers.inv || { items: [], equip: {}, adena: 0 };
  const inv = alvo.pers.inv;
  inv.items = inv.items || [];
  inv.equip = inv.equip || {};

  // Determina o tipo de arma da classe do alvo
  let tipoArma = 'sword';
  const armaAtual = alvo.arma || (alvo.pers && alvo.pers.classe) || '';
  if(armaAtual.includes('clerigo') || armaAtual.includes('healer') || armaAtual === 'book') tipoArma = 'book';
  else if(armaAtual.includes('guardiao') || armaAtual.includes('tank') || armaAtual === 'shield' || inv.equip.shield) tipoArma = 'shield';
  else if(armaAtual.includes('mago') || armaAtual.includes('magic') || armaAtual === 'staff') tipoArma = 'staff';

  const wpnBase = kit.armas[tipoArma] || kit.armas.sword;
  const shdBase = (tipoArma === 'shield') ? (kit.armas.escudo || 'shield_guardian') : null;

  // Cria ou equipa as peças do Set
  const pecasSlots = ['helmet', 'chest', 'legs', 'gloves', 'boots'];
  const genUid = () => 'k' + crypto.randomBytes(5).toString('hex');

  pecasSlots.forEach((slot) => {
    const baseId = kit.set[slot];
    if(baseId){
      let item = inv.items.find(i => i && i.base === baseId);
      if(!item){
        item = { uid: genUid(), base: baseId, rar: 'raro', en: 0, stats: {} };
        inv.items.push(item);
      }
      inv.equip[slot] = item.uid;
    } else if(slot === 'legs'){
      // Set inteiriço (Full-body): desocupa a calça
      delete inv.equip.legs;
    }
  });

  // Cria ou equipa a Arma com o encantamento do Grau
  let wpnItem = inv.items.find(i => i && i.base === wpnBase);
  if(!wpnItem){
    wpnItem = { uid: genUid(), base: wpnBase, rar: 'epico', en: kit.en, stats: {} };
    inv.items.push(wpnItem);
  } else {
    wpnItem.en = kit.en;
  }
  inv.equip.weapon = wpnItem.uid;
  alvo.en = kit.en;
  alvo.enV = kit.en;
  alvo.wb = wpnBase;

  // Cria ou equipa o Escudo se for Guardião
  if(shdBase){
    let shdItem = inv.items.find(i => i && i.base === shdBase);
    if(!shdItem){
      shdItem = { uid: genUid(), base: shdBase, rar: 'raro', en: 0, stats: {} };
      inv.items.push(shdItem);
    }
    inv.equip.shield = shdItem.uid;
  } else {
    delete inv.equip.shield;
  }

  // Recalcula HP máximo
  if(CTX.pmaxMax){
    alvo.pmax = CTX.pmaxMax(alvo.pers);
  } else {
    alvo.pmax = Math.round(400 + (alvo.lv || 40) * 28 * 1.3);
  }
  alvo.hp = alvo.pmax;

  if(CTX.Contas) CTX.Contas.grava();
  CTX.envia(alvo, { t: 'inv', inv: alvo.pers.inv });
  CTX.envia(alvo, { t: 'usou', hp: alvo.hp, cura: 1 });
  if(CTX.Prog) CTX.envia(alvo, Object.assign({ t: 'prog' }, CTX.Prog.info(alvo.pers)));

  CTX.difunde(c, { t: 'en', v: alvo.id, en: alvo.en });
  CTX.difunde(c, { t: 'wb', v: alvo.id, b: wpnBase });
  CTX.difunde(c, { t: 'ent_update', id: alvo.id, lv: alvo.lv, hp: alvo.hp, pmax: alvo.pmax, en: alvo.en, wb: wpnBase });

  broadcastSis(c, `👑 [ADMIN] Kit ${kit.nome} equipado com sucesso em ${alvo.nome}! (+${kit.en})`);
}

/* 7. God Mode (Invulnerabilidade) */
function toggleGod(c, J){
  if(!CTX || !J) return;
  J.godMode = !J.godMode;
  CTX.envia(J, { t: 'admin_info', godMode: J.godMode, speed: J.adminSpeed || 1 });
  sis(J, `🛡️ [ADMIN] Modo Invulnerável (God Mode): ${J.godMode ? '✅ ATIVADO (Você é imortal)' : '❌ DESATIVADO'}`);
}

/* 8. Matar Alvo Selecionado */
function kill(c, J, targetId){
  if(!CTX || !J) return;
  const alvo = obterAlvo(c, J, targetId);
  if(alvo === J){
    sis(J, '⚠️ Selecione um alvo para abater com o comando //kill.');
    return;
  }

  alvo.hp = 0;
  alvo.morto = true;
  alvo.tMorte = CTX.agora ? CTX.agora() : Date.now() / 1000;
  CTX.difunde(c, { t: 'die', v: alvo.id, a: J.id, nv: alvo.nome, na: J.nome });
  CTX.difunde(c, { t: 'ent_update', id: alvo.id, hp: 0 });
  sis(J, `💀 [ADMIN] ${alvo.nome} foi abatido instantaneamente.`);
}

/* 9. Dar Adena */
function darAdena(c, J, qtdNum, targetId){
  if(!CTX || !J) return;
  const alvo = obterAlvo(c, J, targetId);
  if(!alvo.pers) return;
  const qtd = parseInt(qtdNum, 10) || 100000;
  if(CTX.Inv && CTX.Inv.garante) CTX.Inv.garante(alvo.pers);
  alvo.pers.inv = alvo.pers.inv || { items: [], equip: {}, adena: 0 };
  alvo.pers.inv.adena = Math.max(0, (alvo.pers.inv.adena | 0) + qtd);
  if(CTX.Contas) CTX.Contas.grava();
  CTX.envia(alvo, { t: 'inv', inv: alvo.pers.inv });
  sis(J, `💰 [ADMIN] +${qtd.toLocaleString('pt-BR')} Adena entregue a ${alvo.nome}! Total: ${alvo.pers.inv.adena.toLocaleString('pt-BR')} Adena.`);
}

/* 10. Encantar Arma com Glow */
function encantarArma(c, J, nivelNum, targetId){
  if(!CTX || !J) return;
  const en = Math.max(0, Math.min(16, parseInt(nivelNum, 10) || 16));
  const alvo = obterAlvo(c, J, targetId);

  if(alvo.isBot){
    alvo.en = en;
    if(alvo.pers && alvo.pers.inv && alvo.pers.inv.items){
      const it = alvo.pers.inv.items[0];
      if(it) it.en = en;
    }
    CTX.difunde(c, { t: 'en', v: alvo.id, en });
    CTX.difunde(c, { t: 'ent_update', id: alvo.id, en });
    broadcastSis(c, `👑 [ADMIN] Arma do bot ${alvo.nome} foi encantada para +${en}! Glow visual ativado.`);
    return;
  }

  // Jogador real
  if(!alvo.pers) return;
  const inv = alvo.pers.inv;
  if(!inv || !inv.items) return;

  const wpnUid = inv.equip && inv.equip.weapon;
  const item = inv.items.find(i => i && (i.uid === wpnUid || (i.base && (i.base.startsWith('sword') || i.base.startsWith('staff') || i.base.startsWith('gladius') || i.base.startsWith('claymore') || i.base.startsWith('dragon') || i.base.startsWith('forgotten')))));

  if(item){
    item.en = en;
    alvo.en = en;
    alvo.enV = en;
    if(CTX.Contas) CTX.Contas.grava();
    CTX.envia(alvo, { t: 'inv', inv: alvo.pers.inv });
    CTX.difunde(c, { t: 'en', v: alvo.id, en });
    CTX.difunde(c, { t: 'ent_update', id: alvo.id, en });
    broadcastSis(c, `⚔️ [ADMIN] Arma de ${alvo.nome} encantada para +${en}! Glow visual atualizado para todos.`);
  } else {
    sis(J, `⚠️ Nenhuma arma encontrada para encantar em ${alvo.nome}.`);
  }
}

/* 11. Velocidade de Movimento GM */
function setSpeed(c, J, multNum){
  if(!CTX || !J) return;
  const mult = Math.max(1, Math.min(4, parseFloat(multNum) || 1));
  J.adminSpeed = mult;
  CTX.envia(J, { t: 'admin_speed', speed: mult });
  sis(J, `🏃 [ADMIN] Velocidade de movimento configurada para ${mult}x!`);
}

/* 12. Teleporte GM */
function teleport(c, J, destNome, xCustom, zCustom){
  if(!CTX || !J) return;
  let tx = 0, tz = 0, nomeDest = '';

  if(typeof xCustom === 'number' && typeof zCustom === 'number'){
    tx = xCustom; tz = zCustom;
    nomeDest = `(${tx}, ${tz})`;
  } else {
    const dKey = String(destNome || '').toLowerCase();
    const d = DESTINOS[dKey] || DESTINOS.cidade;
    tx = d.x; tz = d.z;
    nomeDest = d.nome;
  }

  J.x = tx;
  J.z = tz;
  CTX.difunde(c, { t: 'resp', id: J.id, x: J.x, z: J.z, hp: J.hp, pm: J.pmax, keep: 0 });
  CTX.envia(J, { t: 'admin_teleport', destino: destNome, x: tx, z: tz });
  sis(J, `🌀 [ADMIN] Teleportado para ${nomeDest}!`);
}

/* Interpreta e executa comandos de chat */
function comando(c, J, txt){
  if(!CTX || !J) return;
  let limpo = txt.trim();
  if(limpo.startsWith('//')) limpo = limpo.slice(2);
  else if(limpo.startsWith('/')) limpo = limpo.slice(1);

  const partes = limpo.split(/\s+/);
  const cmd = partes[0].toLowerCase();
  const arg1 = partes[1];
  const arg2 = partes[2];
  const arg3 = partes[3];

  switch(cmd){
    case 'setlevel':
    case 'lvl':
    case 'nivel':
      setLevel(c, J, arg1, arg2);
      break;

    case 'ress':
    case 'res':
      ress(c, J, arg1);
      break;

    case 'heal':
    case 'curar':
      heal(c, J, arg1);
      break;

    case 'setnick':
    case 'nick':
      setNick(c, J, arg1, arg2);
      break;

    case 'setsex':
    case 'sexo':
      setSexo(c, J, arg2, arg1);
      break;

    case 'setkit':
    case 'kit':
      darKit(c, J, arg1, arg2);
      break;

    case 'god':
    case 'invul':
      toggleGod(c, J);
      break;

    case 'kill':
    case 'matar':
      kill(c, J, arg1);
      break;

    case 'adena':
      darAdena(c, J, arg1, arg2);
      break;

    case 'enchant':
    case 'encantar':
      encantarArma(c, J, arg1, arg2);
      break;

    case 'speed':
    case 'velo':
      setSpeed(c, J, arg1);
      break;

    case 'teleport':
    case 'goto':
    case 'tp':
      teleport(c, J, arg1, parseFloat(arg1), parseFloat(arg2));
      break;

    case 'admin':
    case 'painel':
    case 'gm':
      CTX.envia(J, {
        t: 'admin_abrir',
        godMode: !!J.godMode,
        speed: J.adminSpeed || 1,
        lv: J.lv || (J.pers && J.pers.level) || 1,
        destinos: DESTINOS
      });
      sis(J, '👑 Painel de Administração aberto! Você também pode usar a tecla F10.');
      break;

    default:
      sis(J, 'Comandos Admin: //setlevel [1-85] | //ress | //heal | //setkit [NG/D/C/B/A/S] | //setnick [nome] | //setsex [M/F] | //god | //kill | //adena [qtd] | //enchant [4-16] | //speed [1-4] | //teleport [cidade|arena|curuma|fortress|pantano|baium] | //admin');
      break;
  }
}

/* Executa ações vindas do Painel Visual de Admin (m.t === 'admin_cmd') */
function executa(c, J, m){
  if(!CTX || !J) return;
  const acao = String(m.acao || '').toLowerCase();

  switch(acao){
    case 'setlevel':
      setLevel(c, J, m.lv, m.alvo);
      break;

    case 'ress':
      ress(c, J, m.alvo);
      break;

    case 'heal':
      heal(c, J, m.alvo);
      break;

    case 'setnick':
      setNick(c, J, m.nome || m.nick, m.alvo);
      break;

    case 'setsexo':
      setSexo(c, J, m.alvo, m.sexo);
      break;

    case 'setkit':
      darKit(c, J, m.grau, m.alvo);
      break;

    case 'god':
      toggleGod(c, J);
      break;

    case 'kill':
      kill(c, J, m.alvo);
      break;

    case 'adena':
      darAdena(c, J, m.qtd, m.alvo);
      break;

    case 'enchant':
      encantarArma(c, J, m.en, m.alvo);
      break;

    case 'speed':
      setSpeed(c, J, m.speed);
      break;

    case 'teleport':
      teleport(c, J, m.destino, m.x, m.z);
      break;

    case 'portao_set':
    case 'portao_lista': {                                /* [portoes-dion] F10 > Mobs > Portoes do castelo e da fortaleza */
      const p = lerPort();
      if(acao === 'portao_lista'){ const o = portoesDion(), n = k => TODOS_PORT.filter(id => o[id] === k).length; sis(J, 'Portoes de Dion: ' + n('fechado') + ' fechados, ' + n('aberto') + ' abertos, ' + n('destruido') + ' destruidos | castelo ' + GRUPOS_PORT.castelo.map(id => id + ':' + o[id]).join(' ') + ' | forte ' + GRUPOS_PORT.forte.map(id => id + ':' + o[id]).join(' ') + ' | arquivo ' + ARQ_PORT); break; }
      const est = String(m.estado || ''); if(ESTADOS_PORT.indexOf(est) < 0){ sis(J, 'Portoes: estado invalido (' + est + ').'); break; }
      let ids = Array.isArray(m.ids) ? m.ids.map(Number) : (GRUPOS_PORT[String(m.grupo)] || (m.grupo === 'todos' ? TODOS_PORT : []));
      ids = ids.filter(id => TODOS_PORT.indexOf(id) >= 0); if(!ids.length){ sis(J, 'Portoes: nenhum portao escolhido.'); break; }
      for(const id of ids){ if(est === 'fechado') delete p[id]; else p[id] = est; }
      const er = salvaPort(); difundeCidade({ t: 'dion_portao', ids, estado: est });
      sis(J, 'Portoes: ' + ids.length + ' -> ' + est + (er ? ' - ATENCAO: NAO salvou (' + er + ' em ' + ARQ_PORT + ')' : ' (salvo)'));
      break;
    }

    case 'obj_spawn':
    case 'obj_remover':
    case 'obj_lista': {
      if(!(J.x > 800 && J.x < 2250)){ sis(J, 'Objetos: so da para colocar dentro de Dion (voce esta fora).'); break; }
      const a = lerObj();
      if(acao === 'obj_spawn'){
        const tipo = String(m.tipo || ''); if(TIPOS_OBJ.indexOf(tipo) < 0){ sis(J, 'Objetos: tipo desconhecido (' + tipo + ').'); break; }
        const uid = a.reduce((q, o) => Math.max(q, o.uid | 0), 0) + 1, rot = typeof m.rot === 'number' ? m.rot : (typeof J.f === 'number' ? J.f : 0);
        const px = (typeof m.x === 'number' && typeof m.z === 'number' && Math.hypot(m.x - J.x, m.z - J.z) < 12) ? m.x : J.x, pz = (px === m.x) ? m.z : J.z, py = (px === m.x && typeof m.y === 'number') ? m.y : (typeof J.y === 'number' ? J.y : -45);      /* o GM pode pedir um ponto ate 12 m dele (a frente) */
        const o = { uid, tipo, x: CTX.r2(px), z: CTX.r2(pz), y: CTX.r2(py), rot: CTX.r2(rot) }; a.push(o);
        const er = salvaObj(a); difundeCidade({ t: 'dion_obj_add', o });
        sis(J, 'Objetos: ' + tipo + ' #' + uid + ' em (' + o.x + ', ' + o.z + ')' + (er ? ' - ATENCAO: NAO salvou (' + er + ' em ' + ARQ_OBJ + ')' : ' - salvo (' + a.length + ' no arquivo)'));
      } else if(acao === 'obj_remover'){
        const raio = Math.max(1, Math.min(400, +m.raio || 6)), fica = [], vai = [];
        for(const o of a) (Math.hypot(o.x - J.x, o.z - J.z) <= raio ? vai : fica).push(o);
        if(vai.length){ const er = salvaObj(fica); difundeCidade({ t: 'dion_obj_del', uids: vai.map(o => o.uid) }); if(er) sis(J, 'Objetos: nao salvou (' + er + ')'); }
        sis(J, 'Objetos: ' + vai.length + ' removido(s) num raio de ' + raio + ' m.');
      } else sis(J, 'Objetos de Dion: ' + a.length + ' | ' + a.slice(0, 10).map(o => '#' + o.uid + ' ' + o.tipo.replace('npc_', '') + ' (' + o.x + ',' + o.z + ')').join(' | ') + ' | arquivo ' + ARQ_OBJ);
      break;
    }

    case 'mob_spawn':
    case 'mob_remover':
    case 'mob_lista': {                                   /* [gm] F10 > Mobs: povoar Dion na posicao do GM */
      const W = c && c.mundo && c.mundo.sub ? c.mundo.sub('dion') : null;
      if(!W){ sis(J, 'Mobs: o canal desta area nao tem o mundo de Dion.'); break; }
      if(!(J.x > 800 && J.x < 2250)){ sis(J, 'Mobs: so da para povoar dentro de Dion (voce esta fora).'); break; }
      if(acao === 'mob_spawn'){
        const r = W.adminNasce(String(m.tipo || ''), J.x, J.z, typeof J.y === 'number' ? J.y : -22, m.qtd, m.raio, m.agr, !!m.fixo);
        sis(J, r.erro ? ('Mobs: ' + r.erro) : ('Mobs: ' + r.n + 'x ' + r.nome + (r.chefe ? ' (boss)' : '') + ' em (' + J.x.toFixed(0) + ', ' + J.z.toFixed(0) + ')' + (r.fixo ? (r.salvo && r.salvo.ok ? ' - spot FIXO salvo (' + r.salvo.n + ' no arquivo)' : ' - ATENCAO: NAO salvou o spot (' + ((r.salvo && r.salvo.erro) || '?') + ' em ' + ((r.salvo && r.salvo.arq) || '?') + ')') : ' - temporario: some ao reiniciar o servidor')));
      } else if(acao === 'mob_remover'){
        const n = W.adminRemove(J.x, J.z, Math.max(2, Math.min(400, +m.raio || 12)));
        sis(J, 'Mobs: ' + n + ' spot(s) removido(s) num raio de ' + (+m.raio || 12) + ' m.');
      } else {
        const L = W.adminLista(), A = W.adminArq(); sis(J, 'Mobs de Dion: ' + L.length + ' spot(s) ativos | arquivo ' + A.arq + (A.existe ? ' (' + A.salvos + ' salvos)' : ' (NAO existe)') + (L.length ? ' | ' + L.slice(0, 8).map(q => q.n + 'x ' + q.tipo + (q.chefe ? '*' : '') + ' (' + q.x + ',' + q.z + ')').join(' | ') : ''));
      }
      break;
    }

    case 'info':
      CTX.envia(J, {
        t: 'admin_info',
        godMode: !!J.godMode,
        speed: J.adminSpeed || 1,
        lv: J.lv || (J.pers && J.pers.level) || 1,
        destinos: DESTINOS
      });
      break;
  }
}

module.exports = {
  init,
  ehComando,
  comando,
  executa,
  objetosDion,
  portoesDion,
  setLevel,
  ress,
  heal,
  setNick,
  setSexo,
  darKit,
  toggleGod,
  kill,
  darAdena,
  encantarArma,
  setSpeed,
  teleport,
  DESTINOS,
  KITS_GRAU
};
