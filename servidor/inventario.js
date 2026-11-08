'use strict';
/* Inventario e ADENA com autoridade do SERVIDOR (por personagem: pers.inv = { items: [{uid, base, rar, stats}], equip: {slot: uid}, adena }).
   O cliente so PEDE (equipar / tirar / descartar) e recebe o estado; nao consegue criar item nem adena (antes ficava no navegador e dava para forjar pelo F12).
   Itens com as mesmas regras do cliente (prototipo/data/itens.json): status da base x multiplicador da raridade + extras sorteados.
   Classe manda na arma: so equipa a arma da propria classe (pers.weapon). Drops: adena em todo abate; itens do chefe (1, 35% de chance de 2),
   raridade melhor nas dificuldades maiores (dungeon.json -> difficulties[].rarityBoost). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DADOS = path.join(__dirname, '..', 'prototipo', 'data');
let D = null, DG = null;
function carrega(){
  try { D = JSON.parse(fs.readFileSync(path.join(DADOS, 'itens.json'), 'utf8')); } catch(e){ console.error('inventario: sem itens.json', e.message); }
  try { DG = JSON.parse(fs.readFileSync(path.join(DADOS, 'dungeon.json'), 'utf8')); } catch(e){ DG = null; }
}
carrega();
const r1 = n => Math.round(n * 10) / 10;
const baseDe = id => D && D.bases.find(b => b.id === id);
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
    const arma = D.bases.find(b => b.slot === 'weapon' && b.weapon === armaDaClasse(pers)) || D.bases[0], it = mkItem(arma.id, 'normal');
    inv.items.push(it); inv.equip.weapon = it.uid;
    for(const b of D.bases) if(b.slot !== 'weapon') inv.items.push(mkItem(b.id, 'normal'));
    pers.inv = inv;
  }
  inv.items = inv.items.filter(i => i && baseDe(i.base) && D.rarities[i.rar]);
  for(const s of Object.keys(inv.equip)) if(!inv.items.some(i => i.uid === inv.equip[s])) delete inv.equip[s];
  if(!inv.equip.weapon){ const w = inv.items.find(i => { const b = baseDe(i.base); return b.slot === 'weapon' && b.weapon === armaDaClasse(pers); }); if(w) inv.equip.weapon = w.uid; else { const b = D.bases.find(x => x.slot === 'weapon' && x.weapon === armaDaClasse(pers)); if(b){ const it = mkItem(b.id, 'normal'); inv.items.push(it); inv.equip.weapon = it.uid; } } }
  inv.adena = Math.max(0, Math.floor(+inv.adena || 0));
  return inv;
}

/* pedido do cliente: {k:'equip', uid} | {k:'tirar', slot} | {k:'descartar', uid}. Devolve '' (ok) ou a mensagem de erro. */
function pedido(pers, m){
  const inv = garante(pers); if(!inv) return 'Inventario indisponivel.';
  if(m.k === 'equip'){
    const it = inv.items.find(i => i.uid === m.uid); if(!it) return 'Item nao encontrado.';
    const b = baseDe(it.base); if(b.slot === 'weapon' && b.weapon !== armaDaClasse(pers)) return 'Sua classe nao usa essa arma.';
    inv.equip[b.slot] = it.uid; return '';
  }
  if(m.k === 'tirar'){ const s = String(m.slot || ''); if(s === 'weapon') return 'Sempre ha uma arma equipada.'; delete inv.equip[s]; return ''; }
  if(m.k === 'descartar'){ if(equipado(inv, m.uid)) return 'Tire o item antes de descartar.'; const n = inv.items.length; inv.items = inv.items.filter(i => i.uid !== m.uid); return inv.items.length < n ? '' : 'Item nao encontrado.'; }
  return 'Pedido desconhecido.';
}

/* abate: adena sempre (proporcional ao XP do abate) e itens se for chefe. xpDoAbate = o valor que o jogador ganhou de XP por esse abate. */
function abate(pers, tipo, dif, xpDoAbate){
  const inv = garante(pers); if(!inv) return null;
  const adena = Math.max(1, Math.round((xpDoAbate || 10) * .5 * (.8 + Math.random() * .45)));
  inv.adena += adena; const itens = [];
  if(tipo === 'boss'){
    const boost = (DG && DG.difficulties && DG.difficulties[dif] && DG.difficulties[dif].rarityBoost) || 1, R = D.rarities, ks = Object.keys(R);
    const peso = k => R[k].weight * (k === 'normal' ? 1 : boost);
    const bases = D.bases.filter(b => b.slot !== 'weapon' || b.weapon === armaDaClasse(pers));
    const n = 1 + (Math.random() < .35 ? 1 : 0);
    for(let i = 0; i < n; i++){
      if(inv.items.length >= D.bagMax) break;
      let tot = 0; ks.forEach(k => { tot += peso(k); }); let roll = Math.random() * tot, rar = ks[0];
      for(const k of ks){ roll -= peso(k); if(roll <= 0){ rar = k; break; } }
      const it = mkItem(bases[Math.floor(Math.random() * bases.length)].id, rar); if(it){ inv.items.push(it); itens.push(it); }
    }
  }
  return { adena, itens, cheia: tipo === 'boss' && inv.items.length >= D.bagMax };
}

module.exports = { recarrega: carrega, garante, pedido, abate };
