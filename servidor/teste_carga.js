/* Teste de CARGA: node servidor/teste_carga.js [bots=50] [segundos=60] [mapa=curuma]
   Sobe o servidor na porta 8012 (dados numa pasta temporaria), conecta N bots no mesmo canal de um mapa aberto, cada um anda perto da entrada
   e bate no mob do servidor mais perto (como um jogador caçando). Mede: intervalo entre snapshots (alvo 83 ms = 12/s), bytes por jogador por segundo,
   CPU e memoria do servidor, mobs vistos e abates. Criterio do beta: 50 jogadores por canal sem travar. */
'use strict';
const { spawn } = require('child_process'), path = require('path'), os = require('os'), fs = require('fs');
let WebSocket; try { WebSocket = require('ws'); } catch (e) { WebSocket = require(path.join(__dirname, '..', 'prototipo', 'node_modules', 'ws')); }
const N = +process.argv[2] || 50, SEG = +process.argv[3] || 60, MAPA = process.argv[4] || 'curuma';
const SPAWN = { curuma: [-50, 12], fortress: [0, 27], pantano: [14.9, -43.9] }[MAPA];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isblade_carga_'));
const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: '8012', AUTH: '0', DATA_DIR: dir, METRICAS: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
let errSrv = '', metr = []; srv.stderr.on('data', d => { errSrv += d; }); srv.stdout.on('data', d => { String(d).split(String.fromCharCode(10)).forEach(l => { if(l.indexOf('[metricas]') >= 0) metr.push(l.trim()); }); });
const esp = ms => new Promise(r => setTimeout(r, ms));
function bot(i){
  return new Promise(res => {
    const ws = new WebSocket('ws://localhost:8012/ws'), b = { i, ws, id: 0, x: SPAWN[0] + (Math.random() - .5) * 20, z: SPAWN[1] + (Math.random() - .5) * 20, f: 0, ts: [], bytes: 0, mobs: [], golpes: 0, dano: 0, send: o => { if(ws.readyState === 1) ws.send(JSON.stringify(o)); } };
    ws.on('open', () => b.send({ t: 'join', nome: 'Bot' + i, raca: 'human_fighter', arma: 'sword', pmax: 400, mapa: MAPA, x: b.x, z: b.z }));
    ws.on('message', d => { b.bytes += d.length; const m = JSON.parse(d); if(m.t === 'w'){ b.id = m.id; b.canal = m.canal; res(b); } else if(m.t === 's') b.ts.push(Date.now()); else if(m.t === 'ms') b.mobs = m.m; else if(m.t === 'mdmg'){ b.golpes++; b.dano += m.dmg; } });
    ws.on('error', () => res(b));
  });
}
(async () => {
  await esp(900);
  const bots = []; for(let i = 0; i < N; i++){ bots.push(await bot(i)); await esp(20); }
  console.log(N + ' bots conectados no mapa ' + MAPA + '; canais: ' + [...new Set(bots.map(b => b.canal))].join(','));
  const cpu0 = process.cpuUsage(), t0 = Date.now(); let cpuSrv = [];
  bots.forEach(b => { b.ts = []; b.bytes = 0; });
  const tMov = setInterval(() => { for(const b of bots){
    const vivos = b.mobs.filter(m => !m[9]); let alvo = null, bd = 1e9; for(const m of vivos){ const d = Math.hypot(m[2] - b.x, m[3] - b.z); if(d < bd){ bd = d; alvo = m; } }
    if(alvo && bd > 2.5 && bd < 30){ const k = Math.min(bd - 2, .4); b.x += (alvo[2] - b.x) / bd * k; b.z += (alvo[3] - b.z) / bd * k; b.f = Math.atan2(alvo[2] - b.x, alvo[3] - b.z); }
    else if(!alvo){ b.x += (Math.random() - .5) * .4; b.z += (Math.random() - .5) * .4; }
    b.send({ t: 'st', x: Math.round(b.x * 100) / 100, z: Math.round(b.z * 100) / 100, f: b.f, a: 'run', g: 0, w: 'sword', ts: 1, h: 400 });
    if(alvo && bd < 4 && Math.random() < .25) b.send({ t: 'mhit', id: alvo[0], d: 12 + Math.random() * 10 });
  } }, 100);
  const tCpu = setInterval(() => { try { const s = require('child_process').execSync('powershell -NoProfile -Command "(Get-Process -Id ' + srv.pid + ').CPU;(Get-Process -Id ' + srv.pid + ').WorkingSet64"').toString().trim().split(/\s+/).map(v => +v.replace(',', '.')); cpuSrv.push([Date.now(), s[0], s[1]]); } catch(e){} }, 5000);
  await esp(SEG * 1000); clearInterval(tMov); clearInterval(tCpu);
  const dur = (Date.now() - t0) / 1000;
  const ints = []; bots.forEach(b => { for(let k = 1; k < b.ts.length; k++) ints.push(b.ts[k] - b.ts[k - 1]); }); ints.sort((a, b) => a - b);
  const p = q => ints[Math.min(ints.length - 1, Math.floor(ints.length * q))] || 0, med = ints.reduce((s, v) => s + v, 0) / (ints.length || 1);
  const kb = bots.reduce((s, b) => s + b.bytes, 0) / bots.length / dur / 1024;
  console.log('snapshots: media ' + med.toFixed(0) + ' ms, p95 ' + p(.95) + ' ms, p99 ' + p(.99) + ' ms, max ' + p(1) + ' ms (alvo 83 ms)');
  console.log('rede: ' + kb.toFixed(1) + ' KB/s por jogador (download)  |  mobs vistos por bot (media): ' + (bots.reduce((s, b) => s + b.mobs.length, 0) / bots.length).toFixed(1));
  console.log('golpes de mob recebidos: ' + bots.reduce((s, b) => s + b.golpes, 0) + '  |  bots com golpes: ' + bots.filter(b => b.golpes).length);
  if(cpuSrv.length > 1){ const a = cpuSrv[0], z = cpuSrv[cpuSrv.length - 1]; console.log('servidor: CPU ' + ((z[1] - a[1]) / ((z[0] - a[0]) / 1000) * 100).toFixed(1) + '% de 1 nucleo  |  memoria ' + (z[2] / 1048576).toFixed(0) + ' MB'); }
  metr.forEach(l => console.log('servidor ' + l));
  if(errSrv) console.log('ERROS DO SERVIDOR:\n' + errSrv.slice(0, 1500));
  bots.forEach(b => b.ws.close()); srv.kill(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch(e){}
  process.exit(0);
})();
