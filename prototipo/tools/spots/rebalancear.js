/* Rebalanceamento por AREA (13/11/2026, direcao do dono): nivel maximo 99; Campo 1-20; em volta da Cruma 20-35; em volta da Fortaleza 35-50
   (por dentro fica vazia: castelo de cla semanal); Pantano 50-78; DG da Torre 80-99 (fim de jogo, leva ao Baium).
   Uso (na pasta prototipo):  node tools/spots/rebalancear.js          -> so mostra a tabela
                              node tools/spots/rebalancear.js gravar   -> grava data/dungeon.json, data/progressao.json e data/spots.json
   Regra unica: vida e dano de cada mob saem da CURVA do nivel x papel do mob; o peso de XP = vida efetiva / vida da curva
   (XP por ponto de vida igual para todos). Na DG os numeros gravados ja descontam o multiplicador da dificuldade.
   Pode rodar de novo: o resultado e o mesmo (semente fixa). Depois: node tools/simular_progressao.js e node ../servidor/teste_progressao.js */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..', '..'), GRAVAR = process.argv[2] === 'gravar';
const le = f => fs.readFileSync(path.join(R, f), 'utf8'), grava = (f, s) => fs.writeFileSync(path.join(R, f), s);
const Mobs = require(path.join(R, 'servidor', 'mobs_mundo.js'));

const NIVEL_MAX = 99;
const hpC = L => 30 + 3 * L + 0.085 * L * L;            /* vida de um mob comum do nivel L */
const dmgC = L => 2 + 0.38 * L + 0.004 * L * L;         /* dano por golpe de um mob comum do nivel L */

/* tabela: dif -> [tipo, nivel, vida x, dano x]   (chefe de campo 8 / 1.6; mini-chefe 5 / 1.5) */
const T = {
  campo:    [['sapo_curuma', 2, 1, 1], ['aranha_curuma', 6, .9, 1], ['stakato_curuma', 10, 1, 1], ['stalker_curuma', 13, 1.1, 1.05], ['formiga_fort', 17, .9, 1]],
  curuma:   [['olho_fort', 21, .8, 1.05], ['basilisco_fort', 25, 1, 1], ['stakato_anciao', 29, 1.1, 1], ['stalker_anciao', 32, 1.15, 1.05], ['chefe_curuma', 35, 8, 1.6]],
  fortress: [['ol_mahum_fort', 38, 1, 1], ['basilisco_anciao', 42, 1.1, 1], ['ol_mahum_capitao', 46, 1.2, 1.1], ['chefe_fort', 49, 8, 1.6]],
  pantano:  [['salamandra_fogo', 52, .9, 1], ['magmagoil', 57, .8, 1.05], ['wyrm_fogo', 62, 1, 1.05], ['golem_lava', 67, 1.25, 1.1], ['salamandra_ancia', 71, 1, 1], ['golem_anciao', 75, 1.25, 1.1], ['chefe_blazing', 78, 8, 1.6]],
  normal:   [['fantasma', 80, .8, .9], ['esqueleto', 81, 1, 1], ['vidente', 82, .75, 1], ['lamina', 84, 5, 1.5]],
  medio:    [['cao', 86, .85, 1], ['guarda_real', 87, 1, 1], ['erinia', 88, .95, 1.05], ['vidente', 88, 0, 0], ['cavaleiro', 89, 1.25, 1.05], ['comandante', 91, 5, 1.5]],
  hard:     [['anjo', 93, 1, 1], ['xama', 94, .8, 1.05], ['overlord', 96, 1.4, 1.15], ['arcanjo', 98, 5, 1.5]]
};
/* variantes: mesmo modelo/animacao/voz do mob de origem, maiores e mais fortes (faltam modelos para cobrir 1-80 de 4 em 4 niveis) */
const VAR = {
  stakato_anciao:   { de: 'stakato_curuma',  name: 'Stakato Anciao',       css: '#e0b040' },
  stalker_anciao:   { de: 'stalker_curuma',  name: 'Espreitador Sombrio',  css: '#6a80b0' },
  basilisco_anciao: { de: 'basilisco_fort',  name: 'Basilisco Anciao',     css: '#7a9a3a' },
  ol_mahum_capitao: { de: 'ol_mahum_fort',   name: 'Capitao Ol Mahum',     css: '#e09050', armor: true },
  salamandra_ancia: { de: 'salamandra_fogo', name: 'Salamandra Ancia',     css: '#ff6a1a' },
  golem_anciao:     { de: 'golem_lava',      name: 'Golem de Magma',       css: '#ff5a0a' }
};
const LEGADO = { shade: [21, 1], brute: [26, 3], caster: [24, 1.2], mini_boss: [27, 6] };      /* DG antiga por salas: fica como estava */
const BOSS = { normal: [85, 10], medio: [92, 10], hard: [99, 10] };
const GRAUS = '{ "campo": { "sem": 1 }, "curuma": { "sem": 0.3, "D": 0.7 }, "fortress": { "D": 0.5, "C": 0.5 }, "pantano": { "C": 1 }, "normal": { "C": 1 }, "medio": { "C": 1 }, "hard": { "C": 1 } }';
const GRAUS_CHEFE = '{ "campo": { "sem": 0.5, "D": 0.5 }, "curuma": { "D": 1 }, "fortress": { "C": 1 }, "pantano": { "C": 1 }, "normal": { "C": 1 }, "medio": { "C": 1 }, "hard": { "C": 1 } }';

