/* Simulador do dano PvP pelos status (estilo L2): tabela de vida, dano do ataque padrao e do kit inteiro por nivel/grau/classe.
   Uso (na pasta prototipo):  node tools/simular_pvp_l2.js            (tabela)
                              node tools/simular_pvp_l2.js calibrar   (acha kBasico/kSkill para as metas e mostra; nao grava)
   Metas (decisao do dono 17/11/2026, "dano massivo legal"): mesmo nivel e grau, ataque padrao ~5% da vida por golpe; kit inteiro do Guerreiro ~110% da vida. */
const path = require('path'), fs = require('fs');
const L2 = require(path.join(__dirname, '..', '..', 'servidor', 'combate_l2.js'));
const RAIZ = path.join(__dirname, '..'); L2.carrega(RAIZ);
const C = L2.dados();
const ARMA = { guerreiro: 'sword', guardiao: 'shield', mago: 'staff', clerico: 'book' };
const skills = arma => JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'armas', arma + '.json'), 'utf8')).skills.filter(s => !s.suporte && (s.dmg | 0) > 0);
const kit = (A, V, arma) => skills(arma).reduce((t, s) => t + L2.danoSkill(A, V, s.dmg, true) * ((s.hits || [1]).length), 0);
const basico3 = (A, V) => (L2.danoBasico(A, V, 'sweep', true) + L2.danoBasico(A, V, 'thrust', true) + L2.danoBasico(A, V, 'spin', true)) / 3;
const NIVEIS = [5, 20, 30, 40, 52, 61, 76, 90];
function tabela(){
  console.log('k: basico ' + C.kBasico + ' | skill ' + C.kSkill + ' | poder ' + C.kPoder);
  console.log('\nMESMO NIVEL E GRAU (conjunto completo do grau, pontos no atributo de dano):');
  console.log('nivel grau | vida guer guard mago | basico guer->guer (%vida) | kit guer->guer (%vida) | kit guer->guard | kit mago->guer | basico guard->guer');
  for(const lv of NIVEIS){
    const F = c => L2.fichaBot(lv, c, ARMA[c]);
    const g = F('guerreiro'), gd = F('guardiao'), m = F('mago'), vg = L2.vidaMax(g);
    const b = basico3(g, g), k = kit(g, g, 'sword');
    console.log(String(lv).padStart(5) + ' ' + L2.grauDoNivel(lv).padEnd(4) + ' | ' + String(vg).padStart(5) + String(L2.vidaMax(gd)).padStart(6) + String(L2.vidaMax(m)).padStart(5)
      + ' | ' + String(Math.round(b)).padStart(5) + ' (' + (100 * b / vg).toFixed(1) + '%)'
      + '        | ' + String(k).padStart(5) + ' (' + Math.round(100 * k / vg) + '%)'
      + '      | ' + Math.round(100 * kit(g, gd, 'sword') / L2.vidaMax(gd)) + '%'
      + '            | ' + Math.round(100 * kit(m, g, 'staff') / vg) + '%'
      + '           | ' + (100 * basico3(gd, g) / vg).toFixed(1) + '%');
  }
  console.log('\nDIFERENCA DE GRAU (nivel 52, Guerreiro contra Guerreiro):');
  for(const [ga, gv] of [['C', 'B'], ['B', 'B'], ['A', 'B'], ['B', 'C']]){ const A = L2.fichaBot(52, 'guerreiro', 'sword', ga), V = L2.fichaBot(52, 'guerreiro', 'sword', gv), vv = L2.vidaMax(V);
    console.log('  arma/armadura ' + ga + ' contra ' + gv + ': basico ' + (100 * basico3(A, V) / vv).toFixed(1) + '% | kit ' + Math.round(100 * kit(A, V, 'sword') / vv) + '%'); }
  console.log('\nDIFERENCA DE NIVEL (Guerreiro contra Guerreiro, cada um no grau do proprio nivel):');
  for(const [la, lv] of [[40, 50], [50, 40], [60, 60], [60, 70], [70, 60]]){ const A = L2.fichaBot(la, 'guerreiro', 'sword'), V = L2.fichaBot(lv, 'guerreiro', 'sword'), vv = L2.vidaMax(V);
    console.log('  Nv ' + la + ' contra Nv ' + lv + ': basico ' + (100 * basico3(A, V) / vv).toFixed(1) + '% | kit ' + Math.round(100 * kit(A, V, 'sword') / vv) + '%'); }
}
function calibrar(){
  /* media nos niveis da tabela: basico guer->guer = 5% e kit guer->guer = 110% */
  const media = fn => NIVEIS.reduce((t, lv) => { const g = L2.fichaBot(lv, 'guerreiro', 'sword'); return t + fn(g) / L2.vidaMax(g); }, 0) / NIVEIS.length;
  C.kBasico = 1; C.kSkill = 1;
  const b = media(g => basico3(g, g)), k = media(g => kit(g, g, 'sword'));
  console.log('sem calibrar: basico ' + (100 * b).toFixed(2) + '% | kit ' + Math.round(100 * k) + '%');
  C.kBasico = +(0.05 / b).toFixed(3); C.kSkill = +(1.10 / k).toFixed(3);
  console.log('calibrado: kBasico ' + C.kBasico + ' | kSkill ' + C.kSkill + '\n');
  tabela();
}
if(process.argv[2] === 'calibrar') calibrar(); else tabela();
