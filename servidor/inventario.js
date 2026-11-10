'use strict';
/* Inventario e ADENA com autoridade do SERVIDOR (por personagem: pers.inv = { items: [{uid, base, rar, stats}], equip: {slot: uid}, adena }).
   O cliente so PEDE (equipar / tirar / descartar) e recebe o estado; nao consegue criar item nem adena (antes ficava no navegador e dava para forjar pelo F12).
   Itens com as mesmas regras do cliente (prototipo/data/itens.json): status da base x multiplicador da raridade + extras sorteados.
   Classe manda na arma: so equipa a arma da propria classe (pers.weapon). Drops: adena em todo abate; chance de item em mob comum; item garantido em
   mini-chefe, chefe de campo e chefe (dungeon.json -> drops); raridade melhor nas dificuldades maiores (difficulties[].rarityBoost) e nos chefes.
   Graus (itens.json -> graus): Sem grau / D / C; nivel minimo para equipar; o grau que cai depende do mapa/dificuldade (dungeon.json -> drops.graus / grausChefe). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DADOS = path.join(__dirname, '..', 'prototipo', 'data');
let D = null, DG = null, LJ = null;
function carrega(){
  try { D = JSON.parse(fs.readFileSync(path.join(DADOS, 'itens.json'), 'utf8')); } catch(e){ console.error('inventario: sem itens.json', e.message); }
  try { DG = JSON.parse(fs.readFileSync(path.join(DADOS, 'dungeon.json'), 'utf8')); } catch(e){ DG = null; }
  try { LJ = JSON.parse(fs.readFileSync(path.join(DADOS, 'loja.json'), 'utf8')); } catch(e){ LJ = null; console.error('inventario: sem loja.json', e.message); }
}
carrega();
const r1 = n => Math.round(n * 10) / 10;
const baseDe = id => D && D.bases.find(b => b.id === id);
const grauDe = b => (b && b.grau) || 'sem';
const nivelGrau = b => ((D && D.graus && D.graus[grauDe(b)]) || { nivel: 1 }).nivel | 0;
const novoUid = () => 'i' + crypto.randomBytes(6).toString('hex');

function mkItem(baseId, rar){
  const b = baseDe(baseId), R = D && D.rarities[rar]; if(!b || !R) return null;
  const stats = {}; for(const k of Object.keys(b.stats)) stats[k] = r1(b.stats[k] * R.mult);
  const pool = Object.keys(D.affixes).filter(k => !(k in stats));
  for(let i = 0; i < R.affixes && pool.length; i++){ const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; stats[k] = r1(D.affixes[k] * R.mult * (.8 + Math.random() * .4)); }
  return { uid: novoUid(), base: baseId, rar, stats };
}
const armaDaClasse = pers => (pers && pers.weapon === 'swordshield') ? 'shield' : ((pers && pers.weapon) || 'sword');
const equipado = (inv, uid) => Object.keys(inv.equip).some(s => inv.equip[s] === uid);

/* garante um inventario valido: kit inicial da classe (arma equipada + armaduras na mochila) e limpa itens de bases que sairam do json */
function garante(pers){
  if(!D || !pers) return null;
  let inv = pers.inv;
  if(!inv || !Array.isArray(inv.items) || !inv.equip || typeof inv.equip !== 'object'){
    inv = { items: [], equip: {}, adena: 0 };
    const arma = D.bases.find(b => b.slot === 'weapon' && b.weapon === armaDaClasse(pers) && grauDe(b) === 'sem') || D.bases[0], it = mkItem(arma.id, 'normal');
    inv.items.push(it); inv.equip.weapon = it.uid;
    for(const b of D.bases) if(b.slot !== 'weapon' && grauDe(b) === 'sem') inv.items.push(mkItem(b.id, 'normal'));
    pers.inv = inv;
  }
  inv.items = inv.items.filter(i => i && baseDe(i.base) && D.rarities[i.rar]);
  const mx = (LJ && LJ.encantar && LJ.encantar.max) || 16; for(const i of inv.items){ const e = Math.floor(+i.en || 0); if(e > 0) i.en = Math.min(mx, e); else delete i.en; }
  for(const s of Object.keys(inv.equip)) if(!inv.items.some(i => i.uid === inv.equip[s])) delete inv.equip[s];
  if(!inv.equip.weapon){ const w = inv.items.find(i => { const b = baseDe(i.base); return b.slot === 'weapon' && b.weapon === armaDaClasse(pers); }); if(w) inv.equip.weapon = w.uid; else { const b = D.bases.find(x => x.slot === 'weapon' && x.weapon === armaDaClasse(pers) && grauDe(x) === 'sem'); if(b){ const it = mkItem(b.id, 'normal'); inv.items.push(it); inv.equip.weapon = it.uid; } } }
  inv.adena = Math.max(0, Math.floor(+inv.adena || 0));
  if(!inv.consum || typeof inv.consum !== 'object') inv.consum = {};
  for(const k of Object.keys(inv.consum)){ const n = Math.floor(+inv.consum[k] || 0); if(n > 0 && LJ && LJ.consumiveis[k]) inv.consum[k] = n; else delete inv.consum[k]; }
  return inv;
}

