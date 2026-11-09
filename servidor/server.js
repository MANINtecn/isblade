/* Servidor do jogo (prototipo de PvP): serve os arquivos de prototipo/ e a conexao em tempo real (WebSocket em /ws) no MESMO endereco.
   - MAPAS: 'cidade' (zona segura: so se bate em DUELO combinado) e 'pvp' (mapa de guerra: dois TIMES, sem fogo amigo). Cada mapa tem varios CANAIS (copias, ate CAP jogadores cada).
   - O servidor DECIDE o dano (o ataque chega como intencao; alcance, cone, recarga, guarda e esquiva sao checados aqui) e guarda a vida de cada jogador.
   - A posicao ainda e do cliente (o servidor so limita a velocidade). Anti-trapaca de verdade e a proxima etapa.
   Uso:  node servidor/server.js   (PORT=8000, CAP=50, PVP_MULT=.5, AOI=90)   ->  http://localhost:8000/selecao.html */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let WebSocketServer;
try { WebSocketServer = require('ws').WebSocketServer; } catch (e) { WebSocketServer = require(path.join(__dirname, '..', 'prototipo', 'node_modules', 'ws')).WebSocketServer; }

const PORT = +process.env.PORT || 8000, CAP = +process.env.CAP || 50, PVP_MULT = +process.env.PVP_MULT || .5, AOI = +process.env.AOI || 90;
/* Em VPS: o jogo (arquivos) fica na Vercel e este processo cuida so da conexao em tempo real. STATIC=0 desliga a entrega de arquivos; ORIGINS limita quais sites podem conectar
   (ex.: ORIGINS=https://jogar.l2ikarus.com,https://*.vercel.app). Sem ORIGINS qualquer site conecta (bom para teste local). */
const SERVE_STATIC = process.env.STATIC !== '0', ORIGINS = (process.env.ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
const casa = (p, o) => { if(!p.includes('*')) return p === o; const [a, b] = p.split('*'); return !!o && o.startsWith(a) && o.endsWith(b) && o.length > a.length + b.length && !o.slice(a.length, o.length - b.length).includes('.'); };   /* um '*' vale um trecho sem ponto (um nivel de subdominio) */
const origemOk = o => !ORIGINS.length || ORIGINS.some(p => casa(p, o));
const Contas = require('./contas')({ dir: process.env.DATA_DIR || path.join(__dirname, 'dados'), origemOk });      /* cadastro rapido + salvamento na nuvem (contas.js) */
const AUTH = process.env.AUTH !== '0';                              /* MMO: so entra no mundo quem tem conta e personagem dela (AUTH=0 so para teste local sem conta) */
const RAIZ = path.join(__dirname, '..', 'prototipo'), TICK = 1000 / 12, RESP_S = 4;
const VMAX = 14;                                                   /* m/s: corrida ~4,3, esquiva 4,6 m em 0,4 s = 11,5; folga de latencia */
const MAPAS = { cidade: { spawn: { x: 0, z: 6, r: 4 } }, pvp: { spawn: { x: 0, z: 0, r: 3 } }, masmorra: { spawn: { x: 0, z: 6, r: 4 } }, curuma: { aberto: 1 }, fortress: { aberto: 1 }, pantano: { aberto: 1 } };
/* [mapas-multi] 08/11/2026 (dono: todos os mapas multijogador): Cruma, Fortaleza e Pantano tem canais como a cidade (50 por canal); o jogador entra onde o
   jogo o coloca (posicao inicial vem do cliente) e manda a altura (y) para os outros o desenharem no relevo. Ninguem fere ninguem la (PvP com flag vem depois);
   mobs continuam de cada jogador ate a Fase 6. */     /* masmorra = instancia SOLO (dungeon, duelo com o Baium): um canal por jogador */
const ARENA_PVP = { x: -28.4, z: -53.85, r: +process.env.PVP_R || 34 };               /* PvP livre: todos nascem em pontos aleatorios dentro deste raio (parte andavel do circulo do Baium) */
const SPAWN_TIME = null;    /* mapa de PvP = circulo gigante do Baium (3o andar da Torre, centro -28,4/-53,85, raio 62): cada time nasce num lado, 72 m de distancia */
const CAP_PVP = +process.env.CAP_PVP || 500;                        /* arena livre: entra quem quiser (limite so de seguranca) */
const PARTY_MAX = 6, PARTY_GRACA = 90;                              /* grupo: ate 6; quem cai ou troca de pagina tem 90 s para voltar */
const DUELO_CONTAGEM = 3, DUELO_FUGA = 45, DUELO_PEDIDO_S = 15;

/* ---- dados de combate (os mesmos do jogo) ---- */
const SKILLS = {};                                                 /* arma -> [{cd, dmg (por golpe), range, half}] */
try { fs.readdirSync(path.join(RAIZ, 'data', 'armas')).filter(f => f.endsWith('.json')).forEach(f => { const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'armas', f), 'utf8')); if(j.id && j.skills) SKILLS[j.id] = j.skills.map(s => ({ nome: s.name, cd: s.cd, dmg: s.dmg, range: s.range, half: s.half, proj: s.proj || null })); }); } catch (e) { console.warn('sem data/armas:', e.message); }
const BASICO = {};                                              /* arma -> ataque padrao em ponto mirado (data/armas/<arma>.json -> basico), ex.: cajado/mago */
try { fs.readdirSync(path.join(RAIZ, 'data', 'armas')).filter(f => f.endsWith('.json')).forEach(f => { const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'armas', f), 'utf8')); if(j.id && j.basico && j.basico.niveis) BASICO[j.id] = j.basico; }); } catch(e){ console.log('basico:', e.message); }
const BASIC = { sweep: { dmg: 18, range: 3.6, half: 1.6 }, thrust: { dmg: 27, range: 4.2, half: .5 }, spin: { dmg: 33, range: 3.6, half: Math.PI }, up: { dmg: 21, range: 3.4, half: 1 }, down: { dmg: 24, range: 3.4, half: 1 }, wedge: { dmg: 30, range: 3.6, half: 1 } };

