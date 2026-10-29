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
const RAIZ = path.join(__dirname, '..', 'prototipo'), TICK = 1000 / 12, RESP_S = 4;
const VMAX = 14;                                                   /* m/s: corrida ~4,3, esquiva 4,6 m em 0,4 s = 11,5; folga de latencia */
const MAPAS = { cidade: { spawn: { x: 0, z: 6, r: 4 } }, pvp: { spawn: { x: 0, z: 0, r: 3 } } };
const SPAWN_TIME = { A: { x: 0, z: -9 }, B: { x: 0, z: 9 } };    /* mapa de PvP: cada time nasce de um lado */
const PARTY_MAX = 6, PARTY_GRACA = 90;                              /* grupo: ate 6; quem cai ou troca de pagina tem 90 s para voltar */
const DUELO_CONTAGEM = 3, DUELO_FUGA = 45, DUELO_PEDIDO_S = 15;

/* ---- dados de combate (os mesmos do jogo) ---- */
const SKILLS = {};                                                 /* arma -> [{cd, dmg (por golpe), range, half}] */
try { fs.readdirSync(path.join(RAIZ, 'data', 'armas')).filter(f => f.endsWith('.json')).forEach(f => { const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'armas', f), 'utf8')); if(j.id && j.skills) SKILLS[j.id] = j.skills.map(s => ({ nome: s.name, cd: s.cd, dmg: s.dmg, range: s.range, half: s.half })); }); } catch (e) { console.warn('sem data/armas:', e.message); }
const BASIC = { sweep: { dmg: 18, range: 3.6, half: 1.6 }, thrust: { dmg: 27, range: 4.2, half: .5 }, spin: { dmg: 33, range: 3.6, half: Math.PI }, up: { dmg: 21, range: 3.4, half: 1 }, down: { dmg: 24, range: 3.4, half: 1 }, wedge: { dmg: 30, range: 3.6, half: 1 } };

/* ---- estado ---- */
let proxId = 1; const canais = { cidade: [], pvp: [] };           /* canal: { mapa, n, jog: Map(id -> J) } */
function canalLivre(mapa, pedido){
  const L = canais[mapa];
  if(pedido && L[pedido - 1] && L[pedido - 1].jog.size < CAP) return L[pedido - 1];
  for(const c of L) if(c.jog.size < CAP) return c;
  const c = { mapa, n: L.length + 1, jog: new Map() }; L.push(c); return c;
}
const todosCanais = () => [].concat(canais.cidade, canais.pvp);
const r2 = v => Math.round(v * 100) / 100, agora = () => Date.now() / 1000;
const angDif = (a, b) => { let d = a - b; while(d > Math.PI) d -= 2 * Math.PI; while(d < -Math.PI) d += 2 * Math.PI; return d; };
function posSpawn(c, J){
  if(c.mapa === 'pvp'){ const b = SPAWN_TIME[J.team], a = Math.random() * 6.283, r = Math.random() * 3; return { x: b.x + Math.sin(a) * r, z: b.z + Math.cos(a) * r }; }
  const s = MAPAS.cidade.spawn, a = Math.random() * 6.283, r = Math.random() * s.r; return { x: s.x + Math.sin(a) * r, z: s.z + Math.cos(a) * r };
}
function envia(J, o){ if(J.ws.readyState === 1) J.ws.send(JSON.stringify(o)); }
function difunde(c, o, exceto){ const s = JSON.stringify(o); for(const J of c.jog.values()) if(J !== exceto && J.ws.readyState === 1) J.ws.send(s); }
const info = J => ({ id: J.id, nome: J.nome, raca: J.raca, cls: J.cls, arma: J.arma, x: r2(J.x), z: r2(J.z), f: r2(J.f), hp: J.hp, pmax: J.pmax, team: J.team || '' });

