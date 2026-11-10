/* Teste da DG da Torre simulada no SERVIDOR com 2 jogadores em grupo (10/11/2026): node servidor/teste_dg_grupo.js [dificuldade=normal]
   Sobe o servidor na porta 8013 (dados temporarios, sem contas), forma o grupo na cidade, os dois entram na masmorra, o lider inicia e o convidado mata os mobs.
   Confere: os dois veem os MESMOS mobs; o contador de abates chega aos dois; o andar limpa (clear) para os dois; quem matou foi o convidado (o lider nao comanda mais nada). */
'use strict';
const { spawn } = require('child_process'), path = require('path'), os = require('os'), fs = require('fs');
let WebSocket; try { WebSocket = require('ws'); } catch (e) { WebSocket = require(path.join(__dirname, '..', 'prototipo', 'node_modules', 'ws')); }
const DIF = process.argv[2] || 'normal';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isblade_dg_'));
const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: '8013', AUTH: '0', DATA_DIR: dir }), stdio: ['ignore', 'pipe', 'pipe'] });
let errSrv = ''; srv.stderr.on('data', d => { errSrv += d; });
const esp = ms => new Promise(r => setTimeout(r, ms));
function cli(nome, sid, mapa){
  return new Promise(res => {
    const ws = new WebSocket('ws://localhost:8013/ws'), b = { nome, sid, ws, id: 0, x: 0, z: 6, y: 0, mobs: [], dgs: [], ev: [], send: o => { if(ws.readyState === 1) ws.send(JSON.stringify(o)); } };
    ws.on('open', () => b.send({ t: 'join', nome, sid, raca: 'human_fighter', arma: 'sword', pmax: 4000, mapa, x: 0, z: 6 }));
    ws.on('message', d => { const m = JSON.parse(d); if(m.t === 'w'){ b.id = m.id; b.canal = m.canal; res(b); } else if(m.t === 'ms') b.mobs = m.m; else if(m.t === 'dgs') b.dgs.push(m); else if(m.t === 'mdmg') b.dmgRec = (b.dmgRec || 0) + 1; else if(m.t === 'preq') b.preq = m; else if(m.t === 'party') b.party = m; });
    ws.on('error', () => res(b));
  });
}
const falha = (msg) => { console.log('FALHOU: ' + msg + (errSrv ? '\nstderr: ' + errSrv.slice(0, 400) : '')); srv.kill(); process.exit(1); };
(async () => {
  await esp(1200);
  let A = await cli('Lider', 'sa', 'cidade'), B = await cli('Convidado', 'sb', 'cidade');
  if(A.canal !== B.canal) return falha('os dois nao ficaram no mesmo canal da cidade');
  A.send({ t: 'pinvite', to: B.id }); await esp(400); if(!B.preq) return falha('o convidado nao recebeu o convite'); B.send({ t: 'pok' }); await esp(500);
  A.ws.close(); B.ws.close(); await esp(300);
  A = await cli('Lider', 'sa', 'masmorra'); B = await cli('Convidado', 'sb', 'masmorra');
  console.log('canal da masmorra: lider ' + A.canal + ', convidado ' + B.canal + (A.canal === B.canal ? ' (mesmo)' : ' (DIFERENTE!)'));
  if(A.canal !== B.canal) return falha('o grupo nao caiu no mesmo canal da masmorra');
  const SP = [-27.05, -50.71, -61.7]; const mover = (b, x, z, y) => b.send({ t: 'st', x, z, y, f: 0, a: 'run', g: 0, w: 'sword', ts: 1, h: 4000, pm: 4000 });
  A.send({ t: 'dg', k: 'start', key: DIF }); A.send({ t: 'dgs', k: 'ini', key: DIF }); await esp(300); B.send({ t: 'dgs', k: 'ini', key: DIF }); await esp(500);
  const okA = A.dgs.find(m => m.k === 'ok'), okB = B.dgs.find(m => m.k === 'ok');
  if(!okA || !okB) return falha('algum jogador nao recebeu o "ok" da DG: lider ' + !!okA + ', convidado ' + !!okB);
  console.log('ok: tot ' + okA.tot + ', meta ' + okA.meta + ', tempo ' + okA.tl + ' s');
  // os dois "andam" ate o ponto de entrada (o servidor limita a velocidade)
  for(let i = 0; i < 160; i++){ for(const b of [A, B]){ b.x += Math.max(-0.7, Math.min(0.7, SP[0] - b.x)); b.z += Math.max(-0.7, Math.min(0.7, SP[1] - b.z)); mover(b, b.x, b.z, SP[2]); } await esp(100); }
  await esp(800);
  const idsA = new Set(A.mobs.map(m => m[0])), idsB = new Set(B.mobs.map(m => m[0])); let iguais = idsA.size > 0 && idsA.size === idsB.size; for(const i of idsA) if(!idsB.has(i)) iguais = false;
  console.log('mobs vistos: lider ' + idsA.size + ', convidado ' + idsB.size + ' -> ' + (iguais ? 'OS MESMOS' : 'DIFERENTES'));
  if(!iguais) return falha('os dois jogadores veem mobs diferentes');
  // o CONVIDADO mata os mobs (o lider fica parado)
  let abates = 0, t0 = Date.now(), clearB = null, clearA = null;
  while(Date.now() - t0 < 240000){
    clearA = A.dgs.find(m => m.k === 'clear'); clearB = B.dgs.find(m => m.k === 'clear'); if(clearA && clearB) break;
    const vivos = B.mobs.filter(m => !m[9]); if(!vivos.length){ await esp(150); continue; }
    let alvo = vivos[0], bd = 1e9; for(const m of vivos){ const d = Math.hypot(m[2] - B.x, m[3] - B.z); if(d < bd){ bd = d; alvo = m; } }
    for(let k = 0; k < 60 && Math.hypot(alvo[2] - B.x, alvo[3] - B.z) > 6; k++){ const dx = alvo[2] - B.x, dz = alvo[3] - B.z, d = Math.hypot(dx, dz), p = Math.min(d - 5, 0.7); B.x += dx / d * p; B.z += dz / d * p; mover(B, B.x, B.z, SP[2]); await esp(100); }      /* ~7 m/s: abaixo do limite do servidor */
    mover(A, SP[0], SP[1], SP[2]); B.send({ t: 'mhit', id: alvo[0], d: 99999 }); abates++; await esp(220);
  }
  const ult = m => m.length ? m[m.length - 1] : null, eA = ult(A.dgs.filter(m => m.k === 'estado' || m.k === 'clear')), eB = ult(B.dgs.filter(m => m.k === 'estado' || m.k === 'clear'));
  console.log('golpes do convidado: ' + abates + ' | kr visto pelo lider ' + (eA && eA.kr) + ', pelo convidado ' + (eB && eB.kr) + ' | clear: lider ' + !!clearA + ', convidado ' + !!clearB);
  console.log('golpes de mob recebidos (mdmg): lider ' + (A.dmgRec || 0) + ', convidado ' + (B.dmgRec || 0));
  if(DIF === 'hard' && !(A.dmgRec > 0 || B.dmgRec > 0)) return falha('os mobs da DG nunca bateram no jogador (fere nao ligado?)');      /* na normal so 15% sao agressivos e o robo mata de longe: zero la e normal */
  if(!clearA || !clearB) return falha('o andar nao limpou para os dois');
  console.log('PASSOU: DG em grupo com mobs do servidor (dificuldade ' + DIF + ')'); srv.kill(); process.exit(0);
})();