/* ---- progresso (nivel/xp/pontos): quem decide e o SERVIDOR; o jogo so avisa "matei X" e recebe o resultado (servidor/progressao.js + prototipo/data/progressao.json) ---- */
const Prog = require('./progressao');
const Inv = require('./inventario');
const Mobs = require('./mobs_mundo');                       /* [mobs-servidor] mobs dos mapas abertos no servidor (todos veem os mesmos) */                         /* inventario e adena com autoridade do servidor */
function ganhaXp(J, v){
  if(!J.pers || !(v > 0)) return; const subiu = Prog.ganha(J.pers, v);
  J.lv = J.pers.level; Contas.grava(); envia(J, Object.assign({ t: 'prog', subiu: subiu ? 1 : 0, ganhou: v }, Prog.info(J.pers)));
}
function premia(J, tipo, dif, xp){                                   /* adena (e itens do chefe) no abate: o servidor sorteia, guarda e avisa */
  if(tipo === 'boss' || /^chefe_/.test(tipo)) J.pers.chefes = (J.pers.chefes | 0) + 1;      /* [ranking] chefes derrotados (Baium, chefes de DG e de campo) */
  const r = Inv.abate(J.pers, tipo, dif, xp); if(!r) return; Contas.grava();
  envia(J, { t: 'drop', adena: r.adena, itens: r.itens, cheia: r.cheia ? 1 : 0 }); envia(J, { t: 'inv', inv: J.pers.inv });
}
function avisaEnc(c, J){ const e = Inv.encArma(J.pers); if(e !== (J.enV | 0)){ J.enV = e; difunde(c, { t: 'en', v: J.id, en: e }, J); } }       /* brilho da arma: os outros veem */
function enviaProg(J){ if(J.pers) envia(J, Object.assign({ t: 'prog' }, Prog.info(J.pers))); }
const pmaxMax = p => Prog.pmaxMax(p || { level: 1 });                 /* vida maxima aceita: base + equipamento + nivel + vitalidade (o cliente nao pode declarar mais que isso) */

/* ---- estado ---- */
let proxId = 1; const canais = { cidade: [], pvp: [], masmorra: [], curuma: [], fortress: [], pantano: [] };           /* canal: { mapa, n, jog: Map(id -> J) } */
function canalLivre(mapa, pedido){
  const L = canais[mapa];
  const cap = mapa === 'pvp' ? CAP_PVP : (mapa === 'masmorra' ? 1 : CAP);
  if(mapa !== 'masmorra' && pedido > 0 && pedido <= 10) while(L.length < pedido) L.push({ mapa, n: L.length + 1, jog: new Map() });      /* canal escolhido pelo jogador (ate 10): cria se ainda nao existe */
  if(pedido && L[pedido - 1] && L[pedido - 1].jog.size < cap) return L[pedido - 1];
  for(const c of L) if(c.jog.size < cap) return c;
  const c = { mapa, n: L.length + 1, jog: new Map() }; L.push(c); return c;
}
/* masmorra: solo = 1 jogador por canal; em GRUPO = um canal para o grupo inteiro (mesmo mundo, mesmos monstros) */
function canalMasmorra(gid){
  const L = canais.masmorra;
  if(gid){ for(const c of L) if(c.gid === gid && c.jog.size < PARTY_MAX) return c; }
  for(const c of L) if(c.jog.size === 0){ c.gid = gid || 0; c.dg = null; return c; }
  const c = { mapa: 'masmorra', n: L.length + 1, jog: new Map(), gid: gid || 0 }; L.push(c); return c;
}
const todosCanais = () => [].concat(canais.cidade, canais.pvp, canais.masmorra, canais.curuma, canais.fortress, canais.pantano);
const r2 = v => Math.round(v * 100) / 100, agora = () => Date.now() / 1000;
const angDif = (a, b) => { let d = a - b; while(d > Math.PI) d -= 2 * Math.PI; while(d < -Math.PI) d += 2 * Math.PI; return d; };
function posSpawn(c, J){
  if(c.mapa === 'pvp'){ const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * ARENA_PVP.r; return { x: ARENA_PVP.x + Math.sin(a) * r, z: ARENA_PVP.z + Math.cos(a) * r }; }
  const s = MAPAS.cidade.spawn, a = Math.random() * 6.283, r = Math.random() * s.r; return { x: s.x + Math.sin(a) * r, z: s.z + Math.cos(a) * r };
}
/* [anuncio] aviso do servidor (manutencao, eventos): o dono edita <DATA_DIR>/anuncio.txt na VPS (uma linha; vazio = sem aviso).
   Ao mudar, todos os conectados recebem na hora; quem entra depois recebe ao conectar. Confere o arquivo a cada 10 s. */
const ANUNCIO_ARQ = path.join(process.env.DATA_DIR || path.join(__dirname, 'dados'), 'anuncio.txt');
let ANUNCIO = '';
function leAnuncio(){ let s = ''; try { s = fs.readFileSync(ANUNCIO_ARQ, 'utf8').replace(/\s+/g, ' ').trim().slice(0, 240); } catch(e){} return s; }
ANUNCIO = leAnuncio();
setInterval(() => { const s = leAnuncio(); if(s === ANUNCIO) return; ANUNCIO = s; if(!s) return; const o = JSON.stringify({ t: 'anuncio', txt: s, novo: 1 }); for(const c of todosCanais()) for(const J of c.jog.values()) if(J.ws.readyState === 1) J.ws.send(o); }, 10e3);
function envia(J, o){ if(J.ws.readyState === 1) J.ws.send(JSON.stringify(o)); }
function difunde(c, o, exceto){ const s = JSON.stringify(o); for(const J of c.jog.values()) if(J !== exceto && J.ws.readyState === 1) J.ws.send(s); }
const info = J => ({ id: J.id, sid: J.sid, lv: J.lv || 1, nome: J.nome, raca: J.raca, cls: J.cls, arma: J.arma, en: Inv.encArma(J.pers), x: r2(J.x), z: r2(J.z), f: r2(J.f), hp: J.hp, pmax: J.pmax, team: J.team || '' });

/* ---- grupo (party): ligado a SESSAO do jogador (sid, guardado no navegador), nao a conexao: sobrevive a troca de pagina (cidade <-> arena) ---- */
const grupos = new Map(); let proxGrupo = 1;                       /* gid -> { id, lider (sid), membros: Map(sid -> { nome, J, ausente }) } */
const grupoDe = J => (J.party ? grupos.get(J.party) : null);
let dgSeq = 0;
function estadoGrupo(g){ return { t: 'party', id: g.id, lider: g.lider, dg: g.dg || null, m: [...g.membros].map(([sid, m]) => ({ sid, nome: m.nome, id: m.J ? m.J.id : 0, hp: m.J ? m.J.hp : 0, pmax: m.J ? m.J.pmax : 0, on: !!m.J, mapa: m.J ? m.J.mapa : '', canal: m.J ? m.J.canal : 0 })) }; }
function juntaNaMasmorra(g){ for(const m of g.membros.values()) if(m.J && m.J.canalRef && m.J.mapa === 'masmorra' && m.J.canalRef.gid !== g.id) envia(m.J, { t: 'recanal' }); }
function envieGrupo(g){ const o = estadoGrupo(g); for(const m of g.membros.values()) if(m.J) envia(m.J, o); }
function tiraDoGrupo(sid, J, motivo){
  const g = J && J.party ? grupos.get(J.party) : [...grupos.values()].find(x => x.membros.has(sid)); if(!g) return; if(J) J.party = 0;
  g.membros.delete(sid); if(J) envia(J, { t: 'partyfim', m: motivo || 'saiu' });
  if(g.membros.size <= 1){ for(const m of g.membros.values()) if(m.J){ m.J.party = 0; envia(m.J, { t: 'partyfim', m: 'dissolvido' }); } grupos.delete(g.id); return; }
  if(g.lider === sid) g.lider = g.membros.keys().next().value; envieGrupo(g);
}
function colega(mapa, sid){                                         /* algum membro do grupo desta sessao ja esta no mapa? (para cair no mesmo canal e no mesmo time) */
  const g = [...grupos.values()].find(x => x.membros.has(sid)); if(!g) return null;
  for(const [s2, m] of g.membros) if(s2 !== sid && m.J && m.J.mapa === mapa) return m.J; return null;
}

