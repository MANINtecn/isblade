/* Progressao (servidor): nivel, XP, pontos e atributos. Fonte dos numeros: prototipo/data/progressao.json.
   O servidor e o dono; o cliente so recebe o resultado (mensagem `prog`). */
const fs = require('fs'), path = require('path');
const ARQ = path.join(__dirname, '..', 'prototipo', 'data', 'progressao.json');
let P = null;
function carrega(){ try { P = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch(e){ console.error('progressao: sem', ARQ, e.message); P = P || { nivelMax: 400, pontosPorNivel: 2, curvaXp: { abatesMin: 6, abatesBase: 40, abatesRef: 30, expoente: 1.87, xpMobBase: 10, xpMobPorNivel: 2.2 }, classes: {}, mobsNivel: {}, xpPorAbate: {} }; } return P; }
carrega();

const NIVEL_MAX = () => P.nivelMax | 0 || 400;
const abates = L => { const c = P.curvaXp; return Math.max(c.abatesMin, c.abatesBase * Math.pow(L / c.abatesRef, c.expoente)); };
const xpMob = L => P.curvaXp.xpMobBase + P.curvaXp.xpMobPorNivel * L;
const xpNeed = L => Math.round(abates(L) * xpMob(L));                       /* XP para sair do nivel L */
const pontosTotais = L => (P.pontosPorNivel | 0) * Math.max(0, L - 1);
const ATTRS = ['for', 'int', 'agi', 'vit'];
const classeDe = p => (P.classes[p && p.classe] ? p.classe : 'guerreiro');
const gasto = a => ATTRS.reduce((s, k) => s + ((a && a[k]) | 0), 0);

/* atributo total = inicial da classe + crescimento por nivel + pontos distribuidos */
function statsDe(p){
  const c = P.classes[classeDe(p)] || { inicial: {}, porNivel: {} }, L = Math.max(1, p.level | 0), out = {};
  for(const k of ATTRS) out[k] = (c.inicial[k] | 0) + (c.porNivel[k] | 0) * (L - 1) + ((p.attr && p.attr[k]) | 0);
  return out;
}
const pontosLivres = p => Math.max(0, pontosTotais(Math.max(1, p.level | 0)) - gasto(p.attr));

/* XP de um abate: nivel/peso do mob na dificuldade da dungeon x fator pela diferenca de nivel */
function xpAbate(dif, tipo, lvJog){
  const t = P.mobsNivel[dif] && P.mobsNivel[dif][tipo]; if(!t) return 0;
  const f = P.xpPorAbate, d = lvJog - t[0]; let fator = 1;
  if(d > f.semPenalidade) fator = Math.max(f.minimo, 1 - f.penalidadePorNivel * (d - f.semPenalidade));
  else if(d < 0){ fator = 1 + Math.min(f.bonusMax, f.bonusPorNivel * -d); const lim = f.acimaLimite === undefined ? 8 : f.acimaLimite; if(-d > lim) fator = Math.max(f.minimo, fator - (f.acimaPenalidade || .2) * (-d - lim)); }      /* [auditoria 13/11] mob muito acima: o bonus vira penalidade (sem carona nem power-level) */
  return Math.max(1, Math.round(xpMob(t[0]) * t[1] * fator));
}

/* dados que o cliente recebe (mensagem `prog` e boas-vindas) */
function info(p){ return { lvl: p.level, xp: p.xp | 0, need: xpNeed(p.level), max: NIVEL_MAX(), classe: classeDe(p), pontos: pontosLivres(p), attr: Object.assign({ for: 0, int: 0, agi: 0, vit: 0 }, p.attr || {}), st: statsDe(p) }; }

/* soma xp; retorna true se subiu de nivel */
function ganha(p, v){
  p.xp = (p.xp | 0) + v; let subiu = false; const max = NIVEL_MAX();
  while(p.level < max && p.xp >= xpNeed(p.level)){ p.xp -= xpNeed(p.level); p.level++; subiu = true; }
  if(p.level >= max) p.xp = Math.min(p.xp, xpNeed(max) - 1);
  return subiu;
}

/* morte estilo L2 (progressao.json -> morte): perde uma fracao do XP do nivel, sem descer de nivel; devolve quanto perdeu */
function perde(p){
  const M = P.morte || { perdaXp: .04, nivelMin: 10 }, L = Math.max(1, p.level | 0); if(L < (M.nivelMin | 0)) return 0;
  const v = Math.min(p.xp | 0, Math.floor(xpNeed(L) * (+M.perdaXp || 0))); p.xp = (p.xp | 0) - v; return v;
}

/* distribui pontos: gasta = {for:n,...}; valida inteiros >= 0 e dentro dos pontos livres. Retorna true/false */
function distribui(p, gastar){
  if(!gastar || typeof gastar !== 'object') return false; let total = 0; const add = {};
  for(const k of ATTRS){ const n = gastar[k] === undefined ? 0 : Number(gastar[k]); if(!Number.isInteger(n) || n < 0 || n > 100000) return false; add[k] = n; total += n; }
  if(total <= 0 || total > pontosLivres(p)) return false;
  p.attr = p.attr || { for: 0, int: 0, agi: 0, vit: 0 }; for(const k of ATTRS) p.attr[k] = (p.attr[k] | 0) + add[k];
  return true;
}
const reseta = p => { p.attr = { for: 0, int: 0, agi: 0, vit: 0 }; return true; };           /* reset sempre gratis (decisao do dono) */

/* vida maxima que o servidor aceita do cliente: base + equipamento + nivel + vitalidade */
const pmaxMax = p => 400 + (p.level | 0) * 20 + 6 * Math.max(0, statsDe(p).vit - ((P.classes[classeDe(p)] || { inicial: {} }).inicial.vit | 0)) + 200;

module.exports = { perde, recarrega: carrega, dados: () => P, NIVEL_MAX, xpNeed, xpMob, abates, pontosTotais, pontosLivres, statsDe, classeDe, xpAbate, info, ganha, distribui, reseta, pmaxMax, ATTRS };
