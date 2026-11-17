/* Dano PvP pelos status, estilo L2 (decisao do dono 17/11/2026). Dados em prototipo/data/status_l2.json; formulas descritas la ("_formulas").
   Ficha = o que importa para a luta: { lv, classe, arma, pAtr (pontos no atributo de dano acima do inicial), pVit, arma: {grau, rar, en}, pecas: {slot: {grau, rar, en}},
   danoPct, defPct, vidaItens, vidaSetPct }. Vem do personagem salvo (fichaDePers) ou e montada para um bot (fichaBot).
   Usado por: servidor/server.js (fere/ataque) e prototipo/tools/simular_pvp_l2.js (tabela de tempo para matar). */
const fs = require('fs'), path = require('path');
let C = null, ITENS = null, PROG = null, BASES = {};
function carrega(raiz){
  const ler = f => JSON.parse(fs.readFileSync(path.join(raiz, 'data', f), 'utf8'));
  C = ler('status_l2.json'); ITENS = ler('itens.json'); PROG = ler('progressao.json');
  BASES = {}; (ITENS.bases || []).forEach(b => { BASES[b.id] = b; });
  return C;
}
const nivelMod = lv => ((lv | 0) + 89) / 100;
const grauDoNivel = lv => { for(const [n, g] of C.grauPorNivel) if((lv | 0) >= n) return g; return 'sem'; };
const SLOTS_ARM = ['helmet', 'chest', 'legs', 'gloves', 'boots', 'shield'];

/* bonus de conjunto (mesma regra do jogo: elmo, peitoral, luvas e botas do mesmo grau) */
function conjunto(pecas){
  const cj = ITENS.conjunto || {}, req = cj.pecas || ['helmet', 'chest', 'gloves', 'boots'];
  const g = pecas[req[0]] && pecas[req[0]].grau; if(!g || g === 'sem') return null;
  for(const s of req) if(!pecas[s] || pecas[s].grau !== g) return null;
  return cj[g] || null;
}

/* ficha a partir do personagem salvo no servidor (pers.inv, pers.attr, nivel e classe) */
function fichaDePers(pers, armaClasse, statsTot){
  const cls = (PROG.classes || {})[pers.classe] || {}, ini = cls.inicial || {}, e = PROG.efeitos || {};
  const inv = pers.inv || {}, itens = inv.items || [], eq = inv.equip || {}, achar = uid => itens.find(i => i.uid === uid);
  const st = statsTot || {}, attrDano = cls.danoAttr || 'for';
  const f = { lv: pers.level | 0 || 1, classe: pers.classe, tipo: armaClasse || 'sword', pAtr: Math.max(0, (st[attrDano] | 0) - (ini[attrDano] | 0)), pVit: Math.max(0, (st.vit | 0) - (ini.vit | 0)),
    arma: null, pecas: {}, danoPct: 0, defPct: 0, vidaItens: 0, vidaSetPct: 0 };
  const w = achar(eq.weapon); if(w){ const b = BASES[w.base] || {}; f.arma = { grau: b.grau || 'sem', rar: w.rar || 'normal', en: w.en | 0 }; }
  for(const s of SLOTS_ARM){ const it = achar(eq[s]); if(!it) continue; const b = BASES[it.base] || {}; f.pecas[s] = { grau: b.grau || 'sem', rar: it.rar || 'normal', en: it.en | 0 };
    const sts = it.stats || {}; if(sts.dano) f.danoPct += sts.dano; if(sts.defesa) f.defPct += sts.defesa; if(sts.vida) f.vidaItens += sts.vida; }
  for(const s of ['neck', 'rear', 'lear', 'rfinger', 'lfinger']){ const it = achar(eq[s]); if(it && it.stats){ if(it.stats.vida) f.vidaItens += it.stats.vida; if(it.stats.defesa) f.defPct += it.stats.defesa; } }
  const cj = conjunto(f.pecas); if(cj){ f.danoPct += cj.dano || 0; f.defPct += cj.defesa || 0; f.vidaSetPct = cj.vida || 0; }
  f.defPct += f.pVit * (e.defesaPorVit || 0);
  return f;
}