/* ---- quem pode ferir quem ---- */
/* [pk] 08/11/2026 PvP estilo L2 nos mapas abertos (regras do dono): atacar inocente so FORCANDO (Ctrl no PC / botao PK no celular) e deixa o atacante
   com flag (nome roxo) por FLAG_S; atacar quem tem flag ou karma nao precisa forcar. Matar quem tem flag ou karma = vitoria PvP, sem karma. Matar inocente
   (sem flag: nao reagiu) = PK: karma (nome vermelho). Quem tem karma e morre pode perder 1 item; karma cai matando monstros. Mesmo grupo nao se fere. */
const FLAG_S = 30, KARMA_PK = 720, KARMA_DROP = .25;
const temKarma = J => ((J.pers && J.pers.karma) | 0) > 0, temFlag = (J, t) => (J.flagAte || 0) > t;
const estadoPk = (J, t) => temKarma(J) ? 2 : (temFlag(J, t) ? 1 : 0);
function podeFerir(c, A, V, t){
  if(c.mapa === 'pvp') return !(A.party && A.party === V.party);          /* PvP livre: todos contra todos; so o mesmo grupo nao se fere */
  if(MAPAS[c.mapa].aberto){ if(A.party && A.party === V.party) return false; return temKarma(V) || temFlag(V, t) || !!A.pk; }      /* [pk] */
  const d = A.duelo; return !!(d && d.com === V.id && V.duelo && V.duelo.com === A.id && t >= d.inicio && !d.fim);   /* cidade: so no duelo ja comecado */
}
function fimPk(c, A, V, inocente){
  if(inocente && A.pers){ A.pers.karma = (A.pers.karma | 0) + KARMA_PK; A.pers.pk = (A.pers.pk | 0) + 1; envia(A, { t: 'pkmsg', m: 'Você matou um jogador que não reagiu: agora é PK (karma ' + A.pers.karma + '). Mate monstros para limpar o karma.' }); }
  else if(A.pers) A.pers.pvp = (A.pers.pvp | 0) + 1;
  if(temKarma(V) && V.pers && Math.random() < KARMA_DROP){                /* PK morreu: pode perder 1 item da mochila (nao o equipado) */
    const inv = Inv.garante(V.pers), eq = new Set(Object.values(inv.equip)), sol = inv.items.filter(i => !eq.has(i.uid));
    if(sol.length){ const it = sol[Math.floor(Math.random() * sol.length)]; inv.items = inv.items.filter(i => i !== it); envia(V, { t: 'inv', inv: inv, aviso: 'Você era PK e perdeu ' + Inv.nome(it.base) + '.' }); }
  }
  Contas.grava();
}
/* [mobs-servidor] mundo de mobs do canal (mapas abertos) */
function mundoDe(c){
  if(!MAPAS[c.mapa].aberto) return null;
  if(!c.mundo){
    const W = c.mundo = new Mobs.Mundo(c.mapa);
    W.fere = (Q, ev) => { if(c.jog.get(Q.id) === Q && !Q.morto) envia(Q, ev); };
    W.tiro = (m, Q, s) => difunde(c, { t: 'mtiro', id: m.id, a: Q.id, s: Math.round(s * 100) / 100 });
    W.aviso = txt => difunde(c, { t: 'pkmsg', m: txt });
  }
  return c.mundo;
}
function karmaMob(o, v){ if(o.pers && o.pers.karma > 0){ o.pers.karma = Math.max(0, o.pers.karma - Math.ceil(v / 3)); if(!o.pers.karma) envia(o, { t: 'pkmsg', m: 'Seu karma foi limpo: nome normal de novo.' }); } }
/* abate de mob do servidor: XP para a party de quem mais bateu (membros a ate 40 m, total com bonus do L2 dividido por igual), drop para quem mais bateu */
function abateMundo(c, W, m){
  const K = c.jog.get(W.dono(m)); if(!K || !K.pers) return;
  const quem = [...c.jog.values()].filter(P => P.pers && !P.morto && (P === K || (K.party && P.party === K.party)) && Math.hypot(P.x - m.x, P.z - m.z) <= 40);
  const n = Math.max(1, quem.length), f = n > 1 ? (Mobs.BONUS_PT[Math.min(n, Mobs.BONUS_PT.length - 1)] / n) : 1, dif = Mobs.dif(c.mapa);
  for(const P of quem){ const v = Math.max(1, Math.round(Prog.xpAbate(dif, m.tipo, P.pers.level) * f)); ganhaXp(P, v); karmaMob(P, v); }
  premia(K, m.tipo, dif, Prog.xpAbate(dif, m.tipo, K.pers.level));
}
function fimDuelo(c, perdedor, vencedor, motivo){
  const t = agora(); [perdedor, vencedor].forEach(J => { if(J && J.duelo) { J.duelo.fim = t; J.duelo.reset = t + 3; } });
  difunde(c, { t: 'duelend', v: vencedor ? vencedor.id : 0, l: perdedor.id, nv: vencedor && vencedor.nome, nl: perdedor.nome, m: motivo || 'ko' });
}

/* ---- dano de um golpe/projetil numa vitima (guarda de frente reduz; duelo nao mata) ---- */
function fere(c, A, V, base, t, pid){
  let dano = Math.max(1, Math.round(base * (.92 + Math.random() * .16) * PVP_MULT)), bloqueio = false;
  if(V.guarda && Math.abs(angDif(Math.atan2(A.x - V.x, A.z - V.z), V.f)) < 1.1){ dano = Math.max(1, Math.round(dano * .2)); bloqueio = true; }   /* guarda de frente */
  const duelo = c.mapa === 'cidade', aberto = !!MAPAS[c.mapa].aberto, inocente = aberto && !temKarma(V) && !temFlag(V, t);
  if(aberto && !temKarma(V)) A.flagAte = t + FLAG_S;                 /* [pk] bateu em quem nao e PK: fica roxo */
  V.hp = Math.max(duelo ? 1 : 0, V.hp - dano); V.pvpHitT = t;                    /* duelo nao mata: o ultimo golpe so decide o vencedor */
  difunde(c, { t: 'hit', v: V.id, a: A.id, d: dano, hp: V.hp, b: bloqueio ? 1 : 0, p: pid || 0 });
  if(duelo && V.hp <= 1){ fimDuelo(c, V, A); }
  else if(V.hp <= 0){ V.morto = true; V.tMorte = t; A.abates++; V.mortes++; V.mortoPorJog = t;
    if(aberto) fimPk(c, A, V, inocente);                                 /* [pk] karma / vitoria / item do PK */
    else { if(A.pers){ A.pers.pvp = (A.pers.pvp | 0) + 1; }      /* [ranking] vitorias no PvP (persistem) */
    ganhaXp(A, Math.round(Prog.xpMob(V.lv || 1) * 3)); } difunde(c, { t: 'die', v: V.id, a: A.id, nv: V.nome, na: A.nome, tv: V.team, ta: A.team }); }
}

