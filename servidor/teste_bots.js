/* Teste automatico do servidor: node servidor/teste_bots.js  (sobe o servidor na porta 8011 com canal de 2 jogadores e confere as regras) */
'use strict';
const { spawn } = require('child_process'), path = require('path');
let WebSocket; try { WebSocket = require('ws'); } catch (e) { WebSocket = require(path.join(__dirname, '..', 'prototipo', 'node_modules', 'ws')); }
const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: '8011', CAP: '2', PVP_MULT: '0.4' }), stdio: 'ignore' });
const esp = ms => new Promise(r => setTimeout(r, ms)); let falhas = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + msg); if(!c) falhas++; };
function bot(nome, extra){
  return new Promise(res => { const ws = new WebSocket('ws://localhost:8011/ws'), b = { ws, nome, ev: [], snap: null, w: null, send: o => ws.send(JSON.stringify(o)) };
    ws.on('open', () => b.send(Object.assign({ t: 'join', nome, raca: 'fighter', arma: 'shield', pmax: 100 }, extra || {})));
    ws.on('message', d => { const m = JSON.parse(d); if(m.t === 'w') { b.w = m; res(b); } else if(m.t === 's') b.snap = m; else b.ev.push(m); }); });
}
const pos = (b, x, z, f, g, a) => b.send({ t: 'st', x, z, f, a: a || 'idle', g: g ? 1 : 0, w: 'shield', ts: 1 });
const hits = b => b.ev.filter(e => e.t === 'hit');
(async () => {
  await esp(700);
  /* ---------- CIDADE: zona segura + duelo ---------- */
  const A = await bot('Ana'), B = await bot('Beto'), C = await bot('Caio');
  ok(A.w.canal === 1 && B.w.canal === 1 && C.w.canal === 2 && A.w.mapa === 'cidade', `canais da cidade: Ana/Beto no ${A.w.canal}, Caio (canal cheio) no ${C.w.canal}`);
  ok(B.w.jog.length === 1, 'Beto ve a Ana ao entrar');
  const P = B.w.eu; pos(B, P.x, P.z, Math.PI); pos(A, P.x, P.z - 2, 0); await esp(300); pos(A, P.x, P.z - 2, 0); await esp(100);
  A.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); await esp(250);
  ok(hits(B).length === 0, 'cidade e zona segura: ataque sem duelo nao fere');
  A.send({ t: 'duel', to: B.w.id }); await esp(250); const req = B.ev.find(e => e.t === 'duelreq');
  ok(!!req && req.de === A.w.id, 'Beto recebe o desafio de duelo da Ana');
  B.send({ t: 'duelok' }); await esp(250); ok(!!A.ev.find(e => e.t === 'duelstart') && !!B.ev.find(e => e.t === 'duelstart'), 'duelo aceito: os dois (e a sala) recebem o inicio');
  B.ev.length = 0; await esp(150); A.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); await esp(200);
  ok(hits(B).length === 0, 'durante a contagem de 3 s ninguem fere');
  await esp(3000); pos(A, P.x, P.z - 2, 0); pos(B, P.x, P.z, Math.PI); await esp(150); B.ev.length = 0;
  A.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); await esp(250); let h = hits(B)[0];
  ok(!!h && h.d > 0 && h.hp === 100 - h.d, `depois da contagem o ataque acerta (dano ${h && h.d}, vida ${h && h.hp})`);
  B.ev.length = 0; A.send({ t: 'atk', k: 'b', id: 'sweep', f: Math.PI }); await esp(250); ok(hits(B).length === 0, 'ataque virado para o lado errado nao acerta');
  B.ev.length = 0; await esp(250); A.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); A.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); await esp(250);
  ok(hits(B).length === 1, 'intervalo minimo entre ataques basicos (2 seguidos = 1 acerto)');
  B.send({ t: 'roll' }); await esp(60); B.ev.length = 0; await esp(250); A.send({ t: 'atk', k: 'b', id: 'thrust', f: 0 }); await esp(120);
  ok(hits(B).length === 0, 'esquiva (imunidade) evita o golpe');
  await esp(400); B.ev.length = 0; pos(B, P.x, P.z, Math.PI, 1, 'guard'); await esp(150); A.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); await esp(250);
  h = hits(B)[0]; ok(!!h && h.b === 1 && h.d <= 6, `guarda de frente reduz o dano (${h && h.d}, bloqueio=${h && h.b})`);
  pos(B, P.x, P.z, Math.PI, 0); await esp(100); B.ev.length = 0;
  for(let i = 0; i < 14 && !B.ev.find(e => e.t === 'duelend'); i++){ A.send({ t: 'atk', k: 'b', id: 'spin', f: 0 }); await esp(260); }
  const fim = B.ev.find(e => e.t === 'duelend'); ok(!!fim && fim.nv === 'Ana' && fim.nl === 'Beto', 'duelo termina com vencedora Ana');
  ok(!B.ev.find(e => e.t === 'die') && (hits(B).pop() || { hp: 1 }).hp >= 1, 'no duelo ninguem morre (vida minima 1)');
  B.ev.length = 0; await esp(3600); ok(!!B.ev.find(e => e.t === 'resp' && e.keep && e.hp === 100), 'depois do duelo: vida cheia, sem teleporte');
  [A, B, C].forEach(b => b.ws.close()); await esp(200);

  /* ---------- MAPA PVP: times, sem fogo amigo, morte, skills ---------- */
  const T1 = await bot('Time1', { mapa: 'pvp' }), T2 = await bot('Time2', { mapa: 'pvp' });
  ok(T1.w.mapa === 'pvp' && T1.w.eu.team === 'A' && T2.w.eu.team === 'B', `mapa pvp: times equilibrados (${T1.w.eu.team} e ${T2.w.eu.team})`);
  const T3 = await bot('Time3', { mapa: 'pvp' }); ok(T3.w.canal === 2, 'mapa pvp tambem divide em canais'); T3.ws.close();
  for(let i = 0; i < 16; i++){ pos(T1, 0, 0, 0); pos(T2, 0, 2, Math.PI); await esp(150); }       // os times nascem a 26 m: caminham ate o meio (o servidor limita a velocidade)
  T2.ev.length = 0;
  T1.send({ t: 'atk', k: 'b', id: 'sweep', f: 0 }); await esp(250); ok(hits(T2).length === 1, 'times diferentes se ferem sem duelo');
  T1.ev.length = 0; T2.send({ t: 'atk', k: 's', i: 5, f: Math.PI, p: 1 }); await esp(150); T2.send({ t: 'atk', k: 's', i: 5, f: Math.PI, p: 2 }); await esp(250);
  ok(hits(T1).length === 2, 'skill de 2 golpes (Arremesso): as duas partes acertam, uma recarga so');
  T1.ev.length = 0; await esp(100); T2.send({ t: 'atk', k: 's', i: 5, f: Math.PI, p: 1 }); await esp(250); ok(hits(T1).length === 0, 'skill em recarga e recusada');
  for(let i = 0; i < 12 && !T1.ev.find(e => e.t === 'die'); i++){ T2.send({ t: 'atk', k: 'b', id: 'spin', f: Math.PI }); await esp(260); }
  const die = T1.ev.find(e => e.t === 'die'); ok(!!die && die.nv === 'Time1' && die.na === 'Time2', 'no mapa pvp a morte e de verdade e anunciada');
  T1.ev.length = 0; await esp(4300); ok(!!T1.ev.find(e => e.t === 'resp' && e.hp === 100 && !e.keep), 'reaparece com vida cheia depois de ~4 s');
  const cur = T2.snap.p.find(p => p[0] === T1.w.id); const antes = cur ? cur[1] : 0;
  await esp(5200); T1.send({ t: 'st', x: antes + 400, z: 0, f: 0, a: 'run', g: 0, w: 'shield', ts: 1 }); await esp(300);
  const dep = T2.snap.p.find(p => p[0] === T1.w.id); const salto = dep ? Math.abs(dep[1] - antes) : 999;
  ok(salto < 9, `teleporte de 400 m depois de ficar parado limitado (andou so ${Math.round(salto)} m)`);
  [T1, T2].forEach(b => b.ws.close()); await esp(300);

  /* ---------- GRUPO (party): convite, aceite, hp, expulsar, sair, reconexao com a mesma sessao, mesmo time no PvP ---------- */
  const G1 = await bot('Gil', { sid: 'sG1' }), G2 = await bot('Gal', { sid: 'sG2' });
  const part = b => b.ev.filter(e => e.t === 'party').pop();
  G1.send({ t: 'pinvite', to: G2.w.id }); await esp(250); ok(!!G2.ev.find(e => e.t === 'preq' && e.de === G1.w.id), 'convite de grupo chega ao convidado');
  G2.send({ t: 'pok' }); await esp(350); let pt = part(G1);
  ok(!!pt && pt.m.length === 2 && pt.lider === 'sG1' && pt.m.every(x => x.on), 'grupo criado com 2 membros online e Gil de lider');
  G1.ev.length = 0; await esp(1200); ok(!!part(G1), 'estado do grupo (vida) e reenviado a cada segundo');
  G2.ws.close(); await esp(400); pt = part(G1); ok(!!pt && pt.m.length === 2 && pt.m.some(x => x.sid === 'sG2' && !x.on), 'quem cai continua no grupo (offline) por 90 s');
  const G2b = await bot('Gal', { sid: 'sG2' }); await esp(350); pt = part(G2b); ok(!!pt && pt.m.length === 2 && pt.m.every(x => x.on), 'voltando com a mesma sessao, Gal reata o grupo');
  G1.close; G1.ws.close(); await esp(200); G2b.ev.length = 0;
  const H1 = await bot('Hex', { sid: 'sH1', mapa: 'pvp' }), H2 = await bot('Hux', { sid: 'sH2', mapa: 'pvp' });                      // fora de grupo: times equilibrados (A e B)
  ok(H1.w.eu.team !== H2.w.eu.team, 'sem grupo, o servidor equilibra os times');
  [H1, H2, G2b].forEach(b => b.ws.close()); await esp(300);
  const P1 = await bot('Pri', { sid: 'sP1' }), P2 = await bot('Pru', { sid: 'sP2' }); P1.send({ t: 'pinvite', to: P2.w.id }); await esp(200); P2.send({ t: 'pok' }); await esp(300);
  P1.ws.close(); P2.ws.close(); await esp(300);
  const Q1 = await bot('Pri', { sid: 'sP1', mapa: 'pvp' }), Q2 = await bot('Pru', { sid: 'sP2', mapa: 'pvp' });
  ok(Q1.w.canal === Q2.w.canal && Q1.w.eu.team === Q2.w.eu.team, `colegas de grupo caem no mesmo canal e no MESMO time no PvP (${Q1.w.eu.team}/${Q2.w.eu.team})`);
  Q1.send({ t: 'pleave' }); await esp(300); ok(!!Q2.ev.find(e => e.t === 'partyfim'), 'sair do grupo: com 1 membro o grupo se desfaz');
  [Q1, Q2].forEach(b => b.ws.close()); srv.kill();
  console.log(falhas ? falhas + ' FALHA(S)' : 'tudo certo'); process.exit(falhas ? 1 : 0);
})();
