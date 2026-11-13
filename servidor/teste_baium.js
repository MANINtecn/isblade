/* Teste da luta do BAIUM no SERVIDOR (10/11/2026): node servidor/teste_baium.js [dificuldade=duelo]
   Dois jogadores entram na masmorra, vao ao salao do Baium, pedem a luta (dgs baium) e: recebem os snapshots do chefe (bsnap), levam dano (mdmg) e raios (bolt), um bate no chefe (bhit)
   e a luta termina com a vida dele em zero (dead no bsnap) para os dois. Confere a vida inicial pela dificuldade (1800 x bossHp). */
'use strict';
const { spawn } = require('child_process'), path = require('path'), os = require('os'), fs = require('fs');
let WebSocket; try { WebSocket = require('ws'); } catch (e) { WebSocket = require(path.join(__dirname, '..', 'prototipo', 'node_modules', 'ws')); }
const DIF = process.argv[2] || 'duelo', ESPERADO = { duelo: 1886, normal: 9068, medio: 15466, hard: 24635 }[DIF]      /* [auditoria 13/11] Baium na escala do nivel (baium.js): duelo com bot Nv 1; DG 85 / 92 / 99 */;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isblade_baium_'));
const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: '8014', AUTH: '0', DATA_DIR: dir }), stdio: ['ignore', 'pipe', 'pipe'] });
let errSrv = ''; srv.stderr.on('data', d => { errSrv += d; });
const esp = ms => new Promise(r => setTimeout(r, ms));
function cli(nome, sid, mapa){
  return new Promise(res => {
    const ws = new WebSocket('ws://localhost:8014/ws'), b = { nome, sid, ws, id: 0, x: 0, z: 6, y: 0, bs: [], mdmg: [], bolts: [], dgs: [], send: o => { if(ws.readyState === 1) ws.send(JSON.stringify(o)); } };
    ws.on('open', () => b.send({ t: 'join', nome, sid, raca: 'human_fighter', arma: 'sword', pmax: 9000, mapa, x: 0, z: 6 }));
    ws.on('message', d => { const m = JSON.parse(d); if(m.t === 'w'){ b.id = m.id; b.canal = m.canal; res(b); } else if(m.t === 'preq') b.preq = m; else if(m.t === 'dgs'){ if(m.k === 'bsnap') b.bs.push(m); else b.dgs.push(m); } else if(m.t === 'dg'){ if(m.k === 'mdmg') b.mdmg.push(m); else if(m.k === 'bolt') b.bolts.push(m); } });
    ws.on('error', () => res(b));
  });
}
const falha = msg => { console.log('FALHOU: ' + msg + (errSrv ? '\nstderr: ' + errSrv.slice(0, 400) : '')); srv.kill(); process.exit(1); };
(async () => {
  await esp(1200);
  let A = await cli('Lider', 'sa', 'cidade'), B = await cli('Outro', 'sb', 'cidade');
  A.send({ t: 'pinvite', to: B.id }); await esp(400); if(!B.preq) return falha('sem convite de grupo'); B.send({ t: 'pok' }); await esp(500);
  A.ws.close(); B.ws.close(); await esp(300);
  A = await cli('Lider', 'sa', 'masmorra'); B = await cli('Outro', 'sb', 'masmorra'); if(A.canal !== B.canal) return falha('canais diferentes');
  const alvo = [-28.4, -53.85 + 12, -3.5], mover = b => { b.x += Math.max(-.7, Math.min(.7, alvo[0] - b.x)); b.z += Math.max(-.7, Math.min(.7, alvo[1] - b.z)); b.send({ t: 'st', x: b.x, z: b.z, y: alvo[2], f: 0, a: 'idle', g: 0, w: 'sword', ts: 1, h: 9000, pm: 9000 }); };
  for(let i = 0; i < 120; i++){ mover(A); mover(B); await esp(100); }      /* andam ate o salao (o servidor limita a velocidade) */
  A.send({ t: 'dgs', k: 'baium', dif: DIF, novo: 1, x: -28.4, z: -59.85 }); await esp(300); B.send({ t: 'dgs', k: 'baium', dif: DIF, x: -28.4, z: -59.85 }); await esp(500);
  const okA = A.dgs.find(m => m.k === 'bok'), okB = B.dgs.find(m => m.k === 'bok');
  if(!okA || !okB) return falha('algum jogador nao recebeu o bok: lider ' + !!okA + ', outro ' + !!okB);
  console.log('bok: vida ' + okA.hp + '/' + okA.mx + ' (esperado ' + ESPERADO + ')'); if(okA.mx !== ESPERADO) return falha('vida do Baium diferente do esperado');
  // luta por 40 s: os dois ficam perto do chefe (so andam para perto)
  let t0 = Date.now(); while(Date.now() - t0 < 40000){ mover(A); mover(B); await esp(100); }
  const u = A.bs[A.bs.length - 1], v = B.bs[B.bs.length - 1];
  console.log('snapshots: lider ' + A.bs.length + ', outro ' + B.bs.length + ' | chefe em (' + u.ex + ', ' + u.ez + ') estado ' + u.st + ' | os dois veem a mesma posicao? ' + (Math.abs(u.ex - v.ex) < 3 && Math.abs(u.ez - v.ez) < 3));
  console.log('dano recebido (mdmg): lider ' + A.mdmg.length + ', outro ' + B.mdmg.length + ' | raios (bolt) vistos: ' + A.bolts.length + ' | ataques vistos: ' + [...new Set(A.bs.map(s => s.ak).filter(Boolean))].join(','));
  if(!A.bs.length || !B.bs.length) return falha('sem snapshots');
  if(!(A.mdmg.length + B.mdmg.length > 0)) return falha('o Baium nunca bateu em ninguem em 40 s');
  // golpes: guarda quebra e lancamento
  const hp0 = u.hp; B.send({ t: 'dgs', k: 'bhit', d: 100, gd: 40, l: 1 }); await esp(500); const w = B.bs[B.bs.length - 1];
  console.log('apos 1 golpe (100 de dano, lancamento): hp ' + hp0 + ' -> ' + w.hp + ' | estado ' + w.st + ' ey ' + w.ey);
  if(w.hp >= hp0) return falha('o golpe nao tirou vida');
  // morte
  for(let i = 0; i < Math.ceil(ESPERADO / 6000) + 1; i++){ B.send({ t: 'dgs', k: 'bhit', d: 6000, gd: 6, l: 0 }); await esp(150); } await esp(600);      /* bate ate cair (vida agora passa de 6000) */
  const f1 = A.bs[A.bs.length - 1], f2 = B.bs[B.bs.length - 1];
  console.log('final: lider dead=' + f1.dead + ' hp ' + f1.hp + ' | outro dead=' + f2.dead + ' hp ' + f2.hp);
  if(!f1.dead || !f2.dead) return falha('a morte do Baium nao chegou aos dois');
  console.log('PASSOU: luta do Baium no servidor (dificuldade ' + DIF + ')'); srv.kill(); process.exit(0);
})();
