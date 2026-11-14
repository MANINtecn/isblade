/* Teste dos chefes Nv 20 (servidor/mobs_mundo.js -> iaChefe): um jogador falso parado ao lado de cada chefe por 60 s.
   Uso: node servidor/teste_chefes.js (nao precisa do servidor ligado) */
const path = require('path');
const Mobs = require(path.join(__dirname, 'mobs_mundo.js'));
const SP = require(path.join(__dirname, '..', 'prototipo', 'data', 'spots.json')), DG = require(path.join(__dirname, '..', 'prototipo', 'data', 'dungeon.json'));
let falhas = 0; const ok = (c, txt) => { console.log((c ? 'PASSOU ' : 'FALHOU ') + txt); if(!c) falhas++; };
const W = Mobs.mundoAberto(); const teles = [], danos = [], avisos = [];
W.tele = o => teles.push(o); W.fere = (Q, ev) => danos.push(ev); W.aviso = x => avisos.push(x); W.tiro = () => {};
for(const s of SP.mundo.spots.filter(q => q.chefe && q.resp < 200)){
  teles.length = 0; danos.length = 0;
  const J = { id: 7, x: s.x + 2.5, z: s.z, y: s.h, hp: 100 }; let t = 1000, m = null, dentro = 0, fora = 0;
  for(let i = 0; i < 20 * 60; i++){ t += .05; W.tick(t, .05, [J]);
    if(!m){ for(const sub of W.subs) for(const o of sub.mobs.values()) if(o.tipo === s.tipo) m = o; if(!m && i < 40){ J.x = s.x + 12; continue; } if(m){ J.x = m.x + 2.5; J.z = m.z; } }
    if(m && i % 100 === 99){ J.x = m.x + (i % 200 === 99 ? 7 : 2.5); J.z = m.z + 1; }        /* troca de distancia: perto e longe */
  }
  ok(!!m, s.tipo + ': nasceu no spot ' + s.x + ',' + s.z);
  if(!m) continue;
  const nomes = {}; teles.forEach(o => { nomes[o.n] = (nomes[o.n] || 0) + 1; });
  ok(teles.length >= 15, s.tipo + ': ' + teles.length + ' avisos de marca em 60 s ' + JSON.stringify(nomes));
  ok(Object.keys(nomes).length === DG.mobs[s.tipo].golpes.length, s.tipo + ': usou todos os ' + DG.mobs[s.tipo].golpes.length + ' golpes');
  ok(danos.length > 0 && danos.every(e => e.z && e.dmg > 0), s.tipo + ': ' + danos.length + ' golpes acertaram o jogador parado (dano ' + [...new Set(danos.map(e => e.dmg))].join('/') + ')');
  ok(teles.every(o => o.L.every(q => q[8] >= .4 && q[8] <= 1.2)), s.tipo + ': toda marca da entre 0,4 e 1,2 s para sair');
  ok(Math.hypot(m.x - m.hx, m.z - m.hz) <= 26, s.tipo + ': ficou dentro do limite de casa (' + Math.hypot(m.x - m.hx, m.z - m.hz).toFixed(1) + ' m)');
  /* a marca confere com a geometria: ponto bem fora nao esta dentro */
  const sub = W.subs.find(x => x.mobs.has(m.id));
  ok(sub.dentroMarca({ k: 'rect', x: 0, z: 0, ang: 0, a: 10, b: 2 }, 0, 5, 0) && !sub.dentroMarca({ k: 'rect', x: 0, z: 0, ang: 0, a: 10, b: 2 }, 2, 5, 0) && !sub.dentroMarca({ k: 'rect', x: 0, z: 0, ang: 0, a: 10, b: 2 }, 0, -3, 0), 'rect: dentro/fora');
  ok(sub.dentroMarca({ k: 'cone', x: 0, z: 0, ang: 1.5708, a: 5, b: .7 }, 3, 0, 0) && !sub.dentroMarca({ k: 'cone', x: 0, z: 0, ang: 1.5708, a: 5, b: .7 }, -3, 0, 0) && !sub.dentroMarca({ k: 'cone', x: 0, z: 0, ang: 1.5708, a: 5, b: .7 }, 6, 0, 0), 'cone: dentro/fora');
  /* matar: hit ate cair, e conferir que volta em ~90 s */
  let morto = null, n = 0; while(!morto && n++ < 100) morto = W.hit(J, m.id, 200, t);
  ok(!!morto && n >= 10, s.tipo + ': caiu com ' + n + ' golpes de 200 (vida ' + m.max + ', armadura)');
  let voltou = 0; for(let i = 0; i < 20 * 130 && !voltou; i++){ t += .05; W.tick(t, .05, [{ id: 7, x: s.x + 14, z: s.z, y: s.h, hp: 100 }]); for(const x of sub.mobs.values()) if(x.tipo === s.tipo && !x.morto) voltou = i * .05; }
  ok(voltou > 60 && voltou < 125, s.tipo + ': voltou em ' + voltou.toFixed(0) + ' s');
}
ok(avisos.length === 0, 'chefe de volta rapida nao anuncia no canal (' + avisos.length + ' avisos)');
console.log(falhas ? 'FALHAS: ' + falhas : 'TUDO PASSOU'); process.exit(falhas ? 1 : 0);
