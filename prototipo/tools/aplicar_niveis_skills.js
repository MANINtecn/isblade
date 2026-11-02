/* Grava em data/armas/<arma>.json o nivel de personagem que libera cada skill, a partir de data/progressao.json (fonte unica).
   - skill base do slot i: unlock = skillsNivel[classe da arma][i]
   - variantes: guarda o tipo original em `tipo` (1a vez) e unlock = variantesNivel[tipo]
   Idempotente; preserva o fim de linha do arquivo. Uso: node tools/aplicar_niveis_skills.js */
const fs = require('fs'), path = require('path');
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'progressao.json'), 'utf8'));
const ARMA = {}; for(const c in P.classes) ARMA[P.classes[c].arma] = c;
for(const arma of Object.keys(ARMA)){
  const f = path.join(__dirname, '..', 'data', 'armas', arma + '.json'); if(!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8'), crlf = raw.indexOf(CR + LF) >= 0, j = JSON.parse(raw), tab = P.skillsNivel[ARMA[arma]]; if(!tab) continue;
  j.skills.forEach((s, i) => { if(tab[i] !== undefined) s.unlock = tab[i]; });
  const vs = j.variants || {}; for(const k in vs){ const v = vs[k]; if(v.tipo === undefined) v.tipo = v.unlock | 0; if(P.variantesNivel[v.tipo] !== undefined) v.unlock = P.variantesNivel[v.tipo]; }
  let out = JSON.stringify(j, null, 2); if(crlf) out = out.split(LF).join(CR + LF);
  fs.writeFileSync(f, out); console.log(arma, '->', ARMA[arma], j.skills.map(s => s.name + ':Nv' + s.unlock).join(' | '));
}