/* ficha de um bot (ou de um jogador "tipico" no simulador): conjunto completo do grau do nivel, raridade normal, pontos todos no atributo de dano */
function fichaBot(lv, classe, armaTipo, grau, en, opt){
  opt = opt || {}; grau = grau || grauDoNivel(lv);
  const cls = (PROG.classes || {})[classe] || {}, porN = cls.porNivel || {}, attrDano = cls.danoAttr || 'for', ptsNivel = PROG.pontosPorNivel || 2;
  const f = { lv, classe, tipo: armaTipo, pAtr: (porN[attrDano] || 0) * (lv - 1) + (opt.pontosNoVit ? 0 : ptsNivel * (lv - 1)), pVit: (porN.vit || 0) * (lv - 1) + (opt.pontosNoVit ? ptsNivel * (lv - 1) : 0),
    arma: { grau, rar: 'normal', en: en | 0 }, pecas: {}, danoPct: 0, defPct: 0, vidaItens: 0, vidaSetPct: 0 };
  const slots = ['helmet', 'chest', 'legs', 'gloves', 'boots'].concat(armaTipo === 'shield' ? ['shield'] : []);
  const ORD = ['S', 'A', 'B', 'C', 'D', 'sem'];
  for(const s of slots){ let b = null, gp = grau; for(const g of ORD.slice(ORD.indexOf(grau) < 0 ? 0 : ORD.indexOf(grau))){ b = (ITENS.bases || []).find(x => x.slot === s && x.grau === g); if(b){ gp = g; break; } }   /* peca do grau mais alto que existe para o lugar */
    f.pecas[s] = { grau: gp, rar: 'normal', en: 0 };
    if(b && b.stats){ if(b.stats.dano) f.danoPct += b.stats.dano; if(b.stats.defesa) f.defPct += b.stats.defesa; if(b.stats.vida) f.vidaItens += b.stats.vida; } }
  const cj = conjunto(f.pecas); if(cj){ f.danoPct += cj.dano || 0; f.defPct += cj.defesa || 0; f.vidaSetPct = cj.vida || 0; }
  f.defPct += f.pVit * ((PROG.efeitos || {}).defesaPorVit || 0);
  return f;
}

function pAtk(f){
  const a = f.arma || { grau: 'sem', rar: 'normal', en: 0 }, tab = C.armaAtk[f.tipo] || C.armaAtk.sword;
  const en = a.en | 0, encK = 1 + C.encArma * Math.min(en, 3) + C.encArma * 1.5 * Math.max(0, en - 3);      /* acima de +3 rende mais (overenchant do L2) */
  const danoAttr = f.pAtr * ((PROG.efeitos || {}).danoPct || .5);
  return (tab[a.grau] || tab.sem) * encK * (C.raridade[a.rar] || 1) * (1 + (f.danoPct + danoAttr) / 100) * nivelMod(f.lv);
}
function pDef(f){
  let d = C.defBase;
  for(const s of Object.keys(f.pecas)){ const p = f.pecas[s], tab = C.armaduraDef[s]; if(!tab) continue; d += (tab[p.grau] || tab.sem) * (1 + C.encArmadura * (p.en | 0)) * (C.raridade[p.rar] || 1); }
  return d * (1 + f.defPct / 100) * nivelMod(f.lv);
}
/* vida maxima, igual ao jogo: (100 + vida dos itens + VIT x 6 + (nivel-1) x 5) x (1 + vida% do conjunto) */
function vidaMax(f){
  const e = PROG.efeitos || {};
  return Math.round((100 + f.vidaItens + f.pVit * (e.vidaPorVit || 6) + (f.lv - 1) * (e.vidaPorNivel || 5)) * (1 + f.vidaSetPct / 100));
}
const varia = () => 1 - C.variacao + Math.random() * 2 * C.variacao;
function danoBasico(A, V, golpe, semVariacao){ return Math.max(1, Math.round(70 * pAtk(A) / pDef(V) * (C.golpeBasico[golpe] || 1) * C.kBasico * (semVariacao ? 1 : varia()))); }
/* skill: proporcional ao ataque (as skills daqui nao sobem de nivel como no L2, entao o poder fixo somado ao P.Atk perderia forca com o nivel) */
function danoSkill(A, V, poderJson, semVariacao){ return Math.max(1, Math.round(77 * pAtk(A) / pDef(V) * (poderJson * C.kPoder / 100) * C.kSkill * (semVariacao ? 1 : varia()))); }

module.exports = { carrega, fichaDePers, fichaBot, pAtk, pDef, vidaMax, danoBasico, danoSkill, grauDoNivel, nivelMod, dados: () => C };