/* ---- projeteis: o servidor faz o projetil VOAR na velocidade da skill e so acerta quem estiver no caminho; esquiva (imune) e guarda valem ---- */
let proxProj = 1;
function criaProj(c, A, d, idx){
  const p = d.proj, dx = Math.sin(A.f), dz = Math.cos(A.f);
  const pr = { id: proxProj++, A, x: A.x + dx * 1.2, z: A.z + dz * 1.2, dx, dz, v: Math.max(4, Math.min(40, +p.speed || 12)), w: Math.max(.3, Math.min(4, +p.width || 1)), range: Math.max(2, Math.min(40, d.range || 12)), d: 0, dmg: d.dmg, pierce: !!p.pierce, hit: new Set(), tl: agora() };
  (c.proj = c.proj || []).push(pr); if(c.proj.length > 200) c.proj.shift();
  difunde(c, { t: 'proj', pid: pr.id, a: A.id, ar: A.arma, i: idx, x: r2(pr.x), z: r2(pr.z), dx: r2(dx), dz: r2(dz), v: pr.v, r: pr.range }, A);
}
function passaProj(c, t){
  const L = c.proj; if(!L || !L.length) return;
  for(let i = L.length - 1; i >= 0; i--){
    const p = L[i], dt = Math.min(.25, t - p.tl), passo = p.v * dt, nx = p.x + p.dx * passo, nz = p.z + p.dz * passo; p.tl = t;
    for(const V of c.jog.values()){
      if(V === p.A || V.morto || p.hit.has(V.id) || t < V.imune || !podeFerir(c, p.A, V, t)) continue;
      const sx = nx - p.x, sz = nz - p.z, l2 = sx * sx + sz * sz || 1e-6, u = Math.max(0, Math.min(1, ((V.x - p.x) * sx + (V.z - p.z) * sz) / l2)), qx = p.x + sx * u, qz = p.z + sz * u;      /* trecho percorrido neste quadro: nao atravessa ninguem em alta velocidade */
      if(Math.hypot(V.x - qx, V.z - qz) <= p.w * .5 + .55){ p.hit.add(V.id); fere(c, p.A, V, p.dmg, t, p.id); if(!p.pierce){ p.d = p.range + 1; break; } }
    }
    p.x = nx; p.z = nz; p.d += passo; if(p.d >= p.range) L.splice(i, 1);
  }
}

function tiro(J){ const r = J.pers && Inv.tiro(J.pers); if(!r) return 0; envia(J, { t: 'ss', id: r.id, n: r.n }); return r.bonus; }      /* soulshot automatico: 1 por ataque */
/* ---- ataque padrao em ponto mirado (mago): o cristal brota onde ele mira (ate `alcance`) apos o aviso; quem ainda estiver no raio leva o dano (da para sair) ---- */
function ataqueMira(c, A, m, t){
  const mb = BASICO[A.arma], nv = mb.niveis[m.id]; if(!nv || t - A.ultB < .22) return; A.ultB = t; const dmgM = Math.round(nv.dmg * (1 + tiro(A)));
  if(typeof m.f === 'number') A.f = m.f;
  let x = +m.x, z = +m.z; if(!isFinite(x) || !isFinite(z)){ x = A.x + Math.sin(A.f) * 6; z = A.z + Math.cos(A.f) * 6; }
  const dx = x - A.x, dz = z - A.z, dd = Math.hypot(dx, dz) || 1, dist = Math.max(mb.minimo || 2, Math.min(mb.alcance || 10, dd)); x = A.x + dx / dd * dist; z = A.z + dz / dd * dist;
  const d = Math.max(mb.delay_min || .08, Math.min(mb.delay_max || .7, +m.d || .2));
  difunde(c, { t: 'atk', id: A.id, k: 'b', v: m.id, f: r2(A.f), x: r2(x), z: r2(z), d: r2(d) });
  setTimeout(() => {
    if(A.morto) return; const t2 = agora();
    for(const V of c.jog.values()){
      if(V === A || V.morto || t2 < V.imune || !podeFerir(c, A, V, t2)) continue;
      if(Math.hypot(V.x - x, V.z - z) <= nv.raio + .45) fere(c, A, V, dmgM, t2, 0);
    }
  }, d * 1000);
}

/* ---- ataque: o servidor resolve ---- */
function ataque(c, A, m){
  if(A.morto) return; const t = agora(); let d, parte2 = false;
  if(m.k === 'b' && BASICO[A.arma]){ ataqueMira(c, A, m, t); return; }
  if(m.k === 'b'){ d = BASIC[m.id]; if(!d || t - A.ultB < .22) return; A.ultB = t; }
  else if(m.k === 's'){
    const i = m.i | 0, lista = SKILLS[A.arma], s = lista && lista[i]; if(!s) return;
    if((m.p | 0) > 1){ if(A.ultSk !== A.arma + i || t - A.ultSkT > 3) return; parte2 = true; }            /* 2o golpe da mesma skill: sem nova recarga */
    else { if((A.cd[A.arma + i] || 0) > t + .9) return; A.cd[A.arma + i] = t + s.cd; A.ultSk = A.arma + i; A.ultSkT = t; }
    d = { dmg: s.dmg, range: s.range, half: s.half, proj: s.proj };
  } else return;
  A.f = typeof m.f === 'number' ? m.f : A.f;
  const ss = parte2 ? (A.ssUlt || 0) : (A.ssUlt = tiro(A)); if(ss) d = Object.assign({}, d, { dmg: Math.round(d.dmg * (1 + ss)) });      /* soulshot: o 2o golpe da skill usa o mesmo tiro */
  if(!parte2) difunde(c, { t: 'atk', id: A.id, k: m.k, v: m.k === 'b' ? m.id : (m.i | 0), f: r2(A.f) });       /* so para o visual dos outros */
  if(d.proj){ if(!parte2) criaProj(c, A, d, m.i | 0); return; }                                                /* skill de projetil: voa de verdade (da para ver e desviar) */
  for(const V of c.jog.values()){
    if(V === A || V.morto || t < V.imune || !podeFerir(c, A, V, t)) continue;
    const dx = V.x - A.x, dz = V.z - A.z, dist = Math.hypot(dx, dz); if(dist > d.range + .6) continue;                  /* +0,6 m: latencia */
    if(d.half < 3.1 && Math.abs(angDif(Math.atan2(dx, dz), A.f)) > d.half + Math.atan2(.45, Math.max(dist, .5)) + .12) continue;
    fere(c, A, V, d.dmg, t, 0);
  }
}