/* ---------- 1. dungeon.json: vida e dano ---------- */
let dgTxt = le('prototipo/data/dungeon.json'); const NL = dgTxt.includes('\r\n') ? '\r\n' : '\n';
let DG = JSON.parse(dgTxt);
function bloco(txt, tipo){ const i = txt.indexOf('"' + tipo + '": {'); if(i < 0) return null; const f = txt.indexOf('}', i); return [i, f + 1]; }
for(const k in VAR){                                                 /* cria a variante se ainda nao existe */
  if(DG.mobs[k]) continue; const V = VAR[k], o = Object.assign({}, DG.mobs[V.de], { name: V.name, css: V.css, size: +(DG.mobs[V.de].size * 1.2).toFixed(2), modelo: DG.mobs[V.de].modelo });
  if(V.armor) o.armor = true; delete o.xp;
  const b = bloco(dgTxt, 'chefe_blazing'), ins = ',' + NL + '    "' + k + '": ' + JSON.stringify(o, null, 2).split('\n').join(NL + '    ');
  dgTxt = dgTxt.slice(0, b[1]) + ins + dgTxt.slice(b[1]); DG = JSON.parse(dgTxt);
}
const tabela = [], pesos = {};
for(const dif in T){
  const D = DG.difficulties[dif] || { hp: 1, dmg: 1 }; pesos[dif] = {};
  for(const [tipo, lv, mh, md] of T[dif]){
    const M = DG.mobs[tipo]; if(!M) throw new Error('mob sem dados: ' + tipo);
    if(mh){                                                          /* mh = 0: mob repetido em outra dificuldade, usa o que ja foi gravado */
      const hp = Math.round(hpC(lv) * mh / D.hp), dmg = Math.max(1, Math.round(dmgC(lv) * md / D.dmg)), b = bloco(dgTxt, tipo);
      let t = dgTxt.slice(b[0], b[1]).replace(/"hp": [\d.]+/, '"hp": ' + hp).replace(/"dmg": [\d.]+/, '"dmg": ' + dmg);
      dgTxt = dgTxt.slice(0, b[0]) + t + dgTxt.slice(b[1]); M.hp = hp; M.dmg = dmg;
    }
    const ef = M.hp * D.hp * (M.armor ? 1 / .85 : 1), peso = Math.max(.5, Math.round(ef / hpC(lv) * 10) / 10);
    pesos[dif][tipo] = [lv, peso];
    tabela.push({ dif, tipo, nome: M.name, nv: lv, vida: Math.round(M.hp * D.hp), dano: +(M.dmg * D.dmg).toFixed(0), peso, xp: Math.round((10 + 2.2 * lv) * peso) });
  }
}
dgTxt = dgTxt.replace(/"graus":\s*\{[^\n\r]*\}\s*,/, '"graus":      ' + GRAUS + ',').replace(/"grausChefe":\s*\{[^\n\r]*\}/, '"grausChefe": ' + GRAUS_CHEFE);
JSON.parse(dgTxt);
console.table(tabela);