/* ---- loja (data/loja.json): comprar consumivel, vender equipamento, usar consumivel ---- */
const MAX_PILHA = 999;
function comprar(pers, loja, id, qtd){
  const inv = garante(pers); if(!inv || !LJ) return 'Loja indisponivel.';
  const lista = LJ.lojas[loja]; if(!lista || lista.indexOf(id) < 0) return 'Esse comerciante nao vende isso.';
  const eb = !LJ.consumiveis[id] && baseDe(id);
  if(eb){                                                            /* equipamento (Sem grau / D): sai Normal, 1 por vez */
    const P = LJ.equip && LJ.equip[grauDe(eb)], preco = P && (eb.slot === 'weapon' ? P.arma : P.armadura); if(!preco) return 'Esse comerciante nao vende isso.';
    if(inv.items.length >= D.bagMax) return 'Sua mochila esta cheia.'; if(inv.adena < preco) return 'Adena insuficiente (precisa de ' + preco + ').';
    inv.adena -= preco; inv.items.push(mkItem(id, 'normal')); return '';
  }
  const c = LJ.consumiveis[id]; qtd = Math.floor(+qtd || 0); if(!c || qtd < 1 || qtd > 100) return 'Quantidade invalida.';
  if((inv.consum[id] || 0) + qtd > MAX_PILHA) return 'Voce ja carrega o maximo desse item.';
  const total = c.preco * qtd; if(inv.adena < total) return 'Adena insuficiente (precisa de ' + total + ').';
  inv.adena -= total; inv.consum[id] = (inv.consum[id] || 0) + qtd; return '';
}
function vender(pers, uid){
  const inv = garante(pers); if(!inv || !LJ) return { erro: 'Loja indisponivel.' };
  if(equipado(inv, uid)) return { erro: 'Tire o item antes de vender.' };
  const it = inv.items.find(i => i.uid === uid); if(!it) return { erro: 'Item nao encontrado.' };
  const G = D.graus && D.graus[grauDe(baseDe(it.base))], v = Math.round((LJ.venda[it.rar] || 1) * ((G && G.venda) || 1)); inv.items = inv.items.filter(i => i.uid !== uid); inv.adena += v; return { erro: '', valor: v, base: it.base, rar: it.rar };
}
/* usar: gasta 1 e devolve o efeito ({cura} ou {volta}); a recarga fica no objeto do jogador conectado (usoT) */
function usar(pers, J, id, agora){
  const inv = garante(pers); if(!inv || !LJ) return { erro: 'Indisponivel.' };
  const c = LJ.consumiveis[id]; if(!c) return { erro: 'Item desconhecido.' };
  if(c.ss) return { erro: c.nome + ' e automatico: gasta 1 por ataque enquanto voce tiver.' };
  if(!(inv.consum[id] > 0)) return { erro: 'Voce nao tem ' + c.nome + '.' };
  J.usoT = J.usoT || {}; const falta = (J.usoT[id] || 0) - agora; if(falta > 0) return { erro: c.nome + ': aguarde ' + Math.ceil(falta) + ' s.' };
  J.usoT[id] = agora + (c.recarga || 0); inv.consum[id]--; if(!inv.consum[id]) delete inv.consum[id];
  return { erro: '', id, nome: c.nome, cura: c.cura || 0, volta: !!c.volta };
}

