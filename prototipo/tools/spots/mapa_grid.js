// le o walkgrid de um mapa aberto e faz flood fill a partir do spawn; imprime mapa ASCII com distancia de caminho
const fs = require('fs'), path = require('path');
const [, , dir, nome, sx, sz, sh, cmin, passoAscii] = process.argv;
const j = JSON.parse(fs.readFileSync(path.join(dir, nome + '.json'), 'utf8'));
const bin = fs.readFileSync(path.join(dir, nome + '.bin')); const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length);
const n = j.n, offs = new Uint32Array(ab, 0, n * n + 1), dv = new DataView(ab), base = 4 * (n * n + 1), st = j.bytes_por_camada || 3;
const CMIN = +cmin, ALT = 2.0, PASSO = 1.04;
function cam(ix, iz){ if(ix < 0 || iz < 0 || ix >= n || iz >= n) return []; const i = iz * n + ix, out = []; for(let k = offs[i]; k < offs[i + 1]; k++){ const p = base + st * k; out.push({ h: dv.getInt16(p, true) / j.altura_escala, l: dv.getUint8(p + 2) / j.livre_escala }); } return out; }
const cel = (x, z) => [Math.floor((x - j.x0) / j.celula), Math.floor((-z - j.y0) / j.celula)];
const pos = (ix, iz) => [j.x0 + (ix + .5) * j.celula, -(j.y0 + (iz + .5) * j.celula)];
// estado: chave ix,iz -> h (uma camada por celula basta: pega a mais proxima do caminho)
const H = new Float32Array(n * n).fill(NaN), D = new Float32Array(n * n).fill(-1);
const [cx, cz] = cel(+sx, +sz); let h0 = null; for(const L of cam(cx, cz)) if(L.l >= ALT && L.h >= CMIN && (h0 === null || Math.abs(L.h - +sh) < Math.abs(h0 - +sh))) h0 = L.h;
const fila = [[cx, cz]]; H[cz * n + cx] = h0; D[cz * n + cx] = 0; let qi = 0;
while(qi < fila.length){
  const [ix, iz] = fila[qi++], h = H[iz * n + ix], d = D[iz * n + ix];
  for(const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
    const x = ix + ax, z = iz + az; if(x < 0 || z < 0 || x >= n || z >= n || D[z * n + x] >= 0) continue;
    let b = null; for(const L of cam(x, z)){ if(L.h < CMIN + .3 || L.l < ALT) continue; if(L.h <= h + PASSO && L.h >= h - 2.5 && (b === null || L.h > b)) b = L.h; }
    if(b === null) continue; H[z * n + x] = b; D[z * n + x] = d + 1; fila.push([x, z]);
  }
}
console.log('alcancaveis', fila.length, 'h0', h0);
const P = +passoAscii || 8; let maxd = 0; for(const v of D) if(v > maxd) maxd = v; console.log('dist max', maxd);
let s = ''; for(let iz = 0; iz < n; iz += P){ let row = ''; for(let ix = 0; ix < n; ix += P){ let best = -1; for(let a = 0; a < P; a++) for(let b = 0; b < P; b++){ const i = (iz + a) * n + ix + b; if(D[i] >= 0 && (best < 0 || D[i] < best)) best = D[i]; } row += best < 0 ? '.' : (best === 0 ? '@' : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.min(35, Math.floor(best / 25))]); } s += row + '  z=' + pos(0, iz)[1].toFixed(0) + '\n'; }
console.log(s);
console.log('colunas x0=', j.x0, 'passo', P * j.celula);
fs.writeFileSync(path.join(process.env.SAIDA || '.', nome + '_dist.bin'), Buffer.from(D.buffer));
fs.writeFileSync(path.join(process.env.SAIDA || '.', nome + '_h.bin'), Buffer.from(H.buffer));