/* ---------- 2. progressao.json: nivel maximo e niveis/pesos dos mobs ---------- */
let pgTxt = le('prototipo/data/progressao.json'); const NLp = pgTxt.includes('\r\n') ? '\r\n' : '\n';
pgTxt = pgTxt.replace(/"nivelMax": \d+/, '"nivelMax": ' + NIVEL_MAX);
Object.assign(pesos.normal, LEGADO); for(const d in BOSS) pesos[d].boss = BOSS[d];
const linha = d => '    "' + d + '": {' + Object.keys(pesos[d]).map(k => '"' + k + '": [' + pesos[d][k].join(', ') + ']').join(', ') + '}';
const mn = '"mobsNivel": {' + NLp + '    "_nota": "13/11/2026 (tools/spots/rebalancear.js): [nivel, peso de XP] de cada mob por tabela (dif). campo 1-20; curuma (em volta da Cruma) 20-35; fortress (em volta da Fortaleza) 35-50; pantano 50-78; DG da Torre = fim de jogo: normal 80-85, medio 86-92, hard 93-99. peso = vida efetiva / vida da curva do nivel. shade/brute/caster/mini_boss = DG antiga por salas.",' + NLp +
  ['campo', 'curuma', 'fortress', 'pantano', 'normal', 'medio', 'hard'].map(linha).join(',' + NLp) + NLp + '  },' + NLp + '  ';
const a = pgTxt.indexOf('"mobsNivel": {'), b2 = pgTxt.indexOf('"morte"'); if(a < 0 || b2 < 0) throw new Error('progressao.json: bloco mobsNivel');
pgTxt = pgTxt.slice(0, a) + mn + pgTxt.slice(b2); JSON.parse(pgTxt);

/* ---------- 3. spots ---------- */
const SP = JSON.parse(le('prototipo/data/spots.json')), MG = JSON.parse(le('prototipo/assets/mundo/mundo_grade.json')), bin = fs.readFileSync(path.join(R, 'prototipo/assets/mundo/mundo_grade.bin'));
const nx = MG.nx, nz = MG.nz, B = MG.bytes_celula, N = nx * nz, H = new Float32Array(N), AND = new Uint8Array(N), RG = new Uint8Array(N);
for(let k = 0; k < N; k++){ H[k] = bin.readInt16LE(k * B) / 100; RG[k] = bin.readUInt8(k * B + 7); AND[k] = bin.readUInt8(k * B + 8); }
const wx = k => MG.x0 + (k % nx) * MG.passo, wz = k => MG.z0 + Math.floor(k / nx) * MG.passo;
const celDe = (x, z) => { const i = Math.round((x - MG.x0) / MG.passo), j = Math.round((z - MG.z0) / MG.passo); return (i < 0 || j < 0 || i >= nx || j >= nz) ? -1 : j * nx + i; };
function dist(fonte){                                                /* distancia (celulas) ate a regiao */
  const d = new Int16Array(N).fill(-1), q = []; for(let k = 0; k < N; k++) if(fonte(RG[k])){ d[k] = 0; q.push(k); }
  for(let qi = 0; qi < q.length; qi++){ const k = q[qi], i = k % nx, j = (k - i) / nx; if(d[k] >= 40) continue;
    for(const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const x = i + u, z = j + v; if(x < 0 || z < 0 || x >= nx || z >= nz) continue; const kk = z * nx + x; if(d[kk] < 0){ d[kk] = d[k] + 1; q.push(kk); } } }
  return d;
}
const dQualquer = dist(r => r !== 0);
function plano(k){ const i = k % nx, j = (k - i) / nx; for(let u = -2; u <= 2; u++) for(let v = -2; v <= 2; v++){ const x = i + u, z = j + v; if(x < 0 || z < 0 || x >= nx || z >= nz) return false; const kk = z * nx + x; if(!AND[kk] || RG[kk] !== 0 || Math.abs(H[kk] - H[k]) > 2) return false; } return true; }
/* Cruma: troca os tipos (o campo ja cobre 1-20) e tira os spots que caem fora da regiao da Cruma no mundo */
const TROCA = { sapo_curuma: 'olho_fort', aranha_curuma: 'basilisco_fort', stakato_curuma: 'stakato_anciao', stalker_curuma: 'stalker_anciao', olho_fort: 'olho_fort', basilisco_fort: 'basilisco_fort', stakato_anciao: 'stakato_anciao', stalker_anciao: 'stalker_anciao', chefe_curuma: 'chefe_curuma' };
const ILHA = { salamandra_fogo: ['golem_lava', .3], magmagoil: ['salamandra_ancia', .3], wyrm_fogo: ['golem_anciao', .35], golem_lava: ['golem_anciao', .35] };      /* ilha do Pantano (parte alta): 67-78 */
const AGR = { olho_fort: .15, basilisco_fort: .2, stakato_anciao: .3, stalker_anciao: .35 };
const Xc = Mobs.xfDe('curuma'), Xp = Mobs.xfDe('pantano'); let fora = 0;
SP.curuma.spots = SP.curuma.spots.filter(s => { const p = Mobs.praMundo(Xc, s.x, s.z), k = celDe(p[0], p[1]); if(k < 0 || RG[k] !== 1){ fora++; return false; } return true; })
  .map(s => Object.assign({}, s, { tipo: TROCA[s.tipo] || s.tipo }, AGR[TROCA[s.tipo]] !== undefined ? { agr: AGR[TROCA[s.tipo]] } : {}));