/* soulshot / spiritshot automatico: gasta 1 por ataque se tiver (mago usa spiritshot); devolve {id, n, bonus} ou null */
function tiro(pers){
  const inv = pers && pers.inv; if(!inv || !inv.consum || !LJ) return null;
  const id = (armaDaClasse(pers) === 'staff' || armaDaClasse(pers) === 'book') ? 'spiritshot' : 'soulshot', c = LJ.consumiveis[id]; if(!c || !(inv.consum[id] > 0)) return null;
  inv.consum[id]--; const n = inv.consum[id]; if(!n) delete inv.consum[id]; return { id, n, bonus: c.bonus || 0 };
}
/* ---- ferreiro Altran (data/loja.json -> encantar): +1..+max; ate 'seguro' nunca falha; depois a falha QUEBRA o item (como no L2) ---- */
function chanceEnc(E, alvo){ if(alvo <= E.seguro) return 1; for(const [ate, c] of E.chance) if(alvo <= ate) return c; return E.chance[E.chance.length - 1][1]; }
function custoEnc(E, b, alvo){ return (b.slot === 'weapon' ? E.custo.arma : E.custo.armadura) * alvo; }
function encantar(pers, uid){
  const inv = garante(pers), E = LJ && LJ.encantar; if(!inv || !E) return { erro: 'O ferreiro nao esta atendendo.' };
  const it = inv.items.find(i => i.uid === uid); if(!it) return { erro: 'Item nao encontrado.' };
  const b = baseDe(it.base), atual = it.en | 0, alvo = atual + 1; if(atual >= E.max) return { erro: 'Esse item ja esta no maximo (+' + E.max + ').' };
  const custo = custoEnc(E, b, alvo); if(inv.adena < custo) return { erro: 'Adena insuficiente (precisa de ' + custo + ').' };
  inv.adena -= custo;
  if(Math.random() < chanceEnc(E, alvo)){ it.en = alvo; return { erro: '', ok: true, nivel: alvo, nome: b.name, slot: b.slot }; }
  const eq = equipado(inv, uid); inv.items = inv.items.filter(i => i.uid !== uid); for(const s of Object.keys(inv.equip)) if(inv.equip[s] === uid) delete inv.equip[s];
  garante(pers);                                                    /* arma quebrada: volta a arma basica da classe (sempre ha uma arma) */
  return { erro: '', ok: false, quebrou: true, nivel: atual, nome: b.name, slot: b.slot, equipado: eq };
}
/* encantamento da arma equipada (para o brilho que os outros jogadores veem) */
function armaBase(pers){ const inv = pers && pers.inv; if(!inv || !inv.equip) return ''; const it = (inv.items || []).find(i => i.uid === inv.equip.weapon); return it ? it.base : ''; }      /* [graus] arma equipada (os outros veem o modelo do grau) */
function encArma(pers){ const inv = pers && pers.inv; if(!inv || !inv.equip) return 0; const it = (inv.items || []).find(i => i.uid === inv.equip.weapon); return (it && it.en) | 0; }

/* ---- armazem do Wilford (data/loja.json -> armazem): bau da CONTA {items, adena}, todos os personagens da conta usam o mesmo ----
   guardar (item da mochila, nao equipado; paga a taxa) | retirar (cabe na mochila) | guardarA / retirarA (adena) */
function garanteArm(conta){
  if(!conta) return null; let a = conta.arm; if(!a || !Array.isArray(a.items)) a = conta.arm = { items: [], adena: 0 };
  a.items = a.items.filter(i => i && baseDe(i.base) && D.rarities[i.rar]); a.adena = Math.max(0, Math.floor(+a.adena || 0)); return a;
}
function armazem(conta, pers, m){
  const inv = garante(pers), a = garanteArm(conta), C = (LJ && LJ.armazem) || { max: 60, taxa: 10 }; if(!inv || !a) return 'Armazem indisponivel.';
  const k = String(m.k || '');
  if(k === 'ver') return '';
  if(k === 'guardar'){
    const it = inv.items.find(i => i.uid === m.uid); if(!it) return 'Item nao encontrado.'; if(equipado(inv, it.uid)) return 'Tire o item antes de guardar.';
    if(a.items.length >= C.max) return 'O armazem esta cheio (' + C.max + ' itens).'; if(inv.adena < C.taxa) return 'A taxa e de ' + C.taxa + ' Adena.';
    inv.adena -= C.taxa; inv.items = inv.items.filter(i => i !== it); a.items.push(it); return '';
  }
  if(k === 'retirar'){
    const it = a.items.find(i => i.uid === m.uid); if(!it) return 'Item nao esta no armazem.'; if(inv.items.length >= D.bagMax) return 'Sua mochila esta cheia.';
    a.items = a.items.filter(i => i !== it); inv.items.push(it); return '';
  }
  const q = Math.floor(+m.qtd || 0); if(q < 1 || q > 1e9) return 'Quantidade invalida.';
  if(k === 'guardarA'){ if(inv.adena < q) return 'Voce nao tem essa adena.'; inv.adena -= q; a.adena += q; return ''; }
  if(k === 'retirarA'){ if(a.adena < q) return 'O armazem nao tem essa adena.'; a.adena -= q; inv.adena += q; return ''; }
  return 'Pedido desconhecido.';
}

