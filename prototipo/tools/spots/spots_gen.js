// escolhe centros de spot no chao alcancavel (saida do mapa_grid.js): faixas de distancia de caminho a partir da entrada
const fs = require('fs'), path = require('path');
const [, , dir, nome, cfgArq] = process.argv;
const j = JSON.parse(fs.readFileSync(path.join(dir, nome + '_walkgrid.json'), 'utf8'));
const SP = process.env.SAIDA, n = j.n, c = j.celula;
const rd = f => { const b = fs.readFileSync(path.join(SP, nome + '_walkgrid_' + f + '.bin')); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const D = rd('dist'), H = rd('h'), CFG = JSON.parse(fs.readFileSync(cfgArq, 'utf8'))[nome];
let seed = CFG.seed || 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pos = (ix, iz) => [+(j.x0 + (ix + .5) * c).toFixed(1), +(-(j.y0 + (iz + .5) * c)).toFixed(1)];
function plano(ix, iz, r){                                      // fracao alcancavel e plana num raio r (m)
  const h0 = H[iz * n + ix], k = Math.ceil(r / c); let tot = 0, ok = 0;
  for(let a = -k; a <= k; a++) for(let b = -k; b <= k; b++){ if(a * a + b * b > k * k) continue; tot++; const x = ix + a, z = iz + b; if(x < 0 || z < 0 || x >= n || z >= n) continue; const i = z * n + x; if(D[i] >= 0 && Math.abs(H[i] - h0) < 1.2) ok++; }
  return ok / tot;
}
const cand = []; for(let i = 0; i < n * n; i++) if(D[i] >= 0) cand.push(i);
const escolhidos = [], out = { dif: CFG.dif, respawn: CFG.respawn, ativa: CFG.ativa, solta: CFG.solta, spots: [] };
function pega(dmin, dmax, sep, r){
  for(let t = 0; t < 40000; t++){
    const i = cand[Math.floor(rnd() * cand.length)], dm = D[i] * c; if(dm < dmin || dm > dmax) continue;
    const ix = i % n, iz = Math.floor(i / n), p = pos(ix, iz);
    if(escolhidos.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < sep)) continue;
    if(plano(ix, iz, r + 1) < (CFG.plano || .9)) continue;
    escolhidos.push(p); return { x: p[0], z: p[1], h: +H[i].toFixed(2), d: Math.round(dm) };
  }
  return null;
}
for(const f of CFG.faixas){
  for(let k = 0; k < f.spots; k++){ const s = pega(f.dmin, f.dmax, CFG.sep, f.raio); if(!s){ console.error('faltou spot', f.tipo); break; } out.spots.push(Object.assign({ tipo: f.tipo, n: f.n, raio: f.raio, agr: f.agr }, s)); }
}
if(CFG.chefe){ const s = pega(CFG.chefe.dmin, CFG.chefe.dmax, CFG.sep, 4); if(s) out.spots.push(Object.assign({ tipo: CFG.chefe.tipo, n: 1, raio: 1, agr: 1, chefe: true, resp: CFG.chefe.resp }, s)); else console.error('sem chefe'); }
console.log(JSON.stringify(out));