if(SP.blazing_swamp.spots.some(s => s.tipo === 'salamandra_fogo')) SP.blazing_swamp.spots = SP.blazing_swamp.spots.map(s => ILHA[s.tipo] ? Object.assign({}, s, { tipo: ILHA[s.tipo][0], agr: ILHA[s.tipo][1] }) : s);      /* so na primeira vez (depois ja nao ha salamandra comum na ilha) */
/* Fortaleza por dentro: vazia (castelo de cla, evento semanal). Os spots antigos ficam guardados no arquivo .antes_auditoria */
SP.fortress.spots = [];
/* ocupados (mundo): campo + Cruma + Pantano */
const ocup = (MG.spots || []).map(s => [s.x, s.z]);
for(const s of SP.curuma.spots) ocup.push(Mobs.praMundo(Xc, s.x, s.z));
for(const s of SP.blazing_swamp.spots) ocup.push(Mobs.praMundo(Xp, s.x, s.z));
let seed = 20261113; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function anel(reg, n, dmin, dmax, sep){                              /* n pontos planos do campo a dmin..dmax m da regiao */
  const d = dist(r => r === reg), cand = [], out = [];
  for(let k = 0; k < N; k++) if(RG[k] === 0 && AND[k] && d[k] * MG.passo >= dmin && d[k] * MG.passo <= dmax && dQualquer[k] * MG.passo >= dmin && Math.hypot(wx(k), wz(k)) > 150 && plano(k)) cand.push(k);
  for(let t = 0; t < 60000 && out.length < n && cand.length; t++){ const k = cand[Math.floor(rnd() * cand.length)], x = wx(k), z = wz(k); if(ocup.some(q => Math.hypot(q[0] - x, q[1] - z) < sep)) continue; ocup.push([x, z]); out.push({ x: +x.toFixed(1), z: +z.toFixed(1), h: +H[k].toFixed(2) }); }
  if(out.length < n) console.error('ATENCAO: so achei', out.length, 'de', n, 'pontos em volta da regiao', reg);
  return out;
}
const mundo = [];
{ const P = anel(2, 13, 15, 100, 26).sort((p, q) => Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z)), chefe = P.pop();      /* Fortaleza: perto da cidade = mais fraco; o mais longe = chefe */
  const tipos = [['ol_mahum_fort', .25], ['basilisco_anciao', .3], ['ol_mahum_capitao', .35]];
  P.forEach((p, i) => { const t = tipos[Math.min(2, Math.floor(i / Math.ceil(P.length / 3)))]; mundo.push(Object.assign({ dif: 'fortress', tipo: t[0], n: 4, raio: 7, agr: t[1] }, p)); });
  if(chefe) mundo.push(Object.assign({ dif: 'fortress', tipo: 'chefe_fort', n: 1, raio: 1, agr: 1, chefe: true, resp: 300, local: 'arredores da Fortaleza' }, chefe)); }
