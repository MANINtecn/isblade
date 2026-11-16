'use strict';
/* ==========================================================================
   ADMIN / GM POWERS - IS BLADE (16/11/2026)
   Sistema completo de administração e controle de jogo (GM):
   - Definir Nível (//setlevel [1-85], //lvl [1-85])
   - Ressurreição Instantânea (//ress, //res)
   - Cura Total (//heal)
   - God Mode / Invulnerabilidade (//god, //invul)
   - Abater Alvo (//kill)
   - Adena e Economia (//adena [qtd])
   - Encantamento de Arma com Glow (//enchant [+4/+7/+10/+16])
   - Velocidade de Movimento GM (//speed [1-4])
   - Teleporte Rápido (//teleport [lugar], //goto [lugar])
   - Painel Visual de Admin (//admin, //painel, tecla F10)
   ========================================================================== */

let CTX = null;

const DESTINOS = {
  cidade: { nome: 'Talking Island (Cidade)', x: 0, z: 6 },
  arena: { nome: 'Arena PvP (Coliseu)', x: -28.4, z: -53.85 },
  curuma: { nome: 'Torre de Cruma', x: -53.7, z: -42.7 },
  fortress: { nome: 'Fortaleza', x: -51.0, z: 51.5 },
  pantano: { nome: 'Pântano Flamejante', x: 51.1, z: 43.4 },
  baium: { nome: 'Salão de Baium', x: -28.4, z: -53.85 }
};

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
  return /^\/(setlevel|lvl|nivel|ress|res|heal|curar|god|invul|kill|matar|adena|enchant|encantar|speed|velo|teleport|goto|admin|painel|gm)\b/.test(t);
}

/* Localiza um alvo no canal (por id, nome ou alvo do jogador) */
function obterAlvo(c, J, idOuNome){
  if(!c || !c.jog) return J;
  if(!idOuNome){
    // Se o jogador estiver com alvo selecionado
    if(J.alvoId && c.jog.has(J.alvoId)) return c.jog.get(J.alvoId);
    return J;
  }
  const idNum = parseInt(idOuNome, 10);
  if(!isNaN(idNum) && c.jog.has(idNum)) return c.jog.get(idNum);

  const nomeBuscado = String(idOuNome).toLowerCase();
  for(const jog of c.jog.values()){
    if(jog.nome && jog.nome.toLowerCase() === nomeBuscado) return jog;
  }
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
  CTX.envia(alvo, { t: 'usou', hp: alvo.hp, cura: 1 });
  sis(J, `💖 [ADMIN] ${alvo.nome} recebeu cura total (HP: ${alvo.hp}/${alvo.pmax})!`);
}

/* 4. God Mode (Invulnerabilidade) */
function toggleGod(c, J){
  if(!CTX || !J) return;
  J.godMode = !J.godMode;
  CTX.envia(J, { t: 'admin_info', godMode: J.godMode, speed: J.adminSpeed || 1 });
  sis(J, `🛡️ [ADMIN] Modo Invulnerável (God Mode): ${J.godMode ? '✅ ATIVADO (Você é imortal)' : '❌ DESATIVADO'}`);
}

/* 5. Matar Alvo Selecionado */
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
  sis(J, `💀 [ADMIN] ${alvo.nome} foi abatido instantaneamente.`);
}

/* 6. Dar Adena */
function darAdena(c, J, qtdNum){
  if(!CTX || !J || !J.pers) return;
  const qtd = parseInt(qtdNum, 10) || 100000;
  if(CTX.Inv && CTX.Inv.garante) CTX.Inv.garante(J.pers);
  J.pers.inv = J.pers.inv || { items: [], equip: {}, adena: 0 };
  J.pers.inv.adena = Math.max(0, (J.pers.inv.adena | 0) + qtd);
  if(CTX.Contas) CTX.Contas.grava();
  CTX.envia(J, { t: 'inv', inv: J.pers.inv });
  sis(J, `💰 [ADMIN] +${qtd.toLocaleString('pt-BR')} Adena adicionada! Total: ${J.pers.inv.adena.toLocaleString('pt-BR')} Adena.`);
}

/* 7. Encantar Arma com Glow */
function encantarArma(c, J, nivelNum){
  if(!CTX || !J || !J.pers) return;
  const en = Math.max(0, Math.min(16, parseInt(nivelNum, 10) || 16));
  const inv = J.pers.inv;
  if(!inv || !inv.items) return;

  const wpnUid = inv.equip && inv.equip.weapon;
  const item = inv.items.find(i => i && (i.uid === wpnUid || (i.base && (i.base.startsWith('sword') || i.base.startsWith('staff') || i.base.startsWith('gladius')))));

  if(item){
    item.en = en;
    J.en = en;
    J.enV = en;
    if(CTX.Contas) CTX.Contas.grava();
    CTX.envia(J, { t: 'inv', inv: J.pers.inv });
    CTX.difunde(c, { t: 'en', v: J.id, en });
    sis(J, `⚔️ [ADMIN] Arma encantada para +${en}! Glow visual atualizado para todos.`);
  } else {
    sis(J, '⚠️ Nenhuma arma encontrada para encantar.');
  }
}

/* 8. Velocidade de Movimento GM */
function setSpeed(c, J, multNum){
  if(!CTX || !J) return;
  const mult = Math.max(1, Math.min(4, parseFloat(multNum) || 1));
  J.adminSpeed = mult;
  CTX.envia(J, { t: 'admin_speed', speed: mult });
  sis(J, `🏃 [ADMIN] Velocidade de movimento configurada para ${mult}x!`);
}

/* 9. Teleporte GM */
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

    case 'god':
    case 'invul':
      toggleGod(c, J);
      break;

    case 'kill':
    case 'matar':
      kill(c, J, arg1);
      break;

    case 'adena':
      darAdena(c, J, arg1);
      break;

    case 'enchant':
    case 'encantar':
      encantarArma(c, J, arg1);
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
      sis(J, 'Comandos Admin: //setlevel [1-85] | //ress | //heal | //god | //kill | //adena [qtd] | //enchant [4-16] | //speed [1-4] | //teleport [cidade|arena|curuma|fortress|pantano|baium] | //admin');
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

    case 'god':
      toggleGod(c, J);
      break;

    case 'kill':
      kill(c, J, m.alvo);
      break;

    case 'adena':
      darAdena(c, J, m.qtd);
      break;

    case 'enchant':
      encantarArma(c, J, m.en);
      break;

    case 'speed':
      setSpeed(c, J, m.speed);
      break;

    case 'teleport':
      teleport(c, J, m.destino, m.x, m.z);
      break;

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
  setLevel,
  ress,
  heal,
  toggleGod,
  kill,
  darAdena,
  encantarArma,
  setSpeed,
  teleport,
  DESTINOS
};