/* ---- HTTP estatico ---- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.vrm': 'model/gltf-binary', '.fbx': 'application/octet-stream', '.wasm': 'application/wasm', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const srv = http.createServer((req, res) => {
  let url; try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if(url === '/status'){ res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end(JSON.stringify({ cap: CAP, canais: todosCanais().map(c => ({ mapa: c.mapa, n: c.n, jogadores: c.jog.size })) })); }
  if(url.startsWith('/api/')) return Contas.http(req, res, url);
  if(!SERVE_STATIC){ res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('servidor de jogo (sem arquivos). WebSocket em /ws, estado em /status'); }
  if(url === '/') url = '/index.html';              /* entrada do jogo (botao Start -> selecao.html) */
  const f = path.normalize(path.join(RAIZ, url)); if(!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if(e || !st.isFile()){ res.writeHead(404); return res.end('nao encontrado'); }
    const h = { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': /sw\.js$|manifest\.json$|\.(html|js|css|json)$/.test(f) ? 'no-cache' : 'public, max-age=3600' };
    const rg = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if(rg){ const a = rg[1] ? +rg[1] : 0, b = rg[2] ? Math.min(+rg[2], st.size - 1) : st.size - 1; res.writeHead(206, Object.assign(h, { 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 })); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
    h['content-length'] = st.size; res.writeHead(200, h); fs.createReadStream(f).pipe(res);
  });
});

