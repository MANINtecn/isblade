/* Teste automatico da progressao: node servidor/teste_progressao.js
   Sobe o servidor (porta 8012, dados em pasta temporaria), cria conta + personagem Mago, mata mobs, sobe de nivel, distribui/reseta pontos. */
'use strict';
const { spawn } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
let WebSocket; try { WebSocket = require('ws'); } catch (e) { WebSocket = require(path.join(__dirname, '..', 'prototipo', 'node_modules', 'ws')); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isb_prog_'));
const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], { env: Object.assign({}, process.env, { PORT: '8012', DATA_DIR: dir, NIVEL_INICIAL: '1' }), stdio: 'ignore' });
const esp = ms => new Promise(r => setTimeout(r, ms)); let falhas = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FALHA') + ' ' + msg); if(!c) falhas++; };
const B = 'http://localhost:8012';
const post = async (u, b, t) => (await fetch(B + u, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, t ? { authorization: 'Bearer ' + t } : {}), body: JSON.stringify(b) })).json();
const Prog = require('./progressao');
(async () => {
  await esp(900);
  const c = await post('/api/conta/criar', { user: 'teste' + (Date.now() % 100000), senha: '123456' }), tk = c.token;
  const r = await post('/api/personagens', { name: 'Mago1', race: 'magic_f', charType: 'magic_f', classe: 'mago' }, tk);
  ok(r.char && r.char.classe === 'mago' && r.char.weapon === 'staff', 'personagem Mago criado com cajado');
  const ws = new WebSocket('ws://localhost:8012/ws'); let ultProg = null, w = null;
  ws.on('message', d => { const m = JSON.parse(d); if(m.t === 'w') w = m; if(m.t === 'prog') ultProg = m; });
  await new Promise(res => ws.on('open', () => { ws.send(JSON.stringify({ t: 'join', tk, cid: r.char.id, mapa: 'masmorra' })); res(); })); await esp(400);
  ok(w && w.prog && w.prog.lvl === 1 && w.prog.pontos === 0 && w.prog.classe === 'mago' && w.prog.st.int === 20, 'ao entrar: nv 1, 0 pontos, classe mago, INT 20');
  const need1 = Prog.xpNeed(1), gan = Prog.xpAbate('normal', 'shade', 1), n = Math.ceil(need1 / gan);
  for(let i = 0; i < n; i++){ ws.send(JSON.stringify({ t: 'xp', tipo: 'shade', dif: 'normal' })); await esp(2100); }
  await esp(300);
  ok(ultProg && ultProg.lvl === 2 && ultProg.pontos === 2, `${n} sombras (${gan} xp cada) = nivel 2 com 2 pontos`);
  ok(Prog.xpAbate('campo', 'sapo_curuma', 20) < Prog.xpAbate('campo', 'sapo_curuma', 2) * 0.5, 'mob fraco demais da bem menos xp (penalidade por nivel)');
  ok(Prog.xpAbate('campo', 'formiga_fort', 14) > Prog.xpAbate('campo', 'stalker_curuma', 14), 'mob um pouco acima da mais xp (bonus)');
  ok(Prog.xpAbate('pantano', 'golem_lava', 40) < Prog.xpAbate('pantano', 'golem_lava', 62) * 0.2 && Prog.NIVEL_MAX() === 99, 'mob muito acima nao da power-level (penalidade acima do limite)');
  ws.send(JSON.stringify({ t: 'xp', tipo: 'arcanjo', dif: 'hard' })); await esp(2100); ok(ultProg.lvl === 2, 'tipo que nao e da DG por salas nao da xp por mensagem');
  ws.send(JSON.stringify({ t: 'xp', tipo: 'tipo_que_nao_existe', dif: 'normal' })); await esp(250);
  ok(ultProg.lvl === 2, 'tipo de mob desconhecido nao da xp');
  ws.send(JSON.stringify({ t: 'attr', v: { int: 5 } })); await esp(250);
  ok(ultProg.pontos === 2 && ultProg.attr.int === 0, 'gastar mais pontos do que tem e recusado');
  ws.send(JSON.stringify({ t: 'attr', v: { int: -3, vit: 5 } })); await esp(250);
  ok(ultProg.pontos === 2 && ultProg.attr.vit === 0, 'valor negativo e recusado');
  ws.send(JSON.stringify({ t: 'attr', v: { int: 1.5 } })); await esp(250);
  ok(ultProg.pontos === 2, 'valor quebrado e recusado');
  ws.send(JSON.stringify({ t: 'attr', v: { int: 1, agi: 1 } })); await esp(250);
  ok(ultProg.pontos === 0 && ultProg.attr.int === 1 && ultProg.attr.agi === 1 && ultProg.st.int === 20 + 1 + 1, 'distribuiu 1 INT + 1 AGI (INT 20 + 1 por nivel + 1 ponto = 22)');
  ws.send(JSON.stringify({ t: 'attrreset' })); await esp(250);
  ok(ultProg.pontos === 2 && ultProg.attr.int === 0 && ultProg.attr.agi === 0, 'reset devolve os 2 pontos (gratis)');
  ws.close(); await esp(200); srv.kill(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  console.log(falhas ? falhas + ' FALHA(S)' : 'tudo certo'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