/* Pantano (14/11, dono): PARTE BAIXA = terreno do mundo a -35 m em volta da ilha (regiao 3), entra-se pelo campo baixo a leste; mobs 52-62, mais fracos perto da entrada.
   PARTE ALTA = a ilha (spots do mapa, acima): 67-78. */
{ const baixo = k => AND[k] && H[k] < -24, alto = dist(() => false); const dA = new Int16Array(N).fill(-1), q = [];
  for(let k = 0; k < N; k++) if(RG[k] === 3 && AND[k] && H[k] >= -12){ dA[k] = 0; q.push(k); }                       /* distancia ate a ilha (para nao nascer colado na encosta) */
  for(let qi = 0; qi < q.length; qi++){ const k = q[qi], i = k % nx, j = (k - i) / nx; if(dA[k] >= 6) continue; for(const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const x = i + u, z = j + v; if(x < 0 || z < 0 || x >= nx || z >= nz) continue; const kk = z * nx + x; if(dA[kk] < 0){ dA[kk] = dA[k] + 1; q.push(kk); } } }
  const dE = new Int32Array(N).fill(-1), e = []; for(let k = 0; k < N; k++) if(RG[k] === 0 && AND[k] && H[k] < -12){ dE[k] = 0; e.push(k); }      /* distancia a pe, por baixo, desde o campo baixo (a entrada) */
  for(let qi = 0; qi < e.length; qi++){ const k = e[qi], i = k % nx, j = (k - i) / nx; for(const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const x = i + u, z = j + v; if(x < 0 || z < 0 || x >= nx || z >= nz) continue; const kk = z * nx + x; if(dE[kk] < 0 && RG[kk] === 3 && baixo(kk) && Math.abs(H[kk] - H[k]) < 1.6){ dE[kk] = dE[k] + 1; e.push(kk); } } }
  const planoB = k => { const i = k % nx, j = (k - i) / nx; for(let u = -2; u <= 2; u++) for(let v = -2; v <= 2; v++){ const kk = (j + v) * nx + i + u; if(!baixo(kk) || RG[kk] !== 3 || Math.abs(H[kk] - H[k]) > 2) return false; } return true; };
  const cand = []; for(let k = 0; k < N; k++) if(RG[k] === 3 && baixo(k) && dE[k] > 3 && dA[k] < 0 && planoB(k)) cand.push(k);
  const P = []; for(let t = 0; t < 80000 && P.length < 12 && cand.length; t++){ const k = cand[Math.floor(rnd() * cand.length)], x = wx(k), z = wz(k); if(ocup.some(o => Math.hypot(o[0] - x, o[1] - z) < 30)) continue; ocup.push([x, z]); P.push({ x: +x.toFixed(1), z: +z.toFixed(1), h: +H[k].toFixed(2), d: dE[k] }); }
  if(P.length < 12) console.error('ATENCAO: parte baixa do Pantano so tem', P.length, 'de 12 pontos; candidatos', cand.length);
  P.sort((a, b) => a.d - b.d); const tp = [['salamandra_fogo', .15], ['magmagoil', .25], ['wyrm_fogo', .3]];
  P.forEach((p, i) => { const t = tp[Math.min(2, Math.floor(i / Math.ceil(P.length / 3)))], o = Object.assign({ dif: 'pantano', tipo: t[0], n: 4, raio: 7, agr: t[1] }, p); delete o.d; mundo.push(o); }); }
SP.mundo = { _nota: 'Spots em volta dos mapas, em coordenadas do MUNDO (servidor/mobs_mundo.js -> campo). dif = tabela de XP/drop do mob. Gerado por tools/spots/rebalancear.js.', spots: mundo };
const NLs = le('prototipo/data/spots.json').includes('\r\n') ? '\r\n' : '\n';
const cab = k => Object.keys(SP[k]).filter(c => c !== 'spots').map(c => JSON.stringify(c) + ': ' + JSON.stringify(SP[k][c])).join(', ');
const spTxt = '{' + NLs + '  "_nota": ' + JSON.stringify(SP._nota) + ',' + NLs +
  ['curuma', 'fortress', 'blazing_swamp', 'mundo'].map(k => '  "' + k + '": {' + cab(k) + ', "spots": [' + (SP[k].spots.length ? NLs + SP[k].spots.map(s => '    ' + JSON.stringify(s).replace(/":/g, '": ').replace(/,"/g, ', "')).join(',' + NLs) + NLs + '  ' : '') + ']}').join(',' + NLs) + NLs + '}' + NLs;
JSON.parse(spTxt);
console.log('Cruma: ' + SP.curuma.spots.length + ' spots (' + fora + ' tirados por cair fora da regiao) | Fortaleza por dentro: 0 | Pantano: ' + SP.blazing_swamp.spots.length + ' | em volta dos mapas: ' + mundo.length);
if(GRAVAR){ grava('prototipo/data/dungeon.json', dgTxt); grava('prototipo/data/progressao.json', pgTxt); grava('prototipo/data/spots.json', spTxt); console.log('GRAVADO: dungeon.json, progressao.json, spots.json'); }
else console.log('(so mostrou; para gravar: node tools/spots/rebalancear.js gravar)');