/* pedido do cliente: {k:'equip', uid} | {k:'tirar', slot} | {k:'descartar', uid}. Devolve '' (ok) ou a mensagem de erro. */
function pedido(pers, m){
  const inv = garante(pers); if(!inv) return 'Inventario indisponivel.';
  if(m.k === 'equip'){
    const it = inv.items.find(i => i.uid === m.uid); if(!it) return 'Item nao encontrado.';
    const b = baseDe(it.base); if(b.slot === 'weapon' && b.weapon !== armaDaClasse(pers)) return 'Sua classe nao usa essa arma.';
    const nv = nivelGrau(b); if((pers.level | 0 || 1) < nv) return (D.graus[grauDe(b)].name) + ': precisa do nivel ' + nv + '.';
    inv.equip[b.slot] = it.uid; return '';
  }
  if(m.k === 'tirar'){ const s = String(m.slot || ''); if(s === 'weapon') return 'Sempre ha uma arma equipada.'; delete inv.equip[s]; return ''; }
  if(m.k === 'descartar'){ if(equipado(inv, m.uid)) return 'Tire o item antes de descartar.'; const n = inv.items.length; inv.items = inv.items.filter(i => i.uid !== m.uid); return inv.items.length < n ? '' : 'Item nao encontrado.'; }
  return 'Pedido desconhecido.';
}

/* abate: adena sempre (proporcional ao XP do abate) e chance de item; chefe da item garantido. xpDoAbate = o valor que o jogador ganhou de XP por esse abate.
   Regras em dungeon.json -> drops: comum (chance), miniChefe / chefeCampo / boss (itens garantidos, extra = chance de mais 1, boost = raridade melhor, adena = multiplicador). */
const DROPS0 = { adenaPorXp: .5, adenaVar: [.8, 1.25], comum: .05, miniChefe: { itens: 1, extra: .35, boost: 1.5, adena: 2 }, chefeCampo: { itens: 2, extra: .5, boost: 2.5, adena: 3 }, boss: { itens: 1, extra: .35, boost: 1, adena: 1 } };
function categoria(tipo){
  if(tipo === 'boss') return 'boss'; const T = DG && DG.mobs && DG.mobs[tipo];
  return T ? (T.chefeCampo ? 'chefeCampo' : (T.isMiniBoss ? 'miniChefe' : 'comum')) : 'comum';
}
function abate(pers, tipo, dif, xpDoAbate){
  const inv = garante(pers); if(!inv) return null;
  const Q = Object.assign({}, DROPS0, (DG && DG.drops) || {}), cat = categoria(tipo), C = cat === 'comum' ? null : (Q[cat] || DROPS0[cat]);
  const v = Q.adenaVar || [.8, 1.25], adena = Math.max(1, Math.round((xpDoAbate || 10) * Q.adenaPorXp * (C ? C.adena || 1 : 1) * (v[0] + Math.random() * (v[1] - v[0]))));
  inv.adena += adena; const itens = [];
  const n = C ? (C.itens | 0) + (Math.random() < (C.extra || 0) ? 1 : 0) : (Math.random() < Q.comum ? 1 : 0);
  if(n > 0){
    const boost = ((DG && DG.difficulties && DG.difficulties[dif] && DG.difficulties[dif].rarityBoost) || 1) * (C ? C.boost || 1 : 1), R = D.rarities, ks = Object.keys(R);
    const peso = k => R[k].weight * (k === 'normal' ? 1 : boost);
    const GT = (C ? Q.grausChefe : Q.graus) || {}, pg = GT[dif] || (Q.graus || {})[dif] || { sem: 1 };      /* grau pelo mapa / dificuldade (chefe: tabela propria) */
    const grau = () => { let tot = 0; for(const g in pg) tot += pg[g]; let r = Math.random() * tot; for(const g in pg){ r -= pg[g]; if(r <= 0) return g; } return 'sem'; };
    const daClasse = D.bases.filter(b => b.slot !== 'weapon' || b.weapon === armaDaClasse(pers));
    for(let i = 0; i < n; i++){
      if(inv.items.length >= D.bagMax) break;
      let tot = 0; ks.forEach(k => { tot += peso(k); }); let roll = Math.random() * tot, rar = ks[0];
      for(const k of ks){ roll -= peso(k); if(roll <= 0){ rar = k; break; } }
      const g = grau(), bs = daClasse.filter(b => grauDe(b) === g), bases = bs.length ? bs : daClasse.filter(b => grauDe(b) === 'sem');
      const it = mkItem(bases[Math.floor(Math.random() * bases.length)].id, rar); if(it){ inv.items.push(it); itens.push(it); }
    }
  }
  return { adena, itens, cheia: n > itens.length && inv.items.length >= D.bagMax };
}

module.exports = { armaBase, nome: id => (baseDe(id) || { name: id }).name, recarrega: carrega, garante, pedido, abate, comprar, vender, usar, encantar, encArma, armazem, tiro, garanteArm, loja: () => LJ };