/* ---- grupo (party): ligado a SESSAO do jogador (sid, guardado no navegador), nao a conexao: sobrevive a troca de pagina (cidade <-> arena) ---- */
const grupos = new Map(); let proxGrupo = 1;                       /* gid -> { id, lider (sid), membros: Map(sid -> { nome, J, ausente }) } */
const grupoDe = J => (J.party ? grupos.get(J.party) : null);
function estadoGrupo(g){ return { t: 'party', id: g.id, lider: g.lider, m: [...g.membros].map(([sid, m]) => ({ sid, nome: m.nome, id: m.J ? m.J.id : 0, hp: m.J ? m.J.hp : 0, pmax: m.J ? m.J.pmax : 0, on: !!m.J, mapa: m.J ? m.J.mapa : '', canal: m.J ? m.J.canal : 0 })) }; }
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
function podeFerir(c, A, V, t){
  if(c.mapa === 'pvp') return A.team !== V.team;
  const d = A.duelo; return !!(d && d.com === V.id && V.duelo && V.duelo.com === A.id && t >= d.inicio && !d.fim);   /* cidade: so no duelo ja comecado */
}
function fimDuelo(c, perdedor, vencedor, motivo){
  const t = agora(); [perdedor, vencedor].forEach(J => { if(J && J.duelo) { J.duelo.fim = t; J.duelo.reset = t + 3; } });
  difunde(c, { t: 'duelend', v: vencedor ? vencedor.id : 0, l: perdedor.id, nv: vencedor && vencedor.nome, nl: perdedor.nome, m: motivo || 'ko' });
}

/* ---- ataque: o servidor resolve ---- */
function ataque(c, A, m){
  if(A.morto) return; const t = agora(); let d, parte2 = false;
  if(m.k === 'b'){ d = BASIC[m.id]; if(!d || t - A.ultB < .22) return; A.ultB = t; }
  else if(m.k === 's'){
    const i = m.i | 0, lista = SKILLS[A.arma], s = lista && lista[i]; if(!s) return;
    if((m.p | 0) > 1){ if(A.ultSk !== A.arma + i || t - A.ultSkT > 3) return; parte2 = true; }            /* 2o golpe da mesma skill: sem nova recarga */
    else { if((A.cd[A.arma + i] || 0) > t + .9) return; A.cd[A.arma + i] = t + s.cd; A.ultSk = A.arma + i; A.ultSkT = t; }
    d = { dmg: s.dmg, range: s.range, half: s.half };
  } else return;
  A.f = typeof m.f === 'number' ? m.f : A.f;
  if(!parte2) difunde(c, { t: 'atk', id: A.id, k: m.k, v: m.k === 'b' ? m.id : (m.i | 0), f: r2(A.f) });       /* so para o visual dos outros */
  for(const V of c.jog.values()){
    if(V === A || V.morto || t < V.imune || !podeFerir(c, A, V, t)) continue;
    const dx = V.x - A.x, dz = V.z - A.z, dist = Math.hypot(dx, dz); if(dist > d.range + .6) continue;                  /* +0,6 m: latencia */
    if(d.half < 3.1 && Math.abs(angDif(Math.atan2(dx, dz), A.f)) > d.half + Math.atan2(.45, Math.max(dist, .5)) + .12) continue;
    let dano = Math.max(1, Math.round(d.dmg * (.92 + Math.random() * .16) * PVP_MULT)), bloqueio = false;
    if(V.guarda && Math.abs(angDif(Math.atan2(A.x - V.x, A.z - V.z), V.f)) < 1.1){ dano = Math.max(1, Math.round(dano * .2)); bloqueio = true; }   /* guarda de frente */
    const duelo = c.mapa === 'cidade';
    V.hp = Math.max(duelo ? 1 : 0, V.hp - dano);                    /* duelo nao mata: o ultimo golpe so decide o vencedor */
    difunde(c, { t: 'hit', v: V.id, a: A.id, d: dano, hp: V.hp, b: bloqueio ? 1 : 0 });
    if(duelo && V.hp <= 1){ fimDuelo(c, V, A); }
    else if(V.hp <= 0){ V.morto = true; V.tMorte = t; A.abates++; V.mortes++; difunde(c, { t: 'die', v: V.id, a: A.id, nv: V.nome, na: A.nome, tv: V.team, ta: A.team }); }
  }
}