/* ---- WebSocket ---- */
const wss = new WebSocketServer({ server: srv, path: '/ws', maxPayload: 16384, verifyClient: info => origemOk(info.origin) });
wss.on('connection', ws => {
  let J = null, c = null, msgs = 0;
  const lim = setInterval(() => { msgs = 0; }, 1000);
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', buf => { try { tratar(buf); } catch (e) { console.error('ERRO em mensagem', e && e.stack || e); try { ws.close(); } catch (x) {} } });
  const tratar = buf => {
    if(++msgs > 80) return; let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if(m.t === 'join' && !J){
      let pers = null, conta = null;
      if(AUTH){
        conta = Contas.validaToken(m.tk); pers = conta && Array.isArray(conta.pers) ? conta.pers.find(p => p.id === String(m.cid || '')) : null;
        if(!pers){ try { ws.send(JSON.stringify({ t: 'erro', m: conta ? 'Personagem invalido.' : 'Entre na conta.' })); } catch (e) {} return ws.close(); }
        for(const cc of todosCanais()) for(const o of cc.jog.values()) if(o.cid === pers.id){ try { o.ws.send(JSON.stringify({ t: 'erro', m: 'Este personagem entrou em outro lugar.' })); } catch (e) {} o.ws.close(); }      /* um personagem, uma conexao */
        m.nome = pers.name; m.raca = pers.charType; m.cls = /magic/.test(pers.charType) ? 'magic' : 'fighter';
      }
      const mapa = MAPAS[m.mapa] ? m.mapa : 'cidade', sid = pers ? pers.id : String(m.sid || ('s' + proxId)).slice(0, 24), mate = colega(mapa, sid); const gJoin = [...grupos.values()].find(x => x.membros.has(sid));
      c = mapa === 'masmorra' ? canalMasmorra(gJoin ? gJoin.id : 0) : (mate && mate.canalRef && mate.canalRef.jog.size < (mapa === 'pvp' ? CAP_PVP : CAP)) ? mate.canalRef : canalLivre(mapa, m.canal | 0);
      J = { id: proxId++, ws, nome: String(m.nome || 'Heroi').slice(0, 16), raca: String(m.raca || 'fighter').slice(0, 20), cls: String(m.cls || 'fighter').slice(0, 12), arma: SKILLS[m.arma] ? m.arma : 'sword',
            sid, pers, lv: pers ? pers.level : 1, cid: pers ? pers.id : '', party: 0, canalRef: null, mapa, x: 0, z: 0, f: Math.PI, a: 'idle', ts: 1, guarda: false, pmax: Math.max(50, Math.min(pers ? pmaxMax(pers) : 5000, m.pmax | 0 || 100)), hp: 0, morto: false, tMorte: 0, imune: 0, ultB: 0, cd: {}, abates: 0, mortes: 0, ultSt: agora(), ultChat: 0, team: '', duelo: null, pedidoDe: 0, pedidoT: 0 };
      const sp = posSpawn(c, J); J.x = sp.x; J.z = sp.z; J.f = Math.PI;
      if((mapa === 'cidade' || MAPAS[mapa].aberto) && typeof m.x === 'number' && typeof m.z === 'number' && Math.abs(m.x) < 3000 && Math.abs(m.z) < 3000){ J.x = m.x; J.z = m.z; }      /* na cidade o jogador ja esta no mundo: a posicao inicial e a dele */
      J.hp = J.pmax; J.canalRef = c; J.canal = c.n; c.jog.set(J.id, J); J.enV = Inv.encArma(pers);
      for(const g of grupos.values()) if(g.membros.has(sid)){ const mm = g.membros.get(sid); mm.J = J; mm.ausente = 0; mm.nome = J.nome; J.party = g.id; envieGrupo(g); }      /* voltou (outra pagina/queda): reata o grupo */
      envia(J, { t: 'w', id: J.id, sid: J.sid, grp: (() => { const g = [...grupos.values()].find(x => x.membros.has(J.sid)); return g ? estadoGrupo(g) : null; })(), prog: pers ? Prog.info(pers) : null, mapa, canal: c.n, cap: CAP, jog: [...c.jog.values()].filter(o => o !== J).map(info), eu: info(J) });
      if(c.mapa === 'masmorra' && c.dg && c.gid){ const gg = grupos.get(c.gid); if(gg && gg.lider !== J.sid){ envia(J, { t: 'dg', k: 'start', key: c.dg.key, de: 0 }); if(c.dg.boss) envia(J, { t: 'dg', k: 'boss', de: 0 }); if(c.dg.clear) envia(J, { t: 'dg', k: 'clear', de: 0 }); } }
      if(pers && Inv.garante(pers)){ Contas.grava(); envia(J, { t: 'inv', inv: pers.inv }); }
      if(ANUNCIO) envia(J, { t: 'anuncio', txt: ANUNCIO });                 /* [anuncio] */      /* inventario do servidor */
      difunde(c, { t: 'j', p: info(J) }, J); console.log(`+ ${J.nome} (${J.raca}) ${mapa} canal ${c.n} [${c.jog.size}/${CAP}]`); return;
    }
    if(!J) return;
    if(m.t === 'st'){                                               /* posicao, direcao, animacao (nome do clipe), velocidade do clipe, arma, guarda */
      const t = agora(), dt = Math.min(.5, Math.max(.03, t - J.ultSt)); J.ultSt = t;      /* intervalo limitado: ficar quieto nao da credito para teleportar depois */
      if(typeof m.x === 'number' && typeof m.z === 'number' && !J.morto){
        const dx = m.x - J.x, dz = m.z - J.z, d = Math.hypot(dx, dz), max = VMAX * dt + .5;
        if(d > max){ J.x += dx / d * max; J.z += dz / d * max; } else { J.x = m.x; J.z = m.z; }          /* limita a velocidade; se andou demais, so chega mais devagar */
      }
      if(typeof m.y === 'number' && isFinite(m.y)) J.y = Math.max(-5000, Math.min(5000, m.y));      /* [mapas-multi] altura no relevo (so para desenhar) */
      if((c.mapa === 'masmorra' || MAPAS[c.mapa].aberto) && typeof m.h === 'number' && !J.morto){ const h = Math.max(0, Math.min(J.pmax, m.h | 0)); if(h <= J.hp || !(t - (J.pvpHitT || 0) < 3)) J.hp = h; }      /* [pk] logo depois de golpe de jogador so aceita vida menor (pacote atrasado nao desfaz o dano) */      /* so para a barra do grupo: na masmorra o combate e do jogo */
      if(typeof m.f === 'number') J.f = m.f; J.a = String(m.a || 'idle').slice(0, 24); J.ts = Math.max(.2, Math.min(5, +m.ts || 1)); J.guarda = !!m.g;
      if(SKILLS[m.w] && m.w !== J.arma && !J.morto){ J.arma = m.w; }
    } else if(m.t === 'atk'){ J.pk = m.pk ? 1 : 0; ataque(c, J, m); }      /* [pk] pk = ataque forcado (Ctrl / botao PK) */
    else if(m.t === 'inv'){                                          /* equipar / tirar / descartar: o servidor valida e devolve o estado */
      const t = agora(); if(t - (J.invT || 0) < .08 || !J.pers) return; J.invT = t;
      const erro = Inv.pedido(J.pers, { k: String(m.k || ''), uid: String(m.uid || '').slice(0, 24), slot: String(m.slot || '').slice(0, 12) });
      if(!erro) Contas.grava(); envia(J, { t: 'inv', inv: J.pers.inv, erro: erro || undefined }); avisaEnc(c, J);
    }
    else if(m.t === 'arm'){                                          /* armazem do Wilford (bau da conta) */
      const t = agora(); if(t - (J.armT || 0) < .12 || !J.pers) return; J.armT = t;
      const conta = Contas.contaDoPers(J.pers.id), erro = Inv.armazem(conta, J.pers, { k: String(m.k || '').slice(0, 10), uid: String(m.uid || '').slice(0, 24), qtd: m.qtd });
      if(!erro && m.k !== 'ver') Contas.grava();
      envia(J, { t: 'inv', inv: J.pers.inv, erro: erro || undefined }); envia(J, { t: 'arm', arm: Inv.garanteArm(conta) });
    }
    else if(m.t === 'loja'){                                         /* comprar consumivel / vender equipamento (data/loja.json) */
      const t = agora(); if(t - (J.lojaT || 0) < .15 || !J.pers) return; J.lojaT = t; let erro = '', aviso = '';
      if(m.k === 'comprar'){ const id = String(m.id || '').slice(0, 24), q = m.qtd | 0; erro = Inv.comprar(J.pers, String(m.loja || '').slice(0, 24), id, q); if(!erro) aviso = Inv.loja().consumiveis[id] ? 'Você comprou ' + q + 'x ' + Inv.loja().consumiveis[id].nome + '.' : 'Você comprou ' + Inv.nome(id) + '.'; }
      else if(m.k === 'encantar'){                                   /* ferreiro Altran */
        const r = Inv.encantar(J.pers, String(m.uid || '').slice(0, 24)); erro = r.erro;
        if(!erro){ aviso = r.ok ? 'Encantamento bem-sucedido: ' + r.nome + ' +' + r.nivel + '.' : 'O encantamento falhou e ' + r.nome + ' +' + r.nivel + ' se quebrou.'; Contas.grava(); envia(J, { t: 'enc', ok: r.ok ? 1 : 0, nivel: r.nivel, nome: r.nome, slot: r.slot }); avisaEnc(c, J); }
      }
      else if(m.k === 'vender'){ const r = Inv.vender(J.pers, String(m.uid || '').slice(0, 24)); erro = r.erro; if(!erro) aviso = 'Item vendido por ' + r.valor + ' Adena.'; }
      else erro = 'Pedido desconhecido.';
      if(!erro) Contas.grava(); envia(J, { t: 'inv', inv: J.pers.inv, erro: erro || undefined, aviso: aviso || undefined });
    }
    else if(m.t === 'usar'){                                         /* consumivel: o servidor gasta, confere a recarga e devolve o efeito */
      if(!J.pers) return; const r = Inv.usar(J.pers, J, String(m.id || '').slice(0, 24), agora());
      if(r.erro){ envia(J, { t: 'inv', inv: J.pers.inv, erro: r.erro }); return; }
      Contas.grava(); let hp;
      if(r.cura && c.mapa !== 'masmorra' && !J.morto){ J.hp = Math.min(J.pmax, J.hp + Math.round(J.pmax * r.cura)); hp = J.hp; difunde(c, { t: 'cura', v: J.id, hp: J.hp }); }      /* PvP e cidade: a vida e do servidor */
      envia(J, { t: 'usou', id: r.id, nome: r.nome, cura: r.cura, volta: r.volta ? 1 : 0, hp }); envia(J, { t: 'inv', inv: J.pers.inv });
    }
    else if(m.t === 'attr'){                                         /* distribuir pontos de atributo: o servidor valida e devolve o estado (prog) */
      const t = agora(); if(t - (J.attrT || 0) < .1) return; J.attrT = t; if(J.pers && Prog.distribui(J.pers, m.v)) Contas.grava(); enviaProg(J);
    }
    else if(m.t === 'attrreset'){                                    /* reset de pontos: sempre gratis */
      if(J.pers){ Prog.reseta(J.pers); Contas.grava(); } enviaProg(J);
    }
    else if(m.t === 'morte'){                                       /* morte estilo L2 num mapa aberto: perde um pouco de XP (nao na DG nem no PvP) */
      const t = agora(); if(!J.pers || c.mapa === 'pvp' || c.dg || t - (J.morteT || 0) < 8) return; J.morteT = t;
      if(J.mortoPorJog && t - J.mortoPorJog < 20 && !temKarma(J)){ envia(J, Object.assign({ t: 'prog', perdeu: 0, pvp: 1 }, Prog.info(J.pers))); return; }      /* [pk] morto por jogador: sem perda de XP (PK perde) */
      const v = Prog.perde(J.pers); Contas.grava(); envia(J, Object.assign({ t: 'prog', perdeu: v }, Prog.info(J.pers)));
    }
    else if(m.t === 'mhit'){                                        /* [mobs-servidor] dano do jogador num mob do servidor */
      const W = mundoDe(c); if(!W || J.morto) return; const t = agora(); J.mhT = (J.mhT || []).filter(x => t - x < 1); if(J.mhT.length >= 30) return; J.mhT.push(t);
      const mo = W.hit(J, m.id | 0, +m.d || 0, t); if(mo) abateMundo(c, W, mo);
    }
    else if(m.t === 'mtaunt'){ const W = mundoDe(c); if(W && !J.morto) W.taunt(J, Math.min(12, +m.r || 10), agora()); }
    else if(m.t === 'xp'){
      if(MAPAS[c.mapa].aberto) return;                               /* [mobs-servidor] mapa aberto: o XP sai do servidor (abateMundo), nao do "matei X" do cliente */                                          /* "matei X": o ganho vem da tabela do servidor, nao do cliente; limite de ritmo contra spam */
      const t = agora(); J.xpT = (J.xpT || []).filter(x => t - x < 60); if(J.xpT.length >= 90 || (J.xpT.length && t - J.xpT[J.xpT.length - 1] < .15)) return; J.xpT.push(t);
      const tipo = String(m.tipo || '').slice(0, 24), dif = String((c.dg && c.dg.key) || m.dif || 'normal').slice(0, 12); if(!/^[a-z0-9_]{1,24}$/.test(tipo)) return;
      const quem = (c.mapa === 'masmorra' && c.gid) ? [...c.jog.values()].filter(o => o.pers) : (J.pers ? [J] : []);
      for(const o of quem){ const v = Prog.xpAbate(dif, tipo, o.pers.level); ganhaXp(o, v); premia(o, tipo, dif, v); karmaMob(o, v); }      /* grupo: todo mundo ganha, cada um pela sua diferenca de nivel */
    }
    else if(m.t === 'dg' && c.mapa === 'masmorra' && c.gid){            /* sincronia da dungeon em grupo: o LIDER manda o estado, os outros mandam o que fizeram */
      const g = grupos.get(c.gid); if(!g) return; const k = String(m.k || '').slice(0, 12), souLider = g.lider === J.sid, o = Object.assign({}, m, { t: 'dg', k, de: J.id });
      if(souLider){
        if(!/^(start|snap|clear|end|boss|mdmg|proj|bsnap|room|bolt)$/.test(k)) return;
        if(k === 'start'){ c.dg = { key: String(m.key || '').slice(0, 12), id: ++dgSeq }; g.dg = { key: c.dg.key, id: c.dg.id, canal: c.n }; for(const mm of g.membros.values()) if(mm.J && mm.J !== J && mm.J.canalRef !== c) envia(mm.J, { t: 'dgconvite', key: c.dg.key, id: c.dg.id, nome: J.nome }); envieGrupo(g); }      /* puxa os membros AGORA; o estado do grupo repete (reforco) */
        else if(k === 'boss' && c.dg) c.dg.boss = 1; else if(k === 'clear' && c.dg) c.dg.clear = 1; else if(k === 'end'){ c.dg = null; g.dg = null; envieGrupo(g); }
        if(k === 'mdmg'){ o.dmg = Math.max(0, Math.min(800, +m.dmg || 0)); const V = c.jog.get(m.to | 0); if(V) envia(V, o); return; }
        difunde(c, o, J);
      } else {
        if(!/^(hit|bhit)$/.test(k)) return; o.d = Math.max(0, Math.min(5000, +m.d || 0));
        const L = [...c.jog.values()].find(x => x.sid === g.lider); if(L) envia(L, o);
      }
    }
    else if(m.t === 'roll'){ J.imune = agora() + .34; }
    else if(m.t === 'chat'){ const t = agora(); if(t - J.ultChat > .8){ J.ultChat = t; const txt = String(m.m || '').slice(0, 120).trim();      /* chat: geral = canal; c:'g' = grupo (em qualquer mapa) */
      if(txt && m.c === 'g'){ const g = grupoDe(J); if(!g) envia(J, { t: 'chat', n: 'Sistema', m: 'Voce nao esta em um grupo.', c: 's' }); else for(const mm of g.membros.values()) if(mm.J) envia(mm.J, { t: 'chat', n: J.nome, m: txt, c: 'g' }); }
      else if(txt) difunde(c, { t: 'chat', n: J.nome, m: txt, team: J.team }); } }
    else if(m.t === 'ping') envia(J, { t: 'pong', c: m.c });
    else if(m.t === 'duel' && c.mapa === 'cidade' && !J.duelo){                          /* desafia outro jogador (precisa estar perto) */
      const V = c.jog.get(m.to | 0); if(!V || V === J || V.duelo || Math.hypot(V.x - J.x, V.z - J.z) > 20) return;
      V.pedidoDe = J.id; V.pedidoT = agora() + DUELO_PEDIDO_S; envia(V, { t: 'duelreq', de: J.id, nome: J.nome }); envia(J, { t: 'duelsent', para: V.id, nome: V.nome });
    } else if(m.t === 'duelok' && c.mapa === 'cidade' && !J.duelo){
      const A = c.jog.get(J.pedidoDe | 0); J.pedidoDe = 0; if(!A || A.duelo || agora() > J.pedidoT) return; const ini = agora() + DUELO_CONTAGEM;
      A.duelo = { com: J.id, inicio: ini, fim: 0, reset: 0 }; J.duelo = { com: A.id, inicio: ini, fim: 0, reset: 0 }; A.hp = A.pmax; J.hp = J.pmax;
      difunde(c, { t: 'duelstart', a: A.id, b: J.id, na: A.nome, nb: J.nome, seg: DUELO_CONTAGEM });
    } else if(m.t === 'duelno'){ const A = c.jog.get(J.pedidoDe | 0); J.pedidoDe = 0; if(A) envia(A, { t: 'duelrecusou', nome: J.nome }); }
    else if(m.t === 'pinvite'){                                       /* convida alguem do mesmo canal para o grupo */
      const V = c.jog.get(m.to | 0); if(!V || V === J || V.party || Math.hypot(V.x - J.x, V.z - J.z) > 60) return;
      const g = grupoDe(J); if(g && (g.membros.size >= PARTY_MAX || g.lider !== J.sid)) return;                       /* so o lider convida; grupo cheio */
      V.pInv = { de: J.id, ate: agora() + 20 }; envia(V, { t: 'preq', de: J.id, nome: J.nome }); envia(J, { t: 'psent', para: V.id, nome: V.nome });
    } else if(m.t === 'pok'){
      const A = J.pInv && agora() < J.pInv.ate ? c.jog.get(J.pInv.de) : null; J.pInv = null; if(!A || J.party) return;
      let g = grupoDe(A); if(!g){ g = { id: proxGrupo++, lider: A.sid, membros: new Map([[A.sid, { nome: A.nome, J: A, ausente: 0 }]]) }; grupos.set(g.id, g); A.party = g.id; }
      if(g.membros.size >= PARTY_MAX) return; g.membros.set(J.sid, { nome: J.nome, J, ausente: 0 }); J.party = g.id; envieGrupo(g); juntaNaMasmorra(g);
    } else if(m.t === 'pno'){ const A = J.pInv ? c.jog.get(J.pInv.de) : null; J.pInv = null; if(A) envia(A, { t: 'prec', nome: J.nome }); }
    else if(m.t === 'pleave'){ tiraDoGrupo(J.sid, J, 'saiu'); }
    else if(m.t === 'pkick'){ const g = grupoDe(J); if(g && g.lider === J.sid){ const alvo = [...g.membros].find(([sid, mm]) => mm.J && mm.J.id === (m.to | 0)); if(alvo && alvo[0] !== J.sid) tiraDoGrupo(alvo[0], alvo[1].J, 'expulso'); } }
    else if(m.t === 'dueldesiste' && J.duelo && !J.duelo.fim){ const V = c.jog.get(J.duelo.com); fimDuelo(c, J, V, 'desistiu'); }
  };
  ws.on('close', () => {
    clearInterval(lim);
    if(J && c){
      if(J.duelo && !J.duelo.fim){ const V = c.jog.get(J.duelo.com); fimDuelo(c, J, V, 'saiu'); if(V) V.duelo = null; }
      const gg = grupoDe(J); if(gg){ const mm = gg.membros.get(J.sid); if(mm && mm.J === J){ mm.J = null; mm.ausente = agora(); envieGrupo(gg); } }          /* grupo guarda o lugar por 90 s */
      if(c.mapa === 'masmorra' && c.dg){ const gg = c.gid && grupos.get(c.gid); if(!gg || gg.lider === J.sid){ difunde(c, { t: 'dg', k: 'end', de: J.id }, J); c.dg = null; if(gg){ gg.dg = null; envieGrupo(gg); } } }      /* o lider saiu: a dungeon acaba para todos */
      c.jog.delete(J.id); difunde(c, { t: 'l', id: J.id }); console.log(`- ${J.nome} ${c.mapa} canal ${c.n} [${c.jog.size}/${CAP}]`);
    }
  });
  ws.on('error', () => {});
});
setInterval(() => { wss.clients.forEach(ws => { if(!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 15000);

/* ---- laco do servidor: reaparecimento, duelos e fotos do mundo (so quem esta perto, ate AOI m) ---- */
let tick = 0;
const MET = process.env.METRICAS === '1' ? { n: 0, soma: 0, max: 0, t: agora() } : null;      /* METRICAS=1: tempo do laco no log a cada 30 s */
setInterval(() => {
  const t0m = MET ? process.hrtime.bigint() : 0n;
  tick++; const t = agora(); for(const cp of todosCanais()) passaProj(cp, t);
  for(const c of todosCanais()){
    for(const J of c.jog.values()){
      const eP = estadoPk(J, t), kP = J.pers ? J.pers.karma | 0 : 0; if(eP !== J.stPk || kP !== J.kPk){ J.stPk = eP; J.kPk = kP; envia(J, { t: 'pkst', st: eP, karma: kP }); }      /* [pk] meu estado */
      if(J.morto && !MAPAS[c.mapa].aberto && t - J.tMorte >= RESP_S){ const sp = posSpawn(c, J); J.x = sp.x; J.z = sp.z; J.hp = J.pmax; J.morto = false; J.imune = t + 2; difunde(c, { t: 'resp', id: J.id, x: r2(J.x), z: r2(J.z), hp: J.hp }); }
      const d = J.duelo;
      if(d){
        const V = c.jog.get(d.com);
        if(!d.fim && V && t >= d.inicio && Math.hypot(V.x - J.x, V.z - J.z) > DUELO_FUGA && !(V.duelo && V.duelo.fim)) fimDuelo(c, J, V, 'fugiu');
        if(d.fim && t >= d.reset){ J.hp = J.pmax; J.duelo = null; difunde(c, { t: 'resp', id: J.id, x: r2(J.x), z: r2(J.z), hp: J.hp, keep: 1 }); }       /* depois do duelo: vida cheia, sem teleporte */
        else if(!V) J.duelo = null;
      }
    }
    const lista = [...c.jog.values()];
    const W = lista.length ? mundoDe(c) : null; if(W) W.tick(t, TICK / 1000, lista);      /* [mobs-servidor] */
    for(const A of lista){
      const p = []; for(const B of lista){ if(B === A) continue; if(Math.abs(B.x - A.x) > AOI || Math.abs(B.z - A.z) > AOI) continue; p.push([B.id, r2(B.x), r2(B.z), r2(B.f), B.a, B.hp, B.guarda ? 1 : 0, B.morto ? 1 : 0, B.ts, typeof B.y === 'number' ? r2(B.y) : null, estadoPk(B, t)]); }
      envia(A, { t: 's', n: tick, p }); if(W && tick % 2 === 0) envia(A, { t: 'ms', m: W.snap(A, AOI) });      /* mobs a 6/s (o jogo suaviza) */
    }
  }
  if(MET){ const ms = Number(process.hrtime.bigint() - t0m) / 1e6; MET.n++; MET.soma += ms; if(ms > MET.max) MET.max = ms;
    if(t - MET.t >= 30){ const nj = todosCanais().reduce((s, c) => s + c.jog.size, 0); console.log('[metricas] laco medio ' + (MET.soma / MET.n).toFixed(2) + ' ms, max ' + MET.max.toFixed(1) + ' ms (limite ' + TICK.toFixed(0) + ') | jogadores ' + nj + ' | memoria ' + (process.memoryUsage().rss / 1048576).toFixed(0) + ' MB'); MET.n = 0; MET.soma = 0; MET.max = 0; MET.t = t; } }
}, TICK);

setInterval(() => {
  const t = agora();
  for(const g of [...grupos.values()]){
    for(const [sid, m] of [...g.membros]) if(!m.J && m.ausente && t - m.ausente > PARTY_GRACA) tiraDoGrupo(sid, null, 'ausente');
    if(grupos.has(g.id)) envieGrupo(g);
  }
}, 1000);

srv.listen(PORT, () => console.log(`${SERVE_STATIC ? '' : '[so jogo, sem arquivos] '}${ORIGINS.length ? '[origens: ' + ORIGINS.join(', ') + '] ' : ''}Servidor em http://localhost:${PORT}/selecao.html  |  canal: ${CAP} jogadores  |  mapas: cidade (duelo) e pvp (times)  |  dano x${PVP_MULT}  |  AOI ${AOI} m`));
