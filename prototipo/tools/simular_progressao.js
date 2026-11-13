/* Simulador de progressao (fase 6 adiantada): le data/progressao.json e mostra abates/horas para cada nivel e quando cada skill libera.
   Uso: node tools/simular_progressao.js [abatesPorHora=240]   — medir ANTES de mexer nos numeros. */
const fs = require('fs'), path = require('path');
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'progressao.json'), 'utf8')), C = P.curvaXp;
const rate = +process.argv[2] || 240;
const abates = L => Math.max(C.abatesMin, C.abatesBase * Math.pow(L / C.abatesRef, C.expoente));
const xpMob = L => C.xpMobBase + C.xpMobPorNivel * L;
const xpNivel = L => Math.round(abates(L) * xpMob(L));
let cum = 0, cumXp = 0; const tab = {};
for(let L = 1; L < P.nivelMax; L++){ cum += abates(L); cumXp += xpNivel(L); tab[L + 1] = { abates: cum, xp: cumXp }; }
tab[1] = { abates: 0, xp: 0 };
const h = L => (tab[L].abates / rate);
const fmt = x => x < 1 ? Math.round(x * 60) + ' min' : x < 48 ? x.toFixed(1) + ' h' : (x / 24).toFixed(1) + ' dias de jogo (24h)';
console.log('abates/hora =', rate, ' | pontos por nivel =', P.pontosPorNivel, ' | pontos no nivel max =', P.pontosPorNivel * (P.nivelMax - 1));
console.log('\nNIVEL  abates p/ subir  XP p/ subir     abates acum.   tempo acumulado');
[2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 99, 100, 150, 200, 250, 300, 350, 400].filter(L => L <= P.nivelMax).forEach(L => {
  const up = L < P.nivelMax ? Math.round(abates(L)) : '-', xp = L < P.nivelMax ? xpNivel(L) : '-';
  console.log(String(L).padStart(5), String(up).padStart(15), String(xp).padStart(13), String(Math.round(tab[L].abates)).padStart(15), '  ', fmt(h(L)));
});
console.log('\nSKILLS (quando libera, no ritmo acima):');
for(const cl in P.skillsNivel){ if(cl[0] === '_') continue; const o = P.skillsNivel[cl]; console.log(' ' + cl + ': ' + Object.keys(o).map(s => 'slot' + s + '=Nv' + o[s]).sort((a, b) => +a.split('Nv')[1] - +b.split('Nv')[1]).join(', ') + '  -> todas as 6 em ' + fmt(h(Math.max(...Object.values(o)))) ); }
console.log(' variantes: ' + Object.keys(P.variantesNivel).filter(k => k[0] !== '_').map(k => 'tipo' + k + '=Nv' + P.variantesNivel[k] + ' (' + fmt(h(P.variantesNivel[k])) + ')').join(', '));