/* ---- HTTP estatico ---- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.vrm': 'model/gltf-binary', '.fbx': 'application/octet-stream', '.wasm': 'application/wasm', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const srv = http.createServer((req, res) => {
  let url; try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if(url === '/status'){ res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end(JSON.stringify({ cap: CAP, canais: todosCanais().map(c => ({ mapa: c.mapa, n: c.n, jogadores: c.jog.size })) })); }
  if(!SERVE_STATIC){ res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('servidor de jogo (sem arquivos). WebSocket em /ws, estado em /status'); }
  if(url === '/') url = '/selecao.html';
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
const wss = new WebSocketServer({ server: srv, path: '/ws', maxPayload: 4096, verifyClient: info => origemOk(info.origin) });
wss.on('connection', ws => {
  let J = null, c = null, msgs = 0;
  const lim = setInterval(() => { msgs = 0; }, 1000);
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', buf => {
    if(++msgs > 80) return; let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if(m.t === 'join' && !J){
      const mapa = MAPAS[m.mapa] ? m.mapa : 'cidade', sid = String(m.sid || ('s' + proxId)).slice(0, 24), mate = colega(mapa, sid); c = (mate && mate.canalRef && mate.canalRef.jog.size < CAP) ? mate.canalRef : canalLivre(mapa, m.canal | 0);
      J = { id: proxId++, ws, nome: String(m.nome || 'Heroi').slice(0, 16), raca: String(m.raca || 'fighter').slice(0, 20), cls: String(m.cls || 'fighter').slice(0, 12), arma: SKILLS[m.arma] ? m.arma : 'sword',
            sid, party: 0, canalRef: null, mapa, x: 0, z: 0, f: Math.PI, a: 'idle', ts: 1, guarda: false, pmax: Math.max(50, Math.min(5000, m.pmax | 0 || 100)), hp: 0, morto: false, tMorte: 0, imune: 0, ultB: 0, cd: {}, abates: 0, mortes: 0, ultSt: agora(), ultChat: 0, team: '', duelo: null, pedidoDe: 0, pedidoT: 0 };
      if(mapa === 'pvp'){ if(mate && mate.canalRef === c) J.team = mate.team; else { let a = 0, b = 0; for(const o of c.jog.values()) o.team === 'A' ? a++ : b++; J.team = a <= b ? 'A' : 'B'; } }     /* times equilibrados */
      const sp = posSpawn(c, J); J.x = sp.x; J.z = sp.z; J.f = mapa === 'pvp' ? (J.team === 'A' ? 0 : Math.PI) : Math.PI;
      if(mapa === 'cidade' && typeof m.x === 'number' && typeof m.z === 'number' && Math.abs(m.x) < 600 && Math.abs(m.z) < 600){ J.x = m.x; J.z = m.z; }      /* na cidade o jogador ja esta no mundo: a posicao inicial e a dele */
      J.hp = J.pmax; J.canalRef = c; J.canal = c.n; c.jog.set(J.id, J);
      for(const g of grupos.values()) if(g.membros.has(sid)){ const mm = g.membros.get(sid); mm.J = J; mm.ausente = 0; mm.nome = J.nome; J.party = g.id; envieGrupo(g); }      /* voltou (outra pagina/queda): reata o grupo */
      envia(J, { t: 'w', id: J.id, mapa, canal: c.n, cap: CAP, jog: [...c.jog.values()].filter(o => o !== J).map(info), eu: info(J) });
      difunde(c, { t: 'j', p: info(J) }, J); console.log(`+ ${J.nome} (${J.raca}) ${mapa} canal ${c.n} [${c.jog.size}/${CAP}]`); return;
    }
    if(!J) return;
    if(m.t === 'st'){                                               /* posicao, direcao, animacao (nome do clipe), velocidade do clipe, arma, guarda */
      const t = agora(), dt = Math.min(.5, Math.max(.03, t - J.ultSt)); J.ultSt = t;      /* intervalo limitado: ficar quieto nao da credito para teleportar depois */
      if(typeof m.x === 'number' && typeof m.z === 'number' && !J.morto){
        const dx = m.x - J.x, dz = m.z - J.z, d = Math.hypot(dx, dz), max = VMAX * dt + .5;
        if(d > max){ J.x += dx / d * max; J.z += dz / d * max; } else { J.x = m.x; J.z = m.z; }          /* limita a velocidade; se andou demais, so chega mais devagar */
      }
      if(typeof m.f === 'number') J.f = m.f; J.a = String(m.a || 'idle').slice(0, 24); J.ts = Math.max(.2, Math.min(5, +m.ts || 1)); J.guarda = !!m.g;
      if(SKILLS[m.w] && m.w !== J.arma && !J.morto){ J.arma = m.w; }
    } else if(m.t === 'atk') ataque(c, J, m);
    else if(m.t === 'roll'){ J.imune = agora() + .34; }
    else if(m.t === 'chat'){ const t = agora(); if(t - J.ultChat > .8){ J.ultChat = t; difunde(c, { t: 'chat', n: J.nome, m: String(m.m || '').slice(0, 120), team: J.team }); } }
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
      if(g.membros.size >= PARTY_MAX) return; g.membros.set(J.sid, { nome: J.nome, J, ausente: 0 }); J.party = g.id; envieGrupo(g);
    } else if(m.t === 'pno'){ const A = J.pInv ? c.jog.get(J.pInv.de) : null; J.pInv = null; if(A) envia(A, { t: 'prec', nome: J.nome }); }
    else if(m.t === 'pleave'){ tiraDoGrupo(J.sid, J, 'saiu'); }
    else if(m.t === 'pkick'){ const g = grupoDe(J); if(g && g.lider === J.sid){ const alvo = [...g.membros].find(([sid, mm]) => mm.J && mm.J.id === (m.to | 0)); if(alvo && alvo[0] !== J.sid) tiraDoGrupo(alvo[0], alvo[1].J, 'expulso'); } }
    else if(m.t === 'dueldesiste' && J.duelo && !J.duelo.fim){ const V = c.jog.get(J.duelo.com); fimDuelo(c, J, V, 'desistiu'); }
  });
  ws.on('close', () => {
    clearInterval(lim);
    if(J && c){
      if(J.duelo && !J.duelo.fim){ const V = c.jog.get(J.duelo.com); fimDuelo(c, J, V, 'saiu'); if(V) V.duelo = null; }
      const gg = grupoDe(J); if(gg){ const mm = gg.membros.get(J.sid); if(mm && mm.J === J){ mm.J = null; mm.ausente = agora(); envieGrupo(gg); } }          /* grupo guarda o lugar por 90 s */
      c.jog.delete(J.id); difunde(c, { t: 'l', id: J.id }); console.log(`- ${J.nome} ${c.mapa} canal ${c.n} [${c.jog.size}/${CAP}]`);
    }
  });
  ws.on('error', () => {});
});
setInterval(() => { wss.clients.forEach(ws => { if(!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 15000);

/* ---- laco do servidor: reaparecimento, duelos e fotos do mundo (so quem esta perto, ate AOI m) ---- */
let tick = 0;
setInterval(() => {
  tick++; const t = agora();
  for(const c of todosCanais()){
    for(const J of c.jog.values()){
      if(J.morto && t - J.tMorte >= RESP_S){ const sp = posSpawn(c, J); J.x = sp.x; J.z = sp.z; J.hp = J.pmax; J.morto = false; J.imune = t + 2; difunde(c, { t: 'resp', id: J.id, x: r2(J.x), z: r2(J.z), hp: J.hp }); }
      const d = J.duelo;
      if(d){
        const V = c.jog.get(d.com);
        if(!d.fim && V && t >= d.inicio && Math.hypot(V.x - J.x, V.z - J.z) > DUELO_FUGA && !(V.duelo && V.duelo.fim)) fimDuelo(c, J, V, 'fugiu');
        if(d.fim && t >= d.reset){ J.hp = J.pmax; J.duelo = null; difunde(c, { t: 'resp', id: J.id, x: r2(J.x), z: r2(J.z), hp: J.hp, keep: 1 }); }       /* depois do duelo: vida cheia, sem teleporte */
        else if(!V) J.duelo = null;
      }
    }
    const lista = [...c.jog.values()];
    for(const A of lista){
      const p = []; for(const B of lista){ if(B === A) continue; if(Math.abs(B.x - A.x) > AOI || Math.abs(B.z - A.z) > AOI) continue; p.push([B.id, r2(B.x), r2(B.z), r2(B.f), B.a, B.hp, B.guarda ? 1 : 0, B.morto ? 1 : 0, B.ts]); }
      envia(A, { t: 's', n: tick, p });
    }
  }
}, TICK);

setInterval(() => {
  const t = agora();
  for(const g of [...grupos.values()]){
    for(const [sid, m] of [...g.membros]) if(!m.J && m.ausente && t - m.ausente > PARTY_GRACA) tiraDoGrupo(sid, null, 'ausente');
    if(grupos.has(g.id)) envieGrupo(g);
  }
}, 1000);

srv.listen(PORT, () => console.log(`${SERVE_STATIC ? '' : '[so jogo, sem arquivos] '}${ORIGINS.length ? '[origens: ' + ORIGINS.join(', ') + '] ' : ''}Servidor em http://localhost:${PORT}/selecao.html  |  canal: ${CAP} jogadores  |  mapas: cidade (duelo) e pvp (times)  |  dano x${PVP_MULT}  |  AOI ${AOI} m`));
